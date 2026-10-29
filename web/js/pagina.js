/* LO QUE SE MUEVE EN LA PÁGINA (fuera del 3D): las entradas al hacer scroll, la barra que se pega, el
   menú del teléfono, los seis servicios, «Arma tu proyecto» (la calculadora que manda el pedido por
   WhatsApp), la lista de precios, los videos que se reproducen al verse y la línea de los pasos.
   Los precios salen de aquí y de empresa/servicios/servicios.html: si cambia uno, se cambian los dos. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
document.body.classList.remove('no-js');
const WA = '524428833786', wa = (txt) => `https://wa.me/${WA}?text=${encodeURIComponent(txt)}`;
const pesos = (n) => '$' + Math.round(n).toLocaleString('es-MX');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ICO = {
  web: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  app: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  gestion: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  tiempo: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
  marketing: '<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M8 6v8M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 10.5"/>'
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="#C77DFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;

/* los seis servicios en tres grupos: la base, los procesos y la imagen (la taxonomía de Carlos) */
const GRUPOS = [
  ['La base', [['web', 'Páginas web', 'Creamos espacios digitales que representan tu negocio, generan confianza y convierten visitas en oportunidades.', 'desde $2,000'],
               ['app', 'Software y apps', 'Construimos sistemas que eliminan obstáculos, conectan procesos y se adaptan a la forma en que realmente trabaja tu empresa.', 'desde $10,000']]],
  ['Los procesos', [['gestion', 'Gestión de negocios', 'Organizamos la información, los procesos y la operación para que puedas tomar decisiones con claridad y control.', 'desde $3,000'],
                    ['tiempo', 'Tiempos y movimientos', 'Medimos cómo trabaja tu empresa para encontrar el tiempo que se está perdiendo — y devolvértelo.', 'desde $3,000']]],
  ['La imagen', [['marketing', 'Marketing', 'Diseñamos estrategias que atraen a las personas correctas y convierten el interés en crecimiento.', 'desde $1,500/mes'],
                 ['video', 'Video y fotografía', 'Capturamos la esencia de tu marca para que cada imagen comunique el valor de lo que haces antes de decir una sola palabra.', '2 videos $1,200']]]];
$('#grupos').innerHTML = GRUPOS.map(([g, ss]) => `<div class="grupo revela"><h3 class="sube">${g}</h3><div class="pareja">${ss.map(([k, n, d, p]) =>
  `<article class="serv sube"><span class="ic">${svg(k)}</span><h4>${n}</h4><p>${d}</p><span class="desde">${p}</span></article>`).join('')}</div></div>`).join('');

/* arma tu proyecto: [nombre, precio único, precio al mes, ¿es presencial?] */
const OPS = [['Página Esencial', 2000], ['Página Completa (+2 videos)', 6500], ['Página a la medida', 9000], ['Tienda en línea', 12000], ['App o sistema', 10000],
  ['Logotipo', 1800], ['Identidad de marca', 4500], ['2 videos para redes', 1200], ['Grabamos en tu negocio + 2 videos', 2900, 0, true], ['Sesión de fotos', 1500, 0, true],
  ['Menú digital con QR', 900], ['Manejo de redes', 0, 2900], ['Publicidad en Facebook e Instagram', 0, 1500], ['Mantenimiento Plus', 0, 650], ['Diagnóstico de tiempos y movimientos', 3000, 0, true]];
const elegidos = new Set();
$('#opciones').innerHTML = OPS.map(([n, p, m], i) => `<button class="op" type="button" aria-pressed="false" data-i="${i}">${n} <small>${p ? pesos(p) : pesos(m) + '/mes'}</small></button>`).join('');
let mostrado = 0;
function cuenta(){
  const sel = [...elegidos].map(i => OPS[i]), uno = sel.reduce((a, o) => a + (o[1] || 0), 0), mes = sel.reduce((a, o) => a + (o[2] || 0), 0);
  /* el número sube o baja contando, no salta */
  const desde = mostrado, t0 = performance.now(), dur = quieto ? 0 : 500;
  const paso = (ahora) => { const u = dur ? Math.min(1, (ahora - t0) / dur) : 1, v = desde + (uno - desde) * (1 - Math.pow(1 - u, 3)); $('#cifra').innerHTML = `<small>$</small>${Math.round(v).toLocaleString('es-MX')}`; if(u < 1) requestAnimationFrame(paso); else mostrado = uno; };
  requestAnimationFrame(paso);
  $('#mes').textContent = !sel.length ? 'Elige al menos un servicio.' : mes ? `+ ${pesos(mes)} al mes` : 'Pago único: 50% al empezar y 50% al entregar.';
  $('#nota').textContent = sel.some(o => o[3]) ? 'Lo presencial es dentro de Querétaro; fuera, en casos especiales y con viáticos a cargo del cliente.' : 'Precios en pesos. Las páginas incluyen 3 meses de mantenimiento.';
  $('#mandar').href = wa(sel.length ? `Hola, quiero cotizar con Grupo Mazi:\n${sel.map(o => '• ' + o[0]).join('\n')}\nDesde ${pesos(uno)}${mes ? ' + ' + pesos(mes) + ' al mes' : ''}` : 'Hola, quiero cotizar con Grupo Mazi');
}
$('#opciones').addEventListener('click', (e) => { const b = e.target.closest('.op'); if(!b) return; const i = +b.dataset.i;
  elegidos.has(i) ? elegidos.delete(i) : elegidos.add(i); b.setAttribute('aria-pressed', elegidos.has(i)); cuenta(); });
cuenta();

/* el resto de los precios */
const MAS = [['Tienda en línea', 'Carrito, pagos e inventario', 'desde $12,000'], ['Mantenimiento', 'Tu página siempre al día', 'desde $450/mes'], ['Apps y sistemas', 'Sencillo · medio · avanzado', 'desde $10,000'],
  ['2 videos para redes', 'De unos 30 segundos', '$1,200'], ['Grabamos en tu negocio + 2 videos', 'Hasta 2 horas, en Querétaro', '$2,900'], ['Comercial con voz', 'Hasta 60 segundos', '$2,500'],
  ['Sesión de fotos', '2 horas, 20 fotos editadas', '$1,500'], ['Logotipo', 'Tres propuestas', '$1,800'], ['Identidad de marca', 'Logo, colores, letra y papelería', '$4,500'],
  ['Diseño gráfico', 'Flyer, cartel o publicación', 'desde $250'], ['Menú digital con QR', 'Tu carta en el celular', '$900'], ['Manejo de redes', '12 publicaciones al mes', '$2,900/mes']];
$('#masPrecios').innerHTML = MAS.map(([q, d, v]) => `<div class="fila sube"><span>${q}<small>${d}</small></span><b>${v.replace('/mes', '<small> /mes</small>')}</b></div>`).join('');

/* los videos: se reproducen callados cuando se ven; el botón les da sonido */
const VIDS = [['video/nueva-imagen.mp4', 'Nueva imagen'], ['video/la-plantilla.mp4', 'La plantilla'], ['video/la-historia-de-mary.mp4', 'La historia de Mary']];
$('#listaVideos').innerHTML = VIDS.map(([src, n]) => `<figure class="vid sube"><video muted playsinline loop preload="none" data-src="${src}" poster="${src.replace('.mp4', '.jpg')}"></video><figcaption>${n}</figcaption><button class="son" type="button" aria-label="Activar el sonido"><svg aria-hidden="true"><use href="#i-mudo"/></svg></button></figure>`).join('');
const verVid = new IntersectionObserver((es) => es.forEach(({ target: v, isIntersecting }) => {
  if(isIntersecting){ if(!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { threshold: .45 });
$$('.vid video').forEach(v => verVid.observe(v));
$('#listaVideos').addEventListener('click', (e) => { const b = e.target.closest('.son'); if(!b) return; const v = b.parentElement.querySelector('video');
  $$('.vid video').forEach(o => { if(o !== v){ o.muted = true; o.parentElement.querySelector('.son use').setAttribute('href', '#i-mudo'); } });
  v.muted = !v.muted; if(!v.src) v.src = v.dataset.src; v.play().catch(() => {}); b.querySelector('use').setAttribute('href', v.muted ? '#i-mudo' : '#i-son'); b.setAttribute('aria-label', v.muted ? 'Activar el sonido' : 'Quitar el sonido'); });

/* los mensajes de WhatsApp de cada botón */
$$('[data-wa]').forEach(a => a.href = wa(a.dataset.wa));

/* las entradas: cada bloque «revela» se enciende al verse, una vez */
const ver = new IntersectionObserver((es) => es.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visto'); ver.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
$$('.revela').forEach(el => ver.observe(el));
requestAnimationFrame(() => { $('.portada .revela').classList.add('visto'); document.body.classList.add('cargado'); });

/* la barra se pega con fondo al bajar; el botón flotante de WhatsApp sale pasando la portada */
const alBajar = () => { const y = scrollY; $('#barra').classList.toggle('pegada', y > 30); $('#waFlota').classList.toggle('ve', y > innerHeight * .9);
  /* la línea de los pasos crece con el scroll (no lo secuestra: sólo responde a dónde estás) */
  const p = $('#pasos').getBoundingClientRect(), u = Math.min(1, Math.max(0, (innerHeight * .6 - p.top) / p.height));
  $('#avance').style.height = (u * (p.height - 56)) + 'px';
  $$('#pasos .paso').forEach((el, i, a) => el.classList.toggle('on', u >= i / a.length + .02)); };
addEventListener('scroll', alBajar, { passive: true }); alBajar();

/* el menú del teléfono */
const menu = $('#menu'), abrir = (si) => { if(si){ menu.hidden = false; requestAnimationFrame(() => menu.classList.add('abierto')); } else { menu.classList.remove('abierto'); setTimeout(() => menu.hidden = true, 450); }
  $('#abrirMenu').setAttribute('aria-expanded', si); document.body.style.overflow = si ? 'hidden' : ''; };
$('#abrirMenu').addEventListener('click', () => abrir(true)); $('#cerrarMenu').addEventListener('click', () => abrir(false));
$$('#menu a').forEach(a => a.addEventListener('click', () => abrir(false)));
addEventListener('keydown', (e) => { if(e.key === 'Escape' && !menu.hidden) abrir(false); });
