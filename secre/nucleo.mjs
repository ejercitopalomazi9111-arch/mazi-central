/* ══════════════════════════════════════════════════════════════════════════
   SECRE · la secretaria de WhatsApp de Carlos (15 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «un bot para mis dos cuentas de WhatsApp: los buenos días y las
   buenas noches a contactos específicos, que responda lo que me entre, que
   revise pendientes… y poder configurarlo a mano y hablando con él». Eligió
   la versión de MENSAJES LISTOS: Secre redacta con su estilo y él decide.
   NADA sale a otra persona sin que Carlos lo apruebe.

   Cómo se ve desde su teléfono: en su chat «Mensaje a ti mismo» le llegan
     🤖 #3 · Ana: «¿siempre sí vienes mañana?»
        Propuesta: «sí voy, nomás confirmo la hora y te digo»
        → «3» manda · «3 otra cosa» manda tu versión · «x3» la tira
   y los buenos días/noches a la hora que él puso, igual: listos para mandar.

   Aquí NO hay WhatsApp ni IA de verdad: este archivo recibe un `transporte`
   (whatsapp.mjs o uno de mentira en las pruebas), una `ia` (ia.mjs o una de
   mentira) y un `almacen`. Así todo se prueba sin conectar nada.

   Modos por chat:
     borrador  → redacta la respuesta y se la deja lista a Carlos (el normal)
     callado   → no redacta; sólo anota pendientes
     auto      → contesta SOLA, firmada como su asistente (Carlos, 16 de octubre:
                 «no tengo tiempo de tomar mi teléfono en el día y necesito que
                 mis clientes estén bien atendidos solos»). Sólo en los chats que
                 él puso en automático, nunca en grupos. Lo que necesite su
                 decisión (dinero, citas, compromisos) le contesta «ya le pasé tu
                 mensaje» y se lo deja a Carlos. Con frenos: tope por hora y por
                 día en cada chat, y no le contesta a otro bot.
                 En GRUPOS sólo si Carlos lo autorizó por nombre («automático
                 Equipo»): contesta cuando le hablan a él. Y «rol Grupo» sigue
                 una historia de rol en personaje mientras él no está (Carlos,
                 16 de octubre: «me gusta que la historia se desarrolle en
                 automático cuando yo no puedo»).
   ═════════════════════════════════════════════════════════════════════════ */

export const MODOS = ['borrador', 'callado', 'auto'];
const MIN = 60_000, HORA = 60 * MIN;
const TZ = 'America/Mexico_City';

export function configBase(){
  return {
    nombre: 'Carlos',
    version: 2,
    /* Carlos, 16 de octubre: «que responda siempre de inmediato al llegarme un
       mensaje de cualquier número», como asistente real de su WhatsApp */
    porDefecto: 'auto',            /* chats que no tienen modo propio */
    grupos: 'callado',             /* en grupos sólo anota pendientes */
    chats: {},                     /* jid → { nombre, modo, nota, etiquetas: [] } */
    /* comunidades de WhatsApp donde Carlos juega rol (16 de octubre: «un botón
       aparte para seleccionar la comunidad donde están todos los grupos del rol
       y darle contexto e instrucciones»): lo que se pone aquí lo heredan todos
       sus grupos; lo que tenga un grupo suyo le gana. jid → { nombre, personaje, mundo, marca, instrucciones } */
    comunidades: {},
    saludos: [],                   /* { chat, manana: '07:00', noche: '22:30', variacion: 10 } */
    reglas: [],                    /* { id, palabras?, etiquetas?, chats?, de?, a?, modo, hasta? } */
    datos: [],                     /* lo que Carlos le cuenta para contestar: { n, texto, hasta? } — «el viernes hay examen de mate a las 8» */
    pausaHasta: 0,
    resumen: '21:30',              /* el resumen de pendientes del día */
    /* a dónde le escribe a Carlos (16 de octubre: «que me escriba los pendientes
       del 7862447707 al 4428833786 y viceversa, para tener las notificaciones»):
       'otra' = al chat con su OTRA cuenta, que sí suena; 'yo' = al chat propio,
       que no suena. Sin otra cuenta vinculada, siempre al propio */
    avisarA: 'otra',
    /* el repaso corto: cada `cada` horas, entre `desde` y `hasta`, qué hizo y qué
       sigue pendiente — sólo si pasó algo desde el anterior. cada: 0 lo apaga */
    repaso: { cada: 3, desde: '09:00', hasta: '22:00' },
    /* turnos de secretaria (Carlos, 16 de octubre: «que pueda responder
       cualquiera de los 3, Secre, Paulina o Negro, como si rotaran turnos»).
       Bloques de `horas` contados desde la medianoche de México. `fijo` = una
       sola de guardia hasta que se diga otra cosa. */
    turnos: { activo: true, horas: 8, quienes: ['Secre', 'Paulina', 'Negro'], fijo: '' },
    juntar: 6,                     /* segundos que espera a que la otra persona termine de escribir */
    /* minutos que Secre se calla donde Carlos acaba de escribir. 0 desde el 16 de
       octubre: «aunque yo esté conectado mi bot responda sin importar qué». En el
       rol sí se hace a un lado (si él juega, su personaje no puede salir doble) */
    esperaSiContesto: 0,
    caducan: 6,                    /* horas que vive una propuesta sin aprobar */
    /* el modo automático: cómo firma y cuántas veces contesta sola por chat */
    auto: { firma: 'Asistente de Carlos', porHora: 20, alDia: 150, grupoPorHora: 30, grupoAlDia: 300 },
    juntarMax: 25,                 /* aunque sigan escribiendo, a los 25 s contesta (grupos que no paran) */
  };
}

/* ── la hora de México, sin depender de la zona de la máquina ── */
const partes = (t) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
  .formatToParts(new Date(t)).map(p => [p.type, p.value]));
export const fechaMx = (t) => { const p = partes(t); return `${p.year}-${p.month}-${p.day}`; };
export const horaMx = (t) => { const p = partes(t); return `${p.hour}:${p.minute}`; };
const aMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim()); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const minDelDia = (t) => aMin(horaMx(t));
/* ¿«ahora» cae entre de y a? (a puede ser del día siguiente: 22:00–07:00) */
export function entreHoras(t, de, a){
  const x = minDelDia(t), d = aMin(de), h = aMin(a);
  if(d == null || h == null) return false;
  return d <= h ? (x >= d && x < h) : (x >= d || x < h);
}
export const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/* «30m», «2h», «hoy», «1d» → milisegundos */
export function duracion(s, ahora){
  const t = sinAcentos(s);
  if(!t) return 0;
  if(t === 'hoy'){ const fin = new Date(ahora); const resto = (24 * 60 - minDelDia(ahora)) * MIN; return Math.max(MIN, resto - fin.getSeconds() * 1000); }
  const m = /^(\d+)\s*(m|min|mins|minutos?|h|hr|hrs|horas?|d|dias?)$/.exec(t);
  if(!m) return 0;
  const n = +m[1], u = m[2][0];
  return n * (u === 'm' ? MIN : u === 'h' ? HORA : 24 * HORA);
}

/* «hasta el 2026-10-18» = hasta que termina ESE día en México (no la medianoche
   UTC, que allá son las 6 de la tarde del día anterior); «2h», «hoy» también sirven */
export function finDe(x, ahora){
  if(!x) return 0;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x).trim());
  if(m){
    const base = Date.UTC(+m[1], +m[2] - 1, +m[3] + 1);           /* medianoche UTC del día siguiente */
    for(const h of [5, 6, 7]){ const t = base + h * HORA; if(horaMx(t) === '00:00') return t; }
    return base + 6 * HORA;
  }
  const d = duracion(x, ahora);
  if(d) return ahora + d;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : 0;
}

export class Secre {
  constructor({ cuenta = 'principal', transporte, ia, almacen, reloj = () => Date.now(), azar = Math.random }){
    Object.assign(this, { cuenta, transporte, ia, almacen, reloj, azar });
    const guardada = almacen.leer('config', {});
    this.config = Object.assign(configBase(), guardada);
    /* las cuentas que ya estaban guardadas traen los valores viejos (45 s de espera,
       15 min callada si Carlos escribe, 4 por hora): se pasan una sola vez a los nuevos.
       ⚠ la versión se lee de lo GUARDADO: la mezcla ya trae la de fábrica y nunca migraba */
    if(Object.keys(guardada).length && (guardada.version || 1) < 2){
      const c = this.config, a = c.auto || (c.auto = {});
      c.esperaSiContesto = 0; c.juntar = Math.min(c.juntar ?? 6, 6); c.juntarMax = Math.min(c.juntarMax ?? 25, 25);
      if(c.porDefecto === 'borrador') c.porDefecto = 'auto';
      a.porHora = Math.max(a.porHora || 0, 20); a.alDia = Math.max(a.alDia || 0, 150);
      if(typeof a.firma === 'string') a.firma = a.firma.replace(/^🤖\s*/, '');
      c.version = 2;
    }
    this.estado = Object.assign({
      historial: {},       /* jid → [{ de: 'el'|'yo', texto, t }] (los últimos 30) */
      estilo: [],          /* lo que Carlos escribe a mano: para que las propuestas suenen a él */
      pendientes: [],      /* { n, chat, nombre, texto, t, hecho } */
      propuestas: [],      /* { n, chat, nombre, texto, motivo, t, tipo } */
      saludosHoy: {},      /* jid → { fecha, manana, noche, mananaEn, nocheEn } */
      tomado: {},          /* jid → cuándo escribió Carlos a mano */
      atendido: {},        /* jid → hasta qué mensaje ya se le propuso algo */
      cola: {},            /* jid → cuándo toca redactar */
      enviados: [],        /* ids de lo que mandó Secre (para no confundirlo con Carlos) */
      frenoAvisado: {},    /* jid → cuándo se le avisó a Carlos que un grupo topó */
      ultimoSticker: {},   /* jid → cuándo mandó un sticker (no más de uno cada 10 min) */
      autos: {},           /* jid → [cuándo contestó sola] (para los topes) */
      autoHoy: { fecha: '', lista: [] },  /* lo que contestó sola hoy, para el resumen */
      contestadas: [],     /* lo que llegó, qué hizo Secre y por qué (lo más nuevo primero), para «Por mandar» */
      acuse: {},           /* jid → cuándo le dijo «recibí tu mensaje» porque la IA no contestó */
      registro: [],        /* lo que hizo, para el panel */
      charla: [],          /* la plática de Carlos con Secre, también para el panel */
      resumenFecha: '',
      repasoT: 0,          /* cuándo mandó el último repaso */
      sigN: 1, sigP: 1,
    }, almacen.leer('estado', {}));
    this.ocupados = new Set();
    this.mandando = new Map();   /* jid|texto → cuándo: lo que Secre está mandando ahorita, para no confundir su eco con Carlos */
  }

  guardar(){ this.almacen.guardar('config', this.config); this.almacen.guardar('estado', this.estado); }
  anotar(que){ this.estado.registro.push({ t: this.reloj(), que }); this.estado.registro = this.estado.registro.slice(-300); }

  /* ── quién es quién ── */
  chat(jid){ return this.config.chats[jid] || (this.config.chats[jid] = { nombre: '', modo: '', nota: '', etiquetas: [] }); }
  /* el contexto del rol de un grupo: el suyo encima del de su comunidad */
  rolDe(jid){
    const c = this.config.chats[jid] || {}, com = (c.comunidad && (this.config.comunidades || {})[c.comunidad]) || {};
    return { personaje: c.personaje || com.personaje || '', marca: c.marca || com.marca || '',
      mundo: [com.mundo, c.mundo].filter(Boolean).join('\n'), instrucciones: [com.instrucciones, c.instrucciones].filter(Boolean).join('\n'),
      comunidad: com.nombre || '' };
  }
  /* guardar la comunidad desde el panel: sus grupos, cuáles juegan solos y el contexto de todos */
  ponerComunidad({ id, nombre, grupos = [], activos = [], personaje, mundo, marca, instrucciones }){
    if(!id || !/@g\.us$/.test(id)) return '';
    const cs = this.config.comunidades || (this.config.comunidades = {});
    const com = cs[id] || (cs[id] = {});
    com.nombre = String(nombre || com.nombre || '').slice(0, 100);
    if(personaje !== undefined) com.personaje = String(personaje).slice(0, 800);
    if(mundo !== undefined) com.mundo = String(mundo).slice(0, 6000);
    if(marca !== undefined) com.marca = String(marca).trim().slice(0, 30);
    if(instrucciones !== undefined) com.instrucciones = String(instrucciones).slice(0, 3000);
    const prender = new Set(activos.map(String));
    let n = 0;
    for(const g of grupos.slice(0, 200)){
      if(!g || !/@g\.us$/.test(g.id)) continue;
      const c = this.chat(g.id);
      c.grupo = true; c.comunidad = id; if(g.nombre) c.nombre = String(g.nombre).slice(0, 100);
      /* prenderlo aquí, con su nombre a la vista, es que Carlos lo autorizó */
      if(prender.has(g.id)){ c.rol = true; c.modo = 'auto'; n++; }
      else if(c.rol){ c.rol = false; c.modo = ''; }
    }
    this.guardar();
    return `${com.nombre || 'La comunidad'}: sigo la historia en ${n} grupo(s)`;
  }
  /* los contactos y grupos que manda WhatsApp: se apuntan con su nombre aunque
     no hayan escrito, para poder elegirles modo desde el panel. Nunca pisa un
     nombre que ya tenía (el que Carlos le puso o el del chat). */
  cargarContactos(lista = []){
    const nombres = this.config.nombres || (this.config.nombres = {});
    let nuevos = 0;
    for(const x of lista.slice(0, 5000)){
      const id = String(x && x.id || ''), nombre = String(x && x.nombre || '').trim().slice(0, 100);
      if(!nombre || !/@(s\.whatsapp\.net|lid|g\.us)$/.test(id) || this.esMiChat(id)) continue;
      if(x.lid && x.lid !== id) nombres[x.lid] = nombre;   /* por si escribe desde su LID */
      const ya = this.config.chats[id];
      if(ya && ya.nombre) continue;
      const c = this.chat(id); c.nombre = nombre; if(x.grupo || id.endsWith('@g.us')) c.grupo = true;
      nuevos++;
    }
    if(nuevos) this.guardar();
    return nuevos;
  }
  nombreDe(jid){ const c = this.config.chats[jid]; return (c && c.nombre) || String(jid).split('@')[0]; }
  /* «Ana», «ana p», «la de la escuela»… → el jid que más se parece */
  buscarChat(texto){
    const q = sinAcentos(texto).replace(/^(a|al|a la|con|de)\s+/, '');
    if(!q) return null;
    const lista = Object.entries(this.config.chats).filter(([, c]) => c.nombre);
    return (lista.find(([, c]) => sinAcentos(c.nombre) === q)
        || lista.find(([, c]) => sinAcentos(c.nombre).startsWith(q))
        || lista.find(([, c]) => sinAcentos(c.nombre).split(/\s+/).some(w => w === q))
        || lista.find(([j]) => j.startsWith(q.replace(/\D/g, '') || '¬')) || [null])[0];
  }
  esMiChat(jid){ return this.transporte.yo && this.transporte.yo().includes(jid); }
  esOtraCuenta(jid){ return !!(this.transporte.otrosYo && this.transporte.otrosYo().includes(jid)); }
  /* a quién le llegan los avisos: a su otra cuenta (suena) o a su chat propio (no suena) */
  destinoAvisos(){
    const otros = this.transporte.otrosYo ? this.transporte.otrosYo().filter(j => /@s\.whatsapp\.net$/.test(j)) : [];
    return this.config.avisarA !== 'yo' && otros.length ? otros[0] : this.transporte.yo()[0];
  }

  /* ── el modo que toca en este chat, ahora ── */
  modo(jid, texto = '', grupo = false){
    const m = this.modoCrudo(jid, texto, grupo), c = this.config.chats[jid] || {};
    /* en un grupo contesta sola SÓLO si Carlos lo autorizó por nombre: ni
       «automático todos» ni una regla lo prenden ahí, que le habla a mucha gente */
    return m === 'auto' && (grupo || c.grupo) && c.modo !== 'auto' ? 'borrador' : m;
  }
  modoCrudo(jid, texto, grupo){
    const ahora = this.reloj(), c = this.config.chats[jid] || {};
    if(this.config.pausaHasta > ahora) return 'callado';
    const tomado = this.estado.tomado[jid];
    if(tomado && ahora - tomado < (c.rol ? 15 : this.config.esperaSiContesto) * MIN) return 'callado';
    const t = sinAcentos(texto);
    /* la regla más nueva gana */
    for(const r of [...this.config.reglas].reverse()){
      if(r.hasta && r.hasta < ahora) continue;
      if(r.chats && r.chats.length && !r.chats.includes(jid)) continue;
      if(r.etiquetas && r.etiquetas.length && !(c.etiquetas || []).some(e => r.etiquetas.includes(e))) continue;
      if(r.palabras && r.palabras.length && !r.palabras.some(p => t.includes(sinAcentos(p)))) continue;
      if(r.de && r.a && !entreHoras(ahora, r.de, r.a)) continue;
      if(MODOS.includes(r.modo)) return r.modo;
    }
    if(c.modo && MODOS.includes(c.modo)) return c.modo;
    return grupo ? this.config.grupos : this.config.porDefecto;
  }

  /* ══ lo que llega de WhatsApp ══════════════════════════════════════════
     m = { id, chat, de, nombre, texto, mio, grupo, t } */
  async alMensaje(m){
    if(!m || !m.chat || !m.texto) return;
    const ahora = m.t || this.reloj();
    /* lo que mandó Secre misma no se vuelve a procesar */
    if(m.id && this.estado.enviados.includes(m.id)) return;
    if(this.esMiChat(m.chat)){
      if(m.mio && !/^🤖/.test(m.texto)) await this.orden(m.texto.trim());
      return;
    }
    /* el chat con su OTRA cuenta es el canal de avisos: lo que manda la otra Secre
       (🤖) no se contesta, lo que Carlos escribe ahí desde esta cuenta no es «escribir
       a mano», y lo que escribe desde la otra cuenta es una orden para ésta */
    if(this.esOtraCuenta(m.chat)){
      if(!m.mio && !/^🤖/.test(m.texto) && this.config.avisarA !== 'yo') await this.orden(m.texto.trim());
      return;
    }
    /* el eco de lo que mandó Secre (si el transporte no lo reconoció por su id) no es Carlos */
    if(m.mio && this.mandando.has(m.chat + '|' + m.texto)) return;
    const c = this.chat(m.chat);
    /* en un grupo, el chat se llama como el grupo, no como quien escribió */
    const nc = m.grupo ? m.nombreChat : ((this.config.nombres || {})[m.chat] || m.nombre);
    if(nc && !c.nombre && (m.grupo || !m.mio)) c.nombre = nc;
    if(m.grupo) c.grupo = true;
    const h = this.estado.historial[m.chat] || (this.estado.historial[m.chat] = []);
    h.push({ de: m.mio ? 'yo' : 'el', quien: m.grupo && !m.mio ? m.nombre || '' : '', texto: m.texto.slice(0, 2000), t: ahora });
    this.estado.historial[m.chat] = h.slice(m.grupo ? -60 : -30);
    if(m.mio && m.grupo && m.sticker && m.sticker.b64) this.guardarSticker(m.chat, m.sticker);
    if(m.mio){
      /* Carlos escribió a mano: su estilo, y Secre se hace a un lado en ese chat */
      this.estado.estilo.push(m.texto.slice(0, 300)); this.estado.estilo = this.estado.estilo.slice(-120);
      this.estado.tomado[m.chat] = ahora;
      delete this.estado.cola[m.chat];
      this.estado.propuestas = this.estado.propuestas.filter(p => p.chat !== m.chat || p.tipo !== 'respuesta');
      this.guardar();
      return;
    }
    /* espera a que la otra persona termine de escribir (manda en ráfagas) */
    /* …pero no para siempre: en un grupo que no para de escribir, a los 2 min contesta igual */
    const prev = this.estado.cola[m.chat], desde = prev && prev.desde ? prev.desde : ahora;
    this.estado.cola[m.chat] = { en: Math.min(ahora + this.config.juntar * 1000, desde + (this.config.juntarMax ?? 120) * 1000), desde, grupo: !!m.grupo };
    this.guardar();
  }

  /* ══ el reloj: cada pocos segundos ════════════════════════════════════ */
  async tic(){
    const ahora = this.reloj();
    for(const [jid, q] of Object.entries(this.estado.cola)){
      if(q.en > ahora || this.ocupados.has(jid)) continue;
      this.ocupados.add(jid);
      try{ delete this.estado.cola[jid]; await this.atender(jid, q.grupo); }
      finally { this.ocupados.delete(jid); }
    }
    await this.saludos(ahora);
    await this.resumen(ahora);
    await this.repaso(ahora);
    /* las propuestas viejas se tiran: contestar algo de hace 6 horas confunde */
    const antes = this.estado.propuestas.length;
    this.estado.propuestas = this.estado.propuestas.filter(p => ahora - p.t < this.config.caducan * HORA);
    if(antes !== this.estado.propuestas.length) this.guardar();
  }

  /* lo nuevo de un chat → pendientes y, si toca, una propuesta */
  async atender(jid, grupo){
    const h = this.estado.historial[jid] || [];
    let i = h.length; while(i > 0 && h[i - 1].de === 'el') i--;
    const desde = this.estado.atendido[jid] || 0;
    const nuevos = h.slice(i).filter(x => x.t > desde);
    if(!nuevos.length) return;
    this.estado.atendido[jid] = nuevos[nuevos.length - 1].t;
    const texto = nuevos.map(x => x.texto).join('\n');
    let modo = this.modo(jid, texto, grupo);
    const nombre = this.nombreDe(jid), c = this.chat(jid), esGrupo = !!(grupo || c.grupo);
    /* en automático, los frenos: si alguno salta, se porta como borrador */
    const freno = modo === 'auto' ? this.frenoAuto(jid, nuevos, esGrupo) : '';
    if(freno && esGrupo){
      /* en un grupo, un freno no llena a Carlos de propuestas: se calla y le avisa una vez por hora */
      if(!(this.estado.frenoAvisado[jid] > this.reloj() - HORA)){
        this.estado.frenoAvisado[jid] = this.reloj();
        await this.avisar(`⏸ En ${nombre} me detuve: ${freno}. Sigo en cuanto baje el ritmo.`);
      }
      this.bitacora(jid, nombre, nuevos, 'freno', '', `me detuve: ${freno}`);
      this.guardar(); return;
    }
    if(freno){ modo = 'borrador'; this.bitacora(jid, nombre, nuevos, 'freno', '', `no contesté sola: ${freno}; te lo dejé de propuesta`); }
    /* en un grupo SÍ platica con otros bots (el narrador, el de los dados…, Carlos,
       16 de octubre): lo que evita que se enciclen es el tope del grupo */
    const paraIA = nuevos;
    let r = null;
    try{
      r = await this.ia.leer({ dueno: this.config.nombre, nombre, nota: c.nota || '', historial: h, nuevos: paraIA.length ? paraIA : nuevos, estilo: this.estado.estilo.slice(-40), redactar: modo !== 'callado', auto: modo === 'auto', rol: modo === 'auto' && !!c.rol, ...this.rolDe(jid), stickers: (c.stickers || []).map(x => ({ n: x.n, cuando: x.cuando })), grupo, datos: this.datosVigentes().map(d => d.texto) });
    }catch(e){ r = null; this.anotar(`la IA falló con ${nombre}: ${e.message}`); }
    for(const p of (r && r.pendientes) || []) this.agregarPendiente(jid, nombre, p);
    if(modo === 'auto' && r) return this.contestarSola(jid, nombre, paraIA.length ? paraIA : nuevos, r);
    /* sin IA no hay qué contestar sola: se le deja a Carlos, y a la persona se le
       avisa que su mensaje sí llegó (una vez cada 3 h por chat; nunca en grupos) */
    if(modo === 'auto'){
      modo = 'borrador';
      const ultimo = (this.estado.acuse || {})[jid] || 0;
      if(!esGrupo && this.reloj() - ultimo > 3 * HORA){
        const firma = this.firmaDe(jid), txt = 'Recibí tu mensaje, en un momento te contesto.';
        await this.mandar(jid, firma ? firma + ' ' + txt : txt);
        (this.estado.acuse || (this.estado.acuse = {}))[jid] = this.reloj();
        this.bitacora(jid, nombre, nuevos, 'error', txt, 'la IA no contestó; le avisé que llegó su mensaje y a ti te dejé la propuesta');
      } else this.bitacora(jid, nombre, nuevos, 'error', '', 'la IA no contestó; te dejé la propuesta');
    } else if(modo === 'borrador') this.bitacora(jid, nombre, nuevos, 'propuesta', r && r.respuesta, 'este chat está en «Propone»: espera tu número');
    if(modo !== 'borrador'){ this.guardar(); return; }
    const propuesta = r && r.respuesta ? String(r.respuesta).trim() : '';
    if(!propuesta && !(r && r.urgente)){ this.guardar(); return; }
    /* una sola propuesta viva por chat: la nueva reemplaza a la vieja */
    this.estado.propuestas = this.estado.propuestas.filter(p => !(p.chat === jid && p.tipo === 'respuesta'));
    const n = this.estado.sigN++;
    const cita = nuevos.slice(-3).map(x => (x.quien ? x.quien + ': ' : '') + x.texto).join(' / ').slice(0, 300);
    this.estado.propuestas.push({ n, chat: jid, nombre, texto: propuesta, motivo: (r && r.motivo) || '', dijo: cita, urgente: !!(r && r.urgente), t: this.reloj(), tipo: 'respuesta' });
    await this.avisar(`#${n} · ${nombre}${r && r.urgente ? ' ⚠️' : ''}: «${cita}»\n` +
      (propuesta ? `Propuesta: «${propuesta}»\n→ «${n}» la manda · «${n} tu texto» manda el tuyo · «x${n}» la tira` : 'No supe qué contestarle: te toca.') +
      (r && r.motivo ? `\n(${r.motivo})` : '') + (freno ? `\n(No le contesté sola: ${freno}.)` : ''));
    this.guardar();
  }

  /* ── el modo automático ── */
  confAuto(){ return Object.assign({ firma: 'Asistente de Carlos', porHora: 4, alDia: 20, grupoPorHora: 30, grupoAlDia: 300 }, this.config.auto || {}); }
  /* por qué NO contestar sola esta vez ('' = sí puede) */
  frenoAuto(jid, nuevos, esGrupo = false){
    const A = this.confAuto(), ahora = this.reloj();
    /* otro bot: en un chat de uno, dos bots contestándose no paran nunca, así que ahí
       no. En un grupo autorizado sí (Carlos lo pidió para el rol), y el freno es el tope */
    if(!esGrupo && nuevos.some(x => /^\s*🤖/.test(x.texto))) return 'parece otro bot';
    /* su otra cuenta: las dos Secres se contestarían para siempre */
    if(!esGrupo && this.transporte.otrosYo && this.transporte.otrosYo().includes(jid)) return 'es tu otra cuenta';
    const porHora = esGrupo ? A.grupoPorHora : A.porHora, alDia = esGrupo ? A.grupoAlDia : A.alDia;
    const veces = (this.estado.autos[jid] || []).filter(t => ahora - t < 24 * HORA);
    if(veces.filter(t => ahora - t < HORA).length >= porHora) return `ya contesté ${porHora} veces en la última hora`;
    if(veces.filter(t => fechaMx(t) === fechaMx(ahora)).length >= alDia) return `ya contesté ${alDia} veces hoy`;
    return '';
  }
  /* ── el formato del rol: «🌌⚛️- lo que dice» y «> lo que hace» ── */
  formatoRol(c, r){
    const marca = String(c.marca || '').trim();
    const crudas = Array.isArray(r.lineas) && r.lineas.length ? r.lineas
      : String(r.respuesta || '').split('\n').filter(x => x.trim()).map(x => ({ tipo: /^\s*>/.test(x) ? 'hace' : 'dice', texto: x }));
    const quita = (x) => { let t = String(x || '').trim().replace(/^>\s*/, ''); if(marca && t.startsWith(marca)) t = t.slice(marca.length); return t.trim(); };
    const lineas = crudas.map(l => ({ hace: l && l.tipo === 'hace', t: quita(l && l.texto) })).filter(l => l.t);
    if(!marca && !(Array.isArray(r.lineas) && r.lineas.length)) return String(r.respuesta || '').trim();
    return lineas.map(l => l.hace ? '> ' + l.t : (marca ? marca + ' ' : '') + l.t).join('\n');
  }
  /* los stickers de Carlos en un grupo: con lo que estaba pasando cuando lo mandó */
  guardarSticker(jid, st){
    const c = this.chat(jid), h = this.estado.historial[jid] || [];
    const antes = [...h].reverse().find(x => x.de === 'el' && x.texto !== '[sticker]');
    const lista = (c.stickers || []).filter(x => x.b64 !== st.b64);
    const n = (c.stickers || []).reduce((m, x) => Math.max(m, x.n), 0) + 1;
    lista.push({ n, b64: st.b64, cuando: antes ? ((antes.quien ? antes.quien + ': ' : '') + antes.texto).slice(0, 160) : '' });
    c.stickers = lista.slice(-8);
  }
  /* de vez en cuando: sólo si la IA lo pidió, y nunca dos en menos de 10 minutos */
  async quizaSticker(jid, c, r, conTexto){
    const n = +r.sticker, st = n && (c.stickers || []).find(x => x.n === n);
    if(!st || !this.transporte.enviarSticker) return;
    const ultimo = this.estado.ultimoSticker[jid] || 0;
    if(this.reloj() - ultimo < 10 * MIN) return;
    const id = await this.transporte.enviarSticker(jid, st.b64);
    if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); }
    this.estado.ultimoSticker[jid] = this.reloj();
    if(!conTexto) this.estado.autos[jid] = [...(this.estado.autos[jid] || []), this.reloj()];
    this.anotar(`sticker ${n} a ${this.nombreDe(jid)}`);
  }
  /* cómo firma en este chat: la suya si Carlos le puso una («sin firma» = ''); sin 🤖 desde el
     16 de octubre («quita el emoji de robot, yo ya doy quién lo envía en ajustes»). En el rol, nada */
  firmaDe(jid){
    const c = this.config.chats[jid] || {}, A = this.confAuto();
    if(typeof c.firma === 'string') return c.firma;
    return c.rol ? '' : (A.firma ? `${A.firma.replace(/^🤖\s*/, '')}:` : '');
  }
  async contestarSola(jid, nombre, nuevos, r){
    const A = this.confAuto(), ahora = this.reloj();
    const c = this.chat(jid), decide = !!(r.decide || r.urgente);
    /* en el rol, el formato del grupo lo pone el código, no la IA: así no se le olvida */
    const marca = this.rolDe(jid).marca;
    const resp = c.rol && !decide ? this.formatoRol({ ...c, marca }, r) : String(r.respuesta || '').trim();
    const cita = nuevos.slice(-3).map(x => (x.quien ? x.quien + ': ' : '') + x.texto).join(' / ').slice(0, 300);
    if(resp){
      const firma = this.firmaDe(jid);
      /* con marca de personaje, la firma va al final para no romper «🌌⚛️- …» del primer renglón */
      await this.mandar(jid, !firma ? resp : (c.rol && marca && !decide) ? resp + ' ' + firma : firma + ' ' + resp);
      this.estado.autos[jid] = [...(this.estado.autos[jid] || []).filter(t => ahora - t < 24 * HORA), ahora];
      const hoy = fechaMx(ahora);
      if(this.estado.autoHoy.fecha !== hoy) this.estado.autoHoy = { fecha: hoy, lista: [] };
      this.estado.autoHoy.lista.push({ nombre, dijo: cita.slice(0, 120), resp: resp.slice(0, 160), decide });
    }
    this.bitacora(jid, nombre, nuevos, decide ? 'decide' : resp ? 'contesto' : 'nada', resp,
      decide ? 'necesita tu decisión' + (r.motivo ? ': ' + r.motivo : '') : (r.porque || (resp ? this.porqueModo(jid) : 'no hacía falta contestar')));
    if(c.rol && !decide) await this.quizaSticker(jid, c, r, !!resp);
    if(decide){
      /* lo que sólo Carlos puede decidir se queda con él, con número para contestar */
      this.estado.propuestas = this.estado.propuestas.filter(p => !(p.chat === jid && p.tipo === 'respuesta'));
      const n = this.estado.sigN++;
      this.estado.propuestas.push({ n, chat: jid, nombre, texto: '', motivo: r.motivo || '', dijo: cita, urgente: !!r.urgente, t: ahora, tipo: 'respuesta' });
      await this.avisar(`#${n} · ${nombre} ⚠️ necesita tu decisión: «${cita}»` + (r.motivo ? `\n(${r.motivo})` : '') +
        (resp ? `\nYa le contesté: «${resp}»` : '') + `\n→ «${n} tu respuesta» y se la mando`);
    } else if(resp && !c.rol){
      /* en un rol no le avisa cada jugada (serían cientos): van en el resumen de la noche */
      await this.avisar(`✓ Le contesté sola a ${nombre}: «${resp}»\n(dijo: «${cita}»)`);
    }
    this.guardar();
  }

  /* «Por mandar» también enseña lo que llegó, qué hizo Secre y por qué (Carlos, 16 de octubre) */
  bitacora(jid, nombre, nuevos, que, resp, porque){
    const dijo = nuevos.slice(-3).map(x => (x.quien ? x.quien + ': ' : '') + x.texto).join(' / ').slice(0, 300);
    const l = this.estado.contestadas || (this.estado.contestadas = []);
    l.unshift({ t: this.reloj(), chat: jid, nombre, dijo, que, resp: String(resp || '').slice(0, 600), porque: String(porque || '').slice(0, 240) });
    this.estado.contestadas = l.slice(0, 150);
  }
  /* por qué este chat está en automático, dicho en cristiano */
  porqueModo(jid){
    const c = this.config.chats[jid] || {};
    if(c.rol) return 'sigo la historia del rol';
    if(c.grupo) return 'en este grupo contesto cuando te hablan';
    return c.modo === 'auto' ? 'este chat está en «Sola»' : 'contesto sola a cualquier número';
  }

  /* lo que Carlos le contó y no ha caducado */
  datosVigentes(){ const ahora = this.reloj(); return (this.config.datos || []).filter(d => !d.hasta || d.hasta > ahora); }
  agregarDato(texto, hasta){
    const t = String(texto || '').trim(); if(!t) return null;
    if(!this.config.datos) this.config.datos = [];
    if(this.config.datos.some(d => sinAcentos(d.texto) === sinAcentos(t))) return null;
    const n = this.config.datos.reduce((m, d) => Math.max(m, d.n), 0) + 1;
    const d = { n, texto: t.slice(0, 600), t: this.reloj() };
    const fin = finDe(hasta, this.reloj()); if(fin) d.hasta = fin;
    this.config.datos.push(d); this.config.datos = this.config.datos.slice(-80);
    return d;
  }

  agregarPendiente(jid, nombre, texto){
    const t = String(texto || '').trim(); if(!t) return;
    if(this.estado.pendientes.some(p => !p.hecho && p.chat === jid && sinAcentos(p.texto) === sinAcentos(t))) return;
    this.estado.pendientes.push({ n: this.estado.sigP++, chat: jid, nombre, texto: t.slice(0, 300), t: this.reloj(), hecho: false });
  }

  /* ── los buenos días y las buenas noches: listos a su hora ── */
  async saludos(ahora){
    const hoy = fechaMx(ahora);
    for(const s of this.config.saludos){
      const reg = this.estado.saludosHoy[s.chat];
      const r = reg && reg.fecha === hoy ? reg : (this.estado.saludosHoy[s.chat] = { fecha: hoy });
      for(const cual of ['manana', 'noche']){
        if(!s[cual] || r[cual]) continue;
        /* la hora exacta de hoy, con un poco de azar para que no sea siempre la misma */
        if(r[cual + 'En'] == null){ const v = Math.max(0, +s.variacion || 0); r[cual + 'En'] = aMin(s[cual]) + Math.round((this.azar() * 2 - 1) * v); }
        if(minDelDia(ahora) < r[cual + 'En']) continue;
        r[cual] = true;
        /* si ya pasó más de una hora (se puso a media tarde, o Secre estuvo apagada), hoy ya no: un «buenos días» a las 3 de la tarde no sirve */
        if(minDelDia(ahora) - r[cual + 'En'] > 60){ this.guardar(); continue; }
        const nombre = this.nombreDe(s.chat);
        /* el que Carlos dejó fijo con «N siempre»: sale tal cual, sin preguntar */
        const fijo = String(s[cual === 'manana' ? 'fijoManana' : 'fijoNoche'] || '').trim();
        if(fijo){
          await this.mandar(s.chat, fijo);
          await this.avisar(`Mandé el ${cual === 'manana' ? 'buenos días' : 'buenas noches'} fijo a ${nombre}: «${fijo}»`);
          this.guardar(); continue;
        }
        let texto = '';
        try{ texto = await this.ia.saludo({ dueno: this.config.nombre, nombre, cual, nota: this.chat(s.chat).nota || '', estilo: this.estado.estilo.slice(-40), antes: (this.estado.historial[s.chat] || []).filter(x => x.de === 'yo').slice(-6).map(x => x.texto) }); }
        catch(e){ texto = ''; }
        texto = texto || (cual === 'manana' ? 'buenos días ☀️' : 'buenas noches, descansa 🌙');
        const n = this.estado.sigN++;
        this.estado.propuestas.push({ n, chat: s.chat, nombre, texto, t: ahora, tipo: cual });
        await this.avisar(`#${n} · ${cual === 'manana' ? 'Buenos días' : 'Buenas noches'} para ${nombre}: «${texto}»\n→ «${n}» lo manda · «${n} tu texto» manda el tuyo · «x${n}» lo tira`);
        this.guardar();
      }
    }
  }

  async resumen(ahora){
    const hoy = fechaMx(ahora);
    if(this.estado.resumenFecha === hoy || aMin(this.config.resumen) == null || minDelDia(ahora) < aMin(this.config.resumen)) return;
    this.estado.resumenFecha = hoy;
    const abiertos = this.estado.pendientes.filter(p => !p.hecho);
    if(abiertos.length) await this.avisar('Pendientes de hoy:\n' + this.listaPendientes(abiertos) + '\n→ «hecho 3» para tacharlo');
    const solos = this.estado.autoHoy && this.estado.autoHoy.fecha === hoy ? this.estado.autoHoy.lista : [];
    if(solos.length){
      const cuenta = {}; for(const x of solos) cuenta[x.nombre] = (cuenta[x.nombre] || 0) + 1;
      await this.avisar(`Hoy contesté sola ${solos.length} mensaje(s): ` + Object.entries(cuenta).map(([n, k]) => `${n} (${k})`).join(', ') +
        (solos.some(x => x.decide) ? `\nEsperan tu decisión: ${[...new Set(solos.filter(x => x.decide).map(x => x.nombre))].join(', ')}` : ''));
    }
    this.guardar();
  }
  /* el repaso corto: qué hizo desde el anterior, qué espera su número y qué sigue
     pendiente. Sólo de día y sólo si pasó algo: que la notificación valga la pena */
  async repaso(ahora){
    const R = Object.assign({ cada: 3, desde: '09:00', hasta: '22:00' }, this.config.repaso || {});
    if(!(R.cada > 0)) return;
    const min = minDelDia(ahora);
    if(aMin(R.desde) == null || aMin(R.hasta) == null || min < aMin(R.desde) || min > aMin(R.hasta)) return;
    const desde = this.estado.repasoT || 0;
    /* recién prendida empieza a contar: el primero sale `cada` horas después */
    if(!desde){ this.estado.repasoT = ahora; this.guardar(); return; }
    if(ahora - desde < R.cada * HORA) return;
    /* el primero de la mañana cuenta lo de la noche (desde el último repaso) */
    const corte = desde && ahora - desde < 24 * HORA ? desde : ahora - R.cada * HORA;
    this.estado.repasoT = ahora;
    const txt = this.textoRepaso(corte);
    if(txt) await this.avisar(txt);
    this.guardar();
  }
  /* '' si no pasó nada desde `corte` */
  textoRepaso(corte){
    const hechas = (this.estado.contestadas || []).filter(x => x.t > corte);
    const esperan = this.estado.propuestas.filter(p => p.t > corte);
    const nuevosP = this.estado.pendientes.filter(p => !p.hecho && p.t > corte);
    if(!hechas.length && !esperan.length && !nuevosP.length) return '';
    const porChat = (que) => { const k = {}; for(const x of hechas.filter(h => que.includes(h.que))) k[x.nombre] = (k[x.nombre] || 0) + 1; return Object.entries(k).map(([n, c]) => c > 1 ? `${n} (${c})` : n).join(', '); };
    const contesto = porChat(['contesto', 'decide']), solo = porChat(['nada']), frenos = porChat(['freno', 'error']);
    const abiertos = this.estado.pendientes.filter(p => !p.hecho), vivas = this.estado.propuestas;
    const lineas = [`Repaso desde las ${horaMx(corte)}:`];
    if(contesto) lineas.push(`✓ Contesté sola: ${contesto}`);
    if(solo) lineas.push(`· Leí sin contestar: ${solo}`);
    if(frenos) lineas.push(`⏸ No pude o me detuve: ${frenos}`);
    if(vivas.length) lineas.push(`⏳ Esperan tu número (${vivas.length}): ` + vivas.slice(-8).map(p => `#${p.n} ${p.nombre}`).join(', '));
    if(abiertos.length) lineas.push(`📌 Pendientes (${abiertos.length}):\n` + this.listaPendientes(abiertos.slice(-8)) + (abiertos.length > 8 ? '\n…«pendientes» para verlos todos' : ''));
    return lineas.join('\n');
  }
  listaPendientes(ps){ return ps.map(p => `${p.n}. ${p.texto}${p.nombre ? ' (' + p.nombre + ')' : ''}`).join('\n'); }

  /* quién está de guardia ahora */
  deTurno(){
    const T = Object.assign({ activo: true, horas: 8, quienes: ['Secre', 'Paulina', 'Negro'], fijo: '' }, this.config.turnos || {});
    if(T.fijo) return T.fijo;
    if(!T.activo || !T.quienes.length) return 'Secre';
    const min = aMin(horaMx(this.reloj())), dia = Math.floor(Date.parse(fechaMx(this.reloj()) + 'T00:00:00Z') / 86_400_000);
    const bloquesPorDia = Math.max(1, Math.round(24 / Math.max(1, T.horas)));
    /* + dia: que se recorra cada día — con 3 turnos y 3 secretarias, sin eso a
       la misma hora siempre le tocaría a la misma (Negro siempre de noche) */
    const bloque = dia * bloquesPorDia + Math.floor(min / (Math.max(1, T.horas) * 60)) + dia;
    return T.quienes[bloque % T.quienes.length];
  }
  /* a Carlos, en su chat propio; siempre empieza con 🤖 para no confundirse con él,
     y dice quién de las tres está de turno */
  async avisar(texto){
    const quien = this.deTurno();
    this.charlar(quien.toLowerCase(), texto);
    const id = await this.transporte.enviar(this.destinoAvisos(), `🤖 ${quien}: ` + texto);
    if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); }
  }
  /* mandar a otra persona: SÓLO desde una orden de Carlos (aprobar una propuesta) */
  async mandar(jid, texto){
    const largo = Math.min(2500, 400 + texto.length * 15);   /* «escribiendo…» corto: que conteste ya */
    const llave = jid + '|' + texto; this.mandando.set(llave, this.reloj());
    for(const [k, t] of this.mandando) if(this.reloj() - t > 2 * MIN) this.mandando.delete(k);
    try{ await this.transporte.leido && this.transporte.leido(jid); }catch{}
    try{ await this.transporte.escribiendo && this.transporte.escribiendo(jid, largo); }catch{}
    const id = await this.transporte.enviar(jid, texto);
    if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); }
    const h = this.estado.historial[jid] || (this.estado.historial[jid] = []);
    h.push({ de: 'yo', secre: true, texto, t: this.reloj() }); this.estado.historial[jid] = h.slice((this.config.chats[jid] || {}).grupo ? -60 : -30);
    this.anotar(`mandó a ${this.nombreDe(jid)}: ${texto.slice(0, 80)}`);
    return id;
  }

  /* ══ las órdenes de Carlos, en su chat propio ══════════════════════════ */
  charlar(de, texto){ this.estado.charla.push({ de, texto, t: this.reloj() }); this.estado.charla = this.estado.charla.slice(-150); }
  async orden(texto){
    const t = texto.trim(), s = sinAcentos(t);
    this.charlar('carlos', t);
    let m;
    /* aprobar / cambiar / tirar una propuesta: «3», «3 sí voy», «x3» */
    if((m = /^#?(\d+)(?:\s+([\s\S]+))?$/.exec(t))){
      const p = this.estado.propuestas.find(x => x.n === +m[1]);
      if(!p) return this.avisar(`No tengo la #${m[1]} (o ya caducó).`);
      /* «3 siempre» (o «3 siempre otro texto») en un saludo: lo manda y lo deja
         FIJO — desde mañana sale solo a su hora, con ese texto exacto */
      const siempre = /^siempre\b[:\s]*/i.exec(m[2] || '');
      const final = (siempre ? (m[2].slice(siempre[0].length) || p.texto) : (m[2] || p.texto)).trim();
      if(!final) return this.avisar(`La #${m[1]} no trae texto: escribe «${m[1]} lo que quieras decir».`);
      this.estado.propuestas = this.estado.propuestas.filter(x => x !== p);
      await this.mandar(p.chat, final);
      let extra = '';
      if(siempre && (p.tipo === 'manana' || p.tipo === 'noche')){
        const sal = this.config.saludos.find(x => x.chat === p.chat);
        if(sal){ sal[p.tipo === 'manana' ? 'fijoManana' : 'fijoNoche'] = final; extra = `\nDesde mañana se lo mando así, solo, a su hora. «quita fijo ${p.nombre}» para que te lo vuelva a proponer.`; }
      }
      this.guardar();
      return this.avisar(`Listo, a ${p.nombre}: «${final}»` + extra);
    }
    if((m = /^x\s*#?(\d+)$/.exec(s))){
      const antes = this.estado.propuestas.length;
      this.estado.propuestas = this.estado.propuestas.filter(x => x.n !== +m[1]);
      this.guardar();
      return this.avisar(antes === this.estado.propuestas.length ? `No tengo la #${m[1]}.` : `Tirada la #${m[1]}.`);
    }
    /* «todas» manda de golpe las que estén listas; «todas menos 3 5» deja ésas.
       Carlos, 16 de octubre: no tiene tiempo de aprobar una por una en el día. */
    if((m = /^\/?(?:manda(?:las)?\s+|ok\s+)?(?:todas|todo)(?:\s+menos\s+([\d\s,y#]+))?$/.exec(s))){
      const menos = new Set((m[1] || '').match(/\d+/g)?.map(Number) || []);
      const van = this.estado.propuestas.filter(p => String(p.texto || '').trim() && !menos.has(p.n));
      if(!van.length) return this.avisar('No hay nada listo para mandar.');
      this.estado.propuestas = this.estado.propuestas.filter(p => !van.includes(p));
      for(const p of van) await this.mandar(p.chat, p.texto.trim());
      this.guardar();
      return this.avisar(`Listo, mandé ${van.length}: ${van.map(p => p.nombre).join(', ')}` + (menos.size ? ` (me quedo con la ${[...menos].map(n => '#' + n).join(', ')})` : ''));
    }
    if((m = /^\/?(?:quita(?:r)?|ya no)\s+(?:el\s+)?fijo\s+(?:a\s+|de\s+)?(.+)$/.exec(s))){
      const j = this.buscarChat(m[1]), sal = j && this.config.saludos.find(x => x.chat === j);
      if(!sal) return this.avisar(`No tengo saludos para «${m[1]}».`);
      delete sal.fijoManana; delete sal.fijoNoche; this.guardar();
      return this.avisar(`Listo: a ${this.nombreDe(j)} te vuelvo a proponer los saludos antes de mandarlos.`);
    }
    /* el modo automático: «automático Ana» · «automático todos» · «manual Ana» · «apaga automático» */
    if(/^\/?(?:apaga(?:r)?\s+(?:el\s+)?(?:modo\s+)?automatico|automatico\s+(?:no|off|apagado)|sin automatico|ya no contestes sola?)$/.test(s)){
      if(this.config.porDefecto === 'auto') this.config.porDefecto = 'borrador';
      for(const c of Object.values(this.config.chats)) if(c.modo === 'auto'){ c.modo = 'borrador'; c.rol = false; }
      this.config.reglas = this.config.reglas.filter(r => r.modo !== 'auto');
      this.guardar();
      return this.avisar('Apagado: ya no le contesto sola a nadie. Todo vuelve a ser propuesta para que tú la mandes.');
    }
    if(/^\/?(?:modo\s+)?automatico$/.test(s)) return this.avisar(this.textoAuto());
    if((m = /^\/?(?:modo\s+)?(?:automatico|auto|contesta(?:le)? sola?)\s+(?:a\s+|con\s+)?(.+)$/.exec(s))){
      if(/^(todos|todas|todo|a todos|todo el mundo)$/.test(m[1].trim())){
        this.config.porDefecto = 'auto'; this.guardar();
        return this.avisar(`Listo: le contesto sola a todos los que te escriban (menos grupos y los que tengas en manual o callado), firmado como «${this.confAuto().firma}». Lo que necesite tu decisión te lo dejo aquí con número.\n«apaga automático» para regresar a propuestas.`);
      }
      const j = this.buscarChat(m[1]);
      if(!j) return this.avisar(`No tengo a «${m[1]}» en tus chats (tiene que haberte escrito antes).`);
      const c = this.chat(j); c.modo = 'auto'; c.rol = false; this.guardar();
      if(c.grupo) return this.avisar(`Listo: en el grupo ${this.nombreDe(j)} contesto sola cuando te hablen o te pregunten a ti (hasta ${this.confAuto().grupoPorHora} por hora). Si es para seguir una historia, escribe «rol ${this.nombreDe(j)}».\n«manual ${this.nombreDe(j)}» para regresarlo.`);
      return this.avisar(`Listo: a ${this.nombreDe(j)} le contesto sola, como tu asistente. Lo que necesite tu decisión (dinero, citas, compromisos) te lo dejo aquí.\n«manual ${this.nombreDe(j)}» para regresarlo.`);
    }
    if((m = /^\/?manual\s+(?:a\s+|con\s+)?(.+)$/.exec(s))){
      const j = this.buscarChat(m[1]);
      if(!j) return this.avisar(`No tengo a «${m[1]}» en tus chats.`);
      const c = this.chat(j); c.modo = c.grupo ? '' : 'borrador'; c.rol = false; this.guardar();
      return this.avisar(c.grupo ? `${this.nombreDe(j)}: ya no contesto sola en el grupo.` : `${this.nombreDe(j)}: otra vez te propongo y tú mandas.`);
    }
    /* el rol: «rol Taberna» · «rol Taberna: Kael, mercenario callado que odia a los magos» */
    if((m = /^\/?(?:modo\s+)?rol\s+(?:en\s+|a\s+)?([^:]+?)(?:\s*:\s*([\s\S]+))?$/i.exec(t))){
      const j = this.buscarChat(m[1]);
      if(!j) return this.avisar(`No tengo a «${m[1].trim()}» en tus chats (tiene que haber escrito alguien ahí desde que prendiste a Secre).`);
      const c = this.chat(j); c.modo = 'auto'; c.rol = true;
      if(m[2]) c.personaje = m[2].trim().slice(0, 800);
      this.guardar();
      return this.avisar(`Listo: en ${this.nombreDe(j)} sigo la historia sola mientras no estás` + (c.personaje ? `, como ${c.personaje.split(/[,.]/)[0]}` : '') + `. Si entras a escribir me hago a un lado 15 min.` +
        (c.personaje ? '' : `\nDime quién es tu personaje: «personaje ${this.nombreDe(j)}: nombre, cómo es, qué quiere».`) +
        (c.mundo ? '' : `\nY cuéntame del mundo: «mundo ${this.nombreDe(j)}: dónde pasa, reglas, quién es quién, qué ha pasado».`) +
        `\n«firma ${this.nombreDe(j)}: …» para que el grupo sepa que soy yo.\n«manual ${this.nombreDe(j)}» para pararlo.`);
    }
    if((m = /^\/?personaje\s+(?:en\s+|de\s+)?([^:]+?)\s*:\s*([\s\S]+)$/i.exec(t))){
      const j = this.buscarChat(m[1]);
      if(!j) return this.avisar(`No tengo a «${m[1].trim()}» en tus chats.`);
      this.chat(j).personaje = m[2].trim().slice(0, 800); this.guardar();
      return this.avisar(`Anotado tu personaje en ${this.nombreDe(j)}.`);
    }
    /* el mundo del rol: «mundo Taberna: reino de Valdor, la magia está prohibida…»
       · «mundo Taberna: + lo que pasó hoy» lo agrega · «mundo Taberna» lo enseña */
    if((m = /^\/?(?:mundo|historia|lore|contexto)\s+(?:de\s+|en\s+|del\s+)?([^:]+?)(?:\s*:\s*([\s\S]*))?$/i.exec(t))){
      const j = this.buscarChat(m[1]); if(!j) return this.avisar(`No tengo a «${m[1].trim()}» en tus chats.`);
      const c = this.chat(j), nuevo = (m[2] || '').trim();
      if(!nuevo) return this.avisar(c.mundo ? `El mundo de ${this.nombreDe(j)}:\n${c.mundo}` : `No me has contado nada del mundo de ${this.nombreDe(j)}. Escribe «mundo ${this.nombreDe(j)}: …».`);
      const agrega = /^\+\s*/.exec(nuevo);
      c.mundo = (agrega && c.mundo ? c.mundo + '\n' + nuevo.slice(agrega[0].length) : nuevo.replace(/^\+\s*/, '')).slice(-4000);
      this.guardar();
      return this.avisar(`${agrega ? 'Agregado al' : 'Guardé el'} mundo de ${this.nombreDe(j)} (${c.mundo.length} letras). Lo leo antes de cada jugada.`);
    }
    /* la marca del personaje: «marca Taberna: 🌌⚛️-» · «quita marca Taberna» */
    if((m = /^\/?(?:quita(?:r)?|sin)\s+(?:la\s+)?marca\s+(?:en\s+|de\s+)?(.+)$/i.exec(t))){
      const j = this.buscarChat(m[1]); if(!j) return this.avisar(`No tengo a «${m[1].trim()}» en tus chats.`);
      delete this.chat(j).marca; this.guardar();
      return this.avisar(`En ${this.nombreDe(j)} ya no pongo marca de personaje.`);
    }
    if((m = /^\/?marca\s+(?:en\s+|de\s+)?([^:]+?)\s*:\s*(.+)$/i.exec(t))){
      const j = this.buscarChat(m[1]); if(!j) return this.avisar(`No tengo a «${m[1].trim()}» en tus chats.`);
      this.chat(j).marca = m[2].trim().slice(0, 30); this.guardar();
      const mk = this.chat(j).marca;
      return this.avisar(`Listo: en ${this.nombreDe(j)} lo que dice tu personaje sale como\n${mk} lo que dice\ny lo que hace como\n> lo que hace`);
    }
    /* los stickers: «stickers Taberna» cuántos tiene · «borra stickers Taberna» */
    if((m = /^\/?(borra(?:r)?\s+(?:los\s+)?)?stickers\s+(?:de\s+|en\s+)?(.+)$/i.exec(t))){
      const j = this.buscarChat(m[2]); if(!j) return this.avisar(`No tengo a «${m[2].trim()}» en tus chats.`);
      const c = this.chat(j);
      if(m[1]){ c.stickers = []; this.guardar(); return this.avisar(`Borré tus stickers de ${this.nombreDe(j)}.`); }
      return this.avisar((c.stickers || []).length ? `Tengo ${c.stickers.length} sticker(s) tuyos de ${this.nombreDe(j)} y los uso de vez en cuando (uno cada 10 min como máximo). Manda más ahí y los aprendo.` : `Todavía no tengo stickers tuyos de ${this.nombreDe(j)}: manda unos en ese grupo y los aprendo (hasta 8).`);
    }
    /* la firma de un chat: «firma Taberna: 🎭 Kael» · «sin firma Taberna» · «firma normal Taberna» */
    if((m = /^\/?sin\s+firma\s+(?:en\s+)?(.+)$/i.exec(t))){
      const j = this.buscarChat(m[1]); if(!j) return this.avisar(`No tengo a «${m[1].trim()}» en tus chats.`);
      this.chat(j).firma = ''; this.guardar();
      return this.avisar(`Listo: en ${this.nombreDe(j)} mis mensajes salen sin firma, como si fueras tú. Ojo: ahí nadie va a saber que es automático.`);
    }
    if((m = /^\/?firma\s+normal\s+(?:en\s+)?(.+)$/i.exec(t))){
      const j = this.buscarChat(m[1]); if(!j) return this.avisar(`No tengo a «${m[1].trim()}» en tus chats.`);
      delete this.chat(j).firma; this.guardar();
      return this.avisar(`En ${this.nombreDe(j)} vuelvo a firmar «${this.firmaDe(j)}».`);
    }
    if((m = /^\/?firma\s+(?:en\s+)?([^:]+?)\s*:\s*(.+)$/i.exec(t))){
      const j = this.buscarChat(m[1]); if(!j) return this.avisar(`No tengo a «${m[1].trim()}» en tus chats.`);
      this.chat(j).firma = m[2].trim().slice(0, 40); this.guardar();
      return this.avisar(`En ${this.nombreDe(j)} firmo «${this.chat(j).firma}».`);
    }
    if(/^\/?avisos? (aqui|aca|a mi chat|al mio|aqui mismo)$/.test(s)){ this.config.avisarA = 'yo'; this.guardar(); return this.avisar('Listo: te aviso en tu chat propio de esta cuenta (ahí no suena).'); }
    if(/^\/?avisos? (a la otra|a mi otra cuenta|a la otra cuenta|al otro numero|con notificacion)$/.test(s)){
      this.config.avisarA = 'otra'; this.guardar();
      return this.avisar(this.destinoAvisos() === this.transporte.yo()[0] ? 'Anotado, pero tu otra cuenta no está vinculada en esta Secre: sigo avisándote aquí.' : 'Listo: te aviso en el chat con tu otra cuenta, para que te suene. Contéstame ahí mismo.');
    }
    if(/^\/?repaso$/.test(s)){ const ahora = this.reloj(); return this.avisar(this.textoRepaso(this.estado.repasoT || ahora - 12 * HORA) || 'Desde el último repaso no ha pasado nada. «pendientes» para ver lo que sigue abierto.'); }
    if((m = /^\/?repaso (?:cada )?(\d+)\s*(?:h|horas?)?$/.exec(s))){ this.config.repaso = { ...(this.config.repaso || {}), cada: +m[1] }; this.guardar(); return this.avisar(+m[1] ? `Listo: te mando un repaso cada ${m[1]} h (de ${this.config.repaso.desde || '09:00'} a ${this.config.repaso.hasta || '22:00'}), sólo si pasó algo.` : 'Repaso apagado. Queda el resumen de la noche.'); }
    if(/^\/?(ayuda|help|\?)$/.test(s)) return this.avisar(AYUDA);
    if(/^\/?(pendientes|que tengo|qué tengo)$/.test(s)){
      const a = this.estado.pendientes.filter(p => !p.hecho);
      return this.avisar(a.length ? 'Pendientes:\n' + this.listaPendientes(a) : 'No tienes pendientes. 🎉');
    }
    if((m = /^\/?(hecho|listo|tache|tacha)\s+(\d+)$/.exec(s))){
      const p = this.estado.pendientes.find(x => x.n === +m[2] && !x.hecho);
      if(!p) return this.avisar(`No tengo abierto el pendiente ${m[2]}.`);
      p.hecho = true; this.guardar();
      return this.avisar(`Tachado: ${p.texto}`);
    }
    if((m = /^\/?(anota|apunta|pendiente)[:\s]+([\s\S]+)$/i.exec(t))){
      this.agregarPendiente('', '', m[2]); this.guardar();
      return this.avisar(`Anotado: ${m[2].trim()}`);
    }
    /* «dato: el viernes hay examen de mate a las 8» · «datos» · «olvida 2» */
    if((m = /^\/?(dato|recuerda|ojo|toma en cuenta)[:\s]+([\s\S]+)$/i.exec(t))){
      const d = this.agregarDato(m[2]); this.guardar();
      return this.avisar(d ? `Lo tengo (dato ${d.n}). Lo uso cuando venga al caso en lo que te propongo.` : 'Eso ya lo sabía.');
    }
    if(/^\/?(datos|que sabes|qué sabes|lo que sabes)$/.test(s)){
      const ds = this.datosVigentes();
      return this.avisar(ds.length ? 'Lo que me has contado:\n' + ds.map(d => `${d.n}. ${d.texto}${d.hasta ? ' (hasta el ' + fechaMx(d.hasta - 1) + ')' : ''}`).join('\n') + '\n→ «olvida 2» para quitar uno' : 'No me has contado nada todavía. Escribe «dato: …».');
    }
    if((m = /^\/?(olvida|borra el dato)\s+(\d+)$/.exec(s))){
      const antes = (this.config.datos || []).length;
      this.config.datos = (this.config.datos || []).filter(d => d.n !== +m[2]); this.guardar();
      return this.avisar(antes === this.config.datos.length ? `No tengo el dato ${m[2]}.` : `Olvidado el dato ${m[2]}.`);
    }
    if((m = /^\/?pausa(?:\s+(.+))?$/.exec(s))){
      const d = duracion(m[1] || '1h', this.reloj()) || HORA;
      this.config.pausaHasta = this.reloj() + d; this.guardar();
      return this.avisar(`En pausa hasta las ${horaMx(this.config.pausaHasta)}. No te propongo nada (sí anoto pendientes).`);
    }
    /* «turno de Paulina» · «que conteste Negro» · «turnos» (vuelven a rotar) */
    if((m = /^(?:\/?turno de|que (?:conteste|responda|atienda)|guardia)\s+(secre|paulina|negro)$/.exec(s))){ const h = this.aplicar({ accion: 'turnos', fijo: m[1] }); this.guardar(); return this.avisar(h); }
    if(/^\/?(turnos|que roten|rotar)$/.test(s)){ const h = this.aplicar({ accion: 'turnos', activo: true, fijo: '' }); this.guardar(); return this.avisar(h); }
    if(/^\/?(sigue|reanuda|despierta)$/.test(s)){ this.config.pausaHasta = 0; this.guardar(); return this.avisar('De vuelta.'); }
    if(/^\/?(estado|como vas|cómo vas)$/.test(s)) return this.avisar(this.textoEstado());
    if(/^\/?chats$/.test(s)) return this.avisar(this.textoChats());
    /* lo demás se lo pasa a la IA, que lo convierte en cambios de configuración */
    return this.ordenLibre(t);
  }

  async ordenLibre(texto){
    let r;
    try{ r = await this.ia.orden({ quien: this.deTurno(), texto, ahora: this.reloj(), hoy: fechaMx(this.reloj()), hora: horaMx(this.reloj()), chats: Object.entries(this.config.chats).filter(([, c]) => c.nombre).map(([j, c]) => ({ id: j, nombre: c.nombre, modo: c.modo || '', etiquetas: c.etiquetas || [] })), config: this.resumenConfig() }); }
    catch(e){ return this.avisar('No te entendí (y la IA no contestó). Escribe «ayuda» para ver lo que sé hacer.'); }
    const hechos = [];
    for(const a of (r && r.acciones) || []){ const h = this.aplicar(a); if(h) hechos.push(h); }
    this.guardar();
    const dice = (r && r.respuesta) || '';
    return this.avisar([dice, ...hechos.map(h => '✓ ' + h)].filter(Boolean).join('\n') || 'No te entendí. Escribe «ayuda».');
  }

  /* una acción ya interpretada → cambio de configuración. Devuelve qué hizo, o '' si no aplica.
     También la usa el panel. */
  aplicar(a){
    if(!a || typeof a !== 'object') return '';
    const chatDe = (x) => x ? (this.config.chats[x] ? x : this.buscarChat(x)) : null;
    const ahora = this.reloj();
    const hasta = finDe(a.hasta, ahora);
    switch(a.accion){
      case 'modo': {
        const j = chatDe(a.chat); if(!j || !MODOS.includes(a.modo)) return '';
        this.chat(j).modo = a.modo; if(a.modo !== 'auto') this.chat(j).rol = false; return `${this.nombreDe(j)}: ${a.modo === 'callado' ? 'ya no te propongo respuestas (sí anoto pendientes)' : a.modo === 'auto' ? 'le contesto sola, como tu asistente' : 'te propongo respuestas'}`;
      }
      case 'saludos': {
        const j = chatDe(a.chat); if(!j) return '';
        const ok = (h) => aMin(h) != null ? h.padStart(5, '0') : '';
        let s = this.config.saludos.find(x => x.chat === j);
        if(!s){ s = { chat: j, manana: '', noche: '', variacion: 10 }; this.config.saludos.push(s); }
        if(a.manana !== undefined) s.manana = ok(a.manana || '');
        if(a.noche !== undefined) s.noche = ok(a.noche || '');
        if(a.variacion !== undefined) s.variacion = Math.max(0, Math.min(60, +a.variacion || 0));
        return `Saludos a ${this.nombreDe(j)}: ${s.manana ? 'buenos días ' + s.manana : 'sin buenos días'} · ${s.noche ? 'buenas noches ' + s.noche : 'sin buenas noches'}`;
      }
      case 'quitarSaludos': {
        const j = chatDe(a.chat); if(!j) return '';
        this.config.saludos = this.config.saludos.filter(x => x.chat !== j);
        return `Ya no hay saludos para ${this.nombreDe(j)}`;
      }
      case 'nota': {
        const j = chatDe(a.chat); if(!j) return '';
        this.chat(j).nota = String(a.texto || '').slice(0, 500); return `Nota de ${this.nombreDe(j)} guardada`;
      }
      case 'etiqueta': {
        const j = chatDe(a.chat); if(!j || !a.etiqueta) return '';
        const c = this.chat(j), e = sinAcentos(a.etiqueta);
        c.etiquetas = [...new Set([...(c.etiquetas || []), e])]; return `${this.nombreDe(j)} es de «${e}»`;
      }
      case 'regla': {
        if(!MODOS.includes(a.modo)) return '';
        const r = { id: 'r' + Date.now().toString(36) + Math.floor(this.azar() * 1e4), modo: a.modo };
        if(Array.isArray(a.palabras) && a.palabras.length) r.palabras = a.palabras.map(String).slice(0, 30);
        if(Array.isArray(a.etiquetas) && a.etiquetas.length) r.etiquetas = a.etiquetas.map(sinAcentos);
        if(Array.isArray(a.chats) && a.chats.length) r.chats = a.chats.map(chatDe).filter(Boolean);
        if(a.de && a.a && aMin(a.de) != null && aMin(a.a) != null){ r.de = a.de; r.a = a.a; }
        if(hasta) r.hasta = hasta;
        if(!r.palabras && !r.etiquetas && !r.chats && !r.de) return '';
        this.config.reglas.push(r);
        return `Regla: ${a.modo === 'callado' ? 'no proponer' : a.modo === 'auto' ? 'contestar sola' : 'sí proponer'}${r.palabras ? ' si hablan de ' + r.palabras.join(', ') : ''}${r.etiquetas ? ' con los de ' + r.etiquetas.join(', ') : ''}${r.chats ? ' con ' + r.chats.map(j => this.nombreDe(j)).join(', ') : ''}${r.de ? ` de ${r.de} a ${r.a}` : ''}${r.hasta ? ' hasta el ' + fechaMx(r.hasta - 1) : ''}`;
      }
      case 'quitarRegla': {
        const antes = this.config.reglas.length;
        this.config.reglas = this.config.reglas.filter(r => r.id !== a.id);
        return antes === this.config.reglas.length ? '' : 'Regla quitada';
      }
      case 'pausa': { const d = duracion(a.cuanto || '1h', ahora) || HORA; this.config.pausaHasta = ahora + d; return `En pausa hasta las ${horaMx(this.config.pausaHasta)}`; }
      case 'reanudar': this.config.pausaHasta = 0; return 'De vuelta';
      case 'anota': { this.agregarPendiente('', '', a.texto); return a.texto ? `Anotado: ${a.texto}` : ''; }
      case 'hecho': { const p = this.estado.pendientes.find(x => x.n === +a.n && !x.hecho); if(!p) return ''; p.hecho = true; return `Tachado: ${p.texto}`; }
      case 'avisos': { this.config.avisarA = a.a === 'yo' ? 'yo' : 'otra'; return this.config.avisarA === 'yo' ? 'Te aviso en tu chat propio' : 'Te aviso desde tu otra cuenta'; }
      case 'repaso': { const k = Math.max(0, Math.min(12, Math.round(+a.cada || 0))); this.config.repaso = { ...(this.config.repaso || { desde: '09:00', hasta: '22:00' }), cada: k }; return k ? `Repaso cada ${k} h` : 'Repaso apagado'; }
      case 'resumen': { if(aMin(a.hora) == null) return ''; this.config.resumen = a.hora; return `Resumen de pendientes a las ${a.hora}`; }
      case 'porDefecto': { if(!MODOS.includes(a.modo)) return ''; this.config.porDefecto = a.modo; return `Chats sin modo propio: ${a.modo === 'auto' ? 'contesto sola' : a.modo}`; }
      case 'auto': {
        const A = this.config.auto = this.confAuto();
        if(a.firma !== undefined) A.firma = String(a.firma || '').slice(0, 40);
        if(a.porHora !== undefined && +a.porHora >= 1 && +a.porHora <= 30) A.porHora = Math.round(+a.porHora);
        if(a.alDia !== undefined && +a.alDia >= 1 && +a.alDia <= 200) A.alDia = Math.round(+a.alDia);
        return `Automático: firma «${A.firma || '(sin firma)'}» · hasta ${A.porHora} por hora y ${A.alDia} al día en cada chat`;
      }
      case 'turnos': {
        const T = this.config.turnos = Object.assign({ activo: true, horas: 8, quienes: ['Secre', 'Paulina', 'Negro'], fijo: '' }, this.config.turnos || {});
        const valido = (n) => ['Secre', 'Paulina', 'Negro'].find(x => sinAcentos(x) === sinAcentos(n || '')) || '';
        if(a.activo !== undefined) T.activo = !!a.activo;
        if(a.horas !== undefined && +a.horas >= 1 && +a.horas <= 24) T.horas = Math.round(+a.horas);
        if(Array.isArray(a.quienes)){ const q = a.quienes.map(valido).filter(Boolean); if(q.length) T.quienes = [...new Set(q)]; }
        if(a.fijo !== undefined) T.fijo = valido(a.fijo);
        return T.fijo ? `De guardia fija: ${T.fijo}` : T.activo ? `Turnos de ${T.horas} h entre ${T.quienes.join(', ')} · ahorita le toca a ${this.deTurno()}` : 'Sin turnos: sólo Secre';
      }
      case 'dato': { const d = this.agregarDato(a.texto, a.hasta); return d ? `Lo tengo (dato ${d.n})${d.hasta ? ', hasta el ' + fechaMx(d.hasta - 1) : ''}` : ''; }
      case 'olvidaDato': { const antes = (this.config.datos || []).length; this.config.datos = (this.config.datos || []).filter(d => d.n !== +a.n); return antes === this.config.datos.length ? '' : `Olvidado el dato ${a.n}`; }
      default: return '';
    }
  }

  resumenConfig(){
    const c = this.config;
    return { porDefecto: c.porDefecto, grupos: c.grupos, resumen: c.resumen, pausaHasta: c.pausaHasta ? horaMx(c.pausaHasta) : '',
      saludos: c.saludos.map(s => ({ chat: this.nombreDe(s.chat), manana: s.manana, noche: s.noche })),
      reglas: c.reglas.map(r => ({ id: r.id, modo: r.modo, palabras: r.palabras, etiquetas: r.etiquetas, chats: (r.chats || []).map(j => this.nombreDe(j)), de: r.de, a: r.a, hasta: r.hasta ? fechaMx(r.hasta - 1) : '' })) };
  }
  textoEstado(){
    const c = this.config, a = this.estado.pendientes.filter(p => !p.hecho).length;
    return [`Cuenta: ${this.cuenta}`, c.pausaHasta > this.reloj() ? `⏸ En pausa hasta las ${horaMx(c.pausaHasta)}` : '▶ Activa',
      `${this.estado.propuestas.length} propuesta(s) esperando · ${a} pendiente(s)`,
      `Saludos: ${c.saludos.length ? c.saludos.map(s => `${this.nombreDe(s.chat)} (${s.manana || '—'} / ${s.noche || '—'})`).join(', ') : 'ninguno'}`,
      `Reglas: ${c.reglas.length}`, `Datos que me contaste: ${this.datosVigentes().length}`, `De turno: ${this.deTurno()}`, this.textoAuto()].join('\n');
  }
  textoAuto(){
    const solos = Object.entries(this.config.chats).filter(([, c]) => c.modo === 'auto' && c.nombre).map(([, c]) => c.nombre + (c.rol ? ' (rol)' : c.grupo ? ' (grupo)' : ''));
    if(this.config.porDefecto === 'auto') return 'Automático: le contesto sola a todos (menos grupos' + (Object.values(this.config.chats).some(c => c.modo && c.modo !== 'auto') ? ' y los que pusiste aparte' : '') + ').' + (solos.some(x => / \((rol|grupo)\)$/.test(x)) ? ` Grupos: ${solos.filter(x => / \((rol|grupo)\)$/.test(x)).join(', ')}.` : '');
    return solos.length ? `Automático con: ${solos.join(', ')}.` : 'Automático: apagado (todo es propuesta). «automático Ana» o «automático todos» para prenderlo.';
  }
  textoChats(){
    const l = Object.entries(this.config.chats).filter(([, c]) => c.nombre).slice(0, 40);
    return l.length ? l.map(([j, c]) => `· ${c.nombre}: ${this.modo(j)}${(c.etiquetas || []).length ? ' [' + c.etiquetas.join(', ') + ']' : ''}`).join('\n') : 'Todavía no me ha escrito nadie.';
  }
}

export const AYUDA = `Lo que sé hacer (escríbelo aquí, en tu chat):
· «3» manda la propuesta #3 · «3 tu texto» manda el tuyo · «x3» la tira
· «todas» manda todas las que estén listas · «todas menos 3 5» deja ésas
· en un saludo, «3 siempre» lo deja fijo: sale solo cada día · «quita fijo Ana»
· «pendientes» · «hecho 2» · «anota comprar pilas»
· «dato: el viernes hay examen de mate a las 8, temas: derivadas» · «datos» · «olvida 2»
· «automático Ana» le contesto sola · «automático todos» (menos grupos) · «manual Ana» · «apaga automático»
· en un grupo, sólo si tú lo dices: «automático Equipo» contesto cuando te hablan · «rol Taberna» sigo la historia
· «marca Taberna: 🌌⚛️-» lo que dice tu personaje sale con esa marca y lo que hace con «> » · «stickers Taberna» · «borra stickers Taberna»
· «personaje Taberna: Kael, mercenario callado» · «mundo Taberna: reino de Valdor, la magia está prohibida…» («mundo Taberna: + lo nuevo» agrega) · «sin firma Taberna» · «firma Taberna: 🎭 Kael» · «firma normal Taberna»
· «pausa 2h» / «pausa hoy» · «sigue»
· «repaso» qué hice y qué falta, ya · «repaso cada 2h» · «repaso 0» lo apaga
· «avisos a la otra» te escribo desde tu otra cuenta (suena) · «avisos aquí» en tu chat propio
· «estado» · «chats»
Y en palabras normales, por ejemplo:
· «a Ana dale buenos días a las 7 y buenas noches a las 10:30»
· «esta semana no le propongas nada a nadie de la escuela»
· «Ana es de la escuela» · «Beto es mi primo, háblale con confianza»
· «con mi mamá no me propongas nada»`;
