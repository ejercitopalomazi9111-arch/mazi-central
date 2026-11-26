/* El navegador de Mazi VR (web.js): limpiar una página, interpretar lo que se escribe y los candados.
     node sala/servidor/pruebas-web.mjs */
import { limpiar, interpretar, navegar, aProxy } from './web.js';
let ok = 0, mal = 0; const sí = (c, t) => { c ? ok++ : mal++; console.log(c ? '✓' : '✗', t); };
const base = 'https://ejemplo.org/notas/hoy.html';
const html = `<html><head><title>Hola</title><script>alert(1)</script><script src="x.js"></script><meta http-equiv="refresh" content="0;url=https://malo.com">
<link rel="stylesheet" href="/estilo.css"><style>body{background:url(fondo.png)}</style></head>
<body onload="robar()"><a href="otra.html" target="_blank" onclick="x()">Otra</a> <a href="#arriba">arriba</a> <a href="javascript:alert(1)">mala</a>
<img src="foto.jpg" srcset="a.jpg 1x, /b.jpg 2x" onerror="x()"><iframe src="https://anuncio.com"></iframe><noscript><p>Sin JS</p></noscript>
<form action="/buscar" method="post"><input name="q"><button>Ir</button></form></body></html>`;
const s = limpiar(html, base);
sí(!/<script/i.test(s) && !/onload=|onclick=|onerror=/i.test(s) && !/javascript:/i.test(s), 'sin scripts, sin on…=, sin javascript:');
sí(!/<iframe/i.test(s) && !/http-equiv="?refresh/i.test(s), 'sin marcos ni redirecciones automáticas');
sí(s.includes(`href="${aProxy('https://ejemplo.org/notas/otra.html')}"`.replace(/&/g, '&amp;')) && !/target=/.test(s), 'los enlaces pasan por la puerta (absolutos) y sin abrir ventanas nuevas');
sí(s.includes('href="#arriba"'), 'los enlaces dentro de la misma página se quedan');
sí(s.includes('src="https://ejemplo.org/notas/foto.jpg"') && s.includes('https://ejemplo.org/b.jpg 2x') && s.includes('href="https://ejemplo.org/estilo.css"') && s.includes('url("https://ejemplo.org/notas/fondo.png")'), 'imágenes, srcset, estilos y url() van directo a su sitio, completos');
sí(/<p>Sin JS<\/p>/.test(s) && !/noscript/i.test(s), 'lo de «sin JavaScript» se ve');
sí(/data-mazi-accion="https:\/\/ejemplo\.org\/buscar"/.test(s) && /method="get"/.test(s) && /name="u" value="https:\/\/ejemplo\.org\/buscar"/.test(s), 'los formularios llevan su acción original y van por la puerta');
sí(interpretar('wikipedia.org') === 'https://wikipedia.org' && interpretar('https://x.com/a') === 'https://x.com/a' && /duckduckgo\.com\/html\/\?q=mariposa%20monarca/.test(interpretar('mariposa monarca')), 'lo que se escribe: dirección o búsqueda');
const pide = (u, h = {}) => navegar(new URL('https://sala.palomazi9111.workers.dev/api/sala/vr/web?u=' + encodeURIComponent(u)), new Request('https://x/', { headers: h }));
sí((await pide('https://ejemplo.org')).status === 403, 'sin venir de Mazi VR, no (no es un proxy abierto)');
const r = await pide('http://127.0.0.1:8080/', { referer: 'https://mazi-central.palomazi9111.workers.dev/vr/' }); sí(/no se puede abrir/i.test(await r.text()), 'direcciones internas, no');
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
