/* ══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS · LAS SALAS
   ──────────────────────────────────────────────────────────────────────────
   Un Durable Object por sala. Es lo que hace posible que dos primos jueguen
   desde dos casas: un solo lugar que sabe cuál es la partida de verdad.

   ── Lo que decide todo, y por qué ─────────────────────────────────────────
   EL SERVIDOR MANDA. La partida vive aquí, no en los teléfonos, y aquí se
   usan LAS MISMAS reglas de `motor.js` que usa la pantalla. Dos razones, y
   las dos importan:

   1. No se puede hacer trampa. Un teléfono podría mandar «jugué un 100» y
      aquí se revisa contra su mano de verdad y se rechaza. Si la partida
      viviera en los teléfonos, el que supiera abrir las herramientas del
      navegador ganaría siempre. Es un juego entre un niño y sus amigos, y
      eso es exactamente donde alguien lo va a intentar.

   2. NADIE VE LA MANO DEL OTRO. A cada quien se le manda SÓLO su vista: sus
      cartas, y del rival nada más los PV y CUÁNTAS cartas trae. La mano del
      rival no sale de aquí, así que no está en la página del otro ni aunque
      la abra y la lea. Es la misma razón por la que el modo de dos en un
      teléfono lleva cortina.

   ── Lo que este servidor NO tiene ─────────────────────────────────────────
   No hay cuentas ni contraseñas. Quien sepa el código de 4 letras de una sala
   puede entrar a esa sala mientras haya lugar. Para un juego de cartas entre
   primos está bien y hay que decirlo así, sin adornarlo: no es seguridad, es
   un código de sala. Lo que sí está protegido es la mano de cada quien, que
   es lo único que rompería el juego.
   ═════════════════════════════════════════════════════════════════════════ */
import * as MOTOR from './motor-servidor.js';

/* Media hora sin que nadie hable y la sala se olvida. Sin esto, cada partida
   abandonada se queda guardada para siempre. */
const OLVIDO = 30 * 60 * 1000;

export class Sala {
  constructor(ctx, env){
    this.ctx = ctx;
    this.env = env;
    this.vivos = new Map();   /* socket → asiento */
    this.listo = ctx.blockConcurrencyWhile(async () => {
      this.J        = await ctx.storage.get('J')        || null;
      this.secretos = await ctx.storage.get('secretos') || { a:null, b:null };
      this.pendiente= await ctx.storage.get('pendiente')|| { a:null, b:null };
      this.tocada   = await ctx.storage.get('tocada')   || Date.now();
    });
  }

  async guardar(){
    this.tocada = Date.now();
    await this.ctx.storage.put({ J:this.J, secretos:this.secretos,
                                 pendiente:this.pendiente, tocada:this.tocada });
  }

  async fetch(pedido){
    await this.listo;
    const url = new URL(pedido.url);

    /* Si la sala llevaba mucho sola, se empieza de cero en vez de meter a
       alguien nuevo a una partida de hace tres semanas. */
    if(this.J && Date.now() - this.tocada > OLVIDO){
      this.J = null; this.secretos = { a:null, b:null }; this.pendiente = { a:null, b:null };
    }

    if(pedido.headers.get('Upgrade') !== 'websocket'){
      return new Response(JSON.stringify({
        existe: !!this.J, lugares: this.lugaresLibres(),
      }), { headers:{ 'content-type':'application/json' } });
    }

    const par = new WebSocketPair();
    const [cliente, servidor] = Object.values(par);
    servidor.accept();
    this.enchufar(servidor, url.searchParams.get('secreto'));
    return new Response(null, { status:101, webSocket:cliente });
  }

  lugaresLibres(){
    const ocupados = new Set([...this.vivos.values()]);
    return ['a','b'].filter(x => !ocupados.has(x)).length;
  }

  enchufar(ws, secretoDado){
    /* Sentar a alguien. Primero se le devuelve SU asiento si trae el secreto
       de una sesión anterior: en un teléfono, salir de la app y volver es lo
       más normal del mundo, y perder el asiento por eso sería perder la
       partida. */
    let asiento = null;
    if(secretoDado){
      for(const s of ['a','b']) if(this.secretos[s] === secretoDado) asiento = s;
      /* Si ya hay otro socket sentado ahí, se le corta al viejo: es la misma
         persona que volvió, no dos. */
      if(asiento) for(const [otro, a] of this.vivos) if(a === asiento){
        try{ otro.close(4000, 'te reconectaste desde otro lado'); }catch(e){}
        this.vivos.delete(otro);
      }
    }
    if(!asiento){
      const ocupados = new Set([...this.vivos.values()]);
      asiento = ['a','b'].find(x => !ocupados.has(x)) || null;
      if(!asiento){
        ws.send(JSON.stringify({ tipo:'lleno',
          porque:'Esta sala ya tiene dos jugadores. Pide otro código.' }));
        try{ ws.close(4001, 'llena'); }catch(e){}
        return;
      }
      this.secretos[asiento] = crypto.randomUUID();
    }

    this.vivos.set(ws, asiento);
    ws.send(JSON.stringify({ tipo:'sentado', asiento, secreto:this.secretos[asiento] }));

    ws.addEventListener('message', (ev) => this.oir(ws, ev).catch(err => {
      try{ ws.send(JSON.stringify({ tipo:'error', porque:String(err.message || err) })); }catch(e){}
    }));
    const salir = () => { this.vivos.delete(ws); this.avisarATodos(); };
    ws.addEventListener('close', salir);
    ws.addEventListener('error', salir);

    this.arrancarSiSeLlenó();
    this.avisarATodos();
  }

  arrancarSiSeLlenó(){
    const sentados = new Set([...this.vivos.values()]);
    if(sentados.size === 2 && !this.J){
      /* La semilla la pone el servidor. Si la pusiera un teléfono, ese
         teléfono sabría el mazo entero antes de empezar. */
      this.J = MOTOR.repartir((crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0);
      this.pendiente = { a:null, b:null };
      this.guardar();
    }
  }

  /* ── LA VISTA · lo único que sale de aquí hacia un teléfono ──────────────
     Del rival van los PV y CUÁNTAS cartas trae. Sus cartas NO. */
  vista(asiento){
    const sentados = new Set([...this.vivos.values()]);
    const base = { asiento, esperando: sentados.size < 2, listo: !!this.J,
                   yaJugue: !!this.pendiente[asiento],
                   rivalYaJugo: !!this.pendiente[asiento === 'a' ? 'b' : 'a'] };
    if(!this.J) return base;
    const yo = this.J[asiento], otro = this.J[asiento === 'a' ? 'b' : 'a'];
    return Object.assign(base, {
      ronda: this.J.ronda, acabo: this.J.acabo, porCartas: !!this.J.porCartas,
      mazo: this.J.mazo.length,
      yo:    { pv: yo.pv, mano: yo.mano, combosUsados: yo.combosUsados,
               especiales: yo.especiales },
      rival: { pv: otro.pv, cartas: otro.mano.length, combosUsados: otro.combosUsados,
               especiales: otro.especiales },
    });
  }

  avisarATodos(extra){
    for(const [ws, asiento] of this.vivos){
      const m = { tipo:'estado', vista: this.vista(asiento) };
      if(extra) m.ronda = extra;
      try{ ws.send(JSON.stringify(m)); }catch(e){}
    }
  }

  async oir(ws, ev){
    const asiento = this.vivos.get(ws);
    if(!asiento) return;
    const m = JSON.parse(ev.data);

    if(m.tipo === 'otra'){
      /* Revancha. Sólo se vale cuando la partida ya acabó. */
      if(this.J && this.J.acabo){
        this.J = MOTOR.repartir((crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0);
        this.pendiente = { a:null, b:null };
        await this.guardar(); this.avisarATodos();
      }
      return;
    }

    if(m.tipo !== 'jugada') return;
    if(!this.J || this.J.acabo) throw new Error('No hay partida en curso.');
    if(this.pendiente[asiento]) throw new Error('Ya jugaste esta ronda.');

    /* AQUÍ ESTÁ LO QUE IMPIDE LA TRAMPA. El teléfono manda IDS de cartas, no
       cartas: los valores se buscan en la mano que tiene el servidor. Si
       manda un id que no es suyo, no aparece y se rechaza. */
    const mano = this.J[asiento].mano;
    const cartas = (m.cartas || []).map(id => mano.find(c => c.id === id)).filter(Boolean);
    if(cartas.length !== (m.cartas || []).length) throw new Error('Esa carta no es tuya.');

    const jugada = { cartas, especial: m.especial || null };
    const mal = MOTOR.porQueNoSeVale(jugada, this.J[asiento]);
    if(mal) throw new Error(mal);

    this.pendiente[asiento] = jugada;

    const otro = asiento === 'a' ? 'b' : 'a';
    if(!this.pendiente[otro]){
      await this.guardar();
      this.avisarATodos();          /* «ya jugaste, falta el otro» */
      return;
    }

    /* Los dos jugaron: se resuelve la ronda con las mismas reglas de siempre
       y HASTA ESE MOMENTO se revelan las cartas del otro. */
    const jA = this.pendiente.a, jB = this.pendiente.b;
    this.J = MOTOR.jugarRonda(this.J, jA, jB);
    this.pendiente = { a:null, b:null };
    await this.guardar();
    this.avisarATodos({ a:jA, b:jB, h:this.J.historia[this.J.historia.length - 1] });
  }
}
