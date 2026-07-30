#!/usr/bin/env node
/**
 * render.mjs — HERRAMIENTA MAZI · la mesa de fotografía.
 * ----------------------------------------------------------------------------
 * Compone el logo FINAL —la paloma vectorizada + el logotipo en la tipografía de
 * la casa— sobre fondos de estudio, y saca de paso los archivos de uso diario
 * que pedía el veredicto de branding: cuadrado para redes, avatar y favicon.
 *
 *   node marca/render.mjs                    → arma marca/render.html
 *   node marca/render.mjs --capturar         → además saca los PNG con captura.mjs
 *
 * ── POR QUÉ COMPOSITADO Y NO GENERADO ─────────────────────────────────────
 *
 * Carlos preguntó si le doy la imagen o el prompt para generarla. La respuesta,
 * y queda como regla:
 *
 *   **El logo NUNCA lo dibuja un modelo de imagen. El logo se COMPOSITA.**
 *
 * Ya lo vivimos: reconstruir esta paloma desde imágenes generadas costó veinte
 * rondas de corrección, y aun así el resultado bueno salió de VECTORIZAR una y
 * arreglarla a mano. Un modelo de imagen no puede repetir dos veces la misma
 * paloma, ni respetar el ancho de las barras de la cadera, ni acertarle al
 * violeta medido. Cada intento es una paloma distinta.
 *
 * Aquí las dos piezas son exactas y reproducibles: la paloma es un SVG de 9
 * trazos y el logotipo es una fuente de 9 KB. Cambiar el fondo es cambiar una
 * variable, y el logo sale idéntico siempre. Eso es lo que hace que una marca
 * SEA una marca: que no cambie.
 *
 * Lo que sí se puede generar es una **placa de fondo** —una textura, una
 * atmósfera— y encima se compone el logo de verdad. Para eso está el prompt en
 * `marca/PLACA.md`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { svg } from '../herramientas/tipos.mjs';

const VACIO = '#100A18', HUESO = '#E9E4E4', VIOLETA = '#AC27FF';

// La paloma, en línea: así el HTML es autónomo y el PNG no depende de rutas.
const paloma = readFileSync(new URL('./logo/paloma.svg', import.meta.url), 'utf8')
  .replace(/<\?xml[^>]*\?>/, '').trim();

const LOGOTIPO = svg('GRUPO MAZI', { alfabeto: 'mazi' }, 'currentColor', null);

/* ═══ LAS TOMAS ════════════════════════════════════════════════════════════ */

const TOMAS = [
  {
    id: 'estudio', an: 1920, al: 1080, nota: 'Estudio oscuro · la principal',
    fondo: `background:
      radial-gradient(120% 85% at 50% -10%, #2A1B3C 0%, #17102080 45%, ${VACIO} 78%),
      radial-gradient(60% 40% at 50% 118%, #1E142866 0%, transparent 70%),
      ${VACIO}`,
    tinta: HUESO, aura: VIOLETA, auraFuerza: 0.55, piso: true,
  },
  {
    id: 'display', an: 1920, al: 1080, nota: 'Panel de LED · el aura de segmentos',
    fondo: `background:
      radial-gradient(90% 70% at 50% 50%, #150A22 0%, #0B0710 70%, #07040C 100%),
      #07040C`,
    tinta: HUESO, aura: VIOLETA, auraFuerza: 1, reflejo: false, rejilla: true,
  },
  {
    id: 'claro', an: 1920, al: 1080, nota: 'Fondo claro · documentos y facturas',
    fondo: `background:
      radial-gradient(110% 80% at 50% -10%, #FFFFFF 0%, ${HUESO} 60%, #D9D2D2 100%),
      ${HUESO}`,
    tinta: VACIO, aura: null, grano: 0.03, sombra: true,
  },
  {
    id: 'vertical', an: 1080, al: 1350, nota: 'Vertical · Instagram',
    fondo: `background:
      radial-gradient(100% 60% at 50% 12%, #33204A 0%, #1A1226 45%, ${VACIO} 80%),
      ${VACIO}`,
    tinta: HUESO, aura: VIOLETA, auraFuerza: 0.7, piso: true, apilado: true,
  },
  {
    id: 'cuadrado', an: 1080, al: 1080, nota: 'Cuadrado · WhatsApp y perfil',
    fondo: `background:
      radial-gradient(85% 85% at 50% 30%, #2C1D40 0%, #191125 55%, ${VACIO} 100%),
      ${VACIO}`,
    tinta: HUESO, aura: VIOLETA, auraFuerza: 0.6, apilado: true, soloAve: false,
  },
  {
    id: 'avatar', an: 512, al: 512, nota: 'Avatar · sólo la paloma, para 48 px',
    fondo: `background:
      radial-gradient(80% 80% at 50% 25%, #33204A 0%, #1B1327 60%, ${VACIO} 100%),
      ${VACIO}`,
    tinta: HUESO, aura: VIOLETA, auraFuerza: 0.7, soloAve: true,
  },
  {
    id: 'favicon', an: 128, al: 128, nota: 'Favicon · sólo la paloma, sin fondo suave',
    fondo: `background:${VACIO}`,
    tinta: HUESO, aura: null, soloAve: true, apretado: true,
  },
  // Los iconos de la app instalada en el teléfono. Antes eran una foto; ahora
  // son el logo. Van SIN aura y con margen generoso: iOS recorta las esquinas y
  // un resplandor a 60 px se ve como una mancha, no como brillo.
  {
    id: 'icono-192', an: 192, al: 192, nota: 'Icono de la app · 192',
    fondo: `background:
      radial-gradient(78% 78% at 50% 30%, #33204A 0%, #1B1327 62%, ${VACIO} 100%),
      ${VACIO}`,
    tinta: HUESO, aura: VIOLETA, auraFuerza: 0.35, soloAve: true, apretado: false,
    escala: 1, grano: 0,
  },
  {
    id: 'icono-512', an: 512, al: 512, nota: 'Icono de la app · 512',
    fondo: `background:
      radial-gradient(78% 78% at 50% 30%, #33204A 0%, #1B1327 62%, ${VACIO} 100%),
      ${VACIO}`,
    tinta: HUESO, aura: VIOLETA, auraFuerza: 0.45, soloAve: true, apretado: false,
    escala: 1, grano: 0,
  },
];

/* ═══ UNA TOMA ═════════════════════════════════════════════════════════════ */

function toma(t) {
  // El aura de la paloma y la del texto NO pueden ser la misma. La paloma es
  // violeta y el violeta brillando se ve natural; el texto es hueso, y hueso con
  // un halo violeta fuerte se lee como letrero de neón — que es exactamente lo
  // que el plan del sitio prohíbe. Al texto le toca un cuarto.
  const halo = (f, c) => c
    ? `filter:drop-shadow(0 0 ${f * 22}px ${c}88) drop-shadow(0 0 ${f * 80}px ${c}44)`
    : '';
  const aura = halo(t.auraFuerza ?? 0, t.aura);
  const auraTxt = halo((t.auraFuerza ?? 0) * 0.26, t.aura);
  // Los iconos de app llevan más margen que el avatar: iOS les recorta las
  // esquinas con un radio grande y sin aire se come las puntas de las alas.
  const marco = /^icono-/.test(t.id) ? 19
    : t.apretado ? 8 : t.soloAve ? 16 : t.apilado ? 12 : 9;

  const ave = `<div class="ave" style="${aura}">${paloma}</div>`;
  const texto = t.soloAve ? '' : `<div class="txt" style="color:${t.tinta};${auraTxt}">${LOGOTIPO}</div>`;

  return `
<figure class="toma" id="${t.id}" style="width:${t.an}px;height:${t.al}px;${t.fondo}">
  ${t.rejilla ? '<div class="rejilla"></div>' : ''}
  <div class="marca ${t.apilado ? 'apilada' : 'fila'} ${t.soloAve ? 'sola' : ''}"
       style="padding:${marco}%">
    ${ave}${texto}
  </div>
  ${t.piso ? `<div class="piso" style="background:radial-gradient(50% 50% at 50% 50%,
       ${t.aura}22 0%, ${t.aura}0d 45%, transparent 75%)"></div>` : ''}
  ${t.sombra ? '<div class="sombra"></div>' : ''}
  <div class="grano" style="opacity:${t.grano ?? 0.055}"></div>
  <div class="vinieta"></div>
</figure>`;
}

/* ═══ LA HOJA ══════════════════════════════════════════════════════════════ */

const html = `<!doctype html>
<meta charset="utf-8">
<title>Marca Mazi — renders</title>
<style>
  *{box-sizing:border-box;margin:0}
  body{background:#0a0a0c;font:400 13px/1.5 system-ui,sans-serif;color:#8B8296;padding:20px}
  h1{font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:#8B8296;margin:0 0 18px}
  .rot{font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin:26px 0 8px;color:#6E657C}

  .toma{position:relative;overflow:hidden;display:block;flex:0 0 auto}
  .marca{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
         gap:6%}
  .marca.apilada{flex-direction:column;gap:4.5%}
  /* Sin esto, el important pisaba el margen mayor de los iconos de app. */
  .marca.sola{}
  .ave{flex:0 0 auto;line-height:0}
  .ave svg{display:block;width:100%;height:auto}
  .fila .ave{width:26%}
  .apilada .ave{width:44%}
  .sola .ave{width:100%}
  .txt{flex:1 1 auto;line-height:0;min-width:0}
  .txt svg{display:block;width:100%;height:auto;fill:currentColor}
  .apilada .txt{width:82%;flex:0 0 auto}

  /* Piso de luz. Reemplaza al reflejo, que se veía como un fantasma ENCIMA del
     logo: una copia volteada sobre el eje del centro cae en la misma banda que el
     original, así que para que un reflejo funcione el logo tendría que estar
     apoyado arriba de la línea de espejo. Un charco de luz debajo hace el mismo
     trabajo —que la pieza se sienta apoyada en algo— sin duplicar nada. */
  .piso{position:absolute;left:12%;right:12%;bottom:8%;height:26%;pointer-events:none}
  .sombra{position:absolute;left:22%;right:22%;bottom:16%;height:8%;pointer-events:none;
          background:radial-gradient(50% 50% at 50% 50%,#00000024 0%,transparent 72%)}

  /* Rejilla de panel: líneas finísimas, como el vidrio de un display. */
  .rejilla{position:absolute;inset:0;pointer-events:none;opacity:.5;
    background-image:
      repeating-linear-gradient(0deg,#ffffff07 0 1px,transparent 1px 4px),
      repeating-linear-gradient(90deg,#ffffff07 0 1px,transparent 1px 4px)}

  /* Grano: ruido de verdad, generado en SVG. Sin archivo externo y sin CDN. */
  .grano{position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>\
<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/>\
</filter><rect width='180' height='180' filter='url(%23n)'/></svg>");
    background-size:180px 180px}

  .vinieta{position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(120% 100% at 50% 45%,transparent 45%,#00000055 100%)}
</style>
<h1>Marca Mazi · renders</h1>
${TOMAS.map(t => `<p class="rot">${t.id} · ${t.nota} · ${t.an}×${t.al}</p>${toma(t)}`).join('\n')}
`;

const salida = new URL('./render.html', import.meta.url).pathname;
writeFileSync(salida, html);
console.log(`✒  ${salida}`);

/* ═══ CAPTURAR ═════════════════════════════════════════════════════════════ */

if (process.argv.includes('--capturar')) {
  const captura = new URL('../herramientas/captura.mjs', import.meta.url).pathname;
  for (const t of TOMAS) {
    const png = new URL(`./render/${t.id}.png`, import.meta.url).pathname;
    execFileSync('node', [captura, `file://${salida}#${t.id}`, png,
      '--ancho', String(t.an), '--alto', String(t.al),
      // Los iconos se sacan a 1x: el manifiesto declara 192 y 512, y un PNG
      // de 384 declarado como 192 son bytes que nadie usa.
      '--escala', String(t.escala ?? 2),
      '--espera', '3500',
      '--js', `(()=>{const e=document.getElementById('${t.id}');
        document.body.style.padding='0';document.body.style.background='transparent';
        [...document.body.children].forEach(n=>{if(n!==e)n.remove()});})()`,
    ], { stdio: 'inherit' });
  }
}
