/* ══════════════════════════════════════════════════════════════════════════
   EXPLICA · la clase que se dibuja mientras se oye (explica.html)
   ──────────────────────────────────────────────────────────────────────────
   1. Paulina (Gemini) o Negro (Groq) escriben la clase como JSON: pasos con lo
      que se DICE («voz») y lo que se DIBUJA («pizarra»), más referencias y repaso.
      Pasa por La Sala (/ia-texto): las llaves viven allá, nunca aquí.
   2. Cada paso se dibuja unidad por unidad (palabra, renglón, evento, caja,
      flecha) al ritmo de la voz, con un lápiz que va a donde se está escribiendo.
   3. La voz es la del teléfono (inmediata y gratis) o la natural de Gemini
      (/ia-voz, se pide un paso adelante). Si la natural falla, sigue la del teléfono.
   Ligero a propósito: un solo bucle de animación y sólo mientras algo se dibuja,
   nada de librerías, y los pasos ya dichos se quedan quietos (cero trabajo).
   ═════════════════════════════════════════════════════════════════════════ */
import { ico } from './iconos-pizarra.js';
import { llave, ponerLlave, llamar, SERVIDOR, SALA } from '../presentaciones/ia.js';
/* a La Sala directo (no por presentaciones/ia.js#texto) para mandar `espera` y `pensarPoco`: una clase entera tarda */
async function iaTexto(cuerpo){
  const r = await llamar(`${SERVIDOR}/api/sala/${SALA}/ia-texto`, { metodo: 'POST', cuerpo: { ...cuerpo, espera: 150000, pensarPoco: true }, espera: 165000 });
  const j = await r.json().catch(() => ({}));
  if(r.status === 401 || (r.status === 403 && !/no acepta pedidos/.test(j.error || ''))){ const e = new Error('Falta la llave de La Sala en este teléfono (o ya no sirve).'); e.llave = true; throw e; }
  if(!r.ok || j.bien === false) throw new Error(j.error || `La Sala contestó ${r.status}.`);
  return j.texto || '';
}

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const guarda = { leer(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } }, poner(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} } };
const NOMBRE = { gemini: 'Paulina', groq: 'Negro' };
const TINTAS = ['var(--azul)', 'var(--rojo)', 'var(--verde)', 'var(--morado)', 'var(--naranja)'];

/* ── íconos de los botones ── */
$('#volver').innerHTML = ico('arrow-left'); $('#volver').href = './' + location.search;
if(window.top !== window) $('#volver').hidden = true;   /* dentro de la pestaña de la mesa no hace falta volver */
$('#bNueva').innerHTML = ico('rotate-ccw'); $('#bFoto').insertAdjacentHTML('afterbegin', ico('image-plus'));
$('#bExplica').innerHTML = `${ico('sparkles')} Explícame`; $('#lapizEspera').innerHTML = ico('pencil');
$('#lapiz').innerHTML = ico('pencil');
$('#bAtras').innerHTML = ico('skip-back'); $('#bSig').innerHTML = ico('skip-forward'); $('#bPreg').innerHTML = ico('circle-question-mark');
$('#fPreg button').innerHTML = ico('send');

/* ══ 1 · PEDIR LA CLASE ═════════════════════════════════════════════════════ */
const LARGO = { corta: '6 a 8', normal: '9 a 12', fondo: '14 a 18' };
const NIVEL = { prepa: 'de preparatoria', uni: 'de universidad', facil: 'muy sencillo, como para alguien que nunca lo ha visto' };
const FORMA = `{
 "titulo": "título corto de la clase",
 "pasos": [
  { "voz": "lo que dices en voz alta en este paso", "pizarra": { "tipo": "titulo", "texto": "…", "sub": "…" } },
  { "voz": "…", "pizarra": { "tipo": "texto", "texto": "una idea con **lo importante** resaltado" } },
  { "voz": "…", "pizarra": { "tipo": "lista", "titulo": "…", "numerada": true, "items": ["…", "…"] } },
  { "voz": "…", "pizarra": { "tipo": "definicion", "termino": "…", "texto": "…" } },
  { "voz": "…", "pizarra": { "tipo": "linea", "titulo": "…", "eventos": [{ "fecha": "1810", "texto": "…" }] } },
  { "voz": "…", "pizarra": { "tipo": "diagrama", "titulo": "…", "nodos": [{ "id": "a", "texto": "…" }], "flechas": [{ "de": "a", "a": "b", "texto": "causa" }] } },
  { "voz": "…", "pizarra": { "tipo": "tabla", "titulo": "…", "columnas": ["…"], "filas": [["…"]] } },
  { "voz": "…", "pizarra": { "tipo": "comparar", "titulo": "…", "a": { "nombre": "…", "puntos": ["…"] }, "b": { "nombre": "…", "puntos": ["…"] } } },
  { "voz": "…", "pizarra": { "tipo": "formula", "expresion": "V = I · R", "texto": "qué significa cada letra" } },
  { "voz": "…", "pizarra": { "tipo": "cita", "texto": "…", "autor": "…" } },
  { "voz": "sólo hablas en este paso", "pizarra": null }
 ],
 "referencias": [{ "titulo": "…", "autor": "…", "anio": "…", "tipo": "libro | artículo | sitio | Wikipedia" }],
 "repaso": [{ "pregunta": "…", "respuesta": "…" }]
}`;
function sistema(motor, nivel, largo){
  return `Eres ${NOMBRE[motor]}, la maestra particular de Carlos (Querétaro, México). Explicas en español de México, claro, cercano y sin relleno, con ejemplos de la vida diaria.
Vas a dar una CLASE que se DIBUJA en un pizarrón mientras hablas. Contesta SÓLO con JSON válido, sin texto antes ni después, con esta forma:
${FORMA}
Reglas:
- ${LARGO[largo]} pasos, nivel ${NIVEL[nivel]}.
- "voz": de 2 a 3 frases (entre 30 y 60 palabras) que EXPLIQUEN de verdad: el porqué, un ejemplo o un dato que ayude a recordarlo. Nunca sólo anuncies lo que viene («ahora veremos…» no basta). Como lo dirías hablando: sin markdown, sin emojis y sin leer la pizarra palabra por palabra; la complementas.
- "pizarra": lo que se dibuja en ese paso, o null si sólo hablas. Tipos: titulo, texto, lista, definicion, linea, diagrama, tabla, comparar, formula, cita. El PRIMER paso es un "titulo".
- Usa al menos una lista y una definición. Si el tema tiene fechas, usa una "linea" de tiempo; si tiene causas, procesos o partes, usa un "diagrama" (máximo 8 nodos, textos de 1 a 4 palabras).
- En los textos puedes resaltar con **así** (máximo 3 por elemento). Listas de 3 a 6 puntos, cortos.
- "referencias": de 3 a 6 fuentes REALES y conocidas (libros de texto, instituciones, artículos de Wikipedia por su título exacto). Si no estás segura de que existe, NO la pongas. Nunca inventes direcciones web.
- "repaso": de 3 a 5 preguntas con su respuesta corta.
- Si te mandan fotos de apuntes, explica lo que dicen las fotos y corrige con cuidado si algo está mal.`;
}
function sacarJSON(t){
  const s = String(t || '').replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if(a < 0 || b <= a) throw new Error('La IA no contestó con una clase. Prueba otra vez.');
  return JSON.parse(s.slice(a, b + 1));
}
const SINONIMOS = { title: 'titulo', text: 'texto', parrafo: 'texto', list: 'lista', timeline: 'linea', 'linea de tiempo': 'linea', lineatiempo: 'linea', diagram: 'diagrama', esquema: 'diagrama', table: 'tabla', compare: 'comparar', comparacion: 'comparar', definition: 'definicion', formula: 'formula', quote: 'cita' };
const TIPOS = new Set(['titulo', 'texto', 'lista', 'definicion', 'linea', 'diagrama', 'tabla', 'comparar', 'formula', 'cita']);
const corta = (t, n) => String(t ?? '').trim().slice(0, n);
function normalizar(j){
  const pasos = (Array.isArray(j.pasos) ? j.pasos : []).map((p) => {
    const voz = corta(p && p.voz, 600);
    let z = p && p.pizarra && typeof p.pizarra === 'object' ? { ...p.pizarra } : null;
    if(z){
      let tipo = String(z.tipo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      tipo = SINONIMOS[tipo] || tipo;
      z.tipo = TIPOS.has(tipo) ? tipo : 'texto';
      if(z.tipo === 'texto' && !z.texto) z.texto = z.titulo || '';
      if(z.tipo === 'lista') z.items = (Array.isArray(z.items) ? z.items : []).map((x) => corta(typeof x === 'string' ? x : x && (x.texto || x.item), 220)).filter(Boolean).slice(0, 8);
      if(z.tipo === 'linea') z.eventos = (Array.isArray(z.eventos) ? z.eventos : []).map((e) => ({ fecha: corta(e && e.fecha, 30), texto: corta(e && e.texto, 220) })).filter((e) => e.fecha || e.texto).slice(0, 10);
      if(z.tipo === 'diagrama'){ z.nodos = (Array.isArray(z.nodos) ? z.nodos : []).map((n, i) => ({ id: String(n && n.id != null ? n.id : i), texto: corta(n && (n.texto || n.nombre), 60) })).filter((n) => n.texto).slice(0, 10);
        const ids = new Set(z.nodos.map((n) => n.id)); z.flechas = (Array.isArray(z.flechas) ? z.flechas : []).map((f) => ({ de: String(f && f.de), a: String(f && f.a), texto: corta(f && f.texto, 24) })).filter((f) => ids.has(f.de) && ids.has(f.a) && f.de !== f.a).slice(0, 14); }
      if(z.tipo === 'tabla'){ z.columnas = (Array.isArray(z.columnas) ? z.columnas : []).map((c) => corta(c, 40)).slice(0, 5); z.filas = (Array.isArray(z.filas) ? z.filas : []).filter(Array.isArray).map((f) => f.slice(0, 5).map((c) => corta(c, 120))).slice(0, 10); }
      if(z.tipo === 'comparar') for(const k of ['a', 'b']) z[k] = { nombre: corta(z[k] && z[k].nombre, 40), puntos: (Array.isArray(z[k] && z[k].puntos) ? z[k].puntos : []).map((x) => corta(x, 140)).slice(0, 6) };
      const vacio = (z.tipo === 'lista' && !z.items.length) || (z.tipo === 'linea' && !z.eventos.length) || (z.tipo === 'diagrama' && z.nodos.length < 2) || (z.tipo === 'tabla' && !z.filas.length);
      if(vacio) z = null;
    }
    return voz || z ? { voz, pizarra: z } : null;
  }).filter(Boolean).slice(0, 30);
  if(!pasos.length) throw new Error('La clase llegó vacía. Prueba otra vez.');
  return {
    titulo: corta(j.titulo, 120) || 'Tu clase',
    pasos,
    referencias: (Array.isArray(j.referencias) ? j.referencias : []).map((r) => typeof r === 'string' ? { titulo: corta(r, 200) } : { titulo: corta(r && r.titulo, 200), autor: corta(r && r.autor, 120), anio: corta(r && (r.anio || r.año), 12), tipo: corta(r && r.tipo, 30) }).filter((r) => r.titulo).slice(0, 8),
    repaso: (Array.isArray(j.repaso) ? j.repaso : []).map((r) => ({ pregunta: corta(r && r.pregunta, 300), respuesta: corta(r && r.respuesta, 500) })).filter((r) => r.pregunta).slice(0, 6),
  };
}

/* ══ 2 · DIBUJAR ════════════════════════════════════════════════════════════
   Cada elemento sabe dibujarse en «unidades»: una lista de nodos que se van
   prendiendo (clase .ve) en orden. El lápiz va a la última unidad prendida. */
const piz = $('#pizarra'), lapiz = $('#lapiz');
/* «**así**» → palabras sueltas, y las resaltadas dentro de un <mark> que se pinta al llegar */
function palabras(t){
  const frag = document.createElement('span'), unidades = [];
  String(t || '').split(/(\*\*[^*]+\*\*)/).forEach((trozo) => {
    if(!trozo) return;
    const resalta = /^\*\*.*\*\*$/.test(trozo), dentro = resalta ? trozo.slice(2, -2) : trozo;
    const caja = resalta ? document.createElement('mark') : frag;
    dentro.split(/(\s+)/).forEach((w) => {
      if(!w) return;
      if(/^\s+$/.test(w)){ caja.append(w); return; }
      const s = document.createElement('span'); s.className = 'pal'; s.textContent = w; caja.append(s); unidades.push(s);
      if(resalta) s.dataset.marca = '1';
    });
    if(resalta) frag.append(caja);
  });
  return { nodo: frag, unidades };
}
function titulito(t, tinta){ if(!t) return { nodo: null, unidades: [] }; const d = document.createElement('div'); d.className = 't'; d.style.color = tinta; const p = palabras(t); d.append(p.nodo); return { nodo: d, unidades: p.unidades }; }

function crearElemento(z, n){
  const tinta = TINTAS[n % TINTAS.length];
  const el = document.createElement('div'); el.className = 'el ' + z.tipo; el.style.color = tinta;
  let u = [];
  const conTitulo = (t) => { const x = titulito(t, tinta); if(x.nodo) el.append(x.nodo); u.push(...x.unidades); };
  if(z.tipo === 'titulo'){
    const h = document.createElement('h2'); const p = palabras(z.texto); h.append(p.nodo); el.append(h); u.push(...p.unidades);
    if(z.sub){ const s = document.createElement('div'); s.className = 'sub'; const q = palabras(z.sub); s.append(q.nodo); el.append(s); u.push(...q.unidades); }
  } else if(z.tipo === 'texto'){
    const p = document.createElement('p'); const w = palabras(z.texto); p.append(w.nodo); el.append(p); u.push(...w.unidades);
  } else if(z.tipo === 'lista'){
    conTitulo(z.titulo);
    const l = document.createElement(z.numerada ? 'ol' : 'ul');
    z.items.forEach((it, i) => { const li = document.createElement('li'); li.innerHTML = `<span class="num" style="background:${tinta}">${z.numerada ? i + 1 : '•'}</span>`;
      const s = document.createElement('span'); s.textContent = it.replace(/\*\*/g, ''); li.append(s); l.append(li); u.push(li); });
    el.append(l);
  } else if(z.tipo === 'definicion' || z.tipo === 'formula' || z.tipo === 'cita'){
    const t = document.createElement('div'); t.className = 'tarj';
    if(z.tipo === 'definicion'){ const a = document.createElement('div'); a.className = 'term'; const p = palabras(z.termino || ''); a.append(p.nodo); t.append(a); u.push(...p.unidades); }
    if(z.tipo === 'formula'){ const a = document.createElement('div'); a.className = 'ex'; const p = palabras(z.expresion || ''); a.append(p.nodo); t.append(a); u.push(...p.unidades); }
    const b = document.createElement('p'); const q = palabras(z.texto || ''); b.append(q.nodo); t.append(b); u.push(...q.unidades);
    if(z.tipo === 'cita' && z.autor){ const s = document.createElement('small'); s.textContent = '— ' + z.autor; t.append(s); }
    el.append(t);
  } else if(z.tipo === 'linea'){
    conTitulo(z.titulo);
    const eje = document.createElement('div'); eje.className = 'eje';
    z.eventos.forEach((e) => { const d = document.createElement('div'); d.className = 'ev'; d.innerHTML = `<div class="fecha">${esc(e.fecha)}</div><p>${esc(e.texto)}</p>`; eje.append(d); u.push(d); });
    el.append(eje); el._eje = eje; el._eventos = z.eventos.length;
  } else if(z.tipo === 'tabla'){
    conTitulo(z.titulo);
    const m = document.createElement('div'); m.className = 'marco';
    const tb = document.createElement('table');
    if(z.columnas.length){ const tr = document.createElement('tr'); tr.innerHTML = z.columnas.map((c) => `<th>${esc(c)}</th>`).join(''); tb.append(tr); u.push(tr); }
    z.filas.forEach((f) => { const tr = document.createElement('tr'); tr.innerHTML = f.map((c) => `<td>${esc(c)}</td>`).join(''); tb.append(tr); u.push(tr); });
    m.append(tb); el.append(m);
  } else if(z.tipo === 'comparar'){
    conTitulo(z.titulo);
    const d = document.createElement('div'); d.className = 'dos';
    const lados = ['a', 'b'].map((k, i) => { const l = document.createElement('div'); l.className = 'lado'; l.style.color = TINTAS[(n + i) % TINTAS.length];
      l.innerHTML = `<h4>${esc(z[k].nombre)}</h4>`; const ul = document.createElement('ul'); l.append(ul); d.append(l);
      return z[k].puntos.map((p) => { const li = document.createElement('li'); li.textContent = p; ul.append(li); return li; }); });
    for(let i = 0; i < Math.max(lados[0].length, lados[1].length); i++){ if(lados[0][i]) u.push(lados[0][i]); if(lados[1][i]) u.push(lados[1][i]); }
    el.append(d);
  } else if(z.tipo === 'diagrama'){
    conTitulo(z.titulo);
    u.push(...dibujarDiagrama(el, z));
  }
  return { el, unidades: u };
}

/* diagrama: por niveles (los que no reciben flecha arriba), cajas con texto partido, flechas curvas */
function dibujarDiagrama(el, z){
  /* el dibujo mide lo que mide el pizarrón: en el teléfono la letra sale a su tamaño real, no encogida */
  const W = Math.round(Math.min(640, Math.max(300, (piz.clientWidth || 640) - 36))), SALTO = 70, NS = 'http://www.w3.org/2000/svg';
  const entra = new Map(z.nodos.map((n) => [n.id, 0])); z.flechas.forEach((f) => entra.set(f.a, entra.get(f.a) + 1));
  const nivel = new Map(); const raices = z.nodos.filter((n) => !entra.get(n.id)); (raices.length ? raices : [z.nodos[0]]).forEach((n) => nivel.set(n.id, 0));
  for(let vuelta = 0; vuelta < z.nodos.length; vuelta++) for(const f of z.flechas) if(nivel.has(f.de)){ const l = nivel.get(f.de) + 1; if(!nivel.has(f.a) || (nivel.get(f.a) < l && l < z.nodos.length)) nivel.set(f.a, l); }
  z.nodos.forEach((n) => { if(!nivel.has(n.id)) nivel.set(n.id, 0); });
  const filas = []; z.nodos.forEach((n) => { const l = nivel.get(n.id); (filas[l] = filas[l] || []).push(n); });
  const filasLlenas = filas.filter(Boolean); const pos = new Map();
  /* cada caja parte su texto a lo ancho que le toca y crece en alto lo que haga falta */
  const partir = (t, cw) => { const porRenglon = Math.max(6, Math.floor((cw - 12) / 8.2)), ren = []; let act = '';
    t.split(/\s+/).forEach((w) => { if((act + ' ' + w).trim().length > porRenglon && act){ ren.push(act); act = w; } else act = (act + ' ' + w).trim(); }); if(act) ren.push(act); return ren.slice(0, 4); };
  let y = 10;
  filasLlenas.forEach((fila) => { const g = 12, cw = Math.min(200, (W - g * (fila.length + 1)) / fila.length);
    const rens = fila.map((n) => partir(n.texto, cw)), h = Math.max(48, 18 + Math.max(...rens.map((r) => r.length)) * 18);
    fila.forEach((n, i) => pos.set(n.id, { x: g + i * (cw + g) + (W - (fila.length * cw + (fila.length + 1) * g)) / 2, y, w: cw, h, ren: rens[i] }));
    y += h + SALTO; });
  const H = y - SALTO + 10;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'dib'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const u = [], hechos = new Set(), flechasDe = (id) => z.flechas.filter((f) => f.a === id);
  const ponNodo = (n) => {
    const p = pos.get(n.id), g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'nodo');
    const r = document.createElementNS(NS, 'rect'); Object.entries({ x: p.x, y: p.y, width: p.w, height: p.h, rx: 14 }).forEach(([k, v]) => r.setAttribute(k, v)); g.append(r);
    const t = document.createElementNS(NS, 'text'); t.setAttribute('text-anchor', 'middle');
    p.ren.forEach((s, i, a) => { const ts = document.createElementNS(NS, 'tspan'); ts.setAttribute('x', p.x + p.w / 2); ts.setAttribute('y', p.y + p.h / 2 + 5 + (i - (a.length - 1) / 2) * 18); ts.textContent = s; t.append(ts); });
    g.append(t); svg.append(g); u.push(g); hechos.add(n.id);
  };
  const ponFlecha = (f) => {
    const a = pos.get(f.de), b = pos.get(f.a); const x1 = a.x + a.w / 2, x2 = b.x + b.w / 2;
    let d, fin, ang;
    if(b.y > a.y){ const y1 = a.y + a.h, y2 = b.y - 4; d = `M${x1},${y1} C${x1},${y1 + SALTO / 2} ${x2},${y2 - SALTO / 2} ${x2},${y2}`; fin = [x2, y2]; ang = Math.PI / 2; }
    else { const y1 = a.y + a.h / 2, y2 = b.y + b.h / 2, lado = Math.min(W - 6, Math.max(a.x + a.w, b.x + b.w) + 26); d = `M${a.x + a.w},${y1} C${lado},${y1} ${lado},${y2} ${b.x + b.w + 4},${y2}`; fin = [b.x + b.w + 4, y2]; ang = Math.PI; }
    const k = 11, p1 = [fin[0] - k * Math.cos(ang - .45), fin[1] - k * Math.sin(ang - .45)], p2 = [fin[0] - k * Math.cos(ang + .45), fin[1] - k * Math.sin(ang + .45)];
    d += ` M${p1[0]},${p1[1]} L${fin[0]},${fin[1]} L${p2[0]},${p2[1]}`;
    const path = document.createElementNS(NS, 'path'); path.setAttribute('class', 'fl'); path.setAttribute('d', d); svg.insertBefore(path, svg.firstChild);
    path._fin = fin; path._flecha = true; u.push(path);
    if(f.texto){ const t = document.createElementNS(NS, 'text'); t.setAttribute('class', 'flt'); t.setAttribute('x', x1 + (x2 - x1) * .72 + 6); t.setAttribute('y', b.y > a.y ? b.y - SALTO * .32 : (a.y + b.y) / 2 + a.h / 2); t.textContent = f.texto; t.style.opacity = 0; svg.append(t); path._etiqueta = t; }
  };
  /* nodo por nodo en orden de nivel; antes de cada nodo, las flechas que le llegan desde uno ya dibujado */
  const puestas = new Set();
  [...z.nodos].sort((a, b) => nivel.get(a.id) - nivel.get(b.id)).forEach((n) => {
    flechasDe(n.id).filter((f) => hechos.has(f.de)).forEach((f) => { ponFlecha(f); puestas.add(f); }); ponNodo(n); });
  /* las que regresan (ciclos, o hacia un nodo que salió antes) van al final */
  z.flechas.filter((f) => !puestas.has(f)).forEach(ponFlecha);
  el.append(svg);
  return u;
}

/* las flechas se dibujan con su trazo: el largo se mide ya en la página, se desplaza entero y al prenderse llega a 0 */
const largo = (x) => { if(!x._L){ x._L = x.getTotalLength() || 1; x.style.strokeDasharray = x._L; } return x._L; };
function prender(unidad){
  if(unidad._flecha){ largo(unidad); unidad.style.transition = unidad._apagada ? 'stroke-dashoffset .6s ease' : 'none'; unidad.style.strokeDashoffset = 0; unidad._apagada = false; if(unidad._etiqueta){ unidad._etiqueta.style.transition = 'opacity .4s .3s'; unidad._etiqueta.style.opacity = 1; } return; }
  unidad.classList.add('ve');
  if(unidad.dataset && unidad.dataset.marca) unidad.closest('mark')?.classList.add('ve');
}
function apagarTodo(u){ u.forEach((x) => { if(x._flecha){ x.style.transition = 'none'; x.style.strokeDashoffset = largo(x); x._apagada = true; if(x._etiqueta){ x._etiqueta.style.transition = 'none'; x._etiqueta.style.opacity = 0; } } else { x.classList.remove('ve'); x.closest && x.closest('mark')?.classList.remove('ve'); } }); }
function dondeEsta(unidad){
  const pr = piz.getBoundingClientRect();
  if(unidad._flecha && unidad._fin){ const s = unidad.ownerSVGElement, m = s.getScreenCTM(); if(m){ const pt = s.createSVGPoint(); pt.x = unidad._fin[0]; pt.y = unidad._fin[1]; const q = pt.matrixTransform(m); return [q.x - pr.left, q.y - pr.top]; } }
  const r = unidad.getBoundingClientRect(); return [r.right - pr.left, r.top - pr.top + r.height * .75];
}

/* ── un solo bucle de animación, y sólo mientras hay algo que dibujar ── */
const anim = { activo: null, lx: 40, ly: 40, tx: 40, ty: 40, corriendo: false };
function bucle(t){
  const a = anim.activo;
  if(a){
    const p = Math.min(1, (t - a.inicio) / a.dur), cuantas = Math.ceil(p * a.unidades.length);
    while(a.prendidas < cuantas){ const x = a.unidades[a.prendidas++]; prender(x); [anim.tx, anim.ty] = dondeEsta(x);
      if(a.el._eje) a.el._eje.style.setProperty('--crece', a.prendidas / a.unidades.length); }
    if(p >= 1){ anim.activo = null; a.listo(); }
  }
  anim.lx += (anim.tx - anim.lx) * .22; anim.ly += (anim.ty - anim.ly) * .22;
  lapiz.style.transform = `translate3d(${(anim.lx - 3).toFixed(1)}px, ${(anim.ly - 31).toFixed(1)}px, 0)`;
  const quieto = !anim.activo && Math.abs(anim.tx - anim.lx) < .5 && Math.abs(anim.ty - anim.ly) < .5;
  if(quieto){ anim.corriendo = false; lapiz.classList.toggle('ve', false); return; }
  requestAnimationFrame(bucle);
}
function dibujar(obj, dur){
  return new Promise((listo) => {
    apagarTodo(obj.unidades);
    if(obj.el._eje) obj.el._eje.style.setProperty('--crece', 0);
    if(!obj.unidades.length){ listo(); return; }
    anim.activo = { ...obj, dur: Math.max(500, dur), inicio: performance.now(), prendidas: 0, listo };
    lapiz.classList.add('ve');
    if(!anim.corriendo){ anim.corriendo = true; requestAnimationFrame(bucle); }
  });
}
function dibujarYa(obj){ obj.unidades.forEach(prender); if(obj.el._eje) obj.el._eje.style.setProperty('--crece', 1); }
function seguir(el){
  const r = el.getBoundingClientRect(), alto = innerHeight - 200;
  if(r.top < 70 || r.bottom > alto) scrollTo({ top: scrollY + r.top - Math.min(110, alto * .2), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

/* ══ 3 · LA VOZ ═════════════════════════════════════════════════════════════ */
const MODOS_VOZ = ['tel', 'natural', 'no'];
let modoVoz = guarda.leer('explica.voz', 'tel'), velocidad = guarda.leer('explica.vel', 1);
let vocesTel = [];
const cargarVoces = () => { vocesTel = (speechSynthesis.getVoices && speechSynthesis.getVoices()) || []; };
if('speechSynthesis' in window){ cargarVoces(); speechSynthesis.addEventListener?.('voiceschanged', cargarVoces); }
function vozTel(motor){
  const es = vocesTel.filter((v) => /^es/i.test(v.lang));
  const mx = es.filter((v) => /MX|US|419/i.test(v.lang));
  const pref = motor === 'groq' ? /juan|jorge|diego|carlos|male|hombre/i : /paulina|m[oó]nica|sabina|female|mujer|google/i;
  return mx.find((v) => pref.test(v.name)) || mx[0] || es.find((v) => pref.test(v.name)) || es[0] || null;
}
/* lo que se OYE: los subíndices y los signos se leen como se dicen («CO₂» → «CO2», «→» → «produce») */
const SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '⁰': '0', '¹': '1', '²': ' al cuadrado', '³': ' al cubo' };
const decible = (t) => String(t || '').replace(/[₀-₉⁰¹²³]/g, (c) => SUBS[c]).replace(/\s*(→|⟶|=>)\s*/g, ' produce ').replace(/\s=\s/g, ' igual a ')
  .replace(/\s\+\s/g, ' más ').replace(/\s[·×]\s/g, ' por ').replace(/\*\*/g, '');
const decirTel = (t0, motor, alPalabra) => new Promise((fin) => { const t = decible(t0);
  if(!('speechSynthesis' in window) || !t){ fin(); return; }
  const u = new SpeechSynthesisUtterance(t); const v = vozTel(motor); if(v){ u.voice = v; u.lang = v.lang; } else u.lang = 'es-MX';
  u.rate = Math.min(2, 1.02 * velocidad); u.onend = u.onerror = () => fin();
  u.onboundary = (e) => { if(e.name === 'word' || e.charIndex != null) alPalabra && alPalabra(e.charIndex); };
  speechSynthesis.speak(u);
});
/* la natural: audio de Gemini; PCM crudo se envuelve en WAV aquí mismo */
const audiosNat = new Map();
function wav(b64, mime){
  const crudo = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if(!/L16|pcm/i.test(mime)) return new Blob([crudo], { type: mime });
  const rate = +(/rate=(\d+)/.exec(mime) || [, 24000])[1], h = new DataView(new ArrayBuffer(44));
  const s = (o, t) => [...t].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF'); h.setUint32(4, 36 + crudo.length, true); s(8, 'WAVE'); s(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); s(36, 'data'); h.setUint32(40, crudo.length, true);
  return new Blob([h.buffer, crudo], { type: 'audio/wav' });
}
function pedirNatural(i){
  if(audiosNat.has(i) || !clase || !clase.pasos[i] || !clase.pasos[i].voz) return audiosNat.get(i);
  const p = (async () => {
    const r = await llamar(`${SERVIDOR}/api/sala/${SALA}/ia-voz`, { metodo: 'POST', cuerpo: { texto: decible(clase.pasos[i].voz), voz: clase.motor === 'groq' ? 'Charon' : 'Kore', estilo: 'Explícalo en español de México como una maestra clara, cálida y con buen ritmo' }, espera: 90000 });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || !j.bien) throw new Error(j.error || 'La voz natural no contestó.');
    return URL.createObjectURL(wav(j.data, j.mime));
  })();
  p.catch(() => {}); audiosNat.set(i, p); return p;
}
let audioActual = null;
async function decirNatural(i){
  const url = await pedirNatural(i);
  return new Promise((fin) => { const a = new Audio(url); audioActual = a; a.playbackRate = velocidad; a.onended = a.onerror = () => fin(); a.play().catch(() => fin()); });
}
function callar(){ try{ speechSynthesis.cancel(); }catch{} if(audioActual){ audioActual.pause(); audioActual = null; } }

/* ══ 4 · LA CLASE EN PANTALLA ═══════════════════════════════════════════════ */
let clase = null, actual = -1, sonando = false, turno = 0;
const hechos = [];                     /* por paso: { el, unidades } o null */
const ver = (cual) => { $('#vInicio').hidden = cual !== 'inicio'; $('#vPrepara').hidden = cual !== 'prepara'; $('#vClase').hidden = cual !== 'clase'; $('#mando').hidden = cual !== 'clase'; $('#bNueva').hidden = cual !== 'clase'; };
const segundos = (t) => Math.min(16, Math.max(2.2, String(t || '').split(/\s+/).length * .38 / velocidad));
function pintarSub(t, hasta){ const p = String(t || '').split(/(\s+)/); let n = 0; $('#subVoz').innerHTML = p.map((w) => { const i = n; n += w.length; return /^\s+$/.test(w) ? w : `<span class="${i + w.length <= hasta ? 'ya' : i <= hasta ? 'ahora' : ''}">${esc(w)}</span>`; }).join(''); }
function botonPlay(){ $('#bPlay').innerHTML = ico(sonando ? 'pause' : 'play'); $('#bVoz').innerHTML = ico(modoVoz === 'no' ? 'volume-x' : 'volume-2') ; $('#bVoz').title = { tel: 'Voz del teléfono', natural: 'Voz natural de Gemini', no: 'Sin voz' }[modoVoz]; $('#bVel').textContent = velocidad + '×'; }

function asegurarHasta(i){
  /* lo de antes, dibujado completo y quieto; lo de después, fuera */
  for(let k = 0; k < clase.pasos.length; k++){
    const z = clase.pasos[k].pizarra;
    if(k < i){ if(z && !hechos[k]){ hechos[k] = crearElemento(z, k); piz.append(hechos[k].el); dibujarYa(hechos[k]); } else if(hechos[k]) dibujarYa(hechos[k]); }
    if(k > i && hechos[k]){ hechos[k].el.remove(); hechos[k] = null; }
  }
  piz.querySelector('.final')?.remove();
}
async function reproducir(i){
  if(!clase) return;
  const yo = ++turno; callar(); anim.activo = null;
  i = Math.max(0, Math.min(clase.pasos.length - 1, i)); actual = i;
  asegurarHasta(i);
  const paso = clase.pasos[i];
  $('#avance').style.width = ((i + 1) / clase.pasos.length * 100) + '%';
  pintarSub(paso.voz, -1);
  let obj = null;
  if(paso.pizarra){ if(hechos[i]) hechos[i].el.remove(); obj = hechos[i] = crearElemento(paso.pizarra, i); piz.append(obj.el); seguir(obj.el); }
  if(!sonando){ if(obj) dibujarYa(obj); pintarSub(paso.voz, Infinity); return; }
  const dur = segundos(paso.voz) * 1000;
  if(modoVoz === 'natural'){ pedirNatural(i + 1); pedirNatural(i + 2); }
  const inicio = performance.now();
  const subTimer = setInterval(() => { if(yo !== turno){ clearInterval(subTimer); return; } pintarSub(paso.voz, paso.voz.length * Math.min(1, (performance.now() - inicio) / dur)); }, 160);
  const voz = (async () => {
    if(modoVoz === 'no'){ await new Promise((r) => setTimeout(r, dur)); return; }
    if(modoVoz === 'natural'){ try{ await decirNatural(i); return; }catch(e){ aviso('La voz natural falló; sigo con la del teléfono. (' + e.message + ')'); modoVoz = 'tel'; botonPlay(); } }
    await Promise.race([decirTel(paso.voz, clase.motor), new Promise((r) => setTimeout(r, dur * 1.8 + 2500))]);
  })();
  const dibujo = obj ? dibujar(obj, dur * .82) : Promise.resolve();
  await Promise.all([voz, dibujo]); clearInterval(subTimer);
  if(yo !== turno) return;
  pintarSub(paso.voz, Infinity);
  await new Promise((r) => setTimeout(r, 380));
  if(yo !== turno || !sonando) return;
  if(i < clase.pasos.length - 1) reproducir(i + 1);
  else { sonando = false; botonPlay(); pintarFinal(); }
}
function pintarFinal(){
  /* si la abrió un nodo del camino de Estudio (estudio.html), se le avisa que la clase ya se vio completa */
  if(window.top !== window) try{ parent.postMessage({ explica: 'fin', titulo: clase.titulo }, location.origin); }catch{}
  piz.querySelector('.final')?.remove();
  const f = document.createElement('div'); f.className = 'final';
  if(clase.referencias.length){
    f.insertAdjacentHTML('beforeend', `<div class="el refs" style="color:var(--azul)"><div class="t">Referencias</div><ol>${clase.referencias.map((r) => {
      const q = encodeURIComponent([r.titulo, r.autor].filter(Boolean).join(' '));
      const wiki = /wikipedia/i.test(r.tipo || '') ? `https://es.wikipedia.org/w/index.php?search=${encodeURIComponent(r.titulo)}` : `https://www.google.com/search?q=${q}`;
      return `<li>${esc(r.titulo)}${r.autor ? ' · ' + esc(r.autor) : ''}${r.anio ? ' (' + esc(r.anio) + ')' : ''} · <a href="${wiki}" target="_blank" rel="noopener">buscar</a></li>`; }).join('')}</ol>
      <p class="ojo">Las referencias las propone la IA: el botón «buscar» te deja comprobar que existen antes de citarlas.</p></div>`);
  }
  if(clase.repaso.length) f.insertAdjacentHTML('beforeend', `<div class="el repaso" style="color:var(--verde)"><div class="t">Repaso</div>${clase.repaso.map((r) => `<details><summary>${esc(r.pregunta)}</summary><p>${esc(r.respuesta)}</p></details>`).join('')}</div>`);
  piz.append(f); seguir(f);
  pintarSub('Listo. Toca el signo de pregunta para preguntarme algo sobre esto, o repite cualquier paso.', Infinity);
}

/* ══ 5 · PEDIDOS: clase nueva y preguntas sobre la misma ════════════════════ */
let fotos = [];
function aviso(t){ const a = $('#aviso'); a.textContent = t; a.hidden = !t; if(!$('#vClase').hidden && t){ pintarSub(t, Infinity); } }
const ESPERA = ['Armando tu clase…', 'Ordenando las ideas…', 'Buscando buenos ejemplos…', 'Preparando el pizarrón…', 'Ya casi…'];
async function pedirClase(){
  const tema = $('#tema').value.trim();
  if(!tema && !fotos.length){ aviso('Escribe qué quieres que te explique (o sube una foto de tus apuntes).'); $('#tema').focus(); return; }
  if(!llave()){ aviso('Falta la llave de La Sala en este teléfono.'); $('#cajaLlave').hidden = false; $('#llaveTxt').focus(); return; }
  /* el iPhone sólo deja hablar si la voz arrancó con un toque: se «despierta» aquí, con una pausa vacía */
  try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }catch{}
  let motor = $('#motor').value; if(fotos.length && motor === 'groq'){ motor = 'gemini'; }
  aviso(''); ver('prepara'); $('#quien').textContent = '· ' + NOMBRE[motor];
  let k = 0; $('#preparaTxt').innerHTML = `${NOMBRE[motor]} está armando tu clase<b>${esc(tema || 'tus apuntes')}</b>`;
  const t0 = Date.now(), largaEspera = motor === 'gemini';
  const giro = setInterval(() => { k++; const s = Math.round((Date.now() - t0) / 1000);
    $('#preparaTxt').innerHTML = `${ESPERA[k % ESPERA.length]}${largaEspera ? ` <small>(${s} s de unos 120)</small>` : ''}<b>${esc(tema || 'tus apuntes')}</b>`; }, 3000);
  try{
    const t = await iaTexto({ motor, json: true, tope: 8000, sistema: sistema(motor, $('#nivel').value, $('#largo').value),
      mensajes: [{ de: 'tu', texto: tema ? `Explícame: ${tema}` : 'Explícame lo que dicen estas fotos de mis apuntes.' }], imagenes: fotos });
    const c = normalizar(sacarJSON(t)); c.motor = motor; c.tema = tema; c.id = Date.now().toString(36); c.fecha = Date.now();
    guardarHistorial(c); empezar(c);
  }catch(e){
    ver('inicio'); aviso(e.message || String(e)); if(e.llave) $('#cajaLlave').hidden = false;
  }finally{ clearInterval(giro); }
}
function empezar(c){
  clase = c; hechos.length = 0; audiosNat.clear(); piz.querySelectorAll('.el, .final').forEach((x) => x.remove());
  $('#quien').textContent = '· ' + NOMBRE[c.motor || 'gemini']; document.title = c.titulo + ' · Explica';
  ver('clase'); scrollTo({ top: 0 }); sonando = true; botonPlay(); reproducir(0);
}
async function preguntar(q){
  if(!clase || !q) return;
  sonando = false; callar(); botonPlay(); pintarSub(`${NOMBRE[clase.motor]} está pensando tu pregunta…`, Infinity);
  try{
    const resumen = clase.pasos.map((p, i) => `${i + 1}. ${p.voz}`).join('\n');
    const t = await iaTexto({ motor: clase.motor, json: true, tope: 6000,
      sistema: sistema(clase.motor, $('#nivel').value, 'corta') + `\n\nYA DISTE esta clase («${clase.titulo}»):\n${resumen}\n\nAhora contesta la PREGUNTA de Carlos como una continuación de la clase: de 3 a 7 pasos nuevos con la misma forma JSON (el primero NO tiene que ser título). Puedes agregar referencias y repaso nuevos.`,
      mensajes: [{ de: 'tu', texto: q }] });
    const nueva = normalizar(sacarJSON(t)), desde = clase.pasos.length;
    clase.pasos.push({ voz: '', pizarra: { tipo: 'titulo', texto: q.length > 70 ? q.slice(0, 68) + '…' : q, sub: 'Tu pregunta' } }, ...nueva.pasos);
    clase.referencias.push(...nueva.referencias.filter((r) => !clase.referencias.some((x) => x.titulo === r.titulo)));
    if(nueva.repaso.length) clase.repaso = nueva.repaso;
    guardarHistorial(clase); sonando = true; botonPlay(); reproducir(desde);
  }catch(e){ pintarSub('No pude contestar: ' + (e.message || e), Infinity); }
}

/* ══ 6 · HISTORIAL (en este teléfono) ═══════════════════════════════════════ */
function guardarHistorial(c){ const h = guarda.leer('explica.historial', []).filter((x) => x.id !== c.id); h.unshift(c); guarda.poner('explica.historial', h.slice(0, 25)); pintarHistorial(); }
function pintarHistorial(){
  const h = guarda.leer('explica.historial', []);
  $('#hist').hidden = !h.length;
  $('#histLista').innerHTML = h.map((c) => `<li><button class="bt abrir" data-abrir="${esc(c.id)}">${ico('book-open')}<span>${esc(c.titulo)}</span><small>${new Date(c.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</small></button><button class="bt redondo" data-borrar="${esc(c.id)}" aria-label="Borrar «${esc(c.titulo)}»">${ico('trash')}</button></li>`).join('');
}
$('#histLista').addEventListener('click', (e) => {
  const a = e.target.closest('[data-abrir]'), b = e.target.closest('[data-borrar]');
  const h = guarda.leer('explica.historial', []);
  if(a){ const c = h.find((x) => x.id === a.dataset.abrir); if(c){ try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }catch{} empezar(c); } }
  if(b){ if(b.dataset.seguro){ guarda.poner('explica.historial', h.filter((x) => x.id !== b.dataset.borrar)); pintarHistorial(); } else { b.dataset.seguro = '1'; b.style.background = 'var(--rojo)'; setTimeout(() => { delete b.dataset.seguro; b.style.background = ''; }, 2500); } }
});

/* ══ 7 · BOTONES ═══════════════════════════════════════════════════════════ */
$('#bExplica').addEventListener('click', pedirClase);
$('#tema').addEventListener('keydown', (e) => { if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) pedirClase(); });
$('#llaveTxt').addEventListener('change', () => { if(ponerLlave($('#llaveTxt').value)){ $('#cajaLlave').hidden = true; aviso('Listo, ya quedó la llave en este teléfono.'); } });
$('#archivo').addEventListener('change', async () => {
  for(const f of [...$('#archivo').files].slice(0, 4 - fotos.length)){
    const img = await createImageBitmap(f).catch(() => null); if(!img) continue;
    const k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); const url = cv.toDataURL('image/jpeg', .85);
    fotos.push({ mime: 'image/jpeg', data: url.split(',')[1], url });
  }
  $('#archivo').value = ''; $('#fotos').innerHTML = fotos.map((f, i) => `<img src="${f.url}" alt="Foto ${i + 1} de tus apuntes">`).join('');
  if(fotos.length && $('#motor').value === 'groq'){ $('#motor').value = 'gemini'; aviso('Las fotos las lee Paulina (Negro no ve imágenes). Ella tarda unos 2 minutos en armar la clase.'); }
});
$('#ideas').innerHTML = ['La Revolución Mexicana en línea de tiempo', 'Cómo funciona la fotosíntesis', 'Derivada de un producto con ejemplo', 'Qué es una red neuronal', 'Causas de la Segunda Guerra Mundial']
  .map((t) => `<button type="button">${esc(t)}</button>`).join('');
$('#ideas').addEventListener('click', (e) => { const b = e.target.closest('button'); if(b){ $('#tema').value = b.textContent; $('#tema').focus(); } });
$('#bPlay').addEventListener('click', () => { if(sonando){ sonando = false; turno++; callar(); anim.activo = null; if(hechos[actual]) dibujarYa(hechos[actual]); botonPlay(); } else { sonando = true; botonPlay(); reproducir(actual >= clase.pasos.length - 1 && piz.querySelector('.final') ? 0 : Math.max(0, actual)); } });
$('#bSig').addEventListener('click', () => { if(actual < clase.pasos.length - 1) reproducir(actual + 1); else { sonando = false; turno++; callar(); botonPlay(); asegurarHasta(actual); if(hechos[actual]) dibujarYa(hechos[actual]); pintarFinal(); } });
$('#bAtras').addEventListener('click', () => reproducir(actual - 1));
$('#bVel').addEventListener('click', () => { velocidad = { 1: 1.25, 1.25: 1.5, 1.5: .85, .85: 1 }[velocidad] || 1; guarda.poner('explica.vel', velocidad); botonPlay(); });
$('#bVoz').addEventListener('click', () => { modoVoz = MODOS_VOZ[(MODOS_VOZ.indexOf(modoVoz) + 1) % MODOS_VOZ.length]; guarda.poner('explica.voz', modoVoz); botonPlay(); pintarSub({ tel: 'Voz del teléfono.', natural: 'Voz natural de Gemini (tarda un poquito más en arrancar cada paso).', no: 'Sin voz: sólo el pizarrón.' }[modoVoz], Infinity); });
$('#bPreg').addEventListener('click', () => { $('#fPreg').hidden = !$('#fPreg').hidden; if(!$('#fPreg').hidden) $('#pregTxt').focus(); });
$('#fPreg').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#pregTxt').value.trim(); if(!q) return; $('#pregTxt').value = ''; $('#fPreg').hidden = true; try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }catch{} preguntar(q); });
$('#bNueva').addEventListener('click', () => { sonando = false; turno++; callar(); clase = null; ver('inicio'); document.title = 'Explica · La Sala'; $('#tema').value = ''; fotos = []; $('#fotos').innerHTML = ''; });
document.addEventListener('visibilitychange', () => { if(document.hidden && sonando){ sonando = false; turno++; callar(); botonPlay(); } });
/* ?tema=… arranca directo (desde la mesa o un link) */
const q0 = new URLSearchParams(location.search).get('tema'); if(q0) $('#tema').value = q0;
/* …y Estudio también dice el nivel y el largo («corta»: un nodo del camino no es una clase de una hora) */
{ const q = new URLSearchParams(location.search); for(const k of ['nivel', 'largo', 'motor']){ const v = q.get(k); if(v && [...$('#' + k).options].some((o) => o.value === v)) $('#' + k).value = v; } }
botonPlay(); pintarHistorial(); ver('inicio');
/* para las pruebas: cargar una clase ya hecha sin pedirla */
window.__explica = { empezar: (c) => empezar(normalizar(c)), normalizar, estado: () => ({ actual, sonando, pasos: clase && clase.pasos.length, dibujados: piz.querySelectorAll('.el').length }) };
