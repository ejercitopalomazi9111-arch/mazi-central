/* ============================================================
   EL PACTO ROTO — engine.js
   Estado, guardado, tiradas, router de pantallas, HUD,
   inventario, toasts, modales, utilidades de sprites.
   ============================================================ */
window.G = (function () {
  const SCHEMA = 3;
  const SAVE_KEY = 'pactoroto_save_v3';
  const CFG_KEY = 'pactoroto_cfg';

  let state = null;        // estado del jugador
  let catalog = {};        // catálogo de arte (arte/catalog.json)
  const listeners = [];

  /* ---------- utilidades ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const d20 = () => rint(1, 20);
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ---------- estado inicial ---------- */
  function newGame(nombre, claseId, razaId) {
    const cls = DATA.CLASES[claseId], raza = DATA.RAZAS[razaId];
    const stats = Object.assign({}, cls.stats);
    for (const k in raza.mods) stats[k] = (stats[k] || 0) + raza.mods[k];
    for (const k of ['fue','int','mana','suerte']) stats[k] = clamp(stats[k], 1, 12);
    state = {
      schema: SCHEMA, nombre, clase: claseId, raza: razaId,
      nivel: 1, xp: 0, xpNext: 20,
      stats,
      hp: 20 + stats.fue * 2, hpMax: 20 + stats.fue * 2,
      mana: stats.mana * 6, manaMax: stats.mana * 6,
      oro: 15, rastro: 0, moral: 0,
      hechiceria: 1,
      lugar: 'velamuerta',
      grimorio: [],           // hechizos aprendidos {nombre, lectura}
      inv: {},                // matId -> qty
      equipo: { arma:null, armadura:null, foco:null },
      mascotas: [],           // {especie, nombre, hp, hpMax, nivel}
      aliados: [],
      focos: [],              // hechizos asignados a auto-cast
      oficios: { cocina:0, herreria:0, alquimia:0, artesania:0 },
      recetas: { cocina:['guiso','pan'], herreria:['daga'], alquimia:['sanadora'], artesania:['cebo'] },
      reputacion: { valle:0, corte:0, sombreros:-1, moralis:-2, brimhats:0 },
      mundo: { pueblosFantasma:[], guerra:{ activa:false, dia:0, frente:'valle', avance:0 }, visitados:['velamuerta'] },
      selloDiferido: null,    // {lectura, glifos}
      hilos: [], ultimo: [],  // memoria para el narrador
      flags: {}, evoluciones: [],
      creado: Date.now(),
    };
    // regalo inicial por clase
    give('lingote', 2); give('raiz', 1); give('carne', 1); give('madera', 1);
    save();
    return state;
  }

  /* ---------- guardado ---------- */
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s || s.schema !== SCHEMA) return false;
      state = s; return true;
    } catch (e) { return false; }
  }
  function hasSave() { try { const r = localStorage.getItem(SAVE_KEY); if(!r) return false; const s=JSON.parse(r); return s && s.schema===SCHEMA; } catch(e){ return false; } }
  function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} state = null; }

  /* ---------- config (IA) ---------- */
  function getCfg() { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch(e){ return {}; } }
  function setCfg(c) { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch(e){} }

  /* ---------- deltas de estado ---------- */
  function apply(changes) {
    if (!changes) return;
    const c = changes;
    if (c.hp) state.hp = clamp(state.hp + c.hp, 0, state.hpMax);
    if (c.mana) state.mana = clamp(state.mana + c.mana, 0, state.manaMax);
    if (c.oro) state.oro = Math.max(0, state.oro + c.oro);
    if (c.rastro) setRastro(state.rastro + c.rastro);
    if (c.moral) state.moral = clamp(state.moral + c.moral, -10, 10);
    if (c.suerte) state.stats.suerte = clamp(state.stats.suerte + c.suerte, 1, 15);
    if (c.xp) gainXP(c.xp);
    save(); emit();
  }

  function gainXP(n) {
    state.xp += n;
    while (state.xp >= state.xpNext) {
      state.xp -= state.xpNext;
      state.nivel++;
      state.xpNext = Math.round(state.xpNext * 1.4 + 8);
      state.hpMax += 6 + state.stats.fue;
      state.manaMax += state.stats.mana * 2;
      state.hp = state.hpMax; state.mana = state.manaMax;
      state.hechiceria = 1 + Math.floor(state.nivel / 3);
      toast(`Subiste a nivel ${state.nivel}. La tinta corre más fuerte.`, 'gold');
    }
  }

  function setRastro(n) {
    const prev = state.rastro;
    state.rastro = clamp(n, 0, 4);
    if (state.rastro > prev) {
      const info = DATA.RASTRO[state.rastro];
      toast(`RASTRO ${state.rastro} · ${info.estado}: ${info.efecto}`, 'blood');
      if (state.rastro === 2 && state.grimorio.length) {
        const i = rint(0, state.grimorio.length - 1);
        state.grimorio.splice(i, 1); // borran un hechizo, no dicen cuál
      }
      if (state.rastro >= 3) state.reputacion.moralis = -5;
      if (state.rastro === 4 && !state.flags.brimhat) {
        state.flags.brimhat = true; state.reputacion.brimhats = 3;
        DATA.NODOS.umbral.locked = false;
      }
    }
  }

  /* ---------- tirada ---------- */
  function tirada(extra = 0) {
    const s = state.stats;
    const dado = d20();
    const bono = s.mana + s.suerte + s.int + state.hechiceria + state.nivel + extra;
    return { dado, bono, total: dado + bono };
  }

  /* ---------- inventario ---------- */
  function give(mat, n = 1) { state.inv[mat] = (state.inv[mat] || 0) + n; if (state.inv[mat] <= 0) delete state.inv[mat]; save(); }
  function take(mat, n = 1) { if ((state.inv[mat] || 0) < n) return false; give(mat, -n); return true; }
  function has(mat, n = 1) { return (state.inv[mat] || 0) >= n; }
  function canCraft(reqs) { for (const m in reqs) if (!has(m, reqs[m])) return false; return true; }

  /* ---------- arte ---------- */
  function art(id) { return catalog[id] || null; }
  function plateHTML(id) {
    const a = art(id); if (!a) return '';
    return `<div class="plate"><img src="${a.src}" alt="" referrerpolicy="no-referrer" loading="lazy">
      <div class="cap">${esc(a.t)} · ${esc(a.a)}${a.y ? ', ' + esc(a.y) : ''}</div></div>`;
  }
  // sprite LPC 32px -> estilo de fondo para un div .spr
  function sprStyle(mat) {
    const m = DATA.MATS[mat]; if (!m || !m.sheet) return '';
    const sheet = DATA.FOOD_SHEET[m.sheet];
    return `background-image:url('${sheet}');background-position:-${m.col*32}px -${m.row*32}px;width:32px;height:32px;transform:scale(1.3)`;
  }
  function matIcon(mat) {
    const m = DATA.MATS[mat]; if (!m) return '?';
    if (m.sheet) return `<span class="spr" style="${sprStyle(mat)}"></span>`;
    return `<span style="font-size:24px">${m.glifo||'▪'}</span>`;
  }

  /* ---------- router de pantallas ---------- */
  const SCREENS = ['portada','juego','panel','atelier'];
  function show(id) {
    closeModal(); // los modales son transitorios: no sobreviven un cambio de pantalla
    SCREENS.forEach(s => {
      const n = el(s); if (!n) return;
      const on = (s === id);
      n.classList.toggle('on', on);
      if (!on) { if (window.anime) anime.remove(n); n.style.opacity = ''; } // limpia opacidad inline que dejó anime
    });
    const node = el(id);
    if (node && window.anime && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
      anime.remove(node); node.style.opacity = 0;
      anime({ targets: node, opacity: [0,1], duration: 260, easing: 'easeOutQuad' });
    } else if (node) { node.style.opacity = ''; }
    window.scrollTo && window.scrollTo(0,0);
    const sc = node && node.querySelector('.scroll'); if (sc) sc.scrollTop = 0;
  }

  /* ---------- HUD ---------- */
  function renderHUD() {
    const h = el('hud'); if (!h || !state) return;
    const cls = DATA.CLASES[state.clase];
    const rastro = DATA.RASTRO[state.rastro];
    const moralTxt = state.moral > 3 ? 'Justo' : state.moral < -3 ? 'Cruel' : 'Gris';
    h.innerHTML = `
      <div class="hud-top">
        <span class="hud-name">${esc(state.nombre)}</span>
        <span class="dim">${esc(cls.nombre)} · Nv ${state.nivel}</span>
        <span class="hud-loc">${esc(DATA.NODOS[state.lugar] ? DATA.NODOS[state.lugar].nombre : '—')}</span>
      </div>
      <div class="bars">
        <div class="bar hp"><span class="lbl">Vida</span><span class="track"><span class="fill" style="width:${100*state.hp/state.hpMax}%"></span></span><span class="num">${state.hp}</span></div>
        <div class="bar mana"><span class="lbl">Maná</span><span class="track"><span class="fill" style="width:${100*state.mana/state.manaMax}%"></span></span><span class="num">${state.mana}</span></div>
        <div class="bar xp"><span class="lbl">Exp</span><span class="track"><span class="fill" style="width:${100*state.xp/state.xpNext}%"></span></span><span class="num">${state.nivel}</span></div>
        <div class="bar"><span class="lbl">Oro</span><span class="num gold" style="margin-left:auto">${state.oro} ⛃</span></div>
      </div>
      <div class="hud-tags">
        <span class="tag rastro-${state.rastro}">Rastro ${state.rastro} · ${esc(rastro.estado)}</span>
        <span class="tag">Moral: ${moralTxt}</span>
        ${state.mascotas.length ? `<span class="tag verd">${state.mascotas.length} 🐾</span>` : ''}
        ${state.equipo.arma ? `<span class="tag gold">${esc(state.equipo.arma.nombre)}</span>` : ''}
      </div>`;
  }

  /* ---------- toasts / log / modal ---------- */
  function toast(msg, kind = '') {
    const w = el('toast-wrap'); if (!w) return;
    const t = document.createElement('div');
    t.className = 'toast ' + kind; t.textContent = msg;
    w.appendChild(t);
    if (window.anime && !matchMedia('(prefers-reduced-motion:reduce)').matches)
      anime({ targets: t, opacity:[0,1], translateY:[-8,0], duration:220 });
    setTimeout(() => {
      if (window.anime) anime({ targets:t, opacity:0, duration:400, complete:()=>t.remove() });
      else t.remove();
    }, 2600);
  }
  function modal(html, opts = {}) {
    const bg = el('modal-bg'), m = el('modal');
    m.innerHTML = html; bg.classList.add('on');
    bg.onclick = (e) => { if (e.target === bg && opts.dismiss !== false) closeModal(); };
    return m;
  }
  function closeModal() { el('modal-bg').classList.remove('on'); }

  /* ---------- suscripción a cambios ---------- */
  function on(fn) { listeners.push(fn); }
  function emit() { renderHUD(); listeners.forEach(f => { try { f(state); } catch(e){} }); }

  /* ---------- carga del catálogo ---------- */
  async function loadCatalog() {
    try { const r = await fetch('arte/catalog.json'); catalog = await r.json(); } catch (e) { catalog = {}; }
  }

  return {
    get state(){ return state; }, set state(s){ state = s; },
    SCHEMA, newGame, save, load, hasSave, wipe, getCfg, setCfg,
    apply, gainXP, setRastro, tirada, give, take, has, canCraft,
    art, plateHTML, sprStyle, matIcon, show, renderHUD, toast, modal, closeModal,
    on, emit, loadCatalog, get catalog(){ return catalog; },
    clamp, rnd, rint, pick, d20, el, esc,
  };
})();
