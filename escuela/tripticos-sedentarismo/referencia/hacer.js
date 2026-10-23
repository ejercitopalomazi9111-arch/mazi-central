/* TRÍPTICO CON EL ESTILO DE LA REFERENCIA · prevención de enfermedades por sedentarismo
   Carlos, 24 de octubre, con tres capturas: «ten una referencia y te mandé también nuestra
   competencia, el verde es la referencia». La referencia es «Nutrición y Vida Saludable»: tres
   bloques de color (verde oscuro · verde limón · verde oscuro), letra gruesa redondeada, fotos en
   círculo como platos que se salen del panel, números en bolita, botones de píldora y estrellitas.

   Lo que se le corrige a la referencia: su texto blanco sobre el limón casi no se lee (aquí va en
   verde muy oscuro), y cada dato lleva su fuente. A la competencia («Malos hábitos» e «IMC») le
   quedó texto de relleno en latín, faltas («concecuencias») y dibujos genéricos: aquí nada de eso.

   · Fotos reales de Unsplash (../fotos, con crédito en ../fotos/CREDITOS.md).
   · Datos: OMS (Directrices 2020 y nota «Actividad física», 26 jun 2024) e INSP/ENSANUT
     (Salud Pública de México 2025;67:609-621), los mismos de los otros trípticos.
   · Los nombres del equipo se leen de ../visuales/integrantes.txt, que no se sube (el repo es público).
   · Las fotos en círculo y la frase curva se hornean en PNG con Chromium; los textos quedan editables.

   Correr:  NODE_PATH=<carpeta con pptxgenjs, sharp, react, react-dom y react-icons> node hacer.js
   Sale en salida/ (no se sube: lleva los nombres). */
const pptxgen = require('pptxgenjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const lu = require('react-icons/lu');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');

const AQUI = __dirname, FOTOS = path.join(AQUI, '..', 'fotos'), SAL = path.join(AQUI, 'salida');
fs.mkdirSync(SAL, { recursive: true });
const ESCUDO = fs.readFileSync(path.join(AQUI, '..', '..', '..', 'reportes', 'escudo-rembrandt.png')).toString('base64');
const ARCH_NOMBRES = path.join(AQUI, '..', 'visuales', 'integrantes.txt');
const NOMBRES = fs.existsSync(ARCH_NOMBRES) ? fs.readFileSync(ARCH_NOMBRES, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : [];
const TIT = 'Lilita One', TXT = 'Poppins';
const W = 11, H = 8.5, PW = W / 3, M = 0.36, DPI = 220;
/* los verdes de la referencia, medidos en la captura; el texto sobre limón va oscuro */
const C = { osc: '3B5A1C', pil: '2A4413', lima: 'A3BE22', tinta: '1C2E0C', blanco: 'FFFFFF', claro: 'E9F2C8' };

async function icono(nombre, color){
  const K = lu[nombre]; if(!K) throw new Error('sin icono ' + nombre);
  const svg = renderToStaticMarkup(React.createElement(K, { size: 256, color: '#' + color, strokeWidth: 2.2 }));
  return 'image/png;base64,' + (await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer()).toString('base64');
}
/* cuántas pulgadas mide un texto: ~ancho × 72 / (pt × 0.54) letras por renglón */
function alto(texto, pt, ancho, inter = 1.25, k = 0.54){
  const por = Math.floor(ancho * 72 / (pt * k));
  const r = String(texto).split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / por)), 0);
  return r * pt * inter / 72 + 0.05;
}

/* ── los platos: la foto en círculo con su aro blanco, y si va, la frase curva abajo ── */
async function platos(lista){
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await br.newPage({ deviceScaleFactor: 1 });
  const out = {};
  for(const p of lista){
    const d = Math.round(p.d * DPI), aro = Math.round(d * 0.045), extra = p.frase ? Math.round(d * 0.2) : 0, L = d + 2 * extra;
    const img = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(FOTOS, p.foto + '.jpg')).toString('base64');
    const r = d / 2 + extra * 0.78, cx = L / 2;
    const frase = p.frase ? `<svg width="${L}" height="${L}" style="position:absolute;left:0;top:0"><path id="c" d="M${cx - r} ${cx} A${r} ${r} 0 0 0 ${cx + r} ${cx}" fill="none"/>
      <text font-family="Poppins" font-weight="600" font-size="${Math.round(d * 0.068)}" fill="#fff" letter-spacing="${Math.round(d * 0.004)}"><textPath href="#c" startOffset="50%" text-anchor="middle">${p.frase}</textPath></text></svg>` : '';
    await pg.setContent(`<html><head><style>@font-face{font-family:Poppins;font-weight:600;src:url(file:///root/.fonts/Poppins-SemiBold.ttf)}
      html,body{margin:0;background:transparent}</style></head><body><div id="p" style="position:relative;width:${L}px;height:${L}px">
      <div style="position:absolute;left:${extra}px;top:${extra}px;width:${d}px;height:${d}px;border-radius:50%;background:#fff;box-shadow:0 ${Math.round(d * .02)}px ${Math.round(d * .05)}px rgba(0,0,0,.35)"></div>
      <div style="position:absolute;left:${extra + aro}px;top:${extra + aro}px;width:${d - 2 * aro}px;height:${d - 2 * aro}px;border-radius:50%;background:url(${img}) ${p.pos || 'center'}/cover"></div>${frase}</div></body></html>`);
    await pg.evaluate(() => document.fonts.ready);
    const buf = await (await pg.$('#p')).screenshot({ omitBackground: true });
    out[p.k] = { data: 'image/png;base64,' + buf.toString('base64'), lado: L / DPI };
  }
  await br.close();
  return out;
}

(async () => {
  const P = await platos([
    { k: 'portada', foto: 'futbol', d: 2.75, pos: '45% 40%', frase: 'Muévete · Vive mejor · Siéntete bien' },
    { k: 'solapa', foto: 'estirar2', d: 2.85, pos: '55% 60%' },
    { k: 'izq', foto: 'cuerda2', d: 2.9, pos: '50% 28%' },
    { k: 'centro', foto: 'bici', d: 2.3, pos: '70% 50%' },
  ]);
  const pres = new pptxgen();
  pres.defineLayout({ name: 'CARTA', width: W, height: H }); pres.layout = 'CARTA';
  pres.title = 'Tríptico · Muévete y prevén';
  const icos = {}, ico = async (n, col) => icos[n + col] || (icos[n + col] = await icono(n, col));
  const txt = (o) => Object.assign({ fontFace: TXT, color: C.blanco, margin: 0, valign: 'top' }, o);
  const estrella = (s, x, y, t = 0.16) => s.addShape(pres.shapes.STAR_4_POINT, { x, y, w: t, h: t, fill: { color: C.blanco }, line: { color: C.blanco } });
  const fondo = (s, i, color) => s.addShape(pres.shapes.RECTANGLE, { x: i * PW, y: 0, w: PW, h: H, fill: { color }, line: { color } });
  const pildora = (s, texto, x, y, w, h = 0.4, o = {}) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: h / 2, fill: { color: C.pil }, line: { color: C.pil } });
    s.addText(texto, txt({ x, y, w, h, fontSize: 11.5, align: 'center', valign: 'middle', ...o }));
  };
  const plato = (s, k, cx, cy) => { const p = P[k]; s.addImage({ data: p.data, x: cx - p.lado / 2, y: cy - p.lado / 2, w: p.lado, h: p.lado }); };
  const vigila = [];   /* lo que mide cada panel contra su límite: si algo se sale, truena */
  const cabe = (que, fin, lim) => { vigila.push(`${que} ${fin.toFixed(2)}/${lim.toFixed(2)}`); if(fin > lim + 0.01) throw new Error(`${que}: se sale ${(fin - lim).toFixed(2)} in`); };
  /* la lista con número en bolita, como «Claves para comer bien» */
  const numerada = (s, x, y, ancho, items, pt = 12, gap = 0.22, colN = C.lima, colTxt = C.blanco, colNum = C.tinta) => {
    items.forEach((it, i) => {
      const h = Math.max(0.42, alto(it, pt, ancho - 0.62, 1.22));
      s.addShape(pres.shapes.OVAL, { x, y: y + (h > 0.5 ? 0.02 : (h - 0.42) / 2), w: 0.42, h: 0.42, fill: { color: colN }, line: { color: colN } });
      s.addText(String(i + 1), txt({ x, y: y + (h > 0.5 ? 0.02 : (h - 0.42) / 2), w: 0.42, h: 0.42, fontFace: TIT, fontSize: 15, color: colNum, align: 'center', valign: 'middle' }));
      s.addText(it, txt({ x: x + 0.6, y, w: ancho - 0.6, h, fontSize: pt, color: colTxt, valign: h > 0.5 ? 'top' : 'middle' }));
      y += h + gap;
    });
    return y - gap;
  };

  /* ═══════════ AFUERA: solapa · contraportada · portada ═══════════ */
  const a = pres.addSlide(); a.background = { color: C.osc };
  fondo(a, 0, C.osc); fondo(a, 1, C.lima); fondo(a, 2, C.osc);

  /* solapa · Claves para moverte */
  { const x = M, ancho = PW - 2 * M;
    a.addText('Claves para\nmoverte', txt({ x, y: 0.62, w: ancho, h: 1.05, fontFace: TIT, fontSize: 32, lineSpacingMultiple: 0.9 }));
    estrella(a, 2.62, 0.62, 0.2); estrella(a, 3.1, 0.3, 0.13);
    const fin = numerada(a, x, 1.98, ancho, ['60 minutos de actividad física al día', 'Ejercicio intenso y de fuerza 3 días a la semana', 'Menos pantallas en tu tiempo libre', 'Levántate y estírate en cada descanso'], 12.5, 0.26);
    cabe('solapa', fin, 5.35);
    plato(a, 'solapa', PW / 2 + 0.1, 6.75); estrella(a, 0.35, 7.9, 0.16); }

  /* contraportada · ¿Qué es el sedentarismo? (sobre el limón, todo en verde oscuro) */
  { const x = PW + M, ancho = PW - 2 * M;
    a.addText('¿Qué es el\nsedentarismo?', txt({ x, y: 0.62, w: ancho, h: 1.0, fontFace: TIT, fontSize: 28, color: C.tinta, align: 'center', lineSpacingMultiple: 0.9 }));
    const def = 'Es pasar gran parte del día sentado o acostado (en clase, con la tarea, frente al celular o la tele) y no hacer la actividad física que tu cuerpo necesita. No duele al principio, pero con los años abre la puerta a enfermedades.';
    const hd = alto(def, 11, ancho, 1.3); a.addText(def, txt({ x, y: 1.8, w: ancho, h: hd, fontSize: 11, color: C.tinta, align: 'center', lineSpacingMultiple: 1.12 }));
    let y = 1.8 + hd + 0.28;
    a.addText('Moverte te da:', txt({ x, y, w: ancho, h: 0.3, fontSize: 12, bold: true, color: C.tinta, align: 'center' })); y += 0.42;
    [['Un corazón fuerte', 0], ['Un peso saludable', 0.3], ['Más energía', 0], ['Mejor ánimo y sueño', 0.3]].forEach(([s, d]) => { pildora(a, s, x + d, y, ancho - 0.3, 0.38); y += 0.46; });
    y += 0.12;
    a.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: ancho, h: 1.64, rectRadius: 0.16, fill: { color: C.pil }, line: { color: C.pil } });
    a.addText('81 %', txt({ x: x + 0.22, y: y + 0.1, w: 1.5, h: 0.8, fontFace: TIT, fontSize: 46, color: C.lima }));
    a.addText('de los adolescentes de 11 a 17 años no hace la actividad física que necesita.', txt({ x: x + 0.22, y: y + 0.78, w: ancho - 0.44, h: 0.46, fontSize: 10 }));
    a.addText('OMS, 2024', txt({ x: x + 0.22, y: y + 1.34, w: ancho - 0.44, h: 0.22, fontSize: 8.5, bold: true, color: C.lima }));
    y += 1.64; cabe('contraportada', y, H - 0.92);
    a.addText([{ text: 'Fuentes: ', options: { bold: true } }, { text: 'OMS, Directrices sobre actividad física y comportamientos sedentarios (2020) y nota «Actividad física» (2024). INSP, Salud Pública de México 2025;67:609-621 (ENSANUT Continua 2020-2024). Fotos: Unsplash.' }],
      txt({ x, y: H - 0.86, w: ancho, h: 0.62, fontSize: 7.2, color: C.tinta, align: 'center' })); }

  /* portada · Muévete y prevén */
  { const x = 2 * PW + M, ancho = PW - 2 * M;
    estrella(a, 2 * PW + 3.05, 0.42, 0.18); estrella(a, 2 * PW + 0.42, 4.7, 0.18); estrella(a, 2 * PW + 3.15, 4.2, 0.12);
    a.addText('Muévete\ny prevén', txt({ x, y: 0.72, w: ancho, h: 1.5, fontFace: TIT, fontSize: 48, align: 'center', lineSpacingMultiple: 0.86 }));
    a.addText('Prevención de enfermedades por sedentarismo', txt({ x, y: 2.3, w: ancho, h: 0.5, fontSize: 12, bold: true, color: C.lima, align: 'center' }));
    const quien = 'Hecho por: ' + (NOMBRES.length ? NOMBRES.join(', ') : '____________________');
    const hq = alto(quien, 10, ancho, 1.25); a.addText(quien, txt({ x, y: 2.95, w: ancho, h: hq, fontSize: 10, align: 'center' }));
    cabe('portada', 2.95 + hq, 4.35);
    plato(a, 'portada', 2 * PW + PW / 2, 5.85);
    a.addShape(pres.shapes.OVAL, { x, y: H - 0.84, w: 0.56, h: 0.56, fill: { color: C.blanco }, line: { color: C.blanco } });
    a.addImage({ data: 'image/png;base64,' + ESCUDO, x: x + 0.11, y: H - 0.8, w: 0.34, h: 0.34 * 1.11 });
    a.addText([{ text: 'Educación Física III', options: { bold: true, breakLine: true } }, { text: 'Bachillerato Rembrandt · Grupo 3.1' }], txt({ x: x + 0.7, y: H - 0.86, w: ancho - 0.7, h: 0.6, fontSize: 9, valign: 'middle' })); }

  /* ═══════════ ADENTRO ═══════════ */
  const b = pres.addSlide(); b.background = { color: C.osc };
  fondo(b, 0, C.osc); fondo(b, 1, C.lima); fondo(b, 2, C.osc);

  /* izquierda · Lo que provoca, con el plato saliéndose por la esquina */
  { const x = M, ancho = PW - 2 * M;
    plato(b, 'izq', 0.85, 0.72); estrella(b, 2.85, 1.55, 0.2); estrella(b, 3.25, 0.55, 0.13);
    b.addText('Lo que\nprovoca', txt({ x, y: 2.35, w: ancho, h: 1.0, fontFace: TIT, fontSize: 32, lineSpacingMultiple: 0.9 }));
    b.addShape(pres.shapes.LINE, { x: 0, y: 3.5, w: 1.75, h: 0, line: { color: C.lima, width: 2 } });
    b.addText('Cuando pasas el día sentado:', txt({ x, y: 3.66, w: ancho, h: 0.3, fontSize: 11, bold: true, italic: true, color: C.claro }));
    let y = 4.1;
    for(const [n, neg, resto] of [['LuScale', 'Obesidad', 'gastas menos energía'], ['LuDroplet', 'Diabetes tipo 2', 'sube el azúcar en la sangre'], ['LuHeartPulse', 'Presión alta', 'y enfermedades del corazón'], ['LuBone', 'Huesos débiles', 'y dolor de espalda'], ['LuBrain', 'Ansiedad', 'y depresión']]){
      b.addShape(pres.shapes.OVAL, { x, y, w: 0.44, h: 0.44, fill: { color: C.lima }, line: { color: C.lima } });
      b.addImage({ data: await ico(n, C.tinta), x: x + 0.1, y: y + 0.1, w: 0.24, h: 0.24 });
      b.addText([{ text: neg, options: { bold: true, breakLine: true } }, { text: resto, options: { color: C.claro } }], txt({ x: x + 0.6, y: y - 0.04, w: ancho - 0.6, h: 0.52, fontSize: 10.5, valign: 'middle' }));
      y += 0.6;
    }
    y += 0.06;
    b.addText([{ text: '4 de cada 10 ', options: { fontFace: TIT, fontSize: 17, color: C.lima } }, { text: 'adolescentes en México tienen sobrepeso u obesidad (ENSANUT 2020-2024).', options: { fontSize: 10 } }],
      txt({ x, y, w: ancho, h: 0.62 })); y += 0.62;
    cabe('adentro izq', y, H - 0.25); }

  /* centro · Tu semana activa (sobre el limón), y el plato que se sale al panel de la derecha */
  { const x = PW + M, ancho = PW - 2 * M;
    b.addText('Tu semana\nactiva', txt({ x, y: 0.62, w: ancho, h: 1.0, fontFace: TIT, fontSize: 30, color: C.tinta, align: 'center', lineSpacingMultiple: 0.9 }));
    const dias = [['Lunes', 'caminata rápida de 30 minutos'], ['Martes', 'bici, patines o patineta'], ['Miércoles', '3 series de 20 sentadillas'], ['Jueves', 'baila 3 canciones seguidas'], ['Viernes', 'un partido con tus amigos'], ['Fin de semana', 'paseo activo en familia']];
    let y = 1.82;
    for(const [d, q] of dias){
      const h = alto(d + ': ' + q, 11, ancho - 0.28, 1.2);
      b.addShape(pres.shapes.OVAL, { x: x + 0.02, y: y + 0.07, w: 0.12, h: 0.12, fill: { color: C.pil }, line: { color: C.pil } });
      b.addText([{ text: d + ': ', options: { bold: true } }, { text: q }], txt({ x: x + 0.28, y, w: ancho - 0.28, h, fontSize: 11, color: C.tinta })); y += h + 0.06;
    }
    y += 0.18;
    pildora(b, '¡Recuerda!', x + 0.05, y, ancho - 0.5, 0.46, { fontFace: TIT, fontSize: 17 }); y += 0.56;
    pildora(b, 'Un poco es mejor que nada', x + 0.3, y, ancho - 0.4); y += 0.5;
    pildora(b, 'Agua, sueño y movimiento', x, y, ancho - 0.4); y += 0.4;
    cabe('adentro centro', y, 6.2);
    plato(b, 'centro', 2 * PW - 0.3, 7.42); estrella(b, PW + 0.4, 7.7, 0.15); }

  /* derecha · La receta de la OMS, con la prueba del habla */
  { const x = 2 * PW + M, ancho = PW - 2 * M;
    estrella(b, 2 * PW + 3.1, 0.45, 0.18);
    b.addText('La receta\nde la OMS', txt({ x, y: 0.62, w: ancho, h: 1.0, fontFace: TIT, fontSize: 30, lineSpacingMultiple: 0.9 }));
    let y = numerada(b, x, 1.86, ancho, ['60 minutos diarios de actividad moderada a vigorosa', '3 días a la semana, ejercicio intenso que fortalezca músculos y huesos', 'Menos tiempo sentado frente a pantallas'], 11.5, 0.24);
    y += 0.3; b.addShape(pres.shapes.LINE, { x: 2 * PW + 1.2, y, w: PW - 1.2, h: 0, line: { color: C.lima, width: 2 } }); y += 0.24;
    b.addText('La prueba del habla', txt({ x, y, w: ancho, h: 0.4, fontFace: TIT, fontSize: 19, color: C.lima })); y += 0.46;
    for(const [k, v] of [['Moderada', 'puedes platicar, pero no cantar.'], ['Vigorosa', 'sólo dices unas palabras sin tomar aire.']]){
      const h = alto(k + ': ' + v, 11, ancho, 1.25); b.addText([{ text: k + ': ', options: { bold: true, color: C.lima } }, { text: v }], txt({ x, y, w: ancho, h, fontSize: 11 })); y += h + 0.08;
    }
    cabe('adentro der', y, 6.25);
    b.addText('Para niños y adolescentes de 5 a 17 años (OMS, 2020).', txt({ x: 2 * PW + 1.35, y: 6.75, w: PW - 1.35 - M, h: 0.62, fontSize: 9.5, italic: true, color: C.claro, align: 'right' }));
    estrella(b, 2 * PW + 3.05, 7.55, 0.2); estrella(b, 2 * PW + 2.2, 7.95, 0.12); }

  const archivo = path.join(SAL, 'Triptico-muevete-y-preven.pptx');
  await pres.writeFile({ fileName: archivo });
  console.log('✓', path.basename(archivo), '·', vigila.join(' · '));
})().catch(e => { console.error(e); process.exit(1); });
