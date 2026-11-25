/* Hace los audios del narrador de MONARCH XR: LINEAS de narrador.js → medios/narrador/<id>.mp3
     MAZI_LLAVE=… node vr/monarca/narrador-armar.mjs            (español → medios/narrador/)
     MAZI_LLAVE=… IDIOMA=en node vr/monarca/narrador-armar.mjs  (inglés → medios/narrador/en/)
   Usa la misma máquina de voces de los anuncios (marca/anuncios/voces.mjs: Google por La Sala, sólo pide lo que
   cambió) y luego deja cada audio en mono a 48 kb/s: en el visor no se nota y el paquete pesa la cuarta parte. */
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
import { LINEAS as ES, VOCES } from './narrador.js';
import { LINEAS_EN } from './narrador-en.js';
const EN = process.env.IDIOMA === 'en', LINEAS = EN ? LINEAS_EN : ES;
const aqui = path.dirname(fileURLToPath(import.meta.url)), dir = path.join(aqui, 'medios', 'narrador', ...(EN ? ['en'] : [])), tmp = path.join(dir, '.tmp');
fs.mkdirSync(tmp, { recursive: true });
fs.writeFileSync(path.join(tmp, 'guion.json'), JSON.stringify({ voces: VOCES, lineas: Object.entries(LINEAS).map(([id, [voz, dice]]) => ({ id, voz, dice })) }, null, 1));
/* lo que ya se hizo (firmas) vive en tmp/voz y se conserva entre corridas */
execFileSync('node', [path.join(aqui, '..', '..', 'marca', 'anuncios', 'voces.mjs'), tmp], { stdio: 'inherit', env: process.env });
let total = 0;
for(const id of Object.keys(LINEAS)){
  const src = path.join(tmp, 'voz', id + '.mp3'), dst = path.join(dir, id + '.mp3');
  if(!fs.existsSync(dst) || fs.statSync(src).mtimeMs > fs.statSync(dst).mtimeMs)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '24000', '-b:a', '48k', dst]);
  total += fs.statSync(dst).size;
}
console.log(`✓ ${Object.keys(LINEAS).length} audios · ${(total / 1024).toFixed(0)} KB en ${path.relative(process.cwd(), dir)}`);
