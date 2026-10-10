#!/usr/bin/env node
/* ESTUDIO · pruebas del motor de audio, en Node, sin navegador.
   Se arma una «voz» de mentira (sílabas con armónicos, como una persona) con
   pausas y ruido de cuarto, y se comprueba lo que el que escucha notaría:
   que las pausas largas se acorten sin comerse las cortas, que quede al
   volumen de plataforma, que nada pase del techo y que el MP3 salga.
   Correr:  node podcast/pruebas-motor.mjs */
import fs from 'fs'; import vm from 'vm'; import path from 'path';
import * as M from './motor.js';
import { jingle, ESTILOS, azar } from './jingle.js';

let bien = 0, mal = 0;
const ok = (q, c, extra) => { console.log((c ? '  ✓ ' : '  ✗ ') + q + (!c && extra != null ? ' · ' + extra : '')); c ? bien++ : mal++; };
const SR = M.SR;

/* sílabas de 0.18 s en racimos (palabras) con pausas cortas entre palabras
   y pausas largas entre frases; todo encima de un siseo de −55 dB */
function vozFalsa(frases = 5, pausaLarga = 2.2, nivel = 0.3, semilla = 3){
  const rnd = azar(semilla), partes = [];
  const silencio = (s) => new Float32Array(Math.round(s * SR));
  for(let f = 0; f < frases; f++){
    for(let w = 0; w < 6; w++){
      for(let s = 0; s < 3; s++){
        const n = Math.round(0.18 * SR), a = new Float32Array(n), f0 = 120 + rnd() * 60;
        for(let i = 0; i < n; i++){
          const t = i / SR, e = Math.sin(Math.PI * i / n);
          a[i] = nivel * e * (Math.sin(2 * Math.PI * f0 * t) + 0.5 * Math.sin(4 * Math.PI * f0 * t) + 0.3 * Math.sin(6 * Math.PI * f0 * t) + 0.15 * Math.sin(2 * Math.PI * 2400 * t));
        }
        partes.push(a);
      }
      partes.push(silencio(0.15));              /* entre palabras: no se toca */
    }
    partes.push(silencio(pausaLarga));          /* entre frases: se acorta */
  }
  const x = M.unir(partes, SR, 0);
  for(let i = 0; i < x.length; i++) x[i] += (rnd() * 2 - 1) * 0.0018;
  return x;
}

console.log('\n1 · medir');
const tono = new Float32Array(SR * 3).map((_, i) => 0.1 * Math.sin(2 * Math.PI * 1000 * i / SR));
const lt = M.lufs(tono);
ok('un seno de 1 kHz a −20 dBFS mide ~−23 LUFS (BS.1770 da −23.0 en mono)', Math.abs(lt - (-23.0)) < 0.6, lt.toFixed(2));
ok('el silencio mide −∞', M.lufs(new Float32Array(SR)) === -Infinity);

console.log('\n2 · silencios');
const voz = vozFalsa();
const r = M.recortarSilencios(voz);
ok('se quitan las pausas largas (5 de 2.2 s → ~0.35 s)', Math.abs(r.quitado - 5 * (2.2 - 0.35)) < 0.8, r.quitado.toFixed(2) + ' s');
ok('son 5 cortes, uno por frase', r.cortes === 5, r.cortes);
const r2 = M.recortarSilencios(vozFalsa(5, 0.5));
ok('las pausas de medio segundo NO se tocan (sonaría a robot)', r2.cortes === 0, r2.cortes);
let saltos = 0; for(let i = 1; i < r.datos.length; i++) if(Math.abs(r.datos[i] - r.datos[i - 1]) > 0.35) saltos++;
ok('las uniones no truenan (ningún salto brusco entre muestras)', saltos === 0, saltos);

console.log('\n3 · limpiar completo');
const bajita = vozFalsa(4, 2, 0.04);
const L = M.limpiar(bajita);
ok('una voz bajita queda a −19 LUFS (±1)', Math.abs(L.despues.lufs - M.META_LUFS) <= 1, L.despues.lufs.toFixed(2));
ok('ningún pico pasa de −1 dB', L.despues.pico <= -1, L.despues.pico.toFixed(2));
ok('y queda más corta que antes', L.despues.segundos < L.antes.segundos - 5, L.antes.segundos.toFixed(1) + ' → ' + L.despues.segundos.toFixed(1));
const ruidoAntes = M.pisoDeRuido(M.filtrar(Float32Array.from(bajita), 'pasaaltos', 80));
const sinSil = M.limpiar(bajita, SR, { silencios: false });
const g = M.dbALineal(sinSil.despues.lufs - L.antes.lufs);   /* lo que subió el volumen */
ok('el siseo entre frases baja más de lo que subió la voz', M.pisoDeRuido(sinSil.datos) < ruidoAntes + M.linealADb(g) - 8,
   (M.pisoDeRuido(sinSil.datos)).toFixed(1) + ' vs ' + (ruidoAntes + M.linealADb(g)).toFixed(1));
const fuerte = vozFalsa(3, 1, 1.4);
const Lf = M.limpiar(fuerte, SR, { silencios: false });
ok('una voz que satura también queda en su lugar', Math.abs(Lf.despues.lufs - M.META_LUFS) <= 1 && Lf.despues.pico <= -1, Lf.despues.lufs.toFixed(2));

console.log('\n4 · la música');
for(const est of Object.keys(ESTILOS)){
  const j = jingle({ estilo: est, segundos: 10, semilla: 5 });
  const l = M.lufs(j), p = M.linealADb(M.pico(j));
  ok(`${ESTILOS[est].nombre}: suena (−20 LUFS ±1.5) y no satura`, Math.abs(l + 20) <= 1.5 && p <= -1, l.toFixed(1) + ' / ' + p.toFixed(1));
  ok(`${ESTILOS[est].nombre}: dura lo pedido (8 a 15 s con su cola)`, j.length / SR >= 8 && j.length / SR <= 15, (j.length / SR).toFixed(1));
}
const a1 = jingle({ estilo: 'pop', segundos: 8, semilla: 42 }), a2 = jingle({ estilo: 'pop', segundos: 8, semilla: 42 });
const b1 = jingle({ estilo: 'pop', segundos: 8, semilla: 43 });
ok('la misma semilla da la misma canción', a1.length === a2.length && a1.every((v, i) => v === a2[i]));
let dif = 0; const n = Math.min(a1.length, b1.length); for(let i = 0; i < n; i++) dif += Math.abs(a1[i] - b1[i]);
ok('otra semilla da otra canción', dif / n > 0.005, (dif / n).toFixed(4));
const cierre = jingle({ estilo: 'lofi', segundos: 8, semilla: 2, final: 'fundido' });
const colaFinal = M.linealADb(M.pico(cierre.subarray(cierre.length - Math.round(0.1 * SR))));
ok('el cierre se desvanece hasta casi nada', colaFinal < -30, colaFinal.toFixed(1));

console.log('\n5 · armar el episodio');
const ep = M.limpiar(vozFalsa(3, 1)).datos;
const intro = jingle({ estilo: 'lofi', segundos: 8, semilla: 9 });
const vozIntro = M.limpiar(vozFalsa(1, 0.2)).datos;
const out = M.armar({ intro, vozIntro, episodio: ep, cierre: cierre });
const total = out.datos.length / SR;
ok('dura intro + episodio + cierre, menos los cruces', total > ep.length / SR + 5 && total < ep.length / SR + 8 + 9 + 6, total.toFixed(1));
ok('queda a −19 LUFS y sin pasarse del techo', Math.abs(M.lufs(out.datos) - M.META_LUFS) <= 1 && M.linealADb(M.pico(out.datos)) <= -1);
/* la música se baja donde habla la frase de entrada: compara música sola contra mezcla */
const soloMusica = M.armar({ intro, episodio: new Float32Array(SR * 2), cierre: null }).datos;
const ini = Math.round(2.4 * SR), fin = ini + Math.round(0.3 * SR);
const rms = (x, a, b) => { let s = 0; for(let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };
ok('la intro se puede armar sin frase de entrada', soloMusica.length > intro.length * 0.8);
const marcas = out.marcas;
ok('el episodio entra antes de que acabe la música (cruce)', marcas.episodio[0] < marcas.introFin, JSON.stringify(marcas));
const sinIntro = M.armar({ episodio: ep });
ok('sin intro ni cierre, es sólo el episodio', Math.abs(sinIntro.datos.length - ep.length) < 2);
void rms; void fin;

console.log('\n6 · exportar');
const wav = M.aWav(ep);
ok('el WAV trae su cabecera RIFF y 16 bits', String.fromCharCode(...wav.subarray(0, 4)) === 'RIFF' && wav.length === 44 + ep.length * 2);
const lameSrc = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'vendor/lame-1.2.1.min.js'), 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(lameSrc + ';this.lamejs = lamejs;', ctx);
const mp3 = await M.aMp3(out.datos, SR, 96, ctx.lamejs);
ok('el MP3 empieza con un marco válido (0xFFE…)', mp3[0] === 0xFF && (mp3[1] & 0xE0) === 0xE0, mp3[0].toString(16) + ' ' + mp3[1].toString(16));
const kbps = mp3.length * 8 / total / 1000;
ok('y pesa lo que debe a 96 kbps (±10 %)', Math.abs(kbps - 96) < 10, kbps.toFixed(1) + ' kbps');
ok('tiempo() escribe minutos y segundos', M.tiempo(75.4) === '1:15' && M.tiempo(5) === '0:05');

console.log(`\n${mal ? '✗' : '✓'} estudio · motor · ${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
