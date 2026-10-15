/* LA SOCIEDAD · el núcleo: hablar con el servidor, quién soy, y las piezas que
   usan todas las pantallas (la hoja de abajo, el aviso flotante, fechas).

   La cuenta es LA DE FADORI, a propósito: mismo sitio, misma memoria del
   teléfono. Se leen las mismas llaves (`fadori_aparato`, `fadori_yo`), así que
   quien ya entró a la cooperativa ya entró aquí, y al revés. */

const L = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k, v){ try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); }catch(e){} },
};
export { L };

/* el servidor: el mismo de Fadori. Publicado se conecta solo; en local sólo
   si alguien puso la dirección a mano (o la mesa de pruebas la redirige) */
export const API = (() => {
  const v = L.get('fadori_servidor') || '';
  if(v === 'local') return '';
  if(v) return v.replace(/\/+$/, '');
  return /(^|\.)mazi-central\.palomazi9111\.workers\.dev$/.test(location.hostname) ? 'https://fadori.palomazi9111.workers.dev' : '';
})();
export const CASA = (L.get('fadori_casa') || 'rembrandt').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'rembrandt';

export function aparato(){
  let v = L.get('fadori_aparato') || '';
  if(!/^[a-f0-9]{32}$/.test(v)){
    const b = new Uint8Array(16); crypto.getRandomValues(b);
    v = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    L.set('fadori_aparato', v);
  }
  return v;
}
export const miCodigo = () => (L.get('fadori_yo') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const llaveMostrador = () => { try{ const j = JSON.parse(L.get('fadori_llave_mostrador') || 'null'); return j && /^[a-f0-9]{64}$/.test(j.token || '') && j.vence > Date.now() ? j.token : ''; }catch(e){ return ''; } };
const cabezas = (json = true) => {
  const h = { 'x-fadori-aparato': aparato() }; if(json) h['content-type'] = 'application/json';
  const l = llaveMostrador(); if(l) h['x-fadori-admin'] = l;
  return h;
};

/* una llamada a la sociedad: { ok, st, j } y nunca truena */
export async function soc(que, cuerpo = {}){
  if(!API) return { ok: false, st: 0, j: { error: 'Esta página necesita internet y el servidor de la escuela.' } };
  try{
    const r = await fetch(API + '/api/soc/' + que + '?casa=' + encodeURIComponent(CASA),
      { method: 'POST', headers: cabezas(), body: JSON.stringify(Object.assign({ yo: miCodigo() }, cuerpo)) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, st: r.status, j };
  }catch(e){ return { ok: false, st: 0, j: { error: 'Sin conexión. Revisa tu internet.' } }; }
}

/* entrar con el correo y la contraseña de Fadori */
export async function entrar(correo, clave){
  if(!API) return { error: 'Sin servidor.' };
  let r, j;
  try{
    r = await fetch(API + '/api/cuenta/entrar?casa=' + encodeURIComponent(CASA), { method: 'POST', headers: cabezas(), body: JSON.stringify({ correo, clave }) });
    j = await r.json().catch(() => ({}));
  }catch(e){ return { error: 'Sin conexión.' }; }
  if(!r.ok || !j.alumno) return { error: j.error || 'No se pudo entrar.' };
  const a = j.alumno, cod = a.codigo || a.id;
  L.set('fadori_yo', cod);
  let mios = []; try{ mios = JSON.parse(L.get('fadori_mios') || '[]') || []; }catch(e){}
  if(mios.indexOf(cod) < 0) mios.push(cod); L.set('fadori_mios', JSON.stringify(mios.slice(-10)));
  /* que Fadori también lo tenga, sin esperar a su siguiente vuelta */
  try{
    const d = JSON.parse(L.get('fadori_v1') || 'null');
    if(d && d.alumnos && !d.alumnos[cod]){ d.alumnos[cod] = Object.assign({}, a, { codigo: cod }); L.set('fadori_v1', JSON.stringify(d)); }
  }catch(e){}
  return { ok: true, cod };
}
export function salir(){ L.set('fadori_yo', null); }

/* ── los archivos: en pedazos de 1 MB ─────────────────────────────────── */
const PARTE = 1024 * 1024;
const nidArchivo = () => 'f' + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');
export async function subirArchivo(blob, mime, alAvance){
  const id = nidArchivo(), n = Math.ceil(blob.size / PARTE);
  for(let k = 0; k < n; k++){
    const trozo = blob.slice(k * PARTE, (k + 1) * PARTE);
    let ultimo = null;
    for(let intento = 0; intento < 4; intento++){
      try{
        const r = await fetch(API + '/api/soc/archivo?casa=' + encodeURIComponent(CASA) + '&id=' + id + '&k=' + k + '&n=' + n + '&tam=' + blob.size +
          '&mime=' + encodeURIComponent(mime) + '&yo=' + miCodigo(), { method: 'POST', headers: cabezas(false), body: trozo });
        const j = await r.json().catch(() => ({}));
        if(r.ok){ ultimo = null; break; }
        ultimo = j.error || 'No se pudo subir.'; if(r.status < 500 && r.status !== 429) break;
      }catch(e){ ultimo = 'Se cortó la conexión.'; }
      await new Promise(s => setTimeout(s, 800 * (intento + 1)));
    }
    if(ultimo) throw new Error(ultimo);
    alAvance && alAvance((k + 1) / n);
  }
  return id;
}
const cacheArchivos = new Map();
export async function bajarArchivo(f){
  if(cacheArchivos.has(f.id)) return cacheArchivos.get(f.id);
  const partes = [];
  for(let k = 0; k < (f.partes || 1); k++){
    const r = await fetch(API + '/api/soc/archivo?casa=' + encodeURIComponent(CASA) + '&id=' + f.id + '&k=' + k + '&yo=' + miCodigo() + '&aparato=' + aparato());
    if(!r.ok) throw new Error('No se pudo abrir.');
    partes.push(await r.arrayBuffer());
  }
  const url = URL.createObjectURL(new Blob(partes, { type: f.mime || 'application/octet-stream' }));
  cacheArchivos.set(f.id, url);
  return url;
}
export async function bajarEpisodio(m){
  const partes = [];
  for(let k = 0; k < m.partes; k++){
    const r = await fetch(API + '/api/soc/archivo?casa=' + encodeURIComponent(CASA) + '&radio=1&id=' + m.id + '&k=' + k);
    if(!r.ok) throw new Error('No se pudo bajar.');
    partes.push(await r.arrayBuffer());
  }
  return URL.createObjectURL(new Blob(partes, { type: m.mime || (m.esAudio ? 'audio/mpeg' : 'video/mp4') }));
}

/* una foto del teléfono, achicada: lado largo `max` y que pese menos de `peso` */
export async function achicar(archivo, max = 1600, peso = 450000){
  const url = URL.createObjectURL(archivo);
  try{
    const img = await new Promise((si, no) => { const i = new Image(); i.onload = () => si(i); i.onerror = () => no(new Error('Esa imagen no se pudo abrir.')); i.src = url; });
    let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
    let q = .86, b;
    do{ b = await new Promise(s => c.toBlob(s, 'image/jpeg', q)); q -= .1; }while(b && b.size > peso && q > .35);
    return b;
  }finally{ URL.revokeObjectURL(url); }
}
export async function aDato(blob){ return await new Promise(s => { const r = new FileReader(); r.onload = () => s(r.result); r.readAsDataURL(blob); }); }

/* ── piezas de pantalla ───────────────────────────────────────────────── */
export const e = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ico = (n, c) => window.ICONOS.ico(n, c);
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DSEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
/* '2026-11-20' o '2026-11-20T17:00' → fecha local (la de la escuela) */
export function aFecha(s){
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(s || '')); if(!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}
export function fechaBonita(s, conHora = true){
  const d = aFecha(s); if(!d) return '';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - hoy) / 864e5);
  const dia = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : dias === -1 ? 'Ayer' : DSEM[d.getDay()] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()];
  const hora = conHora && /T/.test(s) ? ' · ' + ((d.getHours() % 12) || 12) + ':' + String(d.getMinutes()).padStart(2, '0') + (d.getHours() < 12 ? ' am' : ' pm') : '';
  return dia + hora;
}
export const diaMes = (s) => { const d = aFecha(s); return d ? { d: d.getDate(), m: MESES[d.getMonth()] } : null; };
export function hace(t){
  const s = Math.max(0, (Date.now() - t) / 1000);
  if(s < 60) return 'ahora'; if(s < 3600) return Math.floor(s / 60) + ' min';
  if(s < 86400) return Math.floor(s / 3600) + ' h';
  const d = new Date(t); return d.getDate() + ' ' + MESES[d.getMonth()];
}
export const horaDe = (t) => { const d = new Date(t); return ((d.getHours() % 12) || 12) + ':' + String(d.getMinutes()).padStart(2, '0'); };
export const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/* «2026-11-20T17:00» para un <input type=datetime-local> y de regreso */
export const paraInput = (s) => String(s || '').slice(0, 16);

let brindisT = 0;
export function brindis(t){
  const b = $('#brindis'); b.textContent = t; b.classList.add('ver');
  clearTimeout(brindisT); brindisT = setTimeout(() => b.classList.remove('ver'), 2800);
}

/* LA HOJA: lo que se abre desde abajo (formularios, detalles). Un <dialog>
   de verdad: atrapa el foco, se cierra con Esc y con el botón de atrás. */
export function hoja(titulo, html, alMontar){
  let d = $('#hoja');
  if(d.open) d.close();
  d.innerHTML = '<div class="h-cab"><h2>' + e(titulo) + '</h2><button class="ico-btn" data-cerrar aria-label="Cerrar">' + ico('x') + '</button></div><div class="h-cuerpo">' + html + '</div>';
  d.querySelector('[data-cerrar]').onclick = () => d.close();
  d.onclick = (ev) => { if(ev.target === d) d.close(); };
  d.showModal();
  const c = d.querySelector('.h-cuerpo');
  alMontar && alMontar(c, () => d.close());
  return c;
}
export const cerrarHoja = () => { const d = $('#hoja'); if(d.open) d.close(); };

/* leer un formulario como objeto (las palomitas como true/false) */
export function leer(form){
  const o = {};
  for(const el of form.elements){
    if(!el.name) continue;
    o[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  return o;
}
