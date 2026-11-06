/* ══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS · LAS CUENTAS Y LA TABLA DE LÍDERES
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 5 nov: «no olvides el sistema de cuentas para guardar las cartas y
   mantener la progresión y pon un leaderboard con los jugadores: uno de
   mayores victorias, otro de más dinero, otro de más derrotas, otro de más
   cartas».

   Lo que decide todo, y por qué:

   · UN APODO Y UN PIN, NADA MÁS. Lo van a jugar niños: ni correo, ni nombre
     real, ni teléfono. El apodo es lo único que sale en la tabla.
   · El PIN no se guarda: se guarda su huella (PBKDF2 con sal propia). Si
     alguien se lleva la base, no se lleva los PIN.
   · Cinco PIN malos seguidos y esa cuenta espera diez minutos: un PIN de 4
     números se adivina en una tarde si nadie frena.
   · La partida contra la máquina corre en el teléfono, así que las victorias
     que reporta el teléfono SON CREÍBLES, NO COMPROBADAS: alguien que sepa
     abrir las herramientas del navegador puede inflarse la tabla. Para un
     juego entre amigos se dice así y se acepta; lo que sí se frena aquí es lo
     absurdo (subir 500 victorias de golpe, monedas negativas).
   · Un solo Durable Object con SQLite para todas las cuentas: así la tabla de
     líderes es UNA consulta y no hay que juntar nada.
   ═════════════════════════════════════════════════════════════════════════ */

const MAX_DATOS = 200_000;            /* la colección completa pesa ~10 KB */
const ESPERA_PIN = 10 * 60 * 1000;
const TABLAS = {
  victorias: 'victorias', derrotas: 'derrotas', monedas: 'monedas', cartas: 'cartas', partidas: 'partidas',
};

const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
/* letras (con acentos), números, espacio, guion y guion bajo: lo que cabe en
   una tabla sin romperla y sin meter nada raro en la pantalla de otros */
const apodoBueno = (s) => typeof s === 'string' && /^[\p{L}\p{N} _-]{3,16}$/u.test(s.trim());
const pinBueno = (s) => typeof s === 'string' && /^\d{4,6}$/.test(s);

async function huella(pin, sal){
  const llave = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(sal), iterations: 60_000, hash: 'SHA-256' }, llave, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const azar = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
/* comparar huellas sin que el tiempo diga cuánto se parecen */
function iguales(a, b){ if(a.length !== b.length) return false; let d = 0; for(let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

/* Lo que se cuenta para la tabla sale de la colección, no de lo que diga el teléfono aparte. */
function numerosDe(datos){
  const st = datos && datos.stats || {};
  const ent = (x) => Math.max(0, Math.min(1e7, Math.floor(Number(x) || 0)));
  return {
    victorias: ent(st.victorias), derrotas: ent(st.derrotas), partidas: ent(st.partidas),
    monedas: ent(datos && datos.monedas),
    cartas: Object.values(datos && datos.cartas || {}).filter(n => n > 0).length,
  };
}

export class Cuentas {
  constructor(ctx, env){
    this.ctx = ctx; this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS cuentas(
      clave TEXT PRIMARY KEY, apodo TEXT, sal TEXT, huella TEXT, token TEXT,
      datos TEXT, rev INTEGER DEFAULT 0,
      victorias INTEGER DEFAULT 0, derrotas INTEGER DEFAULT 0, partidas INTEGER DEFAULT 0,
      monedas INTEGER DEFAULT 0, cartas INTEGER DEFAULT 0,
      malos INTEGER DEFAULT 0, esperaHasta INTEGER DEFAULT 0, creada INTEGER, tocada INTEGER)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS por_token ON cuentas(token)');
    /* VARIAS SESIONES POR CUENTA (5 nov): antes una entrada nueva cerraba la sesión vieja, y con la misma cuenta
       en dos teléfonos el primero se quedaba fuera sin saberlo: lo que ganaba ya no llegaba a la cuenta (Carlos:
       «no está entregando fichas»). Ahora cada teléfono trae su token; se guardan los 5 más recientes. */
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sesiones(token TEXT PRIMARY KEY, clave TEXT, t INTEGER)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS sesiones_por_clave ON sesiones(clave)');
    /* AMIGOS (Carlos, 5 nov: «sistema de amigos para poder retarlos más fácil»).
       Una fila por pareja, ordenada (a < b), con quién la pidió. Un reto es un
       código de sala que uno le manda a otro; vive 10 minutos. */
    this.sql.exec(`CREATE TABLE IF NOT EXISTS amigos(a TEXT, b TEXT, pidio TEXT, aceptada INTEGER DEFAULT 0, t INTEGER, PRIMARY KEY(a, b))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS retos(de TEXT, para TEXT, codigo TEXT, t INTEGER, PRIMARY KEY(de, para))`);
  }
  uno(q, ...a){ const r = [...this.sql.exec(q, ...a)]; return r[0] || null; }
  /* la cuenta dueña de un token: el de la tabla de sesiones, o el de antes (columna token) */
  deToken(token){
    if(typeof token !== 'string' || token.length !== 48) return null;
    const s = this.uno('SELECT clave FROM sesiones WHERE token = ?', token);
    return s ? this.uno('SELECT * FROM cuentas WHERE clave = ?', s.clave) : this.uno('SELECT * FROM cuentas WHERE token = ?', token);
  }
  abrirSesion(clave, token){
    this.sql.exec('INSERT OR REPLACE INTO sesiones(token, clave, t) VALUES(?,?,?)', token, clave, Date.now());
    const viejas = [...this.sql.exec('SELECT token FROM sesiones WHERE clave = ? ORDER BY t DESC LIMIT -1 OFFSET 5', clave)];
    for(const v of viejas) this.sql.exec('DELETE FROM sesiones WHERE token = ?', v.token);
  }

  async fetch(pedido){
    const url = new URL(pedido.url), ruta = url.pathname.replace(/^\/api\/puercos\//, '');
    const mal = (error, status = 400) => Response.json({ error }, { status });
    try{
      if(ruta === 'lideres' && pedido.method === 'GET'){
        const fuera = {};
        for(const [k, col] of Object.entries(TABLAS)){
          fuera[k] = [...this.sql.exec(`SELECT apodo, ${col} AS n FROM cuentas WHERE ${col} > 0 ORDER BY ${col} DESC, tocada ASC LIMIT 20`)]
            .map(r => ({ apodo: r.apodo, n: r.n }));
        }
        fuera.jugadores = this.uno('SELECT COUNT(*) AS n FROM cuentas').n;
        return Response.json(fuera, { headers: { 'Cache-Control': 'public, max-age=20' } });
      }
      if(pedido.method !== 'POST') return mal('No existe esa ruta.', 404);
      const cuerpo = await pedido.text();
      if(cuerpo.length > MAX_DATOS) return mal('Eso pesa demasiado.', 413);
      let d; try{ d = JSON.parse(cuerpo); }catch(e){ return mal('No entendí lo que mandaste.'); }

      if(ruta === 'cuenta/crear'){
        const apodo = String(d.apodo || '').trim().replace(/\s+/g, ' ');
        if(!apodoBueno(apodo)) return mal('El apodo va de 3 a 16 letras o números.');
        if(!pinBueno(d.pin)) return mal('El PIN son de 4 a 6 números.');
        const clave = normal(apodo);
        if(this.uno('SELECT clave FROM cuentas WHERE clave = ?', clave)) return mal('Ese apodo ya lo tiene alguien. Prueba otro.', 409);
        const sal = azar(), token = azar(24), ahora = Date.now();
        const datos = d.datos && typeof d.datos === 'object' ? d.datos : null;
        const n = numerosDe(datos);
        this.sql.exec(`INSERT INTO cuentas(clave, apodo, sal, huella, token, datos, rev, victorias, derrotas, partidas, monedas, cartas, creada, tocada)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, clave, apodo, sal, await huella(d.pin, sal), token,
          datos ? JSON.stringify(datos) : null, datos ? (datos.rev | 0) : 0, n.victorias, n.derrotas, n.partidas, n.monedas, n.cartas, ahora, ahora);
        this.abrirSesion(clave, token);
        return Response.json({ token, apodo, rev: datos ? (datos.rev | 0) : 0 });
      }

      if(ruta === 'cuenta/entrar'){
        const clave = normal(d.apodo);
        const c = clave && this.uno('SELECT * FROM cuentas WHERE clave = ?', clave);
        if(!c || !pinBueno(d.pin)) return mal('Ese apodo o ese PIN no coinciden.', 401);
        const ahora = Date.now();
        if(c.esperaHasta > ahora) return mal(`Demasiados intentos. Espera ${Math.ceil((c.esperaHasta - ahora) / 60000)} min.`, 429);
        if(!iguales(await huella(d.pin, c.sal), c.huella)){
          const malos = c.malos + 1;
          this.sql.exec('UPDATE cuentas SET malos = ?, esperaHasta = ? WHERE clave = ?', malos >= 5 ? 0 : malos, malos >= 5 ? ahora + ESPERA_PIN : 0, clave);
          return mal('Ese apodo o ese PIN no coinciden.', 401);
        }
        /* una entrada nueva abre OTRA sesión: los demás teléfonos de la cuenta siguen dentro (hasta 5) */
        const token = azar(24);
        this.sql.exec('UPDATE cuentas SET token = ?, malos = 0, esperaHasta = 0, tocada = ? WHERE clave = ?', token, ahora, clave);
        if(c.token && !this.uno('SELECT 1 AS x FROM sesiones WHERE token = ?', c.token)) this.abrirSesion(clave, c.token);   /* el teléfono de antes de este cambio no se queda fuera */
        this.abrirSesion(clave, token);
        return Response.json({ token, apodo: c.apodo, rev: c.rev, datos: c.datos ? JSON.parse(c.datos) : null });
      }

      /* ── amigos y retos: todo con tu sesión ── */
      if(ruta.startsWith('amigos') || ruta.startsWith('reto')){
        const yo = this.deToken(d.token);
        if(!yo) return mal('Tu sesión ya no sirve. Vuelve a entrar.', 401);
        const ahora = Date.now();
        this.sql.exec('UPDATE cuentas SET tocada = ? WHERE clave = ?', ahora, yo.clave);   /* «en línea» = te vimos hace poco */
        const par = (x, y) => x < y ? [x, y] : [y, x];
        const otra = (apodo) => { const k = normal(apodo); return k && this.uno('SELECT clave, apodo FROM cuentas WHERE clave = ?', k); };
        if(ruta === 'amigos'){
          this.sql.exec('DELETE FROM retos WHERE t < ?', ahora - 10 * 60 * 1000);
          const filas = [...this.sql.exec('SELECT * FROM amigos WHERE a = ? OR b = ?', yo.clave, yo.clave)];
          const apodoDe = (k) => this.uno('SELECT apodo, tocada, victorias FROM cuentas WHERE clave = ?', k);
          const amigos = [], piden = [], mandadas = [];
          for(const f of filas){
            const ella = f.a === yo.clave ? f.b : f.a, c = apodoDe(ella); if(!c) continue;
            if(f.aceptada) amigos.push({ apodo: c.apodo, enLinea: ahora - c.tocada < 2 * 60 * 1000, victorias: c.victorias });
            else if(f.pidio === yo.clave) mandadas.push(c.apodo); else piden.push(c.apodo);
          }
          const retos = [...this.sql.exec('SELECT de, codigo, t FROM retos WHERE para = ?', yo.clave)].map(r => ({ de: apodoDe(r.de)?.apodo, codigo: r.codigo, t: r.t })).filter(r => r.de);
          amigos.sort((x, y) => (y.enLinea - x.enLinea) || x.apodo.localeCompare(y.apodo));
          return Response.json({ amigos, piden, mandadas, retos });
        }
        const ella = otra(d.apodo);
        if(!ella) return mal('No hay nadie con ese apodo.', 404);
        if(ella.clave === yo.clave) return mal('Ése eres tú.');
        const [a, b] = par(yo.clave, ella.clave), fila = this.uno('SELECT * FROM amigos WHERE a = ? AND b = ?', a, b);
        if(ruta === 'amigos/pedir'){
          if(fila && fila.aceptada) return Response.json({ bien: true, ya: true });
          /* si la otra persona ya te lo había pedido, pedirlo de vuelta es aceptar */
          if(fila && fila.pidio === ella.clave){ this.sql.exec('UPDATE amigos SET aceptada = 1 WHERE a = ? AND b = ?', a, b); return Response.json({ bien: true, aceptada: true }); }
          const cuantas = this.uno('SELECT COUNT(*) AS n FROM amigos WHERE (a = ? OR b = ?)', yo.clave, yo.clave).n;
          if(cuantas >= 100) return mal('Ya tienes 100 amigos y solicitudes.');
          this.sql.exec('INSERT OR IGNORE INTO amigos(a, b, pidio, aceptada, t) VALUES(?,?,?,0,?)', a, b, yo.clave, ahora);
          return Response.json({ bien: true });
        }
        if(ruta === 'amigos/aceptar'){
          if(!fila || fila.pidio === yo.clave) return mal('No hay solicitud de esa persona.');
          this.sql.exec('UPDATE amigos SET aceptada = 1 WHERE a = ? AND b = ?', a, b);
          return Response.json({ bien: true });
        }
        if(ruta === 'amigos/quitar'){
          this.sql.exec('DELETE FROM amigos WHERE a = ? AND b = ?', a, b);
          this.sql.exec('DELETE FROM retos WHERE (de = ? AND para = ?) OR (de = ? AND para = ?)', yo.clave, ella.clave, ella.clave, yo.clave);
          return Response.json({ bien: true });
        }
        if(ruta === 'reto'){
          /* sólo se reta a un amigo: así nadie le manda retos a un desconocido */
          if(!fila || !fila.aceptada) return mal('Sólo puedes retar a tus amigos.');
          if(!/^[A-Z]{4}$/.test(String(d.codigo || ''))) return mal('Ese código de sala no sirve.');
          this.sql.exec('INSERT OR REPLACE INTO retos(de, para, codigo, t) VALUES(?,?,?,?)', yo.clave, ella.clave, d.codigo, ahora);
          return Response.json({ bien: true });
        }
        if(ruta === 'reto/borrar'){
          this.sql.exec('DELETE FROM retos WHERE (de = ? AND para = ?) OR (de = ? AND para = ?)', ella.clave, yo.clave, yo.clave, ella.clave);
          return Response.json({ bien: true });
        }
        return mal('No existe esa ruta.', 404);
      }

      if(ruta === 'cuenta/guardar'){
        const c = this.deToken(d.token);
        if(!c) return mal('Tu sesión ya no sirve. Vuelve a entrar.', 401);
        const datos = d.datos;
        if(!datos || typeof datos !== 'object') return mal('Faltan tus cartas.');
        const rev = datos.rev | 0;
        /* ⚠ EL NÚMERO DE CADA TELÉFONO NO SIRVE PARA COMPARAR: dos teléfonos con la misma cuenta llegaban los dos a
           «rev 5» y el segundo pisaba lo que el primero acababa de ganar. Ahora el teléfono dice DE QUÉ copia del
           servidor partió (`desde`); si mientras tanto alguien más guardó, se le regresa la del servidor para que
           las junte (cuenta.js · fusionar) y vuelva a subir. Los teléfonos viejos, sin `desde`, como antes. */
        const desde = Number.isInteger(d.desde) ? d.desde : null;
        if(desde !== null ? desde !== (c.rev | 0) : rev < c.rev) return Response.json({ viejo: true, rev: c.rev | 0, datos: c.datos ? JSON.parse(c.datos) : null });
        const nuevo = desde !== null ? (c.rev | 0) + 1 : rev; datos.rev = nuevo;
        const n = numerosDe(datos), antes = numerosDe(c.datos ? JSON.parse(c.datos) : null);
        /* lo absurdo se frena: nadie gana 200 partidas entre dos guardados */
        if(n.victorias - antes.victorias > 50 || n.derrotas - antes.derrotas > 50) return mal('Eso no cuadra.', 422);
        this.sql.exec(`UPDATE cuentas SET datos = ?, rev = ?, victorias = ?, derrotas = ?, partidas = ?, monedas = ?, cartas = ?, tocada = ? WHERE clave = ?`,
          JSON.stringify(datos), nuevo, n.victorias, n.derrotas, n.partidas, n.monedas, n.cartas, Date.now(), c.clave);
        return Response.json({ bien: true, rev: nuevo });
      }
      return mal('No existe esa ruta.', 404);
    }catch(e){
      return mal('Algo falló de este lado: ' + e.message, 500);
    }
  }
}
