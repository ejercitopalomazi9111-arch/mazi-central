#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   ARMAR EL SITIO · `node build.mjs` → carpeta `dist/`
   ──────────────────────────────────────────────────────────────────────────
   Por qué existe, porque no es obvio: el primer despliegue en Cloudflare
   falló con "Asset too large" — trató de subir el repo ENTERO como si fuera
   público, incluido `.git` de 55 MB.

   Y el problema de fondo no era el tamaño: era que **servir la raíz del repo
   publica todo lo que hay en el repo**. GitHub Pages nunca publicó `.claude/`
   por su cuenta; Cloudflare sí lo haría, junto con el CLAUDE.md —que trae
   cosas del negocio— y el código del servidor.

   Así que no se sirve la raíz. Se arma una carpeta con lo que SÍ va, y esa
   lista está aquí abajo, a la vista. Si algo no se publicó, se revisa esta
   lista y se acabó el misterio.
   ═════════════════════════════════════════════════════════════════════════ */
import { cp, rm, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const RAIZ = dirname(new URL(import.meta.url).pathname);
const DIST = join(RAIZ, 'dist');

/* Lo que se publica. Carpetas completas y archivos sueltos de la raíz. */
const VA = [
  'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  '_headers', 'kernel-lock.html',
  'fadori', 'sitio', 'marca', 'explorador', 'reportes', 'evaluaciones', 'avisos',
  'sala', 'campana', 'cerebro', 'entorno', 'bodega',
  'juegos',
  'ligas-mazi', 'pacto-roto', 'romero', 'inkwell', 'vitallink', 'life-connect',
  'manzanilla', 'herramientas',
];

/* Lo que NO va, aunque esté dentro de algo que sí va. Los .md son notas de
   trabajo… MENOS los créditos: hay arte con licencia CC BY-SA y esa licencia
   obliga a dar crédito. Si el archivo no se publica, estaríamos usando el
   trabajo de otros sin cumplir lo único que pidieron a cambio. */
const NO_VA = (ruta) => {
  const f = ruta.split('/').pop();
  if(f === 'CREDITOS.md') return false;
  /* Los perfiles de las credenciales SÍ se publican: son justamente lo que el
     QR va a buscar. El .md de esa carpeta no. */
  if(/\.json$/i.test(f) && /credencial\/datos/.test(ruta)) return false;          /* ← la excepción que importa */
  if(/\.md$/i.test(f)) return true;
  if(f === '.DS_Store') return true;
  /* Las pruebas y los guiones de armado NO se publican. No rompen nada si van
     —nadie los ejecuta desde el navegador— pero no los usa el sitio, y este
     archivo existe justamente para que lo publicado sea lo que decidimos
     publicar y no lo que se quedó en la carpeta. Se colaban diez. */
  if(/^pruebas[^/]*\.(mjs|js|py)$/i.test(f)) return true;
  if(/^armar-suelto\.mjs$/i.test(f)) return true;
  /* El código del worker de La Sala NO es parte del sitio: es otro proyecto de
     Cloudflare. Publicarlo aquí no filtra secretos —las llaves son secretos del
     worker— pero sí sirve como estático algo que nadie usa desde el navegador,
     y este archivo existe justo para que lo publicado sea lo que decidimos. */
  if(/(^|\/)sala\/servidor\//.test(ruta)) return true;
  /* Del cerebro se publica `todo.json` y la pantalla; el motor y las neuronas
     sueltas no los usa el navegador —lee el armado— y publicarlos sería
     servir dos veces lo mismo. */
  if(/(^|\/)cerebro\/(cerebro\.mjs|neuronas\/)/.test(ruta)) return true;
  /* De la bodega se publica SÓLO el índice flaco. Las 2,945 carpetas son 186 MB
     de skills de otra gente: no las usa el navegador y publicarlas sería servir
     trabajo ajeno desde nuestro dominio. El flaco es lo que un agente necesita
     para saber QUÉ hay y pedir la que le sirva. */
  if(/(^|\/)bodega\//.test(ruta) && !/indice-min\.json$/.test(ruta)) return true;
  /* ⚠ EL ARTE DE GUERRA DE PUERCOS NO SE PUBLICA. Son ~55 MB de cartas, y esa
     es la razón CHICA. La grande: entre las 100 hay Pacman, Kirby, Goku,
     Mario, Sonic, Bugs Bunny, Scooby, Roblox, Minecraft, Paw Patrol, Godzilla
     y una veintena más de marcas que no son nuestras. Colgarlas del dominio
     de una empresa que vende servicios es exactamente el flanco por el que
     Torre Infinita salió del sitio (§7 del CLAUDE.md) — y ahí ni siquiera
     había una caja que dice «100 CARTAS» y un precio detrás.

     El repositorio las guarda porque son el material de trabajo del juego y
     el catálogo se arma con ellas. Publicarlas es otra decisión, y es de
     Carlos y de su amiga, no una consecuencia de haberlas subido. */
  /* …salvo `arte/web/`, que SÍ va: son las mismas cartas a 420 px en webp,
     6.5 MB en vez de 50, y son las que el juego enseña en la mano y en la
     colección. Un juego de cartas sin las cartas es una calculadora con
     fondo rosa. Los originales de 50 MB se quedan en el repositorio como
     material de trabajo. */
  if(/(^|\/)juegos\/guerra-de-puercos\/arte\//.test(ruta)
     && !/(^|\/)juegos\/guerra-de-puercos\/arte\/web(\/|$)/.test(ruta)) return true;
  if(/^(medir|rehacer|recortar)\.py$/i.test(f)) return true;
  if(/^\.wrangler$|^node_modules$|^\.git$/.test(f)) return true;
  return false;
};

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

let copiados = 0, saltados = 0;

async function copiar(desde, hasta){
  const info = await stat(desde);
  if(info.isDirectory()){
    await mkdir(hasta, { recursive: true });
    for(const hijo of await readdir(desde)){
      const d = join(desde, hijo);
      if(NO_VA(d)){ saltados++; continue; }
      await copiar(d, join(hasta, hijo));
    }
  } else {
    await cp(desde, hasta);
    copiados++;
  }
}

for(const cosa of VA){
  const desde = join(RAIZ, cosa);
  if(!existsSync(desde)){ console.warn('· falta y se salta: ' + cosa); continue; }
  if(NO_VA(desde)){ saltados++; continue; }
  await copiar(desde, join(DIST, cosa));
}

/* Que nadie indexe lo que todavía no está para el público. Cuando el sitio
   esté listo se cambia esta línea y no otra cosa. */
await writeFile(join(DIST, 'robots.txt'),
  'User-agent: *\nDisallow: /reportes/\nDisallow: /evaluaciones/\nDisallow: /avisos/\n');

console.log('✓ dist/ armado · ' + copiados + ' archivos · ' + saltados + ' saltados');
