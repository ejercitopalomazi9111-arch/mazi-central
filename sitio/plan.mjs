#!/usr/bin/env node
/**
 * plan.mjs — el plan del sitio, para verlo en el teléfono.
 *
 * La versión de leer es `sitio/PLAN.md`; el acta del consejo es
 * `.claude/veredictos/2026-07-30-el-sitio.md`. Esto es lo que se ve mejor
 * dibujado que escrito: el diagrama de flujo, la paleta y el orden.
 *
 * Va escrito con la fuente de la casa, que se fundió hoy. Si esta página se ve
 * bien, la fuente sirve — es la primera aplicación real de Mazi.
 *
 *   node sitio/plan.mjs sitio/plan.html
 */
import { writeFileSync } from 'node:fs';

const SEC = [
  ['1', 'EL DISPLAY', 'portada',
   'Autoprueba de segmentos · lema · reloj vivo · botón de WhatsApp',
   '¿esto es real y lo hizo alguien?'],
  ['2', 'QUÉ HACEMOS', '',
   'Los seis servicios, una línea cada uno. Sin nombres de tecnología',
   '¿qué le compro?'],
  ['3', 'EL TALLER', 'la estrella',
   'La fábrica de tipografías corriendo en la página. Mueves tres perillas y 15 alfabetos históricos se redibujan',
   '¿saben hacerlo?'],
  ['4', 'TRABAJO', '',
   'Ligas Mazi por su nombre · plataforma de gestión sin marca ajena · Torre Infinita',
   '¿ya lo hicieron antes?'],
  ['5', 'CÓMO TRABAJAMOS', 'cierre',
   'El modelo de comisión en cristiano',
   '¿cómo se paga esto?'],
];

const RUTAS = [
  ['/taller', 'desde 3', '15 alfabetos · 13 pinceles · 107 caracteres · bajar el SVG y la fuente'],
  ['/juega', 'desde 4', 'Torre Infinita, con el dedo'],
  ['/marca', 'desde 4', 'Las hojas de la tipografía'],
];

const PAL = [
  ['Vacío', '#100A18', 'el fondo de todo'],
  ['Superficie', '#1E1428', 'tarjetas y barra'],
  ['Línea', '#2A2036', 'separadores'],
  ['Hueso', '#E9E4E4', 'todo el texto'],
  ['Apagado', '#8B8296', 'texto secundario'],
  ['Violeta', '#AC27FF', 'EL acento de marca'],
  ['Fósforo', '#E8232A', 'sólo dentro del display'],
];

const ORDEN = [
  ['1', 'Armazón + portada completa', 'nada', true],
  ['2', 'Qué hacemos · Cómo trabajamos · Trabaja con nosotros', 'nada', true],
  ['3', 'El taller — la fábrica en vivo', 'nada', true],
  ['4', 'Trabajo — capturas reales', 'nada', true],
  ['5', '/juega — Torre Infinita', 'nada', true],
  ['6', 'El video de la plataforma', 'el archivo de Carlos', false],
  ['7', 'Dominio y medición', 'decisión de Carlos', false],
];

const NO = [
  'ICAMP — ni nombre, ni logo, ni video con su marca',
  '"Clientes" que no son clientes · insignias de "confían en"',
  'Testimonios · caras de un equipo que no existe',
  'Cifras inventadas: "+50 proyectos", "98% satisfacción"',
  'Fotos de stock de gente sonriendo con laptops',
  'Carrusel automático · video de fondo · parallax de tres capas',
  'Scroll secuestrado · cursor personalizado · pantalla de carga',
  'Precios · lista de tecnologías · ligas al repositorio',
  'Bloquear el clic derecho (es teatro)',
  'Un blog que nadie va a escribir',
  'Modo claro a medias',
];

const APERTURA = [
  ['0.00', 'negro'],
  ['0.15', 'TODOS los segmentos prendidos — la autoprueba'],
  ['0.45', 'se apagan los que no van: queda GRUPO MAZI'],
  ['0.70', 'entra la paloma'],
  ['0.95', 'entra la frase'],
  ['1.20', 'entra el botón · el reloj arranca'],
];

writeFileSync(process.argv[2] || 'sitio/plan.html', `<!doctype html>
<meta charset="utf-8">
<title>El Sitio — plan de construcción</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @font-face{font-family:"Mazi";src:url("fuente/mazi.woff2") format("woff2"),
             url("fuente/mazi.ttf") format("truetype");font-display:swap}
  *{box-sizing:border-box}
  :root{--vacio:#100A18;--sup:#1E1428;--linea:#2A2036;--hueso:#E9E4E4;
        --apagado:#8B8296;--violeta:#AC27FF;--fosforo:#E8232A;--mazi:"Mazi",system-ui}
  body{margin:0;background:var(--vacio);color:var(--hueso);padding:30px 18px 70px;
       font:400 15px/1.6 system-ui,-apple-system,sans-serif}
  .w{max-width:760px;margin:0 auto}
  h1{font-family:var(--mazi);font-size:34px;font-weight:400;margin:0 0 4px;line-height:1.05}
  .sub{color:var(--apagado);font-size:14px;margin:0 0 6px}
  .tesis{border-left:3px solid var(--violeta);padding:12px 0 12px 14px;margin:22px 0 34px;
         font-size:17px;line-height:1.45}
  .tesis b{color:var(--violeta)}
  h2{font-family:var(--mazi);font-size:13px;font-weight:400;letter-spacing:.16em;
     color:var(--apagado);margin:40px 0 16px;border-top:1px solid var(--linea);padding-top:14px}

  /* ── el flujo ─────────────────────────────────────────── */
  .entra{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 6px}
  .entra span{font-size:12px;color:var(--apagado);border:1px solid var(--linea);
              border-radius:20px;padding:5px 11px}
  .flecha{color:var(--linea);text-align:center;font-size:20px;line-height:1;margin:2px 0}
  .caja{background:var(--sup);border:1px solid var(--linea);border-left:3px solid var(--violeta);
        border-radius:10px;padding:14px 16px}
  .caja .n{font-family:var(--mazi);color:var(--violeta);font-size:16px;margin-right:8px}
  .caja h3{display:inline;font-family:var(--mazi);font-size:17px;font-weight:400;margin:0}
  .caja .tag{font-size:10px;letter-spacing:.14em;color:var(--violeta);
             border:1px solid var(--violeta);border-radius:20px;padding:2px 8px;margin-left:8px;
             vertical-align:2px}
  .caja p{margin:8px 0 0;font-size:14px;color:#BDB4C6}
  .caja .res{margin:8px 0 0;font-size:13px;color:var(--apagado);font-style:italic}
  .ramal{margin:6px 0 6px 22px;padding-left:16px;border-left:1px dashed var(--linea)}
  .ruta{background:#160F20;border:1px solid var(--linea);border-radius:8px;padding:10px 13px;
        margin:6px 0}
  .ruta b{font-family:var(--mazi);font-size:14px;font-weight:400}
  .ruta em{font-size:11px;color:var(--apagado);font-style:normal;margin-left:8px}
  .ruta p{margin:5px 0 0;font-size:13px;color:var(--apagado)}
  .cierre{background:#2A1428;border:1px solid var(--fosforo);border-radius:10px;
          padding:14px 16px;margin:10px 0 0}
  .cierre h3{font-family:var(--mazi);font-size:17px;font-weight:400;margin:0}
  .cierre p{margin:6px 0 0;font-size:13px;color:#D8B8BC}
  .dos{display:grid;grid-template-columns:1fr;gap:10px}
  @media(min-width:620px){.dos{grid-template-columns:1fr 1fr}}
  .siempre{border:1px dashed var(--fosforo);border-radius:8px;padding:9px 13px;margin:14px 0 0;
           font-size:13px;color:#D8B8BC}

  /* ── paleta ───────────────────────────────────────────── */
  .pal{display:grid;grid-template-columns:1fr;gap:0;border:1px solid var(--linea);
       border-radius:10px;overflow:hidden}
  .pal div{display:flex;align-items:center;gap:12px;padding:10px 14px;
           border-bottom:1px solid var(--linea);font-size:13px}
  .pal div:last-child{border-bottom:0}
  .pal i{width:30px;height:30px;border-radius:7px;flex:0 0 auto;border:1px solid #ffffff18}
  .pal b{font-family:var(--mazi);font-weight:400;font-size:15px;min-width:96px}
  .pal code{color:var(--apagado);font-size:12px;min-width:74px}
  .pal span{color:var(--apagado)}

  /* ── apertura ─────────────────────────────────────────── */
  .tl div{display:flex;gap:14px;align-items:baseline;padding:8px 0;
          border-bottom:1px solid var(--linea);font-size:14px}
  .tl div:last-child{border-bottom:0}
  .tl b{font-family:var(--mazi);font-weight:400;color:var(--fosforo);min-width:52px;font-size:16px}

  /* ── orden ────────────────────────────────────────────── */
  .ord div{display:flex;gap:12px;align-items:flex-start;padding:10px 0;
           border-bottom:1px solid var(--linea)}
  .ord div:last-child{border-bottom:0}
  .ord b{font-family:var(--mazi);font-weight:400;font-size:20px;min-width:26px;
         color:var(--violeta)}
  .ord .no b{color:var(--apagado)}
  .ord p{margin:0;font-size:14px}
  .ord em{display:block;font-size:12px;color:var(--apagado);font-style:normal;margin-top:2px}
  .listo{font-size:10px;letter-spacing:.12em;border:1px solid var(--violeta);color:var(--violeta);
         border-radius:20px;padding:2px 7px;margin-left:8px;white-space:nowrap}
  .espera{font-size:10px;letter-spacing:.12em;border:1px solid var(--apagado);
          color:var(--apagado);border-radius:20px;padding:2px 7px;margin-left:8px;white-space:nowrap}

  /* ── no va ────────────────────────────────────────────── */
  .no{margin:0;padding:0;list-style:none}
  .no li{padding:8px 0 8px 26px;border-bottom:1px solid var(--linea);font-size:14px;
         position:relative;color:#BDB4C6}
  .no li:last-child{border-bottom:0}
  .no li:before{content:"⛔";position:absolute;left:0;font-size:12px;top:9px}
  .pie{margin:44px 0 0;padding:16px;border:1px solid var(--violeta);border-radius:10px;
       font-size:14px;line-height:1.55}
  .pie b{color:var(--violeta)}
</style>
<div class="w">
  <h1>El Sitio</h1>
  <p class="sub">Plan de construcción · 30 de julio de 2026 · consejo completo + criterio propio</p>
  <p class="sub">Esta página está escrita con <b style="color:var(--hueso)">Mazi</b>, la fuente que
  se fundió hoy. Es su primera aplicación real.</p>

  <div class="tesis">El sitio no es un folleto que enseña herramientas.<br>
  <b>El sitio ES una herramienta.</b></div>

  <h2>EL FLUJO</h2>
  <div class="entra">
    <span>📱 Instagram · WhatsApp</span><span>tarjeta · de boca en boca</span><span>🔎 buscador</span>
  </div>
  <div class="flecha">↓</div>
  ${SEC.map(([n, t, tag, q, res], i) => `
  <div class="caja">
    <span class="n">${n}</span><h3>${t}</h3>${tag ? `<span class="tag">${tag}</span>` : ''}
    <p>${q}</p><p class="res">resuelve: ${res}</p>
  </div>
  ${RUTAS.filter(r => r[1] === 'desde ' + n).length ? `<div class="ramal">
    ${RUTAS.filter(r => r[1] === 'desde ' + n).map(([ru, , d]) =>
      `<div class="ruta"><b>${ru}</b><em>ruta aparte, carga si la piden</em><p>${d}</p></div>`).join('')}
  </div>` : ''}
  ${i < SEC.length - 1 ? '<div class="flecha">↓</div>' : ''}`).join('')}
  <div class="flecha">↓</div>
  <div class="dos">
    <div class="cierre"><h3>CONTACTO</h3><p>WhatsApp · correo<br>resuelve: cerrar</p></div>
    <div class="cierre"><h3>TRABAJA CON NOSOTROS</h3><p>resuelve: el agujero que más sangra</p></div>
  </div>
  <div class="siempre">El botón de WhatsApp está <b>fijo y visible desde la primera pantalla</b>, y
  vuelve a aparecer al final de cada sección y de cada ruta. <b>Ningún callejón sin salida</b> —
  condición del consejo, no sugerencia.</div>

  <h2>LA APERTURA · AUTOPRUEBA DEL DISPLAY</h2>
  <p class="sub">Un reloj de LED, al encender, prende todos los segmentos un instante y luego muestra
  la hora. Es un gesto real de la máquina — y nuestra tipografía <i>es</i> un display de segmentos.</p>
  <div class="tl">${APERTURA.map(([t, q]) => `<div><b>${t}s</b><span>${q}</span></div>`).join('')}</div>
  <p class="sub">1.2 s en total. No bloquea nada: el contenido está en el HTML desde el primer byte y
  la animación sólo revela. Con <code>prefers-reduced-motion</code> salta al final. Pesa la fuente
  (9 KB) más CSS. Cero librerías.</p>

  <h2>LA PALETA</h2>
  <div class="pal">${PAL.map(([n, c, d]) =>
    `<div><i style="background:${c}"></i><b>${n}</b><code>${c}</code><span>${d}</span></div>`).join('')}</div>
  <p class="sub"><b style="color:var(--hueso)">El fósforo no es un segundo color de marca — es un
  material.</b> Sólo aparece donde el sitio imita una pantalla de LED. Si sale de ahí, la marca deja
  de tener un acento y pasa a tener dos, que es igual a no tener ninguno.</p>

  <h2>EL ORDEN</h2>
  <div class="ord">${ORDEN.map(([n, q, dep, listo]) =>
    `<div class="${listo ? '' : 'no'}"><b>${n}</b><p>${q}${listo
      ? '<span class="listo">SE PUBLICA</span>'
      : '<span class="espera">ESPERA</span>'}<em>depende de: ${dep}</em></p></div>`).join('')}</div>
  <p class="sub">Los cinco primeros no dependen de nadie. <b style="color:var(--hueso)">El Bloque 1
  se publica solo, feo o no</b>: en el momento en que hay portada con nombre, promesa y teléfono, el
  agujero #1 del diagnóstico está cerrado y todo lo demás pasa a ser mejora en vez de requisito.</p>

  <h2>QUÉ NO VA</h2>
  <ul class="no">${NO.map(x => `<li>${x}</li>`).join('')}</ul>

  <div class="pie"><b>La prueba de 10 minutos, que manda sobre todo lo anterior:</b><br>
  Escribe a mano, en el teléfono, las <b>cinco frases</b> del sitio — la de la portada y las cuatro de
  las secciones. Una línea cada una. Si las cinco salen y suenan a Grupo Mazi, el sitio se construye
  hoy. Si te trabas en la primera, el problema no es el diseño: es que todavía no sabemos qué
  decimos — y eso no lo arregla ninguna animación.</div>
</div>
`);
console.log('✒  ' + (process.argv[2] || 'sitio/plan.html'));
