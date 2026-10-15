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
import { rutaSociedad } from './sociedad.js';

const CAJONES = ['productos', 'alumnos', 'pedidos', 'conteos', 'eventos'];
const CONTACTO = 'mailto:grupomazi.oficial@gmail.com';
const VIVOS = ['en_cola', 'preparando', 'listo'];
/* EL MENÚ INVENTADO DEL ARRANQUE (pozole, chilaquiles, el guisado…). Nadie lo
   vende; la app lo retiró el 9 de octubre y el 12 resucitó porque un aparato
   con una copia vieja lo subió con hora nueva. Carlos lo vio el 14: «el guiso
   de arroz quítalo». Ahora el servidor NO deja que regrese, venga de quien
   venga, y al arrancar retira lo que haya quedado vivo. */
const RETIRADOS = new Set(['guisado del dia con arroz', 'pozole', 'chilaquiles', 'torta de jamon', 'sandwich',
  'tacos dorados', 'tamal', 'agua del dia', 'refresco', 'jugo', 'gelatina', 'galletas', 'pastelito', 'papas',
  'cacahuates', 'peelers', 'galletas de $25', 'galletas de $15']);
const nombreLlano = (n) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const esRetirado = (p) => p && RETIRADOS.has(nombreLlano(p.nombre));
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
  /* LAS CUENTAS (10 de octubre) */
  credencialBytes: 140 * 1024,        /* la foto ya llega achicada del teléfono: ~60 KB */
  credencialesPorAlumnoHora: 4,
  credencialesPendientes: 600,        /* más que eso es un ataque, no una escuela */
  correoPorAparato10min: 10,          /* entrar con correo */
  correoPorIp10min: 80,
  correoPorEscuelaHora: 600,
  fallasPorCuenta15min: 8,            /* adivinar la contraseña de UNA cuenta */
  recuperarPorAparato15min: 5,
  recuperarPorEscuelaHora: 120,
  iteraciones: 10000,                 /* PBKDF2: barato para el servidor gratis, caro para quien adivina */
  /* EL BUZÓN DE LA PANTALLA: el plan gratis da 1 GB por objeto (documentación de
     Durable Objects, 11 de octubre) y cada valor hasta 2 MB */
  medioParte: 1536 * 1024,
  medioMax: 800 * 1e6,
  mediosObjeto: 650 * 1e6,          /* los otros 250 MB son de la sociedad de alumnos */
  mediosR2: 8 * 1e9,
};
/* qué se guarda y por cuánto: lo de hoy es lo que importa; el historial vive
   en el mostrador y en sus CSV */
const GUARDA = { pedidos: 7 * DIA, eventos: 3 * DIA, conteos: 30 * DIA };

const RE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const RE_COD = /^[A-Z0-9]{4}$/;
const RE_APARATO = /^[a-f0-9]{32}$/;
const RE_LLAVE = /^[a-f0-9]{64}$/;
/* cuánto mueve la deuda cada movimiento, en centavos (los manda el mostrador) */
const DELTA_DEUDA = {
  deuda: (e) => entero(e.monto, 0, 1e7, 0),
  abono: (e) => -entero(e.monto, 0, 1e7, 0),
  deuda_ajuste: (e) => entero(e.despues, 0, 1e7, 0) - entero(e.antes, 0, 1e7, 0),
};
const PLAZO_CANCELAR = 6 * 60000;   /* 5 min que ve el alumno + 1 de gracia */
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
      this.transmision = (await g.get('transmision')) || null;   /* el partido en vivo: marcador, llaves, fuente */
      this.datos = {};
      for(const c of CAJONES) this.datos[c] = {};
      for(const [k, v] of await g.list({ prefix: 'r:' })){
        const i = k.indexOf(':', 2), c = k.slice(2, i);
        if(this.datos[c]) this.datos[c][k.slice(i + 1)] = v;
      }
      /* correo (su huella) → alumno, para «entrar con mi correo» */
      this.correos = {};
      for(const id in this.datos.alumnos){ const a = this.datos.alumnos[id]; if(a._cuenta && a._cuenta.correo) this.correos[a._cuenta.correo] = id; }
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
      /* el menú inventado que resucitó: fuera, una sola vez por arranque (no
         toca nada si ya está retirado), y la torta de milanesa a su precio
         real si trae el inventado. Y el tope de pedidos que pidió Carlos el 14
         de octubre: de 3 a 5. */
      const arreglo = [];
      for(const id in this.datos.productos){
        const p = this.datos.productos[id];
        let n = null;
        if(esRetirado(p) && !p.borrado) n = Object.assign({}, p, { borrado: true, disponible: false, destacado: false });
        else if(id === 'pb-torta-de-milanesa' && p.precio === 3800) n = Object.assign({}, p, { precio: 5000 });
        if(n){ n.t = Math.max(Date.now(), (p.t || 0) + 1); arreglo.push(n); }
      }
      if(arreglo.length){
        this.reloj++;
        const escr = [];
        for(const n of arreglo){ n._r = this.reloj; this.datos.productos[n.id] = n; escr.push(['r:productos:' + n.id, n]); }
        await this.escribir(escr, []);
        await g.put('reloj', this.reloj);
      }
      if(this.config && this.config.topeporAlumno === 3 && !this.config._tope5){
        this.config.topeporAlumno = 5; this.config._tope5 = 1;
        this.config.t = Math.max(Date.now(), (this.config.t || 0) + 1);
        this.reloj++; this.config._r = this.reloj;
        await g.put({ config: this.config, reloj: this.reloj });
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

    /* la sociedad de alumnos: su propio módulo, con la misma cuenta. Va
       antes que todo: «/soc/todo» también acaba en «/todo» */
    if(ruta.indexOf('/soc/') >= 0) return rutaSociedad(this, ruta, url, pedido, quien, { json });
    if(ruta.endsWith('/vivo')) return this.enchufar(pedido, quien);
    if(ruta.endsWith('/todo')){
      if(!quien.admin) return json({ error: 'Sólo el mostrador.' }, 401);
      return json({ reloj: this.reloj, cambios: this.desde(0, quien), turno: this.turno });
    }

    if(ruta.endsWith('/push/clave')) return json({ clave: (await this.llavesVapid()).publica });
    /* los medios de la pantalla van ANTES de leer el cuerpo como texto: los
       pedazos de video son binarios */
    if(ruta.indexOf('/medios/') >= 0) return this.rutaMedios(ruta, url, pedido, quien);

    if(pedido.method !== 'POST') return json({ error: 'No existe.' }, 404);
    const crudo = await pedido.text();
    if(crudo.length > (quien.admin ? TOPE.cuerpoMostrador : TOPE.cuerpoAlumno))
      return json({ error: 'Lo que mandaste es demasiado grande.' }, 413);
    let cuerpo = null;
    try{ cuerpo = JSON.parse(crudo); }catch(e){}
    if(!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo))
      return json({ error: 'El cuerpo no es JSON.' }, 400);

    if(ruta.endsWith('/sync')) return json(await this.sincronizar(cuerpo, quien));
    /* las de la cuenta van ANTES: «/cuenta/entrar» también acaba en «/entrar»
       y se iba a la puerta del mostrador */
    if(ruta.indexOf('/cuenta/') >= 0) return this.rutaCuenta(ruta, cuerpo, quien);
    if(ruta.endsWith('/entrar')) return this.entrar(cuerpo, quien);
    if(ruta.endsWith('/salir')){
      if(quien.admin){ delete this.llaves[quien.llave]; await this.ctx.storage.put('llaves', this.llaves); }
      return json({ bien: true });
    }
    if(ruta.endsWith('/pasador')) return this.cambiarPasador(cuerpo, quien);
    if(ruta.endsWith('/transmision')) return this.ponerTransmision(cuerpo, quien);
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
    const bueno = String((this.config && this.config.pasador) || '121026');
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
    /* con contraseña, el código solo ya no abre la cuenta: el código se ve
       en la pantalla del teléfono y cualquiera que lo vio podía pedir a tu
       nombre. Ahora se entra con el correo y la contraseña. */
    if(a._cuenta) return json({ error: 'Esta cuenta tiene contraseña: entra con tu correo.', conCorreo: true }, 403);
    return this.abrirEn(a, quien);
  }
  /* el alumno queda abierto también en este teléfono */
  async abrirEn(a, quien){
    const cod = a.id;
    const dev = (a._dev || []).filter(x => x !== quien.aparato);
    dev.push(quien.aparato);
    a._dev = dev.slice(-TOPE.aparatosPorAlumno);
    await this.ctx.storage.put('r:alumnos:' + cod, a);
    const suyos = Object.values(this.datos.pedidos).filter(p => p.alumno === cod).map(p => sinInternos(p));
    return json({ alumno: sinInternos(a), pedidos: suyos });
  }

  /* ══ EL BUZÓN DE LA PANTALLA ═══════════════════════════════════════════
     Carlos, 10 de octubre: «si lo subo desde mi teléfono, que la tablet
     también lo tenga». Episodios, música, películas y enlaces se suben aquí
     en pedazos de 1.5 MB (con la llave de la cooperativa), y cada pantalla
     los baja sola y los guarda EN ELLA: el servidor es un buzón, no la
     videoteca. Se guarda en el propio objeto (el plan gratis da 1 GB por
     escuela) o, si algún día se conecta, en un R2 (`MEDIOS`), que da 10 GB.
     Lo ya bajado se va primero cuando falta espacio. */
  get alm(){
    const r2 = this.env && this.env.MEDIOS, g = this.ctx.storage;
    return r2 ? {
      cabe: TOPE.mediosR2, poner: (id, k, b) => r2.put(id + '/' + k, b),
      sacar: async (id, k) => { const o = await r2.get(id + '/' + k); return o ? o.arrayBuffer() : null; },
      borrar: async (id, n) => { const ks = []; for(let k = 0; k < n; k++) ks.push(id + '/' + k); for(let i = 0; i < ks.length; i += 900) await r2.delete(ks.slice(i, i + 900)); },
    } : {
      cabe: TOPE.mediosObjeto, poner: (id, k, b) => g.put('mp:' + id + ':' + k, b),
      sacar: (id, k) => g.get('mp:' + id + ':' + k),
      borrar: async (id, n) => { const ks = []; for(let k = 0; k < n; k++) ks.push('mp:' + id + ':' + k); for(let i = 0; i < ks.length; i += 128) await g.delete(ks.slice(i, i + 128)); },
    };
  }
  async medios(){
    if(!this._medios){ this._medios = {}; for(const [k, v] of await this.ctx.storage.list({ prefix: 'medio:' })) this._medios[k.slice(6)] = v; }
    return this._medios;
  }
  async guardarMedio(m){ (await this.medios())[m.id] = m; await this.ctx.storage.put('medio:' + m.id, m); }
  async quitarMedio(id, tumba){
    const M = await this.medios(), m = M[id]; if(!m) return;
    if(m.partes) await this.alm.borrar(id, m.partes);
    delete M[id]; await this.ctx.storage.delete('medio:' + id);
    if(tumba){ const b = (await this.ctx.storage.get('medios-borrados')) || []; b.push({ id, t: Date.now() }); await this.ctx.storage.put('medios-borrados', b.slice(-300)); }
  }
  async rutaMedios(ruta, url, pedido, quien){
    if(!quien.admin) return json({ error: 'Sólo con el pasador de la cooperativa.' }, 401);
    const que = ruta.slice(ruta.indexOf('/medios/') + 8), M = await this.medios();
    const id = String(url.searchParams.get('id') || ''), k = Number(url.searchParams.get('k'));
    if(que === 'parte' && pedido.method === 'GET'){
      const m = M[id]; if(!m || !(k >= 0 && k < m.partes)) return json({ error: 'No existe.' }, 404);
      const b = await this.alm.sacar(id, k); if(!b) return json({ error: 'Falta ese pedazo.' }, 404);
      return new Response(b, { headers: { 'content-type': 'application/octet-stream' } });
    }
    if(pedido.method !== 'POST') return json({ error: 'No existe.' }, 404);
    if(que === 'parte'){
      const m = M[id]; if(!m || m.listo || !(k >= 0 && k < m.partes)) return json({ error: 'No existe.' }, 404);
      const b = await pedido.arrayBuffer();
      if(b.byteLength > TOPE.medioParte || b.byteLength === 0) return json({ error: 'Pedazo inválido.' }, 413);
      await this.alm.poner(id, k, b);
      m.llegaron = Math.max(m.llegaron || 0, k + 1);
      if(k === m.partes - 1){ m.listo = true; m.t = Date.now(); }
      await this.guardarMedio(m);
      return json({ bien: true, listo: !!m.listo });
    }
    let c = {}; try{ c = JSON.parse(await pedido.text()) || {}; }catch(e){}
    if(que === 'lista'){
      const borrados = (await this.ctx.storage.get('medios-borrados')) || [];
      return json({ medios: Object.values(M).filter(m => m.listo).map(m => Object.assign({}, m)), borrados });
    }
    if(que === 'alta'){
      const nid = String(c.id || '');
      if(!/^[a-z0-9]{6,40}$/.test(nid)) return json({ error: 'Id inválido.' }, 400);
      const tam = entero(c.tam, 0, 4e9, 0), clase = ['archivo', 'youtube', 'spotify'].indexOf(c.clase) >= 0 ? c.clase : 'archivo';
      if(clase === 'archivo' && (tam <= 0 || tam > TOPE.medioMax)) return json({ error: 'Pesa ' + Math.round(tam / 1e6) + ' MB. Lo más que entra son ' + Math.round(TOPE.medioMax / 1e6) + ' MB: expórtalo en 720p.' }, 413);
      /* espacio: se van primero los ya bajados por alguna pantalla, de los más viejos */
      const usado = () => Object.values(M).reduce((x, m) => x + (m.tam || 0), 0);
      const viejos = Object.values(M).filter(m => m.listo && m.bajado).sort((a, b) => a.bajado - b.bajado);
      while(usado() + tam > this.alm.cabe && viejos.length) await this.quitarMedio(viejos.shift().id, false);
      if(usado() + tam > this.alm.cabe) return json({ error: 'El buzón está lleno: espera a que la pantalla baje lo que ya subiste.' }, 507);
      if(M[nid]) await this.quitarMedio(nid, false);
      const partes = clase === 'archivo' ? Math.ceil(tam / TOPE.medioParte) : 0;
      const portada = typeof c.portada === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(c.portada) && c.portada.length < 120000 ? c.portada : '';
      const m = { id: nid, tipo: c.tipo === 'rel' ? 'rel' : 'ep', clase, nombre: texto(c.nombre, 80) || 'Sin nombre', mime: texto(c.mime, 60),
        tam, partes, esAudio: !!c.esAudio, artista: texto(c.artista, 60), portada,
        embed: clase !== 'archivo' && /^https:\/\/(www\.youtube-nocookie\.com|open\.spotify\.com)\//.test(String(c.embed || '')) ? String(c.embed).slice(0, 500) : '',
        listo: clase !== 'archivo', llegaron: 0, de: quien.aparato, t: Date.now(), bajado: 0 };
      await this.guardarMedio(m);
      return json({ bien: true, partes, parte: TOPE.medioParte });
    }
    if(que === 'bajado'){ const m = M[String(c.id || '')]; if(m && !m.bajado){ m.bajado = Date.now(); await this.guardarMedio(m); } return json({ bien: true }); }
    if(que === 'borrar'){ await this.quitarMedio(String(c.id || ''), true); return json({ bien: true }); }
    return json({ error: 'No existe.' }, 404);
  }

  /* ══ LAS CUENTAS ═══════════════════════════════════════════════════════
     Lo pidió Carlos, con la razón: «me preocupa que hagan pedidos en la
     tablet a nombre de otras personas». Tres piezas:

     · LA CREDENCIAL, una sola vez. El teléfono manda una foto chica; aquí se
       guarda APARTE (no viaja en la sincronía a nadie) hasta que la
       cooperativa la ve en el mostrador y dice «es él» o «no coincide». En
       cuanto decide, la foto se BORRA: lo que queda es la palomita.
     · CORREO Y CONTRASEÑA. Del correo se guarda su huella (SHA-256), no el
       correo; de la contraseña, PBKDF2 con sal propia. Una cuenta protegida
       ya no se abre con el código solo.
     · RECUPERAR con el código + el correo: los dos juntos, con tope de
       intentos, y se pone una contraseña nueva. No se manda ningún correo
       (no hay servidor de correo y no hace falta). */
  rutaCuenta(ruta, cuerpo, quien){
    const que = ruta.slice(ruta.indexOf('/cuenta/') + 8);
    if(que === 'credencial') return this.subirCredencial(cuerpo, quien);
    if(que === 'proteger') return this.protegerCuenta(cuerpo, quien);
    if(que === 'entrar') return this.entrarConCorreo(cuerpo, quien);
    if(que === 'recuperar') return this.recuperarCuenta(cuerpo, quien);
    if(que === 'pendientes') return this.credencialesPendientes(quien);
    if(que === 'decidir') return this.decidirCredencial(cuerpo, quien);
    return json({ error: 'No existe.' }, 404);
  }
  esSuyo(cod, quien){ const a = this.datos.alumnos[cod]; return !!a && !!quien.aparato && (a._dev || []).indexOf(quien.aparato) >= 0; }
  async tocarAlumno(a){
    a.t = Math.max(Date.now(), (a.t || 0) + 1);
    const antes = this.reloj; this.reloj++; a._r = this.reloj;
    this.datos.alumnos[a.id] = a;
    await this.escribir([['r:alumnos:' + a.id, a], ['reloj', this.reloj]]);
    this.avisar([['alumnos', a]], false, antes);
  }
  /* ¿qué OTRA cuenta (que siga existiendo) tiene esa credencial? */
  credDe(nom, cod){
    for(const id in this.datos.alumnos){
      const b = this.datos.alumnos[id];
      if(id !== cod && b && b._cred && !b.borrado && mismaCredencial(b._cred, nom)) return id;
    }
    return '';
  }
  async subirCredencial(cuerpo, quien){
    if(!quien.aparato) return json({ error: 'Actualiza la app.' }, 400);
    const cod = String(cuerpo.codigo || '').toUpperCase();
    if(!RE_COD.test(cod) || !this.esSuyo(cod, quien)) return json({ error: 'Esa cuenta no es de este teléfono.' }, 403);
    const foto = String(cuerpo.foto || '');
    if(!/^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(foto)) return json({ error: 'Eso no es una foto.' }, 400);
    if(foto.length > TOPE.credencialBytes) return json({ error: 'La foto es demasiado grande.' }, 413);
    if(!this.cuenta('cred:' + cod, 60 * 60000, TOPE.credencialesPorAlumnoHora)) return json({ error: 'Ya mandaste varias. Espera a que la revisen.' }, 429);
    const a = this.datos.alumnos[cod];
    if(a.verif === 'si') return json({ bien: true, verif: 'si' });
    const pend = await this.ctx.storage.list({ prefix: 'cred:', limit: TOPE.credencialesPendientes + 1 });
    if(pend.size >= TOPE.credencialesPendientes && !pend.has('cred:' + cod)) return json({ error: 'Hay demasiadas por revisar. Inténtalo mañana.' }, 429);
    /* lo que dijo el lector del teléfono: si el nombre impreso coincidió, o si
       no se alcanzó a leer y lo revisa la cooperativa a ojo */
    const lectura = cuerpo.lectura === 'coincide' || cuerpo.lectura === 'no-se-leyo' ? cuerpo.lectura : '';
    /* UNA CREDENCIAL, UNA CUENTA (Carlos, 15 de octubre). El nombre completo
       que leyó el teléfono se compara con el de las demás cuentas, perdonando
       un par de letras mal leídas (otra foto de la misma credencial no lo
       brinca). Se queda en el servidor: no va a los teléfonos ni al mostrador. */
    const nom = nombreCred(cuerpo.nombre);
    if(nom){
      const otro = this.credDe(nom, cod);
      if(otro) return json({ error: 'Esa credencial ya está en otra cuenta. Si es tuya, entra con tu correo en «Ya tengo cuenta».', credOcupada: true }, 409);
      a._cred = nom;
    }
    await this.ctx.storage.put('cred:' + cod, { foto, t: Date.now(), lectura });
    a.verif = 'pendiente';
    await this.tocarAlumno(a);
    return json({ bien: true, verif: 'pendiente' });
  }
  async credencialesPendientes(quien){
    if(!quien.admin) return json({ error: 'Sólo el mostrador.' }, 401);
    const out = [];
    for(const [k, v] of await this.ctx.storage.list({ prefix: 'cred:', limit: 200 })){
      const cod = k.slice(5), a = this.datos.alumnos[cod];
      if(!a){ await this.ctx.storage.delete(k); continue; }
      out.push({ codigo: cod, nombre: a.nombre, grupo: a.grupo, foto: v.foto, t: v.t, lectura: v.lectura || '' });
    }
    out.sort((x, y) => x.t - y.t);
    return json({ pendientes: out });
  }
  async decidirCredencial(cuerpo, quien){
    if(!quien.admin) return json({ error: 'Sólo el mostrador.' }, 401);
    const cod = String(cuerpo.codigo || '').toUpperCase(), a = RE_COD.test(cod) && this.datos.alumnos[cod];
    if(!a) return json({ error: 'No existe.' }, 404);
    a.verif = cuerpo.si === true ? 'si' : 'no';
    if(a.verif === 'no') delete a._cred;                      /* no era suya: la credencial queda libre */
    await this.ctx.storage.delete('cred:' + cod);            /* decidido: la foto se va */
    await this.tocarAlumno(a);
    return json({ bien: true, verif: a.verif });
  }
  async protegerCuenta(cuerpo, quien){
    if(!quien.aparato) return json({ error: 'Actualiza la app.' }, 400);
    const cod = String(cuerpo.codigo || '').toUpperCase();
    if(!RE_COD.test(cod) || !this.esSuyo(cod, quien)) return json({ error: 'Esa cuenta no es de este teléfono.' }, 403);
    const correo = correoLimpio(cuerpo.correo), clave = String(cuerpo.clave || '');
    if(!correo) return json({ error: 'Ese correo no se ve bien.' }, 400);
    if(clave.length < 6 || clave.length > 72) return json({ error: 'La contraseña va de 6 a 72 letras o números.' }, 400);
    const a = this.datos.alumnos[cod];
    /* cambiarla teniendo ya una: hay que dar la de antes */
    if(a._cuenta && !(await claveBuena(String(cuerpo.antes || ''), a._cuenta))) return json({ error: 'La contraseña de antes no es esa.' }, 401);
    const huella = await sha('fadori-correo:' + correo);
    if(this.correos[huella] && this.correos[huella] !== cod) return json({ error: 'Ese correo ya es de otra cuenta.' }, 409);
    if(a._cuenta && a._cuenta.correo && a._cuenta.correo !== huella) delete this.correos[a._cuenta.correo];
    a._cuenta = await cuentaNueva(huella, clave);
    a.protegida = tapar(correo);
    a.correo = correo;      /* completo: lo ven él y la cooperativa, nadie más */
    this.correos[huella] = cod;
    await this.tocarAlumno(a);
    return json({ bien: true, protegida: a.protegida });
  }
  async entrarConCorreo(cuerpo, quien){
    if(!quien.aparato) return json({ error: 'Actualiza la app.' }, 400);
    if(!this.cuenta('cor:ap:' + quien.aparato, 10 * 60000, TOPE.correoPorAparato10min) ||
       !this.cuenta('cor:ip:' + quien.ip, 10 * 60000, TOPE.correoPorIp10min) ||
       !this.cuenta('cor:escuela', 60 * 60000, TOPE.correoPorEscuelaHora))
      return json({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);
    const correo = correoLimpio(cuerpo.correo);
    const cod = correo && this.correos[await sha('fadori-correo:' + correo)], a = cod && this.datos.alumnos[cod];
    const malo = () => json({ error: 'El correo o la contraseña no coinciden.' }, 401);
    if(!a || !a._cuenta){ await claveBuena('x', CUENTA_FALSA); return malo(); }   /* tarda lo mismo exista o no */
    if(this.lleva('cfa:' + cod, 15 * 60000) >= TOPE.fallasPorCuenta15min) return json({ error: 'Esta cuenta tuvo muchos intentos. Espera 15 minutos.' }, 429);
    if(!(await claveBuena(String(cuerpo.clave || ''), a._cuenta))){ this.suma('cfa:' + cod, 15 * 60000); return malo(); }
    return this.abrirEn(a, quien);
  }
  async recuperarCuenta(cuerpo, quien){
    if(!quien.aparato) return json({ error: 'Actualiza la app.' }, 400);
    if(!this.cuenta('rec:ap:' + quien.aparato, 15 * 60000, TOPE.recuperarPorAparato15min) ||
       !this.cuenta('rec:escuela', 60 * 60000, TOPE.recuperarPorEscuelaHora))
      return json({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);
    const cod = String(cuerpo.codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const correo = correoLimpio(cuerpo.correo), nueva = String(cuerpo.nueva || '');
    const a = RE_COD.test(cod) && this.datos.alumnos[cod];
    const malo = () => json({ error: 'El código y el correo no coinciden.' }, 401);
    if(!a || !a._cuenta || !correo) return malo();
    if(this.lleva('cfa:' + cod, 15 * 60000) >= TOPE.fallasPorCuenta15min) return json({ error: 'Esta cuenta tuvo muchos intentos. Espera 15 minutos.' }, 429);
    if(!igual(await sha('fadori-correo:' + correo), a._cuenta.correo)){ this.suma('cfa:' + cod, 15 * 60000); return malo(); }
    if(nueva.length < 6 || nueva.length > 72) return json({ error: 'La contraseña nueva va de 6 a 72 letras o números.' }, 400);
    a._cuenta = await cuentaNueva(a._cuenta.correo, nueva);
    return this.abrirEn(a, quien);
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
    if(new URL(pedido.url).searchParams.get('soc')) etiquetas.push('soc');
    if(quien.admin) etiquetas.push('llave:' + quien.llave);
    /* hibernación: el objeto se duerme con los sockets abiertos y no cobra
       tiempo mientras nadie habla */
    this.ctx.acceptWebSocket(servidor, etiquetas);
    servidor.send(JSON.stringify({ tipo: 'reloj', reloj: this.reloj }));
    if(this.transmision) servidor.send(JSON.stringify({ tipo: 'transmision', estado: this.transmision, ahora: Date.now() }));
    return new Response(null, { status: 101, webSocket: cliente });
  }

  /* ── EL PARTIDO EN VIVO (Carlos, 14 de octubre: «reproducir en vivo videos
     como los partidos de fútbol, actualizar en tiempo real el marcador,
     ponerme de comentarista y mostrar cómo están las llaves del torneo»).
     El estado (marcador, llaves, de dónde sale el video) lo cambia SÓLO quien
     tiene la llave del mostrador; se guarda y se empuja al instante a todas
     las pantallas por el mismo socket de los pedidos. */
  async ponerTransmision(cuerpo, quien){
    if(!quien.admin) return json({ error: 'Sólo el mostrador.' }, 401);
    const e = cuerpo && cuerpo.estado;
    if(!e || typeof e !== 'object' || Array.isArray(e)) return json({ error: 'Falta el estado.' }, 400);
    let txt = '';
    try{ txt = JSON.stringify(e); }catch(err){ return json({ error: 'No se pudo leer.' }, 400); }
    if(txt.length > 24000) return json({ error: 'Demasiado grande.' }, 413);
    this.transmision = Object.assign(JSON.parse(txt), { t: Date.now() });
    await this.ctx.storage.put('transmision', this.transmision);
    const m = JSON.stringify({ tipo: 'transmision', estado: this.transmision, ahora: Date.now() });
    for(const ws of this.ctx.getWebSockets()){ try{ ws.send(m); }catch(err){} }
    return json({ bien: true, t: this.transmision.t });
  }

  /* LA SEÑAL del video y la voz del comentarista (WebRTC). El servidor sólo
     pasa recados entre aparatos: la imagen y el sonido van directo del
     teléfono a la pantalla, no por aquí. Quien tiene la llave del mostrador
     puede escribirle a cualquiera; los demás sólo le contestan a un mostrador. */
  webSocketMessage(ws, msg){
    if(typeof msg !== 'string' || msg === 'ping' || msg.length > 60000) return;
    let m = null; try{ m = JSON.parse(msg); }catch(e){ return; }
    if(!m || m.tipo !== 'senal') return;
    const de = this.quienDe(ws);
    if(!de.aparato || !this.cuenta('senal:' + de.aparato, 60000, 600)) return;
    const para = String(m.para || '');
    const sale = JSON.stringify({ tipo: 'senal', de: de.aparato, datos: m.datos === undefined ? null : m.datos });
    for(const otro of this.ctx.getWebSockets()){
      if(otro === ws) continue;
      const q = this.quienDe(otro);
      if(para !== '*' && q.aparato !== para) continue;
      if(!de.admin && !q.admin) continue;
      try{ otro.send(sale); }catch(e){}
    }
  }
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
        /* los de la página de la sociedad sólo oyen «cambió X» de lo suyo */
        if(this.ctx.getTags(ws).indexOf('soc') >= 0) continue;
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
    const movimientos = [];
    const poner = (c, rec) => { const previo = this.datos[c][rec.id]; rec._r = nuevo; this.datos[c][rec.id] = rec; tocados.push([c, rec, previo]); };
    const lista = (c) => Array.isArray(cambios[c]) ? cambios[c].slice(0, quien.admin ? 5000 : TOPE.registrosPorVuelta) : [];

    /* ── el mostrador: confía, pero limpia ──────────────────────────── */
    if(quien.admin){
      const cfg = cambios.config;
      if(cfg && typeof cfg === 'object' && (!this.config || (Number(cfg.t) || 0) > (this.config.t || 0))){
        this.config = Object.assign(limpiarConfig(cfg), {
          pasador: this.config && this.config.pasador,       /* el pasador sólo cambia por /api/pasador */
          _recreo: this.config && this.config._recreo, _tope5: this.config && this.config._tope5, _r: nuevo });
        configTocada = true;
      }
      for(const c of CAJONES){
        for(const r of lista(c)){
          if(!r || typeof r !== 'object' || !RE_ID.test(String(r.id || ''))){ rechaza(c, r && r.id, 'invalido'); continue; }
          const viejo = this.datos[c][r.id], t = Number(r.t) || 0;
          if(viejo && !(t > (viejo.t || 0) || (t === (viejo.t || 0) && r.id > viejo.id))) continue;
          const rec = limpiarRegistro(r, c === 'productos' ? 1600000 : 4000);
          if(!rec){ rechaza(c, r.id, 'grande'); continue; }
          /* lo inventado no regresa al menú aunque una copia vieja lo mande vivo */
          if(c === 'productos' && esRetirado(rec)){ rec.borrado = true; rec.disponible = false; rec.destacado = false; }
          /* lo de la cuenta sólo cambia por sus propias puertas: una copia
             vieja del mostrador no le borra la contraseña ni la palomita */
          if(c === 'alumnos' && viejo){ rec._dev = viejo._dev; rec._cuenta = viejo._cuenta; rec._cred = viejo._cred; rec.verif = viejo.verif; rec.protegida = viejo.protegida; rec.correo = viejo.correo; rec.npedidos = viejo.npedidos;
            /* LA DEUDA LA LLEVA EL SERVIDOR (Carlos, 11 de octubre: «arregla el
               sistema de deudas»). Cada aparato mandaba la deuda ENTERA y ganaba
               el último: la tablet fiaba $45, el teléfono abonaba $10 al mismo
               tiempo, y los $45 se perdían. Ahora la de un registro que llega no
               cuenta: la mueven sólo los movimientos (abajo) */
            rec.deuda = Number(viejo.deuda) || 0; }
          /* el que da de alta la cooperativa en persona ya está visto; su deuda
             nace en cero y la suben los movimientos que vienen detrás */
          else if(c === 'alumnos'){ rec.verif = 'si'; rec.deuda = 0; }
          if(c === 'eventos' && !viejo && DELTA_DEUDA[rec.tipo] && rec.alumno) movimientos.push(rec);
          if(c === 'pedidos'){
            const teniaTurno = rec.turno !== null && rec.turno !== undefined;
            if(viejo && viejo.turno) rec.turno = viejo.turno;
            else if(!teniaTurno && (rec.estado === undefined || VIVOS.indexOf(rec.estado) >= 0)){ rec.turno = this.siguienteTurno(); turnoTocado = true; }
            if(!teniaTurno && rec.turno) rec.t = Math.max(t + 1, ahora);
          }
          poner(c, rec);
        }
      }
      /* los movimientos de deuda, cada uno UNA vez (el evento se guarda por id:
         si un aparato lo vuelve a mandar, ya existe y no entra aquí) */
      for(const e of movimientos){
        const a = this.datos.alumnos[String(e.alumno).toUpperCase()]; if(!a) continue;
        const deuda = Math.max(0, Math.round((Number(a.deuda) || 0) + DELTA_DEUDA[e.tipo](e)));
        poner('alumnos', Object.assign({}, a, { deuda, t: Math.max(Number(a.t) || 0, ahora, Number(e.t) || 0) + 1 }));
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
        terminos: entero(r.terminos, 0, ahora, 0), deuda: 0, creado: ahora, verif: 'sin',
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
      /* Carlos, 11 de octubre: sin correo y sin credencial no se pide (que no
         pidan a nombre de otro). La credencial basta con estar mandada: la
         cooperativa la revisa al despachar */
      const due = this.datos.alumnos[r.alumno];
      if(estado === 'en_cola' && (!due._cuenta || (due.verif !== 'si' && due.verif !== 'pendiente'))) { rechaza('pedidos', r.id, 'sin-cuenta'); return false; }
      /* el límite de fiado lo revisaba sólo la app: ahora también aquí */
      const limite = entero(this.config && this.config.limiteDeuda, 0, 1e7, 8000);
      if(estado === 'en_cola' && limite > 0 && (Number(due.deuda) || 0) >= limite) { rechaza('pedidos', r.id, 'deuda'); return false; }
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
      const tope = entero(this.config && this.config.topeporAlumno, 1, 10, 5);
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
      /* para el mostrador: con cuántos pedidos va esta cuenta (y el correo,
         que sólo ve la cooperativa) — un nombre se inventa, una historia no */
      const hechos = (Number(a.npedidos) || 0) + 1;
      poner('alumnos', Object.assign({}, a, { npedidos: hechos }));
      poner('pedidos', {
        id: r.id, folio: /^[A-Z0-9]{4,6}$/.test(String(r.folio || '')) ? r.folio : hex(2).toUpperCase(),
        alumno: r.alumno, nombre: a.nombre, grupo: a.grupo, renglones, total, pagado: 0,
        /* la hora la pone el servidor; a lo mucho se le cree 10 minutos atrás
           (el que pidió sin señal), nunca las 7 de la mañana */
        creado: Math.min(ahora, Math.max(ahora - 10 * 60000, Number(r.creado) || ahora)),
        estado, anticipado, nota: texto(r.nota, 140), origen: 'app', ver: verLimpio(r.ver), despachador: null,
        correo: String(a.correo || a.protegida || ''), hechos,
        tomado: 0, listoEn: 0, entregado: 0, cancelado: estado === 'cancelado' ? ahora : 0,
        turno, t: Math.max((Number(r.t) || 0) + 1, ahora),
      });
      return turno !== null;
    }

    if(!esDeEl(viejo.alumno)) { rechaza('pedidos', r.id, 'ajeno'); return false; }
    const t = Number(r.t) || 0;
    if(!(t > (viejo.t || 0))) return false;
    const rec = Object.assign({}, viejo);
    /* el alumno sólo puede: cancelar lo que sigue en la fila (en los primeros
       5 minutos desde que pidió, con 1 de gracia para el que lo hizo sin
       señal), apartarlo, y revivir lo que se canceló porque se acabó algo.
       La cooperativa cancela cuando sea: eso va por el camino del mostrador. */
    let negado = false;
    if(r.estado !== viejo.estado){
      const aTiempo = Date.now() <= (Number(viejo.creado) || 0) + PLAZO_CANCELAR;
      const sePuede = (viejo.estado === 'en_cola' && ((r.estado === 'cancelado' && aTiempo) || r.estado === 'apartado')) ||
                      (viejo.estado === 'cancelado' && viejo.porFalta && (r.estado === 'en_cola' || r.estado === 'apartado'));
      if(sePuede){
        rec.estado = r.estado;
        if(r.estado === 'cancelado') rec.cancelado = Date.now();
        if(r.estado === 'en_cola'){ rec.porFalta = false; rec.cancelado = 0; }
      } else negado = true;
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
    /* Si se le negó el cambio de estado (cancelar pasados los 5 minutos, o
       desde un teléfono que no vio que ya lo estaban preparando), el teléfono
       ya se lo había puesto a sí mismo: sin mandarle la copia buena con una
       hora MÁS NUEVA, se quedaba creyendo que estaba cancelado. */
    if(negado){ rec.t = Math.max(t + 1, Date.now()); poner('pedidos', rec); }
    else if(igualQue(rec) !== igualQue(viejo)) poner('pedidos', rec);
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
      /* el nombre sólo si quien pidió dijo que sí, y sólo el primero: es lo
         que sale en la pantalla de turnos */
      const ver = verLimpio(rec.ver);
      return { id: rec.id, turno: rec.turno, estado: rec.estado, creado: rec.creado, anticipado: rec.anticipado,
        tomado: rec.tomado, listoEn: rec.listoEn, entregado: rec.entregado, origen: rec.origen, t: rec.t, _r: rec._r,
        ver, alias: ver === 'nombre' ? String(rec.nombre || '').trim().split(/\s+/)[0].slice(0, 14) : '',
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
/* el nombre de la credencial: MAYÚSCULAS sin acentos, sólo letras; con menos
   de dos palabras u ocho letras no sirve para distinguir a nadie */
function nombreCred(x){
  const n = String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-ZÑ ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return n.split(' ').length >= 2 && n.replace(/ /g, '').length >= 8 ? n : '';
}
function edicion(a, b){
  if(Math.abs(a.length - b.length) > 3) return 9;
  let ant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for(let i = 1; i <= a.length; i++){
    const fila = [i];
    for(let j = 1; j <= b.length; j++) fila[j] = Math.min(ant[j] + 1, fila[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    ant = fila;
  }
  return ant[b.length];
}
/* la misma credencial leída dos veces: igual, o a lo mucho 2 letras distintas */
const mismaCredencial = (a, b) => a === b || edicion(a, b) <= 2;
/* comparar sin delatar por cuánto tardó cuántas letras atinaste */
function igual(a, b){
  let d = a.length ^ b.length;
  for(let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function sinInternos(rec){
  const c = Object.assign({}, rec);
  delete c._dev; delete c._cuenta; delete c._cred;
  return c;
}
/* ── las cuentas: huellas, sal y PBKDF2 ── */
const bytesHex = (b) => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
const hexBytes = (h) => new Uint8Array((String(h).match(/../g) || []).map(x => parseInt(x, 16)));
async function sha(t){ return bytesHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))); }
async function derivar(clave, sal, iter){
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
  return bytesHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexBytes(sal), iterations: iter }, k, 256));
}
async function cuentaNueva(huellaCorreo, clave){
  const sal = hex(16), iter = TOPE.iteraciones;
  return { correo: huellaCorreo, sal, iter, clave: await derivar(clave, sal, iter), t: Date.now() };
}
async function claveBuena(clave, c){ return !!c && igual(await derivar(clave.slice(0, 72), c.sal, c.iter || TOPE.iteraciones), c.clave); }
const CUENTA_FALSA = { sal: '00'.repeat(16), iter: TOPE.iteraciones, clave: '00'.repeat(32) };
function correoLimpio(v){
  const c = String(v || '').trim().toLowerCase().slice(0, 120);
  return /^[^\s@<>]{1,64}@[^\s@<>]+\.[a-z]{2,}$/.test(c) ? c : '';
}
/* «carlos@gmail.com» → «ca•••@gmail.com»: lo que se enseña para que sepas cuál pusiste */
function tapar(correo){ const [u, d] = correo.split('@'); return u.slice(0, 2) + '•••@' + d; }
function configPublica(cfg){
  const c = Object.assign({}, cfg);
  delete c.pasador; delete c._recreo; delete c._tope5;
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
  if('topeporAlumno' in c) c.topeporAlumno = entero(c.topeporAlumno, 1, 10, 5);
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
function verLimpio(v){ return ['nombre', 'pedido', 'numero'].indexOf(v) >= 0 ? v : 'pedido'; }
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
