/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · VER UNA CARTA DE CERCA
   ───────────────────────────────────────────────────────────────────────────
   Carlos, 6 nov: «al poner en grande una carta para inspeccionarla, ya sea del
   sobre o en colección, que pueda rotarla, acercarla, etc. para analizarla
   bien». Un dedo la gira, dos dedos (o la rueda del mouse) la acercan y la
   mueven, doble toque la regresa, «Voltear» enseña el dorso. Un brillo de
   lámina se mueve con el giro, como en una carta de verdad.
   ═══════════════════════════════════════════════════════════════════════════ */
export function inspeccionar({ frente, dorso, pie = '' }){
  document.querySelector('.inspector')?.remove();
  const n = document.createElement('div'); n.className = 'inspector'; n.setAttribute('role', 'dialog'); n.setAttribute('aria-label', 'Carta de cerca');
  n.innerHTML = `<div class="insp-escena"><div class="insp-carta"><img class="insp-cara" alt="" src="${frente}">${dorso ? `<img class="insp-cara insp-atras" alt="" src="${dorso}">` : ''}<i class="insp-brillo"></i></div></div>
    ${pie ? `<p class="insp-pie">${pie}</p>` : ''}
    <div class="insp-botones"><button class="btn suave" data-voltear>Voltear</button><button class="btn suave" data-centrar>Centrar</button><button class="btn" data-cerrar>Cerrar</button></div>
    <small class="insp-ayuda">Arrastra para girarla · dos dedos para acercarla</small>`;
  document.body.appendChild(n);
  const escena = n.querySelector('.insp-escena'), carta = n.querySelector('.insp-carta'), brillo = n.querySelector('.insp-brillo');
  const img = carta.querySelector('img');
  img.addEventListener('load', () => { carta.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight; }, { once: true });
  let rx = 0, ry = 0, s = 1, tx = 0, ty = 0, vx = 0, vy = 0, quieto = true, vivo = true, extra = 0;
  const pinta = (t) => {
    const ox = quieto ? Math.sin(t / 900) * 7 : 0, oy = quieto ? Math.cos(t / 1300) * 4 : 0;
    carta.style.transform = `translate(${tx}px, ${ty}px) scale(${s}) rotateX(${rx + oy}deg) rotateY(${ry + ox + extra}deg)`;
    const a = ((ry + ox + extra) % 360 + 360) % 360;
    brillo.style.backgroundPosition = `${50 + Math.sin(a * Math.PI / 180) * 60}% ${50 - (rx + oy) * 1.5}%`;
    carta.classList.toggle('de-espaldas', a > 90 && a < 270);
  };
  const ciclo = (t) => {
    if(!vivo) return;
    if(!punteros.size && (Math.abs(vx) > .02 || Math.abs(vy) > .02)){ ry += vx; rx = Math.max(-70, Math.min(70, rx + vy)); vx *= .93; vy *= .93; }
    pinta(t); requestAnimationFrame(ciclo);
  };
  requestAnimationFrame(ciclo);

  const punteros = new Map(); let pellizco = null, ultimoToque = 0;
  escena.addEventListener('pointerdown', (e) => {
    escena.setPointerCapture?.(e.pointerId); punteros.set(e.pointerId, { x: e.clientX, y: e.clientY }); quieto = false; vx = vy = 0;
    if(punteros.size === 2){ const [a, b] = [...punteros.values()]; pellizco = { d: Math.hypot(a.x - b.x, a.y - b.y), s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx, ty }; }
    const ahora = performance.now(); if(punteros.size === 1 && ahora - ultimoToque < 300) centrar(); ultimoToque = ahora;
  });
  escena.addEventListener('pointermove', (e) => {
    const p = punteros.get(e.pointerId); if(!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if(punteros.size === 1){ ry += dx * .45; rx = Math.max(-70, Math.min(70, rx - dy * .45)); vx = dx * .45; vy = -dy * .45; }
    else if(pellizco && punteros.size === 2){
      const [a, b] = [...punteros.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      s = Math.max(1, Math.min(4, pellizco.s * d / pellizco.d));
      tx = pellizco.tx + (a.x + b.x) / 2 - pellizco.cx; ty = pellizco.ty + (a.y + b.y) / 2 - pellizco.cy;
    }
  });
  const suelta = (e) => { punteros.delete(e.pointerId); if(punteros.size < 2) pellizco = null; if(s <= 1.02){ tx = ty = 0; } };
  escena.addEventListener('pointerup', suelta); escena.addEventListener('pointercancel', suelta);
  escena.addEventListener('wheel', (e) => { e.preventDefault(); quieto = false; s = Math.max(1, Math.min(4, s * (e.deltaY < 0 ? 1.12 : .89))); if(s <= 1.02) tx = ty = 0; }, { passive: false });
  function centrar(){ rx = ry = 0; s = 1; tx = ty = 0; vx = vy = 0; extra = 0; carta.classList.add('suave'); setTimeout(() => carta.classList.remove('suave'), 350); }
  n.querySelector('[data-voltear]').onclick = () => { quieto = false; carta.classList.add('suave'); ry += 180; setTimeout(() => carta.classList.remove('suave'), 450); };
  n.querySelector('[data-centrar]').onclick = centrar;
  const cerrar = () => { vivo = false; n.classList.remove('ve'); setTimeout(() => n.remove(), 220); removeEventListener('keydown', tecla); };
  const tecla = (e) => { if(e.key === 'Escape') cerrar(); };
  addEventListener('keydown', tecla);
  n.querySelector('[data-cerrar]').onclick = cerrar;
  n.addEventListener('click', (e) => { if(e.target === n) cerrar(); });
  requestAnimationFrame(() => n.classList.add('ve'));
  return cerrar;
}
