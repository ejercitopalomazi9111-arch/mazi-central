/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LA MESA
   ───────────────────────────────────────────────────────────────────────────
   Las reglas son las de `../motor.js`, intactas (sus 61 pruebas siguen
   mandando). Aquí sólo se pone en escena, con lo que pidió Carlos el 5 nov:
   · la mano en abanico, de verdad en 3D; tocar levanta, tocar otra vez juega
     (o arrastrarla a la mesa); dos del mismo nivel se FUSIONAN y se ve cómo;
   · al empezar cada turno, si te faltan cartas, se ROBAN del mazo, una por una;
   · las dos cartas CHOCAN y forcejean 2.5 segundos con su número en 3D, una
     se ROMPE, y la que sobrevive —con el número del daño— vuela a la vida del
     rival y le pega ahí;
   · nada de recuadros amarillos: lo que pasa se dice con pastillas que se van
     solas y con un dedo que señala, y sólo las primeras veces.
   ═══════════════════════════════════════════════════════════════════════════ */
import { THREE, E, carta, textura, precargar, animar, esperar, sale, entra, suave, resorte, mezcla, cl, vista, aPantalla, aMundo, tocado,
         halo, chispas, cadaCuadro, mascota, CARTA_W, CARTA_H, alCambiarTamano } from './escena.js';
import { C, cosmetico, guardar } from './coleccion.js';
import { CAT, fichaDe, misCartas, pagarPartida } from './tienda.js';
import { cargarNumeros, numero3d, soltar as soltarNumero } from './numeros3d.js';
import { COLOR_RAREZA } from './caras.js';
import { SON } from './sonido.js';
import { aviso, pista, cumplida, quitarPista } from './avisos.js';

const M = globalThis.MOTOR;
const DUELO = 2.5;              /* los segundos que forcejean, como lo pidió Carlos */
/* La vida con la que arranca cada quien EN ESTA MESA. El reglamento dice 200 y
   así se queda en el motor; Carlos, 5 nov: «hay que bajar la vida ya que las
   rondas duran un chingo». Simulado 400 partidas por valor: con 200 son 31
   rondas (mediana), con 80 son 12 — unos dos minutos. */
const PV_MESA = 80;

/* ── TU MAZO, DE TU COLECCIÓN ────────────────────────────────────────────────
   Los puercos que tienes (los mejores 30, `mazoDeColeccion`) y el soporte que
   tienes: hasta 5 y 5, que es lo que dice el reglamento. La máquina juega con
   uno PAREJO (`mazoParejo`, el que se midió en 300 partidas) y con el mismo
   soporte que tú: pelear contra alguien con más +5 no es justo. */
function recortarSoporte(mazo, bono, castigo){
  const quedan = { bono: Math.min(5, bono), castigo: Math.min(5, castigo) };
  return mazo.filter(c => c.nivel !== 'ESP' || (quedan[c.esp]-- > 0));
}
export function armarPartida(semilla = (Math.random() * 2 ** 31) | 0){
  const dado = M.azar(semilla ^ 0x5bd1e995);
  const mias = misCartas();
  let mio = mias.length ? M.mazoDeColeccion(mias) : M.armarMazo();
  mio = recortarSoporte(mio, C.soporte.bono, C.soporte.castigo);
  let suyo = recortarSoporte(M.mazoParejo(mio, dado), C.soporte.bono, C.soporte.castigo);
  /* `repartir` reconoce un mazo ya armado porque trae especiales; si alguien
     no tuviera ni una, se le deja una para que no lo vuelva a armar con 5 y 5 */
  if(!mio.some(c => c.nivel === 'ESP')) mio.push({ id: 'e-min', valor: 0, nivel: 'ESP', esp: 'bono' });
  if(!suyo.some(c => c.nivel === 'ESP')) suyo.push({ id: 'x-min', valor: 0, nivel: 'ESP', esp: 'bono' });
  return M.repartir(semilla, { a: mio, b: suyo });
}

/* La máquina, la misma de la versión 1: no ve tu mano, guarda las altas,
   gasta las bajas y no quema una fusión por nada. */
function pensarMaquina(j){
  const posibles = M.jugadasPosibles(j);
  const valor = (jugada) => {
    const p = M.puntuar(jugada);
    let v = p.puntos;
    if(p.combinada){ const mejorSola = Math.max(...j.mano.filter(c => c.nivel !== 'ESP').map(c => c.valor)); v = p.puntos - 22 - (p.puntos <= mejorSola ? 40 : 0); }
    if(jugada.especial){ const iguales = j.mano.filter(c => c.nivel === 'ESP' && c.esp === jugada.especial).length; v -= iguales >= 2 ? 1 : 7; }
    return v + (Math.random() * 9 - 4.5);
  };
  return posibles.reduce((mejor, x) => valor(x) > valor(mejor) ? x : mejor, posibles[0]);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
let enCurso = false;
export async function jugarPartida(op){
  /* dos toques al botón no arman dos mesas encimadas */
  if(enCurso) return; enCurso = true;
  const carga = document.createElement('div'); carga.className = 'barajando';
  carga.innerHTML = '<img alt="" src="../arte/web/reverso.webp"><b>Barajando…</b><span data-avance></span>';
  op.capa.appendChild(carga);
  try{ await partida({ ...op, carga }); }
  catch(e){
    /* nunca más una pantalla vacía: si algo truena, se dice qué y se puede salir */
    console.error(e);
    carga.innerHTML = `<b>No se pudo armar la mesa</b><span>${String(e && e.message || e).replace(/[<>&]/g, '')}</span><button class="btn" data-volver>Volver al inicio</button>`;
    carga.querySelector('[data-volver]').onclick = () => { carga.remove(); for(const x of document.querySelectorAll('.mesa')) x.remove(); op.alTerminar && op.alTerminar('inicio'); };
  }
  finally{ enCurso = false; }
}
async function partida({ capa, alTerminar, carga }){
  quitarPista();
  const avanza = (n, t) => { const a = carga.querySelector('[data-avance]'); if(a) a.textContent = t ? `${n} de ${t} cartas` : ''; };
  await cargarNumeros();
  let J = armarPartida();
  J.a.pv = J.b.pv = PV_MESA;
  /* todas las caras se bajan ANTES de repartir: ninguna aparece en blanco */
  const todas = [...J.a.mazo, ...J.a.mano, ...J.b.mazo, ...J.b.mano];
  await precargar([...todas.map(c => fichaDe(c)?.arte), (cosmetico(C.puesto.dorso) || cosmetico('ds-autora')).img], avanza);
  const raiz = new THREE.Group(); E.s.add(raiz);
  const limpieza = [];
  const dom = document.createElement('div'); dom.className = 'mesa'; capa.appendChild(dom);
  const rival = { nombre: 'La Máquina', avatar: 'img/avatares/monkey.png' };
  dom.innerHTML = `
    <div class="mesa__toque" data-toque></div>
    <div class="hud hud--suyo"><img alt="" src="${rival.avatar}"><div class="hud__txt"><b>${rival.nombre}</b><div class="pv"><i data-barra-b></i><span data-pv-b>${PV_MESA}</span></div></div></div>
    <div class="ronda" data-ronda>Ronda 1</div>
    <button class="mesa__salir" data-salir aria-label="Salir"><img alt="" src="img/iconos/cross.png"></button>
    <div class="hud hud--mio"><img alt="" src="${(cosmetico(C.puesto.avatar) || cosmetico('av-pig')).img}"><div class="hud__txt"><b>Tú</b><div class="pv"><i data-barra-a></i><span data-pv-a>${PV_MESA}</span></div></div>
      <div class="fusiones" data-fusiones title="Fusiones que te quedan"></div></div>
    <div class="cuenta cuenta--mazo-a" data-n-mazo-a></div><div class="cuenta cuenta--mazo-b" data-n-mazo-b></div>
    <div class="cuenta cuenta--esp" data-esp-bono hidden></div><div class="cuenta cuenta--esp" data-esp-castigo hidden></div>
    <div class="formula" data-formula hidden></div>
    <div class="mesa__fin" data-fin hidden></div>`;
  const $ = (s) => dom.querySelector(s);
  const capaToque = $('[data-toque]');

  /* ── EL ACOMODO ── */
  const L = {};
  function acomodar(){
    const v = vista(0), vertical = E.ancho < E.alto;
    L.v = v; L.vertical = vertical;
    L.sMano = vertical ? Math.min(.74, v.ancho / 4.6) : .9;
    L.sMesa = vertical ? .8 : 1.05;
    L.sPila = vertical ? .44 : .55;
    L.yMano = -v.alto / 2 + CARTA_H * L.sMano * .5 + (vertical ? .62 : .5);
    L.yMio = vertical ? -.55 : -.62; L.ySuyo = vertical ? 1.05 : 1.05;
    L.xMesa = 0;
    L.ySuMano = v.alto / 2 + .05;
    L.xPilaDer = v.ancho / 2 - CARTA_W * L.sPila / 2 - .12;
    L.xPilaIzq = -L.xPilaDer;
    L.yPilasMias = L.yMio; L.yPilasSuyas = L.ySuyo;
    L.yBandeja = L.yMano + CARTA_H * L.sMano * .62;
    /* en horizontal sobra mesa a los lados de la mano: el soporte va a su
       derecha y el cerdito a su izquierda, lejos de los montones */
    const medioMano = 2 * Math.min(CARTA_W * L.sMano * .96, (v.ancho - .25 - CARTA_W * L.sMano) / 4) + CARTA_W * L.sMano / 2;
    L.bandeja = vertical ? { x: v.ancho / 2 - CARTA_W * L.sPila * .55 - .08, y: L.yBandeja, paso: -(CARTA_W * L.sPila + .1) }
                         : { x: medioMano + CARTA_W * L.sPila * .7 + .15, y: L.yMano, paso: CARTA_W * L.sPila + .12 };
    L.cerdo = vertical ? null : { x: -medioMano - .55, y: L.yMano - .1 };
  }
  acomodar();

  /* ── LAS CARTAS EN 3D ── */
  const texDorso = textura((cosmetico(C.puesto.dorso) || cosmetico('ds-autora')).img);
  const mallas = new Map();      /* id de carta del motor → su malla */
  function mallaDe(c){
    if(mallas.has(c.id)) return mallas.get(c.id);
    const f = fichaDe(c), m = carta(f ? textura(f.arte) : null, texDorso);
    m.userData.carta = c; raiz.add(m); mallas.set(c.id, m);
    return m;
  }
  const quitarMalla = (id) => { const m = mallas.get(id); if(m){ m.removeFromParent(); mallas.delete(id); } };

  /* El mazo y el cementerio de cada lado son montoncitos de verdad. */
  function pila(){ const g = new THREE.Group(); raiz.add(g); return g; }
  const pilas = { a: { mazo: pila(), cem: pila() }, b: { mazo: pila(), cem: pila() } };
  function pintarPilas(){
    for(const lado of ['a', 'b']){
      const j = J[lado], p = pilas[lado], y = lado === 'a' ? L.yPilasMias : L.yPilasSuyas;
      /* mazo: tantos dorsos como quepan para que se vea el grosor */
      p.mazo.clear();
      const n = Math.min(8, Math.ceil(j.mazo.length / 4));
      for(let i = 0; i < n; i++){ const d = carta(null, texDorso); d.rotation.y = Math.PI; d.scale.setScalar(L.sPila); d.position.set(0, i * .012, i * .03); p.mazo.add(d); }
      p.mazo.position.set(lado === 'a' ? L.xPilaDer : L.xPilaIzq, y, .05);
      /* cementerio: la última que se jugó, boca arriba, ladeada */
      p.cem.clear();
      const ult = j.cementerio.slice(-3);
      ult.forEach((c, i) => { const f = fichaDe(c); const d = carta(f ? textura(f.arte) : null, texDorso); d.scale.setScalar(L.sPila); d.rotation.z = (i - 1) * .14 + (lado === 'a' ? .05 : -.05); d.position.z = i * .03; p.cem.add(d); });
      p.cem.position.set(lado === 'a' ? L.xPilaIzq : L.xPilaDer, y, .05);
      const nodo = $('[data-n-mazo-' + lado + ']'), q = aPantalla(new THREE.Vector3(p.mazo.position.x, y - CARTA_H * L.sPila / 2 - .08, .1));
      nodo.textContent = j.mazo.length; nodo.style.left = q.x + 'px'; nodo.style.top = q.y + 'px';
    }
  }

  /* ── TU MANO EN ABANICO ── */
  let elegidas = [], especial = null, especialId = null;
  const jugables = () => J.a.mano.filter(c => c.nivel !== 'ESP');
  const especialesMias = () => J.a.mano.filter(c => c.nivel === 'ESP');
  function lugarEnMano(k, n){
    const paso = Math.min(CARTA_W * L.sMano * .96, (L.v.ancho - .25 - CARTA_W * L.sMano) / Math.max(1, n - 1));
    const x = (k - (n - 1) / 2) * paso, ang = (k - (n - 1) / 2) * -.06;
    return { x, y: L.yMano - Math.abs(k - (n - 1) / 2) * .05, z: .2 + k * .04, rz: ang };
  }
  function pintarMano(anim = true, dur = .25){
    const mano = jugables();
    mano.forEach((c, k) => {
      const m = mallaDe(c), l = lugarEnMano(k, mano.length), sel = elegidas.some(e => e.id === c.id);
      const dest = { x: l.x, y: l.y + (sel ? .42 : 0), z: l.z + (sel ? .5 : 0), rz: sel ? 0 : l.rz, s: L.sMano * (sel ? 1.12 : 1) };
      m.userData.enMano = true;
      if(m.userData.arrastrando) return;
      if(!anim){ m.position.set(dest.x, dest.y, dest.z); m.rotation.set(0, 0, dest.rz); m.scale.setScalar(dest.s); return; }
      const p0 = m.position.clone(), r0 = m.rotation.z, s0 = m.scale.x, ry0 = m.rotation.y;
      animar({ dur, ease: suave, cada: (u) => { m.position.set(mezcla(p0.x, dest.x, u), mezcla(p0.y, dest.y, u), mezcla(p0.z, dest.z, u)); m.rotation.set(0, mezcla(ry0, 0, u), mezcla(r0, dest.rz, u)); m.scale.setScalar(mezcla(s0, dest.s, u)); } });
    });
    /* el soporte que traes, aparte, en una bandeja a la derecha encima de la
       mano: UN montoncito por clase (+5 y −5) con cuántas te quedan. Antes iba
       cada carta suelta, encimadas a 2 dedos una de otra, y tocar «la de
       Carnitas» podía agarrar la Alcancía de enfrente. */
    const clases = ['castigo', 'bono'].filter(k => especialesMias().some(c => c.esp === k));
    for(const k of ['bono', 'castigo']){
      const chip = $('[data-esp-' + k + ']'), deEsa = especialesMias().filter(c => c.esp === k), i = clases.indexOf(k);
      if(!deEsa.length){ chip.hidden = true; continue; }
      const on = especial === k;
      const x = L.bandeja.x + i * L.bandeja.paso, y = L.bandeja.y + (on ? .22 : 0);
      deEsa.forEach((c, n) => {
        const m = mallaDe(c), z = .9 + n * .02;
        animar({ dur: .22, cada: (u) => { m.position.lerp(new THREE.Vector3(x + n * .025, y + n * .02, z), u); m.scale.setScalar(mezcla(m.scale.x, L.sPila * (on ? 1.15 : 1), u)); m.rotation.set(0, mezcla(m.rotation.y, 0, u), mezcla(m.rotation.z, -.06, u)); } });
        m.userData.enMano = true;
      });
      const q = aPantalla(new THREE.Vector3(x, y + CARTA_H * L.sPila * .5, 1));
      chip.textContent = '×' + deEsa.length; chip.hidden = false;
      chip.style.left = q.x + 'px'; chip.style.top = q.y + 'px'; chip.classList.toggle('on', on);
    }
    pintarFormula();
    const f = $('[data-fusiones]'), quedan = M.COMBOS_POR_JUGADOR - J.a.combosUsados;
    f.innerHTML = Array.from({ length: M.COMBOS_POR_JUGADOR }, (_, i) => `<i class="${i < quedan ? 'si' : ''}"></i>`).join('');
  }

  /* Lo que vale lo que elegiste, dicho en grande y en cristiano. */
  function pintarFormula(){
    const f = $('[data-formula]');
    if(!elegidas.length){ f.hidden = true; return; }
    const jug = { cartas: elegidas, especial };
    const p = M.puntuar(jug);
    let txt;
    if(p.combinada){
      const menor = elegidas.find(c => c.valor !== p.base) || elegidas[1];
      txt = `<b>Fusión</b> ${p.base} + ${p.bono} = <em>${p.puntos}</em><span>Se queda la más alta y suma el bono ${p.nivel}; el ${menor.valor} se gasta</span>`;
    } else if(especial === 'bono') txt = `${p.base} + 5 <small>(Alcancía)</small> = <em>${p.puntos}</em>`;
    else if(especial === 'castigo') txt = `Juegas <em>${p.base}</em><span>y la carta del rival baja 5 (Carnitas)</span>`;
    else txt = `Juegas <em>${p.puntos}</em>`;
    f.innerHTML = txt;
    f.hidden = false;
  }

  /* ── EL HUD ── */
  function pintarHud(){
    for(const lado of ['a', 'b']){
      $('[data-pv-' + lado + ']').textContent = J[lado].pv;
      $('[data-barra-' + lado + ']').style.width = (J[lado].pv / PV_MESA * 100) + '%';
    }
    $('[data-ronda]').textContent = 'Ronda ' + J.ronda;
  }
  const centroHud = (lado) => { const r = dom.querySelector(lado === 'a' ? '.hud--mio img' : '.hud--suyo img').getBoundingClientRect(); return aMundo(r.left + r.width / 2, r.top + r.height / 2, .8); };

  /* ── LA MANO DEL RIVAL: dorsos arriba, medio fuera de la pantalla ── */
  function pintarSuMano(){
    const mano = J.b.mano; const n = mano.length;
    mano.forEach((c, k) => {
      const m = mallaDe(c); m.userData.suya = true;
      const paso = Math.min(.42, 2.6 / Math.max(1, n)), x = (k - (n - 1) / 2) * paso;
      m.scale.setScalar(L.sPila * 1.05);
      animar({ dur: .3, cada: (u) => { m.position.lerp(new THREE.Vector3(x, L.ySuMano, .1 + k * .03), u); m.rotation.set(0, Math.PI, Math.PI + (k - (n - 1) / 2) * .08); } });
    });
  }

  /* ── EL CERDITO DE LA MESA: festeja y se enoja ── */
  const cerdo = await mascota((cosmetico(C.puesto.mascota) || cosmetico('ms-pig')).modelo);
  cerdo.obj.scale.setScalar(.3); raiz.add(cerdo.obj); cerdo.hacer('idle');
  /* entre los dos montones de la izquierda, donde no tapa ninguno */
  const ponerCerdo = () => { const hueco = ((L.yPilasSuyas - CARTA_H * L.sPila / 2) + (L.yPilasMias + CARTA_H * L.sPila / 2)) / 2; cerdo.obj.position.set(L.cerdo ? L.cerdo.x : -L.v.ancho / 2 + .42, L.cerdo ? L.cerdo.y : hueco - .2, .3); cerdo.obj.rotation.set(.3, .7, 0); };
  ponerCerdo();
  const reaccion = (que) => { cerdo.hacer(que); setTimeout(() => cerdo.hacer('idle'), 1800); };

  limpieza.push(alCambiarTamano(() => { acomodar(); pintarMano(false); pintarSuMano(); pintarPilas(); ponerCerdo(); }));

  /* ═══ REPARTIR: las cartas vuelan del mazo a la mano ═══ */
  /* Robar: la carta sale del mazo boca abajo, sube en un arco suave, se voltea
     A MEDIO VUELO y aterriza en su lugar de la mano mientras las demás le
     abren espacio. Carlos, 5 nov: «más lentas y suaves». */
  async function robar(lado, cartas){
    for(const c of cartas){
      const m = mallaDe(c), de = pilas[lado].mazo.position.clone();
      m.position.set(de.x, de.y, .6); m.rotation.set(0, Math.PI, 0); m.scale.setScalar(L.sPila);
      SON.roba();
      if(lado === 'a'){
        m.userData.arrastrando = true;                 /* pintarMano no la toca mientras vuela */
        pintarMano(true, .55);
        const mano = jugables(), k = mano.findIndex(x => x.id === c.id), l = lugarEnMano(Math.max(0, k), mano.length);
        const fin = new THREE.Vector3(l.x, l.y, l.z), s0 = L.sPila;
        if(k < 0){ /* es de soporte: va a su bandeja */ m.userData.arrastrando = false; pintarMano(true); await esperar(.4); continue; }
        await animar({ dur: .85, ease: suave, cada: (u) => {
          const arco = Math.sin(u * Math.PI);
          m.position.set(mezcla(de.x, fin.x, u), mezcla(de.y, fin.y, u) + arco * .9, mezcla(.6, fin.z, u) + arco * 1.6);
          /* se voltea en la parte alta del arco, no al despegar */
          m.rotation.set(arco * -.25, mezcla(Math.PI, 0, suave(cl((u - .15) / .6))), mezcla(0, l.rz, u));
          m.scale.setScalar(mezcla(s0, L.sMano, u) * (1 + arco * .18));
        } });
        m.userData.arrastrando = false;
        SON.aterriza?.();
        await esperar(.08);
      }
      else { pintarSuMano(); await esperar(.22); }
    }
  }
  /* las que están en la mano y todavía no tienen lugar en la mesa = recién robadas */
  const nuevasDe = (lado) => J[lado].mano.filter(c => !mallas.has(c.id));

  pintarHud();
  pintarPilas();
  carga.classList.add('se-va'); setTimeout(() => carga.remove(), 400);
  await robar('b', nuevasDe('b'));
  await robar('a', nuevasDe('a'));
  pintarMano(true);

  /* ═══ EL TURNO ═══ */
  let ocupado = false, termino = false;
  function pistaTurno(){
    if(elegidas.length) return;
    const m = mallas.get(jugables()[Math.floor(jugables().length / 2)]?.id); if(!m) return;
    pista('elige', aPantalla(m.position), 'Toca una carta para elegirla', { gesto: 'toca', veces: 3 });
  }
  pistaTurno();

  /* para las pruebas: qué hay en la mesa y dónde se ve cada carta */
  globalThis.__mesa = {
    estado: () => ({ ronda: J.ronda, pvA: J.a.pv, pvB: J.b.pv, acabo: J.acabo, ocupado, termino, combosUsados: J.a.combosUsados,
      mazoA: J.a.mazo.length, cemA: J.a.cementerio.length, historia: J.historia,
      mano: J.a.mano.map(c => { const m = mallas.get(c.id), q = m ? aPantalla(m.position) : null; return { id: c.id, valor: c.valor, nivel: c.nivel, esp: c.esp, x: q?.x, y: q?.y }; }),
      formula: $('[data-formula]').hidden ? null : $('[data-formula]').textContent }),
  };

  function elegir(c){
    (globalThis.__mesa.toques ||= []).push(J.ronda + ':' + c.valor + (c.esp ? '/' + c.esp : ''));
    if(c.nivel === 'ESP'){
      if(!elegidas.length){ aviso('Primero elige una carta tuya; el ' + (c.esp === 'bono' ? '+5' : '−5') + ' va encima de ella', { icono: 'img/iconos/information.png' }); SON.error(); return; }
      if(elegidas.length === 2){ aviso('Las cartas de soporte no se usan en una fusión', { tipo: 'mal' }); SON.error(); return; }
      if(especial === c.esp){ especial = null; especialId = null; }
      else { especial = c.esp; especialId = c.id; }
      SON.toque(); pintarMano(); return;
    }
    const ya = elegidas.findIndex(e => e.id === c.id);
    if(ya >= 0){ intentarJugar(); return; }
    if(elegidas.length === 1){
      const otra = elegidas[0];
      if(otra.nivel === c.nivel && M.sePuedeCombinar(c.nivel) && J.a.combosUsados < M.COMBOS_POR_JUGADOR){
        elegidas = [otra, c]; especial = null; especialId = null; SON.rara();
        pintarMano(); return;
      }
    }
    elegidas = [c]; SON.toque();
    if(especialId && elegidas.length !== 1){ especial = null; especialId = null; }
    cumplida('elige'); pintarMano();
    const m = mallas.get(c.id);
    pista('juega', aPantalla(m.position), 'Tócala otra vez o arrástrala a la mesa', { gesto: 'arrastra', veces: 3, hacia: { x: 0, y: -(aPantalla(m.position).y - aPantalla(new THREE.Vector3(0, L.yMio, 0)).y) } });
  }

  function intentarJugar(){
    if(ocupado || !elegidas.length) return;
    const jug = { cartas: elegidas.slice(), especial };
    const mal = M.porQueNoSeVale(jug, J.a);
    if(mal){ SON.error(); aviso(mal, { tipo: 'mal', icono: 'img/iconos/exclamation.png' }); return; }
    cumplida('juega'); quitarPista();
    ronda(jug);
  }

  /* ── EL DEDO: tocar, o arrastrar a la mesa ── */
  let arr = null;
  capaToque.addEventListener('pointerdown', (e) => {
    if(ocupado || termino) return;
    const objs = [...mallas.values()].filter(m => m.userData.enMano && !m.userData.suya);
    const t = tocado(e.clientX, e.clientY, objs);
    if(!t) return;
    let o = t.object; while(o && !o.userData.carta) o = o.parent;
    if(!o) return;
    arr = { m: o, x0: e.clientX, y0: e.clientY, movio: false };
    capaToque.setPointerCapture?.(e.pointerId);
  });
  capaToque.addEventListener('pointermove', (e) => {
    if(!arr) return;
    const d = Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0);
    if(!arr.movio && d > 14 && arr.m.userData.carta.nivel !== 'ESP'){
      arr.movio = true; arr.m.userData.arrastrando = true;
      const c = arr.m.userData.carta;
      if(!elegidas.some(x => x.id === c.id)) { elegidas = [c]; especial = null; especialId = null; pintarMano(); }
    }
    if(arr.movio){ const p = aMundo(e.clientX, e.clientY, 1.2); arr.m.position.set(p.x, p.y, 1.2); arr.m.rotation.set(0, 0, 0); }
  });
  const soltar = (e) => {
    if(!arr) return;
    const a = arr; arr = null;
    a.m.userData.arrastrando = false;
    if(!a.movio){ elegir(a.m.userData.carta); return; }
    const p = aMundo(e.clientX, e.clientY, 0);
    if(p.y > L.yMano + CARTA_H * L.sMano * .55) intentarJugar();
    pintarMano();
  };
  capaToque.addEventListener('pointerup', soltar);
  capaToque.addEventListener('pointercancel', soltar);

  /* ═══ UNA RONDA ═══ */
  async function ronda(jugA){
    ocupado = true; quitarPista();
    $('[data-formula]').hidden = true;
    const jugB = pensarMaquina(J.b);
    (globalThis.__mesa.jugadas ||= []).push({ r: J.ronda, a: jugA.cartas.map(c => c.valor), espA: jugA.especial, b: jugB.cartas.map(c => c.valor), espB: jugB.especial });
    const antes = J;
    const despues = M.jugarRonda(J, jugA, jugB);
    const h = despues.historia[despues.historia.length - 1];

    /* 1 · Las cartas van a la mesa: la tuya boca arriba, la suya boca abajo. */
    const mias = jugA.cartas.map(c => mallas.get(c.id)), suyas = jugB.cartas.map(c => mallaDe(c));
    /* la que vuela es LA MISMA que gasta el motor: la primera de esa clase en
       la mano. Antes volaba la que tocaste y el motor gastaba otra; la que
       quedaba se volvía una carta fantasma encima de la bandeja que, al
       tocarla, pedía un soporte que ya no tenías y trababa la partida. */
    const espMia = jugA.especial ? J.a.mano.find(c => c.nivel === 'ESP' && c.esp === jugA.especial) : null;
    const espSuya = jugB.especial ? J.b.mano.find(c => c.nivel === 'ESP' && c.esp === jugB.especial) : null;
    for(const m of mias) m.userData.enMano = false;
    elegidas = []; especial = null; especialId = null;
    SON.saca();
    await Promise.all([
      ...mias.map((m, i) => volar(m, { x: L.xMesa + (i - (mias.length - 1) / 2) * .28, y: L.yMio, z: .4 + i * .05, s: L.sMesa, ry: 0, rz: (i - (mias.length - 1) / 2) * .1 })),
      ...suyas.map((m, i) => volar(m, { x: L.xMesa + (i - (suyas.length - 1) / 2) * .28, y: L.ySuyo, z: .4 + i * .05, s: L.sMesa, ry: Math.PI, rz: (i - (suyas.length - 1) / 2) * .1 }, .1)),
    ]);
    /* el soporte se pone encima de su carta */
    const pegar = async (esp, sobre, lado) => {
      if(!esp) return null;
      const m = mallaDe(esp); m.userData.enMano = false;
      await volar(m, { x: sobre.position.x + .38, y: sobre.position.y + (lado === 'a' ? .3 : -.3), z: .7, s: L.sPila * .9, ry: 0, rz: .25 });
      return m;
    };
    /* el +5 va encima de la carta propia; el −5, encima de la del RIVAL, que
       es a la que le baja (regla 8 de la autora) */
    const destino = (esp, mia, suya) => esp && esp.esp === 'castigo' ? suya : mia;
    const [mEspA, mEspB] = await Promise.all([
      pegar(espMia, destino(espMia, mias[0], suyas[0]), espMia?.esp === 'castigo' ? 'b' : 'a'),
      pegar(espSuya, destino(espSuya, suyas[0], mias[0]), espSuya?.esp === 'castigo' ? 'a' : 'b')]);

    /* 2 · Se voltea la suya. */
    await esperar(.25);
    SON.volteo();
    await Promise.all(suyas.map(m => animar({ dur: .45, ease: suave, cada: (u) => { m.rotation.y = mezcla(Math.PI, 0, u); m.position.z = .4 + Math.sin(u * Math.PI) * .8; } })));

    /* 3 · Las fusiones se funden: la menor entra en la mayor con un destello. */
    const fundir = async (mallasLado, puntos, lado) => {
      if(mallasLado.length < 2) return mallasLado[0];
      const cartas = mallasLado.map(m => m.userData.carta), mayor = cartas[0].valor >= cartas[1].valor ? 0 : 1;
      const queda = mallasLado[mayor], va = mallasLado[1 - mayor];
      SON.rara();
      await animar({ dur: .45, ease: entra, cada: (u) => { va.position.lerp(queda.position, u); va.scale.setScalar(L.sMesa * (1 - u * .6)); va.rotation.z = u * 3; } });
      va.visible = false;
      chispas(queda.position.clone(), { color: COLOR_RAREZA[cartas[mayor].nivel], cuantas: 60, fuerza: 2.5 });
      await animar({ dur: .35, ease: resorte, cada: (u) => { queda.position.x = mezcla(queda.position.x, L.xMesa, u); queda.rotation.z = mezcla(queda.rotation.z, 0, u); queda.scale.setScalar(L.sMesa * (1 + Math.sin(u * Math.PI) * .2)); } });
      return queda;
    };
    const cA = await fundir(mias, h.a.puntos, 'a'), cB = await fundir(suyas, h.b.puntos, 'b');
    /* el soporte se mete en su carta */
    for(const [mEsp, sobre] of [[mEspA, espMia?.esp === 'castigo' ? cB : cA], [mEspB, espSuya?.esp === 'castigo' ? cA : cB]]){
      if(!mEsp) continue;
      animar({ dur: .3, ease: entra, cada: (u) => { mEsp.position.lerp(sobre.position, u); mEsp.scale.setScalar(L.sPila * .9 * (1 - u)); } }).then(() => { mEsp.visible = false; });
    }

    /* 4 · Los números en 3D, arriba de cada carta. */
    const colorA = h.perdio === 'b' ? '#FFE14A' : '#FFF0F6', colorB = h.perdio === 'a' ? '#FFE14A' : '#FFF0F6';
    const nA = numero3d(h.a.puntos, { alto: .48, color: '#FFF0F6' }), nB = numero3d(h.b.puntos, { alto: .48, color: '#FFF0F6' });
    raiz.add(nA, nB);
    const ponNum = (n, c, lado) => { n.position.set(c.position.x, c.position.y + (lado === 'a' ? -1 : 1) * (CARTA_H * L.sMesa / 2 + .32), 1.3); };
    ponNum(nA, cA, 'a'); ponNum(nB, cB, 'b');
    SON.toque();
    await Promise.all([nA, nB].map(n => { const k = n.scale.x; n.scale.setScalar(.001); return animar({ dur: .35, ease: resorte, cada: (u) => n.scale.setScalar(Math.max(.001, k * u)) }); }));

    /* 5 · EL CHOQUE: 2.5 segundos de forcejeo. Se jalan, se empujan, sacan
       chispas donde se tocan, y al final cede el que tiene menos. */
    const centro = (L.yMio + L.ySuyo) / 2;
    const pA0 = cA.position.clone(), pB0 = cB.position.clone();
    const medio = CARTA_H * L.sMesa / 2 * .92;
    /* se echan para atrás para tomar vuelo… */
    await animar({ dur: .25, ease: sale, cada: (u) => { cA.position.y = pA0.y - u * .3; cB.position.y = pB0.y + u * .3; } });
    /* …y se estrellan */
    await animar({ dur: .16, ease: entra, cada: (u) => { cA.position.y = mezcla(pA0.y - .3, centro - medio, u); cB.position.y = mezcla(pB0.y + .3, centro + medio, u); cA.position.z = cB.position.z = .8; } });
    SON.choque(); sacudir(.12);
    chispas(new THREE.Vector3(0, centro, 1), { color: '#FFF0F6', cuantas: 70, fuerza: 3.5 });
    const gana = h.perdio === 'a' ? 'b' : h.perdio === 'b' ? 'a' : null;
    const diferencia = Math.abs(h.a.puntos - h.b.puntos);
    await new Promise((ok) => {
      /* con el RELOJ de verdad, no sumando cuadros: en un teléfono lento los
         cuadros llegan de a cinco por segundo y el «2.5 segundos» se volvía 25 */
      let t = 0, ultimaChispa = 0, ultimoSacudon = 0, t0 = null;
      const quitar = cadaCuadro((dt, ahora) => {
        if(t0 === null) t0 = ahora;
        t = ahora - t0; const u = cl(t / DUELO);
        /* el empuje: va y viene, cada vez más fuerte hacia el que gana; si fue
           parejo (diferencia chica), se tarda más en decidir */
        const decide = gana ? suave(cl((u - .35) / .65)) * (gana === 'a' ? 1 : -1) * Math.min(1, .35 + diferencia / 30) : 0;
        /* empujones: cada ~0.4 s uno de los dos mete el hombro (un golpe seco
           que se regresa), y entre empujón y empujón tiemblan del esfuerzo */
        const golpe = Math.pow(Math.max(0, Math.sin(t * 15.7)), 6) * Math.sign(Math.sin(t * 7.85)) * .22 * (1 - u * .4);
        const vaiven = golpe + Math.sin(t * 31) * .025;
        const y = centro + (vaiven + decide * .5);
        const tiembla = .02 + .03 * u;
        cA.position.set(Math.sin(t * 41) * tiembla, y - medio, .8); cB.position.set(Math.sin(t * 37 + 1) * tiembla, y + medio, .8);
        cA.rotation.z = Math.sin(t * 7.85) * .12; cB.rotation.z = Math.sin(t * 7.85 + .6) * -.12;
        const apriete = 1 + Math.abs(golpe) * .35;
        cA.scale.setScalar(L.sMesa * apriete); cB.scale.setScalar(L.sMesa * (2 - apriete));
        ponNum(nA, cA, 'a'); ponNum(nB, cB, 'b');
        if(Math.abs(golpe) > .2 && t - ultimoSacudon > .3){ ultimoSacudon = t; sacudir(.05); SON.choque(); }
        if(t - ultimaChispa > .14){ ultimaChispa = t; chispas(new THREE.Vector3((Math.random() - .5) * .6, y, 1), { color: Math.random() < .5 ? '#FFE14A' : '#FF6BA6', cuantas: 14, fuerza: 2, vida: .5, tam: .07 }); SON.forcejeo(); }
        if(t >= DUELO){ quitar(); ok(); }
      });
    });

    /* 6 · El desenlace. */
    if(!gana){
      SON.choque(); aviso('¡Empate! Nadie recibe daño', { icono: 'img/iconos/information.png' });
      await Promise.all([animar({ dur: .4, ease: sale, cada: (u) => { cA.position.y = mezcla(cA.position.y, pA0.y, u); cB.position.y = mezcla(cB.position.y, pB0.y, u); } })]);
      reaccion('gesture-negative');
    } else {
      const ganadora = gana === 'a' ? cA : cB, perdedora = gana === 'a' ? cB : cA;
      const nGana = gana === 'a' ? nA : nB, nPierde = gana === 'a' ? nB : nA;
      /* la perdedora se ROMPE en pedazos */
      SON.rompe(); sacudir(.2);
      romper(perdedora);
      soltarNumero(nPierde);
      /* la que sobrevive cambia su número al daño (la diferencia, con tope de 15) */
      await contarNumero(nGana, gana === 'a' ? h.a.puntos : h.b.puntos, h.dano, ganadora, gana);
      /* …y vuela a la vida del rival a pegarle */
      const blanco = centroHud(gana === 'a' ? 'b' : 'a');
      const de = ganadora.position.clone(), sDe = ganadora.scale.x;
      const num = numeroVivo.n;
      await animar({ dur: .42, ease: entra, cada: (u) => {
        ganadora.position.set(mezcla(de.x, blanco.x, u), mezcla(de.y, blanco.y, u), mezcla(de.z, 1.4, u) + Math.sin(u * Math.PI) * .8);
        ganadora.scale.setScalar(mezcla(sDe, sDe * .5, u)); ganadora.rotation.z = u * (gana === 'a' ? -.6 : .6);
        num.position.set(ganadora.position.x, ganadora.position.y + (gana === 'a' ? 1 : -1) * .4, 1.6);
      } });
      SON.golpe(); sacudir(.25);
      chispas(blanco, { color: '#E5484D', cuantas: 90, fuerza: 4 });
      golpeHud(gana === 'a' ? 'b' : 'a', h.dano);
      ganadora.visible = false; soltarNumero(num);
      reaccion(gana === 'a' ? 'gesture-positive' : 'gesture-negative');
    }
    soltarNumero(nA); soltarNumero(nB);

    /* 7 · Todo lo jugado se va al cementerio, y se actualiza la mesa. */
    for(const m of [...mias, ...suyas, mEspA, mEspB].filter(Boolean)) quitarMalla(m.userData.carta.id);
    J = despues;
    /* y por si acaso: toda malla cuya carta ya no está en ninguna mano se va */
    const vivas = new Set([...J.a.mano, ...J.b.mano].map(c => c.id));
    for(const id of [...mallas.keys()]) if(!vivas.has(id)) quitarMalla(id);
    pintarHud(); pintarPilas();
    await esperar(.35);
    if(J.acabo){ termino = true; await fin(); return; }
    /* 8 · Al empezar tu turno, si te faltan cartas, se roban. */
    const robaA = nuevasDe('a'), robaB = nuevasDe('b');
    if(robaA.length) aviso('Robas ' + robaA.length + (robaA.length === 1 ? ' carta' : ' cartas'), { icono: 'img/iconos/plus.png', dura: 1.4 });
    await robar('b', robaB); await robar('a', robaA);
    pintarMano(true); pintarSuMano();
    ocupado = false;
    pistaTurno();
  }

  /* ── el número que cuenta del puntaje al daño ── */
  const numeroVivo = { n: null };
  async function contarNumero(n0, de, a, carta, lado){
    let actual = n0, ultimo = de;
    const pos = () => new THREE.Vector3(carta.position.x, carta.position.y + (lado === 'a' ? -1 : 1) * (CARTA_H * L.sMesa / 2 + .32), 1.3);
    await animar({ dur: .7, ease: sale, cada: (u) => {
      const v = Math.round(mezcla(de, a, u));
      if(v !== ultimo){ ultimo = v; const n = numero3d(v, { alto: .5, color: '#FFE14A' }); n.position.copy(pos()); raiz.add(n); soltarNumero(actual); actual = n; SON.toque(); }
    } });
    if(ultimo !== a){ const n = numero3d(a, { alto: .5, color: '#FFE14A' }); n.position.copy(pos()); raiz.add(n); soltarNumero(actual); actual = n; }
    /* un saltito: «éste es el daño» */
    const k = actual.scale.x;
    await animar({ dur: .35, ease: resorte, cada: (u) => actual.scale.setScalar(k * (1 + Math.sin(u * Math.PI) * .5)) });
    numeroVivo.n = actual;
  }

  function golpeHud(lado, dano){
    const hud = dom.querySelector(lado === 'a' ? '.hud--mio' : '.hud--suyo');
    hud.classList.remove('pegado'); void hud.offsetWidth; hud.classList.add('pegado');
    const f = document.createElement('b'); f.className = 'dano'; f.textContent = '−' + dano; hud.appendChild(f);
    setTimeout(() => f.remove(), 1300);
  }

  /* ── romper una carta: la cara en pedazos que salen volando ── */
  function romper(m){
    const tex = m.userData.mf.map, n = 4, k = 5, w = CARTA_W / n, hh = CARTA_H / k;
    const s = m.scale.x, base = m.position.clone();
    m.visible = false;
    for(let i = 0; i < n; i++) for(let j = 0; j < k; j++){
      const g = new THREE.PlaneGeometry(w, hh), uv = g.attributes.uv;
      for(let q = 0; q < uv.count; q++) uv.setXY(q, (i + uv.getX(q)) / n, (j + uv.getY(q)) / k);
      const p = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
      p.scale.setScalar(s);
      p.position.set(base.x + (-CARTA_W / 2 + (i + .5) * w) * s, base.y + (-CARTA_H / 2 + (j + .5) * hh) * s, base.z);
      raiz.add(p);
      const v = new THREE.Vector3((i - n / 2 + .5) * (1 + Math.random()), (j - k / 2 + .5) * .8 + 1.5 * Math.random(), 2 + Math.random() * 2);
      const rot = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      let t = 0;
      const quitar = cadaCuadro((dt) => {
        t += dt; v.y -= 9 * dt;
        p.position.addScaledVector(v, dt); p.rotation.x += rot.x * dt; p.rotation.y += rot.y * dt; p.rotation.z += rot.z * dt;
        p.material.opacity = cl(1 - (t - .5) / .6);
        if(t > 1.1){ quitar(); p.removeFromParent(); g.dispose(); p.material.dispose(); }
      });
    }
    chispas(base, { color: '#FFF0F6', cuantas: 50, fuerza: 3 });
  }

  /* ═══ EL FINAL ═══ */
  async function fin(){
    const gane = J.acabo === 'a', empate = J.acabo === 'empate';
    const paga = pagarPartida(gane ? 'gana' : empate ? 'empata' : 'pierde', J.ronda - 1);
    (gane ? SON.gana : SON.pierde)();
    cerdo.hacer(gane ? 'dance' : 'gesture-negative');
    const f = $('[data-fin]');
    f.innerHTML = `<h2>${gane ? '¡Ganaste!' : empate ? 'Empate' : 'Perdiste'}</h2>
      <p>${J.porCartas ? 'Se acabaron las cartas. ' : ''}${J.a.pv} contra ${J.b.pv} de vida</p>
      <p class="paga"><img alt="" src="img/iconos/moneda.png"> +${paga.total} monedas${paga.bono ? ` <small>(incluye ${paga.bono} por tu primera victoria del día)</small>` : ''}</p>
      <div class="abrir__botones"><button class="btn grande" data-otra>Otra partida</button><button class="btn" data-tienda>A la tienda</button><button class="btn suave" data-inicio>Al inicio</button></div>`;
    f.hidden = false; requestAnimationFrame(() => f.classList.add('ve'));
    const salida = await new Promise((ok) => {
      f.querySelector('[data-otra]').onclick = () => ok('otra');
      f.querySelector('[data-tienda]').onclick = () => ok('tienda');
      f.querySelector('[data-inicio]').onclick = () => ok('inicio');
    });
    cerrar(); alTerminar && alTerminar(salida);
  }

  /* ── salir a media partida: segundo toque para confirmar ── */
  let salirUna = 0;
  $('[data-salir]').onclick = () => {
    if(Date.now() - salirUna < 2500){ cerrar(); alTerminar && alTerminar('inicio'); return; }
    salirUna = Date.now(); aviso('Toca otra vez la ✕ para salir de la partida', { icono: 'img/iconos/cross.png' });
  };

  function cerrar(){
    enCurso = false;            /* «Otra partida» arranca otra desde aquí mismo */
    delete globalThis.__mesa;
    quitarPista();
    for(const f of limpieza) f();
    cerdo.soltar();
    E.s.remove(raiz); dom.remove();
  }

  async function volar(m, d, retraso = 0){
    const p0 = m.position.clone(), s0 = m.scale.x, ry0 = m.rotation.y, rz0 = m.rotation.z;
    await animar({ dur: .42, retraso, ease: suave, cada: (u) => {
      m.position.set(mezcla(p0.x, d.x, u), mezcla(p0.y, d.y, u), mezcla(p0.z, d.z, u) + Math.sin(u * Math.PI) * .6);
      m.scale.setScalar(mezcla(s0, d.s, u)); m.rotation.set(0, mezcla(ry0, d.ry, u), mezcla(rz0, d.rz || 0, u));
    } });
  }
}

/* Las sacudidas se SUMAN sobre la posición de reposo de la cámara: si cada una
   tomara «donde está ahora» como reposo, dos seguidas dejarían la cámara chueca. */
let camReposo = null, sacudidas = 0;
function sacudir(fuerza){
  if(!camReposo) camReposo = E.cam.position.clone();
  sacudidas++;
  animar({ dur: .4, ease: (u) => u, cada: (u) => { const k = fuerza * (1 - u); E.cam.position.set(camReposo.x + (Math.random() - .5) * k, camReposo.y + (Math.random() - .5) * k, camReposo.z); } })
    .then(() => { if(--sacudidas === 0){ E.cam.position.copy(camReposo); camReposo = null; } });
}
