/* EL NAVEGADOR DE MAZI VR (Carlos, 25 nov: «tienes que encontrar alguna manera de meterle un navegador… me vale lo que se
   pueda o no se pueda»).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   El problema: casi todos los sitios prohíben mostrarse dentro de otra página (X-Frame-Options / frame-ancestors), y de lo
   que sí se deja, el visor no puede tocar nada (es de otro sitio). Por eso «Si sale en blanco, ese sitio no se deja».
   La salida: La Sala baja la página y la entrega LIMPIA desde nuestra propia dirección (la puerta de la Central pasa
   /api/sala/… sin cambiar de sitio). Así:
     · se muestra siempre (los encabezados que la bloqueaban ya no vienen);
     · es del mismo sitio que el visor: el visor puede leerla, bajarla, y picarle a los enlaces y a las cajas de texto;
     · NO corre ningún script de ella: se quitan todos, y además el marco va con `sandbox` sin `allow-scripts`.
   Lo que no se puede (y se dice): lo que sólo existe con JavaScript (apps como Netflix, Instagram, Gmail) sale vacío o
   a medias; páginas de contenido (Wikipedia, noticias, documentación, blogs, buscadores sin JS) se ven bien.
     GET /api/sala/vr/web?u=<dirección>   → HTML limpio (o 302 a la dirección si no es una página: imágenes, PDF…)
     GET /api/sala/vr/web?q=<búsqueda>    → la búsqueda en DuckDuckGo sin JavaScript
   Candados: sólo GET, sólo http/https, nada de direcciones internas, máximo 4 MB, y sólo si lo pide una página nuestra
   (Referer de la Central o de localhost) — no es un proxy abierto para cualquiera. */
const RUTA = '/api/sala/vr/web';
const MAX = 4 * 1024 * 1024;
const NUESTROS = /^(https?:\/\/)?(mazi-central\.palomazi9111\.workers\.dev|localhost(:\d+)?|127\.0\.0\.1(:\d+)?|[\w-]+\.github\.io)(\/|$)/i;

export const aProxy = (u) => `${RUTA}?u=${encodeURIComponent(u)}`;
export function buscarEn(q){ return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`; }
/* lo que se escribe en el visor: si parece dirección, dirección; si no, búsqueda */
export function interpretar(texto){
  const t = String(texto || '').trim(); if(!t) return null;
  if(/^https?:\/\//i.test(t)) return t;
  if(!/\s/.test(t) && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/i.test(t)) return 'https://' + t;
  return buscarEn(t);
}
function interna(u){
  let h; try{ const x = new URL(u); if(!/^https?:$/.test(x.protocol)) return true; h = x.hostname.toLowerCase(); }catch{ return true; }
  return h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '[::1]' || /^\[f[cd]/.test(h);
}
const abs = (u, base) => { try{ return new URL(u.trim(), base).href; }catch{ return null; } };
const comillas = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/* LIMPIAR: sin scripts ni nada que ejecute; enlaces a través de la puerta; recursos (imágenes, estilos) directo de su sitio */
export function limpiar(html, base){
  let s = String(html);
  s = s.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '').replace(/<script\b[^>]*\/?>/gi, '');
  s = s.replace(/<(iframe|frame|frameset|object|embed|applet|portal)\b[\s\S]*?<\/\1\s*>/gi, '').replace(/<(iframe|frame|object|embed|applet|portal)\b[^>]*\/?>/gi, '');
  s = s.replace(/<\/?noscript\b[^>]*>/gi, '');   /* lo de «sin JavaScript» es justo lo que sí se ve aquí */
  s = s.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?(refresh|content-security-policy|set-cookie)[^>]*>/gi, '');
  s = s.replace(/<link\b[^>]*rel\s*=\s*["']?(preload|modulepreload|prefetch|manifest|serviceworker)[^>]*>/gi, (m) => (/as\s*=\s*["']?style/i.test(m) ? m : ''));
  s = s.replace(/<base\b[^>]*>/gi, '');
  /* atributos que ejecutan algo */
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\s(href|src|action|formaction|xlink:href)\s*=\s*(["']?)\s*(javascript|vbscript|data:text\/html)[^"'>\s]*\2/gi, ' $1="#"');
  /* cada etiqueta con dirección: enlaces → la puerta; recursos → absolutos a su sitio */
  s = s.replace(/<(a|area)\b([^>]*)>/gi, (m, t, at) => {
    at = at.replace(/\starget\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return `<${t}${at.replace(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i, (_, __, a, b, c) => { const v = (a ?? b ?? c ?? '').replace(/&amp;/g, '&'); if(v.startsWith('#')) return ` href="${comillas(v)}"`; const u = abs(v, base); return u ? ` href="${comillas(aProxy(u))}"` : ''; })}>`;
  });
  s = s.replace(/<form\b([^>]*)>/gi, (m, at) => {
    const ac = at.match(/\saction\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i), v = ac ? (ac[2] ?? ac[3] ?? ac[4] ?? '').replace(/&amp;/g, '&') : '';
    const u = abs(v || base, base) || base;
    return `<form data-mazi-accion="${comillas(u)}"${at.replace(/\s(action|method|target)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')} method="get" action="${comillas(RUTA)}"><input type="hidden" name="u" value="${comillas(u)}">`;
  });
  s = s.replace(/<(img|source|video|audio|track|input|link|image|use)\b([^>]*)>/gi, (m, t, at) =>
    `<${t}${at.replace(/\s(src|href|poster|data-src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (_, k, __, a, b, c) => { const v = (a ?? b ?? c ?? '').replace(/&amp;/g, '&'); const u = abs(v, base); return u ? ` ${k}="${comillas(u)}"` : ''; })
      .replace(/\ssrcset\s*=\s*("([^"]*)"|'([^']*)')/gi, (_, __, a, b) => ` srcset="${comillas((a ?? b).split(',').map((p) => { const [u, ...r] = p.trim().split(/\s+/); return [abs(u, base) || u, ...r].join(' '); }).join(', '))}"`)
      .replace(/\sloading\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')}>`);
  /* url(…) relativas dentro de estilos escritos en la página */
  s = s.replace(/url\(\s*(['"]?)(?!data:|https?:|#)([^'")]+)\1\s*\)/gi, (m, q, u) => { const a = abs(u, base); return a ? `url("${a}")` : m; });
  /* lo nuestro: que se lea a 1280 px y una marca para saber de dónde vino */
  const extra = `<meta name="mazi-origen" content="${comillas(base)}"><style>html{scroll-behavior:auto}body{min-width:0!important}img{max-width:100%;height:auto}</style>`;
  if(/<head\b[^>]*>/i.test(s)) s = s.replace(/<head\b[^>]*>/i, (h) => h + extra); else s = extra + s;
  if(!/<!doctype/i.test(s.slice(0, 200))) s = '<!doctype html>' + s;
  return s;
}

const pagina = (titulo, texto) => new Response(`<!doctype html><meta charset="utf-8"><body style="font:28px system-ui;background:#170A26;color:#F4EEF2;padding:60px"><h1 style="color:#F7A23B">${titulo}</h1><p>${texto}</p></body>`,
  { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

export async function navegar(url, pedido){
  if(pedido.method !== 'GET') return new Response('Sólo GET.', { status: 405 });
  const ref = pedido.headers.get('referer') || '', dest = pedido.headers.get('sec-fetch-dest') || '';
  if(!NUESTROS.test(ref) && dest !== 'iframe') return new Response('Sólo desde Mazi VR.', { status: 403 });
  let destino = url.searchParams.get('u');
  const q = url.searchParams.get('q');
  if(!destino && q != null) destino = buscarEn(q);
  /* un formulario (GET) llega como ?u=<acción>&campo=valor…: se pegan los campos a la acción */
  if(destino){ const extra = [...url.searchParams].filter(([k], i, todos) => k !== 'u' && !(k === 'q' && !url.searchParams.has('u')));   /* un campo llamado «q» (casi todos los buscadores) sí va */ if(extra.length){ const d = new URL(destino); extra.forEach(([k, v]) => d.searchParams.append(k, v)); destino = d.href; } }
  destino = interpretar(destino);
  if(!destino) return pagina('Escribe algo', 'Una dirección (wikipedia.org) o lo que quieras buscar.');
  if(interna(destino)) return pagina('No', 'Esa dirección no se puede abrir.');
  let r;
  try{ r = await fetch(destino, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; MaziVR/1.0; +https://mazi-central.palomazi9111.workers.dev)', 'accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'accept-language': 'es-MX,es;q=0.9,en;q=0.7' } }); }
  catch(e){ return pagina('No contestó', `No se pudo abrir ${destino.replace(/</g, '&lt;')}.`); }
  const tipo = r.headers.get('content-type') || '';
  if(!/html|xml/i.test(tipo)) return Response.redirect(r.url || destino, 302);   /* imagen, PDF, video: que lo abra el navegador */
  const largo = +(r.headers.get('content-length') || 0); if(largo > MAX) return pagina('Muy pesada', 'Esa página pesa más de 4 MB.');
  const texto = (await r.text()).slice(0, MAX);
  const limpio = limpiar(texto, r.url || destino);
  return new Response(limpio, { status: r.ok ? 200 : r.status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=60',
    /* dentro de lo nuestro, y aunque algo se colara: ningún script */
    'content-security-policy': "script-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'", 'x-content-type-options': 'nosniff' } });
}
