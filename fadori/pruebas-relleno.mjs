#!/usr/bin/env node
/* Las pruebas de relleno.js: los enlaces de YouTube y Spotify, y la carátula
   de un MP3. Sin navegador ni red.   node fadori/pruebas-relleno.mjs */
import { enlace, leerID3, largoID3, YT } from './relleno.js';
let bien = 0; const fallas = [];
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { fallas.push(q); console.log('  ✗ ' + q + (d ? ' · ' + d : '')); } };

console.log('1 · enlaces de YouTube');
const yt = (u) => enlace(u, { origen: 'https://ejemplo.mx' });
for(const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?si=abc', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/live/dQw4w9WgXcQ'])
  ok('lee el video de ' + u.replace(/^https:\/\//, '').slice(0, 30), (yt(u) || {}).id === 'dQw4w9WgXcQ', JSON.stringify(yt(u)));
const l = yt('https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG');
ok('una lista sola se pone como lista', l && l.lista === 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG' && /embed\/videoseries\?/.test(l.embed));
const e = yt('https://youtu.be/dQw4w9WgXcQ').embed;
ok('se mete por youtube-nocookie, con autoplay y para poder pausarlo', /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/.test(e) && /autoplay=1/.test(e) && /enablejsapi=1/.test(e));
ok('y con el origen de la página (si no, YouTube no contesta)', /origin=https%3A%2F%2Fejemplo\.mx/.test(e));
ok('un id raro no pasa', yt('https://www.youtube.com/watch?v=<script>') === null);
ok('una página que no es de YouTube no pasa', yt('https://youtube.com.malo.mx/watch?v=dQw4w9WgXcQ') === null);

console.log('2 · enlaces de Spotify');
const sp = enlace('https://open.spotify.com/intl-es/track/4uLU6hMCjMI75M1A2tKUQC?si=x');
ok('una canción con /intl-es/', sp && sp.clase === 'track' && sp.id === '4uLU6hMCjMI75M1A2tKUQC');
ok('se mete con su dirección de marco', sp && sp.embed.startsWith('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC'));
ok('una lista', (enlace('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M') || {}).clase === 'playlist');
ok('Spotify no trae video: se ve su carátula', sp && sp.conVideo === false);
ok('basura no es enlace', enlace('hola') === null && enlace('') === null && enlace('https://open.spotify.com/') === null);

console.log('3 · la etiqueta de un MP3');
/* una etiqueta ID3 v2.3 hecha a mano: título UTF-16, artista latin-1 y portada PNG */
const marco = (id, datos) => { const n = datos.length; return [...Buffer.from(id), (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255, 0, 0, ...datos]; };
const tit = [1, 0xFF, 0xFE, ...Buffer.from('Canción del recreo', 'utf16le')];
const art = [0, ...Buffer.from('Grupo 3.1', 'latin1')];
const png = [0x89, 0x50, 0x4E, 0x47, ...Array(200).fill(7)];
const apic = [0, ...Buffer.from('image/png'), 0, 3, ...Buffer.from('tapa'), 0, ...png];
const cuerpo = [...marco('TIT2', tit), ...marco('TPE1', art), ...marco('APIC', apic), ...Array(40).fill(0)];
const n = cuerpo.length;
const tag = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, (n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127, ...cuerpo, 0xFF, 0xFB, 1, 2, 3]);
ok('sabe cuánto mide la etiqueta (para no leer la canción entera)', largoID3(tag) === 10 + n, largoID3(tag) + ' vs ' + (10 + n));
const r = leerID3(tag);
ok('el título, con acento y en UTF-16', r.titulo === 'Canción del recreo', r.titulo);
ok('el artista', r.artista === 'Grupo 3.1', r.artista);
ok('la carátula, completa y con su tipo', r.portada && r.portada.mime === 'image/png' && r.portada.bytes.length === png.length && r.portada.bytes[1] === 0x50);
/* portada con tipo 0 y descripción en UTF-16 (dos bytes de fin): así la guardan otros programas */
const apic2 = [1, ...Buffer.from('image/jpeg'), 0, 0, 0xFF, 0xFE, ...Buffer.from('frente', 'utf16le'), 0, 0, 0xFF, 0xD8, ...Array(120).fill(9)];
const c2 = marco('APIC', apic2), n2 = c2.length;
const tag2 = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, (n2 >> 21) & 127, (n2 >> 14) & 127, (n2 >> 7) & 127, n2 & 127, ...c2]);
const r2 = leerID3(tag2);
ok('la carátula empieza justo donde debe (FF D8), aunque la descripción venga en UTF-16', r2.portada && r2.portada.bytes[0] === 0xFF && r2.portada.bytes[1] === 0xD8 && r2.portada.mime === 'image/jpeg',
  r2.portada && [...r2.portada.bytes.slice(0, 4)].join(','));
ok('un archivo sin etiqueta no truena', JSON.stringify(leerID3(new Uint8Array([0xFF, 0xFB, 0, 0]))) === '{}' && largoID3(new Uint8Array(3)) === 0);
ok('una etiqueta mocha (cortada a la mitad) no truena', (() => { try{ leerID3(tag.slice(0, 40)); return true; }catch(e){ return false; } })());

console.log('4 · los mensajes de YouTube');
ok('«acabó» llega como onStateChange 0', YT.estado('{"event":"onStateChange","info":0}') === 0);
ok('y también dentro de infoDelivery', YT.estado({ event: 'infoDelivery', info: { playerState: 1, currentTime: 3 } }) === 1);
ok('lo que no es de YouTube se ignora', YT.estado('hola') === null && YT.estado({ fadori: 'kiosco-fin' }) === null);

console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ relleno · ' + bien + '/' + bien}`);
process.exit(fallas.length ? 1 : 0);
