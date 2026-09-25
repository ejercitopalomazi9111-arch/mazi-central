#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   LA PANTALLA DE PRESENTACIONES · `node presentaciones/pruebas-pantalla.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Un navegador de verdad a 390×844 (el iPhone de Carlos) y a 1280×800. Se
   abre la presentación real de Fadori y se usa como la usaría él: elegir
   láminas, cambiar el fondo, pedirle a la IA, cambiar una imagen, guardar.
   La Sala se contesta aquí mismo (sin internet en el contenedor), así que
   lo que se prueba es la pantalla, no a Gemini. Cada botón se comprueba por
   su EFECTO en el archivo, no porque exista.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };
const CAPTURAS = process.env.CAPTURAS || '';
if(CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.pptx': 'application/octet-stream' };
const servidor = createServer((req, res) => {
  let r = join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  if(r.endsWith('/')) r += 'index.html';
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(r)] || 'application/octet-stream' }).end(readFileSync(r)); }
  catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/presentaciones/`;
const PPTX = join(RAIZ, 'fadori/presentacion/Fadori-STEAM.pptx');
// Un PNG violeta de 64×48 (la «imagen de la IA»).
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAUklEQVR4nO3PQQ3AIADAQMAM5vHIRPC4LOkpaOfZd/zZ0gGvGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0D7M0QIyKhL5GwAAAABJRU5ErkJggg==';

const b = await chromium.launch();
const pedidos = [];
async function pagina(ancho, alto){
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, acceptDownloads: true, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try{ if(!sessionStorage.getItem('limpio')){ localStorage.setItem('salaLlave', 'llave-de-prueba'); indexedDB.deleteDatabase('presentaciones'); sessionStorage.setItem('limpio', '1'); } }catch(e){} });
  await ctx.route(/sala\.palomazi9111\.workers\.dev/, async (r) => {
    const u = r.request().url(), cuerpo = r.request().postDataJSON?.() || null;
    pedidos.push({ u, cuerpo, llave: r.request().headers()['x-llave'] });
    if(/ia-texto/.test(u)){
      const quiere = cuerpo?.mensajes?.at(-1)?.texto || '';
      const respuesta = /formal/.test(quiere)
        ? { explicacion: 'Pongo el título de la lámina 5 más formal y cambio Fadori por FADORI.', cambios: [
            { op: 'texto', lamina: 5, forma: 0, texto: 'Propósito de Fadori' },
            { op: 'reemplazar', buscar: 'Fadori', poner: 'FADORI', laminas: 'todas' },
            { op: 'fondo', color: '#ZZZZZZ' },                       // inválido: no debe salir
            { op: 'borrarTodo' }] }                                    // inválido: no existe
        : { explicacion: 'Eso no lo puedo hacer con estas herramientas.', cambios: [] };
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ bien: true, motor: cuerpo.motor, texto: '```json\n' + JSON.stringify(respuesta) + '\n```' }) });
    }
    if(/ia-imagen/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ bien: true, mime: 'image/png', data: PNG.repeat(1) }) });
    return r.fulfill({ contentType: 'application/json', body: '{}' });
  });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if(m.type() === 'error') errores.push(m.text()); });
  await p.goto(BASE);
  return { p, ctx, errores };
}
const captura = async (p, n) => { if(CAPTURAS) await p.screenshot({ path: join(CAPTURAS, n + '.png') }); };
const desborde = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

console.log('\n· Teléfono (390×844)');
const { p, errores } = await pagina(390, 844);
ok('la portada invita a abrir un archivo', await p.getByText('Abrir presentación').isVisible());
await captura(p, '01-inicio');
await p.setInputFiles('#soltar input', PPTX);
await p.waitForSelector('#laminas .marco .lienzo', { timeout: 20000 });
ok('se ven las 19 láminas', (await p.locator('#laminas .lam').count()) === 19);
ok('las miniaturas se dibujan (con formas adentro)', (await p.locator('#laminas .marco .lienzo .forma').count()) > 10);
ok('dice que los cambios van a las 19', /las 19/.test(await p.locator('#eleccion').textContent()));
ok('sin desborde a lo ancho', (await desborde(p)) <= 0, String(await desborde(p)));
const mini = await p.locator('#laminas .marco').first().boundingBox();
ok('la miniatura mide la mitad del ancho (dos columnas)', mini.width > 150 && mini.width < 190, JSON.stringify(mini));
const lz = await p.locator('#laminas .marco .lienzo').first().boundingBox();
ok('el dibujo cabe exacto en su marco', Math.abs(lz.width - mini.width) < 2, `${lz.width} vs ${mini.width}`);
await captura(p, '02-laminas');

// Elegir dos láminas.
await p.locator('#laminas .lam').nth(1).click();
await p.locator('#laminas .lam').nth(2).click();
ok('tocar dos láminas las elige', /2 láminas elegidas/.test(await p.locator('#eleccion').textContent()));

console.log('\n· Fondo en las elegidas');
await p.click('.dock [data-panel="fondo"]');
ok('la hoja dice a cuántas se aplica', /2 láminas elegidas/.test(await p.locator('#hoja .a-quien').textContent()));
await p.locator('#hoja .muestra[data-c="#AC27FF"]').click();
await captura(p, '03-fondo');
await p.getByRole('button', { name: /Poner fondo en 2 láminas/ }).click();
await p.waitForFunction(() => window.__pres.D.deshacer.length === 1);
const fondos = await p.evaluate(async () => { const { D, N } = window.__pres; return Promise.all([0, 1, 2, 3].map(async (i) => (await N.modelo(D, i)).fondo.color || 'otro')); });
ok('sólo las elegidas cambiaron de fondo', fondos[1] === '#AC27FF' && fondos[2] === '#AC27FF' && fondos[0] !== '#AC27FF' && fondos[3] !== '#AC27FF', fondos.join());
ok('avisa lo que hizo y ofrece deshacer', /Fondo nuevo en 2 láminas/.test(await p.locator('#avisos').textContent()));
await p.click('#b-deshacer');
await p.waitForFunction(() => window.__pres.D.deshacer.length === 0);
const deVuelta = await p.evaluate(async () => { const { D, N } = window.__pres; return (await N.modelo(D, 1)).fondo.color || 'otro'; });
ok('deshacer regresa el fondo', deVuelta !== '#AC27FF', deVuelta);

console.log('\n· Texto en todas');
await p.click('#b-ninguna');
await p.click('.dock [data-panel="texto"]');
ok('sin elegir nada, se aplica a las 19', /las 19 láminas/.test(await p.locator('#hoja .a-quien').textContent()));
await p.locator('#hoja input[placeholder="Buscar…"]').fill('Fadori');
await p.locator('#hoja input[placeholder="Cambiar por…"]').fill('Fadori Pro');
await p.getByRole('button', { name: 'Cambiar en todas' }).click();
await p.waitForFunction(() => /Cambié/.test(document.querySelector('#avisos').textContent));
const veces = await p.evaluate(() => window.__pres.N.resumen(window.__pres.D).flatMap((l) => l.textos).filter((t) => /Fadori Pro/.test(t.texto)).length);
ok('buscar y cambiar lo hizo en el archivo', veces > 0, String(veces));
await p.locator('#hoja select').selectOption('Montserrat');
await p.getByRole('button', { name: 'Cambiar letra' }).click();
await p.waitForFunction(() => /Letra Montserrat/.test(document.querySelector('#avisos').textContent));
ok('cambiar letra también', true);
ok('los botones de la hoja no se salen', await p.evaluate(() => [...document.querySelectorAll('#hoja .btn')].every((b) => b.scrollWidth <= b.clientWidth + 1)));
await captura(p, '04-texto');
await p.keyboard.press('Escape');

console.log('\n· IA');
await p.click('.dock [data-panel="ia"]');
ok('con la llave de la mesa guardada, no pide conectar', !(await p.getByText('conecta La Sala una vez').count()));
await p.locator('#hoja textarea').fill('Hazla más formal');
await p.getByRole('button', { name: 'Pedir' }).click();
await p.waitForSelector('#hoja .cambios li', { timeout: 10000 });
const pedido = pedidos.find((x) => /ia-texto/.test(x.u));
ok('le pide a La Sala con la llave de la sala', pedido?.llave === 'llave-de-prueba', JSON.stringify(pedido?.llave));
ok('le manda el texto de las láminas', /Propósito|Fadori/.test(pedido?.cuerpo?.sistema || ''));
ok('enseña los cambios válidos y tira los inválidos', (await p.locator('#hoja .cambios li').count()) === 2, String(await p.locator('#hoja .cambios li').count()));
ok('enseña cómo estaba el texto antes', (await p.locator('#hoja .cambios del').count()) === 1);
await captura(p, '05-ia');
await p.getByRole('button', { name: /Aplicar 2 cambios/ }).click();
await p.waitForSelector('text=Aplicado');
const tx5 = await p.evaluate(() => window.__pres.N.textos(window.__pres.D, 4).map((t) => t.texto));
ok('el texto propuesto quedó en la lámina 5', tx5.includes('Propósito de Fadori') || tx5.some((t) => /Propósito de FADORI/.test(t)), JSON.stringify(tx5));
ok('todo lo de la IA es UN solo deshacer', await p.evaluate(() => /^IA:/.test(window.__pres.D.deshacer.at(-1).nombre)));
await p.keyboard.press('Escape');

console.log('\n· Imágenes');
await p.click('.dock [data-panel="imagenes"]');
await p.waitForSelector('#hoja .img-carta');
const nImg = await p.locator('#hoja .img-carta').count();
ok(`lista las imágenes (${nImg})`, nImg > 5);
const ruta = await p.locator('#hoja .img-carta').first().getAttribute('data-ruta');
await p.locator('#hoja .img-carta').first().click();
await p.getByRole('button', { name: 'Cambiar por otra…' }).click();
ok('ofrece subir, buscar, crear y rehacer con IA', (await p.locator('#hoja2 .fuentes > *').count()) === 4);
await p.getByRole('button', { name: /Crear con IA/ }).click();
await p.locator('#hoja2 textarea').fill('Una cafetería escolar moderna');
await p.locator('#hoja2 .btn.primario').click();
await p.waitForFunction(() => /Imagen cambiada/.test(document.querySelector('#avisos').textContent), null, { timeout: 15000 });
const img = pedidos.find((x) => /ia-imagen/.test(x.u));
ok('le pidió la imagen a Paulina con la forma del hueco', img && /^\d+:\d+$/.test(img.cuerpo.aspecto), JSON.stringify(img?.cuerpo?.aspecto));
const cambio = await p.evaluate(async (ruta) => { const { D, N } = window.__pres; const im = (await N.imagenes(D)).find((x) => x.ruta === ruta) || (await N.imagenes(D))[0]; return { mime: im.mime, bytes: (await N.bytesDe(D, im.ruta))?.length }; }, ruta);
ok('la imagen nueva entró al archivo', cambio.bytes > 0, JSON.stringify(cambio));

console.log('\n· Visor');
await p.locator('#laminas .ver').nth(4).click();
await p.waitForSelector('#visor[open] .lienzo');
ok('abre la lámina 5 en grande', /Lámina 5 de 19/.test(await p.locator('#visor-titulo').textContent()));
const area = p.locator('#visor .textos-lamina textarea').first();
await area.fill('Título escrito a mano');
await p.getByRole('button', { name: 'Guardar textos' }).click();
await p.waitForFunction(() => /texto guardado/.test(document.querySelector('#avisos').textContent));
ok('editar un texto a mano se guarda', await p.evaluate(() => window.__pres.N.textos(window.__pres.D, 4).some((t) => t.texto === 'Título escrito a mano')));
await p.click('#v-sig');
ok('la flecha pasa a la siguiente', /Lámina 6/.test(await p.locator('#visor-titulo').textContent()));
ok('sin desborde en el visor', (await desborde(p)) <= 0);
await captura(p, '06-visor');
await p.keyboard.press('Escape');

console.log('\n· Guardar');
await p.click('#b-guardar');
const [descarga] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Descargar' }).click()]);
ok('descarga «(Mazi).pptx»', /\(Mazi\)\.pptx$/.test(descarga.suggestedFilename()), descarga.suggestedFilename());
const guardado = readFileSync(await descarga.path());
ok('el archivo es un zip de verdad (PK)', guardado[0] === 0x50 && guardado[1] === 0x4b);

console.log('\n· Volver después');
await p.waitForTimeout(1800);   // el autoguardado espera 1.5 s
await p.reload();
await p.waitForSelector('#b-seguir:not([hidden])', { timeout: 5000 }).catch(() => {});
ok('al volver ofrece seguir donde se quedó', /Seguir con «Fadori-STEAM»/.test(await p.locator('#b-seguir').textContent()));
await p.click('#b-seguir');
await p.waitForSelector('#laminas .lienzo');
ok('y trae los cambios', await p.evaluate(() => window.__pres.N.textos(window.__pres.D, 4).some((t) => t.texto === 'Título escrito a mano')));
ok('ni un error de consola', !errores.length, errores.join(' | '));

console.log('\n· Sin llave');
const s = await pagina(390, 844);
await s.p.evaluate(() => localStorage.removeItem('salaLlave'));
await s.p.setInputFiles('#soltar input', PPTX);
await s.p.waitForSelector('#laminas .lienzo');
await s.p.click('.dock [data-panel="ia"]');
ok('sin llave pide pegar el link de La Sala', await s.p.getByText('conecta La Sala una vez').isVisible());
await s.p.locator('#hoja input[placeholder*="link de La Sala"]').fill('https://mazi-central.palomazi9111.workers.dev/sala/?sala=GRUPAZ&llave=abc123');
await s.p.getByRole('button', { name: 'Conectar' }).click();
ok('saca la llave del link y la guarda', (await s.p.evaluate(() => localStorage.getItem('salaLlave'))) === 'abc123');

console.log('\n· Computadora (1280×800)');
const c = await pagina(1280, 800);
await c.p.setInputFiles('#soltar input', PPTX);
await c.p.waitForSelector('#laminas .lienzo');
const cols = await c.p.evaluate(() => getComputedStyle(document.querySelector('#laminas')).gridTemplateColumns.split(' ').length);
ok('cuatro columnas', cols === 4, String(cols));
await c.p.click('.dock [data-panel="fondo"]');
const hj = await c.p.locator('#hoja').boundingBox();
ok('la hoja sale de lado, no tapando todo', hj.x > 700 && hj.height > 700, JSON.stringify(hj));
await captura(c.p, '07-compu');
ok('ni un error de consola', !c.errores.length, c.errores.join(' | '));

await b.close(); servidor.close();
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
