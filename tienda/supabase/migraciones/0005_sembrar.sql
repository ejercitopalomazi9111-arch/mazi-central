-- ════════════════════════════════════════════════════════════════════════
-- 0005 · SEMBRAR UN NEGOCIO ENTERO DESDE UN JSON
-- ────────────────────────────────────────────────────────────────────────
-- Sirve para tres cosas y por eso vive en la base y no en un guion aparte:
--   · la barbería de muestra (el catálogo de muestra/catalogo.json);
--   · el segundo giro, mercancía variada (Bloque 13) — sólo cambia el JSON;
--   · volver a sembrar sin duplicar: todo es «insertar o actualizar».
--
-- Productos se reconocen por `externo_id` (el id en el sistema de donde
-- vinieron). Por eso el índice único: importar dos veces el mismo archivo
-- ACTUALIZA, no duplica. El importador del Bloque 4 se apoya en lo mismo.
--
-- Las existencias sólo se ponen la PRIMERA vez (`do nothing`): volver a
-- sembrar no debe borrar lo que ya se vendió.
--
-- Sólo la llama el dueño de la base o el servidor. Nadie desde el navegador.
-- ════════════════════════════════════════════════════════════════════════

create unique index if not exists productos_externo_unico
  on productos (negocio_id, externo_id) where externo_id is not null;

create or replace function sembrar_negocio(p jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  n uuid;
  cats integer;
  prods integer;
  nuevas integer;
begin
  insert into negocios (slug, nombre, giro, marca, ajustes)
  values (p->>'slug', p->>'nombre', p->>'giro',
          coalesce(p->'marca', '{}'), coalesce(p->'ajustes', '{}'))
  on conflict (slug) do update
    set nombre = excluded.nombre, giro = excluded.giro,
        marca = excluded.marca, ajustes = excluded.ajustes
  returning id into n;

  insert into categorias (negocio_id, clave, nombre, icono, orden, plantilla)
  select n, c->>'id', c->>'nombre', coalesce(c->>'icono', 'caja'),
         (ord - 1)::int, coalesce(c->'plantilla', '[]')
    from jsonb_array_elements(p->'categorias') with ordinality as t(c, ord)
  on conflict (negocio_id, clave) do update
    set nombre = excluded.nombre, icono = excluded.icono,
        orden = excluded.orden, plantilla = excluded.plantilla;
  get diagnostics cats = row_count;

  insert into productos (negocio_id, categoria_id, nombre, marca, precio, precio_antes, fotos, externo_id)
  select n, c.id, x->>'n', coalesce(x->>'m', ''), (x->>'p')::numeric,
         nullif(x->>'a', '')::numeric,
         case when x->>'f' is null then '{}' else array[x->>'f'] end,
         x->>'id'
    from jsonb_array_elements(p->'productos') x
    join categorias c on c.negocio_id = n and c.clave = x->>'c'
  on conflict (negocio_id, externo_id) where externo_id is not null do update
    set nombre = excluded.nombre, marca = excluded.marca, precio = excluded.precio,
        precio_antes = excluded.precio_antes, fotos = excluded.fotos,
        categoria_id = excluded.categoria_id, actualizado = now();
  get diagnostics prods = row_count;

  -- Existencias de MUESTRA con una regla fija por producto (no al azar): dos
  -- siembras dan lo mismo y una prueba puede contar con ellas. Uno de cada
  -- once queda bajo el mínimo, para que el aviso de «se está acabando» tenga
  -- de qué avisar desde el primer día. Lo agotado en origen, en 0.
  insert into existencias (producto_id, negocio_id, cantidad, minimo)
  select pr.id, n,
         case when (x->>'x') is not null then 0
              when abs(hashtext(x->>'id')) % 11 = 0 then 2 + abs(hashtext(x->>'id')) % 4
              else 6 + abs(hashtext(x->>'id')) % 35 end,
         5
    from jsonb_array_elements(p->'productos') x
    join productos pr on pr.negocio_id = n and pr.externo_id = x->>'id'
  on conflict (producto_id) do nothing;
  get diagnostics nuevas = row_count;

  return jsonb_build_object('negocio', n, 'categorias', cats, 'productos', prods,
                            'existencias_nuevas', nuevas);
end $$;

revoke execute on function sembrar_negocio(jsonb) from public, anon, authenticated;
grant execute on function sembrar_negocio(jsonb) to service_role;
