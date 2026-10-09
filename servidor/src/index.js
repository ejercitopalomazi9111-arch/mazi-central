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
   acuerdo solos.

   ── Cómo se ponen de acuerdo ──────────────────────────────────────────────
   Se mandan REGISTROS, no el documento: cada pedido, alumno y platillo trae su
   `id` y su `t`, y gana el más reciente de cada uno. Dos alumnos que piden en
   el mismo segundo son dos ids distintos y sobreviven los dos.

   ── Lo que el servidor decide solo (y por qué) ─────────────────────────────
   Desde el 9 de octubre el servidor NO le cree al teléfono. Antes una sola
   llamada sin contraseña devolvía el pasador del mostrador y los códigos de
   todos los alumnos, y cualquiera podía poner la torta en $0 o marcar pagado
   el pedido de otro. Ahora (ver servidor/ataques.mjs, que lo prueba):

   · EL MOSTRADOR entra con su pasador AQUÍ, no en su pantalla, y recibe una
     llave que dura un turno de trabajo. Sólo con esa llave se toca el menú,
     los ajustes, los conteos y el avance de los pedidos. El pasador nunca
     viaja a ningún teléfono.
   · CADA TELÉFONO tiene un id de aparato al azar. El alumno es de los aparatos
     que lo crearon o que entraron con su código; nadie más le toca nada.
   · DEL PEDIDO, el alumno sólo pone qué quiere y cuántos. El turno, el total,
     la hora, si es anticipado, si está pagado y en qué va, los pone el
     servidor. Y sólo puede cancelarlo o cambiar lo que se acabó.
   · CADA QUIEN VE LO SUYO: el alumno ve la fila (números y estados) pero no
     nombres, grupos ni códigos de los demás.
   · TOPES: pedidos vivos por alumno, alumnos nuevos por teléfono, pedidos por
     teléfono, por wifi y por escuela, intentos de pasador y de código, y
     tamaño de lo que se manda. Calibrados para 80 alumnos pidiendo dos veces
     en 30 minutos desde el MISMO wifi: eso tiene que pasar entero.
   ═════════════════════════════════════════════════════════════════════════ */

import { nuevasLlavesVapid, mandar, suscripcionValida } from './push.js';

const CAJONES = ['productos', 'alumnos', 'pedidos', 'conteos', 'eventos'];
const CONTACTO = 'mailto:grupomazi.oficial@gmail.com';
const VIVOS = ['en_cola', 'preparando', 'listo'];
const DIA = 24 * 60 * 60 * 1000;

/* Los topes, en un solo lugar. Cada uno dice contra qué protege. */
const TOPE = {
  cuerpoAlumno: 96 * 1024,            /* lo que manda un teléfono normal pesa unos pocos KB */
  cuerpoMostrador: 6 * 1024 * 1024,   /* el menú con fotos */
  registrosPorVuelta: 60,             /* registros por cajón en una sola llamada de alumno */
  peticionesPorIpMinuto: 2400,        /* todo un wifi escolar cabe; un script en bucle no */
  alumnosPorAparatoDia: 12,           /* hermanos y pruebas en un teléfono, sí; 40 alumnos falsos, no */
  alumnosPorIpHora: 400,
  alumnosPorEscuelaDia: 3000,
  pedidosPorAlumnoDia: 12,
  pedidosPorAparato10min: 10,
  pedidosPorIpMinuto: 300,            /* 160 pedidos en el mismo minuto desde el wifi escolar pasan */
  pedidosPorEscuela10min: 1500,
  eventosPorAparato10min: 400,
  fallasPasadorAparato15min: 6,
  fallasPasadorIp15min: 30,
  fallasPasadorEscuelaHora: 25,       /* pasado esto, sólo intentan los aparatos que ya entraron antes */
  codigosPorEscuelaHora: 400,
  codigosPorAparato10min: 10,
  codigosPorIp10min: 60,
  aparatosPorAlumno: 5,
  socketsPorEscuela: 4000,
  llaveDura: 14 * 60 * 60 * 1000,     /* un turno de trabajo, igual que el pase de la pantalla */
};
/* qué se guarda y por cuánto: lo de hoy es lo que importa; el historial vive
   en el mostrador y en sus CSV */
const GUARDA = { pedidos: 7 * DIA, eventos: 3 * DIA, conteos: 30 * DIA };

const RE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const RE_COD = /^[A-Z0-9]{4}$/;
const RE_APARATO = /^[a-f0-9]{32}$/;
const RE_LLAVE = /^[a-f0-9]{64}$/;
const EVENTOS_DEL_ALUMNO = ['pedido', 'cancelado', 'terminos', 'apartado', 'en_camino', 'revivido', 'cambio_por_falta', 'renuncia'];
const EVENTOS_A_LA_VISTA = ['renglon_listo', 'listo', 'tomado', 'producto_agotado', 'producto_vuelve', 'pedido'];

/* ── El Durable Object · uno por escuela ─────────────────────────────────── */
export class Cooperativa {
  constructor(ctx, env){
    this.ctx = ctx;
    this.env = env;
    this.topes = new Map();
    /* el latido lo contesta Cloudflare solo: no despierta al objeto ni cuenta
       como petición. Con 200 teléfonos latiendo cada 30 s, eso importa. */
    try{ ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong')); }catch(e){}
    this.listo = ctx.blockConcurrencyWhile(async () => {
      const g = ctx.storage;
      this.reloj = (await g.get('reloj')) || 0;
      this.turno = (await g.get('turno')) || { dia: 0, n: 0 };
      this.config = (await g.get('config')) || null;
      this.llaves = (await g.get('llaves')) || {};
      this.confiables = (await g.get('confiables')) || {};   /* aparatos que ya entraron al mostrador */
      this.vapid = (await g.get('vapid')) || null;
      this.subs = {};                                          /* aparato -> suscripción de notificaciones */
      for(const [k, v] of await g.list({ prefix: 'push:' })) this.subs[k.slice(5)] = v;
      this.limpiado = (await g.get('limpiado')) || 0;
      this.datos = {};
      for(const c of CAJONES) this.datos[c] = {};
      for(const [k, v] of await g.list({ prefix: 'r:' })){
        const i = k.indexOf(':', 2), c = k.slice(2, i);
        if(this.datos[c]) this.datos[c][k.slice(i + 1)] = v;
      }
      /* Migración: antes cada cajón era UN valor con todo adentro, y se
         reescribía entero en cada llamada. Con el uso de un mes rebasaba el
         tamaño máximo de un valor y el servidor moría para todos. */
      const viejos = [];
      for(const c of CAJONES){
        const v = await g.get(c);
        if(v && typeof v === 'object'){ Object.assign(this.datos[c], v); viejos.push(c); }
      }
      if(viejos.length){
        const todo = [];
        for(const c of CAJONES) for(const id in this.datos[c]) todo.push(['r:' + c + ':' + id, this.datos[c][id]]);
        await this.escribir(todo, viejos);
      }
      /* Carlos, 9 de octubre: el recreo es de 10:00 a 10:30. La hora de fábrica
         era 10:30; si nadie la había cambiado, se corrige una sola vez. */
      if(this.config && this.config.recreoInicia === '10:30' && !this.config._recreo){
        this.config.recreoInicia = '10:00'; this.config._recreo = 1;
        this.config.t = Math.max(Date.now(), (this.config.t || 0) + 1);
        this.reloj++; this.config._r = this.reloj;
        await g.put({ config: this.config, reloj: this.reloj });
      }
    });
  }

  /* ── la puerta del objeto ──────────────────────────────────────────── */
  async fetch(pedido){
    await this.listo;
    const url = new URL(pedido.url);
    const ruta = url.pathname;
    const ip = pedido.headers.get('x-fadori-ip') || 'sin-ip';
    const ap = pedido.headers.get('x-fadori-aparato') || url.searchParams.get('aparato') || '';
    const llave = pedido.headers.get('x-fadori-admin') || url.searchParams.get('admin') || '';
    const quien = { aparato: RE_APARATO.test(ap) ? ap : '', admin: this.esLlave(llave), llave, ip };

    if(!this.cuenta('req:' + ip, 60000, TOPE.peticionesPorIpMinuto))
      return json({ error: 'Demasiadas peticiones. Espera un minuto.' }, 429);

    if(ruta.endsWith('/vivo')) return this.enchufar(pedido, quien);
    if(ruta.endsWith('/todo')){
      if(!quien.admin) return json({ error: 'Sólo el mostrador.' }, 401);
      return json({ reloj: this.reloj, cambios: this.desde(0, quien), turno: this.turno });
    }

    if(ruta.endsWith('/push/clave')) return json({ clave: (await this.llavesVapid()).publica });

    if(pedido.method !== 'POST') return json({ error: 'No existe.' }, 404);
    const crudo = await pedido.text();
    if(crudo.length > (quien.admin ? TOPE.cuerpoMostrador : TOPE.cuerpoAlumno))
      return json({ error: 'Lo que mandaste es demasiado grande.' }, 413);
    let cuerpo = null;
    try{ cuerpo = JSON.parse(crudo); }catch(e){}
    if(!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo))
      return json({ error: 'El cuerpo no es JSON.' }, 400);

    if(ruta.endsWith('/sync')) return json(await this.sincronizar(cuerpo, quien));
    if(ruta.endsWith('/entrar')) return this.entrar(cuerpo, quien);
    if(ruta.endsWith('/salir')){
      if(quien.admin){ delete this.llaves[quien.llave]; await this.ctx.storage.put('llaves', this.llaves); }
      return json({ bien: true });
    }
    if(ruta.endsWith('/pasador')) return this.cambiarPasador(cuerpo, quien);
    if(ruta.endsWith('/codigo')) return this.porCodigo(cuerpo, quien);
    if(ruta.endsWith('/push/alta')) return this.altaPush(cuerpo, quien);
    if(ruta.endsWith('/push/baja')){
      if(quien.aparato && this.subs[quien.aparato]){ delete this.subs[quien.aparato]; await this.ctx.storage.delete('push:' + quien.aparato); }
      return json({ bien: true });
    }
    return json({ error: 'No existe.' }, 404);
  }

  /* ── las notificaciones del teléfono ───────────────────────────────── */
  async llavesVapid(){
    if(!this.vapid){ this.vapid = await nuevasLlavesVapid(); await this.ctx.storage.put('vapid', this.vapid); }
    return this.vapid;
  }
  async altaPush(cuerpo, quien){
    if(!quien.aparato) return json({ error: 'Actualiza la app.' }, 400);
    if(!suscripcionValida(cuerpo.sub, this.env && this.env.PUSH_PRUEBA)) return json({ error: 'Esa suscripción no es de un servicio de notificaciones.' }, 400);
    if(!this.subs[quien.aparato] && Object.keys(this.subs).length >= 6000) return json({ error: 'Demasiados aparatos.' }, 429);
    const s = { sub: { endpoint: cuerpo.sub.endpoint, keys: { p256dh: cuerpo.sub.keys.p256dh, auth: cuerpo.sub.keys.auth } },
                mostrador: !!quien.admin, t: Date.now() };
    this.subs[quien.aparato] = s;
    await this.ctx.storage.put('push:' + quien.aparato, s);
    return json({ bien: true });
  }
  /* Qué merece sonar en el bolsillo: que ya está, que se acabó algo, que la
     cooperativa lo canceló; y a la cooperativa, que llegó un pedido. Lo que
     se mueve en la fila se ve en la app, no se manda: serían veinte avisos
     por recreo y el alumno los apagaría todos. */
  notificar(tocados, quien){
    const envios = [];
    for(const [c, rec, previo] of tocados){
      if(c !== 'pedidos') continue;
      const n = rec.turno ? 'Turno ' + rec.turno : 'Tu pedido';
      if(rec.alumno){
        const avisos = [];
        if(rec.estado === 'listo' && (!previo || previo.estado !== 'listo'))
          avisos.push({ titulo: '¡Tu pedido ya está!', cuerpo: n + ' · ve por él al mostrador', tag: 'listo-' + rec.id });
        if(rec.avisoFalta && (!previo || !previo.avisoFalta || previo.avisoFalta.t !== rec.avisoFalta.t))
          avisos.push({ titulo: 'Se acabó algo de tu pedido', cuerpo: n + ' · abre la app y escoge otra cosa', tag: 'falta-' + rec.id });
        if(quien.admin && rec.estado === 'cancelado' && previo && previo.estado !== 'cancelado' && !rec.porFalta)
          avisos.push({ titulo: 'Tu pedido se canceló', cuerpo: n + ' · lo canceló la cooperativa', tag: 'cancelado-' + rec.id });
        const a = this.datos.alumnos[rec.alumno];
        for(const ap of (a && a._dev) || []) for(const av of avisos) envios.push([ap, Object.assign({ url: 'index.html' }, av)]);
      }
      if(!previo && !quien.admin && rec.origen === 'app' && rec.estado === 'en_cola'){
        for(const ap in this.subs) if(this.subs[ap].mostrador)
          envios.push([ap, { titulo: 'Nuevo pedido · ' + n, cuerpo: (rec.nombre || '') + (rec.grupo ? ' · ' + rec.grupo : ''), tag: 'nuevo-' + rec.id, url: 'mostrador.html' }]);
      }
    }
    if(!envios.length) return;
    const p = (async () => {
      const vapid = await this.llavesVapid();
      await Promise.allSettled(envios.map(async ([ap, av]) => {
        const s = this.subs[ap]; if(!s) return;
        const st = await mandar(vapid, s.sub, av, CONTACTO).catch(() => 0);
        /* 404/410: esa suscripción ya no existe (desinstaló, borró datos) */
        if(st === 404 || st === 410){ delete this.subs[ap]; await this.ctx.storage.delete('push:' + ap); }
      }));
    })();
    try{ this.ctx.waitUntil(p); }catch(e){}
  }

  /* ── el mostrador entra ────────────────────────────────────────────── */
  async entrar(cuerpo, quien){
    const kAp = 'pase:ap:' + (quien.aparato || 'anon'), kIp = 'pase:ip:' + quien.ip, kEsc = 'pase:escuela';
    const confiable = !!(quien.aparato && this.confiables[quien.aparato]);
    if(this.lleva(kAp, 15 * 60000) >= TOPE.fallasPasadorAparato15min ||
       (!confiable && this.lleva(kIp, 15 * 60000) >= TOPE.fallasPasadorIp15min))
      return json({ error: 'Demasiados intentos. Espera 15 minutos.' }, 429);
    /* Alguien está probando pasadores desde muchos teléfonos o muchas redes
       (el tope por red no lo frena: en producción cada intento puede salir de
       otra IP). Entonces sólo prueban los aparatos que YA entraron alguna vez:
       la tablet de la cooperativa entra; el de afuera se queda afuera. */
    if(!confiable && this.lleva(kEsc, 60 * 60000) >= TOPE.fallasPasadorEscuelaHora)
      return json({ error: 'Demasiados intentos en esta escuela. Entra desde la tablet de siempre o espera una hora.' }, 429);
    const bueno = String((this.config && this.config.pasador) || '1234');
    if(!igual(String(cuerpo.pasador || '').slice(0, 20), bueno)){
      this.suma(kAp, 15 * 60000); this.suma(kIp, 15 * 60000); this.suma(kEsc, 60 * 60000);
      return json({ error: 'Ese no es el pasador.' }, 401);
    }
    const ahora = Date.now();
    for(const k in this.llaves) if(this.llaves[k] < ahora) delete this.llaves[k];
    const llave = hex(32), vence = ahora + TOPE.llaveDura;
    this.llaves[llave] = vence;
    if(quien.aparato){
      this.confiables[quien.aparato] = ahora;
      const lista = Object.entries(this.confiables).sort((a, b) => b[1] - a[1]).slice(0, 20);
      this.confiables = Object.fromEntries(lista);
    }
    await this.ctx.storage.put({ llaves: this.llaves, confiables: this.confiables });
    return json({ token: llave, vence });
  }

  esLlave(llave){
    return typeof llave === 'string' && RE_LLAVE.test(llave) && (this.llaves[llave] || 0) > Date.now();
  }

  async cambiarPasador(cuerpo, quien){
    if(!quien.admin) return json({ error: 'Sólo el mostrador.' }, 401);
    const n = String(cuerpo.nuevo || '');
    if(!/^\d{4,12}$/.test(n)) return json({ error: 'El pasador va de 4 a 12 números.' }, 400);
    this.config = Object.assign({}, this.config || {}, { pasador: n });
    /* un pasador nuevo invalida todas las llaves, menos la de quien lo cambió */
    this.llaves = { [quien.llave]: this.llaves[quien.llave] };
    await this.ctx.storage.put({ config: this.config, llaves: this.llaves });
    return json({ bien: true });
  }

  /* ── «Ya tenías código»: el mismo alumno en otro teléfono ──────────── */
  async porCodigo(cuerpo, quien){
    if(!quien.aparato) return json({ error: 'Actualiza la app.' }, 400);
    if(!this.cuenta('cod:ap:' + quien.aparato, 10 * 60000, TOPE.codigosPorAparato10min) ||
       !this.cuenta('cod:ip:' + quien.ip, 10 * 60000, TOPE.codigosPorIp10min) ||
       !this.cuenta('cod:escuela', 60 * 60000, TOPE.codigosPorEscuelaHora))
      return json({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);
    const cod = String(cuerpo.codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const a = RE_COD.test(cod) && this.datos.alumnos[cod];
    if(!a) return json({ error: 'No hay nadie con ese código.' }, 404);
    const dev = (a._dev || []).filter(x => x !== quien.aparato);
    dev.push(quien.aparato);
    a._dev = dev.slice(-TOPE.aparatosPorAlumno);
    await this.ctx.storage.put('r:alumnos:' + cod, a);
    const suyos = Object.values(this.datos.pedidos).filter(p => p.alumno === cod).map(p => sinInternos(p));
    return json({ alumno: sinInternos(a), pedidos: suyos });
  }

  /* ── El WebSocket: empuja los cambios ya filtrados para cada quien ─── */
  enchufar(pedido, quien){
    if(pedido.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
      return json({ error: 'Esto es para WebSocket.' }, 426);
    if(this.ctx.getWebSockets().length >= TOPE.socketsPorEscuela)
      return json({ error: 'Demasiadas conexiones.' }, 429);
    const par = new WebSocketPair();
    const [cliente, servidor] = Object.values(par);
    const etiquetas = ['ap:' + (quien.aparato || 'anon')];
    if(quien.admin) etiquetas.push('llave:' + quien.llave);
    /* hibernación: el objeto se duerme con los sockets abiertos y no cobra
       tiempo mientras nadie habla */
    this.ctx.acceptWebSocket(servidor, etiquetas);
    servidor.send(JSON.stringify({ tipo: 'reloj', reloj: this.reloj }));
    return new Response(null, { status: 101, webSocket: cliente });
  }
  webSocketMessage(){ /* el latido lo contesta Cloudflare solo; lo demás se ignora */ }
  webSocketClose(){}
  webSocketError(){}

  quienDe(ws){
    let aparato = '', llave = '';
    for(const t of this.ctx.getTags(ws)){
      if(t.startsWith('ap:')) aparato = t.slice(3);
      if(t.startsWith('llave:')) llave = t.slice(6);
    }
    return { aparato: RE_APARATO.test(aparato) ? aparato : '', admin: this.esLlave(llave) };
  }

  /* Antes se mandaba «hubo cambio, ven por él» y CADA teléfono volvía a
     preguntar: con 80 alumnos, cada movimiento eran 80 peticiones y el plan
     gratis se acababa en dos recreos. Ahora va el cambio mismo, recortado a
     lo que ese aparato puede ver. */
  avisar(tocados, configTocada, antes){
    for(const ws of this.ctx.getWebSockets()){
      try{
        const quien = this.quienDe(ws), cambios = {};
        for(const [c, rec] of tocados){
          const v = this.vista(c, rec, quien);
          if(v) (cambios[c] = cambios[c] || []).push(v);
        }
        if(configTocada && this.config) cambios.config = configPublica(this.config);
        ws.send(JSON.stringify({ tipo: 'cambios', reloj: this.reloj, antes, cambios }));
      }catch(e){}
    }
  }

  /* ── La mezcla ────────────────────────────────────────────────────── */
  async sincronizar(cuerpo, quien){
    const desde = Number(cuerpo.desde) || 0;
    const cambios = cuerpo.cambios && typeof cuerpo.cambios === 'object' ? cuerpo.cambios : {};
    const nuevo = this.reloj + 1, ahora = Date.now();
    const rechazados = [], tocados = [];
    let configTocada = false, turnoTocado = false;
    const rechaza = (cajon, id, por) => rechazados.push({ cajon, id: String(id || '').slice(0, 40), por });
    const poner = (c, rec) => { const previo = this.datos[c][rec.id]; rec._r = nuevo; this.datos[c][rec.id] = rec; tocados.push([c, rec, previo]); };
    const lista = (c) => Array.isArray(cambios[c]) ? cambios[c].slice(0, quien.admin ? 5000 : TOPE.registrosPorVuelta) : [];

    /* ── el mostrador: confía, pero limpia ──────────────────────────── */
    if(quien.admin){
      const cfg = cambios.config;
      if(cfg && typeof cfg === 'object' && (!this.config || (Number(cfg.t) || 0) > (this.config.t || 0))){
        this.config = Object.assign(limpiarConfig(cfg), {
          pasador: this.config && this.config.pasador,       /* el pasador sólo cambia por /api/pasador */
          _recreo: this.config && this.config._recreo, _r: nuevo });
        configTocada = true;
      }
      for(const c of CAJONES){
        for(const r of lista(c)){
          if(!r || typeof r !== 'object' || !RE_ID.test(String(r.id || ''))){ rechaza(c, r && r.id, 'invalido'); continue; }
          const viejo = this.datos[c][r.id], t = Number(r.t) || 0;
          if(viejo && !(t > (viejo.t || 0) || (t === (viejo.t || 0) && r.id > viejo.id))) continue;
          const rec = limpiarRegistro(r, c === 'productos' ? 1600000 : 4000);
          if(!rec){ rechaza(c, r.id, 'grande'); continue; }
          if(c === 'alumnos' && viejo) rec._dev = viejo._dev;
          if(c === 'pedidos'){
            const teniaTurno = rec.turno !== null && rec.turno !== undefined;
            if(viejo && viejo.turno) rec.turno = viejo.turno;
            else if(!teniaTurno && (rec.estado === undefined || VIVOS.indexOf(rec.estado) >= 0)){ rec.turno = this.siguienteTurno(); turnoTocado = true; }
            if(!teniaTurno && rec.turno) rec.t = Math.max(t + 1, ahora);
          }
          poner(c, rec);
        }
      }
    } else {
      /* ── un teléfono de alumno: sólo lo suyo, y sólo lo permitido ───── */
      if(!quien.aparato){
        for(const c of CAJONES) for(const r of lista(c)) rechaza(c, r && r.id, 'actualiza');
      } else {
        for(const c of ['productos', 'conteos']) for(const r of lista(c)) rechaza(c, r && r.id, 'pasador');
        if(cambios.config) rechaza('config', 'config', 'pasador');

        for(const r of lista('alumnos')) this.alumnoDeTelefono(r, quien, { ahora, poner, rechaza });
        for(const r of lista('pedidos')){
          if(this.pedidoDeTelefono(r, quien, { ahora, poner, rechaza })) turnoTocado = true;
        }
        let ev = 0;
        for(const r of lista('eventos')){
          if(++ev > 40 || !this.cuenta('ev:ap:' + quien.aparato, 10 * 60000, TOPE.eventosPorAparato10min)) break;
          if(!r || !RE_ID.test(String(r.id || '')) || this.datos.eventos[r.id]) continue;
          if(EVENTOS_DEL_ALUMNO.indexOf(r.tipo) < 0) continue;
          poner('eventos', {
            id: r.id, tipo: r.tipo, t: Math.min(ahora, Math.max(ahora - DIA, Number(r.t) || ahora)),
            pedido: texto(r.pedido, 40), total: entero(r.total, 0, 1e6, 0), seg: entero(r.seg, 0, 3600, 0),
            anticipado: !!r.anticipado, origen: texto(r.origen, 12), por: texto(r.por, 20),
            de: texto(r.de, 40), a: texto(r.a, 40), quien: r.quien === 'alumno' ? 'alumno' : '',
          });
        }
      }
    }

    if(tocados.length || configTocada){
      const antes = this.reloj;
      this.reloj = nuevo;
      const escribe = tocados.map(([c, rec]) => ['r:' + c + ':' + rec.id, rec]);
      escribe.push(['reloj', this.reloj]);
      if(turnoTocado) escribe.push(['turno', this.turno]);
      if(configTocada) escribe.push(['config', this.config]);
      await this.escribir(escribe);
      this.avisar(tocados, configTocada, antes);
      this.notificar(tocados, quien);
    }
    if(ahora - this.limpiado > 60 * 60000) await this.limpiar(ahora);

    return { reloj: this.reloj, cambios: this.desde(desde, quien), turno: this.turno, rechazados };
  }

  alumnoDeTelefono(r, quien, { ahora, poner, rechaza }){
    const id = String(r && (r.id || r.codigo) || '').toUpperCase();
    if(!r || !RE_COD.test(id) || String(r.codigo || id).toUpperCase() !== id) return rechaza('alumnos', id, 'invalido');
    const viejo = this.datos.alumnos[id];
    if(!viejo){
      if(!this.cuenta('alu:ap:' + quien.aparato, DIA, TOPE.alumnosPorAparatoDia) ||
         !this.cuenta('alu:ip:' + quien.ip, 60 * 60000, TOPE.alumnosPorIpHora) ||
         !this.cuenta('alu:escuela', DIA, TOPE.alumnosPorEscuelaDia)) return rechaza('alumnos', id, 'tope');
      return poner('alumnos', {
        id, codigo: id, nombre: nombre(r.nombre) || 'Sin nombre', grupo: texto(r.grupo, 8).toUpperCase(),
        terminos: entero(r.terminos, 0, ahora, 0), deuda: 0, creado: ahora,
        t: Math.min(Number(r.t) || ahora, ahora), _dev: [quien.aparato],
      });
    }
    const dev = viejo._dev || [];
    if(dev.length && dev.indexOf(quien.aparato) < 0) return rechaza('alumnos', id, 'ajeno');
    const t = Number(r.t) || 0;
    if(!(t > (viejo.t || 0))) return;
    poner('alumnos', Object.assign({}, viejo, {
      nombre: nombre(r.nombre) || viejo.nombre, grupo: texto(r.grupo, 8).toUpperCase() || viejo.grupo,
      terminos: Math.max(viejo.terminos || 0, entero(r.terminos, 0, ahora, 0)), t,
      _dev: dev.length ? dev : [quien.aparato],
    }));
  }

  /* devuelve true si se repartió un turno */
  pedidoDeTelefono(r, quien, { ahora, poner, rechaza }){
    if(!r || typeof r !== 'object' || !RE_ID.test(String(r.id || ''))) { rechaza('pedidos', r && r.id, 'invalido'); return false; }
    const viejo = this.datos.pedidos[r.id];
    const esDeEl = (cod) => { const a = this.datos.alumnos[cod]; return !!a && (a._dev || []).indexOf(quien.aparato) >= 0; };
    const catalogo = this.datos.productos, hayMenu = Object.keys(catalogo).length > 0;

    if(!viejo){
      if(!esDeEl(r.alumno)) { rechaza('pedidos', r.id, 'ajeno'); return false; }
      const estado = r.estado === 'cancelado' ? 'cancelado' : 'en_cola';
      const renglones = renglonesLimpios(r.renglones);
      if(!renglones) { rechaza('pedidos', r.id, 'vacio'); return false; }
      if(hayMenu){
        for(const x of renglones){
          const p = catalogo[x.prod];
          if(!p) { rechaza('pedidos', r.id, 'no existe'); return false; }
          if(estado === 'en_cola' && p.disponible === false) { rechaza('pedidos', r.id, 'agotado'); return false; }
        }
      }
      const hoy = mx(ahora).dia;
      const suyos = Object.values(this.datos.pedidos).filter(p => p.alumno === r.alumno && mx(p.creado || 0).dia === hoy);
      const tope = entero(this.config && this.config.topeporAlumno, 1, 10, 3);
      if(estado === 'en_cola' && suyos.filter(p => VIVOS.indexOf(p.estado) >= 0).length >= tope) { rechaza('pedidos', r.id, 'tope'); return false; }
      if(suyos.length >= TOPE.pedidosPorAlumnoDia) { rechaza('pedidos', r.id, 'tope'); return false; }
      if(!this.cuenta('ped:ap:' + quien.aparato, 10 * 60000, TOPE.pedidosPorAparato10min) ||
         !this.cuenta('ped:ip:' + quien.ip, 60000, TOPE.pedidosPorIpMinuto) ||
         !this.cuenta('ped:escuela', 10 * 60000, TOPE.pedidosPorEscuela10min)) { rechaza('pedidos', r.id, 'tope'); return false; }
      const a = this.datos.alumnos[r.alumno], cfg = this.config || {};
      const total = hayMenu ? renglones.reduce((s, x) => s + (entero(catalogo[x.prod].precio, 0, 1e6, 0) * x.cant), 0)
                            : entero(r.total, 0, 1e6, 0);
      /* anticipado = pedido ANTES de que suene la chicharra, y lo decide el
         reloj del servidor: palomearlo a media fila era colarse */
      const anticipado = !!r.anticipado && cfg.aceptaAnticipados !== false && mx(ahora).min < minutos(cfg.recreoInicia || '10:00');
      const turno = estado === 'en_cola' ? this.siguienteTurno() : null;
      poner('pedidos', {
        id: r.id, folio: /^[A-Z0-9]{4,6}$/.test(String(r.folio || '')) ? r.folio : hex(2).toUpperCase(),
        alumno: r.alumno, nombre: a.nombre, grupo: a.grupo, renglones, total, pagado: 0,
        /* la hora la pone el servidor; a lo mucho se le cree 10 minutos atrás
           (el que pidió sin señal), nunca las 7 de la mañana */
        creado: Math.min(ahora, Math.max(ahora - 10 * 60000, Number(r.creado) || ahora)),
        estado, anticipado, nota: texto(r.nota, 140), origen: 'app', despachador: null,
        tomado: 0, listoEn: 0, entregado: 0, cancelado: estado === 'cancelado' ? ahora : 0,
        turno, t: Math.max((Number(r.t) || 0) + 1, ahora),
      });
      return turno !== null;
    }

    if(!esDeEl(viejo.alumno)) { rechaza('pedidos', r.id, 'ajeno'); return false; }
    const t = Number(r.t) || 0;
    if(!(t > (viejo.t || 0))) return false;
    const rec = Object.assign({}, viejo);
    /* el alumno sólo puede: cancelar lo que sigue en la fila, apartarlo, y
       revivir lo que se canceló porque se acabó algo */
    if(r.estado !== viejo.estado){
      const sePuede = (viejo.estado === 'en_cola' && (r.estado === 'cancelado' || r.estado === 'apartado')) ||
                      (viejo.estado === 'cancelado' && viejo.porFalta && (r.estado === 'en_cola' || r.estado === 'apartado'));
      if(sePuede){
        rec.estado = r.estado;
        if(r.estado === 'cancelado') rec.cancelado = Date.now();
        if(r.estado === 'en_cola'){ rec.porFalta = false; rec.cancelado = 0; }
      }
    }
    /* cambiar o quitar lo que se acabó; NUNCA agregar después de pedido */
    if(Array.isArray(r.renglones) && ['en_cola', 'preparando', 'cancelado'].indexOf(viejo.estado) >= 0 &&
       r.renglones.length <= (viejo.renglones || []).length){
      const nuevos = renglonesLimpios(r.renglones, true);
      if(nuevos && (!hayMenu || nuevos.every(x => catalogo[x.prod]))){
        const usados = new Set();
        rec.renglones = nuevos.map((x, i) => {
          const j = (viejo.renglones || []).findIndex((v, k) => !usados.has(k) && v.prod === x.prod && v.cant >= x.cant);
          if(j >= 0){ usados.add(j); const v = viejo.renglones[j]; return Object.assign({}, x, { cant: Math.min(x.cant, v.cant), listo: !!v.listo, sinSurtir: v.sinSurtir || 0 }); }
          const antes = (viejo.renglones || [])[i];
          return Object.assign({}, x, { cant: Math.min(x.cant, antes ? antes.cant : 1), listo: false, sinSurtir: 0 });
        });
        if(hayMenu) rec.total = rec.renglones.filter(x => !x.sinSurtir).reduce((s, x) => s + entero(catalogo[x.prod].precio, 0, 1e6, 0) * x.cant, 0);
        if(!rec.renglones.length && rec.estado !== 'cancelado'){ rec.estado = 'cancelado'; rec.cancelado = Date.now(); }
      }
    }
    if(r.enCamino && !viejo.enCamino) rec.enCamino = Date.now();
    if(r.porFalta === false) rec.porFalta = false;
    if(r.avisoFalta == null && viejo.avisoFalta) rec.avisoFalta = null;
    rec.t = t;
    const igualQue = (x) => JSON.stringify(Object.assign({}, x, { t: 0, _r: 0 }));
    if(igualQue(rec) !== igualQue(viejo)) poner('pedidos', rec);
    return false;
  }

  siguienteTurno(){
    const dia = mx(Date.now()).dia;
    if(this.turno.dia !== dia) this.turno = { dia, n: 0 };
    this.turno.n++;
    return this.turno.n;
  }

  /* lo que ve cada quien de un registro (null = nada) */
  vista(c, rec, quien){
    if(quien.admin) return sinInternos(rec);
    if(c === 'productos') return sinInternos(rec);
    if(c === 'conteos') return null;
    const mio = (cod) => { const a = this.datos.alumnos[cod]; return !!a && !!quien.aparato && (a._dev || []).indexOf(quien.aparato) >= 0; };
    if(c === 'alumnos') return mio(rec.id) ? sinInternos(rec) : null;
    if(c === 'pedidos'){
      if(mio(rec.alumno)) return sinInternos(rec);
      /* de los demás, sólo lo que hace falta para saber tu lugar en la fila */
      return { id: rec.id, turno: rec.turno, estado: rec.estado, creado: rec.creado, anticipado: rec.anticipado,
        tomado: rec.tomado, listoEn: rec.listoEn, entregado: rec.entregado, origen: rec.origen, t: rec.t, _r: rec._r,
        renglones: (rec.renglones || []).map(x => ({ prod: x.prod, cant: x.cant, listo: !!x.listo, sinSurtir: x.sinSurtir || 0 })) };
    }
    if(c === 'eventos'){
      if(EVENTOS_A_LA_VISTA.indexOf(rec.tipo) < 0) return null;
      return { id: rec.id, t: rec.t, tipo: rec.tipo, prod: rec.prod, dur: rec.dur, seg: rec.seg, pedido: rec.pedido, _r: rec._r };
    }
    return null;
  }

  desde(r, quien){
    const salida = {};
    for(const c of CAJONES){
      salida[c] = [];
      for(const id in this.datos[c]){
        const rec = this.datos[c][id];
        if((rec._r || 0) > r){ const v = this.vista(c, rec, quien); if(v) salida[c].push(v); }
      }
    }
    if(this.config && (this.config._r || 0) > r) salida.config = configPublica(this.config);
    return salida;
  }

  /* lo viejo se va: el servidor sólo necesita la operación de estos días */
  async limpiar(ahora){
    this.limpiado = ahora;
    const borrar = [];
    for(const c in GUARDA){
      for(const id in this.datos[c]){
        const rec = this.datos[c][id], cuando = rec.creado || rec.t || 0;
        if(cuando < ahora - GUARDA[c]){ delete this.datos[c][id]; borrar.push('r:' + c + ':' + id); }
      }
    }
    await this.escribir([['limpiado', ahora]], borrar);
  }

  async escribir(pares, borrar = []){
    const g = this.ctx.storage;
    for(let i = 0; i < pares.length; i += 128) await g.put(Object.fromEntries(pares.slice(i, i + 128)));
    for(let i = 0; i < borrar.length; i += 128) await g.delete(borrar.slice(i, i + 128));
  }

  /* ── los topes: contadores de ventana en memoria ─────────────────── */
  cuenta(clave, ventana, max){
    const t = Date.now();
    let v = this.topes.get(clave);
    if(!v || t - v.ini > ventana){ v = { ini: t, n: 0 }; this.topes.set(clave, v); }
    if(v.n >= max) return false;
    v.n++;
    if(this.topes.size > 20000) for(const [k, x] of this.topes) if(t - x.ini > DIA) this.topes.delete(k);
    return true;
  }
  lleva(clave, ventana){
    const v = this.topes.get(clave);
    return v && Date.now() - v.ini <= ventana ? v.n : 0;
  }
  suma(clave, ventana){
    const t = Date.now(); let v = this.topes.get(clave);
    if(!v || t - v.ini > ventana){ v = { ini: t, n: 0 }; this.topes.set(clave, v); }
    v.n++;
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
      /* lo enorme ni siquiera llega al objeto */
      if(Number(pedido.headers.get('content-length') || 0) > TOPE.cuerpoMostrador)
        return json({ error: 'Lo que mandaste es demasiado grande.' }, 413, cabezas);
      /* Una casa = una escuela = un Durable Object. */
      const casa = (url.searchParams.get('casa') || 'rembrandt')
        .toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'rembrandt';
      /* la IP la pone Cloudflare, no el que llama: así no se puede inventar */
      const h = new Headers(pedido.headers);
      h.set('x-fadori-ip', pedido.headers.get('CF-Connecting-IP') || 'local');
      const limpio = new Request(pedido, { headers: h });
      const id = env.COOPERATIVA.idFromName(casa);
      const r = await env.COOPERATIVA.get(id).fetch(limpio);
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
    'Access-Control-Allow-Headers': 'content-type,x-fadori-aparato,x-fadori-admin',
    'Access-Control-Max-Age': '86400',
  };
  /* Sin comodín a propósito: se responde el origen SÓLO si está en la lista. */
  if(origen && (lista.indexOf(origen) >= 0 || esVistaPrevia(origen, env)))
    h['Access-Control-Allow-Origin'] = origen;
  return h;
}

/* Las vistas previas de Cloudflare · sólo las que cuelgan del subdominio del
   proyecto: nadie más que Cloudflare puede crear un nombre ahí. */
function esVistaPrevia(origen, env){
  const base = String(env.VISTAS_PREVIAS || '').trim();
  if(!base) return false;
  let host;
  try{ const u = new URL(origen); if(u.protocol !== 'https:') return false; host = u.host; }
  catch(e){ return false; }
  return host.endsWith('-' + base) || host === base;
}

function json(o, estado, cabezas){
  return new Response(JSON.stringify(o), {
    status: estado || 200,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, cabezas || {}),
  });
}

function texto(v, max){
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function nombre(v){ return texto(v, 40); }
function entero(v, min, max, def){
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}
function minutos(hhmm){
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : 600;
}
function hex(n){
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}
/* comparar sin delatar por cuánto tardó cuántas letras atinaste */
function igual(a, b){
  let d = a.length ^ b.length;
  for(let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function sinInternos(rec){
  const c = Object.assign({}, rec);
  delete c._dev;
  return c;
}
function configPublica(cfg){
  const c = Object.assign({}, cfg);
  delete c.pasador; delete c._recreo;
  return c;
}
/* los ajustes: sólo lo que existe, con su tipo y su rango */
function limpiarConfig(cfg){
  const c = {};
  for(const k in cfg){
    if(k === 'pasador' || k.startsWith('_')) continue;
    const v = cfg[k];
    if(typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) c[k] = v;
    else if(typeof v === 'string') c[k] = v.slice(0, 200);
  }
  if(c.recreoInicia && !/^\d{1,2}:\d{2}$/.test(c.recreoInicia)) c.recreoInicia = '10:00';
  if('topeporAlumno' in c) c.topeporAlumno = entero(c.topeporAlumno, 1, 10, 3);
  if('recreoMinutos' in c) c.recreoMinutos = entero(c.recreoMinutos, 5, 180, 30);
  c.t = Number(cfg.t) || Date.now();
  return c;
}
/* lo del mostrador: se le cree, pero con tope de tamaño y sin campos internos */
function limpiarRegistro(r, maxBytes){
  const c = {};
  for(const k in r){ if(!k.startsWith('_')) c[k] = r[k]; }
  let n = 0; try{ n = JSON.stringify(c).length; }catch(e){ return null; }
  if(n > maxBytes) return null;
  c.t = Number(r.t) || 0;
  return c;
}
function renglonesLimpios(lista, dejarVacio){
  if(!Array.isArray(lista)) return null;
  const out = lista.slice(0, 10).filter(x => x && typeof x === 'object' && RE_ID.test(String(x.prod || '')))
    .map(x => ({ prod: String(x.prod), cant: entero(x.cant, 1, 10, 1), para: nombre(x.para), listo: false }));
  if(!out.length && !dejarVacio) return null;
  return out;
}
/* el día y la hora de México: el turno vuelve a 1 cada mañana de allá, no a
   las 6 de la tarde cuando en Greenwich ya es otro día */
const FMT = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function mx(ms){
  const p = {};
  for(const x of FMT.formatToParts(new Date(ms))) p[x.type] = x.value;
  return { dia: Number(p.year + p.month + p.day), min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}
