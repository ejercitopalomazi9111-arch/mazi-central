/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LA APP
   Arranca la escena, carga la colección y el catálogo, y mueve entre
   pantallas. Las reglas siguen en `../motor.js` (las mismas 61 pruebas): aquí
   no se decide quién gana nada.
   ═══════════════════════════════════════════════════════════════════════════ */
import { THREE, E, arrancar, mascota, tapete, cambiarTapete, cadaCuadro, vista, tocado, animar, sale } from './escena.js';
import { C, cargar, guardar, escuchar, cosmetico, COSMETICOS, CLASES_COSMETICO, RAREZA, ORDEN_RAREZA, llaveDe } from './coleccion.js';
import { CAT, cargarCatalogo, SOBRES, EN_TIENDA, comprar, regalarArranque, tengoPuercos, totalPuercos, TOPE_SOPORTE, misCartas } from './tienda.js';
import { caraSobre, caraCosmetico } from './caras.js';
import { abrirSobre } from './sobre.js';
import { jugarPartida, PV_MESA } from './mesa.js';
import { SON, alternar, estaApagado } from './sonido.js';
import { aviso, pista, cumplida } from './avisos.js';
import { cuenta, crear, entrar, salir, lideres, alCambiarCuenta, estadoSubida, amigos, pedirAmigo, aceptarAmigo, quitarAmigo, retar, borrarReto } from './cuenta.js';
import { conectar, codigoNuevo, codigoValido } from './linea.js';

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
  if(p === 'jugar'){ elegirModo(); return; }
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

/* JUGAR: contra la máquina, dos en este teléfono, o a distancia (Carlos, 5 nov:
   «ya pon el modo para multijugador tanto en el mismo teléfono como online»). */
function elegirModo(){
  hoja(`<h3>¿Cómo juegas?</h3>
    <button class="btn grande" data-h="maquina"><img alt="" class="ico" src="img/iconos/singleplayer.png"> Contra la máquina</button>
    <button class="btn" data-h="dos"><img alt="" class="ico" src="img/iconos/multiplayer.png"> Dos en este teléfono</button>
    <button class="btn" data-h="linea"><img alt="" class="ico" src="img/iconos/share1.png"> A distancia, con un amigo</button>
    <button class="btn suave" data-h="nada">Cancelar</button>`,
    (que) => { if(que === 'maquina' || que === 'dos') irAJugar(que); else if(que === 'linea') abrirDistancia(); });
}
function irAJugar(modo = 'maquina', conexion = null){
  ir('mesa');
  jugarPartida({ capa: $('#ui'), modo, conexion, alTerminar: (salida) => {
    if(salida === 'otra') return irAJugar(modo, conexion);
    ir(salida === 'tienda' ? 'tienda' : 'inicio');
  } });
}
$('#bJugar').addEventListener('click', elegirModo);

/* ── A DISTANCIA ─────────────────────────────────────────────────────────────
   Uno crea la sala y le pasa el código de 4 letras (o el link) al otro; con
   cuenta, también se reta a un amigo de la lista y le llega el aviso. */
function cerrarHoja(){ const h = $('#hoja'); h.classList.remove('ve'); h.onclick = null; }
const mazoParaLinea = () => { try{ return misCartas().slice(0, 120).map(c => c.nivel + c.valor).join('.'); }catch(e){ return ''; } };
function abrirDistancia(){
  const yo = cuenta();
  hoja(`<div class="perfil distancia">
      <h3>A distancia</h3>
      <p class="nota">Uno crea la sala y le pasa el código de 4 letras al otro. Cada quien juega con sus cartas.</p>
      <button class="btn grande" data-crear>Crear sala</button>
      <div class="unirme"><input data-codigo maxlength="4" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="CÓDIGO" aria-label="Código de la sala"><button class="btn" data-unir>Entrar</button></div>
      <p class="error" data-error></p>
      ${yo ? '<h4>Reta a un amigo</h4><div class="amigos" data-amigos><p class="nota">Cargando…</p></div>' : '<p class="nota">Con una cuenta (toca tu foto) puedes agregar amigos y retarlos sin pasar códigos.</p>'}
      <button class="btn suave" data-h="nada">Cancelar</button></div>`);
  const caja = $('#hojaCaja'), err = $('[data-error]', caja), inp = $('[data-codigo]', caja);
  inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  $('[data-crear]', caja).onclick = async (e) => {
    e.target.disabled = true;
    try{ entrarSala(await codigoNuevo()); }
    catch(x){ err.textContent = x.message; e.target.disabled = false; SON.error(); }
  };
  $('[data-unir]', caja).onclick = () => {
    const c = inp.value.trim().toUpperCase();
    if(!codigoValido(c)){ err.textContent = 'El código son 4 letras (sin O, I ni L).'; SON.error(); inp.focus(); return; }
    entrarSala(c);
  };
  if(yo) pintarAmigos($('[data-amigos]', caja), { soloRetar: true });
}
/* La sala de espera: el código en grande hasta que entra el otro. */
function entrarSala(codigo, { reto = null } = {}){
  const cx = conectar(codigo, { pv: PV_MESA, nombre: cuenta()?.apodo || '', avatar: C.puesto.avatar, mazo: mazoParaLinea() });
  let listo = false;
  const link = location.origin + location.pathname + '?sala=' + codigo;
  hoja(`<div class="perfil distancia">
      <h3>${reto ? 'Retaste a ' + esc(reto) : 'Tu sala'}</h3>
      <div class="codigo-grande" aria-label="Código de la sala">${codigo}</div>
      <p class="nota" data-estado>Conectando…</p>
      <button class="btn" data-compartir><img alt="" class="ico" src="img/iconos/share1.png"> Pasar el código</button>
      <button class="btn suave" data-h="salir">Salir</button></div>`, () => { if(!listo){ cx.cerrar(); quitar(); if(reto) borrarReto(reto).catch(() => {}); } });
  const caja = $('#hojaCaja'), est = $('[data-estado]', caja);
  $('[data-compartir]', caja).onclick = async () => {
    const texto = `¡Vamos a jugar Guerra de Puercos! Entra a «A distancia» con el código ${codigo}`;
    try{ if(navigator.share){ await navigator.share({ text: texto, url: link }); return; } }catch(e){ return; }
    try{ await navigator.clipboard.writeText(texto + ' · ' + link); aviso('Copiado: pégalo en WhatsApp', { icono: 'img/iconos/checkmark.png' }); }
    catch(e){ aviso('El código es ' + codigo, { icono: 'img/iconos/information.png' }); }
  };
  const quitar = cx.oir((m) => {
    if(m.tipo === 'lleno' || m.tipo === 'cerrada'){ est.textContent = m.porque || 'Se cerró la sala.'; est.classList.add('error'); return; }
    if(m.tipo === 'conexion' && !m.abierta){ est.textContent = 'Sin internet… reconectando'; return; }
    if(m.tipo !== 'estado') return;
    const v = m.vista;
    if(v.listo && !v.esperando){
      listo = true; quitar(); cerrarHoja(); SON.rara();
      if(reto) borrarReto(reto).catch(() => {});
      irAJugar('linea', cx);
      return;
    }
    est.textContent = reto ? `Esperando a que ${reto} acepte el reto…` : 'Esperando a que entre tu amigo con este código…';
  });
  if(reto) retar(reto, codigo).catch((e) => { est.textContent = e.message; est.classList.add('error'); });
}
/* el link con ?sala=ABCD entra directo */
{ const s = new URLSearchParams(location.search).get('sala'); if(s && codigoValido(s.toUpperCase())) setTimeout(() => entrarSala(s.toUpperCase()), 300); }

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
    <div class="perfil__pestanas">${[['cuenta', 'Cuenta'], ['amigos', 'Amigos'], ['cosmeticos', 'Cosméticos'], ['lideres', 'Líderes']].map(([k, t]) => `<button data-pp="${k}" class="${pestanaPerfil === k ? 'activo' : ''}">${t}</button>`).join('')}</div>
    <div data-cuerpo></div>
    <button class="btn suave" data-cerrar>Cerrar</button>`;
  caja.querySelector('.perfil__pestanas').onclick = (e) => { const b = e.target.closest('[data-pp]'); if(b){ pestanaPerfil = b.dataset.pp; SON.toque(); pintarPerfil(); } };
  caja.querySelector('[data-cerrar]').onclick = cerrarPerfil;
  const cuerpo = caja.querySelector('[data-cuerpo]');
  if(pestanaPerfil === 'cosmeticos') return pintarCosmeticos(cuerpo);
  if(pestanaPerfil === 'lideres') return pintarLideres(cuerpo);
  if(pestanaPerfil === 'amigos') return pintarAmigos(cuerpo);
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

/* ── AMIGOS ──────────────────────────────────────────────────────────────────
   Se agregan por apodo; el otro acepta; y ya se les puede retar con un toque.
   En el perfil sale todo; en «A distancia», sólo la lista para retar. */
async function pintarAmigos(caja, { soloRetar = false } = {}){
  if(!cuenta()){ caja.innerHTML = '<p class="nota">Para tener amigos, primero crea tu cuenta en la pestaña «Cuenta». Sólo un apodo y un PIN.</p>'; return; }
  if(!soloRetar && !caja.querySelector('[data-nuevo]')){
    caja.innerHTML = `<form class="amigo-nuevo" data-nuevo autocomplete="off"><label>Agrega a alguien por su apodo<span class="fila"><input name="apodo" maxlength="16" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Su apodo"><button class="btn" type="submit">Agregar</button></span></label><p class="error" data-error></p></form><div class="amigos" data-lista><p class="nota">Cargando…</p></div>`;
    const f = caja.querySelector('[data-nuevo]');
    f.onsubmit = async (e) => {
      e.preventDefault();
      const apodo = f.apodo.value.trim(), err = f.querySelector('[data-error]');
      if(apodo.length < 3){ err.textContent = 'Escribe su apodo completo.'; return; }
      try{ const r = await pedirAmigo(apodo); err.textContent = ''; f.apodo.value = ''; aviso(r.aceptada ? '¡Ya son amigos!' : r.ya ? 'Ya eran amigos' : 'Solicitud mandada a ' + apodo, { tipo: 'bien', icono: 'img/iconos/checkmark.png' }); SON.rara(); pintarAmigos(caja); }
      catch(x){ err.textContent = x.message; SON.error(); }
    };
  }
  const lista = soloRetar ? caja : caja.querySelector('[data-lista]');
  let d;
  try{ d = await amigos(); }
  catch(e){ lista.innerHTML = `<p class="nota">${esc(e.message === 'Failed to fetch' || e.message === 'Load failed' ? 'No se pudo cargar: revisa tu internet.' : e.message)}</p>`; return; }
  const fila = (a) => `<li><i class="punto${a.enLinea ? ' si' : ''}" title="${a.enLinea ? 'En línea' : 'Desconectado'}"></i><span>${esc(a.apodo)}<small>${a.enLinea ? 'en línea' : 'desconectado'} · ${a.victorias | 0} victorias</small></span><button class="btn" data-retar="${esc(a.apodo)}">Retar</button>${soloRetar ? '' : `<button class="btn suave mini" data-quitar="${esc(a.apodo)}" aria-label="Quitar a ${esc(a.apodo)}">Quitar</button>`}</li>`;
  let html = '';
  if(!soloRetar && d.piden.length) html += `<h4>Te quieren agregar</h4><ul>${d.piden.map(x => `<li><span>${esc(x)}</span><button class="btn oro" data-aceptar="${esc(x)}">Aceptar</button><button class="btn suave mini" data-quitar="${esc(x)}">No</button></li>`).join('')}</ul>`;
  html += d.amigos.length ? `${soloRetar ? '' : '<h4>Tus amigos</h4>'}<ul>${d.amigos.map(fila).join('')}</ul>`
        : `<p class="nota">${soloRetar ? 'Todavía no tienes amigos. Agrégalos desde tu perfil (toca tu foto) con su apodo.' : 'Todavía no tienes amigos. Pídele su apodo a alguien y agrégalo aquí arriba.'}</p>`;
  if(!soloRetar && d.mandadas.length) html += `<h4>Esperando a que acepten</h4><ul>${d.mandadas.map(x => `<li><span>${esc(x)}</span><button class="btn suave mini" data-quitar="${esc(x)}">Cancelar</button></li>`).join('')}</ul>`;
  lista.innerHTML = html;
  let quitarUna = '';
  lista.onclick = async (e) => {
    const b = e.target.closest('button'); if(!b) return;
    try{
      if(b.dataset.retar){ SON.toque(); const c = await codigoNuevo(); cerrarPerfil(); entrarSala(c, { reto: b.dataset.retar }); return; }
      if(b.dataset.aceptar){ await aceptarAmigo(b.dataset.aceptar); aviso('¡Ya son amigos!', { tipo: 'bien', icono: 'img/iconos/checkmark.png' }); SON.rara(); }
      if(b.dataset.quitar){
        if(quitarUna !== b.dataset.quitar){ quitarUna = b.dataset.quitar; b.textContent = '¿Seguro?'; return; }
        await quitarAmigo(b.dataset.quitar);
      }
      pintarAmigos(caja, { soloRetar });
    }catch(x){ aviso(x.message, { tipo: 'mal', icono: 'img/iconos/exclamation.png' }); SON.error(); }
  };
}

/* ── LOS RETOS QUE TE LLEGAN ─────────────────────────────────────────────────
   Con cuenta, cada 15 s se pregunta si alguien te retó (y de paso cuenta como
   «en línea» para tus amigos). Un reto sale como notificación; tocarla entra. */
const retosVistos = new Set();
async function revisarRetos(){
  if(!cuenta() || document.visibilityState !== 'visible' || ['mesa', 'abrir'].includes(pantallaActual) || $('#hoja').classList.contains('ve')) return;
  try{
    const d = await amigos();
    const r = d.retos.find(x => !retosVistos.has(x.de + x.codigo));
    if(!r) return;
    retosVistos.add(r.de + r.codigo);
    const n = $('#notiReto'); $('#notiRetoTit').textContent = r.de + ' te reta a una partida';
    n.hidden = false; requestAnimationFrame(() => n.classList.add('ve')); SON.rara();
    clearTimeout(n._reloj); n._reloj = setTimeout(() => n.classList.remove('ve'), 15000);
    n.onclick = () => { n.classList.remove('ve'); borrarReto(r.de).catch(() => {}); entrarSala(r.codigo); };
  }catch(e){}
}
setInterval(revisarRetos, 15000); setTimeout(revisarRetos, 2500);
