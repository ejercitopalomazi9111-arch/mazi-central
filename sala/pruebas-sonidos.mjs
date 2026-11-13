/* La escalera de aciertos (sala/sonidos/sonidos.js). Carlos, 13 nov: «tras muchas correctas el sonido agudo se queda
   pegado». Ya arriba, debe pasearse (sube y baja), nunca repetir la misma nota seguida ni regresar al piso.
   node sala/pruebas-sonidos.mjs */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const raiz = fileURLToPath(new URL('..', import.meta.url)), PUERTO = 8400 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const pg = await b.newPage();
await pg.goto(`http://127.0.0.1:${PUERTO}/sala/explica.html`);
const notas = await pg.evaluate(async () => {
  const m = await import('./sonidos/sonidos.js');
  const tonos = [];
  const orig = AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource = function(){ const s = orig.call(this); const pr = s.playbackRate; const v = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
    Object.defineProperty(pr, 'value', { set(x){ tonos.push(x); v.set.call(this, x); }, get(){ return v.get.call(this); } }); return s; };
  m.encender(true); m.sonar('bien', { vol: 0 }); await new Promise((r) => setTimeout(r, 1500)); tonos.length = 0;
  const principales = [];
  for(let k = 0; k < 24; k++){ const k0 = tonos.length; m.sonar('bien', { vol: 0 }); principales.push(tonos[k0]); await new Promise((r) => setTimeout(r, 60)); }
  return principales.filter(Boolean).map((t) => Math.round(12 * Math.log2(t)));
});
console.log('  semitonos:', notas.join(' '));
ok(notas.length >= 20, 'sonaron los aciertos');
ok(notas.slice(0, 6).join(',') === '0,2,4,7,9,12', 'empieza subiendo por la escalera (do re mi sol la do)');
const arriba = notas.slice(6);
ok(arriba.every((x) => x >= 7), 'ya arriba no regresa al piso');
ok(arriba.every((x, i) => i === 0 || x !== arriba[i - 1]), 'nunca la misma nota dos veces seguidas');
ok(new Set(arriba).size >= 3 && arriba.some((x, i) => i && x < arriba[i - 1]) && arriba.some((x, i) => i && x > arriba[i - 1]), 'se pasea: sube y baja');
console.log(`\n${n - f} pasan · ${f} fallan`); await b.close(); srv.kill(); process.exit(f ? 1 : 0);
