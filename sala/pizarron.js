/* ══════════════════════════════════════════════════════════════════════════
   EL PIZARRÓN · pendientes por proyecto (pizarron.html)
   ──────────────────────────────────────────────────────────────────────────
   Sin lag, a propósito:
   · se pinta primero lo que este teléfono guardó la última vez (localStorage)
     y luego llega lo de La Sala: abre al instante aunque la red tarde;
   · moverse y hacer zoom es UNA transformación del «mundo» (la GPU la hace);
   · arrastrar un elemento sólo toca ese elemento y sus flechas, una vez por cuadro;
   · se guarda sólo lo que cambió, 0.7 s después del último movimiento;
   · cada 15 s pregunta qué cambió en otros teléfonos (sólo eso, sin fotos).
   ═════════════════════════════════════════════════════════════════════════ */
import { ico } from './iconos-pizarra.js';
import { llave, ponerLlave, llamar, SERVIDOR, SALA } from '../presentaciones/ia.js';

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const guarda = { leer(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } }, poner(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} } };
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const COLORES = { amarillo: '#FFE98A', rosa: '#FFC6D9', verde: '#BFF0CF', azul: '#C4DDFF', morado: '#E2CCFF', naranja: '#FFD3A8', gris: '#E7E3DA' };
const TINTAS = { amarillo: '#B7791F', rosa: '#C2185B', verde: '#178A5C', azul: '#2156D9', morado: '#7C3AED', naranja: '#D9620B', gris: '#4A4656' };
const ESTADOS = [['pendiente', 'Pendiente'], ['curso', 'En curso'], ['hecho', 'Hecho'], ['bloqueado', 'Atorado']];

/* ── a La Sala ── */
async function pedir(cuerpo, q = '', metodo = cuerpo ? 'POST' : 'GET'){
  const r = await llamar(`${SERVIDOR}/api/sala/${SALA}/pizarron${q}`, { metodo, cuerpo, espera: 30000 });
  const j = await r.json().catch(() => ({}));
  if(r.status === 401 || (r.status === 403 && !/no acepta pedidos/.test(j.error || ''))){ $('#cajaLlave').hidden = false; throw new Error('Falta la llave de La Sala.'); }
  if(r.status === 404 && !j.error) throw new Error('El servidor de La Sala todavía no tiene el pizarrón: hay que publicarlo.');
  if(!r.ok || j.bien === false) throw new Error(j.error || `La Sala contestó ${r.status}.`);
  return j;
}
const urlFoto = (e) => `${SERVIDOR}/api/sala/${SALA}/pizarron?tablero=${encodeURIComponent(tablero)}&foto=${encodeURIComponent(e.id)}&v=${encodeURIComponent(e.src)}&llave=${encodeURIComponent(llave())}`;
function aviso(t, ms = 3500){ const a = $('#aviso'); a.textContent = t; a.hidden = !t; clearTimeout(aviso.r); if(t) aviso.r = setTimeout(() => { a.hidden = true; }, ms); }
function estado(cual){ const e = $('#estado'); e.className = 'estado' + (cual ? ' ' + cual : ''); e.title = { '': 'Guardado', guardando: 'Guardando…', error: 'No se pudo guardar; se reintenta solo' }[cual || '']; }

/* ══ ESTADO ═══════════════════════════════════════════════════════════════ */
let tableros = guarda.leer('piz.tableros', [{ id: 'general', nombre: 'Pendientes' }]);
let tablero = guarda.leer('piz.actual', 'general');
const els = new Map();               /* id → datos */
const nodos = new Map();             /* id → elemento del DOM */
let hora = 0, sel = null, flechaDesde = null;
const vista = $('#vista'), mundo = $('#mundo'), svgF = $('#flechas');
const cam = { x: 20, y: 90, z: 1 };

/* ══ PINTAR ═══════════════════════════════════════════════════════════════ */
function ponerCamara(){ mundo.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.z})`; vista.style.backgroundPosition = `${cam.x}px ${cam.y}px`; vista.style.backgroundSize = `${24 * cam.z}px ${24 * cam.z}px`; }
function contenido(e, n){
  const c = e.color || 'amarillo';
  n.className = 'el ' + e.tipo + (e.estado === 'hecho' && e.tipo === 'nota' ? ' hecho' : '') + (sel === e.id ? ' sel' : '');
  n.style.width = e.w + 'px'; n.style.height = e.tipo === 'texto' ? 'auto' : e.h + 'px'; n.style.zIndex = e.tipo === 'recuadro' ? 1 : (e.z || 2);
  n.style.background = e.tipo === 'nota' ? COLORES[c] : ''; n.style.color = e.tipo === 'nota' ? 'var(--tinta)' : TINTAS[c];
  let h = '';
  if(e.tipo === 'nota') h = `<div class="tx">${esc(e.texto || 'Nota nueva')}</div><div class="pie"><button class="pill ${e.estado || 'pendiente'}" data-estado>${esc((ESTADOS.find((s) => s[0] === (e.estado || 'pendiente')) || ESTADOS[0])[1])}</button>${e.quien ? `<span class="quien">${esc(e.quien)}</span>` : ''}${e.fecha ? `<span class="cuando">${esc(e.fecha)}</span>` : ''}</div>`;
  if(e.tipo === 'recuadro'){ const av = avanceDe(e); h = `<div class="tt">${esc(e.titulo || 'Fase')}</div>${av != null ? `<div class="av">${av}% hecho</div>` : ''}`; }
  if(e.tipo === 'texto') h = esc(e.texto || 'Texto');
  if(e.tipo === 'foto') h = `${e.src ? `<img alt="${esc(e.pie || 'Foto')}" loading="lazy" decoding="async" src="${esc(e.local || urlFoto(e))}">` : '<img alt="">'}<div class="pie">${esc(e.pie || '')}</div>`;
  if(e.tipo === 'linea'){ const hs = e.hitos || [], hechos = hs.filter((x) => x.hecho).length; const ult = hs.reduce((a, x, i) => x.hecho ? i : a, -1);
    h = `<div class="tt">${esc(e.titulo || 'Línea de tiempo')}</div><div class="eje" style="--hecho:${hs.length > 1 ? Math.max(0, ult) / (hs.length - 1) * 100 : hechos ? 100 : 0}%">${hs.map((x, i) => `<div class="hito ${x.hecho ? 'hecho' : ''}" data-hito="${i}"><i></i><b>${esc(x.texto)}</b>${x.fecha ? `<small>${esc(x.fecha)}</small>` : ''}</div>`).join('')}</div>`; }
  if(e.tipo === 'lista'){ const it = e.items || [], hechos = it.filter((x) => x.hecho).length;
    h = `<div class="tt">${esc(e.titulo || 'Lista')}</div><div class="bar"><i style="width:${it.length ? hechos / it.length * 100 : 0}%"></i></div><ul>${it.map((x, i) => `<li class="${x.hecho ? 'hecho' : ''}" data-item="${i}"><span class="ca">${x.hecho ? ico('check') : ''}</span><span>${esc(x.texto)}</span></li>`).join('')}</ul>`; }
  n.innerHTML = h + '<span class="manija" data-manija aria-hidden="true"></span>';
}
function colocar(e, n = nodos.get(e.id)){ if(n) n.style.transform = `translate3d(${e.x}px, ${e.y}px, 0)`; }
function pintarUno(e){
  if(e.tipo === 'flecha' || e.borrado){ nodos.get(e.id)?.remove(); nodos.delete(e.id); return; }
  let n = nodos.get(e.id); if(!n){ n = document.createElement('div'); n.dataset.id = e.id; mundo.append(n); nodos.set(e.id, n); }
  contenido(e, n); colocar(e, n);
}
/* qué tanto de lo que cae DENTRO de un recuadro (una fase) está hecho */
function adentro(r, e){ const cx = e.x + e.w / 2, cy = e.y + (e.h || 40) / 2; return e.id !== r.id && cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h; }
function avanceDe(r){
  let total = 0, hechos = 0;
  for(const e of els.values()){ if(e.borrado || !adentro(r, e)) continue;
    if(e.tipo === 'nota'){ total++; if(e.estado === 'hecho') hechos++; }
    if(e.tipo === 'lista'){ for(const x of e.items || []){ total++; if(x.hecho) hechos++; } }
    if(e.tipo === 'linea'){ for(const x of e.hitos || []){ total++; if(x.hecho) hechos++; } } }
  return total ? Math.round(hechos / total * 100) : null;
}
function pintarFlechas(){
  let h = '';
  for(const f of els.values()){ if(f.tipo !== 'flecha' || f.borrado) continue; const a = els.get(f.de), b = els.get(f.a); if(!a || !b || a.borrado || b.borrado) continue;
    const ah = a.tipo === 'texto' ? 40 : a.h, bh = b.tipo === 'texto' ? 40 : b.h;
    const ax = a.x + a.w / 2, ay = a.y + ah / 2, bx = b.x + b.w / 2, by = b.y + bh / 2;
    /* del borde de una caja al borde de la otra */
    const borde = (cx, cy, w, hh, tx, ty) => { const dx = tx - cx, dy = ty - cy, k = Math.min(Math.abs((w / 2 + 6) / (dx || 1e-6)), Math.abs((hh / 2 + 6) / (dy || 1e-6))); return [cx + dx * k, cy + dy * k]; };
    const [x1, y1] = borde(ax, ay, a.w, ah, bx, by), [x2, y2] = borde(bx, by, b.w, bh, ax, ay);
    const ang = Math.atan2(y2 - y1, x2 - x1), k = 14;
    h += `<path d="M${x1},${y1} L${x2},${y2} M${x2 - k * Math.cos(ang - .45)},${y2 - k * Math.sin(ang - .45)} L${x2},${y2} L${x2 - k * Math.cos(ang + .45)},${y2 - k * Math.sin(ang + .45)}" style="stroke:${TINTAS[f.color || 'gris']}"/>`; }
  svgF.innerHTML = h;
}
const recuadrosRepintar = () => { for(const e of els.values()) if(e.tipo === 'recuadro' && !e.borrado) pintarUno(e); };
function pintarTodo(){ for(const [id, n] of nodos) if(!els.has(id) || els.get(id).borrado) { n.remove(); nodos.delete(id); } for(const e of els.values()) pintarUno(e); pintarFlechas(); }

/* ══ GUARDAR (sólo lo que cambió) ═════════════════════════════════════════ */
const sucios = new Set(), borrados = new Set(); let reloj = null, guardando = false;
function cambio(e, sinGuardar){ e.t = Date.now(); els.set(e.id, e); if(!sinGuardar){ sucios.add(e.id); programar(); } cachear(); }
function programar(){ clearTimeout(reloj); estado('guardando'); reloj = setTimeout(subir, 700); }
async function subir(){
  if(guardando){ programar(); return; }
  if(!sucios.size && !borrados.size){ estado(''); return; }
  guardando = true;
  const ids = [...sucios], bs = [...borrados]; sucios.clear(); borrados.clear();
  try{
    const cambios = ids.map((id) => els.get(id)).filter(Boolean).map(({ local, ...e }) => e.tipo === 'foto' && local ? { ...e, src: local } : e);
    const r = await pedir({ tablero, cambios, borrados: bs });
    /* las fotos recién subidas ya viven en La Sala: se cambia la copia local por su versión */
    for(const id of ids){ const e = els.get(id); if(e && e.tipo === 'foto' && e.local){ const j = await pedir(null, `?tablero=${encodeURIComponent(tablero)}&desde=${hora}`); for(const x of j.elementos) if(x.id === id){ e.src = x.src; delete e.local; } } }
    if(r.rechazados) aviso(`${r.rechazados} cambio(s) no se guardaron (algo muy grande o ya borrado en otro teléfono).`);
    estado(''); cachear();
  }catch(e){ ids.forEach((id) => sucios.add(id)); bs.forEach((id) => borrados.add(id)); estado('error'); clearTimeout(reloj); reloj = setTimeout(subir, 6000); if(!/llave/i.test(e.message)) aviso(e.message); }
  finally{ guardando = false; }
}
/* la copia de este teléfono (sin fotos en grande): lo que se pinta al instante al abrir */
let cacheT = null;
function cachear(){ clearTimeout(cacheT); cacheT = setTimeout(() => guarda.poner('piz.t.' + tablero, { hora, els: [...els.values()].filter((e) => !e.borrado).map(({ local, ...e }) => e) }), 400); }

/* ══ CARGAR Y ESTAR AL DÍA ════════════════════════════════════════════════ */
async function abrir(t){
  tablero = t; guarda.poner('piz.actual', t); sel = null; acciones();
  els.clear(); for(const n of nodos.values()) n.remove(); nodos.clear();
  const c = guarda.leer('piz.t.' + t, null);
  if(c){ hora = 0; c.els.forEach((e) => els.set(e.id, e)); pintarTodo(); }
  const cam0 = guarda.leer('piz.cam.' + t, null); if(cam0) Object.assign(cam, cam0); else if(c) ajustar(); ponerCamara();
  pintarTabs();
  try{
    const j = await pedir(null, `?tablero=${encodeURIComponent(t)}`);
    if(t !== tablero) return;
    const locales = new Map([...els].filter(([id]) => sucios.has(id)));
    els.clear(); j.elementos.forEach((e) => els.set(e.id, e)); for(const [id, e] of locales) els.set(id, e);
    hora = j.hora; pintarTodo(); cachear();
    if(!c && !j.elementos.length) ejemplo(); else if(!cam0) ajustar();
  }catch(e){ if(!/llave/i.test(e.message)) aviso(c ? 'Sin conexión: enseño lo que este teléfono guardó.' : e.message); }
}
async function alDia(){
  if(document.hidden || arr.tipo || $('#hoja').open || !hora) return;
  try{
    const j = await pedir(null, `?tablero=${encodeURIComponent(tablero)}&desde=${hora}`);
    let algo = false;
    for(const e of j.elementos){ if(sucios.has(e.id)) continue; const v = els.get(e.id); if(v && v.t >= e.t && !e.borrado) continue; if(e.borrado){ els.delete(e.id); } else els.set(e.id, { ...e, local: v && v.local }); algo = true; }
    hora = j.hora; if(algo){ pintarTodo(); cachear(); }
  }catch{}
}
setInterval(alDia, 15000); document.addEventListener('visibilitychange', () => { if(!document.hidden) alDia(); });
async function cargarTableros(){
  try{ const j = await pedir(null, ''); tableros = j.tableros; guarda.poner('piz.tableros', tableros); if(!tableros.some((x) => x.id === tablero)) tablero = tableros[0].id; pintarTabs(); }catch{}
}
function pintarTabs(){ $('#tabs').innerHTML = tableros.map((x) => `<button class="tab ${x.id === tablero ? 'activo' : ''}" data-t="${esc(x.id)}">${esc(x.nombre)}</button>`).join(''); }

/* el primer tablero vacío trae un ejemplo, para que se entienda qué se puede hacer */
function ejemplo(){
  const ej = [
    { tipo: 'texto', x: 20, y: 0, w: 420, h: 50, texto: 'Pendientes de la semana', color: 'morado' },
    { tipo: 'recuadro', x: 0, y: 70, w: 620, h: 330, titulo: 'Fase 1 · Arranque', color: 'azul' },
    { tipo: 'nota', x: 24, y: 128, w: 180, h: 130, texto: 'Pedirle el Excel a Urban Pest', estado: 'curso', color: 'amarillo' },
    { tipo: 'nota', x: 224, y: 128, w: 180, h: 130, texto: 'Campaña: grabar con el técnico', estado: 'pendiente', color: 'rosa' },
    { tipo: 'lista', x: 424, y: 128, w: 180, h: 200, titulo: 'Entregables', color: 'verde', items: [{ texto: 'Bot', hecho: true }, { texto: 'Centro', hecho: true }, { texto: 'Página', hecho: false }] },
    { tipo: 'linea', x: 0, y: 440, w: 620, h: 130, titulo: 'Urban Pest', color: 'naranja', hitos: [{ texto: 'Bot', fecha: '11 nov', hecho: true }, { texto: 'Centro', fecha: '12 nov', hecho: true }, { texto: 'Meta', fecha: '?', hecho: false }, { texto: 'Entrega', hecho: false }] },
  ].map((e, i) => ({ id: nuevoId() + i, ...e }));
  ej.forEach((e) => cambio(e)); pintarTodo(); ajustar(); aviso('Te dejé un ejemplo. Toca algo para editarlo o bórralo.');
}

/* ══ TOCAR, MOVER, ACERCAR ════════════════════════════════════════════════ */
const toques = new Map();
const arr = { tipo: null };          /* 'mundo' | 'el' | 'manija' | 'pinza' */
const aMundo = (px, py) => [(px - cam.x) / cam.z, (py - cam.y) / cam.z];
let cuadro = null;
const enCuadro = (f) => { if(cuadro) return; cuadro = requestAnimationFrame(() => { cuadro = null; f(); }); };
vista.addEventListener('pointerdown', (ev) => {
  toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  try{ vista.setPointerCapture(ev.pointerId); }catch{}
  if(toques.size === 2){ const [a, b] = [...toques.values()]; Object.assign(arr, { tipo: 'pinza', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: cam.z, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, x0: cam.x, y0: cam.y }); return; }
  const n = ev.target.closest('.el'), id = n && n.dataset.id;
  Object.assign(arr, { px: ev.clientX, py: ev.clientY, movio: false, id, objetivo: ev.target });
  if(ev.target.closest('[data-manija]') && id){ const e = els.get(id); Object.assign(arr, { tipo: 'manija', w0: e.w, h0: e.h }); return; }
  if(id){ const e = els.get(id); Object.assign(arr, { tipo: 'el', x0: e.x, y0: e.y, hijos: e.tipo === 'recuadro' ? [...els.values()].filter((o) => !o.borrado && o.tipo !== 'flecha' && adentro(e, o)).map((o) => [o, o.x, o.y]) : [] }); return; }
  Object.assign(arr, { tipo: 'mundo', x0: cam.x, y0: cam.y }); vista.classList.add('arrastrando');
});
vista.addEventListener('pointermove', (ev) => {
  if(!toques.has(ev.pointerId)) return; toques.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if(arr.tipo === 'pinza' && toques.size >= 2){ const [a, b] = [...toques.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), z = Math.min(2.5, Math.max(.25, arr.z0 * d / arr.d0));
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; cam.x = mx - (arr.cx - arr.x0) * z / arr.z0; cam.y = my - (arr.cy - arr.y0) * z / arr.z0; cam.z = z; enCuadro(ponerCamara); return; }
  const dx = ev.clientX - arr.px, dy = ev.clientY - arr.py; if(!arr.movio && Math.hypot(dx, dy) < 6) return; arr.movio = true;
  if(arr.tipo === 'mundo'){ cam.x = arr.x0 + dx; cam.y = arr.y0 + dy; enCuadro(ponerCamara); }
  if(arr.tipo === 'el'){ const e = els.get(arr.id); e.x = Math.round(arr.x0 + dx / cam.z); e.y = Math.round(arr.y0 + dy / cam.z);
    for(const [o, ox, oy] of arr.hijos){ o.x = Math.round(ox + dx / cam.z); o.y = Math.round(oy + dy / cam.z); }
    enCuadro(() => { colocar(e); arr.hijos.forEach(([o]) => colocar(o)); pintarFlechas(); }); }
  if(arr.tipo === 'manija'){ const e = els.get(arr.id); e.w = Math.max(90, Math.round(arr.w0 + dx / cam.z)); e.h = Math.max(50, Math.round(arr.h0 + dy / cam.z)); enCuadro(() => { pintarUno(e); pintarFlechas(); }); }
});
function soltar(ev){
  toques.delete(ev.pointerId); vista.classList.remove('arrastrando');
  if(arr.tipo === 'pinza'){ if(toques.size === 0){ arr.tipo = null; guarda.poner('piz.cam.' + tablero, cam); } return; }
  const t = arr.tipo; arr.tipo = null;
  if(t === 'mundo'){ guarda.poner('piz.cam.' + tablero, cam); if(!arr.movio){ if(flechaDesde){ flechaDesde = null; aviso('Flecha cancelada.'); } elegir(null); } return; }
  if((t === 'el' || t === 'manija') && arr.movio){ const e = els.get(arr.id); cambio(e); arr.hijos && arr.hijos.forEach(([o]) => cambio(o)); if(e.tipo !== 'recuadro') recuadrosRepintar(); return; }
  if(t === 'el' && !arr.movio) tocar(arr.id, arr.objetivo);
}
vista.addEventListener('pointerup', soltar); vista.addEventListener('pointercancel', soltar);
vista.addEventListener('wheel', (ev) => { ev.preventDefault();
  if(ev.ctrlKey || ev.metaKey || Math.abs(ev.deltaY) > Math.abs(ev.deltaX) && !ev.shiftKey && ev.deltaMode === 0 && Math.abs(ev.deltaY) < 40 && false){}
  if(ev.ctrlKey || ev.metaKey){ const z = Math.min(2.5, Math.max(.25, cam.z * Math.exp(-ev.deltaY / 300))); cam.x = ev.clientX - (ev.clientX - cam.x) * z / cam.z; cam.y = ev.clientY - (ev.clientY - cam.y) * z / cam.z; cam.z = z; }
  else { cam.x -= ev.deltaX; cam.y -= ev.deltaY; }
  enCuadro(ponerCamara); clearTimeout(vista._g); vista._g = setTimeout(() => guarda.poner('piz.cam.' + tablero, cam), 400);
}, { passive: false });

/* un toque: en la casilla o el estado cambia directo; si no, elige el elemento */
function tocar(id, objetivo){
  const e = els.get(id); if(!e) return;
  if(flechaDesde){ if(flechaDesde !== id){ cambio({ id: nuevoId(), tipo: 'flecha', de: flechaDesde, a: id, color: 'gris' }); pintarFlechas(); aviso('Flecha lista.'); } flechaDesde = null; return; }
  const est = objetivo.closest('[data-estado]'), item = objetivo.closest('[data-item]'), hito = objetivo.closest('[data-hito]');
  if(est && sel === id){ const i = ESTADOS.findIndex((s) => s[0] === (e.estado || 'pendiente')); e.estado = ESTADOS[(i + 1) % ESTADOS.length][0]; cambio(e); pintarUno(e); recuadrosRepintar(); return; }
  if(item && sel === id){ const x = e.items[+item.dataset.item]; x.hecho = !x.hecho; cambio(e); pintarUno(e); recuadrosRepintar(); return; }
  if(hito && sel === id){ const x = e.hitos[+hito.dataset.hito]; x.hecho = !x.hecho; cambio(e); pintarUno(e); recuadrosRepintar(); return; }
  if(sel === id){ editar(e); return; }
  elegir(id);
}
function elegir(id){
  const viejo = sel; sel = id;
  if(viejo && nodos.get(viejo)) nodos.get(viejo).classList.remove('sel');
  if(id && nodos.get(id)) nodos.get(id).classList.add('sel');
  acciones();
}

/* ══ LO QUE SE HACE CON LO ELEGIDO ════════════════════════════════════════ */
function acciones(){
  const a = $('#acciones'); const e = sel && els.get(sel);
  if(!e){ a.hidden = true; return; }
  a.hidden = false;
  a.innerHTML = `<button class="bt fuerte" data-a="editar">${ico('pencil')} Editar</button>
    <span class="colores">${Object.keys(COLORES).map((c) => `<button data-color="${c}" style="background:${e.tipo === 'nota' ? COLORES[c] : TINTAS[c]}" aria-label="Color ${c}"></button>`).join('')}</span>
    <button class="bt" data-a="flecha">${ico('move-right')} Flecha</button>
    <button class="bt" data-a="duplicar">${ico('copy')} Duplicar</button>
    <button class="bt" data-a="frente">${ico('bring-to-front')} Al frente</button>
    <button class="bt peligro" data-a="borrar">${ico('trash')} Borrar</button>`;
}
$('#acciones').addEventListener('click', (ev) => {
  const e = sel && els.get(sel); if(!e) return;
  const c = ev.target.closest('[data-color]'); if(c){ e.color = c.dataset.color; cambio(e); pintarUno(e); acciones(); return; }
  const b = ev.target.closest('[data-a]'); if(!b) return;
  if(b.dataset.a === 'editar') editar(e);
  if(b.dataset.a === 'flecha'){ flechaDesde = e.id; aviso('Ahora toca a qué va la flecha.'); }
  if(b.dataset.a === 'duplicar'){ const d = { ...structuredClone(e), id: nuevoId(), x: e.x + 30, y: e.y + 30 }; delete d.local; if(e.tipo === 'foto' && e.local) d.local = e.local; cambio(d); pintarUno(d); elegir(d.id); }
  if(b.dataset.a === 'frente'){ e.z = Math.max(2, ...[...els.values()].map((x) => x.z || 2)) + 1; cambio(e); pintarUno(e); }
  if(b.dataset.a === 'borrar'){
    if(!b.dataset.seguro){ b.dataset.seguro = '1'; b.innerHTML = `${ico('trash')} ¿Seguro?`; setTimeout(() => { if(b.isConnected){ delete b.dataset.seguro; b.innerHTML = `${ico('trash')} Borrar`; } }, 2500); return; }
    const quita = [e.id, ...[...els.values()].filter((f) => f.tipo === 'flecha' && (f.de === e.id || f.a === e.id)).map((f) => f.id)];
    for(const id of quita){ els.delete(id); sucios.delete(id); borrados.add(id); }
    programar(); cachear(); elegir(null); pintarTodo(); recuadrosRepintar();
  }
});

/* ══ AGREGAR ══════════════════════════════════════════════════════════════ */
const HERR = [['nota', 'sticky-note', 'Nota'], ['recuadro', 'square-dashed', 'Fase'], ['texto', 'type', 'Texto'], ['foto', 'image', 'Foto'], ['linea', 'git-commit-horizontal', 'Línea'], ['lista', 'list-checks', 'Lista'], ['ajustar', 'scan', 'Ver todo']];
$('#herr').innerHTML = HERR.map(([k, i, t]) => `<button class="bt" data-h="${k}">${ico(i)}<span>${t}</span></button>`).join('');
function enMedio(w, h){ const [x, y] = aMundo(innerWidth / 2, innerHeight / 2); return { x: Math.round(x - w / 2), y: Math.round(y - h / 2) }; }
const NUEVOS = {
  nota: () => ({ w: 190, h: 140, texto: '', estado: 'pendiente', color: 'amarillo' }),
  recuadro: () => ({ w: 560, h: 340, titulo: 'Fase nueva', color: 'azul' }),
  texto: () => ({ w: 360, h: 50, texto: 'Título', color: 'morado' }),
  linea: () => ({ w: 560, h: 130, titulo: 'Línea de tiempo', color: 'naranja', hitos: [{ texto: 'Inicio', fecha: '', hecho: true }, { texto: 'Mitad', fecha: '', hecho: false }, { texto: 'Entrega', fecha: '', hecho: false }] }),
  lista: () => ({ w: 230, h: 210, titulo: 'Lista', color: 'verde', items: [{ texto: 'Primer pendiente', hecho: false }, { texto: 'Segundo', hecho: false }] }),
};
$('#herr').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-h]'); if(!b) return; const k = b.dataset.h;
  if(k === 'ajustar'){ ajustar(); return; }
  if(k === 'foto'){ $('#archivo').click(); return; }
  const base = NUEVOS[k](), e = { id: nuevoId(), tipo: k, ...enMedio(base.w, base.h), ...base };
  cambio(e); pintarUno(e); elegir(e.id); editar(e);
});
$('#archivo').addEventListener('change', async () => {
  const f = $('#archivo').files[0]; $('#archivo').value = ''; if(!f) return;
  const img = await createImageBitmap(f).catch(() => null); if(!img){ aviso('No pude abrir esa imagen.'); return; }
  let lado = 1400, q = .82, url;
  do{ const k = Math.min(1, lado / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); url = cv.toDataURL('image/jpeg', q); lado *= .8; q -= .06; } while(url.length > 1_500_000 && lado > 300);
  const w = 260, h = Math.round(260 * img.height / img.width) + 34;
  const e = { id: nuevoId(), tipo: 'foto', ...enMedio(w, h), w, h, src: 'local', local: url, pie: '', color: 'gris' };
  cambio(e); pintarUno(e); elegir(e.id);
});
function ajustar(){
  const v = [...els.values()].filter((e) => !e.borrado && e.tipo !== 'flecha'); if(!v.length){ cam.x = 20; cam.y = 90; cam.z = 1; ponerCamara(); return; }
  const x0 = Math.min(...v.map((e) => e.x)), y0 = Math.min(...v.map((e) => e.y)), x1 = Math.max(...v.map((e) => e.x + e.w)), y1 = Math.max(...v.map((e) => e.y + (e.h || 50)));
  const W = innerWidth - 24, H = innerHeight - 200, z = Math.min(1.4, Math.max(.25, Math.min(W / (x1 - x0 + 40), H / (y1 - y0 + 60))));
  cam.z = z; cam.x = 12 + (W - (x1 - x0) * z) / 2 - x0 * z; cam.y = 80 + (H - (y1 - y0) * z) / 2 - y0 * z + 20; ponerCamara(); guarda.poner('piz.cam.' + tablero, cam);
}

/* ══ LA HOJA PARA EDITAR ══════════════════════════════════════════════════ */
function editar(e){
  const h = $('#hoja'), T = { nota: 'Nota', recuadro: 'Fase o apartado', texto: 'Texto', foto: 'Foto', linea: 'Línea de tiempo', lista: 'Lista' };
  let f = `<h3>${T[e.tipo]}</h3>`;
  if(e.tipo === 'nota') f += `<label for="fTexto">Qué hay que hacer</label><textarea id="fTexto">${esc(e.texto)}</textarea>
    <div class="dos"><div><label for="fEstado">Estado</label><select id="fEstado">${ESTADOS.map(([k, t]) => `<option value="${k}" ${e.estado === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div><label for="fFecha">Para cuándo</label><input id="fFecha" value="${esc(e.fecha || '')}" placeholder="ej. viernes 14"></div></div>
    <label for="fQuien">Quién</label><input id="fQuien" value="${esc(e.quien || '')}" placeholder="Carlos, Luis, Sylcred…">`;
  if(e.tipo === 'recuadro') f += `<label for="fTitulo">Nombre de la fase o apartado</label><input id="fTitulo" value="${esc(e.titulo)}"><p style="color:var(--suave);font-size:13px;margin-top:8px">Lo que pongas DENTRO cuenta para su avance («40 % hecho»), y al moverla se mueve todo lo de adentro.</p>`;
  if(e.tipo === 'texto') f += `<label for="fTexto">Texto</label><textarea id="fTexto">${esc(e.texto)}</textarea>`;
  if(e.tipo === 'foto') f += `<label for="fPie">Pie de foto</label><input id="fPie" value="${esc(e.pie || '')}">`;
  if(e.tipo === 'linea' || e.tipo === 'lista'){
    const filas = e.tipo === 'linea' ? e.hitos : e.items;
    f += `<label for="fTitulo">Título</label><input id="fTitulo" value="${esc(e.titulo)}"><label>${e.tipo === 'linea' ? 'Hitos (marca los que ya se hicieron)' : 'Pendientes'}</label><div id="fFilas">${filas.map((x) => renglon(x, e.tipo)).join('')}</div>
      <button class="bt" type="button" id="fMas" style="margin-top:8px">${ico('plus')} Agregar</button>`;
  }
  f += `<div class="botones"><button class="bt" type="button" id="fCerrar">Cancelar</button><button class="bt fuerte" type="button" id="fListo">${ico('check')} Listo</button></div>`;
  h.innerHTML = f; h.showModal();
  const foco = h.querySelector('textarea, input'); if(foco && !matchMedia('(pointer: coarse)').matches) foco.focus();
  h.querySelector('#fMas')?.addEventListener('click', () => h.querySelector('#fFilas').insertAdjacentHTML('beforeend', renglon({ texto: '', fecha: '', hecho: false }, e.tipo)));
  h.querySelector('#fFilas')?.addEventListener('click', (ev) => { const q = ev.target.closest('[data-quitar]'); if(q) q.closest('.renglon').remove(); });
  h.querySelector('#fCerrar').addEventListener('click', () => h.close());
  h.querySelector('#fListo').addEventListener('click', () => {
    const v = (id) => h.querySelector('#' + id)?.value.trim();
    if(e.tipo === 'nota'){ e.texto = v('fTexto'); e.estado = v('fEstado'); e.fecha = v('fFecha'); e.quien = v('fQuien'); }
    if(e.tipo === 'recuadro') e.titulo = v('fTitulo');
    if(e.tipo === 'texto') e.texto = v('fTexto');
    if(e.tipo === 'foto') e.pie = v('fPie');
    if(e.tipo === 'linea' || e.tipo === 'lista'){
      e.titulo = v('fTitulo');
      const filas = [...h.querySelectorAll('.renglon')].map((r) => ({ texto: r.querySelector('[data-t]').value.trim(), fecha: (r.querySelector('[data-f]') || {}).value?.trim() || '', hecho: r.querySelector('[data-h]').checked })).filter((x) => x.texto);
      if(e.tipo === 'linea') e.hitos = filas; else { e.items = filas.map(({ fecha, ...x }) => x); e.h = Math.max(e.h, 90 + filas.length * 30); }
    }
    cambio(e); pintarUno(e); pintarFlechas(); recuadrosRepintar(); h.close();
  });
}
function renglon(x, tipo){ return `<div class="renglon"><input type="checkbox" data-h ${x.hecho ? 'checked' : ''} aria-label="Hecho"><input data-t value="${esc(x.texto)}" placeholder="${tipo === 'linea' ? 'Hito' : 'Pendiente'}">${tipo === 'linea' ? `<input data-f value="${esc(x.fecha || '')}" placeholder="Fecha">` : '<span></span>'}<button class="bt" type="button" data-quitar aria-label="Quitar">${ico('x')}</button></div>`; }

/* ══ TABLEROS ═════════════════════════════════════════════════════════════ */
$('#tabs').addEventListener('click', (ev) => { const b = ev.target.closest('[data-t]'); if(b && b.dataset.t !== tablero){ subir(); abrir(b.dataset.t); } });
$('#bTablero').addEventListener('click', () => {
  const h = $('#hoja'); h.innerHTML = `<h3>Tableros</h3><label for="tNombre">Nuevo tablero (un proyecto)</label><input id="tNombre" placeholder="ej. Urban Pest"><div class="botones"><button class="bt" type="button" id="tCerrar">Cerrar</button><button class="bt fuerte" type="button" id="tCrear">${ico('plus')} Crear</button></div>
    <label style="margin-top:20px">Renombrar «${esc((tableros.find((x) => x.id === tablero) || {}).nombre)}»</label><div class="botones" style="margin-top:6px"><input id="tRen" value="${esc((tableros.find((x) => x.id === tablero) || {}).nombre)}"><button class="bt" type="button" id="tRenB">Guardar</button></div>
    ${tableros.length > 1 ? `<div class="botones"><button class="bt peligro" type="button" id="tBorrar">${ico('trash')} Borrar este tablero</button></div>` : ''}`;
  h.showModal();
  h.querySelector('#tCerrar').onclick = () => h.close();
  h.querySelector('#tCrear').onclick = async () => { const n = h.querySelector('#tNombre').value.trim(); if(!n) return; try{ const j = await pedir({ accion: 'tablero', nombre: n }); tableros.push(j.tablero); guarda.poner('piz.tableros', tableros); h.close(); abrir(j.tablero.id); }catch(e){ aviso(e.message); } };
  h.querySelector('#tRenB').onclick = async () => { const n = h.querySelector('#tRen').value.trim(); if(!n) return; try{ const j = await pedir({ accion: 'tablero', id: tablero, nombre: n }); tableros = tableros.map((x) => x.id === tablero ? j.tablero : x); guarda.poner('piz.tableros', tableros); pintarTabs(); h.close(); }catch(e){ aviso(e.message); } };
  h.querySelector('#tBorrar')?.addEventListener('click', async (ev) => { const b = ev.currentTarget; if(!b.dataset.seguro){ b.dataset.seguro = 1; b.textContent = '¿Seguro? Se borra todo lo que tiene'; return; }
    try{ await pedir({ accion: 'borrarTablero', id: tablero }); tableros = tableros.filter((x) => x.id !== tablero); guarda.poner('piz.tableros', tableros); localStorage.removeItem('piz.t.' + tablero); h.close(); abrir(tableros[0].id); }catch(e){ aviso(e.message); } });
});

/* ══ ARRANQUE ═════════════════════════════════════════════════════════════ */
$('#volver').innerHTML = ico('arrow-left'); $('#volver').href = './' + location.search; if(window.top !== window) $('#volver').hidden = true;
$('#bTablero').innerHTML = ico('layers');
$('#bLlave').addEventListener('click', () => { if(ponerLlave($('#llaveTxt').value)){ $('#cajaLlave').hidden = true; cargarTableros().then(() => abrir(tablero)); } });
window.addEventListener('pagehide', () => { if(sucios.size || borrados.size) subir(); });
ponerCamara(); pintarTabs();
if(!llave()) $('#cajaLlave').hidden = false;
abrir(tablero); cargarTableros();
/* para las pruebas */
window.__piz = { els, nodos, cam, estado: () => ({ tablero, elementos: [...els.values()].filter((e) => !e.borrado).length, sucios: sucios.size, sel }) };
