#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   TODAS LAS PRUEBAS DE LA TIENDA · `node tienda/nucleo/pruebas-todas.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Corre cada pruebas-*.mjs de esta carpeta, una tras otra (varias venden de
   verdad contra la base de demo: en paralelo se pisarían), y al final dice
   cuáles fallaron. Una prueba sin marcador «N pasan · M fallan» cuenta como
   CAÍDA, no como verde: una corrida que no imprimió fallos también se ve así
   cuando ni siquiera corrió (CLAUDE.md §3.12).
   SOLO=rutas,gps corre sólo ésas. SALTA=personas se salta ésas.
   ═════════════════════════════════════════════════════════════════════════ */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const lista = (v) => (v ? v.split(',') : null);
const solo = lista(process.env.SOLO), salta = lista(process.env.SALTA) || [];
const pruebas = readdirSync(AQUI).filter((f) => /^pruebas-.+\.mjs$/.test(f) && f !== 'pruebas-todas.mjs')
  .map((f) => f.replace(/^pruebas-|\.mjs$/g, '')).filter((n) => (!solo || solo.includes(n)) && !salta.includes(n)).sort();

const filas = [];
for(const n of pruebas){
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(AQUI, `pruebas-${n}.mjs`)], { encoding: 'utf8', timeout: 30 * 60000, maxBuffer: 64 * 1024 * 1024 });
  const salida = (r.stdout || '') + (r.stderr || '');
  const m = [...salida.matchAll(/(\d+) pasan · (\d+) fallan/g)].at(-1);
  const seg = Math.round((Date.now() - t0) / 1000);
  const fila = m ? { n, bien: +m[1], mal: +m[2], seg } : { n, caida: true, seg, cola: salida.trim().split('\n').slice(-4).join(' | ') };
  filas.push(fila);
  console.log(`  ${fila.caida ? '✗ CAÍDA' : fila.mal ? '✗' : '✓'} ${n.padEnd(20)} ${fila.caida ? fila.cola.slice(0, 160) : `${fila.bien} pasan · ${fila.mal} fallan`}  (${seg} s)`);
}
const malas = filas.filter((f) => f.caida || f.mal);
const total = filas.reduce((t, f) => t + (f.bien || 0), 0);
console.log(`\n${malas.length ? '✗' : '✓'} ${filas.length} archivos · ${total} comprobaciones en verde · ${malas.length ? `fallan: ${malas.map((f) => f.n).join(', ')}` : 'ninguno falla'}\n`);
process.exit(malas.length ? 1 : 0);
