/* VS TILES · EXÓRCIST — las pantallas: arranque, cinemática, perfil, calibración, menú, canciones,
   partida, resultados, historia, vestidor, mercado, récords, ajustes, Lab y créditos.
   Lo que el jugador gana y elige se guarda en el teléfono (localStorage); si el navegador no deja,
   se juega igual y sólo no se recuerda. */
import { reloj } from './reloj.js';
import { armarCarta, armarTutorial, DIFS, MODOS } from './cartas.js';
import { crearEscena, ESCENARIOS, PERSONAJES, COLORES_RIEL } from './escena.js';
import { crearPartida, cargarSprites } from './juego.js';
import { analizar } from './analisis.js';
import { biblioteca, etiquetas } from './biblioteca.js';
import { montarMercado } from './mercado.js';
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];

/* ── el catálogo ── */
export const CANCIONES = [
  { id: 'itty-bitty-8-bit', titulo: 'Itty Bitty 8 Bit', artista: 'Kevin MacLeod', voces: ['gumi'], escena: 1 },
  { id: 'raving-energy', titulo: 'Raving Energy', artista: 'Kevin MacLeod', voces: ['miku', 'gumi'], escena: 0 },
  { id: 'movement-proposition', titulo: 'Movement Proposition', artista: 'Kevin MacLeod', voces: ['luka'], escena: 2 },
  { id: 'exit-the-premises', titulo: 'Exit the Premises', artista: 'Kevin MacLeod', voces: ['miku-hagane', 'una'], escena: 4 },
  { id: 'voltaic', titulo: 'Voltaic', artista: 'Kevin MacLeod', voces: ['miku-hagane', 'miku'], escena: 3 },
  { id: 'ouroboros', titulo: 'Ouroboros', artista: 'Kevin MacLeod', voces: ['una', 'luka'], escena: 6 },
  { id: 'volatile-reaction', titulo: 'Volatile Reaction', artista: 'Kevin MacLeod', voces: ['miku-akuma'], escena: 5, jefe: true },
  /* ANIME Y RITMO: música con estilo de anime, J-pop y juegos de ritmo, con licencia libre (OpenGameArt; autores y
     licencias en CREDITOS.md). Las de anime con derechos no se pueden subir al juego: ésas entran por «Mi música» */
  { id: 'play-now', titulo: 'Play Now', artista: 'Cleyton Kauffman', voces: ['miku', 'gumi'], escena: 1, anime: true },
  { id: 'cheers-for-starlight', titulo: 'Cheers for Starlight', artista: 'Chloe Wolfe', voces: ['miku'], escena: 0, anime: true },
  { id: 'cutie-pie', titulo: 'Cutie Pie', artista: 'FrancisLeeMusic', voces: ['gumi', 'una'], escena: 4, anime: true },
  { id: 'kyra-cloud-maid', titulo: 'Kyra the Cloud Maid', artista: 'Tsorthan Grove', voces: ['una'], escena: 6, anime: true },
  { id: 'determination', titulo: 'Determination', artista: 'HydroGene', voces: ['luka', 'miku'], escena: 2, anime: true },
  { id: 'glory-days', titulo: 'Glory Days', artista: 'tricksntraps', voces: ['gumi', 'miku'], escena: 3, anime: true },
  { id: 'ascend', titulo: 'Ascend', artista: 'tricksntraps', voces: ['miku-hagane'], escena: 1, anime: true },
  { id: 'tokyo-chase', titulo: 'Tokyo Chase', artista: 'Socapex', voces: ['luka', 'miku-hagane'], escena: 0, anime: true },
  { id: 'technomania-101', titulo: 'Technomania101', artista: 'Fupi', voces: ['miku', 'una'], escena: 2, anime: true },
  { id: 'mauve-rhopalocera', titulo: 'Mauve Rhopalocera', artista: 'ISAo', voces: ['luka'], escena: 5, anime: true },
  { id: 'stomper', titulo: 'Stomper', artista: 'tricksntraps', voces: ['miku-hagane', 'gumi'], escena: 4, anime: true },
  { id: 'fever-stadium', titulo: 'Fever Stadium', artista: 'MintoDog', voces: ['miku', 'luka'], escena: 3, anime: true },
  { id: 'mental-corruption', titulo: 'Mental Corruption', artista: 'tricksntraps', voces: ['miku-akuma'], escena: 5, anime: true, jefe: true },
  /* EL PIANO IMPOSIBLE: partituras de dominio público (Mutopia) tocadas con el Salamander Grand Piano
     (herramientas/piano.py). Las notas salen de la partitura, no del oído: caen exactas */
  { id: 'vals-del-minuto', titulo: 'Vals del minuto', artista: 'Chopin · Op. 64 n.º 1', voces: ['miku'], escena: 7, piano: true },
  { id: 'marcha-turca', titulo: 'Marcha turca', artista: 'Mozart · K. 331', voces: ['gumi', 'una'], escena: 8, piano: true },
  { id: 'patetica', titulo: 'Patética', artista: 'Beethoven · Op. 13, III', voces: ['luka'], escena: 9, piano: true },
  { id: 'teclas-negras', titulo: 'Teclas negras', artista: 'Chopin · Op. 10 n.º 5', voces: ['una', 'miku'], escena: 10, piano: true },
  { id: 'fantasia-impromptu', titulo: 'Fantasía-Impromptu', artista: 'Chopin · Op. 66', voces: ['luka', 'miku-hagane'], escena: 7, piano: true },
  { id: 'estudio-cascada', titulo: 'Cascada', artista: 'Chopin · Op. 10 n.º 1', voces: ['miku-hagane'], escena: 11, piano: true },
  { id: 'appassionata', titulo: 'Appassionata', artista: 'Beethoven · Op. 57, III', voces: ['luka', 'una'], escena: 8, piano: true },
  { id: 'estudio-revolucionario', titulo: 'Estudio Revolucionario', artista: 'Chopin · Op. 10 n.º 12', voces: ['miku', 'gumi'], escena: 9, piano: true },
  { id: 'rush-omega', titulo: 'RUSH Ω', artista: 'Arreglo imposible del Revolucionario', voces: ['miku-akuma'], escena: 11, piano: true, jefe: true }
];
const HISTORIA = [
  { cap: 'Prólogo · La primera nota', misiones: [
    { c: 'itty-bitty-8-bit', modo: 'carril', dif: 'facil', d: [['SONOLUZ', 'Señal detectada. Un Resonante nuevo entró al archivo.'], ['GUMI', '¡Por fin alguien! Esta canción se está borrando nota por nota. Toca cuando lleguen a la línea… y no las dejes ir.']],
      f: [['GUMI', '¡La salvaste! ¿Oyes? Ya no se corta.'], ['SONOLUZ', 'Primera canción restaurada. Detecto otra señal… alguien está cantando dentro de un eco.']] },
    { c: 'raving-energy', modo: 'flechas', dif: 'normal', d: [['GUMI', 'Miku quedó atrapada en un eco. Ella canta una frase y tú se la regresas, igualita.'], ['Hatsune Miku', '…¿me oyes? Si fallas la frase, la canción se rompe otra vez.']],
      f: [['Hatsune Miku', 'Me regresaste la voz. Gracias, Resonante.'], ['GUMI', 'Ahora sí: somos tres. Y el archivo tiene muchas más canciones rotas.']] } ] },
  { cap: 'Capítulo I · Ecos de GUMI', misiones: [
    { c: 'movement-proposition', modo: 'diva', dif: 'normal', d: [['Okurine Luka', 'No todas queremos que nos restauren, Resonante.'], ['GUMI', 'Luka es de los Desafinados. Sus símbolos llegan volando: toca el mismo botón cuando lleguen.']],
      f: [['Okurine Luka', '…No esperaba que alguien me siguiera el paso.'], ['Okurine Luka', 'No me voy a unir a ustedes. Pero tampoco voy a estorbar.'], ['GUMI', 'Con Luka eso ya es casi un abrazo.']] },
    { c: 'exit-the-premises', modo: 'circulos', dif: 'dificil', d: [['Otomachi Una', 'Yo soy un Eco: una copia que nadie terminó. Si me sigues el ritmo, quizá me acuerde de quién era.']],
      f: [['Otomachi Una', 'Me acordé de algo: de un escenario lleno, y de una voz que no era igual a ninguna.'], ['Hatsune Miku', 'Esa voz era la tuya, Una. El Coro Nulo te la quitó.']] },
    { c: 'voltaic', modo: 'carril', dif: 'experto', d: [['Hagane Miku', 'Los carriles ya no obedecen. Se doblan, se inclinan, cambian de número…'], ['GUMI', 'Es el Coro Nulo metiéndose al archivo. Lee el aviso cuando cambien las reglas.']],
      f: [['Hagane Miku', 'Aguantaste los carriles torcidos. Nada mal.'], ['???', 'Qué ruido tan molesto. Todas las voces deberían sonar igual.'], ['GUMI', 'Ésa es ella. Ya viene.']] },
    { c: 'volatile-reaction', modo: 'exorcist', dif: 'exorcist', jefe: true, d: [['???', 'Todas las voces deberían sonar igual. Perfectas. Iguales.'], ['Miku Excomulgada', 'Yo soy el Coro Nulo. Demuestra que tu ritmo es tuyo… si puedes.']],
      f: [['Miku Excomulgada', '…Imposible. Ningún ritmo debería sobrevivir a eso.'], ['Hatsune Miku', 'Por eso es suyo. No se puede copiar.'], ['SONOLUZ', 'Capítulo I cerrado. El archivo respira otra vez… por ahora.']] } ] }
];
/* lo que se colecciona: sólo apariencia, nunca ventaja (el documento lo pide así) */
const RAREZA = { c: { n: 'Común', p: 58 }, r: { n: 'Raro', p: 28 }, e: { n: 'Épico', p: 10 }, l: { n: 'Legendario', p: 3.4 }, m: { n: 'Mítico', p: .6 } };
const OBJETOS = [
  ...PERSONAJES.map((p, i) => ({ id: 'voz:' + p.id, cat: 'voz', nombre: p.nombre, raro: p.jefe ? 'm' : ['gumi', 'miku', 'luka'].includes(p.id) ? 'c' : ['una'].includes(p.id) ? 'r' : i % 2 ? 'e' : 'l', muestra: null, color: p.color })),
  { id: 'nota:neon', cat: 'nota', nombre: 'Neón', raro: 'c', colores: ['#FF3D8B', '#B44BFF', '#38E1FF', '#FFF07A', '#38E1FF', '#B44BFF', '#FF3D8B'] },
  { id: 'nota:sangre', cat: 'nota', nombre: 'Sangre', raro: 'r', colores: ['#FF2D55', '#C4002B', '#FF6A8A', '#FFFFFF', '#FF6A8A', '#C4002B', '#FF2D55'] },
  { id: 'nota:hielo', cat: 'nota', nombre: 'Hielo', raro: 'r', colores: ['#9EF7FF', '#38E1FF', '#C7FBFF', '#FFFFFF', '#C7FBFF', '#38E1FF', '#9EF7FF'] },
  { id: 'nota:gumi', cat: 'nota', nombre: 'Verde GUMI', raro: 'e', colores: ['#7CFF6B', '#3DDC97', '#C9FF7A', '#FFF07A', '#C9FF7A', '#3DDC97', '#7CFF6B'] },
  { id: 'nota:oro', cat: 'nota', nombre: 'Oro sagrado', raro: 'l', colores: ['#FFE08A', '#FFC24B', '#FFF3B0', '#FFFFFF', '#FFF3B0', '#FFC24B', '#FFE08A'] },
  { id: 'nota:nulo', cat: 'nota', nombre: 'Coro Nulo', raro: 'm', colores: ['#FFFFFF', '#B9AECB', '#FFFFFF', '#FF2D55', '#FFFFFF', '#B9AECB', '#FFFFFF'] },
  { id: 'golpe:flare', cat: 'golpe', nombre: 'Destello', raro: 'c', sprite: 'p_flare_01' },
  { id: 'golpe:estrella', cat: 'golpe', nombre: 'Estrella', raro: 'r', sprite: 'p_star_06' },
  { id: 'golpe:magia', cat: 'golpe', nombre: 'Sello mágico', raro: 'e', sprite: 'p_magic_03' },
  { id: 'golpe:tajo', cat: 'golpe', nombre: 'Tajo', raro: 'l', sprite: 'p_slash_03' },
  { id: 'golpe:remolino', cat: 'golpe', nombre: 'Remolino', raro: 'm', sprite: 'p_twirl_01' },
  ...ESCENARIOS.map((e, i) => ({ id: 'fondo:' + i, cat: 'fondo', nombre: e.nombre, raro: i < 2 ? 'c' : i < 4 ? 'r' : i < 6 ? 'e' : 'l', img: `escenarios/${e.id}.jpg` })),
  /* cómo se ve cada modo (Carlos, 29 oct: «súmale estilos de notas en cada modo… también estilo de botones») */
  /* las formas son modelos de verdad (escena.js · MODELOS_NOTA); la miniatura es su foto (modelos/notas/*.webp) */
  { id: 'forma:barra', cat: 'forma', nombre: 'Barra', raro: 'c', foto: 'lingote' }, { id: 'forma:disco', cat: 'forma', nombre: 'Disco', raro: 'c', foto: 'disco' },
  { id: 'forma:pildora', cat: 'forma', nombre: 'Botón de arcade', raro: 'r', foto: 'arcade' }, { id: 'forma:nota', cat: 'forma', nombre: 'Corchea', raro: 'r', foto: 'nota' },
  { id: 'forma:cristal', cat: 'forma', nombre: 'Cristal', raro: 'e', foto: 'cristal' }, { id: 'forma:gema', cat: 'forma', nombre: 'Gema engarzada', raro: 'e', foto: 'gema' },
  { id: 'forma:diamante', cat: 'forma', nombre: 'Brillante', raro: 'l', foto: 'brillante' }, { id: 'forma:estrella', cat: 'forma', nombre: 'Estrella', raro: 'l', foto: 'estrella' },
  { id: 'forma:doble', cat: 'forma', nombre: 'Holo-disco', raro: 'm', foto: 'holo' },
  { id: 'flechas:contorno', cat: 'flechas', nombre: 'Contorno', raro: 'c' }, { id: 'flechas:solida', cat: 'flechas', nombre: 'Sólidas', raro: 'r' }, { id: 'flechas:neon', cat: 'flechas', nombre: 'Neón', raro: 'e' },
  { id: 'simbolos:color', cat: 'simbolos', nombre: 'A color', raro: 'c' }, { id: 'simbolos:contorno', cat: 'simbolos', nombre: 'Trazo', raro: 'r' }, { id: 'simbolos:blanco', cat: 'simbolos', nombre: 'Hueso', raro: 'e' },
  { id: 'aros:clasico', cat: 'aros', nombre: 'Clásico', raro: 'c' }, { id: 'aros:magia', cat: 'aros', nombre: 'Sello mágico', raro: 'e' }, { id: 'aros:estelar', cat: 'aros', nombre: 'Estelar', raro: 'l' },
  { id: 'boton:neon', cat: 'boton', nombre: 'Neón', raro: 'c' }, { id: 'boton:cristal', cat: 'boton', nombre: 'Cristal', raro: 'r' }, { id: 'boton:gotico', cat: 'boton', nombre: 'Gótico', raro: 'e' }, { id: 'boton:sangre', cat: 'boton', nombre: 'Sangre', raro: 'l' },
  { id: 'titulo:resonante', cat: 'titulo', nombre: 'Resonante', raro: 'c' }, { id: 'titulo:desafinado', cat: 'titulo', nombre: 'Desafinado', raro: 'r' },
  /* SECRETOS: no salen en tiradas ni en el vestidor hasta que se tienen (el de la paloma: ponerse Mazi o Palomazi) */
  { id: 'nota:paloma', cat: 'nota', nombre: 'Paloma de la casa', raro: 'm', secreto: true, colores: ['#7E1735', '#AC27FF', '#C77DFF', '#FFFFFF', '#C77DFF', '#AC27FF', '#7E1735'] },
  { id: 'golpe:paloma', cat: 'golpe', nombre: 'Vuelo de paloma', raro: 'm', secreto: true, sprite: 'paloma' },
  { id: 'titulo:paloma', cat: 'titulo', nombre: 'Paloma de la casa', raro: 'm', secreto: true },
  { id: 'titulo:eco', cat: 'titulo', nombre: 'Eco sin dueño', raro: 'e' }, { id: 'titulo:exorcista', cat: 'titulo', nombre: 'Exorcista', raro: 'l' }, { id: 'titulo:sonoluz', cat: 'titulo', nombre: 'Voz de SONOLUZ', raro: 'm' }
];
const CATS = { voz: 'Voz', nota: 'Colores', forma: 'Forma', golpe: 'Golpe', fondo: 'Fondo', flechas: 'Flechas', simbolos: 'Símbolos', aros: 'Aros', boton: 'Botones', titulo: 'Título' };
const DE_FABRICA = ['forma:barra', 'flechas:contorno', 'simbolos:color', 'aros:clasico', 'boton:neon'];

/* ── lo guardado ── */
const CLAVE = 'vstiles:v1';
const base = () => ({ nombre: '', color: 0, tiene: ['voz:gumi', 'voz:miku', 'voz:luka', 'nota:neon', 'golpe:flare', 'fondo:0', 'titulo:resonante'], puesto: { voz: 'voz:gumi', nota: 'nota:neon', golpe: 'golpe:flare', fondo: 'fondo:0', titulo: 'titulo:resonante', forma: 'forma:barra', flechas: 'flechas:contorno', simbolos: 'simbolos:color', aros: 'aros:clasico', boton: 'boton:neon' },
  ecos: 1500, sellos: 3, nivel: 1, xp: 0, record: {}, historia: {}, desfase: 0, desfaseVisual: 0, vel: 1, sonidoGolpe: true, mostrarDesvio: true, sinMov: false, pity: 0, visto: false, calibrado: false });
let Y = base(); try{ const g = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if(g) Y = { ...base(), ...g, puesto: { ...base().puesto, ...(g.puesto || {}) } }; }catch(e){}
/* quien ya jugaba antes de que existieran estas categorías recibe las de fábrica */
for(const id of DE_FABRICA) if(!Y.tiene.includes(id)) Y.tiene.push(id);
const guardar = () => { try{ localStorage.setItem(CLAVE, JSON.stringify(Y)); }catch(e){} };
const aviso = (txt) => { const d = document.createElement('div'); d.className = 'aviso'; d.textContent = txt; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); };

/* ── el arranque ── */
const escena = await crearEscena($('#gl'));
const sprites = await cargarSprites();
const sonidos = {};
reloj.desbloquear();
const partida = crearPartida({ escena, capa: $('#capa'), sprites, sonidos, ajustes: Y, alTerminar: resultados });
Y.alPausar = (p) => mostrar(p ? 'pausa' : null);
const analisis = {}, bufs = {};
const datos = async (id) => analisis[id] ||= await (await fetch(`datos/${id}.json`)).json();
/* el audio ya decodificado pesa 50-90 MB por canción: se guardan sólo las dos últimas, o con mucha música el
   iPhone cierra la página por memoria */
let recientes = [];
const audio = async (id) => {
  if(!bufs[id]) bufs[id] = CANCIONES.find(c => c.id === id)?.propia
    ? await biblioteca.uno(id).then(async r => { reloj.preparar(); return reloj.ctx.decodeAudioData(await r.audio.arrayBuffer()); })
    : await reloj.cargar(`musica/${id}.mp3`);
  recientes = [id, ...recientes.filter(x => x !== id)]; for(const v of recientes.splice(2)) delete bufs[v];
  return bufs[id]; };
const quitarAcentos = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/* ── Mi música: lo que el jugador metió desde su teléfono (biblioteca.js) ── */
const portadas = {};
const hash = (t) => { let h = 2166136261; for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
function agregarPropia(r){ if(CANCIONES.some(c => c.id === r.id)) return; analisis[r.id] = r.an; if(r.portada) portadas[r.id] = URL.createObjectURL(r.portada);
  CANCIONES.push({ id: r.id, titulo: r.titulo, artista: r.artista, voces: r.voces, escena: r.escena, propia: true }); }
const listaPropia = biblioteca.listar().then(l => l.forEach(agregarPropia)).catch(() => {});
const fondoDe = (c) => portadas[c.id] || `escenarios/${ESCENARIOS[c.escena].id}.jpg`;
await escena.ponerCantantes([idVoz()]);
function idVoz(){ return (Y.puesto.voz || 'voz:gumi').split(':')[1]; }
regaloSecreto(); aplicarCosmeticos();

let pantalla = null;
function mostrar(id){ $$('.pantalla').forEach(p => p.classList.toggle('vis', p.id === id)); pantalla = id;
  $('#sombra').style.opacity = id && id !== 'arranque' ? 1 : .4; $('#pausaB').classList.toggle('vis', !id && partida.corriendo); }
/* el menú también se mueve: la cámara gira alrededor de la voz equipada, que baila con un pulso falso */
(function menuVivo(){ requestAnimationFrame(menuVivo); if(!partida.corriendo) partida.pintarMenu(performance.now() / 1000); })();

mostrar('arranque');
/* el huevo de pascua: 10 toques al logo (en el arranque o en el menú) en menos de 5 segundos */
let toquesLogo = [], sustoVivo = false, sonidosSusto = null;
async function tocarLogo(){ const ahora = performance.now(); toquesLogo = toquesLogo.filter(x => ahora - x < 5000); toquesLogo.push(ahora);
  /* el audio se despierta y se carga desde los primeros toques (cada toque es un gesto), sin esperar a que acabe: si el
     navegador no lo deja sonar, la Miku sale igual */
  sonidosSusto ||= reloj.despertar().then(() => Promise.all(['paso.wav', 'risa.mp3', 'maximize_006.wav'].map(f => reloj.cargar('sonidos/' + f).catch(() => null))));
  if(toquesLogo.length < 10 || sustoVivo) return; toquesLogo = []; sustoVivo = true;
  let paso = null, risa = null, salto = null; sonidosSusto.then(([a, b, c]) => { paso = a; risa = b; salto = c; }, () => {});
  const T = await escena.asustar(); if(!T){ sustoVivo = false; return; }
  const capa = document.querySelector('.pantalla.vis'); if(capa) Object.assign(capa.style, { animation: 'none', transition: 'opacity .6s', opacity: '0' });   // la animación de entrada (fill both) le ganaba a la opacidad
  for(let k = 0; k * .625 < T.camina; k++) setTimeout(() => reloj.golpe(paso, .25 + .5 * k * .625 / T.camina), k * 625);
  setTimeout(() => reloj.golpe(risa, .9), T.mira * 1000); setTimeout(() => reloj.golpe(risa, .7), (T.mira + 1.05) * 1000);
  setTimeout(() => reloj.golpe(salto, .6), (T.rie + .2) * 1000);
  setTimeout(() => { if(capa) capa.style.opacity = '1'; sustoVivo = false; }, T.salta * 1000 + 200); }
document.querySelector('#arranque .logo').addEventListener('pointerdown', (e) => { e.stopPropagation(); tocarLogo(); });
document.querySelector('#menu .titulo').addEventListener('pointerdown', () => tocarLogo());
/* se entra con «click» (al soltar el dedo) y no con pointerdown: en el iPhone sólo soltar cuenta como toque
   para dejar sonar el audio, y con pointerdown la entrada se podía quedar sin sonido o colgada */
$('#arranque').addEventListener('click', async function entrar(e){
  if(e.target.closest('.logo') || sustoVivo) return;
  $('#arranque').removeEventListener('click', entrar);
  await reloj.despertar(); reloj.desfase = Y.desfase / 1000; reloj.desfaseVisual = Y.desfaseVisual / 1000;
  await Promise.all([['golpe', 'impactGlass_light_002'], ['fallo', 'impactPunch_medium_000'], ['clic', 'tick_001'], ['boton', 'click_002'], ['glitch', 'glitch_003'], ['premio', 'confirmation_002']]
    .map(async ([k, f]) => { sonidos[k] = await reloj.cargar(`sonidos/${f}.wav`).catch(() => null); }));
  if(!Y.visto) intro(); else if(!Y.nombre) perfil(); else menu();
});
document.addEventListener('click', (e) => { const b = e.target.closest('[data-ir]'); if(!b) return; sonidos.boton && reloj.golpe(sonidos.boton, .25); ir(b.dataset.ir); });
function ir(a){ ({ menu, historia, libre: () => canciones('libre'), reto: () => canciones('reto'), lab: () => mostrar('lab'), mercado, vestidor, records, ajustes, creditos,
  saltarIntro: () => { cortarIntro = true; }, tutorial: () => { Y.tutorialVisto = true; guardar(); jugar('itty-bitty-8-bit', 'carril', 'tutorial'); }, aCalibrar, saltarCalib: () => { Y.calibrado = true; guardar(); if(Y.tutorialVisto) menu(); else ir('tutorial'); }, seguir: () => { partida.alternarPausa(); }, reintentar: jugarDeNuevo, salirJuego: () => { partida.salir(); if(ultima?.deHistoria) historia(); else canciones(modoLista); }, libreVolver: () => ultima?.alMenu ? menu() : ultima?.deHistoria ? finDeMision() : canciones(modoLista) })[a]?.(); }

/* ── la cinemática ── */
let cortarIntro = false;
async function intro(){ mostrar('intro'); const p = $('#introTxt'), lineas = ['Toda canción deja un eco.', 'Todo eco conserva una memoria.', 'Pero ¿qué sucede cuando alguien decide borrar la música que nos dio forma?', 'EXÓRCIST — THE SONOLUZ PROTOCOL'];
  for(const l of lineas){ if(cortarIntro) break; p.textContent = ''; for(const ch of l){ if(cortarIntro) break; p.textContent += ch; await new Promise(r => setTimeout(r, 38)); } await new Promise(r => setTimeout(r, 1300)); }
  Y.visto = true; guardar(); perfil(); }

/* ── el perfil ── */
function perfil(){ mostrar('perfil'); $('#nombre').value = Y.nombre;
  const ini = $('#iniciales'); ini.innerHTML = ''; ['gumi', 'miku', 'luka'].forEach(id => { const P = PERSONAJES.find(p => p.id === id), b = document.createElement('button'); b.innerHTML = `${P.nombre}<small>${P.faccion}</small>`;
    b.className = Y.puesto.voz === 'voz:' + id ? 'si' : ''; b.onclick = async () => { Y.puesto.voz = 'voz:' + id; [...ini.children].forEach(x => x.classList.toggle('si', x === b)); await escena.ponerCantantes([id]); }; ini.appendChild(b); });
  const col = $('#colores'); col.innerHTML = ''; ['Magenta', 'Cian', 'Oro'].forEach((n, i) => { const b = document.createElement('button'); b.textContent = n; b.className = Y.color === i ? 'si' : ''; b.style.color = ['#FF2D7A', '#38E1FF', '#FFE08A'][i]; b.onclick = () => { Y.color = i; [...col.children].forEach(x => x.classList.toggle('si', x === b)); }; col.appendChild(b); }); }
function aCalibrar(){ Y.nombre = ($('#nombre').value || 'Resonante').trim().slice(0, 16); regaloSecreto(); guardar(); mostrar('calibrar'); }
/* el secreto de la casa: quien se llame Mazi o Palomazi recibe el estilo de la paloma (no se anuncia en ningún lado) */
function regaloSecreto(){ const n = (Y.nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  if(!['mazi', 'palomazi'].includes(n)) return; const nuevos = ['nota:paloma', 'golpe:paloma', 'titulo:paloma'].filter(id => !Y.tiene.includes(id)); if(!nuevos.length) return;
  Y.tiene.push(...nuevos); guardar(); setTimeout(() => aviso('🕊️ Algo en el archivo te reconoció. Mira tu Vestidor.'), 1200); }

/* ── la calibración: 16 clics a 120 golpes por minuto; se promedia desde el 5.º ── */
$('#calibB').addEventListener('click', async () => {
  const b = $('#calibB'); b.disabled = true; const silencio = reloj.ctx.createBuffer(1, reloj.ctx.sampleRate * 11, reloj.ctx.sampleRate), paso = .5, toques = [];
  reloj.tocar(silencio, { desde: -1, espera: .1 }); for(let i = 0; i < 16; i++) reloj.clic(sonidos.clic, i * paso, .9);
  const pulso = $('#pulso'); let vivo = true;
  const tap = (e) => { e.preventDefault(); const t = reloj.en(e.timeStamp), k = Math.round(t / paso); if(k < 0 || k > 15) return; const d = t - k * paso; toques.push([k, d]);
    pulso.style.transform = 'scale(.9)'; setTimeout(() => pulso.style.transform = '', 80); const ok = toques.filter(x => x[0] >= 4).map(x => x[1]);
    if(ok.length){ const m = ok.reduce((a, x) => a + x, 0) / ok.length; $('#medida').textContent = `${m >= 0 ? '+' : ''}${Math.round(m * 1000)} ms`; } };
  $('#calibrar').addEventListener('pointerdown', tap);
  (function anima(){ if(!vivo) return; requestAnimationFrame(anima); const t = reloj.ahora(), f = ((t % paso) + paso) % paso / paso; pulso.style.borderColor = f < .15 ? '#FFFFFF' : '#38E1FF'; pulso.textContent = t < 0 ? '…' : Math.min(16, Math.floor(t / paso) + 1); })();
  await new Promise(r => setTimeout(r, 9200)); vivo = false; $('#calibrar').removeEventListener('pointerdown', tap);
  const ok = toques.filter(x => x[0] >= 4).map(x => x[1]);
  if(ok.length >= 6){ ok.sort((a, b) => a - b); const med = ok[Math.floor(ok.length / 2)]; Y.desfase = Math.round(Y.desfase + med * 1000); reloj.desfase = Y.desfase / 1000; Y.calibrado = true; guardar();
    $('#calibNota').textContent = `Listo: ajuste de ${Y.desfase} ms. Lo puedes cambiar en Ajustes.`; setTimeout(() => Y.tutorialVisto ? menu() : ir('tutorial'), 1400); }   /* la primera vez, del calibrado al tutorial */
  else { $('#calibNota').textContent = 'Casi no tocaste. Inténtalo otra vez.'; }
  b.disabled = false; b.textContent = 'Otra vez';
});

/* ── el menú ── */
function barra(){ const T = OBJETOS.find(o => o.id === Y.puesto.titulo);
  $('#barra').innerHTML = `<div class="avatar">${(Y.nombre || 'R')[0].toUpperCase()}</div><div class="quien"><b>${esc(Y.nombre || 'Resonante')}</b><span>Nv. ${Y.nivel} · ${T ? T.nombre : ''}</span></div><div class="moneda"><i></i>${Y.ecos}</div><div class="moneda sello"><i></i>${Y.sellos}</div>`; }
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function menu(){ partida.salir(); mostrar('menu'); musicaMenu();
  /* el premio diario: 300 Ecos y un Sello la primera vez que se abre el juego cada día */
  const hoy = new Date().toISOString().slice(0, 10); if(Y.diario !== hoy){ Y.diario = hoy; Y.ecos += 300; Y.sellos += 1; guardar(); setTimeout(() => aviso('Premio del día: +300 Ecos y +1 Sello'), 600); }
  barra(); requestAnimationFrame(() => irPanel(panelSel, false)); await escena.ponerCantantes([idVoz()]); }

/* EL MENÚ tipo Ligas Mazi: los modos grandes van en un carrusel con foto (el del centro crece, los de los
   lados se apagan) y lo secundario va abajo, también con foto. Las fotos salen del propio juego
   (herramientas/portadas.cjs): las cantantes en sus escenarios */
const PANELES = [
  { ir: 'historia', k: 'Capítulo I · Ecos de GUMI', t: 'Historia', corto: 'Historia', s: 'Entra a los archivos de SONOLUZ y vence al Coro Nulo.', c: '#FF2D7A' },
  { ir: 'libre', k: 'Cualquier canción', t: 'Juego libre', corto: 'Libre', s: 'Cinco modos y cinco dificultades, con tu música o la de la casa.', c: '#38E1FF' },
  { ir: 'reto', k: '⚠ Dificultad demoníaca', t: 'EXÓRCIST', corto: 'EXÓRCIST', s: 'Las reglas cambian a media canción. Nadie sale igual.', c: '#FF2D55' },
  { ir: 'lab', k: 'Tu música', t: 'Mi música', corto: 'Mi música', s: 'Mete tus canciones: anime, Vocaloid, lo que tengas en el teléfono.', c: '#5CFFB0' },
  { ir: 'mercado', k: 'Mercado de Ecos', t: 'Tiradas', corto: 'Mercado', s: 'Garra, sobres y carrusel. Todo se gana jugando.', c: '#FFE08A' }
];
const SECUNDARIAS = [{ ir: 'tutorial', t: 'Tutorial', s: 'Aprende en un minuto, sin presión', foto: 'libre' }, { ir: 'vestidor', t: 'Vestidor', s: 'Voz, notas, golpe y fondo' }, { ir: 'records', t: 'Récords', s: 'Tus mejores partidas' }, { ir: 'ajustes', t: 'Ajustes', s: 'Sincronía y velocidad' }, { ir: 'creditos', t: 'Créditos', s: 'Quién hizo todo' }];
let panelSel = 0;
function armarMenu(){ const T = $('#mTira'), C = $('#mCarrusel'), P = $('#mPuntos'), S = $('#mSec'); T.innerHTML = C.innerHTML = P.innerHTML = S.innerHTML = '';
  PANELES.forEach((p, i) => {
    const ch = document.createElement('button'); ch.textContent = p.corto; ch.onclick = () => irPanel(i, true); T.appendChild(ch);
    const b = document.createElement('button'); b.className = 'panelM'; b.setAttribute('role', 'listitem'); b.style.setProperty('--c', p.c);
    b.innerHTML = `<img src="portadas/${p.ir}.jpg" alt="" loading="${i < 2 ? 'eager' : 'lazy'}"><div class="vel"></div><span class="franja"></span><div class="cuerpo"><div class="k">${p.k}</div><div class="t">${p.t}</div><div class="s">${p.s}</div><span class="entrar">Entrar ›</span></div>`;
    b.onclick = () => { if(i === panelSel){ sonidos.boton && reloj.golpe(sonidos.boton, .25); ir(p.ir); } else irPanel(i, true); }; C.appendChild(b);
    P.appendChild(document.createElement('i')); });
  SECUNDARIAS.forEach(o => { const b = document.createElement('button'); b.className = 'secundaria'; b.dataset.ir = o.ir; b.innerHTML = `<img src="portadas/${o.foto || o.ir}.jpg" alt="" loading="lazy"><b>${o.t}</b><span>${o.s}</span>`; S.appendChild(b); });
  let raf = 0; C.addEventListener('scroll', () => { if(raf || programado) return; raf = requestAnimationFrame(() => { raf = 0; const mid = C.scrollLeft + C.clientWidth / 2; let mejor = 0, d0 = 1e9;
    [...C.children].forEach((el, k) => { const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid); if(d < d0){ d0 = d; mejor = k; } }); marcarPanel(mejor); }); }, { passive: true });
  marcarPanel(panelSel, true); }
let programado = false;
function marcarPanel(i, forzar = false){ if(i === panelSel && !forzar) return; panelSel = i;
  [...$('#mCarrusel').children].forEach((el, k) => el.classList.toggle('si', k === i)); [...$('#mTira').children].forEach((el, k) => el.classList.toggle('si', k === i)); [...$('#mPuntos').children].forEach((el, k) => el.classList.toggle('si', k === i));
  /* sólo se mueve la tira, con scrollTo: scrollIntoView mueve también la página (está anotado en CLAUDE.md) */
  const tira = $('#mTira'), ch = tira.children[i]; if(ch) tira.scrollTo({ left: ch.offsetLeft - (tira.clientWidth - ch.clientWidth) / 2, behavior: 'smooth' }); }
function irPanel(i, suave){ marcarPanel(i); const C = $('#mCarrusel'), el = C.children[i]; if(!el) return; programado = true; setTimeout(() => programado = false, 500);
  C.scrollTo({ left: el.offsetLeft - (C.clientWidth - el.clientWidth) / 2, behavior: suave ? 'smooth' : 'auto' }); }
armarMenu();

/* ── canciones ── */
let modoLista = 'libre', modoSel = 'carril', difSel = 'dificil', cancionSel = CANCIONES[0].id, ultima = null;
async function canciones(cual){ modoLista = cual; mostrar('canciones'); $('#cancionesT').textContent = cual === 'reto' ? 'EXÓRCIST Challenge' : 'Juego libre';
  if(cual === 'reto'){ modoSel = 'exorcist'; if(!['experto', 'exorcist'].includes(difSel)) difSel = 'exorcist'; }
  const md = $('#modos'); md.innerHTML = ''; Object.entries(MODOS).forEach(([k, m]) => { if(cual === 'reto' && k !== 'exorcist') return; const b = document.createElement('button'); b.textContent = m.nombre; b.className = k === modoSel ? 'si' : ''; b.onclick = () => { modoSel = k; canciones(cual); }; md.appendChild(b); });
  await listaPropia; if(!CANCIONES.some(x => x.id === cancionSel)) cancionSel = CANCIONES[0].id;
  const L = $('#lista'), filtro = quitarAcentos($('#buscaCancion').value.trim()); L.innerHTML = '';
  $('#buscaCancion').hidden = CANCIONES.length < 12;
  const propias = CANCIONES.filter(c => c.propia).length;
  for(const [titulo, grupo] of [['De la casa', CANCIONES.filter(c => !c.propia && !c.piano && !c.anime)], ['Anime y ritmo', CANCIONES.filter(c => c.anime)], ['Piano imposible', CANCIONES.filter(c => c.piano)], [`Mi música · ${propias}`, CANCIONES.filter(c => c.propia)]]){
    const vis = grupo.filter(c => !filtro || quitarAcentos(c.titulo + ' ' + c.artista).includes(filtro)); if(!vis.length) continue;
    { const h = document.createElement('h4'); h.className = 'ojo grupo'; h.textContent = titulo; L.appendChild(h); }
    for(const c of vis){ const b = document.createElement('button'); b.className = 'fila' + (c.id === cancionSel ? ' si' : ''); const r = Y.record[`${c.id}|${modoSel}|${difSel}`];
      b.innerHTML = `<div class="mini" style="background-image:url('${fondoDe(c)}')"></div><div><b>${esc(c.titulo)}</b><span>${esc(c.artista)} · ${c.voces.map(v => PERSONAJES.find(p => p.id === v)?.nombre).filter(Boolean).join(' · ')}</span></div><div class="mejor">${r ? r.rango + '<br>' + r.puntaje : ''}</div>`;
      b.onclick = () => { cancionSel = c.id; canciones(cual); }; L.appendChild(b); } }
  if(!propias){ const b = document.createElement('button'); b.className = 'fila agrega'; b.innerHTML = '<div class="mini">＋</div><div><b>Mete tu música</b><span>Anime, Vocaloid, lo que tengas en el teléfono</span></div>'; b.onclick = () => mostrar('lab'); L.appendChild(b); }
  const c = CANCIONES.find(x => x.id === cancionSel), an = await datos(c.id);
  const niveles = DIFS.map(d => armarCarta(an, c, modoSel, d.id).nivel), colD = ['#5CFFB0', '#38E1FF', '#FFC24B', '#FF2D7A', '#FF2D55'];
  $('#portada').innerHTML = `<div class="foto" style="background-image:url('${fondoDe(c)}')"></div><div><div class="ojo">${MODOS[modoSel].de}</div><h3>${esc(c.titulo)}</h3><div class="art">${esc(c.artista)} · ${MODOS[modoSel].que}</div>
    <div class="datos"><span class="pill">BPM ${Math.round(an.bpm)}</span><span class="pill">${fmt(an.dur)}</span>${c.jefe ? '<span class="pill rojo">JEFE</span>' : ''}${c.propia ? '<button class="pill quitar" id="quitarB">Quitar</button>' : ''}</div></div>`;
  /* quitar una canción propia pide un segundo toque: se borra del teléfono y no hay cómo deshacerlo */
  if(c.propia) $('#quitarB').onclick = async (e) => { const q = e.currentTarget; if(!q.dataset.seguro){ q.dataset.seguro = 1; q.textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { if(q.isConnected){ delete q.dataset.seguro; q.textContent = 'Quitar'; } }, 3000); return; }
    await biblioteca.borrar(c.id); CANCIONES.splice(CANCIONES.indexOf(c), 1); delete analisis[c.id]; delete bufs[c.id]; if(portadas[c.id]){ URL.revokeObjectURL(portadas[c.id]); delete portadas[c.id]; }
    cancionSel = CANCIONES[0].id; canciones(cual); };
  const dv = $('#difs'); dv.innerHTML = ''; DIFS.forEach((d, i) => { const b = document.createElement('button'); b.style.setProperty('--c', colD[i]); b.className = d.id === difSel ? 'si' : ''; b.innerHTML = `<em><s>${niveles[i]}</s></em>${d.nombre}`; b.onclick = () => { difSel = d.id; canciones(cual); }; dv.appendChild(b); });
  escena.ponerCantantes(c.voces); musica(c.id, 350);
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
$('#buscaCancion').addEventListener('input', () => canciones(modoLista));
$('#jugarB').addEventListener('click', () => jugar(cancionSel, modoSel, difSel));

/* ── jugar ── */
/* «al tocar iniciar canción sólo se queda trabado hasta que carga, y si le picas más veces empiezan muchas
   veces la misma canción» (Carlos, 29 oct): ahora sale la pantalla de carga con lo que está pasando, y un
   candado deja pasar UN arranque a la vez */
const TIPS = ['Las reglas cambian a media canción: lee el aviso rojo.', 'Si los carriles giran, los botones de toque los siguen.', 'Calibra en Ajustes si sientes que las notas llegan tarde.', 'Las notas con flecha se deslizan hacia donde apunta la flecha.', 'En EXÓRCIST nada se queda quieto mucho tiempo.', 'Los Ecos se ganan jugando; el premio diario también cuenta.'];
let arrancando = false;
async function jugar(id, modo, dif, deHistoria = null, prueba = {}){
  if(arrancando) return; arrancando = true;
  const c = CANCIONES.find(x => x.id === id) || ultima?.c, paso = (txt, p) => { $('#cargaP').textContent = txt; $('#cargaB').style.width = Math.round(p * 100) + '%'; };
  $('#cargaT').textContent = c.titulo; $('#cargaTip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)]; paso('Leyendo la canción', .1); mostrar('carga'); pararFondo();
  try{
    const an = await datos(c.id); paso('Despertando el audio', .3);
    const buf = await audio(c.id); paso('Escribiendo las notas', .65);
    const carta = dif === 'tutorial' ? armarTutorial(an, c) : armarCarta(an, c, modo, dif, { telefono: TELEFONO }); ultima = { c, modo, dif, deHistoria };
    escena.precargar(carta.eventos.filter(e => e.tipo === 'escenario').map(e => e.n)); paso('Llamando a las voces', .85);
    await escena.ponerCantantes(modo === 'flechas' ? [idVoz(), c.voces.find(v => v !== idVoz()) || 'miku'] : [...new Set([idVoz(), ...c.voces])].slice(0, 3));
    paso('¡Listo!', 1);
    mostrar(null); $('#sombra').style.opacity = 0;
    partida.empezar(c, carta, an, buf, { autoJuego: $('#opAuto').checked, vel: Y.vel, ritmo: $('#opPract').checked ? .75 : 1, desde: prueba.desde ?? null });   /* `desde`: las pruebas empiezan a media canción */
    Y.sinMorir = $('#opSin').checked || $('#opPract').checked || !!Y.practica || dif === 'tutorial';
    $('#pausaB').classList.add('vis');
    cuenta(carta);
  }catch(err){ console.error(err); aviso('No se pudo cargar la canción. Revisa tu internet e inténtalo otra vez.'); canciones(modoLista); }
  finally{ arrancando = false; }
}
/* la música del menú: una canción de la casa (la que toque hoy); en la lista, la canción elegida desde su
   parte más fuerte, como en Arcaea */
let fondoId = null, fondoPend = 0;
function pararFondo(){ fondoId = null; clearTimeout(fondoPend); reloj.pararFondo(); }
function musica(id, espera = 0){ if(fondoId === id) return; fondoId = id; clearTimeout(fondoPend);
  fondoPend = setTimeout(async () => { try{ const [an, buf] = await Promise.all([datos(id), audio(id)]); if(fondoId !== id) return;
    const e = an.energia || [], i = e.indexOf(Math.max(...(e.length ? e : [0]))), desde = Math.max(0, Math.min(buf.duration - 20, i / 2 - 6)); reloj.fondo(buf, { desde }); }catch(err){} }, espera); }
const musicaMenu = () => musica(CANCIONES[new Date().getDate() % 7].id);
/* teléfono = pantalla táctil angosta: ahí las cartas no ponen 6 o 7 carriles ni acordes de más de dos notas
   (se juega con dos pulgares); la dificultad sale de las mecánicas, no de los dedos */
const TELEFONO = matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 600;
function cuenta(carta){ const el = $('#cuenta'); el.classList.add('vis'); const primero = carta.notas[0]?.t ?? 2;
  (function paso(){ const t = reloj.ahora(), falta = Math.min(primero, 0) - t; if(!partida.corriendo || t > Math.min(primero, 0) - .1 && t > -.4){ el.classList.remove('vis'); return; } el.textContent = t < -2 ? '3' : t < -1 ? '2' : '1'; requestAnimationFrame(paso); })(); }
$('#pausaB').addEventListener('click', () => partida.alternarPausa());
function jugarDeNuevo(){ partida.salir(); if(ultima) jugar(ultima.c.id, ultima.modo, ultima.dif, ultima.deHistoria); }

/* ── resultados ── */
function resultados({ cancion, carta, J, murio, auto }){
  $('#pausaB').classList.remove('vis'); mostrar('resultados');
  /* en la Historia, el botón de salida regresa a la historia (con su diálogo final), no a Juego libre */
  $('#resultados [data-ir="libreVolver"]').textContent = ultima?.deHistoria ? 'Seguir la historia ›' : 'Canciones';
  const r = murio ? 'F' : J.rango, colR = { 'Ω': '#FFF3B0', 'EX+': '#FFE08A', EX: '#FFC24B', S: '#FF2D7A', A: '#B44BFF', B: '#38E1FF', C: '#5CFFB0', D: '#B9AECB', F: '#FF2D55' }[r];
  $('#resRango').textContent = r; $('#resRango').style.setProperty('--c', colR);
  $('#resCancion').textContent = `${cancion.titulo} · ${MODOS[carta.modo].nombre} · ${carta.D.nombre} ${carta.nivel}${auto ? ' · AUTO' : ''}`;
  $('#resPuntos').innerHTML = `${String(J.puntaje).padStart(7, '0')}<small>PRECISIÓN ${J.precision.toFixed(2)} % · COMBO ${J.comboMax}</small>`;
  $('#resSellos').innerHTML = (J.ap ? '<span>ALL PERFECT</span>' : J.fc ? '<span>FULL COMBO</span>' : '') + (murio ? '<span style="border-color:#FF2D55;color:#FF2D55">EL ARCHIVO SE CERRÓ</span>' : '');
  $('#resJuicios').innerHTML = [['sonoluz', 'SONOLUZ', '#FFF3B0'], ['perfecto', 'PERFECTO', '#7CF0FF'], ['genial', 'GENIAL', '#8DFF9E'], ['bien', 'BIEN', '#FFC46B'], ['fallo', 'FALLO', '#FF4D6D']].map(([k, n, c]) => `<div style="--c:${c}">${J.cuenta[k]}<small>${n}</small></div>`).join('');
  /* el histograma de desvíos: para mejorar, no sólo para presumir */
  const hc = $('#histograma'), dpr = devicePixelRatio || 1; hc.width = hc.clientWidth * dpr; hc.height = 120 * dpr; const x = hc.getContext('2d'); x.scale(dpr, dpr); const w = hc.clientWidth;
  const cubos = Array(41).fill(0); J.desvios.forEach(d => { const i = Math.round(d * 1000 / 5) + 20; if(i >= 0 && i < 41) cubos[i]++; }); const mx = Math.max(1, ...cubos);
  x.fillStyle = '#ffffff22'; x.fillRect(w / 2, 0, 1, 110); cubos.forEach((v, i) => { const h = v / mx * 100; x.fillStyle = Math.abs(i - 20) <= 4 ? '#7CF0FF' : Math.abs(i - 20) <= 9 ? '#8DFF9E' : '#FFC46B'; x.fillRect(i * w / 41 + 1, 108 - h, w / 41 - 2, h); });
  x.fillStyle = '#ffffff88'; x.font = '700 10px Orbitron'; x.fillText('ANTES', 4, 118); x.textAlign = 'right'; x.fillText('TARDE', w - 4, 118);
  const media = J.desvios.length ? J.desvios.reduce((a, b) => a + b, 0) / J.desvios.length * 1000 : 0, peor = J.porSeccion.map((s, i) => [s.mal / Math.max(1, s.bien + s.mal), i]).sort((a, b) => b[0] - a[0])[0];
  $('#resConsejo').textContent = Math.abs(media) > 12 ? `En promedio vas ${Math.round(Math.abs(media))} ms ${media < 0 ? 'antes' : 'tarde'}: si te pasa siempre, mueve la sincronía en Ajustes.` : peor && peor[0] > .25 ? `Donde más fallaste: la sección ${peor[1] + 1} (${MODOS[carta.plan[peor[1]].modo].nombre}). Repítela.` : 'Tu ritmo está centrado. Ahora súbele la dificultad.';
  /* sin morir (o en modo práctica) se juega hasta el final, pero no se gana nada: si no, morirse no costaría */
  if(carta.tutorial){ $('#resRango').textContent = '✓'; $('#resRango').style.setProperty('--c', '#5CFFB0'); $('#resSellos').innerHTML = '<span style="border-color:#5CFFB0;color:#5CFFB0">TUTORIAL COMPLETO</span>'; $('#resultados [data-ir="libreVolver"]').textContent = 'Ir al menú'; ultima.alMenu = true; return; }
  if(Y.sinMorir && !auto){ $('#resSellos').innerHTML += '<span style="border-color:#B9AECB;color:#B9AECB">PRÁCTICA · SIN ECOS</span>'; return; }
  if(!auto){ const k = `${cancion.id}|${carta.modo}|${carta.dif}`, ant = Y.record[k]; if(!ant || J.puntaje > ant.puntaje) Y.record[k] = { puntaje: J.puntaje, rango: r, precision: +J.precision.toFixed(2), combo: J.comboMax, fc: J.fc, ap: J.ap };
    const primera = !ant && !murio && J.puntaje >= 600000;
    const gana = Math.round(J.puntaje / 10000) + (J.fc ? 40 : 0) + (J.ap ? 80 : 0) + (carta.dif === 'exorcist' ? 60 : 0) + (primera ? 100 : 0); Y.ecos += gana; Y.xp += gana; while(Y.xp >= Y.nivel * 120){ Y.xp -= Y.nivel * 120; Y.nivel++; Y.sellos++; }
    if(ultima?.deHistoria && !murio && J.puntaje >= 600000){ Y.historia[ultima.deHistoria] = true; if(ultima.c.jefe) { Y.sellos += 5; if(!Y.tiene.includes('voz:miku-akuma')){ Y.tiene.push('voz:miku-akuma'); setTimeout(() => aviso('Venciste al Coro Nulo: Miku Excomulgada ya es tuya.'), 2200); } } }
    guardar(); setTimeout(() => aviso(`+${gana} Ecos`), 900); sonidos.premio && reloj.golpe(sonidos.premio, .4); }
}

/* ── historia ── */
/* al acabar una misión (Carlos, 30 oct: «que no me lleve al free play sino que me deje en la historia con un diálogo
   final y acceso a la siguiente canción»): si se ganó, su diálogo final; si no, un ánimo para reintentarla */
function finDeMision(){ const k = ultima.deHistoria, [ci, mi] = k.split('.').map(Number), m = HISTORIA[ci].misiones[mi], gano = !!Y.historia[k];
  const voz = m.d.find(([q]) => PERSONAJES.some(p => p.nombre === q))?.[0] || 'GUMI';
  dialogo(gano ? (m.f || [['SONOLUZ', 'Canción restaurada.']]) : [[voz, 'Todavía no. La canción sigue rota.'], ['SONOLUZ', 'Necesitas 600,000 puntos sin que se cierre el archivo. Inténtalo otra vez.']], () => historia()); }
function historia(){ mostrar('historia'); const H = $('#capitulos'); H.innerHTML = ''; let abierto = true;
  /* arriba, la que sigue: un toque y se juega */
  const todas = HISTORIA.flatMap((cap, ci) => cap.misiones.map((m, mi) => ({ m, k: `${ci}.${mi}`, cap: cap.cap }))), sig = todas.find(x => !Y.historia[x.k]);
  if(sig){ const c = CANCIONES.find(x => x.id === sig.m.c), b = document.createElement('button'); b.className = 'mision siguiente';
    b.innerHTML = `<span class="n">▶</span><span><span class="ojo" style="margin:0">${Object.keys(Y.historia).length ? 'Sigue la historia' : 'Empieza aquí'} · ${sig.cap}</span><br><b style="font:800 15px var(--n)">${c.titulo}</b><br><span style="font-size:12px;color:var(--gris)">${MODOS[sig.m.modo].nombre} · ${DIFS.find(x => x.id === sig.m.dif).nombre}${sig.m.jefe ? ' · JEFE' : ''}</span></span><span class="pill">Jugar</span>`;
    b.onclick = () => dialogo(sig.m.d, () => jugar(sig.m.c, sig.m.modo, sig.m.dif, sig.k)); H.appendChild(b); }
  HISTORIA.forEach((cap, ci) => { const d = document.createElement('div'); d.className = 'cap'; d.innerHTML = `<h3>${cap.cap}</h3>`;
    cap.misiones.forEach((m, mi) => { const k = `${ci}.${mi}`, hecha = !!Y.historia[k], c = CANCIONES.find(x => x.id === m.c), b = document.createElement('button');
      b.className = 'mision' + (hecha ? ' hecha' : '') + (abierto ? '' : ' bloq'); b.innerHTML = `<span class="n">${hecha ? '✓' : String(mi + 1).padStart(2, '0')}</span><span><b style="font:800 13px var(--n)">${c.titulo}</b><br><span style="font-size:12px;color:var(--gris)">${MODOS[m.modo].nombre} · ${DIFS.find(x => x.id === m.dif).nombre}${m.jefe ? ' · JEFE' : ''}</span></span><span class="pill">${abierto ? 'Jugar' : '🔒'}</span>`;
      const ab = abierto; b.onclick = () => { if(ab) dialogo(m.d, () => jugar(m.c, m.modo, m.dif, k)); else aviso('Termina la incursión anterior para abrir ésta.'); };
      d.appendChild(b); if(!hecha) abierto = false; });
    H.appendChild(d); });
  const fin = document.createElement('p'); fin.className = 'sub'; fin.style.marginTop = '8px'; fin.textContent = 'Capítulos II a IV y el final, en la versión completa.'; H.appendChild(fin); }
function dialogo(lineas, alFinal){ mostrar('dialogo'); let i = 0; const sig = () => { if(i >= lineas.length){ alFinal(); return; } const [quien, txt] = lineas[i++], P = PERSONAJES.find(p => p.nombre === quien);
    $('#habla').textContent = quien; $('#habla').style.setProperty('--c', P ? P.color : '#38E1FF'); $('#dice').textContent = txt; if(P) escena.ponerCantantes([P.id]); };
  $('#dialogoB').onclick = sig; sig(); }

/* ── vestidor ── */
let catSel = 'voz';
function vestidor(){ mostrar('vestidor'); const R = $('#ranuras'); R.innerHTML = '';
  Object.entries(CATS).forEach(([k, n]) => { const o = OBJETOS.find(x => x.id === Y.puesto[k]); const b = document.createElement('button'); b.className = 'ranura' + (k === catSel ? ' si' : ''); b.innerHTML = `${n}<em>${o ? o.nombre : '—'}</em>`; b.onclick = () => { catSel = k; vestidor(); }; R.appendChild(b); });
  const C = $('#vestCats'); C.innerHTML = '';
  const O = $('#objetos'); O.innerHTML = '';
  OBJETOS.filter(o => o.cat === catSel && (!o.secreto || Y.tiene.includes(o.id))).forEach(o => { const tiene = Y.tiene.includes(o.id), b = document.createElement('button');
    /* lo que no se ha descubierto no dice ni nombre ni rareza (Carlos, 29 oct) */
    if(!tiene){ b.className = 'obj oculto'; b.innerHTML = '<div class="muestra">?</div>???'; b.onclick = () => aviso('Todavía no lo descubres. Sale en el Mercado de Ecos.'); O.appendChild(b); return; }
    b.className = `obj raro-${o.raro}${Y.puesto[o.cat] === o.id ? ' puesto' : ''}`;
    b.innerHTML = `<div class="muestra">${vista(o)}</div>${o.nombre}<small style="display:block;font:700 10px var(--n);color:#ffffffcc">${RAREZA[o.raro].n.toUpperCase()}</small>`;
    b.onclick = async () => { Y.puesto[o.cat] = o.id; guardar(); aplicarCosmeticos(); if(o.cat === 'voz') await escena.ponerCantantes([idVoz()]); vestidor(); };
    O.appendChild(b); });
  if(catSel === 'voz') escena.ponerCantantes([idVoz()]);
}
function aplicarCosmeticos(){ const n = OBJETOS.find(o => o.id === Y.puesto.nota); if(n) n.colores.forEach((c, i) => COLORES_RIEL[i] = c);
  /* el efecto de golpe: antes se elegía en el vestidor y no se leía en ningún lado */
  Y.golpeSprite = OBJETOS.find(o => o.id === Y.puesto.golpe)?.sprite || 'p_flare_01';
  const est = (c, def) => (Y.puesto[c] || def).split(':')[1];
  Y.estilos = { forma: est('forma', 'forma:barra'), flechas: est('flechas', 'flechas:contorno'), simbolos: est('simbolos', 'simbolos:color'), aros: est('aros', 'aros:clasico') };
  escena.ponerForma?.(Y.estilos.forma); document.body.className = document.body.className.replace(/\bboton-\S+/g, '').trim() + ' boton-' + est('boton', 'boton:neon');
  escena.piezas.rieles.forEach((R, i) => { R.fondoR.material.color.set(COLORES_RIEL[i]); R.lado.material.color.set(COLORES_RIEL[i]); R.rec.material.color.set(COLORES_RIEL[i]); R.brillo.material.color.set(COLORES_RIEL[i]); R.haz.material.color.set(COLORES_RIEL[i]); }); }

/* ── mercado: probabilidades a la vista, garantía a las 50 y los repetidos se vuelven Ecos ──
   GRATIS: todo se paga con lo que se gana jugando (Carlos, 29 oct: «todo será gratuito con monedas del
   juego y progresión interna»). Las máquinas (garra, sobre y carrusel) viven en mercado.js */
function pagar(costo, conSello = false){
  if(conSello){ if(Y.sellos < 1){ aviso('No tienes Sellos: se ganan subiendo de nivel y venciendo jefes.'); return false; } Y.sellos--; }
  else { if(Y.ecos < costo){ aviso('No te alcanzan los Ecos: juega una canción.'); return false; } Y.ecos -= costo; }
  guardar(); return true; }
function sortear(n){ const sale = [];
  for(let i = 0; i < n; i++){ Y.pity++; let r = Math.random() * 100, raro = 'c'; for(const [k, v] of Object.entries(RAREZA).reverse()){ if(r < v.p){ raro = k; break; } r -= v.p; }
    if(Y.pity >= 50 && !['l', 'm'].includes(raro)) raro = 'l'; if(['l', 'm'].includes(raro)) Y.pity = 0;
    const pool = OBJETOS.filter(o => o.raro === raro && !o.secreto), o = pool[Math.floor(Math.random() * pool.length)]; const nuevo = !Y.tiene.includes(o.id); if(nuevo) Y.tiene.push(o.id); else Y.ecos += { c: 10, r: 25, e: 60, l: 150, m: 300 }[raro]; sale.push({ o, nuevo }); }
  guardar(); return sale; }
/* cómo se ve un objeto en chiquito (vestidor, tiradas, premio) */
function vista(o){ const k = o.id.split(':')[1];
  if(o.cat === 'forma') return o.foto ? `<img class="formaFoto" src="modelos/notas/${o.foto}.webp" alt="">` : `<i class="formaMini f-${k}"></i>`;
  if(o.cat === 'flechas') return `<img src="sprites/tecla_arrow_up${k === 'contorno' ? '_outline' : ''}.png" alt="" class="${k === 'neon' ? 'brillo' : ''}">`;
  if(o.cat === 'simbolos') return `<img src="sprites/${k === 'contorno' ? 'ps_triangle_outline' : k === 'blanco' ? 'ps_color_triangle_outline' : 'ps_color_triangle'}.png" alt="">`;
  if(o.cat === 'aros') return `<img src="sprites/${{ clasico: 'gen_circle_outline', magia: 'p_magic_03', estelar: 'p_star_06' }[k]}.png" alt="">`;
  if(o.cat === 'boton') return `<span class="b mini boton-${k}">Jugar</span>`;
  if(o.cat === 'golpe') return `<img src="sprites/${o.sprite}.png" alt="">`; if(o.cat === 'fondo') return `<img src="${o.img}" alt="" class="foto">`;
  if(o.cat === 'nota') return o.colores.slice(0, 4).map(c => `<i class="punto" style="background:${c}"></i>`).join('');
  if(o.cat === 'voz') return `<i class="inicial" style="color:${o.color}">${o.nombre[0]}</i>`; return `<i class="tituloObj">«${o.nombre}»</i>`; }
const mercadoUI = montarMercado({ $, Y, RAREZA, sortear, pagar, barra, reloj, sonidos, vista, pool: () => OBJETOS.filter(o => !o.secreto) });
function mercado(){ mostrar('mercado'); barra(); $('#probas').innerHTML = Object.values(RAREZA).map(r => `${r.n} ${r.p} %`).join(' · ') + '<br>Repetido = Ecos de vuelta'; mercadoUI.abrir(); }

/* ── récords, ajustes, créditos ── */
function records(){ mostrar('records'); const L = $('#recordsL'), ks = Object.entries(Y.record).sort((a, b) => b[1].puntaje - a[1].puntaje);
  L.innerHTML = ks.length ? ks.map(([k, r]) => { const [c, m, d] = k.split('|'); return `<div class="fila"><div class="mini" style="background-image:url(escenarios/${ESCENARIOS[CANCIONES.find(x => x.id === c)?.escena ?? 0].id}.jpg)"></div><div><b>${CANCIONES.find(x => x.id === c)?.titulo || c}</b><span>${MODOS[m]?.nombre} · ${DIFS.find(x => x.id === d)?.nombre} · ${r.precision} %${r.ap ? ' · AP' : r.fc ? ' · FC' : ''}</span></div><div class="mejor">${r.rango}<br>${r.puntaje}</div></div>`; }).join('') : '<p class="sub">Todavía no hay partidas. Ve a Juego libre.</p>'; }
function ajustes(){ mostrar('ajustes'); const A = $('#ajustesL');
  const fila = (k, nom, min, max, paso, uni, txt) => `<div class="ajuste"><span>${nom}</span><b id="v_${k}">${Y[k]}${uni}</b><input type="range" min="${min}" max="${max}" step="${paso}" value="${Y[k]}" data-k="${k}" data-u="${uni}"><small>${txt}</small></div>`;
  const tog = (k, nom, txt) => `<label class="ajuste"><span>${nom}</span><input type="checkbox" data-t="${k}" ${Y[k] ? 'checked' : ''}><small>${txt}</small></label>`;
  A.innerHTML = fila('desfase', 'Sincronía del audio', -250, 250, 1, ' ms', 'Si siempre vas tarde, súbelo; si vas antes, bájalo. La calibración lo pone sola.') + fila('desfaseVisual', 'Sincronía visual', -100, 100, 1, ' ms', 'Si las notas se ven llegar antes o después del sonido.')
    + fila('vel', 'Velocidad de las notas', .5, 2.5, .05, '×', 'Sólo cambia qué tan rápido se ven; la canción y los tiempos no cambian.')
    + tog('sonidoGolpe', 'Sonido al acertar', 'Un golpe corto con cada nota.') + tog('mostrarDesvio', 'Mostrar «antes» / «tarde»', 'Los milisegundos de cada toque, debajo del juicio.')
    + (Y.practicaVista ? tog('practica', 'Modo práctica', 'Aunque la vida llegue a cero sigues jugando hasta el final. No se ganan Ecos, ni récords, ni se avanza la Historia.') : '')
    + '<div class="pie" style="background:none"><button class="b" id="recalibrar">Calibrar otra vez</button></div>';
  /* EL MODO PRÁCTICA está escondido (Carlos, 30 oct): se destapa tocando 5 veces el título «Ajustes» */
  const h = $('#ajustes h2'); let toques = []; h.onclick = () => { const a = performance.now(); toques = toques.filter(x => a - x < 3000); toques.push(a);
    if(toques.length >= 5 && !Y.practicaVista){ Y.practicaVista = true; guardar(); aviso('* Encontraste algo escondido. Te llenas de determinación.'); ajustes(); } };
  A.querySelectorAll('input[type=range]').forEach(i => i.oninput = () => { Y[i.dataset.k] = +i.value; $('#v_' + i.dataset.k).textContent = i.value + i.dataset.u; reloj.desfase = Y.desfase / 1000; reloj.desfaseVisual = Y.desfaseVisual / 1000; guardar(); });
  A.querySelectorAll('input[type=checkbox]').forEach(i => i.onchange = () => { Y[i.dataset.t] = i.checked; guardar(); });
  $('#recalibrar').onclick = () => mostrar('calibrar'); }
function creditos(){ mostrar('creditos');
  $('#creditosL').innerHTML = `<div class="ojo">VS TILES · EXÓRCIST: THE SONOLUZ PROTOCOL</div><p style="margin-top:8px">Idea, mundo y documento de diseño: <b>Carlos «Palomazi»</b>. Programación: Grupo Mazi.</p>
  <p>Es un <b>fan game sin fines de lucro</b>. Los personajes Vocaloid y UTAU son de sus dueños (Crypton Future Media, INTERNET Co., AH-Software, Yamaha y demás); aquí salen como homenaje.</p>
  <h3>MÚSICA</h3><p>${CANCIONES.map(c => `«${c.titulo}»`).join(', ')} — <b>Kevin MacLeod</b> (incompetech.com). Licencia Creative Commons: By Attribution 4.0.</p>
  <h3>PERSONAJES 3D (Sketchfab, vía Objaverse)</h3><p>${PERSONAJES.map(p => `<b>${p.nombre}</b> — ${p.autor}`).join('<br>')}<br>Y una invitada que sólo sale si la buscas: <b>«Shiteyanyo - Hatsune Miku»</b> — Seafoam.<br>Licencia CC BY 4.0.</p>
  <h3>ESCENARIOS</h3><p>Fotos 360° de <b>Poly Haven</b> (CC0): ${ESCENARIOS.map(e => e.id.replace(/_/g, ' ')).join(', ')}.</p>
  <h3>BOTONES, PARTÍCULAS Y SONIDOS</h3><p><b>Kenney</b> (kenney.nl, CC0): Input Prompts, Particle Pack, Interface Sounds, Impact Sounds. La risa: <b>AntumDeluge</b> (OpenGameArt, CC0).</p>
  <h3>LETRA Y CÓDIGO DE FUERA</h3><p>Orbitron, Zen Kaku Gothic New y Cinzel (Google Fonts, SIL OFL). three.js (MIT).</p>`; }

/* ── Lab: tu canción ── */
$('#labArchivo').addEventListener('change', async (e) => { const fs = [...e.target.files]; e.target.value = ''; if(!fs.length) return; const st = $('#labEstado');
  biblioteca.persistir(); let bien = 0, primera = null; const voces = PERSONAJES.filter(p => !p.jefe).map(p => p.id);
  for(const [i, f] of fs.entries()){ const pre = fs.length > 1 ? `${i + 1} de ${fs.length} · ` : '';
    try{ st.textContent = `${pre}Leyendo «${f.name}»…`;
      const et = await etiquetas(f), datosArchivo = await f.arrayBuffer(); reloj.preparar();
      const buf = await reloj.ctx.decodeAudioData(datosArchivo.slice(0));
      const an = await analizar(buf, (m) => st.textContent = `${pre}${et.titulo}: ${m}`);
      const id = 'mia-' + hash(`${et.artista}|${et.titulo}|${f.size}`), h = parseInt(hash(id), 36);
      const rec = { id, titulo: et.titulo, artista: et.artista, portada: et.portada || null, an, audio: new Blob([datosArchivo], { type: f.type || 'audio/mpeg' }),
        voces: [idVoz(), voces[h % voces.length]].filter((v, k, a) => a.indexOf(v) === k), escena: h % ESCENARIOS.length, agregada: Date.now() + i };
      await biblioteca.guardar(rec); agregarPropia(rec); bien++; primera ||= id;
    }catch(err){ st.textContent = `${pre}No se pudo leer «${f.name}». Prueba con MP3 o M4A.`; await new Promise(r => setTimeout(r, 1800)); } }
  pintarMiMusica();
  if(!bien) return; cancionSel = primera;
  st.textContent = bien === 1 ? 'Lista. Ya está en Juego libre, en «Mi música».' : `Listas ${bien} canciones. Ya están en Juego libre, en «Mi música».`; setTimeout(() => canciones('libre'), 1100);
});
function pintarMiMusica(){ const n = CANCIONES.filter(c => c.propia).length; $('#labCuenta').textContent = n ? `Tienes ${n} ${n === 1 ? 'canción' : 'canciones'} en este teléfono.` : ''; }
listaPropia.then(pintarMiMusica);


window.VST = { partida, escena, Y, jugar, CANCIONES, armarCarta, datos };    // para las pruebas
