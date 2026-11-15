/* vestidor.js — TU PERSONAJE DE PERFIL (Carlos, 13 nov, bloque 6)
 * ===========================================================================
 * «Un personaje propio (aparte de la mascota) como foto de perfil», con «ropa y accesorios que
 * se compran». El catálogo y los precios están en ropa.js (los lee también el servidor); el dibujo
 * es Avataaars (vendor/avatar.js, se carga sólo cuando hace falta: 47 KB).
 *
 * Qué hace:
 *   abrir()     el vestidor: tu personaje en grande y, abajo, cara, pelo, ropa, gorros, lentes y fondo.
 *               Lo de paga sale con su precio; al tocarlo pregunta si lo compras.
 *   decorar     pone el personaje de cada quien en el ranking, en amigos y en tu perfil. NO toca el
 *               código del ranking: lo VIGILA (MutationObserver) y cambia la letra por el dibujo.
 * ===========================================================================*/
import { OPCIONES, TIENDA_ROPA, articuloDe, personajeDeArranque, normalizarPersonaje, opcionesAvataaars, extrasMazi } from './ropa.js';
import { CUBO } from './cosas.js';

let lib = null;
const libreria = () => (lib ||= import('./vendor/avatar.js'));
export async function svgPersonaje(p){
  const m = await libreria(), svg = m.svgPersonaje(opcionesAvataaars(p)), extra = extrasMazi(p);
  /* lo nuestro va dentro del círculo (la máscara), justo antes de que se cierre */
  if(!extra) return svg;
  const i = svg.lastIndexOf('</g></svg>');
  return i < 0 ? svg.replace('</svg>', extra + '</svg>') : svg.slice(0, i) + extra + svg.slice(i);
}

const NOMBRES = {
  ojos: { default: 'Normales', happy: 'Felices', wink: 'Guiño', side: 'De lado', squint: 'Entrecerrados', surprised: 'Sorpresa', hearts: 'Enamorados', closed: 'Cerrados' },
  boca: { smile: 'Sonrisa', default: 'Normal', twinkle: 'Coqueta', serious: 'Seria', tongue: 'Lengua', eating: 'Comiendo', concerned: 'Preocupada', disbelief: '¿En serio?' },
};
/* las pestañas del vestidor: qué partes trae cada una */
const PESTANAS = [
  { id: 'cara', t: 'Cara', icono: 'smile', partes: [['piel', 'Piel'], ['ojos', 'Ojos'], ['cejas', 'Cejas'], ['boca', 'Boca'], ['barba', 'Barba y bigote']] },
  { id: 'pelo', t: 'Pelo', icono: 'user-round', partes: [['pelo', 'Peinado'], ['colorPelo', 'Color']] },
  { id: 'ropa', t: 'Ropa', icono: 'shirt', partes: [['ropa', 'Prenda'], ['colorRopa', 'Color'], ['estampa', 'Estampado']] },
  { id: 'gorros', t: 'Gorros', icono: 'crown', partes: [['gorro', 'Gorro'], ['colorGorro', 'Color del gorro']] },
  { id: 'lentes', t: 'Lentes', icono: 'glasses', partes: [['lentes', 'Lentes']] },
  { id: 'fondo', t: 'Fondo', icono: 'palette', partes: [['fondo', 'Fondo']] },
];
const DE_COLOR = new Set(['piel', 'colorPelo', 'colorRopa', 'colorGorro', 'fondo']);

export function iniciarVestidor(h){
  const { esc, ico, $ } = h;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const cache = new Map();           /* cuenta → personaje (o null si no tiene) */
  const pidiendo = new Set();
  let borrador = null, pestana = 'cara', guardado = '';

  const mio = () => { const p = h.perfil(); return normalizarPersonaje(p.personaje || personajeDeArranque(p.cuenta || p.nombre || ''), p.ropa || [], p.cuenta || ''); };
  const tengo = (art) => !art || (h.perfil().ropa || []).includes(art);

  /* ── el vestidor ── */
  function abrir(){
    borrador = mio(); guardado = JSON.stringify(borrador); pestana = 'cara';
    const c = h.capa('vestidor');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-v="cerrar" aria-label="Volver">${ico('arrow-left')}</button><h2 style="flex:1;margin:0;font:800 20px/1.2 Titulo">Tu personaje</h2><span class="pastilla cubos" id="cubosVest"></span></div>
      <div class="cuerpo">
        <div class="pj-grande" id="pjGrande" aria-label="Tu personaje"></div>
        <div class="pj-tabs" role="tablist">${PESTANAS.map((p) => `<button role="tab" data-tab="${p.id}" aria-selected="${p.id === pestana}">${ico(p.icono)}<span>${p.t}</span></button>`).join('')}</div>
        <div id="pjOpciones"></div>
      </div>
      <div class="abajo"><button class="bt fuerte ancho" data-v="guardar">${ico('check')}Guardar mi personaje</button></div>`;
    c.addEventListener('click', alTocar);
    pintarSaldo(); pintarGrande(); pintarOpciones();
  }
  function pintarSaldo(){ const e = $('#cubosVest'); if(e) e.innerHTML = `<span class="cubo-ico">${CUBO}</span>${h.perfil().infinito ? '∞' : (h.perfil().cubos || 0)}`; }
  async function pintarGrande(){
    const e = $('#pjGrande'); if(!e) return;
    const svg = await svgPersonaje(borrador); e.innerHTML = svg;
    e.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1.03)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  }
  async function pintarOpciones(){
    const caja = $('#pjOpciones'); if(!caja) return;
    $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === pestana)));
    const pt = PESTANAS.find((p) => p.id === pestana);
    /* lo de regalo sólo le sale a quien lo tiene */
    const visible = (k, v) => { const a = articuloDe(k, v); return !a || !TIENDA_ROPA[a].regalo || tengo(a); };
    caja.innerHTML = pt.partes.map(([k, t]) => `<div class="seccion-t">${t}</div><div class="${DE_COLOR.has(k) ? 'pj-colores' : 'pj-rejilla'}" data-parte="${k}">${OPCIONES[k].filter((v) => visible(k, v)).map((v) => boton(k, v)).join('')}</div>`).join('');
    /* las miniaturas: tu personaje con esa pieza puesta */
    for(const b of caja.querySelectorAll('.pj-op[data-valor]')){
      const prueba = { ...borrador, [b.dataset.parte]: b.dataset.valor };
      if(b.dataset.parte === 'pelo') prueba.gorro = '';
      if(b.dataset.parte === 'estampa' && b.dataset.valor && b.dataset.valor !== 'mazi') prueba.ropa = 'graphicShirt';
      const mini = b.querySelector('.pj-mini'); if(mini) mini.innerHTML = await svgPersonaje(prueba);
      if(!$('#pjOpciones')) return;      /* cerraron mientras se pintaba */
    }
  }
  function boton(k, v){
    const sel = borrador[k] === v, art = articuloDe(k, v), precio = art && !tengo(art) ? TIENDA_ROPA[art].precio : 0;
    const nombre = art ? TIENDA_ROPA[art].nombre : (NOMBRES[k] && NOMBRES[k][v]) || (v ? '' : 'Ninguno');
    if(DE_COLOR.has(k)) return `<button class="pj-color" data-parte="${k}" data-valor="${v}" aria-pressed="${sel}" aria-label="Color ${v}" style="--c:#${v}"></button>`;
    return `<button class="pj-op ${precio ? 'de-paga' : ''}" data-parte="${k}" data-valor="${esc(v)}" aria-pressed="${sel}" aria-label="${esc(nombre || v || 'Ninguno')}${precio ? `, ${precio} cubitos` : ''}">
      <span class="pj-mini">${!v && ['barba', 'estampa', 'gorro', 'lentes', 'pelo'].includes(k) ? ico('x') : ''}</span>${nombre ? `<small>${esc(nombre)}</small>` : ''}${precio ? `<span class="pj-precio"><span class="cubo-ico">${CUBO}</span>${precio}</span>` : ''}</button>`;
  }
  async function alTocar(e){
    const v = e.target.closest('[data-v]');
    if(v && v.dataset.v === 'cerrar'){ cerrar(); return; }
    if(v && v.dataset.v === 'guardar'){ await guardar(); return; }
    const t = e.target.closest('[data-tab]'); if(t){ pestana = t.dataset.tab; h.tono(h.SON.toque); pintarOpciones(); return; }
    const o = e.target.closest('[data-parte][data-valor]'); if(!o) return;
    const k = o.dataset.parte, val = o.dataset.valor, art = articuloDe(k, val);
    if(art && !tengo(art)){ comprar(art); return; }
    poner(k, val);
  }
  function poner(k, val){
    borrador[k] = val;
    if(k === 'pelo') borrador.gorro = '';                          /* elegir peinado quita el gorro: si no, no se ve */
    if(k === 'estampa' && val && val !== 'mazi' && borrador.ropa !== 'graphicShirt' && tengo('ropa:graphicShirt')) borrador.ropa = 'graphicShirt';
    h.tono(h.SON.pop); h.vibrar(8);
    pintarGrande();
    $$(`[data-parte="${k}"][data-valor]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.valor === val)));
    if(k === 'pelo' || k === 'estampa') pintarOpciones();
  }
  function comprar(art){
    const a = TIENDA_ROPA[art], saldo = h.perfil().cubos || 0;
    const hh = h.hoja('', `<div style="display:grid;justify-items:center;gap:10px;text-align:center"><div class="pj-compra" id="pjCompra"></div>
      <h3 style="margin:0">${esc(a.nombre)}</h3><p style="color:var(--suave);margin:0">${saldo >= a.precio ? `Cuesta <b>${a.precio} cubitos</b>. Tienes ${saldo}.` : `Cuesta ${a.precio} cubitos y tienes ${saldo}. Te faltan ${a.precio - saldo}: estudia un poco más.`}</p>
      <div class="fila-bt" style="width:100%"><button class="bt" id="pjNo">Ahorita no</button>${saldo >= a.precio ? `<button class="bt fuerte" id="pjSi"><span class="cubo-ico">${CUBO}</span>Comprar por ${a.precio}</button>` : ''}</div></div>`);
    const prueba = { ...borrador, [a.parte]: a.valor }; if(a.parte === 'estampa') prueba.ropa = 'graphicShirt';
    svgPersonaje(prueba).then((s) => { const e = hh.querySelector('#pjCompra'); if(e) e.innerHTML = s; });
    hh.querySelector('#pjNo').addEventListener('click', h.cerrarHoja);
    hh.querySelector('#pjSi')?.addEventListener('click', async () => {
      try{
        const r = await h.sala({ accion: 'comprarRopa', item: art });
        h.ponerPerfil(r.perfil); h.cerrarHoja(); h.tono(h.SON.compra || h.SON.moneda); h.brindis(`${a.nombre}: ya es tuyo`, 'oro', 'shirt');
        pintarSaldo(); poner(a.parte, a.valor); pintarOpciones();
      }catch(err){ h.cerrarHoja(); h.tono(h.SON.mal); h.brindis(err.message || 'No se pudo comprar', 'vino', 'circle-x'); }
    });
  }
  async function guardar(){
    try{
      const r = await h.sala({ accion: 'vestir', personaje: borrador });
      h.ponerPerfil(r.perfil); guardado = JSON.stringify(borrador);
      const p = h.perfil(); if(p.cuenta) cache.set(p.cuenta, p.personaje);
      h.tono(h.SON.fin); h.brindis('Tu personaje quedó guardado', '', 'check');
      h.cerrarCapa(); decorar(document);
    }catch(err){ h.brindis(err.message || 'No se pudo guardar', 'vino', 'circle-x'); }
  }
  function cerrar(){
    if(JSON.stringify(borrador) !== guardado){
      const hh = h.hoja('¿Te vas sin guardar?', `<p style="color:var(--suave)">Lo que cambiaste no se guarda.</p><div class="fila-bt"><button class="bt" id="pjSeguir">Seguir aquí</button><button class="bt fuerte" id="pjSalir">Salir sin guardar</button></div>`);
      hh.querySelector('#pjSeguir').addEventListener('click', h.cerrarHoja);
      hh.querySelector('#pjSalir').addEventListener('click', () => { h.cerrarHoja(); h.cerrarCapa(); });
      return;
    }
    h.cerrarCapa();
  }

  /* ── el personaje en el ranking, en amigos y en tu perfil ──
     La letra de color se queda si alguien no ha hecho su personaje: así se ve hoy. */
  function lugares(raiz){
    const r = [];
    raiz.querySelectorAll('.fila-rank[data-cuenta] .av, .amigo[data-cuenta] .av').forEach((el) => r.push([el, el.closest('[data-cuenta]').dataset.cuenta]));
    raiz.querySelectorAll('.perfil-cab .av').forEach((el) => r.push([el, h.perfil().cuenta || '', true]));
    return r;
  }
  async function decorar(raiz = document){
    const yo = h.perfil();
    if(yo.cuenta && yo.personaje) cache.set(yo.cuenta, yo.personaje);
    const sitios = lugares(raiz), faltan = [];
    for(const [el, cuenta, propio] of sitios){
      const p = propio ? (yo.personaje || null) : cache.get(cuenta);
      if(p === undefined){ if(cuenta && !pidiendo.has(cuenta)) faltan.push(cuenta); continue; }
      if(!p){ if(propio) el.classList.add('pj-vacio'); continue; }
      const firma = JSON.stringify(p);
      if(el.dataset.pj === firma) continue;
      el.dataset.pj = firma; el.classList.add('con-pj'); el.classList.remove('pj-vacio');
      const svg = await svgPersonaje(p); if(el.dataset.pj === firma) el.innerHTML = svg;
    }
    if(faltan.length && h.conAcceso()){
      faltan.forEach((c) => pidiendo.add(c));
      try{ const r = await h.sala({ accion: 'personajes', cuentas: faltan }); for(const [c, p] of Object.entries(r.personajes || {})) cache.set(c, p); decorar(raiz); }
      catch{}
      finally{ faltan.forEach((c) => pidiendo.delete(c)); }
    }
  }
  /* vigila las pantallas que pintan otros (ranking, amigos, perfil) sin tocar su código */
  let pendiente = 0;
  const vigia = new MutationObserver(() => { cancelAnimationFrame(pendiente); pendiente = requestAnimationFrame(() => decorar(document)); });
  for(const id of ['#vRanking', '#vPerfil', '#vPlan']){ const e = document.querySelector(id); if(e) vigia.observe(e, { childList: true, subtree: true }); }
  document.addEventListener('click', (e) => { if(e.target.closest('[data-abrir-vestidor], .perfil-cab .av')){ abrir(); } });
  decorar(document);

  return { abrir, decorar, svgPersonaje };
}
