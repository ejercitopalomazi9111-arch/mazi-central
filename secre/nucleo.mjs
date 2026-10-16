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
   ═════════════════════════════════════════════════════════════════════════ */

export const MODOS = ['borrador', 'callado'];
const MIN = 60_000, HORA = 60 * MIN;
const TZ = 'America/Mexico_City';

export function configBase(){
  return {
    nombre: 'Carlos',
    porDefecto: 'borrador',        /* chats que no tienen modo propio */
    grupos: 'callado',             /* en grupos sólo anota pendientes */
    chats: {},                     /* jid → { nombre, modo, nota, etiquetas: [] } */
    saludos: [],                   /* { chat, manana: '07:00', noche: '22:30', variacion: 10 } */
    reglas: [],                    /* { id, palabras?, etiquetas?, chats?, de?, a?, modo, hasta? } */
    datos: [],                     /* lo que Carlos le cuenta para contestar: { n, texto, hasta? } — «el viernes hay examen de mate a las 8» */
    pausaHasta: 0,
    resumen: '21:30',              /* el resumen de pendientes del día */
    /* turnos de secretaria (Carlos, 16 de octubre: «que pueda responder
       cualquiera de los 3, Secre, Paulina o Negro, como si rotaran turnos»).
       Bloques de `horas` contados desde la medianoche de México. `fijo` = una
       sola de guardia hasta que se diga otra cosa. */
    turnos: { activo: true, horas: 8, quienes: ['Secre', 'Paulina', 'Negro'], fijo: '' },
    juntar: 45,                    /* segundos que espera a que la otra persona termine de escribir */
    esperaSiContesto: 15,          /* minutos que Secre se calla en un chat donde Carlos acaba de escribir */
    caducan: 6,                    /* horas que vive una propuesta sin aprobar */
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
    this.config = Object.assign(configBase(), almacen.leer('config', {}));
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
      registro: [],        /* lo que hizo, para el panel */
      charla: [],          /* la plática de Carlos con Secre, también para el panel */
      resumenFecha: '',
      sigN: 1, sigP: 1,
    }, almacen.leer('estado', {}));
    this.ocupados = new Set();
  }

  guardar(){ this.almacen.guardar('config', this.config); this.almacen.guardar('estado', this.estado); }
  anotar(que){ this.estado.registro.push({ t: this.reloj(), que }); this.estado.registro = this.estado.registro.slice(-300); }

  /* ── quién es quién ── */
  chat(jid){ return this.config.chats[jid] || (this.config.chats[jid] = { nombre: '', modo: '', nota: '', etiquetas: [] }); }
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

  /* ── el modo que toca en este chat, ahora ── */
  modo(jid, texto = '', grupo = false){
    const ahora = this.reloj(), c = this.config.chats[jid] || {};
    if(this.config.pausaHasta > ahora) return 'callado';
    const tomado = this.estado.tomado[jid];
    if(tomado && ahora - tomado < this.config.esperaSiContesto * MIN) return 'callado';
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
    const c = this.chat(m.chat);
    /* en un grupo, el chat se llama como el grupo, no como quien escribió */
    const nc = m.grupo ? m.nombreChat : m.nombre;
    if(nc && !c.nombre && (m.grupo || !m.mio)) c.nombre = nc;
    if(m.grupo) c.grupo = true;
    const h = this.estado.historial[m.chat] || (this.estado.historial[m.chat] = []);
    h.push({ de: m.mio ? 'yo' : 'el', quien: m.grupo && !m.mio ? m.nombre || '' : '', texto: m.texto.slice(0, 2000), t: ahora });
    this.estado.historial[m.chat] = h.slice(-30);
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
    this.estado.cola[m.chat] = { en: ahora + this.config.juntar * 1000, grupo: !!m.grupo };
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
    const modo = this.modo(jid, texto, grupo);
    const nombre = this.nombreDe(jid);
    let r = null;
    try{
      r = await this.ia.leer({ dueno: this.config.nombre, nombre, nota: this.chat(jid).nota || '', historial: h, nuevos, estilo: this.estado.estilo.slice(-40), redactar: modo === 'borrador', grupo, datos: this.datosVigentes().map(d => d.texto) });
    }catch(e){ r = null; this.anotar(`la IA falló con ${nombre}: ${e.message}`); }
    for(const p of (r && r.pendientes) || []) this.agregarPendiente(jid, nombre, p);
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
      (r && r.motivo ? `\n(${r.motivo})` : ''));
    this.guardar();
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
    this.guardar();
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
    const id = await this.transporte.enviar(this.transporte.yo()[0], `🤖 ${quien}: ` + texto);
    if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); }
  }
  /* mandar a otra persona: SÓLO desde una orden de Carlos (aprobar una propuesta) */
  async mandar(jid, texto){
    const largo = Math.min(6000, 600 + texto.length * 45);
    try{ await this.transporte.leido && this.transporte.leido(jid); }catch{}
    try{ await this.transporte.escribiendo && this.transporte.escribiendo(jid, largo); }catch{}
    const id = await this.transporte.enviar(jid, texto);
    if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); }
    const h = this.estado.historial[jid] || (this.estado.historial[jid] = []);
    h.push({ de: 'yo', texto, t: this.reloj() }); this.estado.historial[jid] = h.slice(-30);
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
        this.chat(j).modo = a.modo; return `${this.nombreDe(j)}: ${a.modo === 'callado' ? 'ya no te propongo respuestas (sí anoto pendientes)' : 'te propongo respuestas'}`;
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
        return `Regla: ${a.modo === 'callado' ? 'no proponer' : 'sí proponer'}${r.palabras ? ' si hablan de ' + r.palabras.join(', ') : ''}${r.etiquetas ? ' con los de ' + r.etiquetas.join(', ') : ''}${r.chats ? ' con ' + r.chats.map(j => this.nombreDe(j)).join(', ') : ''}${r.de ? ` de ${r.de} a ${r.a}` : ''}${r.hasta ? ' hasta el ' + fechaMx(r.hasta - 1) : ''}`;
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
      case 'resumen': { if(aMin(a.hora) == null) return ''; this.config.resumen = a.hora; return `Resumen de pendientes a las ${a.hora}`; }
      case 'porDefecto': { if(!MODOS.includes(a.modo)) return ''; this.config.porDefecto = a.modo; return `Chats sin modo propio: ${a.modo}`; }
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
      `Reglas: ${c.reglas.length}`, `Datos que me contaste: ${this.datosVigentes().length}`, `De turno: ${this.deTurno()}`].join('\n');
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
· «pausa 2h» / «pausa hoy» · «sigue»
· «estado» · «chats»
Y en palabras normales, por ejemplo:
· «a Ana dale buenos días a las 7 y buenas noches a las 10:30»
· «esta semana no le propongas nada a nadie de la escuela»
· «Ana es de la escuela» · «Beto es mi primo, háblale con confianza»
· «con mi mamá no me propongas nada»`;
