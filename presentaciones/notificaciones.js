/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · el panel de notificaciones
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «pon un panel de notificaciones donde pueda ver todos los cambios
   recientes». Los avisos de abajo duran cuatro segundos y se van; si estabas
   viendo otra cosa, te lo perdiste. Aquí queda TODO lo que pasó —cambios a la
   presentación, lo que hizo la IA, lo del banco, lo que falló— con su hora,
   y cada cambio que todavía se puede deshacer trae «volver a antes de esto».

   Y una segunda pestaña, «Novedades»: lo que se le fue agregando a la
   herramienta, para que no haya que adivinar qué hay nuevo.

   Se guarda en este teléfono (los últimos 300). Es historial, no datos: si
   Safari lo borra, no se pierde trabajo.
   ═════════════════════════════════════════════════════════════════════════ */
const CLAVE = 'presentacionesHistorial';
const CLAVE_NOV = 'presentacionesNovedadVista';
const TOPE = 300;

/* Lo nuevo de la herramienta, lo más reciente arriba. Al agregar una función
   se agrega aquí su renglón: es lo que Carlos lee para saber qué cambió. */
export const NOVEDADES = [
  { id: 'n15', fecha: '2026-09-26', titulo: 'Editor como Canva', texto: 'Abre una lámina y abajo tienes Texto, Elementos, Fotos, Subir, Fondo, Acomodar, IA y Presentar, con la tira de láminas debajo. «Texto» pone un título, un subtítulo o un cuadro de texto nuevo.' },
  { id: 'n14', fecha: '2026-09-26', titulo: 'Relleno: degradados, patrones y texturas', texto: 'Toca una figura → «Relleno»: degradados de hasta seis colores (en línea o desde el centro), patrones y diez texturas (madera, mármol, piel…), o una del banco o tuya.' },
  { id: 'n13', fecha: '2026-09-26', titulo: 'Transparencia, girar y tamaño', texto: 'Con una perilla, y lo ves cambiar mientras la mueves. También se gira con la manija redonda de abajo del elemento.' },
  { id: 'n12', fecha: '2026-09-25', titulo: 'Enlaces', texto: 'Un texto (o una imagen, un icono, un botón) que al tocarlo abre un link: una página, un correo o un WhatsApp. Funciona al presentar y en PowerPoint.' },
  { id: 'n11', fecha: '2026-09-25', titulo: 'Tablas y gráficas, como en Canva', texto: 'En Insertar: tablas con estilo en dos toques y gráficas de columnas, barras, líneas, área, pastel y dona. Se llenan en una tablita, y puedes pegar celdas de Excel o Google Sheets.' },
  { id: 'n10', fecha: '2026-09-25', titulo: 'Sube tus 300 imágenes desde el teléfono', texto: 'Elige todas de un jalón. Si se corta, vuelve a elegirlas: las que ya subieron se saltan solas.' },
  { id: 'n9', fecha: '2026-09-25', titulo: 'Insertar: formas, iconos, diseños y transiciones', texto: 'Formas de PowerPoint, más de mil iconos que se buscan en español, diseños armados (número grande, tarjetas, línea de tiempo, pasos…) y transiciones entre láminas. En la vista grande, toca un elemento para moverlo, cambiarle el tamaño o el color.' },
  { id: 'n8', fecha: '2026-09-25', titulo: 'Tus propios elementos', texto: 'Guarda cualquier cosa de una lámina en «Mis elementos» y úsala en otras presentaciones. También puedes dibujar uno con el dedo o pedirle un icono a la IA.' },
  { id: 'n7', fecha: '2026-09-25', titulo: 'Este panel', texto: 'Todo lo que cambias queda aquí con su hora, y puedes volver a antes de cualquier cambio.' },
  { id: 'n6', fecha: '2026-09-25', titulo: 'La IA opina de tu presentación', texto: 'En IA → «Opinión y consejos»: te dice qué funciona, qué mejorar y qué apartados sumar, y «Aplícalo» lo hace.' },
  { id: 'n5', fecha: '2026-09-25', titulo: 'Recuadro de lujo detrás del texto', texto: 'En Texto: cristal, sólido o píldora, con sombra suave. El automático nunca deja el texto sin leerse.' },
  { id: 'n4', fecha: '2026-09-25', titulo: 'Banco de imágenes', texto: 'Sube tus imágenes, la IA escribe qué es cada una y tú marcas si está lista o qué le falta. Se buscan escribiendo.' },
  { id: 'n3', fecha: '2026-09-25', titulo: 'Acomodar', texto: 'Que el texto quepa, fotos sin estirar, márgenes, alinear y tamaños parejos, de un jalón.' },
  { id: 'n2', fecha: '2026-09-25', titulo: 'Imágenes con IA', texto: 'Cambia una imagen en todas las láminas donde sale, búscala en fotos libres o hazla y rehazla con IA.' },
  { id: 'n1', fecha: '2026-09-25', titulo: 'Nace Presentaciones', texto: 'Abre tu PowerPoint y cambia fondo, letra y colores de cien láminas a la vez.' },
];

const leer = () => { try{ return JSON.parse(localStorage.getItem(CLAVE) || '[]'); }catch{ return []; } };
const escribir = (l) => { try{ localStorage.setItem(CLAVE, JSON.stringify(l.slice(-TOPE))); }catch{} };
let lista = leer();
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f());
export const alCambiar = (f) => { oyentes.add(f); return () => oyentes.delete(f); };

/* { texto, tipo: 'bien'|'mal'|''|'cambio', opId?, archivo? } */
export function registrar(e){
  if(!e?.texto) return;
  lista.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cuando: Date.now(), leida: false, ...e });
  if(lista.length > TOPE) lista = lista.slice(-TOPE);
  escribir(lista);
  avisar();
}
export const todas = () => [...lista].reverse();
export function marcarLeidas(){ let c = false; for(const e of lista) if(!e.leida){ e.leida = true; c = true; } if(c){ escribir(lista); avisar(); } }
export function borrarTodo(){ lista = []; escribir(lista); avisar(); }
export const sinLeer = () => lista.filter((e) => !e.leida).length;
export function novedadesSinVer(){
  let vista = ''; try{ vista = localStorage.getItem(CLAVE_NOV) || ''; }catch{}
  const i = NOVEDADES.findIndex((n) => n.id === vista);
  return i < 0 ? NOVEDADES.length : i;
}
export function verNovedades(){ try{ localStorage.setItem(CLAVE_NOV, NOVEDADES[0].id); }catch{} avisar(); }

/* «hace 3 min», «ayer 18:40», «24 sep 10:05» */
export function cuando(t, ahora = Date.now()){
  const s = Math.max(0, Math.round((ahora - t) / 1000));
  if(s < 45) return 'hace un momento';
  if(s < 3600) return `hace ${Math.round(s / 60)} min`;
  const d = new Date(t), hoy = new Date(ahora);
  const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  if(d.toDateString() === hoy.toDateString()) return `hoy ${hora}`;
  const ayer = new Date(ahora - 86400000);
  if(d.toDateString() === ayer.toDateString()) return `ayer ${hora}`;
  return `${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} ${hora}`;
}
export function dia(t, ahora = Date.now()){
  const d = new Date(t), hoy = new Date(ahora), ayer = new Date(ahora - 86400000);
  if(d.toDateString() === hoy.toDateString()) return 'Hoy';
  if(d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}
