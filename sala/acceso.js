/* acceso.js — CÓMO LLEGA UN PEDIDO DE CARYMO (y del pizarrón dentro de CARYMO) A LA SALA
 * Carlos, 13 nov: «que no requiera de la llave de la sala, porque estarla dando es darle acceso a la gente a la
 * sala». Dos caminos:
 *   · con la LLAVE de La Sala (Carlos, Luis): /api/sala/GRUPAZ/<ruta>, como siempre;
 *   · con la CUENTA de CARYMO (usuario y contraseña; el token vive en este teléfono): /api/carymo/<ruta>.
 *     Ese token sólo abre CARYMO (estudio, ia-texto, ia-voz): no el chat ni nada más de la sala.
 * Si hay las dos, va la llave (es el dueño y no tiene tope de IA). */
import { llave, llamar, SERVIDOR, SALA } from '../presentaciones/ia.js';

export const tokenCuenta = () => { try{ return localStorage.getItem('carymo.token') || ''; }catch{ return ''; } };
export const conAcceso = () => !!(llave() || tokenCuenta());
export { llave, SERVIDOR, SALA };

/* regresa la Response, igual que `llamar` */
export async function pedirSala(ruta, { metodo = 'POST', cuerpo, espera = 150000, q = '' } = {}){
  if(llave() || !tokenCuenta()) return llamar(`${SERVIDOR}/api/sala/${SALA}/${ruta}${q}`, { metodo, cuerpo, espera });
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), espera);
  try{
    return await fetch(`${SERVIDOR}/api/carymo/${ruta}${q}`, {
      method: metodo, signal: ctl.signal,
      headers: { ...(cuerpo ? { 'Content-Type': 'application/json' } : {}), 'x-token': tokenCuenta() },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  }catch(e){
    if(e.name === 'AbortError') throw new Error('Tardó demasiado y se cortó. Prueba otra vez.');
    throw new Error(`No hay conexión${typeof navigator !== 'undefined' && navigator.onLine === false ? ': este teléfono está sin internet' : ''}. Prueba otra vez.`);
  }finally{ clearTimeout(t); }
}

/* las cuentas (las mismas de la comunidad de INKWELL: una cuenta Mazi sirve para las dos) */
export async function cuenta(accion, datos){
  let r;
  try{ r = await fetch(`${SERVIDOR}/api/sala/comunidad/${accion}`, { method: datos ? 'POST' : 'GET', headers: { ...(datos ? { 'Content-Type': 'application/json' } : {}), ...(tokenCuenta() ? { 'x-token': tokenCuenta() } : {}) }, body: datos ? JSON.stringify(datos) : undefined }); }
  catch{ throw new Error('No hay conexión. Prueba otra vez.'); }
  const j = await r.json().catch(() => ({}));
  if(!r.ok || j.bien === false) throw new Error(j.error || `No se pudo (${r.status}).`);
  return j;
}
export function guardarSesion(j){
  try{ localStorage.setItem('carymo.token', j.token); localStorage.setItem('carymo.usuario', j.yo ? j.yo.usuario : ''); }catch{}
}
export function cerrarSesion(){ try{ localStorage.removeItem('carymo.token'); localStorage.removeItem('carymo.usuario'); }catch{} }
export const usuarioCuenta = () => { try{ return localStorage.getItem('carymo.usuario') || ''; }catch{ return ''; } };
