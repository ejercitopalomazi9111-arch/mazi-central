/* CUATRO TRÍPTICOS VISUALES · prevención de enfermedades por sedentarismo · Educación Física III
   Carlos, 21 de octubre: «aprovecha todo el espacio del tríptico y hazlo más visual… solo 4
   trípticos del tema específico de prevención de enfermedades por sedentarismo, nada más».
   Hechos el 24 de octubre. Carta horizontal (11 × 8.5 in), dos caras, todo editable en Canva.

   · Fotos reales de Unsplash (licencia Unsplash, uso libre), en ../fotos con su crédito.
   · Datos: OMS (Directrices 2020 y nota «Actividad física», 26 jun 2024) e INSP/ENSANUT
     (Salud Pública de México 2025;67:609-621). Revisados el 24 de octubre.
   · Los NOMBRES del equipo no van en el repo (es público): se leen de integrantes.txt, que no
     se sube. Sin ese archivo salen renglones en blanco.

   Correr:  NODE_PATH=<carpeta con pptxgenjs, sharp, react, react-dom y react-icons> node hacer.js
   Sale en salida/ (tampoco se sube: lleva los nombres). */
const pptxgen = require('pptxgenjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const lu = require('react-icons/lu');
const fs = require('fs'), path = require('path');

const AQUI = __dirname, FOTOS = path.join(AQUI, '..', 'fotos'), SAL = path.join(AQUI, 'salida');
fs.mkdirSync(SAL, { recursive: true });
const ESCUDO = fs.readFileSync(path.join(AQUI, '..', '..', '..', 'reportes', 'escudo-rembrandt.png')).toString('base64');
const NOMBRES = fs.existsSync(path.join(AQUI, 'integrantes.txt'))
  ? fs.readFileSync(path.join(AQUI, 'integrantes.txt'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : [];
const TIT = 'Anton', TXT = 'Poppins';
const W = 11, H = 8.5, PW = W / 3, M = 0.3, DPI = 220;
const FUENTES = 'OMS: Directrices sobre actividad física y comportamientos sedentarios (2020) y nota «Actividad física» (2024). INSP: Salud Pública de México 2025;67:609-621 (ENSANUT Continua 2020-2024). Fotos: Unsplash.';

async function icono(nombre, color){
  const C = lu[nombre]; if(!C) throw new Error('sin icono ' + nombre);
  const svg = renderToStaticMarkup(React.createElement(C, { size: 256, color: '#' + color, strokeWidth: 2 }));
  return 'image/png;base64,' + (await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer()).toString('base64');
}
/* la foto recortada al hueco exacto; con «velo», un degradado del color del tríptico horneado
   ADENTRO de la foto (opaca, sin transparencias: Canva y el iPhone no tienen nada que pintar mal) */
async function foto(nombre, w, h, velo, foco = 'attention'){
  const pw = Math.round(w * DPI), ph = Math.round(h * DPI);
  let im = sharp(path.join(FOTOS, nombre + '.jpg')).resize(pw, ph, { fit: 'cover', position: foco });
  if(velo){
    const g = `<svg width="${pw}" height="${ph}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#${velo}" stop-opacity=".55"/><stop offset=".25" stop-color="#${velo}" stop-opacity=".05"/>
      <stop offset=".45" stop-color="#${velo}" stop-opacity=".35"/><stop offset=".62" stop-color="#${velo}" stop-opacity=".92"/>
      <stop offset="1" stop-color="#${velo}" stop-opacity="1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
    im = im.composite([{ input: Buffer.from(g) }]);
  }
  return 'image/jpeg;base64,' + (await im.jpeg({ quality: 82 }).toBuffer()).toString('base64');
}
/* cuántas pulgadas mide un texto: ~ancho × 72 / (pt × 0.53) letras por renglón */
function alto(texto, pt, ancho, inter = 1.25){
  const por = Math.floor(ancho * 72 / (pt * 0.54));
  const r = String(texto).split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / por)), 0);
  return r * pt * inter / 72 + 0.05;
}
/* ¿el acento es claro? (amarillos, verdes, turquesas): entonces encima va texto oscuro */
const claro = (hex) => { const n = parseInt(hex, 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 150; };

/* ═══════════════════════ LOS CUATRO ═══════════════════════ */
const T = [
 { id: '1-sentarte-te-enferma', c: { osc: '1B1A47', acc: 'FF5A3C', cla: 'F3F1FF', tin: '1B1A33' },
   portada: { foto: 'sofa', titulo: 'Sentarte mucho\nte enferma', sub: 'Cómo prevenir las enfermedades del sedentarismo' },
   solapa: { foto: 'videojuego', titulo: '¿Eres sedentario?', intro: 'Marca las que sí te pasan:', casillas: [
     'Paso casi todo el día sentado: clases, tareas y pantallas.', 'Juego o veo el celular más de 2 horas seguidas.', 'Casi nunca camino más de 15 minutos seguidos.',
     'Fuera de Educación Física no hago deporte.', 'Me canso al subir dos pisos de escaleras.'],
     cierre: 'Si marcaste 3 o más, ¡es momento de moverte! Adentro está cómo.' },
   contra: { num: '81 %', dato: 'de los adolescentes de 11 a 17 años en el mundo no hace la actividad física que necesita.', fuente: 'OMS, 2024', frase: 'Toda actividad cuenta: un poco es mejor que nada.' },
   adentro: [
     { foto: 'escritorio', n: '01', titulo: '¿Qué es el sedentarismo?', bloques: [
       { t: 'p', x: 'Es pasar mucho tiempo sentado o acostado y no hacer la actividad física que tu cuerpo necesita.' },
       { t: 'lista', items: [['LuArmchair', 'Mucho tiempo sentado', 'en clase, en la tarea y frente a pantallas.'], ['LuSmartphone', 'Tiempo libre quieto', 'redes, series y videojuegos.'], ['LuCar', 'Moverte sin caminar', 'transporte para trayectos cortos.']] },
       { t: 'aviso', x: 'Es silencioso: no duele al principio, pero el daño se acumula con los años.' } ] },
     { foto: 'presion', n: '02', titulo: 'Lo que provoca', bloques: [
       { t: 'lista', items: [['LuScale', 'Obesidad', 'se gasta menos energía.'], ['LuDroplet', 'Diabetes tipo 2', 'sube el azúcar en la sangre.'], ['LuHeartPulse', 'Hipertensión', 'y enfermedades del corazón.'], ['LuBone', 'Huesos débiles', 'y dolor de espalda.'], ['LuBrain', 'Ansiedad', 'y depresión.']] },
       { t: 'dato', num: '4 de cada 10', x: 'adolescentes en México tienen sobrepeso u obesidad.', f: 'ENSANUT 2020-2024' } ] },
     { foto: 'basquet', n: '03', titulo: 'Cómo prevenirlas', bloques: [
       { t: 'lista', items: [['LuTimer', '60 minutos al día', 'de actividad moderada a vigorosa.'], ['LuDumbbell', '3 días a la semana', 'ejercicio intenso y de fuerza.'], ['LuMonitorOff', 'Menos pantallas', 'en tu tiempo libre.'], ['LuPersonStanding', 'Pausas activas', 'levántate en cada descanso.'], ['LuFootprints', 'Camina y usa escaleras', 'siempre que puedas.']] },
       { t: 'aviso', x: 'Recomendaciones de la OMS para adolescentes de 5 a 17 años.' } ] } ] },

 { id: '2-muevete-y-preven', c: { osc: '0B3D3A', acc: '2EC4A6', cla: 'EDF8F5', tin: '0D2725' },
   portada: { foto: 'futbol', titulo: 'Muévete\ny prevén', sub: 'Cinco enfermedades que el ejercicio te ayuda a evitar' },
   solapa: { foto: 'agua', titulo: 'Señales de alerta', intro: 'Ve al médico si notas que, sin razón clara:', pasos: [
     'Tienes mucha sed y orinas muy seguido.', 'Te cansas mucho más que tus compañeros al moverte.', 'Te falta el aire o te duele el pecho al hacer ejercicio.',
     'Te duele la espalda o el cuello casi todos los días.', 'Te sientes triste o sin ganas por más de dos semanas.'],
     cierre: 'Detectar a tiempo es prevenir. Una revisión médica no cuesta nada comparada con una enfermedad.' },
   contra: { num: '60 min', dato: 'al día de actividad física es lo que la OMS recomienda a niños y adolescentes de 5 a 17 años.', fuente: 'OMS, 2020', frase: 'Tus músculos son tu mejor medicina.' },
   adentro: [
     { foto: 'cuerda', n: '01', titulo: 'Obesidad y diabetes tipo 2', bloques: [
       { t: 'def', a: 'Obesidad', x: 'acumulación excesiva de grasa que daña la salud.' },
       { t: 'def', a: 'Diabetes tipo 2', x: 'el cuerpo no usa bien la insulina y el azúcar se queda en la sangre.' },
       { t: 'p', x: 'Al moverte, tus músculos gastan azúcar como combustible. Si pasas el día sentado, la usan menos.' },
       { t: 'chips', items: ['Saltar la cuerda', 'Caminar rápido', 'Bailar', 'Agua en vez de refresco'] } ] },
     { foto: 'bici', n: '02', titulo: 'Corazón y presión arterial', bloques: [
       { t: 'def', a: 'Hipertensión', x: 'presión alta en las arterias. Casi nunca da síntomas: por eso la llaman «el asesino silencioso».' },
       { t: 'p', x: 'El ejercicio aeróbico entrena al corazón: late más tranquilo y bombea mejor.' },
       { t: 'chips', items: ['Bici', 'Trotar', 'Nadar', 'Futbol', 'Básquet', 'Patinar'] },
       { t: 'aviso', x: 'La OMS señala que la actividad física ayuda a prevenir la hipertensión y las enfermedades del corazón.' } ] },
     { foto: 'estirar2', n: '03', titulo: 'Huesos, espalda y mente', bloques: [
       { t: 'lista', items: [['LuBone', 'Huesos fuertes', 'saltar y correr los hace más densos.'], ['LuArmchair', 'Espalda sana', 'estírate y cambia de postura.'], ['LuBrain', 'Mente tranquila', 'menos ansiedad y mejor sueño.']] },
       { t: 'aviso', x: 'Si te sientes mal, no estás solo: Línea de la Vida 800 911 2000, gratis las 24 horas.' } ] } ] },

 { id: '3-tu-plan-de-movimiento', c: { osc: '2E1065', acc: 'FFC531', cla: 'F6F1FF', tin: '1E0B42' },
   portada: { foto: 'baile', titulo: '60 minutos\nque te cambian', sub: 'Tu plan para prevenir las enfermedades del sedentarismo' },
   solapa: { foto: 'estirar', titulo: 'Pausa activa de 5 minutos', intro: 'Hazla cada vez que lleves mucho rato sentado:', pasos: [
     'Gira los hombros hacia atrás 10 veces.', 'Inclina la cabeza a cada lado, 10 segundos.', 'Estira los brazos arriba y crece lo más que puedas.',
     'Toca tus pies con las rodillas suaves, 15 segundos.', 'Haz 10 sentadillas y 20 saltos en tu lugar.'],
     cierre: 'Sin rebotes ni dolor. Si algo duele, detente.' },
   contra: { num: '3 días', dato: 'a la semana, la actividad debe ser intensa y fortalecer músculos y huesos.', fuente: 'OMS, 2020', frase: 'Elige algo que te guste: así no lo dejas.' },
   adentro: [
     { foto: 'basquet2', n: '01', titulo: 'La receta de la OMS', bloques: [
       { t: 'barras', items: [['LuTimer', '60 min', 'cada día, de moderada a vigorosa'], ['LuFlame', '3 días', 'a la semana, actividad intensa'], ['LuDumbbell', '3 días', 'a la semana, fuerza para músculos y huesos'], ['LuMonitorOff', 'Menos', 'tiempo sentado frente a pantallas']] },
       { t: 'p', x: 'Para niños y adolescentes de 5 a 17 años.' } ] },
     { foto: 'futbol3', n: '02', titulo: '¿Moderada o vigorosa?', bloques: [
       { t: 'p', x: 'Usa la prueba del habla:' },
       { t: 'def', a: 'Moderada', x: 'puedes platicar, pero no cantar.' },
       { t: 'chips', items: ['Caminar rápido', 'Bici tranquila', 'Bailar'] },
       { t: 'def', a: 'Vigorosa', x: 'sólo dices unas palabras sin tomar aire.' },
       { t: 'chips', items: ['Correr', 'Futbol', 'Saltar la cuerda', 'Básquet'] } ] },
     { foto: 'futbol2', n: '03', titulo: 'Tu semana activa', bloques: [
       { t: 'p', x: 'Escribe qué harás cada día (60 minutos):' },
       { t: 'semana', dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] } ] } ] },

 { id: '4-mitos-del-sedentarismo', c: { osc: '2A2A2A', acc: 'FF7A1A', cla: 'FFF4EB', tin: '1F1F1F' },
   portada: { foto: 'control', titulo: 'Mitos del\nsedentarismo', sub: 'Lo que crees contra lo que dice la ciencia' },
   solapa: { foto: 'escaleras', titulo: 'Reto de 7 días', intro: 'Palomea cada día que lo cumplas:', casillas: [
     'Lun · 30 min de caminata rápida', 'Mar · escaleras en vez de elevador', 'Mié · 20 sentadillas en 3 series', 'Jue · bailar 3 canciones seguidas',
     'Vie · un partido con tus amigos', 'Sáb · bici, patines o caminata', 'Dom · estirar 10 minutos'],
     cierre: 'Repite el reto y súbele un poco cada semana.' },
   contra: { num: '+20 %', dato: 'más riesgo de morir antes de tiempo (entre 20 % y 30 %) tienen quienes no se mueven lo suficiente.', fuente: 'OMS, 2024', frase: 'Moverte hoy es prevenir la enfermedad de mañana.' },
   adentro: [
     { foto: 'dormido', n: '01', titulo: 'Mitos sobre tu cuerpo', bloques: [
       { t: 'vs', mito: 'Si estoy delgado, no me afecta.', real: 'El sedentarismo daña el corazón, los huesos y el ánimo aunque no subas de peso.' },
       { t: 'vs', mito: 'Con la clase de Educación Física basta.', real: 'La OMS recomienda 60 minutos todos los días.' },
       { t: 'vs', mito: 'Ejercicio es sólo ir al gimnasio.', real: 'Caminar, bailar, jugar y subir escaleras también cuentan.' } ] },
     { foto: 'cama', n: '02', titulo: 'Mitos sobre la edad', bloques: [
       { t: 'vs', mito: 'Las enfermedades del corazón son de viejos.', real: 'Se van formando desde joven, y la presión alta casi no da síntomas.' },
       { t: 'vs', mito: 'La diabetes no les da a los jóvenes.', real: 'La diabetes tipo 2 ya aparece también en jóvenes.' },
       { t: 'vs', mito: 'Si me duele la espalda, mejor no me muevo.', real: 'Moverte con cuidado y estirarte ayuda. Si el dolor sigue, ve al médico.' } ] },
     { foto: 'cuerda2', n: '03', titulo: 'Lo que sí funciona', bloques: [
       { t: 'lista', items: [['LuCalendarCheck', 'Constancia', 'un poco diario gana a mucho una vez.'], ['LuUsers', 'En equipo', 'con amigos es más fácil no dejarlo.'], ['LuHeart', 'Lo que te gusta', 'el mejor ejercicio es el que sí haces.']] },
       { t: 'dato', num: '40.1 %', x: 'de los adolescentes de 12 a 19 años en México tiene sobrepeso u obesidad.', f: 'ENSANUT 2020-2024' } ] } ] },
];

async function hacer(t){
  const pres = new pptxgen();
  pres.defineLayout({ name: 'CARTA', width: W, height: H }); pres.layout = 'CARTA';
  pres.title = 'Tríptico · ' + t.portada.titulo.replace('\n', ' ');
  const c = t.c, icos = {}, sobreAcc = claro(c.acc) ? c.osc : 'FFFFFF';
  const ico = async (n, col) => icos[n + col] || (icos[n + col] = await icono(n, col));
  const txt = (s, o) => Object.assign({ fontFace: TXT, color: c.tin, margin: 0, valign: 'top' }, o);

  /* ═══ AFUERA: solapa · contraportada · portada ═══ */
  const a = pres.addSlide(); a.background = { color: 'FFFFFF' };

  /* portada (derecha): la foto a sangre con el degradado horneado */
  { const x = 2 * PW;
    a.addImage({ data: await foto(t.portada.foto, PW, H, c.osc), x, y: 0, w: PW, h: H });
    a.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y: 0.42, w: 2.1, h: 0.36, rectRadius: 0.18, fill: { color: c.acc }, line: { color: c.acc } });
    a.addText('EDUCACIÓN FÍSICA III', txt('', { x: x + M, y: 0.42, w: 2.1, h: 0.36, fontSize: 9.5, bold: true, color: sobreAcc, align: 'center', valign: 'middle', charSpacing: 1 }));
    /* de abajo hacia arriba: el escudo fijo, luego el subtítulo, el título y el letrero, cada uno
       con lo que de verdad mide (un título de tres renglones pisaba el subtítulo) */
    const ancho = PW - 2 * M, hs = alto(t.portada.sub, 12.5, ancho), largo = Math.max(...t.portada.titulo.split(/\s+/).map(p => p.length)), pt = Math.min(44, Math.floor(ancho * 72 / (largo * 0.52))), ht = alto(t.portada.titulo.toUpperCase(), pt, ancho * 1.12, 0.98), hp = alto('PREVENCIÓN DE ENFERMEDADES POR SEDENTARISMO', 10, ancho);
    const ys = 7.2 - hs, yt = ys - 0.12 - ht, yp = yt - 0.1 - hp;
    a.addText('PREVENCIÓN DE ENFERMEDADES POR SEDENTARISMO', txt('', { x: x + M, y: yp, w: ancho, h: hp, fontSize: 10, bold: true, color: c.acc, charSpacing: 1.2 }));
    a.addText(t.portada.titulo.toUpperCase(), txt('', { x: x + M, y: yt, w: ancho, h: ht, fontFace: TIT, fontSize: pt, color: 'FFFFFF', lineSpacingMultiple: 0.92 }));   /* ninguna palabra se parte: «SEDENTARIS-MO» */
    a.addText(t.portada.sub, txt('', { x: x + M, y: ys, w: ancho, h: hs, fontSize: 12.5, color: 'FFFFFF' }));
    a.addShape(pres.shapes.OVAL, { x: x + M, y: 7.38, w: 0.74, h: 0.74, fill: { color: 'FFFFFF' }, line: { color: 'FFFFFF' } });
    a.addImage({ data: 'image/png;base64,' + ESCUDO, x: x + M + 0.15, y: 7.44, w: 0.44, h: 0.44 * 1.11 });
    a.addText([{ text: 'Bachillerato Rembrandt', options: { bold: true, breakLine: true } }, { text: 'Grupo 3.1 · Tercer semestre' }],
      txt('', { x: x + M + 0.88, y: 7.4, w: PW - 2 * M - 0.88, h: 0.7, fontSize: 9.5, color: 'FFFFFF', valign: 'middle' })); }

  /* solapa (izquierda): foto arriba y la actividad llenando lo demás */
  { const x = 0, ancho = PW - 2 * M, S = t.solapa;
    a.addShape(pres.shapes.RECTANGLE, { x, y: 0, w: PW, h: H, fill: { color: c.cla }, line: { color: c.cla } });
    const items = S.casillas || S.pasos, pt = items.length > 6 ? 11 : 11.5;
    const hItems = items.map(s => Math.max(0.36, alto(s, pt, ancho - 0.5, 1.25)));
    const hc = alto(S.cierre, 11, ancho - 0.36) + 0.32, hTit = alto(S.titulo.toUpperCase(), 26, ancho, 1.0), hIntro = alto(S.intro, 11.5, ancho);
    const fijo = hTit + 0.14 + hIntro + 0.16 + hItems.reduce((s, h) => s + h, 0) + hc + 0.5;
    const libre = H - fijo, hFoto = Math.min(2.6, Math.max(1.5, libre * 0.62)), gap = Math.min(0.34, Math.max(0.14, (libre - hFoto) / (items.length + 2)));
    a.addImage({ data: await foto(S.foto, PW, hFoto), x, y: 0, w: PW, h: hFoto });
    let y = hFoto + 0.28;
    a.addText(S.titulo.toUpperCase(), txt('', { x: x + M, y, w: ancho, h: hTit, fontFace: TIT, fontSize: 26, color: c.osc, lineSpacingMultiple: 0.95 })); y += hTit + 0.1;
    a.addText(S.intro, txt('', { x: x + M, y, w: ancho, h: hIntro, fontSize: 11.5, bold: true })); y += hIntro + gap;
    items.forEach((s, i) => {
      if(S.casillas) a.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y: y + 0.01, w: 0.3, h: 0.3, rectRadius: 0.05, fill: { color: 'FFFFFF' }, line: { color: c.osc, width: 1.5 } });
      else { a.addShape(pres.shapes.OVAL, { x: x + M, y, w: 0.34, h: 0.34, fill: { color: c.osc }, line: { color: c.osc } });
        a.addText(String(i + 1), txt('', { x: x + M, y, w: 0.34, h: 0.34, fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' })); }
      a.addText(s, txt('', { x: x + M + 0.5, y: y + 0.02, w: ancho - 0.5, h: hItems[i], fontSize: pt }));
      y += hItems[i] + gap;
    });
    const yc = H - 0.3 - hc;
    a.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y: yc, w: ancho, h: hc, rectRadius: 0.1, fill: { color: c.osc }, line: { color: c.osc } });
    a.addText(S.cierre, txt('', { x: x + M + 0.18, y: yc + 0.1, w: ancho - 0.36, h: hc - 0.2, fontSize: 11, bold: true, color: 'FFFFFF', valign: 'middle' }));
    t._solapa = (y - gap).toFixed(2) + ' / ' + yc.toFixed(2); }

  /* contraportada (centro): el dato grande, la frase, quién lo hizo y las fuentes */
  { const x = PW, ancho = PW - 2 * M, C = t.contra;
    const hd = 1.12 + alto(C.dato, 12, ancho - 0.44, 1.25) + 0.42;
    a.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y: 0.35, w: ancho, h: hd, rectRadius: 0.14, fill: { color: c.osc }, line: { color: c.osc } });
    a.addText(C.num, txt('', { x: x + M + 0.22, y: 0.5, w: ancho - 0.44, h: 1.05, fontFace: TIT, fontSize: C.num.length > 6 ? 40 : 66, color: c.acc }));
    a.addText(C.dato, txt('', { x: x + M + 0.22, y: 1.55, w: ancho - 0.44, h: hd - 1.55, fontSize: 12, color: 'FFFFFF' }));
    a.addText(C.fuente, txt('', { x: x + M + 0.22, y: 0.35 + hd - 0.36, w: ancho - 0.44, h: 0.24, fontSize: 8.5, bold: true, color: c.acc }));
    let y = 0.35 + hd + 0.38;
    const hf = alto(C.frase, 21, ancho, 1.05);
    a.addText(C.frase, txt('', { x: x + M, y, w: ancho, h: hf, fontFace: TIT, fontSize: 21, color: c.osc, align: 'center', lineSpacingMultiple: 0.98 })); y += hf + 0.3;
    a.addShape(pres.shapes.LINE, { x: x + PW / 2 - 0.4, y, w: 0.8, h: 0, line: { color: c.acc, width: 2.5 } }); y += 0.24;
    const nombres = NOMBRES.length ? NOMBRES : ['____________________', '____________________', '____________________', '____________________'];
    const lin = [{ text: 'ELABORARON', options: { bold: true, color: c.osc, charSpacing: 1.5, breakLine: true } }]
      .concat(nombres.map((n, i) => ({ text: n, options: { breakLine: i < nombres.length - 1 } })));
    const hn = (nombres.length + 1) * 11 * 1.4 / 72 + 0.1;
    a.addText(lin, txt('', { x: x + M, y, w: ancho, h: hn, fontSize: 11, align: 'center', lineSpacingMultiple: 1.25 })); y += hn + 0.12;
    a.addText('Grupo 3.1 · Educación Física III', txt('', { x: x + M, y, w: ancho, h: 0.26, fontSize: 9.5, bold: true, color: c.osc, align: 'center' }));
    const yf = H - 1.72;
    a.addText([{ text: 'Fuentes: ', options: { bold: true } }, { text: FUENTES }], txt('', { x: x + M, y: yf, w: ancho, h: 0.85, fontSize: 7.2, color: '6B6B7B', align: 'center' }));
    a.addImage({ data: 'image/png;base64,' + ESCUDO, x: x + PW / 2 - 0.3, y: H - 0.8, w: 0.54, h: 0.54 * 1.11 });
    t._contra = (y + 0.26).toFixed(2) + ' / ' + yf.toFixed(2); }
  for(const k of [1, 2]) a.addShape(pres.shapes.LINE, { x: k * PW, y: 0.1, w: 0, h: 0.18, line: { color: 'BBBBBB', width: 0.5, dashType: 'dash' } });

  /* ═══ ADENTRO: tres paneles, cada uno con su foto a lo ancho ═══ */
  const b = pres.addSlide(); b.background = { color: 'FFFFFF' };
  t._adentro = [];
  for(let i = 0; i < 3; i++){
    const P = t.adentro[i], x = i * PW, ancho = PW - 2 * M, limite = i === 2 ? H - 0.72 : H - 0.32;
    if(i === 1) b.addShape(pres.shapes.RECTANGLE, { x, y: 0, w: PW, h: H, fill: { color: c.cla }, line: { color: c.cla } });
    const fondo = i === 1 ? 'FFFFFF' : c.cla;
    /* dibuja (o sólo mide, con B = nada) a partir de y; regresa dónde terminó */
    const pintar = async (B, y, gap) => {
      for(const k of P.bloques){
        if(k.t === 'p'){ const h = alto(k.x, 12, ancho, 1.32); B.addText(k.x, txt('', { x: x + M, y, w: ancho, h, fontSize: 12, lineSpacingMultiple: 1.1 })); y += h; }
        else if(k.t === 'def'){ const h = alto(k.a + ': ' + k.x, 12, ancho, 1.32);
          B.addText([{ text: k.a + ': ', options: { bold: true, color: c.osc } }, { text: k.x }], txt('', { x: x + M, y, w: ancho, h, fontSize: 12, lineSpacingMultiple: 1.1 })); y += h; }
        else if(k.t === 'lista'){ for(const [n, neg, resto] of k.items){
            const s = resto ? neg + ': ' + resto : neg, h = Math.max(0.56, alto(s, 11.5, ancho - 0.72, 1.28));
            B.addShape(pres.shapes.OVAL, { x: x + M, y, w: 0.56, h: 0.56, fill: { color: c.acc }, line: { color: c.acc } });
            B.addImage({ data: await ico(n, sobreAcc), x: x + M + 0.13, y: y + 0.13, w: 0.3, h: 0.3 });
            B.addText(resto ? [{ text: neg + ': ', options: { bold: true, color: c.osc } }, { text: resto }] : [{ text: neg, options: { bold: true, color: c.osc } }],
              txt('', { x: x + M + 0.72, y, w: ancho - 0.72, h, fontSize: 11.5, valign: h <= 0.56 ? 'middle' : 'top' }));
            y += h + Math.min(gap, 0.2) + 0.04; }
          y -= Math.min(gap, 0.2) + 0.04; }
        else if(k.t === 'chips'){ let cx = x + M, f = 0;
          for(const s of k.items){ const w = s.length * 0.088 + 0.36; if(cx + w > x + PW - M + 0.01){ cx = x + M; f++; }
            B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: y + f * 0.46, w, h: 0.36, rectRadius: 0.18, fill: { color: c.osc }, line: { color: c.osc } });
            B.addText(s, txt('', { x: cx, y: y + f * 0.46, w, h: 0.36, fontSize: 10, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' })); cx += w + 0.08; }
          y += (f + 1) * 0.46 - 0.1; }
        else if(k.t === 'dato'){ const hx = alto(k.x, 11.5, ancho - 0.4, 1.28), grande = k.num.length > 7 ? 38 : 50, h = grande / 72 * 1.05 + hx + 0.52;
          B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y, w: ancho, h, rectRadius: 0.12, fill: { color: c.osc }, line: { color: c.osc } });
          B.addText(k.num, txt('', { x: x + M + 0.2, y: y + 0.12, w: ancho - 0.4, h: grande / 72 * 1.1, fontFace: TIT, fontSize: grande, color: c.acc }));
          B.addText(k.x, txt('', { x: x + M + 0.2, y: y + 0.14 + grande / 72 * 1.05, w: ancho - 0.4, h: hx, fontSize: 11.5, color: 'FFFFFF' }));
          B.addText(k.f, txt('', { x: x + M + 0.2, y: y + h - 0.32, w: ancho - 0.4, h: 0.22, fontSize: 8, bold: true, color: c.acc })); y += h; }
        else if(k.t === 'aviso'){ const h = alto(k.x, 10.5, ancho - 0.6, 1.28) + 0.28;
          B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y, w: ancho, h, rectRadius: 0.1, fill: { color: fondo }, line: { color: c.acc, width: 1.5 } });
          B.addImage({ data: await ico('LuInfo', c.osc), x: x + M + 0.13, y: y + 0.14, w: 0.28, h: 0.28 });
          B.addText(k.x, txt('', { x: x + M + 0.5, y: y + 0.13, w: ancho - 0.62, h: h - 0.24, fontSize: 10.5 })); y += h; }
        else if(k.t === 'vs'){ const hm = alto('Mito: ' + k.mito, 11, ancho - 0.3, 1.25), hr = alto('Realidad: ' + k.real, 11, ancho - 0.3, 1.25), h = hm + hr + 0.36;
          B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y, w: ancho, h, rectRadius: 0.1, fill: { color: fondo }, line: { color: fondo } });
          B.addShape(pres.shapes.RECTANGLE, { x: x + M, y, w: 0.08, h, fill: { color: c.acc }, line: { color: c.acc } });
          B.addText([{ text: 'MITO  ', options: { bold: true, color: c.acc } }, { text: k.mito, options: { color: '6B6B6B' } }], txt('', { x: x + M + 0.2, y: y + 0.12, w: ancho - 0.3, h: hm, fontSize: 11 }));
          B.addText([{ text: 'REALIDAD  ', options: { bold: true, color: c.osc } }, { text: k.real }], txt('', { x: x + M + 0.2, y: y + 0.14 + hm, w: ancho - 0.3, h: hr, fontSize: 11 })); y += h; }
        else if(k.t === 'barras'){ for(const [n, num, d] of k.items){ const hd = alto(d, 10.5, ancho - 1.86, 1.2), h = Math.max(0.74, hd + 0.2);
            B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y, w: ancho, h, rectRadius: 0.1, fill: { color: fondo }, line: { color: fondo } });
            B.addShape(pres.shapes.OVAL, { x: x + M + 0.12, y: y + h / 2 - 0.25, w: 0.5, h: 0.5, fill: { color: c.acc }, line: { color: c.acc } });
            B.addImage({ data: await ico(n, sobreAcc), x: x + M + 0.24, y: y + h / 2 - 0.13, w: 0.26, h: 0.26 });
            B.addText(num, txt('', { x: x + M + 0.72, y, w: 1.0, h, fontFace: TIT, fontSize: 22, color: c.osc, valign: 'middle' }));
            B.addText(d, txt('', { x: x + M + 1.72, y, w: ancho - 1.84, h, fontSize: 10.5, valign: 'middle' })); y += h + 0.12; }
          y -= 0.12; }
        else if(k.t === 'semana'){ const fila = Math.min(0.62, Math.max(0.46, (limite - y - 0.1) / 7 - 0.08));
          for(const d of k.dias){ B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y, w: 0.66, h: fila, rectRadius: 0.08, fill: { color: c.osc }, line: { color: c.osc } });
            B.addText(d, txt('', { x: x + M, y, w: 0.66, h: fila, fontSize: 10.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }));
            B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M + 0.74, y, w: ancho - 0.74, h: fila, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: c.osc, width: 0.75 } });
            y += fila + 0.08; }
          y -= 0.08; }
        y += gap;
      }
      return y - gap;
    };
    /* primero se mide sin dibujar: lo que sobra se reparte entre la foto (más alta) y el aire */
    const nada = { addText(){}, addShape(){}, addImage(){} };
    const hTit = alto(P.titulo.toUpperCase(), 24, ancho, 1.0);
    const cab = 0.62 + hTit + 0.22;
    let base = 2.05, fin0 = await pintar(nada, base + cab, 0.2);
    /* si no cabe, la foto cede primero (hasta 1.35 in); si ni así, el generador truena */
    if(fin0 > limite){ base = Math.max(1.35, base - (fin0 - limite)); fin0 = await pintar(nada, base + cab, 0.2); }
    if(fin0 > limite + 0.01) throw new Error(`${t.id} · panel ${i + 1}: el texto se sale ${(fin0 - limite).toFixed(2)} in`);
    const libre = Math.max(0, limite - fin0);
    const hFoto = base + Math.min(1.3, libre * 0.55), gap = 0.2 + Math.min(0.32, (libre - (hFoto - base)) / Math.max(1, P.bloques.length - 1));
    b.addImage({ data: await foto(P.foto, PW, hFoto), x, y: 0, w: PW, h: hFoto });
    b.addShape(pres.shapes.OVAL, { x: x + M, y: hFoto - 0.42, w: 0.84, h: 0.84, fill: { color: c.acc }, line: { color: i === 1 ? c.cla : 'FFFFFF', width: 3 } });
    b.addText(P.n, txt('', { x: x + M, y: hFoto - 0.42, w: 0.84, h: 0.84, fontFace: TIT, fontSize: 26, color: sobreAcc, align: 'center', valign: 'middle' }));
    b.addText(P.titulo.toUpperCase(), txt('', { x: x + M, y: hFoto + 0.58, w: ancho, h: hTit, fontFace: TIT, fontSize: 24, color: c.osc, lineSpacingMultiple: 0.98 }));
    const fin = await pintar(b, hFoto + cab, gap);
    t._adentro.push(fin.toFixed(2) + '/' + limite.toFixed(2));
  }
  b.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2 * PW + M, y: H - 0.56, w: PW - 2 * M, h: 0.32, rectRadius: 0.16, fill: { color: c.osc }, line: { color: c.osc } });
  b.addText('Educación Física III · Bachillerato Rembrandt · 3.1', txt('', { x: 2 * PW + M, y: H - 0.56, w: PW - 2 * M, h: 0.32, fontSize: 8.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' }));
  const archivo = path.join(SAL, 'Triptico-' + t.id + '.pptx');
  await pres.writeFile({ fileName: archivo });
  console.log('✓', path.basename(archivo), '· solapa', t._solapa, '· contra', t._contra, '· adentro', t._adentro.join('  '));
}
(async () => { for(const t of T) await hacer(t); })().catch(e => { console.error(e); process.exit(1); });
