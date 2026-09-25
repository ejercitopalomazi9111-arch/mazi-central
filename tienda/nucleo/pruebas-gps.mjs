#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   GPS Y RUTAS, DE PUNTA A PUNTA · `node tienda/nucleo/pruebas-gps.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Tres teléfonos contra la base de demo, cada uno con su sesión: el cliente
   pide, el dueño asigna, el repartidor sale a repartir con el GPS simulado.
   Comprueba la cadena entera, que es donde se rompe —cada pieza ya tenía su
   prueba y nadie había visto el punto llegar del teléfono del repartidor a la
   pantalla del dueño—:
     · el rastreo manda puntos y el dueño los ve, con velocidad;
     · un hueco de señal NO apaga el rastreo: al volver la red, sigue;
     · la ruta sale ordenada y las ligas de Google Maps respetan el límite;
     · el cliente ve en cuánto llega su pedido.
   Al final cancela lo que pidió, para no dejar basura en la demo.
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
const api = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } });
const b = await chromium.launch();
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

// Querétaro: la tienda y cuatro entregas en línea hacia el poniente, ~1 km
// entre cada una. Se piden REVUELTAS (3, 1, 4, 2) para que la ruta tenga que
// ordenarlas: saliendo de la tienda, lo corto es 1-2-3-4.
const TIENDA_XY = { latitude: 20.5888, longitude: -100.3899 };
const OESTE = [1, 2, 3, 4].map((k) => ({ k, lat: 20.5888, lng: +(-100.3899 - 0.0097 * k).toFixed(6) }));
const PEDIR = [OESTE[2], OESTE[0], OESTE[3], OESTE[1]];

async function telefono(nombre){
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', geolocation: TIENDA_XY, permissions: ['geolocation'] });
  await ctx.routeWebSocket(/^wss:\/\//, () => {});
  await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch(e){ await r.abort(); } });
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ contentType: 'image/png', body: PIXEL }));
  await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
  const p = await ctx.newPage();
  p.errores = [];
  p.on('pageerror', (e) => p.errores.push(`${nombre}: ${e.message}`));
  p.on('console', (m) => { if(m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) p.errores.push(`${nombre}: ${m.text()}`); });
  p.on('dialog', (d) => d.accept());
  p.listo = () => p.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 30000 });
  p.ir = async (ruta) => { await p.goto(BASE + '#' + ruta); await p.listo(); };
  p.datos = (f, arg) => p.evaluate(async ([cuerpo, a]) => { const d = await import('./nucleo/datos.js'); return (0, eval)(cuerpo)(d, a); }, [f.toString(), arg]);
  return { ctx, p };
}
const rastreo = (p) => p.$eval('[data-rastreo]', (e) => e.className.replace('rastreo', '').trim());
const esperarRastreo = (p, estado, ms = 25000) => p.waitForFunction((e) => document.querySelector('[data-rastreo]')?.classList.contains(e), estado, { timeout: ms }).then(() => true, () => false);

const C = await telefono('cliente'), A = await telefono('dueño'), R = await telefono('repartidor');
const hechos = [];
try{
  console.log('\n· Preparar: el repartidor con turno, el cliente pide, el dueño asigna');
  await R.p.ir('/');
  const rep = await R.p.datos((d) => d.verComo('repartidor'));
  await A.p.ir('/'); await A.p.datos((d) => d.verComo('admin'));
  await R.p.ir('/r');
  if(await R.p.$('[data-abrir-turno]')){ await R.p.click('[data-abrir-turno]'); await R.p.waitForTimeout(2500); await R.p.listo(); }
  ok('el repartidor de demo tiene su turno abierto', !!(await R.p.datos((d) => d.miTurno())));

  await C.p.ir('/');
  const producto = await C.p.datos(async (d) => (await d.catalogo()).productos.find((x) => !x.x && x.q >= 8)?.id);
  for(const [i, x] of PEDIR.entries()){
    const v = await C.p.datos((d, a) => d.pedirTienda({ renglones: [{ id: a.producto, cantidad: 1 }], nombre: 'Prueba GPS', telefono: '4425550888',
      direccion: { calle: `Poniente ${a.x.k}`, colonia: 'Prueba', cp: '', referencias: '', lat: a.x.lat, lng: a.x.lng, envio: 0 }, pago: { forma: 'efectivo' },
      momento: 'al_recibir', notas: 'prueba automática de GPS: se cancela sola' + (a.x.k === 1 ? ' · Para: hoy en la tarde' : '') }), { producto, x });
    hechos.push({ ...x, id: v.id || v.pedido_id || v.pedido, folio: v.folio });
  }
  ok('el cliente pidió 4 entregas, cada una con su ubicación', hechos.length === 4 && hechos.every((h) => h.id), JSON.stringify(hechos.map((h) => h.folio)));
  for(const h of hechos){
    await A.p.datos((d, a) => d.asignarRepartidor(a.id, a.rep), { id: h.id, rep: rep.id });
    await A.p.datos((d, a) => d.cambiarEstado(a, 'preparando'), h.id);
  }

  console.log('\n· El GPS del repartidor llega a la pantalla del dueño');
  await R.p.ir('/r');
  ok('al abrir su pantalla, el teléfono empieza a compartir', await esperarRastreo(R.p, 'compartiendo'), await rastreo(R.p));
  const ultimoDelTel = () => R.p.evaluate(async () => (await import('./nucleo/rastreo.js')).rastreo.ultimo);
  await R.p.waitForTimeout(11000);                        // la velocidad se calcula con 10 s o más entre puntos
  const antes = await ultimoDelTel();
  await R.ctx.setGeolocation({ latitude: 20.5888, longitude: -100.3899 - 0.0015 });   // ~156 m
  await R.p.waitForFunction((c) => import('./nucleo/rastreo.js').then((m) => m.rastreo.ultimo?.cuando !== c), antes?.cuando, { timeout: 10000 }).catch(() => {});
  await R.p.waitForTimeout(1500);
  const despues = await ultimoDelTel();
  await A.p.ir('/a/repartidores'); await A.p.waitForTimeout(1500);
  const fila = await A.p.$$eval('#gente .rep-fila', (l) => l.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  const suya = fila.find((t) => /última señal (hace un momento|hace \d+ s)/.test(t)) || '';
  ok('el dueño lo ve con señal de hace segundos (nunca «hace -1 s»)', !!suya && !/hace -/.test(fila.join()), fila.join(' | '));
  // Lo que debió salir: la distancia entre los dos puntos del teléfono entre
  // el tiempo que pasó según el GPS (el primero pudo salir antes, al preparar).
  const { distancia } = await import('./ruta.js');
  const esperada = antes && despues ? distancia(antes, despues) * 1000 / ((despues.cuando - antes.cuando) / 1000) * 3.6 : NaN;
  const vel = Number((suya.match(/(\d+) km\/h/) || [])[1]);
  ok(`y con su velocidad bien calculada (${vel} km/h; ${antes && despues ? Math.round(distancia(antes, despues) * 1000) : '?'} m en ${antes && despues ? Math.round((despues.cuando - antes.cuando) / 1000) : '?'} s = ${esperada.toFixed(0)})`, vel > 0 && Math.abs(vel - esperada) <= 1.5, suya);
  ok('en el mapa del dueño salen el repartidor y sus destinos', await A.p.$$eval('.pin-mapa.rep', (l) => l.length) >= 1 && await A.p.$$eval('.pin-mapa.destino', (l) => l.length) >= 4);

  console.log('\n· Un hueco de señal no apaga el rastreo');
  await R.ctx.route(/\/rest\/v1\/ubicaciones/, (r) => r.abort('internetdisconnected'));
  await R.ctx.setGeolocation({ latitude: 20.5888, longitude: -100.3899 - 0.0035 });
  ok('sin red dice que se manda al volver, NO que el turno se cerró', await esperarRastreo(R.p, 'sin-red', 10000), await rastreo(R.p));
  await R.ctx.unroute(/\/rest\/v1\/ubicaciones/);
  ok('al volver la red, sigue compartiendo solo (reintento a los 15 s)', await esperarRastreo(R.p, 'compartiendo', 25000), await rastreo(R.p));
  const ultimo = await A.p.datos(async (d) => { const g = await d.repartidoresEnTurno(); return g.map((x) => x.puntos[0]).filter(Boolean).sort((a, b) => new Date(b.cuando) - new Date(a.cuando))[0]; });
  ok('y el punto que se había atorado llegó a la base', ultimo && Math.abs(ultimo.lng - (-100.3899 - 0.0035)) < 1e-4, JSON.stringify(ultimo));

  const juicio = await R.p.evaluate(async () => { const { esRechazo } = await import('./nucleo/rastreo.js');
    return [esRechazo({ causa: { code: '42501', message: 'new row violates row-level security policy for table "ubicaciones"' } }),
      esRechazo({ causa: { code: '', message: 'TypeError: Failed to fetch' } }), esRechazo(new TypeError('Failed to fetch'))]; });
  ok('pero si la BASE dice que no (turno cerrado), sí se apaga: eso no es un hueco de señal', juicio.join() === 'true,false,false', juicio.join());

  console.log('\n· La ruta del repartidor');
  await R.ctx.setGeolocation(TIENDA_XY); await R.p.waitForTimeout(1500);
  await R.p.ir('/r/ruta'); await R.p.waitForSelector('#ruta-lista li', { timeout: 20000 }); await R.p.waitForTimeout(1500);
  const orden = await R.p.$$eval('#ruta-lista a', (l) => l.map((a) => a.getAttribute('href').split('/').pop()));
  const pos = hechos.map((h) => ({ k: h.k, i: orden.indexOf(h.id) })).sort((a, b) => a.k - b.k);
  ok('las 4 entregas salen en la ruta', pos.every((x) => x.i >= 0), JSON.stringify(pos));
  // La 1 es la más cercana, pero la pidieron «para la tarde»: va después de las urgentes.
  const urg = pos.filter((x) => x.k !== 1), tarde = pos.find((x) => x.k === 1);
  ok('pedidas revueltas (3, 1, 4, 2), las urgentes salen en el orden que recorre menos (2, 3, 4)', urg.every((x, j) => !j || x.i > urg[j - 1].i), JSON.stringify(pos));
  ok('y la de «hoy en la tarde» va después, aunque sea la más cercana, con su letrero', tarde.i > Math.max(...urg.map((x) => x.i))
    && /En la tarde/.test(await R.p.$eval(`#ruta-lista a[href$="${hechos.find((h) => h.k === 1).id}"]`, (a) => a.textContent)), JSON.stringify(pos));
  const ligas = await R.p.$$eval('[data-tramo]', (l) => l.map((a) => a.href));
  const conLugar = await R.p.$$eval('.pin-mapa:not(.yo)', (l) => l.length);
  const intermedias = ligas.map((u) => (new URL(u).searchParams.get('waypoints') || '').split('|').filter(Boolean).length);
  ok(`Google Maps va en ${ligas.length} tramo(s) para ${conLugar} paradas, ninguno con más de 3 intermedias`, ligas.length === Math.ceil(conLugar / 4) && intermedias.every((n) => n <= 3), JSON.stringify(intermedias));
  ok('el primer tramo sale de donde está el repartidor', new URL(ligas[0]).searchParams.get('origin') === `${TIENDA_XY.latitude},${TIENDA_XY.longitude}`);
  ok('el mapa pinta una línea con la ruta', !!(await R.p.$('#mapa path.leaflet-interactive, #mapa .leaflet-overlay-pane path')));
  ok('nada se sale a lo ancho', await R.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok('las cifras de la ruta se leen completas (nada cortado en «9.7 …»)', await R.p.$$eval('.ruta-cabeza .valor', (l) => l.length === 3 && l.every((e) => e.scrollWidth <= e.clientWidth + 1)), await R.p.$$eval('.ruta-cabeza .valor', (l) => l.map((e) => `${e.textContent}:${e.scrollWidth}/${e.clientWidth}`).join(' ')));
  if(process.env.CAPTURA) await R.p.screenshot({ path: join(process.env.CAPTURA, 'gps-ruta-390.png'), fullPage: true });

  console.log('\n· El cliente ve en cuánto llega');
  const primero = hechos.find((h) => h.k === 1);
  await R.p.ir(`/r/parada/${primero.id}`); await R.p.click('[data-salir]'); await R.p.waitForTimeout(2500);
  await R.ctx.setGeolocation({ latitude: 20.5888, longitude: -100.3899 - 0.005 }); await R.p.waitForTimeout(2500);
  await C.p.ir(`/pedido/${primero.id}`); await C.p.waitForSelector('#seg-vivo .llega, #seg-vivo .nota', { timeout: 20000 });
  const vivo = await C.p.$eval('#seg-vivo', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  const min = Number((vivo.match(/(\d+) min/) || [])[1]);
  // Del punto (lng −100.3949) a la entrega (−100.3996): ~0.5 km en recta.
  ok(`dice en cuánto llega y es creíble (${min} min para ~0.5 km)`, min >= 2 && min <= 6, vivo);
  if(process.env.CAPTURA){ await C.p.screenshot({ path: join(process.env.CAPTURA, 'gps-cliente-390.png'), fullPage: true }); await A.p.ir('/a/repartidores'); await A.p.waitForTimeout(1500); await A.p.screenshot({ path: join(process.env.CAPTURA, 'gps-duenio-390.png'), fullPage: true }); }
  ok('y el repartidor sale en su mapa', await C.p.$$eval('.pin-mapa.rep', (l) => l.length) === 1);
}catch(e){ ok('la prueba corrió completa', false, e.stack || e.message); }
finally{
  // Limpieza: lo pedido se cancela (lo que ya salió, pasa primero por «no se entregó»).
  for(const h of hechos){
    await A.p.datos(async (d, id) => {
      try{ await d.cambiarEstado(id, 'no_entregado', 'prueba automática de GPS'); }catch(e){}
      try{ await d.cambiarEstado(id, 'cancelado', 'prueba automática de GPS'); }catch(e){}
    }, h.id).catch(() => {});
  }
  const errores = [C.p, A.p, R.p].flatMap((p) => p.errores);
  ok('cero errores de consola en los tres teléfonos', !errores.length, errores.join(' | '));
  console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
  await b.close(); await api.dispose(); servidor.close();
  process.exit(mal ? 1 : 0);
}
