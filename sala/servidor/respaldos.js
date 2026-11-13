/* respaldos.js — LAS IAS DE RESPALDO (CARYMO y todo lo que pase por /ia-texto)
 * ===========================================================================
 * Carlos, 13 nov: «que metas más IAs para que en caso de que se acaben las que
 * están, carguen otras. Que no sean de las mismas para que no nos bloqueen las
 * que ya tenemos, porque si no, sin ninguna ya no va a servir de nada».
 *
 * Negro (Groq) y Paulina (Google) siguen siendo las de siempre. Si la que se
 * pidió falla, se prueba la otra, y si también falla se baja por esta lista,
 * que son OTRAS compañías: un bloqueo o un tope de una no tumba a las demás.
 *
 *   nube        Cloudflare Workers AI. NO necesita llave: va por el enlace `AI`
 *               del propio Worker (wrangler.jsonc). Plan gratis: 10,000
 *               «neuronas» al día. Verificado el 13 nov contra la API de la
 *               cuenta: en el plan gratis contestan los de abajo; glm-5.3 y
 *               deepseek-v4 dicen «not available on the Workers Free plan».
 *               Llama 4 Scout también VE fotos: es el respaldo de Paulina.
 *   openrouter  OPENROUTER_API_KEY. Sólo sus modelos «:free».
 *   cerebras    CEREBRAS_API_KEY.
 *   mistral     MISTRAL_API_KEY.
 *
 * Las tres de llave se prenden solas en cuanto la llave existe (secreto de
 * Cloudflare o pegada desde la app en /llaves-ia). Sin llave no estorban.
 *
 * ⚠ EL NOMBRE DEL MODELO ES LO QUE MÁS RÁPIDO SE PUDRE (CLAUDE.md §3.12). Por
 * eso los de llave NO traen nombre fijo: piden su lista `/models` una vez y
 * escogen el primero que encaje con las preferencias. Si mañana renombran el
 * modelo, se escoge el nuevo solo, sin desplegar nada.
 * ===========================================================================*/

export const RESPALDOS = {
  nube: {
    id: 'nube', nombre: 'Nube (Cloudflare)',
    enlace: 'AI',
    texto: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/mistralai/mistral-small-3.1-24b-instruct',
            '@cf/google/gemma-4-26b-a4b-it', '@cf/openai/gpt-oss-120b'],
    vista: ['@cf/meta/llama-4-scout-17b-16e-instruct'],
  },
  openrouter: {
    id: 'openrouter', nombre: 'OpenRouter', llave: 'OPENROUTER_API_KEY',
    base: 'https://openrouter.ai/api/v1',
    prefiere: [/gemma-4-31b.*:free$/, /gemma-4.*:free$/, /nemotron-3-ultra.*:free$/, /nemotron.*super.*:free$/, /:free$/],
    vista: [/nemotron.*-vl.*:free$/, /gemma-4.*:free$/],
  },
  cerebras: {
    id: 'cerebras', nombre: 'Cerebras', llave: 'CEREBRAS_API_KEY',
    base: 'https://api.cerebras.ai/v1',
    prefiere: [/gpt-oss-120b/, /llama.*70b/, /qwen.*(32|27|235)b/, /llama/, /./],
  },
  mistral: {
    id: 'mistral', nombre: 'Mistral', llave: 'MISTRAL_API_KEY',
    base: 'https://api.mistral.ai/v1',
    prefiere: [/^mistral-medium-latest$/, /^mistral-small-latest$/, /^mistral-large-latest$/, /^open-mistral-nemo$/, /mistral/],
    vista: [/^pixtral-large-latest$/, /^mistral-medium-latest$/, /^mistral-small-latest$/],
  },
};

/* El orden en que se bajan. La nube va primero: no depende de ninguna llave. */
export const ORDEN_RESPALDO = ['nube', 'openrouter', 'cerebras', 'mistral'];

export function respaldosVivos(env){
  return ORDEN_RESPALDO.map((id) => RESPALDOS[id]).filter((R) => R.enlace ? !!(env && env[R.enlace]) : !!(env && env[R.llave]))
    .map((R) => ({ id: R.id, nombre: R.nombre }));
}
export function respaldosApagados(env){
  return ORDEN_RESPALDO.map((id) => RESPALDOS[id]).filter((R) => !(R.enlace ? env && env[R.enlace] : env && env[R.llave]))
    .map((R) => ({ id: R.id, nombre: R.nombre, falta: R.enlace ? `el enlace ${R.enlace} en sala/servidor/wrangler.jsonc` : R.llave }));
}

/* ── la lista de modelos de cada proveedor, una vez por hora ── */
const LISTAS = new Map();
async function modelosDe(R, k, hacer){
  const v = LISTAS.get(R.id);
  if(v && Date.now() - v.cuando < 3600_000) return v.ids;
  const r = await hacer(`${R.base}/models`, { headers: { Authorization: `Bearer ${k}` } });
  if(!r.ok) throw Object.assign(new Error(`${R.nombre} no dio su lista de modelos (${r.status}).`), { estado: r.status });
  const j = await r.json();
  const ids = (j.data || j.models || []).map((m) => m.id || m.name).filter(Boolean);
  LISTAS.set(R.id, { ids, cuando: Date.now() });
  return ids;
}
export function escoger(ids, prefiere, cuantos = 2){
  const fuera = [];
  for(const re of prefiere) for(const id of ids) if(re.test(id) && !fuera.includes(id)) fuera.push(id);
  return fuera.slice(0, cuantos);
}

/* Mensajes en el dialecto de OpenAI. `de:'yo'` es la IA, `de:'tu'` la persona. */
function aOpenAI(sistema, mensajes, imagenes){
  const m = [{ role: 'system', content: sistema }, ...mensajes.map((x) => ({ role: x.de === 'yo' ? 'assistant' : 'user', content: x.texto }))];
  const fotos = (imagenes || []).filter((x) => /^image\//.test(x.mime));
  if(fotos.length){
    const u = [...m].reverse().find((x) => x.role === 'user');
    if(u) u.content = [{ type: 'text', text: u.content }, ...fotos.map((x) => ({ type: 'image_url', image_url: { url: `data:${x.mime};base64,${x.data}` } }))];
  }
  return m;
}
const sacar = (j) => {
  const r = j && (j.result || j);
  const c = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
  if(typeof c === 'string') return c;
  if(Array.isArray(c)) return c.map((p) => p.text || '').join('');
  if(typeof (r && r.response) === 'string') return r.response;
  if(r && r.response && typeof r.response === 'object') return JSON.stringify(r.response);
  return '';
};

/* Preguntarle a UN respaldo. Nunca lanza. `op`: { tope, esperaMs, imagenes, json, hacer } */
export async function preguntarRespaldo(id, env, sistema, mensajes, op = {}){
  const R = RESPALDOS[id], hacer = op.hacer || fetch;
  if(!R) return { bien: false, motor: id, error: `No conozco el respaldo "${id}".` };
  const imagenes = (op.imagenes || []).filter((x) => x && x.data);
  if(imagenes.some((x) => !/^image\//.test(x.mime))) return { bien: false, motor: id, error: `${R.nombre} no oye audio.` };
  const fin = Date.now() + (op.esperaMs || 60_000);
  const tope = Math.min(op.tope || 1500, 8000);
  const errores = [];
  try{
    if(R.enlace){
      const ai = env && env[R.enlace];
      if(!ai) return { bien: false, motor: id, error: `${R.nombre} está apagado: falta el enlace ${R.enlace}.` };
      const lista = imagenes.length ? R.vista : R.texto;
      for(const modelo of lista){
        if(Date.now() > fin) break;
        try{
          const j = await conTiempo(ai.run(modelo, { messages: aOpenAI(sistema, mensajes, imagenes), max_tokens: tope }), fin - Date.now());
          const texto = sacar(j).trim();
          if(texto) return { bien: true, motor: id, modelo, texto };
          errores.push(`${modelo}: vacío`);
        }catch(e){ errores.push(`${modelo}: ${String(e && e.message || e).slice(0, 120)}`); }
      }
    }else{
      const k = env && env[R.llave];
      if(!k) return { bien: false, motor: id, error: `${R.nombre} está apagado: falta ${R.llave}.` };
      const ids = await conTiempo(modelosDe(R, k, hacer), Math.max(1000, fin - Date.now()));
      const lista = escoger(ids, imagenes.length ? (R.vista || []) : R.prefiere);
      if(!lista.length) return { bien: false, motor: id, error: `${R.nombre} no tiene un modelo que sirva para esto.` };
      for(const modelo of lista){
        if(Date.now() > fin) break;
        const corta = new AbortController(), reloj = setTimeout(() => corta.abort(), Math.max(1000, fin - Date.now()));
        try{
          const r = await hacer(`${R.base}/chat/completions`, { method: 'POST', signal: corta.signal,
            headers: { Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelo, messages: aOpenAI(sistema, mensajes, imagenes), max_tokens: tope, temperature: 0.4,
              ...(op.json && id !== 'cerebras' ? { response_format: { type: 'json_object' } } : {}) }) });
          if(r.status === 401 || r.status === 403) return { bien: false, motor: id, error: `${R.nombre} rechazó la llave (${r.status}).` };
          if(!r.ok){ errores.push(`${modelo}: ${r.status}`); if(r.status === 404) LISTAS.delete(R.id); continue; }
          const texto = sacar(await r.json()).trim();
          if(texto) return { bien: true, motor: id, modelo, texto };
          errores.push(`${modelo}: vacío`);
        }catch(e){ errores.push(`${modelo}: ${e.name === 'AbortError' ? 'no contestó a tiempo' : e.message}`); }
        finally{ clearTimeout(reloj); }
      }
    }
  }catch(e){ errores.push(String(e && e.message || e)); }
  return { bien: false, motor: id, error: `${R.nombre}: ${errores.join(' · ').slice(0, 300) || 'sin respuesta'}` };
}

function conTiempo(promesa, ms){
  let t; return Promise.race([promesa, new Promise((_, no) => { t = setTimeout(() => no(new Error('no contestó a tiempo')), Math.max(500, ms)); })]).finally(() => clearTimeout(t));
}

/* Una llave de respaldo pegada desde la app se prueba ANTES de guardarla. */
export async function probarLlaveRespaldo(id, k, hacer = fetch){
  const R = RESPALDOS[id];
  if(!R || !R.llave) return { bien: false, error: 'Ese respaldo no usa llave.' };
  try{
    const r = await hacer(`${R.base}/models`, { headers: { Authorization: `Bearer ${k}` } });
    if(r.ok) return { bien: true };
    if([400, 401, 403].includes(r.status)) return { bien: false, error: `${R.nombre} dice que esa llave no sirve (${r.status}).` };
    return { bien: false, error: `${R.nombre} contestó ${r.status}. Intenta en un minuto.` };
  }catch(e){ return { bien: false, error: `No pude comprobar la llave con ${R.nombre}: ${e.message}` }; }
}
