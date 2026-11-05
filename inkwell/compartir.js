/* ══════════════════════════════════════════════════════════════════════════
   INKWELL · compartir series y descubrir cómics
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 4 de noviembre: «que pueda mandarle a alguien más el código de mis
   series para que pueda descargarlas todas de un jalón, y que solito busque
   cómics y los ponga en la lista de descarga para siempre tener algo que leer».

   · El código es la LISTA de series (de dónde son y cuál), nada de lo bajado
     ni de lo leído: cabe en un link y no necesita servidor. «INK1.» + base64url.
   · Descubrir lee el ranking de Webtoon (por el mismo recadero) y propone las
     que no sigues ni quitaste, primero las de los géneros que ya lees.
   Todo aquí es puro, para poder probarlo sin navegador.
   ═════════════════════════════════════════════════════════════════════════ */
import { reconocer, desentidad } from './fuentes.js';

const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64url = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))));

/* lo mínimo de cada serie para volver a encontrarla */
export function codigoDe(series){
  const l = (series || []).map((s) => s.fuente === 'webtoon'
    ? ['w', s.ref.lang, s.ref.genero, s.ref.slug, String(s.ref.titleNo), s.ref.canvas ? 1 : 0]
    : ['p', String(s.ref.story)]);
  return 'INK1.' + b64url(JSON.stringify(l));
}

/* un código o un link con #series=… → las referencias; null si no es un código */
export function leerCodigo(texto){
  const t = String(texto || '').trim();
  const m = /(?:#|[?&])series=(INK1\.[\w-]+)/.exec(t) || /^(INK1\.[\w-]+)$/.exec(t);
  if(!m) return null;
  try{
    const l = JSON.parse(deB64url(m[1].slice(5)));
    if(!Array.isArray(l)) return null;
    return l.map((x) => x[0] === 'w' ? { fuente: 'webtoon', lang: String(x[1]), genero: String(x[2]), slug: String(x[3]), titleNo: String(x[4]), canvas: !!x[5] }
      : x[0] === 'p' ? { fuente: 'wattpad', story: String(x[1]) } : null).filter((r) => r && (r.titleNo || r.story)).slice(0, 300);
  }catch{ return null; }
}

/* las series de una página de ranking de Webtoon, en el orden en que salen */
export function seriesDeRanking(html){
  const vistas = new Set(), out = [];
  for(const m of String(html || '').matchAll(/href="(https:\/\/www\.webtoons\.com\/[^"]*\/list\?title_no=\d+)"/g)){
    const r = reconocer(m[1].replace(/&amp;/g, '&'));
    if(r && r.fuente === 'webtoon' && !vistas.has(r.titleNo)){ vistas.add(r.titleNo); out.push(r); }
  }
  return out;
}

/* a cuáles conviene: las que no sigue ni quitó; primero los géneros que ya lee */
export function elegirNuevas(candidatas, { sigo = [], descartadas = [], generos = [], cuantas = 1 } = {}){
  const fuera = new Set([...sigo, ...descartadas]);
  const libres = candidatas.filter((r) => !fuera.has(`webtoon:${r.titleNo}`));
  const gusto = new Set(generos);
  return [...libres.filter((r) => gusto.has(r.genero)), ...libres.filter((r) => !gusto.has(r.genero))].slice(0, cuantas);
}

/* ── explorar por categoría (los géneros de Webtoon) ── */
export const GENEROS = [['romance', 'Romance'], ['fantasy', 'Fantasía'], ['action', 'Acción'], ['drama', 'Drama'], ['comedy', 'Comedia'], ['thriller', 'Suspenso'], ['horror', 'Terror'], ['mystery', 'Misterio'], ['supernatural', 'Sobrenatural'], ['sf', 'Ciencia ficción'], ['slice-of-life', 'Vida cotidiana'], ['historical', 'Histórico'], ['super-hero', 'Superhéroes'], ['sports', 'Deportes'], ['heartwarming', 'Conmovedor']];
const sinEnt = (s) => desentidad(s || '').trim();
/* las tarjetas de una página de género: link, título, autor y portada, sin repetir */
export function seriesDeGenero(html){
  const vistas = new Set(), out = [];
  for(const m of String(html || '').matchAll(/<a href="(https:\/\/www\.webtoons\.com\/[^"]*\/list\?title_no=\d+)"[^>]*>([\s\S]*?)<\/a>/g)){
    const ref = reconocer(m[1].replace(/&amp;/g, '&'));
    if(!ref || ref.fuente !== 'webtoon' || vistas.has(ref.titleNo)) continue;
    const titulo = sinEnt((/<strong class="title">([^<]*)/.exec(m[2]) || [])[1]);
    if(!titulo) continue;
    vistas.add(ref.titleNo);
    out.push({ ref, titulo, autor: sinEnt((/<div class="author">([^<]*)/.exec(m[2]) || [])[1]), portada: sinEnt((/<img[^>]+src="([^"]+)"/.exec(m[2]) || [])[1]) });
  }
  return out;
}
