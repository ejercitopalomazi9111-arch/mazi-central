/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · CHAT CENTRAL
   ───────────────────────────────────────────────────────────────────────────
   Donde el dueño ve todo: los chats de WhatsApp, Instagram y Facebook, lo que
   contestó el bot (respuesta hecha o IA) y, con «Cómo pensó», el porqué de cada
   respuesta de la IA. Contesta él mismo, ve sus avisos, aprueba lo que la IA
   aprendió y le pregunta cosas a su IA. Nunca ve una llave de IA: todo pasa por
   nuestro servidor (urban-pest/servidor/RUTAS.md).

   Sin servidor (o con ?muestra) enseña datos de MUESTRA, y lo dice.
   Conectar: ?servidor=https://…  y la llave del panel se guarda en el teléfono.
   ═══════════════════════════════════════════════════════════════════════════ */
import { icono } from './iconos.js';
import { MUESTRA } from './muestra.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pesos = (n) => '$' + Math.round(n).toLocaleString('es-MX');
const guarda = { leer: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, poner: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

/* ── de dónde salen los datos ───────────────────────────────────────────── */
const q = new URLSearchParams(location.search);
const SERVIDOR = q.get('servidor') || guarda.leer('up_servidor');
if(q.get('servidor')) guarda.poner('up_servidor', q.get('servidor'));
const DE_MUESTRA = q.has('muestra') || !SERVIDOR;
const llave = () => guarda.leer('up_llave') || '';

const api = {
  async pedir(metodo, ruta, cuerpo){
    if(DE_MUESTRA) return muestra(metodo, ruta, cuerpo);
    const r = await fetch(SERVIDOR + ruta, { method: metodo, headers: { 'content-type': 'application/json', 'x-llave': llave() }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    const j = await r.json().catch(() => ({ bien: false, error: 'El servidor no contestó bien.' }));
    if(r.status === 401){ pedirLlave(); }
    return j;
  },
};
/* el servidor de mentiras: mismas rutas y misma forma */
const M = structuredClone(MUESTRA);
function muestra(metodo, ruta, b){
  const c = (canal, chat) => M.conversaciones.find(x => x.canal === canal && x.chat === chat);
  if(ruta === '/api/conversaciones') return { bien: true, conversaciones: M.conversaciones.map(({ mensajes, ...x }) => ({ ...x, n: mensajes.length, ultimo_texto: mensajes.at(-1)?.texto, ultima_via: mensajes.at(-1)?.via })) };
  if(ruta.startsWith('/api/conversacion?')){ const p = new URLSearchParams(ruta.split('?')[1]); return { bien: true, conversacion: c(p.get('canal'), p.get('chat')) }; }
  if(ruta === '/api/responder'){ const x = c(b.canal, b.chat); x.mensajes.push({ de: 'negocio', via: 'dueno', texto: b.texto, cuando: Date.now() }); x.ultimo = Date.now(); x.duenoHasta = Date.now() + 30 * 60e3; return { bien: true }; }
  if(ruta === '/api/avisos') return { bien: true, avisos: M.avisos };
  if(ruta === '/api/aviso/visto'){ const a = M.avisos.find(x => x.id === b.id); if(a) a.estado = 'visto'; return { bien: true }; }
  if(ruta === '/api/manual') return { bien: true, manual: M.manual };
  if(ruta === '/api/manual/aprobar'){ const e = M.manual.find(x => x.id === b.id); if(e) e.estado = 'aprobado'; return { bien: true }; }
  if(ruta === '/api/manual/descartar'){ const e = M.manual.find(x => x.id === b.id); if(e) e.estado = 'descartado'; return { bien: true }; }
  if(ruta === '/api/ia'){ M.ia.push({ de: 'yo', texto: b.texto }, { de: 'ia', texto: 'Esto es una muestra: cuando se conecte el servidor, aquí te contesta tu IA con los datos de tu negocio.' }); return { bien: true }; }
  return { bien: false, error: 'Ruta de muestra desconocida.' };
}
function pedirLlave(){
  const k = prompt('Escribe la llave del panel (te la da Grupo Mazi):');
  if(k){ guarda.poner('up_llave', k.trim()); location.reload(); }
}

/* ── estado ─────────────────────────────────────────────────────────────── */
const E = { pestana: 'chats', abierta: null, pensar: guarda.leer('up_pensar') === '1', filtro: '', conv: [], avisos: [], manual: [] };

/* ── tiempo en cristiano ────────────────────────────────────────────────── */
function hace(t){
  const s = Math.max(0, (Date.now() - t) / 1000);
  if(s < 60) return 'ahora';
  if(s < 3600) return Math.floor(s / 60) + ' min';
  if(s < 86400) return new Date(t).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  return new Date(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
const iniciales = (n) => esc(String(n || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/).map(p => p[0] || '').join('').slice(0, 2).toUpperCase() || '?');
const CANAL = { whatsapp: ['WA', 'WhatsApp'], instagram: ['IG', 'Instagram'], facebook: ['FB', 'Facebook'] };
const avatar = (c) => `<span class="avatar">${iniciales(c.nombre || c.chat)}<i class="canal ${c.canal}" aria-label="${CANAL[c.canal]?.[1] || ''}">${CANAL[c.canal]?.[0] || '?'}</i></span>`;
const VIA = {
  reflejo: ['m-reflejo', 'zap', 'Respuesta hecha'],
  cerebro: ['m-ia', 'sparkles', 'IA'],
  dueno: ['m-dueno', 'user-round', 'Tú'],
  respaldo: ['m-aviso', 'circle-alert', 'Respaldo'],
};
const marcaVia = (v) => VIA[v] ? `<span class="marca-chica ${VIA[v][0]}">${icono(VIA[v][1])}${VIA[v][2]}</span>` : '';

/* ── pintar ─────────────────────────────────────────────────────────────── */
function pintarIconos(raiz = document){ raiz.querySelectorAll('[data-ic]').forEach(e => { e.outerHTML = icono(e.dataset.ic); }); }

function pintarLista(){
  const v = $('#vistaLista');
  if(E.pestana === 'chats'){
    const f = E.filtro.toLowerCase();
    const lista = E.conv.filter(c => !f || (c.nombre || '').toLowerCase().includes(f) || (c.ultimo_texto || '').toLowerCase().includes(f));
    v.innerHTML = `<h1 class="titulo-vista">Chats</h1>
      <label class="buscar">${icono('search')}<input id="buscar" type="search" placeholder="Buscar cliente o mensaje" value="${esc(E.filtro)}" aria-label="Buscar"></label>
      ${lista.length ? lista.map(c => `<button class="fila" type="button" data-abrir="${esc(c.canal)}|${esc(c.chat)}" aria-current="${E.abierta === c.canal + '|' + c.chat}">
          ${avatar(c)}
          <span style="min-width:0"><span class="quien" style="display:block">${esc(c.nombre || c.chat)}</span>
          <span class="ultimo" style="display:block">${esc(c.ultimo_texto || '')}</span>
          ${c.duenoHasta > Date.now() ? marcaVia('dueno') : marcaVia(c.ultima_via)}</span>
          <span class="hora">${hace(c.ultimo)}</span></button>`).join('')
        : `<div class="vacio-grande">${icono('inbox')}<b>${f ? 'Nada con esa búsqueda' : 'Todavía no hay chats'}</b><p>${f ? 'Prueba con otro nombre o palabra.' : 'Cuando un cliente escriba por WhatsApp, Instagram o Facebook, aparece aquí.'}</p></div>`}`;
    const b = $('#buscar'); b.oninput = () => { E.filtro = b.value; const pos = b.selectionStart; pintarLista(); const n = $('#buscar'); n.focus(); n.setSelectionRange(pos, pos); };
  }
  if(E.pestana === 'avisos'){
    v.innerHTML = `<h1 class="titulo-vista">Avisos</h1><p class="explica">Lo que el bot no debe resolver solo. Te llegan también por WhatsApp.</p>
      ${E.avisos.length ? E.avisos.map(a => `<article class="tarjeta ${a.estado === 'visto' ? 'visto' : ''}">
        <div class="arriba"><span>${esc(a.nombre || a.chat)} · ${CANAL[a.canal]?.[1] || ''}</span><span>${hace(a.cuando)}</span></div>
        <h3>${esc(a.motivo)}</h3>
        <div class="acciones"><button class="btn" type="button" data-abrir="${esc(a.canal)}|${esc(a.chat)}">${icono('message-circle')}Abrir chat</button>
        ${a.estado !== 'visto' ? `<button class="btn suave" type="button" data-visto="${esc(a.id)}">${icono('check')}Ya lo vi</button>` : ''}</div></article>`).join('')
        : `<div class="vacio-grande">${icono('bell')}<b>Sin avisos</b><p>Todo lo está resolviendo el bot.</p></div>`}`;
  }
  if(E.pestana === 'aprender'){
    const por = E.manual.filter(e => e.estado === 'por revisar');
    v.innerHTML = `<h1 class="titulo-vista">Aprender</h1><p class="explica">Preguntas que el bot no conocía y que contestó la IA. Si la respuesta está bien, apruébala: la próxima vez sale sola, al instante y sin gastar IA.</p>
      ${por.length ? por.map(e => `<article class="tarjeta">
        <div class="arriba"><span>${CANAL[e.canal]?.[1] || ''}</span><span>${hace(e.cuando)}</span></div>
        <p class="preg">«${esc(e.pregunta)}»</p>
        <div class="resp">${esc(e.respuesta)}</div>
        ${E.pensar && e.razon ? `<p class="razon" style="align-self:auto;max-width:none">${icono('brain')}${esc(e.razon)}</p>` : ''}
        <div class="acciones"><button class="btn" type="button" data-aprobar="${esc(e.id)}">${icono('check')}Así se contesta</button>
        <button class="btn suave" type="button" data-descartar="${esc(e.id)}">${icono('x')}No</button></div></article>`).join('')
        : `<div class="vacio-grande">${icono('book-open')}<b>Nada por revisar</b><p>Cuando la IA conteste algo nuevo, aquí lo apruebas.</p></div>`}`;
  }
  if(E.pestana === 'ia') pintarIA(v);
  const nA = E.avisos.filter(a => a.estado === 'nuevo').length, nM = E.manual.filter(e => e.estado === 'por revisar').length;
  $('#nAvisos').hidden = !nA; $('#nAvisos').textContent = nA;
  $('#nManual').hidden = !nM; $('#nManual').textContent = nM;
}

function pintarIA(v){
  v.innerHTML = `<h1 class="titulo-vista">Mi IA</h1><p class="explica">Pregúntale lo que quieras de tu negocio: cuántas cotizaciones salieron, qué te piden más, cómo contestarle a un cliente difícil.</p>
    <div class="ia-chat" id="iaChat">${M.ia.map(m => `<div class="b ${m.de === 'yo' ? 'yo' : 'ia'}">${esc(m.texto)}</div>`).join('')}</div>
    <div class="sugerencias">${['¿Qué plaga me piden más?', '¿Quién no ha contestado?', 'Redáctame una promo para casas'].map(s => `<button type="button" data-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <form class="escribir ia-forma" id="iaForm" style="border-radius:22px;border:1px solid var(--linea);padding:6px"><textarea id="iaTexto" rows="1" placeholder="Escríbele a tu IA" aria-label="Mensaje para tu IA"></textarea>
    <button class="mandar" type="submit" aria-label="Mandar">${icono('send')}</button></form>`;
  const f = $('#iaForm'), t = $('#iaTexto');
  f.onsubmit = async (e) => { e.preventDefault(); const texto = t.value.trim(); if(!texto) return; t.value = ''; await api.pedir('POST', '/api/ia', { texto }); pintarIA(v); };
  v.querySelectorAll('[data-sug]').forEach(b => b.onclick = () => { t.value = b.dataset.sug; t.focus(); });
}

async function abrir(clave){
  E.abierta = clave; const [canal, chat] = clave.split('|');
  const r = await api.pedir('GET', `/api/conversacion?canal=${encodeURIComponent(canal)}&chat=${encodeURIComponent(chat)}`);
  const c = r.conversacion; if(!c) return;
  $('#app').classList.add('en-chat');
  const d = c.datos || {}, cot = c.cotizacion;
  const dato = (ic, v, falta) => `<span class="dato ${v == null ? 'falta' : ''}">${icono(ic)}${v == null ? falta : esc(v)}</span>`;
  const callado = c.duenoHasta > Date.now();
  const tarjetaCot = cot ? `<div class="cotiza"><div class="tit">${icono('calculator')}Cotización del sistema</div>
        <div class="monto"><small>aprox.</small>${pesos(cot.desde)}</div>
        <dl><dt>Producto</dt><dd>${pesos(cot.desglose?.producto || 0)}</dd><dt>Mano de obra</dt><dd>${pesos(cot.desglose?.mano_de_obra || 0)}</dd><dt>Traslado</dt><dd>${pesos(cot.desglose?.traslado || 0)}</dd></dl>
        ${cot.visita ? `<span class="marca-chica m-aviso etq">${icono('truck')}Pide visita antes del precio final</span>` : ''}
        ${cot.fueraDeRadio ? `<span class="marca-chica m-aviso etq">${icono('map-pin')}${cot.atiende === 'no' ? 'Fuera de zona: casa, no se cubre' : cot.atiende === 'caso-por-caso' ? 'Fuera de zona: tú decides' : 'Fuera de zona: con visita'}</span>` : ''}</div>` : '';
  $('#conv').innerHTML = `
    <header class="cab">
      <button class="redondo volver" type="button" id="bVolver" aria-label="Volver a los chats">${icono('chevron-left')}</button>
      ${avatar(c)}
      <div class="info"><b>${esc(c.nombre || c.chat)}</b><small>${CANAL[c.canal]?.[1] || ''}</small></div>
      <button class="pensar" type="button" id="bPensar" aria-pressed="${E.pensar}">${icono(E.pensar ? 'eye' : 'eye-off')}Cómo pensó</button>
    </header>
    <div class="ficha" aria-label="Lo que se sabe del cliente">
      ${dato('spray-can', d.plaga, 'Plaga')}${dato('ruler', d.m2 != null ? d.m2 + ' m²' : null, 'Metros')}${dato('map-pin', d.zona, 'Zona')}
      ${dato(d.tipo === 'industria' ? 'factory' : d.tipo === 'negocio' ? 'store' : 'house', d.tipo, 'Tipo')}
    </div>
    <div class="burbujas" id="burbujas">
      ${(() => { const ms = c.mensajes || [], i = ms.map(m => m.via).lastIndexOf('cerebro');
        return ms.map((m, k) => burbuja(m) + (k === (i < 0 ? ms.length - 1 : i) ? tarjetaCot : '')).join(''); })()}
    </div>
    ${callado ? `<div class="callado">${icono('clock')}Estás contestando tú: el bot se queda callado en este chat hasta las ${new Date(c.duenoHasta).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })}</div>` : ''}
    <form class="escribir" id="forma"><textarea id="texto" rows="1" placeholder="Contesta tú" aria-label="Tu respuesta"></textarea>
      <button class="mandar" type="submit" id="bMandar" aria-label="Mandar" disabled>${icono('send')}</button></form>`;
  const bb = $('#burbujas'); bb.scrollTop = bb.scrollHeight;
  $('#bVolver').onclick = () => { $('#app').classList.remove('en-chat'); E.abierta = null; pintarLista(); };
  $('#bPensar').onclick = () => { E.pensar = !E.pensar; guarda.poner('up_pensar', E.pensar ? '1' : '0'); abrir(clave); };
  const t = $('#texto'), bm = $('#bMandar');
  t.oninput = () => { bm.disabled = !t.value.trim(); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; };
  $('#forma').onsubmit = async (e) => {
    e.preventDefault(); const texto = t.value.trim(); if(!texto) return; bm.disabled = true;
    const r = await api.pedir('POST', '/api/responder', { canal, chat, texto });
    if(!r.bien){ alert(r.error || 'No se pudo mandar.'); bm.disabled = false; return; }
    await cargar(); abrir(clave);
  };
  pintarLista();
}

function burbuja(m){
  const tipo = m.de === 'cliente' ? 'cliente' : 'negocio ' + (m.via === 'cerebro' ? 'ia' : m.via === 'dueno' ? 'dueno' : '');
  const pie = m.de === 'cliente' ? hace(m.cuando) : `${VIA[m.via] ? VIA[m.via][2] + ' · ' : ''}${hace(m.cuando)}`;
  let extra = '';
  if(E.pensar && m.via === 'cerebro' && m.razon) extra = `<p class="razon">${icono('brain')}<span>${esc(m.razon)}${m.modelo ? ` <small>· ${esc(m.modelo)}</small>` : ''}</span></p>`;
  if(E.pensar && m.via === 'reflejo') extra = `<p class="razon" style="color:var(--acento-texto);border-color:color-mix(in srgb,var(--acento) 45%,transparent)">${icono('zap')}<span>Respuesta hecha «${esc(m.caso)}» · seguridad ${Math.round((m.confianza || 0) * 100)} %</span></p>`;
  return `<div class="b ${tipo}">${esc(m.texto)}<div class="pie">${m.noSalio ? `<span class="no-salio">No se entregó · </span>` : ''}${pie}</div></div>${extra}`;
}

/* ── tema ───────────────────────────────────────────────────────────────── */
function tema(cambiar){
  let t = guarda.leer('up_tema');
  if(cambiar){ const oscuro = t ? t === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches; t = oscuro ? 'claro' : 'oscuro'; guarda.poner('up_tema', t); }
  if(t) document.documentElement.dataset.tema = t;
  const oscuro = t ? t === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('#bTema').innerHTML = icono(oscuro ? 'sun' : 'moon');
}

/* ── arranque ───────────────────────────────────────────────────────────── */
async function cargar(){
  const [c, a, m] = await Promise.all([api.pedir('GET', '/api/conversaciones'), api.pedir('GET', '/api/avisos'), api.pedir('GET', '/api/manual')]);
  E.conv = (c.conversaciones || []).sort((x, y) => y.ultimo - x.ultimo); E.avisos = a.avisos || []; E.manual = m.manual || [];
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest('.pestanas button, .fila[data-abrir], .btn[data-abrir], .btn[data-visto], .btn[data-aprobar], .btn[data-descartar]');
  if(!t) return;
  if(t.dataset.p){ E.pestana = t.dataset.p; document.querySelectorAll('.pestanas button').forEach(b => b.setAttribute('aria-current', b === t ? 'page' : 'false')); $('#app').classList.remove('en-chat'); pintarLista(); return; }
  if(t.dataset.abrir){ return abrir(t.dataset.abrir); }
  if(t.dataset.visto){ await api.pedir('POST', '/api/aviso/visto', { id: t.dataset.visto }); }
  if(t.dataset.aprobar){ await api.pedir('POST', '/api/manual/aprobar', { id: t.dataset.aprobar }); }
  if(t.dataset.descartar){ await api.pedir('POST', '/api/manual/descartar', { id: t.dataset.descartar }); }
  await cargar(); pintarLista();
});
$('#bTema').onclick = () => tema(true);
tema(false); pintarIconos();
$('#estadoBot').textContent = DE_MUESTRA ? 'Datos de muestra · sin conectar' : 'Bot atendiendo';
$('#estadoBot').classList.toggle('es-muestra', DE_MUESTRA);
await cargar(); pintarLista();
if(q.get('abrir')) abrir(q.get('abrir'));
globalThis.__chat = { E, abrir };
