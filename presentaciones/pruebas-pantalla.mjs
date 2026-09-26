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
import { atenderElementos } from '../sala/servidor/elementos.js';

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
let safariTerco = false;
const pedidos = [];
async function pagina(ancho, alto){
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, acceptDownloads: true, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try{ if(!sessionStorage.getItem('limpio')){ localStorage.setItem('salaLlave', 'llave-de-prueba'); indexedDB.deleteDatabase('presentaciones'); sessionStorage.setItem('limpio', '1'); } }catch(e){} });
  /* Un banco de mentiras en memoria, con la misma forma que sala/servidor/banco.js. */
  const banco = new Map();
  const guardado = new Map();
  const almacen = {
    async get(k){ if(Array.isArray(k)){ const m = new Map(); for(const x of k) if(guardado.has(x)) m.set(x, guardado.get(x)); return m; } return guardado.get(k); },
    async put(k, v){ if(typeof k === 'object') for(const [a, b] of Object.entries(k)) guardado.set(a, b); else guardado.set(k, v); },
    async delete(k){ for(const x of [].concat(k)) guardado.delete(x); },
  };
  await ctx.route(/sala\.palomazi9111\.workers\.dev/, async (r) => {
    const u = r.request().url(), cuerpo = r.request().postDataJSON?.() || null;
    pedidos.push({ u, cuerpo, llave: r.request().headers()['x-llave'] });
    // Como el Safari del iPhone de Carlos: toda petición con la cabecera X-Llave muere antes de salir.
    if(safariTerco && r.request().headers()['x-llave']) return r.abort('failed');
    /* Mis elementos: el servidor DE VERDAD (elementos.js) sobre un almacén en memoria. */
    if(/\/elementos/.test(u)){
      const req = new Request(u, { method: r.request().method(), body: r.request().method() === 'POST' ? r.request().postData() : undefined });
      const res = await atenderElementos(almacen, req, new URL(u), 'carlos');
      return r.fulfill({ status: res.status, contentType: res.headers.get('content-type') || 'application/json', body: Buffer.from(await res.arrayBuffer()) });
    }
    if(/\/banco/.test(u)){
      const url = new URL(u), id = url.searchParams.get('id');
      if(r.request().method() === 'GET' && id){
        const f = banco.get(id);
        return f ? r.fulfill({ contentType: f.ficha.mime, body: Buffer.from(url.searchParams.get('parte') === 'mini' && f.mini ? f.mini : f.datos, 'base64') }) : r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no"}' });
      }
      if(r.request().method() === 'GET') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ bien: true, fichas: [...banco.values()].map((x) => x.ficha).sort((a, b) => b.creado - a.creado) }) });
      const c = cuerpo, lista = (v) => [...new Set((Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
      const limpia = (o = {}) => { const z = { ...o }; if('temas' in z) z.temas = lista(z.temas); if('palabras' in z) z.palabras = lista(z.palabras); return z; };
      if(c.accion === 'subir'){
        // La segunda foto falla UNA vez (como una red de teléfono): tiene que reintentarse sola.
        if(c.nombre === 'imagen_2.png' && !banco.falloUna){ banco.falloUna = true; return r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"se cayó"}' }); }
        const nid = 'f' + (banco.size + 1) + Math.random().toString(36).slice(2, 6);
        const ficha = { id: nid, huella: c.huella || null, nombre: c.nombre, mime: c.mime, bytes: Buffer.from(c.datos, 'base64').length, partes: 1, ancho: c.ancho, alto: c.alto, titulo: '', descripcion: '', temas: [], palabras: [], estado: 'sin-revisar', cambios: '', notas: '', carpeta: '', ia: false, creado: Date.now() + banco.size, ...limpia(c.campos) };
        banco.set(nid, { ficha, datos: c.datos, mini: c.mini });
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ bien: true, ficha }) });
      }
      if(c.accion === 'cambiar' || c.accion === 'cambiarVarias'){
        const hechas = (c.ids || [c.id]).map((i) => banco.get(i)).filter(Boolean).map((x) => { Object.assign(x.ficha, limpia(c.campos)); if(c.agregarTemas) x.ficha.temas = [...new Set([...x.ficha.temas, ...lista(c.agregarTemas)])]; return x.ficha; });
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ bien: true, fichas: hechas, ficha: hechas[0] }) });
      }
      if(c.accion === 'borrar'){ banco.delete(c.id); return r.fulfill({ contentType: 'application/json', body: '{"bien":true}' }); }
    }
    if(/ia-texto/.test(u) && cuerpo?.imagenes?.length){
      const n = pedidos.filter((x) => /ia-texto/.test(x.u) && x.cuerpo?.imagenes).length;
      const fichas = [{ titulo: 'Robot en el aula', descripcion: 'Un robot educativo sobre una mesa.', temas: ['robótica', 'escuela'], palabras: ['robot', 'mesa', 'azul'], texto_visible: '', problemas: '' },
        { titulo: 'Laboratorio de química', descripcion: 'Matraces con líquidos de colores.', temas: ['ciencia', 'química'], palabras: ['matraz', 'laboratorio'], texto_visible: '', problemas: 'tiene marca de agua' },
        { titulo: 'Cafetería escolar', descripcion: 'Alumnos comiendo en mesas largas.', temas: ['escuela', 'alimentación'], palabras: ['comida', 'alumnos'], texto_visible: '', problemas: '' }];
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ bien: true, motor: 'gemini', texto: JSON.stringify(fichas[(n - 1) % 3]) }) });
    }
    // «Ponle imágenes de mi banco»: la IA de mentiras lee el catálogo que le llegó y elige de ahí.
    if(/ia-texto/.test(u) && /imágenes de mi banco/.test(cuerpo?.mensajes?.at(-1)?.texto || '')){
      const cat = JSON.parse((cuerpo.sistema.split('BANCO DE IMÁGENES de Carlos (').at(-1) || '[]').replace(/^[^\n]*\n/, '').split('\n')[0] || '[]');
      const buena = cat.find((f) => !f.cambios), mala = cat.find((f) => f.cambios);
      const lams = JSON.parse((cuerpo.sistema.match(/Te paso \d+[^:]*:\n(\[.*\])\n/) || [])[1] || '[]');
      const conFoto = lams.find((l) => l.imagenes?.length)?.lamina || 1;
      const cambios = [{ op: 'imagenBanco', id: buena?.id, lamina: 2, lugar: 'derecha' }, { op: 'cambiarImagen', lamina: conFoto, imagen: 1, id: buena?.id },
        { op: 'imagenBanco', id: 'clave-inventada', lamina: 3 }, ...(mala ? [{ op: 'imagenBanco', id: mala.id, lamina: 4 }] : [])];
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ bien: true, motor: 'gemini', texto: JSON.stringify({ explicacion: 'Pongo imágenes de tu banco.', cambios }) }) });
    }
    if(/ia-texto/.test(u) && /directora de arte/.test(cuerpo?.sistema || '')){
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ bien: true, motor: 'gemini', texto: 'LO QUE FUNCIONA\n• Los títulos son claros.\n\nLO QUE MEJORARÍA DEL DISEÑO\n• **Lámina 5**: el texto es chico.\n\nAPARTADOS QUE LE SUMARÍA\n• Resultados del piloto.\n\nSIGUIENTES TRES PASOS\n• Recuadros en los títulos.' }) });
    }
    if(/ia-texto/.test(u) && /Aplica los consejos/.test(cuerpo?.mensajes?.at(-1)?.texto || '')){
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ bien: true, motor: 'gemini', texto: JSON.stringify({ explicacion: 'Pongo recuadros en los títulos y sumo la lámina de resultados.', cambios: [
        { op: 'recuadro', estilo: 'auto', en: 'titulos', laminas: 'todas' },
        { op: 'laminaNueva', copiaDe: 9, despues: 9, textos: ['Resultados del piloto', 'Menos filas\n[dato por confirmar]'] },
        { op: 'laminaNueva', copiaDe: 99, despues: 2, textos: ['x'] }] }) }) });
    }
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
  p.on('console', (m) => { if(m.type() === 'error' && !/status of 503/.test(m.text())) errores.push(m.text()); });
  await p.goto(BASE);
  return { p, ctx, errores };
}
const captura = async (p, n) => { if(CAPTURAS) await p.screenshot({ path: join(CAPTURAS, n + '.png') }); };
/* ⚠ Medir sólo la PÁGINA no ve lo que se sale DENTRO de una ventana
   (<dialog>): el visor tiene su propio scroll, y ahí la fila de botones medía
   616 px en 390 con la página «sin desborde». Lo reportó Carlos con capturas.
   Se cuentan también los píxeles que cualquier cosa de un diálogo abierto se
   pasa del borde (menos el lienzo de la lámina, que se escala adentro). */
const desborde = (p) => p.evaluate(() => {
  let fuera = document.documentElement.scrollWidth - innerWidth;
  for(const d of document.querySelectorAll('dialog[open]')) for(const e of d.querySelectorAll('*')){
    // Lo que se desliza de lado A PROPÓSITO (tira de láminas, barras de botones) se recorta en su carril.
    if(e.closest('.lienzo') || e.closest('.marco-datos') || e.closest('[data-desliza]')) continue;
    const b = e.getBoundingClientRect(); if(b.width) fuera = Math.max(fuera, Math.round(b.right - innerWidth), Math.round(-b.left));
  }
  return fuera;
});

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

const etiquetas = await p.evaluate(() => [...document.querySelectorAll('.dock button')].map((b) => { const r = document.createRange(); r.selectNodeContents(b); const t = [...r.getClientRects()]; return { d: b.getBoundingClientRect(), t: { left: Math.min(...t.map((x) => x.left)), right: Math.max(...t.map((x) => x.right)) } }; }));
ok('los letreros del menú de abajo no se enciman', etiquetas.every((e, k) => e.t.left >= e.d.left - 0.5 && e.t.right <= e.d.right + 0.5 && (k === 0 || e.t.left >= etiquetas[k - 1].t.right + 2)), JSON.stringify(etiquetas.map((e) => [Math.round(e.t.left), Math.round(e.t.right)])));
console.log('\n· Acomodar');
await p.click('.dock [data-panel="acomodar"]');
ok('trae «Arreglar todo» y seis arreglos sueltos', (await p.locator('#hoja [data-acomodo]').count()) === 8);
ok('ningún botón de acomodar se sale de la hoja', await p.evaluate(() => [...document.querySelectorAll('#hoja .accion')].every((b) => b.scrollWidth <= b.clientWidth + 1)));
await captura(p, '04b-acomodar');
const antesAc = await p.evaluate(() => window.__pres.D.deshacer.length);
await p.locator('#hoja [data-acomodo="todo"]').click();
await p.waitForFunction((n) => window.__pres.D.deshacer.length === n + 1, antesAc);
ok('«Arreglar todo» dice qué hizo', /Acomodé|no cambié nada/.test(await p.locator('#avisos').textContent()), await p.locator('#avisos').textContent());
await p.click('.dock [data-panel="acomodar"]');
await p.locator('#hoja [data-acomodo="todo"]').click();
await p.waitForFunction(() => /no cambié nada/.test(document.querySelector('#avisos').textContent), null, { timeout: 8000 }).catch(() => {});
ok('la segunda vez dice que ya no había nada', /no cambié nada/.test(await p.locator('#avisos').textContent()), await p.locator('#avisos').textContent());

console.log('\n· IA');
await p.click('.dock [data-panel="ia"]');
ok('con la llave de la mesa guardada, no pide conectar', !(await p.getByText('conecta La Sala una vez').count()));
await p.locator('#hoja textarea').fill('Hazla más formal');
await p.getByRole('button', { name: 'Pedir', exact: true }).click();
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

console.log('\n· Notificaciones');
ok('la campana avisa que hay novedades', /\d/.test(await p.locator('#b-noti .contador').textContent()) && await p.locator('#b-noti .contador').isVisible());
await p.click('#b-noti');
await p.waitForSelector('#hoja[open] .notis');
const notis = await p.locator('#hoja .noti').allTextContents();
ok('el historial trae los cambios de hoy (Acomodé, Letra, Cambié…)', notis.some((t) => /Acomodé/.test(t)) && notis.some((t) => /Letra Montserrat/.test(t)), notis.slice(0, 5).join(' | '));
ok('agrupados por día, con hora', /Hoy/.test(await p.locator('#hoja .grupo-noti h3').first().textContent()) && /hace un momento|hace \d+ min/.test(notis.join(' ')));
const conVolver = p.locator('#hoja .noti', { hasText: 'Letra Montserrat' }).getByRole('button', { name: /Volver a antes de esto/ });
ok('un cambio que se puede deshacer trae «Volver a antes de esto»', await conVolver.count() === 1);
const pilaAntes = await p.evaluate(() => window.__pres.D.deshacer.length);
await conVolver.click();
await p.waitForFunction((n) => window.__pres.D.deshacer.length < n, pilaAntes);
const pila = await p.evaluate(() => ({ n: window.__pres.D.deshacer.length, nombres: window.__pres.D.deshacer.map((o) => o.nombre) }));
ok('«Volver a antes» deshace hasta quitar ese cambio (y los de después)', !pila.nombres.includes('Letra') && !pila.nombres.includes('Acomodar'), JSON.stringify(pila));
ok('y lo anota', await p.evaluate(() => window.__pres.NOTI.todas()[0].texto.startsWith('Volviste a antes de «Letra»')));
await captura(p, '13a-tus-cambios');
await p.locator('#hoja .segmento button', { hasText: 'Novedades' }).click();
ok('Novedades enseña lo nuevo de la herramienta', (await p.locator('#hoja .noti.novedad').count()) >= 5);
await captura(p, '13-notificaciones');
await p.keyboard.press('Escape');
ok('ya vistas, la campana se apaga', await p.locator('#b-noti .contador').isHidden());
ok('las pestañas no parten su nombre en dos renglones', await p.evaluate(() => [...document.querySelectorAll('.vistas button')].every((b) => b.getBoundingClientRect().height <= 44 && b.scrollWidth <= b.clientWidth + 1)));
ok('ningún control del renglón de pestañas se sale', await p.evaluate(() => [...document.querySelectorAll('.vistas > *')].every((b) => b.getBoundingClientRect().right <= innerWidth + 0.5)));

console.log('\n· Recuadro detrás del texto');
await p.click('.dock [data-panel="texto"]');
ok('la hoja de Texto trae el recuadro con seis estilos a la vista', (await p.locator('#hoja [data-recuadro]').count()) === 6);
await p.locator('#hoja .segmento button', { hasText: 'Títulos' }).first().click();
await captura(p, '10-recuadro');
await p.locator('#hoja [data-poner-recuadro]').click();
await p.waitForFunction(() => /Recuadro en \d+ texto/.test(document.querySelector('#avisos').textContent));
const conSombra = await p.evaluate(async () => { const { D, N } = window.__pres; let n = 0; for(let i = 0; i < D.laminas.length; i++) n += (await N.modelo(D, i)).formas.filter((f) => f.sombra && f.relleno).length; return n; });
ok('los títulos traen recuadro con sombra', conSombra > 5, String(conSombra));
ok('y la miniatura lo dibuja (sombra en pantalla)', await p.evaluate(() => [...document.querySelectorAll('#laminas .forma')].some((f) => f.style.boxShadow)));
await p.keyboard.press('Escape');
ok('los avisos no se apilan: dos a la vista como mucho', (await p.locator('#avisos .aviso').count()) <= 2, String(await p.locator('#avisos .aviso').count()));
await captura(p, '11-recuadro-laminas');
await p.click('.dock [data-panel="texto"]');
await p.getByRole('button', { name: 'Quitar recuadros' }).click();
await p.waitForFunction(() => /recuadros? quitados?/.test(document.querySelector('#avisos').textContent));
ok('«Quitar recuadros» los quita', await p.evaluate(async () => { const { D, N } = window.__pres; for(let i = 0; i < D.laminas.length; i++) if((await N.modelo(D, i)).formas.some((f) => f.sombra)) return false; return true; }));

console.log('\n· IA: opinión y consejos');
await p.keyboard.press('Escape');
await p.click('.dock [data-panel="ia"]');
await p.locator('#hoja .segmento button', { hasText: 'Opinión y consejos' }).click();
ok('el modo opinión trae preguntas listas', await p.getByRole('button', { name: '¿Qué apartados le faltan?' }).isVisible());
await p.getByRole('button', { name: '¿Qué opinas de mi presentación?' }).click();
await p.waitForSelector('#hoja .msj.opinion');
const pidioOpinion = pedidos.filter((x) => /ia-texto/.test(x.u) && /directora de arte/.test(x.cuerpo?.sistema || '')).at(-1);
ok('a la IA le llega el diseño MEDIDO, no sólo el texto', /INFORME DE DISEÑO/.test(pidioOpinion?.cuerpo?.sistema || '') && /letraMaxPt/.test(pidioOpinion.cuerpo.sistema) && /tamanosDeLetraPt/.test(pidioOpinion.cuerpo.sistema));
const opinion = await p.locator('#hoja .msj.opinion').textContent();
ok('la opinión se lee limpia (sin ** de markdown)', /LO QUE FUNCIONA/.test(opinion) && !/\*\*/.test(opinion));
await captura(p, '12-opinion');
await p.getByRole('button', { name: '✦ Aplícalo' }).click();
await p.waitForSelector('#hoja .cambios li');
ok('«Aplícalo» propone los cambios (y tira la lámina que copia de una que no existe)', (await p.locator('#hoja .cambios li').count()) === 2, String(await p.locator('#hoja .cambios li').count()));
await p.getByRole('button', { name: /Aplicar 2 cambios/ }).click();
await p.waitForSelector('text=Aplicado');
ok('sumó la lámina de resultados después de la 9', await p.evaluate(() => { const { D, N } = window.__pres; return D.laminas.length === 20 && N.textos(D, 9).some((t) => t.texto === 'Resultados del piloto'); }));
ok('la rejilla se rehizo sola con 20', (await p.locator('#laminas .lam').count()) === 20);
await p.keyboard.press('Escape');
await p.click('#b-deshacer');
await p.waitForFunction(() => document.querySelectorAll('#laminas .lam').length === 19);
ok('deshacer quita la lámina nueva y los recuadros de un jalón', await p.evaluate(async () => { const { D, N } = window.__pres; if(D.laminas.length !== 19) return false; for(let i = 0; i < 19; i++) if((await N.modelo(D, i)).formas.some((f) => f.sombra)) return false; return true; }));

console.log('\n· Imágenes');
await p.click('.dock [data-panel="imagenes"]');
await p.waitForSelector('#hoja .img-carta');
const nImg = await p.locator('#hoja .img-carta').count();
ok(`lista las imágenes (${nImg})`, nImg > 5);
const ruta = await p.locator('#hoja .img-carta').first().getAttribute('data-ruta');
await p.locator('#hoja .img-carta').first().click();
await p.getByRole('button', { name: 'Cambiar por otra…' }).click();
ok('ofrece banco, subir, buscar, crear y rehacer con IA', (await p.locator('#hoja2 .fuentes > *').count()) === 5);
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
await p.getByRole('button', { name: '＋ Lámina igual' }).click();
await p.waitForFunction(() => /Lámina 7 de 20/.test(document.querySelector('#visor-titulo').textContent));
ok('«＋ Lámina igual» mete una copia justo después y la abre', true);
await p.keyboard.press('Escape');
await p.click('#b-deshacer');
await p.waitForFunction(() => document.querySelectorAll('#laminas .lam').length === 19);
ok('y deshacer la quita', true);
ok('sin desborde en el visor (ni adentro de su ventana)', (await desborde(p)) <= 0, String(await desborde(p)));
await captura(p, '06-visor');
await p.keyboard.press('Escape');

console.log('\n· Banco de imágenes');
await p.click('.vistas [data-vista="banco"]');
await p.waitForSelector('#banco:not([hidden]) .banco-cab');
ok('el banco abre vacío y explica qué hacer', /El banco está vacío/.test(await p.locator('#banco').textContent()));
ok('en el banco no estorban el menú de abajo ni «Guardar»', await p.evaluate(() => document.querySelector('#dock').hidden && document.querySelector('#b-guardar').hidden));
const png = Buffer.from(PNG, 'base64');
await p.setInputFiles('#banco input[type=file]', [1, 2, 3].map((n) => ({ name: `imagen_${n}.png`, mimeType: 'image/png', buffer: png })));
ok('antes de subir dice cuántas son y ofrece que la IA las describa', /3 imágenes/.test(await p.locator('#hoja').textContent()) && await p.locator('#hoja input[type=checkbox]').isChecked());
await p.getByRole('button', { name: 'Subir 3 imágenes' }).click();
await p.waitForFunction(() => document.querySelectorAll('#rejilla-banco .banco-carta').length === 3 && !document.querySelector('#banco-progreso .progreso-banco'), null, { timeout: 20000 });
const titulos = await p.locator('#rejilla-banco .banco-titulo').allTextContents();
ok('subió las tres (una se cayó y se reintentó sola) y Paulina les puso título', titulos.length === 3 && titulos.includes('Robot en el aula') && titulos.includes('Cafetería escolar'), titulos.join(' | '));
const visto = pedidos.filter((x) => /ia-texto/.test(x.u) && x.cuerpo?.imagenes?.length).at(-1);
ok('a Paulina le mandó la foto y le pidió JSON', visto?.cuerpo?.json === true && /^image\//.test(visto.cuerpo.imagenes[0].mime));
const subidasAntes = pedidos.filter((x) => x.cuerpo?.accion === 'subir').length;
await p.setInputFiles('#banco input[type=file]', [1, 2, 3].map((n) => ({ name: `imagen_${n}.png`, mimeType: 'image/png', buffer: png })));
ok('si vuelves a elegir las mismas, avisa que ya están (para reanudar sin repetir)', /Las 3 ya están en el banco/.test(await p.locator('#hoja').textContent()));
await p.getByRole('button', { name: 'Subir 3 imágenes' }).click();
await p.waitForFunction(() => /ya estaban/.test(document.querySelector('#avisos').textContent));
ok('y no sube ninguna otra vez', pedidos.filter((x) => x.cuerpo?.accion === 'subir').length === subidasAntes && (await p.locator('#rejilla-banco .banco-carta').count()) === 3);
await p.fill('#banco input[type=search]', 'robotica');
ok('buscar sin acentos: «robotica» encuentra la de robótica', (await p.locator('#rejilla-banco .banco-carta').count()) === 1);
await p.fill('#banco input[type=search]', 'escuela comida');
ok('dos palabras en cualquier orden', (await p.locator('#rejilla-banco .banco-carta').count()) === 1 && /Cafetería/.test(await p.locator('#rejilla-banco').textContent()));
await p.fill('#banco input[type=search]', 'marca de agua');
ok('busca también en lo que la IA notó (notas)', (await p.locator('#rejilla-banco .banco-carta').count()) === 1);
await p.fill('#banco input[type=search]', '');
await p.locator('#rejilla-banco .banco-check').nth(0).click();
await p.locator('#rejilla-banco .banco-check').nth(1).click();
ok('elegir dos muestra la barra de lote', /2 elegidas/.test(await p.locator('#barra-lote').textContent()));
ok('la barra de lote cabe en el teléfono', await p.evaluate(() => { const b = document.querySelector('#barra-lote'); return [...b.children].every((c) => c.getBoundingClientRect().right <= innerWidth + 0.5); }));
const tapa = await p.evaluate(() => { const a = document.querySelector('#avisos .aviso'); const b = document.querySelector('#barra-lote'); if(!a || !b) return false; const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect(); return r1.bottom > r2.top + 1; });
ok('los avisos no tapan la barra de lote', !tapa);
await captura(p, '08-banco');
await p.locator('#barra-lote').getByRole('button', { name: '✓ Listas' }).click();
await p.waitForFunction(() => /Listas · 2/.test(document.querySelector('#banco .banco-cab').textContent));
ok('dos marcadas como listas, y el filtro las cuenta', true);
await p.locator('#rejilla-banco .banco-abrir').first().click();
await p.waitForSelector('#hoja[open] .grande-img');
await p.locator('#hoja .segmento button', { hasText: 'Requiere cambios' }).click();
await p.locator('#hoja textarea[placeholder="Qué le falta para poder usarla"]').fill('Quitar el logo viejo');
ok('al marcar «requiere cambios» ofrece hacerlos con IA', await p.getByRole('button', { name: '✦ Hacer los cambios con IA' }).isVisible());
await captura(p, '09-ficha');
await p.locator('#hoja').getByRole('button', { name: 'Guardar', exact: true }).click();
await p.waitForFunction(() => /Requieren cambios · 1/.test(document.querySelector('#banco .banco-cab').textContent));
ok('la ficha se guardó como «requiere cambios»', true);
const [csv] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Exportar a Excel' }).click()]);
const texto = readFileSync(await csv.path(), 'utf8');
ok('exporta a Excel con acentos (marca UTF-8) y las tres', texto.charCodeAt(0) === 0xFEFF && /Título,Estado,Cambios que necesita/.test(texto) && /Quitar el logo viejo/.test(texto) && texto.trim().split('\r\n').length === 4, texto.slice(0, 120));
ok('sin desborde en el banco', (await desborde(p)) <= 0, String(await desborde(p)));

console.log('\n· Del banco a la lámina');
await p.click('.vistas [data-vista="presentacion"]');
ok('regresar a la presentación la deja como estaba', await p.locator('#laminas .lam').count() === 19 && await p.locator('#dock').isVisible());
await p.click('.dock [data-panel="imagenes"]');
await p.waitForSelector('#hoja .img-carta');
const rutaB = await p.locator('#hoja .img-carta').nth(1).getAttribute('data-ruta');
await p.locator('#hoja .img-carta').nth(1).click();
await p.getByRole('button', { name: 'Cambiar por otra…' }).click();
await p.getByRole('button', { name: /De mi banco/ }).click();
await p.waitForSelector('#hoja2 [data-banco]');
const listas = await p.evaluate(() => window.__pres.BANCO._estado().fichas.filter((f) => f.estado === 'lista').length);
ok('el buscador del banco enseña sólo las que están listas', listas === 1 && (await p.locator('#hoja2 [data-banco]').count()) === listas, String(listas));
await p.locator('#hoja2 [data-banco]').first().click();
await p.waitForFunction(() => /Imagen cambiada/.test(document.querySelector('#avisos').textContent), null, { timeout: 10000 });
ok('la imagen del banco entró a la presentación', true);
await p.click('.vistas [data-vista="banco"]');
await p.waitForSelector('#rejilla-banco .banco-carta');
await p.locator('#rejilla-banco .banco-abrir').last().click();
await p.waitForSelector('#hoja[open]');
const borrar = p.getByRole('button', { name: 'Borrar del banco' });
await borrar.click();
ok('borrar pide confirmar', await p.getByRole('button', { name: '¿Seguro? Toca otra vez' }).isVisible());
await p.getByRole('button', { name: '¿Seguro? Toca otra vez' }).click();
await p.waitForFunction(() => document.querySelectorAll('#rejilla-banco .banco-carta').length === 2);
ok('y al confirmar se va', true);
await p.click('.vistas [data-vista="presentacion"]');

console.log('\n· La IA usa el banco');
{
  const antesL2 = await p.evaluate(async () => (await window.__pres.N.modelo(window.__pres.D, 1)).formas.filter((f) => f.tipo === 'pic').length);
  // La primera lámina que trae una foto propia: ahí la IA de mentiras pide cambiarla.
  const foto1 = await p.evaluate(async () => { const { D, N } = window.__pres; for(let i = 0; i < D.laminas.length; i++){ const f = (await N.modelo(D, i)).formas.find((x) => x.tipo === 'pic' && x.capa === 'lamina' && x.cid != null && x.rutaImagen); if(f) return { i, ruta: f.rutaImagen, bytes: (await N.bytesDe(D, f.rutaImagen)).length }; } return null; });
  await p.click('.dock [data-panel="ia"]');
  await p.locator('#hoja .segmento button', { hasText: 'Pedir cambios' }).click();
  await p.locator('#hoja textarea').fill('Ponle imágenes de mi banco');
  await p.getByRole('button', { name: 'Pedir', exact: true }).click();
  await p.waitForSelector('#hoja .msj.yo .cambios li', { timeout: 10000 });
  const pedidoB = pedidos.filter((x) => /ia-texto/.test(x.u) && /imágenes de mi banco/.test(x.cuerpo?.mensajes?.at(-1)?.texto || '')).at(-1);
  ok('la IA recibe el catálogo del banco (títulos, temas, si está lista)', /BANCO DE IMÁGENES de Carlos \(2 imágenes\)/.test(pedidoB?.cuerpo?.sistema || '') && /"lista":true/.test(pedidoB.cuerpo.sistema), (pedidoB?.cuerpo?.sistema || '').split('BANCO DE IMÁGENES')[1]?.slice(0, 200));
  ok('y sabe qué imágenes trae cada lámina, para poder cambiarlas', /"imagenes":\[\{"imagen":1/.test(pedidoB?.cuerpo?.sistema || ''));
  const items = await p.locator('#hoja .msj.yo').last().locator('.cambios li').count();
  ok('enseña sólo lo válido: tira la clave inventada y la imagen que «requiere cambios»', items === 2, String(items));
  ok('cada cambio enseña la miniatura de la imagen del banco', await p.locator('#hoja .msj.yo').last().locator('.cambios img.mini-banco').count() === 2);
  await captura(p, '10-ia-banco');
  await p.locator('#hoja .msj.yo').last().getByRole('button', { name: /Aplicar 2 cambios/ }).click();
  await p.waitForFunction(() => /La IA hizo 2 cambios/.test(document.querySelector('#avisos').textContent), null, { timeout: 15000 }).catch(async () => {
    console.log('AVISOS:', await p.locator('#avisos').textContent(), JSON.stringify(await p.evaluate(() => [document.querySelector('.ocupado')?.textContent, [...document.querySelectorAll('#hoja .msj.yo')].at(-1)?.textContent?.slice(-200), window.__pres.D.deshacer.at(-1)?.nombre])), errores.slice(-3));
  });
  const despues = await p.evaluate(async () => { const fs = (await window.__pres.N.modelo(window.__pres.D, 1)).formas.filter((f) => f.tipo === 'pic'); return fs.length; });
  ok('la imagen del banco entró a la lámina 2', despues === antesL2 + 1, `${antesL2} → ${despues}`);
  const cambiada = await p.evaluate(async (antes) => { const f = (await window.__pres.N.modelo(window.__pres.D, antes.i)).formas.find((x) => x.tipo === 'pic' && x.capa === 'lamina' && x.cid != null && x.rutaImagen); const b = f && await window.__pres.N.bytesDe(window.__pres.D, f.rutaImagen); return !!b && (f.rutaImagen !== antes.ruta || b.length !== antes.bytes); }, foto1);
  ok('y la foto que ya traía una lámina se cambió por la del banco', !!foto1 && cambiada, JSON.stringify(foto1));
  await p.keyboard.press('Escape');
}

console.log('\n· Insertar: formas');
await p.click('.dock [data-panel="insertar"]');
await p.waitForSelector('#hoja[open] [data-forma]');
ok('Insertar trae las 20 formas de PowerPoint', (await p.locator('#hoja [data-forma]').count()) === 20);
ok('y dice dónde va (esta lámina, o todas)', /Lámina \d+/.test(await p.locator('#hoja .segmento').first().textContent()) && /Todas · 19/.test(await p.locator('#hoja .segmento').first().textContent()));
await captura(p, '14-insertar-formas');
await p.locator('#hoja input[placeholder="Texto adentro (opcional)"]').fill('¡Hola!');
const cuentaFormas = (i) => p.evaluate(async (i) => (await window.__pres.N.modelo(window.__pres.D, i)).formas.filter((f) => f.capa === 'lamina').length, i);
const lam = await p.evaluate(() => window.__pres.INS && Number(document.querySelector('#hoja .segmento button[aria-pressed="true"]').textContent.match(/\d+/)[0]) - 1);
const antesF = await cuentaFormas(lam);
await p.locator('#hoja [data-forma="star5"]').click();
await p.waitForSelector('#visor[open] .seleccion');
ok('la barra del elemento no escribe «null»', !/null/.test(await p.locator('#barra-elemento').textContent()));
ok('con un elemento elegido, nada del visor se sale de lado', (await desborde(p)) <= 0, String(await desborde(p)));
ok('la estrella entra y se abre su lámina con la estrella ya elegida', (await cuentaFormas(lam)) === antesF + 1 && /Forma|Texto/.test(await p.locator('#barra-elemento').textContent()));
const cidE = Number(await p.locator('.seleccion').getAttribute('data-cid'));
const caja0 = await p.evaluate(([i, c]) => window.__pres.N.cajaDe(window.__pres.D, i, c), [lam, cidE]);
let bb = await p.locator('.seleccion').boundingBox();
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2 + 10, { steps: 6 }); await p.mouse.up();
await p.waitForFunction(([i, c, x]) => window.__pres.N.cajaDe(window.__pres.D, i, c)?.x > x, [lam, cidE, caja0.x]);
ok('arrastrarla la mueve (y es un solo deshacer)', /Mover/.test(await p.evaluate(() => window.__pres.D.deshacer.at(-1).nombre)));
await p.waitForSelector('.seleccion .asa.se');
bb = await p.locator('.seleccion .asa.se').boundingBox();
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + 40, bb.y + 30, { steps: 5 }); await p.mouse.up();
await p.waitForFunction(([i, c, w]) => window.__pres.N.cajaDe(window.__pres.D, i, c)?.w > w * 1.05, [lam, cidE, caja0.w]);
ok('la esquina la agranda', true);
await captura(p, '15-editar');
await p.locator('#barra-elemento [data-accion="color"]').click();
await p.locator('#hoja2 .muestra[data-c="#C00000"]').click();
await p.getByRole('button', { name: 'Poner este color' }).click();
await p.waitForFunction(async ([i, c]) => (await window.__pres.N.modelo(window.__pres.D, i)).formas.some((f) => f.cid === c && f.relleno?.color === '#C00000'), [lam, cidE]);
ok('«Color» la recolorea', true);
await p.locator('#barra-elemento [data-accion="duplicar"]').click();
await p.waitForFunction(async ([i, n]) => (await window.__pres.N.modelo(window.__pres.D, i)).formas.filter((f) => f.capa === 'lamina').length === n, [lam, antesF + 2]);
ok('«Duplicar» pone otra igual', true);
await p.locator('#barra-elemento [data-accion="guardar"]').click();
await p.locator('#hoja2 input[aria-label="Nombre del elemento"]').fill('Estrella roja');
await p.locator('#hoja2 [data-guardar-mio]').click();
await p.waitForFunction(() => /«Estrella roja» guardado en Mis elementos/.test(document.querySelector('#avisos').textContent), null, { timeout: 10000 });
ok('«★ A mis elementos» la guarda en La Sala', true);
await p.locator('#barra-elemento [data-accion="borrar"]').click();
await p.waitForFunction(async ([i, n]) => (await window.__pres.N.modelo(window.__pres.D, i)).formas.filter((f) => f.capa === 'lamina').length === n, [lam, antesF + 1]);
ok('«Borrar» la quita', true);
await p.keyboard.press('Escape');

console.log('\n· Mis elementos');
await p.click('.dock [data-panel="insertar"]');
await p.locator('#hoja [data-seccion="mios"]').click();
await p.waitForSelector('#hoja .mio');
ok('la estrella guardada aparece en Mis elementos, dibujada', (await p.locator('#hoja .mio').count()) === 1 && (await p.locator('#hoja .mio .mi-vista .lienzo .forma').count()) >= 1 && /Estrella roja/.test(await p.locator('#hoja .mio').textContent()));
const antesMio = await cuentaFormas(lam);
await p.locator('#hoja .mio-poner').first().click();
await p.waitForSelector('#visor[open] .seleccion');
ok('tocarla la pone en la lámina, con su color', (await cuentaFormas(lam)) === antesMio + 1 && await p.evaluate(async (i) => (await window.__pres.N.modelo(window.__pres.D, i)).formas.filter((f) => f.relleno?.color === '#C00000').length >= 1, lam));
await p.keyboard.press('Escape');
await p.click('.dock [data-panel="insertar"]');
await p.locator('#hoja [data-crear="dibujo"]').click();
await p.waitForSelector('#hoja2[open] canvas.dibujo');
bb = await p.locator('#hoja2 canvas.dibujo').boundingBox();
await p.mouse.move(bb.x + 40, bb.y + 40); await p.mouse.down();
for(let t = 0; t <= 20; t++) await p.mouse.move(bb.x + 40 + t * 12, bb.y + 60 + Math.sin(t / 3) * 40);
await p.mouse.up();
await captura(p, '19-dibujar');
await p.locator('#hoja2 [data-ponerlo]').click();
await p.waitForSelector('#visor[open] .seleccion');
ok('un dibujo con el dedo entra como imagen vectorial (SVG + PNG)', /Imagen/.test(await p.locator('#barra-elemento').textContent())
  && await p.evaluate(() => Object.keys(window.__pres.D.zip.files).filter((f) => /media\/mazi\d+\.svg$/.test(f)).length >= 1));
await p.keyboard.press('Escape');
await p.click('.dock [data-panel="insertar"]');
await p.locator('#hoja [data-crear="ia"]').click();
await p.locator('#hoja2 textarea').fill('un foco con engranes');
await p.locator('#hoja2 [data-hacer-ia]').click();
await p.waitForSelector('#hoja2 .vista-ia img');
ok('la IA hace un icono y se ve antes de ponerlo', /engranes/.test(pedidos.filter((x) => /ia-imagen/.test(x.u)).at(-1)?.cuerpo?.prompt || ''));
await p.locator('#hoja2 [data-solo-guardar]').click();
await p.waitForFunction(() => /guardado en Mis elementos/.test(document.querySelector('#avisos').textContent));
await p.waitForFunction(() => document.querySelectorAll('#hoja .mio').length === 3, null, { timeout: 10000 });
ok('«Sólo guardarlo» lo deja en la lista (con el dibujo: tres)', true);
await captura(p, '20-mis-elementos');
await p.locator('#hoja [data-editar-mios]').click();
await p.locator('#hoja [data-borrar-mio]').first().click();
await p.locator('#hoja2 [data-confirmar-borrar]').click();
await p.waitForFunction(() => document.querySelectorAll('#hoja .mio').length === 2);
ok('se borra uno (pidiendo confirmar)', true);
await p.keyboard.press('Escape');

console.log('\n· Tablas, gráficas y enlaces (como Canva)');
const formaDe = (i, c) => p.evaluate(async ([i, c]) => (await window.__pres.N.modelo(window.__pres.D, i)).formas.find((f) => f.cid === c), [i, c]);
await p.click('.dock [data-panel="insertar"]');
await p.locator('#hoja [data-seccion="tablas"]').click();
await p.locator('#hoja [data-tam="3x4"]').click();
ok('elegir el tamaño tocando la cuadrícula (como en Canva)', /3 renglones × 4 columnas/.test(await p.locator('#hoja .medida-tabla').textContent()));
await p.locator('#hoja [data-estilo-tabla="cebra"]').click();
await captura(p, '21-tablas');
await p.locator('#hoja [data-poner-tabla]').click();
await p.waitForSelector('#visor[open] .seleccion');
const cidT = Number(await p.locator('.seleccion').getAttribute('data-cid'));
let ft = await formaDe(lam, cidT);
ok('la tabla entra de 3 × 4 y se abre elegida con «▦ Editar tabla»', ft?.tabla?.filas.length === 3 && ft.tabla.cols.length === 4 && await p.locator('#barra-elemento [data-accion="tabla"]').isVisible());
await p.locator('#barra-elemento [data-accion="tabla"]').click();
await p.waitForSelector('#hoja2[open] .casilla');
ok('el editor enseña una casilla por celda', (await p.locator('#hoja2 .casilla').count()) === 12);
await p.locator('#hoja2 .casilla[data-r="1"][data-c="0"]').fill('Pomada');
// Pegar de Excel en la casilla del segundo renglón: llena desde ahí y agrega lo que falte.
await p.locator('#hoja2 .casilla[data-r="2"][data-c="0"]').evaluate((el) => { const dt = new DataTransfer(); dt.setData('text/plain', 'Navaja\t$350\t3\nTijera\t$500\t2\nPeine\t$80\t20'); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
ok('pegar celdas de Excel llena la tabla y le suma renglones', (await p.locator('#hoja2 .casilla').count()) === 20 && (await p.locator('#hoja2 .casilla[data-r="4"][data-c="0"]').inputValue()) === 'Peine');
await p.locator('#hoja2 [data-mas-col]').click();
await captura(p, '22-editar-tabla');
await p.locator('#hoja2 [data-estilo-tabla="tema"]').click();
await p.locator('#hoja2 [data-guardar-tabla]').click();
await p.waitForFunction(() => /Tabla actualizada/.test(document.querySelector('#avisos').textContent));
const tt = await p.evaluate(([i, c]) => window.__pres.N.tablaDe(window.__pres.D, i, c), [lam, cidT]);
ok('«Listo» la guarda: 5 renglones, 5 columnas, estilo nuevo', tt.datos.length === 5 && tt.datos[0].length === 5 && tt.datos[3][1] === '$500' && tt.estilo === 'tema', JSON.stringify(tt));
ok('y la vista la dibuja con esos datos', await p.locator(`#visor .lienzo [data-cid="${cidT}"] .celda`, { hasText: 'Peine' }).count() === 1);
await p.keyboard.press('Escape');

await p.click('.dock [data-panel="insertar"]');
await p.locator('#hoja [data-seccion="graficas"]').click();
ok('seis tipos de gráfica', (await p.locator('#hoja [data-tipo-grafica]').count()) === 6);
await p.locator('#hoja .casilla[data-r="1"][data-c="1"]').fill('40');
await captura(p, '23-graficas');
await p.locator('#hoja [data-poner-grafica]').click();
await p.waitForSelector('#visor[open] .seleccion');
const cidG = Number(await p.locator('.seleccion').getAttribute('data-cid'));
let fg = await formaDe(lam, cidG);
ok('la gráfica entra nativa, con los datos de la tablita', fg?.grafica?.tipo === 'columnas' && fg.grafica.series[0].valores[0] === 40 && fg.grafica.series.length === 2, JSON.stringify(fg?.grafica));
ok('y se ve dibujada (barras en SVG)', (await p.locator(`#visor .lienzo [data-cid="${cidG}"] svg rect`).count()) >= 8);
await p.locator('#barra-elemento [data-accion="grafica"]').click();
await p.waitForSelector('#hoja2[open] [data-tipo-grafica]');
await p.locator('#hoja2 [data-tipo-grafica="dona"]').click();
await p.locator('#hoja2 .casilla[data-r="2"][data-c="1"]').fill('60');
await captura(p, '24-editar-grafica');
await p.locator('#hoja2 [data-guardar-grafica]').click();
await p.waitForFunction(() => /Gráfica actualizada/.test(document.querySelector('#avisos').textContent));
fg = await formaDe(lam, cidG);
ok('«📊 Editar datos» la cambia a dona con el dato nuevo', fg?.grafica?.tipo === 'dona' && fg.grafica.series[0].valores[1] === 60 && (await p.locator(`#visor .lienzo [data-cid="${cidG}"] svg path`).count()) >= 4, JSON.stringify(fg?.grafica));
await captura(p, '25-grafica-visor');
// Enlace a un elemento que ya está: la gráfica misma.
await p.locator('#barra-elemento [data-accion="enlace"]').click();
await p.locator('#hoja2 input[type=url]').fill('grupomazi.com');
await p.locator('#hoja2 [data-guardar-enlace]').click();
await p.waitForFunction(() => /Enlace puesto/.test(document.querySelector('#avisos').textContent));
ok('«🔗 Enlace» le pone link a lo que ya está', (await formaDe(lam, cidG))?.enlace === 'https://grupomazi.com/' && /Cambiar enlace/.test(await p.locator('#barra-elemento').textContent()));
await p.keyboard.press('Escape');

await p.click('.dock [data-panel="insertar"]');
await p.locator('#hoja [data-seccion="enlace"]').click();
await p.locator('#hoja input[aria-label="Texto del enlace"]').fill('Escríbenos por WhatsApp');
await p.locator('#hoja input[aria-label="Link"]').fill('wa.me/524428833786');
await p.locator('#hoja [data-poner-enlace]').click();
await p.waitForSelector('#visor[open] .seleccion');
const cidL = Number(await p.locator('.seleccion').getAttribute('data-cid'));
ok('un texto con link: entra subrayado', (await formaDe(lam, cidL))?.enlace === 'https://wa.me/524428833786' && await p.locator(`#visor .lienzo [data-cid="${cidL}"] span`).first().evaluate((e) => getComputedStyle(e).textDecorationLine === 'underline'));
await p.keyboard.press('Escape');
// Al presentar, tocarlo abre el link en vez de pasar de lámina.
await p.evaluate(() => { window.__abiertos = []; window.open = (u) => { window.__abiertos.push(u); return null; }; });
await p.evaluate((i) => window.__pres.INS.presentar(i), lam);
await p.waitForSelector('#presentar[open] .diapo [data-enlace]');
await p.waitForTimeout(400);
const bbL = await p.locator('#presentar .diapo:last-child [data-enlace]', { hasText: 'WhatsApp' }).boundingBox();
await p.mouse.click(bbL.x + bbL.width / 2, bbL.y + bbL.height / 2);
ok('al presentar, tocar el texto abre el link (y no pasa de lámina)', (await p.evaluate(() => window.__abiertos)).includes('https://wa.me/524428833786') && new RegExp(`^${lam + 1} /`).test(await p.locator('#presentar-cuenta').textContent()));
await p.keyboard.press('Escape');

console.log('\n· Insertar: iconos, diseños y transiciones');
await p.click('.dock [data-panel="insertar"]');
await p.locator('#hoja [data-seccion="iconos"]').click();
await p.waitForSelector('#hoja [data-icono]');
await p.locator('#hoja input[type=search]').fill('escuela');
await p.waitForFunction(() => document.querySelector('#hoja [data-icono="school"]'));
ok('buscar «escuela» (en español) encuentra el icono de escuela', true);
await captura(p, '16-iconos');
await p.locator('#hoja [data-icono="school"]').click();
await p.waitForSelector('#visor[open] .seleccion');
ok('el icono entra como imagen con su SVG', /Icono/.test(await p.locator('#barra-elemento').textContent()) && await p.evaluate(() => Object.keys(window.__pres.D.zip.files).some((f) => /media\/mazi\d+\.svg$/.test(f))));
await p.locator('#barra-elemento [data-accion="color"]').click();
await p.locator('#hoja2 .muestra[data-c="#2C5F2D"]').click();
await p.getByRole('button', { name: 'Poner este color' }).click();
await p.waitForFunction(() => /Icono recoloreado/.test(document.querySelector('#avisos').textContent));
ok('el icono se recolorea (vuelve a dibujarse del color nuevo)', true);
await p.keyboard.press('Escape');
await p.click('.dock [data-panel="insertar"]');
await p.locator('#hoja .segmento button', { hasText: 'Todas · 19' }).click();
await p.locator('#hoja [data-seccion="disenos"]').click();
ok('diez diseños armados', (await p.locator('#hoja [data-diseno]').count()) === 10);
await p.locator('#hoja [data-diseno="numero"]').click();
await p.waitForFunction(() => /En 19 láminas/.test(document.querySelector('#avisos').textContent));
ok('un diseño en las 19 láminas de un jalón', await p.evaluate(async () => { const { D, N } = window.__pres; for(let i = 0; i < 19; i++) if(!(await N.modelo(D, i)).formas.some((f) => f.enGrupo)) return false; return true; }));
await p.click('#b-deshacer');
await p.click('.dock [data-panel="insertar"]');
await p.locator('#hoja [data-seccion="transiciones"]').click();
await p.locator('#hoja [data-transicion="push"]').click();
await p.locator('#hoja .segmento button', { hasText: '↑ Arriba' }).click();
await p.locator('#hoja .segmento button', { hasText: 'Todas · 19' }).click();
await captura(p, '17-transiciones');
await p.locator('#hoja [data-poner-transicion]').click();
await p.waitForFunction(() => /Transición en 19 láminas/.test(document.querySelector('#avisos').textContent));
ok('transición «empujar hacia arriba» en las 19', await p.evaluate(async () => (await window.__pres.N.modelo(window.__pres.D, 3)).transicion?.tipo === 'push'));
await p.keyboard.press('Escape');

console.log('\n· El editor tipo Canva');
{
  // Por si quedó algo abierto de la sección anterior.
  for(const id of ['#hoja2', '#hoja', '#visor']) await p.evaluate((x) => { const d = document.querySelector(x); if(d?.open) d.close(); }, id);
  await p.locator('#laminas .ver').nth(1).click();
  await p.waitForSelector('#visor[open] .visor-cuerpo > .marco .lienzo');
  const L = 1;
  const herramientas = await p.locator('#editor-herramientas [data-herramienta]').evaluateAll((bs) => bs.map((b) => b.dataset.herramienta));
  ok('abajo, la barra de Canva: Texto, Elementos, Fotos, Subir, Fondo, Acomodar, IA y Presentar', herramientas.join() === 'texto,elementos,fotos,subir,fondo,acomodar,ia,presentar', herramientas.join());
  const nLam = await p.evaluate(() => window.__pres.D.laminas.length);
  ok('la tira trae todas las láminas y la abierta marcada', (await p.locator('#visor .tira .pag').count()) === nLam && /2/.test(await p.locator('#visor .tira .pag[aria-current="true"]').textContent()));
  ok('las miniaturas de la tira no se confunden con la lámina grande', (await p.locator('#visor .tira [data-cid]').count()) === 0);
  await captura(p, '30-editor');
  // TEXTO: el botón que Carlos no encontraba.
  await p.click('#editor-herramientas [data-herramienta="texto"]');
  await p.waitForSelector('#hoja2[open] .agregar-texto');
  ok('«Texto» ofrece título, subtítulo y cuerpo, como Canva', (await p.locator('#hoja2 .agregar-texto button').count()) === 3);
  await p.click('#hoja2 [data-texto="subtitulo"]');
  await p.waitForSelector('#hoja2[open] textarea');
  await p.locator('#hoja2 textarea').fill('Hola desde el editor');
  await p.locator('#hoja2 .btn.primario').click();
  await p.waitForFunction(() => /Texto cambiado/.test(document.querySelector('#avisos').textContent));
  const tNuevo = await p.evaluate(async (i) => { const m = await window.__pres.N.modelo(window.__pres.D, i); const f = m.formas.find((x) => x.parrafos?.[0]?.runs?.[0]?.t === 'Hola desde el editor'); return f && { pt: Math.round(f.parrafos[0].runs[0].pt), b: f.parrafos[0].runs[0].b }; }, L);
  ok('el cuadro de texto nuevo entra con su tamaño de subtítulo y lo que escribiste', tNuevo?.pt === 28 && tNuevo.b, JSON.stringify(tNuevo));
  ok('y queda elegido: la barra de abajo es la del elemento', await p.locator('#barra-elemento').isVisible() && !(await p.locator('#editor-herramientas').isVisible()));
  await p.click('#barra-elemento [aria-label="Listo, soltar el elemento"]');
  ok('«✓» lo suelta y regresa la barra de herramientas', await p.locator('#editor-herramientas').isVisible());
  // ELEMENTOS → una estrella, y a vestirla.
  await p.click('#editor-herramientas [data-herramienta="elementos"]');
  await p.locator('#hoja [data-seccion="formas"]').click();
  await p.locator('#hoja [data-forma="star5"]').click();
  await p.waitForSelector('#visor[open] .seleccion');
  const cidE = Number(await p.locator('#visor .seleccion').getAttribute('data-cid'));
  ok('con un elemento elegido, nada del editor se sale de lado', (await desborde(p)) <= 0, String(await desborde(p)));
  await p.click('#barra-elemento [data-accion="relleno"]');
  await p.waitForSelector('#hoja2[open] .muestra-relleno');
  ok('la hoja de relleno deja ver la lámina (vista previa en vivo)', await p.evaluate(() => { const r = document.querySelector('#hoja2').getBoundingClientRect(), m = document.querySelector('#visor .visor-cuerpo > .marco').getBoundingClientRect(); return r.top > m.top + m.height * 0.4; }));
  await p.click('#hoja2 [aria-label="Degradado Neón"]');
  await p.click('#hoja2 [data-mas-color]');
  const vivo = await p.evaluate((c) => getComputedStyle(document.querySelector(`#visor .visor-cuerpo > .marco .lienzo [data-cid="${c}"]`)).backgroundImage, cidE);
  ok('mientras eliges, la estrella ya se ve con el degradado', /gradient/.test(vivo), vivo.slice(0, 60));
  await captura(p, '31-relleno');
  await p.click('#hoja2 [data-poner-relleno]');
  await p.waitForFunction(() => /Relleno puesto/.test(document.querySelector('#avisos').textContent));
  let fE = await formaDe(L, cidE);
  ok('degradado de CUATRO colores en la estrella (tres del «Neón» y uno más)', fE?.relleno?.degradado?.length === 4, JSON.stringify(fE?.relleno));
  await p.click('#barra-elemento [data-accion="relleno"]');
  await p.locator('#hoja2 .segmento button', { hasText: 'Patrón' }).click();
  await p.click('#hoja2 [data-patron="smCheck"]');
  await p.click('#hoja2 [data-poner-relleno]');
  const esperaForma = async (prueba) => { for(let k = 0; k < 60; k++){ const f = await formaDe(1, cidE); if(prueba(f)) return f; await p.waitForTimeout(250); } return formaDe(1, cidE); };
  ok('patrón de ajedrez', (await esperaForma((f) => f?.relleno?.patron === 'smCheck'))?.relleno?.patron === 'smCheck');
  await p.click('#barra-elemento [data-accion="relleno"]');
  await p.locator('#hoja2 .segmento button', { hasText: 'Textura' }).click();
  await p.click('#hoja2 [data-textura="madera"]');
  await p.waitForFunction(() => /url\(/.test(document.querySelector('#hoja2 .muestra-relleno').style.background));
  await p.click('#hoja2 [data-poner-relleno]');
  ok('textura de madera en mosaico', !!(await esperaForma((f) => f?.relleno?.mosaico))?.relleno?.mosaico);
  // TRANSPARENCIA, GIRAR y TAMAÑO.
  await p.click('#barra-elemento [data-accion="transparencia"]');
  await p.locator('#hoja2 .chip', { hasText: '25 %' }).click();
  await p.waitForFunction((c) => Math.abs(window.__pres.N.transparenciaDe(window.__pres.D, 1, c) - 0.25) < 0.001, cidE);
  await p.locator('#hoja2 .btn.primario').click();
  ok('transparencia al 25 %', true);
  await p.click('#barra-elemento [data-accion="girar"]');
  await p.locator('#hoja2 .chip', { hasText: '90°' }).click();
  await p.waitForFunction((c) => window.__pres.N.giroDe(window.__pres.D, 1, c) === 90, cidE);
  await p.locator('#hoja2 .btn.primario').click();
  ok('girar a 90°', true);
  const c0 = await p.evaluate((c) => window.__pres.N.cajaDe(window.__pres.D, 1, c), cidE);
  await p.click('#barra-elemento [data-accion="tamano"]');
  await p.locator('#hoja2 .chip', { hasText: 'Doble' }).click();
  await p.waitForFunction(([c, w]) => window.__pres.N.cajaDe(window.__pres.D, 1, c).w > w * 1.9, [cidE, c0.w]);
  await p.locator('#hoja2 .btn.primario').click();
  ok('tamaño al doble, desde su centro', true);
  // La manija de girar, con el dedo.
  await p.waitForSelector('#visor .seleccion .asa.giro');
  const sb = await p.locator('#visor .seleccion').boundingBox(), gb = await p.locator('#visor .seleccion .asa.giro').boundingBox();
  const cx = sb.x + sb.width / 2, cy = sb.y + sb.height / 2;
  await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await p.mouse.down();
  await p.mouse.move(cx + 80, cy, { steps: 8 }); await p.mouse.up();
  await p.waitForFunction((c) => window.__pres.N.giroDe(window.__pres.D, 1, c) !== 90, cidE);
  ok('la manija redonda gira el elemento', true, String(await p.evaluate((c) => window.__pres.N.giroDe(window.__pres.D, 1, c), cidE)));
  await captura(p, '32-estrella-vestida');
  // La tira cambia de lámina; «Aplicar en» manda en Fondo.
  await p.click('#barra-elemento [aria-label="Listo, soltar el elemento"]');
  await p.locator('#visor .tira .pag').nth(2).click();
  await p.waitForFunction(() => /Lámina 3 de/.test(document.querySelector('#visor-titulo').textContent));
  ok('tocar una miniatura de la tira abre esa lámina', true);
  await p.click('#editor-herramientas [data-herramienta="fondo"]');
  ok('«Fondo» desde el editor va a ESTA lámina', /la lámina 3/.test(await p.locator('#hoja .a-quien').textContent()));
  await p.keyboard.press('Escape');
  await p.click('.alcance [data-alcance="todas"]');
  await p.click('#editor-herramientas [data-herramienta="fondo"]');
  ok('y con «Todas» va a todas', new RegExp(`las ${nLam} láminas`).test(await p.locator('#hoja .a-quien').textContent()));
  await p.keyboard.press('Escape');
  await p.click('.alcance [data-alcance="esta"]');
  // SUBIR una foto del teléfono.
  const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.click('#editor-herramientas [data-herramienta="subir"]')]);
  const antesPics = await p.evaluate(async () => (await window.__pres.N.modelo(window.__pres.D, 2)).formas.filter((f) => f.tipo === 'pic').length);
  await chooser.setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(PNG, 'base64') });
  // (waitForFunction con una promesa regresa al instante: se revisa a mano, en ciclo)
  for(let k = 0; k < 60; k++){
    if(await p.evaluate(async (n) => (await window.__pres.N.modelo(window.__pres.D, 2)).formas.filter((f) => f.tipo === 'pic').length > n, antesPics)) break;
    await p.waitForTimeout(250);
  }
  ok('«Subir» pone la foto del teléfono en la lámina, con su forma (sin recortarla)', await p.evaluate(async () => { const m = await window.__pres.N.modelo(window.__pres.D, 2); const f = m.formas.filter((x) => x.tipo === 'pic').at(-1); return Math.abs(f.w / f.h - 64 / 48) < 0.02; }));
  await p.evaluate(() => document.querySelector('#visor').close());
  // Desde la rejilla, «Texto» ya trae el botón de agregar un cuadro.
  await p.click('.dock [data-panel="texto"]');
  await p.click('#hoja [data-agregar-texto]');
  await p.waitForSelector('#visor[open]'); await p.waitForSelector('#hoja2[open] .agregar-texto');
  ok('en la hoja de Texto de siempre, «＋ Agregar un cuadro de texto» abre el editor con los tres botones', true);
  await p.evaluate(() => { document.querySelector('#hoja2').close(); document.querySelector('#visor').close(); });
}

console.log('\n· Presentar');
await p.click('#b-presentar');
await p.waitForSelector('#presentar[open] .diapo .lienzo');
ok('«Presentar» abre la lámina a pantalla completa', /1 \/ 19/.test(await p.locator('#presentar-cuenta').textContent()));
await p.keyboard.press('ArrowRight');
await p.waitForFunction(() => /2 \/ 19/.test(document.querySelector('#presentar-cuenta').textContent));
ok('avanza, con su transición', await p.evaluate(() => [...document.querySelectorAll('#presentar .diapo')].some((d) => /tr-empujar/.test(d.className))));
await p.waitForTimeout(900);
await captura(p, '18-presentar');
const pres = await p.locator('#presentar-escenario').boundingBox();
ok('la lámina llena el ancho del teléfono sin salirse', pres.width <= 391 && pres.width > 380, JSON.stringify(pres));
await p.mouse.click(40, 400);
await p.waitForFunction(() => /1 \/ 19/.test(document.querySelector('#presentar-cuenta').textContent));
ok('tocar a la izquierda regresa', true);
await p.keyboard.press('Escape');
ok('Esc sale', await p.locator('#presentar').evaluate((d) => !d.open));

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

console.log('\n· Cuando el teléfono tira la petición antes de mandarla');
safariTerco = true;
const t = await pagina(390, 844);
await t.p.click('.vistas [data-vista="banco"]');
await t.p.waitForSelector('#banco:not([hidden]) .banco-cab', { timeout: 10000 }).catch(() => {});
const lasDeBanco = pedidos.filter((x) => /\/banco/.test(x.u)).slice(-2);
ok('el banco abre igual: reintenta con la llave en la dirección (sin la cabecera)', await t.p.locator('#banco .banco-cab').count() === 1 && /[?&]llave=llave-de-prueba/.test(lasDeBanco.at(-1)?.u || ''), (await t.p.locator('#banco').textContent()).slice(0, 120));
safariTerco = false;

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
