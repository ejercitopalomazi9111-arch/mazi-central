/* Pruebas de Apuntes (apuntes.js) y del lápiz (trazo.js), en un navegador de verdad a 390×844.
   node carymo/pruebas-apuntes.mjs            (FOTOS=carpeta para capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8600 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1, hasTouch: false });
const pg = await ctx.newPage();
const err = []; pg.on('pageerror', (e) => err.push(e.message));
const foto = async (nombre) => { if(process.env.FOTOS) await pg.screenshot({ path: `${process.env.FOTOS}/${nombre}.png` }); };
await pg.addInitScript(() => {
  localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'no' }));
  localStorage.setItem('est.planes', JSON.stringify({ p1: { id: 'p1', titulo: 'Examen de Biología', materia: 'Biología', fecha: '2026-11-30', forma: 2, progreso: {}, cambio: Date.now(),
    unidades: [{ id: 'u1', titulo: 'La célula', color: '#7E1735', temas: [{ id: 't1', titulo: 'Membrana celular' }], nodos: [{ id: 'n0', tipo: 'pizarra', alcance: 'unidad', titulo: 'La célula' }, { id: 'n1', tipo: 'pizarra', tema: 't1', titulo: 'Membrana celular' }, { id: 'n2', tipo: 'quiz', tema: 't1', titulo: 'Membrana celular' }] }],
    contenido: { t1: { leccion: { titulo: 'Membrana celular', ideas: [{ titulo: 'Qué es', texto: 'La capa que envuelve a la célula.' }, { titulo: 'Para qué', texto: 'Decide qué entra y qué sale.' }], dato: 'Es semipermeable.' }, preguntas: [] } } } }));
  localStorage.setItem('est.actual', JSON.stringify('p1'));
  localStorage.setItem('explica.historial', JSON.stringify([{ id: 'c1', titulo: 'La fotosíntesis', fecha: Date.now() - 1000, pasos: [{ voz: '…', pizarra: { tipo: 'titulo', texto: 'La fotosíntesis' } }, { voz: '…', pizarra: { tipo: 'lista', titulo: 'Necesita', items: ['Luz', 'Agua', '**CO₂**'] } }], repaso: [{ pregunta: '¿Qué produce la fotosíntesis?' }] }]));
});
await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__estudio);
await pg.click('#nav [data-ir="yo"]').then(() => pg.click('#vYo [data-ir="apuntes"]'));
await pg.waitForSelector('.ap-card');

console.log('Los apuntes que salen solos');
const titulos = await pg.$$eval('.ap-card b', (x) => x.map((e) => e.textContent));
ok(titulos.includes('Membrana celular'), 'de la lección de tu plan sale su apunte con sus ideas');
ok(titulos.includes('La fotosíntesis'), 'y de la clase del pizarrón, el suyo');
ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390, 'nada se sale de lado');
await foto('01-lista');
await pg.fill('#apBuscar', 'fotosintesis'); await pg.waitForTimeout(450);
ok((await pg.$$('.ap-card')).length === 1, 'el buscador encuentra sin acentos');
await pg.fill('#apBuscar', ''); await pg.waitForTimeout(450);
/* carpetas: tipo y luego materia (Carlos, 13 nov) */
ok(await pg.locator('.ap-carpeta[data-apf]').count() === 3, 'la entrada son tres carpetas: tuyos, de tus lecciones y del pizarrón');
ok(/1/.test(await pg.textContent('.ap-carpeta[data-apf="leccion"] .ap-n')), 'cada carpeta dice cuántos apuntes trae');
await pg.click('.ap-carpeta[data-apf="leccion"]'); await pg.waitForTimeout(300);
ok(await pg.locator('.ap-card:has-text("Membrana celular")').count() === 1 && await pg.locator('.ap-card:has-text("La fotosíntesis")').count() === 0, 'adentro de «De tus lecciones» sólo salen esos (con una sola materia, directo a la lista)');
await pg.click('.ap-migas [data-apf="todos"]'); await pg.waitForTimeout(300);
ok(await pg.locator('.ap-carpeta[data-apf]').count() === 3, '«‹ Apuntes» regresa a las carpetas');
await pg.click('.ap-card:has-text("La fotosíntesis")');
const puntos = await pg.$$eval('.ap-puntos li', (x) => x.map((e) => e.textContent));
ok(puntos.some((p) => /Necesita: Luz · Agua · CO₂/.test(p)) && puntos.some((p) => /Repaso/.test(p)), 'el apunte del pizarrón trae lo que se escribió y el repaso (sin las marcas **)');
await foto('02-auto');

console.log('Hacerlo mío');
await pg.click('[data-mio]');
await pg.waitForSelector('#apTxt');
ok(/Necesita: Luz/.test(await pg.inputValue('#apTxt')), 'se copia a tus apuntes con sus puntos');
await pg.fill('#apTit', 'Fotosíntesis (mío)'); await pg.fill('#apTxt', 'La planta hace su comida con luz.');
await pg.waitForTimeout(700);
await pg.click('[data-cerrar]'); await pg.waitForTimeout(400);
await pg.click('[data-apf="propio"]'); await pg.waitForTimeout(300);
ok((await pg.$$eval('.ap-card b', (x) => x.map((e) => e.textContent))).includes('Fotosíntesis (mío)'), 'y se guarda solo, sin botón de guardar');

console.log('El lápiz');
await pg.click('.ap-card:has-text("Fotosíntesis (mío)")');
await pg.click('[data-dibujar]');
await pg.waitForSelector('.dib-vista'); await pg.waitForTimeout(400);
/* se dibuja ya con el muelle vacío (muelle.js): si un aviso se va a media prueba, la hoja crece y lo dibujado se recorre */
const calma = async () => { await pg.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--muelle').trim() === '0px', null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(400); };
await calma();
const oscuros = () => pg.evaluate(() => { const c = document.querySelector('.dib-vista'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let k = 0; for(let i = 0; i < d.length; i += 4) if(d[i] < 120 && d[i + 1] < 90 && d[i + 2] < 120 && d[i + 3] > 200) k++; return k; });
const antes = await oscuros();
/* la hoja se mide en cada raya: si un aviso del muelle (muelle.js) se va, la página sube y la hoja con ella */
let caja = null;
const trazar = async (x0, y0, x1, y1) => { caja = await pg.$eval('.dib-vista', (c) => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }); await pg.mouse.move(caja.x + caja.w * x0, caja.y + caja.h * y0); await pg.mouse.down(); for(let k = 1; k <= 24; k++) await pg.mouse.move(caja.x + caja.w * (x0 + (x1 - x0) * k / 24), caja.y + caja.h * (y0 + (y1 - y0) * k / 24 + Math.sin(k / 3) * .02)); await pg.mouse.up(); await pg.waitForTimeout(120); };
await trazar(.2, .3, .8, .35);
const despues = await oscuros();
await foto('02b-dibujo');
ok(despues > antes + 200, `dibujar con el dedo pinta en la hoja (${antes} → ${despues} pixeles de tinta)`);
await pg.click('[data-deshacer]'); await pg.waitForTimeout(150);
{ const d = await oscuros(); ok(Math.abs(d - antes) < 40, `deshacer lo quita (${antes} → ${despues} → ${d})`); }
await pg.click('[data-rehacer]'); await pg.waitForTimeout(150);
ok((await oscuros()) > antes + 200, 'y rehacer lo regresa');
const antesDeBorrar = await oscuros();   /* se cuenta justo antes: si la hoja cambió de tamaño, la tinta se vuelve a pintar a su escala */
await pg.click('[data-herr="borrador"]'); await trazar(.2, .32, .8, .33); await pg.click('[data-herr="pincel"]');
ok((await oscuros()) < antesDeBorrar, `el borrador borra (${antesDeBorrar} → ${await oscuros()})`);

console.log('Los pinceles');
await pg.click('[data-pinceles]');
ok((await pg.$$('.pincel-t')).length >= 12, 'hay pinceles hechos (lápiz, pluma, rotulador, resaltador, caligrafía, aerógrafo, acuarela, gis…)');
await foto('03-pinceles');
await pg.click('[data-nuevo-pin]');
await pg.fill('#pinNom', 'Mi tinta');
await pg.$eval('[data-k="entrada"]', (e) => { e.value = 90; e.dispatchEvent(new Event('input', { bubbles: true })); });
await pg.$eval('[data-k="salida"]', (e) => { e.value = 90; e.dispatchEvent(new Event('input', { bubbles: true })); });
await foto('04-editar-pincel');
await pg.click('#pinGuardar'); await pg.waitForTimeout(200);
const mios = await pg.evaluate(() => JSON.parse(localStorage.getItem('carymo.pinceles') || '[]'));
ok(mios.length === 1 && mios[0].nombre === 'Mi tinta' && mios[0].entrada === 90, 'se crea un pincel propio con sus ajustes y queda guardado');
ok(/Mi tinta/.test(await pg.textContent('#dibPincelNom')), 'y queda puesto');

console.log('Las capas');
await pg.click('[data-capas]');
await pg.click('[data-nueva]'); await pg.waitForTimeout(150);
ok((await pg.$$('.capa-f')).length === 2, 'se agrega una capa');
await foto('05-capas');
await pg.evaluate(() => document.getElementById('velo')?.click());

console.log('La punta');
const ancho = await pg.evaluate(async () => {
  const { pintarTrazo, PINCELES } = await import('./trazo.js');
  const medir = (pincel) => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 100; const x = c.getContext('2d');
    const pts = []; for(let k = 0; k <= 100; k++) pts.push({ x: 20 + k * 5.6, y: 50, p: .7 });
    pintarTrazo(x, pts, { ...pincel, tam: 24, estabilizador: 0, dispersion: 0 }, '#000');
    const col = (cx) => { const d = x.getImageData(cx, 0, 1, 100).data; let k = 0; for(let i = 3; i < d.length; i += 4) if(d[i] > 60) k++; return k; };
    return { ini: col(26), medio: col(300), fin: col(574) };
  };
  const p = PINCELES.find((x) => x.id === 'pluma'), dg = PINCELES.find((x) => x.id === 'delgado-grueso'), r = PINCELES.find((x) => x.id === 'rotulador');
  return { pluma: medir({ ...p, entrada: 90, salida: 90 }), dg: medir(dg), rot: medir(r) };
});
ok(ancho.pluma.ini < ancho.pluma.medio * .6 && ancho.pluma.fin < ancho.pluma.medio * .6, `tinta de pluma: delgada-gruesa-delgada (${ancho.pluma.ini} · ${ancho.pluma.medio} · ${ancho.pluma.fin} px)`);
ok(ancho.dg.ini < ancho.dg.medio * .6 && ancho.dg.fin >= ancho.dg.medio * .8, `«delgado a grueso»: empieza delgado y termina grueso (${ancho.dg.ini} · ${ancho.dg.medio} · ${ancho.dg.fin} px)`);
ok(Math.abs(ancho.rot.ini - ancho.rot.medio) <= 3, 'el rotulador es parejo de principio a fin');

console.log('Guardar el dibujo');
await trazar(.3, .6, .7, .62);
await pg.click('[data-listo]');
await pg.waitForSelector('#apDib img', { timeout: 5000 });
ok(await pg.isVisible('#apDib img'), 'al terminar, el dibujo se ve en el apunte');
await pg.click('[data-cerrar]'); await pg.waitForTimeout(400);
ok(await pg.isVisible('.ap-card img'), 'y en la lista sale su miniatura');
await foto('06-con-dibujo');
await pg.click('.ap-card:has-text("Fotosíntesis (mío)")'); await pg.click('[data-dibujar]'); await pg.waitForSelector('.dib-vista'); await pg.waitForTimeout(600); await calma();
ok((await oscuros()) > antes + 200, 'al volver a abrirlo, el dibujo sigue ahí (con sus capas)');
ok(err.length === 0, 'cero errores' + (err.length ? ': ' + err[0] : ''));

console.log(`\n${n - f} pasan · ${f} fallan`);
await b.close(); srv.kill(); process.exit(f ? 1 : 0);
