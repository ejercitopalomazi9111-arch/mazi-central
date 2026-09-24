-- ════════════════════════════════════════════════════════════════════════
-- 0010 · EL ENVÍO VA EN EL TOTAL, Y LO CALCULA EL SERVIDOR
-- ────────────────────────────────────────────────────────────────────────
-- vender() cobra los productos y nada más: el costo de envío se quedaba en
-- `direccion.envio`, fuera de `total`. Resultado: el repartidor cobraba de
-- menos, o cobraba bien y el corte decía que dio de cambio el envío.
--
-- El envío NO lo manda el teléfono (se podría mandar 0). Sale de los ajustes
-- del negocio: recoger en tienda = 0; gratis a partir de X; si no, el costo.
-- Se puede llamar las veces que sea (recalcula), sólo mientras el pedido está
-- recibido y sin pagar.
-- ════════════════════════════════════════════════════════════════════════
create or replace function poner_envio(p_pedido uuid) returns numeric
  language plpgsql security definer set search_path = public as $$
declare p pedidos; a jsonb; e numeric(12,2) := 0;
begin
  select * into p from pedidos where id = p_pedido for update;
  if not found then raise exception 'no_existe'; end if;
  if not (es_mio(p.cliente_id) or soy_admin(p.negocio_id)) then raise exception 'no_autorizado'; end if;
  if p.estado <> 'recibido' or p.pagado then raise exception 'paso_invalido: ya no se puede cambiar el envío'; end if;
  select ajustes->'envio' into a from negocios where id = p.negocio_id;
  if coalesce((p.direccion->>'recoge')::boolean, false) is false and p.direccion is not null then
    e := coalesce((a->>'costo')::numeric, 0);
    if a->>'gratis_desde' is not null and p.subtotal >= (a->>'gratis_desde')::numeric then e := 0; end if;
  end if;
  update pedidos set envio = e, total = subtotal - descuento + e, actualizado = now() where id = p.id;
  return e;
end $$;

revoke execute on function poner_envio(uuid) from public, anon;
grant execute on function poner_envio(uuid) to authenticated, service_role;
