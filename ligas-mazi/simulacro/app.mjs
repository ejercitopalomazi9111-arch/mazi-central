/* ============================================================================
   app.mjs — EL PUENTE: meter la temporada a la APP DE VERDAD
   ----------------------------------------------------------------------------
   `mundo.mjs` decide qué pasó en el torneo. Aquí se le entrega a la app real —
   la misma `index.html` que abre Carlos en su teléfono— y se comprueba que la
   app lo CUENTE bien. Ahí es donde salen los bugs.

   Cada persona del reparto se sienta frente a la app con SU identidad y camina
   las pantallas que le tocan por su rol. El inspector mira cada pantalla y
   anota lo que esté mal.

   ── UNA SOLA PESTAÑA, TODAS LAS PERSONAS ─────────────────────────────────
   Son 570 personas por unas diez pantallas cada una. Abrir un navegador por
   persona tardaría horas; hasta un viaje de ida y vuelta a Node por pantalla
   son ~5,700 viajes. Así que el recorrido corre DENTRO de la página, por
   tandas, y regresa los hallazgos ya juntos.

   ── LO QUE ESTO NO ES ────────────────────────────────────────────────────
   No es una prueba de la nube. Corre en modo local (sin Supabase), que es
   justamente el modo en que la app tiene que aguantar sola.
   ==========================================================================*/

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

/* El mismo Chromium de `captura.mjs`: ya viene en la caja, no se baja otro. */
const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PUPPETEER = '/home/user/mazi-central/herramientas/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

/* El rol interno de la app se llama distinto que el del reparto. Se traduce
   una sola vez, para que un cambio de nombres allá no rompa esto. */
const ROL_APP = { liga:'admin_liga', coach:'dueno', papa:'padre', jugador:'jugador',
                  publico:'aficionado', mesa:'mesa' };

/* Qué pantallas camina cada quien. No es una lista de deseos: es lo que esa
   persona de verdad abriría. El visitante nunca entra al vestidor. */
const RECORRIDO = {
  liga:    ['liga','perillas','mesa','tabla','bracket','tienda','directorio','marcador','alta','logros','inbox','responsivas','preview'],
  coach:   ['vestidor','estrategias','carta','tabla','marcador','tienda','gacha','logros','preview'],
  papa:    ['rol','carta','alta','tabla','marcador','tienda','gacha','publico','logros'],
  jugador: ['carta','tabla','marcador','gacha','tienda','logros','publico'],
  publico: ['publico','marcador','tabla','ligas','directorio','tienda','gacha','bracket','logros'],
  mesa:    ['mesa','marcador','tabla','publico'],
};

/* ══════════════════════════════════════════════════════════════════════════
   TRADUCIR la temporada al formato que la app guarda en el teléfono.
   La app no sabe nada de `mundo.mjs`: lee `lm_league` y `lm_user`. Traducir
   aquí —y no cambiar la app para que entienda el simulacro— es a propósito:
   si la prueba obliga a modificar lo que prueba, deja de probar nada.
   ══════════════════════════════════════════════════════════════════════════ */
const COLORES = ['--papa','--publico','--jugador','--liga','--coach','--mesa'];
const ini = (s) => (s || '?').split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();

export function traducirLiga(liga, adminEmail){
  const teams = liga.equipos.map((e, i) => ({
    id: e.id, code: 'E-' + e.id, name: e.nombre, ini: ini(e.nombre),
    color: COLORES[i % COLORES.length], categoria: e.categoria,
    players: e.jugadores.map(jid => {
      const j = liga.jugadores[jid];
      return { code: 'J-' + jid, num: String(j.dorsal), nm: j.nombre,
               pos: e.alineacion[jid] || j.pos,
               ppp: (j.temporada.pj ? (j.temporada.pts / j.temporada.pj) : 0).toFixed(1) };
    }),
  }));
  const calendar = liga.calendario.map(p => ({
    jornada: p.jornada, home: p.local, away: p.visita,
    hs: p.marcador ? p.marcador[0] : null, as: p.marcador ? p.marcador[1] : null,
    done: p.estado === 'jugado',
    date: fecha(p.jornada), time: p.hora, place: p.lugar, mesa: '',
  }));
  return { name: liga.nombre, code: 'L-SIM', owner: adminEmail, admins: [adminEmail],
           teams, calendar, link: '' };
}
function fecha(jornada){
  const d = new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate() + (jornada - 1) * 7);
  return d.toISOString().slice(0, 10);
}

/* El `lm_user` de cada persona, con lo que su rol necesita para que sus
   pantallas tengan datos. Un coach sin equipo ve un vestidor vacío, y ese
   "vacío" sería un falso hallazgo, no un bug. */
export function traducirPersona(p, liga, appLiga){
  const u = { name: p.nombre, email: p.email, role: ROL_APP[p.rol] || 'aficionado',
              roles: [ROL_APP[p.rol] || 'aficionado'], onboarded: 1 };
  if (p.rol === 'coach'){
    const t = appLiga.teams.find(t => t.id === p.equipo);
    if (t) u.team = { ...t, status: 'enliga' };
    u.coachTeam = u.team;
    u.league = { name: liga.nombre, code: appLiga.code };
  }
  if (p.rol === 'liga'){ u.roles = ['admin_liga']; u.league = { name: liga.nombre, code: appLiga.code }; }
  if (p.rol === 'jugador'){
    const j = liga.jugadores[p.id];
    u.num = String(j?.dorsal || 0); u.pos = j?.pos || 'Base';
    u.playerCode = 'J-' + p.id; u.playerStatus = 'enequipo';
    const t = appLiga.teams.find(t => t.id === p.equipo);
    if (t) u.playerTeamCode = t.code;
  }
  if (p.rol === 'papa'){
    u.children = (p.hijos || []).map(hid => {
      const j = liga.jugadores[hid];
      return { code:'J-'+hid, name: j?.nombre || 'Hij@', num: String(j?.dorsal || 0),
               pos: j?.pos || 'Base', curp: j?.curp, minor: (j?.edad || 0) < 18,
               age: j?.edad, status:'enequipo' };
    });
    if (u.children[0]) u.child = u.children[0].name;
  }
  return u;
}

/* ══════════════════════════════════════════════════════════════════════════
   ABRIR LA APP y dejar el inspector adentro.
   ══════════════════════════════════════════════════════════════════════════ */
export async function abrirApp({ url, ancho = 390, alto = 844 } = {}){
  const puppeteer = (await import(PUPPETEER)).default;
  const navegador = await puppeteer.launch({ headless: 'new', executablePath: CHROMIUM,
    args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: ancho, height: alto, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

  const errores = [];
  pagina.on('pageerror', e => errores.push('EXCEPCIÓN: ' + e.message));
  pagina.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/ERR_CONNECTION|Failed to load resource|net::/.test(t)) return;  // sin nube, es esperado
    errores.push(t);
  });

  await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise(r => setTimeout(r, 1500));
  await pagina.evaluate(readFileSync(resolve(AQUI, 'inspector.js'), 'utf8'));
  await pagina.evaluate(`INSPECTOR.configurar({ pantallas:'.screen', activa:'on',
    ignorar:['.banner','.fullbg','#courtbg'] })`);

  return { navegador, pagina, errores };
}

/* ══════════════════════════════════════════════════════════════════════════
   EL RECORRIDO: cada persona, con su identidad, camina sus pantallas.
   ══════════════════════════════════════════════════════════════════════════ */
export async function recorrerTodos({ pagina, personas, liga, appLiga, alAvanzar = null }){
  const TANDA = 40;
  let hallazgos = [], visitadas = 0;
  const profundasHechas = {};

  for (let i = 0; i < personas.length; i += TANDA){
    const tanda = personas.slice(i, i + TANDA).map(p => {
      const primeroDeSuRol = !profundasHechas[p.rol];
      profundasHechas[p.rol] = true;
      return {
        id: p.id, rol: p.rol, nombre: p.nombre,
        user: traducirPersona(p, liga, appLiga),
        pantallas: RECORRIDO[p.rol] || RECORRIDO.publico,
        profundo: primeroDeSuRol,
      };
    });

    const r = await pagina.evaluate((tanda, ligaJSON) => {
      const out = []; let vistas = 0;
      tanda.forEach(per => {
        try {
          // Se sienta con su identidad. Nada de recargar: la app lee
          // localStorage en cada render, que es exactamente lo que hace cuando
          // alguien cierra sesión y entra otro en el mismo teléfono.
          localStorage.setItem('lm_user', JSON.stringify(per.user));
          localStorage.setItem('lm_league', ligaJSON);
          if (typeof guardarCuentaLocal === 'function')
            guardarCuentaLocal(per.user.email, 'prueba1234');
          applyRoleFromUser();
        } catch (e){
          out.push({ persona: per.id, rol: per.rol, pantalla:'(entrar)', tipo:'excepcion',
            gravedad:'grave', que:'No pudo tomar su identidad: ' + e.message, donde:'' });
          return;
        }
        const pasos = per.pantallas.map(id => ({ nombre: id, ir: () => go(id) }));
        let h = [];
        try { h = INSPECTOR.recorrer(pasos, per.profundo); }
        catch (e){ h = [{ pantalla:'(recorrido)', tipo:'excepcion', gravedad:'grave',
          que: e.message, donde:'' }]; }
        vistas += pasos.length;
        h.forEach(x => out.push(Object.assign({}, x, { persona: per.id, rol: per.rol })));
      });
      return { out, vistas };
    }, tanda, JSON.stringify(appLiga));

    hallazgos = hallazgos.concat(r.out);
    visitadas += r.vistas;
    if (alAvanzar) alAvanzar({ hechas: Math.min(i + TANDA, personas.length),
      total: personas.length, visitadas, hallazgos: hallazgos.length });
  }
  return { hallazgos, visitadas };
}

/* ══════════════════════════════════════════════════════════════════════════
   JUNTAR LOS HALLAZGOS
   570 personas encuentran el MISMO botón chico 570 veces. Un reporte con 570
   renglones idénticos no se lee, y lo que no se lee no se arregla. Se agrupan
   por qué es y dónde está, y se cuenta a cuánta gente le pasó — que además es
   el dato que dice qué tan urgente es.
   ══════════════════════════════════════════════════════════════════════════ */
export function juntar(hallazgos){
  const mapa = new Map();
  hallazgos.forEach(h => {
    const llave = [h.tipo, h.pantalla, h.donde, h.que].join('|');
    const y = mapa.get(llave);
    if (y){ y.veces++; y.roles.add(h.rol); }
    else mapa.set(llave, Object.assign({}, h, { veces: 1, roles: new Set([h.rol]) }));
  });
  const orden = { grave: 0, medio: 1, leve: 2 };
  return [...mapa.values()]
    .map(h => Object.assign({}, h, { roles: [...h.roles].sort() }))
    .sort((a, b) => (orden[a.gravedad] - orden[b.gravedad]) || (b.veces - a.veces));
}
