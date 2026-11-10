/* INKWELL · TIRAS — pruebas en un navegador de verdad (390×844 y 1280×800).
   Webtoon y Wattpad son de mentiras pero con la FORMA de los de verdad (la
   misma API de capítulos, el mismo `class="_images" data-url`, el mismo
   storytext de Wattpad): el recadero se sirve aquí y se usa con ?servidor=.
   Comprueba el EFECTO: agregar por link y por búsqueda, que se preparen solos
   los capítulos que siguen, que «Leer seguido» los ponga en un solo scroll y
   los marque leídos, que el PDF y el EPUB traigan lo que deben, que el texto
   ajeno llegue sin scripts, y que todo sobreviva a cerrar y a no tener red.
     node inkwell/pruebas-tiras.mjs                                             */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TIPOS = { '.css': 'text/css', '.woff2': 'font/woff2', '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
let bien = 0, mal = 0;
/* la ✕ vive en la barra escondida: como una persona, se toca la pantalla para que aparezca y luego se toca la ✕ */
const cerrarLector = async (pg) => {
  if (await pg.evaluate(() => document.querySelector('#lector').classList.contains('sinbarra'))) {
    const r = await pg.evaluate(() => { const b = document.querySelector('#scroll').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await pg.mouse.click(r.x, r.y);
  }
  await pg.waitForFunction(() => document.querySelector('.lhead').getBoundingClientRect().top >= -1);
  await pg.waitForTimeout(300);
  await pg.click('#cerrarLector');
};
const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };

/* ── el Webtoon de mentiras ── */
const N = 12, POR = 3;
let jpg = {};                       // nombre → Buffer, se llena desde el navegador
const pedidos = [];
const lista = `<html><head><meta property="og:title" content="Mi Seri&amp;eacute; &amp;amp; Co"><meta property="og:image" content="https://swebtoon-phinf.pstatic.net/portada.jpg"><meta property="og:description" content="Una serie de prueba"><meta name="com-linewebtoon:webtoon:author" content="Autora Uno"></head><body></body></html>`;
const api = JSON.stringify({ result: { episodeList: Array.from({ length: N }, (_, i) => ({ episodeNo: i + 1, episodeTitle: `Episodio ${i + 1}`, viewerLink: `/es/fantasy/mi-serie/ep-${i + 1}/viewer?title_no=777&episode_no=${i + 1}`, exposureDateMillis: 1700000000000 + i })) } });
const visor = (n) => `<html><body><div id="_imageList">${Array.from({ length: POR }, (_, k) => `<img src="x.png" width="700" class="_images" data-url="https://webtoon-phinf.pstatic.net/ep${n}_${k}.jpg?type=q90" rel="nofollow">`).join('')}</div></body></html>`;
let rankingOn = false;
const ranking = `<html><body><a href="https://www.webtoons.com/es/fantasy/mi-serie/list?title_no=777">ya la sigo</a><a href="https://www.webtoons.com/es/fantasy/otra-serie/list?title_no=888">nueva</a></body></html>`;
function recadero(u){
  const d = new URL(u);
  pedidos.push(d.toString());
  if (d.hostname === 'www.webtoons.com' && /\/ranking\//.test(d.pathname)) return rankingOn ? ['text/html', ranking] : null;
  if (d.hostname === 'www.webtoons.com' && d.pathname === '/es/search') return ['text/html', /amor/i.test(d.searchParams.get('keyword') || '') ? `<ul><li><a href="https://www.webtoons.com/es/romance/amor-comic/list?title_no=888" class="link"><img src="https://swebtoon-phinf.pstatic.net/portada.jpg"><strong class="title">Amor en cómic</strong><div class="author">Autora Tres</div></a></li></ul>` : '<ul></ul>'];
  if (d.hostname === 'www.webtoons.com' && /\/genres\/fantasy/.test(d.pathname)) return ['text/html', `<ul class="webtoon_list"><li><a href="https://www.webtoons.com/es/fantasy/otra-serie/list?title_no=888" class="link"><div class="image_wrap"><img loading="lazy" src="https://swebtoon-phinf.pstatic.net/portada.jpg" alt=""></div><div class="info_text"><strong class="title">Otra serie &amp; más</strong><div class="author">Autora Dos</div></div></a></li></ul>`];
  if (d.hostname === 'www.webtoons.com' && d.pathname.endsWith('/list')) return ['text/html', lista];
  if (d.hostname === 'm.webtoons.com' && /\/api\/v1\/webtoon\/(777|888)\/episodes/.test(d.pathname)) return ['application/json', api];
  const v = /episode_no=(\d+)/.exec(d.search); if (d.pathname.endsWith('/viewer') && v) return ['text/html', visor(+v[1])];
  const img = /\/(ep\d+_\d+|portada)\.jpg/.exec(d.pathname); if (img) return ['image/jpeg', jpg[img[1]] || jpg.ep1_0];
  return null;
}
const srv = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x');
  if (u.pathname === '/api/sala/inkwell/traer') {
    const r = recadero(u.searchParams.get('url'));
    if (!r) { s.writeHead(404, { 'content-type': 'application/json' }); s.end('{"error":"no"}'); return; }
    s.writeHead(200, { 'content-type': r[0], 'access-control-allow-origin': '*' }); s.end(r[1]); return;
  }
  let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ)) { s.writeHead(403); s.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); s.end(d); });
}).listen(0);
const ORIGEN = `http://localhost:${srv.address().port}`;
const BASE = `${ORIGEN}/inkwell/tiras.html?servidor=${encodeURIComponent(ORIGEN)}`;

/* ── el Wattpad de mentiras (va directo, con CORS) ── */
const partes = [{ id: 501, title: 'Uno: la carta' }, { id: 502, title: 'Dos: el silencio' }, { id: 503, title: 'Tres: la verdad' }];
const historia = { id: '9001', title: 'Amor roto', description: 'Una historia', cover: 'https://img.wattpad.com/cover/9001.jpg', user: { name: 'GabriellaFL' }, parts: partes };
const texto = (id) => `<p data-p-id="a" style="color:red" onclick="alert(1)">Párrafo de la parte ${id}, con <b>negritas</b> e <i>itálicas</i>.</p><script>window.__hackeado = true</script><p data-p-id="b"><img src="https://x/y.png" onerror="window.__hackeado=true">Segundo párrafo<br>con salto.</p>`;
async function wattpadFalso(ruta){
  const u = new URL(ruta.request().url()), h = { 'access-control-allow-origin': '*' };
  if (u.pathname === '/v4/search/stories') return ruta.fulfill({ headers: h, contentType: 'application/json', body: JSON.stringify({ stories: [{ id: '9001', title: 'Amor roto', user: { name: 'GabriellaFL' }, numParts: 3, cover: 'https://img.wattpad.com/cover/9001.jpg' }, { id: '9002', title: 'Otro amor', user: { name: 'X' }, numParts: 1, cover: '' }] }) });
  if (u.pathname === '/api/v3/stories/9001') return ruta.fulfill({ headers: h, contentType: 'application/json', body: JSON.stringify(historia) });
  if (u.pathname === '/api/v3/story_parts/502') return ruta.fulfill({ headers: h, contentType: 'application/json', body: JSON.stringify({ groupId: '9001' }) });
  if (u.pathname === '/apiv2/') return ruta.fulfill({ headers: { ...h, 'content-type': 'text/plain; charset=UTF-8' }, body: texto(u.searchParams.get('id')) });
  return ruta.fulfill({ status: 404, headers: h, body: '' });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tiras-'));
const desborde = (pg) => pg.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, ...[...document.querySelectorAll('dialog[open] .hoja')].map((d) => d.scrollWidth - d.clientWidth)));
const br = await chromium.launch();
for (const [ancho, alto, nombre] of [[390, 844, 'teléfono'], [1280, 800, 'computadora']]) {
  console.log(`\n${nombre} ${ancho}×${alto}`);
  const ctx = await br.newContext({ viewport: { width: ancho, height: alto }, acceptDownloads: true, serviceWorkers: 'block' });
  await ctx.route('https://www.wattpad.com/**', wattpadFalso);
  await ctx.route('https://img.wattpad.com/**', (r) => r.fulfill({ contentType: 'image/jpeg', body: jpg.portada }));
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errores.push(m.text())); pg.on('requestfailed', (q) => /DISCONNECTED/.test(q.failure()?.errorText || '') && errores.push('[falló ' + q.url().slice(0, 90) + ']'));
  pg.on('dialog', (d) => d.accept());
  await pg.goto(BASE);
  if (!jpg.ep1_0) {
    /* las imágenes de los capítulos: cada una de un color, con su número */
    const hechas = await pg.evaluate(({ N, POR }) => {
      const out = {};
      const una = (nom, color, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '60px sans-serif'; x.fillText(nom, 40, 120); out[nom] = c.toDataURL('image/jpeg', .8).split(',')[1]; };
      for (let n = 1; n <= N; n++) for (let k = 0; k < POR; k++) una(`ep${n}_${k}`, `hsl(${n * 29 + k * 7},60%,40%)`, 700, 900 + k * 100);
      una('portada', '#c94f7a', 300, 400);
      return out;
    }, { N, POR });
    for (const [k, v] of Object.entries(hechas)) jpg[k] = Buffer.from(v, 'base64');
  }
  await pg.waitForFunction(() => /Agrega una serie|para empezar/.test(document.querySelector('#estadoTxt').textContent));
  ok(await pg.isDisabled('#leerTodo') && /Todavía no sigues/.test(await pg.textContent('#series')), 'vacía: lo dice y «Leer seguido» no se puede tocar');
  ok(await desborde(pg) <= 0, 'nada se sale de la pantalla');

  // agregar Webtoon por link
  pedidos.length = 0;
  await pg.fill('#buscar', 'https://www.webtoons.com/es/fantasy/mi-serie/list?title_no=777&page=2');
  await pg.click('#agregar');
  await pg.waitForFunction(() => /5 capítulos listos/.test(document.querySelector('#estadoTxt').textContent) && !window.__tiras.ocupado, null, { timeout: 30000 });
  const card = () => pg.textContent('.serie');
  ok(/Mi Serié & Co/.test(await card()) && /Autora Uno/.test(await card()), 'agrega la serie con su nombre (sin «&eacute;» aunque Webtoon lo mande codificado dos veces) y su autora');
  ok(/0 de 12 leídos/.test(await card()) && /5 listos/.test(await card()), 'y deja listos los 5 capítulos que siguen, solos');
  ok(pedidos.every((u) => /webtoons\.com|pstatic\.net/.test(u)) && pedidos.some((u) => /ep5_2/.test(u)) && !pedidos.some((u) => /ep6_/.test(u)), 'pidió por el recadero las imágenes de los caps 1 a 5, y ninguna del 6');
  ok(await pg.evaluate(() => document.querySelector('.serie .portada').naturalWidth) === 300, 'con su portada, guardada en el teléfono');
  ok(/Leer seguido · 5 capítulos/.test(await pg.textContent('#leerTodo')), '«Leer seguido» dice cuántos hay listos');

  // leer seguido
  await pg.click('#leerTodo');
  await pg.waitForFunction(() => document.querySelectorAll('#scroll .cap').length >= 1);
  if (process.env.CAPTURA) { await pg.waitForTimeout(400); await pg.screenshot({ path: `${process.env.CAPTURA}/tiras-lector-${ancho}.png` }); }
  ok(/Mi Serié & Co/.test(await pg.textContent('#lTitulo')) && /Cap\. 1/.test(await pg.textContent('#lSub')), 'el lector abre en el capítulo 1');
  const altos = await pg.evaluate(() => [...document.querySelectorAll('#scroll .cap')[0].querySelectorAll('img')].map((i) => i.getAttribute('height')));
  ok(altos.join(',') === '900,1000,1100', `cada imagen reserva su alto antes de pintarse (${altos.join(', ')})`);
  /* se baja como una persona: de a media pantalla, hasta acabar 3 capítulos */
  const leidosAhora = () => pg.evaluate(async () => (await window.__tiras.todasSeries())[0].leidos.length);
  ok(await leidosAhora() === 0, 'abrir el lector no marca nada como leído');
  for (let i = 0; i < 200 && (await leidosAhora()) < 3; i++) {
    await pg.evaluate(() => { const s = document.querySelector('#scroll'); s.scrollTop += s.clientHeight / 2; });
    await pg.waitForTimeout(60);
  }
  await pg.waitForTimeout(300);
  const leidos = await leidosAhora();
  ok(leidos === 3, `al pasar el final de cada capítulo lo marca leído, y sólo ése (${leidos})`);
  /* pantalla completa: la barra va escondida y sólo sale con un toque (Carlos, 10 nov) */
  const barraVisible = () => pg.evaluate(() => { const r = document.querySelector('.lhead').getBoundingClientRect(); return r.bottom > 2; });
  ok(!(await barraVisible()), 'leyendo hacia abajo, la barra del título no se ve (pantalla completa)');
  await pg.evaluate(() => { document.querySelector('#scroll').scrollTop -= 200; }); await pg.waitForTimeout(400);
  ok(!(await barraVisible()), 'al deslizar para regresar, la barra se queda escondida (sólo sale con un toque, Carlos 10 nov)');
  { const c = await pg.evaluate(() => { const b = document.querySelector('#scroll').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await pg.mouse.click(c.x, c.y); await pg.waitForTimeout(400); }
  ok(await barraVisible(), 'un toque en la pantalla baja la barra con el título y el capítulo');
  await pg.click('#brillo'); await pg.click('#letraMas');
  ok(await pg.evaluate(() => getComputedStyle(document.querySelector('#scroll')).filter.includes('0.85') && JSON.parse(localStorage.getItem('tiras.letra')) === 20), 'el brillo baja y la letra de las historias crece (y se recuerdan)');
  await pg.click('#brillo'); await pg.click('#brillo'); await pg.click('#brillo'); await pg.click('#letraMenos');
  await pg.evaluate(() => { document.querySelector('#scroll').scrollTop += 300; }); await pg.waitForTimeout(400);
  ok(await barraVisible(), 'y se queda mientras lees, hasta que la toques otra vez');
  { const c = await pg.evaluate(() => { const b = document.querySelector('#scroll').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await pg.mouse.click(c.x, c.y); await pg.waitForTimeout(400); }
  ok(!(await barraVisible()), 'otro toque la vuelve a esconder');
  const vistos = await pg.evaluate(() => [...document.querySelectorAll('#scroll .cap')].map((c) => +c.dataset.n));
  ok(vistos.every((n, i) => i === 0 || n === vistos[i - 1] + 1), `los capítulos van en orden, uno tras otro (${vistos.join(', ')})`);
  const pintadas = await pg.evaluate(() => [...document.querySelectorAll('#scroll .cap img')].filter((i) => i.complete && i.naturalWidth === 700).length);
  ok(pintadas >= 3, `las imágenes se ven (${pintadas} pintadas)`);
  /* el marcador (Carlos, 5 nov): dónde ibas, y al volver, el logo con «(salvado por el marcador)» */
  const pos = await pg.evaluate(() => { const cs = document.querySelectorAll('#scroll .cap'), a = cs[Math.min(3, cs.length - 1)], s = document.querySelector('#scroll');
    s.scrollTop = a.offsetTop + a.offsetHeight * 0.4; return { clave: a.dataset.clave, n: a.dataset.n }; });
  await pg.waitForTimeout(1000);
  const m1 = await pg.evaluate(() => JSON.parse(localStorage.getItem('tiras.marcador')));
  ok(m1 && m1.clave === pos.clave && Math.abs(m1.frac - 0.4) < 0.05, `al leer se guarda el marcador: capítulo y qué tanto llevas (${m1 && m1.clave} · ${m1 && m1.frac})`);
  await cerrarLector(pg);
  await pg.waitForFunction(() => !window.__tiras.ocupado, null, { timeout: 30000 });
  const m2 = await pg.evaluate(() => JSON.parse(localStorage.getItem('tiras.marcador')));
  ok(!m2.abierto && m2.clave === pos.clave, 'cerrar el lector deja el marcador donde quedaste, pero no lo reabre solo');
  await pg.click('#leerTodo');
  await pg.waitForFunction(() => !document.querySelector('#sello').hidden, null, { timeout: 15000 }).catch(() => {});
  const vuelta = await pg.evaluate((c) => { const a = document.querySelector(`#scroll .cap[data-clave="${c}"]`), s = document.querySelector('#scroll');
    return { sello: !document.querySelector('#sello').hidden, texto: document.querySelector('#sello').textContent, frac: a ? (s.scrollTop - a.offsetTop) / a.offsetHeight : -1 }; }, pos.clave);
  ok(vuelta.sello && /INKWELL/.test(vuelta.texto) && /\(salvado por el marcador\)/.test(vuelta.texto), 'al volver a leer sale el logo y «(salvado por el marcador)»');
  ok(Math.abs(vuelta.frac - m2.frac) < 0.01, `y te deja justo donde ibas (${vuelta.frac.toFixed(3)} contra ${m2.frac} guardado)`);
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/tiras-marcador-${ancho}.png` });
  await pg.waitForTimeout(2900);
  ok(await pg.evaluate(() => document.querySelector('#sello').hidden), 'el sello se va solo');
  /* cerrar la app CON el lector abierto: al abrirla otra vez te regresa sola */
  await pg.evaluate(() => { const m = JSON.parse(localStorage.getItem('tiras.marcador')); m.abierto = true; localStorage.setItem('tiras.marcador', JSON.stringify(m)); });
  await pg.reload({ waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => !document.querySelector('#lector').hidden && !document.querySelector('#sello').hidden, null, { timeout: 20000 }).catch(() => {});
  ok(await pg.evaluate(() => !document.querySelector('#lector').hidden && !document.querySelector('#sello').hidden), 'si cerraste la app leyendo, al abrirla te regresa al marcador');
  await pg.waitForTimeout(400);
  await cerrarLector(pg);
  await pg.waitForFunction(() => !window.__tiras.ocupado, null, { timeout: 30000 });
  await pg.waitForTimeout(200);
  ok(new RegExp(`${leidos} de 12 leídos`).test(await card()), 'al cerrar, la tarjeta cuenta lo leído');
  ok(/5 listos/.test(await card()), 'y vuelve a dejar 5 listos de los que siguen — ' + (await card()).replace(/\s+/g, ' '));
  // y si se sigue leyendo, va preparando más: el maratón no se acaba en los 5
  await pg.click('#leerTodo');
  await pg.waitForFunction(() => document.querySelectorAll('#scroll .cap').length >= 1);
  for (let i = 0; i < 400; i++) {
    const fin = await pg.evaluate(() => { const s = document.querySelector('#scroll'); s.scrollTop += s.clientHeight / 2; return s.scrollTop + s.clientHeight >= s.scrollHeight - 2; });
    await pg.waitForTimeout(50);
    if (fin && !(await pg.evaluate(() => window.__tiras.ocupado)) && /Ya leíste todo lo que hay/.test(await pg.textContent('.al-final'))) break;
  }
  ok(await leidosAhora() === 12 && /Ya leíste todo lo que hay/.test(await pg.textContent('.al-final')), `leyendo seguido prepara los que faltan solo, hasta el último (${await leidosAhora()} de 12)`);
  await cerrarLector(pg);
  await pg.waitForFunction(() => !window.__tiras.ocupado, null, { timeout: 30000 });
  ok(/12 de 12 leídos/.test(await card()) && await pg.isDisabled('.serie button[data-a="leer"]'), 'y al terminar la serie, «Leer» se apaga');

  // un archivo
  /* la ficha: tocar la portada la abre con todos los episodios en orden, y uno abre el lector ahí */
  await pg.click('.serie .portada');
  await pg.waitForSelector('#ficha:not([hidden])');
  const ficha = await pg.evaluate(() => ({ titulo: document.querySelector('#fTitulo').textContent, n: document.querySelectorAll('#fCaps .f-cap').length,
    orden: [...document.querySelectorAll('#fCaps .f-cap')].map((b) => +b.dataset.n), leidos: document.querySelectorAll('#fCaps .etq.leido').length, img: document.querySelector('#fPortada').naturalWidth }));
  ok(/Mi Serié & Co/.test(ficha.titulo) && ficha.img === 300, 'la ficha abre en grande con su portada y su nombre');
  ok(ficha.n === 12 && ficha.orden.every((x, k) => x === k + 1), 'y abajo los 12 episodios en orden');
  ok(ficha.leidos === 12, `marca cuáles ya leíste (${ficha.leidos})`);
  ok(!(await desborde(pg)), 'la ficha no se sale de lado');
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/tiras-ficha-${ancho}.png` });
  await pg.click('#fCaps .f-cap[data-n="4"]');
  await pg.waitForSelector('#lector:not([hidden])');
  await pg.waitForFunction(() => document.querySelector('#scroll .cap'));
  ok(await pg.evaluate(() => document.querySelector('#scroll .cap').dataset.n) === '4', 'tocar el episodio 4 abre el lector justo en el 4 (aunque ya estuviera leído)');
  await cerrarLector(pg);
  /* desde el inicio: tiras.html?ficha=<serie> abre la ficha y ?leer=<serie> el lector */
  { const id = await pg.evaluate(() => document.querySelector('.serie').dataset.id);
    await pg.goto(BASE + '&ficha=' + encodeURIComponent(id)); await pg.waitForSelector('#ficha:not([hidden])', { timeout: 10000 }).catch(() => {});
    ok(await pg.evaluate(() => !document.querySelector('#ficha').hidden), 'el inicio puede abrir directo la ficha de una serie');
    await pg.goto(BASE + '&leer=' + encodeURIComponent(id)); await pg.waitForSelector('#lector:not([hidden])', { timeout: 10000 }).catch(() => {});
    ok(await pg.evaluate(() => !document.querySelector('#lector').hidden), 'y directo el lector de esa serie («Seguir leyendo»)');
    await cerrarLector(pg); }
  await pg.click('.serie button[data-a="archivo"]');
  await pg.fill('#aDesde', '1'); await pg.fill('#aHasta', '3');
  ok(await desborde(pg) <= 0, 'la hoja del archivo no se sale de la pantalla');
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }), pg.click('#armar')]);
  const pdf = fs.readFileSync(await dl.path());
  const cuenta = +(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/.exec(pdf.toString('latin1')) || [])[1];
  ok(pdf.slice(0, 5).toString() === '%PDF-' && cuenta === 3 * (1 + POR), `el PDF de los caps 1 a 3 trae ${cuenta} páginas: título + 3 imágenes por capítulo`);
  ok(/Mi Serié & Co \(1-3\)\.pdf/.test(dl.suggestedFilename()), `con nombre de la serie y el rango (${dl.suggestedFilename()})`);
  fs.writeFileSync(path.join(tmp, 'a.pdf'), pdf);
  await pg.click('#cerrarArchivo');

  // Wattpad por búsqueda
  await pg.fill('#buscar', 'amor'); await pg.click('#agregar');
  await pg.waitForSelector('.resultado');
  ok(await pg.locator('#resultados .resultado').count() === 3 && /GabriellaFL · 3 partes/.test(await pg.textContent('#resultados')) && /Amor en cómic/.test(await pg.textContent('#resultados')), 'buscar por nombre trae cómics de Webtoon y textos de Wattpad, a la vez');
  await pg.click('#resultados .resultado button[data-i="1"]');
  await pg.waitForFunction(() => document.querySelectorAll('.serie').length === 2);
  await pg.waitForFunction(() => !window.__tiras.ocupado, null, { timeout: 30000 });
  await pg.waitForTimeout(200);
  const wp = () => pg.textContent('.serie[data-id="wattpad:9001"]');
  ok(/Wattpad · texto/.test(await wp()) && /3 listos/.test(await wp()), 'la sigue y prepara sus 3 partes');
  // el texto llega limpio
  await pg.click('.serie[data-id="wattpad:9001"] button[data-a="leer"]');
  await pg.waitForFunction(() => document.querySelector('#scroll .texto'));
  const limpio = await pg.evaluate(() => { const t = document.querySelector('#scroll .texto'); return { p: t.querySelectorAll('p').length, b: !!t.querySelector('b'), malo: !!t.querySelector('script,img,[onclick],[style],[onerror]'), hack: !!window.__hackeado }; });
  ok(limpio.p >= 2 && limpio.b && !limpio.malo && !limpio.hack, 'el texto de Wattpad llega con párrafos y negritas, sin scripts, imágenes ni atributos');
  await cerrarLector(pg);
  await pg.click('.serie[data-id="wattpad:9001"] button[data-a="archivo"]');
  await pg.fill('#aDesde', '1'); await pg.fill('#aHasta', '3');
  const [dl2] = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }), pg.click('#armar')]);
  const ep = fs.readFileSync(await dl2.path()), lat = ep.toString('latin1');
  ok(ep.slice(0, 2).toString() === 'PK' && lat.slice(30, 38) === 'mimetype' && /application\/epub\+zip/.test(lat.slice(0, 80)), 'el EPUB empieza con su «mimetype» sin comprimir, como pide el formato');
  ok((lat.match(/OEBPS\/cap\d{4}\.xhtml/g) || []).length >= 3 && /Dos: el silencio/.test(Buffer.from(ep).toString('utf8')), 'y trae las 3 partes con su título');
  await pg.click('#cerrarArchivo');

  // por link de una parte de Wattpad: reconoce la historia y no la duplica
  await pg.fill('#buscar', 'https://www.wattpad.com/502-dos-el-silencio'); await pg.click('#agregar');
  await pg.waitForFunction(() => /Ya sigues Amor roto/.test(document.querySelector('#estadoTxt').textContent));
  ok(await pg.locator('.serie').count() === 2, 'el link de una parte encuentra su historia y no la repite');

  // intercalado: se vuelve a dejar pendiente la serie de Webtoon
  await pg.evaluate(async () => { const s = (await window.__tiras.todasSeries())[0]; s.leidos = [1, 2, 3, 4, 5, 6, 7, 8, 9]; const d = await new Promise((ok) => { const q = indexedDB.open('inkwell-tiras'); q.onsuccess = () => ok(q.result); }); await new Promise((ok) => { const t = d.transaction('series', 'readwrite'); t.objectStore('series').put(s); t.oncomplete = ok; }); d.close(); });
  await pg.evaluate(() => { document.querySelector('#ajustesCaja').open = true; });
  await pg.selectOption('#orden', 'intercalado');
  const orden = await pg.evaluate(async () => { const s = await window.__tiras.todasSeries(); return s.map((x) => x.id); });
  await pg.click('#leerTodo');
  await pg.waitForFunction(() => document.querySelectorAll('#scroll .cap').length >= 1);
  await pg.evaluate(() => { const s = document.querySelector('#scroll'); s.scrollTop = s.scrollHeight; });   // en la compu el primero es alto: el segundo llega al bajar
  await pg.waitForFunction(() => document.querySelectorAll('#scroll .cap').length >= 2);
  const series2 = await pg.evaluate(() => [...document.querySelectorAll('#scroll .cap')].slice(0, 2).map((c) => c.dataset.serie));
  ok(series2[0] !== series2[1] && orden.includes(series2[0]), 'en «Intercalado» va un capítulo de cada serie');
  await cerrarLector(pg);

  // sobrevive a cerrar, y sin red se lee lo bajado
  await pg.reload();
  await pg.waitForFunction(() => document.querySelectorAll('.serie').length === 2);
  ok(/(9|10) de 12 leídos/.test(await card()) && await pg.inputValue('#orden') === 'intercalado', 'las series, lo leído y los ajustes sobreviven a cerrar');
  await pg.evaluate(() => window.__tiras.preparar());          // que termine la que arrancó al abrir
  await ctx.setOffline(true);
  await pg.evaluate(() => window.__tiras.preparar());
  ok(/Sin internet/.test(await pg.textContent('#estadoTxt')), 'sin red lo dice y no intenta bajar');
  await pg.click('#leerTodo');
  await pg.waitForFunction(() => document.querySelectorAll('#scroll .cap').length >= 1);
  ok(await pg.evaluate(() => [...document.querySelectorAll('#scroll .cap img, #scroll .cap .texto')].length) > 0, 'y se puede leer lo bajado sin internet');
  await cerrarLector(pg);
  await ctx.setOffline(false);

  // quitar una serie
  await pg.click('.serie[data-id="wattpad:9001"] button[data-a="mas"]');
  await pg.click('#quitarSerie');
  await pg.waitForFunction(() => document.querySelectorAll('.serie').length === 1);
  ok(await pg.evaluate(async () => (await window.__tiras.clavesDe('wattpad:9001')).size) === 0, '«Quitar» borra la serie y todo lo bajado de ella');

  ok(await desborde(pg) <= 0, 'al final tampoco se sale nada');
  const chicos = await pg.evaluate(() => [...document.querySelectorAll('button, input, select')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.id || e.textContent.trim().slice(0, 16)));
  ok(!chicos.length, 'todo lo que se toca mide 44 px o más' + (chicos.length ? ' — ' + chicos.join(', ') : ''));
  ok(!errores.length, 'ni un error en la consola' + (errores.length ? ' — ' + errores.slice(0, 3).join(' | ') : ''));
  if (process.env.CAPTURA) await pg.screenshot({ path: `${process.env.CAPTURA}/tiras-${ancho}.png`, fullPage: true });
  await ctx.close();
}

/* ── compartir y descubrir (4 nov) ── */
console.log('\ncompartir el código y descubrir cómics');
{
  const { codigoDe, leerCodigo, seriesDeRanking, elegirNuevas } = await import('./compartir.js');
  const refs = [{ fuente: 'webtoon', ref: { lang: 'es', genero: 'fantasy', slug: 'mi-serie', titleNo: '777', canvas: false } }, { fuente: 'wattpad', ref: { story: '9001' } }];
  const cod = codigoDe(refs);
  ok(/^INK1\.[\w-]+$/.test(cod) && cod.length < 120, 'el código es corto y cabe en un link');
  const de = leerCodigo('mira: https://x/inkwell/tiras.html#series=' + cod);
  ok(de && de.length === 2 && de[0].titleNo === '777' && de[1].story === '9001', 'el código se lee igual desde el link');
  ok(leerCodigo('hola') === null && leerCodigo('INK1.basura!!') === null, 'algo que no es código no se confunde');
  const rk = seriesDeRanking(ranking);
  ok(rk.length === 2 && elegirNuevas(rk, { sigo: ['webtoon:777'] })[0].titleNo === '888', 'del ranking se escoge la que no sigues');
  ok(!elegirNuevas(rk, { sigo: ['webtoon:777'], descartadas: ['webtoon:888'] }).length, 'la que quitaste no vuelve');

  /* ⚠ waitForFunction con una promesa regresa al instante (CLAUDE.md): se espera a mano */
  const esperar = async (p, fn, ms = 30000) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ if(await p.evaluate(fn)) return true; await p.waitForTimeout(250); } return false; };
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); pg.on('dialog', (d) => d.accept());
  await pg.goto(BASE);
  await pg.fill('#buscar', 'https://www.webtoons.com/es/fantasy/mi-serie/list?title_no=777'); await pg.press('#buscar', 'Enter');
  await esperar(pg, async () => (await window.__tiras.todasSeries()).length === 1 && !window.__tiras.ocupado);
  /* con 5 listos (menos de 6) ya «queda poco»: al revisar, busca */
  rankingOn = true;
  await pg.click('#revisar');
  await esperar(pg, async () => (await window.__tiras.todasSeries()).length === 2 && !window.__tiras.ocupado);
  const ss = await pg.evaluate(async () => (await window.__tiras.todasSeries()).map((s) => [s.id, !!s.descubierta]));
  ok(ss.length === 2 && ss[1][0] === 'webtoon:888' && ss[1][1], 'cuando queda poco, agrega sola un cómic del ranking');
  ok(/sugerida para ti/.test(await pg.textContent('#series')), 'y dice que es sugerida');
  await pg.evaluate(() => { navigator.share = undefined; });
  await pg.click('#compartir');
  await esperar(pg, () => !!document.querySelector('#codigo').value, 5000);
  const link = await pg.inputValue('#codigo');
  ok(/#series=INK1\./.test(link), '«Compartir mis series» da el link');
  /* otro teléfono abre el link */
  const ctx2 = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const pg2 = await ctx2.newPage(); pg2.on('dialog', (d) => d.accept()); pg2.on('pageerror', (e) => errores.push(e.message));
  rankingOn = false;
  await pg2.goto(BASE + '#series=' + link.split('#series=')[1]);
  await esperar(pg2, async () => (await window.__tiras.todasSeries()).length === 2);
  ok((await pg2.evaluate(async () => (await window.__tiras.todasSeries()).length)) === 2, 'quien abre el link recibe todas las series de un jalón');
  ok(!(await pg2.evaluate(() => location.hash)), 'y el link se limpia para no volver a preguntar');
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));
  await ctx.close(); await ctx2.close();
}

/* ── explorar por categoría y todo en archivos ── */
console.log('\ncategorías y todo en archivos');
{
  const esperar = async (p, fn, ms = 30000) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ if(await p.evaluate(fn)) return true; await p.waitForTimeout(250); } return false; };
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message)); pg.on('dialog', (d) => d.accept());
  await pg.goto(BASE);
  ok((await pg.$$eval('#genero option', (o) => o.length)) >= 10, 'hay una lista de categorías');
  await pg.selectOption('#genero', 'fantasy'); await pg.click('#formGenero button[type=submit]');
  await pg.waitForSelector('#porGenero .resultado', { timeout: 15000 }).catch(() => {});
  ok(/Otra serie & más/.test(await pg.textContent('#porGenero')), 'la categoría enseña sus cómics con nombre y autor');
  await pg.click('#porGenero button[data-i="0"]');
  await esperar(pg, async () => (await window.__tiras.todasSeries()).length === 1 && !window.__tiras.ocupado);
  ok((await pg.evaluate(async () => (await window.__tiras.todasSeries())[0].id)) === 'webtoon:888', '«Seguir» desde la categoría la agrega');
  /* una segunda serie para que «todo» sea de verdad todo */
  await pg.fill('#buscar', 'https://www.webtoons.com/es/fantasy/mi-serie/list?title_no=777'); await pg.press('#buscar', 'Enter');
  await esperar(pg, async () => (await window.__tiras.todasSeries()).length === 2 && !window.__tiras.ocupado);
  const bajadas = []; pg.on('download', (d) => bajadas.push(d.suggestedFilename()));
  await pg.click('#todoArchivo'); await pg.click('#todoEmpezar');
  await esperar(pg, () => /Listo: \d+ archivo/.test(document.querySelector('#tEstado').textContent), 60000);
  await pg.waitForTimeout(800);
  ok(bajadas.length === 2 && bajadas.every((n) => /\(1-12\)\.pdf$/.test(n)), '«Descargar todo» arma un PDF por serie con TODOS sus capítulos · ' + bajadas.join(', '));
  ok(!(await desborde(pg)), 'la hoja de «todo» no se sale de lado');
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));
  await ctx.close();
}
console.log('\nque quepa más: las páginas se aprietan');
{
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const pg = await ctx.newPage(); const errores = []; pg.on('pageerror', (e) => errores.push(e.message));
  await pg.goto(BASE);
  const r = await pg.evaluate(async () => {
    /* una página «de Webtoon»: 800 px, con ruido para que pese como una de verdad */
    const c = document.createElement('canvas'); c.width = 800; c.height = 1280; const x = c.getContext('2d');
    const im = x.createImageData(800, 1280); for (let i = 0; i < im.data.length; i += 4){ const v = (i / 4) % 800 / 4 + Math.random() * 40; im.data[i] = v; im.data[i + 1] = 255 - v; im.data[i + 2] = 120; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0);
    const b = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.95));
    const { compactar } = await import('./tiras.js');
    const n = await compactar(b, 'si'), m = await compactar(b, 'maximo'), igual = await compactar(b, 'no');
    const w = async (bl) => { const bm = await createImageBitmap(bl); return bm.width; };
    return { antes: b.size, si: n.size, max: m.size, wsi: await w(n), wmax: await w(m), igual: igual === b, tipo: n.type };
  });
  ok(r.si < r.antes * 0.6, `«Normal» deja la página en menos de 60 % · ${Math.round(r.antes / 1024)} KB → ${Math.round(r.si / 1024)} KB (${r.tipo})`);
  ok(r.max < r.si && r.wmax === 720, `«Máximo» aprieta más y topa a 720 px · ${Math.round(r.max / 1024)} KB`);
  ok(r.wsi === 800, 'una página de 800 px no se encoge en «Normal» (el tope es 900)');
  ok(r.igual, '«Sin ahorro» la deja como viene');
  await pg.evaluate(() => { document.querySelector('#ajustesCaja').open = true; });
  await pg.selectOption('#compacto', 'maximo');
  ok((await pg.evaluate(() => JSON.parse(localStorage.getItem('tiras.ajustes')).compacto)) === 'maximo', 'el ajuste de ahorro se guarda');
  await pg.click('#apretar');
  await pg.waitForFunction(() => /Ya estaba todo apretado|Listo: \d+ capítulos/.test(document.querySelector('#estadoTxt').textContent), null, { timeout: 15000 });
  ok(true, '«Apretar lo que ya está bajado» termina y lo dice');
  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ' — ' + errores.join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
