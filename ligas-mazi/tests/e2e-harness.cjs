/* ============================================================================
 * Ligas Mazi — Arnés de pruebas end-to-end (multi-cuenta)
 * ----------------------------------------------------------------------------
 * Simula Supabase en memoria (tablas + RLS por dueño + auth sin confirmación)
 * y maneja la app usando su flujo REAL (doSignup / doSignin / funciones),
 * cambiando de cuenta para simular varios usuarios en varios teléfonos.
 *
 * Uso:  node tests/e2e-harness.cjs
 *       (sirve la carpeta ligas-mazi en :8096 antes, o pásale PORT)
 * ==========================================================================*/
const { chromium } = require('playwright-core');
const PORT = process.env.PORT || 8096;
const EXE = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

// El Supabase falso vive dentro de la página (inyectado). Aquí solo orquestamos.
const FAKE_SRC = `
window.__DB = { app_state:[], public_leagues:[], league_full:[], teams_public:[], players_public:[], invitations:[], match_results:[], products:[], purchases:[], live_games:[] };
window.__ACCOUNTS = {}; // email -> {id,email,password}
window.__CUR = { session:null };
function __uid(){ return 'u-'+Math.random().toString(36).slice(2,9); }
function __ilike(rowval, pat){ const v=String(pat).replace(/%/g,'').toLowerCase(); return String(rowval==null?'':rowval).toLowerCase().includes(v); }
function __rlsScope(table, rows){
  // emula RLS de solo-dueño para app_state cuando no hay filtro explícito
  const uid = window.__CUR.session && window.__CUR.session.user && window.__CUR.session.user.id;
  if(table==='app_state') return rows.filter(r=>r.account_id===uid);
  return rows;
}
function __qb(table){
  const DB=window.__DB; DB[table]=DB[table]||[];
  let filters=[]; let scoped=false;
  const run=()=>{ let rows=DB[table].slice(); if(!filters.some(f=>f.col==='account_id')) rows=__rlsScope(table,rows);
    filters.forEach(f=>{ rows=rows.filter(f.fn); }); return rows; };
  const api={
    select:()=>api,
    eq:(col,val)=>{filters.push({col,fn:r=>r[col]===val});return api;},
    gte:(col,val)=>{filters.push({col,fn:r=>String(r[col])>=String(val)});return api;},
    or:(str)=>{ const parts=str.split(',').map(s=>{const i=s.indexOf('.');const col=s.slice(0,i);const rest=s.slice(i+1);const j=rest.indexOf('.');const op=rest.slice(0,j);const val=rest.slice(j+1);return {col,op,val};});
      filters.push({col:'__or',fn:r=>parts.some(pp=>pp.op==='ilike'&&__ilike(r[pp.col],pp.val))}); return api; },
    order:()=>api, limit:()=>api,
    maybeSingle:()=>{ const rows=run(); return Promise.resolve({data:rows[0]||null,error:null}); },
    single:()=>{ const rows=run(); return Promise.resolve({data:rows[0]||null,error:rows.length?null:{message:'no rows'}}); },
    then:(cb,eb)=>{ return Promise.resolve({data:run(),error:null}).then(cb,eb); }
  };
  api.insert=(row)=>{ const rows=Array.isArray(row)?row:[row]; rows.forEach(x=>{const c=Object.assign({},x); if(c.id===undefined)c.id='id-'+Math.random().toString(36).slice(2,9); DB[table].push(c);}); return Promise.resolve({data:rows,error:null}); };
  api.upsert=(row)=>{ const rows=Array.isArray(row)?row:[row]; rows.forEach(x=>{ const pk = x.account_id!==undefined?'account_id':(x.id!==undefined?'id':null);
      if(pk){ const i=DB[table].findIndex(r=>r[pk]===x[pk]); if(i>=0)DB[table][i]=Object.assign({},DB[table][i],x); else DB[table].push(Object.assign({},x)); }
      else DB[table].push(Object.assign({},x)); }); return Promise.resolve({data:rows,error:null}); };
  api.update=(vals)=>{ const u={_f:[],eq:function(c,v){this._f.push(r=>r[c]===v);return this;},then:function(cb){ DB[table].forEach(r=>{ if(this._f.every(f=>f(r)))Object.assign(r,vals); }); return Promise.resolve({error:null}).then(cb);} }; return u; };
  api.delete=()=>{ const d={_f:[],eq:function(c,v){this._f.push(r=>r[c]===v); const before=DB[table].length; window.__DB[table]=DB[table].filter(r=>!this._f.every(f=>f(r))); return Promise.resolve({error:null});}}; return d; };
  return api;
}
window.__FAKE = {
  from: __qb,
  channel: ()=>({ on:function(){return this;}, subscribe:function(cb){ if(cb)cb('SUBSCRIBED'); return this; }, track:async()=>{}, untrack:()=>{}, presenceState:()=>({}) }),
  removeChannel: ()=>{},
  auth: {
    getSession: async()=>({data:{session:window.__CUR.session}}),
    signUp: async({email,password})=>{ const e=email.toLowerCase(); if(window.__ACCOUNTS[e]) return {data:{},error:{message:'User already registered'}};
      const id=__uid(); window.__ACCOUNTS[e]={id,email:e,password}; window.__CUR.session={user:{id,email:e}}; return {data:{session:window.__CUR.session,user:{id,email:e}},error:null}; },
    signInWithPassword: async({email,password})=>{ const a=window.__ACCOUNTS[email.toLowerCase()]; if(!a||a.password!==password) return {data:{},error:{message:'Invalid login credentials'}};
      window.__CUR.session={user:{id:a.id,email:a.email}}; return {data:{session:window.__CUR.session},error:null}; },
    signOut: async()=>{ window.__CUR.session=null; return {error:null}; },
    onAuthStateChange: ()=>({data:{subscription:{unsubscribe:()=>{}}}})
  }
};
window.sbClient = ()=> window.__FAKE;
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

  const results = [];
  const rec = (name, pass, detail) => { results.push({ name, pass: !!pass, detail: detail || '' }); };
  const wait = (ms) => p.waitForTimeout(ms);

  // Helper de la página: registrar una cuenta con su entidad
  async function signup(name, email, roles, fields) {
    await p.evaluate(async ({ name, email, roles, fields }) => {
      try { await __FAKE.auth.signOut(); } catch (e) {}
      localStorage.removeItem('lm_user'); localStorage.removeItem('lm_league');
      window._authed = false; window._session = null;
      signupRoles = roles.slice(); buildSignupEntity();
      document.getElementById('upName').value = name;
      document.getElementById('upEmail').value = email;
      document.getElementById('upPass').value = 'Prueba123';
      if (fields.league && document.getElementById('upLeague')) document.getElementById('upLeague').value = fields.league;
      if (fields.team && document.getElementById('upTeam')) document.getElementById('upTeam').value = fields.team;
      if (fields.num && document.getElementById('upNum')) document.getElementById('upNum').value = fields.num;
      doSignup();
    }, { name, email, roles, fields });
    await wait(250);
  }
  async function loginAs(email) {
    await p.evaluate(async (email) => {
      document.getElementById('inEmail').value = email;
      document.getElementById('inPass').value = 'Prueba123';
      doSignin();
    }, email);
    await wait(300);
  }
  const val = (fn, arg) => p.evaluate(fn, arg);

  // ===================== ESCENARIOS =====================
  try {
    // 1) ADMIN se registra y crea su liga
    await signup('Ana Admin', 'admin@t.mx', ['admin_liga'], { league: 'Liga Demo' });
    let s = await val(() => ({ code: (leagueData() || {}).code, name: (leagueData() || {}).name, authed: window._authed, pub: (__DB.public_leagues || []).length, full: (__DB.league_full || []).length }));
    rec('Admin: liga creada con código', s.code && s.code.startsWith('L-') && s.name === 'Liga Demo', JSON.stringify(s));
    rec('Admin: liga publicada a la nube (directorio + full)', s.pub === 1 && s.full === 1, 'pub=' + s.pub + ' full=' + s.full);
    const ligaCode = s.code;

    // 2) DUEÑO 1 se registra y crea su equipo
    await signup('Beto Dueño', 'dueno1@t.mx', ['dueno'], { team: 'Titanes' });
    s = await val(() => ({ teamCode: (userData().team || {}).code, tp: (__DB.teams_public || []).length }));
    rec('Dueño1: equipo creado con código', s.teamCode && s.teamCode.startsWith('E-'), JSON.stringify(s));
    rec('Dueño1: equipo publicado (buscable)', s.tp === 1, 'teams_public=' + s.tp);
    const teamCode1 = s.teamCode;

    // 3) DUEÑO1 busca la liga por código y solicita unirse
    const found = await val(async (code) => { const r = await searchEntities(code); return { leagues: r.leagues.length, first: (r.leagues[0] || {}).code }; }, ligaCode);
    rec('Buscar liga por código encuentra 1', found.leagues === 1 && found.first === ligaCode, JSON.stringify(found));
    await val((acc) => requestJoinLeagueTeam(acc, 'Liga Demo'), await val(() => (__DB.public_leagues[0] || {}).account_id));
    await wait(150);
    s = await val(() => ({ inv: (__DB.invitations || []).filter(i => i.kind === 'join_league').length }));
    rec('Dueño1: solicitud de unirse a liga enviada', s.inv === 1, 'invites=' + s.inv);

    // 4) ADMIN entra, recibe la solicitud y aprueba
    await loginAs('admin@t.mx');
    await val(() => { try { pollInvitations(); } catch (e) {} });
    await wait(200);
    let noteId = await val(() => { const n = notes().find(x => x.action === 'approve_team_league'); return n ? n.id : null; });
    rec('Admin: recibe la solicitud del equipo', !!noteId, 'noteId=' + noteId);
    if (noteId) { await val((id) => acceptInvite(id), noteId); await wait(250); }
    s = await val(() => ({ teams: (leagueData().teams || []).length, name: ((leagueData().teams || [])[0] || {}).name }));
    rec('Admin: equipo aprobado entra a la liga', s.teams === 1 && s.name === 'Titanes', JSON.stringify(s));

    // 5) JUGADOR se registra
    await signup('Caro Jugadora', 'jug1@t.mx', ['jugador'], { num: '7' });
    s = await val(() => ({ pc: userData().playerCode, pp: (__DB.players_public || []).length }));
    rec('Jugadora: identidad creada con código', s.pc && s.pc.startsWith('J-'), JSON.stringify(s));
    const playerCode1 = s.pc;

    // 6) JUGADORA busca el equipo y se une
    const ft = await val(async (code) => { const r = await searchEntities(code); return { teams: r.teams.length }; }, teamCode1);
    rec('Buscar equipo por código encuentra 1', ft.teams === 1, JSON.stringify(ft));
    await val((data) => requestJoinTeam(data.code, 'Titanes', data.acc), { code: teamCode1, acc: await val(() => (__DB.teams_public[0] || {}).account_id) });
    await wait(150);
    s = await val(() => ({ inv: (__DB.invitations || []).filter(i => i.kind === 'join_team').length, ptc: userData().playerTeamCode }));
    rec('Jugadora: solicitud a equipo enviada + guarda team code', s.inv === 1 && s.ptc === teamCode1, JSON.stringify(s));

    // 7) DUEÑO1 aprueba a la jugadora
    await loginAs('dueno1@t.mx');
    await val(() => { try { pollInvitations(); } catch (e) {} });
    await wait(200);
    noteId = await val(() => { const n = notes().find(x => x.action === 'approve_player_team'); return n ? n.id : null; });
    rec('Dueño1: recibe la solicitud de la jugadora', !!noteId, 'noteId=' + noteId);
    if (noteId) { await val((id) => acceptInvite(id), noteId); await wait(250); }
    s = await val(() => ({ players: (userData().team.players || []).length, nm: ((userData().team.players || [])[0] || {}).nm }));
    rec('Dueño1: jugadora entra a su roster', s.players === 1 && s.nm === 'Caro Jugadora', JSON.stringify(s));

    // 8) ADMIN sincroniza rosters (la jugadora entró después de que el equipo se unió)
    await loginAs('admin@t.mx');
    await val(() => { try { syncApprovedTeams(); } catch (e) {} });
    await wait(300);
    s = await val(() => { const t = (leagueData().teams || [])[0] || {}; return { players: (t.players || []).length, nm: ((t.players || [])[0] || {}).nm }; });
    rec('Admin: sync trae a la jugadora al roster de la liga', s.players === 1 && s.nm === 'Caro Jugadora', JSON.stringify(s));

    // 9) Segundo equipo + jugadora para tener partido
    await signup('Dora Dueña', 'dueno2@t.mx', ['dueno'], { team: 'Halcones' });
    const teamAcc2 = await val(() => (__DB.teams_public.find(t => t.name === 'Halcones') || {}).account_id);
    const teamCode2 = await val(() => (__DB.teams_public.find(t => t.name === 'Halcones') || {}).code);
    await val((acc) => requestJoinLeagueTeam(acc, 'Liga Demo'), await val(() => __DB.public_leagues[0].account_id));
    await wait(150);
    await loginAs('admin@t.mx'); await val(() => { try { pollInvitations(); } catch (e) {} }); await wait(200);
    noteId = await val(() => { const n = notes().find(x => x.action === 'approve_team_league'); return n ? n.id : null; });
    if (noteId) { await val((id) => acceptInvite(id), noteId); await wait(250); }
    s = await val(() => ({ teams: (leagueData().teams || []).length }));
    rec('Admin: segundo equipo aprobado (2 equipos)', s.teams === 2, JSON.stringify(s));

    // 10) ADMIN genera calendario y asigna una mesa (otra cuenta) al partido
    await val(() => { currentRole = 'liga'; genRoundRobin(); });
    await wait(100);
    const cal = await val(() => (leagueData().calendar || []).length);
    rec('Admin: calendario generado', cal >= 1, 'partidos=' + cal);
    await val(() => { const d = leagueData(); if (d.calendar[0]) d.calendar[0].mesa = 'mesa@t.mx'; saveLeague(d); });
    await val(() => { try { cloudPush(); } catch (e) {} }); await wait(200);

    // 11) MESA se registra (aficionado) y dirige el partido remoto
    await signup('Memo Mesa', 'mesa@t.mx', ['aficionado'], {});
    const adminAcc = await val(() => __DB.public_leagues[0].account_id);
    const openedLive = await val(async (acc) => {
      const lg = await fetchLeagueFull(acc); if (!lg) return { ok: false, why: 'no league' };
      const m = (lg.calendar || []).find(x => (x.mesa || '') === 'mesa@t.mx'); if (!m) return { ok: false, why: 'no assigned match' };
      officiateRemoteMatch(acc, lg.name, m, lg);
      return { ok: !!GAME.delegated, teams: GAME.teams.length };
    }, adminAcc);
    rec('Mesa: abre y dirige el partido asignado (modo delegado)', openedLive.ok && openedLive.teams === 2, JSON.stringify(openedLive));
    // captura puntos y finaliza
    await val(() => { mT = 0; mP = 0; mScore(2); mP = 0; mScore(3); mT = 1; mP = 0; mScore(2); finishOfficiating(); });
    await wait(250);
    s = await val(() => ({ mr: (__DB.match_results || []).length, hs: (__DB.match_results[0] || {}).home_score, as: (__DB.match_results[0] || {}).away_score }));
    rec('Mesa: resultado enviado a la liga', s.mr === 1 && s.hs === 5 && s.as === 2, JSON.stringify(s));

    // 12) ADMIN recoge el resultado y lo aplica
    await loginAs('admin@t.mx');
    const appliedN = await val(async () => { return await pollMatchResults(); });
    await wait(200);
    s = await val(() => { const m = (leagueData().calendar || []).find(x => x.done); return { done: !!m, hs: m && m.hs, as: m && m.as, applied: (__DB.match_results[0] || {}).status }; });
    rec('Admin: resultado aplicado al calendario', s.done && s.hs === 5 && s.as === 2 && s.applied === 'applied', JSON.stringify(s));
    s = await val(() => { const st = computeStandings(); return { rows: st.length, top: (st[0] || {}).pts }; });
    rec('Admin: tabla recalculada con puntos', s.rows === 2 && s.top >= 2, JSON.stringify(s));

    // 13) JUGADORA abre su carta: se llena por la cadena equipo->liga
    await loginAs('jug1@t.mx');
    await val(() => { _cardRemote = null; _cardSearched = false; });
    await val(async () => { await enrichCardFromShared(userData()); });
    await wait(300);
    s = await val(() => ({ remote: !!_cardRemote, league: _cardRemote && _cardRemote.leagueName, follows: (userData().followLeagues || []).length }));
    rec('Jugadora: su carta se auto-vincula por cadena equipo->liga', s.remote && s.league === 'Liga Demo', JSON.stringify(s));

    // 14) PÚBLICO busca y ve la liga (tabla/roster reales)
    await signup('Fanny Fan', 'fan@t.mx', ['aficionado'], {});
    const pub = await val(async (acc) => { const lg = await fetchLeagueFull(acc); return { teams: (lg.teams || []).length, players: (lg.teams || []).reduce((a, t) => a + (t.players || []).length, 0), calDone: (lg.calendar || []).filter(m => m.done).length }; }, adminAcc);
    rec('Público: ve la liga completa (equipos, jugadores, resultados)', pub.teams === 2 && pub.players >= 1 && pub.calDone === 1, JSON.stringify(pub));

    // 15) TIENDA: admin publica producto, fan compra -> código
    await loginAs('admin@t.mx');
    await val(async () => { document.getElementById('pName') && (document.getElementById('pName').value = 'Jersey'); });
    await val(async () => { const c = sbClient(); await c.from('products').insert({ account_id: _session.user.id, league_name: 'Liga Demo', category: 'Jerseys y ropa', name: 'Jersey', price: 400, color: '#e8b13e', active: true }); });
    await loginAs('fan@t.mx');
    const prods = await val(async () => { const list = await fetchProducts(); return list.length; });
    rec('Tienda: el producto se ve desde otra cuenta', prods === 1, 'productos=' + prods);
    const buy = await val(async () => { SHOP_PRODS = await fetchProducts(); const id = SHOP_PRODS[0].id; await buyProduct(id); return { pur: (__DB.purchases || []).length, code: (__DB.purchases[0] || {}).code }; });
    rec('Tienda: compra genera código', buy.pur === 1 && /^MZ-/.test(buy.code || ''), JSON.stringify(buy));

    // 16) COMBINACIONES / BORDES
    // 16a) aprobar el mismo equipo dos veces no duplica
    await loginAs('admin@t.mx');
    const dupBefore = await val(() => (leagueData().teams || []).length);
    await val((code) => approveTeamIntoLeague(code), teamCode1);
    await wait(150);
    const dupAfter = await val(() => (leagueData().teams || []).length);
    rec('Borde: aprobar el mismo equipo 2 veces no duplica', dupBefore === dupAfter, dupBefore + '->' + dupAfter);
    // 16b) buscar con caracteres raros no rompe
    const weird = await val(async () => { try { await searchEntities('a,b(c)%*'); return 'ok'; } catch (e) { return 'THREW:' + e.message; } });
    rec('Borde: buscar con caracteres raros no truena', weird === 'ok', weird);
    // 16c) jugadora nueva sin aprobar: su carta queda vacía (no fantasma)
    await signup('Nadie Nuevo', 'jug9@t.mx', ['jugador'], { num: '99' });
    await val(() => { _cardRemote = null; _cardSearched = false; renderCard(); });
    await wait(150);
    const empty = await val(() => ({ remote: !!_cardRemote, resumen: (document.getElementById('fc-resumen') || {}).textContent || '' }));
    rec('Borde: jugadora sin equipo NO tiene carta fantasma', !empty.remote, empty.resumen.slice(0, 40));
    // 16d) correo duplicado al registrarse
    const dupEmail = await val(async () => { const r = await sbClient().auth.signUp({ email: 'admin@t.mx', password: 'x' }); return r.error ? 'blocked' : 'allowed'; });
    rec('Borde: correo duplicado se bloquea', dupEmail === 'blocked', dupEmail);

  } catch (e) {
    rec('EXCEPCIÓN EN EL ARNÉS', false, e.message);
  }

  // ===================== REPORTE =====================
  const passed = results.filter(r => r.pass).length;
  console.log('\\n================ REPORTE DE PRUEBAS ================');
  results.forEach(r => console.log((r.pass ? '✅' : '❌') + ' ' + r.name + (r.pass ? '' : '  →  ' + r.detail)));
  console.log('---------------------------------------------------');
  console.log('PASARON ' + passed + ' / ' + results.length);
  console.log('ERRORES DE PÁGINA/CONSOLA: ' + pageErrors.length);
  pageErrors.slice(0, 12).forEach(e => console.log('  ' + e));
  console.log('===================================================');

  await b.close();
  process.exit(passed === results.length && pageErrors.length === 0 ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message); process.exit(2); });
