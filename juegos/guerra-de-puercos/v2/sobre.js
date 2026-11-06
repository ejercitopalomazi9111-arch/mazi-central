/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · ABRIR UN SOBRE
   ───────────────────────────────────────────────────────────────────────────
   El flujo, como lo dictó Carlos el 5 de noviembre:
     1. Se desliza el dedo (o el mouse) para ROMPER la parte de arriba.
     2. Se desliza HACIA ABAJO para sacar las cartas del sobre abierto.
     3. La carta de hasta abajo sube a la parte más alta: es la primera que se
        revisa.
     4. Al tocarla o deslizarla se VOLTEA y se va a la izquierda, a una mesa
        donde se acomodan por TIPO y RAREZA: puercos por rareza, soporte, y
        cosméticos por clase.

   A PRUEBA DE TONTOS, porque lo va a jugar gente con prisa y en un teléfono:
   · el rasgado acepta el dedo en cualquier parte del sobre y en los dos
     sentidos, y si se suelta pasada la mitad se termina solo;
   · si alguien toca en vez de deslizar, a la segunda se le enseña el gesto;
   · a la tercera, se rasga solo (nadie se queda trabado en un sobre);
   · lo que trae el sobre se COBRA en cuanto se rasga: cerrar la página a la
     mitad de la animación no pierde ninguna carta;
   · «Saltar» voltea todo de un jalón.
   ═══════════════════════════════════════════════════════════════════════════ */
import { THREE, E, carta, textura, texturaDeLienzo, precargar, ponerDorso, animar, esperar, sale, suave, entra, resorte, mezcla, cl,
         vista, aPantalla, aMundo, tocado, halo, chispas, cadaCuadro, CARTA_W, CARTA_H, alCambiarTamano } from './escena.js';
import { C, RAREZA, ORDEN_RAREZA, CLASES_COSMETICO, cosmetico } from './coleccion.js';
import { CAT, SOBRES, cobrarSobre, meterAlMazo } from './tienda.js';
import { caraSobre, tiraSobre, caraCosmetico, COLOR_RAREZA } from './caras.js';
import { liderDe, cartaVentaja } from './lideres.js';
import { SON } from './sonido.js';
import { inspeccionar } from './inspector.js';
import { aviso, pista, cumplida, quitarPista } from './avisos.js';

const SEG = 14;   /* en cuántos pedazos se rasga la tira */
/* EL SOBRE GORDITO (Carlos, 6 nov: «más fluffy, más gorditos, más pachoncitos… si no parecen láminas»): el frente
   y la espalda se inflan como almohada, y la orilla se ve. Una sola geometría para todos (no pesa). */
const ALTO_C = 1.5 - .17;
let geoAlmohada = null;
function almohada(){
  if(geoAlmohada) return geoAlmohada;
  const g = new THREE.PlaneGeometry(1, ALTO_C, 24, 30), p = g.attributes.position;
  for(let i = 0; i < p.count; i++){ const x = p.getX(i) * 2, y = p.getY(i) / (ALTO_C / 2); p.setZ(i, .2 * Math.pow(Math.max(0, 1 - x * x), .7) * Math.pow(Math.max(0, 1 - y * y), .45)); }
  g.computeVertexNormals(); return (geoAlmohada = g);
}
function cuerpoGordo(mat){
  const g = new THREE.Group(), frente = new THREE.Mesh(almohada(), mat), espalda = new THREE.Mesh(almohada(), new THREE.MeshStandardMaterial({ color: mat.color?.clone?.() || '#888', map: mat.map, metalness: .4, roughness: .45 }));
  espalda.rotation.y = Math.PI; espalda.material.color.multiplyScalar(.6); g.add(frente, espalda); frente.castShadow = true; return g;
}
/* las envolturas que alguien dejó tiradas en la mesa (se quedan mientras la app esté abierta) */
export const envolturas = [];
/* SIN PARPADEO (Carlos, 6 nov: «al guardar… se desaparecen todos los sobres de la mesa»): al pasar al siguiente
   sobre, la mesa de antes se queda pintada hasta que la nueva ya está armada, y entonces se quita. */
let anterior = null;
function quitarAnterior(){
  if(!anterior) return;
  const r = anterior; anterior = null;
  r.traverse(o => { if(o.geometry && o.geometry !== geoAlmohada && !o.geometry.parameters?.shapes) o.geometry.dispose?.(); });
  r.parent?.remove(r);
}
/* LETREROS EN LA MESA, EN 3D: antes eran de la página y quedaban ENCIMA de la carta que se abre (Carlos lo vio dos
   veces). Pintados en la mesa, la carta que vuela por arriba los tapa como en la vida real. */
function letrero(texto, color, { alto = .24, fondo = null } = {}){
  const lz = document.createElement('canvas'), x = lz.getContext('2d'), px = 64;
  x.font = `${px}px Lilita, sans-serif`;
  const w = Math.ceil(x.measureText(texto).width) + (fondo ? px * .9 : px * .3);
  lz.width = w; lz.height = Math.round(px * 1.35);
  x.font = `${px}px Lilita, sans-serif`; x.textBaseline = 'middle'; x.textAlign = 'center';
  if(fondo){ x.fillStyle = fondo; const r = lz.height / 2; x.beginPath(); x.roundRect(2, 2, w - 4, lz.height - 4, r); x.fill(); x.lineWidth = 5; x.strokeStyle = '#1B0E16'; x.stroke(); }
  else { x.lineWidth = 12; x.strokeStyle = 'rgba(15,6,10,.9)'; x.lineJoin = 'round'; x.strokeText(texto, w / 2, lz.height / 2 + 3); }
  x.fillStyle = color; x.fillText(texto, w / 2, lz.height / 2 + 3);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(alto * w / lz.height, alto), new THREE.MeshBasicMaterial({ map: texturaDeLienzo(lz), transparent: true, depthWrite: false }));
  m.userData.ancho = alto * w / lz.height;
  return m;
}
/* rayos de luz detrás de lo bueno (legendarias, épicas y líderes) */
let texRayos = null;
function rayos(color, tam){
  if(!texRayos){
    const lz = document.createElement('canvas'); lz.width = lz.height = 512; const x = lz.getContext('2d');
    x.translate(256, 256);
    for(let i = 0; i < 18; i++){ x.rotate(Math.PI * 2 / 18); const g = x.createLinearGradient(0, 0, 0, -256); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(-6, 0); x.lineTo(-30, -256); x.lineTo(30, -256); x.lineTo(6, 0); x.fill(); }
    texRayos = texturaDeLienzo(lz);
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(tam, tam), new THREE.MeshBasicMaterial({ map: texRayos, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
}
/* el letrerote que sale cuando toca algo chido */
function anunciar(dom, texto, color){
  const n = document.createElement('div'); n.className = 'abrir__chido'; n.style.setProperty('--c', color); n.textContent = texto;
  dom.appendChild(n); requestAnimationFrame(() => n.classList.add('ve'));
  setTimeout(() => n.classList.add('sale'), 1500); setTimeout(() => n.remove(), 2100);
  const f = document.createElement('div'); f.className = 'abrir__destello'; f.style.setProperty('--c', color); dom.appendChild(f); setTimeout(() => f.remove(), 700);
}

/* El grupo en la mesa de la izquierda al que va cada cosa, y su orden. */
function grupoDe(x){
  if(x.tipo === 'lider') return { k: 'lider', orden: -1, titulo: 'Puerco líder', color: '#E8B923' };
  if(x.tipo === 'puerco') return { k: 'p' + x.nivel, orden: ORDEN_RAREZA.indexOf(x.nivel), titulo: 'Puercos · ' + RAREZA[x.nivel], color: COLOR_RAREZA[x.nivel] };
  if(x.tipo === 'soporte') return { k: 'soporte', orden: 6, titulo: 'Soporte', color: COLOR_RAREZA.ESP };
  const clases = Object.keys(CLASES_COSMETICO);
  return { k: 'c-' + x.clase, orden: 7 + clases.indexOf(x.clase), titulo: 'Cosméticos · ' + CLASES_COSMETICO[x.clase].nombre, color: '#FFF0F6' };
}
function detalleDe(x){
  if(x.tipo === 'lider'){ const l = liderDe(x.id); return l ? l.nombre + ' · ' + l.ventaja : ''; }
  if(x.tipo === 'puerco'){ const f = CAT.puercos.find(f => f.nombre + '·' + f.puntos === x.llave); return f ? f.nombre + ' · ' + f.puntos + ' pts' : ''; }
  if(x.tipo === 'soporte') return x.esp === 'bono' ? 'Alcancía · +5 a tu carta' : 'Carnitas · −5 a la del rival';
  const k = cosmetico(x.id); return k ? k.nombre : '';
}
async function frenteDe(x){
  if(x.tipo === 'lider') return textura(cartaVentaja(liderDe(x.id)));
  if(x.tipo === 'puerco'){ const f = CAT.puercos.find(f => f.nombre + '·' + f.puntos === x.llave); return textura(f.arte); }
  if(x.tipo === 'soporte') return textura((x.esp === 'bono' ? CAT.bono : CAT.castigo).arte);
  return texturaDeLienzo(await caraCosmetico(x.id));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export async function abrirSobre(sobre, { capa, alTerminar }){
  const tipo = SOBRES[sobre.tipo] || SOBRES.chico;
  const raiz = new THREE.Group(); E.s.add(raiz);
  const dom = document.createElement('div'); dom.className = 'abrir'; capa.appendChild(dom);
  dom.innerHTML = `
    <div class="abrir__toque" data-toque></div>
    <button class="btn-chico abrir__saltar" data-saltar hidden>Saltar</button>
    <button class="btn-chico abrir__salir" data-salir hidden>Volver</button>
    <div class="abrir__rotulos" data-rotulos></div>
    <div class="abrir__ficha" data-ficha hidden></div>
    <div class="abrir__fin" data-fin hidden></div>
    <div class="abrir__pila" data-pila hidden></div>
    <div class="abrir__bote" data-bote hidden><img alt="" src="img/iconos/trashcan.png"><span>Suelta aquí para tirarla</span></div>
    <div class="abrir__zoom" data-zoom hidden></div>`;
  const $ = (s) => dom.querySelector(s);
  const limpieza = [];
  const fin = $('[data-fin]');

  /* ── EL ACOMODO · se recalcula si gira el teléfono ── */
  const L = {};
  /* ¿dónde lo abre? (Carlos: «que pueda decidir dónde abrirlo en mi pantalla o abrirlo en el centro»). Después de
     la primera carta, la pila se recorre a la izquierda y lo que sale se acomoda a la derecha. */
  let abrirEn = null, pilaRecorrida = false;
  function acomodar(){
    const v = vista(0), vertical = E.ancho < E.alto;
    L.pw = Math.min(vertical ? v.ancho * .44 : v.alto * .4, 3.2);
    L.ph = L.pw * 1.5; L.tira = L.pw * .17;
    /* LA MESA (Carlos, 6 nov): a la izquierda el montón y el sobre que abres; lo que sale, a la derecha */
    L.pxIzq = vertical ? -v.ancho * .5 + L.pw / 2 + v.ancho * .05 : -v.ancho * .2;
    L.pyIzq = vertical ? v.alto * .02 : 0;
    const enX = (x) => cl(x, -v.ancho / 2 + L.pw / 2 + .1, v.ancho / 2 - L.pw / 2 - .1), enY = (y) => cl(y, -v.alto / 2 + L.ph / 2 + .4, v.alto / 2 - L.ph / 2 - .9);
    L.px = pilaRecorrida ? L.pxIzq : abrirEn ? enX(abrirEn.x) : 0;
    L.py = pilaRecorrida ? L.pyIzq : abrirEn ? enY(abrirEn.y) : L.pyIzq;
    L.esc = L.pw * .82;                      /* las cartas dentro del sobre */
    /* la carta que se revela, GRANDE y al centro (antes se volteaba del tamaño
       del sobre; Carlos: «no hagas tan pequeñas las cartas al salir») */
    L.grande = vertical ? Math.min(v.ancho * .74 / CARTA_W, v.alto * .5 / CARTA_H) : Math.min(v.alto * .62 / CARTA_H, v.ancho * .3 / CARTA_W);
    L.gx = vertical ? 0 : v.ancho * .12; L.gy = vertical ? v.alto * .04 : 0;
    /* La mesa de resultados: de la orilla izquierda hasta antes del sobre. */
    L.mx0 = L.pxIzq + L.pw / 2 + .2; L.mx1 = v.ancho / 2 - .18;
    /* el montón de sobres, abajo a la izquierda, chiquitos y gorditos; y donde cae la envoltura abierta */
    L.ps = L.pw * .5; L.pilaX = -v.ancho / 2 + L.ps * .62 + .15; L.pilaY = -v.alto / 2 + L.ps * .8 + (vertical ? .55 : .35);
    L.envX = L.pilaX + .08; L.envY = L.pilaY + L.ps * (vertical ? 1.75 : 1.6);
    L.my0 = v.alto / 2 - (vertical ? 1.5 : .8);
    L.v = v; L.vertical = vertical;
  }
  acomodar();

  /* las caras de lo que trae se bajan ANTES de enseñar el sobre */
  await precargar(sobre.salen.map(x => x.tipo === 'puerco' ? CAT.puercos.find(f => f.nombre + '·' + f.puntos === x.llave)?.arte
    : x.tipo === 'soporte' ? (x.esp === 'bono' ? CAT.bono : CAT.castigo).arte : null));

  /* Los sobres que siguen, amontonados en la esquina: se ven mientras abres
     éste, y al terminar se abre el de arriba (Carlos, 5 nov). */
  /* EL MONTÓN, EN LA MESA (Carlos, 6 nov): los sobres que tienes, uno encima del otro, gorditos, abajo a la
     izquierda; se ven a lo más 9 (nadie junta un millón, y así no pesa) y el número dice cuántos son. Y las
     envolturas que dejaste tiradas siguen ahí. */
  const pila = $('[data-pila]'), montonG = new THREE.Group(), tiradasG = new THREE.Group(); raiz.add(montonG, tiradasG);
  const matsPorTipo = {};
  const matDe = (t) => matsPorTipo[t] ||= (() => { const m = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: .45, roughness: .3, envMapIntensity: 1.4 });
    caraSobre(t, 320, 500).then(c => { m.map = texturaDeLienzo(c); m.needsUpdate = true; }); return m; })();
  const desfase = (k) => ({ x: Math.sin(k * 2.3) * .05 + k * .015, y: k * .07, z: .02 + k * .03, r: Math.sin(k * 1.7) * .08 });
  function pintarMonton3d(){
    montonG.clear();
    const otros = C.sobres.filter(x => x.id !== sobre.id).slice(0, 9).reverse();
    otros.forEach((x, k) => { const g = cuerpoGordo(matDe(x.tipo)), d = desfase(k); g.scale.setScalar(L.ps); g.position.set(L.pilaX + d.x, L.pilaY + d.y, d.z); g.rotation.z = d.r; montonG.add(g); });
    const n = C.sobres.filter(x => x.id !== sobre.id).length;
    pila.hidden = true; globalThis.__abrirMonton = n;
    if(!n) return;
    const b = letrero('×' + n, '#1B0E16', { alto: .3, fondo: '#E94F95' });
    b.position.set(L.pilaX + L.ps * .42, L.pilaY + L.ps * ALTO_C / 2 + otros.length * .07, .33); montonG.add(b);
  }
  function pintarTiradas(){
    tiradasG.clear();
    for(const t of envolturas){ const g = cuerpoGordo(matDe(t.tipo)); g.scale.set(L.ps * 1.05, L.ps * .92, L.ps); g.position.set(t.x, t.y, .1); g.rotation.set(-.25, 0, t.rz);
      const boca = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshBasicMaterial({ color: '#0d0609', transparent: true, opacity: .75 })); boca.scale.set(.92, .12, 1); boca.position.set(0, ALTO_C / 2 - .03, .22); g.add(boca);
      g.userData.envoltura = t; tiradasG.add(g); }
  }
  pintarMonton3d(); pintarTiradas();

  /* LA BASURA SE AGARRA Y SE AVIENTA (Carlos, 6 nov: «si hay basura, que se pueda tomar y aventar por ahí»), en el
     montón y al final: se arrastra con el dedo; si se suelta con vuelo, sale disparada, rebota en las orillas y se
     frena sola; si se suelta en el bote, se va. Sirve igual para la envoltura del sobre que acabas de abrir. */
  const bote = $('[data-bote]');
  let agarrada = null;
  const raizEnv = (o) => { while(o.parent && o.parent !== raiz && o.parent !== tiradasG) o = o.parent; return o; };
  const env = {
    empieza(e){
      const objetivos = [...tiradasG.children]; if(envolturaEnMesa && sobreG.parent) objetivos.push(sobreG);
      const hw = objetivos.length && tocado(e.clientX, e.clientY, objetivos);
      if(!hw) return false;
      const g = raizEnv(hw.object); g.userData.vuela = null;
      agarrada = { g, x: e.clientX, y: e.clientY, movio: false, rastro: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
      $('[data-toque]').setPointerCapture?.(e.pointerId); quitarPista();
      return true;
    },
    mueve(e){
      if(!agarrada) return false;
      const a = agarrada;
      a.rastro.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if(a.rastro.length > 6) a.rastro.shift();
      if(!a.movio && Math.hypot(e.clientX - a.x, e.clientY - a.y) < 8) return true;
      if(!a.movio){ a.movio = true; bote.hidden = false; fin.classList.add('tenue'); requestAnimationFrame(() => bote.classList.add('ve')); SON.saca?.(); }
      const p = aMundo(e.clientX, e.clientY, a.g.position.z); a.g.position.x = p.x; a.g.position.y = p.y; a.g.position.z = .5;
      const r = bote.getBoundingClientRect();
      bote.classList.toggle('encima', e.clientX > r.left - 20 && e.clientX < r.right + 20 && e.clientY > r.top - 20 && e.clientY < r.bottom + 20);
      return true;
    },
    suelta(){
      if(!agarrada) return false;
      const a = agarrada; agarrada = null;
      { const t = a.g.userData.envoltura; if(t){ t.x = a.g.position.x; t.y = a.g.position.y; } }
      const encima = bote.classList.contains('encima');
      bote.classList.remove('ve', 'encima'); fin.classList.remove('tenue'); setTimeout(() => { if(!agarrada) bote.hidden = true; }, 200);
      if(!a.movio) return true;
      if(encima){
        SON.aterriza?.();
        const g = a.g, s0 = g.scale.clone();
        animar({ dur: .3, ease: entra, cada: (u) => { g.scale.copy(s0).multiplyScalar(1 - u); g.rotation.z += .08; } }).then(() => {
          g.parent?.remove(g); if(g === sobreG) envolturaEnMesa = false;
          const t = g.userData.envoltura; if(t) envolturas.splice(envolturas.indexOf(t), 1); });
        return true;
      }
      /* el vuelo: la velocidad de los últimos ~80 ms del dedo */
      const r = a.rastro, u0 = r[0], u1 = r[r.length - 1], dt = Math.max(16, u1.t - u0.t) / 1000;
      const k = L.v.ancho / E.ancho;
      a.g.userData.vuela = { vx: (u1.x - u0.x) / dt * k, vy: -(u1.y - u0.y) / dt * k, giro: (Math.random() - .5) * 8 };
      return true;
    },
  };
  /* la física de lo aventado: avanza, rebota en las orillas, gira y se frena */
  limpieza.push(cadaCuadro((dt) => {
    for(const g of [...tiradasG.children, ...raiz.children]){   /* raiz trae al sobre abierto (sobreG) cuando ya existe */
      const v = g.userData.vuela; if(!v) continue;
      const lim = { x: L.v.ancho / 2 - L.ps * .45, y: L.v.alto / 2 - L.ps * .6 };
      g.position.x += v.vx * dt; g.position.y += v.vy * dt; g.rotation.z += v.giro * dt;
      if(Math.abs(g.position.x) > lim.x){ g.position.x = Math.sign(g.position.x) * lim.x; v.vx *= -.6; SON.toque?.(); }
      if(Math.abs(g.position.y) > lim.y){ g.position.y = Math.sign(g.position.y) * lim.y; v.vy *= -.6; SON.toque?.(); }
      const f = Math.pow(.05, dt); v.vx *= f; v.vy *= f; v.giro *= f;
      const t = g.userData.envoltura; if(t){ t.x = g.position.x; t.y = g.position.y; t.rz = g.rotation.z; }
      if(Math.hypot(v.vx, v.vy) < .08){ g.userData.vuela = null; g.position.z = g.parent === tiradasG ? .1 : .15; }
    }
  }));

  /* ── EL SOBRE: cuerpo inflado y la tira en pedazos ── */
  const [cara, tira] = await Promise.all([caraSobre(sobre.tipo), tiraSobre(sobre.tipo)]);
  const texCara = texturaDeLienzo(cara), texTira = texturaDeLienzo(tira);
  const matSobre = new THREE.MeshStandardMaterial({ map: texCara, metalness: .45, roughness: .3, envMapIntensity: 1.4 });
  const cuerpo = cuerpoGordo(matSobre);
  const sobreG = new THREE.Group(); sobreG.add(cuerpo); raiz.add(sobreG);
  const pedazos = [];
  for(let i = 0; i < SEG; i++){
    const g = new THREE.PlaneGeometry(1 / SEG, .17, 1, 1), uv = g.attributes.uv;
    for(let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / SEG);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: texTira, metalness: .45, roughness: .3, envMapIntensity: 1.4, transparent: true }));
    const piv = new THREE.Group(); piv.add(m); m.position.y = .17 / 2;
    piv.position.set(-.5 + (i + .5) / SEG, ALTO_C / 2, .02);
    sobreG.add(piv); pedazos.push({ piv, m, u: 0 });
  }
  function ponerSobre(){ sobreG.scale.setScalar(L.pw); sobreG.position.set(L.px, L.py, .4); }
  ponerSobre();

  /* ── LAS CARTAS, dentro del sobre, boca abajo ── */
  const dorsoUrl = (cosmetico(C.puesto.dorso) || cosmetico('ds-autora')).img;
  const texDorso = textura(dorsoUrl);
  const items = sobre.salen.map((x, i) => ({ x, i, g: grupoDe(x), c: null }));
  for(const it of items){
    it.c = carta(null, texDorso); it.c.rotation.y = Math.PI; it.c.scale.setScalar(L.esc);
    raiz.add(it.c);
    frenteDe(it.x).then(t => { const m = it.c.userData.mf; m.map = t; m.color.set('#fff'); m.needsUpdate = true; });
  }
  /* El montón: la de índice 0 es la de hasta ARRIBA (la primera que se ve). */
  let monton = items.slice();
  function ponerMonton(anim = false){
    monton.forEach((it, k) => {
      const z = .3 - k * .035, y = L.py + .05 - k * .025;
      if(anim) animar({ dur: .35, cada: (u) => { it.c.position.lerp(new THREE.Vector3(L.px, y, z), u); } });
      else it.c.position.set(L.px, y, z);
    });
  }
  ponerMonton();
  for(const it of items) it.c.visible = false;     /* hasta que se abra el sobre */

  const quitarAcomodo = alCambiarTamano(() => { acomodar(); if(fin && !fin.hidden){ L.final = true; L.mx0 = -L.v.ancho / 2 + .25; } if(estado === 'cerrado' || estado === 'rasgando' || estado === 'abierto') ponerSobre(); pintarMonton3d(); pintarTiradas(); if(estado === 'revisando') ponerMonton(); acomodarMesa(); });
  limpieza.push(quitarAcomodo);

  /* El sobre flota y brilla mientras espera. */
  let t0 = 0, estado = 'llega', envolturaEnMesa = false;
  limpieza.push(cadaCuadro((dt, t) => {
    t0 = t;
    if(estado === 'cerrado' || estado === 'rasgando'){
      sobreG.rotation.y = Math.sin(t * .8) * .09; sobreG.rotation.x = Math.sin(t * .6) * .04;
      sobreG.position.y = L.py + Math.sin(t * 1.3) * .04;
    }
  }));

  /* Espera arriba del montón: tocarlo lo AGARRA y lo trae al centro de la mesa */
  { const k = Math.min(9, C.sobres.filter(x => x.id !== sobre.id).length), d = desfase(k);
    sobreG.scale.setScalar(L.ps); sobreG.position.set(L.pilaX + d.x, L.pilaY + d.y, d.z + .05); sobreG.rotation.z = d.r;
    estado = 'en-pila';
    pista('agarrar', aPantalla(sobreG.position), 'Tócalo o arrástralo a donde quieras', { gesto: 'toca', veces: 3 });
    const toque = $('[data-toque]'), salir = $('[data-salir]'); salir.hidden = false;
    quitarAnterior();
    const que = await new Promise((ok) => {
      let ag = null;
      toque.onpointerdown = (e) => {
        const hp = tocado(e.clientX, e.clientY, [sobreG, montonG]), hb = tiradasG.children.length && tocado(e.clientX, e.clientY, tiradasG.children);
        if(hb && (!hp || hb.distance < hp.distance)){ env.empieza(e); return; }
        if(!hp) return; ag = { x: e.clientX, y: e.clientY, movio: false }; toque.setPointerCapture?.(e.pointerId); quitarPista(); };
      toque.onpointermove = (e) => {
        if(env.mueve(e)) return;
        if(!ag) return;
        if(!ag.movio && Math.hypot(e.clientX - ag.x, e.clientY - ag.y) < 12) return;
        ag.movio = true; const p = aMundo(e.clientX, e.clientY, .9);
        sobreG.position.set(p.x, p.y, .9); sobreG.scale.setScalar(mezcla(sobreG.scale.x, L.pw * .8, .2)); sobreG.rotation.z *= .85;
      };
      toque.onpointerup = toque.onpointercancel = (e) => {
        if(env.suelta(e)) return;
        if(!ag) return;
        const fue = ag; ag = null; toque.onpointerdown = toque.onpointermove = toque.onpointerup = toque.onpointercancel = null;
        if(fue.movio){ const p = aMundo(e.clientX, e.clientY, .4); abrirEn = { x: p.x, y: p.y }; } else abrirEn = null;
        ok('abrir');
      };
      salir.onclick = () => { toque.onpointerdown = toque.onpointermove = toque.onpointerup = null; ok('volver'); };
    });
    salir.hidden = true;
    acomodar(); ponerMonton();
    if(que === 'volver'){ SON.toque(); cerrar(); alTerminar && alTerminar('volver'); return; }
    cumplida('agarrar'); quitarPista(); SON.saca?.();
    const p0 = sobreG.position.clone(), r0 = sobreG.rotation.z;
    await animar({ dur: .6, ease: suave, cada: (u) => { const arco = Math.sin(u * Math.PI);
      sobreG.position.set(mezcla(p0.x, L.px, u), mezcla(p0.y, L.py, u) + arco * .4, mezcla(p0.z, .4, u) + arco * 1.2);
      sobreG.scale.setScalar(mezcla(L.ps, L.pw, u)); sobreG.rotation.z = mezcla(r0, 0, u); sobreG.rotation.x = arco * -.35; } });
    sobreG.rotation.x = 0; }
  estado = 'cerrado';
  const enPantalla = (p) => aPantalla(new THREE.Vector3(p.x, p.y, p.z));
  const puntoTira = () => enPantalla(new THREE.Vector3(L.px - L.pw * .3, L.py + L.ph / 2 - L.tira / 2, .5));
  pista('rasgar', puntoTira(), 'Desliza el dedo por la tira para abrirlo', { gesto: 'desliza-der', veces: 4 });

  /* ═══ 1 · RASGAR ═══ */
  let tocadas = 0, rasgado = 0;
  const pintarRasgado = (p) => {
    pedazos.forEach((q, i) => {
      const borde = p * SEG - i, u = cl(borde);
      q.u = u;
      /* hacia la cámara (+x), no hacia atrás: Carlos, 5 nov, «en lugar de que quede atrás del sobre» */
      q.piv.rotation.x = u * 1.15; q.piv.rotation.z = u * .12; q.piv.position.z = .03 + u * .08;
    });
  };
  const capaToque = $('[data-toque]');
  await new Promise((listo) => {
    let x0 = null, ultimo = 0;
    const terminar = async () => {
      capaToque.onpointerdown = capaToque.onpointermove = capaToque.onpointerup = capaToque.onpointercancel = null;
      cumplida('rasgar'); quitarPista();
      estado = 'abriendo';
      await animar({ dur: .25, cada: (u) => pintarRasgado(mezcla(rasgado, 1, u)) });
      SON.abre();
      chispas(new THREE.Vector3(L.px, L.py + L.ph / 2, .6), { color: '#FFF0F6', cuantas: 50, fuerza: 2.5 });
      /* La tira rota se queda colgando AL FRENTE, enroscada, pegada a la
         esquina, y se va con el sobre cuando se jala hacia abajo («que se
         vaya con lo demás»). */
      animar({ dur: .45, ease: resorte, cada: (u) => { pedazos.forEach((q, i) => {
        const k = i / (SEG - 1);
        q.piv.rotation.x = mezcla(1.15, 1.05 + (1 - k) * .9, u); q.piv.rotation.z = mezcla(.12, (1 - k) * -.35, u);
        q.piv.position.z = mezcla(.11, .06 + (1 - k) * .1, u); } ); } });
      listo();
    };
    capaToque.onpointerdown = (e) => {
      const hit = tocado(e.clientX, e.clientY, [sobreG]);
      x0 = { x: e.clientX, y: e.clientY, hit: !!hit, movio: false };
      capaToque.setPointerCapture?.(e.pointerId);
    };
    capaToque.onpointermove = (e) => {
      if(!x0) return;
      const dx = Math.abs(e.clientX - x0.x), anchoPx = Math.max(80, L.pw / L.v.ancho * E.ancho);
      if(dx > 6) x0.movio = true;
      const p = cl(dx / (anchoPx * .85));
      if(p > rasgado){
        if(Math.floor(p * SEG) > Math.floor(rasgado * SEG) && performance.now() - ultimo > 40){ SON.rasga(p); ultimo = performance.now(); }
        rasgado = p; estado = 'rasgando'; pintarRasgado(rasgado);
      }
      if(rasgado >= .92) { x0 = null; terminar(); }
    };
    capaToque.onpointerup = capaToque.onpointercancel = () => {
      if(!x0) return;
      const fue = x0; x0 = null;
      if(rasgado >= .5){ terminar(); return; }
      if(!fue.movio && fue.hit){
        tocadas++;
        if(tocadas === 2) aviso('Desliza, no toques: pasa el dedo de lado a lado', { icono: 'img/gestos/touch_swipe_right.png' });
        if(tocadas >= 3){ rasgado = .55; terminar(); return; }
      }
      /* se soltó antes de la mitad: la tira regresa */
      const desde = rasgado; rasgado = 0;
      animar({ dur: .3, cada: (u) => pintarRasgado(mezcla(desde, 0, u)) }).then(() => estado = 'cerrado');
    };
  });

  /* Se cobra AQUÍ: en cuanto el sobre está roto, lo que trae ya es tuyo. */
  const cobro = cobrarSobre(sobre.id) || sobre.salen.map(x => ({ ...x, nueva: true, vuelven: 0 }));
  items.forEach((it, i) => { it.r = cobro[i]; });
  const devueltas = cobro.reduce((s, x) => s + (x.vuelven | 0), 0);

  /* ═══ 2 · SACAR LAS CARTAS (deslizar hacia abajo) ═══ */
  for(const it of items) it.c.visible = true;
  estado = 'abierto';
  await esperar(.25);
  pista('sacar', enPantalla(new THREE.Vector3(L.px, L.py, .5)), 'Ahora desliza hacia abajo para sacar las cartas', { gesto: 'desliza-abajo', veces: 4 });
  await new Promise((listo) => {
    let y0 = null, tiempo0 = 0, bajado = 0;
    const altoPx = () => L.ph / L.v.alto * E.alto;
    const fuera = async () => {
      capaToque.onpointerdown = capaToque.onpointermove = capaToque.onpointerup = capaToque.onpointercancel = null;
      cumplida('sacar'); quitarPista(); SON.saca();
      const desde = sobreG.position.y;
      /* las cartas saltan fuera del sobre en abanico mientras él se va */
      const sube = items.map((it, k) => ({ it, p0: it.c.position.clone(), dx: (k - (items.length - 1) / 2) * .18, r: (k - (items.length - 1) / 2) * .12 }));
      chispas(new THREE.Vector3(L.px, L.py + L.ph * .35, .8), { color: '#FFF0F6', cuantas: 60, fuerza: 3 });
      /* la envoltura ya no se va de la pantalla: cae ABIERTA, reventada, junto al montón (se tira al bote después) */
      const boca = new THREE.Mesh(new THREE.CircleGeometry(.5, 24), new THREE.MeshBasicMaterial({ color: '#0d0609', transparent: true, opacity: .75 })); boca.scale.set(.92, .12, 1); boca.position.set(0, ALTO_C / 2 - .03, .22); sobreG.add(boca);
      const x0 = sobreG.position.x, s0 = sobreG.scale.x;
      await Promise.all([
        animar({ dur: .6, ease: suave, cada: (u) => { sobreG.position.set(mezcla(x0, L.envX, u), mezcla(desde, L.envY, u) + Math.sin(u * Math.PI) * .5, mezcla(.4, .15, u)); sobreG.scale.set(mezcla(s0, L.ps * 1.05, u), mezcla(s0, L.ps * .92, u), mezcla(s0, L.ps, u)); sobreG.rotation.set(-.25 * u, 0, u * .35); } }),
        animar({ dur: .55, ease: resorte, cada: (u) => { for(const w of sube){ w.it.c.position.set(w.p0.x + w.dx * Math.sin(u * Math.PI), w.p0.y + Math.sin(u * Math.PI) * .7, w.p0.z + u * .2); w.it.c.rotation.z = w.r * Math.sin(u * Math.PI); } } }),
      ]);
      for(const w of sube) w.it.c.rotation.z = 0;
      estado = 'tirado'; envolturaEnMesa = true;
      listo();
    };
    capaToque.onpointerdown = (e) => { y0 = e.clientY; tiempo0 = performance.now(); capaToque.setPointerCapture?.(e.pointerId); };
    capaToque.onpointermove = (e) => {
      if(y0 == null) return;
      bajado = cl((e.clientY - y0) / altoPx(), 0, 1);
      sobreG.position.y = L.py - bajado * L.ph * .9;
      if(bajado > .6){ y0 = null; fuera(); }
    };
    capaToque.onpointerup = capaToque.onpointercancel = (e) => {
      if(y0 == null) return;
      const rapido = (e.clientY - y0) / Math.max(1, performance.now() - tiempo0) > .6;   /* un jalón corto y rápido también cuenta */
      y0 = null;
      if(bajado > .28 || rapido){ fuera(); return; }
      if(bajado < .02){ tocadas++; if(tocadas >= 5){ fuera(); return; } }
      const desde = sobreG.position.y;
      animar({ dur: .3, ease: resorte, cada: (u) => { sobreG.position.y = mezcla(desde, L.py, u); } });
      bajado = 0;
    };
  });

  /* ═══ 3 y 4 · REVISAR UNA POR UNA ═══ */
  estado = 'revisando';
  ponerMonton(true);
  $('[data-saltar]').hidden = false;
  let saltar = false;
  $('[data-saltar]').onclick = () => { saltar = true; SON.toque(); };

  /* La mesa de la izquierda: una fila por grupo, en el orden fijo. */
  const grupos = [...new Map(items.map(it => [it.g.k, it.g])).values()].sort((a, b) => a.orden - b.orden);
  const enMesa = Object.fromEntries(grupos.map(g => [g.k, []]));
  const rotulos = $('[data-rotulos]');
  for(const g of grupos){ g.malla = letrero(g.titulo, g.color, { alto: L.vertical ? .2 : .24 }); g.malla.visible = false; raiz.add(g.malla); }
  function lugarEnMesa(g, k, total){
    const filas = grupos.length, ancho = Math.max(.6, L.mx1 - L.mx0);
    const maxEnFila = Math.max(...grupos.map(x => items.filter(it => it.g.k === x.k).length));
    /* al final la mesa usa todo el ancho y deja abajo el lugar del resumen */
    /* al final la mesa usa todo el ancho, arriba del resumen (que va abajo a la derecha) y del montón (abajo a la izquierda) */
    const piso = -L.v.alto / 2 + (L.final ? (L.vertical ? L.v.alto * .5 : L.v.alto * .3) : .35);
    const espacioFila = Math.min(L.vertical ? 1.7 : 2.1, (L.my0 - piso) / filas);
    const sAlto = (espacioFila - .48) / CARTA_H, sAncho = ancho / (1 + (maxEnFila - 1) * .55);
    const s = Math.max(.22, Math.min(L.vertical ? .62 : 1.05, sAlto, sAncho));
    const fila = grupos.indexOf(g);
    const y = L.my0 - .3 - fila * espacioFila - CARTA_H * s / 2;
    const x = L.mx0 + CARTA_W * s / 2 + k * CARTA_W * s * .55;
    return { pos: new THREE.Vector3(x, y, .05 + k * .02), s, yRot: L.my0 - .08 - fila * espacioFila };
  }
  /* AL FINAL, las cartas se extienden GRANDES en una rejilla arriba (para verlas y tocarlas), ordenadas por rareza */
  function lugarFinal(it){
    const orden = grupos.flatMap(g => enMesa[g.k]), n = orden.length, k = orden.indexOf(it);
    const cols = n <= 3 ? n : 3, filas = Math.ceil(n / cols);
    const techo = L.v.alto / 2 - (L.vertical ? 1.05 : .75), piso = -L.v.alto / 2 + (L.vertical ? L.v.alto * .5 : L.v.alto * .3);
    const ancho = L.v.ancho - .5, alto = techo - piso;
    const s = Math.min((ancho / cols - .18) / CARTA_W, (alto / filas - .18) / CARTA_H, L.vertical ? 1.3 : 1.6);
    const fila = Math.floor(k / cols), enFila = Math.min(cols, n - fila * cols), col = k - fila * cols;
    const x = (col - (enFila - 1) / 2) * (ancho / cols), y = techo - (fila + .5) * (alto / filas);
    return { pos: new THREE.Vector3(x, y, .05 + k * .02), s };
  }
  function acomodarMesa(anim = false){
    if(L.final){
      for(const g of grupos) g.malla.visible = false;
      for(const g of grupos) enMesa[g.k].forEach((it, k) => { const l = lugarFinal(it);
        if(!anim){ it.c.position.copy(l.pos); it.c.scale.setScalar(l.s); return; }
        const p0 = it.c.position.clone(), s0 = it.c.scale.x;
        animar({ dur: .55, retraso: k * .05, ease: sale, cada: (u) => { it.c.position.lerpVectors(p0, l.pos, u); it.c.scale.setScalar(mezcla(s0, l.s, u)); } }); });
      return;
    }
    for(const g of grupos){
      const lista = enMesa[g.k];
      lista.forEach((it, k) => { const l = lugarEnMesa(g, k, lista.length);
        if(!anim){ it.c.position.copy(l.pos); it.c.scale.setScalar(l.s); return; }
        const p0 = it.c.position.clone(), s0 = it.c.scale.x;
        animar({ dur: .55, retraso: k * .05, cada: (u) => { it.c.position.lerpVectors(p0, l.pos, u); it.c.scale.setScalar(mezcla(s0, l.s, u)); } }); });
      const l = lugarEnMesa(g, 0, 1), p = aPantalla(new THREE.Vector3(L.mx0, l.yRot, 0));
      const cabe = Math.min(1, (L.mx1 - L.mx0) / g.malla.userData.ancho); g.malla.scale.setScalar(cabe);
      g.malla.position.set(L.mx0 + g.malla.userData.ancho * cabe / 2, l.yRot - .1, .03); void p;
    }
  }
  acomodarMesa();

  const ficha = $('[data-ficha]');
  function enseñarFicha(it){
    const r = it.r, x = it.x;
    const etiqueta = x.tipo === 'lider' ? 'Puerco líder' : x.tipo === 'puerco' ? RAREZA[x.nivel] : x.tipo === 'soporte' ? 'Soporte' : CLASES_COSMETICO[x.clase].una;
    ficha.innerHTML = `<b class="abrir__tipo" style="--c:${it.g.color}">${etiqueta}</b><span>${detalleDe(x)}</span>`
      + (r.nueva ? '<em class="nueva">¡Nueva!</em>' : `<em class="repe">Repetida · +${r.vuelven} monedas</em>`);
    const p = aPantalla(new THREE.Vector3(L.gx, L.gy - CARTA_H * L.grande / 2 - .12, 1.2));
    ficha.style.left = p.x + 'px'; ficha.style.top = p.y + 'px';
    ficha.hidden = false; ficha.classList.remove('ve'); void ficha.offsetWidth; ficha.classList.add('ve');
  }

  let primera = true, apurado = false;
  while(monton.length){
    /* Sólo la PRIMERA: la de hasta abajo sube a la parte más alta. Las demás se toman de arriba, sin barajar
       (Carlos, 6 nov: «cada carta que tomo se manda la de hasta atrás hasta el frente y eso molesta»). */
    const it = primera ? monton.pop() : monton.shift();
    if(primera && monton.length){
      /* sale por un lado del montón y entra por arriba */
      SON.sube();
      const c = it.c, x0 = c.position.x, y0 = c.position.y, z0 = c.position.z;
      ponerMonton(true);
      await animar({ dur: saltar ? .14 : .34, ease: suave, cada: (u) => {
        c.position.set(x0 + Math.sin(u * Math.PI) * L.pw * .62, mezcla(y0, L.py + .05, u) - Math.sin(u * Math.PI) * .2, mezcla(z0, .6, u));
        c.rotation.z = Math.sin(u * Math.PI) * -.14; } });
      c.rotation.z = 0;
    }
    it.c.position.set(L.px, L.py + .05, .6);
    primera = false;

    if(!saltar){
      pista('voltear', enPantalla(new THREE.Vector3(L.px, L.py, .6)), 'Toca la carta (o deslízala) para voltearla', { gesto: 'toca', veces: 3 });
      await new Promise((ok) => {
        let x0 = null;
        const ir = () => { capaToque.onpointerdown = capaToque.onpointerup = null; clearInterval(revisaSaltar); cumplida('voltear'); quitarPista(); ok(); };
        capaToque.onpointerdown = (e) => { x0 = { x: e.clientX, y: e.clientY }; };
        capaToque.onpointerup = (e) => { if(!x0) return; x0 = null; ir(); };
        const revisaSaltar = setInterval(() => { if(saltar) ir(); }, 60);
      });
    }

    /* El volteo: se levanta, gira, y cae boca arriba. Los letreros de la mesa se apagan mientras la carta está
       en grande (son de la página y quedaban ENCIMA de la carta; Carlos lo vio con «Puercos · Rara»). */
    SON.volteo();
    const c = it.c, malo = it.x.tipo === 'puerco' ? it.x.nivel : 'B';
    const especial = it.x.tipo === 'lider' ? 'legendaria' : it.x.tipo === 'puerco' ? ({ S: 'legendaria', A: 'epica', B: 'rara' }[malo] || 'normal') : it.x.nivel === 'S' || it.x.nivel === 'A' ? 'epica' : 'rara';
    const chido = especial === 'legendaria' || especial === 'epica', colorChido = it.x.tipo === 'lider' ? '#E8B923' : (COLOR_RAREZA[it.x.nivel] || '#FFD54A');
    /* SUSPENSO: lo bueno tiembla y brilla antes de voltearse */
    if(chido && !saltar){
      SON.sube?.();
      await animar({ dur: especial === 'legendaria' ? .9 : .55, ease: (u) => u, cada: (u) => {
        c.position.x = L.px + Math.sin(u * 70) * .04 * u; c.rotation.z = Math.sin(u * 55) * .05 * u; c.scale.setScalar(L.esc * (1 + u * .08)); } });
      chispas(new THREE.Vector3(c.position.x, c.position.y, .9), { color: colorChido, cuantas: 30, fuerza: 1.6 });
      c.rotation.z = 0;
    }
    {
      /* sale disparada al centro, crece y da vuelta y media en el aire */
      const p0 = c.position.clone(), s0 = c.scale.x, sF = saltar ? L.esc : L.grande;
      const fin = saltar ? p0 : new THREE.Vector3(L.gx, L.gy, 1.2);
      await animar({ dur: saltar ? .2 : .62, ease: suave, cada: (u) => {
        const arco = Math.sin(u * Math.PI);
        c.position.set(mezcla(p0.x, fin.x, u), mezcla(p0.y, fin.y, u) + arco * .25, mezcla(p0.z, fin.z, u) + arco * 1.4);
        c.rotation.set(arco * .2, mezcla(Math.PI, saltar ? 0 : -Math.PI * 2, u), arco * -.18);
        c.scale.setScalar(mezcla(s0, sF, u) * (1 + arco * .1));
      } });
      c.rotation.set(0, 0, 0);
      if(!saltar){ sacudir(.06); chispas(new THREE.Vector3(L.gx, L.gy, 1.4), { color: COLOR_RAREZA[it.x.nivel] || '#FFF0F6', cuantas: 40, fuerza: 2.4 }); }
    }
    SON[especial]?.();
    if(!saltar){
      enseñarFicha(it);
      if(chido){
        const leg = especial === 'legendaria', dura = leg ? 2.3 : 1.7;
        const h = halo(colorChido, L.grande * 2.4); h.position.set(L.gx, L.gy, .9); raiz.add(h);
        const ry = rayos(colorChido, L.grande * CARTA_H * (leg ? 2.6 : 2)); ry.position.set(L.gx, L.gy, .85); raiz.add(ry);
        animar({ dur: dura, ease: (u) => u, cada: (u) => { const e = Math.sin(u * Math.PI);
          h.material.opacity = e * (leg ? 1 : .7); h.rotation.z = u * 1.5;
          ry.material.opacity = e * (leg ? .9 : .6); ry.rotation.z = -u * (leg ? 2.2 : 1.4); ry.scale.setScalar(.6 + e * .5); } }).then(() => { raiz.remove(h); raiz.remove(ry); });
        /* la carta da un latido */
        animar({ dur: .5, ease: resorte, cada: (u) => c.scale.setScalar(L.grande * (1 + Math.sin(u * Math.PI) * .12)) });
        /* tres tandas de confeti y un empujón de cámara */
        for(let k = 0; k < (leg ? 3 : 2); k++) setTimeout(() => chispas(new THREE.Vector3(L.gx + (Math.random() - .5), L.gy + (Math.random() - .5), 1.4), { color: k % 2 ? '#FFF0F6' : colorChido, cuantas: leg ? 110 : 60, fuerza: leg ? 4.5 : 3 }), k * 260);
        const z0 = E.cam.position.z;
        animar({ dur: .6, ease: (u) => u, cada: (u) => { E.cam.position.z = z0 - Math.sin(u * Math.PI) * (leg ? 1.6 : .9); } }).then(() => { E.cam.position.z = z0; });
        anunciar(dom, it.x.tipo === 'lider' ? '¡Puerco líder!' : leg ? '¡Legendaria!' : '¡Épica!', colorChido);
        if(leg) sacudir(.18);
      }
      if(!it.r.nueva && it.r.vuelven) setTimeout(() => SON.moneda(), 250);
      /* Se queda a la vista un momento; un toque lo apura. */
      /* medio segundo más en grande que antes (Carlos, 6 nov); si se toca, se va a la mesa ahí mismo y más rápido */
      apurado = await Promise.race([esperar(especial === 'legendaria' ? 2.1 : 1.55).then(() => false), toqueCualquiera(capaToque).then(() => true)]);
      ficha.classList.remove('ve');
    }

    /* tras la primera carta, la pila se recorre a la izquierda y la mesa queda a la derecha */
    if(!pilaRecorrida){ pilaRecorrida = true; acomodar(); ponerMonton(true); }
    /* Y se va a su fila de la mesa. */
    /* el grupo DE LA MESA (el que tiene su rótulo), no la copia que trae cada carta */
    const g = grupos.find(x => x.k === it.g.k), lista = enMesa[g.k];
    lista.push(it);
    const destino = lugarEnMesa(g, lista.length - 1, lista.length);
    const de = c.position.clone(), sDe = c.scale.x;
    await animar({ dur: saltar ? .22 : apurado ? .26 : .5, ease: sale, cada: (u) => {
      c.position.set(mezcla(de.x, destino.pos.x, u), mezcla(de.y, destino.pos.y, u) + Math.sin(u * Math.PI) * .35, mezcla(de.z, destino.pos.z, u) + Math.sin(u * Math.PI) * .6);
      c.scale.setScalar(mezcla(sDe, destino.s, u)); c.rotation.z = Math.sin(u * Math.PI) * .2;
    } });
    c.rotation.z = 0; apurado = false;
    SON.aterriza();
    g.malla.visible = true;
    acomodarMesa();
  }
  $('[data-saltar]').hidden = true;
  /* Lo que te tocó se abre a todo el ancho, para verlo de un vistazo. */
  L.final = true; L.mx0 = -L.v.ancho / 2 + .25; acomodarMesa(true);

  /* ═══ EL RESUMEN ═══ */
  const nuevas = items.filter(it => it.r.nueva).length;
  const quedan = C.sobres.length;
  fin.innerHTML = `<h2>¡Listo!</h2>
    <p>${nuevas ? `<b>${nuevas}</b> ${nuevas === 1 ? 'nueva' : 'nuevas'}` : 'Nada nuevo esta vez'}${devueltas ? ` · repetidas: <b>+${devueltas}</b> monedas` : ''}</p>
    <p class="abrir__ayuda">Toca una carta para verla en grande. La envoltura, arrástrala al bote o déjala en la mesa.</p>
    <div class="abrir__botones">
      <button class="btn" data-otro>Guardar en mi mazo${quedan ? `<small>y abrir otro · quedan ${quedan}</small>` : ''}</button>
      <button class="btn suave" data-ver>Ver mi colección</button>
    </div>`;
  fin.classList.add('lado');
  fin.hidden = false; requestAnimationFrame(() => fin.classList.add('ve'));

  /* ═══ LA MESA YA ABIERTA: tocar una carta la abre en grande; la envoltura se arrastra al bote ═══ */
  const zoom = $('[data-zoom]');
  capaToque.style.pointerEvents = '';
  const cartas = items.map(it => it.c);
  const raizDe = (o) => { while(o.parent && o.parent !== raiz && o.parent !== tiradasG) o = o.parent; return o; };
  let arrastre = null;
  capaToque.onpointerdown = (e) => {
    if(!zoom.hidden) return;
    const hc = tocado(e.clientX, e.clientY, cartas);
    if(hc){ const c = raizDe(hc.object); arrastre = { carta: items.find(it => it.c === c), x: e.clientX, y: e.clientY }; return; }
    env.empieza(e);
  };
  capaToque.onpointermove = (e) => { env.mueve(e); };
  capaToque.onpointerup = capaToque.onpointercancel = (e) => {
    if(env.suelta(e)) return;
    const a = arrastre; arrastre = null;
    if(a?.carta && Math.hypot(e.clientX - a.x, e.clientY - a.y) < 12) verEnGrande(a.carta);
  };
  async function verEnGrande(it){
    SON.toque();
    const x = it.x, url = x.tipo === 'lider' ? cartaVentaja(liderDe(x.id)) : x.tipo === 'puerco' ? CAT.puercos.find(f => f.nombre + '·' + f.puntos === x.llave)?.arte
      : x.tipo === 'soporte' ? (x.esp === 'bono' ? CAT.bono : CAT.castigo).arte : (await caraCosmetico(x.id)).toDataURL('image/jpeg', .9);
    /* de cerca: se gira con el dedo, se acerca con dos y se voltea para ver el dorso */
    inspeccionar({ frente: url, dorso: x.tipo === 'cosmetico' ? null : dorsoUrl, pie: detalleDe(x) });
  }

  /* para las pruebas: dónde quedó cada cosa en la pantalla */
  globalThis.__abrir = { cartas: () => items.map(it => aPantalla(it.c.position)), envoltura: () => sobreG.parent ? aPantalla(sobreG.position) : null };
  const salida = await new Promise((ok) => {
    fin.querySelector('[data-otro]').addEventListener('click', () => ok(quedan ? 'otro' : 'volver'));
    fin.querySelector('[data-ver]').addEventListener('click', () => ok('coleccion'));
  });
  SON.toque();
  capaToque.onpointerdown = capaToque.onpointermove = capaToque.onpointerup = capaToque.onpointercancel = null;
  fin.classList.remove('ve');
  /* las cartitas se juntan y se van a tu mazo (abajo) */
  const llaves = items.filter(it => it.x.tipo === 'puerco').map(it => it.x.llave);
  if(llaves.length) meterAlMazo(llaves);
  SON.saca?.();
  await Promise.all(items.map((it, k) => { const p0 = it.c.position.clone(), s0 = it.c.scale.x;
    return animar({ dur: .45, retraso: k * .05, ease: entra, cada: (u) => { it.c.position.set(mezcla(p0.x, L.v.ancho * .3, u), mezcla(p0.y, -L.v.alto * .7, u), p0.z + u); it.c.scale.setScalar(mezcla(s0, s0 * .6, u)); it.c.rotation.z = u * .4; } }); }));
  cerrar(salida);
  alTerminar && alTerminar(salida);

  function cerrar(salida){
    quitarPista();
    /* la envoltura de este sobre, si no la tiraste, se queda en la mesa para la próxima (a lo más 6) */
    if(envolturaEnMesa && sobreG.parent){ envolturas.push({ tipo: sobre.tipo, x: sobreG.position.x, y: sobreG.position.y, rz: sobreG.rotation.z }); while(envolturas.length > 6) envolturas.shift(); }
    for(const f of limpieza) f();
    dom.remove();
    quitarAnterior();
    if(salida === 'otro'){ anterior = raiz; return; }     /* se quita cuando la mesa nueva ya está puesta */
    raiz.traverse(o => { if(o.geometry && o.geometry !== geoAlmohada && !o.geometry.parameters?.shapes) o.geometry.dispose?.(); });
    E.s.remove(raiz);
  }
}

function toqueCualquiera(nodo){
  return new Promise((ok) => { const f = () => { nodo.removeEventListener('pointerup', f); ok(); }; nodo.addEventListener('pointerup', f); });
}
function sacudir(fuerza){
  const p0 = E.cam.position.clone();
  animar({ dur: .5, ease: (u) => u, cada: (u) => { const k = fuerza * (1 - u); E.cam.position.set(p0.x + (Math.random() - .5) * k, p0.y + (Math.random() - .5) * k, p0.z); } })
    .then(() => E.cam.position.copy(p0));
}
