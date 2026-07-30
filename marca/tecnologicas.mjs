#!/usr/bin/env node
/**
 * tecnologicas.mjs — las tres tecnológicas.
 *
 * Carlos pidió tres y sólo tres, con todo el empeño: una familiar, una
 * tecnológica y agresiva, y una profesional. Esta hoja las muestra con la misma
 * vara con la que se juzgaron las históricas —dos polaridades, bloqueo con la
 * paloma y sobre todo a 48 y 24 px— más dos pruebas que las anteriores no
 * pasaron nunca: el juego completo y una línea de texto de verdad.
 *
 *   node marca/tecnologicas.mjs marca/tecnologicas.html
 */
import { writeFileSync } from 'node:fs';
import { svg, ALFABETOS } from '../herramientas/tipos.mjs';

const VACIO = '#120C1A', HUESO = '#EAE5E3';
const M = 'GRUPO MAZI';

const TRES = [
  {
    id: 'T1', clave: 'cercana', papel: 'La familiar',
    op: { alfabeto: 'cercana' },
    mixta: 'Grupo Mazi',
    linea: 'No lo hacemos en corto, lo hacemos a la larga.',
    copie: [
      ['Punta redonda', 'El disco mide justo el trazo y va centrado en el extremo. Es la señal '
        + 'de "amable" más fuerte que existe, y no cambia nada más de la letra.'],
      ['Apertura abierta', 'La C y la S no se cierran sobre sí mismas. Cerrarlas da sensación '
        + 'de instrumento; abrirlas da sensación de trato.'],
      ['Travesaño bajo y contraforma generosa', 'La A cruza abajo y los huecos son grandes. '
        + 'Eso le baja el aire de autoridad sin volverla infantil.'],
      ['Minúscula de una sola planta', 'La "a" es un círculo con un asta que no sube. Es la '
        + 'que usan las marcas que quieren que no les tengas miedo.'],
    ],
    donde: 'Para hablarle a un cliente: WhatsApp, correo, propuesta. Es la que menos '
         + 'intimida y la que mejor se lee en párrafo.',
  },
  {
    id: 'T2', clave: 'reactor', papel: 'La tecnológica y agresiva',
    op: { alfabeto: 'reactor' },
    mixta: 'GRUPO MAZI',
    linea: 'SI NO EXISTE LA HERRAMIENTA, SE CONSTRUYE LA HERRAMIENTA',
    copie: [
      ['Esquina biselada', 'Cada esquina de 90° cortada a 45°. Es lo que le quita lo blando: '
        + 'la O deja de ser un anillo y se vuelve una pieza maquinada.'],
      ['Condensada', 'Contraforma estrecha y ancho al 84%. Lo angosto se lee como velocidad — '
        + 'por eso lo usa el rótulo deportivo.'],
      ['Corte sesgado', 'Las puntas libres no se cortan a escuadra sino en diagonal, y sólo '
        + 'las libres: en una unión un corte diagonal deja muesca. Da dirección.'],
      ['Corte de estencil', 'Un puente en medio de cada trazo largo, medido por largo de arco '
        + 'para que salga del mismo tamaño en toda la letra. Es lo que la vuelve militar.'],
    ],
    donde: 'Para el juego, el laboratorio de animación y cualquier cosa que tenga que verse '
         + 'peligrosa. NO para una cotización.',
  },
  {
    id: 'T3', clave: 'norma', papel: 'La profesional',
    op: { alfabeto: 'norma' },
    mixta: 'Grupo Mazi',
    linea: 'Web · software · marketing · video · gestión · tiempos y movimientos',
    copie: [
      ['Superelipse, en todo el juego', 'Lado recto y esquina curva: ni cuadrada ni redonda. '
        + 'Es la forma de Eurostile, y aquí está aplicada también a la minúscula — porque si '
        + 'la O es superelipse y la o es un círculo, se nota, y se nota mal.'],
      ['Ancho arquitectónico', 'Extendida al 106%, como Bank Gothic. Lo ancho comunica '
        + 'autoridad y solidez; lo angosto comunica prisa.'],
      ['Peso parejo y espacio apretado', 'Cero contraste, ritmo idéntico letra con letra. '
        + 'Se ve como instrumento medido, no como cartel.'],
      ['El movimiento propio, a propósito', 'La "sans-ificación" de 2024-25 dejó a las marcas '
        + 'tecnológicas con la misma cara: limpias e indistinguibles. La superelipse llevada a '
        + 'todo el juego es lo que hace que ésta no sea otra de esas.'],
    ],
    donde: 'La que aguanta un contrato, una factura y un membrete. Si Grupo Mazi va a '
         + 'parecer empresa y no chambita, es ésta.',
  },
];

const bloque = t => `
<article>
  <header><b>${t.id}</b><h2>${ALFABETOS[t.clave].nombre}</h2><span>${t.papel}</span></header>

  <div class="osc">${svg(M, t.op, HUESO, VACIO)}</div>
  <div class="clr">${svg(M, t.op, VACIO, HUESO)}</div>
  <div class="lock"><img src="logo/paloma.svg" alt=""><div>${svg(M, t.op, HUESO, VACIO)}</div></div>

  <div class="chico">
    <span class="et">La prueba de verdad</span>
    <figure><div class="av">${svg(M, t.op, HUESO, VACIO)}</div><figcaption>48 px · avatar</figcaption></figure>
    <figure><div class="fv">${svg(M, t.op, HUESO, VACIO)}</div><figcaption>24 px · favicon</figcaption></figure>
  </div>

  <div class="juego">
    <span class="et">El juego completo${ALFABETOS[t.clave].soloAlta
      ? ' · sin caja baja, como Bank Gothic' : ''}</span>
    ${svg('ABCDEFGHIJKLMNOPQRSTUVWXYZ', t.op, HUESO, VACIO)}
    ${ALFABETOS[t.clave].soloAlta ? ''
      : svg('abcdefghijklmnopqrstuvwxyz', t.op, HUESO, VACIO)}
    ${svg('0123456789 ÁÉÍÓÚÑ ¿? ¡! & @', t.op, HUESO, VACIO)}
  </div>

  <div class="frase">
    <span class="et">En uso</span>
    <div class="mx">${svg(t.mixta, t.op, HUESO, VACIO)}</div>
    <div class="ln">${svg(t.linea, t.op, HUESO, VACIO)}</div>
  </div>

  <ul>${t.copie.map(([q, p]) => `<li><b>${q}.</b> ${p}</li>`).join('')}</ul>
  <p class="donde">${t.donde}</p>
</article>`;

writeFileSync(process.argv[2] || 'marca/tecnologicas.html', `<meta charset="utf-8">
<title>Las tres tecnológicas</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:${VACIO};color:${HUESO};
       font:400 14px/1.65 "Segoe UI",system-ui,sans-serif;padding:44px 30px 60px}
  .wrap{max-width:1120px;margin:0 auto}
  h1{font-size:26px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px}
  .sub{color:#A99FB4;max-width:82ch;margin:0 0 8px}
  .sub b{color:${HUESO}}
  .fuentes{color:#6E657C;font-size:12px;line-height:1.9;margin:14px 0 36px}
  .fuentes a{color:#8B8296}
  article{border-top:1px solid #2A2036;padding-top:18px;margin:0 0 46px}
  header{display:flex;align-items:baseline;gap:12px;margin:0 0 16px;flex-wrap:wrap}
  header b{color:#AD21ED;font-size:12px;letter-spacing:.14em}
  header h2{font-size:20px;font-weight:700;margin:0;letter-spacing:-.01em}
  header span{margin-left:auto;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;
              color:#8B8296}
  article>div{padding:22px 26px;border-radius:11px;margin:0 0 9px}
  .osc,.lock,.chico,.juego,.frase{background:${VACIO};border:1px solid #2A2036}
  .chico,.juego,.frase{background:#180F22}
  .clr{background:${HUESO}}
  .osc svg,.clr svg{width:100%;height:auto;max-height:92px;display:block}
  .lock{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
  .lock img{height:64px;flex:0 0 auto}
  .lock>div{flex:1 1 220px;min-width:0}
  .lock svg{width:100%;height:auto;max-height:34px;display:block}
  .et{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#8B8296;
      display:block;margin:0 0 14px}
  .chico{display:flex;align-items:flex-end;gap:30px;flex-wrap:wrap}
  .chico .et{align-self:center;margin:0 4px 0 0}
  .chico figure{margin:0;text-align:center}
  .chico figcaption{font-size:10px;color:#6E657C;margin-top:8px;letter-spacing:.04em}
  .av svg{height:48px;width:auto}
  .fv svg{height:24px;width:auto}
  .juego svg{width:100%;height:auto;max-height:40px;display:block;margin:0 0 10px}
  .mx svg{width:100%;height:auto;max-height:52px;display:block;margin:0 0 14px}
  .ln svg{width:100%;height:auto;max-height:22px;display:block}
  article ul{margin:16px 0 0;padding-left:20px;color:#A99FB4;font-size:13.5px;max-width:90ch}
  article li{margin:0 0 9px}
  article li b{color:${HUESO}}
  .donde{color:#8B8296;font-size:12.5px;border-left:2px solid #AD21ED;padding-left:12px;
         margin:16px 0 0;max-width:88ch}
</style>
<div class="wrap">
  <h1>Las tres tecnológicas</h1>
  <p class="sub">Tres y nada más, cada una con un trabajo distinto. Lo que se copió de la
  investigación no fueron formas: fueron <b>decisiones con motivo</b> — la superelipse de
  Eurostile, el ancho arquitectónico de Bank Gothic, la geometría de norma industrial de DIN, y
  las cuatro señales del rótulo deportivo. Cada una viene explicada abajo de su muestra, y las
  tres pasan la misma prueba que mató a nueve de las históricas: <b>verse a 24 px</b>.</p>
  <p class="fuentes">De dónde salió:
  <a href="https://madegooddesigns.com/eurostile-font/">Eurostile y la superelipse</a> ·
  <a href="https://7fontslike.com/typeface-similar-to-bank-gothic-7-look-alike-alternatives/">Bank
  Gothic</a> · <a href="https://www.monotype.com/resources/guide-type-styles">guía de estilos de
  Monotype</a> · <a href="https://type.today/en/journal/geo">geometría de la sans geométrica</a> ·
  <a href="https://thebranx.com/blog/tech-brands-2025-the-most-important-branding-updates-and-trends-so-far">rebrandings
  tecnológicos 2025</a> ·
  <a href="https://www.creativeboom.com/insight/font-trends-2025/">la reacción contra la
  homogeneización</a> ·
  <a href="https://madegooddesigns.com/best-fonts-for-gaming/">tipografía de gaming y esports</a> ·
  <a href="https://fontfinds.com/gaming-fonts-stream-overlays-indie-ui-2026/">bisel, sesgo y
  estencil</a>.</p>
  ${TRES.map(bloque).join('\n')}
</div>
`);
console.log('✒  ' + (process.argv[2] || 'marca/tecnologicas.html'));
