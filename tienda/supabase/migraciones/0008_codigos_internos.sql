-- ════════════════════════════════════════════════════════════════════════
-- 0008 · CÓDIGO DE BARRAS PARA LO QUE NO TRAE
-- ────────────────────────────────────────────────────────────────────────
-- Media tienda de barrio no tiene códigos en su catálogo: lo que llega a granel,
-- lo que se reenvasa, lo que el proveedor manda sin etiqueta. Sin código, el
-- lector del punto de venta no sirve y todo se busca a mano.
--
-- Esto le da a cada producto sin código un EAN-13 que empieza con 2: el rango
-- que el estándar reserva para que cada tienda numere lo suyo. Cualquier lector
-- lo lee, y no choca con los códigos de fábrica (ésos empiezan con 7 en México).
-- Se hace en el servidor y en lote porque son cientos: uno por uno desde el
-- teléfono serían cientos de viajes.
-- ════════════════════════════════════════════════════════════════════════

create or replace function asignar_codigos(p_ids uuid[]) returns integer
  language plpgsql security definer set search_path = public as $$
declare r record; doce text; suma integer; hechos integer := 0; i integer;
begin
  for r in select id, negocio_id from productos
            where id = any(p_ids) and (codigo_barras is null or codigo_barras = '')
            for update loop
    if not soy_admin(r.negocio_id) then raise exception 'no_autorizado'; end if;
    loop
      doce := '2' || lpad(floor(random() * 1e11)::bigint::text, 11, '0');
      suma := 0;
      for i in 1..12 loop
        suma := suma + substr(doce, i, 1)::integer * (case when i % 2 = 0 then 3 else 1 end);
      end loop;
      begin
        update productos set codigo_barras = doce || ((10 - suma % 10) % 10)::text where id = r.id;
        exit;
      exception when unique_violation then
        -- Salió uno que ya existe en este negocio: se saca otro.
      end;
    end loop;
    hechos := hechos + 1;
  end loop;
  return hechos;
end $$;

revoke execute on function asignar_codigos(uuid[]) from public, anon;
grant execute on function asignar_codigos(uuid[]) to authenticated, service_role;
