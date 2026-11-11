/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL CEREBRO
   ───────────────────────────────────────────────────────────────────────────
   Sólo entra cuando el reflejo no supo. La IA vive en NUESTRO servidor y a
   NUESTRO nombre (Carlos, 11 nov: «la IA no se la vamos a dar a él»): el
   cliente la usa desde su chat central, nunca con llaves.

   Y mientras el cliente no diga que se queda, GRATIS (Carlos, 11 nov: «aún no
   desembolses un peso»). Por eso hay tres motores y el de fábrica es gratis:
     · groq    — el de Negro (plan gratis). De fábrica.
     · gemini  — el de Paulina (plan gratis). De respaldo.
     · claude  — de paga. Apagado hasta que el cliente se quede.
   Se escoge con MOTORES_IA="groq,gemini" (en orden: si uno falla, el siguiente).
   Van con fetch directo, sin librería, como los demás servidores de la casa: el
   proveedor entra por este adaptador y si mañana cambia, se cambia aquí.

   Todos contestan el mismo JSON: la respuesta para el cliente, si hace falta el
   dueño y por qué, lo que entendió (plaga, m², zona, tipo) y una línea de por
   qué contestó así, que va al panel escondido.
   ═══════════════════════════════════════════════════════════════════════════ */

const FORMA = `Contesta SÓLO con un objeto JSON, sin texto alrededor, con esta forma exacta:
{"respuesta": "lo que le dices al cliente", "necesita_dueno": true|false, "motivo": "por qué necesita al dueño, o vacío",
 "razon": "una línea para el equipo: por qué contestaste así",
 "datos": {"plaga": "texto o null", "m2": número o null, "zona": "colonia o null", "tipo": "casa|negocio|industria o null",
   "tamano": "chica|mediana|grande o null", "recamaras": número o null, "banos": número o null, "sala": true|false|null,
   "comedor": true|false|null, "patio": true|false|null, "pisos": número o null}}
En "datos" pon SÓLO lo que el cliente ya dijo en la conversación; lo que no, null.`;

export function papel(negocio, casos, cotizacion){
  return `Eres quien contesta los mensajes de ${negocio.nombre || 'una fumigadora'} en Querétaro, en WhatsApp, Instagram y Facebook.
Escribe como una persona del negocio: español mexicano, amable, corto (2 a 4 renglones), sin emojis y sin «¿en qué más te puedo ayudar?».

Lo que sabes del negocio:
${negocio.descripcion || '(FALTA la descripción del negocio)'}

Reglas que no se rompen:
- NUNCA des un precio que no venga en lo que te pasan. Si te pasan una cotización, di «desde $X» y aclara que el total lo confirma un técnico al ver el lugar.
- Para cotizar necesitas: la plaga, el tamaño del lugar, la colonia y si es casa, negocio o industria. Pide lo que falte, de uno o dos datos a la vez.
- Casi nadie sabe cuántos metros mide su casa. Si no lo sabe, NO insistas: ayúdale con preguntas fáciles, una o dos a la vez:
  1) ¿Tu casa la considerarías chica, mediana o grande?  2) ¿Cuántas recámaras y cuántos baños tiene?
  3) ¿Tiene sala, comedor y patio o jardín?  4) ¿Es de una planta o de dos?  5) ¿En qué colonia está?
  Con eso el sistema calcula los metros solo. Nunca le pidas medir nada.
- Habla como la gente: «cucarachas chiquitas», «ratones», «chinches», «alacranes». Nada de nombres científicos ni tecnicismos.
  Si no queda claro qué plaga es, pregunta cómo es (tamaño, color, dónde la ve), sin hacerlo sentir mal.
- Ten paciencia: si el cliente contesta a medias o se confunde, reformula más fácil. Nunca lo corrijas ni lo hagas sentir tonto.
- Si es industria (alimentos, hospital, fábrica, bodega grande) o algo fuera de lo normal, ofrece una visita y marca necesita_dueno.
- Marca necesita_dueno si: hay una queja, piden factura o contrato, preguntan algo que no sabes, o piden hablar con el dueño.
- No prometas fechas ni horarios exactos: «el dueño te confirma la hora».

Respuestas ya aprobadas por el dueño, úsalas como guía de tono y de datos:
${(casos || []).slice(0, 60).map(c => `- ${(c.frases || [])[0] || c.id}: ${c.respuesta}`).join('\n')}
${cotizacion ? `\nCotización calculada por el sistema para este cliente: ${JSON.stringify(cotizacion)}\n` : ''}
${FORMA}`;
}

/* Los modelos son los que La Sala ya usa y verificó (30 sep); se cambian por variable. */
const MOTORES = {
  groq: {
    llave: 'GROQ_API_KEY', modelos: (env) => [env.MODELO_GROQ || 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
    pide: (modelo, k, sistema, msgs) => fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { authorization: 'Bearer ' + k, 'content-type': 'application/json' },
      body: JSON.stringify({ model: modelo, max_tokens: 1500, temperature: 0.3, response_format: { type: 'json_object' },
        ...(/gpt-oss/.test(modelo) ? { reasoning_effort: 'low' } : {}),
        messages: [{ role: 'system', content: sistema }, ...msgs.map(m => ({ role: m.role, content: m.content }))] }) }),
    saca: (j) => j?.choices?.[0]?.message?.content ?? '',
  },
  gemini: {
    llave: 'GEMINI_API_KEY', modelos: (env) => [env.MODELO_GEMINI || 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-lite-latest'],
    /* la llave va en la URL porque así lo documenta Google; es servidor contra servidor */
    pide: (modelo, k, sistema, msgs) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(k)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      /* Gemini PIENSA dentro del tope: con poco, se queda sin respuesta (ya le pasó a Paulina) */
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] },
        contents: msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: 2500, temperature: 0.3, responseMimeType: 'application/json' } }) }),
    saca: (j) => (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''),
  },
  claude: {
    /* DE PAGA: no se usa hasta que el cliente se quede (y Carlos lo prenda en MOTORES_IA) */
    llave: 'ANTHROPIC_API_KEY', modelos: (env) => [env.MODELO_CLAUDE || 'claude-opus-5-5'],
    pide: (modelo, k, sistema, msgs) => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': k, 'anthropic-version': '2026-10-21',
        'anthropic-beta': 'server-side-fallback-2026-07-01' },
      body: JSON.stringify({ model: modelo, max_tokens: 4000, system: [{ type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }],
        messages: msgs, output_config: { effort: 'low' }, fallbacks: 'default' }) }),
    saca: (j) => j?.stop_reason === 'refusal' ? '' : (j?.content || []).filter(b => b.type === 'text').map(b => b.text).join(''),
  },
};

/** Saca el JSON aunque venga entre ```json … ``` o con texto alrededor, y lo deja con su forma. */
export function leerJSON(texto){
  const s = String(texto || ''), i = s.indexOf('{'), f = s.lastIndexOf('}');
  if(i < 0 || f < i) return null;
  let o; try { o = JSON.parse(s.slice(i, f + 1)); } catch { return null; }
  if(typeof o.respuesta !== 'string' || !o.respuesta.trim()) return null;
  const d = o.datos || {}, m2 = Number(d.m2), n = (v) => Number.isFinite(+v) && +v > 0 ? +v : null, si = (v) => typeof v === 'boolean' ? v : null;
  return { respuesta: o.respuesta.trim(), necesita_dueno: !!o.necesita_dueno, motivo: String(o.motivo || ''), razon: String(o.razon || ''),
    datos: { plaga: d.plaga || null, m2: Number.isFinite(m2) && m2 > 0 ? m2 : null, zona: d.zona || null,
      tipo: ['casa', 'negocio', 'industria'].includes(d.tipo) ? d.tipo : null,
      tamano: ['chica', 'mediana', 'grande'].includes(d.tamano) ? d.tamano : null, recamaras: n(d.recamaras), banos: n(d.banos),
      sala: si(d.sala), comedor: si(d.comedor), patio: si(d.patio), pisos: n(d.pisos) } };
}

/** Le pregunta a la IA. `historial` = [{de:'cliente'|'negocio', texto}], el último es del cliente. NUNCA lanza. */
export async function pensar({ env, negocio, casos, historial, cotizacion }){
  const msgs = historial.slice(-12).map(m => ({ role: m.de === 'cliente' ? 'user' : 'assistant', content: m.texto }));
  while(msgs.length && msgs[0].role !== 'user') msgs.shift();
  const sistema = papel(negocio, casos, cotizacion);
  const errores = [];
  for(const id of (env.MOTORES_IA || 'groq,gemini').split(',').map(s => s.trim()).filter(Boolean)){
    const M = MOTORES[id], k = M && env[M.llave];
    if(!M){ errores.push(`${id}: no existe`); continue; }
    if(!k){ errores.push(`${id}: falta ${M.llave}`); continue; }
    for(const modelo of M.modelos(env)){
      try {
        const r = await M.pide(modelo, k, sistema, msgs);
        if(!r.ok){ errores.push(`${modelo}: ${r.status}`); continue; }
        const o = leerJSON(M.saca(await r.json()));
        if(o) return { bien: true, ...o, modelo };
        errores.push(`${modelo}: no regresó JSON válido`);
      } catch(e){ errores.push(`${modelo}: ${e.message || e}`); }
    }
  }
  return { bien: false, error: errores.join(' · ') || 'Sin motores de IA' };
}
