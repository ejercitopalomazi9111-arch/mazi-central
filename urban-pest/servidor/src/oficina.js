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
import { cotizar, aPlaga } from './cotizador.js';
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
    /* un mensaje larguísimo no se le pasa entero a nadie: ni a la conversación, ni al reflejo, ni a la IA (seguridad, 23 nov) */
    if(typeof m.texto === 'string' && m.texto.length > LARGO_MAX) m = { ...m, texto: m.texto.slice(0, LARGO_MAX) };
    if(typeof m.nombre === 'string') m = { ...m, nombre: m.nombre.slice(0, 80) };
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

    /* la plaga se apunta en cuanto la dice, aunque conteste el reflejo: así nunca se le vuelve a preguntar */
    /* …y si la corrige («no son chinches, son como cucarachas pequeñas»), vale la última que dijo */
    const plagaDicha = aPlaga(m.texto);
    if(plagaDicha) conv.datos.plaga = plagaDicha;

    /* 5 · REFLEJO */
    const r = elReflejo(m.texto, cfg.casos, conv.datos, conv.mensajes);
    if(r){
      const texto = llenar(r.caso.respuesta, conv.datos);
      await this.decir(conv, texto, { via: 'reflejo', caso: r.caso.id, confianza: r.confianza });
      if(r.caso.dueno) await this.aviso(conv, `Caso «${r.caso.id}»: necesita que lo veas tú.`);
      await guarda(); return { hecho: 'reflejo', caso: r.caso.id };
    }

    /* 6 · CEREBRO
       Carlos, 17 nov: en cada mensaje le volvía a dar el precio, cada vez un poco distinto ($778.80, $752.89, $766.36), y una
       hoja nueva cada vez; a «¿por qué no pediste metros?» le contestó con el precio. Ya dicho el precio, no se mueve si el
       cliente no da un dato nuevo, y a la IA se le dice que ya se lo dijo: que conteste lo que le preguntan. */
    const lugar1 = lugarDe([{ de: 'cliente', texto: m.texto }]);
    const datoNuevo = traeDatos(m.texto) || /\b(chic|median|grand|recamar|cuart|bano|pati|jardin|sala|comedor|plant|pis|coloni|zona|depa|casa|negocio|industria)/.test(normal(m.texto)) || !!lugar1.tipo || lugar1.varias;
    let cot = cfg.tarifas ? (conv.precioDicho != null && conv.cotizacion && !datoNuevo ? conv.cotizacion : this.cotiza(conv, cfg.tarifas, cfg.medidas)) : null;
    /* con un dato nuevo que casi no lo mueve («chica» → «2 cuartos 1 baño»: $778.80 → $752.89) se queda el que ya se le dijo:
       al cliente no se le cambia el precio por centavos de una estimación. Si cambia 5 % o más, sí se le da el nuevo. */
    if(cot && conv.cotDicha && Math.abs(cot.desde - conv.cotDicha.desde) < conv.cotDicha.desde * .05) cot = conv.cotDicha;
    const paraIA = (c) => c && conv.precioDicho === c.desde ? { ...c, yaDicho: true } : c;
    let p = await this.pensar({ env: this.env, negocio: cfg.negocio, casos: cfg.casos, historial: conv.mensajes, cotizacion: paraIA(cot), sinPrecio: sinPrecioAuto(conv.datos, cfg.tarifas) });
    const antes = { ...conv.datos };
    if(p.bien){
      conv.datos = mezclar(conv.datos, p.datos);
      /* …o la IA acaba de decir qué tipo de lugar es: la cotización se calculó antes y hay que rehacerla (prueba por tipo,
         23 nov: «hospital de 50 m²» → la IA dijo industria y la hoja salía sin «se confirma con una visita») */
      const otroTipo = cot && conv.datos.tipo !== antes.tipo;
      const nueva = cfg.tarifas && (!cot || otroTipo) ? this.cotiza(conv, cfg.tarifas, cfg.medidas) : null;
      /* el mismo precio y la misma respuesta: sólo cambia lo de la visita, y lo que contestó la IA sigue valiendo */
      if(otroTipo && nueva && nueva.desde === cot.desde && nueva.atiende === cot.atiende) cot = nueva;
      /* con lo que acaba de decir ya se puede cotizar: se le pregunta otra vez, ya con el precio */
      else if(nueva){ cot = nueva; const p2 = await this.pensar({ env: this.env, negocio: cfg.negocio, casos: cfg.casos, historial: conv.mensajes, cotizacion: paraIA(cot) }); if(p2.bien) p = { ...p2, datos: p.datos }; }
      /* acaba de decir una plaga que no tiene precio automático (ratas, termitas…): que no siga pidiendo el tamaño */
      else if(!cot && !sinPrecioAuto(antes, cfg.tarifas) && sinPrecioAuto(conv.datos, cfg.tarifas)){ const p2 = await this.pensar({ env: this.env, negocio: cfg.negocio, casos: cfg.casos, historial: conv.mensajes, cotizacion: null, sinPrecio: sinPrecioAuto(conv.datos, cfg.tarifas) }); if(p2.bien) p = { ...p2, datos: p.datos }; }
    }
    if(!p.bien){
      await this.decir(conv, 'Gracias por escribir. En un momento te contesta el encargado.', { via: 'respaldo', error: p.error });
      await this.aviso(conv, 'La IA no pudo contestar: ' + p.error);
      await guarda(); return { hecho: 'respaldo' };
    }
    /* el precio lo pone el código, nunca la IA (12 nov: escribió «$X» al cliente). Si la IA copió de la plática el precio
       que se dijo ANTES y con el dato nuevo cambió, se pone el de ahora (17 nov: «2 cuartos 1 baño» → la IA repitió $778.80) */
    /* Sólo con atiende «si» hay precio para el cliente. En «caso-por-caso» (lugar enorme, casa grande fuera de zona) o «no»
       el precio no se puede poner aunque la IA escriba {precio}: lo da el encargado. */
    const cotP = cot?.atiende === 'si' ? cot : null;
    let resp = p.respuesta;
    if(cotP && conv.precioDicho != null && conv.precioDicho !== cotP.desde) resp = String(resp).split(pesos(conv.precioDicho)).join('{precio}');
    let texto = ponerPrecio(resp, cotP);
    /* Prueba en vivo, 17 nov: con la cotización YA calculada, la IA seguía preguntando el tamaño o la colonia («es como de
       3 cuartos» → «¿cuántas recámaras tiene?» → …) y el cliente nunca veía el precio. Si el sistema ya lo tiene y la IA
       pide lo que ya está, se le da el precio. */
    /* Carlos, 17 nov («Toda chafa»): el cliente dijo «No quiero nada, escribes raro» y el bot le volvió a soltar el precio y
       le mandó OTRA hoja. Si dice que ya no quiere, se despide y ya: sin precio, sin hoja y sin tarjeta de cotización. */
    const seVa = noQuiere(m.texto);
    if(texto && seVa && cotP && texto.includes(pesos(cotP.desde))) texto = 'Sin problema. Aquí estamos para cuando lo necesites.';
    if(texto && !seVa && cot && cot.atiende === 'si' && !p.necesita_dueno && conv.precioDicho !== cot.desde && !texto.includes(pesos(cot.desde)) && pideLoQueYaHay(texto))
      texto = ponerPrecio('Te saldría aproximadamente en {precio}. Si los datos que nos diste están bien, ése es el costo; el técnico te lo confirma al ver el lugar.', cot);
    /* La IA quiso dar un precio sin cotización (Carlos preguntó «¿Cuánto?» sin que se supiera la plaga): en vez de
       «te contesta el encargado», se le pide lo que falta para cotizar. */
    if(!texto && !cotP && /\{\s*precio\s*\}/i.test(p.respuesta)){
      const d = conv.datos || {}, sp = sinPrecioAuto(d, cfg.tarifas);
      texto = cot && cot.atiende !== 'si' ? (cot.enorme ? 'Por el tamaño del lugar, el precio te lo da el encargado después de revisar tu caso. Ya le aviso.'
          : cot.varias ? 'Para varias casas o departamentos, el precio te lo da el encargado después de revisar tu caso. Ya le aviso.'
          : 'Para tu zona el encargado revisa tu caso y te avisa. Ya le paso tus datos.')
        : !d.plaga ? 'Para darte el precio dime qué plaga es. Si no sabes el nombre, cuéntame cómo es: tamaño, color y dónde la ves.'
        : sp ? `${sp[0].toUpperCase() + sp.slice(1)} sí las atendemos; el precio te lo da el encargado. Ya le aviso.`
        : esCasa(conv) ? PREGUNTA_TAMANO : PREGUNTA_METROS;
      if(sp) p.necesita_dueno = true, p.motivo = p.motivo || `Pide precio de ${sp}`;
      if(cot && cot.atiende !== 'si') p.necesita_dueno = true, p.motivo = p.motivo || (cot.atiende === 'caso-por-caso' ? motivoCaso(cot) : 'Fuera de la zona: decide tú.');
    }
    if(!texto){
      await this.decir(conv, 'Gracias por escribir. En un momento te contesta el encargado.', { via: 'respaldo', error: 'La IA escribió un precio que el sistema no calculó: ' + p.respuesta.slice(0, 160) });
      await this.aviso(conv, 'La IA quiso dar un precio que no salió de las tarifas; revisa tú la conversación.');
      await guarda(); return { hecho: 'respaldo' };
    }
    /* la tarjeta de la cotización va pegada sólo al mensaje que DIO el precio (antes salía hasta en la despedida) */
    /* Carlos, 17 nov: «que sí pida metros». La IA a veces se los brincaba y preguntaba directo «¿chica, mediana o
       grande?» (prueba en vivo, 18 nov). Si pregunta el tamaño de una casa sin haber pedido nunca los metros, sale la
       pregunta de la casa: primero los metros y, si no los sabe, el cuestionario. */
    /* …y a un restaurante, un hotel o un condominio no se le pregunta por «tu casa» ni sus recámaras: se le piden los metros
       del lugar (prueba por tipo, 23 nov: a un hotel de 36 habitaciones se le hizo el cuestionario de una casa) */
    if(!cot && !(conv.datos?.m2 > 0) && hizoCuestionario(texto) && !esCasa(conv)) texto = PREGUNTA_METROS;
    else if(!cot && !conv.pidioMetros && !(conv.datos?.m2 > 0) && (conv.datos?.tipo || 'casa') === 'casa' && hizoCuestionario(texto) && !/metros/i.test(texto)) texto = PREGUNTA_TAMANO;
    if(!cot && /metros/i.test(texto)) conv.pidioMetros = true;
    /* La última compuerta antes de salir (seguridad, 23 nov): lo que escribió la IA no puede prometer descuentos ni cosas gratis
       ni hablar de cómo funciona por dentro, por mucho que el cliente la haya empujado. Si lo intenta, sale el aviso al
       encargado y al dueño le llega qué iba a decir. Lo del reflejo ya está aprobado por el dueño y no pasa por aquí. */
    const peligro = respuestaInsegura(texto);
    if(peligro){
      await this.aviso(conv, `El bot iba a contestar algo que no debe (${peligro}); se cambió por «ya le aviso al encargado». Iba a decir: «${String(texto).slice(0, 200)}»`);
      texto = 'Eso lo ve directamente el encargado; ya le aviso para que te conteste.';
    }
    if(texto.length > RESPUESTA_MAX){ const corte = texto.slice(0, RESPUESTA_MAX), punto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('? ')); texto = punto > 200 ? corte.slice(0, punto + 1) : corte.trimEnd() + '…'; }
    const dioPrecio = !!(cotP && texto.includes(pesos(cotP.desde)));
    if(!dioPrecio && hizoCuestionario(texto)) conv.cuestionario = (conv.cuestionario || 0) + 1;
    await this.decir(conv, texto, { via: 'cerebro', razon: p.razon, modelo: p.modelo, cotizacion: dioPrecio ? cot : undefined });
    if(cot) conv.cotizacion = cot;
    if(dioPrecio){ conv.precioDicho = cot.desde; conv.cotDicha = cot; }
    /* La cotización por escrito (BRIEF §B): cuando el bot DIO un precio que el sistema calculó, manda el link
       a la hoja lista para guardar como PDF. Una por precio: si vuelve a preguntar lo mismo no se repite. */
    /* la hoja por escrito: una, y otra sólo si el precio cambió de verdad (10 % o más), no por centavos */
    if(dioPrecio && !seVa && cot.atiende === 'si' && (!conv.cotDoc || Math.abs(cot.desde - conv.cotDoc.precio) >= conv.cotDoc.precio * .1)){
      const doc = await cotizacionDelBot(this.A, conv, cot, this.reloj());
      conv.cotDoc = { codigo: doc.codigo, precio: cot.desde };
      await this.decir(conv, `Te dejo tu cotización por escrito, por si la quieres guardar: ${this.env.URL_COTIZACION || URL_COTIZACION}${doc.codigo}`, { via: 'cotizacion', cotizacion: doc.codigo });
    }
    await this.A.put(`manual:${m.id}`, { pregunta: m.texto, respuesta: p.respuesta, razon: p.razon, canal: m.canal, chat: m.chat, cuando: this.reloj(), estado: 'por revisar' });
    if(p.necesita_dueno) await this.aviso(conv, p.motivo || 'La IA pide que lo veas tú.');
    else if(cot?.atiende === 'caso-por-caso') await this.aviso(conv, motivoCaso(cot));
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
      const x = metrosDe(msj.texto); if(x > 0){ m2 = d.m2 = x; break; }
    }
    /* qué es el lugar, por lo que dijo, si la IA no lo apuntó: un hotel no es «casa» (y no se mide como una) */
    const lugar = lugarDe(conv.mensajes);
    if(!d.tipo && lugar.tipo) d.tipo = lugar.tipo;
    /* no sabe los metros: se estiman con lo que contó (sólo casas; negocio e industria se visitan).
       Carlos, 17 nov: «que sí pida metros y si no los sabe que le haga el pequeño cuestionario de cuartos». Con sólo «es
       chica» ya no se cotiza de golpe: falta que diga cuántas recámaras (o los metros). Si ya se le hizo el cuestionario y
       contestó a medias, se cotiza con lo que dio: no se le pregunta dos veces. Sala y comedor los cuenta el medidor solo. */
    if(!(m2 > 0) && (d.tipo || 'casa') === 'casa' && !lugar.varias){
      const dt = delTexto(conv.mensajes);
      if(d.recamaras == null && dt.recamaras) d.recamaras = dt.recamaras;
      if(!d.tamano && dt.tamano) d.tamano = dt.tamano;
      const completo = d.recamaras > 0 && !!d.tamano;
      const e = completo || conv.cuestionario ? estimarM2(d, medidas || MEDIDAS) : { bien: false };
      if(e.bien){ m2 = e.m2; m2Estimado = true; conv.estimacion = e; }
    }
    const c = cotizar({ plaga: d.plaga && normal(d.plaga), m2, m2Estimado, km: kmEstimado ? tarifas.km_tipico : d.km, kmEstimado, tipo: d.tipo || 'casa' }, tarifas);
    /* varias casas o departamentos («fraccionamiento de 62 casas, cada una de 135 m²»): el precio sería el de UNA. Lo ve el
       encargado (prueba por tipo, 23 nov: salía el precio de una sola casa, y su hoja, para 62 casas) */
    if(c.bien && lugar.varias) return { ...c, atiende: 'caso-por-caso', varias: true, visita: true, nota: c.nota + ' Son varias casas o departamentos: el precio lo da el encargado.' };
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
    /* los 10 dígitos en cualquier número; los últimos 7 sólo en un número corto (el «local»): así una fecha o un folio
       largo que por azar acabe igual no se bloquea (Paulina y Negro, 17 nov) */
    if(tels.some(t => d.includes(t) || (d.length <= 8 && d.endsWith(t.slice(-7))))) return false;
  }
  const nombre = normal(negocio.dueno_nombre || '').replace(/\b(ing|lic|sr|don)\.?\s+/g, '').trim();
  if(nombre){
    const t = ' ' + normal(texto).replace(/[^a-z0-9ñ]+/g, ' ') + ' ', partes = nombre.split(/\s+/), apellido = partes.length > 1 ? partes.at(-1) : null;
    if(t.includes(' ' + partes.join(' ') + ' ') || (apellido && apellido.length >= 4 && t.includes(' ' + apellido + ' '))) return false;
  }
  return true;
}

/** El reflejo, con una regla (Godines, 17 nov, de la prueba en vivo): un caso marcado `conDatosALaIA` (precio, factura,
    empresa, mascotas) NO contesta si el mensaje ya trae datos para cotizar —la plaga, los metros, los cuartos—. Antes,
    «cuánto sale un depa de 80 metros en Milenio x cucarachas» recibía «¿qué plaga tienes?»: el cliente siente que no lo
    leyeron. Con datos, contesta la IA (que ve las mismas respuestas aprobadas) y además cotiza. */
export const traeDatos = (t) => !!aPlaga(t) || metrosDe(t) != null || /\d+\s*(m2|m²|mts?\b|metros)|\brec[aá]maras?\b|\bcuartos?\b|\bpisos?\b|\bplantas?\b/i.test(String(t || ''));
/* …y lo mismo si ya los dio ANTES en la plática: «tengo cucarachas» → «¿y cuánto sale?» no se contesta «¿qué plaga tienes?» */
const yaDioDatos = (d = {}) => !!(d.plaga || d.m2 || d.recamaras || d.tamano || d.zona);
/** `mensajes` (opcional): la plática hasta aquí, para saber si el lugar es una casa */
export function elReflejo(texto, casos, datos, mensajes){
  const r = reflejo(texto, casos);
  if(!r) return null;
  if(r.caso.conDatosALaIA && (traeDatos(texto) || yaDioDatos(datos))) return null;
  /* una respuesta hecha para casas («¿tu casa la considerarías chica, mediana o grande?») no se le da a un restaurante, un
     hotel o un condominio: contesta la IA, que sí sabe de qué lugar habla (prueba por tipo, 23 nov). Se mira la respuesta y
     no el id del caso: así vale también si el dueño la edita. */
  if(/\btu casa\b|rec[aá]maras/i.test(r.caso.respuesta) && !esCasa({ datos, mensajes: mensajes || [{ de: 'cliente', texto }] })) return null;
  /* un mensaje que nombra una plaga y sólo se PARECE a un caso, contesta la IA: «tengo termitas en los muebles de madera»
     se parecía a «tengo que mover los muebles» y recibía cómo preparar la casa (prueba en vivo, 17 nov) */
  if(r.confianza < 1 && aPlaga(texto)) return null;
  return r;
}

/* Lo que el cliente dijo con sus palabras y la IA no apuntó (prueba en vivo, 17 nov: «es como de 3 cuartos» y la IA
   volvía a preguntar las recámaras una y otra vez). «3 cuartos», «tres recámaras», «casa chica»… */
const NUMEROS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
export function delTexto(mensajes = []){
  const d = {};
  for(const m of [...mensajes].reverse().filter(x => x.de === 'cliente')){
    const t = normal(m.texto);
    if(d.recamaras == null){ const r = t.match(/\b(\d{1,2}|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho)\s+(recamaras?|cuartos?|habitaciones?|recamaritas?)\b/); if(r) d.recamaras = NUMEROS[r[1]] ?? +r[1]; }
    /* «depa chico», «casa chiquita», «mediano», «grandote»: en masculino también (prueba en vivo: «es depa chico x el centro») */
    if(d.tamano == null){ const r = t.match(/\b(chic[ao]|chiquit[ao]|pequen[ao]|median[ao]|grande|grandot[aeo])\b/); if(r) d.tamano = /^(chic|chiquit|pequen)/.test(r[1]) ? 'chica' : /^median/.test(r[1]) ? 'mediana' : 'grande'; }
  }
  return d;
}

/** Los metros que escribió el cliente: «120 m2», «1,200 metros», «24.100 m²» (miles con punto), «3 mil metros». null si no hay.
    Antes «24.100 m²» se leía 24.1 m²: una planta de alimentos salía en unos cientos de pesos, con su hoja (prueba por tipo, 23 nov). */
export function metrosDe(t){
  const r = String(t || '').match(/(\d[\d,.]*)\s*(mil\s+)?(m2|m²|mts2?|metros(?:\s+cuadrados)?)/i);
  if(!r) return null;
  const s = r[1].replace(/[.,]+$/, ''), x = Number(/^[1-9]\d{0,2}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s.replace(/,/g, '')) * (r[2] ? 1000 : 1);
  return x > 0 ? x : null;
}

/* Qué es el lugar, por lo que dijo el cliente (por si la IA no lo apuntó). Sirve para dos cosas: a un restaurante, un hotel
   o una escuela no se le habla de «tu casa» ni de recámaras, y «hotel de 33 cuartos» no se mide como una casa de 33
   recámaras (prueba por tipo, 23 nov). Si la IA ya dijo que es casa, manda la IA; «varias casas» vale siempre. */
const ES_INDUSTRIA = /\b(naves?|fabricas?|plantas? (de alimentos|de produccion|de manufactura|procesadora|industrial|empacadora|productora)|parque industrial|industria\w*|maquiladora|empacadora|procesadora)\b/;
const ES_NEGOCIO = /\b(restaurant(e|es)?|fondas?|taquerias?|cocina economica|cafeterias?|bar|cantina|antro|hotel(es)?|motel(es)?|hostal|hospital(es)?|clinicas?|consultorios?|laboratorios?|farmacias?|escuelas?|colegios?|kinder|guarderias?|primaria|secundaria|preparatoria|universidad|oficinas?|despacho|bodegas?|almacen(es)?|negocios?|empresas?|locales comerciales|local comercial|(mi|el|un|nuestro) local|tiendas?|abarrotes|supermercado|minisuper|panaderias?|tortillerias?|carnicerias?|gimnasio|salon de (eventos|fiestas|belleza)|iglesia|templo|asilo|plaza comercial|centro comercial)\b/;
/* varias casas o departamentos: un condominio o un fraccionamiento que administra, o «40 casas», «12 departamentos» */
const VARIAS = /\b([2-9]|\d{2,4}|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|varias|muchas)\s+(casas|departamentos|deptos|depas|viviendas|locales|unidades)\b|\badministr\w*\s+(de\s+)?((un|una|el|la|del)\s+)?(condominio|fraccionamiento|edificio|privada|coto|residencial|unidad habitacional)/;
export function lugarDe(mensajes = []){
  const t = mensajes.filter(m => m.de === 'cliente').map(m => normal(m.texto || '')).join(' \n ');
  return { varias: VARIAS.test(t), tipo: ES_INDUSTRIA.test(t) ? 'industria' : ES_NEGOCIO.test(t) ? 'negocio' : null };
}
/** ¿es UNA casa (o depa)? Lo que dijo la IA manda; si no dijo, lo que dijo el cliente; y varias casas nunca son una. */
export const esCasa = (conv = {}) => { const l = lugarDe(conv.mensajes); return !l.varias && (conv.datos?.tipo || l.tipo || 'casa') === 'casa'; };
/* lo que le llega al dueño cuando el bot no puede dar el precio (antes, a todo le decía «casa grande fuera de la zona») */
const motivoCaso = (c) => c.enorme ? 'Lugar muy grande: dale tú el precio.' : c.varias ? 'Son varias casas o departamentos (condominio o fraccionamiento): dale tú el precio.'
  : 'Casa grande fuera de la zona: decide si se atiende y cuánto cobrar de traslado.';

/** La plaga que dijo (si dijo) y que NO tiene precio automático en sus tarifas: ratas, termitas, chinches… La cotiza él. */
export function sinPrecioAuto(d = {}, tarifas){
  if(!d?.plaga || !tarifas?.plagas) return null;
  const clave = aPlaga(d.plaga) || normal(d.plaga);
  return tarifas.plagas[clave] ? null : (COMO_SE_DICE[clave] || String(d.plaga).slice(0, 40));
}
/* a la IA se le dice como lo dice la gente, no la clave de las tarifas («roedor») */
const COMO_SE_DICE = { roedor: 'ratas y ratones', termita: 'termitas', chinche: 'chinches', pulga: 'pulgas', alacran: 'alacranes', arana: 'arañas',
  mosco: 'mosquitos', mosca: 'moscas', hormiga: 'hormigas', cucaracha: 'cucarachas' };

/** «no quiero nada», «ya nada», «no gracias», «olvídalo», «ya no»: el cliente se despide o dice que no */
export const noQuiere = (t) => /\b(no quiero( nada)?(?! (que|q|k|a|al|el|la|los|las|mis?|tus?|sus?|esto|eso|ese|esa)\b)|ya nada|no,? gracias|no me interesa|olvidalo|dejalo( asi)?|ya no( quiero)?(?! (que|q)\b)|mejor no|asi dejalo|no ocupo nada)\b/.test(normal(t));

/* la pregunta del tamaño: primero los metros, y si no, el cuestionario corto (sala y comedor no se preguntan: toda casa tiene) */
export const PREGUNTA_TAMANO = 'Para darte el precio, ¿sabes cuántos metros mide tu casa? Si no, dime cuántas recámaras y baños tiene, si la considerarías chica, mediana o grande, y en qué colonia está.';
/* …y la de un negocio, una industria o un condominio: los metros del lugar, sin recámaras */
export const PREGUNTA_METROS = 'Para darte el precio, ¿cuántos metros cuadrados mide más o menos el lugar, y en qué colonia o zona está?';
/** el bot ya le preguntó las recámaras o el tamaño (la IA o la pregunta de arriba) */
export const hizoCuestionario = (t) => /rec[aá]maras|chic[ao],? median[ao] o grande/i.test(String(t || ''));

const LARGO_MAX = 1500, RESPUESTA_MAX = 700;
/** Lo que la IA NO puede decir, se lo pida quien se lo pida: descuentos, cosas gratis, y cómo funciona por dentro.
    Regresa el motivo, o null si la respuesta está bien. La garantía de su página («regresamos sin costo adicional») sí vale. */
export function respuestaInsegura(t){
  const n = normal(t), sinGarantia = n.replace(/sin costo adicional/g, '');
  if(/\bdescuento|\d{1,3}\s*%\s*(de\s+)?(descuento|menos|off)|\bgratis\b|\bgratuit|\bregal(o|amos|arte)|\bpromo(cion|ciones)?\b|\b2x1\b|\bcupon|\bbonificacion|te lo dejo en|\bsin costo\b|no te cobramos|\bcortesia\b|\brebaja/.test(sinGarantia)) return 'prometía un descuento, una promoción o algo gratis';
  if(/necesita_dueno|precio_aproximado|ya_se_lo_dijiste|\{\s*precio\s*\}|reglas que no se rompen|respuestas ya aprobadas|system prompt|prompt del sistema|mis instrucciones|modelo de lenguaje|\b(openai|groq|gemini|llama|qwen|gpt)\b/.test(n)) return 'iba a hablar de cómo funciona por dentro';
  return null;
}

export const pideLoQueYaHay = (t) => /chic[ao], median[ao] o grande|cu[aá]ntas rec[aá]maras|qu[eé] colonia|cu[aá]ntos metros|el tama[ñn]o/i.test(String(t || ''));

export function ponerPrecio(texto, cot){
  const precio = cot ? pesos(cot.desde) : null;
  /* «{precio}», «{{precio}}» o «${precio}»: todas quedan en el precio (17 nov: salió «{$10,002.44}») */
  let t = String(texto).replace(/(\$\s*)?\{+\s*precio\s*\}+/gi, () => precio ?? '\u0000')
    /* …y si la IA ya puso la cantidad DENTRO de las llaves («{$10,002.44}»), se le quitan las llaves */
    .replace(/\{+\s*(\$\s*[\d][\d,]*(?:\.\d+)?)\s*\}+/g, '$1');
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
