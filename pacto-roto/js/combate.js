/* ============================================================
   EL PACTO ROTO — combate.js
   Combate por turnos. El sello es la acción central; también
   hay activas de clase, objeto, mascota y huir. Sello diferido.
   ============================================================ */
window.COMBATE = (function () {
  const S = () => G.state;
  let enemigo = null, turno = 0, onEnd = null, log = [];

  function iniciar(en, cb) {
    // en: {key?, n, nivel, hp} | key de bestiario
    if (typeof en === 'string') { const b = DATA.BESTIARIO[en]; en = { key: en, n: b.nombre, nivel: b.nivel, hp: b.hp, art: b.art, moralis: b.moralis, domesticable: b.domesticable }; }
    enemigo = Object.assign({ hpMax: en.hp }, en);
    turno = 0; onEnd = cb; log = [`Un ${enemigo.n} te sale al paso.`];
    render();
  }

  function blog(t) { log.push(t); if (log.length > 6) log.shift(); }

  function render() {
    const s = S();
    const b = enemigo.key ? DATA.BESTIARIO[enemigo.key] : null;
    const art = enemigo.art || (b && b.art) || 'guerra_ira';
    const sc = G.el('juego-scroll');
    const dif = G.NARR ? '' : '';
    sc.innerHTML = `
      ${G.plateHTML(art)}
      <div class="enemy-card">
        <div class="en">${G.esc(enemigo.n)} · Nv ${enemigo.nivel}${enemigo.moralis ? ' · <span class="blood">MORALIS</span>' : ''}</div>
        <div class="bar hp" style="margin-top:6px"><span class="lbl">HP</span><span class="track"><span class="fill" style="width:${100 * enemigo.hp / enemigo.hpMax}%"></span></span><span class="num">${Math.max(0, enemigo.hp)}</span></div>
        ${b ? `<div class="dim" style="font-size:12.5px;margin-top:6px;font-style:italic">${G.esc(b.desc)}</div>` : ''}
        ${enemigo.moralis ? `<div class="blood" style="font-size:12px;margin-top:6px">Su Ruptura anula sellos a media formación. Un sello diferido o una emboscada es tu única salida.</div>` : ''}
      </div>
      <div id="log-strip">${log.map(l => G.esc(l)).join(' — ')}</div>`;
    const cls = DATA.CLASES[s.clase];
    const ab = G.el('actionbar');
    let acts = [
      abtn('✒', 'Sello', () => dibujar()),
      abtn('⚔', cls.activas[0], () => activa(0)),
      abtn('🜂', 'Objeto', () => objeto()),
    ];
    if (s.selloDiferido) acts.unshift(abtn('◎', 'Cerrar diferido', () => cerrarDiferido(), true));
    if (s.mascotas.length) acts.push(abtn('🐾', 'Mascota', () => mascota()));
    if (enemigo.domesticable && s.clase === 'vinculo') acts.push(abtn('🕊', 'Domesticar', () => domesticar()));
    acts.push(abtn('👣', 'Huir', () => huir()));
    ab.innerHTML = ''; acts.forEach(a => ab.appendChild(a));
  }
  function abtn(ico, txt, fn, hot) {
    const d = document.createElement('button'); d.className = 'ab' + (hot ? ' hot' : '');
    d.innerHTML = `<span class="ico">${ico}</span>${G.esc(txt)}`; d.onclick = fn; return d;
  }

  /* ---- acciones ---- */
  function dibujar() {
    if (enemigo.moralis) { G.toast('Empiezas a trazar. El Moralis sonríe.', 'blood'); }
    UI.abrirAtelier({ combate: true, moralis: enemigo.moralis, onCast: resolverSello });
  }
  function cerrarDiferido() {
    const d = S().selloDiferido; S().selloDiferido = null;
    blog('Cierras la última línea del sello que traías en el bolsillo.');
    const dmg = Math.round(14 + Math.random() * 12 + S().nivel * 2);
    golpeEnemigo(dmg, `El sello diferido revienta: ${dmg} de daño. Ni un Moralis rompe lo que ya estaba hecho.`);
  }
  async function resolverSello(res, reading) {
    // res: juicio del árbitro; el efecto en combate depende del éxito
    UI.volverCombate();
    if (enemigo.moralis && reading && reading.anillo && res.exito !== 'fallo') {
      blog('RUPTURA. El Moralis parte tu anillo a media formación. El sello muere en tus manos.');
      G.apply({ mana: -8 });
      return enemigoAtaca();
    }
    let dmg = 0;
    if (res.exito === 'total') dmg = 16 + Math.round(Math.random() * 10) + S().nivel * 2;
    else if (res.exito === 'parcial') dmg = 8 + Math.round(Math.random() * 6);
    else if (res.exito === 'contragolpe') { blog('El sello te revienta encima.'); return enemigoAtaca(); }
    if (res.cambios) G.apply(res.cambios);
    if (dmg > 0) golpeEnemigo(dmg, `${res.nombre}: ${dmg} de daño.`);
    else { blog('El sello se apaga sin tocar al enemigo.'); enemigoAtaca(); }
  }
  function activa(i) {
    const s = S(), cls = DATA.CLASES[s.clase];
    const nombre = cls.activas[i];
    const base = s.stats.fue * 2 + s.nivel + (s.equipo.arma ? s.equipo.arma.base.ataque : 0);
    let dmg = Math.round(base * (0.8 + Math.random() * 0.6));
    if (s.clase === 'rompesellos') dmg = Math.round(dmg * 1.3);
    golpeEnemigo(dmg, `${nombre}: ${dmg} de daño.`);
  }
  function objeto() {
    const pociones = (S().recetas.alquimia || []).filter(id => {
      const r = DATA.RECETAS.alquimia.find(x => x.id === id); return r;
    });
    const invPociones = Object.keys(S().inv).filter(k => k.startsWith('poc_'));
    let html = `<h3>Objetos</h3>`;
    if (!invPociones.length) html += `<p class="dim">No traes pociones. Destila alguna en una estación de alquimia.</p>`;
    invPociones.forEach(k => {
      const meta = S().flags['pocmeta_' + k] || { nombre: 'Poción' };
      html += `<button class="btn mini" data-poc="${k}">${G.esc(meta.nombre)} ×${S().inv[k]}</button>`;
    });
    html += `<button class="btn ghost mini" id="poc-cerrar">Cerrar</button>`;
    const m = G.modal(html);
    m.querySelectorAll('[data-poc]').forEach(b => b.onclick = () => { usarPocion(b.dataset.poc); G.closeModal(); });
    m.querySelector('#poc-cerrar').onclick = G.closeModal;
  }
  function usarPocion(k) {
    const meta = S().flags['pocmeta_' + k]; if (!meta) return;
    G.take(k, 1);
    if (meta.efecto) {
      if (meta.efecto.huir) { blog('La bomba de humo te traga.'); return terminar('huye'); }
      G.apply(meta.efecto);
    }
    blog(`Usas ${meta.nombre}.`); enemigoAtaca();
  }
  function mascota() {
    const m = S().mascotas[0];
    const dmg = Math.round(m.nivel * 3 + Math.random() * 6);
    golpeEnemigo(dmg, `${m.nombre} ataca: ${dmg} de daño.`);
  }
  async function domesticar() {
    if (enemigo.hp > enemigo.hpMax * 0.4) { blog('Todavía está muy entero para escucharte. Bájale la vida.'); return enemigoAtaca(); }
    const t = G.tirada(S().stats.suerte);
    if (t.total >= 16) {
      const nom = G.pick(['Ceniza','Brasa','Sombra','Colmillo','Niebla']);
      S().mascotas.push({ especie: enemigo.key, nombre: nom, hp: enemigo.hpMax, hpMax: enemigo.hpMax, nivel: enemigo.nivel });
      S().flags['dom_' + enemigo.key] = true;
      contarDomesticadas();
      G.toast(`${enemigo.n} ahora te sigue. Le dices ${nom}.`, 'gold');
      G.apply({ xp: 8, moral: 1 });
      return terminar('doma');
    }
    blog('Gruñe y se resiste. No confía todavía.'); enemigoAtaca();
  }
  function contarDomesticadas() {
    const especies = new Set(S().mascotas.map(m => m.especie));
    if (especies.size >= 5 && S().clase === 'vinculo' && !S().evoluciones.includes('vinculo')) UI.evolucionar('vinculo');
  }
  function huir() {
    const t = G.tirada(S().stats.suerte);
    if (enemigo.moralis && t.total < 22) { blog('No te dejan ir tan fácil.'); return enemigoAtaca(); }
    if (t.total >= 12) { blog('Te pierdes entre las sombras.'); terminar('huye'); }
    else { blog('Tropiezas. No alcanzas a huir.'); enemigoAtaca(); }
  }

  function golpeEnemigo(dmg, msg) {
    enemigo.hp -= dmg; blog(msg);
    if (enemigo.hp <= 0) return victoria();
    enemigoAtaca();
  }
  function enemigoAtaca() {
    turno++;
    const s = S();
    let dmg = Math.round(enemigo.nivel * 2.5 + Math.random() * enemigo.nivel);
    const def = s.equipo.armadura ? s.equipo.armadura.base.defensa : 0;
    if (s.clase === 'rompesellos') dmg = Math.round(dmg * (1 - Math.min(0.4, s.nivel * 0.03)));
    dmg = Math.max(1, dmg - def);
    G.apply({ hp: -dmg });
    blog(`${enemigo.n} te hiere: ${dmg}.`);
    if (s.hp <= 0) return derrota();
    render();
  }

  async function victoria() {
    const xp = enemigo.nivel * 6 + 4;
    blog(`${enemigo.n} cae.`);
    G.apply({ xp, oro: enemigo.nivel * 3 });
    // botín + orbe (regla del diferencial)
    let orbe = null;
    if (Math.random() < 0.6) { orbe = await NARR.juzgarOrbe(enemigo.nivel, enemigo.n); if (orbe) G.give('orbe', 1); }
    if (S().clase === 'rompesellos' && enemigo.moralis) contarRupturas();
    G.modal(`<h3>Victoria</h3><p>${G.esc(enemigo.n)} cae. +${xp} exp, +${enemigo.nivel * 3} oro.</p>
      ${orbe ? `<p class="effect">Suelta un orbe de habilidad. Ábrelo en la tienda: <b>${G.esc(orbe.habilidad)}</b> (${orbe.potencia}).</p>` : ''}
      <button class="btn gold" id="vic-ok">Seguir</button>`);
    G.el('vic-ok').onclick = () => { G.closeModal(); terminar('gana'); };
  }
  function contarRupturas() {
    S().flags.rupturas = (S().flags.rupturas || 0) + 1;
    if (S().flags.rupturas >= 10 && !S().evoluciones.includes('rompesellos')) UI.evolucionar('rompesellos');
  }
  function derrota() {
    G.modal(`<h3 class="blood">Caes</h3><p>La vista se te va. Despiertas en el último refugio, con menos oro y una deuda con quien te cargó.</p>
      <button class="btn blood" id="der-ok">Despertar</button>`, { dismiss: false });
    G.el('der-ok').onclick = () => {
      G.closeModal();
      S().hp = Math.round(S().hpMax * 0.4); S().oro = Math.round(S().oro * 0.6);
      S().lugar = S().mundo.visitados.includes('velamuerta') ? 'velamuerta' : S().lugar;
      G.save(); terminar('pierde');
    };
  }
  function terminar(r) { const cb = onEnd; enemigo = null; onEnd = null; if (cb) cb(r); }

  return { iniciar, resolverSello, get enemigo() { return enemigo; }, render };
})();
