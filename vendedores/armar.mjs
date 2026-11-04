/* LA PÁGINA DE LOS VENDEDORES: un solo link con todo lo que se le manda a un cliente (Carlos, 4 nov:
   «dame los links de cada cosa para poder mandarlos a mis vendedores»). Lee lo que haya en img/ y
   videos/ y arma index.html; los demos se leen de la lista de abajo.
     node vendedores/armar.mjs
   Los videos van en videos/<anuncio>.mp4, a 720×1280 y abajo de 20 MB (Cloudflare no sirve archivos de
   más de 25 MB): node vendedores/armar.mjs --videos los saca de marca/anuncios/salida. */
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const AQUI = path.dirname(new URL(import.meta.url).pathname), RAIZ = path.join(AQUI, '..');
const BASE = 'https://mazi-central.palomazi9111.workers.dev';

const VIDEOS = [
  ['17-barberias', 'Páginas para barberías', 'Las 4 páginas y los paquetes con publicidad'],
  ['01-no-somos-una-agencia-mas', 'No somos una agencia más', 'El golpe principal, 30 s'],
  ['03-trabajo-real', 'Trabajo real', 'Tres trabajos nuestros funcionando'],
  ['07-la-plantilla', 'La plantilla barata contra la nuestra', 'Por qué no una plantilla'],
  ['06-cinco-senales', '5 señales de que tu negocio ya necesita página', 'Para abrir plática'],
  ['05-mi-sobrino', 'Mi sobrino sabe de computadoras', 'El gracioso'],
  ['02-lo-que-hacemos', 'Lo que hacemos', 'Los seis servicios, el largo'],
  ['10-la-historia-de-mary', 'La historia de Mary', 'Por qué un solo equipo y no tres'],
  ['11-corporativo', 'Corporativo', 'El formal, para empresas'],
  ['14-a-la-medida', 'A la medida', 'Formal, de producto'],
  ['15-un-solo-equipo', 'Un solo equipo', 'Formal, los tres servicios grandes'],
  ['12-al-ritmo', 'Al ritmo', 'El rápido'],
  ['13-en-movimiento', 'En movimiento', 'Para presumir animación'],
  ['16-grupo-mazi', 'Grupo Mazi · de un dibujo a lo real', 'El de 2 minutos'],
];
/* videos de clientes: se suben igual pero NO salen en la página de vendedores (el link se le pasa a Carlos) */
const CLIENTES = [['18-geraldmed-tu-evento'], ['19-geraldmed-pie-tierra'], ['20-geraldmed-ambulancia'], ['21-geraldmed-elegidos']];
const DEMOS = [
  ['Barberías · las 4 juntas', '/barberias/', 'Para que el barbero escoja nivel'],
  ['Barbería Esencial · Don Chuy', '/barberias/sencilla/', 'Desde $2,000'],
  ['Barbería Completa urbana · Navaja Norte', '/barberias/navaja/', 'Desde $6,500'],
  ['Barbería Completa clásica · Casa Brava', '/barberias/casa-brava/', 'Desde $6,500'],
  ['Barbería A la medida · Obsidiana', '/barberias/obsidiana/', 'Desde $9,000'],
  ['Pizzería completa · Smiley’s', '/smileys/', 'Cliente real: la Completa'],
  ['Pizzería básica · Smiley’s', '/smileys/basica/', 'La Esencial'],
  ['Menú digital con pedido por WhatsApp · District Roll', '/district-roll/', 'Restaurante'],
  ['Página de Grupo Mazi', '/web/', 'Quiénes somos y precios'],
];

if (process.argv.includes('--videos')) {
  for (const [id] of [...VIDEOS, ...CLIENTES]) {
    const src = path.join(RAIZ, 'marca/anuncios/salida', id + '.mp4'), out = path.join(AQUI, 'videos', id + '.mp4');
    if (!fs.existsSync(src)) { console.log('· falta', id); continue; }
    /* un video armado antes del último cambio al cierre del logo todavía trae el logo viejo: no se sube */
    if (fs.statSync(src).mtimeMs < fs.statSync(path.join(RAIZ, 'marca/anuncios/logo3d.js')).mtimeMs) { console.log('· viejo', id); continue; }
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(src).mtimeMs) continue;
    let dur; try{ dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()); }catch(e){ console.log('· a medias', id); continue; }
    const kbps = Math.min(2600, Math.floor(19 * 8192 / dur) - 128);     /* que quepa en 19 MB */
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', 'scale=720:1280', '-c:v', 'libx264', '-preset', 'medium', '-b:v', kbps + 'k', '-maxrate', kbps * 1.3 + 'k', '-bufsize', kbps * 2 + 'k',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
    console.log('✓', id, (fs.statSync(out).size / 1048576).toFixed(1), 'MB');
  }
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fila = (t, sub, url, extra = '') => `<li class="fila"><div><b>${esc(t)}</b><small>${esc(sub)}</small></div>${extra}<div class="acc"><a class="btn" href="${url}" target="_blank" rel="noopener">Abrir</a><button class="btn" data-copia="${url}">Copiar link</button></div></li>`;
const vids = VIDEOS.filter(([id]) => fs.existsSync(path.join(AQUI, 'videos', id + '.mp4')));
const imgs = fs.readdirSync(path.join(AQUI, 'img')).filter(f => f.endsWith('.webp')).sort();
const nombreImg = (f) => f.startsWith('poster') ? 'Póster ' + f.match(/\d+/)[0] : f.startsWith('flyer') ? 'Flyer ' + f.match(/\d+/)[0] : 'Anuncio general';

const html = `<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Grupo Mazi · Para vendedores</title>
<link rel="icon" href="../web/img/paloma.svg" type="image/svg+xml">
<style>
:root{ --fondo:#170A26; --capa:#241036; --linea:#ffffff1a; --tinta:#F4EEF2; --gris:#B9AFC4; --vino:#7E1735; --acento:#C77DFF }
*{ box-sizing:border-box } body{ margin:0; background:var(--fondo); color:var(--tinta); font:16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif }
.env{ max-width:760px; margin:0 auto; padding:0 16px 64px }
header{ padding:28px 0 8px } header img{ height:44px; display:block } h1{ font-size:30px; line-height:1.1; margin:18px 0 6px }
header p{ color:var(--gris); margin:0 }
h2{ font-size:13px; letter-spacing:.2em; text-transform:uppercase; color:var(--acento); margin:36px 0 10px }
ul{ list-style:none; margin:0; padding:0; display:grid; gap:10px }
.fila{ display:flex; gap:12px; align-items:center; padding:14px 16px; background:var(--capa); border:1px solid var(--linea); border-radius:16px }
.fila > div:first-child{ flex:1; min-width:0 } .fila b{ display:block; font-size:16px } .fila small{ color:var(--gris); font-size:14px }
.acc{ display:flex; gap:8px; flex-shrink:0 }
.btn{ font:inherit; font-size:14px; font-weight:700; min-height:44px; padding:0 14px; display:inline-flex; align-items:center; border-radius:12px; border:1px solid #ffffff2e; background:transparent; color:var(--tinta); text-decoration:none; cursor:pointer }
.btn:first-child{ background:var(--vino); border-color:var(--vino) } .btn:focus-visible{ outline:3px solid var(--acento); outline-offset:2px }
.btn.si{ background:#1f7a46; border-color:#1f7a46 }
.mini{ width:56px; height:70px; object-fit:cover; border-radius:8px; flex-shrink:0 }
.principal{ padding:18px; border-color:var(--acento) }
@media (max-width:520px){ .fila{ flex-wrap:wrap } .acc{ width:100% } .acc .btn{ flex:1; justify-content:center } }
footer{ margin-top:40px; color:var(--gris); font-size:14px }
</style></head><body><div class="env">
<header><img src="../web/img/logo.svg" alt="Grupo Mazi" width="182" height="44"><h1>Para vendedores</h1>
<p>Todo lo que se le manda a un cliente. «Copiar link» y lo pegas en WhatsApp.</p></header>
<h2>Cotización</h2><ul>${fila('Cotización 2026 (PDF)', 'Precios de todo, 4 hojas. Se ve bien en iPhone', BASE + '/web/Grupo-Mazi-cotizacion-2026.pdf').replace('class="fila"', 'class="fila principal"')}</ul>
<h2>Páginas de muestra</h2><ul>${DEMOS.map(([t, u, s]) => fila(t, s, BASE + u)).join('')}</ul>
<h2>Videos</h2><ul>${vids.length ? vids.map(([id, t, s]) => fila(t, s + ' · ' + (fs.statSync(path.join(AQUI, 'videos', id + '.mp4')).size / 1048576).toFixed(0) + ' MB', BASE + '/vendedores/videos/' + id + '.mp4')).join('') : '<li class="fila"><div><b>Se están preparando</b><small>En un rato aparecen aquí</small></div></li>'}</ul>
<h2>Pósters y flyers</h2><ul>${imgs.map(f => fila(nombreImg(f), 'Imagen para redes o estados', BASE + '/vendedores/img/' + f, `<img class="mini" src="img/${f}" alt="" loading="lazy">`)).join('')}</ul>
<footer>Grupo Mazi · WhatsApp 442 883 3786 · grupomazi.oficial@gmail.com</footer>
</div>
<script>
document.addEventListener('click', async (e) => { const b = e.target.closest('[data-copia]'); if(!b) return;
  try{ await navigator.clipboard.writeText(b.dataset.copia); b.textContent = 'Copiado'; b.classList.add('si'); setTimeout(() => { b.textContent = 'Copiar link'; b.classList.remove('si'); }, 1800); }
  catch(x){ prompt('Copia el link:', b.dataset.copia); } });
</script></body></html>
`;
fs.writeFileSync(path.join(AQUI, 'index.html'), html);
console.log('✓ index.html ·', vids.length, 'videos ·', imgs.length, 'imágenes');
