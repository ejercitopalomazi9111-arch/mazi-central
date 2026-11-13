/* zoo.js — LAS MASCOTAS NUEVAS DE CARYMO, CON LA MISMA ESTÉTICA QUE EL TIGRE
 * ===========================================================================
 * Carlos, 13 nov: «este ya tiene dos mascotas, hay que sumar en la misma estética; mejora la paloma con la
 * original que se estaba usando y pon también un pingüino, un conejo, una foca, una ballena, un gatito y un
 * perrito». Las dibuja Luna; el motor que las mueve es el de Sylcred (mascota.js) y no se toca: cada animal
 * trae las MISMAS piezas (data-p) que el tigre —raiz, sombra, cuerpo, cabeza, ojoI/ojoD, cejas, feliz,
 * lágrimas, cachetes, brazos, patas, cola, orejas, copete— y su tabla de pivotes. Lo que un animal no
 * tiene (la ballena no tiene patas), simplemente no está, y el motor lo salta.
 *
 * La paloma nueva reemplaza a la de mascota.js: es más parecida a la de las hojas de Carlos
 * (`git show 453185fd:carymo/mascotas/paloma-parada.webp`): cuerpo de frijol alto, copete de tres plumas,
 * ojos grandes con brillo, pico chiquito, panza lila grande, alas largas y patas naranjas de tres dedos.
 *
 *   viewBox 0 0 200 220 · los pies tocan y = 206 · cabeza alrededor de (100, 90)
 * ===========================================================================*/

const NS = 'http://www.w3.org/2000/svg';

/* ── los ojos, iguales a los del tigre (estilo «oscuro») o a los de la paloma («blanco») ──
   devuelve el SVG y la medida que el motor usa para el párpado */
function ojo(id, lado, x, y, o){
  const e = o.esc || 1, tinta = o.tinta || '#231A3D';
  if(o.estilo === 'blanco'){
    const rx = 14 * e, ry = 16 * e;
    return `<g data-p="ojo${lado}"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#FFFFFF"/><ellipse cx="${x}" cy="${y + 3 * e}" rx="${rx}" ry="${13 * e}" fill="#EDE6FB" opacity=".5"/>
      <g data-mira><ellipse cx="${x}" cy="${y + 1 * e}" rx="${8.4 * e}" ry="${10 * e}" fill="url(#${id}ojo)"/><circle data-brillo cx="${x - 2.8 * e}" cy="${y - 3.2 * e}" r="${3.4 * e}" fill="#fff"/><circle data-brillo2 cx="${x + 2.8 * e}" cy="${y + 4.2 * e}" r="${1.5 * e}" fill="#fff" opacity=".9"/></g>
      <rect data-parpado x="${x - rx - 2}" y="${y - ry - 2}" width="${rx * 2 + 4}" height="0" rx="5" fill="${o.piel}"/><path data-pestana d="M${x - rx + 1} ${y} Q${x} ${y + 5} ${x + rx - 1} ${y}" stroke="${tinta}" stroke-width="3.2" stroke-linecap="round" fill="none" opacity="0"/></g>`;
  }
  const rx = 10 * e, ry = 13 * e;
  return `<g data-p="ojo${lado}"><g data-mira><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${id}ojo)"/><circle data-brillo cx="${x - 3.4 * e}" cy="${y - 5 * e}" r="${3.8 * e}" fill="#fff"/><circle data-brillo2 cx="${x + 3.2 * e}" cy="${y + 4 * e}" r="${1.7 * e}" fill="#fff" opacity=".9"/></g>
    <rect data-parpado x="${x - rx - 2}" y="${y - ry - 3}" width="${rx * 2 + 4}" height="0" rx="4" fill="${o.piel}"/><path data-pestana d="M${x - rx} ${y} Q${x} ${y + 4} ${x + rx} ${y}" stroke="${tinta}" stroke-width="3.2" stroke-linecap="round" fill="none" opacity="0"/></g>`;
}
function ojos(id, xi, yi, xd, yd, o){
  const e = o.esc || 1, tinta = o.tinta || '#231A3D';
  const extra = (lado, x, y) => {
    const cy = y - (o.estilo === 'blanco' ? 4 : 0);
    return `<path data-p="feliz${lado}" d="M${x - 9 * e} ${y + 2} Q${x} ${y - 10 * e} ${x + 9 * e} ${y + 2}" stroke="${tinta}" stroke-width="4.2" stroke-linecap="round" fill="none" opacity="0"/>`
      + `<path data-p="ceja${lado}" d="M${x - 9} ${cy - 20 * e} Q${x} ${cy - 25 * e} ${x + 9} ${cy - 20 * e}" stroke="${o.ceja || tinta}" stroke-width="3.6" stroke-linecap="round" fill="none" opacity="0"/>`;
  };
  const lagrima = (lado, x, y) => `<g data-p="lagrima${lado}" opacity="0"><path d="M${x + (lado === 'I' ? -4 : 4)} ${y + 12 * e} c-3 5 -4.5 7.5 -4.5 10 a4.5 4.5 0 0 0 9 0 c0 -2.5 -1.5 -5 -4.5 -10 z" fill="#8ED2FF" stroke="#4FA8E6" stroke-width="1.2"/><ellipse cx="${x + (lado === 'I' ? -5.5 : 2.5)}" cy="${y + 21 * e}" rx="1.2" ry="1.8" fill="#E2F4FF"/></g>`;
  return ojo(id, 'I', xi, yi, o) + extra('I', xi, yi) + ojo(id, 'D', xd, yd, o) + extra('D', xd, yd) + lagrima('I', xi, yi) + lagrima('D', xd, yd);
}
const altoOjo = (o) => (o.estilo === 'blanco' ? 16 : 13) * (o.esc || 1);

/* lo que comparten todos: los degradados, la sombra del piso y la boca que se deforma */
const defs = (id, c) => `<defs>
  <radialGradient id="${id}cu" cx="40%" cy="30%" r="78%"><stop offset="0" stop-color="${c.luz}"/><stop offset=".62" stop-color="${c.piel}"/><stop offset="1" stop-color="${c.sombra}"/></radialGradient>
  <radialGradient id="${id}ca" cx="40%" cy="28%" r="78%"><stop offset="0" stop-color="${c.luz}"/><stop offset=".66" stop-color="${c.piel}"/><stop offset="1" stop-color="${c.sombra}"/></radialGradient>
  <radialGradient id="${id}pa" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="${c.panzaLuz || c.panza}"/><stop offset="1" stop-color="${c.panza}"/></radialGradient>
  <radialGradient id="${id}ojo" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#2B2048"/><stop offset=".75" stop-color="#1F1638"/><stop offset="1" stop-color="${c.iris || '#4A3482'}"/></radialGradient>
  <radialGradient id="${id}so" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#140A22" stop-opacity=".34"/><stop offset="1" stop-color="#140A22" stop-opacity="0"/></radialGradient>
  <clipPath id="${id}bc"><path data-boca-clip/></clipPath>${c.extra || ''}
</defs>`;
const sombra = (id, rx = 50) => `<ellipse data-p="sombra" cx="100" cy="207" rx="${rx}" ry="8" fill="url(#${id}so)"/>`;
const boca = (id, c, dientes = '') => `<path data-boca fill="${c.bocaDentro || '#5B1F3A'}" stroke="${c.tinta}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
  <g clip-path="url(#${id}bc)"><ellipse data-lengua cx="100" cy="128" rx="10" ry="7" fill="#F27893"/>${dientes}</g>`;
const cachetes = (y = 109, dx = 36, op = .42) => `<ellipse data-p="cacheteI" cx="${100 - dx}" cy="${y}" rx="9.5" ry="5.2" fill="#FF97BE" opacity="${op}"/><ellipse data-p="cacheteD" cx="${100 + dx}" cy="${y}" rx="9.5" ry="5.2" fill="#FF97BE" opacity="${op}"/>`;
const espejo = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${(200 - +x)} ${y}`);
/* un cuerpo redondo de peluche, como el del tigre */
const cuerpoPeluche = (id, c, adorno = '') => `<g data-p="cuerpo">
  <path d="M100 116 C 133 116 143 148 141 174 C 139 196 123 204 100 204 C 77 204 61 196 59 174 C 57 148 67 116 100 116 Z" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.5"/>
  <ellipse cx="100" cy="172" rx="25" ry="27" fill="url(#${id}pa)"/><ellipse cx="96" cy="164" rx="12" ry="13" fill="#FFFFFF" opacity=".28"/>
  <ellipse cx="100" cy="131" rx="38" ry="10" fill="${c.tinta}" opacity=".12"/>${adorno}</g>`;
const cabezaRedonda = (id, c) => `<path d="M100 42 C 142 42 162 66 162 93 C 162 120 138 134 100 134 C 62 134 38 120 38 93 C 38 66 58 42 100 42 Z" fill="url(#${id}ca)" stroke="${c.contorno}" stroke-width="2.5"/>`;
const brazosPeluche = (id, c, extraI = '', extraD = '') => {
  const I = 'M76 132 C 64 138 58 160 62 176 C 64 184 74 184 78 178 C 82 164 86 146 84 136 Z';
  return `<g data-p="brazoI"><path d="${I}" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.4"/>${extraI}<ellipse cx="70" cy="178" rx="5.2" ry="3.6" fill="${c.almohadilla || '#FFFFFF'}" opacity=".8"/></g>
  <g data-p="brazoD"><path d="${espejo(I)}" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.4"/>${extraD}<ellipse cx="130" cy="178" rx="5.2" ry="3.6" fill="${c.almohadilla || '#FFFFFF'}" opacity=".8"/></g>`;
};
const patasPeluche = (id, c) => `<g data-p="pataI"><ellipse cx="81" cy="197" rx="16" ry="11" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.4"/><path d="M75 203 v-4 M81 204 v-4.5 M87 203 v-4" stroke="${c.contorno}" stroke-width="1.8" stroke-linecap="round"/></g>
  <g data-p="pataD"><ellipse cx="119" cy="197" rx="16" ry="11" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.4"/><path d="M113 203 v-4 M119 204 v-4.5 M125 203 v-4" stroke="${c.contorno}" stroke-width="1.8" stroke-linecap="round"/></g>`;
const bigotes = (y, color, op = .55) => `<path d="M58 ${y} l-22 -5 M58 ${y + 6} l-23 2 M142 ${y} l22 -5 M142 ${y + 6} l23 2" stroke="${color}" stroke-width="1.8" stroke-linecap="round" opacity="${op}"/>`;
const PIVOTE_PELUCHE = { raiz: [100, 206], cuerpo: [100, 200], cabeza: [100, 124], brazoI: [78, 136], brazoD: [122, 136], pataI: [81, 200], pataD: [119, 200] };

/* ════ LA PALOMA, MEJORADA ════ */
const C_PALOMA = { luz: '#9370E2', piel: '#6A47BC', sombra: '#432686', panza: '#A592DE', panzaLuz: '#CFC3F4', tinta: '#2A1A4A', contorno: '#3B2178', iris: '#4A3482' };
function svgPaloma(id){
  const c = C_PALOMA, O = { estilo: 'blanco', esc: 1.25, piel: '#6A47BC', tinta: '#1E1434', ceja: '#24123F' };
  return `<svg viewBox="0 0 200 220" xmlns="${NS}" aria-hidden="true" overflow="visible">${defs(id, { ...c, extra: `<linearGradient id="${id}al" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E3CAE"/><stop offset="1" stop-color="#3D2280"/></linearGradient>` })}
  ${sombra(id, 46)}
  <g data-p="raiz">
    <g data-p="pataI"><path d="M86 190 v9" stroke="#F2A126" stroke-width="6" stroke-linecap="round"/><path d="M73 206 C 74 198 80 196 86 196 C 92 196 98 198 99 206 C 92 208 80 208 73 206 Z" fill="#F7AE2C" stroke="#E08A12" stroke-width="1.6"/><path d="M81 206 v-4 M91 206 v-4" stroke="#E08A12" stroke-width="1.6" stroke-linecap="round"/></g>
    <g data-p="pataD"><path d="M114 190 v9" stroke="#F2A126" stroke-width="6" stroke-linecap="round"/><path d="M101 206 C 102 198 108 196 114 196 C 120 196 126 198 127 206 C 120 208 108 208 101 206 Z" fill="#F7AE2C" stroke="#E08A12" stroke-width="1.6"/><path d="M109 206 v-4 M119 206 v-4" stroke="#E08A12" stroke-width="1.6" stroke-linecap="round"/></g>
    <g data-p="cola"><path d="M118 184 q24 4 32 -6 q-4 13 -28 14 z M116 189 q22 9 32 2 q-7 11 -30 4 z" fill="#3D2280"/></g>
    <!-- las alas van DETRÁS del cuerpo (relevo de Sylcred, 13 nov: «que no se encimen con la cara»), saliendo por los lados como en la hoja de Carlos -->
    <g data-p="brazoI"><path d="M66 104 C 42 112 20 146 24 182 C 30 194 50 188 60 174 C 66 152 70 126 70 108 Z" fill="url(#${id}al)" stroke="${c.contorno}" stroke-width="2"/><path d="M34 150 q6 10 14 12 M32 166 q6 8 14 10" stroke="#7856C9" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>
    <g data-p="brazoD"><path d="M134 104 C 158 112 180 146 176 182 C 170 194 150 188 140 174 C 134 152 130 126 130 108 Z" fill="url(#${id}al)" stroke="${c.contorno}" stroke-width="2"/><path d="M166 150 q-6 10 -14 12 M168 166 q-6 8 -14 10" stroke="#7856C9" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>
    <g data-p="cuerpo">
      <path d="M100 32 C 134 32 148 58 148 90 C 148 116 160 142 160 168 C 160 192 134 200 100 200 C 66 200 40 192 40 168 C 40 142 52 116 52 90 C 52 58 66 32 100 32 Z" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2"/>
      
      <path d="M64 64 C 72 46 86 38 100 37" stroke="#A98AF0" stroke-width="5" stroke-linecap="round" fill="none" opacity=".5"/>
      <path d="M100 128 C 132 128 150 146 148 168 C 146 188 126 196 100 196 C 74 196 54 188 52 168 C 50 146 68 128 100 128 Z" fill="url(#${id}pa)"/>
      <ellipse cx="90" cy="146" rx="18" ry="9" fill="#FFFFFF" opacity=".2"/>
    </g>
    <g data-p="cabeza">
      <g data-p="copete"><ellipse cx="93" cy="30" rx="6" ry="7.5" transform="rotate(-20 93 30)" fill="#6A47BC"/><ellipse cx="102" cy="27" rx="6.5" ry="8.5" fill="#5E3CB0"/><ellipse cx="98" cy="17" rx="2.2" ry="4" fill="#9370E2" opacity=".7"/></g>
      ${cachetes(110, 38, .3)}
      ${ojos(id, 82, 84, 118, 84, O)}
      <g data-p="picoAbajo"><path d="M94 106 Q100 115 106 106 Q100 109 94 106 Z" fill="#E0870F"/></g>
      <path d="M92 104 Q100 96 108 104 Q104 109 100 110 Q96 109 92 104 Z" fill="#F7AE2C"/><path d="M96 101 Q99.5 99 103 100.5" stroke="#FFD27A" stroke-width="2" stroke-linecap="round" fill="none"/>
    </g>
  </g></svg>`;
}

/* ════ EL PINGÜINO ════ */
const C_PING = { luz: '#5B5390', piel: '#3A3266', sombra: '#211A42', panza: '#ECE8F6', panzaLuz: '#FFFFFF', tinta: '#1B1533', contorno: '#1B1533' };
function svgPinguino(id){
  const c = C_PING, O = { estilo: 'oscuro', esc: .95, piel: '#F7F4FC' };
  return `<svg viewBox="0 0 200 220" xmlns="${NS}" aria-hidden="true" overflow="visible">${defs(id, c)}
  ${sombra(id, 48)}
  <g data-p="raiz">
    <g data-p="pataI"><path d="M70 204 C 72 194 94 192 96 203 C 88 208 76 208 70 204 Z" fill="#F5A62A" stroke="#E08A12" stroke-width="1.8"/></g>
    <g data-p="pataD"><path d="M130 204 C 128 194 106 192 104 203 C 112 208 124 208 130 204 Z" fill="#F5A62A" stroke="#E08A12" stroke-width="1.8"/></g>
    <g data-p="cola"><path d="M122 192 l18 8 l-20 4 z" fill="#2A2350"/></g>
    <g data-p="cuerpo">
      <path d="M100 96 C 146 96 156 136 154 164 C 152 192 130 204 100 204 C 70 204 48 192 46 164 C 44 136 54 96 100 96 Z" fill="url(#${id}cu)"/>
      <path d="M100 112 C 126 112 136 140 134 162 C 132 186 118 198 100 198 C 82 198 68 186 66 162 C 64 140 74 112 100 112 Z" fill="url(#${id}pa)"/>
      <ellipse cx="92" cy="146" rx="13" ry="16" fill="#FFFFFF" opacity=".45"/>
    </g>
    <g data-p="cabeza">
      <ellipse cx="100" cy="84" rx="58" ry="54" fill="url(#${id}ca)"/>
      <path d="M100 66 C 84 48 52 56 54 86 C 56 110 76 124 100 126 C 124 124 144 110 146 86 C 148 56 116 48 100 66 Z" fill="#F7F4FC"/>
      <path d="M72 50 C 82 40 92 38 100 38" stroke="#7A70B8" stroke-width="5" stroke-linecap="round" fill="none" opacity=".45"/>
      ${cachetes(106, 34, .5)}
      ${ojos(id, 80, 86, 120, 86, O)}
      <g data-p="picoAbajo"><path d="M92 104 Q100 116 108 104 Q100 108 92 104 Z" fill="#E0870F"/></g>
      <path d="M89 102 Q100 92 111 102 Q106 108 100 109 Q94 108 89 102 Z" fill="#F7AE2C"/><path d="M94 99 Q99 96 104 98" stroke="#FFD27A" stroke-width="2" stroke-linecap="round" fill="none"/>
    </g>
    <g data-p="brazoI"><path d="M52 112 C 36 124 30 152 36 172 C 40 180 50 174 52 164 C 56 146 60 126 58 114 Z" fill="url(#${id}cu)"/></g>
    <g data-p="brazoD"><path d="M148 112 C 164 124 170 152 164 172 C 160 180 150 174 148 164 C 144 146 140 126 142 114 Z" fill="url(#${id}cu)"/></g>
  </g></svg>`;
}

/* ════ EL CONEJO ════ */
const C_CONEJO = { luz: '#FFFFFF', piel: '#F6F1FD', sombra: '#DDD2F0', panza: '#FFFFFF', tinta: '#2C2350', contorno: '#D2C7E6', almohadilla: '#F6B4CF' };
function svgConejo(id){
  const c = C_CONEJO, O = { estilo: 'oscuro', piel: '#F9F6FD' };
  const oreja = 'M80 60 C 62 40 58 6 72 2 C 86 0 94 32 90 58 Z', dentro = 'M80 54 C 68 38 66 14 74 10 C 82 10 86 32 85 52 Z';
  const dientes = `<rect x="94.5" y="111" width="5" height="7" rx="1.2" fill="#fff" stroke="#D2C7E6" stroke-width=".8"/><rect x="100.5" y="111" width="5" height="7" rx="1.2" fill="#fff" stroke="#D2C7E6" stroke-width=".8"/>`;
  return `<svg viewBox="0 0 200 220" xmlns="${NS}" aria-hidden="true" overflow="visible">${defs(id, c)}
  ${sombra(id)}
  <g data-p="raiz">
    <g data-p="cola"><circle cx="138" cy="184" r="13" fill="#FFFFFF" stroke="${c.contorno}" stroke-width="2.4"/><circle cx="135" cy="181" r="5" fill="#F3EEFB"/></g>
    ${patasPeluche(id, c)}
    ${cuerpoPeluche(id, c)}
    <g data-p="cabeza">
      <g data-p="orejaI"><path d="${oreja}" fill="url(#${id}ca)" stroke="${c.contorno}" stroke-width="2.5"/><path d="${dentro}" fill="#F6B4CF"/><path d="M76 40 C 74 30 74 20 76 16" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity=".7" fill="none"/></g>
      <g data-p="orejaD"><path d="${espejo(oreja)}" fill="url(#${id}ca)" stroke="${c.contorno}" stroke-width="2.5"/><path d="${espejo(dentro)}" fill="#F6B4CF"/></g>
      ${cabezaRedonda(id, c)}
      <ellipse cx="100" cy="110" rx="21" ry="14" fill="#FFFFFF"/>
      ${cachetes(108, 36, .5)}
      ${ojos(id, 78, 89, 122, 89, O)}
      <path d="M95 100 Q100 97 105 100 Q103 105 100 106 Q97 105 95 100 Z" fill="#F27893"/>
      ${bigotes(106, '#B9AED6', .7)}
      ${boca(id, c, dientes)}
    </g>
    ${brazosPeluche(id, c)}
  </g></svg>`;
}

/* ════ LA FOCA ════ */
const C_FOCA = { luz: '#E2E9F6', piel: '#B6C4DE', sombra: '#8293B8', panza: '#EEF2FA', panzaLuz: '#FFFFFF', tinta: '#2A3150', contorno: '#8C9CC0', bocaDentro: '#5B2340' };
function svgFoca(id){
  const c = C_FOCA, O = { estilo: 'oscuro', esc: 1.15, piel: '#C4D0E6', tinta: '#1D2240' };
  const aleta = 'M62 148 C 42 152 30 172 34 184 C 42 190 58 180 68 166 Z';
  return `<svg viewBox="0 0 200 220" xmlns="${NS}" aria-hidden="true" overflow="visible">${defs(id, c)}
  ${sombra(id, 54)}
  <g data-p="raiz">
    <g data-p="cola"><path d="M98 196 C 86 212 66 214 62 208 C 70 202 82 196 94 190 Z M102 196 C 114 212 134 214 138 208 C 130 202 118 196 106 190 Z" fill="#8F9FC4" stroke="${c.contorno}" stroke-width="2"/></g>
    <g data-p="cuerpo">
      <path d="M100 112 C 142 114 154 152 148 182 C 144 200 124 206 100 206 C 76 206 56 200 52 182 C 46 152 58 114 100 112 Z" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.4"/>
      <ellipse cx="100" cy="172" rx="30" ry="28" fill="url(#${id}pa)"/>
      <circle cx="132" cy="150" r="4" fill="#8E9EC2" opacity=".6"/><circle cx="66" cy="168" r="3" fill="#8E9EC2" opacity=".6"/><circle cx="138" cy="170" r="2.6" fill="#8E9EC2" opacity=".6"/>
    </g>
    <g data-p="cabeza">
      <circle cx="100" cy="88" r="56" fill="url(#${id}ca)" stroke="${c.contorno}" stroke-width="2.4"/>
      <path d="M66 50 C 78 38 92 34 102 34" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" fill="none" opacity=".5"/>
      <circle cx="74" cy="60" r="3" fill="#8E9EC2" opacity=".5"/><circle cx="128" cy="56" r="2.5" fill="#8E9EC2" opacity=".5"/>
      ${cachetes(108, 38, .45)}
      ${ojos(id, 78, 84, 122, 84, O)}
      <ellipse cx="91" cy="108" rx="11" ry="8" fill="#F4F7FC"/><ellipse cx="109" cy="108" rx="11" ry="8" fill="#F4F7FC"/>
      <circle cx="87" cy="107" r="1.2" fill="#7D8DB2"/><circle cx="92" cy="110" r="1.2" fill="#7D8DB2"/><circle cx="113" cy="107" r="1.2" fill="#7D8DB2"/><circle cx="108" cy="110" r="1.2" fill="#7D8DB2"/>
      <path d="M94 99 Q100 95 106 99 Q104 104 100 105 Q96 104 94 99 Z" fill="#2A3150"/><ellipse cx="98" cy="99.4" rx="2" ry="1" fill="#fff" opacity=".7"/>
      ${bigotes(108, '#6E7EA6', .6)}
      ${boca(id, c)}
    </g>
    <g data-p="brazoI"><path d="${aleta}" fill="#9AAACD" stroke="${c.contorno}" stroke-width="2.2"/></g>
    <g data-p="brazoD"><path d="${espejo(aleta)}" fill="#9AAACD" stroke="${c.contorno}" stroke-width="2.2"/></g>
  </g></svg>`;
}

/* ════ LA BALLENA ════ */
const C_BALLENA = { luz: '#86B1F6', piel: '#5584DC', sombra: '#3557AE', panza: '#D5E4FB', panzaLuz: '#F2F7FF', tinta: '#1C2A5C', contorno: '#2E4C9C', bocaDentro: '#4A1C3E' };
function svgBallena(id){
  const c = C_BALLENA, O = { estilo: 'oscuro', piel: '#5C8BE0', tinta: '#14204A' };
  const aleta = 'M46 146 C 26 146 16 164 22 174 C 32 178 44 168 52 156 Z';
  return `<svg viewBox="0 0 200 220" xmlns="${NS}" aria-hidden="true" overflow="visible">${defs(id, c)}
  ${sombra(id, 60)}
  <g data-p="raiz">
    <g data-p="cola"><path d="M146 158 C 166 148 174 128 172 110 C 180 98 194 96 198 88 C 188 88 178 92 172 98 C 168 88 158 84 150 86 C 160 92 166 100 166 110 C 166 126 158 138 142 150 Z" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.2" stroke-linejoin="round"/></g>
    <g data-p="cuerpo">
      <path d="M100 42 C 150 42 170 90 168 130 C 166 180 136 202 100 202 C 64 202 34 180 32 130 C 30 90 50 42 100 42 Z" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.4"/>
      <path d="M44 150 C 60 184 140 184 156 150 C 150 186 128 200 100 200 C 72 200 50 186 44 150 Z" fill="url(#${id}pa)"/>
      <path d="M62 170 q38 14 76 0 M70 182 q30 10 60 0" stroke="#A9C3EE" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path d="M58 70 C 68 54 84 48 100 47" stroke="#B7D2FF" stroke-width="6" stroke-linecap="round" fill="none" opacity=".55"/>
    </g>
    <g data-p="copete">
      <path d="M100 42 V 18 M100 40 C 97 30 90 22 80 18 M100 40 C 103 30 110 22 120 18" stroke="#9FD3FF" stroke-width="5" stroke-linecap="round" fill="none"/>
      <circle cx="78" cy="16" r="4" fill="#C9E7FF"/><circle cx="122" cy="16" r="4" fill="#C9E7FF"/><circle cx="100" cy="13" r="4.5" fill="#C9E7FF"/>
    </g>
    <g data-p="cabeza">
      ${cachetes(122, 40, .45)}
      ${ojos(id, 76, 104, 124, 104, O)}
      ${boca(id, c)}
    </g>
    <g data-p="brazoI"><path d="${aleta}" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.2"/></g>
    <g data-p="brazoD"><path d="${espejo(aleta)}" fill="url(#${id}cu)" stroke="${c.contorno}" stroke-width="2.2"/></g>
  </g></svg>`;
}

/* ════ EL GATITO ════ */
const C_GATO = { luz: '#FFD1A1', piel: '#F5A65C', sombra: '#D9792E', panza: '#FFF3E3', panzaLuz: '#FFFFFF', tinta: '#3B2316', contorno: '#D98B47', almohadilla: '#F6B4CF' };
function svgGatito(id){
  const c = C_GATO, O = { estilo: 'oscuro', piel: '#F7AE68', tinta: '#2A1A10', iris: '#3E7A3A' };
  const oreja = 'M54 74 L60 24 L94 52 Z', dentro = 'M61 64 L64 36 L84 52 Z';
  const rayas = '#C9661F';
  const colaD = 'M128 186 C 160 192 176 168 170 140 C 168 130 162 124 156 126';
  return `<svg viewBox="0 0 200 220" xmlns="${NS}" aria-hidden="true" overflow="visible">${defs(id, c)}
  ${sombra(id)}
  <g data-p="raiz">
    <g data-p="cola"><path d="${colaD}" fill="none" stroke="${c.contorno}" stroke-width="15" stroke-linecap="round"/><path d="${colaD}" fill="none" stroke="#F5A65C" stroke-width="11" stroke-linecap="round"/><path d="${colaD}" fill="none" stroke="${rayas}" stroke-width="11.2" stroke-dasharray="4 12" stroke-dashoffset="-6"/></g>
    ${patasPeluche(id, c)}
    ${cuerpoPeluche(id, c, `<path d="M60 150 q10 1 16 7 q-10 1 -16 -3 z M140 150 q-10 1 -16 7 q10 1 16 -3 z M59.5 168 q9 0 14 5 q-9 1 -14 -2 z M140.5 168 q-9 0 -14 5 q9 1 14 -2 z" fill="${rayas}"/>`)}
    <g data-p="cabeza">
      <g data-p="orejaI"><path d="${oreja}" fill="url(#${id}ca)" stroke="${c.contorno}" stroke-width="2.5" stroke-linejoin="round"/><path d="${dentro}" fill="#F6B4CF"/></g>
      <g data-p="orejaD"><path d="${espejo(oreja)}" fill="url(#${id}ca)" stroke="${c.contorno}" stroke-width="2.5" stroke-linejoin="round"/><path d="${espejo(dentro)}" fill="#F6B4CF"/></g>
      ${cabezaRedonda(id, c)}
      <path d="M100 44 q-4 9 0 18 q4 -9 0 -18 z M87 47 q-1 8 5 13 q0 -9 -5 -13 z M113 47 q1 8 -5 13 q0 -9 5 -13 z" fill="${rayas}"/>
      <path d="M38.5 82 q11 1 17 6 q-10 2 -17 -2 z M161.5 82 q-11 1 -17 6 q10 2 17 -2 z" fill="${rayas}"/>
      <ellipse cx="100" cy="110" rx="22" ry="14" fill="#FFF3E3"/>
      ${cachetes(108, 36, .5)}
      ${ojos(id, 78, 89, 122, 89, O)}
      <path d="M95 100 Q100 97 105 100 Q103 104.5 100 106 Q97 104.5 95 100 Z" fill="#F27893"/>
      ${bigotes(104, '#7A4A26', .55)}
      ${boca(id, c)}
    </g>
    ${brazosPeluche(id, c, `<path d="M63 158 q7 1 11 4" stroke="${rayas}" stroke-width="3" stroke-linecap="round" fill="none"/>`, `<path d="M137 158 q-7 1 -11 4" stroke="${rayas}" stroke-width="3" stroke-linecap="round" fill="none"/>`)}
  </g></svg>`;
}

/* ════ EL PERRITO ════ */
const C_PERRO = { luz: '#FFF1DA', piel: '#F0D3A6', sombra: '#D2A86E', panza: '#FFF8EC', panzaLuz: '#FFFFFF', tinta: '#3A2414', contorno: '#C99B67', almohadilla: '#B98556' };
function svgPerrito(id){
  const c = C_PERRO, O = { estilo: 'oscuro', piel: '#F2D7AD', tinta: '#2A1A10' };
  const oreja = 'M60 54 C 38 56 28 92 36 118 C 42 130 56 124 59 110 C 63 92 68 72 66 56 Z';
  return `<svg viewBox="0 0 200 220" xmlns="${NS}" aria-hidden="true" overflow="visible">${defs(id, c)}
  ${sombra(id)}
  <g data-p="raiz">
    <g data-p="cola"><path d="M130 180 C 146 176 154 160 150 146" fill="none" stroke="${c.contorno}" stroke-width="15" stroke-linecap="round"/><path d="M130 180 C 146 176 154 160 150 146" fill="none" stroke="#F0D3A6" stroke-width="11" stroke-linecap="round"/><circle cx="150" cy="146" r="5.5" fill="#8A5A33"/></g>
    ${patasPeluche(id, c)}
    ${cuerpoPeluche(id, c, '<ellipse cx="126" cy="150" rx="10" ry="8" fill="#B98556" opacity=".55"/>')}
    <g data-p="cabeza">
      ${cabezaRedonda(id, c)}
      <ellipse cx="124" cy="82" rx="19" ry="17" fill="#A87444" opacity=".85"/>
      <g data-p="orejaI"><path d="${oreja}" fill="#8A5A33" stroke="#6E4524" stroke-width="2.2"/><path d="M50 74 C 44 88 44 104 48 114" stroke="#A87444" stroke-width="3" stroke-linecap="round" fill="none"/></g>
      <g data-p="orejaD"><path d="${espejo(oreja)}" fill="#8A5A33" stroke="#6E4524" stroke-width="2.2"/></g>
      <ellipse cx="100" cy="110" rx="26" ry="17" fill="#FFF8EC"/>
      ${cachetes(110, 38, .45)}
      ${ojos(id, 78, 87, 122, 87, O)}
      <ellipse cx="100" cy="100" rx="9" ry="6.2" fill="#2A1A10"/><ellipse cx="97.5" cy="98.4" rx="2.6" ry="1.4" fill="#fff" opacity=".7"/>
      ${boca(id, c)}
    </g>
    ${brazosPeluche(id, c)}
  </g></svg>`;
}

/* ── el registro que lee mascota.js ──
   pivote: alrededor de qué punto gira cada pieza · ojos: [x, y, alto] para el párpado ·
   boca: dónde se dibuja la boca (la del tigre va en y = 112) · abre: cuánto se abre un brazo al subirlo */
const conOjos = (xi, yi, xd, yd, o) => ({ I: [xi, yi, altoOjo(o)], D: [xd, yd, altoOjo(o)] });
export const ZOO = {
  paloma: { nombre: 'Paloma', etiqueta: 'Tu paloma', svg: svgPaloma, abre: 6,
    pivote: { raiz: [100, 206], cuerpo: [100, 198], cabeza: [100, 116], copete: [100, 30], brazoI: [66, 108], brazoD: [134, 108], cola: [118, 188], pataI: [86, 196], pataD: [114, 196], ojoI: [82, 84], ojoD: [118, 84], picoAbajo: [100, 106] },
    ojos: conOjos(82, 84, 118, 84, { estilo: 'blanco', esc: 1.25 }) },
  pinguino: { nombre: 'Pingüino', etiqueta: 'Tu pingüino', svg: svgPinguino, abre: 4,
    pivote: { raiz: [100, 206], cuerpo: [100, 200], cabeza: [100, 128], brazoI: [55, 114], brazoD: [145, 114], cola: [122, 196], pataI: [83, 202], pataD: [117, 202], ojoI: [80, 86], ojoD: [120, 86], picoAbajo: [100, 104] },
    ojos: conOjos(80, 86, 120, 86, { estilo: 'oscuro', esc: .95 }) },
  conejo: { nombre: 'Conejo', etiqueta: 'Tu conejo', svg: svgConejo, abre: 12,
    pivote: { ...PIVOTE_PELUCHE, orejaI: [84, 60], orejaD: [116, 60], cola: [132, 184], ojoI: [78, 89], ojoD: [122, 89] },
    ojos: conOjos(78, 89, 122, 89, { estilo: 'oscuro' }) },
  foca: { nombre: 'Foca', etiqueta: 'Tu foca', svg: svgFoca, abre: 4, boca: 117,
    pivote: { raiz: [100, 206], cuerpo: [100, 204], cabeza: [100, 130], brazoI: [64, 150], brazoD: [136, 150], cola: [100, 194], ojoI: [78, 84], ojoD: [122, 84] },
    ojos: conOjos(78, 84, 122, 84, { estilo: 'oscuro', esc: 1.15 }) },
  ballena: { nombre: 'Ballena', etiqueta: 'Tu ballena', svg: svgBallena, abre: 2, boca: 126,
    pivote: { raiz: [100, 204], cuerpo: [100, 202], cabeza: [100, 116], copete: [100, 42], brazoI: [50, 150], brazoD: [150, 150], cola: [146, 156], ojoI: [76, 104], ojoD: [124, 104] },
    ojos: conOjos(76, 104, 124, 104, { estilo: 'oscuro' }) },
  gatito: { nombre: 'Gatito', etiqueta: 'Tu gatito', svg: svgGatito, abre: 14,
    pivote: { ...PIVOTE_PELUCHE, orejaI: [68, 60], orejaD: [132, 60], cola: [128, 186], ojoI: [78, 89], ojoD: [122, 89] },
    ojos: conOjos(78, 89, 122, 89, { estilo: 'oscuro' }) },
  perrito: { nombre: 'Perrito', etiqueta: 'Tu perrito', svg: svgPerrito, abre: 14, orejasCaen: true,   /* orejas que cuelgan: lo que al tigre le levanta la oreja, al perro se la baja */
    pivote: { ...PIVOTE_PELUCHE, orejaI: [62, 56], orejaD: [138, 56], cola: [130, 180], ojoI: [78, 87], ojoD: [122, 87] },
    ojos: conOjos(78, 87, 122, 87, { estilo: 'oscuro' }) },
};
