/* LA SOCIEDAD · el reloj de clases. Sin pantalla: sólo cuentas, para poder
   probarlo en Node con cualquier hora.

   Un horario es { grupo, dias: { '1': [{ ini:'07:00', fin:'07:50', materia, salon, color }], … } }
   con 1 = lunes … 6 = sábado. La hora es la de la Ciudad de México, no la del
   teléfono: un teléfono con la zona mal puesta enseñaría la clase de otra hora. */

const FMT = (() => {
  try{ return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); }
  catch(e){ return null; }
})();
const DIAS_EN = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/* { dia: 1..7, seg: segundos desde las 00:00 } en México */
export function ahoraMx(ms = Date.now()){
  if(FMT){
    const p = {}; for(const x of FMT.formatToParts(new Date(ms))) p[x.type] = x.value;
    const h = Number(p.hour) % 24;
    return { dia: DIAS_EN[p.weekday] || 1, seg: h * 3600 + Number(p.minute) * 60 + Number(p.second) };
  }
  const d = new Date(ms); return { dia: d.getDay() || 7, seg: d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() };
}
export const aSeg = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '')); return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 : NaN; };
export const hora12 = (hhmm) => { const s = aSeg(hhmm); if(!(s >= 0)) return ''; const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' am' : ' pm'); };

/* «faltan 23 min», «falta 1 h 05» */
export function cuanto(seg){
  const m = Math.max(0, Math.ceil(seg / 60));
  if(m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') : '');
}

/* Lo que toca ahora. estado:
   'clase'   → hay clase: actual, siguiente, progreso 0..1, quedan (s)
   'entre'   → hueco entre dos clases (receso): siguiente, quedan hasta que empiece
   'antes'   → todavía no empieza el día: siguiente = la primera
   'fin'     → ya acabó el día: manana = la primera del siguiente día con clases
   'sin'     → este grupo no tiene horario capturado */
export function queToca(h, ms = Date.now()){
  if(!h || !h.dias) return { estado: 'sin' };
  const { dia, seg } = ahoraMx(ms);
  const hoy = bloques(h, dia);
  const hayAlgo = Object.keys(h.dias).some(d => (h.dias[d] || []).length);
  if(!hayAlgo) return { estado: 'sin' };
  for(let i = 0; i < hoy.length; i++){
    const b = hoy[i], ini = aSeg(b.ini), fin = aSeg(b.fin);
    if(seg >= ini && seg < fin) return { estado: 'clase', actual: b, siguiente: hoy[i + 1] || null, progreso: (seg - ini) / Math.max(1, fin - ini), quedan: fin - seg, i, hoy };
    if(seg < ini) return { estado: i === 0 ? 'antes' : 'entre', anterior: hoy[i - 1] || null, siguiente: b, quedan: ini - seg,
      progreso: i === 0 ? 0 : (seg - aSeg(hoy[i - 1].fin)) / Math.max(1, ini - aSeg(hoy[i - 1].fin)), i, hoy };
  }
  /* ya acabó: la primera del siguiente día con clases */
  for(let k = 1; k <= 7; k++){
    const d = ((dia - 1 + k) % 7) + 1, bs = bloques(h, d);
    if(bs.length) return { estado: 'fin', manana: bs[0], diaManana: d, enDias: k, hoy };
  }
  return { estado: 'sin' };
}
export function bloques(h, dia){
  return ((h && h.dias && h.dias[String(dia)]) || []).filter(b => aSeg(b.ini) < aSeg(b.fin)).slice().sort((a, b) => aSeg(a.ini) - aSeg(b.ini));
}

/* el color de una materia que no trae color: siempre el mismo para el mismo
   nombre, de una paleta que se lee con letra blanca (contraste ≥ 4.5) */
const PALETA = ['#1E5083', '#8C2D18', '#3F6B45', '#5D2469', '#8A6516', '#123A5E', '#7C1D24', '#4A4E69', '#0F5F5C', '#6B3E8E'];
export function colorDe(b){
  if(b && /^#[0-9a-f]{6}$/i.test(b.color || '')) return b.color;
  const n = String((b && b.materia) || b || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let x = 0; for(const c of n) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  return PALETA[x % PALETA.length];
}

/* Pegar un horario desde Excel o Sheets: la primera fila trae los días y la
   primera columna las horas («7:00-7:50» o «7:00 a 7:50»). Cada celda es la
   materia, y si trae salón va después de una coma o entre paréntesis.
   También acepta renglones sueltos: «Lunes 7:00 7:50 Física B3». */
export function leerPegado(texto){
  const filas = String(texto || '').replace(/\r/g, '').split('\n').map(f => f.split('\t')).filter(f => f.some(c => c.trim()));
  const dias = {}; const pon = (d, b) => { (dias[d] = dias[d] || []).push(b); };
  const numDia = (t) => ({ lu: 1, ma: 2, mi: 3, ju: 4, vi: 5, sa: 6 })[norm(t).slice(0, 2)] || 0;
  const rango = (t) => { const m = /(\d{1,2})[:.](\d{2})\s*(?:-|–|a|al|hasta)\s*(\d{1,2})[:.](\d{2})/i.exec(String(t)); return m ? [pad(m[1] + ':' + m[2]), pad(m[3] + ':' + m[4])] : null; };
  const celda = (t) => { const s = String(t).trim(); if(!s) return null; const m = /^(.*?)(?:\s*[,(]\s*([^,)]+)\)?)?$/.exec(s); return { materia: (m[1] || s).trim().slice(0, 50), salon: (m[2] || '').trim().slice(0, 20) }; };
  if(filas.length > 1 && filas[0].length > 1 && filas[0].slice(1).some(c => numDia(c))){
    const cab = filas[0].map(numDia);
    for(const f of filas.slice(1)){
      const r = rango(f[0]); if(!r) continue;
      for(let j = 1; j < f.length; j++){ const c = celda(f[j] || ''); if(c && cab[j] && c.materia) pon(String(cab[j]), { ini: r[0], fin: r[1], materia: c.materia, salon: c.salon }); }
    }
  } else {
    for(const f of filas){
      const t = f.join(' ').trim();
      const m = /^(\S+)\s+(\d{1,2}[:.]\d{2})\s*(?:-|–|a)?\s*(\d{1,2}[:.]\d{2})\s+(.+)$/i.exec(t);
      if(!m || !numDia(m[1])) continue;
      const resto = m[4].trim(), s = /^(.*?)\s+([A-Z]{0,3}-?\d{1,3}[A-Z]?)$/.exec(resto);
      pon(String(numDia(m[1])), { ini: pad(m[2].replace('.', ':')), fin: pad(m[3].replace('.', ':')), materia: (s ? s[1] : resto).slice(0, 50), salon: s ? s[2] : '' });
    }
  }
  return dias;
}
const pad = (hm) => { const [h, m] = hm.split(':'); return String(Number(h)).padStart(2, '0') + ':' + m; };
const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
