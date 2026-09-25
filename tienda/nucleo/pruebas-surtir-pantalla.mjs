#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   QUÉ SURTIR EN PANTALLA · `node tienda/nucleo/pruebas-surtir-pantalla.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Contra la base de demo (sólo LEE). El pedido sale con sus números, cambiar
   la cobertura lo recalcula, corregir una cantidad a 0 la saca del pedido y
   del mensaje, el WhatsApp lleva lo de esa marca, y el Excel se descarga.
   ANCHO=1280 para computadora.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

const TIENDA = join(dirname(fileURLToPath(import.meta.url)), '..');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!ruta.startsWith(TIENDA)){ res.writeHead(403).end(); return; }
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream' }).end(readFileSync(ruta)); }catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/index.html`;
const CAPTURA = process.env.CAPTURA;
const api = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } });
const b = await chromium.launch();
const ANCHO = Number(process.env.ANCHO || 390);
const ctx = await b.newContext({ viewport: { width: ANCHO, height: ANCHO > 500 ? 800 : 844 }, serviceWorkers: 'block' });
await ctx.routeWebSocket(/^wss:\/\//, () => {});
await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch(e){ await r.abort(); } });
await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
const p = await ctx.newPage();
const errores = []; p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if(m.type() === 'error') errores.push(m.text()); });
p.on('dialog', (d) => d.accept());
const listo = () => p.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 30000 });
await p.goto(BASE + '#/'); await listo();
const espia = () => { window.__abiertas = []; window.open = (u) => { window.__abiertas.push(u); return null; }; };
await p.addInitScript(espia); await p.evaluate(espia);   // la página ya está cargada: los cambios de # no recargan
await p.evaluate(async () => { const d = await import('./nucleo/datos.js'); await d.verComo('admin'); sessionStorage.removeItem(Object.keys(sessionStorage).find((k) => k.startsWith('tienda-surtir')) || 'x'); });
await p.goto(BASE + '#/a/surtir'); await listo(); await p.waitForTimeout(300);
console.log(`\n· Qué surtir a ${ANCHO} px`);
const cifra = async (i) => Number((await p.$$eval('.cifras .valor', (l) => l.map((x) => x.textContent)))[i]);
const productos = await cifra(0), piezas = await cifra(1);
ok('hay un pedido con productos y piezas (la demo tiene productos bajo el mínimo)', productos > 0 && piezas >= productos, `${productos} / ${piezas}`);
const primero = await p.$eval('.surtir-fila', (e) => ({ texto: e.innerText, id: e.querySelector('[data-cant]').dataset.cant, pedir: Number(e.querySelector('[data-cant]').value) }));
ok('cada renglón dice por qué, con números', /mínimo|por semana/.test(primero.texto) && /\d/.test(primero.texto), primero.texto);
ok('y la etiqueta de qué le pasa', /Agotado y se vende|Se va a acabar|Bajo el mínimo/.test(primero.texto));
if(CAPTURA) await p.screenshot({ path: join(CAPTURA, `s-plan-${ANCHO}.png`) });
// Corregir a 0 lo saca
await p.fill(`[data-cant="${primero.id}"]`, '0'); await p.press(`[data-cant="${primero.id}"]`, 'Tab'); await p.waitForTimeout(200);
ok('poner 0 lo tacha y resta sus piezas del total', await p.$eval(`[data-cant="${primero.id}"]`, (i) => i.closest('.surtir-fila').classList.contains('fuera')) && await cifra(1) === piezas - primero.pedir, `${await cifra(1)} vs ${piezas - primero.pedir}`);
// El WhatsApp de esa marca ya no lo lleva
const marca = await p.$eval(`[data-cant="${primero.id}"]`, (i) => i.closest('.surtir-marca').querySelector('h2').textContent);
await p.$eval(`[data-cant="${primero.id}"]`, (i) => i.closest('.surtir-marca').querySelector('[data-mandar]')?.click());
await p.waitForTimeout(150);
const url = (await p.evaluate(() => window.__abiertas))[0] || '';
const texto = decodeURIComponent(url.split('text=')[1] || '');
const nombre = primero.texto.split('\n')[0];
const apagado = await p.$eval(`[data-cant="${primero.id}"]`, (i) => i.closest('.surtir-marca').querySelector('[data-mandar]').disabled);
ok(apagado ? 'la marca se quedó sin nada que pedir: su botón se apaga y no abre WhatsApp' : 'el WhatsApp lleva la marca y NO lo que se puso en 0',
  apagado ? url === '' : url.startsWith('https://wa.me/?text=') && texto.includes(marca) && !texto.includes(`× ${nombre}`), texto.slice(0, 160));
// Lo corregido sobrevive a salir y volver
await p.goto(BASE + '#/a'); await listo(); await p.goto(BASE + '#/a/surtir'); await listo(); await p.waitForTimeout(200);
ok('lo corregido sobrevive a salir y volver', await p.$eval(`[data-cant="${primero.id}"]`, (i) => i.value) === '0');
// Cobertura
const antes = await cifra(1);
await p.click('[data-cobertura="60"]'); await p.waitForTimeout(250);
const despues = await cifra(1);
ok('pedir para 2 meses nunca pide menos que para 1', despues >= antes, `${antes} → ${despues}`);
ok('y el botón elegido queda marcado', await p.$eval('[data-cobertura="60"]', (b) => b.getAttribute('aria-pressed')) === 'true');
// Excel
const [descarga] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('[data-csv]')]);
const csv = descarga ? await (await import('node:fs/promises')).readFile(await descarga.path(), 'utf8') : '';
ok('el Excel se descarga con encabezados y sin lo puesto en 0', /^﻿?Marca,Producto,Clave/.test(csv) && !csv.includes(`,${nombre},`) && csv.split('\n').length > 1, csv.slice(0, 80));
// Desde el tablero se llega
await p.goto(BASE + '#/a'); await listo(); await p.waitForTimeout(300);
ok('ninguna liga del tablero lleva a una ruta que no existe', !(await p.$$eval('a[href]', (l) => l.some((a) => /#\/a\/surtir/.test(a.href) && !a.textContent.trim()))));
await p.goto(BASE + '#/a/surtir'); await listo();
ok('nada se sale a lo ancho', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
const chicos = await p.$$eval('.pedir input, [data-mandar], [data-cobertura]', (l) => l.filter((x) => x.getBoundingClientRect().height < 44).length);
ok('los controles miden al menos 44 px', chicos === 0, chicos);
await p.evaluate(() => sessionStorage.clear());
ok('cero errores de consola', !errores.length, errores.join(' | '));
console.log(`\n${bien} pasan · ${mal} fallan\n`);
await b.close(); await api.dispose(); servidor.close();
process.exit(mal ? 1 : 0);
