/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · LA OFICINA (lo que pasa con cada mensaje)
   ───────────────────────────────────────────────────────────────────────────
   Aparte del Worker para poder probarla sin Cloudflare: recibe un almacén
   (get/put/list) y las funciones de afuera (enviar, pensar). El orden:

     1. ¿es un chat personal del dueño? → no se toca
     2. ¿ya lo atendimos? (Meta a veces repite el aviso) → se ignora
     3. ¿el dueño está contestando él mismo en ese chat? → callados
     4. ¿pasó del tope de mensajes por hora? → callados y se le avisa
     5. REFLEJO: respuesta ya hecha si la hay
     6. CEREBRO: la IA, con la cotización si ya hay datos; queda en el manual
     7. si hace falta el dueño → aviso (y llamada, cuando se conecte)
   ═══════════════════════════════════════════════════════════════════════════ */
import { reflejo, llenar } from './reflejo.js';
import { cotizar } from './cotizador.js';
import { estimarM2, MEDIDAS } from './medidor.js';
import { pesos } from './cerebro.js';
import { cotizacionDelBot } from './cotizacion.js';

const URL_COTIZACION = 'https://mazi-central.palomazi9111.workers.dev/urban-pest/cotizacion/?c=';

const TOPE_HORA = 20;
const DUENO_CALLA_MS = 30 * 60 * 1000;
const ahora = () => Date.now();

export class Oficina {
  constructor({ almacen, env = {}, enviar, pensar, reloj = ahora }){
    Object.assign(this, { A: almacen, env, enviar, pensar, reloj });
  }

  async config(){
    return {
      negocio: (await this.A.get('negocio')) || { nombre: 'Urban Pest', descripcion: '' },
      casos: (await this.A.get('casos')) || [],
      tarifas: (await this.A.get('tarifas')) || null,
      medidas: (await this.A.get('medidas')) || null,
      personales: new Set((await this.A.get('personales')) || []),
    };
  }

  /** `op.tarifas` sólo para el canal de prueba: tarifas de ejemplo sin tocar las guardadas. */
  async atender(m, op = {}){
    const k = `conv:${m.canal}:${m.chat}`;
    const cfg = await this.config();
    if(op.tarifas && !cfg.tarifas) cfg.tarifas = op.tarifas;
    if(cfg.personales.has(m.chat)) return { hecho: 'personal' };
    if(await this.A.get('visto:' + m.id)) return { hecho: 'repetido' };
    await this.A.put('visto:' + m.id, 1);

    const conv = (await this.A.get(k)) || { canal: m.canal, chat: m.chat, nombre: m.nombre, mensajes: [], datos: {}, estado: 'abierta' };
    if(m.nombre && !conv.nombre) conv.nombre = m.nombre;
    conv.mensajes.push({ de: 'cliente', texto: m.texto ?? `(mandó ${m.tipo || 'algo que no es texto'})`, cuando: m.cuando || this.reloj(), ...(m.quien ? { quien: m.quien } : {}) });
    conv.ultimo = this.reloj();
    const guarda = () => this.A.put(k, conv);

    if(conv.duenoHasta && conv.duenoHasta > this.reloj()){ await guarda(); return { hecho: 'dueno-contesta' }; }
    const hora = this.reloj() - 3600e3;
    if(conv.mensajes.filter(x => x.de === 'negocio' && x.cuando > hora).length >= TOPE_HORA){
      await guarda(); await this.aviso(conv, 'Pasó el tope de mensajes por hora en este chat; el bot se calló.'); return { hecho: 'tope' };
    }
    if(m.texto == null){
      await guarda(); await this.aviso(conv, `Mandó ${m.tipo || 'un archivo'}: revísalo tú.`); return { hecho: 'no-texto' };
    }

    /* 5 · REFLEJO */
    const r = reflejo(m.texto, cfg.casos);
    if(r){
      const texto = llenar(r.caso.respuesta, conv.datos);
      await this.decir(conv, texto, { via: 'reflejo', caso: r.caso.id, confianza: r.confianza });
      if(r.caso.dueno) await this.aviso(conv, `Caso «${r.caso.id}»: necesita que lo veas tú.`);
      await guarda(); return { hecho: 'reflejo', caso: r.caso.id };
    }

    /* 6 · CEREBRO */
    let cot = cfg.tarifas ? this.cotiza(conv, cfg.tarifas, cfg.medidas) : null;
    let p = await this.pensar({ env: this.env, negocio: cfg.negocio, casos: cfg.casos, historial: conv.mensajes, cotizacion: cot });
    if(p.bien){
      conv.datos = mezclar(conv.datos, p.datos);
      const nueva = cfg.tarifas && !cot ? this.cotiza(conv, cfg.tarifas, cfg.medidas) : null;
      /* con lo que acaba de decir ya se puede cotizar: se le pregunta otra vez, ya con el precio */
      if(nueva){ cot = nueva; const p2 = await this.pensar({ env: this.env, negocio: cfg.negocio, casos: cfg.casos, historial: conv.mensajes, cotizacion: cot }); if(p2.bien) p = { ...p2, datos: p.datos }; }
    }
    if(!p.bien){
      await this.decir(conv, 'Gracias por escribir. En un momento te contesta el encargado.', { via: 'respaldo', error: p.error });
      await this.aviso(conv, 'La IA no pudo contestar: ' + p.error);
      await guarda(); return { hecho: 'respaldo' };
    }
    /* el precio lo pone el código, nunca la IA (12 nov: escribió «$X» al cliente) */
    const texto = ponerPrecio(p.respuesta, cot);
    if(!texto){
      await this.decir(conv, 'Gracias por escribir. En un momento te contesta el encargado.', { via: 'respaldo', error: 'La IA escribió un precio que el sistema no calculó: ' + p.respuesta.slice(0, 160) });
      await this.aviso(conv, 'La IA quiso dar un precio que no salió de las tarifas; revisa tú la conversación.');
      await guarda(); return { hecho: 'respaldo' };
    }
    await this.decir(conv, texto, { via: 'cerebro', razon: p.razon, modelo: p.modelo, cotizacion: cot || undefined });
    if(cot) conv.cotizacion = cot;
    /* La cotización por escrito (BRIEF §B): cuando el bot DIO un precio que el sistema calculó, manda el link
       a la hoja lista para guardar como PDF. Una por precio: si vuelve a preguntar lo mismo no se repite. */
    if(cot && cot.atiende === 'si' && texto.includes(pesos(cot.desde)) && conv.cotDoc?.precio !== cot.desde){
      const doc = await cotizacionDelBot(this.A, conv, cot, this.reloj());
      conv.cotDoc = { codigo: doc.codigo, precio: cot.desde };
      await this.decir(conv, `Te dejo tu cotización por escrito, por si la quieres guardar: ${this.env.URL_COTIZACION || URL_COTIZACION}${doc.codigo}`, { via: 'cotizacion', cotizacion: doc.codigo });
    }
    await this.A.put(`manual:${m.id}`, { pregunta: m.texto, respuesta: p.respuesta, razon: p.razon, canal: m.canal, chat: m.chat, cuando: this.reloj(), estado: 'por revisar' });
    if(p.necesita_dueno) await this.aviso(conv, p.motivo || 'La IA pide que lo veas tú.');
    else if(cot?.atiende === 'caso-por-caso') await this.aviso(conv, 'Casa grande fuera de la zona: decide si se atiende y cuánto cobrar de traslado.');
    await guarda(); return { hecho: 'cerebro', dueno: !!p.necesita_dueno };
  }

  cotiza(conv, tarifas, medidas){
    const d = conv.datos || {};
    if(d.km == null && d.zona) d.km = (tarifas.zonas || {})[normal(d.zona)] ?? null;
    /* sin la distancia de esa zona: los km típicos de SU Excel (la mediana de sus últimas cotizaciones),
       marcado como estimado. Sin esto el bot no daba precio a nadie que no estuviera en la lista de zonas. */
    let kmEstimado = false;
    if(d.km == null && tarifas.km_tipico > 0){ kmEstimado = true; }
    let m2 = d.m2, m2Estimado = false;
    /* si la IA no apuntó los metros pero el cliente sí los escribió («mide 2500 m2»), se toman de su mensaje */
    if(!(m2 > 0)) for(const msj of [...(conv.mensajes || [])].reverse().filter(x => x.de === 'cliente')){
      const r = String(msj.texto || '').match(/(\d[\d,\.]*)\s*(m2|m²|mts2?|metros(?:\s+cuadrados)?)/i);
      if(r){ const x = Number(r[1].replace(/,/g, '')); if(x > 0){ m2 = d.m2 = x; break; } }
    }
    /* no sabe los metros: se estiman con lo que contó (sólo casas; negocio e industria se visitan) */
    if(!(m2 > 0) && (d.tipo || 'casa') === 'casa'){
      const e = estimarM2(d, medidas || MEDIDAS);
      if(e.bien){ m2 = e.m2; m2Estimado = true; conv.estimacion = e; }
    }
    const c = cotizar({ plaga: d.plaga && normal(d.plaga), m2, m2Estimado, km: kmEstimado ? tarifas.km_tipico : d.km, kmEstimado, tipo: d.tipo || 'casa' }, tarifas);
    return c.bien ? c : null;
  }

  async decir(conv, texto, extra){
    /* Luis, 17 nov: «el bot no debe dar datos del ing». Lo que contesta el bot (reflejo o IA) pasa por aquí: si trae el
       teléfono o el nombre del dueño, NO sale; sale el aviso al encargado y al dueño le llega por qué. Lo que escribe
       el dueño desde su chat central (via «dueno») no se toca: es suyo. */
    if(extra?.via !== 'dueno' && extra?.via !== 'cotizacion' && !sinDatosDelDueno(texto, (await this.A.get('negocio')) || {}, this.env)){
      extra = { ...extra, tapado: String(texto).slice(0, 300) };
      texto = 'Claro, ya le aviso al encargado para que te contacte.';
      await this.aviso(conv, 'La respuesta del bot traía tus datos (nombre o teléfono) y se cambió por «ya le aviso al encargado».');
    }
    const r = await this.enviar(this.env, conv.canal, conv.chat, texto);
    conv.mensajes.push({ de: 'negocio', texto, cuando: this.reloj(), ...extra, ...(r.bien ? {} : { noSalio: r.error }) });
  }

  async aviso(conv, motivo){
    const id = `aviso:${this.reloj()}:${conv.canal}:${conv.chat}`;
    await this.A.put(id, { motivo, canal: conv.canal, chat: conv.chat, nombre: conv.nombre, cuando: this.reloj(), estado: 'nuevo' });
    /* Al dueño por WhatsApp. ⚠ Fuera de las 24 h desde que él le escribió al número del bot,
       WhatsApp sólo deja mandar PLANTILLAS aprobadas: hay que dar de alta una «aviso» al conectar. */
    /* El número sale de la variable DUENO_WA o, si no está, del negocio guardado (POST /api/negocio
       { negocio: { dueno_wa } }): así se pone sin desplegar. El cliente dio el suyo el 17 nov. */
    const dueno = this.env.DUENO_WA || ((await this.A.get('negocio')) || {}).dueno_wa;
    if(dueno) await this.enviar(this.env, 'whatsapp', dueno, `Urban Pest · ${conv.nombre || conv.chat} (${conv.canal}): ${motivo}`);
    /* La llamada (Carlos quiere habilitarla) entra aquí cuando se conecte el servicio de voz. */
  }

  /** El dueño contesta desde su chat central: sale por el mismo canal y el bot se calla un rato. */
  async contestaDueno(canal, chat, texto, quien){
    const k = `conv:${canal}:${chat}`, conv = await this.A.get(k);
    if(!conv) return { bien: false, error: 'No existe esa conversación.' };
    await this.decir(conv, texto, { via: 'dueno', ...(quien ? { quien } : {}) });
    conv.duenoHasta = this.reloj() + DUENO_CALLA_MS;
    await this.A.put(k, conv); return { bien: true };
  }
}

/** Cambia {precio} por la cantidad calculada. Regresa null si la respuesta trae un precio que no es el del sistema
    (un «$X» copiado del ejemplo, una cantidad inventada, o {precio} sin cotización). */
/** true si `texto` NO trae datos del dueño: su teléfono (DUENO_WA o negocio.dueno_wa, con o sin lada, con espacios o
    guiones) ni su nombre (negocio.dueno_nombre: el nombre completo o el apellido). Los datos viven en su servidor, no aquí. */
export function sinDatosDelDueno(texto, negocio = {}, env = {}){
  const tels = [env.DUENO_WA, negocio.dueno_wa].map(x => String(x || '').replace(/\D/g, '').slice(-10)).filter(x => x.length === 10);
  for(const m of String(texto || '').matchAll(/(?:\d[\s\-.()]*){7,}/g)){
    const d = m[0].replace(/\D/g, '');
    if(tels.some(t => d.includes(t) || d.endsWith(t.slice(-7)) || d === t.slice(-7))) return false;
  }
  const nombre = normal(negocio.dueno_nombre || '').replace(/\b(ing|lic|sr|don)\.?\s+/g, '').trim();
  if(nombre){
    const t = ' ' + normal(texto).replace(/[^a-z0-9ñ]+/g, ' ') + ' ', partes = nombre.split(/\s+/), apellido = partes.length > 1 ? partes.at(-1) : null;
    if(t.includes(' ' + partes.join(' ') + ' ') || (apellido && apellido.length >= 4 && t.includes(' ' + apellido + ' '))) return false;
  }
  return true;
}

export function ponerPrecio(texto, cot){
  const precio = cot ? pesos(cot.desde) : null;
  let t = String(texto).replace(/\{\s*precio\s*\}/gi, () => precio ?? '\u0000');
  if(t.includes('\u0000')) return null;
  if(/\$\s*[xX]\b|\$\s*\{/.test(t)) return null;
  for(const m of t.matchAll(/\$\s*([\d][\d,\.]*)/g)){
    /* el punto final de la frase no es parte del número («…$1,373.24.»); antes «1373.24.» daba NaN y NaN nunca
       se rechazaba: cualquier precio con un punto pegado pasaba */
    const n = Number(m[1].replace(/[.,]+$/, '').replace(/,/g, '').replace(/\.(?=\d{3}\b)/g, ''));
    if(!cot || !Number.isFinite(n) || Math.abs(n - cot.desde) > 1) return null;
  }
  return t;
}

const normal = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const mezclar = (a = {}, b = {}) => { const r = { ...a }; for(const [k, v] of Object.entries(b || {})) if(v != null && v !== '') r[k] = v; return r; };
