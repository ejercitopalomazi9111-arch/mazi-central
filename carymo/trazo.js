/* trazo.js — EL MOTOR DE DIBUJO DE LOS APUNTES (tipo ibisPaint / Photoshop, para el teléfono)
 * ===========================================================================
 * Carlos, 13 nov: «en apuntes que se pueda dibujar con lápiz, pero que puedas cambiar el grosor, el
 * difuminado, la transparencia, color, punta que empiece delgado y termine grueso, o empiece delgado, el
 * centro sea grueso y el final delgado… como tinta de pluma… todos sus pinceles, la función de crearlos, la
 * función de editarlos… igual de Photoshop».
 *
 * Cómo pinta (lo mismo que hacen ibisPaint y Photoshop por dentro):
 *   · un trazo es una fila de SELLOS de la punta, uno cada «espaciado», a lo largo del camino del dedo;
 *   · cada sello mide tamaño × presión × afilado de entrada × afilado de salida. El de salida no se sabe
 *     hasta soltar, así que al soltar el trazo se vuelve a pintar entero con su final afilado;
 *   · el trazo se pinta en una hoja aparte y se pega a la capa con la OPACIDAD del pincel: así un trazo
 *     no se oscurece donde se cruza consigo mismo (el «flujo» es lo que sí se acumula);
 *   · capas con opacidad, visibilidad y modo (normal, multiplicar, pantalla, superponer);
 *   · deshacer guarda sólo el rectángulo que tocó cada trazo, no la página entera.
 * Con un dedo se dibuja; con dos, se mueve y se acerca la hoja.
 * ===========================================================================*/

const lim = (v, a, b) => Math.max(a, Math.min(b, v));

/* ── los pinceles de fábrica ── */
export const PINCELES = [
  { id: 'lapiz', nombre: 'Lápiz', forma: 'grano', tam: 5, opacidad: 90, flujo: 70, dureza: 80, espaciado: 12, entrada: 8, salida: 8, presion: 'ambos', minimo: 30, estabilizador: 20, dispersion: 0, angulo: 0, mezcla: 'normal' },
  { id: 'pluma', nombre: 'Pluma (tinta)', forma: 'redonda', tam: 7, opacidad: 100, flujo: 100, dureza: 100, espaciado: 6, entrada: 35, salida: 35, presion: 'tamano', minimo: 15, estabilizador: 35, dispersion: 0, angulo: 0, mezcla: 'normal' },
  { id: 'delgado-grueso', nombre: 'Delgado a grueso', forma: 'redonda', tam: 10, opacidad: 100, flujo: 100, dureza: 100, espaciado: 6, entrada: 80, salida: 0, presion: 'tamano', minimo: 10, estabilizador: 35, dispersion: 0, angulo: 0, mezcla: 'normal' },
  { id: 'rotulador', nombre: 'Rotulador', forma: 'redonda', tam: 9, opacidad: 100, flujo: 100, dureza: 92, espaciado: 6, entrada: 0, salida: 0, presion: 'ninguna', minimo: 100, estabilizador: 25, dispersion: 0, angulo: 0, mezcla: 'normal' },
  { id: 'resaltador', nombre: 'Resaltador', forma: 'plana', tam: 26, opacidad: 45, flujo: 100, dureza: 95, espaciado: 5, entrada: 0, salida: 0, presion: 'ninguna', minimo: 100, estabilizador: 50, dispersion: 0, angulo: 0, mezcla: 'multiplicar' },
  { id: 'caligrafia', nombre: 'Caligrafía', forma: 'plana', tam: 14, opacidad: 100, flujo: 100, dureza: 100, espaciado: 4, entrada: 10, salida: 20, presion: 'tamano', minimo: 40, estabilizador: 40, dispersion: 0, angulo: 45, mezcla: 'normal' },
  { id: 'pincel-suave', nombre: 'Pincel suave', forma: 'redonda', tam: 40, opacidad: 70, flujo: 18, dureza: 0, espaciado: 10, entrada: 0, salida: 0, presion: 'opacidad', minimo: 50, estabilizador: 20, dispersion: 0, angulo: 0, mezcla: 'normal' },
  { id: 'aerografo', nombre: 'Aerógrafo', forma: 'redonda', tam: 60, opacidad: 100, flujo: 6, dureza: 0, espaciado: 8, entrada: 0, salida: 0, presion: 'opacidad', minimo: 20, estabilizador: 0, dispersion: 0, angulo: 0, mezcla: 'normal' },
  { id: 'crayon', nombre: 'Crayón', forma: 'grano', tam: 18, opacidad: 95, flujo: 60, dureza: 70, espaciado: 14, entrada: 0, salida: 0, presion: 'tamano', minimo: 60, estabilizador: 10, dispersion: 6, angulo: 0, mezcla: 'normal' },
  { id: 'gis', nombre: 'Gis', forma: 'gis', tam: 14, opacidad: 90, flujo: 55, dureza: 60, espaciado: 16, entrada: 0, salida: 0, presion: 'tamano', minimo: 70, estabilizador: 10, dispersion: 4, angulo: 0, mezcla: 'normal' },
  { id: 'acuarela', nombre: 'Acuarela', forma: 'redonda', tam: 34, opacidad: 40, flujo: 30, dureza: 15, espaciado: 7, entrada: 20, salida: 30, presion: 'ambos', minimo: 40, estabilizador: 30, dispersion: 2, angulo: 0, mezcla: 'multiplicar' },
  { id: 'pixel', nombre: 'Pixel', forma: 'cuadrada', tam: 6, opacidad: 100, flujo: 100, dureza: 100, espaciado: 20, entrada: 0, salida: 0, presion: 'ninguna', minimo: 100, estabilizador: 0, dispersion: 0, angulo: 0, mezcla: 'normal' },
];
export const FORMAS = [['redonda', 'Redonda'], ['cuadrada', 'Cuadrada'], ['plana', 'Plana (caligrafía)'], ['grano', 'Grano (lápiz)'], ['gis', 'Gis']];
export const MODOS = [['source-over', 'Normal'], ['multiply', 'Multiplicar'], ['screen', 'Pantalla'], ['overlay', 'Superponer'], ['darken', 'Oscurecer'], ['lighten', 'Aclarar']];
export const FONDOS = [['blanco', 'Blanco'], ['cuadros', 'Cuadrícula'], ['rayas', 'Rayado'], ['puntos', 'Puntos'], ['crema', 'Crema'], ['pizarra', 'Pizarrón']];

/* ── las puntas: una imagen en blanco y transparencia, que luego se tiñe del color ── */
const puntas = new Map();
function punta(forma, dureza){
  const k = forma + ':' + Math.round(dureza / 5);
  if(puntas.has(k)) return puntas.get(k);
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const duro = lim(dureza / 100, 0, 1);
  if(forma === 'cuadrada'){ x.fillStyle = '#fff'; x.fillRect(S * .06, S * .06, S * .88, S * .88); }
  else if(forma === 'plana'){
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, '#fff'); g.addColorStop(lim(duro * .98, 0, .98), '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.save(); x.translate(S / 2, S / 2); x.scale(1, .28); x.translate(-S / 2, -S / 2); x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.fill(); x.restore();
  } else {
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, '#fff'); g.addColorStop(lim(duro * .98, 0, .98), '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.fill();
    if(forma === 'grano' || forma === 'gis'){
      /* el grano del papel: se le quitan puntitos al azar (repetible: siempre el mismo grano) */
      const d = x.getImageData(0, 0, S, S), p = d.data; let sem = 1234567;
      const az = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
      const cuanto = forma === 'gis' ? .62 : .42;
      for(let i = 0; i < p.length; i += 4){ const n = az(); if(n < cuanto) p[i + 3] *= n / cuanto * (forma === 'gis' ? .25 : .5); }
      x.putImageData(d, 0, 0);
    }
  }
  puntas.set(k, c); return c;
}
function tenida(forma, dureza, color){
  const base = punta(forma, dureza), c = document.createElement('canvas'); c.width = c.height = base.width;
  const x = c.getContext('2d'); x.drawImage(base, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}

/* ── pintar un trazo (lista de puntos {x, y, p}) en un contexto, con los afilados ── */
export function pintarTrazo(ctx, puntos, pincel, color, { final = true, desde = 0, estado = null } = {}){
  if(!puntos.length) return estado;
  const tip = (estado && estado.tip) || tenida(pincel.forma, pincel.dureza, color);
  const st = estado || { tip, dist: 0, resto: 0, i: 0, total: 0 };
  st.tip = tip;
  /* largo total (para el afilado de salida) */
  if(final){ let t = 0; for(let i = 1; i < puntos.length; i++) t += Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y); st.total = t; }
  const tam = pincel.tam, entrada = pincel.entrada / 100 * Math.max(40, tam * 8), salida = pincel.salida / 100 * Math.max(40, tam * 8);
  const minimo = lim((pincel.minimo ?? 30) / 100, 0, 1), flujo = lim(pincel.flujo / 100, .01, 1);
  const usaTam = pincel.presion === 'tamano' || pincel.presion === 'ambos', usaOp = pincel.presion === 'opacidad' || pincel.presion === 'ambos';
  const angulo = (pincel.angulo || 0) * Math.PI / 180, disp = (pincel.dispersion || 0) / 100;
  let sem = 99 + desde * 7; const az = () => (sem = (sem * 16807) % 2147483647) / 2147483647;
  const sello = (x, y, p, d) => {
    let f = usaTam ? minimo + (1 - minimo) * p : 1;
    if(entrada > 0) f *= Math.sqrt(lim(d / entrada, 0, 1)) * .92 + (d >= entrada ? .08 : .08 * lim(d / entrada, 0, 1));
    if(final && salida > 0) f *= Math.sqrt(lim((st.total - d) / salida, 0, 1));
    const w = Math.max(.6, tam * f);
    ctx.globalAlpha = flujo * (usaOp ? .25 + .75 * p : 1);
    let sx = x, sy = y;
    if(disp){ const a = az() * Math.PI * 2, r = az() * disp * w; sx += Math.cos(a) * r; sy += Math.sin(a) * r; }
    if(angulo || pincel.forma === 'grano' || pincel.forma === 'gis'){
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(pincel.forma === 'plana' ? angulo : az() * Math.PI * 2); ctx.drawImage(tip, -w / 2, -w / 2, w, w); ctx.restore();
    } else ctx.drawImage(tip, sx - w / 2, sy - w / 2, w, w);
  };
  const paso = Math.max(.5, tam * lim(pincel.espaciado / 100, .02, 2));
  let i = Math.max(1, st.i || 1);
  if(st.i === 0){ sello(puntos[0].x, puntos[0].y, puntos[0].p, 0); st.i = 1; i = 1; }
  for(; i < puntos.length; i++){
    const a = puntos[i - 1], b = puntos[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    let t = st.resto;
    while(t <= seg){
      const k = seg ? t / seg : 0;
      sello(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.p + (b.p - a.p) * k, st.dist + t);
      t += paso;
    }
    st.resto = t - seg; st.dist += seg;
  }
  st.i = puntos.length;
  ctx.globalAlpha = 1;
  return st;
}

/* una muestra del pincel (una S) para la lista y el editor */
export function muestra(canvas, pincel, color = '#2A1240'){
  const x = canvas.getContext('2d'), W = canvas.width, H = canvas.height; x.clearRect(0, 0, W, H);
  const pts = []; for(let k = 0; k <= 60; k++){ const u = k / 60; pts.push({ x: W * (.08 + .84 * u), y: H * (.5 + .28 * Math.sin(u * Math.PI * 2)), p: Math.sin(u * Math.PI) * .8 + .2 }); }
  const escala = Math.min(1, (H * .42) / Math.max(1, pincel.tam));
  const hoja = document.createElement('canvas'); hoja.width = W; hoja.height = H;
  pintarTrazo(hoja.getContext('2d'), pts, { ...pincel, tam: pincel.tam * escala }, color);
  x.globalAlpha = pincel.opacidad / 100; x.globalCompositeOperation = pincel.mezcla === 'multiplicar' ? 'multiply' : 'source-over'; x.drawImage(hoja, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
}

/* ── el lienzo de un apunte ── */
export function crearLienzoDibujo(caja, { ancho = 1080, alto = 1528, fondo = 'blanco', alCambiar } = {}){
  const dpr = Math.min(2, devicePixelRatio || 1);
  const vista = document.createElement('canvas'); vista.className = 'dib-vista'; vista.style.touchAction = 'none'; caja.append(vista);
  const vx = vista.getContext('2d');
  const nuevaHoja = () => { const c = document.createElement('canvas'); c.width = ancho; c.height = alto; return c; };
  const temp = nuevaHoja(), tx = temp.getContext('2d'), mezcla = nuevaHoja(), mx = mezcla.getContext('2d');
  let capas = [], actual = 0, uid = 0;
  const nuevaCapa = (nombre) => ({ id: 'c' + (++uid), nombre: nombre || `Capa ${uid}`, hoja: nuevaHoja(), visible: true, opacidad: 1, modo: 'source-over', bloqueada: false });
  capas.push(nuevaCapa('Capa 1'));
  let pincel = { ...PINCELES[1] }, color = '#2A1240', herramienta = 'pincel', papel = fondo;
  const cam = { s: 1, x: 0, y: 0 };
  const hechos = [], deshechos = []; let sucio = true;

  function medir(){
    const r = caja.getBoundingClientRect();
    vista.width = Math.max(1, Math.round(r.width * dpr)); vista.height = Math.max(1, Math.round(r.height * dpr));
    vista.style.width = r.width + 'px'; vista.style.height = r.height + 'px'; sucio = true;
  }
  function ajustar(){
    medir();
    const W = vista.width / dpr, H = vista.height / dpr, s = Math.min(W / ancho, H / alto) * .96;
    cam.s = s; cam.x = (W - ancho * s) / 2; cam.y = (H - alto * s) / 2; sucio = true;
  }
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { const ant = vista.width; medir(); if(!ant || ant < 4) ajustar(); }) : null;
  ro?.observe(caja);

  /* ── pintar la vista ── */
  function patronPapel(vx){
    vx.fillStyle = { blanco: '#FFFFFF', cuadros: '#FFFFFF', rayas: '#FFFFFF', puntos: '#FFFFFF', crema: '#FBF4E4', pizarra: '#1F3A30' }[papel] || '#fff';
    vx.fillRect(0, 0, ancho, alto);
    const linea = papel === 'pizarra' ? '#ffffff14' : '#7B8FC855';
    if(papel === 'cuadros'){ vx.strokeStyle = linea; vx.lineWidth = 1.2; vx.beginPath(); for(let x = 40; x < ancho; x += 40){ vx.moveTo(x, 0); vx.lineTo(x, alto); } for(let y = 40; y < alto; y += 40){ vx.moveTo(0, y); vx.lineTo(ancho, y); } vx.stroke(); }
    if(papel === 'rayas'){ vx.strokeStyle = linea; vx.lineWidth = 1.5; vx.beginPath(); for(let y = 120; y < alto; y += 48){ vx.moveTo(0, y); vx.lineTo(ancho, y); } vx.stroke(); vx.strokeStyle = '#E0526B66'; vx.beginPath(); vx.moveTo(110, 0); vx.lineTo(110, alto); vx.stroke(); }
    if(papel === 'puntos'){ vx.fillStyle = '#7B8FC877'; for(let x = 40; x < ancho; x += 40) for(let y = 40; y < alto; y += 40){ vx.beginPath(); vx.arc(x, y, 2, 0, Math.PI * 2); vx.fill(); } }
  }
  function pintar(){
    sucio = false;
    vx.setTransform(1, 0, 0, 1, 0, 0); vx.fillStyle = '#2A1A3D'; vx.fillRect(0, 0, vista.width, vista.height);
    vx.setTransform(cam.s * dpr, 0, 0, cam.s * dpr, cam.x * dpr, cam.y * dpr);
    vx.save(); vx.shadowColor = '#0008'; vx.shadowBlur = 24; vx.fillStyle = '#fff'; vx.fillRect(0, 0, ancho, alto); vx.restore();
    patronPapel(vx);
    vx.imageSmoothingEnabled = cam.s < 1.5 || pincel.forma !== 'cuadrada';
    capas.forEach((c, i) => {
      if(!c.visible) return;
      let hoja = c.hoja;
      if(i === actual && trazo){
        /* la capa con el trazo que se está haciendo encima (o restado, si es borrador) */
        mx.globalCompositeOperation = 'copy'; mx.globalAlpha = 1; mx.drawImage(c.hoja, 0, 0);
        mx.globalCompositeOperation = herramienta === 'borrador' ? 'destination-out' : pincel.mezcla === 'multiplicar' ? 'multiply' : 'source-over';
        mx.globalAlpha = pincel.opacidad / 100; mx.drawImage(temp, 0, 0); mx.globalAlpha = 1; mx.globalCompositeOperation = 'source-over';
        hoja = mezcla;
      }
      vx.globalAlpha = c.opacidad; vx.globalCompositeOperation = c.modo; vx.drawImage(hoja, 0, 0);
    });
    vx.globalAlpha = 1; vx.globalCompositeOperation = 'source-over';
  }
  let vivo = true;
  (function bucle(){ if(!vivo) return; if(sucio && vista.width > 4) pintar(); requestAnimationFrame(bucle); })();

  /* ── el dedo ── */
  const dedos = new Map(); let trazo = null, gesto = null;
  const aHoja = (e) => { const r = vista.getBoundingClientRect(); return { x: (e.clientX - r.left - cam.x) / cam.s, y: (e.clientY - r.top - cam.y) / cam.s }; };
  function presionDe(e, prev){
    if(e.pointerType === 'pen' && e.pressure > 0) return lim(e.pressure, .05, 1);
    if(!prev) return .55;
    /* sin lápiz: más rápido = más delgado, como en ibisPaint */
    const v = Math.hypot(e.clientX - prev.cx, e.clientY - prev.cy) / Math.max(1, e.timeStamp - prev.t);
    return lim(1 - v * .28, .25, 1) * .8 + prev.p * .2;
  }
  vista.addEventListener('pointerdown', (e) => {
    vista.setPointerCapture?.(e.pointerId);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if(dedos.size === 2){
      /* el segundo dedo: si apenas empezaba un trazo, se cancela y se vuelve gesto de mover/acercar */
      if(trazo){ tx.clearRect(0, 0, ancho, alto); trazo = null; sucio = true; }
      const [a, b] = [...dedos.values()];
      gesto = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, s: cam.s, x: cam.x, y: cam.y };
      return;
    }
    if(dedos.size > 2) return;
    const h = aHoja(e);
    if(herramienta === 'mano'){ gesto = { mano: true, x0: e.clientX, y0: e.clientY, x: cam.x, y: cam.y }; return; }
    if(herramienta === 'gotero'){ const c = colorEn(h.x, h.y); if(c){ color = c; alCambiar?.('color', c); } return; }
    if(herramienta === 'cubeta'){ rellenar(Math.round(h.x), Math.round(h.y)); return; }
    if(capas[actual].bloqueada){ alCambiar?.('aviso', 'Esa capa está bloqueada.'); return; }
    const p = presionDe(e, null);
    trazo = { pts: [{ x: h.x, y: h.y, p }], suave: { x: h.x, y: h.y }, prev: { cx: e.clientX, cy: e.clientY, t: e.timeStamp, p }, estado: null, minX: h.x, minY: h.y, maxX: h.x, maxY: h.y };
    tx.clearRect(0, 0, ancho, alto);
    trazo.estado = pintarTrazo(tx, trazo.pts, pincel, herramienta === 'borrador' ? '#000' : color, { final: false });
    sucio = true;
  });
  vista.addEventListener('pointermove', (e) => {
    if(!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if(gesto && gesto.mano){ cam.x = gesto.x + e.clientX - gesto.x0; cam.y = gesto.y + e.clientY - gesto.y0; sucio = true; return; }
    if(gesto && dedos.size >= 2){
      const [a, b] = [...dedos.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const s = lim(gesto.s * d / Math.max(10, gesto.d), .15, 12), r = vista.getBoundingClientRect();
      /* el punto entre los dos dedos se queda debajo de los dedos */
      const hx = (gesto.cx - r.left - gesto.x) / gesto.s, hy = (gesto.cy - r.top - gesto.y) / gesto.s;
      cam.s = s; cam.x = cx - r.left - hx * s; cam.y = cy - r.top - hy * s; sucio = true; return;
    }
    if(!trazo) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const k = 1 - lim((pincel.estabilizador || 0) / 100, 0, .92);
    for(const ev of (evs.length ? evs : [e])){
      const h = aHoja(ev), p = presionDe(ev, trazo.prev);
      trazo.prev = { cx: ev.clientX, cy: ev.clientY, t: ev.timeStamp, p };
      trazo.suave.x += (h.x - trazo.suave.x) * k; trazo.suave.y += (h.y - trazo.suave.y) * k;
      trazo.pts.push({ x: trazo.suave.x, y: trazo.suave.y, p });
      trazo.minX = Math.min(trazo.minX, trazo.suave.x); trazo.minY = Math.min(trazo.minY, trazo.suave.y); trazo.maxX = Math.max(trazo.maxX, trazo.suave.x); trazo.maxY = Math.max(trazo.maxY, trazo.suave.y);
    }
    trazo.estado = pintarTrazo(tx, trazo.pts, pincel, herramienta === 'borrador' ? '#000' : color, { final: false, estado: trazo.estado });
    sucio = true;
  });
  const soltar = (e) => {
    dedos.delete(e.pointerId);
    if(dedos.size < 2 && gesto && !gesto.mano){ gesto = null; return; }
    if(gesto && gesto.mano){ gesto = null; return; }
    if(!trazo || dedos.size) return;
    /* al soltar se vuelve a pintar entero, ahora sí con el final afilado */
    tx.clearRect(0, 0, ancho, alto);
    pintarTrazo(tx, trazo.pts, pincel, herramienta === 'borrador' ? '#000' : color, { final: true });
    const m = pincel.tam + 4, caja0 = { x: Math.max(0, Math.floor(trazo.minX - m)), y: Math.max(0, Math.floor(trazo.minY - m)) };
    caja0.w = Math.min(ancho, Math.ceil(trazo.maxX + m)) - caja0.x; caja0.h = Math.min(alto, Math.ceil(trazo.maxY + m)) - caja0.y;
    if(caja0.w > 0 && caja0.h > 0){
      const cx = capas[actual].hoja.getContext('2d');
      const antes = cx.getImageData(caja0.x, caja0.y, caja0.w, caja0.h);
      cx.globalCompositeOperation = herramienta === 'borrador' ? 'destination-out' : pincel.mezcla === 'multiplicar' ? 'multiply' : 'source-over';
      cx.globalAlpha = pincel.opacidad / 100; cx.drawImage(temp, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
      guardarPaso(capas[actual], caja0, antes);
    }
    tx.clearRect(0, 0, ancho, alto); trazo = null; sucio = true;
  };
  vista.addEventListener('pointerup', soltar); vista.addEventListener('pointercancel', soltar);
  vista.addEventListener('wheel', (e) => {
    e.preventDefault(); const r = vista.getBoundingClientRect(), mx0 = e.clientX - r.left, my0 = e.clientY - r.top;
    const s = lim(cam.s * Math.exp(-e.deltaY * .0015), .15, 12), hx = (mx0 - cam.x) / cam.s, hy = (my0 - cam.y) / cam.s;
    cam.s = s; cam.x = mx0 - hx * s; cam.y = my0 - hy * s; sucio = true;
  }, { passive: false });

  /* ── deshacer: sólo el rectángulo que cambió ── */
  function guardarPaso(capa, c, antes){
    const despues = capa.hoja.getContext('2d').getImageData(c.x, c.y, c.w, c.h);
    hechos.push({ capa, c, antes, despues }); deshechos.length = 0;
    let bytes = 0; for(let i = hechos.length - 1; i >= 0; i--){ bytes += hechos[i].antes.data.length * 2; if(bytes > 160e6 || hechos.length - i > 50){ hechos.splice(0, i + 1); break; } }
    alCambiar?.('cambio');
  }
  function deshacer(){ const h = hechos.pop(); if(!h) return false; h.capa.hoja.getContext('2d').putImageData(h.antes, h.c.x, h.c.y); deshechos.push(h); sucio = true; alCambiar?.('cambio'); return true; }
  function rehacer(){ const h = deshechos.pop(); if(!h) return false; h.capa.hoja.getContext('2d').putImageData(h.despues, h.c.x, h.c.y); hechos.push(h); sucio = true; alCambiar?.('cambio'); return true; }

  /* ── cuentagotas y cubeta ── */
  function colorEn(x, y){
    if(x < 0 || y < 0 || x >= ancho || y >= alto) return null;
    const c = document.createElement('canvas'); c.width = c.height = 1; const k = c.getContext('2d');
    k.fillStyle = { crema: '#FBF4E4', pizarra: '#1F3A30' }[papel] || '#FFFFFF'; k.fillRect(0, 0, 1, 1);
    for(const cp of capas) if(cp.visible){ k.globalAlpha = cp.opacidad; k.globalCompositeOperation = cp.modo; k.drawImage(cp.hoja, x, y, 1, 1, 0, 0, 1, 1); }
    const [r, g, b] = k.getImageData(0, 0, 1, 1).data;
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function rellenar(x, y){
    const capa = capas[actual]; if(capa.bloqueada || x < 0 || y < 0 || x >= ancho || y >= alto) return;
    const cx = capa.hoja.getContext('2d'), img = cx.getImageData(0, 0, ancho, alto), d = img.data, antes = new ImageData(new Uint8ClampedArray(d), ancho, alto);
    const i0 = (y * ancho + x) * 4, base = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]], tol = 48;
    const [r, g, b] = [1, 3, 5].map((k) => parseInt(color.slice(k, k + 2), 16));
    if(base[0] === r && base[1] === g && base[2] === b && base[3] === 255) return;
    const igual = (i) => Math.abs(d[i] - base[0]) + Math.abs(d[i + 1] - base[1]) + Math.abs(d[i + 2] - base[2]) + Math.abs(d[i + 3] - base[3]) <= tol;
    const visto = new Uint8Array(ancho * alto), pila = [[x, y]];
    let minX = x, minY = y, maxX = x, maxY = y;
    while(pila.length){
      let [px, py] = pila.pop(); let i = py * ancho + px;
      while(px >= 0 && !visto[i] && igual(i * 4)){ px--; i--; }
      px++; i++; let arriba = false, abajo = false;
      while(px < ancho && !visto[i] && igual(i * 4)){
        visto[i] = 1; const j = i * 4; d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = 255;
        if(px < minX) minX = px; if(px > maxX) maxX = px; if(py < minY) minY = py; if(py > maxY) maxY = py;
        if(py > 0){ const k = i - ancho; if(!visto[k] && igual(k * 4)){ if(!arriba){ pila.push([px, py - 1]); arriba = true; } } else arriba = false; }
        if(py < alto - 1){ const k = i + ancho; if(!visto[k] && igual(k * 4)){ if(!abajo){ pila.push([px, py + 1]); abajo = true; } } else abajo = false; }
        px++; i++;
      }
    }
    cx.putImageData(img, 0, 0);
    const c = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    const tmp = document.createElement('canvas'); tmp.width = ancho; tmp.height = alto; tmp.getContext('2d').putImageData(antes, 0, 0);
    guardarPaso(capa, c, tmp.getContext('2d').getImageData(c.x, c.y, c.w, c.h));
    sucio = true;
  }

  /* ── guardar y abrir ── */
  function componer(escala = 1){
    const c = document.createElement('canvas'); c.width = Math.round(ancho * escala); c.height = Math.round(alto * escala);
    const k = c.getContext('2d'); k.scale(escala, escala);
    patronPapel(k);   /* el mismo papel que se ve (cuadros, rayas…) */
    for(const cp of capas) if(cp.visible){ k.globalAlpha = cp.opacidad; k.globalCompositeOperation = cp.modo; k.drawImage(cp.hoja, 0, 0); }
    return c;
  }
  const aBlob = (c, tipo = 'image/png', q) => new Promise((ok) => c.toBlob(ok, tipo, q));
  async function guardar(){
    const capasG = [];
    for(const c of capas) capasG.push({ nombre: c.nombre, visible: c.visible, opacidad: c.opacidad, modo: c.modo, bloqueada: c.bloqueada, png: await aBlob(c.hoja) });
    return { ancho, alto, papel, actual, capas: capasG, miniatura: await aBlob(componer(.22), 'image/jpeg', .8) };
  }
  async function cargar(d){
    if(!d || !d.capas || !d.capas.length) return;
    papel = d.papel || papel; capas = [];
    for(const g of d.capas){
      const c = nuevaCapa(g.nombre); Object.assign(c, { visible: g.visible !== false, opacidad: g.opacidad ?? 1, modo: g.modo || 'source-over', bloqueada: !!g.bloqueada });
      if(g.png){ const bmp = await createImageBitmap(g.png); c.hoja.getContext('2d').drawImage(bmp, 0, 0); bmp.close?.(); }
      capas.push(c);
    }
    actual = lim(d.actual || 0, 0, capas.length - 1); hechos.length = 0; deshechos.length = 0; sucio = true; alCambiar?.('capas');
  }

  ajustar();
  return {
    vista,
    get pincel(){ return pincel; }, set pincel(p){ pincel = { ...p }; sucio = true; },
    get color(){ return color; }, set color(c){ color = c; },
    get herramienta(){ return herramienta; }, set herramienta(h){ herramienta = h; },
    get papel(){ return papel; }, set papel(p){ papel = p; sucio = true; },
    get capas(){ return capas; }, get actual(){ return actual; }, set actual(i){ actual = lim(i, 0, capas.length - 1); alCambiar?.('capas'); },
    agregarCapa(){ const c = nuevaCapa(); capas.splice(actual + 1, 0, c); actual += 1; sucio = true; alCambiar?.('capas'); return c; },
    borrarCapa(i = actual){ if(capas.length < 2) return false; capas.splice(i, 1); actual = lim(actual - (i <= actual ? 1 : 0), 0, capas.length - 1); for(let k = hechos.length - 1; k >= 0; k--) if(!capas.includes(hechos[k].capa)) hechos.splice(k, 1); sucio = true; alCambiar?.('capas'); return true; },
    moverCapa(i, dir){ const j = i + dir; if(j < 0 || j >= capas.length) return; [capas[i], capas[j]] = [capas[j], capas[i]]; if(actual === i) actual = j; else if(actual === j) actual = i; sucio = true; alCambiar?.('capas'); },
    duplicarCapa(i = actual){ const c = nuevaCapa(capas[i].nombre + ' copia'); c.hoja.getContext('2d').drawImage(capas[i].hoja, 0, 0); Object.assign(c, { opacidad: capas[i].opacidad, modo: capas[i].modo }); capas.splice(i + 1, 0, c); actual = i + 1; sucio = true; alCambiar?.('capas'); },
    combinarAbajo(i = actual){ if(i < 1) return; const ab = capas[i - 1].hoja.getContext('2d'); ab.globalAlpha = capas[i].opacidad; ab.globalCompositeOperation = capas[i].modo; ab.drawImage(capas[i].hoja, 0, 0); ab.globalAlpha = 1; ab.globalCompositeOperation = 'source-over'; capas.splice(i, 1); actual = i - 1; hechos.length = 0; deshechos.length = 0; sucio = true; alCambiar?.('capas'); },
    limpiarCapa(i = actual){ const c = capas[i], k = c.hoja.getContext('2d'), antes = k.getImageData(0, 0, ancho, alto); k.clearRect(0, 0, ancho, alto); guardarPaso(c, { x: 0, y: 0, w: ancho, h: alto }, antes); sucio = true; },
    refrescar(){ sucio = true; },
    deshacer, rehacer, get puedeDeshacer(){ return hechos.length > 0; }, get puedeRehacer(){ return deshechos.length > 0; },
    ajustar, guardar, cargar, componer, aBlob,
    destruir(){ vivo = false; ro?.disconnect(); vista.remove(); },
  };
}
