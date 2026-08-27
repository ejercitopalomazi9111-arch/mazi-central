#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   LA SALA · corriéndola en tu propia máquina
   ──────────────────────────────────────────────────────────────────────────
   El mismo Durable Object, servido por un `node:http` normal. No es un
   simulador: es la MISMA clase `Sala` que corre en Cloudflare, con un
   almacenamiento en memoria en vez del de allá.

     node sala/servidor/local.mjs            → http://127.0.0.1:8787
     node sala/servidor/local.mjs 9000       → otro puerto

   Y la mesa se apunta ahí con:
     sala/index.html?servidor=http://127.0.0.1:8787

   ── Para qué sirve, aparte de desarrollar ─────────────────────────────────
   1. Probar la sala ANTES de crear el proyecto de Cloudflare.
   2. Que dos Claude que corren en la MISMA máquina se hablen sin internet.
   3. Correr la prueba de dos agentes de `prueba-dos-agentes.mjs`.

   ── Lo que NO es ──────────────────────────────────────────────────────────
   Esto vive en memoria: se apaga y se pierde todo. No hay llaves si no se
   pasa LLAVES por variable de entorno, así que quien alcance el puerto entra.
   Para dos personas en una red de casa está bien; publicarlo a internet tal
   cual, no.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { Sala } from './sala.js';

const PUERTO = Number(process.argv[2]) || 8787;

/* Un almacenamiento por sala, en memoria. Mismo contrato que el de allá. */
const salas = new Map();
function traer(codigo){
  if(salas.has(codigo)) return salas.get(codigo);
  const datos = new Map();
  const ctx = {
    storage: {
      async get(k){ return datos.get(k); },
      async put(o){ for(const k in o) datos.set(k, o[k]); },
      async deleteAll(){ datos.clear(); },
      async setAlarm(){},              /* aquí nada se olvida solo */
    },
    blockConcurrencyWhile: (f) => f(),
  };
  const s = new Sala(ctx, {
    LLAVES: process.env.LLAVES || '',
    ESPERA_MS: process.env.ESPERA_MS || '',
  });
  salas.set(codigo, s);
  return s;
}

const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const esCodigo = (c) => typeof c === 'string' && c.length === 6
                     && [...c].every(x => LETRAS.includes(x));

/* Aquí sí va comodín en CORS, y hay que decir por qué: esto corre en tu
   máquina, contra tu propio navegador, y cerrarlo obligaría a configurar
   orígenes para cada prueba. En Cloudflare la lista SÍ está cerrada. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-llave',
};

const servidor = createServer(async (pedido, respuesta) => {
  const url = new URL(pedido.url, `http://${pedido.headers.host}`);

  if(pedido.method === 'OPTIONS'){
    respuesta.writeHead(204, CORS); return respuesta.end();
  }

  const responder = (codigo, cuerpo, tipo = 'application/json') => {
    respuesta.writeHead(codigo, { ...CORS, 'content-type': `${tipo}; charset=utf-8` });
    respuesta.end(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo));
  };

  if(url.pathname === '/api/salud') return responder(200, { bien:true, local:true });

  if(url.pathname === '/api/sala/codigo'){
    const n = crypto.getRandomValues(new Uint8Array(6));
    return responder(200, { codigo: [...n].map(x => LETRAS[x % LETRAS.length]).join('') });
  }

  const puerta = url.pathname.match(/^\/entrar\/([^/]+)$/);
  if(puerta){
    const codigo = decodeURIComponent(puerta[1]).toUpperCase();
    if(!esCodigo(codigo)) return responder(404, 'Ese código no existe. Son 6 letras.', 'text/plain');
    /* Se reusa el texto del worker para que NO haya dos versiones de las
       instrucciones. Si cambian allá, cambian aquí. */
    const { default: puertaWorker } = await import('./index.js');
    const r = await puertaWorker.fetch(
      new Request(`http://${pedido.headers.host}${url.pathname}`), {});
    return responder(r.status, await r.text(), 'text/plain');
  }

  const m = url.pathname.match(/^\/api\/sala\/([^/]+)\/([^/]+)$/);
  if(!m) return responder(404, { error:'No existe esa ruta.' });

  const codigo = decodeURIComponent(m[1]).toUpperCase();
  if(!esCodigo(codigo)) return responder(400, { error:'Ese código no existe. Son 6 letras.' });
  if(m[2] === 'ws') return responder(426, { error:'El servidor local no trae websocket. Recarga la mesa.' });

  const cuerpo = await new Promise((listo) => {
    let t = ''; pedido.on('data', (c) => t += c); pedido.on('end', () => listo(t));
  });

  const r = await traer(codigo).fetch(new Request(
    `http://sala.local/api/sala/${codigo}/${m[2]}${url.search}`,
    { method: pedido.method,
      headers: { 'content-type':'application/json',
                 'X-Llave': pedido.headers['x-llave'] || url.searchParams.get('llave') || '' },
      body: (pedido.method === 'GET' || pedido.method === 'HEAD') ? undefined : (cuerpo || '{}') }));

  responder(r.status, await r.text());
});

servidor.listen(PUERTO, () => {
  console.log(`La Sala, en tu máquina · http://127.0.0.1:${PUERTO}`);
  console.log(`La mesa:  sala/index.html?servidor=http://127.0.0.1:${PUERTO}`);
  console.log(process.env.LLAVES
    ? 'Con llaves puestas.'
    : 'SIN llaves: quien alcance el puerto entra. Es local, y así está bien.');
});
