/* ============================================================================
 * Ligas Mazi — Simulador de LÓGICA en Node puro (sin navegador)
 * Carga el script de la app en un contexto con DOM/localStorage/Supabase
 * simulados y ejerce la lógica central multi-cuenta (registro→liga/equipo/
 * jugador→buscar→aprobar→partido→mesa→resultado→carta→tienda).
 * Rápido y sin depender de Chromium.  Uso:  node tests/node-sim.cjs
 * ==========================================================================*/
const fs = require('fs'); const vm = require('vm'); const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const appSrc = scripts.sort((a, b) => b.length - a.length)[0]; // el grande = la app

// ---------- stubs de DOM / navegador ----------
function makeEl() {
  const el = { value: '', innerHTML: '', textContent: '', src: '', className: '', dataset: {}, children: [], style: {} };
  el.style.setProperty = () => {}; el.style.cssText = '';
  el.classList = { _s: new Set(), add(x){this._s.add(x);}, remove(x){this._s.delete(x);}, toggle(x,f){f?this._s.add(x):this._s.delete(x);}, contains(x){return this._s.has(x);} };
  el.appendChild = (c) => { el.children.push(c); return c; };
  el.querySelector = () => makeEl(); el.querySelectorAll = () => [];
  el.addEventListener = () => {}; el.removeEventListener = () => {}; el.setAttribute = () => {}; el.getAttribute = () => null;
  el.remove = () => {}; el.focus = () => {}; el.click = () => {}; el.closest = () => null;
  el.getContext = () => ({ fillRect(){}, fillText(){}, drawImage(){}, createLinearGradient:()=>({addColorStop(){}}), beginPath(){}, arc(){}, fill(){}, save(){}, restore(){}, measureText:()=>({width:10}), roundRect(){} });
  el.toDataURL = () => 'data:,'; el.getBoundingClientRect = () => ({ width: 100, height: 100, left: 0, top: 0 });
  return new Proxy(el, { get(t, k) { if (k in t) return t[k]; if (typeof k === 'string' && /^on/.test(k)) return t[k] || null; return undefined; }, set(t, k, v) { t[k] = v; return true; } });
}
const els = {};
const doc = {
  getElementById: (id) => (els[id] || (els[id] = makeEl())),
  createElement: () => makeEl(), createElementNS: () => makeEl(),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener: () => {}, documentElement: makeEl(), body: makeEl(), head: makeEl(),
  getElementsByTagName: () => [], cookie: '',
};
const store = {}; const localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, clear: () => { for (const k in store) delete store[k]; } };
const ctx = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Promise, Error, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
  document: doc, localStorage,
  navigator: { userAgent: 'node', share: undefined, clipboard: { writeText: async () => {} } },
  location: { hash: '', href: 'http://localhost/', origin: 'http://localhost', reload() {} },
  history: { pushState() {}, replaceState() {}, back() {} },
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true,
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => '#888888' }),
  requestAnimationFrame: (f) => setTimeout(f, 0), cancelAnimationFrame: () => {},
  Image: function () { this.onload = null; Object.defineProperty(this, 'src', { set() { if (this.onload) setTimeout(this.onload, 0); } }); },
  FileReader: function () { this.readAsDataURL = () => { this.result = 'data:,'; if (this.onload) setTimeout(this.onload, 0); }; },
  fetch: async () => ({ ok: false, json: async () => ({}) }),
  alert: () => {}, prompt: () => null, confirm: () => true,
  anime: undefined, supabase: undefined,
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);

// ---------- Supabase falso (mismo modelo que el arnés de navegador) ----------
const FAKE = `
window.__DB={app_state:[],public_leagues:[],league_full:[],teams_public:[],players_public:[],invitations:[],match_results:[],products:[],purchases:[],live_games:[]};
window.__ACCOUNTS={};window.__CUR={session:null};
function __uid(){return 'u-'+Math.random().toString(36).slice(2,9);}
function __ilike(v,pat){const q=String(pat).replace(/%/g,'').toLowerCase();return String(v==null?'':v).toLowerCase().includes(q);}
function __scope(t,rows){const uid=window.__CUR.session&&window.__CUR.session.user&&window.__CUR.session.user.id;if(t==='app_state')return rows.filter(r=>r.account_id===uid);return rows;}
function __qb(table){const DB=window.__DB;DB[table]=DB[table]||[];let filters=[];
 const run=()=>{let rows=DB[table].slice();if(!filters.some(f=>f.col==='account_id'))rows=__scope(table,rows);filters.forEach(f=>rows=rows.filter(f.fn));return rows;};
 const api={select:()=>api,eq:(c,v)=>{filters.push({col:c,fn:r=>r[c]===v});return api;},gte:(c,v)=>{filters.push({col:c,fn:r=>String(r[c])>=String(v)});return api;},
  or:(str)=>{const parts=str.split(',').map(s=>{const i=s.indexOf('.');const col=s.slice(0,i);const rest=s.slice(i+1);const j=rest.indexOf('.');return{col,op:rest.slice(0,j),val:rest.slice(j+1)};});filters.push({col:'__or',fn:r=>parts.some(pp=>pp.op==='ilike'&&__ilike(r[pp.col],pp.val))});return api;},
  order:()=>api,limit:()=>api,maybeSingle:()=>Promise.resolve({data:run()[0]||null,error:null}),single:()=>{const r=run();return Promise.resolve({data:r[0]||null,error:r.length?null:{message:'no rows'}});},then:(cb,eb)=>Promise.resolve({data:run(),error:null}).then(cb,eb)};
 api.insert=(row)=>{const rows=Array.isArray(row)?row:[row];rows.forEach(x=>{const c=Object.assign({},x);if(c.id===undefined)c.id='id-'+Math.random().toString(36).slice(2,9);DB[table].push(c);});return Promise.resolve({data:rows,error:null});};
 api.upsert=(row)=>{const rows=Array.isArray(row)?row:[row];rows.forEach(x=>{const pk=x.account_id!==undefined?'account_id':(x.id!==undefined?'id':null);if(pk){const i=DB[table].findIndex(r=>r[pk]===x[pk]);if(i>=0)DB[table][i]=Object.assign({},DB[table][i],x);else DB[table].push(Object.assign({},x));}else DB[table].push(Object.assign({},x));});return Promise.resolve({data:rows,error:null});};
 api.update=(vals)=>{const u={_f:[],eq:function(c,v){this._f.push(r=>r[c]===v);return this;},then:function(cb){DB[table].forEach(r=>{if(this._f.every(f=>f(r)))Object.assign(r,vals);});return Promise.resolve({error:null}).then(cb);}};return u;};
 api.delete=()=>{const d={_f:[],eq:function(c,v){this._f.push(r=>r[c]===v);window.__DB[table]=DB[table].filter(r=>!this._f.every(f=>f(r)));return Promise.resolve({error:null});}};return d;};
 return api;}
window.__FAKE={from:__qb,channel:()=>({on:function(){return this;},subscribe:function(cb){if(cb)cb('SUBSCRIBED');return this;},track:async()=>{},untrack:()=>{},presenceState:()=>({})}),removeChannel:()=>{},
 auth:{getSession:async()=>({data:{session:window.__CUR.session}}),
  signUp:async({email,password})=>{const e=email.toLowerCase();if(window.__ACCOUNTS[e])return{data:{},error:{message:'User already registered'}};const id=__uid();window.__ACCOUNTS[e]={id,email:e,password};window.__CUR.session={user:{id,email:e}};return{data:{session:window.__CUR.session,user:{id,email:e}},error:null};},
  signInWithPassword:async({email,password})=>{const a=window.__ACCOUNTS[email.toLowerCase()];if(!a||a.password!==password)return{data:{},error:{message:'Invalid login credentials'}};window.__CUR.session={user:{id:a.id,email:a.email}};return{data:{session:window.__CUR.session},error:null};},
  signOut:async()=>{window.__CUR.session=null;return{error:null};},onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})}};
`;

// cargar la app
try { vm.runInContext(FAKE, ctx); } catch (e) { console.log('FAKE err', e.message); }
try { vm.runInContext(appSrc, ctx); } catch (e) { console.log('APP LOAD err:', e.message); }
// forzar el cliente falso
vm.runInContext('window.sbClient=function(){return window.__FAKE;};', ctx);

// ---------- utilidades del simulador ----------
const R = (code) => vm.runInContext(code, ctx);
const RA = (code) => vm.runInContext('(async()=>{' + code + '})()', ctx);
const results = []; let cur = null;
const journey = (p) => { cur = { p, goals: [] }; results.push(cur); };
async function goal(name, fn) { const g = { name, ok: false, detail: '' }; cur.goals.push(g);
  try { const r = await fn(); g.ok = !(r && r.ok === false); g.detail = (r && r.detail) || ''; } catch (e) { g.ok = false; g.detail = 'EX: ' + e.message; }
  console.log((g.ok ? 'PASS' : 'FALLA') + ' · ' + name + (g.ok ? '' : '  -> ' + g.detail)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
function setField(id, v) { R(`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(v)};`); }
async function registrarse(name, email, roles, f) {
  R(`(async()=>{try{await __FAKE.auth.signOut();}catch(e){}})();`); R(`localStorage.removeItem('lm_user');localStorage.removeItem('lm_league');_authed=false;_session=null;`);
  R(`signupRoles=${JSON.stringify(roles)};buildSignupEntity();`);
  setField('upName', name); setField('upEmail', email); setField('upPass', 'Prueba123');
  if (f.league) setField('upLeague', f.league); if (f.team) setField('upTeam', f.team); if (f.num) setField('upNum', f.num);
  R('doSignup();'); await wait(60);
}
async function entrar(email) { setField('inEmail', email); setField('inPass', 'Prueba123'); R('doSignin();'); await wait(80); }
const get = (expr) => R('(' + expr + ')');
const getA = (expr) => RA('return (' + expr + ');');

(async () => {
  let ligaAcc, ligaCode, teamCode1, teamAcc1, teamCode2, teamAcc2;
  try {
    journey('🏆 Admin de liga (Ana)');
    await goal('Registrarse y crear su liga (con código)', async () => {
      await registrarse('Ana Admin', 'admin@t.mx', ['admin_liga'], { league: 'Liga Metropolitana' }); await wait(60);
      const s = get("({code:(leagueData()||{}).code,name:(leagueData()||{}).name,authed:!!__CUR.session})");
      ligaCode = s.code; ligaAcc = get("(__DB.public_leagues[0]||{}).account_id");
      return { ok: s.authed && s.code && s.code[0] === 'L' && s.name === 'Liga Metropolitana', detail: JSON.stringify(s) };
    });
    await goal('Su liga se publicó a la nube (directorio + datos completos)', async () =>
      ({ ok: get("__DB.public_leagues.length") === 1 && get("__DB.league_full.length") === 1, detail: 'pub=' + get("__DB.public_leagues.length") }));

    journey('🛡️ Dueño (Beto · Titanes)');
    await goal('Registrarse y crear su equipo', async () => {
      await registrarse('Beto Dueño', 'dueno1@t.mx', ['dueno'], { team: 'Titanes' }); await wait(60);
      teamCode1 = get("(userData().team||{}).code"); teamAcc1 = get("(__DB.teams_public.find(t=>t.name==='Titanes')||{}).account_id");
      return { ok: teamCode1 && teamCode1[0] === 'E', detail: 'code=' + teamCode1 };
    });
    await goal('Buscar la liga por código y solicitar unirse', async () => {
      const n = await getA("(await searchEntities('" + ligaCode + "')).leagues.length");
      if (n !== 1) return { ok: false, detail: 'búsqueda liga=' + n };
      R(`requestJoinLeagueTeam(${JSON.stringify(ligaAcc)},'Liga Metropolitana');`); await wait(80);
      return { ok: get("__DB.invitations.filter(i=>i.kind==='join_league').length") === 1, detail: 'ok' };
    });

    journey('🏆 Admin — aprobar equipo');
    await goal('Recibir la solicitud y aprobar a Titanes', async () => {
      await entrar('admin@t.mx'); R('pollInvitations();'); await wait(120);
      const id = get("(function(){var n=notes().find(x=>x.action==='approve_team_league');return n?n.id:null;})()");
      if (id) { R(`acceptInvite(${JSON.stringify(id)});`); await wait(150); }
      return { ok: get("(leagueData().teams||[]).length") === 1 && get("((leagueData().teams||[])[0]||{}).name") === 'Titanes', detail: 'teams=' + get("(leagueData().teams||[]).length") };
    });

    journey('🏀 Jugadora (Caro · #7)');
    await goal('Registrarse creando su identidad (# y posición)', async () => {
      await registrarse('Caro Jugadora', 'jug1@t.mx', ['jugador'], { num: '7' }); await wait(60);
      return { ok: get("!!userData().playerCode") && get("userData().num") === '7', detail: get("userData().playerCode") };
    });
    await goal('Buscar su equipo (por código) y solicitar unirse', async () => {
      const n = await getA("(await searchEntities('" + teamCode1 + "')).teams.length");
      if (n !== 1) return { ok: false, detail: 'búsqueda equipo=' + n };
      R(`requestJoinTeam(${JSON.stringify(teamCode1)},'Titanes',${JSON.stringify(teamAcc1)});`); await wait(80);
      return { ok: get("userData().playerTeamCode") === teamCode1, detail: 'ptc ok' };
    });

    journey('🛡️ Dueño (Beto) — plantilla');
    await goal('Recibir aprobación de su equipo (llega league_code)', async () => {
      await entrar('dueno1@t.mx'); R('pollInvitations();'); await wait(150);
      return { ok: get("(userData().team||{}).status") === 'aprobado' && get("!!(userData().team||{}).league_code"), detail: JSON.stringify(get("({s:(userData().team||{}).status,lc:(userData().team||{}).league_code})")) };
    });
    await goal('Aprobar a la jugadora que solicita', async () => {
      const id = get("(function(){var n=notes().find(x=>x.action==='approve_player_team');return n?n.id:null;})()");
      if (id) { R(`acceptInvite(${JSON.stringify(id)});`); await wait(150); }
      return { ok: get("(userData().team.players||[]).length") === 1, detail: 'players=' + get("(userData().team.players||[]).length") };
    });

    journey('🏆 Admin — 2º equipo, calendario, mesa');
    await goal('2º equipo (Halcones) + jugador (Kevin) listos', async () => {
      await registrarse('Dora Dueña', 'dueno2@t.mx', ['dueno'], { team: 'Halcones' }); await wait(60);
      teamCode2 = get("(__DB.teams_public.find(t=>t.name==='Halcones')||{}).code"); teamAcc2 = get("(__DB.teams_public.find(t=>t.name==='Halcones')||{}).account_id");
      R(`requestJoinLeagueTeam(${JSON.stringify(ligaAcc)},'Liga Metropolitana');`); await wait(80);
      await entrar('admin@t.mx'); R('pollInvitations();'); await wait(120);
      let id = get("(function(){var n=notes().find(x=>x.action==='approve_team_league');return n?n.id:null;})()"); if (id) { R(`acceptInvite(${JSON.stringify(id)});`); await wait(150); }
      await registrarse('Kevin Jugador', 'jug2@t.mx', ['jugador'], { num: '10' }); await wait(60);
      R(`requestJoinTeam(${JSON.stringify(teamCode2)},'Halcones',${JSON.stringify(teamAcc2)});`); await wait(80);
      await entrar('dueno2@t.mx'); R('pollInvitations();'); await wait(150);
      id = get("(function(){var n=notes().find(x=>x.action==='approve_player_team');return n?n.id:null;})()"); if (id) { R(`acceptInvite(${JSON.stringify(id)});`); await wait(150); }
      await entrar('admin@t.mx'); await RA("await syncApprovedTeams();"); await wait(150);
      return { ok: get("(leagueData().teams||[]).length") === 2 && get("(leagueData().teams||[]).every(t=>(t.players||[]).length>=1)"), detail: JSON.stringify(get("(leagueData().teams||[]).map(t=>(t.players||[]).length)")) };
    });
    await goal('Generar calendario (crear partidos) y asignar mesa', async () => {
      R("currentRole='liga';genRoundRobin();"); await wait(80);
      R("(function(){var d=leagueData();d.calendar[0].mesa='mesa@t.mx';d.calendar[0].place='Gimnasio Central';saveLeague(d);cloudPushNow();})();"); await wait(120);
      return { ok: get("(leagueData().calendar||[]).length") >= 1 && get("leagueData().calendar[0].mesa") === 'mesa@t.mx', detail: 'cal=' + get("(leagueData().calendar||[]).length") };
    });

    journey('🎬 Mesa delegada (Memo)');
    await goal('Abrir el partido asignado, capturarlo y enviarlo', async () => {
      await registrarse('Memo Mesa', 'mesa@t.mx', ['aficionado'], {}); await wait(60);
      const opened = await getA("var lg=await fetchLeagueFull(" + JSON.stringify(ligaAcc) + ");var m=(lg.calendar||[]).find(x=>(x.mesa||'')==='mesa@t.mx');if(!m)return {ok:false};officiateRemoteMatch(" + JSON.stringify(ligaAcc) + ",lg.name,m,lg);return {ok:!!GAME.delegated,players:GAME.teams.map(t=>(t.players||[]).length)};");
      if (!opened.ok) return { ok: false, detail: 'no abrió: ' + JSON.stringify(opened) };
      R("mT=0;mP=0;mScore(2);mP=0;mScore(3);mT=1;mP=0;mScore(2);finishOfficiating();"); await wait(150);
      return { ok: get("__DB.match_results.length") === 1 && get("(__DB.match_results[0]||{}).home_score") === 5 && get("(__DB.match_results[0]||{}).away_score") === 2, detail: JSON.stringify(get("({mr:__DB.match_results.length,hs:(__DB.match_results[0]||{}).home_score,as:(__DB.match_results[0]||{}).away_score})")) };
    });

    journey('🏆 Admin — recibir resultado');
    await goal('Recibir el resultado de la mesa y actualizar la tabla', async () => {
      await entrar('admin@t.mx'); await RA("await pollMatchResults();"); await wait(120);
      return { ok: get("!!(leagueData().calendar||[]).find(x=>x.done)") && get("(computeStandings()[0]||{}).pts") >= 2, detail: JSON.stringify(get("({done:!!(leagueData().calendar||[]).find(x=>x.done),top:(computeStandings()[0]||{}).pts})")) };
    });

    journey('🏀 Jugadora — su carta');
    await goal('Su carta se auto-vincula (cadena equipo→liga) con números', async () => {
      await entrar('jug1@t.mx'); R("_cardRemote=null;_cardSearched=false;"); await RA("await enrichCardFromShared(userData());"); await wait(150);
      return { ok: get("!!_cardRemote") && get("_cardRemote&&_cardRemote.leagueName") === 'Liga Metropolitana' && get("(_cardRemote&&_cardRemote.player&&_cardRemote.player.stats&&_cardRemote.player.stats.pts)||0") >= 2, detail: JSON.stringify(get("({r:!!_cardRemote,lg:_cardRemote&&_cardRemote.leagueName})")) };
    });

    journey('📣 Aficionado + 🛒 Tienda');
    await goal('Aficionado ve la liga completa (tabla, roster, resultados)', async () => {
      await registrarse('Fanny Fan', 'fan@t.mx', ['aficionado'], {}); await wait(50);
      const s = await getA("var lg=await fetchLeagueFull(" + JSON.stringify(ligaAcc) + ");return {teams:(lg.teams||[]).length,players:(lg.teams||[]).reduce((a,t)=>a+(t.players||[]).length,0),done:(lg.calendar||[]).filter(m=>m.done).length};");
      return { ok: s.teams === 2 && s.players >= 2 && s.done === 1, detail: JSON.stringify(s) };
    });
    await goal('Admin publica producto y aficionado compra (código MZ-)', async () => {
      await entrar('admin@t.mx'); await RA("await sbClient().from('products').insert({account_id:_session.user.id,league_name:'Liga Metropolitana',category:'Jerseys y ropa',name:'Jersey',price:400,color:'#e8b13e',active:true});"); await wait(80);
      await entrar('fan@t.mx'); const buy = await getA("SHOP_PRODS=await fetchProducts();if(!SHOP_PRODS.length)return {ok:false};await buyProduct(SHOP_PRODS[0].id);return {pur:__DB.purchases.length,code:(__DB.purchases[0]||{}).code};");
      return { ok: buy.pur === 1 && /^MZ-/.test(buy.code || ''), detail: JSON.stringify(buy) };
    });

    journey('🧪 Bordes');
    await goal('Aprobar el mismo equipo 2 veces no duplica', async () => {
      await entrar('admin@t.mx'); const b = get("(leagueData().teams||[]).length"); await RA("await approveTeamIntoLeague('" + teamCode1 + "');"); await wait(100);
      return { ok: get("(leagueData().teams||[]).length") === b, detail: b + '->' + get("(leagueData().teams||[]).length") };
    });
    await goal('Buscar con caracteres raros no truena', async () => { const r = await getA("try{await searchEntities('a,b(c)%* ñ');return 'ok';}catch(e){return 'THREW:'+e.message;}"); return { ok: r === 'ok', detail: r }; });
    await goal('Correo duplicado se bloquea al registrarse', async () => { const r = await getA("var x=await sbClient().auth.signUp({email:'admin@t.mx',password:'x'});return x.error?'blocked':'allowed';"); return { ok: r === 'blocked', detail: r }; });
    await goal('Anotar sin jugador no truena (guarda defensiva)', async () => { const r = get("(function(){try{mT=0;mP=null;mScore(2);return 'ok';}catch(e){return 'THREW:'+e.message;}})()"); return { ok: r === 'ok', detail: r }; });

  } catch (e) { journey('FATAL'); await goal('excepción del viaje', async () => ({ ok: false, detail: e.message })); }

  let total = 0, pass = 0;
  console.log('\n========== RESUMEN POR PERSONA ==========');
  results.forEach(j => { console.log('\n' + j.p); j.goals.forEach(g => { total++; if (g.ok) pass++; }); });
  console.log('\nMETAS LOGRADAS: ' + pass + ' / ' + total);
  process.exit(pass === total ? 0 : 1);
})();
