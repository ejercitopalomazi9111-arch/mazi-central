-- ════════════════════════════════════════════════════════════════════════
-- 0009 · IMPORTAR UN CATÁLOGO, Y PODER DESHACERLO
-- ⚠️ ESTADO: escrita, SIN APLICAR (ver tienda/PENDIENTES.md). La app importa sin ella.
-- ────────────────────────────────────────────────────────────────────────
-- Bloque 4. El dueño sube su Excel y la app lo convierte en productos. Tres
-- cosas que no pueden ser inserts sueltos desde el teléfono:
--   · TODO O NADA: si la fila 312 trae un código repetido, no pueden quedar
--     311 dados de alta y 200 perdidos. Una función, una transacción;
--   · las existencias que trae el archivo entran como MOVIMIENTO (motivo
--     «importacion»), con rastro, igual que cualquier otra pieza;
--   · DESHACER: se guarda qué se creó y cómo estaba lo que se cambió. El
--     que sube el archivo equivocado lo revierte en un toque, sin llamarnos.
-- El archivo original se guarda en la cubeta privada `importaciones`: los
-- datos del negocio son suyos y se quedan como los trajo.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists importaciones (
  id           uuid primary key default gen_random_uuid(),
  negocio_id   uuid not null references negocios on delete cascade,
  archivo      text not null,                       -- nombre como lo subió
  ruta         text,                                -- dónde quedó el original en Storage
  quien        uuid references perfiles on delete set null,
  cuando       timestamptz not null default now(),
  filas        integer not null,
  creados      uuid[] not null default '{}',
  antes        jsonb not null default '[]',         -- [{producto, cantidad}] de lo que se cambió
  deshecha     timestamptz
);
create index if not exists importaciones_negocio on importaciones (negocio_id, cuando desc);
alter table importaciones enable row level security;
drop policy if exists imp_ver on importaciones;
create policy imp_ver on importaciones for select using (soy_admin(negocio_id));
-- Nadie la escribe directo: sólo las dos funciones de abajo.

-- ── Importar ─────────────────────────────────────────────────────────────
-- p_filas: [{ id?, nombre, marca?, descripcion?, precio, precio_antes?, sku?,
--             codigo_barras?, categoria_id?, existencias?, fotos? }]
-- Con `id` se ACTUALIZA ese producto (el importador ya decidió que es el
-- mismo); sin `id`, se crea. Sólo se tocan las llaves que vienen en la fila.
create or replace function importar_productos(p_archivo text, p_ruta text, p_filas jsonb)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  n uuid := yo_negocio();
  imp uuid;
  f jsonb; foto jsonb; i integer := 0;
  pid uuid; ahora integer; quiero integer;
  v_creados uuid[] := '{}'; v_antes jsonb := '[]'; cambiados integer := 0;
begin
  if n is null or not soy_admin(n) then raise exception 'no_autorizado'; end if;
  if jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) = 0 then raise exception 'pedido_vacio'; end if;
  if jsonb_array_length(p_filas) > 5000 then raise exception 'demasiadas_filas'; end if;

  insert into importaciones (negocio_id, archivo, ruta, quien, filas)
  values (n, coalesce(nullif(trim(p_archivo), ''), 'sin nombre'), p_ruta, auth.uid(), jsonb_array_length(p_filas))
  returning id into imp;

  for f in select * from jsonb_array_elements(p_filas) loop
    i := i + 1;
    if coalesce(trim(f->>'nombre'), '') = '' then raise exception 'fila_invalida: fila % sin nombre', i; end if;
    if f ? 'categoria_id' and f->>'categoria_id' is not null
       and not exists (select 1 from categorias where id = (f->>'categoria_id')::uuid and negocio_id = n) then
      raise exception 'otro_negocio';
    end if;

    begin
      if (f->>'precio')::numeric < 0 then raise exception 'fila_invalida: fila % con precio negativo', i; end if;
      if f ? 'id' and f->>'id' is not null then
        pid := (f->>'id')::uuid;
        -- Foto de cómo estaba, para deshacer.
        select jsonb_build_object('producto', to_jsonb(p), 'cantidad', coalesce(e.cantidad, 0))
          into foto from productos p left join existencias e on e.producto_id = p.id
         where p.id = pid and p.negocio_id = n;
        if foto is null then raise exception 'otro_negocio'; end if;
        v_antes := v_antes || jsonb_build_array(foto);
        update productos set
          nombre        = coalesce(nullif(trim(f->>'nombre'), ''), nombre),
          marca         = case when f ? 'marca' then coalesce(f->>'marca', '') else marca end,
          descripcion   = case when f ? 'descripcion' then coalesce(f->>'descripcion', '') else descripcion end,
          precio        = case when f ? 'precio' then (f->>'precio')::numeric else precio end,
          precio_antes  = case when f ? 'precio_antes' then (f->>'precio_antes')::numeric else precio_antes end,
          sku           = case when f ? 'sku' then nullif(f->>'sku', '') else sku end,
          codigo_barras = case when f ? 'codigo_barras' then nullif(f->>'codigo_barras', '') else codigo_barras end,
          categoria_id  = case when f ? 'categoria_id' then (f->>'categoria_id')::uuid else categoria_id end,
          fotos         = case when f ? 'fotos' then array(select jsonb_array_elements_text(f->'fotos')) else fotos end,
          activo        = true
        where id = pid;
        cambiados := cambiados + 1;
      else
        insert into productos (negocio_id, categoria_id, nombre, marca, descripcion, precio, precio_antes, sku, codigo_barras, fotos, externo_id)
        values (n, (f->>'categoria_id')::uuid, trim(f->>'nombre'), coalesce(f->>'marca', ''), coalesce(f->>'descripcion', ''),
                coalesce((f->>'precio')::numeric, 0), (f->>'precio_antes')::numeric, nullif(f->>'sku', ''),
                nullif(f->>'codigo_barras', ''),
                coalesce(array(select jsonb_array_elements_text(f->'fotos')), '{}'), 'importacion:' || imp)
        returning id into pid;
        v_creados := v_creados || pid;
      end if;
    exception
      when unique_violation then raise exception 'codigo_repetido: fila % (%)', i, f->>'codigo_barras';
      when check_violation then raise exception 'fila_invalida: fila % (un precio en cero o negativo)', i;
      when invalid_text_representation then raise exception 'fila_invalida: fila % con un número que no es número', i;
    end;

    -- Existencias: sólo si el archivo las trae. Entra como movimiento.
    if f ? 'existencias' and f->>'existencias' is not null then
      quiero := greatest(0, (f->>'existencias')::numeric::integer);
      insert into existencias (producto_id, negocio_id, cantidad) values (pid, n, 0) on conflict (producto_id) do nothing;
      select cantidad into ahora from existencias where producto_id = pid for update;
      if quiero <> ahora then
        update existencias set cantidad = quiero, actualizado = now() where producto_id = pid;
        insert into movimientos (negocio_id, producto_id, delta, motivo, canal, referencia, quien, nota)
        values (n, pid, quiero - ahora, 'importacion', 'manual', imp, auth.uid(), 'Importado de ' || p_archivo);
      end if;
    end if;
  end loop;

  update importaciones set creados = v_creados, antes = v_antes where id = imp;
  return jsonb_build_object('importacion', imp, 'creados', coalesce(array_length(v_creados, 1), 0), 'actualizados', cambiados);
end $$;

-- ── Deshacer ─────────────────────────────────────────────────────────────
-- Sólo la ÚLTIMA importación que siga en pie, como Ctrl+Z: si dos tocaron el
-- mismo producto, deshacer la vieja primero pisaría a la nueva.
-- Lo creado se borra; si ya se vendió, se oculta (su historial se queda).
create or replace function deshacer_importacion(p_id uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r importaciones; a jsonb; p jsonb; pid uuid; ahora integer; quiero integer;
  borrados integer := 0; ocultos integer := 0; restaurados integer := 0;
begin
  select * into r from importaciones where id = p_id for update;
  if r.id is null then raise exception 'no_existe'; end if;
  if not soy_admin(r.negocio_id) then raise exception 'no_autorizado'; end if;
  if r.deshecha is not null then raise exception 'ya_deshecha'; end if;
  if exists (select 1 from importaciones where negocio_id = r.negocio_id and deshecha is null and cuando > r.cuando) then
    raise exception 'no_es_la_ultima';
  end if;

  -- Lo creado: fuera, salvo lo que ya tiene ventas.
  for pid in select unnest(r.creados) loop
    if exists (select 1 from renglones where producto_id = pid)
       or exists (select 1 from movimientos where producto_id = pid and motivo <> 'importacion') then
      update productos set activo = false where id = pid; ocultos := ocultos + 1;
    else
      delete from productos where id = pid; borrados := borrados + 1;
    end if;
  end loop;

  -- Lo cambiado: vuelve como estaba, existencias incluidas (con su movimiento).
  for a in select * from jsonb_array_elements(r.antes) loop
    p := a->'producto'; pid := (p->>'id')::uuid;
    update productos set
      nombre = p->>'nombre', marca = p->>'marca', descripcion = p->>'descripcion',
      precio = (p->>'precio')::numeric, precio_antes = (p->>'precio_antes')::numeric,
      sku = p->>'sku', codigo_barras = p->>'codigo_barras', categoria_id = (p->>'categoria_id')::uuid,
      fotos = array(select jsonb_array_elements_text(p->'fotos')), activo = (p->>'activo')::boolean
    where id = pid;
    select cantidad into ahora from existencias where producto_id = pid for update;
    quiero := (a->>'cantidad')::integer;
    if ahora is not null and quiero <> ahora then
      quiero := greatest(quiero, (select apartado from existencias where producto_id = pid));
      update existencias set cantidad = quiero, actualizado = now() where producto_id = pid;
      insert into movimientos (negocio_id, producto_id, delta, motivo, canal, referencia, quien, nota)
      values (r.negocio_id, pid, quiero - ahora, 'ajuste', 'manual', r.id, auth.uid(), 'Se deshizo la importación de ' || r.archivo);
    end if;
    restaurados := restaurados + 1;
  end loop;

  update importaciones set deshecha = now() where id = r.id;
  return jsonb_build_object('borrados', borrados, 'ocultos', ocultos, 'restaurados', restaurados);
end $$;

revoke execute on function importar_productos(text, text, jsonb) from public, anon;
revoke execute on function deshacer_importacion(uuid) from public, anon;
grant execute on function importar_productos(text, text, jsonb) to authenticated, service_role;
grant execute on function deshacer_importacion(uuid) to authenticated, service_role;

-- ── El archivo original ──────────────────────────────────────────────────
-- Privada: es la lista de precios del negocio. importaciones/<negocio>/<archivo>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('importaciones', 'importaciones', false, 10485760, array[
  'text/csv', 'text/plain', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists imp_archivo_ver on storage.objects;
drop policy if exists imp_archivo_subir on storage.objects;
create policy imp_archivo_ver on storage.objects for select to authenticated
  using (bucket_id = 'importaciones' and soy_admin(_carpeta_negocio(name)));
create policy imp_archivo_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'importaciones' and soy_admin(_carpeta_negocio(name)));
