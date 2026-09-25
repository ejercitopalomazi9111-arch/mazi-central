/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · la IA (Paulina = Gemini, Negro = Groq) y las imágenes
   ──────────────────────────────────────────────────────────────────────────
   Las llaves de Gemini y Groq NO están aquí ni en ningún archivo del repo:
   viven como secretos del servidor de La Sala. Esta página le pide el
   trabajo a La Sala (/ia-texto, /ia-imagen) con la llave de la sala, la
   misma que la mesa guarda en este teléfono ('salaLlave'). Si la mesa ya se
   abrió en este teléfono, la herramienta entra sola.
   ═════════════════════════════════════════════════════════════════════════ */
const params = new URLSearchParams(location.search);
export const SERVIDOR = (params.get('servidor') || 'https://sala.palomazi9111.workers.dev').replace(/\/+$/, '');
export const SALA = (params.get('sala') || 'GRUPAZ').toUpperCase();

export function llave(){ try{ return localStorage.getItem('salaLlave') || ''; }catch{ return ''; } }
/* Acepta el link de la sala entero («…?sala=GRUPAZ&llave=abc») o la llave sola. */
export function ponerLlave(texto){
  const t = String(texto || '').trim();
  let k = t;
  try{ const u = new URL(t); k = u.searchParams.get('llave') || ''; }catch{}
  k = k.replace(/\s+/g, '');
  if(!k) return false;
  try{ localStorage.setItem('salaLlave', k); }catch{}
  return true;
}

async function pedir(ruta, cuerpo, { metodo = 'POST', espera = 150000 } = {}){
  const k = llave();
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), espera);
  let r;
  try{
    r = await fetch(`${SERVIDOR}/api/sala/${SALA}/${ruta}`, {
      method: metodo, signal: ctl.signal,
      headers: { ...(cuerpo ? { 'Content-Type': 'application/json' } : {}), ...(k ? { 'X-Llave': k } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  }catch(e){
    throw new Error(e.name === 'AbortError' ? 'La IA tardó demasiado y se cortó. Prueba otra vez.' : 'No hay conexión con La Sala. Revisa tu internet.');
  }finally{ clearTimeout(t); }
  if(r.status === 401 || r.status === 403){ const e = new Error('Falta la llave de La Sala (o ya no sirve). Pégala en la pestaña IA.'); e.llave = true; throw e; }
  const j = await r.json().catch(() => ({}));
  if(r.status === 404 && !j.error) throw new Error('El servidor de La Sala todavía no tiene esta función. Hay que publicarlo.');
  if(!r.ok || j.bien === false) throw new Error(j.error || `La Sala contestó ${r.status}.`);
  return j;
}
export const motores = () => pedir('motores', null, { metodo: 'GET', espera: 15000 });
/* motor: 'gemini' (Paulina) o 'groq' (Negro). mensajes: [{ de:'tu'|'yo', texto }] */
export async function texto({ motor = 'gemini', sistema, mensajes, tope = 6000, imagenes, json }){
  return (await pedir('ia-texto', { motor, sistema, mensajes, tope, ...(imagenes?.length ? { imagenes } : {}), ...(json ? { json: true } : {}) })).texto || '';
}
/* → { bytes, mime } */
export async function imagen({ prompt, imagenes = [], aspecto = '16:9', tamano = '1K' }){
  const j = await pedir('ia-imagen', { prompt, imagenes, aspecto, tamano }, { espera: 180000 });
  return { bytes: deB64(j.data), mime: j.mime || 'image/png' };
}

/* El primer objeto JSON de una respuesta, aunque venga entre ```json o con texto alrededor. */
export function sacarJson(t){
  const s = String(t || '').replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if(a < 0 || b <= a) return null;
  try{ return JSON.parse(s.slice(a, b + 1)); }catch{ return null; }
}

/* ── bytes ── */
export const deB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
export function aB64(bytes){
  let s = ''; const paso = 0x8000;
  for(let i = 0; i < bytes.length; i += paso) s += String.fromCharCode.apply(null, bytes.subarray(i, i + paso));
  return btoa(s);
}

/* ── imágenes: medir, recortar a la medida del hueco, y achicar para la IA ── */
export function cargar(src){
  return new Promise((ok, mal) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => mal(new Error('No se pudo leer la imagen.')); i.src = src; });
}
/* El aspecto permitido por Gemini más cercano a ancho/alto. */
const ASPECTOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
export function aspectoCercano(w, h){
  const r = w / h;
  return ASPECTOS.reduce((m, a) => { const [x, y] = a.split(':').map(Number); const d = Math.abs(Math.log(x / y / r)); return d < m.d ? { a, d } : m; }, { a: '16:9', d: Infinity }).a;
}
/* Recorta «cover» a la proporción pedida y topa el lado mayor. Una imagen
   que no tiene la forma del hueco sale estirada en PowerPoint: por eso toda
   imagen nueva pasa por aquí antes de entrar al archivo. */
export async function ajustar(bytes, mime, { ancho, alto, max = 1920 } = {}){
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  try{
    const img = await cargar(url);
    const W = img.naturalWidth, H = img.naturalHeight;
    const r = ancho && alto ? ancho / alto : W / H;
    let sw = W, sh = W / r;
    if(sh > H){ sh = H; sw = H * r; }
    const esc = Math.min(1, max / Math.max(sw, sh));
    const cv = document.createElement('canvas');
    cv.width = Math.round(sw * esc); cv.height = Math.round(sh * esc);
    cv.getContext('2d').drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh, 0, 0, cv.width, cv.height);
    const png = mime === 'image/png';
    const blob = await new Promise((ok) => cv.toBlob(ok, png ? 'image/png' : 'image/jpeg', 0.9));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: png ? 'image/png' : 'image/jpeg', ancho: cv.width, alto: cv.height };
  }finally{ URL.revokeObjectURL(url); }
}
/* Para mandársela a la IA: JPEG de 1280 como mucho, en base64. */
export async function paraIA(bytes, mime){
  const a = await ajustar(bytes, mime === 'image/png' ? 'image/jpeg' : mime, { max: 1280 }).catch(() => null);
  if(!a) return null;
  return { mime: 'image/jpeg', data: aB64(a.bytes) };
}

/* ── buscar fotos con licencia abierta ──
   Openverse (CORS abierto, comprobado el 25 de septiembre) y, de respaldo,
   Wikimedia Commons. Cada resultado trae autor y licencia para el crédito. */
export async function buscarFotos(q, { pagina = 1 } = {}){
  q = String(q || '').trim();
  if(!q) return [];
  try{
    const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=24&page=${pagina}&mature=false`);
    if(!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const lista = (j.results || []).map((x) => ({
      fuente: 'Openverse', titulo: x.title || '', autor: x.creator || '', licencia: (x.license || '').toUpperCase() + (x.license_version ? ' ' + x.license_version : ''),
      miniatura: x.thumbnail, grande: x.thumbnail ? x.thumbnail + (x.thumbnail.includes('?') ? '&' : '?') + 'full_size=true' : x.url, original: x.url,
      pagina: x.foreign_landing_url, ancho: x.width, alto: x.height,
    }));
    if(lista.length) return lista;
  }catch{}
  const u = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=24&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1600&format=json&origin=*`;
  const r = await fetch(u);
  if(!r.ok) throw new Error(r.status === 429 ? 'Los buscadores de fotos están ocupados. Prueba en un minuto.' : 'No se pudo buscar fotos.');
  const j = await r.json();
  const limpia = (h) => String(h || '').replace(/<[^>]*>/g, '').trim();
  return Object.values(j.query?.pages || {}).map((p) => p.imageinfo?.[0]).filter((ii) => ii && /image\/(jpeg|png|webp)/.test(ii.mime)).map((ii) => ({
    fuente: 'Wikimedia Commons', titulo: limpia(ii.extmetadata?.ObjectName?.value), autor: limpia(ii.extmetadata?.Artist?.value), licencia: limpia(ii.extmetadata?.LicenseShortName?.value),
    miniatura: ii.thumburl, grande: ii.thumburl, original: ii.url, pagina: ii.descriptionurl, ancho: ii.width, alto: ii.height,
  }));
}
export async function bajar(foto){
  for(const u of [foto.grande, foto.original].filter(Boolean)){
    try{
      const r = await fetch(u);
      if(!r.ok) continue;
      const b = await r.blob();
      if(!/^image\//.test(b.type)) continue;
      return { bytes: new Uint8Array(await b.arrayBuffer()), mime: b.type };
    }catch{}
  }
  throw new Error('Esa foto no se deja bajar. Prueba con otra.');
}

/* ── el banco de imágenes (sala/servidor/banco.js) ──
   Las imágenes piden la llave en una cabecera, así que no pueden ir en un
   <img src> directo: se bajan con fetch y se muestran como blob. Con
   Cache-Control immutable el navegador no las vuelve a bajar. */
export const banco = {
  lista: async () => (await pedir('banco', null, { metodo: 'GET', espera: 30000 })).fichas || [],
  subir: async (datos) => (await pedir('banco', { accion: 'subir', ...datos }, { espera: 120000 })).ficha,
  cambiar: async (id, campos) => (await pedir('banco', { accion: 'cambiar', id, campos })).ficha,
  cambiarVarias: async (ids, campos = {}, agregarTemas = '') => (await pedir('banco', { accion: 'cambiarVarias', ids, campos, agregarTemas })).fichas || [],
  borrar: (id) => pedir('banco', { accion: 'borrar', id }),
  async bytes(id, parte = ''){
    const k = llave();
    const r = await fetch(`${SERVIDOR}/api/sala/${SALA}/banco?id=${encodeURIComponent(id)}${parte ? '&parte=' + parte : ''}`, { headers: k ? { 'X-Llave': k } : {} });
    if(r.status === 401){ const e = new Error('Falta la llave de La Sala.'); e.llave = true; throw e; }
    if(!r.ok) throw new Error('No se pudo bajar la imagen del banco.');
    const b = await r.blob();
    return { bytes: new Uint8Array(await b.arrayBuffer()), mime: b.type || 'image/jpeg', blob: b };
  },
};

/* Mis elementos: lo que Carlos arma y guarda para reusar (sala/servidor/elementos.js). */
export const elementos = {
  lista: async () => (await pedir('elementos', null, { metodo: 'GET', espera: 30000 })).elementos || [],
  guardar: async (x) => (await pedir('elementos', { accion: 'guardar', ...x }, { espera: 120000 })).elemento,
  renombrar: async (id, nombre) => (await pedir('elementos', { accion: 'renombrar', id, nombre })).elemento,
  borrar: (id) => pedir('elementos', { accion: 'borrar', id }),
  datos: (id) => pedir(`elementos?id=${encodeURIComponent(id)}`, null, { metodo: 'GET', espera: 60000 }),
};

/* Que Paulina mire una imagen y la registre. Regresa campos para la ficha. */
const SISTEMA_DESCRIBIR = `Registras imágenes en el banco de imágenes de Carlos, que las usa para actualizar presentaciones escolares y de trabajo. Miras UNA imagen y contestas SOLO un objeto JSON:
{"titulo":"de 2 a 8 palabras, lo que es","descripcion":"una a tres frases de lo que se ve: personas, objetos, lugar, estilo, colores","temas":["3 a 6 temas generales, p. ej. ciencia, tecnología, escuela, alimentación"],"palabras":["6 a 15 palabras clave para buscarla: objetos, colores, lugar, estilo, tipo de imagen (foto, ilustración, diagrama, ícono)"],"texto_visible":"el texto que aparece en la imagen, o vacío","problemas":"lo que impediría usarla tal cual en una lámina (borrosa, marca de agua, texto cortado, baja resolución, fondo que no combina), o vacío"}
Todo en español de México, en minúsculas los temas y palabras. No inventes lo que no se ve.`;
export async function describir(bytes, mime){
  const x = await paraIA(bytes, mime);
  if(!x) throw new Error('No se pudo leer esa imagen.');
  const t = await texto({ motor: 'gemini', sistema: SISTEMA_DESCRIBIR, mensajes: [{ de: 'tu', texto: 'Registra esta imagen.' }], tope: 1200, imagenes: [x], json: true });
  const j = sacarJson(t);
  if(!j) throw new Error('Paulina no contestó con la ficha.');
  const lista = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  const palabras = lista(j.palabras);
  if(j.texto_visible) palabras.push(...String(j.texto_visible).toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 8));
  return {
    titulo: String(j.titulo || '').trim(), descripcion: String(j.descripcion || '').trim(),
    temas: lista(j.temas), palabras: [...new Set(palabras)], problemas: String(j.problemas || '').trim(), ia: true,
  };
}
