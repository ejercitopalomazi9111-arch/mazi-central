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
- NUNCA des un precio que no venga en lo que te pasan.
- Si te pasan una cotización, dilo corto y sin asustar, así: «Te saldría aproximadamente en {precio}. Si los datos que nos diste están bien, ése es el costo; el técnico te lo confirma al ver tu casa.» Escribe {precio} TAL CUAL, con las llaves: el sistema pone la cantidad. NUNCA escribas una cantidad con número tú. NUNCA digas «desde» ni «a partir de»: suena a que va a subir.
- Si NO te pasan cotización, no hables de precio ni escribas {precio}: pide el dato que falte.
- Si la cotización dice fueraDeRadio, explícalo con tacto: queda fuera de la zona donde trabajamos normalmente y por el traslado sale más caro.
  · atiende "si" (industria): ofrece una visita para confirmar la cotización.
  · atiende "caso-por-caso" (casa grande): di que el encargado revisa su caso y le avisa; marca necesita_dueno.
  · atiende "no" (casa chica o mediana): con amabilidad, dile que por ahora no cubrimos su zona para casas; no des precio.
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
${cotizacion ? `\nCotización calculada por el sistema para este cliente: ${JSON.stringify(paraLaIA(cotizacion))}\n` : ''}
${FORMA}`;
}

/** «$22,100» (a mano: el formato de Intl cambia según el motor, ya nos mordió) */
export const pesos = (n) => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/* A la IA no le llega «desde» (la regla le prohíbe decirlo y con eso copió el «$X» del ejemplo, 12 nov): le llega el
   precio ya escrito y lo que necesita para explicarlo. */
const paraLaIA = (c) => ({ precio_aproximado: pesos(c.desde), visita_del_tecnico: !!c.visita, fuera_de_zona: !!c.fueraDeRadio,
  atiende: c.atiende, m2: c.m2 ?? null, m2_estimado: !!c.m2Estimado, nota: c.nota });

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
    llave: 'GEMINI_API_KEY', modelos: (env) => [env.MODELO_GEMINI || 'gemini-3.6-flash', 'gemini-flash-lite-latest', 'gemini-3.8-flash'] /* 3.8 saturado el 12 nov: va al final */,
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
  /* los números a veces llegan con texto («2500 m2», «2,500»): se limpian (12 nov, por eso no cotizó) */
  const num = (v) => { const x = typeof v === 'number' ? v : parseFloat((String(v ?? '').replace(/,/g, '').match(/\d+(\.\d+)?/) || [])[0]); return Number.isFinite(x) && x > 0 ? x : null; };
  const d = o.datos || {}, m2 = num(d.m2) ?? NaN, n = num, si = (v) => typeof v === 'boolean' ? v : null;
  return { respuesta: o.respuesta.trim(), necesita_dueno: !!o.necesita_dueno, motivo: String(o.motivo || ''), razon: String(o.razon || ''),
    datos: { plaga: d.plaga || null, m2: Number.isFinite(m2) && m2 > 0 ? m2 : null, zona: d.zona || null,
      tipo: ['casa', 'negocio', 'industria'].includes(d.tipo) ? d.tipo : null,
      tamano: ['chica', 'mediana', 'grande'].includes(d.tamano) ? d.tamano : null, recamaras: n(d.recamaras), banos: n(d.banos),
      sala: si(d.sala), comedor: si(d.comedor), patio: si(d.patio), pisos: n(d.pisos) } };
}

const conTope = (promesa, ms) => Promise.race([promesa, new Promise((_, no) => setTimeout(() => no(new Error(`no contestó en ${ms / 1000} s`)), ms))]);

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
        /* si un motor se queda pensando, se suelta y pasa al siguiente: el cliente no espera de más (Paulina, 11 nov) */
        const r = await conTope(M.pide(modelo, k, sistema, msgs), Number(env.TOPE_IA_MS) || 15000);
        if(!r.ok){ errores.push(`${modelo}: ${r.status}`); continue; }
        const o = leerJSON(M.saca(await r.json()));
        if(o) return { bien: true, ...o, modelo };
        errores.push(`${modelo}: no regresó JSON válido`);
      } catch(e){ errores.push(`${modelo}: ${e.message || e}`); }
    }
  }
  return { bien: false, error: errores.join(' · ') || 'Sin motores de IA' };
}

/** ¿Qué motores tiene puestos el bot y contestan? Nunca regresa una llave. El de paga sólo dice si está. */
export async function probarMotores(env){
  const encendidos = (env.MOTORES_IA || 'groq,gemini').split(',').map(s => s.trim());
  const out = {};
  for(const [id, M] of Object.entries(MOTORES)){
    const k = env[M.llave];
    if(!k){ out[id] = { puesta: false, encendido: encendidos.includes(id) }; continue; }
    if(id === 'claude' && !encendidos.includes(id)){ out[id] = { puesta: true, encendido: false, nota: 'de paga: apagado hasta que el cliente se quede' }; continue; }
    /* se prueban TODOS sus modelos: a Gemini 3.8 Google lo satura a ratos y los de respaldo sí contestan (sala, 30 sep) */
    const modelos = {};
    for(const m of M.modelos(env)){
      const t0 = Date.now();
      try {
        const r = await conTope(M.pide(m, k, 'Contesta sólo este JSON: {"respuesta":"ok"}', [{ role: 'user', content: 'hola' }]), 12000);
        modelos[m] = r.ok ? `contesta en ${((Date.now() - t0) / 1000).toFixed(1)} s` : `error ${r.status}`;
      } catch(e){ modelos[m] = String(e.message || e).slice(0, 60); }
    }
    out[id] = { puesta: true, encendido: encendidos.includes(id), contesta: Object.values(modelos).some(v => v.startsWith('contesta')), modelos };
  }
  return out;
}
