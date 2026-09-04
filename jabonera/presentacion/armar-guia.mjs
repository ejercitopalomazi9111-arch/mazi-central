// Arma la guía de la presentación NERA: guia.html y de ahí el PDF.
//
// Lo que este archivo resuelve y no es obvio:
//
// 1. Carlos pidió «describe cómo debería quedar cada lámina». Una descripción en
//    prosa se lee y no se entiende; por eso cada lámina se DIBUJA aquí a 16:9 con
//    los colores y las proporciones reales. La prosa se queda, pero al lado del
//    dibujo.
// 2. El tope de 15 palabras se cuenta aquí, no se confía. Si una lámina se pasa,
//    el guión falla antes de imprimir nada.
// 3. La tipografía va incrustada en base64: el HTML tiene que verse igual abierto
//    desde una USB que dentro de Chromium al imprimir.
// 4. Sobre menta y sobre coral el texto va en tinta oscura, nunca en blanco. No es
//    gusto: blanco sobre #FF6B3D da 2.83:1 y no pasa ni el mínimo de texto grande.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const g = JSON.parse(fs.readFileSync(path.join(AQUI, 'guion.json'), 'utf8'));
const TIPO = fs.readFileSync(path.join(AQUI, '..', 'tipos', 'PlexSans.woff2')).toString('base64');

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const palabras = (s) => String(s).split(/\s+/).filter(Boolean).length;
const lineas = (s) => String(s).split('\n');

/* ── la compuerta: ninguna lámina pasa de 15 palabras ────────────────────── */
const pasadas = g.laminas.filter((l) => palabras(l.pantalla) > 15);
if (pasadas.length) {
  console.error('LÁMINAS QUE SE PASAN DE 15 PALABRAS:');
  for (const l of pasadas) console.error(`  ${l.n} · ${l.titulo} — ${palabras(l.pantalla)}`);
  process.exit(1);
}

/* ── los dibujos de cada maqueta ─────────────────────────────────────────── */

const ICONO = {
  dispensador: `<svg viewBox="0 0 48 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="18" width="28" height="40" rx="5"/><path d="M17 18V10h14v8"/><path d="M24 30v14"/><path d="M18 37h12"/></svg>`,
  manos: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 30V16a3 3 0 0 1 6 0v10"/><path d="M20 26V13a3 3 0 0 1 6 0v13"/><path d="M26 26V16a3 3 0 0 1 6 0v14c0 7-5 12-11 12S14 37 14 30"/></svg>`,
  gota: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6c8 10 12 16 12 22a12 12 0 0 1-24 0c0-6 4-12 12-22Z"/></svg>`,
  moneda: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><path d="M24 14v20"/><path d="M29 19c-1.5-2-8-3-9 1s9 2 8 6-7.5 3-9 1"/></svg>`,
  duda: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a7 7 0 1 1 9.5 6.5c-1.6.7-2.5 2-2.5 3.7V31"/><circle cx="24" cy="38" r="1.6" fill="currentColor" stroke="none"/></svg>`,
};

function burbujas() {
  return `<span class="b b1"></span><span class="b b2"></span><span class="b b3"></span>`;
}

function maqueta(l) {
  const p = lineas(l.pantalla);
  switch (l.maqueta) {
    case 'portada':
      return `<div class="diapo d-portada">${burbujas()}
        <div class="pt-nombre">${esc(p[0])}</div>
        <div class="pt-frase">${esc(p.slice(1).join(' '))}</div>
        <div class="pt-firmas">${g.integrantes.map(esc).join(' · ')}</div>
      </div>`;

    case 'texto-icono':
      return `<div class="diapo d-crema fila">
        <div class="col-texto">${esc(l.pantalla)}</div>
        <div class="col-icono coral">${ICONO.duda}</div>
      </div>`;

    case 'centro-tres':
      return `<div class="diapo d-crema centro">
        <div class="frase">${esc(l.pantalla)}</div>
        <div class="tercia">
          ${[['manos', 'SALUD'], ['gota', 'HIGIENE'], ['moneda', 'AHORRO']]
            .map(([i, t]) => `<div class="ter"><span class="ico">${ICONO[i]}</span><b>${t}</b></div>`)
            .join('')}
        </div>
      </div>`;

    case 'silencio':
      return `<div class="diapo d-indigo centro"><div class="frase grande">${esc(l.pantalla)}</div></div>`;

    case 'cierre':
      return `<div class="diapo d-indigo centro">${burbujas()}<div class="frase grande">${esc(l.pantalla)}</div></div>`;

    case 'cuatro-tarjetas': {
      const trozos = l.pantalla.split(/\.\s*/).map((s) => s.trim()).filter(Boolean);
      return `<div class="diapo d-crema"><div class="rejilla">
        ${trozos.slice(0, 4).map((t, i) => `<div class="tarj"><span class="num">0${i + 1}</span><b>${esc(t)}</b></div>`).join('')}
      </div></div>`;
    }

    case 'franja':
      return `<div class="diapo d-crema centro"><span class="franja"></span>
        <div class="rotulo">${esc(l.titulo)}</div>
        <div class="frase">${esc(l.pantalla)}</div>
      </div>`;

    case 'tabla':
      return `<div class="diapo d-crema centro">
        <div class="frase chica">${esc(l.pantalla)}</div>
        <table class="tab"><thead><tr><th>Referencia</th><th>mL por dosis</th></tr></thead><tbody>
          <tr><td>Norma sanitaria, mínimo</td><td>1.0</td></tr>
          <tr><td>Norma sanitaria, máximo</td><td>5.0</td></tr>
          <tr><td>Dispensador de referencia</td><td>1.2</td></tr>
          <tr><td>Rango real medido</td><td>0.7 – 1.5</td></tr>
        </tbody></table>
      </div>`;

    case 'formula':
      return `<div class="diapo d-crema centro">
        <div class="formula">
          <span class="bloque bl-indigo">lo que quedaba</span>
          <span class="signo">+</span>
          <span class="bloque bl-menta">lo repuesto</span>
          <span class="signo">−</span>
          <span class="bloque bl-coral">lo que queda hoy</span>
        </div>
        <div class="pie-formula">= consumo</div>
      </div>`;

    case 'steam': {
      const t = l.tono;
      const ranura = {
        telefono: `<span class="ranura tel">captura<br>de la app</span>`,
        foto: `<span class="ranura">foto real<br>del dispensador</span>`,
        'formula-chica': `<span class="ranura mono">Σ(precio × litros)<br>÷ Σ litros</span>`,
      }[l.ranura] || '';
      return `<div class="diapo fila d-crema">
        <div class="letra" style="background:${t.fondo};color:${t.tinta}">${t.letra}</div>
        <div class="lado">
          <div class="rotulo">${esc(l.seccion.replace('STEAM · ', ''))}</div>
          <div class="frase chica">${esc(l.pantalla)}</div>
          ${ranura}
        </div>
      </div>`;
    }

    case 'barras':
      return `<div class="diapo d-crema centro">
        <div class="barras">
          <div class="bar"><span class="et">Baño 1</span><span class="tallo b-indigo" style="height:26%"></span></div>
          <div class="bar"><span class="et">Baño 2</span><span class="tallo b-coral" style="height:82%"></span></div>
        </div>
        <div class="frase chica">${esc(l.pantalla)}</div>
      </div>`;

    default:
      return `<div class="diapo d-crema centro"><div class="frase">${esc(l.pantalla)}</div></div>`;
  }
}

/* ── las páginas ─────────────────────────────────────────────────────────── */

function pagLamina(l) {
  const n = String(l.n).padStart(2, '0');
  const w = palabras(l.pantalla);
  return `<section class="pagina">
    <header class="cab">
      <span class="eyebrow">Lámina ${n} · ${esc(l.seccion)}</span>
      <span class="cuenta ${w > 12 ? 'apretada' : ''}">${w} / 15 palabras</span>
    </header>
    <h2>${esc(l.titulo)}</h2>
    ${maqueta(l)}
    <div class="copiar">
      <span class="et-bloque">Texto de la lámina — cópialo tal cual</span>
      <p>${lineas(l.pantalla).map(esc).join('<br>')}</p>
    </div>
    <div class="dos">
      <div><span class="et-bloque">Cómo se ve</span><p>${esc(l.diseno)}</p></div>
      <div><span class="et-bloque">En Canva, sin premium</span><p>${esc(l.canva)}</p></div>
    </div>
    <div class="hablado">
      <span class="et-bloque">Lo que se dice en voz alta</span>
      <p>${esc(l.hablado)}</p>
    </div>
    <footer class="pie"><span>NERA · guía de presentación</span><span>${n} / 16</span></footer>
  </section>`;
}

const PORTADA = `<section class="pagina p-portada">
  ${burbujas()}
  <div class="tapa-alto">
    <span class="eyebrow claro">Guía de presentación</span>
    <h1>NERA</h1>
    <p class="tapa-sub">${esc(g.subtitulo)}</p>
  </div>
  <div class="tapa-bajo">
    <div>
      <span class="et-bloque claro">Integrantes</span>
      <ul class="nombres">${g.integrantes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    </div>
    <div>
      <span class="et-bloque claro">Qué es este documento</span>
      <p class="tapa-nota">Dieciséis láminas, con el texto exacto que va en cada una, cómo debe verse
      y qué buscar en Canva gratis. Ninguna lámina pasa de quince palabras: eso se cuenta al generar
      este PDF, no se estima.</p>
    </div>
  </div>
</section>`;

const COMO = `<section class="pagina">
  <header class="cab"><span class="eyebrow">Antes de abrir Canva</span><span class="cuenta">Léase una vez</span></header>
  <h2>Cómo se usa esta guía</h2>

  <div class="reglas">
    <div class="regla"><span class="rn">01</span><div><b>Una página de aquí es una lámina de allá.</b>
      El texto del recuadro «Texto de la lámina» se copia tal cual. No se le añade nada:
      cada palabra de más es una palabra que el jurado lee en vez de escucharlos.</div></div>
    <div class="regla"><span class="rn">02</span><div><b>Quince palabras es el techo, no la meta.</b>
      Lo que no cabe en la lámina va en «Lo que se dice en voz alta», que es el guion hablado.
      La lámina se ve; el guion se dice. Si están escritos lo mismo, sobra uno de los dos.</div></div>
    <div class="regla"><span class="rn">03</span><div><b>El dibujo manda sobre la descripción.</b>
      Cada página trae la lámina dibujada a escala real 16:9. Si la prosa y el dibujo no coinciden,
      hagan caso al dibujo.</div></div>
    <div class="regla"><span class="rn">04</span><div><b>Todo se hace con Canva gratis.</b>
      Cada página dice qué buscar y con qué filtro. Ninguna lámina necesita elementos de pago:
      donde había tentación de usar uno, se cambió por un rectángulo de color, que además se ve mejor.</div></div>
  </div>

  <h3>La paleta, una sola vez</h3>
  <p class="nota">En Canva, al elegir un color, se escribe el código en el recuadro de arriba.
  Conviene hacerlo en la primera lámina: quedan guardados como «colores del documento» y ya no se vuelven a teclear.</p>
  <div class="paleta">
    ${[['Índigo', '#3B2FB5', '#fff', 'Estructura: fondos y bloques grandes'],
       ['Coral', '#FF6B3D', '#2A1005', 'Acento. Encima va tinta oscura, nunca blanco'],
       ['Menta', '#12BE8F', '#0B1F1A', 'Segundo acento. Igual: tinta oscura encima'],
       ['Crema', '#FFF8F2', '#1A1533', 'El fondo por defecto de casi todas'],
       ['Tinta', '#1A1533', '#fff', 'Todo el texto oscuro sale de aquí']]
      .map(([n, hex, tinta, uso]) => `<div class="col-p"><span class="muestra" style="background:${hex};color:${tinta}">${hex}</span><b>${n}</b><span class="uso">${uso}</span></div>`).join('')}
  </div>

  <h3>Tipografía y tamaños</h3>
  <p class="nota">Canva gratis tiene <b>Poppins</b> y <b>DM Sans</b>. Poppins para los títulos, DM Sans para lo demás.
  Dos familias y se acabó: una tercera es lo que hace que una presentación se vea de tarea.</p>
  <table class="tab ancha"><thead><tr><th>Papel</th><th>Familia y peso</th><th>Tamaño en Canva</th></tr></thead><tbody>
    <tr><td>Nombre del proyecto (portada)</td><td>Poppins Bold</td><td>120 pt</td></tr>
    <tr><td>Frase principal de la lámina</td><td>Poppins SemiBold</td><td>44 pt</td></tr>
    <tr><td>Rótulo pequeño (MISIÓN, VISIÓN…)</td><td>DM Sans Bold, con espaciado +100</td><td>16 pt</td></tr>
    <tr><td>Nombres, notas al pie</td><td>DM Sans Regular</td><td>14 pt</td></tr>
  </tbody></table>

  <div class="aviso">
    <b>Un error que se ve a tres metros.</b> Texto blanco encima del coral o del menta no se lee:
    da 2.8 y 2.2 de contraste, y el mínimo que se aguanta es 4.5. Sobre esos dos colores el texto va
    en tinta oscura. Sobre índigo y sobre índigo oscuro sí va blanco. Está medido, no opinado.
  </div>

  <footer class="pie"><span>NERA · guía de presentación</span><span>Antes de empezar</span></footer>
</section>`;

const INDICE = `<section class="pagina">
  <header class="cab"><span class="eyebrow">Las dieciséis láminas</span><span class="cuenta">Orden de exposición</span></header>
  <h2>Índice</h2>
  <table class="indice"><tbody>
    ${g.laminas.map((l) => `<tr>
      <td class="ix-n">${String(l.n).padStart(2, '0')}</td>
      <td class="ix-s">${esc(l.seccion)}</td>
      <td class="ix-t">${esc(lineas(l.pantalla).join(' '))}</td>
      <td class="ix-w">${palabras(l.pantalla)}</td>
    </tr>`).join('')}
  </tbody></table>
  <p class="nota">La columna de la derecha son las palabras que se leen en pantalla.
  Las dieciséis juntas suman ${g.laminas.reduce((a, l) => a + palabras(l.pantalla), 0)} palabras:
  menos de lo que cabe en una hoja, y ése es justamente el punto.</p>

  <h3>Cómo se reparten los cinco</h3>
  <div class="reparto">
    ${[[g.integrantes[0], 'Láminas 1 a 4', 'Abre: portada, problema, justificación y objetivo general.'],
       [g.integrantes[1], 'Láminas 5 a 7', 'Objetivos específicos, misión y visión.'],
       [g.integrantes[2], 'Láminas 8 y 9', 'Marco teórico y la fórmula. Es la parte técnica: hay que ensayarla.'],
       [g.integrantes[3], 'Láminas 10 a 14', 'Las cinco letras de STEAM, seguidas y al mismo ritmo.'],
       [g.integrantes[4], 'Láminas 15 y 16', 'Resultados y cierre. Cierra quien mejor aguante las preguntas.']]
      .map(([q, cual, por]) => `<div class="rep"><b>${esc(q)}</b><span class="rep-cual">${cual}</span><span class="rep-por">${por}</span></div>`).join('')}
  </div>
  <p class="nota">Este reparto es una propuesta, no una orden: cámbienlo. Lo que no conviene cambiar
  es que <b>las cinco letras de STEAM las diga una sola persona</b> — son una serie, y se nota cuando se corta.</p>

  <footer class="pie"><span>NERA · guía de presentación</span><span>Índice</span></footer>
</section>`;

const PREGUNTAS = `<section class="pagina">
  <header class="cab"><span class="eyebrow">Después de la última lámina</span><span class="cuenta">Lo que van a preguntar</span></header>
  <h2>Las preguntas que caen, y qué contestar</h2>
  <p class="nota">Ninguna de estas respuestas va en una lámina. Se dicen. Están escritas cortas a propósito:
  una respuesta larga suena a que se está rellenando.</p>

  <div class="qa">
    ${[['¿Cómo saben que el dispensador da 1.2 mL y no otra cosa?',
        'Lo medimos: diez pulsadas dentro de una probeta y el resultado entre diez. No lo tomamos de la caja ni de internet. La app guarda ese número y todos los cálculos salen de ahí.'],
       ['¿Y si alguien desperdicia jabón, su sistema lo detecta?',
        'No, y no queremos que lo haga. Medimos consumo, no conducta. Distinguir uso de desperdicio necesitaría vigilar a las personas, y eso ni nos toca ni nos interesa.'],
       ['El precio del jabón cambia. ¿Su costo sirve de algo?',
        'Por eso no usamos el último precio, sino un promedio ponderado por litros comprados. Si compramos barato mucho y caro poco, el promedio lo refleja. Es la misma cuenta que hace un almacén.'],
       ['¿Qué pasa si un día se les olvida registrar?',
        'El sistema reparte el consumo entre los días del hueco en vez de cargárselo a uno solo, y marca ese tramo como estimado. Lo dice, no lo esconde.'],
       ['¿Por qué una app y no una hoja de Excel?',
        'Exporta a Excel: es la lámina T. La app existe porque el registro se hace parado frente al baño, con el celular en la mano y en menos de treinta segundos. Una hoja de cálculo ahí no se llena.'],
       ['¿Esto sirve para otra escuela?',
        'Sí, y es nuestra visión. El método no depende de nuestro dispensador: se calibra el suyo y las cuentas son las mismas.']]
      .map(([q, a]) => `<div class="par"><b>${esc(q)}</b><p>${esc(a)}</p></div>`).join('')}
  </div>

  <div class="aviso">
    <b>Lo que todavía falta y depende de ustedes.</b> Una foto real del dispensador y de la probeta
    (lámina 12), las capturas de la app ya con los datos de la escuela (láminas 11 y 13) y los números
    medidos de verdad para la lámina 15. Mientras no estén, esa lámina va con los datos de ejemplo
    y se dice en voz alta que son de ejemplo. Presentar un dato inventado como medido es lo único
    de esta presentación que sí puede reprobarlos.
  </div>

  <footer class="pie"><span>NERA · guía de presentación</span><span>Cierre</span></footer>
</section>`;

/* ── el documento ────────────────────────────────────────────────────────── */

const CSS = `
@font-face{font-family:Plex;src:url(data:font/woff2;base64,${TIPO}) format('woff2');font-weight:100 700;font-display:block}
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --indigo:#3B2FB5; --indigo-hondo:#241C7A; --coral:#FF6B3D; --coral-hondo:#C63E15;
  --menta:#12BE8F; --menta-texto:#0A7D5E; --crema:#FFF8F2; --tinta:#1A1533;
  --gris:#6B6683; --linea:#E3DDD6;
  --sans:Plex,'IBM Plex Sans',-apple-system,'Segoe UI',Roboto,sans-serif;
}
@page{size:A4;margin:0}
html,body{background:#fff}
body{font-family:var(--sans);color:var(--tinta);-webkit-font-smoothing:antialiased}
.pagina{width:210mm;height:297mm;padding:14mm 14mm 10mm;background:var(--crema);
        position:relative;overflow:hidden;page-break-after:always;display:flex;flex-direction:column}
.pagina:last-child{page-break-after:auto}

.cab{display:flex;justify-content:space-between;align-items:baseline;
     border-bottom:.6mm solid var(--tinta);padding-bottom:2mm}
.eyebrow{font-size:2.9mm;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--indigo)}
.eyebrow.claro{color:rgba(255,255,255,.7)}
.cuenta{font-size:2.9mm;font-weight:500;letter-spacing:.05em;color:var(--gris);
        font-variant-numeric:tabular-nums}
.cuenta.apretada{color:var(--coral-hondo);font-weight:600}
h1{font-size:34mm;font-weight:700;letter-spacing:-.02em;line-height:.9}
h2{font-size:9mm;font-weight:700;letter-spacing:-.015em;line-height:1.05;margin:3mm 0 4mm;text-wrap:balance}
h3{font-size:4.6mm;font-weight:700;letter-spacing:-.01em;margin:5mm 0 2mm}
.nota{font-size:3.2mm;line-height:1.5;color:var(--gris);max-width:150mm;margin-top:2.5mm}
.nota b{color:var(--tinta);font-weight:600}
.et-bloque{display:block;font-size:2.6mm;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
           color:var(--indigo);margin-bottom:1.4mm}
.et-bloque.claro{color:rgba(255,255,255,.65)}
.pie{margin-top:auto;padding-top:3mm;border-top:.25mm solid var(--linea);
     display:flex;justify-content:space-between;font-size:2.7mm;color:var(--gris);
     letter-spacing:.04em;font-variant-numeric:tabular-nums}

/* ── portada ── */
.p-portada{background:var(--indigo);color:#fff;justify-content:space-between}
.tapa-alto{position:relative;z-index:2;padding-top:22mm}
.tapa-sub{font-size:5.4mm;font-weight:400;line-height:1.3;color:rgba(255,255,255,.85);
          margin-top:4mm;max-width:120mm}
.tapa-bajo{position:relative;z-index:2;display:grid;grid-template-columns:70mm 1fr;gap:10mm;
           padding-bottom:4mm}
.nombres{list-style:none;font-size:3.4mm;line-height:1.75;color:#fff;font-weight:500}
.tapa-nota{font-size:3.4mm;line-height:1.6;color:rgba(255,255,255,.82)}
.b{position:absolute;border-radius:999px;background:rgba(255,255,255,.09);z-index:1}
.b1{width:120mm;height:120mm;right:-40mm;top:30mm}
.b2{width:60mm;height:60mm;left:-18mm;bottom:60mm}
.b3{width:28mm;height:28mm;right:38mm;top:150mm;background:rgba(255,107,61,.35)}

/* ── la lámina dibujada ── */
.diapo{width:100%;aspect-ratio:16/9;border-radius:2mm;overflow:hidden;position:relative;
       font-size:4.7mm;padding:7%;display:flex;box-shadow:1.2mm 1.2mm 0 rgba(26,21,51,.12)}
.d-crema{background:#fff;color:var(--tinta);border:.3mm solid var(--linea)}
.d-indigo{background:var(--indigo);color:#fff}
.d-portada{background:var(--indigo);color:#fff;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.diapo.centro{flex-direction:column;justify-content:center;align-items:center;text-align:center}
.diapo.fila{align-items:center;gap:6%}
.diapo .b1{width:11em;height:11em;right:-3.5em;top:-2em}
.diapo .b2{width:5em;height:5em;left:-1.5em;bottom:-1em}
.diapo .b3{width:2.4em;height:2.4em;right:4em;bottom:1em}
.pt-nombre{font-size:3.4em;font-weight:700;letter-spacing:-.03em;line-height:1;position:relative;z-index:2}
.pt-frase{font-size:.82em;font-weight:400;color:rgba(255,255,255,.85);margin-top:.7em;
          max-width:22em;position:relative;z-index:2}
.pt-firmas{font-size:.42em;color:rgba(255,255,255,.6);margin-top:2.4em;position:relative;z-index:2;letter-spacing:.03em}
.frase{font-size:1.25em;font-weight:600;line-height:1.25;letter-spacing:-.01em;max-width:19em;text-wrap:balance}
.frase.grande{font-size:1.55em;max-width:17em}
.frase.chica{font-size:1.02em;max-width:20em}
.col-texto{flex:1.7;font-size:1.2em;font-weight:600;line-height:1.25;letter-spacing:-.01em}
.col-icono{flex:1;display:flex;align-items:center;justify-content:center}
.col-icono svg{width:5.4em;height:5.4em}
.col-icono.coral{color:var(--coral-hondo)}
.tercia{display:flex;gap:2.6em;margin-top:1.9em}
.ter{display:flex;flex-direction:column;align-items:center;gap:.45em;color:var(--indigo)}
.ter .ico{display:block}
.ter svg{width:2em;height:2em}
.ter b{font-size:.5em;letter-spacing:.12em;font-weight:700}
.rejilla{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.9em;width:100%;height:100%}
.tarj{background:var(--crema);border-radius:1.2em;padding:1em 1.2em;display:flex;flex-direction:column;
      justify-content:space-between;border:.04em solid var(--linea)}
.tarj .num{font-size:.62em;font-weight:700;color:var(--coral-hondo);letter-spacing:.06em}
.tarj b{font-size:.86em;font-weight:600;line-height:1.2}
.franja{position:absolute;left:0;right:0;top:0;height:.32em;background:var(--coral)}
.rotulo{font-size:.5em;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
        color:var(--indigo);margin-bottom:1.1em}
.tab{border-collapse:collapse;font-size:.58em;width:80%;margin-top:1.4em}
.tab th{background:var(--indigo);color:#fff;text-align:left;padding:.65em .9em;font-weight:600;font-size:1em}
.tab td{padding:.6em .9em;border-bottom:.06em solid var(--linea);font-variant-numeric:tabular-nums}
.tab td:last-child{text-align:right}
.formula{display:flex;align-items:center;gap:.55em;flex-wrap:nowrap}
.bloque{border-radius:.55em;padding:.75em .85em;font-size:.72em;font-weight:600;line-height:1.15;
        max-width:6.6em;text-align:center}
.bl-indigo{background:var(--indigo);color:#fff}
.bl-menta{background:var(--menta);color:#0B1F1A}
.bl-coral{background:var(--coral);color:#2A1005}
.signo{font-size:1.5em;font-weight:700;color:var(--tinta)}
.pie-formula{font-size:.8em;font-weight:600;color:var(--gris);margin-top:1.1em;letter-spacing:.02em}
.letra{flex:0 0 30%;align-self:stretch;border-radius:1.4mm;display:flex;align-items:center;
       justify-content:center;font-size:4.4em;font-weight:700;line-height:1}
.lado{flex:1}
.ranura{display:inline-block;margin-top:1.1em;border:.09em dashed var(--linea);border-radius:.5em;
        padding:.9em 1.1em;font-size:.5em;color:var(--gris);text-align:center;line-height:1.5;letter-spacing:.04em}
.ranura.tel{border-radius:1.2em;padding:1.4em 1.6em}
.ranura.mono{font-variant-numeric:tabular-nums;color:var(--indigo);border-style:solid}
.barras{display:flex;align-items:flex-end;gap:3.6em;height:68%;margin-bottom:1.4em}
.bar{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:.5em}
.tallo{width:3.4em;border-radius:.3em .3em 0 0;display:block}
.b-indigo{background:var(--indigo)}
.b-coral{background:var(--coral)}
.bar .et{font-size:.52em;font-weight:600;letter-spacing:.06em;order:2}
.bar .tallo{order:1}

/* ── bloques de la página ── */
.copiar{border:.5mm solid var(--tinta);border-radius:1.5mm;padding:4mm 5mm;margin-top:5mm;background:#fff}
.copiar p{font-size:4.4mm;font-weight:600;line-height:1.3;letter-spacing:-.01em}
.dos{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-top:5mm}
.dos p{font-size:3.2mm;line-height:1.5;color:var(--tinta)}
.hablado{margin-top:5mm;border-left:.9mm solid var(--coral);padding-left:4mm}
.hablado p{font-size:3.3mm;line-height:1.55;color:var(--gris)}

.reglas{display:flex;flex-direction:column;gap:3.5mm;margin-bottom:2mm}
.regla{display:grid;grid-template-columns:9mm 1fr;gap:3mm;font-size:3.2mm;line-height:1.5;color:var(--gris)}
.regla b{color:var(--tinta);font-weight:700}
.rn{font-size:3.6mm;font-weight:700;color:var(--coral-hondo);font-variant-numeric:tabular-nums}
.paleta{display:grid;grid-template-columns:repeat(5,1fr);gap:3mm;margin-top:3mm}
.col-p{display:flex;flex-direction:column;gap:1.2mm}
.muestra{height:13mm;border-radius:1.2mm;border:.25mm solid rgba(26,21,51,.14);display:flex;align-items:flex-end;padding:1.6mm;
         font-size:2.7mm;font-weight:600;letter-spacing:.02em}
.col-p b{font-size:3.2mm;font-weight:700}
.uso{font-size:2.7mm;line-height:1.35;color:var(--gris)}
.tab.ancha{width:100%;font-size:3.1mm;margin-top:3mm}
.tab.ancha th{padding:2mm 3mm}
.tab.ancha td{padding:2mm 3mm}
.tab.ancha td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.aviso{margin-top:5mm;background:var(--indigo);color:#fff;border-radius:1.5mm;padding:4mm 5mm;
       font-size:3.2mm;line-height:1.5}
.aviso b{font-weight:700}

.indice{width:100%;border-collapse:collapse;font-size:3.1mm}
.indice td{padding:1.7mm 2mm;border-bottom:.25mm solid var(--linea);vertical-align:baseline}
.ix-n{width:9mm;font-weight:700;color:var(--coral-hondo);font-variant-numeric:tabular-nums}
.ix-s{width:38mm;font-weight:600}
.ix-t{color:var(--gris)}
.ix-w{width:10mm;text-align:right;color:var(--gris);font-variant-numeric:tabular-nums}
.reparto{display:flex;flex-direction:column;gap:2.4mm;margin-top:3mm;margin-bottom:1mm}
.rep{display:grid;grid-template-columns:52mm 26mm 1fr;gap:3mm;font-size:3.1mm;align-items:baseline}
.rep b{font-weight:600}
.rep-cual{font-weight:700;color:var(--indigo)}
.rep-por{color:var(--gris);line-height:1.4}
.qa{display:flex;flex-direction:column;gap:4mm;margin-top:4mm}
.par b{display:block;font-size:3.6mm;font-weight:700;line-height:1.3;margin-bottom:1.2mm}
.par p{font-size:3.2mm;line-height:1.5;color:var(--gris)}
`;

const HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>NERA · guía de presentación</title><style>${CSS}</style></head><body>
${PORTADA}
${COMO}
${INDICE}
${g.laminas.map(pagLamina).join('\n')}
${PREGUNTAS}
</body></html>`;

/* ── la versión web ────────────────────────────────────────────────────────
   La guía está compuesta para A4. En un teléfono, 14 mm de margen se comen
   media pantalla y 3.2 mm de texto son 12 px. Así que la web NO se escala:
   se vuelve a componer en píxeles por debajo de 860 px. Escalar con transform
   o con zoom deja el texto en 5 px, que es lo mismo que no publicarla. */
const WEB = `
body{background:#EFE9E2;padding:0}
.pagina{margin:0 auto 6mm;box-shadow:0 1mm 4mm rgba(26,21,51,.16)}
.pagina:first-child{margin-top:6mm}
.bajar{position:sticky;top:0;z-index:9;display:block;background:var(--tinta);color:#fff;
       text-align:center;padding:11px 14px;font:600 14px/1.3 var(--sans);text-decoration:none;
       letter-spacing:.01em}
.bajar b{font-weight:700}

@media screen and (max-width:860px){
  .pagina{width:100%;height:auto;min-height:0;padding:26px 20px 30px;margin:0 0 14px;
          box-shadow:none;border-bottom:1px solid var(--linea)}
  h1{font-size:76px}
  h2{font-size:30px;margin:10px 0 14px}
  h3{font-size:19px;margin:22px 0 6px}
  .eyebrow,.cuenta{font-size:11px}
  .et-bloque{font-size:10px}
  .cab{border-bottom-width:2px;padding-bottom:7px}
  .nota,.dos p,.regla,.hablado p,.par p,.rep,.uso,.tapa-nota,.aviso{font-size:14px}
  .copiar{padding:14px 16px;margin-top:16px;border-width:2px;border-radius:6px}
  .copiar p{font-size:19px}
  .dos{grid-template-columns:1fr;gap:16px;margin-top:16px}
  .hablado{margin-top:16px;border-left-width:3px;padding-left:12px}
  .pie{font-size:11px;padding-top:10px}
  .diapo{font-size:min(4.6vw,22px);border-radius:8px;box-shadow:4px 4px 0 rgba(26,21,51,.10)}
  .tapa-alto{padding-top:8px}
  .tapa-sub{font-size:19px;margin-top:12px}
  .tapa-bajo{grid-template-columns:1fr;gap:20px;margin-top:34px;padding-bottom:0}
  .nombres{font-size:15px}
  .b1{width:300px;height:300px;right:-110px;top:120px}
  .b2{width:170px;height:170px;left:-60px;bottom:220px}
  .b3{width:80px;height:80px;right:60px;top:440px}
  .paleta{grid-template-columns:1fr 1fr;gap:10px}
  .muestra{height:44px;border-radius:5px;font-size:11px;padding:6px}
  .col-p b{font-size:14px}
  .uso{font-size:12px}
  .tab.ancha{font-size:13px}
  .tab.ancha th,.tab.ancha td{padding:7px 9px}
  .aviso{padding:14px 16px;border-radius:6px;margin-top:16px}
  .reglas{gap:12px}
  .regla{grid-template-columns:28px 1fr;gap:8px}
  .rn{font-size:15px}
  .indice{font-size:13px}
  .indice td{padding:7px 4px}
  .ix-s{width:auto}
  .ix-t{display:none}          /* la frase completa no cabe: está en su propia página */
  .ix-n{width:26px}
  .ix-w{width:26px}
  .rep{grid-template-columns:1fr;gap:2px;padding:8px 0;border-bottom:1px solid var(--linea)}
  .qa{gap:18px;margin-top:16px}
  .par b{font-size:16px;margin-bottom:5px}
}
`;

const WEB_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>NERA · guía de presentación</title>
<meta name="description" content="Las 16 láminas del proyecto NERA: el texto exacto de cada una, cómo debe verse y qué buscar en Canva gratis.">
<style>${CSS}${WEB}</style></head><body>
<a class="bajar" href="NERA-guia-presentacion.pdf">Bajar la guía en <b>PDF</b> — 20 páginas, lista para imprimir</a>
${PORTADA}
${COMO}
${INDICE}
${g.laminas.map(pagLamina).join('\n')}
${PREGUNTAS}
</body></html>`;
fs.writeFileSync(path.join(AQUI, 'index.html'), WEB_HTML);
console.log(`index.html   — ${(WEB_HTML.length / 1024).toFixed(0)} KB · la que se publica`);

const salidaHtml = path.join(AQUI, 'guia.html');
fs.writeFileSync(salidaHtml, HTML);
console.log(`guia.html — ${(HTML.length / 1024).toFixed(0)} KB · ${g.laminas.length + 4} páginas`);

/* ── imprimir, y comprobar que nada se salió de la hoja ──────────────────── */

const pw = await import('/home/user/mazi-central/node_modules/playwright/index.js');
const chromium = pw.chromium ?? pw.default.chromium;   // playwright es CommonJS: el named export no siempre llega
// el Chromium empaquetado con este playwright no está bajado; el del contenedor sí
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const hoja = await nav.newPage();
const fallos = [];
hoja.on('pageerror', (e) => fallos.push('error de página: ' + e.message));
await hoja.goto('file://' + salidaHtml, { waitUntil: 'load' });
await hoja.evaluate(() => document.fonts.ready);

const derrames = await hoja.evaluate(() => {
  const malas = [];
  document.querySelectorAll('.pagina').forEach((p, i) => {
    const caja = p.getBoundingClientRect();
    let fondo = 0;
    p.querySelectorAll('*').forEach((h) => {
      const r = h.getBoundingClientRect();
      if (r.height && r.bottom > fondo) fondo = r.bottom;
    });
    const sobra = fondo - (caja.bottom - 1);
    if (sobra > 1) malas.push({ pagina: i + 1, px: Math.round(sobra) });
  });
  return malas;
});

const tipoOk = await hoja.evaluate(() => document.fonts.check('700 40px Plex'));
if (!tipoOk) fallos.push('la tipografía Plex no cargó: el PDF saldría con otra letra');
for (const d of derrames) fallos.push(`la página ${d.pagina} se desborda ${d.px} px por abajo`);

if (fallos.length) {
  console.error('\nLA GUÍA NO PASA:');
  for (const f of fallos) console.error('  ✗ ' + f);
  await nav.close();
  process.exit(1);
}

const pdf = path.join(AQUI, 'NERA-guia-presentacion.pdf');
await hoja.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await nav.close();

const kb = (fs.statSync(pdf).size / 1024).toFixed(0);
console.log(`✓ tipografía incrustada y cargada`);
console.log(`✓ ninguna página se desborda`);
console.log(`✓ ninguna lámina pasa de 15 palabras (máximo: ${Math.max(...g.laminas.map((l) => palabras(l.pantalla)))})`);
console.log(`NERA-guia-presentacion.pdf — ${kb} KB`);
