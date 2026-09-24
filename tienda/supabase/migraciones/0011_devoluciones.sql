-- ════════════════════════════════════════════════════════════════════════
-- 0011 · DEVOLUCIONES
-- ────────────────────────────────────────────────────────────────────────
-- ⚠ ESCRITA Y SIN APLICAR (24 de septiembre): aplicar migraciones se queda
-- esperando un permiso que nadie puede dar desde el teléfono. La app funciona
-- sin ella (ver tienda/nucleo/datos.js · devolver): el admin regresa las piezas
-- con ajustar_inventario y la nota lleva el reembolso, que el corte lee.
-- Lo que esta migración agrega:
--   · la caja también puede devolver (hoy sólo el admin);
--   · el servidor pone el precio del reembolso (hoy lo calcula el teléfono);
--   · el corte descuenta solo el efectivo devuelto (hoy lo explica la pantalla);
--   · no se puede devolver más de lo que se vendió, aunque dos lo intenten a la vez.
-- ════════════════════════════════════════════════════════════════════════

create table devoluciones (
  id          uuid primary key default gen_random_uuid(),
  negocio_id  uuid not null references negocios on delete cascade,
  pedido_id   uuid not null references pedidos on delete cascade,
  caja_id     uuid references cajas on delete set null,
  quien       uuid references perfiles on delete set null,
  metodo      forma_pago_t not null,
  monto       numeric(12,2) not null check (monto >= 0),
  motivo      text not null check (trim(motivo) <> ''),
  renglones   jsonb not null,                    -- [{producto_id, nombre, cantidad, precio}]
  cuando      timestamptz not null default now()
);
create index on devoluciones (pedido_id);
create index on devoluciones (caja_id);
alter table devoluciones enable row level security;
create policy dev_ver on devoluciones for select using (soy_personal(negocio_id));

-- p_renglones: [{producto_id, cantidad}]. El precio NO viene del teléfono: sale
-- del renglón de la venta, con el descuento de la venta repartido parejo.
create or replace function devolver(p_pedido uuid, p_renglones jsonb, p_metodo forma_pago_t, p_motivo text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p pedidos; c uuid; r jsonb; v_id uuid := gen_random_uuid();
  v_vendidas integer; v_devueltas integer; v_precio numeric(12,2); v_nombre text;
  v_monto numeric(12,2) := 0; v_factor numeric := 1; v_salida jsonb := '[]';
begin
  select * into p from pedidos where id = p_pedido for update;   -- dos devoluciones del mismo ticket hacen fila
  if not found then raise exception 'no_existe'; end if;
  if not (soy_admin(p.negocio_id) or puedo_cobrar(p.negocio_id)) then raise exception 'no_autorizado'; end if;
  if p.estado <> 'entregado' then raise exception 'paso_invalido: sólo se devuelve lo entregado'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'falta_motivo'; end if;
  if jsonb_array_length(coalesce(p_renglones, '[]')) = 0 then raise exception 'pedido_vacio'; end if;
  if p.subtotal > 0 then v_factor := greatest(0, 1 - p.descuento / p.subtotal); end if;

  if p_metodo = 'efectivo' then
    select id into c from cajas where perfil_id = auth.uid() and cerrada is null;
    if c is null then raise exception 'sin_caja'; end if;
  end if;

  for r in select * from jsonb_array_elements(p_renglones) loop
    if (r->>'cantidad')::integer is null or (r->>'cantidad')::integer <= 0 then raise exception 'cantidad_invalida'; end if;
    select coalesce(sum(cantidad), 0), max(precio), max(nombre) into v_vendidas, v_precio, v_nombre
      from renglones where pedido_id = p.id and producto_id = (r->>'producto_id')::uuid;
    if v_vendidas = 0 then raise exception 'producto_invalido'; end if;
    -- Lo ya devuelto se cuenta en `movimientos` y no en `devoluciones`: así
    -- entran también las que se hicieron antes de esta migración (camino del
    -- admin, ajuste con nota «Devolución #folio · …»).
    select coalesce(sum(delta), 0) into v_devueltas from movimientos
     where producto_id = (r->>'producto_id')::uuid and negocio_id = p.negocio_id
       and motivo in ('devolucion', 'ajuste') and nota like 'Devolución #' || p.folio || ' · %';
    if (r->>'cantidad')::integer > v_vendidas - v_devueltas then raise exception 'devolucion_excede: %', v_nombre; end if;

    update existencias set cantidad = cantidad + (r->>'cantidad')::integer, actualizado = now()
     where producto_id = (r->>'producto_id')::uuid;
    insert into movimientos (negocio_id, producto_id, delta, motivo, canal, referencia, quien, nota)
    values (p.negocio_id, (r->>'producto_id')::uuid, (r->>'cantidad')::integer, 'devolucion', p.canal, p.id, auth.uid(),
            'Devolución #' || p.folio || ' · ' || p_motivo);
    v_monto := v_monto + round(v_precio * (r->>'cantidad')::integer * v_factor, 2);
    v_salida := v_salida || jsonb_build_object('producto_id', r->>'producto_id', 'nombre', v_nombre,
                                               'cantidad', (r->>'cantidad')::integer, 'precio', v_precio);
  end loop;

  insert into devoluciones (id, negocio_id, pedido_id, caja_id, quien, metodo, monto, motivo, renglones)
  values (v_id, p.negocio_id, p.id, c, auth.uid(), p_metodo, v_monto, p_motivo, v_salida);
  return jsonb_build_object('id', v_id, 'monto', v_monto, 'folio', p.folio);
end $$;

-- El corte descuenta el efectivo que salió por devoluciones de ESTA caja.
create or replace function cerrar_caja(p_contado numeric, p_nota text default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare c cajas; v_esperado numeric(12,2); v_devuelto numeric(12,2);
begin
  select * into c from cajas where perfil_id = auth.uid() and cerrada is null for update;
  if not found then raise exception 'sin_caja'; end if;
  select c.fondo + coalesce(sum(monto), 0) into v_esperado from cobros where caja_id = c.id and metodo = 'efectivo';
  select coalesce(sum(monto), 0) into v_devuelto from devoluciones where caja_id = c.id and metodo = 'efectivo';
  v_esperado := v_esperado - v_devuelto;
  update cajas set cerrada = now(), esperado = v_esperado, contado = p_contado, nota = p_nota where id = c.id;
  return jsonb_build_object('esperado', v_esperado, 'contado', p_contado, 'diferencia', p_contado - v_esperado, 'devuelto', v_devuelto);
end $$;

revoke all on function devolver(uuid, jsonb, forma_pago_t, text) from public, anon;
grant execute on function devolver(uuid, jsonb, forma_pago_t, text) to authenticated;
