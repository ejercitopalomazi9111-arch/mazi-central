/* taller.js — EL BARRIDO DE LOS ALFABETOS
 * ===========================================================================
 * La pieza que `sitio/PLAN.md` §6-ter llama "la pieza fuerte del sitio", y la
 * única que ninguna agencia puede copiar — no porque sea difícil de escribir,
 * sino porque hay que HABER CONSTRUIDO la fábrica de tipografías primero.
 *
 * Qué hace: al bajar, la palabra GRUPO MAZI recorre doce escrituras —sello de
 * la dinastía Qin, cartel de kabuki, gótica del siglo XIII, uncial, humanista,
 * griega…— hasta llegar a la nuestra. Las letras NO son imágenes: se calculan
 * con `herramientas/tipos.mjs`, el mismo código que fundió nuestra fuente.
 *
 * SCROLL COMO PERILLA, NO SECUESTRO (regla 3 de la casa):
 * la sección mide 340vh y dentro hay un bloque pegado. El scroll no se
 * intercepta ni se frena: sólo se lee la posición y se usa como el mando de una
 * línea de tiempo. Si Carlos se quiere ir, se va con un gesto largo. Si sube,
 * se deshace — que es lo que se siente caro.
 *
 * ANIME.JS, vendorizada (17 KB, MIT, `sitio/anime.min.js`). Nada de CDN: LA
 * REGLA §2. Se usa donde de verdad aporta —interpolar la línea de tiempo y
 * contar los números con su curva— no para lo que el navegador ya hace solo.
 * ===========================================================================*/
import { svg, ALFABETOS } from '../herramientas/tipos.mjs';

const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Doce escrituras, de la más vieja a la nuestra. El orden es el argumento:
   se empieza en el año 200 a.C. y se acaba en una letra que hicimos nosotros. */
const BARRIDO = [
  ['tensho',    'Sello Qin',        's. III a.C.', 'China'],
  ['sosho',     'Cursiva sosho',    's. IV',       'Japón'],
  ['uncial',    'Uncial',           's. IV',       'Roma'],
  ['kanteiryu', 'Kanteiryū',        's. XVIII',    'Japón'],
  ['textura',   'Textura quadrata', 's. XIII',     'Europa'],
  ['rotunda',   'Rotunda',          's. XIV',      'Italia'],
  ['humanista', 'Humanista',        's. XV',       'Florencia'],
  ['griego',    'Griego lapidario', 's. V a.C.',   'Atenas'],
  ['cercana',   'Cercana',          '—',           'oriente'],
  ['deco',      'Deco',             's. XX',       'París'],
  ['reactor',   'Reactor',          '2026',        'Grupo Mazi'],
  ['mazi',      'MAZI',             '2026',        'la nuestra'],
].filter(([id]) => ALFABETOS[id]);

const PALABRA = 'GRUPO MAZI';

/** Se dibujan todos una vez y se guardan. Calcular en cada cuadro sería tirar
 *  batería: la geometría no cambia, sólo cuál se está viendo. */
function precalcular() {
  return BARRIDO.map(([id, nombre, epoca, lugar]) => {
    let marca = '';
    try { marca = svg(PALABRA, { alfabeto: id }, '#E9E4E4', null); }
    catch (e) { marca = ''; }        // un alfabeto que truene no tumba el resto
    return { id, nombre, epoca, lugar, marca };
  }).filter(a => a.marca);
}

export function montarTaller(raiz) {
  const lienzo = raiz.querySelector('[data-letras]');
  const ficha  = raiz.querySelector('[data-ficha]');
  const barra  = raiz.querySelector('[data-progreso]');
  const conts  = [...raiz.querySelectorAll('[data-contar]')];
  if (!lienzo) return;

  const alfabetos = precalcular();
  if (!alfabetos.length) {
    // Si `tipos.mjs` no cargó, la sección lo DICE en vez de quedarse en blanco.
    raiz.querySelector('[data-si-falla]')?.removeAttribute('hidden');
    return;
  }

  // Una capa por alfabeto, todas encimadas. Cambiar de una a otra es cambiar
  // opacidad, que el navegador hace en la tarjeta gráfica; reemplazar el HTML
  // en cada cuadro daría tirones.
  lienzo.innerHTML = alfabetos.map((a, i) =>
    `<div class="capa-letras" data-i="${i}" style="opacity:${i ? 0 : 1}">${a.marca}</div>`
  ).join('');
  const capas = [...lienzo.querySelectorAll('.capa-letras')];

  const pintarFicha = (i) => {
    const a = alfabetos[i];
    ficha.innerHTML =
      `<span class="f-nom">${a.nombre}</span>` +
      `<span class="f-meta">${a.epoca} · ${a.lugar}</span>`;
  };
  pintarFicha(0);

  /* Los números cuentan UNA vez, al entrar en pantalla. anime.js aquí sí gana:
     la curva de desaceleración hace que se sienta un contador y no un reloj. */
  let contado = false;
  const contar = () => {
    if (contado || quieto) return;
    contado = true;
    conts.forEach(el => {
      const fin = +el.getAttribute('data-contar');
      const obj = { v: 0 };
      window.anime({
        targets: obj, v: fin, duration: 1500, easing: 'easeOutExpo',
        update: () => { el.textContent = Math.round(obj.v).toLocaleString('es-MX'); },
      });
    });
  };

  /* EL BARRIDO. `p` es 0..1 dentro de la sección. De ahí sale qué alfabeto se
     ve y cuánto del siguiente se está asomando — así el cambio es continuo y
     no un salto de uno a otro. */
  let ultimo = -1;
  const paso = () => {
    const r = raiz.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;

    const escala = p * (alfabetos.length - 1);
    const i = Math.min(alfabetos.length - 1, Math.floor(escala));
    const mezcla = escala - i;

    capas.forEach((c, k) => {
      c.style.opacity = k === i ? (1 - mezcla) : (k === i + 1 ? mezcla : 0);
    });
    if (barra) barra.style.transform = `scaleX(${p.toFixed(4)})`;
    if (i !== ultimo) { ultimo = i; pintarFicha(i); }

    if (r.top < innerHeight * 0.6) contar();
    requestAnimationFrame(paso);
  };

  if (quieto) {
    // Sin movimiento: se enseña la nuestra, que es el final del argumento.
    capas.forEach((c, k) => { c.style.opacity = k === capas.length - 1 ? 1 : 0; });
    pintarFicha(alfabetos.length - 1);
    conts.forEach(el => { el.textContent = (+el.getAttribute('data-contar')).toLocaleString('es-MX'); });
  } else {
    paso();
  }
}
