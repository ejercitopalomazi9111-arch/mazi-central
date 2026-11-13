/* apuntes.js — LA PESTAÑA DE APUNTES DE CARYMO
 * ===========================================================================
 * Carlos, 13 nov: «un apartado de apuntes donde se hagan apuntes propios de lo que has visto con los puntos
 * importantes, y se guarden todas las notas importantes de cursos que has tomado en pizarrón, de cursos de tus
 * planes, y que tú puedas hacer los tuyos propios». Y del lápiz: «grosor, difuminado, transparencia, color,
 * punta que empiece delgado y termine grueso… todos los pinceles de ibisPaint, crearlos, editarlos».
 *
 *   · Automáticos: salen solos de las lecciones de tus planes (sus ideas y el dato) y de las clases del
 *     pizarrón (lo que se escribió en cada paso y el repaso). No se guardan aparte: se leen de donde ya están.
 *   · Tuyos: título, materia, texto y un dibujo. Viven en este teléfono (IndexedDB), con el dibujo por capas.
 *   · El dibujo: el motor de trazo.js (pinceles con afilado de entrada y salida, presión, difuminado,
 *     capas con modo, deshacer, cuentagotas, cubeta), con un editor de pinceles para crear los tuyos.
 * ===========================================================================*/
import { crearLienzoDibujo, PINCELES, FORMAS, MODOS, FONDOS, muestra } from './trazo.js';

/* ── la caja fuerte del teléfono (IndexedDB) ── */
let bdP = null;
function bd(){
  return bdP ||= new Promise((ok, no) => {
    const r = indexedDB.open('carymo-apuntes', 1);
    r.onupgradeneeded = () => { const d = r.result; if(!d.objectStoreNames.contains('notas')) d.createObjectStore('notas', { keyPath: 'id' }); if(!d.objectStoreNames.contains('dibujos')) d.createObjectStore('dibujos'); };
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
}
const tx = async (almacen, modo, f) => { const d = await bd(); return new Promise((ok, no) => { const t = d.transaction(almacen, modo), s = t.objectStore(almacen), r = f(s); t.oncomplete = () => ok(r && 'result' in r ? r.result : undefined); t.onerror = () => no(t.error); }); };
const todas = () => tx('notas', 'readonly', (s) => s.getAll());
const ponerNota = (n) => tx('notas', 'readwrite', (s) => s.put(n));
const quitarNota = (id) => Promise.all([tx('notas', 'readwrite', (s) => s.delete(id)), tx('dibujos', 'readwrite', (s) => s.delete(id))]);
const leerDibujo = (id) => tx('dibujos', 'readonly', (s) => s.get(id));
const ponerDibujo = (id, d) => tx('dibujos', 'readwrite', (s) => s.put(d, id));

const limpia = (t) => String(t ?? '').replace(/\*\*|__|\(\(|\)\)/g, '').replace(/\s+/g, ' ').trim();
const COLORES = ['#2A1240', '#000000', '#7E1735', '#AC27FF', '#1E5BD8', '#1F8A5B', '#F2A33A', '#F0485E', '#FFFFFF', '#8E8E9A'];

export function iniciarApuntes(h){
  const { $, esc, ico, hoja, cerrarHoja, capa, cerrarCapa, brindis, tono, SON } = h;
  let filtro = 'todos', busca = '', notas = [], miniaturas = new Map();

  /* ── los automáticos ── */
  function deLecciones(){
    const out = [];
    for(const p of Object.values(h.planes())){
      for(const u of p.unidades || []) for(const t of u.temas || []){
        const c = (p.contenido || {})[t.id] || (p.contenido || {})[t.titulo]; const l = c && c.leccion; if(!l) continue;
        const puntos = (l.ideas || []).map((i) => i.titulo ? `${limpia(i.titulo)}: ${limpia(i.texto)}` : limpia(i.texto)).filter(Boolean);
        if(l.dato) puntos.push('Dato: ' + limpia(l.dato));
        out.push({ id: `lec:${p.id}:${t.id}`, origen: 'leccion', titulo: limpia(l.titulo || t.titulo), materia: p.materia || '', t: p.cambio || p.t || 0, puntos, de: p.titulo });
      }
    }
    return out;
  }
  function delPizarron(){
    let hist = []; try{ hist = JSON.parse(localStorage.getItem('explica.historial') || '[]'); }catch{}
    return hist.map((c) => {
      const puntos = [];
      for(const paso of c.pasos || []){
        const z = paso.pizarra || {}, tit = limpia(z.titulo || ''), txt = limpia(z.texto || '');
        const items = (z.items || z.puntos || []).map((x) => limpia(typeof x === 'string' ? x : x.texto || x.titulo || '')).filter(Boolean);
        if(z.tipo === 'titulo') continue;
        if(items.length) puntos.push((tit ? tit + ': ' : '') + items.join(' · '));
        else if(tit && txt) puntos.push(`${tit}: ${txt}`);
        else if(txt || tit) puntos.push(txt || tit);
        if(puntos.length >= 16) break;
      }
      for(const q of (c.repaso || []).slice(0, 5)) puntos.push('Repaso: ' + limpia(q.pregunta || q));
      return { id: 'piz:' + c.id, origen: 'pizarron', titulo: limpia(c.titulo || c.tema || 'Clase'), materia: '', t: c.fecha || 0, puntos };
    }).filter((x) => x.puntos.length);
  }
  const ORIGEN = { propio: ['pencil', 'Tuyo'], leccion: ['notebook-pen', 'De una lección'], pizarron: ['presentation', 'Del pizarrón'] };

  async function pintar(){
    const v = $('#vApuntes'); if(!v) return;
    try{ notas = await todas(); }catch{ notas = []; }
    const autos = [...deLecciones(), ...delPizarron()];
    let lista = [...notas.map((n) => ({ ...n, origen: 'propio' })), ...autos].sort((a, b) => (b.t || 0) - (a.t || 0));
    if(filtro !== 'todos') lista = lista.filter((x) => x.origen === filtro);
    const q = busca.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if(q) lista = lista.filter((x) => [x.titulo, x.materia, x.texto, ...(x.puntos || [])].join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q));
    for(const n of notas) if(n.miniatura && !miniaturas.has(n.id)) miniaturas.set(n.id, URL.createObjectURL(n.miniatura));
    v.innerHTML = `<h1 class="titulo-vista">Apuntes</h1><p class="sub-vista">Lo importante de lo que has visto, y los tuyos, con lápiz.</p>
      <input class="campo" id="apBuscar" type="search" placeholder="Buscar en tus apuntes" value="${esc(busca)}" aria-label="Buscar en tus apuntes">
      <div class="chips ap-filtro">${[['todos', 'Todos'], ['propio', 'Míos'], ['leccion', 'Lecciones'], ['pizarron', 'Pizarrón']].map(([k, t]) => `<button class="chip" data-apf="${k}" aria-pressed="${filtro === k}">${t}</button>`).join('')}</div>
      <button class="bt fuerte ancho" id="apNuevo">${ico('plus')}Nuevo apunte</button>
      <div class="ap-lista">${lista.map((x) => `<button class="ap-card" data-ap="${esc(x.id)}">
        ${miniaturas.get(x.id) ? `<img src="${miniaturas.get(x.id)}" alt="" loading="lazy">` : `<span class="ap-ico">${ico(ORIGEN[x.origen][0])}</span>`}
        <span class="ap-txt"><b>${esc(x.titulo || 'Sin título')}</b><small>${esc([ORIGEN[x.origen][1], x.materia, x.t ? new Date(x.t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''].filter(Boolean).join(' · '))}</small>
        <span class="ap-ext">${esc((x.texto || (x.puntos || []).join(' · ')).slice(0, 140))}</span></span></button>`).join('')
        || `<p class="ap-vacio">${q ? 'Nada con eso.' : filtro === 'propio' ? 'Todavía no haces apuntes tuyos. Toca «Nuevo apunte».' : 'Aquí van a salir solos los puntos importantes de tus lecciones y de las clases del pizarrón.'}</p>`}</div>`;
    const bb = $('#apBuscar', v); bb.addEventListener('input', () => { busca = bb.value; clearTimeout(pintar.t); pintar.t = setTimeout(async () => { await pintar(); const b2 = $('#apBuscar'); b2?.focus(); b2?.setSelectionRange(b2.value.length, b2.value.length); }, 250); });
    $('#apNuevo', v).addEventListener('click', () => abrirPropio(null));
    v.onclick = (e) => {
      const f = e.target.closest('[data-apf]'); if(f){ filtro = f.dataset.apf; tono(SON.toque); pintar(); return; }
      const c = e.target.closest('[data-ap]'); if(!c) return;
      const id = c.dataset.ap, propio = notas.find((n) => n.id === id);
      if(propio) abrirPropio(propio); else { const a = [...deLecciones(), ...delPizarron()].find((x) => x.id === id); if(a) abrirAuto(a); }
    };
  }

  /* ── un apunte automático: sólo se lee; «hacerlo mío» lo copia a los tuyos ── */
  function abrirAuto(a){
    const c = capa('apunte');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Volver">${ico('arrow-left')}</button><h2 class="ap-tit">${esc(a.titulo)}</h2></div>
      <div class="cuerpo"><p class="ap-de">${ico(ORIGEN[a.origen][0])}${esc(ORIGEN[a.origen][1])}${a.de ? ' · ' + esc(a.de) : ''}</p>
      <ul class="ap-puntos">${a.puntos.map((p) => { const i = p.indexOf(': '); return `<li>${i > 0 && i < 60 ? `<b>${esc(p.slice(0, i))}</b>${esc(p.slice(i))}` : esc(p)}</li>`; }).join('')}</ul></div>
      <div class="abajo fila-bt"><button class="bt" data-mio>${ico('copy')}Hacerlo mío</button><button class="bt fuerte" data-dibujar>${ico('brush')}Dibujar encima</button></div>`;
    c.addEventListener('click', async (e) => {
      if(e.target.closest('[data-cerrar]')){ cerrarCapa(); pintar(); return; }
      const mio = e.target.closest('[data-mio]'), dib = e.target.closest('[data-dibujar]');
      if(mio || dib){
        const n = { id: 'n' + h.nuevoId(), titulo: a.titulo, materia: a.materia, texto: a.puntos.map((p) => '• ' + p).join('\n'), t: Date.now(), dibujo: false };
        await ponerNota(n); tono(SON.pop); brindis('Ya está en tus apuntes', '', 'notebook-pen');
        if(dib) abrirDibujo(n); else abrirPropio(n);
      }
    });
  }

  /* ── un apunte tuyo ── */
  function abrirPropio(n0){
    const n = n0 || { id: 'n' + h.nuevoId(), titulo: '', materia: '', texto: '', t: Date.now(), dibujo: false };
    const materias = [...new Set(Object.values(h.planes()).map((p) => p.materia).filter(Boolean))];
    const c = capa('apunte');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Guardar y volver">${ico('arrow-left')}</button><input class="ap-titulo" id="apTit" placeholder="Título" value="${esc(n.titulo)}" aria-label="Título del apunte"></div>
      <div class="cuerpo">
        <input class="campo" id="apMat" list="apMats" placeholder="Materia" value="${esc(n.materia)}" aria-label="Materia"><datalist id="apMats">${materias.map((m) => `<option value="${esc(m)}">`).join('')}</datalist>
        <textarea class="campo ap-texto" id="apTxt" placeholder="Escribe aquí lo importante…" aria-label="Texto del apunte">${esc(n.texto)}</textarea>
        <div class="ap-dibujo" id="apDib">${miniaturas.get(n.id) ? `<img src="${miniaturas.get(n.id)}" alt="Tu dibujo">` : ''}<button class="bt ${n.dibujo ? '' : 'fuerte'}" data-dibujar>${ico('brush')}${n.dibujo ? 'Editar el dibujo' : 'Dibujar con lápiz'}</button></div>
      </div>
      <div class="abajo"><button class="bt ancho peligro-suave" data-borrar>${ico('trash')}Borrar este apunte</button></div>`;
    const guardar = async () => { n.titulo = $('#apTit', c).value.trim(); n.materia = $('#apMat', c).value.trim(); n.texto = $('#apTxt', c).value; n.t = Date.now(); if(n.titulo || n.texto || n.dibujo) await ponerNota(n); };
    let t = 0; c.addEventListener('input', () => { clearTimeout(t); t = setTimeout(guardar, 500); });
    const txt = $('#apTxt', c), crecer = () => { txt.style.height = 'auto'; txt.style.height = Math.max(180, txt.scrollHeight) + 'px'; }; txt.addEventListener('input', crecer); setTimeout(crecer, 0);
    c.addEventListener('click', async (e) => {
      if(e.target.closest('[data-cerrar]')){ await guardar(); cerrarCapa(); pintar(); return; }
      if(e.target.closest('[data-dibujar]')){ await guardar(); abrirDibujo(n); return; }
      const b = e.target.closest('[data-borrar]');
      if(b){ if(!b.dataset.seguro){ b.dataset.seguro = '1'; b.innerHTML = `${ico('trash')}Toca otra vez para borrarlo`; return; } await quitarNota(n.id); miniaturas.delete(n.id); cerrarCapa(); brindis('Apunte borrado', 'vino', 'trash'); pintar(); }
    });
    if(!n0) setTimeout(() => $('#apTit', c)?.focus(), 200);
  }

  /* ── el editor de dibujo ── */
  const misPinceles = () => { try{ return JSON.parse(localStorage.getItem('carymo.pinceles') || '[]'); }catch{ return []; } };
  const guardarPinceles = (l) => { try{ localStorage.setItem('carymo.pinceles', JSON.stringify(l)); }catch{} };
  const todosPinceles = () => [...PINCELES, ...misPinceles()];

  async function abrirDibujo(n){
    const c = capa('dibujo');
    c.innerHTML = `<div class="dib-arriba"><button class="bt redondo fantasma" data-listo aria-label="Guardar y volver">${ico('check')}</button>
        <button class="bt redondo fantasma" data-deshacer aria-label="Deshacer">${ico('undo-2')}</button><button class="bt redondo fantasma" data-rehacer aria-label="Rehacer">${ico('redo-2')}</button>
        <span style="flex:1"></span><button class="bt redondo fantasma" data-ajustar aria-label="Ver la hoja entera">${ico('maximize')}</button><button class="bt redondo fantasma" data-papel aria-label="Papel">${ico('file-text')}</button><button class="bt redondo fantasma" data-capas aria-label="Capas">${ico('layers')}</button></div>
      <div class="dib-caja" id="dibCaja"></div>
      <div class="dib-abajo">
        <div class="dib-herr">${[['pincel', 'brush', 'Pincel'], ['borrador', 'eraser', 'Borrador'], ['gotero', 'pipette', 'Cuentagotas'], ['cubeta', 'paint-bucket', 'Cubeta'], ['mano', 'hand', 'Mover']].map(([k, i, t]) => `<button class="bt redondo" data-herr="${k}" aria-label="${t}" aria-pressed="${k === 'pincel'}">${ico(i)}</button>`).join('')}
          <label class="dib-color" aria-label="Color"><input type="color" id="dibColor" value="#2A1240"><span id="dibMuestra"></span></label>
          <button class="bt dib-pincel" data-pinceles>${ico('brush')}<span id="dibPincelNom"></span></button></div>
        <div class="dib-sliders"><label>Tamaño<input type="range" id="dibTam" min="1" max="150" step="1"><b id="dibTamV"></b></label><label>Opacidad<input type="range" id="dibOp" min="1" max="100" step="1"><b id="dibOpV"></b></label></div>
        <div class="dib-colores">${COLORES.map((k) => `<button style="background:${k}" data-col="${k}" aria-label="Color ${k}"></button>`).join('')}</div>
      </div>`;
    const lz = crearLienzoDibujo($('#dibCaja', c), { alCambiar: (que, x) => { if(que === 'color'){ ponerColor(x); h.brindis('Color tomado', '', 'pipette'); } if(que === 'aviso') h.brindis(x, 'vino', 'lock'); botones(); if(que === 'capas' && $('#hoja')?.dataset.capas) pintarCapas(); } });
    try{ const d = await leerDibujo(n.id); if(d) await lz.cargar(d); }catch{}
    const ultimo = (() => { try{ return JSON.parse(localStorage.getItem('carymo.pincelUlt') || 'null'); }catch{ return null; } })();
    lz.pincel = todosPinceles().find((p) => p.id === (ultimo && ultimo.id)) || PINCELES[1];
    if(ultimo && ultimo.tam) lz.pincel = { ...lz.pincel, tam: ultimo.tam, opacidad: ultimo.opacidad ?? lz.pincel.opacidad };
    function ponerColor(k){ lz.color = k; $('#dibColor', c).value = k; $('#dibMuestra', c).style.background = k; }
    function botones(){
      $('[data-deshacer]', c).disabled = !lz.puedeDeshacer; $('[data-rehacer]', c).disabled = !lz.puedeRehacer;
      $('#dibPincelNom', c).textContent = lz.pincel.nombre;
      $('#dibTam', c).value = lz.pincel.tam; $('#dibTamV', c).textContent = lz.pincel.tam; $('#dibOp', c).value = lz.pincel.opacidad; $('#dibOpV', c).textContent = lz.pincel.opacidad + '%';
    }
    const recordar = () => { try{ localStorage.setItem('carymo.pincelUlt', JSON.stringify({ id: lz.pincel.id, tam: lz.pincel.tam, opacidad: lz.pincel.opacidad })); }catch{} };
    ponerColor('#2A1240'); botones();
    $('#dibColor', c).addEventListener('input', (e) => ponerColor(e.target.value));
    $('#dibTam', c).addEventListener('input', (e) => { lz.pincel = { ...lz.pincel, tam: +e.target.value }; $('#dibTamV', c).textContent = e.target.value; recordar(); });
    $('#dibOp', c).addEventListener('input', (e) => { lz.pincel = { ...lz.pincel, opacidad: +e.target.value }; $('#dibOpV', c).textContent = e.target.value + '%'; recordar(); });
    async function guardar(){
      const d = await lz.guardar(); await ponerDibujo(n.id, d);
      n.dibujo = true; n.miniatura = d.miniatura; n.t = Date.now(); await ponerNota(n);
      if(miniaturas.has(n.id)) URL.revokeObjectURL(miniaturas.get(n.id)); miniaturas.set(n.id, URL.createObjectURL(d.miniatura));
    }
    const alEsconder = () => { if(document.hidden && c.isConnected) guardar().catch(() => {}); };
    document.addEventListener('visibilitychange', alEsconder);
    c.addEventListener('click', async (e) => {
      const b = e.target.closest('button, [data-col]'); if(!b) return;
      if(b.dataset.listo !== undefined){ b.disabled = true; try{ await guardar(); }catch(err){ brindis('No se pudo guardar: ' + err.message, 'vino', 'x'); b.disabled = false; return; } document.removeEventListener('visibilitychange', alEsconder); lz.destruir(); tono(SON.pop); abrirPropio(n); return; }
      if(b.dataset.deshacer !== undefined){ lz.deshacer(); botones(); return; }
      if(b.dataset.rehacer !== undefined){ lz.rehacer(); botones(); return; }
      if(b.dataset.ajustar !== undefined){ lz.ajustar(); return; }
      if(b.dataset.herr){ lz.herramienta = b.dataset.herr; c.querySelectorAll('[data-herr]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); tono(SON.toque); return; }
      if(b.dataset.col){ ponerColor(b.dataset.col); if(lz.herramienta !== 'pincel' && lz.herramienta !== 'cubeta'){ lz.herramienta = 'pincel'; c.querySelectorAll('[data-herr]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.herr === 'pincel'))); } return; }
      if(b.dataset.pinceles !== undefined){ abrirPinceles(); return; }
      if(b.dataset.capas !== undefined){ pintarCapas(true); return; }
      if(b.dataset.papel !== undefined){
        hoja('Papel', `<div class="chips">${FONDOS.map(([k, t]) => `<button class="chip" data-pap="${k}" aria-pressed="${lz.papel === k}">${t}</button>`).join('')}</div>`, (hj) => hj.addEventListener('click', (ev) => { const p = ev.target.closest('[data-pap]'); if(!p) return; lz.papel = p.dataset.pap; hj.querySelectorAll('[data-pap]').forEach((x) => x.setAttribute('aria-pressed', String(x === p))); }));
      }
    });

    /* los pinceles: elegir, editar y crear */
    function abrirPinceles(){
      hoja('Pinceles', `<div class="pinceles">${todosPinceles().map((p) => `<button class="pincel-t" data-pin="${esc(p.id)}" aria-pressed="${p.id === lz.pincel.id}"><canvas width="180" height="64"></canvas><span>${esc(p.nombre)}</span></button>`).join('')}</div>
        <div class="fila-bt" style="margin-top:12px"><button class="bt" data-editar-pin>${ico('settings')}Editar este</button><button class="bt fuerte" data-nuevo-pin>${ico('plus')}Crear pincel</button></div>`, (hj) => {
        hj.querySelectorAll('[data-pin]').forEach((b) => { const p = todosPinceles().find((x) => x.id === b.dataset.pin); muestra(b.querySelector('canvas'), { ...p, tam: Math.min(p.tam, 22) }, lz.color); });
        hj.addEventListener('click', (e) => {
          const b = e.target.closest('[data-pin]');
          if(b){ const p = todosPinceles().find((x) => x.id === b.dataset.pin); lz.pincel = { ...p }; if(lz.herramienta !== 'borrador') lz.herramienta = 'pincel'; hj.querySelectorAll('[data-pin]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); botones(); recordar(); tono(SON.toque); return; }
          if(e.target.closest('[data-editar-pin]')) editarPincel(lz.pincel, false);
          if(e.target.closest('[data-nuevo-pin]')) editarPincel({ ...lz.pincel, id: 'mio-' + h.nuevoId(), nombre: 'Mi pincel' }, true);
        });
      });
    }
    function editarPincel(p0, nuevo){
      const p = { ...p0 }, esMio = p.id.startsWith('mio-');
      const desliz = [['tam', 'Tamaño', 1, 150], ['opacidad', 'Opacidad', 1, 100], ['flujo', 'Flujo (se acumula)', 1, 100], ['dureza', 'Dureza (100 = nítido, 0 = difuminado)', 0, 100], ['espaciado', 'Espaciado', 2, 100],
        ['entrada', 'Afilado al empezar', 0, 100], ['salida', 'Afilado al terminar', 0, 100], ['minimo', 'Grosor mínimo con presión', 0, 100], ['estabilizador', 'Estabilizador (trazo suave)', 0, 90], ['dispersion', 'Dispersión', 0, 100], ['angulo', 'Ángulo de la punta', 0, 180]];
      hoja(nuevo ? 'Crear pincel' : 'Editar pincel', `<canvas class="pin-prev" id="pinPrev" width="600" height="140"></canvas>
        <label class="pin-l">Nombre<input class="campo" id="pinNom" value="${esc(p.nombre)}" maxlength="30"></label>
        <label class="pin-l">Punta<select class="campo" id="pinForma">${FORMAS.map(([k, t]) => `<option value="${k}"${p.forma === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="pin-l">La presión cambia<select class="campo" id="pinPres">${[['tamano', 'El grosor'], ['opacidad', 'La transparencia'], ['ambos', 'Las dos'], ['ninguna', 'Nada']].map(([k, t]) => `<option value="${k}"${p.presion === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="pin-l">Mezcla<select class="campo" id="pinMez">${[['normal', 'Normal'], ['multiplicar', 'Multiplicar (resaltador, acuarela)']].map(([k, t]) => `<option value="${k}"${p.mezcla === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        ${desliz.map(([k, t, a, b]) => `<label class="pin-s">${t}<input type="range" data-k="${k}" min="${a}" max="${b}" value="${p[k] ?? 0}"><b>${p[k] ?? 0}</b></label>`).join('')}
        <div class="fila-bt" style="margin-top:14px"><button class="bt fuerte" id="pinGuardar">${ico('check')}${esMio || nuevo ? 'Guardar' : 'Guardar como mío'}</button>${esMio && !nuevo ? `<button class="bt" id="pinBorrar">${ico('trash')}Borrar</button>` : '<button class="bt" id="pinUsar">Sólo usarlo</button>'}</div>`, (hj) => {
        const prev = () => muestra($('#pinPrev', hj), p, lz.color);
        hj.addEventListener('input', (e) => {
          const k = e.target.dataset.k; if(k){ p[k] = +e.target.value; e.target.nextElementSibling.textContent = e.target.value; }
          if(e.target.id === 'pinForma') p.forma = e.target.value; if(e.target.id === 'pinPres') p.presion = e.target.value; if(e.target.id === 'pinMez') p.mezcla = e.target.value; if(e.target.id === 'pinNom') p.nombre = e.target.value.trim() || 'Mi pincel';
          prev();
        });
        prev();
        $('#pinGuardar', hj).addEventListener('click', () => {
          const l = misPinceles(); if(!esMio && !nuevo){ p.id = 'mio-' + h.nuevoId(); if(p.nombre === p0.nombre) p.nombre = 'Mi ' + p0.nombre.toLowerCase(); }
          const i = l.findIndex((x) => x.id === p.id); if(i >= 0) l[i] = p; else l.push(p); guardarPinceles(l);
          lz.pincel = { ...p }; botones(); recordar(); cerrarHoja(); tono(SON.fin); brindis(`Pincel «${p.nombre}» guardado`, '', 'brush');
        });
        $('#pinUsar', hj)?.addEventListener('click', () => { lz.pincel = { ...p }; botones(); cerrarHoja(); });
        $('#pinBorrar', hj)?.addEventListener('click', () => { guardarPinceles(misPinceles().filter((x) => x.id !== p.id)); lz.pincel = { ...PINCELES[1] }; botones(); cerrarHoja(); brindis('Pincel borrado', 'vino', 'trash'); });
      });
    }
    /* las capas */
    function pintarCapas(abrir = false){
      const html = () => `<div class="capas-l">${lz.capas.map((k, i) => ({ k, i })).reverse().map(({ k, i }) => `<div class="capa-f${i === lz.actual ? ' sel' : ''}" data-capa="${i}">
          <button class="bt redondo" data-vis="${i}" aria-label="${k.visible ? 'Ocultar' : 'Mostrar'} ${esc(k.nombre)}">${ico(k.visible ? 'eye' : 'eye-off')}</button>
          <button class="capa-nom" data-sel="${i}">${esc(k.nombre)}${k.bloqueada ? ' ' + ico('lock') : ''}</button>
          <label class="capa-op">${Math.round(k.opacidad * 100)}%<input type="range" min="0" max="100" value="${Math.round(k.opacidad * 100)}" data-op="${i}" aria-label="Opacidad de ${esc(k.nombre)}"></label>
          <select class="campo capa-modo" data-modo="${i}" aria-label="Modo de ${esc(k.nombre)}">${MODOS.map(([m, t]) => `<option value="${m}"${k.modo === m ? ' selected' : ''}>${t}</option>`).join('')}</select>
          <span class="capa-acc"><button class="bt redondo" data-sube="${i}" aria-label="Subir">${ico('arrow-up')}</button><button class="bt redondo" data-baja="${i}" aria-label="Bajar">${ico('arrow-down')}</button><button class="bt redondo" data-dup="${i}" aria-label="Duplicar">${ico('copy')}</button><button class="bt redondo" data-bloq="${i}" aria-label="Bloquear">${ico('lock')}</button><button class="bt redondo" data-comb="${i}" aria-label="Juntar con la de abajo">${ico('arrow-down')}${ico('layers')}</button><button class="bt redondo" data-borra="${i}" aria-label="Borrar capa">${ico('trash')}</button></span></div>`).join('')}</div>
        <button class="bt fuerte ancho" data-nueva style="margin-top:10px">${ico('plus')}Nueva capa</button>`;
      if(abrir){
        const hj = hoja('Capas', html()); hj.dataset.capas = '1';
        hj.addEventListener('click', (e) => {
          const b = e.target.closest('button'); if(!b) return; const d = b.dataset;
          if(d.nueva !== undefined) lz.agregarCapa();
          else if(d.sel) lz.actual = +d.sel;
          else if(d.vis){ const k = lz.capas[+d.vis]; k.visible = !k.visible; lz.refrescar(); }
          else if(d.sube) lz.moverCapa(+d.sube, 1); else if(d.baja) lz.moverCapa(+d.baja, -1);
          else if(d.dup) lz.duplicarCapa(+d.dup);
          else if(d.bloq){ const k = lz.capas[+d.bloq]; k.bloqueada = !k.bloqueada; }
          else if(d.comb){ if(+d.comb === 0){ brindis('Es la de hasta abajo', 'vino', 'layers'); return; } lz.combinarAbajo(+d.comb); }
          else if(d.borra){ if(!b.dataset.seguro){ b.dataset.seguro = '1'; b.style.color = '#FF6B7E'; return; } if(!lz.borrarCapa(+d.borra)){ brindis('Tiene que quedar al menos una capa', 'vino', 'layers'); return; } }
          pintarCapas();
        });
        hj.addEventListener('input', (e) => { const d = e.target.dataset; if(d.op){ lz.capas[+d.op].opacidad = +e.target.value / 100; e.target.parentElement.firstChild.textContent = e.target.value + '%'; lz.refrescar(); } });
        hj.addEventListener('change', (e) => { const d = e.target.dataset; if(d.modo){ lz.capas[+d.modo].modo = e.target.value; lz.refrescar(); } });
        return;
      }
      const hj = $('#hoja'); if(hj && hj.dataset.capas){ const dentro = $('.dentro', hj); const tit = dentro.querySelector('h3'); dentro.innerHTML = ''; dentro.append(Object.assign(document.createElement('div'), { className: 'agarre' })); if(tit) dentro.append(tit); dentro.insertAdjacentHTML('beforeend', html()); }
    }
  }

  return { pintar };
}
