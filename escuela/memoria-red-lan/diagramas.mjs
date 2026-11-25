/* Diagramas de la memoria técnica (SVG). Todos salen del mismo plan de la red: si cambia un puerto o una
   dirección aquí, tiene que cambiar también en memoria.html (configuraciones y tablas). */
const OS = '#0B2545', AZ = '#1565C0', CI = '#0EA5E9', GR = '#5B6675', LN = '#9AA8BA', CL = '#EEF3F9', SV = '#3B5B86';
const F = 'font-family="Inter, sans-serif"';
const t = (x, y, s, { tam = 11, peso = 500, col = '#1C2533', anc = 'middle', it = false } = {}) =>
  `<text x="${x}" y="${y}" ${F} font-size="${tam}" font-weight="${peso}" fill="${col}" text-anchor="${anc}"${it ? ' font-style="italic"' : ''}>${s}</text>`;
const flecha = (x, y, ang, col = '#fff', l = 7) => {
  const r = ang * Math.PI / 180, x2 = x + Math.cos(r) * l, y2 = y + Math.sin(r) * l;
  const a1 = r + 2.6, a2 = r - 2.6;
  return `<path d="M${x} ${y} L${x2} ${y2} M${x2} ${y2} L${x2 + Math.cos(a1) * 3.2} ${y2 + Math.sin(a1) * 3.2} M${x2} ${y2} L${x2 + Math.cos(a2) * 3.2} ${y2 + Math.sin(a2) * 3.2}" stroke="${col}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
};
/* símbolos (notación habitual de diagramas de red) */
export const router = (x, y, r = 19) => `<g><ellipse cx="${x}" cy="${y + 5}" rx="${r}" ry="${r * .42}" fill="#061733"/><rect x="${x - r}" y="${y - 3}" width="${2 * r}" height="8" fill="#061733"/><ellipse cx="${x}" cy="${y - 3}" rx="${r}" ry="${r * .42}" fill="${OS}"/>
  ${flecha(x - 13, y - 3, 0)}${flecha(x + 13, y - 3, 180)}${flecha(x - 2, y - 3, -90, '#fff', 5)}${flecha(x + 2, y - 3, 90, '#fff', 5)}</g>`;
export const sw = (x, y, w = 110, h = 26, col = AZ) => `<g><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3" fill="${col}"/>
  ${flecha(x - 30, y - 4, 0)}${flecha(x - 16, y + 4, 180)}${flecha(x + 16, y - 4, 0)}${flecha(x + 30, y + 4, 180)}</g>`;
export const servidor = (x, y) => `<g><rect x="${x - 11}" y="${y - 17}" width="22" height="34" rx="2" fill="${SV}"/><path d="M${x - 7} ${y - 9}h14M${x - 7} ${y - 3}h14M${x - 7} ${y + 3}h14" stroke="#CFE0F5" stroke-width="1.4"/><circle cx="${x + 5}" cy="${y + 11}" r="1.6" fill="#8FD18F"/></g>`;
export const pc = (x, y, col = OS) => `<g><rect x="${x - 11}" y="${y - 10}" width="22" height="15" rx="1.5" fill="none" stroke="${col}" stroke-width="1.6"/><path d="M${x} ${y + 5}v4M${x - 6} ${y + 9.5}h12" stroke="${col}" stroke-width="1.6"/></g>`;
export const impresora = (x, y, col = OS) => `<g><rect x="${x - 6}" y="${y - 10}" width="12" height="6" fill="none" stroke="${col}" stroke-width="1.4"/><rect x="${x - 11}" y="${y - 4}" width="22" height="10" rx="1.5" fill="${col}"/><rect x="${x - 6}" y="${y + 3}" width="12" height="7" fill="#fff" stroke="${col}" stroke-width="1.4"/></g>`;
export const ap = (x, y) => `<g><rect x="${x - 15}" y="${y - 5}" width="30" height="10" rx="5" fill="${CI}"/><path d="M${x - 7} ${y - 9}q7 -6 14 0M${x - 11} ${y - 13}q11 -9 22 0" stroke="${CI}" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
export const nube = (x, y) => `<path d="M${x - 46} ${y + 12} q-16 0 -16 -14 q0 -14 16 -14 q4 -16 22 -14 q10 -12 28 -6 q18 -6 26 8 q20 0 20 16 q0 14 -18 14 Z" fill="${CL}" stroke="${LN}" stroke-width="1.4"/>`;
const linea = (x1, y1, x2, y2, { col = OS, w = 1.6, dash = '' } = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const caja = (x, y, w, h, { fondo = '#fff', borde = LN, r = 4, dash = '' } = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fondo}" stroke="${borde}" stroke-width="1"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;

/* ── 1. topología física ── */
export function fisica(){
  let s = `<svg viewBox="0 0 800 618" xmlns="http://www.w3.org/2000/svg">`;
  s += caja(96, 98, 690, 300, { fondo: '#F6F8FB', borde: '#B9CCE6', dash: '5 4', r: 8 });
  s += t(774, 116, 'Cuarto de telecomunicaciones · rack 19" de 24U · UPS', { tam: 10, peso: 700, col: AZ, anc: 'end' });
  s += nube(400, 46) + t(400, 50, 'Internet', { tam: 11, peso: 700, col: OS });
  s += linea(400, 64, 400, 132, { w: 2 }) + t(410, 92, 'Enlace del proveedor (fibra óptica / ONT)', { tam: 9.5, col: GR, anc: 'start' });
  s += router(400, 146) + t(428, 142, 'R-BORDE · Cisco ISR 1111-8P', { tam: 11, peso: 700, col: OS, anc: 'start' }) + t(428, 156, 'G0/0/0 (WAN): 203.0.113.2/30', { tam: 9.5, col: GR, anc: 'start' });
  s += linea(400, 158, 400, 226, { w: 2.2 }) + t(390, 196, 'G0/0/1 ⇄ Gi1/0/24 · troncal 802.1Q', { tam: 9.5, col: GR, anc: 'end' });
  s += sw(400, 240, 120) + t(332, 236, 'SW-CORE', { tam: 11, peso: 700, col: OS, anc: 'end' }) + t(332, 249, 'Catalyst C1000-24T-4G-L', { tam: 9.5, col: GR, anc: 'end' });
  /* servidores */
  const srv = [['SRV-01', 'AD DS · DNS · 192.168.60.10', 'Gi1/0/5', 160], ['SRV-02', 'Archivos · DNS 2.º · .60.11', 'Gi1/0/6', 206], ['NAS-01', 'Respaldos · 192.168.60.12', 'Gi1/0/7', 252]];
  for(const [n, d, p, y] of srv){
    s += `<path d="M460 240 C540 240 540 ${y} 622 ${y}" fill="none" stroke="${OS}" stroke-width="1.4"/>` + servidor(636, y);
    s += t(654, y - 3, n, { tam: 10, peso: 700, col: OS, anc: 'start' }) + t(654, y + 10, d, { tam: 8.6, col: GR, anc: 'start' }) + t(612, y - 7, p, { tam: 8.8, col: AZ, anc: 'end' });
  }
  /* troncales agregadas */
  const po = (x1, y1, x2, y2) => linea(x1 - 3, y1, x2 - 3, y2, { w: 1.8 }) + linea(x1 + 3, y1, x2 + 3, y2, { w: 1.8 });
  s += po(370, 253, 205, 346) + po(430, 253, 595, 346);
  s += `<ellipse cx="288" cy="300" rx="9" ry="4" fill="none" stroke="${AZ}" stroke-width="1.4" transform="rotate(-29 288 300)"/><ellipse cx="512" cy="300" rx="9" ry="4" fill="none" stroke="${AZ}" stroke-width="1.4" transform="rotate(29 512 300)"/>`;
  s += t(232, 296, 'Po1 · LACP 2 × 1 Gb/s', { tam: 9.5, peso: 700, col: AZ, anc: 'end' }) + t(232, 308, 'Gi1/0/1-2 ⇄ Gi1/0/47-48', { tam: 8.6, col: GR, anc: 'end' });
  s += t(568, 296, 'Po2 · LACP 2 × 1 Gb/s', { tam: 9.5, peso: 700, col: AZ, anc: 'start' }) + t(568, 308, 'Gi1/0/3-4 ⇄ Gi1/0/47-48', { tam: 8.6, col: GR, anc: 'start' });
  s += sw(200, 360, 120) + t(200, 388, 'SW-ACC1 · C1000-48P-4G-L (PoE+)', { tam: 10, peso: 700, col: OS });
  s += sw(600, 360, 120) + t(600, 388, 'SW-ACC2 · C1000-48P-4G-L (PoE+)', { tam: 10, peso: 700, col: OS });
  s += linea(260, 360, 540, 360, { col: GR, w: 1.6, dash: '6 4' }) + t(400, 352, 'Gi1/0/46 ⇄ Gi1/0/46 · enlace redundante', { tam: 9, col: GR }) + t(400, 372, '(RSTP lo deja en bloqueo mientras Po1 y Po2 funcionan)', { tam: 8.4, col: GR, it: true });
  /* áreas */
  s += t(22, 584, 'Cableado horizontal UTP Cat 6:', { tam: 9.5, col: GR, it: true, anc: 'start' }) + t(22, 598, 'panel PP-A → SW-ACC1 · panel PP-B → SW-ACC2', { tam: 9.5, col: GR, it: true, anc: 'start' });
  const area = (x, y, w, icono, l1, l2) => caja(x, y, w, 46, { fondo: '#fff', borde: '#C9D4E3' }) + icono(x + 20, y + 23) + t(x + 38, y + 20, l1, { tam: 9.6, peso: 700, col: OS, anc: 'start' }) + t(x + 38, y + 34, l2, { tam: 8.6, col: GR, anc: 'start' });
  const izq = [[pc, 'Atención al cliente', '10 PC · VLAN 40'], [impresora, 'IMP-ATC', 'impresora · VLAN 70'], [pc, 'Sala de juntas', 'videoconf. y pantalla · VLAN 80'], [ap, 'AP-01 y AP-03', 'Wi-Fi · VLAN 90 / 100']];
  const der = [[pc, 'Dirección', '3 PC · VLAN 10'], [pc, 'Administración', '8 PC · VLAN 20'], [pc, 'Recursos Humanos', '4 PC · VLAN 30'], [pc, 'Sistemas', '3 PC · VLAN 50'], [impresora, 'IMP-DIR · IMP-ADM', 'impresoras · VLAN 70'], [ap, 'AP-02', 'Wi-Fi · VLAN 90 / 100']];
  /* cada switch baja a una barra y de ahí a sus áreas (dos columnas por lado) */
  const lado = (sx, x0, lista) => { const cs = [x0 + 86, x0 + 268]; s += linea(sx, 394, sx, 436, { w: 1.4 }) + linea(cs[0], 436, cs[1], 436, { w: 1.4 });
    const pos = (i) => [x0 + (i % 2) * 182, 450 + Math.floor(i / 2) * 58];
    lista.forEach((_, i) => { const [x, y] = pos(i); s += linea(x + 86, 436, x + 86, y, { w: 1.2, col: LN }); });   /* primero las líneas: las cajas las tapan */
    lista.forEach(([ic, a, b], i) => { const [x, y] = pos(i); s += area(x, y, 172, ic, a, b); }); };
  lado(200, 22, izq); lado(600, 424, der);
  s += '</svg>';
  return s;
}

/* ── 2. topología lógica ── */
export const VLANS = [
  [10, 'DIRECCION', '192.168.10.0/24', '192.168.10.1', 'PC de Dirección', 'u'],
  [20, 'ADMINISTRACION', '192.168.20.0/24', '192.168.20.1', 'PC de Administración', 'u'],
  [30, 'RRHH', '192.168.30.0/24', '192.168.30.1', 'PC de Recursos Humanos', 'u'],
  [40, 'ATENCION', '192.168.40.0/24', '192.168.40.1', 'PC de Atención al cliente', 'u'],
  [50, 'SISTEMAS', '192.168.50.0/24', '192.168.50.1', 'PC del personal de TI', 'u'],
  [60, 'SERVIDORES', '192.168.60.0/24', '192.168.60.1', 'SRV-01, SRV-02, NAS-01', 's'],
  [70, 'IMPRESION', '192.168.70.0/24', '192.168.70.1', 'IMP-DIR, IMP-ADM, IMP-ATC', 's'],
  [80, 'SALA-JUNTAS', '192.168.80.0/24', '192.168.80.1', 'Videoconferencia y pantalla', 'u'],
  [90, 'WIFI-CORP', '192.168.90.0/24', '192.168.90.1', 'SSID DTB-Corporativo', 'w'],
  [99, 'GESTION', '192.168.99.0/24', '192.168.99.1', 'Switches y puntos de acceso', 'g'],
  [100, 'INVITADOS', '192.168.100.0/24', '192.168.100.1', 'SSID DTB-Invitados', 'w'],
];
const COLV = { u: AZ, s: OS, w: CI, g: GR };
export function logica(){
  let s = `<svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">`;
  s += nube(400, 36) + t(400, 40, 'Internet', { tam: 11, peso: 700, col: OS });
  s += linea(400, 54, 400, 96, { w: 2 }) + t(410, 78, 'NAT con sobrecarga (PAT) hacia 203.0.113.2', { tam: 9.5, col: GR, anc: 'start' });
  s += router(400, 110) + t(372, 106, 'R-BORDE', { tam: 11, peso: 700, col: OS, anc: 'end' }) + t(372, 119, 'enrutamiento entre VLAN, DHCP, NAT, ACL', { tam: 8.6, col: GR, anc: 'end' });
  s += caja(470, 84, 300, 66, { fondo: CL, borde: '#B9CCE6' }) + t(482, 101, '«Router-on-a-stick»: una subinterfaz por VLAN', { tam: 9.4, peso: 700, col: OS, anc: 'start' });
  s += t(482, 116, 'G0/0/1.10 → 192.168.10.1 … G0/0/1.100 → 192.168.100.1', { tam: 8.6, col: GR, anc: 'start' }) + t(482, 130, 'Cada subinterfaz es la puerta de enlace de su VLAN', { tam: 8.6, col: GR, anc: 'start' }) + t(482, 143, 'y etiqueta/desetiqueta tramas 802.1Q', { tam: 8.6, col: GR, anc: 'start' });
  s += linea(400, 122, 400, 176, { w: 3, col: AZ }) + t(390, 160, 'troncal 802.1Q (VLAN nativa 999 sin uso)', { tam: 9.5, col: AZ, anc: 'end' });
  s += caja(30, 176, 740, 40, { fondo: OS, borde: OS, r: 6 }) + t(400, 194, 'Dominio de conmutación de capa 2: SW-CORE, SW-ACC1 y SW-ACC2', { tam: 10.5, peso: 700, col: '#fff' }) + t(400, 208, 'troncales 802.1Q · EtherChannel LACP (Po1, Po2) · Rapid PVST+ con raíz en SW-CORE', { tam: 9, col: '#CFE0F5' });
  const W = 176, H = 76;
  VLANS.forEach((v, i) => { const x = 30 + (i % 4) * (W + 12) + W / 2, y = 240 + Math.floor(i / 4) * (H + 14); s += linea(x, 216, x, y, { col: '#C9D4E3', w: 1 }); });
  VLANS.forEach(([id, nom, red, gw, quien, tipo], i) => {
    const col = i % 4, fila = Math.floor(i / 4), x = 30 + col * (W + 12), y = 240 + fila * (H + 14), c = COLV[tipo];
    s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="5" fill="#fff" stroke="${c}" stroke-width="1.4"/><rect x="${x}" y="${y}" width="${W}" height="20" rx="5" fill="${c}"/><rect x="${x}" y="${y + 14}" width="${W}" height="6" fill="${c}"/>`;
    s += t(x + 8, y + 14, `VLAN ${id} · ${nom}`, { tam: 9.6, peso: 700, col: '#fff', anc: 'start' });
    s += t(x + 8, y + 36, red, { tam: 10, peso: 700, col: OS, anc: 'start' }) + t(x + 8, y + 51, 'Puerta de enlace ' + gw, { tam: 8.6, col: GR, anc: 'start' }) + t(x + 8, y + 66, quien, { tam: 8.6, col: GR, anc: 'start' });
  });
  const ly = 505; let lx = 30;
  for(const [k, n] of [['u', 'Usuarios por área'], ['s', 'Servicios'], ['w', 'Inalámbricas'], ['g', 'Gestión de la red']]){ s += `<rect x="${lx}" y="${ly - 9}" width="12" height="12" rx="2" fill="${COLV[k]}"/>` + t(lx + 18, ly + 1, n, { tam: 9.4, col: '#1C2533', anc: 'start' }); lx += 160; }
  s += t(770, ly + 1, 'VLAN 999: nativa de los troncales, sin hosts', { tam: 8.6, col: GR, anc: 'end', it: true });
  s += '</svg>';
  return s;
}

/* ── 3. plano de distribución de puntos de red (esquema sin escala) ── */
export function plano(){
  let s = `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="20" y="20" width="760" height="390" fill="#fff" stroke="${OS}" stroke-width="3"/>`;
  const sala = (x, y, w, h, nom, sub) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F6F8FB" stroke="${OS}" stroke-width="1.6"/>` + t(x + 10, y + 20, nom, { tam: 11, peso: 700, col: OS, anc: 'start' }) + t(x + 10, y + 34, sub, { tam: 9, col: GR, anc: 'start' });
  s += sala(20, 20, 300, 230, 'Atención al cliente y recepción', '10 puestos · 12 salidas de datos + 1 impresora');
  s += sala(20, 250, 300, 160, 'Sala de juntas', '3 salidas (videoconferencia, pantalla, reserva)');
  s += sala(320, 20, 230, 140, 'Dirección', '3 puestos · 5 salidas + 1 impresora');
  s += sala(320, 160, 230, 250, 'Administración', '8 puestos · 10 salidas + 1 impresora compartida');
  s += sala(550, 20, 230, 140, 'Recursos Humanos', '4 puestos · 5 salidas');
  s += sala(550, 160, 230, 140, 'Sistemas', '3 puestos · 4 salidas');
  s += sala(550, 300, 230, 110, 'Área común', 'sin salidas cableadas (cubierta por AP-02)');
  /* salidas de datos: cuadritos sobre las paredes */
  const salidas = (x0, y0, n, dx = 20) => { let r = ''; for(let i = 0; i < n; i++) r += `<rect x="${x0 + i * dx}" y="${y0}" width="9" height="9" fill="${AZ}"/>`; return r; };
  s += salidas(36, 226, 12) + salidas(36, 386, 3) + salidas(336, 136, 5) + salidas(336, 386, 10) + salidas(566, 136, 5) + salidas(566, 276, 4);
  s += impresora(286, 70) + impresora(520, 70) + impresora(520, 210);
  s += ap(170, 130) + t(170, 152, 'AP-01', { tam: 9, peso: 700, col: CI }) + ap(170, 320) + t(170, 342, 'AP-03', { tam: 9, peso: 700, col: CI }) + ap(470, 300) + t(470, 322, 'AP-02', { tam: 9, peso: 700, col: CI });
  /* rack y charola */
  s += `<rect x="726" y="186" width="34" height="56" fill="${OS}"/>` + t(743, 254, 'Rack', { tam: 9, peso: 700, col: OS }) + t(743, 266, '24U', { tam: 8.4, col: GR });
  s += `<path d="M726 244 H30 M440 244 V150 M660 244 V150" fill="none" stroke="${GR}" stroke-width="1.4" stroke-dasharray="7 4"/>`;
  s += t(445, 258, 'charola por plafón (cableado horizontal)', { tam: 9, col: GR, it: true, anc: 'start' });
  /* leyenda */
  s += `<rect x="30" y="424" width="9" height="9" fill="${AZ}"/>` + t(45, 432, 'Salida de datos RJ45 Cat 6 (45 enlaces en total, incluidos 3 de puntos de acceso)', { tam: 9, col: '#1C2533', anc: 'start' });
  s += t(780, 432, 'Esquema sin escala · planta de 38 m × 20 m', { tam: 9, col: GR, anc: 'end', it: true });
  s += '</svg>';
  return s;
}

/* ── 4. elevación del rack ── */
export function rack(){
  const U = 17, x = 110, top = 30, w = 200;
  const piezas = [[24, 2, 'PP-A · panel de parcheo 48 p. Cat 6 (SW-ACC1)', '#D8E2EF'], [22, 1, 'Organizador horizontal', '#F1F4F8'], [21, 1, 'SW-ACC1 · C1000-48P-4G-L', AZ], [20, 1, 'SW-ACC2 · C1000-48P-4G-L', AZ], [19, 1, 'Organizador horizontal', '#F1F4F8'],
    [18, 2, 'PP-B · panel de parcheo 48 p. Cat 6 (SW-ACC2)', '#D8E2EF'], [16, 1, 'Organizador horizontal', '#F1F4F8'], [15, 1, 'SW-CORE · C1000-24T-4G-L', AZ], [14, 1, 'R-BORDE · ISR 1111-8P (charola)', OS], [13, 1, 'ONT del proveedor (charola)', '#6B7A8F'],
    [12, 1, 'Libre', null], [11, 1, 'SRV-01 · servidor 1U', SV], [10, 1, 'SRV-02 · servidor 1U', SV], [9, 1, 'NAS-01 · almacenamiento de respaldos', SV], [8, 4, 'Libre (crecimiento)', null], [4, 1, 'PDU · regleta de energía', '#6B7A8F'], [3, 1, 'Libre', null], [2, 2, 'UPS 2U en línea', '#2F3B4C']];
  let s = `<svg viewBox="0 0 420 470" xmlns="http://www.w3.org/2000/svg">`;
  s += `<rect x="${x - 14}" y="${top - 12}" width="${w + 28}" height="${24 * U + 24}" rx="4" fill="#2A3443"/>`;
  for(const [u, alto, nom, col] of piezas){
    const y = top + (24 - u) * U;
    const fondo = col || '#fff', claro = !col || col.startsWith('#D') || col.startsWith('#F');
    s += `<rect x="${x}" y="${y + .5}" width="${w}" height="${alto * U - 1}" fill="${fondo}" stroke="#2A3443" stroke-width="1"${!col ? ' stroke-dasharray="3 2"' : ''}/>`;
    s += t(x + w / 2, y + alto * U / 2 + 3.5, nom, { tam: 8.4, peso: col ? 600 : 400, col: claro ? (col ? OS : GR) : '#fff' });
    for(let k = 0; k < alto; k++) s += t(x - 20, y + k * U + U / 2 + 3, 'U' + (u - k), { tam: 8.5, col: GR, anc: 'end' });
  }
  s += t(x + w / 2, top + 24 * U + 30, 'Gabinete de piso 19" · 24U · con puerta, ventilación y tierra física', { tam: 9, col: GR, it: true });
  s += '</svg>';
  return s;
}

/* ── 5. recorrido de un mensaje por las capas ── */
export function recorrido(){
  const cols = [['PC-ATC-03', 'VLAN 40', 7], ['SW-ACC1', 'conmutador', 2], ['SW-CORE', 'conmutador', 2], ['R-BORDE', 'enrutador', 3], ['SW-CORE', 'conmutador', 2], ['SRV-02', 'VLAN 60', 7]];
  const capas = ['Física', 'Enlace', 'Red', 'Transporte', 'Sesión', 'Presentación', 'Aplicación'];
  const W = 116, gap = 14, x0 = 13, base = 290, h = 33;
  let s = `<svg viewBox="0 0 800 330" xmlns="http://www.w3.org/2000/svg">`;
  const centros = [];
  cols.forEach(([n, sub, hasta], i) => {
    const x = x0 + i * (W + gap); centros.push(x + W / 2);
    for(let c = 0; c < hasta; c++){
      const y = base - (c + 1) * h; const col = c === 0 ? '#3B5B86' : c === 1 ? AZ : c === 2 ? OS : '#7B8BA3';
      s += `<rect x="${x}" y="${y}" width="${W}" height="${h - 3}" rx="3" fill="${col}"/>` + t(x + W / 2, y + 19.5, capas[c], { tam: 11.5, peso: 600, col: '#fff' });
    }
    s += t(x + W / 2, base + 18, n, { tam: 12, peso: 700, col: OS }) + t(x + W / 2, base + 33, sub, { tam: 10.5, col: GR });
  });
  s += t(400, 22, 'Un empleado de Atención al cliente abre un archivo compartido en SRV-02 (SMB sobre TCP/445)', { tam: 12.5, peso: 700, col: OS });
  s += t(400, 40, 'Cada equipo procesa la información hasta la capa que necesita: los switches, hasta la 2; el router, hasta la 3', { tam: 11, col: GR, it: true });
  for(let i = 0; i < cols.length - 1; i++){ const xa = x0 + i * (W + gap) + W; s += flecha(xa + 2, base - 16, 0, CI, gap - 4); }
  s += '</svg>';
  return s;
}
