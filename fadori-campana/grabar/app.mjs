/* GRABA LA APP DE VERDAD para el comercial: un alumno abre Fadori (con su
   animación de entrada), recorre el menú, pide con el dedo y ve su turno
   ponerse en verde. Carlos, 15 de octubre: «las pantallas que muestras no son
   las de la app real».

   Se graba lo que pinta el navegador (Page.startScreencast) y luego se vuelve
   una secuencia fija de 30 cuadros por segundo. Un circulito marca dónde va
   el dedo, como en los videos de demostración.

   Correr (con el servidor de Fadori en local):
     LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori-campana/grabar/app.mjs
   Sale en fadori-campana/salida/rec/app/%05d.jpg (con TEMA=oscuro, en rec/app-oscuro/) */
process.env.ESCALA ||= '2';                                             /* a doble resolución, para un video 1080p */
const { abrirMesa, PROD } = await import('../../fadori/mesa-de-pruebas.mjs');
import { grabar, dedo, tocar, deslizar, mover, lento } from './comun.mjs';
const K = Number(process.env.LENTO || 5);                               /* cámara lenta: la página corre K veces más despacio */
import path from 'path';

const TEMA = process.env.TEMA || '';                                    /* TEMA=oscuro graba la misma demo en modo oscuro */
const SAL = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'salida', 'rec', TEMA ? 'app-' + TEMA : 'app');
const ZONA = 'America/Mexico_City';
const hoy = new Date(); hoy.setUTCHours(15, 42, 0, 0);                 /* 9:42 en México: el recreo es a las 10:00 */
const desfase = hoy.getTime() - Date.now();
const M = await abrirMesa('comercial');
const most = await M.mostrador({ desfase });

/* que haya fila: tres compañeros pidieron antes */
for(const [n, g, i] of [['Beto Ruiz', '2B', 4], ['Caro Silva', '1A', 6], ['Dani Mora', '3.2', 9]]){
  const pg = await M.aparato('/fadori/', { desfase }); await M.alumno(n, g, pg); await pg.reload(); await pg.waitForTimeout(1200);
  await pg.evaluate((i) => { const F = FADORI, d = F.productos(true).filter(p => p.disponible); F.pedir(F.yo().codigo, [{ prod: d[i % d.length].id, cant: 1 }], {}); }, i);
}

/* la alumna que sale en el video: su cuenta se hace antes de grabar */
const prev = await M.aparato('/fadori/', { desfase, escala: 2, zona: ZONA, tema: TEMA || 'claro' }); await M.alumno('Ana Pérez', '3.1', prev); await prev.waitForTimeout(2500);
await lento(prev.context(), K);
const ana = await prev.context().newPage();                              /* pestaña nueva = la animación de entrada sale otra vez */
await dedo(ana);
const rec = await grabar(ana);
await ana.goto(PROD + '/fadori/');
await ana.waitForTimeout(4200 * K);                                          /* la animación de entrada completa */
await mover(ana, 195, 600, K);
await deslizar(ana, 520, 1500); await ana.waitForTimeout(500 * K);
await deslizar(ana, 380, 1200); await ana.waitForTimeout(400 * K);
await tocar(ana, '#rejilla button[aria-label="Agregar Hamburguesa"]', K);
await ana.waitForTimeout(700 * K);
await deslizar(ana, 700, 1300); await ana.waitForTimeout(400 * K);
await tocar(ana, '#rejilla button[aria-label="Agregar Taco de arrachera"]', K).catch(() => tocar(ana, '#rejilla button[aria-label^="Agregar"] >> nth=6', K));
await ana.waitForTimeout(800 * K);
await tocar(ana, '#bPedir', K); await ana.waitForTimeout(1600 * K);
await tocar(ana, '#bConfirmar', K); await ana.waitForTimeout(3800 * K);
/* la cooperativa lo prepara */
const id = await ana.evaluate(() => { const F = FADORI, c = F.yo().codigo; return F.estado().pedidos.filter(p => p.alumno === c).pop().id; });
await M.tarda(most, (i) => !!FADORI.pedido(i), id, 10000 * K);
await most.evaluate((i) => { const F = FADORI; F.estado().pedidos.filter(p => p.estado === 'en_cola' && p.id !== i).forEach(p => { F.tomar(p.id, 'S'); F.marcarListo(p.id); F.entregar && F.entregar(p.id); }); F.tomar(i, 'S'); }, id);
await ana.waitForTimeout(2600 * K);
await most.evaluate((i) => FADORI.marcarListo(i), id);
await M.tarda(ana, (i) => FADORI.pedido(i) && FADORI.pedido(i).estado === 'listo', id, 12000 * K);
await ana.waitForTimeout(3500 * K);
const n = await rec.parar(SAL, 60, K);
console.log('✓ app:', n, 'cuadros a 60 por segundo →', path.relative(process.cwd(), SAL));
await M.cerrar();
