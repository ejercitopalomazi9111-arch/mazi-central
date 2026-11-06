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
import { llamar, llamadasListas, twilioDe } from './llamada.mjs';
import { HORARIOS, cualHorario, mensajesDeHorario } from './horarios.mjs';
import { CAMPANA_BASE, mensajeProspecto, prospectosDeSala } from './campana.mjs';
import { bancoDeSala, buscarFotos, nombreDe as nombreFoto, pieDe } from './banco.mjs';
import { revisarRespuesta, leerPrecios, textoPrecio, enQueAnda, cantidades, enPrimeraPersona } from './criterio.mjs';
import { leerCosto, leerTallas, leerDescripcion, precioVenta, huella, masParecido, miniatura, textoProducto, pieVenta, leerMarca, datosVenta, comprimir } from './mayoreo.mjs';
import { cargarConocimiento } from './conocimiento.mjs';
/* lo que comparten las dos cuentas de Carlos (4 nov: «que el güey ya sepa todo en ambos lados») */
const COMPARTIDO = ['datos', 'prohibidos', 'precios', 'productos', 'mayoreo', 'imitar'];

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
    /* llamarle por teléfono cuando algo es urgente (16 de octubre: «que me pueda
       hacer llamadas»). Apagado hasta que él lo pida y haya cuenta de llamadas.
       tel vacío = el número de su otra cuenta (o el de ésta) */
    llamar: { activo: false, tel: '', desde: '08:00', hasta: '23:00' },
    voz: 'Kore',                   /* la voz de los audios que manda */
    /* mensajes que salen solos a su hora (16 de octubre: «a un grupo quiero ponerle
       que pueda enviar un mensaje a x hora… qué clase toca en cada hora… y en otros
       grupos, chats individuales y sobre otros temas»).
       { id, chat, hora:'07:00', dias:[0-6, 0=domingo], texto (fijo) | tema (lo escribe la IA), sinFirma } */
    programados: [],
    /* fotos del banco que se publican solas (16 de octubre: «que en el chat de All's
       publique algunas fotos del banco con su nombre… todos los días»).
       { id, chat, carpeta, buscar, cuantas, hora, dias, intro } */
    publicar: [],
    /* contestar con fotos del banco cuando vengan al caso: de fábrica en chats de
       una persona; cada chat puede decir sí o no (c.fotos) */
    fotos: { responder: true, carpeta: '' },
    /* el ELENCO del rol (16 de octubre: «que en rol puedan participar individualmente
       pero a la vez Paulina y Negro con sus personajes»): cada una juega SU personaje,
       con su marca y su IA, aparte del de Carlos y aunque Carlos esté jugando.
       En un grupo se prende con c.elenco = ['Paulina','Negro'] (o en su comunidad). */
    personajes: {
      Paulina: { nombre: 'Astrael', marca: '💫⏳-', ficha: 'Astrael. Edad: 17 años aparentes. Habilidades y poderes: control gravitacional, duplicación temporal y visión de futuros posibles. Historia principal: una anomalía nacida de la colisión de dos universos. Datos curiosos: recuerda acontecimientos que todavía no han sucedido. Apariencia: cabello azul oscuro, ojos dorados y marcas luminosas que flotan sobre su piel.' },
      Negro: { nombre: 'Nox Veyr', marca: '🌑🌀-', ficha: 'Nox Veyr. Edad: 2,400 años. Habilidades y poderes: manipulación de sombras y creación de portales dimensionales. Historia principal: un viajero que busca una dimensión que desapareció de la existencia. Datos curiosos: no proyecta sombra. Apariencia: alto, cabello blanco, ojos negros con pupilas violetas y abrigo oscuro.' },
    },
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
    /* 4 nov: «quítale el límite de respuestas, la mayoría de gente se harta de hablar con un bot rápido» */
    auto: { firma: 'Asistente de Carlos', porHora: 1000, alDia: 10000, grupoPorHora: 1000, grupoAlDia: 10000 },
    juntarMax: 25,                 /* aunque sigan escribiendo, a los 25 s contesta (grupos que no paran) */
    /* ── 4 de noviembre: la reestructura (Carlos: «se está comprometiendo a cosas sin preguntar») ──
       imitar: hacerse pasar por él (primera persona, sin firma). De fábrica NO: habla como su
       asistente, de él en tercera persona y con firma. Cada chat puede decir otra cosa (c.imitar). */
    imitar: false,
    prohibidos: [],                /* { n, texto: 'no hablar de mi novia', palabras: ['novia'] } — se frena en código */
    precios: [],                   /* { nombre, precio, nota } — los únicos precios que puede decir */
    miHorario: '3.1',              /* su horario de clases: para no prometer nada mientras está en clase */
    /* las fotos del grupo de Mayoreo → banco → grupo de All's, con precio de costo + margen */
    mayoreo: { activo: false, fuente: '', destino: '', margen: 250 },
    productos: [],                 /* { id, desc, costo, precio, tallas, huella, fotoId, t } — el costo NUNCA sale a un cliente */
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
/* el día de la semana en México (0 = domingo) */
export const diaMx = (t) => new Date(Date.parse(fechaMx(t) + 'T12:00:00Z')).getUTCDay();
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
/* «lunes a viernes», «diario», «lunes, miércoles y viernes», «fines de semana» → [1,2,3,4,5]… */
export function diasDe(t){
  const s = String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if(!s.trim() || /diario|todos los dias|cada dia|diariamente|toda la semana/.test(s)) return [0, 1, 2, 3, 4, 5, 6];
  if(/entre semana|dias de escuela|dias habiles/.test(s)) return [1, 2, 3, 4, 5];
  if(/fin(es)? de semana/.test(s)) return [0, 6];
  const r = /(domingo|lunes|martes|miercoles|jueves|viernes|sabado)s? (?:a|al|hasta(?: el)?) (domingo|lunes|martes|miercoles|jueves|viernes|sabado)/.exec(s);
  if(r){ const out = []; let d = DIAS.indexOf(r[1]); const fin = DIAS.indexOf(r[2]); for(let k = 0; k < 7; k++){ out.push(d); if(d === fin) break; d = (d + 1) % 7; } return out.sort((a, b) => a - b); }
  const sueltos = DIAS.map((d, i) => new RegExp('\\b' + d).test(s) ? i : -1).filter(i => i >= 0);
  return sueltos.length ? sueltos : [0, 1, 2, 3, 4, 5, 6];
}
export function textoDias(d){
  const x = (Array.isArray(d) && d.length ? d : [0, 1, 2, 3, 4, 5, 6]).slice().sort((a, b) => a - b).join(',');
  if(x === '0,1,2,3,4,5,6') return 'diario';
  if(x === '1,2,3,4,5') return 'de lunes a viernes';
  if(x === '0,6') return 'fines de semana';
  return 'los ' + d.map(i => ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][i]).join(', ');
}
/* «7», «7:5», «7:50», «7pm», «19:30» → «07:00»… ('' si no se entiende) */
export function horaDe(x){
  const m = /^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i.exec(String(x || '').trim());
  if(!m) return '';
  let h = +m[1]; const mi = +(m[2] || 0);
  if(m[3] && /p/i.test(m[3]) && h < 12) h += 12;
  if(m[3] && /a/i.test(m[3]) && h === 12) h = 0;
  return h < 24 && mi < 60 ? String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') : '';
}
const MAYOREO_BASE = { activo: false, fuente: '', destino: '', fuenteNombre: '', destinoNombre: '', margen: 250, tanda: 100, pausa: 30, cadaSeg: 8, historico: false };
/* ¿el nombre de un grupo es éste? sin acentos, sin signos, y aguanta lo que WhatsApp corta («All's Fashion | clothes & more») */
export const mismoGrupo = (a, b) => { const x = sinAcentos(a).replace(/[^a-z0-9]+/g, ' ').trim(), y = sinAcentos(b).replace(/[^a-z0-9]+/g, ' ').trim(); return !!x && !!y && (x === y || x.startsWith(y + ' ') || y.startsWith(x + ' ')); };
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
  static hermanas = new Set();
  constructor({ cuenta = 'principal', transporte, ia, almacen, reloj = () => Date.now(), azar = Math.random, telefono = null, banco = undefined, conocimiento = undefined, compartir = false, prospectos = undefined }){
    /* telefono: { listas(), llamar({ a, texto }) } — por omisión, Twilio (llamada.mjs) */
    Object.assign(this, { cuenta, transporte, ia, almacen, reloj, azar, telefono: telefono || { listas: () => llamadasListas(), llamar: (x) => llamar(x), conversar: async ({ a, url }) => { try{ const sid = await twilioDe().llamar({ a, url }); return { bien: !!sid, id: sid }; }catch(e){ return { bien: false, error: e.message }; } } } });
    /* la lista de negocios para la campaña (La Sala, k=prospectos); null = sin campaña */
    this.prospectos = prospectos === undefined ? prospectosDeSala() : prospectos;
    /* el banco de imágenes de La Sala; null = sin banco */
    this.banco = banco === undefined ? bancoDeSala() : banco;
    this.conocimiento = conocimiento === undefined ? cargarConocimiento() : conocimiento;
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
    if(Object.keys(guardada).length && (guardada.version || 1) < 3){
      const a = this.config.auto || (this.config.auto = {});
      Object.assign(a, { porHora: Math.max(a.porHora || 0, 1000), alDia: Math.max(a.alDia || 0, 10000), grupoPorHora: Math.max(a.grupoPorHora || 0, 1000), grupoAlDia: Math.max(a.grupoAlDia || 0, 10000) });
      this.config.version = 3;
    }
    /* 4 nov, Carlos: «haz que tome todas las fotos del grupo Shopy go mayoreo 1 … y que envíe TODAS
       las que están allí de 100 en 100». Los grupos se encuentran por nombre (el jid sale solo) */
    if(Object.keys(guardada).length && (guardada.version || 1) < 4){
      const M = this.config.mayoreo = Object.assign({}, MAYOREO_BASE, this.config.mayoreo || {});
      if(!M.fuente){ M.activo = true; M.fuenteNombre = 'Shopy go mayoreo 1'; M.historico = true; }
      if(!M.destino) M.destinoNombre = "All's Fashion";
      /* y «manda lo de los negocios usando Secre»: la campaña, prendida, a 25 por día */
      this.config.campana = Object.assign({}, CAMPANA_BASE, this.config.campana || {}, { activo: true });
      this.config.version = 4;
    }
    /* 4 nov, noche: el historial «terminó» con 0 prendas (el ancla era un mensaje borrado y se rindió en
       80 s). Se vuelve a intentar, con calma y otra ancla */
    if(Object.keys(guardada).length && (guardada.version || 1) < 5){
      const M = this.config.mayoreo;
      if(M && M.activo && M.fuente && !(this.config.productos || []).length) M.historico = true;
      this.config.version = 5;
      this.reintentarHistorial = true;
    }
    /* 5 nov, Carlos: «no le dije que la parara, me malentendió». Le pidió no contestar un chat y la IA apagó
       la campaña; se vuelve a prender una vez (y ia/ordenLibre ya no la tocan si no la nombra) */
    if(Object.keys(guardada).length && (guardada.version || 1) < 6){
      this.config.campana = Object.assign({}, CAMPANA_BASE, this.config.campana || {}, { activo: true });
      this.config.version = 6;
    }
    /* 5 nov, Carlos: «enciende la campaña pero apaga lo de all's». Se apaga el Mayoreo → All's (y se tira
       la fila de fotos que faltaba mandar) y cualquier publicación diaria al grupo de All's; la campaña,
       prendida. El banco no se toca: las fotos que ya llegaron se quedan ahí */
    if(Object.keys(guardada).length && (guardada.version || 1) < 7){
      if(this.config.mayoreo) this.config.mayoreo.activo = false;
      this.tirarColaFotos = true;   /* el estado se carga más abajo */
      for(const pub of this.config.publicar || []) if(mismoGrupo(this.nombreDe(pub.chat) || pub.chat, "All's Fashion") || /all.?s/i.test(pub.carpeta || '')) pub.apagado = true;
      this.config.campana = Object.assign({}, CAMPANA_BASE, this.config.campana || {}, { activo: true });
      this.config.version = 7;
    }
    /* 6 nov, Carlos: «desactiva completamente a Secre… que nada más se quede para cosas como All's Fashion,
       campañas de búsqueda para lo de la chamba. Que no sea mi asistente, que no conteste mis mensajes, que no
       mis llamadas… solamente negocio, porque me está metiendo en pedillos». SÓLO NEGOCIO: se queda la campaña
       a negocios (y contestarle a los prospectos), All's (el grupo y su banco de fotos) e Instagram/Facebook del
       negocio. Todo lo personal se apaga: no contesta chats, no propone, no saluda, no repasa, no juega rol, no
       manda programados y no toca las llamadas. Se regresa con «modo completo» desde su chat. */
    /* sólo la Secre que ya estaba corriendo (guardada en la versión 6 o 7) se pasa a sólo negocio; una nueva o las
       pruebas arrancan como siempre */
    if(Object.keys(guardada).length && (guardada.version || 1) >= 6 && (guardada.version || 1) < 8){
      this.config.soloNegocio = true;
      if(this.config.llamar) this.config.llamar.activo = false;
    }
    /* la que ya pasó por la 8 (el primer despliegue de esto) también: así ninguna de las dos cuentas se queda fuera */
    if(Object.keys(guardada).length && guardada.version === 8) this.config.soloNegocio = true;
    if((this.config.version || 1) < 9) this.config.version = 9;
    /* las dos cuentas de Carlos corren en el mismo proceso: lo compartido se junta al arrancar */
    this.compartir = compartir;
    if(compartir) for(const h of Secre.hermanas){ for(const k of COMPARTIDO){ const mio = this.config[k], suyo = h.config[k];
      if(Array.isArray(mio) && Array.isArray(suyo)){ const vistos = new Set(suyo.map(x => JSON.stringify(x))); h.config[k] = [...suyo, ...mio.filter(x => !vistos.has(JSON.stringify(x)))]; }
      else if(k === 'mayoreo' && mio && mio.activo && !(suyo && suyo.activo)) h.config[k] = mio; } }
    if(compartir) Secre.hermanas.add(this);
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
      resumioT: 0,         /* hasta cuándo le resumió lo que llegó (al pedírselo) */
      llamoT: 0,           /* cuándo le llamó por última vez */
      programadosHoy: {},  /* id → fecha en que ya salió */
      publicadoHoy: {},    /* id → fecha en que ya se publicó */
      publicados: {},      /* id → [fotos ya publicadas] (para no repetir hasta acabarse la carpeta) */
      colaElenco: {},      /* jid → cuándo le toca jugar al elenco */
      elencoVisto: {},     /* jid → { Paulina: t, Negro: t } lo último que ya leyó cada una */
      elencoUltimo: {},    /* jid → { Paulina: t } cuándo jugó por última vez */
      sigN: 1, sigP: 1,
    }, almacen.leer('estado', {}));
    if(this.tirarColaFotos){ this.estado.colaFotos = []; delete this.tirarColaFotos; }
    this.ocupados = new Set();
    this.mandando = new Map();   /* jid|texto → cuándo: lo que Secre está mandando ahorita, para no confundir su eco con Carlos */
  }

  guardar(){
    /* lo compartido se copia a la otra cuenta en cada guardado (y ella lo guarda en su cajón) */
    if(this.compartir) for(const h of Secre.hermanas) if(h !== this){ for(const k of COMPARTIDO) h.config[k] = this.config[k]; try{ h.almacen.guardar('config', h.config); }catch{} }
    this.almacen.guardar('config', this.config); this.almacen.guardar('estado', this.estado);
  }
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
  ponerComunidad({ id, nombre, grupos = [], activos = [], personaje, mundo, marca, instrucciones, elenco }){
    if(!id || !/@g\.us$/.test(id)) return '';
    const cs = this.config.comunidades || (this.config.comunidades = {});
    const com = cs[id] || (cs[id] = {});
    com.nombre = String(nombre || com.nombre || '').slice(0, 100);
    if(personaje !== undefined) com.personaje = String(personaje).slice(0, 800);
    if(mundo !== undefined) com.mundo = String(mundo).slice(0, 6000);
    if(marca !== undefined) com.marca = String(marca).trim().slice(0, 30);
    if(Array.isArray(elenco)) com.elenco = elenco.filter(q => (this.config.personajes || {})[q]);
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
      if(x.lid && x.lid !== id){ nombres[x.lid] = nombre; (this.config.lids || (this.config.lids = {}))[x.lid] = id; }
      const ya = this.config.chats[id];
      /* 4 nov: el nombre de SU AGENDA le gana al que la persona se puso en WhatsApp */
      if(ya && ya.nombre && !(x.guardado && ya.nombre !== nombre && ya.fuente !== 'agenda')) continue;
      const c = this.chat(id);
      if(c.nombre && c.nombre !== nombre) c.alias = c.nombre;
      if(x.alias && x.alias !== nombre) c.alias = String(x.alias).slice(0, 100);
      c.nombre = nombre; if(x.guardado) c.fuente = 'agenda';
      if(x.grupo || id.endsWith('@g.us')) c.grupo = true;
      nuevos++;
    }
    if(nuevos) this.guardar();
    return nuevos;
  }
  nombreDe(jid){ const c = this.config.chats[jid]; return (c && c.nombre) || String(jid).split('@')[0]; }
  /* «Ana», «ana p», «la de la escuela»… → el jid que más se parece */
  buscarChat(texto){
    const q = sinAcentos(texto).replace(/^(a|al|a la|con|de|del)\s+/, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if(!q) return null;
    const limpio = (s) => sinAcentos(s).replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const lista = Object.entries(this.config.chats).filter(([, c]) => c.nombre);
    /* 4 nov: Carlos los busca como los tiene en SU agenda; también vale el nombre de WhatsApp,
       el número, y una falta de dedo (una letra de más o de menos) */
    const parecida = (a, b) => { if(Math.abs(a.length - b.length) > 1 || a.length < 4) return false; let i = 0, j = 0, d = 0; while(i < a.length && j < b.length){ if(a[i] === b[j]){ i++; j++; continue; } if(++d > 1) return false; if(a.length > b.length) i++; else if(b.length > a.length) j++; else { i++; j++; } } return d + (a.length - i) + (b.length - j) <= 1; };
    const qw = q.split(' ');
    let mejor = null, pm = 0;
    for(const [j, c] of lista){
      for(const [n, peso] of [[limpio(c.nombre), 1], [limpio(c.alias || ''), .9]]){
        if(!n) continue;
        const ws = n.split(' ');
        let p = 0;
        if(n === q) p = 100;
        else if(n.startsWith(q)) p = 80;
        else if(qw.every(w => ws.some(x => x === w))) p = 70;
        else if(qw.every(w => ws.some(x => x.startsWith(w)))) p = 60;
        else if(n.includes(q) && q.length >= 3) p = 45;
        else if(qw.every(w => ws.some(x => parecida(x, w)))) p = 35;
        p *= peso; if(c.grupo) p -= 1;
        if(p > pm){ pm = p; mejor = j; }
      }
    }
    if(mejor) return mejor;
    const num = q.replace(/\D/g, '');
    return (num.length >= 6 && (lista.find(([j]) => j.split('@')[0].endsWith(num)) || [])[0]) || null;
  }
  esMiChat(jid){ return this.transporte.yo && this.transporte.yo().includes(jid); }
  /* el jid de un participante puede venir con su aparato («521…:12@s.whatsapp.net»): se compara sin él */
  esOtraCuenta(jid){ if(!jid || !this.transporte.otrosYo) return false; const n = (j) => String(j).replace(/:\d+(?=@)/, ''); const x = n(jid); return this.transporte.otrosYo().some(j => n(j) === x); }
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
    {
      const MY = this.config.mayoreo || {};
      if(MY.activo && !MY.fuente && MY.fuenteNombre && m.grupo && mismoGrupo(m.nombreChat, MY.fuenteNombre)){ MY.fuente = m.chat; this.guardar(); }
      /* lo viejo que se pidió del historial sólo sirve para Mayoreo: no se contesta nada */
      if(m.historico){ if(MY.activo && m.chat === MY.fuente) await this.recibirMayoreo(m); return; }
    }
    /* lo que mandó Secre misma no se vuelve a procesar */
    if(m.id && this.estado.enviados.includes(m.id)) return;
    /* una nota de voz se oye y se vuelve texto (16 de octubre). Las de Carlos en
       chats ajenos no: ésas no las tiene que contestar nadie */
    const suyo = this.esMiChat(m.chat) || this.esOtraCuenta(m.chat);
    if(m.audio && m.audio.b64 && this.ia && this.ia.oir && (suyo || !m.mio) && !m.grupo){
      try{
        const t = await this.ia.oir(m.audio);
        if(t) m = { ...m, texto: suyo ? t : '🎤 ' + t };
      }catch(e){ this.anotar(`no pude oír la nota de voz de ${m.nombre || this.nombreDe(m.chat)}: ${e.message}`); }
    }
    if(this.esMiChat(m.chat)){
      /* si Carlos le habló con nota de voz, le contesta también en voz (4 nov: «secre debería poder enviar audios») */
      if(m.mio && !/^🤖/.test(m.texto)) await this.orden(m.texto.trim(), { voz: !!(m.audio && m.audio.b64) });
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
    if(m.lid && this.config.lids && !this.config.lids[m.lid]) (this.config.lids || (this.config.lids = {}))[m.lid] = m.chat;
    /* las fotos del grupo de Mayoreo: al banco y a All's, sin contestar nada ahí */
    const MY = this.config.mayoreo || {};
    if(MY.activo && m.chat === MY.fuente){ await this.recibirMayoreo(m); return; }
    /* lo que publica la OTRA cuenta de Carlos en un grupo es suyo, no de un cliente (5 nov: las fotos
       que la personal sube a All's le llegaban a la del negocio como mensajes y les quería contestar
       una por una, hasta que Groq la frenaba con 429). En All's ni se anota; en otro grupo va como «yo» */
    if(m.grupo && m.de && this.esOtraCuenta(m.de)){
      if(m.chat !== MY.destino){ const ho = this.estado.historial[m.chat] || (this.estado.historial[m.chat] = []); ho.push({ de: 'yo', quien: '', texto: m.texto.slice(0, 2000), t: ahora }); this.estado.historial[m.chat] = ho.slice(-60); }
      return;
    }
    const c = this.chat(m.chat);
    if(this.config.soloNegocio && !this.esNegocio(m.chat, c)) return;      /* sólo negocio: lo personal ni se lee */
    if(!m.grupo && !m.mio && m.nombre && c.nombre && m.nombre !== c.nombre && !c.alias) c.alias = String(m.nombre).slice(0, 100);
    /* ¿de qué producto preguntan? la foto que citaron (de las que mandó Secre) o la foto que mandaron */
    if(!m.mio && (this.config.productos || []).length){
      let prod = m.citado && (this.estado.fotoProducto || {})[m.citado];
      if(!prod && m.imagen && m.imagen.bajar){ try{ const r = masParecido(this.config.productos, await huella(await m.imagen.bajar())); if(r) prod = r.producto.id; }catch(e){ this.anotar('no pude ver la foto que mandaron: ' + e.message); } }
      if(prod) m = { ...m, producto: prod };
    }
    /* en un grupo, el chat se llama como el grupo, no como quien escribió */
    const nc = m.grupo ? m.nombreChat : ((this.config.nombres || {})[m.chat] || m.nombre);
    if(nc && !c.nombre && (m.grupo || !m.mio)) c.nombre = nc;
    if(m.grupo) c.grupo = true;
    const h = this.estado.historial[m.chat] || (this.estado.historial[m.chat] = []);
    h.push({ de: m.mio ? 'yo' : 'el', quien: m.grupo && !m.mio ? m.nombre || '' : '', texto: m.texto.slice(0, 2000), t: ahora, ...(m.producto ? { producto: m.producto } : {}) });
    this.estado.historial[m.chat] = h.slice(m.grupo ? -60 : -30);
    if(m.mio && m.grupo && m.sticker && m.sticker.b64) this.guardarSticker(m.chat, m.sticker);
    /* el elenco juega aparte: también cuando Carlos está jugando (son otros personajes).
       Espera unos segundos más que Secre, para que primero salga el personaje de Carlos */
    if(this.elencoDe(m.chat).length){
      const ce = this.estado.colaElenco || (this.estado.colaElenco = {});
      const pe = ce[m.chat], de = pe && pe.desde ? pe.desde : ahora;
      ce[m.chat] = { en: Math.min(ahora + ((this.config.juntar || 6) + 4) * 1000, de + 40_000), desde: de };
    }
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
    if(this.config.soloNegocio){
      for(const jid of Object.keys(this.estado.cola)) if(!this.esNegocio(jid)) delete this.estado.cola[jid];
      this.estado.colaElenco = {};
      const antes = this.estado.propuestas.length;
      this.estado.propuestas = this.estado.propuestas.filter(p => this.esNegocio(p.chat));
      if(antes !== this.estado.propuestas.length) this.guardar();
    }
    for(const [jid, q] of Object.entries(this.estado.cola)){
      if(q.en > ahora || this.ocupados.has(jid)) continue;
      this.ocupados.add(jid);
      try{ delete this.estado.cola[jid]; await this.atender(jid, q.grupo); }
      finally { this.ocupados.delete(jid); }
    }
    for(const [jid, q] of Object.entries(this.estado.colaElenco || {})){
      if(q.en > ahora || this.ocupados.has(jid) || (this.estado.cola[jid] && this.estado.cola[jid].en <= ahora + 1000)) continue;
      this.ocupados.add(jid);
      try{ delete this.estado.colaElenco[jid]; await this.jugarElenco(jid); }
      catch(e){ this.anotar('el elenco falló: ' + e.message); }
      finally { this.ocupados.delete(jid); }
    }
    /* cada pieza aparte: si una truena, las demás siguen (antes un error en los saludos frenaba todo lo de abajo) */
    const personal = new Set(['saludos', 'resumen', 'repaso', 'programados']);
    for(const [n, f] of [['saludos', () => this.saludos(ahora)], ['resumen', () => this.resumen(ahora)], ['repaso', () => this.repaso(ahora)], ['programados', () => this.programadosTic(ahora)], ['publicar', () => this.publicarTic(ahora)], ['mayoreo', () => this.mayoreoTic()], ['campaña', () => this.campanaTic(ahora)], ['fotos', () => this.colaFotosTic()]]){
      if(this.config.soloNegocio && personal.has(n)) continue;
      try{ await f(); }catch(e){ const k = 'falla:' + n; if(this.ultimaFalla?.[k] !== e.message){ (this.ultimaFalla || (this.ultimaFalla = {}))[k] = e.message; this.anotar(`${n} falló: ${e.message}`); } }
    }
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
    /* le preguntó algo por orden de Carlos: lo que conteste le llega a él (4 nov: «le dice que
       Simón, que ahorita pregunta y no pregunta») */
    const enc = (this.estado.encargos || []).filter(e => e.chat === jid && !e.hecho && this.reloj() - e.t < 3 * 24 * HORA);
    if(enc.length){
      for(const e of enc) e.hecho = this.reloj();
      await this.avisar(`📨 ${this.nombreDe(jid)} contestó a lo que le pregunté${enc[0].para ? ` (${enc[0].para})` : ''}: «${texto.slice(0, 600)}»`);
    }
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
    /* fotos del banco que podrían venir al caso con lo que preguntan */
    let fotos = [];
    if(modo !== 'callado' && this.fotosEn(jid, esGrupo)){
      try{ fotos = buscarFotos(await this.banco.fichas(), nuevos.map(x => x.texto).join(' '), { carpeta: c.carpetaFotos || (this.config.fotos || {}).carpeta || '', n: 8 }); }
      catch(e){ this.anotar('el banco no contestó: ' + e.message); }
    }
    let r = null;
    try{
      r = await this.ia.leer({ fotos: fotos.map((f, i) => ({ n: i + 1, nombre: nombreFoto(f), descripcion: String(f.descripcion || '').slice(0, 160), carpeta: f.carpeta || '' })), dueno: this.config.nombre, nombre, nota: c.nota || '', historial: h, nuevos: paraIA.length ? paraIA : nuevos, estilo: this.estado.estilo.slice(-40), redactar: modo !== 'callado', auto: modo === 'auto', rol: modo === 'auto' && !!c.rol, ...this.rolDe(jid), stickers: (c.stickers || []).map(x => ({ n: x.n, cuando: x.cuando })), grupo, datos: this.datosVigentes().map(d => d.texto), imitar: this.imitaEn(jid), prohibidos: (this.config.prohibidos || []).map(x => x.texto), precios: (this.config.precios || []).map(textoPrecio), ahora: this.enQueAnda(), firma: this.confAuto().firma,
        conocimiento: this.conocimiento || '', tienda: !!c.tienda,
        productos: [...new Set(h.slice(-12).map(x => x.producto).filter(Boolean))].map(id => (this.config.productos || []).find(p => p.id === id)).filter(Boolean).map(textoProducto),
        abiertos: this.estado.pendientes.filter(p => !p.hecho && p.chat === jid).map(p => p.texto) });
    }catch(e){ r = null; if(process.env.SECRE_DEPURA) console.log("IAERR", e.stack); this.anotar(`la IA falló con ${nombre}: ${e.message}`); }
    if(r) r.elegidas = [...new Set((r.fotos || []).map(Number))].map(n => fotos[n - 1]).filter(Boolean).slice(0, 3);
    for(const p of (r && r.pendientes) || []) this.agregarPendiente(jid, nombre, p);
    /* lo que ya se cumplió según la plática se tacha solo (4 nov: «él no sabe cuándo ya se completaron») */
    for(const t of (r && r.hechos) || []){ const p = this.estado.pendientes.find(x => !x.hecho && x.chat === jid && sinAcentos(x.texto) === sinAcentos(t)); if(p){ p.hecho = true; p.solo = true; } }
    /* las tareas de la escuela van a su sección, no a los pendientes */
    for(const t of (r && r.tareas) || []) this.agregarTarea(jid, nombre, t);
    if(r && r.urgente && !esGrupo) await this.quizaLlamar(nombre, nuevos.slice(-2).map(x => x.texto).join(' / '), r.motivo);
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
    } else if(modo === 'borrador') this.bitacora(jid, nombre, nuevos, 'propuesta', r && r.respuesta, 'este chat está en «Propone»: espera tu número', !!(r && r.urgente));
    else if(modo === 'callado') this.bitacora(jid, nombre, nuevos, 'nada', '', 'este chat está en «Callada»: sólo anoto pendientes', !!(r && r.urgente));
    if(modo !== 'borrador'){ this.guardar(); return; }
    const propuesta = r && r.respuesta ? String(r.respuesta).trim() : '';
    if(!propuesta && !(r && r.urgente)){ this.guardar(); return; }
    const ojo = propuesta ? revisarRespuesta(propuesta, this.criterioDe(jid)) : '';
    if(ojo && r) r.motivo = '⚠️ ojo: ' + ojo + (r.motivo ? ' · ' + r.motivo : '');
    /* una sola propuesta viva por chat: la nueva reemplaza a la vieja */
    this.estado.propuestas = this.estado.propuestas.filter(p => !(p.chat === jid && p.tipo === 'respuesta'));
    const n = this.estado.sigN++;
    const cita = nuevos.slice(-3).map(x => (x.quien ? x.quien + ': ' : '') + x.texto).join(' / ').slice(0, 300);
    const conFotos = (r && r.elegidas) || [];
    this.estado.propuestas.push({ n, chat: jid, nombre, texto: propuesta, motivo: (r && r.motivo) || '', dijo: cita, urgente: !!(r && r.urgente), t: this.reloj(), tipo: 'respuesta', ...(conFotos.length ? { fotos: conFotos.map(f => f.id) } : {}) });
    await this.avisar(`#${n} · ${nombre}${r && r.urgente ? ' ⚠️' : ''}: «${cita}»\n` +
      (propuesta ? `Propuesta: «${propuesta}»` + (conFotos.length ? `\n📷 + ${conFotos.length} foto(s): ${conFotos.map(f => nombreFoto(f)).join(', ')}` : '') + `\n→ «${n}» la manda · «${n} tu texto» manda el tuyo · «x${n}» la tira` : 'No supe qué contestarle: te toca.') +
      (r && r.motivo ? `\n(${r.motivo})` : '') + (freno ? `\n(No le contesté sola: ${freno}.)` : ''));
    this.guardar();
  }

  /* ── Mayoreo → banco → All's (4 nov) ── */
  /* qué cuenta trabaja Mayoreo: la que está en el grupo del proveedor (la del negocio y la personal
     comparten la configuración; antes se quedaba la primera que lo tocó, aunque no viera el grupo) */
  hermana(cuenta){ return [...Secre.hermanas].find(h => h.cuenta === cuenta) || null; }
  meToca(MY, cual = 'fuente'){
    const bandera = cual === 'fuente' ? 'enFuente' : 'enDestino', campo = cual === 'fuente' ? 'duena' : 'manda';
    const actual = MY[campo];
    if(!actual){ MY[campo] = this.cuenta; return true; }
    if(actual === this.cuenta) return true;
    const h = this.hermana(actual);
    /* la que estaba no está en ese grupo (o no existe) y ésta sí: se queda ésta */
    if(this.estado[bandera] && (!h || h.estado[bandera] === false)){ MY[campo] = this.cuenta; this.anotar(`Mayoreo: ahora lo trabaja la cuenta ${this.cuenta}`); return true; }
    return false;
  }
  async recibirMayoreo(m){
    const MY = this.config.mayoreo, P = this.config.productos || (this.config.productos = []);
    /* las dos cuentas comparten la configuración: si las dos están en el grupo, sólo una trabaja */
    if(!this.meToca(MY, 'fuente')) return;
    const ahora = m.t || this.reloj();
    /* un texto suelto con precio justo después de unas fotos es el precio de esas fotos */
    if(!m.imagen){
      const costo = leerCosto(m.texto); if(!costo) return;
      const lote = P.filter(p => p.lote === this.estado.loteMayoreo && !p.costo);
      for(const p of lote){ p.costo = costo; p.precio = precioVenta(costo, MY.margen); const ts = leerTallas(m.texto); if(ts.length) p.tallas = ts; if(!p.desc) p.desc = leerDescripcion(m.texto); if(!p.marca) p.marca = leerMarca(m.texto); }
      if(lote.length){ this.anotar(`Mayoreo: precio $${costo} a ${lote.length} foto(s)`); this.guardar(); }
      return;
    }
    let buf; try{ buf = await comprimir(await m.imagen.bajar()); }catch(e){ this.anotar('Mayoreo: no pude bajar la foto: ' + e.message); return; }
    if(!this.estado.loteMayoreoT || ahora - this.estado.loteMayoreoT > 3 * MIN) this.estado.loteMayoreo = 'L' + ahora.toString(36);
    this.estado.loteMayoreoT = ahora;
    const pie = m.imagen.pie || '', h = await huella(buf).catch(() => '');
    const costo = leerCosto(pie);
    let p = h && P.find(x => x.huella && masParecido([x], h, 4));
    if(p){ if(costo){ p.costo = costo; p.precio = precioVenta(costo, MY.margen); } const ts = leerTallas(pie); if(ts.length) p.tallas = ts; this.guardar(); return; }   /* ya la teníamos: sólo se actualiza */
    p = { id: 'p' + ahora.toString(36) + Math.floor(this.azar() * 1e4), desc: leerDescripcion(pie), costo, precio: precioVenta(costo, MY.margen), tallas: leerTallas(pie), marca: leerMarca(pie), huella: h, fotoId: '', lote: this.estado.loteMayoreo, t: ahora };
    P.push(p);
    /* tope de 3,000, pero nunca se tira una prenda que sigue en la fila (5 nov: con 4,552 mensajes del
       historial se borraban las más viejas antes de mandarlas, y salía «una foto se perdió») */
    if(P.length > 3000){ const enCola = new Set((this.estado.colaFotos || []).map(q => q.id)); this.config.productos = P.filter((x, i) => i >= P.length - 3000 || enCola.has(x.id)); }
    if(this.banco && this.banco.subir){
      try{ const { mini, ancho, alto } = await miniatura(buf);
        const f = await this.banco.subir({ buf, mime: 'image/jpeg', mini, ancho, alto, nombre: (p.desc || 'mayoreo') + '.jpg', huella: 'mayoreo:' + h,
          campos: { titulo: p.desc || '', carpeta: "All's fashion", temas: ['mayoreo'], notas: `costo $${p.costo || '?'} · venta $${p.precio || '?'}${p.tallas.length ? ' · tallas ' + p.tallas.join(', ') : ''}${p.marca ? ' · marca ' + p.marca : ''}` } });
        p.fotoId = f && f.id || ''; }
      catch(e){ this.anotar('Mayoreo: no pude subirla al banco: ' + e.message); }
    }
    /* en la cola va sólo el id: la foto ya está en el banco (mil fotos en base64 no caben en lo guardado) */
    const Q = this.estado.colaFotos || (this.estado.colaFotos = []);
    Q.push(p.fotoId || Q.filter(x => x.buf).length > 20 ? { id: p.id, fotoId: p.fotoId || '', t: ahora, en: this.reloj() } : { id: p.id, t: ahora, en: this.reloj(), buf: buf.toString('base64'), mime: 'image/jpeg' });
    this.guardar();
  }
  /* manda a All's las fotos que van llegando, de a unas cuantas por vuelta (sin texto) */
  async colaFotosTic(){
    const MY = this.config.mayoreo || {};
    if(!MY.activo || !MY.destino) return;
    /* manda la cuenta que está en All's; la cola es de la que recibe (pueden ser distintas) */
    if(!this.meToca(MY, 'destino')) return;
    const duena = (MY.duena && this.hermana(MY.duena)) || this;
    const Q = duena.estado.colaFotos || [];
    if(!Q.length) return;
    const ahora = this.reloj(), E = this.estado.envioMayoreo || (this.estado.envioMayoreo = { enTanda: 0, ultima: 0, pausaHasta: 0, total: 0 });
    /* de 100 en 100 (Carlos, 4 nov): una cada `cadaSeg` segundos; al llegar a la tanda, descansa `pausa` minutos */
    if(ahora < E.pausaHasta || ahora - E.ultima < (MY.cadaSeg || 8) * 1000) return;
    const P = this.config.productos || [];
    /* espera a que llegue el precio (el proveedor a veces lo manda después de las fotos), hasta 5 min */
    const x = Q.find(q => { const pr = P.find(p => p.id === q.id); return (pr && pr.precio) || ahora - (q.en || q.t || 0) > 5 * MIN; });
    if(!x) return;
    duena.estado.colaFotos = Q.filter(q => q !== x);
    E.ultima = ahora;
    const prod = P.find(p => p.id === x.id);
    try{
      let buf = x.buf ? Buffer.from(x.buf, 'base64') : null;
      const fid = (prod && prod.fotoId) || x.fotoId;
      if(!buf && fid && this.banco) buf = (await this.banco.bajar(fid)).buf;
      if(!buf){ this.anotar('Mayoreo: una foto se perdió (no está en el banco)'); this.guardar(); return; }
      const id = await this.transporte.enviarImagen(MY.destino, buf, 'image/jpeg', prod && prod.precio ? pieVenta({}, prod) : '');
      if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); (this.estado.fotoProducto || (this.estado.fotoProducto = {}))[id] = x.id; }
      E.enTanda++; E.total++;
      if(E.enTanda >= (MY.tanda || 100)){
        E.enTanda = 0; E.pausaHasta = ahora + (MY.pausa || 30) * MIN;
        await this.avisar(`📦 Mayoreo: van ${E.total} fotos mandadas a ${this.nombreDe(MY.destino)}. Faltan ${duena.estado.colaFotos.length}; la siguiente tanda sale a las ${horaMx(E.pausaHasta)}.`);
      }
      if(!duena.estado.colaFotos.length && E.total){ await this.avisar(`📦 Mayoreo: listo, mandé las ${E.total} fotos a ${this.nombreDe(MY.destino)}.`); E.total = 0; E.enTanda = 0; }
    }catch(e){
      this.anotar('Mayoreo: no pude mandar una foto a All\'s: ' + e.message);
      x.fallas = (x.fallas || 0) + 1; if(x.fallas < 3) duena.estado.colaFotos.unshift(x);
      E.pausaHasta = ahora + MIN;
    }
    const fp = this.estado.fotoProducto || {}, ks = Object.keys(fp); if(ks.length > 4000) for(const k of ks.slice(0, ks.length - 4000)) delete fp[k];
    this.guardar();
  }
  /* lo que se reporta a La Sala cada tanto, para ver desde fuera si todo jala (sin datos de nadie) */
  latido(){
    const C = this.config.campana || {}, E = this.estado.campana || {}, MY = this.config.mayoreo || {}, H = this.estado.histMayoreo || {};
    return { cuenta: this.cuenta, version: this.config.version, soloNegocio: !!this.config.soloNegocio,
      campana: { activo: !!C.activo, porDia: C.porDia, hoy: E.hoy || 0, total: Object.values(E.hechos || {}).filter(x => x.jid).length, revisados: Object.keys(E.hechos || {}).length, proxima: E.proxima || 0, motivo: E.motivo || '' },
      mayoreo: { activo: !!MY.activo, fuente: !!MY.fuente, destino: !!MY.destino, duena: MY.duena || '', historico: !!MY.historico, pedidas: H.pedidas || 0, sinAvance: H.sinAvance || 0, enFuente: this.estado.enFuente ?? null, enDestino: this.estado.enDestino ?? null, ancla: !!(H.ancla && H.ancla.key), manda: MY.manda || '', recibidos: H.recibidos || 0, prendas: (this.config.productos || []).length, enCola: (this.estado.colaFotos || []).length, mandadas: (this.estado.envioMayoreo || {}).total || 0, grupos: this.estado.gruposMayoreo || [] },
      fallas: this.ultimaFalla || {}, registro: (this.estado.registro || []).slice(-8).map(x => x.que).filter(q => /campa|mayoreo|fall|no pude/i.test(q)) };
  }
  /* ── la campaña a negocios sin página: pocos al día, en horario, desde la cuenta del negocio ── */
  async campanaTic(ahora){
    const C = this.config.campana;
    const E = this.estado.campana || (this.estado.campana = { hechos: {}, dia: '', hoy: 0, proxima: 0 });
    const por = (m) => { E.motivo = m; };
    if(!C || !C.activo) return por('apagada');
    if(!this.prospectos || !this.transporte.existe) return por('sin lista o sin WhatsApp');
    /* sólo la cuenta del negocio: la que se llama «negocio» o la que tiene el número de la campaña */
    const yo = (this.transporte.yo() || []).join(' ');
    const esNegocio = this.cuenta === (C.cuenta || 'negocio') || (C.tel && yo.includes(String(C.tel).replace(/\D/g, '').slice(-10)));
    if(!esNegocio) return por('ésta no es la cuenta del negocio');
    const hoy = fechaMx(ahora);
    if(E.dia !== hoy){ E.dia = hoy; E.hoy = 0; }
    const m = minDelDia(ahora);
    if(!(C.dias || [1, 2, 3, 4, 5, 6]).includes(diaMx(ahora)) || m < aMin(C.desde || '10:00') || m >= aMin(C.hasta || '18:30')) return por(`fuera de horario (${C.desde}-${C.hasta})`);
    if(E.hoy >= (C.porDia || 25)) return por(`ya mandé los ${C.porDia || 25} de hoy`);
    if(ahora < (E.proxima || 0)) return por(`el siguiente sale a las ${horaMx(E.proxima)}`);
    if(!this.listaCampana || ahora - this.listaCampana.t > 6 * HORA){
      try{ this.listaCampana = { t: ahora, l: await this.prospectos() }; }
      catch(e){ this.anotar('campaña: no pude leer la lista: ' + e.message); E.proxima = ahora + 30 * MIN; return por('no pude leer la lista: ' + e.message); }
    }
    const lista = this.listaCampana.l || [];
    const p = lista.find(x => x.tel && !E.hechos[String(x.tel).replace(/\D/g, '')]);
    if(!p){ if(!E.acabo){ E.acabo = true; await this.avisar(`📣 Campaña: ya les escribí a todos los ${lista.length} negocios de la lista.`); } this.guardar(); return; }
    const tel = String(p.tel).replace(/\D/g, '');
    let jid = '';
    try{ jid = await this.transporte.existe(tel); }catch{}
    E.proxima = ahora + 20_000;
    if(!jid){ E.hechos[tel] = { t: ahora, sin: true }; this.guardar(); return; }   /* fijo o sin WhatsApp: el siguiente */
    if(this.config.chats[jid] && (this.estado.historial[jid] || []).length){ E.hechos[tel] = { t: ahora, ya: true }; this.guardar(); return; }   /* ya hablamos con él */
    const texto = mensajeProspecto(p, { hora: Math.floor(m / 60), variante: Object.keys(E.hechos).length });
    try{ await this.mandar(jid, texto); }catch(e){ this.anotar('campaña: no pude escribirle a ' + p.negocio + ': ' + e.message); E.proxima = ahora + 10 * MIN; por('no pude mandar: ' + e.message); this.guardar(); return; }
    por('mandando');
    const c = this.chat(jid);
    c.nombre = c.nombre || String(p.negocio).slice(0, 80); c.modo = c.modo || 'auto';
    c.etiquetas = [...new Set([...(c.etiquetas || []), 'prospecto'])];
    c.nota = `Negocio al que le escribimos para ofrecerle página web (campaña). Giro: ${p.giro || '?'}. ${p.resenas || '?'} reseñas en Google${p.estrellas ? ', ' + p.estrellas + ' estrellas' : ''}. Hoy: ${p.tiene || 'sin página'}.`;
    E.hechos[tel] = { t: ahora, jid }; E.hoy++;
    const gap = (C.minEntre || 6) + this.azar() * Math.max(0, (C.maxEntre || 15) - (C.minEntre || 6));
    E.proxima = ahora + gap * MIN;
    const total = Object.values(E.hechos).filter(x => x.jid).length;
    if(E.hoy === 1) await this.avisar(`📣 Campaña: arranqué la de hoy con ${c.nombre}. Hoy van a ser ${C.porDia || 25}, uno cada ${C.minEntre}-${C.maxEntre} min. Los que contesten los atiendo yo y te aviso.`);
    if(E.hoy >= (C.porDia || 25)) await this.avisar(`📣 Campaña: hoy les escribí a ${E.hoy} negocios (llevamos ${total} de ${lista.length}). Mañana sigo.`);
    this.guardar();
  }
  /* encuentra los grupos por su nombre y, la primera vez, baja TODO el historial de fotos del grupo de Mayoreo */
  async mayoreoTic(){
    const MY = this.config.mayoreo; if(!MY || !MY.activo) return;
    const ahora = this.reloj(), T = this.transporte;
    {
      if(T.grupos && ahora - (this.estado.gruposVistos || 0) > 10 * MIN){
        this.estado.gruposVistos = ahora;
        try{
          const gs = await T.grupos();
          for(const g of gs) if(g.nombre && !this.config.chats[g.id]) this.chat(g.id).nombre = g.nombre, this.chat(g.id).grupo = true;
          const f = !MY.fuente && gs.find(g => mismoGrupo(g.nombre, MY.fuenteNombre)); if(f) MY.fuente = f.id;
          const d = !MY.destino && gs.find(g => mismoGrupo(g.nombre, MY.destinoNombre)); if(d){ MY.destino = d.id; const c = this.chat(d.id); c.tienda = true; if(!c.modo) c.modo = 'auto'; }
          /* ¿esta cuenta está en cada grupo? decide cuál recibe y cuál manda */
          this.estado.enFuente = !!MY.fuente && gs.some(g => g.id === MY.fuente);
          this.estado.enDestino = !!MY.destino && gs.some(g => g.id === MY.destino);
          /* 4 nov: el grupo guardado era uno donde ya no está NINGUNA de las dos cuentas, y Mayoreo se quedó
             esperando para siempre. Si ninguna lo ve, se vuelve a buscar por nombre (o el único con «mayoreo») */
          this.estado.gruposMayoreo = gs.filter(g => /mayoreo|shop/i.test(g.nombre || '')).map(g => g.nombre).slice(0, 8);
          const h = MY.duena && MY.duena !== this.cuenta ? this.hermana(MY.duena) : null;
          if(MY.fuente && !this.estado.enFuente && (!h || h.estado.enFuente === false)){
            const conMayoreo = gs.filter(g => /mayoreo/i.test(g.nombre || ''));
            const otro = gs.find(g => mismoGrupo(g.nombre, MY.fuenteNombre)) || (conMayoreo.length === 1 ? conMayoreo[0] : null);
            if(otro && otro.id !== MY.fuente){
              this.anotar(`Mayoreo: ninguna cuenta está en ${this.nombreDe(MY.fuente)}; ahora el proveedor es ${otro.nombre}`);
              MY.fuente = otro.id; MY.duena = this.cuenta; MY.historico = true;
              this.estado.enFuente = true; this.estado.histMayoreo = null;
              this.chat(otro.id).nombre = otro.nombre; this.chat(otro.id).grupo = true;
            }
          }
          this.guardar();
        }catch(e){ this.anotar('no pude ver los grupos: ' + e.message); }
      }
    }
    if(!MY.historico || !MY.fuente || !T.pedirHistorial) return;
    if(this.estado.enFuente === false) return;
    if(!this.meToca(MY, 'fuente')) return;
    if(this.reintentarHistorial){ this.reintentarHistorial = false; this.estado.histMayoreo = null; }
    const H = this.estado.histMayoreo || (this.estado.histMayoreo = { pedidas: 0, ultimoT: 0, sinAvance: 0, ultimaVez: 0 });
    /* el teléfono contesta cuando puede (a veces minutos): entre pedido y pedido se espera minuto y medio */
    if(ahora - H.ultimaVez < 90_000) return;
    H.ultimaVez = ahora;
    /* el ancla se guarda en cuanto se ve (antes se guardaba hasta el primer pedido y un reinicio la perdía) */
    if(T.ancla){ const an = T.ancla(MY.fuente); if(an && (!H.ancla || an.t < H.ancla.t)){ H.ancla = an; this.guardar(); } }
    const t0 = T.masViejo ? T.masViejo(MY.fuente) : 0;
    /* WhatsApp sólo da lo viejo «a partir de» un mensaje que ya se vio; si el grupo está quieto desde que
       arrancó Secre, no hay de dónde jalar: se le pide a Carlos que escriba cualquier cosa ahí, una vez */
    if(!t0 && !(H.ancla && H.ancla.key)){
      H.desde = H.desde || ahora;
      if(!H.pidioAncla && ahora - H.desde > 10 * MIN){ H.pidioAncla = true; this.guardar(); await this.avisar(`📦 Para bajar las fotos viejas de ${this.nombreDe(MY.fuente)} necesito que llegue un mensaje nuevo a ese grupo. Escribe ahí cualquier cosa (un punto) y lo borras después; en cuanto lo vea, empiezo.`); }
      return;
    }
    const rec = T.recibidos ? T.recibidos(MY.fuente) : 0;
    const avanzo = (t0 && t0 !== H.ultimoT) || rec > (H.recibidos || 0);
    if(H.pedidas && !avanzo) H.sinAvance++; else if(avanzo) H.sinAvance = 0;
    H.ultimoT = t0 || H.ultimoT; H.recibidos = rec;
    /* ya no llega nada más viejo (10 pedidos seguidos sin nada, unos 15 min) o ya van 6,000 mensajes */
    if(H.sinAvance >= 10 || H.pedidas >= 120){
      MY.historico = false; this.guardar();
      const np = (this.config.productos || []).length;
      await this.avisar(np ? `📦 Mayoreo: ya revisé todo el historial de ${this.nombreDe(MY.fuente)}. Tengo ${np} prendas; las voy mandando a ${MY.destino ? this.nombreDe(MY.destino) : "All's"} de ${MY.tanda || 100} en ${MY.tanda || 100}.`
        : `📦 Mayoreo: le pedí a WhatsApp las fotos viejas de ${this.nombreDe(MY.fuente)} y no me mandó ninguna. Las NUEVAS que lleguen sí las paso a All's. Para las viejas: abre ese grupo en tu teléfono, con internet, y dime «vuelve a jalar las fotos de mayoreo».`);
      return;
    }
    /* el ancla se guarda: tras un reinicio se sigue desde donde iba, sin esperar a que alguien escriba en el grupo */
    if(T.ancla){ const an = T.ancla(MY.fuente); if(an && (!H.ancla || an.t < H.ancla.t)) H.ancla = an; }
    /* si el pedido anterior no trajo nada: el tiempo en la otra unidad, y luego otra ancla */
    const opciones = { saltar: H.sinAvance > 0 && H.sinAvance % 2 === 0, seg: H.sinAvance % 2 === 1 };
    if(opciones.saltar) H.ancla = null;
    try{ if(await T.pedirHistorial(MY.fuente, 50, H.ancla || null, opciones)){ H.pedidas++; if(H.pedidas === 1) await this.avisar(`📦 Mayoreo: ya vi tu mensaje en ${this.nombreDe(MY.fuente)}. Empiezo a jalar las fotos viejas; te aviso cuando lleguen.`); } }catch(e){ this.anotar('Mayoreo: no pude pedir el historial: ' + e.message); }
    this.guardar();
  }

  /* ── una llamada de WhatsApp: no se puede contestar con voz; se rechaza y se le escribe ── */
  /* ¿este chat es de negocio? prospectos de la campaña, el grupo de All's (o una tienda), Instagram/Facebook,
     o uno que Carlos marcó con «negocio Fulano» */
  esNegocio(jid, c = this.config.chats[jid] || {}){
    const MY = this.config.mayoreo || {}, et = c.etiquetas || [];
    return et.includes('prospecto') || et.includes('negocio') || !!c.tienda || jid === MY.destino || jid === MY.fuente || /^(ig|fb):/.test(jid);
  }
  async alLlamada({ de, video }){
    if(this.config.soloNegocio) return;                  /* sólo negocio: las llamadas son de Carlos, ni se rechazan */
    if(!de || this.esMiChat(de) || this.esOtraCuenta(de)) return;
    const nombre = this.nombreDe(de), f = this.firmaDe(de);
    const txt = `Hola, ${this.config.nombre} no puede contestar llamadas ahorita. ¿Quién habla y para qué le marcas? Escríbeme aquí y se lo paso.`;
    await this.mandar(de, f && !this.imitaEn(de) ? f + ' ' + txt : txt);
    await this.avisar(`📞 Te ${video ? 'videollamó' : 'llamó'} ${nombre} por WhatsApp. Le colgué y le pregunté quién es y para qué; cuando conteste te digo.`);
    (this.estado.encargos || (this.estado.encargos = [])).push({ chat: de, para: 'por qué te llamó', t: this.reloj() });
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
  /* ── el elenco del rol: Paulina y Negro con sus propios personajes ── */
  elencoDe(jid){
    const c = this.config.chats[jid] || {}, com = (c.comunidad && (this.config.comunidades || {})[c.comunidad]) || {};
    const l = Array.isArray(c.elenco) ? c.elenco : (Array.isArray(com.elenco) ? com.elenco : []);
    return l.filter(q => (this.config.personajes || {})[q]);
  }
  async jugarElenco(jid){
    const quienes = this.elencoDe(jid);
    if(!quienes.length || !this.ia.jugarElenco) return;
    if(this.config.pausaHasta > this.reloj()) return;
    const c = this.chat(jid), R = this.rolDe(jid), P = this.config.personajes || {};
    const visto = (this.estado.elencoVisto[jid] || (this.estado.elencoVisto[jid] = {}));
    const ultimo = (this.estado.elencoUltimo || (this.estado.elencoUltimo = {}))[jid] || (this.estado.elencoUltimo[jid] = {});
    /* el orden cambia cada vez: que no conteste siempre la misma primero */
    const orden = quienes.slice().sort(() => this.azar() - 0.5);
    for(const quien of orden){
      const ficha = P[quien], ahora = this.reloj();
      const h = this.estado.historial[jid] || [];
      const nuevos = h.filter(x => x.t > (visto[quien] || 0) && x.elenco !== quien);
      if(!nuevos.length) continue;
      visto[quien] = h[h.length - 1].t;
      /* sólo juega si escribió una PERSONA (o un bot del juego): entre las dos IAs no se encadenan */
      if(!nuevos.some(x => x.de === 'el' || (x.de === 'yo' && !x.secre))) continue;
      if(ahora - (ultimo[quien] || 0) < 60_000) continue;          /* una jugada por minuto cada una */
      const freno = this.frenoAuto(jid, nuevos, true);
      if(freno){ this.bitacora(jid, this.nombreDe(jid), nuevos, 'freno', '', `${ficha.nombre} no jugó: ${freno}`); continue; }
      const quienEs = (x) => x.elenco ? (P[x.elenco] || {}).nombre || x.elenco : x.de === 'yo' ? `${this.config.nombre}${R.personaje ? ` (su personaje: ${R.personaje.split(/[,.]/)[0]})` : ''}` : (x.quien || 'Alguien');
      let r;
      try{
        r = await this.ia.jugarElenco({ quien, personaje: ficha.nombre, ficha: ficha.ficha, nombre: this.nombreDe(jid), mundo: R.mundo, instrucciones: R.instrucciones, comunidad: R.comunidad,
          otros: quienes.filter(q => q !== quien).map(q => P[q].nombre).concat(R.personaje ? [`${this.config.nombre} (${R.personaje.split(/[,.]/)[0]})`] : [this.config.nombre]),
          historia: h.slice(-45).map(x => `${quienEs(x)}: ${x.texto}`).join('\n'), nuevos: nuevos.map(x => `${quienEs(x)}: ${x.texto}`).join('\n') });
      }catch(e){ this.anotar(`${ficha.nombre} (${quien}) no pudo jugar: ${e.message}`); continue; }
      /* si la IA le pone a su línea la marca de otro personaje (el de Carlos o la de la otra), se la quita */
      const ajenas = [R.marca, ...quienes.filter(q => q !== quien).map(q => P[q].marca)].filter(Boolean);
      const limpias = ((r && r.lineas) || []).map(l => { let t = String(l.texto || '').trim(); for(const mk of ajenas) if(t.startsWith(mk)) t = t.slice(mk.length).trim(); return { ...l, texto: t }; });
      const texto = this.formatoRol({ marca: ficha.marca || '' }, { ...(r || {}), lineas: limpias });
      if(!texto){ continue; }
      await this.mandar(jid, texto);
      const ult = h[h.length - 1]; if(ult && ult.secre && ult.texto === texto){ ult.elenco = quien; ult.quien = ficha.nombre; }
      visto[quien] = this.reloj();
      ultimo[quien] = this.reloj();
      this.estado.autos[jid] = [...(this.estado.autos[jid] || []).filter(t => ahora - t < 24 * HORA), ahora];
      this.bitacora(jid, this.nombreDe(jid), nuevos, 'contesto', texto, `${quien} jugó con ${ficha.nombre}`);
    }
    this.guardar();
  }
  textoElenco(jid){
    const P = this.config.personajes || {}, l = this.elencoDe(jid);
    return l.length ? `En ${this.nombreDe(jid)} juegan también: ` + l.map(q => `${q} como ${P[q].nombre} (${P[q].marca})`).join(' y ') + '.' : `En ${this.nombreDe(jid)} no juega nadie del elenco.`;
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
  /* ¿se hace pasar por Carlos en este chat? */
  imitaEn(jid){ const c = this.config.chats[jid] || {}; return typeof c.imitar === 'boolean' ? c.imitar : !!this.config.imitar; }
  /* dónde anda ahorita (para no prometer nada mientras está en clase) */
  enQueAnda(){ const t = this.reloj(); try{ return enQueAnda({ dia: diaMx(t), hora: horaMx(t), horario: this.config.miHorario }); }catch{ return ""; } }
  criterioDe(jid){
    const prods = (this.config.productos || []).filter(p => p.precio);
    return { nombre: this.config.nombre, prohibidos: this.config.prohibidos || [], precios: [...(this.config.precios || []), ...prods.map(p => ({ nombre: p.desc, precio: p.precio, nota: '' }))],
      datos: [...this.datosVigentes().map(d => d.texto), this.conocimiento || ''], vetados: (this.config.productos || []).map(p => p.costo).filter(c => c && !prods.some(q => q.precio === c)),
      chat: (this.estado.historial[jid] || []).filter(x => !x.secre).map(x => x.texto).join('\n') };
  }
  /* pone la firma al inicio sin repetirla si la IA ya la escribió («Asistente de Carlos: Asistente de Carlos: …») */
  firmar(firma, texto){
    let t = String(texto || '').trim(); if(!firma) return t;
    const base = sinAcentos(firma.replace(/[:\s]+$/, ''));
    while(sinAcentos(t).startsWith(base)) t = t.slice(base.length).replace(/^[\s:,.-]+/, '');
    return firma + ' ' + t;
  }
  /* al mandar una propuesta aprobada, el pendiente de CONTESTARLE ya quedó (llevar el proyecto, no) */
  cerrarPendientesDe(p){
    for(const x of this.estado.pendientes) if(!x.hecho && x.chat === p.chat && Math.abs((x.t || 0) - (p.t || 0)) < 5 * 60000 && /^(confirmar|contestar|responder|decirle|avisarle|dar respuesta)/.test(sinAcentos(x.texto))){ x.hecho = true; x.solo = true; }
  }
  firmaDe(jid){
    const c = this.config.chats[jid] || {}, A = this.confAuto();
    if(typeof c.firma === 'string') return c.firma;
    if(this.imitaEn(jid)) return '';
    return c.rol ? '' : (A.firma ? `${A.firma.replace(/^🤖\s*/, '')}:` : '');
  }
  async contestarSola(jid, nombre, nuevos, r){
    const A = this.confAuto(), ahora = this.reloj();
    const c = this.chat(jid);
    /* lo que escribió se revisa en código ANTES de mandarlo: prohibido, precio inventado,
       comprometerlo o echarle la culpa → no sale tal cual; se le contesta algo seguro y Carlos decide */
    const freno = c.rol ? '' : revisarRespuesta(r.respuesta, this.criterioDe(jid));
    if(freno){
      this.anotar(`frené lo que iba a decirle a ${nombre}: ${freno} · «${String(r.respuesta).slice(0, 120)}»`);
      r = { ...r, decide: true, audio: false, motivo: freno + (r.motivo ? ' · ' + r.motivo : ''), propuesta: r.respuesta,
        respuesta: this.imitaEn(jid) ? 'déjame ver y te digo' : `Le paso tu mensaje a ${this.config.nombre} y él te confirma.` };
    }
    const decide = !!(r.decide || r.urgente);
    /* en el rol, el formato del grupo lo pone el código, no la IA: así no se le olvida */
    const marca = this.rolDe(jid).marca;
    const resp = c.rol && !decide ? this.formatoRol({ ...c, marca }, r) : String(r.respuesta || '').trim();
    /* «dile a Carlos que me llame», «que me busque»: se le avisa DE VERDAD, al momento */
    /* si ya va a llegarle como «necesita tu decisión», no se le avisa dos veces */
    if(r.avisar && !(r.decide || r.urgente)){
      await this.avisar(`📣 ${nombre} te busca: ${r.avisar}\n(dijo: «${nuevos.slice(-2).map(x => x.texto).join(' / ').slice(0, 200)}»)`);
      if(r.urgente) await this.quizaLlamar(nombre, r.avisar, 'te busca');
    }
    const cita = nuevos.slice(-3).map(x => (x.quien ? x.quien + ': ' : '') + x.texto).join(' / ').slice(0, 300);
    if(resp){
      const firma = this.firmaDe(jid);
      /* le pidieron audio: la misma respuesta en nota de voz (si no se puede grabar, va escrita) */
      let fueAudio = false;
      if(r.audio && !c.rol){ try{ await this.mandarAudio(jid, resp); fueAudio = true; }catch(e){ this.anotar('no pude grabar el audio: ' + e.message); } }
      /* con marca de personaje, la firma va al final para no romper «🌌⚛️- …» del primer renglón */
      if(!fueAudio) await this.mandar(jid, !firma ? resp : (c.rol && marca && !decide) ? resp + ' ' + firma : this.firmar(firma, resp));
      if(r.elegidas && r.elegidas.length) await this.mandarFotos(jid, r.elegidas);
      this.estado.autos[jid] = [...(this.estado.autos[jid] || []).filter(t => ahora - t < 24 * HORA), ahora];
      const hoy = fechaMx(ahora);
      if(this.estado.autoHoy.fecha !== hoy) this.estado.autoHoy = { fecha: hoy, lista: [] };
      this.estado.autoHoy.lista.push({ nombre, dijo: cita.slice(0, 120), resp: resp.slice(0, 160), decide });
    }
    this.bitacora(jid, nombre, nuevos, decide ? 'decide' : resp ? 'contesto' : 'nada', resp,
      decide ? 'necesita tu decisión' + (r.motivo ? ': ' + r.motivo : '') : (r.porque || (resp ? this.porqueModo(jid) : 'no hacía falta contestar')), !!r.urgente);
    if(c.rol && !decide) await this.quizaSticker(jid, c, r, !!resp);
    if(decide){
      /* lo que sólo Carlos puede decidir se queda con él, con número para contestar */
      this.estado.propuestas = this.estado.propuestas.filter(p => !(p.chat === jid && p.tipo === 'respuesta'));
      const n = this.estado.sigN++;
      this.estado.propuestas.push({ n, chat: jid, nombre, texto: '', motivo: r.motivo || '', dijo: cita, urgente: !!r.urgente, t: ahora, tipo: 'respuesta' });
      if(r.propuesta) this.estado.propuestas[this.estado.propuestas.length - 1].texto = String(r.propuesta).trim();
      await this.avisar(`#${n} · ${nombre} ⚠️ necesita tu decisión: «${cita}»` + (r.motivo ? `\n(${r.motivo})` : '') +
        (resp ? `\nYa le contesté: «${resp}»` : '') + (r.propuesta ? `\nIba a decir: «${String(r.propuesta).trim()}» → «${n}» lo manda así` : '') + `\n→ «${n} tu respuesta» y se la mando`);
    } else if(resp && !c.rol){
      /* en un rol no le avisa cada jugada (serían cientos): van en el resumen de la noche */
      await this.avisar(`✓ Le contesté sola a ${nombre}: «${resp}»\n(dijo: «${cita}»)`);
    }
    this.guardar();
  }

  /* «Por mandar» también enseña lo que llegó, qué hizo Secre y por qué (Carlos, 16 de octubre) */
  bitacora(jid, nombre, nuevos, que, resp, porque, urgente = false){
    const dijo = nuevos.slice(-3).map(x => (x.quien ? x.quien + ': ' : '') + x.texto).join(' / ').slice(0, 300);
    const l = this.estado.contestadas || (this.estado.contestadas = []);
    l.unshift({ t: this.reloj(), chat: jid, nombre, dijo, que, resp: String(resp || '').slice(0, 600), porque: String(porque || '').slice(0, 240), ...(urgente ? { urgente: true } : {}) });
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

  /* 4 nov: «me pone muchos pendientes que no son pendientes reales o que ni tienen que ver conmigo» —
     el segundo filtro, después del de la IA: fuera lo vago y lo que no hace él */
  esPendienteDeVerdad(t){
    const x = sinAcentos(t);
    if(x.length < 8) return false;
    if(/^(estar (al pendiente|atento)|revisar (el|los) (chat|mensaje)|contestar(le)? (el|al|a) (mensaje|chat)|responder(le)?( al)? mensaje|leer (el|los) mensaje|ver (que|qué) onda|seguir la (platica|conversacion)|saludar|platicar)/.test(x)) return false;
    if(/^(que |ella |el |ellos |ellas )/.test(x)) return false;
    return true;
  }
  agregarTarea(jid, nombre, t){
    const que = String(t.que || '').trim(); if(!que) return;
    const T = this.estado.tareas || (this.estado.tareas = []);
    if(T.some(x => !x.hecho && sinAcentos(x.que) === sinAcentos(que))) return;
    T.push({ n: (T.reduce((m, x) => Math.max(m, x.n), 0) + 1), materia: String(t.materia || '').slice(0, 60), que: que.slice(0, 300), para: String(t.para || '').slice(0, 10), chat: jid, de: nombre, t: this.reloj(), hecho: false });
    this.estado.tareas = T.slice(-200);
  }
  agregarPendiente(jid, nombre, texto){
    const t = String(texto || '').trim(); if(!t || !this.esPendienteDeVerdad(t)) return;
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
    if(this.captura) this.captura.push(texto);
    const id = await this.transporte.enviar(this.destinoAvisos(), `🤖 ${quien}: ` + texto);
    if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); }
  }
  /* un aviso dicho en voz (después del escrito): «resumen en audio», «pendientes en audio» */
  async avisarVoz(texto){
    const dicho = String(texto).replace(/[#*_~>«»]/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\n+/g, '. ').replace(/\s+/g, ' ').trim().slice(0, 1400);
    if(!dicho) return;
    try{
      const { ogg, segundos } = await this.ia.voz(dicho, this.config.voz);
      const id = await this.transporte.enviarAudio(this.destinoAvisos(), ogg, segundos);
      if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); }
    }catch(e){ await this.avisar('No pude grabar el audio: ' + e.message); }
  }
  /* una nota de voz a otra persona: SÓLO por orden de Carlos */
  async mandarAudio(jid, texto){
    const { ogg, segundos } = await this.ia.voz(texto, this.config.voz);
    try{ await this.transporte.grabando && this.transporte.grabando(jid, Math.min(4000, segundos * 300)); }catch{}
    const id = await this.transporte.enviarAudio(jid, ogg, segundos);
    if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); }
    const h = this.estado.historial[jid] || (this.estado.historial[jid] = []);
    h.push({ de: 'yo', secre: true, texto: '🎤 ' + texto, t: this.reloj() }); this.estado.historial[jid] = h.slice((this.config.chats[jid] || {}).grupo ? -60 : -30);
    this.anotar(`mandó un audio a ${this.nombreDe(jid)}: ${texto.slice(0, 80)}`);
    return segundos;
  }

  /* ── llamarle por teléfono cuando algo es urgente ── */
  numeroDeCarlos(){
    const L = this.config.llamar || {};
    if(L.tel) return L.tel;
    return String(this.destinoAvisos() || '').split('@')[0];
  }
  async quizaLlamar(nombre, dijo, motivo){
    if(this.config.soloNegocio) return;
    const L = Object.assign({ activo: false, desde: '08:00', hasta: '23:00' }, this.config.llamar || {});
    if(!L.activo) return;
    const ahora = this.reloj();
    if(!entreHoras(ahora, L.desde, L.hasta)) return;
    if(ahora - (this.estado.llamoT || 0) < 20 * MIN) return;   /* no más de una cada 20 min */
    if(!this.telefono.listas()){ return; }
    this.estado.llamoT = ahora;
    const texto = `Hola ${this.config.nombre}, soy ${this.deTurno()}, tu asistente. ${nombre} te escribió algo urgente: ${String(dijo).slice(0, 300)}.` + (motivo ? ` ${motivo}.` : '') + ' Revisa tu WhatsApp.';
    /* con el conmutador puesto, la llamada CONVERSA: le dice qué pasa y él contesta qué decirle a cada uno */
    const base = (typeof process !== 'undefined' && (process.env.SECRE_URL || process.env.RENDER_EXTERNAL_URL) || '').replace(/\/+$/, '');
    const r = this.telefono.conversar && base ? await this.telefono.conversar({ a: this.numeroDeCarlos(), url: base + '/voz/pendientes' }) : await this.telefono.llamar({ a: this.numeroDeCarlos(), texto });
    await this.avisar(r.bien ? `📞 Te llamé: ${nombre} escribió algo urgente.` : `📞 Quise llamarte por ${nombre} y no pude: ${r.error}`);
    this.guardar();
  }

  /* ── fotos del banco ── */
  fotosEn(jid, esGrupo){
    if(!this.banco || !(this.banco.listo ? this.banco.listo() : true)) return false;
    const c = this.config.chats[jid] || {};
    if(c.fotos !== undefined) return !!c.fotos;
    if((this.config.fotos || {}).responder === false) return false;
    return !esGrupo;
  }
  /* manda fotos del banco con su nombre; regresa cuántas salieron */
  async mandarFotos(jid, fichas){
    let n = 0; const P = this.config.productos || [];
    for(const f of fichas){
      try{
        const { buf, mime } = await this.banco.bajar(f.id);
        const prod = P.find(p => p.fotoId && p.fotoId === f.id) || null;
        /* a la venta: nombre, marca, tallas y precio; nunca la descripción del banco */
        const id = await this.transporte.enviarImagen(jid, buf, mime, pieVenta(f, prod));
        if(id && prod) (this.estado.fotoProducto || (this.estado.fotoProducto = {}))[id] = prod.id;
        if(id){ this.estado.enviados.push(id); this.estado.enviados = this.estado.enviados.slice(-500); }
        const h = this.estado.historial[jid] || (this.estado.historial[jid] = []);
        h.push({ de: 'yo', secre: true, texto: `[foto: ${nombreFoto(f)}]`, t: this.reloj() }); this.estado.historial[jid] = h.slice((this.config.chats[jid] || {}).grupo ? -60 : -30);
        n++;
      }catch(e){ this.anotar(`no pude mandar la foto ${nombreFoto(f)} a ${this.nombreDe(jid)}: ${e.message}`); }
    }
    if(n) this.anotar(`mandó ${n} foto(s) a ${this.nombreDe(jid)}`);
    return n;
  }

  /* ── lo que sale solo a su hora: mensajes programados y publicaciones ── */
  tocaHoy(x, ahora){
    if(x.pausa) return false;
    const dias = Array.isArray(x.dias) && x.dias.length ? x.dias : [0, 1, 2, 3, 4, 5, 6];
    if(!dias.includes(diaMx(ahora))) return false;
    const m = minDelDia(ahora), h = aMin(x.hora);
    /* si Secre estuvo dormida, no manda «toca Mate» una hora tarde: hasta 20 min */
    return h != null && m >= h && m - h <= 20;
  }
  async programadosTic(ahora){
    const hoy = fechaMx(ahora), ya = this.estado.programadosHoy || (this.estado.programadosHoy = {});
    for(const p of this.config.programados || []){
      if(ya[p.id] === hoy || !this.tocaHoy(p, ahora) || !p.chat) continue;
      ya[p.id] = hoy; this.guardar();
      let texto = String(p.texto || '').trim();
      if(!texto && p.tema){
        try{ texto = String(await this.ia.escribir({ dueno: this.config.nombre, nombre: this.nombreDe(p.chat), tema: p.tema, estilo: this.estado.estilo.slice(-30), grupo: !!(this.config.chats[p.chat] || {}).grupo, hoy, hora: horaMx(ahora) }) || '').trim(); }
        catch(e){ this.anotar('el programado no se pudo escribir: ' + e.message); }
      }
      if(!texto){ await this.avisar(`⏰ No pude escribir el mensaje programado de las ${p.hora} para ${this.nombreDe(p.chat)}.`); continue; }
      const firma = p.sinFirma ? '' : this.firmaDe(p.chat);
      await this.mandar(p.chat, this.firmar(firma, texto));
    }
  }
  async publicarTic(ahora){
    const hoy = fechaMx(ahora), ya = this.estado.publicadoHoy || (this.estado.publicadoHoy = {});
    for(const pub of this.config.publicar || []){
      if(pub.apagado || ya[pub.id] === hoy || !this.tocaHoy(pub, ahora) || !pub.chat) continue;
      ya[pub.id] = hoy; this.guardar();
      const r = await this.publicarAhora(pub);
      if(r.error) await this.avisar(`📷 No pude publicar en ${this.nombreDe(pub.chat)}: ${r.error}`);
    }
  }
  /* escoge fotos que no se hayan publicado (hasta que se acaben y vuelve a empezar) y las manda */
  async publicarAhora(pub){
    if(!this.banco) return { error: 'no hay banco de imágenes' };
    let fichas;
    try{ fichas = await this.banco.fichas(); }catch(e){ return { error: e.message }; }
    const car = pub.carpeta ? String(pub.carpeta) : '';
    const cand = pub.buscar ? buscarFotos(fichas, pub.buscar, { carpeta: car, n: 5000 })
      : fichas.filter(f => (!car || String(f.carpeta || '').toLowerCase() === car.toLowerCase()) && f.estado !== 'cambios');
    if(!cand.length) return { error: car ? `no hay fotos en la carpeta «${car}» del banco` : 'no encontré fotos para eso en el banco' };
    const cuantas = Math.max(1, Math.min(10, +pub.cuantas || 3));
    const pubs = this.estado.publicados || (this.estado.publicados = {});
    let ya = new Set(pubs[pub.id] || []);
    let libres = cand.filter(f => !ya.has(f.id));
    if(libres.length < cuantas){ ya = new Set(); pubs[pub.id] = []; libres = cand.slice(); }
    /* al azar entre las que faltan, para que no salgan siempre en el mismo orden */
    const hoy = [];
    while(hoy.length < cuantas && libres.length) hoy.push(libres.splice(Math.floor(this.azar() * libres.length), 1)[0]);
    let intro = String(pub.intro || '').trim();
    if(!intro && this.ia.escribir){
      try{ intro = String(await this.ia.escribir({ dueno: this.config.nombre, nombre: this.nombreDe(pub.chat), tema: `presentar en pocas palabras lo de hoy: ${hoy.map(f => nombreFoto(f)).join(', ')}. Corto, con ganas, sin precios que no te den`, estilo: this.estado.estilo.slice(-30), grupo: true, hoy: fechaMx(this.reloj()), hora: horaMx(this.reloj()) }) || '').trim(); }catch{}
    }
    if(intro && intro !== '-') await this.mandar(pub.chat, intro);
    const n = await this.mandarFotos(pub.chat, hoy);
    pubs[pub.id] = [...(pubs[pub.id] || []), ...hoy.map(f => f.id)];
    this.guardar();
    return n ? { n } : { error: 'ninguna foto se pudo mandar' };
  }
  /* el horario de clases en un grupo: un mensaje por clase, a su hora, con lo que sigue.
     Volver a ponerlo reemplaza el anterior de ese chat (no duplica) */
  ponerHorario(jid, clave){
    const msgs = mensajesDeHorario(clave); if(!msgs.length) return 0;
    const ps = (this.config.programados || []).filter(p => !(p.chat === jid && p.origen === 'horario'));
    msgs.forEach((x, i) => ps.push({ id: `h${clave.replace(/\W/g, '')}-${x.dia}-${x.hora.replace(':', '')}-${i}`, chat: jid, hora: x.hora, dias: [x.dia], texto: x.texto, tema: '', origen: 'horario', horario: clave }));
    this.config.programados = ps;
    return msgs.length;
  }
  quitarHorario(jid){
    const antes = (this.config.programados || []).length;
    this.config.programados = (this.config.programados || []).filter(p => !(p.chat === jid && p.origen === 'horario'));
    return antes - this.config.programados.length;
  }
  textoProgramados(){
    const todos = this.config.programados || [], us = this.config.publicar || [];
    const hs = [...new Set(todos.filter(p => p.origen === 'horario').map(p => p.chat + '|' + p.horario))];
    const ps = todos.filter(p => p.origen !== 'horario');
    if(!todos.length && !us.length) return 'No hay nada programado. Ej.: «programa Tareas 7:00 lunes a viernes: toca Matemáticas» o «publica en All\'s 3 fotos de la carpeta All\'s fashion diario a las 10».';
    return [hs.length ? '📚 Horario de clases: ' + hs.map(k => { const [j, h] = k.split('|'); return `${h} en ${this.nombreDe(j)} (${todos.filter(p => p.chat === j && p.origen === 'horario').length} avisos)`; }).join(', ') + '\n→ «quita el horario de Tareas»' : '',
      ps.length ? '⏰ Mensajes programados:\n' + ps.map((p, i) => `${i + 1}. ${this.nombreDe(p.chat)} · ${p.hora} ${textoDias(p.dias)}: ${p.texto ? '«' + p.texto.slice(0, 80) + '»' : 'sobre ' + p.tema}${p.pausa ? ' (en pausa)' : ''}`).join('\n') : '',
      us.length ? '📷 Publicaciones:\n' + us.map((p, i) => `${i + 1}. ${this.nombreDe(p.chat)} · ${p.hora} ${textoDias(p.dias)}: ${p.cuantas || 3} foto(s)${p.carpeta ? ' de «' + p.carpeta + '»' : ''}${p.buscar ? ' de ' + p.buscar : ''}`).join('\n') : ''].filter(Boolean).join('\n\n') +
      '\n→ «quita programado 2» · «quita publicación 1» · «publica ahora en All\'s»';
  }

  async fotosA(jid, que, n = 4, aCarlos = false){
    if(!this.banco) return 'No tengo el banco de imágenes conectado.';
    let fichas;
    try{ fichas = await this.banco.fichas(); }catch(e){ return 'El banco no contestó: ' + e.message; }
    /* si lo que pide es una carpeta, la carpeta entera */
    const car = [...new Set(fichas.map(f => f.carpeta).filter(Boolean))].find(c => sinAcentos(c) === sinAcentos(que) || sinAcentos('la carpeta ' + c) === sinAcentos(que));
    const fs = (car ? fichas.filter(f => f.carpeta === car && f.estado !== 'cambios') : buscarFotos(fichas, que, { n: 50 })).slice(0, Math.min(10, n));
    if(!fs.length) return `No encontré fotos de «${que}» en el banco.`;
    const k = await this.mandarFotos(jid, fs);
    return k ? (aCarlos ? `📷 Ahí van ${k} foto(s) de «${que}».` : `📷 Listo, le mandé ${k} foto(s) a ${this.nombreDe(jid)}: ${fs.slice(0, k).map(f => nombreFoto(f)).join(', ')}.`) : 'No pude mandar las fotos.';
  }
  textoSinLlamadas(){
    return 'Para llamarte por teléfono falta la cuenta de llamadas (Twilio): en Render se ponen TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_FROM. Los pasos están en la página de Secre. Mientras, te aviso por WhatsApp desde tu otra cuenta, que sí suena.';
  }
  /* ── el resumen de lo que llegó, cuando él lo pide ── */
  async resumenLlegadas(desde){
    const ahora = this.reloj();
    const l = (this.estado.contestadas || []).filter(x => x.t > desde).reverse();
    const abiertos = this.estado.pendientes.filter(p => !p.hecho && p.t > desde);
    const esperan = this.estado.propuestas;
    this.estado.resumioT = ahora; this.guardar();
    if(!l.length && !abiertos.length) return `Desde las ${horaMx(desde)} no te ha llegado nada nuevo.` +
      (esperan.length ? `\n⏳ Siguen esperando tu número: ` + esperan.slice(-8).map(p => `#${p.n} ${p.nombre}`).join(', ') : '');
    const porChat = new Map();
    for(const x of l){ const c = porChat.get(x.chat) || { nombre: x.nombre, items: [] }; c.items.push(x); porChat.set(x.chat, c); }
    const importante = (c) => c.items.some(x => x.urgente || x.que === 'decide' || x.que === 'error' || x.que === 'freno') || esperan.some(p => p.chat === c.chat);
    const chats = [...porChat.entries()].map(([chat, c]) => ({ chat, ...c }));
    const imp = chats.filter(importante), resto = chats.filter(c => !importante(c));
    const corto = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
    const linea = (c) => {
      const u = c.items[c.items.length - 1], n = c.items.length;
      const que = { contesto: 'le contesté', decide: 'le dije que te pasaba su mensaje', nada: 'no hacía falta contestar', freno: 'no le contesté', error: 'no pude contestarle', propuesta: 'te dejé propuesta' }[u.que] || '';
      return `· ${c.nombre}${n > 1 ? ` (${n})` : ''}${u.urgente ? ' ⚠️' : ''}: «${corto(u.dijo, 110)}»` + (u.resp ? ` → «${corto(u.resp, 90)}»` : que ? ` → ${que}` : '');
    };
    const L = [`Lo que te llegó desde las ${horaMx(desde)} (${l.length} mensaje(s) de ${chats.length} chat(s)):`];
    /* en corto, con la IA: lo que de verdad importa dicho en dos renglones */
    if(this.ia && this.ia.resumir && chats.length){
      try{
        const r = await this.ia.resumir({ dueno: this.config.nombre, chats: chats.map(c => ({ nombre: c.nombre, mensajes: c.items.map(x => ({ dijo: corto(x.dijo, 200), hice: x.que, respuesta: corto(x.resp, 160), urgente: !!x.urgente })) })) });
        if(r && r.resumen) L.push('En corto: ' + corto(r.resumen, 600));
        for(const n of (r && r.importantes) || []){ const c = resto.find(x => x.nombre === n); if(c){ resto.splice(resto.indexOf(c), 1); imp.push(c); } }
      }catch(e){ this.anotar('el resumen de la IA falló: ' + e.message); }
    }
    if(imp.length) L.push('', '⚠️ Importante:', ...imp.map(linea));
    if(esperan.length) L.push('', `⏳ Esperan tu número: ` + esperan.slice(-8).map(p => `#${p.n} ${p.nombre}`).join(', '));
    if(resto.length) L.push('', '✓ Lo demás:', ...resto.slice(0, 25).map(linea), ...(resto.length > 25 ? [`…y ${resto.length - 25} chat(s) más`] : []));
    if(abiertos.length) L.push('', '📌 Pendientes nuevos:', this.listaPendientes(abiertos.slice(-8)));
    return L.join('\n').slice(0, 3800);
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
  async orden(texto, { voz = false } = {}){
    /* «… en audio»: hace lo mismo y además se lo dice en una nota de voz */
    const enAudio = /\s+(?:en|por|con) (?:audio|voz|nota de voz)\s*[.!?]*$/i.exec(texto.trim());
    if((enAudio || voz) && !this.captura){
      this.captura = [];
      try{ await this.orden(enAudio ? texto.trim().slice(0, enAudio.index) : texto.trim()); }
      finally{ const dicho = this.captura.join('\n'); this.captura = null; if(dicho) await this.avisarVoz(dicho); }
      return;
    }
    const t = texto.trim(), s = sinAcentos(t);
    this.charlar('carlos', t);
    let m;
    /* «resumen», «qué me llegó», «qué pasó», «algo importante?» → lo que llegó y qué hizo */
    if(/^\/?(?:resumen|resumeme|resume|novedades|que (?:me )?(?:llego|ha llegado|han escrito|me escribieron|hubo|paso|ha pasado|me perdi|contestaste|respondiste|hiciste)|que hay de nuevo|(?:hay )?algo importante|me escribio alguien)\b(?!.*\d{1,2}:\d{2})/.test(s.replace(/[¿?¡!.]/g, '').trim())){
      const ahora = this.reloj(), mx = minDelDia(ahora) * MIN;
      const desde = /\bhoy\b/.test(s) ? ahora - mx : /\bayer\b/.test(s) ? ahora - mx - 24 * HORA
        : (this.estado.resumioT && ahora - this.estado.resumioT < 24 * HORA ? this.estado.resumioT : ahora - 24 * HORA);
      return this.avisar(await this.resumenLlegadas(desde));
    }
    /* audios: «audio Ana: ya voy para allá» · «3 audio» manda la propuesta 3 como nota de voz */
    if((m = /^audio (?:a |para )?([^:]{1,60}):\s*([\s\S]+)$/i.exec(t))){
      const j = this.buscarChat(m[1]);
      if(!j) return this.avisar(`No tengo a «${m[1].trim()}» en tus chats.`);
      try{ const sg = await this.mandarAudio(j, m[2].trim()); return this.avisar(`🎤 Listo, le mandé el audio a ${this.nombreDe(j)}${sg ? ` (${sg} s)` : ''}.`); }
      catch(e){ return this.avisar(`No pude mandarle el audio a ${this.nombreDe(j)}: ${e.message}`); }
    }
    if((m = /^#?(\d+)\s+(?:en\s+)?audio(?:\s+([\s\S]+))?$/i.exec(t))){
      const p = this.estado.propuestas.find(x => x.n === +m[1]);
      if(!p) return this.avisar(`No tengo la #${m[1]} (o ya caducó).`);
      const final = (m[2] || '').trim() || p.texto;
      if(!final) return this.avisar(`La #${m[1]} no trae texto: escribe «${m[1]} audio lo que quieras decir».`);
      try{ await this.mandarAudio(p.chat, final); }catch(e){ return this.avisar(`No pude grabar el audio: ${e.message}`); }
      this.estado.propuestas = this.estado.propuestas.filter(x => x.n !== p.n); this.cerrarPendientesDe(p); this.guardar();
      return this.avisar(`🎤 Listo, a ${p.nombre} en audio: «${final}»`);
    }
    /* ── el elenco del rol ──
       «Paulina y Negro juegan en Taberna» · «Paulina juega en Taberna» · «elenco Taberna: Negro»
       · «saca a Negro de Taberna» · «elenco Taberna» · «personaje de Paulina: Nombre: …» · «marca de Negro: 🌑-» */
    if((m = /^\/?(paulina|negro)(?: y (paulina|negro))? (?:juegan?|participan?|entran?) (?:tambien )?(?:en|al|a) (.+)$/.exec(s)) || (m = /^\/?elenco (?!de )(.+?):\s*(paulina|negro)(?:,? y |, | )?(paulina|negro)?$/.exec(s)) && (m = [m[0], m[2], m[3], m[1]])){
      const j = this.buscarChat(m[3]); if(!j) return this.avisar(`No tengo a «${m[3]}» en tus chats.`);
      const quienes = [...new Set([m[1], m[2]].filter(Boolean).map(q => q[0].toUpperCase() + q.slice(1)))];
      const c = this.chat(j); c.elenco = [...new Set([...(c.elenco || []), ...quienes])];
      this.guardar();
      return this.avisar(this.textoElenco(j) + (c.rol ? '' : `\n(Tu personaje no lo juego ahí: para eso «rol ${this.nombreDe(j)}». Ellas juegan igual.)`));
    }
    if((m = /^\/?(?:saca|quita) a (paulina|negro)(?: y (?:a )?(paulina|negro))? (?:de|del) (.+)$/.exec(s))){
      const j = this.buscarChat(m[3]); if(!j) return this.avisar(`No tengo a «${m[3]}» en tus chats.`);
      const fuera = [m[1], m[2]].filter(Boolean).map(q => q[0].toUpperCase() + q.slice(1));
      const c = this.chat(j); c.elenco = this.elencoDe(j).filter(q => !fuera.includes(q));
      this.guardar(); return this.avisar(this.textoElenco(j));
    }
    if((m = /^\/?elenco (?:de |en )?(.+)$/.exec(s)) && this.buscarChat(m[1])) return this.avisar(this.textoElenco(this.buscarChat(m[1])));
    if((m = /^\/?(?:personaje|ficha) de (paulina|negro)\s*:\s*([\s\S]+)$/i.exec(t))){
      const q = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), P = this.config.personajes || (this.config.personajes = {});
      const ficha = m[2].replace(/[╔═╗╚╝║]+/g, ' ').replace(/\bolvidar\s*$/i, '').replace(/\s+/g, ' ').trim().slice(0, 1500);
      const nom = (/nombre\s*:\s*([^.\n]+?)(?:\s+edad\s*:|\.|$)/i.exec(ficha) || [])[1];
      P[q] = { ...(P[q] || {}), ficha, ...(nom ? { nombre: nom.trim().slice(0, 40) } : {}) };
      this.guardar(); return this.avisar(`Listo: ${q} juega como ${P[q].nombre || q}.`);
    }
    if((m = /^\/?marca de (paulina|negro)\s*:\s*(.+)$/i.exec(t))){
      const q = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), P = this.config.personajes || (this.config.personajes = {});
      P[q] = { ...(P[q] || {}), marca: m[2].trim().slice(0, 30) }; this.guardar();
      return this.avisar(`Lo que dice ${P[q].nombre || q} sale como «${P[q].marca} …».`);
    }
    /* ── programados y publicaciones ── */
    if(/^\/?(programados|programadas|publicaciones|que tienes programado)$/.test(s)) return this.avisar(this.textoProgramados());
    if((m = /^\/?(?:quita|borra|elimina) (?:el )?programad[oa] (\d+)$/.exec(s))){
      const ps = this.config.programados || [], p = ps.filter(x => x.origen !== 'horario')[+m[1] - 1];
      if(!p) return this.avisar(`No tengo el programado ${m[1]}. «programados» para verlos.`);
      ps.splice(ps.indexOf(p), 1); this.guardar();
      return this.avisar(`Quitado: ${this.nombreDe(p.chat)} a las ${p.hora}.`);
    }
    if((m = /^\/?(?:quita|borra|elimina) (?:la )?publicacion (\d+)$/.exec(s))){
      const ps = this.config.publicar || [], p = ps[+m[1] - 1];
      if(!p) return this.avisar(`No tengo la publicación ${m[1]}.`);
      ps.splice(+m[1] - 1, 1); this.guardar();
      return this.avisar(`Quitada la publicación de ${this.nombreDe(p.chat)}.`);
    }
    /* «horario 3.1 en Tareas» · «pon el horario en Tareas» · «quita el horario de Tareas» */
    if((m = /^\/?(?:quita|borra|apaga) (?:el )?horario (?:de |del |en )(.+)$/.exec(s))){
      const j = this.buscarChat(m[1]); if(!j) return this.avisar(`No tengo a «${m[1]}» en tus chats.`);
      const n = this.quitarHorario(j); this.guardar();
      return this.avisar(n ? `Quitado el horario de ${this.nombreDe(j)} (${n} avisos).` : `En ${this.nombreDe(j)} no había horario.`);
    }
    if((m = /^\/?(?:pon(?:me)?|carga|programa)? ?(?:el )?horario(?: de clases)?(?: (?:del |de )?([\w.\-° ]+?))? (?:en|al|a) (?:el (?:grupo )?)?(.+)$/.exec(s))){
      const clave = cualHorario(m[1] || '');
      const j = this.buscarChat(m[2]);
      if(!j) return this.avisar(`No tengo a «${m[2]}» en tus chats.`);
      if(!HORARIOS[clave]) return this.avisar(`No tengo ese horario. Tengo: ${Object.keys(HORARIOS).join(', ')}.`);
      const n = this.ponerHorario(j, clave); this.guardar();
      return this.avisar(`📚 Listo: en ${this.nombreDe(j)} aviso qué clase toca (y cuál sigue) a cada hora, de lunes a viernes, con el horario del ${HORARIOS[clave].nombre}. Son ${n} avisos.\n«quita el horario de ${this.nombreDe(j)}» lo apaga.`);
    }
    /* «programa Tareas 7:00 lunes a viernes: toca Matemáticas» */
    if((m = /^\/?programa(?:r)? (?:en |a )?(.+?) (?:a las )?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?: ([^:]+?))?\s*:\s*([\s\S]+)$/i.exec(t))){
      const h = this.aplicar({ accion: 'programar', chat: m[1], hora: m[2], dias: m[3] || '', texto: m[4] });
      this.guardar();
      return this.avisar(h || `No tengo a «${m[1]}» en tus chats, o la hora no se entiende.`);
    }
    if((m = /^\/?publica (?:ahora|ya) en (.+)$/.exec(s))){
      const j = this.buscarChat(m[1]);
      if(!j) return this.avisar(`No tengo a «${m[1]}» en tus chats.`);
      const ps = (this.config.publicar || []).filter(p => p.chat === j);
      if(!ps.length) return this.avisar(`En ${this.nombreDe(j)} no hay publicación programada. Ej.: «publica en ${this.nombreDe(j)} 3 fotos de la carpeta All's fashion diario a las 10».`);
      let tot = 0, err = '';
      for(const p of ps){ const r = await this.publicarAhora(p); tot += r.n || 0; if(r.error) err = r.error; }
      return this.avisar(tot ? `📷 Listo: publiqué ${tot} foto(s) en ${this.nombreDe(j)}.` : `No pude publicar: ${err}`);
    }
    /* «fotos de sudaderas» → te las manda a ti · «mándale a Ana fotos de sudaderas» → a Ana */
    if((m = /^\/?(?:manda(?:le|les)?|envia(?:le|les)?|pasa(?:le|les)?) (?:a )?(.+?) (?:(\d+) )?(?:fotos?|imagenes?) (?:de |del |de la |de los |de las )?(.+)$/.exec(s))){
      const j = this.buscarChat(m[1]);
      if(!j) return this.avisar(`No tengo a «${m[1]}» en tus chats.`);
      return this.avisar(await this.fotosA(j, m[3], +m[2] || 4));
    }
    if((m = /^\/?(?:(?:mandame |pasame |ensename )?(?:fotos?|imagenes?) (?:de |del |de la |de los |de las )|busca (?:fotos? |imagenes? )?(?:de )?)(.+)$/.exec(s)) && this.banco){
      return this.avisar(await this.fotosA(this.destinoAvisos(), m[1], 5, true));
    }
    if((m = /^\/?(sin fotos|fotos no|no mandes fotos)(?: (?:a |en |con )?(.+))?$/.exec(s))){
      if(!m[2]){ this.config.fotos = { ...(this.config.fotos || {}), responder: false }; this.guardar(); return this.avisar('Listo: ya no contesto con fotos (salvo los chats que pongas con «fotos Ana»).'); }
      const j = this.buscarChat(m[2]); if(!j) return this.avisar(`No tengo a «${m[2]}» en tus chats.`);
      this.chat(j).fotos = false; this.guardar(); return this.avisar(`En ${this.nombreDe(j)} no mando fotos.`);
    }
    if((m = /^\/?(?:fotos si|con fotos|contesta con fotos|responde con fotos|fotos)(?: (?:a |en |con )?(.+))?$/.exec(s))){
      if(!m[1] || /^(todos|todas|a todos)$/.test(m[1])){ this.config.fotos = { ...(this.config.fotos || {}), responder: true }; this.guardar(); return this.avisar('Listo: si alguien pregunta por algo que está en tu banco de imágenes, le mando la foto (en chats de una persona; en grupos sólo donde digas «fotos Equipo»).'); }
      const j = this.buscarChat(m[1]); if(!j) return this.avisar(`No tengo a «${m[1]}» en tus chats.`);
      this.chat(j).fotos = true; this.guardar(); return this.avisar(`En ${this.nombreDe(j)} contesto con fotos del banco cuando vengan al caso.`);
    }
    /* llamadas por teléfono */
    if(/^\/?(?:llamame|llamada de prueba|prueba la llamada)$/.test(s)){
      if(!this.telefono.listas()) return this.avisar(this.textoSinLlamadas());
      const r = await this.telefono.llamar({ a: this.numeroDeCarlos(), texto: `Hola ${this.config.nombre}, soy ${this.deTurno()}. Así te voy a llamar cuando te llegue algo urgente.` });
      return this.avisar(r.bien ? '📞 Ya te estoy llamando.' : '📞 No pude llamarte: ' + r.error);
    }
    if((m = /^\/?(?:llamame|llamadas?)(?: (?:si|cuando) (?:es|sea|algo es|haya algo) urgente| si| prendidas?| activas?)?(?: al? ([+\d][\d\s-]{9,}))?$/.exec(s)) && !/^\/?llamame$/.test(s)){
      const L = this.config.llamar = Object.assign({ desde: '08:00', hasta: '23:00', tel: '' }, this.config.llamar || {}, { activo: true });
      if(m[1]) L.tel = m[1].replace(/\D/g, '');
      this.guardar();
      return this.avisar(this.telefono.listas()
        ? `📞 Listo: si te llega algo urgente te llamo al ${this.numeroDeCarlos()} (de ${L.desde} a ${L.hasta}, máximo una cada 20 min). «no me llames» lo apaga.`
        : 'Anotado: te llamaré cuando algo sea urgente. ' + this.textoSinLlamadas());
    }
    if(/^\/?(?:no me llames|ya no me llames|llamadas no|apaga (?:las )?llamadas)$/.test(s)){
      this.config.llamar = { ...(this.config.llamar || {}), activo: false }; this.guardar();
      return this.avisar('Listo, ya no te llamo. Te sigo avisando por aquí.');
    }
    /* aprobar / cambiar / tirar una propuesta: «3», «3 sí voy», «x3» */
    if((m = /^#?(\d+)(?:\s+([\s\S]+))?$/.exec(t))){
      const p = this.estado.propuestas.find(x => x.n === +m[1]);
      if(!p) return this.avisar(`No tengo la #${m[1]} (o ya caducó).`);
      /* «3 siempre» (o «3 siempre otro texto») en un saludo: lo manda y lo deja
         FIJO — desde mañana sale solo a su hora, con ese texto exacto */
      const siempre = /^siempre\b[:\s]*/i.exec(m[2] || '');
      const final = (siempre ? (m[2].slice(siempre[0].length) || p.texto) : (m[2] || p.texto)).trim();
      if(!final) return this.avisar(`La #${m[1]} no trae texto: escribe «${m[1]} lo que quieras decir».`);
      this.estado.propuestas = this.estado.propuestas.filter(x => x !== p); this.cerrarPendientesDe(p);
      await this.mandar(p.chat, final);
      let extra = '';
      if(p.fotos && p.fotos.length){
        try{ const fs = await this.banco.fichas(); const n = await this.mandarFotos(p.chat, p.fotos.map(id => fs.find(f => f.id === id)).filter(Boolean)); if(n) extra += `\n📷 y ${n} foto(s)`; }
        catch(e){ extra += `\n(las fotos no salieron: ${e.message})`; }
      }
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
    /* sólo negocio (6 nov): «modo completo» lo regresa todo; «solo negocio» lo vuelve a dejar en lo del negocio;
       «negocio Fulano» marca un chat como de negocio para que sí lo atienda */
    if(/^\/?(?:modo\s+)?(?:solo|sólo)\s+negocio$/.test(s)){ this.config.soloNegocio = true; this.guardar(); return this.avisar('🤖 Listo: sólo negocio. Ya no contesto tus chats personales, ni propongo, ni saludo, ni contesto llamadas. Sigo con la campaña, All\'s e Instagram/Facebook del negocio. «modo completo» lo regresa todo.'); }
    if(/^\/?modo\s+completo$/.test(s)){ this.config.soloNegocio = false; this.guardar(); return this.avisar('🤖 Listo: regresé a hacer todo (chats, propuestas, saludos y llamadas como antes). «solo negocio» lo vuelve a limitar.'); }
    if((m = /^\/?negocio\s+(.+)$/.exec(s))){ const j = this.buscarChat(m[1]); if(!j) return this.avisar('🤖 No encontré ese chat.'); const c = this.chat(j); c.etiquetas = [...new Set([...(c.etiquetas || []), 'negocio'])]; this.guardar(); return this.avisar(`🤖 ${this.nombreDe(j)} ya cuenta como negocio: ahí sí atiendo.`); }
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
    /* precios: «precios:» y un renglón por cosa · «precios» los enseña · «borra precios» */
    if((m = /^\/?(?:precios|lista de precios)\s*:\s*([\s\S]+)$/i.exec(t))){
      const L = leerPrecios(m[1]); if(!L.length) return this.avisar('No le entendí a la lista. Un renglón por cosa: «sudadera negra - $450».');
      const h = this.aplicar({ accion: 'precios', lista: L }); this.guardar();
      return this.avisar(h + ':\n' + L.map(textoPrecio).join('\n') + '\nSólo digo esos; si me preguntan otro, te lo paso.');
    }
    if(/^\/?(precios|lista de precios)$/.test(s)){ const P = this.config.precios || []; return this.avisar(P.length ? 'Los precios que digo:\n' + P.map(textoPrecio).join('\n') + '\n→ «borra precios» los quita todos' : 'No tengo precios. Mándamelos así:\nprecios:\nsudadera negra - $450\ntermo - $350'); }
    if(/^\/?borra (los )?precios$/.test(s)){ this.config.precios = []; this.guardar(); return this.avisar('Borré todos los precios. Si me preguntan uno, te lo paso.'); }
    /* prohibidos: «prohibidos» los enseña · «quita prohibido 2» (para agregar, en palabras: «no digas nada de mi novia») */
    if(/^\/?(prohibidos|que no digo|lo prohibido)$/.test(s)){ const P = this.config.prohibidos || []; return this.avisar(P.length ? 'Lo que nunca digo:\n' + P.map(x => `${x.n}. ${x.texto}${x.palabras.length ? ' (' + x.palabras.join(', ') + ')' : ''}`).join('\n') + '\n→ «quita prohibido 2»' : 'No me has prohibido nada. Dímelo normal: «no digas nada de mi novia en ningún chat».'); }
    if((m = /^\/?quita (?:el )?prohibido\s+(\d+)$/.exec(s))){ const h = this.aplicar({ accion: 'quitarProhibido', n: +m[1] }); this.guardar(); return this.avisar(h || `No tengo el prohibido ${m[1]}.`); }
    /* hacerse pasar por él: «modo yo» / «modo asistente» (en todos) · «modo yo con Ana» (en uno) */
    if((m = /^\/?(?:modo (yo|asistente)|(hazte pasar por mi|ya no te hagas pasar por mi))(?: (?:con|en) (.+))?$/.exec(s))){
      const si = m[1] ? m[1] === 'yo' : !/^ya no/.test(m[2]);
      const h = this.aplicar({ accion: 'imitar', si, chat: m[3] || '' }); this.guardar();
      return this.avisar(h || `No tengo a «${m[3]}» en tus chats.`);
    }
    /* lo demás se lo pasa a la IA, que lo convierte en cambios de configuración */
    return this.ordenLibre(t);
  }

  /* «pregúntale a Ana si viene», «dile a Beto que ya llegué», «mándale un audio a Ana»:
     se manda AL MOMENTO y, si era pregunta, lo que conteste le llega a Carlos */
  async encargo(a){
    const j = a.chat ? (this.config.chats[a.chat] ? a.chat : this.buscarChat(a.chat)) : null;
    const texto = String(a.texto || '').trim();
    /* «mándame un audio…»: la IA a veces se lo manda a «Carlos» como si fuera otro contacto: es para él */
    const aEl = !j && /^(carlos|yo|a mi|mi|jefe|el jefe|palomazi|eduardo)$/.test(sinAcentos(a.chat || '').replace(/[^a-z ]/g, '').trim());
    if(aEl || (j && this.esMiChat(j))){ if(!texto) return ''; await this.avisar(texto); if(a.audio) await this.avisarVoz(texto); return ''; }
    if(!j) return `✗ No tengo a «${a.chat}» en tus chats: no le mandé nada.`;
    if(!texto) return '';
    try{
      if(a.audio) await this.mandarAudio(j, texto);
      else { const f = this.firmaDe(j); await this.mandar(j, f ? f + ' ' + texto : texto); }
    }catch(e){ return `✗ No pude mandarle a ${this.nombreDe(j)}: ${e.message}`; }
    if(a.esperar !== false){ (this.estado.encargos || (this.estado.encargos = [])).push({ chat: j, para: String(a.para || texto).slice(0, 200), t: this.reloj() }); this.estado.encargos = this.estado.encargos.slice(-50); }
    return `${a.audio ? '🎤 Le mandé audio' : 'Le escribí'} a ${this.nombreDe(j)}: «${texto.slice(0, 200)}»${a.esperar !== false ? ' — cuando conteste, te lo paso' : ''}`;
  }
  /* «sí mándalo», «sí pero más tranquilo», «a Ana dile que mañana»: la IA ya escribió el texto final */
  async responderPropuesta(a){
    const p = this.estado.propuestas.find(x => x.n === +a.n); const texto = String(a.texto || '').trim();
    if(!p) return `✗ No tengo la #${a.n} (o ya caducó).`;
    if(!texto) return '';
    if(p.tipo === 'saludo'){ /* los saludos se mandan igual que una respuesta */ }
    /* si lo que aprobó va con sus palabras, en primera persona («sí voy»), son SUYAS: sin firma de
       asistente, que «Asistente de Carlos: sí voy» no tiene pies ni cabeza */
    const f = this.firmaDe(p.chat), final = !this.imitaEn(p.chat) && !enPrimeraPersona(texto, this.config.nombre) ? this.firmar(f, texto) : texto;
    try{ await this.mandar(p.chat, final); }catch(e){ return `✗ No pude mandarle a ${p.nombre}: ${e.message}`; }
    this.estado.propuestas = this.estado.propuestas.filter(x => x !== p); this.cerrarPendientesDe(p);
    this.bitacora(p.chat, p.nombre, [{ texto: p.dijo || '' }], 'contesto', texto, 'lo aprobaste en palabras normales');
    return `A ${p.nombre}: «${texto.slice(0, 300)}»`;
  }
  /* «la sudadera café va en 1200, talla M, True Religion»: se guarda en las notas de esa foto del banco */
  async ponerVenta(a){
    if(!this.banco || !this.banco.cambiar) return '✗ No tengo el banco de imágenes conectado.';
    let fs; try{ fs = await this.banco.fichas(); }catch(e){ return '✗ No pude leer el banco: ' + e.message; }
    const f = buscarFotos(fs, String(a.buscar || ''), { carpeta: a.carpeta || '', n: 1 })[0];
    if(!f) return `✗ No encontré en el banco «${a.buscar}».`;
    const prod = (this.config.productos || []).find(p => p.fotoId === f.id) || null;
    const d = datosVenta(f, prod);
    const precio = +a.precio > 0 ? Math.round(+a.precio) : d.precio, tallas = Array.isArray(a.tallas) && a.tallas.length ? a.tallas.map(x => String(x).toUpperCase()) : d.tallas, marca = a.marca || d.marca;
    const costo = (/costo\s*\$?\s*\d[\d,]*/i.exec(f.notas || '') || [''])[0];
    const notas = [costo, precio ? `venta $${precio}` : '', tallas.length ? 'tallas ' + tallas.join(', ') : '', marca ? 'marca ' + marca : ''].filter(Boolean).join(' · ');
    try{ await this.banco.cambiar(f.id, { notas }); }catch(e){ return '✗ No pude guardarlo en el banco: ' + e.message; }
    if(prod){ if(precio) prod.precio = precio; prod.tallas = tallas; if(marca) prod.marca = marca; }
    return `${nombreFoto(f)}: ${pieVenta({ ...f, notas }, null).replace(/\*/g, '').replace('\n', ' · ')}`;
  }
  async ordenLibre(texto){
    let r;
    let carpetas = [];
    if(this.banco && (this.banco.listo ? this.banco.listo() : true)){ try{ carpetas = [...new Set((await this.banco.fichas()).map(f => f.carpeta).filter(Boolean))].slice(0, 60); }catch{} }
    const propuestas = this.estado.propuestas.slice(-10).map(p => ({ n: p.n, a: p.nombre, dijo: p.dijo, propuesta: p.texto, motivo: p.motivo, voz: this.imitaEn(p.chat) ? 'como Carlos, en primera persona' : 'como su asistente: de Carlos en tercera persona ("Carlos dice que sí va")' }));
    /* «qué nos ha dicho la tía Rosa»: lo que dijo la gente que nombra va en la orden (4 nov) */
    const t0 = sinAcentos(texto), mencion = [];
    for(const [j, c] of Object.entries(this.config.chats)){
      if(!c.nombre || !(this.estado.historial[j] || []).length) continue;
      const ws = sinAcentos(c.nombre).replace(/[^a-z0-9ñ ]+/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !/^(grupo|clientas|fashion|taller)$/.test(w));
      if(t0.includes(sinAcentos(c.nombre)) || ws.some(w => new RegExp('\\b' + w + '\\b').test(t0))) mencion.push(j);
    }
    const historiales = mencion.slice(0, 3).map(j => ({ chat: this.nombreDe(j), ultimos: (this.estado.historial[j] || []).slice(-15).map(x => `${x.secre ? 'Tú (asistente)' : x.de === 'yo' ? 'Carlos' : (x.quien || this.nombreDe(j))} (${horaMx(x.t)}): ${x.texto}`) }));
    try{ r = await this.ia.orden({ historiales, propuestas, conocimiento: this.conocimiento || '', carpetas, quien: this.deTurno(), texto, ahora: this.reloj(), hoy: fechaMx(this.reloj()), hora: horaMx(this.reloj()), chats: Object.entries(this.config.chats).filter(([, c]) => c.nombre).map(([j, c]) => ({ id: j, nombre: c.nombre, modo: c.modo || '', etiquetas: c.etiquetas || [] })), config: this.resumenConfig() }); }
    catch(e){ return this.avisar('No te entendí (y la IA no contestó). Escribe «ayuda» para ver lo que sé hacer.'); }
    const hechos = [];
    /* Carlos, 5 nov: le dijo «no respondas este chat» y la IA APAGÓ LA CAMPAÑA. Lo que mueve la campaña o el
       mayoreo desde una orden libre tiene que nombrarlos; si no, se descarta y se le dice */
    const nombra = { campana: /campa(n|ñ)a|prospect|negocios/i, mayoreo: /mayoreo|proveedor/i };
    const descartadas = [];
    if(r && Array.isArray(r.acciones)) r.acciones = r.acciones.filter(a => { const re = a && nombra[a.accion]; if(re && !re.test(texto)){ descartadas.push(a.accion); return false; } return true; });
    for(const a of (r && r.acciones) || []){ const h = a && a.accion === 'mensaje' ? await this.encargo(a) : a && a.accion === 'responder' ? await this.responderPropuesta(a) : a && a.accion === 'venta' ? await this.ponerVenta(a) : this.aplicar(a); if(h) hechos.push(h); }
    this.guardar();
    const dice = (r && r.respuesta) || '';
    const aviso = descartadas.length ? `(No toqué ${descartadas.map(x => x === 'campana' ? 'la campaña' : 'el mayoreo').join(' ni ')}: no la nombraste. Si sí querías, dímelo con su nombre.)` : '';
    const todo = [dice, ...hechos.map(h => '✓ ' + h), aviso].filter(Boolean).join('\n') || 'No te entendí. Escribe «ayuda».';
    await this.avisar(todo);
    /* «mándame un audio», «dímelo en voz»: además del escrito, la nota de voz (si no la está capturando ya «… en audio») */
    if(r && r.audio && !this.captura) await this.avisarVoz(dice || todo);
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
      case 'elenco': {
        const j = chatDe(a.chat); if(!j) return '';
        this.chat(j).elenco = (Array.isArray(a.quienes) ? a.quienes : []).filter(q => (this.config.personajes || {})[q]);
        return this.textoElenco(j);
      }
      case 'personaje': {
        const q = a.quien, P = this.config.personajes || (this.config.personajes = {});
        if(!['Paulina', 'Negro'].includes(q)) return '';
        P[q] = { ...(P[q] || {}), ...(a.nombre !== undefined ? { nombre: String(a.nombre).slice(0, 40) } : {}), ...(a.marca !== undefined ? { marca: String(a.marca).slice(0, 30) } : {}), ...(a.ficha !== undefined ? { ficha: String(a.ficha).slice(0, 1500) } : {}) };
        return `${q} juega como ${P[q].nombre}`;
      }
      case 'horario': {
        const j = chatDe(a.chat); const clave = cualHorario(a.cual || '');
        if(!j || !HORARIOS[clave]) return '';
        if(a.quitar){ const n = this.quitarHorario(j); return n ? `Quitado el horario de ${this.nombreDe(j)}` : ''; }
        return `📚 Horario del ${HORARIOS[clave].nombre} en ${this.nombreDe(j)} (${this.ponerHorario(j, clave)} avisos)`;
      }
      case 'programar': {
        const j = chatDe(a.chat); const hora = horaDe(a.hora);
        if(!j || !hora || !(a.texto || a.tema)) return '';
        const ps = this.config.programados || (this.config.programados = []);
        const dias = Array.isArray(a.dias) ? a.dias.map(Number).filter(d => d >= 0 && d <= 6) : diasDe(a.dias);
        const p = { id: 'p' + Math.round(this.reloj() / 1000).toString(36) + ps.length + Math.floor(this.azar() * 1000), chat: j, hora, dias, texto: String(a.texto || '').slice(0, 1500), tema: String(a.tema || '').slice(0, 400), ...(a.sinFirma ? { sinFirma: true } : {}) };
        ps.push(p);
        return `⏰ A ${this.nombreDe(j)} a las ${hora} ${textoDias(dias)}: ${p.texto ? '«' + p.texto.slice(0, 60) + '»' : 'sobre ' + p.tema}`;
      }
      case 'quitarProgramado': { const ps = this.config.programados || [], i = ps.findIndex(p => p.id === a.id); if(i < 0) return ''; ps.splice(i, 1); return 'Quitado el programado'; }
      case 'publicar': {
        const j = chatDe(a.chat); const hora = horaDe(a.hora);
        if(!j || !hora || !(a.carpeta || a.buscar)) return '';
        const us = this.config.publicar || (this.config.publicar = []);
        const dias = Array.isArray(a.dias) ? a.dias.map(Number).filter(d => d >= 0 && d <= 6) : diasDe(a.dias);
        const p = { id: 'u' + Math.round(this.reloj() / 1000).toString(36) + us.length + Math.floor(this.azar() * 1000), chat: j, hora, dias, carpeta: String(a.carpeta || '').slice(0, 80), buscar: String(a.buscar || '').slice(0, 200), cuantas: Math.max(1, Math.min(10, +a.cuantas || 3)), intro: String(a.intro || '').slice(0, 600) };
        us.push(p);
        return `📷 En ${this.nombreDe(j)} a las ${hora} ${textoDias(dias)}: ${p.cuantas} foto(s)${p.carpeta ? ' de «' + p.carpeta + '»' : ''}${p.buscar ? ' de ' + p.buscar : ''}, con su nombre`;
      }
      case 'quitarPublicacion': { const us = this.config.publicar || [], i = us.findIndex(p => p.id === a.id); if(i < 0) return ''; us.splice(i, 1); return 'Quitada la publicación'; }
      case 'fotos': {
        if(!a.chat){ this.config.fotos = { ...(this.config.fotos || {}), responder: a.si !== false, ...(a.carpeta !== undefined ? { carpeta: String(a.carpeta || '') } : {}) }; return a.si === false ? 'No contesto con fotos' : 'Contesto con fotos del banco cuando vengan al caso'; }
        const j = chatDe(a.chat); if(!j) return '';
        this.chat(j).fotos = a.si !== false; return `${this.nombreDe(j)}: ${a.si === false ? 'sin fotos' : 'con fotos'}`;
      }
      case 'llamar': {
        const L = this.config.llamar = Object.assign({ activo: false, tel: '', desde: '08:00', hasta: '23:00' }, this.config.llamar || {});
        if(a.activo !== undefined) L.activo = !!a.activo;
        if(a.tel !== undefined) L.tel = String(a.tel || '').replace(/\D/g, '').slice(0, 15);
        if(aMin(a.desde) != null) L.desde = a.desde; if(aMin(a.hasta) != null) L.hasta = a.hasta;
        return L.activo ? `Te llamo si algo es urgente (${L.desde}–${L.hasta})` : 'No te llamo';
      }
      case 'voz': { if(!/^[A-Z][a-z]+$/.test(a.voz || '')) return ''; this.config.voz = a.voz; return `Voz de los audios: ${a.voz}`; }
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
      case 'mayoreo': {
        const M = this.config.mayoreo = Object.assign({}, MAYOREO_BASE, this.config.mayoreo || {});
        if(a.tanda !== undefined && +a.tanda >= 1) M.tanda = Math.min(500, Math.round(+a.tanda));
        if(a.historial){ M.historico = true; this.estado.histMayoreo = null; }
        if(a.fuente){ const j = chatDe(a.fuente); if(j) M.fuente = j; else { M.fuente = ''; M.fuenteNombre = a.fuente; } }
        if(a.destino){ const j = chatDe(a.destino); if(j){ M.destino = j; this.chat(j).tienda = true; if(!this.chat(j).modo) this.chat(j).modo = 'auto'; } else { M.destino = ''; M.destinoNombre = a.destino; } }
        if(a.margen !== undefined && +a.margen >= 0 && +a.margen <= 5000){ M.margen = Math.round(+a.margen); for(const p of this.config.productos || []) if(p.costo) p.precio = precioVenta(p.costo, M.margen); }
        if(a.activo !== undefined) M.activo = !!a.activo;
        return M.activo && M.fuente && M.destino ? `Las fotos de ${this.nombreDe(M.fuente)} se suben al banco y se mandan solas a ${this.nombreDe(M.destino)}, sin texto. Precio de venta = costo + $${M.margen}` : 'Mayoreo: ' + (M.activo ? 'falta decirme de qué grupo a qué grupo' : 'apagado');
      }
      case 'campana': {
        const C = this.config.campana = Object.assign({}, CAMPANA_BASE, this.config.campana || {});
        if(a.activo !== undefined) C.activo = !!a.activo;
        if(+a.porDia > 0) C.porDia = Math.min(60, Math.round(+a.porDia));
        return C.activo ? `Campaña prendida: ${C.porDia} negocios al día, de ${C.desde} a ${C.hasta}` : 'Campaña apagada: ya no les escribo a negocios nuevos';
      }
      case 'tienda': { const j = chatDe(a.chat); if(!j) return ''; const c = this.chat(j); c.tienda = a.si !== false; if(c.tienda && !c.modo) c.modo = 'auto'; return c.tienda ? `En ${this.nombreDe(j)} contesto precios y tallas a las clientas` : `En ${this.nombreDe(j)} ya no contesto como tienda`; }
      case 'tirar': { const antes = this.estado.propuestas.length; this.estado.propuestas = this.estado.propuestas.filter(p => p.n !== +a.n); return antes === this.estado.propuestas.length ? '' : `Tirada la #${a.n}: no le digo nada`; }
      case 'llamarme': { const L = this.config.llamar = Object.assign({ activo: false, tel: '', desde: '08:00', hasta: '23:00' }, this.config.llamar || {}); L.activo = a.activo !== false; return L.activo ? 'Te marco cuando algo importante necesite tu decisión' : 'Ya no te marco'; }
      case 'imitar': {
        if(a.chat){ const j = chatDe(a.chat); if(!j) return ''; this.chat(j).imitar = a.si !== false; return a.si !== false ? `Con ${this.nombreDe(j)} me hago pasar por ti (sin firma)` : `Con ${this.nombreDe(j)} hablo como tu asistente`; }
        this.config.imitar = a.si !== false;
        for(const c of Object.values(this.config.chats)) delete c.imitar;
        return this.config.imitar ? 'Me hago pasar por ti en todos los chats: escribo como tú y sin firma' : `Hablo como tu asistente en todos los chats, firmado «${this.confAuto().firma}»`;
      }
      case 'prohibir': {
        const t = String(a.texto || '').trim(); if(!t) return '';
        const P = this.config.prohibidos || (this.config.prohibidos = []);
        const n = P.reduce((m, x) => Math.max(m, x.n), 0) + 1;
        const palabras = (Array.isArray(a.palabras) ? a.palabras : []).map(String).map(x => x.trim()).filter(Boolean).slice(0, 20);
        P.push({ n, texto: t.slice(0, 300), palabras });
        return `Prohibido ${n}: «${t}»${palabras.length ? ` (si sale ${palabras.map(x => '«' + x + '»').join(', ')}, no lo mando y te pregunto)` : ''}`;
      }
      case 'quitarProhibido': { const P = this.config.prohibidos || [], i = P.findIndex(x => x.n === +a.n); if(i < 0) return ''; const [x] = P.splice(i, 1); return `Ya puedo: «${x.texto}»`; }
      case 'precios': {
        const nuevos = (Array.isArray(a.lista) ? a.lista : []).map(x => ({ nombre: String(x.nombre || '').trim().slice(0, 80), precio: Number(x.precio), nota: String(x.nota || '').slice(0, 120) })).filter(x => x.nombre && Number.isFinite(x.precio) && x.precio > 0);
        if(!nuevos.length) return '';
        let P = a.reemplazar ? [] : (this.config.precios || []);
        for(const x of nuevos){ P = P.filter(y => sinAcentos(y.nombre) !== sinAcentos(x.nombre)); P.push(x); }
        this.config.precios = P.slice(-300);
        return `Precios: ${nuevos.length} guardado(s), ${this.config.precios.length} en total`;
      }
      case 'quitarPrecio': { const antes = (this.config.precios || []).length; this.config.precios = (this.config.precios || []).filter(x => sinAcentos(x.nombre) !== sinAcentos(a.nombre)); return antes === this.config.precios.length ? '' : `Quitado el precio de ${a.nombre}`; }
      case 'dato': { const d = this.agregarDato(a.texto, a.hasta); return d ? `Lo tengo (dato ${d.n})${d.hasta ? ', hasta el ' + fechaMx(d.hasta - 1) : ''}` : ''; }
      case 'olvidaDato': { const antes = (this.config.datos || []).length; this.config.datos = (this.config.datos || []).filter(d => d.n !== +a.n); return antes === this.config.datos.length ? '' : `Olvidado el dato ${a.n}`; }
      default: return '';
    }
  }

  resumenConfig(){
    const c = this.config;
    return { porDefecto: c.porDefecto, grupos: c.grupos, resumen: c.resumen, pausaHasta: c.pausaHasta ? horaMx(c.pausaHasta) : '',
      saludos: c.saludos.map(s => ({ chat: this.nombreDe(s.chat), manana: s.manana, noche: s.noche })),
      reglas: c.reglas.map(r => ({ id: r.id, modo: r.modo, palabras: r.palabras, etiquetas: r.etiquetas, chats: (r.chats || []).map(j => this.nombreDe(j)), de: r.de, a: r.a, hasta: r.hasta ? fechaMx(r.hasta - 1) : '' })),
      programados: (c.programados || []).map(p => ({ id: p.id, chat: this.nombreDe(p.chat), hora: p.hora, dias: p.dias, texto: p.texto, tema: p.tema })),
      publicar: (c.publicar || []).map(p => ({ id: p.id, chat: this.nombreDe(p.chat), hora: p.hora, dias: p.dias, carpeta: p.carpeta, buscar: p.buscar, cuantas: p.cuantas })) };
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
· «pregúntale a Beto si va el sábado» se lo pregunto YA y cuando conteste te lo paso · «mándale un audio a Ana diciendo que ya voy»
· «modo asistente» hablo como tu asistente, con firma (de fábrica) · «modo yo» me hago pasar por ti, sin firma · «modo yo con Ana» sólo en ese chat
· «no digas nada de mi novia en ningún chat» y nunca lo digo · «prohibidos» · «quita prohibido 2»
· «precios:» y un renglón por cosa («sudadera negra - $450») · «precios» · «borra precios». Un precio que no esté ahí no lo digo
· nunca te echo la culpa ni te comprometo: si lo que iba a decir lo hace, no lo mando y te pregunto
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
· «resumen» o «qué me llegó» todo lo que te escribieron y qué contesté, lo importante arriba («resumen de hoy», «… de ayer»)
· «audio Ana: ya voy» le mando una nota de voz · «3 audio» manda la propuesta 3 en audio · «pendientes en audio» te lo digo en voz
· me puedes mandar notas de voz: las oigo y las hago orden
· «llámame si es urgente» te llamo por teléfono cuando algo urja · «llámame» prueba · «no me llames»
· «Paulina y Negro juegan en Taberna» (Astrael y Nox Veyr, cada una con su personaje) · «saca a Negro de Taberna» · «elenco Taberna» · «personaje de Paulina: …» · «marca de Negro: 🌑-»
· «horario 3.1 en Tareas» aviso en el grupo qué clase toca y cuál sigue, cada hora · «quita el horario de Tareas»
· «programa Tareas 7:00 lunes a viernes: toca Matemáticas» sale solo a esa hora · «programados» · «quita programado 2»
  (o en palabras: «en Tareas avisa cada hora qué clase toca: lunes 7:00 Mate, 7:50 Física…»)
· «fotos de sudaderas» te las mando · «mándale a Ana fotos de termos» · «publica en All's 3 fotos de la carpeta All's fashion diario a las 10» · «publica ahora en All's»
· si alguien pregunta por algo que está en tu banco, le mando la foto · «sin fotos Equipo» · «fotos Equipo»
· «estado» · «chats»
Y en palabras normales, por ejemplo:
· «a Ana dale buenos días a las 7 y buenas noches a las 10:30»
· «esta semana no le propongas nada a nadie de la escuela»
· «Ana es de la escuela» · «Beto es mi primo, háblale con confianza»
· «con mi mamá no me propongas nada»`;
