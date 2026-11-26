/* EL ESPEJO DE MAZI VR (Carlos, 26 nov: «pon… compartir mi pantalla para que se vea en tiempo real lo que se está viendo
   dentro de las gafas y yo pueda controlar un poco la explicación»).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Un objeto por CÓDIGO de 4 números (el visor lo enseña; el docente lo escribe en vr/operador.html). Sólo es un relevo:
     · el VISOR manda cuadros (JPEG chicos, binario) y su estado (JSON) → le llegan a los OPERADORES;
     · un OPERADOR manda órdenes (JSON: siguiente, atrás, repetir, callar, idioma, listo, escena) → le llegan al VISOR.
   Nada se guarda: ni cuadros ni órdenes. Con la API de hibernación (acceptWebSocket) el objeto duerme entre mensajes y
   no cobra el tiempo que el socket pasa abierto (CLAUDE.md, regla 12: «servidor.accept() cobra todo el rato»).
   Clase normal con fetch, sin `cloudflare:workers` (las pruebas de La Sala cargan el servidor en Node). */
const MAX = 256 * 1024;   /* un cuadro de 480 px en JPEG pesa ~20-40 KB; más de esto no es un cuadro */
export class Espejo {
  constructor(ctx){ this.ctx = ctx; }
  cuantos(rol){ return this.ctx.getWebSockets(rol).length; }
  avisar(){ const n = { visores: this.cuantos('visor'), operadores: this.cuantos('operador') };
    for(const w of this.ctx.getWebSockets()) try{ w.send(JSON.stringify({ tipo: 'gente', ...n })); }catch{} }
  async fetch(pedido){
    if(pedido.headers.get('Upgrade') !== 'websocket') return new Response('Sólo websocket.', { status: 426 });
    const rol = new URL(pedido.url).searchParams.get('rol') === 'operador' ? 'operador' : 'visor';
    if(this.cuantos(rol) >= (rol === 'visor' ? 1 : 4)){   /* un visor por código; hasta 4 pantallas mirando */
      if(rol === 'visor') for(const w of this.ctx.getWebSockets('visor')) try{ w.close(4000, 'Otro visor tomó este código'); }catch{}
      else return new Response('Ya hay 4 pantallas con este código.', { status: 429 });
    }
    const par = new WebSocketPair(), [cliente, servidor] = Object.values(par);
    this.ctx.acceptWebSocket(servidor, [rol]);
    this.avisar();
    return new Response(null, { status: 101, webSocket: cliente });
  }
  webSocketMessage(ws, msg){
    const [rol] = this.ctx.getTags(ws), largo = typeof msg === 'string' ? msg.length : msg.byteLength;
    if(largo > MAX) return;
    /* el operador sólo puede mandar órdenes (texto); el visor, cuadros y estado */
    if(rol === 'operador' && typeof msg !== 'string') return;
    const otro = rol === 'visor' ? 'operador' : 'visor';
    for(const w of this.ctx.getWebSockets(otro)) try{ w.send(msg); }catch{}
  }
  webSocketClose(ws){ try{ ws.close(); }catch{} this.avisar(); }
  webSocketError(ws){ try{ ws.close(); }catch{} this.avisar(); }
}
/* el código: 4 dígitos; cualquier otra cosa no entra */
export const codigoBueno = (c) => /^\d{4}$/.test(c || '');
