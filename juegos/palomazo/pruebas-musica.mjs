#!/usr/bin/env node
/* PALOMAZO · canciones de verdad (audio) y «Tu canción».
   1. Una canción FABRICADA con golpes en instantes conocidos: el detector
      tiene que encontrarlos, en su carril y al pulso correcto.
   2. Las tres de la casa: densidad jugable, los tres carriles con trabajo.
   3. Un robot juega Pamgaea 20 s tocando cuando SUENA cada golpe.
   4. Cargar una canción del teléfono, que se quede al recargar y quitarla.
   node juegos/palomazo/pruebas-musica.mjs   (levanta su propio servidor) */
import { spawn } from 'child_process'; import fs from 'fs'; import path from 'path'; import os from 'os';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium ?? pw.default.chromium;
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const PUERTO = 8900 + Math.floor(Math.random() * 400);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: RAIZ, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
let pasan = 0, fallan = 0;
const ok = (t, c, x) => { if(c){ pasan++; console.log('  ✓', t); } else { fallan++; console.log('  ✗', t, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
const errores = []; pg.on('pageerror', e => errores.push(e.message));
await pg.goto(`http://127.0.0.1:${PUERTO}/juegos/palomazo/`, { waitUntil: 'load' });
await pg.waitForTimeout(300);

console.log('── 1 · canción fabricada');
const f = await pg.evaluate(async () => {
  const P = window.PALOMAZO;
  const sr = 44100, dur = 20, bpm = 120, beat = 0.5;
  const off = new OfflineAudioContext(1, sr * dur, sr);
  const ev = [];
  for(let t = 1; t < dur - 1; t += beat){
    const k = Math.round((t - 1) / beat);
    if(k % 2 === 0){                    /* bombo: 55 Hz que cae, en los tiempos pares */
      const o = off.createOscillator(), g = off.createGain();
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g); g.connect(off.destination); o.start(t); o.stop(t + 0.3); ev.push({ t, carril: 0 });
    } else {                            /* charol: ruido agudo, en los nones */
      const b = off.createBuffer(1, sr * 0.06, sr), d = b.getChannelData(0);
      for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.012));
      const s = off.createBufferSource(), h = off.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = 7000;
      s.buffer = b; s.connect(h); h.connect(off.destination); s.start(t); ev.push({ t, carril: 2 });
    }
  }
  const buf = await off.startRendering();
  const m = await P.mapaDeAudio(buf);
  const paso = 60 / m.bpm / 4;
  const notas = m.notas.map(n => ({ t: n.p * paso, c: n.carril }));
  /* el reparto le pasa al carril de en medio (que aquí no tiene nada) notas
     débiles a propósito: se mide lo que se quedó en los carriles de golpe */
  let cerca = 0, deLado = 0, carrilBien = 0;
  for(const n of notas){
    const e = ev.reduce((a, b) => Math.abs(b.t - n.t) < Math.abs(a.t - n.t) ? b : a);
    if(Math.abs(e.t - n.t) < 0.04){ cerca++; if(n.c !== 1){ deLado++; if(e.carril === n.c) carrilBien++; } }
  }
  return { bpm: m.bpm, n: notas.length, eventos: ev.length, cerca, deLado, carrilBien, enMedio: notas.filter(x => x.c === 1).length };
});
ok('el pulso sale de 120 por minuto (o su doble/mitad)', [60, 120, 240].some(b => Math.abs(f.bpm - b) <= 1.5), f.bpm);
ok('encuentra la mayoría de los golpes', f.n >= f.eventos * 0.7, f);
ok('cada nota cae a menos de 40 ms de un golpe real', f.cerca === f.n, f);
ok('el bombo va a la izquierda y el charol a la derecha (todos los que se quedaron de lado)', f.carrilBien === f.deLado && f.deLado >= f.n * 0.6, f);

console.log('── 2 · las de la casa');
const casa = await pg.evaluate(async () => {
  const P = window.PALOMAZO; const out = [];
  for(const c of P.TEMAS){
    await P.prepararTema(c);
    const m = c.mapa, paso = 60 / m.bpm / 4, dur = c.buffer.duration;
    const ts = m.notas.map(n => n.p * paso);
    const por = [0, 0, 0]; m.notas.forEach(n => por[n.carril]++);
    let gapMin = 9; for(let i = 1; i < ts.length; i++) gapMin = Math.min(gapMin, ts[i] - ts[i - 1]);
    out.push({ id: c.id, bpm: m.bpm, dur: Math.round(dur), n: m.notas.length, porSeg: +(m.notas.length / dur).toFixed(2),
      carriles: por.map(x => +(x / m.notas.length).toFixed(2)), gapMin: +gapMin.toFixed(3), largas: m.notas.filter(n => n.larga).length,
      dentro: ts.every(t => t >= 1 && t <= dur - 1) });
  }
  return out;
});
for(const c of casa){
  console.log('   ', JSON.stringify(c));
  ok(`${c.id}: entre 1.2 y 2.6 notas por segundo`, c.porSeg >= 1.2 && c.porSeg <= 2.6, c.porSeg);
  ok(`${c.id}: los tres carriles con trabajo (≥ 15 % cada uno)`, c.carriles.every(x => x >= 0.15), c.carriles);
  ok(`${c.id}: ninguna pegada a otra (≥ 0.2 s)`, c.gapMin >= 0.199, c.gapMin);
  ok(`${c.id}: todas dentro de la canción`, c.dentro);
}

console.log('── 3 · el robot juega Pamgaea 20 s');
const r = await pg.evaluate(async () => {
  const P = window.PALOMAZO, c = P.TEMAS[0];
  await P.lanzar(c);
  if(!P.J.activo) return { error: 'no arrancó' };
  const inicio = P.A.ctx.currentTime;
  return await new Promise(listo => {
    const tic = () => {
      const ahora = P.A.ctx.currentTime;
      if(ahora - inicio > 22){
        const cuenta = { ...P.J.cuenta }, fuente = !!P.J.fuente; P.terminar(false);
        listo({ ...cuenta, fuente, paroAlTerminar: !P.J.fuente }); return;
      }
      for(const n of P.J.notas){
        if(n.est !== 0) continue;
        const tSuena = P.J.t0 + n.p * P.J.pasoDur;   /* la grabación arrancó en t0 */
        if(tSuena - ahora > 1) break;
        if(Math.abs(ahora - tSuena) <= 0.018) P.tocar(n.carril);
      }
      for(let k = 0; k < 3; k++){ const s = P.J.sost[k]; if(s && ahora >= P.J.t0 + (s.sostHasta - 0.2) * P.J.pasoDur) P.soltar(k); }
      requestAnimationFrame(tic);
    };
    tic();
  });
});
ok('la grabación suena mientras se juega', r.fuente, r);
ok('el robot que toca al golpe no falla ninguna', r.fallo === 0 && r.perfecto > 20, r);
ok('al terminar, la canción se calla', r.paroAlTerminar, r);

console.log('── 4 · tu canción');
await pg.evaluate(() => { window.PALOMAZO.ver('pantLista'); });
await pg.click('#bJugar').catch(() => {});
await pg.evaluate(() => { document.querySelector('#bListaVolver'); });
await pg.evaluate(() => { const b = document.getElementById('bJugar'); if(b) b.click(); });
const lista = await pg.textContent('#listaCanc');
ok('la lista tiene «Canciones de verdad» con su crédito', /Canciones de verdad/.test(lista) && /Pamgaea/.test(lista) && /CC BY 4\.0/.test(lista));
const tmp = path.join(os.tmpdir(), 'Mi rola favorita.mp3'); fs.copyFileSync(path.join(RAIZ, 'juegos/palomazo/musica/voxel.mp3'), tmp);
await pg.setInputFiles('#archivoTuya', tmp);
ok('al cargarla sale en «Tus canciones»', await pg.waitForFunction(() => /Mi rola favorita/.test(document.getElementById('listaCanc').textContent), null, { timeout: 30000 }).then(() => true, () => false));
if(process.env.CAPTURAS) await pg.screenshot({ path: path.join(process.env.CAPTURAS, 'palomazo-lista.png'), fullPage: true });
await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(500);
await pg.evaluate(() => document.getElementById('bJugar').click());
ok('se queda guardada al recargar', await pg.waitForFunction(() => /Mi rola favorita/.test(document.getElementById('listaCanc').textContent), null, { timeout: 8000 }).then(() => true, () => false));
const jugable = await pg.evaluate(async () => { const P = window.PALOMAZO, c = P.TUYAS[0]; await P.lanzar(c); const a = P.J.activo && P.J.notas.length > 50; P.terminar(false); return a; });
ok('y se juega (con sus notas guardadas)', jugable);
await pg.evaluate(() => { window.PALOMAZO.ver('pantLista'); document.getElementById('bJugar')?.click(); });
await pg.evaluate(() => document.getElementById('bJugar').click());
await pg.click('.fila-tuya .quitar');
ok('la × la quita', await pg.waitForFunction(() => !/Mi rola favorita/.test(document.getElementById('listaCanc').textContent), null, { timeout: 5000 }).then(() => true, () => false));
ok('sin desborde a 390 px', await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0);
ok('cero errores de consola', errores.length === 0, errores);

await nav.close(); srv.kill();
console.log(`\n${fallan ? '✗' : '✓'}  ${pasan} pasan · ${fallan} fallan`);
process.exit(fallan ? 1 : 0);
