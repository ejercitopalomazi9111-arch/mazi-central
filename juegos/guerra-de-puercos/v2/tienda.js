/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · EL CATÁLOGO, LOS SOBRES Y LA ECONOMÍA
   ───────────────────────────────────────────────────────────────────────────
   Aquí NO se pinta nada: se decide qué sale de un sobre, cuánto cuesta y qué
   pasa con las repetidas. Va aparte para poder probarlo sin pantalla
   (`pruebas-tienda.mjs`): una economía mal hecha no se ve jugando una partida,
   se ve abriendo trescientos sobres y contando.
   ═══════════════════════════════════════════════════════════════════════════ */
import { C, guardar, llaveDe, COSMETICOS, cosmetico, ORDEN_RAREZA } from './coleccion.js';
import { LIDERES } from './lideres.js';

/* ── EL CATÁLOGO DE LA AUTORA ──────────────────────────────────────────────
   Las cien cartas de `cartas.json`, con su arte en `arte/web/`. Los dos
   repetidos EXACTOS (Goku 023/047 y Terremoto 024/063) se cuentan una vez; los
   dos «Troll» valen distinto y son dos cartas de verdad (ARTE.md). */
export const CAT = { todas: [], puercos: [], porNivel: {}, exacta: {}, bono: null, castigo: null, listo: false };

export async function cargarCatalogo(base = '../'){
  const r = await fetch(base + 'cartas.json');
  const d = await r.json();
  const vistas = new Set();
  for(const c of d.cartas || []){
    const arte = base + c.arte.replace('arte/cartas/', 'arte/web/').replace('.jpeg', '.webp');
    const f = { n: c.n, nombre: c.nombre, puntos: c.puntos, nivel: c.nivel, arte };
    const huella = f.nombre + '|' + f.puntos + '|' + f.nivel;
    if(vistas.has(huella)) continue;
    vistas.add(huella);
    CAT.todas.push(f);
    if(c.nivel === 'BONIFICACION'){ CAT.bono = f; continue; }
    if(c.nivel === 'PENALIZACION'){ CAT.castigo = f; continue; }
    if(!ORDEN_RAREZA.includes(c.nivel)) continue;
    CAT.puercos.push(f);
    (CAT.porNivel[c.nivel] ||= []).push(f);
    CAT.exacta[c.nivel + ':' + c.puntos] ||= f;
  }
  CAT.listo = CAT.puercos.length > 0;
  return CAT;
}

/* La ficha (con arte) de una carta del motor `{ valor, nivel }`. */
export function fichaDe(c){
  if(!c) return null;
  if(c.nivel === 'ESP') return c.esp === 'bono' ? CAT.bono : CAT.castigo;
  return CAT.exacta[c.nivel + ':' + c.valor]
      || (CAT.porNivel[c.nivel] || [])[c.valor % ((CAT.porNivel[c.nivel] || []).length || 1)] || null;
}

/* ── LA ECONOMÍA · la de la versión 1, que ya estaba medida ────────────────
   Perder también paga (14), ganar 30, +1 por ronda (tope 15) y la primera
   victoria del día trae 25 de más. Al empezar: 40 monedas. */
export const PAGA = { gana: 30, empata: 18, pierde: 14, porRonda: 1, primeraDelDia: 25 };
export const DEVUELVE = { D: 3, C: 5, B: 8, A: 12, S: 20 };
/* El soporte se colecciona hasta 5 de cada uno, que es lo que cabe en un mazo
   (regla 8 del reglamento: 5 y 5). Del sexto en adelante, monedas. */
export const TOPE_SOPORTE = 5;

const hoyEs = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
export function pagarPartida(comoAcabo, rondas, { cuenta = true } = {}){
  const base = PAGA[comoAcabo === 'gana' ? 'gana' : comoAcabo === 'empata' ? 'empata' : 'pierde'];
  let bono = 0;
  if(comoAcabo === 'gana' && C.victoriaDia !== hoyEs()){ bono = PAGA.primeraDelDia; C.victoriaDia = hoyEs(); }
  const total = base + Math.min(15, Math.max(0, rondas | 0) * PAGA.porRonda) + bono;
  C.monedas += total;
  /* para la tabla de líderes (Carlos, 5 nov: victorias, derrotas, más dinero, más cartas) */
  /* jugando dos en un teléfono sí se pagan monedas, pero no cuenta para la tabla de líderes */
  if(cuenta){ C.stats.partidas++;
    if(comoAcabo === 'gana') C.stats.victorias++; else if(comoAcabo === 'empata') C.stats.empates++; else C.stats.derrotas++; }
  guardar();
  return { total, bono };
}

/* ── LOS SOBRES ─────────────────────────────────────────────────────────────
   Cada sobre trae puercos y una carta extra que es soporte o cosmético. El
   caro no da MÁS cartas: da cartas de mejor nivel (lo decidió la versión 1 y
   sigue siendo lo correcto: con medio álbum, lo que quieres es calidad). */
export const SOBRES = {
  /* 5 cartas por sobre (Carlos, 6 nov): 4 puercos y 1 sorpresa */
  bienvenida: { nombre:'Sobre de bienvenida', precio: 0,   puercos: 4, niveles: null,              extra: 1, extraMin: 'D', color:'#E84A8A', regalo:true },
  chico:      { nombre:'Sobre del puerco',    precio: 30,  puercos: 4, niveles: null,              extra: 1, extraMin: 'D', color:'#E84A8A' },
  bueno:      { nombre:'Sobre bueno',         precio: 75,  puercos: 4, niveles: ['S','A','B','C'], extra: 1, extraMin: 'C', color:'#2C6FA8' },
  fino:       { nombre:'Sobre fino',          precio: 150, puercos: 4, niveles: ['S','A','B'],     extra: 1, extraMin: 'B', color:'#C9A227', minimoA: 2 },
  /* EL SOBRE DE LÍDERES (Carlos, 6 nov: «un sobre carísimo que solo contiene puercos líderes»): uno por
     sobre, uno que todavía no tengas; si ya los tienes todos, te regresa la mitad en monedas */
  lideres:    { nombre:'Sobre de Líderes',    precio: 1500, puercos: 0, niveles: null,             extra: 0, lideres: 1, color:'#E8B923' },
};
export const EN_TIENDA = ['chico', 'bueno', 'fino', 'lideres'];

/* Qué tan seguido sale cada rareza en un sobre sin filtro. La baraja trae más
   C y A que S, pero el sobre no reparte por cuántas hay: reparte por qué tan
   especial se siente. Una S es un evento. */
const PESO = { S: 3, A: 12, B: 20, C: 30, D: 35 };

function sortearRareza(permitidas, dado){
  const lista = permitidas || ORDEN_RAREZA;
  const total = lista.reduce((s, n) => s + PESO[n], 0);
  let r = dado() * total;
  for(const n of lista){ r -= PESO[n]; if(r <= 0) return n; }
  return lista[lista.length - 1];
}

/* Un sobre ya comprado se GUARDA con su contenido sorteado. Así «abrir
   después» no es una ruleta distinta a «abrir ahora», y cerrar la página a
   media animación no te deja con un sobre perdido: el sobre sigue en la
   lista hasta que se termina de abrir. */
export function sortearSobre(tipo, dado = Math.random){
  const s = SOBRES[tipo]; if(!s || !CAT.listo) return null;
  const salen = [];
  /* Al menos un puerco NUEVO mientras te falte alguno de ese sobre (versión 1:
     sin esto, al final del álbum casi todo sale repetido y da flojera). */
  const bolsa = s.niveles ? CAT.puercos.filter(f => s.niveles.includes(f.nivel)) : CAT.puercos;
  const faltan = bolsa.filter(f => !C.cartas[llaveDe(f)]);
  /* MÁS PAREJO (Carlos, 6 nov: «que no se repitan tanto las cartas»): dentro de cada rareza, una carta que ya
     tienes muchas veces (o que ya salió en este mismo sobre) pesa mucho menos que una que tienes poco */
  const enEste = {};
  const escoger = (de) => { const w = de.map(f => { const k = llaveDe(f), n = (C.cartas[k] | 0) + (enEste[k] | 0) * 3; return 1 / Math.pow(1 + n, 2); });
    let r = dado() * w.reduce((a, b) => a + b, 0); for(let i = 0; i < de.length; i++){ r -= w[i]; if(r <= 0) return de[i]; } return de[de.length - 1]; };
  for(let i = 0; i < s.puercos; i++){
    let f;
    if(i === 0 && faltan.length){
      const niv = sortearRareza([...new Set(faltan.map(x => x.nivel))].filter(n => !s.niveles || s.niveles.includes(n)), dado);
      f = escoger(faltan.filter(x => x.nivel === niv));
    } else {
      const niv = s.minimoA && i < s.minimoA + 1 ? sortearRareza(['S', 'A'], dado) : sortearRareza(s.niveles, dado);
      f = escoger((CAT.porNivel[niv] || bolsa).filter(x => !s.niveles || s.niveles.includes(x.nivel)));
    }
    enEste[llaveDe(f)] = (enEste[llaveDe(f)] | 0) + 1;
    salen.push({ tipo: 'puerco', llave: llaveDe(f), nivel: f.nivel });
  }
  for(let i = 0; i < (s.lideres | 0); i++){
    const sin = LIDERES.filter(l => !C.lideres?.[l.id]), de = sin.length ? sin : LIDERES, l = de[Math.floor(dado() * de.length)];
    salen.push({ tipo: 'lider', id: l.id, nivel: 'S' });
  }
  for(let i = 0; i < s.extra; i++){
    if(dado() < .5){
      const esp = dado() < .5 ? 'bono' : 'castigo';
      salen.push({ tipo: 'soporte', esp, nivel: 'ESP' });
    } else {
      const min = ORDEN_RAREZA.indexOf(s.extraMin);
      const permitidas = ORDEN_RAREZA.filter((n, k) => k <= min);
      const niv = sortearRareza(permitidas, dado);
      const de = COSMETICOS.filter(c => c.rareza === niv);
      const c = (de.length ? de : COSMETICOS)[Math.floor(dado() * (de.length || COSMETICOS.length))];
      salen.push({ tipo: 'cosmetico', id: c.id, nivel: c.rareza, clase: c.clase });
    }
  }
  /* El orden de revelado: lo mejor al final, como en todo sobre que se
     respeta. La carta que se abre primero es la de hasta abajo, así que se
     guarda al revés. */
  const peso = (x) => x.tipo === 'lider' ? 20 : x.tipo === 'puerco' ? 10 - ORDEN_RAREZA.indexOf(x.nivel) : x.tipo === 'cosmetico' ? 5 - ORDEN_RAREZA.indexOf(x.nivel) * .5 : 3;
  salen.sort((x, y) => peso(x) - peso(y));
  return { tipo, id: 's' + Date.now().toString(36) + Math.floor(dado() * 1e6).toString(36), salen };
}

export function comprar(tipo){
  const s = SOBRES[tipo]; if(!s) return { mal: 'Ese sobre no existe.' };
  if(C.monedas < s.precio) return { mal: 'Te faltan ' + (s.precio - C.monedas) + ' monedas.' };
  const sobre = sortearSobre(tipo); if(!sobre) return { mal: 'La baraja no cargó. Revisa tu internet.' };
  C.monedas -= s.precio;
  C.sobres.push(sobre);
  guardar();
  return { sobre };
}

/* Abrir de verdad: lo que cae se mete a la colección. Devuelve, carta por
   carta, si fue nueva o repetida y cuántas monedas devolvió. Se llama UNA vez
   por sobre, al terminar de abrirlo, para que cerrar a medias no cobre dos. */
export function cobrarSobre(id){
  const k = C.sobres.findIndex(s => s.id === id); if(k < 0) return null;
  const sobre = C.sobres[k];
  const res = sobre.salen.map(x => {
    if(x.tipo === 'lider'){
      const nueva = !C.lideres[x.id]; C.lideres[x.id] = 1;
      if(!C.lider) C.lider = x.id;
      const vuelven = nueva ? 0 : Math.round(SOBRES.lideres.precio / 2);
      C.monedas += vuelven;
      return { ...x, nueva, vuelven };
    }
    if(x.tipo === 'puerco'){
      const nueva = !C.cartas[x.llave];
      C.cartas[x.llave] = (C.cartas[x.llave] | 0) + 1;
      const vuelven = nueva ? 0 : DEVUELVE[x.nivel] || 3;
      C.monedas += vuelven;
      return { ...x, nueva, vuelven };
    }
    if(x.tipo === 'soporte'){
      const ya = C.soporte[x.esp] | 0, nueva = ya < TOPE_SOPORTE;
      if(nueva) C.soporte[x.esp] = ya + 1;
      const vuelven = nueva ? 0 : 6;
      C.monedas += vuelven;
      return { ...x, nueva, vuelven };
    }
    const nueva = !C.cosmeticos[x.id];
    C.cosmeticos[x.id] = (C.cosmeticos[x.id] | 0) + 1;
    const vuelven = nueva ? 0 : DEVUELVE[x.nivel] || 3;
    C.monedas += vuelven;
    return { ...x, nueva, vuelven };
  });
  C.sobres.splice(k, 1);
  guardar();
  return res;
}

/* ── EL REGALO DE ARRANQUE ──────────────────────────────────────────────────
   Ocho puercos (los más baratos, igual que la versión 1, para que la tienda
   tenga sentido), dos +5, dos −5, 40 monedas… y UN SOBRE DE BIENVENIDA SIN
   ABRIR. Lo primero que hace alguien nuevo es abrir un sobre: así aprende el
   gesto antes de necesitarlo, y entiende para qué sirven las monedas. */
export function regalarArranque(){
  if(!CAT.listo) return false;
  /* el sobre de bienvenida, a TODOS una vez, también a quien venía de la v1 */
  if(!C.bienvenida){ C.bienvenida = true; C.sobres.unshift(sortearSobre('bienvenida')); guardar(); }
  /* 30 CARTAS PARA EMPEZAR (Carlos, 6 nov: «regálales 25 o 30 cartas para que puedan iniciar el juego y poco
     más»): las 20 D distintas y 10 C de las más bajas. A quien ya jugaba con menos de 30, se le completa */
  if(!C.regalo30){
    const total = Object.values(C.cartas).reduce((a, b) => a + (b | 0), 0);
    if(total < 30){
      const orden = [...(CAT.porNivel.D || []), ...(CAT.porNivel.C || []).slice().sort((x, y) => x.puntos - y.puntos)];
      let falta = 30 - total;
      for(const f of orden){ if(falta <= 0) break; if(!C.cartas[llaveDe(f)]){ C.cartas[llaveDe(f)] = 1; falta--; } }
      for(const f of orden){ if(falta <= 0) break; C.cartas[llaveDe(f)]++; falta--; }
    }
    C.regalo30 = true; guardar();
  }
  if(C.regalo) return false;
  C.soporte.bono = Math.max(C.soporte.bono, 2);
  C.soporte.castigo = Math.max(C.soporte.castigo, 2);
  C.monedas += 40;
  C.regalo = true;
  guardar();
  return true;
}

/* ── TU MAZO, ARMADO A MANO ─────────────────────────────────────────────────
   Carlos, 6 nov: «tú a mano puedes armar tu deck de cartas, que sea de 64… para que no lo llenen de únicamente
   cartas legendarias». Los topes salen de la baraja de la autora (100 cartas: 5 S, 27 A, 21 B, 27 C y 20 D) a
   la escala de 64, y sólo para lo fuerte: de C y D se pone lo que quieras. Nunca más copias de las que tienes,
   ni más de 3 de la misma. El soporte va aparte (hasta 5 y 5, regla 8). */
export const TAM_MAZO = 64, MAX_COPIAS = 3, TOPES = { S: 3, A: 17, B: 14 };
const fichaPorLlave = (k) => CAT.puercos.find(f => llaveDe(f) === k);
/* el mazo de una lista de llaves, recortado a lo que se vale */
export function limpiarMazo(lista){
  const usadas = {}, porNivel = {}, fuera = [];
  for(const k of lista || []){ const f = fichaPorLlave(k); if(!f) continue;
    if((usadas[k] | 0) >= Math.min(MAX_COPIAS, C.cartas[k] | 0)) continue;
    if(TOPES[f.nivel] !== undefined && (porNivel[f.nivel] | 0) >= TOPES[f.nivel]) continue;
    if(fuera.length >= TAM_MAZO) break;
    usadas[k] = (usadas[k] | 0) + 1; porNivel[f.nivel] = (porNivel[f.nivel] | 0) + 1; fuera.push(k); }
  return fuera;
}
/* el mejor mazo que se vale con lo que tienes (si no armaste uno): de mayor a menor */
export function mazoAuto(){
  const todas = [];
  for(const f of CAT.puercos){ const k = llaveDe(f), n = Math.min(MAX_COPIAS, C.cartas[k] | 0); for(let i = 0; i < n; i++) todas.push(f); }
  todas.sort((x, y) => y.puntos - x.puntos);
  return limpiarMazo(todas.map(llaveDe));
}
/* lo que acabas de sacar de un sobre entra a TU mazo armado si cabe y se vale (si no armaste uno, el automático
   ya lo toma solo). Devuelve cuántas entraron. */
export function meterAlMazo(llaves){
  if(!C.mazoPropio) return llaves.length;
  const antes = limpiarMazo(C.mazo).length;
  C.mazo = limpiarMazo([...(C.mazo || []), ...llaves]); guardar(false);
  return C.mazo.length - antes;
}
export const mazoActual = () => { const m = C.mazoPropio ? limpiarMazo(C.mazo) : []; return m.length ? m : mazoAuto(); };
/* en el idioma del motor: { valor, nivel } por carta */
export const mazoParaMotor = () => mazoActual().map(k => { const f = fichaPorLlave(k); return { valor: f.puntos, nivel: f.nivel }; });

/* ── LO QUE TIENES, EN EL IDIOMA DEL MOTOR ─────────────────────────────────
   Tu colección → `{ valor, nivel }` para `MOTOR.mazoDeColeccion`. */
export function misCartas(){
  const fuera = [];
  for(const f of CAT.puercos) if(C.cartas[llaveDe(f)]) fuera.push({ valor: f.puntos, nivel: f.nivel });
  return fuera;
}
export const totalPuercos = () => CAT.puercos.length;
export const tengoPuercos = () => CAT.puercos.filter(f => C.cartas[llaveDe(f)]).length;
export { cosmetico };
