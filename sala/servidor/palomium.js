/* ══════════════════════════════════════════════════════════════════════════
   PALOMIUM · la moneda de CARYMO, la tienda y el cuidado de la mascota
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 13 nov: «un sistema de economía… conforme vas haciendo tareas, subiendo de nivel… te va dando
   cubitos de palomium, que van a ser la moneda de nuestra app. Pero súper poquitos, que sea muy
   complicado obtener muchos, para que cuando metamos el sistema de pago la gente pague por ellos».
   Y: «un espacio donde tener a tu compañero… salitas, comidita, cosas para bañarlo, tipo Pou… y si no te
   conectas o no estudias, se va deteriorando y se va sintiendo mal».

   Todo se decide AQUÍ, no en el teléfono: el teléfono dice «terminé una lección» (con un id) y el
   servidor decide cuántos cubitos valen, con tope por día. Un teléfono que reintenta no cobra dos veces
   (los ids se guardan con los del XP).

   En el perfil (est:perfil:<cuenta>) se agregan:
     cubos            el saldo
     cubosDia         { dia, por: { motivo: cubos } }   para los topes por día
     premiados        ids de premios únicos (una sesión con amigo, un nivel ya cobrado)
     inv              { item: cuántos }                 lo que tienes guardado
     cuarto           { puestos: [item…] }              los muebles que están en el cuarto
     cuidado          { hambre, limpieza, animo, t }    0 a 100; bajan solos con el tiempo
     voces            { personaje: 0|1|2 }               la voz que elegiste para cada mascota
     mascota          el personaje que elegiste

   Sin `cloudflare:workers`: las pruebas cargan esto en Node.
   ═════════════════════════════════════════════════════════════════════════ */

/* cuánto vale cada cosa (pocos, a propósito) y cuánto se puede ganar por día de cada una */
export const PREMIOS = {
  leccion: { cubos: 1, tope: 4, que: 'Terminaste una lección' },
  grado: { cubos: 3, tope: 6, que: 'Subiste de grado en un plan' },
  plan: { cubos: 10, tope: 10, que: 'Terminaste un plan completo' },
  racha: { cubos: 1, tope: 1, que: 'Racha de hoy' },
  semana: { cubos: 3, tope: 3, que: 'Siete días seguidos' },
  nivel: { cubos: 5, tope: 15, que: 'Subiste de nivel' },
  juntos: { cubos: 2, tope: 4, que: 'Estudiaste con un amigo' },
};
export const REGALO_INICIAL = 5;

/* el nivel de la cuenta sale del XP total: cada nivel cuesta un poco más que el anterior */
export const nivelDe = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1;

/* ── la tienda ──
   tipo: racha (se gasta solo), comida y aseo (se gastan al usarlos), juguete y mueble (se quedan) */
export const TIENDA = {
  congelador: { nombre: 'Congelador de racha', tipo: 'racha', precio: 20, que: 'Si un día no entras, tu racha no se pierde.' },
  manzana: { nombre: 'Manzana', tipo: 'comida', precio: 2, llena: 20 },
  galleta: { nombre: 'Galleta', tipo: 'comida', precio: 3, llena: 28, animo: 4 },
  sandwich: { nombre: 'Sándwich', tipo: 'comida', precio: 4, llena: 40 },
  sopa: { nombre: 'Sopita', tipo: 'comida', precio: 5, llena: 55 },
  pastel: { nombre: 'Pastel', tipo: 'comida', precio: 8, llena: 60, animo: 15 },
  jabon: { nombre: 'Jabón de burbujas', tipo: 'aseo', precio: 4, limpia: 100, usos: 3 },
  pelota: { nombre: 'Pelota', tipo: 'juguete', precio: 12, animo: 20 },
  tapete: { nombre: 'Tapete', tipo: 'mueble', precio: 15 },
  planta: { nombre: 'Planta', tipo: 'mueble', precio: 18 },
  lampara: { nombre: 'Lámpara', tipo: 'mueble', precio: 25 },
  cuadro: { nombre: 'Cuadro', tipo: 'mueble', precio: 30 },
  cama: { nombre: 'Camita', tipo: 'mueble', precio: 40 },
  librero: { nombre: 'Librero', tipo: 'mueble', precio: 50 },
  sillon: { nombre: 'Salita', tipo: 'mueble', precio: 60 },
};
export const MAX_CONGELADAS = 3;

/* ── el cuidado: cuánto baja cada cosa por hora sin atenderla ──
   hambre de 100 a 0 en ~40 h, limpieza en ~60 h, ánimo en ~30 h; estudiar sube el ánimo */
const BAJA_HORA = { hambre: 100 / 40, limpieza: 100 / 60, animo: 100 / 30 };
const lim = (v) => Math.max(0, Math.min(100, Math.round(v)));
export function cuidadoAhora(c, ahora){
  const base = c && Number.isFinite(c.t) ? c : { hambre: 80, limpieza: 90, animo: 80, t: ahora };
  const horas = Math.max(0, (ahora - base.t) / 36e5);
  const r = { t: ahora };
  for(const k of ['hambre', 'limpieza', 'animo']) r[k] = lim((Number.isFinite(base[k]) ? base[k] : 80) - BAJA_HORA[k] * horas);
  /* con hambre o sucia, se desanima más rápido */
  if(r.hambre < 25 || r.limpieza < 25) r.animo = lim(r.animo - 10);
  return r;
}
/* cómo se siente, en una palabra que la página traduce a cara y frase */
export function animoDe(c){
  const m = Math.min(c.hambre, c.limpieza, c.animo);
  return m >= 60 ? 'feliz' : m >= 35 ? 'normal' : m >= 15 ? 'mal' : 'muy-mal';
}

/* asegura que el perfil traiga lo de la economía (los perfiles viejos no lo tienen) */
export function conEconomia(p, ahora){
  if(!Number.isFinite(p.cubos)) p.cubos = REGALO_INICIAL;
  if(!p.cubosDia || typeof p.cubosDia !== 'object') p.cubosDia = { dia: '', por: {} };
  if(!Array.isArray(p.premiados)) p.premiados = [];
  if(!p.inv || typeof p.inv !== 'object') p.inv = {};
  if(!p.cuarto || typeof p.cuarto !== 'object' || !Array.isArray(p.cuarto.puestos)) p.cuarto = { puestos: [] };
  if(!p.voces || typeof p.voces !== 'object') p.voces = {};
  p.cuidado = cuidadoAhora(p.cuidado, ahora);
  if(!Number.isFinite(p.nivelCobrado)) p.nivelCobrado = nivelDe(p.xp || 0);
  return p;
}

/* da un premio respetando el tope del día; devuelve lo que se dio (0 si ya no cabía) */
export function premiar(p, motivo, dia, veces = 1){
  const P = PREMIOS[motivo]; if(!P) return 0;
  if(p.cubosDia.dia !== dia) p.cubosDia = { dia, por: {} };
  const ya = p.cubosDia.por[motivo] || 0;
  const dar = Math.max(0, Math.min(P.cubos * veces, P.tope - ya));
  if(!dar) return 0;
  p.cubosDia.por[motivo] = ya + dar;
  p.cubos += dar;
  return dar;
}
/* un premio que se cobra UNA vez por id (una sesión con un amigo) */
export function premiarUnaVez(p, motivo, id, dia){
  if(p.premiados.includes(id)) return 0;
  const dado = premiar(p, motivo, dia);
  if(dado){ p.premiados = [...p.premiados, id].slice(-300); }
  return dado;
}
/* el nivel: cada nivel nuevo paga una vez */
export function cobrarNivel(p, dia){
  const n = nivelDe(p.xp || 0); let dado = 0;
  while(p.nivelCobrado < n){ p.nivelCobrado += 1; dado += premiar(p, 'nivel', dia); }
  p.nivelCobrado = n;
  return dado;
}

/* ── comprar, dar de comer, bañar, jugar, poner un mueble ── */
export function comprar(p, item, cuantos = 1){
  const it = TIENDA[item];
  if(!it) return { error: 'Eso no está en la tienda.' };
  cuantos = Math.max(1, Math.min(10, Math.round(Number(cuantos) || 1)));
  if(it.tipo === 'mueble' || it.tipo === 'juguete'){ if(p.inv[item]) return { error: 'Ya lo tienes.' }; cuantos = 1; }
  if(it.tipo === 'racha' && (p.congeladas || 0) + cuantos > MAX_CONGELADAS) return { error: `Puedes guardar hasta ${MAX_CONGELADAS} congeladores.` };
  const total = it.precio * cuantos;
  if(p.cubos < total) return { error: `Te faltan ${total - p.cubos} cubitos.`, falta: total - p.cubos };
  p.cubos -= total;
  if(it.tipo === 'racha') p.congeladas = (p.congeladas || 0) + cuantos;
  else if(it.tipo === 'aseo') p.inv[item] = (p.inv[item] || 0) + cuantos * (it.usos || 1);
  else p.inv[item] = (p.inv[item] || 0) + cuantos;
  if(it.tipo === 'mueble' && !p.cuarto.puestos.includes(item)) p.cuarto.puestos.push(item);
  return { bien: true, gastado: total };
}
export function cuidar(p, que, item){
  const c = p.cuidado;
  if(que === 'comer'){
    const it = TIENDA[item];
    if(!it || it.tipo !== 'comida') return { error: 'Eso no se come.' };
    if(!p.inv[item]) return { error: 'No tienes. Cómpralo en la tienda.' };
    if(c.hambre >= 98) return { error: 'Ya está llenito.' };
    p.inv[item] -= 1; if(!p.inv[item]) delete p.inv[item];
    c.hambre = lim(c.hambre + it.llena); if(it.animo) c.animo = lim(c.animo + it.animo);
    return { bien: true };
  }
  if(que === 'banar'){
    if(!p.inv.jabon) return { error: 'Te falta jabón. Cómpralo en la tienda.' };
    if(c.limpieza >= 98) return { error: 'Ya está limpiecito.' };
    p.inv.jabon -= 1; if(!p.inv.jabon) delete p.inv.jabon;
    c.limpieza = 100; c.animo = lim(c.animo + 5);
    return { bien: true };
  }
  if(que === 'jugar'){
    /* jugar con la mano sube poquito; con pelota, más. Cansa: baja tantito el hambre */
    const sube = p.inv.pelota ? TIENDA.pelota.animo : 8;
    if(c.animo >= 98) return { error: 'Ya está muy contento.' };
    c.animo = lim(c.animo + sube); c.hambre = lim(c.hambre - 3);
    return { bien: true };
  }
  if(que === 'mueble'){
    if(!TIENDA[item] || TIENDA[item].tipo !== 'mueble' || !p.inv[item]) return { error: 'No tienes ese mueble.' };
    const i = p.cuarto.puestos.indexOf(item);
    if(i >= 0) p.cuarto.puestos.splice(i, 1); else p.cuarto.puestos.push(item);
    return { bien: true };
  }
  return { error: 'No sé hacer eso.' };
}
/* estudiar le sube el ánimo a la mascota (poquito por cada cosa, sin pasarse) */
export function estudioAnima(p, xp){ if(xp > 0) p.cuidado.animo = lim(p.cuidado.animo + Math.min(12, 2 + xp / 5)); }
