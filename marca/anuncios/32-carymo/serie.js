/* LA SERIE DE CARYMO (paquete del inversionista: CARYMO 1–5). Cada video es una carpeta con su guion.json, su voz y
   un index.html de tres renglones que llama montar(CONFIG). Aquí vive todo lo demás: el teléfono que pasa las
   grabaciones DE VERDAD de la app (carymo/anuncio/grabar.mjs → carymo/anuncio/rec/<toma>, contenido de ejemplo),
   los titulares, la entrada con el logo de CARYMO y el cierre con el crédito que pidió Carlos:
   «Hecho por Grupo Mazi · dedicado con amor para Mónica». Sin otro logo: CARYMO es la marca aquí.

   CONFIG = {
     dur, musica,                                   // como en window.VIDEO
     gancho: { a, b, html },                        // titular grande del principio (antes del logo)
     logo: { a, b },                                // CARYMO grande, con su nombre
     escenas: [{ a, b, toma, desde, hasta, tit, chip }],  // el teléfono con un pedazo de una grabación
     extra: [{ a, b, html }],                       // titulares sueltos al centro (sin teléfono)
     cierre: { a, frase },                          // logo + frase + crédito
     sonidos: [[archivo, t, vol]],                  // efectos aparte
   } */
import { guion, sonidosVoz, tramo, sale, entra, resorte, cl } from '../motor.js';
const $ = (s) => document.querySelector(s);
const ver = (el, a) => { el.style.visibility = a > .001 ? 'visible' : 'hidden'; el.style.opacity = a; };
export const fx = (n) => `../../../herramientas/video/efectos/${n}.wav`;
const REC = '../../../carymo/anuncio/rec/';

const CSS = `
  html,body{ margin:0; background:#0E0618 }
  #v{ position:relative; width:1080px; height:1920px; overflow:hidden; color:#fff; font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
    background:radial-gradient(110% 70% at 50% 30%, #2A1640 0%, #170A26 55%, #0B0513 100%) }
  .luz{ position:absolute; border-radius:50%; filter:blur(110px); opacity:.55 }
  #l1{ width:760px; height:760px; background:#7E1735; left:-260px; top:1100px }
  #l2{ width:660px; height:660px; background:#AC27FF; right:-260px; top:180px; opacity:.35 }
  #l3{ width:420px; height:420px; background:#E8B54A; left:300px; top:1500px; opacity:.12 }
  .tit{ position:absolute; left:60px; right:60px; top:120px; z-index:8; text-align:center; font-weight:900; font-size:88px; line-height:1.02;
    letter-spacing:-.04em; visibility:hidden }
  .tit em{ font-style:normal; color:#C77DFF }
  .gran{ position:absolute; left:60px; right:60px; top:0; bottom:0; z-index:8; display:flex; align-items:center; justify-content:center; text-align:center;
    font-weight:900; font-size:116px; line-height:1.02; letter-spacing:-.045em; visibility:hidden }
  .gran em{ font-style:normal; color:#C77DFF } .gran small{ display:block; font-size:52px; font-weight:700; letter-spacing:-.01em; color:#D9CBE6; margin-top:34px }
  #tel{ position:absolute; left:240px; top:470px; width:600px; height:1298px; border-radius:80px; background:#0c0c10; z-index:5;
    box-shadow:0 0 0 3px #4a2d66, 0 0 90px rgba(172,39,255,.25), 0 50px 120px rgba(0,0,0,.55); visibility:hidden }
  #tel .pant{ position:absolute; inset:16px; border-radius:66px; overflow:hidden; background:#170A26 }
  #tel .pant img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:top }
  #tel .isla{ position:absolute; left:50%; top:30px; width:150px; height:42px; margin-left:-75px; border-radius:30px; background:#0c0c10; z-index:2 }
  .chip{ position:absolute; z-index:9; left:540px; top:1792px; padding:20px 34px; border-radius:999px; background:#fff; color:#170A26; font-weight:800;
    font-size:40px; box-shadow:0 14px 40px rgba(0,0,0,.35); white-space:nowrap; visibility:hidden }
  .chip b{ color:#7E1735 }
  #logo{ position:absolute; inset:0; z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:30px; visibility:hidden }
  #logo img{ width:620px; filter:drop-shadow(0 30px 80px rgba(172,39,255,.45)) }
  #fin{ position:absolute; inset:0; z-index:20; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:40px; visibility:hidden;
    background:radial-gradient(120% 80% at 50% 40%, #2C1145 0%, #170A26 60%, #0E0618 100%) }
  #fin img{ width:560px; filter:drop-shadow(0 30px 80px rgba(172,39,255,.45)) }
  #finFrase{ font-weight:900; font-size:80px; letter-spacing:-.04em; text-align:center; line-height:1.05; padding:0 60px }
  #finFrase em{ font-style:normal; color:#C77DFF }
  #credito{ position:absolute; left:0; right:0; bottom:120px; text-align:center; font-size:32px; font-weight:600; color:#B3A5C4; letter-spacing:.01em }
`;

export async function montar(C){
  document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
  document.body.innerHTML = `<div id="v">
    <div class="luz" id="l1"></div><div class="luz" id="l2"></div><div class="luz" id="l3"></div>
    ${C.gancho ? `<div class="gran" id="gancho"><div>${C.gancho.html}</div></div>` : ''}
    ${(C.extra || []).map((x, i) => `<div class="gran" id="x${i}"><div>${x.html}</div></div>`).join('')}
    ${C.escenas.map((e, i) => `<div class="tit" id="t${i}">${e.tit}</div>${e.chip ? `<div class="chip" id="c${i}">${e.chip}</div>` : ''}`).join('')}
    <div id="tel"><div class="isla"></div><div class="pant"><img id="cuadro"></div></div>
    <div id="logo"><img src="../../../carymo/marca/logo-1024.png"></div>
    <div id="fin"><img src="../../../carymo/marca/logo-1024.png"><div id="finFrase">${C.cierre.frase}</div>
      <div id="credito">Hecho por Grupo Mazi · dedicado con amor para Mónica</div></div>
  </div>`;
  const tomas = {};
  for(const e of C.escenas) if(!tomas[e.toma]) tomas[e.toma] = await (await fetch(REC + e.toma + '.json')).json();
  /* desde/hasta pueden ser segundos o el nombre de una marca de la grabación (con +/- segundos: 'camino+0.5') */
  const seg = (toma, v) => typeof v === 'number' ? v : (() => { const [m, d] = String(v).split(/(?=[+-])/); return tomas[toma].marcas[m] + (Number(d) || 0); })();
  for(const e of C.escenas){ e.d0 = seg(e.toma, e.desde); e.d1 = seg(e.toma, e.hasta); }

  window.G = await guion('.');
  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  await document.fonts.ready;
  const TEL0 = C.escenas[0].a, TEL1 = C.escenas[C.escenas.length - 1].b;

  window.pintar = async (t) => {
    $('#l1').style.transform = `translate(${Math.sin(t * .3) * 40}px, ${Math.cos(t * .25) * 30}px)`;
    $('#l2').style.transform = `translate(${Math.cos(t * .2) * 40}px, ${Math.sin(t * .3) * 30}px)`;
    $('#l3').style.transform = `translate(${Math.sin(t * .17) * 60}px, ${Math.cos(t * .21) * 20}px)`;

    const grande = (el, a, b) => { const dentro = t >= a && t < b, e = tramo(t, a, a + .55), s = entra(tramo(t, b - .35, b));
      ver(el, dentro ? sale(e) * (1 - s) : 0); el.style.transform = `translateY(${(1 - resorte(e)) * 70 - s * 40}px) scale(${.9 + .1 * resorte(e)})`;
      const sm = el.querySelector('small'); if(sm) sm.style.opacity = sale(tramo(t, a + .5, a + .9)); };
    if(C.gancho) grande($('#gancho'), C.gancho.a, C.gancho.b);
    (C.extra || []).forEach((x, i) => grande($('#x' + i), x.a, x.b));

    /* el logo de CARYMO, grande, que llega con rebote y respira */
    if(C.logo){ const { a, b } = C.logo, dentro = t >= a && t < b, e = resorte(tramo(t, a, a + .8)), s = entra(tramo(t, b - .35, b));
      ver($('#logo'), dentro ? sale(tramo(t, a, a + .3)) * (1 - s) : 0);
      $('#logo img').style.transform = `scale(${(.6 + .4 * e) * (1 + Math.sin(t * 2.2) * .015)}) rotate(${(1 - e) * -6}deg)`; }

    /* el teléfono: sube al empezar la primera escena y se va al terminar la última */
    const enT = resorte(tramo(t, TEL0, TEL0 + .7)), salT = entra(tramo(t, TEL1 - .45, TEL1));
    ver($('#tel'), t >= TEL0 && t < TEL1 ? 1 : 0);
    $('#tel').style.transform = `translateY(${(1 - enT) * 1500 - salT * 1700 + Math.sin(t * 1.1) * 7}px)`;
    let src = null;
    C.escenas.forEach((e, i) => {
      const dentro = t >= e.a && t < e.b, el = $('#t' + i);
      const en = tramo(t, e.a, e.a + .5), s = entra(tramo(t, e.b - .3, e.b));
      ver(el, dentro ? sale(en) * (1 - s) : 0); el.style.transform = `translateY(${(1 - resorte(en)) * 50 - s * 30}px)`;
      if(e.chip){ const c = $('#c' + i), ce = tramo(t, e.a + 1.0, e.a + 1.45), cs = entra(tramo(t, e.b - .35, e.b));
        ver(c, dentro ? sale(ce) * (1 - cs) : 0); c.style.transform = `translateX(-50%) scale(${resorte(ce)}) translateY(${Math.sin(t * 1.8 + i) * 6}px)`; }
      if(dentro){
        /* el pedazo de la grabación se estira o se aprieta para caber en la escena, sin pasar de 1.7 veces */
        const vel = Math.min(1.7, (e.d1 - e.d0) / (e.b - e.a)), r = tomas[e.toma];
        const k = cl(Math.round((e.d0 + (t - e.a) * vel) * r.fps), 0, r.cuadros - 1);
        src = `${REC}${e.toma}/${String(k).padStart(5, '0')}.jpg`;
      }
    });
    if(src && $('#cuadro').getAttribute('src') !== src){ $('#cuadro').setAttribute('src', src); await $('#cuadro').decode().catch(() => {}); }

    /* cierre: el logo, la frase y el crédito */
    const f = C.cierre.a, g = sale(tramo(t, f, f + .5)); ver($('#fin'), g);
    const le = resorte(tramo(t, f + .1, f + .9)); $('#fin img').style.transform = `scale(${(.7 + .3 * le) * (1 + Math.sin(t * 2.2) * .015)})`;
    const fr = tramo(t, f + .7, f + 1.2); $('#finFrase').style.opacity = sale(fr); $('#finFrase').style.transform = `translateY(${(1 - resorte(fr)) * 40}px)`;
    $('#credito').style.opacity = sale(tramo(t, f + 1.6, f + 2.2));
  };
  window.VIDEO = { w: 1080, h: 1920, fps: 30, dur: C.dur, musica: C.musica,
    get sonidos(){ return [...sonidosVoz(window.G, 1.05), ...(C.sonidos || []),
      ...C.escenas.map((e) => [fx('whoosh'), e.a, .3]), [fx('whoosh'), C.cierre.a, .35], [fx('golpe'), C.cierre.a + .4, .45]]; } };
}
