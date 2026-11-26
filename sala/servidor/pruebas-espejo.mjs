/* El espejo de Mazi VR (espejo.js) con un contexto de mentiras: lo del visor llega a los operadores, lo de los operadores
   llega al visor, el operador no puede mandar binario, y un segundo visor saca al primero.
     node sala/servidor/pruebas-espejo.mjs */
import { Espejo, codigoBueno } from './espejo.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
class WS { constructor(){ this.llego = []; this.cerrado = null; } send(m){ this.llego.push(m); } close(c, r){ this.cerrado = [c, r]; } }
globalThis.WebSocketPair = class { constructor(){ this[0] = new WS(); this[1] = new WS(); } };
const socks = [];
const ctx = { acceptWebSocket(w, tags){ w.tags = tags; socks.push(w); }, getWebSockets(tag){ return socks.filter((w) => !w.cerrado && (!tag || w.tags.includes(tag))); }, getTags(w){ return w.tags; } };
const E = new Espejo(ctx);
const abrir = async (rol) => { const r = await E.fetch(new Request('https://x/api/sala/vr/espejo/1234?rol=' + rol, { headers: { Upgrade: 'websocket' } })).catch((e) => e);
  return socks.at(-1); };
/* Response con status 101 no existe en Node: se atrapa y se revisa lo que importa (el socket aceptado) */
const _R = globalThis.Response; globalThis.Response = class extends _R { constructor(b, o = {}){ super(b, o.status === 101 ? { status: 200 } : o); } };
const visor = await abrir('visor'), op = await abrir('operador'), op2 = await abrir('operador');
sí(visor.tags[0] === 'visor' && op.tags[0] === 'operador', 'cada quien entra con su papel');
sí(op.llego.some((m) => typeof m === 'string' && JSON.parse(m).operadores === 2), 'al entrar, todos se enteran de cuántos hay');
const cuadro = new Uint8Array(30000).buffer; E.webSocketMessage(visor, cuadro);
sí(op.llego.includes(cuadro) && op2.llego.includes(cuadro), 'un cuadro del visor les llega a los dos operadores');
E.webSocketMessage(op, JSON.stringify({ tipo: 'orden', accion: 'siguiente' }));
sí(visor.llego.some((m) => typeof m === 'string' && /siguiente/.test(m)) && !op2.llego.some((m) => typeof m === 'string' && /siguiente/.test(m)), 'una orden del operador le llega al visor (y no a otro operador)');
const n0 = visor.llego.length; E.webSocketMessage(op, new Uint8Array(10).buffer);
sí(visor.llego.length === n0, 'el operador no puede mandar binario');
E.webSocketMessage(visor, new Uint8Array(300 * 1024).buffer);
sí(!op.llego.some((m) => m.byteLength === 300 * 1024), 'nada de más de 256 KB');
const visor2 = await abrir('visor');
sí(visor.cerrado?.[0] === 4000 && ctx.getWebSockets('visor').length === 1, 'un segundo visor con el mismo código saca al primero');
sí(codigoBueno('0042') && !codigoBueno('12345') && !codigoBueno('abcd') && !codigoBueno('../x'), 'el código son 4 dígitos y nada más');
const r = await E.fetch(new Request('https://x/', {})); sí(r.status === 426, 'sin websocket: 426');
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
