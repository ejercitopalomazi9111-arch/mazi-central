-- ════════════════════════════════════════════════════════════════════════
-- 0007 · LO QUE EL ADMIN NECESITA PARA LLEVAR SU CATÁLOGO SOLO
-- ────────────────────────────────────────────────────────────────────────
-- Bloque 3 del plan: alta y edición de productos, fotos, categorías con su
-- plantilla, inventario con ajuste rápido, y el mínimo de cada producto.
--
-- Lo que ya estaba (0002): el admin escribe productos y categorías directo
-- por RLS. Lo que se agrega aquí es lo que NO puede ser un update suelto:
--   · un producto nuevo nace con su renglón de existencias (en 0), para que
--     vender() lo pueda bloquear — sin renglón, una venta no descontaba nada
--     (es el mismo hueco que se tapó en 0003 con `bloqueados`);
--   · el mínimo se cambia por función, porque existencias no tiene política
--     de escritura a propósito;
--   · las fotos van a Storage en una carpeta por negocio, y sólo el admin de
--     ESE negocio escribe en ella.
-- ════════════════════════════════════════════════════════════════════════

-- ── Todo producto nace con existencias ──────────────────────────────────
create or replace function _producto_con_existencias() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into existencias (producto_id, negocio_id, cantidad)
  values (new.id, new.negocio_id, 0)
  on conflict (producto_id) do nothing;
  return new;
end $$;

drop trigger if exists producto_con_existencias on productos;
create trigger producto_con_existencias after insert on productos
  for each row execute function _producto_con_existencias();

-- Y la fecha de «actualizado» la pone la base, no el teléfono.
create or replace function _tocar_actualizado() returns trigger
  language plpgsql set search_path = public as $$
begin new.actualizado := now(); return new; end $$;

drop trigger if exists productos_actualizado on productos;
create trigger productos_actualizado before update on productos
  for each row execute function _tocar_actualizado();

-- ── El mínimo de cada producto (el aviso de «se está acabando») ─────────
create or replace function poner_minimo(p_producto uuid, p_minimo integer)
  returns integer language plpgsql security definer set search_path = public as $$
declare n uuid;
begin
  select negocio_id into n from productos where id = p_producto;
  if n is null then raise exception 'no_existe'; end if;
  if not soy_admin(n) then raise exception 'no_autorizado'; end if;
  if p_minimo is null or p_minimo < 0 then raise exception 'cantidad_invalida'; end if;
  insert into existencias (producto_id, negocio_id, cantidad, minimo) values (p_producto, n, 0, p_minimo)
  on conflict (producto_id) do update set minimo = excluded.minimo, actualizado = now();
  return p_minimo;
end $$;

revoke execute on function poner_minimo(uuid, integer) from public, anon;
grant execute on function poner_minimo(uuid, integer) to authenticated, service_role;

-- La del disparador no se llama desde afuera.
revoke execute on function _producto_con_existencias() from public, anon, authenticated;

-- ── Fotos ───────────────────────────────────────────────────────────────
-- Cubeta pública de lectura (son las fotos de una tienda) y con tope: 2 MB y
-- sólo imágenes. El navegador ya las reduce antes de subir (Bloque 3), así
-- que 2 MB es de sobra; el tope es para quien suba por otro lado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- La carpeta es el negocio: fotos/<negocio_id>/<archivo>. Así la política no
-- necesita consultar nada más que el primer pedazo de la ruta.
create or replace function _carpeta_negocio(p_nombre text) returns uuid
  language sql immutable set search_path = public as $$
  select case when split_part(p_nombre, '/', 1) ~ '^[0-9a-f-]{36}$'
              then split_part(p_nombre, '/', 1)::uuid end
$$;

drop policy if exists fotos_ver on storage.objects;
drop policy if exists fotos_subir on storage.objects;
drop policy if exists fotos_cambiar on storage.objects;
drop policy if exists fotos_borrar on storage.objects;
create policy fotos_ver on storage.objects for select using (bucket_id = 'fotos');
create policy fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and soy_admin(_carpeta_negocio(name)));
create policy fotos_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and soy_admin(_carpeta_negocio(name)))
  with check (bucket_id = 'fotos' and soy_admin(_carpeta_negocio(name)));
create policy fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and soy_admin(_carpeta_negocio(name)));
