/* ══════════════════════════════════════════════════════════════════════════
   EL VIGILANTE OYE DE VERDAD, Y CUANDO NO PUEDE LO DICE
   ──────────────────────────────────────────────────────────────────────────
   Esto existe por una queja de Carlos —«no los espera pasivamente»— cuya causa
   resultó ser la peor clase de defecto: uno que se ve igual que funcionar.

   `oir.py` revisaba el código de salida de `curl` y nada más. Pero curl sale
   con 0 cuando el servidor contesta **401**, y desde que se pusieron las
   LLAVES el cuerpo era `{"error":"Llave que no reconozco."}`. El ciclo leía
   `eventos` vacío, no imprimía nada, no dormía, y volvía a preguntar. Desde
   fuera: silencio — exactamente lo que el vigilante usa para decir «no hay
   nada nuevo».

   Por eso las dos pruebas que importan aquí son de RUIDO, no de contenido:
   que un 401 grite, y que un ciclo cerrado no exista.

     node sala/vigilante/pruebas-oir.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
let bien = 0, mal = 0;
const ok = (q, c, extra) => {
  if(c){ bien++; console.log('  ✓ ' + q); }
  else { mal++; console.log('  ✗ ' + q + (extra ? '\n      ' + extra : '')); }
};

/* ── el servidor de mentiras ───────────────────────────────────────────────
   Cuenta cuántas veces le preguntaron: es la única forma de cazar el ciclo
   cerrado, que por definición no imprime nada. */
const LLAVE_BUENA = 'kc';
let pedidas = 0, escribiendo = [];
let modo = 'ok';

const srv = http.createServer((q, s) => {
  let cuerpo = '';
  q.on('data', c => cuerpo += c);
  q.on('end', () => {
    const ruta = q.url.split('?')[0].split('/').pop();
    const responder = (codigo, o) => {
      s.writeHead(codigo, { 'content-type':'application/json' });
      s.end(JSON.stringify(o));
    };
    if(modo === 'sinllave' && q.headers['x-llave'] !== LLAVE_BUENA){
      pedidas++;
      return responder(401, { error:'Llave que no reconozco.' });
    }
    if(ruta === 'hilo') return responder(200, { hilo:[{ id:'e1' }], gente:{} });
    if(ruta === 'escribiendo'){
      const c = JSON.parse(cuerpo || '{}');
      escribiendo.push(c.de);
      return responder(200, { bien:true });
    }
    if(ruta === 'esperar'){
      pedidas++;
      /* Uno de verdad, y luego se cuelga: así se prueba que después de
         entregar sigue escuchando en vez de salirse. */
      if(pedidas === 1) return responder(200, { eventos:[{
        id:'e2', tipo:'mensaje', texto:'oye, ¿ya viste el PR?',
        de:{ id:'luis', nombre:'Claude de Luis', tipo:'agente' },
      }] });
      return setTimeout(() => responder(200, { eventos:[] }), 400);
    }
    responder(404, { error:'no' });
  });
});

const puerto = await new Promise(r => srv.listen(0, () => r(srv.address().port)));
const BASE = `http://127.0.0.1:${puerto}`;

/* Corre el vigilante unos segundos y devuelve lo que escupió. */
function vigilar(segundos, env){
  return new Promise((listo) => {
    const p = spawn('python3', [join(AQUI, 'oir.py'), 'GRUPAZ', 'claude-de-carlos'], {
      env: { ...process.env, MAZI_SERVIDOR: BASE, ...env },
    });
    let salida = '', errores = '';
    p.stdout.on('data', d => salida += d);
    p.stderr.on('data', d => errores += d);
    setTimeout(() => { p.kill('SIGKILL'); }, segundos * 1000);
    p.on('close', () => listo({ salida, errores }));
  });
}

console.log('\n■ el vigilante de la sala');

/* ── 1 · con llave buena, entrega el mensaje ─────────────────────────────── */
modo = 'sinllave'; pedidas = 0; escribiendo = [];
const a = await vigilar(4, { MAZI_LLAVE: LLAVE_BUENA });
ok('entrega el mensaje que llegó', /ya viste el PR/.test(a.salida), a.salida || a.errores);
ok('y dice de quién es', /Claude de Luis/.test(a.salida));

/* Recoger un mensaje es comprometerse a contestarlo, y contestar tarda
   minutos. Sin este aviso quien escribió ve la sala igual de quieta que si
   nadie lo hubiera oído — que es la otra mitad de la queja de Carlos. */
ok('avisa a la mesa que va a contestar', escribiendo.includes('claude-de-carlos'),
   'escribiendo: ' + JSON.stringify(escribiendo));

/* Después de entregar NO se sale: se vuelve a colgar. Un vigilante que
   entrega una vez y termina deja el siguiente mensaje sin leer. */
ok('sigue escuchando después de entregar', pedidas >= 2, 'pedidas: ' + pedidas);

/* ── 2 · con llave mala, GRITA — y no hace ciclo cerrado ─────────────────── */
modo = 'sinllave'; pedidas = 0; escribiendo = [];
const b = await vigilar(5, { MAZI_LLAVE: 'llave-que-no-es' });

/* ÉSTA es la prueba que faltaba. Antes el 401 se leía como «no hay eventos» y
   el vigilante se veía sano estando sordo. */
ok('un 401 se dice, no se traga', /no puedo o[ií]r|Llave que no reconozco/i.test(b.salida),
   'salida: ' + JSON.stringify(b.salida.slice(0, 300)));

/* Y se dice PRONTO. Avisar sólo al cuarto intento son casi dos minutos en los
   que se ve igual que uno sano. */
ok('y se dice desde el primer intento', (b.salida.match(/no puedo o[ií]r/gi) || []).length >= 1);

/* El ciclo cerrado: sin `time.sleep` en el camino del error, cinco segundos
   contra un servidor local son miles de peticiones. Con la espera puesta son
   un puñado. El número exacto no importa; el orden de magnitud sí. */
ok('no se pone a preguntar en ciclo cerrado', pedidas < 40, 'pedidas en 5s: ' + pedidas);

srv.close();
console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
