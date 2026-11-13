/* Pruebas del personaje de perfil (vestidor.js + carymo/ropa.js + la acción de estudio.js).
   node sala/servidor/pruebas-vestidor.mjs */
import { atenderEstudio } from './estudio.js';
import { TIENDA_ROPA, OPCIONES, normalizarPersonaje, personajeDeArranque, opcionesAvataaars } from '../../carymo/ropa.js';
import { svgPersonaje } from '../../carymo/vendor/avatar.js';

let bien = 0, mal = 0;
const ok = (c, t) => { if(c){ bien++; console.log('  ✓', t); } else { mal++; console.log('  ✗', t); } };
function almacen(){
  const m = new Map();
  return { m,
    async get(k){ return structuredClone(m.get(k)); },
    async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
    async delete(k){ for(const x of [].concat(k)) m.delete(x); },
    async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); } };
}
async function llamar(s, cuenta, cuerpo){
  const req = new Request('http://x/api/sala/G/estudio', { method: 'POST', body: JSON.stringify(cuerpo) });
  const r = await atenderEstudio(s, req, new URL(req.url), cuenta, Date.parse('2026-11-13T18:00:00Z'));
  return { estado: r.status, ...(await r.json()) };
}

console.log('El catálogo');
ok(Object.values(TIENDA_ROPA).every((a) => OPCIONES[a.parte].includes(a.valor) && a.precio > 0), 'todo lo de la tienda existe como opción y tiene precio');
ok(!Object.values(TIENDA_ROPA).some((a) => ['hijab', 'turban'].includes(a.valor)) && OPCIONES.pelo.includes('hijab') && OPCIONES.pelo.includes('turban'), 'el hiyab y el turbante son gratis: no se venden');
const a1 = personajeDeArranque('carlos'), a2 = personajeDeArranque('carlos');
ok(JSON.stringify(a1) === JSON.stringify(a2) && JSON.stringify(personajeDeArranque('luis')) !== JSON.stringify(a1), 'el de arranque es siempre el mismo para cada quien, y distinto entre personas');
ok(Object.entries(a1).every(([k, v]) => OPCIONES[k].includes(v)), 'y todo lo que trae existe');
const svg = svgPersonaje(opcionesAvataaars({ ...a1, lentes: 'round', gorro: 'winterHat1' }));
ok(/^<svg/.test(svg) && svg.length > 2000, 'la librería dibuja el personaje (SVG)');
ok(svgPersonaje(opcionesAvataaars(a1)) !== svgPersonaje(opcionesAvataaars({ ...a1, lentes: 'round' })), 'ponerle lentes cambia el dibujo');

console.log('Comprar');
{
  const s = almacen();
  let r = await llamar(s, 'ana', { accion: 'vestir', personaje: { ...a1, lentes: 'sunglasses', ojos: 'hearts' } });
  ok(r.bien && r.perfil.personaje.lentes === '' && r.perfil.personaje.ojos === 'hearts', 'ponerte unos lentes que no compraste no se guarda (lo gratis sí)');
  r = await llamar(s, 'ana', { accion: 'comprarRopa', item: 'lentes:sunglasses' });
  ok(r.estado === 400 && /faltan/i.test(r.error), 'sin cubitos suficientes no compra y dice cuántos faltan');
  const p = await s.get('est:perfil:ana'); p.cubos = 40; await s.put('est:perfil:ana', p);
  r = await llamar(s, 'ana', { accion: 'comprarRopa', item: 'lentes:sunglasses' });
  ok(r.bien && r.perfil.cubos === 40 - TIENDA_ROPA['lentes:sunglasses'].precio && r.perfil.ropa.includes('lentes:sunglasses'), 'con cubitos, se cobra el precio y ya es tuyo');
  r = await llamar(s, 'ana', { accion: 'comprarRopa', item: 'lentes:sunglasses' });
  ok(r.estado === 400 && /Ya es tuyo/.test(r.error), 'no se cobra dos veces lo mismo');
  r = await llamar(s, 'ana', { accion: 'comprarRopa', item: 'lentes:inventados' });
  ok(r.estado === 400, 'algo que no está en la tienda no se vende');
  r = await llamar(s, 'ana', { accion: 'vestir', personaje: { ...a1, lentes: 'sunglasses', pelo: 'noExiste' } });
  ok(r.perfil.personaje.lentes === 'sunglasses' && r.perfil.personaje.pelo === a1.pelo, 'ya comprados, sí se los pone; un peinado inventado vuelve al suyo');
  r = await llamar(s, 'ana', { accion: 'personajes', cuentas: ['ana', 'nadie', '../x'] });
  ok(r.personajes.ana.lentes === 'sunglasses' && r.personajes.nadie === null && !('../x' in r.personajes), 'los personajes de otros se piden por cuenta; nombres raros se ignoran');
}

console.log(`\n${bien} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
