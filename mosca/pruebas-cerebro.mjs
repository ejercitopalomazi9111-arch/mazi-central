/* MOSCA · pruebas del cerebro (node, sin navegador).   node mosca/pruebas-cerebro.mjs
   Lo que se comprueba es BIOLOGÍA conocida, no números inventados:
     · el reflejo de comer: azúcar en la trompa → MN9 dispara (Shiu et al. 2024, fig. 1)
     · lo amargo lo frena (ídem, fig. 4)
     · algo que se acerca rápido → fibra gigante y despegue (von Reyn et al. 2014)
     · sin estímulo, silencio; y ningún sentido deja al cerebro encendido para siempre
*/
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Red, Cerebro } from './cerebro.js';

const D = new URL('./datos/', import.meta.url).pathname;
const indice = JSON.parse(readFileSync(D + 'indice.json'));
const gz = Buffer.concat([...Array(indice.piezas).keys()].map((k) => readFileSync(`${D}conectoma-${k}.bin`)));
const red = Red.desde(new Uint8Array(gunzipSync(gz)), indice);

let bien = 0, mal = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); c ? bien++ : mal++; };
function corre(entradas, ms = 1000, params = {}) {
  const m = new Cerebro(red, { suavizar: ms, ...params });
  for (const [g, l, hz] of entradas) m.estimular(g, l, hz);
  m.avanzar(ms); return m;
}

console.log('── datos');
ok(red.N === 138639 && red.ini[red.N] === 15091983, `138,639 neuronas y 15,091,983 conexiones (FlyWire v783)`);
for (const g of [...indice.entradas, ...indice.salidas]) if (!red.grupo(g).length) ok(false, `el grupo «${g}» está vacío`);
ok(true, `${indice.entradas.length} sentidos y ${indice.salidas.length} conductas con neuronas asignadas`);

console.log('── reposo');
const quieto = corre([], 500);
ok(quieto.spikesTotal === 0, 'sin estímulo no dispara nadie (el modelo no tiene ruido de fondo)');

console.log('── comer');
const azucar = corre([['azucar', 'der', 150]]);
const comer = azucar.tasa('comer');
ok(comer > 5, `azúcar en la trompa → MN9 (sacar la trompa) a ${comer.toFixed(1)} Hz`);
const amargo = corre([['amargo', 'der', 150]]);
ok(amargo.tasa('comer') < 1, `amargo solo → MN9 a ${amargo.tasa('comer').toFixed(1)} Hz (no come)`);
const mezcla = corre([['azucar', 'der', 150], ['amargo', 'der', 150]]);
ok(mezcla.tasa('comer') < comer * 0.8, `azúcar con amargo → MN9 baja a ${mezcla.tasa('comer').toFixed(1)} Hz (lo amargo frena)`);

console.log('── escape');
const sombra = corre([['acercamiento', 'izq', 100]], 500);
ok(sombra.tasa('escape') > 20, `algo que se acerca → fibra gigante y despegue a ${sombra.tasa('escape').toFixed(1)} Hz`);
ok(azucar.tasa('escape') < sombra.tasa('escape') / 3, 'el azúcar no la hace huir');

console.log('── que nada se quede encendido');
for (const g of indice.entradas) {
  const m = new Cerebro(red); m.estimular(g, 'todos', 100);
  const durante = m.avanzar(300); m.apagarTodo(); m.avanzar(1000);
  const despues = m.avanzar(300);
  ok(despues < Math.max(50, durante * 0.05), `${g}: ${durante} spikes con estímulo → ${despues} un segundo después`);
}

console.log('── repetible');
const a1 = corre([['viento', 'todos', 100]], 200).spikesTotal, a2 = corre([['viento', 'todos', 100]], 200).spikesTotal;
ok(a1 === a2 && a1 > 0, `la misma prueba da lo mismo (${a1} spikes las dos veces)`);

console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
