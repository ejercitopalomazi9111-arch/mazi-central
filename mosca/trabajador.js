/* El trabajador de fondo: aquí viven los cerebros, para que la pantalla no se trabe.

   Dos maneras de correr, según lo que deje el navegador:
     · EN PARALELO (si la página está «aislada», crossOriginIsolated): un trabajador por mosca, cada uno
       en su núcleo del procesador. El conectoma (90 MB) vive UNA vez en memoria compartida
       (SharedArrayBuffer) y los tres lo leen. Es tres veces más rápido.
     · TODO EN UNO (si no): un solo trabajador con los tres cerebros, uno tras otro.

   Mensajes que recibe:
     { tipo: 'iniciar', base, moscas: [0..], compartir }   baja y arma el conectoma; con `compartir` lo
                                                         devuelve en memoria compartida para los demás
     { tipo: 'red', base, red: {ini, dst, pesos}, indice, moscas }   arma sus cerebros con el conectoma ya hecho
     { tipo: 'sentidos', mosca, s: { nombre: {izq, der} } }
     { tipo: 'silenciar', mosca, grupo, si }
     { tipo: 'pausa', si }      { tipo: 'mapa', mosca }      { tipo: 'instintos' }
   Manda: 'progreso', 'red', 'listo', 'estado', 'mapa', 'instintos', 'error'.
*/
import { Red, Cerebro, semilla } from './cerebro.js';

let red = null, cerebros = new Map(), pausa = false, verMapa = null;
const sentidosPrevios = {};
const post = (m, t) => self.postMessage(m, t || []);

async function bajar(base, compartir) {
  const indice = await (await fetch(base + 'datos/indice.json')).json();
  let bajado = 0;
  const piezas = [];
  for (let k = 0; k < indice.piezas; k++) {
    const r = await fetch(`${base}datos/conectoma-${k}.bin`);
    if (!r.ok) throw new Error(`no se pudo bajar la pieza ${k} del conectoma (${r.status})`);
    const lector = r.body.getReader(); const partes = [];
    for (;;) {
      const { done, value } = await lector.read(); if (done) break;
      partes.push(value); bajado += value.length;
      post({ tipo: 'progreso', bajado, etapa: 'bajando' });
    }
    piezas.push(new Blob(partes));
  }
  post({ tipo: 'progreso', etapa: 'descomprimiendo' });
  const flujo = new Blob(piezas).stream().pipeThrough(new DecompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(flujo).arrayBuffer());
  post({ tipo: 'progreso', etapa: 'armando' });
  const nuevo = compartir ? (n) => new SharedArrayBuffer(n) : undefined;
  return Red.desde(bytes, indice, nuevo);
}

function armar(moscas) {
  for (const k of moscas) { const c = new Cerebro(red); c.azar = semilla(k + 1); cerebros.set(k, c); sentidosPrevios[k] = {}; }
  if (verMapa === null) verMapa = moscas[0];
  post({ tipo: 'listo', moscas, neuronas: red.N, conexiones: red.indice.aristas });
  bucle();
}

function aplicarSentidos(k, s) {
  const c = cerebros.get(k), antes = sentidosPrevios[k]; if (!c) return;
  for (const nombre of red.indice.entradas) {
    for (const lado of ['izq', 'der']) {
      const hz = Math.round(s?.[nombre]?.[lado] || 0);
      const clave = nombre + ':' + lado;
      if ((antes[clave] || 0) !== hz) { c.estimular(nombre, lado, hz); antes[clave] = hz; }
    }
  }
}

const TROZO = 10;          // ms de cerebro por vuelta
let ultimoEstado = 0, ultimoMapa = 0, tCerebro = 0, relojIni = performance.now(), cerebroIni = 0;
// el cerebro nunca corre MÁS rápido que el tiempo real; si va más lento, el mundo va en cámara lenta
let origen = null;
function bucle() {
  if (!pausa && red) {
    const ya = performance.now();
    if (origen === null) origen = ya - tCerebro;
    const permitido = ya - origen;
    if (tCerebro > permitido + TROZO) { setTimeout(bucle, 4); return; }
    if (tCerebro < permitido - 250) origen = ya - tCerebro - 50;     // no intenta alcanzar: se resigna
    for (const c of cerebros.values()) c.avanzar(TROZO);
    tCerebro += TROZO;
    const ahora = performance.now();
    if (ahora - ultimoEstado > 50) {
      const velocidad = (tCerebro - cerebroIni) / Math.max(1, ahora - relojIni);
      relojIni = ahora; cerebroIni = tCerebro; ultimoEstado = ahora;
      const moscas = {};
      for (const [k, c] of cerebros) {
        const o = {}; for (const s of Object.keys(c.salidas)) o[s] = c.salidas[s].tasa;
        moscas[k] = { tasas: o, activas: c.nLista, spikes: c.spikesTotal };
      }
      post({ tipo: 'estado', t: tCerebro, velocidad, moscas });
    }
    if (ahora - ultimoMapa > 200 && cerebros.has(verMapa)) {
      ultimoMapa = ahora;
      const c = cerebros.get(verMapa).mapa(); const m = new Uint8Array(c.length);
      for (let i = 0; i < c.length; i++) m[i] = c[i] > 255 ? 255 : c[i];
      for (const [k, o] of cerebros) if (k !== verMapa) o.cuenta.fill(0);
      post({ tipo: 'mapa', mosca: verMapa, m }, [m.buffer]);
    }
  }
  setTimeout(bucle, pausa ? 50 : 0);
}

function instintos() {
  // Cada sentido solo, 400 ms a 120 Hz, en un cerebro limpio: qué conducta enciende cada uno
  const filas = [];
  for (const s of red.indice.entradas) {
    const c = new Cerebro(red, { suavizar: 400 }); c.estimular(s, 'todos', 120); c.avanzar(400);
    const o = {}; for (const k of red.indice.salidas) o[k] = +c.tasa(k).toFixed(1);
    let n = 0; for (let i = 0; i < c.cuenta.length; i++) if (c.cuenta[i]) n++;
    filas.push({ sentido: s, salidas: o, spikes: c.spikesTotal, neuronas: n });
    post({ tipo: 'progreso', etapa: 'instintos', hecho: filas.length, de: red.indice.entradas.length });
  }
  post({ tipo: 'instintos', filas });
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.tipo === 'iniciar') {
      red = await bajar(m.base, m.compartir);
      if (m.compartir) post({ tipo: 'red', red: { ini: red.ini, dst: red.dst, pesos: red.pesos }, indice: red.indice });
      armar(m.moscas);
    } else if (m.tipo === 'red') {
      red = new Red(m.indice.neuronas, m.red.ini, m.red.dst, m.red.pesos, m.indice);
      armar(m.moscas);
    } else if (!red) return;
    else if (m.tipo === 'sentidos') aplicarSentidos(m.mosca, m.s);
    else if (m.tipo === 'silenciar') cerebros.get(m.mosca)?.silenciar(red.grupo(m.grupo), m.si);
    else if (m.tipo === 'pausa') { pausa = m.si; origen = null; }
    else if (m.tipo === 'mapa') verMapa = m.mosca;
    else if (m.tipo === 'instintos') instintos();
  } catch (err) { post({ tipo: 'error', mensaje: err.message }); }
};
