/* ══════════════════════════════════════════════════════════════════════════
   LA COSECHA · descubrir, traer y dejar legible
   ──────────────────────────────────────────────────────────────────────────
   Dos pasos, y están separados a propósito:
     node departamento-diseno/cosechar.mjs descubrir   → la lista de URLs
     node departamento-diseno/cosechar.mjs traer       → el texto de cada una

   ⚠ EL TEXTO NO SE COMMITEA. Doscientos artículos ajenos en el repo son dos
   cosas malas a la vez: peso muerto y obra de otros publicada sin permiso. Lo
   que se guarda en el repo es la LISTA —de dónde salió cada cosa— y lo que yo
   escriba a partir de leerlos. El texto vive en el disco de trabajo y se
   puede volver a traer cuando haga falta.

   ⚠ Y NO SE PIDE A LO BRUTO: van de dos en dos y con una pausa. Una cosecha
   que tumba el sitio del que aprende no es una cosecha, es un abuso.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { traer, enlaces, valeLaPena, TEMAS } from './descubrir.mjs';
import { FUENTES } from './fuentes.mjs';

const AQUI = new URL('.', import.meta.url).pathname;
const LISTA = join(AQUI, 'cosecha.json');
const ELEGIDOS = join(AQUI, 'elegidos.json');
/* ⚠ CADA DEPARTAMENTO EN SU BODEGA. La primera vez esto apuntaba a la misma
   carpeta que el departamento de diseño y los dos corpus se mezclaron: 93
   artículos de negocio dentro de los 313 de diseño, y el buscador de diseño
   empezó a devolver artículos de gestión. Se cazó contando archivos, no
   leyendo el código. */
const BODEGA = process.env.BODEGA ||
  '/tmp/claude-0/-home-user-evaluaciones-rembrandt/bf88face-536e-5b8f-9dd9-93f513378ced/scratchpad/cosecha-negocios';

const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const nombreDe = (u) => u.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-')
                         .replace(/^-|-$/g, '').slice(0, 120) + '.txt';

/* ── HTML a texto ───────────────────────────────────────────────────────────
   Sin librería, y no por deporte: un extractor de artículos de verdad pesa
   más que todo este departamento y lo que hace falta aquí es LEER, no
   reconstruir la maqueta. Se tiran los guiones y los estilos —que son la
   mitad del peso y cero del contenido—, se convierten los bloques en saltos
   de renglón para que los párrafos sigan siendo párrafos, y ya. */
export function aTexto(html){
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|pre|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
       .replace(/&[a-z]+;/gi, ' ');
  return t.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim())
          .filter((l, i, a) => l || a[i-1])          /* no más de un renglón en blanco */
          .join('\n').trim();
}

const titulo = (html) => {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 160) : '';
};

async function descubrir(){
  const encontradas = new Map();
  for(const f of FUENTES){
    let deEsta = 0;
    /* Un mapa de sitio puede apuntar a otros mapas de sitio. Se sigue un salto
       —no más: dos ya es rastrear internet entera, y esto es una cosecha con
       tema, no una araña. */
    const porVer = [...f.indices];
    const vistos = new Set();
    while(porVer.length){
      const indice = porVer.shift();
      if(vistos.has(indice)) continue;
      vistos.add(indice);
      const html = await traer(indice);
      if(!html){ console.log(`  ⚠ no contestó ${indice}`); continue; }
      if(/<sitemapindex/i.test(html)){
        for(const m of html.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)){
          if(vistos.size < 40) porVer.push(m[1]);
        }
        await dormir(500);
        continue;
      }
      for(const u of enlaces(html, indice)){
        if(!u.includes(f.dentro)) continue;
        if(!valeLaPena(u)) continue;
        if(/\.(png|jpe?g|gif|svg|webp|pdf|zip|css|js)(\?|$)/i.test(u)) continue;
        /* ⚠ NO SE LE PEGA UNA BARRA A TODO. La primera versión normalizaba
           añadiendo `/` al final siempre, y convertía
           `…/concurrent-input-mechanisms.html` en `…/concurrent-input-mechanisms.html/`,
           que es un 404 — y encima entraba DOS veces, con barra y sin ella,
           gastando el cupo de la casa en la misma página. Una ruta que ya
           termina en archivo se deja como está. */
        const sinAncla = u.split('#')[0].split('?')[0];
        const limpia = /\.[a-z0-9]{2,5}$/i.test(sinAncla)
          ? sinAncla : sinAncla.replace(/\/$/, '') + '/';
        if(encontradas.has(limpia)) continue;
        encontradas.set(limpia, { url: limpia, casa: f.casa });
        deEsta++;
      }
      await dormir(700);
    }
    console.log(`  ${f.casa.padEnd(20)} ${String(deEsta).padStart(4)} artículos`);
  }
  const lista = [...encontradas.values()];
  await writeFile(LISTA, JSON.stringify({
    cuando: new Date().toISOString().slice(0, 10),
    total: lista.length,
    porCasa: Object.fromEntries(FUENTES.map(f =>
      [f.casa, lista.filter(a => a.casa === f.casa).length])),
    articulos: lista,
  }, null, 2) + '\n');
  console.log(`\n✓ ${lista.length} artículos en cosecha.json`);
}

async function traerTodo(){
  const { articulos } = JSON.parse(await readFile(ELEGIDOS, 'utf8'));
  await mkdir(BODEGA, { recursive: true });
  const ya = new Set(await readdir(BODEGA).catch(() => []));
  let traidos = 0, saltados = 0, fallidos = 0;
  for(const a of articulos){
    const archivo = nombreDe(a.url);
    if(ya.has(archivo)){ saltados++; continue; }
    const html = await traer(a.url);
    const texto = html ? aTexto(html) : '';
    /* Menos de 1200 caracteres no es un artículo: es una portada, un muro de
       cookies o un 404 con buena cara. */
    if(texto.length < 1200){ fallidos++; await dormir(400); continue; }
    await writeFile(join(BODEGA, archivo),
      `# ${titulo(html)}\n# ${a.url}\n# casa: ${a.casa}\n\n${texto}\n`);
    traidos++;
    if(traidos % 10 === 0) console.log(`  ${traidos} traídos…`);
    await dormir(500);
  }
  console.log(`\n✓ ${traidos} traídos · ${saltados} ya estaban · ${fallidos} no sirvieron`);
  console.log(`  en ${BODEGA}`);
}

/* ══ ELEGIR ════════════════════════════════════════════════════════════════
   Descubrir trae MILES. Eso no es «200 artículos que valgan la pena»: es un
   montón, y un montón con una fuente dominando no cumple lo que se pidió —
   «no te bases en una sola web»—. De la primera cosecha, css-tricks solito
   ponía el 54 % y A List Apart el 0 %.

   Así que se elige con CUPO POR CASA. Es peor para el número total y mejor
   para lo que se va a aprender: ocho voces que se contradicen enseñan más que
   una repetida trescientas veces. Cuando dos fuentes chocan, ahí hay una
   neurona de decisión esperando.
   ═══════════════════════════════════════════════════════════════════════ */
const CUPO = +(process.env.CUPO || 42);

/* Lo que NO es un artículo aunque viva en la misma casa. */
const NO_ES_ARTICULO = [
  '/tag/', '/tags/', '/category/', '/categories/', '/author/', '/page/',
  '/search', '/feed', '/newsletter', '/sponsor', '/job', '/about',
  '/privacy', '/terms', '/contact', '/subscribe', '/membership',
];

function puntuarUrl(u){
  const r = u.toLowerCase();
  /* Cuántos temas distintos toca la ruta. Dos temas en una ruta suele ser un
     artículo que RELACIONA, y relacionar es justo lo que hace falta. */
  const temas = new Set();
  for(const t of TEMAS) if(r.includes(t)) temas.add(t.slice(0, 5));
  let p = temas.size * 2;
  /* Rutas con fecha son artículos; las de una sola palabra suelen ser índices. */
  if(/\/20\d\d\//.test(r)) p += 2;
  const trozos = r.replace(/https?:\/\//, '').split('/').filter(Boolean);
  if(trozos.length >= 3) p += 1;
  const ultimo = trozos.at(-1) || '';
  if(ultimo.split('-').length >= 3) p += 2;      /* un slug largo es un título */
  return p;
}

async function elegir(){
  const { articulos } = JSON.parse(await readFile(LISTA, 'utf8'));
  const porCasa = new Map();
  for(const a of articulos){
    const r = a.url.toLowerCase();
    if(NO_ES_ARTICULO.some(x => r.includes(x))) continue;
    const p = puntuarUrl(a.url);
    if(p < 3) continue;
    if(!porCasa.has(a.casa)) porCasa.set(a.casa, []);
    porCasa.get(a.casa).push({ ...a, p });
  }
  const elegidos = [];
  for(const [casa, lista] of porCasa){
    lista.sort((x, y) => y.p - x.p || x.url.localeCompare(y.url));
    elegidos.push(...lista.slice(0, CUPO));
    console.log(`  ${casa.padEnd(22)} ${String(Math.min(lista.length, CUPO)).padStart(3)} de ${lista.length}`);
  }
  await writeFile(ELEGIDOS, JSON.stringify({
    cuando: new Date().toISOString().slice(0, 10),
    cupoPorCasa: CUPO,
    total: elegidos.length,
    porCasa: Object.fromEntries([...porCasa].map(([c, l]) => [c, Math.min(l.length, CUPO)])),
    articulos: elegidos.map(({ url, casa, p }) => ({ url, casa, p })),
  }, null, 2) + '\n');
  console.log(`\n✓ ${elegidos.length} elegidos en elegidos.json`);
}

const que = process.argv[2];
if(que === 'descubrir') await descubrir();
else if(que === 'elegir') await elegir();
else if(que === 'traer') await traerTodo();
else { console.log('uso: cosechar.mjs descubrir | elegir | traer'); process.exit(2); }
