-- ════════════════════════════════════════════════════════════════════════
-- 0013 · LA VENTA DE MOSTRADOR A NOMBRE DE UN CLIENTE
-- ────────────────────────────────────────────────────────────────────────
-- ⚠ ESCRITA Y SIN APLICAR (24 de septiembre), como 0009–0012.
--
-- El barbero que compra en persona no aparecía en «le toca surtirse» ni en
-- el sorteo: la venta de mostrador se hacía sin cliente. vender() ya aceptaba
-- p_cliente desde 0003, y la caja ya puede ELEGIR a un cliente existente sin
-- esto (RLS cli_ver deja al personal leer los clientes de su negocio). Lo que
-- falta es:
--   · alta_cliente(): que la caja dé de alta a alguien nuevo con nombre y
--     WhatsApp. No hay política de insert en `clientes` (a propósito): entra
--     por aquí o por mi_cliente(). Si ya hay alguien con ese número, devuelve
--     ése en vez de duplicarlo.
--   · que un pedido no pueda quedar a nombre de un cliente de OTRO negocio.
--     En el canal 'pos', vender() no revisaba de quién era p_cliente: una caja
--     con un id ajeno lo habría colgado de otro negocio. Se revisa con un
--     disparador para no reescribir vender() entera.
--
-- Lo que NO hace, a propósito: juntar la ficha del mostrador con la cuenta
-- que esa persona abra después en la tienda. Juntarlas por el teléfono le
-- enseñaría las compras de otro a quien escriba un número ajeno; hace falta
-- verificar el número (código por WhatsApp) antes. Ver tienda/PENDIENTES.md.
-- ════════════════════════════════════════════════════════════════════════

create or replace function alta_cliente(p_negocio uuid, p_nombre text, p_telefono text)
  returns uuid language plpgsql security definer set search_path = public as $$
declare
  tel text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  c uuid;
begin
  if not puedo_cobrar(p_negocio) then raise exception 'no_autorizado'; end if;
  if length(trim(coalesce(p_nombre, ''))) < 2 then raise exception 'falta_nombre'; end if;
  -- Como lo copian de WhatsApp: +52, 52 o el viejo 521 delante de los 10.
  if length(tel) = 13 and tel like '521%' then tel := substr(tel, 4);
  elsif length(tel) = 12 and tel like '52%' then tel := substr(tel, 3); end if;
  if length(tel) <> 10 then raise exception 'telefono_invalido'; end if;

  select id into c from clientes
   where negocio_id = p_negocio and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 10) = tel
   order by creado limit 1;
  if c is not null then return c; end if;

  insert into clientes (negocio_id, nombre, telefono)
  values (p_negocio, trim(p_nombre), tel)
  returning id into c;
  return c;
end $$;

create or replace function _cliente_del_negocio() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.cliente_id is not null and not exists (
       select 1 from clientes where id = new.cliente_id and negocio_id = new.negocio_id) then
    raise exception 'otro_negocio';
  end if;
  return new;
end $$;

drop trigger if exists pedidos_cliente_del_negocio on pedidos;
create trigger pedidos_cliente_del_negocio
  before insert or update of cliente_id on pedidos
  for each row execute function _cliente_del_negocio();

revoke all on function alta_cliente(uuid, text, text) from public, anon;
grant execute on function alta_cliente(uuid, text, text) to authenticated;
revoke all on function _cliente_del_negocio() from public, anon, authenticated;
