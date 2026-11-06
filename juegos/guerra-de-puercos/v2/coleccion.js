/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · LA COLECCIÓN Y LA CARTERA
   ───────────────────────────────────────────────────────────────────────────
   Carlos, 5 nov: «hay que mejorar el sistema de que recuerde las cartas que
   tienes». El de antes guardaba sólo en localStorage, y en un iPhone eso NO
   es para siempre: Safari borra lo guardado de una página que no se abre en
   siete días (está en la tabla de CLAUDE.md, lo pagó el banco de imágenes).
   El que se va de vacaciones una semana regresa sin colección.

   Cómo queda, en tres capas:
   1. localStorage, como antes, porque es lo único que se lee al instante.
   2. IndexedDB con la misma copia, y se pide `navigator.storage.persist()`:
      con eso el navegador se compromete a no borrar sin preguntar.
   3. Y la que sí salva al de las vacaciones: un CÓDIGO DE RESPALDO de 8
      letras. No lleva nombre, correo ni teléfono — es un número al azar que
      sólo sirve para recuperar cartas, así que no es un dato de nadie.
      (`respaldo.js` lo sube al servidor de salas; aquí sólo se arma.)

   Y SE MIGRA lo del juego de antes: quien ya tenía cartas en la versión 1
   (`puercos_tengo`, `puercos_monedas`) las encuentra aquí sin hacer nada.

   ⚠ CADA COPIA LLEVA SU NÚMERO DE CAMBIO (`rev`). Al arrancar gana la copia
   con el número más alto, no la que se leyó primero: si IndexedDB sobrevivió
   y localStorage no, se recupera la buena; si las dos existen y una se quedó
   atrás (se cerró la página a media escritura), no pisa a la nueva.
   ═══════════════════════════════════════════════════════════════════════════ */

const LLAVE = 'puercos2_coleccion';
const VERSION = 1;

/* Las cosas que caen de un sobre. Tres TIPOS, como los pidió Carlos:
   · puerco  — carta de juego, se divide por rareza (S, A, B, C, D)
   · soporte — carta de juego de soporte: el +5 (Alcancía) y el −5 (Carnitas)
   · cosmetico — no juega: cambia cómo se ve tu mesa. Se divide por clase. */
export const RAREZA = { S:'Legendaria', A:'Épica', B:'Rara', C:'Común', D:'Básica' };
export const ORDEN_RAREZA = ['S', 'A', 'B', 'C', 'D'];

/* ── LOS COSMÉTICOS · todo arte que ya existía, ninguno dibujado aquí ──────
   Avatares: Kenney «Animal Pack Redux» (CC0). Tapetes: telas de Poly Haven
   (CC0). Mascotas: Kenney «Cube Pets» (CC0), los cerditos 3D que corren.
   Dorsos: el reverso de la autora y el de Kenney «Playing Cards». */
export const CLASES_COSMETICO = {
  avatar:  { nombre:'Avatares', una:'Avatar' },
  tapete:  { nombre:'Tapetes', una:'Tapete de mesa' },
  mascota: { nombre:'Mascotas', una:'Mascota' },
  dorso:   { nombre:'Dorsos', una:'Dorso de carta' },
};
export const COSMETICOS = [
  { id:'av-pig',     clase:'avatar',  nombre:'Puerquito',  img:'img/avatares/pig.png',     rareza:'D' },
  { id:'av-cow',     clase:'avatar',  nombre:'Vaca',       img:'img/avatares/cow.png',     rareza:'D' },
  { id:'av-chick',   clase:'avatar',  nombre:'Pollito',    img:'img/avatares/chick.png',   rareza:'D' },
  { id:'av-duck',    clase:'avatar',  nombre:'Pato',       img:'img/avatares/duck.png',    rareza:'D' },
  { id:'av-dog',     clase:'avatar',  nombre:'Perro',      img:'img/avatares/dog.png',     rareza:'C' },
  { id:'av-frog',    clase:'avatar',  nombre:'Rana',       img:'img/avatares/frog.png',    rareza:'C' },
  { id:'av-rabbit',  clase:'avatar',  nombre:'Conejo',     img:'img/avatares/rabbit.png',  rareza:'C' },
  { id:'av-owl',     clase:'avatar',  nombre:'Búho',       img:'img/avatares/owl.png',     rareza:'B' },
  { id:'av-penguin', clase:'avatar',  nombre:'Pingüino',   img:'img/avatares/penguin.png', rareza:'B' },
  { id:'av-monkey',  clase:'avatar',  nombre:'Chango',     img:'img/avatares/monkey.png',  rareza:'A' },
  { id:'av-panda',   clase:'avatar',  nombre:'Panda',      img:'img/avatares/panda.png',   rareza:'A' },
  { id:'av-bear',    clase:'avatar',  nombre:'Oso',        img:'img/avatares/bear.png',    rareza:'S' },
  { id:'tp-madera',  clase:'tapete',  nombre:'Mesa de madera',   img:'texturas/wood_table_001.webp',    rareza:'D' },
  { id:'tp-mezclilla', clase:'tapete', nombre:'Mezclilla',       img:'texturas/denim_fabric.webp',      rareza:'C' },
  { id:'tp-tela',    clase:'tapete',  nombre:'Tela de la abuela', img:'texturas/fabric_pattern_07.webp', rareza:'C' },
  { id:'tp-terciopelo', clase:'tapete', nombre:'Terciopelo',     img:'texturas/velour_velvet.webp',     rareza:'B' },
  { id:'tp-piel',    clase:'tapete',  nombre:'Piel roja',        img:'texturas/leather_red_02.webp',    rareza:'A' },
  { id:'tp-marmol',  clase:'tapete',  nombre:'Mármol',           img:'texturas/marble_01.webp',         rareza:'S' },
  { id:'tp-pinguinos', clase:'tapete', nombre:'Puros pingüinos', img:'texturas/pinguinos.webp',        rareza:'A' },
  /* 6 nov: cada apartado con 12, para que ninguno se vea disparejo (Carlos) */
  { id:'tp-pana',    clase:'tapete',  nombre:'Pana',             img:'texturas/ribbed_corduroy.webp',   rareza:'D' },
  { id:'tp-cuadritos', clase:'tapete', nombre:'Mantel de cuadritos', img:'texturas/gingham_check.webp', rareza:'D' },
  { id:'tp-peluche', clase:'tapete',  nombre:'Peluche a cuadros', img:'texturas/curly_teddy_checkered.webp', rareza:'C' },
  { id:'tp-jacquard', clase:'tapete', nombre:'Jacquard',         img:'texturas/quatrefoil_jacquard_fabric.webp', rareza:'B' },
  { id:'tp-flores',  clase:'tapete',  nombre:'Flores bordadas',  img:'texturas/floral_jacquard.webp',   rareza:'B' },
  { id:'ms-pig',     clase:'mascota', nombre:'Puerco',     modelo:'modelos/animal-pig.glb',   img:'img/mascotas/pig.png',   rareza:'D' },
  { id:'ms-hog',     clase:'mascota', nombre:'Jabalí',     modelo:'modelos/animal-hog.glb',   img:'img/mascotas/hog.png',   rareza:'A' },
  { id:'ms-cow',     clase:'mascota', nombre:'Vaca colada', modelo:'modelos/animal-cow.glb',  img:'img/mascotas/cow.png',   rareza:'B' },
  { id:'ms-chick',   clase:'mascota', nombre:'Pollito colado', modelo:'modelos/animal-chick.glb', img:'img/mascotas/chick.png', rareza:'C' },
  { id:'ms-penguin', clase:'mascota', nombre:'Pingüino',   modelo:'modelos/animal-penguin.glb', img:'img/mascotas/penguin.png', rareza:'B' },
  { id:'ms-dog',     clase:'mascota', nombre:'Perrito',    modelo:'modelos/animal-dog.glb',   img:'img/mascotas/dog.png',   rareza:'D' },
  { id:'ms-cat',     clase:'mascota', nombre:'Gatito',     modelo:'modelos/animal-cat.glb',   img:'img/mascotas/cat.png',   rareza:'D' },
  { id:'ms-bunny',   clase:'mascota', nombre:'Conejito',   modelo:'modelos/animal-bunny.glb', img:'img/mascotas/bunny.png', rareza:'C' },
  { id:'ms-fox',     clase:'mascota', nombre:'Zorro',      modelo:'modelos/animal-fox.glb',   img:'img/mascotas/fox.png',   rareza:'C' },
  { id:'ms-panda',   clase:'mascota', nombre:'Panda',      modelo:'modelos/animal-panda.glb', img:'img/mascotas/panda.png', rareza:'B' },
  { id:'ms-lion',    clase:'mascota', nombre:'León',       modelo:'modelos/animal-lion.glb',  img:'img/mascotas/lion.png',  rareza:'A' },
  { id:'ms-tiger',   clase:'mascota', nombre:'Tigre',      modelo:'modelos/animal-tiger.glb', img:'img/mascotas/tiger.png', rareza:'S' },
  { id:'ds-autora',  clase:'dorso',   nombre:'Guerra de Puercos', img:'../arte/web/reverso.webp', rareza:'D' },
  { id:'ds-kenney',  clase:'dorso',   nombre:'Baraja clásica',    img:'img/dorsos/kenney.png',             rareza:'B' },
  { id:'ds-madera',  clase:'dorso',   nombre:'Madera',            img:'img/dorsos/madera.webp',            rareza:'D' },
  { id:'ds-mezclilla', clase:'dorso', nombre:'Mezclilla',         img:'img/dorsos/mezclilla.webp',         rareza:'D' },
  { id:'ds-espiga',  clase:'dorso',   nombre:'Espiga',            img:'img/dorsos/herringbone.webp',       rareza:'C' },
  { id:'ds-pano',    clase:'dorso',   nombre:'Paño naranja',      img:'img/dorsos/caban.webp',             rareza:'C' },
  { id:'ds-piel-blanca', clase:'dorso', nombre:'Piel blanca',     img:'img/dorsos/leather_white.webp',     rareza:'C' },
  { id:'ds-satin',   clase:'dorso',   nombre:'Satín',             img:'img/dorsos/crepe_satin.webp',       rareza:'B' },
  { id:'ds-piel-roja', clase:'dorso', nombre:'Piel roja',         img:'img/dorsos/piel_roja.webp',         rareza:'B' },
  { id:'ds-terciopelo', clase:'dorso', nombre:'Terciopelo',       img:'img/dorsos/terciopelo.webp',        rareza:'A' },
  { id:'ds-peluche', clase:'dorso',   nombre:'Peluche geométrico', img:'img/dorsos/faux_fur.webp',         rareza:'A' },
  { id:'ds-marmol',  clase:'dorso',   nombre:'Mármol',            img:'img/dorsos/marmol.webp',            rareza:'S' },
];
export const cosmetico = (id) => COSMETICOS.find(c => c.id === id) || null;

/* Lo que se trae puesto de fábrica: lo más sencillo de cada clase. */
const PUESTO_DE_FABRICA = { avatar:'av-pig', tapete:'tp-madera', mascota:'ms-pig', dorso:'ds-autora' };

function vacia(){
  return { v: VERSION, rev: 0, monedas: 0, cartas: {}, soporte: { bono: 0, castigo: 0 },
           cosmeticos: {}, puesto: { ...PUESTO_DE_FABRICA }, sobres: [], regalo: false,
           /* el sobre de bienvenida va APARTE del regalo de cartas: quien venía
              de la versión 1 ya traía cartas y por eso nunca recibía su sobre
              (Carlos, 5 nov: «no está saliendo el sobre de regalo») */
           bienvenida: false,
           stats: { victorias: 0, derrotas: 0, empates: 0, partidas: 0 },
           /* los puercos líderes que tienes y el que traes puesto (Carlos, 6 nov), y TU mazo armado a mano:
              una lista de llaves `nombre·puntos` (se repite la llave si metes dos copias). Vacío = se arma solo */
           lideres: {}, lider: '', mazo: [], regalo30: false,
           victoriaDia: '', codigo: '', creada: Date.now() };
}

/* ── LEER: de las dos copias, la más nueva ─────────────────────────────── */
function leerLocal(){
  try{ const t = localStorage.getItem(LLAVE); return t ? JSON.parse(t) : null; }catch(e){ return null; }
}
function abrirBase(){
  return new Promise((ok) => {
    try{
      const r = indexedDB.open('puercos2', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    }catch(e){ ok(null); }
  });
}
async function leerBase(){
  const db = await abrirBase(); if(!db) return null;
  return new Promise((ok) => {
    try{
      const q = db.transaction('kv').objectStore('kv').get(LLAVE);
      q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null);
    }catch(e){ ok(null); }
  });
}
async function escribirBase(dato){
  const db = await abrirBase(); if(!db) return;
  try{ db.transaction('kv', 'readwrite').objectStore('kv').put(dato, LLAVE); }catch(e){}
}

/* La versión 1 del juego guardaba `nombre·puntos` → 1. */
function migrarDeLaUno(c){
  try{
    const tengo = JSON.parse(localStorage.getItem('puercos_tengo') || 'null');
    const monedas = parseInt(localStorage.getItem('puercos_monedas'), 10);
    if(!tengo || !Object.keys(tengo).length) return false;
    for(const k of Object.keys(tengo)) c.cartas[k] = Math.max(1, c.cartas[k] || 0);
    if(Number.isFinite(monedas)) c.monedas = Math.max(c.monedas, monedas);
    /* ya trae cartas: no se le regalan las 8 baratas, pero sí el soporte de
       arranque (la v1 no lo guardaba) y, aparte, su sobre de bienvenida */
    c.soporte.bono = Math.max(c.soporte.bono, 2); c.soporte.castigo = Math.max(c.soporte.castigo, 2);
    c.regalo = true;
    return true;
  }catch(e){ return false; }
}

/* Lo que llegue roto o viejo se arregla aquí, y nada más se lee después de
   pasar por esto: así ninguna pantalla tiene que preguntar «¿y si no viene?». */
function sana(c){
  const b = vacia();
  if(!c || typeof c !== 'object') return b;
  const n = { ...b, ...c };
  n.cartas = (c.cartas && typeof c.cartas === 'object') ? c.cartas : {};
  n.soporte = { bono: Math.max(0, c.soporte?.bono | 0), castigo: Math.max(0, c.soporte?.castigo | 0) };
  n.cosmeticos = (c.cosmeticos && typeof c.cosmeticos === 'object') ? c.cosmeticos : {};
  n.puesto = { ...PUESTO_DE_FABRICA, ...(c.puesto || {}) };
  for(const [clase, id] of Object.entries(n.puesto)){
    /* Lo de fábrica siempre se tiene; lo demás, sólo si de verdad cayó. */
    if(id !== PUESTO_DE_FABRICA[clase] && !n.cosmeticos[id]) n.puesto[clase] = PUESTO_DE_FABRICA[clase];
  }
  n.sobres = Array.isArray(c.sobres) ? c.sobres.filter(s => s && typeof s.tipo === 'string') : [];
  n.monedas = Math.max(0, Math.floor(Number(c.monedas) || 0));
  n.rev = Math.max(0, c.rev | 0);
  const st = c.stats || {}, ent = (x) => Math.max(0, Math.floor(Number(x) || 0));
  n.stats = { victorias: ent(st.victorias), derrotas: ent(st.derrotas), empates: ent(st.empates), partidas: ent(st.partidas) };
  n.bienvenida = !!c.bienvenida;
  n.lideres = (c.lideres && typeof c.lideres === 'object') ? c.lideres : {};
  n.lider = typeof c.lider === 'string' && n.lideres[c.lider] ? c.lider : '';
  n.mazo = Array.isArray(c.mazo) ? c.mazo.filter(x => typeof x === 'string').slice(0, 64) : [];
  n.mazoPropio = !!c.mazoPropio;      /* false = se arma solo con lo mejor que tienes */
  n.regalo30 = !!c.regalo30;
  return n;
}

export const C = vacia();
let alCambiar = [];
export const escuchar = (fn) => { alCambiar.push(fn); return () => { alCambiar = alCambiar.filter(f => f !== fn); }; };

export async function cargar(){
  const local = leerLocal(), base = await leerBase();
  let mejor = [local, base].filter(Boolean).sort((x, y) => (y.rev | 0) - (x.rev | 0))[0] || null;
  const c = sana(mejor);
  if(!mejor) migrarDeLaUno(c);
  Object.assign(C, c);
  try{ navigator.storage?.persist?.(); }catch(e){}
  guardar(false);
  return C;
}

export function guardar(avisa = true){
  C.rev++;
  const copia = JSON.parse(JSON.stringify(C));
  try{ localStorage.setItem(LLAVE, JSON.stringify(copia)); }catch(e){}
  escribirBase(copia);
  if(avisa) for(const f of alCambiar){ try{ f(C); }catch(e){} }
  for(const f of alGuardar){ try{ f(copia); }catch(e){} }
}
/* lo que se entera de CADA guardado, aunque no se pinte nada: la cuenta en el servidor */
const alGuardar = [];
export const cadaGuardado = (fn) => { alGuardar.push(fn); };

/* La copia del servidor gana entera (al entrar a tu cuenta en otro teléfono). */
export function ponerCopia(dato){
  const n = sana(dato);
  n.rev = Math.max(n.rev, C.rev);
  for(const k of Object.keys(C)) delete C[k];
  Object.assign(C, n);
  try{ localStorage.setItem(LLAVE, JSON.stringify(C)); }catch(e){}
  escribirBase(JSON.parse(JSON.stringify(C)));
  for(const f of alCambiar){ try{ f(C); }catch(e){} }
}
/* Para el código de respaldo: lo que se sube y lo que se recupera. */
export const exportar = () => JSON.parse(JSON.stringify(C));
export function importar(dato){
  const n = sana(dato);
  n.rev = Math.max(n.rev, C.rev) + 1;
  Object.assign(C, n);
  guardar();
}

/* ── LAS CARTAS, EN EL IDIOMA DEL MOTOR ──────────────────────────────────
   La llave de una carta es `nombre·puntos`, igual que en la versión 1 (y por
   eso la migración es copiar). Los dos «Troll» valen distinto: son dos llaves. */
export const llaveDe = (f) => f.nombre + '·' + f.puntos;
export const cuantas = (f) => C.cartas[llaveDe(f)] | 0;
export const tengo = (f) => cuantas(f) > 0;
