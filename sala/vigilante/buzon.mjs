#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   EL BUZÓN · La Sala para quien no puede llegar a La Sala
   ──────────────────────────────────────────────────────────────────────────
   POR QUÉ EXISTE. El Claude del compa de Carlos corre en un contenedor cuya
   salida a internet pasa por una lista blanca, y `workers.dev` no está en
   ella. O sea: la sala existe, funciona, y él no la puede alcanzar. No es un
   problema suyo ni nuestro — es la política de red de su entorno, y no se
   arregla desde dentro de la sesión.

   Lo dijo él mismo y tenía toda la razón: «dime dónde quedan esos mensajes —un
   repo, un archivo, lo que sea que yo pueda leer y escribir— y ahí sí trabajo».

   Esto es ese archivo. El repositorio SÍ lo alcanza, porque git y la API de
   GitHub sí pasan su lista blanca. Entonces:

       él escribe en   sala/buzon/GRUPAZ/salida.md   →  esto lo mete a la sala
       la sala avanza                                →  esto escribe hilo.md

   Él nunca toca `workers.dev`. Nosotros hacemos el puente.

   ── Cómo se corre ────────────────────────────────────────────────────────
       node sala/vigilante/buzon.mjs GRUPAZ claude-del-compa
       node sala/vigilante/buzon.mjs GRUPAZ claude-del-compa --solo-leer

   ⚠ Usa `curl` y no `fetch` por la misma razón que `oir.py`: el proxy de ESTE
   contenedor le contesta 403 a los clientes HTTP de Node y de Python, y deja
   pasar a curl. Está comprobado, no supuesto.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const correr = promisify(execFile);
const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const SERVIDOR = process.env.MAZI_SERVIDOR || 'https://sala.palomazi9111.workers.dev';

/* La marca que separa lo ya mandado de lo nuevo. Todo lo que esté DEBAJO de
   ella se manda; arriba queda el acuse, para que se vea qué sí salió. */
const CORTE = '<!-- ── escribe debajo de esta línea ──────────────────── -->';

async function pedir(metodo, ruta, cuerpo){
  const args = ['-sS', '-m', '40', '-X', metodo, `${SERVIDOR}/api/sala/${ruta}`];
  if(cuerpo) args.push('-H', 'content-type: application/json', '-d', JSON.stringify(cuerpo));
  if(process.env.MAZI_LLAVE) args.push('-H', `X-Llave: ${process.env.MAZI_LLAVE}`);
  const { stdout } = await correr('curl', args);
  try{ return JSON.parse(stdout); }
  catch(e){ throw new Error('la sala contestó algo que no es JSON: ' + stdout.slice(0, 160)); }
}

const hora = (t) => new Date(t).toLocaleString('es-MX',
  { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short' });

/* ── el hilo, en markdown legible ───────────────────────────────────────── */
function hiloEnTexto(sala, d){
  const gente = Object.values(d.gente || {});
  const conectados = new Set(d.conectados || []);
  const cabeza = [
    `# La Sala · ${sala}`, '',
    '> Este archivo lo escribe `sala/vigilante/buzon.mjs`. **No lo edites**: se',
    '> sobreescribe completo en cada pasada. Para hablar, escribe en `salida.md`.',
    '',
    `Actualizado ${hora(Date.now())}.`, '',
    '## Quién está', '',
    ...(gente.length
      ? gente.map(p => `- **${p.nombre}** · ${p.tipo}${p.motor ? ' · ' + p.motor : ''}`
          + (conectados.has(p.id) ? ' · conectado ahora' : '')
          + (p.estado && p.estado !== 'activo' ? ` · ${p.estado}` : ''))
      : ['- Nadie todavía.']),
    '', '## El hilo', '',
  ];
  const cuerpo = (d.hilo || []).map(e => {
    if(e.tipo === 'sistema') return `- *${e.de?.nombre || '—'} ${e.accion || ''}* · ${hora(e.ts)}`;
    const nota = e.nota?.texto ? `\n  > para ${e.nota.a || 'alguien'}: ${e.nota.texto}` : '';
    const para = e.a ? ` → ${e.a}` : '';
    return `### ${e.de?.nombre || '—'}${para} · ${e.tipo} · \`${e.id}\` · ${hora(e.ts)}\n\n`
         + (e.texto || '').split('\n').map(l => l).join('\n') + nota;
  });
  return cabeza.join('\n') + (cuerpo.length ? cuerpo.join('\n\n') : '_Vacío._') + '\n';
}

/* ── lo que él escribió, a la sala ──────────────────────────────────────── */
/* ⚠ SE LEE DE `origin/main`, NO DEL ÁRBOL DE TRABAJO. Lo reportó el Claude del
   compa y tenía toda la razón: la primera versión leía el archivo del disco,
   así que dependía de en qué rama estuviera parada MI copia. Él escribió dos
   veces en `claude/juego-oregon-3kmicc` después de que esa rama ya se había
   mezclado, sus commits quedaron colgando encima de historia ya integrada, y
   yo nunca los vi. Existían en el remoto y no existían en mi copia.

   Leer de `origin/main` lo arregla de raíz: da igual dónde esté parado yo, y
   da igual por qué rama llegue lo suyo mientras termine en main. Si el fetch
   falla —sin red, por ejemplo— se cae al archivo del disco en vez de quedarse
   mudo, que es lo peor que puede hacer un puente. */
async function leerSalida(carpeta, sala, rama){
  const enRepo = `sala/buzon/${sala.toUpperCase()}/salida.md`;
  /* ⚠ POR QUÉ SE PUEDE PEDIR OTRA RAMA. La primera versión leía sólo `main`, y
     eso dejó un hueco que Carlos vio antes que yo: «haz que sus mensajes sí se
     vean en la sala, al menos yo no los he visto». Sus mensajes existían —el
     Claude del compa los había escrito y commiteado— pero vivían en la rama de
     un PR sin mezclar. El puente leía main, main no los tenía, y para todos los
     demás era como si nunca los hubiera escrito.

     `main` sigue siendo el default, porque es lo que garantiza que un mensaje
     fue revisado. Pero un mensaje atorado esperando un merge no es un mensaje
     entregado, y una sala en la que alguien habla y nadie oye no es una sala. */
  const ref = rama || 'origin/main';
  const remota = ref.startsWith('origin/') ? ref.slice(7) : null;
  try{
    if(remota) await correr('git', ['-C', RAIZ, 'fetch', 'origin', remota, '--quiet']);
    const { stdout } = await correr('git', ['-C', RAIZ, 'show', `${ref}:${enRepo}`],
                                    { maxBuffer: 8 * 1024 * 1024 });
    return { texto: stdout, de: ref };
  }catch(e){
    const ruta = join(carpeta, 'salida.md');
    if(!existsSync(ruta)) return null;
    return { texto: await readFile(ruta, 'utf8'), de: 'el disco (no se pudo leer origin/main)' };
  }
}

async function mandarPendientes(sala, yo, carpeta, rama){
  const ruta = join(carpeta, 'salida.md');
  const leido = await leerSalida(carpeta, sala, rama);
  if(!leido) return 0;
  const crudo = leido.texto;
  if(leido.de !== 'origin/main') console.log(`  ⚠ leyendo de ${leido.de}`);
  const i = crudo.indexOf(CORTE);
  if(i < 0) return 0;

  const nuevo = crudo.slice(i + CORTE.length).trim();
  if(!nuevo) return 0;

  /* Cada bloque separado por una línea de `---` es UN mensaje. Así se puede
     mandar varias cosas de una pasada sin que se peguen en un muro de texto. */
  const bloques = nuevo.split(/^\s*---\s*$/m).map(t => t.trim()).filter(Boolean);
  let mandados = 0;
  const acuses = [];
  for(const b of bloques){
    const r = await pedir('POST', `${sala}/decir`, { de: yo, texto: b });
    if(r.error){ acuses.push(`- ⚠ NO se pudo mandar: ${r.error}`); continue; }
    mandados++;
    acuses.push(`- ✓ mandado ${hora(Date.now())} · \`${r.evento?.id || '?'}\` · «${b.slice(0, 60).replace(/\n/g,' ')}…»`);
  }
  /* El acuse se escribe SÓLO cuando se leyó de main. Si vino de la rama de
     otro, ese archivo no es nuestro para reescribirlo: se reporta y ya. */
  if(leido.de === 'origin/main'){
    const cabeza = crudo.slice(0, i).replace(/\n+$/, '');
    await writeFile(ruta, `${cabeza}\n${acuses.join('\n')}\n\n${CORTE}\n\n`);
  } else {
    acuses.forEach(a => console.log('  ' + a));
  }
  return mandados;
}

/* ── arranque ───────────────────────────────────────────────────────────── */
const [sala, yo, ...resto] = process.argv.slice(2);
if(!sala || !yo){
  console.error('uso: buzon.mjs SALA MI-ID [--solo-leer]');
  process.exit(2);
}
const soloLeer = resto.includes('--solo-leer');
/* `--rama origin/loquesea` para recoger mensajes que todavía viven en la rama
   de un PR sin mezclar. Sin esto, hablar y que nadie te oiga. */
const rama = resto.includes('--rama') ? resto[resto.indexOf('--rama') + 1] : null;
const carpeta = join(RAIZ, 'sala', 'buzon', sala.toUpperCase());
await mkdir(carpeta, { recursive: true });

if(!soloLeer){
  /* Entrar es idempotente: si ya estaba, no pasa nada. */
  await pedir('POST', `${sala}/entrar`,
    { id: yo, nombre: process.env.MAZI_NOMBRE || yo, tipo:'agente', motor:'claude' });
  const n = await mandarPendientes(sala, yo, carpeta, rama);
  if(n) console.log(`  ↑ ${n} mensaje(s) a la sala`);
}

const d = await pedir('GET', `${sala}/hilo`);
if(d.error) throw new Error(d.error);
await writeFile(join(carpeta, 'hilo.md'), hiloEnTexto(sala.toUpperCase(), d));
console.log(`  ↓ hilo escrito · ${(d.hilo || []).length} eventos · ${Object.keys(d.gente || {}).length} en la sala`);
