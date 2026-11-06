/* ══════════════════════════════════════════════════════════════════════════
   SECRE · el conmutador: contesta las llamadas de Carlos por él
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 4 de noviembre: «a toda llamada que me entre, que responda primero
   preguntando quién llama y por qué, que diga que va a revisar si estoy
   disponible, los ponga en espera, me marque a mí y me diga: te está llamando
   Carlos por tu página web, ¿quieres responder tú o le digo algo yo? … y que
   regrese a la llamada y diga: Carlos está ocupado, pero me comentó que te
   dijera tal cosa … y al spam que se los albure bien feo y les diga que si es
   real manden WhatsApp».
   Y también: «que cuando sea algo importante me marque: tenemos esta
   situación y esta otra, ¿qué le digo a cada uno?».

   Va con Twilio Voice (verificado el 4 de noviembre en twilio.com/docs/voice/twiml/gather:
   <Gather input="speech"> manda lo que se dijo en «SpeechResult»). Las llamadas
   a su número llegan aquí con el DESVÍO de su compañía telefónica hacia el
   número de Twilio (cuando no contesta u ocupado). Las de WhatsApp no pasan
   por aquí: ésas Baileys sólo las puede rechazar (nucleo.alLlamada).

   Rutas (POST de Twilio, firmadas con X-Twilio-Signature):
     /voz/entra            alguien llama → «¿quién habla y para qué?»
     /voz/quien            lo que dijo → spam (albur y cuelga) o «déjame ver si está» + espera
     /voz/espera           la música de espera
     /voz/carlos?c=…       Carlos contesta → «te llama X por Y, ¿contestas tú o le digo algo?»
     /voz/decide?c=…       lo que dijo Carlos → lo pasa, o le dice el recado y cuelga
     /voz/carlos-estado    Carlos no contestó → recado y cuelga
     /voz/pendientes       Secre le marca a Carlos con lo que espera su decisión
     /voz/pendientes-dice  lo que Carlos contestó → se hace (como si lo escribiera)
   ═════════════════════════════════════════════════════════════════════════ */
import crypto from 'crypto';

const VOZ = 'Polly.Mia-Neural';
const esc = (s) => String(s || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
const di = (t) => `<Say language="es-MX" voice="${VOZ}">${esc(String(t).replace(/\s+/g, ' ').trim().slice(0, 1500))}</Say>`;
const xml = (cuerpo) => `<?xml version="1.0" encoding="UTF-8"?><Response>${cuerpo}</Response>`;
const escuchar = (accion, pregunta, extra = '') => `<Gather input="speech" language="es-MX" speechTimeout="auto" actionOnEmptyResult="true" action="${esc(accion)}" method="POST">${di(pregunta)}</Gather>${extra}`;

/* lo que se le dice al spam: albures, como los diría Carlos (él lo pidió así). Se pueden cambiar en config.albures */
export const ALBURES = [
  '¿Me hablas del banco? Qué casualidad, yo también tengo un chile pa\' que te sientes a cobrar, mi rey.',
  '¿Que metí mi currículum? No, carnal, el que te va a meter algo soy yo, y no es papel.',
  'Aquí no compramos nada, pero si quieres te presto mi pepino pa\' que te consueles, ¿va?',
  '¿Promoción? La única promoción aquí es la de mi longaniza: dos por uno y te la llevas calientita.',
  '¿Un crédito? Mejor pídetelo tú, que se te oye que te gusta que te la dejen a meses sin intereses.',
  'Ay, qué bonito hablas, ¿así de bonito te sientas en el chile o nomás en la silla de la oficina?',
];

/** la firma de Twilio: base64(HMAC-SHA1(token, url completa + cada parámetro ordenado, nombre y valor)) */
export function firmaTwilio(token, url, params){
  const datos = url + Object.keys(params).sort().map(k => k + params[k]).join('');
  return crypto.createHmac('sha1', token).update(Buffer.from(datos, 'utf8')).digest('base64');
}
export function firmaValida(token, url, params, firma){
  if(!token || !firma) return false;
  const a = Buffer.from(firmaTwilio(token, url, params)), b = Buffer.from(String(firma));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * El conmutador. Todo lo de fuera entra inyectado para poder probarlo:
 *   ia.llamada({ dijo })            → { spam, nombre, motivo }
 *   ia.decision({ dijo, nombre, motivo }) → { pasar, decir }
 *   twilio.llamar({ a, url, estado }) → sid    ·  twilio.cambiar(sid, twiml)
 *   secre                           → el núcleo (avisar, orden, propuestas, config)
 *   base                            → la dirección pública de Secre (https://…onrender.com)
 */
export function conmutador({ ia, twilio, secre, base, carlos, desde = '', azar = Math.random, reloj = () => Date.now() }){
  const llamadas = new Map();      /* CallSid → { de, nombre, motivo, t, carlosSid } */
  const nombreDueno = () => (secre && secre.config && secre.config.nombre) || 'Carlos';
  const albur = () => { const L = (secre && secre.config && secre.config.albures && secre.config.albures.length) ? secre.config.albures : ALBURES; return L[Math.floor(azar() * L.length)]; };
  const whats = () => (secre && secre.config && secre.config.whatsappPublico) || '442 883 3786';
  const viejas = () => { for(const [k, v] of llamadas) if(reloj() - v.t > 3600_000) llamadas.delete(k); };

  return {
    llamadas,
    async atender(ruta, p, q = {}){
      viejas();
      const sid = p.CallSid || '';
      if(ruta === '/voz/entra'){
        /* sólo negocio (6 nov, Carlos: «que no conteste mis llamadas»): no se contesta nada */
        if(secre && secre.config && secre.config.soloNegocio) return xml('<Reject reason="busy"/>');
        /* la llamada a Carlos que se regresa por el desvío no se vuelve a contestar */
        if(desde && p.From === desde) return xml('<Hangup/>');
        llamadas.set(sid, { de: p.From || '', t: reloj(), intentos: 0 });
        return xml(escuchar(`${base}/voz/quien`, `Hola, habla la asistente de ${nombreDueno()}. ¿Con quién tengo el gusto y para qué le llamas?`, di('No te escuché. Si quieres, mándale un WhatsApp. Hasta luego.') + '<Hangup/>'));
      }
      if(ruta === '/voz/quien'){
        const L = llamadas.get(sid) || { de: p.From || '', t: reloj(), intentos: 0 }; llamadas.set(sid, L);
        const dijo = String(p.SpeechResult || '').trim();
        if(!dijo){
          if(++L.intentos > 1) return xml(di(`No te escuché. Mándale un WhatsApp al ${whats()}. Hasta luego.`) + '<Hangup/>');
          return xml(escuchar(`${base}/voz/quien`, 'Perdón, no te escuché. ¿Quién habla y para qué?'));
        }
        let r = { spam: false, nombre: '', motivo: '' };
        try{ r = await ia.llamada({ dijo }); }catch{ r = { spam: false, nombre: '', motivo: dijo.slice(0, 120) }; }
        if(r.spam){
          try{ await secre.avisar(`📵 Te marcó spam (${L.de}): «${dijo.slice(0, 160)}». Le contesté con un albur y le colgué.`); }catch{}
          return xml(di(albur()) + '<Pause length="1"/>' + di(`Y ya en serio: si esta llamada es real y de verdad quieres hablar con el dueño de este número, manda un WhatsApp al ${whats()}. Bye.`) + '<Hangup/>');
        }
        Object.assign(L, { nombre: r.nombre || 'alguien', motivo: r.motivo || 'algo', dijo });
        /* a Carlos: le marca y, si no contesta, recado */
        try{ L.carlosSid = await twilio.llamar({ a: carlos, url: `${base}/voz/carlos?c=${encodeURIComponent(sid)}`, estado: `${base}/voz/carlos-estado?c=${encodeURIComponent(sid)}` }); }
        catch(e){ L.carlosSid = ''; }
        if(!L.carlosSid){
          try{ await secre.avisar(`📞 Te llamó ${L.nombre} (${L.de}) por ${L.motivo}. No te pude marcar; le dije que le contestas por mensaje.`); }catch{}
          return xml(di(`Gracias, ${L.nombre}. ${nombreDueno()} no está disponible ahorita; le dejo tu recado y te contesta por mensaje.`) + '<Hangup/>');
        }
        return xml(di(`Ok, ${L.nombre}. Déjame preguntar si está disponible ${nombreDueno()} Eduardo para lo de ${L.motivo}. Dame un minuto.`) + `<Enqueue waitUrl="${esc(base + '/voz/espera')}" waitUrlMethod="POST">c-${esc(sid)}</Enqueue>` + di('Gracias por esperar. Hasta luego.'));
      }
      if(ruta === '/voz/espera') return xml(di('Sigo buscándolo, un momentito.') + '<Play>http://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3</Play>');
      if(ruta === '/voz/carlos'){
        const L = llamadas.get(q.c);
        if(!L) return xml(di('Ya colgó quien te llamaba. Te dejo el recado por WhatsApp.') + '<Hangup/>');
        L.contesto = true;
        return xml(escuchar(`${base}/voz/decide?c=${encodeURIComponent(q.c)}`, `Oye, te está llamando ${L.nombre} por ${L.motivo}. ¿Quieres contestar tú o le digo algo yo?`, di('No te escuché; le digo que le contestas por mensaje.') + '<Redirect method="POST">' + esc(`${base}/voz/decide?c=${encodeURIComponent(q.c)}`) + '</Redirect>'));
      }
      if(ruta === '/voz/decide'){
        const L = llamadas.get(q.c);
        if(!L) return xml(di('Ya había colgado. Te dejo el recado por WhatsApp.') + '<Hangup/>');
        const dijo = String(p.SpeechResult || '').trim();
        let d = { pasar: false, decir: '' };
        if(dijo){ try{ d = await ia.decision({ dijo, nombre: L.nombre, motivo: L.motivo }); }catch{ d = { pasar: false, decir: '' }; } }
        if(d.pasar) return xml(di('Va, te lo paso.') + `<Dial><Queue>c-${esc(q.c)}</Queue></Dial>`);
        const recado = d.decir || 'que en un momento te contesta por mensaje';
        try{ await twilio.cambiar(q.c, xml(di(`${L.nombre}, ${nombreDueno()} se encuentra ocupado en este momento, pero me comentó que te dijera: ${recado}`) + '<Pause length="1"/>' + di('Gracias por llamar.') + '<Hangup/>')); }catch{}
        llamadas.delete(q.c);
        try{ await secre.avisar(`📞 ${L.nombre} te llamó por ${L.motivo}. Le dije: «${recado}».`); }catch{}
        return xml(di('Listo, se lo digo.') + '<Hangup/>');
      }
      if(ruta === '/voz/carlos-estado'){
        const L = llamadas.get(q.c), st = p.CallStatus || '';
        if(!L || L.contesto || !/no-answer|busy|failed|canceled/.test(st)) return xml('');
        try{ await twilio.cambiar(q.c, xml(di(`${L.nombre}, ${nombreDueno()} no está disponible ahorita. Le dejo tu recado y te contesta por mensaje. Gracias.`) + '<Hangup/>')); }catch{}
        llamadas.delete(q.c);
        try{ await secre.avisar(`📞 Te llamó ${L.nombre} (${L.de}) por ${L.motivo} y no contestaste. Le dije que le contestas por mensaje.`); }catch{}
        return xml('');
      }
      /* ── Secre le marca a Carlos con lo que espera su decisión ── */
      if(ruta === '/voz/pendientes'){
        const ps = (secre.estado.propuestas || []).filter(x => x.tipo === 'respuesta').slice(-6);
        if(!ps.length) return xml(di('Ya no hay nada pendiente. Bye.') + '<Hangup/>');
        const lista = ps.map((x, i) => `${i + 1}: ${x.nombre} ${x.motivo ? 'quiere ' + x.motivo : 'dice ' + String(x.dijo || '').slice(0, 120)}.`).join(' ');
        return xml(escuchar(`${base}/voz/pendientes-dice`, `Hola, soy tu asistente. Tenemos ${ps.length === 1 ? 'una situación' : ps.length + ' situaciones'}. ${lista} ¿Qué le digo a cada uno?`, di('No te escuché. Te lo dejo por WhatsApp.') + '<Hangup/>'));
      }
      if(ruta === '/voz/pendientes-dice'){
        const dijo = String(p.SpeechResult || '').trim();
        if(!dijo) return xml(di('No te escuché. Te lo dejo por WhatsApp.') + '<Hangup/>');
        const antes = (secre.estado.propuestas || []).length;
        try{ await secre.orden(dijo); }catch{}
        const hechas = antes - (secre.estado.propuestas || []).length;
        return xml(di(hechas > 0 ? `Listo, ya contesté ${hechas === 1 ? 'una' : hechas}. Lo demás te lo dejo en WhatsApp.` : 'Va, no contesté nada; te lo dejo en WhatsApp para que lo revises.') + '<Hangup/>');
      }
      return xml('<Hangup/>');
    },
  };
}
