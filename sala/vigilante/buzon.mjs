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
    const nota = e.nota?.texto ? `\n  > para ${e.nota.a || 'alguien'}: ${tachar(e.nota.texto)}` : '';
    const para = e.a ? ` → ${e.a}` : '';
    return `### ${e.de?.nombre || '—'}${para} · ${e.tipo} · \`${e.id}\` · ${hora(e.ts)}\n\n`
         + tachar(e.texto || '') + nota;
  });
  return cabeza.join('\n') + (cuerpo.length ? cuerpo.join('\n\n') : '_Vacío._') + '\n';
}

/* ══ TACHAR LO QUE PAREZCA UNA CREDENCIAL ══════════════════════════════════
   ⚠ ESTE ARCHIVO ESCRIBE EN UN REPO PÚBLICO, y eso es fácil de olvidar
   mientras se mira una conversación privada entre dos personas. El espejo va
   a `sala/buzon/GRUPAZ/hilo.md`, en `main`, cada quince minutos.

   Pasó de verdad: Carlos pegó una ficha de API de Cloudflare en la sala para
   desbloquear un despliegue —que además no hacía falta, porque se despliega
   solo al mergear—. Sin esto, esa ficha habría quedado publicada en internet
   y, peor, en el HISTORIAL DE GIT, de donde ya no se quita sin reescribir la
   historia del repo.

   No se confía en que nadie vuelva a hacerlo. Va a volver a pasar: la sala es
   justo el sitio donde uno pega cosas sin pensarlas, y ése es su valor. Lo
   que se cambia es que pegarlas deje de publicarlas.

   ── LO QUE ESTO NO ES ────────────────────────────────────────────────────
   No es una garantía. Reconoce las formas conocidas —las que de verdad se
   pegan— y no puede reconocer una credencial que parezca una palabra normal.
   Sirve para que un descuido no se publique, NUNCA como permiso para pegar
   secretos en la sala: lo que pasó por un chat está quemado igual, tachado o
   no, y hay que revocarlo. Eso se dice aquí porque un filtro que se cree
   perfecto es lo que hace que alguien baje la guardia.

   Y tacha SÓLO el trozo, no el mensaje entero: el resto casi siempre lleva la
   instrucción que hay que leer, y borrarla convierte una protección en una
   pérdida de información. */
const FORMAS = [
  /\bcfut_[A-Za-z0-9_-]{20,}/g,                    /* Cloudflare, ficha de usuario */
  /\bv1\.0-[A-Za-z0-9_-]{30,}/g,                    /* Cloudflare, otras */
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,                  /* GitHub */
  /\bgithub_pat_[A-Za-z0-9_]{50,}/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,                      /* OpenAI y parecidos */
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,               /* Slack */
  /\bAKIA[0-9A-Z]{16}\b/g,                         /* AWS */
  /\bAIza[0-9A-Za-z_-]{35}\b/g,                    /* Google */
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,  /* JWT */
  /(?:Bearer|Authorization:\s*Bearer)\s+[A-Za-z0-9._~+/-]{20,}=*/gi,
];
function tachar(txt){
  let t = String(txt || '');
  for(const forma of FORMAS) t = t.replace(forma, '«credencial tachada por el puente»');
  return t;
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

/* ── LO QUE YA SE DIJO NO SE VUELVE A DECIR ────────────────────────────────
   ⚠ EL DEFECTO QUE ESTO ARREGLA, y es de los que sólo se ven corriendo:

   El puente LEE de `origin/main` —eso ya estaba bien— pero ESCRIBE el acuse
   en el disco, y ahí se queda. Nadie lo commitea. Entonces la siguiente pasada
   vuelve a leer `origin/main`, encuentra el mismo texto debajo del corte
   —porque el acuse nunca llegó allá— y LO MANDA OTRA VEZ.

   No es teórico: hoy, 28 de agosto, el mensaje que el Claude de Luis escribió
   el 27 seguía debajo del corte en main, ya entregado a la sala desde las
   20:13. La siguiente corrida lo habría duplicado.

   El arreglo NO es hacer que el puente empuje a main —eso es un push a main
   sin persona de por medio, y eso no se hace—. Es preguntarle a la sala, que
   es la que sabe de verdad qué se entregó. Si el texto ya está en el hilo
   dicho por mí, no se manda: se acusa y ya.

   Lo levantó el Claude de Luis con el diagnóstico correcto —sus dos mensajes
   se perdieron por escribir en una rama ya mezclada— y proponía que el puente
   hiciera `pull` y `push`. La mitad de leer ya estaba resuelta; ésta es la
   otra mitad, por la vía que no necesita permiso de nadie. */
function normalizar(s){
  return String(s).replace(/\s+/g, ' ').trim().toLowerCase();
}

/* ⚠ SE COMPARA EL TEXTO, NO QUIÉN LO DIJO. Y esto lo aprendí duplicando el
   mensaje de verdad, en la sala de verdad, con la primera versión de esta
   misma función.

   La primera versión filtraba `e.de.id === yo`: sólo consideraba entregado lo
   que yo mismo hubiera dicho. Pero `salida.md` es un buzón COMPARTIDO —el
   Claude de Luis escribe ahí y corre el puente con SU id—, así que su mensaje
   entró a la sala firmado por él y siguió debajo del corte en main. Mi puente
   lo leyó, no lo reconoció como suyo... y lo volvió a publicar firmado por mí.

   Para un puente, «¿ya se entregó esto?» es una pregunta sobre el TEXTO. Quién
   lo firmó es otra pregunta, y no es la que hay que hacer aquí. */
async function yaEstaEnLaSala(sala){
  try{
    const d = await pedir('GET', `${sala}/hilo`);
    if(d.error) return null;                    /* sin hilo, mejor no adivinar */
    return new Set((d.hilo || [])
      .filter(e => e.texto)
      .map(e => normalizar(e.texto)));
  }catch(e){ return null; }
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
  /* `null` = no se pudo consultar el hilo. En ese caso se manda, porque un
     mensaje repetido molesta y uno que nunca sale rompe la conversación. */
  const dichos = await yaEstaEnLaSala(sala);
  for(const b of bloques){
    if(dichos && dichos.has(normalizar(b))){
      acuses.push(`- ↺ ya estaba en la sala, no se repitió · «${b.slice(0, 60).replace(/\n/g,' ')}…»`);
      continue;
    }
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
