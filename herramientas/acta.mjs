/* ══════════════════════════════════════════════════════════════════════════
   EL ACTA · una auditoría o un veredicto convertido en PDF que sí se lee
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «haz que las auditorías etc me las dé en pdf con formato digital e
   imágenes/iconos de qué personaje habla etc para que se me haga menos
   pesado leerlos».

   El problema es real y se ve abriendo cualquiera de las actas: son 20 000
   caracteres de markdown donde 24 personas hablan, y todas se ven igual —una
   línea en negritas y un párrafo—. Para saber quién está hablando hay que ir
   contando hacia arriba. En el teléfono es peor.

   Lo que hace esto:
   · cada quien con su avatar, su color de área y su cargo, así que se sabe
     quién habla SIN LEER;
   · los turnos separados de verdad, no con una línea;
   · 🔴🟠🟡⚪ convertidos en etiquetas con su significado escrito, en vez de
     un emoji suelto a media frase;
   · el veredicto como sello, que es lo único que él va a buscar primero.

   ── Y sale un PDF DE VERDAD, no «imprimir lo que se ve» ──────────────────
   Carlos ya lo dijo de las otras herramientas: «el imprimir de la credencial
   y los que tiene fadori no sirven, directamente ofrecen imprimir lo que se
   ve del navegador, no el archivo que se quiere imprimir». Así que esto NO
   abre un diálogo de impresión: arma la página y la manda a PDF con el
   navegador desde aquí. Sale un archivo.

     node herramientas/acta.mjs .claude/auditorias/2026-08-22-fadori-antes-de-construir.md
     node herramientas/acta.mjs --todas
     node herramientas/acta.mjs <archivo.md> --html       (deja el HTML, para mirarlo)
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, basename, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AREAS, GENTE, NIVELES, VEREDICTOS, quienEs, areaDe } = require('./consejo.js');

const RAIZ = resolve(dirname(new URL(import.meta.url).pathname), '..');
const SALIDA = join(RAIZ, '.claude', 'actas-pdf');

/* ══ LOS AVATARES ═════════════════════════════════════════════════════════
   Se COMPONEN, no se generan. Es la regla de la casa para la marca y aquí
   aplica igual: un modelo de imagen no dibuja dos veces la misma cara, y
   veintiséis caras que cambian de un acta a otra son veintiséis personas
   distintas. Además tienen que leerse a 34 px y en blanco y negro.

   Cada quien es: su color de área, sus iniciales, y el glifo de su área.
   Determinista: el mismo nombre da siempre el mismo avatar. */
const GLIFOS = {
  /* Trazos simples, que aguantan el tamaño chico. Nada de detalle fino. */
  mazo:    'M4 13l5-5M6.5 10.5l3 3M11 6l7 7-2 2-7-7zM3 20h8',
  planos:  'M3 5h18v14H3zM3 10h18M9 10v9',
  escudo:  'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z',
  llave:   'M14 7a3 3 0 105.9.9L21 7l-1-1 1-1-2-2-5 4zM13 9l-9 9v3h3l9-9',
  paleta:  'M12 3a9 9 0 100 18c1 0 1.5-.7 1.5-1.5S13 18 13 17c0-1 .8-1.5 1.8-1.5H17a4 4 0 004-4A9 9 0 0012 3z',
  ventana: 'M3 5h18v14H3zM3 9h18M6 7h.01M9 7h.01',
  pata:    'M12 14c-3 0-5 2-5 4s2 3 5 3 5-1 5-3-2-4-5-4zM7 8a2 2.5 0 104 0 2 2.5 0 10-4 0zM13 8a2 2.5 0 104 0 2 2.5 0 10-4 0z',
  balanza: 'M12 4v16M6 20h12M4 9h8L8 4zM12 9h8l-4-5zM4 9a4 4 0 008 0M12 9a4 4 0 008 0',
};

function iniciales(persona){
  const limpio = persona.nombre.replace(/["“”]/g, '').trim();
  const partes = limpio.split(/\s+/).filter(p => !/^(el|la|de|del)$/i.test(p));
  if(partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function avatar(persona, lado = 42){
  const a = areaDe(persona);
  const color = a ? a.color : '#4A4E69';
  const glifo = GLIFOS[a ? a.icono : 'balanza'];
  /* El glifo va con poca opacidad DETRÁS de las iniciales: da el área de un
     vistazo sin competir con las letras, que son lo que identifica. */
  return `<svg class="avatar" viewBox="0 0 48 48" width="${lado}" height="${lado}" aria-hidden="true">
    <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="${color}"/>
    <g transform="translate(12 12) scale(1)" opacity=".26">
      <path d="${glifo}" fill="none" stroke="#fff" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="24" y="24" fill="#fff" font-size="17" font-weight="800"
          text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif">${iniciales(persona)}</text>
  </svg>`;
}

/* ══ EL MARKDOWN ══════════════════════════════════════════════════════════
   Un convertidor chico y a la medida de NUESTRAS actas. No es un markdown
   completo y no pretende serlo: hace lo que estas actas usan y nada más.
   Que sea corto es lo que deja leerlo cuando algo salga raro. */
const esc = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function enLinea(t){
  let s = esc(t);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  /* La negrita puede traer CURSIVAS adentro, y en estas actas pasa seguido:
     «**Y falta uno: *software* y *páginas web* no tienen herramienta**». Con
     `[^*]+` —que fue la primera versión— esa negrita no cerraba nunca y los
     cuatro asteriscos salían crudos en el PDF.
     `(?:[^*]|\*(?!\*))+?` dice «cualquier cosa menos DOS asteriscos
     seguidos», que es exactamente lo que la cierra. */
  s = s.replace(/\*\*((?:[^*]|\*(?!\*))+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[\s(])\*([^*]+)\*/g, '$1<i>$2</i>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a>$1</a>');
  /* Los niveles de gravedad dejan de ser un emoji suelto y se vuelven
     etiqueta con su significado. Es la información que él busca. */
  for(const n of NIVELES){
    s = s.split(n.emoji).join(
      `<span class="nivel" style="--c:${n.color}">${n.nombre}</span>`);
  }
  return s;
}

/* ¿Esta línea es alguien hablando? Las actas lo escriben de dos formas:
     **Nombre:** lo que dijo
     **Nombre** *(acotación)*: lo que dijo                                   */
function quienHabla(linea){
  let m = linea.match(/^\*\*([^*]+?)\s*:\*\*\s*(.*)$/);
  if(m) return { nombre: m[1], acota: null, resto: m[2] };
  m = linea.match(/^\*\*([^*]+?)\*\*\s*\*\(([^)]+)\)\*\s*:\s*(.*)$/);
  if(m) return { nombre: m[1], acota: m[2], resto: m[3] };
  m = linea.match(/^\*\*([^*]+?)\*\*\s*:\s*(.*)$/);
  if(m) return { nombre: m[1], acota: null, resto: m[2] };
  /* Las actas de julio escriben la palabra de otra forma: `**NADIA** — lo que
     dijo`, con guion largo y en mayúsculas, dentro de una cita. Son 25
     intervenciones que sin esto salen como párrafo gris sin avatar, que es
     justo lo que Carlos pidió arreglar.
     El guion tiene que ir con espacios: así `**Bien.** Lo mejor pensado`, que
     es una negrita cualquiera a media tabla, no se confunde con alguien
     hablando. Y de todos modos el censo tiene la última palabra. */
  m = linea.match(/^\*\*([^*]+?)\*\*\s+[—–-]\s+(.*)$/);
  if(m) return { nombre: m[1], acota: null, resto: m[2] };
  return null;
}

/* Los bloques "normales" de markdown: listas, tablas, citas, párrafos.
   Va en su propia función a propósito, porque se usa DOS veces: para el
   cuerpo del acta y para lo que va DENTRO de una intervención. Antes estaba
   todo en un solo recorrido y por eso una lista se salía del bloque de quien
   la estaba diciendo: Paola enumeraba tres reglas y las tres aparecían fuera
   de su tarjeta, con su nombre repetido abajo como si hubiera hablado otra
   vez. */
/* Gancho para que `bloques` pueda pedirle a `aHtml` que pinte intervenciones
   sin que las dos funciones se llamen en círculo al cargarse. */
let DENTRO_DE_CITA = (lineas) => bloques(lineas);

/* Dónde apuntar lo que se va viendo mientras se pinta. `aHtml` lo apunta aquí
   antes de empezar, para que una cita anidada escriba en los mismos
   conjuntos y no en unos suyos que después se tiran. */
const VISTOS = { desconocidos:new Set(), hablaron:new Set() };

function bloques(lineas){
  const fuera = [];
  let i = 0, enCodigo = false;

  while(i < lineas.length){
    const l = lineas[i];

    if(/^```/.test(l)){
      if(!enCodigo){ fuera.push('<pre><code>'); enCodigo = true; }
      else { fuera.push('</code></pre>'); enCodigo = false; }
      i++; continue;
    }
    if(enCodigo){ fuera.push(esc(l)); i++; continue; }
    if(/^\s*$/.test(l)){ i++; continue; }
    if(/^---+\s*$/.test(l)){ i++; continue; }   /* las reglas las damos nosotros */

    /* Tablas: se juntan enteras antes de pintarlas. */
    if(/^\s*\|/.test(l)){
      const filas = [];
      while(i < lineas.length && /^\s*\|/.test(lineas[i])){ filas.push(lineas[i]); i++; }
      const celdas = (f) => f.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const sep = (f) => /^[\s|:-]+$/.test(f);
      const cabeza = filas[0], cuerpo = filas.filter((f, n) => n > 0 && !sep(f));
      fuera.push('<table><thead><tr>'
        + celdas(cabeza).map(c => '<th>' + enLinea(c) + '</th>').join('')
        + '</tr></thead><tbody>'
        + cuerpo.map(f => '<tr>' + celdas(f).map(c => '<td>' + enLinea(c) + '</td>').join('') + '</tr>').join('')
        + '</tbody></table>');
      continue;
    }

    const enc = l.match(/^(#{1,6})\s+(.*)$/);
    if(enc){
      const nivel = enc[1].length;
      const texto = enc[2].replace(/^[⏱🕳📉🐈🐕🎨🛡🏗🌙🖥]\s*/, '').trim();
      if(nivel === 1) fuera.push('<h1>' + enLinea(texto) + '</h1>');
      else if(nivel === 2 && /^TURNO/i.test(texto)){
        /* Los turnos son la espina del acta: van como separador con número. */
        const m = texto.match(/^TURNO\s+(\S+)\s*·?\s*(.*)$/i);
        fuera.push('<div class="turno"><span class="n">'
          + esc(m ? m[1] : '·') + '</span><span class="t">'
          + enLinea(m ? m[2] : texto) + '</span></div>');
      }
      else fuera.push('<h' + Math.min(nivel, 4) + '>' + enLinea(texto)
                    + '</h' + Math.min(nivel, 4) + '>');
      i++; continue;
    }

    /* Las citas se parsean POR DENTRO, no se aplastan en un renglón. Aplastarlas
       fue un defecto de verdad: el acta del plan del sitio mete una tabla
       entera dentro de una cita, y al juntarlo todo con espacios la tabla
       nunca se parseaba y sus `**` se emparejaban con los de OTRA fila. En el
       PDF salían diez asteriscos crudos.

       Y si adentro hay gente hablando, la cita no era una cita: era una
       transcripción. En ese caso se pinta el contenido tal cual —con sus
       avatares— y no dentro de un recuadro gris. */
    if(/^>\s?/.test(l)){
      const trozo = [];
      while(i < lineas.length && /^>\s?/.test(lineas[i])){
        trozo.push(lineas[i].replace(/^>\s?/, '')); i++;
      }
      const hayGente = trozo.some(t => { const h = quienHabla(t); return h && quienEs(h.nombre); });
      if(hayGente){ fuera.push(DENTRO_DE_CITA(trozo, VISTOS.desconocidos, VISTOS.hablaron)); }
      else fuera.push('<blockquote>' + bloques(trozo) + '</blockquote>');
      continue;
    }

    /* Listas. Cada punto se lleva SUS renglones envueltos: el markdown de las
       actas parte los renglones a los 100 caracteres, y tomar cada renglón
       como un punto nuevo dejaba medio texto colgando sin viñeta —y partía a
       la mitad cualquier **negrita** que cruzara el corte. */
    if(/^\s*([-*·]|\d+\.)\s+/.test(l)){
      const puntos = [];
      while(i < lineas.length && /^\s*([-*·]|\d+\.)\s+/.test(lineas[i])){
        const trozo = [lineas[i].replace(/^\s*([-*·]|\d+\.)\s+/, '')];
        i++;
        while(i < lineas.length && !/^\s*$/.test(lineas[i])
              && !/^\s*([-*·]|\d+\.)\s+/.test(lineas[i])
              && !/^(#{1,6}\s|>|---|\s*\||```)/.test(lineas[i])){
          trozo.push(lineas[i].trim()); i++;
        }
        puntos.push('<li>' + enLinea(trozo.join('\n')) + '</li>');
        while(i < lineas.length && /^\s*$/.test(lineas[i])
              && /^\s*([-*·]|\d+\.)\s+/.test(lineas[i + 1] || '')) i++;
      }
      fuera.push('<ul>' + puntos.join('') + '</ul>');
      continue;
    }

    /* Un párrafo son TODOS los renglones seguidos hasta el próximo blanco, no
       uno por renglón. Pintar renglón por renglón partía en dos cualquier
       **negrita** que el markdown hubiera envuelto de línea: la apertura
       quedaba en un párrafo y el cierre en el otro, así que ninguna de las dos
       se convertía y salía el `**cómo aguanta**` en crudo dentro del PDF. */
    const junta = [l]; i++;
    while(i < lineas.length && !/^\s*$/.test(lineas[i])
          && !/^(#{1,6}\s|>|---|\s*\||```)/.test(lineas[i])
          && !/^\s*([-*·]|\d+\.)\s+/.test(lineas[i])){
      junta.push(lineas[i]); i++;
    }
    fuera.push('<p>' + enLinea(junta.join('\n')) + '</p>');
  }
  return fuera.join('\n');
}

function aHtml(md, desconocidosFuera, hablaronFuera){
  const lineas = md.split('\n');
  const fuera = [];
  const desconocidos = desconocidosFuera || new Set();
  const hablaron = hablaronFuera || new Set();
  VISTOS.desconocidos = desconocidos; VISTOS.hablaron = hablaron;
  let i = 0;

  /* Dónde termina lo que está diciendo alguien: cuando habla otro, cuando
     empieza una sección, o cuando hay una regla horizontal. Una lista NO lo
     termina — es parte de lo que está diciendo. */
  const cortaLaIntervencion = (linea) =>
    quienHabla(linea) !== null || /^#{1,6}\s/.test(linea) || /^---+\s*$/.test(linea);

  while(i < lineas.length){
    const l = lineas[i];
    const habla = quienHabla(l);
    /* EL CENSO MANDA. Un renglón como `**Fecha:** 22 de agosto` tiene la misma
       forma que `**Nadia:** lo que dijo`, y la primera versión de esto le
       ponía avatar a «Fecha», a «Menú» y a «Pedido». No se arregla adivinando
       por la pinta del texto: se arregla preguntando si esa persona existe. */
    const persona = habla ? quienEs(habla.nombre) : null;

    if(habla && persona){
      hablaron.add(persona.id);
      const suyo = [habla.resto];
      i++;
      while(i < lineas.length && !cortaLaIntervencion(lineas[i])){ suyo.push(lineas[i]); i++; }
      /* Se le quitan los renglones en blanco del final, que si no dejan un
         hueco raro dentro de la tarjeta. */
      while(suyo.length && /^\s*$/.test(suyo[suyo.length - 1])) suyo.pop();

      const a = areaDe(persona);
      fuera.push(`<div class="dice${persona.manda ? ' jefe' : ''}"
           style="--c:${a ? a.color : '#4A4E69'}">
        <div class="quien">${avatar(persona)}</div>
        <div class="loque">
          <div class="ficha"><b>${esc(persona.nombre)}</b>
            <span>${esc(persona.cargo)}</span>
            ${habla.acota ? '<i>' + esc(habla.acota) + '</i>' : ''}</div>
          ${bloques(suyo)}
        </div>
      </div>`);
      continue;
    }

    /* Tenía forma de intervención pero no es nadie del censo. Si el nombre
       parece de persona —dos palabras que empiezan con mayúscula— se anota
       para revisarlo; si es una etiqueta como «Fecha» o «Menú», ni eso. */
    if(habla && /^[A-ZÁÉÍÓÚÑ"][\wáéíóúñ"]+\s+[A-ZÁÉÍÓÚÑ"][\wáéíóúñ"]+$/.test(habla.nombre.trim())){
      desconocidos.add(habla.nombre.trim());
    }

    /* Todo lo que no es alguien hablando, hasta que alguien hable. */
    const resto = [l]; i++;
    while(i < lineas.length){
      const h = quienHabla(lineas[i]);
      if(h && quienEs(h.nombre)) break;
      resto.push(lineas[i]); i++;
    }
    fuera.push(bloques(resto));
  }
  return { html: fuera.join('\n'), desconocidos:[...desconocidos], hablaron:[...hablaron] };
}

/* Ya existen las dos: se cierra el círculo. Lo que se dijo dentro de una cita
   se pinta con el mismo aparato que lo de fuera —mismos avatares, mismos
   colores— y lo que descubra (quién habló, quién no está en el censo) se
   guarda en los mismos conjuntos, porque `aHtml` los recibe por referencia. */
DENTRO_DE_CITA = (lineas, desconocidos, hablaron) =>
  aHtml(lineas.join('\n'), desconocidos, hablaron).html;

/* El veredicto, para el sello de arriba. Se busca en el documento entero. */
function veredictoDe(md){
  for(const v of VEREDICTOS) if(v.busca.test(md)) return v;
  return null;
}

const ESTILO = `
:root{
  --papel:#FBF8F3; --tinta:#1E1A16; --tenue:#6B6259; --linea:#E4DCD0;
  --fam:"Helvetica Neue",Helvetica,Arial,"Liberation Sans",sans-serif;
}
*{box-sizing:border-box}
body{margin:0; background:var(--papel); color:var(--tinta);
  font-family:var(--fam); font-size:10.6pt; line-height:1.62;
  -webkit-print-color-adjust:exact; print-color-adjust:exact}
.hoja{padding:0}
h1{font-size:23pt; line-height:1.14; margin:0 0 4mm; letter-spacing:-.01em}
h2{font-size:13.5pt; margin:8mm 0 2mm; padding-bottom:1.5mm;
  border-bottom:.5mm solid var(--linea)}
h3{font-size:11.6pt; margin:6mm 0 1.5mm}
h4{font-size:10.6pt; margin:5mm 0 1mm; color:var(--tenue)}
p{margin:0 0 2.6mm}
a{color:inherit; text-decoration:underline; text-decoration-color:var(--linea)}
code{font-family:"Courier New",monospace; font-size:.9em;
  background:#F0EAE0; padding:.5mm 1mm; border-radius:1mm}
pre{background:#F0EAE0; padding:3mm; border-radius:2mm; overflow:hidden}
pre code{background:none; padding:0}
ul{margin:0 0 3mm; padding-left:5mm}
li{margin:0 0 1.2mm}
blockquote{margin:3mm 0; padding:2.5mm 4mm; border-left:1mm solid var(--linea);
  background:#F4EEE5; border-radius:0 2mm 2mm 0; color:#3A342C}
table{width:100%; border-collapse:collapse; margin:3mm 0; font-size:9.4pt}
th,td{border:.3mm solid var(--linea); padding:1.6mm 2.2mm; text-align:left;
  vertical-align:top}
th{background:#F1EBE1; font-size:8.4pt; letter-spacing:.05em; text-transform:uppercase}

/* ── la portada ── */
.portada{border-bottom:1mm solid var(--tinta); padding-bottom:5mm; margin-bottom:7mm}
.tipo{font-size:8.4pt; font-weight:800; letter-spacing:.22em; text-transform:uppercase;
  color:var(--tenue); margin:0 0 2mm}
.meta{margin-top:3mm; font-size:9.4pt; color:var(--tenue)}
.meta p{margin:0 0 1mm}
.sello{display:inline-block; margin-top:3mm; padding:2mm 5mm; border-radius:2mm;
  background:var(--c); color:#fff; font-weight:800; letter-spacing:.12em;
  font-size:11pt}

/* ── el reparto ── */
.reparto{display:flex; flex-wrap:wrap; gap:2.5mm; margin:5mm 0 0}
.ficha-chica{display:flex; align-items:center; gap:1.8mm; padding:1.4mm 2.4mm;
  border:.3mm solid var(--linea); border-radius:2mm; background:#fff;
  font-size:8.2pt; line-height:1.25}
.ficha-chica b{display:block; font-size:8.6pt}
.ficha-chica span{color:var(--tenue)}

/* ── los turnos ── */
.turno{display:flex; align-items:center; gap:3mm; margin:9mm 0 4mm;
  break-after:avoid; page-break-after:avoid}
.turno .n{flex:0 0 auto; min-width:9mm; height:9mm; padding:0 2mm;
  border-radius:99mm; background:var(--tinta); color:var(--papel);
  font-weight:800; font-size:9.4pt; display:flex; align-items:center;
  justify-content:center}
.turno .t{font-weight:800; font-size:12.4pt; letter-spacing:-.01em}

/* ── quién habla ──────────────────────────────────────────────────────────
   Esto es el punto de toda la herramienta: que se sepa quién habla SIN leer.
   La barra de color a la izquierda y el avatar hacen ese trabajo. */
.dice{display:flex; gap:3.5mm; margin:0 0 4.5mm; padding:2.5mm 0 2.5mm 3mm;
  border-left:1.1mm solid var(--c); background:#fff;
  border-radius:0 2mm 2mm 0; padding-right:3mm;
  break-inside:avoid; page-break-inside:avoid}
.dice.jefe{background:#FFFDF8}
.dice .quien{flex:0 0 auto; padding-top:.6mm}
.avatar{display:block; border-radius:3.4mm}
.avatar.sin{width:42px; height:42px; border-radius:3.4mm; background:#C9C1B6;
  color:#fff; font-weight:800; display:flex; align-items:center;
  justify-content:center; font-size:16px}
.loque{min-width:0; flex:1 1 auto}
.ficha{margin-bottom:1.4mm; line-height:1.3}
.ficha b{font-size:10.4pt; color:var(--c)}
.ficha span{display:block; font-size:8.2pt; color:var(--tenue);
  letter-spacing:.02em}
.ficha i{display:block; font-size:8.4pt; color:var(--tenue)}
.dice p:last-child{margin-bottom:0}

/* ── los niveles de gravedad ── */
.nivel{display:inline-block; padding:.2mm 1.6mm; border-radius:1mm;
  background:var(--c); color:#fff; font-size:8pt; font-weight:800;
  letter-spacing:.06em; text-transform:uppercase; vertical-align:.4mm;
  white-space:nowrap}

/* ── el pie ── */
.pie{margin-top:9mm; padding-top:3mm; border-top:.3mm solid var(--linea);
  font-size:8pt; color:var(--tenue); display:flex; justify-content:space-between}
`;

function armarPagina(md, nombreArchivo){
  const { html, desconocidos, hablaron } = aHtml(md);
  const v = veredictoDe(md);
  const titulo = (md.match(/^#\s+(.*)$/m) || [null, basename(nombreArchivo, '.md')])[1]
    .replace(/[*`]/g, '');
  const esVeredicto = /veredictos/.test(nombreArchivo);

  /* El reparto de arriba: quién estuvo en esta sesión. Sirve para saber de
     un vistazo si la mesa fue chica o completa, que cambia cómo se lee. */
  const reparto = hablaron
    .map(id => GENTE.find(p => p.id === id))
    .filter(Boolean)
    .map(p => `<div class="ficha-chica">${avatar(p, 22)}<div><b>${esc(p.nombre)}</b>
       <span>${esc(p.cargo)}</span></div></div>`).join('');

  /* El primer <h1> ya se pinta en la portada: no se repite en el cuerpo. */
  const cuerpo = html.replace(/<h1>[\s\S]*?<\/h1>/, '');

  const pagina = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(titulo)}</title><style>${ESTILO}</style></head><body><div class="hoja">
  <div class="portada">
    <p class="tipo">${esVeredicto ? 'Consejo de los cuatro jueces' : 'Auditoría de la casa'}
       · Grupo Mazi</p>
    <h1>${esc(titulo)}</h1>
    ${v ? `<div class="sello" style="--c:${v.color}">${v.nombre}</div>` : ''}
    ${reparto ? `<div class="reparto">${reparto}</div>` : ''}
  </div>
  ${cuerpo}
  <div class="pie"><span>${esc(basename(nombreArchivo))}</span>
    <span>Grupo Mazi</span></div>
</div></body></html>`;
  return { html: pagina, desconocidos };
}

/* ══ A PDF ════════════════════════════════════════════════════════════════ */
async function aPdf(html, destino){
  const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
  const chromium = pw.chromium || pw.default.chromium;
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const page = await (await b.newContext()).newPage();
  await page.setContent(html, { waitUntil:'load' });
  await page.pdf({
    path: destino, format:'Letter', printBackground:true,
    margin:{ top:'16mm', bottom:'14mm', left:'15mm', right:'15mm' },
    displayHeaderFooter:true,
    headerTemplate:'<div></div>',
    footerTemplate:`<div style="width:100%; font-size:7pt; color:#6B6259;
      font-family:Helvetica,Arial,sans-serif; padding:0 15mm; text-align:right">
      <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  });
  await b.close();
}

async function convertir(ruta, dejarHtml){
  const md = await readFile(ruta, 'utf-8');
  const { html, desconocidos } = armarPagina(md, ruta);
  await mkdir(SALIDA, { recursive: true });
  const base = basename(ruta, '.md');
  if(dejarHtml) await writeFile(join(SALIDA, base + '.html'), html);
  const destino = join(SALIDA, base + '.pdf');
  await aPdf(html, destino);
  return { destino, desconocidos };
}

/* ══ La línea de comandos ═════════════════════════════════════════════════ */
const args = process.argv.slice(2);
const dejarHtml = args.includes('--html');
const todas = args.includes('--todas');
const sueltos = args.filter(a => !a.startsWith('--'));

let rutas = sueltos.map(r => resolve(RAIZ, r));
if(todas || !rutas.length){
  rutas = [];
  for(const carpeta of ['auditorias', 'veredictos']){
    const dir = join(RAIZ, '.claude', carpeta);
    if(!existsSync(dir)) continue;
    for(const f of await readdir(dir)){
      if(f.endsWith('.md') && f !== 'README.md') rutas.push(join(dir, f));
    }
  }
}

let problemas = 0;
for(const r of rutas){
  const { destino, desconocidos } = await convertir(r, dejarHtml);
  console.log('✓ ' + destino.replace(RAIZ + '/', ''));
  if(desconocidos.length){
    problemas++;
    console.log('  ⚠ hablan y no están en el censo: ' + desconocidos.join(', '));
  }
}
console.log('\n' + rutas.length + ' actas' + (problemas ? ' · ' + problemas + ' con gente fuera del censo' : ''));
