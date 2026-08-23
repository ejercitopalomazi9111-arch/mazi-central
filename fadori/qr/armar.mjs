/* ══════════════════════════════════════════════════════════════════════════
   Los códigos QR de Fadori · `node armar.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Se generan AQUÍ y se guardan como SVG en el repo. No se piden a ningún
   servicio de códigos QR: la regla §2 de la casa dice conectar sí, depender
   no, y un generador de QR es justo la clase de cosa que un día empieza a
   cobrar o se cae con doscientos alumnos apuntando el teléfono.

   La librería corre en nuestra máquina y sólo al construir. En el sitio
   publicado no queda ni una dependencia: son dos archivos SVG.
   ═════════════════════════════════════════════════════════════════════════ */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const QR = require('qrcode');

const CASA = 'https://mazi-central.palomazi9111.workers.dev/fadori/';

const CODIGOS = [
  ['abrir',    CASA,                  'Abrir Fadori'],
  ['instalar', CASA + 'instalar.html','Ponerla en la pantalla de inicio'],
];

for(const [nombre, url, que] of CODIGOS){
  /* Nivel de corrección M: aguanta que el papel se ensucie o se doble, que es
     lo que le va a pasar pegado en la pared de una cafetería. Y margen 2, el
     mínimo que la norma pide para que la cámara encuentre el código. */
  const svg = await QR.toString(url, {
    type: 'svg', errorCorrectionLevel: 'M', margin: 2, width: 1024,
    color: { dark: '#2E1B10', light: '#FFFDF9' },   // café sobre papel, no negro sobre blanco
  });
  writeFileSync(nombre + '.svg', svg);
  console.log('✓', nombre + '.svg', '·', que, '→', url);
}
