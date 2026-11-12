/* Pruebas de Explica con el pizarrón infinito (lienzo.js), en un Chromium de verdad a 390×844:
   una clase de muestra con TODOS los tipos de elemento, sin voz y sin IA.
   node sala/pruebas-explica.mjs           FOTOS=carpeta guarda capturas */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { chromium } = await import(path.join(execSync('npm root -g').toString().trim(), 'playwright/index.mjs'));
let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };

export const CLASE = { titulo: 'El sistema circulatorio', visual: true, motor: 'groq', pasos: [
  { voz: 'Hoy vemos el sistema circulatorio.', pizarra: { tipo: 'titulo', texto: 'El sistema **circulatorio**', sub: 'Cómo viaja la sangre por tu cuerpo', icono: 'heart-pulse' } },
  { voz: 'Primero, la idea general.', pizarra: { tipo: 'texto', texto: 'Es la red que lleva **oxígeno** y nutrientes a cada célula y se lleva los desechos. Funciona __sin parar__, día y noche, como una ((carretera)).', icono: 'activity' } },
  { voz: 'Sus partes.', pizarra: { tipo: 'lista', titulo: 'Sus tres partes', items: ['El **corazón**, la bomba', 'La sangre, lo que viaja', 'Los vasos, el camino'], estilo: 'numeros', conecta: true } },
  { voz: 'Definición.', pizarra: { tipo: 'definicion', termino: 'Arteria', texto: 'Vaso que lleva la sangre **desde** el corazón hacia el cuerpo.', icono: 'heart' } },
  { voz: 'Una fórmula.', pizarra: { tipo: 'formula', expresion: 'GC = FC × VS', texto: 'Gasto cardiaco', variables: [{ simbolo: 'FC', significado: 'latidos por minuto' }, { simbolo: 'VS', significado: 'sangre por latido' }] } },
  { voz: 'Ejemplo.', pizarra: { tipo: 'ejemplo', titulo: 'Ejemplo', pasos: ['FC = 70 latidos por minuto', 'VS = 70 mL', 'GC = 70 × 70'], resultado: '4.9 litros por minuto' } },
  { voz: 'Cita.', pizarra: { tipo: 'cita', texto: 'El corazón tiene razones que la razón no conoce.', autor: 'Blaise Pascal' } },
  { voz: 'Nota.', pizarra: { tipo: 'nota', titulo: 'Para el examen', texto: 'Arterias salen, venas entran.' } },
  { voz: 'Ojo.', pizarra: { tipo: 'ojo', texto: 'No todas las arterias llevan sangre oxigenada: la pulmonar no.' } },
  { voz: 'Dato.', pizarra: { tipo: 'dato', numero: '100 mil', texto: 'latidos al día, más o menos' } },
  { voz: 'Piensa.', pizarra: { tipo: 'pregunta', pregunta: '¿Por qué se acelera el corazón al correr?', respuesta: 'Porque los músculos piden más oxígeno.' } },
  { voz: 'Código.', pizarra: { tipo: 'codigo', lenguaje: 'Python', codigo: 'latidos = 70\ngasto = latidos * 70\nprint(gasto)' } },
  { voz: 'Foto.', pizarra: { tipo: 'imagen', buscar: 'Corazón humano', pie: 'Un corazón de verdad' } },
  { voz: 'Dibujo.', pizarra: { tipo: 'icono', icono: 'heart-pulse', texto: 'Late unas 70 veces por minuto' } },
  { voz: 'Partes.', pizarra: { tipo: 'partes', icono: 'heart', titulo: 'Partes del corazón', partes: ['Aurícula derecha', 'Aurícula izquierda', 'Ventrículo derecho', 'Ventrículo izquierdo'] } },
  { voz: 'Comparar.', pizarra: { tipo: 'comparar', titulo: 'Arterias contra venas', a: { nombre: 'Arterias', puntos: ['Salen del corazón', 'Paredes gruesas'] }, b: { nombre: 'Venas', puntos: ['Llegan al corazón', 'Tienen válvulas'] } } },
  { voz: 'Pasos.', pizarra: { tipo: 'pasos', titulo: 'El recorrido', pasos: [{ titulo: 'Sale del ventrículo', texto: 'Por la aorta' }, { titulo: 'Llega a las células' }, { titulo: 'Regresa por las venas' }] } },
  { voz: 'Línea.', pizarra: { tipo: 'linea', titulo: 'Quién lo descubrió', eventos: [{ fecha: '1628', texto: 'William Harvey describe la circulación' }, { fecha: '1661', texto: 'Malpighi ve los capilares' }] } },
  { voz: 'Tabla.', pizarra: { tipo: 'tabla', titulo: 'Los vasos', columnas: ['Vaso', 'Lleva', 'Pared'], filas: [['Arteria', 'Desde el corazón', 'Gruesa'], ['Vena', 'Hacia el corazón', 'Delgada'], ['Capilar', 'Intercambio', 'Muy fina']] } },
  { voz: 'Diagrama.', pizarra: { tipo: 'diagrama', titulo: 'El circuito', nodos: [{ id: 'a', texto: 'Corazón' }, { id: 'b', texto: 'Pulmones' }, { id: 'c', texto: 'Cuerpo' }], flechas: [{ de: 'a', a: 'b', texto: 'sin oxígeno' }, { de: 'a', a: 'c' }, { de: 'b', a: 'a' }] } },
  { voz: 'Venn.', pizarra: { tipo: 'venn', titulo: 'Circulatorio y respiratorio', conjuntos: [{ nombre: 'Circulatorio', puntos: ['Corazón', 'Sangre'] }, { nombre: 'Respiratorio', puntos: ['Pulmones', 'Aire'] }], centro: 'Oxigenar la sangre', comun: ['El intercambio en los alvéolos'] } },
  { voz: 'Venn de tres.', pizarra: { tipo: 'venn', titulo: 'Tres sistemas', conjuntos: [{ nombre: 'Circulatorio', puntos: ['Sangre'] }, { nombre: 'Respiratorio', puntos: ['Aire'] }, { nombre: 'Digestivo', puntos: ['Comida'] }], centro: 'Energía' } },
  { voz: 'Mapa.', pizarra: { tipo: 'mapa', centro: 'Circulación', ramas: [{ texto: 'Corazón', hijos: ['4 cavidades'] }, { texto: 'Sangre', hijos: ['Glóbulos rojos', 'Plasma'] }, { texto: 'Vasos', hijos: ['Arterias', 'Venas'] }, { texto: 'Enfermedades' }] } },
  { voz: 'Ciclo.', pizarra: { tipo: 'ciclo', titulo: 'El latido', etapas: ['Se llena', 'Se contrae', 'Expulsa', 'Descansa'], centro: 'Cada 0.8 s' } },
  { voz: 'Pirámide.', pizarra: { tipo: 'piramide', titulo: 'Niveles', niveles: ['Organismo', 'Sistema', 'Órgano', 'Tejido', 'Célula'] } },
  { voz: 'Embudo.', pizarra: { tipo: 'embudo', titulo: 'De lo grande a lo chico', niveles: ['Aorta', 'Arterias', 'Arteriolas', 'Capilares'] } },
  { voz: 'Árbol.', pizarra: { tipo: 'arbol', titulo: 'Tipos de vasos', raiz: 'Vasos sanguíneos', hijos: [{ texto: 'Arterias', hijos: ['Aorta', 'Coronarias'] }, { texto: 'Venas', hijos: ['Cavas'] }, { texto: 'Capilares' }] } },
  { voz: 'Causas.', pizarra: { tipo: 'causas', titulo: 'Hipertensión', efecto: 'Presión alta', causas: ['Mucha sal', 'Estrés', 'Poco ejercicio', 'Herencia'] } },
  { voz: 'Matriz.', pizarra: { tipo: 'matriz', titulo: 'Hábitos', ejeX: 'más fácil', ejeY: 'más impacto', cuadrantes: ['Ejercicio', 'Dormir bien', 'Dejar de fumar', 'Tomar agua'] } },
  { voz: 'Escala.', pizarra: { tipo: 'escala', titulo: 'Presión', izquierda: 'Baja', derecha: 'Alta', marcas: [{ texto: '90/60', pos: 15 }, { texto: '120/80', pos: 50 }, { texto: '140/90', pos: 85 }] } },
  { voz: 'Barras.', pizarra: { tipo: 'barras', titulo: 'Latidos por minuto', unidad: 'lpm', datos: [{ etiqueta: 'Bebé', valor: 130 }, { etiqueta: 'Niño', valor: 95 }, { etiqueta: 'Adulto', valor: 70 }] } },
  { voz: 'Líneas.', pizarra: { tipo: 'lineas', titulo: 'Pulso al correr', ejeY: 'lpm', puntos: [{ x: '0 min', y: 70 }, { x: '5', y: 120 }, { x: '10', y: 150 }, { x: '15', y: 155 }] } },
  { voz: 'Pastel.', pizarra: { tipo: 'pastel', titulo: 'La sangre', datos: [{ etiqueta: 'Plasma', valor: 55 }, { etiqueta: 'Glóbulos rojos', valor: 44 }, { etiqueta: 'Otros', valor: 1 }] } },
  { voz: 'Resumen.', pizarra: { tipo: 'resumen', puntos: ['El corazón bombea', 'La sangre transporta', 'Los vasos guían'] } },
  { voz: '', pregunta: '¿Y por qué las venas se ven azules?', pizarra: { tipo: 'titulo', texto: '¿Y por qué las venas se ven azules?', sub: 'Tu pregunta' } },
  { voz: 'Por cómo la piel deja pasar la luz: la sangre siempre es roja.', pizarra: { tipo: 'texto', texto: 'La sangre es **roja**; el azul es un efecto de la luz en la piel.' } },
], referencias: [{ titulo: 'Sistema circulatorio', tipo: 'Wikipedia' }], repaso: [{ pregunta: '¿Qué bombea la sangre?', respuesta: 'El corazón.' }] };

const TIPOS_HTTP = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const servidor = http.createServer((q, res) => {
  const u = new URL(q.url, 'http://x');
  const f = path.join(raiz, decodeURIComponent(u.pathname));
  if(!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TIPOS_HTTP[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const base = `http://localhost:${servidor.address().port}`;
const nav = await chromium.launch();
const errores = [];
async function abrir(ancho = 390, alto = 844, cursores = 'monton'){
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: process.env.FOTOS ? 2 : 1, hasTouch: true, serviceWorkers: 'block' });
  await ctx.addInitScript((c) => { try{ localStorage.setItem('explica.voz', '"no"'); localStorage.setItem('explica.cursores', JSON.stringify(c)); localStorage.setItem('salaLlave', 'x'); }catch{} }, cursores);
  /* Wikipedia de mentiras: la foto es una del repo */
  /* Wikipedia de mentiras: dice que el original mide 2000 px, pero la versión de 640 no existe (404): tiene que caer a la miniatura */
  await ctx.route(/wikipedia\.org/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ title: 'Corazón humano', thumbnail: { source: `${base}/no-existe/320px-foto.webp` }, originalimage: { source: `${base}/urban-pest/web/img/planta.webp`, width: 2000 }, content_urls: { mobile: { page: 'https://es.wikipedia.org/wiki/Coraz%C3%B3n' } } }) }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => { if(m.type() === 'error' && !/favicon|404/.test(m.text())) errores.push(m.text()); if(m.type() === 'warning' && /No pude armar/.test(m.text())) errores.push(m.text()); });
  await p.goto(`${base}/sala/explica.html`);
  await p.waitForFunction(() => window.__explica);
  return { ctx, p };
}
const foto = async (p, n) => { if(process.env.FOTOS){ fs.mkdirSync(process.env.FOTOS, { recursive: true }); await p.screenshot({ path: path.join(process.env.FOTOS, n + '.png') }); } };
const fotos = process.env.FOTOS;

try{
  console.log('Lo que manda la IA');
  {
    const { ctx, p } = await abrir();
    const r = await p.evaluate(() => {
      const n = window.__explica.normalizarPizarra;
      return {
        sinonimo: n({ tipo: 'Mapa mental', centro: 'X', ramas: ['a', 'b'] })?.tipo,
        roto: n({ tipo: 'barras', datos: [{ etiqueta: 'a', valor: 'mucho' }] }),
        desconocido: n({ tipo: 'holograma', texto: 'hola' })?.tipo,
        icono: n({ tipo: 'icono', icono: 'Heart', texto: 'x' })?.icono,
        iconoMalo: n({ tipo: 'icono', icono: 'unicornio-volador', texto: 'x' })?.tipo,
        venn1: n({ tipo: 'venn', conjuntos: [{ nombre: 'A' }] }),
        partesSinDibujo: n({ tipo: 'partes', icono: 'nada', partes: ['a', 'b'] })?.tipo,
      };
    }).catch((e) => ({ error: e.message }));
    ok(r.sinonimo === 'mapa', '«Mapa mental» se entiende como mapa');
    ok(r.roto === null, 'una gráfica sin números de verdad no se dibuja');
    ok(r.desconocido === 'texto', 'un tipo que no existe se vuelve texto');
    ok(r.icono === 'heart', 'el dibujo se encuentra aunque venga con mayúscula');
    ok(r.iconoMalo === 'texto', 'un dibujo que no existe se vuelve texto, no un hueco');
    ok(r.venn1 === null, 'un Venn de un solo círculo no se dibuja');
    ok(r.partesSinDibujo === 'lista', '«partes» sin dibujo se vuelve lista');
    await ctx.close();
  }

  console.log('La clase completa, dibujada por muchos cursores');
  {
    const { ctx, p } = await abrir();
    await p.evaluate((c) => window.__explica.empezar(c), CLASE);
    await p.waitForFunction(() => window.__explica.estado().dibujados >= 1);
    /* a media clase: el texto va saliendo letra por letra, no de golpe */
    let vioParcial = false, maxCur = 0;
    for(let k = 0; k < 40; k++){
      const e = await p.evaluate(() => { const el = [...document.querySelectorAll('#tablero .el')].pop(); const cs = el ? el.querySelectorAll('.c') : []; const v = el ? el.querySelectorAll('.c.v').length : 0; return { total: cs.length, v, cur: document.querySelectorAll('#tablero .cur').length }; });
      if(e.total > 10 && e.v > 0 && e.v < e.total) vioParcial = true;
      maxCur = Math.max(maxCur, e.cur);
      await p.waitForTimeout(60);
    }
    ok(vioParcial, 'el texto se revela letra por letra al paso del cursor');
    await foto(p, '01-dibujando');
    /* hasta el elemento con muchos pedazos (la tabla), y ahí se cuentan los cursores */
    const iTabla = CLASE.pasos.findIndex((x) => x.pizarra && x.pizarra.tipo === 'tabla');
    await p.evaluate((i) => { const b = document.querySelector('#bSig'); for(let k = 0; k < i; k++) b.click(); }, 0);
    await p.waitForFunction((i) => window.__explica.estado().actual >= 0, iTabla);
    await p.evaluate(async (i) => { while(window.__explica.estado().actual < i){ document.querySelector('#bSig').click(); await new Promise((r) => setTimeout(r, 30)); } }, iTabla);
    for(let k = 0; k < 30; k++){ maxCur = Math.max(maxCur, await p.evaluate(() => document.querySelectorAll('#tablero .cur').length)); await p.waitForTimeout(50); }
    ok(maxCur >= 4, `muchos cursores dibujan a la vez (${maxCur})`);
    await foto(p, '02-tabla-muchos-cursores');
    const conNombre = await p.evaluate(() => [...document.querySelectorAll('#tablero .cur .etq')].map((x) => x.textContent));
    ok(conNombre.includes('Negro'), 'el cursor principal lleva el nombre de quien explica');
    /* hasta el final, rápido */
    await p.evaluate(async () => { const n = window.__explica.estado().pasos; while(window.__explica.estado().actual < n - 1){ document.querySelector('#bSig').click(); await new Promise((r) => setTimeout(r, 40)); } document.querySelector('#bSig').click(); });
    await p.waitForTimeout(1500);
    const fin = await p.evaluate(() => ({ piezas: document.querySelectorAll('#tablero .el').length, sinLetra: document.querySelectorAll('#tablero .c:not(.v)').length, rayasOcultas: [...document.querySelectorAll('#tablero path')].filter((x) => x.style.strokeDashoffset && parseFloat(x.style.strokeDashoffset) > 1 && x.style.strokeDasharray !== 'none').length, tipos: [...new Set([...document.querySelectorAll('#tablero .el')].map((e) => e.classList[1]))] }));
    const conPizarra = CLASE.pasos.filter((x) => x.pizarra).length;
    ok(fin.piezas === conPizarra, `todos los elementos quedaron en el pizarrón (${fin.piezas} de ${conPizarra})`);
    ok(fin.sinLetra === 0, `al final no queda ninguna letra sin escribir (${fin.sinLetra})`);
    ok(fin.rayasOcultas === 0, `al final no queda ninguna raya a medias (${fin.rayasOcultas})`);
    ok(fin.tipos.length >= 32, `${fin.tipos.length} tipos distintos de elemento dibujados`);
    const tamaños = await p.evaluate(() => [...document.querySelectorAll('#tablero .el')].map((e) => ({ t: e.classList[1], w: e.offsetWidth, h: e.offsetHeight })));
    ok(tamaños.every((x) => x.h > 20 && x.w > 200), 'ningún elemento salió vacío ni aplastado' + (tamaños.filter((x) => x.h <= 20 || x.w <= 200).map((x) => ` ${x.t}:${x.w}x${x.h}`).join('')));
    ok(await p.isVisible('#bApuntes'), 'al terminar se puede abrir los apuntes');
    /* la foto cargó aunque su primera dirección no existía */
    const foto0 = await p.evaluate(() => { const i = document.querySelector('#tablero .el.imagen img'); return i ? { ok: i.complete && i.naturalWidth > 0, src: i.src } : null; });
    ok(foto0 && foto0.ok && /planta/.test(foto0.src), 'si la foto grande de Wikipedia no existe, carga la siguiente (no un recuadro vacío)');
    /* el cursor de quien explica no se queda plantado: al terminar se va por la orilla */
    await p.waitForTimeout(2200);
    const fuera = await p.evaluate(() => { const c = document.querySelector('#tablero .cur'); if(!c) return true; const r = c.getBoundingClientRect(), v = document.querySelector('#tablero').getBoundingClientRect(); return r.left < v.left - 5 || r.right > v.right + 5 || r.top < v.top - 5 || r.bottom > v.bottom + 5; });
    ok(fuera, 'el cursor de Negro se retira cuando ya no hay nada que dibujar');
    /* todo lo que se dijo, en lista, con la pregunta */
    await p.click('#bDicho');
    await p.waitForSelector('#hojaDicho .lista-dicho');
    const dicho = await p.evaluate(() => ({ n: document.querySelectorAll('#hojaDicho .lista-dicho li:not(.preg-dicho)').length, preg: [...document.querySelectorAll('#hojaDicho .preg-dicho')].map((x) => x.textContent), ancho: document.documentElement.scrollWidth }));
    ok(dicho.n === CLASE.pasos.filter((x) => x.voz).length, `«Lo dicho» trae TODO lo que se dijo, en lista (${dicho.n})`);
    ok(dicho.preg.length === 1 && /venas se ven azules/.test(dicho.preg[0]), '…y las preguntas que hiciste');
    ok(dicho.ancho <= 390, '«Lo dicho» no se sale de lado');
    await foto(p, '03b-dicho');
    await p.click('#bVolverDicho');
    await foto(p, '03-todo');
    /* el dedo mueve el pizarrón y aparece «Seguir la clase» */
    await p.evaluate(() => { document.querySelector('#bPlay').click(); });
    await p.waitForTimeout(300);
    const antes = await p.evaluate(() => window.__explica.lienzo.camara);
    await p.mouse.move(200, 400); await p.mouse.down(); await p.mouse.move(120, 250, { steps: 6 }); await p.mouse.up();
    const despues = await p.evaluate(() => window.__explica.lienzo.camara);
    ok(Math.abs(despues.x - antes.x) > 30 || Math.abs(despues.y - antes.y) > 30, 'arrastrar mueve el pizarrón');
    ok(await p.isVisible('#bSeguir'), 'al moverlo a mano sale «Seguir la clase»');
    await p.click('#bSeguir');
    ok(!(await p.evaluate(() => window.__explica.lienzo.libre)), '«Seguir la clase» regresa la cámara a los cursores');
    /* apuntes */
    await p.click('#bApuntes');
    await p.waitForSelector('#hojaApuntes .portada-ap');
    const ap = await p.evaluate(() => ({ bloques: document.querySelectorAll('#apCuerpo .bloque-ap').length, els: document.querySelectorAll('#apCuerpo .el').length, sinLetra: document.querySelectorAll('#apCuerpo .c:not(.v)').length, ancho: document.documentElement.scrollWidth, refs: document.querySelectorAll('.refs-ap li').length }));
    ok(ap.bloques === CLASE.pasos.length && ap.els === conPizarra, `los apuntes traen cada paso con su dibujo (${ap.els})`);
    ok(ap.sinLetra === 0, 'en los apuntes todo está escrito');
    ok(ap.ancho <= 390, `los apuntes no se salen de lado (${ap.ancho})`);
    ok(ap.refs === 1, 'los apuntes traen las referencias');
    if(fotos){ await foto(p, '04-apuntes'); await p.evaluate(() => scrollTo(0, 1800)); await foto(p, '05-apuntes-2'); await p.evaluate(() => scrollTo(0, 5200)); await foto(p, '06-apuntes-3'); }
    await ctx.close();
  }

  console.log('Pantalla grande: el pizarrón en columnas');
  {
    const { ctx, p } = await abrir(1366, 900, 'varios');
    await p.evaluate((c) => window.__explica.empezar({ ...c, pasos: c.pasos.slice(0, 12) }), CLASE);
    await p.evaluate(async () => { while(window.__explica.estado().actual < 11){ document.querySelector('#bSig').click(); await new Promise((r) => setTimeout(r, 40)); } document.querySelector('#bSig').click(); });
    await p.waitForTimeout(1500);
    const xs = await p.evaluate(() => [...new Set([...document.querySelectorAll('#tablero .el')].map((e) => e.offsetLeft))].length);
    ok(xs >= 2, `en pantalla grande los elementos se acomodan en varias columnas (${xs})`);
    await foto(p, '07-escritorio');
    await ctx.close();
  }

  console.log('Sólo un cursor');
  {
    const { ctx, p } = await abrir(390, 844, 'uno');
    await p.evaluate((c) => window.__explica.empezar({ ...c, pasos: c.pasos.slice(18, 20) }), CLASE);
    let maxCur = 0; for(let k = 0; k < 30; k++){ maxCur = Math.max(maxCur, await p.evaluate(() => document.querySelectorAll('#tablero .cur').length)); await p.waitForTimeout(60); }
    ok(maxCur === 1, `con «sólo uno» dibuja un solo cursor (${maxCur})`);
    await ctx.close();
  }

  ok(!errores.length, 'sin errores en la consola' + (errores.length ? ': ' + [...new Set(errores)].slice(0, 4).join(' | ') : ''));
}catch(e){ ok(false, 'la prueba tronó: ' + e.message.split('\n')[0]); }
finally{ await nav.close(); servidor.close(); }
console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
