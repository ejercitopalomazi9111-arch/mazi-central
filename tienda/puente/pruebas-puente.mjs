#!/usr/bin/env node
/* Pruebas del puente · `node tienda/puente/pruebas-puente.mjs`
   Una impresora de red de mentiras (servidor TCP) recibe lo que manda el puente. */
import { createServer } from 'node:net';
import { crearPuente } from './puente.mjs';
let bien = 0, mal = 0;
const ok = (t, c, d = '') => { c ? bien++ : mal++; console.log(`  ${c ? '✓' : '✗'} ${t}${c || !d ? '' : ` — ${d}`}`); };

const recibido = [];
const impresora = createServer((s) => { const t = []; s.on('data', (d) => t.push(d)); s.on('end', () => recibido.push(Buffer.concat(t))); }).listen(0, '127.0.0.1');
await new Promise((r) => impresora.once('listening', r));
const puente = crearPuente().listen(0, '127.0.0.1');
await new Promise((r) => puente.once('listening', r));
const P = `http://127.0.0.1:${puente.address().port}`, IMP = `127.0.0.1:${impresora.address().port}`;

console.log('\n· Puente');
const s = await (await fetch(P + '/salud')).json();
ok('contesta /salud', s.bien === true);
const bytes = Uint8Array.from([0x1b, 0x40, 0x48, 0x6f, 0x6c, 0x61, 0x0a, 0x1d, 0x56, 0x42, 0x00]);
const r = await fetch(`${P}/imprimir?destino=${IMP}`, { method: 'POST', body: bytes, headers: { Origin: 'https://tienda.ejemplo' } });
await new Promise((x) => setTimeout(x, 200));
ok('reenvía los bytes tal cual a la impresora de red', r.status === 200 && recibido[0]?.equals(Buffer.from(bytes)), `${r.status} ${recibido[0]?.toString('hex')}`);
ok('deja pasar a una página pública hacia localhost (CORS + red privada)', r.headers.get('access-control-allow-origin') === 'https://tienda.ejemplo');
const pre = await fetch(`${P}/imprimir`, { method: 'OPTIONS', headers: { Origin: 'https://x', 'Access-Control-Request-Private-Network': 'true' } });
ok('responde al preflight con Allow-Private-Network', pre.status === 204 && pre.headers.get('access-control-allow-private-network') === 'true');
const sin = await fetch(`${P}/imprimir`, { method: 'POST', body: 'x' });
ok('sin destino dice qué falta', sin.status === 400);
const caida = await fetch(`${P}/imprimir?destino=127.0.0.1:1`, { method: 'POST', body: 'x' });
ok('impresora apagada: error claro, no se cuelga', caida.status === 502 && /no se pudo conectar/.test(await caida.text()));

puente.close(); impresora.close();
console.log(`\n${mal ? '✗' : '✓'} ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
