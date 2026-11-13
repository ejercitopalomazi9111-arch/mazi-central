/* cosas.js — LO QUE SE COMPRA CON PALOMIUM, DIBUJADO CON LA MISMA ESTÉTICA DE LAS MASCOTAS
 * Carlos, 13 nov: «salitas, comidita, cosas para bañarlo, como un tipo Pou». Cada cosa es un SVG chico,
 * con su luz arriba, su sombra y un contorno suave, igual que el tigre y la paloma (mascota.js).
 * El cubito de palomium es el cubo de la marca: techo morado claro (#AC27FF), un lado vino y otro morado oscuro.
 * viewBox 0 0 64 64 en todos. */

const s = (cuerpo, vb = '0 0 64 64') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${cuerpo}</svg>`;
const piso = '<ellipse cx="32" cy="58" rx="20" ry="3.4" fill="#140A22" opacity=".25"/>';

export const CUBO = s(`<path d="M32 6 L56 19 L32 32 L8 19 Z" fill="#AC27FF"/><path d="M8 19 L32 32 L32 60 L8 46 Z" fill="#7E1735"/><path d="M56 19 L32 32 L32 60 L56 46 Z" fill="#3A1858"/>
  <path d="M32 6 L56 19 L32 32 L8 19 Z" fill="none" stroke="#D59BFF" stroke-width="1.6" stroke-linejoin="round"/><path d="M20 15 L32 9 L40 13" stroke="#F1DDFF" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".8"/>
  <path d="M32 32 V60" stroke="#C25A86" stroke-width="1.2" opacity=".6"/>`);

export const COSAS = {
  congelador: s(`${piso}<path d="M32 8 L52 19 V43 L32 54 L12 43 V19 Z" fill="#BDE6FF" stroke="#5AB6F0" stroke-width="2" stroke-linejoin="round"/><path d="M12 19 L32 30 L52 19" stroke="#5AB6F0" stroke-width="2" fill="none"/><path d="M32 30 V54" stroke="#5AB6F0" stroke-width="2"/>
    <path d="M18 22 L24 25 M20 31 L26 34" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/><path d="M41 36 l3 -5 l3 5 l-3 5 z" fill="#FFFFFF" opacity=".9"/>`),
  manzana: s(`${piso}<path d="M32 18 C 22 12 10 18 11 32 C 12 46 22 56 32 52 C 42 56 52 46 53 32 C 54 18 42 12 32 18 Z" fill="#F0485E" stroke="#C42A42" stroke-width="2"/>
    <path d="M32 18 C 32 12 34 8 37 6" stroke="#7A4A26" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M35 12 C 40 6 48 7 50 10 C 45 14 39 14 35 12 Z" fill="#5CC46B"/><ellipse cx="21" cy="28" rx="4" ry="6" fill="#FFB3BF" opacity=".8"/>`),
  galleta: s(`${piso}<circle cx="32" cy="32" r="22" fill="#E7A65A" stroke="#BF7A33" stroke-width="2"/><circle cx="32" cy="32" r="18" fill="#F1BA74"/>
    <circle cx="24" cy="25" r="3.4" fill="#5A3417"/><circle cx="38" cy="22" r="3" fill="#5A3417"/><circle cx="40" cy="36" r="3.6" fill="#5A3417"/><circle cx="26" cy="40" r="3" fill="#5A3417"/><circle cx="33" cy="31" r="2.2" fill="#5A3417"/><path d="M18 24 q4 -8 12 -9" stroke="#FFE0B0" stroke-width="2.4" stroke-linecap="round" fill="none"/>`),
  sandwich: s(`${piso}<path d="M8 30 L32 12 L56 30 Z" fill="#F6D18B" stroke="#C99A47" stroke-width="2" stroke-linejoin="round"/><path d="M8 31 h48 v4 h-48 z" fill="#5CC46B"/><path d="M8 35 h48 v5 h-48 z" fill="#F58A6A"/><path d="M8 40 h48 v4 h-48 z" fill="#FFD23F"/>
    <path d="M8 44 h48 v6 c0 3 -2 5 -5 5 h-38 c-3 0 -5 -2 -5 -5 z" fill="#F6D18B" stroke="#C99A47" stroke-width="2"/><path d="M18 24 L30 16" stroke="#FFF1CF" stroke-width="2.4" stroke-linecap="round"/>`),
  sopa: s(`${piso}<path d="M8 30 h48 c0 14 -10 24 -24 24 s-24 -10 -24 -24 z" fill="#7E1735" stroke="#5A0F25" stroke-width="2"/><ellipse cx="32" cy="30" rx="24" ry="6" fill="#F2A33A"/><ellipse cx="32" cy="30" rx="20" ry="4" fill="#F7BE5E"/>
    <circle cx="24" cy="29" r="2" fill="#5CC46B"/><circle cx="36" cy="31" r="2.2" fill="#F05A4A"/><circle cx="41" cy="28" r="1.6" fill="#5CC46B"/><path d="M22 20 q-3 -4 0 -8 M32 18 q-3 -4 0 -8 M42 20 q-3 -4 0 -8" stroke="#E6DCF5" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".8"/>
    <path d="M14 38 q4 8 12 11" stroke="#B0365A" stroke-width="2.4" stroke-linecap="round" fill="none"/>`),
  pastel: s(`${piso}<path d="M12 30 h40 v20 c0 3 -2 4 -5 4 h-30 c-3 0 -5 -1 -5 -4 z" fill="#F7D6E3" stroke="#D88AA8" stroke-width="2"/><path d="M12 30 c4 6 8 6 10 0 c2 6 8 6 10 0 c2 6 8 6 10 0 c2 6 8 6 10 0 v-4 h-40 z" fill="#AC27FF"/>
    <path d="M12 42 h40" stroke="#D88AA8" stroke-width="2"/><rect x="30" y="12" width="4" height="14" rx="1.5" fill="#FFD23F" stroke="#E2A100" stroke-width="1"/><path d="M32 6 c3 3 3 6 0 7 c-3 -1 -3 -4 0 -7 z" fill="#FF8A3D"/><circle cx="22" cy="36" r="1.6" fill="#fff"/><circle cx="42" cy="38" r="1.6" fill="#fff"/>`),
  jabon: s(`${piso}<rect x="12" y="28" width="40" height="24" rx="9" fill="#A9E4FF" stroke="#5AB6F0" stroke-width="2"/><path d="M18 34 h20" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <circle cx="22" cy="18" r="7" fill="#E6F7FF" stroke="#9AD8F8" stroke-width="1.6" opacity=".95"/><circle cx="38" cy="14" r="5" fill="#E6F7FF" stroke="#9AD8F8" stroke-width="1.6"/><circle cx="46" cy="24" r="4" fill="#E6F7FF" stroke="#9AD8F8" stroke-width="1.6"/><circle cx="20" cy="16" r="2" fill="#fff"/>`),
  pelota: s(`${piso}<circle cx="32" cy="32" r="22" fill="#FFD23F" stroke="#E2A100" stroke-width="2"/><path d="M10 32 C 20 26 44 26 54 32" stroke="#F0485E" stroke-width="6" fill="none"/><path d="M32 10 C 26 20 26 44 32 54" stroke="#7E1735" stroke-width="5" fill="none"/>
    <ellipse cx="23" cy="21" rx="5" ry="3.4" fill="#FFF3B8" opacity=".9" transform="rotate(-30 23 21)"/>`),
  tapete: s(`<ellipse cx="32" cy="40" rx="28" ry="12" fill="#7E1735" stroke="#5A0F25" stroke-width="2"/><ellipse cx="32" cy="40" rx="21" ry="8" fill="none" stroke="#C25A86" stroke-width="2.4" stroke-dasharray="5 4"/><ellipse cx="32" cy="40" rx="11" ry="4" fill="#AC27FF" opacity=".75"/>`),
  planta: s(`${piso}<path d="M20 40 h24 l-3 16 h-18 z" fill="#C46A3A" stroke="#93461F" stroke-width="2" stroke-linejoin="round"/><path d="M19 40 h26" stroke="#93461F" stroke-width="3" stroke-linecap="round"/>
    <path d="M32 40 C 30 30 22 24 14 24 C 18 32 24 38 32 40 Z" fill="#4DB860"/><path d="M32 40 C 34 28 42 20 52 20 C 48 30 40 38 32 40 Z" fill="#5CC46B"/><path d="M32 40 C 30 26 32 14 36 8 C 40 18 38 30 32 40 Z" fill="#3FA552"/>`),
  lampara: s(`${piso}<path d="M22 10 h20 l8 18 h-36 z" fill="#FFD9A0" stroke="#E2A100" stroke-width="2" stroke-linejoin="round"/><path d="M32 28 v22" stroke="#7E5A3A" stroke-width="3"/><path d="M22 54 h20" stroke="#7E5A3A" stroke-width="4" stroke-linecap="round"/>
    <path d="M18 32 C 22 40 42 40 46 32" fill="#FFF3B8" opacity=".45"/><path d="M26 14 h6" stroke="#FFF1CF" stroke-width="2.4" stroke-linecap="round"/>`),
  cuadro: s(`<rect x="8" y="10" width="48" height="40" rx="3" fill="#C99A47" stroke="#93682A" stroke-width="2"/><rect x="13" y="15" width="38" height="30" fill="#AFD8FF"/><path d="M13 45 L26 30 L34 38 L40 32 L51 45 Z" fill="#5CC46B"/><circle cx="42" cy="22" r="4" fill="#FFD23F"/>`),
  cama: s(`${piso}<rect x="6" y="20" width="10" height="34" rx="3" fill="#8E5A9E" stroke="#5E3470" stroke-width="2"/><rect x="10" y="34" width="48" height="16" rx="4" fill="#AC27FF" stroke="#7A1DB8" stroke-width="2"/>
    <rect x="16" y="28" width="16" height="9" rx="4.5" fill="#FFFFFF" stroke="#D2C7E6" stroke-width="1.6"/><path d="M30 34 h28 v8 h-28 z" fill="#C77DFF" opacity=".8"/><path d="M12 54 v4 M54 50 v8" stroke="#5E3470" stroke-width="4" stroke-linecap="round"/>`),
  librero: s(`${piso}<rect x="12" y="6" width="40" height="50" rx="3" fill="#A86B3C" stroke="#7A4A26" stroke-width="2"/><path d="M14 22 h36 M14 38 h36" stroke="#7A4A26" stroke-width="2.4"/>
    <rect x="17" y="10" width="5" height="11" fill="#F0485E"/><rect x="23" y="12" width="4" height="9" fill="#5AB6F0"/><rect x="28" y="9" width="6" height="12" fill="#FFD23F"/><rect x="38" y="13" width="9" height="8" rx="2" fill="#5CC46B"/>
    <rect x="17" y="26" width="6" height="11" fill="#AC27FF"/><rect x="24" y="28" width="4" height="9" fill="#F58A6A"/><rect x="34" y="25" width="5" height="12" fill="#7E1735"/><rect x="40" y="27" width="6" height="10" fill="#5AB6F0"/>
    <rect x="18" y="43" width="12" height="9" rx="2" fill="#E6DCF5"/><rect x="36" y="41" width="5" height="11" fill="#FFD23F"/>`),
  sillon: s(`${piso}<rect x="10" y="22" width="44" height="18" rx="7" fill="#7E1735" stroke="#5A0F25" stroke-width="2"/><rect x="6" y="32" width="12" height="20" rx="5" fill="#9A1F43" stroke="#5A0F25" stroke-width="2"/><rect x="46" y="32" width="12" height="20" rx="5" fill="#9A1F43" stroke="#5A0F25" stroke-width="2"/>
    <rect x="16" y="38" width="32" height="14" rx="4" fill="#B0365A" stroke="#5A0F25" stroke-width="2"/><path d="M16 26 h20" stroke="#C25A86" stroke-width="2.6" stroke-linecap="round" opacity=".8"/><path d="M12 52 v4 M52 52 v4" stroke="#3A0A18" stroke-width="3" stroke-linecap="round"/>`),
};
/* dónde va cada mueble en el cuarto (en % del cuarto) y qué tan grande */
export const LUGAR = {
  cuadro: { x: 18, y: 14, w: 22 }, lampara: { x: 86, y: 40, w: 15 }, planta: { x: 10, y: 52, w: 17 }, librero: { x: 74, y: 22, w: 22 },
  cama: { x: 22, y: 66, w: 30 }, sillon: { x: 78, y: 66, w: 30 }, tapete: { x: 50, y: 86, w: 46 },
};
