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

/* Las ventajas de líder que no piden escoger: las mismas que mesa.js · aplicarPasiva (6 nov) */
const LIDERES_PASIVOS = new Set(['rey', 'general', 'espartano', 'emperador', 'presidente']);
function pasiva(j, id){
  if(!j || !id) return;
  if(id === 'rey') j.pv += 10;
  if(id === 'espartano'){ j.pv += 5; const k = j.mano.findIndex(c => c.nivel !== 'ESP'); if(k >= 0) j.mazo.unshift(j.mano.splice(k, 1)[0]); }
  if(id === 'general'){ const k = j.mazo.map(c => c.nivel !== 'ESP').lastIndexOf(true); if(k >= 0) j.mano.push(j.mazo.splice(k, 1)[0]); }
  if(id === 'emperador'){ const k = j.mazo.findIndex(c => c.nivel === 'ESP' && c.esp === 'bono'); j.mano.push(k >= 0 ? j.mazo.splice(k, 1)[0] : { id: 'lider-bono', valor: 0, nivel: 'ESP', esp: 'bono' }); }
  if(id === 'presidente') j.combosUsados = (j.combosUsados | 0) - 1;
}

export class Sala {
  constructor(ctx, env){
    this.ctx = ctx;
    this.env = env;
    this.vivos = new Map();   /* socket → asiento */
    this.listo = ctx.blockConcurrencyWhile(async () => {
      this.J        = await ctx.storage.get('J')        || null;
      this.secretos = await ctx.storage.get('secretos') || { a:null, b:null };
      this.pendiente= await ctx.storage.get('pendiente')|| { a:null, b:null };
      /* Con qué colección juega cada asiento. Se guarda en disco y no sólo en
         memoria porque el Durable Object se duerme entre rondas: si viviera en
         memoria, la revancha repartiría con la baraja de siempre y nadie
         sabría por qué su mazo cambió a media sesión. */
      this.mazos    = await ctx.storage.get('mazos')    || { a:null, b:null };
      this.tocada   = await ctx.storage.get('tocada')   || Date.now();
      /* Puercos 2 juega con 80 de vida (Carlos, 5 nov); la v1 no manda `pv`
         y sigue con los 200 del reglamento. Y el apodo y avatar de cada
         asiento, para que el otro sepa contra quién juega. */
      this.pvMesa   = await ctx.storage.get('pvMesa')   || null;
      this.quien    = await ctx.storage.get('quien')    || { a:null, b:null };
      /* el puerco líder de cada asiento (6 nov): sus ventajas que no piden escoger se aplican al repartir */
      this.lideres  = await ctx.storage.get('lideres')  || { a:null, b:null };
    });
  }

  async guardar(){
    this.tocada = Date.now();
    await this.ctx.storage.put({ J:this.J, secretos:this.secretos,
                                 pendiente:this.pendiente, mazos:this.mazos,
                                 tocada:this.tocada, pvMesa:this.pvMesa, quien:this.quien, lideres:this.lideres });
  }

  async fetch(pedido){
    await this.listo;
    const url = new URL(pedido.url);

    /* Si la sala llevaba mucho sola, se empieza de cero en vez de meter a
       alguien nuevo a una partida de hace tres semanas. */
    if(this.J && Date.now() - this.tocada > OLVIDO){
      this.J = null; this.secretos = { a:null, b:null }; this.pendiente = { a:null, b:null };
      this.mazos = { a:null, b:null }; this.pvMesa = null; this.quien = { a:null, b:null }; this.lideres = { a:null, b:null };
    }

    if(pedido.headers.get('Upgrade') !== 'websocket'){
      return new Response(JSON.stringify({
        existe: !!this.J, lugares: this.lugaresLibres(),
      }), { headers:{ 'content-type':'application/json' } });
    }

    const par = new WebSocketPair();
    const [cliente, servidor] = Object.values(par);
    servidor.accept();
    this.enchufar(servidor, url.searchParams.get('secreto'),
                  this.leerMazo(url.searchParams.get('mazo')),
                  { pv: url.searchParams.get('pv'), nombre: url.searchParams.get('nombre'), avatar: url.searchParams.get('avatar'), lider: url.searchParams.get('lider') });
    return new Response(null, { status:101, webSocket:cliente });
  }

  lugaresLibres(){
    const ocupados = new Set([...this.vivos.values()]);
    return ['a','b'].filter(x => !ocupados.has(x)).length;
  }

  enchufar(ws, secretoDado, mazoDado, extra = {}){
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
    /* Con partida en curso el mazo ya no se toca: cambiar las cartas con el
       juego empezado es, literalmente, hacer trampa. Al reconectarse, el que
       vuelve se encuentra el mazo con el que empezó. */
    if(!this.J && mazoDado) this.mazos[asiento] = mazoDado;
    /* la vida la fija el primero que la pide, antes de repartir (40 a 200) */
    const pv = parseInt(extra.pv, 10);
    if(!this.J && !this.pvMesa && pv >= 40 && pv <= 200) this.pvMesa = pv;
    /* el apodo: corto y sin nada que pinte algo raro en la pantalla del otro */
    const nombre = String(extra.nombre || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 16);
    const avatar = /^av-[a-z]{2,12}$/.test(extra.avatar || '') ? extra.avatar : null;
    if(nombre || avatar) this.quien[asiento] = { nombre: nombre || null, avatar };
    if(!this.J && LIDERES_PASIVOS.has(extra.lider || '') || (!this.J && /^(estratega|guerrillero|cientifico|criminal|almirante)$/.test(extra.lider || ''))) this.lideres[asiento] = extra.lider;
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
      this.J = this.conVida(MOTOR.repartir((crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0,
                              this.mazos));
      this.pendiente = { a:null, b:null };
      this.guardar();
    }
  }

  conVida(J){ if(this.pvMesa){ J.a.pv = J.b.pv = this.pvMesa; }
    /* las ventajas de líder que no piden escoger (las que piden escoger, por ahora sólo contra la máquina) */
    for(const s of ['a', 'b']) pasiva(J[s], this.lideres && this.lideres[s]);
    return J; }

  /* ── EL MAZO QUE DECLARA UN TELÉFONO ─────────────────────────────────────
     ⚠ VIENE EN EL LINK Y NO EN UN MENSAJE, Y ÉSA ES LA PARTE QUE IMPORTA.
     Primero lo hice como mensaje («ya me senté, éste es mi mazo») y tenía una
     carrera que se ve en cuanto se dibuja la secuencia: el servidor reparte
     EN CUANTO se llena la sala, dentro de `enchufar`, así que el segundo en
     entrar disparaba el reparto antes de que su propio mensaje llegara. El
     primero jugaba con su colección y el segundo con la baraja de siempre, sin
     un solo error por ningún lado. En el link, el mazo ya está aquí cuando se
     sienta: no hay carrera que resolver, que es mejor que resolverla.

     ⚠ AQUÍ NO HAY FORMA DE COMPROBAR QUE ALGUIEN TENGA DE VERDAD ESAS CARTAS,
     y conviene decirlo con todas sus letras en vez de fingir que sí: las
     colecciones viven en cada teléfono —ni cuenta, ni correo, ni servidor, y
     ésa fue una decisión de privacidad de datos de una menor, no un descuido—
     así que el servidor no tiene contra qué cotejarlas.

     Lo que SÍ se puede hacer, y se hace, es que ninguna carta sea imposible:
     `limpiarCartas` tira todo lo que no sea un nivel real con un valor dentro
     de su rango, y el mazo sale siempre del mismo tamaño. O sea que el peor
     tramposo posible se arma un mazo de treinta cartas de nivel S — que es
     exactamente lo que se arma alguien que juntó el álbum, y contra quien el
     tope de 15 de daño sigue valiendo.

     Lo que queda fuera de alcance necesita cuentas, y las cuentas las decide
     una persona, no yo. Queda anotado y no disfrazado.

     `D20.C40.B60` → [{valor:20,nivel:'D'}, …]. Corto a propósito: viaja en una
     dirección, y una colección entera en JSON no cabe cómoda ahí. */
  leerMazo(texto){
    if(!texto) return null;
    /* «M:…» = un mazo ARMADO a mano en Puercos 2 (hasta 64, 6 nov): se usa tal cual, limpio, con su soporte;
       sin eso, mazoDeColeccion lo recortaría a las 30 mejores */
    const armado = String(texto).startsWith('M:'); if(armado) texto = String(texto).slice(2);
    const cartas = String(texto).slice(0, 1200).split('.').map(t => {
      const m = /^([A-Z]+)(\d+)$/.exec(t.trim());
      return m ? { nivel: m[1], valor: parseInt(m[2], 10) } : null;
    }).filter(Boolean);
    const limpio = MOTOR.limpiarCartas(cartas);
    if(armado && limpio.length) return [...limpio.slice(0, 64).map((c, i) => ({ id: 'k' + i, valor: c.valor, nivel: c.nivel })),
      ...['bono', 'castigo'].flatMap(esp => Array.from({ length: 5 }, (_, i) => ({ id: 'e' + esp[0] + i, valor: 0, nivel: 'ESP', esp })))];
    return limpio.length ? limpio : null;
  }

  /* ── LA VISTA · lo único que sale de aquí hacia un teléfono ──────────────
     Del rival van los PV y CUÁNTAS cartas trae. Sus cartas NO. */
  vista(asiento){
    const sentados = new Set([...this.vivos.values()]);
    const otroQ = this.quien[asiento === 'a' ? 'b' : 'a'] || {};
    const base = { asiento, esperando: sentados.size < 2, listo: !!this.J, pvMesa: this.pvMesa || MOTOR.PV_INICIAL,
                   rivalNombre: otroQ.nombre || null, rivalAvatar: otroQ.avatar || null,
                   yaJugue: !!this.pendiente[asiento],
                   rivalYaJugo: !!this.pendiente[asiento === 'a' ? 'b' : 'a'] };
    if(!this.J) return base;
    const yo = this.J[asiento], otro = this.J[asiento === 'a' ? 'b' : 'a'];
    return Object.assign(base, {
      ronda: this.J.ronda, acabo: this.J.acabo, porCartas: !!this.J.porCartas,
      /* ⚠ YA NO HAY `this.J.mazo`, Y ESO TENÍA EL MODO EN LÍNEA MUERTO. Desde
         que cada jugador tiene SU mazo —lo pidió Carlos, y es lo que hace
         posible una colección— el estado dejó de traer un mazo compartido.
         Esta línea seguía leyéndolo: `undefined.length` reventaba dentro del
         Durable Object, y desde fuera se veía como un websocket que contesta
         500. O sea, un error de una palabra que se disfrazaba de problema de
         red. Lo cazaron las pruebas de línea, que hay que correr con el
         servidor levantado o no prueban nada.
         Y del mazo viaja el NÚMERO, no las cartas: mandarlas sería regalar por
         el cable justo lo que no queremos que se sepa. */
      /* ⚠ EL CEMENTERIO SÍ VIAJA, Y LAS DOS. Lo que se ha jugado es
         información PÚBLICA en cualquier mesa de cartas: se puso boca arriba
         delante de los dos. Lo que no viaja —y sigue sin viajar— es la MANO
         del rival. Van sólo las cuatro últimas porque son las que se pintan;
         mandar el montón entero sería empujar 100 cartas por ronda para
         dibujar cuatro. */
      yo:    { pv: yo.pv, mano: yo.mano, combosUsados: yo.combosUsados,
               mazo: (yo.mazo || []).length,
               cementerio: (yo.cementerio || []).slice(-4) },
      rival: { pv: otro.pv, cartas: otro.mano.length, combosUsados: otro.combosUsados,
               mazo: (otro.mazo || []).length,
               cementerio: (otro.cementerio || []).slice(-4) },
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
        this.J = this.conVida(MOTOR.repartir((crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0,
                                this.mazos));
        this.pendiente = { a:null, b:null };
        await this.guardar(); this.avisarATodos();
      }
      return;
    }

    /* el latido del teléfono (linea.js): se le contesta con su vista fresca, así un aviso perdido no traba la mesa */
    if(m.tipo === 'ping'){ ws.send(JSON.stringify({ tipo:'estado', vista: this.vista(asiento) })); return; }
    if(m.tipo !== 'jugada') return;
    if(!this.J || this.J.acabo) throw new Error('No hay partida en curso.');
    if(this.pendiente[asiento]){
      /* la MISMA jugada otra vez = se reenvió al reconectar: ya la tengo, no es error */
      const p = this.pendiente[asiento], ids = (m.cartas || []).join(',');
      if(p.cartas.map(c => c.id).join(',') === ids && (p.especial || null) === (m.especial || null)){ ws.send(JSON.stringify({ tipo:'estado', vista: this.vista(asiento) })); return; }
      throw new Error('Ya jugaste esta ronda.');
    }

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
