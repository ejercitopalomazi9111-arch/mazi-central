/* ============================================================
   EL PACTO ROTO — crafting.js
   Motor de oficios + 4 mini-juegos. Cada oficio: estación →
   receta → mini-juego (ejecución 0..1) → juicio de calidad →
   ítem con stats. Tan detallado como la hechicería.
   ============================================================ */
window.CRAFTING = (function () {
  const S = () => G.state;
  let back = null, raf = 0;

  const OFICIOS = {
    herreria:  { nombre:'Herrería',  ico:'🔨', art:'ruinas_torre',  key:'herreria',  minijuego:mgMartillo,  verbo:'forjar' },
    alquimia:  { nombre:'Alquimia',  ico:'⚗',  art:'alquimista',    key:'alquimia',  minijuego:mgMezcla,    verbo:'destilar' },
    cocina:    { nombre:'Cocina',    ico:'🍲', art:'norte_invierno',key:'cocina',    minijuego:mgCocina,    verbo:'cocinar' },
    artesania: { nombre:'Artesanía', ico:'🪡', art:'ermita',        key:'artesania', minijuego:mgPrecision, verbo:'labrar' },
  };

  function abrir(oficioKey, backCb) {
    back = backCb; const of = OFICIOS[oficioKey];
    estacion(of);
  }

  function estacion(of) {
    cancelRaf();
    const s = S();
    const conocidas = s.recetas[of.key] || [];
    const nivel = s.oficios[of.key] || 0;
    let html = `<div class="station-head"><span class="ico">${of.ico}</span>
        <div><h2 class="gold">${of.nombre}</h2><div class="dim" style="font-size:12px">Nivel de oficio ${nivel} · ${G.esc(of.verbo)}</div></div></div>
      ${G.plateHTML(of.art)}
      <div class="dim" style="font-size:13px;margin-bottom:8px">Elige qué ${G.esc(of.verbo)}. Los materiales se gastan; la ejecución decide la calidad.</div>`;
    DATA.RECETAS[of.key].forEach(r => {
      const known = conocidas.includes(r.id);
      const can = known && G.canCraft(r.reqs);
      const reqTxt = Object.entries(r.reqs).map(([m, q]) => `${DATA.MATS[m] ? DATA.MATS[m].nombre : m} ×${q}${G.has(m, q) ? '' : ' ✗'}`).join(' · ');
      html += `<button class="btn ${can ? '' : 'ghost'}" ${can ? '' : 'disabled'} data-r="${r.id}">
        ${known ? G.esc(r.nombre) : '??? (receta no descubierta)'}
        <span class="hint">${known ? G.esc(r.desc) + ' — ' + G.esc(reqTxt) : 'La hallarás explorando o comprando.'}</span></button>`;
    });
    html += `<button class="btn ghost" id="cf-back" style="margin-top:14px">‹ Salir</button>`;
    const sc = G.el('panel-scroll'); sc.innerHTML = html;
    G.el('panel-actions').innerHTML = '';
    sc.querySelectorAll('[data-r]').forEach(b => b.onclick = () => intentar(of, DATA.RECETAS[of.key].find(x => x.id === b.dataset.r)));
    G.el('cf-back').onclick = () => { cancelRaf(); back && back(); };
    G.show('panel');
  }

  function intentar(of, receta) {
    // gasta materiales
    for (const m in receta.reqs) G.take(m, receta.reqs[m]);
    of.minijuego(receta, of, (score) => resolver(of, receta, score));
  }

  async function resolver(of, receta, score) {
    cancelRaf();
    const nivel = S().oficios[of.key] || 0;
    const cal = await NARR.juzgarCalidad({ oficio: of.nombre, receta: receta.nombre, ejecucion: score, nivelOficio: nivel });
    // sube el oficio
    S().oficios[of.key] = nivel + 1;
    crearItem(of, receta, cal, score);
    // evolución del Tintero: poción legendaria
    if (of.key === 'alquimia' && cal.rareza === 'legendaria' && S().clase === 'tintero' && !S().evoluciones.includes('tintero')) UI.evolucionar('tintero');
    G.save();
    resultado(of, receta, cal, score);
  }

  const RAR_MULT = { tosca:0.6, comun:0.85, fina:1.1, maestra:1.4, legendaria:1.9 };
  function crearItem(of, receta, cal, score) {
    const mult = RAR_MULT[cal.rareza] || 1;
    if (of.key === 'cocina') {
      const buff = {}; for (const k in receta.buff) buff[k] = Math.round(receta.buff[k] * mult);
      const key = 'food_' + receta.id;
      G.give(key, 1); S().flags['foodmeta_' + key] = { nombre: receta.nombre, buff, rareza: cal.rareza };
    } else if (of.key === 'alquimia') {
      const ef = {}; for (const k in receta.efecto) ef[k] = (typeof receta.efecto[k] === 'number') ? Math.round(receta.efecto[k] * mult) : receta.efecto[k];
      const key = 'poc_' + receta.id;
      G.give(key, 1); S().flags['pocmeta_' + key] = { nombre: receta.nombre, efecto: ef, rareza: cal.rareza };
    } else if (receta.uso) {
      const key = 'tool_' + receta.id; G.give(key, 1);
      S().flags['toolmeta_' + key] = { nombre: receta.nombre, uso: receta.uso, rareza: cal.rareza };
    } else if (receta.slot) {
      if (!S().objetos) S().objetos = [];
      const base = {}; for (const k in receta.base) base[k] = Math.round(receta.base[k] * mult);
      Object.assign(base, cal.bono || {});
      const item = { uid: 'o' + Date.now() + Math.floor(Math.random() * 999), nombre: receta.nombre, slot: receta.slot, rareza: cal.rareza, base };
      S().objetos.push(item);
    }
  }

  function resultado(of, receta, cal, score) {
    G.modal(`<h3 class="rar-${cal.rareza}" style="color:var(--gold-lt)">${G.esc(receta.nombre)}</h3>
      <div class="stat-row"><span>Calidad</span><b class="rar-${cal.rareza}">${cal.rareza}</b></div>
      <div class="stat-row"><span>Ejecución</span><b>${Math.round(score * 100)}%</b></div>
      <p class="effect">${G.esc(cal.nota || '')}</p>
      <p class="dim" style="font-size:13px">${G.esc(itemDesc(of, receta, cal))}</p>
      <button class="btn gold" id="cr-ok">Bien</button>`);
    G.el('cr-ok').onclick = () => { G.closeModal(); estacion(of); };
  }
  function itemDesc(of, receta, cal) {
    const mult = RAR_MULT[cal.rareza] || 1;
    if (of.key === 'cocina') return 'Al comerlo: ' + Object.entries(receta.buff).map(([k, v]) => `+${Math.round(v * mult)} ${k}`).join(', ') + '.';
    if (of.key === 'alquimia') return 'Efecto: ' + Object.entries(receta.efecto).map(([k, v]) => k === 'huir' ? 'huida garantizada' : `${v > 0 ? '+' : ''}${typeof v === 'number' ? Math.round(v * mult) : v} ${k}`).join(', ') + '.';
    if (receta.slot) return 'Equipable: ' + Object.entries(receta.base).map(([k, v]) => `${k} ${Math.round(v * mult)}`).join(', ') + '.';
    return 'Herramienta de ' + receta.uso + '.';
  }

  function cancelRaf() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* ============================================================
     MINI-JUEGOS  (cada uno llama done(score 0..1))
     ============================================================ */

  // --- HERRERÍA: ritmo de martillo ---
  function mgMartillo(receta, of, done) {
    const rondas = 5; let ronda = 0, hits = [], heat = 1;
    let pos = 0, dir = 1, zone = 0, perfectW = 0.10, zoneW = 0.26, speed = 0.018;
    const sc = G.el('panel-scroll');
    function draw() {
      sc.innerHTML = `<div class="station-head"><span class="ico">🔨</span><div><h2 class="gold">Forjar: ${G.esc(receta.nombre)}</h2>
        <div class="dim" style="font-size:12px">Golpe ${ronda + 1}/${rondas}. Da al martillo cuando la marca cruce la zona dorada.</div></div></div>
        <div class="heat"><div class="ind" style="left:${heat * 100}%"></div></div>
        <div class="dim" style="font-size:11px;margin:-2px 0 8px">calor del metal</div>
        <div class="forge-bar">
          <div class="forge-zone" style="left:${zone * 100}%;width:${zoneW * 100}%"></div>
          <div class="forge-zone perfect" style="left:${(zone + zoneW / 2 - perfectW / 2) * 100}%;width:${perfectW * 100}%"></div>
          <div class="forge-marker" id="fmk" style="left:${pos * 100}%"></div>
        </div>
        <div class="dim" style="font-size:13px">${hits.map(h => h > 0.9 ? '⬤' : h > 0 ? '◐' : '○').join(' ')}</div>
        <button class="btn gold" id="hammer">🔨 Golpear</button>`;
      G.el('hammer').onclick = strike;
    }
    function loop() {
      pos += dir * speed * (0.6 + heat * 0.8);
      if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
      const mk = G.el('fmk'); if (mk) mk.style.left = (pos * 100) + '%';
      raf = requestAnimationFrame(loop);
    }
    function strike() {
      const center = zone + zoneW / 2;
      const d = Math.abs(pos - center);
      let q = 0;
      if (d < perfectW / 2) q = 1; else if (d < zoneW / 2) q = 0.6; else q = 0;
      hits.push(q); heat = Math.max(0.15, heat - 0.16); ronda++;
      if (ronda >= rondas) { cancelRaf(); return done(avg(hits)); }
      zone = 0.12 + Math.random() * (0.88 - zoneW); speed = 0.016 + Math.random() * 0.01;
      draw();
    }
    draw(); cancelRaf(); raf = requestAnimationFrame(loop);
  }

  // --- ALQUIMIA: mezcla medida (parar el vertido en la dosis) ---
  function mgMezcla(receta, of, done) {
    const ingr = Object.keys(receta.reqs);
    let paso = 0, scores = [], level = 0, target = 0, rising = true, speed = 0.012;
    const sc = G.el('panel-scroll');
    function nuevo() { target = 0.35 + Math.random() * 0.5; level = 0; rising = true; speed = 0.010 + Math.random() * 0.008; draw(); cancelRaf(); raf = requestAnimationFrame(loop); }
    function draw() {
      const ing = ingr[paso] || 'esencia';
      sc.innerHTML = `<div class="station-head"><span class="ico">⚗</span><div><h2 class="gold">Destilar: ${G.esc(receta.nombre)}</h2>
        <div class="dim" style="font-size:12px">Vierte ${paso + 1}/${ingr.length}: ${G.esc(DATA.MATS[ing] ? DATA.MATS[ing].nombre : ing)}. Detén en la marca.</div></div></div>
        <div class="mixer">
          <div class="flask"><div class="liquid" id="liq" style="height:${level * 100}%;background:linear-gradient(180deg,#6b9488,#2b4a45)"></div>
            <div style="position:absolute;left:0;right:0;height:2px;background:var(--gold-lt);bottom:${target * 100}%"></div></div>
          <div class="dim" style="font-size:12px">${scores.map(s => s > 0.85 ? '⬤' : s > 0.5 ? '◐' : '○').join(' ')}</div>
          <button class="btn gold" id="pour">Detener el vertido</button>
        </div>`;
      G.el('pour').onclick = stop;
    }
    function loop() {
      level += (rising ? 1 : -1) * speed;
      if (level > 1) { level = 1; rising = false; } if (level < 0) { level = 0; rising = true; }
      const l = G.el('liq'); if (l) l.style.height = (level * 100) + '%';
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      cancelRaf();
      const d = Math.abs(level - target);
      scores.push(Math.max(0, 1 - d * 3));
      paso++;
      if (paso >= ingr.length) return done(avg(scores));
      nuevo();
    }
    nuevo();
  }

  // --- COCINA: picar al ritmo + cocer sin quemar ---
  function mgCocina(receta, of, done) {
    let fase = 0; // 0 picar, 1 cocer
    const sc = G.el('panel-scroll');
    // FASE PICAR
    let beats = 6, beat = 0, chopScores = [], mk = 0, dir = 1, speed = 0.03;
    const ingKey = Object.keys(receta.reqs)[0];
    const ing = DATA.MATS[ingKey];
    function drawChop() {
      sc.innerHTML = `<div class="station-head"><span class="ico">🍲</span><div><h2 class="gold">Cocinar: ${G.esc(receta.nombre)}</h2>
        <div class="dim" style="font-size:12px">Pica al ritmo: corta cuando la marca toque el centro. ${beat}/${beats}</div></div></div>
        <div style="text-align:center;margin:6px 0">${ing && ing.sheet ? `<span class="spr" style="${G.sprStyle(ingKey)};display:inline-block"></span>` : (ing ? ing.glifo : '🥕')}</div>
        <div class="timing-bar"><div class="forge-zone perfect" style="left:44%;width:12%"></div>
          <div class="forge-marker" id="cmk" style="left:${mk * 100}%"></div></div>
        <div class="dim">${chopScores.map(s => s > 0.7 ? '⬤' : s > 0 ? '◐' : '○').join(' ')}</div>
        <button class="btn gold" id="chop">Cortar</button>`;
      G.el('chop').onclick = chop;
    }
    function loopChop() { mk += dir * speed; if (mk > 1) { mk = 1; dir = -1; } if (mk < 0) { mk = 0; dir = 1; } const m = G.el('cmk'); if (m) m.style.left = (mk * 100) + '%'; raf = requestAnimationFrame(loopChop); }
    function chop() { const d = Math.abs(mk - 0.5); chopScores.push(d < 0.06 ? 1 : d < 0.14 ? 0.6 : 0); beat++; if (beat >= beats) { cancelRaf(); fase = 1; startCocer(); } }
    // FASE COCER
    let heat = 0, cooking = true, cookScore = 0;
    function startCocer() { heat = 0; cooking = true; drawCocer(); cancelRaf(); raf = requestAnimationFrame(loopCocer); }
    function drawCocer() {
      sc.innerHTML = `<div class="station-head"><span class="ico">🍲</span><div><h2 class="gold">Cocinar: ${G.esc(receta.nombre)}</h2>
        <div class="dim" style="font-size:12px">Retira del fuego en el punto justo. Si se pasa, se quema.</div></div></div>
        <div class="forge-bar"><div class="forge-zone" style="left:62%;width:20%"></div>
          <div class="forge-zone perfect" style="left:70%;width:8%"></div>
          <div class="forge-marker" id="hmk" style="left:${heat * 100}%;background:var(--gold-lt)"></div></div>
        <div class="dim" style="font-size:12px">punto de cocción</div>
        <button class="btn gold" id="serve">Retirar del fuego</button>`;
      G.el('serve').onclick = serve;
    }
    function loopCocer() { if (!cooking) return; heat += 0.006; const m = G.el('hmk'); if (m) m.style.left = (Math.min(1, heat) * 100) + '%'; if (heat >= 1) { serve(); return; } raf = requestAnimationFrame(loopCocer); }
    function serve() {
      cooking = false; cancelRaf();
      const d = Math.abs(heat - 0.74);
      cookScore = heat > 0.86 ? 0.1 : Math.max(0, 1 - d * 4);
      done(avg(chopScores) * 0.5 + cookScore * 0.5);
    }
    drawChop(); cancelRaf(); raf = requestAnimationFrame(loopChop);
  }

  // --- ARTESANÍA: precisión (toca los nudos del patrón a tiempo) ---
  function mgPrecision(receta, of, done) {
    const total = 6; let done_ = 0, scores = [];
    const sc = G.el('panel-scroll');
    sc.innerHTML = `<div class="station-head"><span class="ico">🪡</span><div><h2 class="gold">Labrar: ${G.esc(receta.nombre)}</h2>
      <div class="dim" style="font-size:12px">Toca cada nudo del patrón apenas aparezca. Rápido y limpio.</div></div></div>
      <div id="pattern" style="position:relative;width:100%;aspect-ratio:1.4;border:1px solid var(--line);background:radial-gradient(circle at 50% 45%,#20242b,#14171c);overflow:hidden"></div>
      <div class="dim" id="pscore" style="margin-top:6px">${'○ '.repeat(total)}</div>`;
    const pad = G.el('pattern');
    function spawn() {
      if (done_ >= total) { return done(avg(scores)); }
      const x = 12 + Math.random() * 76, y = 12 + Math.random() * 70;
      const t0 = performance.now();
      const node = document.createElement('div');
      node.style.cssText = `position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:34px;height:34px;border-radius:50%;border:2px solid var(--gold);background:rgba(168,130,60,.15);cursor:pointer;transition:transform .1s`;
      node.onpointerdown = (e) => {
        e.preventDefault();
        const rt = performance.now() - t0;
        scores.push(rt < 500 ? 1 : rt < 900 ? 0.7 : rt < 1400 ? 0.4 : 0.1);
        node.remove(); done_++;
        G.el('pscore').textContent = scores.map(s => s > 0.8 ? '⬤' : s > 0.4 ? '◐' : '○').join(' ') + ' ○'.repeat(total - done_).trim();
        setTimeout(spawn, 180 + Math.random() * 260);
      };
      pad.appendChild(node);
      // si tarda demasiado, cuenta como fallo leve
      setTimeout(() => { if (pad.contains(node)) { node.remove(); scores.push(0.15); done_++; G.el('pscore').textContent = scores.map(s => s > 0.8 ? '⬤' : s > 0.4 ? '◐' : '○').join(' '); setTimeout(spawn, 150); } }, 1700);
    }
    setTimeout(spawn, 400);
  }

  function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

  /* ============================================================
     MESA DE TRABAJO LIBRE — avienta lo que sea, la IA decide
     ============================================================ */
  const VERBOS = ['cortar','machacar','moler','mezclar','hervir','freír','hornear','fundir','forjar','templar','destilar','coser','tallar','emplatar'];
  let tray = [], verbos = [];

  function mesaLibre(backCb) {
    back = backCb; cancelRaf(); tray = []; verbos = [];
    render();
  }
  function itemsInventario() {
    const s = S(), out = [];
    for (const k in s.inv) {
      if (k === 'orbe') continue;
      out.push({ key: k, nombre: G.nombreItem(k), qty: s.inv[k], icon: G.matIcon(k) });
    }
    (s.objetos || []).forEach(o => out.push({ key: 'obj_' + o.uid, nombre: o.nombre + ' (equipo)', qty: 1, icon: '⚔', obj: o }));
    if (s.oro > 0) out.push({ key: 'oro', nombre: 'Oro', qty: s.oro, icon: '⛃' });
    return out;
  }
  function render() {
    const sc = G.el('panel-scroll');
    let html = `<div class="station-head"><span class="ico">🍶</span><div><h2 class="gold">Mesa de trabajo</h2>
      <div class="dim" style="font-size:12px">Avienta lo que sea — materiales, comida, hasta una espada — hazle cosas, y ve qué sale.</div></div></div>`;
    // bandeja
    html += `<div class="dim small-caps" style="font-size:11px">En la mesa</div><div class="tray" id="tray">`;
    if (!tray.length) html += `<span class="empty">Nada todavía. Añade del inventario.</span>`;
    else tray.forEach((t, i) => html += `<span class="chip on" data-rm="${i}">${G.esc(t.nombre)} ×${t.qty} <span class="x">✕</span></span>`);
    html += `</div><button class="btn ghost mini" id="mesa-add">+ Añadir del inventario</button>`;
    html += `<div id="mesa-picker"></div>`;
    // verbos
    html += `<div class="dim small-caps" style="font-size:11px;margin-top:10px">¿Qué le haces? (en orden)</div><div>`;
    VERBOS.forEach(v => html += `<span class="chip ${verbos.includes(v) ? 'on' : ''}" data-v="${v}">${verbos.includes(v) ? (verbos.indexOf(v) + 1) + '. ' : ''}${v}</span>`);
    html += `</div>`;
    html += `<button class="btn gold" id="mesa-crear" style="margin-top:14px" ${tray.length ? '' : 'disabled'}>Trabajar y ver qué sale</button>
      <button class="btn ghost" id="mesa-back">‹ Salir</button>`;
    sc.innerHTML = html; G.el('panel-actions').innerHTML = '';
    sc.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { tray.splice(+b.dataset.rm, 1); render(); });
    sc.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { const v = b.dataset.v; const i = verbos.indexOf(v); if (i >= 0) verbos.splice(i, 1); else verbos.push(v); render(); });
    G.el('mesa-add').onclick = togglePicker;
    G.el('mesa-crear').onclick = crear;
    G.el('mesa-back').onclick = () => { cancelRaf(); back && back(); };
    G.show('panel');
  }
  function togglePicker() {
    const box = G.el('mesa-picker');
    if (box.innerHTML) { box.innerHTML = ''; return; }
    const items = itemsInventario();
    if (!items.length) { box.innerHTML = `<p class="dim" style="font-size:13px">No traes nada que aventar.</p>`; return; }
    box.innerHTML = `<div class="picker">${items.map((it, i) => `<div class="row" data-add="${i}"><span>${it.icon}</span><span class="nm">${G.esc(it.nombre)}</span><span class="q">×${it.qty}</span></div>`).join('')}</div>`;
    box.querySelectorAll('[data-add]').forEach(r => r.onclick = () => addToTray(items[+r.dataset.add]));
  }
  function addToTray(it) {
    const ex = tray.find(t => t.key === it.key);
    const max = it.qty;
    if (ex) { if (ex.qty < max) ex.qty++; }
    else tray.push({ key: it.key, nombre: it.nombre, qty: 1, kind: it.key.startsWith('obj_') ? 'obj' : it.key === 'oro' ? 'oro' : 'item', obj: it.obj });
    render(); setTimeout(togglePicker, 0);
  }

  function crear() {
    // mini-juego genérico de ejecución (un pulso) → score → juicio
    mgTrabajo((score) => resolverMesa(score));
  }
  function mgTrabajo(done) {
    const rondas = 3; let ronda = 0, hits = [], pos = 0, dir = 1, speed = 0.02;
    const sc = G.el('panel-scroll');
    function draw() {
      sc.innerHTML = `<div class="station-head"><span class="ico">🍶</span><div><h2 class="gold">Trabajando…</h2>
        <div class="dim" style="font-size:12px">Pulso ${ronda + 1}/${rondas}. Da en la zona dorada.</div></div></div>
        <div class="timing-bar" style="height:40px"><div class="forge-zone perfect" style="left:42%;width:16%"></div>
          <div class="forge-marker" id="mk" style="left:${pos * 100}%;background:var(--gold-lt)"></div></div>
        <div class="dim">${hits.map(h => h > 0.8 ? '⬤' : h > 0 ? '◐' : '○').join(' ')}</div>
        <button class="btn gold" id="pulse">Golpe</button>`;
      G.el('pulse').onclick = tap;
    }
    function loop() { pos += dir * speed; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } const m = G.el('mk'); if (m) m.style.left = (pos * 100) + '%'; raf = requestAnimationFrame(loop); }
    function tap() { const d = Math.abs(pos - 0.5); hits.push(d < 0.08 ? 1 : d < 0.16 ? 0.6 : 0); ronda++; if (ronda >= rondas) { cancelRaf(); return done(avg(hits)); } speed = 0.018 + Math.random() * 0.014; }
    draw(); cancelRaf(); raf = requestAnimationFrame(loop);
  }

  async function resolverMesa(score) {
    cancelRaf();
    const sc = G.el('panel-scroll');
    sc.innerHTML = `<p class="thinking">Ves qué resulta… <span class="spinner"></span></p>`;
    const ingredientes = tray.map(t => ({ key: t.key, nombre: t.nombre, qty: t.qty }));
    const res = await NARR.juzgarCreacion({ ingredientes, acciones: verbos, oficio: 'libre', score, nivelOficio: 0 });
    // consumir exactamente lo del consumo
    for (const k in res.consumo) consumir(k, res.consumo[k]);
    // crear el ítem según tipo
    crearDeResultado(res);
    G.save();
    mostrarMesaResultado(res);
  }
  function consumir(key, qty) {
    qty = Math.max(0, qty | 0);
    if (!qty) return;
    if (key === 'oro') { G.apply({ oro: -qty }); return; }
    if (key.startsWith('obj_')) { const uid = key.slice(4); S().objetos = (S().objetos || []).filter(o => o.uid !== uid); return; }
    G.take(key, qty);
  }
  function crearDeResultado(res) {
    if (res.tipo === 'basura') return;
    if (res.tipo === 'comida' || res.tipo === 'pocion') {
      G.crearConsumible({ tipo: res.tipo, nombre: res.nombre, efecto: res.efecto, rareza: res.rareza });
    } else { // arma/armadura/objeto
      G.crearObjeto({ nombre: res.nombre, slot: res.tipo === 'armadura' ? 'armadura' : res.tipo === 'objeto' ? 'foco' : 'arma', base: res.atributos, rareza: res.rareza });
    }
  }
  function mostrarMesaResultado(res) {
    const esBasura = res.tipo === 'basura';
    const stats = Object.assign({}, res.efecto || {}, res.atributos || {});
    const statTxt = Object.entries(stats).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(' · ') || (esBasura ? '—' : '');
    G.modal(`<h3 class="rar-${res.rareza}" style="color:${esBasura ? 'var(--dim)' : 'var(--gold-lt)'}">${G.esc(res.nombre)}</h3>
      <div class="stat-row"><span>Tipo</span><b>${res.tipo}</b></div>
      <div class="stat-row"><span>Calidad</span><b class="rar-${res.rareza}">${res.rareza}</b></div>
      ${statTxt ? `<div class="stat-row"><span>Atributos</span><b>${G.esc(statTxt)}</b></div>` : ''}
      <p class="effect">${G.esc(res.narracion || '')}</p>
      <button class="btn gold" id="mesa-ok">${esBasura ? 'Ni modo' : 'Guardar'}</button>`);
    G.el('mesa-ok').onclick = () => { G.closeModal(); tray = []; verbos = []; render(); };
  }

  return { abrir, mesaLibre, OFICIOS };
})();
