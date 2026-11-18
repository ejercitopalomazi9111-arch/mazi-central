/* El buscador de YouTube de Mazi VR: con una página de mentiras (forma real de ytInitialData) y, si hay red, contra
   YouTube de verdad.   node sala/servidor/pruebas-youtube.mjs */
import { buscarYouTube, sacarVideos, leerPagina } from './youtube.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const datos = { contents: { a: { itemSectionRenderer: { contents: [
  { videoRenderer: { videoId: 'aaa111', title: { runs: [{ text: 'Uno' }] }, ownerText: { runs: [{ text: 'Canal' }] }, lengthText: { simpleText: '3:21' } } },
  { adSlotRenderer: {} },
  { videoRenderer: { videoId: 'bbb222', title: { runs: [{ text: 'Dos' }] }, ownerText: { runs: [{ text: 'Otro' }] } } },
] } } } };
const html = `<html><script>var ytInitialData = ${JSON.stringify(datos)};</script></html>`;
const v = sacarVideos(leerPagina(html));
sí(v.length === 2 && v[0].id === 'aaa111' && v[1].id === 'bbb222', 'saca los videos en orden y salta los anuncios');
sí(v[0].dura === '3:21' && v[1].envivo, 'duración y «en vivo» cuando no hay duración');
const r = await buscarYouTube(new URL('https://x/api?q=hola'), async () => new Response(html));
sí((await r.json()).videos.length === 2, 'la ruta regresa la lista');
sí((await buscarYouTube(new URL('https://x/api'))).status === 400, 'sin ?q= contesta 400');
const rota = await buscarYouTube(new URL('https://x/api?q=a'), async () => new Response('<html>nada</html>'));
sí(rota.status === 502, 'si YouTube cambia su página, lo dice (502) en vez de tronar');
if(process.env.VIVO){ const de = await (await buscarYouTube(new URL('https://x/api?q=trailer pelicula'))).json(); sí(de.videos?.length > 5, `YouTube de verdad: ${de.videos?.length} videos («${de.videos?.[0]?.titulo}»)`); }
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
