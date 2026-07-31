#!/usr/bin/env node
/* ============================================================================
   bajar.mjs — el arte de la liga de demostración, con licencia verificada
   ----------------------------------------------------------------------------
   Baja imágenes de Wikimedia Commons para la liga de demostración: balones sin
   marca, aros, canchas, gradas y escudos. Todo con licencia abierta y con el
   crédito escrito en `CREDITOS.md`.

   ── POR QUÉ ESTO ES UNA HERRAMIENTA Y NO UNA CARPETA CON ARCHIVOS ─────────
   Porque dentro de un año nadie va a saber de dónde salió cada imagen ni con
   qué licencia. Aquí queda el guion completo: qué se buscó, qué licencias se
   aceptan, y de qué archivo exacto salió cada cosa.

   ── LAS REGLAS ───────────────────────────────────────────────────────────
   1. **Sólo licencias que permitan uso comercial.** Ligas Mazi es un producto
      que se vende. Una imagen "no comercial" aquí es una bomba de tiempo.
   2. **La licencia se LEE de la API, no se supone.**
   3. **NADA de retratos.** Carlos pidió "balones sin marca, aros, etc." para
      las cartas, y eso resuelve el problema de raíz: una carta de un jugador
      inventado NO puede llevar la cara de una persona real.
   4. **El crédito se escribe solo.** CC BY y CC BY-SA lo EXIGEN, y un crédito
      que hay que acordarse de poner a mano es un crédito que no se pone.

   Uso:
     node ligas-mazi/arte/bajar.mjs           baja lo que falte
     node ligas-mazi/arte/bajar.mjs --forzar  vuelve a bajar todo
   ==========================================================================*/

import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';

const AQUI = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const FORZAR = process.argv.includes('--forzar');

const LICENCIAS_OK = [
  /^cc0/i, /^public domain/i, /^pd/i, /^no restrictions$/i,
  // Todas las versiones de CC BY y CC BY-SA permiten uso comercial: lo único
  // que exigen es el crédito, y el crédito se escribe solo más abajo.
  /^cc by(-sa)? \d(\.\d)?$/i,
];
/* Lo que NO entra, escrito aparte en vez de confiar en que no aparezca:
   cualquier "no comercial" o "sin derivadas". */
const licenciaVale = (t) => {
  const s = String(t || '').trim();
  if (!s) return false;
  if (/\bnc\b|non-?commercial|\bnd\b|no-?deriv/i.test(s)) return false;
  return LICENCIAS_OK.some(r => r.test(s));
};

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

/* Commons limita el ritmo y responde 429. Sin reintento se perdían casi todas
   las descargas y parecía un problema de licencias. */
async function traer(url, intentos = 4){
  for (let i = 0; i < intentos; i++){
    const r = await fetch(url, { headers:{ 'User-Agent':'GrupoMazi/1.0 (grupomazi.oficial@gmail.com)' } });
    if (r.ok) return r;
    if (r.status !== 429 && r.status !== 503) throw new Error('HTTP ' + r.status);
    await dormir(1200 * Math.pow(2, i));
  }
  throw new Error('HTTP 429 tras ' + intentos + ' intentos');
}

/* EL PEDIDO — por CATEGORÍA, no por búsqueda de texto.
   La primera versión buscaba palabras ("basketball ball isolated") y el primer
   resultado fue el LOGO de una organización, con letras encima y una bandera.
   El buscador de Commons premia lo que más se enlaza, y lo que más se enlaza
   son escudos de equipos y emblemas — justo lo que aquí no puede entrar.
   Las categorías las curan personas: `Category:Basketballs` tiene balones.

   OJO CON LOS NOMBRES: media Commons no se llama como uno supondría. No existe
   `Basketball hoops` (es `Basketball nets`), ni `Blank coats of arms` (es
   `Heraldic shields`), ni `Basketball backboards`. Cuando una categoría no
   existe la API devuelve vacío SIN error, así que el guion decía "faltaron 5
   de 5" y parecía culpa de las licencias. Si se agrega una categoría nueva, se
   comprueba antes que tenga archivos. */
const PEDIDO = [
  { id:'balon',  cat:'Category:Basketballs',                n:5, nota:'Balones — para las cartas' },
  { id:'aro',    cat:'Category:Basketball nets',            n:5, nota:'Aros y redes' },
  { id:'cancha', cat:'Category:Basketball courts',          n:5, nota:'Canchas — diagramas' },
  { id:'gradas', cat:'Category:Basketball courts in Mexico', n:4, nota:'Canchas de México — banners' },
  { id:'escudo', cat:'Category:Heraldic shields',           n:8, nota:'Escudos — base de los equipos' },
];

/* Lo que no entra aunque la licencia esté bien. Un balón con marca es lo que
   Carlos pidió evitar, y un retrato es lo que no puede llevar la carta de un
   jugador inventado. */
const TITULO_PROHIBIDO = /logo|emblem|escudo de|crest|badge|wordmark|seal of|flag of|portrait/i;

/* LA CURADURÍA A MANO, y por qué hace falta aunque el filtro exista.
   El filtro sabe de licencias y de títulos; no sabe MIRAR. En la primera
   corrida bajó, con licencia impecable:
     · un balón con la marca "PRIMA" estampada
     · un estante con cuarenta balones, que no es un balón
     · `Category:Basketball equipment` resultó ser fotos de un taller de
       manualidades — la categoría existe pero no es lo que su nombre dice
     · escudos con etiquetas de heráldica encima y un sello de piedra
   Se revisaron todas en una hoja de contacto y las que no sirven quedan
   listadas aquí, con el motivo. Un descarte sin motivo escrito vuelve solo.
   Deja hueco en la numeración a propósito: renumerar rompería los nombres que
   `demo.js` tiene escritos. */
const DESCARTADAS = {
  'balon-3':  'un estante con cuarenta balones — no es un balón',
  'balon-4':  'trae la marca "PRIMA" estampada',
  'escudo-2': 'relleno verde sólido, no es un escudo en blanco',
  'escudo-7': 'lleva encima las etiquetas de heráldica (dekstra/malsupra)',
  'escudo-8': 'es un sello de piedra, no un escudo',
};

const API = 'https://commons.wikimedia.org/w/api.php';

async function buscar(cat, cuantas){
  const url = API + '?' + new URLSearchParams({
    action:'query', generator:'categorymembers', gcmtitle:cat, gcmtype:'file',
    gcmlimit:String(Math.min(120, cuantas * 14)),
    prop:'imageinfo', iiprop:'url|extmetadata|mime|size', iiurlwidth:'900',
    format:'json', origin:'*',
  });
  const r = await traer(url);
  const d = await r.json();
  return Object.values((d.query && d.query.pages) || {});
}

// Los créditos vienen con HTML dentro y van a un .md.
const limpiar = (h) => String(h || '').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,120);

const creditos = [];
let bajadas = 0, rechazadas = 0;

for (const grupo of PEDIDO) {
  const carpeta = AQUI + '/' + grupo.id;
  mkdirSync(carpeta, { recursive: true });
  process.stdout.write('\n· ' + grupo.id + ' — ' + grupo.nota + '\n');

  let paginas;
  try { paginas = await buscar(grupo.cat, grupo.n); }
  catch (e) { console.error('  ✗ no se pudo buscar:', e.message); continue; }

  let puestas = 0;
  for (const p of paginas) {
    if (puestas >= grupo.n) break;
    const ii = (p.imageinfo || [])[0]; if (!ii) continue;
    const meta = ii.extmetadata || {};
    const lic = (meta.LicenseShortName || {}).value;

    // Sólo imágenes: los PDF de archivos históricos se cuelan en las categorías.
    if (!/^image\/(jpeg|png|svg\+xml)$/.test(ii.mime || '')) continue;

    const titulo = p.title.replace(/^File:/, '');
    if (TITULO_PROHIBIDO.test(titulo)) {
      console.log('  ✗ por el título (marca o persona): ' + titulo.slice(0, 46));
      continue;
    }
    if (!licenciaVale(lic)) {
      rechazadas++;
      console.log('  ✗ por licencia (' + (lic || 'sin declarar') + '): ' + titulo.slice(0, 40));
      continue;
    }

    const ext = ii.mime === 'image/svg+xml' ? 'svg' : (ii.mime === 'image/png' ? 'png' : 'jpg');
    const clave = grupo.id + '-' + (puestas + 1);
    const nombre = clave + '.' + ext;
    const destino = carpeta + '/' + nombre;

    if (DESCARTADAS[clave]) {
      console.log('  ✗ descartada a mano (' + DESCARTADAS[clave] + '): ' + clave);
      puestas++;
      continue;
    }

    if (!FORZAR && existsSync(destino) && statSync(destino).size > 900) {
      puestas++;
      creditos.push({ archivo:grupo.id+'/'+nombre, titulo:p.title, lic,
                      autor:limpiar((meta.Artist||{}).value), url:ii.descriptionurl });
      console.log('  = ya estaba: ' + nombre);
      continue;
    }

    // Para SVG el original; para foto, la de 900 px (una de 4000 px en una
    // carta de teléfono son megas tirados a la basura).
    const fuente = ext === 'svg' ? ii.url : (ii.thumburl || ii.url);
    try {
      const img = await traer(fuente);
      const buf = Buffer.from(await img.arrayBuffer());
      if (buf.length < 900) throw new Error('archivo sospechosamente chico');
      writeFileSync(destino, buf);
      puestas++; bajadas++;
      creditos.push({ archivo:grupo.id+'/'+nombre, titulo:p.title, lic,
                      autor:limpiar((meta.Artist||{}).value), url:ii.descriptionurl });
      console.log('  ✓ ' + nombre + '  (' + (buf.length/1024).toFixed(0) + ' KB · ' + lic + ')');
      await dormir(700);   // no atropellar a Commons: es gratis y es de todos
    } catch (e) {
      console.log('  ✗ no bajó: ' + nombre + ' — ' + e.message);
    }
  }
  if (puestas < grupo.n) console.log('  ⚠ faltaron ' + (grupo.n - puestas) + ' de ' + grupo.n);
}

/* EL CRÉDITO. CC BY y CC BY-SA lo EXIGEN: sin esto estaríamos incumpliendo la
   licencia de las imágenes que acabamos de bajar — justo el problema que
   veníamos evitando. */
writeFileSync(AQUI + '/CREDITOS.md', [
  '# Créditos del arte de Ligas Mazi',
  '',
  'Todas las imágenes de esta carpeta salieron de **Wikimedia Commons** con licencia abierta que',
  'permite uso comercial. La licencia se verificó **leyéndola de la API**, no suponiéndola: el',
  'guion está en `bajar.mjs` y la lista blanca de licencias también.',
  '',
  '> **Nada de retratos.** Todo lo que hay aquí son objetos y canchas. Una carta de un jugador',
  '> inventado no puede llevar la cara de una persona real, así que aquí no hay caras.',
  '',
  'Para volver a bajarlas: `node ligas-mazi/arte/bajar.mjs`',
  '',
  '| Archivo | Origen | Licencia | Autor |',
  '|---|---|---|---|',
  ...creditos.map(c => '| `' + c.archivo + '` | ['
    + c.titulo.replace(/^File:/,'').replace(/\|/g,'·').slice(0,44) + '](' + c.url + ') | '
    + (c.lic || '—') + ' | ' + (c.autor || 'sin autor declarado') + ' |'),
  '',
  '_Generado por `bajar.mjs` el ' + new Date().toISOString().slice(0,10) + '._',
].join('\n') + '\n');

console.log('\n─────────────────────────────────');
console.log('✓ ' + bajadas + ' bajadas · ' + rechazadas + ' descartadas por licencia');
console.log('✓ ' + creditos.length + ' en CREDITOS.md');
