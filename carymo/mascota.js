/* mascota.js — EL TIGRE BLANCO Y LA PALOMA MORADA, VIVOS
 * ===========================================================================
 * Carlos, 13 nov: «vamos a convertirlos en mascotas animadas de verdad», con sus
 * dos hojas de personajes. Las poses salen RECORTADAS de sus hojas (carymo/
 * mascotas/, el recorte está en LEEME): aquí no se dibuja nada, se anima.
 *
 *   const m = crearMascota(caja, { personaje: 'tigre' });
 *   m.play('bien')            // reacciona a algo de la app
 *   m.play('festeja', { decir: '¡Lo lograste!' })
 *   m.personaje('paloma')
 *
 * Cómo se siente vivo sin piezas articuladas: cada cambio de pose pasa por un
 * APLASTÓN (anticipación) y la pose nueva entra en el rebote; encima va un
 * movimiento propio de cada estado (brincos, temblor, aleteo, respiración), con
 * la Web Animations API, que se interrumpe limpio. Quieta nunca: respira, y cada
 * tantos segundos hace algo chiquito por su cuenta.
 * ===========================================================================*/

const BASE = new URL('./mascotas/', import.meta.url).href;
const src = (n) => `${BASE}${n}.webp`;

/* qué pose usa cada estado, por personaje (varias = escoge una distinta cada vez) */
const POSES = {
  tigre: {
    quieto: ['parado'], saluda: ['saluda'], bien: ['pulgar', 'brinca'], festeja: ['brinca', 'sorpresa'], mal: ['asustado', 'llora'],
    triste: ['llora'], enojado: ['enojado', 'agachado'], sorpresa: ['sorpresa'], duerme: ['duerme'], sueno: ['sueno'],
    corre: ['corre'], piensa: ['sentado'], amor: ['parado'], estudia: ['mochila'], calma: ['sentado'], juega: ['estira', 'panza'], espalda: ['espalda'],
  },
  paloma: {
    quieto: ['parada'], saluda: ['saluda'], bien: ['emocionada', 'alas'], festeja: ['festeja', 'bandera'], mal: ['triste', 'sorpresa'],
    triste: ['llora', 'triste'], enojado: ['aburrida'], sorpresa: ['sorpresa'], duerme: ['duerme'], sueno: ['aburrida'],
    corre: ['camina'], vuela: ['alas'], piensa: ['lee'], amor: ['amor'], estudia: ['lee'], calma: ['corbata'], juega: ['camina'], espalda: ['parada'],
  },
};
/* lo que sale flotando encima (iconos de la misma hoja) */
const ICONO = { bien: ['estrella', 'bien'], festeja: ['estrella', 'corona', 'trofeo'], mal: ['gotas'], triste: ['gotas'], enojado: ['enojo'],
  sorpresa: ['alerta'], piensa: ['duda', 'puntos'], amor: ['corazon'], mareo: ['mareo'] };
/* cuánto dura cada reacción antes de volver a «quieto» (0 = se queda) */
const DURA = { saluda: 2600, bien: 2200, festeja: 3400, mal: 2600, triste: 3200, enojado: 2400, sorpresa: 1800, piensa: 0, amor: 2600,
  corre: 2400, vuela: 2600, juega: 2600, duerme: 0, sueno: 0, estudia: 0, calma: 0, quieto: 0, espalda: 1800 };

const quieta = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch{ return false; } };
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const r = (a, b) => a + Math.random() * (b - a);

let estiloPuesto = false;
function ponerEstilo(){
  if(estiloPuesto) return; estiloPuesto = true;
  const s = document.createElement('style');
  s.textContent = `
  .masc{ position:relative; width:var(--tam,120px); height:calc(var(--tam,120px) * 1.15); display:inline-block; pointer-events:auto; -webkit-tap-highlight-color:transparent; touch-action:manipulation }
  .masc-sombra{ position:absolute; left:18%; right:18%; bottom:2%; height:9%; border-radius:50%; background:radial-gradient(#0000004d, transparent 70%) }
  .masc-mueve{ position:absolute; inset:0; transform-origin:50% 100% }
  .masc-cuerpo{ position:absolute; inset:0; transform-origin:50% 100% }
  .masc-cuerpo img{ position:absolute; left:50%; bottom:4%; max-width:100%; max-height:96%; translate:-50% 0; user-select:none; -webkit-user-drag:none; filter:drop-shadow(0 3px 2px #0003) }
  .masc-cuerpo img.sale{ opacity:0 }
  .masc-fx{ position:absolute; inset:-30% -30% 0; pointer-events:none; overflow:visible }
  .masc-fx img{ position:absolute; width:calc(var(--tam,120px) * .24); height:auto; will-change:transform, opacity }
  .masc-globo{ position:absolute; left:50%; bottom:100%; translate:-50% 0; margin-bottom:4px; max-width:200px; width:max-content; padding:8px 12px; border-radius:14px;
    background:#fff; color:#2A1240; font:700 13px/1.3 system-ui, sans-serif; box-shadow:0 6px 18px #0004; pointer-events:none; opacity:0; text-align:center }
  .masc-globo::after{ content:""; position:absolute; left:50%; top:100%; translate:-50% -1px; border:7px solid transparent; border-top-color:#fff }
  `;
  document.head.append(s);
}

export function crearMascota(caja, op = {}){
  ponerEstilo();
  let quien = op.personaje === 'paloma' ? 'paloma' : 'tigre';
  const el = document.createElement('div'); el.className = 'masc'; if(op.tam) el.style.setProperty('--tam', op.tam + 'px');
  el.setAttribute('role', 'img');
  el.innerHTML = '<div class="masc-sombra"></div><div class="masc-mueve"><div class="masc-cuerpo"></div></div><div class="masc-fx"></div><div class="masc-globo" aria-live="polite"></div>';
  caja.append(el);
  const mueve = el.querySelector('.masc-mueve'), cuerpo = el.querySelector('.masc-cuerpo'), fx = el.querySelector('.masc-fx'), globo = el.querySelector('.masc-globo'), sombra = el.querySelector('.masc-sombra');
  let img = null, poseActual = '', estado = 'quieto', vuelta = 0, aire = null, travesura = 0, respira = null, globoT = 0;
  const precargadas = new Set();
  function precargar(lista){ for(const p of lista){ const k = quien + '-' + p; if(precargadas.has(k)) continue; precargadas.add(k); const i = new Image(); i.src = src(k); } }
  precargar(Object.values(POSES[quien]).flat());

  /* la pose cambia en lo más bajo del aplastón: así se lee como un movimiento, no como un corte */
  async function pose(nombre, conAplaston = true){
    if(nombre === poseActual && img) return;
    poseActual = nombre;
    const nueva = new Image(); nueva.alt = ''; nueva.src = src(quien + '-' + nombre); nueva.draggable = false;
    try{ await nueva.decode(); }catch{}
    if(quieta() || !img || !conAplaston){ cuerpo.replaceChildren(nueva); img = nueva; return; }
    const baja = cuerpo.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.12,.84)' }], { duration: 110, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    await baja.finished.catch(() => {});
    cuerpo.replaceChildren(nueva); img = nueva;
    cuerpo.animate([{ transform: 'scale(1.12,.84)' }, { transform: 'scale(.94,1.08)', offset: .45 }, { transform: 'scale(1.03,.98)', offset: .75 }, { transform: 'scale(1,1)' }],
      { duration: 420, easing: 'cubic-bezier(.3,1.4,.4,1)', fill: 'forwards' });
  }

  /* respirar: siempre, debajo de todo lo demás */
  function respirar(lento = 1){
    respira?.cancel();
    if(quieta()) return;
    respira = mueve.animate([{ transform: 'scale(1,1)' }, { transform: `scale(${1 - .012},${1 + .025})` }, { transform: 'scale(1,1)' }],
      { duration: 2600 * lento, iterations: Infinity, easing: 'ease-in-out', composite: 'add' });
  }

  function iconoSube(nombre, { x = r(.25, .75), retraso = 0, lejos = 1 } = {}){
    if(quieta()) return;
    const i = new Image(); i.src = src('icono-' + nombre); i.alt = '';
    i.style.left = `${x * 100}%`; i.style.top = '38%'; i.style.opacity = '0';
    fx.append(i);
    const dx = r(-30, 30) * lejos, dy = -r(55, 95) * lejos, gira = r(-25, 25);
    i.animate([{ transform: 'translate(-50%,0) scale(.2) rotate(0)', opacity: 0 }, { transform: `translate(calc(-50% + ${dx * .4}px),${dy * .5}px) scale(1.15) rotate(${gira * .5}deg)`, opacity: 1, offset: .3 },
      { transform: `translate(calc(-50% + ${dx}px),${dy}px) scale(.9) rotate(${gira}deg)`, opacity: 0 }],
      { duration: r(1100, 1500), delay: retraso, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.then(() => i.remove(), () => i.remove());
  }
  function lluvia(nombres, n = 7){ for(let k = 0; k < n; k++) iconoSube(azar(nombres), { x: r(.05, .95), retraso: k * 70, lejos: r(1, 1.7) }); }

  function decir(texto, ms = 2400){
    clearTimeout(globoT);
    if(!texto){ globo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }); return; }
    globo.textContent = texto;
    globo.animate([{ opacity: 0, transform: 'translateY(6px) scale(.8)' }, { opacity: 1, transform: 'translateY(0) scale(1.04)', offset: .7 }, { opacity: 1, transform: 'none' }],
      { duration: 260, easing: 'cubic-bezier(.3,1.5,.4,1)', fill: 'forwards' });
    globoT = setTimeout(() => decir(''), ms);
  }

  /* el movimiento propio de cada estado */
  function moverse(e){
    aire?.cancel(); aire = null;
    if(quieta()) return;
    const A = (kf, o) => (aire = mueve.animate(kf, { fill: 'none', ...o }));
    if(e === 'bien' || e === 'saluda'){
      A([{ transform: 'translateY(0)' }, { transform: 'translateY(-16%)', offset: .35 }, { transform: 'translateY(0)', offset: .6 }, { transform: 'translateY(-6%)', offset: .8 }, { transform: 'translateY(0)' }], { duration: 900, easing: 'ease-out' });
      sombra.animate([{ transform: 'scale(1)' }, { transform: 'scale(.7)', offset: .35 }, { transform: 'scale(1)', offset: .6 }, { transform: 'scale(1)' }], { duration: 900 });
    } else if(e === 'festeja'){
      A([{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-24%) rotate(-6deg)', offset: .2 }, { transform: 'translateY(0) rotate(0)', offset: .38 },
        { transform: 'translateY(-20%) rotate(7deg)', offset: .58 }, { transform: 'translateY(0) rotate(0)', offset: .76 }, { transform: 'translateY(-8%)', offset: .88 }, { transform: 'translateY(0)' }],
        { duration: 1700, easing: 'ease-in-out' });
    } else if(e === 'mal' || e === 'triste'){
      A([{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(4%) rotate(-4deg) scale(1.03,.95)', offset: .4 }, { transform: 'translateY(3%) rotate(3deg) scale(1.02,.96)', offset: .7 }, { transform: 'translateY(0) rotate(0)' }],
        { duration: 1600, easing: 'ease-in-out' });
    } else if(e === 'enojado'){
      A([0, -5, 5, -4, 4, -2, 0].map((x) => ({ transform: `translateX(${x}%)` })), { duration: 520, iterations: 2 });
    } else if(e === 'sorpresa'){
      A([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14%) scale(.9,1.14)', offset: .25 }, { transform: 'translateY(0) scale(1.08,.92)', offset: .55 }, { transform: 'none' }],
        { duration: 700, easing: 'cubic-bezier(.3,1.5,.4,1)' });
    } else if(e === 'corre'){
      A([{ transform: 'translateX(0)' }, { transform: 'translateX(-35%) translateY(-4%)', offset: .25 }, { transform: 'translateX(-35%)', offset: .3 }, { transform: 'translateX(35%) translateY(-4%)', offset: .7 },
        { transform: 'translateX(35%)', offset: .75 }, { transform: 'translateX(0)' }], { duration: 2200, easing: 'ease-in-out' });
    } else if(e === 'vuela'){
      A([{ transform: 'translateY(0)' }, { transform: 'translateY(-22%)', offset: .5 }, { transform: 'translateY(0)' }], { duration: 1300, iterations: 2, easing: 'ease-in-out' });
      cuerpo.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.06,.95)' }, { transform: 'scale(1,1)' }], { duration: 180, iterations: 12 });
    } else if(e === 'amor'){
      A([{ transform: 'rotate(0)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], { duration: 1400, easing: 'ease-in-out' });
    } else if(e === 'piensa'){
      A([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(0)' }], { duration: 2400, iterations: Infinity, easing: 'ease-in-out' });
    } else if(e === 'juega'){
      A([{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg) translateY(-6%)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 1200, iterations: 2, easing: 'ease-in-out' });
    }
  }

  /* por su cuenta: cada tanto, algo chiquito para que nunca se vea pegada */
  function travieso(){
    clearTimeout(travesura);
    travesura = setTimeout(() => {
      if(document.hidden || estado !== 'quieto' || quieta()){ travieso(); return; }
      const t = azar(['salto', 'mira', 'pose', 'pose']);
      if(t === 'salto') moverse('bien');
      else if(t === 'mira') mueve.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)', offset: .3 }, { transform: 'rotate(-6deg)', offset: .7 }, { transform: 'rotate(0)' }], { duration: 1600, easing: 'ease-in-out' });
      else { const p = azar(['saluda', 'calma', 'piensa']); const yo = ++vuelta; pose(azar(POSES[quien][p])).then(() => setTimeout(() => { if(yo === vuelta && estado === 'quieto') pose(POSES[quien].quieto[0]); }, 1800)); }
      travieso();
    }, r(7000, 12000));
  }

  /* play: la interfaz pública. Regresa una promesa que se cumple al volver a «quieto» */
  async function play(e, op2 = {}){
    if(!POSES[quien][e]) e = 'quieto';
    const yo = ++vuelta; estado = e;
    const lista = POSES[quien][e], p = lista.length > 1 ? azar(lista.filter((x) => x !== poseActual).length ? lista.filter((x) => x !== poseActual) : lista) : lista[0];
    await pose(p);
    if(yo !== vuelta) return;
    moverse(e);
    respirar(e === 'duerme' || e === 'sueno' ? 1.8 : 1);
    if(ICONO[e]) e === 'festeja' ? lluvia(ICONO.festeja, 9) : [0, 1, 2].slice(0, e === 'bien' ? 3 : 1).forEach((k) => iconoSube(azar(ICONO[e]), { retraso: k * 140 }));
    if(op2.decir) decir(op2.decir, op2.decirMs || 2400);
    const dura = op2.dura ?? DURA[e] ?? 0;
    if(dura > 0) await new Promise((ok) => setTimeout(ok, dura));
    if(dura > 0 && yo === vuelta){ estado = 'quieto'; await pose(POSES[quien].quieto[0]); respirar(); }
  }

  /* tocarla también reacciona (y nunca dos veces lo mismo seguido) */
  let ultimoToque = '';
  el.addEventListener('click', () => {
    const op3 = ['saluda', 'bien', 'amor', 'juega', 'sorpresa'].filter((x) => x !== ultimoToque); ultimoToque = azar(op3);
    play(ultimoToque); op.alTocar && op.alTocar(ultimoToque);
  });
  document.addEventListener('visibilitychange', () => { if(document.hidden){ respira?.pause(); } else respira?.play(); });

  pose(POSES[quien].quieto[0], false).then(() => { respirar(); travieso(); });
  el.setAttribute('aria-label', quien === 'tigre' ? 'Tu tigre' : 'Tu paloma');

  return {
    el, play, decir, lluvia, icono: iconoSube,
    get estado(){ return estado; }, get pose(){ return poseActual; }, get quien(){ return quien; },
    personaje(p){ if(p !== 'tigre' && p !== 'paloma' || p === quien) return; quien = p; poseActual = ''; precargar(Object.values(POSES[quien]).flat()); el.setAttribute('aria-label', quien === 'tigre' ? 'Tu tigre' : 'Tu paloma'); play('saluda'); },
    destruir(){ clearTimeout(travesura); clearTimeout(globoT); respira?.cancel(); aire?.cancel(); el.remove(); },
  };
}
export const ESTADOS = Object.keys(POSES.tigre).concat('vuela');
