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
import { SON, alternar, estaApagado } from './sonido.js';
import { aviso, pista, cumplida } from './avisos.js';

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
  const n = C.sobres.length;
  $('#globoSobres').hidden = !n; $('#globoSobres').textContent = n;
  $('#avisoSobres').hidden = !n;
  if(n){
    $('#avisoSobresTit').textContent = n === 1 ? 'Tienes un sobre sin abrir' : 'Tienes ' + n + ' sobres sin abrir';
    caraSobre(C.sobres[0].tipo, 200, 312).then(c => $('#avisoSobresImg').src = c.toDataURL('image/jpeg', .8));
  }
}
escuchar(pintarBarra); pintarBarra();
$('#bSonido').addEventListener('click', () => { const off = alternar(); $('#bSonido img').src = 'img/iconos/' + (off ? 'audioOff' : 'audioOn') + '.png'; });
$('#bSonido img').src = 'img/iconos/' + (estaApagado() ? 'audioOff' : 'audioOn') + '.png';

/* ── LAS PANTALLAS ───────────────────────────────────────────────────────── */
let pantallaActual = 'inicio';
function ir(p){
  if(p === 'jugar'){ irAJugar(); return; }
  pantallaActual = p;
  for(const m of $$('.pantalla')) m.classList.toggle('activa', m.dataset.p === p);
  for(const b of $$('#dock button')) b.classList.toggle('activo', b.dataset.ir === p);
  corral.visible = p === 'inicio';
  const abriendo = p === 'abrir';
  $('.barra').style.visibility = $('#dock').style.visibility = abriendo ? 'hidden' : '';
  if(p === 'tienda') pintarTienda();
  if(p === 'sobres') pintarMisSobres();
  if(p === 'coleccion') pintarColeccion();
  SON.toque();
}
$('#dock').addEventListener('click', (e) => { const b = e.target.closest('[data-ir]'); if(b) ir(b.dataset.ir); });
$('#avisoSobres').addEventListener('click', () => abrir(C.sobres[0]));

/* JUGAR: la mesa nueva va en la siguiente entrega; mientras, la de siempre. */
function irAJugar(){ location.href = '../'; }
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
  caja.innerHTML = '<div class="lista-sobres"></div>';
  const l = caja.firstChild;
  for(const s of C.sobres){
    const b = document.createElement('button'); b.dataset.id = s.id;
    b.innerHTML = `<img alt=""><span>${SOBRES[s.tipo].nombre}</span>`;
    l.appendChild(b);
    caraSobre(s.tipo, 240, 375).then(c => b.querySelector('img').src = c.toDataURL('image/jpeg', .82));
  }
  l.onclick = (e) => { const b = e.target.closest('[data-id]'); if(b) abrir(C.sobres.find(s => s.id === b.dataset.id)); };
}

/* ── ABRIR UN SOBRE ──────────────────────────────────────────────────────── */
function abrir(sobre){
  if(!sobre) return;
  ir('abrir');
  abrirSobre(sobre, { capa: $('#ui'), alTerminar: (salida) => {
    if(salida === 'otro' && C.sobres.length) return abrir(C.sobres[0]);
    ir(salida === 'coleccion' ? 'coleccion' : 'inicio');
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
  /* cosméticos, por clase; tocar uno que tienes te lo pones */
  const clases = Object.keys(CLASES_COSMETICO);
  if(!clases.includes(filtro)) filtro = 'avatar';
  const lista = COSMETICOS.filter(k => k.clase === filtro);
  const tiene = (k) => !!C.cosmeticos[k.id] || C.puesto[k.clase] === k.id || k.rareza === 'D' && ['av-pig', 'tp-madera', 'ms-pig', 'ds-autora'].includes(k.id);
  caja.innerHTML = `<div class="chips">${clases.map(c => `<button data-f="${c}" class="${filtro === c ? 'activo' : ''}">${CLASES_COSMETICO[c].nombre}</button>`).join('')}</div>
    <div class="album">${lista.map(k => `<button class="${tiene(k) ? '' : 'falta'}" data-cos="${k.id}"><img alt="" data-cara="${k.id}">${C.puesto[k.clase] === k.id ? '<span class="puesto">Puesto</span>' : ''}</button>`).join('')}</div>
    <p class="nota">Toca uno que tengas para ponértelo.</p>`;
  for(const im of $$('[data-cara]', caja)) caraCosmetico(im.dataset.cara).then(c => im.src = c.toDataURL('image/jpeg', .85));
  caja.querySelector('.chips').onclick = (e) => { const b = e.target.closest('[data-f]'); if(b){ filtro = b.dataset.f; SON.toque(); pintarColeccion(); } };
  caja.querySelector('.album').onclick = async (e) => {
    const b = e.target.closest('[data-cos]'); if(!b) return;
    const k = cosmetico(b.dataset.cos);
    if(!tiene(k)){ aviso('Todavía no lo tienes. Sale en los sobres.', { icono: 'img/iconos/locked.png' }); return; }
    C.puesto[k.clase] = k.id; guardar(); SON.rara();
    aviso('Te pusiste: ' + k.nombre, { tipo: 'bien', icono: 'img/iconos/checkmark.png' });
    if(k.clase === 'tapete') cambiarTapete(fondo, k.img);
    if(k.clase === 'mascota') ponerCerdos();
    pintarColeccion();
  };
}
function lupa(src, pie){
  const l = $('#lupa'); $('#lupaImg').src = src; $('#lupaPie').textContent = pie; l.classList.add('ve');
  l.onclick = () => l.classList.remove('ve');
}

/* Si llegó con un sobre de bienvenida, la primera cosa que se le enseña es ése. */
if(C.sobres.length) pista('sobre-inicio', $('#avisoSobres'), 'Abre tu primer sobre', { gesto: 'toca', veces: 2 });
window.__puercos = { C, CAT, ir, abrir };
