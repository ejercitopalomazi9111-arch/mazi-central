#!/usr/bin/env node
/* Pruebas de LAS PIEZAS ARMADAS de CRISOL.

   ⚠ Aparte de pruebas.mjs a propósito. Aquéllas comprueban que el MOTOR sabe
   disparar: arman la pistola celda por celda con la geometría perfecta. Éstas
   comprueban que LA PIEZA QUE PONE EL BOTÓN dispara — que es lo que Carlos
   toca. Son dos cosas y ya nos costó confundirlas: el motor llevaba días
   sabiendo disparar mientras él no lograba armar una. */
import { Mundo, IDX } from './motor.js';
import { pistola, dispara, recarga, cabe, tocada, RECETA, ALTO, LARGO, MATERIALES } from './piezas.js';

let bien = 0, mal = 0;
const ok = (t, c, det) => { c ? bien++ : mal++;
  console.log((c ? '  ✓ ' : '  ✗ ') + t + (det != null && !c ? '  → ' + det : '')); };
const seccion = t => console.log('\n── ' + t + ' ──');
const mundo = (an, al, s = 7) => { const m = new Mundo(an, al); m.semilla(s); return m; };
const repisa = (m, y) => { for(let x = 0; x < m.an; x++) m.pon(x, y, IDX.muro); };

/* Dispara y sigue a la bala. Devuelve hasta dónde llegó el metal MÁS LEJANO
   por delante de la boca, y a qué velocidad máxima viajó.
   ⚠ Se mide DURANTE los pasos, no al final: la bala se sale del mundo o se
   estrella, y medir al final es medir un cadáver. Esa es la falla de diseño
   que ya me costó dos tandas de pruebas en las plantas. */
function tira(m, p, pasos = 200){
  dispara(m, p);
  const boca = p.dir > 0 ? p.x1 : p.x0;
  let vmax = 0, lejos = p.dir > 0 ? 0 : m.an;
  for(let i = 0; i < pasos; i++){
    m.paso();
    for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.metal){
      const x = k % m.an;
      vmax = Math.max(vmax, Math.abs(m.vx[k]));
      lejos = p.dir > 0 ? Math.max(lejos, x) : Math.min(lejos, x);
    }
  }
  return { vmax, lejos, boca, avance: (lejos - boca) * p.dir };
}

seccion('la pistola que pone el botón');
{
  /* ── 1 · APUNTANDO A LA DERECHA ─────────────────────────────────────────
     El caso de todos los días. Si esto falla, el botón no sirve de nada. */
  const m = mundo(160, 60);
  repisa(m, 58);
  const p = pistola(m, 10, 52, 1);
  ok('la pieza se pinta sola y queda cargada',
     m.t[m.i(p.chispa.x, p.chispa.y)] === IDX.polvora);
  const r = tira(m, p);
  ok('y DISPARA: la bala sale por la boca', r.avance > 20,
     'llegó a x=' + r.lejos + ', la boca está en ' + r.boca);
  ok('a velocidad de bala, no de canica', r.vmax > 1.5,
     r.vmax.toFixed(2) + ' celdas/paso');
}
{
  /* ── 2 · Y A LA IZQUIERDA ───────────────────────────────────────────────
     Esta prueba la escribí porque el espejo es donde se rompen las cosas: la
     recámara, la culata y la chispa cambian de lado los tres a la vez, y basta
     que uno se quede en su sitio para que el arma se dispare hacia sí misma. */
  const m = mundo(160, 60);
  repisa(m, 58);
  const p = pistola(m, 150, 52, -1);
  const r = tira(m, p);
  ok('apuntando a la izquierda también DISPARA', r.avance > 20,
     'llegó a x=' + r.lejos + ', la boca está en ' + r.boca);
  ok('y no se dispara al revés: nada de metal detrás de la culata',
     (() => { for(let k = 0; k < m.t.length; k++)
       if(m.t[k] === IDX.metal && (k % m.an) > p.x1 + 1) return false; return true; })());
}
{
  /* ── 3 · LOS TRES MATERIALES DE CAÑÓN ───────────────────────────────────
     La recámara es siempre muro —eso no es opción, es la receta—, pero el
     resto del cañón lo elige quien juega. Los tres tienen que disparar o el
     selector es un adorno que rompe el arma. */
  for(const canon of MATERIALES){
    const m = mundo(160, 60);
    repisa(m, 58);
    const p = pistola(m, 10, 52, 1, canon);
    const r = tira(m, p);
    ok('con cañón de ' + canon + ' DISPARA', r.avance > 20 && r.vmax > 1.5,
       'avanzó ' + r.avance + ' a ' + r.vmax.toFixed(2));
  }
}
{
  /* ── 4 · EN EL AIRE, NO SÓLO SOBRE EL SUELO ─────────────────────────────
     Carlos la va a poner donde se le antoje. Una pistola que sólo funciona
     apoyada en la repisa de una prueba no es una pistola. */
  const m = mundo(160, 60);
  repisa(m, 58);
  const p = pistola(m, 10, 20, 1);
  const r = tira(m, p);
  ok('puesta en el aire también DISPARA', r.avance > 20,
     'avanzó ' + r.avance);
}
{
  /* ── 5 · EL GATILLO ─────────────────────────────────────────────────────
     `dispara` tiene que decir la verdad: sí cuando prendió, no cuando ya no
     queda carga. Una pistola gastada que contesta «sí» deja a quien juega
     tocándola cuarenta veces sin entender nada. */
  const m = mundo(160, 60);
  repisa(m, 58);
  const p = pistola(m, 10, 52, 1);
  ok('el gatillo prende la carga', dispara(m, p) === true);
  for(let i = 0; i < 120; i++) m.paso();
  ok('y vacía ya no prende', dispara(m, p) === false);
  ok('pero recargada SÍ vuelve a prender',
     recarga(m, p) && dispara(m, p) === true);
}
{
  /* ── 6 · NO SE PONE A MEDIAS ────────────────────────────────────────────
     Media pistola con la boca fuera del mundo es un tubo cerrado: la carga no
     tiene por dónde salir y revienta la recámara encima de quien la puso. */
  const m = mundo(60, 40);
  ok('no cabe pegada al borde derecho', cabe(m, 55, 20, 1) === false);
  ok('no cabe pegada al borde izquierdo', cabe(m, 4, 20, -1) === false);
  ok('sí cabe con espacio', cabe(m, 10, 20, 1) === true);
  ok('el alto declarado es el que ocupa', ALTO === RECETA.anima + 2);
  ok('el largo declarado es el que ocupa', LARGO === RECETA.canon + 1);
}
{
  /* ── 7 · EL TOQUE CAE SOBRE ELLA ────────────────────────────────────────
     Con el dedo encima del arma no se ve dónde se está tocando, así que la
     zona sensible lleva holgura. Sin esto el gatillo falla y quien juega
     acaba pintando pólvora encima de su propia pistola. */
  const m = mundo(160, 60);
  const p = pistola(m, 10, 20, 1);
  ok('tocar el centro la acciona', tocada(p, 20, 21) === true);
  ok('tocar una celda al lado también', tocada(p, p.x1 + 1, 21) === true);
  ok('tocar lejos NO la acciona', tocada(p, p.x1 + 10, 21) === false);
}

console.log((mal ? '\n✗  ' : '\n✓  ') + bien + ' pasan · ' + mal + ' fallan');
process.exit(mal ? 1 : 0);
