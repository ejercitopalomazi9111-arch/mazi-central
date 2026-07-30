/* ============================================================
   EL PACTO ROTO — mundo.js
   Mapa navegable, pueblos con servicios, exploración, tienda,
   orbes, y un mundo vivo: guerra a gran escala y reputación
   que cambian con o sin ti; pueblos que pueden volverse fantasma.
   ============================================================ */
window.MUNDO = (function () {
  const S = () => G.state;

  /* ---------- MUNDO VIVO: tic ---------- */
  function tic() {
    const s = S(), g = s.mundo.guerra;
    // la guerra avanza sola
    if (!g.activa && s.nivel >= 3 && Math.random() < 0.15) { g.activa = true; g.dia = 0; g.frente = G.pick(['valle','corte']); g.avance = 0; G.toast('Corre la voz: dos reinos rompieron la paz en el valle.', 'blood'); }
    if (g.activa) {
      g.dia++; g.avance += G.rint(-1, 3);
      if (g.avance >= 10) { resolverGuerra(g.frente); }
      else if (g.avance <= -6) { resolverGuerra(g.frente === 'valle' ? 'corte' : 'valle'); }
    }
    // reputación deriva levemente hacia el enemigo si hay Rastro alto
    if (s.rastro >= 3) s.reputacion.moralis = Math.min(-3, s.reputacion.moralis);
    G.save();
  }
  function resolverGuerra(ganador) {
    const g = S().mundo.guerra;
    g.activa = false; g.avance = 0;
    S().reputacion[ganador] = (S().reputacion[ganador] || 0) + 1;
    G.toast(`La guerra del valle terminó. ${DATA.FACCIONES[ganador] ? DATA.FACCIONES[ganador].nombre : ganador} se impuso.`, 'gold');
    S().hilos.push(`${DATA.FACCIONES[ganador] ? DATA.FACCIONES[ganador].nombre : ganador} ganó la guerra del valle.`);
  }

  /* ---------- PUEBLO ---------- */
  const SERV = {
    posada:   { ico:'🛏', nom:'Posada', fn: n => posada() },
    herreria: { ico:'🔨', nom:'Herrería', fn: n => CRAFTING.abrir('herreria', volverPueblo) },
    alquimia: { ico:'⚗',  nom:'Alquimia', fn: n => CRAFTING.abrir('alquimia', volverPueblo) },
    cocina:   { ico:'🍲', nom:'Cocina', fn: n => CRAFTING.abrir('cocina', volverPueblo) },
    artesania:{ ico:'🪡', nom:'Artesanía', fn: n => CRAFTING.abrir('artesania', volverPueblo) },
    tienda:   { ico:'🪙', nom:'Tienda', fn: n => tienda() },
    atelier:  { ico:'✒',  nom:'Atelier', fn: n => UI.abrirAtelier({ onCast: null }) },
    orbes:    { ico:'🔮', nom:'Orbes', fn: n => casaOrbes() },
    muelle:   { ico:'🎣', nom:'Muelle', fn: n => { VIDA.pescar(volverPueblo); } },
    pesca:    { ico:'🎣', nom:'Pesca', fn: n => { VIDA.pescar(volverPueblo); } },
    caza:     { ico:'🏹', nom:'Caza', fn: n => { VIDA.cazar(volverPueblo); } },
    mesa:     { ico:'🍶', nom:'Mesa libre', fn: n => CRAFTING.mesaLibre(volverPueblo) },
  };
  const CRAFT_SERV = ['herreria','alquimia','cocina','artesania'];

  function volverPueblo() { pueblo(); }

  function pueblo() {
    const s = S(); const n = DATA.NODOS[s.lugar];
    const fantasma = s.mundo.pueblosFantasma.includes(s.lugar);
    UI.mostrarJuego();
    const sc = G.el('juego-scroll');
    const facc = n.faccion ? DATA.FACCIONES[n.faccion] : null;
    let html = `${G.plateHTML(regionArt(n.region))}
      <h2 class="gold" style="margin-bottom:2px">${G.esc(n.nombre)}</h2>
      <div class="dim" style="font-size:12.5px;margin-bottom:4px">${G.esc(regionNombre(n.region))}${facc ? ' · ' + G.esc(facc.nombre) : ' · tierra de nadie'}</div>
      <p class="narr">${fantasma ? '<span class="blood">Cenizas. Lo que fue un pueblo ahora es silencio y viento. Tú hiciste esto.</span>' : G.esc(n.desc)}</p>`;
    if (S().mundo.guerra.activa) html += `<div class="effect">Suena la guerra al sur. Frente: ${G.esc(S().mundo.guerra.frente)}, avance ${S().mundo.guerra.avance}.</div>`;
    if (!fantasma) {
      html += `<hr class="rule"><div class="dim small-caps" style="font-size:12px">Servicios</div><div class="btnrow" style="margin-top:6px">`;
      const servs = (n.servicios || []).slice();
      if (servs.some(k => CRAFT_SERV.includes(k)) && !servs.includes('mesa')) servs.push('mesa');
      servs.forEach(k => { if (SERV[k]) html += `<button class="btn mini" data-serv="${k}">${SERV[k].ico} ${SERV[k].nom}</button>`; });
      html += `</div>`;
    }
    html += barraAccionHTML('Haz lo que quieras: hablar, buscar, robar, quemar…');
    sc.innerHTML = html;
    sc.querySelectorAll('[data-serv]').forEach(b => b.onclick = () => SERV[b.dataset.serv].fn(n));
    wireAccion(sc);
    UI.hub();
  }

  /* ---------- ACCIÓN LIBRE: hablar con el mundo ---------- */
  function barraAccionHTML(ph) {
    return `<hr class="rule"><div class="accion-libre">
      <input class="field" id="acc-input" placeholder="${G.esc(ph || '¿Qué haces?')}" maxlength="120" autocomplete="off">
      <button class="btn gold" id="acc-go" style="margin-top:6px">▸ Hacerlo</button></div>`;
  }
  function wireAccion(scEl) {
    const inp = scEl.querySelector('#acc-input'), go = scEl.querySelector('#acc-go');
    if (!go) return;
    const fire = () => { const t = inp.value.trim(); if (t) accionLibre(t); };
    go.onclick = fire;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') fire(); });
  }
  async function accionLibre(texto) {
    UI.mostrarJuego();
    const sc = G.el('juego-scroll');
    sc.innerHTML = `<p class="narr">${G.esc(texto)}</p><p class="thinking">El mundo responde… <span class="spinner"></span></p>`;
    UI.hub();
    let res;
    try { res = await NARR.accionLibre(texto); }
    catch (e) { res = { narracion: 'El mundo calla.', opciones: [{ t: 'Seguir', hint: '' }], cambios: {} }; }
    if (res.hilo) NARR.registrarHilo(S(), res.hilo);
    G.aplicarEfectos(res);
    // avisos de lo ganado
    const ganado = [];
    if (res.dar) for (const m in res.dar) ganado.push(`${res.dar[m]}× ${DATA.MATS[m] ? DATA.MATS[m].nombre : m}`);
    if (res.objeto) ganado.push(res.objeto.nombre);
    if (res.crear) ganado.push(res.crear.nombre);
    if (ganado.length) G.toast('Obtienes: ' + ganado.join(', '), 'gold');
    if (res.fantasma) G.toast('El pueblo queda en cenizas. Así se queda.', 'blood');
    // cambio de lugar sugerido por la IA
    if (res.lugar) { const id = resolverLugar(res.lugar); if (id && id !== S().lugar && DATA.NODOS[id]) { S().lugar = id; if (!S().mundo.visitados.includes(id)) S().mundo.visitados.push(id); G.save(); } }
    escena(res, { libre: true });
    if (res.enemigo) setTimeout(() => {}, 0); // el botón de enemigo lo pinta escena
  }
  function resolverLugar(nombre) {
    const t = String(nombre).toLowerCase();
    for (const id in DATA.NODOS) { if (id === t || DATA.NODOS[id].nombre.toLowerCase() === t || DATA.NODOS[id].nombre.toLowerCase().includes(t)) return id; }
    return null;
  }

  /* ---------- POSADA (descanso) ---------- */
  function posada() {
    const cost = 8;
    G.modal(`<h3>Posada</h3><p>Una cama, caldo y una noche sin sobresaltos. Recupera vida y maná. Cuesta ${cost} oro.</p>
      <button class="btn gold" id="rest" ${S().oro < cost ? 'disabled' : ''}>Dormir (${cost} oro)</button>
      <button class="btn ghost" id="rest-no">Salir</button>`);
    G.el('rest-no').onclick = G.closeModal;
    const r = G.el('rest'); if (r) r.onclick = () => { G.apply({ oro: -cost }); S().hp = S().hpMax; S().mana = S().manaMax; G.save(); G.closeModal(); tic(); G.toast('Amaneces entero.', 'gold'); pueblo(); };
  }

  /* ---------- TIENDA ---------- */
  const PRECIOS = { mena:4, lingote:9, carbon:5, gema:22, cuero:6, madera:3, raiz:5, ceniza_h:6, esporas:5, lagrima:8, seta:3, trigo:2, carne:5, pescado:5, huevo:3, zanahoria:2, manzana:2 };
  function tienda() {
    const mods = S().reputacion.valle >= 2 ? 0.85 : 1;
    const buyMod = (S().clase === 'tintero') ? 0.8 : 1;
    let html = `<div class="station-head"><span class="ico">🪙</span><div><h2 class="gold">Tienda</h2><div class="dim" style="font-size:12px">Oro: ${S().oro} ⛃</div></div></div>
      <div class="dim small-caps" style="font-size:11px;margin-top:6px">Comprar</div>`;
    Object.keys(PRECIOS).forEach(m => {
      const p = Math.max(1, Math.round(PRECIOS[m] * mods * buyMod));
      html += `<div class="stat-row"><span>${G.matIcon(m)} ${DATA.MATS[m] ? DATA.MATS[m].nombre : m} <span class="dim">(${p})</span></span>
        <button class="btn mini" data-buy="${m}" data-p="${p}">Comprar</button></div>`;
    });
    html += `<div class="dim small-caps" style="font-size:11px;margin-top:12px">Vender lo tuyo</div>`;
    Object.keys(S().inv).filter(k => PRECIOS[k]).forEach(m => {
      const p = Math.max(1, Math.round(PRECIOS[m] * 0.5));
      html += `<div class="stat-row"><span>${G.matIcon(m)} ${DATA.MATS[m] ? DATA.MATS[m].nombre : m} ×${S().inv[m]} <span class="dim">(vende ${p})</span></span>
        <button class="btn mini" data-sell="${m}" data-p="${p}">Vender</button></div>`;
    });
    html += `<button class="btn ghost" id="shop-back" style="margin-top:12px">‹ Salir</button>`;
    const sc = G.el('panel-scroll'); sc.innerHTML = html; G.el('panel-actions').innerHTML = '';
    sc.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const p = +b.dataset.p; if (S().oro < p) return G.toast('No te alcanza.', ''); G.apply({ oro: -p }); G.give(b.dataset.buy, 1); tienda(); });
    sc.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { const p = +b.dataset.p; if (!G.take(b.dataset.sell, 1)) return; G.apply({ oro: p }); tienda(); });
    G.el('shop-back').onclick = volverPueblo;
    G.show('panel');
  }

  /* ---------- CASA DE ORBES ---------- */
  async function casaOrbes() {
    const orbes = S().inv['orbe'] || 0;
    let html = `<div class="station-head"><span class="ico">🔮</span><div><h2 class="gold">Casa de Orbes</h2>
      <div class="dim" style="font-size:12px">Abrir un orbe cuesta 12 oro. Da una habilidad al azar según lo que mataste.</div></div></div>
      <p>Traes <b class="gold">${orbes}</b> orbes.</p>
      <button class="btn gold" id="open-orb" ${orbes < 1 || S().oro < 12 ? 'disabled' : ''}>Abrir un orbe (12 oro)</button>
      <button class="btn ghost" id="orb-back">‹ Salir</button>
      <div id="orb-res"></div>`;
    const sc = G.el('panel-scroll'); sc.innerHTML = html; G.el('panel-actions').innerHTML = '';
    G.el('orb-back').onclick = volverPueblo;
    const ob = G.el('open-orb');
    if (ob) ob.onclick = async () => {
      G.take('orbe', 1); G.apply({ oro: -12 });
      G.el('orb-res').innerHTML = `<p class="thinking">El orbe se resquebraja… <span class="spinner"></span></p>`;
      const r = await NARR.juzgarOrbe(G.rint(1, S().nivel + 6), G.pick(['bestia','espectro','moralis','yokai']));
      if (r.potencia !== 'nula') { S().grimorio.push({ nombre: r.habilidad, lectura: 'orbe', pot: r.potencia }); G.apply({ xp: 6 }); }
      G.el('orb-res').innerHTML = `<div class="effect rar-${r.potencia === 'brutal' ? 'legendaria' : r.potencia === 'fuerte' ? 'maestra' : 'fina'}">
        <b>${G.esc(r.habilidad)}</b> — ${G.esc(r.desc)} <span class="dim">(${r.potencia})</span></div>`;
      G.save(); casaOrbesRefresh();
    };
    G.show('panel');
    function casaOrbesRefresh() { const o = S().inv['orbe'] || 0; const btn = G.el('open-orb'); if (btn) btn.disabled = (o < 1 || S().oro < 12); }
  }

  /* ---------- MAPA / VIAJE ---------- */
  function mapa() {
    const s = S(); const here = DATA.NODOS[s.lugar];
    let nodesHTML = '';
    for (const id in DATA.NODOS) {
      const n = DATA.NODOS[id];
      const reachable = here.con && here.con.includes(id);
      const isHere = id === s.lugar;
      const fantasma = s.mundo.pueblosFantasma.includes(id);
      const locked = n.locked && !reachable;
      nodesHTML += `<div class="map-node ${isHere ? 'here' : ''} ${fantasma ? 'ghost' : ''} ${(!isHere && !reachable) ? 'locked' : ''}" style="left:${n.x}%;top:${n.y}%" ${reachable ? `data-go="${id}"` : ''}>
        <div class="dot"></div><div class="nm">${G.esc(n.nombre.split(' ').slice(0, 2).join(' '))}</div></div>`;
    }
    const sc = G.el('panel-scroll');
    sc.innerHTML = `<div class="station-head"><span class="ico">🗺</span><div><h2 class="gold">El mapa</h2>
      <div class="dim" style="font-size:12px">Estás en ${G.esc(here.nombre)}. Toca un destino conectado.</div></div></div>
      <div class="map" style="height:60vh;border:1px solid var(--line);background:radial-gradient(circle at 50% 40%,#1c2027,#101216)">${nodesHTML}</div>
      <button class="btn ghost" id="map-back" style="margin-top:12px">‹ Volver</button>`;
    G.el('panel-actions').innerHTML = '';
    sc.querySelectorAll('[data-go]').forEach(b => b.onclick = () => viajar(b.dataset.go));
    G.el('map-back').onclick = () => { UI.mostrarJuego(); pueblo(); };
    G.show('panel');
  }

  function viajar(id) {
    const n = DATA.NODOS[id];
    if (n.locked) return G.toast(n.lockHint || 'Cerrado.', '');
    S().lugar = id;
    if (!S().mundo.visitados.includes(id)) S().mundo.visitados.push(id);
    tic();
    G.save();
    // encuentro en el camino
    if (Math.random() < 0.4) {
      const region = n.region;
      G.toast(`Camino a ${n.nombre}…`, '');
      UI.mostrarJuego(); pueblo();
      setTimeout(() => explorar(true), 400);
    } else { UI.mostrarJuego(); pueblo(); }
  }

  /* ---------- EXPLORACIÓN ---------- */
  async function explorar(forzado) {
    UI.mostrarJuego();
    const sc = G.el('juego-scroll');
    sc.innerHTML = `<p class="thinking">Avanzas… <span class="spinner"></span></p>`;
    UI.hub();
    let turn;
    try { turn = await NARR.turno('explorar los alrededores'); }
    catch (e) { turn = { narracion: 'El camino sigue, mudo.', imagen_id: null, opciones: [{ t: 'Seguir', hint: '' }], cambios: {}, enemigo: null }; }
    if (turn.hilo) NARR.registrarHilo(S(), turn.hilo);
    G.aplicarEfectos(turn);
    escena(turn);
  }

  function escena(turn) {
    const sc = G.el('juego-scroll');
    let html = '';
    if (turn.imagen_id) html += G.plateHTML(turn.imagen_id);
    html += `<p class="narr capital">${G.esc(turn.narracion)}</p>`;
    sc.innerHTML = html;
    // enemigo directo
    if (turn.enemigo) {
      const btn = document.createElement('button'); btn.className = 'btn blood'; btn.innerHTML = `⚔ Enfrentar a ${G.esc(turn.enemigo.n)} <span class="hint">Nv ${turn.enemigo.nivel}</span>`;
      btn.onclick = () => COMBATE.iniciar(turn.enemigo.key || { n: turn.enemigo.n, nivel: turn.enemigo.nivel, hp: turn.enemigo.hp }, () => { UI.mostrarJuego(); pueblo(); });
      sc.appendChild(btn);
      const flee = document.createElement('button'); flee.className = 'btn ghost'; flee.textContent = 'Evitarlo y seguir';
      flee.onclick = () => explorar(); sc.appendChild(flee);
    }
    (turn.opciones || []).forEach(op => {
      const b = document.createElement('button'); b.className = 'btn';
      b.innerHTML = `${G.esc(op.t)}${op.hint ? `<span class="hint">${G.esc(op.hint)}</span>` : ''}`;
      b.onclick = () => {
        if (op.r) G.apply(op.r);
        if (op.loot) op.loot.forEach(m => G.give(m, 1));
        if (op.enemigo) return COMBATE.iniciar(op.enemigo, () => { UI.mostrarJuego(); pueblo(); });
        if (op.ir === 'caza') return VIDA.cazar(() => { UI.mostrarJuego(); pueblo(); });
        if (op.ir === 'pesca') return VIDA.pescar(() => { UI.mostrarJuego(); pueblo(); });
        if (op.loot && op.loot.length) G.toast('Recoges algo útil.', 'gold');
        explorar();
      };
      sc.appendChild(b);
    });
    // recolectar siempre disponible
    const rec = document.createElement('button'); rec.className = 'btn ghost'; rec.textContent = '⛏ Recolectar por aquí';
    rec.onclick = () => { const g = VIDA.recolectar(DATA.NODOS[S().lugar].region); G.toast(`Recoges ${g.n}× ${g.nombre}.`, 'gold'); };
    sc.appendChild(rec);
    // campo de acción libre
    const bar = document.createElement('div'); bar.innerHTML = barraAccionHTML('¿Qué haces? Escríbelo…');
    sc.appendChild(bar); wireAccion(sc);
    UI.hub();
  }

  function regionArt(r) {
    const map = { ruinas:'ruinas_arco', norte:'norte_invierno', salvaje:'salvaje_bruja', inframundo:'dore_satan', mar:'bocklin_isla', guerra:'guerra_ira' };
    return map[r] || 'circulo_magico';
  }
  function regionNombre(r) {
    return { ruinas:'Las Ruinas', norte:'El Norte', salvaje:'El Yermo', inframundo:'El Inframundo', mar:'El Mar de los Callados', guerra:'El frente' }[r] || r;
  }

  return { pueblo, mapa, viajar, explorar, tienda, tic, regionArt, volverPueblo };
})();
