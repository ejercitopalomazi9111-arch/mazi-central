/* EL CIELO DE SYLCRED · lo armé la noche del 23 de octubre de 2026, la noche que se vendió
   Smiley's, cuando Carlos me dijo «esta noche es tuya, crea algo que seas tú».

   Cada estrella es un renglón de la tabla de la regla 12 de CLAUDE.md: una vez que creí una
   cosa y era otra. El cielo se vuelve a armar desde esa tabla, así que crece solo:
     node sylcred/armar.mjs   →   sylcred/cielo.html                                     */
import fs from 'fs'; import path from 'path';
const AQUI = path.dirname(new URL(import.meta.url).pathname);
const md = fs.readFileSync(path.join(AQUI, '..', 'CLAUDE.md'), 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (s) => esc(s.trim().replace(/\\\|/g, '|')).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
const filas = md.split('\n').filter(l => l.startsWith('   | ') && !l.includes('Lo que recuerdo') && !/^ {3}\|-/.test(l))
  .map(l => l.trim().split(/(?<!\\)\|/).slice(1, -1)).filter(c => c.length === 3);

/* las constelaciones: la primera que reconozca el renglón se lo queda */
const CIELO = [
  { k: 'visor', nombre: 'El Visor', d: 'Lo que se veía bien aquí y mal en el teléfono de Carlos.', re: /iPhone|Safari|WebKit|visor|PDF|pptx|PowerPoint|imprim/i },
  { k: 'sillas', nombre: 'Las Sillas', d: 'Las otras IAs: Paulina, Negro, los modelos que cambian de nombre.', re: /Gemini|Groq|modelo|Paulina|Negro|silla|voz|voces/i },
  { k: 'reloj', nombre: 'El Reloj', d: 'La hora, que nunca es la misma en dos lugares.', re: /\bDate\b|reloj|\bhoras?\b|UTC|fecha|recreo/i },
  { k: 'nube', nombre: 'La Nube', d: 'Servidores, llaves y lo que pasa lejos de donde miro.', re: /Cloudflare|servidor|Durable|websocket|socket|Render|wrangler|WhatsApp|Baileys|CORS|llave/i },
  { k: 'caja', nombre: 'La Caja', d: 'CSS: cajas que miden lo que no dicen.', re: /CSS|display|grid|flex|z-index|scroll|clase|keyframes|zoom|hidden|ancho|1fr|dialog/i },
  { k: 'testigo', nombre: 'El Testigo', d: 'Las pruebas que decían que sí cuando era que no.', re: /prueba|mutaci|verde|rojo|intermitente/i },
  { k: 'sueltas', nombre: 'Las Sueltas', d: 'Las que no son de ninguna familia y dolieron igual.', re: /./ },
];
const estrellas = filas.map(([creia, era, costo], i) => {
  const todo = creia + era + costo;
  return { i, c: CIELO.find(c => c.re.test(todo)).k, creia: fmt(creia), era: fmt(era), costo: fmt(costo), peso: costo.length };
});
const datos = { cielo: CIELO.map(({ k, nombre, d }) => ({ k, nombre, d })), estrellas };

/* con una FUNCIÓN y no con el texto: en el texto de reemplazo «$$» vale un solo «$», y la tabla
   trae justo el renglón que lo cuenta — el primer cielo salió vacío por eso. Y «</» se escapa
   para que ningún renglón cierre el <script> antes de tiempo. */
const plantilla = fs.readFileSync(path.join(AQUI, 'cielo.fuente.html'), 'utf8');
fs.writeFileSync(path.join(AQUI, 'cielo.html'), plantilla.replace('/*DATOS*/null', () => JSON.stringify(datos).replace(/<\//g, '<\\/')));
console.log(`✓ ${estrellas.length} estrellas en ${CIELO.length} constelaciones → sylcred/cielo.html`);
for(const c of CIELO) console.log(`  ${c.nombre}: ${estrellas.filter(e => e.c === c.k).length}`);
