/* ══════════════════════════════════════════════════════════════════════════
   EL VESTIDOR · tu personaje de perfil (Carlos, 13 nov, bloque 6)
   ──────────────────────────────────────────────────────────────────────────
   El catálogo (qué existe y qué cuesta) vive en carymo/ropa.js y lo leen los dos
   lados. Aquí sólo se COBRA y se GUARDA, porque el saldo nunca vive sólo en el
   teléfono (igual que palomium.js):

     perfil.personaje   { piel, pelo, colorPelo, ojos, cejas, boca, barba, ropa, colorRopa,
                          estampa, gorro, colorGorro, lentes, fondo }
     perfil.ropa        [ids de TIENDA_ROPA que ya compraste]

   Acciones de /estudio:
     comprarRopa { item }        cobra, y ya es tuya para siempre
     vestir      { personaje }   se guarda SÓLO lo que existe y lo que es tuyo
     personajes  { cuentas }     los de otros, para pintarlos en el ranking y en amigos
   ═════════════════════════════════════════════════════════════════════════ */
import { TIENDA_ROPA, normalizarPersonaje } from '../../carymo/ropa.js';

const kPerfil = (c) => `est:perfil:${c}`;
const cuentaValida = (x) => typeof x === 'string' && /^[a-z0-9_-]{1,40}$/.test(x);

export async function atenderVestidor(storage, c, cuenta, perfil, ahora){
  if(!Array.isArray(perfil.ropa)) perfil.ropa = [];

  if(c.accion === 'comprarRopa'){
    const it = TIENDA_ROPA[String(c.item || '')];
    if(!it) return { error: 'Eso no está en la tienda.', estado: 400 };
    if(perfil.ropa.includes(c.item)) return { error: 'Ya es tuyo.', estado: 400 };
    if((perfil.cubos || 0) < it.precio) return { error: `Te faltan ${it.precio - (perfil.cubos || 0)} cubitos.`, estado: 400 };
    perfil.cubos -= it.precio; perfil.ropa.push(c.item);
    perfil.t = ahora; await storage.put(kPerfil(cuenta), perfil);
    return { bien: true, comprado: c.item };
  }
  if(c.accion === 'vestir'){
    if(!c.personaje || typeof c.personaje !== 'object' || JSON.stringify(c.personaje).length > 2000) return { error: 'Ese personaje no se puede guardar.', estado: 400 };
    perfil.personaje = normalizarPersonaje(c.personaje, perfil.ropa, cuenta, perfil.personaje);
    perfil.t = ahora; await storage.put(kPerfil(cuenta), perfil);
    return { bien: true };
  }
  if(c.accion === 'personajes'){
    const cuentas = (Array.isArray(c.cuentas) ? c.cuentas : []).filter(cuentaValida).slice(0, 80);
    const r = {};
    for(const k of cuentas){ const p = await storage.get(kPerfil(k)); r[k] = p && p.personaje ? p.personaje : null; }
    return { bien: true, personajes: r };
  }
  return null;
}
