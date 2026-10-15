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
import { grabar, dedo, tocar, deslizar } from './comun.mjs';
import path from 'path';

const TEMA = process.env.TEMA || '';                                    /* TEMA=oscuro graba la misma demo en modo oscuro */
const SAL = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'salida', 'rec', TEMA ? 'app-' + TEMA : 'app');
const ZONA = 'America/Mexico_City';
const hoy = new Date(); hoy.setUTCHours(16, 12, 0, 0);                 /* 10:12 en México */
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
const ana = await prev.context().newPage();                              /* pestaña nueva = la animación de entrada sale otra vez */
await dedo(ana);
const rec = await grabar(ana);
await ana.goto(PROD + '/fadori/');
await ana.waitForTimeout(4200);                                          /* la animación de entrada completa */
await ana.mouse.move(195, 600);
await deslizar(ana, 520, 1500); await ana.waitForTimeout(500);
await deslizar(ana, 380, 1200); await ana.waitForTimeout(400);
await tocar(ana, '#rejilla button[aria-label="Agregar Hamburguesa"]');
await ana.waitForTimeout(700);
await deslizar(ana, 700, 1300); await ana.waitForTimeout(400);
await tocar(ana, '#rejilla button[aria-label="Agregar Taco de arrachera"]').catch(() => tocar(ana, '#rejilla button[aria-label^="Agregar"] >> nth=6'));
await ana.waitForTimeout(800);
await tocar(ana, '#bPedir'); await ana.waitForTimeout(1600);
await tocar(ana, '#bConfirmar'); await ana.waitForTimeout(3800);
/* la cooperativa lo prepara */
const id = await ana.evaluate(() => { const F = FADORI, c = F.yo().codigo; return F.estado().pedidos.filter(p => p.alumno === c).pop().id; });
await M.tarda(most, (i) => !!FADORI.pedido(i), id, 10000);
await most.evaluate((i) => { const F = FADORI; F.estado().pedidos.filter(p => p.estado === 'en_cola' && p.id !== i).forEach(p => { F.tomar(p.id, 'S'); F.marcarListo(p.id); F.entregar && F.entregar(p.id); }); F.tomar(i, 'S'); }, id);
await ana.waitForTimeout(2600);
await most.evaluate((i) => FADORI.marcarListo(i), id);
await M.tarda(ana, (i) => FADORI.pedido(i) && FADORI.pedido(i).estado === 'listo', id, 12000);
await ana.waitForTimeout(3500);
const n = await rec.parar(SAL);
console.log('✓ app:', n, 'cuadros a 30 por segundo →', path.relative(process.cwd(), SAL));
await M.cerrar();
