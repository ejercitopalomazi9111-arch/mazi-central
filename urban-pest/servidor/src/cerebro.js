/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL CEREBRO
   ───────────────────────────────────────────────────────────────────────────
   Sólo entra cuando el reflejo no supo. Es una IA de paga que va en NUESTRO
   servidor y a NUESTRO nombre (decisión de Carlos, 11 nov: «la IA no se la
   vamos a dar a él»). El cliente la usa desde su chat central, nunca con llaves.

   Va con fetch directo, sin librería, como los demás servidores de la casa: el
   proveedor entra por este adaptador y si mañana cambia, se cambia aquí.

   Contesta en JSON con forma fija (structured outputs): la respuesta para el
   cliente, si hace falta el dueño y por qué, lo que entendió (plaga, m², zona,
   tipo) y una línea de por qué contestó así, que va al panel escondido.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Verificado el 11 nov con la guía de la API. El modelo se cambia con la
   variable MODELO_IA, sin tocar código: Carlos decide cuál paga. */
export const MODELO_FABRICA = 'claude-opus-5-5';
const VERSION_API = '2026-10-21';

const ESQUEMA = {
  type: 'object', additionalProperties: false,
  required: ['respuesta', 'necesita_dueno', 'motivo', 'razon', 'datos'],
  properties: {
    respuesta: { type: 'string' },
    necesita_dueno: { type: 'boolean' },
    motivo: { type: 'string' },
    razon: { type: 'string' },
    datos: {
      type: 'object', additionalProperties: false,
      required: ['plaga', 'm2', 'zona', 'tipo'],
      properties: {
        plaga: { type: ['string', 'null'] }, m2: { type: ['number', 'null'] },
        zona: { type: ['string', 'null'] }, tipo: { type: ['string', 'null'], enum: ['casa', 'negocio', 'industria', null] },
      },
    },
  },
};

export function papel(negocio, casos){
  return `Eres quien contesta los mensajes de ${negocio.nombre || 'una fumigadora'} en Querétaro, en WhatsApp, Instagram y Facebook.
Escribe como una persona del negocio: español mexicano, amable, corto (2 a 4 renglones), sin emojis y sin «¿en qué más te puedo ayudar?».

Lo que sabes del negocio:
${negocio.descripcion || '(FALTA la descripción del negocio)'}

Reglas que no se rompen:
- NUNCA des un precio que no venga en lo que te pasan. Si te pasan una cotización, di «desde $X» y aclara que el total lo confirma un técnico al ver el lugar.
- Para cotizar necesitas: la plaga, los metros cuadrados aproximados, la colonia o zona, y si es casa, negocio o industria. Pide lo que falte, de uno o dos datos a la vez.
- Si es industria (alimentos, hospital, fábrica, bodega grande) o algo fuera de lo normal, ofrece una visita y marca necesita_dueno.
- Marca necesita_dueno si: hay una queja, piden factura o contrato, preguntan algo que no sabes, o piden hablar con el dueño.
- No prometas fechas ni horarios exactos: «el dueño te confirma la hora».
- «razon» es una línea para el equipo: por qué contestaste así. No la ve el cliente.

Respuestas ya aprobadas por el dueño, úsalas como guía de tono y de datos:
${(casos || []).slice(0, 60).map(c => `- ${(c.frases || [])[0] || c.id}: ${c.respuesta}`).join('\n')}`;
}

/** Le pregunta a la IA. `historial` = [{de:'cliente'|'negocio', texto}], el último es del cliente. */
export async function pensar({ env, negocio, casos, historial, cotizacion }){
  const llave = env.ANTHROPIC_API_KEY;
  if(!llave) return { bien: false, error: 'Falta la llave ANTHROPIC_API_KEY en el servidor.' };
  const mensajes = historial.slice(-12).map(m => ({ role: m.de === 'cliente' ? 'user' : 'assistant', content: m.texto }));
  /* la API pide que el primero sea del cliente */
  while(mensajes.length && mensajes[0].role !== 'user') mensajes.shift();
  if(cotizacion) mensajes.push({ role: 'system', content: 'Cotización calculada por el sistema: ' + JSON.stringify(cotizacion) });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'x-api-key': llave, 'anthropic-version': VERSION_API,
      /* si el modelo se niega por un filtro, la API lo reintenta con otro en la misma llamada */
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: JSON.stringify({
      model: env.MODELO_IA || MODELO_FABRICA,
      max_tokens: 4000,
      system: [{ type: 'text', text: papel(negocio, casos), cache_control: { type: 'ephemeral' } }],
      messages: mensajes,
      output_config: { effort: env.ESFUERZO_IA || 'low', format: { type: 'json_schema', schema: ESQUEMA } },
      fallbacks: 'default',
    }),
  });
  if(!r.ok) return { bien: false, error: `La IA contestó ${r.status}`, detalle: (await r.text()).slice(0, 300) };
  const j = await r.json();
  if(j.stop_reason === 'refusal') return { bien: false, error: 'La IA se negó a contestar', negada: true };
  const texto = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  try {
    return { bien: true, ...JSON.parse(texto), modelo: j.model, uso: j.usage };
  } catch {
    return { bien: false, error: 'La IA no regresó JSON válido', detalle: texto.slice(0, 300) };
  }
}
