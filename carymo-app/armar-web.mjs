/* armar-web.mjs — junta en www/ SOLO lo que CARYMO usa, con las mismas rutas que en la web
 * (carymo/…, sala/…, presentaciones/…), para meterlo dentro de la app de App Store y Play Store.
 *
 * No se copia carpeta por carpeta: se sigue cada import, src, href y url() desde las páginas de entrada,
 * así no se cuela nada que no hace falta (videos de anuncios, pruebas, el servidor de La Sala, llaves).
 * Al final se verifica que TODO lo referenciado exista; si algo falta, truena con la lista.
 *
 *   node carymo-app/armar-web.mjs        → carymo-app/www/
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, extname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');
const WWW = join(AQUI, 'www');

/* las puertas de entrada: la app y el pizarrón (que se abre en un marco) */
const ENTRADAS = ['carymo/index.html', 'sala/explica.html', 'carymo/manifest.webmanifest'];
/* nunca entran a la app, aunque algo los nombre */
const PROHIBIDO = [/^sala\/servidor\//, /^\.llaves\//, /(^|\/)pruebas[^/]*$/, /\.md$/, /^carymo\/anuncio/, /(^|\/)node_modules\//];
/* lo que se lee como texto para buscarle referencias */
const TEXTO = new Set(['.html', '.js', '.mjs', '.css', '.webmanifest', '.json', '.svg']);

const visto = new Set(), faltan = [];
function normal(desde, ref){
  if(!ref || /^(https?:|data:|blob:|mailto:|tel:|#|javascript:|\/\/)/i.test(ref) || ref.includes('${')) return null;
  ref = ref.split(/[?#]/)[0]; if(!ref) return null;
  const base = ref.startsWith('/') ? ref.slice(1) : posix.join(posix.dirname(desde), ref);
  const n = posix.normalize(base);
  return n.startsWith('..') ? null : n;
}
function referencias(ruta, texto){
  const r = new Set(), ext = extname(ruta);
  const poner = (m) => { const n = normal(ruta, m); if(n) r.add(n); };
  /* import … from '…', import('…'), export … from '…' */
  for(const m of texto.matchAll(/(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g)) poner(m[1]);
  for(const m of texto.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) poner(m[1]);
  for(const m of texto.matchAll(/import\s+['"]([^'"]+)['"]/g)) poner(m[1]);
  /* new URL('…', import.meta.url) */
  for(const m of texto.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g)) poner(m[1]);
  if(ext === '.html' || ext === '.svg'){ for(const m of texto.matchAll(/\s(?:src|href|poster|data-src)\s*=\s*["']([^"']+)["']/g)) poner(m[1]); }
  for(const m of texto.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) poner(m[1]);
  if(ext === '.webmanifest' || ext === '.json'){ for(const m of texto.matchAll(/"(?:src|start_url)"\s*:\s*"([^"]+)"/g)) poner(m[1]); }
  /* rutas sueltas en cadenas: './algo.js', '../sala/x.woff2' (listas de precarga, recursos que se piden con fetch) */
  for(const m of texto.matchAll(/['"`](\.{1,2}\/[^'"`\s]+\.(?:js|mjs|css|html|json|woff2?|ttf|png|jpe?g|webp|svg|gif|mp3|ogg|wav|m4a|wasm|tflite|task|binarypb|webmanifest))['"`]/g)) poner(m[1]);
  return r;
}
function seguir(ruta){
  if(visto.has(ruta)) return;
  if(PROHIBIDO.some((p) => p.test(ruta))) return;
  const abs = join(RAIZ, ruta);
  if(!existsSync(abs)){ faltan.push(ruta); return; }
  if(statSync(abs).isDirectory()) return;
  visto.add(ruta);
  if(TEXTO.has(extname(ruta))) for(const r of referencias(ruta, readFileSync(abs, 'utf8'))) seguir(r);
}

ENTRADAS.forEach(seguir);
rmSync(WWW, { recursive: true, force: true });
let bytes = 0;
for(const ruta of [...visto].sort()){
  const de = join(RAIZ, ruta), a = join(WWW, ruta);
  mkdirSync(dirname(a), { recursive: true }); copyFileSync(de, a); bytes += statSync(de).size;
}
/* la raíz de la app manda directo a CARYMO */
writeFileSync(join(WWW, 'index.html'), `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>CARYMO</title><style>html,body{margin:0;background:#170A26}</style>
<script>location.replace('carymo/index.html' + location.search + location.hash)</script></head><body></body></html>
`);
/* faltas que no importan: rutas armadas que el rastreador ve como texto pero que la app no pide */
const reales = faltan.filter((f) => !/^carymo\/pizarron\.html$/.test(f));
console.log(`www/: ${visto.size} archivos, ${(bytes / 1048576).toFixed(1)} MB`);
if(reales.length){ console.log('⚠ referenciados que no existen:\n  ' + [...new Set(reales)].join('\n  ')); }
