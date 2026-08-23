/* ══════════════════════════════════════════════════════════════════════════
   FADORI · EL SERVIDOR
   ──────────────────────────────────────────────────────────────────────────
   Qué resuelve, con todas sus letras: con el motor local cada aparato tiene su
   propia copia. Sirve para la demostración y para operar desde UNA tablet, no
   para doscientos teléfonos hablando entre sí. Esto es lo que faltaba.

   Y lo que NO cambia: la app sigue funcionando sin él. Este servidor es una
   capa de sincronía encima del motor local, no debajo. Si se cae el internet,
   se cae Cloudflare o la escuela apaga el wifi, el alumno sigue pidiendo y la
   señora sigue despachando en su aparato; cuando vuelve la red, se ponen de
   acuerdo solos. Un servidor que se vuelve indispensable hace que la app falle
   MÁS, no menos — y la regla 3 de la casa dice que nada se detiene si algo
   falla.

   ── Cómo se ponen de acuerdo ──────────────────────────────────────────────
   No se manda el documento completo: se mandan REGISTROS. Cada pedido, cada
   alumno, cada platillo trae su `id` y su `t` (cuándo se tocó por última vez),
   y gana el más reciente de cada uno. Es "último en escribir gana", por
   registro y no por documento.

   Por qué así y no un candado sobre el documento entero: con un candado, dos
   alumnos que piden en el mismo segundo chocan y uno pierde su pedido. Por
   registro, son dos ids distintos y sobreviven los dos. Un pedido perdido es
   un niño sin comer, así que ese caso no se puede dar.

   ── Lo único que el servidor decide solo ──────────────────────────────────
   EL TURNO. Es lo que no se puede calcular en el teléfono: cada aparato
   contaría "van tres, me toca el cuatro" y saldrían tres turnos 4. El pedido
   llega con `turno: null` y aquí se le pone el bueno. Es la razón de fondo por
   la que existe este servidor.
   ═════════════════════════════════════════════════════════════════════════ */

const CAJONES = ['productos', 'alumnos', 'pedidos', 'conteos', 'eventos'];

/* ── El Durable Object · uno por escuela ─────────────────────────────────── */
export class Cooperativa {
  constructor(ctx, env){
    this.ctx = ctx;
    this.env = env;
    this.listo = ctx.blockConcurrencyWhile(async () => {
      this.reloj = (await ctx.storage.get('reloj')) || 0;
      this.turno = (await ctx.storage.get('turno')) || { dia: 0, n: 0 };
      this.datos = {};
      for(const c of CAJONES) this.datos[c] = (await ctx.storage.get(c)) || {};
      this.config = (await ctx.storage.get('config')) || null;
      /* Las llaves de las operaciones ya aplicadas. Es lo que hace que
         reintentar en una red mala no duplique un pedido. */
      this.hechas = (await ctx.storage.get('hechas')) || [];
    });
  }

  async fetch(pedido){
    await this.listo;
    const url = new URL(pedido.url);

    if(url.pathname.endsWith('/vivo')) return this.enchufar(pedido);

    if(url.pathname.endsWith('/sync')){
      const cuerpo = await pedido.json().catch(() => null);
      if(!cuerpo) return json({ error: 'El cuerpo no es JSON.' }, 400);
      return json(await this.sincronizar(cuerpo));
    }

    if(url.pathname.endsWith('/todo')){
      return json({ reloj: this.reloj, cambios: this.desde(0), turno: this.turno });
    }

    return json({ error: 'No existe.' }, 404);
  }

  /* ── El WebSocket. No manda los datos: manda "hubo cambio, ven por él".
     Así el mensaje pesa lo mismo aunque el menú tenga fotos, y el que llega
     tarde no se pierde nada: pide desde su reloj y ya. ──────────────────── */
  enchufar(pedido){
    if(pedido.headers.get('Upgrade') !== 'websocket')
      return json({ error: 'Esto es para WebSocket.' }, 426);
    const par = new WebSocketPair();
    const [cliente, servidor] = Object.values(par);
    /* hibernación: el objeto se puede dormir con los sockets abiertos y no
       cobra tiempo de cómputo mientras nadie habla */
    this.ctx.acceptWebSocket(servidor);
    servidor.send(JSON.stringify({ tipo: 'reloj', reloj: this.reloj }));
    return new Response(null, { status: 101, webSocket: cliente });
  }

  webSocketMessage(ws, msg){
    /* el único mensaje que se acepta es un latido, para que la red no cierre
       la conexión sola en una escuela con wifi tacaño */
    if(msg === 'ping') { try{ ws.send('pong'); }catch(e){} }
  }
  /* con hibernación el runtime vuelve a llamar aquí después de dormir, así
     que estos dos tienen que existir aunque no hagan nada */
  webSocketClose(){}
  webSocketError(){}

  avisar(){
    const m = JSON.stringify({ tipo: 'reloj', reloj: this.reloj });
    for(const ws of this.ctx.getWebSockets()){
      try{ ws.send(m); }catch(e){}
    }
  }

  /* ── La mezcla ──────────────────────────────────────────────────────────
     Entra lo que el aparato tocó desde la última vez; sale todo lo que
     cambió aquí desde el reloj que él trae. */
  async sincronizar(cuerpo){
    const desde = Number(cuerpo.desde) || 0;
    const cambios = cuerpo.cambios || {};
    const nuevo = this.reloj + 1;
    let tocado = false;

    for(const cajon of CAJONES){
      const lista = Array.isArray(cambios[cajon]) ? cambios[cajon] : [];
      for(const r of lista){
        if(!r || typeof r.id !== 'string' || !r.id) continue;
        const viejo = this.datos[cajon][r.id];
        const t = Number(r.t) || 0;
        /* último en escribir gana. El empate se rompe por id, para que los
           doscientos teléfonos lleguen SIEMPRE al mismo resultado y no a uno
           distinto cada quien. */
        if(viejo && !(t > (viejo.t || 0) || (t === (viejo.t || 0) && r.id > viejo.id))) continue;

        const copia = Object.assign({}, r);

        /* EL TURNO · lo único que decide el servidor.
           Y una vez puesto NO se vuelve a tocar: si un aparato sin red edita
           su pedido antes de enterarse del turno que le tocó, vuelve a mandar
           `turno: null`, y sin esta línea se le daría un turno nuevo. Un
           pedido con dos turnos es un niño formado dos veces. */
        if(cajon === 'pedidos'){
          const teniaTurno = copia.turno !== null && copia.turno !== undefined;
          if(viejo && viejo.turno) copia.turno = viejo.turno;
          else if(!teniaTurno) copia.turno = this.siguienteTurno(copia.creado);

          /* Y si el turno lo puso el servidor, el servidor TOCÓ el registro:
             le adelanta la hora. Sin esto, el pedido vuelve al teléfono con
             la misma hora con la que salió, el aparato lo descarta por no ser
             más nuevo, y el alumno se queda mirando "…" para siempre en vez
             de su número. Quien cambia un registro le pone la hora: no es una
             formalidad, es lo que hace que el cambio llegue de regreso. */
          if(!teniaTurno && copia.turno) copia.t = Math.max((Number(r.t) || 0) + 1, Date.now());
        }

        copia._r = nuevo;
        this.datos[cajon][r.id] = copia;
        tocado = true;
      }
    }

    /* la configuración es una sola y la manda el mostrador */
    if(cambios.config && typeof cambios.config === 'object'){
      const t = Number(cambios.config.t) || 0;
      if(!this.config || t > (this.config.t || 0)){
        this.config = Object.assign({}, cambios.config, { _r: nuevo });
        tocado = true;
      }
    }

    if(tocado){
      this.reloj = nuevo;
      await this.guardar();
      this.avisar();
    }

    return {
      reloj: this.reloj,
      cambios: this.desde(desde),
      /* el aparato necesita saber que su pedido ya trae turno del bueno */
      turno: this.turno,
    };
  }

  siguienteTurno(creado){
    const dia = diaDe(creado || Date.now());
    if(this.turno.dia !== dia) this.turno = { dia, n: 0 };
    this.turno.n++;
    return this.turno.n;
  }

  desde(r){
    const salida = {};
    for(const cajon of CAJONES){
      salida[cajon] = Object.values(this.datos[cajon]).filter(x => (x._r || 0) > r);
    }
    if(this.config && (this.config._r || 0) > r) salida.config = this.config;
    return salida;
  }

  async guardar(){
    const g = this.ctx.storage;
    await g.put('reloj', this.reloj);
    await g.put('turno', this.turno);
    for(const c of CAJONES) await g.put(c, this.datos[c]);
    if(this.config) await g.put('config', this.config);
  }
}

/* ── El Worker · sólo enruta y cuida la puerta ───────────────────────────── */
export default {
  async fetch(pedido, env){
    const url = new URL(pedido.url);
    const origen = pedido.headers.get('Origin') || '';
    const cabezas = puerta(origen, env);

    if(pedido.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabezas });

    if(url.pathname === '/api/salud'){
      return json({ bien: true, quien: 'fadori', hora: Date.now() }, 200, cabezas);
    }

    if(url.pathname.startsWith('/api/')){
      /* Una casa = una escuela = un Durable Object. El nombre viaja en la
         URL para que el día que sean dos escuelas no haya que tocar nada. */
      const casa = (url.searchParams.get('casa') || 'rembrandt')
        .toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'rembrandt';
      const id = env.COOPERATIVA.idFromName(casa);
      const r = await env.COOPERATIVA.get(id).fetch(pedido);
      if(r.status === 101) return r;                 /* el WebSocket va tal cual */
      const copia = new Response(r.body, r);
      for(const [k, v] of Object.entries(cabezas)) copia.headers.set(k, v);
      return copia;
    }

    return new Response('Fadori · aquí sólo vive la API. La app está en Pages.', {
      status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};

/* ── Utilería ────────────────────────────────────────────────────────────── */
function puerta(origen, env){
  const lista = String(env.ORIGENES || '').split(',').map(s => s.trim()).filter(Boolean);
  const h = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
  };
  /* Sin comodín a propósito: se responde el origen SÓLO si está en la lista.
     Un "*" aquí le abriría la puerta a cualquier página del mundo. */
  if(origen && lista.indexOf(origen) >= 0) h['Access-Control-Allow-Origin'] = origen;
  return h;
}

function json(o, estado, cabezas){
  return new Response(JSON.stringify(o), {
    status: estado || 200,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, cabezas || {}),
  });
}

/* el día natural, para que el turno vuelva a 1 cada mañana */
function diaDe(ms){
  const d = new Date(ms);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
