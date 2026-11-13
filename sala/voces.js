/* voces.js — LAS VOCES QUE SE PUEDEN ELEGIR (pizarrón de La Sala y CARYMO)
 * ===========================================================================
 * Carlos, 13 nov: «la voz en teléfono es feísima, mete varias voces para que la
 * gente en perfil pueda elegir una» y «asegúrate que JAMÁS la voz lea el prompt,
 * sólo la respuesta».
 *
 *   nube:<nombre>  Deepgram Aura-2 en español, por Cloudflare (sin llave). Suena
 *                  de estudio. Lo gratis alcanza para ~3,600 letras al día para
 *                  toda la cuenta; después el servidor contesta con MeloTTS solo.
 *   nube:melo      MeloTTS: casi ilimitada, más plana.
 *   google:<Voz>   Gemini TTS: muy natural, tarda más en arrancar.
 *   tel:<nombre>   Una voz instalada en el teléfono (las «Mejoradas» del iPhone
 *                  suenan bien; las de fábrica, a robot).
 *   no             Sin voz: sólo el pizarrón.
 *
 * Si la elegida falla, se baja sola a la del teléfono y se avisa una vez.
 * Lo que se lee pasa por `paraDecir`, que tira cualquier cosa que parezca una
 * instrucción para la IA en vez de la explicación.
 * ===========================================================================*/

export const VOCES = [
  { id: 'nube:estrella', nombre: 'Estrella', desc: 'Mujer · México', grupo: 'Voces de estudio' },
  { id: 'nube:javier', nombre: 'Javier', desc: 'Hombre · México', grupo: 'Voces de estudio' },
  { id: 'nube:sirio', nombre: 'Sirio', desc: 'Hombre · México', grupo: 'Voces de estudio' },
  { id: 'nube:selena', nombre: 'Selena', desc: 'Mujer · Latinoamérica', grupo: 'Voces de estudio' },
  { id: 'nube:aquila', nombre: 'Áquila', desc: 'Hombre · Latinoamérica', grupo: 'Voces de estudio' },
  { id: 'nube:celeste', nombre: 'Celeste', desc: 'Mujer · Colombia', grupo: 'Voces de estudio' },
  { id: 'nube:carina', nombre: 'Carina', desc: 'Mujer · España', grupo: 'Voces de estudio' },
  { id: 'nube:alvaro', nombre: 'Álvaro', desc: 'Hombre · España', grupo: 'Voces de estudio' },
  { id: 'nube:melo', nombre: 'Melo', desc: 'Sencilla, nunca se acaba', grupo: 'Voces de estudio' },
  { id: 'google:Kore', nombre: 'Kore', desc: 'Mujer · muy natural, tarda más', grupo: 'Google' },
  { id: 'google:Charon', nombre: 'Caronte', desc: 'Hombre · muy natural, tarda más', grupo: 'Google' },
  { id: 'google:Aoede', nombre: 'Aoede', desc: 'Mujer joven · tarda más', grupo: 'Google' },
  { id: 'google:Puck', nombre: 'Puck', desc: 'Hombre joven · tarda más', grupo: 'Google' },
];
export const VOZ_DE_FABRICA = 'nube:estrella';

/* ── lo que se OYE: nada que no sea la explicación ── */
const SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '⁰': '0', '¹': '1', '²': ' al cuadrado', '³': ' al cubo' };
/* frases que delatan que lo que llegó es la instrucción y no la clase */
const ES_PROMPT = /(\bcontesta s[óo]lo\b|\bs[óo]lo (con )?json\b|\bjson v[áa]lido\b|\bresponde (s[óo]lo|únicamente)\b|^\s*eres (la|el|un|una) |\bsin markdown\b|\breglas:|\bformato:|"tipo"\s*:|"voz"\s*:|\bpizarra"\s*:|^\s*(sistema|system|prompt)\s*:|\bexpl[ií]calo (en espa[ñn]ol|como)\b|\bdilo en espa[ñn]ol\b)/im;
export function paraDecir(t){
  let s = String(t ?? '');
  /* si viene un pedazo de JSON (llaves, comillas con dos puntos), no se lee */
  s = s.replace(/\{[^{}]*\}/g, ' ').replace(/\[[^\[\]]*\]/g, ' ');
  /* renglón por renglón: el que parece instrucción se va */
  s = s.split(/\n+/).filter((r) => !ES_PROMPT.test(r)).join(' ');
  if(ES_PROMPT.test(s)) return '';
  s = s.replace(/[₀-₉⁰¹²³]/g, (c) => SUBS[c]).replace(/\s*(→|⟶|=>)\s*/g, ' produce ').replace(/\s=\s/g, ' igual a ')
    .replace(/\s\+\s/g, ' más ').replace(/\s[·×]\s/g, ' por ').replace(/\*\*|__|\(\(|\)\)/g, '').replace(/[#*_`~<>|]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return s;
}

/* ── las del teléfono ── */
let delTel = [];
const cargar = () => { try{ delTel = (speechSynthesis.getVoices && speechSynthesis.getVoices()) || []; }catch{ delTel = []; } };
if(typeof speechSynthesis !== 'undefined'){ cargar(); speechSynthesis.addEventListener?.('voiceschanged', cargar); }
export function vocesDelTelefono(){
  const es = delTel.filter((v) => /^es/i.test(v.lang));
  /* primero las mejoradas y las de México */
  const peso = (v) => (/premium|mejorad|enhanced|neural|natural/i.test(v.name) ? 0 : 2) + (/MX|419|US/i.test(v.lang) ? 0 : 1);
  return es.sort((a, b) => peso(a) - peso(b)).map((v) => ({ id: 'tel:' + v.name, nombre: v.name.replace(/\s*\(.*\)$/, ''), desc: `Del teléfono · ${v.lang}`, grupo: 'Del teléfono' }));
}
function vozTel(id){
  const es = delTel.filter((v) => /^es/i.test(v.lang));
  const nombre = String(id || '').replace(/^tel:/, '');
  return es.find((v) => v.name === nombre) || es.find((v) => /MX/i.test(v.lang)) || es.find((v) => /419|US/i.test(v.lang)) || es[0] || null;
}
export function todas(){ return [...VOCES, ...vocesDelTelefono()]; }
export function nombreDe(id){ if(id === 'no') return 'Sin voz'; const v = todas().find((x) => x.id === id); return v ? v.nombre : (String(id).startsWith('tel:') ? String(id).slice(4) : 'Estrella'); }

/* ── el iPhone sólo deja hablar si arrancó con un toque ── */
export function despertar(){
  try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }catch{}
  try{ if(!despertar.a){ despertar.a = new Audio(); } despertar.a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; despertar.a.play().catch(() => {}); }catch{}
}

/* ── hablar ── */
function wav(b64, mime){
  const crudo = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if(!/L16|pcm/i.test(mime)) return new Blob([crudo], { type: mime });
  const rate = +(/rate=(\d+)/.exec(mime) || [, 24000])[1], h = new DataView(new ArrayBuffer(44));
  const s = (o, t) => [...t].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF'); h.setUint32(4, 36 + crudo.length, true); s(8, 'WAVE'); s(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); s(36, 'data'); h.setUint32(40, crudo.length, true);
  return new Blob([h.buffer, crudo], { type: 'audio/wav' });
}

/* crearVoz({ pedir }) — `pedir(cuerpo)` llama a /ia-voz de La Sala y regresa el JSON */
export function crearVoz({ pedir, alFallar } = {}){
  const audios = new Map();   // texto+voz → Promise<url>
  let actual = null, velocidad = 1, avisado = false;
  const clave = (t, v) => v + '|' + t;
  function precargar(texto, voz){
    const t = paraDecir(texto);
    if(!t || !voz || voz === 'no' || voz.startsWith('tel:')) return null;
    const k = clave(t, voz);
    if(!audios.has(k)){
      const p = (async () => {
        const j = await pedir({ texto: t.slice(0, 1500), voz });
        if(!j || !j.bien) throw new Error((j && j.error) || 'La voz no contestó.');
        return URL.createObjectURL(wav(j.data, j.mime));
      })();
      p.catch(() => audios.delete(k));
      audios.set(k, p);
    }
    return audios.get(k);
  }
  function porTelefono(t, voz){
    return new Promise((fin) => {
      if(typeof speechSynthesis === 'undefined' || !t){ fin(); return; }
      const u = new SpeechSynthesisUtterance(t); const v = vozTel(voz);
      if(v){ u.voice = v; u.lang = v.lang; } else u.lang = 'es-MX';
      u.rate = Math.min(2, 1.02 * velocidad); u.onend = u.onerror = () => fin();
      speechSynthesis.speak(u);
      /* Safari a veces nunca avisa que terminó: tope por largo del texto */
      setTimeout(fin, Math.max(4000, t.split(/\s+/).length * 700 / velocidad));
    });
  }
  async function decir(texto, voz){
    callar();
    const t = paraDecir(texto);
    if(!t || voz === 'no') return;
    if(!voz || voz.startsWith('tel:')) return porTelefono(t, voz);
    try{
      const url = await precargar(t, voz);
      return await new Promise((fin) => { const a = new Audio(url); actual = a; a.playbackRate = velocidad; a.onended = a.onerror = () => fin(); a.play().catch(() => fin()); });
    }catch(e){
      if(!avisado){ avisado = true; alFallar && alFallar(e); }
      return porTelefono(t, 'tel:');
    }
  }
  function callar(){ try{ speechSynthesis.cancel(); }catch{} if(actual){ try{ actual.pause(); }catch{} actual = null; } }
  return {
    decir, precargar, callar,
    set velocidad(v){ velocidad = v; if(actual) actual.playbackRate = v; }, get velocidad(){ return velocidad; },
    olvidar(){ for(const p of audios.values()) p.then((u) => URL.revokeObjectURL(u)).catch(() => {}); audios.clear(); },
  };
}
