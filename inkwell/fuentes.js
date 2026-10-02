/* ══════════════════════════════════════════════════════════════════════════
   INKWELL · las fuentes (adaptadores, regla §2)
   ──────────────────────────────────────────────────────────────────────────
   Cada fuente sabe tres cosas: reconocer su link, leer la serie (nombre,
   portada, lista de capítulos) y leer un capítulo. Si mañana una cambia su
   página, se arregla SU adaptador y nada más.
   · WEBTOON: imágenes. Se pide por el recadero de La Sala (`pedir`), porque
     Webtoon no da CORS y sus imágenes exigen venir «de webtoons.com».
     La lista de capítulos sale completa de su API para teléfono.
   · WATTPAD: texto. Su API sí da CORS: se pide directo (`directo`).
   Lo que se baja vive SÓLO en el teléfono: nada se publica ni se comparte.
   ═════════════════════════════════════════════════════════════════════════ */

/* ── reconocer un link ── */
export function reconocer(texto){
  const t = String(texto || '').trim();
  let m = /webtoons\.com\/([a-z]{2}(?:-[a-z]+)?)\/([^/?#]+)\/([^/?#]+)\/(?:list|[^/?#]+\/viewer)[^#]*[?&]title_no=(\d+)/i.exec(t);
  if(m) return { fuente: 'webtoon', lang: m[1].toLowerCase(), genero: m[2], slug: m[3], titleNo: m[4], canvas: /^(canvas|challenge)$/i.test(m[2]) };
  m = /wattpad\.com\/story\/(\d+)/i.exec(t);
  if(m) return { fuente: 'wattpad', story: m[1] };
  m = /wattpad\.com\/(\d+)(?:-|$|\?)/i.exec(t);
  if(m) return { fuente: 'wattpad', part: m[1] };
  return null;
}

const meta = (html, prop) => {
  const m = new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`, 'i').exec(html)
        || new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${prop}"`, 'i').exec(html);
  return m ? desentidad(m[1]).trim() : '';
};
export function desentidad(s){
  return String(s).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/* ── WEBTOON ── */
export const webtoon = {
  id: (r) => `webtoon:${r.titleNo}`,
  async serie(r, pedir){
    const lista = `https://www.webtoons.com/${r.lang}/${r.genero}/${r.slug}/list?title_no=${r.titleNo}`;
    const html = await (await pedir(lista)).text();
    const titulo = meta(html, 'og:title') || (/<title>([^<|]+)/i.exec(html) || [])[1]?.trim() || r.slug.replace(/-/g, ' ');
    const autor = meta(html, 'com-linewebtoon:webtoon:author') || (/class="author[^"]*"[^>]*>([^<]+)/i.exec(html) || [])[1]?.trim() || '';
    const api = `https://m.webtoons.com/api/v1/${r.canvas ? 'canvas' : 'webtoon'}/${r.titleNo}/episodes?pageSize=99999`;
    const j = await (await pedir(api)).json();
    const eps = (j.result && j.result.episodeList) || [];
    if(!eps.length) throw new Error('Webtoon no dio la lista de capítulos de esa serie.');
    return {
      id: webtoon.id(r), fuente: 'webtoon', ref: r, titulo, autor,
      portada: meta(html, 'og:image'), descripcion: meta(html, 'og:description'), enlace: lista,
      caps: eps.map((e) => ({ n: e.episodeNo, titulo: desentidad(e.episodeTitle || `Episodio ${e.episodeNo}`), url: 'https://www.webtoons.com' + e.viewerLink, fecha: e.exposureDateMillis || null }))
        .sort((a, b) => a.n - b.n),
    };
  },
  /* las direcciones de las imágenes de un capítulo, en orden */
  async capitulo(cap, pedir){
    const html = await (await pedir(cap.url)).text();
    const urls = [...html.matchAll(/class="_images"[^>]*?data-url="([^"]+)"/g)].map((m) => desentidad(m[1]));
    if(!urls.length) throw new Error(/age|verify|adult/i.test(html) ? 'Ese capítulo pide verificar la edad en Webtoon.' : 'No encontré las imágenes del capítulo.');
    return { tipo: 'imagenes', urls };
  },
};

/* ── WATTPAD ── */
const WP = 'https://www.wattpad.com';
export const wattpad = {
  id: (story) => `wattpad:${story}`,
  async serie(r, directo){
    let story = r.story;
    if(!story){
      const p = await (await directo(`${WP}/api/v3/story_parts/${r.part}?fields=groupId`)).json();
      story = p.groupId;
      if(!story) throw new Error('No encontré de qué historia es ese capítulo.');
    }
    const j = await (await directo(`${WP}/api/v3/stories/${story}?fields=id,title,description,cover,user(name),parts(id,title,createDate)`)).json();
    if(!j.parts || !j.parts.length) throw new Error(j.message || 'Wattpad no dio los capítulos de esa historia.');
    return {
      id: wattpad.id(story), fuente: 'wattpad', ref: { fuente: 'wattpad', story: String(story) }, titulo: j.title || 'Sin título',
      autor: (j.user && j.user.name) || '', portada: j.cover || '', descripcion: j.description || '', enlace: `${WP}/story/${story}`,
      caps: j.parts.map((p, i) => ({ n: i + 1, id: String(p.id), titulo: p.title || `Parte ${i + 1}`, url: `${WP}/${p.id}`, fecha: p.createDate ? Date.parse(p.createDate) : null })),
    };
  },
  async capitulo(cap, directo){
    const html = await (await directo(`${WP}/apiv2/?m=storytext&id=${cap.id}`)).text();
    if(!html.trim()) throw new Error('Wattpad no dio el texto de ese capítulo.');
    return { tipo: 'texto', html };
  },
  async buscar(q, directo){
    const j = await (await directo(`${WP}/api/v3/stories?query=${encodeURIComponent(q)}&limit=20&fields=stories(id,title,cover,user(name),numParts,description)`)).json();
    return (j.stories || []).map((s) => ({ story: s.id, titulo: s.title, autor: s.user && s.user.name, portada: s.cover, partes: s.numParts, descripcion: s.description || '' }));
  },
};
export const FUENTES = { webtoon, wattpad };

/* ── texto seguro ──
   El texto de Wattpad llega como HTML de otra persona: se reconstruye sólo con
   párrafos, saltos e itálicas/negritas. Nada de scripts, estilos, imágenes,
   enlaces ni atributos. */
const PERMITIDOS = new Set(['P', 'BR', 'B', 'I', 'EM', 'STRONG', 'U']);
export function limpiarTexto(html, doc = document){
  const fuente = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  const sale = doc.createElement('div');
  const copiar = (de, a) => {
    for(const n of de.childNodes){
      if(n.nodeType === 3){ a.append(doc.createTextNode(n.nodeValue)); continue; }
      if(n.nodeType !== 1) continue;
      if(PERMITIDOS.has(n.tagName)){ const e = doc.createElement(n.tagName.toLowerCase()); copiar(n, e); a.append(e); }
      else if(!/^(SCRIPT|STYLE|IFRAME|OBJECT|IMG|VIDEO|AUDIO|SVG)$/.test(n.tagName)) copiar(n, a);
    }
  };
  copiar(fuente, sale);
  return sale.innerHTML;
}
