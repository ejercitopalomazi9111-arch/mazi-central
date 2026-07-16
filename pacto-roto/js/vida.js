/* ============================================================
   EL PACTO ROTO — vida.js
   Vida de "chill" con stats: pescar, cazar, recolectar y las
   mascotas. Cada actividad tiene su interacción y progresión.
   ============================================================ */
window.VIDA = (function () {
  const S = () => G.state;
  let raf = 0, back = null;
  function cancelRaf() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* ---------- PESCA ---------- */
  function pescar(backCb) {
    back = backCb; cancelRaf();
    const tieneCaña = G.has('tool_caña') || Object.keys(S().inv).some(k => k === 'tool_caña');
    const sc = G.el('panel-scroll');
    sc.innerHTML = `<div class="station-head"><span class="ico">🎣</span><div><h2 class="gold">Muelle</h2>
      <div class="dim" style="font-size:12px">${tieneCaña ? 'Lanza la línea y espera el tirón.' : 'Necesitas una caña. Lábrala en artesanía.'}</div></div></div>
      ${G.plateHTML('bocklin_isla')}
      <div id="fish-area"></div>`;
    G.el('panel-actions').innerHTML = actionBack();
    if (!tieneCaña) return;
    const area = G.el('fish-area');
    area.innerHTML = `<button class="btn gold" id="cast">Lanzar la línea</button>`;
    G.el('cast').onclick = () => esperarTiron(area);
  }
  function esperarTiron(area) {
    area.innerHTML = `<p class="thinking">La línea entra al agua negra… <span class="spinner"></span></p>`;
    const wait = 900 + Math.random() * 2600;
    const to = setTimeout(() => {
      const pez = pesoAleatorio();
      area.innerHTML = `<div class="center"><p class="gold" style="font-size:20px">¡Tirón!</p></div><button class="btn blood" id="hook">Clavar el anzuelo</button>`;
      const win = setTimeout(() => { area.innerHTML = `<p class="dim">Se soltó. Muy lento.</p><button class="btn" id="retry">Otra vez</button>`; G.el('retry').onclick = () => pescar(back); }, 850);
      G.el('hook').onclick = () => { clearTimeout(win); reel(area, pez); };
    }, wait);
  }
  function pesoAleatorio() {
    const r = Math.random();
    return r < 0.6 ? DATA.PECES[0] : r < 0.9 ? DATA.PECES[1] : DATA.PECES[2];
  }
  function reel(area, pez) {
    let prog = 0, tension = 0.5, escape = 0;
    area.innerHTML = `<div class="dim" style="font-size:12px">${G.esc(pez.nombre)} (${pez.peso}). Mantén la tensión: toca para tirar, suelta para aflojar.</div>
      <div class="quality-meter" style="margin-top:8px"><div class="qf" id="prog" style="width:0%"></div></div>
      <div class="timing-bar" style="margin-top:6px"><div class="forge-zone" style="left:30%;width:40%"></div><div class="forge-marker" id="tmk" style="left:50%"></div></div>
      <div class="dim" style="font-size:11px">tensión de la línea</div>
      <button class="btn gold" id="pull">Tirar (mantener)</button>`;
    let pulling = false;
    const btn = G.el('pull');
    btn.onpointerdown = () => pulling = true; btn.onpointerup = () => pulling = false; btn.onpointerleave = () => pulling = false;
    function loop() {
      tension += (pulling ? 1 : -1) * 0.02;
      tension = G.clamp(tension, 0, 1);
      const good = tension > 0.3 && tension < 0.7;
      if (good) prog += 0.012; else { escape += 0.008; if (tension > 0.92 || tension < 0.06) escape += 0.01; }
      const p = G.el('prog'), t = G.el('tmk');
      if (p) p.style.width = (prog * 100) + '%'; if (t) t.style.left = (tension * 100) + '%';
      if (prog >= 1) { cancelRaf(); return cobrar(area, pez, true); }
      if (escape >= 1) { cancelRaf(); return cobrar(area, pez, false); }
      raf = requestAnimationFrame(loop);
    }
    cancelRaf(); raf = requestAnimationFrame(loop);
  }
  function cobrar(area, pez, exito) {
    if (exito) {
      G.give(pez.mat, 1); if (pez.raro) G.give('gema', 1);
      S().flags.pescados = (S().flags.pescados || 0) + 1;
      G.apply({ xp: pez.dif * 3 });
      area.innerHTML = `<p class="effect">Sacas ${G.esc(pez.nombre)}. +${pez.dif * 3} exp.</p><button class="btn gold" id="again">Volver a lanzar</button>`;
    } else {
      area.innerHTML = `<p class="dim">La línea se rompe. El agua se queda callada otra vez.</p><button class="btn" id="again">Volver a lanzar</button>`;
    }
    G.el('again').onclick = () => pescar(back);
  }

  /* ---------- CAZA ---------- */
  function cazar(backCb) {
    back = backCb; cancelRaf();
    const tieneTrampa = G.has('tool_trampa');
    const sc = G.el('panel-scroll');
    sc.innerHTML = `<div class="station-head"><span class="ico">🏹</span><div><h2 class="gold">Cacería</h2>
      <div class="dim" style="font-size:12px">Rastrea y tira cuando la pieza se cruce.</div></div></div>
      ${G.plateHTML('salvaje_combate')}
      <div id="hunt-area"><button class="btn gold" id="track">Rastrear</button></div>`;
    G.el('panel-actions').innerHTML = actionBack();
    G.el('track').onclick = () => rastrear(G.el('hunt-area'), tieneTrampa);
  }
  function rastrear(area, trampa) {
    area.innerHTML = `<p class="thinking">Sigues las huellas en el barro… <span class="spinner"></span></p>`;
    setTimeout(() => {
      const pieza = Math.random() < 0.5 ? DATA.CAZA[0] : Math.random() < 0.8 ? DATA.CAZA[1] : DATA.CAZA[2];
      apuntar(area, pieza, trampa);
    }, 700 + Math.random() * 1400);
  }
  function apuntar(area, pieza, trampa) {
    let pos = 0, dir = 1, speed = 0.02 + pieza.dif * 0.006, shots = 0, best = 0;
    area.innerHTML = `<div class="dim" style="font-size:12px">${G.esc(pieza.nombre)}${pieza.peligro ? ' — peligroso' : ''}. Tira cuando cruce la mira.</div>
      <div class="timing-bar" style="margin-top:8px;height:44px"><div class="forge-zone perfect" style="left:45%;width:10%"></div>
        <div class="forge-marker" id="amk" style="left:0%;background:var(--vellum)"></div></div>
      <button class="btn blood" id="shoot">Disparar</button>`;
    function loop() { pos += dir * speed; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } const m = G.el('amk'); if (m) m.style.left = (pos * 100) + '%'; raf = requestAnimationFrame(loop); }
    G.el('shoot').onclick = () => {
      cancelRaf();
      const d = Math.abs(pos - 0.5);
      const q = d < 0.05 ? 1 : d < 0.12 ? 0.6 : d < 0.2 ? 0.3 : 0;
      const t = G.tirada(0);
      const hit = q > 0 && (trampa || t.total >= 8);
      if (hit) {
        G.give(pieza.mat, q > 0.6 ? 2 : 1); if (pieza.extra) G.give(pieza.extra, 1);
        S().flags.cazados = (S().flags.cazados || 0) + 1;
        G.apply({ xp: pieza.dif * 4 });
        area.innerHTML = `<p class="effect">Buen tiro. ${G.esc(pieza.nombre)} cae. +${pieza.dif * 4} exp.</p><button class="btn gold" id="again">Seguir cazando</button>`;
      } else {
        if (pieza.peligro && Math.random() < 0.5) { G.apply({ hp: -pieza.dif * 3 }); area.innerHTML = `<p class="blood">Fallaste y el ${G.esc(pieza.nombre)} te embiste antes de huir.</p><button class="btn" id="again">Seguir</button>`; }
        else area.innerHTML = `<p class="dim">Erraste. La pieza se pierde en el monte.</p><button class="btn" id="again">Seguir</button>`;
      }
      G.el('again').onclick = () => cazar(back);
    };
    cancelRaf(); raf = requestAnimationFrame(loop);
  }

  /* ---------- RECOLECTAR ---------- */
  function recolectar(region) {
    const tabla = {
      ruinas:['mena','carbon','ceniza_h'], norte:['raiz','lagrima','madera'],
      salvaje:['seta','esporas','madera'], inframundo:['ceniza_h','lagrima','gema'],
      mar:['esporas','cuero','pescado'], guerra:['mena','lingote'],
    };
    const pool = tabla[region] || ['madera','raiz'];
    const got = G.pick(pool); const n = 1 + (Math.random() < 0.3 ? 1 : 0);
    G.give(got, n);
    return { mat: got, n, nombre: DATA.MATS[got] ? DATA.MATS[got].nombre : got };
  }

  /* ---------- MASCOTAS ---------- */
  function pantallaMascotas(backCb) {
    const s = S();
    let html = `<div class="station-head"><span class="ico">🐾</span><div><h2 class="gold">Manada</h2>
      <div class="dim" style="font-size:12px">Las bestias que te siguen. El Vínculo las hace pelear con turno propio.</div></div></div>`;
    if (!s.mascotas.length) html += `<p class="dim">Todavía andas solo. Domestica bestias débiles en combate (baja su vida y ofréceles algo).</p>`;
    s.mascotas.forEach((m, i) => {
      const b = DATA.BESTIARIO[m.especie];
      html += `<div class="choice-card">${b ? G.plateHTML(b.art) : ''}<h3>${G.esc(m.nombre)}</h3>
        <div class="role">${b ? G.esc(b.nombre) : m.especie} · Nv ${m.nivel}</div>
        <div class="st">HP ${m.hp}/${m.hpMax}</div>
        <button class="btn mini" data-feed="${i}">Alimentar</button></div>`;
    });
    html += `<button class="btn ghost" id="pet-back" style="margin-top:12px">‹ Volver</button>`;
    const sc = G.el('panel-scroll'); sc.innerHTML = html; G.el('panel-actions').innerHTML = '';
    sc.querySelectorAll('[data-feed]').forEach(b => b.onclick = () => {
      const foods = Object.keys(s.inv).filter(k => k.startsWith('food_'));
      if (!foods.length) return G.toast('No traes comida para darle.', '');
      G.take(foods[0], 1); const m = s.mascotas[b.dataset.feed]; m.hpMax += 3; m.hp = m.hpMax; m.nivel++; G.save();
      G.toast(`${m.nombre} come y crece. Nivel ${m.nivel}.`, 'gold'); pantallaMascotas(backCb);
    });
    G.el('pet-back').onclick = backCb;
    G.show('panel');
  }

  function actionBack() {
    return '';
  }

  return { pescar, cazar, recolectar, pantallaMascotas, cancelRaf, set back(f){ back = f; } };
})();
