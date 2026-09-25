#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   LAS PERSONAS DIFÍCILES · `node tienda/nucleo/pruebas-personas.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Carlos, el 25 de septiembre: «prueba todo como un usuario medio pendejo, un
   niño, un gato, un anciano y como yo». Cada una rompe cosas distintas:
     · EL GATO pisa lo que sea: toques al azar, teclas, scroll. Nada debe
       tronar ni dejar la app sin salida. Semilla fija: si falla, se repite.
     · EL NIÑO toca diez veces lo mismo: agregar sin parar, doble «Pedir»,
       cantidades absurdas, emojis y etiquetas en el buscador, atrás-adelante.
     · EL ANCIANO usa letra grande y un teléfono chico: nada se sale, todo se
       toca con el dedo, los campos no hacen zoom y el texto se lee.
     · EL DESPISTADO escribe mal el teléfono, entra a direcciones que no
       existen, paga con el carrito vacío, busca «shampo» y se queda sin red.
     · CARLOS pregunta «¿y si…?»: pido más de lo que hay, alguien se lleva la
       última pieza mientras pago.
   Contra la base de demo. Lo que pide, lo cancela al final.
   PERSONA=gato,niño… corre sólo esas. SEMILLA=n cambia al gato.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');

const TIENDA = join(dirname(fileURLToPath(import.meta.url)), '..');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${String(d).slice(0, Number(process.env.DETALLE || 400))}`}`); };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!ruta.startsWith(TIENDA)){ res.writeHead(403).end(); return; }
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream' }).end(readFileSync(ruta)); }catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/index.html`;
const api = await request.newContext({ proxy: { server: process.env.HTTPS_PROXY } });
const b = await chromium.launch();
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const SOLO = process.env.PERSONA ? process.env.PERSONA.split(',') : null;
const toca = (quien) => !SOLO || SOLO.includes(quien);

async function telefono(nombre, { ancho = 390, alto = 844, init } = {}){
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, serviceWorkers: 'block', hasTouch: true });
  await ctx.routeWebSocket(/^wss:\/\//, () => {});
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ contentType: 'image/png', body: PIXEL }));
  await ctx.route(/^https:\/\/(wa\.me|api\.whatsapp|www\.google\.com\/maps)/, (r) => r.fulfill({ contentType: 'text/html', body: '<p>fuera</p>' }));
  await ctx.route(/^https:\/\//, async (r) => { try{ await r.fulfill({ response: await api.fetch(r.request()) }); }catch(e){ await r.abort(); } });
  await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
  if(init) await ctx.addInitScript(init);
  // Lo que el gato abra en otra pestaña (WhatsApp, Maps) se cierra: no es la app.
  let p = null;
  ctx.on('page', async (x) => { if(p && x !== p) await x.close().catch(() => {}); });
  p = await ctx.newPage();
  p.errores = [];
  p.on('pageerror', (e) => p.errores.push(`${nombre}: ${e.message} @ ${(e.stack || '').split('\n').slice(1, 3).join(' ').trim()}`));
  p.on('console', (m) => { if(m.type() === 'error' && !/Failed to load resource|ERR_FAILED|ERR_INTERNET_DISCONNECTED/.test(m.text())) p.errores.push(`${nombre}: ${m.text()}`); });
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  p.listo = () => p.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 30000 });
  p.ir = async (ruta) => { await p.goto(BASE + '#' + ruta); await p.listo(); await p.waitForTimeout(250); };
  p.datos = (f, arg) => p.evaluate(async ([cuerpo, a]) => { const d = await import('./nucleo/datos.js'); return (0, eval)(cuerpo)(d, a); }, [f.toString(), arg]);
  p.texto = () => p.$eval('#contenido', (e) => e.innerText);
  p.sano = () => p.evaluate(() => ({
    h1: !!document.querySelector('h1')?.textContent.trim(),
    contenido: (document.querySelector('#contenido')?.innerText || '').trim().length > 0,
    ancho: document.documentElement.scrollWidth <= innerWidth + 1,
    ruta: location.hash,
  }));
  return { ctx, p };
}

let semilla = Number(process.env.SEMILLA || 20260925);
const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
const uno = (l) => l[Math.floor(azar() * l.length)];
const pedidosHechos = [];

/* ══ EL GATO ══════════════════════════════════════════════════════════════ */
if(toca('gato')){
  console.log(`\n· El gato (semilla ${semilla})`);
  const { ctx, p } = await telefono('gato');
  const RUTAS = ['/', '/buscar', '/carrito', '/favoritos', '/pedidos', '/cuenta', '/ayuda', '/otra-vez', '/pagar', '/c/0', '/buscar?q=tinte'];
  await p.ir('/');
  const cats = await p.$$eval('a[href*="#/c/"]', (l) => l.map((a) => a.getAttribute('href').split('#')[1]).slice(0, 3));
  const prods = await p.$$eval('a[href*="#/p/"]', (l) => l.map((a) => a.getAttribute('href').split('#')[1]).slice(0, 3));
  const todas = [...RUTAS.filter((r) => r !== '/c/0'), ...cats, ...prods];
  const TECLAS = ['Escape', 'Enter', 'Tab', 'Backspace', 'ArrowDown', 'ArrowUp', ' ', 'a', '9', 'ñ', '😺'];
  const rotas = [];
  for(const ruta of todas){
    await p.ir(ruta);
    const huellas = [];
    for(let k = 0; k < 25; k++){
      const que = azar();
      try{
        if(que < 0.6){
          const n = await p.evaluate((r) => {
            const l = [...document.querySelectorAll('button, a[href], input, select, textarea, label, summary, [role="button"]')]
              .filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.height && !e.disabled && getComputedStyle(e).visibility !== 'hidden'; });
            if(!l.length) return null;
            const e = l[Math.floor(r * l.length)]; e.setAttribute('data-gato', '1');
            return (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30);
          }, azar());
          if(n != null){ huellas.push('toca ' + n); await p.click('[data-gato]', { timeout: 1500, force: true }).catch(() => {}); await p.evaluate(() => document.querySelector('[data-gato]')?.removeAttribute('data-gato')); }
        } else if(que < 0.85){ const t = uno(TECLAS); huellas.push('tecla ' + t); await p.keyboard.press(t).catch(() => p.keyboard.type(t)); }
        else { huellas.push('scroll'); await p.mouse.wheel(0, (azar() - 0.3) * 1500); }
        await p.waitForTimeout(60);
      }catch(e){ huellas.push('✗ ' + e.message.slice(0, 80)); }
    }
    await p.waitForTimeout(500);
    // Si el gato se fue de la app (un enlace externo en la misma pestaña), regresa.
    if(!p.url().startsWith(BASE.split('#')[0])){ rotas.push(`${ruta}: se salió de la app a ${p.url()}`); await p.ir('/'); continue; }
    await p.waitForFunction(() => !document.querySelector('#contenido [aria-busy="true"]'), null, { timeout: 15000 }).catch(() => {});
    const s = await p.sano();
    if(!s.h1 || !s.contenido || !s.ancho) rotas.push(`${ruta} → ${s.ruta}: ${JSON.stringify(s)} tras ${huellas.slice(-6).join(' · ')}`);
    // Un diálogo o una hoja abierta no debe dejar a nadie atrapado: Escape la cierra.
    for(let k = 0; k < 3; k++){ await p.keyboard.press('Escape'); await p.waitForTimeout(150); }
    const atrapado = await p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.id || d.className));
    if(atrapado.length) rotas.push(`${ruta}: Escape no cerró ${atrapado.join(', ')}`);
  }
  ok(`${todas.length} pantallas pisoteadas 25 veces cada una: ninguna quedó en blanco, sin título, desbordada o sin salida`, !rotas.length, rotas.join(' | '));
  ok('el gato no hizo tronar nada', !p.errores.length, p.errores.slice(0, 6).join(' | '));
  await ctx.close();
}

/* ══ EL NIÑO ══════════════════════════════════════════════════════════════ */
if(toca('niño')){
  console.log('\n· El niño');
  const { ctx, p } = await telefono('niño');
  await p.ir('/');
  const prod = await p.datos(async (d) => { const { productos } = await d.catalogo(); const x = productos.find((q) => !q.x && q.q >= 2 && q.q <= 6); return x && { id: x.id, q: x.q, n: x.n }; });
  await p.ir(`/p/${prod.id}`);
  for(let k = 0; k < 15; k++) await p.click('[data-mas]', { force: true, timeout: 500 }).catch(() => {});
  for(let k = 0; k < 12; k++) await p.click('[data-agregar]', { force: true, timeout: 500 }).catch(() => {});
  await p.waitForTimeout(400);
  const lleva = await p.evaluate(async (id) => (await import('./nucleo/datos.js')).carrito.cuantas(id), prod.id);
  ok(`«+» y «Agregar» a lo loco: el carrito nunca pasa de las ${prod.q} que hay (lleva ${lleva})`, lleva >= 1 && lleva <= prod.q);
  await p.ir('/carrito');
  for(let k = 0; k < 20; k++) await p.click(`[data-mas="${prod.id}"]`, { force: true, timeout: 400 }).catch(() => {});
  const lleva2 = await p.evaluate(async (id) => (await import('./nucleo/datos.js')).carrito.cuantas(id), prod.id);
  ok('en el carrito tampoco: el «+» se detiene en lo que hay', lleva2 <= prod.q, `${lleva2} de ${prod.q}`);
  // Carrito guardado a mano con cantidades imposibles (otra pestaña, una versión vieja…)
  await p.evaluate(async (id) => { const d = await import('./nucleo/datos.js'); d.carrito.vaciar(); d.carrito.poner(id, 99999); d.carrito.poner('no-existe', 3); d.carrito.poner(id + 'x', 4); }, prod.id);
  await p.evaluate(() => { for(const k of Object.keys(localStorage)) if(k.startsWith('tienda-carrito')){ const v = JSON.parse(localStorage.getItem(k)); v.push(['raro', -4], ['texto', 'mil']); localStorage.setItem(k, JSON.stringify(v)); } });
  await p.reload(); await p.listo(); await p.waitForTimeout(400);
  const car = await p.texto();
  ok('un carrito con 99,999 piezas, cantidades negativas o productos que no existen no truena y no cobra de más', !/NaN|-4|\$[\d,]{7,}/.test(car.replace(/pediste \d+/g, '')) && (await p.sano()).h1, car.slice(0, 300));
  await p.evaluate(async () => (await import('./nucleo/datos.js')).carrito.vaciar());
  // Buscador: emojis, etiquetas, texto kilométrico
  let alerta = false; p.on('dialog', () => { alerta = true; });
  for(const q of ['🧴🧴💈', '<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', 'a'.repeat(600), '%%%', '   ']){
    await p.ir('/buscar'); await p.fill('#buscar, input[type="search"]', q).catch(() => {}); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  }
  const sanoB = await p.sano();
  ok('emojis, etiquetas HTML y 600 letras en el buscador: nada se ejecuta ni se desborda', !alerta && sanoB.ancho && !(await p.$('#contenido img[src="x"]')), JSON.stringify({ alerta, ...sanoB, img: !!(await p.$('#contenido img[src="x"]')), ancho: await p.evaluate(() => document.documentElement.scrollWidth) }));
  // Favorito prendido y apagado 15 veces
  await p.ir(`/p/${prod.id}`);
  for(let k = 0; k < 15; k++) await p.click('.corazon, [data-fav]', { force: true, timeout: 500 }).catch(() => {});
  const fav = await p.evaluate(async (id) => (await import('./nucleo/datos.js')).memoria.favoritos.tiene(id), prod.id);
  const pintado = await p.$eval('.corazon, [data-fav]', (e) => e.getAttribute('aria-pressed'));
  ok('el corazón tocado 15 veces termina en «sí» y la pantalla dice lo mismo que la memoria', fav === true && pintado === 'true', `${fav} / ${pintado}`);
  // Atrás y adelante sin parar
  for(const r of ['/', '/buscar', '/carrito', '/favoritos', '/pedidos']) await p.goto(BASE + '#' + r);
  for(let k = 0; k < 8; k++){ await p.goBack().catch(() => {}); }
  for(let k = 0; k < 8; k++){ await p.goForward().catch(() => {}); }
  await p.waitForTimeout(800);
  ok('atrás y adelante como loco: la pantalla sigue viva', (await p.sano()).h1);
  // Doble (triple) toque en «Pedir»: un solo pedido
  const antes = (await p.datos((d) => d.misPedidos().catch(() => []))).length;
  await p.evaluate((id) => { for(const k of Object.keys(localStorage)) if(k.startsWith('tienda-carrito')) localStorage.removeItem(k); }, prod.id);
  await p.evaluate(async (id) => (await import('./nucleo/datos.js')).carrito.agregar(id, 1), prod.id);
  await p.ir('/pagar');
  await p.fill('#nombre', 'Niño Prueba'); await p.fill('#telefono', '4425550999');
  if(await p.$('[data-entrega="recoger"]')) await p.click('[data-entrega="recoger"]');
  else { await p.fill('#calle', 'Juárez 1'); await p.fill('#colonia', 'Centro'); }
  await Promise.all([p.click('[data-pedir]', { force: true }), p.click('[data-pedir]', { force: true }).catch(() => {}), p.click('[data-pedir]', { force: true }).catch(() => {})]);
  await p.waitForSelector('text=Pedido #', { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(2000);
  const despues = await p.datos((d) => d.misPedidos().catch(() => []));
  despues.slice(0, despues.length - antes).forEach((x) => pedidosHechos.push({ id: x.id, p }));
  ok('tres toques a «Pedir» hacen UN pedido', despues.length - antes === 1, `${despues.length - antes} pedidos`);
  ok('el niño no hizo tronar nada', !p.errores.length, p.errores.slice(0, 6).join(' | '));
  p.cerrar = () => ctx.close();
}

/* ══ EL ANCIANO ═══════════════════════════════════════════════════════════ */
if(toca('anciano')){
  console.log('\n· El anciano: teléfono chico (320) y letra grande');
  const { ctx, p } = await telefono('anciano', { ancho: 320, alto: 640, init: () => { try{ localStorage.setItem('tienda-letra', 'grande'); }catch(e){} } });
  await p.ir('/');
  const prod = await p.$$eval('a[href*="#/p/"]', (l) => l[0]?.getAttribute('href').split('#')[1]);
  const cat = await p.$$eval('a[href*="#/c/"]', (l) => l[0]?.getAttribute('href').split('#')[1]);
  await p.evaluate(async (id) => { const d = await import('./nucleo/datos.js'); const { productos } = await d.catalogo(); const x = productos.find((q) => !q.x && q.q > 3); d.carrito.agregar(x.id, 1); });
  const problemas = [];
  for(const r of ['/', '/buscar', cat, prod, '/carrito', '/pagar', '/favoritos', '/pedidos', '/cuenta', '/ayuda']){
    await p.ir(r);
    const m = await p.evaluate(() => {
      const fuera = [], chicos = [], zoom = [], diminuto = [];
      const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      for(const e of document.querySelectorAll('#contenido *, .arriba *, .pestanas *')){
        if(!vis(e)) continue;
        const b = e.getBoundingClientRect();
        const enFila = (x) => { for(let a = x.parentElement; a; a = a.parentElement){ if(['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(a).overflowX)) return true; } return false; };
        if(b.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !enFila(e)) fuera.push(`${e.tagName}.${String(e.className?.baseVal ?? e.className).split(' ')[0]} en ${e.parentElement?.closest('[class]')?.className.toString().split(' ')[0]}:${Math.round(b.right)}`);
      }
      for(const e of document.querySelectorAll('button, a.boton, input:not([type=hidden]), select, [role="button"]')){
        if(!vis(e) || e.closest('.leaflet-control')) continue;
        const b = e.getBoundingClientRect();
        if(Math.min(b.width, b.height) < 44 && !(e.type === 'checkbox' || e.type === 'radio')) chicos.push(`${(e.getAttribute('aria-label') || e.textContent || e.name || e.tagName).trim().slice(0, 20)} ${Math.round(b.width)}×${Math.round(b.height)}`);
      }
      for(const e of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea')){
        if(vis(e) && parseFloat(getComputedStyle(e).fontSize) < 16) zoom.push(e.id || e.name || e.type);
      }
      for(const e of document.querySelectorAll('#contenido p, #contenido small, #contenido span, #contenido li, #contenido dd, #contenido dt, #contenido label')){
        if(vis(e) && e.textContent.trim() && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 13) diminuto.push(`${e.textContent.trim().slice(0, 18)} ${getComputedStyle(e).fontSize}`);
      }
      return { fuera: [...new Set(fuera)].slice(0, 4), chicos: [...new Set(chicos)].slice(0, 5), zoom, diminuto: [...new Set(diminuto)].slice(0, 5), ancho: document.documentElement.scrollWidth <= innerWidth + 1 };
    });
    if(!m.ancho || m.fuera.length) problemas.push(`${r} se sale: ${m.fuera.join(', ')}`);
    if(m.chicos.length) problemas.push(`${r} botones chicos: ${m.chicos.join(', ')}`);
    if(m.zoom.length) problemas.push(`${r} campos que hacen zoom en iPhone: ${m.zoom.join(', ')}`);
    if(m.diminuto.length) problemas.push(`${r} letra de menos de 13 px: ${m.diminuto.join(', ')}`);
  }
  ok('en 320 px con letra grande: nada se sale, todo se toca con el dedo, ningún campo hace zoom y nada se lee diminuto', !problemas.length, problemas.join(' | '));
  ok('el anciano no hizo tronar nada', !p.errores.length, p.errores.slice(0, 6).join(' | '));
  await ctx.close();
}

/* ══ EL DESPISTADO ════════════════════════════════════════════════════════ */
if(toca('despistado')){
  console.log('\n· El despistado');
  const { ctx, p } = await telefono('despistado');
  await p.ir('/pagar');
  const vacio = await p.texto();
  ok('pagar con el carrito vacío explica y da salida', /vac[ií]o|no hay nada|agrega/i.test(vacio) && !!(await p.$('#contenido a[href]')), vacio.slice(0, 160));
  await p.goto(BASE + '#/esto-no-existe'); await p.waitForTimeout(800);
  ok('una dirección que no existe dice «no encontrado» y ofrece regresar', /no (lo )?encontr|no existe/i.test(await p.$eval('#contenido', (e) => e.innerText)) && !!(await p.$('#contenido a[href]')));
  await p.goto(BASE + '#/p/no-es-un-producto'); await p.waitForTimeout(1500);
  const pn = await p.$eval('#contenido', (e) => e.innerText);
  ok('un producto que no existe no deja la pantalla en blanco', pn.trim().length > 10 && !!(await p.$('#contenido a[href]')), pn.slice(0, 160));
  for(const [q, debe] of [['shampo', /shamp/i], ['tinte rojo', /tinte/i], ['ACONDICIONADOR', /acondicionador/i], ['kératine', /keratin/i]]){
    await p.ir('/buscar?q=' + encodeURIComponent(q)); await p.waitForTimeout(700);
    const n = await p.$$eval('#contenido .producto', (l) => l.length);
    const t = await p.texto();
    ok(`buscar «${q}» (mal escrito o con acentos de más) sí encuentra`, n > 0 && debe.test(t), `${n} resultados`);
  }
  await p.evaluate(async () => { const d = await import('./nucleo/datos.js'); const { productos } = await d.catalogo(); const x = productos.find((q) => !q.x && q.q > 3); d.carrito.vaciar(); d.carrito.agregar(x.id, 1); });
  await p.ir('/pagar');
  const casos = [['44-28-83 37 86', true], ['+52 442 883 3786', true], ['(442) 883.3786', true], ['442 883 378', false], ['cuatro cuatro dos', false], ['', false]];
  const malos = [];
  for(const [tel, vale] of casos){
    await p.fill('#nombre', 'Despistado'); await p.fill('#telefono', tel);
    await p.evaluate(() => { document.querySelectorAll('.campo.error').forEach((c) => c.classList.remove('error')); });
    // Sólo se valida: se corta el envío real interceptando la venta.
    await p.route(/rpc\/(vender|mi_cliente)/, (r) => r.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"prueba"}' }));
    await p.click('[data-pedir]'); await p.waitForTimeout(400);
    const marcado = await p.$eval('#telefono', (i) => !!i.closest('.campo')?.classList.contains('error'));
    if(marcado === vale) malos.push(`«${tel}» ${vale ? 'debió pasar' : 'debió marcarse'}`);
    await p.unroute(/rpc\/(vender|mi_cliente)/);
  }
  ok('el teléfono se entiende con guiones, paréntesis, puntos y +52; lo incompleto se marca', !malos.length, malos.join(' | '));
  // Sin red a media compra
  await ctx.setOffline(true);
  await p.goto(BASE + '#/buscar?q=tinte').catch(() => {}); await p.waitForTimeout(2500);
  const sr = await p.evaluate(() => (document.querySelector('#contenido')?.innerText || '').trim());
  ok('sin red, la tienda dice qué pasa en vez de quedarse en blanco', sr.length > 10, sr.slice(0, 160));
  await ctx.setOffline(false);
  ok('el despistado no hizo tronar nada', !p.errores.filter((e) => !/fetch|red|network|conexi/i.test(e)).length, p.errores.slice(0, 6).join(' | '));
  await ctx.close();
}

/* ══ CARLOS ═══════════════════════════════════════════════════════════════ */
if(toca('carlos')){
  console.log('\n· Carlos: «¿y si…?»');
  const { ctx, p } = await telefono('carlos');
  await p.ir('/');
  const prod = await p.datos(async (d) => { const { productos } = await d.catalogo(); const x = productos.find((q) => !q.x && q.q >= 2 && q.q <= 5 && Number.isInteger(q.p)); return { id: x.id, q: x.q, n: x.n, p: x.p }; });
  await p.evaluate(async ({ id, q }) => { const d = await import('./nucleo/datos.js'); d.carrito.vaciar(); d.carrito.poner(id, q + 3); }, prod);
  await p.ir('/carrito');
  const t = await p.texto();
  ok(`¿y si pido ${prod.q + 3} y sólo hay ${prod.q}? El carrito lo dice y cobra sólo lo que hay`, !!(await p.$('[data-ajuste]')) && /pediste \d+ y s[oó]lo/.test(t)
    && await p.evaluate(async (id) => (await import('./nucleo/datos.js')).carrito.cuantas(id), prod.id) === prod.q, t.slice(0, 240));
  await p.ir('/pagar');
  const total = await p.$eval('[data-total]', (e) => e.textContent);
  ok('y al pagar cobra sólo las que hay', total.replace(/[^\d]/g, '') === String(Math.round(prod.q * prod.p)), `${total} vs ${prod.q} × ${prod.p}`);
  // ¿Y si otro se lleva la última mientras pago? El servidor dice sin_existencias.
  await p.fill('#nombre', 'Carlos Prueba'); await p.fill('#telefono', '4425550111');
  if(await p.$('[data-entrega="recoger"]')) await p.click('[data-entrega="recoger"]'); else { await p.fill('#calle', 'Juárez 1'); await p.fill('#colonia', 'Centro'); }
  await p.route(/rpc\/vender/, (r) => r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'P0001', message: `sin_existencias: ${prod.n}` }) }));
  await p.click('[data-pedir]');
  await p.waitForFunction(() => document.getElementById('avisos')?.textContent.trim(), null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(300);
  if(process.env.DEPURA) console.log(await p.evaluate(() => ({ av: document.getElementById('avisos')?.outerHTML, err: [...document.querySelectorAll('.mensaje-error')].map((e) => e.textContent), url: location.hash })));
  const avisos = await p.evaluate(() => document.getElementById('avisos')?.textContent || '');
  ok('¿y si alguien se lleva la última mientras pago? Le dice cuál ya no alcanza, en español', /ya no alcanzan/i.test(avisos) && avisos.includes(prod.n.slice(0, 12)), avisos.slice(0, 200));
  ok('y se queda un aviso junto al botón con la salida al carrito (el flotante se va solo)', !!(await p.$('[data-sin-piezas] a[href*="carrito"]')));
  ok('y el botón vuelve a servir para corregir y reintentar', await p.$eval('[data-pedir]', (x) => !x.disabled));
  await p.unroute(/rpc\/vender/);
  ok('Carlos no hizo tronar nada', !p.errores.filter((e) => !/ya no alcanzan|sin_existencias|No se pudo/i.test(e)).length, p.errores.slice(0, 6).join(' | '));
  await ctx.close();
}

/* ══ EL GATO EN EL MOSTRADOR, LA OFICINA Y LA MOTO ═════════════════════════
   Mismo gato, en las pantallas del personal. Aquí los toques al azar SÍ
   podrían vender, borrar o cerrar caja de verdad, así que toda escritura a la
   base se contesta «bloqueado por la prueba»: lo que se mide es que la app
   aguante —que diga que no se pudo, que no se quede colgada, que no truene—,
   no que escriba. */
const ESCRIBE = (u, m) => (m !== 'GET' && m !== 'HEAD' && /\/rest\/v1\/(?!rpc\/donde_va)/.test(u)) ;
async function bloquearEscrituras(ctx, cuenta){
  await ctx.route(/\/rest\/v1\//, async (r) => {
    if(!ESCRIBE(r.request().url(), r.request().method())) return r.fallback();
    cuenta.push(r.request().url().split('/rest/v1/')[1].split('?')[0]);
    await r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'P0001', message: 'bloqueado por la prueba' }) });
  });
}
if(toca('gato-personal')){
  console.log(`\n· El gato en el mostrador, la oficina y la moto (semilla ${semilla})`);
  for(const [rol, apartado] of [['cajero', 'venta'], ['repartidor', 'repartidor'], ['admin', 'admin']].filter(([r]) => !process.env.ROL || process.env.ROL === r)){
    const escrituras = [];
    const { ctx, p } = await telefono('gato-' + rol, { ancho: rol === 'cajero' ? 820 : 390, alto: rol === 'cajero' ? 1180 : 844 });
    await p.ir('/'); await p.datos((d, r) => d.verComo(r), rol);
    await bloquearEscrituras(ctx, escrituras);
    const rutas = await p.evaluate(async (a) => (await import('./nucleo/rutas.js')).RUTAS.filter((r) => r.apartado === a && !r.ruta.includes(':')).map((r) => r.ruta), apartado);
    const rotas = [];
    for(const ruta of rutas){
      await p.ir(ruta).catch(() => {});
      for(let k = 0; k < 20; k++){
        const que = azar();
        try{
          if(que < 0.65){
            const n = await p.evaluate((r) => {
              const l = [...document.querySelectorAll('button, a[href], input, select, textarea, label, summary, [role="button"]')]
                .filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.height && !e.disabled && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[data-salir-app], [data-cerrar-sesion]'); });
              if(!l.length) return null;
              const e = l[Math.floor(r * l.length)]; e.setAttribute('data-gato', '1'); return 1;
            }, azar());
            if(n) await p.click('[data-gato]', { timeout: 1500, force: true }).catch(() => {});
            await p.evaluate(() => document.querySelector('[data-gato]')?.removeAttribute('data-gato')).catch(() => {});
          } else if(que < 0.9) await p.keyboard.press(uno(['Escape', 'Enter', 'Tab', 'Backspace', '5', 'a', ' '])).catch(() => {});
          else await p.mouse.wheel(0, (azar() - 0.3) * 1500);
          await p.waitForTimeout(80);
        }catch(e){}
      }
      await p.waitForTimeout(600);
      if(!p.url().startsWith(BASE.split('#')[0])){ rotas.push(`${ruta}: se salió a ${p.url()}`); await p.ir('/'); continue; }
      await p.waitForFunction(() => !document.querySelector('#contenido [aria-busy="true"]'), null, { timeout: 15000 }).catch(() => {});
      const st = await p.sano().catch(() => ({}));
      if(!st.h1 || !st.contenido || !st.ancho) rotas.push(`${ruta} → ${st.ruta}: ${JSON.stringify(st)}`);
      // Hasta tres Escape: el primero puede estar cerrando una lista desplegada
      // que el gato dejó abierta, igual que le pasa a una persona.
      for(let k = 0; k < 3; k++){ await p.keyboard.press('Escape'); await p.waitForTimeout(150); }
      const atrapado = await p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.id || d.className)).catch(() => []);
      if(atrapado.length) rotas.push(`${ruta}: Escape no cerró ${atrapado.join(', ')}`);
    }
    ok(`${rol}: ${rutas.length} pantallas pisoteadas, ninguna en blanco, desbordada o atrapada`, !rotas.length, rotas.join(' | '));
    const errores = p.errores.filter((e) => !/bloqueado por la prueba|Algo falló|ErrorDeDatos: No se (pud|guard)/.test(e));
    ok(`${rol}: nada tronó (${escrituras.length} escrituras bloqueadas, cada una contestada sin colgarse)`, !errores.length, errores.slice(0, 6).join(' | '));
    await ctx.close();
  }
}

// Limpieza: lo que se pidió de verdad se cancela.
for(const { id, p } of pedidosHechos){
  await p.datos(async (d, x) => { try{ await d.cambiarEstado(x, 'cancelado', 'prueba automática: el niño'); }catch(e){ return e.message; } }, id).catch(() => {});
}
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
await b.close(); await api.dispose(); servidor.close();
process.exit(mal ? 1 : 0);
