#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · EL MENÚ DE VERDAD LLEGA A TODOS
   «Ese es el menú de la cafetería, te encargo que todo quede al 100» (Carlos,
   9 de octubre). Lo que tiene que pasar el día que se publica:

     la tablet tiene el menú inventado (pozole, chilaquiles…) y el servidor
     también → la señora pone su pasador → el servidor ya tiene el menú real,
     el inventado queda retirado, y un alumno pide una banderilla sin que el
     servidor le diga «ese platillo no existe».

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-menu.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, aparato, tarda, alumno, cerrar, CASA } = await abrirMesa('menu');
const API = process.env.API_LOCAL || 'https://fadori.palomazi9111.workers.dev';
const api = async (ruta, cuerpo, h) => { const r = await fetch(`${API}${ruta}?casa=${CASA}`, { method: cuerpo ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...h }, body: cuerpo ? JSON.stringify(cuerpo) : undefined }); return { status: r.status, j: await r.json().catch(() => null) }; };

/* el estado de antes: el menú inventado, en el servidor y en la tablet */
const VIEJOS = [
  { id: 'pb-guisado-del-dia-con-arroz', nombre: 'Guisado del día con arroz', cat: 'fuerte', precio: 4500, segPrep: 95, disponible: true, destacado: true, orden: 0, foto: 'fotos/guisado.jpg', t: 1000 },
  { id: 'pb-pozole', nombre: 'Pozole', cat: 'fuerte', precio: 5000, segPrep: 80, disponible: true, orden: 1, foto: 'fotos/pozole.jpg', t: 1000 },
  { id: 'pb-torta-de-milanesa', nombre: 'Torta de milanesa', cat: 'torta', precio: 3800, segPrep: 60, disponible: true, orden: 2, foto: 'fotos/torta-milanesa.jpg', t: 1000 },
];
const AP = 'a'.repeat(32);
const llave = (await api('/api/entrar', { pasador: '1234' }, { 'x-fadori-aparato': AP })).j.token;
await api('/api/sync', { desde: 0, cambios: { productos: VIEJOS } }, { 'x-fadori-aparato': AP, 'x-fadori-admin': llave });
await api('/api/salir', {}, { 'x-fadori-aparato': AP, 'x-fadori-admin': llave });

console.log('\n1 · la tablet con el menú viejo pone su pasador');
const m = await aparato('/fadori/mostrador', { w: 1100, h: 800 });
await m.evaluate((viejos) => {
  const d = JSON.parse(localStorage.getItem('fadori_v1'));
  d.version = 5; d.productos = viejos.map(p => Object.assign({ desc: '', alergenos: [], dias: [], existencias: null }, p));
  localStorage.setItem('fadori_v1', JSON.stringify(d));
  for(const k of Object.keys(localStorage)) if(/^fadori_menu_subido/.test(k) || k === 'fadori_pendientes') localStorage.removeItem(k);
  localStorage.setItem('fadori_menu_subido2:' + FADORI.sync.casa(), '1');   /* ya había subido el viejo */
}, VIEJOS);
await m.reload();
await m.waitForFunction(() => window.FADORI && FADORI.estadoSync().modo === 'enlinea', null, { timeout: 20000 }).catch(() => {});
ok('la tablet migra sola: ya no enseña el pozole', await m.evaluate(() => !FADORI.productos(false).some(p => p.id === 'pb-pozole')));
await m.fill('#rPase', '1234'); await m.click('#rEntrar');
await m.waitForFunction(() => FADORI.llaveMostrador(), null, { timeout: 10000 }).catch(() => {});

const t0 = Date.now();
let srv = null;
while(Date.now() - t0 < 15000){
  srv = (await api('/api/sync', { desde: 0, cambios: {} }, { 'x-fadori-aparato': 'b'.repeat(32) })).j;
  const ps = (srv && srv.cambios && srv.cambios.productos) || [];
  if(ps.some(p => p.id === 'pb-banderilla')) break;
  await new Promise(s => setTimeout(s, 400));
}
const ps = (srv && srv.cambios && srv.cambios.productos) || [];
const de = id => ps.find(p => p.id === id);
ok('el servidor ya tiene el menú real (banderilla)', !!de('pb-banderilla'));
ok(`con sus ${ps.filter(p => !p.borrado).length} platillos`, ps.filter(p => !p.borrado).length >= 45);
ok('el pozole quedó retirado en el servidor', de('pb-pozole') && de('pb-pozole').borrado === true && de('pb-pozole').disponible === false);
ok('la torta de milanesa ya cuesta $50', de('pb-torta-de-milanesa') && de('pb-torta-de-milanesa').precio === 5000);

console.log('\n2 · un alumno nuevo ve el menú real y pide');
const a = await alumno('Ana P', '3B');
await a.reload(); await a.waitForFunction(() => window.FADORI && FADORI.estadoSync().modo === 'enlinea', null, { timeout: 20000 }).catch(() => {});
await tarda(a, () => FADORI.productos(true).some(p => p.id === 'pb-banderilla'));
const menu = await a.evaluate(() => FADORI.productos(true).map(p => p.nombre));
ok('en su menú está la banderilla y los Takis', menu.includes('Banderilla') && menu.includes('Takis Fuego'));
ok('y NO el pozole ni el guisado', !menu.includes('Pozole') && !menu.includes('Guisado del día con arroz'));
const tarjetas = await a.evaluate(() => document.querySelectorAll('[data-ver]').length);
ok('la pantalla del menú pinta los platillos', tarjetas >= 40, String(tarjetas));
const idP = await a.evaluate(() => { const F = FADORI; return F.pedir(F.yo().codigo, [{ prod: 'pb-banderilla', cant: 1 }, { prod: 'pb-takis-fuego', cant: 1 }], {}).id; });
const turno = await tarda(a, id => { const p = FADORI.pedido(id); return p && p.turno; }, idP);
ok('el servidor acepta el pedido de banderilla + Takis y le da turno', turno !== null);
ok('y le cobra lo que dice el menú ($70)', await a.evaluate(id => FADORI.pedido(id).total, idP) === 7000);
await tarda(m, id => !!FADORI.pedido(id), idP);
ok('a la tablet le llega con el nombre del platillo', await m.evaluate(id => { const p = FADORI.pedido(id); return !!p && FADORI.producto(p.renglones[0].prod).nombre === 'Banderilla'; }, idP));

console.log('\n3 · borrar un platillo en la tablet se queda borrado');
await m.evaluate(() => FADORI.borrarProducto('pb-peelers'));
await tarda(a, () => !FADORI.productos(true).some(p => p.id === 'pb-peelers'));
ok('al alumno se le quita del menú', await a.evaluate(() => !FADORI.productos(true).some(p => p.id === 'pb-peelers')));
await m.reload(); await m.waitForTimeout(3500);
ok('y en la tablet no regresa al recargar', await m.evaluate(() => !FADORI.productos(false).some(p => p.id === 'pb-peelers')));

console.log('\n4 · la foto de verdad que sube Carlos desde el mostrador');
await m.click('[data-vista="menu"]').catch(() => {});
await m.waitForTimeout(500);
const abierto = await m.evaluate(() => { const b = document.querySelector('[data-editar="pb-banderilla"]'); if(b){ b.click(); return true; } return false; });
let foto = null;
if(abierto){
  await m.waitForSelector('#hFoto', { timeout: 5000 });
  /* una foto de teléfono, rectangular y grande */
  const png = await m.evaluate(() => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 1600, 1200); g.fillStyle = '#ff0'; g.fillRect(500, 300, 600, 600); return c.toDataURL('image/png').split(',')[1]; });
  await m.setInputFiles('#hFoto', { name: 'banderilla.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await m.waitForFunction(() => !document.querySelector('#hGuardar').disabled && document.querySelector('#hVista img'), null, { timeout: 8000 });
  await m.click('#hGuardar');
  foto = await m.evaluate(() => FADORI.producto('pb-banderilla').foto);
}
ok('el mostrador tiene botón para editar la banderilla y subirle foto', abierto);
const lado = foto && await m.evaluate(async (src) => { const im = new Image(); im.src = src; await im.decode(); return [im.width, im.height]; }, foto);
ok('la foto se guarda cuadrada y a 480 px', !!lado && lado[0] === 480 && lado[1] === 480, JSON.stringify(lado));
await tarda(a, () => /^data:image/.test((FADORI.producto('pb-banderilla') || {}).foto || ''));
ok('al alumno le llega la foto nueva', await a.evaluate(() => /^data:image/.test(FADORI.producto('pb-banderilla').foto)));
ok('y el menú del alumno la enseña', await a.evaluate(() => { const b = document.querySelector('[data-sumar="pb-banderilla"] img'); return !!b && /^data:image/.test(b.getAttribute('src')); }));

for(const [n, pg] of [['tablet', m], ['alumno', a]]) ok('sin errores en ' + n, !pg.errores.length, pg.errores.join(' | '));
await cerrar();
console.log(`\n${fallas.length ? '✗' : '✓'} menú · ${fallas.length} fallas`);
process.exit(fallas.length ? 1 : 0);
