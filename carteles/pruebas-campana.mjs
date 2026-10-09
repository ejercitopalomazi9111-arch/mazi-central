/* CARTELES · pruebas de la campaña y de los estilos de moda.     node carteles/pruebas-campana.mjs
   Tres partes:
     1. sin navegador: el calendario reparte bien, las frases saben su género,
        la tanda calcula el pago y no inventa cuando no hay precio;
     2. cada estilo de moda y de campaña en los tres tamaños, con una auditoría
        de TEXTO: se anota dónde cae cada fillText y se exige que nada se salga
        del cartel ni se encime con otro texto (los letreros que mienten o se
        enciman no los ve ninguna prueba de resultados: hay que medirlos);
     3. la pantalla de Campaña de punta a punta en un navegador de verdad, a
        390 y a 1280: fotos del teléfono, quitar fondos, campaña, tanda,
        encuesta, visor y ZIP con una carpeta por día.                       */
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';
import { planCampana, MODA } from './calendario.js';
import { categorizar, tuyo, llamados } from './frases.js';
import { planTanda, pagoDiario, planEncuesta } from './campanas.js';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let bien = 0, mal = 0;
const ok = (c, t) => { if (c) { bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };

/* ───────────── 1 · sin navegador ───────────── */
console.log('\nsin navegador');
const cats = ['sudadera', 'tenis', 'bolsa', 'botas', 'playera', 'tienda'];
const prods = Array.from({ length: 40 }, (_, i) => ({ id: 'p' + i, cat: cats[i % cats.length], recortada: i % 6 !== 5 && i % 7 !== 0 }));
const plan = planCampana(prods, { dias: 15, porDia: 10, historias: 4, semilla: 7, inicio: '2026-10-10' });
const todos = plan.flatMap(d => d.anuncios);
ok(plan.length === 15 && plan.every(d => d.anuncios.length === 10), `15 días × 10 anuncios (${todos.length})`);
ok(plan.every(d => d.anuncios.filter(a => a.formato === 'historia').length === 4), '4 historias por día');
ok(plan[0].etiqueta === 'Día 01 · sáb 10 oct' && plan[14].etiqueta === 'Día 15 · sáb 24 oct', `las fechas cuadran (${plan[0].etiqueta} … ${plan[14].etiqueta})`);
ok(plan.every(d => { const ids = d.anuncios.filter(a => a.fotos.length === 1).map(a => a.fotos[0]); return new Set(ids).size === ids.length; }), 'ninguna prenda sale dos veces el mismo día');
ok(plan.every(d => { const e = d.anuncios.map(a => a.estilo); return new Set(e).size >= 8; }), 'cada día lleva al menos 8 estilos distintos');
const usos = new Map(); todos.forEach(a => a.fotos.forEach(f => usos.set(f, (usos.get(f) || 0) + 1)));
ok(usos.size === prods.length, `todas las fotos salen (${usos.size} de ${prods.length})`);
ok(todos.every(a => a.fotos.length > 1 || (prods.find(p => p.id === a.fotos[0]).cat === 'tienda' ? ['vitrina', 'portada'].includes(a.estilo) : true)), 'la foto de la tienda sólo va en vitrina o portada');
ok(todos.every(a => a.estilo !== 'color' || prods.find(p => p.id === a.fotos[0]).recortada), '«Su color» sólo con prendas recortadas');
ok(plan.every(d => d.anuncios.some(a => a.estilo === 'coleccion') && d.anuncios.some(a => a.estilo === 'mosaico')), 'cada día trae una colección y un mosaico');
ok(todos.every(a => a.prod.frase && a.prod.cta && a.prod.kicker), 'todos traen titular, línea chica y llamado');
ok(todos.filter(a => a.formato === 'historia' && a.fotos.length === 1).every(a => /Responde|DM/.test(a.prod.cta)), 'las historias piden responder o DM');
const otra = planCampana(prods, { dias: 15, porDia: 10, historias: 4, semilla: 8 });
ok(JSON.stringify(otra.map(d => d.anuncios.map(a => a.estilo))) !== JSON.stringify(plan.map(d => d.anuncios.map(a => a.estilo))), 'otra mezcla da otro reparto');
ok(JSON.stringify(planCampana(prods, { dias: 3, semilla: 7 })) === JSON.stringify(planCampana(prods, { dias: 3, semilla: 7 })), 'la misma mezcla da lo mismo (se puede rehacer)');
ok(planCampana(prods, { dias: 2, estilos: ['maison', 'estudio'] }).flatMap(d => d.anuncios).filter(a => a.fotos.length === 1 && prods.find(p => p.id === a.fotos[0]).cat !== 'tienda').every(a => ['maison', 'estudio'].includes(a.estilo)), 'respeta los estilos elegidos');
ok(planCampana([], {}).length === 0, 'sin fotos no truena');

for (const [t, c] of [['sudadera negra true religion', 'sudadera'], ['botas de piel con cadena', 'botas'], ['tenis deportivos de bota', 'tenis'], ['anaquel con bolsas y cosméticos', 'tienda'], ['perfume boss eau de toilette', 'locion'], ['IMG 1072', 'producto'], ['Pantalones de mezclilla', 'pantalon']])
  ok(categorizar(t) === c, `«${t}» → ${c}`);
ok(tuyo('sudadera') === 'la tuya' && tuyo('tenis') === 'los tuyos' && tuyo('botas') === 'las tuyas' && tuyo('pantalon') === 'el tuyo', 'el llamado sabe su género');
ok(llamados('tenis').includes('Pregunta por tu número') && !llamados('bolsa').some(l => /talla/.test(l)), 'tallas a la ropa, números al calzado, a la bolsa ninguno');

ok(pagoDiario('$450', 15) === 30 && pagoDiario('$1,000', 15) === 67 && pagoDiario('', 15) === 0, 'pago diario: $450/15 = $30; $1,000/15 = $67 (hacia arriba); sin precio, nada');
const t1 = planTanda({ cat: 'playera', cosa: 'playera', plural: 'playeras', genero: 'la', personas: 15, precio: '$450' });
ok(t1.filter(a => a.nombre.startsWith('Avance')).length === 15, 'la tanda trae 15 avances diarios');
ok(t1.some(a => a.prod.pasos?.some(p => p.includes('$30'))), 'con precio, los pasos dicen «$30»');
const t2 = planTanda({ cat: 'pantalon', cosa: 'pantalón', plural: 'pantalones', genero: 'el', personas: 12, avance: false });
ok(!JSON.stringify(t2).includes('$') && t2.every(a => !a.nombre.startsWith('Avance')), 'sin precio no aparece ningún «$»; sin avance, no hay avances');
ok(t2.some(a => a.prod.personas === 12) && JSON.stringify(t2).includes('12 lugares'), 'respeta 12 personas');
const prox = x => x.find(a => a.nombre === '10-proxima-tanda');
ok(prox(planTanda({ cat: 'playera', cosa: 'playera', plural: 'playeras', fotos: ['a', 'b'] }))?.estilo === 'coleccion', 'con dos recortes, la próxima tanda va en colección');
ok(prox(planTanda({ cat: 'playera', cosa: 'playera', plural: 'playeras', fotos: ['a'], completas: ['a', 'b', 'c'] }))?.estilo === 'mosaico', 'sin recortes que alcancen, la próxima tanda sale igual, en mosaico con las fotos completas');
ok(!prox(planTanda({ cat: 'playera', cosa: 'playera', plural: 'playeras', fotos: [], completas: ['a'] })), 'con una sola foto no hay próxima tanda');
ok(planEncuesta({ a: 'Chamarras', b: 'Lociones' }).length === 2, 'la encuesta trae publicación e historia');

/* ───────────── el servidor de archivos ───────────── */
const TIPOS = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm' };
const srv = http.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(RAIZ, u); if (!f.startsWith(RAIZ)) { s.writeHead(403); s.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); s.end(d); });
}).listen(0);
const BASE = `http://localhost:${srv.address().port}/carteles/`;
const br = await chromium.launch();

/* imágenes de prueba hechas aquí: una «sudadera» sobre gris, la misma recortada, un logo blanco sobre negro */
const DIBUJOS = `
window.dibujos = async () => {
  const lienzo = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d')); return c; };
  const prenda = (x, color) => { x.fillStyle = color; x.beginPath(); x.moveTo(250, 150); x.lineTo(550, 150); x.lineTo(700, 300); x.lineTo(620, 380); x.lineTo(560, 330); x.lineTo(560, 750); x.lineTo(240, 750); x.lineTo(240, 330); x.lineTo(180, 380); x.lineTo(100, 300); x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(330, 320, 140, 60); };
  const foto = lienzo(800, 900, x => { x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, 800, 900); prenda(x, '#2E5E40'); });
  const recorte = lienzo(800, 900, x => prenda(x, '#7A2C2C'));
  const logo = lienzo(600, 400, x => { x.fillStyle = '#000'; x.fillRect(0, 0, 600, 400); x.fillStyle = '#fff'; x.font = 'bold 120px serif'; x.textAlign = 'center'; x.fillText('Lux', 300, 230); x.fillRect(120, 280, 360, 8); });
  const aImg = c => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = c.toDataURL('image/png'); });
  return { foto: await aImg(foto), recorte: await aImg(recorte), logo: await aImg(logo) };
};`;

/* ───────────── 2 · cada estilo, auditado ───────────── */
console.log('\ncada estilo en los tres tamaños, con la auditoría de texto');
{
  const pg = await br.newPage({ viewport: { width: 1100, height: 900 } }); const errores = [];
  pg.on('pageerror', e => errores.push(e.message));
  await pg.goto(BASE + 'index.html'); await pg.waitForFunction(() => document.querySelector('#c-estilos button'), null, { timeout: 30000 });
  await pg.addScriptTag({ content: DIBUJOS });
  const r = await pg.evaluate(async () => {
    const { pintar, ESTILOS } = await import('./motor.js'); await import('./moda.js'); await import('./campanas.js');
    const { logoLimpio } = await import('./moda.js');
    const { preparar } = await import('./recursos.js'); const rec = await preparar();
    const d = await window.dibujos();
    // el logo blanco sobre negro se vuelve transparente y de una tinta
    const L = logoLimpio(d.logo), lx = L.img.getContext('2d').getImageData(0, 0, L.img.width, L.img.height).data;
    const logo = { tinta: L.tinta, esquina: lx[3], centro: lx[((L.img.height >> 1) * L.img.width + (L.img.width >> 1)) * 4 + 3] };
    // la auditoría
    const reg = [], P = CanvasRenderingContext2D.prototype, orig = P.fillText;
    P.fillText = function (t, x, y, ...rest) {
      if (this.canvas.id === 'auditado' && String(t).trim()) {
        const m = this.measureText(t), al = this.textAlign, w = m.width, x0 = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x;
        const a = m.actualBoundingBoxAscent || 0, de = m.actualBoundingBoxDescent || 0, T = this.getTransform();
        const pts = [[x0, y - a], [x0 + w, y - a], [x0, y + de], [x0 + w, y + de]].map(([u, v]) => [T.a * u + T.c * v + T.e, T.b * u + T.d * v + T.f]);
        reg.push({ t: String(t), x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])), base: T.b * x + T.d * y + T.f, font: this.font, rot: Math.abs(T.b) > .01 });
      }
      return orig.call(this, t, x, y, ...rest);
    };
    const c = document.createElement('canvas'); c.id = 'auditado';
    const marca = { nombre: 'Lux', logo: d.logo, colores: { acento: '#CDAE74', fondo: '#0B0B0B', texto: '#FFFFFF' }, whatsapp: '442 883 3786' };
    const largos = { kicker: 'Nueva colección otoño invierno de temporada', frase: 'Una frase de titular bastante larga para ver que se acomoda sola en el espacio', nombre: 'Sudadera con capucha y cierre', cta: 'Pide la tuya por mensaje directo', precio: '$1,299', antes: '$1,899', promo: '-30%' };
    const fallas = [], estilos = ESTILOS.filter(e => e.grupo === 'moda' || e.grupo === 'campana');
    let n = 0;
    for (const e of estilos) for (const formato of ['feed', 'historia', 'cuadro']) for (const [foto, txt] of [[d.recorte, {}], [d.foto, largos]]) {
      const prod = { ...txt, foto, fotos: [d.recorte, d.foto, d.recorte, d.foto, d.recorte, d.foto], fotosA: [d.recorte], fotosB: [d.recorte, d.recorte], cosa: 'playera', personas: 15, dia: 7, icono: 'shirt',
        pasos: ['Apartas uno de los 15 lugares', 'Cada día das tu parte', 'Cada día alguien estrena, hasta que los 15 tengan su playera'], opcionA: 'Chamarras', opcionB: 'Lociones' };
      const o = { marca, prod, estilo: e.id, formato, semilla: 3, numero: 4 };
      pintar(c, o, rec); await rec.listos(); reg.length = 0; pintar(c, o, rec); n++;
      const W = c.width, H = c.height;
      for (const b of reg) if (b.x0 < -2 || b.x1 > W + 2 || b.y0 < -2 || b.y1 > H + 2) fallas.push(`${e.id}/${formato}: «${b.t}» se sale`);
      for (let i = 0; i < reg.length; i++) for (let j = i + 1; j < reg.length; j++) {
        const a = reg[i], b = reg[j]; if (a.rot || b.rot || (Math.abs(a.base - b.base) < 2 && a.font === b.font)) continue;
        if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 3 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 3) fallas.push(`${e.id}/${formato}: «${a.t}» encima de «${b.t}»`);
      }
      // que no salga en blanco: hay variedad de pixeles
      const px = c.getContext('2d').getImageData(0, 0, W, H).data; const vistos = new Set(); for (let i = 0; i < px.length; i += 4 * 997) vistos.add(px[i] >> 4 << 8 | px[i + 1] >> 4 << 4 | px[i + 2] >> 4);
      if (vistos.size < 6) fallas.push(`${e.id}/${formato}: salió casi liso`);
    }
    P.fillText = orig;
    return { n, fallas: [...new Set(fallas)], logo, estilos: estilos.length };
  });
  ok(r.estilos >= 24, `${r.estilos} estilos de moda y de campaña registrados`);
  ok(r.logo.esquina === 0 && r.logo.centro > 0 && r.logo.tinta, `el logo blanco sobre negro queda transparente y de una tinta (esquina ${r.logo.esquina}, centro ${r.logo.centro})`);
  ok(!r.fallas.length, `${r.n} carteles sin texto fuera ni encimado` + (r.fallas.length ? ':\n      ' + r.fallas.slice(0, 12).join('\n      ') : ''));
  ok(!errores.length, 'ni un error al pintarlos' + (errores.length ? ' — ' + errores.slice(0, 3).join(' | ') : ''));
  await pg.close();
}

/* ───────────── 3 · la pantalla de Campaña ───────────── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'campana-'));
const ruido = /TensorFlow Lite|XNNPACK|Created .* delegate/;
for (const [ancho, alto, nombre] of [[390, 844, 'teléfono'], [1280, 800, 'computadora']]) {
  console.log(`\nCampaña en ${nombre} ${ancho}×${alto}`);
  const ctx = await br.newContext({ viewport: { width: ancho, height: alto }, acceptDownloads: true });
  const pg = await ctx.newPage(); const errores = [];
  pg.on('pageerror', e => errores.push(e.message)); pg.on('console', m => m.type() === 'error' && !ruido.test(m.text()) && errores.push(m.text()));
  await pg.goto(BASE); await pg.waitForFunction(() => document.querySelector('#c-estilos button'), null, { timeout: 30000 });
  // fotos de prueba al disco (una vez)
  if (!fs.existsSync(path.join(tmp, 'sudadera roja.png'))) {
    await pg.addScriptTag({ content: DIBUJOS });
    const datos = await pg.evaluate(async () => { const d = await window.dibujos(); const a = i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/png').split(',')[1]; };
      const otra = (col) => { const c = document.createElement('canvas'); c.width = 800; c.height = 900; const x = c.getContext('2d'); x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, 800, 900); x.fillStyle = col; x.fillRect(220, 200, 360, 520); return c.toDataURL('image/jpeg', .9).split(',')[1]; };
      return { foto: a(d.foto), logo: a(d.logo), azul: otra('#1F3FBF'), cafe: otra('#6B3E1E'), negro: otra('#151515'), blanco: otra('#F0F0F0') }; });
    fs.writeFileSync(path.join(tmp, 'sudadera roja.png'), Buffer.from(datos.foto, 'base64'));
    fs.writeFileSync(path.join(tmp, 'logo.png'), Buffer.from(datos.logo, 'base64'));
    for (const [n, k] of [['sudadera azul.jpg', 'azul'], ['bolsa cafe.jpg', 'cafe'], ['tenis negros.jpg', 'negro'], ['playera blanca.jpg', 'blanco'], ['sudadera negra.jpg', 'negro']]) fs.writeFileSync(path.join(tmp, n), Buffer.from(datos[k], 'base64'));
  }
  ok(await pg.evaluate(() => !document.querySelector('#p-campana').hidden), 'abre en «Campaña»');
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('#c-delTel')]);
  await fc.setFiles(['sudadera roja.png', 'sudadera azul.jpg', 'bolsa cafe.jpg', 'tenis negros.jpg', 'playera blanca.jpg', 'sudadera negra.jpg'].map(n => path.join(tmp, n)));
  await pg.waitForFunction(() => document.querySelectorAll('.fichaFoto').length === 6, null, { timeout: 60000 });
  ok(true, 'las 6 fotos del teléfono aparecen');
  const catsVistas = await pg.$$eval('.fichaFoto select', ss => ss.map(s => s.value));
  ok(catsVistas.filter(c => c === 'sudadera').length === 3 && catsVistas.includes('tenis') && catsVistas.includes('bolsa') && catsVistas.includes('playera'), `la categoría sale del nombre del archivo (${catsVistas.join(', ')})`);
  await pg.click('#c-recortar');
  await pg.waitForFunction(() => /Listo|no cargó/.test(document.querySelector('#c-estadoFotos').textContent), null, { timeout: 300000 });
  const recortadas = await pg.locator('.fichaFoto img.recortada').count();
  ok(recortadas >= 3, `quitar los fondos recorta (${recortadas} de 6) — ${(await pg.textContent('#c-estadoFotos')).slice(0, 60)}`);
  // tocar ✂ alterna recorte / foto completa
  const boton = pg.locator('.fichaFoto .acciones button:nth-child(2):not([disabled])').first();
  if (await boton.count()) { const a = await boton.textContent(); await boton.click(); await pg.waitForTimeout(200); ok((await pg.locator('.fichaFoto .acciones button:nth-child(2):not([disabled])').first().textContent()) !== a, '✂ alterna entre recorte y foto completa'); await pg.locator('.fichaFoto .acciones button:nth-child(2):not([disabled])').first().click(); }
  // campaña chica
  await pg.fill('#c-dias', '2'); await pg.fill('#c-porDia', '6'); await pg.fill('#c-historias', '2');
  await pg.click('#c-hacer');
  await pg.waitForFunction(() => /Listos/.test(document.querySelector('#c-estadoHacer').textContent), null, { timeout: 120000 });
  ok(await pg.locator('.grupo').count() === 2 && await pg.locator('.miniAnuncio').count() === 12, `2 días × 6 = ${await pg.locator('.miniAnuncio').count()} anuncios, en dos grupos`);
  ok(await pg.locator('.miniAnuncio.historia').count() === 4, '2 historias por día');
  // tanda y encuesta
  await pg.fill('#c-tPrecio', '$450'); await pg.click('#c-tHacer');
  await pg.waitForFunction(() => [...document.querySelectorAll('.grupo h3')].some(h => /Tanda/.test(h.textContent)) && /Listos/.test(document.querySelector('#c-estadoHacer').textContent), null, { timeout: 120000 });
  const enTanda = await pg.evaluate(() => [...document.querySelectorAll('.grupo')].find(g => /Tanda/.test(g.querySelector('h3').textContent)).querySelectorAll('.miniAnuncio').length);
  ok(enTanda >= 24, `la tanda trae sus anuncios y los 15 avances (${enTanda})`);
  await pg.click('#c-eHacer');
  await pg.waitForFunction(() => [...document.querySelectorAll('.grupo h3')].some(h => /Encuesta/.test(h.textContent)), null, { timeout: 60000 });
  ok(true, 'la encuesta sale en su grupo');
  // el visor: otra versión cambia el anuncio
  await pg.locator('.miniAnuncio').first().click(); await pg.waitForSelector('#c-visor[open]');
  const src0 = await pg.getAttribute('#c-visorCuerpo img', 'src');
  await pg.click('#c-visorCuerpo button:has-text("Otra versión")'); await pg.waitForFunction(s => document.querySelector('#c-visorCuerpo img').src !== s, src0, { timeout: 30000 });
  ok(true, '«Otra versión» rehace el anuncio');
  ok(await pg.evaluate(() => document.querySelector('#c-visor').scrollWidth <= document.querySelector('#c-visor').clientWidth + 1), 'el visor no se desborda por dentro');
  await pg.click('#c-visor .cerrar');
  // ZIP con carpeta por día
  const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#c-bajarTodo')]);
  const zb = fs.readFileSync(await dl.path()), txt = zb.toString('utf8');
  ok(zb.slice(0, 2).toString() === 'PK' && /Día 01[^/]*\/01-publicacion-/.test(txt) && /Tanda de playeras\/Avance diario\/Dia 15\.jpg/.test(txt), `el ZIP trae una carpeta por día y la tanda con su avance (${dl.suggestedFilename()})`);
  ok(await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, 'nada se sale de la pantalla');
  const chicos = await pg.evaluate(() => [...document.querySelectorAll('#p-campana button, #p-campana select, #p-campana input')].filter(e => e.offsetParent && (e.type === 'checkbox' ? e.closest('label') : e).getBoundingClientRect().height < 44 && !e.closest('.galeria')).map(e => e.id || e.textContent.trim()));
  ok(!chicos.length, 'todo lo que se toca mide 44 px o más' + (chicos.length ? ' — ' + chicos.slice(0, 5).join(', ') : ''));
  ok(!(await pg.textContent('#p-campana')).includes('null'), 'ningún «null» escrito en la pantalla');
  // sobrevive a recargar
  await pg.reload(); await pg.waitForFunction(() => document.querySelectorAll('.fichaFoto').length === 6, null, { timeout: 30000 });
  ok(await pg.locator('.fichaFoto img.recortada').count() === recortadas, 'las fotos y sus recortes sobreviven a recargar');
  ok(!errores.length, 'ni un error en la consola' + (errores.length ? ' — ' + errores.slice(0, 3).join(' | ') : ''));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
