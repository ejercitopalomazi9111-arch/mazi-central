# Implementación completa

HTML autónomo, sin framework, sin build, sin CDN. Copiable y adaptable.

Corrige los dos errores que traen casi todos los tutoriales: reasignar `img.src` en cada
fotograma (vuelve a pedir la imagen) y dibujar fuera de `requestAnimationFrame` (parpadea).

```html
<style>
  html { height: 100vh; }
  body { height: 500vh; margin: 0; background: #0E1311; }   /* 5 pantallas de recorrido */
  #cine {
    position: fixed; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    max-width: 100%; max-height: 100vh;
  }
  #cargando {
    position: fixed; inset: 0; display: grid; place-items: center;
    background: #0E1311; color: #E8E6DF; font: 600 13px system-ui;
    letter-spacing: .16em; text-transform: uppercase; transition: opacity .4s;
  }
</style>

<div id="cargando">Cargando <span id="pct">0</span>%</div>
<canvas id="cine"></canvas>

<script>
(function () {
  const lienzo = document.getElementById('cine');
  const ctx    = lienzo.getContext('2d', { alpha: false });
  const aviso  = document.getElementById('cargando');
  const pct    = document.getElementById('pct');

  // ── 1. ¿Qué versión toca? ────────────────────────────────────────────────
  // La secuencia completa es el caso MEJOR, no el caso base.
  const conn      = navigator.connection || {};
  const ahorra    = conn.saveData || /^(slow-)?2g$/.test(conn.effectiveType || '');
  const quieto    = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chico     = innerWidth < 768;

  if (quieto || ahorra) return imagenFija();   // una sola imagen y se acabó

  const CARPETA = chico ? 'fotogramas/720/' : 'fotogramas/1280/';
  const TOTAL   = chico ? 36 : 96;
  const ruta    = i => `${CARPETA}${String(i).padStart(4, '0')}.jpg`;

  // ── 2. Precarga REAL ─────────────────────────────────────────────────────
  // Se guardan los objetos Image. Nunca se vuelve a tocar .src: eso es lo que
  // hace que el navegador vuelva a pedir el archivo aunque esté en caché.
  const cuadros = new Array(TOTAL);
  let listos = 0;

  for (let i = 0; i < TOTAL; i++) {
    const img = new Image();
    img.onload = img.onerror = () => {
      listos++;
      pct.textContent = Math.round(listos / TOTAL * 100);
      if (listos === TOTAL) arrancar();
    };
    img.src = ruta(i + 1);
    cuadros[i] = img;
  }

  // ── 3. Tamaño del lienzo, con retina ─────────────────────────────────────
  function medir() {
    const base = cuadros[0];
    if (!base || !base.naturalWidth) return;
    const dpr   = Math.min(devicePixelRatio || 1, 2);      // más de 2x no se nota y sí pesa
    const ancho = Math.min(base.naturalWidth, innerWidth);
    const alto  = ancho * (base.naturalHeight / base.naturalWidth);

    lienzo.style.width  = ancho + 'px';
    lienzo.style.height = alto  + 'px';
    lienzo.width  = Math.round(ancho * dpr);
    lienzo.height = Math.round(alto  * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── 4. Scroll → fotograma ────────────────────────────────────────────────
  let ultimo = -1, pedido = false;

  function alScrollear() {
    if (pedido) return;                 // una sola pintada por cuadro de pantalla
    pedido = true;
    requestAnimationFrame(pintar);
  }

  function pintar() {
    pedido = false;
    const doc    = document.documentElement;
    const tope   = doc.scrollHeight - innerHeight;
    const avance = tope > 0 ? doc.scrollTop / tope : 0;
    const i      = Math.max(0, Math.min(TOTAL - 1, Math.floor(avance * TOTAL)));

    if (i === ultimo) return;           // no redibujar lo mismo
    ultimo = i;
    const img = cuadros[i];
    if (img && img.naturalWidth) {
      ctx.drawImage(img, 0, 0, lienzo.width / (Math.min(devicePixelRatio || 1, 2)),
                              lienzo.height / (Math.min(devicePixelRatio || 1, 2)));
    }
  }

  // ── 5. Resize con freno ──────────────────────────────────────────────────
  let temporizador;
  function alRedimensionar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { medir(); ultimo = -1; pintar(); }, 150);
  }

  function arrancar() {
    aviso.style.opacity = '0';
    setTimeout(() => aviso.remove(), 400);
    medir();
    ultimo = -1;
    pintar();
    addEventListener('scroll', alScrollear, { passive: true });
    addEventListener('resize', alRedimensionar);
  }

  // ── 6. La puerta de salida ───────────────────────────────────────────────
  function imagenFija() {
    aviso.remove();
    const img = new Image();
    img.onload = () => {
      lienzo.width = img.naturalWidth; lienzo.height = img.naturalHeight;
      lienzo.getContext('2d').drawImage(img, 0, 0);
    };
    img.src = 'fotogramas/portada.jpg';   // el fotograma más representativo
    document.body.style.height = '100vh';  // sin recorrido falso
  }
})();
</script>
```

---

## Preparar los fotogramas

```bash
# escritorio — 96 cuadros a 1280 de ancho
ffmpeg -i origen.mp4 -vf "fps=24,scale=1280:-2" -q:v 6 fotogramas/1280/%04d.jpg

# teléfono — 36 cuadros a 720
ffmpeg -i origen.mp4 -vf "fps=9,scale=720:-2" -q:v 7 fotogramas/720/%04d.jpg

# la imagen fija de respaldo
ffmpeg -i origen.mp4 -vf "select=eq(n\,40),scale=1280:-2" -vframes 1 fotogramas/portada.jpg

# pesar antes de subir — si escritorio pasa de 3 MB, hay que bajar calidad o cuadros
du -sh fotogramas/1280 fotogramas/720
```

**`-q:v`** va de 2 (mejor) a 31 (peor). Entre 6 y 8 suele ser el punto donde no se nota la
pérdida y el peso baja de verdad. Súbelo antes que quitar fotogramas: menos cuadros se siente
como tirones; más compresión casi no se ve.

**`scale=1280:-2`** — el `-2` mantiene la proporción y fuerza número par de píxeles, que es lo
que quieren los codificadores.

---

## Checklist antes de publicar

- [ ] Escritorio ≤ 3 MB · teléfono ≤ 800 KB
- [ ] `prefers-reduced-motion` cae a imagen fija
- [ ] Conexión lenta cae a imagen fija
- [ ] Barra de carga hasta el 100%, sin fotogramas en blanco
- [ ] Se ve nítido en retina (`devicePixelRatio`, tope de 2x)
- [ ] Rotar el teléfono no rompe nada
- [ ] Scroll hacia arriba va para atrás sin saltos
- [ ] Probado en el iPhone de Carlos, no sólo en headless
