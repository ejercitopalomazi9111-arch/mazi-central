/* ═══════════════════════════════════════════════════════════════════════════
   CARTELES · LA CAMPAÑA (la pantalla) — de las fotos a 150 anuncios listos
   ───────────────────────────────────────────────────────────────────────────
   El camino que hizo a mano Sylcred para All's fashion, hecho botones:
     1. las fotos: del banco de La Sala (por carpeta) o del teléfono;
        cada una con su categoría (la adivina por lo que dice el banco; lo que
        no dice nada lo puede mirar Paulina) y su fondo quitado;
     2. el estilo: los de moda, en paquetes «Lujo» y «Tienda»;
     3. el calendario: días × anuncios, cuántas historias, desde qué fecha;
     4. tandas y encuestas;
     5. todo se ve por día, se rehace uno con «Otra versión», se guarda el día
        en Fotos o todo en un ZIP con una carpeta por día.

   Las fotos se guardan en este teléfono (IndexedDB) achicadas a 1600 px, con
   su miniatura de 240 px y su recorte, para no volver a bajarlas ni a
   recortarlas. Nada sale del teléfono salvo lo que se le pide al banco.
   ═══════════════════════════════════════════════════════════════════════════ */
import { pintar, ESTILOS, FORMATOS } from './motor.js';
import './moda.js';
import { planTanda, planEncuesta, iconoDe } from './campanas.js';
import { planCampana, MODA } from './calendario.js';
import { CATEGORIAS, CAT, categorizar } from './frases.js';
import { recortarAuto, achicar, aLienzo, esDeMuchas } from './recorte-lote.js';

const $ = (s, r = document) => r.querySelector(s);
function h(tag, at = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(at || {})) {
    if (v == null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (k === 'class') e.className = v; else if (k === 'style') Object.assign(e.style, v);
    else if (k in e && typeof v !== 'string') e[k] = v; else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const sinAcentos = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ───────────── guardado: un almacén propio para las fotos de campaña ───────────── */
const BD = new Promise((ok, mal) => {
  const r = indexedDB.open('carteles-campana', 1);
  r.onupgradeneeded = () => { const s = r.result.createObjectStore('fotos', { keyPath: 'id' }); s.createIndex('marca', 'marca'); };
  r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
});
async function tx(modo, fn) { const db = await BD; return new Promise((ok, mal) => { const t = db.transaction('fotos', modo), s = t.objectStore('fotos'), r = fn(s); t.oncomplete = () => ok(r?.result); t.onerror = () => mal(t.error); }); }
const guardarFoto = f => tx('readwrite', s => s.put(f));
const borrarFoto = id => tx('readwrite', s => s.delete(id));
const fotosDe = marca => tx('readonly', s => s.index('marca').getAll(marca));

/* ───────────── imágenes: miniaturas y un caché chico de las grandes ───────────── */
async function miniatura(blob, max = 240, tipo = 'image/jpeg') { const c = await aLienzo(blob, max); return new Promise(ok => c.toBlob(ok, tipo, .8)); }
const cacheImg = new Map();
async function imagen(blob) {
  if (!blob) return null;
  if (cacheImg.has(blob)) { const i = cacheImg.get(blob); cacheImg.delete(blob); cacheImg.set(blob, i); return i; }
  const u = URL.createObjectURL(blob), i = new Image(); i.src = u; await i.decode();
  cacheImg.set(blob, i);
  while (cacheImg.size > 14) { const [k, v] = cacheImg.entries().next().value; URL.revokeObjectURL(v.src); cacheImg.delete(k); }
  return i;
}
const urls = new WeakMap();
const urlDe = b => { if (!b) return ''; if (!urls.has(b)) urls.set(b, URL.createObjectURL(b)); return urls.get(b); };

/* ───────────── estado ───────────── */
let ctx = null;            // { marcaParaMotor, marcaId, rec, estado }
let fotos = [];            // las de esta marca
let filtro = '';
let estilosElegidos = new Set(MODA);
let resultados = [];       // [{ grupo, nombre, job, blob }]
const PAQUETES = {
  Lujo: ['maison', 'minimal', 'dorado', 'estudio', 'revista', 'etiqueta', 'coleccion', 'portada', 'glamour'],
  Tienda: ['rebaja', 'departamental', 'preppy', 'nautico', 'pasarela', 'color', 'mosaico', 'vitrina', 'coleccion', 'estudio'],
  Todo: MODA,
};

/* ───────────── 1 · las fotos ───────────── */
function aviso(t) { const e = $('#c-estadoFotos'); if (e) e.textContent = t; }
async function nuevaFoto({ id, origen, bancoId = null, nombre, texto = '', blob, mime = '' }) {
  const foto = await achicar(blob);
  const esCaptura = /png/.test(mime) && await (async () => { const c = await aLienzo(blob, 64); return c.height / c.width > 1.9; })();
  const cat = categorizar(texto, nombre);
  return { id, marca: ctx.marcaId(), origen, bancoId, nombre, texto, cat, foto, mini: await miniatura(foto), recorte: null, recorteMini: null, malo: false,
    usarRecorte: false, muchas: esDeMuchas(texto) || cat === 'tienda', usar: !esCaptura, captura: esCaptura, creado: Date.now() };
}
async function delTelefono() {
  const fs = await elegir('image/*', true); if (!fs.length) return;
  let n = 0;
  for (const f of fs) {
    aviso(`Guardando ${++n} de ${fs.length}…`);
    const x = await nuevaFoto({ id: 't' + Date.now().toString(36) + n, origen: 'tel', nombre: f.name, texto: f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '), blob: f, mime: f.type });
    await guardarFoto(x); fotos.push(x);
  }
  aviso(`Listas ${plural(fs.length, 'foto', 'fotos')}. Revisa la categoría de las que digan «Productos».`); pintarFotos();
}
function elegir(accept, multiple = false) {
  return new Promise(ok => { const a = $('#archivo'); a.accept = accept; a.multiple = multiple; a.value = ''; a.onchange = () => ok([...a.files]); a.click(); });
}

/* El banco de La Sala: la misma llave que usan Presentaciones y la mesa. */
let IA = null;
async function ia() { return IA ||= await import('../presentaciones/ia.js'); }
async function delBanco() {
  const I = await ia(), dlg = $('#c-banco');
  const cuerpo = $('#c-bancoCuerpo'); dlg.showModal();
  if (!I.llave()) {
    const inp = h('input', { type: 'text', placeholder: 'Pega aquí el link de La Sala o la llave', autocomplete: 'off' });
    cuerpo.replaceChildren(h('p', {}, 'El banco vive en La Sala. Pega una sola vez el link con el que entras a la sala; se queda guardado en este teléfono.'), inp,
      h('div', { class: 'fila', style: { marginTop: '12px' } }, h('button', { class: 'si', type: 'button', on: { click: () => { if (I.ponerLlave(inp.value)) delBanco(); else inp.setCustomValidity('No encontré la llave en eso.'), inp.reportValidity(); } } }, 'Conectar')));
    return;
  }
  cuerpo.replaceChildren(h('p', { class: 'nota' }, 'Abriendo el banco…'));
  let fichas;
  try { fichas = await I.banco.lista(); } catch (e) { cuerpo.replaceChildren(h('p', {}, e.message || 'No se pudo abrir el banco.')); return; }
  const grupos = new Map();
  for (const f of fichas) { const k = sinAcentos(f.carpeta || '').replace(/[’']/g, "'").trim() || '(sin carpeta)'; if (!grupos.has(k)) grupos.set(k, { nombre: f.carpeta || 'Sin carpeta', fichas: [] }); grupos.get(k).fichas.push(f); }
  const ya = new Set(fotos.map(f => f.bancoId));
  const lista = [...grupos.values()].sort((a, b) => b.fichas.length - a.fichas.length);
  cuerpo.replaceChildren(h('p', { class: 'nota' }, 'Elige una carpeta: se traen todas sus fotos (las que ya trajiste no se repiten).'),
    h('div', { class: 'carpetas' }, lista.map(g => {
      const nuevas = g.fichas.filter(f => !ya.has(f.id)).length;
      return h('button', { type: 'button', disabled: !nuevas, on: { click: () => { dlg.close(); traerDelBanco(g.fichas.filter(f => !ya.has(f.id))); } } },
        h('b', {}, g.nombre), h('span', {}, nuevas ? `${plural(nuevas, 'foto nueva', 'fotos nuevas')} de ${g.fichas.length}` : `ya están las ${g.fichas.length}`));
    })));
}
async function traerDelBanco(fichas) {
  const I = await ia(); let hechas = 0, fallas = 0;
  const cola = fichas.slice();
  async function trabajador() {
    while (cola.length) {
      const f = cola.shift();
      for (let intento = 0; intento < 4; intento++) {
        try {
          const b = await I.banco.bytes(f.id);
          const x = await nuevaFoto({ id: 'b' + f.id, origen: 'banco', bancoId: f.id, nombre: f.titulo || f.nombre || '', mime: b.mime,
            texto: [f.titulo, f.descripcion, (f.temas || []).join(' '), (f.palabras || []).join(' ')].filter(Boolean).join(' · '), blob: b.blob });
          await guardarFoto(x); fotos.push(x); hechas++; break;
        } catch (e) { if (intento === 3) fallas++; else await new Promise(r => setTimeout(r, 1500 * (intento + 1))); }
      }
      aviso(`Trayendo del banco: ${hechas + fallas} de ${fichas.length}…`);
      if ((hechas + fallas) % 6 === 0) pintarFotos();
    }
  }
  await Promise.all([trabajador(), trabajador(), trabajador()]);
  aviso(`Listas ${plural(hechas, 'foto', 'fotos')} del banco.` + (fallas ? ` ${fallas} no se pudieron bajar; vuelve a tocar «Del banco» para reintentar.` : '') + ' Ahora: «Quitar los fondos».');
  pintarFotos();
}

/* Quitar el fondo a todas las que lo necesiten (las de muchas cosas no). */
let recortando = false;
async function quitarFondos() {
  if (recortando) return; recortando = true;
  const pend = fotos.filter(f => f.usar && !f.muchas && !f.recorte && !f.malo);
  if (!pend.length) { aviso('No hay fotos pendientes de recortar.'); recortando = false; return; }
  let n = 0;
  try {
    for (const f of pend) {
      aviso(`Quitando el fondo: ${++n} de ${pend.length} (la primera vez tarda en cargar)…`);
      const r = await recortarAuto(f.foto, f.cat);
      f.malo = r.malo; f.recorte = r.blob; f.recorteMini = r.blob ? await miniatura(r.blob, 240, 'image/png') : null; f.usarRecorte = !!r.blob && !r.malo;
      await guardarFoto(f); if (n % 4 === 0) pintarFotos();
    }
    const malas = pend.filter(f => f.malo).length;
    aviso(`Listo: ${plural(pend.length - malas, 'recorte', 'recortes')}.` + (malas ? ` ${malas} se quedan con la foto completa porque el recorte no salió limpio.` : '') + ' Revisa: toca ✂ en una foto para cambiar entre recorte y foto completa.');
  } catch (e) { aviso('El recorte automático no cargó: ' + (e.message || e) + '. Las fotos se usan completas.'); }
  recortando = false; pintarFotos();
}
/* Paulina mira las que no dicen qué son y les pone categoría. */
async function preguntarPaulina() {
  const I = await ia();
  if (!I.llave()) { delBanco(); return; }
  const pend = fotos.filter(f => f.usar && f.cat === 'producto');
  if (!pend.length) { aviso('Todas tienen categoría.'); return; }
  let n = 0, fallas = 0;
  for (const f of pend) {
    aviso(`Paulina está mirando ${++n} de ${pend.length}…`);
    try {
      const bytes = new Uint8Array(await f.foto.arrayBuffer());
      // La Sala a veces contesta 502 cuando la IA está saturada: tres intentos con espera creciente
      let d; for (let k = 0; ; k++) { try { d = await I.describir(bytes, 'image/jpeg'); break; } catch (e) { if (e.llave || k === 2) throw e; await new Promise(r => setTimeout(r, 4000 * (k + 1))); } }
      f.texto = [d.titulo, d.descripcion, (d.palabras || []).join(' ')].filter(Boolean).join(' · ');
      f.nombre = d.titulo || f.nombre; f.cat = categorizar(f.texto); f.muchas = esDeMuchas(f.texto) || f.cat === 'tienda';
      await guardarFoto(f); if (n % 5 === 0) pintarFotos();
    } catch (e) { fallas++; if (e.llave) { aviso('Falta la llave de La Sala.'); break; } }
  }
  aviso(`Paulina revisó ${n - fallas} de ${pend.length}.` + (fallas ? ` ${fallas} no se pudieron.` : ''));
  pintarFotos();
}

function pintarFotos() {
  const r = $('#c-fotos'); if (!r) return;
  const usadas = fotos.filter(f => f.usar);
  const cuenta = new Map(); usadas.forEach(f => cuenta.set(f.cat, (cuenta.get(f.cat) || 0) + 1));
  $('#c-cats').replaceChildren(
    h('button', { type: 'button', 'aria-pressed': String(!filtro), on: { click: () => { filtro = ''; pintarFotos(); } } }, `Todas · ${fotos.length}`),
    ...[...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => h('button', { type: 'button', 'aria-pressed': String(filtro === c), on: { click: () => { filtro = c; pintarFotos(); } } }, `${(CAT[c] || CAT.producto).nombre} · ${n}`)),
    fotos.some(f => !f.usar) ? h('button', { type: 'button', 'aria-pressed': String(filtro === '_fuera'), on: { click: () => { filtro = '_fuera'; pintarFotos(); } } }, `No se usan · ${fotos.filter(f => !f.usar).length}`) : '');
  const lista = fotos.filter(f => filtro === '_fuera' ? !f.usar : filtro ? f.usar && f.cat === filtro : true);
  r.replaceChildren(...lista.map(f => {
    const img = h('img', { src: urlDe(f.usarRecorte && f.recorteMini ? f.recorteMini : f.mini), alt: f.nombre || 'Foto', loading: 'lazy', class: f.usarRecorte ? 'recortada' : '' });
    const sel = h('select', { 'aria-label': 'Categoría', on: { change: async e => { f.cat = e.target.value; await guardarFoto(f); pintarFotos(); } } },
      CATEGORIAS.map(c => h('option', { value: c.id, selected: c.id === f.cat }, c.nombre)));
    return h('div', { class: 'fichaFoto' + (f.usar ? '' : ' fuera') }, img, sel,
      h('div', { class: 'acciones' },
        h('button', { type: 'button', title: f.usar ? 'No usar esta foto' : 'Usar esta foto', 'aria-pressed': String(f.usar), on: { click: async () => { f.usar = !f.usar; await guardarFoto(f); pintarFotos(); } } }, f.usar ? '✓ Usar' : 'No'),
        h('button', { type: 'button', title: 'Recorte o foto completa', disabled: !f.recorte, 'aria-pressed': String(f.usarRecorte), on: { click: async () => { f.usarRecorte = !f.usarRecorte; await guardarFoto(f); pintarFotos(); } } }, f.usarRecorte ? '✂ Recorte' : '▢ Completa')));
  }));
  $('#c-resumenFotos').textContent = fotos.length ? `${plural(usadas.length, 'foto', 'fotos')} para usar · ${plural(usadas.filter(f => f.usarRecorte).length, 'recortada', 'recortadas')}` : 'Todavía no hay fotos. Tráelas del banco o del teléfono.';
  pintarOpcionesTanda();
}

/* ───────────── 2 · estilos ───────────── */
function pintarEstilos() {
  const moda = ESTILOS.filter(e => e.grupo === 'moda');
  $('#c-paquetes').replaceChildren(...Object.entries(PAQUETES).map(([n, ids]) => h('button', { type: 'button', on: { click: () => { estilosElegidos = new Set(ids); pintarEstilos(); } } }, n)));
  $('#c-estilos').replaceChildren(...moda.map(e => h('button', { type: 'button', title: e.para, 'aria-pressed': String(estilosElegidos.has(e.id)),
    on: { click: () => { estilosElegidos.has(e.id) ? estilosElegidos.delete(e.id) : estilosElegidos.add(e.id); pintarEstilos(); } } }, e.nombre)));
}

/* ───────────── pintar un anuncio ───────────── */
const porId = () => new Map(fotos.map(f => [f.id, f]));
async function imgDe(f) { return f ? imagen(f.usarRecorte && f.recorte ? f.recorte : f.foto) : null; }
async function pintarJob(c, job) {
  const mapa = porId(), fs = await Promise.all((job.fotos || []).map(id => imgDe(mapa.get(id))));
  const prod = { ...job.prod, foto: fs[0] || null, fotos: fs.length > 1 ? fs : undefined };
  if (job.fotosA) prod.fotosA = await Promise.all(job.fotosA.map(id => imgDe(mapa.get(id))));
  if (job.fotosB) prod.fotosB = await Promise.all(job.fotosB.map(id => imgDe(mapa.get(id))));
  const o = { marca: ctx.marcaParaMotor(), prod, estilo: job.estilo, formato: job.formato, semilla: job.semilla || 1, numero: job.numero };
  pintar(c, o, ctx.rec); if (await ctx.rec.listos()) pintar(c, o, ctx.rec);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', .92));
}
const nombreJob = (job, k) => `${String(k + 1).padStart(2, '0')}-${job.formato === 'historia' ? 'historia' : job.formato === 'cuadro' ? 'cuadrado' : 'publicacion'}-${job.estilo}.jpg`;

let trabajando = false;
async function hacer(grupos) {
  if (trabajando) return; trabajando = true;
  const c = document.createElement('canvas'), total = grupos.reduce((a, g) => a + g.jobs.length, 0); let n = 0;
  for (const g of grupos) {
    resultados = resultados.filter(r => r.grupo !== g.grupo);
    for (const [k, job] of g.jobs.entries()) {
      $('#c-estadoHacer').textContent = `Haciendo ${++n} de ${total}…`;
      const blob = await pintarJob(c, job);
      resultados.push({ grupo: g.grupo, nombre: job.nombre ? job.nombre + '.jpg' : nombreJob(job, k), job, blob });
      if (n % 10 === 0) { pintarResultados(); await new Promise(r => setTimeout(r)); }
    }
  }
  $('#c-estadoHacer').textContent = `Listos ${plural(total, 'anuncio', 'anuncios')}.`;
  trabajando = false; pintarResultados();
  $('#c-resultados').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ───────────── 3 · el calendario ───────────── */
function productosParaPlan() {
  return fotos.filter(f => f.usar).map(f => ({ id: f.id, cat: f.muchas ? 'tienda' : f.cat, recortada: !!(f.usarRecorte && f.recorte) }));
}
async function hacerCampana() {
  const prods = productosParaPlan();
  if (!prods.length) { $('#c-estadoHacer').textContent = 'Primero trae fotos (paso 1).'; return; }
  if (!estilosElegidos.size) { $('#c-estadoHacer').textContent = 'Elige al menos un estilo (paso 2).'; return; }
  const op = { dias: +$('#c-dias').value || 15, porDia: +$('#c-porDia').value || 10, historias: +$('#c-historias').value || 0, inicio: $('#c-inicio').value,
    semilla: +$('#c-semilla').value || 1, estilos: [...estilosElegidos], whatsapp: ctx.marcaParaMotor().whatsapp || '' };
  op.historias = Math.min(op.historias, op.porDia);
  const plan = planCampana(prods, op);
  await hacer(plan.map(d => ({ grupo: d.etiqueta, jobs: d.anuncios })));
}

/* ───────────── 4 · tanda y encuesta ───────────── */
/* Cómo se dice una de cada cosa en la tanda: «estrena SU playera», «hoy se entrega EL pantalón #3». */
const COSA = { playera: ['playera', 'playeras', 'la'], sudadera: ['sudadera', 'sudaderas', 'la'], chamarra: ['chamarra', 'chamarras', 'la'], polo: ['polo', 'polos', 'la'],
  camisa: ['camisa', 'camisas', 'la'], blusa: ['blusa', 'blusas', 'la'], vestido: ['vestido', 'vestidos', 'el'], falda: ['falda', 'faldas', 'la'], pantalon: ['pantalón', 'pantalones', 'el'],
  short: ['short', 'shorts', 'el'], tenis: ['par de tenis', 'tenis', 'el'], botas: ['par de botas', 'botas', 'el'], zapatos: ['par de zapatos', 'zapatos', 'el'],
  sandalias: ['par de sandalias', 'sandalias', 'el'], bolsa: ['bolsa', 'bolsas', 'la'], cartera: ['cartera', 'carteras', 'la'], mochila: ['mochila', 'mochilas', 'la'],
  cinturon: ['cinturón', 'cinturones', 'el'], gorra: ['gorra', 'gorras', 'la'], lentes: ['par de lentes', 'lentes', 'el'], reloj: ['reloj', 'relojes', 'el'], joyeria: ['joya', 'joyas', 'la'],
  locion: ['loción', 'lociones', 'la'], cosmetico: ['kit de belleza', 'cosméticos', 'el'], termo: ['termo', 'termos', 'el'], tienda: ['prenda', 'prendas', 'la'], producto: ['prenda', 'prendas', 'la'] };
const cosaDe = cat => COSA[cat] || COSA.producto;
/* «Tanda de zapatos» con una sola foto de zapatos y dieciséis de tenis: en la calle todo eso es
   calzado, así que si la categoría no alcanza se completa con su familia (primero lo suyo). */
const FAMILIA = { tenis: 'calzado', zapatos: 'calzado', botas: 'calzado', sandalias: 'calzado', bolsa: 'bolsas', cartera: 'bolsas', mochila: 'bolsas' };
const deFamilia = cat => FAMILIA[cat] ? [cat, ...Object.keys(FAMILIA).filter(c => c !== cat && FAMILIA[c] === FAMILIA[cat])] : [cat];
function pintarOpcionesTanda() {
  let cats = [...new Set(fotos.filter(f => f.usar && !f.muchas).map(f => f.cat))];
  // con tenis o botas ya se puede hacer «tanda de zapatos» (calzado); con carteras, «de bolsas»
  for (const [fam, general] of [['calzado', 'zapatos'], ['bolsas', 'bolsa']]) if (cats.some(c => FAMILIA[c] === fam) && !cats.includes(general)) cats.push(general);
  const todas = cats.length ? cats : ['playera', 'sudadera', 'pantalon', 'chamarra', 'locion'];
  for (const id of ['#c-tCat', '#c-eA', '#c-eB']) {
    const s = $(id); if (!s) continue; const v = s.value;
    s.replaceChildren(...[...new Set([...todas, 'playera', 'sudadera', 'pantalon', 'chamarra', 'locion'])].map(c => h('option', { value: c, selected: c === v }, (CAT[c] || CAT.producto).nombre)));
    if (!v && id === '#c-eB' && s.options[1]) s.selectedIndex = 1;
  }
}
const fotosCat = (cat, n, recortadas = true) => fotos.filter(f => f.usar && f.cat === cat && !f.muchas && (!recortadas || (f.usarRecorte && f.recorte))).slice(0, n).map(f => f.id);
const fotosFam = (cat, n, recortadas = true) => deFamilia(cat).flatMap(c => fotosCat(c, n, recortadas)).slice(0, n);
async function hacerTanda() {
  const cat = $('#c-tCat').value, [cosa, pl, genero] = cosaDe(cat), fam = deFamilia(cat);
  const fondo = fam.map(c => fotos.find(f => f.usar && f.cat === c && f.muchas)).find(Boolean) || fam.map(c => fotos.find(f => f.usar && f.cat === c)).find(Boolean);
  const jobs = planTanda({ cat, cosa, plural: pl, genero, personas: +$('#c-tPersonas').value || 15, precio: $('#c-tPrecio').value.trim(), fondo: fondo?.id,
    fotos: fotosFam(cat, 3), completas: fotosFam(cat, 4, false), avance: $('#c-tAvance').checked });
  await hacer([{ grupo: `Tanda de ${pl}`, jobs }]);
}
async function hacerEncuesta() {
  const a = $('#c-eA').value, b = $('#c-eB').value;
  const jobs = planEncuesta({ titulo: $('#c-eTitulo').value.trim() || '¿Qué tanda sigue?', a: (CAT[a] || CAT.producto).nombre, b: (CAT[b] || CAT.producto).nombre,
    fotosA: fotosCat(a, 2).length ? fotosCat(a, 2) : fotosCat(a, 2, false), fotosB: fotosCat(b, 2).length ? fotosCat(b, 2) : fotosCat(b, 2, false) });
  await hacer([{ grupo: 'Encuesta', jobs }]);
}

/* ───────────── 5 · resultados ───────────── */
function pintarResultados() {
  const r = $('#c-resultados'); if (!r) return;
  const grupos = [...new Set(resultados.map(x => x.grupo))];
  $('#c-bajarTodo').hidden = !resultados.length;
  r.replaceChildren(...grupos.map(g => {
    const de = resultados.filter(x => x.grupo === g);
    return h('section', { class: 'grupo' },
      h('div', { class: 'grupoCab' }, h('h3', {}, g, h('span', { class: 'nota' }, ` · ${de.length}`)),
        navigator.canShare ? h('button', { type: 'button', on: { click: () => compartir(de) } }, 'Guardar en Fotos') : null,
        h('button', { type: 'button', on: { click: () => bajarZip(de, g) } }, 'ZIP del día')),
      h('div', { class: 'galeria' }, de.map(x => h('button', { type: 'button', class: 'miniAnuncio ' + x.job.formato, 'aria-label': `Abrir ${x.nombre}`, on: { click: () => abrir(x) } }, h('img', { src: urlDe(x.blob), alt: x.nombre, loading: 'lazy' })))));
  }));
}
async function compartir(lista) {
  const files = lista.map(x => new File([x.blob], x.nombre.replace(/[\\/]/g, '-'), { type: 'image/jpeg' }));
  try { await navigator.share({ files }); } catch (e) { if (e.name !== 'AbortError') $('#c-estadoHacer').textContent = 'Este teléfono no dejó compartir tantas a la vez; usa el ZIP.'; }
}
function bajar(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
async function bajarZip(lista, nombre) {
  if (!window.JSZip) { $('#c-estadoHacer').textContent = 'Falta el compresor; recarga la página.'; return; }
  $('#c-estadoHacer').textContent = 'Armando el ZIP…';
  const z = new JSZip(), marca = (ctx.marcaParaMotor().nombre || 'marca').replace(/[^\w\s.-]+/g, '').trim() || 'marca';
  for (const x of lista) z.file(`${marca}/${x.grupo}/${x.nombre}`, x.blob);
  bajar(await z.generateAsync({ type: 'blob' }), `${marca} - ${nombre}.zip`.replace(/[\\/:*?"<>|]+/g, '-'));
  $('#c-estadoHacer').textContent = '';
}
/* El visor de uno: más grande, otra versión, otro estilo, bajar o quitar. */
function abrir(x) {
  const dlg = $('#c-visor'), cuerpo = $('#c-visorCuerpo');
  const img = h('img', { src: urlDe(x.blob), alt: x.nombre });
  const aptos = x.job.estilo.startsWith('tanda') || x.job.estilo === 'encuesta' || ['coleccion', 'mosaico'].includes(x.job.estilo) ? [] : ESTILOS.filter(e => e.grupo === 'moda' && !e.varias);
  const rehacer = async (cambio) => {
    Object.assign(x.job, cambio); x.blob = await pintarJob(document.createElement('canvas'), x.job);
    if (!x.job.nombre) x.nombre = x.nombre.replace(/-[^-/]+\.jpg$/, `-${x.job.estilo}.jpg`);   // sólo cambia la última parte: el estilo
    img.src = urlDe(x.blob); pintarResultados();
  };
  cuerpo.replaceChildren(img, h('p', { class: 'nota' }, `${x.grupo} · ${x.nombre}`),
    h('div', { class: 'fila' },
      h('button', { type: 'button', on: { click: () => rehacer({ semilla: (x.job.semilla || 1) + 101 }) } }, '↻ Otra versión'),
      aptos.length ? h('select', { 'aria-label': 'Otro estilo', on: { change: e => rehacer({ estilo: e.target.value }) } }, aptos.map(e => h('option', { value: e.id, selected: e.id === x.job.estilo }, e.nombre))) : null,
      h('button', { class: 'si', type: 'button', on: { click: () => bajar(x.blob, x.nombre) } }, 'Descargar'),
      h('button', { type: 'button', on: { click: () => { resultados = resultados.filter(y => y !== x); dlg.close(); pintarResultados(); } } }, 'Quitar')));
  dlg.showModal();
}

/* ───────────── arranque ───────────── */
export async function iniciarCampana(c) {
  ctx = c;
  fotos = (await fotosDe(ctx.marcaId()).catch(() => [])).sort((a, b) => a.creado - b.creado);
  pintarEstilos(); pintarFotos(); pintarResultados();
  $('#c-delBanco').onclick = () => delBanco().catch(e => aviso(e.message || String(e)));
  $('#c-delTel').onclick = () => delTelefono().catch(e => aviso(e.message || String(e)));
  $('#c-recortar').onclick = () => quitarFondos();
  $('#c-paulina').onclick = () => preguntarPaulina().catch(e => aviso(e.message || String(e)));
  $('#c-borrarTodas').onclick = async () => { if (!fotos.length || !confirm(`¿Quitar las ${fotos.length} fotos de esta marca? (En el banco no se borra nada.)`)) return; for (const f of fotos) await borrarFoto(f.id); fotos = []; pintarFotos(); aviso('Listo, sin fotos.'); };
  $('#c-hacer').onclick = () => hacerCampana().catch(e => { trabajando = false; $('#c-estadoHacer').textContent = 'Algo falló: ' + (e.message || e); });
  $('#c-otraMezcla').onclick = () => { $('#c-semilla').value = (+$('#c-semilla').value || 1) + 1; hacerCampana().catch(e => { trabajando = false; $('#c-estadoHacer').textContent = 'Algo falló: ' + (e.message || e); }); };
  $('#c-tHacer').onclick = () => hacerTanda().catch(e => { trabajando = false; $('#c-estadoHacer').textContent = 'Algo falló: ' + (e.message || e); });
  $('#c-eHacer').onclick = () => hacerEncuesta().catch(e => { trabajando = false; $('#c-estadoHacer').textContent = 'Algo falló: ' + (e.message || e); });
  $('#c-bajarTodo').onclick = () => bajarZip(resultados, 'todo');
  document.querySelectorAll('dialog .cerrar').forEach(b => b.onclick = () => b.closest('dialog').close());
  $('#c-inicio').value ||= new Date(Date.now() + 864e5).toISOString().slice(0, 10);
}
/** Cuando cambia la marca: sus fotos son otras. */
export async function cambioDeMarca() {
  if (!ctx) return;
  fotos = (await fotosDe(ctx.marcaId()).catch(() => [])).sort((a, b) => a.creado - b.creado);
  resultados = []; pintarFotos(); pintarResultados();
}
export const _pruebas = { get fotos() { return fotos; }, get resultados() { return resultados; }, pintarJob, productosParaPlan };
