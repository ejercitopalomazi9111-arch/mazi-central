/* Arma moka/index.html.
     node moka/taller/armar.mjs

   Aquí NO se empotra nada en base64: son siete imágenes y cuatro fuentes, y
   meterlas en el HTML impediría que el navegador las cachee por separado y que
   las de abajo se carguen tarde. Es un sitio normal de varios archivos — la
   decisión contraria a la de la lámina, y a propósito: no todo lo que se
   publica quiere ser un archivo suelto. */
import { readFileSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const AQUI = dirname(new URL(import.meta.url).pathname);
const RAIZ = join(AQUI, '..');
/* ⚠ EL CSS Y EL MOTOR SE COPIAN AQUÍ, NO A MANO. La primera vez los copié yo
   con un `cp` y el sitio publicado se quedó con la versión anterior del CSS
   durante una tarde: el generador decía «armado» y no era verdad. Lo que el
   generador no copia, no existe. */
for(const f of ['estilo.css','motor.js']) cpSync(join(AQUI,f), join(RAIZ,f));
mkdirSync(join(RAIZ,'fuentes'), { recursive:true });
cpSync(join(AQUI,'fuentes'), join(RAIZ,'fuentes'), { recursive:true });

const cuerpo = readFileSync(join(AQUI,'cuerpo.html'),'utf8');

const html = `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>La cafetera · tres piezas, una rosca y nada de electricidad</title>
<meta name="description" content="Página de producto sobre la cafetera moka: sus tres piezas, qué pasa dentro mientras el café sube, los tamaños de verdad y las cinco cosas que la estropean. Pieza de práctica del departamento de diseño de Grupo Mazi.">
<meta name="theme-color" content="#140D08">
<link rel="icon" href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23140D08"/><path d="M8 20 h16 l2 8 H6 z" fill="%23F2A63B"/><path d="M11 6 h10 v12 H11 z" fill="%23D4C4B2"/></svg>'>
<link rel="stylesheet" href="estilo.css">
<link rel="preload" as="image" href="img/jarra.webp">
<link rel="preload" as="image" href="img/caldera.webp">
</head>
<body>
${cuerpo}
<script src="motor.js" defer></script>
</body>
</html>
`;
writeFileSync(join(RAIZ,'index.html'), html);
console.log(`la cafetera · ${(html.length/1024).toFixed(0)} KB de HTML`);
