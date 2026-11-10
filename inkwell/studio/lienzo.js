/* INKWELL Studio · el lienzo del cómic: cómo se dibuja cada capa.
   Una sola función (`dibujar`) pinta la página en la pantalla, en las miniaturas y al exportar,
   así lo que ves es exactamente lo que sale en el PNG o el PDF.

   capa = { id, tipo, x, y, w, h, rot (grados), flip, opac (0-1), oculta,
            filtro: { brillo, contraste, sat, desenfoque, sepia, gris } (100 = normal),
            … y lo de cada tipo:
            imagen:   { src | archivo (id de un Blob en obra.archivos) }
            personaje:{ quien, pose }
            lpc:      { partes: { cuerpo, cabeza, pelo, arriba, abajo, pies, encima }, anim, cuadro, dir }
            globo:    { estilo, texto, letra, tam, cola }
            texto:    { texto, letra, tam, color, borde, grosor, alinear, fondo }
            ono:      { texto, letra, color, borde, grosor }
            marco:    { grosor, color, relleno } } */

export const RAIZ_ARTE = new URL('./arte/', import.meta.url).href;

/* ── personajes con poses (Kenney · Toon Characters, CC0) ── */
export const PERSONAJES = [
  ['female-person', 'Chica'], ['male-person', 'Chico'], ['female-adventurer', 'Aventurera'],
  ['male-adventurer', 'Aventurero'], ['robot', 'Robot'], ['zombie', 'Zombi'],
];
export const POSES = [
  ['idle', 'De pie'], ['talk', 'Hablando'], ['think', 'Pensando'], ['show', 'Mostrando'], ['wide', 'Brazos abiertos'],
  ['cheer0', 'Festejando'], ['cheer1', 'Festejando 2'], ['behindBack', 'Manos atrás'], ['side', 'De lado'], ['back', 'De espaldas'],
  ['interact', 'Tocando algo'], ['hold', 'Cargando'], ['drag', 'Arrastrando'], ['shove', 'Empujando'], ['shoveBack', 'Empujado'],
  ['walk0', 'Caminando'], ['walk2', 'Caminando 2'], ['walk4', 'Caminando 3'], ['walk6', 'Caminando 4'],
  ['run0', 'Corriendo'], ['run1', 'Corriendo 2'], ['run2', 'Corriendo 3'], ['jump', 'Saltando'], ['fall', 'Cayendo'],
  ['fallDown', 'Tirado'], ['duck', 'Agachado'], ['down', 'Hacia abajo'], ['slide', 'Barriéndose'], ['hurt', 'Lastimado'], ['hit', 'Golpeado'],
  ['attack0', 'Golpe'], ['attack1', 'Golpe 2'], ['attack2', 'Golpe 3'], ['kick', 'Patada'], ['attackKick', 'Patada voladora'],
  ['climb0', 'Trepando'], ['climb1', 'Trepando 2'], ['hang', 'Colgado'], ['rope', 'En la cuerda'], ['switch0', 'Jalando palanca'], ['switch1', 'Jalando palanca 2'],
  ['walk1', 'Paso 1'], ['walk3', 'Paso 2'], ['walk5', 'Paso 3'], ['walk7', 'Paso 4'],
];
export const srcPersonaje = (quien, pose) => `${RAIZ_ARTE}personajes/${quien}/${pose}.png`;

/* ── fondos ── */
export const FONDOS_KENNEY = [['castles', 'Castillos'], ['forest', 'Bosque'], ['desert', 'Desierto'], ['colorgrass', 'Pradera'],
  ['colorforest', 'Bosque de color'], ['colorfall', 'Otoño'], ['colordesert', 'Desierto de color'], ['empty', 'Cielo']];
export const srcFondoKenney = (k) => `${RAIZ_ARTE}fondos/kenney-${k}.png`;

/* ── vestidor (LPC, CC-BY-SA 3.0 / GPL 3.0): piezas por capas, con 4 vistas y 2 animaciones ── */
const C5 = ['black', 'blue', 'bluegray', 'brown', 'charcoal'];
export const COLORES = { black: 'Negro', blue: 'Azul', bluegray: 'Gris azulado', brown: 'Café', charcoal: 'Carbón', forest: 'Verde bosque', green: 'Verde',
  darkblue: 'Azul marino', _red: 'Rojo', brass: 'Latón', bronze: 'Bronce', '': 'Original' };
export const PIEZAS = {
  cuerpo: { nombre: 'Cuerpo', ops: [['body/male', 'Hombre'], ['body/female', 'Mujer'], ['body/child', 'Niño o niña'], ['body/muscular', 'Musculoso']] },
  cabeza: { nombre: 'Cabeza', ops: [['head/male', 'Hombre'], ['head/female', 'Mujer'], ['head/child', 'Infantil'], ['head/male_elderly', 'Señor'],
    ['head/female_elderly', 'Señora'], ['head/male_gaunt', 'Delgado'], ['head/male_plump', 'Llenito']] },
  pelo: { nombre: 'Peinado', ninguno: true, ops: [['hair/ponytail', 'Cola de caballo'], ['hair/braid', 'Trenza'], ['hair/bunches', 'Coletas'],
    ['hair/shoulderr', 'A los hombros'], ['hair/wavy', 'Ondulado']] },
  arriba: { nombre: 'Playera', ninguno: true, ops: [['top/longsleeve/male', 'Manga larga (H)'], ['top/longsleeve/female', 'Manga larga (M)'],
    ['top/longsleeve/teen', 'Manga larga (joven)'], ['top/shortsleeve/male', 'Manga corta (H)'], ['top/shortsleeve/female', 'Manga corta (M)'],
    ['top/shortsleeve/teen', 'Manga corta (joven)'], ['top/sleeveless/male', 'Sin mangas (H)', C5, true], ['top/sleeveless/female', 'Sin mangas (M)', C5, true]] },
  abajo: { nombre: 'Pantalón o falda', ninguno: true, ops: [['legs/pants/male', 'Pantalón (H)', ['', 'black', 'blue', 'bluegray', 'brown', 'charcoal', 'forest']],
    ['legs/pants/female', 'Pantalón (M)', ['_red', ...C5], true], ['legs/pants/thin', 'Pantalón delgado'], ['legs/pants/child', 'Pantalón infantil', ['black', 'blue', 'brown', 'darkblue', 'green'], true],
    ['legs/pantaloons/male', 'Bombachos (H)'], ['legs/pantaloons/thin', 'Bombachos (M)'], ['legs/skirt/male', 'Falda (H)'], ['legs/skirt/thin', 'Falda (M)']] },
  pies: { nombre: 'Calzado', ninguno: true, ops: [['feet/shoes/male', 'Zapatos (H)', ['', 'black', 'blue', 'bluegray', 'brass', 'bronze', 'brown']],
    ['feet/shoes/thin', 'Zapatos (M)', ['', 'black', 'blue', 'bluegray', 'brass', 'bronze', 'brown']], ['feet/male', 'Botas (H)'], ['feet/thin', 'Botas (M)']] },
  encima: { nombre: 'Delantal', ninguno: true, ops: [['apron/overalls/male', 'Overol (H)'], ['apron/overalls/female', 'Overol (M)'],
    ['apron/apron/male', 'Mandil (H)', [...C5, 'forest'], true], ['apron/apron/female', 'Mandil (M)', [...C5, 'forest'], true],
    ['apron/apron_full/female', 'Mandil largo', [...C5, 'forest'], true], ['apron/apron_half/female', 'Medio mandil', [...C5, 'forest'], true]] },
};
export const ORDEN_LPC = ['pelo:bg', 'cuerpo', 'pies', 'abajo', 'arriba', 'encima', 'cabeza', 'pelo:fg'];
export const DIRS = [['2', 'De frente'], ['3', 'A la derecha'], ['1', 'A la izquierda'], ['0', 'De espaldas']];
export const LPC_POSES = [['idle:0', 'Quieto'], ['idle:1', 'Respirando'], ...Array.from({ length: 8 }, (_, k) => [`walk:${k + 1}`, `Paso ${k + 1}`])];
const opcion = (pieza, base) => PIEZAS[pieza].ops.find((o) => o[0] === base);
/* el archivo de una pieza para una animación (si la pieza no la trae, se usa «caminar», cuadro 0) */
export function archivoLpc(pieza, valor, anim){
  if(!valor || !valor.base) return null;
  const op = opcion(pieza, valor.base); if(!op) return null;
  const [base, , colores, soloWalk] = op;
  const a = soloWalk ? 'walk' : anim;
  const capa = pieza === 'pelo' ? `${base}/adult/${valor.lado || 'fg'}` : base;
  const color = colores ? (valor.color ?? colores[0]) : '';
  const ruta = color ? `${capa}/${a}/${color}.png` : `${capa}/${a}.png`;
  return { src: `${RAIZ_ARTE}lpc/${ruta}`, anim: a };
}
export const PERSONAJE_LPC = () => ({ cuerpo: { base: 'body/female' }, cabeza: { base: 'head/female' }, pelo: { base: 'hair/ponytail' },
  arriba: { base: 'top/shortsleeve/female' }, abajo: { base: 'legs/pants/female', color: 'blue' }, pies: { base: 'feet/shoes/thin', color: 'brown' }, encima: null });

/* ── globos de diálogo ── */
export const GLOBOS = [['normal', 'Diálogo'], ['grito', 'Grito'], ['pensamiento', 'Pensamiento'], ['susurro', 'Susurro'], ['narracion', 'Narración']];
export const COLAS = [['abajo-izq', 'Abajo izq.'], ['abajo', 'Abajo'], ['abajo-der', 'Abajo der.'], ['arriba-izq', 'Arriba izq.'], ['arriba-der', 'Arriba der.'], ['ninguna', 'Sin cola']];
export const LETRAS = [['Archivo', 'Normal'], ['Bangers', 'Cómic'], ['Crimson Pro', 'Libro'], ['Gloock', 'Elegante']];

/* ── carga de imágenes (con memoria) ── */
const cache = new Map();
export function img(src){
  if(!cache.has(src)) cache.set(src, new Promise((ok) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }));
  return cache.get(src);
}
const blobUrls = new Map();
export function urlArchivo(obra, id){
  const b = obra.archivos?.[id]; if(!b) return null;
  if(!blobUrls.has(b)) blobUrls.set(b, URL.createObjectURL(b));
  return blobUrls.get(b);
}
export function fuentesDe(obra, capa){
  if(capa.tipo === 'imagen') return [capa.archivo ? urlArchivo(obra, capa.archivo) : capa.src].filter(Boolean);
  if(capa.tipo === 'personaje') return [srcPersonaje(capa.quien, capa.pose)];
  if(capa.tipo === 'lpc') return ORDEN_LPC.map((k) => { const [p, lado] = k.split(':'); const v = capa.partes[p]; return v ? archivoLpc(p, { ...v, lado }, capa.anim)?.src : null; }).filter(Boolean);
  return [];
}
export async function precargar(obra, pagina){
  await Promise.all(pagina.capas.flatMap((c) => fuentesDe(obra, c)).map(img));
  if(document.fonts){ try{ await Promise.all(['Bangers', 'Archivo', 'Crimson Pro', 'Gloock'].map((f) => document.fonts.load(`700 40px "${f}"`))); }catch{} }
}

/* ── dibujar ── */
const filtroCss = (f = {}) => {
  const p = [];
  if(f.brillo != null && f.brillo !== 100) p.push(`brightness(${f.brillo}%)`);
  if(f.contraste != null && f.contraste !== 100) p.push(`contrast(${f.contraste}%)`);
  if(f.sat != null && f.sat !== 100) p.push(`saturate(${f.sat}%)`);
  if(f.desenfoque) p.push(`blur(${f.desenfoque}px)`);
  if(f.sepia) p.push(`sepia(${f.sepia}%)`);
  if(f.gris) p.push(`grayscale(${f.gris}%)`);
  return p.join(' ') || 'none';
};
function partir(ctx, texto, ancho){
  const out = [];
  for(const par of String(texto || '').split('\n')){
    let linea = '';
    for(const pal of par.split(/\s+/)){
      const prueba = linea ? linea + ' ' + pal : pal;
      if(ctx.measureText(prueba).width > ancho && linea){ out.push(linea); linea = pal; } else linea = prueba;
    }
    out.push(linea);
  }
  return out;
}
function textoEnCaja(ctx, capa, w, h, { centro = true } = {}){
  const tam = capa.tam || 32;
  ctx.font = `${capa.letra === 'Bangers' ? 400 : 600} ${tam}px "${capa.letra || 'Archivo'}", sans-serif`;
  const lineas = partir(ctx, capa.texto, w);
  const alto = tam * 1.18, total = lineas.length * alto;
  ctx.textBaseline = 'middle'; ctx.textAlign = centro ? 'center' : (capa.alinear || 'left');
  const x = ctx.textAlign === 'center' ? 0 : ctx.textAlign === 'right' ? w / 2 : -w / 2;
  lineas.forEach((l, k) => {
    const y = -total / 2 + alto * (k + .5);
    if(capa.grosor){ ctx.lineJoin = 'round'; ctx.lineWidth = capa.grosor; ctx.strokeStyle = capa.borde || '#000'; ctx.strokeText(l, x, y); }
    ctx.fillStyle = capa.color || '#111'; ctx.fillText(l, x, y);
  });
}
function cola(ctx, capa, w, h){
  const c = capa.cola || 'abajo';
  if(c === 'ninguna' || capa.estilo === 'narracion') return null;
  const abajo = c.startsWith('abajo'), lado = c.endsWith('izq') ? -1 : c.endsWith('der') ? 1 : 0;
  const by = (abajo ? 1 : -1) * h / 2 * .82, bx = lado * w * .18;
  return { b1: [bx - w * .07, by], b2: [bx + w * .07, by], p: [bx + lado * w * .22, (abajo ? 1 : -1) * (h / 2 + h * .28)] };
}
function globo(ctx, capa, w, h){
  const st = capa.estilo || 'normal';
  ctx.lineWidth = Math.max(3, Math.min(w, h) * .025); ctx.strokeStyle = '#111'; ctx.fillStyle = st === 'narracion' ? '#FFF6D6' : '#fff';
  const t = cola(ctx, capa, w, h);
  ctx.beginPath();
  if(st === 'narracion'){ ctx.rect(-w / 2, -h / 2, w, h); }
  else if(st === 'grito'){
    const n = 18;
    for(let k = 0; k <= n * 2; k++){ const a = (k / (n * 2)) * Math.PI * 2, r = k % 2 ? .78 : 1; const px = Math.cos(a) * w / 2 * r, py = Math.sin(a) * h / 2 * r; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  } else if(st === 'pensamiento'){
    const n = 11;
    for(let k = 0; k < n; k++){ const a = (k / n) * Math.PI * 2, px = Math.cos(a) * w * .38, py = Math.sin(a) * h * .36; ctx.moveTo(px + w * .16, py); ctx.ellipse(px, py, w * .16, h * .2, 0, 0, Math.PI * 2); }
  } else ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  if(st === 'susurro') ctx.setLineDash([10, 8]);
  ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  if(st === 'pensamiento'){
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(0, 0, w * .4, h * .38, 0, 0, Math.PI * 2); ctx.fill();   // tapa las uniones de las nubes por dentro
    if(t){ [[.55, .08], [.8, .055]].forEach(([f, r]) => { ctx.beginPath(); ctx.arc(t.b1[0] + (t.p[0] - t.b1[0]) * f, t.b1[1] + (t.p[1] - t.b1[1]) * f, Math.min(w, h) * r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }); }
  } else if(t){
    ctx.beginPath(); ctx.moveTo(...t.b1); ctx.lineTo(...t.p); ctx.lineTo(...t.b2);
    if(st === 'susurro') ctx.setLineDash([10, 8]);
    ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(t.b1[0] + 3, t.b1[1] - ctx.lineWidth * Math.sign(t.p[1])); ctx.lineTo(t.b2[0] - 3, t.b2[1] - ctx.lineWidth * Math.sign(t.p[1]));
    ctx.strokeStyle = '#fff'; ctx.lineWidth *= 1.6; ctx.stroke();              // borra la raya entre el globo y su cola
  }
  textoEnCaja(ctx, { ...capa, color: '#111', grosor: 0 }, w * (st === 'narracion' ? .9 : .72), h);
}
function ono(ctx, capa, w, h){
  ctx.font = `400 ${h}px "${capa.letra || 'Bangers'}", sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const t = capa.texto || '¡POW!', m = ctx.measureText(t).width || 1;
  ctx.save(); ctx.scale(w / m, 1);
  if(capa.grosor){ ctx.lineJoin = 'round'; ctx.lineWidth = capa.grosor * m / w; ctx.strokeStyle = capa.borde || '#000'; ctx.strokeText(t, 0, h * .04); }
  ctx.fillStyle = capa.color || '#FFD400'; ctx.fillText(t, 0, h * .04);
  ctx.restore();
}
function lpc(ctx, obra, capa, w, h, imgs){
  ctx.imageSmoothingEnabled = false;
  const dir = +(capa.dir ?? 2);
  for(const k of ORDEN_LPC){
    const [p, lado] = k.split(':'); const v = capa.partes[p]; if(!v) continue;
    const f = archivoLpc(p, { ...v, lado }, capa.anim); if(!f) continue;
    const im = imgs.get(f.src); if(!im) continue;
    const cuadro = f.anim === capa.anim ? (capa.cuadro || 0) : 0;
    const fx = Math.min(cuadro, Math.floor(im.width / 64) - 1);
    ctx.drawImage(im, fx * 64, dir * 64, 64, 64, -w / 2, -h / 2, w, h);
  }
}
export async function dibujar(canvas, obra, pagina, { escala = 1, sinOcultas = false } = {}){
  await precargar(obra, pagina);
  const imgs = new Map();
  for(const c of pagina.capas) for(const s of fuentesDe(obra, c)) imgs.set(s, await img(s));
  const ctx = canvas.getContext('2d');
  const W = Math.round(pagina.ancho * escala), H = Math.round(pagina.alto * escala);
  if(canvas.width !== W) canvas.width = W; if(canvas.height !== H) canvas.height = H;
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
  ctx.fillStyle = pagina.fondo || '#fff'; ctx.fillRect(0, 0, pagina.ancho, pagina.alto);
  for(const c of pagina.capas){
    if(c.oculta && !sinOcultas) continue;
    ctx.save();
    ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.rotate((c.rot || 0) * Math.PI / 180); if(c.flip) ctx.scale(-1, 1);
    ctx.globalAlpha = c.opac ?? 1; ctx.filter = filtroCss(c.filtro);
    if(c.tipo === 'imagen' || c.tipo === 'personaje'){ const im = imgs.get(fuentesDe(obra, c)[0]); if(im) ctx.drawImage(im, -c.w / 2, -c.h / 2, c.w, c.h); }
    else if(c.tipo === 'lpc') lpc(ctx, obra, c, c.w, c.h, imgs);
    else if(c.tipo === 'globo') globo(ctx, c, c.w, c.h);
    else if(c.tipo === 'ono') ono(ctx, c, c.w, c.h);
    else if(c.tipo === 'texto'){
      if(c.fondo){ ctx.fillStyle = c.fondo; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); }
      textoEnCaja(ctx, c, c.w * .94, c.h, { centro: (c.alinear || 'center') === 'center' });
    } else if(c.tipo === 'marco'){
      if(c.relleno){ ctx.fillStyle = c.relleno; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); }
      ctx.lineWidth = c.grosor || 8; ctx.strokeStyle = c.color || '#111'; ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
    }
    ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}
/* ¿qué capa está bajo este punto? (de la de hasta arriba a la de hasta abajo) */
export function capaEn(pagina, x, y){
  for(let i = pagina.capas.length - 1; i >= 0; i--){
    const c = pagina.capas[i]; if(c.oculta || c.bloqueada) continue;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2, a = -(c.rot || 0) * Math.PI / 180;
    const dx = x - cx, dy = y - cy, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    if(Math.abs(lx) <= c.w / 2 && Math.abs(ly) <= c.h / 2) return c;
  }
  return null;
}
