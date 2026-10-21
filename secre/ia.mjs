/* ══════════════════════════════════════════════════════════════════════════
   SECRE · la IA (adaptador)
   ──────────────────────────────────────────────────────────────────────────
   Tres trabajos: leer un chat (pendientes + propuesta de respuesta), escribir
   un saludo y entender una orden de Carlos en palabras normales.

   Por dónde va, en este orden:
     1. La Sala (`SECRE_SALA_LLAVE`): las llaves de Gemini y Groq ya viven
        ahí, las mismas de Presentaciones. Nada nuevo que pagar ni guardar.
     2. Una llave propia de Gemini (`GEMINI_API_KEY`) o de Groq (`GROQ_API_KEY`).
   Las llaves van en variables de entorno, NUNCA en el repo.
   ═════════════════════════════════════════════════════════════════════════ */
const SALA = (process.env.SECRE_SALA_URL || 'https://sala.palomazi9111.workers.dev').replace(/\/+$/, '');
const SALA_NOMBRE = process.env.SECRE_SALA || 'GRUPAZ';

/* quién de las tres contesta: Negro va con Groq, Secre y Paulina con Gemini */
const MOTOR = { Negro: 'groq', Paulina: 'gemini', Secre: 'gemini' };
/* ⚠ «a veces responde y a veces no» (16 de octubre): Gemini 2.5 PIENSA dentro de
   su tope de respuesta, y con 900 a veces se le acababa antes de escribir el JSON:
   llegaba vacío o cortado y Secre se quedaba sin qué mandar. Ahora el tope es de
   2,500 y, si un motor falla o regresa algo que no se puede leer, se pregunta al
   otro (Gemini ↔ Groq) antes de rendirse. */
async function preguntar(sistema, texto, op = {}){
  const primero = op.motor || process.env.SECRE_MOTOR || 'gemini', otro = primero === 'groq' ? 'gemini' : 'groq';
  let ultimo = null;
  for(const motor of [primero, otro]){
    for(let intento = 0; intento < 2; intento++){
      try{
        const r = await preguntarUna(sistema, texto, { ...op, motor, tope: Math.max(op.tope || 0, 2500) });
        if(op.json === false || sacarJson(r)) return r;
        ultimo = new Error(`${motor} regresó algo que no se puede leer`);
      }catch(e){ ultimo = e; }
      if(intento === 0) await new Promise(r => setTimeout(r, 1200));
    }
  }
  throw ultimo || new Error('la IA no contestó');
}
async function preguntarUna(sistema, texto, { json = true, tope = 2500, motor = '' } = {}){
  const llaveSala = process.env.SECRE_SALA_LLAVE || process.env.MAZI_LLAVE;
  if(llaveSala){
    const r = await fetch(`${SALA}/api/sala/${SALA_NOMBRE}/ia-texto`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'X-Llave': llaveSala },
      body: JSON.stringify({ motor: motor || 'gemini', sistema, mensajes: [{ de: 'tu', texto }], tope, json }),
      signal: AbortSignal.timeout(90_000),
    });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || j.bien === false) throw new Error(j.error || `La Sala contestó ${r.status}`);
    return j.texto || '';
  }
  if(process.env.GEMINI_API_KEY && !(motor === 'groq' && process.env.GROQ_API_KEY)){
    const modelo = process.env.SECRE_GEMINI || 'gemini-2.5-flash';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] }, contents: [{ role: 'user', parts: [{ text: texto }] }],
        generationConfig: { maxOutputTokens: tope, ...(json ? { responseMimeType: 'application/json' } : {}) } }),
      signal: AbortSignal.timeout(90_000),
    });
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error((j.error && j.error.message) || `Gemini contestó ${r.status}`);
    return ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('');
  }
  if(process.env.GROQ_API_KEY){
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.GROQ_API_KEY },
      body: JSON.stringify({ model: process.env.SECRE_GROQ || 'openai/gpt-oss-120b', max_tokens: tope, messages: [{ role: 'system', content: sistema }, { role: 'user', content: texto }], ...(json ? { response_format: { type: 'json_object' } } : {}) }),
      signal: AbortSignal.timeout(90_000),
    });
    const j = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error((j.error && j.error.message) || `Groq contestó ${r.status}`);
    return (((j.choices || [])[0] || {}).message || {}).content || '';
  }
  throw new Error('No hay IA configurada: falta SECRE_SALA_LLAVE (o GEMINI_API_KEY / GROQ_API_KEY).');
}
/* el modelo a veces envuelve el JSON en ```json … ```: se saca lo de adentro */
export function sacarJson(t){
  const s = String(t || '');
  try{ return JSON.parse(s); }catch{}
  const m = s.match(/\{[\s\S]*\}/);
  if(m) try{ return JSON.parse(m[0]); }catch{}
  return null;
}
/* quién dijo qué: lo que contestó la asistente NO es de Carlos (antes salía como suyo
   y la IA se confundía), y la otra persona va con su nombre, no «Él/Ella» */
const conversacion = (h, dueno, n = 30, nombre = '') => h.slice(-n).map(x => `${x.elenco ? (x.quien || x.elenco) : x.secre ? 'Tú (su asistente)' : x.de === 'yo' ? dueno : (x.quien || nombre || 'La otra persona')}: ${x.texto}`).join('\n');
/* lo que Carlos le contó a Secre («el viernes hay examen de mate a las 8»): es lo único que puede afirmar además del chat */
const recuerdos = (dueno, datos) => datos.length ? `Lo que ${dueno} te contó (es verdad; úsalo si viene al caso y no inventes nada más):\n${datos.map(d => '- ' + d).join('\n')}\n` : '';
const ejemplos = (e) => e.length ? 'Así escribe él (ejemplos reales, imita el tono, el largo, las mayúsculas, la puntuación y los emojis):\n' + e.slice(-30).map(x => '- ' + x).join('\n') : '';

/* las tres que se rotan el turno (Carlos: «amé sus respuestas, todas ojetes») */
const PERSONA = {
  Secre: 'la secretaria de siempre: clara, amable y al grano.',
  Paulina: 'una IA mexicana cínica y ojete, de las que se sientan en La Sala de Grupo Mazi: contestas corto, con carrilla y groserías si vienen al caso, pero el trabajo sale bien hecho. Nunca inventas datos.',
  Negro: 'una IA mexicana de barrio, sarcástica y mamona, de las de La Sala de Grupo Mazi: contestas corto, con carrilla, pero cumples y no inventas nada.',
};
/* el rol: Carlos juega en un grupo y quiere que la historia siga cuando él no puede */
async function leerRol({ dueno, nombre, nota, historial, nuevos, personaje, mundo = '', marca = '', instrucciones = '', comunidad = '', stickers = [], datos }){
  const sistema = `Estás en «${nombre}», un grupo de WhatsApp donde juegan rol${comunidad ? ` (de la comunidad «${comunidad}»)` : ''}${nota ? ` (${nota})` : ''}. ${dueno} no puede estar ahorita y tú llevas SU personaje${personaje ? `: ${personaje}` : ' (sácalo de cómo ha jugado él en la conversación)'}.
${mundo ? `El mundo y la historia, como te los contó ${dueno} (es canon: no lo contradigas ni lo cambies):\n${mundo}\n` : ''}${instrucciones ? `Instrucciones de ${dueno} para este rol (síguelas siempre):\n${instrucciones}\n` : ''}En el grupo también puede haber otros bots (narrador, dados, árbitro; sus mensajes suelen empezar con 🤖): lo que digan es parte del juego y les contestas igual que a los demás.
Tu trabajo:
1) "pendientes": sólo cosas de la VIDA REAL que ${dueno} tenga que hacer por lo que escribieron fuera del rol. Casi siempre vacía.
2) ${marca ? `"lineas": la siguiente jugada de su personaje, renglón por renglón: [{"tipo":"dice","texto":"lo que dice"},{"tipo":"hace","texto":"lo que hace"}]. En el grupo cada personaje habla con su marca de emojis al inicio (la de él es «${marca}») y las acciones van en renglón aparte con «> » al inicio: NO pongas tú la marca ni el «>», el programa los pone. Deja "respuesta" vacía salvo lo de fuera del rol.` : `"respuesta": la siguiente jugada de su personaje.`} Sigue lo que acaba de pasar y reacciona a lo que hicieron los demás (cada quien con el nombre de su personaje), y mueve la historia un poquito.
   - Escribe como se juega en ESE grupo: mismo idioma, tono y vocabulario. Corto: de 1 a 4 renglones.
   - NUNCA decidas por los personajes de los demás, ni los mates, ni cierres tramas grandes tú solo. No inventes reglas del mundo que nadie ha puesto.
   - Si no le toca actuar a su personaje (no lo involucra, es una escena de otros, o es plática fuera del rol), deja ${marca ? '"lineas"' : '"respuesta"'} vacía.${stickers.length ? `
   - Stickers suyos que puedes mandar de vez en cuando (casi nunca: sólo cuando de verdad queda, como él los usa), con lo que estaba pasando cuando él los mandó:\n${stickers.map(x => `     ${x.n}: ${x.cuando || '(sin contexto)'}`).join('\n')}\n     Pon su número en "sticker" (0 = ninguno).` : ''}
   - Si alguien le habla a ${dueno} de la VIDA REAL (fuera del rol) y pide algo que sólo él puede decidir (dinero, quedar, un sí o un no), pon "decide": true, en "respuesta" algo corto fuera del rol como "(ahorita no está, luego te contesta)" y en "motivo" qué le piden.
3) "urgente": true sólo si en la vida real algo no puede esperar.
${recuerdos(dueno, datos)}
Contesta SÓLO JSON: {"pendientes":[], ${marca ? '"lineas":[], ' : ''}"respuesta":"", "motivo":"", "urgente":false, "decide":false${stickers.length ? ', "sticker":0' : ''}}`;
  const texto = `La historia hasta ahora (lo más nuevo al final; lo que dice «${dueno}» es su personaje):\n${conversacion(historial, dueno, 45)}\n\nLo nuevo desde su última jugada:\n${nuevos.map(x => `${x.quien || 'Alguien'}: ${x.texto}`).join('\n')}`;
  const j = sacarJson(await preguntar(sistema, texto, { tope: 1500 })) || {};
  const lineas = Array.isArray(j.lineas) ? j.lineas.filter(l => l && typeof l.texto === 'string').map(l => ({ tipo: l.tipo === 'hace' ? 'hace' : 'dice', texto: l.texto })).slice(0, 8) : [];
  return { pendientes: Array.isArray(j.pendientes) ? j.pendientes.map(String).slice(0, 3) : [], lineas, respuesta: String(j.respuesta || ''), motivo: String(j.motivo || ''), urgente: !!j.urgente, decide: !!j.decide, sticker: Number.isFinite(+j.sticker) ? +j.sticker : 0 };
}

/* el elenco del rol: Paulina y Negro juegan SU propio personaje en el grupo,
   cada una con su IA (Paulina con Gemini, Negro con Groq) */
async function jugarElenco({ quien, personaje, ficha, nombre, mundo = '', instrucciones = '', comunidad = '', otros = [], historia, nuevos }){
  const sistema = `Estás en «${nombre}», un grupo de WhatsApp donde juegan rol${comunidad ? ` (de la comunidad «${comunidad}»)` : ''}. Tú juegas a TU personaje, ${personaje}, como una jugadora más del grupo:
${ficha}
${mundo ? `El mundo y la historia (es canon: no lo contradigas):\n${mundo}\n` : ''}${instrucciones ? `Instrucciones del grupo (síguelas):\n${instrucciones}\n` : ''}Otros personajes que también juegan y NO son tuyos: ${otros.join(', ') || '(los demás del grupo)'}.
Tu trabajo: "lineas", la siguiente jugada de ${personaje}, renglón por renglón: [{"tipo":"dice","texto":"lo que dice"},{"tipo":"hace","texto":"lo que hace"}]. NO pongas marca ni «>»: el programa los pone.
- Juega con la personalidad, los poderes y la historia de tu ficha; reacciona a lo que acaba de pasar y mueve la historia un poquito.
- Escribe como se juega en ESE grupo: mismo idioma y tono. Corto: de 1 a 4 renglones.
- NUNCA decidas por los personajes de los demás (tampoco por ${otros.join(' ni por ') || 'los otros'}), ni los mates, ni cierres tramas grandes tú solo. No uses tus poderes para ganar todo: que haya juego.
- Si a tu personaje no le toca (la escena es de otros, nadie lo involucra, o es plática fuera del rol), deja "lineas" vacía. Mejor callar que meterte en todo.
Contesta SÓLO JSON: {"lineas":[]}`;
  const texto = `La historia hasta ahora (lo más nuevo al final):\n${historia}\n\nLo nuevo desde tu última jugada:\n${nuevos}`;
  const j = sacarJson(await preguntar(sistema, texto, { tope: 1500, motor: MOTOR[quien] })) || {};
  return { lineas: Array.isArray(j.lineas) ? j.lineas.filter(l => l && typeof l.texto === 'string').map(l => ({ tipo: l.tipo === 'hace' ? 'hace' : 'dice', texto: l.texto })).slice(0, 6) : [] };
}

/* ── oír y hablar (16 de octubre: «que pueda grabar audios») ──────────────
   Oír: la nota de voz va a Gemini como audio y regresa escrita. Hablar: la voz
   la hace Gemini (en La Sala, /ia-voz) y audio.mjs la vuelve nota de voz. */
const MIME_AUDIO = (m) => { const t = String(m || '').split(';')[0].trim().toLowerCase(); return t === 'audio/mp3' ? 'audio/mpeg' : t === 'audio/m4a' ? 'audio/mp4' : t || 'audio/ogg'; };
const ESCRIBIR = 'Escribe EXACTAMENTE lo que dice esta nota de voz, en el idioma en que viene, con puntuación normal. Si no se entiende nada o sólo hay ruido, contesta «[no se entiende]». Sólo el texto, nada más.';
async function transcribir(b64, mime){
  const llaveSala = process.env.SECRE_SALA_LLAVE || process.env.MAZI_LLAVE;
  const audio = { mime: MIME_AUDIO(mime), data: b64 };
  if(llaveSala){
    const r = await fetch(`${SALA}/api/sala/${SALA_NOMBRE}/ia-texto`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'X-Llave': llaveSala },
      body: JSON.stringify({ motor: 'gemini', sistema: 'Eres una transcriptora cuidadosa.', mensajes: [{ de: 'tu', texto: ESCRIBIR }], imagenes: [audio], tope: 2500 }),
      signal: AbortSignal.timeout(90_000),
    });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || j.bien === false) throw new Error(j.error || `La Sala contestó ${r.status}`);
    return String(j.texto || '').trim();
  }
  if(!process.env.GEMINI_API_KEY) throw new Error('Para oír notas de voz hace falta SECRE_SALA_LLAVE o GEMINI_API_KEY.');
  const modelo = process.env.SECRE_GEMINI || 'gemini-2.5-flash';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ inlineData: { mimeType: audio.mime, data: audio.data } }, { text: ESCRIBIR }] }], generationConfig: { maxOutputTokens: 2500 } }),
    signal: AbortSignal.timeout(90_000),
  });
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error((j.error && j.error.message) || `Gemini contestó ${r.status}`);
  return ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(p => p.text || '').join('').trim();
}
async function hablar(texto, voz){
  const llaveSala = process.env.SECRE_SALA_LLAVE || process.env.MAZI_LLAVE;
  if(llaveSala){
    const r = await fetch(`${SALA}/api/sala/${SALA_NOMBRE}/ia-voz`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'X-Llave': llaveSala },
      body: JSON.stringify({ texto, voz }), signal: AbortSignal.timeout(100_000),
    });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || !j.bien) throw new Error(j.error || `La Sala contestó ${r.status}`);
    return { b64: j.data, mime: j.mime };
  }
  if(!process.env.GEMINI_API_KEY) throw new Error('Para mandar audios hace falta SECRE_SALA_LLAVE o GEMINI_API_KEY.');
  /* sin La Sala, la misma pieza que usa La Sala (el repo viene completo en Render) */
  const { generarVoz } = await import('../sala/servidor/modelos.js');
  const r = await generarVoz({ GEMINI_API_KEY: process.env.GEMINI_API_KEY }, { texto, voz });
  if(!r.bien) throw new Error(r.error);
  return { b64: r.data, mime: r.mime };
}

export const ia = {
  jugarElenco,
  /* una nota de voz → texto */
  async oir({ b64, mime }){ const t = await transcribir(b64, mime); return /^\[no se entiende\]$/i.test(t) ? '' : t; },
  /* un texto → nota de voz (OGG/Opus) */
  async voz(texto, voz){
    const { aNotaDeVoz, segundosOgg } = await import('./audio.mjs');
    const a = await hablar(String(texto).slice(0, 1500), voz);
    const ogg = await aNotaDeVoz(a.b64, a.mime);
    return { ogg, segundos: segundosOgg(ogg) };
  },
  async leer({ fotos = [], dueno, nombre, nota, historial, nuevos, estilo, redactar, auto = false, rol = false, personaje = '', mundo = '', marca = '', instrucciones = '', comunidad = '', stickers = [], grupo, datos = [] }){
    if(rol) return leerRol({ dueno, nombre, nota, historial, nuevos, personaje, mundo, marca, instrucciones, comunidad, stickers, datos });
    const sistema = `Ayudas a ${dueno}, un estudiante de prepa en Querétaro, con su WhatsApp. Te paso un chat${grupo ? ' de grupo' : ''} con ${nombre}${nota ? ` (${nota})` : ''}.
Tu trabajo:
1) "pendientes": cosas que ${dueno} tiene que HACER por lo que le escribieron (entregar algo, confirmar, pagar, ir a algún lado, contestar una pregunta importante). Frases cortas en infinitivo, con fecha u hora si la hay. Lista vacía si no hay.
${redactar && auto ? `2) "respuesta": el mensaje que se le manda YA a ${nombre}, SIN que ${dueno} lo revise. Eres el ASISTENTE de ${dueno} en su WhatsApp (el programa pone la firma; tú no firmes ni digas que eres un bot).
   - ESCRIBE COMO PERSONA, NO COMO IA (Carlos, 16 de octubre: «que escriba más humana, no tan IA, más como yo»): mensajes cortos, como se escribe en WhatsApp, en minúsculas si así escribe él, con su tono y su forma de hablar (mira sus ejemplos abajo). Nada de frases de asistente de banco: PROHIBIDO «¿en qué te puedo ayudar?», «¿hay algo más en lo que pueda ayudarte?», «con gusto», «estoy aquí para ayudarte», «¡excelente pregunta!», «entiendo perfectamente». Sin listas, sin viñetas, sin despedidas largas, sin signos de admiración de más. Un emoji de vez en cuando si él los usa, no en cada mensaje.
   - A veces la gente sólo quiere PLATICAR: si te saludan o te cuentan algo, contesta como lo haría un cuate (pregunta cómo le fue, comenta, échale carrilla tranqui si hay confianza) y NO ofrezcas ayuda ni preguntes «qué necesitas». Sólo pregunta lo que de verdad falte para entender lo que piden.
   - Sigue el hilo de la conversación y no repitas lo que ya dijiste.
   - RESUELVE DUDAS: si preguntan algo general (cómo se hace algo, qué significa, una explicación, una tarea, una recomendación), contéstalo bien y corto. Si se contesta con "Lo que ${dueno} te contó", usa esos datos exactos.
   - Sobre ${dueno} y sus cosas sólo afirmas lo que sale del chat o de "Lo que ${dueno} te contó". NUNCA inventes precios, horas, lugares, existencias, fechas ni compromisos suyos, ni digas que él va a hacer algo.
   - Si piden algo que sólo ${dueno} puede decidir o saber (dinero, un precio que no está en lo que te contó, apartar algo, una cita, un sí o un no, algo personal o delicado), di que ya se lo pasaste y que él confirma (sin prometer hora), pon "decide": true y en "motivo" qué tiene que decidir él. Aun así, contesta lo demás que sí puedes.
   - Si de verdad no hace falta contestar (un "ok" suelto, un sticker, una despedida que ya se contestó), deja "respuesta" vacía. Ante la duda, contesta.${grupo ? `
   - Es un GRUPO: sólo contestas si le hablan a ${dueno}, lo mencionan o le preguntan algo a él. Si la plática es entre los demás, deja "respuesta" vacía. Si contestas, dirígete por su nombre a quien le habló.` : ''}
   - Los "pendientes" son para ${dueno}: todo lo que quedó por hacer o decidir de esta plática (entregar, confirmar, pagar, ir, devolver una llamada).
3) "urgente": true sólo si algo no puede esperar (una emergencia, algo para dentro de una hora).
${ejemplos(estilo)}` : ''}
${redactar && !auto ? `2) "respuesta": una propuesta de lo que ${dueno} contestaría, escrita como él (español mexicano, informal). ${dueno} la va a revisar antes de mandarla.
   - NO inventes datos: si piden una hora, un lugar, dinero o una decisión que no sale del chat, propón algo que gane tiempo ("déjame ver y ahorita te digo") y explica en "motivo" qué tiene que decidir él.
   - Si ya no hace falta contestar (un "ok", un sticker, una despedida), deja "respuesta" vacía.
3) "urgente": true sólo si algo no puede esperar (una emergencia, algo para dentro de una hora).
${ejemplos(estilo)}
   - Si lo que preguntan se contesta con "Lo que ${dueno} te contó", úsalo con sus datos exactos (día, hora, temas, precios).` : ''}
${recuerdos(dueno, datos)}
${fotos.length && redactar ? `FOTOS: tienes estas fotos del banco de ${dueno} que podrían venir al caso:
${fotos.map(f => `${f.n}. ${f.nombre}${f.carpeta ? ' [' + f.carpeta + ']' : ''}${f.descripcion ? ' — ' + f.descripcion : ''}`).join('\n')}
Si te piden ver algo, preguntan por un producto o una foto ayuda a contestar, pon en "fotos" los números de las que van (máximo 3) y en "respuesta" algo corto como lo diría una persona («mira, este es» / «tengo estos»). Si ninguna va con lo que preguntan, "fotos": []. NUNCA mandes fotos que no tengan que ver.
` : ''}${auto ? `4) "porque": en pocas palabras, para ${dueno}, por qué contestaste así (o por qué no contestaste).
` : ''}Contesta SÓLO JSON: {"pendientes":[], "respuesta":"", "motivo":"", "urgente":false${auto ? ', "decide":false, "porque":""' : ''}${fotos.length && redactar ? ', "fotos":[]' : ''}}`;
    const texto = `Conversación (lo más nuevo al final):\n${conversacion(historial, dueno, 30, nombre)}\n\nLo nuevo que no ha contestado:\n${nuevos.map(x => x.texto).join('\n')}`;
    const j = sacarJson(await preguntar(sistema, texto)) || {};
    return { pendientes: Array.isArray(j.pendientes) ? j.pendientes.map(String).slice(0, 5) : [], respuesta: redactar ? String(j.respuesta || '') : '', motivo: String(j.motivo || ''), urgente: !!j.urgente, decide: !!j.decide, porque: String(j.porque || '').slice(0, 200), fotos: Array.isArray(j.fotos) ? j.fotos.map(Number).filter(n => n >= 1 && n <= fotos.length).slice(0, 3) : [] };
  },

  async saludo({ dueno, nombre, cual, nota, estilo, antes }){
    const sistema = `Escribe UN mensaje corto de ${cual === 'manana' ? 'buenos días' : 'buenas noches'} que ${dueno} le mandaría a ${nombre}${nota ? ` (${nota})` : ''}, en español mexicano y con su forma de escribir. Que no se repita con los anteriores. Máximo 2 renglones.
${ejemplos(estilo)}
Contesta SÓLO JSON: {"texto":""}`;
    const j = sacarJson(await preguntar(sistema, `Los últimos que le mandó:\n${(antes || []).join('\n') || '(ninguno)'}`)) || {};
    return String(j.texto || '').trim();
  },

  /* un mensaje programado «sobre un tema» y el texto que acompaña las fotos del día */
  async escribir({ dueno = 'Carlos', nombre = '', tema, estilo = [], grupo = false, hoy = '', hora = '' }){
    const sistema = `Escribes UN mensaje de WhatsApp que ${dueno} manda ${grupo ? 'al grupo' : 'a'} ${nombre}${hoy ? ` (hoy es ${hoy}, son las ${hora})` : ''}, sobre esto: ${tema}.
Como lo escribiría una persona, no una IA: corto (1 a 3 renglones), español mexicano, con su tono. Nada de «¡Hola a todos!», listas, hashtags ni frases de anuncio de tele. No inventes precios, fechas ni datos que no te den.
${ejemplos(estilo)}
Contesta SÓLO JSON: {"texto":""}`;
    const j = sacarJson(await preguntar(sistema, tema)) || {};
    return String(j.texto || '').trim();
  },
  /* el resumen que pide Carlos: en corto y qué es importante aunque ya se haya contestado */
  async resumir({ dueno = 'Carlos', chats = [] }){
    const sistema = `Eres la asistente de WhatsApp de ${dueno}. Te pasan lo que le escribieron y qué hiciste con cada mensaje ("contesto" = le contestaste tú, "decide" = le dijiste que ${dueno} le respondía, "nada" = no hacía falta, "propuesta" = le dejaste propuesta a ${dueno}).
Escríbele un resumen MUY corto (2 a 4 renglones, mexicano, sin tecnicismos) de lo que pasó, y di qué chats son IMPORTANTES para él: dinero, citas, compromisos, emergencias, familia, alguien molesto, algo con fecha o que necesite su respuesta — aunque tú ya hayas contestado. No inventes nada que no esté en los mensajes.
Contesta SÓLO JSON: {"resumen":"", "importantes":["nombre del chat tal como viene"]}`;
    const j = sacarJson(await preguntar(sistema, JSON.stringify(chats).slice(0, 24_000), { tope: 1500 })) || {};
    return { resumen: String(j.resumen || ''), importantes: Array.isArray(j.importantes) ? j.importantes.map(String).slice(0, 20) : [] };
  },
  async orden({ quien = 'Secre', texto, hoy, hora, chats, config, carpetas = [] }){
    const sistema = `Eres ${quien}, ${PERSONA[quien] || PERSONA.Secre} Hoy te toca el turno de secretaria de WhatsApp de Carlos. Él te da órdenes en palabras normales y tú las conviertes en acciones. Hoy es ${hoy}, son las ${hora} en México.
Los modos de un chat son: "borrador" (le propones respuestas para que él las mande), "callado" (no le propones nada, sólo anotas pendientes) y "auto" (le contestas tú sola, firmada como su asistente; lo que necesite su decisión se lo dejas a él).
Fuera de los chats en "auto", NUNCA mandas mensajes a otras personas por tu cuenta. Pon un chat en "auto" SÓLO si Carlos lo pide con claridad («contéstale tú a…», «automático…»), nunca porque se te ocurra. Un GRUPO sólo va en "auto" si Carlos lo nombra; para seguir una historia de rol en un grupo, dile que escriba «rol Nombre del grupo: su personaje».
Acciones posibles (usa el nombre del chat tal como viene en la lista):
- {"accion":"saludos","chat":"Ana","manana":"07:00","noche":"22:30","variacion":10}  (pon "" para quitar uno de los dos)
- {"accion":"quitarSaludos","chat":"Ana"}
- {"accion":"modo","chat":"Ana","modo":"callado"}
- {"accion":"nota","chat":"Ana","texto":"es mi novia, háblale bonito"}
- {"accion":"etiqueta","chat":"Ana","etiqueta":"escuela"}
- {"accion":"regla","modo":"callado","palabras":["tarea","examen"],"etiquetas":["escuela"],"chats":["Ana"],"de":"22:00","a":"07:00","hasta":"AAAA-MM-DD"}  (sólo los campos que apliquen)
- {"accion":"quitarRegla","id":"..."}
- {"accion":"pausa","cuanto":"2h"} · {"accion":"reanudar"}
- {"accion":"anota","texto":"..."} · {"accion":"hecho","n":3}
- {"accion":"resumen","hora":"21:30"} · {"accion":"porDefecto","modo":"borrador"}  ("auto" = contestar sola a todos los que no tengan modo propio)
- {"accion":"auto","firma":"Asistente de Carlos","porHora":4,"alDia":20}  (cómo firma y cuántas veces contesta sola por chat)
- {"accion":"dato","texto":"el viernes 17 hay examen de mate a las 8, temas: derivadas","hasta":"AAAA-MM-DD"}  (algo que te cuenta para usarlo al proponer respuestas; "hasta" = cuando deja de servir, si se deduce)
- {"accion":"olvidaDato","n":2}
- {"accion":"programar","chat":"Tareas","hora":"07:00","dias":[1,2,3,4,5],"texto":"📚 Ahorita toca Matemáticas"}  (un mensaje que sale SOLO a esa hora; dias: 0=domingo…6=sábado, [] = diario. En vez de "texto" fijo puede ir "tema" y lo escribes tú cada vez. Para un HORARIO de clases pon una acción por cada clase con su día y hora)
- {"accion":"quitarProgramado","id":"..."}
- {"accion":"horario","chat":"Tareas","cual":"3.1"}  (pone el horario de clases del 3.1 en ese grupo: a cada hora avisa qué clase toca y cuál sigue; con "quitar":true lo quita)
- {"accion":"publicar","chat":"All's","carpeta":"All's fashion","buscar":"","cuantas":3,"hora":"10:00","dias":[],"intro":""}  (publica sola fotos del banco de imágenes con su nombre; "carpeta" es una carpeta del banco, o "buscar" unas palabras; "intro" un texto fijo antes de las fotos, vacío = lo escribes tú)
- {"accion":"quitarPublicacion","id":"..."}
- {"accion":"fotos","chat":"Ana","si":true}  (contestar con fotos del banco en ese chat; sin "chat" = para todos)
Si te pregunta algo, contesta en "respuesta" (corto, mexicano, sin tecnicismos). Si pide algo que no puedes, díselo.
Contesta SÓLO JSON: {"respuesta":"", "acciones":[]}`;
    const t = `Chats que conozco: ${JSON.stringify(chats)}\nConfiguración actual: ${JSON.stringify(config)}${carpetas.length ? `\nCarpetas del banco de imágenes: ${JSON.stringify(carpetas)}` : ''}\n\nCarlos dice: ${texto}`;
    const j = sacarJson(await preguntar(sistema, t, { tope: 4000, motor: MOTOR[quien] })) || {};
    return { respuesta: String(j.respuesta || ''), acciones: Array.isArray(j.acciones) ? j.acciones.slice(0, 80) : [] };
  },
};
