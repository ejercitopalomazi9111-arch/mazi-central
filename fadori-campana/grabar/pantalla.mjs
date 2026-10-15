/* GRABA LA PANTALLA DE LA TELE de verdad para el comercial, con todo lo que
   pasa en el recreo: un episodio de Radio Divergentes, una película, música,
   la tanda con los proyectos de la escuela y un partido en vivo, mientras
   los turnos van saliendo en la esquina. Carlos, 15 de octubre: «no solamente
   mostramos partidos también mostramos episodios de podcast películas música
   o los proyectos de nuestros compañeros».

   Los videos que pasa salen de /tmp/claude-0/medios (no van al repo):
   episodio.webm y partido.webm con clip.mjs + medios.html, pelicula.webm
   (Big Buck Bunny, CC BY 3.0) y musica.webm (Carefree, Kevin MacLeod, CC BY 4.0).

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori-campana/grabar/pantalla.mjs
   Sale en fadori-campana/salida/rec/tv-<parte>/%05d.jpg */
process.env.ESCALA ||= '1';
const { abrirMesa, PROD } = await import('../../fadori/mesa-de-pruebas.mjs');
import { grabar, lento } from './comun.mjs';
const K = Number(process.env.LENTO || 5);                               /* cámara lenta, igual que en app.mjs */
import fs from 'fs'; import path from 'path';

const MEDIOS = process.env.MEDIOS || '/tmp/claude-0/medios';
const REC = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'salida', 'rec');
const hoy = new Date(); hoy.setUTCHours(16, 12, 0, 0);
const desfase = hoy.getTime() - Date.now(), zona = 'America/Mexico_City';
const M = await abrirMesa('comercial-tv');
const most = await M.mostrador({ desfase, zona });

/* la fila: siete compañeros pidieron */
const pedir = (pg, ps) => pg.evaluate(ps => { const F = FADORI, d = F.productos(true).filter(p => p.disponible && p.foto); return F.pedir(F.yo().codigo, ps.map(i => ({ prod: d[i % d.length].id, cant: 1 })), {}).id; }, ps);
const ids = [];
for(const [n, g, ps] of [['Ana Pérez', '3.1', [3, 16]], ['Beto Ruiz', '2B', [6]], ['Caro Silva', '1A', [7, 17]], ['Dani Mora', '3.2', [12]], ['Eli Torres', '2A', [4]], ['Fer Gil', '1B', [9]], ['Gabo Luna', '3.1', [2, 11]]]){
  const pg = await M.aparato('/fadori/', { desfase, zona }); await M.alumno(n, g, pg); await pg.reload(); await pg.waitForTimeout(1200); ids.push(await pedir(pg, ps));
}
if(await M.tarda(most, ids => ids.every(i => FADORI.pedido(i)) || (FADORI.cargar && FADORI.cargar(), null), ids, 30000) == null) throw new Error('el mostrador no ve los pedidos');
await most.evaluate(ids => { const F = FADORI; F.tomar(ids[0], 'S'); F.marcarListo(ids[0]); F.tomar(ids[1], 'S'); }, ids);
const listo = (i) => most.evaluate(id => { const F = FADORI; if(!F.pedido(id)) return; if(F.pedido(id).estado === 'en_cola') F.tomar(id, 'S'); F.marcarListo(id); }, ids[i]);
const tomar = (i) => most.evaluate(id => FADORI.tomar(id, 'S'), ids[i]);

const tv = await M.aparato('/fadori/pantalla', { w: 1920, h: 1080, desfase, zona });
await tv.context().route(/\/medios-comercial\//, r => r.fulfill({ path: path.join(MEDIOS, decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop())), contentType: 'video/webm' }));
await tv.waitForTimeout(1500);
/* lo que la cooperativa le cargó a la tablet, como lo guarda tele.js */
await tv.evaluate(async (base) => {
  const bd = await new Promise(si => { const r = indexedDB.open('fadori-tele', 1); r.onupgradeneeded = () => r.result.createObjectStore('cosas'); r.onsuccess = () => si(r.result); });
  const put = (k, v) => new Promise(si => { const t = bd.transaction('cosas', 'readwrite'); t.objectStore('cosas').put(v, k); t.oncomplete = si; });
  const blob = async (n) => (await fetch(base + n)).blob();
  await put('eps', ['ep7']);
  await put('ep:ep7', { nombre: 'Ep. 7 · ¿Es mejor saber la verdad o vivir feliz?', blob: await blob('episodio.webm') });
  await put('relleno', ['peli', 'musica']);
  await put('rel:peli', { tipo: 'archivo', nombre: 'Big Buck Bunny', artista: 'Película', esAudio: false, blob: await blob('pelicula.webm') });
  await put('rel:musica', { tipo: 'archivo', nombre: 'Carefree', artista: 'Kevin MacLeod', esAudio: true, blob: await blob('musica.webm') });
  localStorage.removeItem('fadori_tele_vistos'); localStorage.removeItem('fadori_tele_pos');
  const c = JSON.parse(localStorage.getItem('fadori_tele') || '{}'); c.porCorte = 3; c.cadaMin = 60; localStorage.setItem('fadori_tele', JSON.stringify(c));
}, PROD + '/fadori/medios-comercial/');
/* «Empezar» pide pantalla completa; el Chromium sin pantalla la hace de 800×600 y la tele se graba encogida */
await tv.context().addInitScript(() => { Element.prototype.requestFullscreen = function(){ return Promise.resolve(); }; });
/* el reloj de la tele usa `new Date()`, y la mesa sólo adelanta `Date.now()`: sin esto marca la hora real */
await tv.context().addInitScript(() => { const D = Date; class Recreo extends D { constructor(...a){ a.length ? super(...a) : super(D.now()); } static now(){ return D.now(); } } window.Date = Recreo; });
await lento(tv.context(), K);
await tv.reload(); await tv.waitForTimeout(2500 * K);
await tv.click('#bArranque').catch(() => {}); await tv.waitForTimeout(4000 * K);
/* con cámara lenta corren 5 minutos reales por cada uno del video: el reloj brincaba de 10:13 a 10:17 entre tomas */
await tv.evaluate(() => { const r = document.querySelector('#reloj'); const fijo = () => { if(r.textContent !== '10:12 a.m.') r.textContent = '10:12 a.m.'; }; fijo(); new MutationObserver(fijo).observe(r, { childList: true, characterData: true, subtree: true }); });

const parte = async (nombre, hacer, seg) => {
  const rec = await grabar(tv, { escala: 1 });
  await hacer(); await tv.waitForTimeout(seg * 1000 * K);
  const n = await rec.parar(path.join(REC, 'tv-' + nombre), 60, K);
  console.log('✓ tv-' + nombre + ':', n, 'cuadros');
};
const P = (f, ...a) => tv.evaluate(f, a);

await parte('episodio', async () => { setTimeout(() => listo(1), 3500 * K); }, 11);
await parte('pelicula', () => P(() => TELE.Programa.poner(TELE.Programa.rell.find(r => r.id === 'peli'), 3)), 9);
await tomar(2);
await parte('musica', async () => { await P(() => TELE.Programa.poner(TELE.Programa.rell.find(r => r.id === 'musica'), 20)); setTimeout(() => listo(2), 3000 * K); }, 9);
await parte('tanda', async () => { P(() => TELE.Programa.corte()); }, 26);

/* el partido en vivo: lo transmite la cooperativa desde el mostrador */
const vivo = (activa) => most.evaluate(async ([api, casa, url, activa]) => {
  const e = { activa, fuente: { tipo: 'enlace', url, emisor: '' }, voz: { activa: false, emisor: '' },
    marcador: { visible: true, deporte: 'Fútbol', periodo: '2T', local: { nombre: '3.1', color: '#E8590C', puntos: 2 }, visita: { nombre: '2B', color: '#2563EB', puntos: 1 },
      reloj: { corriendo: false, base: (34 * 60 + 12) * 1000, desde: 0 } },   /* parado: con cámara lenta el reloj de la fecha correría 5 veces más rápido */
    llaves: { visible: false, titulo: 'Copa Rembrandt', rondas: [] }, v: Date.now() };
  return (await fetch(api + '/api/transmision?casa=' + casa, { method: 'POST', headers: { 'content-type': 'application/json', 'x-fadori-admin': FADORI.llaveMostrador(), 'x-fadori-aparato': localStorage.getItem('fadori_aparato') }, body: JSON.stringify({ estado: e }) })).status;
}, ['https://fadori.palomazi9111.workers.dev', M.CASA, PROD + '/fadori/medios-comercial/partido.webm', activa]);
await tomar(3);
await parte('vivo', async () => { console.log('  transmisión', await vivo(true)); setTimeout(() => listo(3), 6000 * K); }, 13);
await vivo(false);
await M.cerrar();
