/* MAZI VR · Leer: INKWELL dentro del visor (Carlos, 18 nov: «para poder leer dentro de la VR»).
   El visor y INKWELL viven en la misma dirección, así que lee DIRECTO lo que ya está bajado en el teléfono:
     · Tiras (IndexedDB «inkwell-tiras»): Webtoon en imágenes y Wattpad en texto. Sólo los capítulos bajados.
     · Libros (IndexedDB «inkwell-libros»): EPUB y TXT. El PDF todavía no.
   Se lee en una ventana enfrente, en una tira continua que se arma sola capítulo tras capítulo (como «Leer seguido»).
   Lo leído se apunta igual que en INKWELL: la serie marca el capítulo, el historial de la Biblioteca lo cuenta y el
   libro guarda su avance; al volver a INKWELL ya aparece.

   Ojo al abrir las bases: si este visor las creara vacías, INKWELL ya no podría hacer las suyas (misma versión, nada
   que actualizar). Por eso se abren con el mismo esquema que usa INKWELL, igual que hace su inicio.

   Controles: sticks arriba/abajo leen (rápido o despacio según cuánto se empujen) · flechas, una pantalla ·
   X automático · L1/R1 capítulo · L2/R2 acercar/alejar · Círculo, a la biblioteca.
   Sin control: mirar la orilla de abajo (o arriba) de la ventana avanza; con las manos, igual apuntando. */
import { apuntar } from '../inkwell/biblioteca.js';
import { FUENTES, wattpad, limpiarTexto } from '../inkwell/fuentes.js';
import { pedir as porLaSala, recomendar } from '../inkwell/red.js';
import { seriesDeGenero } from '../inkwell/compartir.js';
import { crearAgarre, crearMoverConControl } from './agarre.js';

const COL = 900;                  // la columna virtual: todo lo de la tira se mide en px de esta columna
const FIN_H = 150;                // el letrero de fin de capítulo
const GUARDA = 'mazivr.lector';   // dónde ibas dentro del capítulo (por obra)

/* ── las bases de INKWELL ── */
const conexiones = {};
function abrirBase(nombre, crear){
  if(conexiones[nombre]) return Promise.resolve(conexiones[nombre]);
  return new Promise((ok) => {
    let q; try{ q = indexedDB.open(nombre, 1); }catch{ return ok(null); }
    q.onupgradeneeded = () => crear(q.result);
    q.onsuccess = () => { const d = q.result; conexiones[nombre] = d; d.onclose = () => { delete conexiones[nombre]; };
      d.onversionchange = () => { try{ d.close(); }catch{} delete conexiones[nombre]; }; ok(d); };
    q.onerror = () => ok(null); q.onblocked = () => ok(null);
  });
}
const BASES = {
  tiras: () => abrirBase('inkwell-tiras', (d) => { d.createObjectStore('series', { keyPath: 'id' }); d.createObjectStore('caps', { keyPath: 'clave' }).createIndex('serie', 'serie'); }),
  libros: () => abrirBase('inkwell-libros', (d) => d.createObjectStore('libros', { keyPath: 'id' })),
};
function pedir(d, tienda, fn, modo = 'readonly'){
  return new Promise((ok) => {
    if(!d) return ok(null);
    let t; try{ t = d.transaction(tienda, modo); }catch{ return ok(null); }
    const r = fn(t.objectStore(tienda)); t.oncomplete = () => ok(r ? r.result : null); t.onerror = () => ok(null); t.onabort = () => ok(null);
  });
}
/* lo guardado antes del 5 nov puede traer «&eacute;» (hasta dos veces) */
const limpio = (s) => { let a = String(s || ''); for(let i = 0; i < 3 && /&[#a-z0-9]+;/i.test(a); i++){ const t = document.createElement('textarea'); t.innerHTML = a; a = t.value; } return a; };
const leerGuardado = () => { try{ return JSON.parse(localStorage.getItem(GUARDA)) || {}; }catch{ return {}; } };
const escribirGuardado = (o) => { try{ localStorage.setItem(GUARDA, JSON.stringify(o)); }catch{} };

/* ── lo que hay para leer ── */
async function obrasBajadas(){
  const obras = [];
  /* todo de un jalón: una lectura por serie tardaba segundos con el teléfono ocupado pintando el visor */
  const [dt, dl] = await Promise.all([BASES.tiras(), BASES.libros()]);
  const [series, todas, libros] = await Promise.all([pedir(dt, 'series', (st) => st.getAll()), pedir(dt, 'caps', (st) => st.getAllKeys()), pedir(dl, 'libros', (st) => st.getAll())]);
  const claves = new Set(todas || []);
  for(const s of series || []){
    const caps = (s.caps || []).filter((c) => claves.has(`${s.id}:${c.n}`)).sort((a, b) => a.n - b.n);
    const leidos = new Set(s.leidos || []), porLeer = caps.filter((c) => !leidos.has(c.n) && c.n >= (s.desde || 0)).length;
    /* una serie que sigues pero sin nada bajado también sale: se baja desde aquí (Carlos, 18 nov) */
    obras.push({ id: s.id, tipo: 'tira', titulo: limpio(s.titulo), sub: !caps.length ? 'Sin bajar' : porLeer ? `${porLeer} por leer` : 'Al día', portada: s.portadaBlob, porLeer, orden: s.orden ?? 0,
      caps: caps.map((c) => ({ n: c.n, titulo: limpio(c.titulo) })) });
  }
  for(const l of libros || []){
    if(l.tipo === 'pdf' || !l.capitulos?.length) continue;
    obras.push({ id: l.id, tipo: 'libro', titulo: limpio(l.titulo), sub: `Libro · ${Math.round(100 * ((l.avance?.cap || 0) + (l.avance?.y || 0)) / l.capitulos.length)} %`,
      portada: l.portada instanceof Blob ? l.portada : null, porLeer: 0, abierto: l.abierto || l.agregado || 0,
      caps: l.capitulos.map((c, i) => ({ n: i + 1, titulo: limpio(c.titulo) || `Capítulo ${i + 1}` })) });
  }
  /* primero lo que tiene capítulos nuevos, luego el resto de las series, luego los libros (el último abierto arriba) */
  return obras.sort((a, b) => (b.porLeer > 0) - (a.porLeer > 0) || (a.tipo === 'libro') - (b.tipo === 'libro') || (a.tipo === 'libro' ? b.abierto - a.abierto : a.orden - b.orden));
}

/* ── texto (Wattpad y libros): renglones medidos una vez, pintados por tramos cuando se acercan ── */
const LETRA = { p: '400 34px Georgia, "Times New Roman", serif', h: '700 44px Georgia, "Times New Roman", serif' };
const INTER = { p: 53, h: 62 }, MARGEN = 64;
let medidor;
function maquetar(html){
  medidor ||= document.createElement('canvas').getContext('2d');
  const div = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html').body.firstElementChild;
  const SEL = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,hr';
  let bloques = [...div.querySelectorAll(SEL)].filter((e) => !e.querySelector(SEL));
  const lista = bloques.length ? bloques.map((e) => ({ tipo: /^H\d/.test(e.tagName) ? 'h' : e.tagName === 'HR' ? 'hr' : 'p', texto: e.textContent.replace(/\s+/g, ' ').trim() }))
    : (div.textContent || '').split(/\n\s*\n/).map((t) => ({ tipo: 'p', texto: t.replace(/\s+/g, ' ').trim() }));
  const renglones = []; let y = 40;
  for(const b of lista){
    if(b.tipo === 'hr'){ renglones.push({ y: y + 20, raya: true }); y += 70; continue; }
    if(!b.texto) continue;
    medidor.font = LETRA[b.tipo]; const max = COL - MARGEN * 2; let ren = '';
    const poner = (t) => { renglones.push({ y, t, tipo: b.tipo }); y += INTER[b.tipo]; };
    for(const w of b.texto.split(' ')){
      const t = ren ? ren + ' ' + w : w;
      if(medidor.measureText(t).width > max && ren){ poner(ren); ren = w; } else ren = t;
    }
    if(ren) poner(ren);
    y += b.tipo === 'h' ? 30 : 22;
  }
  return { renglones, alto: y + 30 };
}
/* los renglones se reparten en tramos de ~1400 px (una textura grande por capítulo no cabría en memoria) */
function tramosDeTexto(m, THREE){
  const tramos = []; let ini = 0, desde = 0;
  const cortar = (hasta, fin) => { const lineas = m.renglones.slice(desde, fin); const h = hasta - ini; const y0 = ini;
    tramos.push({ h, hacer: () => {
      const cv = document.createElement('canvas'); cv.width = COL; cv.height = Math.max(1, Math.round(h)); const x = cv.getContext('2d');
      x.fillStyle = '#1A1024'; x.fillRect(0, 0, cv.width, cv.height); x.textBaseline = 'top';
      for(const l of lineas){
        if(l.raya){ x.fillStyle = '#5A3F75'; x.fillRect(COL / 2 - 60, l.y - y0, 120, 3); continue; }
        x.font = LETRA[l.tipo]; x.fillStyle = l.tipo === 'h' ? '#C77DFF' : '#EDE6F2'; x.fillText(l.t, MARGEN, l.y - y0);
      }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; } });
    ini = hasta; desde = fin; };
  for(let i = 0; i < m.renglones.length; i++) if(m.renglones[i].y - ini > 1400){ cortar(m.renglones[i].y - 8, i); }
  cortar(m.alto, m.renglones.length);
  return tramos;
}

/* ── la red y la bajada por detrás (Carlos, 18 nov: «muestra series y permite ponerlas a descargar en segundo plano
   mientras haces otras cosas»). Lo mismo que hace INKWELL (inkwell/tiras.js): Webtoon por el recadero de La Sala,
   Wattpad directo; y se guarda en la MISMA base, así INKWELL también lo ve (si se abre igual: ver PLAN.md) ── */
async function directo(u){
  let r = null;
  try{ r = await fetch(u); }catch{ r = null; }
  if(!r || r.type === 'opaque' || !r.ok) r = await porLaSala(u);
  return r;
}
const redDe = (fuente) => fuente === 'webtoon' ? porLaSala : directo;
async function compactar(b){
  try{ const bm = await createImageBitmap(b); let w = bm.width, h = bm.height; if(w > 900){ h = Math.round(h * 900 / w); w = 900; }
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(bm, 0, 0, w, h); bm.close?.();
    const r = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', .7)); c.width = c.height = 0; return { blob: r && r.size < b.size * .95 ? r : b, dims: [w, h] };
  }catch{ return { blob: b, dims: null }; }
}
async function bajarCap(s, c){
  const r = await FUENTES[s.fuente].capitulo(c, redDe(s.fuente));
  const reg = { clave: `${s.id}:${c.n}`, serie: s.id, n: c.n, titulo: c.titulo, tipo: r.tipo, bajado: Date.now(), compacto: true };
  if(r.tipo === 'imagenes'){
    reg.imgs = new Array(r.urls.length); reg.dims = new Array(r.urls.length); let sig = 0;
    const obrero = async () => { while(sig < r.urls.length){ const i = sig++; const { blob, dims } = await compactar(await (await porLaSala(r.urls[i])).blob()); reg.imgs[i] = blob; reg.dims[i] = dims; } };
    await Promise.all([obrero(), obrero(), obrero(), obrero()]);
  } else reg.html = limpiarTexto(r.html);
  await pedir(await BASES.tiras(), 'caps', (st) => st.put(reg), 'readwrite');
  return reg;
}
const ADELANTE = 3;    // capítulos sin leer que se dejan listos por serie
const bajada = { cola: [], corriendo: false, progreso: {}, alTerminar: [] };
function encolar(s, caps){
  const ya = new Set(bajada.cola.map((x) => `${x.s.id}:${x.c.n}`)); let n = 0;
  for(const c of caps) if(!ya.has(`${s.id}:${c.n}`)){ bajada.cola.push({ s, c }); n++; }
  if(n){ const p = bajada.progreso[s.id] || (bajada.progreso[s.id] = { hechos: 0, total: 0, titulo: limpio(s.titulo) }); p.total += n; }
  correrBajada(); return n;
}
async function correrBajada(){
  if(bajada.corriendo) return; bajada.corriendo = true;
  try{
    while(bajada.cola.length){
      if(navigator.onLine === false){ await new Promise((ok) => setTimeout(ok, 5000)); continue; }
      const { s, c } = bajada.cola.shift(), p = bajada.progreso[s.id];
      let bien = true, error = null;
      try{ await bajarCap(s, c); if(p) p.hechos++; }catch(e){ bien = false; error = e; console.warn('bajar', s.id, c.n, e); if(p) p.total--; }
      /* primero se cierra la cuenta y luego se avisa: si no, el último capítulo nunca decía «Listo» ni refrescaba el estante */
      if(p && p.hechos >= p.total) delete bajada.progreso[s.id];
      bajada.alTerminar.forEach((f) => f(s, c, bien, error));
    }
  } finally { bajada.corriendo = false; }
}
/* tener listos los siguientes ADELANTE capítulos de cada serie; la lista de capítulos se revisa cada 6 h */
async function ponerAlDia(){
  if(navigator.onLine === false) return;
  const dt = await BASES.tiras();
  for(const s of (await pedir(dt, 'series', (st) => st.getAll())) || []){
    if(!FUENTES[s.fuente] || !s.ref) continue;
    if(!s.revisada || Date.now() - s.revisada > 6 * 36e5){
      try{ const f = await FUENTES[s.fuente].serie(s.ref, redDe(s.fuente)); const fresca = (await pedir(dt, 'series', (st) => st.get(s.id))) || s; fresca.caps = f.caps; fresca.revisada = Date.now();
        await pedir(dt, 'series', (st) => st.put(fresca), 'readwrite'); Object.assign(s, fresca); }catch{}
    }
    const tengo = new Set((await pedir(dt, 'caps', (st) => st.index('serie').getAllKeys(s.id))) || []), leidos = new Set(s.leidos || []);
    const sinLeer = (s.caps || []).filter((c) => !leidos.has(c.n) && c.n >= (s.desde || 0)).sort((a, b) => a.n - b.n);
    const listos = sinLeer.filter((c) => tengo.has(`${s.id}:${c.n}`)).length;
    if(listos < ADELANTE) encolar(s, sinLeer.filter((c) => !tengo.has(`${s.id}:${c.n}`)).slice(0, ADELANTE - listos));
  }
}
async function seguirSerie(ref){
  const dt = await BASES.tiras(), s = await FUENTES[ref.fuente].serie(ref, redDe(ref.fuente));
  const ya = await pedir(dt, 'series', (st) => st.get(s.id));
  if(ya) return { s: ya, nueva: false };
  const todas = (await pedir(dt, 'series', (st) => st.getAll())) || [];
  Object.assign(s, { orden: todas.reduce((m, x) => Math.max(m, x.orden || 0), 0) + 1, leidos: [], desde: 0, revisada: Date.now(), agregada: Date.now() });
  try{ if(s.portada) s.portadaBlob = await (await redDe(s.fuente)(s.portada)).blob(); }catch{}
  await pedir(dt, 'series', (st) => st.put(s), 'readwrite');
  return { s, nueva: true };
}
export const __bajada = bajada;

export async function montarLector(V, { pedirTexto } = {}){
  const { THREE, B } = V;
  const lector = { grupo: new THREE.Group() };
  V.render.localClippingEnabled = true;
  let fase = 'estante', obras = [], pagina = 0, obra = null;

  /* ── el aviso de arriba (vacío, cargando…) ── */
  const aviso = new V.Panel(1.8, .3, 400); aviso.malla.position.set(0, .7, -2.1); lector.grupo.add(aviso.malla);
  const decir = (txt) => { const { x, cv } = aviso; x.clearRect(0, 0, cv.width, cv.height); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '800 40px system-ui, -apple-system, sans-serif'; x.fillStyle = '#C9B6DA'; x.fillText(txt, cv.width / 2, cv.height / 2); aviso.listo(); aviso.malla.visible = !!txt; };

  /* ── el estante: 8 portadas por página, L1/R1 pasan de página ── */
  let tarjetas = [];
  const limpiarTarjetas = () => { tarjetas.forEach((m) => { lector.grupo.remove(m); m.material.map?.dispose(); m.geometry.dispose(); }); tarjetas = []; };
  /* en el estante, antes de tus series: Buscar y Populares (de Webtoon y Wattpad) */
  const ACCIONES = [
    { accion: 'buscar', titulo: 'Buscar', sub: 'Webtoon y Wattpad', icono: 'search' },
    { accion: 'populares', titulo: 'Populares', sub: 'Webtoon', icono: 'popcorn' },
  ];
  let resultados = [];
  function pintarEstante(){
    limpiarTarjetas();
    const lista = fase === 'resultados' ? resultados : [...ACCIONES, ...obras];
    if(fase === 'resultados' && !lista.length){ decir('Sin resultados'); return; }
    const POR = 8, paginas = Math.ceil(lista.length / POR); pagina = Math.min(pagina, paginas - 1);
    decir(paginas > 1 ? `Página ${pagina + 1} de ${paginas} · L1 / R1` : (fase === 'resultados' ? 'Elige una para seguirla' : (obras.length ? '' : 'Busca una serie para empezar')));
    const items = lista.slice(pagina * POR, pagina * POR + POR), COLS = 4, n = items.length, filas = Math.ceil(n / COLS);
    for(const [i, o] of items.entries()){
      const p = new V.Panel(.46, .66, 460); const { x, cv } = p, W = cv.width, H = cv.height;
      let img = null;
      const dib = (f) => { x.clearRect(0, 0, W, H); V.redondo(x, 4, 4, W - 8, H - 8, 20); x.fillStyle = f ? '#3A1A5C' : '#1E1428'; x.fill();
        const ch = H - 92; x.save(); V.redondo(x, 12, 12, W - 24, ch, 14); x.clip();
        if(o.accion){ x.fillStyle = f ? '#4A2270' : '#24123A'; x.fillRect(12, 12, W - 24, ch); if(img) x.drawImage(img, W / 2 - 70, 12 + ch / 2 - 70, 140, 140); }
        else if(img){ const r = Math.max((W - 24) / img.width, ch / img.height), w = img.width * r, h = img.height * r; x.drawImage(img, 12 + (W - 24 - w) / 2, 12 + (ch - h) / 2, w, h); }
        else { const g = x.createLinearGradient(0, 12, 0, ch); g.addColorStop(0, '#3A1A5C'); g.addColorStop(1, '#7E1735'); x.fillStyle = g; x.fillRect(12, 12, W - 24, ch);
          x.fillStyle = 'rgba(244,238,242,.9)'; x.font = '900 120px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((o.titulo.trim()[0] || '·').toUpperCase(), W / 2, 12 + ch / 2); }
        x.restore();
        if(o.porLeer){ x.fillStyle = '#7E1735'; V.redondo(x, W - 84, 22, 62, 40, 20); x.fill(); x.fillStyle = '#fff'; x.font = '800 24px system-ui, -apple-system, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(o.porLeer), W - 53, 43); }
        x.lineWidth = f ? 6 : 2; x.strokeStyle = f ? '#AC27FF' : '#3C2652'; V.redondo(x, 4, 4, W - 8, H - 8, 20); x.stroke();
        x.textAlign = 'left'; x.textBaseline = 'top'; x.fillStyle = '#F4EEF2'; x.font = '700 21px system-ui, -apple-system, sans-serif';
        let t = o.titulo; while(x.measureText(t).width > W - 28 && t.length > 3) t = t.slice(0, -2) + '…'; x.fillText(t, 14, ch + 22);
        const pr = !o.accion && bajada.progreso[o.id], sub = pr ? `Bajando ${pr.hechos} de ${pr.total}` : o.sub;
        x.fillStyle = pr ? '#C77DFF' : '#C9B6DA'; x.font = '600 17px system-ui, -apple-system, sans-serif'; x.fillText(sub, 14, ch + 52); p.listo(); };
      p.repintar = () => dib(p._f);
      dib(false);
      const ponerImg = (b) => { const u = URL.createObjectURL(b), im = new Image(); im.onload = () => { img = im; dib(p._f); URL.revokeObjectURL(u); }; im.onerror = () => URL.revokeObjectURL(u); im.src = u; };
      if(o.accion) V.svgImg(o.icono, '#C77DFF').then((im) => { if(im){ img = im; dib(p._f); } });
      else if(o.portada instanceof Blob) ponerImg(o.portada);
      else if(typeof o.portada === 'string' && o.portada) redDe(o.ref?.fuente)(o.portada).then((r) => r.blob()).then(ponerImg).catch(() => {});
      p.foco = (f) => { if(p._f === f) return; p._f = f; dib(f); };
      const fila = Math.floor(i / COLS), enFila = Math.min(COLS, n - fila * COLS), c = i % COLS;
      const a = (c - (enFila - 1) / 2) * 18.5 * Math.PI / 180, y = (filas - 1) / 2 * .74 - fila * .74;
      p.malla.position.set(Math.sin(a) * 1.6, y - .05, -Math.cos(a) * 1.6); p.malla.lookAt(0, y - .05, 0);
      p.malla.userData.accion = () => o.accion === 'buscar' ? buscar() : o.accion === 'populares' ? populares() : o.resultado ? seguir(o) : abrirObra(o);
      lector.grupo.add(p.malla); tarjetas.push(p.malla);
    }
  }
  /* si se piden dos a la vez (al seguir una serie y al terminar de bajarla), gana la última: una lectura vieja que
     terminara después dejaba la serie «sin bajar» con sus capítulos ya guardados */
  let vuelta = 0;
  async function cargarEstante(){ const yo = ++vuelta; fase = 'estante'; decir('Un momento…'); const l = await obrasBajadas(); if(yo !== vuelta) return; obras = l; if(fase === 'estante') pintarEstante(); }

  /* buscar y seguir */
  async function buscar(){
    if(!pedirTexto) return;
    const q = await pedirTexto('Buscar series', { regresarA: 'leer' }); if(!q){ cargarEstante(); return; }
    fase = 'resultados'; limpiarTarjetas(); decir('Buscando…'); pagina = 0;
    const [wt, wp] = await Promise.all([
      porLaSala(`https://www.webtoons.com/es/search?keyword=${encodeURIComponent(q)}`).then((r) => r.text()).then((h) => seriesDeGenero(h).slice(0, 12)).catch(() => []),
      wattpad.buscar(q, directo).catch(() => []),
    ]);
    if(fase !== 'resultados') return;
    resultados = [...wt.map((x) => ({ resultado: true, ref: x.ref, titulo: x.titulo, sub: 'Webtoon', portada: x.portada })),
      ...wp.slice(0, 12).map((x) => ({ resultado: true, ref: { fuente: 'wattpad', story: String(x.story) }, titulo: x.titulo, sub: `Wattpad · ${x.partes} partes`, portada: x.portada }))];
    pintarEstante();
  }
  async function populares(){
    fase = 'resultados'; limpiarTarjetas(); decir('Buscando…'); pagina = 0;
    const sigo = obras.filter((o) => o.tipo === 'tira').map((o) => o.id);
    const l = await recomendar({ sigo, lang: 'es', cuantas: 24 }).catch(() => []);
    if(fase !== 'resultados') return;
    resultados = l.map((x) => ({ resultado: true, ref: x.ref, titulo: x.titulo, sub: 'Webtoon', portada: x.portada }));
    pintarEstante();
  }
  async function seguir(o){
    V.hud('Agregando…', 10);
    try{
      const { s, nueva } = await seguirSerie(o.ref);
      const n = await ponerAlDiaUna(s);
      V.hud(nueva ? `Siguiendo · bajando ${n}` : (n ? `Ya la sigues · bajando ${n}` : 'Ya la sigues'), 2.5);
    }catch(e){ V.hud('No se pudo agregar', 2.5); console.warn(e); }
    cargarEstante();
  }
  async function ponerAlDiaUna(s){
    const dt = await BASES.tiras(), tengo = new Set((await pedir(dt, 'caps', (st) => st.index('serie').getAllKeys(s.id))) || []), leidos = new Set(s.leidos || []);
    const sinLeer = (s.caps || []).filter((c) => !leidos.has(c.n) && c.n >= (s.desde || 0)).sort((a, b) => a.n - b.n);
    const listos = sinLeer.filter((c) => tengo.has(`${s.id}:${c.n}`)).length;
    return listos < ADELANTE ? encolar(s, sinLeer.filter((c) => !tengo.has(`${s.id}:${c.n}`)).slice(0, ADELANTE - listos)) : 0;
  }
  /* lo que se va bajando se ve en las tarjetas, y si estás leyendo esa serie, entra solo al final */
  let repintarT = 0;
  bajada.alTerminar.push((s, c, bien) => {
    if(fase === 'estante' && performance.now() - repintarT > 700){ repintarT = performance.now(); tarjetas.forEach((m) => m.userData.panel?.repintar?.()); }
    if(bien && obra && obra.id === s.id && !obra.caps.some((x) => x.n === c.n)){ obra.caps.push({ n: c.n, titulo: limpio(c.titulo) }); obra.caps.sort((a, b) => a.n - b.n); sinMas = false; }
    if(bien && !bajada.progreso[s.id] && !bajada.cola.some((x) => x.s.id === s.id)){ V.hud(`Listo: ${limpio(s.titulo).slice(0, 28)}`, 2); if(fase === 'estante') cargarEstante(); }
  });

  /* ── la ventana de lectura ── */
  let dist = 1.5; const ANCHO = .9, ALTO = 1.3, ESC = ANCHO / COL, VEN = ALTO / ESC;   // VEN: el alto de la ventana en px de la columna
  /* la ventana cuelga de un soporte con centro en tu cabeza: con las dos manos se gira a donde quieras (arriba de ti
     para leer acostado, de lado, en diagonal) y se agranda o achica (agarre.js) */
  const soporte = new THREE.Group(); lector.grupo.add(soporte);
  const ventana = new THREE.Group(); ventana.visible = false; soporte.add(ventana);
  let tam = 1; const wq = new THREE.Quaternion(), arriba = new THREE.Vector3(), wp2 = new THREE.Vector3();
  lector.alRecentrar = () => { soporte.quaternion.identity(); tam = 1; ventana.scale.setScalar(1); };
  const moverCtl = crearMoverConControl(V, { soporte, getEscala: () => tam, setEscala: (e) => { tam = e; ventana.scale.setScalar(e); }, min: .4, max: 3 });
  const agarrar = crearAgarre(V, { soporte, getEscala: () => tam, setEscala: (e) => { tam = e; ventana.scale.setScalar(e); }, min: .4, max: 3 });
  const marco = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO + .03, ALTO + .03), new THREE.MeshBasicMaterial({ color: 0x0b0814, toneMapped: false }));
  marco.position.z = -.004; ventana.add(marco);
  const tira = new THREE.Group(); ventana.add(tira);
  const planos = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
  const titulo = new V.Panel(ANCHO, .09, 900); titulo.malla.position.set(0, ALTO / 2 + .07, 0); ventana.add(titulo.malla);
  const barra = new THREE.Mesh(new THREE.PlaneGeometry(.012, 1), new THREE.MeshBasicMaterial({ color: 0xAC27FF, toneMapped: false })); barra.position.set(ANCHO / 2 + .03, 0, 0); ventana.add(barra);
  const ponerVentana = () => { ventana.position.set(0, .05, -dist); };
  ponerVentana();

  let segs = [], scroll = 0, objetivo = null, auto = false, armando = false, sinMas = false, cargandoTex = 0, guardadoEn = 0, actualK = -1;

  /* un capítulo → sus piezas (cabecera, páginas o tramos de texto, fin) */
  async function armarSegmento(k){
    const c = obra.caps[k]; const piezas = [];
    const cartel = (alto, dibujar) => ({ h: alto, hacer: () => { const cv = document.createElement('canvas'); cv.width = COL; cv.height = alto; const x = cv.getContext('2d'); dibujar(x, cv); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; } });
    piezas.push(cartel(170, (x, cv) => { x.fillStyle = '#170A26'; x.fillRect(0, 0, cv.width, cv.height); x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#C9B6DA'; x.font = '700 30px system-ui, -apple-system, sans-serif'; x.fillText(`${obra.titulo} · cap. ${c.n}`.slice(0, 48), COL / 2, 58);
      x.fillStyle = '#F4EEF2'; x.font = '800 40px system-ui, -apple-system, sans-serif'; let t = c.titulo; while(x.measureText(t).width > COL - 80 && t.length > 3) t = t.slice(0, -2) + '…'; x.fillText(t, COL / 2, 112); }));
    if(obra.tipo === 'tira'){
      const reg = await pedir(await BASES.tiras(), 'caps', (st) => st.get(`${obra.id}:${c.n}`));
      if(reg?.tipo === 'imagenes') for(const [i, b] of (reg.imgs || []).entries()){
        if(!b) continue;
        let d = reg.dims?.[i];
        if(!d){ try{ const bm = await createImageBitmap(b); d = [bm.width, bm.height]; bm.close?.(); }catch{ continue; } }
        piezas.push({ h: COL * d[1] / d[0], hacer: async () => {
          const u = URL.createObjectURL(b), im = new Image(); im.decoding = 'async'; im.src = u;
          try{ await im.decode(); }catch{ URL.revokeObjectURL(u); return null; }
          const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; t.userData.url = u; return t; } });
      }
      else if(reg) piezas.push(...tramosDeTexto(maquetar(reg.html), THREE));
    } else {
      const l = await pedir(await BASES.libros(), 'libros', (st) => st.get(obra.id));
      piezas.push(...tramosDeTexto(maquetar(l?.capitulos?.[k]?.html), THREE));
    }
    const sig = obra.caps[k + 1];
    piezas.push(cartel(FIN_H, (x, cv) => { x.fillStyle = '#170A26'; x.fillRect(0, 0, cv.width, cv.height); x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#AC27FF'; x.fillRect(COL / 2 - 70, 34, 140, 4);
      x.fillStyle = '#C9B6DA'; x.font = '700 30px system-ui, -apple-system, sans-serif'; x.fillText(sig ? `Sigue el capítulo ${sig.n}` : 'Es lo último bajado', COL / 2, 92); }));
    let y = 0;
    for(const p of piezas){ p.y = y; y += p.h; }
    return { k, piezas, alto: y, y0: 0, leido: false };
  }
  function montarPiezas(s){
    for(const p of s.piezas){
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, p.h * ESC), new THREE.MeshBasicMaterial({ color: 0x24123A, toneMapped: false, clippingPlanes: planos }));
      p.malla = m; tira.add(m);
    }
  }
  const acomodar = () => { for(const s of segs) for(const p of s.piezas) p.malla.position.y = -(s.y0 + p.y + p.h / 2) * ESC; };
  const total = () => segs.length ? segs[segs.length - 1].y0 + segs[segs.length - 1].alto : 0;
  function soltar(p){ if(p.tex){ p.tex.userData.url && URL.revokeObjectURL(p.tex.userData.url); p.tex.dispose(); p.tex = null; p.malla.material.map = null; p.malla.material.color.set(0x24123A); p.malla.material.needsUpdate = true; } }
  function quitarSegmento(s){ for(const p of s.piezas){ soltar(p); p.muerta = true; tira.remove(p.malla); p.malla.geometry.dispose(); p.malla.material.dispose(); } }

  async function abrirObra(o, k = null, dentro = null){
    if(!o.caps.length){
      const s = await pedir(await BASES.tiras(), 'series', (st) => st.get(o.id));
      const n = s ? await ponerAlDiaUna(s) : 0; V.hud(n ? `Bajando ${n} capítulos` : (bajada.progreso[o.id] ? 'Ya se está bajando' : 'Sin internet'), 2.5); return;
    }
    obra = o; fase = 'cargando'; limpiarTarjetas(); decir('Abriendo…');
    segs.forEach(quitarSegmento); segs = []; scroll = 0; objetivo = null; auto = false; sinMas = false; actualK = -1;
    if(k == null){
      const g = leerGuardado()[o.id];
      if(o.tipo === 'libro'){ const l = await pedir(await BASES.libros(), 'libros', (st) => st.get(o.id)); k = Math.min(o.caps.length - 1, l?.avance?.cap || 0); dentro = l?.avance?.y || 0; }
      else {
        const s = await pedir(await BASES.tiras(), 'series', (st) => st.get(o.id)), leidos = new Set(s?.leidos || []);
        const gk = g ? o.caps.findIndex((c) => c.n === g.n) : -1;
        k = gk >= 0 && !leidos.has(g.n) ? gk : o.caps.findIndex((c) => !leidos.has(c.n) && c.n >= (s?.desde || 0));
        if(k < 0){ k = o.caps.length - 1; V.hud('Al día: lo último bajado', 2.5); }
        dentro = gk === k ? g.y : 0;
      }
    }
    const s = await armarSegmento(k); if(obra !== o) return;
    montarPiezas(s); segs = [s]; acomodar();
    scroll = Math.max(0, Math.min(s.alto - VEN * .5, (dentro || 0) * s.alto));
    fase = 'leyendo'; decir(''); ventana.visible = true; pintarTitulo(true);
    V.hud('Stick: leer · X: solo', 2.5);
  }
  async function alFinal(){
    if(armando || sinMas) return; const ult = segs[segs.length - 1]; if(!ult) return;
    if(ult.k + 1 >= obra.caps.length){
      sinMas = true;
      if(obra.tipo === 'tira' && !bajada.progreso[obra.id]){ const s = await pedir(await BASES.tiras(), 'series', (st) => st.get(obra.id)); if(s){ const n = await ponerAlDiaUna(s); if(n) V.hud(`Bajando ${n} más`, 2); } }
      return;
    }
    armando = true; const o = obra;
    try{
      const s = await armarSegmento(ult.k + 1); if(obra !== o || fase !== 'leyendo'){ return; }
      s.y0 = total(); montarPiezas(s); segs.push(s);
      /* los que ya quedaron muy arriba se sueltan, sin que brinque lo que se ve */
      while(segs.length > 3 && segs[0].y0 + segs[0].alto < scroll - VEN * 3){ const q = segs.shift(); quitarSegmento(q); for(const z of segs) z.y0 -= q.alto; scroll -= q.alto; if(objetivo != null) objetivo -= q.alto; }
      acomodar();
    } finally { armando = false; }
  }
  /* L1/R1 */
  function irCapitulo(d){
    const ac = segActual(); if(!ac) return;
    if(d > 0){ const sig = segs[segs.indexOf(ac) + 1]; if(sig){ objetivo = sig.y0; return; } if(ac.k + 1 < obra.caps.length){ marcarLeido(ac); abrirObra(obra, ac.k + 1, 0); } else V.hud('Es lo último bajado'); return; }
    if(scroll - ac.y0 > 60){ objetivo = ac.y0; return; }
    const ant = segs[segs.indexOf(ac) - 1]; if(ant){ objetivo = ant.y0; return; }
    if(ac.k > 0) abrirObra(obra, ac.k - 1, 0); else objetivo = 0;
  }
  const segActual = () => { const m = scroll + VEN / 2; return segs.find((s) => m >= s.y0 && m < s.y0 + s.alto) || segs[segs.length - 1]; };

  /* lo leído, igual que en INKWELL */
  async function marcarLeido(s){
    if(s.leido) return; s.leido = true; const c = obra.caps[s.k];
    if(obra.tipo === 'tira'){
      const d = await BASES.tiras(), serie = await pedir(d, 'series', (st) => st.get(obra.id));
      if(serie && !(serie.leidos || []).includes(c.n)){ serie.leidos = [...(serie.leidos || []), c.n]; await pedir(d, 'series', (st) => st.put(serie), 'readwrite'); }
      try{ apuntar(obra.id, c.n); }catch{}
      try{ localStorage.setItem('tiras.ultimo', JSON.stringify(`${obra.id}:${c.n}`)); }catch{}
    } else try{ apuntar('libro:' + obra.id, c.n); }catch{}
  }
  function guardarAvance(){
    const s = segActual(); if(!s || !obra) return; const y = Math.max(0, Math.min(1, (scroll - s.y0) / s.alto));
    const g = leerGuardado(); g[obra.id] = { n: obra.caps[s.k].n, y }; escribirGuardado(g);
    if(obra.tipo === 'libro'){ const o = obra; BASES.libros().then(async (d) => { const l = await pedir(d, 'libros', (st) => st.get(o.id)); if(!l) return; l.avance = { cap: s.k, y }; l.abierto = Date.now(); await pedir(d, 'libros', (st) => st.put(l), 'readwrite'); }); }
  }
  function pintarTitulo(forzar){
    const s = segActual(); if(!s || (!forzar && s.k === actualK)) return; actualK = s.k;
    const c = obra.caps[s.k], { x, cv } = titulo; x.clearRect(0, 0, cv.width, cv.height); x.textBaseline = 'middle';
    x.font = '700 36px system-ui, -apple-system, sans-serif'; x.fillStyle = '#C9B6DA'; x.textAlign = 'left';
    let t = obra.titulo; while(x.measureText(t).width > cv.width * .62 && t.length > 3) t = t.slice(0, -2) + '…'; x.fillText(t, 8, cv.height / 2);
    x.textAlign = 'right'; x.fillStyle = '#F4EEF2'; x.fillText(`Cap. ${c.n} de ${obra.caps[obra.caps.length - 1].n}`, cv.width - 8, cv.height / 2); titulo.listo();
  }
  function salirDeLeer(){ if(obra && fase === 'leyendo'){ const s = segActual(); if(s && scroll + VEN >= s.y0 + s.alto - FIN_H / 2) marcarLeido(s); guardarAvance(); }
    segs.forEach(quitarSegmento); segs = []; ventana.visible = false; auto = false; obra = null; }

  /* ── cada cuadro: mover, cargar lo cercano, soltar lo lejano, marcar lo leído ── */
  const ray = new THREE.Raycaster(), centro = new THREE.Vector2(0, 0), wp = new THREE.Vector3();
  let velMirada = 0;
  /* leer con la mano (Carlos, 18 nov): pellizcar y arrastrar arriba/abajo mueve la tira como con el dedo en la pantalla;
     al soltar sigue un poco por la inercia. Un pellizco corto, sin mover, lee solo o pausa */
  const gM = { activo: false, y0: 0, s0: 0, t0: 0, ultY: 0, ultT: 0, vel: 0, movio: false };
  let inercia = 0;
  let trasAgarre = false;   /* después de mover la ventana, nada lee hasta soltar las dos manos */
  function manoLee(dt){
    const p = (V.extra.manos || []).find((m) => m.pellizco), ahora = performance.now();
    if(agarrar()){ if(gM.activo){ scroll = gM.s0; gM.activo = false; } inercia = 0; trasAgarre = true; return; }
    if(!p) trasAgarre = false;
    if(trasAgarre) return;
    if(p && !V.extra.sobreBoton && !gM.activo) Object.assign(gM, { activo: true, y0: p.y, s0: scroll, t0: ahora, ultY: p.y, ultT: ahora, vel: 0, movio: false }), inercia = 0, objetivo = null;
    else if(p && gM.activo){
      const dy = p.y - gM.y0; if(Math.abs(dy) > .03) gM.movio = true;
      if(gM.movio){ const nuevo = gM.s0 - dy * VEN * 2.2; const dtm = Math.max(1, ahora - gM.ultT) / 1000; gM.vel = (nuevo - scroll) / dtm * .5 + gM.vel * .5; scroll = nuevo; }
      gM.ultY = p.y; gM.ultT = ahora;
    } else if(!p && gM.activo){ gM.activo = false;
      if(gM.movio) inercia = Math.max(-3000, Math.min(3000, gM.vel));
      else if(ahora - gM.t0 < 600){ auto = !auto; V.hud(auto ? 'Solo' : 'Pausa', 1); } }
    if(!gM.activo && inercia){ scroll += inercia * dt; inercia *= Math.pow(.05, dt); if(Math.abs(inercia) < 20) inercia = 0; }
  }
  lector.cuadro = (t, dt = 1 / 60) => {
    V.extra.gestosVideo = fase === 'leyendo';
    if(fase === 'leyendo') manoLee(dt);
    if(fase !== 'leyendo'){ tarjetas.forEach((m) => { m.visible = fase === 'estante' || fase === 'resultados'; }); return; }
    /* sin control: mirar (o apuntar con la mano) la orilla de la ventana avanza */
    velMirada = 0;
    if(!V.hayControl() && !V.extra.rayo){   /* con la mano se lee pellizcando y arrastrando (manoLee) */
      if(V.extra.rayo) ray.set(V.extra.rayo.origen, V.extra.rayo.dir); else ray.setFromCamera(centro, V.cabeza);
      const h = ray.intersectObject(marco, false)[0];
      if(h){ const v = marco.worldToLocal(h.point.clone()).y / ALTO + .5; if(v < .18) velMirada = (.18 - v) / .18 * 520; else if(v > .9) velMirada = -(v - .9) / .1 * 520; }
    }
    if(objetivo != null){ scroll += (objetivo - scroll) * Math.min(1, dt * 9); if(Math.abs(objetivo - scroll) < 2){ scroll = objetivo; objetivo = null; } }
    scroll += (velStick + velMirada + (auto ? 70 : 0)) * dt;
    const max = Math.max(0, total() - VEN * .5);
    if(scroll > max){ scroll = max; if(sinMas && auto){ auto = false; V.hud('Es lo último bajado'); } }
    if(scroll < 0) scroll = 0;
    if(scroll + VEN * 3 > total()) alFinal();
    tira.position.y = ALTO / 2 + scroll * ESC;
    ventana.updateWorldMatrix(true, false); ventana.getWorldQuaternion(wq); arriba.set(0, 1, 0).applyQuaternion(wq);
    planos[0].setFromNormalAndCoplanarPoint(arriba.clone().negate(), ventana.localToWorld(wp.set(0, ALTO / 2, 0)));
    planos[1].setFromNormalAndCoplanarPoint(arriba, ventana.localToWorld(wp.set(0, -ALTO / 2, 0)));
    const tot = total() || 1, barH = Math.max(.04, Math.min(1, VEN / tot)) * ALTO, prog = Math.min(1, scroll / Math.max(1, tot - VEN * .5));
    barra.scale.y = barH; barra.position.y = ALTO / 2 - barH / 2 - prog * (ALTO - barH);
    for(const s of segs){
      for(const p of s.piezas){
        const top = s.y0 + p.y, bot = top + p.h;
        p.malla.visible = bot > scroll - 10 && top < scroll + VEN + 10;
        const cerca = bot > scroll - VEN * 1.5 && top < scroll + VEN * 2.5, lejos = bot < scroll - VEN * 4 || top > scroll + VEN * 6;
        if(cerca && !p.tex && !p.cargando && cargandoTex < 3){
          p.cargando = true; cargandoTex++;
          Promise.resolve(p.hacer()).then((tx) => { if(!tx) return; if(p.muerta){ tx.userData.url && URL.revokeObjectURL(tx.userData.url); tx.dispose(); return; }
            p.tex = tx; p.malla.material.map = tx; p.malla.material.color.set(0xffffff); p.malla.material.needsUpdate = true; })
            .catch(() => {}).finally(() => { p.cargando = false; cargandoTex--; });
        }
        else if(lejos && p.tex) soltar(p);
      }
      if(!s.leido && s.y0 + s.alto - FIN_H < scroll + VEN / 2) marcarLeido(s);
    }
    pintarTitulo(false);
    if(t - guardadoEn > 3){ guardadoEn = t; guardarAvance(); }
  };

  let velStick = 0;
  lector.control = (c, dt) => {
    if(fase === 'estante' || fase === 'resultados'){
      if(c.oprimido[B.R1] && (pagina + 1) * 8 < (fase === 'resultados' ? resultados.length : obras.length + ACCIONES.length)){ pagina++; pintarEstante(); }
      if(c.oprimido[B.L1] && pagina > 0){ pagina--; pintarEstante(); }
      return {};
    }
    if(fase !== 'leyendo'){ velStick = 0; return { x: true, flechas: true }; }
    if(moverCtl(c, dt)){ velStick = 0; return { x: true, flechas: true }; }
    /* los dos sticks leen; cuánto se empuje es qué tan rápido (al cuadrado: con poquito, despacio) */
    const a = Math.max(-1, Math.min(1, (c.ejes[1] || 0) + (c.ejes[3] || 0)));
    velStick = Math.sign(a) * a * a * 2600; if(a) objetivo = null;
    if(c.oprimido[B.ABAJO]) objetivo = (objetivo ?? scroll) + VEN * .85;
    if(c.oprimido[B.ARRIBA]) objetivo = Math.max(0, (objetivo ?? scroll) - VEN * .85);
    if(c.oprimidoPad[B.X]){ auto = !auto; objetivo = null; V.hud(auto ? 'Solo' : 'Pausa', 1.2); }
    if(c.oprimido[B.R1]) irCapitulo(1);
    if(c.oprimido[B.L1]) irCapitulo(-1);
    /* R2 cambia la distancia (cerca, normal, lejos); L2 apretado es mover y escalar (arriba) */
    if(c.oprimido[B.R2]){ dist = dist < 1.4 ? 1.5 : dist < 2 ? 2.2 : 1.2; ponerVentana(); V.hud(dist < 1.4 ? 'Cerca' : dist < 2 ? 'Normal' : 'Lejos', .8); }
    return { x: true, flechas: true };
  };
  Object.defineProperty(lector, 'ocupaStick', { get: () => fase === 'leyendo' });
  Object.defineProperty(lector, 'ocupaGiro', { get: () => fase === 'leyendo' && V.control.apretado(B.L2) });
  /* leyendo, «Atrás» va a un lado de la ventana: abajo estorbaría al mirar la orilla para avanzar */
  Object.defineProperty(lector, 'atrasEn', { get: () => fase === 'leyendo' || fase === 'cargando' ? wp2.set(-(ANCHO / 2 * tam + .4), -.4, -dist).applyQuaternion(soporte.quaternion).toArray() : null });
  lector.entrar = () => { pagina = 0; cargarEstante(); ponerAlDia().catch(() => {}); };
  lector.salir = () => { V.extra.gestosVideo = false; salirDeLeer(); limpiarTarjetas(); decir(''); fase = 'estante'; };
  lector.atras = () => { if(fase === 'leyendo' || fase === 'cargando' || fase === 'resultados'){ salirDeLeer(); cargarEstante(); } else V.ir('inicio'); };
  lector.elegibles = () => fase === 'estante' || fase === 'resultados' ? tarjetas : [];
  lector.estado = () => ({ bajando: bajada.cola.length + (bajada.corriendo ? 1 : 0), fase, obras: obras.length, tarjetas: tarjetas.length, obra: obra?.id || null, segs: segs.map((s) => obra?.caps[s.k]?.n), scroll: Math.round(scroll), auto, actual: obra && segActual() ? obra.caps[segActual().k].n : null,
    texturas: segs.reduce((n, s) => n + s.piezas.filter((p) => p.tex).length, 0), piezas: segs.reduce((n, s) => n + s.piezas.length, 0), dist, tam: +tam.toFixed(2), giro: +(2 * Math.acos(Math.min(1, Math.abs(soporte.quaternion.w))) * 180 / Math.PI).toFixed(1) });
  lector.abrir = (id) => { const o = obras.find((x) => x.id === id); if(o) return abrirObra(o); };
  V.registrar('leer', lector);
  return lector;
}
