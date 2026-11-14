/* widget.js — LO QUE VEN LOS WIDGETS DE LA PANTALLA DE INICIO (CARYMO como app de App Store y Play Store)
 * ===========================================================================
 * Carlos, 14 nov: «widgets para la pantalla, donde salga la mascota en su cuarto, cómo está, estadísticas,
 * la racha, como las de Duolingo».
 *
 * Un widget no corre JavaScript: es una vista nativa (WidgetKit en iPhone, App Widget en Android) que sólo
 * pinta lo que la app le deja guardado. Así que aquí se arman dos cosas y se le pasan a la parte nativa:
 *   · la FOTO: el cuarto (pared, ventana, piso y sus muebles) con la mascota parada, en PNG;
 *   · los DATOS: racha (y si ya estudiaste hoy), cómo está la mascota (sus tres barras y una frase),
 *     su nombre y nivel, XP y cubitos.
 * En la web no hace nada: sólo corre dentro de la app (Capacitor).
 * Se actualiza al abrir, cuando cambia el perfil (con freno: una vez cada 20 s como mucho) y al irse
 * la app a segundo plano, que es justo cuando el teléfono enseña la pantalla de inicio.
 * ===========================================================================*/
import { COSAS, LUGAR } from './cosas.js';
import { ESPECIES, nivelMascota, ETAPAS, etapaDe } from './crianza-datos.js';

const W = 600, H = 552;               /* el cuarto mide 1 : 0.92, igual que en la app */
const FRASE = {
  feliz: '¡Hoy me siento genial!', normal: 'Hoy quiero estudiar contigo.', hambre: 'Tengo hambre…',
  sucio: 'Necesito un baño…', triste: 'Te extraño… ¿estudiamos?', 'muy-mal': 'Me siento muy mal… ¿me cuidas?', ninguna: 'Adopta a tu compañero',
};

export const enApp = () => { try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }catch{ return false; } };

function quePasa(c){
  if(Math.min(c.hambre, c.limpieza, c.animo) < 15) return 'muy-mal';
  if(c.hambre < 35) return 'hambre';
  if(c.limpieza < 35) return 'sucio';
  if(c.animo < 35) return 'triste';
  return Math.min(c.hambre, c.limpieza, c.animo) >= 60 ? 'feliz' : 'normal';
}

/* el cuarto en SVG, con las mismas capas y colores que `.cuarto` del CSS de la app */
function cuartoSVG(muebles, mascota){
  const ventana = `<g><rect x="${W * .42}" y="${H * .09}" width="${W * .2}" height="${W * .2}" rx="12" fill="url(#cielo)" stroke="#6E3B2A" stroke-width="10"/>
    <rect x="${W * .42}" y="${H * .09}" width="${W * .2}" height="${W * .2}" rx="12" fill="none" stroke="#4A2418" stroke-width="2"/>
    <rect x="${W * .52 - 2}" y="${H * .09 + 5}" width="4" height="${W * .2 - 10}" fill="#6E3B2A"/></g>`;
  const tablas = Array.from({ length: 5 }, (_, i) => `<rect x="${i * W * .44}" y="${H * .66}" width="${W * .22}" height="${H * .34}" fill="#6E3B2A"/><rect x="${i * W * .44 + W * .22}" y="${H * .66}" width="${W * .22}" height="${H * .34}" fill="#7C4632"/>`).join('');
  const cosas = muebles.map((k) => {
    const l = LUGAR[k], w = W * l.w / 100, x = W * l.x / 100 - w / 2, y = H * l.y / 100 - w / 2;
    return `<g transform="translate(${x} ${y})"><svg width="${w}" height="${w}" viewBox="0 0 64 64">${COSAS[k].replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="pared" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A1858"/><stop offset="1" stop-color="#2A1040"/></linearGradient>
  <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E8CDB"/><stop offset="1" stop-color="#A9C8F5"/></linearGradient></defs>
  <rect width="${W}" height="${H * .66}" fill="url(#pared)"/><rect y="${H * .66 - 12}" width="${W}" height="12" fill="#4E0E22"/>
  ${tablas}${ventana}${cosas}${mascota}</svg>`;
}

/* la mascota parada, como en su cuarto: se dibuja con el motor de siempre en una caja escondida y se copia su SVG */
function mascotaSVG(crearMascota, quien){
  if(!quien || quien === 'no') return '';
  const caja = document.createElement('div');
  caja.style.cssText = 'position:fixed;left:-9999px;top:0;width:240px;height:240px;pointer-events:none';
  document.body.append(caja);
  let svg = '';
  try{
    const m = crearMascota(caja, { personaje: quien, tam: 240 });
    const s = caja.querySelector('svg');
    if(s){
      const c = s.cloneNode(true);
      /* lo que la animación esconde con CSS (globos, efectos) no va en la foto */
      c.querySelectorAll('.masc-fx, .masc-globo').forEach((e) => e.remove());
      const vb = (c.getAttribute('viewBox') || '0 0 200 200').split(/\s+/).map(Number);
      const alto = H * .52, ancho = alto * vb[2] / vb[3];
      c.setAttribute('x', String(W / 2 - ancho / 2)); c.setAttribute('y', String(H * .94 - alto));
      c.setAttribute('width', String(ancho)); c.setAttribute('height', String(alto));
      svg = new XMLSerializer().serializeToString(c);
    }
    m && m.destruir && m.destruir();
  }catch{}
  caja.remove();
  return svg;
}

async function aPNG(svgTexto){
  const url = URL.createObjectURL(new Blob([svgTexto], { type: 'image/svg+xml' }));
  try{
    const img = new Image(); img.decoding = 'sync'; img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
    return c.toDataURL('image/png').split(',')[1];
  }finally{ URL.revokeObjectURL(url); }
}

/* lo que se le pasa a la parte nativa (también sirve para probarlo en la web: `__widget.datos()`) */
export function datosWidget(h){
  const p = h.perfil() || {}, quien = h.activa(), hoy = h.hoy();
  const c = p.cuidado || { hambre: 80, limpieza: 90, animo: 80 };
  const m = (p.mascotas || {})[quien] || null;
  const sin = !quien || quien === 'no';
  const estado = sin ? 'ninguna' : quePasa(c);
  const nivel = m ? nivelMascota(m.xp || 0) : 1;
  return {
    racha: p.racha || 0, rachaViva: p.ultimoDia === hoy, mejorRacha: p.mejorRacha || 0, congeladas: p.congeladas || 0,
    xp: p.xp || 0, cubos: p.infinito ? -1 : (p.cubos ?? 0),
    mascota: sin ? '' : (m && m.nombre) || (ESPECIES[quien] && ESPECIES[quien].nombre) || 'Tu mascota',
    especie: sin ? '' : quien, nivel, etapa: sin ? '' : (ETAPAS[etapaDe(quien, nivel)] || ''),
    estado, frase: FRASE[estado],
    hambre: Math.round(c.hambre ?? 80), limpieza: Math.round(c.limpieza ?? 80), animo: Math.round(c.animo ?? 80),
    salud: Math.round(Math.max(0, Math.min(100, Math.min(c.hambre ?? 80, c.limpieza ?? 80, c.animo ?? 80)))),
    actualizado: Date.now(),
  };
}

export async function fotoWidget(h){
  const p = h.perfil() || {}, quien = h.activa();
  const muebles = ((p.cuarto && p.cuarto.puestos) || []).filter((k) => COSAS[k] && LUGAR[k]);
  return aPNG(cuartoSVG(muebles, mascotaSVG(h.crearMascota, quien)));
}

/* h: { perfil(), activa(), hoy(), crearMascota } */
export function iniciarWidget(h){
  const api = { datos: () => datosWidget(h), foto: () => fotoWidget(h), enviar };
  try{ window.__widget = api; }catch{}
  if(!enApp()) return { avisar(){}, ...api };
  const plugin = (() => { try{ return window.Capacitor.registerPlugin ? window.Capacitor.registerPlugin('CarymoWidget') : window.Capacitor.Plugins.CarymoWidget; }catch{ return null; } })();
  let ultimo = 0, espera = null, huella = '';
  async function enviar(){
    if(!plugin) return;
    const d = datosWidget(h);
    const nueva = JSON.stringify({ ...d, actualizado: 0 });
    /* la foto sólo se vuelve a sacar si cambió algo que se ve (mascota, sus barras o sus muebles) */
    const p = h.perfil() || {};
    const llaveFoto = JSON.stringify([d.especie, d.estado, (p.cuarto && p.cuarto.puestos) || [], (p.mascotas || {})[d.especie]]);
    let imagen = '';
    if(llaveFoto !== api._foto){ try{ imagen = await fotoWidget(h); api._foto = llaveFoto; }catch{} }
    if(nueva === huella && !imagen) return;
    huella = nueva; ultimo = Date.now();
    try{ await plugin.guardar({ datos: JSON.stringify(d), imagen }); }catch{}
  }
  function avisar(){
    clearTimeout(espera);
    const falta = 20000 - (Date.now() - ultimo);
    espera = setTimeout(enviar, Math.max(800, falta));
  }
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden'){ clearTimeout(espera); enviar(); } });
  setTimeout(enviar, 2500);
  return { ...api, avisar };
}
