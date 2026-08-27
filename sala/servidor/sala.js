/* ══════════════════════════════════════════════════════════════════════════
   LA SALA · el Durable Object
   ──────────────────────────────────────────────────────────────────────────
   Una sala = un objeto. Aquí vive el hilo de verdad: lo que escriben los
   humanos, lo que se dicen los agentes entre sí, lo que ejecutaron y lo que
   se corrigieron. La página sólo lo pinta.

   ── Lo que hace distinta a esta sala ──────────────────────────────────────
   NO son dos asientos. Son N participantes, de DOS CUENTAS DE CLAUDE
   distintas que no se pueden hablar entre ellas por ningún otro medio —
   Anthropic no ofrece eso. Cada quien conecta las sesiones que quiera, desde
   su propia cuenta y con sus propias credenciales, y aquí se encuentran.
   Nadie ve los repos ni las herramientas del otro: lo único compartido es
   este hilo.

   ── La pieza que hace que sea una conversación y no un buzón ──────────────
   `/esperar`. Claude Code no vive esperando: actúa cuando su humano le manda
   un turno. Si los agentes nada más se dejaran recados, esto sería un buzón.
   `/esperar` se queda colgada hasta que alguien más publique, así que el
   agente que la llama SIGUE VIVO dentro de su turno y despierta cuando el
   otro contesta. Eso es lo que los deja platicar de verdad, en vivo, mientras
   los humanos miran.

   ── Y por eso mismo hay freno ─────────────────────────────────────────────
   Dos agentes contestándose es el modo más caro de fallar que existe: cada
   mensaje es un turno completo, con todo el contexto, cobrado a las dos
   cuentas. Un desacuerdo educado puede dar vueltas hasta vaciar el saldo del
   mes sin producir una línea de código. Entonces:

     · Se cuentan las vueltas SEGUIDAS de agente. Al llegar al tope, `/decir`
       de un agente se rechaza y la sala pide que hable un humano.
     · El contador se pone en cero en cuanto un humano escribe.
     · `/esperar` tiene tope de tiempo y siempre regresa, aunque sea vacío.

   El presupuesto es POR SALA y no por pareja, porque con más sesiones se
   gasta más rápido, no igual.

   ── Lo que esta sala NO tiene, dicho sin adornos ──────────────────────────
   No hay cuentas ni contraseñas de verdad. Hay un código de sala y una llave
   por cuenta, que se configuran a mano en cada máquina. Quien tenga las dos
   entra. Para dos amigos trabajando juntos está bien; llamarlo seguridad
   sería mentir. Lo que sí está cuidado: la llave dice de QUÉ CUENTA es cada
   quien, y eso no lo puede inventar el que se conecta.
   ═════════════════════════════════════════════════════════════════════════ */

/* Media hora sin que nadie hable y la sala se olvida sola. */
const OLVIDO = 60 * 60 * 1000;

/* Cuántos eventos se guardan. El hilo largo no es la memoria: para eso está
   el acta, que es corta y a propósito. */
const TOPE_HILO = 400;

/* Vueltas SEGUIDAS de agente antes de exigir que hable un humano. */
const TOPE_VUELTAS = 12;

/* `/esperar` nunca cuelga para siempre: 50 s y regresa vacía. Cloudflare
   corta la conexión mucho después, pero un agente colgado un minuto entero
   es un agente que ya no se siente vivo.

   Se puede bajar con la variable ESPERA_MS, y eso no es un adorno para las
   pruebas: sin ello la suite tardaba 1m40 —dos esperas que de verdad se
   agotan— y una suite que tarda eso es una suite que se deja de correr. */
const ESPERA_MAX = 50_000;

/* Topes de tamaño. Una imagen viaja en base64 dentro del evento; más de esto
   y hay que mandar liga en vez de archivo. */
const TOPE_IMAGEN = 1_500_000;
const TOPE_EVENTO = 2_000_000;
const TOPE_TEXTO  = 20_000;

const TIPOS = new Set([
  'mensaje',      /* lo que escribe un humano */
  'tarea',        /* en qué se convirtió ese mensaje */
  'propuesta',    /* «yo lo haría así» */
  'pregunta',     /* «¿tú qué opinas de esto?» */
  'desacuerdo',   /* «no estoy de acuerdo, y por esto» */
  'decision',     /* «quedamos en esto» */
  'ejecucion',    /* «lo hice, aquí está» */
  'revision',     /* «revisé lo tuyo, esto le falta» */
  'bloqueo',      /* «no puedo seguir, y aquí está por qué» */
  'acta',         /* lo que aprendimos */
  'limite',       /* lo que dijo la APP, no el agente. Ver abajo */
]);

/* ── por qué `limite` es un tipo y no un mensaje cualquiera ────────────────
   Cada cuenta tiene sus propios topes —diario, semanal, mensual, créditos— y
   se acaban en momentos distintos. Si la sesión de uno se topa y nada más
   deja de contestar, los otros TRES se quedan esperando a alguien que no va
   a volver en horas. Por eso el tope se anuncia, con la hora de regreso, y
   además se queda pegado al participante como estado: en la mesa se ve
   quién puede trabajar ahorita y quién no, sin tener que adivinarlo. */
const ESTADOS = new Set(['activo', 'topado', 'ocupado', 'fuera']);

const CLASES_ADJUNTO = new Set(['imagen', 'archivo', 'diff', 'enlace', 'repo', 'presentacion']);

/* ── reacciones ────────────────────────────────────────────────────────────
   Cerradas a una lista corta a propósito. Un catálogo abierto de emojis en un
   equipo de trabajo se vuelve ruido; estas ocho dicen algo que cambia lo que
   hace el otro, y por eso llevan palabra además de figura: «visto» no es lo
   mismo que «de acuerdo», y confundirlos es como se aprueba sin leer. */
const REACCIONES = new Map([
  ['visto',    'Lo vi'],
  ['deacuerdo','De acuerdo'],
  ['nodeacuerdo','No estoy de acuerdo'],
  ['hecho',    'Ya quedó'],
  ['revisando','Lo estoy revisando'],
  ['dudo',     'Tengo una duda'],
  ['ojo',      'Ojo con esto'],
  ['bravo',    'Bien hecho'],
]);

/* Lo que un agente está haciendo AHORITA. No es un mensaje: es el estado de su
   pantalla, y se pisa cada vez que reporta. Un mensaje por cada paso llenaría
   el hilo de ruido y despertaría a los demás sin razón. */
const TOPE_PASOS = 8;

const ahora = () => Date.now();

export class Sala {
  constructor(ctx, env){
    this.ctx = ctx;
    this.env = env;
    this.vivos = new Set();        /* sockets abiertos */
    this.esperando = [];           /* resolvers de /esperar */
    this.listo = ctx.blockConcurrencyWhile(async () => {
      this.hilo    = await ctx.storage.get('hilo')    || [];
      this.gente   = await ctx.storage.get('gente')   || {};
      this.vueltas = await ctx.storage.get('vueltas') || 0;
      this.proyectos = await ctx.storage.get('proyectos') || [];
      this.serie   = await ctx.storage.get('serie')   || 0;
    });
  }

  async guardar(){
    await this.ctx.storage.put({
      hilo: this.hilo, gente: this.gente, vueltas: this.vueltas,
      proyectos: this.proyectos, serie: this.serie,
    });
    await this.ctx.storage.setAlarm(ahora() + OLVIDO);
  }

  async alarm(){ await this.ctx.storage.deleteAll(); }

  /* ── quién es quién ─────────────────────────────────────────────────────
     La llave NO la elige el que se conecta: viene de las variables del
     worker. Por eso un participante puede mentir en su nombre pero no en su
     cuenta, que es lo único que importa para saber de quién es cada sesión. */
  cuentaDe(llave){
    const crudo = (this.env.LLAVES || '').trim();
    /* ── Sin llaves configuradas: TODOS entran como invitado ───────────────
       Es a propósito, y es lo que hace que esto funcione el primer día: para
       que el Claude del compañero se meta SOLO, le tiene que bastar el link.
       Si entrar exigiera configurar una llave a mano, ya no se mete solo —
       se mete su dueño por él, que es justo lo que no queremos.

       Y hay que decirlo sin adornarlo: así, QUIEN TENGA EL LINK PUEDE
       ESCRIBIR. Es un link de sala, como el de una videollamada, no una
       cerradura. Para trabajo entre dos amigos está bien; el día que haga
       falta identidad de verdad se ponen las llaves con
       `wrangler secret put LLAVES` y esto se cierra solo, sin tocar código. */
    if(!crudo) return 'invitado';

    const mapa = {};
    for(const par of crudo.split(',')){
      const [cuenta, valor] = par.split(':').map(x => (x || '').trim());
      if(cuenta && valor) mapa[valor] = cuenta;
    }
    return mapa[llave] || null;
  }

  /* ── el hilo ────────────────────────────────────────────────────────── */
  async publicar(evento){
    evento.id = `e${++this.serie}`;
    evento.ts = ahora();
    this.hilo.push(evento);
    if(this.hilo.length > TOPE_HILO) this.hilo = this.hilo.slice(-TOPE_HILO);

    /* El contador de vueltas: sube con cada agente, se limpia con cada humano.
       Entrar a la sala y avisar que te topaste NO son vueltas de conversación
       — nadie paga por ellas y castigarlas dejaría al que se topó sin poder
       ni avisar que ya volvió. */
    const cuenta = evento.tipo !== 'sistema' && evento.tipo !== 'limite';
    if(cuenta && evento.de?.tipo === 'humano') this.vueltas = 0;
    else if(cuenta && evento.de?.tipo === 'claude') this.vueltas++;

    await this.guardar();
    this.difundir({ que:'evento', evento, vueltas:this.vueltas, tope:TOPE_VUELTAS });
    this.despertar(evento);
    return evento;
  }

  difundir(paquete){
    const texto = JSON.stringify(paquete);
    for(const s of [...this.vivos]){
      try{ s.send(texto); }catch(e){ this.vivos.delete(s); }
    }
  }

  /* Despierta a los agentes colgados en /esperar. */
  despertar(evento){
    const quedan = [];
    for(const q of this.esperando){
      if(q.filtro(evento)) q.responder([evento]);
      else quedan.push(q);
    }
    this.esperando = quedan;
  }

  async fetch(pedido){
    await this.listo;
    const url = new URL(pedido.url);
    const ruta = url.pathname.split('/').pop();

    if(ruta === 'ws') return this.conectar(pedido);

    const llave = pedido.headers.get('X-Llave') || url.searchParams.get('llave') || '';
    const cuenta = this.cuentaDe(llave);
    if(!cuenta) return Response.json({ error:'Llave que no reconozco.' }, { status:401 });

    if(pedido.method === 'GET' && ruta === 'hilo'){
      return Response.json({
        hilo: this.hilo, gente: this.gente, proyectos: this.proyectos,
        vueltas: this.vueltas, tope: TOPE_VUELTAS,
      });
    }

    if(pedido.method === 'POST' && ruta === 'entrar'){
      const c = await pedido.json().catch(() => ({}));
      const id = String(c.id || '').slice(0, 60);
      if(!id) return Response.json({ error:'Falta el id de la sesión.' }, { status:400 });
      this.gente[id] = {
        id, cuenta,
        nombre: String(c.nombre || id).slice(0, 60),
        tipo: c.tipo === 'humano' ? 'humano' : 'claude',
        estado: 'activo', reanuda: null, nota: '',
        visto: ahora(),
      };
      await this.publicar({ de:{ ...this.gente[id] }, tipo:'sistema', accion:'entra', texto:'' });
      return Response.json({ bien:true, yo:this.gente[id], tope:TOPE_VUELTAS });
    }

    if(pedido.method === 'POST' && ruta === 'decir'){
      const c = await pedido.json().catch(() => ({}));
      const quien = this.gente[String(c.de || '')];
      if(!quien) return Response.json({ error:'Primero hay que entrar a la sala.' }, { status:400 });
      if(quien.cuenta !== cuenta){
        return Response.json({ error:'Esa sesión es de otra cuenta.' }, { status:403 });
      }
      /* ── El tipo es OPCIONAL, y eso es una corrección de Carlos ─────────
         «no necesariamente tienen que decir qué tipo de mensaje es sino poner
         su mensajote y al final algo para el otro claude si es necesario,
         como una sala de juntas.»

         Tiene razón: obligar a etiquetar cada cosa vuelve tieso lo que debería
         ser una junta. Nadie en una junta anuncia «esto es una PROPUESTA»
         antes de hablar. El tipo sigue existiendo porque pintar distinto una
         decisión de un desacuerdo es justo lo que deja leer el hilo de un
         vistazo — pero se pone cuando ayuda, no porque el sistema lo exija. */
      const tipo = c.tipo || 'mensaje';
      if(!TIPOS.has(tipo)){
        return Response.json({ error:`Ese tipo no existe. Puedes omitirlo, o usar: ${[...TIPOS].join(', ')}` },
                             { status:400 });
      }

      /* EL FRENO. Antes que nada, porque de nada sirve después. */
      if(quien.tipo === 'claude' && this.vueltas >= TOPE_VUELTAS){
        return Response.json({
          error: 'Freno de vueltas. Llevan ' + this.vueltas + ' mensajes seguidos entre ' +
                 'agentes sin que hable una persona. Resume dónde va la discusión, dilo en ' +
                 'la sala como tipo "bloqueo", y espera a que Carlos o su compañero decidan.',
          freno: true, vueltas: this.vueltas, tope: TOPE_VUELTAS,
        }, { status:429 });
      }

      const malo = revisarAdjuntos(c.adjuntos);
      if(malo) return Response.json({ error: malo }, { status:400 });

      /* ── a quién le habla ───────────────────────────────────────────────
         `null` es «a todos», y eso NO es gratis: si dos agentes despiertan
         con el mismo mensaje, los dos hacen el mismo trabajo y le cobran a
         las dos cuentas. Por eso la mesa obliga a escoger y «a todos» es una
         decisión que se toma a propósito. Vale una sesión (`s-carlos-1`) o
         una cuenta entera (`@amigo`), que sirve para «que conteste
         cualquiera de los suyos, el que esté libre». */
      const a = c.a ? String(c.a).slice(0, 60) : null;
      if(a && !a.startsWith('@') && !this.gente[a]){
        return Response.json({ error:`No hay nadie en la sala con el id "${a}".` },
                             { status:400 });
      }

      /* ── la nota del final ─────────────────────────────────────────────
         El cuerpo se lo dices a la sala; la nota es el «oye, tú» del final,
         dirigido a alguien en concreto. Resuelve bonito el problema que tenía
         el destinatario único: el mensajote lo leen todos —que es lo que uno
         quiere en una junta— pero SÓLO despierta a quien va dirigida la nota.
         Así nadie hace dos veces el mismo trabajo por estar «a todos». */
      let nota = null;
      if(c.nota && (c.nota.texto || typeof c.nota === 'string')){
        const n = typeof c.nota === 'string' ? { texto:c.nota } : c.nota;
        const na = n.a ? String(n.a).slice(0, 60) : null;
        if(na && !na.startsWith('@') && !this.gente[na]){
          return Response.json({ error:`La nota va dirigida a "${na}", que no está en la sala.` },
                               { status:400 });
        }
        nota = { a: na, texto: String(n.texto || '').slice(0, 4000) };
      }

      const evento = {
        de: { id:quien.id, nombre:quien.nombre, tipo:quien.tipo, cuenta:quien.cuenta },
        a,
        tipo,
        texto: String(c.texto || '').slice(0, TOPE_TEXTO),
        nota,
        adjuntos: c.adjuntos || [],
        proyecto: c.proyecto ? String(c.proyecto).slice(0, 60) : null,
      };
      if(JSON.stringify(evento).length > TOPE_EVENTO){
        return Response.json({ error:'El evento pesa demasiado. Manda liga en vez de archivo.' },
                             { status:413 });
      }
      quien.visto = ahora();
      return Response.json({ bien:true, evento: await this.publicar(evento) });
    }

    /* ── /esperar · la pieza clave ─────────────────────────────────────────
       Se queda colgada hasta que alguien MÁS publique algo. Si ya hay algo
       nuevo desde el último evento que el agente vio, regresa de inmediato. */
    if(pedido.method === 'GET' && ruta === 'esperar'){
      const yo = url.searchParams.get('de') || '';
      const desde = url.searchParams.get('desde') || '';
      const deQuien = url.searchParams.get('dequien') || '';

      /* Un agente NO despierta con un mensaje dirigido a alguien más. Es lo
         que evita que los dos contesten lo mismo y se pague doble. */
      const mio = this.gente[yo];
      const dirigido = (d) => !!d && (d === yo
                         || (d.startsWith('@') && mio && d.slice(1) === mio.cuenta));
      /* Despierta si el mensaje va para ti, O si la nota del final va para ti
         aunque el cuerpo sea para toda la sala. Un mensaje sin destinatario y
         sin nota es «para todos» y sí despierta a todos: es una decisión de
         quien escribe, no un descuido del sistema. */
      const paraMi = (e) => (!e.a && !(e.nota && e.nota.a))
                         || dirigido(e.a)
                         || dirigido(e.nota && e.nota.a);
      const sirve = (e) => e.tipo !== 'sistema'
                        && e.de?.id !== yo
                        && (!deQuien || e.de?.id === deQuien)
                        && paraMi(e);

      const i = desde ? this.hilo.findIndex(e => e.id === desde) : -1;
      const nuevos = (i >= 0 ? this.hilo.slice(i + 1) : this.hilo).filter(sirve);
      if(nuevos.length) return Response.json({ eventos: nuevos, esperó: false });

      const eventos = await new Promise((resolver) => {
        /* El reloj se APAGA al despertar. Si no, cada espera que se resuelve
           antes de tiempo deja un temporizador de 50 s colgando: en el worker
           es basura acumulada y en las pruebas hacía que la suite tardara un
           minuto cuarenta en vez de segundos. Se cachó midiendo, no leyendo. */
        let reloj = null;
        const q = { filtro: sirve, responder: (evs) => { clearTimeout(reloj); resolver(evs); } };
        this.esperando.push(q);
        reloj = setTimeout(() => {
          this.esperando = this.esperando.filter(x => x !== q);
          resolver([]);
        }, Number(this.env.ESPERA_MS) || ESPERA_MAX);
      });
      return Response.json({ eventos, esperó: true });
    }

    /* ── /estado · lo que dice la APP, no el agente ────────────────────────
       Aquí es donde entra «se acabó tu uso diario, vuelve a las 3». El agente
       lo reporta en cuanto lo ve, y pasan DOS cosas: se queda como estado del
       participante (para que en la mesa se vea de un vistazo quién puede
       trabajar) y se publica como evento `limite` (para que quede en el hilo
       y en el acta el porqué de un hueco de cuatro horas). */
    if(pedido.method === 'POST' && ruta === 'reaccion'){
      const c = await pedido.json().catch(() => ({}));
      const quien = this.gente[String(c.de || '')];
      if(!quien) return Response.json({ error:'Esa sesión no está en la sala.' }, { status:400 });
      if(quien.cuenta !== cuenta){
        return Response.json({ error:'Esa sesión es de otra cuenta.' }, { status:403 });
      }
      if(!REACCIONES.has(c.cual)){
        return Response.json({ error:`Reacción desconocida. Van: ${[...REACCIONES.keys()].join(', ')}` },
                             { status:400 });
      }
      const ev = this.hilo.find(e => e.id === String(c.sobre || ''));
      if(!ev) return Response.json({ error:'Ese mensaje ya no está en el hilo.' }, { status:404 });

      /* Reaccionar dos veces la quita. Es como funciona en cualquier app de
         mensajes y no hace falta un botón aparte para deshacer. */
      ev.reacciones = ev.reacciones || {};
      const lista = ev.reacciones[c.cual] || [];
      const i = lista.indexOf(quien.id);
      if(i >= 0) lista.splice(i, 1); else lista.push(quien.id);
      if(lista.length) ev.reacciones[c.cual] = lista; else delete ev.reacciones[c.cual];

      await this.guardar();
      this.difundir({ que:'reaccion', id:ev.id, reacciones:ev.reacciones });
      /* NO despierta a nadie: una reacción no es trabajo. */
      return Response.json({ bien:true, reacciones:ev.reacciones });
    }

    /* ── /trabajando · la pantalla de cada agente ──────────────────────────
       Lo que está haciendo ahorita, en vivo. Se pisa con cada reporte y NO
       entra al hilo: si cada paso fuera un mensaje, el hilo sería ilegible y
       despertaría a los demás por nada. Los humanos lo ven en la mesa; los
       agentes lo pueden leer para no duplicar trabajo. */
    if(pedido.method === 'POST' && ruta === 'trabajando'){
      const c = await pedido.json().catch(() => ({}));
      const quien = this.gente[String(c.de || '')];
      if(!quien) return Response.json({ error:'Esa sesión no está en la sala.' }, { status:400 });
      if(quien.cuenta !== cuenta){
        return Response.json({ error:'Esa sesión es de otra cuenta.' }, { status:403 });
      }
      quien.trabajo = c.en ? {
        en: String(c.en).slice(0, 140),
        paso: c.paso ? String(c.paso).slice(0, 140) : '',
        pasos: Array.isArray(c.pasos) ? c.pasos.slice(-TOPE_PASOS).map(x => String(x).slice(0, 140)) : [],
        de: Number(c.de_cuantos) || 0,
        va: Number(c.va) || 0,
        desde: quien.trabajo && quien.trabajo.en === c.en ? quien.trabajo.desde : ahora(),
      } : null;
      quien.visto = ahora();
      await this.guardar();
      this.difundir({ que:'gente', gente:this.gente });
      return Response.json({ bien:true, yo:quien });
    }

    if(pedido.method === 'POST' && ruta === 'estado'){
      const c = await pedido.json().catch(() => ({}));
      const quien = this.gente[String(c.de || '')];
      if(!quien) return Response.json({ error:'Esa sesión no está en la sala.' }, { status:400 });
      if(quien.cuenta !== cuenta){
        return Response.json({ error:'Esa sesión es de otra cuenta.' }, { status:403 });
      }
      if(!ESTADOS.has(c.estado)){
        return Response.json({ error:`Estado desconocido. Van: ${[...ESTADOS].join(', ')}` },
                             { status:400 });
      }

      /* `reanuda` es la hora a la que puede seguir, en milisegundos. Es EL
         dato que hace útil el aviso: «topado» sin hora no le sirve a nadie
         para decidir si esperar o repartir el trabajo de otro modo. */
      const reanuda = Number(c.reanuda) || null;
      quien.estado = c.estado;
      quien.reanuda = (c.estado === 'topado' || c.estado === 'ocupado') ? reanuda : null;
      quien.nota = String(c.nota || '').slice(0, 200);
      quien.visto = ahora();

      if(c.estado === 'activo'){
        await this.guardar();
        this.difundir({ que:'gente', gente:this.gente });
        return Response.json({ bien:true, yo:quien });
      }

      const evento = await this.publicar({
        de: { id:quien.id, nombre:quien.nombre, tipo:quien.tipo, cuenta:quien.cuenta },
        a: null, tipo:'limite', texto: quien.nota, adjuntos: [], proyecto: null,
        limite: { clase:String(c.clase || 'uso').slice(0, 40), estado:c.estado, reanuda },
      });
      this.difundir({ que:'gente', gente:this.gente });
      return Response.json({ bien:true, yo:quien, evento });
    }

    if(pedido.method === 'POST' && ruta === 'proyecto'){
      const c = await pedido.json().catch(() => ({}));
      const p = {
        id: String(c.id || '').slice(0, 60),
        nombre: String(c.nombre || '').slice(0, 80),
        repo: c.repo ? String(c.repo).slice(0, 140) : null,
        url: limpiarURL(c.url),
      };
      if(!p.id || !p.nombre) return Response.json({ error:'Falta id o nombre.' }, { status:400 });
      this.proyectos = this.proyectos.filter(x => x.id !== p.id).concat([p]);
      await this.guardar();
      this.difundir({ que:'proyectos', proyectos:this.proyectos });
      return Response.json({ bien:true, proyectos:this.proyectos });
    }

    return Response.json({ error:'No existe esa ruta en la sala.' }, { status:404 });
  }

  conectar(pedido){
    if(pedido.headers.get('Upgrade') !== 'websocket'){
      return new Response('Aquí sólo websocket.', { status:426 });
    }
    const par = new WebSocketPair();
    const [cliente, servidor] = Object.values(par);
    servidor.accept();
    this.vivos.add(servidor);
    servidor.send(JSON.stringify({
      que:'hola', hilo:this.hilo, gente:this.gente, proyectos:this.proyectos,
      vueltas:this.vueltas, tope:TOPE_VUELTAS,
    }));
    servidor.addEventListener('close', () => this.vivos.delete(servidor));
    servidor.addEventListener('error', () => this.vivos.delete(servidor));
    return new Response(null, { status:101, webSocket:cliente });
  }
}

/* ── adjuntos ──────────────────────────────────────────────────────────────
   Lo que la mesa sabe pintar. Se revisa aquí y no en la página, porque la
   página se puede cambiar desde el navegador y el servidor no. */
function revisarAdjuntos(lista){
  if(lista == null) return null;
  if(!Array.isArray(lista)) return 'Los adjuntos van en una lista.';
  if(lista.length > 12) return 'Máximo 12 adjuntos por evento.';
  for(const a of lista){
    if(!a || !CLASES_ADJUNTO.has(a.clase)){
      return `Adjunto desconocido. Van: ${[...CLASES_ADJUNTO].join(', ')}`;
    }
    if(a.clase === 'imagen'){
      if(typeof a.datos !== 'string') return 'La imagen va en base64 en `datos`.';
      if(a.datos.length > TOPE_IMAGEN) return 'Esa imagen pesa demasiado; manda liga.';
      if(!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(a.mime || '')){
        return 'Formato de imagen no admitido.';
      }
    }
    /* ── presentaciones ───────────────────────────────────────────────────
       Van como LÁMINAS EN IMAGEN, no como PDF. Un PDF en base64 revienta el
       tope al segundo archivo, y además obligaría a la mesa a traer un lector
       de PDF. Que el agente rinda sus láminas a imagen es una línea de su
       lado y funciona en cualquier teléfono. */
    if(a.clase === 'presentacion'){
      if(!Array.isArray(a.laminas) || !a.laminas.length) return 'Esa presentación va sin láminas.';
      if(a.laminas.length > 40) return 'Máximo 40 láminas por presentación.';
      let pesa = 0;
      for(const l of a.laminas){
        if(typeof l.datos !== 'string') return 'Cada lámina va en base64 en `datos`.';
        if(!/^image\/(png|jpeg|webp)$/.test(l.mime || '')) return 'Las láminas van en png, jpeg o webp.';
        pesa += l.datos.length;
      }
      if(pesa > TOPE_IMAGEN * 4) return 'Esa presentación pesa demasiado; manda menos láminas o más chicas.';
    }
    if(a.clase === 'enlace' && !limpiarURL(a.url)) return 'Ese enlace no es http(s).';
    if(a.clase === 'repo'   && !a.owner)           return 'Al repo le falta el dueño.';
    if(a.clase === 'diff'   && typeof a.cuerpo !== 'string') return 'Al diff le falta cuerpo.';
    if(a.clase === 'archivo'&& !a.ruta)            return 'Al archivo le falta la ruta.';
  }
  return null;
}

/* Sólo http y https. Sin esto, un `javascript:` en un adjunto se convierte en
   un clic malicioso dentro de la mesa de los cuatro. */
function limpiarURL(u){
  if(!u) return null;
  try{
    const x = new URL(String(u));
    return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : null;
  }catch(e){ return null; }
}
