/* ══════════════════════════════════════════════════════════════════════════
   DESCUBRIR ARTÍCULOS · el paso que no se puede saltar
   ──────────────────────────────────────────────────────────────────────────
   Carlos pidió «mínimo 200 artículos que valgan la pena» y «no te bases en
   una sola web». Lo fácil sería escribir 200 URLs de memoria. Sería mentira:
   la memoria de un modelo inventa rutas que suenan bien y dan 404, y las que
   acierta son las cuatro de siempre.

   Así que las URLs se DESCUBREN: se piden los índices y mapas de sitio de
   cada fuente y se sacan de ahí. Lo que no exista, no entra.

   ⚠ `fetch` DE NODE NO SALE DE ESTE CONTENEDOR. La salida va por un proxy que
   sólo entiende a curl —medido: `fetch` contesta 403 «Host not in allowlist»
   contra sitios que curl trae sin problema—. Por eso se llama a curl y no se
   usa la API que uno esperaría.
   ═════════════════════════════════════════════════════════════════════════ */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
export { TEMAS, valeLaPena } from './fuentes.mjs';
const correr = promisify(execFile);

export async function traer(url, segundos = 25){
  try{
    const { stdout } = await correr('curl', [
      '-sS', '-L', '--max-time', String(segundos),
      '--compressed',
      '-H', 'user-agent: Mozilla/5.0 (compatible; MaziDesignBot/1.0)',
      url,
    ], { maxBuffer: 40 * 1024 * 1024 });
    return stdout;
  }catch(e){ return ''; }
}

/* De un HTML o un sitemap, todos los enlaces absolutos. */
export function enlaces(html, base){
  const salida = new Set();
  for(const m of html.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) salida.add(m[1]);
  /* ⚠ Y DE JSON, que no lleva `href`. A List Apart devolvió CERO artículos en
     la primera cosecha y parecía una fuente caída: su índice lo arma
     JavaScript, así que se pide por su API de WordPress — y ahí las URLs
     vienen dentro de JSON, con las barras escapadas. Buscando sólo `href` no
     se ve ni una. */
  for(const m of html.matchAll(/"(https?:\\?\/\\?\/[^"\s]+)"/g)){
    salida.add(m[1].replace(/\\\//g, '/'));
  }
  for(const m of html.matchAll(/href\s*=\s*["']([^"'#>]+)["']/gi)){
    let u = m[1].trim();
    if(!u || u.startsWith('mailto:') || u.startsWith('javascript:')) continue;
    try{ salida.add(new URL(u, base).href); }catch(e){}
  }
  return [...salida];
}

export async function guardar(ruta, datos){
  await mkdir(ruta.replace(/\/[^/]+$/, ''), { recursive: true });
  await writeFile(ruta, datos);
}
