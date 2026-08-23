/* ══════════════════════════════════════════════════════════════════════════
   La presentación del proyecto STEAM · Fadori
   ──────────────────────────────────────────────────────────────────────────
   Se arma con `node armar.mjs`. Las capturas salen de la app de verdad, no
   son maquetas.

   La regla que manda sobre todas: MÁXIMO 15 PALABRAS POR DIAPOSITIVA,
   contando el título. Está en la rúbrica y al final del archivo hay un
   contador que las cuenta y avisa si alguna se pasa. Si no se cuentan solas,
   se pasan solas.
   ═════════════════════════════════════════════════════════════════════════ */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const pptxgen = require('pptxgenjs');

/* ── la paleta es la de Fadori, medida ──────────────────────────────────── */
const CAFE    = '2E1B10';   /* la tinta · café profundo, no negro */
const CAFE2   = '1E110A';
const NARANJA = 'C2410C';
const VIVO    = 'E8590C';
const CREMA   = 'F3ECE1';
const PAPEL   = 'FFFDF9';
const DORADO  = '8A6212';
const HUESO   = 'FFF6EC';
const TENUE   = '7A5A42';

const TIT = 'Arial', TXT = 'Calibri';
const W = 13.333, H = 7.5;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Grupo Mazi';
pres.title  = 'Fadori · Proyecto STEAM';

/* mide un PNG para no deformarlo nunca */
const medida = (f) => {
  const d = readFileSync(new URL(f, import.meta.url));
  return { w: d.readUInt32BE(16), h: d.readUInt32BE(20) };
};
/* mete una imagen dentro de una caja, respetando su forma */
function encaja(f, cx, cy, cw, ch){
  const m = medida(f), a = m.w / m.h;
  let w = cw, h = cw / a;
  if(h > ch){ h = ch; w = ch * a; }
  return { path: f, x: cx + (cw - w)/2, y: cy + (ch - h)/2, w, h };
}
const sombra = () => ({ type:'outer', color:'2E1B10', blur:18, offset:5, angle:90, opacity:0.28 });

const palabras = [];
const cuenta = (...t) => palabras[palabras.length-1].push(...t);

function nueva(fondo){
  palabras.push([]);
  const s = pres.addSlide();
  s.background = { color: fondo || PAPEL };
  return s;
}

/* el motivo que se repite: un círculo naranja con el número del apartado */
function ficha(s, n, x, y){
  s.addShape(pres.ShapeType.ellipse, { x, y, w:0.62, h:0.62,
    fill:{ color:NARANJA }, line:{ color:NARANJA } });
  s.addText(String(n), { x, y, w:0.62, h:0.62, align:'center', valign:'middle',
    fontFace:TIT, fontSize:20, bold:true, color:HUESO, margin:0 });
}

function titulo(s, t, x, y, w, color){
  s.addText(t, { x, y, w, h:0.9, fontFace:TIT, fontSize:38, bold:true,
    color: color || CAFE, margin:0, valign:'middle' });
  cuenta(t);
}
function bajada(s, t, x, y, w, color, tam){
  s.addText(t, { x, y, w, h:1.5, fontFace:TXT, fontSize: tam || 22,
    color: color || TENUE, margin:0, valign:'top', lineSpacing: (tam||22)*1.3 });
  cuenta(t);
}

/* ══════ 1 · PORTADA ══════════════════════════════════════════════════════ */
{
  const s = nueva(CAFE2);
  s.addImage(encaja('01-cortinilla.png', 0.7, 0.5, 3.4, 6.5));
  s.addText('Fadori.', { x:4.9, y:1.5, w:7.8, h:1.4, fontFace:TIT, fontSize:72,
    bold:true, color:HUESO, margin:0 });
  cuenta('Fadori');
  s.addText('Pedir sin hacer fila', { x:4.9, y:2.95, w:7.8, h:0.7,
    fontFace:TXT, fontSize:28, color:VIVO, margin:0 });
  cuenta('Pedir sin hacer fila');
  s.addText('Bachillerato Rembrandt · STEAM · 2025', { x:4.9, y:3.75, w:7.8, h:0.5,
    fontFace:TXT, fontSize:16, color:'C9B7A6', margin:0 });
  cuenta('Bachillerato Rembrandt STEAM 2025');
  s.addText('Integrantes: Carlos · [nombre] · [nombre] · [nombre]',
    { x:4.9, y:4.9, w:7.8, h:0.5, fontFace:TXT, fontSize:15, color:'9C8875', margin:0 });
  s.addNotes('Cambiar los nombres de los integrantes antes de presentar. La rúbrica '+
             'pide que vayan en la primera página.');
}

/* ══════ 2 · ÍNDICE ═══════════════════════════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, 'Índice', 0.9, 0.6, 6);
  const partes = ['Problema','Proyecto','Misión','Visión','Propósitos',
                  'Enfoque','STEAM','Estado','Impacto'];
  partes.forEach((p, i) => {
    const col = i % 3, fil = Math.floor(i / 3);
    const x = 0.9 + col * 4.05, y = 2.0 + fil * 1.55;
    s.addShape(pres.ShapeType.roundRect, { x, y, w:3.6, h:1.2, rectRadius:0.12,
      fill:{ color:CREMA }, line:{ color:'E6D9C6' }, shadow: sombra() });
    ficha(s, i+1, x + 0.3, y + 0.29);
    s.addText(p, { x: x+1.1, y, w:2.4, h:1.2, fontFace:TIT, fontSize:17, bold:true,
      color:CAFE, valign:'middle', margin:0 });
    cuenta(p);
  });
}

/* ══════ 3 · EL PROBLEMA · ¿Por qué? ══════════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, 'El problema', 0.9, 0.7, 6.5);
  bajada(s, 'Treinta minutos de fila. Veinte minutos de recreo.', 0.9, 1.8, 6.2, CAFE, 26);
  s.addShape(pres.ShapeType.roundRect, { x:0.9, y:3.6, w:2.6, h:2.3, rectRadius:0.14,
    fill:{ color:NARANJA }, line:{ color:NARANJA }, shadow: sombra() });
  s.addText('30', { x:0.9, y:3.75, w:2.6, h:1.3, align:'center', fontFace:TIT,
    fontSize:64, bold:true, color:HUESO, margin:0 });
  s.addText('minutos formado', { x:0.9, y:5.0, w:2.6, h:0.6, align:'center',
    fontFace:TXT, fontSize:14, color:HUESO, margin:0 });
  s.addShape(pres.ShapeType.roundRect, { x:3.9, y:3.6, w:2.6, h:2.3, rectRadius:0.14,
    fill:{ color:CREMA }, line:{ color:'E6D9C6' }, shadow: sombra() });
  s.addText('20', { x:3.9, y:3.75, w:2.6, h:1.3, align:'center', fontFace:TIT,
    fontSize:64, bold:true, color:CAFE, margin:0 });
  s.addText('minutos de recreo', { x:3.9, y:5.0, w:2.6, h:0.6, align:'center',
    fontFace:TXT, fontSize:14, color:TENUE, margin:0 });
  s.addImage(encaja('04-pantalla-turnos.png', 7.3, 1.9, 5.2, 3.6));
  s.addNotes('El dato duro: la fila se come el recreo completo. Quien se forma, no come.');
}

/* ══════ 4 · QUÉ ES · ¿Qué? ═══════════════════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, '¿Qué es Fadori?', 0.9, 0.7, 7);
  bajada(s, 'App que ordena la cafetería sin filas.', 0.9, 1.8, 6.2, CAFE, 26);
  s.addImage(encaja('02-menu.png', 8.4, 0.55, 4.2, 6.4));
  s.addText('Escoge desde el salón', { x:0.9, y:3.3, w:5.6, h:0.62,
    fontFace:TXT, fontSize:17, color:TENUE, valign:'middle', margin:0 });
  cuenta('Escoge desde el salón');
}

/* ══════ 5 · JUSTIFICACIÓN · ¿Por qué? ════════════════════════════════════ */
{
  const s = nueva(CAFE);
  titulo(s, '¿Por qué?', 0.9, 1.2, 7, HUESO);
  bajada(s, 'El recreo se va formado, no comiendo.', 0.9, 2.4, 7.5, VIVO, 34);
  bajada(s, 'El plato fuerte casi nunca alcanza.', 0.9, 3.9, 7.5, 'C9B7A6', 20);
  s.addImage(encaja('03-mi-turno.png', 9.0, 0.6, 3.6, 6.3));
}

/* ══════ 6 · CÓMO FUNCIONA · ¿Cómo? ═══════════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, '¿Cómo funciona?', 0.9, 0.6, 7);
  const pasos = [
    ['Pide desde el salón', '02-menu.png'],
    ['Recibe su turno', '03-mi-turno.png'],
    ['Va cuando está listo', '04-pantalla-turnos.png'],
  ];
  pasos.forEach(([t, img], i) => {
    const x = 0.9 + i * 4.15;
    s.addShape(pres.ShapeType.roundRect, { x, y:1.75, w:3.7, h:4.9, rectRadius:0.14,
      fill:{ color:CREMA }, line:{ color:'E6D9C6' }, shadow: sombra() });
    s.addImage(encaja(img, x + 0.25, 2.35, 3.2, 3.5));
    ficha(s, i+1, x + 1.54, 1.45);
    s.addText(t, { x, y:5.95, w:3.7, h:0.55, align:'center', fontFace:TIT,
      fontSize:15, bold:true, color:CAFE, margin:0 });
    cuenta(t);
  });
}

/* ══════ 7 · PARA QUÉ SIRVE · ¿Para qué? ══════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, '¿Para qué sirve?', 0.9, 0.7, 7);
  bajada(s, 'Para comer, descansar y convivir en el recreo.', 0.9, 1.9, 7.4, CAFE, 26);
  const cosas = ['Comer','Descansar','Convivir'];
  cosas.forEach((c, i) => {
    const x = 0.9 + i * 4.15;
    s.addShape(pres.ShapeType.roundRect, { x, y:3.7, w:3.7, h:2.1, rectRadius:0.14,
      fill:{ color: i === 0 ? NARANJA : CREMA },
      line:{ color: i === 0 ? NARANJA : 'E6D9C6' }, shadow: sombra() });
    s.addText(c, { x, y:3.7, w:3.7, h:2.1, align:'center', valign:'middle',
      fontFace:TIT, fontSize:28, bold:true, color: i === 0 ? HUESO : CAFE, margin:0 });
    cuenta(c);
  });
}

/* ══════ 8 · MISIÓN ═══════════════════════════════════════════════════════ */
{
  const s = nueva(CAFE);
  s.addText('Misión STEAM', { x:0.9, y:1.3, w:7.5, h:0.7, fontFace:TXT, fontSize:20,
    color:VIVO, margin:0, charSpacing:3 });
  cuenta('Misión STEAM');
  bajada(s, 'Devolverle al alumno el tiempo que la fila roba.',
    0.9, 2.3, 8.0, HUESO, 38);
  s.addImage(encaja('01-cortinilla.png', 9.4, 0.9, 3.2, 5.7));
}

/* ══════ 9 · VISIÓN ═══════════════════════════════════════════════════════ */
{
  const s = nueva(CAFE);
  s.addText('Visión STEAM', { x:0.9, y:1.3, w:7.5, h:0.7, fontFace:TXT, fontSize:20,
    color:VIVO, margin:0, charSpacing:3 });
  cuenta('Visión STEAM');
  bajada(s, 'Que ninguna cafetería escolar vuelva a necesitar filas.',
    0.9, 2.3, 7.3, HUESO, 38);
  s.addImage(encaja('04-pantalla-turnos.png', 8.6, 2.3, 4.0, 3.2));
}

/* ══════ 10 · PROPÓSITO GENERAL ═══════════════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, 'Propósito general', 0.9, 0.8, 8);
  const tres = [['Menos','espera'], ['Más','eficiencia'], ['Mejor','experiencia']];
  tres.forEach(([a, b], i) => {
    const x = 0.9 + i * 4.15;
    s.addShape(pres.ShapeType.roundRect, { x, y:2.3, w:3.7, h:3.4, rectRadius:0.14,
      fill:{ color: i === 1 ? NARANJA : CREMA },
      line:{ color: i === 1 ? NARANJA : 'E6D9C6' }, shadow: sombra() });
    ficha(s, i+1, x + 1.54, 2.05);
    s.addText(a, { x, y:3.3, w:3.7, h:0.8, align:'center', fontFace:TIT, fontSize:34,
      bold:true, color: i === 1 ? HUESO : NARANJA, margin:0 });
    s.addText(b, { x, y:4.15, w:3.7, h:0.8, align:'center', fontFace:TIT, fontSize:28,
      bold:true, color: i === 1 ? HUESO : CAFE, margin:0 });
    cuenta(a, b);
  });
}

/* ══════ 11 · PROPÓSITO ESPECÍFICO ════════════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, 'Propósito específico', 0.9, 0.7, 8);
  bajada(s, 'Bajar la fila física a la mitad.', 0.9, 1.9, 6.2, CAFE, 28);
  s.addShape(pres.ShapeType.roundRect, { x:0.9, y:3.4, w:5.6, h:2.6, rectRadius:0.14,
    fill:{ color:NARANJA }, line:{ color:NARANJA }, shadow: sombra() });
  s.addText('−50 %', { x:0.9, y:3.6, w:5.6, h:1.5, align:'center', fontFace:TIT,
    fontSize:72, bold:true, color:HUESO, margin:0 });
  s.addText('de gente formada', { x:0.9, y:5.15, w:5.6, h:0.6, align:'center',
    fontFace:TXT, fontSize:16, color:HUESO, margin:0 });
  s.addImage(encaja('08-grafica.png', 7.1, 2.9, 5.4, 3.2));
}

/* ══════ 12 · ENFOQUE ═════════════════════════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, 'Enfoque', 0.9, 0.7, 6);
  bajada(s, 'Cuantitativo y deductivo: medimos tiempos, comprobamos la hipótesis.',
    0.9, 1.8, 11.5, CAFE, 24);
  const enf = [
    ['Cuantitativo', 'Segundos, turnos y porcentajes', true],
    ['Cualitativo',  'Cómo se vive el recreo', false],
    ['Deductivo',    'De la regla al caso medido', false],
  ];
  enf.forEach(([t, d, fuerte], i) => {
    const x = 0.9 + i * 4.15;
    s.addShape(pres.ShapeType.roundRect, { x, y:3.3, w:3.7, h:2.6, rectRadius:0.14,
      fill:{ color: fuerte ? NARANJA : CREMA },
      line:{ color: fuerte ? NARANJA : 'E6D9C6' }, shadow: sombra() });
    s.addText(t, { x:x+0.3, y:3.6, w:3.1, h:0.6, fontFace:TIT, fontSize:20, bold:true,
      color: fuerte ? HUESO : CAFE, margin:0 });
    s.addText(d, { x:x+0.3, y:4.35, w:3.1, h:1.2, fontFace:TXT, fontSize:14,
      color: fuerte ? 'FFE2CE' : TENUE, margin:0 });
  });
  s.addNotes('Cuantitativo porque la app mide sola: segundos por despacho, cuántos '+
             'alcanzaron, porcentaje que no. Deductivo porque partimos de una regla '+
             'general —atender lo rápido primero baja el promedio— y la comprobamos '+
             'con los datos del recreo.');
}

/* ══════ 13-17 · LOS CINCO APARTADOS DE STEAM ═════════════════════════════ */
const STEAM = [
  ['S', 'Ciencia',     'Medimos la fila antes y después.',      '08-grafica.png', 1.9],
  ['T', 'Tecnología',  'App web, servidor propio, funciona sin internet.', '02-menu.png', 0.46],
  ['E', 'Ingeniería',  'La fila se ordena sola, con tope justo.', '05-mostrador.png', 1.22],
  ['A', 'Arte',        'Identidad propia: logo, color y tipografía.', '01-cortinilla.png', 0.46],
  ['M', 'Matemáticas', 'Turnos, promedios y porcentajes calculados solos.', '07-cifras.png', 2.7],
];
STEAM.forEach(([letra, nombre, texto, img, asp]) => {
  const s = nueva(PAPEL);
  s.addShape(pres.ShapeType.ellipse, { x:0.9, y:0.7, w:1.5, h:1.5,
    fill:{ color:NARANJA }, line:{ color:NARANJA }, shadow: sombra() });
  s.addText(letra, { x:0.9, y:0.7, w:1.5, h:1.5, align:'center', valign:'middle',
    fontFace:TIT, fontSize:56, bold:true, color:HUESO, margin:0 });
  s.addText(nombre, { x:2.7, y:0.7, w:6.5, h:1.5, fontFace:TIT, fontSize:40, bold:true,
    color:CAFE, valign:'middle', margin:0 });
  cuenta(nombre);
  /* La columna de texto se angosta cuando la imagen es ancha. Con 5.4 fijos,
     "porcentajes" y "después" chocaban contra la imagen: se veía en la
     revisión, no en el código. */
  const ancho = asp < 1 ? 3.4 : 5.8;
  bajada(s, texto, 0.9, 2.5, (asp < 1 ? 5.4 : 4.9), TENUE, 22);
  s.addImage(encaja(img, 12.6 - ancho, 1.3, ancho, 5.2));
});

/* ══════ 18 · ESTADO ACTUAL ═══════════════════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, 'Estado actual', 0.9, 0.6, 7);
  bajada(s, 'Terminada, publicada y en línea. Cuatro pantallas.', 0.9, 1.7, 7.2, CAFE, 24);
  const hechos = [['4','pantallas'], ['163','pruebas'], ['100 %','en línea']];
  hechos.forEach(([n, t], i) => {
    const x = 0.9 + i * 2.6;
    s.addShape(pres.ShapeType.roundRect, { x, y:3.1, w:2.3, h:1.9, rectRadius:0.12,
      fill:{ color: i===0 ? NARANJA : CREMA },
      line:{ color: i===0 ? NARANJA : 'E6D9C6' }, shadow: sombra() });
    s.addText(n, { x, y:3.25, w:2.3, h:1.0, align:'center', fontFace:TIT, fontSize:38,
      bold:true, color: i===0 ? HUESO : CAFE, margin:0 });
    s.addText(t, { x, y:4.3, w:2.3, h:0.5, align:'center', fontFace:TXT, fontSize:13,
      color: i===0 ? HUESO : TENUE, margin:0 });
  });
  s.addText('mazi-central.palomazi9111.workers.dev/fadori/',
    { x:0.9, y:5.4, w:7.2, h:0.5, fontFace:TXT, fontSize:14, color:DORADO, margin:0 });
  s.addImage(encaja('05-mostrador.png', 8.6, 1.6, 4.0, 4.4));
}

/* ══════ 19 · IMPACTO ESPERADO ════════════════════════════════════════════ */
{
  const s = nueva(PAPEL);
  titulo(s, 'Impacto esperado', 0.9, 0.7, 8);
  bajada(s, 'Filas que no desperdician tiempo valioso.', 0.9, 1.9, 6.4, CAFE, 26);
  s.addImage(encaja('07-cifras.png', 0.9, 3.0, 11.5, 3.7));
}

/* ══════ 20 · CIERRE ══════════════════════════════════════════════════════ */
{
  const s = nueva(CAFE2);
  s.addImage(encaja('01-cortinilla.png', 9.3, 0.6, 3.3, 6.3));
  s.addText('Fadori.', { x:0.9, y:2.1, w:8, h:1.4, fontFace:TIT, fontSize:80,
    bold:true, color:HUESO, margin:0 });
  cuenta('Fadori');
  s.addText('Pedir sin fila. Comer con calma.', { x:0.9, y:3.7, w:8, h:0.8,
    fontFace:TXT, fontSize:30, color:VIVO, margin:0 });
  cuenta('Pedir sin fila Comer con calma');
}

/* ══════ EL CONTADOR DE PALABRAS · la regla de la rúbrica ═════════════════ */
const limpia = (t) => String(t).replace(/[·:.,¿?¡!%−—]/g, ' ')
  .split(/\s+/).filter(x => x && !/^\[/.test(x)).length;
let mal = 0;
palabras.forEach((p, i) => {
  const n = p.reduce((s, t) => s + limpia(t), 0);
  const marca = n > 15 ? '  ⚠ SE PASA' : '';
  if(n > 15) mal++;
  console.log(String(i+1).padStart(2) + ' · ' + String(n).padStart(2) + ' palabras' + marca);
});
console.log(mal ? '\n⚠ ' + mal + ' diapositivas se pasan de 15 palabras'
                : '\n✓ las ' + palabras.length + ' diapositivas caben en 15 palabras');

await pres.writeFile({ fileName: 'Fadori-STEAM.pptx' });
console.log('✓ Fadori-STEAM.pptx');
