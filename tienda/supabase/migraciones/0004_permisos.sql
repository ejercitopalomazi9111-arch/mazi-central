-- ════════════════════════════════════════════════════════════════════════
-- 0004 · QUIÉN PUEDE LLAMAR QUÉ
-- ────────────────────────────────────────────────────────────────────────
-- Salió del revisor de seguridad de Supabase, corrido después de 0003.
--
-- Las funciones de ACCIÓN (vender, abrir caja, cambiar rol…) ya revisaban por
-- dentro quién llama, y a un anónimo lo rechazaban. Pero estaban abiertas al
-- rol `anon`: la puerta cerrada con llave, sí, pero sin la reja de enfrente. Se
-- cierran a `anon` y se dejan a `authenticated` —que entra y la función decide—
-- y a `service_role`, que es el bot.
--
-- ⚠ Las de AYUDA (soy_admin, soy_personal, es_mio…) NO se cierran a `anon`, y
-- es a propósito: las políticas del catálogo las llaman
-- (`activo or soy_personal(negocio_id)`). Postgres no promete cortar el `or`
-- en el primer verdadero, así que si `anon` no puede ejecutarlas, el catálogo
-- público deja de cargar para quien no tiene sesión. Son inofensivas: sólo
-- dicen si quien pregunta es admin, y para un anónimo la respuesta es no.
-- ════════════════════════════════════════════════════════════════════════

create or replace function _es_servicio() returns boolean
  language sql stable set search_path = public as $$
  select coalesce(auth.role(), '') = 'service_role'
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'mi_cliente(uuid, text, text)',
    'vender(uuid, canal_t, jsonb, uuid, momento_pago_t, jsonb, text, jsonb, uuid)',
    'cambiar_estado(uuid, estado_pedido, text)',
    'asignar_repartidor(uuid, uuid)',
    'ajustar_inventario(uuid, integer, text)',
    'contar_inventario(uuid, integer, text)',
    'abrir_turno()',
    'pausar_turno(boolean)',
    'cerrar_turno(numeric)',
    'cobrar_entrega(uuid, forma_pago_t, numeric)',
    'abrir_caja(numeric)',
    'cerrar_caja(numeric, text)',
    'donde_va(uuid)',
    'cambiar_rol(uuid, rol_t, boolean)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
