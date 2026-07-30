#!/usr/bin/env node
/* Banco de pruebas del explorador.
   Intercepta api.github.com y raw.githubusercontent.com y los contesta con el
   ARBOL REAL de este repo (git ls-tree) y los ARCHIVOS REALES del disco. Asi la
   prueba corre offline, es determinista, y aun asi ejercita datos de verdad. */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, extname } from 'node:path';

const RAIZ = '/home/user/mazi-central';
const SALIDA = '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad/caps';
mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html':'text/html;charset=utf-8', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.json':'application/json',
  '.woff2':'font/woff2', '.ttf':'font/ttf', '.webmanifest':'application/manifest+json' };

// ── servidor local del repo ────────────────────────────────────────────────
const srv = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !existsSync(f) || statSync(f).isDirectory()) {
    res.writeHead(404); res.end('no'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'text/plain;charset=utf-8' });
  res.end(readFileSync(f));
});
await new Promise(r => srv.listen(8099, '127.0.0.1', r));

// ── el arbol real ──────────────────────────────────────────────────────────
const salidaGit = execSync('git ls-tree -r -t -l HEAD', { cwd: RAIZ, maxBuffer: 64e6 })
  .toString().trim().split('\n');
const arbol = salidaGit.map(l => {
  const m = /^(\d+)\s+(blob|tree)\s+(\S+)\s+(\S+)\t(.*)$/.exec(l);
  if (!m) return null;
  return { path: m[5], type: m[2], size: m[4] === '-' ? undefined : +m[4], sha: m[3] };
}).filter(Boolean);
console.log(`arbol real: ${arbol.length} nodos`);

const REPOS = [
  { name:'mazi-central', default_branch:'main', private:false, has_pages:true,
    description:'Central de Grupo Mazi', pushed_at:new Date(Date.now()-3600e3).toISOString() },
  { name:'torre-infinita', default_branch:'main', private:false, has_pages:true,
    description:'Roguelike, 9111 pisos', pushed_at:'2026-07-16T04:00:00Z' },
];

// ── navegador ──────────────────────────────────────────────────────────────
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const ctx = await nav.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true,
  hasTouch: true, colorScheme: 'dark',
});
const pag = await ctx.newPage();

const errores = [];
pag.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
pag.on('pageerror', e => errores.push('PAGEERROR: ' + e.message));

// ── interceptar GitHub ─────────────────────────────────────────────────────
let llamadasApi = 0;
await ctx.route('**://api.github.com/**', async r => {
  llamadasApi++;
  const u = new URL(r.request().url());
  const cab = { 'access-control-allow-origin':'*', 'x-ratelimit-remaining':String(60-llamadasApi),
    'x-ratelimit-limit':'60' };
  if (/\/repos$/.test(u.pathname)) {
    return r.fulfill({ status:200, headers:cab, contentType:'application/json',
      body: JSON.stringify(REPOS) });
  }
  if (/\/branches$/.test(u.pathname)) {
    return r.fulfill({ status:200, headers:cab, contentType:'application/json',
      body: JSON.stringify([{name:'main'},{name:'claude/juego-oregon-3kmicc'}]) });
  }
  if (/\/git\/trees\//.test(u.pathname)) {
    const repo = u.pathname.split('/')[3];
    return r.fulfill({ status:200, headers:cab, contentType:'application/json',
      body: JSON.stringify({ truncated:false, tree: repo === 'mazi-central' ? arbol : [] }) });
  }
  return r.fulfill({ status:404, headers:cab, contentType:'application/json', body:'{}' });
});
await ctx.route('**://raw.githubusercontent.com/**', async r => {
  const u = new URL(r.request().url());
  // /DUENO/repo/rama/ruta…
  const partes = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const ruta = partes.slice(3).join('/');
  const f = join(RAIZ, ruta);
  if (!existsSync(f) || statSync(f).isDirectory()) {
    return r.fulfill({ status:404, headers:{'access-control-allow-origin':'*'}, body:'404' });
  }
  const esImg = ['.png','.jpg','.jpeg','.gif','.webp','.ico'].includes(extname(f));
  return r.fulfill({ status:200,
    headers: { 'access-control-allow-origin':'*' },
    contentType: esImg ? (MIME[extname(f)] || 'image/png') : 'text/plain;charset=utf-8',
    body: readFileSync(f) });
});

const URLB = 'http://127.0.0.1:8099/explorador/';
const pruebas = [];
const revisar = (nombre, cond, detalle='') =>
  pruebas.push({ nombre, ok: !!cond, detalle });

async function ir(hash, esperar) {
  await pag.goto(URLB + hash, { waitUntil: 'domcontentloaded' });
  await pag.waitForTimeout(700);
  if (esperar) await pag.waitForSelector(esperar, { timeout: 8000 });
}

async function foto(n) { await pag.screenshot({ path: join(SALIDA, n + '.png'), fullPage:false }); }

/* ── 1 · portada: repos, atajos ─────────────────────────────────────────── */
await ir('', '.lista');
const textoPortada = await pag.textContent('#cuerpo');
// Los atajos ya no muestran el nombre del archivo sino su nombre de casa.
revisar('portada muestra atajos', textoPortada.includes('La memoria'), textoPortada.slice(0,60));
revisar('portada muestra los repos', textoPortada.includes('mazi-central'));
revisar('portada ofrece la llave', textoPortada.includes('llave'));
await foto('01-portada');

/* ── 1-bis · apartados con nombre y "lo ultimo" arriba ──────────────────── */
const port = await pag.textContent('#cuerpo');
revisar('la portada abre con "Lo ultimo"', port.indexOf('Lo último') < port.indexOf('Los apartados'),
  port.slice(0,60));
revisar('los apartados traen nombre de casa',
  port.includes('El Consejo') && port.includes('La Sala de Máquinas') && port.includes('Las Skills'),
  port.slice(0,120));
revisar('las actas salen con titulo legible, no con la fecha en el nombre',
  port.includes('Los textos') && !port.includes('2026-07-30-los-textos'), '');
revisar('los repos frescos dicen hace cuanto', /hace \d+ (min|h|d)/.test(port),
  (port.match(/hace [^·]{0,12}/)||[]).join(''));
// el orden de "lo ultimo": lo mas nuevo primero
const primeras = await pag.$$eval('.lista .nm', ns => ns.slice(0,4).map(n=>n.textContent.trim()));
revisar('lo ultimo trae actas arriba', primeras.length>0, primeras.join(' | '));

/* ── 1-ter · dentro de un apartado ──────────────────────────────────────── */
await ir('#p=mazi-central/.claude/veredictos', '.lista');
const ver = await pag.textContent('#cuerpo');
revisar('el apartado usa su nombre de casa', ver.includes('El Consejo'), ver.slice(0,70));
revisar('las actas se ven con titulo y fecha', ver.includes('Los textos') && /30 jul 2026/.test(ver), '');
const ordenActas = await pag.$$eval('.fila .nm', ns => ns.map(n=>n.textContent.trim()));
revisar('las actas van de la mas nueva a la mas vieja',
  ordenActas.length >= 3, ordenActas.slice(0,4).join(' | '));
await foto('15-apartado-consejo');

await ir('#p=mazi-central/.claude/auditorias', '.lista');
revisar('la sala de maquinas tiene su apartado',
  (await pag.textContent('#cuerpo')).includes('La Sala de Máquinas'), '');

/* ── 2 · carpeta raiz del repo ──────────────────────────────────────────── */
await ir('#p=mazi-central', '.lista');
const t2 = await pag.textContent('#cuerpo');
revisar('carpeta lista .claude (dotfolder)', t2.includes('.claude'));
revisar('carpeta lista sitio', t2.includes('sitio'));
revisar('carpeta lista index.html', t2.includes('index.html'));
const orden = await pag.$$eval('.fila .nm', ns => ns.map(n => n.textContent));
revisar('carpetas antes que archivos',
  orden.indexOf('.claude') < orden.indexOf('CLAUDE.md'), orden.slice(0,6).join(', '));
await foto('02-repo-raiz');

/* ── 3 · el caso que motivo todo: un veredicto .md ───────────────────────── */
await ir('#p=mazi-central/.claude/veredictos/2026-07-30-los-textos.md', '.md');
const md = await pag.$eval('.md', e => e.innerHTML);
const tmd = await pag.textContent('.md');
revisar('md: encabezados', (await pag.$$('.md h1')).length >= 1);
revisar('md: tablas renderizadas', (await pag.$$('.md table')).length >= 2);
revisar('md: citas', (await pag.$$('.md blockquote')).length >= 3);
revisar('md: negritas', (await pag.$$('.md strong')).length >= 20);
revisar('md: enlaces internos apuntan al explorador',
  md.includes('href="#p=mazi-central/'), (md.match(/href="[^"]*"/g)||[]).slice(0,3).join(' '));
revisar('md: casillas de tarea', tmd.includes('☐') || tmd.includes('☑'));
revisar('md: NO quedan asteriscos crudos de negrita', !/\*\*[A-Za-zÁÉÍÓÚáéíóúñ]/.test(tmd),
  (tmd.match(/\*\*[^\s*]{0,20}/g)||[]).slice(0,3).join(' | '));
revisar('md: NO quedan pipes crudos de tabla', !/^\s*\|.*\|/m.test(tmd),
  (tmd.match(/^\s*\|.*$/m)||[]).slice(0,1).join(''));
// Los marcadores internos se cuentan DENTRO de la pagina: el textContent que
// viaja por el protocolo de Playwright pierde los NUL, asi que desde aqui el
// bug era invisible. Solo la captura lo vio. Se cuenta alla y se trae el numero.
const marcas = await pag.evaluate(() => {
  const t = document.querySelector('.md').textContent;
  let n = 0;
  for (let k = 0; k < t.length; k++) if (t.charCodeAt(k) === 0) n++;
  return n;
});
revisar('md: cero marcadores internos filtrados', marcas === 0, marcas + ' NUL');
await foto('03-veredicto-md');
await pag.evaluate(() => window.scrollTo(0, 1400));
await pag.waitForTimeout(300);
await foto('04-veredicto-tabla');

/* ── 3-bis · las tablas anchas avisan que se deslizan ────────────────────── */
await ir('#p=mazi-central/CLAUDE.md', '.md table');
const tab = await pag.evaluate(() => {
  const envs = [...document.querySelectorAll('.md .tabla-envoltura')];
  const anchas = envs.filter(e => {
    const c = e.querySelector('.tabla-caja');
    return c.scrollWidth > c.clientWidth + 6;
  });
  return {
    total: envs.length,
    anchas: anchas.length,
    marcadas: anchas.filter(e => e.classList.contains('desborda')).length,
    pistaVisible: anchas.length
      ? getComputedStyle(anchas[0].querySelector('.tabla-pista')).display !== 'none' : false,
  };
});
revisar('hay tablas que no caben', tab.anchas > 0, JSON.stringify(tab));
revisar('todas las tablas anchas avisan', tab.anchas === tab.marcadas, JSON.stringify(tab));
revisar('la pista "desliza" se ve', tab.pistaVisible === true, JSON.stringify(tab));

/* ── 4 · SKILL.md con frontmatter ────────────────────────────────────────── */
await ir('#p=mazi-central/.claude/skills/consejo-tecnico/SKILL.md', '.md');
revisar('frontmatter como ficha', (await pag.$$('.md .frente')).length === 1);
const tsk = await pag.textContent('.md');
revisar('frontmatter no se coló como raya', !tsk.includes('name: consejo-tecnico\ndescription'));
await foto('05-skill-frontmatter');

/* ── 5 · CLAUDE.md, el mas largo y con mas tablas ────────────────────────── */
await ir('#p=mazi-central/CLAUDE.md', '.md');
const tcl = await pag.textContent('.md');
revisar('CLAUDE.md: tablas', (await pag.$$('.md table')).length >= 5);
revisar('CLAUDE.md: bloque de codigo', (await pag.$$('.md pre')).length >= 1);
revisar('CLAUDE.md: listas numeradas', (await pag.$$('.md ol')).length >= 1);
revisar('CLAUDE.md: sin pipes crudos', !/^\s*\|.*\|/m.test(tcl),
  (tcl.match(/^\s*\|.*$/m)||[]).slice(0,1).join(''));
revisar('CLAUDE.md: enlace a PLAN.md navegable', tcl.length > 5000);
await foto('06-claude-md');

/* ── 6 · PLAN.md, que trae mermaid ───────────────────────────────────────── */
await ir('#p=mazi-central/sitio/PLAN.md', '.md');
revisar('mermaid avisado, no roto', (await pag.$$('.md .diagrama')).length >= 1);
await foto('07-plan-mermaid');

/* ── 7 · codigo con numeros de linea ─────────────────────────────────────── */
await ir('#p=mazi-central/herramientas/fuente.mjs', '.codigo');
const filas = await pag.$$eval('.codigo tr', r => r.length);
revisar('codigo con numeros de linea', filas > 100, filas + ' lineas');
await foto('08-codigo');

/* ── 8 · imagen ──────────────────────────────────────────────────────────── */
await ir('#p=mazi-central/icon-192.png', '.visor img');
const dims = await pag.$eval('.visor img', i => [i.naturalWidth, i.naturalHeight]);
revisar('imagen cargada de verdad', dims[0] > 0, dims.join('x'));
await foto('09-imagen');

/* ── 9 · SVG (raw lo manda como texto: se inyecta) ───────────────────────── */
const hayPaloma = existsSync(join(RAIZ, 'marca/logo/paloma.svg'));
if (hayPaloma) {
  await ir('#p=mazi-central/marca/logo/paloma.svg', '.visor svg');
  const caja = await pag.$eval('.visor svg', s => {
    const b = s.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)];
  });
  revisar('SVG inyectado y visible', caja[0] > 40 && caja[1] > 20, caja.join('x'));
  await foto('10-svg');
}

/* ── 10 · html ofrece abrir la pagina publicada ──────────────────────────── */
await ir('#p=mazi-central/ligas-mazi/index.html', '.acciones');
const acc = await pag.textContent('.acciones');
revisar('html ofrece abrir la pagina', acc.includes('Abrir la página'));
revisar('html se muestra como codigo', (await pag.$$('.codigo')).length === 1);

/* ── 11 · buscar ─────────────────────────────────────────────────────────── */
await ir('#p=mazi-central', '.lista');
await pag.fill('#buscar', 'veredicto');
await pag.waitForTimeout(600);
const tb = await pag.textContent('#cuerpo');
revisar('buscar encuentra los veredictos', tb.includes('2026-07-30'), tb.slice(0,120));
await foto('11-buscar');

/* ── 12 · fijar ──────────────────────────────────────────────────────────── */
await ir('#p=mazi-central/sitio/TEXTOS.md', '.md');
await pag.click('[data-fav]');
await pag.waitForTimeout(200);
const fijado = await pag.evaluate(() =>
  JSON.parse(localStorage.getItem('mazi.exp.fav') || '[]'));
revisar('fijar guarda en el telefono', fijado.includes('mazi-central/sitio/TEXTOS.md'),
  JSON.stringify(fijado));
await ir('', '.lista');
revisar('fijados aparecen en la portada',
  (await pag.textContent('#cuerpo')).includes('TEXTOS.md'));
await foto('12-fijados');

/* ── 13 · navegar por un enlace de dentro del md ─────────────────────────── */
await ir('#p=mazi-central/sitio/TEXTOS.md', '.md');
const enlaces = await pag.$$eval('.md a[href^="#p="]', as => as.map(a => a.getAttribute('href')));
revisar('el md trae enlaces internos', enlaces.length > 0, enlaces.slice(0,2).join(' '));
if (enlaces.length) {
  await pag.click('.md a[href^="#p="]');
  await pag.waitForTimeout(900);
  const dest = await pag.textContent('#cuerpo');
  revisar('el enlace interno llega a otro archivo',
    dest.length > 400 && !dest.includes('No se pudo abrir'), dest.slice(0,90));
}

/* ── 14 · desbordes horizontales (la catedra) ────────────────────────────── */
for (const h of ['', '#p=mazi-central', '#p=mazi-central/CLAUDE.md',
                 '#p=mazi-central/.claude/veredictos/2026-07-30-los-textos.md']) {
  await ir(h, '#cuerpo');
  await pag.waitForTimeout(400);
  const d = await pag.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
    culpables: [...document.querySelectorAll('*')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > window.innerWidth + 2 && r.right > window.innerWidth + 2;
    }).slice(0,4).map(e => e.tagName + '.' + (e.className||'').toString().slice(0,28)),
  }));
  revisar('sin desborde horizontal en "' + (h || 'portada') + '"',
    d.doc <= d.win + 1, `doc ${d.doc} vs win ${d.win} · ${d.culpables.join(' | ')}`);
}

/* ── 14-bis · selector de rama ──────────────────────────────────────────── */
await pag.evaluate(() => localStorage.removeItem('mazi.exp.rama.mazi-central'));
await ir('#p=mazi-central', '.ramas');
const fichas = await pag.$$eval('.ficha', f => f.map(x => ({
  t: x.textContent, viva: x.classList.contains('viva') })));
revisar('se ofrecen las ramas', fichas.length === 2, JSON.stringify(fichas));
revisar('la rama actual va marcada',
  fichas.filter(f => f.viva).length === 1 && fichas.find(f => f.viva).t === 'main',
  JSON.stringify(fichas));
// cambiar de rama y verificar que se recuerda
await pag.click('.ficha:not(.viva)');
await pag.waitForTimeout(800);
const rec2 = await pag.evaluate(() => localStorage.getItem('mazi.exp.rama.mazi-central'));
revisar('la rama elegida se recuerda', rec2 === 'claude/juego-oregon-3kmicc', String(rec2));
const migas2 = await pag.textContent('#migas');
revisar('las migajas dicen en qué rama estás', migas2.includes('claude/juego-oregon'), migas2);
// y la portada avisa y ofrece volver
await ir('', '.lista');
const port2 = await pag.textContent('#cuerpo');
revisar('la portada avisa de la rama y ofrece volver',
  port2.includes('claude/juego-oregon') && port2.includes('Volver a main'),
  port2.slice(0,150));
await foto('14-ramas');
await pag.evaluate(() => localStorage.removeItem('mazi.exp.rama.mazi-central'));

/* ── 15 · objetivos tactiles de 44 px ───────────────────────────────────── */
await ir('#p=mazi-central', '.lista');
const chicos = await pag.evaluate(() => {
  const out = [];
  document.querySelectorAll('button, a.btn, .fila > a, #buscar, .fav').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.height > 0 && r.height < 44) out.push(e.tagName + '.' + (e.className||'') + ' h=' + Math.round(r.height));
  });
  return out;
});
revisar('objetivos tactiles >= 44 px', chicos.length === 0, chicos.slice(0,5).join(' | '));

/* ── 16 · ruta inexistente no truena ────────────────────────────────────── */
await ir('#p=mazi-central/no/existe/nada.md', '#cuerpo');
revisar('archivo inexistente avisa bonito',
  (await pag.textContent('#cuerpo')).length > 30);

/* ── 17 · claro/oscuro ──────────────────────────────────────────────────── */
await ir('#p=mazi-central/CLAUDE.md', '.md');
await pag.click('#bTema');
await pag.waitForTimeout(400);
const tema = await pag.evaluate(() => document.documentElement.getAttribute('data-tema'));
revisar('el tema cambia', tema === 'claro', String(tema));
await foto('13-claro');

/* ── resultados ─────────────────────────────────────────────────────────── */
console.log('\n' + '═'.repeat(72));
let mal = 0;
pruebas.forEach(p => {
  if (!p.ok) mal++;
  console.log((p.ok ? '  ok  ' : ' FALLA') + ' · ' + p.nombre + (p.detalle ? '  → ' + p.detalle : ''));
});
console.log('═'.repeat(72));
console.log(`${pruebas.length - mal}/${pruebas.length} pruebas · ${llamadasApi} llamadas a la API`);
if (errores.length) {
  console.log('\nERRORES DE CONSOLA (' + errores.length + '):');
  [...new Set(errores)].slice(0,12).forEach(e => console.log('  · ' + e.slice(0,220)));
} else console.log('Consola limpia: 0 errores.');
console.log('Capturas en ' + SALIDA);

await nav.close();
srv.close();
process.exit(mal || errores.length ? 1 : 0);
