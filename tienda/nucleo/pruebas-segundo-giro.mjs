#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   PRUEBA DE FUEGO DEL SEGUNDO GIRO · `node tienda/nucleo/pruebas-segundo-giro.mjs`
   ──────────────────────────────────────────────────────────────────────────
   El Bloque 13 dice: la mercancía variada (ropa, termos, tazas) sale SÓLO con
   configuración. Aquí la app entera corre en un navegador con el negocio de
   datos/giros/variada.json y unos productos de ejemplo — sin tocar una línea
   de código — y se comprueba que la tienda del cliente funciona completa.

   No toca la base: sembrar un negocio nuevo pide la llave del servidor. Las
   peticiones a Supabase se contestan aquí mismo con esa configuración; lo que
   se prueba es que el CÓDIGO no sabe ni le importa de qué giro es.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const TIENDA = join(dirname(fileURLToPath(import.meta.url)), '..');
const giro = JSON.parse(readFileSync(join(TIENDA, 'datos/giros/variada.json'), 'utf8'));
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };

/* ── El negocio, como lo dejaría sembrar_negocio(variada.json) ──────────── */
const negocio = { id: randomUUID(), slug: giro.slug, nombre: giro.nombre, giro: giro.giro, marca: giro.marca, ajustes: { ...giro.ajustes,
  envio: { costo: 80, gratis_desde: 800, zona: 'Querétaro', recoger: true }, pagos: { efectivo: true, transferencia: false } } };
const categorias = giro.categorias.map((c, i) => ({ id: randomUUID(), clave: c.id, nombre: c.nombre, icono: c.icono, orden: i, plantilla: c.plantilla, padre_id: null }));
const cat = (clave) => categorias.find((c) => c.clave === clave).id;
const P = (nombre, marca, clave, precio, campos = {}, extra = {}) => ({ id: randomUUID(), categoria_id: cat(clave), nombre, marca, descripcion: '', precio, precio_antes: null,
  campos, fotos: [], sku: null, codigo_barras: null, ...extra });
const productos = [
  P('Camiseta básica algodón', 'Hecho Aquí', 'ropa', 199, { talla: 'M', corte: 'Unisex', color: 'Negro', material: 'Algodón' }),
  P('Sudadera con gorro', 'Hecho Aquí', 'ropa', 549, { talla: 'G', corte: 'Unisex', color: 'Gris' }, { precio_antes: 649 }),
  P('Tumbler acero 40 oz', 'Frío Siempre', 'termos', 389, { capacidad: '1.2 L', material: 'Acero inoxidable', frio_caliente: true }),
  P('Vaso térmico con popote', 'Frío Siempre', 'termos', 259, { capacidad: '600 ml', material: 'Acero inoxidable' }),
  P('Mug de cerámica 350 ml', 'Casa', 'tazas', 129, { capacidad: '350 ml', material: 'Cerámica', microondas: true }),
  P('Taza de peltre', 'Casa', 'tazas', 99, { material: 'Peltre', microondas: false }),
  P('Gorra bordada', 'Hecho Aquí', 'accesorios', 279, { tipo: 'Gorra', color: 'Azul' }),
  P('Caja de regalo sorpresa', 'Casa', 'regalos', 450, { ocasion: 'Cumpleaños', personalizable: true }),
];
const existencias = productos.map((p, i) => ({ producto_id: p.id, negocio_id: negocio.id, cantidad: i === 5 ? 0 : 3 + i * 4, apartado: 0, minimo: 2 }));

/* Contesta como PostgREST: un objeto si piden uno, si no un arreglo. */
function contestar(url, accept){
  const u = new URL(url), tabla = u.pathname.split('/').pop();
  const datos = { negocios: [negocio], categorias, productos, existencias }[tabla] ?? [];
  const uno = /vnd\.pgrst\.object/.test(accept || '');
  return { status: 200, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(0, datos.length - 1)}/${datos.length}` }, body: JSON.stringify(uno ? (datos[0] ?? null) : datos) };
}

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const servidor = createServer((req, res) => {
  const ruta = join(TIENDA, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!ruta.startsWith(TIENDA)){ res.writeHead(403).end(); return; }
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream' }).end(readFileSync(ruta)); }catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/index.html?negocio=${giro.slug}`;

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const navegador = await chromium.launch();
const PALABRAS_DE_OTRO_GIRO = /\b(barber[ií]a|cera|navaja|shampoo|tinte|wahl|peinado)\b/i;

for(const [ancho, alto] of [[390, 844], [1280, 800]]){
  console.log(`\n· Mercancía variada a ${ancho} × ${alto}`);
  // Sin trabajador de fondo: aquí se prueban las pantallas, y el modo sin red va en pruebas-sin-red.mjs.
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, serviceWorkers: 'block' });
  await ctx.routeWebSocket(/^wss:\/\//, () => {});
  await ctx.route(/^https:\/\//, (r) => {
    const url = r.request().url();
    if(/\/rest\/v1\//.test(url)) return r.fulfill(contestar(url, r.request().headers()['accept']));
    return r.fulfill({ status: 404, body: '' });
  });
  await ctx.addInitScript(() => { try{ sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){} });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if(m.type() === 'error' && !/404/.test(m.text())) errores.push(m.text()); });
  const ir = async (hash) => {
    await p.goto(BASE + '#' + hash);
    await p.waitForFunction(() => { const c = document.querySelector('#contenido'); return c && !c.querySelector('[aria-busy="true"]') && c.children.length; }, null, { timeout: 20000 });
    await p.waitForTimeout(200);
    return p.$eval('#contenido', (e) => e.innerText);
  };
  const texto = await ir('/');
  ok('la marca es la del giro', (await p.title()).includes(giro.marca.nombre_corto), await p.title());
  ok('la portada enseña sus cinco categorías', giro.categorias.every((c) => texto.includes(c.nombre)), texto.slice(0, 200));
  ok('la oferta de la sudadera sale en Ofertas', /Ofertas[\s\S]*Sudadera/.test(texto));
  ok('ni una palabra de otro giro en la portada', !PALABRAS_DE_OTRO_GIRO.test(texto), (texto.match(PALABRAS_DE_OTRO_GIRO) || [])[0]);
  const rotas = await p.$$eval('#contenido img', (l) => l.filter((i) => !i.getAttribute('src')).length);
  ok('sin fotos, ninguna imagen rota: recuadros con ícono', rotas === 0 && (await p.$$('#contenido .sin-foto')).length > 0, rotas);

  const cat = await ir('/c/termos');
  ok('la categoría Termos lista sus dos productos', /Tumbler/.test(cat) && /Vaso térmico/.test(cat), cat.slice(0, 200));
  const tumbler = productos.find((x) => x.nombre.startsWith('Tumbler'));
  const ficha = await ir('/p/' + tumbler.id);
  ok('la ficha enseña los campos de SU plantilla (capacidad, material, frío y caliente)', /Capacidad[\s\S]*1\.2 L/.test(ficha) && /Material[\s\S]*Acero inoxidable/.test(ficha) && /Mantiene frío y caliente/.test(ficha), ficha.slice(0, 300));
  const agotada = await ir('/p/' + productos[5].id);
  ok('la taza de peltre sale agotada', /Agotado/.test(agotada));

  await ir('/buscar');
  // «cachucha» no está en ningún nombre ni categoría: sólo la encuentra el sinónimo del giro.
  await p.fill('#q', 'cachucha'); await p.waitForTimeout(200);
  const busca = await p.$eval('#resultados', (e) => e.innerText);
  ok('buscar «cachucha» encuentra la gorra (sinónimo del giro, no del código)', /Gorra/.test(busca), busca.slice(0, 160));
  await p.fill('#q', 'playera'); await p.waitForTimeout(200);
  ok('buscar «playera» encuentra la camiseta', /Camiseta/.test(await p.$eval('#resultados', (e) => e.innerText)));
  const ejemplos = await p.evaluate(() => { const q = document.querySelector('#q'); q.value = ''; q.dispatchEvent(new Event('input')); return document.querySelector('#resultados').innerText; });
  ok('los ejemplos del buscador salen de SU catálogo', /ropa/.test(ejemplos) && !PALABRAS_DE_OTRO_GIRO.test(ejemplos), ejemplos);

  await ir('/p/' + tumbler.id);
  await p.click('[data-agregar]'); await p.waitForTimeout(150);
  const carro = await ir('/carrito');
  ok('se agrega al carrito y cobra su precio', /Tumbler/.test(carro) && /\$389/.test(carro), carro.slice(0, 200));
  ok('nada se sale a lo ancho', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok('cero errores de consola', !errores.length, errores.join(' | '));
  // CAPTURA=/carpeta para guardar cómo se ve la portada.
  if(process.env.CAPTURA){ await ir('/'); await p.screenshot({ path: join(process.env.CAPTURA, `segundo-giro-${ancho}.png`), fullPage: true }); }
  await ctx.close();
}
await navegador.close(); servidor.close();
console.log(`\n${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
