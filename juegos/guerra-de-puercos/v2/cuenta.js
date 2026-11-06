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
export const SERVIDOR = (new URLSearchParams(location.search).get('servidor') || 'https://ppuercos.palomazi9111.workers.dev').replace(/\/+$/, '');
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

/* ── JUNTAR DOS COPIAS, SIN PERDER NADA ──────────────────────────────────────
   ⚠ Carlos, 5 nov: «no está entregando fichas… no pueden comprar más sobres… no se estaquean». Era esto: con
   la misma cuenta en dos teléfonos (o al cambiar de teléfono), cuando el servidor tenía una copia más nueva se
   la ponía ENTERA al teléfono, y lo que ese teléfono acababa de ganar o comprar desaparecía. Ahora se suma:
   «la base» es la última copia en la que este teléfono y el servidor estaban de acuerdo, y lo que cambió aquí
   desde la base (monedas, cartas, sobres comprados o abiertos, partidas) se le pone encima a la del servidor. */
const LLAVE_BASE = 'puercos2_base';
const leerBase = () => { try{ const b = JSON.parse(localStorage.getItem(LLAVE_BASE) || 'null'); return b && yo && b.apodo === yo.apodo ? b.datos : null; }catch(e){ return null; } };
const ponerBase = (datos) => { try{ if(yo && datos) localStorage.setItem(LLAVE_BASE, JSON.stringify({ apodo: yo.apodo, datos })); else localStorage.removeItem(LLAVE_BASE); }catch(e){} };
export function fusionar(srv, loc, base){
  const out = JSON.parse(JSON.stringify(srv || {})), b = base || null;
  /* sin base (copias de antes de este arreglo) no se sabe qué cambió: se queda lo más alto de cada cosa */
  const num = (s, l, k) => b ? Math.max(0, (s | 0) + (l | 0) - (k | 0)) : Math.max(s | 0, l | 0);
  out.monedas = num(srv.monedas, loc.monedas, b?.monedas);
  for(const campo of ['cartas', 'cosmeticos', 'soporte', 'stats']){ const S = srv[campo] || {}, L = loc[campo] || {}, K = b?.[campo] || {}; const o = { ...S };
    for(const k of new Set([...Object.keys(S), ...Object.keys(L)])) o[k] = num(S[k], L[k], K[k]);
    out[campo] = o; }
  /* los sobres: los del servidor, menos los que se abrieron aquí, más los que se compraron aquí */
  const ids = (x) => new Set((x || []).map(s => s.id)), enBase = ids(b?.sobres), enLoc = ids(loc.sobres), enSrv = ids(srv.sobres);
  out.sobres = [...(srv.sobres || []).filter(s => !(enBase.has(s.id) && !enLoc.has(s.id))), ...(loc.sobres || []).filter(s => !enSrv.has(s.id) && (!b || !enBase.has(s.id)))];
  out.puesto = { ...(srv.puesto || {}), ...(loc.puesto || {}) };
  for(const k of ['bienvenida', 'regalo']) out[k] = !!(srv[k] || loc[k]);
  for(const k of Object.keys(loc)) if(!(k in out)) out[k] = loc[k];
  out.rev = Math.max(srv.rev | 0, loc.rev | 0) + 1;
  return out;
}

/* Crear: lo que ya tienes en este teléfono se vuelve tu cuenta. */
export async function crear(apodo, pin){
  const datos = copia(), j = await pedir('cuenta/crear', { apodo, pin, datos });
  yo = { apodo: j.apodo, token: j.token }; guardarYo(); ponerBase({ ...datos, rev: j.rev | 0 }); avisar('entro');
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
  /* si las cartas de este teléfono ya eran de esta cuenta, se juntan con las del servidor (no se pisa nada);
     si eran de otra persona, gana la cuenta */
  const srv = j.datos ? { ...j.datos, rev: j.rev | 0 } : null;
  if(srv && mia){ const f = fusionar(srv, copia(), leerBase()); ponerBase(srv); ponerCopia(f); subirYa(); }
  else if(srv){ ponerBase(srv); ponerCopia(srv); }
  else { ponerBase(null); subirYa(); }
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
    const base = leerBase(), mando = copia(), j = await pedir('cuenta/guardar', { token: yo.token, datos: mando, ...(base && Number.isInteger(base.rev) ? { desde: base.rev } : {}) });
    if(j.viejo && j.datos){
      /* otro teléfono guardó mientras tanto: se juntan las dos (con lo que haya cambiado aquí hasta AHORA) y se sube la junta */
      const srv = { ...j.datos, rev: j.rev | 0 }, f = fusionar(srv, copia(), base);
      ponerBase(srv); ponerCopia(f); otraVez = true;
    } else if(j.bien){ ponerBase({ ...mando, rev: j.rev | 0 }); }
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
/* al salir se sube; al volver (y cada 30 s con la app abierta) se pregunta si otro teléfono avanzó */
document.addEventListener('visibilitychange', () => subirYa());
setInterval(() => { if(yo && document.visibilityState === 'visible') subirYa(); }, 30000);

export async function lideres(){ return pedir('lideres'); }

/* ── AMIGOS Y RETOS (Carlos, 5 nov: «sistema de amigos para poder retarlos
   más fácil a combates»). Todo va con tu sesión; sin cuenta no hay amigos. */
const conSesion = (ruta, extra = {}) => {
  if(!yo) return Promise.reject(new Error('Primero entra a tu cuenta.'));
  return pedir(ruta, { token: yo.token, ...extra }).catch((e) => { if(e.status === 401){ yo = null; guardarYo(); avisar('caduco'); } throw e; });
};
export const amigos = () => conSesion('amigos');
export const pedirAmigo = (apodo) => conSesion('amigos/pedir', { apodo });
export const aceptarAmigo = (apodo) => conSesion('amigos/aceptar', { apodo });
export const quitarAmigo = (apodo) => conSesion('amigos/quitar', { apodo });
export const retar = (apodo, codigo) => conSesion('reto', { apodo, codigo });
export const borrarReto = (apodo) => conSesion('reto/borrar', { apodo });
