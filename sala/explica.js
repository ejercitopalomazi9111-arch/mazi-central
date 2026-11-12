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
import { crearLienzo, armarFijo, buscarDibujo, TIPOS } from './lienzo.js';
import { sacarJSON } from './json-ia.js';
import { sonar, encender as encenderSonidos } from './sonidos/sonidos.js';
import { llave, ponerLlave, llamar, SERVIDOR, SALA } from '../presentaciones/ia.js';
/* a La Sala directo (no por presentaciones/ia.js#texto) para mandar `espera` y `pensarPoco`: una clase entera tarda */
async function iaTexto(cuerpo){
  const r = await llamar(`${SERVIDOR}/api/sala/${SALA}/ia-texto`, { metodo: 'POST', cuerpo: { ...cuerpo, espera: 150000, pensarPoco: true }, espera: 165000 });
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
$('#bAtras').innerHTML = ico('skip-back'); $('#bSig').innerHTML = ico('skip-forward'); $('#bPreg').innerHTML = ico('circle-question-mark');
$('#fPreg button').innerHTML = ico('send');

/* ══ 1 · PEDIR LA CLASE ═════════════════════════════════════════════════════ */
const LARGO = { corta: '6 a 9', normal: '10 a 14', fondo: '16 a 22' };
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
- imagen { buscar, pie } · una FOTO real: "buscar" es el título EXACTO de un artículo de Wikipedia en español (ej. "Corazón humano", "Pirámide de Kukulcán")
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
DIBUJOS que existen para "icono" (escribe el nombre tal cual): ${Object.keys(DIBUJOS).join(', ')}`;
/* lo que Estudio (u otro) dice del alumno, para que la clase sea SUYA */
const CONTEXTO = new URLSearchParams(location.search).get('contexto') || '';
function sistema(motor, nivel, largo){
  return `Eres ${NOMBRE[motor]}, la maestra particular de Carlos (Querétaro, México). Explicas en español de México, claro, cercano y sin relleno, con ejemplos de la vida diaria de un estudiante de prepa en México.
Vas a dar una CLASE que se DIBUJA en un pizarrón infinito mientras hablas: varios cursores dibujan cada elemento, forma por forma y letra por letra.
Contesta SÓLO con JSON válido, sin texto antes ni después, con esta forma:
${FORMA}
${CATALOGO}
Reglas:
- ${LARGO[largo]} pasos, nivel ${NIVEL[nivel]}. El PRIMER paso es un "titulo".
- "voz": de 2 a 3 frases (entre 30 y 60 palabras) que EXPLIQUEN de verdad: el porqué, un ejemplo o un truco para recordarlo. Nunca sólo anuncies lo que viene. Como lo dirías hablando: sin markdown, sin emojis y sin leer la pizarra palabra por palabra; la complementas.
- "pizarra": lo que se dibuja en ese paso. USA MUCHOS TIPOS DISTINTOS: al menos 6 tipos diferentes en la clase, y no repitas el mismo tipo dos pasos seguidos. Elige el que MEJOR enseñe cada idea: si se comparan cosas, "comparar" o "tabla"; si se juntan temas, "venn"; si es un proceso, "pasos" o "ciclo"; si son partes de algo, "partes"; si hay jerarquía, "arbol" o "piramide"; si hay fechas, "linea"; si hay causas, "causas" o "diagrama".
- "visual": true si el tema se entiende mejor con dibujos y diagramas; entonces usa más diagramas, dibujos y fotos, y menos texto suelto.
- Usa "icono" seguido (en titulo, texto, definicion, icono y partes): sólo nombres de la lista de DIBUJOS. Usa 1 o 2 "imagen" si el tema tiene algo que se pueda ver en una foto.
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
  tipo = SINONIMOS[tipo] || tipo;
  z.tipo = TIPOS.includes(tipo) ? tipo : 'texto';
  for(const k of ['texto', 'titulo', 'sub', 'termino', 'expresion', 'autor', 'pie', 'numero', 'resultado', 'pregunta', 'respuesta', 'centro', 'efecto', 'raiz', 'ejeX', 'ejeY', 'izquierda', 'derecha', 'unidad', 'lenguaje', 'buscar'])
    if(z[k] != null) z[k] = corta(z[k], k === 'texto' || k === 'respuesta' ? 600 : 160);
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
  return z;
}
export function normalizar(j){
  const pasos = (Array.isArray(j.pasos) ? j.pasos : []).map((p) => {
    const voz = corta(p && p.voz, 600);
    const z = normalizarPizarra(p && p.pizarra);
    return voz || z ? { voz, pizarra: z } : null;
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

/* ══ 3 · LA VOZ ═════════════════════════════════════════════════════════════ */
const MODOS_VOZ = ['tel', 'natural', 'no'];
let modoVoz = guarda.leer('explica.voz', 'tel'), velocidad = guarda.leer('explica.vel', 1);
let vocesTel = [];
const cargarVoces = () => { vocesTel = (speechSynthesis.getVoices && speechSynthesis.getVoices()) || []; };
if('speechSynthesis' in window){ cargarVoces(); speechSynthesis.addEventListener?.('voiceschanged', cargarVoces); }
function vozTel(motor){
  const es = vocesTel.filter((v) => /^es/i.test(v.lang));
  const mx = es.filter((v) => /MX|US|419/i.test(v.lang));
  const pref = motor === 'groq' ? /juan|jorge|diego|carlos|male|hombre/i : /paulina|m[oó]nica|sabina|female|mujer|google/i;
  return mx.find((v) => pref.test(v.name)) || mx[0] || es.find((v) => pref.test(v.name)) || es[0] || null;
}
/* lo que se OYE: los subíndices y los signos se leen como se dicen («CO₂» → «CO2», «→» → «produce») */
const SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '⁰': '0', '¹': '1', '²': ' al cuadrado', '³': ' al cubo' };
const decible = (t) => String(t || '').replace(/[₀-₉⁰¹²³]/g, (c) => SUBS[c]).replace(/\s*(→|⟶|=>)\s*/g, ' produce ').replace(/\s=\s/g, ' igual a ')
  .replace(/\s\+\s/g, ' más ').replace(/\s[·×]\s/g, ' por ').replace(/\*\*/g, '');
const decirTel = (t0, motor, alPalabra) => new Promise((fin) => { const t = decible(t0);
  if(!('speechSynthesis' in window) || !t){ fin(); return; }
  const u = new SpeechSynthesisUtterance(t); const v = vozTel(motor); if(v){ u.voice = v; u.lang = v.lang; } else u.lang = 'es-MX';
  u.rate = Math.min(2, 1.02 * velocidad); u.onend = u.onerror = () => fin();
  u.onboundary = (e) => { if(e.name === 'word' || e.charIndex != null) alPalabra && alPalabra(e.charIndex); };
  speechSynthesis.speak(u);
});
/* la natural: audio de Gemini; PCM crudo se envuelve en WAV aquí mismo */
const audiosNat = new Map();
function wav(b64, mime){
  const crudo = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  if(!/L16|pcm/i.test(mime)) return new Blob([crudo], { type: mime });
  const rate = +(/rate=(\d+)/.exec(mime) || [, 24000])[1], h = new DataView(new ArrayBuffer(44));
  const s = (o, t) => [...t].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF'); h.setUint32(4, 36 + crudo.length, true); s(8, 'WAVE'); s(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
  h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); s(36, 'data'); h.setUint32(40, crudo.length, true);
  return new Blob([h.buffer, crudo], { type: 'audio/wav' });
}
function pedirNatural(i){
  if(audiosNat.has(i) || !clase || !clase.pasos[i] || !clase.pasos[i].voz) return audiosNat.get(i);
  const p = (async () => {
    const r = await llamar(`${SERVIDOR}/api/sala/${SALA}/ia-voz`, { metodo: 'POST', cuerpo: { texto: decible(clase.pasos[i].voz), voz: clase.motor === 'groq' ? 'Charon' : 'Kore', estilo: 'Explícalo en español de México como una maestra clara, cálida y con buen ritmo' }, espera: 90000 });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || !j.bien) throw new Error(j.error || 'La voz natural no contestó.');
    return URL.createObjectURL(wav(j.data, j.mime));
  })();
  p.catch(() => {}); audiosNat.set(i, p); return p;
}
let audioActual = null;
async function decirNatural(i){
  const url = await pedirNatural(i);
  return new Promise((fin) => { const a = new Audio(url); audioActual = a; a.playbackRate = velocidad; a.onended = a.onerror = () => fin(); a.play().catch(() => fin()); });
}
function callar(){ try{ speechSynthesis.cancel(); }catch{} if(audioActual){ audioActual.pause(); audioActual = null; } }

/* ══ 4 · LA CLASE EN PANTALLA ═══════════════════════════════════════════════ */
let clase = null, actual = -1, sonando = false, turno = 0;
const ver = (cual) => {
  $('#vInicio').hidden = cual !== 'inicio'; $('#vPrepara').hidden = cual !== 'prepara'; $('#vClase').hidden = cual !== 'clase'; $('#vApuntes').hidden = cual !== 'apuntes';
  $('#mando').hidden = cual !== 'clase'; $('#bNueva').hidden = cual !== 'clase' && cual !== 'apuntes';
  document.body.classList.toggle('en-clase', cual === 'clase');
  if(cual === 'clase') requestAnimationFrame(margenes);
};
const segundos = (t) => Math.min(16, Math.max(2.2, String(t || '').split(/\s+/).length * .38 / velocidad));
function pintarSub(t, hasta){ const p = String(t || '').split(/(\s+)/); let n = 0; $('#subVoz').innerHTML = p.map((w) => { const i = n; n += w.length; return /^\s+$/.test(w) ? w : `<span class="${i + w.length <= hasta ? 'ya' : i <= hasta ? 'ahora' : ''}">${esc(w)}</span>`; }).join(''); }
function botonPlay(){ $('#bPlay').innerHTML = ico(sonando ? 'pause' : 'play'); $('#bVoz').innerHTML = ico(modoVoz === 'no' ? 'volume-x' : 'volume-2') ; $('#bVoz').title = { tel: 'Voz del teléfono', natural: 'Voz natural de Gemini', no: 'Sin voz' }[modoVoz]; $('#bVel').textContent = velocidad + '×'; }

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
  pintarSub(paso.voz, -1);
  let p = null;
  if(paso.pizarra){ p = lienzo.poner(paso.pizarra, i); lienzo.enfocar(p); }
  if(!sonando){ if(p) lienzo.dibujarYa(p); pintarSub(paso.voz, Infinity); return; }
  const dur = segundos(paso.voz) * 1000;
  if(modoVoz === 'natural'){ pedirNatural(i + 1); pedirNatural(i + 2); }
  const inicio = performance.now();
  const subTimer = setInterval(() => { if(yo !== turno){ clearInterval(subTimer); return; } pintarSub(paso.voz, paso.voz.length * Math.min(1, (performance.now() - inicio) / dur)); }, 160);
  const voz = (async () => {
    if(modoVoz === 'no'){ await new Promise((r) => setTimeout(r, dur)); return; }
    if(modoVoz === 'natural'){ try{ await decirNatural(i); return; }catch(e){ aviso('La voz natural falló; sigo con la del teléfono. (' + e.message + ')'); modoVoz = 'tel'; botonPlay(); } }
    await Promise.race([decirTel(paso.voz, clase.motor), new Promise((r) => setTimeout(r, dur * 1.8 + 2500))]);
  })();
  /* el dibujo acaba antes que la voz: lo que se dice ya está en el pizarrón */
  const dibujo = p ? lienzo.dibujar(p, dur * .78) : Promise.resolve();
  await Promise.all([voz, dibujo]); clearInterval(subTimer);
  if(yo !== turno) return;
  pintarSub(paso.voz, Infinity);
  await new Promise((r) => setTimeout(r, 320));
  if(yo !== turno || !sonando) return;
  if(i < clase.pasos.length - 1) reproducir(i + 1);
  else { sonando = false; botonPlay(); terminada = true; pintarFinal(); }
}
function pintarFinal(){
  /* si la abrió un nodo del camino de Estudio (estudio.html), se le avisa que la clase ya se vio completa */
  if(window.top !== window) try{ parent.postMessage({ explica: 'fin', titulo: clase.titulo }, location.origin); }catch{}
  $('#bSeguir').hidden = true; $('#bTodo').hidden = false;
  pintarSub('Listo. Mueve el pizarrón con el dedo, toca dos veces algo para acercarte, o abre tus apuntes.', Infinity);
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
function aviso(t){ const a = $('#aviso'); a.textContent = t; a.hidden = !t; if(!$('#vClase').hidden && t){ pintarSub(t, Infinity); } }
const ESPERA = ['Armando tu clase…', 'Ordenando las ideas…', 'Buscando buenos ejemplos…', 'Preparando el pizarrón…', 'Ya casi…'];
async function pedirClase(){
  const tema = $('#tema').value.trim();
  if(!tema && !fotos.length){ aviso('Escribe qué quieres que te explique (o sube una foto de tus apuntes).'); $('#tema').focus(); return; }
  if(!llave()){ aviso('Falta la llave de La Sala en este teléfono.'); $('#cajaLlave').hidden = false; $('#llaveTxt').focus(); return; }
  /* el iPhone sólo deja hablar si la voz arrancó con un toque: se «despierta» aquí, con una pausa vacía */
  try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }catch{}
  let motor = $('#motor').value; if(fotos.length && motor === 'groq'){ motor = 'gemini'; }
  aviso(''); ver('prepara'); $('#quien').textContent = '· ' + NOMBRE[motor];
  let k = 0; $('#preparaTxt').innerHTML = `${NOMBRE[motor]} está armando tu clase<b>${esc(tema || 'tus apuntes')}</b>`;
  const t0 = Date.now(), largaEspera = motor === 'gemini';
  const giro = setInterval(() => { k++; const s = Math.round((Date.now() - t0) / 1000);
    $('#preparaTxt').innerHTML = `${ESPERA[k % ESPERA.length]}${largaEspera ? ` <small>(${s} s de unos 120)</small>` : ''}<b>${esc(tema || 'tus apuntes')}</b>`; }, 3000);
  try{
    const c = await pedirJSON({ motor, json: true, tope: 8000, sistema: sistema(motor, $('#nivel').value, $('#largo').value),
      mensajes: [{ de: 'tu', texto: tema ? `Explícame: ${tema}` : 'Explícame lo que dicen estas fotos de mis apuntes.' }], imagenes: fotos }, normalizar);
    c.motor = motor; c.tema = tema; c.id = Date.now().toString(36); c.fecha = Date.now();
    guardarHistorial(c); empezar(c);
  }catch(e){
    ver('inicio'); aviso(e.message || String(e)); if(e.llave) $('#cajaLlave').hidden = false;
  }finally{ clearInterval(giro); }
}
async function empezar(c){
  clase = c; audiosNat.clear();
  $('#quien').textContent = '· ' + NOMBRE[c.motor || 'gemini']; document.title = c.titulo + ' · Explica';
  ver('clase'); scrollTo({ top: 0 });
  /* las letras tienen que estar cargadas antes de medir: el texto SVG se acomoda con ellas */
  try{ await Promise.race([Promise.all(['700 20px Mano', '600 16px Texto', '700 16px Texto'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 1500))]); }catch{}
  lienzo.limpiar(); lienzo.maestro(NOMBRE[c.motor || 'groq']); margenes();
  sonando = true; botonPlay(); reproducir(0);
}
async function preguntar(q){
  if(!clase || !q) return;
  sonando = false; callar(); botonPlay(); pintarSub(`${NOMBRE[clase.motor]} está pensando tu pregunta…`, Infinity);
  try{
    const resumen = clase.pasos.map((p, i) => `${i + 1}. ${p.voz}`).join('\n');
    const nueva = await pedirJSON({ motor: clase.motor, json: true, tope: 6000,
      sistema: sistema(clase.motor, $('#nivel').value, 'corta') + `\n\nYA DISTE esta clase («${clase.titulo}»):\n${resumen}\n\nAhora contesta la PREGUNTA de Carlos como una continuación de la clase: de 3 a 7 pasos nuevos con la misma forma JSON (el primero NO tiene que ser título). Puedes agregar referencias y repaso nuevos.`,
      mensajes: [{ de: 'tu', texto: q }] }, normalizar), desde = clase.pasos.length;
    clase.pasos.push({ voz: '', pizarra: { tipo: 'titulo', texto: q.length > 70 ? q.slice(0, 68) + '…' : q, sub: 'Tu pregunta' } }, ...nueva.pasos);
    clase.referencias.push(...nueva.referencias.filter((r) => !clase.referencias.some((x) => x.titulo === r.titulo)));
    if(nueva.repaso.length) clase.repaso = nueva.repaso;
    guardarHistorial(clase); sonando = true; botonPlay(); reproducir(desde);
  }catch(e){ pintarSub('No pude contestar: ' + (e.message || e), Infinity); }
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
  if(a){ const c = h.find((x) => x.id === a.dataset.abrir); if(c){ try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }catch{} empezar(c); } }
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
$('#bVel').addEventListener('click', () => { velocidad = { 1: 1.25, 1.25: 1.5, 1.5: .85, .85: 1 }[velocidad] || 1; guarda.poner('explica.vel', velocidad); botonPlay(); });
$('#bVoz').addEventListener('click', () => { modoVoz = MODOS_VOZ[(MODOS_VOZ.indexOf(modoVoz) + 1) % MODOS_VOZ.length]; guarda.poner('explica.voz', modoVoz); botonPlay(); pintarSub({ tel: 'Voz del teléfono.', natural: 'Voz natural de Gemini (tarda un poquito más en arrancar cada paso).', no: 'Sin voz: sólo el pizarrón.' }[modoVoz], Infinity); });
$('#bPreg').addEventListener('click', () => { $('#fPreg').hidden = !$('#fPreg').hidden; if(!$('#fPreg').hidden) $('#pregTxt').focus(); });
$('#fPreg').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#pregTxt').value.trim(); if(!q) return; $('#pregTxt').value = ''; $('#fPreg').hidden = true; try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }catch{} preguntar(q); });
$('#bNueva').addEventListener('click', () => { sonando = false; turno++; callar(); lienzo.detener(); clase = null; ver('inicio'); document.title = 'Explica · La Sala'; $('#tema').value = ''; fotos = []; $('#fotos').innerHTML = ''; });
$('#bSeguir').addEventListener('click', () => { lienzo.seguir(); $('#bSeguir').hidden = true; });
$('#bTodo').addEventListener('click', () => lienzo.verTodo());
$('#bApuntes').addEventListener('click', abrirApuntes);
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
botonPlay(); pintarHistorial(); ver('inicio');
/* para las pruebas: cargar una clase ya hecha sin pedirla */
window.__explica = { empezar: (c) => empezar({ ...normalizar(c), motor: c.motor || 'groq', fecha: Date.now() }), normalizar, normalizarPizarra, abrirApuntes, lienzo,
  estado: () => ({ actual, sonando, pasos: clase && clase.pasos.length, dibujados: lienzo.piezas.length, cursores: lienzo.cursores, libre: lienzo.libre }) };
