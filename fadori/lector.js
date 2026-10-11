/* EL LECTOR DE LA CREDENCIAL · Carlos, 11 de octubre:
   «haz que la app revise que el nombre sea correcto; el grupo no importa
   porque duran mucho».

   Lee la foto EN EL TELÉFONO (Tesseract, vendor/ocr/, Apache 2.0): la foto no
   sale del aparato para esto. Después compara lo leído con el nombre de la
   cuenta («Ana P» = primer nombre e inicial del apellido).

     leer(archivoOImagen)          → { texto, lineas }
     revisarNombre(texto, nombre)   → { coincide, esCredencial, leido, sugerido }

   El nombre en la credencial de la escuela va en MAYÚSCULAS, en uno o dos
   renglones, justo arriba de «Número de Matrícula». Al reverso viene la firma
   del director («Lic. … Director General»): ése NO es el alumno y se quita. */

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
async function aLienzo(fuente){
  let img = fuente;
  if(fuente instanceof Blob){
    const url = URL.createObjectURL(fuente);
    try{ img = await new Promise((si, no) => { const i = new Image(); i.onload = () => si(i); i.onerror = no; i.src = url; }); }
    finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  } else if(typeof fuente === 'string'){
    img = await new Promise((si, no) => { const i = new Image(); i.onload = () => si(i); i.onerror = no; i.src = fuente; });
  }
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const e = Math.min(1.6, 1800 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * e); c.height = Math.round(h * e);
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  let lo = 255, hi = 0; const gris = new Uint8Array(p.length / 4);
  for(let i = 0, k = 0; i < p.length; i += 4, k++){ const v = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) | 0; gris[k] = v; if(v < lo) lo = v; if(v > hi) hi = v; }
  const r = Math.max(1, hi - lo);
  for(let i = 0, k = 0; i < p.length; i += 4, k++){ const v = ((gris[k] - lo) * 255 / r) | 0; p[i] = p[i + 1] = p[i + 2] = v; }
  g.putImageData(d, 0, 0);
  return c;
}

export async function leer(fuente){
  const t = await preparar();
  const c = await aLienzo(fuente);
  const { data } = await t.recognize(c);
  const texto = data.text || '';
  return { texto, lineas: texto.split(/\n+/).map(x => x.trim()).filter(Boolean) };
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

/* el renglón del nombre: mayúsculas, sólo letras, 2+ palabras, arriba de
   «Matrícula» (o, si no se leyó esa palabra, el más largo de ese estilo) */
function nombreLeido(lineas){
  const limpia = (l) => palabras(l).join(' ');
  const iM = lineas.findIndex(l => /MATR[I1L]CULA/.test(sinAcentos(l)));
  const esNombre = (l) => { const p = palabras(l); return p.length >= 1 && p.length <= 4 && p.every(w => w.length >= 2) && /^[^a-z]*$/.test(l.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '')) && !/MATR|GRUPO|CICLO|ESCOLAR|SECRETAR|EDUCACI|DGETI|REMBRANDT|RESPETO|CULTURA|HONOR|DIRECTOR/.test(sinAcentos(l)); };
  if(iM > 0){
    const arriba = [];
    for(let i = iM - 1; i >= 0 && arriba.length < 2; i--){ if(esNombre(lineas[i])) arriba.unshift(limpia(lineas[i])); else if(arriba.length) break; }
    if(arriba.length) return arriba.join(' ');
  }
  const cand = lineas.filter(esNombre).map(limpia).filter(l => l.split(' ').length >= 2);
  return cand.sort((a, b) => b.length - a.length)[0] || '';
}

export function revisarNombre(texto, nombre){
  const lineas = String(texto || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
  let toks = palabras(texto);
  /* fuera la firma del director: «LIC … DIRECTOR» */
  const iD = toks.indexOf('DIRECTOR');
  if(iD >= 0){ const iL = toks.lastIndexOf('LIC', iD); toks = toks.slice(0, iL >= 0 && iD - iL <= 6 ? iL : Math.max(0, iD - 4)).concat(toks.slice(iD + 1)); }
  const esCredencial = /MATR[I1L]CULA|REMBRANDT|CICLO ESCOLAR|DGETI/.test(sinAcentos(texto));
  const leido = nombreLeido(lineas.filter(l => !/DIRECTOR|^LIC\b/.test(sinAcentos(l))));
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
  return { coincide, esCredencial, leido, sugerido };
}

window.FadoriLector = { leer, revisarNombre, sinAcentos };
