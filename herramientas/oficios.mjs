#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   oficios.mjs — HERRAMIENTA MAZI · que las otras IAs además TRABAJEN
   ──────────────────────────────────────────────────────────────────────────
   Lo pidió Carlos así: «arregla las IAS extra para que también trabajen
   aunque sea en generación de imágenes, revisión de videos, escritura de
   textos largos etc, que es justo lo que a ti más te cuesta, y usa groq como
   un apoyo en todo aspecto ya que es el más barato en tokens».

   El relevo de al lado (`relevo.mjs`) sólo sabe CONVERSAR: le mandas texto y
   te devuelve texto. Esto es la otra mitad — los oficios:

     imagen    una descripción entra, un archivo de imagen sale
     mirar     imágenes entran con una pregunta, un texto sale
     oir       un audio entra, la transcripción sale
     escribir  un encargo entra, un texto LARGO sale
     video     un video entra, una revisión sale (mirar + oir juntos)

   ── LO QUE HAY QUE SABER ANTES DE TOCAR ESTO ───────────────────────────────
   1 · GROQ NO GENERA IMÁGENES. Comprobado en su catálogo el día que se
       escribió: no tiene un solo modelo de salida de imagen. Carlos pidió
       ponerlo de apoyo «en todo aspecto» y así está —va primero en mirar, en
       oír y en escribir—, pero en `imagen` va Cloudflare al frente. Ponerlo
       ahí sólo habría hecho que la fila fallara una vez antes de cada dibujo.

   2 · SE REUSA EL ESTADO DEL RELEVO. Si Groq se topó conversando, también
       está topado para escribir: es la misma cuota de la misma cuenta. Por
       eso `marcar` y `clasificar` se importan en vez de copiarse — dos
       marcadores separados harían que la mitad de los intentos se estrellara
       contra un tope que el otro lado ya conocía.

   3 · EL VIDEO SE PARTE EN CUADROS AQUÍ. Un modelo de visión no come video:
       come imágenes. Y como el contenedor NO trae ffmpeg, los cuadros se
       sacan con el navegador —un <video> dibujado en un <canvas>—, que sí
       tenemos. Para el audio sí hace falta ffmpeg y se dice con todas sus
       letras en vez de devolver una revisión a medias fingiendo que oyó.

   ── uso ────────────────────────────────────────────────────────────────────
     node herramientas/oficios.mjs probar
     node herramientas/oficios.mjs imagen "una paloma violeta de perfil" salida.png
     node herramientas/oficios.mjs mirar foto.png "¿qué se ve mal aquí?"
     node herramientas/oficios.mjs oir junta.m4a
     node herramientas/oficios.mjs escribir "las reglas del juego en cristiano"
     node herramientas/oficios.mjs video clip.mp4 "¿el ritmo funciona?"

   Las llaves NUNCA viven aquí ni en el repo, que es público. Cada proveedor
   dice en `relevo/oficios.json` cómo se llama su variable. `probar` te dice
   cuáles faltan, por nombre, sin que escribas ninguna en el chat.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clasificar, desdeCabeceras, leerEstado, marcar, avisarSala } from './relevo.mjs';

const AQUI  = dirname(fileURLToPath(import.meta.url));
const RAIZ  = join(AQUI, '..');
const LISTA = process.env.MAZI_OFICIOS_LISTA || join(RAIZ, 'relevo', 'oficios.json');

const ahora = () => Date.now();
const horas = (n) => n * 3600_000;
const hora  = (t) => new Date(t).toLocaleTimeString('es-MX',
                       { hour:'2-digit', minute:'2-digit' });
const recorte = (t) => String(t).replace(/\s+/g, ' ').slice(0, 140);

async function cargar(oficio){
  const d = JSON.parse(await readFile(LISTA, 'utf8'));
  const o = d.oficios[oficio];
  if(!o) throw new Error(
    `No existe el oficio "${oficio}". Hay: ${Object.keys(d.oficios).join(', ')}`);
  return o;
}

/* Un proveedor está fuera si el relevo ya lo marcó. Se comparte el mismo
   archivo de estado a propósito (ver punto 2 de arriba). */
async function conEstado(fila){
  const est = await leerEstado();
  return fila.map(p => {
    const m = est[p.id];
    const fuera = m && m.hasta > ahora();
    return { ...p, fuera, hasta: fuera ? m.hasta : null, motivo: fuera ? m.clase : null };
  });
}

/* ══ LOS OFICIOS, uno por clase de proveedor ═══════════════════════════════
   Cada uno devuelve { ok, ... } o { ok:false, clase, por, espera }. Las
   clases de falla son las MISMAS del relevo —agotado, llave, config, caido—
   porque son las mismas cuatro preguntas y confundirlas cuesta igual de caro:
   una llave con un dedazo marcada como «agotada» se esconde en silencio. */

async function llamarChat(prov, mensajes, { maxTokens = 1200, tiempo = 120_000 } = {}){
  const llave = prov.llave ? process.env[prov.llave] : null;
  if(prov.llave && !llave) return { ok:false, clase:'llave', por:`falta ${prov.llave}` };
  let r;
  try{
    r = await fetch(`${prov.base.replace(/\/$/,'')}/chat/completions`, {
      method:'POST', signal: AbortSignal.timeout(tiempo),
      headers:{ 'content-type':'application/json',
                ...(llave ? { authorization:`Bearer ${llave}` } : {}) },
      body: JSON.stringify({ model: prov.modelo, messages: mensajes, max_tokens: maxTokens }),
    });
  }catch(e){
    return { ok:false, clase:'caido', espera: 5*60_000,
             por: e.name === 'TimeoutError' ? 'no contestó a tiempo' : 'no se pudo conectar' };
  }
  let texto;
  try{ texto = await r.text(); }
  catch(e){ return { ok:false, clase:'caido', espera:5*60_000, por:'se cortó al leer' }; }
  if(!r.ok) return { ok:false, ...clasificar(r.status, texto, r.headers),
                     por:`${r.status} · ${recorte(texto)}` };
  try{
    const d = JSON.parse(texto);
    const m = d.choices?.[0]?.message || {};
    const dice = m.content || m.reasoning_content || m.reasoning;
    if(!dice) return { ok:false, clase:'config',
      por: d.choices?.[0]?.finish_reason === 'length'
        ? 'se le acabó el cupo de tokens — súbele maxTokens' : 'contestó sin contenido' };
    return { ok:true, dice, modelo: d.model || prov.modelo, gasto: d.usage || null };
  }catch(e){ return { ok:false, clase:'config', por:'contestó algo que no es JSON' }; }
}

/* ── imagen · Cloudflare Workers AI ─────────────────────────────────────── */
async function imagenCloudflare(prov, encargo){
  const llave  = process.env[prov.llave];
  const cuenta = process.env[prov.cuenta];
  if(!llave)  return { ok:false, clase:'llave', por:`falta ${prov.llave}` };
  if(!cuenta) return { ok:false, clase:'llave', por:`falta ${prov.cuenta}` };
  let r;
  try{
    r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cuenta}/ai/run/${prov.modelo}`, {
      method:'POST', signal: AbortSignal.timeout(120_000),
      headers:{ 'content-type':'application/json', authorization:`Bearer ${llave}` },
      body: JSON.stringify({ prompt: encargo, steps: 6 }),
    });
  }catch(e){ return { ok:false, clase:'caido', espera:5*60_000, por:'no se pudo conectar' }; }
  const texto = await r.text();
  if(!r.ok) return { ok:false, ...clasificar(r.status, texto, r.headers),
                     por:`${r.status} · ${recorte(texto)}` };
  try{
    const d = JSON.parse(texto);
    const b64 = d.result?.image;
    if(!b64) return { ok:false, clase:'config', por:'contestó sin imagen' };
    return { ok:true, bytes: Buffer.from(b64, 'base64'), tipo:'png' };
  }catch(e){ return { ok:false, clase:'config', por:'contestó algo que no es JSON' }; }
}

/* ── imagen · Gemini ────────────────────────────────────────────────────── */
async function imagenGemini(prov, encargo){
  const llave = process.env[prov.llave];
  if(!llave) return { ok:false, clase:'llave', por:`falta ${prov.llave}` };
  let r;
  try{
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/` +
                    `${prov.modelo}:generateContent`, {
      method:'POST', signal: AbortSignal.timeout(120_000),
      headers:{ 'content-type':'application/json', 'x-goog-api-key': llave },
      body: JSON.stringify({ contents:[{ parts:[{ text: encargo }] }] }),
    });
  }catch(e){ return { ok:false, clase:'caido', espera:5*60_000, por:'no se pudo conectar' }; }
  const texto = await r.text();
  if(!r.ok) return { ok:false, ...clasificar(r.status, texto, r.headers),
                     por:`${r.status} · ${recorte(texto)}` };
  try{
    const d = JSON.parse(texto);
    for(const parte of d.candidates?.[0]?.content?.parts || []){
      const dato = parte.inlineData || parte.inline_data;
      if(dato?.data) return { ok:true, bytes: Buffer.from(dato.data, 'base64'),
                              tipo: (dato.mimeType || 'image/png').split('/')[1] };
    }
    return { ok:false, clase:'config', por:'contestó sin imagen' };
  }catch(e){ return { ok:false, clase:'config', por:'contestó algo que no es JSON' }; }
}

/* ── imagen · Pollinations, sin llave ───────────────────────────────────── */
async function imagenPollinations(prov, encargo){
  let r;
  try{
    r = await fetch(prov.base + encodeURIComponent(encargo) + '?nologo=true',
                    { signal: AbortSignal.timeout(120_000) });
  }catch(e){ return { ok:false, clase:'caido', espera:5*60_000, por:'no se pudo conectar' }; }
  if(!r.ok) return { ok:false, ...clasificar(r.status, '', r.headers), por:`${r.status}` };
  const bytes = Buffer.from(await r.arrayBuffer());
  /* Devuelve 200 con una página de error si algo sale mal, así que se revisa
     que de verdad SEA una imagen en vez de confiar en el código. */
  if(bytes.length < 1000) return { ok:false, clase:'caido', espera:60_000,
                                   por:'devolvió algo que no es una imagen' };
  return { ok:true, bytes, tipo:'jpg' };
}

/* ── oír · transcripción ────────────────────────────────────────────────── */
async function transcribir(prov, archivo){
  const llave = process.env[prov.llave];
  if(!llave) return { ok:false, clase:'llave', por:`falta ${prov.llave}` };
  const mb = statSync(archivo).size / 1e6;
  if(prov.maxMB && mb > prov.maxMB)
    return { ok:false, clase:'config',
             por:`el audio pesa ${mb.toFixed(1)} MB y el tope son ${prov.maxMB}` };

  const forma = new FormData();
  forma.append('file', new Blob([await readFile(archivo)]), basename(archivo));
  forma.append('model', prov.modelo);
  forma.append('response_format', 'json');
  let r;
  try{
    r = await fetch(`${prov.base.replace(/\/$/,'')}/audio/transcriptions`, {
      method:'POST', signal: AbortSignal.timeout(300_000),
      headers:{ authorization:`Bearer ${llave}` }, body: forma,
    });
  }catch(e){ return { ok:false, clase:'caido', espera:5*60_000, por:'no se pudo conectar' }; }
  const texto = await r.text();
  if(!r.ok) return { ok:false, ...clasificar(r.status, texto, r.headers),
                     por:`${r.status} · ${recorte(texto)}` };
  try{
    const d = JSON.parse(texto);
    if(!d.text) return { ok:false, clase:'config', por:'contestó sin transcripción' };
    return { ok:true, dice: d.text };
  }catch(e){ return { ok:false, clase:'config', por:'contestó algo que no es JSON' }; }
}

export { llamarChat, imagenCloudflare, imagenGemini, imagenPollinations, transcribir,
         cargar, conEstado };

/* ══ LA FILA: el primero que pueda, trabaja ════════════════════════════════
   Igual que el relevo, y por la misma razón: si el primero se topó, no se
   para el trabajo — se pasa al siguiente y se apunta la hora de regreso. La
   diferencia con el relevo es que aquí cada oficio tiene SU fila, porque el
   que escribe bien no es el que dibuja. */
async function porTurnos(oficio, hacer){
  const o = await cargar(oficio);
  const fila = await conEstado(o.fila);
  const saltados = [];

  for(const p of fila){
    if(p.fuera){
      saltados.push(`${p.nombre} (${p.motivo}, vuelve ${hora(p.hasta)})`);
      continue;
    }
    const r = await hacer(p);
    if(r.ok) return { ...r, quien:p, saltados };

    /* Una llave mal escrita GRITA y no se marca. Si se marcara como agotada,
       el siguiente de la fila la taparía en silencio y Carlos se quedaría
       creyendo que se le acabó el saldo cuando lo que sobra es un espacio al
       copiar. Es la misma regla del relevo y por el mismo motivo. */
    if(r.clase === 'llave'){
      saltados.push(`⚠ ${p.nombre}: ${r.por} — ESO NO ES FALTA DE USO, ES LA LLAVE`);
      continue;
    }
    if(r.clase === 'config'){
      saltados.push(`⚠ ${p.nombre}: ${r.por} — revisa relevo/oficios.json`);
      continue;
    }
    const espera = r.espera ?? horas(1);
    await marcar(p.id, r.clase, espera);
    if(r.clase === 'agotado') await avisarSala(p, espera, 'uso');
    saltados.push(`${p.nombre}: ${r.por} · vuelve ${hora(ahora() + espera)}`);
  }
  return { ok:false, saltados };
}

/* ── los cuatro oficios, ya con relevo ──────────────────────────────────── */
export const oficios = {
  imagen: (encargo) => porTurnos('imagen', (p) =>
    p.clase === 'cloudflare'    ? imagenCloudflare(p, encargo)
  : p.clase === 'gemini-imagen' ? imagenGemini(p, encargo)
  : p.clase === 'pollinations'  ? imagenPollinations(p, encargo)
  : Promise.resolve({ ok:false, clase:'config', por:`no sé hacer "${p.clase}"` })),

  /* `imagenes` son data URIs o URLs. Se recorta a lo que aguanta cada
     proveedor: Groq admite 5 por llamada y cada una cuesta 2048 tokens de
     entrada — un video de 40 cuadros no es una llamada, son ocho. */
  mirar: (imagenes, pregunta) => porTurnos('mirar', (p) => llamarChat(p, [{
    role:'user',
    content:[ { type:'text', text: pregunta },
      ...imagenes.slice(0, p.maxImagenes || 4)
        .map(u => ({ type:'image_url', image_url:{ url:u } })) ],
  }], { maxTokens: 2000 })),

  oir: (archivo) => porTurnos('oir', (p) => transcribir(p, archivo)),

  escribir: (encargo, { sistema, largo = 12000 } = {}) =>
    porTurnos('escribir', (p) => llamarChat(p, [
      ...(sistema ? [{ role:'system', content: sistema }] : []),
      { role:'user', content: encargo },
    ], { maxTokens: Math.min(largo, p.maxTokens || 8000), tiempo: 300_000 })),
};

/* ══ CUADROS DE UN VIDEO, SIN ffmpeg ═══════════════════════════════════════
   Un modelo de visión no come video: come imágenes. Lo normal sería sacar los
   cuadros con ffmpeg, PERO este contenedor no lo trae — y la regla de la casa
   dice que si no me sale por una vía, se busca otra, no se tira el objetivo.

   La otra vía es la que ya tenemos: un navegador. Se carga el video en un
   <video>, se salta a N momentos y se dibuja cada uno en un <canvas>. Sale sin
   instalar nada y funciona con cualquier formato que el navegador reproduzca,
   que es justo mp4 y webm — o sea lo que graba un teléfono. */
export async function cuadrosConNavegador(video, cuantos){
  let chromium;
  for(const d of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs',
                  '/usr/lib/node_modules/playwright/index.mjs']){
    try{ chromium = (await import(d)).chromium; break; }catch(e){ /* el siguiente */ }
  }
  if(!chromium) throw new Error(
    'Para sacar los cuadros hace falta playwright (o ffmpeg). `npm i -D playwright`');

  const nav = await chromium.launch();
  const pag = await nav.newPage();
  try{
    const datos = (await readFile(video)).toString('base64');
    const tipo = extname(video).toLowerCase() === '.webm' ? 'video/webm' : 'video/mp4';
    await pag.setContent(`<video id="v" preload="auto" muted playsinline></video>`);
    /* ⚠ TRES COSAS QUE PARECEN DETALLE Y SIN ELLAS NO CARGA NADA. Las tres
       salieron corriendo la prueba, no leyendo:

       1 · `preload="auto"` y `load()`. Sin pedirlo, el navegador no se molesta
           en leer los metadatos de un video que nadie va a reproducir — y
           `loadedmetadata` no llega NUNCA. Se queda esperando los 30 segundos
           y parece que el video está roto.
       2 · Se revisa `readyState` ANTES de ponerse a esperar. Si los metadatos
           ya llegaron, el evento ya pasó y engancharse después es esperar algo
           que no va a volver a ocurrir.
       3 · La fuente se pone por JS y después del `load()`, no en el HTML: así
           el orden de las tres cosas queda a la vista y no depende de cuándo
           el navegador decidió parsear la etiqueta. */
    const dura = await pag.evaluate(([d, t]) => new Promise((sale, falla) => {
      const v = document.getElementById('v');
      const listo = () => sale(v.duration);
      v.onerror = () => falla(new Error('el navegador no pudo abrir ese video'));
      v.src = `data:${t};base64,${d}`;
      v.load();
      if(v.readyState >= 1) return listo();       /* ya estaba: no hay qué esperar */
      v.addEventListener('loadedmetadata', listo, { once:true });
      setTimeout(() => falla(new Error('el video no cargó a tiempo')), 30000);
    }), [datos, tipo]);
    if(!isFinite(dura) || dura <= 0) throw new Error(
      'el video no dice cuánto dura. Los grabados con MediaRecorder a veces ' +
      'salen sin esa marca; pásalo por ffmpeg o vuelve a exportarlo.');

    const fotos = [];
    for(let i = 0; i < cuantos; i++){
      /* Se reparten a lo largo del video pero sin tocar los extremos: el
         primer y el último cuadro suelen ser negros y no dicen nada. */
      const t = dura * (i + 0.5) / cuantos;
      fotos.push(await pag.evaluate((seg) => new Promise((sale, falla) => {
        const v = document.getElementById('v');
        const dibujar = () => {
          const c = document.createElement('canvas');
          const escala = Math.min(1, 900 / (v.videoWidth || 900));
          c.width  = Math.round((v.videoWidth  || 640) * escala);
          c.height = Math.round((v.videoHeight || 360) * escala);
          c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          sale(c.toDataURL('image/jpeg', 0.72));
        };
        /* ── lo que de verdad pasó aquí, sin adornos ──────────────────────
           Construyendo esto salieron dos fallas, y de las dos hay que decir
           cuánto se sabe de verdad:

           1 · `loadedmetadata` no llegaba y el extractor moría a los 30 s.
               Ésa fue real y reproducible. Se arregló arriba, poniendo la
               fuente por JS con `preload="auto"`, llamando a `load()` y
               revisando `readyState` antes de ponerse a esperar un evento que
               pudo haber pasado ya.

           2 · Una vez, los cinco cuadros salieron IDÉNTICOS. Ese modo de
               fallar es el peligroso: existen, pesan, son JPEG válidos, y un
               modelo describe muy bien la misma imagen cinco veces. Lo cazó la
               prueba comparándolos entre sí, no mirándolos.

           Escribí esta espera creyendo que era la causa —que `seeked` no
           garantiza fotograma decodificado— y LA PRUEBA DE MUTACIÓN ME
           DESMINTIÓ: quitando la espera, los cuadros siguen saliendo
           distintos. Y quitando cada una de las otras tres piezas, también.
           O sea que NO SÉ qué causó aquella vez, y no lo voy a inventar.

           La espera se queda como cinturón para videos grandes, donde el
           decodificador sí puede ir detrás del reloj. Pero queda dicho: NO
           ESTÁ PROBADA. Quien la quite no va a ver nada romperse aquí.

           (`requestVideoFrameCallback` se intentó y no sirve: sólo avisa de
           fotogramas PRESENTADOS, o sea durante la reproducción. Con el video
           pausado —que es como se saca un cuadro— no dispara nunca y el
           extractor se colgaba en el primero. Eso sí es seguro.) */
        v.onseeked = async () => {
          for(let i = 0; i < 60 && v.readyState < 2; i++)
            await new Promise(s => requestAnimationFrame(s));
          await new Promise(s => requestAnimationFrame(s));
          await new Promise(s => requestAnimationFrame(s));
          dibujar();
        };
        setTimeout(() => falla(new Error(`no se pudo sacar el cuadro de ${seg}s`)), 20000);
        v.currentTime = seg;
      }), t));
    }
    return { fotos, dura };
  }finally{ await nav.close(); }
}

/* ── revisar un video: lo que se ve MÁS lo que se dice ─────────────────── */
export async function revisarVideo(video, pregunta, { cuadros = 8 } = {}){
  const { fotos, dura } = await cuadrosConNavegador(video, cuadros);

  const visto = await oficios.mirar(fotos,
    `Estos son ${fotos.length} cuadros de un video de ${dura.toFixed(1)} segundos, ` +
    `en orden. Descríbelos como una secuencia, no como fotos sueltas, y contesta: ` +
    pregunta);

  /* El audio SÍ necesita ffmpeg. Si no está, se dice con todas sus letras en
     vez de entregar una revisión a medias fingiendo que oyó: una revisión que
     calla lo que no pudo ver es peor que no revisar. */
  let oido = null, sinAudio = null;
  const { execFile } = await import('node:child_process');
  const hayFfmpeg = await new Promise(r =>
    execFile('ffmpeg', ['-version'], (e) => r(!e)));
  if(hayFfmpeg){
    const wav = join(RAIZ, '.oficios-audio.m4a');
    await new Promise((sale, falla) => execFile('ffmpeg',
      ['-y','-i', video, '-vn','-ac','1','-ar','16000', wav],
      (e) => e ? falla(e) : sale()));
    oido = await oficios.oir(wav);
  }else{
    sinAudio = 'No se revisó el audio: falta ffmpeg en esta máquina. ' +
               'Lo que sigue es SÓLO lo que se ve.';
  }
  return { visto, oido, sinAudio, cuadros: fotos.length, dura };
}

/* ══ LA LÍNEA DE COMANDOS ══════════════════════════════════════════════════ */
function contar(r){
  if(r.saltados?.length){
    console.log('');
    for(const s of r.saltados) console.log('  · ' + s);
  }
}

async function probar(){
  const d = JSON.parse(await readFile(LISTA, 'utf8'));
  const est = await leerEstado();
  console.log('');
  for(const [nombre, o] of Object.entries(d.oficios)){
    console.log(`  ${nombre.toUpperCase()} — ${o.que}`);
    for(const p of o.fila){
      const faltan = [p.llave, p.cuenta].filter(v => v && !process.env[v]);
      const m = est[p.id];
      const fuera = m && m.hasta > ahora();
      const señal = faltan.length ? `✗ falta ${faltan.join(' y ')}`
                  : fuera        ? `· fuera hasta ${hora(m.hasta)} (${m.clase})`
                  : '✓ con llave';
      console.log(`     ${señal.padEnd(30)} ${p.nombre}`);
    }
    console.log('');
  }
  console.log('  Las llaves se ponen en la máquina, nunca en el repo:');
  console.log('    export GROQ_API_KEY="…"   ← el que más trabaja de todos\n');
}

const [,, orden, ...resto] = process.argv;
if(orden){
  try{
    if(orden === 'probar'){ await probar(); }

    else if(orden === 'imagen'){
      const [encargo, salida = 'imagen.png'] = resto;
      if(!encargo) throw new Error('¿Qué imagen? `oficios.mjs imagen "…" salida.png`');
      const r = await oficios.imagen(encargo);
      contar(r);
      if(!r.ok){ console.log('\n  Nadie pudo con la imagen.\n'); process.exit(1); }
      /* ⚠ LA EXTENSIÓN LA MANDA LO QUE LLEGÓ, no lo que se pidió. Pollinations
         devuelve JPEG y se estaba guardando como «.png» porque así se llamó el
         archivo en la orden: un JPEG con nombre de PNG rompe a todo lo que
         confía en la extensión, y el engaño no se ve hasta que algo falla
         lejos de aquí. Se corrige y se avisa. */
      let ruta = resolve(salida);
      const pedida = extname(ruta).slice(1).toLowerCase().replace('jpeg','jpg');
      const llego  = r.tipo.replace('jpeg','jpg');
      let nota = '';
      if(pedida !== llego){
        ruta = ruta.slice(0, ruta.length - (pedida ? pedida.length + 1 : 0)) + '.' + llego;
        nota = `  (venía en ${llego}, no en ${pedida || '—'}; se cambió la extensión)`;
      }
      await mkdir(dirname(ruta), { recursive:true });
      await writeFile(ruta, r.bytes);
      console.log(`\n  ✓ ${ruta} · ${(r.bytes.length/1024).toFixed(0)} KB · ${r.quien.nombre}`);
      if(nota) console.log(nota);
      console.log('');
    }

    else if(orden === 'mirar'){
      const [archivo, ...pregunta] = resto;
      if(!archivo || !existsSync(archivo)) throw new Error('No encuentro esa imagen.');
      const b64 = (await readFile(archivo)).toString('base64');
      const tipo = extname(archivo).slice(1).replace('jpg','jpeg') || 'png';
      const r = await oficios.mirar([`data:image/${tipo};base64,${b64}`],
        pregunta.join(' ') || '¿Qué se ve aquí? Sé concreto.');
      contar(r);
      if(!r.ok){ console.log('\n  Nadie pudo mirarla.\n'); process.exit(1); }
      console.log(`\n${r.dice}\n\n  — ${r.quien.nombre}\n`);
    }

    else if(orden === 'oir'){
      const [archivo] = resto;
      if(!archivo || !existsSync(archivo)) throw new Error('No encuentro ese audio.');
      const r = await oficios.oir(resolve(archivo));
      contar(r);
      if(!r.ok){ console.log('\n  Nadie pudo oírlo.\n'); process.exit(1); }
      console.log(`\n${r.dice}\n\n  — ${r.quien.nombre}\n`);
    }

    else if(orden === 'escribir'){
      const r = await oficios.escribir(resto.join(' '));
      contar(r);
      if(!r.ok){ console.log('\n  Nadie pudo escribirlo.\n'); process.exit(1); }
      console.log(`\n${r.dice}\n\n  — ${r.quien.nombre}\n`);
    }

    else if(orden === 'video'){
      const [archivo, ...pregunta] = resto;
      if(!archivo || !existsSync(archivo)) throw new Error('No encuentro ese video.');
      const r = await revisarVideo(resolve(archivo),
        pregunta.join(' ') || '¿Qué está bien y qué está mal en este video?');
      console.log(`\n  ${r.cuadros} cuadros de ${r.dura.toFixed(1)} s\n`);
      if(r.sinAudio) console.log('  ⚠ ' + r.sinAudio + '\n');
      if(r.visto.ok) console.log(`LO QUE SE VE\n\n${r.visto.dice}\n`);
      else { contar(r.visto); console.log('\n  Nadie pudo ver los cuadros.\n'); }
      if(r.oido?.ok) console.log(`LO QUE SE DICE\n\n${r.oido.dice}\n`);
    }

    else{
      console.log(`\n  No conozco "${orden}".\n`);
      console.log('    probar · imagen · mirar · oir · escribir · video\n');
      process.exit(1);
    }
  }catch(e){
    console.error(`\n  ${e.message}\n`);
    process.exit(1);
  }
}
