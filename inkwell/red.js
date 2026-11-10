/* INKWELL · la red: Webtoon por el recadero de La Sala. Primero por la PUERTA (la misma
   dirección de la Central: para el iPhone no es otro sitio); si la página se abrió desde otro
   lado y no hay puerta, directo a La Sala. ?servidor= lo fija (pruebas). Lo usan Tiras y el inicio. */
import { seriesDeGenero } from './compartir.js';
const params = new URLSearchParams(location.search);
const DIRECTO = 'https://sala.palomazi9111.workers.dev';
const FIJO = (params.get('servidor') || '').replace(/\/+$/, '');
let bases = FIJO ? [FIJO] : [...new Set([/^https?:$/.test(location.protocol) ? location.origin : '', DIRECTO].filter(Boolean))];
export async function pedir(u){
  const ruta = '/api/sala/inkwell/traer?url=' + encodeURIComponent(u);
  let ultimo;
  for(const b of bases){
    try{
      const r = await fetch(b + ruta);
      /* la puerta de la Central marca lo que contestó La Sala; sin marca y con
         404 es que aquí no hay puerta (github.io, localhost): se brinca */
      if(!FIJO && b === location.origin && b !== DIRECTO && !r.headers.get('X-Puerta')){ ultimo = new Error('sin puerta'); continue; }
      if(!r.ok){ let m = ''; try{ m = (await r.json()).error; }catch{} throw new Error(m || `Webtoon contestó ${r.status}`); }
      if(bases[0] !== b) bases = [b, ...bases.filter((x) => x !== b)];   // la que sirvió, primero
      return r;
    } catch(e){ ultimo = e; }
  }
  throw ultimo || new Error('No hay conexión con La Sala.');
}

/* ── recomendaciones sin buscar: lo más querido de tus géneros en Webtoon, sin lo que ya sigues ──
   Se guarda 6 horas para no pedir a Webtoon en cada visita. */
const BASE_GENEROS = ['romance', 'fantasy', 'drama', 'action', 'comedy'];
export async function recomendar({ sigo = [], descartadas = [], generos = [], lang = 'es', cuantas = 18, fresco = false } = {}){
  const clave = 'inkwell.recomendadas', ahora = Date.now();
  const fuera = new Set([...sigo, ...descartadas]);
  let guardado = null; try{ guardado = JSON.parse(localStorage.getItem(clave)); }catch{}
  const gs = [...new Set([...generos, ...BASE_GENEROS])].slice(0, 3);
  let todas;
  if(!fresco && guardado && ahora - guardado.t < 6 * 36e5 && guardado.lang === lang && guardado.gs === gs.join()) todas = guardado.lista;
  else{
    const listas = await Promise.all(gs.map((g) => pedir(`https://www.webtoons.com/${lang}/genres/${g}?sortOrder=LIKEIT`).then((r) => r.text()).then((h) => seriesDeGenero(h).map((x) => ({ ...x, genero: g }))).catch(() => [])));
    todas = []; const vistas = new Set();
    for(let i = 0; i < 80; i++) for(const l of listas){ const x = l[i]; if(x && !vistas.has(x.ref.titleNo)){ vistas.add(x.ref.titleNo); todas.push(x); } }
    if(todas.length) try{ localStorage.setItem(clave, JSON.stringify({ t: ahora, lang, gs: gs.join(), lista: todas })); }catch{}
  }
  return todas.filter((x) => !fuera.has('webtoon:' + x.ref.titleNo)).slice(0, cuantas);
}
export const enlaceDe = (r) => `https://www.webtoons.com/${r.lang}/${r.genero}/${r.slug}/list?title_no=${r.titleNo}`;
