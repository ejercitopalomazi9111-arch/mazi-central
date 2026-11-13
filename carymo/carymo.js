/* ══════════════════════════════════════════════════════════════════════════
   ESTUDIO · el plan de examen que se juega como camino (estudio.html)
   ──────────────────────────────────────────────────────────────────────────
   1. ALTA: materia → fecha del examen → temas y fotos de tus apuntes.
      La IA arma el PLAN (unidades con temas) y la página lo vuelve camino.
   2. CAMINO: cada tema es una lección + cuestionario; cada unidad cierra con
      tarjetas y trae una clase en el pizarrón (Explica, la misma de la mesa);
      al final, el simulacro. El nodo hecho se vuelve moneda.
   3. Las lecciones se piden a la IA cuando hacen falta (y la siguiente se
      prepara sola mientras juegas). Tarjetas y simulacro NO gastan IA: salen
      de las preguntas que ya existen.
   4. XP, racha y ranking de la semana viven en La Sala (servidor/estudio.js),
      para que Carlos y Luis compitan. Sin red se apunta y se manda después.
   Sin librerías. Un solo archivo de lógica; los íconos son de Lucide.
   ═════════════════════════════════════════════════════════════════════════ */
import { ico } from './iconos.js';
import { DIBUJOS } from '../sala/iconos-clase.js';
import { sacarJSON } from '../sala/json-ia.js';
import { buscarImagen } from '../sala/lienzo.js';
import { sonar, encender as encenderSonidos } from '../sala/sonidos/sonidos.js';
import { llave, ponerLlave, llamar, SERVIDOR, SALA } from '../presentaciones/ia.js';

const $ = (s, d = document) => d.querySelector(s);
const $$ = (s, d = document) => [...d.querySelectorAll(s)];
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* «**así**» → negritas, sin dejar pasar ningún otro HTML */
const negritas = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const guarda = { leer(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } }, poner(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} } };
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const barajar = (a) => { const b = [...a]; for(let i = b.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const quitarAcentos = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
/* el día de hoy EN ESTE TELÉFONO (la racha es de días de calendario de quien estudia) */
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const diasHasta = (f) => f ? Math.round((Date.parse(f + 'T12:00:00') - Date.parse(hoyLocal() + 'T12:00:00')) / 864e5) : null;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const VERSION_ESTUDIO = 'CARYMO 1.1 · 12 nov';

/* los colores de las unidades: vino protagonista, morados de la casa, y el claro para la última */
const COLOR_UNIDAD = ['#7E1735', '#5E2387', '#8E1F5C', '#7A2FBF', '#AC27FF'];
const ICONO_NODO = { quiz: 'notebook-pen', tarjetas: 'layers', pizarra: 'presentation', panorama: 'graduation-cap', simulacro: 'timer', examen: 'trophy' };
const NOMBRE_NODO = { quiz: 'Nivel: lección y cuestionario', tarjetas: 'Tarjetas', pizarra: 'Cátedra en el pizarrón', panorama: 'Panorama de la unidad', simulacro: 'Simulacro', examen: 'Examen final' };
/* el tipo que se ve (un panorama es una clase en el pizarrón de toda la unidad) */
const tipoVisto = (n) => n.tipo === 'pizarra' && n.alcance === 'unidad' ? 'panorama' : n.tipo;

/* Explica (el pizarrón) vive en La Sala y es el mismo para las dos: CARYMO lo abre desde allá */
const EXPLICA = new URL('../sala/explica.html', import.meta.url).href;

/* ══ ESTADO ═══════════════════════════════════════════════════════════════ */
let planes = guarda.leer('est.planes', {});                 /* id → plan completo */
let migrarAlArrancar = true;
let actualId = guarda.leer('est.actual', null);
let perfil = guarda.leer('est.perfil', { nombre: 'Tú', xp: 0, racha: 0, mejorRacha: 0, congeladas: 0, ultimoDia: '', horario: null, cuenta: '' });
let ranking = guarda.leer('est.ranking', { semana: '', filas: [] });
let cola = guarda.leer('est.cola', []);                     /* XP por mandar */
let ajustes = guarda.leer('est.ajustes', { sonido: true, vibrar: true });
encenderSonidos(ajustes.sonido !== false);
let vista = 'plan';
const plan = () => planes[actualId] || null;
const guardarLocal = () => { guarda.poner('est.planes', planes); guarda.poner('est.actual', actualId); };

/* ══ LA SALA ═════════════════════════════════════════════════════════════ */
async function sala(cuerpo, q = ''){
  const r = await llamar(`${SERVIDOR}/api/sala/${SALA}/estudio${q}`, { metodo: cuerpo ? 'POST' : 'GET', cuerpo, espera: 30000 });
  const j = await r.json().catch(() => ({}));
  if(r.status === 401 || (r.status === 403 && !/no acepta pedidos/.test(j.error || ''))){ const e = new Error('Falta la llave de La Sala en este teléfono.'); e.llave = true; throw e; }
  if(r.status === 404 && !j.error) throw new Error('La Sala todavía no tiene CARYMO: hay que publicar el servidor.');
  if(!r.ok || j.bien === false){ const e = new Error(j.error || `La Sala contestó ${r.status}.`); e.datos = j; throw e; }
  return j;
}
/* la IA: Negro (Groq) de fábrica porque es rápido; Paulina (Gemini) cuando hay fotos */
async function ia({ sistema, texto, imagenes = [], motor = imagenes.length ? 'gemini' : 'groq', tope = 6000, revisar = (x) => x }){
  if(!llave()){ const e = new Error('Falta la llave de La Sala en este teléfono.'); e.llave = true; throw e; }
  let ultimoError = null;
  for(let intento = 0; intento < 2; intento++){
    const extra = intento ? '\n\nOJO: tu respuesta anterior no era JSON válido o venía incompleta. Contesta SÓLO el JSON, completo, con comillas dobles y sin comas de más.' : '';
    const r = await llamar(`${SERVIDOR}/api/sala/${SALA}/ia-texto`, { metodo: 'POST', cuerpo: { motor, json: true, tope, sistema: sistema + extra, mensajes: [{ de: 'tu', texto }], imagenes, espera: 150000, pensarPoco: true }, espera: 165000 });
    const j = await r.json().catch(() => ({}));
    if(r.status === 401 || (r.status === 403 && !/no acepta pedidos/.test(j.error || ''))){ const e = new Error('Falta la llave de La Sala en este teléfono (o ya no sirve).'); e.llave = true; throw e; }
    if(!r.ok || j.bien === false) throw new Error(j.error || `La IA no contestó (${r.status}).`);
    /* se repara lo que se pueda (json-ia.js); si aun así no sirve, otra vuelta */
    try{ return revisar(sacarJSON(j.texto)); }
    catch(e){ ultimoError = e; }
  }
  throw new Error((ultimoError && ultimoError.message ? ultimoError.message + ' ' : '') + 'Toca «Intentar otra vez».');
}

/* ══ 1 · LO QUE SE LE PIDE A LA IA ════════════════════════════════════════ */
const corta = (t, n) => String(t ?? '').trim().slice(0, n);
function sistemaPlan(){
  return `Eres un tutor de preparatoria en Querétaro, México. Armas PLANES DE ESTUDIO para un examen, en español de México.
Contesta SÓLO con JSON válido, sin texto antes ni después, con esta forma:
{ "titulo": "Examen de <materia>", "notas": "resumen corto de lo que traen los apuntes o temas (máx 600 caracteres)",
  "unidades": [ { "titulo": "nombre corto de la unidad (2 a 5 palabras)", "frase": "una frase corta y motivadora de qué se aprende aquí", "temas": [ { "titulo": "tema (2 a 6 palabras)", "resumen": "de qué trata, 1 o 2 frases" } ] } ] }
Reglas:
- De 3 a 4 unidades, de lo básico a lo difícil (la primera son los fundamentos; la última, lo que más cuesta).
- De 2 a 3 temas por unidad, sin repetir. Sólo temas que de verdad entran en el examen.
- Si te mandan temas o fotos de apuntes, el plan se arma con ESO (no inventes otro temario).
- Nada de emojis.`;
}
function sistemaLeccion(){
  return `Eres un tutor de preparatoria en Querétaro, México. Escribes en español de México, claro y sin relleno.
Vas a escribir UNA lección corta y su cuestionario. Contesta SÓLO con JSON válido, sin texto antes ni después:
{ "leccion": { "titulo": "título corto (máximo 6 palabras)", "ideas": [ { "titulo": "2 a 4 palabras", "texto": "UNA sola idea en máximo 22 palabras, con **una** palabra clave en negritas", "icono": "un dibujo de la lista" } ], "dato": "un truco o ejemplo para recordarlo, máximo 18 palabras" },
  "preguntas": [
    { "tipo": "opcion", "pregunta": "…", "opciones": ["…", "…", "…", "…"], "correcta": 0, "porque": "por qué es la correcta, 1 o 2 frases", "pista": "una pista que NO da la respuesta" },
    { "tipo": "hueco", "frase": "una oración con ___ donde va la palabra que falta", "respuesta": "la palabra (1 a 3 palabras)", "distractores": ["…", "…", "…"], "porque": "…", "pista": "…" },
    { "tipo": "escribir", "pregunta": "pregunta que se contesta con 1 a 3 palabras", "respuesta": "la respuesta", "aceptadas": ["otras formas válidas de decirlo"], "porque": "…", "pista": "…" },
    { "tipo": "unir", "pregunta": "Conecta cada … con su …", "pares": [["concepto", "lo que le corresponde"], ["…", "…"], ["…", "…"], ["…", "…"]], "porque": "…" },
    { "tipo": "imagen", "pregunta": "¿Cuál de estas imágenes es …?", "opciones": [{ "texto": "nombre corto", "buscar": "título EXACTO de un artículo de Wikipedia en español que tenga foto", "icono": "un dibujo de la lista" }], "correcta": 0, "porque": "…" },
    { "tipo": "error", "pregunta": "En este diagrama hay UN paso mal. ¿Cuál?", "pasos": ["paso 1", "paso 2", "paso 3", "paso 4"], "error": 2, "correccion": "cómo debería decir ese paso", "porque": "…" },
    { "tipo": "ordenar", "pregunta": "Arma el diagrama de flujo de …", "pasos": ["primero", "luego", "después", "al final"], "porque": "…" },
    { "tipo": "clasificar", "pregunta": "Clasifica cada … en su grupo", "grupos": [{ "nombre": "grupo A", "items": ["…", "…"] }, { "nombre": "grupo B", "items": ["…", "…"] }], "porque": "…" }
  ] }
Reglas:
- La lección se lee en el teléfono UNA IDEA POR PANTALLA: de 3 a 4 "ideas", cortas de verdad. Nada de párrafos largos.
- "icono": escoge el dibujo que mejor ilustre cada idea, SÓLO de esta lista: ${DIBUJOS_LISTA}
- De 8 a 9 preguntas MUY VARIADAS: 2 de "opcion" y una de cada uno de los demás tipos (hueco, escribir, unir, imagen, error, ordenar, clasificar). Si el tema de plano no tiene un proceso para "error" u "ordenar", cámbialo por otro tipo, pero usa al menos 6 tipos distintos. Que todo se conteste con lo que dice la lección.
- "imagen": 4 opciones de cosas que se puedan VER (órganos, animales, lugares, objetos, personajes históricos…); cada una con su "buscar" de Wikipedia y su "icono" de la lista por si no hay foto.
- "error": de 4 a 6 pasos de un proceso real con UNO cambiado para que esté mal; "error" es su número (empieza en 0).
- "ordenar": de 4 a 6 pasos de un proceso en su orden correcto (la app los revuelve).
- "clasificar": 2 o 3 grupos con 2 a 3 elementos cada uno.
- "unir": 4 pares; "escribir": respuestas cortas que se puedan escribir en el teléfono.
- En "opcion": 4 opciones del mismo largo más o menos, UNA sola correcta; "correcta" es su número (0 a 3). Las incorrectas tienen que sonar posibles.
- En "hueco": la frase lleva EXACTAMENTE un ___ y los distractores son del mismo tipo de palabra que la respuesta.
- Nada de emojis. Nada de inventar datos: si no estás seguro de algo, no lo preguntes.`;
}

const DIBUJOS_LISTA = Object.keys(DIBUJOS).join(', ');
const dibujoValido = (n) => { const k = String(n || '').toLowerCase().trim().replace(/\s+/g, '-'); return DIBUJOS[k] ? k : ''; };
/* lo que contesta la IA se revisa antes de usarlo: una pregunta rota no entra al cuestionario */
export function normalizarPlan(j){
  const unidades = (Array.isArray(j.unidades) ? j.unidades : []).map((u) => ({
    titulo: corta(u && u.titulo, 60) || 'Unidad',
    frase: corta(u && u.frase, 160),
    temas: (Array.isArray(u && u.temas) ? u.temas : []).map((t) => typeof t === 'string' ? { titulo: corta(t, 80), resumen: '' } : { titulo: corta(t && t.titulo, 80), resumen: corta(t && t.resumen, 300) }).filter((t) => t.titulo).slice(0, 4),
  })).filter((u) => u.temas.length).slice(0, 5);
  if(!unidades.length) throw new Error('El plan llegó vacío. Prueba otra vez.');
  return { titulo: corta(j.titulo, 80), notas: corta(j.notas, 800), unidades };
}
export function normalizarLeccion(j){
  const l = j.leccion || {};
  let ideas = (Array.isArray(l.ideas) ? l.ideas : []).map((x) => typeof x === 'string' ? { titulo: '', texto: corta(x, 260), icono: '' } : { titulo: corta(x && x.titulo, 60), texto: corta(x && x.texto, 260), icono: dibujoValido(x && x.icono) }).filter((x) => x.texto).slice(0, 5);
  /* las lecciones viejas (párrafo + puntos) se vuelven ideas: así las que ya tenías también se ven ligeras */
  if(!ideas.length){
    const puntos = (Array.isArray(l.puntos) ? l.puntos : []).map((x) => corta(x, 260)).filter(Boolean);
    const primera = String(l.parrafo || '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
    ideas = [...(primera ? [{ titulo: '', texto: corta(primera, 260), icono: '' }] : []), ...puntos.map((x) => ({ titulo: '', texto: x, icono: '' }))].slice(0, 5);
  }
  const leccion = { titulo: corta(l.titulo, 120), ideas, dato: corta(l.dato, 300) };
  const preguntas = (Array.isArray(j.preguntas) ? j.preguntas : []).map((p) => {
    if(!p) return null;
    const tipo = String(p.tipo || '').toLowerCase();
    if(tipo === 'hueco' || (p.frase && p.respuesta)){
      const frase = corta(p.frase, 300), respuesta = corta(p.respuesta, 40);
      if(!respuesta || (frase.match(/_{2,}/g) || []).length !== 1) return null;
      const distractores = [...new Set((Array.isArray(p.distractores) ? p.distractores : []).map((x) => corta(x, 40)).filter((x) => x && quitarAcentos(x) !== quitarAcentos(respuesta)))].slice(0, 3);
      if(distractores.length < 2) return null;
      return { tipo: 'hueco', frase: frase.replace(/_{2,}/, '___'), respuesta, distractores, porque: corta(p.porque, 400), pista: corta(p.pista, 240) };
    }
    const base = { porque: corta(p.porque, 400), pista: corta(p.pista, 240) };
    const lista = (x, n, m) => (Array.isArray(x) ? x : []).map((y) => corta(typeof y === 'string' || typeof y === 'number' ? y : '', n)).filter(Boolean).slice(0, m);
    if(tipo === 'escribir'){ const respuesta = corta(p.respuesta, 60); if(!p.pregunta || !respuesta || respuesta.split(/\s+/).length > 5) return null; return { tipo, pregunta: corta(p.pregunta, 300), respuesta, aceptadas: lista(p.aceptadas, 60, 5), ...base }; }
    if(tipo === 'unir'){ const pares = (Array.isArray(p.pares) ? p.pares : []).map((x) => Array.isArray(x) ? [corta(x[0], 80), corta(x[1], 120)] : x && typeof x === 'object' ? [corta(x.a || x.concepto || x[0], 80), corta(x.b || x.definicion || x[1], 120)] : null).filter((x) => x && x[0] && x[1]).slice(0, 5);
      if(pares.length < 3 || new Set(pares.map((x) => quitarAcentos(x[0]))).size !== pares.length || new Set(pares.map((x) => quitarAcentos(x[1]))).size !== pares.length) return null; return { tipo, pregunta: corta(p.pregunta, 200), pares, ...base }; }
    if(tipo === 'imagen'){ const ops = (Array.isArray(p.opciones) ? p.opciones : []).map((o) => typeof o === 'string' ? { texto: corta(o, 50), buscar: corta(o, 80), icono: '' } : { texto: corta(o && (o.texto || o.nombre), 50), buscar: corta(o && o.buscar, 100), icono: dibujoValido(o && o.icono) }).filter((o) => o.texto).slice(0, 4);
      const c0 = Number(p.correcta); if(ops.length < 3 || !Number.isInteger(c0) || c0 < 0 || c0 >= ops.length || !p.pregunta) return null; return { tipo, pregunta: corta(p.pregunta, 200), opciones: ops, correcta: c0, ...base }; }
    if(tipo === 'error'){ const pasos = lista(p.pasos, 120, 7), e0 = Number(p.error); if(pasos.length < 3 || !Number.isInteger(e0) || e0 < 0 || e0 >= pasos.length) return null; return { tipo, pregunta: corta(p.pregunta, 200), pasos, error: e0, correccion: corta(p.correccion, 160) || 'otro paso', ...base }; }
    if(tipo === 'ordenar'){ const pasos = lista(p.pasos, 100, 7); if(pasos.length < 3 || new Set(pasos.map(quitarAcentos)).size !== pasos.length) return null; return { tipo, pregunta: corta(p.pregunta, 200), pasos, ...base }; }
    if(tipo === 'clasificar'){ const grupos = (Array.isArray(p.grupos) ? p.grupos : []).map((g) => ({ nombre: corta(g && g.nombre, 40), items: lista(g && g.items, 50, 4) })).filter((g) => g.nombre && g.items.length).slice(0, 3);
      if(grupos.length < 2 || grupos.reduce((a, g) => a + g.items.length, 0) < 4) return null; return { tipo, pregunta: corta(p.pregunta, 200), grupos, ...base }; }
    const opciones = (Array.isArray(p.opciones) ? p.opciones : []).map((x) => corta(x, 200)).filter(Boolean);
    const c = Number(p.correcta);
    if(opciones.length < 3 || opciones.length > 5 || !Number.isInteger(c) || c < 0 || c >= opciones.length || new Set(opciones.map(quitarAcentos)).size !== opciones.length) return null;
    return { tipo: 'opcion', pregunta: corta(p.pregunta, 300), opciones, correcta: c, porque: corta(p.porque, 400), pista: corta(p.pista, 240) };
  }).filter((p) => p && (p.pregunta || p.frase || p.pares || p.grupos || p.pasos)).slice(0, 10);
  if(!leccion.ideas.length) throw new Error('La lección llegó vacía.');
  if(preguntas.length < 3) throw new Error('El cuestionario llegó incompleto. Prueba otra vez.');
  return { leccion, preguntas };
}

/* el plan de la IA → camino: cada tema una lección; cada unidad su clase en pizarrón y sus tarjetas; al final, simulacro y examen */
export function armarCamino(datos){
  const unidades = datos.unidades.map((u, i) => {
    const temas = u.temas.map((t) => ({ id: 't' + nuevoId(), ...t }));
    /* Carlos, 12 nov: «primero una cátedra antes de cada nivel usando el pizarrón, después el nivel; y al
       inicio del conjunto de temas una explicación más general, y después tema por tema» */
    const nodos = [{ id: 'n' + nuevoId(), tipo: 'pizarra', alcance: 'unidad', titulo: u.titulo }];
    temas.forEach((t) => {
      nodos.push({ id: 'n' + nuevoId(), tipo: 'pizarra', tema: t.id, titulo: t.titulo });
      nodos.push({ id: 'n' + nuevoId(), tipo: 'quiz', tema: t.id, titulo: t.titulo });
    });
    nodos.push({ id: 'n' + nuevoId(), tipo: 'tarjetas', titulo: 'Tarjetas: ' + u.titulo });
    if(i === datos.unidades.length - 1){
      nodos.push({ id: 'n' + nuevoId(), tipo: 'simulacro', titulo: 'Simulacro' });
      nodos.push({ id: 'n' + nuevoId(), tipo: 'examen', titulo: 'Examen final' });
    }
    return { id: 'u' + nuevoId(), titulo: u.titulo, frase: u.frase, color: COLOR_UNIDAD[i % COLOR_UNIDAD.length], temas, nodos };
  });
  return unidades;
}
const todosLosNodos = (p) => p.unidades.flatMap((u) => u.nodos.map((n) => ({ ...n, unidad: u })));
/* los planes que se armaron antes del 12 nov (sin cátedras) se acomodan a la forma nueva sin perder nada:
   lo que ya pasaste no se vuelve a pedir (la cátedra de un nivel ya hecho cuenta como vista) */
export function migrarCamino(p){
  if(!p || !Array.isArray(p.unidades) || p.forma === 2) return false;
  p.progreso = p.progreso || {};
  for(const u of p.unidades){
    const viejos = u.nodos, nuevos = [];
    const general = viejos.find((n) => n.tipo === 'pizarra' && n.alcance === 'unidad') || { id: 'n' + nuevoId(), tipo: 'pizarra', alcance: 'unidad', titulo: u.titulo };
    nuevos.push(general);
    for(const t of u.temas){
      const quiz = viejos.find((n) => n.tipo === 'quiz' && n.tema === t.id);
      const cat = viejos.find((n) => n.tipo === 'pizarra' && n.tema === t.id && n.alcance !== 'unidad') || { id: 'n' + nuevoId(), tipo: 'pizarra', tema: t.id, titulo: t.titulo };
      nuevos.push(cat); if(quiz) nuevos.push(quiz);
      if(quiz && hecho(p, quiz) && !hecho(p, cat)) p.progreso[cat.id] = { hecho: true, mejor: 100, veces: 1, migrado: true };
    }
    const primero = nuevos.find((n) => n !== general && n.tipo === 'quiz');
    if(primero && hecho(p, primero) && !hecho(p, general)) p.progreso[general.id] = { hecho: true, mejor: 100, veces: 1, migrado: true };
    for(const n of viejos) if(!nuevos.includes(n) && n.tipo !== 'pizarra') nuevos.push(n);
    u.nodos = nuevos;
  }
  p.forma = 2;
  return true;
}
const hecho = (p, n) => !!(p.progreso && p.progreso[n.id] && p.progreso[n.id].hecho);
export function avanceDe(p){
  const ns = todosLosNodos(p), h = ns.filter((n) => hecho(p, n)).length;
  const frac = ns.length ? h / ns.length : 0;
  return { hechos: h, total: ns.length, pct: Math.round(frac * 100), grado: Math.min(10, 6 + 4 * frac), siguiente: ns.find((n) => !hecho(p, n)) || null };
}
const temaDe = (p, id) => { for(const u of p.unidades) for(const t of u.temas) if(t.id === id) return t; return null; };

/* ══ 2 · SONIDO Y VIBRACIÓN ══════════════════════════════════════════════
   Los sonidos son los de sonidos/ (hacer.py los arma; son nuestros). Cada uno con su función:
   toque al tocar, pop al aparecer, whoosh al abrir, bien/mal al verificar, moneda, combo, logro… */
const SON = { toque: ['toque', .55], pop: ['pop', .45], whoosh: ['whoosh', .32], bien: ['bien', .75], mal: ['mal', .6], fin: ['logro', .75], moneda: ['moneda', .65], combo: ['combo', .6], hielo: ['hielo', .75], voltear: ['voltear', .55], subir: ['subir', .7], golpe: ['golpe', .4] };
function tono(cual, extra = {}){ if(!ajustes.sonido || !cual) return; sonar(cual[0], { vol: cual[1], ...extra }); }
const vibrar = (ms) => { if(ajustes.vibrar) try{ navigator.vibrate?.(ms); }catch{} };

/* ══ 3 · AVISOS, HOJAS Y CAPAS ════════════════════════════════════════════ */
function brindis(texto, clase = '', icono = 'sparkles'){
  const d = document.createElement('div'); if(clase) d.className = clase; d.innerHTML = `${ico(icono)}${esc(texto)}`;
  /* nunca más de dos a la vez: el tercero empuja al más viejo */
  const b = $('#brindis'); b.append(d); while(b.children.length > 2) b.firstElementChild.remove(); setTimeout(() => d.remove(), 2900);
}
function hoja(titulo, html, alAbrir){
  cerrarHoja();
  const v = document.createElement('div'); v.className = 'velo'; v.id = 'velo';
  const h = document.createElement('div'); h.className = 'hoja'; h.id = 'hoja'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true'); h.setAttribute('aria-label', titulo);
  h.innerHTML = `<div class="dentro"><div class="agarre"></div>${titulo ? `<h3>${esc(titulo)}</h3>` : ''}${html}</div>`;
  v.addEventListener('click', cerrarHoja); document.body.append(v, h);
  alAbrir?.(h); h.querySelector('button, input')?.focus({ preventScroll: true });
  return h;
}
function cerrarHoja(){ $('#velo')?.remove(); $('#hoja')?.remove(); }
/* una capa encima de todo (alta, lección, cuestionario…). Se recrea entera cada vez: sin oyentes viejos colgados */
function capa(clase = ''){
  cerrarCapa(); tono(SON.whoosh);
  const c = document.createElement('section'); c.className = 'capa ' + clase; c.id = 'capa';
  $('#capas').append(c); document.body.style.overflow = 'hidden';
  return c;
}
function cerrarCapa(){ $('#capa')?.remove(); $('.hoja-res')?.remove(); document.body.style.overflow = ''; }
document.addEventListener('keydown', (e) => { if(e.key === 'Escape'){ if($('#hoja')) cerrarHoja(); } });

/* ══ 4 · XP, RACHA Y RANKING (con fila para cuando no hay red) ═══════════ */
function sumarXP(xp, motivo){
  if(!xp) return;
  const e = { id: 'x' + nuevoId(), xp: Math.round(xp), dia: hoyLocal(), motivo };
  cola.push(e); guarda.poner('est.cola', cola);
  /* lo de este teléfono se ve al instante; La Sala corrige si hace falta */
  perfil.xp = (perfil.xp || 0) + e.xp;
  if(perfil.ultimoDia !== e.dia){ const ayer = new Date(Date.now() - 864e5); const a = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
    perfil.racha = perfil.ultimoDia === a ? (perfil.racha || 0) + 1 : 1; perfil.ultimoDia = e.dia; perfil._localRacha = true; }
  guarda.poner('est.perfil', perfil);
  const fila = ranking.filas.find((f) => f.yo); if(fila){ fila.xp += e.xp; }
  pintarCabeza();
  return mandarCola();
}
let mandando = null;
async function mandarCola(){
  if(mandando) return mandando;
  if(!cola.length || !llave()) return null;
  mandando = (async () => {
    try{
      const lote = cola.slice(0, 50);
      const r = await sala({ accion: 'xp', eventos: lote });
      const ids = new Set(lote.map((x) => x.id)); cola = cola.filter((x) => !ids.has(x.id)); guarda.poner('est.cola', cola);
      const antes = posicion();
      ponerPerfil(r.perfil); ponerRanking(r.ranking);
      if(r.eventos.includes('congelada-ganada')) await fiestaHielo('Ganaste una racha congelada', 'Las rachas congeladas mantienen tu racha viva si un día no estudias.');
      if(r.eventos.includes('congelada-usada')) brindis('Usaste una racha congelada: tu racha sigue', '', 'snowflake');
      if(r.eventos.includes('racha') && r.perfil.racha > 1) brindis(`Racha de ${r.perfil.racha} días`, 'vino', 'flame');
      const despues = posicion();
      if(antes && despues && despues < antes) brindis(`Subiste al lugar ${despues} del ranking`, 'oro', 'trophy');
      return r;
    }catch(e){ if(e.llave) pintarFaltaLlave(); return null; }
    finally{ mandando = null; }
  })();
  return mandando;
}
function posicion(){ const i = ranking.filas.findIndex((f) => f.yo); return i < 0 ? 0 : i + 1; }
function ponerPerfil(p){ if(!p) return; perfil = { ...perfil, ...p }; delete perfil._localRacha; guarda.poner('est.perfil', perfil); pintarCabeza(); }
function ponerRanking(r){ if(!r) return; ranking = { semana: r.semana, filas: r.filas.map((f) => ({ ...f, yo: f.cuenta === perfil.cuenta })) }; guarda.poner('est.ranking', ranking); if(vista === 'ranking') pintarRanking(); }

/* ══ 5 · SINCRONÍA DE PLANES ══════════════════════════════════════════════ */
const porGuardar = new Set(); let reloj = null;
function guardarPlan(p){
  p.cambio = Date.now(); planes[p.id] = p; guardarLocal();
  porGuardar.add(p.id); clearTimeout(reloj); reloj = setTimeout(subirPlanes, 1200);
}
async function subirPlanes(){
  if(!llave()) return;
  for(const id of [...porGuardar]){
    const p = planes[id]; if(!p){ porGuardar.delete(id); continue; }
    try{
      const r = await sala({ accion: 'plan', plan: p });
      porGuardar.delete(id); p.t = r.t; p.progreso = r.progreso; guardarLocal();
    }catch(e){ if(e.datos && e.datos.borrado){ porGuardar.delete(id); delete planes[id]; guardarLocal(); } else break; }
  }
}
async function sincronizar(){
  if(!llave()){ pintarFaltaLlave(); return; }
  try{
    const r = await sala(null);
    perfil.cuenta = r.perfil.cuenta; ponerPerfil(r.perfil); ponerRanking(r.ranking);
    for(const x of r.planes){
      if(x.borrado){ if(planes[x.id]){ delete planes[x.id]; if(actualId === x.id) actualId = null; } continue; }
      if(!planes[x.id] || (planes[x.id].t || 0) < x.t){
        const j = await sala(null, '?plan=' + encodeURIComponent(x.id)).catch(() => null);
        if(j && j.plan){ const local = planes[x.id]; planes[x.id] = { ...j.plan, progreso: { ...(j.plan.progreso || {}), ...soloHechos(local) } }; if(migrarCamino(planes[x.id])) porGuardar.add(x.id); }
      }
    }
    /* lo que sólo existe aquí (hecho sin red) se sube */
    for(const id of Object.keys(planes)) if(!r.planes.some((x) => x.id === id)) porGuardar.add(id);
    if(!actualId || !planes[actualId]) actualId = Object.values(planes).sort((a, b) => (b.cambio || 0) - (a.cambio || 0))[0]?.id || null;
    guardarLocal(); subirPlanes(); mandarCola(); pintar();
  }catch(e){ if(e.llave) pintarFaltaLlave(); }
}
const soloHechos = (p) => { const o = {}; for(const [k, v] of Object.entries((p && p.progreso) || {})) if(v.hecho) o[k] = v; return o; };

/* ══ 6 · PINTAR ═══════════════════════════════════════════════════════════ */
function pintarCabeza(){
  const p = plan();
  $('#cabeza').hidden = !p || vista !== 'plan';
  const r = perfil.racha || 0, viva = perfil.ultimoDia === hoyLocal();
  $('#pRacha').innerHTML = `${ico('flame')}${r}`; $('#pRacha').classList.toggle('apagada', !viva); $('#pRacha').setAttribute('aria-label', `Racha de ${r} días${viva ? '' : ': estudia hoy para no perderla'}`);
  if(!p) return;
  $('#planNombre').textContent = p.titulo;
  const a = avanceDe(p);
  $('#avanceBarra').style.width = Math.max(a.pct, 9) + '%';
  $('#avancePct').textContent = a.pct + ' %';
  $('#avanceGrado').textContent = 'Grado ' + Math.floor(a.grado);
  const d = diasHasta(p.fecha);
  $('#avanceExamen').textContent = d == null ? 'Sin fecha de examen' : d < 0 ? 'El examen ya pasó' : d === 0 ? 'El examen es HOY' : d === 1 ? 'El examen es mañana' : `El examen es en ${d} días`;
}
function pintar(){
  for(const v of ['plan', 'horario', 'pizarron', 'buscar', 'ranking', 'perfil']) $('#v' + v[0].toUpperCase() + v.slice(1)).hidden = v !== vista;
  if(vista === 'pizarron' && !$('#vPizarron iframe')){ const f = document.createElement('iframe'); f.title = 'El pizarrón'; f.allow = 'autoplay; clipboard-write'; f.src = EXPLICA + location.search; $('#vPizarron').append(f); }
  $$('#nav button').forEach((b) => { if(b.dataset.ir === vista) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  pintarCabeza();
  if(vista === 'plan') pintarPlan();
  if(vista === 'horario') pintarHorario();
  if(vista === 'buscar') pintarBuscar();
  if(vista === 'ranking') pintarRanking();
  if(vista === 'perfil') pintarPerfil();
}
function pintarFaltaLlave(){
  if($('#cajaLlave')) return;
  const d = document.createElement('div'); d.id = 'cajaLlave'; d.className = 'vista';
  d.innerHTML = `<div class="aviso">Para guardar tu avance y competir en el ranking, pega aquí una vez el link de La Sala (o la llave):<input class="campo" id="llaveTxt" style="margin-top:10px" autocomplete="off" aria-label="Link o llave de La Sala"></div>`;
  $('#app').prepend(d);
  $('#llaveTxt').addEventListener('change', () => { if(ponerLlave($('#llaveTxt').value)){ d.remove(); brindis('Listo, ya quedó la llave'); sincronizar(); } });
}

/* ── el camino ── */
const ONDA = [0, .62, .85, .62, 0, -.62, -.85, -.62];
function pintarPlan(){
  const c = $('#planCuerpo'), p = plan();
  if(!p){
    c.innerHTML = `<div class="vacio entra"><div class="marca-carymo"><img src="marca/emblema.webp" width="546" height="426" alt=""><b>CARYMO</b><span>Learn. Explore. Grow.</span></div><p class="lema">Todo lo que puedes aprender, en un solo lugar.</p>
      <h1>¿Tienes un examen pronto?<em>Aquí estamos para ayudarte</em></h1>
      <p>Dinos la materia, la fecha y qué temas vienen, o súbele foto a tus apuntes. Te armamos el camino hasta el día del examen.</p>
      <button class="bt fuerte ancho" id="bCrear">${ico('plus')} Crear mi plan</button></div>`;
    $('#bCrear').addEventListener('click', alta);
    return;
  }
  const a = avanceDe(p), sig = a.siguiente;
  let html = '<div class="camino">';
  let k = 0;
  for(const u of p.unidades){
    const hechosU = u.nodos.filter((n) => hecho(p, n)).length;
    html += `<section class="unidad" style="--u:${u.color}"><div class="unidad-cab" style="background:${u.color}">
      <div class="t"><small>Unidad ${p.unidades.indexOf(u) + 1} · ${hechosU} de ${u.nodos.length}</small><h3>${esc(u.titulo)}</h3></div>${anillo(hechosU / u.nodos.length)}</div>
      ${u.frase ? `<div class="burbuja">${esc(u.frase)}</div>` : ''}`;
    const paso = 118, alto = u.nodos.length * paso + 40;
    let puntos = [];
    const nodosHtml = u.nodos.map((n, i) => {
      const x = 50 + ONDA[(k + i) % ONDA.length] * 30, y = 70 + i * paso;
      puntos.push([x, y]);
      const h = hecho(p, n), actual = sig && sig.id === n.id, cerrado = !h && !actual;
      const cl = ['nodo', h ? 'hecho' : '', actual ? 'actual' : '', cerrado ? 'cerrado' : '', n.tipo === 'examen' ? 'grande' : ''].join(' ');
      const tv = tipoVisto(n), etq = tv === 'panorama' ? 'Panorama' : tv === 'pizarra' ? 'Cátedra' : n.titulo;
      return `<button class="${cl}${tv === 'pizarra' || tv === 'panorama' ? ' catedra' : ''}" data-nodo="${n.id}" style="left:${x}%;top:${y}px;--color:${u.color}" aria-label="${esc(NOMBRE_NODO[tv])}: ${esc(n.titulo)}${h ? ' (hecho)' : cerrado ? ' (bloqueado)' : ''}">${ico(h ? 'check' : ICONO_NODO[tv])}<span class="etq">${esc(etq)}</span></button>`;
    }).join('');
    k += u.nodos.length;
    const d = puntos.map(([x, y], i) => `${i ? 'L' : 'M'}${x * 4} ${y}`).join(' ');
    html += `<div class="nodos" style="--alto:${alto}px"><svg class="senda" viewBox="0 0 400 ${alto}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" vector-effect="non-scaling-stroke"/></svg>${nodosHtml}</div></section>`;
  }
  html += '</div>';
  if(sig){
    const n = sig;
    html += `<div class="siguiente"><small>${esc(NOMBRE_NODO[tipoVisto(n)])}</small><h3>${esc(n.titulo)}</h3><button class="bt blanco ancho" data-nodo="${n.id}">${a.hechos ? 'Seguir' : 'Comenzar tu plan'}</button></div>`;
  } else {
    html += `<div class="siguiente"><small>Plan completo</small><h3>Llegaste a grado 10. Ya estás listo.</h3><button class="bt blanco ancho" id="bRepasoFinal">Hacer otro simulacro</button></div>`;
  }
  c.innerHTML = html;
  $('#bRepasoFinal')?.addEventListener('click', () => { const n = todosLosNodos(p).find((x) => x.tipo === 'simulacro'); if(n) abrirNodo(n.id, true); });
  /* el nodo actual a la vista */
  requestAnimationFrame(() => { const act = c.querySelector('.nodo.actual'); if(act && !pintarPlan.yaCentrado){ pintarPlan.yaCentrado = true; const r = act.getBoundingClientRect(); if(r.top > innerHeight * .7) scrollTo({ top: scrollY + r.top - innerHeight * .4 }); } });
}
function anillo(f){
  const r = 14, cir = 2 * Math.PI * r;
  return `<svg class="anillo" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="${r}" fill="none" stroke="#ffffff33" stroke-width="4"/><circle cx="17" cy="17" r="${r}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="${cir}" stroke-dashoffset="${cir * (1 - f)}" transform="rotate(-90 17 17)"/></svg>`;
}
$('#planCuerpo').addEventListener('click', (e) => {
  const b = e.target.closest('[data-nodo]'); if(!b) return;
  tono(SON.toque);
  abrirNodo(b.dataset.nodo);
});

/* ══ 7 · ALTA DE UN PLAN ══════════════════════════════════════════════════ */
function alta(){
  const datos = { materia: null, fecha: '', temas: [], fotos: [], extra: '' };
  const c = capa();
  const lasMaterias = listaMaterias();
  let paso = 0;
  const PASOS = 3;
  function cabeza(){ return `<div class="arriba"><button class="bt redondo fantasma" data-atras aria-label="${paso ? 'Atrás' : 'Cerrar'}">${ico(paso ? 'arrow-left' : 'x')}</button><div class="progreso"><i style="width:${(paso + 1) / PASOS * 100}%"></i></div></div>`; }
  function pintarPaso(){
    if(paso === 0){
      c.innerHTML = `${cabeza()}<div class="cuerpo entra"><div class="habla"><div class="cara">${ico('sparkles')}</div><div class="dice">¿Para qué materia es tu examen?</div></div>
        <div class="seccion-t">Tus materias</div><div class="lista">${lasMaterias.map((m) => `<button class="opcion-lista" data-mat="${esc(m.id)}" aria-pressed="${datos.materia && datos.materia.id === m.id}"><span class="punto" style="background:${m.color}">${ico('book-open')}</span>${esc(m.nombre)}</button>`).join('')}
        <button class="opcion-lista" data-mat="otra" aria-pressed="${!!(datos.materia && datos.materia.id === 'otra')}"><span class="punto" style="background:#4A3560">${ico('plus')}</span>Otra materia</button></div>
        <div id="otraCaja" ${datos.materia && datos.materia.id === 'otra' ? '' : 'hidden'} style="margin-top:10px"><input class="campo" id="otraTxt" placeholder="¿Cuál? Ej. Historia de México" value="${esc(datos.materia && datos.materia.id === 'otra' ? datos.materia.nombre : '')}" aria-label="Nombre de la materia"></div></div>
        <div class="abajo"><button class="bt fuerte ancho" data-sig ${datos.materia ? '' : 'disabled'}>Continuar</button></div>`;
    }
    if(paso === 1){
      const op = [['Mañana', 1], ['En 3 días', 3], ['En una semana', 7], ['En dos semanas', 14]];
      const f = datos.fecha ? new Date(datos.fecha + 'T12:00:00') : null;
      c.innerHTML = `${cabeza()}<div class="cuerpo entra"><div class="habla"><div class="cara">${ico('calendar')}</div><div class="dice">¿Cuándo es el examen de ${esc(datos.materia.nombre)}?</div></div>
        <div class="chips">${op.map(([t, n]) => `<button class="chip" data-dias="${n}" aria-pressed="${datos.fecha === masDias(n)}">${t}</button>`).join('')}</div>
        <div class="seccion-t">O elige el día</div><input type="date" class="campo" id="fechaTxt" min="${hoyLocal()}" value="${esc(datos.fecha)}" aria-label="Fecha del examen">
        ${f ? `<div class="calendario entra"><div class="mes">${MESES[f.getMonth()]}</div><div class="num">${f.getDate()}</div><div class="dia">${DIAS[f.getDay()]}</div></div>
          <h2 class="titulo" style="text-align:center;font-size:26px;margin-bottom:10px">Guardamos tu examen</h2>
          <div class="etiquetas"><span>${ico('book-open')}${esc(datos.materia.nombre)}</span><span>${ico('clock')}${esc(cuandoTexto(datos.fecha))}</span><span>${ico('target')}Meta: grado 10</span></div>` : ''}</div>
        <div class="abajo"><button class="bt fuerte ancho" data-sig ${datos.fecha ? '' : 'disabled'}>Continuar</button></div>`;
    }
    if(paso === 2){
      c.innerHTML = `${cabeza()}<div class="cuerpo entra"><div class="habla"><div class="cara">${ico('notebook-pen')}</div><div class="dice">¿Qué temas tiene tu examen de ${esc(datos.materia.nombre)}?</div></div>
        <div class="seccion-t">Sube tu material de estudio</div>
        <div class="fotos">${[0, 1, 2].map((i) => `<label class="foto-hueco" aria-label="Agregar foto de tus apuntes">${datos.fotos[i] ? `<img src="${datos.fotos[i].url}" alt="Foto ${i + 1} de tus apuntes">` : ico('plus')}<input type="file" accept="image/*" hidden data-foto="${i}"></label>`).join('')}</div>
        <div class="seccion-t">O escribe los temas</div>
        <div class="chips" id="chipsTemas">${datos.temas.map((t, i) => `<button class="chip" aria-pressed="true" data-quitar="${i}" aria-label="Quitar ${esc(t)}">${esc(t)} ${ico('x')}</button>`).join('')}</div>
        <form id="fTema" style="display:flex;gap:8px;margin-top:10px"><input class="campo" id="temaTxt" placeholder="Ej. Sistema circulatorio" aria-label="Tema del examen" autocomplete="off"><button class="bt" aria-label="Agregar tema">${ico('plus')}</button></form>
        <div class="seccion-t">¿Algo más que deba saber? (opcional)</div>
        <textarea class="campo" id="extraTxt" placeholder="Ej. «La maestra dijo que viene todo el bloque 2 y que pregunta mucho de fechas».">${esc(datos.extra)}</textarea>
        <p style="color:var(--suave);font-size:13px;margin-top:10px">${datos.fotos.length ? 'Con fotos lo arma Paulina (las lee con cuidado): tarda como un minuto.' : 'Lo arma Negro, en unos segundos.'}</p>
        <div class="aviso" id="altaAviso" hidden></div></div>
        <div class="abajo"><button class="bt fuerte ancho" data-sig ${datos.temas.length || datos.fotos.length ? '' : 'disabled'}>Preparar mi plan</button></div>`;
      $('#fTema').addEventListener('submit', (e) => { e.preventDefault(); const t = $('#temaTxt').value.trim(); if(t && datos.temas.length < 15){ datos.temas.push(t.slice(0, 80)); datos.extra = $('#extraTxt').value; pintarPaso(); $('#temaTxt').focus(); } });
      $('#extraTxt').addEventListener('input', () => { datos.extra = $('#extraTxt').value; });
    }
  }
  c.addEventListener('click', async (e) => {
    const t = e.target;
    if(t.closest('[data-atras]')){ if(paso){ paso--; pintarPaso(); } else cerrarCapa(); return; }
    const m = t.closest('[data-mat]');
    if(m){
      if(m.dataset.mat === 'otra'){ datos.materia = { id: 'otra', nombre: $('#otraTxt')?.value.trim() || '', color: '#4A3560' }; pintarPaso(); $('#otraTxt').focus(); }
      else { const x = lasMaterias.find((y) => y.id === m.dataset.mat); datos.materia = { id: x.id, nombre: x.nombre, color: x.color }; pintarPaso(); }
      return;
    }
    const d = t.closest('[data-dias]'); if(d){ datos.fecha = masDias(+d.dataset.dias); pintarPaso(); return; }
    const q = t.closest('[data-quitar]'); if(q){ datos.temas.splice(+q.dataset.quitar, 1); pintarPaso(); return; }
    if(t.closest('[data-sig]')){
      if(paso === 0 && datos.materia.id === 'otra' && !datos.materia.nombre){ $('#otraTxt').focus(); return; }
      if(paso < 2){ paso++; pintarPaso(); return; }
      prepararPlan(datos);
    }
  });
  c.addEventListener('input', (e) => {
    if(e.target.id === 'otraTxt'){ datos.materia = { id: 'otra', nombre: e.target.value.trim(), color: '#4A3560' }; $('[data-sig]', c).disabled = !datos.materia.nombre; }
  });
  c.addEventListener('change', async (e) => {
    if(e.target.id === 'fechaTxt'){ datos.fecha = e.target.value; pintarPaso(); }
    if(e.target.dataset.foto != null){ const f = e.target.files[0]; if(!f) return; const x = await achicar(f); if(x){ datos.fotos[+e.target.dataset.foto] = x; datos.fotos = datos.fotos.filter(Boolean); pintarPaso(); } }
  });
  pintarPaso();
}
function listaMaterias(){
  /* avisos/datos.js deja MATERIAS como `const` del script clásico: se ve desde aquí por nombre */
  let m = [];
  try{ m = new Function('return typeof MATERIAS !== "undefined" ? MATERIAS : []')(); }catch{}
  return m.filter((x) => !x.oficial && x.id !== 'general' && x.id !== 'efisica');
}
const masDias = (n) => { const d = new Date(Date.now() + n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const cuandoTexto = (f) => { const d = diasHasta(f); return d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : d < 0 ? 'Ya pasó' : `En ${d} días`; };
async function achicar(f){
  const img = await createImageBitmap(f).catch(() => null); if(!img) return null;
  const k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); const url = cv.toDataURL('image/jpeg', .82);
  return { mime: 'image/jpeg', data: url.split(',')[1], url };
}

/* «Déjame preparar tu plan»: el camino se arma mientras la IA piensa */
async function prepararPlan(datos, anadirA = null){
  const c = capa();
  const pasos = ['Leyendo tus temas', 'Ordenándolos de lo fácil a lo difícil', 'Armando tu camino'];
  c.innerHTML = `<div class="cuerpo"><div class="preparando entra"><div class="mini-camino" id="mini">${[[77, 0], [130, 30], [100, 70], [40, 100], [77, 130]].map(([x, y]) => `<i style="left:${x - 23}px;top:${y - 20}px"></i>`).join('')}</div>
    <h2>Déjame preparar tu plan</h2><p style="color:var(--suave)" id="prepTxt">Organizándolo en el orden correcto</p>
    <ul class="pasos-prep">${pasos.map((t) => `<li><span class="ca">${ico('check')}</span>${t}</li>`).join('')}</ul><div class="aviso" id="prepAviso" hidden></div></div></div>`;
  const bolas = $$('#mini i', c), lis = $$('.pasos-prep li', c);
  let k = 0; const giro = setInterval(() => { bolas.forEach((b, i) => b.classList.toggle('ve', i <= k % (bolas.length + 1))); k++; if(k === 3) lis[0].classList.add('ya'); if(k === 8) lis[1].classList.add('ya'); }, 450);
  try{
    const texto = `Materia: ${datos.materia.nombre}\nFecha del examen: ${datos.fecha} (${cuandoTexto(datos.fecha)})\n`
      + (datos.temas.length ? `Temas que me dijeron que vienen:\n- ${datos.temas.join('\n- ')}\n` : '')
      + (datos.extra ? `Lo que dijo el alumno: ${datos.extra}\n` : '')
      + (datos.fotos.length ? 'Te mando fotos de mis apuntes: arma el plan con lo que dicen.' : '')
      + (anadirA ? `\nYA TENGO estas unidades (no las repitas, arma SÓLO unidades nuevas con lo nuevo): ${anadirA.unidades.map((u) => u.titulo).join(', ')}` : '');
    const j = await ia({ sistema: sistemaPlan(), texto, imagenes: datos.fotos.map(({ mime, data }) => ({ mime, data })), tope: 4000, revisar: normalizarPlan });
    clearInterval(giro); bolas.forEach((b) => b.classList.add('ve')); lis.forEach((l) => l.classList.add('ya'));
    let p;
    if(anadirA){
      p = anadirA;
      /* lo nuevo entra ANTES del simulacro y el examen, que se quedan al final */
      const finales = p.unidades[p.unidades.length - 1].nodos.filter((n) => n.tipo === 'simulacro' || n.tipo === 'examen');
      p.unidades[p.unidades.length - 1].nodos = p.unidades[p.unidades.length - 1].nodos.filter((n) => !finales.includes(n));
      const nuevas = armarCamino({ unidades: j.unidades }).map((u, i) => ({ ...u, color: COLOR_UNIDAD[(p.unidades.length + i) % COLOR_UNIDAD.length], nodos: u.nodos.filter((n) => n.tipo !== 'simulacro' && n.tipo !== 'examen') }));
      p.unidades.push(...nuevas); p.unidades[p.unidades.length - 1].nodos.push(...finales);
      p.notas = [p.notas, j.notas].filter(Boolean).join('\n').slice(0, 1500);
    } else {
      p = { id: 'p' + nuevoId(), titulo: j.titulo || `Examen de ${datos.materia.nombre}`, materia: datos.materia.nombre, color: datos.materia.color, fecha: datos.fecha, notas: j.notas, extra: datos.extra,
        creado: Date.now(), unidades: armarCamino(j), contenido: {}, progreso: {}, forma: 2 };
    }
    actualId = p.id; guardarPlan(p);
    await espera(650);
    cerrarCapa(); vista = 'plan'; pintarPlan.yaCentrado = false; pintar();
    brindis(anadirA ? 'Agregamos lo nuevo a tu plan' : 'Tu plan está listo', '', 'sparkles');
    /* la primera lección se prepara sola mientras miras el camino */
    precargar(p);
  }catch(e){
    clearInterval(giro);
    const a = $('#prepAviso', c); a.hidden = false; a.textContent = e.message || String(e);
    a.insertAdjacentHTML('afterend', `<div style="display:grid;gap:10px;margin-top:14px"><button class="bt fuerte ancho" id="bReintentar">Intentar otra vez</button><button class="bt ancho" id="bCancelar">Volver</button></div>`);
    $('#bReintentar').addEventListener('click', () => prepararPlan(datos, anadirA)); $('#bCancelar').addEventListener('click', () => { cerrarCapa(); pintar(); });
    if(e.llave) pintarFaltaLlave();
  }
}

/* ══ 8 · LECCIONES (se piden cuando hacen falta, y la siguiente se prepara sola) ══ */
const pidiendo = new Map();
function contenidoDe(p, temaId){
  if(p.contenido && p.contenido[temaId]) return Promise.resolve(p.contenido[temaId]);
  if(pidiendo.has(temaId)) return pidiendo.get(temaId);
  const t = temaDe(p, temaId);
  const u = p.unidades.find((x) => x.temas.some((y) => y.id === temaId));
  const pr = (async () => {
    const j = await ia({ sistema: sistemaLeccion(), tope: 7000, revisar: normalizarLeccion,
      texto: `Materia: ${p.materia}\nUnidad: ${u ? u.titulo : ''}\nTema: ${t.titulo}\n${t.resumen ? 'De qué trata: ' + t.resumen + '\n' : ''}${p.notas ? 'Lo que traen los apuntes del alumno: ' + p.notas + '\n' : ''}${p.extra ? 'Lo que dijo el alumno: ' + p.extra : ''}` });
    const actual = planes[p.id] || p; actual.contenido = actual.contenido || {}; actual.contenido[temaId] = j; guardarPlan(actual);
    return j;
  })();
  pidiendo.set(temaId, pr); pr.finally(() => pidiendo.delete(temaId)).catch(() => {});
  return pr;
}
function precargar(p){
  const sig = todosLosNodos(p).filter((n) => !hecho(p, n) && n.tipo === 'quiz').slice(0, 2);
  for(const n of sig) if(!(p.contenido || {})[n.tema]) contenidoDe(p, n.tema).catch(() => {});
}

async function abrirNodo(id, repaso = false){
  const p = plan(); if(!p) return;
  const ns = todosLosNodos(p), n = ns.find((x) => x.id === id); if(!n) return;
  const a = avanceDe(p);
  if(!hecho(p, n) && a.siguiente && a.siguiente.id !== n.id && !repaso){
    vibrar(30); tono(SON.golpe); brindis('Primero termina el que está brillando', 'vino', 'target'); return;
  }
  if(n.tipo === 'quiz') return abrirLeccion(p, n);
  if(n.tipo === 'pizarra') return abrirPizarra(p, n);
  if(n.tipo === 'tarjetas') return abrirTarjetas(p, n);
  if(n.tipo === 'simulacro' || n.tipo === 'examen') return abrirSimulacro(p, n);
}

/* «Preparando tu cuestionario… 12 %» */
function pantallaPreparando(c, titulo){
  const pasos = ['Revisando lo que ya contestaste', 'Adaptando al nivel del examen', 'Buscando las preguntas que más ayudan'];
  c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Cerrar">${ico('x')}</button></div><div class="cuerpo"><div class="preparando entra"><div class="sello" style="width:96px;height:96px">${ico('notebook-pen')}</div>
    <h2>Preparando tu cuestionario…</h2><p style="color:var(--suave)">${esc(titulo)}</p><div class="pct" id="pct">0 %</div><div class="progreso" style="max-width:340px;margin:0 auto"><i id="pctBarra"></i></div>
    <ul class="pasos-prep">${pasos.map((t) => `<li><span class="ca">${ico('check')}</span>${t}</li>`).join('')}</ul><div class="aviso" id="prepAviso" hidden></div></div></div>`;
  $('[data-cerrar]', c).addEventListener('click', () => { cerrarCapa(); pintar(); });
  let v = 0; const lis = $$('.pasos-prep li', c);
  const giro = setInterval(() => { v = Math.min(94, v + (100 - v) * .06); $('#pct', c).textContent = Math.round(v) + ' %'; $('#pctBarra', c).style.width = v + '%'; lis.forEach((l, i) => l.classList.toggle('ya', v > 20 + i * 28)); }, 300);
  return { fin(){ clearInterval(giro); }, error(msg, reintentar){ clearInterval(giro); const a = $('#prepAviso', c); a.hidden = false; a.textContent = msg;
    a.insertAdjacentHTML('afterend', `<button class="bt fuerte ancho" style="margin-top:12px" id="bReintentar">Intentar otra vez</button>`); $('#bReintentar').addEventListener('click', reintentar); } };
}

async function abrirLeccion(p, n){
  const c = capa();
  let cont = (p.contenido || {})[n.tema];
  if(!cont){
    const prep = pantallaPreparando(c, n.titulo);
    try{ cont = await contenidoDe(p, n.tema); prep.fin(); }
    catch(e){ prep.error(e.message || String(e), () => abrirLeccion(plan(), n)); if(e.llave) pintarFaltaLlave(); return; }
    if($('#capa') !== c) return;     /* la cerró mientras esperaba */
  }
  /* LA LECCIÓN, TIPO HISTORIAS (Carlos, 12 nov: «esto está horrible y excesivamente sobrecargado»):
     una idea por pantalla, máximo dos o tres renglones, con su dibujo que se traza solo.
     Se avanza tocando la derecha (o «Siguiente») y se regresa tocando la izquierda. */
  const l = cont.leccion;
  const ideas = (l.ideas && l.ideas.length ? l.ideas : [{ titulo: '', texto: l.titulo || n.titulo, icono: '' }]);
  const tarjetas = [...ideas.map((x) => ({ ...x, tipo: 'idea' })), ...(l.dato ? [{ tipo: 'dato', titulo: 'Para recordarlo', texto: l.dato, icono: 'lightbulb' }] : [])];
  let k = 0;
  const dibujoDe = (nombre, i) => {
    const d = DIBUJOS[nombre] || DIBUJOS[['sparkles', 'book-open', 'brain', 'lightbulb', 'target'][i % 5]] || '';
    /* cada trazo del dibujo con pathLength=1: el CSS lo dibuja de 0 a 1, uno tras otro */
    let n2 = 0;
    return `<svg class="dib-idea" viewBox="0 0 24 24" aria-hidden="true">${d.replace(/<(path|circle|rect|line|polyline|polygon|ellipse)\b/g, (m) => `${m} pathLength="1" style="--i:${n2++}"`)}</svg>`;
  };
  function pintarTarjeta(dir = 1){
    const t = tarjetas[k], ultima = k === tarjetas.length - 1;
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Cerrar">${ico('x')}</button>
        <div class="segmentos" aria-label="Idea ${k + 1} de ${tarjetas.length}">${tarjetas.map((_, i) => `<i class="${i < k ? 'ya' : i === k ? 'ahora' : ''}"></i>`).join('')}</div></div>
      <article class="cuerpo historia ${dir > 0 ? 'entra' : 'entra-izq'} ${t.tipo === 'dato' ? 'es-dato' : ''}" aria-live="polite">
        ${k === 0 ? `<p class="tema-hist">${esc(l.titulo || n.titulo)}</p>` : ''}
        <div class="aro-dib">${dibujoDe(t.icono, k)}</div>
        ${t.titulo ? `<h2>${esc(t.titulo)}</h2>` : ''}
        <p class="txt-hist">${negritas(t.texto)}</p>
        ${ultima ? `<div class="acciones-mini"><button data-gusta="1" aria-label="Me sirvió" aria-pressed="false">${ico('thumbs-up')}</button><button data-gusta="0" aria-label="No me sirvió" aria-pressed="false">${ico('thumbs-down')}</button><button data-copiar aria-label="Copiar la lección">${ico('copy')}</button><button data-pizarron aria-label="Que me lo expliquen en el pizarrón">${ico('presentation')}</button></div>` : ''}
      </article>
      <button class="zona-atras" data-atras aria-label="Idea anterior" ${k ? '' : 'hidden'}></button>
      <div class="abajo">${ultima ? '<button class="bt blanco ancho" data-empezar>Empezar cuestionario</button>' : '<button class="bt blanco ancho" data-sig>Siguiente</button>'}</div>`;
  }
  c.addEventListener('click', async (e) => {
    if(e.target.closest('[data-cerrar]')){ cerrarCapa(); pintar(); return; }
    if(e.target.closest('[data-atras]')){ if(k){ k--; tono(SON.voltear); pintarTarjeta(-1); } return; }
    if(e.target.closest('[data-sig]') || (e.target.closest('.historia') && !e.target.closest('button') && k < tarjetas.length - 1)){ k++; tono(SON.voltear); pintarTarjeta(1); return; }
    const g = e.target.closest('[data-gusta]'); if(g){ $$('[data-gusta]', c).forEach((x) => x.setAttribute('aria-pressed', x === g)); const pp = plan(); pp.progreso[n.id] = { ...(pp.progreso[n.id] || {}), gusto: +g.dataset.gusta }; guardarPlan(pp); brindis('Gracias, eso nos ayuda a explicar mejor', '', 'sparkles'); return; }
    if(e.target.closest('[data-copiar]')){ try{ await navigator.clipboard.writeText([l.titulo, ...tarjetas.map((x) => (x.titulo ? x.titulo + ': ' : '') + x.texto.replace(/\*\*/g, ''))].filter(Boolean).join('\n\n')); brindis('Copiada', '', 'copy'); }catch{ brindis('No se pudo copiar', 'vino', 'x'); } return; }
    if(e.target.closest('[data-pizarron]')){ abrirPizarra(plan(), { id: null, titulo: n.titulo, tema: n.tema }); return; }
    if(e.target.closest('[data-empezar]')) cuestionario(plan(), n, cont.preguntas, { leccion: true });
  });
  /* con teclado también: flechas para pasar */
  c.addEventListener('keydown', (e) => { if(e.key === 'ArrowRight' && k < tarjetas.length - 1){ k++; pintarTarjeta(1); } if(e.key === 'ArrowLeft' && k){ k--; pintarTarjeta(-1); } });
  pintarTarjeta(1);
}


/* ══ 9 · EL CUESTIONARIO ══════════════════════════════════════════════════
   Carlos, 12 nov: «no sólo quiz: conectar ideas, escribir la respuesta con alta tolerancia de errores de
   dedo, elegir la imagen correcta, un diagrama donde digas dónde está el error, crear tú diagramas de
   flujo y otros elementos para responder; y el combo en CADA respuesta correcta seguida, con sonido,
   animación y efectos». Cada tipo es una pieza con la misma forma:
     pintar(q) → HTML · tocar(e, q) → true si cambió algo · listo(q) · revisar(q) → { bien, correcta, nota }
     marcar(q, r) → pinta en la pantalla qué estaba bien y qué no. */
const distancia = (a, b) => {
  const m = a.length, n = b.length; if(!m) return n; if(!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for(let i = 1; i <= m; i++){ const cur = [i]; for(let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
};
const limpiaResp = (t) => quitarAcentos(t).replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\b(el|la|los|las|un|una|unos|unas|de|del)\b/g, ' ').replace(/\s+/g, ' ').trim();
/* «alta tolerancia de errores de dedo»: sin acentos, sin artículos y con hasta 1 error por cada 4 letras */
export function respuestaParecida(dada, buenas){
  const d = limpiaResp(dada); if(!d) return { bien: false };
  for(const b0 of buenas){
    const b = limpiaResp(b0); if(!b) continue;
    if(d === b) return { bien: true, exacta: true, de: b0 };
    const tol = Math.max(1, Math.floor(b.length / 4));
    if(distancia(d, b) <= tol) return { bien: true, exacta: false, de: b0 };
    /* «el corazón bombea» contra «corazón»: la palabra clave adentro también cuenta si es corta la respuesta */
    if(b.split(' ').length === 1 && d.split(' ').some((w) => distancia(w, b) <= Math.max(1, Math.floor(b.length / 4)))) return { bien: true, exacta: false, de: b0 };
  }
  return { bien: false };
}

const EJ = {
  opcion: {
    pintar: (q) => `<div class="habla"><div class="cara">${ico('sparkles')}</div><div class="dice">${esc(q.pregunta)}</div></div>
      <div class="opciones" role="radiogroup" aria-label="Opciones">${q.opciones.map((o, k) => `<button class="opc" role="radio" data-op="${k}" aria-pressed="false" aria-checked="false">${esc(o)}</button>`).join('')}</div>`,
    tocar(e, q, c){ const op = e.target.closest('[data-op]'); if(!op || op.disabled) return false; q._r = +op.dataset.op; $$('.opc', c).forEach((b) => { const s = b === op; b.setAttribute('aria-pressed', s); b.setAttribute('aria-checked', s); }); tono(SON.toque); return true; },
    listo: (q) => q._r != null,
    revisar: (q) => ({ bien: q._r === q.correcta, correcta: q.opciones[q.correcta] }),
    marcar(q, r, c){ $$('.opc', c).forEach((b) => { b.disabled = true; const k = +b.dataset.op; if(k === q.correcta) b.classList.add('bien'); else if(k === q._r) b.classList.add('mal'); }); },
  },
  hueco: {
    pintar(q){ const [antes, despues] = q.frase.split('___'); q._fichas ||= barajar([q.respuesta, ...q.distractores]);
      return `<p class="instruccion">Completa la frase</p><p class="hueco-frase">${esc(antes)}<span class="hueco" id="hueco" aria-label="Espacio para la respuesta"></span>${esc(despues)}</p>
        <div class="fichas">${q._fichas.map((f, k) => `<div class="ficha-lugar" data-lugar="${k}"><button class="ficha" data-ficha="${k}">${esc(f)}</button></div>`).join('')}</div>`; },
    tocar(e, q, c){ const f = e.target.closest('[data-ficha]'); if(!f || f.disabled) return false;
      const hueco = $('#hueco', c), k = +f.dataset.ficha, desde = f.getBoundingClientRect();
      if(f.parentElement === hueco){ $(`[data-lugar="${k}"]`, c).append(f); hueco.classList.remove('lleno'); q._r = null; }
      else { const otra = hueco.querySelector('.ficha'); if(otra) $(`[data-lugar="${otra.dataset.ficha}"]`, c).append(otra); hueco.append(f); hueco.classList.add('lleno'); q._r = k; }
      volar(f, desde); tono(SON.pop); return true; },
    listo: (q) => q._r != null,
    revisar: (q) => ({ bien: quitarAcentos(q._fichas[q._r]) === quitarAcentos(q.respuesta), correcta: q.respuesta }),
    marcar(q, r, c){ $('#hueco', c).classList.add(r.bien ? 'bien' : 'mal'); $$('.ficha', c).forEach((b) => { b.disabled = true; }); },
  },
  escribir: {
    pintar: (q) => `<div class="habla"><div class="cara">${ico('pencil')}</div><div class="dice">${esc(q.pregunta)}</div></div>
      <label class="escribe"><span>Escribe tu respuesta</span><input id="escribe" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Aquí, como te salga"></label>
      <p class="nota-escribe">No importan los acentos ni los errores de dedo.</p>`,
    entrada(e, q){ if(e.target.id !== 'escribe') return false; q._r = e.target.value; return true; },
    listo: (q) => !!(q._r && q._r.trim()),
    revisar(q){ const r = respuestaParecida(q._r, [q.respuesta, ...(q.aceptadas || [])]); return { bien: r.bien, correcta: q.respuesta, nota: r.bien && !r.exacta ? `Casi perfecto: se escribe «${q.respuesta}».` : '' }; },
    marcar(q, r, c){ const i = $('#escribe', c); i.disabled = true; i.classList.add(r.bien ? 'bien' : 'mal'); },
  },
  unir: {
    pintar(q){ q._izq ||= barajar(q.pares.map((p, k) => ({ t: p[0], k }))); q._der ||= barajar(q.pares.map((p, k) => ({ t: p[1], k }))); q._hechos ||= []; q._err = q._err || 0;
      return `<p class="instruccion">${esc(q.pregunta || 'Conecta cada idea con la que le corresponde')}</p>
        <div class="unir"><div class="col">${q._izq.map((x) => `<button class="pieza-u" data-u="i${x.k}">${esc(x.t)}</button>`).join('')}</div><div class="col">${q._der.map((x) => `<button class="pieza-u" data-u="d${x.k}">${esc(x.t)}</button>`).join('')}</div></div>`; },
    tocar(e, q, c){
      const b = e.target.closest('[data-u]'); if(!b || b.disabled) return false;
      const lado = b.dataset.u[0], k = +b.dataset.u.slice(1);
      if(lado === 'i' || q._sel == null){ if(lado === 'd'){ q._sel = null; } $$('.pieza-u', c).forEach((x) => x.classList.remove('sel')); if(lado === 'i'){ q._sel = k; b.classList.add('sel'); tono(SON.toque); } return true; }
      if(q._sel === k){
        const color = ['#AC27FF', '#C2406B', '#3F7BE0', '#1FA37A', '#E08A2E', '#8E5CF5'][q._hechos.length % 6];
        for(const s of [`i${k}`, `d${k}`]){ const x = $(`[data-u="${s}"]`, c); x.disabled = true; x.classList.remove('sel'); x.classList.add('hecho'); x.style.setProperty('--par', color); x.animate([{ transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 260 }); }
        q._hechos.push(k); tono(SON.pop);
      } else {
        q._err++; tono(SON.golpe); vibrar(30);
        for(const x of [b, $(`[data-u="i${q._sel}"]`, c)]) x.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 240 });
      }
      q._sel = null; $$('.pieza-u', c).forEach((x) => x.classList.remove('sel'));
      return true;
    },
    listo: (q) => (q._hechos || []).length === q.pares.length,
    revisar: (q) => ({ bien: !q._err, correcta: q.pares.map((p) => `${p[0]} → ${p[1]}`).join(' · '), nota: q._err ? `Las conectaste todas, pero con ${q._err} ${q._err === 1 ? 'intento fallido' : 'intentos fallidos'}.` : '' }),
    marcar(){},
  },
  imagen: {
    pintar(q){ q._ops ||= barajar(q.opciones.map((o, k) => ({ ...o, k })));
      return `<div class="habla"><div class="cara">${ico('image-plus')}</div><div class="dice">${esc(q.pregunta)}</div></div>
        <div class="imagenes">${q._ops.map((o) => `<button class="img-op" data-img="${o.k}" aria-label="Opción ${esc(o.texto)}"><span class="foto-op" data-buscar="${esc(o.buscar || '')}" data-icono="${esc(o.icono || '')}"></span><span class="pie-op">${esc(o.texto)}</span></button>`).join('')}</div>`; },
    montar(q, c){
      /* la foto de Wikipedia si la hay; si no, el dibujo; mientras, el dibujo */
      for(const s of $$('.foto-op', c)){
        const icono = s.dataset.icono; s.innerHTML = dibujoMini(icono);
        if(s.dataset.buscar) buscarImagen(s.dataset.buscar).then((r) => { if(!r || !s.isConnected) return; const im = new Image(); let i = 0; im.alt = ''; im.onload = () => { s.innerHTML = ''; s.append(im); }; im.onerror = () => { i++; if(r.fuentes && r.fuentes[i]) im.src = r.fuentes[i]; }; im.src = (r.fuentes && r.fuentes[0]) || r.src; });
      }
    },
    tocar(e, q, c){ const b = e.target.closest('[data-img]'); if(!b || b.disabled) return false; q._r = +b.dataset.img; $$('.img-op', c).forEach((x) => x.classList.toggle('sel', x === b)); tono(SON.toque); return true; },
    listo: (q) => q._r != null,
    revisar: (q) => ({ bien: q._r === q.correcta, correcta: q.opciones[q.correcta].texto }),
    marcar(q, r, c){ $$('.img-op', c).forEach((b) => { b.disabled = true; b.classList.add('revelada'); const k = +b.dataset.img; if(k === q.correcta) b.classList.add('bien'); else if(k === q._r) b.classList.add('mal'); }); },
  },
  error: {
    pintar: (q) => `<p class="instruccion">${esc(q.pregunta || 'Toca el paso que está mal')}</p>
      <div class="flujo">${q.pasos.map((p, k) => `${k ? `<span class="flecha-f">${ico('arrow-down')}</span>` : ''}<button class="caja-f" data-err="${k}">${esc(p)}</button>`).join('')}</div>`,
    tocar(e, q, c){ const b = e.target.closest('[data-err]'); if(!b || b.disabled) return false; q._r = +b.dataset.err; $$('.caja-f', c).forEach((x) => x.classList.toggle('sel', x === b)); tono(SON.toque); return true; },
    listo: (q) => q._r != null,
    revisar: (q) => ({ bien: q._r === q.error, correcta: `«${q.pasos[q.error]}» → ${q.correccion}` }),
    marcar(q, r, c){ $$('.caja-f', c).forEach((b) => { b.disabled = true; const k = +b.dataset.err; if(k === q.error){ b.classList.add('mal-real'); b.insertAdjacentHTML('beforeend', `<small class="corrige">Debía decir: ${esc(q.correccion)}</small>`); } else if(k === q._r) b.classList.add('mal'); }); },
  },
  ordenar: {
    pintar(q){ q._fichas ||= barajar(q.pasos.map((t, k) => ({ t, k }))); q._puestos ||= [];
      return `<p class="instruccion">${esc(q.pregunta || 'Arma el diagrama en orden')}</p>
        <div class="flujo armar">${q.pasos.map((_, k) => `${k ? `<span class="flecha-f">${ico('arrow-down')}</span>` : ''}<div class="hueco-f" data-hueco="${k}"><span class="n-f">${k + 1}</span></div>`).join('')}</div>
        <div class="fichas sueltas">${q._fichas.map((f, j) => `<div class="ficha-lugar" data-lugar-o="${j}"><button class="ficha" data-ord="${j}">${esc(f.t)}</button></div>`).join('')}</div>`; },
    tocar(e, q, c){
      const f = e.target.closest('[data-ord]'); if(!f || f.disabled) return false;
      const j = +f.dataset.ord, desde = f.getBoundingClientRect(), ya = q._puestos.indexOf(j);
      if(ya >= 0){ q._puestos[ya] = undefined; $(`[data-lugar-o="${j}"]`, c).append(f); }
      else { const libre = q.pasos.findIndex((_, k) => q._puestos[k] == null); if(libre < 0) return false; q._puestos[libre] = j; $(`[data-hueco="${libre}"]`, c).append(f); }
      volar(f, desde); tono(SON.pop); return true;
    },
    listo: (q) => q.pasos.every((_, k) => q._puestos[k] != null),
    revisar: (q) => ({ bien: q.pasos.every((_, k) => q._fichas[q._puestos[k]].k === k), correcta: q.pasos.map((p, k) => `${k + 1}. ${p}`).join('  ') }),
    marcar(q, r, c){ q.pasos.forEach((_, k) => { const h = $(`[data-hueco="${k}"]`, c); h.classList.add(q._fichas[q._puestos[k]].k === k ? 'bien' : 'mal'); }); $$('[data-ord]', c).forEach((b) => { b.disabled = true; }); },
  },
  clasificar: {
    pintar(q){ q._items ||= barajar(q.grupos.flatMap((g, gi) => g.items.map((t) => ({ t, gi })))); q._en ||= {};
      return `<p class="instruccion">${esc(q.pregunta || 'Toca una ficha y luego el grupo donde va')}</p>
        <div class="grupos">${q.grupos.map((g, gi) => `<button class="grupo" data-grupo="${gi}"><b>${esc(g.nombre)}</b><span class="dentro-g" data-dentro="${gi}"></span></button>`).join('')}</div>
        <div class="fichas sueltas">${q._items.map((x, j) => `<div class="ficha-lugar" data-lugar-c="${j}"><button class="ficha" data-cla="${j}">${esc(x.t)}</button></div>`).join('')}</div>`; },
    tocar(e, q, c){
      const f = e.target.closest('[data-cla]');
      if(f && !f.disabled){ const j = +f.dataset.cla;
        if(q._en[j] != null){ const desde = f.getBoundingClientRect(); delete q._en[j]; $(`[data-lugar-c="${j}"]`, c).append(f); volar(f, desde); q._sel = null; tono(SON.pop); }
        else { q._sel = j; $$('[data-cla]', c).forEach((x) => x.classList.toggle('sel', x === f)); tono(SON.toque); }
        return true; }
      const g = e.target.closest('[data-grupo]');
      if(g && q._sel != null){ const fi = $(`[data-cla="${q._sel}"]`, c), desde = fi.getBoundingClientRect(); q._en[q._sel] = +g.dataset.grupo; fi.classList.remove('sel'); $(`[data-dentro="${g.dataset.grupo}"]`, c).append(fi); volar(fi, desde); q._sel = null; tono(SON.pop); return true; }
      return false;
    },
    listo: (q) => q._items.every((_, j) => q._en[j] != null),
    revisar: (q) => ({ bien: q._items.every((x, j) => q._en[j] === x.gi), correcta: q.grupos.map((g) => `${g.nombre}: ${g.items.join(', ')}`).join(' · ') }),
    marcar(q, r, c){ q._items.forEach((x, j) => { const b = $(`[data-cla="${j}"]`, c); b.disabled = true; b.classList.add(q._en[j] === x.gi ? 'bien' : 'mal'); }); },
  },
};
const INSTRUCCION = { opcion: 'Elige la correcta', hueco: 'Completa', escribir: 'Escribe', unir: 'Conecta', imagen: 'Elige la imagen', error: 'Encuentra el error', ordenar: 'Arma el diagrama', clasificar: 'Clasifica' };
function volar(el, desde){ const hasta = el.getBoundingClientRect(); el.animate([{ transform: `translate(${desde.left - hasta.left}px, ${desde.top - hasta.top}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.9,.3,1.15)' }); }
function dibujoMini(nombre){ const d = DIBUJOS[nombre] || DIBUJOS.sparkles || ''; return `<svg class="dib-op" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`; }

/* EL COMBO: en cada acierto seguido (x2, x3…), más grande, más brillante y más agudo mientras más largo */
function comboVFX(n){
  if(n < 2) return;
  const nivel = n >= 8 ? 3 : n >= 5 ? 2 : 1;
  const color = ['#C77DFF', '#FF6F9A', '#FFC84A'][nivel - 1];
  const capaC = document.createElement('div'); capaC.className = 'combo-vfx n' + nivel; capaC.setAttribute('aria-hidden', 'true');
  const titulo = n >= 10 ? '¡IMPARABLE!' : n >= 8 ? '¡EN LLAMAS!' : n >= 5 ? '¡RACHA!' : '';
  capaC.innerHTML = `<div class="onda" style="border-color:${color}"></div><div class="combo-txt" style="--c:${color}"><small>${titulo}</small>COMBO <b>x${n}</b></div>`;
  document.body.append(capaC);
  /* chispas que salen del centro: más mientras más largo el combo */
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const cuantas = 10 + nivel * 8;
    for(let i = 0; i < cuantas; i++){
      const s = document.createElement('i'); s.className = 'chispa'; s.style.background = i % 3 ? color : '#fff';
      capaC.append(s);
      const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * (90 + nivel * 50);
      s.animate([{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.2)`, opacity: 0 }], { duration: 650 + Math.random() * 400, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' });
    }
    if(nivel >= 2) document.querySelector('#capa')?.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-4px,2px)' }, { transform: 'translate(4px,-2px)' }, { transform: 'none' }], { duration: 240 });
  }
  tono(SON.combo, { tono: Math.min(1.7, 1 + (n - 2) * .07) });
  if(n === 5 || n === 8 || n === 10) setTimeout(() => tono(SON.subir), 180);
  setTimeout(() => capaC.remove(), 1300);
}

function cuestionario(p, n, preguntas, { simulacro = false } = {}){
  const c = capa();
  const fila = barajar(preguntas).filter((q) => EJ[q.tipo]).map((q) => ({ ...q, intento: 0 }));
  const total = fila.length;
  let i = 0, combo = 0, maxCombo = 0, buenasPrimera = 0, contestadas = 0;
  const t0 = Date.now();
  const limpiarEstado = (q) => { for(const k of Object.keys(q)) if(k.startsWith('_') && k !== '_pista') delete q[k]; return q; };
  function pintarPregunta(){
    const q = fila[i], ej = EJ[q.tipo];
    const avance = contestadas / total * 100;
    const conCombo = combo >= 2 ? `<span class="combo ${combo >= 5 ? 'oro' : ''}">COMBO x${combo}</span>` : '';
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Salir del cuestionario">${ico('x')}</button><div class="progreso" style="position:relative;overflow:visible">${conCombo}<div class="progreso"><i style="width:${avance}%;${combo >= 5 ? 'background:var(--oro)' : ''}"></i></div></div></div>
      <div class="cuerpo entra" id="qCuerpo" data-tipo="${q.tipo}"><p class="tipo-ej">${simulacro ? `Simulacro · ${contestadas + 1} de ${total} · ` : ''}${INSTRUCCION[q.tipo]}</p>${ej.pintar(q)}<div id="pistaCaja"></div></div>
      <div class="abajo"><div class="botones-quiz"><button class="bt" data-pista ${q.pista ? '' : 'disabled'}>${ico('lightbulb')}Pista</button><button class="bt blanco" data-verificar disabled>Verificar</button></div></div>`;
    ej.montar && ej.montar(q, c);
    if(q.tipo === 'escribir') setTimeout(() => $('#escribe', c)?.focus({ preventScroll: true }), 350);
  }
  function puedeVerificar(){ const q = fila[i]; const b = $('[data-verificar]', c); if(b) b.disabled = !EJ[q.tipo].listo(q); }
  function verificar(){
    const q = fila[i], ej = EJ[q.tipo];
    if(!ej.listo(q) || q._verificada) return;
    q._verificada = true;
    const r = ej.revisar(q), bien = r.bien;
    ej.marcar(q, r, c);
    contestadas += q.intento === 0 ? 1 : 0;
    if(bien){
      if(q.intento === 0 && !q._pista){ buenasPrimera++; }
      combo = q._pista ? combo : combo + 1; maxCombo = Math.max(maxCombo, combo);
      tono(SON.bien); vibrar(15);
      if(combo >= 2) setTimeout(() => comboVFX(combo), 120);
    } else {
      combo = 0; tono(SON.mal); vibrar([40, 60, 40]); $('#qCuerpo', c).classList.add('sacude');
      /* la que fallaste regresa al final (una vez), como en la escuela: hasta que salga */
      if(q.intento === 0) fila.push(limpiarEstado({ ...q, intento: 1, _pista: false }));
    }
    const frases = bien ? ['¡Correcto!', '¡Genial!', '¡Increíble!', '¡Eso!'] : ['Casi', 'No era esa', 'Uy, por poquito'];
    const h = document.createElement('div'); h.className = 'hoja-res ' + (bien ? 'bien' : 'mal'); h.setAttribute('role', 'alert');
    h.innerHTML = `<div class="dentro"><h3>${ico(bien ? 'circle-check' : 'circle-x')}${frases[Math.floor(Math.random() * frases.length)]}</h3>
      ${r.nota ? `<p>${esc(r.nota)}</p>` : ''}
      ${bien ? '' : `<p>La respuesta: <b>${esc(r.correcta)}</b>${q.intento === 0 ? '. Te la vuelvo a preguntar al final.' : ''}</p>`}
      <p id="porque" hidden>${esc(q.porque || '')}</p>
      <div class="bts"><button class="bt" data-porque ${q.porque ? '' : 'disabled'}>¿Por qué?</button><button class="bt ${bien ? 'fuerte' : 'blanco'}" data-continuar>Continuar</button></div></div>`;
    document.body.append(h);
    $('[data-continuar]', h).focus({ preventScroll: true });
    h.addEventListener('click', (e) => {
      if(e.target.closest('[data-porque]')){ $('#porque', h).hidden = false; e.target.closest('[data-porque]').disabled = true; }
      if(e.target.closest('[data-continuar]')){ h.remove(); siguiente(); }
    });
    const barra = $$('.progreso i', c).pop(); if(barra) barra.style.width = (contestadas / total * 100) + '%';
  }
  function siguiente(){
    i++;
    if(i >= fila.length) return terminar();
    pintarPregunta();
  }
  function terminar(){
    document.querySelectorAll('.combo-vfx').forEach((x) => x.remove());
    const seg = Math.round((Date.now() - t0) / 1000);
    const pct = Math.round(buenasPrimera / total * 100);
    const xp = simulacro ? 10 + buenasPrimera * 3 + (pct === 100 ? 10 : 0) : 5 + buenasPrimera * 2 + (pct === 100 ? 5 : 0) + Math.min(5, Math.floor(maxCombo / 2));
    resultado(p, n, { xp, pct, seg, maxCombo, titulo: pct === 100 ? '¡La rompiste!' : pct >= 70 ? '¡Bien hecho!' : 'Ya casi', frase: pct === 100 ? 'Todo correcto. Estás volando.' : pct >= 70 ? 'Vas muy bien; lo que fallaste ya lo repasaste.' : 'Lo que fallaste ya lo repasaste. Si quieres, hazlo otra vez.' });
  }
  c.addEventListener('click', (e) => {
    if(e.target.closest('[data-cerrar]')){ $('.hoja-res')?.remove(); cerrarCapa(); pintar(); return; }
    const q = fila[i]; if(!q) return;
    if(e.target.closest('[data-pista]')){ q._pista = true; $('#pistaCaja', c).innerHTML = `<div class="pista entra">${ico('lightbulb')} ${esc(q.pista)}</div>`; e.target.closest('[data-pista]').disabled = true; return; }
    if(e.target.closest('[data-verificar]')){ verificar(); return; }
    if(!q._verificada && EJ[q.tipo].tocar && EJ[q.tipo].tocar(e, q, c)) puedeVerificar();
  });
  c.addEventListener('input', (e) => { const q = fila[i]; if(q && !q._verificada && EJ[q.tipo].entrada && EJ[q.tipo].entrada(e, q)) puedeVerificar(); });
  c.addEventListener('keydown', (e) => { if(e.key === 'Enter' && e.target.id === 'escribe'){ e.preventDefault(); verificar(); } });
  pintarPregunta();
}

/* «¡La rompiste!»: XP, perfecto, tiempo; y luego qué te pareció */
function resultado(p, n, r){
  const c = capa();
  tono(SON.fin); vibrar([20, 40, 20]);
  const mm = `${Math.floor(r.seg / 60)}:${String(r.seg % 60).padStart(2, '0')}`;
  c.innerHTML = `<div class="cuerpo"><div class="resultado"><div class="sello entra">${ico(r.pct === 100 ? 'trophy' : 'award')}</div><h1 class="entra">${esc(r.titulo)}</h1><p class="entra">${esc(r.frase)}</p>
    <div class="medallas"><div class="medalla" style="--c:#7A2FBF;--c2:var(--claro-txt)"><small>XP</small><b>${ico('zap')}+${r.xp}</b></div>
    <div class="medalla" style="--c:var(--vino);animation-delay:.12s"><small>${r.pct === 100 ? 'Perfecto' : 'Aciertos'}</small><b>${r.pct} %</b></div>
    <div class="medalla" style="--c:#4A3560;animation-delay:.24s"><small>Tiempo</small><b>${ico('clock')}${mm}</b></div></div>
    <h2 class="titulo" style="font-size:20px">¿Qué te pareció?</h2><div class="estrellas" id="estrellas">${[1, 2, 3, 4, 5].map((k) => `<button data-estrella="${k}" aria-label="${k} de 5">${ico('star')}</button>`).join('')}</div></div></div>
    <div class="abajo"><button class="bt blanco ancho" data-continuar>Continuar</button></div>`;
  if(r.pct === 100) confeti();
  let nota = 0;
  c.addEventListener('click', (e) => {
    const s = e.target.closest('[data-estrella]'); if(s){ nota = +s.dataset.estrella; $$('#estrellas button', c).forEach((b) => b.classList.toggle('on', +b.dataset.estrella <= nota)); tono(SON.toque); return; }
    if(e.target.closest('[data-continuar]')) completarNodo(p, n, { xp: r.xp, mejor: r.pct, nota });
  });
}

/* marcar un nodo como hecho: moneda, grado, XP, y la lección que sigue se prepara sola */
async function completarNodo(p0, n, { xp = 0, mejor = 100, nota = 0 } = {}){
  const p = planes[p0.id] || p0;
  const antes = avanceDe(p);
  const ya = hecho(p, n);
  if(n.id){ const v = p.progreso[n.id] || {}; p.progreso[n.id] = { ...v, hecho: true, mejor: Math.max(v.mejor || 0, mejor), veces: (v.veces || 0) + 1, ...(nota ? { nota } : {}), cuando: Date.now() }; }
  guardarPlan(p);
  cerrarCapa(); vista = 'plan'; pintar();
  /* el camino baja solo hasta el que sigue (antes se quedaba donde estaba y el siguiente quedaba fuera de la pantalla) */
  requestAnimationFrame(() => { const act = document.querySelector('#planCuerpo .nodo.actual'); if(act){ const r = act.getBoundingClientRect(); if(r.top < 140 || r.bottom > innerHeight - 230) scrollTo({ top: scrollY + r.top - innerHeight * .38, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } });
  const despues = avanceDe(p);
  const moneda = n.id && $(`.nodo[data-nodo="${n.id}"]`); if(moneda && !ya){ moneda.classList.add('recien'); setTimeout(() => tono(SON.moneda), 380); }
  const subir = sumarXP(ya ? Math.round(xp / 3) : xp, n.tipo);
  if(Math.floor(despues.grado) > Math.floor(antes.grado)){
    await espera(500); tono(SON.subir); brindis(`¡Subiste a grado ${Math.floor(despues.grado)}!`, 'oro', 'arrow-up');
  }
  const etiqueta = { quiz: '¡Nivel completado!', tarjetas: '¡Tarjetas dominadas!', pizarra: '¡Cátedra vista!', panorama: '¡Panorama visto!', simulacro: '¡Simulacro listo!', examen: '¡Repaso logrado!' }[tipoVisto(n)];
  if(!ya && etiqueta) setTimeout(() => brindis(etiqueta, '', 'circle-check'), 350);
  if(despues.grado >= 10 && antes.grado < 10) setTimeout(() => fiestaGrado(), 900);
  precargar(p);
  await subir;
}

/* ══ 10 · TARJETAS, SIMULACRO Y PIZARRÓN (sin gastar IA de más) ═══════════ */
async function preguntasHasta(p, n, { soloUnidad = false } = {}){
  const ns = todosLosNodos(p); const idx = ns.findIndex((x) => x.id === n.id);
  const temas = [...new Set(ns.slice(0, idx).filter((x) => x.tipo === 'quiz' && (!soloUnidad || x.unidad.id === n.unidad.id)).map((x) => x.tema))];
  const faltan = temas.filter((t) => !(p.contenido || {})[t]);
  return { temas, faltan };
}
async function asegurarContenido(c, p, temas, titulo){
  const faltan = temas.filter((t) => !(planes[p.id].contenido || {})[t]);
  if(!faltan.length) return true;
  const prep = pantallaPreparando(c, titulo);
  try{ for(const t of faltan) await contenidoDe(planes[p.id], t); prep.fin(); return $('#capa') === c; }
  catch(e){ prep.error(e.message || String(e), () => abrirNodo(n0Id)); return false; }
}
let n0Id = null;
/* cada tipo de pregunta se vuelve una o varias tarjetas (frente / atrás) */
function tarjetasDe(q){
  if(q.tipo === 'opcion') return [{ frente: q.pregunta, atras: q.opciones[q.correcta], porque: q.porque }];
  if(q.tipo === 'hueco') return [{ frente: q.frase.replace('___', '_____'), atras: q.respuesta, porque: q.porque }];
  if(q.tipo === 'escribir') return [{ frente: q.pregunta, atras: q.respuesta, porque: q.porque }];
  if(q.tipo === 'unir') return q.pares.map((x) => ({ frente: x[0], atras: x[1], porque: '' }));
  if(q.tipo === 'imagen') return [{ frente: q.pregunta, atras: q.opciones[q.correcta].texto, porque: q.porque }];
  if(q.tipo === 'error') return [{ frente: `¿Qué está mal en «${q.pasos[q.error]}»?`, atras: q.correccion, porque: q.porque }];
  if(q.tipo === 'ordenar') return [{ frente: q.pregunta || 'El orden del proceso', atras: q.pasos.map((x, k) => `${k + 1}. ${x}`).join(' · '), porque: '' }];
  if(q.tipo === 'clasificar') return q.grupos.flatMap((g) => g.items.map((it) => ({ frente: `¿En qué grupo va «${it}»?`, atras: g.nombre, porque: '' })));
  return [];
}
async function abrirTarjetas(p, n){
  n0Id = n.id;
  const c = capa();
  const { temas } = await preguntasHasta(p, n, { soloUnidad: true });
  if(!(await asegurarContenido(c, p, temas, n.titulo))) return;
  const pp = planes[p.id];
  let mazo = temas.flatMap((t) => (pp.contenido[t].preguntas || []).flatMap(tarjetasDe));
  mazo = barajar(mazo).slice(0, 12);
  if(!mazo.length){ completarNodo(pp, n, { xp: 5 }); return; }
  const total = mazo.length; let sabidas = 0;
  function pintarTarjeta(){
    const t = mazo[0];
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Cerrar">${ico('x')}</button><div class="progreso"><i style="width:${sabidas / total * 100}%"></i></div><span class="pastilla">${sabidas}/${total}</span></div>
      <div class="cuerpo"><div class="mazo entra"><button class="tarjeta" id="tarjeta" aria-label="Voltear la tarjeta"><div class="cara frente">${esc(t.frente)}<small>Toca para voltear</small></div><div class="cara reves"><b>${esc(t.atras)}</b>${esc(t.porque || '')}</div></button></div></div>
      <div class="abajo"><div class="botones-quiz" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><button class="bt" data-otra disabled>${ico('repeat')}Repasar</button><button class="bt fuerte" data-se disabled>${ico('check')}Me la sé</button></div></div>`;
  }
  c.addEventListener('click', (e) => {
    if(e.target.closest('[data-cerrar]')){ cerrarCapa(); pintar(); return; }
    if(e.target.closest('#tarjeta')){ $('#tarjeta', c).classList.toggle('volteada'); $$('[data-otra], [data-se]', c).forEach((b) => { b.disabled = false; }); tono(SON.voltear); return; }
    if(e.target.closest('[data-otra]')){ mazo.push(mazo.shift()); pintarTarjeta(); return; }
    if(e.target.closest('[data-se]')){ mazo.shift(); sabidas++; tono(SON.bien); if(!mazo.length) resultado(planes[p.id], n, { xp: 8 + total, pct: 100, seg: 0, titulo: '¡Tarjetas dominadas!', frase: `Te sabes las ${total}. Eso ya no se te olvida.` }); else pintarTarjeta(); }
  });
  pintarTarjeta();
}
async function abrirSimulacro(p, n, _repaso){
  n0Id = n.id;
  const c = capa();
  const { temas } = await preguntasHasta(p, n);
  if(!(await asegurarContenido(c, p, temas, n.titulo))) return;
  const pp = planes[p.id];
  const todas = temas.flatMap((t) => pp.contenido[t].preguntas || []);
  const cuantas = n.tipo === 'examen' ? 15 : 10;
  /* de cada tema un poco, para que el simulacro cubra todo el temario */
  const porTema = temas.map((t) => barajar(pp.contenido[t].preguntas || []));
  const elegidas = []; for(let r = 0; elegidas.length < Math.min(cuantas, todas.length); r++) for(const lista of porTema) if(lista[r] && elegidas.length < cuantas) elegidas.push(lista[r]);
  if(!elegidas.length){ completarNodo(pp, n, { xp: 5 }); return; }
  cuestionario(pp, n, elegidas, { simulacro: true });
}
/* la clase en el pizarrón: Explica, la misma de la mesa, dentro de una capa */
function abrirPizarra(p, n){
  const c = capa('pizarra');
  const q = new URLSearchParams(location.search); q.set('nivel', 'prepa');
  const unidad = n.alcance === 'unidad' && p.unidades ? p.unidades.find((u) => u.nodos.some((x) => x.id === n.id)) : null;
  if(unidad){ q.set('tema', `Panorama general de «${unidad.titulo}» (${p.materia}): de qué trata y cómo se conectan ${unidad.temas.map((t) => t.titulo).join(', ')}. Explica la idea general; cada tema se verá a fondo después.`); q.set('largo', 'normal'); }
  else { q.set('tema', `${n.titulo} (${p.materia})`); q.set('largo', 'corta'); }
  /* para que la clase sea SUYA: qué examen prepara, cuándo, qué ya vio y qué le costó (Explica lo mete en lo que le pide a la IA) */
  if(p.unidades){
    const t = n.tema && temaDe(p, n.tema), ns = todosLosNodos(p);
    const vistos = ns.filter((x) => x.tipo === 'quiz' && hecho(p, x)).map((x) => x.titulo).slice(-8);
    const costo = ns.filter((x) => x.tipo === 'quiz' && p.progreso[x.id] && p.progreso[x.id].mejor < 70).map((x) => x.titulo).slice(0, 5);
    q.set('contexto', [`Prepara su ${p.titulo} (${cuandoTexto(p.fecha).toLowerCase()}).`, t && t.resumen ? `Este tema trata de: ${t.resumen}` : '', p.notas ? `Sus apuntes dicen: ${p.notas.slice(0, 400)}` : '',
      vistos.length ? `Ya estudió: ${vistos.join(', ')}.` : '', costo.length ? `Le costó trabajo: ${costo.join(', ')}: refuérzalo con ejemplos.` : ''].filter(Boolean).join(' '));
  }
  c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Cerrar la clase">${ico('x')}</button><div style="flex:1;min-width:0"><small style="display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--claro-txt)">${unidad ? 'Panorama de la unidad' : n.id ? 'Cátedra' : 'Explícame'}</small><b style="font:800 16px/1.2 Titulo">${esc(n.titulo)}</b></div>${n.id ? `<button class="bt fuerte" data-vista>${ico('check')}Ya la vi</button>` : ''}</div>
    <iframe title="Clase en el pizarrón" src="${EXPLICA}?${q}" allow="autoplay; clipboard-write"></iframe>`;
  const alTerminar = (e) => { if(e.origin === location.origin && e.data && e.data.explica === 'fin' && n.id){ const b = $('[data-vista]', c); if(b){ b.classList.add('blanco'); b.textContent = 'Terminar'; brindis('Clase completa', '', 'presentation'); } } };
  addEventListener('message', alTerminar);
  c.addEventListener('click', (e) => {
    if(e.target.closest('[data-cerrar]')){ removeEventListener('message', alTerminar); cerrarCapa(); pintar(); return; }
    if(e.target.closest('[data-vista]')){ removeEventListener('message', alTerminar); completarNodo(planes[p.id], n, { xp: unidad ? 15 : 12 }); }
  });
}

/* ══ 11 · CELEBRACIONES ══════════════════════════════════════════════════ */
function confeti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.className = 'confeti'; document.body.append(cv);
  const k = devicePixelRatio || 1; cv.width = innerWidth * k; cv.height = innerHeight * k; const g = cv.getContext('2d'); g.scale(k, k);
  const col = ['#AC27FF', '#C77DFF', '#7E1735', '#E8B54A', '#F1ECF4'];
  const ps = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * .35, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, c: col[Math.floor(Math.random() * col.length)], w: 6 + Math.random() * 6 }));
  const t0 = performance.now();
  (function cuadro(t){
    g.clearRect(0, 0, innerWidth, innerHeight);
    for(const p of ps){ p.vy += .32; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -3, p.w, 6); g.restore(); }
    if(t - t0 < 2600) requestAnimationFrame(cuadro); else cv.remove();
  })(t0);
}
function fiestaGrado(){
  return new Promise((listo) => {
    const f = document.createElement('div'); f.className = 'fiesta'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-label', 'Grado 10');
    f.innerHTML = `<div class="grande" style="background:linear-gradient(145deg,var(--vino-2),var(--vino));box-shadow:0 10px 0 var(--vino-osc)">${ico('graduation-cap')}</div><h1>Grado 10</h1><p>Ahora es tu turno: llegaste al examen listo.</p><button class="bt blanco">¡Vamos!</button>`;
    document.body.append(f); confeti(); tono(SON.fin);
    $('button', f).addEventListener('click', () => { f.remove(); listo(); }); $('button', f).focus();
  });
}
function fiestaHielo(titulo, texto){
  return new Promise((listo) => {
    const f = document.createElement('div'); f.className = 'fiesta'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-label', titulo);
    f.innerHTML = `<div class="circulo"></div><div class="grande" style="background:#ffffff22">${ico('snowflake')}</div><h1>${esc(titulo)}</h1><p>${esc(texto)}</p><button class="bt blanco">Continuar</button>`;
    document.body.append(f); tono(SON.hielo);
    setTimeout(() => f.classList.add('hielo'), 650);
    $('button', f).addEventListener('click', () => { f.remove(); listo(); }); $('button', f).focus();
  });
}

/* ══ 12 · MENÚ DEL PLAN Y CAMBIAR DE PLAN ═════════════════════════════════ */
$('#bMenuPlan').innerHTML = ico('ellipsis-vertical');
$('#bMenuPlan').addEventListener('click', () => {
  const p = plan(); if(!p) return;
  const h = hoja('Configuración', `<div class="menu">
    <button data-m="nuevo">${ico('plus')}Crear nuevo plan</button><button data-m="editar">${ico('pencil')}Editar plan</button>
    <button data-m="material">${ico('image-plus')}Añadir material</button><button data-m="compartir">${ico('share-2')}Compartir plan</button>
    <button data-m="borrar" class="peligro">${ico('trash')}Eliminar plan</button></div>`);
  h.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if(!b) return;
    const m = b.dataset.m;
    if(m === 'nuevo'){ cerrarHoja(); alta(); }
    if(m === 'editar') editarPlan(p);
    if(m === 'material') anadirMaterial(p);
    if(m === 'compartir'){ cerrarHoja(); compartir(p); }
    if(m === 'borrar'){
      if(!b.dataset.seguro){ b.dataset.seguro = '1'; b.innerHTML = `${ico('trash')}Toca otra vez para borrarlo`; return; }
      cerrarHoja(); delete planes[p.id]; actualId = Object.keys(planes)[0] || null; guardarLocal(); pintar();
      sala({ accion: 'borrarPlan', id: p.id }).catch(() => {}); brindis('Plan eliminado', 'vino', 'trash');
    }
  });
});
$('#bPlanes').addEventListener('click', () => {
  const lista = Object.values(planes).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  const h = hoja('Tus planes', `<div class="menu">${lista.map((p) => `<button data-plan="${esc(p.id)}">${ico('notebook-pen')}<span>${esc(p.titulo)}<br><small style="color:var(--suave);font-weight:600">${esc(cuandoTexto(p.fecha))} · ${avanceDe(p).pct} %</small></span>${p.id === actualId ? `<span class="sel">${ico('circle-check')}</span>` : ''}</button>`).join('')}</div>
    <button class="bt blanco ancho" style="margin-top:12px" data-plan="nuevo">${ico('plus')}Crear un nuevo plan</button>`);
  h.addEventListener('click', (e) => { const b = e.target.closest('[data-plan]'); if(!b) return; cerrarHoja(); if(b.dataset.plan === 'nuevo') alta(); else { actualId = b.dataset.plan; guardarLocal(); pintarPlan.yaCentrado = false; pintar(); scrollTo({ top: 0 }); } });
});
function editarPlan(p){
  const h = hoja('Editar plan', `<label class="seccion-t" for="eNom">Nombre</label><input class="campo" id="eNom" value="${esc(p.titulo)}"><label class="seccion-t" for="eFecha" style="display:block">Fecha del examen</label><input type="date" class="campo" id="eFecha" value="${esc(p.fecha)}"><button class="bt fuerte ancho" style="margin-top:16px" id="eGuardar">Guardar</button>`);
  $('#eGuardar', h).addEventListener('click', () => { p.titulo = $('#eNom', h).value.trim().slice(0, 80) || p.titulo; p.fecha = $('#eFecha', h).value || p.fecha; guardarPlan(p); cerrarHoja(); pintar(); brindis('Guardado', '', 'check'); });
}
function anadirMaterial(p){
  const fotos = [];
  const h = hoja('Añadir material', `<p style="color:var(--suave);margin-bottom:12px">Lo nuevo entra como unidades nuevas antes del simulacro. Lo que ya hiciste no se toca.</p>
    <div class="fotos">${[0, 1, 2].map((i) => `<label class="foto-hueco" aria-label="Agregar foto">${ico('plus')}<input type="file" accept="image/*" hidden data-foto="${i}"></label>`).join('')}</div>
    <textarea class="campo" id="mTemas" style="margin-top:12px" placeholder="Temas nuevos, uno por renglón"></textarea><button class="bt fuerte ancho" style="margin-top:12px" id="mListo">Agregar al plan</button>`);
  h.addEventListener('change', async (e) => { const i = e.target.dataset.foto; if(i == null) return; const x = await achicar(e.target.files[0]); if(x){ fotos[+i] = x; e.target.parentElement.innerHTML = `<img src="${x.url}" alt="Foto ${+i + 1}">`; } });
  $('#mListo', h).addEventListener('click', () => {
    const temas = $('#mTemas', h).value.split('\n').map((x) => x.trim()).filter(Boolean);
    if(!temas.length && !fotos.filter(Boolean).length){ $('#mTemas', h).focus(); return; }
    cerrarHoja(); prepararPlan({ materia: { nombre: p.materia }, fecha: p.fecha, temas, fotos: fotos.filter(Boolean), extra: '' }, p);
  });
}
async function compartir(p){
  const a = avanceDe(p);
  const texto = `${p.titulo} · ${cuandoTexto(p.fecha)}\nVoy en ${a.pct} % (grado ${Math.floor(a.grado)}).\n\n${p.unidades.map((u, i) => `Unidad ${i + 1}: ${u.titulo}\n${u.temas.map((t) => '• ' + t.titulo).join('\n')}`).join('\n\n')}`;
  try{ if(navigator.share){ await navigator.share({ title: p.titulo, text: texto }); return; } }catch{ return; }
  try{ await navigator.clipboard.writeText(texto); brindis('Plan copiado para pegarlo donde quieras', '', 'copy'); }catch{ brindis('No se pudo copiar', 'vino', 'x'); }
}

/* ══ 13 · HORARIO ═════════════════════════════════════════════════════════ */
const DIAS_ESC = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const horario = () => (perfil.horario && Array.isArray(perfil.horario.clases)) ? perfil.horario : { clases: [] };
const aMin = (h) => { const m = /^(\d{1,2}):(\d{2})/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : null; };
function colorMateria(nombre){ const m = listaMaterias().find((x) => quitarAcentos(x.nombre) === quitarAcentos(nombre) || quitarAcentos(x.corto) === quitarAcentos(nombre)); if(m) return m.color; let h = 0; for(const ch of String(nombre)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COLOR_UNIDAD[h % COLOR_UNIDAD.length]; }
function pintarHorario(){
  const v = $('#vHorario'), hz = horario(), d = new Date(), hoyI = d.getDay() - 1, ahora = d.getHours() * 60 + d.getMinutes();
  const deHoy = hz.clases.filter((x) => x.dia === hoyI).sort((a, b) => aMin(a.inicio) - aMin(b.inicio));
  const enCurso = deHoy.find((x) => aMin(x.inicio) <= ahora && ahora < aMin(x.fin)), sig = deHoy.find((x) => aMin(x.inicio) > ahora);
  const examenes = Object.values(planes).filter((p) => p.fecha && diasHasta(p.fecha) >= 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
  v.innerHTML = `<h1 class="titulo-vista">Tu horario</h1><p class="sub-vista">${hz.clases.length ? 'Toca una clase para quitarla.' : 'Agrégalo una vez y listo, siempre lo vas a tener. Tarda 30 segundos.'}</p>
    ${enCurso || sig ? `<div class="ahora-banner entra"><small>${enCurso ? 'Ahora' : 'Sigue'}</small><b>${esc((enCurso || sig).materia)}</b><span style="opacity:.85">${esc((enCurso || sig).inicio)} a ${esc((enCurso || sig).fin)}</span></div>` : ''}
    ${examenes.length ? `<div class="seccion-t">Próximos exámenes</div><div class="examenes"><ul>${examenes.map((p) => { const f = new Date(p.fecha + 'T12:00:00'); return `<li><span class="fecha-mini"><small>${MESES[f.getMonth()].slice(0, 3)}</small><b>${f.getDate()}</b></span><span style="flex:1"><b>${esc(p.titulo)}</b><br><small style="color:var(--suave)">${esc(cuandoTexto(p.fecha))} · ${avanceDe(p).pct} % listo</small></span></li>`; }).join('')}</ul></div>` : ''}
    <div class="seccion-t">La semana</div>
    <div class="horario">${DIAS_ESC.map((n, i) => { const cl = hz.clases.filter((x) => x.dia === i).sort((a, b) => aMin(a.inicio) - aMin(b.inicio));
      return `<div class="dia-h"><h4 class="${i === hoyI ? 'hoy' : ''}">${n}${i === hoyI ? ' · hoy' : ''}</h4>${cl.map((x) => `<div class="clase-h ${x === enCurso ? 'ahora' : ''}" style="--c:${colorMateria(x.materia)}"><span class="hr">${esc(x.inicio)}<br>${esc(x.fin)}</span><b>${esc(x.materia)}</b><button data-quitar-clase="${hz.clases.indexOf(x)}" aria-label="Quitar ${esc(x.materia)} del ${n.toLowerCase()}">${ico('x')}</button></div>`).join('') || '<p style="color:var(--tenue);font-size:14px">Sin clases</p>'}</div>`; }).join('')}</div>
    <div style="display:grid;gap:10px;margin:22px 0 30px"><button class="bt fuerte ancho" id="bAgregarClase">${ico('plus')}Agregar una clase</button><button class="bt ancho" id="bPegarHorario">${ico('clipboard-paste')}Pegar desde Excel</button></div>`;
  $('#bAgregarClase').addEventListener('click', agregarClase);
  $('#bPegarHorario').addEventListener('click', pegarHorario);
}
$('#vHorario').addEventListener('click', (e) => { const b = e.target.closest('[data-quitar-clase]'); if(!b) return; const hz = horario(); hz.clases.splice(+b.dataset.quitarClase, 1); guardarHorario(hz); });
function guardarHorario(hz){ perfil.horario = hz; guarda.poner('est.perfil', perfil); pintarHorario(); sala({ accion: 'perfil', horario: hz }).catch(() => {}); }
function agregarClase(){
  const ms = listaMaterias();
  const h = hoja('Agregar una clase', `<label class="seccion-t" for="cMat" style="display:block;margin-top:0">Materia</label><input class="campo" id="cMat" list="cMats" placeholder="Ej. Física"><datalist id="cMats">${ms.map((m) => `<option value="${esc(m.nombre)}">`).join('')}</datalist>
    <div class="seccion-t">Días</div><div class="chips">${DIAS_ESC.map((d, i) => `<button class="chip" data-dia="${i}" aria-pressed="false">${d}</button>`).join('')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px"><label>De<input type="time" class="campo" id="cIni" value="07:00"></label><label>A<input type="time" class="campo" id="cFin" value="07:50"></label></div>
    <button class="bt fuerte ancho" style="margin-top:16px" id="cListo">Agregar</button>`);
  h.addEventListener('click', (e) => { const d = e.target.closest('[data-dia]'); if(d) d.setAttribute('aria-pressed', d.getAttribute('aria-pressed') !== 'true'); });
  $('#cListo', h).addEventListener('click', () => {
    const materia = $('#cMat', h).value.trim(), dias = $$('[data-dia][aria-pressed="true"]', h).map((x) => +x.dataset.dia), inicio = $('#cIni', h).value, fin = $('#cFin', h).value;
    if(!materia){ $('#cMat', h).focus(); return; } if(!dias.length){ brindis('Elige al menos un día', 'vino', 'calendar'); return; }
    if(aMin(fin) <= aMin(inicio)){ brindis('La hora de salida va después de la de entrada', 'vino', 'clock'); return; }
    const hz = horario(); for(const dia of dias) hz.clases.push({ dia, inicio, fin, materia: materia.slice(0, 60) }); cerrarHoja(); guardarHorario(hz);
  });
}
/* pegar celdas de Excel / Sheets: primera fila los días, primera columna la hora («7:00-7:50») */
export function leerHorarioPegado(texto){
  const filas = String(texto || '').replace(/\r/g, '').split('\n').filter((f) => f.trim()).map((f) => f.split('\t'));
  if(filas.length < 2) return [];
  const cab = filas[0].map((x) => quitarAcentos(x));
  const col = {}; cab.forEach((x, i) => { const k = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].findIndex((d) => x.startsWith(d.slice(0, 3))); if(k >= 0) col[i] = k; });
  const clases = [];
  for(const f of filas.slice(1)){
    const m = /(\d{1,2})[:.](\d{2})\s*(?:-|–|a)\s*(\d{1,2})[:.](\d{2})/.exec(f[0] || '');
    if(!m) continue;
    const inicio = `${m[1].padStart(2, '0')}:${m[2]}`, fin = `${m[3].padStart(2, '0')}:${m[4]}`;
    for(const [i, dia] of Object.entries(col)){ const materia = (f[i] || '').trim(); if(materia && !/^(receso|descanso|-)$/i.test(materia)) clases.push({ dia, inicio, fin, materia: materia.slice(0, 60) }); }
  }
  return clases;
}
function pegarHorario(){
  const h = hoja('Pegar desde Excel', `<p style="color:var(--suave);margin-bottom:10px">Copia tu horario en Excel o Sheets (con los días arriba y la hora a la izquierda, tipo «7:00-7:50») y pégalo aquí.</p>
    <textarea class="campo" id="pTxt" style="min-height:160px" placeholder="Hora&#9;Lunes&#9;Martes…"></textarea><button class="bt fuerte ancho" style="margin-top:12px" id="pListo">Usar este horario</button>`);
  $('#pListo', h).addEventListener('click', () => {
    const clases = leerHorarioPegado($('#pTxt', h).value);
    if(!clases.length){ brindis('No encontré clases: revisa que vengan los días arriba y la hora a la izquierda', 'vino', 'x'); return; }
    cerrarHoja(); guardarHorario({ clases }); brindis(`Listo: ${clases.length} clases`, '', 'calendar-days');
  });
}

/* ══ 14 · BUSCAR ══════════════════════════════════════════════════════════ */
function pintarBuscar(){
  const v = $('#vBuscar');
  const temas = Object.values(planes).flatMap((p) => p.unidades.flatMap((u) => u.temas.map((t) => ({ p, t }))));
  v.innerHTML = `<h1 class="titulo-vista">Buscar</h1><p class="sub-vista">En tus lecciones, o pídele a la IA que te lo explique en el pizarrón.</p>
    <label class="buscador">${ico('search')}<input id="busca" type="search" placeholder="Busca un tema…" autocomplete="off" aria-label="Buscar un tema"></label>
    <div id="resultados" class="resultados"></div>
    ${temas.length ? `<div class="seccion-t">Tus temas</div><div class="chips" id="temasChips">${temas.slice(0, 18).map(({ t }) => `<button class="chip" data-busca="${esc(t.titulo)}">${esc(t.titulo)}</button>`).join('')}</div>` : ''}`;
  const pinta = () => {
    const q = quitarAcentos($('#busca').value);
    const r = $('#resultados');
    if(!q){ r.innerHTML = ''; return; }
    const hits = temas.filter(({ p, t }) => { const c = (p.contenido || {})[t.id]; return quitarAcentos([t.titulo, t.resumen, c && c.leccion.parrafo, c && c.leccion.puntos.join(' ')].join(' ')).includes(q); }).slice(0, 12);
    r.innerHTML = hits.map(({ p, t }) => `<button data-leer="${esc(p.id)}|${esc(t.id)}">${ico('book-open')}<span>${esc(t.titulo)}<small>${esc(p.titulo)}${(p.contenido || {})[t.id] ? '' : ' · todavía sin lección'}</small></span>${ico('chevron-right')}</button>`).join('')
      + `<button data-explica="${esc($('#busca').value.trim())}">${ico('presentation')}<span>Explícame «${esc($('#busca').value.trim())}»<small>Clase con voz en el pizarrón</small></span>${ico('chevron-right')}</button>`;
  };
  $('#busca').addEventListener('input', pinta);
  v.onclick = (e) => {
    const c = e.target.closest('[data-busca]'); if(c){ $('#busca').value = c.dataset.busca; pinta(); return; }
    const l = e.target.closest('[data-leer]'); if(l){ const [pid, tid] = l.dataset.leer.split('|'); leerTema(planes[pid], tid); return; }
    const x = e.target.closest('[data-explica]'); if(x && x.dataset.explica){ abrirPizarra({ materia: 'consulta' }, { id: null, titulo: x.dataset.explica }); }
  };
}
async function leerTema(p, tid){
  const n = todosLosNodos(p).find((x) => x.tema === tid && x.tipo === 'quiz');
  if(!n) return;
  const anterior = actualId; actualId = p.id;
  await abrirLeccion(p, n);
  actualId = anterior || p.id;
}

/* ══ 15 · RANKING ═════════════════════════════════════════════════════════ */
let ordenAnterior = [];
function pintarRanking(){
  const v = $('#vRanking'), f = ranking.filas, yo = posicion();
  const arriba = yo > 1 ? yo - 1 : 0;
  v.innerHTML = `<div style="text-align:center;margin-top:calc(26px + env(safe-area-inset-top))"><div class="sello" style="width:96px;height:96px;margin-bottom:14px">${ico('trophy')}</div>
    <h1 class="titulo" style="font-size:26px">${!f.length ? 'El ranking de la semana' : yo === 1 ? '¡Vas en primer lugar!' : yo ? `¡Sólo ${arriba} ${arriba === 1 ? 'lugar' : 'lugares'} para llegar a la cima!` : 'El ranking de la semana'}</h1>
    <p class="sub-vista" style="margin-top:6px">${f.length ? 'Se reinicia cada lunes. Gana XP terminando lecciones.' : 'Termina tu primera lección para aparecer aquí.'}</p></div>
    <div class="ranking podio" id="rankLista">${f.map((x, i) => `<div class="fila-rank ${x.yo ? 'yo' : ''}" data-cuenta="${esc(x.cuenta)}"><span class="n">${i + 1}</span><span class="av" style="background:${colorMateria(x.cuenta)}">${esc((x.nombre || '?').charAt(0).toUpperCase())}</span><span class="nom">${esc(x.nombre)}${x.yo ? ' (tú)' : ''}</span><span class="xp">${ico('zap')}${x.xp} XP</span></div>`).join('')}</div>
    <p class="version" style="margin-top:18px">${f.length ? `Semana ${esc((ranking.semana || '').split('-S')[1] || '')}` : ''}</p>`;
  /* si cambió el orden, cada fila se desliza de donde estaba a donde va */
  const ahora = f.map((x) => x.cuenta);
  if(ordenAnterior.length && ordenAnterior.join() !== ahora.join()){
    $$('.fila-rank', v).forEach((el) => { const antes = ordenAnterior.indexOf(el.dataset.cuenta), hoy = ahora.indexOf(el.dataset.cuenta); if(antes >= 0 && antes !== hoy) el.animate([{ transform: `translateY(${(antes - hoy) * 66}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,.9,.3,1)' }); });
  }
  ordenAnterior = ahora;
}

/* ══ 16 · PERFIL Y AJUSTES ════════════════════════════════════════════════ */
function pintarPerfil(){
  const v = $('#vPerfil'), ps = Object.values(planes);
  v.innerHTML = `<div class="perfil-cab"><span class="av">${esc((perfil.nombre || 'T').charAt(0).toUpperCase())}</span><div><h2>${esc(perfil.nombre || 'Tú')}</h2><small>${perfil.cuenta ? '@' + esc(perfil.cuenta) + ' · ' : ''}Instituto Rembrandt de Querétaro</small></div></div>
    <div class="stats">
      <div class="stat"><span style="color:#FFB27A">${ico('flame')}</span><span><b>${perfil.racha || 0}</b><small>días de racha</small></span></div>
      <div class="stat"><span style="color:var(--claro-txt)">${ico('zap')}</span><span><b>${perfil.xp || 0}</b><small>XP en total</small></span></div>
      <div class="stat"><span style="color:#8EC5FF">${ico('snowflake')}</span><span><b>${perfil.congeladas || 0}</b><small>rachas congeladas</small></span></div>
      <div class="stat"><span style="color:var(--oro)">${ico('medal')}</span><span><b>${perfil.mejorRacha || 0}</b><small>mejor racha</small></span></div></div>
    <div class="seccion-t">Tus planes</div><div class="resultados">${ps.map((p) => `<button data-abrir-plan="${esc(p.id)}">${ico('notebook-pen')}<span>${esc(p.titulo)}<small>${esc(cuandoTexto(p.fecha))} · ${avanceDe(p).pct} % · grado ${Math.floor(avanceDe(p).grado)}</small></span>${ico('chevron-right')}</button>`).join('') || '<p style="color:var(--tenue)">Todavía no tienes planes.</p>'}
      <button data-nuevo-plan>${ico('plus')}<span>Crear un plan</span></button></div>
    <div class="seccion-t">Tú</div>
    <label class="ajuste">${ico('pencil')}<span>Tu nombre en el ranking</span><input id="pNombre" class="campo" style="max-width:150px;min-height:40px" value="${esc(perfil.nombre || '')}" aria-label="Tu nombre en el ranking"></label>
    <div class="seccion-t">App</div>
    <div class="ajuste">${ico('volume-2')}<span>Efectos de sonido</span><button class="interruptor" role="switch" data-aj="sonido" aria-checked="${!!ajustes.sonido}" aria-label="Efectos de sonido"></button></div>
    <div class="ajuste">${ico('vibrate')}<span>Vibración</span><button class="interruptor" role="switch" data-aj="vibrar" aria-checked="${!!ajustes.vibrar}" aria-label="Vibración"></button></div>
    <p class="version">${esc(VERSION_ESTUDIO)} · ${cola.length ? `${cola.length} logros por mandar a La Sala` : 'todo guardado en La Sala'}</p>`;
}
$('#vPerfil').addEventListener('click', (e) => {
  const a = e.target.closest('[data-aj]'); if(a){ ajustes[a.dataset.aj] = !ajustes[a.dataset.aj]; guarda.poner('est.ajustes', ajustes); a.setAttribute('aria-checked', ajustes[a.dataset.aj]); encenderSonidos(ajustes.sonido !== false); tono(SON.toque); return; }
  const p = e.target.closest('[data-abrir-plan]'); if(p){ actualId = p.dataset.abrirPlan; guardarLocal(); vista = 'plan'; pintarPlan.yaCentrado = false; pintar(); scrollTo({ top: 0 }); return; }
  if(e.target.closest('[data-nuevo-plan]')) alta();
});
$('#vPerfil').addEventListener('change', (e) => {
  if(e.target.id !== 'pNombre') return;
  const n = e.target.value.trim().slice(0, 30); if(!n) return;
  perfil.nombre = n; guarda.poner('est.perfil', perfil);
  sala({ accion: 'perfil', nombre: n }).then((r) => { ponerPerfil(r.perfil); brindis('Nombre guardado', '', 'check'); sincronizar(); }).catch(() => brindis('Se guardó aquí; se manda cuando haya red', 'vino', 'clock'));
});

/* ══ 17 · ARRANQUE ════════════════════════════════════════════════════════ */
if(migrarAlArrancar){ for(const p of Object.values(planes)) if(migrarCamino(p)) porGuardar.add(p.id); guardarLocal(); }
$$('[data-ico]').forEach((s) => { s.outerHTML = ico(s.dataset.ico); });
$('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-ir]'); if(!b) return; vista = b.dataset.ir; tono(SON.toque); pintar(); scrollTo({ top: 0 }); if(vista === 'ranking') mandarCola()?.then?.(() => {}); });
addEventListener('online', () => { mandarCola(); subirPlanes(); });
document.addEventListener('visibilitychange', () => { if(!document.hidden) sincronizar(); });
pintar();
sincronizar();
/* para las pruebas */
window.__estudio = { estado: () => ({ planes, actualId, perfil, ranking, cola, vista }), avanceDe, normalizarLeccion, normalizarPlan, leerHorarioPegado };
