/* Diagrama de la topología de la Clínica ABC (el mismo que se arma en Packet Tracer). */
import { router, sw, servidor, pc, impresora, ap, nube } from '../memoria-red-lan/diagramas.mjs';
const OS = '#1F2937', AZ = '#1D4ED8', GR = '#4B5563', LN = '#9CA3AF';
const t = (x, y, s, { tam = 11, peso = 500, col = '#111827', anc = 'middle', it = false } = {}) =>
  `<text x="${x}" y="${y}" font-family="Carlito, Calibri, sans-serif" font-size="${tam}" font-weight="${peso}" fill="${col}" text-anchor="${anc}"${it ? ' font-style="italic"' : ''}>${s}</text>`;
const l = (x1, y1, x2, y2, { col = OS, w = 1.6, dash = '' } = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const caja = (x, y, w, h, icono, a, b) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#fff" stroke="#CBD5E1"/>` + icono(x + 20, y + h / 2) + t(x + 38, y + h / 2 - 3, a, { tam: 11, peso: 700, anc: 'start' }) + t(x + 38, y + h / 2 + 11, b, { tam: 10, col: GR, anc: 'start' });

export function topologia(){
  let s = `<svg viewBox="0 0 760 560" xmlns="http://www.w3.org/2000/svg">`;
  /* desafío: proveedor e Internet */
  s += `<rect x="470" y="12" width="276" height="150" rx="6" fill="#F3F4F6" stroke="${LN}" stroke-dasharray="5 4"/>` + t(608, 30, 'Desafío: simulación de Internet', { tam: 10.5, peso: 700, col: GR });
  s += router(530, 90) + t(530, 122, 'ISP (2911)', { tam: 11, peso: 700 }) + t(530, 135, 'G0/0 200.0.0.1/30', { tam: 9.5, col: GR });
  s += l(549, 88, 652, 88) + t(600, 80, 'G0/1 → 8.8.8.1', { tam: 9.5, col: GR });
  s += servidor(670, 88) + t(670, 122, 'SRV-INTERNET', { tam: 11, peso: 700 }) + t(670, 135, '8.8.8.8 · DNS y web', { tam: 9.5, col: GR });
  /* router de la clínica */
  s += router(380, 90) + t(380, 60, 'R-CLINICA (2911)', { tam: 12, peso: 700 }) + t(380, 124, 'DHCP · NAT · ACL · subinterfaces', { tam: 9.5, col: GR });
  s += l(399, 90, 511, 90, { dash: '6 3' }) + t(455, 76, 'G0/0 200.0.0.2/30', { tam: 9.5, col: GR });
  s += l(380, 102, 380, 199, { w: 2.4, col: AZ }) + t(390, 160, 'G0/1 ⇄ Gi0/1 · troncal 802.1Q', { tam: 10, col: AZ, anc: 'start' });
  /* planta alta */
  s += `<rect x="14" y="180" width="732" height="150" rx="6" fill="#F9FAFB" stroke="#E5E7EB"/>` + t(26, 198, 'PLANTA ALTA', { tam: 10.5, peso: 700, col: GR, anc: 'start' });
  s += sw(380, 212, 120) + t(468, 216, 'SW-PA (2960-24TT)', { tam: 11, peso: 700, anc: 'start' });
  const pa = [[pc, 'Laboratorio', '5 PC · VLAN 30 · Fa0/1-5', 20], [impresora, 'IMP-LAB', 'VLAN 30 · Fa0/6 · .30.5', 186], [pc, 'Dirección', '3 PC · VLAN 40 · Fa0/7-9', 414], [servidor, 'SRV-EXP', 'expedientes · VLAN 50 · .50.10', 580]];
  for(const [ic, a, b, x] of pa){ s += l(x + 80, 256, x + 80, 270, { col: LN, w: 1.2 }); }
  s += l(100, 256, 660, 256, { col: LN, w: 1.2 }) + l(330, 225, 330, 256, { col: LN, w: 1.2 });
  for(const [ic, a, b, x] of pa) s += caja(x, 270, 160, 48, ic, a, b);
  /* EtherChannel entre plantas */
  /* EtherChannel: dos cables por el hueco del centro, de SW-PA a SW-PB */
  s += l(376, 225, 376, 407, { w: 2 }) + l(384, 225, 384, 407, { w: 2 }) + `<ellipse cx="380" cy="359" rx="10" ry="4" fill="#fff" stroke="${AZ}" stroke-width="1.4"/>`;
  s += t(396, 362, 'EtherChannel (LACP) · Fa0/23-24 ⇄ Fa0/23-24 · 2 cables cruzados', { tam: 10, col: AZ, anc: 'start' });
  /* planta baja */
  s += `<rect x="14" y="388" width="732" height="160" rx="6" fill="#F9FAFB" stroke="#E5E7EB"/>` + t(26, 406, 'PLANTA BAJA', { tam: 10.5, peso: 700, col: GR, anc: 'start' });
  s += sw(380, 420, 120) + t(468, 424, 'SW-PB (2960-24TT)', { tam: 11, peso: 700, anc: 'start' });
  const pb = [[pc, 'Recepción', '6 PC · VLAN 10 · Fa0/1-6', 20], [impresora, 'IMP-REC', 'VLAN 10 · Fa0/7 · .10.5', 186], [pc, 'Consultorios', '8 PC · VLAN 20 · Fa0/8-15', 414], [ap, 'AP + 2 laptops', 'VLAN 20 · Fa0/16 · Wi-Fi', 580]];
  s += l(100, 464, 660, 464, { col: LN, w: 1.2 }) + l(330, 433, 330, 464, { col: LN, w: 1.2 });
  for(const [ic, a, b, x] of pb){ s += l(x + 80, 464, x + 80, 480, { col: LN, w: 1.2 }); }
  for(const [ic, a, b, x] of pb) s += caja(x, 480, 160, 48, ic, a, b);
  s += '</svg>';
  return s;
}
