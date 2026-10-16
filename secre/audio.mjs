/* ══════════════════════════════════════════════════════════════════════════
   SECRE · de la voz de la IA a una nota de voz de WhatsApp
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 16 de octubre: «ponle que me pueda … grabar audios». La voz la hace
   Gemini en La Sala (/ia-voz) y llega como PCM de 16 bits, 24 kHz, mono —
   en WAV o crudo («audio/L16;rate=24000»). WhatsApp sólo la enseña como nota
   de voz (la del micrófono, con su onda) si es OGG con Opus, mono. Eso lo hace
   ffmpeg (ffmpeg-static, fijado en package.json: corre en Render sin instalar
   nada aparte).
   ═════════════════════════════════════════════════════════════════════════ */
import { spawn } from 'child_process';

let rutaFfmpeg = null;
async function ffmpeg(){
  if(rutaFfmpeg) return rutaFfmpeg;
  rutaFfmpeg = process.env.SECRE_FFMPEG || (await import('ffmpeg-static')).default;
  if(!rutaFfmpeg) throw new Error('No hay ffmpeg en este equipo');
  return rutaFfmpeg;
}

/* de qué está hecho lo que mandó la IA */
export function formatoDe(mime, buf){
  if(buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') return { contenedor: 'wav' };
  if(buf.length > 4 && buf.toString('ascii', 0, 4) === 'OggS') return { contenedor: 'ogg' };
  if(buf.length > 3 && (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0))) return { contenedor: 'mp3' };
  const tasa = Number((/rate=(\d+)/i.exec(mime || '') || [])[1]) || 24000;
  return { contenedor: 'pcm', tasa };
}

/** base64 de la IA → Buffer OGG/Opus listo para mandar como nota de voz */
export async function aNotaDeVoz(b64, mime){
  const entrada = Buffer.from(b64, 'base64');
  const f = formatoDe(mime, entrada);
  const args = ['-hide_banner', '-loglevel', 'error'];
  if(f.contenedor === 'pcm') args.push('-f', 's16le', '-ar', String(f.tasa), '-ac', '1');
  args.push('-i', 'pipe:0', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '32k', '-application', 'voip', '-f', 'ogg', 'pipe:1');
  const bin = await ffmpeg();
  return await new Promise((ok, mal) => {
    const p = spawn(bin, args);
    const salida = [], err = [];
    p.stdout.on('data', (d) => salida.push(d));
    p.stderr.on('data', (d) => err.push(d));
    p.on('error', mal);
    p.on('close', (c) => c === 0 && salida.length ? ok(Buffer.concat(salida)) : mal(new Error('ffmpeg: ' + Buffer.concat(err).toString().slice(0, 200))));
    p.stdin.on('error', () => {});
    p.stdin.end(entrada);
  });
}

/** cuántos segundos dura un OGG/Opus (para que WhatsApp enseñe la duración) */
export function segundosOgg(buf){
  /* el último «granule position» de la última página OggS, a 48 kHz */
  const i = buf.lastIndexOf(Buffer.from('OggS'));
  if(i < 0 || i + 14 > buf.length) return 0;
  const g = Number(buf.readBigInt64LE(i + 6));
  return g > 0 ? Math.max(1, Math.round((g - 312) / 48000)) : 0;
}
