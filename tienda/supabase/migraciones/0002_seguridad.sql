-- ════════════════════════════════════════════════════════════════════════
-- 0002 · QUIÉN VE Y QUIÉN TOCA
-- ────────────────────────────────────────────────────────────────────────
-- Tres reglas, y todo lo de abajo sale de ellas:
--
--   1. Un negocio no ve NADA de otro. Todas las políticas pasan por negocio_id.
--   2. El catálogo es público (es una tienda). Lo demás no.
--   3. Lo que tiene invariantes —inventario, pedidos, caja, turnos— NO se
--      escribe desde el navegador: sólo por funciones del servidor (0003), que
--      revisan las reglas dentro de una transacción. Por eso esas tablas tienen
--      política de lectura y ninguna de escritura.
--
-- Las funciones de ayuda son SECURITY DEFINER porque leen `perfiles` desde
-- dentro de una política de `perfiles` — sin eso, la política se llama a sí
-- misma y Postgres corta con recursión infinita.
-- ════════════════════════════════════════════════════════════════════════

create or replace function yo_negocio() returns uuid
  language sql stable security definer set search_path = public as $$
  select negocio_id from perfiles where id = auth.uid() and activo
$$;

create or replace function yo_rol() returns rol_t
  language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid() and activo
$$;

create or replace function soy_personal(n uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles
                 where id = auth.uid() and negocio_id = n and activo
                   and rol in ('admin', 'cajero', 'repartidor'))
$$;

create or replace function soy_admin(n uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles
                 where id = auth.uid() and negocio_id = n and activo and rol = 'admin')
$$;

create or replace function puedo_cobrar(n uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles
                 where id = auth.uid() and negocio_id = n and activo and rol in ('admin', 'cajero'))
$$;

-- ¿Este cliente es el que está usando la app?
create or replace function es_mio(cliente uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from clientes c where c.id = cliente and c.perfil_id = auth.uid())
$$;

-- ── RLS en todas ────────────────────────────────────────────────────────
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ── Negocios: su cara es pública; los ajustes los cambia el admin ───────
create policy negocio_ver       on negocios for select using (true);
create policy negocio_ajustar   on negocios for update using (soy_admin(id)) with check (soy_admin(id));

-- ── Perfiles ────────────────────────────────────────────────────────────
-- Cada quien ve el suyo; el personal ve a los de su negocio.
create policy perfil_ver on perfiles for select
  using (id = auth.uid() or soy_personal(negocio_id));
create policy perfil_editar_mio on perfiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- ⚠ Sin esto, un cliente se cambia solo el `rol` a 'admin' con un update.
-- Se quita el permiso de la tabla entera y se devuelve columna por columna: el
-- rol y el negocio sólo se cambian por función del servidor.
revoke update on perfiles from anon, authenticated;
grant update (nombre, telefono) on perfiles to authenticated;

-- ── Catálogo: público lo activo; el admin lo escribe ────────────────────
create policy cat_ver on categorias for select using (activo or soy_personal(negocio_id));
create policy cat_escribir on categorias for all
  using (soy_admin(negocio_id)) with check (soy_admin(negocio_id));

create policy prod_ver on productos for select using (activo or soy_personal(negocio_id));
create policy prod_escribir on productos for all
  using (soy_admin(negocio_id)) with check (soy_admin(negocio_id));

-- Existencias: se ven (el cliente pidió saber cuántas quedan) y NO se escriben
-- desde afuera. Sólo `vender()`, `ajustar_inventario()` y compañía.
create policy exist_ver on existencias for select using (true);

create policy mov_ver on movimientos for select using (soy_personal(negocio_id));

-- ── Clientes ────────────────────────────────────────────────────────────
create policy cli_ver on clientes for select
  using (perfil_id = auth.uid() or soy_personal(negocio_id));
create policy cli_editar on clientes for update
  using (perfil_id = auth.uid() or soy_admin(negocio_id))
  with check (perfil_id = auth.uid() or soy_admin(negocio_id));

-- ── Pedidos: el cliente los suyos, el personal los de su negocio ────────
create policy ped_ver on pedidos for select
  using (soy_personal(negocio_id) or es_mio(cliente_id));
create policy ren_ver on renglones for select
  using (exists (select 1 from pedidos p where p.id = pedido_id));
create policy evt_ver on eventos_pedido for select
  using (exists (select 1 from pedidos p where p.id = pedido_id));

create policy caja_ver on cajas for select using (soy_personal(negocio_id));
create policy cobro_ver on cobros for select using (soy_personal(negocio_id));

-- ── Turnos: el suyo, o el admin todos ───────────────────────────────────
create policy turno_ver on turnos for select
  using (perfil_id = auth.uid() or soy_admin(negocio_id));
create policy pausa_ver on pausas for select
  using (exists (select 1 from turnos t where t.id = turno_id));

-- ── Ubicaciones ─────────────────────────────────────────────────────────
-- La ubicación de un empleado es dato personal. La base NO acepta un punto si
-- quien lo manda no tiene un turno ABIERTO que sea suyo. No es una regla de la
-- pantalla, que alguien se puede saltar: es la base de datos diciendo que no.
create policy ubic_ver on ubicaciones for select
  using (perfil_id = auth.uid() or soy_admin(negocio_id));
create policy ubic_mandar on ubicaciones for insert
  with check (
    perfil_id = auth.uid()
    and exists (select 1 from turnos t
                where t.id = turno_id and t.perfil_id = auth.uid()
                  and t.fin is null and t.negocio_id = ubicaciones.negocio_id)
  );

create policy ruta_ver on rutas for select
  using (perfil_id = auth.uid() or soy_admin(negocio_id));
create policy ruta_escribir on rutas for all
  using (soy_admin(negocio_id)) with check (soy_admin(negocio_id));

-- ── Promociones ─────────────────────────────────────────────────────────
create policy desc_ver on descuentos for select
  using ((activo and (fin is null or fin > now()) and inicio <= now()) or soy_personal(negocio_id));
create policy desc_escribir on descuentos for all
  using (soy_admin(negocio_id)) with check (soy_admin(negocio_id));

create policy apa_ver on apartados for select
  using (soy_personal(negocio_id) or es_mio(cliente_id));
create policy apa_ren_ver on apartado_renglones for select
  using (exists (select 1 from apartados a where a.id = apartado_id));
create policy abono_ver on abonos for select
  using (exists (select 1 from apartados a where a.id = apartado_id));

create policy sorteo_ver on sorteos for select using (activo or soy_personal(negocio_id));
create policy sorteo_escribir on sorteos for all
  using (soy_admin(negocio_id)) with check (soy_admin(negocio_id));

-- ── Conversaciones, redes, recompra ─────────────────────────────────────
create policy conv_ver on conversaciones for select using (soy_personal(negocio_id));
create policy conv_tomar on conversaciones for update
  using (soy_personal(negocio_id)) with check (soy_personal(negocio_id));
create policy msj_ver on mensajes for select using (soy_personal(negocio_id));
create policy msj_escribir on mensajes for insert
  with check (soy_personal(negocio_id) and rol = 'persona');

create policy pub_todo on publicaciones for all
  using (soy_personal(negocio_id)) with check (soy_personal(negocio_id));

create policy aviso_ver on avisos_recompra for select
  using (soy_personal(negocio_id) or es_mio(cliente_id));
create policy aviso_mover on avisos_recompra for update
  using (soy_personal(negocio_id)) with check (soy_personal(negocio_id));

create policy push_mio on suscripciones_push for all
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

-- `cuentas_servicio`: RLS encendido y SIN políticas. Nadie la lee desde fuera.

-- ── Tiempo real: lo que el tablero y el seguimiento escuchan ────────────
-- Las suscripciones de Realtime respetan RLS: cada quien recibe sólo lo que
-- podría leer con un select.
alter publication supabase_realtime add table
  pedidos, eventos_pedido, existencias, ubicaciones, conversaciones, mensajes;
