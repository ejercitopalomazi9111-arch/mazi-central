/* EL MERCADO DE ECOS: tres maneras de tirar (Carlos, 29 oct).
     · GARRA: mueves el gancho, baja, agarra una cápsula y la saca. Si se te va, el intento sigue pagado.
     · SOBRE: se rasga deslizando el dedo y las cartas se destapan una por una.
     · CARRUSEL: como el de Ligas Mazi, gira y frena en el premio.
   El premio se decide al PAGAR, con las probabilidades publicadas (y la garantía a las 50); la máquina sólo
   lo enseña. Así la habilidad con la garra no cambia lo que sale: cambia lo divertido que es sacarlo.
   Y el premio no se cierra solo: lo cierra quien jugó (lección de Ligas Mazi, «se cierra muy rápido»). */

export function montarMercado({ $, Y, RAREZA, sortear, pagar, barra, reloj, sonidos, vista, pool }){
  const COL = { c: '#B9AECB', r: '#38E1FF', e: '#B44BFF', l: '#FFC24B', m: '#FF2D55' };
  const MAQ = { garra: 'Garra', sobre: 'Sobre', carrusel: 'Carrusel' };
  let maq = 'garra', ocupado = false;
  const tick = (vol = .18) => sonidos.clic && reloj.golpe(sonidos.clic, vol);

  /* ── el premio, en grande ── */
  function premio(sale, titulo = '¡Te salió!'){
    const P = $('#premio'), mejor = sale.reduce((a, s) => 'crelm'.indexOf(s.o.raro) > 'crelm'.indexOf(a.o.raro) ? s : a, sale[0]);
    P.style.setProperty('--rc', COL[mejor.o.raro]);
    P.innerHTML = `<div class="premioCaja"><div class="ojo">${titulo}</div><div class="premioLista${sale.length > 1 ? ' varios' : ''}">${sale.map(({ o, nuevo }) =>
      `<div class="premioObj" style="--rc:${COL[o.raro]}"><div class="muestra">${vista(o)}</div><b>${o.nombre}</b><small>${RAREZA[o.raro].n.toUpperCase()} · ${nuevo ? 'NUEVO' : 'REPETIDO (+Ecos)'}</small></div>`).join('')}</div>
      <button class="b primario grande" id="premioB">Seguir</button></div>`;
    P.classList.add('vis'); if(['l', 'm'].includes(mejor.o.raro) && sonidos.premio) reloj.golpe(sonidos.premio, .7);
    $('#premioB').onclick = () => { P.classList.remove('vis'); ocupado = false; barra(); pintar(); };
  }

  /* ── la tira de máquinas y los botones de cada una ── */
  function pintar(){ const T = $('#gTira'); T.innerHTML = '';
    Object.entries(MAQ).forEach(([k, n]) => { const b = document.createElement('button'); b.textContent = n; b.className = k === maq ? 'si' : ''; b.onclick = () => { if(ocupado) return; maq = k; pintar(); }; T.appendChild(b); });
    pintarSaldo(); ({ garra, sobre, carrusel })[maq](); }

  const boton = (txt, fn, prim) => { const b = document.createElement('button'); b.className = 'b' + (prim ? ' primario' : ''); b.textContent = txt; b.onclick = fn; return b; };
  function botones(...bs){ const B = $('#gBotones'); B.innerHTML = ''; bs.forEach(b => B.appendChild(b)); }

  /* ═══ CARRUSEL ═══ */
  function carrusel(){ const E = $('#gEscena'); E.className = 'maquina carrusel1';
    E.innerHTML = '<div class="gcMarco"><div class="gcPista" id="gcPista"></div><i class="gcFlecha arriba"></i><i class="gcFlecha abajo"></i></div><p class="sub" id="gcLeyenda">Gira y frena en tu premio.</p>';
    llenarPista(null);
    botones(boton('1 · 1 Sello', () => girar(1, true)), boton('1 · 100 ◆', () => girar(1)), boton('10 · 900 ◆', () => girar(10), true)); }
  const CEL = 96, GANA = 40;
  function llenarPista(ganador){ const pista = $('#gcPista'), lista = pool(); pista.style.transition = 'none'; pista.style.transform = 'translateX(0)';
    pista.innerHTML = Array.from({ length: GANA + 8 }, (_, i) => { const o = i === GANA && ganador ? ganador : lista[Math.floor(Math.random() * lista.length)];
      return `<div class="gcCelda" style="--rc:${COL[o.raro]}"><div class="muestra">${vista(o)}</div><span>${o.nombre}</span></div>`; }).join(''); }
  function girar(n, conSello = false){ if(ocupado) return; if(!pagar(n === 10 ? 900 : 100, conSello)) return; ocupado = true; pintarSaldo(); barra();
    const sale = sortear(n), mejor = sale.reduce((a, s) => 'crelm'.indexOf(s.o.raro) > 'crelm'.indexOf(a.o.raro) ? s : a, sale[0]);
    llenarPista(mejor.o); const pista = $('#gcPista'), marco = pista.parentElement, MS = 4000;
    requestAnimationFrame(() => requestAnimationFrame(() => { const x = GANA * CEL - (marco.clientWidth / 2 - CEL / 2) + (Math.random() * 40 - 20);
      pista.style.transition = `transform ${MS}ms cubic-bezier(.11,.72,.16,1)`; pista.style.transform = `translateX(${-x}px)`; }));
    /* el tic-tic que se espacia al frenar, como las ruletas de verdad */
    for(let i = 0; i < GANA; i++){ const u = (i + 1) / GANA; setTimeout(() => tick(.12), (1 - Math.pow(1 - u, 1 / 3.5)) * MS); }   /* la pista frena como 1-(1-t)^3.5: cada celda pasa en la inversa */
    setTimeout(() => { const x = GANA * CEL - (marco.clientWidth / 2 - CEL / 2); pista.style.transition = 'transform .3s ease-out'; pista.style.transform = `translateX(${-x}px)`;
      pista.children[GANA]?.classList.add('gana'); $('#gcLeyenda').innerHTML = `<b style="color:${COL[mejor.o.raro]}">${RAREZA[mejor.o.raro].n}</b> · ${mejor.o.nombre}`; }, MS + 40);
    setTimeout(() => premio(sale, n > 1 ? `Tus ${n} tiradas` : '¡Te salió!'), MS + 900); }

  /* ═══ SOBRE ═══ */
  function sobre(){ const E = $('#gEscena'); E.className = 'maquina sobre1';
    E.innerHTML = '<div class="sobreZona" id="sobreZona"><div class="paquete" id="paquete"><div class="rasgar"></div><div class="paqLogo"><i>VS</i>TILES</div><div class="paqSub">ECOS DEL CORO · 5 CARTAS</div></div></div><p class="sub" id="sobreLeyenda">Cinco cartas por sobre. Al abrirlo, destápalas una por una.</p>';
    botones(boton('Sobre · 450 ◆', abrirSobre, true)); }
  function abrirSobre(){ if(ocupado) return; if(!pagar(450)) return; ocupado = true; pintarSaldo(); barra();
    const sale = sortear(5), paq = $('#paquete'), zona = $('#sobreZona'); $('#gBotones').innerHTML = '';
    $('#sobreLeyenda').textContent = 'Desliza el dedo sobre la orilla de arriba para rasgarlo.'; paq.classList.add('listo');
    /* rasgar: arrastrar el dedo de lado a lado por la orilla (o tocar tres veces, para quien no deslice) */
    let x0 = null, recorrido = 0, toques = 0;
    const abre = () => { paq.onpointerdown = paq.onpointermove = paq.onpointerup = null; paq.classList.add('rasgado'); reloj.golpe(sonidos.glitch, .3);
      setTimeout(() => repartir(sale, zona), 650); };
    paq.onpointerdown = (e) => { x0 = e.clientX; recorrido = 0; try{ paq.setPointerCapture(e.pointerId); }catch(err){} };
    paq.onpointermove = (e) => { if(x0 === null) return; recorrido += Math.abs(e.clientX - x0); x0 = e.clientX; paq.style.setProperty('--corte', Math.min(100, recorrido / paq.clientWidth * 100) + '%'); if(recorrido > paq.clientWidth * .8) abre(); };
    paq.onpointerup = () => { x0 = null; if(++toques >= 3) abre(); }; }
  function repartir(sale, zona){
    zona.innerHTML = `<div class="cartas">${sale.map(({ o }, i) => `<button class="carta" data-i="${i}" style="--rc:${COL[o.raro]};--d:${i * .09}s"><div class="cara atras${['e', 'l', 'm'].includes(o.raro) ? ' brilla' : ''}"><i>VS</i></div><div class="cara frente"><div class="muestra">${vista(o)}</div><b>${o.nombre}</b><small>${RAREZA[o.raro].n}</small></div></button>`).join('')}</div>`;
    $('#sobreLeyenda').textContent = 'Toca cada carta para voltearla. Las que brillan traen algo bueno.';
    let vueltas = 0; zona.querySelectorAll('.carta').forEach(c => c.onclick = () => { if(c.classList.contains('volteando')) return; c.classList.add('volteando'); setTimeout(() => c.classList.add('volteada'), 250); tick(.3);
      const o = sale[+c.dataset.i].o; if(['l', 'm'].includes(o.raro) && sonidos.premio) reloj.golpe(sonidos.premio, .6);
      if(++vueltas === sale.length) setTimeout(() => premio(sale, 'Tu sobre'), 900); });
    botones(boton('Voltear todas', () => zona.querySelectorAll('.carta:not(.volteando)').forEach((c, k) => setTimeout(() => c.click(), k * 220)))); }

  /* ═══ GARRA ═══ */
  let G = null;
  function garra(){ const E = $('#gEscena'); E.className = 'maquina garra1';
    E.innerHTML = '<canvas id="garraCv"></canvas><p class="sub" id="garraLeyenda">Mueve el gancho con el dedo o con las flechas y suéltalo sobre una cápsula.</p>';
    const cv = $('#garraCv'), W = Math.min(360, E.clientWidth - 8), H = Math.round(W * 1.12), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const piso = H - 18, R = Math.round(W * .062), salida = { x: 8, w: R * 3.1 };
    const caps = []; const colores = ['#FF3D8B', '#38E1FF', '#FFE08A', '#B44BFF', '#5CFFB0', '#FF6A3D'];
    for(let i = 0; i < 16; i++) caps.push({ x: salida.w + R + 8 + Math.random() * (W - salida.w - 3 * R - 16), y: piso - R - Math.random() * H * .35, vx: 0, vy: 0, c: colores[i % colores.length] });
    if(G) cancelAnimationFrame(G.raf);
    G = window.__vstGarra = { cv, x, W, H, R, piso, salida, caps, gx: W * .6, objetivo: W * .6, gy: 34, fase: 'libre', abre: 1, carga: null, pagado: false, sale: null, raf: 0, flecha: 0 };
    /* el dedo mueve el gancho (sólo mientras está libre) */
    cv.onpointerdown = cv.onpointermove = (e) => { if(G.fase !== 'libre' || (e.type === 'pointermove' && !e.buttons && e.pointerType === 'mouse')) return; const r = cv.getBoundingClientRect(); G.objetivo = Math.max(salida.w + R, Math.min(W - R, e.clientX - r.left)); };
    const flecha = (d) => { const b = boton(d < 0 ? '◀' : '▶', () => {}); b.classList.add('chico'); b.onpointerdown = () => G.flecha = d; b.onpointerup = b.onpointerleave = b.onpointercancel = () => G.flecha = 0; return b; };
    botones(flecha(-1), boton('Bajar · 100 ◆', () => bajar(false), true), boton('Bajar · 1 Sello', () => bajar(true)), flecha(1));
    paso(); }
  function bajar(conSello){ if(!G || G.fase !== 'libre') return;
    if(!G.pagado){ if(!pagar(100, conSello)) return; G.pagado = true; G.sale = sortear(1); ocupado = true; barra(); pintarSaldo(); }
    G.fase = 'baja'; tick(.25); $('#garraLeyenda').textContent = 'Bajando…'; }
  const pintarSaldo = () => { $('#gSaldo').innerHTML = `<span><i class="ec"></i>${Y.ecos} Ecos</span><span><i class="se"></i>${Y.sellos} Sellos</span><span>Garantía legendaria en ${50 - Y.pity}</span>`; };
  function paso(){ if(!G || !document.body.contains(G.cv)) return; G.raf = requestAnimationFrame(paso);
    const { x, W, H, R, piso, salida, caps } = G;
    /* la física de las cápsulas: gravedad, paredes y choques entre ellas (círculos) */
    for(const c of caps){ if(c === G.carga || c.cae) continue; c.vy += .35;   /* la que va cayendo por la salida ya no choca con el piso */ c.x += c.vx; c.y += c.vy; c.vx *= .96;
      if(c.y > piso - R){ c.y = piso - R; c.vy *= -.25; c.vx *= .8; } if(c.x < salida.w + R + 4){ c.x = salida.w + R + 4; c.vx *= -.4; } if(c.x > W - R - 4){ c.x = W - R - 4; c.vx *= -.4; } }
    for(let i = 0; i < caps.length; i++) for(let j = i + 1; j < caps.length; j++){ const a = caps[i], b = caps[j]; if(a === G.carga || b === G.carga || a.cae || b.cae) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = 2 * R;
      if(d < m && d > .01){ const k = (m - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; const t = (b.vx - a.vx) * dx / d + (b.vy - a.vy) * dy / d; if(t < 0){ a.vx += t * dx / d * .5; a.vy += t * dy / d * .5; b.vx -= t * dx / d * .5; b.vy -= t * dy / d * .5; } } }
    /* el gancho */
    if(G.fase === 'libre'){ G.objetivo = Math.max(salida.w + R, Math.min(W - R, G.objetivo + G.flecha * 3.2)); G.gx += (G.objetivo - G.gx) * .18; }
    if(G.fase === 'baja'){ G.gy += 3.2; const toca = caps.find(c => Math.abs(c.x - G.gx) < R * 1.2 && G.gy + 26 > c.y - R); if(toca || G.gy > piso - 30){ G.fase = 'cierra'; G.t = 0; } }
    if(G.fase === 'cierra'){ G.abre = Math.max(0, G.abre - .06); if(G.abre === 0){ /* ¿quedó una cápsula entre las tenazas? */
        const cerca = caps.filter(c => Math.abs(c.x - G.gx) < R * 1.25 && Math.abs(c.y - (G.gy + 28)) < R * 1.6).sort((a, b) => Math.abs(a.x - G.gx) - Math.abs(b.x - G.gx))[0];
        /* agarrada de orilla: a veces se resbala a medio camino (el drama de las máquinas de verdad) */
        G.carga = cerca || null; G.resbala = cerca && Math.abs(cerca.x - G.gx) > R * .7 && Math.random() < .35 ? G.gy - 40 - Math.random() * 90 : null; G.fase = 'sube'; tick(.3); } }
    if(G.fase === 'sube'){ G.gy -= 3; if(G.carga && G.resbala !== null && G.gy < G.resbala){ G.carga.vy = 1; G.carga.vx = (Math.random() - .5) * 3; G.carga = null; G.resbala = null; $('#garraLeyenda').textContent = '¡Se resbaló!'; } if(G.carga){ G.carga.x = G.gx; G.carga.y = G.gy + 30; } if(G.gy <= 34){ G.gy = 34; G.fase = G.carga ? 'lleva' : 'falla'; } }
    if(G.fase === 'falla'){ G.abre = Math.min(1, G.abre + .05); if(G.abre === 1){ G.fase = 'libre'; $('#garraLeyenda').textContent = '¡Se te fue! Este intento sigue pagado: baja otra vez.'; } }
    if(G.fase === 'lleva'){ G.gx += (salida.x + salida.w / 2 - G.gx) * .08; G.carga.x = G.gx; G.carga.y = G.gy + 30; if(Math.abs(G.gx - (salida.x + salida.w / 2)) < 2){ G.fase = 'suelta'; } }
    if(G.fase === 'suelta'){ G.abre = Math.min(1, G.abre + .06); if(G.abre > .6 && G.carga){ const c = G.carga; G.carga = null; c.cae = true; G.cayendo = c; } if(G.cayendo){ G.cayendo.y += 9; if(G.cayendo.y > H + R){ caps.splice(caps.indexOf(G.cayendo), 1); G.cayendo = null; G.fase = 'premio'; G.pagado = false; const sale = G.sale; G.sale = null; reloj.golpe(sonidos.golpe, .4); setTimeout(() => { premio(sale, '¡La sacaste!'); G.premioListo = true; }, 250); } } }
    if(G.fase === 'premio' && G.premioListo && !$('#premio').classList.contains('vis')){ G.premioListo = false; G.fase = 'libre'; G.abre = 1; if(caps.length < 8) for(let i = 0; i < 8; i++) caps.push({ x: salida.w + R + 10 + Math.random() * (W - salida.w - 3 * R - 20), y: -R * 2 - i * R * 2, vx: 0, vy: 0, c: ['#FF3D8B', '#38E1FF', '#FFE08A', '#B44BFF'][i % 4] }); $('#garraLeyenda').textContent = 'Mueve el gancho y suéltalo sobre una cápsula.'; }
    /* pintar */
    x.clearRect(0, 0, W, H);
    const fondo = x.createLinearGradient(0, 0, 0, H); fondo.addColorStop(0, '#1B0D2B'); fondo.addColorStop(1, '#09040F'); x.fillStyle = fondo; x.fillRect(0, 0, W, H);
    x.fillStyle = '#ffffff10'; x.fillRect(salida.x, piso - 70, salida.w, 70); x.strokeStyle = '#FFE08A88'; x.lineWidth = 2; x.strokeRect(salida.x, piso - 70, salida.w, 70);
    x.fillStyle = '#FFE08Acc'; x.font = '800 10px Orbitron, sans-serif'; x.textAlign = 'center'; x.fillText('SALIDA', salida.x + salida.w / 2, piso - 76);
    for(const c of caps){ x.save(); x.translate(c.x, c.y); const g = x.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R); g.addColorStop(0, '#ffffff'); g.addColorStop(.25, c.c); g.addColorStop(1, '#00000088');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#ffffff55'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-R, 0); x.lineTo(R, 0); x.stroke(); x.restore(); }
    /* el riel, el cable y las tenazas */
    x.fillStyle = '#ffffff22'; x.fillRect(0, 14, W, 8); x.strokeStyle = '#E9DFF5'; x.lineWidth = 2; x.beginPath(); x.moveTo(G.gx, 18); x.lineTo(G.gx, G.gy); x.stroke();
    x.fillStyle = '#B44BFF'; x.fillRect(G.gx - 14, G.gy - 6, 28, 12);
    const ab = G.abre; x.strokeStyle = '#E9DFF5'; x.lineWidth = 4; x.lineCap = 'round';
    for(const s of [-1, 1]){ x.beginPath(); x.moveTo(G.gx + s * 10, G.gy + 6); x.lineTo(G.gx + s * (10 + 12 * ab), G.gy + 22); x.lineTo(G.gx + s * (4 + 10 * ab), G.gy + 36); x.stroke(); }
    if(G.fase === 'libre'){ x.setLineDash([4, 6]); x.strokeStyle = '#ffffff33'; x.lineWidth = 1; x.beginPath(); x.moveTo(G.gx, G.gy + 40); x.lineTo(G.gx, piso); x.stroke(); x.setLineDash([]); }
    x.fillStyle = '#ffffff18'; x.fillRect(0, piso, W, H - piso); }

  return { abrir(){ ocupado = false; pintar(); } };
}
