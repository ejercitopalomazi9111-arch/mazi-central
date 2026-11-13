/* LAS CLASES DEL PIZARRÓN GUARDADAS EN EL TELÉFONO
 * ─────────────────────────────────────────────────────────────────────────────
 * Carlos, 13 nov: «lo que más me importa es que sí se pueda operar sin internet…
 * todo tu plan ya debería estar precargado». Cada clase que Explica arma (o saca
 * de la biblioteca) se guarda aquí, y CARYMO las pide de antemano al crear el plan.
 *
 * Va en IndexedDB y no en localStorage: una clase pesa 10-30 KB y un plan trae
 * veinte; localStorage topa en 5 MB para TODO (planes, perfil, apuntes).
 *
 * La llave es la misma con la que la biblioteca la encuentra: tema + «nivel-largo».
 * Se guarda la PLANTILLA (con {nombre}), igual que en la biblioteca.
 * Una clase «basica» (armada sin red con las ideas de la lección) se usa sólo
 * mientras no haya otra: con internet, Explica pide la de verdad y la pisa.
 */
const BASE = 'explica-clases', CAJA = 'clases';
let abierta = null;

function abrir(){
  if(abierta) return abierta;
  abierta = new Promise((si, no) => {
    try{
      const r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = () => { if(!r.result.objectStoreNames.contains(CAJA)) r.result.createObjectStore(CAJA); };
      r.onsuccess = () => si(r.result);
      r.onerror = () => no(r.error);
    }catch(e){ no(e); }
  });
  abierta.catch(() => { abierta = null; });
  return abierta;
}
async function paso(modo, hacer){
  const db = await abrir();
  return new Promise((si, no) => {
    const t = db.transaction(CAJA, modo), r = hacer(t.objectStore(CAJA));
    t.oncomplete = () => si(r && r.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error);
  });
}

export const claveClase = (tema, nivelB) => `${String(tema || '').trim().toLowerCase()}|${nivelB || ''}`;

export async function leerClase(tema, nivelB){
  try{ return (await paso('readonly', (c) => c.get(claveClase(tema, nivelB)))) || null; }catch{ return null; }
}
export async function guardarClase(tema, nivelB, datos){
  if(!tema || !datos || !Array.isArray(datos.pasos) || !datos.pasos.length) return false;
  try{ await paso('readwrite', (c) => c.put({ ...datos, guardada: Date.now() }, claveClase(tema, nivelB))); return true; }catch{ return false; }
}
export async function hayClase(tema, nivelB, { basicaCuenta = true } = {}){
  const c = await leerClase(tema, nivelB);
  return !!c && (basicaCuenta || !c.basica);
}
