/* ══════════════════════════════════════════════════════════════════════════
   PRUEBAS DE RUTAS · que ningún botón lleve a la nada
   ──────────────────────────────────────────────────────────────────────────
   Nació de la queja de Carlos sobre Ligas Mazi: «hay como cuatro botones que te
   llevan al mismo lado, pero en otros apartados no funcionan». Dos mitades:

   1. EN FRÍO (sin navegador): la tabla de rutas y el código.
      · rutas únicas, cada una con su pantalla y su ícono;
      · dos entradas del menú nunca con el mismo título;
      · cada ícono que el código pide EXISTE — se leen todas las comillas dentro
        de icono(…), también las de un ternario: así se escapó `menos`;
      · cero enlaces escritos a mano (`href="#/`): todos pasan por enlace().
   2. EN UN NAVEGADOR DE VERDAD, a 390 y a 1280, contra la base real:
      · cada ruta pinta su título, sin errores de consola;
      · ningún control tocable de menos de 44 px;
      · nada se sale a lo ancho.

   Y las MUTACIONES: cada compuerta en frío se prueba rompiéndola a propósito
   (enlace a mano, ruta duplicada, ícono que no existe). Si una mutación pasa en
   verde, la compuerta no sirve.

   Uso:  node tienda/nucleo/pruebas-rutas.mjs          (todo)
         node tienda/nucleo/pruebas-rutas.mjs --frio   (sólo la mitad sin navegador)

   El navegador del contenedor no sale a internet por sí solo: cada petición
   https se reenvía desde Node por el proxy (request.newContext), que sí confía
   en su certificado. Así se prueba contra la base real sin apagar la
   verificación de TLS.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const NUCLEO = dirname(fileURLToPath(import.meta.url));
const TIENDA = join(NUCLEO, '..');
const { RUTAS, APARTADOS } = await import('./rutas.js');
const { ICONOS } = await import('./iconos.js');

let bien = 0, mal = 0;
const ok = (nombre, cond, detalle = '') => {
  if(cond){ bien++; console.log('  ✓ ' + nombre); }
  else{ mal++; console.log('  ✗ ' + nombre + (detalle ? '\n      ' + detalle : '')); }
  return cond;
};

/* ── Fuentes de la tienda (sin datos, sin vendor, sin pruebas) ─────────── */
function fuentes(dir = TIENDA){
  const salida = [];
  for(const n of readdirSync(dir)){
    const r = join(dir, n);
    if(statSync(r).isDirectory()){
      if(['vendor', 'datos', 'supabase', 'muestra', 'letra', 'node_modules'].includes(n)) continue;
      salida.push(...fuentes(r));
    }else if(/\.(js|html)$/.test(n) && !n.startsWith('pruebas')) salida.push({ ruta: r.slice(TIENDA.length + 1), texto: readFileSync(r, 'utf8') });
  }
  return salida;
}

/* ── Las compuertas en frío, como funciones: la prueba y la mutación usan las
   mismas, así que lo que se muta es exactamente lo que se revisa. ────────── */
const duplicadas = (rutas) => rutas.map((r) => r.ruta).filter((r, i, a) => a.indexOf(r) !== i);
const titulosRepetidos = (rutas) => {
  const menu = rutas.filter((r) => r.menu).map((r) => r.apartado + ' · ' + r.titulo);
  return menu.filter((t, i, a) => a.indexOf(t) !== i);
};
const iconosQueFaltan = (rutas, apartados, codigo, iconos) => {
  const pedidos = new Set([...rutas.map((r) => r.icono), ...apartados.map((a) => a.icono)]);
  for(const { texto } of codigo)
    for(const m of sinComentarios(texto).matchAll(/\bicono\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)){
      // Sólo el PRIMER argumento (el segundo es la clase) y sin las comillas
      // que son parte de una comparación: en icono(t === 'mal' ? 'alerta' : 'listo')
      // los íconos son 'alerta' y 'listo', no 'mal'.
      const primero = m[1].split(/,(?![^(]*\))/)[0];
      for(const s of primero.matchAll(/'([a-z][a-z0-9-]*)'/g))
        if(!/[=!]==?\s*$/.test(primero.slice(0, s.index))) pedidos.add(s[1]);
    }
  return [...pedidos].filter((n) => !(n in iconos));
};
/* Los comentarios se quitan conservando los saltos de línea, para que el número
   de renglón que se reporta siga siendo el del archivo. */
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
const enlacesAMano = (codigo) => codigo.flatMap(({ ruta, texto }) => {
  const limpio = sinComentarios(texto);
  return [...limpio.matchAll(/href=["'`]#\//g)].map((m) => `${ruta}:${limpio.slice(0, m.index).split('\n').length}`);
});
const pantallasQueFaltan = (rutas, conocidas) => rutas.filter((r) => !conocidas.has(r.pantalla)).map((r) => `${r.ruta} → ${r.pantalla}`);

function exportadasDe(codigo){
  // Las pantallas que existen: las del mapa PANTALLAS de cada archivo, más las
  // que el armazón agrega (obra, noexiste).
  const s = new Set(['obra', 'noexiste']);
  for(const { texto } of codigo){
    const m = texto.match(/export const PANTALLAS\s*=\s*\{([^}]*)\}/);
    if(m) for(const k of m[1].split(',')) s.add(k.split(':')[0].trim());
  }
  return s;
}

console.log('\n· En frío');
const codigo = fuentes();
ok('la tabla tiene rutas de los cuatro apartados', APARTADOS.length === 4 && APARTADOS.every((a) => RUTAS.some((r) => r.apartado === a.id && r.menu)),
   APARTADOS.map((a) => a.id).join(', '));
ok('cada ruta es de un apartado que existe', RUTAS.every((r) => APARTADOS.some((a) => a.id === r.apartado)));
ok('ninguna ruta repetida', !duplicadas(RUTAS).length, duplicadas(RUTAS).join(', '));
ok('dos entradas del menú nunca con el mismo título', !titulosRepetidos(RUTAS).length, titulosRepetidos(RUTAS).join(', '));
ok('cada ruta tiene su pantalla', !pantallasQueFaltan(RUTAS, exportadasDe(codigo)).length, pantallasQueFaltan(RUTAS, exportadasDe(codigo)).join(', '));
ok('cada ruta con parámetro trae un ejemplo con qué probarla', RUTAS.filter((r) => r.ruta.includes(':')).every((r) => r.ejemplo));
ok('cada ruta dice qué va a hacer', RUTAS.every((r) => (r.promesa || '').length > 10));
const faltan = iconosQueFaltan(RUTAS, APARTADOS, codigo, ICONOS);
ok('cada ícono que se pide existe (también los de un ternario)', !faltan.length, faltan.join(', '));
ok('cero enlaces escritos a mano', !enlacesAMano(codigo).length, enlacesAMano(codigo).join(', '));

console.log('\n· Mutaciones: cada compuerta tiene que ponerse roja');
{
  const rotas = [...RUTAS, { ...RUTAS[0] }];
  ok('una ruta duplicada se caza', duplicadas(rotas).length === 1);
  const titulo = [...RUTAS, { ...RUTAS[1], ruta: '/otra' }];
  ok('un título repetido en el menú se caza', titulosRepetidos(titulo).length === 1);
  const conMenos = [...codigo, { ruta: 'mutante.js', texto: "x ? icono('no-existe') : icono('casa')" }];
  ok('un ícono inexistente dentro de un ternario se caza', iconosQueFaltan(RUTAS, APARTADOS, conMenos, ICONOS).includes('no-existe'));
  const sinIcono = { ...ICONOS }; delete sinIcono.menos;
  ok('quitar un ícono que el código usa se caza', iconosQueFaltan(RUTAS, APARTADOS, codigo, sinIcono).includes('menos'));
  const aMano = [...codigo, { ruta: 'mutante.js', texto: '<a href="#/carrito">' }];
  ok('un enlace escrito a mano se caza', enlacesAMano(aMano).length === 1);
  ok('una pantalla que no existe se caza', pantallasQueFaltan([...RUTAS, { ruta: '/x', pantalla: 'fantasma' }], exportadasDe(codigo)).length === 1);
}

if(process.argv.includes('--frio')) fin();

/* ── En un navegador de verdad ─────────────────────────────────────────── */
const { chromium, request } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const ruta = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!ruta.startsWith(TIENDA)){ res.writeHead(403).end(); return; }
  try{ const cuerpo = readFileSync(ruta); res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream' }).end(cuerpo); }
  catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/`;
const api = await request.newContext({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const navegador = await chromium.launch();

// El primer producto real, para las rutas con ejemplo '@primero'.
const primero = await (async () => {
  const cfg = readFileSync(join(TIENDA, 'config.js'), 'utf8');
  const url = cfg.match(/SUPABASE_URL = '([^']+)'/)[1], llave = cfg.match(/LLAVE_PUBLICABLE = '([^']+)'/)[1];
  const r = await api.get(`${url}/rest/v1/productos?select=id&activo=eq.true&order=nombre&limit=1`, { headers: { apikey: llave } });
  return (await r.json())[0]?.id;
})();

const direccion = (r) => r.ruta.replace(/:(\w+)/g, () => (r.ejemplo === '@primero' ? primero : r.ejemplo));

for(const [ancho, alto] of [[390, 844], [1280, 800]]){
  console.log(`\n· En un navegador a ${ancho} × ${alto}`);
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto } });
  await ctx.route(/^https:\/\//, async (route) => {
    try{ await route.fulfill({ response: await api.fetch(route.request()) }); }catch{ await route.abort(); }
  });
  // Sin la presentación: se ve una vez por sesión y aquí taparía cada captura.
  await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
  const pagina = await ctx.newPage();
  let errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => { if(m.type() === 'error') errores.push(m.text()); });

  await pagina.goto(BASE + 'index.html#/');
  for(const r of RUTAS){
    errores = [];
    const dir = direccion(r);
    await pagina.evaluate((d) => { location.hash = d; }, dir);
    // Listo = ya no hay esqueleto de carga en el contenido.
    await pagina.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 20000 }).catch(() => {});
    await pagina.waitForTimeout(150);
    const m = await pagina.evaluate(() => {
      const t = document.querySelector('#titulo')?.textContent.trim() || '';
      const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && !el.closest('[hidden]'); };
      const chicos = [...document.querySelectorAll('#contenido button, #contenido a.boton, #contenido input, #contenido select, .arriba button, .arriba a, .lateral button, .lateral nav a')]
        .filter(visible).filter((el) => !el.closest('.velo') && !el.closest('.lateral') || getComputedStyle(document.querySelector('.lateral')).transform === 'none')
        .map((el) => { const b = el.getBoundingClientRect(); return [el, Math.round(b.width), Math.round(b.height)]; })
        .filter(([, w, h]) => w < 44 || h < 44)
        .map(([el, w, h]) => `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} «${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20)}» ${w}×${h}`);
      return { t, chicos, ancho: document.documentElement.scrollWidth, vista: innerWidth, contenido: document.querySelector('#contenido')?.textContent.trim().length || 0 };
    });
    const bienRuta = m.t && m.contenido > 0 && !errores.length && !m.chicos.length && m.ancho <= m.vista;
    ok(`${dir} → «${m.t}»`, bienRuta,
       [!m.t && 'sin título', !m.contenido && 'contenido vacío', errores.length && 'errores: ' + errores.join(' | '),
        m.chicos.length && 'controles chicos: ' + m.chicos.slice(0, 4).join(', '), m.ancho > m.vista && `se sale a lo ancho (${m.ancho} > ${m.vista})`]
         .filter(Boolean).join(' · '));
  }
  await ctx.close();
}
await navegador.close(); await api.dispose(); servidor.close();
fin();

function fin(){
  console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
  process.exit(mal ? 1 : 0);
}
