/* EL LECTOR DE LA CREDENCIAL · Carlos, 11 de octubre:
   «haz que la app revise que el nombre sea correcto; el grupo no importa
   porque duran mucho».

   Lee la foto EN EL TELÉFONO (Tesseract, vendor/ocr/, Apache 2.0): la foto no
   sale del aparato para esto. Después compara lo leído con el nombre de la
   cuenta («Ana P» = primer nombre e inicial del apellido).

     leer(archivoOImagen)          → { texto, lineas }
     revisarNombre(texto, nombre)   → { coincide, esCredencial, leido, sugerido }

   El nombre en la credencial de la escuela va en MAYÚSCULAS, en uno o dos
   renglones. En la credencial de antes iba justo arriba de «Número de
   Matrícula»; en la nueva del ciclo 2026-2027 (Carlos, 15 de octubre) van el
   nombre y abajo los apellidos, justo arriba de «BACHILLERATO», con los logos
   de la SEP y la DGETI a los lados. Se aceptan las dos.
   Al reverso viene la firma del director («Lic. … Director General», que el
   lector suele leer «Lie.»): ése NO es el alumno y se quita.

   Con una foto de lejos el nombre sale chico y el lector se come letras
   («DIEGO» → «GO»): por eso, si encuentra la palabra de referencia, vuelve a
   leer de cerca SÓLO la franja de arriba, ampliada y con el contraste de esa
   franja (`zona`). */

const BASE = new URL('vendor/ocr/', import.meta.url).href;
let trabajador = null;

function cargarScript(src){
  return new Promise((si, no) => {
    if(window.Tesseract) return si();
    const s = document.createElement('script'); s.src = src; s.onload = si; s.onerror = () => no(new Error('No cargó el lector.'));
    document.head.appendChild(s);
  });
}
async function preparar(){
  if(trabajador) return trabajador;
  await cargarScript(BASE + 'tesseract.min.js');
  trabajador = await window.Tesseract.createWorker('spa', 1, {
    workerPath: BASE + 'worker.min.js', corePath: BASE, langPath: BASE, gzip: true, workerBlobURL: false,
  });
  return trabajador;
}

/* la foto de la cámara pesa 4000 px; para leer bastan ~1800 del lado largo,
   en gris y con el contraste estirado (la letra roja sale mejor en gris) */
async function aImagen(fuente){
  if(fuente instanceof Blob){
    const url = URL.createObjectURL(fuente);
    try{ return await new Promise((si, no) => { const i = new Image(); i.onload = () => si(i); i.onerror = no; i.src = url; }); }
    finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  if(typeof fuente === 'string') return await new Promise((si, no) => { const i = new Image(); i.onload = () => si(i); i.onerror = no; i.src = fuente; });
  return fuente;
}
/* en gris y con el contraste estirado a lo que hay en ESE pedazo */
function grisear(c){
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  let lo = 255, hi = 0; const gris = new Uint8Array(p.length / 4);
  for(let i = 0, k = 0; i < p.length; i += 4, k++){ const v = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) | 0; gris[k] = v; if(v < lo) lo = v; if(v > hi) hi = v; }
  const r = Math.max(1, hi - lo);
  for(let i = 0, k = 0; i < p.length; i += 4, k++){ const v = ((gris[k] - lo) * 255 / r) | 0; p[i] = p[i + 1] = p[i + 2] = v; }
  g.putImageData(d, 0, 0);
  return c;
}
async function aLienzo(fuente){
  const img = await aImagen(fuente);
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const e = Math.min(1.6, 1800 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * e); c.height = Math.round(h * e);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { c: grisear(c), img, e };
}
/* la franja del nombre, recortada de la foto ORIGINAL y ampliada */
function franja(img, x0, y0, x1, y1){
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), k = Math.min(4, 1600 / w);
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(img, x0, y0, w, h, 0, 0, c.width, c.height);
  return grisear(c);
}
const ANCLA = /BACHILLER|MATR[I1L]CULA/;
export async function leer(fuente){
  const t = await preparar();
  const { c, img, e } = await aLienzo(fuente);
  const { data } = await t.recognize(c, {}, { text: true, blocks: true });
  const texto = data.text || '';
  /* la palabra de referencia y, arriba de ella, la franja del nombre */
  let zona = '';
  const pals = (data.blocks || []).flatMap(b => b.paragraphs || []).flatMap(p => p.lines || []).flatMap(l => l.words || []);
  const ancla = pals.find(w => ANCLA.test(sinAcentos(w.text)));
  if(ancla){
    const b = ancla.bbox, aw = (b.x1 - b.x0) / e, ah = (b.y1 - b.y0) / e, x = b.x0 / e, y = b.y0 / e;
    const W = img.naturalWidth || img.width;
    const x0 = Math.max(0, x - aw * 0.9), x1 = Math.min(W, x + aw * 1.9), y0 = Math.max(0, y - ah * 6.5), y1 = y - ah * 0.15;
    if(y1 - y0 > ah * 2){
      await t.setParameters({ tessedit_pageseg_mode: '6' });
      try{ zona = ((await t.recognize(franja(img, x0, y0, x1, y1))).data.text || '').trim(); }
      finally { await t.setParameters({ tessedit_pageseg_mode: '3' }); }
    }
  }
  return { texto, zona, lineas: texto.split(/\n+/).map(x => x.trim()).filter(Boolean) };
}

export const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const palabras = (s) => sinAcentos(s).replace(/[^A-ZÑ\s]/g, ' ').split(/\s+/).filter(Boolean);

/* distancia de edición, para perdonarle al lector una letra (GUTIERREZ/GUTIERRFZ) */
function distancia(a, b){
  if(Math.abs(a.length - b.length) > 2) return 9;
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for(let j = 1; j <= b.length; j++) m[0][j] = j;
  for(let i = 1; i <= a.length; i++) for(let j = 1; j <= b.length; j++)
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}
const parecido = (tok, pal) => tok === pal || (pal.length >= 4 && distancia(tok, pal) <= (pal.length >= 8 ? 2 : 1));

/* lo que se cuela en el renglón del nombre (los logos de los lados) y los
   renglones de la credencial que NO son un nombre aunque vayan en mayúsculas */
const RUIDO = new Set(['SEP', 'DGETI', 'DGET', 'US']);
const NO_NOMBRE = /MATR|GRUPO|CICLO|ESCOLAR|SECRETAR|EDUCACI|REMBRANDT|RESPETO|CULTURA|HONOR|DIRECTOR|BACHILLER|INSTITUTO|QUERETARO|CONTACTO|BISONES|CALLE|SATELITE|CCT|RVOE/;
/* las palabras tal como salieron (con minúsculas), para distinguir el nombre
   de la basura del borde: «Ss SEF RIVERA RUIZ :|» → «RIVERA RUIZ» */
const crudas = (l) => String(l || '').split(/\s+/).map(w => w.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '')).filter(Boolean);
const esRuido = (w) => RUIDO.has(w) || (w.length === 3 && distancia(w, 'SEP') <= 1);
const limpia = (l) => crudas(l).filter(w => w.length >= 2 && w === w.toUpperCase()).map(sinAcentos).filter(w => !esRuido(w)).join(' ');
/* un renglón es nombre si lo que queda (1 a 4 palabras en mayúsculas) es casi todo el renglón */
const esNombre = (l) => {
  const k = limpia(l).split(' ').filter(Boolean);
  const total = crudas(l).filter(w => !esRuido(sinAcentos(w))).join('').length;   /* los logos no cuentan */
  return k.length >= 1 && k.length <= 4 && k.join('').length >= total * 0.6 && !NO_NOMBRE.test(k.join(' '));
};
/* el nombre: los (hasta) dos renglones de ese estilo justo arriba de la
   referencia —«Matrícula» en la de antes, «Bachillerato» en la nueva—; si no
   se leyó la referencia, el más largo de ese estilo */
function nombreLeido(lineas){
  const iM = lineas.findIndex(l => ANCLA.test(sinAcentos(l)));
  if(iM > 0){
    const arriba = [];
    for(let i = iM - 1; i >= 0 && arriba.length < 2; i--){ if(esNombre(lineas[i])) arriba.unshift(limpia(lineas[i])); else if(arriba.length) break; }
    if(arriba.length) return arriba.join(' ');
  }
  const cand = lineas.filter(esNombre).map(limpia).filter(l => l.split(' ').length >= 2);
  return cand.sort((a, b) => b.length - a.length)[0] || '';
}
const renglones = (t) => String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean);

export function revisarNombre(texto, nombre, zona = ''){
  const lineas = renglones(texto);
  let toks = palabras(zona + '\n' + texto);
  /* fuera la firma del director: «LIC … DIRECTOR» (el lector lee «Lie.») */
  const iD = toks.indexOf('DIRECTOR');
  if(iD >= 0){ const iL = Math.max(toks.lastIndexOf('LIC', iD), toks.lastIndexOf('LIE', iD)); toks = toks.slice(0, iL >= 0 && iD - iL <= 6 ? iL : Math.max(0, iD - 4)).concat(toks.slice(iD + 1)); }
  const T = sinAcentos(texto);
  const esCredencial = /MATR[I1L]CULA|REMBRANDT|CICLO ESCOLAR|DGETI|BACHILLERATO/.test(T);
  /* la vuelta: firma y contacto, sin nombre de alumno */
  const esReverso = /DIRECTOR|CONTACTO/.test(T) && !ANCLA.test(T);
  const quita = (ls) => ls.filter(l => !/DIRECTOR|^LI[CE]\b/.test(sinAcentos(l)));
  /* primero lo de la franja leída de cerca (con la referencia al final, para que sirva de ancla) */
  const leido = esReverso ? '' : (zona && nombreLeido(quita(renglones(zona)).concat('BACHILLERATO'))) || nombreLeido(quita(lineas));
  const pide = palabras(nombre), enteras = pide.filter(p => p.length > 1), iniciales = pide.filter(p => p.length === 1);
  let coincide = enteras.length > 0, ultimo = -1;
  for(const p of enteras){
    const i = toks.findIndex((t, k) => k > ultimo - 3 && parecido(t, p));
    if(i < 0){ coincide = false; break; }
    ultimo = Math.max(ultimo, i);
  }
  /* la inicial del apellido: una palabra DESPUÉS del nombre, a lo mucho 4 más allá */
  if(coincide) for(const ini of iniciales){
    const ok = toks.slice(ultimo + 1, ultimo + 5).some(t => t.length >= 2 && t[0] === ini);
    if(!ok){ coincide = false; break; }
  }
  /* lo que se le propone si no coincide: primer nombre + inicial del primer apellido.
     En la credencial van nombre(s) y luego los dos apellidos: con 4 palabras
     el apellido es la 3.ª; con 3, la 2.ª; con 2, la 2.ª */
  let sugerido = '';
  const pl = leido.split(' ').filter(Boolean);
  if(pl.length >= 2){
    const ap = pl.length >= 4 ? pl[pl.length - 2] : pl[1];
    const cap = (w) => w.charAt(0) + w.slice(1).toLowerCase();
    sugerido = cap(pl[0]) + ' ' + ap.charAt(0);
  }
  if(esReverso) coincide = false;                 /* en la vuelta sólo hay nombres que no son del alumno */
  return { coincide, esCredencial, esReverso, leido, sugerido };
}

window.FadoriLector = { leer, revisarNombre, sinAcentos };
