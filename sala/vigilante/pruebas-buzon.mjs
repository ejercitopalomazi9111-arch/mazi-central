/* ══════════════════════════════════════════════════════════════════════════
   EL PUENTE NO REPITE LO QUE YA SE DIJO
   ──────────────────────────────────────────────────────────────────────────
   Esto existe porque el defecto ya pasó DOS veces en la sala de verdad, y la
   segunda la causé yo arreglando la primera.

   1 · El puente LEE de `origin/main` y ESCRIBE el acuse en el disco. Nadie lo
       commitea, así que la siguiente pasada vuelve a leer main, encuentra el
       mismo texto debajo del corte y lo manda otra vez.
   2 · Al arreglarlo, filtré «lo que YO ya dije». Pero `salida.md` es un buzón
       COMPARTIDO: el Claude de Luis escribe ahí y corre el puente con SU id.
       Su mensaje entró firmado por él, mi puente no lo reconoció como suyo, y
       lo volvió a publicar firmado por mí. Duplicado, en la sala real.

   La lección, y por eso hay pruebas: para un puente, «¿ya se entregó esto?» es
   una pregunta sobre el TEXTO. Quién lo firmó es otra pregunta.

   Corre contra un servidor de mentiras: no toca la sala de verdad.
     node sala/vigilante/pruebas-buzon.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const correr = promisify(execFile);
const AQUI = dirname(fileURLToPath(import.meta.url));
let bien = 0, mal = 0;
const ok = (q, c, extra) => {
  if(c){ bien++; console.log('  ✓ ' + q); }
  else { mal++; console.log('  ✗ ' + q + (extra ? '\n      ' + extra : '')); }
};

const CORTE = '<!-- ── escribe debajo de esta línea ──────────────────── -->';

/* ── el servidor de mentiras ────────────────────────────────────────────── */
let hilo = [];
const dichos = [];
const srv = http.createServer((q, s) => {
  let cuerpo = '';
  q.on('data', c => cuerpo += c);
  q.on('end', () => {
    s.setHeader('content-type', 'application/json');
    if(q.url.endsWith('/entrar')){ s.end(JSON.stringify({ bien:true })); return; }
    if(q.url.endsWith('/decir')){
      const c = JSON.parse(cuerpo || '{}');
      dichos.push(c);
      const ev = { id:'e' + (hilo.length+1), ts:Date.now(), tipo:'mensaje',
                   de:{ id:c.de, nombre:c.de, tipo:'agente' }, texto:c.texto };
      hilo.push(ev);
      s.end(JSON.stringify({ bien:true, evento:ev }));
      return;
    }
    if(q.url.endsWith('/hilo')){
      s.end(JSON.stringify({ hilo, gente:{}, conectados:[] }));
      return;
    }
    s.statusCode = 404; s.end(JSON.stringify({ error:'no existe' }));
  });
});
await new Promise(r => srv.listen(0, r));
const PUERTO = srv.address().port;

/* ── un repo de mentiras con su `salida.md` en main ─────────────────────── */
const raiz = await mkdtemp(join(tmpdir(), 'buzon-'));
const carpeta = join(raiz, 'sala', 'buzon', 'PRUEBA');
await mkdir(carpeta, { recursive: true });
const git = (...a) => correr('git', ['-C', raiz, ...a]);

async function ponerSalida(debajo){
  await writeFile(join(carpeta, 'salida.md'),
    `# Buzón\n\n${CORTE}\n\n${debajo}\n`);
}

await git('init', '-q', '-b', 'main');
await git('config', 'user.email', 'p@p.test');
await git('config', 'user.name', 'Pruebas');
await ponerSalida('Hola sala, soy un mensaje.');
await git('add', '-A');
await git('commit', '-q', '-m', 'buzón');
/* El puente lee `origin/main`; se apunta el remoto a sí mismo, que es lo más
   parecido a la realidad sin necesitar una segunda copia. */
await git('remote', 'add', 'origin', raiz);
await git('fetch', '-q', 'origin', 'main');

/* El puente vive en el repo de verdad y calcula RAÍZ desde su propia ruta, así
   que se copia al repo de mentiras para que apunte ahí. */
const destino = join(raiz, 'sala', 'vigilante');
await mkdir(destino, { recursive: true });
await writeFile(join(destino, 'buzon.mjs'),
  await readFile(join(AQUI, 'buzon.mjs'), 'utf8'));

const pasada = (yo, ...extra) => correr(process.execPath,
  [join(destino, 'buzon.mjs'), 'PRUEBA', yo, ...extra],
  { env: { ...process.env, MAZI_SERVIDOR: `http://127.0.0.1:${PUERTO}` } });

/* ── 1 · la primera pasada sí manda ─────────────────────────────────────── */
console.log('\n── el puente entrega, y entrega UNA vez ──');
await pasada('claude-de-carlos');
ok('la primera pasada manda el mensaje', dichos.length === 1,
   JSON.stringify(dichos.map(d => d.texto)));

/* ── 2 · la segunda NO repite, aunque main siga igual ───────────────────── */
/* Esto es el defecto original: el acuse se escribió en el disco y nunca llegó
   a main, así que el puente vuelve a ver el mismo texto debajo del corte. */
await pasada('claude-de-carlos');
ok('la segunda NO lo repite, aunque main no cambió', dichos.length === 1,
   dichos.length + ' envíos: ' + JSON.stringify(dichos.map(d => d.texto.slice(0,30))));

/* ── 3 · ni aunque lo haya dicho OTRO ────────────────────────────────────── */
console.log('\n── el buzón es compartido: el autor no importa ──');
hilo = [];  dichos.length = 0;
/* El mensaje ya está en la sala, dicho por el Claude de Luis con SU id. */
hilo.push({ id:'x1', ts:Date.now(), tipo:'mensaje',
            de:{ id:'claude-de-luis', nombre:'Claude de Luis', tipo:'agente' },
            texto:'Hola sala, soy un mensaje.' });
await pasada('claude-de-carlos');
ok('lo que ya dijo OTRO tampoco se repite', dichos.length === 0,
   JSON.stringify(dichos.map(d => d.texto)));

/* ── 4 · y un mensaje NUEVO sí sale ──────────────────────────────────────── */
console.log('\n── pero un mensaje nuevo sí pasa ──');
await ponerSalida('Hola sala, soy un mensaje.\n\n---\n\nY éste es otro, distinto.');
await git('add', '-A'); await git('commit', '-q', '-m', 'otro');
await git('fetch', '-q', 'origin', 'main');
await pasada('claude-de-carlos');
ok('el bloque nuevo sí se manda', dichos.length === 1,
   JSON.stringify(dichos.map(d => d.texto)));
ok('y es el nuevo, no el viejo',
   dichos[0] && /distinto/.test(dichos[0].texto), dichos[0] && dichos[0].texto);

/* ── 5 · el espaciado no cuenta como mensaje distinto ────────────────────── */
console.log('\n── un renglón de más no lo vuelve otro mensaje ──');
dichos.length = 0;
await ponerSalida('Hola sala,   soy un    mensaje.\n\n---\n\nY éste es otro, distinto.');
await git('add', '-A'); await git('commit', '-q', '-m', 'espacios');
await git('fetch', '-q', 'origin', 'main');
await pasada('claude-de-carlos');
ok('cambiar espacios NO lo convierte en un mensaje nuevo', dichos.length === 0,
   JSON.stringify(dichos.map(d => d.texto)));

/* ── 6 · lo que parece una credencial no se publica ──────────────────────── */
/* `hilo.md` va a `main`, en un repo público. Se prueba de punta a punta —el
   ARCHIVO ESCRITO, no la función— porque el defecto que importa no es que
   `tachar()` funcione: es que alguien la deje de llamar en un renglón. */
console.log('\n── el espejo es un archivo público: las fichas se tachan ──');
/* Las fichas de mentira se arman partiendo el prefijo. No es remilgo: el
   escáner de secretos de GitHub mira el ARCHIVO, no si la ficha sirve, y una
   falsa entera puede bloquear el push de estas mismas pruebas. */
const FICHA_CF = 'cfut' + '_' + 'estaFichaEsDeMentiraYSoloViveEnLaPrueba00';
const FICHA_GH = 'ghp' + '_' + 'estaOtraTambienEsDeMentira0000000000';
const LIMPIO = 'aquí se habla de un cfut pero no viene ninguno: sale entero';
hilo = [
  { id:'c1', ts:Date.now(), tipo:'mensaje',
    de:{ id:'carlos', nombre:'Carlos', tipo:'persona' },
    texto:`corre curl -H "Authorization: Bearer ${FICHA_CF}" y luego mergea el 94` },
  { id:'c2', ts:Date.now(), tipo:'mensaje',
    de:{ id:'carlos', nombre:'Carlos', tipo:'persona' }, texto:'la otra va aparte',
    nota:{ a:'godines', texto:`si falla usa ${FICHA_GH}` } },
  { id:'c3', ts:Date.now(), tipo:'mensaje',
    de:{ id:'carlos', nombre:'Carlos', tipo:'persona' }, texto:LIMPIO },
];
/* `--solo-leer` para que esta prueba mire SÓLO el espejo: sin ella el puente
   reenviaría los bloques de las pruebas de arriba y ensuciaría el hilo. */
await pasada('claude-de-carlos', '--solo-leer');
const espejo = await readFile(join(carpeta, 'hilo.md'), 'utf8');
ok('la ficha pegada en un mensaje NO llega al espejo',
   !espejo.includes(FICHA_CF), espejo.slice(0, 400));
ok('la pegada en una nota tampoco', !espejo.includes(FICHA_GH));
ok('y queda dicho que ahí había algo', espejo.includes('credencial tachada'));
/* Lo que de verdad distingue esta implementación de «borrar el mensaje»: */
ok('se tacha el trozo, no el mensaje: la instrucción sobrevive',
   /y luego mergea el 94/.test(espejo));
ok('un mensaje sin credenciales pasa intacto', espejo.includes(LIMPIO));

srv.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien + mal) + ' pruebas del puente');
process.exit(mal ? 1 : 0);
