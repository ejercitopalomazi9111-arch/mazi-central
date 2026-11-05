/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · TU CUENTA
   ───────────────────────────────────────────────────────────────────────────
   Carlos, 5 nov: «el sistema de cuentas para guardar las cartas y mantener la
   progresión». Un APODO y un PIN, nada más: lo juegan niños, y ni el nombre
   real ni un correo hacen falta para guardar unas cartas.

   · Sin cuenta se juega igual (se guarda en el teléfono, como antes).
   · Con cuenta, cada guardado sube solo al servidor de salas, 2 s después del
     último cambio, y en otro teléfono se entra con el mismo apodo y PIN.
   · Gana la copia más nueva (el número `rev`, igual que entre localStorage e
     IndexedDB): un teléfono viejo no le pisa las cartas a uno nuevo.
   · Si no hay internet no pasa nada: se queda pendiente y sube a la siguiente.
   ═══════════════════════════════════════════════════════════════════════════ */
import { C, cadaGuardado, ponerCopia } from './coleccion.js';

/* el servidor de salas de siempre (con dos pes: ver juegos/servidor/wrangler.jsonc);
   `?servidor=` sólo para las pruebas */
const SERVIDOR = (new URLSearchParams(location.search).get('servidor') || 'https://ppuercos.palomazi9111.workers.dev').replace(/\/+$/, '');
const LLAVE = 'puercos2_cuenta';

let yo = (() => { try{ return JSON.parse(localStorage.getItem(LLAVE) || 'null'); }catch(e){ return null; } })();
const guardarYo = () => { try{ yo ? localStorage.setItem(LLAVE, JSON.stringify(yo)) : localStorage.removeItem(LLAVE); if(yo) localStorage.setItem('puercos2_ultima_cuenta', yo.apodo); }catch(e){} };
export const cuenta = () => yo ? { apodo: yo.apodo } : null;

const avisos = [];
export const alCambiarCuenta = (fn) => avisos.push(fn);
const avisar = (que) => { for(const f of avisos){ try{ f(que); }catch(e){} } };

async function pedir(ruta, cuerpo){
  const r = await fetch(SERVIDOR + '/api/puercos/' + ruta, cuerpo ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) } : undefined);
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw Object.assign(new Error(j.error || 'No se pudo (' + r.status + ')'), { status: r.status });
  return j;
}
const copia = () => JSON.parse(JSON.stringify(C));

/* Crear: lo que ya tienes en este teléfono se vuelve tu cuenta. */
export async function crear(apodo, pin){
  const j = await pedir('cuenta/crear', { apodo, pin, datos: copia() });
  yo = { apodo: j.apodo, token: j.token }; guardarYo(); avisar('entro');
  return j;
}
/* Entrar: si la cuenta trae más progreso que este teléfono, se usa la de la
   cuenta; si este teléfono va más adelante (jugó sin internet), se sube. */
export async function entrar(apodo, pin){
  const j = await pedir('cuenta/entrar', { apodo, pin });
  /* ⚠ este teléfono sólo le gana a la cuenta si sus cartas YA eran de esta
     cuenta (jugó sin internet). Si era de otra persona, gana la cuenta: entrar
     a la cuenta del primo no le sube encima tu colección. */
  let ultima = ''; try{ ultima = localStorage.getItem('puercos2_ultima_cuenta') || ''; }catch(e){}
  const mia = ultima && ultima.toLowerCase() === String(j.apodo).toLowerCase();
  yo = { apodo: j.apodo, token: j.token }; guardarYo();
  if(j.datos && !(mia && (C.rev | 0) > (j.rev | 0))) ponerCopia(j.datos);
  else subirYa();
  avisar('entro');
  return j;
}
export function salir(){ yo = null; guardarYo(); avisar('salio'); }

let reloj = 0, subiendo = false, otraVez = false;
export const estadoSubida = { ultima: 0, error: '' };
async function subirYa(){
  if(!yo) return;
  if(subiendo){ otraVez = true; return; }
  subiendo = true;
  try{
    const j = await pedir('cuenta/guardar', { token: yo.token, datos: copia() });
    if(j.viejo && j.datos) ponerCopia(j.datos);      /* otro teléfono iba más adelante */
    estadoSubida.ultima = Date.now(); estadoSubida.error = '';
  }catch(e){
    estadoSubida.error = e.message;
    if(e.status === 401){ yo = null; guardarYo(); avisar('caduco'); }
  }finally{
    subiendo = false;
    if(otraVez){ otraVez = false; setTimeout(subirYa, 500); }
  }
}
cadaGuardado(() => { if(!yo) return; clearTimeout(reloj); reloj = setTimeout(subirYa, 2000); });
/* al volver el internet o al regresar a la app, lo pendiente sube */
addEventListener('online', () => subirYa());
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') subirYa(); });

export async function lideres(){ return pedir('lideres'); }
