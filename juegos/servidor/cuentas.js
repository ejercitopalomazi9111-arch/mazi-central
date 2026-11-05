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
  }
  uno(q, ...a){ const r = [...this.sql.exec(q, ...a)]; return r[0] || null; }

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
        /* una entrada nueva cierra la sesión vieja: el token anterior ya no sirve */
        const token = azar(24);
        this.sql.exec('UPDATE cuentas SET token = ?, malos = 0, esperaHasta = 0, tocada = ? WHERE clave = ?', token, ahora, clave);
        return Response.json({ token, apodo: c.apodo, rev: c.rev, datos: c.datos ? JSON.parse(c.datos) : null });
      }

      if(ruta === 'cuenta/guardar'){
        const c = typeof d.token === 'string' && d.token.length === 48 && this.uno('SELECT * FROM cuentas WHERE token = ?', d.token);
        if(!c) return mal('Tu sesión ya no sirve. Vuelve a entrar.', 401);
        const datos = d.datos;
        if(!datos || typeof datos !== 'object') return mal('Faltan tus cartas.');
        const rev = datos.rev | 0;
        /* gana la copia más nueva; si la del servidor es más nueva, se le
           regresa al teléfono para que se la ponga */
        if(rev < c.rev) return Response.json({ viejo: true, rev: c.rev, datos: c.datos ? JSON.parse(c.datos) : null });
        const n = numerosDe(datos), antes = numerosDe(c.datos ? JSON.parse(c.datos) : null);
        /* lo absurdo se frena: nadie gana 200 partidas entre dos guardados */
        if(n.victorias - antes.victorias > 50 || n.derrotas - antes.derrotas > 50) return mal('Eso no cuadra.', 422);
        this.sql.exec(`UPDATE cuentas SET datos = ?, rev = ?, victorias = ?, derrotas = ?, partidas = ?, monedas = ?, cartas = ?, tocada = ? WHERE clave = ?`,
          JSON.stringify(datos), rev, n.victorias, n.derrotas, n.partidas, n.monedas, n.cartas, Date.now(), c.clave);
        return Response.json({ bien: true, rev });
      }
      return mal('No existe esa ruta.', 404);
    }catch(e){
      return mal('Algo falló de este lado: ' + e.message, 500);
    }
  }
}
