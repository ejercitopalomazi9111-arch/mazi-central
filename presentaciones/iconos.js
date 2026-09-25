/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · los iconos
   ──────────────────────────────────────────────────────────────────────────
   Lucide 1.48.0 (licencia ISC, en vendor/LUCIDE-LICENCIA.txt), 1,854 iconos,
   guardados aquí y no pedidos a un servidor ajeno. Pesa ~530 KB (130 KB
   comprimido), así que se baja SÓLO cuando se abre la pestaña de iconos.

   Las etiquetas de Lucide vienen en inglés; Carlos busca en español. El
   diccionario de abajo traduce lo que más se busca en una presentación de
   escuela o de negocio. Lo que no esté, se busca igual en inglés.
   ═════════════════════════════════════════════════════════════════════════ */
let datos = null;
export async function cargar(){
  if(!datos) datos = await (await fetch(new URL('./vendor/lucide-1.48.0.json', import.meta.url))).json();
  return datos;
}
const sinAcentos = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* español → términos en inglés de los nombres y etiquetas de Lucide */
const ES = {
  escuela: 'school graduation book', estudiante: 'graduation student user', alumno: 'graduation student user', maestro: 'presentation teacher user', clase: 'school presentation',
  libro: 'book', libros: 'library book', cuaderno: 'notebook', lapiz: 'pencil', pluma: 'pen', regla: 'ruler', calculadora: 'calculator', mochila: 'backpack',
  ciencia: 'flask atom microscope', quimica: 'flask test-tube beaker', laboratorio: 'flask test-tube microscope', fisica: 'atom magnet', biologia: 'dna leaf microscope', matematicas: 'calculator sigma pi',
  tecnologia: 'cpu laptop smartphone', computadora: 'laptop monitor computer', celular: 'smartphone', telefono: 'phone smartphone', internet: 'globe wifi', wifi: 'wifi', codigo: 'code', programacion: 'code terminal braces',
  robot: 'bot', ia: 'bot brain sparkles', inteligencia: 'brain', idea: 'lightbulb', foco: 'lightbulb', cerebro: 'brain', pensar: 'brain lightbulb',
  dinero: 'dollar banknote coins wallet', pago: 'credit-card banknote', tarjeta: 'credit-card', banco: 'landmark', ahorro: 'piggy-bank', precio: 'tag dollar',
  venta: 'shopping-cart store tag', tienda: 'store shopping-bag', compra: 'shopping-cart shopping-bag', carrito: 'shopping-cart', negocio: 'briefcase store', empresa: 'building briefcase',
  grafica: 'chart bar-chart line-chart pie-chart', estadistica: 'chart trending', crecimiento: 'trending-up', baja: 'trending-down', meta: 'target goal flag', objetivo: 'target crosshair', exito: 'trophy award',
  premio: 'trophy award medal', estrella: 'star', corazon: 'heart', like: 'thumbs-up heart', me: 'thumbs-up',
  comida: 'utensils pizza sandwich', cafeteria: 'coffee utensils', cafe: 'coffee', agua: 'droplet glass-water', fruta: 'apple cherry banana', manzana: 'apple', pizza: 'pizza', hamburguesa: 'sandwich beef', restaurante: 'utensils chef-hat',
  salud: 'heart-pulse stethoscope hospital', doctor: 'stethoscope', hospital: 'hospital', medicina: 'pill syringe', deporte: 'dumbbell bike trophy', futbol: 'volleyball goal', ejercicio: 'dumbbell activity',
  persona: 'user', personas: 'users', gente: 'users', equipo: 'users handshake', familia: 'users baby', nino: 'baby', hombre: 'user', mujer: 'user', amigos: 'users',
  casa: 'house home', hogar: 'house home', ciudad: 'building-2 city', edificio: 'building', mapa: 'map', ubicacion: 'map-pin', lugar: 'map-pin', mundo: 'globe earth', viaje: 'plane luggage',
  auto: 'car', coche: 'car', camion: 'truck', entrega: 'truck package', paquete: 'package box', envio: 'truck send', avion: 'plane', bici: 'bike', autobus: 'bus',
  tiempo: 'clock timer hourglass', reloj: 'clock watch', calendario: 'calendar', fecha: 'calendar', agenda: 'calendar notebook', espera: 'hourglass timer', rapido: 'zap rocket gauge',
  fila: 'list-ordered users', lista: 'list list-checks', tarea: 'list-checks clipboard-check', check: 'check circle-check', palomita: 'check', listo: 'check circle-check', error: 'x circle-x alert',
  alerta: 'alert-triangle bell', aviso: 'bell megaphone', notificacion: 'bell', peligro: 'alert-triangle skull', informacion: 'info', ayuda: 'help-circle life-buoy', pregunta: 'help-circle message-circle-question',
  mensaje: 'message-circle mail', correo: 'mail', chat: 'message-circle messages-square', llamada: 'phone', voz: 'mic', video: 'video', camara: 'camera', foto: 'image camera', musica: 'music', audio: 'volume headphones',
  seguridad: 'shield lock', candado: 'lock', llave: 'key', privacidad: 'eye-off shield', ojo: 'eye', buscar: 'search', lupa: 'search zoom-in',
  energia: 'zap battery', rayo: 'zap', sol: 'sun', luna: 'moon', nube: 'cloud', lluvia: 'cloud-rain', planta: 'leaf sprout', arbol: 'tree trees', ecologia: 'leaf recycle', reciclaje: 'recycle', flor: 'flower',
  fuego: 'flame', agua2: 'waves', mar: 'waves ship', montana: 'mountain', animal: 'dog cat bird', perro: 'dog', gato: 'cat', pajaro: 'bird',
  flecha: 'arrow-right move-right', arriba: 'arrow-up chevron-up', abajo: 'arrow-down chevron-down', izquierda: 'arrow-left', derecha: 'arrow-right', subir: 'upload arrow-up', bajar: 'download arrow-down',
  mas: 'plus', menos: 'minus', cerrar: 'x', configuracion: 'settings cog', ajustes: 'settings sliders', herramienta: 'wrench hammer', herramientas: 'wrench hammer tool', engrane: 'cog settings',
  documento: 'file file-text', archivo: 'file folder', carpeta: 'folder', reporte: 'file-text clipboard', contrato: 'file-signature pen-line', firma: 'signature pen-line', imprimir: 'printer',
  presentacion: 'presentation', pizarron: 'presentation', proyector: 'projector presentation', diapositiva: 'presentation gallery-horizontal',
  inicio: 'house play', fin: 'flag', bandera: 'flag', cohete: 'rocket', lanzamiento: 'rocket', innovacion: 'lightbulb rocket sparkles', magia: 'sparkles wand',
  conexion: 'link network plug', red: 'network share', compartir: 'share', nube2: 'cloud-upload', datos: 'database', base: 'database', servidor: 'server',
  proceso: 'workflow git-branch', pasos: 'footprints list-ordered', ciclo: 'refresh-cw repeat', cambio: 'refresh-cw replace', mejora: 'trending-up sparkles',
  acuerdo: 'handshake', trato: 'handshake', apoyo: 'hand-helping heart-handshake', mano: 'hand', saludo: 'hand', puerta: 'door-open', entrada: 'log-in door-open', salida: 'log-out',
};
export async function buscar(q, max = 90){
  const { iconos, tags } = await cargar();
  const nombres = Object.keys(iconos);
  const palabras = sinAcentos(q).split(/[\s,]+/).filter(Boolean);
  if(!palabras.length) return ['school', 'book-open', 'graduation-cap', 'lightbulb', 'rocket', 'target', 'trophy', 'users', 'chart-column', 'trending-up', 'clock', 'calendar', 'map-pin', 'heart', 'star', 'check', 'shield-check', 'smartphone', 'laptop', 'coffee', 'utensils', 'flask-conical', 'leaf', 'globe']
    .filter((n) => iconos[n]).concat(nombres).filter((n, i, a) => a.indexOf(n) === i).slice(0, max);
  const puntos = new Map();
  for(const p of palabras){
    const terminos = [p, ...(ES[p] || ES[p.replace(/s$/, '')] || '').split(' ').filter(Boolean)];
    for(const n of nombres){
      const etiquetas = `${n.replace(/-/g, ' ')} ${tags[n] || ''}`;
      let mejor = 0;
      for(const t of terminos){
        if(n === t) mejor = Math.max(mejor, 10);
        else if(n.startsWith(t)) mejor = Math.max(mejor, 7);
        else if(n.includes(t)) mejor = Math.max(mejor, 5);
        else if(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(etiquetas)) mejor = Math.max(mejor, 3);
      }
      if(mejor) puntos.set(n, (puntos.get(n) || 0) + mejor);
    }
  }
  return [...puntos.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).slice(0, max).map(([n]) => n);
}
/* El SVG de un icono, del color y grosor pedidos. */
export async function svg(nombre, { color = '#AC27FF', grosor = 2 } = {}){
  const { iconos } = await cargar();
  const cuerpo = iconos[nombre];
  if(!cuerpo) throw new Error('No encontré ese icono.');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round">${cuerpo}</svg>`;
}
/* SVG → PNG (512 px, fondo transparente) para los programas que no leen SVG. */
export async function png(svgTexto, px = 512){
  const url = URL.createObjectURL(new Blob([svgTexto], { type: 'image/svg+xml' }));
  try{
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No se pudo dibujar el icono.')); i.src = url; });
    const cv = document.createElement('canvas'); cv.width = cv.height = px;
    cv.getContext('2d').drawImage(img, 0, 0, px, px);
    const b = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
    return new Uint8Array(await b.arrayBuffer());
  }finally{ URL.revokeObjectURL(url); }
}
export async function archivos(nombre, op){
  const s = await svg(nombre, op);
  return { png: { bytes: await png(s), mime: 'image/png' }, svg: { bytes: new TextEncoder().encode(s) } };
}
