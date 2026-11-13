/* ══════════════════════════════════════════════════════════════════════════
   EXPLICA · la clase que se dibuja mientras se oye (explica.html)
   ──────────────────────────────────────────────────────────────────────────
   1. Paulina (Gemini) o Negro (Groq) escriben la clase como JSON: pasos con lo
      que se DICE («voz») y lo que se DIBUJA («pizarra»), más referencias y repaso.
      Pasa por La Sala (/ia-texto): las llaves viven allá, nunca aquí.
   2. Cada paso se DIBUJA en un pizarrón infinito (lienzo.js): muchos cursores,
      como en esos videos donde cientos de ratones arman una página, trazan cada
      forma línea por línea y escriben cada texto letra por letra. Hay más de 30
      tipos de elemento (tablas, gráficas, Venn, mapas mentales, ciclos, fotos…).
      Carlos, 12 nov: «el lápiz tarda AÑOS», «que lo dibuje TODO forma por forma».
   3. La voz es la del teléfono (inmediata y gratis) o la natural de Gemini
      (/ia-voz, se pide un paso adelante). Si la natural falla, sigue la del teléfono.
   Ligero a propósito: un solo bucle de animación y sólo mientras algo se dibuja,
   nada de librerías, y los pasos ya dichos se quedan quietos (cero trabajo).
   ═════════════════════════════════════════════════════════════════════════ */
import { ico, DIBUJOS } from './iconos-clase.js';
import { crearLienzo, armarFijo, buscarDibujo, TIPOS, ponerFuenteDeFotos } from './lienzo.js';
import { CATALOGO_MAS, normalizarMas, SINONIMOS_MAS, TIPOS_MAS } from './lienzo-mas.js';
import { sacarJSON } from './json-ia.js';
import { crearVoz, paraDecir, todas, nombreDe, despertar, VOZ_DE_FABRICA } from './voces.js';
import { sonar, encender as encenderSonidos } from './sonidos/sonidos.js';
import { llave, ponerLlave, llamar, SERVIDOR, SALA } from '../presentaciones/ia.js';
import { pedirSala, conAcceso } from './acceso.js';
/* las fotos del pizarrón: sólo las verificadas del banco (carpeta «Escuela», marcadas «lista»). Sin foto, sale el dibujo */
ponerFuenteDeFotos(async (buscar) => {
  if(!conAcceso() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null;
  const r = await pedirSala('banco-escuela', { metodo: 'GET', q: '?buscar=' + encodeURIComponent(buscar), espera: 15000 });
  if(!r.ok) return null;
  const f = ((await r.json()).fotos || [])[0]; if(!f) return null;
  let img = await pedirSala('banco-escuela', { metodo: 'GET', q: `?id=${encodeURIComponent(f.id)}&parte=mini`, espera: 20000 });
  if(!img.ok) img = await pedirSala('banco-escuela', { metodo: 'GET', q: `?id=${encodeURIComponent(f.id)}`, espera: 30000 });
  if(!img.ok) return null;
  return { src: URL.createObjectURL(await img.blob()), titulo: f.titulo, credito: 'Foto verificada del banco de CARYMO' };
});
import { leerClase, guardarClase, hayClase } from './clases-guardadas.js';   /* para que la clase abra sin internet (Carlos, 13 nov) */   /* con la llave o con la cuenta de CARYMO (Carlos, 13 nov) */
/* a La Sala directo (no por presentaciones/ia.js#texto) para mandar `espera` y `pensarPoco`: una clase entera tarda */
async function iaTexto(cuerpo){
  const r = await pedirSala('ia-texto', { metodo: 'POST', cuerpo: { ...cuerpo, espera: 150000, pensarPoco: true }, espera: 165000 });
  const j = await r.json().catch(() => ({}));
  if(r.status === 401 || (r.status === 403 && !/no acepta pedidos/.test(j.error || ''))){ const e = new Error('Falta la llave de La Sala en este teléfono (o ya no sirve).'); e.llave = true; throw e; }
  if(!r.ok || j.bien === false) throw new Error(j.error || `La Sala contestó ${r.status}.`);
  return j.texto || '';
}

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const guarda = { leer(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } }, poner(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} } };
const NOMBRE = { gemini: 'Paulina', groq: 'Negro' };

/* ── íconos de los botones ── */
$('#volver').innerHTML = ico('arrow-left'); $('#volver').href = './' + location.search;
if(window.top !== window) $('#volver').hidden = true;   /* dentro de la pestaña de la mesa no hace falta volver */
$('#bNueva').innerHTML = ico('rotate-ccw'); $('#bFoto').insertAdjacentHTML('afterbegin', ico('image-plus'));
$('#bExplica').innerHTML = `${ico('sparkles')} Explícame`; $('#lapizEspera').innerHTML = ico('mouse-pointer-2');
$('#bSeguir').innerHTML = `${ico('locate-fixed')}Seguir la clase`; $('#bTodo').innerHTML = `${ico('maximize')}Ver todo`; $('#bApuntes').innerHTML = `${ico('notebook-text')}Apuntes`;
$('#bImprimir').innerHTML = `${ico('printer')}Imprimir o guardar PDF`; $('#bVolverClase').innerHTML = `${ico('arrow-left')}Al pizarrón`;
$('#bDicho').innerHTML = `${ico('list-ordered')}Lo dicho`; $('#bVolverDicho').innerHTML = `${ico('arrow-left')}Al pizarrón`; $('#bApuntesDicho').innerHTML = `${ico('notebook-text')}Apuntes`;
$('#bAtras').innerHTML = ico('skip-back'); $('#bSig').innerHTML = ico('skip-forward'); $('#bPreg').innerHTML = ico('circle-question-mark');
$('#fPreg button').innerHTML = ico('send');

/* ══ 1 · PEDIR LA CLASE ═════════════════════════════════════════════════════ */
const LARGO = { corta: '6 a 9', normal: '12 a 16', fondo: '13 a 15' };
/* cuánto se dice en cada paso: «a fondo» explica el mecanismo, no sólo el qué */
const VOZ = {
  corta: 'de 2 a 3 frases (entre 30 y 60 palabras)',
  normal: 'de 3 a 5 frases (entre 50 y 90 palabras)',
  fondo: 'de 5 a 7 frases (entre 90 y 150 palabras): el qué, el CÓMO funciona por dentro (el mecanismo, paso a paso), el porqué, un ejemplo concreto con datos o un caso real, y cómo se conecta con lo anterior o un error común',
};
const NIVEL = { prepa: 'de preparatoria', uni: 'de universidad', facil: 'muy sencillo, como para alguien que nunca lo ha visto' };
const FORMA = `{
 "titulo": "título corto de la clase",
 "visual": true,
 "pasos": [
  { "voz": "lo que dices en voz alta en este paso", "pizarra": { "tipo": "titulo", "texto": "…", "sub": "…", "icono": "atom" } },
  { "voz": "…", "pizarra": { "tipo": "…", "…": "los campos de ese tipo", "conecta": false } },
  { "voz": "sólo hablas en este paso", "pizarra": null }
 ],
 "referencias": [{ "titulo": "…", "autor": "…", "anio": "…", "tipo": "libro | artículo | sitio | Wikipedia" }],
 "repaso": [{ "pregunta": "…", "respuesta": "…" }]
}`;
const CATALOGO = `TIPOS DE "pizarra" (cada uno con sus campos):
- titulo { texto, sub, icono } · abre una sección nueva a todo lo ancho del pizarrón
- texto { texto, icono } · una idea en 1 a 3 frases
- lista { titulo, items: [], estilo: "puntos" | "numeros" | "checks" | "flechas" }
- definicion { termino, texto, icono }
- formula { expresion, texto, variables: [{ simbolo, significado }] }
- ejemplo { titulo, pasos: [], resultado } · un ejercicio resuelto paso a paso
- cita { texto, autor } · sólo citas reales y conocidas
- nota { titulo, texto } · un recordatorio tipo post-it
- ojo { titulo, texto } · un error común o una advertencia
- dato { numero, texto } · una cifra que impacte (sólo si es real)
- pregunta { pregunta, respuesta } · para que el alumno piense antes de ver la respuesta
- resumen { titulo, puntos: [] }
- codigo { lenguaje, codigo } · sólo en temas de programación
- imagen { buscar, pie, icono } · una FOTO verificada del banco de la escuela: "buscar" son 1 a 3 palabras de lo que muestra (ej. "corazón humano", "célula animal"). Sólo sale si una persona ya revisó esa foto; si no hay, se dibuja "icono" (un nombre de la lista de DIBUJOS), así que pon SIEMPRE un icono que sirva
- icono { icono, texto } · un dibujo grande
- partes { icono, titulo, partes: [] } · un dibujo con sus partes señaladas
- comparar { titulo, a: { nombre, puntos: [] }, b: { nombre, puntos: [] } }
- pasos { titulo, pasos: [{ titulo, texto }] } · un proceso en orden
- linea { titulo, eventos: [{ fecha, texto }] } · línea del tiempo
- tabla { titulo, columnas: [], filas: [[]] }
- diagrama { titulo, nodos: [{ id, texto }], flechas: [{ de, a, texto }] } · flujo o mapa conceptual (máx 8 nodos de 1 a 4 palabras)
- venn { titulo, conjuntos: [{ nombre, puntos: [] }], centro, comun: [] } · 2 o 3 círculos para UNIR temas: "centro" es lo que nace de juntarlos
- mapa { centro, ramas: [{ texto, hijos: [] }] } · mapa mental de 3 a 6 ramas
- ciclo { titulo, etapas: [], centro } · algo que se repite, de 3 a 6 etapas
- piramide { titulo, niveles: [] } · de la punta a la base
- embudo { titulo, niveles: [] } · de lo general a lo particular
- arbol { titulo, raiz, hijos: [{ texto, hijos: [] }] } · clasificación o jerarquía
- causas { titulo, efecto, causas: [] }
- matriz { titulo, ejeX, ejeY, cuadrantes: ["arriba izquierda", "arriba derecha", "abajo izquierda", "abajo derecha"] }
- escala { titulo, izquierda, derecha, marcas: [{ texto, pos }] } · pos de 0 a 100
- barras { titulo, unidad, datos: [{ etiqueta, valor }] } · SÓLO con datos reales que conozcas bien
- lineas { titulo, ejeY, puntos: [{ x, y }] } · una tendencia, SÓLO con datos reales
- pastel { titulo, datos: [{ etiqueta, valor }] } · partes de un todo, SÓLO con datos reales
${CATALOGO_MAS}
DIBUJOS que existen para "icono" (escribe el nombre tal cual): ${Object.keys(DIBUJOS).join(', ')}`;
/* lo que Estudio (u otro) dice del alumno, para que la clase sea SUYA */
const CONTEXTO = new URLSearchParams(location.search).get('contexto') || '';
/* ── EL NOMBRE DE QUIEN ESTUDIA ──
   Carlos, 13 nov: «a todos les dice Carlos en el pizarrón… no todos son Carlos, sólo yo». La instrucción
   decía «la maestra particular de Carlos», y además las clases se guardan en la biblioteca para que
   las reuse el siguiente: una clase hecha para Carlos le llegaba a otro con «Carlos» adentro.
   Ahora la IA escribe {nombre} donde le hablaría por su nombre; se guarda así en la biblioteca y se
   cambia por el nombre de quien la está viendo al pintarla y al decirla. El nombre sale del link
   (?nombre=, lo manda CARYMO), del perfil de CARYMO o de cómo entró a La Sala, en ese orden. */
export function nombreAlumno(){
  const limpio = (x) => String(x || '').replace(/[{}<>]/g, '').trim().split(/\s+/)[0].slice(0, 24);
  const vale = (x) => limpio(x) && !/^t[uú]$/i.test(limpio(x));
  const q = new URLSearchParams(location.search).get('nombre'); if(vale(q)) return limpio(q);
  try{ const p = JSON.parse(localStorage.getItem('est.perfil') || 'null'); if(p && limpio(p.nombre) && !/^t[uú]$/i.test(limpio(p.nombre))) return limpio(p.nombre); }catch{}
  try{ const s = JSON.parse(localStorage.getItem('sala') || 'null'); if(s && limpio(s.nombre)) return limpio(s.nombre); }catch{}
  return '';
}
/* cambia {nombre} en todos los textos de una clase; sin nombre, quita el vocativo con todo y su coma */
export function conNombre(x, nombre = nombreAlumno()){
  const poner = (t) => nombre ? t.replace(/\{nombre\}/g, nombre)
    : t.replace(/,\s*\{nombre\}\s*,/g, ',').replace(/(^|[.!?¿¡]\s*)\{nombre\}\s*,\s*(\S)/g, (m, a, c) => a + c.toUpperCase())
        .replace(/,\s*\{nombre\}(?=\s*[.!?])/g, '').replace(/\s*\{nombre\}\s*/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
  if(typeof x === 'string') return poner(x);
  if(Array.isArray(x)) return x.map((y) => conNombre(y, nombre));
  if(x && typeof x === 'object'){ const o = {}; for(const [k, v] of Object.entries(x)) o[k] = conNombre(v, nombre); return o; }
  return x;
}
/* lo guardado antes de esto trae «Carlos» escrito: se vuelve {nombre} al sacarlo de la biblioteca
   (no se tocan «Carlos V», «Carlos Marx», etc.: sólo el Carlos suelto) */
export const sinCarlos = (x) => typeof x === 'string' ? x.replace(/\bCarlos\b(?!\s+(?:[IVX]+\b|[A-ZÁÉÍÓÚ][a-záéíóú]))/g, '{nombre}')
  : Array.isArray(x) ? x.map(sinCarlos) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, sinCarlos(v)])) : x;
/* y al revés, para guardarla en la biblioteca: el nombre de quien la vio vuelve a ser {nombre} */
export function aPlantilla(x, nombre = nombreAlumno()){
  if(!nombre) return x;
  const re = new RegExp('(^|[^\\p{L}])' + nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}])', 'gu');
  const f = (t) => t.replace(re, '$1{nombre}');
  return typeof x === 'string' ? f(x) : Array.isArray(x) ? x.map((y) => aPlantilla(y, nombre)) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, aPlantilla(v, nombre)])) : x;
}
const normalizarConNombre = (x) => conNombre(normalizar(x));
function sistema(motor, nivel, largo){
  return `Eres ${NOMBRE[motor]}, maestra particular de un estudiante de prepa (Querétaro, México). Cuando le hables por su nombre (pocas veces, como lo haría una maestra), escribe exactamente {nombre}: la app lo cambia por el nombre de quien te está viendo. Nunca inventes ni escribas otro nombre para el alumno. Explicas en español de México, claro, cercano y sin relleno, con ejemplos de la vida diaria de un estudiante de prepa en México.
Vas a dar una CLASE que se DIBUJA en un pizarrón infinito mientras hablas: varios cursores dibujan cada elemento, forma por forma y letra por letra.
Contesta SÓLO con JSON válido, sin texto antes ni después, con esta forma:
${FORMA}
${CATALOGO}
Reglas:
- ${LARGO[largo]} pasos, nivel ${NIVEL[nivel]}. El PRIMER paso es un "titulo".
- "voz": ${VOZ[largo]} que EXPLIQUEN de verdad: el porqué, un ejemplo o un truco para recordarlo.${largo === 'fondo' ? ' A FONDO quiere decir PROFUNDO, no largo de relleno: términos técnicos bien explicados, mecanismos, excepciones, matices, datos concretos y casos. Los elementos del pizarrón también más completos (listas de 5 a 7, tablas de 4 a 6 filas, diagramas con más nodos).' : ''} Nunca sólo anuncies lo que viene. Como lo dirías hablando: sin markdown, sin emojis y sin leer la pizarra palabra por palabra; la complementas.
- "pizarra": lo que se dibuja en ese paso. USA MUCHOS TIPOS DISTINTOS: al menos 6 tipos diferentes en la clase, y no repitas el mismo tipo dos pasos seguidos. Elige el que MEJOR enseñe cada idea: si se comparan cosas, "comparar" o "tabla"; si se juntan temas, "venn"; si es un proceso, "pasos" o "ciclo"; si son partes de algo, "partes"; si hay jerarquía, "arbol" o "piramide"; si hay fechas, "linea"; si hay causas, "causas" o "diagrama".
- "visual": true si el tema se entiende mejor con dibujos y diagramas; entonces usa más diagramas, dibujos y fotos, y menos texto suelto.
- Usa "icono" seguido (en titulo, texto, definicion, icono y partes): sólo nombres de la lista de DIBUJOS. Usa a lo mucho 1 "imagen" si el tema tiene algo que se pueda ver en una foto, siempre con su "icono" de respaldo.
- "conecta": true cuando un elemento sigue directamente del anterior (se dibuja una flecha entre los dos).
- En los textos: **así** pinta con marcatextos lo más importante (máximo 3 por elemento), __así__ subraya y ((así)) encierra en un círculo una palabra clave (máximo 1 por elemento). Textos cortos: el pizarrón no es un libro.
- NUNCA inventes datos, cifras ni citas: si no estás segura, usa otro tipo de elemento.
- "referencias": de 3 a 6 fuentes REALES y conocidas (libros de texto, instituciones, artículos de Wikipedia por su título exacto). Si no estás segura de que existe, NO la pongas. Nunca inventes direcciones web.
- "repaso": de 3 a 5 preguntas con su respuesta corta.
- Si te mandan fotos de apuntes, explica lo que dicen las fotos y corrige con cuidado si algo está mal.${CONTEXTO ? `\nLO QUE SABES DE ESTE ALUMNO (personaliza la clase con esto): ${CONTEXTO.slice(0, 1200)}` : ''}`;
}
/* la clase se pide; si llega mal escrita se repara (json-ia.js) y, si ni así, se pide una vez más */
async function pedirJSON(cuerpo, revisar){
  let error = null;
  for(let intento = 0; intento < 2; intento++){
    const extra = intento ? '\n\nOJO: tu respuesta anterior no era JSON válido o venía incompleta. Contesta SÓLO el JSON, completo, con comillas dobles y sin comas de más.' : '';
    const t = await iaTexto({ ...cuerpo, sistema: cuerpo.sistema + extra });
    try{ return revisar(sacarJSON(t)); }catch(e){ error = e; }
  }
  throw new Error((error && error.message ? error.message + ' ' : '') + 'Prueba otra vez.');
}
const SINONIMOS = { title: 'titulo', text: 'texto', parrafo: 'texto', list: 'lista', timeline: 'linea', 'linea de tiempo': 'linea', lineatiempo: 'linea', cronologia: 'linea',
  diagram: 'diagrama', esquema: 'diagrama', flujo: 'diagrama', 'mapa conceptual': 'diagrama', table: 'tabla', compare: 'comparar', comparacion: 'comparar', definition: 'definicion', quote: 'cita',
  'mapa mental': 'mapa', mindmap: 'mapa', grafica: 'barras', 'grafica de barras': 'barras', bar: 'barras', 'grafica de lineas': 'lineas', line: 'lineas', pie: 'pastel', 'grafica de pastel': 'pastel', dona: 'pastel',
  circulos: 'venn', union: 'venn', interseccion: 'venn', proceso: 'pasos', etapas: 'pasos', jerarquia: 'arbol', clasificacion: 'arbol', advertencia: 'ojo', error: 'ojo', cuidado: 'ojo',
  'post-it': 'nota', recordatorio: 'nota', estadistica: 'dato', cifra: 'dato', foto: 'imagen', image: 'imagen', dibujo: 'icono', icon: 'icono', cuadrantes: 'matriz', espectro: 'escala', fishbone: 'causas', code: 'codigo', ejercicio: 'ejemplo' };
const corta = (t, n) => String(t ?? '').trim().slice(0, n);
const lista = (x, n, m) => (Array.isArray(x) ? x : []).map((y) => corta(typeof y === 'string' || typeof y === 'number' ? y : y && (y.texto || y.item || y.nombre), n)).filter(Boolean).slice(0, m);
const num = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null; };
/* lo que manda la IA se revisa campo por campo: un elemento roto se vuelve texto, nunca truena la clase */
export function normalizarPizarra(p){
  if(!p || typeof p !== 'object') return null;
  const z = { ...p };
  let tipo = String(z.tipo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  tipo = SINONIMOS[tipo] || SINONIMOS_MAS[tipo] || SINONIMOS_MAS[tipo.replace(/\s+/g, '')] || tipo;
  z.tipo = TIPOS.includes(tipo) ? tipo : 'texto';
  for(const k of ['texto', 'titulo', 'sub', 'termino', 'expresion', 'autor', 'pie', 'numero', 'resultado', 'pregunta', 'respuesta', 'centro', 'efecto', 'raiz', 'ejeX', 'ejeY', 'izquierda', 'derecha', 'unidad', 'lenguaje', 'buscar'])
    if(z[k] != null && typeof z[k] !== 'object') z[k] = corta(z[k], k === 'texto' || k === 'respuesta' ? 600 : 160);   /* la balanza trae izquierda/derecha como objetos */
  if(z.icono) z.icono = buscarDibujo(z.icono) || '';
  z.conecta = !!z.conecta;
  const vacio = () => null;
  switch(z.tipo){
    case 'texto': if(!z.texto) z.texto = z.titulo || ''; if(!z.texto) return vacio(); break;
    case 'titulo': if(!z.texto) z.texto = z.titulo || 'Tema'; break;
    case 'lista': z.items = lista(z.items || z.puntos, 220, 8); if(!z.items.length) return vacio(); if(!['puntos', 'numeros', 'checks', 'flechas'].includes(z.estilo)) z.estilo = z.numerada ? 'numeros' : 'puntos'; break;
    case 'definicion': if(!z.texto) return vacio(); break;
    case 'formula': if(!z.expresion) return vacio(); z.variables = (Array.isArray(z.variables) ? z.variables : []).map((v) => ({ simbolo: corta(v && v.simbolo, 16), significado: corta(v && v.significado, 120) })).filter((v) => v.simbolo && v.significado).slice(0, 6); break;
    case 'ejemplo': z.pasos = lista(z.pasos, 220, 7); if(!z.pasos.length) return vacio(); break;
    case 'cita': case 'nota': case 'ojo': if(!z.texto) return vacio(); break;
    case 'dato': if(!z.numero) return vacio(); break;
    case 'pregunta': if(!z.pregunta || !z.respuesta) return vacio(); break;
    case 'resumen': z.puntos = lista(z.puntos || z.items, 200, 6); if(!z.puntos.length) return vacio(); break;
    case 'codigo': z.codigo = String(z.codigo || '').slice(0, 1500); if(!z.codigo) return vacio(); break;
    case 'imagen': if(!z.buscar) return vacio(); break;
    case 'icono': if(!z.icono) return z.texto ? { tipo: 'texto', texto: z.texto, conecta: z.conecta } : vacio(); break;
    case 'partes': z.partes = lista(z.partes, 60, 8); if(!z.icono || z.partes.length < 2) return z.partes.length ? { tipo: 'lista', titulo: z.titulo, items: z.partes, estilo: 'flechas' } : vacio(); break;
    case 'comparar': for(const k of ['a', 'b']) z[k] = { nombre: corta(z[k] && z[k].nombre, 40) || (k === 'a' ? 'A' : 'B'), puntos: lista(z[k] && z[k].puntos, 140, 6) }; if(!z.a.puntos.length && !z.b.puntos.length) return vacio(); break;
    case 'pasos': z.pasos = (Array.isArray(z.pasos) ? z.pasos : []).map((x) => typeof x === 'string' ? { titulo: corta(x, 120), texto: '' } : { titulo: corta(x && x.titulo, 120), texto: corta(x && x.texto, 220) }).filter((x) => x.titulo).slice(0, 7); if(z.pasos.length < 2) return vacio(); break;
    case 'linea': z.eventos = (Array.isArray(z.eventos) ? z.eventos : []).map((e) => ({ fecha: corta(e && e.fecha, 30), texto: corta(e && e.texto, 220) })).filter((e) => e.fecha || e.texto).slice(0, 10); if(!z.eventos.length) return vacio(); break;
    case 'tabla': z.columnas = lista(z.columnas, 40, 5); z.filas = (Array.isArray(z.filas) ? z.filas : []).filter(Array.isArray).map((f) => f.slice(0, 5).map((c) => corta(c, 120))).slice(0, 10); if(!z.filas.length) return vacio(); break;
    case 'diagrama': z.nodos = (Array.isArray(z.nodos) ? z.nodos : []).map((n, i) => ({ id: String(n && n.id != null ? n.id : i), texto: corta(n && (n.texto || n.nombre), 60) })).filter((n) => n.texto).slice(0, 10);
      { const ids = new Set(z.nodos.map((n) => n.id)); z.flechas = (Array.isArray(z.flechas) ? z.flechas : []).map((f) => ({ de: String(f && f.de), a: String(f && f.a), texto: corta(f && f.texto, 24) })).filter((f) => ids.has(f.de) && ids.has(f.a) && f.de !== f.a).slice(0, 14); }
      if(z.nodos.length < 2) return vacio(); break;
    case 'venn': z.conjuntos = (Array.isArray(z.conjuntos) ? z.conjuntos : []).map((c) => ({ nombre: corta(c && c.nombre, 30), puntos: lista(c && c.puntos, 60, 3) })).filter((c) => c.nombre).slice(0, 3); z.comun = lista(z.comun, 60, 3); if(z.conjuntos.length < 2) return vacio(); break;
    case 'mapa': z.centro = z.centro || z.titulo; z.ramas = (Array.isArray(z.ramas) ? z.ramas : []).map((r) => typeof r === 'string' ? { texto: corta(r, 60), hijos: [] } : { texto: corta(r && r.texto, 60), hijos: lista(r && r.hijos, 50, 4) }).filter((r) => r.texto).slice(0, 6); if(!z.centro || z.ramas.length < 2) return vacio(); break;
    case 'ciclo': z.etapas = lista(z.etapas, 60, 7); if(z.etapas.length < 3) return vacio(); break;
    case 'piramide': case 'embudo': z.niveles = lista(z.niveles, 70, 7); if(z.niveles.length < 2) return vacio(); break;
    case 'arbol': z.raiz = z.raiz || z.titulo; z.hijos = (Array.isArray(z.hijos) ? z.hijos : []).map((h) => typeof h === 'string' ? { texto: corta(h, 60), hijos: [] } : { texto: corta(h && h.texto, 60), hijos: lista(h && h.hijos, 50, 5) }).filter((h) => h.texto).slice(0, 5); if(!z.raiz || !z.hijos.length) return vacio(); break;
    case 'causas': z.causas = lista(z.causas, 70, 8); if(!z.efecto || !z.causas.length) return vacio(); break;
    case 'matriz': z.cuadrantes = lista(z.cuadrantes, 90, 4); if(z.cuadrantes.length < 4) return vacio(); break;
    case 'escala': z.marcas = (Array.isArray(z.marcas) ? z.marcas : []).map((m) => ({ texto: corta(m && m.texto, 50), pos: Math.max(0, Math.min(100, num(m && m.pos) ?? 50)) })).filter((m) => m.texto).slice(0, 6); if(!z.izquierda || !z.derecha) return vacio(); break;
    case 'barras': case 'pastel': z.datos = (Array.isArray(z.datos) ? z.datos : []).map((d) => ({ etiqueta: corta(d && d.etiqueta, 30), valor: num(d && d.valor) })).filter((d) => d.etiqueta && d.valor != null && d.valor >= 0).slice(0, z.tipo === 'pastel' ? 8 : 10); if(z.datos.length < 2) return vacio(); break;
    case 'lineas': z.puntos = (Array.isArray(z.puntos) ? z.puntos : []).map((d) => ({ x: corta(d && d.x, 14), y: num(d && d.y) })).filter((d) => d.x && d.y != null).slice(0, 14); if(z.puntos.length < 2) return vacio(); break;
  }
  /* los 50 de lienzo-mas.js se revisan allá */
  if(TIPOS_MAS.includes(z.tipo)) return normalizarMas(z);
  return z;
}
export function normalizar(j){
  const pasos = (Array.isArray(j.pasos) ? j.pasos : []).map((p) => {
    const voz = corta(p && p.voz, 600);
    const z = normalizarPizarra(p && p.pizarra);
    const pregunta = corta(p && p.pregunta, 300);
    return voz || z ? { voz, pizarra: z, ...(pregunta ? { pregunta } : {}) } : null;
  }).filter(Boolean).slice(0, 48);
  if(!pasos.length) throw new Error('La clase llegó vacía. Prueba otra vez.');
  return {
    titulo: corta(j.titulo, 120) || 'Tu clase', visual: !!j.visual,
    pasos,
    referencias: (Array.isArray(j.referencias) ? j.referencias : []).map((r) => typeof r === 'string' ? { titulo: corta(r, 200) } : { titulo: corta(r && r.titulo, 200), autor: corta(r && r.autor, 120), anio: corta(r && (r.anio || r.año), 12), tipo: corta(r && r.tipo, 30) }).filter((r) => r.titulo).slice(0, 8),
    repaso: (Array.isArray(j.repaso) ? j.repaso : []).map((r) => ({ pregunta: corta(r && r.pregunta, 300), respuesta: corta(r && r.respuesta, 500) })).filter((r) => r.pregunta).slice(0, 6),
  };
}

/* ══ 2 · EL PIZARRÓN INFINITO (lienzo.js) ═══════════════════════════════════
   Muchos cursores dibujan cada elemento, forma por forma y letra por letra. */
let modoCursores = guarda.leer('explica.cursores', 'monton');
const tablero = $('#tablero');
let conSonidos = guarda.leer('explica.sonidos', true); encenderSonidos(conSonidos);
/* los cursores «dan clic» apenas audible y cada elemento terminado hace un pop suave: la voz va al frente */
const lienzo = crearLienzo(tablero, { modo: modoCursores, maestro: 'Negro',
  alClic: () => sonar('toque', { vol: .07, cada: 90, tono: .9 + Math.random() * .25 }),
  alTerminar: () => sonar('pop', { vol: .22, cada: 200 }) });
function margenes(){ const m = $('#mando'); lienzo.margenes(6, m.hidden ? 0 : m.offsetHeight + 6); }
new ResizeObserver(margenes).observe($('#mando'));
tablero.addEventListener('camara-libre', () => { $('#bSeguir').hidden = false; });

/* ══ 3 · LA VOZ (sala/voces.js) ═════════════════════════════════════════════
   La voz se elige (perfil de CARYMO o el menú de aquí): voces de estudio de la nube,
   Google o las del teléfono. Lo que se lee pasa por `paraDecir`: JAMÁS una instrucción. */
let velocidad = guarda.leer('explica.vel', 1);
const VIEJAS = { tel: 'tel:', natural: 'google:Kore' };
let vozElegida = guarda.leer('explica.voz', VOZ_DE_FABRICA); if(VIEJAS[vozElegida]) vozElegida = VIEJAS[vozElegida];
let callada = vozElegida === 'no'; if(callada) vozElegida = guarda.leer('explica.vozAntes', VOZ_DE_FABRICA);
const decible = paraDecir;
const voz = crearVoz({
  pedir: async (cuerpo) => { const r = await pedirSala('ia-voz', { metodo: 'POST', cuerpo, espera: 60000 }); return r.json().catch(() => ({})); },
  alFallar: (e) => aviso(`La voz «${nombreDe(vozElegida)}» no contestó; sigo con la del teléfono. (${e.message})`),
});
voz.velocidad = velocidad;
const vozActiva = () => callada ? 'no' : vozElegida;
function pedirNatural(i){ if(clase && clase.pasos[i] && clase.pasos[i].voz) voz.precargar(clase.pasos[i].voz, vozActiva()); }
function callar(){ voz.callar(); }
function pintarVoces(){
  const sel = $('#vozSel'); if(!sel) return;
  const grupos = {}; for(const v of todas()) (grupos[v.grupo] ||= []).push(v);
  sel.innerHTML = Object.entries(grupos).map(([g, vs]) => `<optgroup label="${esc(g)}">${vs.map((v) => `<option value="${esc(v.id)}">${esc(v.nombre)} · ${esc(v.desc)}</option>`).join('')}</optgroup>`).join('') + '<option value="no">Sin voz</option>';
  sel.value = vozActiva();
}

/* ══ 4 · LA CLASE EN PANTALLA ═══════════════════════════════════════════════ */
let clase = null, actual = -1, sonando = false, turno = 0;
const ver = (cual) => {
  $('#vInicio').hidden = cual !== 'inicio'; $('#vPrepara').hidden = cual !== 'prepara'; $('#vClase').hidden = cual !== 'clase'; $('#vApuntes').hidden = cual !== 'apuntes';
  $('#vDicho').hidden = cual !== 'dicho';
  $('#mando').hidden = cual !== 'clase'; $('#bNueva').hidden = cual !== 'clase' && cual !== 'apuntes' && cual !== 'dicho';
  document.body.classList.toggle('en-clase', cual === 'clase');
  if(cual === 'clase') requestAnimationFrame(margenes);
};
const segundos = (t) => Math.min(70, Math.max(2.2, String(t || '').split(/\s+/).length * .38 / velocidad));
/* los subtítulos estorbaban (Carlos, 13 nov): vienen apagados; «CC» los prende. Los avisos sí salen, un rato */
let conSubs = guarda.leer('explica.subs', false), quitaAviso = 0;
function sub(t, hasta){ if(conSubs) pintarSub(t, hasta); }
function avisoSub(t){ pintarSub(t, Infinity); if(!conSubs){ clearTimeout(quitaAviso); quitaAviso = setTimeout(() => { if(!conSubs) $('#subVoz').hidden = true; }, 4500); } }
/* ── LOS SUBTÍTULOS, COMO SUBTÍTULOS ──
   Carlos, 13 nov: «los subtítulos están rotos en PC». Se ponía el párrafo ENTERO en una caja de dos
   renglones que nunca se recorría: la palabra que se estaba diciendo se quedaba escondida abajo y el
   segundo renglón salía cortado. Ahora se parte en frases cortas (máx. ~90 letras, cortando en punto o
   coma) y sólo se enseña la que va, con la palabra de ahorita marcada. */
function frasesSub(t){
  const txt = String(t || '').replace(/\s+/g, ' ').trim(), out = []; let i = 0;
  while(i < txt.length){
    let fin = Math.min(txt.length, i + 90);
    if(fin < txt.length){
      const tramo = txt.slice(i, fin);
      const corte = Math.max(tramo.lastIndexOf('. '), tramo.lastIndexOf('? '), tramo.lastIndexOf('! '), tramo.lastIndexOf(': '), tramo.lastIndexOf('; '));
      const coma = tramo.lastIndexOf(', '), esp = tramo.lastIndexOf(' ');
      fin = i + (corte > 35 ? corte + 1 : coma > 45 ? coma + 1 : esp > 20 ? esp : tramo.length);
    }
    out.push({ ini: i, fin, texto: txt.slice(i, fin).trim() }); i = fin; while(txt[i] === ' ') i++;
  }
  return { txt, out };
}
function pintarSub(t, hasta){
  const el = $('#subVoz'); el.hidden = false;
  const { txt, out } = frasesSub(t); if(!out.length){ el.textContent = ''; return; }
  const h = hasta === Infinity ? txt.length : Math.max(0, Math.round(hasta * txt.length / Math.max(1, String(t || '').length)));
  const f = out.find((x) => h < x.fin) || out[out.length - 1];
  if(el.dataset.f !== String(f.ini)){ el.dataset.f = String(f.ini); el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra'); }
  let n = f.ini;
  el.innerHTML = f.texto.split(/(\s+)/).map((w) => { const i = n; n += w.length; return /^\s+$/.test(w) ? w : `<span class="${i + w.length <= h ? 'ya' : i <= h ? 'ahora' : ''}">${esc(w)}</span>`; }).join('');
}
function botonPlay(){ $('#bPlay').innerHTML = ico(sonando ? 'pause' : 'play'); $('#bVoz').innerHTML = ico(callada ? 'volume-x' : 'volume-2'); $('#bVoz').title = callada ? 'Sin voz' : 'Voz: ' + nombreDe(vozElegida); $('#bVel').textContent = velocidad + '×';
  $('#bSub').textContent = 'CC'; $('#bSub').setAttribute('aria-pressed', String(conSubs)); $('#bSub').style.opacity = conSubs ? 1 : .55; $('#bSub').style.textDecoration = conSubs ? 'none' : 'line-through'; $('#subVoz').hidden = !conSubs; }

/* lo de antes, dibujado completo y quieto; lo de este paso en adelante, fuera */
function asegurarHasta(i){
  lienzo.detener();
  lienzo.quitarDesde(i);
  for(let k = 0; k < i; k++){
    const z = clase.pasos[k].pizarra;
    if(z && !lienzo.piezas.some((p) => p.n === k)) lienzo.dibujarYa(lienzo.poner(z, k));
  }
}
async function reproducir(i){
  if(!clase) return;
  const yo = ++turno; callar();
  i = Math.max(0, Math.min(clase.pasos.length - 1, i)); actual = i;
  asegurarHasta(i);
  $('#bTodo').hidden = true;
  const paso = clase.pasos[i];
  $('#avance').style.width = ((i + 1) / clase.pasos.length * 100) + '%';
  sub(paso.voz, -1);
  let p = null;
  if(paso.pizarra){ p = lienzo.poner(paso.pizarra, i); lienzo.enfocar(p); }
  if(!sonando){ if(p) lienzo.dibujarYa(p); sub(paso.voz, Infinity); return; }
  const dur = segundos(paso.voz) * 1000;
  pedirNatural(i); pedirNatural(i + 1); pedirNatural(i + 2);
  const inicio = performance.now();
  const subTimer = conSubs ? setInterval(() => { if(yo !== turno){ clearInterval(subTimer); return; } sub(paso.voz, paso.voz.length * Math.min(1, (performance.now() - inicio) / dur)); }, 160) : 0;
  const hablando = (async () => {
    if(vozActiva() === 'no' || !decible(paso.voz)){ await new Promise((r) => setTimeout(r, dur)); return; }
    await Promise.race([voz.decir(paso.voz, vozActiva()), new Promise((r) => setTimeout(r, dur * 2.2 + 8000))]);
  })();
  /* el dibujo acaba antes que la voz: lo que se dice ya está en el pizarrón.
     QUITADO (Carlos, 13 nov): el cursor con el círculo que iba «señalando» lo dibujado mientras la voz
     seguía (lienzo.recorrer). «Se ve horrible, estorba y ni siquiera sigue lo que dice la voz.» Al
     terminar de dibujar, el cursor se va de la pantalla y deja ver la pieza en paz. */
  const dibujo = p ? lienzo.dibujar(p, dur * .78) : Promise.resolve();
  await Promise.all([hablando, dibujo]); clearInterval(subTimer);
  if(yo !== turno) return;
  sub(paso.voz, Infinity);
  await new Promise((r) => setTimeout(r, 320));
  if(yo !== turno || !sonando) return;
  if(i >= clase.pasos.length - 1 && clase.pendiente){
    /* la clase a fondo se escribe en dos partes: si la segunda no ha llegado, se espera aquí */
    avisoSub('Un momento: estoy armando la segunda parte de la clase…');
    await clase.pendiente;
    if(yo !== turno || !sonando) return;
  }
  if(i < clase.pasos.length - 1) reproducir(i + 1);
  else { sonando = false; botonPlay(); terminada = true; pintarFinal(); }
}
function pintarFinal(){
  /* si la abrió un nodo del camino de Estudio (estudio.html), se le avisa que la clase ya se vio completa */
  if(window.top !== window) try{ parent.postMessage({ explica: 'fin', titulo: clase.titulo }, location.origin); }catch{}
  $('#bSeguir').hidden = true; $('#bTodo').hidden = false;
  pintarSub('Listo. Mueve el pizarrón con el dedo, toca dos veces algo para acercarte, o abre tus apuntes.', Infinity);
}

/* ══ 4-ter · TODO LO QUE SE DIJO (Carlos: «un apartado donde pueda leer todo lo dicho en lista, también las preguntas») ══ */
function abrirDicho(){
  if(!clase) return;
  sonando = false; turno++; callar(); lienzo.detener(); botonPlay();
  ver('dicho'); scrollTo({ top: 0 });
  let n = 0;
  const filas = clase.pasos.map((p) => {
    if(p.pregunta) return `<li class="preg-dicho"><small>Tu pregunta</small>${esc(p.pregunta)}</li>`;
    if(!p.voz) return '';
    n++;
    const z = p.pizarra, sec = z && z.tipo === 'titulo' ? `<b class="sec-dicho">${esc(limpioTxt(z.texto))}</b>` : '';
    return `${sec}<li><span class="num-dicho">${n}</span><p>${esc(p.voz)}</p></li>`;
  }).join('');
  $('#hojaDicho').innerHTML = `<header class="portada-ap"><small>Todo lo que se dijo · ${esc(FECHA(clase.fecha))}</small><h1>${esc(clase.titulo)}</h1><p>${n} cosas explicadas${clase.pasos.some((p) => p.pregunta) ? ` · ${clase.pasos.filter((p) => p.pregunta).length} preguntas tuyas` : ''}${clase.pendiente ? ' · la segunda parte todavía se está escribiendo' : ''}</p></header>
    <ol class="lista-dicho">${filas}</ol>
    ${clase.repaso.length ? `<section class="fin-ap"><h2>Preguntas de repaso</h2><div class="repaso-ap">${clase.repaso.map((r, i) => `<details><summary><span>${i + 1}</span>${esc(r.pregunta)}</summary><p>${esc(r.respuesta)}</p></details>`).join('')}</div></section>` : ''}`;
}

/* ══ 4-bis · LOS APUNTES: la clase entera en una hoja bonita para repasar o imprimir ══ */
const FECHA = (ms) => new Date(ms || Date.now()).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const ETIQUETA = { texto: 'Idea', lista: 'Lista', definicion: 'Definición', formula: 'Fórmula', ejemplo: 'Ejemplo', cita: 'Cita', nota: 'Recuerda', ojo: 'Cuidado', dato: 'Dato', pregunta: 'Piénsalo',
  resumen: 'Resumen', codigo: 'Código', imagen: 'Foto', icono: 'Dibujo', partes: 'Partes', comparar: 'Compara', pasos: 'Proceso', linea: 'Línea del tiempo', tabla: 'Tabla', diagrama: 'Diagrama',
  venn: 'Unión de temas', mapa: 'Mapa mental', ciclo: 'Ciclo', piramide: 'Pirámide', embudo: 'Embudo', arbol: 'Clasificación', causas: 'Causas', matriz: 'Cuadrantes', escala: 'Escala', barras: 'Gráfica', lineas: 'Gráfica', pastel: 'Gráfica' };
function claveDe(z){ return z ? ETIQUETA[z.tipo] || 'Idea' : 'Idea'; }
const limpioTxt = (t) => String(t ?? '').replace(/\*\*|__|\(\(|\)\)/g, '');
function abrirApuntes(){
  if(!clase) return;
  sonando = false; turno++; callar(); lienzo.detener(); botonPlay();
  ver('apuntes'); scrollTo({ top: 0 });
  const h = $('#hojaApuntes');
  const tipos = new Set(clase.pasos.map((p) => p.pizarra && p.pizarra.tipo).filter(Boolean));
  h.innerHTML = `<header class="portada-ap"><small>Apuntes · ${esc(FECHA(clase.fecha))}</small><h1>${esc(clase.titulo)}</h1>
      <p>Explicado por ${esc(NOMBRE[clase.motor] || 'la IA')} · ${clase.pasos.length} pasos · ${tipos.size} tipos de elemento</p></header>
    <ol class="indice-ap">${clase.pasos.map((p, i) => p.pizarra && p.pizarra.tipo === 'titulo' ? `<li><a href="#ap-${i}">${esc(limpioTxt(p.pizarra.texto))}</a></li>` : '').join('')}</ol>
    <div id="apCuerpo"></div>`;
  const cuerpo = $('#apCuerpo');
  let sec = 0;
  clase.pasos.forEach((p, i) => {
    const z = p.pizarra, esTitulo = z && z.tipo === 'titulo';
    if(esTitulo) sec++;
    const s = document.createElement('section'); s.className = 'bloque-ap' + (esTitulo ? ' es-titulo' : ''); s.id = 'ap-' + i;
    s.innerHTML = `${esTitulo ? '' : `<aside class="margen-ap"><b>${esc(claveDe(z) || 'Idea')}</b></aside>`}<div class="lugar-ap"></div>${p.voz && !esTitulo ? `<p class="dijo-ap">${esc(p.voz)}</p>` : ''}`;
    cuerpo.append(s);
    if(z){ const lugar = s.querySelector('.lugar-ap'); armarFijo(lugar, z, i, Math.max(260, Math.min(640, lugar.clientWidth))); }
    if(esTitulo && p.voz) s.insertAdjacentHTML('beforeend', `<p class="dijo-ap intro">${esc(p.voz)}</p>`);
  });
  if(clase.repaso.length) cuerpo.insertAdjacentHTML('beforeend', `<section class="fin-ap"><h2>Repaso</h2><div class="repaso-ap">${clase.repaso.map((r, i) => `<details><summary><span>${i + 1}</span>${esc(r.pregunta)}</summary><p>${esc(r.respuesta)}</p></details>`).join('')}</div></section>`);
  if(clase.referencias.length) cuerpo.insertAdjacentHTML('beforeend', `<section class="fin-ap"><h2>Referencias</h2><ol class="refs-ap">${clase.referencias.map((r) => {
    const q = encodeURIComponent([r.titulo, r.autor].filter(Boolean).join(' '));
    const url = /wikipedia/i.test(r.tipo || '') ? `https://es.wikipedia.org/w/index.php?search=${encodeURIComponent(r.titulo)}` : `https://www.google.com/search?q=${q}`;
    return `<li><b>${esc(r.titulo)}</b>${r.autor ? ' · ' + esc(r.autor) : ''}${r.anio ? ' (' + esc(r.anio) + ')' : ''} <a href="${url}" target="_blank" rel="noopener">comprobar</a></li>`; }).join('')}</ol>
    <p class="ojo-ap">Las referencias las propone la IA: «comprobar» te deja ver que existen antes de citarlas.</p></section>`);
}

/* ══ 5 · PEDIDOS: clase nueva y preguntas sobre la misma ════════════════════ */
let fotos = [];
function aviso(t){ const a = $('#aviso'); a.textContent = t; a.hidden = !t; if(!$('#vClase').hidden && t){ avisoSub(t); } }
const ESPERA = ['Armando tu clase…', 'Ordenando las ideas…', 'Buscando buenos ejemplos…', 'Preparando el pizarrón…', 'Ya casi…'];
async function pedirClase(){
  const tema = $('#tema').value.trim();
  if(!tema && !fotos.length){ aviso('Escribe qué quieres que te explique (o sube una foto de tus apuntes).'); $('#tema').focus(); return; }
  if(!conAcceso()){ aviso('Entra a tu cuenta de CARYMO (o pon la llave de La Sala) para que te expliquen.'); $('#cajaLlave').hidden = false; $('#llaveTxt').focus(); return; }
  /* el iPhone sólo deja hablar si la voz arrancó con un toque: se «despierta» aquí, con una pausa vacía */
  despertar();
  let motor = $('#motor').value; if(fotos.length && motor === 'groq'){ motor = 'gemini'; }
  aviso(''); ver('prepara'); $('#quien').textContent = '· ' + NOMBRE[motor];
  let k = 0; $('#preparaTxt').innerHTML = `${NOMBRE[motor]} está armando tu clase<b>${esc(tema || 'tus apuntes')}</b>`;
  const t0 = Date.now(), largaEspera = motor === 'gemini';
  const giro = setInterval(() => { k++; const s = Math.round((Date.now() - t0) / 1000);
    $('#preparaTxt').innerHTML = `${ESPERA[k % ESPERA.length]}${largaEspera ? ` <small>(${s} s de unos 120)</small>` : ''}<b>${esc(tema || 'tus apuntes')}</b>`; }, 3000);
  try{
    const largo = $('#largo').value, nivelB = `${$('#nivel').value}-${largo}`;
    /* primero la que ya está en el teléfono (CARYMO la deja lista al crear el plan): abre sin internet */
    const deGuardada = (d, extra) => { const c = normalizarConNombre(sinCarlos(d)); c.motor = d.motor || motor; c.tema = tema; c.id = Date.now().toString(36); c.fecha = Date.now(); Object.assign(c, extra); guardarHistorial(c); empezar(c); };
    const local = tema && !fotos.length ? await leerClase(tema, nivelB) : null;
    const sinRed = typeof navigator !== 'undefined' && navigator.onLine === false;
    if(local && (!local.basica || sinRed)){ try{ deGuardada(local, { guardada: true }); return; }catch{} }
    /* la biblioteca: si alguien ya pidió esta misma clase (sin fotos), sale de ahí al instante */
    if(tema && !fotos.length && !sinRed){
      const ya = await biblioteca({ accion: 'memoria', tipo: 'clase', materia: '', titulo: tema, nivel: nivelB });
      if(ya && ya.hallado && ya.hallado.datos){
        try{ deGuardada(ya.hallado.datos, { deBiblioteca: true }); guardarClase(tema, nivelB, ya.hallado.datos); return; }catch{}
      }
    }
    /* sin red y sin nada mejor: la básica que armó CARYMO con las ideas de la lección */
    if(sinRed){ if(local){ deGuardada(local, { guardada: true }); return; } throw new Error('Esta clase todavía no está guardada en tu teléfono. Conéctate a internet una vez y queda lista.'); }
    const c = await pedirJSON({ motor, json: true, tope: 8000, sistema: sistema(motor, $('#nivel').value, largo) + (largo === 'fondo' ? '\n\nESTA ES LA PARTE 1 DE 2 de una clase a fondo: escribe los primeros pasos (los fundamentos y el mecanismo). La parte 2 (aplicaciones, casos, excepciones, errores comunes y cierre) se pide aparte; aquí deja "referencias" y "repaso" vacíos.' : ''),
      mensajes: [{ de: 'tu', texto: tema ? `Explícame: ${tema}` : 'Explícame lo que dicen estas fotos de mis apuntes.' }], imagenes: fotos }, normalizarConNombre);
    c.motor = motor; c.tema = tema; c.id = Date.now().toString(36); c.fecha = Date.now();
    guardarHistorial(c); empezar(c);
    const guardarla = () => { if(!tema || fotos.length) return; const datos = aPlantilla({ titulo: c.titulo, visual: c.visual, pasos: c.pasos, referencias: c.referencias, repaso: c.repaso, motor });
      guardarClase(tema, nivelB, datos); biblioteca({ accion: 'recordar', tipo: 'clase', materia: '', titulo: tema, nivel: nivelB, datos }); };
    if(largo === 'fondo') segundaParte(c, motor, tema).then(guardarla); else guardarla();
  }catch(e){
    /* se cayó la red a medio pedido: si hay una guardada (aunque sea la básica), mejor eso que un error */
    const tema2 = $('#tema').value.trim(), local = tema2 && !fotos.length ? await leerClase(tema2, `${$('#nivel').value}-${$('#largo').value}`) : null;
    if(local){ try{ const c = normalizarConNombre(sinCarlos(local)); c.motor = local.motor || 'groq'; c.tema = tema2; c.id = Date.now().toString(36); c.fecha = Date.now(); c.guardada = true; guardarHistorial(c); empezar(c); return; }catch{} }
    ver('inicio'); aviso(e.message || String(e)); if(e.llave) $('#cajaLlave').hidden = false;
  }finally{ clearInterval(giro); }
}
/* ?preparar=1 · CARYMO la pide de antemano, en un marco escondido: se arma (o se saca de la
   biblioteca), se guarda en el teléfono y se avisa «listo». Sin pantalla, sin voz, sin sonidos. */
async function prepararCallado(){
  const tema = $('#tema').value.trim(), largo = $('#largo').value, nivelB = `${$('#nivel').value}-${largo}`;
  const avisar = (ok, por) => { try{ parent.postMessage({ explica: 'listo', tema, nivel: nivelB, ok, por }, location.origin); }catch{} };
  if(!tema) return avisar(false, 'sin tema');
  if(await hayClase(tema, nivelB, { basicaCuenta: false })) return avisar(true, 'ya estaba');
  if(navigator.onLine === false) return avisar(false, 'sin red');
  const ya = await biblioteca({ accion: 'memoria', tipo: 'clase', materia: '', titulo: tema, nivel: nivelB });
  if(ya && ya.hallado && ya.hallado.datos && Array.isArray(ya.hallado.datos.pasos)){ await guardarClase(tema, nivelB, sinCarlos(ya.hallado.datos)); return avisar(true, 'biblioteca'); }
  if(!conAcceso()) return avisar(false, 'sin cuenta');
  try{
    const motor = $('#motor').value;
    const c = await pedirJSON({ motor, json: true, tope: 8000, sistema: sistema(motor, $('#nivel').value, largo === 'fondo' ? 'normal' : largo),
      mensajes: [{ de: 'tu', texto: `Explícame: ${tema}` }] }, normalizarConNombre);
    const datos = aPlantilla({ titulo: c.titulo, visual: c.visual, pasos: c.pasos, referencias: c.referencias, repaso: c.repaso, motor });
    await guardarClase(tema, nivelB, datos);
    biblioteca({ accion: 'recordar', tipo: 'clase', materia: '', titulo: tema, nivel: nivelB, datos });
    avisar(true, 'ia');
  }catch(e){ avisar(false, e.message || String(e)); }
}
/* la segunda mitad de una clase a fondo: se pide en cuanto arranca la primera y se pega al final */
async function biblioteca(cuerpo){
  try{
    const r = await Promise.race([pedirSala('estudio', { metodo: 'POST', cuerpo, espera: 8000 }), new Promise((_, no) => setTimeout(() => no(new Error('lento')), 8000))]);
    return await r.json().catch(() => null);
  }catch{ return null; }
}
function segundaParte(c, motor, tema){
  const resumen = c.pasos.map((x, i) => `${i + 1}. ${x.voz}`).join('\n');
  return c.pendiente = pedirJSON({ motor, json: true, tope: 8000,
    sistema: sistema(motor, $('#nivel').value, 'fondo') + `\n\nESTA ES LA PARTE 2 DE 2. YA DISTE la parte 1 de «${c.titulo}»:\n${resumen}\n\nAhora escribe de 12 a 15 pasos NUEVOS que profundicen sin repetir: aplicaciones, casos reales, excepciones, comparaciones, errores comunes, cómo se conecta con otros temas y un cierre con un "resumen". El primero puede ser un "titulo" de sección. Incluye "referencias" y "repaso" (de 4 a 6 preguntas).`,
    mensajes: [{ de: 'tu', texto: `Sigue con la parte 2 de: ${tema || c.titulo}` }] }, normalizarConNombre)
    .then((n2) => {
      if(clase !== c) return;
      c.pasos.push(...n2.pasos);
      c.referencias.push(...n2.referencias.filter((r) => !c.referencias.some((x) => x.titulo === r.titulo)));
      if(n2.repaso.length) c.repaso = [...c.repaso, ...n2.repaso].slice(0, 8);
      guardarHistorial(c);
    })
    .catch((e) => { if(clase === c) aviso('La segunda parte no llegó: ' + (e.message || e) + ' Con la pregunta (?) puedes pedir que siga.'); })
    .finally(() => { c.pendiente = null; });
}
async function empezar(c){
  clase = c; voz.olvidar();
  $('#quien').textContent = '· ' + NOMBRE[c.motor || 'gemini']; document.title = c.titulo + ' · Explica';
  ver('clase'); scrollTo({ top: 0 });
  /* las letras tienen que estar cargadas antes de medir: el texto SVG se acomoda con ellas */
  try{ await Promise.race([Promise.all(['700 20px Mano', '600 16px Texto', '700 16px Texto'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 1500))]); }catch{}
  lienzo.limpiar(); lienzo.maestro(NOMBRE[c.motor || 'groq']); margenes();
  sonando = true; botonPlay(); reproducir(0);
}
async function preguntar(q){
  if(!clase || !q) return;
  sonando = false; callar(); botonPlay(); avisoSub(`${NOMBRE[clase.motor]} está pensando tu pregunta…`);
  try{
    const resumen = clase.pasos.map((p, i) => `${i + 1}. ${p.voz}`).join('\n');
    const nueva = await pedirJSON({ motor: clase.motor, json: true, tope: 6000,
      sistema: sistema(clase.motor, $('#nivel').value, 'corta') + `\n\nYA DISTE esta clase («${clase.titulo}»):\n${resumen}\n\nAhora contesta la PREGUNTA del alumno como una continuación de la clase: de 3 a 7 pasos nuevos con la misma forma JSON (el primero NO tiene que ser título). Puedes agregar referencias y repaso nuevos.`,
      mensajes: [{ de: 'tu', texto: q }] }, normalizarConNombre), desde = clase.pasos.length;
    clase.pasos.push({ voz: '', pregunta: q, pizarra: { tipo: 'titulo', texto: q.length > 70 ? q.slice(0, 68) + '…' : q, sub: 'Tu pregunta' } }, ...nueva.pasos);
    clase.referencias.push(...nueva.referencias.filter((r) => !clase.referencias.some((x) => x.titulo === r.titulo)));
    if(nueva.repaso.length) clase.repaso = nueva.repaso;
    guardarHistorial(clase); sonando = true; botonPlay(); reproducir(desde);
  }catch(e){ avisoSub('No pude contestar: ' + (e.message || e)); }
}

/* ══ 6 · HISTORIAL (en este teléfono) ═══════════════════════════════════════ */
function guardarHistorial(c){ const h = guarda.leer('explica.historial', []).filter((x) => x.id !== c.id); h.unshift(c); guarda.poner('explica.historial', h.slice(0, 25)); pintarHistorial(); }
function pintarHistorial(){
  const h = guarda.leer('explica.historial', []);
  $('#hist').hidden = !h.length;
  $('#histLista').innerHTML = h.map((c) => `<li><button class="bt abrir" data-abrir="${esc(c.id)}">${ico('book-open')}<span>${esc(c.titulo)}</span><small>${new Date(c.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</small></button><button class="bt redondo" data-borrar="${esc(c.id)}" aria-label="Borrar «${esc(c.titulo)}»">${ico('trash')}</button></li>`).join('');
}
$('#histLista').addEventListener('click', (e) => {
  const a = e.target.closest('[data-abrir]'), b = e.target.closest('[data-borrar]');
  const h = guarda.leer('explica.historial', []);
  if(a){ const c = h.find((x) => x.id === a.dataset.abrir); if(c){ despertar(); empezar(c); } }
  if(b){ if(b.dataset.seguro){ guarda.poner('explica.historial', h.filter((x) => x.id !== b.dataset.borrar)); pintarHistorial(); } else { b.dataset.seguro = '1'; b.style.background = 'var(--rojo)'; setTimeout(() => { delete b.dataset.seguro; b.style.background = ''; }, 2500); } }
});

/* ══ 7 · BOTONES ═══════════════════════════════════════════════════════════ */
$('#bExplica').addEventListener('click', pedirClase);
$('#tema').addEventListener('keydown', (e) => { if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) pedirClase(); });
$('#llaveTxt').addEventListener('change', () => { if(ponerLlave($('#llaveTxt').value)){ $('#cajaLlave').hidden = true; aviso('Listo, ya quedó la llave en este teléfono.'); } });
$('#archivo').addEventListener('change', async () => {
  for(const f of [...$('#archivo').files].slice(0, 4 - fotos.length)){
    const img = await createImageBitmap(f).catch(() => null); if(!img) continue;
    const k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); const url = cv.toDataURL('image/jpeg', .85);
    fotos.push({ mime: 'image/jpeg', data: url.split(',')[1], url });
  }
  $('#archivo').value = ''; $('#fotos').innerHTML = fotos.map((f, i) => `<img src="${f.url}" alt="Foto ${i + 1} de tus apuntes">`).join('');
  if(fotos.length && $('#motor').value === 'groq'){ $('#motor').value = 'gemini'; aviso('Las fotos las lee Paulina (Negro no ve imágenes). Ella tarda unos 2 minutos en armar la clase.'); }
});
$('#ideas').innerHTML = ['La Revolución Mexicana en línea de tiempo', 'Cómo funciona la fotosíntesis', 'Derivada de un producto con ejemplo', 'Qué es una red neuronal', 'Causas de la Segunda Guerra Mundial']
  .map((t) => `<button type="button">${esc(t)}</button>`).join('');
$('#ideas').addEventListener('click', (e) => { const b = e.target.closest('button'); if(b){ $('#tema').value = b.textContent; $('#tema').focus(); } });
/* pausa: lo que se estaba dibujando queda completo (los cursores lo terminan de golpe); play: sigue desde ahí */
let terminada = false;
$('#bPlay').addEventListener('click', () => { if(sonando){ sonando = false; turno++; callar(); lienzo.detener(); botonPlay(); } else { sonando = true; botonPlay(); reproducir(terminada && actual >= clase.pasos.length - 1 ? 0 : Math.max(0, actual)); terminada = false; } });
$('#bSig').addEventListener('click', () => { if(actual < clase.pasos.length - 1) reproducir(actual + 1); else { sonando = false; turno++; callar(); lienzo.detener(); botonPlay(); terminada = true; pintarFinal(); } });
$('#bAtras').addEventListener('click', () => reproducir(actual - 1));
$('#bVel').addEventListener('click', () => { velocidad = { 1: 1.25, 1.25: 1.5, 1.5: .85, .85: 1 }[velocidad] || 1; voz.velocidad = velocidad; guarda.poner('explica.vel', velocidad); botonPlay(); });
$('#bVoz').addEventListener('click', () => { callada = !callada; if(callada) callar(); guarda.poner('explica.voz', vozActiva()); botonPlay(); avisoSub(callada ? 'Sin voz: sólo el pizarrón.' : 'Voz: ' + nombreDe(vozElegida) + '. La cambias en «Voz» al empezar o en tu perfil de CARYMO.'); });
$('#bSub').addEventListener('click', () => { conSubs = !conSubs; guarda.poner('explica.subs', conSubs); botonPlay(); if(conSubs && clase && clase.pasos[actual]) pintarSub(clase.pasos[actual].voz, Infinity); });
$('#vozSel').addEventListener('change', () => { const v = $('#vozSel').value; callada = v === 'no'; if(!callada){ vozElegida = v; guarda.poner('explica.vozAntes', v); } guarda.poner('explica.voz', vozActiva()); botonPlay(); });
if(typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener?.('voiceschanged', pintarVoces);
$('#bPreg').addEventListener('click', () => { $('#fPreg').hidden = !$('#fPreg').hidden; if(!$('#fPreg').hidden) $('#pregTxt').focus(); });
$('#fPreg').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#pregTxt').value.trim(); if(!q) return; $('#pregTxt').value = ''; $('#fPreg').hidden = true; despertar(); preguntar(q); });
$('#bNueva').addEventListener('click', () => { sonando = false; turno++; callar(); lienzo.detener(); clase = null; ver('inicio'); document.title = 'Explica · La Sala'; $('#tema').value = ''; fotos = []; $('#fotos').innerHTML = ''; });
$('#bSeguir').addEventListener('click', () => { lienzo.seguir(); $('#bSeguir').hidden = true; });
$('#bTodo').addEventListener('click', () => lienzo.verTodo());
$('#bApuntes').addEventListener('click', abrirApuntes);
$('#bDicho').addEventListener('click', abrirDicho);
$('#bVolverDicho').addEventListener('click', () => { ver('clase'); lienzo.verTodo(); });
$('#bApuntesDicho').addEventListener('click', abrirApuntes);
$('#bVolverClase').addEventListener('click', () => { ver('clase'); lienzo.verTodo(); });
$('#bImprimir').addEventListener('click', () => print());
$('#cursores').value = modoCursores;
$('#sonidos').value = conSonidos ? 'si' : 'no';
$('#sonidos').addEventListener('change', () => { conSonidos = $('#sonidos').value === 'si'; guarda.poner('explica.sonidos', conSonidos); encenderSonidos(conSonidos); });
$('#cursores').addEventListener('change', () => { modoCursores = $('#cursores').value; guarda.poner('explica.cursores', modoCursores); lienzo.modo(modoCursores); });
document.addEventListener('visibilitychange', () => { if(document.hidden && sonando){ sonando = false; turno++; callar(); botonPlay(); } });
/* ?tema=… arranca directo (desde la mesa o un link) */
const q0 = new URLSearchParams(location.search).get('tema'); if(q0) $('#tema').value = q0;
/* …y Estudio también dice el nivel y el largo («corta»: un nodo del camino no es una clase de una hora) */
{ const q = new URLSearchParams(location.search); for(const k of ['nivel', 'largo', 'motor']){ const v = q.get(k); if(v && [...$('#' + k).options].some((o) => o.value === v)) $('#' + k).value = v; } }
if(new URLSearchParams(location.search).has('preparar')) prepararCallado();
else { botonPlay(); pintarVoces(); pintarHistorial(); ver('inicio'); }
/* para las pruebas: cargar una clase ya hecha sin pedirla */
window.__explica = { abrirDicho, empezar: (c) => empezar({ ...normalizar(c), motor: c.motor || 'groq', fecha: Date.now() }), normalizar, normalizarPizarra, abrirApuntes, lienzo,
  estado: () => ({ actual, sonando, pasos: clase && clase.pasos.length, dibujados: lienzo.piezas.length, cursores: lienzo.cursores, libre: lienzo.libre }) };
