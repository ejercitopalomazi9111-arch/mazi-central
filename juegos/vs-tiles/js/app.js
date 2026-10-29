/* VS TILES · EXÓRCIST — las pantallas: arranque, cinemática, perfil, calibración, menú, canciones,
   partida, resultados, historia, vestidor, mercado, récords, ajustes, Lab y créditos.
   Lo que el jugador gana y elige se guarda en el teléfono (localStorage); si el navegador no deja,
   se juega igual y sólo no se recuerda. */
import { reloj } from './reloj.js';
import { armarCarta, DIFS, MODOS } from './cartas.js';
import { crearEscena, ESCENARIOS, PERSONAJES, COLORES_RIEL } from './escena.js';
import { crearPartida, cargarSprites } from './juego.js';
import { analizar } from './analisis.js';
import { biblioteca, etiquetas } from './biblioteca.js';
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];

/* ── el catálogo ── */
export const CANCIONES = [
  { id: 'itty-bitty-8-bit', titulo: 'Itty Bitty 8 Bit', artista: 'Kevin MacLeod', voces: ['gumi'], escena: 1 },
  { id: 'raving-energy', titulo: 'Raving Energy', artista: 'Kevin MacLeod', voces: ['miku', 'gumi'], escena: 0 },
  { id: 'movement-proposition', titulo: 'Movement Proposition', artista: 'Kevin MacLeod', voces: ['luka'], escena: 2 },
  { id: 'exit-the-premises', titulo: 'Exit the Premises', artista: 'Kevin MacLeod', voces: ['miku-hagane', 'una'], escena: 4 },
  { id: 'voltaic', titulo: 'Voltaic', artista: 'Kevin MacLeod', voces: ['miku-hagane', 'miku'], escena: 3 },
  { id: 'ouroboros', titulo: 'Ouroboros', artista: 'Kevin MacLeod', voces: ['una', 'luka'], escena: 6 },
  { id: 'volatile-reaction', titulo: 'Volatile Reaction', artista: 'Kevin MacLeod', voces: ['miku-akuma'], escena: 5, jefe: true }
];
const HISTORIA = [
  { cap: 'Prólogo · La primera nota', misiones: [
    { c: 'itty-bitty-8-bit', modo: 'carril', dif: 'facil', d: [['SONOLUZ', 'Señal detectada. Un Resonante nuevo entró al archivo.'], ['GUMI', '¡Por fin alguien! Esta canción se está borrando nota por nota. Toca cuando lleguen a la línea… y no las dejes ir.']] },
    { c: 'raving-energy', modo: 'flechas', dif: 'normal', d: [['GUMI', 'Miku quedó atrapada en un eco. Ella canta una frase y tú se la regresas, igualita.'], ['Hatsune Miku', '…¿me oyes? Si fallas la frase, la canción se rompe otra vez.']] } ] },
  { cap: 'Capítulo I · Ecos de GUMI', misiones: [
    { c: 'movement-proposition', modo: 'diva', dif: 'normal', d: [['Okurine Luka', 'No todas queremos que nos restauren, Resonante.'], ['GUMI', 'Luka es de los Desafinados. Sus símbolos llegan volando: toca el mismo botón cuando lleguen.']] },
    { c: 'exit-the-premises', modo: 'circulos', dif: 'dificil', d: [['Otomachi Una', 'Yo soy un Eco: una copia que nadie terminó. Si me sigues el ritmo, quizá me acuerde de quién era.']] },
    { c: 'voltaic', modo: 'carril', dif: 'experto', d: [['Hagane Miku', 'Los carriles ya no obedecen. Se doblan, se inclinan, cambian de número…'], ['GUMI', 'Es el Coro Nulo metiéndose al archivo. Lee el aviso cuando cambien las reglas.']] },
    { c: 'volatile-reaction', modo: 'exorcist', dif: 'exorcist', jefe: true, d: [['???', 'Todas las voces deberían sonar igual. Perfectas. Iguales.'], ['Miku Excomulgada', 'Yo soy el Coro Nulo. Demuestra que tu ritmo es tuyo… si puedes.']] } ] }
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
  { id: 'titulo:resonante', cat: 'titulo', nombre: 'Resonante', raro: 'c' }, { id: 'titulo:desafinado', cat: 'titulo', nombre: 'Desafinado', raro: 'r' },
  { id: 'titulo:eco', cat: 'titulo', nombre: 'Eco sin dueño', raro: 'e' }, { id: 'titulo:exorcista', cat: 'titulo', nombre: 'Exorcista', raro: 'l' }, { id: 'titulo:sonoluz', cat: 'titulo', nombre: 'Voz de SONOLUZ', raro: 'm' }
];
const CATS = { voz: 'Voz', nota: 'Notas', golpe: 'Golpe', fondo: 'Fondo', titulo: 'Título' };

/* ── lo guardado ── */
const CLAVE = 'vstiles:v1';
const base = () => ({ nombre: '', color: 0, tiene: ['voz:gumi', 'voz:miku', 'voz:luka', 'nota:neon', 'golpe:flare', 'fondo:0', 'titulo:resonante'], puesto: { voz: 'voz:gumi', nota: 'nota:neon', golpe: 'golpe:flare', fondo: 'fondo:0', titulo: 'titulo:resonante' },
  ecos: 1500, sellos: 3, nivel: 1, xp: 0, record: {}, historia: {}, desfase: 0, desfaseVisual: 0, vel: 1, sonidoGolpe: true, mostrarDesvio: true, sinMov: false, pity: 0, visto: false, calibrado: false });
let Y = base(); try{ const g = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if(g) Y = { ...base(), ...g, puesto: { ...base().puesto, ...(g.puesto || {}) } }; }catch(e){}
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
aplicarCosmeticos();

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
  saltarIntro: () => { cortarIntro = true; }, aCalibrar, saltarCalib: () => { Y.calibrado = true; guardar(); menu(); }, seguir: () => { partida.alternarPausa(); }, reintentar: jugarDeNuevo, salirJuego: () => { partida.salir(); canciones(modoLista); }, libreVolver: () => canciones(modoLista) })[a]?.(); }

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
function aCalibrar(){ Y.nombre = ($('#nombre').value || 'Resonante').trim().slice(0, 16); guardar(); mostrar('calibrar'); }

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
    $('#calibNota').textContent = `Listo: ajuste de ${Y.desfase} ms. Lo puedes cambiar en Ajustes.`; setTimeout(menu, 1400); }
  else { $('#calibNota').textContent = 'Casi no tocaste. Inténtalo otra vez.'; }
  b.disabled = false; b.textContent = 'Otra vez';
});

/* ── el menú ── */
function barra(){ const T = OBJETOS.find(o => o.id === Y.puesto.titulo);
  $('#barra').innerHTML = `<div class="avatar">${(Y.nombre || 'R')[0].toUpperCase()}</div><div class="quien"><b>${esc(Y.nombre || 'Resonante')}</b><span>Nv. ${Y.nivel} · ${T ? T.nombre : ''}</span></div><div class="moneda"><i></i>${Y.ecos}</div><div class="moneda sello"><i></i>${Y.sellos}</div>`; }
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function menu(){ partida.salir(); mostrar('menu');
  /* el premio diario: 300 Ecos y un Sello la primera vez que se abre el juego cada día */
  const hoy = new Date().toISOString().slice(0, 10); if(Y.diario !== hoy){ Y.diario = hoy; Y.ecos += 300; Y.sellos += 1; guardar(); setTimeout(() => aviso('Premio del día: +300 Ecos y +1 Sello'), 600); }
  barra(); await escena.ponerCantantes([idVoz()]); }

/* ── canciones ── */
let modoLista = 'libre', modoSel = 'carril', difSel = 'dificil', cancionSel = CANCIONES[0].id, ultima = null;
async function canciones(cual){ modoLista = cual; mostrar('canciones'); $('#cancionesT').textContent = cual === 'reto' ? 'EXÓRCIST Challenge' : 'Juego libre';
  if(cual === 'reto'){ modoSel = 'exorcist'; if(!['experto', 'exorcist'].includes(difSel)) difSel = 'exorcist'; }
  const md = $('#modos'); md.innerHTML = ''; Object.entries(MODOS).forEach(([k, m]) => { if(cual === 'reto' && k !== 'exorcist') return; const b = document.createElement('button'); b.textContent = m.nombre; b.className = k === modoSel ? 'si' : ''; b.onclick = () => { modoSel = k; canciones(cual); }; md.appendChild(b); });
  await listaPropia; if(!CANCIONES.some(x => x.id === cancionSel)) cancionSel = CANCIONES[0].id;
  const L = $('#lista'), filtro = quitarAcentos($('#buscaCancion').value.trim()); L.innerHTML = '';
  $('#buscaCancion').hidden = CANCIONES.length < 12;
  const propias = CANCIONES.filter(c => c.propia).length;
  for(const [titulo, grupo] of [['De la casa', CANCIONES.filter(c => !c.propia)], [`Mi música · ${propias}`, CANCIONES.filter(c => c.propia)]]){
    const vis = grupo.filter(c => !filtro || quitarAcentos(c.titulo + ' ' + c.artista).includes(filtro)); if(!vis.length) continue;
    if(propias){ const h = document.createElement('h4'); h.className = 'ojo grupo'; h.textContent = titulo; L.appendChild(h); }
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
  escena.ponerCantantes(c.voces);
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
$('#buscaCancion').addEventListener('input', () => canciones(modoLista));
$('#jugarB').addEventListener('click', () => jugar(cancionSel, modoSel, difSel));

/* ── jugar ── */
async function jugar(id, modo, dif, deHistoria = null){
  const c = CANCIONES.find(x => x.id === id) || ultima?.c, an = await datos(c.id), buf = await audio(c.id);
  const carta = armarCarta(an, c, modo, dif); ultima = { c, modo, dif, deHistoria };
  await escena.ponerCantantes(modo === 'flechas' ? [idVoz(), c.voces.find(v => v !== idVoz()) || 'miku'] : [...new Set([idVoz(), ...c.voces])].slice(0, 3));
  mostrar(null); $('#sombra').style.opacity = 0;
  partida.empezar(c, carta, an, buf, { autoJuego: $('#opAuto').checked, vel: Y.vel, ritmo: $('#opPract').checked ? .75 : 1 });
  Y.sinMorir = $('#opSin').checked || $('#opPract').checked;
  $('#pausaB').classList.add('vis');
  cuenta(carta);
}
function cuenta(carta){ const el = $('#cuenta'); el.classList.add('vis'); const primero = carta.notas[0]?.t ?? 2;
  (function paso(){ const t = reloj.ahora(), falta = Math.min(primero, 0) - t; if(!partida.corriendo || t > Math.min(primero, 0) - .1 && t > -.4){ el.classList.remove('vis'); return; } el.textContent = t < -2 ? '3' : t < -1 ? '2' : '1'; requestAnimationFrame(paso); })(); }
$('#pausaB').addEventListener('click', () => partida.alternarPausa());
function jugarDeNuevo(){ partida.salir(); if(ultima) jugar(ultima.c.id, ultima.modo, ultima.dif, ultima.deHistoria); }

/* ── resultados ── */
function resultados({ cancion, carta, J, murio, auto }){
  $('#pausaB').classList.remove('vis'); mostrar('resultados');
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
  if(!auto){ const k = `${cancion.id}|${carta.modo}|${carta.dif}`, ant = Y.record[k]; if(!ant || J.puntaje > ant.puntaje) Y.record[k] = { puntaje: J.puntaje, rango: r, precision: +J.precision.toFixed(2), combo: J.comboMax, fc: J.fc, ap: J.ap };
    const primera = !ant && !murio && J.puntaje >= 600000;
    const gana = Math.round(J.puntaje / 10000) + (J.fc ? 40 : 0) + (J.ap ? 80 : 0) + (carta.dif === 'exorcist' ? 60 : 0) + (primera ? 100 : 0); Y.ecos += gana; Y.xp += gana; while(Y.xp >= Y.nivel * 120){ Y.xp -= Y.nivel * 120; Y.nivel++; Y.sellos++; }
    if(ultima?.deHistoria && !murio && J.puntaje >= 600000){ Y.historia[ultima.deHistoria] = true; if(ultima.c.jefe) { Y.sellos += 5; if(!Y.tiene.includes('voz:miku-akuma')){ Y.tiene.push('voz:miku-akuma'); setTimeout(() => aviso('Venciste al Coro Nulo: Miku Excomulgada ya es tuya.'), 2200); } } }
    guardar(); setTimeout(() => aviso(`+${gana} Ecos`), 900); sonidos.premio && reloj.golpe(sonidos.premio, .4); }
}

/* ── historia ── */
function historia(){ mostrar('historia'); const H = $('#capitulos'); H.innerHTML = ''; let abierto = true;
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
  OBJETOS.filter(o => o.cat === catSel).forEach(o => { const tiene = Y.tiene.includes(o.id), b = document.createElement('button'); b.className = `obj raro-${o.raro}${tiene ? '' : ' bloq'}${Y.puesto[o.cat] === o.id ? ' puesto' : ''}`;
    const muestra = o.cat === 'golpe' ? `<img src="sprites/${o.sprite}.png" alt="">` : o.cat === 'fondo' ? `<img src="${o.img}" alt="" style="max-width:100%">` : o.cat === 'nota' ? o.colores.slice(0, 4).map(c => `<i style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c};margin:1px"></i>`).join('') : o.cat === 'voz' ? `<i style="font:900 26px var(--n);color:${o.color}">${o.nombre[0]}</i>` : `<i style="font:900 11px var(--g);color:#FFD7E5">«${o.nombre}»</i>`;
    b.innerHTML = `<div class="muestra">${muestra}</div>${o.nombre}<small style="display:block;font:700 10px var(--n);color:#ffffffcc">${RAREZA[o.raro].n.toUpperCase()}</small>`;
    b.onclick = async () => { if(!tiene){ aviso('Sale en el Mercado de Ecos.'); return; } Y.puesto[o.cat] = o.id; guardar(); aplicarCosmeticos(); if(o.cat === 'voz') await escena.ponerCantantes([idVoz()]); vestidor(); };
    O.appendChild(b); });
  if(catSel === 'voz') escena.ponerCantantes([idVoz()]);
}
function aplicarCosmeticos(){ const n = OBJETOS.find(o => o.id === Y.puesto.nota); if(n) n.colores.forEach((c, i) => COLORES_RIEL[i] = c);
  escena.piezas.rieles.forEach((R, i) => { R.fondoR.material.color.set(COLORES_RIEL[i]); R.lado.material.color.set(COLORES_RIEL[i]); R.rec.material.color.set(COLORES_RIEL[i]); R.brillo.material.color.set(COLORES_RIEL[i]); R.haz.material.color.set(COLORES_RIEL[i]); }); }

/* ── mercado: probabilidades a la vista, garantía a las 50 y los repetidos se vuelven Ecos ── */
function mercado(){ mostrar('mercado'); barra();
  $('#probas').innerHTML = Object.values(RAREZA).map(r => `${r.n} ${r.p} %`).join(' · ') + `<br>Legendario garantizado en ${50 - Y.pity} tiradas · repetido = Ecos de vuelta`; $('#tirada').innerHTML = ''; }
/* GRATIS: todo se paga con lo que se gana jugando (Carlos, 29 oct: «todo será gratuito con monedas del
   juego y progresión interna»). Ecos por cada partida, el premio diario, el bono de la primera vez y los
   Sellos de subir de nivel y de vencer jefes; un Sello es una tirada. */
function tirar(n, conSello = false){ const costo = n === 10 ? 900 : 100;
  if(conSello){ if(Y.sellos < 1){ aviso('No tienes Sellos: se ganan subiendo de nivel y venciendo jefes.'); return; } Y.sellos--; }
  else { if(Y.ecos < costo){ aviso('No te alcanzan los Ecos: juega una canción.'); return; } Y.ecos -= costo; } const sale = [];
  for(let i = 0; i < n; i++){ Y.pity++; let r = Math.random() * 100, raro = 'c'; for(const [k, v] of Object.entries(RAREZA).reverse()){ if(r < v.p){ raro = k; break; } r -= v.p; }
    if(Y.pity >= 50 && !['l', 'm'].includes(raro)) raro = 'l'; if(['l', 'm'].includes(raro)) Y.pity = 0;
    const pool = OBJETOS.filter(o => o.raro === raro), o = pool[Math.floor(Math.random() * pool.length)]; const nuevo = !Y.tiene.includes(o.id); if(nuevo) Y.tiene.push(o.id); else Y.ecos += { c: 10, r: 25, e: 60, l: 150, m: 300 }[raro]; sale.push({ o, nuevo }); }
  guardar(); mercado(); const T = $('#tirada'); sale.forEach(({ o, nuevo }, i) => { const d = document.createElement('div'); d.className = `obj raro-${o.raro}`; d.style.animationDelay = i * .08 + 's'; d.innerHTML = `${o.nombre}<small style="display:block;font:700 10px var(--n)">${nuevo ? 'NUEVO' : 'REPETIDO'}</small>`; T.appendChild(d); });
  if(sale.some(s => ['l', 'm'].includes(s.o.raro))){ sonidos.premio && reloj.golpe(sonidos.premio, .6); aviso('¡' + sale.find(s => ['l', 'm'].includes(s.o.raro)).o.nombre + '!'); } }
$('#tira1').addEventListener('click', () => tirar(1)); $('#tira10').addEventListener('click', () => tirar(10)); $('#tiraS').addEventListener('click', () => tirar(1, true));

/* ── récords, ajustes, créditos ── */
function records(){ mostrar('records'); const L = $('#recordsL'), ks = Object.entries(Y.record).sort((a, b) => b[1].puntaje - a[1].puntaje);
  L.innerHTML = ks.length ? ks.map(([k, r]) => { const [c, m, d] = k.split('|'); return `<div class="fila"><div class="mini" style="background-image:url(escenarios/${ESCENARIOS[CANCIONES.find(x => x.id === c)?.escena ?? 0].id}.jpg)"></div><div><b>${CANCIONES.find(x => x.id === c)?.titulo || c}</b><span>${MODOS[m]?.nombre} · ${DIFS.find(x => x.id === d)?.nombre} · ${r.precision} %${r.ap ? ' · AP' : r.fc ? ' · FC' : ''}</span></div><div class="mejor">${r.rango}<br>${r.puntaje}</div></div>`; }).join('') : '<p class="sub">Todavía no hay partidas. Ve a Juego libre.</p>'; }
function ajustes(){ mostrar('ajustes'); const A = $('#ajustesL');
  const fila = (k, nom, min, max, paso, uni, txt) => `<div class="ajuste"><span>${nom}</span><b id="v_${k}">${Y[k]}${uni}</b><input type="range" min="${min}" max="${max}" step="${paso}" value="${Y[k]}" data-k="${k}" data-u="${uni}"><small>${txt}</small></div>`;
  const tog = (k, nom, txt) => `<label class="ajuste"><span>${nom}</span><input type="checkbox" data-t="${k}" ${Y[k] ? 'checked' : ''}><small>${txt}</small></label>`;
  A.innerHTML = fila('desfase', 'Sincronía del audio', -250, 250, 1, ' ms', 'Si siempre vas tarde, súbelo; si vas antes, bájalo. La calibración lo pone sola.') + fila('desfaseVisual', 'Sincronía visual', -100, 100, 1, ' ms', 'Si las notas se ven llegar antes o después del sonido.')
    + fila('vel', 'Velocidad de las notas', .5, 2.5, .05, '×', 'Sólo cambia qué tan rápido se ven; la canción y los tiempos no cambian.')
    + tog('sonidoGolpe', 'Sonido al acertar', 'Un golpe corto con cada nota.') + tog('mostrarDesvio', 'Mostrar «antes» / «tarde»', 'Los milisegundos de cada toque, debajo del juicio.')
    + '<div class="pie" style="background:none"><button class="b" id="recalibrar">Calibrar otra vez</button></div>';
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
