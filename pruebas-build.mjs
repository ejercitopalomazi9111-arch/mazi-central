#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   LA COMPUERTA DEL 404 SILENCIOSO · `node pruebas-build.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Qué vigila, y por qué hacía falta: tres veces se entregó un enlace que daba
   404 porque la carpeta existía en el repo y no en la lista de `build.mjs`
   (`lamina`, `luz`, `guias` — está escrito en los comentarios del propio
   archivo). El armado avisaba del caso contrario —listada y ausente— y se
   quedaba callado en éste.

   Lo que estas pruebas NO dan por hecho: que la compuerta sirva por existir.
   Una compuerta se comprueba metiéndole el defecto y viendo que se para; si
   sólo se comprueba el caso bueno, una que nunca dispara pasa igual.
   ═════════════════════════════════════════════════════════════════════════ */
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';

const RAIZ = dirname(new URL(import.meta.url).pathname);
let pasan = 0, fallan = 0;

const ok = (q, bien, nota = '') => {
  if(bien){ pasan++; console.log('  ✓ ' + q); }
  else { fallan++; console.log('  ✗ ' + q + (nota ? '\n      ' + nota : '')); }
};

/* Corre el armado de verdad y devuelve código de salida y lo que imprimió.
   Se mira `stderr` Y `stdout` porque el mensaje de la compuerta va por error y
   el «✓ dist/ armado» por salida, y una prueba que sólo lea uno de los dos
   confundiría «no imprimió el fallo» con «no falló». */
const armar = () => new Promise((listo) => {
  execFile('node', [join(RAIZ, 'build.mjs')], { cwd: RAIZ, maxBuffer: 8e6 },
    (err, stdout, stderr) => listo({
      codigo: err ? (err.code ?? 1) : 0,
      texto: String(stdout) + String(stderr),
    }));
});

/* Las carpetas que inventan las pruebas. Se borran en `finally`, porque una
   prueba que deja basura en la raíz del repo la commitea alguien después. */
const INVENTADAS = ['zzz-prueba-plana', 'zzz-prueba-honda', 'zzz-prueba-seca', 'constructor'];
const limpiar = () => Promise.all(
  INVENTADAS.map((c) => rm(join(RAIZ, c), { recursive: true, force: true })));

try {
  await limpiar();

  console.log('\n· el repo de hoy pasa');
  {
    const r = await armar();
    ok('el armado termina en 0 sin carpetas inventadas', r.codigo === 0,
       'salió ' + r.codigo + ' · ' + r.texto.trim().split('\n').slice(-6).join(' / '));
    ok('y dice que armó dist/', /dist\/ armado/.test(r.texto));
    ok('las tres de NO_SE_PUBLICA no lo paran',
       !/rodrigo-claro|j5data-propuestas|j5data-vercel/.test(r.texto));
  }

  console.log('\n· la compuerta muerde');
  {
    await mkdir(join(RAIZ, 'zzz-prueba-plana'), { recursive: true });
    await writeFile(join(RAIZ, 'zzz-prueba-plana/index.html'), '<!doctype html>');
    const r = await armar();
    ok('una carpeta nueva con index.html para el armado', r.codigo === 1,
       'salió ' + r.codigo);
    ok('y la nombra', /zzz-prueba-plana/.test(r.texto));
    ok('y señala el archivo, no sólo la carpeta',
       /zzz-prueba-plana\/index\.html/.test(r.texto));
    ok('y dice las DOS listas, para no empujar a publicar a ciegas',
       /VA/.test(r.texto) && /NO_SE_PUBLICA/.test(r.texto));
    await rm(join(RAIZ, 'zzz-prueba-plana'), { recursive: true, force: true });
  }
  {
    /* `guias/istqb-ctfl/entrenamiento/index.html` está a tres niveles: una
       compuerta que sólo mirara la raíz de la carpeta no habría cazado
       justamente uno de los tres incidentes que la motivaron. */
    await mkdir(join(RAIZ, 'zzz-prueba-honda/uno/dos'), { recursive: true });
    await writeFile(join(RAIZ, 'zzz-prueba-honda/uno/dos/index.html'), '<!doctype html>');
    const r = await armar();
    ok('un index.html a tres niveles también la para', r.codigo === 1,
       'salió ' + r.codigo);
    ok('y señala la ruta honda', /zzz-prueba-honda\/uno\/dos\/index\.html/.test(r.texto));
    await rm(join(RAIZ, 'zzz-prueba-honda'), { recursive: true, force: true });
  }
  {
    /* El `in` en vez de `hasOwnProperty` deja pasar sola una carpeta llamada
       `constructor` o `toString`: son propiedades heredadas de todo objeto. */
    await mkdir(join(RAIZ, 'constructor'), { recursive: true });
    await writeFile(join(RAIZ, 'constructor/index.html'), '<!doctype html>');
    const r = await armar();
    ok('una carpeta llamada `constructor` NO pasa por herencia', r.codigo === 1,
       'salió ' + r.codigo + ' — busca `in` donde debe ir hasOwnProperty');
    await rm(join(RAIZ, 'constructor'), { recursive: true, force: true });
  }

  console.log('\n· y no grita cuando no hay nada');
  {
    await mkdir(join(RAIZ, 'zzz-prueba-seca/notas'), { recursive: true });
    await writeFile(join(RAIZ, 'zzz-prueba-seca/notas/apunte.md'), '# nada');
    const r = await armar();
    ok('una carpeta sin index.html no para el armado', r.codigo === 0,
       'salió ' + r.codigo + ' — la compuerta está cazando carpetas que no son sitio');
    await rm(join(RAIZ, 'zzz-prueba-seca'), { recursive: true, force: true });
  }

  console.log('\n· cuando se para, no deja dist/ a medias');
  {
    await armar();                                   /* dist/ queda bueno */
    await writeFile(join(RAIZ, 'dist/testigo.txt'), 'aquí estaba');
    await mkdir(join(RAIZ, 'zzz-prueba-plana'), { recursive: true });
    await writeFile(join(RAIZ, 'zzz-prueba-plana/index.html'), '<!doctype html>');
    const r = await armar();
    ok('el armado se paró', r.codigo === 1);
    ok('y dist/ sigue entero, no borrado a medias',
       existsSync(join(RAIZ, 'dist/testigo.txt')),
       'la compuerta corre DESPUÉS del rm(dist) y deja la carpeta vacía');
    await rm(join(RAIZ, 'zzz-prueba-plana'), { recursive: true, force: true });
    await rm(join(RAIZ, 'dist/testigo.txt'), { force: true });
  }

  console.log('\n· las dos listas están sanas');
  {
    const txt = await readFile(join(RAIZ, 'build.mjs'), 'utf8');
    const bloque = txt.match(/const NO_SE_PUBLICA = \{([\s\S]*?)\n\};/);
    ok('NO_SE_PUBLICA existe y se puede leer', !!bloque);
    if(bloque){
      /* Se parte por ENTRADA y no por clave: la razón empieza en el renglón de
         abajo de su clave, así que cortar en el primer salto-y-comilla deja el
         texto fuera y mide cero. Ya pasó aquí mismo: tres rojas que acusaban a
         un build.mjs que tenía las tres razones puestas. */
      const entradas = bloque[1].split(/\n(?=\s{2}')/).filter((t) => t.trim());
      const claves = entradas.map((t) => t.match(/'([^']+)':/)[1]);
      ok('tiene las tres de hoy', claves.length === 3, 'son ' + claves.join(', '));
      /* Una entrada de una carpeta que ya no existe es un apunte que informa un
         estado y está en otro — el defecto favorito de esta casa. */
      for(const c of claves)
        ok('`' + c + '` todavía existe en el repo', existsSync(join(RAIZ, c)),
           'sobra en NO_SE_PUBLICA: la carpeta ya no está');
      /* Una razón vacía convierte la lista en la compuerta ingenua otra vez. */
      for(const t of entradas){
        const c = t.match(/'([^']+)':/)[1];
        const valor = t.slice(t.indexOf(':') + 1);
        const largo = (valor.match(/[a-záéíóúñ]/gi) || []).length;
        ok('`' + c + '` dice POR QUÉ no se publica', largo > 25,
           'la razón mide ' + largo + ' letras; sin razón la lista no sirve de nada');
      }
    }
  }
} finally {
  await limpiar();
  await armar();                                     /* dist/ queda bueno */
}

console.log('\n' + (fallan ? '✗' : '✓') + ' ' + pasan + ' pasan · ' + fallan + ' fallan\n');
process.exit(fallan ? 1 : 0);
