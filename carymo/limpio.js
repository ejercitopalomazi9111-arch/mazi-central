/* CARYMO · APUNTES EN LIMPIO (lista de herramientas de Carlos, #116: «apuntes bonitos»).
   Dentro de un apunte tuyo: «En limpio» toma lo que escribiste (o «Desde foto», una foto de tu cuaderno) y la IA lo
   ordena en secciones con sus puntos, los términos clave con su definición y un resumen de tres renglones. Se guarda
   JUNTO al apunte (`bonito`); tu texto no se toca. Lo que la IA no puede leer de la foto lo dice, no lo inventa.
   La cuenta y la limpieza viven aquí (se prueban en Node); la pantalla, en apuntes.js. */
const corta = (t, n) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export const SISTEMA_LIMPIO = (tutor) => `Eres un tutor ${tutor}. Pasas EN LIMPIO los apuntes de un alumno: los ordenas para estudiar sin
inventar nada que no esté en ellos. Si viene una foto, primero transcribe lo que se lee; lo que no se lea, no lo adivines.
Español de México, frases cortas. Contesta SÓLO JSON:
{"titulo":"","materia":"","texto":"(sólo si vino foto) la transcripción fiel","secciones":[{"titulo":"","puntos":["",""]}],
"clave":[{"termino":"","definicion":""}],"resumen":"tres renglones como máximo"}
Entre 1 y 6 secciones, de 2 a 6 puntos cada una; de 0 a 8 términos clave. Si no hay nada que ordenar, contesta {"error":"qué pasó"}.`;

/** limpia lo que arma la IA; truena si no sirve (y se pide otra vez) */
export function revisarLimpio(j){
  if(j && j.error && !(j.secciones && j.secciones.length)){ const e = new Error(corta(j.error, 160) || 'No pude leer tus apuntes.'); e.sinReintento = true; throw e; }
  const secciones = (Array.isArray(j?.secciones) ? j.secciones : []).map((s) => ({ titulo: corta(s?.titulo, 80),
    puntos: (Array.isArray(s?.puntos) ? s.puntos : []).map((p) => corta(p, 400)).filter(Boolean).slice(0, 8) })).filter((s) => s.puntos.length).slice(0, 8);
  if(!secciones.length) throw new Error('La IA no ordenó los apuntes.');
  const vistos = new Set();
  const clave = (Array.isArray(j.clave) ? j.clave : []).map((c) => ({ termino: corta(c?.termino, 60), definicion: corta(c?.definicion, 300) }))
    .filter((c) => c.termino && c.definicion && !vistos.has(c.termino.toLowerCase()) && vistos.add(c.termino.toLowerCase())).slice(0, 10);
  return { titulo: corta(j.titulo, 90), materia: corta(j.materia, 40), texto: String(j.texto ?? '').trim().slice(0, 8000),
    secciones, clave, resumen: corta(j.resumen, 500), cuando: Date.now() };
}

/** la hoja en limpio (HTML); `esc` escapa */
export function htmlLimpio(b, esc){
  return `<div class="lp-hoja">
    ${b.resumen ? `<div class="lp-resumen"><small>En corto</small><p>${esc(b.resumen)}</p></div>` : ''}
    ${b.secciones.map((s, i) => `<section class="lp-sec"><h3><span>${i + 1}</span>${esc(s.titulo || 'Puntos')}</h3><ul>${s.puntos.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>`).join('')}
    ${b.clave.length ? `<div class="lp-clave"><h3>Términos clave</h3><dl>${b.clave.map((c) => `<div><dt>${esc(c.termino)}</dt><dd>${esc(c.definicion)}</dd></div>`).join('')}</dl></div>` : ''}
  </div>`;
}

/** la foto se achica antes de mandarla */
export async function fotoChica(archivo){
  const img = await createImageBitmap(archivo).catch(() => null); if(!img) return null;
  const k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
  cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return { mime: 'image/jpeg', data: cv.toDataURL('image/jpeg', .85).split(',')[1] };
}
