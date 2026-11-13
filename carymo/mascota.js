/* mascota.js — EL TIGRE BLANCO Y LA PALOMA MORADA, DIBUJADOS Y ARTICULADOS
 * ===========================================================================
 * Carlos, 13 nov: «no quiero mascotas si sus animaciones no son como las de
 * Duolingo; para eso dibújalas tú y anímalas, súper detallista con sombras,
 * ojos, espacios». Y antes: «0 margen de error con los fondos». Por eso aquí no
 * hay ni una imagen recortada: cada personaje es un SVG por piezas (cuerpo,
 * cabeza, orejas, ojos con brillo, párpados, cejas, nariz, boca que se deforma,
 * brazos o alas, patas, cola) y un motor que mueve cada pieza por separado.
 * Están inspirados en las hojas que mandó Carlos (tigre blanco de rayas moradas
 * con orejas lila; paloma morada de panza lila, pico y patas naranjas).
 *
 *   const m = crearMascota(caja, { personaje: 'tigre', tam: 120 });
 *   m.play('bien')                       // reacciona a algo de la app
 *   m.play('festeja', { decir: '¡Eso!' })
 *   m.personaje('paloma')
 *
 * Cómo se mueve, como en Duolingo:
 *   · siempre respira, parpadea a destiempo, mueve orejas/cola/plumas y mira a
 *     su alrededor; si hay un dedo o un ratón cerca, LO SIGUE con los ojos;
 *   · cada reacción tiene anticipación, acción y asentamiento (aplasta y estira),
 *     la boca cambia de forma de verdad (no se cambia un dibujo por otro) y las
 *     cejas, los párpados y los cachetes acompañan;
 *   · todo se mezcla suave: una reacción entra y sale sin brincos.
 * ===========================================================================*/

import { ZOO } from './zoo.js';   /* la paloma mejorada y los animales nuevos (Luna, 13 nov) */
import { CABEZAS, svgAccesorio, svgCuello, DEL_CUELLO, svgHuevo } from './mascota-ropa.js';
import { SKINS } from './crianza-datos.js';
import { taparia, decirEnMuelle } from './muelle.js';
const NS = 'http://www.w3.org/2000/svg';
const lerp = (a, b, k) => a + (b - a) * k;
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (k) => k * k * (3 - 2 * k);
const salida = (k) => 1 - Math.pow(1 - k, 3);
const rebote = (k) => { const c = 1.70158 * 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const onda = (t, per, fase = 0) => Math.sin((t / per + fase) * Math.PI * 2);
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const r = (a, b) => a + Math.random() * (b - a);
let uid = 0;

/* ── los dibujos ─────────────────────────────────────────────────────────────
   viewBox 0 0 200 220; los pies tocan y = 206. Cada pieza móvil es un <g> con
   data-p; el motor le pone su transform alrededor de su pivote (PIVOTE). */
const TINTA_T = '#2C2350', CONTORNO_T = '#D2C7E6';
function svgTigre(id){
  return `<svg viewBox="0 0 200 220" xmlns="${NS}" aria-hidden="true" overflow="visible">
  <defs>
    <radialGradient id="${id}cu" cx="42%" cy="35%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".72" stop-color="#F7F4FC"/><stop offset="1" stop-color="#E4DCF1"/></radialGradient>
    <radialGradient id="${id}ca" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F8F5FD"/><stop offset="1" stop-color="#E2D9F0"/></radialGradient>
    <radialGradient id="${id}ojo" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#2B2048"/><stop offset=".75" stop-color="#231A3D"/><stop offset="1" stop-color="#4A3482"/></radialGradient>
    <radialGradient id="${id}so" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#140A22" stop-opacity=".34"/><stop offset="1" stop-color="#140A22" stop-opacity="0"/></radialGradient>
    <clipPath id="${id}bc"><path data-boca-clip/></clipPath>
  </defs>
  <ellipse data-p="sombra" cx="100" cy="207" rx="50" ry="8" fill="url(#${id}so)"/>
  <g data-p="raiz">
    <g data-p="cola">
      <path d="M128 186 C 158 190 176 170 172 146 C 170 132 160 126 152 130" fill="none" stroke="${CONTORNO_T}" stroke-width="17" stroke-linecap="round"/>
      <path d="M128 186 C 158 190 176 170 172 146 C 170 132 160 126 152 130" fill="none" stroke="#FFFFFF" stroke-width="12.5" stroke-linecap="round"/>
      <path d="M128 186 C 158 190 176 170 172 146 C 170 132 160 126 152 130" fill="none" stroke="${TINTA_T}" stroke-width="12.6" stroke-dasharray="5 11" stroke-dashoffset="-8"/>
      <circle cx="152.5" cy="130.5" r="6.4" fill="${TINTA_T}"/>
    </g>
    <g data-p="pataI"><ellipse cx="81" cy="197" rx="16" ry="11" fill="url(#${id}cu)" stroke="${CONTORNO_T}" stroke-width="2.4"/><path d="M75 203 v-4 M81 204 v-4.5 M87 203 v-4" stroke="#CFC3E3" stroke-width="1.8" stroke-linecap="round"/><path d="M68 191 q6 2 9 6" stroke="${TINTA_T}" stroke-width="3.6" stroke-linecap="round" fill="none"/></g>
    <g data-p="pataD"><ellipse cx="119" cy="197" rx="16" ry="11" fill="url(#${id}cu)" stroke="${CONTORNO_T}" stroke-width="2.4"/><path d="M113 203 v-4 M119 204 v-4.5 M125 203 v-4" stroke="#CFC3E3" stroke-width="1.8" stroke-linecap="round"/><path d="M132 191 q-6 2 -9 6" stroke="${TINTA_T}" stroke-width="3.6" stroke-linecap="round" fill="none"/></g>
    <g data-p="cuerpo">
      <path d="M100 116 C 133 116 143 148 141 174 C 139 196 123 204 100 204 C 77 204 61 196 59 174 C 57 148 67 116 100 116 Z" fill="url(#${id}cu)" stroke="${CONTORNO_T}" stroke-width="2.5"/>
      <ellipse cx="100" cy="172" rx="25" ry="27" fill="#EEE8F7"/>
      <ellipse cx="96" cy="164" rx="12" ry="13" fill="#F8F5FC" opacity=".9"/>
      <ellipse cx="100" cy="131" rx="38" ry="10" fill="#7E6AA8" opacity=".16"/>
      <path d="M70 140 q-6 20 -2 38 q4 -18 10 -36 z M130 140 q6 20 2 38 q-4 -18 -10 -36 z" fill="#8E7BB5" opacity=".14"/>
      <path d="M60 152 q10 1 17 8 q-10 1 -17 -3 z M59.5 170 q9 0 15 6 q-9 1 -15 -2 z M140 152 q-10 1 -17 8 q10 1 17 -3 z M140.5 170 q-9 0 -15 6 q9 1 15 -2 z" fill="${TINTA_T}"/>
    </g>
    <g data-p="cabeza">
      <g data-p="orejaI"><circle cx="61" cy="58" r="20" fill="url(#${id}ca)" stroke="${CONTORNO_T}" stroke-width="2.5"/><circle cx="62" cy="60.5" r="11.5" fill="#C9A7F3"/><circle cx="64" cy="63" r="6" fill="#B58BEB" opacity=".55"/><path d="M44 50 a20 20 0 0 1 26 -10" stroke="${TINTA_T}" stroke-width="5" stroke-linecap="round" fill="none"/></g>
      <g data-p="orejaD"><circle cx="139" cy="58" r="20" fill="url(#${id}ca)" stroke="${CONTORNO_T}" stroke-width="2.5"/><circle cx="138" cy="60.5" r="11.5" fill="#C9A7F3"/><circle cx="136" cy="63" r="6" fill="#B58BEB" opacity=".55"/><path d="M156 50 a20 20 0 0 0 -26 -10" stroke="${TINTA_T}" stroke-width="5" stroke-linecap="round" fill="none"/></g>
      <path d="M100 42 C 142 42 162 66 162 93 C 162 120 138 134 100 134 C 62 134 38 120 38 93 C 38 66 58 42 100 42 Z" fill="url(#${id}ca)" stroke="${CONTORNO_T}" stroke-width="2.5"/>
      <path d="M38 98 l-6 4 l7 2 l-4 5 l8 -1" fill="#FFFFFF" stroke="${CONTORNO_T}" stroke-width="2" stroke-linejoin="round"/><path d="M162 98 l6 4 l-7 2 l4 5 l-8 -1" fill="#FFFFFF" stroke="${CONTORNO_T}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M100 44 q-4 9 0 19 q4 -10 0 -19 z M86 47 q-1 8 5 14 q0 -9 -5 -14 z M114 47 q1 8 -5 14 q0 -9 5 -14 z" fill="${TINTA_T}"/>
      <path d="M38.5 80 q11 1 18 7 q-10 2 -18 -2 z M39 95 q9 -1 15 3 q-8 3 -15 1 z M161.5 80 q-11 1 -18 7 q10 2 18 -2 z M161 95 q-9 -1 -15 3 q8 3 15 1 z" fill="${TINTA_T}"/>
      <ellipse cx="100" cy="110" rx="23" ry="15" fill="#FFFFFF"/>
      <ellipse data-p="cacheteI" cx="64" cy="109" rx="9.5" ry="5.2" fill="#FF97BE" opacity=".42"/>
      <ellipse data-p="cacheteD" cx="136" cy="109" rx="9.5" ry="5.2" fill="#FF97BE" opacity=".42"/>
      ${ojos(id, 78, 89, 122, 89, 'tigre')}
      <path d="M93.5 100 Q100 96.5 106.5 100 Q104 106.5 100 108 Q96 106.5 93.5 100 Z" fill="${TINTA_T}"/><ellipse cx="98" cy="100.6" rx="2.2" ry="1.1" fill="#fff" opacity=".7"/>
      <path data-boca fill="#5B1F3A" stroke="${TINTA_T}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
      <g clip-path="url(#${id}bc)"><ellipse data-lengua cx="100" cy="128" rx="10" ry="7" fill="#F27893"/></g>
    </g>
    <g data-p="brazoI">
      <path d="M76 132 C 64 138 58 160 62 176 C 64 184 74 184 78 178 C 82 164 86 146 84 136 Z" fill="url(#${id}cu)" stroke="${CONTORNO_T}" stroke-width="2.4"/>
      <path d="M62 156 q7 1 12 5 M63 166 q6 0 10 3" stroke="${TINTA_T}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      <ellipse cx="70" cy="178" rx="5.2" ry="3.6" fill="#D9C2F4"/>
    </g>
    <g data-p="brazoD">
      <path d="M124 132 C 136 138 142 160 138 176 C 136 184 126 184 122 178 C 118 164 114 146 116 136 Z" fill="url(#${id}cu)" stroke="${CONTORNO_T}" stroke-width="2.4"/>
      <path d="M138 156 q-7 1 -12 5 M137 166 q-6 0 -10 3" stroke="${TINTA_T}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      <ellipse cx="130" cy="178" rx="5.2" ry="3.6" fill="#D9C2F4"/>
    </g>
  </g>
  </svg>`;
}
const TINTA_P = '#2A1A4A';
function svgPaloma(id){
  return `<svg viewBox="0 0 200 220" xmlns="${NS}" aria-hidden="true" overflow="visible">
  <defs>
    <radialGradient id="${id}cu" cx="38%" cy="28%" r="78%"><stop offset="0" stop-color="#8A64D9"/><stop offset=".45" stop-color="#6744B6"/><stop offset="1" stop-color="#47288C"/></radialGradient>
    <radialGradient id="${id}pa" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#C4B4F0"/><stop offset="1" stop-color="#9A84D8"/></radialGradient>
    <linearGradient id="${id}al" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A38A6"/><stop offset="1" stop-color="#3E2380"/></linearGradient>
    <radialGradient id="${id}ojo" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#2A1C45"/><stop offset=".75" stop-color="#1E1434"/><stop offset="1" stop-color="#4A3482"/></radialGradient>
    <radialGradient id="${id}so" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#140A22" stop-opacity=".34"/><stop offset="1" stop-color="#140A22" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse data-p="sombra" cx="100" cy="207" rx="48" ry="8" fill="url(#${id}so)"/>
  <g data-p="raiz">
    <g data-p="pataI"><path d="M88 190 v13 M88 203 l-8 3 M88 203 l1 4 M88 203 l8 2" stroke="#F2A126" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M88 192 v9" stroke="#FFC155" stroke-width="2" stroke-linecap="round"/></g>
    <g data-p="pataD"><path d="M112 190 v13 M112 203 l-8 2 M112 203 l-1 4 M112 203 l8 3" stroke="#F2A126" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M112 192 v9" stroke="#FFC155" stroke-width="2" stroke-linecap="round"/></g>
    <g data-p="cola"><path d="M118 186 q22 6 30 -2 q-6 10 -26 10 z M116 190 q20 10 30 4 q-8 9 -28 2 z" fill="#3E2380"/></g>
    <g data-p="cuerpo">
      <path d="M100 38 C 142 38 154 80 154 122 C 154 172 132 198 100 198 C 68 198 46 172 46 122 C 46 80 58 38 100 38 Z" fill="url(#${id}cu)"/>
      <path d="M62 70 C 70 52 86 44 100 44" stroke="#9C7BE6" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55"/>
      <ellipse cx="100" cy="158" rx="35" ry="38" fill="url(#${id}pa)"/>
      <path d="M84 150 q4 4 8 0 M100 160 q4 4 8 0 M88 172 q4 4 8 0 M106 140 q4 4 8 0" stroke="#8C74CF" stroke-width="2" stroke-linecap="round" fill="none" opacity=".7"/>
    </g>
    <g data-p="cabeza">
      <g data-p="copete"><path d="M96 40 C 92 28 98 20 106 22 C 100 26 100 32 104 38 Z" fill="#5A38A6"/><path d="M104 40 C 104 30 112 26 118 30 C 111 31 108 35 109 41 Z" fill="#4C2E98"/></g>
      ${ojos(id, 81, 90, 119, 90, 'paloma')}
      <ellipse data-p="cacheteI" cx="64" cy="112" rx="9" ry="5" fill="#FF97BE" opacity=".32"/>
      <ellipse data-p="cacheteD" cx="136" cy="112" rx="9" ry="5" fill="#FF97BE" opacity=".32"/>
      <g data-p="picoAbajo"><path d="M91 113 Q100 128 109 113 Q100 118 91 113 Z" fill="#E0870F"/></g>
      <path d="M88 111 Q100 99 112 111 Q106 119 100 120 Q94 119 88 111 Z" fill="#F7AE2C"/><path d="M93 107 Q99 103 105 106" stroke="#FFD27A" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    </g>
    <g data-p="brazoI"><path d="M54 104 C 38 116 34 146 42 168 C 46 176 56 172 58 162 C 62 144 64 122 62 108 Z" fill="url(#${id}al)"/><path d="M46 138 q5 8 10 10 M44 152 q5 6 10 8" stroke="#6F4CC0" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>
    <g data-p="brazoD"><path d="M146 104 C 162 116 166 146 158 168 C 154 176 144 172 142 162 C 138 144 136 122 138 108 Z" fill="url(#${id}al)"/><path d="M154 138 q-5 8 -10 10 M156 152 q-5 6 -10 8" stroke="#6F4CC0" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>
  </g>
  </svg>`;
}
/* los ojos: los del tigre son grandes y oscuros con brillo; los de la paloma, blancos con pupila.
   Cada ojo trae: la parte que mira (data-mira), el párpado (data-parpado), el ojo feliz «^» y la ceja. */
function ojos(id, xi, yi, xd, yd, quien){
  const uno = (lado, x, y) => {
    const cy = y - (quien === 'paloma' ? 4 : 0);
    const ceja = `<path data-p="ceja${lado}" d="M${x - 9} ${cy - 20} Q${x} ${cy - 25} ${x + 9} ${cy - 20}" stroke="${quien === 'tigre' ? TINTA_T : '#24123F'}" stroke-width="3.6" stroke-linecap="round" fill="none" opacity="0"/>`;
    const feliz = `<path data-p="feliz${lado}" d="M${x - 9} ${y + 2} Q${x} ${y - 10} ${x + 9} ${y + 2}" stroke="${quien === 'tigre' ? '#231A3D' : '#1E1434'}" stroke-width="4.2" stroke-linecap="round" fill="none" opacity="0"/>`;
    if(quien === 'tigre') return `<g data-p="ojo${lado}"><g data-mira><ellipse cx="${x}" cy="${y}" rx="10" ry="13" fill="url(#${id}ojo)"/><circle data-brillo cx="${x - 3.4}" cy="${y - 5}" r="3.8" fill="#fff"/><circle data-brillo2 cx="${x + 3.2}" cy="${y + 4}" r="1.7" fill="#fff" opacity=".9"/></g>
      <rect data-parpado x="${x - 12}" y="${y - 16}" width="24" height="0" rx="4" fill="#F9F6FD"/><path data-pestana d="M${x - 10} ${y} Q${x} ${y + 4} ${x + 10} ${y}" stroke="#231A3D" stroke-width="3.2" stroke-linecap="round" fill="none" opacity="0"/></g>${feliz}${ceja}`;
    return `<g data-p="ojo${lado}"><ellipse cx="${x}" cy="${y}" rx="14" ry="16" fill="#FFFFFF"/><ellipse cx="${x}" cy="${y + 3}" rx="14" ry="13" fill="#EDE6FB" opacity=".5"/>
      <g data-mira><ellipse cx="${x}" cy="${y + 1}" rx="8" ry="9.6" fill="url(#${id}ojo)"/><circle data-brillo cx="${x - 2.6}" cy="${y - 3}" r="3.2" fill="#fff"/><circle data-brillo2 cx="${x + 2.6}" cy="${y + 4}" r="1.4" fill="#fff" opacity=".9"/></g>
      <rect data-parpado x="${x - 16}" y="${y - 18}" width="32" height="0" rx="5" fill="#6A47B9"/><path data-pestana d="M${x - 13} ${y} Q${x} ${y + 5} ${x + 13} ${y}" stroke="#24123F" stroke-width="3.2" stroke-linecap="round" fill="none" opacity="0"/></g>${feliz}${ceja}`;
  };
  const lagrima = (lado, x, y) => `<g data-p="lagrima${lado}" opacity="0"><path d="M${x + (lado === 'I' ? -4 : 4)} ${y + 12} c-3 5 -4.5 7.5 -4.5 10 a4.5 4.5 0 0 0 9 0 c0 -2.5 -1.5 -5 -4.5 -10 z" fill="#8ED2FF" stroke="#4FA8E6" stroke-width="1.2"/><ellipse cx="${x + (lado === 'I' ? -5.5 : 2.5)}" cy="${y + 21}" rx="1.2" ry="1.8" fill="#E2F4FF"/></g>`;
  return uno('I', xi, yi) + uno('D', xd, yd) + lagrima('I', xi, yi) + lagrima('D', xd, yd);
}

/* pivotes: alrededor de qué punto gira o se aplasta cada pieza */
const PIVOTE = {
  tigre: { raiz: [100, 206], cuerpo: [100, 200], cabeza: [100, 124], orejaI: [66, 66], orejaD: [134, 66], brazoI: [78, 136], brazoD: [122, 136], cola: [128, 186], pataI: [81, 200], pataD: [119, 200], ojoI: [78, 89], ojoD: [122, 89] },
  paloma: { raiz: [100, 206], cuerpo: [100, 198], cabeza: [100, 120], copete: [102, 40], brazoI: [58, 108], brazoD: [142, 108], cola: [118, 188], pataI: [88, 196], pataD: [112, 196], ojoI: [81, 90], ojoD: [119, 90], picoAbajo: [100, 113] },
};
const OJOS = { tigre: { I: [78, 89, 13], D: [122, 89, 13] }, paloma: { I: [81, 90, 16], D: [119, 90, 16] } };

/* ── los parámetros que el motor mueve (todo en reposo = 0 o 1) ── */
const BASE = () => ({ y: 0, x: 0, sx: 1, sy: 1, giro: 0, cabezaGiro: 0, cabezaY: 0, cabezaX: 0, brazoI: 0, brazoD: 0, cola: 0, orejaI: 0, orejaD: 0,
  parpado: 0, feliz: 0, ojosGrandes: 1, miraX: 0, miraY: 0, cejas: 0, cejaAng: 0, cejaY: 0, boca: .35, curva: 1, abierta: 0, ancho: 1, cachetes: .42, picoAbre: 0, copete: 0, pataI: 0, pataD: 0, cerrados: 0, lagrimas: 0 });

/* ── las reacciones: cada una dice qué parámetros cambia en el tiempo u (0→1) ── */
const ACCIONES = {
  saluda: { dura: 1900, f(u, t, q){ const w = onda(t, 360); return { brazoD: q === 'paloma' ? -60 + w * 22 : -120 + w * 16, cabezaGiro: 6 * suave(tramo(u, 0, .2)), feliz: 0, abierta: .45, curva: 1, ancho: 1.1, cachetes: .65, y: -3 * Math.abs(onda(t, 720)), orejaD: q === 'tigre' ? 10 * onda(t, 360) : 0, picoAbre: .5 }; } },
  bien: { dura: 1400, f(u){ const ag = tramo(u, 0, .16), su = tramo(u, .16, .45), ba = tramo(u, .45, .66), as = tramo(u, .66, 1);
    const y = u < .16 ? 6 * suave(ag) : u < .45 ? lerp(6, -46, salida(su)) : u < .66 ? lerp(-46, 0, ba * ba) : 0;
    const sy = u < .16 ? 1 - .14 * suave(ag) : u < .45 ? lerp(.86, 1.1, salida(su)) : u < .66 ? lerp(1.1, 1, ba) : 1 - .12 * Math.sin(as * Math.PI) * (1 - as);
    return { y, sy, sx: 2 - sy, brazoI: u > .16 && u < .7 ? 40 : 0, brazoD: u > .16 && u < .7 ? -40 : 0, feliz: 1, abierta: .7, curva: 1.2, ancho: 1.15, cachetes: .7, orejaI: -8, orejaD: 8, picoAbre: .8 }; } },
  festeja: { dura: 2600, f(u, t){ const k = (u * 2) % 1, salto = u < .92 ? Math.sin(k * Math.PI) : 0;
    return { y: -40 * salto, sy: 1 + .1 * salto - (k < .12 || k > .88 ? .1 : 0), sx: 1 - .06 * salto, giro: (u < .5 ? 1 : -1) * 6 * salto, brazoI: 120 + 18 * onda(t, 220), brazoD: -120 - 18 * onda(t, 220, .5),
      feliz: 1, abierta: 1, curva: 1.3, ancho: 1.25, cachetes: .85, cola: 22 * onda(t, 260), orejaI: -12, orejaD: 12, picoAbre: 1, copete: 15 * onda(t, 300) }; } },
  mal: { dura: 1500, f(u, t){ const k = tramo(u, 0, .15);
    return { x: (u < .35 ? 4 * onda(t, 90) * (1 - u / .35) : 0), y: 2 * suave(k), sy: 1 - .05 * suave(k), cabezaGiro: -5 * suave(k), ojosGrandes: u < .2 ? 1.18 : 1, cejas: 1, cejaAng: 1, cejaY: 2, boca: .3, curva: -1, abierta: .25, ancho: .8, cachetes: .2, orejaI: 18, orejaD: -18, brazoI: -8, brazoD: 8, miraY: 2 }; } },
  triste: { dura: 2600, f(u){ const k = suave(tramo(u, 0, .2));
    return { y: 3 * k, sy: 1 - .05 * k, cabezaY: 5 * k, cabezaGiro: -4 * k, cejas: 1, cejaAng: 1, cejaY: 1, curva: -1.1, abierta: .1, ancho: .8, miraY: 3, orejaI: 26 * k, orejaD: -26 * k, cachetes: .15, cola: -12 * k, lagrimas: k }; } },
  enojado: { dura: 1700, f(u, t){ const k = suave(tramo(u, 0, .12));
    return { x: u < .5 ? 3 * onda(t, 70) : 0, sy: 1 - .04 * k, sx: 1 + .05 * k, cejas: 1, cejaAng: -1, cejaY: 3, curva: -.6, abierta: .35, ancho: 1.1, cachetes: .9, orejaI: -16 * k, orejaD: 16 * k, brazoI: 20, brazoD: -20, parpado: .2 }; } },
  sorpresa: { dura: 1300, f(u){ const k = tramo(u, 0, .25);
    return { y: -16 * Math.sin(k * Math.PI), sy: 1 + .1 * Math.sin(k * Math.PI), sx: 1 - .06 * Math.sin(k * Math.PI), ojosGrandes: 1.22, cejas: 1, cejaAng: 0, cejaY: -5, boca: .6, curva: 0, abierta: .9, ancho: .5, brazoI: 30, brazoD: -30, orejaI: -14, orejaD: 14, picoAbre: 1, copete: 25 }; } },
  piensa: { dura: 0, f(u, t, q){ return { cabezaGiro: 8 + 2 * onda(t, 2600), miraX: -3, miraY: -3.5, brazoD: q === 'paloma' ? -28 : -70, boca: .25, curva: .2, ancho: .6, cejas: .7, cejaAng: .3, cejaY: -1 }; } },
  amor: { dura: 2200, f(u, t){ return { giro: 5 * onda(t, 900), feliz: 1, cachetes: 1, abierta: .3, curva: 1.2, brazoI: 30, brazoD: -30, sy: 1 + .03 * onda(t, 450) }; } },
  duerme: { dura: 0, f(u, t){ const b = onda(t, 3200); return { cerrados: 1, sy: 1 + .035 * b, sx: 1 - .02 * b, cabezaY: 4, cabezaGiro: 7, boca: .2, curva: .5, abierta: .12 + .1 * (b + 1) / 2, ancho: .5, orejaI: 14, orejaD: -14, cachetes: .5 }; } },
  calma: { dura: 0, f(u, t){ return { feliz: .85, curva: 1, abierta: .05, cachetes: .55, giro: 2 * onda(t, 2400) }; } },
  estudia: { dura: 0, f(u, t){ return { miraY: 3, cabezaY: 3, cabezaGiro: -4 + 2 * onda(t, 3000), boca: .2, curva: .4, brazoI: 25, brazoD: -25, cejas: .5, cejaAng: .2 }; } },
  juega: { dura: 1500, f(u, t){ return { giro: 10 * onda(t, 500), y: -8 * Math.abs(onda(t, 500)), feliz: 1, abierta: .6, curva: 1.2, cola: 30 * onda(t, 250), brazoI: 50 * Math.max(0, onda(t, 500)), brazoD: -50 * Math.max(0, -onda(t, 500)) }; } },
  corre: { dura: 2000, f(u, t){ const p = onda(t, 260); return { x: 60 * Math.sin(u * Math.PI * 2), y: -5 * Math.abs(p), pataI: 22 * p, pataD: -22 * p, brazoI: 30 * p, brazoD: 30 * p, giro: 4 * Math.cos(u * Math.PI * 2), abierta: .5, feliz: .5, cola: 20 * p }; } },
  vuela: { dura: 2200, f(u, t){ const a = onda(t, 170); return { y: -34 * Math.sin(u * Math.PI) - 4 * a, brazoI: 70 + 50 * a, brazoD: -70 - 50 * a, feliz: .5, abierta: .4, pataI: 15, pataD: -15 }; } },
  espalda: { dura: 1200, f(u){ return { giro: -8 * Math.sin(u * Math.PI) }; } },
};
ACCIONES.quieto = { dura: 0, f: () => ({}) };
ACCIONES.sueno = ACCIONES.duerme;

/* lo que sale flotando: dibujos propios en SVG (nada recortado) */
const ICONOS = {
  estrella: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill="#FFC93C" stroke="#E2A100" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 9.5l1.6-.2" stroke="#FFF1B8" stroke-width="1.4" stroke-linecap="round"/></svg>',
  corazon: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-8-4.9-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 5.7-8 10.6-8 10.6z" fill="#FF5A8A" stroke="#E23A6E" stroke-width="1.2"/><ellipse cx="8.4" cy="9.8" rx="1.6" ry="1" fill="#FFC2D4"/></svg>',
  chispa: '<svg viewBox="0 0 24 24"><path d="M12 2c.8 5 2.6 7.2 8 8-5.4.8-7.2 3-8 8-.8-5-2.6-7.2-8-8 5.4-.8 7.2-3 8-8z" fill="#E9D6FF"/></svg>',
  gota: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4.5 5.5 7.4 5.5 10.6a5.5 5.5 0 0 1-11 0C6.5 10.4 9 7.5 12 3z" fill="#7CC8FF" stroke="#4AA6E8" stroke-width="1.1"/><ellipse cx="10" cy="13" rx="1.4" ry="2" fill="#D6EEFF"/></svg>',
  enojo: '<svg viewBox="0 0 24 24"><path d="M9 3v4.5M15 3v4.5M3 9h4.5M3 15h4.5M9 21v-4.5M15 21v-4.5M21 9h-4.5M21 15h-4.5" stroke="#FF4D5E" stroke-width="2.8" stroke-linecap="round"/></svg>',
  duda: '<svg viewBox="0 0 24 24"><path d="M8.5 8.5a3.7 3.7 0 1 1 5.4 3.3c-1.3.7-1.9 1.5-1.9 2.9v.6" stroke="#9B6CFF" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="12" cy="19.6" r="1.8" fill="#9B6CFF"/></svg>',
  alerta: '<svg viewBox="0 0 24 24"><path d="M8 4v10M16 4v10" stroke="#9B6CFF" stroke-width="3.4" stroke-linecap="round"/><circle cx="8" cy="19.5" r="2" fill="#9B6CFF"/><circle cx="16" cy="19.5" r="2" fill="#9B6CFF"/></svg>',
  zeta: '<svg viewBox="0 0 24 24"><path d="M6 6h11L6 18h11" stroke="#B9A6F2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  trofeo: '<svg viewBox="0 0 24 24"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="#FFC93C" stroke="#E2A100" stroke-width="1.1"/><path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" stroke="#E2A100" stroke-width="1.6" fill="none"/><path d="M10 13h4l1 5H9z" fill="#FFB300"/><rect x="7" y="18" width="10" height="3" rx="1" fill="#E2A100"/></svg>',
};
const ICONO_DE = { bien: ['estrella', 'chispa'], festeja: ['estrella', 'chispa', 'trofeo', 'corazon'], enojado: ['enojo'], sorpresa: ['alerta'], piensa: ['duda'], amor: ['corazon'], duerme: ['zeta'] };

const quieta = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch{ return false; } };
let estiloPuesto = false;
function ponerEstilo(){
  if(estiloPuesto) return; estiloPuesto = true;
  const s = document.createElement('style');
  s.textContent = `
  .masc{ position:relative; width:var(--tam,120px); height:calc(var(--tam,120px) * 1.1); display:inline-block; pointer-events:auto; -webkit-tap-highlight-color:transparent; touch-action:manipulation; cursor:pointer }
  .masc > svg{ position:absolute; inset:0; width:100%; height:100%; overflow:visible }
  .masc-fx{ position:absolute; inset:-35% -35% 0; pointer-events:none; overflow:visible }
  .masc-fx > span{ position:absolute; width:calc(var(--tam,120px) * .2); height:calc(var(--tam,120px) * .2); will-change:transform, opacity }
  .masc-fx > span svg{ width:100%; height:100%; display:block }
  .masc-globo{ position:absolute; left:50%; bottom:100%; translate:-50% 0; margin-bottom:6px; max-width:210px; width:max-content; padding:8px 12px; border-radius:14px;
    background:#fff; color:#2A1240; font:700 13px/1.3 system-ui, sans-serif; box-shadow:0 6px 18px #0004; pointer-events:none; opacity:0; text-align:center; z-index:2 }
  .masc-globo::after{ content:""; position:absolute; left:50%; top:100%; translate:-50% -1px; border:7px solid transparent; border-top-color:#fff }
  /* si arriba tapa algo, el globito se va a un lado o abajo (muelle.js · taparia); si en ningún lado cabe, lo dice el muelle */
  .masc-globo[data-lado=derecha]{ left:100%; bottom:52%; translate:0 0; margin:0 0 0 4px } .masc-globo[data-lado=izquierda]{ left:auto; right:100%; bottom:52%; translate:0 0; margin:0 4px 0 0 }
  .masc-globo[data-lado=derecha]::after, .masc-globo[data-lado=izquierda]::after{ display:none }
  .masc-globo[data-lado=abajo]{ bottom:auto; top:100%; margin:6px 0 0 } .masc-globo[data-lado=abajo]::after{ top:auto; bottom:100%; translate:-50% 1px; border-top-color:transparent; border-bottom-color:#fff }
  .masc > svg{ transform:scale(var(--voltea, 1), 1); transform-origin:50% 94% }
  .masc[data-etapa=bebe] > svg{ transform:scale(calc(var(--voltea, 1) * .78), .78) }
  .masc[data-etapa=joven] > svg{ transform:scale(calc(var(--voltea, 1) * .9), .9) }
  .masc .huevo-mece{ transform-box:view-box; transform-origin:100px 204px; animation:masc-mece 3.2s ease-in-out infinite }
  @keyframes masc-mece{ 0%,70%,100%{ transform:rotate(0) } 76%{ transform:rotate(-7deg) } 84%{ transform:rotate(6deg) } 92%{ transform:rotate(-3deg) } }
  @media (prefers-reduced-motion: reduce){ .masc .huevo-mece{ animation:none } }`;
  document.head.append(s);
}

/* ── el vestido: etapa (huevo, bebé, joven, adulta, sabia), color (skin) y accesorios ──
   La página dice cómo va vestida TU mascota de cada especie (configurarVestido); las demás salen normales.
   Un vestido es { etapa, skin, acc: ['corona', …], progreso } (progreso: qué tanto le falta al huevo). */
let VESTIDOR = null;
export function configurarVestido(fn){ VESTIDOR = typeof fn === 'function' ? fn : null; for(const m of VIVAS) m.revestir && m.revestir(); }
export function refrescarVestidos(){ for(const m of VIVAS) m.revestir && m.revestir(); }
/* el color se hace con un filtro SVG (no CSS) para que funcione igual en Safari y no pinte los accesorios.
   Cada color es un DEGRADADO de tres tonos (oscuro, medio, claro) que se le pone a la luz de la mascota:
   así el «dorado» es dorado en el tigre blanco y en la ballena azul (con girar el tono, la paloma de noche salía verde). */
const TONOS = {
  menta: ['#0E5E4A', '#3FC79A', '#E9FFF6'], noche: ['#0E0A33', '#3A4FB8', '#DCE4FF'], lava: ['#4A0808', '#E2451C', '#FFE6B8'],
  dorado: ['#4E3200', '#E2A21C', '#FFF7D6'], galaxia: ['#0B1446', '#6A45E8', '#B8F6FF'], creador: ['#2A0838', '#AC27FF', '#FFEFFF'],
  arcoiris: ['#4A0A24', '#FF3B6B', '#FFE8F0'],
};
const canal = (hex, i) => (parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255).toFixed(3);
function filtroSVG(id, skin, etapa){
  const pasos = [], t = TONOS[skin];
  if(t){
    pasos.push('<feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/>');
    pasos.push(`<feComponentTransfer>${['R', 'G', 'B'].map((c, i) => `<feFunc${c} type="table" tableValues="${t.map((h) => canal(h, i)).join(' ')}"/>`).join('')}</feComponentTransfer>`);
    if(skin === 'arcoiris') pasos.push(`<feColorMatrix type="hueRotate" values="0">${quieta() ? '' : '<animate attributeName="values" from="0" to="360" dur="5s" repeatCount="indefinite"/>'}</feColorMatrix>`);
  }
  if(etapa === 'viejo') pasos.push('<feColorMatrix type="saturate" values=".72"/>');
  if(!pasos.length) return '';
  return `<filter id="${id}" color-interpolation-filters="sRGB" x="-10%" y="-10%" width="120%" height="120%">${pasos.join('')}</filter>`;
}

/* el motor: un solo bucle por todas las mascotas de la página */
const VIVAS = new Set();
let corriendo = false;
function bucle(ahora){
  for(const m of VIVAS) m.cuadro(ahora);
  if(VIVAS.size) requestAnimationFrame(bucle); else corriendo = false;
}
function arrancarBucle(){ if(!corriendo){ corriendo = true; requestAnimationFrame(bucle); } }
let dedo = null;
addEventListener('pointermove', (e) => { dedo = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });
addEventListener('pointerdown', (e) => { dedo = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });

/* todos los personajes: el tigre de aquí y los de zoo.js (la paloma de zoo.js reemplaza a la de aquí) */
export const PERSONAJES = ['tigre', ...Object.keys(ZOO)];
export const NOMBRE_PERSONAJE = { tigre: 'Tigre', ...Object.fromEntries(Object.entries(ZOO).map(([k, v]) => [k, v.nombre])) };
const existe = (q) => q === 'tigre' || !!ZOO[q];
const pivoteDe = (q) => (ZOO[q] && ZOO[q].pivote) || PIVOTE[q] || PIVOTE.tigre;
const ojosDe = (q) => (ZOO[q] && ZOO[q].ojos) || OJOS[q] || OJOS.tigre;
export function crearMascota(caja, op = {}){
  ponerEstilo();
  let quien = existe(op.personaje) ? op.personaje : 'tigre';
  const el = document.createElement('div'); el.className = 'masc'; if(op.tam) el.style.setProperty('--tam', op.tam + 'px');
  el.setAttribute('role', 'img');
  caja.append(el);
  const fx = document.createElement('div'); fx.className = 'masc-fx';
  const globo = document.createElement('div'); globo.className = 'masc-globo'; globo.setAttribute('aria-live', 'polite');
  let piezas = {}, boca = null, bocaClip = null, lengua = null, ojosEl = {}, huevo = false, accCabeza = null, accCuerpo = null, escalaCabeza = 1;
  const vestidoActual = () => op.vestido !== undefined ? op.vestido : VESTIDOR ? VESTIDOR(quien) : null;
  let vestido = vestidoActual();
  function dibujar(){
    const id = 'm' + (++uid) + '_';
    const v = vestido || {}, etapa = v.etapa || 'adulto';
    huevo = etapa === 'huevo';
    el.dataset.etapa = etapa;
    if(huevo){
      el.innerHTML = svgHuevo(quien, v.progreso || 0); el.append(fx, globo); piezas = {};
      el.setAttribute('aria-label', `Tu huevo de ${(ZOO[quien] && ZOO[quien].nombre) || 'mascota'}`);
      return;
    }
    el.innerHTML = ZOO[quien] ? ZOO[quien].svg(id) : quien === 'tigre' ? svgTigre(id) : svgPaloma(id);
    el.append(fx, globo);
    piezas = {}; for(const g of el.querySelectorAll('[data-p]')) piezas[g.dataset.p] = g;
    escalaCabeza = etapa === 'bebe' ? 1.17 : etapa === 'joven' ? 1.06 : 1;
    /* color y accesorios: los accesorios van en capas aparte que copian el movimiento de la cabeza y del cuerpo */
    const svg = el.querySelector('svg'), fil = filtroSVG(id + 'skin', v.skin, etapa);
    if(fil && piezas.raiz){ let defs = svg.querySelector('defs'); if(!defs){ defs = document.createElementNS(NS, 'defs'); svg.prepend(defs); } defs.insertAdjacentHTML('beforeend', fil); piezas.raiz.setAttribute('filter', `url(#${id}skin)`); }
    const acc = [...(v.acc || [])];
    if(etapa === 'viejo' && !acc.some((k) => k === 'lentes' || k === 'lentesSol')) acc.push('sabio');
    accCabeza = accCuerpo = null;
    if(acc.length && piezas.raiz){
      const g = CABEZAS[quien] || CABEZAS.tigre, oj = ojosDe(quien);
      const cab = acc.filter((k) => !DEL_CUELLO.has(k)).map((k) => svgAccesorio(k, g, oj)).join('');
      const cue = acc.filter((k) => DEL_CUELLO.has(k)).map((k) => svgCuello(k, g)).join('');
      accCuerpo = document.createElementNS(NS, 'g'); accCuerpo.setAttribute('data-capa', 'cuerpo'); accCuerpo.innerHTML = cue + (g.enCuerpo ? cab : '');
      accCabeza = document.createElementNS(NS, 'g'); accCabeza.setAttribute('data-capa', 'cabeza'); accCabeza.innerHTML = g.enCuerpo ? '' : cab;
      piezas.raiz.after(accCuerpo, accCabeza);
    }
    boca = el.querySelector('[data-boca]'); bocaClip = el.querySelector('[data-boca-clip]'); lengua = el.querySelector('[data-lengua]');
    ojosEl = {};
    for(const lado of ['I', 'D']){ const g = piezas['ojo' + lado]; ojosEl[lado] = { mira: g.querySelector('[data-mira]'), parpado: g.querySelector('[data-parpado]'), pestana: g.querySelector('[data-pestana]'), brillo: g.querySelector('[data-brillo]') }; }
    el.setAttribute('aria-label', ZOO[quien] ? ZOO[quien].etiqueta : quien === 'tigre' ? 'Tu tigre' : 'Tu paloma');
  }
  dibujar();

  const yo = { cuadro: (a) => cuadro(a), revestir(){ const n = vestidoActual(); if(JSON.stringify(n) === JSON.stringify(vestido)) return; vestido = n; dibujar(); } };
  /* estado: lo que pide la acción + lo que hace solo (respirar, parpadear, mirar) */
  const p = BASE(), mostrado = BASE();
  let accion = null, accionT0 = 0, accionDura = 0, mezcla = 0, mezclaObj = 0, despues = null;
  let siguienteParpadeo = performance.now() + r(1200, 3500), parpadeoT0 = -1, dobleParpadeo = false;
  let miraObj = { x: 0, y: 0 }, siguienteMirada = performance.now() + r(1500, 3000), ultimoTravieso = performance.now(), visible = true, t0 = performance.now();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }) : null;
  io?.observe(el);

  let desconectado = 0;
  function cuadro(ahora){
    /* si su pantalla ya se quitó, se deja de animar (y de gastar) */
    if(!el.isConnected){ if(++desconectado > 30){ VIVAS.delete(yo); io?.disconnect(); } return; }
    desconectado = 0;
    if(!visible || document.hidden || huevo) return;
    const t = ahora - t0;
    const base = BASE();
    /* respirar: siempre */
    const resp = onda(t, 2800);
    base.sy = 1 + .018 * resp; base.sx = 1 - .01 * resp; base.cabezaY = -.8 * resp;
    base.cola = 9 * onda(t, 2200); base.copete = 6 * onda(t, 1900);
    base.brazoI = 2.5 * onda(t, 2800, .2); base.brazoD = -2.5 * onda(t, 2800, .2);
    /* una oreja que se mueve de vez en cuando */
    const tw = (t % 5200) / 5200; if(tw > .9) base.orejaD = 9 * Math.sin((tw - .9) / .1 * Math.PI * 2);
    /* mirar: al dedo si anda cerca; si no, a su alrededor */
    if(dedo && ahora - dedo.t < 2500){
      const b = el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height * .4;
      const dx = dedo.x - cx, dy = dedo.y - cy, d = Math.hypot(dx, dy);
      if(d < 520){ miraObj = { x: lim(dx / 60, -3.2, 3.2), y: lim(dy / 70, -2.6, 2.6) }; base.cabezaGiro = lim(dx / 90, -6, 6); }
    } else if(ahora > siguienteMirada){ siguienteMirada = ahora + r(1600, 3600); miraObj = Math.random() < .35 ? { x: 0, y: 0 } : { x: r(-3, 3), y: r(-2, 2) }; }
    base.miraX = miraObj.x; base.miraY = miraObj.y;
    /* parpadear a destiempo (a veces doble) */
    if(parpadeoT0 < 0 && ahora > siguienteParpadeo){ parpadeoT0 = ahora; dobleParpadeo = Math.random() < .25; }
    if(parpadeoT0 >= 0){ const k = (ahora - parpadeoT0) / 150; base.parpado = k < 1 ? Math.sin(k * Math.PI) : 0;
      if(k >= 1){ if(dobleParpadeo){ dobleParpadeo = false; parpadeoT0 = ahora + 60; } else { parpadeoT0 = -1; siguienteParpadeo = ahora + r(2200, 5200); } } }
    /* la acción encima, mezclada suave */
    let obj = {};
    if(accion){
      const dur = accionDura || 1e9, u = lim((ahora - accionT0) / dur, 0, 1);
      obj = accion.f(u, ahora - accionT0, quien) || {};
      if(accionDura && u >= 1){ mezclaObj = 0; if(!despues) despues = setTimeout(() => { despues = null; if(mezcla < .02){ accion = null; } }, 260); }
    }
    mezcla += (mezclaObj - mezcla) * (1 - Math.exp(-16 / 110));
    for(const k of Object.keys(base)){
      let v = base[k];
      if(k in obj){
        if(k === 'parpado') v = Math.max(v, obj[k] * mezcla);
        else if(k === 'sx' || k === 'sy' || k === 'ojosGrandes') v = v * lerp(1, obj[k], mezcla);
        else if(k === 'brazoI' || k === 'brazoD' || k === 'cola' || k === 'cabezaY') v = v * (1 - mezcla) + obj[k] * mezcla + (k === 'cola' ? v * .3 : 0);
        else v = lerp(v, obj[k], mezcla);
      }
      p[k] = v;
    }
    /* la mirada y las cejas van con resorte: llegan con un poquito de retraso, como un ojo de verdad */
    for(const k of Object.keys(p)){ const rapido = k === 'miraX' || k === 'miraY' ? .22 : k.startsWith('ceja') ? .25 : k === 'parpado' ? 1 : .55; mostrado[k] += (p[k] - mostrado[k]) * rapido; }
    pintar(mostrado);
    /* travesuras solas si nadie lo pone a hacer nada en un rato */
    if(!accion && ahora - ultimoTravieso > r(8000, 13000)){ ultimoTravieso = ahora; play(azar(['saluda', 'juega', 'amor', 'piensa_corto']), { solo: true }); }
  }

  const T = (g, s) => { if(g && g._t !== s){ g.setAttribute('transform', s); g._t = s; } };
  const rot = (nombre, ang, extra = '') => { const [px, py] = pivoteDe(quien)[nombre] || [100, 100]; return `${extra}rotate(${ang.toFixed(2)} ${px} ${py})`; };
  let tAhora = 0;
  function pintar(v){
    tAhora = performance.now();
    const [rx, ry] = pivoteDe(quien).raiz;
    const tRaiz = `translate(${v.x.toFixed(2)} ${v.y.toFixed(2)}) rotate(${v.giro.toFixed(2)} ${rx} ${ry}) translate(${rx} ${ry}) scale(${v.sx.toFixed(4)} ${v.sy.toFixed(4)}) translate(${-rx} ${-ry})`;
    T(piezas.raiz, tRaiz); T(accCuerpo, tRaiz);
    const alto = Math.max(0, -v.y);
    T(piezas.sombra, `translate(100 207) scale(${(1 - alto / 120).toFixed(3)} 1) translate(-100 -207)`); if(piezas.sombra) piezas.sombra.style.opacity = (1 - alto / 90).toFixed(2);
    const [pcx, pcy] = pivoteDe(quien).cabeza || [100, 130];
    const tCab = rot('cabeza', v.cabezaGiro, `translate(${v.cabezaX.toFixed(2)} ${v.cabezaY.toFixed(2)}) `) + (escalaCabeza !== 1 ? ` translate(${pcx} ${pcy}) scale(${escalaCabeza}) translate(${-pcx} ${-pcy})` : '');
    T(piezas.cabeza, tCab); T(accCabeza, tRaiz + ' ' + tCab);
    /* un brazo que sube se abre hacia afuera: así la pata queda junto a la cara, no encima */
    const subeI = lim(v.brazoI / 120, 0, 1), subeD = lim(-v.brazoD / 120, 0, 1), ab = ZOO[quien] ? ZOO[quien].abre : quien === 'tigre' ? 14 : 6;
    T(piezas.brazoI, rot('brazoI', v.brazoI, `translate(${(-ab * subeI).toFixed(2)} ${(-4 * subeI).toFixed(2)}) `));
    T(piezas.brazoD, rot('brazoD', v.brazoD, `translate(${(ab * subeD).toFixed(2)} ${(-4 * subeD).toFixed(2)}) `));
    T(piezas.cola, rot('cola', v.cola)); const oj = ZOO[quien] && ZOO[quien].orejasCaen ? -.6 : 1; T(piezas.orejaI, rot('orejaI', v.orejaI * oj)); T(piezas.orejaD, rot('orejaD', v.orejaD * oj));
    T(piezas.pataI, rot('pataI', v.pataI)); T(piezas.pataD, rot('pataD', v.pataD)); T(piezas.copete, rot('copete', v.copete));
    /* ojos: el tamaño, a dónde miran, el párpado, el ojo feliz y el cerrado de dormir */
    const feliz = lim(v.feliz, 0, 1), cerr = lim(v.cerrados, 0, 1);
    for(const lado of ['I', 'D']){
      const [ox, oy, alto0] = ojosDe(quien)[lado], o = ojosEl[lado], g = piezas['ojo' + lado];
      const cierra = Math.max(feliz, cerr), aplasta = 1 - .9 * suave(lim(cierra / .75, 0, 1));
      g.style.opacity = (1 - suave(lim((cierra - .55) / .25, 0, 1))).toFixed(2);
      T(g, `translate(${ox} ${oy}) scale(${v.ojosGrandes.toFixed(3)} ${(v.ojosGrandes * aplasta).toFixed(3)}) translate(${-ox} ${-oy})`);
      T(o.mira, `translate(${v.miraX.toFixed(2)} ${v.miraY.toFixed(2)})`);
      const tapa = lim(v.parpado, 0, 1) * (alto0 * 2 + 4);
      o.parpado.setAttribute('height', tapa.toFixed(2));
      o.pestana.style.opacity = v.parpado > .85 ? 1 : 0;
      const fz = piezas['feliz' + lado]; if(fz) fz.style.opacity = suave(lim((cierra - .5) / .25, 0, 1)).toFixed(2);
      if(fz) T(fz, cerr > feliz ? `translate(0 ${2 * (oy - 2) + 4}) scale(1 -1)` : '');
      const ceja = piezas['ceja' + lado];
      if(ceja){ ceja.style.opacity = lim(v.cejas, 0, 1).toFixed(2); const s = lado === 'I' ? -1 : 1; T(ceja, `translate(0 ${v.cejaY.toFixed(2)}) rotate(${(v.cejaAng * 16 * s).toFixed(2)} ${ox} ${oy - 21})`); }
    }
    for(const [lado, fase] of [['I', 0], ['D', .45]]){
      const g = piezas['lagrima' + lado]; if(!g) continue;
      const k = ((tAhora / 1300) + fase) % 1, vis = lim(v.lagrimas, 0, 1);
      g.setAttribute('opacity', (vis * (k < .15 ? k / .15 : k > .8 ? (1 - k) / .2 : 1)).toFixed(2));
      T(g, `translate(0 ${(k * 16).toFixed(2)})`);
    }
    for(const c of ['cacheteI', 'cacheteD']) if(piezas[c]) piezas[c].setAttribute('opacity', lim(v.cachetes, 0, 1).toFixed(2));
    /* la boca del tigre se DEFORMA: ancho, curva (sonrisa o tristeza) y qué tan abierta */
    if(boca){
      const w = 9 * v.ancho, y0 = (ZOO[quien] && ZOO[quien].boca) || 112, c = 4.5 * v.curva, h = lim(v.abierta, 0, 1) * 15;
      const L = [100 - w, y0 - c], R = [100 + w, y0 - c];
      const d = `M${L[0].toFixed(2)} ${L[1].toFixed(2)} Q100 ${(y0 + c * .35).toFixed(2)} ${R[0].toFixed(2)} ${R[1].toFixed(2)} Q100 ${(y0 + c * .35 + h * 1.4).toFixed(2)} ${L[0].toFixed(2)} ${L[1].toFixed(2)} Z`;
      if(boca._d !== d){ boca.setAttribute('d', d); bocaClip.setAttribute('d', d); boca._d = d; }
      lengua.setAttribute('cy', (y0 + c * .35 + h * 1.15).toFixed(2)); lengua.setAttribute('rx', (5 + w * .5).toFixed(2));
    }
    if(piezas.picoAbajo) T(piezas.picoAbajo, `translate(0 ${(lim(v.picoAbre, 0, 1) * 5).toFixed(2)}) ${rot('picoAbajo', lim(v.picoAbre, 0, 1) * 6)}`);
  }

  /* lo que sale flotando */
  function icono(nombre, { x = r(.25, .75), retraso = 0, lejos = 1 } = {}){
    if(quieta() || !ICONOS[nombre]) return;
    const i = document.createElement('span'); i.innerHTML = ICONOS[nombre];
    i.style.left = `${x * 100}%`; i.style.top = '18%'; i.style.opacity = '0';
    fx.append(i);
    const dx = r(-30, 30) * lejos, dy = -r(55, 95) * lejos, gira = r(-30, 30);
    i.animate([{ transform: 'translate(-50%,0) scale(.2) rotate(0)', opacity: 0 }, { transform: `translate(calc(-50% + ${dx * .4}px),${dy * .5}px) scale(1.15) rotate(${gira * .5}deg)`, opacity: 1, offset: .3 },
      { transform: `translate(calc(-50% + ${dx}px),${dy}px) scale(.85) rotate(${gira}deg)`, opacity: 0 }],
      { duration: r(1100, 1600), delay: retraso, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.then(() => i.remove(), () => i.remove());
  }
  function lluvia(nombres, n = 8){ for(let k = 0; k < n; k++) icono(azar(nombres), { x: r(.05, .95), retraso: k * 70, lejos: r(1, 1.7) }); }
  let globoT = 0;
  function decir(texto, ms = 2400){
    clearTimeout(globoT);
    if(!texto){ globo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }); return; }
    globo.textContent = texto;
    /* que el globo no se salga de la pantalla cuando la mascota está en la orilla (Luna, 13 nov) y que NO tape nada
       (Carlos, 14 nov): se prueba arriba, a los lados y abajo; si en ningún lado cabe, lo dice el muelle de arriba */
    let lugar = op.globoLibre ? 'arriba' : null;
    if(!lugar){
      for(const lado of ['arriba', 'derecha', 'izquierda', 'abajo']){
        globo.dataset.lado = lado; globo.style.marginLeft = ''; globo.style.maxWidth = '';
        try{
          /* de lado se hace angostito para caber entre la mascota y la orilla; si ni así, se brinca ese lado */
          if(lado === 'derecha' || lado === 'izquierda'){ const r = el.getBoundingClientRect(), hueco = Math.floor(lado === 'derecha' ? innerWidth - r.right - 14 : r.left - 14); if(hueco < 96) continue; globo.style.maxWidth = Math.min(210, hueco) + 'px'; }
          let g = globo.getBoundingClientRect();
          if(lado === 'arriba' || lado === 'abajo'){ const mx = 8, dx = g.left < mx ? mx - g.left : g.right > innerWidth - mx ? innerWidth - mx - g.right : 0; if(dx){ globo.style.marginLeft = dx + 'px'; g = globo.getBoundingClientRect(); } }
          if(!g.width || !taparia(g, [globo, el])){ lugar = lado; break; }
        }catch{ lugar = lado; break; }
      }
    }
    if(!lugar){ globo.dataset.lado = 'arriba'; globo.getAnimations().forEach((a) => a.cancel()); globo.style.opacity = '0'; op.alDecir && op.alDecir(texto, quien); decirEnMuelle(texto, ms); return; }
    globo.style.opacity = '';
    globo.dataset.lado = lugar;
    op.alDecir && op.alDecir(texto, quien);   /* carymo.js lo dice en voz alta con la voz que elegiste para esta mascota */
    globo.animate([{ opacity: 0, transform: 'translateY(6px) scale(.8)' }, { opacity: 1, transform: 'translateY(0) scale(1.04)', offset: .7 }, { opacity: 1, transform: 'none' }],
      { duration: 260, easing: 'cubic-bezier(.3,1.5,.4,1)', fill: 'forwards' });
    globoT = setTimeout(() => decir(''), ms);
  }

  let estado = 'quieto', vuelta = 0;
  async function play(e, op2 = {}){
    if(huevo){
      /* el huevo no tiene cara: se mece fuerte, brinca y suelta lo que toque */
      const g = el.querySelector('.huevo-mece');
      if(g && !quieta()) g.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg) translateY(-6px)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(0)' }], { duration: 700, easing: 'ease-in-out' });
      const ic = ICONO_DE[e]; if(ic) icono(azar(ic));
      if(op2.decir) decir(op2.decir, op2.decirMs || 2400);
      return;
    }
    if(e === 'piensa_corto'){ e = 'piensa'; op2.dura = 1600; }
    const A = ACCIONES[e] || ACCIONES.quieto;
    const yo = ++vuelta; estado = e; if(!op2.solo) ultimoTravieso = performance.now();
    accion = A; accionT0 = performance.now(); accionDura = op2.dura ?? A.dura; mezclaObj = e === 'quieto' ? 0 : 1; clearTimeout(despues); despues = null;
    if(quieta()) mezcla = mezclaObj;
    const ic = ICONO_DE[e];
    if(ic){ if(e === 'festeja') lluvia(ic, 10); else [0, 1, 2].slice(0, e === 'bien' ? 3 : e === 'duerme' ? 1 : 2).forEach((k) => icono(azar(ic), { retraso: k * 160 })); }
    if(e === 'duerme'){ const z = setInterval(() => { if(estado !== 'duerme' || !el.isConnected){ clearInterval(z); return; } icono('zeta', { x: .7 }); }, 1600); }
    if(op2.decir) decir(op2.decir, op2.decirMs || 2400);
    if(accionDura) await new Promise((ok) => setTimeout(ok, accionDura + 300));
    if(yo === vuelta && accionDura) estado = 'quieto';
  }

  /* tocarla: se ríe, brinca, saluda… nunca lo mismo dos veces seguidas */
  let ultimoToque = '';
  el.addEventListener('click', () => {
    const op3 = ['bien', 'saluda', 'amor', 'juega', 'sorpresa'].filter((x) => x !== ultimoToque); ultimoToque = azar(op3);
    play(ultimoToque); op.alTocar && op.alTocar(ultimoToque);
  });

  VIVAS.add(yo); arrancarBucle();
  return {
    el, play, decir, lluvia, icono,
    get estado(){ return estado; }, get quien(){ return quien; }, get parametros(){ return { ...mostrado }; },
    personaje(q){ if(!existe(q) || q === quien) return; quien = q; vestido = vestidoActual(); dibujar(); play('saluda'); },
    vestir(v){ op.vestido = v; vestido = vestidoActual(); dibujar(); },
    get vestido(){ return vestido; },
    destruir(){ VIVAS.delete(yo); io?.disconnect(); clearTimeout(globoT); el.remove(); },
  };
}
export const ESTADOS = Object.keys(ACCIONES);
