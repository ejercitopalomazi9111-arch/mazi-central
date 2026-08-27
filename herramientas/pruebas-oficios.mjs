#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   pruebas-oficios.mjs — que los oficios sirvan sin una sola llave puesta
   ──────────────────────────────────────────────────────────────────────────
   Lo que se prueba aquí es lo que NO depende de tener saldo:

     · que la fila salte a los que no tienen llave y GRITE en vez de
       marcarlos como agotados — confundir «no hay llave» con «no hay saldo»
       es el defecto más caro de todo el relevo;
     · que los cuadros de un video salgan SIN ffmpeg, con el navegador, y que
       caigan en momentos DISTINTOS. Ésa es la parte que podía verse bien y
       estar mal: si los saltos fallan, salen N copias del cuadro cero y la
       revisión «funciona» describiendo cuatro veces la misma imagen.

   Se hace su propio video de prueba —cinco colores planos, uno por segundo—
   porque un video que uno controla es el único contra el que se puede
   afirmar «cayeron en momentos distintos» y no sólo «salieron cuadros».

     node herramientas/pruebas-oficios.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cargar, conEstado, cuadrosConNavegador, imagenPollinations } from './oficios.mjs';

let pasan = 0, fallan = 0;
const ok = (que, cierto) => {
  console.log(`  ${cierto ? '✓' : '✗'} ${que}`);
  cierto ? pasan++ : fallan++;
};

async function navegador(){
  for(const d of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs',
                  '/usr/lib/node_modules/playwright/index.mjs']){
    try{ return (await import(d)).chromium; }catch(e){ /* el siguiente */ }
  }
  return null;
}

console.log('\n· La fila de cada oficio');
{
  for(const nombre of ['imagen','mirar','oir','escribir']){
    const o = await cargar(nombre);
    ok(`${nombre} tiene fila y cada quien dice por qué está ahí`,
       o.fila.length > 0 && o.fila.every(p => p.porque && p.porque.length > 20));
  }
  const img = await cargar('imagen');
  /* Groq es el primero en TODO lo que sabe hacer, como pidió Carlos — pero no
     genera imágenes, así que en este oficio no puede ir. Que la prueba lo
     vigile evita que alguien lo "arregle" moviéndolo al frente. */
  ok('imagen NO arranca con Groq, porque Groq no genera imágenes',
     !/groq/i.test(img.fila[0].id));
  ok('imagen termina en un proveedor SIN llave, para que nunca quede en cero',
     img.fila[img.fila.length - 1].llave === null);
  for(const nombre of ['mirar','oir','escribir']){
    const o = await cargar(nombre);
    ok(`${nombre} sí arranca con Groq`, /groq/i.test(o.fila[0].id));
  }
}

console.log('\n· Falta de llave ≠ falta de saldo');
{
  const antes = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const { oficios } = await import('./oficios.mjs');
  const r = await oficios.oir('/no/existe.m4a');
  ok('sin llave, el oficio no dice que se acabó el uso',
     !r.ok && r.saltados.some(s => /ES LA LLAVE/.test(s)));
  ok('y nombra la variable que falta, para poder ponerla',
     r.saltados.some(s => /GROQ_API_KEY/.test(s)));
  if(antes) process.env.GROQ_API_KEY = antes;
}

console.log('\n· Cuadros de un video, sin ffmpeg');
{
  const chromium = await navegador();
  if(!chromium){
    console.log('  · sin playwright en esta máquina, se salta');
  }else{
    const video = join(tmpdir(), 'mazi-prueba-video.webm');
    /* Cinco segundos, un color plano por segundo. */
    const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
    const pag = await b.newPage();
    await pag.setContent('<canvas id="c" width="320" height="180"></canvas>');
    const b64 = await pag.evaluate(async () => {
      const c = document.getElementById('c'), g = c.getContext('2d');
      const trozos = [];
      const rec = new MediaRecorder(c.captureStream(20), { mimeType:'video/webm' });
      rec.ondataavailable = e => trozos.push(e.data);
      rec.start();
      for(const col of ['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff']){
        g.fillStyle = col; g.fillRect(0,0,320,180);
        await new Promise(r => setTimeout(r, 1000));
      }
      await new Promise(r => { rec.onstop = r; rec.stop(); });
      const buf = await new Blob(trozos, {type:'video/webm'}).arrayBuffer();
      let s = ''; const u = new Uint8Array(buf);
      for(let i=0;i<u.length;i++) s += String.fromCharCode(u[i]);
      return btoa(s);
    });
    await writeFile(video, Buffer.from(b64, 'base64'));
    await b.close();

    const { fotos, dura } = await cuadrosConNavegador(video, 5);
    ok('salen los 5 cuadros pedidos', fotos.length === 5);
    ok('y son imágenes de verdad, no cadenas vacías',
       fotos.every(f => f.startsWith('data:image/jpeg;base64,') && f.length > 800));
    ok(`lee cuánto dura (${dura.toFixed(1)} s)`, dura > 3 && dura < 8);
    /* ⚠ LA PRUEBA QUE IMPORTA. Cuadros distintos = momentos distintos. Si el
       salto no funciona salen copias del primero y TODO LO DEMÁS PASA: pesan,
       son JPEG válidos, y el modelo describe muy bien la misma imagen cinco
       veces.

       Se piden 4 de 5 y no 5 de 5 a propósito: MediaRecorder no reparte los
       cinco colores en segundos exactos —este video de «cinco segundos» sale
       de 4.0— así que dos muestras pueden caer legítimamente en el mismo
       color. Exigir cinco haría fallar la prueba por el grabador y no por el
       extractor, que es lo que se está midiendo. */
    ok(`al menos 4 de 5 cuadros son de momentos distintos (${new Set(fotos).size})`,
       new Set(fotos).size >= 4);
    await unlink(video).catch(() => {});
  }
}

console.log('\n· Una imagen de verdad, sin ninguna llave');
{
  const p = (await cargar('imagen')).fila.find(x => x.clase === 'pollinations');
  const r = await imagenPollinations(p, 'un circulo violeta sobre fondo negro');
  if(r.ok){
    ok('el último de la fila entrega bytes de imagen', r.bytes.length > 2000);
    /* Los primeros bytes dicen qué es. Un HTML de error también llega con
       200, así que confiar en el código de estado no alcanza. */
    const m = r.bytes.subarray(0,3).toString('hex');
    ok('y son de una imagen, no una página de error', m === 'ffd8ff' || m === '894e47');
  }else{
    console.log(`  · sin red hacia Pollinations (${r.por}), se salta`);
  }
}

console.log(`\n${fallan ? '✗' : '✓'}  ${pasan} pasan · ${fallan} fallan\n`);
process.exit(fallan ? 1 : 0);
