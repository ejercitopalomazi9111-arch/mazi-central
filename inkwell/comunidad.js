/* INKWELL · la Comunidad del lado del teléfono: la cuenta, la hoja de comentarios (por obra, por capítulo o
   por tema del foro) y el perfil de otra persona. El servidor vive en La Sala (sala/servidor/comunidad.js).
   Todo texto ajeno se pinta como TEXTO (textContent), nunca como HTML. */
import { icono } from './iconos.js';

const params = new URLSearchParams(location.search);
const DIRECTO = 'https://sala.palomazi9111.workers.dev';
const FIJO = (params.get('servidor') || '').replace(/\/+$/, '');
let bases = FIJO ? [FIJO] : [...new Set([/^https?:$/.test(location.protocol) ? location.origin : '', DIRECTO].filter(Boolean))];
let baseBuena = bases[0];

/* ── la cuenta, guardada en este teléfono ── */
const CLAVE = 'inkwell.cuenta';
export const cuenta = {
  leer(){ try{ return JSON.parse(localStorage.getItem(CLAVE)) || null; }catch{ return null; } },
  guardar(c){ try{ localStorage.setItem(CLAVE, JSON.stringify(c)); }catch{} avisarCambio(); },
  borrar(){ try{ localStorage.removeItem(CLAVE); }catch{} avisarCambio(); },
};
const oyentes = new Set();
export const alCambiarCuenta = (f) => oyentes.add(f);
function avisarCambio(){ for(const f of oyentes) try{ f(cuenta.leer()); }catch{} }

/* ── hablar con el servidor: primero por la puerta de esta misma dirección, si no directo a La Sala ── */
export async function api(accion, datos = null, { params: ps = '' } = {}){
  const c = cuenta.leer(), h = { 'content-type': 'application/json' };
  if(c && c.token) h['x-token'] = c.token;
  let ultimo;
  for(const b of bases){
    try{
      const r = await fetch(`${b}/api/sala/comunidad/${accion}${ps}`, { method: datos ? 'POST' : 'GET', headers: h, body: datos ? JSON.stringify(datos) : undefined });
      if(!FIJO && b === location.origin && b !== DIRECTO && !r.headers.get('X-Puerta')){ ultimo = new Error('sin puerta'); continue; }
      let j = {}; try{ j = await r.json(); }catch{}
      if(bases[0] !== b) bases = [b, ...bases.filter((x) => x !== b)];
      baseBuena = b;
      if(r.status === 401 && c && accion !== 'entrar' && accion !== 'recuperar' && accion !== 'registro'){ /* la sesión se venció o la cerraron */ if((await yoReal()) === null) cuenta.borrar(); }
      if(!r.ok || j.bien === false) throw Object.assign(new Error(j.error || `El servidor contestó ${r.status}`), { status: r.status, servidor: true });
      return j;
    }catch(e){ if(e.servidor) throw e; ultimo = e; }
  }
  throw new Error(ultimo && ultimo.message !== 'sin puerta' ? 'No hay conexión con la Comunidad.' : 'No hay conexión con la Comunidad.');
}
async function yoReal(){ try{ return (await api('yo')).yo; }catch{ return undefined; } }
export const fotoDe = (u) => `${baseBuena}/api/sala/comunidad/foto?u=${encodeURIComponent(u)}`;

/* ── piezas de interfaz (con DOM, sin HTML de nadie) ── */
const el = (tag, props = {}, ...hijos) => { const e = document.createElement(tag); for(const [k, v] of Object.entries(props)){ if(k === 'class') e.className = v; else if(k === 'html') e.innerHTML = v; else if(k.startsWith('on')) e.addEventListener(k.slice(2), v); else if(v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } for(const h of hijos.flat()) if(h != null && h !== false) e.append(h.nodeType ? h : document.createTextNode(String(h))); return e; };
export function avatar(usuario, nombre, conFoto, tam = 36){
  const a = el('span', { class: 'cm-av', style: `--t:${tam}px`, 'aria-hidden': 'true' }, (nombre || usuario || '?').trim().charAt(0).toUpperCase());
  if(conFoto){ const i = el('img', { alt: '', loading: 'lazy', src: fotoDe(usuario) }); i.onerror = () => i.remove(); a.append(i); }
  return a;
}
export function hace(t){
  const s = Math.max(0, (Date.now() - t) / 1000);
  if(s < 60) return 'hace un momento';
  if(s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if(s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if(s < 7 * 86400) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
/* el texto con las @menciones resaltadas, armado con nodos */
function textoCon(texto){
  const p = el('p', { class: 'cm-txt' });
  let i = 0;
  for(const m of texto.matchAll(/@([a-z0-9_]{3,20})/gi)){
    p.append(document.createTextNode(texto.slice(i, m.index)));
    p.append(el('button', { type: 'button', class: 'cm-men', 'data-perfil': m[1].toLowerCase() }, '@' + m[1]));
    i = m.index + m[0].length;
  }
  p.append(document.createTextNode(texto.slice(i)));
  return p;
}
export const REACCIONES = [['gusta', 'thumbs-up', 'Me gusta'], ['encanta', 'heart', 'Me encanta'], ['risa', 'party-popper', 'Me divierte'], ['wow', 'zap', 'Wow'], ['triste', 'face-slightly-frowning', 'Me entristece']];

/* ── estilos: una vez por página ── */
function estilos(){
  if(document.getElementById('cm-estilos')) return;
  document.head.append(el('style', { id: 'cm-estilos' }, `
.cm-dlg{border:0; padding:0; margin:auto auto 0; width:min(620px,100%); max-width:100%; height:min(88dvh,820px); max-height:88dvh; border-radius:26px 26px 0 0; background:var(--bg2); color:var(--ink); overflow:hidden}
.cm-dlg::backdrop{background:rgba(5,3,8,.62); -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px)}
@media (min-width:700px){ .cm-dlg{margin:auto; border-radius:26px} }
.cm-hoja{display:flex; flex-direction:column; height:100%}
.cm-cab{display:flex; align-items:center; gap:12px; padding:16px 16px 12px; border-bottom:1px solid var(--line)}
.cm-cab div{flex:1; min-width:0}
.cm-cab small{display:block; font:600 10.5px var(--sans); letter-spacing:.18em; text-transform:uppercase; color:var(--accent-ink)}
.cm-cab h2{margin:3px 0 0; font:400 21px/1.15 var(--display); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.cm-x{width:42px; height:42px; border-radius:50%; border:1px solid var(--line); background:var(--card); color:var(--ink); display:grid; place-items:center; flex:none; cursor:pointer}
.cm-lista{flex:1; overflow-y:auto; padding:6px 16px 20px; -webkit-overflow-scrolling:touch; overscroll-behavior:contain}
.cm-vacio{text-align:center; padding:40px 10px; color:var(--dim)}
.cm-vacio b{display:block; font:400 22px var(--display); color:var(--ink); margin-bottom:6px}
.cm-c{display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px; padding:14px 0; border-bottom:1px solid var(--line)}
.cm-c.resp{padding:10px 0 10px; border:0}
.cm-hijos{grid-column:2; border-left:2px solid var(--line); padding-left:12px; margin-top:4px}
.cm-av{position:relative; width:var(--t); height:var(--t); border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#fff; display:grid; place-items:center; font:700 calc(var(--t) * .42) var(--sans); overflow:hidden; flex:none}
.cm-av img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover}
.cm-quien{display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 8px; font-size:13px; color:var(--dim)}
.cm-quien button{all:unset; cursor:pointer; font:700 14.5px var(--sans); color:var(--ink)}
.cm-quien .adm{font:700 9.5px var(--sans); letter-spacing:.12em; text-transform:uppercase; color:var(--accent-ink)}
.cm-txt{margin:4px 0 6px; font:400 16.5px/1.5 var(--serif); white-space:pre-wrap; overflow-wrap:anywhere}
.cm-men{all:unset; cursor:pointer; color:var(--accent-ink); font-weight:600}
.cm-spoiler .cm-txt{filter:blur(7px); cursor:pointer; user-select:none}
.cm-spoiler::before{content:"Spoiler · toca para verlo"; display:block; font:700 10px var(--sans); letter-spacing:.14em; text-transform:uppercase; color:var(--accent-ink); margin-top:4px}
.cm-oculto{opacity:.45}
.cm-acc{display:flex; flex-wrap:wrap; align-items:center; gap:4px}
.cm-acc button{display:inline-flex; align-items:center; gap:4px; min-height:34px; padding:0 9px; border-radius:99px; border:1px solid transparent; background:none; color:var(--dim); font:600 12.5px var(--sans); cursor:pointer}
.cm-acc button .ico{width:16px; height:16px}
.cm-acc button.mia{color:var(--accent-ink); border-color:color-mix(in srgb,var(--accent) 40%,transparent); background:color-mix(in srgb,var(--accent) 12%,transparent)}
.cm-acc button.mia .ico{fill:color-mix(in srgb,currentColor 30%,transparent)}
.cm-acc .sep{flex:1}
.cm-redactar{border-top:1px solid var(--line); padding:10px 12px calc(10px + env(safe-area-inset-bottom)); background:var(--bg2)}
.cm-a-quien{display:flex; align-items:center; justify-content:space-between; font:600 12px var(--sans); color:var(--accent-ink); padding:0 4px 6px}
.cm-a-quien button{all:unset; cursor:pointer; color:var(--dim)}
.cm-fila{display:flex; align-items:flex-end; gap:8px}
.cm-fila textarea{flex:1; min-width:0; min-height:46px; max-height:140px; resize:none; border-radius:22px; border:1px solid var(--line); background:var(--card); color:var(--ink); font:400 16px/1.4 var(--sans); padding:12px 16px}
.cm-enviar{width:46px; height:46px; border-radius:50%; border:0; background:var(--accent); color:#fff; display:grid; place-items:center; flex:none; cursor:pointer}
.cm-enviar:disabled{opacity:.5}
.cm-op{display:flex; align-items:center; gap:8px; font:500 12.5px var(--sans); color:var(--dim); padding:6px 6px 0}
.cm-op input{accent-color:var(--accent); width:18px; height:18px}
.cm-error{color:#ff7a9a; font:600 13px var(--sans); padding:4px 6px 0}
.cm-error:empty{display:none}
/* la cuenta */
.cm-cuenta{display:flex; flex-direction:column; gap:10px; padding:4px 2px}
.cm-cuenta h3{margin:0; font:400 22px var(--display)}
.cm-cuenta p{margin:0; color:var(--dim); font-size:14px; line-height:1.45}
.cm-cuenta label{display:flex; flex-direction:column; gap:5px; font:600 12px var(--sans); color:var(--dim)}
.cm-cuenta input{min-height:48px; border-radius:14px; border:1px solid var(--line); background:var(--card); color:var(--ink); font:400 16px var(--sans); padding:0 14px}
.cm-cuenta .cm-si{min-height:50px; border-radius:99px; border:0; background:var(--ink); color:var(--bg); font:700 15px var(--sans); cursor:pointer}
.cm-pestanas{display:flex; gap:6px}
.cm-pestanas button{flex:1; min-height:40px; border-radius:99px; border:1px solid var(--line); background:none; color:var(--dim); font:600 13px var(--sans); cursor:pointer}
.cm-pestanas button[aria-pressed="true"]{background:var(--card); color:var(--ink); border-color:color-mix(in srgb,var(--ink) 25%,transparent)}
.cm-codigo{font:700 22px/1.3 ui-monospace,Menlo,monospace; letter-spacing:.12em; text-align:center; padding:14px; border-radius:16px; background:var(--card); border:1px dashed var(--accent-ink); user-select:all}
/* el perfil de otra persona */
.cm-perfil{display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:20px 4px}
.cm-perfil h3{margin:6px 0 0; font:400 26px var(--display)}
.cm-perfil .bio{font:italic 300 17px/1.45 var(--serif); color:var(--lila); max-width:34ch}
.cm-cifras{display:flex; gap:22px; margin:6px 0}
.cm-cifras b{display:block; font:400 22px var(--display)}
.cm-cifras span{font:600 10px var(--sans); letter-spacing:.14em; text-transform:uppercase; color:var(--dim)}
.cm-estante{display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:8px}
.cm-estante span{font:500 13px var(--serif); padding:6px 12px; border-radius:99px; background:var(--card); border:1px solid var(--line)}
`));
}

/* ── el formulario de la cuenta: entrar, crear o recuperar. alListo(yo) cuando ya entró ── */
export function formularioCuenta(caja, alListo){
  estilos();
  let modo = 'entrar';
  const pinta = () => {
    caja.replaceChildren();
    const f = el('form', { class: 'cm-cuenta', novalidate: true });
    const pest = el('div', { class: 'cm-pestanas', role: 'tablist' },
      ...[['entrar', 'Entrar'], ['registro', 'Crear cuenta'], ['recuperar', 'Olvidé mi contraseña']].map(([k, t]) => el('button', { type: 'button', 'aria-pressed': String(k === modo), onclick: () => { modo = k; pinta(); } }, t)));
    const campo = (nombre, texto, tipo = 'text', extra = {}) => el('label', {}, texto, el('input', { name: nombre, type: tipo, autocomplete: extra.ac || 'off', autocapitalize: 'none', spellcheck: 'false', required: true, ...extra.attrs }));
    const err = el('p', { class: 'cm-error', role: 'alert' });
    const hijos = [pest];
    if(modo === 'entrar') hijos.push(el('h3', {}, 'Entra a la Comunidad'), campo('usuario', 'Usuario', 'text', { ac: 'username' }), campo('clave', 'Contraseña', 'password', { ac: 'current-password' }));
    if(modo === 'registro') hijos.push(el('h3', {}, 'Crea tu cuenta'), el('p', {}, 'Sin correo: sólo un usuario y una contraseña. Te damos un código por si la olvidas; guárdalo.'),
      campo('nombre', 'Cómo te llamas (se ve en tus comentarios)', 'text', { ac: 'nickname', attrs: { maxlength: 40 } }),
      campo('usuario', 'Usuario (letras sin acento, números o _)', 'text', { ac: 'username', attrs: { maxlength: 20, pattern: '[a-zA-Z0-9_]{3,20}' } }),
      campo('clave', 'Contraseña (mínimo 8)', 'password', { ac: 'new-password', attrs: { minlength: 8 } }));
    if(modo === 'recuperar') hijos.push(el('h3', {}, 'Pon otra contraseña'), el('p', {}, 'Usa el código de 12 letras que te dimos al crear tu cuenta.'),
      campo('usuario', 'Usuario', 'text', { ac: 'username' }), campo('codigo', 'Código de recuperación'), campo('clave', 'Contraseña nueva (mínimo 8)', 'password', { ac: 'new-password' }));
    hijos.push(err, el('button', { class: 'cm-si', type: 'submit' }, modo === 'entrar' ? 'Entrar' : modo === 'registro' ? 'Crear mi cuenta' : 'Cambiar contraseña'));
    f.append(...hijos);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f)); const b = f.querySelector('.cm-si'); b.disabled = true; err.textContent = '';
      try{
        const r = await api(modo, d);
        cuenta.guardar({ token: r.token, usuario: r.yo.usuario, nombre: r.yo.nombre, foto: r.yo.foto, admin: r.yo.admin });
        if(r.recuperacion){
          caja.replaceChildren(el('div', { class: 'cm-cuenta' }, el('h3', {}, modo === 'registro' ? '¡Listo, ya tienes cuenta!' : 'Contraseña cambiada'),
            el('p', {}, 'Este es tu código para recuperar la cuenta si olvidas la contraseña. Sólo se enseña ahora: haz captura o anótalo.'),
            el('div', { class: 'cm-codigo' }, r.recuperacion.replace(/(.{4})(?=.)/g, '$1-')),
            el('button', { class: 'cm-si', type: 'button', onclick: () => alListo && alListo(r.yo) }, 'Ya lo guardé')));
        } else if(alListo) alListo(r.yo);
      }catch(er){ err.textContent = er.message; b.disabled = false; }
    });
    caja.append(f);
  };
  pinta();
}

/* ── la hoja de comentarios ── */
let dlg = null;
function hoja(){
  estilos();
  if(dlg) return dlg;
  dlg = el('dialog', { class: 'cm-dlg', 'aria-labelledby': 'cmTitulo' });
  dlg.innerHTML = `<div class="cm-hoja"><header class="cm-cab"><div><small id="cmSub"></small><h2 id="cmTitulo"></h2></div><button type="button" class="cm-x" aria-label="Cerrar">${icono('x')}</button></header>
    <div class="cm-lista" id="cmLista"></div><div class="cm-redactar" id="cmRedactar"></div></div>`;
  dlg.querySelector('.cm-x').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if(e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  return dlg;
}
export async function abrirComentarios({ obra, cap = '', titulo = '', sub = '' }){
  const d = hoja(), lista = d.querySelector('#cmLista'), red = d.querySelector('#cmRedactar');
  d.querySelector('#cmTitulo').textContent = titulo || 'Comentarios';
  d.querySelector('#cmSub').textContent = sub || (cap ? `Capítulo ${cap}` : obra.startsWith('tema:') ? 'Foro' : 'Comentarios de la serie');
  d.dataset.obra = obra; d.dataset.cap = cap;
  let responderA = null;
  const cargar = async () => {
    lista.replaceChildren(el('div', { class: 'esq-lista', 'aria-hidden': 'true', style: 'padding-top:14px', html: '<div class="esq renglon"></div>'.repeat(4) }));
    let r; try{ r = await api('hilo', null, { params: `?obra=${encodeURIComponent(obra)}&cap=${encodeURIComponent(cap)}` }); }
    catch(e){ lista.replaceChildren(el('div', { class: 'cm-vacio' }, el('b', {}, 'No se pudo cargar'), e.message)); return; }
    const raiz = r.comentarios.filter((c) => !c.padre), hijos = (id) => r.comentarios.filter((c) => c.padre === id);
    if(!raiz.length){ lista.replaceChildren(el('div', { class: 'cm-vacio' }, el('b', {}, 'Nadie ha comentado todavía'), 'Sé la primera persona en decir algo.')); return; }
    const pinta = (c, resp = false) => {
      const nodo = el('article', { class: `cm-c${resp ? ' resp' : ''}${c.oculto ? ' cm-oculto' : ''}`, 'data-id': c.id }, avatar(c.usuario, c.nombre, c.foto, resp ? 28 : 36));
      const cuerpo = el('div', { class: c.spoiler ? 'cm-spoiler' : '' },
        el('div', { class: 'cm-quien' }, el('button', { type: 'button', 'data-perfil': c.usuario }, c.nombre), c.admin ? el('span', { class: 'adm' }, 'Admin') : null, el('span', {}, '@' + c.usuario + ' · ' + hace(c.creado) + (c.editado ? ' · editado' : ''))),
        textoCon(c.texto));
      const acc = el('div', { class: 'cm-acc' });
      for(const [k, ic, t] of REACCIONES){
        const n = c.reacciones[k] || 0;
        if(!n && c.mia !== k && k !== 'gusta' && k !== 'encanta') continue;
        acc.append(el('button', { type: 'button', class: c.mia === k ? 'mia' : '', 'data-reac': k, 'aria-label': t, 'aria-pressed': String(c.mia === k), html: icono(ic) + (n ? `<span>${n}</span>` : '') }));
      }
      acc.append(el('button', { type: 'button', 'data-mas-reac': c.id, 'aria-label': 'Más reacciones', html: icono('zap') }));
      acc.append(el('button', { type: 'button', 'data-responder': c.padre || c.id, 'data-a': c.usuario, html: icono('reply') + 'Responder' }), el('span', { class: 'sep' }));
      if(c.puedoBorrar) acc.append(el('button', { type: 'button', 'data-borrar': c.id, 'aria-label': 'Borrar', html: icono('trash') }));
      else acc.append(el('button', { type: 'button', 'data-reportar': c.id, 'aria-label': 'Reportar', html: icono('flag') }));
      cuerpo.append(acc);
      nodo.append(cuerpo);
      if(!resp){ const hs = hijos(c.id); if(hs.length) nodo.append(el('div', { class: 'cm-hijos' }, hs.map((h) => pinta(h, true)))); }
      return nodo;
    };
    lista.replaceChildren(...raiz.map((c) => pinta(c)));
  };
  const redactar = () => {
    red.replaceChildren();
    if(!cuenta.leer()){
      const caja = el('div');
      red.append(el('div', { class: 'cm-op' }, 'Para comentar, entra o crea tu cuenta.'), caja);
      formularioCuenta(caja, () => { redactar(); cargar(); });
      return;
    }
    const ta = el('textarea', { rows: '1', placeholder: obra.startsWith('tema:') ? 'Responde en el tema…' : 'Escribe un comentario…', 'aria-label': 'Tu comentario', maxlength: '2000' });
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; env.disabled = !ta.value.trim(); });
    const env = el('button', { type: 'submit', class: 'cm-enviar', 'aria-label': 'Publicar', disabled: true, html: icono('send') });
    const spo = el('input', { type: 'checkbox' }), err = el('p', { class: 'cm-error', role: 'alert' });
    const aQuien = el('div', { class: 'cm-a-quien', hidden: true });
    const f = el('form', {}, aQuien, el('div', { class: 'cm-fila' }, ta, env), el('label', { class: 'cm-op' }, spo, 'Tiene spoilers (se ve borroso hasta que lo toquen)'), err);
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); if(!ta.value.trim()) return; env.disabled = true; err.textContent = '';
      try{ await api('comentar', { obra, cap, texto: ta.value, spoiler: spo.checked, padre: responderA || undefined }); ta.value = ''; ta.style.height = ''; spo.checked = false; responderA = null; aQuien.hidden = true; await cargar(); lista.scrollTop = lista.scrollHeight; }
      catch(er){ err.textContent = er.message; env.disabled = false; }
    });
    red.append(f);
    red._responder = (id, a) => { responderA = id; aQuien.hidden = false; aQuien.replaceChildren(el('span', {}, 'Respondiendo a @' + a), el('button', { type: 'button', onclick: () => { responderA = null; aQuien.hidden = true; } }, 'Cancelar')); ta.value = ta.value || '@' + a + ' '; ta.focus(); env.disabled = false; };
  };
  lista.onclick = async (e) => {
    const t = e.target.closest('button,.cm-spoiler .cm-txt');
    if(!t) return;
    if(t.classList.contains('cm-txt')){ t.parentElement.classList.remove('cm-spoiler'); return; }
    if(t.dataset.perfil) return abrirPerfil(t.dataset.perfil);
    if(t.dataset.masReac){
      const acc = t.parentElement; t.remove();
      for(const [k, ic, tt] of REACCIONES) if(!acc.querySelector(`[data-reac="${k}"]`)) acc.prepend(el('button', { type: 'button', 'data-reac': k, 'aria-label': tt, html: icono(ic) }));
      return;
    }
    if(!cuenta.leer() && (t.dataset.reac || t.dataset.responder || t.dataset.reportar)){ red.querySelector('input')?.focus(); return; }
    try{
      if(t.dataset.reac){ await api('reaccionar', { id: +t.closest('[data-id]').dataset.id, tipo: t.dataset.reac }); return cargar(); }
      if(t.dataset.responder){ red._responder && red._responder(+t.dataset.responder, t.dataset.a); return; }
      if(t.dataset.borrar){ if(t.dataset.seguro !== '1'){ t.dataset.seguro = '1'; t.innerHTML = icono('trash') + '¿Borrar?'; return; } await api('borrar', { id: +t.dataset.borrar }); return cargar(); }
      if(t.dataset.reportar){ if(t.dataset.seguro !== '1'){ t.dataset.seguro = '1'; t.innerHTML = icono('flag') + '¿Reportar?'; return; } await api('reportar', { id: +t.dataset.reportar, motivo: 'reportado desde la app' }); t.innerHTML = icono('flag') + 'Reportado'; t.disabled = true; }
    }catch(er){ alert(er.message); }
  };
  redactar();
  if(!d.open) d.showModal();
  await cargar();
}

/* ── el perfil de otra persona ── */
export async function abrirPerfil(u){
  const d = hoja(), lista = d.querySelector('#cmLista'), red = d.querySelector('#cmRedactar');
  if(!d.open) d.showModal();
  d.querySelector('#cmSub').textContent = 'Perfil'; d.querySelector('#cmTitulo').textContent = '@' + u;
  red.replaceChildren(); lista.replaceChildren(el('div', { class: 'esq-lista', 'aria-hidden': 'true', style: 'padding-top:14px', html: '<div class="esq renglon"></div>'.repeat(4) }));
  let p; try{ p = (await api('perfil', null, { params: '?u=' + encodeURIComponent(u) })).perfil; }catch(e){ lista.replaceChildren(el('div', { class: 'cm-vacio' }, el('b', {}, 'No se pudo'), e.message)); return; }
  const yo = cuenta.leer();
  const seguir = el('button', { type: 'button', class: 'cm-si' }, p.loSigo ? 'Dejar de seguir' : 'Seguir');
  seguir.style.cssText = 'min-height:46px;padding:0 26px;border-radius:99px;border:0;background:var(--ink);color:var(--bg);font:700 15px var(--sans);cursor:pointer';
  seguir.onclick = async () => { if(!yo) return alert('Entra a tu cuenta para seguir a alguien.'); try{ await api('seguir', { usuario: p.usuario, si: !p.loSigo }); abrirPerfil(u); }catch(e){ alert(e.message); } };
  lista.replaceChildren(el('div', { class: 'cm-perfil' }, avatar(p.usuario, p.nombre, p.foto, 92), el('h3', {}, p.nombre), el('span', { class: 'cm-quien' }, '@' + p.usuario + (p.admin ? ' · Admin' : '') + ' · desde ' + new Date(p.creado).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })),
    p.bio ? el('p', { class: 'bio' }, p.bio) : null,
    el('div', { class: 'cm-cifras' }, ...[[p.seguidores, 'seguidores'], [p.siguiendo, 'sigue'], [p.comentarios, 'comentarios']].map(([n, t]) => el('div', {}, el('b', {}, n), el('span', {}, t)))),
    yo && yo.usuario !== p.usuario ? seguir : null,
    p.estante && p.estante.length ? el('div', {}, el('p', { class: 'cm-quien', style: 'justify-content:center;margin-top:10px' }, 'Su estante'), el('div', { class: 'cm-estante' }, p.estante.map((x) => el('span', {}, x.titulo + (x.nota ? ' · ' + x.nota + '/5' : ''))))) : null));
}
