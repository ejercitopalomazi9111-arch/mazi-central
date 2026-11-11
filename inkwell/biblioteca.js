/* INKWELL · Biblioteca: tus listas, tu calificación, tus etiquetas, tus colecciones y lo que llevas leído.
   Vive en este teléfono (localStorage) y, si entraste a tu cuenta de la Comunidad, se respalda en ella:
   así no se pierde si Safari borra lo guardado y se ve igual en otro teléfono (Carlos, 11 nov). También
   se exporta e importa en un archivo.

   · inkwell.biblio    { obras: { <id>: { lista, fav, nota, etiquetas, cambio } }, meta, colecciones: [{ id, nombre, ids }] }
   · inkwell.historial [[cuándo, id, capítulo], …]  (lo apunta Tiras al marcar un capítulo leído y Libros al pasar de capítulo)

   El id de una obra es el de su serie («webtoon:777», «wattpad:9001») o el de su libro («libro:<id>»). */

export const LISTAS = [
  ['leyendo', 'Leyendo'], ['pendiente', 'Pendientes'], ['terminada', 'Terminadas'],
  ['pausa', 'En pausa'], ['abandonada', 'Abandonadas'],
];
export const NOMBRE_LISTA = Object.fromEntries(LISTAS);
const TOPE_HISTORIAL = 20000;

const leer = (k, d) => { try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch{ return d; } };
const escribir = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch{ return false; } };

export function datos(){
  const d = leer('inkwell.biblio', null) || {};
  return { obras: d.obras || {}, meta: Number.isFinite(d.meta) ? d.meta : 0, metaCambio: d.metaCambio || 0,
    colecciones: Array.isArray(d.colecciones) ? d.colecciones : [], quitadas: d.quitadas && typeof d.quitadas === 'object' ? d.quitadas : {} };
}
export function guardarDatos(d){ const ok = escribir('inkwell.biblio', d); pronto(); return ok; }
export function deObra(id, d = datos()){ return { lista: null, fav: false, nota: 0, etiquetas: [], ...(d.obras[id] || {}) }; }
export function cambiarObra(id, cambio){
  const d = datos(), o = { ...deObra(id, d), ...cambio, cambio: Date.now() };
  o.nota = Math.max(0, Math.min(5, Math.round(+o.nota || 0)));
  o.etiquetas = [...new Set((o.etiquetas || []).map((t) => String(t).trim().replace(/^#/, '').toLowerCase()).filter(Boolean))].slice(0, 20);
  d.obras[id] = o; guardarDatos(d); return o;
}

/* la lista en la que va una obra: la que elegiste, o la que le toca por cómo la llevas */
export function listaDe(obra, d = datos()){
  const o = deObra(obra.id, d);
  if(o.lista && NOMBRE_LISTA[o.lista]) return o.lista;
  if(obra.total > 0 && obra.leidos >= obra.total) return 'terminada';
  return obra.leidos > 0 ? 'leyendo' : 'pendiente';
}

/* ── colecciones: carpetas tuyas («Para el viaje», «Universo Marvel»…) ── */
export function nuevaColeccion(nombre){
  const d = datos(), n = String(nombre || '').trim().slice(0, 40); if(!n) return null;
  const c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nombre: n, ids: [], cambio: Date.now() };
  d.colecciones.push(c); guardarDatos(d); return c;
}
export function enColeccion(cid, id, dentro){
  const d = datos(), c = d.colecciones.find((x) => x.id === cid); if(!c) return;
  c.ids = dentro ? [...new Set([...c.ids, id])] : c.ids.filter((x) => x !== id); c.cambio = Date.now(); guardarDatos(d);
}
export function borrarColeccion(cid){ const d = datos(); d.colecciones = d.colecciones.filter((x) => x.id !== cid); d.quitadas[cid] = Date.now(); guardarDatos(d); }
export function ponerMeta(n){ const d = datos(); d.meta = Math.max(0, Math.min(10000, Math.round(+n || 0))); d.metaCambio = Date.now(); guardarDatos(d); return d.meta; }

/* ── historial de lectura ── */
export function historial(){ const h = leer('inkwell.historial', []); return Array.isArray(h) ? h : []; }
export function apuntar(id, n, cuando = Date.now()){
  const h = historial();
  if(h.some(([, i, c]) => i === id && c === n)) return;   // un capítulo cuenta una vez
  h.push([cuando, id, n]); escribir('inkwell.historial', h.slice(-TOPE_HISTORIAL)); pronto();
}
const diaDe = (t) => { const f = new Date(t); return `${f.getFullYear()}-${f.getMonth() + 1}-${f.getDate()}`; };

/* lo que se ve arriba de la biblioteca: este mes, la meta, la racha y los últimos días */
export function estadisticas(obras, ahora = Date.now(), d = datos()){
  const h = historial(), hoy = new Date(ahora);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
  const esteMes = h.filter(([t]) => t >= inicioMes && t <= ahora).length;
  const porDia = new Map(); for(const [t] of h) porDia.set(diaDe(t), (porDia.get(diaDe(t)) || 0) + 1);
  /* racha: días seguidos con algo leído, contando hasta hoy (o hasta ayer, si hoy aún no) */
  let racha = 0; const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if(!porDia.has(diaDe(dia.getTime()))) dia.setDate(dia.getDate() - 1);
  while(porDia.has(diaDe(dia.getTime()))){ racha++; dia.setDate(dia.getDate() - 1); }
  /* calendario: las últimas 12 semanas, de lunes a domingo */
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const lunes = new Date(fin); lunes.setDate(fin.getDate() - ((fin.getDay() + 6) % 7) - 7 * 11);
  const dias = [];
  for(const f = new Date(lunes); f <= fin; f.setDate(f.getDate() + 1)) dias.push({ dia: f.getTime(), n: porDia.get(diaDe(f.getTime())) || 0 });
  const cuenta = Object.fromEntries(LISTAS.map(([k]) => [k, 0]));
  for(const o of obras) cuenta[listaDe(o, d)]++;
  const notas = obras.map((o) => deObra(o.id, d).nota).filter(Boolean);
  return {
    esteMes, meta: d.meta, racha, dias, cuenta,
    capitulos: obras.reduce((n, o) => n + (o.leidos || 0), 0),
    favoritas: obras.filter((o) => deObra(o.id, d).fav).length,
    promedio: notas.length ? Math.round(10 * notas.reduce((a, b) => a + b, 0) / notas.length) / 10 : 0,
  };
}

/* ── filtrar y ordenar ── */
export function filtrar(obras, { vista = 'todas', etiqueta = '', tipo = 'todo', orden = 'reciente', texto = '' } = {}, d = datos()){
  let r = obras.filter((o) => {
    const m = deObra(o.id, d);
    if(vista === 'favoritas' && !m.fav) return false;
    if(vista.startsWith('col:')){ const c = d.colecciones.find((x) => x.id === vista.slice(4)); if(!c || !c.ids.includes(o.id)) return false; }
    else if(NOMBRE_LISTA[vista] && listaDe(o, d) !== vista) return false;
    if(etiqueta && !m.etiquetas.includes(etiqueta)) return false;
    if(tipo !== 'todo' && o.tipo !== tipo) return false;
    if(texto){ const q = sinAcentos(texto); if(!sinAcentos(`${o.titulo} ${o.autor || ''} ${m.etiquetas.join(' ')}`).includes(q)) return false; }
    return true;
  });
  const cmp = {
    titulo: (a, b) => a.titulo.localeCompare(b.titulo, 'es'),
    autor: (a, b) => (a.autor || '~').localeCompare(b.autor || '~', 'es') || a.titulo.localeCompare(b.titulo, 'es'),
    nota: (a, b) => deObra(b.id, d).nota - deObra(a.id, d).nota || a.titulo.localeCompare(b.titulo, 'es'),
    avance: (a, b) => (b.total ? b.leidos / b.total : 0) - (a.total ? a.leidos / a.total : 0),
    pendientes: (a, b) => (b.total - b.leidos) - (a.total - a.leidos),
    reciente: (a, b) => (b.reciente || 0) - (a.reciente || 0),
  }[orden] || (() => 0);
  return r.sort(cmp);
}
export function etiquetasUsadas(obras, d = datos()){
  const n = new Map(); for(const o of obras) for(const t of deObra(o.id, d).etiquetas) n.set(t, (n.get(t) || 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).map(([t]) => t);
}
export const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ── exportar e importar: un archivo con tus listas (no lleva lo bajado ni los libros) ── */
export function exportar(obras){
  const d = datos();
  return {
    app: 'INKWELL', version: 1, fecha: new Date().toISOString(), meta: d.meta, colecciones: d.colecciones,
    obras: obras.map((o) => ({ id: o.id, titulo: o.titulo, autor: o.autor || '', tipo: o.tipo, enlace: o.enlace || '', lista: listaDe(o, d), ...pick(deObra(o.id, d)) })),
    historial: historial(),
  };
}
const pick = (m) => ({ fav: !!m.fav, nota: m.nota || 0, etiquetas: m.etiquetas || [], elegida: m.lista || null });
export function importar(archivo){
  if(!archivo || archivo.app !== 'INKWELL' || !Array.isArray(archivo.obras)) throw new Error('Ese archivo no es una lista de INKWELL.');
  const d = datos();
  for(const o of archivo.obras){
    if(!o || typeof o.id !== 'string') continue;
    const ya = deObra(o.id, d);
    d.obras[o.id] = { ...ya, lista: o.elegida && NOMBRE_LISTA[o.elegida] ? o.elegida : ya.lista, fav: ya.fav || !!o.fav, nota: ya.nota || Math.max(0, Math.min(5, +o.nota || 0)),
      etiquetas: [...new Set([...ya.etiquetas, ...(Array.isArray(o.etiquetas) ? o.etiquetas.map(String) : [])])].slice(0, 20), cambio: Date.now() };
  }
  for(const c of Array.isArray(archivo.colecciones) ? archivo.colecciones : []){
    if(!c || !c.nombre) continue;
    const ya = d.colecciones.find((x) => x.nombre === c.nombre);
    if(ya) ya.ids = [...new Set([...ya.ids, ...(c.ids || [])])]; else d.colecciones.push({ id: String(c.id || 'c' + Date.now().toString(36)), nombre: String(c.nombre).slice(0, 40), ids: (c.ids || []).map(String) });
  }
  if(!d.meta && Number.isFinite(archivo.meta)) d.meta = archivo.meta;
  guardarDatos(d);
  if(Array.isArray(archivo.historial)){
    const h = historial(), visto = new Set(h.map(([, i, c]) => i + '|' + c));
    for(const x of archivo.historial) if(Array.isArray(x) && !visto.has(x[1] + '|' + x[2])){ h.push(x); visto.add(x[1] + '|' + x[2]); }
    escribir('inkwell.historial', h.sort((a, b) => a[0] - b[0]).slice(-TOPE_HISTORIAL));
  }
  return archivo.obras.length;
}

/* ── recomendaciones de tu propia biblioteca: lo que tiene tus etiquetas favoritas y no has empezado ── */
export function sugeridas(obras, d = datos()){
  const peso = new Map();
  for(const o of obras){ const m = deObra(o.id, d); const w = (m.fav ? 2 : 0) + (m.nota >= 4 ? m.nota - 2 : 0); if(w) for(const t of m.etiquetas) peso.set(t, (peso.get(t) || 0) + w); }
  return obras.filter((o) => { const m = deObra(o.id, d); return listaDe(o, d) === 'pendiente' && !m.fav && !m.nota; })
    .map((o) => ({ o, p: deObra(o.id, d).etiquetas.reduce((s, t) => s + (peso.get(t) || 0), 0) }))
    .filter((x) => x.p > 0).sort((a, b) => b.p - a.p).map((x) => x.o);
}

/* ── el respaldo en la cuenta ──────────────────────────────────────────────────────────────────────
   mezclar() junta lo de este teléfono con lo de la nube sin perder nada de ninguno de los dos:
   · cada obra se queda con su versión más reciente («cambio»);
   · las colecciones se juntan por id; una borrada en cualquier lado se queda borrada (quitadas),
     salvo que la hayan vuelto a tocar después de borrarla;
   · la meta, la más reciente; el historial, la suma sin repetir capítulos. */
const TOPE_NUBE = 8000;   /* capítulos del historial que viajan a la cuenta (~300 KB) */
export function mezclar(a, b){
  const A = normal(a), B = normal(b);
  const obras = { ...A.biblio.obras };
  for(const [id, o] of Object.entries(B.biblio.obras)) if(!obras[id] || (o.cambio || 0) > (obras[id].cambio || 0)) obras[id] = o;
  const quitadas = { ...A.biblio.quitadas };
  for(const [k, t] of Object.entries(B.biblio.quitadas)) quitadas[k] = Math.max(quitadas[k] || 0, t);
  const cols = new Map();
  for(const c of [...A.biblio.colecciones, ...B.biblio.colecciones]){
    const ya = cols.get(c.id);
    if(!ya || (c.cambio || 0) > (ya.cambio || 0)) cols.set(c.id, c);
  }
  const colecciones = [...cols.values()].filter((c) => !(quitadas[c.id] >= (c.cambio || 0)));
  const [meta, metaCambio] = (B.biblio.metaCambio || 0) > (A.biblio.metaCambio || 0) ? [B.biblio.meta, B.biblio.metaCambio] : [A.biblio.meta, A.biblio.metaCambio];
  const visto = new Set(), historial = [];
  for(const x of [...A.historial, ...B.historial]){ if(!Array.isArray(x)) continue; const k = x[1] + '|' + x[2]; if(visto.has(k)) continue; visto.add(k); historial.push(x); }
  historial.sort((p, q) => p[0] - q[0]);
  return { biblio: { obras, meta, metaCambio, colecciones, quitadas }, historial: historial.slice(-TOPE_HISTORIAL) };
}
function normal(x){
  const b = (x && x.biblio) || {};
  return { biblio: { obras: b.obras && typeof b.obras === 'object' ? b.obras : {}, meta: Number.isFinite(b.meta) ? b.meta : 0, metaCambio: b.metaCambio || 0,
    colecciones: Array.isArray(b.colecciones) ? b.colecciones.filter((c) => c && c.id) : [], quitadas: b.quitadas && typeof b.quitadas === 'object' ? b.quitadas : {} },
    historial: Array.isArray(x && x.historial) ? x.historial : [] };
}
const local = () => ({ biblio: datos(), historial: historial() });
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const conCuenta = () => { try{ const c = JSON.parse(localStorage.getItem('inkwell.cuenta')); return !!(c && c.token); }catch{ return false; } };

let reloj = null, enCurso = null, callado = false;
/* después de cada cambio, a los 2.5 s se sube (si hay cuenta) */
function pronto(){
  if(callado || !conCuenta() || typeof setTimeout !== 'function') return;
  clearTimeout(reloj); reloj = setTimeout(() => { sincronizar().catch(() => {}); }, 2500);
}
/* baja lo de la cuenta, lo junta con lo de aquí, guarda la mezcla en los dos lados.
   Regresa { cambioAqui, subio } para que la pantalla sepa si tiene que repintar. */
export async function sincronizar(){
  if(!conCuenta()) return { cambioAqui: false, subio: false, sinCuenta: true };
  if(enCurso) return enCurso;
  enCurso = (async () => {
    const { api } = await import('./comunidad.js');
    const nube = (await api('respaldo')).datos;
    const antes = local(), junto = mezclar(antes, nube);
    const cambioAqui = !igual(junto.biblio, antes.biblio) || junto.historial.length !== antes.historial.length;
    if(cambioAqui){ callado = true; try{ escribir('inkwell.biblio', junto.biblio); escribir('inkwell.historial', junto.historial); } finally { callado = false; } }
    const sube = { biblio: junto.biblio, historial: junto.historial.slice(-TOPE_NUBE) };
    let subio = false;
    if(!nube || !igual(normal(nube), normal(sube))){ await api('respaldo', { datos: sube }); subio = true; }
    try{ localStorage.setItem('inkwell.respaldo', String(Date.now())); }catch{}
    return { cambioAqui, subio };
  })();
  try{ return await enCurso; } finally { enCurso = null; }
}
export function ultimoRespaldo(){ try{ return +localStorage.getItem('inkwell.respaldo') || 0; }catch{ return 0; } }
