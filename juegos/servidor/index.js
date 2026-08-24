/* ══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS · EL SERVIDOR DE SALAS
   ──────────────────────────────────────────────────────────────────────────
   Existe por UNA razón: que dos primos puedan jugar desde dos casas.

   ── Por qué es un proyecto APARTE, y no va dentro del sitio ───────────────
   Primero se metió dentro del proyecto del sitio, para ahorrarle a Carlos
   tener que crear uno nuevo a mano. Salió caro: los despliegues de los DOS
   proyectos empezaron a fallar al instante y sin registro, justo en ese
   commit. Al quitarlo, verde otra vez.

   O sea que un juego de cartas podía tumbar el despliegue del tablero, de
   Avisos y de Reportes. Eso no se arregla entendiendo la causa exacta: se
   arregla no volviendo a mezclarlos. Es la misma forma que tiene el servidor
   de Fadori en `servidor/`, y por la misma razón.

   El precio de separarlo es CORS, y se paga en claro aquí abajo: una lista de
   orígenes, sin comodines.
   ═════════════════════════════════════════════════════════════════════════ */
export { Sala } from './sala.js';

/* De dónde se acepta que llamen. Sin "*": un comodín aquí le abre la puerta a
   cualquier página del mundo para abrir salas en nombre de alguien. */
function origenBueno(pedido, env){
  const origen = pedido.headers.get('Origin');
  if(!origen) return true;                       /* curl y las pruebas */
  const lista = (env.ORIGENES || '').split(',').map(x => x.trim()).filter(Boolean);
  if(lista.includes(origen)) return true;
  /* Las vistas previas de Cloudflare: una por rama y una por commit, con
     nombre distinto cada vez. Sólo las que cuelgan de NUESTRO proyecto —nadie
     más puede crear un nombre ahí—, para poder probar antes de publicar. */
  const previas = (env.VISTAS_PREVIAS || '').trim();
  return !!previas && new URL(origen).hostname.endsWith(previas);
}

const conCORS = (respuesta, pedido) => {
  const origen = pedido.headers.get('Origin');
  if(origen) respuesta.headers.set('Access-Control-Allow-Origin', origen);
  respuesta.headers.set('Vary', 'Origin');
  return respuesta;
};

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

    if(!origenBueno(pedido, env)){
      return new Response('Desde ahí no.', { status:403 });
    }
    if(pedido.method === 'OPTIONS'){
      return conCORS(new Response(null, { status:204,
        headers:{ 'Access-Control-Allow-Methods':'GET,OPTIONS',
                  'Access-Control-Allow-Headers':'content-type' } }), pedido);
    }

    if(url.pathname === '/api/puercos/codigo'){
      /* Un código nuevo. Lo sortea el servidor y no el teléfono para que dos
         teléfonos no inventen el mismo a la vez. */
      const n = crypto.getRandomValues(new Uint8Array(CODIGO_LARGO));
      const codigo = [...n].map(x => LETRAS[x % LETRAS.length]).join('');
      return conCORS(Response.json({ codigo }), pedido);
    }

    const sala = url.pathname.match(/^\/api\/puercos\/sala\/([^/]+)$/);
    if(sala){
      const codigo = decodeURIComponent(sala[1]).toUpperCase();
      if(!esCodigo(codigo)){
        return conCORS(Response.json({ error:'Ese código no existe. Son 4 letras.' },
                                     { status:400 }), pedido);
      }
      /* `idFromName` hace que el mismo código lleve SIEMPRE al mismo objeto,
         desde cualquier teléfono y desde cualquier país. Es lo que convierte
         cuatro letras en una mesa compartida. */
      const id = env.SALA.idFromName(codigo);
      return env.SALA.get(id).fetch(pedido);
    }

    /* Para saber desde fuera si el servidor está vivo, sin abrir una sala. */
    if(url.pathname === '/api/salud') return conCORS(Response.json({ bien:true }), pedido);

    /* Este worker NO sirve el sitio: nada más las salas. */
    return conCORS(Response.json({ error:'No existe esa ruta.' }, { status:404 }), pedido);
  }
};
