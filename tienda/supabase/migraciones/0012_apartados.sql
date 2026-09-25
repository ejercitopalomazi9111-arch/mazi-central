-- ════════════════════════════════════════════════════════════════════════
-- 0012 · APARTADOS CON ABONOS
-- ────────────────────────────────────────────────────────────────────────
-- ⚠ ESCRITA Y SIN APLICAR (24 de septiembre), como 0009–0011: aplicar
-- migraciones se queda esperando un permiso que nadie puede dar desde el
-- teléfono. Las tablas ya existen desde 0001 (apartados, apartado_renglones,
-- abonos) pero nadie puede escribirlas: RLS sólo deja leer. Esto agrega las
-- tres puertas, todas en una transacción:
--   · apartar(): reserva las piezas (existencias.apartado) con el precio de
--     HOY, primer abono y fecha límite;
--   · abonar(): suma un abono; al completar, se liquida y las piezas salen
--     del inventario de verdad;
--   · cancelar_apartado(): regresa las piezas a la venta. El dinero abonado
--     NO se devuelve solo: queda anotado y lo decide el dueño.
-- `movimientos` sólo registra lo que cambia `cantidad` (la venta al liquidar):
-- apartar y cancelar mueven `apartado`, no el inventario.
-- Lo apartado ya descuenta de lo que se puede vender: vender() compara contra
-- `cantidad - apartado` desde 0003, así que la tienda no vende lo apartado.
-- ════════════════════════════════════════════════════════════════════════

alter table abonos add column if not exists caja_id uuid references cajas on delete set null;

create or replace function apartar(p_cliente uuid, p_renglones jsonb, p_abono numeric, p_metodo forma_pago_t, p_dias integer default 30)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  n uuid; a uuid := gen_random_uuid(); r record; v_total numeric(12,2) := 0; c uuid;
begin
  select negocio_id into n from clientes where id = p_cliente;
  if n is null then raise exception 'no_existe'; end if;
  if not (soy_admin(n) or puedo_cobrar(n)) then raise exception 'no_autorizado'; end if;
  if coalesce(p_dias, 0) not between 1 and 180 then raise exception 'cantidad_invalida'; end if;
  if coalesce(p_abono, 0) <= 0 then raise exception 'falta_cobro'; end if;

  for r in
    select p.id, p.nombre, p.precio, (x->>'cantidad')::integer as cantidad, e.cantidad as hay, e.apartado
      from jsonb_array_elements(p_renglones) x
      join productos p on p.id = (x->>'producto_id')::uuid and p.negocio_id = n and p.activo
      join existencias e on e.producto_id = p.id
     order by p.id
       for update of e
  loop
    if r.cantidad <= 0 then raise exception 'cantidad_invalida'; end if;
    if r.hay - r.apartado < r.cantidad then raise exception 'sin_existencias: %', r.nombre; end if;
    update existencias set apartado = apartado + r.cantidad, actualizado = now() where producto_id = r.id;
    insert into apartado_renglones (apartado_id, producto_id, cantidad, precio) values (a, r.id, r.cantidad, r.precio);
    v_total := v_total + r.precio * r.cantidad;
  end loop;
  if v_total = 0 then raise exception 'pedido_vacio'; end if;
  if p_abono > v_total then raise exception 'pago_insuficiente: el abono pasa del total'; end if;

  if p_metodo = 'efectivo' then
    select id into c from cajas where perfil_id = auth.uid() and cerrada is null;
    if c is null then raise exception 'sin_caja'; end if;
  end if;
  insert into apartados (id, negocio_id, cliente_id, total, abonado, fecha_limite)
  values (a, n, p_cliente, v_total, p_abono, current_date + p_dias);
  insert into abonos (apartado_id, monto, metodo, quien, caja_id) values (a, p_abono, p_metodo, auth.uid(), c);
  return jsonb_build_object('id', a, 'total', v_total, 'resta', v_total - p_abono);
end $$;

create or replace function abonar(p_apartado uuid, p_monto numeric, p_metodo forma_pago_t)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare ap apartados; c uuid; r record;
begin
  select * into ap from apartados where id = p_apartado for update;
  if not found then raise exception 'no_existe'; end if;
  if not (soy_admin(ap.negocio_id) or puedo_cobrar(ap.negocio_id)) then raise exception 'no_autorizado'; end if;
  if ap.estado <> 'abierto' then raise exception 'paso_invalido: el apartado ya no está abierto'; end if;
  if coalesce(p_monto, 0) <= 0 or ap.abonado + p_monto > ap.total then raise exception 'pago_insuficiente: el abono pasa de lo que resta'; end if;
  if p_metodo = 'efectivo' then
    select id into c from cajas where perfil_id = auth.uid() and cerrada is null;
    if c is null then raise exception 'sin_caja'; end if;
  end if;
  insert into abonos (apartado_id, monto, metodo, quien, caja_id) values (ap.id, p_monto, p_metodo, auth.uid(), c);
  update apartados set abonado = abonado + p_monto where id = ap.id;

  if ap.abonado + p_monto = ap.total then                    -- liquidado: las piezas salen de verdad
    for r in select * from apartado_renglones where apartado_id = ap.id loop
      update existencias set cantidad = cantidad - r.cantidad, apartado = apartado - r.cantidad, actualizado = now()
       where producto_id = r.producto_id;
      insert into movimientos (negocio_id, producto_id, delta, motivo, canal, referencia, quien, nota)
      values (ap.negocio_id, r.producto_id, -r.cantidad, 'venta', 'pos', ap.id, auth.uid(), 'Apartado liquidado');
    end loop;
    update apartados set estado = 'liquidado' where id = ap.id;
  end if;
  return jsonb_build_object('abonado', ap.abonado + p_monto, 'resta', ap.total - ap.abonado - p_monto);
end $$;

create or replace function cancelar_apartado(p_apartado uuid, p_por_que text)
  returns void language plpgsql security definer set search_path = public as $$
declare ap apartados; r record;
begin
  select * into ap from apartados where id = p_apartado for update;
  if not found then raise exception 'no_existe'; end if;
  if not soy_admin(ap.negocio_id) then raise exception 'no_autorizado'; end if;
  if ap.estado not in ('abierto', 'vencido') then raise exception 'paso_invalido'; end if;
  if coalesce(trim(p_por_que), '') = '' then raise exception 'falta_motivo'; end if;
  for r in select * from apartado_renglones where apartado_id = ap.id loop
    update existencias set apartado = greatest(0, apartado - r.cantidad), actualizado = now() where producto_id = r.producto_id;
  end loop;
  update apartados set estado = 'cancelado' where id = ap.id;
end $$;

revoke all on function apartar(uuid, jsonb, numeric, forma_pago_t, integer), abonar(uuid, numeric, forma_pago_t), cancelar_apartado(uuid, text) from public, anon;
grant execute on function apartar(uuid, jsonb, numeric, forma_pago_t, integer), abonar(uuid, numeric, forma_pago_t), cancelar_apartado(uuid, text) to authenticated;
