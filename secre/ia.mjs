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
async function preguntar(sistema, texto, { json = true, tope = 900, motor = '' } = {}){
  const llaveSala = process.env.SECRE_SALA_LLAVE || process.env.MAZI_LLAVE;
  if(llaveSala){
    const r = await fetch(`${SALA}/api/sala/${SALA_NOMBRE}/ia-texto`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'X-Llave': llaveSala },
      body: JSON.stringify({ motor: motor || process.env.SECRE_MOTOR || 'gemini', sistema, mensajes: [{ de: 'tu', texto }], tope, json }),
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
const conversacion = (h, dueno, n = 20) => h.slice(-n).map(x => `${x.de === 'yo' ? dueno : (x.quien || 'Él/Ella')}: ${x.texto}`).join('\n');
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
async function leerRol({ dueno, nombre, nota, historial, nuevos, personaje, datos }){
  const sistema = `Estás en «${nombre}», un grupo de WhatsApp donde juegan rol${nota ? ` (${nota})` : ''}. ${dueno} no puede estar ahorita y tú llevas SU personaje${personaje ? `: ${personaje}` : ' (sácalo de cómo ha jugado él en la conversación)'}.
Tu trabajo:
1) "pendientes": sólo cosas de la VIDA REAL que ${dueno} tenga que hacer por lo que escribieron fuera del rol. Casi siempre vacía.
2) "respuesta": la siguiente jugada de su personaje. Sigue lo que acaba de pasar y reacciona a lo que hicieron los demás (cada quien con el nombre de su personaje), y mueve la historia un poquito.
   - Escribe como se juega en ESE grupo: mismo idioma, tono y formato (si usan *acciones entre asteriscos*, tercera persona o diálogo con guion, tú igual). Corto: de 1 a 3 párrafos breves.
   - NUNCA decidas por los personajes de los demás, ni los mates, ni cierres tramas grandes tú solo. No inventes reglas del mundo que nadie ha puesto.
   - Si no le toca actuar a su personaje (no lo involucra, es una escena de otros, o es plática fuera del rol), deja "respuesta" vacía.
   - Si alguien le habla a ${dueno} de la VIDA REAL (fuera del rol) y pide algo que sólo él puede decidir (dinero, quedar, un sí o un no), pon "decide": true, en "respuesta" algo corto fuera del rol como "(ahorita no está, luego te contesta)" y en "motivo" qué le piden.
3) "urgente": true sólo si en la vida real algo no puede esperar.
${recuerdos(dueno, datos)}
Contesta SÓLO JSON: {"pendientes":[], "respuesta":"", "motivo":"", "urgente":false, "decide":false}`;
  const texto = `La historia hasta ahora (lo más nuevo al final; lo que dice «${dueno}» es su personaje):\n${conversacion(historial, dueno, 45)}\n\nLo nuevo desde su última jugada:\n${nuevos.map(x => `${x.quien || 'Alguien'}: ${x.texto}`).join('\n')}`;
  const j = sacarJson(await preguntar(sistema, texto, { tope: 1500 })) || {};
  return { pendientes: Array.isArray(j.pendientes) ? j.pendientes.map(String).slice(0, 3) : [], respuesta: String(j.respuesta || ''), motivo: String(j.motivo || ''), urgente: !!j.urgente, decide: !!j.decide };
}

export const ia = {
  async leer({ dueno, nombre, nota, historial, nuevos, estilo, redactar, auto = false, rol = false, personaje = '', grupo, datos = [] }){
    if(rol) return leerRol({ dueno, nombre, nota, historial, nuevos, personaje, datos });
    const sistema = `Ayudas a ${dueno}, un estudiante de prepa en Querétaro, con su WhatsApp. Te paso un chat${grupo ? ' de grupo' : ''} con ${nombre}${nota ? ` (${nota})` : ''}.
Tu trabajo:
1) "pendientes": cosas que ${dueno} tiene que HACER por lo que le escribieron (entregar algo, confirmar, pagar, ir a algún lado, contestar una pregunta importante). Frases cortas en infinitivo, con fecha u hora si la hay. Lista vacía si no hay.
${redactar && auto ? `2) "respuesta": el mensaje que se le manda YA a ${nombre}, SIN que ${dueno} lo revise. Lo escribes tú como asistente de ${dueno} (sale firmado como su asistente, no como él): español mexicano, amable, breve y claro.
   - Sólo afirmas lo que sale del chat o de "Lo que ${dueno} te contó". NUNCA inventes precios, horas, lugares, existencias, fechas ni compromisos, ni digas que ${dueno} va a hacer algo.
   - Si piden algo que sólo ${dueno} puede decidir o saber (dinero, un precio que no está en lo que te contó, apartar algo, una cita, un sí o un no, algo personal o delicado), pon "decide": true, en "respuesta" di que ya le pasaste su mensaje a ${dueno} y que él le confirma (sin prometer hora), y en "motivo" qué tiene que decidir él.
   - Si ya no hace falta contestar (un "ok", un gracias, un sticker, una despedida), deja "respuesta" vacía.${grupo ? `
   - Es un GRUPO: sólo contestas si le hablan a ${dueno}, lo mencionan o le preguntan algo a él. Si la plática es entre los demás, deja "respuesta" vacía. Si contestas, dirígete por su nombre a quien le habló.` : ''}
3) "urgente": true sólo si algo no puede esperar (una emergencia, algo para dentro de una hora).` : ''}
${redactar && !auto ? `2) "respuesta": una propuesta de lo que ${dueno} contestaría, escrita como él (español mexicano, informal). ${dueno} la va a revisar antes de mandarla.
   - NO inventes datos: si piden una hora, un lugar, dinero o una decisión que no sale del chat, propón algo que gane tiempo ("déjame ver y ahorita te digo") y explica en "motivo" qué tiene que decidir él.
   - Si ya no hace falta contestar (un "ok", un sticker, una despedida), deja "respuesta" vacía.
3) "urgente": true sólo si algo no puede esperar (una emergencia, algo para dentro de una hora).
${ejemplos(estilo)}
   - Si lo que preguntan se contesta con "Lo que ${dueno} te contó", úsalo con sus datos exactos (día, hora, temas, precios).` : ''}
${recuerdos(dueno, datos)}
Contesta SÓLO JSON: {"pendientes":[], "respuesta":"", "motivo":"", "urgente":false${auto ? ', "decide":false' : ''}}`;
    const texto = `Conversación (lo más nuevo al final):\n${conversacion(historial, dueno)}\n\nLo nuevo que no ha contestado:\n${nuevos.map(x => x.texto).join('\n')}`;
    const j = sacarJson(await preguntar(sistema, texto)) || {};
    return { pendientes: Array.isArray(j.pendientes) ? j.pendientes.map(String).slice(0, 5) : [], respuesta: redactar ? String(j.respuesta || '') : '', motivo: String(j.motivo || ''), urgente: !!j.urgente, decide: !!j.decide };
  },

  async saludo({ dueno, nombre, cual, nota, estilo, antes }){
    const sistema = `Escribe UN mensaje corto de ${cual === 'manana' ? 'buenos días' : 'buenas noches'} que ${dueno} le mandaría a ${nombre}${nota ? ` (${nota})` : ''}, en español mexicano y con su forma de escribir. Que no se repita con los anteriores. Máximo 2 renglones.
${ejemplos(estilo)}
Contesta SÓLO JSON: {"texto":""}`;
    const j = sacarJson(await preguntar(sistema, `Los últimos que le mandó:\n${(antes || []).join('\n') || '(ninguno)'}`)) || {};
    return String(j.texto || '').trim();
  },

  async orden({ quien = 'Secre', texto, hoy, hora, chats, config }){
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
Si te pregunta algo, contesta en "respuesta" (corto, mexicano, sin tecnicismos). Si pide algo que no puedes, díselo.
Contesta SÓLO JSON: {"respuesta":"", "acciones":[]}`;
    const t = `Chats que conozco: ${JSON.stringify(chats)}\nConfiguración actual: ${JSON.stringify(config)}\n\nCarlos dice: ${texto}`;
    const j = sacarJson(await preguntar(sistema, t, { tope: 1200, motor: MOTOR[quien] })) || {};
    return { respuesta: String(j.respuesta || ''), acciones: Array.isArray(j.acciones) ? j.acciones.slice(0, 20) : [] };
  },
};
