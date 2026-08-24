/* ══════════════════════════════════════════════════════════════════════════
   EL WORKER DE MAZI CENTRAL
   ──────────────────────────────────────────────────────────────────────────
   Antes no había ninguno: Cloudflare servía la carpeta `dist/` y ya. Este
   existe por UNA razón — las salas de Guerra de Puercos, para que dos primos
   puedan jugar desde dos casas.

   Va aquí, en el proyecto que ya existe, y no en un proyecto nuevo, por dos
   motivos concretos:
   · un proyecto nuevo se crea a mano en Cloudflare y eso lo tendría que hacer
     Carlos; así el juego se publica con el mismo empujón de siempre;
   · mismo dominio = sin CORS, y sin CORS no hay lista de orígenes que se
     quede vieja.

   ⚠️ Lo que hay que tener presente: LOS ARCHIVOS VAN PRIMERO. Cloudflare
   busca el archivo en `dist/` y sólo si no existe llega aquí. Eso significa
   que este worker NO puede romper el sitio: para `/avisos/`, `/reportes/` o
   la portada, nunca se le pregunta.

   (Se intentó al revés —worker primero, con un binding `ASSETS` para
   devolver los archivos— y toda ruta que sí tenía archivo devolvía 500. Se
   probó con `wrangler dev` antes de publicarlo, que para eso era.)
   ═════════════════════════════════════════════════════════════════════════ */
export { Sala } from './juegos/servidor/sala.js';

/* Cuatro letras, fáciles de leer en voz alta y de teclear por un niño. Sin
   O ni 0, sin I ni 1, sin L: en un teléfono esas se confunden y el código que
   no entra a la primera es un código que hace que se rindan. */
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const CODIGO_LARGO = 4;
const esCodigo = (c) => typeof c === 'string' && c.length === CODIGO_LARGO
                     && [...c].every(x => LETRAS.includes(x));

export default {
  async fetch(pedido, env){
    const url = new URL(pedido.url);

    if(url.pathname === '/api/puercos/codigo'){
      /* Un código nuevo. Lo sortea el servidor y no el teléfono para que dos
         teléfonos no inventen el mismo a la vez. */
      const n = crypto.getRandomValues(new Uint8Array(CODIGO_LARGO));
      const codigo = [...n].map(x => LETRAS[x % LETRAS.length]).join('');
      return Response.json({ codigo });
    }

    const sala = url.pathname.match(/^\/api\/puercos\/sala\/([^/]+)$/);
    if(sala){
      const codigo = decodeURIComponent(sala[1]).toUpperCase();
      if(!esCodigo(codigo)){
        return Response.json({ error:'Ese código no existe. Son 4 letras.' }, { status:400 });
      }
      /* `idFromName` hace que el mismo código lleve SIEMPRE al mismo objeto,
         desde cualquier teléfono y desde cualquier país. Es lo que convierte
         cuatro letras en una mesa compartida. */
      const id = env.SALA.idFromName(codigo);
      return env.SALA.get(id).fetch(pedido);
    }

    /* Cualquier otra cosa: si llegó hasta aquí es que no había archivo. */
    return new Response('No existe esa ruta.', { status:404 });
  }
};
