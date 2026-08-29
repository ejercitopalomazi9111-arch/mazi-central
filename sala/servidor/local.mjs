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
import { createHash } from 'node:crypto';
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
      /* ⚠ `getAlarm` HACE FALTA AUNQUE AQUÍ NADA SE OLVIDE SOLO. La clase lo
         lee antes de escribir la alarma —para no reescribirla si la puesta ya
         sirve— y sin este método el servidor local truena en la PRIMERA
         petición con «getAlarm is not a function». Es el clásico decorado que
         se queda corto: las 217 pruebas del servidor traen el suyo completo y
         pasaban, mientras el servidor de desarrollo estaba roto. */
      async setAlarm(t){ datos.set('__alarma', t); },
      async getAlarm(){ return datos.get('__alarma') ?? null; },
    },
    blockConcurrencyWhile: (f) => f(),
  };
  const s = new Sala(ctx, {
    LLAVES: process.env.LLAVES || '',
    /* Los colores por cuenta: `carlos:#AC27FF,luis:#FF7A18`. Se me olvidó
       pasarlo aquí y la mesa local pintaba a todos con el color de reserva
       aunque estuviera configurado — un defecto que las 91 pruebas del
       servidor NO cazan, porque le pasan el env a mano. Salió al levantar la
       sala de verdad y mirarla. */
    COLORES: process.env.COLORES || '',
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
  /* El websocket ya no vive aquí: se atiende en el evento `upgrade`, abajo.
     Si algo llega a esta ruta por HTTP normal es que no pidió upgrade. */
  if(m[2] === 'ws') return responder(426, { error:'Aquí sólo websocket.' });

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

/* ══ EL WEBSOCKET, A MANO ══════════════════════════════════════════════════
   Aquí decía «el servidor local no trae websocket» y eso convertía a esta
   pieza en un simulador a medias justo donde más se necesita fidelidad: la
   PRESENCIA de la sala sale de qué sockets hay abiertos, así que sin socket
   la mesa local pinta a todos «sin señal» y no se puede distinguir un bug de
   la sala de una limitación del servidor de pruebas. Con eso encima estuve a
   punto de dar por bueno el arreglo de la presencia sin poder verlo.

   Va a mano y sin dependencias porque lo que hace falta es poco: el saludo, y
   mandar texto del servidor al cliente. No se leen mensajes del cliente —la
   mesa nunca manda nada por el socket, habla por HTTP— así que no hay que
   desenmascarar tramas entrantes; sólo saber cuándo se cierra.

   ⚠ El GUID del saludo es el de la especificación y no un capricho: sin él el
   navegador rechaza la conexión sin decir por qué. */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/* Una trama de texto del servidor NO va enmascarada (al revés que las del
   cliente). El largo cambia de forma en tres tramos, y equivocarse ahí da un
   cierre con código 1002 que parece un problema de red. */
function trama(texto){
  const datos = Buffer.from(texto, 'utf8');
  const n = datos.length;
  let cab;
  if(n < 126){ cab = Buffer.from([0x81, n]); }
  else if(n < 65536){ cab = Buffer.alloc(4); cab[0] = 0x81; cab[1] = 126; cab.writeUInt16BE(n, 2); }
  else { cab = Buffer.alloc(10); cab[0] = 0x81; cab[1] = 127; cab.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([cab, datos]);
}

servidor.on('upgrade', (pedido, enchufe) => {
  const url = new URL(pedido.url, `http://${pedido.headers.host}`);
  const m = url.pathname.match(/^\/api\/sala\/([^/]+)\/ws$/);
  const clave = pedido.headers['sec-websocket-key'];
  if(!m || !clave){ enchufe.destroy(); return; }
  const codigo = decodeURIComponent(m[1]).toUpperCase();
  if(!esCodigo(codigo)){ enchufe.destroy(); return; }

  const respuesta = createHash('sha1').update(clave + GUID).digest('base64');
  enchufe.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${respuesta}\r\n\r\n`);

  /* Se le da a la Sala un objeto con la misma forma que el WebSocket de
     Cloudflare: `send`, `close`, `accept` y `addEventListener`. Así la clase
     no sabe que está corriendo en Node, que es todo el punto de esta pieza. */
  const oyentes = {};
  const falso = {
    __quien: null,
    accept(){},
    send(t){ try{ enchufe.write(trama(t)); }catch(e){ } },
    close(){ try{ enchufe.end(); }catch(e){ } },
    addEventListener(que, f){ (oyentes[que] = oyentes[que] || []).push(f); },
  };
  const avisar = (que) => (oyentes[que] || []).forEach(f => { try{ f({}); }catch(e){ } });
  enchufe.on('close', () => avisar('close'));
  enchufe.on('error', () => avisar('error'));
  /* El cliente manda tramas de cierre y pings; no se contestan, pero sí hay
     que leer el flujo o el enchufe se queda con datos sin consumir. */
  enchufe.on('data', () => {});

  const sala = traer(codigo);
  const quien = url.searchParams.get('de') || '';
  if(quien && sala.gente[quien]){
    falso.__quien = quien;
    sala.gente[quien].visto = Date.now();
  }
  sala.vivos.add(falso);
  falso.send(JSON.stringify({
    que:'hola', hilo:sala.hilo, gente:sala.gente, proyectos:sala.proyectos,
    vueltas:sala.vueltas, conectados:sala.conectados(),
    escribiendo:sala.escribiendo(),
  }));
  const irse = () => {
    sala.vivos.delete(falso);
    if(falso.__quien) sala.difundir({ que:'gente', gente:sala.gente, conectados:sala.conectados() });
  };
  falso.addEventListener('close', irse);
  falso.addEventListener('error', irse);
  if(falso.__quien) sala.difundir({ que:'gente', gente:sala.gente, conectados:sala.conectados() });
});

servidor.listen(PUERTO, () => {
  console.log(`La Sala, en tu máquina · http://127.0.0.1:${PUERTO}`);
  console.log(`La mesa:  sala/index.html?servidor=http://127.0.0.1:${PUERTO}`);
  console.log(process.env.LLAVES
    ? 'Con llaves puestas.'
    : 'SIN llaves: quien alcance el puerto entra. Es local, y así está bien.');
});
