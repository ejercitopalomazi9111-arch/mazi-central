-- ════════════════════════════════════════════════════════════════════════
-- 0003 · LAS FUNCIONES DEL SERVIDOR · el único camino para lo que tiene reglas
-- ────────────────────────────────────────────────────────────────────────
-- Inventario, pedidos, caja y turnos no tienen política de escritura (0002):
-- se tocan SÓLO por aquí. Cada función revisa quién llama y las reglas, dentro
-- de una transacción. Si algo no cuadra, `raise` y no se escribe nada.
--
-- Los errores llevan un código corto en el mensaje ('sin_existencias', …) para
-- que la pantalla pueda decir algo humano en vez de enseñar el error crudo.
-- ════════════════════════════════════════════════════════════════════════

create or replace function _es_servicio() returns boolean
  language sql stable as $$ select coalesce(auth.role(), '') = 'service_role' $$;

create or replace function _folio(n uuid) returns integer
  language plpgsql security definer set search_path = public as $$
declare f integer;
begin
  update negocios set siguiente_folio = siguiente_folio + 1
   where id = n returning siguiente_folio - 1 into f;
  return f;
end $$;

-- ── El cliente que está usando la app ───────────────────────────────────
-- Crea (o devuelve) su perfil de cliente en este negocio y su ficha. Es lo que
-- corre al pagar: aquí se pide quién eres, y nunca antes.
create or replace function mi_cliente(p_negocio uuid, p_nombre text default null,
                                      p_telefono text default null)
  returns uuid language plpgsql security definer set search_path = public as $$
declare
  yo uuid := auth.uid();
  otro uuid;
  c uuid;
begin
  if yo is null then raise exception 'sin_sesion'; end if;
  select negocio_id into otro from perfiles where id = yo;
  if otro is null then
    insert into perfiles (id, negocio_id, rol, nombre, telefono)
    values (yo, p_negocio, 'cliente', p_nombre, p_telefono);
  elsif otro <> p_negocio then
    raise exception 'otro_negocio';
  end if;
  insert into clientes (negocio_id, perfil_id, nombre, telefono)
  values (p_negocio, yo, coalesce(p_nombre, ''), p_telefono)
  on conflict (negocio_id, perfil_id) do update
    set nombre   = coalesce(nullif(excluded.nombre, ''), clientes.nombre),
        telefono = coalesce(excluded.telefono, clientes.telefono)
  returning id into c;
  return c;
end $$;

-- ── VENDER · la puerta única del inventario ─────────────────────────────
-- Tienda, punto de venta, bot y repartidor venden por aquí. Tres cosas que no
-- se negocian:
--   · el PRECIO sale de la base, nunca de lo que mande el teléfono;
--   · las existencias se BLOQUEAN (for update) en orden de id — dos ventas
--     simultáneas de la última pieza: una pasa, la otra recibe 'sin_existencias';
--   · o se escribe todo (pedido, renglones, movimientos, evento, cobro) o nada.
--
-- p_renglones: [{"producto_id": uuid, "cantidad": int}, …]
-- p_cobro (opcional, punto de venta): {"metodo": "efectivo", "recibido": 500}
create or replace function vender(
  p_negocio   uuid,
  p_canal     canal_t,
  p_renglones jsonb,
  p_cliente   uuid default null,
  p_momento   momento_pago_t default 'al_recibir',
  p_direccion jsonb default null,
  p_notas     text default '',
  p_cobro     jsonb default null,
  p_caja      uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r          record;
  pedido     uuid := gen_random_uuid();
  folio      integer;
  subtotal   numeric(12,2) := 0;
  estado0    estado_pedido;
  metodo     forma_pago_t;
  recibido   numeric(12,2);
  bloqueados integer := 0;
begin
  -- ¿Quién puede vender por este canal?
  if p_canal = 'tienda' then
    if p_cliente is null or not es_mio(p_cliente) then raise exception 'no_autorizado'; end if;
  elsif p_canal = 'pos' then
    if not puedo_cobrar(p_negocio) then raise exception 'no_autorizado'; end if;
  elsif p_canal = 'bot' then
    if not _es_servicio() then raise exception 'no_autorizado'; end if;
  else
    if not soy_personal(p_negocio) then raise exception 'no_autorizado'; end if;
  end if;

  if jsonb_typeof(p_renglones) <> 'array' or jsonb_array_length(p_renglones) = 0 then
    raise exception 'pedido_vacio';
  end if;

  -- Agrupar por producto (si mandan el mismo dos veces, se suma) y bloquear en
  -- orden de id: dos ventas que se cruzan piden los candados en el mismo orden
  -- y no se atoran una a la otra.
  for r in
    with pedidas as (
      select (x->>'producto_id')::uuid as producto_id, sum((x->>'cantidad')::int) as cantidad
        from jsonb_array_elements(p_renglones) x
       group by 1
    )
    select p.id, p.nombre, p.precio, pe.cantidad, e.cantidad as hay, e.apartado
      from pedidas pe
      join productos p on p.id = pe.producto_id and p.negocio_id = p_negocio and p.activo
      join existencias e on e.producto_id = p.id
     order by p.id
       for update of e
  loop
    if r.cantidad is null or r.cantidad <= 0 then raise exception 'cantidad_invalida'; end if;
    if r.hay - r.apartado < r.cantidad then
      raise exception 'sin_existencias: %', r.nombre
        using detail = json_build_object('producto_id', r.id, 'hay', r.hay - r.apartado)::text;
    end if;
    subtotal := subtotal + r.precio * r.cantidad;
    bloqueados := bloqueados + 1;
  end loop;

  -- Se compara contra lo que el ciclo BLOQUEÓ, no contra lo que existe en
  -- productos. Un producto sin fila de existencias pasaría la otra cuenta —sí
  -- está en productos— y se vendería sin descontar nada: justo el hueco que
  -- esta función existe para cerrar. Lo mismo si es de otro negocio o está
  -- apagado: el join lo tiró, la cuenta no cuadra, y no se vende a medias.
  if bloqueados <> (select count(distinct (x->>'producto_id')) from jsonb_array_elements(p_renglones) x) then
    raise exception 'producto_invalido';
  end if;

  folio := _folio(p_negocio);
  -- En el mostrador el cliente se lleva la mercancía en el acto.
  estado0 := case when p_canal = 'pos' then 'entregado' else 'recibido' end;

  insert into pedidos (id, negocio_id, folio, cliente_id, canal, estado, momento_pago,
                       subtotal, total, direccion, notas, caja_id)
  values (pedido, p_negocio, folio, p_cliente, p_canal, estado0,
          case when p_canal = 'pos' then 'antes' else p_momento end,
          subtotal, subtotal, p_direccion, coalesce(p_notas, ''), p_caja);

  insert into renglones (pedido_id, producto_id, nombre, precio, cantidad, importe)
  select pedido, p.id, p.nombre, p.precio, pe.cantidad, p.precio * pe.cantidad
    from (select (x->>'producto_id')::uuid as producto_id, sum((x->>'cantidad')::int) as cantidad
            from jsonb_array_elements(p_renglones) x group by 1) pe
    join productos p on p.id = pe.producto_id;

  update existencias e set cantidad = e.cantidad - rr.cantidad, actualizado = now()
    from (select producto_id, cantidad from renglones where pedido_id = pedido) rr
   where e.producto_id = rr.producto_id;

  insert into movimientos (negocio_id, producto_id, delta, motivo, canal, referencia, quien)
  select p_negocio, producto_id, -cantidad, 'venta', p_canal, pedido, auth.uid()
    from renglones where pedido_id = pedido;

  insert into eventos_pedido (pedido_id, negocio_id, de, a, quien, por_que)
  values (pedido, p_negocio, null, estado0, auth.uid(), 'nuevo · ' || p_canal);

  -- Cobro en el mismo acto (mostrador).
  if p_cobro is not null then
    metodo   := (p_cobro->>'metodo')::forma_pago_t;
    recibido := coalesce((p_cobro->>'recibido')::numeric, subtotal);
    if metodo = 'efectivo' and recibido < subtotal then raise exception 'pago_insuficiente'; end if;
    insert into cobros (negocio_id, pedido_id, perfil_id, caja_id, metodo, monto, recibido, cambio)
    values (p_negocio, pedido, auth.uid(), p_caja, metodo, subtotal, recibido,
            case when metodo = 'efectivo' then recibido - subtotal else 0 end);
    update pedidos set pagado = true, forma_pago = metodo where id = pedido;
  end if;

  return jsonb_build_object('id', pedido, 'folio', folio, 'total', subtotal,
                            'cambio', case when metodo = 'efectivo' then recibido - subtotal end);
end $$;

-- ── La máquina de estados ───────────────────────────────────────────────
-- Seis estados y estos caminos, ni uno más:
--   recibido     → preparando | cancelado
--   preparando   → en_camino  | cancelado
--   en_camino    → entregado  | no_entregado
--   no_entregado → en_camino  | cancelado       (se reintenta o se da por perdido)
-- Cancelar DEVUELVE las existencias. Cada paso deja quién y por qué.
create or replace function cambiar_estado(p_pedido uuid, p_a estado_pedido, p_por_que text default null)
  returns void language plpgsql security definer set search_path = public as $$
declare
  p pedidos;
  permitido boolean;
begin
  select * into p from pedidos where id = p_pedido for update;
  if not found then raise exception 'no_existe'; end if;

  permitido := (p.estado, p_a) in (
    ('recibido', 'preparando'), ('recibido', 'cancelado'),
    ('preparando', 'en_camino'), ('preparando', 'cancelado'),
    ('en_camino', 'entregado'), ('en_camino', 'no_entregado'),
    ('no_entregado', 'en_camino'), ('no_entregado', 'cancelado'));
  if not permitido then
    raise exception 'paso_invalido: % → %', p.estado, p_a;
  end if;

  -- Quién puede dar cada paso.
  if soy_admin(p.negocio_id) or puedo_cobrar(p.negocio_id) then
    null;                                            -- admin y caja: todos
  elsif soy_personal(p.negocio_id) then              -- repartidor: sólo los suyos, y sólo en ruta
    if p.repartidor_id is distinct from auth.uid()
       or p_a not in ('entregado', 'no_entregado', 'en_camino') then
      raise exception 'no_autorizado';
    end if;
  elsif es_mio(p.cliente_id) then                    -- cliente: cancelar lo recién pedido
    if not (p.estado = 'recibido' and p_a = 'cancelado') then raise exception 'no_autorizado'; end if;
  else
    raise exception 'no_autorizado';
  end if;

  if p_a in ('no_entregado', 'cancelado') and coalesce(trim(p_por_que), '') = '' then
    raise exception 'falta_motivo';
  end if;

  if p_a = 'cancelado' then
    update existencias e set cantidad = e.cantidad + r.cantidad, actualizado = now()
      from renglones r where r.pedido_id = p.id and r.producto_id = e.producto_id;
    insert into movimientos (negocio_id, producto_id, delta, motivo, canal, referencia, quien, nota)
    select p.negocio_id, r.producto_id, r.cantidad, 'cancelacion', p.canal, p.id, auth.uid(), p_por_que
      from renglones r where r.pedido_id = p.id and r.producto_id is not null;
  end if;

  update pedidos set estado = p_a, actualizado = now() where id = p.id;
  insert into eventos_pedido (pedido_id, negocio_id, de, a, quien, por_que)
  values (p.id, p.negocio_id, p.estado, p_a, auth.uid(), p_por_que);
end $$;

create or replace function asignar_repartidor(p_pedido uuid, p_repartidor uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare n uuid;
begin
  select negocio_id into n from pedidos where id = p_pedido;
  if not soy_admin(n) then raise exception 'no_autorizado'; end if;
  if not exists (select 1 from perfiles where id = p_repartidor and negocio_id = n
                  and rol = 'repartidor' and activo) then
    raise exception 'no_es_repartidor';
  end if;
  update pedidos set repartidor_id = p_repartidor, actualizado = now() where id = p_pedido;
end $$;

-- ── Inventario a mano ───────────────────────────────────────────────────
-- Para la venta que se hizo fuera del sistema, la merma, o el conteo. El motivo
-- es obligatorio: un ajuste sin razón es el que nadie sabe explicar al mes.
create or replace function ajustar_inventario(p_producto uuid, p_delta integer, p_nota text)
  returns integer language plpgsql security definer set search_path = public as $$
declare n uuid; queda integer;
begin
  select negocio_id into n from productos where id = p_producto;
  if not soy_admin(n) then raise exception 'no_autorizado'; end if;
  if p_delta = 0 then raise exception 'sin_cambio'; end if;
  if coalesce(trim(p_nota), '') = '' then raise exception 'falta_motivo'; end if;

  insert into existencias (producto_id, negocio_id, cantidad) values (p_producto, n, 0)
  on conflict (producto_id) do nothing;
  update existencias set cantidad = cantidad + p_delta, actualizado = now()
   where producto_id = p_producto returning cantidad into queda;   -- el check >= 0 frena el negativo
  insert into movimientos (negocio_id, producto_id, delta, motivo, canal, quien, nota)
  values (n, p_producto, p_delta, 'ajuste', 'manual', auth.uid(), p_nota);
  return queda;
end $$;

-- Conteo físico: «hay 12». Calcula la diferencia y la registra como ajuste.
create or replace function contar_inventario(p_producto uuid, p_hay integer, p_nota text default 'conteo')
  returns integer language plpgsql security definer set search_path = public as $$
declare ahora integer;
begin
  if p_hay < 0 then raise exception 'cantidad_invalida'; end if;
  select coalesce(cantidad, 0) into ahora from existencias where producto_id = p_producto;
  if coalesce(ahora, 0) = p_hay then return p_hay; end if;
  return ajustar_inventario(p_producto, p_hay - coalesce(ahora, 0), p_nota);
end $$;

-- ── Turnos ──────────────────────────────────────────────────────────────
create or replace function abrir_turno() returns uuid
  language plpgsql security definer set search_path = public as $$
declare n uuid := yo_negocio(); t uuid;
begin
  if n is null or not soy_personal(n) then raise exception 'no_autorizado'; end if;
  select id into t from turnos where perfil_id = auth.uid() and fin is null;
  if t is not null then return t; end if;                     -- ya estaba abierto
  insert into turnos (negocio_id, perfil_id) values (n, auth.uid()) returning id into t;
  return t;
end $$;

create or replace function pausar_turno(p_pausar boolean) returns void
  language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  select id into t from turnos where perfil_id = auth.uid() and fin is null;
  if t is null then raise exception 'sin_turno'; end if;
  if p_pausar then
    if not exists (select 1 from pausas where turno_id = t and fin is null) then
      insert into pausas (turno_id) values (t);
    end if;
  else
    update pausas set fin = now() where turno_id = t and fin is null;
  end if;
end $$;

-- Al cerrar, la app dice cuánto efectivo debe entregar: lo que cobró en efectivo
-- durante el turno. El cuadre se hace solo.
create or replace function cerrar_turno(p_entregado numeric default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare t turnos; esperado numeric(12,2);
begin
  select * into t from turnos where perfil_id = auth.uid() and fin is null for update;
  if not found then raise exception 'sin_turno'; end if;
  update pausas set fin = now() where turno_id = t.id and fin is null;
  select coalesce(sum(monto), 0) into esperado from cobros where turno_id = t.id and metodo = 'efectivo';
  update turnos set fin = now(), efectivo_esperado = esperado, efectivo_entregado = p_entregado
   where id = t.id;
  return jsonb_build_object('turno', t.id, 'esperado', esperado, 'entregado', p_entregado,
                            'diferencia', coalesce(p_entregado, esperado) - esperado);
end $$;

-- ── Cobro en la entrega (repartidor) ────────────────────────────────────
create or replace function cobrar_entrega(p_pedido uuid, p_metodo forma_pago_t, p_recibido numeric default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare p pedidos; t uuid; cambio numeric(12,2);
begin
  select * into p from pedidos where id = p_pedido for update;
  if not found then raise exception 'no_existe'; end if;
  if p.pagado then raise exception 'ya_pagado'; end if;
  if not (p.repartidor_id = auth.uid() or soy_admin(p.negocio_id)) then raise exception 'no_autorizado'; end if;
  select id into t from turnos where perfil_id = auth.uid() and fin is null;
  if p_metodo = 'efectivo' then
    if p_recibido is null or p_recibido < p.total then raise exception 'pago_insuficiente'; end if;
    cambio := p_recibido - p.total;
  end if;
  insert into cobros (negocio_id, pedido_id, perfil_id, turno_id, metodo, monto, recibido, cambio)
  values (p.negocio_id, p.id, auth.uid(), t, p_metodo, p.total, p_recibido, cambio);
  update pedidos set pagado = true, forma_pago = p_metodo, actualizado = now() where id = p.id;
  return jsonb_build_object('cambio', cambio, 'total', p.total);
end $$;

-- ── Caja del punto de venta ─────────────────────────────────────────────
create or replace function abrir_caja(p_fondo numeric default 0) returns uuid
  language plpgsql security definer set search_path = public as $$
declare n uuid := yo_negocio(); c uuid;
begin
  if n is null or not puedo_cobrar(n) then raise exception 'no_autorizado'; end if;
  select id into c from cajas where perfil_id = auth.uid() and cerrada is null;
  if c is not null then return c; end if;
  insert into cajas (negocio_id, perfil_id, fondo) values (n, auth.uid(), coalesce(p_fondo, 0)) returning id into c;
  return c;
end $$;

-- Esperado = fondo + lo cobrado en efectivo. El cambio que se dio ya está
-- restado porque el cobro guarda `monto` (el total), no lo que entregó el cliente.
create or replace function cerrar_caja(p_contado numeric, p_nota text default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare c cajas; v_esperado numeric(12,2);
begin
  select * into c from cajas where perfil_id = auth.uid() and cerrada is null for update;
  if not found then raise exception 'sin_caja'; end if;
  -- `v_esperado` y no `esperado`: con el mismo nombre que la columna, el
  -- `set esperado = esperado` de abajo es ambiguo y Postgres se niega.
  select c.fondo + coalesce(sum(monto), 0) into v_esperado from cobros where caja_id = c.id and metodo = 'efectivo';
  update cajas set cerrada = now(), esperado = v_esperado, contado = p_contado, nota = p_nota where id = c.id;
  return jsonb_build_object('esperado', v_esperado, 'contado', p_contado, 'diferencia', p_contado - v_esperado);
end $$;

-- ── ¿Por dónde va mi pedido? ────────────────────────────────────────────
-- El cliente NO lee `ubicaciones` (es dato del empleado). Sólo recibe el último
-- punto de SU repartidor, y sólo mientras su pedido va en camino.
create or replace function donde_va(p_pedido uuid)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p pedidos; u ubicaciones; nombre text;
begin
  select * into p from pedidos where id = p_pedido;
  if not found or not (es_mio(p.cliente_id) or soy_personal(p.negocio_id)) then
    raise exception 'no_autorizado';
  end if;
  if p.estado <> 'en_camino' or p.repartidor_id is null then return null; end if;
  select pf.nombre into nombre from perfiles pf where pf.id = p.repartidor_id;
  select * into u from ubicaciones where perfil_id = p.repartidor_id order by cuando desc limit 1;
  if u.id is null then return jsonb_build_object('repartidor', nombre); end if;   -- aún no manda ubicación
  return jsonb_build_object('repartidor', nombre, 'lat', u.lat, 'lng', u.lng,
                            'velocidad', u.velocidad, 'cuando', u.cuando);
end $$;

-- ── Personal ────────────────────────────────────────────────────────────
create or replace function cambiar_rol(p_perfil uuid, p_rol rol_t, p_activo boolean default true)
  returns void language plpgsql security definer set search_path = public as $$
declare n uuid;
begin
  select negocio_id into n from perfiles where id = p_perfil;
  if not soy_admin(n) then raise exception 'no_autorizado'; end if;
  if p_perfil = auth.uid() then raise exception 'no_a_ti_mismo'; end if;  -- que nadie se quite el admin por error
  update perfiles set rol = p_rol, activo = p_activo where id = p_perfil;
end $$;

-- Lo que el navegador puede llamar. `_folio` y `_es_servicio` quedan fuera.
revoke execute on function _folio(uuid) from public, anon, authenticated;
