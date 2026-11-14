/* ══════════════════════════════════════════════════════════════════════════
   EL REPASO ESPACIADO DE CARYMO
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 14 nov: «estudia libros de pedagogía para hacer todo el sistema pedagógico y que sea más eficaz».
   Lo que más rinde según la investigación (PEDAGOGIA.md): volver a sacar de la memoria lo aprendido
   (práctica de recuperación) en días separados (repaso espaciado), mezclando temas (intercalado).

   · Cada pregunta contestada entra a una caja (Leitner): la fallada vuelve mañana; la acertada se aleja
     1 → 2 → 4 → 8 → 16 días.
   · Con examen en el calendario, ningún hueco pasa de ~15 % de lo que falta (Cepeda et al., 2008: el
     hueco ideal es una fracción del tiempo hasta la prueba), y la última semana todo vuelve cada 1-2 días.
   · El repaso del día trae primero lo que más fallas y alterna temas.
   Sin pantalla: sólo la cuenta. Se guarda en el teléfono (carymo.repaso).
   ═════════════════════════════════════════════════════════════════════════ */
const LLAVE = 'carymo.repaso';
export const HUECOS = [0, 1, 2, 4, 8, 16];
const leer = () => { try{ return JSON.parse(localStorage.getItem(LLAVE) || '{}'); }catch{ return {}; } };
const escribir = (d) => { try{ localStorage.setItem(LLAVE, JSON.stringify(d)); }catch{} };
const dia = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const sumarDias = (hoy, n) => dia(new Date(hoy + 'T12:00:00').getTime() + n * 864e5);
const entre = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);

/* la misma pregunta siempre da la misma llave, aunque el plan se vuelva a armar */
export function clave(q){
  const t = [q.tipo, q.pregunta || q.frase || '', q.respuesta || (q.opciones && q.opciones[q.correcta]) || ''].join('|').toLowerCase();
  let h = 2166136261; for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'r' + (h >>> 0).toString(36);
}
/* cuántos días hasta el siguiente repaso */
export function hueco(caja, hoy, examen){
  let d = HUECOS[Math.max(0, Math.min(HUECOS.length - 1, caja))];
  if(examen){
    const faltan = entre(hoy, examen);
    if(faltan >= 0){
      d = Math.min(d, Math.max(1, Math.round(faltan * .15)));
      if(faltan <= 7) d = Math.min(d, caja >= 4 ? 2 : 1);
      if(d > faltan && faltan > 0) d = faltan;   /* que el último repaso caiga antes del examen */
    }
  }
  return Math.max(1, d);
}
const limpia = (q) => { const o = {}; for(const [k, v] of Object.entries(q)) if(!k.startsWith('_') && k !== 'intento') o[k] = v; return o; };
export function registrar(q, bien, { plan = '', tema = '', materia = '', examen = '', hoy = dia(Date.now()) } = {}){
  const d = leer(), k = clave(q), r = d[k] || { q: limpia(q), plan, tema, materia, caja: 0, fallos: 0, aciertos: 0 };
  r.q = limpia(q); r.plan = plan || r.plan; r.tema = tema || r.tema; r.materia = materia || r.materia; r.examen = examen || r.examen || '';
  if(bien){ r.aciertos++; r.caja = Math.min(HUECOS.length - 1, r.caja + 1); }
  else { r.fallos++; r.caja = 1; }
  r.ultimo = hoy; r.prox = sumarDias(hoy, bien ? hueco(r.caja, hoy, r.examen) : 1);
  d[k] = r; escribir(d);
  return r;
}
/* las que tocan hoy: primero las más falladas; luego se alternan los temas (intercalado) */
export function pendientes(hoy = dia(Date.now()), limite = 10, { planes = null } = {}){
  const d = leer();
  const toca = Object.values(d).filter((r) => r.prox && r.prox <= hoy && (!planes || planes.includes(r.plan)) && !(r.examen && r.examen < hoy && r.caja >= 3));
  toca.sort((a, b) => (b.fallos - b.aciertos * .5) - (a.fallos - a.aciertos * .5) || a.prox.localeCompare(b.prox));
  const porTema = new Map(); for(const r of toca){ const t = r.plan + '·' + r.tema; if(!porTema.has(t)) porTema.set(t, []); porTema.get(t).push(r); }
  const grupos = [...porTema.values()], out = [];
  while(out.length < limite && grupos.some((g) => g.length)) for(const g of grupos){ if(g.length && out.length < limite) out.push(g.shift()); }
  return out;
}
export const cuantas = (hoy, opts) => pendientes(hoy, 999, opts).length;
/* lo que más fallas, para decírtelo con nombre */
export function masFalladas(limite = 5){
  return Object.values(leer()).filter((r) => r.fallos).sort((a, b) => (b.fallos - b.aciertos) - (a.fallos - a.aciertos)).slice(0, limite);
}
export const _borrar = () => escribir({});
