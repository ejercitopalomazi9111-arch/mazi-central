#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   IMPRESORAS DE MENTIRAS · `node tienda/nucleo/pruebas-impresoras.mjs`
   ──────────────────────────────────────────────────────────────────────────
   No hay impresoras en el contenedor, así que se fabrican: una USB y una
   Bluetooth falsas dentro del navegador (guardan lo que reciben), una Epson
   de red simulada, y el PUENTE DE VERDAD con una impresora de red de mentiras
   (un servidor TCP). Se configura cada una desde la pantalla, se imprime la
   prueba y se revisa lo que llegó, byte por byte. Luego una venta real con
   «imprimir solo» y cajón.
   Lo que esto NO prueba: que una Epson de carne y hueso entienda. Eso es
   «Imprimir prueba» con el aparato enfrente.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer as http } from 'node:http';
import { createServer as tcp } from 'node:net';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { crearPuente } from '../puente/puente.mjs';

const TIENDA = join(dirname(new URL(import.meta.url).pathname), '..');
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join(' ');

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const web = http((req, res) => { const r = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(r)] || 'application/octet-stream' }).end(readFileSync(r)); }catch{ res.writeHead(404).end(); } }).listen(0);
const recibidoRed = [];
const impresoraRed = tcp((s) => { const t = []; s.on('data', (d) => t.push(d)); s.on('end', () => recibidoRed.push(Buffer.concat(t))); }).listen(0, '127.0.0.1');
const puente = crearPuente().listen(0, '127.0.0.1');
await Promise.all([web, impresoraRed, puente].map((x) => new Promise((r) => x.listening ? r() : x.once('listening', r))));
const BASE = `http://localhost:${web.address().port}/index.html`;
const api = await request.newContext({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1024, height: 900 }, serviceWorkers: 'block' });
await ctx.routeWebSocket(/^wss:\/\//, () => {});
await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch{ await r.abort(); } });
const epson = [];
await ctx.route(/\/cgi-bin\/epos\/service\.cgi/, async (r) => { epson.push(r.request().postData()); await r.fulfill({ contentType: 'text/xml', body: '<response success="true" code=""/>' }); });

// Los aparatos falsos: se instalan antes de que cargue la app.
await ctx.addInitScript(() => {
  sessionStorage.setItem('tienda-presentacion', '1');
  window.__usb = []; window.__ble = []; window.__impresiones = 0;
  window.print = () => { window.__impresiones++; setTimeout(() => dispatchEvent(new Event('afterprint')), 50); };
  const dispositivo = { productName: 'TM-T20III (de mentiras)', opened: false, configuration: null,
    async open(){ this.opened = true; }, async selectConfiguration(){ this.configuration = { interfaces: [{ interfaceNumber: 0, alternates: [{ alternateSetting: 0, interfaceClass: 7, endpoints: [{ direction: 'in', type: 'bulk', endpointNumber: 2 }, { direction: 'out', type: 'bulk', endpointNumber: 1 }] }] }] }; },
    async claimInterface(){}, async transferOut(ep, datos){ window.__usb.push(...new Uint8Array(datos.buffer ?? datos, datos.byteOffset ?? 0, datos.byteLength ?? datos.length)); return { status: 'ok' }; } };
  Object.defineProperty(navigator, 'usb', { value: { requestDevice: async () => dispositivo, getDevices: async () => dispositivo.opened ? [dispositivo] : [] } });
  const car = { properties: { writeWithoutResponse: true }, async writeValueWithoutResponse(v){ window.__ble.push(...new Uint8Array(v)); window.__paquetes = Math.max(window.__paquetes || 0, v.length); } };
  const ble = { name: 'MTP-II (de mentiras)', addEventListener(){}, gatt: { async connect(){ return { async getPrimaryService(u){ if(u.startsWith('000018f0')) return { async getCharacteristics(){ return [car]; } }; throw new Error('no'); } }; } } };
  Object.defineProperty(navigator, 'bluetooth', { value: { requestDevice: async () => ble } });
});
const p = await ctx.newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if(m.type() === 'error') errores.push(m.text()); });
p.on('dialog', (d) => d.accept());
const listo = () => p.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 30000 });
const elegir = async (sel, v) => { await p.selectOption(sel, v); await p.waitForTimeout(150); };
const conexion = async (k) => { await p.click(`input[name=conexion][value=${k}]`, { force: true }); await p.waitForTimeout(150); };
const bytes = (k) => p.evaluate((k) => window[k].splice(0), k);

await p.goto(BASE + '#/v/impresora'); await listo(); await p.waitForTimeout(500);

console.log('\n· USB (Epson TM-T20)');
await elegir('#modelo', 'epson-tm-t20'); await conexion('usb');
await p.click('[data-conectar]'); await p.waitForTimeout(400);
ok('se conecta y dice cuál', (await p.$eval('#estado', (e) => e.textContent)).includes('de mentiras'));
await p.click('[data-prueba]'); await p.waitForTimeout(1200);
let b = await bytes('__usb');
ok('la prueba llega: ESC @, tabla PC850, texto y corte', hex(b).startsWith('1b 40 1b 74 02') && hex(b).includes('1d 56 42 00'), hex(b).slice(0, 40));
ok('los acentos van en PC850 (á = a0, ñ = a4)', b.includes(0xa0) && b.includes(0xa4));
ok('la regla mide 48 letras', hex(b).includes(hex(new TextEncoder().encode('1234567890'.repeat(5).slice(0, 48) + '\n'))));
await p.click('[data-cajon]'); await p.waitForTimeout(400);
ok('«Abrir cajón» manda ESC p 0 25 250', hex(await bytes('__usb')).includes('1b 70 00 19 fa'));
await p.click('summary:has-text("Ajustes avanzados")'); await p.check('#modoImagen'); await p.waitForTimeout(150);
await p.click('[data-prueba]'); await p.waitForTimeout(2500);
b = await bytes('__usb');
ok('modo imagen: manda raster GS v 0 de 576 puntos (72 bytes por renglón)', hex(b).includes('1d 76 30 00 48 00'), hex(b).slice(0, 60));
await p.uncheck('#modoImagen');

console.log('\n· Bluetooth (58 mm)');
await elegir('#modelo', 'posmovil-58'); await conexion('bluetooth');
await p.click('[data-conectar]'); await p.waitForTimeout(400);
await p.click('[data-prueba]'); await p.waitForTimeout(1500);
b = await bytes('__ble');
ok('llega por Bluetooth en paquetes de 100 o menos', b.length > 200 && (await p.evaluate(() => window.__paquetes)) <= 100, `${b.length} bytes`);
ok('a 58 mm la regla mide 32', hex(b).includes(hex(new TextEncoder().encode('1234567890'.repeat(4).slice(0, 32) + '\n'))));
ok('sin corte (las portátiles no cortan)', !hex(b).includes('1d 56'));

console.log('\n· Star (dialecto propio)');
await elegir('#modelo', 'star-tsp650'); await conexion('usb');
await p.click('[data-prueba]'); await p.waitForTimeout(1200);
b = await bytes('__usb');
ok('Star: ESC GS t 4 y corte ESC d 3', hex(b).startsWith('1b 40 1b 1d 74 04') && hex(b).includes('1b 64 03'), hex(b).slice(0, 30));

console.log('\n· Red Epson (ePOS-Print)');
await elegir('#modelo', 'epson-tm-m30'); await conexion('epson');
await p.fill('#ip', '192.168.1.77'); await p.press('#ip', 'Tab'); await p.waitForTimeout(150);
await p.click('[data-prueba]'); await p.waitForTimeout(1200);
ok('manda el XML ePOS con los bytes en <command>', epson.length === 1 && /<command>1b401b7402/.test(epson[0]), (epson[0] || '').slice(0, 120));

console.log('\n· Puente local → impresora de red');
await elegir('#modelo', 'generica-80'); await conexion('puente');
await p.fill('#puenteUrl', `http://127.0.0.1:${puente.address().port}`); await p.press('#puenteUrl', 'Tab');
await p.fill('#destino', `127.0.0.1:${impresoraRed.address().port}`); await p.press('#destino', 'Tab'); await p.waitForTimeout(150);
await p.click('[data-conectar]'); await p.waitForTimeout(500);
ok('el puente contesta', (await p.$eval('#estado', (e) => e.textContent)).includes('Puente'));
await p.click('[data-prueba]'); await p.waitForTimeout(1500);
ok('la impresora de red recibe la prueba entera', recibidoRed.length === 1 && hex(recibidoRed[0]).startsWith('1b 40') && hex(recibidoRed[0]).includes('1d 56 42'), recibidoRed.length + '');

console.log('\n· Ventana de imprimir');
await elegir('#modelo', 'navegador');
await p.click('[data-prueba]'); await p.waitForTimeout(1500);
ok('abre la ventana de imprimir del sistema con el ticket dibujado', (await p.evaluate(() => window.__impresiones)) === 1);

console.log('\n· Una venta de verdad, con «imprimir solo» y cajón');
await elegir('#modelo', 'generica-80'); await conexion('usb');
await p.check('#automatico'); await p.check('#cajon'); await p.waitForTimeout(150);
await p.click('[data-conectar]'); await p.waitForTimeout(300); await bytes('__usb');
await p.goto(BASE + '#/v'); await listo(); await p.waitForTimeout(600);
if(await p.$('[data-abrir-caja]')){ await p.click('[data-abrir-caja] [type=submit]'); await p.waitForSelector('#pos-q', { timeout: 20000 }); }
await p.click('.pos-prod:not(.sin) >> nth=0'); await p.waitForTimeout(200);
await p.click('.pos-ticket [data-cobrar]'); await p.waitForSelector('dialog.hoja-cobro[open]');
await p.click('[data-recibi] >> nth=-1'); await p.click('[data-confirmar]');
await p.waitForSelector('.venta-hecha', { timeout: 20000 }); await p.waitForTimeout(1500);
b = await bytes('__usb');
const txt = new TextDecoder('latin1').decode(Uint8Array.from(b));
ok('se imprimió solo, con folio, total y cambio', /Ticket #\d+/.test(txt) && /TOTAL/.test(txt) && /Cambio/.test(txt), txt.slice(0, 200));
ok('y al final abrió el cajón (efectivo)', hex(b).endsWith('1b 70 00 19 fa'));
ok('trae el QR para volver a pedir', hex(b).includes('1d 28 6b'));

ok('cero errores de consola', !errores.length, errores.join(' | '));
await nav.close(); await api.dispose(); web.close(); impresoraRed.close(); puente.close();
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
