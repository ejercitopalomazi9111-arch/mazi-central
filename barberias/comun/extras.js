/* LO QUE COMPARTEN LAS PÁGINAS DE BARBERÍA ADEMÁS DE LA AGENDA Y LA TIENDA: el revelado al bajar (con red de
   seguridad: si algo falla, a los 2.5 s se ve todo igual), el mapa con «cómo llegar», el test de «tu corte ideal»,
   la tarjeta que se inclina con el dedo, el QR para el póster del local y la promo del día con su reloj. */
import { ico } from './iconos.js';
import { pesos } from './agenda.js';

/* ── revelar: lo que entra a la pantalla sube y aparece. Nunca deja nada escondido ── */
export function revelar(sel = '[data-rev]'){
  const els = [...document.querySelectorAll(sel)];
  const ya = (e) => e.classList.add('ya');
  if(!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches){ els.forEach(ya); return; }
  const io = new IntersectionObserver((es) => es.forEach(e => { if(e.isIntersecting){ ya(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
  /* red de seguridad: lo que ya pasó arriba (un salto con el índice, un ancla) se enciende igual */
  const barrer = () => els.forEach(e => { if(!e.classList.contains('ya') && e.getBoundingClientRect().top < innerHeight) ya(e); });
  addEventListener('scroll', barrer, { passive: true }); setTimeout(barrer, 2500);
  return { observar: (e) => io.observe(e) };
}

/* ── el mapa: Google Maps sin llave, oscurecido si la página es oscura, y los tres botones de cómo llegar ── */
export function mapa(el, { nombre, direccion, q = direccion, oscuro = false, notas = [] }){
  const enc = encodeURIComponent(q);
  el.innerHTML = `<div class="mp-mapa${oscuro ? ' mp-oscuro' : ''}"><iframe title="Mapa: ${nombre}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${enc}&z=16&output=embed"></iframe>
      <div class="mp-pin" aria-hidden="true">${ico('map-pin', 26)}</div></div>
    <div class="mp-dir"><b>${nombre}</b><span>${direccion}</span></div>
    <div class="mp-ir"><a href="https://www.google.com/maps/dir/?api=1&destination=${enc}" target="_blank" rel="noopener">${ico('navigation', 18)} Google Maps</a>
      <a href="https://waze.com/ul?q=${enc}&navigate=yes" target="_blank" rel="noopener">${ico('route', 18)} Waze</a>
      <a href="https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${enc}" target="_blank" rel="noopener">${ico('car-taxi-front', 18)} Uber</a></div>
    ${notas.length ? `<ul class="mp-notas">${notas.map(([i, t]) => `<li>${ico(i, 18)}<span>${t}</span></li>`).join('')}</ul>` : ''}`;
}
export const CSS_MAPA = `
.mp-mapa{ position:relative; aspect-ratio:4/3; border-radius:var(--mp-radio, 18px); overflow:hidden; background:#0002; border:1px solid var(--mp-linea, #0000001a) }
@media (min-width:900px){ .mp-mapa{ aspect-ratio:16/10 } }
.mp-mapa iframe{ position:absolute; inset:0; width:100%; height:100%; border:0 }
.mp-oscuro iframe{ filter:invert(.92) hue-rotate(180deg) saturate(.6) brightness(.9) contrast(.95) }
.mp-pin{ position:absolute; left:50%; top:50%; transform:translate(-50%, -100%); color:var(--mp-acento, #c00); filter:drop-shadow(0 6px 10px #0008); pointer-events:none; animation:mpBota 2.4s ease-in-out infinite }
@keyframes mpBota{ 50%{ transform:translate(-50%, -115%) } }
.mp-dir{ display:grid; gap:2px; margin:16px 0 12px } .mp-dir b{ font-size:18px } .mp-dir span{ color:var(--mp-suave, #666) }
.mp-ir{ display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px }
.mp-ir a{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; min-height:64px; border-radius:14px; border:1px solid var(--mp-linea, #0000001a); text-decoration:none; font-size:13px; font-weight:700 }
.mp-notas{ list-style:none; padding:0; margin:14px 0 0; display:grid; gap:10px } .mp-notas li{ display:flex; gap:10px; align-items:flex-start; color:var(--mp-suave, #666); font-size:14px } .mp-notas svg{ flex-shrink:0; color:var(--mp-acento, #c00); margin-top:1px }
@media (prefers-reduced-motion:reduce){ .mp-pin{ animation:none } }
`;

/* ── tu corte ideal: tres preguntas → corte, barbero y producto. Todo sale del catálogo de la página ── */
export function quiz(el, { preguntas, resultado, alReservar }){
  let k = 0; const r = [];
  const pinta = () => {
    if(k < preguntas.length){ const p = preguntas[k];
      el.innerHTML = `<div class="qz-paso"><span>Pregunta ${k + 1} de ${preguntas.length}</span><div class="qz-barra"><i style="width:${(k / preguntas.length) * 100}%"></i></div></div>
        <h3 class="qz-q">${p.q}</h3><div class="qz-ops">${p.ops.map((o, i) => `<button type="button" data-o="${i}">${o.ico ? ico(o.ico, 22) : ''}<span>${o.t}</span></button>`).join('')}</div>`;
      return; }
    const x = resultado(r);
    el.innerHTML = `<div class="qz-res"><span class="qz-ojo">Tu corte ideal</span><h3>${x.corte}</h3><p>${x.porque}</p>
      <div class="qz-mini">${x.barbero ? `<div>${ico('user-round', 18)}<span>Con <b>${x.barbero}</b></span></div>` : ''}${x.producto ? `<div>${ico('sparkles', 18)}<span>En casa: <b>${x.producto}</b></span></div>` : ''}${x.precio ? `<div>${ico('clock', 18)}<span><b>${pesos(x.precio)}</b> · ${x.dur} min</span></div>` : ''}</div>
      <div class="qz-acc"><button type="button" class="qz-btn" data-res>Reservar este corte</button><button type="button" class="qz-otra" data-otra>Volver a empezar</button></div></div>`;
  };
  el.onclick = (e) => { const o = e.target.closest('[data-o]'); if(o){ r[k] = +o.dataset.o; k++; pinta(); return; }
    if(e.target.closest('[data-otra]')){ k = 0; r.length = 0; pinta(); return; }
    if(e.target.closest('[data-res]')) alReservar(resultado(r)); };
  pinta();
}
export const CSS_QUIZ = `
.qz-paso{ display:flex; align-items:center; gap:12px; font-size:13px; color:var(--qz-suave, #666); margin-bottom:14px } .qz-barra{ flex:1; height:4px; border-radius:2px; background:var(--qz-linea, #0001); overflow:hidden } .qz-barra i{ display:block; height:100%; background:var(--qz-acento, #111); transition:width .4s }
.qz-q{ margin:0 0 16px; font-size:26px; line-height:1.15 }
.qz-ops{ display:grid; gap:10px; grid-template-columns:repeat(2, minmax(0, 1fr)) }
.qz-ops button{ display:flex; flex-direction:column; align-items:flex-start; gap:10px; min-height:96px; padding:16px; border-radius:16px; border:1px solid var(--qz-linea, #0001); background:var(--qz-capa, transparent); color:inherit; font:inherit; font-size:15px; text-align:left; cursor:pointer; transition:transform .2s, border-color .2s }
.qz-ops button:hover{ transform:translateY(-2px); border-color:var(--qz-acento, #111) } .qz-ops svg{ color:var(--qz-acento, #111) }
.qz-res{ animation:qzEntra .5s cubic-bezier(.2,.8,.2,1) } @keyframes qzEntra{ from{ opacity:0; transform:translateY(16px) } }
.qz-ojo{ font-size:12px; letter-spacing:.3em; text-transform:uppercase; color:var(--qz-acento, #111) } .qz-res h3{ margin:6px 0 8px; font-size:34px; line-height:1.05 } .qz-res p{ margin:0 0 16px; color:var(--qz-suave, #666) }
.qz-mini{ display:grid; gap:10px; margin-bottom:18px } .qz-mini div{ display:flex; gap:10px; align-items:center } .qz-mini svg{ color:var(--qz-acento, #111) }
.qz-acc{ display:flex; flex-wrap:wrap; gap:10px } .qz-btn{ min-height:50px; padding:0 24px; border-radius:999px; border:0; background:var(--qz-acento, #111); color:var(--qz-sobre, #fff); font:inherit; font-weight:800; cursor:pointer } .qz-otra{ min-height:50px; padding:0 18px; border-radius:999px; border:1px solid var(--qz-linea, #0001); background:transparent; color:inherit; font:inherit; cursor:pointer }
`;

/* ── la tarjeta que se inclina siguiendo el dedo (o el ratón) ── */
export function inclinar(el, fuerza = 10){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.style.transition = 'transform .25s ease-out'; el.style.transformStyle = 'preserve-3d';
  const mover = (x, y) => { const r = el.getBoundingClientRect(), u = (x - r.left) / r.width - .5, v = (y - r.top) / r.height - .5;
    el.style.transform = `perspective(900px) rotateY(${(u * fuerza * 2).toFixed(2)}deg) rotateX(${(-v * fuerza * 2).toFixed(2)}deg)`; el.style.setProperty('--brillo-x', (u + .5) * 100 + '%'); el.style.setProperty('--brillo-y', (v + .5) * 100 + '%'); };
  el.addEventListener('pointermove', (e) => mover(e.clientX, e.clientY));
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

/* ── el QR para el póster del local: abre esta misma página (lo pinta cuando cargue la librería) ── */
export function qr(el, { url = location.href.split('#')[0].split('?')[0], celda = 5 } = {}){
  const pinta = () => { if(typeof qrcode !== 'function') return false; const q = qrcode(0, 'M'); q.addData(url); q.make(); el.innerHTML = q.createSvgTag({ cellSize: celda, margin: 0, scalable: true }); return true; };
  if(pinta()) return;
  const s = document.createElement('script'); s.src = new URL('./vendor/qrcode-1.4.4.min.js', import.meta.url).href; s.async = true; s.onload = pinta; document.head.appendChild(s);
}

/* ── la promo del día con su reloj: «termina en 03:12:44» ── */
export function promoDelDia(el, promos, { cierre = 21 * 60 } = {}){
  const d = new Date(), p = promos[d.getDay()]; if(!p){ el.hidden = true; return; }
  el.innerHTML = `<span class="pr-ico">${ico(p.ico || 'percent', 20)}</span><span class="pr-txt"><b>${p.titulo}</b><small>${p.detalle}</small></span><span class="pr-reloj" aria-label="Tiempo que le queda"></span>`;
  const r = el.querySelector('.pr-reloj');
  const tic = () => { const a = new Date(), quedan = cierre * 60 - (a.getHours() * 3600 + a.getMinutes() * 60 + a.getSeconds());
    if(quedan <= 0){ r.textContent = 'Mañana hay otra'; return; } const h = Math.floor(quedan / 3600), m = Math.floor(quedan % 3600 / 60), s = quedan % 60;
    r.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
  tic(); setInterval(tic, 1000);
}
export const CSS_PROMO = `
.pr{ display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:16px; background:var(--pr-fondo, #111); color:var(--pr-tinta, #fff); border:1px solid var(--pr-linea, transparent) }
.pr-ico{ width:40px; height:40px; flex-shrink:0; border-radius:50%; display:grid; place-items:center; background:var(--pr-acento, #c00); color:var(--pr-sobre, #fff) }
.pr-txt{ flex:1; min-width:0; display:grid; line-height:1.25 } .pr-txt small{ opacity:.75 }
.pr-reloj{ font-variant-numeric:tabular-nums; font-weight:800; font-size:15px; letter-spacing:.04em; white-space:nowrap }
`;

/* la marquesina: el texto se duplica para que el ciclo no tenga costura */
export function marquesina(el, palabras, sep = '·'){
  const t = palabras.map(p => `<span>${p}</span><i aria-hidden="true">${sep}</i>`).join('');
  el.innerHTML = `<div class="mq-pista">${t}${t}</div>`; el.setAttribute('aria-label', palabras.join(', '));
}
export const CSS_MQ = `
.mq{ overflow:hidden; white-space:nowrap; user-select:none } .mq-pista{ display:inline-flex; gap:28px; align-items:center; padding-right:28px; animation:mqVa var(--mq-vel, 28s) linear infinite }
.mq-pista span{ display:inline-block } .mq-pista i{ font-style:normal; opacity:.5 }
@keyframes mqVa{ to{ transform:translateX(-50%) } }
@media (prefers-reduced-motion:reduce){ .mq-pista{ animation:none } }
`;
export function estilos(...css){ const s = document.createElement('style'); s.textContent = css.join('\n'); document.head.prepend(s); }
