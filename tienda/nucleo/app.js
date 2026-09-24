/* ══════════════════════════════════════════════════════════════════════════
   EL ARMAZÓN · presentación, menú lateral, barra de arriba y enrutador
   ──────────────────────────────────────────────────────────────────────────
   Todo lo que se ve alrededor de una pantalla sale de aquí, y el menú sale de
   rutas.js. Esta es la pieza que evita el «cuatro botones que te llevan al
   mismo lado» de Ligas Mazi: aquí no hay ni un enlace escrito a mano.
   ═════════════════════════════════════════════════════════════════════════ */
import { APARTADOS, RUTAS, emparejar, enlace } from './rutas.js';
import { icono } from './iconos.js';
import { esc, pesos, plural, inicioDe, obra, noexiste, sinPermiso, fallo, cargando } from './piezas.js';
import { negocio, yo, verComo, carrito, catalogo } from './datos.js';
import { PANTALLAS as CLIENTE } from '../cliente/pantallas.js';
import { PANTALLAS as ADMIN } from '../admin/pantallas.js';
import { PANTALLAS as IMPORTAR } from '../admin/importar.js';
import { PANTALLAS as VENTA } from '../venta/pantallas.js';

const PANTALLAS = { ...CLIENTE, ...ADMIN, ...IMPORTAR, ...VENTA, obra, noexiste };

const $app = document.getElementById('app');
const $avisos = document.getElementById('avisos');
const guardado = (k, v) => { try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; } };

/* ── Avisos flotantes ─────────────────────────────────────────────────── */
export function aviso(texto, tipo = ''){
  const el = document.createElement('div');
  el.className = 'aviso-flotante ' + tipo;
  el.innerHTML = icono(tipo === 'mal' ? 'alerta' : 'listo') + `<span>${esc(texto)}</span>`;
  $avisos.append(el);
  setTimeout(() => el.remove(), tipo === 'mal' ? 6000 : 3200);
}

/* ── Presentación ─────────────────────────────────────────────────────── */
/* ~1.2 s, una vez por sesión, y se salta al toque. Más que eso, y la gente
   que abre la app diez veces al día la empieza a odiar. */
function presentacion(n){
  let vista = false;
  try{ vista = sessionStorage.getItem('tienda-presentacion') === '1'; sessionStorage.setItem('tienda-presentacion', '1'); }catch(e){}
  if(vista || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('div');
  el.className = 'presentacion';
  el.innerHTML = `<div class="marca">
      <span class="sello">${icono('tienda')}</span>
      <span class="nombre">${esc(n.marca?.nombre_corto || n.nombre)}</span>
      <span class="giro">${esc(n.giro)}</span>
    </div><span class="toca">Toca para entrar</span>`;
  document.body.append(el);
  const fuera = () => { el.classList.add('sale'); setTimeout(() => el.remove(), 450); };
  el.addEventListener('click', fuera, { once: true });
  setTimeout(fuera, 1200);
}

/* ── Menú ─────────────────────────────────────────────────────────────── */
function puedeVer(ap, persona, esDemo){
  if(!ap.roles || esDemo) return true;
  return !!persona && ap.roles.includes(persona.rol);
}

function pintarMenu(n, persona){
  const esDemo = n.ajustes?.demo === true;
  const grupos = APARTADOS.filter((ap) => puedeVer(ap, persona, esDemo)).map((ap) => {
    const suyas = RUTAS.filter((r) => r.apartado === ap.id && r.menu);
    return `<details class="grupo" data-apartado="${ap.id}">
      <summary>${icono(ap.icono)}<span>${esc(ap.nombre)}</span>${icono('abajo', 'gira')}</summary>
      <ul>${suyas.map((r) => `<li><a href="${enlace(r.ruta)}" data-ruta="${esc(r.ruta)}" title="${esc(r.titulo)}">
        ${icono(r.icono)}<span class="etq">${esc(r.titulo)}</span>${r.pantalla === 'obra' ? '<span class="obra">en obra</span>' : ''}</a></li>`).join('')}</ul>
    </details>`;
  }).join('');
  return grupos;
}

/* ── Armazón ──────────────────────────────────────────────────────────── */
let N, esDemo;

function pintarArmazon(persona){
  const riel = guardado('tienda-riel') === '1';
  $app.classList.toggle('riel', riel);
  $app.innerHTML = `
    <div class="velo" data-cerrar-menu></div>
    <aside class="lateral" id="lateral" aria-label="Menú">
      <div class="cabeza">
        <a class="marca" href="${enlace('/')}"><span class="sello">${icono('tienda')}</span><span>${esc(N.marca?.nombre_corto || N.nombre)}</span></a>
        <button class="boton-ico solo-telefono" data-cerrar-menu aria-label="Cerrar menú">${icono('cerrar')}</button>
        <button class="boton-ico solo-escritorio" data-riel aria-label="${riel ? 'Abrir menú' : 'Hacer menú angosto'}" aria-pressed="${riel}">${icono('menu')}</button>
      </div>
      <nav id="menu">${pintarMenu(N, persona)}</nav>
      <div class="pie">
        ${esDemo ? `<p class="chica suave como" id="como"></p>` : ''}
        <div class="botones-pie">
          <button class="boton-ico" data-tema aria-label="Cambiar a tema oscuro">${icono('luna')}</button>
          <button class="boton-ico" data-letra aria-label="Letra más grande" aria-pressed="false">${icono('letra')}</button>
        </div>
      </div>
    </aside>
    <div class="columna">
      ${N.ajustes?.muestra ? `<div class="franja-muestra">${icono('info')}<span>${esc(N.ajustes.aviso_muestra || 'Tienda de muestra.')}</span></div>` : ''}
      <header class="arriba">
        <button class="boton-ico solo-telefono" data-abrir-menu aria-label="Abrir menú" aria-controls="lateral" aria-expanded="false">${icono('menu')}</button>
        <button class="boton-ico" data-atras aria-label="Regresar" hidden>${icono('atras')}</button>
        <h1 id="titulo" tabindex="-1"></h1>
        <a class="boton-ico" id="ir-buscar" href="${enlace('/buscar')}" aria-label="Buscar">${icono('buscar')}</a>
        <a class="boton-ico" id="ir-carrito" href="${enlace('/carrito')}" aria-label="Carrito">${icono('carrito')}<span class="insignia" hidden></span></a>
      </header>
      <main class="contenido" id="contenido"></main>
      <a class="barra-carrito" id="barra-carrito" href="${enlace('/carrito')}" hidden>
        ${icono('carrito')}<span class="cuanto"></span><span class="ver">Ver<span class="largo"> carrito</span> ${icono('adelante')}</span>
      </a>
    </div>`;
  pintarAjustesVista();
  pintarInsignia();
}

function pintarInsignia(){
  const b = $app.querySelector('#ir-carrito .insignia');
  const a = $app.querySelector('#ir-carrito');
  if(!b) return;
  const n = carrito.piezas();
  b.hidden = n === 0;
  b.textContent = n > 99 ? '99+' : n;
  a.setAttribute('aria-label', n ? `Carrito, ${n} ${n === 1 ? 'pieza' : 'piezas'}` : 'Carrito');
  pintarBarra();
}

/* «Llevas N · $X» siempre a la vista mientras se compra (PLAN.md §1-bis: la
   memoria corta es lo primero que falla). No sale donde estorba: en el carrito
   mismo, al pagar, ni fuera de la tienda. */
let rutaActual = null;
async function pintarBarra(){
  const barra = $app.querySelector('#barra-carrito');
  if(!barra) return;
  const n = carrito.piezas();
  const toca = n > 0 && rutaActual?.apartado === 'cliente' && !['/carrito', '/pagar'].includes(rutaActual.ruta);
  if(!toca){ barra.hidden = true; $app.classList.remove('con-barra'); return; }
  let total = 0;
  try{
    const { porId } = await catalogo();
    for(const [id, k] of carrito.renglones()){ const p = porId.get(id); if(p) total += p.p * k; }
  }catch(e){ /* sin catálogo no hay total, pero sí piezas */ }
  barra.querySelector('.cuanto').textContent = `Llevas ${plural(n, 'pieza', 'piezas')}${total ? ' · ' + pesos(total) : ''}`;
  barra.hidden = false;
  $app.classList.add('con-barra');
}

function temaActual(){
  const t = document.documentElement.dataset.tema;
  if(t) return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}
function pintarAjustesVista(){
  const bt = $app.querySelector('[data-tema]');
  const oscuro = temaActual() === 'oscuro';
  bt.innerHTML = icono(oscuro ? 'sol' : 'luna');
  bt.setAttribute('aria-label', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  const bl = $app.querySelector('[data-letra]');
  const grande = document.documentElement.dataset.letra === 'grande';
  bl.setAttribute('aria-pressed', grande);
  bl.setAttribute('aria-label', grande ? 'Letra normal' : 'Letra más grande');
}

function abrirMenu(abrir){
  $app.classList.toggle('menu-abierto', abrir);
  $app.querySelector('[data-abrir-menu]')?.setAttribute('aria-expanded', abrir);
  if(abrir) $app.querySelector('#menu a[aria-current="page"], #menu a')?.focus();
}

/* ── Enrutador ────────────────────────────────────────────────────────── */
let turno = 0;          // cada navegación; una pantalla vieja que termina tarde no pinta encima
let primera = true;
let desmontar = null;

async function navegar(){
  const mio = ++turno;
  const direccion = location.hash.replace(/^#/, '') || '/';
  const ruta = emparejar(direccion);
  const $c = $app.querySelector('#contenido');
  const $t = $app.querySelector('#titulo');
  const ap = ruta && APARTADOS.find((a) => a.id === ruta.apartado);

  abrirMenu(false);
  desmontar?.(); desmontar = null;

  // Menú: cuál está activa, y el grupo de la activa abierto.
  $app.querySelectorAll('#menu a').forEach((a) => {
    if(ruta && a.dataset.ruta === ruta.ruta) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  $app.querySelectorAll('#menu .grupo').forEach((g) => { if(ruta && g.dataset.apartado === ruta.apartado) g.open = true; });
  // Arriba: regresar sólo donde no se llega por el menú; buscar y carrito sólo en la tienda.
  $app.querySelector('.arriba [data-atras]').hidden = !ruta || ruta.menu;
  const enTienda = !ruta || ruta.apartado === 'cliente';
  $app.querySelector('#ir-buscar').hidden = !enTienda || ruta?.ruta === '/buscar';
  $app.querySelector('#ir-carrito').hidden = !enTienda || ruta?.ruta === '/carrito';
  $app.classList.toggle('en-tienda', enTienda);
  rutaActual = ruta; pintarBarra();

  $t.textContent = ruta ? ruta.titulo : 'No encontrado';
  document.title = `${ruta ? ruta.titulo + ' · ' : ''}${N.marca?.nombre_corto || N.nombre}`;
  $c.innerHTML = cargando();

  let vista;
  try{
    if(!ruta){ vista = noexiste(); }
    else{
      // ¿Hace falta un rol? En la muestra se cambia solo; en uno real, se pide.
      if(ap?.roles){
        let persona = await yo();
        if(!persona || !ap.roles.includes(persona.rol)){
          if(esDemo){
            persona = await verComo(ap.roles[0]);
            if(mio !== turno) return;
            pintarComo(persona);
            aviso(`Estás viendo como ${persona.nombre || ap.nombre}`);
          }
        }
        if(!persona || !ap.roles.includes(persona.rol)) vista = sinPermiso({ ruta });
      }
      if(!vista){
        const f = PANTALLAS[ruta.pantalla] || obra;
        vista = await f({ params: ruta.params, ruta });
      }
    }
  }catch(e){
    console.error(e);
    vista = fallo(e);
  }
  if(mio !== turno) return;

  if(vista.titulo) $t.textContent = vista.titulo;
  $c.classList.toggle('ancho', !!vista.ancho);
  $c.innerHTML = vista.html;
  window.scrollTo(0, 0);
  const r = vista.alMontar?.($c, { aviso, ir, ruta });
  if(typeof r === 'function') desmontar = r;
  // El foco va al título al cambiar de pantalla (no en la primera carga): quien
  // navega con lector de pantalla oye dónde llegó.
  if(!primera) $t.focus({ preventScroll: true });
  primera = false;
}

export function ir(patron, params){ location.hash = enlace(patron, params).slice(1); }

async function pintarComo(persona){
  const el = $app.querySelector('#como');
  if(!el) return;
  persona ??= await yo();
  el.textContent = persona ? `Viendo como: ${persona.nombre || persona.rol}` : 'Viendo como: visitante sin cuenta';
}

/* ── Clics del armazón ────────────────────────────────────────────────── */
$app.addEventListener('click', (e) => {
  const t = e.target.closest('button, a');
  if(!t) return;
  if(t.matches('[data-abrir-menu]')) abrirMenu(true);
  else if(t.matches('[data-cerrar-menu]')) abrirMenu(false);
  else if(t.matches('[data-riel]')){
    const riel = !$app.classList.contains('riel');
    $app.classList.toggle('riel', riel);
    guardado('tienda-riel', riel ? '1' : '0');
    t.setAttribute('aria-pressed', riel);
    t.setAttribute('aria-label', riel ? 'Abrir menú' : 'Hacer menú angosto');
  }
  else if(t.matches('[data-tema]')){
    const nuevo = temaActual() === 'oscuro' ? 'claro' : 'oscuro';
    document.documentElement.dataset.tema = nuevo;
    guardado('tienda-tema', nuevo);
    pintarAjustesVista();
  }
  else if(t.matches('[data-letra]')){
    const grande = document.documentElement.dataset.letra !== 'grande';
    if(grande) document.documentElement.dataset.letra = 'grande'; else delete document.documentElement.dataset.letra;
    guardado('tienda-letra', grande ? 'grande' : '');
    pintarAjustesVista();
  }
  else if(t.matches('[data-atras]')){
    // Si se llegó por un enlace directo no hay a dónde regresar: al inicio del apartado.
    if(history.length > 1 && !primeraEntrada) history.back();
    else{
      const r = emparejar(location.hash.replace(/^#/, '') || '/');
      ir(inicioDe(r?.apartado || 'cliente').ruta);
    }
  }
  else if(t.matches('[data-reintentar]')) navegar();
});
document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && $app.classList.contains('menu-abierto')) abrirMenu(false); });

let primeraEntrada = true;
window.addEventListener('hashchange', () => { primeraEntrada = false; navegar(); });
carrito.alCambiar(pintarInsignia);

/* ── Arranque ─────────────────────────────────────────────────────────── */
(async function arrancar(){
  try{
    N = await negocio();
  }catch(e){
    console.error(e);
    $app.innerHTML = `<main class="contenido">${fallo(e).html}</main>`;
    $app.addEventListener('click', (ev) => { if(ev.target.closest('[data-reintentar]')) location.reload(); }, { once: true });
    return;
  }
  esDemo = N.ajustes?.demo === true;
  if(N.marca?.acento && /^#[0-9a-f]{6}$/i.test(N.marca.acento))
    document.documentElement.style.setProperty('--acento', N.marca.acento);
  presentacion(N);
  pintarArmazon(await yo().catch(() => null));
  pintarComo();
  navegar();
})();
