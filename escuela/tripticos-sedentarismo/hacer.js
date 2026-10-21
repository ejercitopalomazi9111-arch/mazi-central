/* Cinco trípticos de prevención de enfermedades por sedentarismo · Educación Física III
   Carta horizontal (11 × 8.5 in), dos caras por tríptico, todo editable para Canva.
   Datos: OMS, Directrices sobre actividad física y comportamientos sedentarios (2020)
   y nota descriptiva «Actividad física» (26 de junio de 2024). */
const pptxgen = require('pptxgenjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const lu = require('react-icons/lu');
const fs = require('fs');

const ESCUDO = fs.readFileSync('/home/user/mazi-central/reportes/escudo-rembrandt.png').toString('base64');
const TIT = 'Anton', TXT = 'Poppins';
const W = 11, H = 8.5, PW = W / 3, M = 0.32;

async function icono(nombre, color){
  const C = lu[nombre]; if(!C) throw new Error('sin icono ' + nombre);
  const svg = renderToStaticMarkup(React.createElement(C, { size: 256, color: '#' + color, strokeWidth: 2 }));
  const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return 'image/png;base64,' + png.toString('base64');
}

const FUENTES = 'OMS. Directrices sobre actividad física y comportamientos sedentarios (2020). OMS. Nota descriptiva «Actividad física» (26 de junio de 2024).';

const T = [
  { id: '1-sedentarismo', c: { osc: '23205A', acc: 'FF5A36', cla: 'F4F2FF', tin: '1D1B3A' },
    portada: { sup: 'Prevención de enfermedades', titulo: 'Sedentarismo:\nel enemigo silencioso', sub: 'Muévete más, siéntate menos', ico: 'LuArmchair' },
    contra: { frase: 'Toda actividad cuenta: un poco es mejor que nada.', ico: 'LuFootprints' },
    solapa: { titulo: '¿Eres sedentario?', ico: 'LuClipboardCheck', intro: 'Contesta con honestidad. Marca las que sí te pasan:',
      casillas: ['Paso más de 6 horas al día sentado (clases, tareas, pantallas).', 'Uso el celular o videojuegos más de 2 horas seguidas.', 'Casi nunca camino más de 15 minutos seguidos.', 'Fuera de Educación Física no hago deporte.', 'Me canso al subir dos pisos de escaleras.'],
      cierre: 'Si marcaste 3 o más, es momento de moverte. ¡Este tríptico es para ti!' },
    adentro: [
      { n: '01', titulo: '¿Qué es?', bloques: [
        { t: 'p', x: 'El sedentarismo es pasar mucho tiempo sentado o acostado y no hacer la actividad física que tu cuerpo necesita.' },
        { t: 'dato', num: '81 %', x: 'de los adolescentes del mundo (11 a 17 años) no se mueve lo suficiente. En las mujeres es 85 % y en los hombres 78 %.', f: 'OMS' },
        { t: 'p', x: 'Es silencioso porque no duele al principio: el daño se acumula con los años.' } ] },
      { n: '02', titulo: 'Lo que provoca', bloques: [
        { t: 'lista', items: [['LuScale', 'Obesidad', 'se gasta menos energía y se acumula grasa.'], ['LuDroplet', 'Diabetes tipo 2', 'el azúcar en la sangre se eleva.'], ['LuHeartPulse', 'Hipertensión y corazón', 'más riesgo de infartos.'], ['LuBone', 'Huesos y músculos débiles', 'y dolor de espalda.'], ['LuBrain', 'Ansiedad y depresión', 'peor ánimo y peor sueño.']] },
        { t: 'aviso', x: 'Quien no se mueve lo suficiente tiene entre 20 % y 30 % más riesgo de morir antes de tiempo. (OMS)' } ] },
      { n: '03', titulo: 'Cómo prevenirlo', bloques: [
        { t: 'lista', items: [['LuTimer', '60 minutos al día', 'de actividad moderada a vigorosa.'], ['LuDumbbell', '3 días a la semana', 'ejercicios de fuerza para músculos y huesos.'], ['LuMonitorOff', 'Menos pantallas', 'en tu tiempo libre.'], ['LuPersonStanding', 'Pausas activas', 'levántate y muévete en los descansos.'], ['LuFootprints', 'Escaleras y caminata', 'en lugar de elevador o transporte, cuando puedas.']] },
        { t: 'p', x: 'Recomendaciones de la OMS para adolescentes de 5 a 17 años.' } ] } ] },

  { id: '2-diabetes-obesidad', c: { osc: '0B4F5C', acc: 'F2B134', cla: 'EEF7F6', tin: '0D2E33' },
    portada: { sup: 'Prevención de enfermedades', titulo: 'Diabetes tipo 2\ny obesidad', sub: 'Tus músculos son tu mejor medicina', ico: 'LuApple' },
    contra: { frase: 'Moverte hoy es prevenir la diabetes de mañana.', ico: 'LuBike' },
    solapa: { titulo: 'Reto de 7 días', ico: 'LuCalendarCheck', intro: 'Palomea cada día que lo cumplas:',
      casillas: ['Lunes · 30 min de caminata rápida', 'Martes · cambiar el refresco por agua', 'Miércoles · 20 sentadillas en 3 series', 'Jueves · bailar 3 canciones seguidas', 'Viernes · un partido con tus amigos', 'Sábado · paseo en bici o patines', 'Domingo · estirar 10 minutos'],
      cierre: 'Repite el reto la siguiente semana y súbele un poco.' },
    adentro: [
      { n: '01', titulo: '¿Qué son?', bloques: [
        { t: 'def', a: 'Obesidad', x: 'Acumulación excesiva de grasa en el cuerpo que daña la salud.' },
        { t: 'def', a: 'Diabetes tipo 2', x: 'El cuerpo no usa bien la insulina, la hormona que mete el azúcar (glucosa) a las células. El azúcar se queda en la sangre y daña ojos, riñones, nervios y corazón.' },
        { t: 'p', x: 'Las dos van de la mano: el exceso de grasa, sobre todo en el abdomen, hace que la insulina funcione peor.' },
        { t: 'aviso', x: 'Antes se veía casi sólo en adultos; hoy también aparece en jóvenes.' } ] },
      { n: '02', titulo: 'La relación con no moverse', bloques: [
        { t: 'p', x: 'Cuando haces ejercicio, tus músculos usan la glucosa como combustible. Si pasas el día sentado, la gastan menos y el cuerpo responde peor a la insulina.' },
        { t: 'titulito', x: 'Señales de alerta' },
        { t: 'lista', items: [['LuGlassWater', 'Mucha sed', ''], ['LuToilet', 'Orinar muy seguido', ''], ['LuBatteryLow', 'Cansancio constante', ''], ['LuEye', 'Vista borrosa', '']] },
        { t: 'aviso', x: 'Si tienes estas señales, acude al médico. Sólo un estudio de sangre confirma la diabetes.' } ] },
      { n: '03', titulo: 'Cómo prevenirlas', bloques: [
        { t: 'lista', items: [['LuActivity', 'Muévete 60 minutos', 'al día: camina, corre, baila, juega.'], ['LuGlassWater', 'Toma agua', 'en lugar de refrescos y jugos.'], ['LuSalad', 'Frutas y verduras', 'en cada comida.'], ['LuMoon', 'Duerme bien', 'de 8 a 10 horas.'], ['LuStethoscope', 'Revisión médica', 'si hay diabetes en tu familia.']] },
        { t: 'aviso', x: 'Una lata de refresco de 355 ml puede traer cerca de 9 cucharaditas de azúcar.' } ] } ] },

  { id: '3-corazon', c: { osc: '7A1023', acc: 'FF4D6D', cla: 'FFF1F3', tin: '3A0812' },
    portada: { sup: 'Prevención de enfermedades', titulo: 'Corazón en\nmovimiento', sub: 'Hipertensión y enfermedades del corazón', ico: 'LuHeartPulse' },
    contra: { frase: 'Tu corazón es un músculo: si lo entrenas, se hace fuerte.', ico: 'LuHeart' },
    solapa: { titulo: 'Toma tu pulso', ico: 'LuWatch', intro: 'Actividad de la clase de Educación Física:',
      pasos: ['Pon tus dedos índice y medio en la muñeca, abajo del pulgar.', 'Cuenta los latidos durante 15 segundos.', 'Multiplica por 4: ésas son tus pulsaciones por minuto.', 'Mídelo en reposo y después de 1 minuto de saltos. Compara.'],
      cierre: 'En reposo, lo normal suele estar entre 60 y 100 latidos por minuto. Con el entrenamiento, el corazón late más tranquilo.' },
    adentro: [
      { n: '01', titulo: 'Un músculo que trabaja sin parar', bloques: [
        { t: 'p', x: 'El corazón bombea sangre a todo el cuerpo por las arterias. Cuando no te mueves, se debilita y las arterias pierden flexibilidad.' },
        { t: 'def', a: 'Hipertensión', x: 'Presión alta de la sangre en las arterias. Casi nunca da síntomas, por eso le dicen «el asesino silencioso».' },
        { t: 'titulito', x: 'Riesgos que sí puedes cambiar' },
        { t: 'chips', items: ['Sedentarismo', 'Comida chatarra', 'Exceso de sal', 'Tabaco y vapeo', 'Sobrepeso'] } ] },
      { n: '02', titulo: 'Riesgos del sedentarismo', bloques: [
        { t: 'lista', items: [['LuGauge', 'Presión alta', 'el corazón hace más esfuerzo.'], ['LuDroplets', 'Colesterol y grasas', 'se acumulan en las arterias.'], ['LuHeartCrack', 'Infarto y embolia', 'cuando una arteria se tapa.']] },
        { t: 'p', x: 'Con ejercicio regular, el corazón bombea más sangre en cada latido y trabaja con menos esfuerzo.' },
        { t: 'aviso', x: 'La OMS señala que la actividad física ayuda a prevenir las enfermedades del corazón y la hipertensión.' } ] },
      { n: '03', titulo: 'Entrena tu corazón', bloques: [
        { t: 'p', x: 'El ejercicio aeróbico es el que acelera tu respiración un buen rato:' },
        { t: 'chips', items: ['Caminar rápido', 'Trotar', 'Bici', 'Nadar', 'Bailar', 'Futbol', 'Básquet', 'Saltar la cuerda'] },
        { t: 'titulito', x: 'La prueba del habla' },
        { t: 'def', a: 'Moderada', x: 'puedes hablar, pero no cantar.' },
        { t: 'def', a: 'Vigorosa', x: 'sólo puedes decir unas palabras sin tomar aire.' } ] } ] },

  { id: '4-huesos-espalda', c: { osc: '1F4D2E', acc: '8BD450', cla: 'F1F8EC', tin: '13301C' },
    portada: { sup: 'Prevención de enfermedades', titulo: 'Huesos fuertes,\nespalda sana', sub: 'Osteoporosis, postura y dolor de espalda', ico: 'LuBone' },
    contra: { frase: 'Lo que entrenes hoy lo cargan tus huesos toda la vida.', ico: 'LuMountain' },
    solapa: { titulo: 'Pausa activa de 5 minutos', ico: 'LuPersonStanding', intro: 'Hazla cada vez que lleves mucho rato sentado:',
      pasos: ['Gira los hombros hacia atrás 10 veces.', 'Inclina la cabeza a cada lado, 10 segundos.', 'Estira los brazos arriba y crece lo más que puedas.', 'Toca tus pies con las rodillas suaves, 15 segundos.', 'Haz 10 sentadillas y 20 saltos en tu lugar.'],
      cierre: 'Sin rebotes ni dolor. Si algo duele, detente.' },
    adentro: [
      { n: '01', titulo: 'Tu edad es clave', bloques: [
        { t: 'p', x: 'En la adolescencia tus huesos ganan más masa que en cualquier otra etapa. Lo que construyas ahora es tu «ahorro» para cuando seas adulto.' },
        { t: 'def', a: 'Osteoporosis', x: 'Huesos débiles y porosos que se rompen con facilidad. Se previene desde joven con movimiento y buena alimentación.' },
        { t: 'titulito', x: 'Lo que necesitan tus huesos' },
        { t: 'lista', items: [['LuMilk', 'Calcio', 'leche, yogur, queso y tortilla de maíz.'], ['LuSun', 'Vitamina D', 'un poco de sol todos los días.'], ['LuActivity', 'Movimiento con impacto', 'saltar, correr, jugar.']] } ] },
      { n: '02', titulo: 'Lo que hace estar sentado', bloques: [
        { t: 'lista', items: [['LuSmartphone', 'Cuello «de celular»', 'por mirar la pantalla hacia abajo.'], ['LuArmchair', 'Espalda encorvada', 'y dolor en la zona lumbar.'], ['LuShrink', 'Músculos débiles', 'en abdomen, espalda y piernas.'], ['LuBone', 'Huesos con menos fuerza', 'por falta de impacto.']] },
        { t: 'aviso', x: 'Pasar muchas horas encorvado puede causar dolor de cuello, de espalda y hasta de cabeza.' } ] },
      { n: '03', titulo: 'Cómo fortalecerte', bloques: [
        { t: 'p', x: 'Los ejercicios de impacto y de fuerza le dicen al hueso que se haga más fuerte:' },
        { t: 'chips', items: ['Saltar la cuerda', 'Correr', 'Básquet', 'Voleibol', 'Sentadillas', 'Plancha', 'Lagartijas'] },
        { t: 'titulito', x: 'Frente a la pantalla' },
        { t: 'lista', items: [['LuMonitor', 'Pantalla a la altura de los ojos', ''], ['LuArmchair', 'Espalda recta y pies en el piso', ''], ['LuTimer', 'Levántate cada 30 a 60 minutos', '']] } ] } ] },

  { id: '5-mente-activa', c: { osc: '3D1F6E', acc: '2EC4B6', cla: 'F3F0FA', tin: '22113F' },
    portada: { sup: 'Prevención de enfermedades', titulo: 'Mente\nactiva', sub: 'El ejercicio también cuida tu salud mental', ico: 'LuBrain' },
    contra: { frase: 'Mover el cuerpo también acomoda las ideas.', ico: 'LuSmile' },
    solapa: { titulo: 'No estás solo', ico: 'LuPhone', intro: 'Si te sientes triste, angustiado o sin ganas casi todos los días:',
      pasos: ['Platícalo con alguien de confianza: tu familia, un amigo o un maestro.', 'Busca a orientación o al departamento psicopedagógico de tu escuela.', 'Llama a la Línea de la Vida: 800\u00A0911\u00A02000. Es gratis y atiende las 24 horas, todos los días.'],
      cierre: 'Pedir ayuda es de valientes. El ejercicio ayuda, pero no sustituye la atención de un profesional.' },
    adentro: [
      { n: '01', titulo: 'Cuerpo quieto, mente cansada', bloques: [
        { t: 'p', x: 'Pasar el día sentado y frente a pantallas también afecta el ánimo, el sueño y la concentración.' },
        { t: 'p', x: 'Cuando te mueves, tu cuerpo libera sustancias que te hacen sentir mejor y bajan el estrés.' },
        { t: 'p', x: 'Las pantallas en la noche y la falta de movimiento hacen más difícil dormir bien.' },
        { t: 'dato', num: '−', x: 'La OMS señala que la actividad física reduce los síntomas de ansiedad y depresión.', f: 'OMS' } ] },
      { n: '02', titulo: 'Beneficios para tu mente', bloques: [
        { t: 'lista', items: [['LuSmile', 'Mejor ánimo', 'y menos estrés.'], ['LuMoon', 'Mejor sueño', 'te duermes más rápido y descansas.'], ['LuBookOpen', 'Más concentración', 'y mejor rendimiento en la escuela.'], ['LuUsers', 'Amistades', 'jugar en equipo te conecta con otros.'], ['LuSparkles', 'Más confianza', 'al ver lo que tu cuerpo logra.']] },
        { t: 'aviso', x: 'Basta con empezar: una caminata de 10 minutos ya cuenta.' } ] },
      { n: '03', titulo: 'Tu semana activa', bloques: [
        { t: 'p', x: 'Escribe qué vas a hacer cada día (60 minutos):' },
        { t: 'semana', dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] },
        { t: 'p', x: 'Elige algo que te guste: así es más fácil no dejarlo.' } ] } ] },
];

/* ── piezas de dibujo ─────────────────────────────────────────────── */
function alto(texto, pt, ancho, inter = 1.25){
  /* cuántos renglones: ~ ancho en pulgadas × 72 / (pt × 0.52) caracteres por renglón */
  const porRenglon = Math.floor(ancho * 72 / (pt * 0.53));
  const renglones = String(texto).split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / porRenglon)), 0);
  return renglones * pt * inter / 72 + 0.06;
}

async function hacer(t){
  const pres = new pptxgen();
  pres.defineLayout({ name: 'CARTA', width: W, height: H });
  pres.layout = 'CARTA';
  pres.title = 'Tríptico · ' + t.portada.titulo.replace('\n', ' ');
  const c = t.c, icos = {};
  const ico = async (n, col) => icos[n + col] || (icos[n + col] = await icono(n, col));

  /* ═══ AFUERA: solapa · contraportada · portada ═══ */
  const a = pres.addSlide();
  a.background = { color: 'FFFFFF' };
  /* solapa (izquierda) */
  {
    const x = 0;
    a.addShape(pres.shapes.RECTANGLE, { x, y: 0, w: PW, h: H, fill: { color: c.cla }, line: { color: c.cla } });
    a.addShape(pres.shapes.OVAL, { x: x + M, y: 0.45, w: 0.62, h: 0.62, fill: { color: c.acc }, line: { color: c.acc } });
    a.addImage({ data: await ico(t.solapa.ico, 'FFFFFF'), x: x + M + 0.14, y: 0.59, w: 0.34, h: 0.34 });
    a.addText(t.solapa.titulo.toUpperCase(), { x: x + M, y: 1.18, w: PW - 2 * M, h: 0.9, fontFace: TIT, fontSize: 26, color: c.osc, margin: 0, valign: 'top' });
    let y = 2.15;
    a.addText(t.solapa.intro, { x: x + M, y, w: PW - 2 * M, h: 0.45, fontFace: TXT, fontSize: 11.5, bold: true, color: c.tin, margin: 0, valign: 'top' });
    y += alto(t.solapa.intro, 11.5, PW - 2 * M) + 0.16;
    if(t.solapa.casillas){
      for(const s of t.solapa.casillas){
        const h = Math.max(0.32, alto(s, 11, PW - 2 * M - 0.42));
        a.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y: y + 0.02, w: 0.24, h: 0.24, rectRadius: 0.04, fill: { color: 'FFFFFF' }, line: { color: c.osc, width: 1.25 } });
        a.addText(s, { x: x + M + 0.4, y, w: PW - 2 * M - 0.4, h, fontFace: TXT, fontSize: 11, color: c.tin, margin: 0, valign: 'top' });
        y += h + 0.2;
      }
    } else {
      t.solapa.pasos.forEach((s, i) => {
        const h = Math.max(0.38, alto(s, 11, PW - 2 * M - 0.5));
        a.addShape(pres.shapes.OVAL, { x: x + M, y, w: 0.34, h: 0.34, fill: { color: c.osc }, line: { color: c.osc } });
        a.addText(String(i + 1), { x: x + M, y, w: 0.34, h: 0.34, fontFace: TXT, fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0 });
        a.addText(s, { x: x + M + 0.48, y: y + 0.02, w: PW - 2 * M - 0.48, h, fontFace: TXT, fontSize: 11, color: c.tin, margin: 0, valign: 'top' });
        y += h + 0.2;
      });
    }
    y += 0.08;
    const hc = alto(t.solapa.cierre, 10.5, PW - 2 * M - 0.3) + 0.3;
    y = Math.max(y, H - 0.5 - hc);   /* el cierre va abajo, como pie de la solapa */
    a.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y, w: PW - 2 * M, h: hc, rectRadius: 0.1, fill: { color: c.osc }, line: { color: c.osc } });
    a.addText(t.solapa.cierre, { x: x + M + 0.15, y: y + 0.1, w: PW - 2 * M - 0.3, h: hc - 0.2, fontFace: TXT, fontSize: 10.5, bold: true, color: 'FFFFFF', margin: 0, valign: 'middle' });
    t._solapa = y + hc;
  }
  /* contraportada (centro) */
  {
    const x = PW;
    a.addShape(pres.shapes.OVAL, { x: x + PW / 2 - 0.75, y: 0.7, w: 1.5, h: 1.5, fill: { color: c.cla }, line: { color: c.cla } });
    a.addImage({ data: await ico(t.contra.ico, c.osc), x: x + PW / 2 - 0.45, y: 1.0, w: 0.9, h: 0.9 });
    a.addText(t.contra.frase, { x: x + M, y: 2.45, w: PW - 2 * M, h: 1.3, fontFace: TIT, fontSize: 22, color: c.osc, align: 'center', valign: 'top', margin: 0 });
    a.addText([
      { text: 'Elaboraron', options: { bold: true, color: c.osc, breakLine: true } },
      { text: '________________________', options: { breakLine: true } },
      { text: '________________________', options: { breakLine: true } },
      { text: '________________________', options: { breakLine: true } },
      { text: 'Grupo: _______  Fecha: _______', options: {} },
    ], { x: x + M, y: 4.15, w: PW - 2 * M, h: 1.5, fontFace: TXT, fontSize: 10, color: c.tin, align: 'center', valign: 'top', margin: 0, lineSpacingMultiple: 1.35 });
    a.addText([{ text: 'Fuentes: ', options: { bold: true } }, { text: FUENTES }], { x: x + M, y: 6.05, w: PW - 2 * M, h: 0.85, fontFace: TXT, fontSize: 7.5, color: '6B6B7B', align: 'center', valign: 'top', margin: 0 });
    a.addImage({ data: 'image/png;base64,' + ESCUDO, x: x + PW / 2 - 0.3, y: 7.05, w: 0.6, h: 0.6 * 1.11 });
  }
  /* portada (derecha) */
  {
    const x = 2 * PW;
    a.addShape(pres.shapes.RECTANGLE, { x, y: 0, w: PW, h: H, fill: { color: c.osc }, line: { color: c.osc } });
    a.addShape(pres.shapes.OVAL, { x: x + PW - 2.2, y: -0.9, w: 3.1, h: 3.1, fill: { color: c.acc, transparency: 82 }, line: { color: c.acc, transparency: 100 } });
    a.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y: 0.5, w: 2.05, h: 0.34, rectRadius: 0.17, fill: { color: c.acc }, line: { color: c.acc } });
    a.addText('EDUCACIÓN FÍSICA III', { x: x + M, y: 0.5, w: 2.05, h: 0.34, fontFace: TXT, fontSize: 9, bold: true, color: c.osc, align: 'center', valign: 'middle', margin: 0, charSpacing: 1 });
    a.addShape(pres.shapes.OVAL, { x: x + PW / 2 - 0.95, y: 1.35, w: 1.9, h: 1.9, fill: { color: c.acc }, line: { color: c.acc } });
    a.addImage({ data: await ico(t.portada.ico, c.osc), x: x + PW / 2 - 0.55, y: 1.75, w: 1.1, h: 1.1 });
    a.addText(t.portada.sup.toUpperCase(), { x: x + M, y: 3.6, w: PW - 2 * M, h: 0.3, fontFace: TXT, fontSize: 9.5, bold: true, color: c.acc, margin: 0, charSpacing: 1.5 });
    a.addText(t.portada.titulo.toUpperCase(), { x: x + M, y: 3.95, w: PW - 2 * M, h: 1.9, fontFace: TIT, fontSize: 36, color: 'FFFFFF', margin: 0, valign: 'top', lineSpacingMultiple: 0.95 });
    a.addText(t.portada.sub, { x: x + M, y: 5.95, w: PW - 2 * M, h: 0.7, fontFace: TXT, fontSize: 12, color: 'FFFFFF', margin: 0, valign: 'top' });
    a.addShape(pres.shapes.OVAL, { x: x + M, y: 7.05, w: 0.78, h: 0.78, fill: { color: 'FFFFFF' }, line: { color: 'FFFFFF' } });
    a.addImage({ data: 'image/png;base64,' + ESCUDO, x: x + M + 0.16, y: 7.12, w: 0.46, h: 0.46 * 1.11 });
    a.addText([{ text: 'Bachillerato Rembrandt', options: { bold: true, breakLine: true } }, { text: 'Grupo 3.1 · Tercer semestre' }],
      { x: x + M + 0.92, y: 7.1, w: PW - 2 * M - 0.92, h: 0.7, fontFace: TXT, fontSize: 9, color: 'FFFFFF', margin: 0, valign: 'middle' });
  }
  /* líneas de doblez, discretas */
  for(const k of [1, 2]) a.addShape(pres.shapes.LINE, { x: k * PW, y: 0.15, w: 0, h: 0.25, line: { color: 'BBBBBB', width: 0.5, dashType: 'dash' } });

  /* ═══ ADENTRO: tres paneles ═══ */
  const b = pres.addSlide();
  b.background = { color: 'FFFFFF' };
  for(let i = 0; i < 3; i++){
    const P = t.adentro[i], x = i * PW, ancho = PW - 2 * M;
    if(i === 1) b.addShape(pres.shapes.RECTANGLE, { x, y: 0, w: PW, h: H, fill: { color: c.cla }, line: { color: c.cla } });
    b.addText(P.n, { x: x + M, y: 0.35, w: 1.2, h: 0.7, fontFace: TIT, fontSize: 40, color: c.acc, margin: 0, valign: 'top' });
    b.addText(P.titulo.toUpperCase(), { x: x + M, y: 1.08, w: ancho, h: 1.0, fontFace: TIT, fontSize: 25, color: c.osc, margin: 0, valign: 'top' });
    const y0 = 1.1 + alto(P.titulo.toUpperCase(), 25, ancho, 1.12) + 0.18;
    const pintar = async (B, extra) => {
    let y = y0;
    for(const k of P.bloques){
      if(k.t === 'p'){
        const h = alto(k.x, 12, ancho, 1.32);
        B.addText(k.x, { x: x + M, y, w: ancho, h, fontFace: TXT, fontSize: 12, color: c.tin, margin: 0, valign: 'top', lineSpacingMultiple: 1.1 });
        y += h + 0.18;
      } else if(k.t === 'titulito'){
        B.addText(k.x.toUpperCase(), { x: x + M, y, w: ancho, h: 0.32, fontFace: TXT, fontSize: 11.5, bold: true, color: c.acc === 'F2B134' || c.acc === '8BD450' || c.acc === '2EC4B6' ? c.osc : c.acc, margin: 0, charSpacing: 1 });
        y += 0.4;
      } else if(k.t === 'def'){
        const txt = [{ text: k.a + ': ', options: { bold: true, color: c.osc } }, { text: k.x }];
        const h = alto(k.a + ': ' + k.x, 12, ancho, 1.32);
        B.addText(txt, { x: x + M, y, w: ancho, h, fontFace: TXT, fontSize: 12, color: c.tin, margin: 0, valign: 'top', lineSpacingMultiple: 1.1 });
        y += h + 0.18;
      } else if(k.t === 'dato'){
        const hx = alto(k.x, 11.5, ancho - 0.36, 1.28), h = (k.num !== '−' ? 0.95 : 0.1) + hx + 0.34;
        B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y, w: ancho, h, rectRadius: 0.12, fill: { color: c.osc }, line: { color: c.osc } });
        if(k.num !== '−') B.addText(k.num, { x: x + M + 0.18, y: y + 0.12, w: ancho - 0.36, h: 0.85, fontFace: TIT, fontSize: 54, color: c.acc, margin: 0, valign: 'top' });
        B.addText(k.x, { x: x + M + 0.18, y: y + (k.num !== '−' ? 1.0 : 0.17), w: ancho - 0.36, h: hx, fontFace: TXT, fontSize: 11.5, color: 'FFFFFF', margin: 0, valign: 'top' });
        y += h + 0.2;
      } else if(k.t === 'aviso'){
        const h = alto(k.x, 10.5, ancho - 0.55, 1.28) + 0.26;
        B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y, w: ancho, h, rectRadius: 0.1, fill: { color: i === 1 ? 'FFFFFF' : c.cla }, line: { color: c.acc, width: 1.25 } });
        B.addImage({ data: await ico('LuInfo', c.osc), x: x + M + 0.12, y: y + 0.13, w: 0.28, h: 0.28 });
        B.addText(k.x, { x: x + M + 0.48, y: y + 0.12, w: ancho - 0.58, h: h - 0.22, fontFace: TXT, fontSize: 10.5, color: c.tin, margin: 0, valign: 'top' });
        y += h + 0.14;
      } else if(k.t === 'lista'){
        for(const [n, neg, resto] of k.items){
          const txt = resto ? neg + ': ' + resto : neg, h = Math.max(0.52, alto(txt, 11.5, ancho - 0.68, 1.28));
          B.addShape(pres.shapes.OVAL, { x: x + M, y, w: 0.52, h: 0.52, fill: { color: c.acc }, line: { color: c.acc } });
          B.addImage({ data: await ico(n, 'FFFFFF'), x: x + M + 0.12, y: y + 0.12, w: 0.28, h: 0.28 });
          B.addText(resto ? [{ text: neg + ': ', options: { bold: true, color: c.osc } }, { text: resto }] : [{ text: neg, options: { bold: true, color: c.osc } }],
            { x: x + M + 0.66, y: y + (h <= 0.52 ? 0 : 0.03), w: ancho - 0.66, h, fontFace: TXT, fontSize: 11.5, color: c.tin, margin: 0, valign: h <= 0.52 ? 'middle' : 'top' });
          y += h + 0.16;
        }
        y += 0.04;
      } else if(k.t === 'chips'){
        /* pastillas que se acomodan en renglones */
        let cx = x + M, fila = 0;
        for(const s of k.items){
          const w = s.length * 0.085 + 0.34;
          if(cx + w > x + PW - M){ cx = x + M; fila++; }
          B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: y + fila * 0.44, w, h: 0.35, rectRadius: 0.17, fill: { color: c.osc }, line: { color: c.osc } });
          B.addText(s, { x: cx, y: y + fila * 0.44, w, h: 0.35, fontFace: TXT, fontSize: 10, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0 });
          cx += w + 0.08;
        }
        y += (fila + 1) * 0.44 + 0.16;
      } else if(k.t === 'semana'){
        for(const d of k.dias){
          B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M, y, w: 0.62, h: 0.48, rectRadius: 0.08, fill: { color: c.osc }, line: { color: c.osc } });
          B.addText(d, { x: x + M, y, w: 0.62, h: 0.48, fontFace: TXT, fontSize: 10.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0 });
          B.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + M + 0.7, y, w: ancho - 0.7, h: 0.48, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: c.osc, width: 0.75 } });
          y += 0.57;
        }
        y += 0.06;
      }
          y += extra;
    }
    return y;
    };
    const nada = { addText(){}, addShape(){}, addImage(){} };
    const fin0 = await pintar(nada, 0), limite = i === 2 ? H - 0.8 : H - 0.45;
    const extra = Math.min(0.5, Math.max(0, (limite - fin0) / P.bloques.length));
    const y = await pintar(b, extra);
    t.adentro[i]._fin = y;
  }
  b.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2 * PW + M, y: H - 0.55, w: PW - 2 * M, h: 0.3, rectRadius: 0.15, fill: { color: c.osc }, line: { color: c.osc } });
  b.addText('Educación Física III · Bachillerato Rembrandt', { x: 2 * PW + M, y: H - 0.55, w: PW - 2 * M, h: 0.3, fontFace: TXT, fontSize: 8.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0 });
  const archivo = 'Triptico-' + t.id + '.pptx';
  await pres.writeFile({ fileName: archivo });
  console.log('✓', archivo, 'solapa', t._solapa.toFixed(2), '· adentro:', t.adentro.map(p => p._fin.toFixed(2)).join(' / '));
}

(async () => { for(const t of T) await hacer(t); })().catch(e => { console.error(e); process.exit(1); });
