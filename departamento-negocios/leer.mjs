/* ══════════════════════════════════════════════════════════════════════════
   LEER LA BODEGA · la herramienta sin la que 350 neuronas serían inventadas
   ──────────────────────────────────────────────────────────────────────────
   Doscientos artículos no caben en la cabeza de nadie, ni en la ventana de
   contexto de un modelo. Sin una forma de PREGUNTARLE al montón, lo que pasa
   es lo de siempre: se escriben las neuronas de memoria, suenan bien, y son
   el promedio de internet en vez de lo que dice la fuente.

   Por eso esto existe y por eso devuelve el PASAJE y la URL, no un resumen:
   una neurona tiene que poder señalar de dónde salió.

     node departamento-diseno/leer.mjs buscar "contraste texto pequeño"
     node departamento-diseno/leer.mjs pasajes "cumulative layout shift" 6
     node departamento-diseno/leer.mjs casas
   ═════════════════════════════════════════════════════════════════════════ */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BODEGA = process.env.BODEGA ||
  '/tmp/claude-0/-home-user-evaluaciones-rembrandt/bf88face-536e-5b8f-9dd9-93f513378ced/scratchpad/cosecha-negocios';

/* Las muletillas no son palabras de búsqueda. Es la misma lección que ya
   costó una vez en el cerebro: `que` mide tres letras y casa con todo. */
const VACIAS = new Set(['the','and','for','with','that','this','you','are','not','but','from',
  'have','has','was','were','can','will','how','what','when','where','why','which','into',
  'your','their','its','it','a','an','of','to','in','on','is','be','as','at','by','or','if',
  'de','la','el','los','las','un','una','que','por','para','con','del','al','se','su','sus',
  'lo','le','es','y','o','en','no','si','más','como','esto','esta','ese','esa']);

/* ── EL PUENTE ESPAÑOL → INGLÉS ─────────────────────────────────────────────
   ⚠ ESTO NO ES UN ADORNO, ES EL DEFECTO QUE TENÍA LA PRIMERA VERSIÓN. La
   bodega está en inglés y aquí se pregunta en español: buscando «contraste de
   color texto pequeño» sólo casaba la palabra «color» —que está en todas las
   páginas de color de MDN— y los cinco resultados empataban en 4.0. O sea:
   contestaba, y contestaba cualquier cosa, que es peor que no contestar.

   Y va a hacer falta siempre, no sólo para mí: quien va a buscar aquí es
   alguien que dice «se ve chiquito en el celular», y lo dice en español. */
const PUENTE = {
  contraste:['contrast'], color:['color','colour'], colores:['color','colour'],
  tipografia:['typography','typeface','font'], letra:['font','typeface'],
  fuente:['font','typeface'], tamano:['size','scale'], texto:['text','type'],
  pequeno:['small','tiny'], chico:['small'], grande:['large','big'],
  sombra:['shadow'], sombras:['shadow'], profundidad:['depth','elevation'],
  elevacion:['elevation'], capa:['layer'], capas:['layer'],
  difuminado:['blur'], desenfoque:['blur'], vidrio:['glass','glassmorphism'],
  paralaje:['parallax'], parallax:['parallax'],
  movimiento:['motion','animation'], animacion:['animation'],
  transicion:['transition'], curva:['easing','curve'], duracion:['duration','timing'],
  reticula:['grid'], rejilla:['grid'], columna:['column'], columnas:['column'],
  maqueta:['layout'], maquetacion:['layout'], espaciado:['spacing'],
  aire:['whitespace','space'], ritmo:['rhythm'], linea:['line','baseline'],
  boton:['button'], botones:['button'], formulario:['form'], campo:['input','field'],
  tarjeta:['card'], modal:['modal','dialog'], dialogo:['dialog'],
  navegacion:['navigation','nav'], menu:['menu','navigation'],
  imagen:['image','picture'], imagenes:['image','picture'], foto:['photo','image'],
  icono:['icon'], iconos:['icon'],
  accesibilidad:['accessibility','a11y'], foco:['focus'], teclado:['keyboard'],
  lector:['screen reader'], pantalla:['screen','viewport'],
  telefono:['mobile','phone'], movil:['mobile'], escritorio:['desktop'],
  oscuro:['dark'], claro:['light'], tema:['theme','dark mode'],
  rendimiento:['performance'], carga:['loading','load'], salto:['shift','jump'],
  desborde:['overflow'], recorte:['crop','clip'], borde:['border','edge'],
  jerarquia:['hierarchy'], legible:['legible','readable'], legibilidad:['legibility','readability'],
  degradado:['gradient'], gradiente:['gradient'], grano:['grain','noise'],
  textura:['texture'], superficie:['surface'], relieve:['emboss','relief'],
  estado:['state'], vacio:['empty'], error:['error'], cargando:['loading','skeleton'],
  toque:['touch','tap'], dedo:['touch','finger'], desplazamiento:['scroll'],
  desliza:['scroll','swipe'], deslizar:['scroll','swipe'],
};

const palabras = (q) => {
  const crudas = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9-]+/).filter(p => p.length > 2 && !VACIAS.has(p));
  const salida = new Set();
  for(const p of crudas){
    salida.add(p);
    for(const eq of (PUENTE[p] || [])) salida.add(eq);
  }
  return [...salida];
};

async function cargar(){
  const nombres = (await readdir(BODEGA).catch(() => [])).filter(n => n.endsWith('.txt'));
  const docs = [];
  for(const n of nombres){
    const t = await readFile(join(BODEGA, n), 'utf8');
    const lineas = t.split('\n');
    docs.push({
      archivo: n,
      titulo: (lineas[0] || '').replace(/^#\s*/, ''),
      url: (lineas[1] || '').replace(/^#\s*/, ''),
      casa: (lineas[2] || '').replace(/^#\s*casa:\s*/, ''),
      texto: t,
      bajo: t.toLowerCase(),
    });
  }
  return docs;
}

/* Cuántas veces aparece cada palabra, con tope por palabra: sin el tope, un
   artículo que repite «color» ochenta veces le gana a uno que explica el
   problema una vez y bien.

   ⚠ Y CADA PALABRA VALE LO QUE ES DE RARA. Sin esto —lo vi— «color» pesaba
   igual que «contrast ratio», y como «color» está en las cien páginas de
   color de MDN, todos los resultados empataban con la misma nota y el orden
   lo decidía el azar. Una palabra que está en todas partes no distingue
   nada: es ruido con forma de dato. */
function rarezas(docs, ps){
  const r = {};
  for(const w of ps){
    const en = docs.filter(d => d.bajo.includes(w)).length;
    r[w] = Math.log((docs.length + 1) / (en + 1)) + 0.2;
  }
  return r;
}

function puntuar(doc, ps, raro){
  let p = 0;
  for(const w of ps){
    let n = 0, i = 0;
    while((i = doc.bajo.indexOf(w, i)) !== -1){ n++; i += w.length; if(n >= 8) break; }
    if(n) p += (1 + Math.min(n, 8) / 8) * raro[w];   /* estar cuenta más que repetirse */
    if(doc.titulo.toLowerCase().includes(w)) p += 2 * raro[w];
  }
  return p;
}

async function buscar(q, cuantos = 8){
  const ps = palabras(q);
  if(!ps.length){ console.log('Dame palabras con contenido, no muletillas.'); return; }
  const docs = await cargar();
  const raro = rarezas(docs, ps);
  const r = docs.map(d => ({ d, p: puntuar(d, ps, raro) })).filter(x => x.p > 0)
                .sort((a, b) => b.p - a.p).slice(0, cuantos);
  console.log(`${r.length} de ${docs.length} artículos para «${q}»\n`);
  for(const { d, p } of r) console.log(`  ${p.toFixed(1).padStart(5)}  ${d.titulo}\n         ${d.url}`);
}

/* El pasaje, que es lo que de verdad hace falta para escribir: el párrafo
   donde el tema se explica, con su fuente al lado. */
async function pasajes(q, cuantos = 5){
  const ps = palabras(q);
  const docs = await cargar();
  const trozos = [];
  for(const d of docs){
    for(const parrafo of d.texto.split(/\n\n+/)){
      if(parrafo.length < 140 || parrafo.length > 1600) continue;
      const b = parrafo.toLowerCase();
      const cuantas = ps.filter(w => b.includes(w)).length;
      if(cuantas < Math.min(2, ps.length)) continue;
      trozos.push({ p: cuantas + parrafo.length / 4000, parrafo, d });
    }
  }
  trozos.sort((a, b) => b.p - a.p);
  const vistos = new Set();
  let dados = 0;
  for(const t of trozos){
    if(dados >= cuantos) break;
    if(vistos.has(t.d.url)) continue;           /* uno por fuente: variedad, no eco */
    vistos.add(t.d.url); dados++;
    console.log(`── ${t.d.casa} · ${t.d.titulo}\n   ${t.d.url}\n\n${t.parrafo}\n`);
  }
  if(!dados) console.log(`Nada para «${q}». Prueba con menos palabras o más comunes.`);
}

async function casas(){
  const docs = await cargar();
  const c = {};
  for(const d of docs) c[d.casa] = (c[d.casa] || 0) + 1;
  const total = docs.length;
  console.log(`${total} artículos en la bodega\n`);
  for(const [k, v] of Object.entries(c).sort((a, b) => b[1] - a[1])){
    console.log(`  ${k.padEnd(22)} ${String(v).padStart(4)}  ${(v/total*100).toFixed(0).padStart(3)}%`);
  }
}

const [que, ...resto] = process.argv.slice(2);
if(que === 'buscar') await buscar(resto.slice(0, -1).join(' ') || resto.join(' '), +resto.at(-1) || 8);
else if(que === 'pasajes') await pasajes(resto.slice(0, -1).join(' ') || resto.join(' '), +resto.at(-1) || 5);
else if(que === 'casas') await casas();
else console.log('uso: leer.mjs buscar "…" | pasajes "…" [n] | casas');
