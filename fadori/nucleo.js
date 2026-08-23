/* ============================================================================
   FADORI · NÚCLEO — Proyecto Sin Filas · Grupo Mazi
   ----------------------------------------------------------------------------
   Todo lo que no se ve: los datos, la fila y el medidor. Las cuatro pantallas
   (alumno, mostrador, pantalla pública y medidor) hablan SÓLO con este archivo.

   Por qué está partido así — regla §2 de la casa, "conectar sí, depender no":
   el motor de datos es un adaptador nuestro con dos implementaciones. Hoy corre
   el motor LOCAL, que no necesita cuenta de nadie y funciona sin internet. El
   día que la escuela autorice el servidor, se cambia el motor y NINGUNA
   pantalla se entera. El externo queda abajo y reemplazable.

   Regla 4 del catálogo: el turno se calcula en UN SOLO LUGAR. Ese lugar es
   colaOrdenada(), aquí abajo. Nadie más ordena la fila.
   ==========================================================================*/
(function (global) {
'use strict';

/* ══════════════════════════════════════════════════════════════════════════
   0 · LAS PERILLAS
   Lo que la cooperativa puede cambiar sin tocar código. Vive en los datos,
   no aquí: esto nada más son los valores de arranque.
   ═════════════════════════════════════════════════════════════════════════ */
const CONFIG_BASE = {
  recreoInicia: '10:30',      /* hora de la chicharra */
  recreoMinutos: 30,
  topeporAlumno: 3,           /* F16 · cuántos pedidos por recreo */
  topeAdelantos: 4,           /* F10 · nadie se atrasa más de N turnos */
  limiteDeuda: 8000,          /* F28 · en centavos. Arranca en un plato fuerte */
  despachadores: 1,           /* F23 */
  aceptaAnticipados: true,    /* F13 */
  nombreLugar: 'Cooperativa',
};

/* Las categorías mandan el orden del menú y los colores de las fichas.
   El tono NO sale de una paleta bonita: sale del alimento. Guisado, masa
   dorada, pan tostado, fruta. Y las BEBIDAS son el único acento frío de toda
   la app, a propósito: eso las hace ver frescas —que es justo lo que se vende
   de una bebida— y rompe la monotonía cálida antes de que empalague. */
const CATEGORIAS = [
  { id:'fuerte',  nombre:'Plato fuerte', emoji:'🍲', tono:'#C2410C' },  /* guisado, caldo */
  { id:'antojo',  nombre:'Antojitos',    emoji:'🌮', tono:'#D98324' },  /* masa dorada */
  { id:'torta',   nombre:'Tortas y sándwiches', emoji:'🥪', tono:'#A8763E' },  /* pan tostado */
  { id:'dulce',   nombre:'Dulces y postres', emoji:'🍩', tono:'#B34A6B' },  /* fruta */
  { id:'bebida',  nombre:'Bebidas',      emoji:'🥤', tono:'#3E7C8C' },  /* el único frío */
  { id:'botana',  nombre:'Botanas',      emoji:'🥨', tono:'#8A6212' },  /* fritura, sal */
];

/* El menú de arranque. La cooperativa lo cambia entero desde su pantalla:
   esto es para que la app sirva desde el primer minuto, no una lista fija.
   Los segundos de preparación son la SEMILLA del estimado; en cuanto haya
   despachos reales, F40 los reemplaza con lo medido. */
const MENU_BASE = [
  { nombre:'Guisado del día con arroz', cat:'fuerte', precio:4500, seg:95,
    desc:'El guisado que toque hoy, con arroz y su tortilla.', al:['picante'] },
  { nombre:'Pozole', cat:'fuerte', precio:5000, seg:80,
    desc:'Caldo de maíz cacahuazintle con su lechuga, rábano y limón.', al:['picante'] },
  { nombre:'Chilaquiles', cat:'fuerte', precio:4000, seg:75,
    desc:'Totopos bañados en salsa, con crema y queso.', al:['lacteos','picante'] },
  { nombre:'Torta de jamón', cat:'torta', precio:3000, seg:45,
    desc:'Telera con jamón, queso, aguacate y jitomate.', al:['gluten','lacteos'] },
  { nombre:'Torta de milanesa', cat:'torta', precio:3800, seg:60,
    desc:'Milanesa empanizada en telera, con todo.', al:['gluten','huevo','lacteos'] },
  { nombre:'Sándwich', cat:'torta', precio:2500, seg:25,
    desc:'Pan de caja con jamón y queso.', al:['gluten','lacteos'] },
  { nombre:'Quesadilla', cat:'antojo', precio:2000, seg:50,
    desc:'Tortilla de maíz con queso, a la plancha.', al:['lacteos'] },
  { nombre:'Tacos dorados', cat:'antojo', precio:2500, seg:55,
    desc:'Tres tacos dorados con lechuga, crema y queso.', al:['lacteos'] },
  { nombre:'Tamal', cat:'antojo', precio:2000, seg:20,
    desc:'De masa, al vapor.', al:[] },
  { nombre:'Agua del día', cat:'bebida', precio:1200, seg:12,
    desc:'El sabor que toque hoy.', al:[] },
  { nombre:'Refresco', cat:'bebida', precio:1800, seg:8, desc:'De lata.', al:[] },
  { nombre:'Jugo', cat:'bebida', precio:1500, seg:8, desc:'De caja.', al:[] },
  { nombre:'Gelatina', cat:'dulce', precio:1200, seg:10, desc:'Con leche.', al:['lacteos'] },
  { nombre:'Galletas', cat:'dulce', precio:1000, seg:6, desc:'Paquete chico.',
    al:['gluten','lacteos','huevo'] },
  { nombre:'Pastelito', cat:'dulce', precio:1500, seg:6, desc:'Empaquetado.',
    al:['gluten','lacteos','huevo','soya'] },
  { nombre:'Papas', cat:'botana', precio:1500, seg:6, desc:'Bolsa chica.', al:[] },
  { nombre:'Cacahuates', cat:'botana', precio:1200, seg:6, desc:'Japoneses.',
    al:['cacahuate','gluten','soya'] },
];

/* ══════════════════════════════════════════════════════════════════════════
   0-bis · LOS ALÉRGENOS
   Esto no es adorno de diseño: en una escuela hay chavos alérgicos y hoy la
   app no dice nada de lo que lleva cada platillo. Es lo único de todo el
   catálogo que puede mandar a alguien al hospital.

   Y la línea que NO se cruza: las alergias del ALUMNO se guardan sólo en su
   teléfono, en una llave aparte, y nunca entran al registro que ve la
   cooperativa. Un dato de salud de un menor en una base compartida es
   exactamente lo que la regla de "cero datos de más" existe para evitar.
   ═════════════════════════════════════════════════════════════════════════ */
const ALERGENOS = [
  { id:'gluten',   nombre:'Gluten',        emoji:'🌾' },
  { id:'lacteos',  nombre:'Leche',         emoji:'🥛' },
  { id:'huevo',    nombre:'Huevo',         emoji:'🥚' },
  { id:'soya',     nombre:'Soya',          emoji:'🫘' },
  { id:'cacahuate',nombre:'Cacahuate',     emoji:'🥜' },
  { id:'nuez',     nombre:'Nueces',        emoji:'🌰' },
  { id:'mariscos', nombre:'Pescado y mariscos', emoji:'🦐' },
  { id:'ajonjoli', nombre:'Ajonjolí',      emoji:'🫓' },
  { id:'picante',  nombre:'Picante',       emoji:'🌶️' },
];

/* ══════════════════════════════════════════════════════════════════════════
   1 · UTILERÍA
   ═════════════════════════════════════════════════════════════════════════ */
const ahora = () => Date.now();

function id(pre){
  return (pre||'') + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

/* Código corto para el ticket (F24). Sin I ni O para que nadie confunda un
   uno con una i cuando lo lea en voz alta. */
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function codigo(n){
  let s = '';
  for(let i=0;i<(n||4);i++) s += ALFA[Math.floor(Math.random()*ALFA.length)];
  return s;
}

function pesos(centavos){
  return '$' + (Math.round(centavos)/100).toLocaleString('es-MX',
    { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function minutosDe(seg){
  if(seg < 60) return 'menos de un minuto';
  const m = Math.round(seg/60);
  return m + (m===1 ? ' minuto' : ' minutos');
}

/* Limpia lo que escribe una persona: sin apellidos, sin correos, sin nada
   que no haga falta. Regla 5: cero datos de más. */
function limpiaNombre(t){
  return String(t||'').replace(/\s+/g,' ').trim().slice(0,24);
}
function limpiaGrupo(t){
  return String(t||'').toUpperCase().replace(/\s+/g,'').slice(0,6);
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · EL ADAPTADOR DE DATOS
   Una sola interfaz: leer(), escribir(), alCambiar(). Hoy la cumple el motor
   local; mañana la cumple el del servidor sin que nadie más cambie.
   ═════════════════════════════════════════════════════════════════════════ */
const LLAVE = 'fadori_v1';

function estadoVacio(){
  return {
    version: 1,
    config: Object.assign({}, CONFIG_BASE),
    productos: [],
    alumnos: {},      /* codigo -> {codigo, nombre, grupo, deuda, terminos, favorito} */
    pedidos: [],
    eventos: [],      /* la materia prima del medidor (F43) */
    conteos: [],      /* el contador manual de la fila física */
    recreo: null,     /* {id, abierto, inicio, fin} */
  };
}

const MotorLocal = {
  nombre: 'local',
  _canal: null,
  _oyentes: [],

  leer(){
    try{
      const crudo = localStorage.getItem(LLAVE);
      if(!crudo) return null;
      const d = JSON.parse(crudo);
      return (d && d.version) ? d : null;
    }catch(e){ return null; }
  },

  escribir(d){
    try{
      localStorage.setItem(LLAVE, JSON.stringify(d));
    }catch(e){
      /* Si se llenó la memoria, lo primero que se tira son los eventos viejos:
         el medidor duele menos que perder un pedido. */
      d.eventos = d.eventos.slice(-400);
      try{ localStorage.setItem(LLAVE, JSON.stringify(d)); }
      catch(e2){
        /* Y si aun así no cupo, esto NO se traga en silencio. Antes se
           perdía una foto y nadie se enteraba hasta que un alumno decía
           "no la veo". Un guardado que falla callado es lo peor que puede
           hacer un programa con los datos de alguien. */
        console.error('Fadori: no cupo en la memoria del aparato', e2);
        this._avisar();
        throw new Error('la memoria de este aparato ya está llena');
      }
    }
    this._avisar();
  },

  /* Entre pestañas del mismo aparato el aviso es inmediato. Sirve para la
     demostración: el teléfono del alumno y la pantalla del mostrador abiertos
     al mismo tiempo, sincronizados. */
  alCambiar(fn){
    this._oyentes.push(fn);
    if(!this._canal && typeof BroadcastChannel !== 'undefined'){
      this._canal = new BroadcastChannel('fadori');
      this._canal.onmessage = () => this._oyentes.forEach(f => f());
    }
    /* y por si el navegador no tiene BroadcastChannel */
    global.addEventListener('storage', (e) => {
      if(e.key === LLAVE) this._oyentes.forEach(f => f());
    });
  },

  _avisar(){
    if(this._canal){ try{ this._canal.postMessage('cambio'); }catch(e){} }
  },
};

/* El hueco donde entra el servidor el día que se autorice. Se deja escrito
   para que sea conectar y no rehacer — igual que el hueco del pago (F32). */
const MotorServidor = {
  nombre: 'servidor',
  disponible: false,
  leer(){ throw new Error('El motor de servidor todavía no está conectado.'); },
  escribir(){ throw new Error('El motor de servidor todavía no está conectado.'); },
  alCambiar(){},
};

let MOTOR = MotorLocal;

/* ══════════════════════════════════════════════════════════════════════════
   3 · EL ESTADO
   ═════════════════════════════════════════════════════════════════════════ */
let D = null;

function siembra(){
  const d = estadoVacio();
  d.productos = MENU_BASE.map((p, i) => ({
    id: id('p'),
    nombre: p.nombre,
    cat: p.cat,
    precio: p.precio,
    segPrep: p.seg,
    desc: p.desc || '',
    alergenos: p.al || [],
    foto: '',
    disponible: true,
    destacado: i === 0,          /* F02 · el plato fuerte del día va primero */
    existencias: null,           /* null = sin control de inventario */
    orden: i,
  }));
  return d;
}

function cargar(){
  D = MOTOR.leer();
  if(!D) { D = siembra(); MOTOR.escribir(D); }
  /* migración suave: si el archivo viene de una versión vieja, se completa */
  D.config = Object.assign({}, CONFIG_BASE, D.config || {});
  ['productos','pedidos','eventos','conteos'].forEach(k => { if(!Array.isArray(D[k])) D[k] = []; });
  /* migración: los productos de antes no traían alérgenos ni descripción */
  D.productos.forEach(p => { if(!Array.isArray(p.alergenos)) p.alergenos = [];
    if(typeof p.desc !== 'string') p.desc = ''; });
  if(!D.alumnos) D.alumnos = {};
  return D;
}

function guardar(){ MOTOR.escribir(D); }

function estado(){ return D || cargar(); }

/* ══════════════════════════════════════════════════════════════════════════
   4 · EL MEDIDOR · F43
   Cada cambio deja huella. De aquí sale TODO el reporte, sin que nadie
   capture nada a mano — que es justo lo que hace que el proyecto se defienda
   solo: los números los recogió la app, no la memoria de alguien.
   ═════════════════════════════════════════════════════════════════════════ */
function anotar(tipo, datos){
  D.eventos.push(Object.assign({ t: ahora(), tipo }, datos || {}));
  if(D.eventos.length > 5000) D.eventos = D.eventos.slice(-4000);
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · QUIÉN ES · F06 · identidad sin registro
   Nombre de pila y grupo. Sin contraseña, sin correo, sin apellidos, sin
   foto. Cientos de menores sin una base de datos de menores.
   ═════════════════════════════════════════════════════════════════════════ */
const LLAVE_YO = 'fadori_yo';

function registrar(nombre, grupo){
  const d = estado();
  const n = limpiaNombre(nombre), g = limpiaGrupo(grupo);
  if(!n) throw new Error('Falta el nombre.');
  if(!g) throw new Error('Falta el grupo.');
  const cod = codigo(4);
  d.alumnos[cod] = { codigo:cod, nombre:n, grupo:g, deuda:0, terminos:0, creado:ahora() };
  guardar();
  try{ localStorage.setItem(LLAVE_YO, cod); }catch(e){}
  return d.alumnos[cod];
}

function yo(){
  const d = estado();
  let cod = null;
  try{ cod = localStorage.getItem(LLAVE_YO); }catch(e){}
  return (cod && d.alumnos[cod]) ? d.alumnos[cod] : null;
}

function entrarComo(cod){
  const d = estado();
  const a = d.alumnos[String(cod||'').toUpperCase()];
  if(!a) return null;
  try{ localStorage.setItem(LLAVE_YO, a.codigo); }catch(e){}
  return a;
}

function salir(){ try{ localStorage.removeItem(LLAVE_YO); }catch(e){} }

/* F29 · los términos se firman una sola vez y queda la fecha */
function aceptarTerminos(cod){
  const d = estado();
  const a = d.alumnos[cod]; if(!a) return null;
  a.terminos = ahora();
  anotar('terminos', { alumno:cod });
  guardar();
  return a;
}

/* ══════════════════════════════════════════════════════════════════════════
   6 · EL MENÚ
   ═════════════════════════════════════════════════════════════════════════ */
function productos(soloDisponibles){
  const d = estado();
  const lista = d.productos.slice().sort((a,b) => (a.orden||0) - (b.orden||0));
  return soloDisponibles ? lista.filter(p => p.disponible && existenciasOk(p)) : lista;
}

function existenciasOk(p){
  return p.existencias === null || p.existencias === undefined || p.existencias > 0;
}

function producto(pid){ return estado().productos.find(p => p.id === pid) || null; }

/* F33 · agotado y de vuelta, en un toque. Lo agotado sale del menú del alumno
   al instante, que es como se evita el pedido de algo que ya no hay. */
function marcarDisponible(pid, si){
  const p = producto(pid); if(!p) return;
  p.disponible = !!si;
  anotar(si ? 'producto_vuelve' : 'producto_agotado', { prod:pid });
  guardar();
}

function guardarProducto(datos){
  const d = estado();
  if(datos.id){
    const p = producto(datos.id);
    if(p) Object.assign(p, datos);
  } else {
    d.productos.push(Object.assign({
      id:id('p'), foto:'', disponible:true, destacado:false, desc:'', alergenos:[],
      existencias:null, segPrep:40, orden:d.productos.length,
    }, datos));
  }
  guardar();
}

function borrarProducto(pid){
  const d = estado();
  d.productos = d.productos.filter(p => p.id !== pid);
  guardar();
}

/* ══════════════════════════════════════════════════════════════════════════
   7 · LOS PEDIDOS
   ═════════════════════════════════════════════════════════════════════════ */
const ESTADOS = ['en_cola','preparando','listo','entregado','cancelado','apartado'];
const VIVOS = ['en_cola','preparando','listo'];

function totalDe(renglones){
  return renglones.reduce((s, r) => {
    const p = producto(r.prod);
    return s + (p ? p.precio * r.cant : 0);
  }, 0);
}

function segundosDe(renglones){
  return renglones.reduce((s, r) => {
    const p = producto(r.prod);
    return s + (p ? (segReales(p.id) || p.segPrep || 40) * r.cant : 0);
  }, 0);
}

/* F16 · el tope por alumno, para que nadie pida treinta tortas de broma */
function pedidosDeHoy(cod){
  const d = estado(), desde = arranqueDelDia();
  return d.pedidos.filter(p => p.alumno === cod && p.creado >= desde &&
    p.estado !== 'cancelado');
}

function arranqueDelDia(){
  const h = new Date(); h.setHours(0,0,0,0); return h.getTime();
}

/* F27/F28 · la deuda bloquea, pero NUNCA se enseña en pantalla que vea otro
   alumno. Que un compañero vea lo que debes es humillación, no
   administración. */
function puedePedir(cod){
  const d = estado(), a = d.alumnos[cod];
  if(!a) return { puede:false, por:'Todavía no has puesto tu nombre.' };
  if(!a.terminos) return { puede:false, por:'Falta aceptar las condiciones de uso.' };
  if(a.deuda >= d.config.limiteDeuda)
    return { puede:false, por:'Tienes '+pesos(a.deuda)+' pendientes. Hay que pagar para volver a pedir.' };
  const hoy = pedidosDeHoy(cod).length;
  if(hoy >= d.config.topeporAlumno)
    return { puede:false, por:'Ya hiciste '+hoy+' pedidos hoy, que es el máximo.' };
  return { puede:true };
}

/* F03 · pedir · F05 · para varios · F13 · con anticipación */
function pedir(cod, renglones, opciones){
  const d = estado();
  const o = opciones || {};
  const permiso = o.origen === 'mostrador' ? { puede:true } : puedePedir(cod);
  if(!permiso.puede) throw new Error(permiso.por);
  const limpios = (renglones||[])
    .filter(r => r && r.prod && r.cant > 0)
    .map(r => ({ prod:r.prod, cant:Math.min(10, Math.max(1, r.cant|0)),
                 para: limpiaNombre(r.para || ''), listo:false }));
  if(!limpios.length) throw new Error('El pedido está vacío.');

  const p = {
    id: id('o'),
    folio: codigo(4),
    alumno: cod || null,
    nombre: cod && d.alumnos[cod] ? d.alumnos[cod].nombre : limpiaNombre(o.nombre || 'Mostrador'),
    grupo:  cod && d.alumnos[cod] ? d.alumnos[cod].grupo  : limpiaGrupo(o.grupo || ''),
    renglones: limpios,
    total: totalDe(limpios),
    pagado: 0,
    creado: ahora(),
    estado: 'en_cola',
    anticipado: !!o.anticipado,
    /* la nota la escribe el alumno y la LEE la cooperativa. Si no sale en la
       pantalla de despachar, es un campo decorativo y mejor no tenerlo. */
    nota: String(o.nota || '').slice(0, 140).trim(),
    origen: o.origen || 'app',
    despachador: null,
    tomado: 0, listoEn: 0, entregado: 0,
    turno: siguienteTurno(),
  };
  d.pedidos.push(p);
  anotar('pedido', { pedido:p.id, alumno:cod, total:p.total,
    anticipado:p.anticipado, origen:p.origen, seg:segundosDe(limpios) });
  guardar();
  return p;
}

function siguienteTurno(){
  const d = estado(), desde = arranqueDelDia();
  const hoy = d.pedidos.filter(p => p.creado >= desde);
  return hoy.length + 1;
}

function pedido(oid){ return estado().pedidos.find(p => p.id === oid) || null; }

function pedidosDe(cod){
  return estado().pedidos.filter(p => p.alumno === cod)
    .sort((a,b) => b.creado - a.creado);
}

/* ══════════════════════════════════════════════════════════════════════════
   8 · LA FILA · F10 · el único lugar donde se ordena
   No es "primero en llegar": atender primero lo rápido baja la espera
   promedio de TODOS. Pero con tope obligatorio — sin él, el que pidió el
   plato fuerte nunca come, y eso se nota al tercer día.
   ═════════════════════════════════════════════════════════════════════════ */
function colaOrdenada(){
  const d = estado();
  const vivos = d.pedidos.filter(p => p.estado === 'en_cola' || p.estado === 'preparando');
  const t = ahora();

  const conPeso = vivos.map(p => {
    const seg = segundosDe(p.renglones);
    /* el peso convierte "qué tan tardado" en "cuántos segundos de ventaja
       pierde": un pedido de 90 s cede el paso a uno de 20 s, pero sólo
       durante los primeros minutos */
    return { p, seg, espera: t - p.creado };
  });

  return conPeso.sort((a, b) => {
    /* 1 · lo que ya está en la plancha nunca se reordena */
    if((a.p.estado === 'preparando') !== (b.p.estado === 'preparando'))
      return a.p.estado === 'preparando' ? -1 : 1;
    /* 2 · F13 · los anticipados entran primero: por eso sirve pedir antes */
    if(a.p.anticipado !== b.p.anticipado) return a.p.anticipado ? -1 : 1;
    /* 3 · EL TOPE. Quien lleve esperando más que el tope se vuelve intocable
       y se ordena sólo por antigüedad. Es lo que impide que el plato fuerte
       se quede para el final para siempre. */
    const topeMs = topeEnMs();
    const aVieja = a.espera > topeMs, bVieja = b.espera > topeMs;
    if(aVieja !== bVieja) return aVieja ? -1 : 1;
    if(aVieja && bVieja) return a.p.creado - b.p.creado;
    /* 4 · y sólo entonces, lo rápido primero, sin olvidar quién llegó antes */
    return (a.p.creado + a.seg*1000) - (b.p.creado + b.seg*1000);
  }).map(x => x.p);
}

/* El tope se expresa en turnos y se traduce a tiempo con el ritmo real de
   despacho, que es lo que hace que se comporte igual un día lento que uno
   rápido. */
function topeEnMs(){
  const d = estado();
  return d.config.topeAdelantos * Math.max(20, ritmoDespacho()) * 1000;
}

/* Segundos que cuesta despachar un pedido, medidos. Si todavía no hay
   medición, se usa el estimado del menú. */
function ritmoDespacho(){
  const d = estado();
  const ds = d.eventos.filter(e => e.tipo === 'entregado' && e.dur > 0).slice(-40);
  if(ds.length >= 5){
    const suma = ds.reduce((s,e) => s + e.dur, 0);
    return (suma / ds.length) / Math.max(1, d.config.despachadores);
  }
  return 36 / Math.max(1, d.config.despachadores);   /* los 36 s que midió Carlos */
}

/* Segundos reales por producto (F40), que además alimentan el estimado del
   alumno (F09) y la prioridad de la fila (F10). El dato se mide solo. */
function segReales(pid){
  const d = estado();
  const ms = d.eventos.filter(e => e.tipo === 'renglon_listo' && e.prod === pid).slice(-20);
  if(ms.length < 3) return 0;
  return Math.round(ms.reduce((s,e) => s + e.dur, 0) / ms.length);
}

/* F09 · cuántos van antes que el tuyo y cuánto falta */
function lugarDe(oid){
  const cola = colaOrdenada();
  const i = cola.findIndex(p => p.id === oid);
  if(i < 0) return null;
  const antes = cola.slice(0, i);
  const seg = antes.reduce((s, p) => s + segundosDe(p.renglones), 0)
              / Math.max(1, estado().config.despachadores);
  return { lugar: i + 1, antes: i, segundos: Math.round(seg), total: cola.length };
}

/* ══════════════════════════════════════════════════════════════════════════
   9 · EL VEREDICTO · F12 · "alcanzas / no alcanzas"
   La función que ninguna fila física puede hacer ni contratando a diez
   personas: decir la verdad temprano. Lo ve el alumno y NADIE MÁS.
   ═════════════════════════════════════════════════════════════════════════ */
function ventanaRecreo(){
  const d = estado();
  const [h, m] = String(d.config.recreoInicia || '10:30').split(':').map(Number);
  const hoy = new Date(); hoy.setHours(h||10, m||30, 0, 0);
  const inicio = hoy.getTime();
  return { inicio, fin: inicio + (d.config.recreoMinutos || 30) * 60000 };
}

function enRecreo(){
  const w = ventanaRecreo(), t = ahora();
  return t >= w.inicio && t < w.fin;
}

/* Fuera de la ventana el recreo que cuenta es el SIGUIENTE, completo: pedir a
   las siete de la mañana es un anticipado, no un "ya no alcanzas". Devolver
   cero ahí hacía que la app le dijera "hoy no alcanzas" a alguien que pidió
   antes de que empezara el recreo, que es exactamente al revés. */
/* La cuenta regresiva que se ve SIEMPRE. Devuelve en qué momento del día
   estamos y cuántos segundos faltan para lo que toca — que empiece el recreo
   si todavía no, o que se acabe si ya empezó. */
function cuentaRegresiva(){
  const w = ventanaRecreo(), t = ahora();
  if(t < w.inicio) return { estado:'antes',   segundos: Math.round((w.inicio - t)/1000) };
  if(t < w.fin)    return { estado:'durante', segundos: Math.round((w.fin - t)/1000) };
  return { estado:'despues', segundos:0 };
}

/* mm:ss cuando falta poco, "12 min" cuando falta harto. Nadie necesita los
   segundos a veinte minutos del final, y a los dos minutos sí. */
function relojCorto(seg){
  if(seg >= 600) return Math.round(seg/60) + ' min';
  const m = Math.floor(seg/60), s2 = seg % 60;
  return m + ':' + String(s2).padStart(2,'0');
}

function quedanSegundosDeRecreo(){
  const d = estado(), w = ventanaRecreo(), t = ahora();
  if(t < w.inicio || t >= w.fin) return (d.config.recreoMinutos || 30) * 60;
  return Math.max(0, Math.round((w.fin - t) / 1000));
}

function veredicto(oid){
  const l = lugarDe(oid);
  if(!l) return null;
  const p = pedido(oid);
  const mio = segundosDe(p.renglones);
  const falta = l.segundos + mio;
  const queda = quedanSegundosDeRecreo();
  const alcanza = falta <= queda;
  return {
    lugar: l.lugar, antes: l.antes, segundos: falta, quedan: queda, alcanza,
    frase: alcanza
      ? 'Vas en el ' + l.lugar + ' · alcanzas, como en ' + minutosDe(falta)
      : 'Vas en el ' + l.lugar + ' · hoy no alcanzas',
  };
}

/* F14 · si hoy no alcanzaste, tu pedido se guarda y entras primero mañana.
   Convierte el peor momento de la app en el que te hace volver. */
function apartarParaManana(oid){
  const p = pedido(oid); if(!p) return null;
  p.estado = 'apartado';
  anotar('apartado', { pedido:oid, alumno:p.alumno });
  guardar();
  return p;
}

/* F15 · "voy en camino" / "hoy no puedo ir". Sin esto la comida se hace y
   nadie la recoge: la señora perdió el ingrediente y el lugar en la fila. */
function voyEnCamino(oid){
  const p = pedido(oid); if(!p) return null;
  p.enCamino = ahora();
  anotar('en_camino', { pedido:oid });
  guardar();
  return p;
}

function cancelar(oid, quien){
  const p = pedido(oid); if(!p) return null;
  p.estado = 'cancelado';
  p.cancelado = ahora();
  anotar('cancelado', { pedido:oid, quien: quien || 'alumno' });
  guardar();
  return p;
}

/* ══════════════════════════════════════════════════════════════════════════
   10 · EL MOSTRADOR
   ═════════════════════════════════════════════════════════════════════════ */
/* F23 · varios despachadores sin chocar: el primero que toma el pedido se
   queda con él, y a los demás les desaparece de la cola. */
function tomar(oid, quien){
  const p = pedido(oid); if(!p) return null;
  if(p.estado !== 'en_cola') return null;
  p.estado = 'preparando';
  p.despachador = quien || 'mostrador';
  p.tomado = ahora();
  anotar('tomado', { pedido:oid, quien:p.despachador });
  guardar();
  return p;
}

/* F20 · "ya lo tengo", renglón por renglón */
function renglonListo(oid, i, si){
  const p = pedido(oid); if(!p || !p.renglones[i]) return null;
  const r = p.renglones[i];
  r.listo = si === undefined ? true : !!si;
  if(r.listo){
    const desde = p.tomado || p.creado;
    anotar('renglon_listo', { pedido:oid, prod:r.prod,
      dur: Math.round((ahora() - desde)/1000) });
    /* descontar inventario (F33/F37) */
    const prod = producto(r.prod);
    if(prod && typeof prod.existencias === 'number'){
      prod.existencias = Math.max(0, prod.existencias - r.cant);
      if(prod.existencias === 0) prod.disponible = false;
    }
  }
  guardar();
  return p;
}

/* F21 · pedido listo → le avisa al cliente */
function marcarListo(oid){
  const p = pedido(oid); if(!p) return null;
  p.estado = 'listo';
  p.listoEn = ahora();
  p.renglones.forEach(r => r.listo = true);
  anotar('listo', { pedido:oid, dur: Math.round((ahora() - (p.tomado||p.creado))/1000) });
  guardar();
  return p;
}

/* F26 · el ticket · F27 · la deuda */
function entregar(oid, pagado){
  const d = estado();
  const p = pedido(oid); if(!p) return null;
  const paga = Math.max(0, Math.round(pagado || 0));
  p.pagado = paga;
  p.estado = 'entregado';
  p.entregado = ahora();
  const falta = p.total - paga;
  if(falta > 0 && p.alumno && d.alumnos[p.alumno]){
    d.alumnos[p.alumno].deuda += falta;
    p.debio = falta;
    anotar('deuda', { pedido:oid, alumno:p.alumno, monto:falta });
  }
  anotar('entregado', { pedido:oid, total:p.total, pagado:paga,
    dur: Math.round((p.entregado - (p.tomado || p.creado))/1000),
    espera: Math.round((p.entregado - p.creado)/1000) });
  guardar();
  return p;
}

/* F30 · perdonar o ajustar una deuda. El botón tiene que existir porque va a
   hacer falta — y queda registrado quién y cuándo. */
function ajustarDeuda(cod, nuevaEnCentavos, quien){
  const d = estado(), a = d.alumnos[cod]; if(!a) return null;
  const antes = a.deuda;
  a.deuda = Math.max(0, Math.round(nuevaEnCentavos));
  anotar('deuda_ajuste', { alumno:cod, antes, despues:a.deuda, quien: quien || 'cooperativa' });
  guardar();
  return a;
}

function abonar(cod, centavos){
  const d = estado(), a = d.alumnos[cod]; if(!a) return null;
  a.deuda = Math.max(0, a.deuda - Math.max(0, Math.round(centavos)));
  anotar('abono', { alumno:cod, monto:centavos });
  guardar();
  return a;
}

/* ══════════════════════════════════════════════════════════════════════════
   11 · EL CONTADOR MANUAL · para el "antes"
   Los días en que la app todavía no está publicada, o para contar la fila
   física que convive con la virtual. Es como se captura la línea base sin
   depender de la memoria de nadie.
   ═════════════════════════════════════════════════════════════════════════ */
function contarFila(cuantos, nota){
  const d = estado();
  d.conteos.push({ t:ahora(), n:Math.max(0, cuantos|0), nota: String(nota||'').slice(0,80) });
  guardar();
}

/* ══════════════════════════════════════════════════════════════════════════
   12 · EL REPORTE · F38 y F43
   ═════════════════════════════════════════════════════════════════════════ */
function resumenDelDia(desde){
  const d = estado();
  const t0 = desde || arranqueDelDia();
  const hoy = d.pedidos.filter(p => p.creado >= t0);
  const entregados = hoy.filter(p => p.estado === 'entregado');
  const vivos = hoy.filter(p => VIVOS.indexOf(p.estado) >= 0);

  const dur = entregados.map(p => Math.round((p.entregado - (p.tomado||p.creado))/1000))
                        .filter(n => n > 0);
  const esperas = entregados.map(p => Math.round((p.entregado - p.creado)/1000))
                            .filter(n => n > 0);
  const prom = (a) => a.length ? Math.round(a.reduce((s,n)=>s+n,0)/a.length) : 0;

  /* qué se vendió */
  const porProducto = {};
  entregados.forEach(p => p.renglones.forEach(r => {
    const k = r.prod;
    if(!porProducto[k]) porProducto[k] = { prod:k, nombre:(producto(k)||{}).nombre||'—', unidades:0, dinero:0 };
    porProducto[k].unidades += r.cant;
    porProducto[k].dinero += ((producto(k)||{}).precio||0) * r.cant;
  }));

  const agotados = d.eventos.filter(e => e.tipo === 'producto_agotado' && e.t >= t0)
    .map(e => ({ nombre:(producto(e.prod)||{}).nombre || '—', hora:new Date(e.t) }));

  return {
    pedidos: hoy.length,
    entregados: entregados.length,
    anticipados: hoy.filter(p => p.anticipado).length,
    cancelados: hoy.filter(p => p.estado === 'cancelado').length,
    apartados: hoy.filter(p => p.estado === 'apartado').length,
    noAlcanzaron: vivos.length,
    dinero: entregados.reduce((s,p) => s + p.pagado, 0),
    facturado: entregados.reduce((s,p) => s + p.total, 0),
    deudaNueva: entregados.reduce((s,p) => s + (p.debio||0), 0),
    despachoPromedio: prom(dur),
    esperaPromedio: prom(esperas),
    ventas: Object.values(porProducto).sort((a,b) => b.unidades - a.unidades),
    agotados,
    filaAhora: colaOrdenada().length,
  };
}

/* La fila minuto a minuto: cuántos turnos vivos había en cada momento. Sale
   de los eventos, no de un cronómetro: es el "antes y después" del reporte. */
function curvaDeFila(desde){
  const d = estado();
  const t0 = desde || arranqueDelDia();
  const evs = d.eventos.filter(e => e.t >= t0 &&
    (e.tipo === 'pedido' || e.tipo === 'entregado' || e.tipo === 'cancelado'))
    .sort((a,b) => a.t - b.t);
  const puntos = []; let n = 0;
  evs.forEach(e => {
    n += (e.tipo === 'pedido') ? 1 : -1;
    if(n < 0) n = 0;
    puntos.push({ t:e.t, n });
  });
  return puntos;
}

/* Todo exportable, en formato nuestro. Regla §2: los datos son de la
   escuela, no de la herramienta. */
function aCSV(filas, columnas){
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  return [columnas.map(c => esc(c.titulo)).join(',')]
    .concat(filas.map(f => columnas.map(c => esc(c.valor(f))).join(',')))
    .join('\n');
}

function csvDePedidos(desde){
  const d = estado(), t0 = desde || arranqueDelDia();
  const hora = (ms) => ms ? new Date(ms).toLocaleTimeString('es-MX', {hour12:false}) : '';
  return aCSV(d.pedidos.filter(p => p.creado >= t0), [
    { titulo:'folio',        valor:p => p.folio },
    { titulo:'turno',        valor:p => p.turno },
    { titulo:'grupo',        valor:p => p.grupo },
    { titulo:'estado',       valor:p => p.estado },
    { titulo:'origen',       valor:p => p.origen },
    { titulo:'anticipado',   valor:p => p.anticipado ? 'sí' : 'no' },
    { titulo:'nota',         valor:p => p.nota || '' },
    { titulo:'articulos',    valor:p => p.renglones.reduce((s,r)=>s+r.cant,0) },
    { titulo:'total_pesos',  valor:p => (p.total/100).toFixed(2) },
    { titulo:'pagado_pesos', valor:p => (p.pagado/100).toFixed(2) },
    { titulo:'pidio',        valor:p => hora(p.creado) },
    { titulo:'tomado',       valor:p => hora(p.tomado) },
    { titulo:'entregado',    valor:p => hora(p.entregado) },
    { titulo:'espera_seg',   valor:p => p.entregado ? Math.round((p.entregado-p.creado)/1000) : '' },
    { titulo:'despacho_seg', valor:p => p.entregado ? Math.round((p.entregado-(p.tomado||p.creado))/1000) : '' },
  ]);
}

function csvDeConteos(){
  const d = estado();
  return aCSV(d.conteos, [
    { titulo:'fecha', valor:c => new Date(c.t).toLocaleDateString('es-MX') },
    { titulo:'hora',  valor:c => new Date(c.t).toLocaleTimeString('es-MX', {hour12:false}) },
    { titulo:'formados', valor:c => c.n },
    { titulo:'nota',  valor:c => c.nota },
  ]);
}

function bajarCSV(nombre, texto){
  const b = new Blob(['﻿' + texto], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = nombre;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* F31 · cierre de ciclo: saldar o perdonar lo pendiente y borrar los datos.
   Si nadie escribe cuándo se borra, no se borra nunca. */
function cerrarCiclo(){
  const d = estado();
  const resumen = resumenDelDia(0);
  D = siembra();
  D.productos = d.productos;      /* el menú se queda; la gente no */
  D.config = d.config;
  guardar();
  return resumen;
}

/* ── Mis alergias · SÓLO en este teléfono ────────────────────────────────
   No entran a `alumnos`, que es lo que la cooperativa ve y exporta. Un dato
   de salud de un menor no vive en una base compartida por comodidad. */
const LLAVE_ALERGIAS = 'fadori_mis_alergias';

function misAlergias(){
  try{ const a = JSON.parse(localStorage.getItem(LLAVE_ALERGIAS) || '[]');
       return Array.isArray(a) ? a : []; }catch(e){ return []; }
}
function guardarAlergias(lista){
  try{ localStorage.setItem(LLAVE_ALERGIAS,
    JSON.stringify((lista||[]).filter(x => ALERGENOS.some(a => a.id === x)))); }catch(e){}
}

/* Qué de lo que llevas choca con lo que marcaste. Devuelve por platillo, no
   una lista suelta: hace falta saber CUÁL quitar, no sólo que hay problema. */
function choquesDe(renglones){
  const mias = misAlergias();
  if(!mias.length) return [];
  return (renglones || []).map(r => {
    const p = producto(r.prod); if(!p) return null;
    const choca = (p.alergenos || []).filter(a => mias.indexOf(a) >= 0);
    return choca.length ? { prod:p.id, nombre:p.nombre, alergenos:choca } : null;
  }).filter(Boolean);
}

/* ══════════════════════════════════════════════════════════════════════════
   13 · F39 · EL ASISTENTE DE PRESUPUESTO
   "Traigo 50 pesos" → opciones que caben. Y no sólo el trío de siempre.
   ═════════════════════════════════════════════════════════════════════════ */
function opcionesPara(centavos, cuantas){
  const disp = productos(true);
  const tope = Math.max(0, centavos|0);
  const combos = [];

  const porCat = (c) => disp.filter(p => p.cat === c);
  const barato = (a) => a.slice().sort((x,y) => x.precio - y.precio);
  const rico   = (a) => a.slice().sort((x,y) => y.precio - x.precio);

  const mete = (titulo, piezas) => {
    if(!piezas.length || piezas.some(p => !p)) return;
    const total = piezas.reduce((s,p) => s + p.precio, 0);
    if(total > tope) return;
    const llave = piezas.map(p => p.id).sort().join('|');
    if(combos.some(c => c.llave === llave)) return;
    combos.push({ llave, titulo, piezas, total, sobra: tope - total });
  };

  /* el trío clásico */
  rico(porCat('fuerte')).forEach(f => barato(porCat('bebida')).forEach(b =>
    barato(porCat('dulce')).forEach(d => mete('Comida completa', [f,b,d]))));
  /* y las que NO son ese trío, que es lo que pidió Carlos */
  rico(porCat('fuerte')).forEach(f => barato(porCat('bebida')).forEach(b =>
    mete('Plato fuerte y algo de tomar', [f,b])));
  rico(porCat('torta')).forEach(t => barato(porCat('bebida')).forEach(b =>
    barato(porCat('botana')).forEach(s => mete('Torta, bebida y botana', [t,b,s]))));
  rico(porCat('antojo')).forEach(a => rico(porCat('antojo')).forEach(a2 => {
    if(a.id !== a2.id) mete('Dos antojitos', [a,a2]);
  }));
  rico(porCat('torta')).forEach(t => barato(porCat('bebida')).forEach(b =>
    mete('Torta y bebida', [t,b])));
  rico(porCat('dulce')).forEach(d => rico(porCat('bebida')).forEach(b =>
    mete('Sólo algo dulce', [d,b])));

  /* Con poco dinero no hay combinaciones, y antes eso significaba mandar al
     alumno al diablo con un "no te alcanza para nada" — aunque sí alcanzara
     para una cosa. Si no salió ningún combo, se ofrecen las piezas sueltas
     que sí caben, de la más cara a la más barata: con veinte pesos lo que
     quieres saber es qué es lo mejor que puedes comprar, no que no puedes. */
  if(!combos.length){
    /* una sola cosa: el título es el nombre del platillo, no seis tarjetas
       que dicen todas "Alcanza para" */
    rico(disp.filter(p => p.precio <= tope)).forEach(p => mete(p.nombre, [p]));
  }

  /* lo que más aprovecha el dinero primero, y con variedad de encabezado */
  const vistos = {};
  return combos
    .sort((a,b) => a.sobra - b.sobra)
    .filter(c => { const n = (vistos[c.titulo]||0); vistos[c.titulo] = n+1; return n < 2; })
    .slice(0, cuantas || 6);
}

/* "Llévate algo más" · lo que le falta a este pedido para ser una comida.
   NO es vender por vender: mira qué categorías trae el carrito y ofrece las
   que faltan —lo de tomar, lo dulce— empezando por lo más barato y por lo
   que esa persona ya pide seguido. En un recreo de treinta minutos, volver
   al menú por la bebida cuesta más que el refresco. */
function sugerenciasPara(renglones, cod, cuantas){
  const dentro = (renglones || []).map(r => r.prod);
  const cats = dentro.map(id => (producto(id) || {}).cat);
  const disp = productos(true).filter(p => dentro.indexOf(p.id) < 0);

  /* el orden de lo que más falta: primero de tomar, luego algo dulce */
  const faltan = ['bebida','dulce','botana','antojo']
    .filter(c => cats.indexOf(c) < 0);

  /* lo que esa persona ya pide seguido va primero dentro de su categoría */
  const mios = {};
  if(cod) misNumeros(cod).favoritos.forEach(f => { mios[f.prod] = f.veces; });

  const puntua = (p) => (mios[p.id] || 0) * 1000 - p.precio;
  const salida = [];
  faltan.forEach(c => {
    const dela = disp.filter(p => p.cat === c).sort((a,b) => puntua(b) - puntua(a));
    if(dela.length) salida.push(dela[0]);
  });
  /* si no falta ninguna categoría, se ofrece lo barato que no lleve */
  if(!salida.length){
    disp.sort((a,b) => puntua(b) - puntua(a)).slice(0,4).forEach(p => salida.push(p));
  }
  return salida.slice(0, cuantas || 3);
}

/* F41 · lo tuyo: tus tendencias, tus más pedidos, cuánto llevas gastado */
function misNumeros(cod){
  const mios = pedidosDe(cod).filter(p => p.estado === 'entregado');
  const cuenta = {};
  mios.forEach(p => p.renglones.forEach(r => {
    cuenta[r.prod] = (cuenta[r.prod] || 0) + r.cant;
  }));
  const favoritos = Object.keys(cuenta)
    .map(k => ({ prod:k, nombre:(producto(k)||{}).nombre || '—', veces:cuenta[k] }))
    .sort((a,b) => b.veces - a.veces);
  return {
    pedidos: mios.length,
    gastado: mios.reduce((s,p) => s + p.pagado, 0),
    favoritos,
    /* F04 · "lo de siempre": el último pedido entregado, tal cual */
    loDeSiempre: mios.length ? mios[0].renglones.map(r => ({ prod:r.prod, cant:r.cant })) : null,
  };
}

/* F42 · sugerencias y errores, a una bandeja que revisa Carlos, con la
   pantalla en la que estaba abierta para no tener que adivinar */
function sugerir(texto, pantalla, cod){
  const d = estado();
  anotar('sugerencia', { texto:String(texto||'').slice(0,600),
    pantalla: pantalla || '', alumno: cod || null });
  guardar();
  return true;
}

function sugerencias(){
  return estado().eventos.filter(e => e.tipo === 'sugerencia')
    .sort((a,b) => b.t - a.t);
}

/* ══════════════════════════════════════════════════════════════════════════
   14 · LO QUE VE EL MUNDO
   ═════════════════════════════════════════════════════════════════════════ */
const FADORI = {
  /* utilería */
  /* los billetes y monedas con los que de verdad llega un alumno */
  ALGO_DE_DINERO: [10, 15, 20, 30, 50, 100],
  pesos, minutosDe, codigo, id, ahora, CATEGORIAS, CONFIG_BASE, ALERGENOS,
  misAlergias, guardarAlergias, choquesDe,
  /* datos */
  cargar, guardar, estado, alCambiar: (fn) => MOTOR.alCambiar(fn), motor: () => MOTOR.nombre,
  /* quién es */
  registrar, yo, entrarComo, salir, aceptarTerminos,
  /* menú */
  productos, producto, marcarDisponible, guardarProducto, borrarProducto, existenciasOk,
  /* pedidos */
  pedir, pedido, pedidosDe, pedidosDeHoy, puedePedir, totalDe, segundosDe,
  cancelar, apartarParaManana, voyEnCamino,
  /* la fila */
  colaOrdenada, lugarDe, veredicto, quedanSegundosDeRecreo, enRecreo, ventanaRecreo,
  cuentaRegresiva, relojCorto,
  ritmoDespacho, segReales,
  /* mostrador */
  tomar, renglonListo, marcarListo, entregar, ajustarDeuda, abonar,
  /* medición */
  contarFila, resumenDelDia, curvaDeFila, csvDePedidos, csvDeConteos, bajarCSV, cerrarCiclo,
  /* cerebro */
  opcionesPara, sugerenciasPara, misNumeros, sugerir, sugerencias,
  /* para las pruebas */
  _siembra: siembra, _anotar: anotar, ESTADOS, VIVOS,
};

global.FADORI = FADORI;

})(typeof window !== 'undefined' ? window : globalThis);
