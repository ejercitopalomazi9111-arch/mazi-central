/* MAZI VR · el filtro 6DoF (seis.js) con caminatas inventadas de las que se sabe la verdad.
     node vr/pruebas-seis.mjs */
import { crearSeis, qMul, camaraThree, rumboDe, aThree } from './seis.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const cerca = (a, b, tol) => Math.abs(a - b) < tol;
/* una cámara del VIO (OpenCV) mirando al «norte» del VIO con rumbo r: en el mundo del VIO (z arriba) mirar de lado es
   girar sobre z. Cámara cv mirando a +y del VIO: z_cv = (0,1,0), x_cv = (1,0,0), y_cv = (0,0,-1) */
const S2 = Math.SQRT1_2;
const qBase = [S2, -S2, 0, 0];   /* gira la cámara cv para que su z (adelante) quede en +y del mundo y su y (abajo) en −z */
const qZ = (a) => [Math.cos(a / 2), 0, 0, Math.sin(a / 2)];
const camVio = (rumboVio) => qMul(qZ(rumboVio), qBase);
const qY = (a) => [Math.cos(a / 2), 0, Math.sin(a / 2), 0];

/* 0. la conversión: la cámara del VIO mirando a +y queda mirando a −z en three (rumbo 0) */
sí(cerca(rumboDe(camaraThree(camVio(0))), 0, 1e-9), 'la cámara del VIO mirando a +y es «enfrente» en three');
sí(JSON.stringify(aThree([0, 0, 1])) === JSON.stringify([0, 1, -0]) || aThree([0, 0, 1])[1] === 1, 'arriba del VIO (z) es arriba en three (y)');

/* 1. el VIO y el giroscopio no coinciden de lado (90°): caminar 1 m «enfrente» en el VIO es caminar enfrente en la vista */
{
  const f = crearSeis(); const rv = Math.PI / 2;   /* en el VIO la cabeza ve hacia su rumbo 90° */
  const qG = qY(0);                                  /* el giroscopio dice que ves enfrente (rumbo 0) */
  const qc = camVio(rv); const adelanteVio = [-Math.sin(rv), Math.cos(rv), 0];  /* +y girado 90° sobre z */
  for(let i = 0; i <= 60; i++){ const k = i / 60; f.paso({ q: qc, p: adelanteVio.map((x) => x * k), estado: 'track' }, qG, { agitado: .6 }, i * 33); }
  const p = f.st.pos;
  sí(cerca(p[2], -1, .02) && cerca(p[0], 0, .02), `caminar 1 m enfrente en el VIO → enfrente en la vista (${p.map((x) => x.toFixed(3)).join(', ')})`);
}
/* 2. un brinco imposible se tira */
{
  const f = crearSeis(); const qc = camVio(0), qG = qY(0);
  f.paso({ q: qc, p: [0, 0, 0], estado: 'track' }, qG, { agitado: .6 }, 0);
  f.paso({ q: qc, p: [0, .02, 0], estado: 'track' }, qG, { agitado: .6 }, 33);
  f.paso({ q: qc, p: [0, 1.5, 0], estado: 'track' }, qG, { agitado: .6 }, 66);   /* 1.48 m en 33 ms */
  f.paso({ q: qc, p: [0, 1.52, 0], estado: 'track' }, qG, { agitado: .6 }, 99);
  sí(cerca(-f.st.pos[2], .04, .005) && f.st.tirado.brinco === 1, `un brinco de 1.5 m se tira y lo demás se suma (${(-f.st.pos[2]).toFixed(3)} m)`);
}
/* 3. deslizarse sin pasos (lo que vio Carlos) se tira; caminando de verdad, no */
{
  const quieto = crearSeis(), caminando = crearSeis(); const qc = camVio(0), qG = qY(0);
  for(let i = 0; i <= 30; i++){ const p = [0, i * .02, 0];    /* 0.6 m/s durante 1 s */
    quieto.paso({ q: qc, p, estado: 'track' }, qG, { agitado: .05 }, i * 33);
    caminando.paso({ q: qc, p, estado: 'track' }, qG, { agitado: .9 }, i * 33); }
  sí(Math.hypot(quieto.st.pos[0], quieto.st.pos[2]) < .05, `parado, el VIO «se va» 0.6 m y te quedas (${Math.hypot(quieto.st.pos[0], quieto.st.pos[2]).toFixed(3)} m)`);
  sí(cerca(-caminando.st.pos[2], .6, .02), `dando pasos, el mismo movimiento sí cuenta (${(-caminando.st.pos[2]).toFixed(3)} m)`);
}
/* 4. mover la cabeza despacio estando parado sí cuenta (paralaje) */
{
  const f = crearSeis(); const qc = camVio(0), qG = qY(0);
  for(let i = 0; i <= 30; i++) f.paso({ q: qc, p: [i * .003, 0, 0], estado: 'track' }, qG, { agitado: .05 }, i * 33);
  sí(cerca(f.st.pos[0], .09, .005), `ladear la cabeza 9 cm sin pasos se ve (${f.st.pos[0].toFixed(3)} m)`);
}
/* 5. perdido: te quedas; al volver, sigue desde ahí sin brincar */
{
  const f = crearSeis(); const qc = camVio(0), qG = qY(0);
  for(let i = 0; i <= 10; i++) f.paso({ q: qc, p: [0, i * .02, 0], estado: 'track' }, qG, { agitado: .9 }, i * 33);
  const antes = f.st.pos[2];
  for(let i = 11; i <= 20; i++) f.paso(null, qG, { agitado: .9 }, i * 33);
  /* el VIO se reinició: su origen cambió a 5 m de distancia */
  for(let i = 21; i <= 31; i++) f.paso({ q: qc, p: [5, 5 + (i - 21) * .02, 0], estado: 'track' }, qG, { agitado: .9 }, i * 33);
  sí(f.st.estado === 'seis' && cerca(f.st.pos[2] - antes, -.2, .02), `perder el rastreo y volver con otro origen no te teletransporta (${(f.st.pos[2] - antes).toFixed(3)} m)`);
}
/* 6. «coast» largo no se suma */
{
  const f = crearSeis(); const qc = camVio(0), qG = qY(0);
  for(let i = 0; i <= 30; i++) f.paso({ q: qc, p: [0, i * .02, 0], estado: 'coast' }, qG, { agitado: .9 }, i * 33);
  sí(-f.st.pos[2] < .21, `ir sólo con el sensor (coast) cuenta 0.3 s y luego se detiene (${(-f.st.pos[2]).toFixed(3)} m de 0.6)`);
}
/* 7. el desplazamiento cámara→ojos: girar la cabeza en su lugar no mueve los ojos */
{
  const f = crearSeis(); const ojo = [.05, .02, -.06], qG = qY(0);
  /* la cámara gira alrededor de los ojos: p = ojos − R·ojo */
  for(let i = 0; i <= 30; i++){ const r = i * .03, q = camVio(r); const R = (v) => { const p = qMul(qMul(q, [0, ...v]), [q[0], -q[1], -q[2], -q[3]]); return [p[1], p[2], p[3]]; };
    const ro = R(ojo); f.paso({ q, p: [-ro[0], -ro[1], -ro[2]], estado: 'track' }, qY(r), { agitado: .05 }, i * 33, ojo); }
  sí(Math.hypot(...f.st.pos) < .002, `girar 50° en tu lugar no mueve tus ojos (${(Math.hypot(...f.st.pos) * 100).toFixed(2)} cm)`);
}
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
