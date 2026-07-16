/* ============================================================
   EL PACTO ROTO — ui.js
   Portada, creación de personaje, config del oráculo (IA),
   hub, inventario, grimorio, ficha, y el flujo del atelier.
   ============================================================ */
window.UI = (function () {
  const S = () => G.state;
  let atelierCtx = null;

  /* ---------- PORTADA ---------- */
  function initPortada() {
    const cont = G.el('btn-continuar');
    if (G.hasSave()) cont.style.display = 'block';
    cont.onclick = () => { if (G.load()) entrarJuego(); };
    G.el('btn-nueva').onclick = () => { if (G.hasSave() && !confirm('Hay una partida guardada. ¿Empezar de nuevo la borra. Seguir?')) return; crearPersonaje(); };
    G.el('btn-config').onclick = configIA;
  }

  /* ---------- CONFIG IA ---------- */
  function configIA() {
    const c = G.getCfg();
    G.modal(`<h3>El Oráculo</h3>
      <p class="dim" style="font-size:13px">Con una llave, un modelo de lenguaje narra y juzga tus sellos con criterio. Sin llave, el juego corre con sus propias reglas (offline). La llave se guarda solo en tu teléfono, nunca en el código.</p>
      <div style="margin:10px 0">
        <label class="dim" style="font-size:12px">Proveedor</label>
        <select class="field" id="cfg-prov">
          <option value="groq" ${c.prov !== 'anthropic' ? 'selected' : ''}>Groq (gratis, rápido)</option>
          <option value="anthropic" ${c.prov === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
        </select>
        <input class="field" id="cfg-key" type="password" placeholder="Pega tu API key" value="${c.key ? G.esc(c.key) : ''}">
        <input class="field" id="cfg-model" placeholder="Modelo (opcional)" value="${c.model ? G.esc(c.model) : ''}">
      </div>
      <button class="btn gold" id="cfg-save">Guardar</button>
      <button class="btn ghost" id="cfg-test">Probar conexión</button>
      <button class="btn ghost" id="cfg-off">Jugar sin datos (borrar llave)</button>
      <div id="cfg-msg" class="dim" style="font-size:13px;margin-top:6px"></div>`);
    G.el('cfg-save').onclick = () => {
      const prov = G.el('cfg-prov').value, key = G.el('cfg-key').value.trim(), model = G.el('cfg-model').value.trim();
      G.setCfg({ prov, key, model: model || (prov === 'anthropic' ? 'claude-sonnet-5' : 'llama-3.3-70b-versatile') });
      G.el('cfg-msg').textContent = key ? 'Guardado. El oráculo despierta.' : 'Guardado. Modo sin datos.';
    };
    G.el('cfg-off').onclick = () => { G.setCfg({}); G.el('cfg-key').value = ''; G.el('cfg-msg').textContent = 'Llave borrada. Corres con reglas propias.'; };
    G.el('cfg-test').onclick = async () => {
      const prov = G.el('cfg-prov').value, key = G.el('cfg-key').value.trim(), model = G.el('cfg-model').value.trim();
      if (!key) { G.el('cfg-msg').textContent = 'Sin llave no hay qué probar.'; return; }
      G.setCfg({ prov, key, model: model || (prov === 'anthropic' ? 'claude-sonnet-5' : 'llama-3.3-70b-versatile') });
      G.el('cfg-msg').innerHTML = 'Probando… <span class="spinner"></span>';
      try { const r = await NARR.llm('Responde solo la palabra: VIVO', 'di VIVO', { temp: 0, maxTok: 8 }); G.el('cfg-msg').textContent = r && /VIVO/i.test(r) ? 'El oráculo responde. Conectado.' : 'Respondió: ' + (r || '(vacío)'); }
      catch (e) { G.el('cfg-msg').textContent = 'No conectó: ' + e.message; }
    };
  }

  /* ---------- CREACIÓN DE PERSONAJE ---------- */
  function crearPersonaje() {
    let clase = 'grabador', raza = 'pardo', nombre = '';
    const clsCards = Object.entries(DATA.CLASES).map(([k, c]) =>
      `<div class="choice-card ${k === clase ? 'sel' : ''}" data-cls="${k}"><h3>${G.esc(c.nombre)}</h3>
        <div class="role">${G.esc(c.rol)} — ${G.esc(c.desc)}</div>
        <div class="st">Fue ${c.stats.fue} · Int ${c.stats.int} · Maná ${c.stats.mana} · Suerte ${c.stats.suerte}</div></div>`).join('');
    const razCards = Object.entries(DATA.RAZAS).map(([k, r]) =>
      `<div class="choice-card ${k === raza ? 'sel' : ''}" data-raz="${k}"><h3>${G.esc(r.nombre)}</h3>
        <div class="role">${G.esc(r.desc)}</div>
        <div class="st">${Object.entries(r.mods).map(([s, v]) => `${s} ${v > 0 ? '+' : ''}${v}`).join(' · ')}</div></div>`).join('');
    const sc = G.el('panel-scroll');
    sc.innerHTML = `<h2 class="gold center" style="margin:6px 0 2px">Quién eres</h2>
      <div class="dim center" style="font-size:12px;margin-bottom:10px">Se puede cambiar el rumbo, no el origen.</div>
      <input class="field" id="pj-nombre" placeholder="Tu nombre" maxlength="18">
      <div class="deco">· clase ·</div>${clsCards}
      <div class="deco">· raza ·</div>${razCards}
      <button class="btn gold" id="pj-start" style="margin-top:14px">Empezar</button>
      <button class="btn ghost" id="pj-cancel">Volver</button>`;
    G.el('panel-actions').innerHTML = '';
    sc.querySelectorAll('[data-cls]').forEach(c => c.onclick = () => { clase = c.dataset.cls; sc.querySelectorAll('[data-cls]').forEach(x => x.classList.toggle('sel', x === c)); });
    sc.querySelectorAll('[data-raz]').forEach(c => c.onclick = () => { raza = c.dataset.raz; sc.querySelectorAll('[data-raz]').forEach(x => x.classList.toggle('sel', x === c)); });
    G.el('pj-cancel').onclick = () => G.show('portada');
    G.el('pj-start').onclick = () => {
      nombre = G.el('pj-nombre').value.trim() || 'Sin Nombre';
      G.newGame(nombre, clase, raza);
      G.modal(`<h3 class="gold">${G.esc(nombre)}</h3><p>${G.esc(DATA.CLASES[clase].desc)}</p>
        <p class="dim" style="font-size:13px">Despiertas en el Umbral de Vela Muerta, a la sombra de las Ruinas. El mundo olvidó que la magia fue de todos. Tú vas a recordárselo — o a morir intentándolo.</p>
        <button class="btn gold" id="go">Empezar</button>`, { dismiss: false });
      G.el('go').onclick = () => { G.closeModal(); prologo(); };
    };
    G.show('panel');
  }

  /* ---------- PRÓLOGO (por qué tienes tinta mágica) ---------- */
  function prologo() {
    const s = S();
    const cls = DATA.CLASES[s.clase];
    const notaClase = {
      grabador: 'Tus manos ya saben lo que es una pluma. Solo les faltaba con qué.',
      vinculo: 'No sabes de sellos, pero las bestias del monte te siguen sin que las llames.',
      rompesellos: 'Tú no dibujas: rompes. Pero un anillo cerrado en el momento justo también salva.',
      tintero: 'De tinta y de oficios sí sabes. Lo demás se aprende en el camino.',
    }[s.clase] || '';
    const beats = [
      { art: 'dore_paraiso', txt: `Hubo un tiempo en que la magia fue de todos. Cualquiera con una pluma y tinta podía dibujar el mundo y cambiarlo un poco. Nadie lo recuerda ya.` },
      { art: 'circulo_magico', txt: `Los Sombreros Puntiagudos se quedaron con el secreto y le borraron al mundo hasta la memoria de que alguna vez fue suyo. Ahora dibujar sin su permiso es un crimen. Dibujar sobre carne, una condena.` },
      { art: 'ruinas_torre', txt: `Tú eres nadie. Un don nadie más en el Umbral de Vela Muerta, un puesto de piedra a la sombra de unas ruinas que no llevan a ningún lado. Hasta esta noche.` },
      { art: 'pesadilla', txt: `Un desconocido se derrumba en tu puerta, con la espalda abierta y los Moralis pisándole el rastro. Antes de apagarse, te mete en la mano un frasco de tinta negra. "Guárdala. Y aprende a dibujar antes de que a ti también te encuentren."` },
      { art: 'circulo_magico', txt: `Te deja una sola regla, la primera: sin anillo cerrado, nada pasa. Todo lo demás tendrás que arrancárselo al mundo tú solo. ${notaClase}` },
    ];
    let i = 0;
    function pintar() {
      const b = beats[i];
      const sc = G.el('panel-scroll');
      sc.innerHTML = `${G.plateHTML(b.art)}
        <p class="narr capital" style="min-height:120px">${G.esc(b.txt)}</p>
        <button class="btn gold" id="pro-next">${i < beats.length - 1 ? '▸ Seguir' : 'Despertar con la tinta'}</button>
        ${i < beats.length - 1 ? '<button class="btn ghost mini" id="pro-skip">Saltar intro</button>' : ''}`;
      G.el('panel-actions').innerHTML = '';
      G.el('pro-next').onclick = () => { i++; (i < beats.length) ? pintar() : arrancar(); };
      const sk = G.el('pro-skip'); if (sk) sk.onclick = arrancar;
      G.show('panel');
    }
    function arrancar() {
      // el kit humilde: el frasco de tinta (tu maná) + un mendrugo para el camino
      s.flags.nuevo = false;
      s.mana = s.manaMax;
      G.crearConsumible({ tipo: 'comida', nombre: 'Mendrugo de pan', efecto: { hp: 6 }, rareza: 'tosca' });
      G.give('raiz', 1);
      s.hilos.push('Un desconocido te dio un frasco de tinta y murió por ello.');
      G.save();
      entrarJuego();
    }
    pintar();
  }

  /* ---------- ENTRAR / HUB ---------- */
  function entrarJuego() { mostrarJuego(); G.emit(); MUNDO.pueblo(); }
  function mostrarJuego() { document.body.classList.remove('flesh-mode'); G.show('juego'); G.renderHUD(); }

  function hub() {
    const ab = G.el('actionbar'); if (!ab) return;
    const acts = [
      ab2('🧭', 'Explorar', () => MUNDO.explorar()),
      ab2('🗺', 'Viajar', () => MUNDO.mapa()),
      ab2('🏘', 'Pueblo', () => MUNDO.pueblo()),
      ab2('✒', 'Atelier', () => abrirAtelier({ onCast: null })),
      ab2('🐾', 'Manada', () => VIDA.pantallaMascotas(() => { mostrarJuego(); MUNDO.pueblo(); })),
      ab2('🎒', 'Bolsa', () => inventario()),
      ab2('📖', 'Grimorio', () => grimorio()),
      ab2('👤', 'Ficha', () => ficha()),
    ];
    ab.innerHTML = ''; acts.forEach(a => ab.appendChild(a));
  }
  function ab2(ico, txt, fn) { const d = document.createElement('button'); d.className = 'ab'; d.innerHTML = `<span class="ico">${ico}</span>${G.esc(txt)}`; d.onclick = fn; return d; }

  /* ---------- ATELIER ---------- */
  function abrirAtelier(ctx) {
    atelierCtx = ctx || { onCast: null };
    G.show('atelier');
    if (!MAGIA._inited) { MAGIA.initAtelier(); MAGIA._inited = true; }
    setTimeout(() => MAGIA.resize(), 30);
    MAGIA.clear();
    if (atelierCtx.moralis) MAGIA.isOnCarne(); // no-op, sólo aviso
    renderAtelierActions();
  }
  function renderAtelierActions() {
    const ab = G.el('atelier-actions');
    const acts = [
      ab2('🧹', 'Limpiar', () => MAGIA.clear()),
      ab2(MAGIA.isOnCarne() ? '🩸' : '📜', MAGIA.isOnCarne() ? 'Sobre carne' : 'Papel', () => { MAGIA.toggleCarne(); renderAtelierActions(); }),
      ab2('◎', 'Guardar diferido', () => guardarDiferido()),
      ab2('✦', 'Cerrar el sello', () => cerrarSello()),
    ];
    if (!atelierCtx.combate) acts.push(ab2('‹', 'Salir', () => { document.body.classList.remove('flesh-mode'); mostrarJuego(); MUNDO.pueblo(); }));
    else acts.push(ab2('‹', 'Volver', () => volverCombate()));
    ab.innerHTML = ''; acts.forEach(a => ab.appendChild(a));
  }
  function guardarDiferido() {
    if (MAGIA.isEmpty()) return G.toast('No hay nada que guardar.', '');
    const rd = MAGIA.currentReading();
    S().selloDiferido = { anillo: rd.anillo, sigilo: rd.sigilo, dentro: rd.dentro };
    G.save();
    G.toast('Guardas el sello casi cerrado. Ciérralo cuando lo necesites.', 'gold');
  }
  function cerrarSello() {
    if (MAGIA.isEmpty()) return G.toast('El lienzo está vacío.', '');
    const reading = MAGIA.currentReading();
    const onCarne = MAGIA.isOnCarne();
    G.modal(`<h3>Cerrar el anillo</h3>
      <div class="dim" style="font-size:12.5px">${G.esc(reading._a ? reading._a.resumen : '')}</div>
      <p class="dim" style="font-size:12.5px;margin-top:6px">¿Qué quisiste dibujar? Tu intención guía al mundo — pero si los trazos no la respaldan, saldrá otra cosa.</p>
      <input class="field" id="intent" placeholder="p.ej. una jaula de luz que lo ate" maxlength="80">
      <button class="btn gold" id="cast-go">Cerrar el sello</button>
      <button class="btn ghost" id="cast-no">Seguir dibujando</button>`);
    G.el('cast-no').onclick = G.closeModal;
    G.el('cast-go').onclick = async () => {
      const intent = G.el('intent').value.trim();
      G.el('cast-go').innerHTML = 'El anillo se cierra… <span class="spinner"></span>'; G.el('cast-go').disabled = true;
      const res = await NARR.juzgarSello(reading, intent, onCarne);
      G.closeModal();
      MAGIA.flourish(res.exito);
      if (atelierCtx.onCast) { atelierCtx.onCast(res, reading); return; }
      // fuera de combate: aplicar al mundo
      if (res.cambios) G.apply(res.cambios);
      if (res.aprendido) { S().grimorio.push({ nombre: res.aprendido, lectura: reading._a ? reading._a.resumen : '' }); G.save(); }
      // evolución del grabador: 3 sellos sobre carne sobreviviendo
      if (onCarne) { S().flags.carne = (S().flags.carne || 0) + 1; if (S().flags.carne >= 3 && S().clase === 'grabador' && !S().evoluciones.includes('grabador')) evolucionar('grabador'); }
      mostrarResultadoSello(res);
    };
  }
  function mostrarResultadoSello(res) {
    document.body.classList.remove('flesh-mode');
    mostrarJuego();
    const sc = G.el('juego-scroll');
    const cls = { total: 'gold', parcial: 'verd', fallo: 'dim', contragolpe: 'blood' }[res.exito] || 'dim';
    sc.innerHTML = `${res.imagen_id ? G.plateHTML(res.imagen_id) : ''}
      <h2 class="${cls}" style="margin-bottom:2px">${G.esc(res.nombre)}</h2>
      <div class="dim small-caps" style="font-size:12px">${G.esc(res.exito)}</div>
      <p class="narr capital">${G.esc(res.narracion)}</p>
      ${res.efecto ? `<p class="effect">${G.esc(res.efecto)}</p>` : ''}
      ${res.aprendido ? `<p class="verd">Aprendiste: <b>${G.esc(res.aprendido)}</b>. Queda en tu grimorio.</p>` : ''}
      <button class="btn gold" id="sello-cont">Seguir</button>
      <button class="btn ghost" id="sello-otra">Dibujar otro</button>`;
    G.el('sello-cont').onclick = () => MUNDO.pueblo();
    G.el('sello-otra').onclick = () => abrirAtelier({ onCast: null });
    UI.hub();
  }
  function volverCombate() { document.body.classList.remove('flesh-mode'); G.show('juego'); G.renderHUD(); COMBATE.render(); }

  /* ---------- INVENTARIO ---------- */
  function inventario() {
    const s = S();
    let html = `<div class="station-head"><span class="ico">🎒</span><div><h2 class="gold">Bolsa</h2><div class="dim" style="font-size:12px">${s.oro} oro</div></div></div>`;
    // equipo
    html += `<div class="dim small-caps" style="font-size:12px">Equipado</div><div class="stat-row"><span>Arma</span><b>${s.equipo.arma ? G.esc(s.equipo.arma.nombre) + ' (atq ' + s.equipo.arma.base.ataque + ')' : '—'}</b></div>
      <div class="stat-row"><span>Armadura</span><b>${s.equipo.armadura ? G.esc(s.equipo.armadura.nombre) + ' (def ' + s.equipo.armadura.base.defensa + ')' : '—'}</b></div>
      <div class="stat-row"><span>Foco</span><b>${s.equipo.foco ? G.esc(s.equipo.foco.nombre) : '—'}</b></div>`;
    // objetos crafteados equipables
    if (s.objetos && s.objetos.length) {
      html += `<div class="dim small-caps" style="font-size:12px;margin-top:10px">Objetos</div>`;
      s.objetos.forEach(o => html += `<div class="stat-row rar-${o.rareza}"><span>${G.esc(o.nombre)} <span class="dim">(${o.rareza})</span></span><button class="btn mini" data-eq="${o.uid}">Equipar</button></div>`);
    }
    // pociones
    const pocs = Object.keys(s.inv).filter(k => k.startsWith('poc_'));
    if (pocs.length) { html += `<div class="dim small-caps" style="font-size:12px;margin-top:10px">Pociones</div>`; pocs.forEach(k => { const m = s.flags['pocmeta_' + k]; html += `<div class="stat-row"><span>${G.esc(m ? m.nombre : k)} ×${s.inv[k]}</span></div>`; }); }
    // comida
    const foods = Object.keys(s.inv).filter(k => k.startsWith('food_'));
    if (foods.length) { html += `<div class="dim small-caps" style="font-size:12px;margin-top:10px">Comida</div>`; foods.forEach(k => { const m = s.flags['foodmeta_' + k]; html += `<div class="stat-row"><span>${G.esc(m ? m.nombre : k)} ×${s.inv[k]}</span><button class="btn mini" data-eat="${k}">Comer</button></div>`; }); }
    // herramientas
    const tools = Object.keys(s.inv).filter(k => k.startsWith('tool_'));
    if (tools.length) { html += `<div class="dim small-caps" style="font-size:12px;margin-top:10px">Herramientas</div>`; tools.forEach(k => { html += `<div class="stat-row"><span>${G.esc(G.nombreItem(k))} ×${s.inv[k]}</span></div>`; }); }
    // materiales
    const mats = Object.keys(s.inv).filter(k => DATA.MATS[k]);
    html += `<div class="dim small-caps" style="font-size:12px;margin-top:10px">Materiales</div><div class="grid">`;
    mats.forEach(k => html += `<div class="slot"><span class="spr" style="${G.sprStyle(k)}">${DATA.MATS[k] && !DATA.MATS[k].sheet ? DATA.MATS[k].glifo : ''}</span><span class="qty">${s.inv[k]}</span><span class="qn">${G.esc(DATA.MATS[k].nombre)}</span></div>`);
    html += `</div><button class="btn ghost" id="inv-back">‹ Volver</button>`;
    const sc = G.el('panel-scroll'); sc.innerHTML = html; G.el('panel-actions').innerHTML = '';
    sc.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => equipar(b.dataset.eq));
    sc.querySelectorAll('[data-eat]').forEach(b => b.onclick = () => comer(b.dataset.eat));
    G.el('inv-back').onclick = () => { mostrarJuego(); MUNDO.pueblo(); };
    G.show('panel');
  }
  function equipar(uid) {
    const o = (S().objetos || []).find(x => x.uid === uid); if (!o) return;
    S().equipo[o.slot] = o; G.save(); G.emit(); G.toast(`Equipas ${o.nombre}.`, 'gold'); inventario();
  }
  function comer(k) {
    const m = S().flags['foodmeta_' + k]; if (!m) return; G.take(k, 1); if (m.buff) G.apply(m.buff); G.toast(`Comes ${m.nombre}.`, 'gold'); inventario();
  }

  /* ---------- GRIMORIO ---------- */
  function grimorio() {
    const s = S();
    let html = `<div class="station-head"><span class="ico">📖</span><div><h2 class="gold">Grimorio</h2>
      <div class="dim" style="font-size:12px">Los sellos que dominaste. Asígnalos a un foco para auto-lanzarlos.</div></div></div>`;
    if (!s.grimorio.length) html += `<p class="dim">Vacío todavía. Cierra un sello con éxito total en el atelier para guardarlo.</p>`;
    s.grimorio.forEach((h, i) => html += `<div class="choice-card"><h3 style="font-size:16px">${G.esc(h.nombre)}</h3><div class="role">${G.esc(h.lectura || '')}</div>
      ${s.equipo.foco ? `<button class="btn mini" data-foco="${i}">Asignar a foco</button>` : ''}</div>`);
    if (s.focos && s.focos.length) { html += `<div class="dim small-caps" style="font-size:12px;margin-top:10px">Auto-cast (foco: ${s.focos.length})</div>`; s.focos.forEach(f => html += `<div class="stat-row"><span>${G.esc(f)}</span></div>`); }
    html += `<button class="btn ghost" id="grim-back" style="margin-top:12px">‹ Volver</button>`;
    const sc = G.el('panel-scroll'); sc.innerHTML = html; G.el('panel-actions').innerHTML = '';
    sc.querySelectorAll('[data-foco]').forEach(b => b.onclick = () => {
      const cap = s.equipo.foco.base.focos || 1;
      if (s.focos.length >= cap) return G.toast('El foco está lleno. Usa uno de mayor nivel.', '');
      s.focos.push(s.grimorio[b.dataset.foco].nombre); G.save(); G.toast('Hechizo cargado al foco.', 'gold'); grimorio();
    });
    G.el('grim-back').onclick = () => { mostrarJuego(); MUNDO.pueblo(); };
    G.show('panel');
  }

  /* ---------- FICHA ---------- */
  function ficha() {
    const s = S(), cls = DATA.CLASES[s.clase], raza = DATA.RAZAS[s.raza];
    const evo = s.evoluciones.length ? s.evoluciones.map(e => DATA.CLASES[e].evo.nombre).join(', ') : '—';
    let rep = Object.entries(s.reputacion).map(([f, v]) => `<div class="stat-row"><span>${G.esc(DATA.FACCIONES[f] ? DATA.FACCIONES[f].nombre : f)}</span><b class="${v >= 1 ? 'verd' : v <= -2 ? 'blood' : 'dim'}">${v > 0 ? '+' : ''}${v}</b></div>`).join('');
    let ofi = Object.entries(s.oficios).map(([o, v]) => `<div class="stat-row"><span>${o}</span><b>${v}</b></div>`).join('');
    const sc = G.el('panel-scroll');
    sc.innerHTML = `<div class="station-head"><span class="ico">👤</span><div><h2 class="gold">${G.esc(s.nombre)}</h2>
      <div class="dim" style="font-size:12px">${G.esc(cls.nombre)} · ${G.esc(raza.nombre)} · Nv ${s.nivel}</div></div></div>
      <div class="stat-row"><span>Fuerza</span><b>${s.stats.fue}</b></div>
      <div class="stat-row"><span>Intelecto</span><b>${s.stats.int}</b></div>
      <div class="stat-row"><span>Maná</span><b>${s.stats.mana}</b></div>
      <div class="stat-row"><span>Suerte</span><b>${s.stats.suerte}</b></div>
      <div class="stat-row"><span>Hechicería</span><b>${s.hechiceria}</b></div>
      <div class="stat-row"><span>Moral</span><b>${s.moral > 3 ? 'Justo' : s.moral < -3 ? 'Cruel' : 'Gris'} (${s.moral})</b></div>
      <div class="stat-row"><span>Rastro</span><b class="rastro-${s.rastro}">${s.rastro} · ${DATA.RASTRO[s.rastro].estado}</b></div>
      <div class="stat-row"><span>Evolución</span><b class="gold">${G.esc(evo)}</b></div>
      <hr class="rule"><div class="dim small-caps" style="font-size:12px">Poderes de ${G.esc(cls.nombre)}</div>
      <p class="dim" style="font-size:13px">Activas: ${cls.activas.join(' · ')}<br>Ultimate: ${G.esc(cls.ultimate)}<br>Pasiva: ${G.esc(cls.pasiva)}</p>
      <div class="dim small-caps" style="font-size:12px;margin-top:8px">Oficios</div>${ofi}
      <div class="dim small-caps" style="font-size:12px;margin-top:8px">Reputación</div>${rep}
      <button class="btn ghost" id="fic-back" style="margin-top:12px">‹ Volver</button>
      <button class="btn ghost mini" id="fic-cfg">⚙ Oráculo</button>`;
    G.el('panel-actions').innerHTML = '';
    G.el('fic-back').onclick = () => { mostrarJuego(); MUNDO.pueblo(); };
    G.el('fic-cfg').onclick = configIA;
    G.show('panel');
  }

  /* ---------- EVOLUCIÓN ---------- */
  function evolucionar(claseKey) {
    if (S().evoluciones.includes(claseKey)) return;
    S().evoluciones.push(claseKey);
    const evo = DATA.CLASES[claseKey].evo;
    S().stats.int += 1; S().stats.mana += 1; S().hechiceria += 1;
    G.save(); G.emit();
    G.modal(`<h3 class="gold">${G.esc(evo.nombre)}</h3>
      <p>Algo en ti cambió y no hay vuelta. Cruzaste el umbral de tu clase: ahora eres <b>${G.esc(evo.nombre)}</b>.</p>
      <p class="dim" style="font-size:13px">Condición cumplida: ${G.esc(evo.cond)}.</p>
      <button class="btn gold" id="evo-ok">Aceptar lo que soy</button>`, { dismiss: false });
    G.el('evo-ok').onclick = G.closeModal;
  }

  return { initPortada, crearPersonaje, entrarJuego, mostrarJuego, hub, abrirAtelier, volverCombate, evolucionar, configIA, inventario, grimorio, ficha };
})();
