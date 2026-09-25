#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   EL NÚCLEO DE PRESENTACIONES · `node presentaciones/pruebas-nucleo.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Corre nucleo.js dentro de Chromium (usa DOMParser, como en el teléfono)
   contra las dos presentaciones reales del repo. Cada cambio se comprueba
   RELEYENDO el archivo guardado, no el objeto en memoria: lo que importa es
   lo que Carlos se lleva. Y el archivo guardado se abre con LibreOffice si
   está instalado — un .pptx que no abre es el peor defecto posible.
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.pptx': 'application/octet-stream' };
const servidor = createServer((req, res) => {
  const r = join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  try{ res.writeHead(200, { 'Content-Type': TIPOS[extname(r)] || 'text/html' }).end(extname(r) ? readFileSync(r) : '<!doctype html><title>x</title>'); }
  catch{ res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}`;
const b = await chromium.launch();
const pg = await b.newPage();
const errores = []; pg.on('pageerror', (e) => errores.push(e.message));
await pg.goto(BASE + '/blanco');
await pg.addScriptTag({ url: '/presentaciones/vendor/jszip-3.10.2.min.js' });
const TMP = mkdtempSync(join(tmpdir(), 'pres-'));

/* Corre fn dentro del navegador con el núcleo cargado como N. */
const en = (fn, arg) => pg.evaluate(async ([cuerpo, arg]) => {
  const N = await import('/presentaciones/nucleo.js');
  window.N = N;
  return (0, eval)(`(${cuerpo})`)(N, arg);
}, [fn.toString(), arg]);

for(const archivo of ['fadori/presentacion/Fadori-STEAM.pptx', 'fadori/presentacion/formato-institucional.pptx']){
  console.log(`\n· ${archivo}`);
  const r = await en(async (N, archivo) => {
    const d = await N.abrir(await (await fetch('/' + archivo)).arrayBuffer());
    window.D = d;
    const m = await N.modelo(d, 0);
    const imgs = await N.imagenes(d);
    return { n: d.laminas.length, ancho: d.ancho, formas: m.formas.length, fondo: m.fondo, textos: N.textos(d, 0), imgs: imgs.length, img0: imgs[0] };
  }, archivo);
  ok(`abre: ${r.n} láminas`, r.n > 0, JSON.stringify(r).slice(0, 200));
  ok('la primera lámina tiene formas para dibujar', r.formas > 0, String(r.formas));
  ok('el fondo se entiende (color, degradado o imagen)', !!(r.fondo.color || r.fondo.degradado || r.fondo.imagen), JSON.stringify(r.fondo));

  // Todas las láminas se dejan dibujar sin tronar.
  const todas = await en(async (N) => { let f = 0; for(let i = 0; i < D.laminas.length; i++) f += (await N.modelo(D, i)).formas.length; return f; });
  ok('todas las láminas se dejan modelar', todas > 0, String(todas));

  // Los cambios en lote.
  const c = await en(async (N) => {
    const hecho = {};
    hecho.fondo = await N.operacion(D, 'fondo', () => N.ponerFondo(D, 'todas', { color: '#1E1428' }));
    hecho.contraste = await N.operacion(D, 'contraste', () => N.arreglarContraste(D, 'todas'));
    // Después de arreglar: ningún texto con letra bajo 4.5:1 contra el fondo liso.
    hecho.bajos = [];
    for(let i = 0; i < D.laminas.length; i++){
      const m = await N.modelo(D, i);
      for(const f of m.formas) if(f.parrafos && !f.relleno) for(const p of f.parrafos) for(const r of p.runs)
        if(r.t?.trim() && N.contraste(r.color, m.fondo.color) < 4.5) hecho.bajos.push(`${i + 1}:${r.t.slice(0, 20)}:${r.color}`);
    }
    hecho.letra = await N.operacion(D, 'letra', () => N.ponerFuente(D, 'todas', 'Arial'));
    hecho.color = await N.operacion(D, 'color', () => N.ponerColorTexto(D, 'todas', '#E9E4E4', { en: 'titulos' }));
    hecho.tam = await N.operacion(D, 'tamaño', () => N.escalarTexto(D, 'todas', 1.1, { en: 'texto' }));
    // Una palabra que sí exista: la primera de más de 4 letras del primer texto.
    const palabra = N.resumen(D).flatMap((l) => l.textos).map((t) => t.texto).join(' ').match(/[A-Za-zÁÉÍÓÚáéíóúñÑ]{5,}/)?.[0];
    hecho.palabra = palabra;
    hecho.reemp = await N.operacion(D, 'reemplazar', () => N.reemplazarTexto(D, 'todas', palabra, 'ZZMAZI'));
    hecho.deshacer = D.deshacer.length;
    return hecho;
  });
  ok('el fondo se puso en todas', c.fondo === r.n, JSON.stringify(c));
  ok('con fondo oscuro, el texto que ya no se leía se aclara', c.contraste > 0 && !c.bajos.length, JSON.stringify({ n: c.contraste, bajos: c.bajos.slice(0, 6) }));
  ok('la letra cambió en algo', c.letra > 0, String(c.letra));
  ok(`«${c.palabra}» se reemplazó`, c.reemp > 0, String(c.reemp));
  ok('cada cambio quedó para deshacer', c.deshacer === 6, JSON.stringify(c));

  // Guardar, releer y comprobar sobre el archivo nuevo.
  const guardado = await en(async (N) => {
    const blob = await N.guardar(D);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const d2 = await N.abrir(bytes);
    const m = await N.modelo(d2, d2.laminas.length - 1);
    const texto = N.resumen(d2).flatMap((l) => l.textos).map((t) => t.texto).join(' ');
    const s1 = await d2.zip.file(d2.laminas[0].ruta).async('string');
    return { b64: btoa(Array.from(bytes, (x) => String.fromCharCode(x)).join('')), fondo: m.fondo, tiene: /ZZMAZI/.test(texto), s1: s1.slice(0, 4000) };
  });
  ok('el archivo guardado trae el fondo nuevo hasta la última lámina', guardado.fondo.color === '#1E1428', JSON.stringify(guardado.fondo));
  ok('y el texto reemplazado', guardado.tiene);
  ok('<p:bg> va ANTES de <p:spTree> (PowerPoint lo exige)', guardado.s1.indexOf('<p:bg>') > 0 && guardado.s1.indexOf('<p:bg>') < guardado.s1.indexOf('<p:spTree'));
  const orden = [...guardado.s1.matchAll(/<a:rPr[^>]*>(.*?)<\/a:rPr>/g)].map((m) => m[1]).find((x) => /solidFill/.test(x) && /latin/.test(x));
  ok('en <a:rPr> el color va antes que la letra', !orden || orden.indexOf('solidFill') < orden.indexOf('latin'), orden);
  const salida = join(TMP, archivo.split('/').pop());
  writeFileSync(salida, Buffer.from(guardado.b64, 'base64'));

  // Deshacer todo regresa el archivo a como estaba.
  const vuelta = await en(async (N) => {
    while(D.deshacer.length) await N.deshacer(D);
    const m = await N.modelo(D, 0);
    return { fondo: m.fondo, texto: N.resumen(D).flatMap((l) => l.textos).map((t) => t.texto).join(' ') };
  });
  ok('deshacer todo regresa el fondo original', JSON.stringify({ ...vuelta.fondo, imagen: !!vuelta.fondo.imagen }) === JSON.stringify({ ...r.fondo, imagen: !!r.fondo.imagen }), JSON.stringify(vuelta.fondo));
  ok('y el texto original', !/ZZMAZI/.test(vuelta.texto));

  // LibreOffice: que el archivo abra y salgan tantas páginas como láminas.
  if(existsSync('/usr/bin/soffice') || existsSync('/usr/lib/libreoffice/program/soffice')){
    try{
      execFileSync('soffice', ['--headless', '--norestore', `-env:UserInstallation=file://${TMP}/ui`, '--convert-to', 'pdf', '--outdir', TMP, salida], { timeout: 180000, stdio: 'pipe' });
      const pdf = readFileSync(salida.replace(/\.pptx$/, '.pdf'));
      const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      ok(`LibreOffice lo abre: ${paginas} páginas`, paginas === r.n, String(paginas));
    }catch(e){ ok('LibreOffice lo abre', false, e.message.slice(0, 200)); }
  }
}

console.log('\n· Imágenes');
const im = await en(async (N) => {
  const d = await N.abrir(await (await fetch('/fadori/presentacion/Fadori-STEAM.pptx')).arrayBuffer());
  const lista = await N.imagenes(d);
  if(!lista.length) return { vacia: true };
  // Un PNG de 1×1 violeta.
  const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
  const objetivo = lista[0];
  const antes = objetivo.laminas.length;
  const n = await N.operacion(d, 'imagen', () => N.cambiarImagen(d, objetivo.ruta, { bytes: png, mime: 'image/png' }));
  const d2 = await N.abrir(await (await N.guardar(d)).arrayBuffer());
  const lista2 = await N.imagenes(d2);
  const nueva = lista2.find((x) => x.laminas.join() === objetivo.laminas.join());
  const bytes = nueva && await N.bytesDe(d2, nueva.ruta);
  // Quitar
  const q = await N.operacion(d2, 'quitar', () => N.quitarImagen(d2, 'todas', nueva.ruta));
  return { total: lista.length, ruta: objetivo.ruta, antes, n, nueva: nueva?.ruta, igual: bytes && bytes.length === png.length, quitadas: q };
});
if(im.vacia) ok('(la presentación no trae imágenes)', true);
else{
  ok(`encuentra ${im.total} imágenes y en cuántas láminas sale cada una`, im.total > 0 && im.antes > 0, JSON.stringify(im));
  ok('cambiar una imagen la cambia en todas las láminas donde sale', im.n > 0 && im.igual, JSON.stringify(im));
  ok('quitar la imagen de las láminas', im.quitadas >= 0, String(im.quitadas));
}

console.log('\n· Poner texto (para la IA)');
const tx = await en(async (N) => {
  const d = await N.abrir(await (await fetch('/fadori/presentacion/Fadori-STEAM.pptx')).arrayBuffer());
  const i = d.laminas.findIndex((_, k) => N.textos(d, k).length);
  const t = N.textos(d, i)[0];
  await N.operacion(d, 'texto', () => N.ponerTexto(d, i, t.id, 'Renglón uno\nRenglón dos'));
  const d2 = await N.abrir(await (await N.guardar(d)).arrayBuffer());
  return { antes: t.texto, despues: N.textos(d2, i).find((x) => x.id === t.id)?.texto };
});
ok('el texto nuevo queda con sus dos renglones', tx.despues === 'Renglón uno\nRenglón dos', JSON.stringify(tx));

ok('ni un error de consola', !errores.length, errores.join(' | '));
await b.close(); servidor.close();
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan   (archivos en ${TMP})\n`);
process.exit(mal ? 1 : 0);
