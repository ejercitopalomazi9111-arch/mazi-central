/* ============================================================================
 * Ligas Mazi — Simulador de usuarios por METAS (end-to-end, multi-cuenta)
 * ----------------------------------------------------------------------------
 * Emula a personas reales persiguiendo sus objetivos, en orden, como en la vida:
 *   registrarse → crear su liga/equipo/carta → buscar y unirse → crear partidos
 *   → dirigir → tienda → etc. Cada meta navega las pantallas de verdad y luego
 *   ejecuta la acción que el usuario haría, y verifica el resultado.
 *
 * La nube (Supabase) se simula en memoria con RLS por dueño y auth sin
 * confirmación, para que el viaje multi-cuenta sea fiel.
 *
 * Uso:  PORT=8096 node tests/e2e-harness.cjs   (sirve ligas-mazi en ese puerto)
 * ==========================================================================*/
const { chromium } = require('playwright-core');
const PORT = process.env.PORT || 8096;
const EXE = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

const FAKE_SRC = `
window.__DB = { app_state:[], public_leagues:[], league_full:[], teams_public:[], players_public:[], invitations:[], match_results:[], products:[], purchases:[], live_games:[] };
window.__ACCOUNTS = {}; window.__CUR = { session:null };
function __uid(){ return 'u-'+Math.random().toString(36).slice(2,9); }
function __ilike(v,pat){ const q=String(pat).replace(/%/g,'').toLowerCase(); return String(v==null?'':v).toLowerCase().includes(q); }
function __scope(table, rows){ const uid=window.__CUR.session&&window.__CUR.session.user&&window.__CUR.session.user.id; if(table==='app_state')return rows.filter(r=>r.account_id===uid); return rows; }
function __qb(table){ const DB=window.__DB; DB[table]=DB[table]||[]; let filters=[];
  const run=()=>{ let rows=DB[table].slice(); if(!filters.some(f=>f.col==='account_id'))rows=__scope(table,rows); filters.forEach(f=>rows=rows.filter(f.fn)); return rows; };
  const api={ select:()=>api,
    eq:(c,v)=>{filters.push({col:c,fn:r=>r[c]===v});return api;},
    gte:(c,v)=>{filters.push({col:c,fn:r=>String(r[c])>=String(v)});return api;},
    or:(str)=>{ const parts=str.split(',').map(s=>{const i=s.indexOf('.');const col=s.slice(0,i);const rest=s.slice(i+1);const j=rest.indexOf('.');return {col,op:rest.slice(0,j),val:rest.slice(j+1)};});
      filters.push({col:'__or',fn:r=>parts.some(pp=>pp.op==='ilike'&&__ilike(r[pp.col],pp.val))}); return api; },
    order:()=>api, limit:()=>api,
    maybeSingle:()=>Promise.resolve({data:run()[0]||null,error:null}),
    single:()=>{const r=run();return Promise.resolve({data:r[0]||null,error:r.length?null:{message:'no rows'}});},
    then:(cb,eb)=>Promise.resolve({data:run(),error:null}).then(cb,eb) };
  api.insert=(row)=>{const rows=Array.isArray(row)?row:[row];rows.forEach(x=>{const c=Object.assign({},x);if(c.id===undefined)c.id='id-'+Math.random().toString(36).slice(2,9);DB[table].push(c);});return Promise.resolve({data:rows,error:null});};
  api.upsert=(row)=>{const rows=Array.isArray(row)?row:[row];rows.forEach(x=>{const pk=x.account_id!==undefined?'account_id':(x.id!==undefined?'id':null);if(pk){const i=DB[table].findIndex(r=>r[pk]===x[pk]);if(i>=0)DB[table][i]=Object.assign({},DB[table][i],x);else DB[table].push(Object.assign({},x));}else DB[table].push(Object.assign({},x));});return Promise.resolve({data:rows,error:null});};
  api.update=(vals)=>{const u={_f:[],eq:function(c,v){this._f.push(r=>r[c]===v);return this;},then:function(cb){DB[table].forEach(r=>{if(this._f.every(f=>f(r)))Object.assign(r,vals);});return Promise.resolve({error:null}).then(cb);}};return u;};
  api.delete=()=>{const d={_f:[],eq:function(c,v){this._f.push(r=>r[c]===v);window.__DB[table]=DB[table].filter(r=>!this._f.every(f=>f(r)));return Promise.resolve({error:null});}};return d;};
  return api;
}
window.__FAKE={ from:__qb,
  channel:()=>({on:function(){return this;},subscribe:function(cb){if(cb)cb('SUBSCRIBED');return this;},track:async()=>{},untrack:()=>{},presenceState:()=>({})}),
  removeChannel:()=>{},
  auth:{ getSession:async()=>({data:{session:window.__CUR.session}}),
    signUp:async({email,password})=>{const e=email.toLowerCase();if(window.__ACCOUNTS[e])return {data:{},error:{message:'User already registered'}};const id=__uid();window.__ACCOUNTS[e]={id,email:e,password};window.__CUR.session={user:{id,email:e}};return {data:{session:window.__CUR.session,user:{id,email:e}},error:null};},
    signInWithPassword:async({email,password})=>{const a=window.__ACCOUNTS[email.toLowerCase()];if(!a||a.password!==password)return {data:{},error:{message:'Invalid login credentials'}};window.__CUR.session={user:{id:a.id,email:a.email}};return {data:{session:window.__CUR.session},error:null};},
    signOut:async()=>{window.__CUR.session=null;return {error:null};}, onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}}) } };
window.sbClient=()=>window.__FAKE;
`;

(async () => {
  const b = await chromium.launch({ executablePath: EXE, headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push('PAGEERR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CONN|Failed to load|net::/i.test(m.text())) pageErrors.push('CONSOLE: ' + m.text()); });
  await p.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'commit', timeout: 15000 });
  await p.waitForFunction(() => typeof doSignup === 'function' && typeof render === 'function', { timeout: 10000 });
  await p.evaluate(FAKE_SRC);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

  const journeys = []; let cur = null;
  const journey = (persona) => { cur = { persona, goals: [] }; journeys.push(cur); };
  const goal = async (name, fn) => { const g = { name, ok: false, detail: '' }; cur.goals.push(g);
    try { const r = await fn(); if (r && r.ok === false) { g.ok = false; g.detail = r.detail || ''; } else { g.ok = true; g.detail = (r && r.detail) || ''; } }
    catch (e) { g.ok = false; g.detail = 'EXCEPCIÓN: ' + e.message; } };
  const wait = (ms) => p.waitForTimeout(ms);
  const ev = (fn, arg) => p.evaluate(fn, arg);

  // ---- acciones "como usuario" ----
  async function registrarse(name, email, roles, fields) {
    await ev(async () => { try { await __FAKE.auth.signOut(); } catch (e) {} localStorage.removeItem('lm_user'); localStorage.removeItem('lm_league'); window._authed = false; window._session = null; });
    await ev((roles) => { setAuthMode('up'); signupRoles = roles.slice(); buildRolePick(); }, roles); // abre "Crear cuenta" y elige rol(es)
    await ev(({ name, email, fields }) => {
      document.getElementById('upName').value = name; document.getElementById('upEmail').value = email; document.getElementById('upPass').value = 'Prueba123';
      if (fields.league && document.getElementById('upLeague')) document.getElementById('upLeague').value = fields.league;
      if (fields.team && document.getElementById('upTeam')) document.getElementById('upTeam').value = fields.team;
      if (fields.num && document.getElementById('upNum')) document.getElementById('upNum').value = fields.num;
      doSignup();
    }, { name, email, fields });
    await wait(90);
  }
  async function entrar(email) { await ev((email) => { setAuthMode('in'); document.getElementById('inEmail').value = email; document.getElementById('inPass').value = 'Prueba123'; doSignin(); }, email); await wait(160); }
  async function abrir(screen) { await ev((s) => render(s), screen); await wait(60); }
  async function buscar(q) { await ev((q) => { go('directorio'); const i = document.getElementById('searchQ'); if (i) { i.value = q; } }, q); await wait(40); return await ev(async (q) => await searchEntities(q), q); }
  async function aprobarPrimero(action) { await ev(() => { try { pollInvitations(); pollMatchResults && pollMatchResults(); } catch (e) {} }); await wait(70);
    const id = await ev((a) => { const n = notes().find(x => x.action === a); return n ? n.id : null; }, action); if (id) { await ev((id) => acceptInvite(id), id); await wait(90); } return id; }

  // ===========================================================================
  //  JOURNEYS POR PERSONA
  // ===========================================================================
  let ligaAcc, ligaCode, teamCode1, teamAcc1, teamCode2, teamAcc2, playerCode1;
  try {
    // ----------------------------------------------------------------- ADMIN
    journey('🏆 Admin de liga (Ana)');
    await goal('Registrarse como admin y crear su liga', async () => {
      await registrarse('Ana Admin', 'admin@t.mx', ['admin_liga'], { league: 'Liga Metropolitana' });
      const s = await ev(() => ({ code: (leagueData() || {}).code, name: (leagueData() || {}).name, authed: !!__CUR.session, screen: curScreen }));
      ligaCode = s.code; ligaAcc = await ev(() => (__DB.public_leagues[0] || {}).account_id);
      return { ok: s.authed && s.code && s.code.startsWith('L-') && s.name === 'Liga Metropolitana' && s.screen === 'hub', detail: JSON.stringify(s) };
    });
    await goal('Ver su liga: estado vacío honesto (aún sin equipos)', async () => {
      await abrir('liga'); const has = await ev(() => { try { buildLeagueTeams(); } catch (e) {} const t = (document.getElementById('leTeams') || {}).innerHTML || ''; return { teams: (leagueData().teams || []).length, msg: /solicit/i.test(t) }; });
      return { ok: has.teams === 0 && has.msg, detail: JSON.stringify(has) };
    });
    await goal('Ver el código de su liga en el perfil (para compartir)', async () => {
      await ev(() => openProfile()); const t = await ev(() => (document.getElementById('profCodes') || {}).textContent || ''); await ev(() => closeProfile());
      return { ok: t.includes(ligaCode), detail: t.replace(/\\s+/g, ' ').slice(0, 60) };
    });

    // --------------------------------------------------------------- DUEÑO 1
    journey('🛡️ Dueño de equipo (Beto · Titanes)');
    await goal('Registrarse y crear su equipo', async () => {
      await registrarse('Beto Dueño', 'dueno1@t.mx', ['dueno'], { team: 'Titanes' });
      const s = await ev(() => ({ code: (userData().team || {}).code, name: (userData().team || {}).name }));
      teamCode1 = s.code; teamAcc1 = await ev(() => (__DB.teams_public.find(t => t.name === 'Titanes') || {}).account_id);
      return { ok: s.code && s.code.startsWith('E-') && s.name === 'Titanes', detail: JSON.stringify(s) };
    });
    await goal('Buscar la liga por código y solicitar unirse', async () => {
      const r = await buscar(ligaCode); if (!(r.leagues.length === 1)) return { ok: false, detail: 'no encontró la liga: ' + JSON.stringify(r).slice(0, 80) };
      await ev((acc) => requestJoinLeagueTeam(acc, 'Liga Metropolitana'), ligaAcc); await wait(110);
      const inv = await ev(() => __DB.invitations.filter(i => i.kind === 'join_league').length); return { ok: inv === 1, detail: 'solicitudes=' + inv };
    });

    // --------------------------------------------------- ADMIN aprueba equipo
    journey('🏆 Admin de liga (Ana) — administrar');
    await goal('Recibir la solicitud y aprobar al equipo Titanes', async () => {
      await entrar('admin@t.mx'); await abrir('inbox');
      const id = await aprobarPrimero('approve_team_league');
      const s = await ev(() => ({ teams: (leagueData().teams || []).length, nm: ((leagueData().teams || [])[0] || {}).name }));
      return { ok: !!id && s.teams === 1 && s.nm === 'Titanes', detail: JSON.stringify(s) };
    });

    // -------------------------------------------------------------- JUGADORA
    journey('🏀 Jugadora (Caro · #7)');
    await goal('Registrarse creando su identidad de jugadora (# y posición)', async () => {
      await registrarse('Caro Jugadora', 'jug1@t.mx', ['jugador'], { num: '7' });
      const s = await ev(() => ({ pc: userData().playerCode, num: userData().num }));
      playerCode1 = s.pc; return { ok: s.pc && s.pc.startsWith('J-') && s.num === '7', detail: JSON.stringify(s) };
    });
    await goal('Revisar su carta ANTES de jugar: honesta, sin números inventados', async () => {
      await abrir('carta'); await wait(90);
      const s = await ev(() => ({ remote: !!_cardRemote, resumen: (document.getElementById('fc-resumen') || {}).textContent || '' }));
      return { ok: !s.remote && /mesa|jugador|partido/i.test(s.resumen), detail: s.resumen.replace(/\\s+/g, ' ').slice(0, 60) };
    });
    await goal('Buscar su equipo (Titanes) y solicitar unirse', async () => {
      const r = await buscar(teamCode1);
      if (r.teams.length !== 1) return { ok: false, detail: 'busqué ' + teamCode1 + ' teams=' + r.teams.length };
      await ev((d) => requestJoinTeam(d.code, 'Titanes', d.acc), { code: teamCode1, acc: teamAcc1 }); await wait(110);
      const s = await ev(() => ({ inv: __DB.invitations.filter(i => i.kind === 'join_team').length, ptc: userData().playerTeamCode }));
      return { ok: s.inv === 1 && s.ptc === teamCode1, detail: JSON.stringify(s) };
    });

    // ------------------------------------------------ DUEÑO1 aprueba jugadora
    journey('🛡️ Dueño de equipo (Beto) — armar plantilla');
    await goal('Recibir aprobación de su equipo en la liga', async () => {
      await entrar('dueno1@t.mx'); await abrir('inbox'); await ev(() => { try { pollInvitations(); } catch (e) {} }); await wait(70);
      const s = await ev(() => ({ status: (userData().team || {}).status, lc: (userData().team || {}).league_code }));
      return { ok: s.status === 'aprobado' && !!s.lc, detail: JSON.stringify(s) };
    });
    await goal('Aprobar a la jugadora que solicita unirse', async () => {
      const id = await aprobarPrimero('approve_player_team');
      const s = await ev(() => ({ players: (userData().team.players || []).length, nm: ((userData().team.players || [])[0] || {}).nm }));
      return { ok: !!id && s.players === 1 && s.nm === 'Caro Jugadora', detail: JSON.stringify(s) };
    });

    // ---------------------------------------- 2º equipo + jugador (para jugar)
    journey('🛡️ Dueño 2 (Dora · Halcones) + Jugador 2 (Kevin)');
    await goal('Dueño2 registra Halcones y solicita unirse', async () => {
      await registrarse('Dora Dueña', 'dueno2@t.mx', ['dueno'], { team: 'Halcones' });
      teamCode2 = await ev(() => (__DB.teams_public.find(t => t.name === 'Halcones') || {}).code);
      teamAcc2 = await ev(() => (__DB.teams_public.find(t => t.name === 'Halcones') || {}).account_id);
      await ev((acc) => requestJoinLeagueTeam(acc, 'Liga Metropolitana'), ligaAcc); await wait(110);
      return { ok: !!teamCode2, detail: 'code=' + teamCode2 };
    });
    await goal('Admin aprueba Halcones (2 equipos en la liga)', async () => {
      await entrar('admin@t.mx'); const id = await aprobarPrimero('approve_team_league');
      const s = await ev(() => ({ teams: (leagueData().teams || []).length }));
      return { ok: s.teams === 2, detail: JSON.stringify(s) };
    });
    await goal('Kevin se une a Halcones y Dora lo aprueba', async () => {
      await registrarse('Kevin Jugador', 'jug2@t.mx', ['jugador'], { num: '10' });
      await ev((d) => requestJoinTeam(d.code, 'Halcones', d.acc), { code: teamCode2, acc: teamAcc2 }); await wait(110);
      await entrar('dueno2@t.mx'); await ev(() => { try { pollInvitations(); } catch (e) {} }); await wait(70);
      const id = await aprobarPrimero('approve_player_team');
      const s = await ev(() => ({ players: (userData().team.players || []).length }));
      return { ok: !!id && s.players === 1, detail: JSON.stringify(s) };
    });

    // ------------------------------------------------ ADMIN crea los partidos
    journey('🏆 Admin de liga (Ana) — partidos y tienda');
    await goal('Sincronizar rosters y generar el calendario (crear partidos)', async () => {
      await entrar('admin@t.mx'); await abrir('liga'); await ev(() => { try { syncApprovedTeams(); } catch (e) {} }); await wait(90);
      await ev(() => { currentRole = 'liga'; genRoundRobin(); }); await wait(70);
      const s = await ev(() => ({ cal: (leagueData().calendar || []).length, rostersOk: (leagueData().teams || []).every(t => (t.players || []).length >= 1) }));
      return { ok: s.cal >= 1 && s.rostersOk, detail: JSON.stringify(s) };
    });
    await goal('Editar fecha y lugar de un partido', async () => {
      await ev(() => { const d = leagueData(); d.calendar[0].date = '2026-08-01'; d.calendar[0].time = '18:00'; d.calendar[0].place = 'Gimnasio Central'; saveLeague(d); });
      const s = await ev(() => ({ place: leagueData().calendar[0].place })); return { ok: s.place === 'Gimnasio Central', detail: JSON.stringify(s) };
    });
    await goal('Asignar una mesa (por correo) a un partido', async () => {
      await ev(() => { const d = leagueData(); d.calendar[0].mesa = 'mesa@t.mx'; saveLeague(d); cloudPushNow(); }); await wait(110);
      const s = await ev(async () => { const lg = await fetchLeagueFull(_session.user.id); return { mesa: (lg.calendar[0] || {}).mesa }; });
      return { ok: s.mesa === 'mesa@t.mx', detail: JSON.stringify(s) };
    });
    await goal('Intentar liguilla con menos de 4 equipos → debe avisar', async () => {
      const msg = await ev(() => { let m = ''; const of = window.flashSaved; window.flashSaved = (t) => { m = t; }; try { genBracket(); } catch (e) {} window.flashSaved = of; return m; });
      return { ok: /4 equipos/i.test(msg), detail: msg };
    });
    await goal('Publicar un producto en la tienda', async () => {
      await abrir('tienda');
      await ev(async () => { const c = sbClient(); await c.from('products').insert({ account_id: _session.user.id, league_name: 'Liga Metropolitana', category: 'Jerseys y ropa', name: 'Jersey Local', price: 450, color: '#e8b13e', active: true }); }); await wait(70);
      const n = await ev(async () => (await fetchProducts()).length); return { ok: n === 1, detail: 'productos=' + n };
    });

    // ----------------------------------------------------- MESA DELEGADA
    journey('🎬 Mesa delegada (Memo)');
    await goal('Registrarse y abrir el partido asignado para dirigirlo', async () => {
      await registrarse('Memo Mesa', 'mesa@t.mx', ['aficionado'], {});
      const r = await ev(async (acc) => { const lg = await fetchLeagueFull(acc); const m = (lg.calendar || []).find(x => (x.mesa || '') === 'mesa@t.mx'); if (!m) return { ok: false, why: 'sin partido asignado' }; officiateRemoteMatch(acc, lg.name, m, lg); return { ok: !!GAME.delegated, teams: GAME.teams.length, players: GAME.teams.map(t => (t.players || []).length) }; }, ligaAcc);
      return { ok: r.ok && r.teams === 2 && r.players.every(n => n >= 1), detail: JSON.stringify(r) };
    });
    await goal('Capturar el partido (marcador) y enviarlo a la liga', async () => {
      await ev(() => { mT = 0; mP = 0; mScore(2); mP = 0; mScore(3); mT = 1; mP = 0; mScore(2); finishOfficiating(); }); await wait(130);
      const s = await ev(() => ({ mr: __DB.match_results.length, hs: (__DB.match_results[0] || {}).home_score, as: (__DB.match_results[0] || {}).away_score }));
      return { ok: s.mr === 1 && s.hs === 5 && s.as === 2, detail: JSON.stringify(s) };
    });

    // --------------------------------------------- ADMIN recibe el resultado
    journey('🏆 Admin de liga (Ana) — resultados');
    await goal('Recibir el resultado de la mesa y aplicarlo a la tabla', async () => {
      await entrar('admin@t.mx'); await ev(async () => await pollMatchResults()); await wait(110);
      const s = await ev(() => { const m = (leagueData().calendar || []).find(x => x.done); const st = computeStandings(); return { done: !!m, hs: m && m.hs, as: m && m.as, topPts: (st[0] || {}).pts }; });
      return { ok: s.done && s.hs === 5 && s.as === 2 && s.topPts >= 2, detail: JSON.stringify(s) };
    });

    // -------------------------------------------- JUGADORA revisa su carta
    journey('🏀 Jugadora (Caro) — su carta');
    await goal('Su carta se llena sola (auto-vínculo por equipo→liga) con números reales', async () => {
      await entrar('jug1@t.mx'); await ev(() => { _cardRemote = null; _cardSearched = false; }); await ev(async () => { await enrichCardFromShared(userData()); }); await wait(90);
      const s = await ev(() => ({ remote: !!_cardRemote, league: _cardRemote && _cardRemote.leagueName, pts: _cardRemote && _cardRemote.player && _cardRemote.player.stats && _cardRemote.player.stats.pts }));
      return { ok: s.remote && s.league === 'Liga Metropolitana' && s.pts >= 2, detail: JSON.stringify(s) };
    });

    // ----------------------------------------------------- AFICIONADO
    journey('📣 Aficionado (Fanny)');
    await goal('Registrarse como aficionado', async () => { await registrarse('Fanny Fan', 'fan@t.mx', ['aficionado'], {}); return { ok: await ev(() => !!__CUR.session) }; });
    await goal('Buscar la liga y ver tabla, roster y resultados reales', async () => {
      const r = await buscar('Metropolitana'); if (r.leagues.length < 1) return { ok: false, detail: 'no encontró' };
      const s = await ev(async (acc) => { const lg = await fetchLeagueFull(acc); return { teams: (lg.teams || []).length, players: (lg.teams || []).reduce((a, t) => a + (t.players || []).length, 0), done: (lg.calendar || []).filter(m => m.done).length }; }, ligaAcc);
      return { ok: s.teams === 2 && s.players >= 2 && s.done === 1, detail: JSON.stringify(s) };
    });
    await goal('Comprar en la tienda y recibir un código para la mesita', async () => {
      await abrir('tienda'); const buy = await ev(async () => { SHOP_PRODS = await fetchProducts(); if (!SHOP_PRODS.length) return { ok: false }; await buyProduct(SHOP_PRODS[0].id); return { pur: __DB.purchases.length, code: (__DB.purchases[0] || {}).code, open: document.getElementById('buyCodeBg').classList.contains('on') }; });
      return { ok: buy.pur === 1 && /^MZ-/.test(buy.code || '') && buy.open, detail: JSON.stringify(buy) };
    });

    // ----------------------------------------------------- COMBINACIONES / BORDES
    journey('🧪 Combinaciones y bordes');
    await goal('Aprobar el mismo equipo dos veces no lo duplica', async () => {
      await entrar('admin@t.mx'); const before = await ev(() => (leagueData().teams || []).length);
      await ev((c) => approveTeamIntoLeague(c), teamCode1); await wait(90);
      const after = await ev(() => (leagueData().teams || []).length); return { ok: before === after, detail: before + '->' + after };
    });
    await goal('Buscar con caracteres raros no rompe la app', async () => { const r = await ev(async () => { try { await searchEntities('a,b(c)%* ñ'); return 'ok'; } catch (e) { return 'THREW:' + e.message; } }); return { ok: r === 'ok', detail: r }; });
    await goal('Correo duplicado al registrarse se bloquea', async () => { const r = await ev(async () => { const x = await sbClient().auth.signUp({ email: 'admin@t.mx', password: 'x' }); return x.error ? 'blocked' : 'allowed'; }); return { ok: r === 'blocked', detail: r }; });
    await goal('Anotar sin elegir jugador no truena (guarda defensiva)', async () => {
      const r = await ev(() => { try { officiateMatch && officiateMatch(0); mT = 0; mP = null; mScore(2); return 'ok'; } catch (e) { return 'THREW:' + e.message; } }); return { ok: r === 'ok', detail: r };
    });
    await goal('Un AFICIONADO no ve carta de jugador (las cartas son de jugadores)', async () => {
      await registrarse('Nadie Fan', 'fan9@t.mx', ['aficionado'], {});
      await abrir('carta'); await wait(70);
      const s = await ev(() => ({ resumen: (document.getElementById('fc-resumen') || {}).textContent || '' }));
      return { ok: /las cartas son de los jugadores/i.test(s.resumen), detail: s.resumen.replace(/\\s+/g, ' ').slice(0, 60) };
    });
    await goal('Un jugador registrado sin partidos ve su carta SIN números inventados', async () => {
      await registrarse('Zoe Nueva', 'jug9@t.mx', ['jugador'], { num: '99' });
      await abrir('carta'); await wait(90);
      const s = await ev(() => ({ remote: !!_cardRemote, resumen: (document.getElementById('fc-resumen') || {}).textContent || '' }));
      return { ok: !s.remote && /mesa|partido|registre/i.test(s.resumen), detail: s.resumen.replace(/\\s+/g, ' ').slice(0, 60) };
    });

  } catch (e) { journey('FATAL'); await goal('Excepción no controlada en el viaje', async () => ({ ok: false, detail: e.message })); }

  // ===================== REPORTE =====================
  let total = 0, passed = 0;
  console.log('\\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   LIGAS MAZI — SIMULADOR DE USUARIOS POR METAS                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  journeys.forEach(j => {
    console.log('\\n' + j.persona);
    j.goals.forEach(g => { total++; if (g.ok) passed++; console.log('   ' + (g.ok ? '✅' : '❌') + ' ' + g.name + (g.ok ? '' : '\\n        → ' + g.detail)); });
  });
  console.log('\\n───────────────────────────────────────────────────────────────');
  console.log('   METAS LOGRADAS: ' + passed + ' / ' + total);
  console.log('   ERRORES DE PÁGINA/CONSOLA: ' + pageErrors.length);
  pageErrors.slice(0, 12).forEach(e => console.log('      ' + e));
  console.log('═══════════════════════════════════════════════════════════════');
  await b.close();
  process.exit(passed === total && pageErrors.length === 0 ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message); process.exit(2); });
