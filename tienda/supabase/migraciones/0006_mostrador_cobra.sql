-- ════════════════════════════════════════════════════════════════════════
-- 0006 · EN EL MOSTRADOR NO SALE NADA SIN COBRO
-- ────────────────────────────────────────────────────────────────────────
-- Salió de la prueba de punta a punta del 24 de septiembre: una venta con
-- canal 'pos' y SIN p_cobro pasó. Quedó un pedido «entregado» y sin pagar, que
-- es exactamente la mercancía que sale del local sin que nadie la cobre. La
-- pantalla siempre manda el cobro, pero la regla no puede depender de la
-- pantalla: se revisa aquí, antes de tocar nada.
--
-- En los otros canales el cobro puede venir después (contra entrega), así que
-- sólo el mostrador lo exige en el acto.
-- ════════════════════════════════════════════════════════════════════════
create or replace function _exigir_cobro_mostrador(p_canal canal_t, p_cobro jsonb)
  returns void language plpgsql immutable set search_path = public as $$
begin
  if p_canal = 'pos' and (p_cobro is null or coalesce(p_cobro->>'metodo', '') = '') then
    raise exception 'falta_cobro';
  end if;
end $$;

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

  perform _exigir_cobro_mostrador(p_canal, p_cobro);

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

revoke execute on function _exigir_cobro_mostrador(canal_t, jsonb) from public, anon, authenticated;
