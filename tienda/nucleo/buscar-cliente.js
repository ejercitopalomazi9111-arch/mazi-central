/* ══════════════════════════════════════════════════════════════════════════
   ¿A NOMBRE DE QUIÉN? · encontrar al cliente en el mostrador
   ──────────────────────────────────────────────────────────────────────────
   En la caja se busca como se pregunta: «¿cómo se llama?» o «¿cuál es su
   WhatsApp?». Por eso se acepta cualquiera de los dos, en cualquier orden y
   con o sin acentos, y un pedazo del número basta («3786»).
   Sin DOM, para probarlo en Node (pruebas-buscar-cliente.mjs).
   ═════════════════════════════════════════════════════════════════════════ */

export const normal = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const digitos = (t) => String(t ?? '').replace(/\D/g, '');

/* Un celular de México son 10 dígitos. Se aceptan con lada de país (52, +52,
   y el viejo 521) porque así lo copian de WhatsApp. Devuelve los 10 o null. */
export function telefono(t){
  let d = digitos(t);
  if(d.length === 13 && d.startsWith('521')) d = d.slice(3);
  else if(d.length === 12 && d.startsWith('52')) d = d.slice(2);
  return d.length === 10 ? d : null;
}

/* «4428833786» → «442 883 3786», que es como se dicta. */
export function telefonoBonito(t){
  const d = telefono(t);
  return d ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : String(t ?? '');
}

/* lista: [{ id, nombre, telefono }]. Con 3 o más dígitos busca en el teléfono;
   si no, cada palabra tiene que ser el principio de alguna palabra del nombre
   («jua pe» encuentra a «Juan Pérez», «an» no encuentra a «Juan»). Primero los
   que empiezan igual que lo escrito. */
export function buscarClientes(lista, q, max = 8){
  const d = digitos(q), t = normal(q);
  if(!t) return [];
  if(d.length >= 3 && d.length === t.replace(/[\s+()-]/g, '').length){
    return (lista || []).filter((c) => digitos(c.telefono).includes(d)).slice(0, max);
  }
  const palabras = t.split(' ');
  const puntos = [];
  for(const c of lista || []){
    const n = normal(c.nombre); if(!n) continue;
    const suyas = n.split(' ');
    if(!palabras.every((p) => suyas.some((s) => s.startsWith(p)))) continue;
    puntos.push([n.startsWith(t) ? 0 : 1, n, c]);
  }
  return puntos.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])).slice(0, max).map((x) => x[2]);
}

/* ¿Lo que se escribió sirve para dar de alta a alguien nuevo? */
export function revisarAlta({ nombre, telefono: tel }){
  const falta = {};
  if(normal(nombre).length < 2) falta.nombre = 'Falta su nombre';
  if(!telefono(tel)) falta.telefono = digitos(tel).length ? 'Un WhatsApp son 10 números' : 'Falta su WhatsApp';
  return falta;
}

/* Si ya existe alguien con ese número, es él: no se da de alta dos veces. */
export function mismoTelefono(lista, tel){
  const d = telefono(tel); if(!d) return null;
  return (lista || []).find((c) => telefono(c.telefono) === d) || null;
}
