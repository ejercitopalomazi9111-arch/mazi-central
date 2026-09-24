/* ══════════════════════════════════════════════════════════════════════════
   CONFIGURACIÓN · a qué base se conecta y qué negocio se abre
   ──────────────────────────────────────────────────────────────────────────
   ⚠ La llave de aquí abajo es la PUBLICABLE de Supabase, y está hecha para
   vivir en el navegador: cualquier página que use Supabase la manda en cada
   petición y se ve en las herramientas del navegador. Lo que protege los
   datos NO es esconderla: son las políticas de la base (migraciones 0002 y
   0004) y las funciones del servidor, verificadas desde afuera sin sesión.

   La llave MAESTRA (service_role) y las de modelos de IA jamás van aquí: viven
   como secretos de las funciones del servidor.

   El negocio se elige con ?negocio=<slug> en la dirección. Sin eso, se abre el
   de muestra. Así la misma app sirve a la barbería, a la mercancía variada y a
   quien se le venda después — sin copiar código.
   ═════════════════════════════════════════════════════════════════════════ */
export const SUPABASE_URL = 'https://volqtipyprkhylzjpbir.supabase.co';
export const SUPABASE_LLAVE_PUBLICABLE = 'sb_publishable_WH9MHV7wiYCmI8aHyroIVQ_psIMx1Gj';
export const NEGOCIO_POR_DEFECTO = 'barberia';

export function negocioPedido(){
  try{
    const n = new URLSearchParams(location.search).get('negocio');
    if(n && /^[a-z0-9-]{2,40}$/.test(n)) return n;
  }catch(e){}
  return NEGOCIO_POR_DEFECTO;
}
