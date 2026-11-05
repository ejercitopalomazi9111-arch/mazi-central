/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LA APP
   Arranca la escena, carga la colección y el catálogo, y mueve entre
   pantallas. Las reglas siguen en `../motor.js` (las mismas 61 pruebas): aquí
   no se decide quién gana nada.
   ═══════════════════════════════════════════════════════════════════════════ */
import { THREE, E, arrancar, mascota, tapete, cambiarTapete, cadaCuadro, vista, tocado, animar, sale } from './escena.js';
import { C, cargar, guardar, escuchar, cosmetico, COSMETICOS, CLASES_COSMETICO, RAREZA, ORDEN_RAREZA, llaveDe } from './coleccion.js';
import { CAT, cargarCatalogo, SOBRES, EN_TIENDA, comprar, regalarArranque, tengoPuercos, totalPuercos, TOPE_SOPORTE } from './tienda.js';
import { caraSobre, caraCosmetico } from './caras.js';
import { abrirSobre } from './sobre.js';
import { jugarPartida } from './mesa.js';
import { SON, alternar, estaApagado } from './sonido.js';
import { aviso, pista, cumplida } from './avisos.js';
import { cuenta, crear, entrar, salir, lideres, alCambiarCuenta, estadoSubida } from './cuenta.js';

const $ = (s, d = document) => d.querySelector(s);
const $$ = (s, d = document) => [...d.querySelectorAll(s)];

arrancar($('#gl'));
await Promise.all([cargar(), cargarCatalogo('../')]);
regalarArranque();

/* ── LA MESA DEL FONDO y LOS CERDITOS QUE CORREN ─────────────────────────── */
const fondo = tapete((cosmetico(C.puesto.tapete) || cosmetico('tp-madera')).img);
E.s.add(fondo);
const corral = new THREE.Group(); E.s.add(corral);
const cerdos = [];
async function ponerCerdos(){
  for(const c of cerdos) c.m.soltar();
  cerdos.length = 0;
  const url = (cosmetico(C.puesto.mascota) || cosmetico('ms-pig')).modelo;
  for(let i = 0; i < 3; i++){
    const m = await mascota(url);
    m.obj.scale.setScalar(.36 - i * .05);
    corral.add(m.obj);
    m.hacer('run', { vel: 1.3 });
    cerdos.push({ m, x: -3 - i * 1.6, vel: 1.1 + i * .25, fila: i, fiesta: 0 });
  }
}
await ponerCerdos();
/* Corren de izquierda a derecha por la parte de abajo, y al salir dan la vuelta. */
cadaCuadro((dt, t) => {
  const v = vista(0);
  for(const c of cerdos){
    if(c.fiesta > 0){ c.fiesta -= dt; if(c.fiesta <= 0) c.m.hacer('run', { vel: 1.3 }); }
    else c.x += c.vel * dt;
    if(c.x > v.ancho / 2 + 1) c.x = -v.ancho / 2 - 1 - Math.random() * 2;
    c.m.obj.position.set(c.x, -v.alto * .235 + c.fila * .22, -.4 - c.fila * .3);
    c.m.obj.rotation.set(.35, Math.PI / 2, 0);
  }
});
corral.visible = true;

/* Tocar un cerdito lo pone a bailar. Es tonto y es exactamente lo que hace que
   un niño se quede en la pantalla de inicio. */
$('#gl').addEventListener('pointerdown', (e) => {
  if(pantallaActual !== 'inicio') return;
  const t = tocado(e.clientX, e.clientY, cerdos.map(c => c.m.obj));
  if(!t) return;
  const c = cerdos.find(c => { let o = t.object; while(o){ if(o === c.m.obj) return true; o = o.parent; } return false; });
  if(c){ c.m.hacer(Math.random() < .5 ? 'dance' : 'gesture-positive'); c.fiesta = 2.2; SON.rara(); }
});

/* ── LA BARRA DE ARRIBA ──────────────────────────────────────────────────── */
let monedasVistas = C.monedas;
function pintarBarra(){
  $('#nMonedas').textContent = C.monedas;
  if(C.monedas !== monedasVistas){ $('#monedas').classList.remove('sube'); void $('#monedas').offsetWidth; $('#monedas').classList.add('sube'); monedasVistas = C.monedas; }
  $('#yoAvatar').src = (cosmetico(C.puesto.avatar) || cosmetico('av-pig')).img;
  $('#yoNombre').textContent = cuenta() ? cuenta().apodo : 'Tú';
  const n = C.sobres.length;
  $('#globoSobres').hidden = !n; $('#globoSobres').textContent = n;
  if(n > sobresVistos && !['abrir', 'mesa', 'tienda', 'sobres'].includes(pantallaActual)) notificarSobres();
  sobresVistos = n;
  if(!n) esconderNoti();
}
/* La notificación: baja de arriba, dice cuántos hay y lleva a «Sobres». Se va
   sola a los 6 s (el globito del menú se queda). Carlos, 5 nov: «en lugar de
   como lo estamos haciendo con el botón haz que salga una notificación». */
let sobresVistos = 0, notiReloj = 0;
/* Carlos, 5 nov: «nunca se quita». Salía otra vez cada que volvía al inicio.
   Ahora sale UNA vez por cada sobre que llega (y al abrir la app), se va sola
   a los 5 s y también al tocarla o al deslizarla hacia arriba. */
function notificarSobres(){
  const n = C.sobres.length; if(!n) return;
  const b = $('#notiSobres');
  $('#notiTit').textContent = n === 1 ? 'Tienes un sobre por abrir' : 'Tienes ' + n + ' sobres por abrir';
  b.hidden = false; requestAnimationFrame(() => b.classList.add('ve'));
  try{ SON.moneda?.(); }catch(e){}
  clearTimeout(notiReloj); notiReloj = setTimeout(esconderNoti, 5000);
}
function esconderNoti(){ const b = $('#notiSobres'); b.classList.remove('ve'); setTimeout(() => { if(!b.classList.contains('ve')) b.hidden = true; }, 350); }
let pantallaActual = 'inicio';
escuchar(pintarBarra); pintarBarra();
$('#bSonido').addEventListener('click', () => { const off = alternar(); $('#bSonido img').src = 'img/iconos/' + (off ? 'audioOff' : 'audioOn') + '.png'; });
$('#bSonido img').src = 'img/iconos/' + (estaApagado() ? 'audioOff' : 'audioOn') + '.png';

/* ── LAS PANTALLAS ───────────────────────────────────────────────────────── */
function ir(p){
  if(p === 'jugar'){ irAJugar(); return; }
  pantallaActual = p;
  for(const m of $$('.pantalla')) m.classList.toggle('activa', m.dataset.p === p);
  for(const b of $$('#dock button')) b.classList.toggle('activo', b.dataset.ir === p);
  corral.visible = p === 'inicio';
  const abriendo = p === 'abrir' || p === 'mesa';
  $('.barra').style.visibility = $('#dock').style.visibility = abriendo ? 'hidden' : '';
  if(p === 'tienda') pintarTienda();
  if(p === 'sobres') pintarMisSobres();
  if(p === 'coleccion') pintarColeccion();
  if(p !== 'inicio') esconderNoti();
  SON.toque();
}
$('#dock').addEventListener('click', (e) => { const b = e.target.closest('[data-ir]'); if(b) ir(b.dataset.ir); });
$('#notiSobres').addEventListener('click', () => { esconderNoti(); ir('sobres'); });
{ let y0 = null; const n = $('#notiSobres');
  n.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  n.addEventListener('touchmove', (e) => { if(y0 != null && e.touches[0].clientY - y0 < -20){ y0 = null; esconderNoti(); } }, { passive: true }); }

/* JUGAR: la mesa nueva, contra la máquina. */
function irAJugar(){
  ir('mesa');
  jugarPartida({ capa: $('#ui'), alTerminar: (salida) => {
    if(salida === 'otra') return irAJugar();
    ir(salida === 'tienda' ? 'tienda' : 'inicio');
  } });
}
$('#bJugar').addEventListener('click', irAJugar);

/* ── LA TIENDA ───────────────────────────────────────────────────────────── */
async function pintarTienda(){
  const e = $('#estante'); e.innerHTML = '';
  for(const tipo of EN_TIENDA){
    const s = SOBRES[tipo], d = document.createElement('div'); d.className = 'producto';
    d.innerHTML = `<div class="foto"></div><b>${s.nombre}</b><span>${s.puercos} puercos ${s.niveles ? '(' + s.niveles.join(', ') + ')' : 'de cualquier rareza'} y 1 sorpresa</span>
      <button class="btn${s.precio > C.monedas ? '' : ' oro'}" data-comprar="${tipo}"><img alt="" src="img/iconos/moneda.png">${s.precio}</button>`;
    e.appendChild(d);
    caraSobre(tipo, 320, 500).then(c => d.querySelector('.foto').style.backgroundImage = `url(${c.toDataURL('image/jpeg', .82)})`);
  }
}
$('#estante').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-comprar]'); if(!b) return;
  const r = comprar(b.dataset.comprar);
  if(r.mal){ SON.error(); aviso(r.mal, { tipo: 'mal', icono: 'img/iconos/moneda.png' }); return; }
  SON.moneda();
  pintarTienda();
  const img = (await caraSobre(r.sobre.tipo, 240, 375)).toDataURL('image/jpeg', .85);
  hoja(`<img class="sobre" alt="" src="${img}"><h3>¡Es tuyo!</h3><p style="margin:0">¿Lo abres ahora o lo guardas para después?</p>
        <button class="btn grande" data-h="abrir">Abrir ahora</button><button class="btn suave" data-h="guardar">Guardar para después</button>`,
    (que) => { if(que === 'abrir') abrir(r.sobre); else aviso('Guardado en «Sobres»', { icono: 'img/iconos/open.png' }); });
});
function hoja(html, alElegir){
  const h = $('#hoja'); $('#hojaCaja').innerHTML = html; h.classList.add('ve');
  const cerrar = (que) => { h.classList.remove('ve'); h.onclick = null; alElegir && alElegir(que); };
  h.onclick = (e) => { const b = e.target.closest('[data-h]'); if(b){ SON.toque(); cerrar(b.dataset.h); } else if(e.target === h) cerrar('guardar'); };
}

/* ── MIS SOBRES ──────────────────────────────────────────────────────────── */
async function pintarMisSobres(){
  const caja = $('#misSobres');
  if(!C.sobres.length){
    caja.innerHTML = `<div class="vacio"><img alt="" src="img/iconos/open.png"><p>No tienes sobres guardados.<br>Se compran en la tienda con las monedas que ganas jugando.</p><button class="btn" data-ir2="tienda">Ir a la tienda</button></div>`;
    caja.querySelector('[data-ir2]').onclick = () => ir('tienda');
    return;
  }
  /* Todos amontonados, uno sobre otro, como en la mesa: el de hasta arriba
     es el que se abre, y al terminar sigue el que quedó debajo. */
  const n = C.sobres.length, vis = C.sobres.slice(0, 8);
  caja.innerHTML = `<div class="monton-sobres" role="button" aria-label="Abrir el sobre de hasta arriba">
      ${vis.map((s, i) => `<img alt="" data-i="${i}" style="--i:${i}; z-index:${20 - i}">`).join('')}
      <span class="monton-sobres__n">${n}</span>
    </div>
    <p class="monton-sobres__pie"><b>${SOBRES[C.sobres[0].tipo].nombre}</b> · toca el de hasta arriba para abrirlo</p>`;
  vis.forEach((s, i) => caraSobre(s.tipo, 300, 470).then(c => { const im = caja.querySelector(`[data-i="${i}"]`); if(im) im.src = c.toDataURL('image/jpeg', .85); }));
  const m = caja.querySelector('.monton-sobres');
  m.onclick = () => {
    if(m.classList.contains('sale')) return;
    m.classList.add('sale'); SON.saca?.();
    setTimeout(() => abrir(C.sobres[0]), 380);
  };
  pista('monton', m, 'Toca el sobre de arriba', { gesto: 'toca', veces: 2 });
}

/* ── ABRIR UN SOBRE ──────────────────────────────────────────────────────── */
function abrir(sobre){
  if(!sobre) return;
  ir('abrir');
  abrirSobre(sobre, { capa: $('#ui'), alTerminar: (salida) => {
    if(salida === 'otro' && C.sobres.length) return abrir(C.sobres[0]);
    ir(salida === 'coleccion' ? 'coleccion' : C.sobres.length ? 'sobres' : 'inicio');
  } });
}

/* ── LA COLECCIÓN ────────────────────────────────────────────────────────── */
let pestana = 'puercos', filtro = 'todas';
$('#pestanas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-t]'); if(!b) return;
  pestana = b.dataset.t; filtro = 'todas'; SON.toque();
  for(const x of $$('#pestanas button')) x.classList.toggle('activo', x === b);
  pintarColeccion();
});
function pintarColeccion(){
  const caja = $('#coleccion');
  if(pestana === 'puercos'){
    const n = tengoPuercos(), total = totalPuercos();
    const chips = [['todas', 'Todas', null], ...ORDEN_RAREZA.map(r => [r, RAREZA[r], 'var(--' + r + ')'])];
    const lista = CAT.puercos.filter(f => filtro === 'todas' || f.nivel === filtro)
      .slice().sort((a, b) => ORDEN_RAREZA.indexOf(a.nivel) - ORDEN_RAREZA.indexOf(b.nivel) || b.puntos - a.puntos);
    caja.innerHTML = `<div class="cuenta-album"><b>${n} / ${total}</b><div class="barra-album"><i style="width:${n / total * 100}%"></i></div></div>
      <div class="chips">${chips.map(([k, t, c]) => `<button data-f="${k}" class="${filtro === k ? 'activo' : ''}" ${c ? `style="--c:${c}"` : ''}>${t}</button>`).join('')}</div>
      <div class="album">${lista.map(f => { const k = C.cartas[llaveDe(f)] | 0;
        return `<button class="${k ? '' : 'falta'}" data-carta="${f.n}" aria-label="${k ? f.nombre : 'Te falta esta carta'}"><img loading="lazy" alt="" src="${f.arte}">${k > 1 ? `<span class="cuantas">×${k}</span>` : ''}</button>`; }).join('')}</div>`;
    caja.querySelector('.chips').onclick = (e) => { const b = e.target.closest('[data-f]'); if(b){ filtro = b.dataset.f; SON.toque(); pintarColeccion(); } };
    caja.querySelector('.album').onclick = (e) => {
      const b = e.target.closest('[data-carta]'); if(!b) return;
      const f = CAT.puercos.find(x => String(x.n) === b.dataset.carta);
      if(!C.cartas[llaveDe(f)]){ aviso('Todavía no la tienes. Sale en los sobres.', { icono: 'img/iconos/locked.png' }); return; }
      lupa(f.arte, f.nombre + ' · ' + f.puntos + ' pts · ' + RAREZA[f.nivel]);
    };
    return;
  }
  if(pestana === 'soporte'){
    const fila = (f, k, que) => `<div class="soporte-fila"><img alt="" src="${f.arte}"><div><b>${f.nombre}</b><p>${que}</p>
      <div class="puntos-soporte">${Array.from({ length: TOPE_SOPORTE }, (_, i) => `<i class="${i < k ? 'si' : ''}"></i>`).join('')}</div>
      <p>Llevas ${k} de ${TOPE_SOPORTE} en tu mazo.</p></div></div>`;
    caja.innerHTML = fila(CAT.bono, C.soporte.bono, '+5 a tu carta. Va encima de una carta tuya.')
                   + fila(CAT.castigo, C.soporte.castigo, '−5 a la carta del rival.')
                   + '<p class="nota">Las cartas de soporte salen en los sobres. Caben hasta 5 de cada una en tu mazo.</p>';
    return;
  }
  pintarCosmeticos(caja);
}
/* Los cosméticos, por clase; tocar uno que tienes te lo pones. Se usa en la
   colección y en el perfil (Carlos, 5 nov: «que el menú de cosméticos salga
   al tocar tu perfil»). */
let claseCos = 'avatar';
function pintarCosmeticos(caja){
  const clases = Object.keys(CLASES_COSMETICO);
  if(!clases.includes(claseCos)) claseCos = 'avatar';
  const lista = COSMETICOS.filter(k => k.clase === claseCos);
  const tiene = (k) => !!C.cosmeticos[k.id] || C.puesto[k.clase] === k.id || k.rareza === 'D' && ['av-pig', 'tp-madera', 'ms-pig', 'ds-autora'].includes(k.id);
  caja.innerHTML = `<div class="chips">${clases.map(c => `<button data-f="${c}" class="${claseCos === c ? 'activo' : ''}">${CLASES_COSMETICO[c].nombre}</button>`).join('')}</div>
    <div class="album">${lista.map(k => `<button class="${tiene(k) ? '' : 'falta'}" data-cos="${k.id}"><img alt="" data-cara="${k.id}">${C.puesto[k.clase] === k.id ? '<span class="puesto">Puesto</span>' : ''}</button>`).join('')}</div>
    <p class="nota">Toca uno que tengas para ponértelo.</p>`;
  for(const im of $$('[data-cara]', caja)) caraCosmetico(im.dataset.cara).then(c => im.src = c.toDataURL('image/jpeg', .85));
  caja.querySelector('.chips').onclick = (e) => { const b = e.target.closest('[data-f]'); if(b){ claseCos = b.dataset.f; SON.toque(); pintarCosmeticos(caja); } };
  caja.querySelector('.album').onclick = async (e) => {
    const b = e.target.closest('[data-cos]'); if(!b) return;
    const k = cosmetico(b.dataset.cos);
    if(!tiene(k)){ aviso('Todavía no lo tienes. Sale en los sobres.', { icono: 'img/iconos/locked.png' }); return; }
    C.puesto[k.clase] = k.id; guardar(); SON.rara();
    aviso('Te pusiste: ' + k.nombre, { tipo: 'bien', icono: 'img/iconos/checkmark.png' });
    if(k.clase === 'tapete') cambiarTapete(fondo, k.img);
    if(k.clase === 'mascota') ponerCerdos();
    pintarCosmeticos(caja);
  };
}
function lupa(src, pie){
  const l = $('#lupa'); $('#lupaImg').src = src; $('#lupaPie').textContent = pie; l.classList.add('ve');
  l.onclick = () => l.classList.remove('ve');
}

/* Si llegó con un sobre de bienvenida, la primera cosa que se le enseña es ése. */

window.__puercos = { C, CAT, ir, abrir };

/* ── EL PERFIL · tocar tu foto ────────────────────────────────────────────────
   Tu cuenta (apodo y PIN), tus números, tus cosméticos y la tabla de líderes. */
let pestanaPerfil = 'cuenta', tablaLideres = 'victorias';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function abrirPerfil(pest){
  if(pest) pestanaPerfil = pest;
  const h = $('#perfil'); pintarPerfil(); h.hidden = false; requestAnimationFrame(() => h.classList.add('ve'));
  h.onclick = (e) => { if(e.target === h) cerrarPerfil(); };
  SON.toque();
}
function cerrarPerfil(){ $('#perfil').classList.remove('ve'); }
function pintarPerfil(){
  const caja = $('#perfilCaja'), yo = cuenta(), st = C.stats;
  const cartas = Object.values(C.cartas).filter(n => n > 0).length;
  caja.innerHTML = `
    <div class="perfil__cabeza"><img alt="" src="${(cosmetico(C.puesto.avatar) || cosmetico('av-pig')).img}">
      <div><b>${yo ? esc(yo.apodo) : 'Invitado'}</b><small>${yo ? 'Tus cartas se guardan en tu cuenta' : 'Tus cartas sólo están en este teléfono'}</small></div></div>
    <div class="perfil__numeros">
      <div><b>${st.victorias}</b><span>Victorias</span></div><div><b>${st.derrotas}</b><span>Derrotas</span></div>
      <div><b>${C.monedas}</b><span>Monedas</span></div><div><b>${cartas}</b><span>Cartas</span></div></div>
    <div class="perfil__pestanas">${[['cuenta', 'Cuenta'], ['cosmeticos', 'Cosméticos'], ['lideres', 'Líderes']].map(([k, t]) => `<button data-pp="${k}" class="${pestanaPerfil === k ? 'activo' : ''}">${t}</button>`).join('')}</div>
    <div data-cuerpo></div>
    <button class="btn suave" data-cerrar>Cerrar</button>`;
  caja.querySelector('.perfil__pestanas').onclick = (e) => { const b = e.target.closest('[data-pp]'); if(b){ pestanaPerfil = b.dataset.pp; SON.toque(); pintarPerfil(); } };
  caja.querySelector('[data-cerrar]').onclick = cerrarPerfil;
  const cuerpo = caja.querySelector('[data-cuerpo]');
  if(pestanaPerfil === 'cosmeticos') return pintarCosmeticos(cuerpo);
  if(pestanaPerfil === 'lideres') return pintarLideres(cuerpo);
  if(yo){
    const hace = estadoSubida.ultima ? Math.max(0, Math.round((Date.now() - estadoSubida.ultima) / 1000)) : null;
    cuerpo.innerHTML = `<p class="nota">${estadoSubida.error ? 'No se ha podido guardar en internet: ' + esc(estadoSubida.error) + '. Se reintenta solo.' : hace != null ? 'Guardado en tu cuenta hace ' + (hace < 60 ? hace + ' s' : Math.round(hace / 60) + ' min') + '.' : 'Se guarda en tu cuenta cada que cambia algo.'}</p>
      <p class="nota">En otro teléfono, entra con el mismo apodo y PIN y ahí estarán tus cartas.</p>
      <button class="btn suave" data-salir>Salir de la cuenta</button>`;
    cuerpo.querySelector('[data-salir]').onclick = () => { salir(); aviso('Saliste de tu cuenta', { icono: 'img/iconos/checkmark.png' }); pintarPerfil(); pintarBarra(); };
    return;
  }
  cuerpo.innerHTML = `<form autocomplete="off">
      <p class="nota">Con una cuenta tus cartas no se pierden aunque cambies de teléfono, y sales en la tabla de líderes. <b>Sólo un apodo, no tu nombre real.</b></p>
      <label>Apodo<input name="apodo" maxlength="16" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Ej. PuercoVeloz"></label>
      <label>PIN (4 a 6 números)<input name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" type="password" placeholder="••••"></label>
      <p class="error" data-error></p>
      <div class="dos"><button class="btn" data-hacer="crear" type="button">Crear cuenta</button><button class="btn suave" data-hacer="entrar" type="button">Ya tengo una</button></div>
    </form>`;
  const f = cuerpo.querySelector('form'), err = cuerpo.querySelector('[data-error]');
  f.onclick = async (e) => {
    const b = e.target.closest('[data-hacer]'); if(!b || b.disabled) return;
    const apodo = f.apodo.value.trim(), pin = f.pin.value.trim();
    /* lo que se puede revisar aquí, se revisa aquí: no se gasta un viaje al servidor */
    if(apodo.length < 3) return err.textContent = 'El apodo va de 3 a 16 letras o números.', f.apodo.focus();
    if(!/^\d{4,6}$/.test(pin)) return err.textContent = 'El PIN son de 4 a 6 números.', f.pin.focus();
    err.textContent = ''; for(const x of f.querySelectorAll('button')) x.disabled = true;
    try{
      if(b.dataset.hacer === 'crear'){ await crear(apodo, pin); aviso('¡Listo! Tu cuenta quedó creada', { tipo: 'bien', icono: 'img/iconos/checkmark.png' }); }
      else { await entrar(apodo, pin); aviso('¡Bienvenido de vuelta!', { tipo: 'bien', icono: 'img/iconos/checkmark.png' }); }
      SON.rara(); pintarPerfil(); pintarBarra();
    }catch(e){
      err.textContent = e.message === 'Failed to fetch' || e.message === 'Load failed' ? 'No hay internet o el servidor no contesta. Prueba otra vez.' : e.message;
      for(const x of f.querySelectorAll('button')) x.disabled = false; SON.error();
    }
  };
}
async function pintarLideres(cuerpo){
  const TABLAS = [['victorias', 'Victorias'], ['monedas', 'Más dinero'], ['cartas', 'Más cartas'], ['derrotas', 'Derrotas'], ['partidas', 'Partidas']];
  cuerpo.innerHTML = `<div class="perfil__pestanas">${TABLAS.map(([k, t]) => `<button data-tl="${k}" class="${tablaLideres === k ? 'activo' : ''}">${t}</button>`).join('')}</div><ol class="lideres"><li><span>Cargando…</span></li></ol>`;
  cuerpo.querySelector('.perfil__pestanas').onclick = (e) => { const b = e.target.closest('[data-tl]'); if(b){ tablaLideres = b.dataset.tl; SON.toque(); pintarLideres(cuerpo); } };
  const lista = cuerpo.querySelector('.lideres'), yo = cuenta();
  try{
    const l = await lideres(), filas = l[tablaLideres] || [];
    lista.innerHTML = filas.length ? filas.map((f, i) => `<li class="${yo && f.apodo.toLowerCase() === yo.apodo.toLowerCase() ? 'yo-mismo' : ''}"><b>${i + 1}</b><span>${esc(f.apodo)}</span><em>${f.n}</em></li>`).join('')
      : '<li><span>Todavía nadie. ¡Sé el primero!</span></li>';
    if(!yo) lista.insertAdjacentHTML('afterend', '<p class="nota">Para salir aquí, crea tu cuenta en la pestaña «Cuenta».</p>');
  }catch(e){ lista.innerHTML = '<li><span>No se pudo cargar la tabla. Revisa tu internet.</span></li>'; }
}
$('#yo').addEventListener('click', () => abrirPerfil());
$('#bLideres').addEventListener('click', () => abrirPerfil('lideres'));
alCambiarCuenta((que) => { pintarBarra(); if(que === 'caduco') aviso('Tu sesión se cerró: vuelve a entrar a tu cuenta', { icono: 'img/iconos/information.png' }); });
