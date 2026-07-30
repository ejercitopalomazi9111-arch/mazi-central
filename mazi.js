/* mazi.js — LA BARRA DE LA CASA
 * ---------------------------------------------------------------------------
 * Carlos: "pon el mismo estilo de la página principal en todos los apartados
 * —tipografía, color, logo— y un botón que me permita volver atrás desde el
 * proyecto o apartado en el que esté".
 *
 * Se incluye con UNA línea en cualquier página del repo:
 *     <script src="../mazi.js" defer></script>
 *
 * POR QUÉ UNA PÍLDORA FLOTANTE Y NO UNA BARRA COMPLETA:
 * varios apartados son juegos a pantalla completa (Pacto Roto, Romero, INKWELL,
 * Torre). Una barra fija arriba les come 52 px del lienzo y les rompe el
 * acomodo. Una píldora abajo a la izquierda no estorba, no empuja nada, y
 * respeta el área segura del iPhone. El estilo de la casa entra por la píldora
 * —la paloma, el violeta medido y la tipografía Mazi— sin repintar el proyecto.
 *
 * NO toca los estilos de la página anfitriona: todo vive dentro de un
 * shadow DOM, así que ni el CSS del juego le pega a la barra ni al revés.
 */
(() => {
  if (window.__maziBarra) return;
  window.__maziBarra = true;

  // La raíz del sitio, sin importar qué tan hondo esté la página.
  // /mazi-central/romero/  →  /mazi-central/
  const partes = location.pathname.split('/').filter(Boolean);
  const i = partes.indexOf('mazi-central');
  const RAIZ = i >= 0 ? '/' + partes.slice(0, i + 1).join('/') + '/' : '/';

  // En la portada no se pone: ahí no hay a dónde volver.
  const enPortada = location.pathname.replace(/index\.html$/, '') === RAIZ;
  if (enPortada) return;

  const caja = document.createElement('div');
  caja.id = 'mazi-barra';
  const raiz = caja.attachShadow({ mode: 'open' });

  raiz.innerHTML = `
    <style>
      @font-face {
        font-family:"Mazi";
        src:url("${RAIZ}sitio/fuente/mazi.woff2") format("woff2");
        font-display:swap;
      }
      :host { all:initial; }
      .barra {
        position:fixed; z-index:2147483000;
        left:max(12px, env(safe-area-inset-left));
        bottom:calc(12px + env(safe-area-inset-bottom));
        display:flex; align-items:stretch; gap:1px;
        border-radius:24px; overflow:hidden;
        background:#1E1428ee; border:1px solid #3A2A4C;
        box-shadow:0 6px 26px #00000066, 0 0 22px #AC27FF22;
        backdrop-filter:blur(9px); -webkit-backdrop-filter:blur(9px);
        font-family:"Mazi", system-ui, sans-serif;
      }
      a, button {
        all:unset; box-sizing:border-box; cursor:pointer;
        display:flex; align-items:center; justify-content:center; gap:7px;
        min-height:44px; padding:0 15px;
        color:#E9E4E4; font-family:inherit; font-size:14px; line-height:1;
      }
      a:active, button:active { background:#271B34; }
      .atras { padding-right:13px; }
      .flecha { font-size:17px; color:#AC27FF; }
      .casa { border-left:1px solid #3A2A4C; padding:0 14px; }
      .casa img { width:26px; height:auto; display:block;
        filter:drop-shadow(0 0 7px #AC27FF66); }
      .txt { padding-top:2px; }
      @media (max-width:380px) { .txt { display:none } .atras { padding:0 12px } }
      @media (prefers-reduced-motion: reduce) { * { transition:none!important } }
    </style>
    <nav class="barra" aria-label="Navegación de Grupo Mazi">
      <button class="atras" title="Volver atrás">
        <span class="flecha">‹</span><span class="txt">ATRÁS</span>
      </button>
      <a class="casa" href="${RAIZ}" title="Central de Grupo Mazi">
        <img src="${RAIZ}marca/logo/paloma-simple.svg" alt="Grupo Mazi">
      </a>
    </nav>`;

  // "Atrás" de verdad: si hay historia dentro del sitio, se retrocede; si
  // alguien llegó directo por un enlace compartido, no hay a dónde volver y
  // entonces lleva a la central. Un botón de atrás que deja al visitante en
  // Google es peor que no tenerlo.
  raiz.querySelector('.atras').onclick = () => {
    if (history.length > 1 && document.referrer.includes(location.host)) history.back();
    else location.href = RAIZ;
  };

  const poner = () => document.body && document.body.appendChild(caja);
  if (document.body) poner();
  else addEventListener('DOMContentLoaded', poner);
})();
