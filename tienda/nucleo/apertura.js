/* ══════════════════════════════════════════════════════════════════════════
   LA APERTURA · el logo del negocio se arma al abrir la app
   ──────────────────────────────────────────────────────────────────────────
   Carlos mandó el logo de El Garaje del Barbero y sus piezas «para que hagas
   la animación de apertura de la app». Se arma así, en ~3 s:

     disco → el aro se dibuja alrededor → las cuerdas entran girando por los
     lados → caen las herramientas → la G y la B entran de los lados → la D
     cae de arriba con un destello → el nombre se escribe a lo largo del
     arco → el subtítulo → un brillo cruza todo el logo.

   DOS juegos de imágenes, y cada uno hace lo que el otro no puede:
   · Las PIEZAS SUELTAS que mandó Carlos (G, D, B, navaja, peine y los dos
     mangos de las tijeras)
     son las que vuelan: vienen enteras. Cortada del logo, la G trae un hueco
     donde la tapa la D; la de su hoja, no. marca/piezas.py calcula dónde cae
     cada una sobre el logo (giro, tamaño y lugar).
   · Las CAPAS cortadas del logo completo (marca/cortar.py) son las que se
     quedan: al aterrizar, cada pieza se funde con su capa, y como cada pixel
     del logo está en una sola capa, lo que queda al final es EXACTAMENTE el
     logo.

   Reglas, las mismas de la presentación genérica: una vez por sesión, se
   salta con un toque, y con «reducir movimiento» se ve el logo quieto.
   ═════════════════════════════════════════════════════════════════════════ */
const CAPAS = ['aro', 'cuerda-izq', 'cuerda-der', 'herramientas', 'g', 'b', 'd', 'titulo', 'subtitulo'];
const PIEZAS = ['navaja', 'peine', 'tijeras', 'mango', 'g', 'b', 'd'];
export const DURA = 3700;

/* Qué negocio tiene apertura propia. Se puede poner en la marca del negocio
   (`marca.apertura`) sin tocar código; la barbería de muestra ya la trae. */
const POR_NEGOCIO = { barberia: 'garaje' };
export function aperturaDe(n){
  const cual = n?.marca?.apertura || POR_NEGOCIO[n?.slug];
  return cual === 'garaje' ? cual : null;
}

/* Arma la apertura. Devuelve una promesa que se cumple al quitarse. */
export function apertura(n, { quieto = false } = {}){
  const base = new URL(`../marca/${aperturaDe(n)}/`, import.meta.url);
  const el = document.createElement('div');
  el.className = 'presentacion apertura' + (quieto ? ' quieta' : '');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', n?.nombre || 'Logo');
  el.innerHTML = `<div class="logo-armado">
      <div class="disco"></div>
      ${CAPAS.map((c) => `<img class="capa ${c}" alt="" src="${base}${c}.webp" decoding="async">`).join('')}
      <div class="brillo" style="--logo: url('${base}entero.webp')"></div>
    </div><span class="toca">Toca para entrar</span>`;
  document.body.append(el);

  // Dónde aterriza cada pieza suelta (lo calculó marca/piezas.py). Si no llega, la apertura sigue sólo con las capas.
  const lugares = fetch(`${base}piezas.json`).then((r) => r.ok ? r.json() : null).catch(() => null).then((l) => {
    if(!l || quieto) return;
    const logo = el.querySelector('.logo-armado'), brillo = el.querySelector('.brillo');
    for(const p of PIEZAS){
      const x = l[p]; if(!x) continue;
      const img = document.createElement('img');
      img.className = `pieza p-${p}`; img.alt = ''; img.decoding = 'async'; img.src = `${base}pieza-${p}.webp`;
      Object.assign(img.style, { left: x.x + '%', top: x.y + '%', width: x.w + '%', height: x.h + '%' });
      img.style.setProperty('--gira', `${x.giro || 0}deg`);
      logo.insertBefore(img, brillo);
    }
  });
  return new Promise((listo) => {
    let fuera = false;
    const quitar = () => {
      if(fuera) return; fuera = true;
      el.classList.add('sale');
      setTimeout(() => { el.remove(); listo(); }, 450);
    };
    el.addEventListener('click', quitar, { once: true });
    // Arranca cuando las capas ya están decodificadas: si corre antes, se ve
    // la animación en blanco y aparecen las piezas a medias. Si tardan más de
    // 1.5 s (red lenta), la apertura no vale la espera y se quita.
    const cargadas = lugares.then(() => Promise.all([...el.querySelectorAll('img')].map((i) => i.decode().catch(() => { throw new Error('capa'); }))));
    const tope = new Promise((_, mal) => setTimeout(() => mal(new Error('lenta')), 1500));
    Promise.race([cargadas, tope]).then(() => {
      if(fuera) return;
      el.classList.add('corre');
      setTimeout(quitar, quieto ? 1300 : DURA);
    }).catch(quitar);
  });
}
