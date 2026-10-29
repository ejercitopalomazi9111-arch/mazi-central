/* La música del 07 cambia a la mitad: de elevador (la plantilla) a algo con ganas (lo nuestro).
   Arma /tmp/claude-0/musica/mezcla-07.mp3 con el corte justo donde entra la línea 05.
     node marca/anuncios/07-la-plantilla/musica.mjs */
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const g = JSON.parse(fs.readFileSync(path.join(AQUI, 'guion.json'))), dur = JSON.parse(fs.readFileSync(path.join(AQUI, 'voz/duraciones.json')));
let t = 0, corte = 0; for(const l of g.lineas){ const t0 = l.en ?? (t + (l.pausa ?? .25)); if(l.id === '05') corte = t0 - .35; t = t0 + dur[l.id]; }
const M = '/tmp/claude-0/musica/', total = t + 3;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', M + 'Local_Forecast__Elevator.mp3', '-ss', '20', '-i', M + 'Funkorama.mp3', '-filter_complex',
  `[0:a]atrim=0:${corte + .25},afade=t=out:st=${corte - .05}:d=0.3,asetpts=PTS-STARTPTS[a];[1:a]atrim=0:${total - corte},afade=t=in:d=0.08,adelay=${Math.round(corte * 1000)}|${Math.round(corte * 1000)}[b];[a][b]amix=inputs=2:normalize=0[m]`,
  '-map', '[m]', '-t', String(total), M + 'mezcla-07.mp3']);
console.log('✓ mezcla-07.mp3 · corte en', corte.toFixed(2), 's');
