/* LA SOCIEDAD DE ALUMNOS DEL REMBRANDT · la página.
   Carlos, 15 de octubre: una página para que los alumnos digan qué quieren
   cambiar, voten los eventos, suban fotos y material (revisados antes), platiquen
   por grupo y entre todos, vean avisos, competencias y torneos con sus fechas
   y requisitos, y desde donde la sociedad regule todo lo suyo: temas por
   resolver, tareas y la bitácora de cada evento. Y el horario de cada grupo
   arriba a la derecha, como un reloj que en vez de horas enseña la clase. */
import { API, L, soc, entrar, salir, miCodigo, aparato, subirArchivo, bajarArchivo, bajarEpisodio, achicar, aDato,
  e, ico, $, $$, fechaBonita, diaMes, aFecha, hace, horaDe, norm, paraInput, brindis, hoja, cerrarHoja, leer, CASA } from './nucleo.js';
import { queToca, bloques, colorDe, cuanto, hora12, DIAS, ahoraMx, leerPegado, aSeg } from './horario.js';
import { armarLlaves, avanzar, nombreRonda } from '../fadori/llaves.js';

const S = { d: null, cargado: false, chat: { canal: '', ms: [] }, fila: null, radio: null, filtros: {}, cal: null };
const yo = () => S.d && S.d.yo;
const esSoc = () => !!(yo() && (yo().rol === 'sociedad' || yo().rol === 'presidencia'));
const esPres = () => !!((yo() && yo().rol === 'presidencia') || (S.d && S.d.admin));
const conCuenta = () => !!(yo() && yo().cuenta);
const nombreGrupo = (id) => ((S.d && S.d.grupos || []).find(g => g.id === id) || {}).nombre || id;

/* ── LAS SECCIONES: de esta tabla sale el menú y el enrutador ─────────── */
const SECCIONES = [
  { g: 'La escuela', id: '', t: 'Inicio', i: 'house', v: vInicio },
  { g: 'La escuela', id: 'horarios', t: 'Horarios', i: 'clock', v: vHorarios },
  { g: 'La escuela', id: 'avisos', t: 'Avisos', i: 'megaphone', v: vAvisos },
  { g: 'La escuela', id: 'eventos', t: 'Eventos y competencias', i: 'calendar-days', v: vEventos },
  { g: 'La escuela', id: 'torneos', t: 'Torneos', i: 'trophy', v: vTorneos },
  { g: 'Participa', id: 'votar', t: 'Votaciones', i: 'vote', v: vVotar, cuenta: () => (S.d ? S.d.votos.filter(abierta).filter(v => !v.miVoto).length : 0) },
  { g: 'Participa', id: 'buzon', t: 'Buzón: propuestas y quejas', i: 'inbox', v: vBuzon },
  { g: 'Participa', id: 'chats', t: 'Chats', i: 'messages-square', v: vChats },
  { g: 'Recuerdos y estudio', id: 'muro', t: 'Muro de recuerdos', i: 'images', v: vMuro },
  { g: 'Recuerdos y estudio', id: 'material', t: 'Material académico', i: 'book-open', v: vMaterial },
  { g: 'También', id: 'fadori', t: 'Fadori · cooperativa', i: 'utensils', v: vFadori },
  { g: 'También', id: 'radio', t: 'Radio Divergentes', i: 'radio', v: vRadio },
  { g: 'Sociedad', id: 'sociedad', t: 'Panel de la sociedad', i: 'square-kanban', v: vPanel, soc: true },
  { g: 'Sociedad', id: 'revisar', t: 'Por revisar', i: 'shield-check', v: vRevisar, soc: true, cuenta: () => S.d ? S.d.pubs.filter(p => p.estado === 'pendiente').length : 0 },
  { g: 'Sociedad', id: 'miembros', t: 'Miembros', i: 'users', v: vMiembros, soc: true },
  { g: 'Tú', id: 'cuenta', t: 'Tu cuenta', i: 'user-round', v: vCuenta },
];
const OCULTAS = { chat: vChat, torneo: vTorneo, tema: vTema, pantalla: vPantalla };

/* ── arranque ──────────────────────────────────────────────────────────── */
const tema = L.get('soc_tema'); if(tema) document.documentElement.dataset.tema = tema;
pintarMenu();
window.addEventListener('hashchange', () => { cerrarMenu(); render(); });
$('#menuBtn').onclick = () => abrirMenu();
$('#velo').onclick = () => cerrarMenu();
render();
cargar().then(() => { render(); enchufar(); });
setInterval(pintarReloj, 10000);
if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

async function cargar(){
  const r = await soc('todo');
  if(r.ok){ S.d = r.j; S.cargado = true; }
  else if(!S.d){ S.d = { yo: null, avisos: [], eventos: [], votos: [], pubs: [], buzon: [], torneos: [], horarios: [], temas: [], miembros: [], grupos: [], error: r.j.error }; S.cargado = true; }
  pintarMenu(); pintarReloj();
  return r.ok;
}
/* «algo cambió»: se vuelve a pedir, y se repinta si nadie está escribiendo */
let recargaT = 0;
function recargar(){
  clearTimeout(recargaT);
  recargaT = setTimeout(async () => {
    await cargar();
    const a = document.activeElement, escribiendo = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && !a.closest('.escribir');
    if(!$('#hoja').open && !escribiendo && !document.body.dataset.ruta.startsWith('chat')) render(true);
  }, 400);
}

/* el socket: avisa «cambió X» y aquí se vuelve a pedir lo que toca */
let ws = null, wsEspera = 1000;
function enchufar(){
  if(!API || ws) return;
  try{ ws = new WebSocket(API.replace(/^http/, 'ws') + '/api/vivo?casa=' + encodeURIComponent(CASA) + '&aparato=' + aparato() + '&soc=1'); }catch(err){ return; }
  ws.onopen = () => { wsEspera = 1000; };
  ws.onmessage = (ev) => {
    let m; try{ m = JSON.parse(ev.data); }catch(err){ return; }
    if(!m || m.tipo !== 'soc') return;
    if(m.que === 'chat'){ if(S.chat.canal === m.canal) traerChat(); return; }
    recargar();
  };
  ws.onclose = () => { ws = null; setTimeout(enchufar, wsEspera); wsEspera = Math.min(30000, wsEspera * 2); };
  setInterval(() => { try{ ws && ws.readyState === 1 && ws.send('ping'); }catch(err){} }, 25000);
}
/* sin socket (wifi de la escuela que lo corta), cada 30 s */
setInterval(() => { if(!ws || ws.readyState !== 1) recargar(); }, 30000);

/* ── el menú ──────────────────────────────────────────────────────────── */
function pintarMenu(){
  const ruta = (location.hash.replace(/^#\/?/, '').split('/')[0]) || '';
  let html = '<div class="cab"><img src="escudo.png" alt=""><div><b>Sociedad de Alumnos</b><small>Instituto Rembrandt</small></div></div>';
  let g = '';
  for(const s of SECCIONES){
    if(s.soc && !esSoc() && !(s.id === 'miembros' && S.d && S.d.admin)) continue;
    if(s.g !== g){ g = s.g; html += '<h6>' + e(g) + '</h6>'; }
    const n = s.cuenta ? s.cuenta() : 0;
    html += '<a href="#/' + s.id + '" class="' + (ruta === s.id ? 'activo' : '') + '">' + ico(s.i) + '<span>' + e(s.t) + '</span>' + (n ? '<span class="cuenta">' + n + '</span>' : '') + '</a>';
  }
  html += '<h6>Pantalla</h6><a href="#/pantalla">' + ico('tv') + '<span>Horarios en la tele</span></a>';
  $('#lado').innerHTML = html;
}
function abrirMenu(){ $('#lado').classList.add('abierto'); $('#velo').classList.add('ver'); }
function cerrarMenu(){ $('#lado').classList.remove('abierto'); $('#velo').classList.remove('ver'); }

/* ── EL RELOJ DE CLASES (arriba a la derecha) ───────────────────────────── */
const grupoReloj = () => L.get('soc_grupo') || (yo() && yo().grupo) || '';
const horarioDe = (g) => S.d && S.d.horarios.find(h => h.grupo === g);
/* la siguiente sube en los últimos minutos de la clase: se nota que ya va a
   cambiar sin que el nombre de la actual quede partido a la mitad casi nunca */
const subida = (p) => { const x = Math.max(0, Math.min(1, (p - .86) / .14)); return x * x * (3 - 2 * x); };
function textoReloj(q){
  if(q.estado === 'clase') return { eti: 'Ahora', uno: q.actual.materia, dos: q.siguiente ? q.siguiente.materia : 'Salida', p: q.progreso, pie: (q.siguiente ? 'Sigue ' + q.siguiente.materia : 'Última del día') + ' · ' + cuanto(q.quedan) };
  if(q.estado === 'entre') return { eti: 'Receso', uno: 'Receso', dos: q.siguiente.materia, p: q.progreso, pie: q.siguiente.materia + ' en ' + cuanto(q.quedan) };
  if(q.estado === 'antes') return { eti: 'Hoy entras', uno: q.siguiente.materia, dos: q.siguiente.materia, p: 0, pie: 'A las ' + hora12(q.siguiente.ini) };
  if(q.estado === 'fin') return { eti: q.enDias === 1 ? 'Mañana' : DIAS[q.diaManana], uno: q.manana.materia, dos: q.manana.materia, p: 0, pie: 'A las ' + hora12(q.manana.ini) };
  return null;
}
function pintarReloj(){
  const r = $('#reloj'); if(!r) return;
  const g = grupoReloj(), h = horarioDe(g), q = queToca(h), t = textoReloj(q);
  if(!t){
    r.classList.add('vacio');
    r.innerHTML = '<span class="r-eti"><span>Tu clase</span></span><span class="r-ven"><span class="r-tira"><span>' + (g ? 'Sin horario del ' + e(nombreGrupo(g)) : 'Elige tu grupo') + '</span></span></span><span class="r-barra"><i style="width:0"></i></span>';
    r.setAttribute('aria-label', 'Horario: ' + (g ? 'todavía no hay horario de tu grupo' : 'elige tu grupo'));
  } else {
    r.classList.remove('vacio');
    const sub = q.estado === 'clase' ? subida(q.progreso) : 0;
    r.innerHTML = '<span class="r-eti"><span>' + e(t.eti) + '</span><span>' + e(nombreGrupo(g)) + '</span></span>' +
      '<span class="r-ven"><span class="r-tira" style="transform:translateY(' + (-sub * 17).toFixed(2) + 'px)"><span>' + e(t.uno) + '</span><span>' + e(t.dos) + '</span></span></span>' +
      '<span class="r-barra"><i style="width:' + (t.p * 100).toFixed(1) + '%"></i></span>';
    r.setAttribute('aria-label', t.eti + ': ' + t.uno + '. ' + t.pie);
    r.title = t.pie;
  }
  /* la clase grande del inicio y la vista de horarios también se mueven solas */
  const cg = $('#claseGrande'); if(cg) cg.outerHTML = claseGrande();
  if(document.body.dataset.ruta === 'pantalla') pintarTele();
  if(document.body.dataset.ruta === 'horarios') $$('.bloque[data-ini]').forEach(b => {
    const s = ahoraMx().seg, ini = aSeg(b.dataset.ini), fin = aSeg(b.dataset.fin), hoy = b.dataset.hoy === '1';
    b.classList.toggle('ahora', hoy && s >= ini && s < fin); b.classList.toggle('paso', hoy && s >= fin);
    const p = b.querySelector('.prog'); if(p) p.style.width = hoy && s >= ini && s < fin ? ((s - ini) / (fin - ini) * 100).toFixed(1) + '%' : '0';
  });
}
function claseGrande(){
  const g = grupoReloj(), q = queToca(horarioDe(g)), t = textoReloj(q);
  if(!t) return '<a id="claseGrande" class="clase-grande" href="#/horarios"><div class="meta"><span>' + ico('clock') + (g ? 'Todavía no hay horario del ' + e(nombreGrupo(g)) : 'Elige tu grupo para ver qué clase te toca') + '</span></div></a>';
  const b = q.actual || q.siguiente || q.manana;
  return '<a id="claseGrande" class="clase-grande" href="#/horarios"><div class="meta"><span>' + e(t.eti) + ' · ' + e(nombreGrupo(g)) + '</span>' + (b && b.salon ? '<span>' + ico('map-pin') + e(b.salon) + '</span>' : '') + '</div>' +
    '<div class="que">' + e(t.uno) + '</div><div class="r-barra"><i style="width:' + (t.p * 100).toFixed(1) + '%"></i></div><div class="meta"><span>' + e(t.pie) + '</span></div></a>';
}

/* ── el enrutador ─────────────────────────────────────────────────────── */
let rutaPrevia = '';
function render(quieto){
  const partes = location.hash.replace(/^#\/?/, '').split('/'), id = partes[0] || '', arg = decodeURIComponent(partes.slice(1).join('/'));
  const s = SECCIONES.find(x => x.id === id), oculta = OCULTAS[id];
  document.body.dataset.ruta = id || 'inicio';
  document.body.classList.toggle('pantalla', id === 'pantalla');
  if(id !== 'chat') S.chat.canal = '';
  pintarMenu();
  const main = $('#vista');
  /* el contenedor se recrea en cada pantalla: así no se juntan los oyentes */
  const nuevo = document.createElement('div'); nuevo.className = 'ancho';
  if(!S.cargado){ nuevo.innerHTML = '<div class="cargando-s">Cargando…</div>'; main.replaceChildren(nuevo); return; }
  if(s && s.soc && !esSoc() && !(s.id === 'miembros' && S.d.admin)){ nuevo.innerHTML = vacio('lock', 'Esto es sólo para la sociedad de alumnos.'); main.replaceChildren(nuevo); return; }
  const v = s ? s.v : oculta || vInicio;
  main.replaceChildren(nuevo);
  v(nuevo, arg);
  document.title = (s ? s.t + ' · ' : '') + 'Sociedad de Alumnos Rembrandt';
  if(!quieto && rutaPrevia !== location.hash) window.scrollTo(0, 0);
  rutaPrevia = location.hash;
}
const vacio = (i, t, extra) => '<div class="vacio">' + ico(i) + '<p>' + e(t) + '</p>' + (extra || '') + '</div>';
const avisoCuenta = (para) => conCuenta() ? '' : '<div class="aviso-cuenta">' + ico('lock') + '<div><b>Entra con tu cuenta para ' + e(para) + '.</b><br><span class="nota">Es la misma de Fadori: correo y contraseña.</span></div><a class="btn chico azul" href="#/cuenta">Entrar</a></div>';
async function hacer(que, cuerpo, bien){
  const r = await soc(que, cuerpo);
  if(!r.ok){ brindis(r.j.error || 'No se pudo.'); if(r.j.cuenta) location.hash = '#/cuenta'; return null; }
  if(bien) brindis(bien);
  await cargar(); return r.j;
}
const abierta = (v) => !v.cierra || Date.now() < (aFecha(v.cierra) || 0);

/* ══ INICIO ══════════════════════════════════════════════════════════════ */
function vInicio(c){
  const d = S.d, y = yo();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const proximos = d.eventos.filter(x => x.estado !== 'cancelado' && (!x.fecha || aFecha(x.fecha) >= hoy)).sort((a, b) => (a.fecha || '9').localeCompare(b.fecha || '9')).slice(0, 3);
  const votos = d.votos.filter(abierta).slice(0, 2);
  const fijos = d.avisos.filter(a => a.fijo && vigente(a)).sort((a, b) => b.creado - a.creado).slice(0, 3);
  const saludo = y ? '¡Hola, ' + e(String(y.nombre || y.alias).split(' ')[0]) + '!' : '¡Hola!';
  c.innerHTML = (d.error ? '<div class="aviso-cuenta">' + ico('triangle-alert') + '<div>' + e(d.error) + '</div></div>' : '') +
    '<section class="portada"><small>Sociedad de Alumnos</small><h1>' + saludo + '</h1>' + claseGrande() + '</section>' +
    '<nav class="atajos" aria-label="Atajos">' +
      [['buzon', 'inbox', 'Proponer', 1], ['votar', 'vote', 'Votar', 1], ['eventos', 'calendar-days', 'Eventos'], ['chats', 'messages-square', 'Chats'],
       ['muro', 'images', 'Recuerdos'], ['material', 'book-open', 'Material'], ['torneos', 'trophy', 'Torneos'], ['horarios', 'clock', 'Horarios']]
        .map(([h, i, t, oro]) => '<a href="#/' + h + '" class="' + (oro ? 'oro' : '') + '"><span class="bola">' + ico(i) + '</span>' + t + '</a>').join('') + '</nav>' +
    (fijos.length ? '<h2>' + ico('pin') + 'Importante</h2><div class="lista">' + fijos.map(tarjetaAviso).join('') + '</div>' : '') +
    (votos.length ? '<h2>' + ico('vote') + 'Votaciones abiertas<a class="mas" href="#/votar">Ver todas</a></h2><div class="lista dos">' + votos.map(tarjetaVoto).join('') + '</div>' : '') +
    '<h2>' + ico('calendar-days') + 'Lo que viene<a class="mas" href="#/eventos">Ver todo</a></h2>' +
    (proximos.length ? '<div class="lista">' + proximos.map(tarjetaEvento).join('') + '</div>' : vacio('calendar-days', 'Todavía no hay eventos. La sociedad los publica aquí.')) +
    '<div class="lista dos" style="margin-top:24px"><div id="tarjFadori"></div><div id="tarjRadio"></div></div>';
  enlazarVotos(c); enlazarEventos(c); enlazarAvisos(c);
  pintarFila($('#tarjFadori', c), true);
  pintarRadioChico($('#tarjRadio', c));
}
const vigente = (a) => !a.hasta || Date.now() < (aFecha(a.hasta) || 0) + 864e5;

/* ══ HORARIOS ═══════════════════════════════════════════════════════════ */
function vHorarios(c){
  const d = S.d, g = grupoReloj(), h = horarioDe(g), { dia } = ahoraMx();
  const grupos = d.grupos;
  const diaSel = Number(S.filtros.dia) || (dia <= 6 ? dia : 1);
  const bs = bloques(h, diaSel);
  c.innerHTML = '<div class="cabeza"><div><h1>Horarios</h1><p class="sub">Qué clase toca en cada grupo, ahora mismo.</p></div>' +
    '<a class="btn chico" href="#/pantalla">' + ico('tv') + 'Ponerlo en la tele</a></div>' +
    '<label class="campo"><span>Tu grupo (el del reloj de arriba)</span><select id="selGrupo"><option value="">Elige…</option>' +
      grupos.map(x => '<option value="' + e(x.id) + '"' + (x.id === g ? ' selected' : '') + '>' + e(x.nombre) + '</option>').join('') + '</select></label>' +
    (h ? '<div class="filtros" role="tablist">' + [1, 2, 3, 4, 5, 6].filter(n => n <= 5 || bloques(h, 6).length).map(n => '<button data-dia="' + n + '" class="' + (n === diaSel ? 'si' : '') + '">' + DIAS[n] + (n === dia ? ' · hoy' : '') + '</button>').join('') + '</div>' +
      (bs.length ? '<div class="hoy">' + bs.map(b => '<div class="bloque" data-ini="' + b.ini + '" data-fin="' + b.fin + '" data-hoy="' + (diaSel === dia ? 1 : 0) + '"><span class="tira" style="background:' + colorDe(b) + '"></span>' +
        '<div class="horas"><b>' + hora12(b.ini) + '</b>a ' + hora12(b.fin) + '</div><div><h3>' + e(b.materia) + '</h3><div class="meta">' + (b.salon ? '<span>' + ico('map-pin') + e(b.salon) + '</span>' : '') + '<span>' + Math.round((aSeg(b.fin) - aSeg(b.ini)) / 60) + ' min</span></div></div><span class="prog"></span></div>').join('') + '</div>'
        : vacio('calendar-check', 'Este día no hay clases capturadas.')) +
      '<h2>' + ico('calendar-days') + 'La semana</h2>' + semana(h)
      : vacio('clock', g ? 'Todavía no hay horario del ' + nombreGrupo(g) + '.' : 'Elige tu grupo para ver su horario.', esSoc() ? '' : '<p class="nota">Lo captura la sociedad de alumnos.</p>')) +
    (esSoc() ? '<div class="botones"><button class="btn azul" id="editarH">' + ico('pencil') + (h ? 'Editar el horario del ' + e(nombreGrupo(g)) : 'Capturar un horario') + '</button></div>' : '');
  $('#selGrupo', c).onchange = (ev) => { L.set('soc_grupo', ev.target.value); pintarReloj(); render(true); };
  $$('[data-dia]', c).forEach(b => b.onclick = () => { S.filtros.dia = b.dataset.dia; render(true); });
  const ed = $('#editarH', c); if(ed) ed.onclick = () => editarHorario(h || { grupo: g, nombre: nombreGrupo(g), dias: {} });
  pintarReloj();
}
function semana(h){
  const dias = [1, 2, 3, 4, 5, 6].filter(n => n <= 5 || bloques(h, 6).length);
  const horas = [...new Set(dias.flatMap(n => bloques(h, n).map(b => b.ini + '|' + b.fin)))].sort();
  if(!horas.length) return '';
  return '<div class="semana"><table><thead><tr><th></th>' + dias.map(n => '<th>' + DIAS[n].slice(0, 3) + '</th>').join('') + '</tr></thead><tbody>' +
    horas.map(hf => { const [ini, fin] = hf.split('|'); return '<tr><td class="hora">' + hora12(ini).replace(/ (am|pm)/, '') + '</td>' + dias.map(n => { const b = bloques(h, n).find(x => x.ini === ini && x.fin === fin);
      return '<td>' + (b ? '<div class="celda" style="background:' + colorDe(b) + '">' + e(b.materia) + (b.salon ? '<small>' + e(b.salon) + '</small>' : '') + '</div>' : '') + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div>';
}
function editarHorario(h){
  const copia = JSON.parse(JSON.stringify(h)); copia.dias = copia.dias || {};
  let dia = 1;
  const materias = [...new Set(S.d.horarios.flatMap(x => Object.values(x.dias || {}).flat().map(b => b.materia)))].sort();
  hoja('Horario del ' + (h.nombre || h.grupo || 'grupo'), '', (cu, cerrar) => {
    const pinta = () => {
      const bs = copia.dias[dia] = copia.dias[dia] || [];
      cu.innerHTML = '<div class="fila2"><label class="campo"><span>Grupo</span><input id="hGrupo" value="' + e(copia.nombre || copia.grupo || '') + '" placeholder="3.1" maxlength="8"></label>' +
        '<label class="campo"><span>Turno</span><input id="hTurno" value="' + e(copia.turno || '') + '" placeholder="Matutino" maxlength="20"></label></div>' +
        '<div class="filtros">' + [1, 2, 3, 4, 5, 6].map(n => '<button data-d="' + n + '" class="' + (n === dia ? 'si' : '') + '">' + DIAS[n].slice(0, 3) + ' · ' + (copia.dias[n] || []).length + '</button>').join('') + '</div>' +
        '<div class="editor-dia">' + bs.map((b, i) => '<div class="renglon-h" data-i="' + i + '"><input type="time" data-k="ini" value="' + e(b.ini) + '" aria-label="Empieza"><input type="time" data-k="fin" value="' + e(b.fin) + '" aria-label="Termina">' +
          '<input data-k="materia" value="' + e(b.materia) + '" placeholder="Materia" list="listaMaterias" aria-label="Materia"><input class="salon" data-k="salon" value="' + e(b.salon || '') + '" placeholder="Salón" aria-label="Salón">' +
          '<button class="ico-btn" data-quitar="' + i + '" aria-label="Quitar">' + ico('trash') + '</button></div>').join('') + '</div>' +
        '<datalist id="listaMaterias">' + materias.map(m => '<option value="' + e(m) + '">').join('') + '</datalist>' +
        '<div class="botones"><button class="btn chico" id="hMas">' + ico('plus') + 'Agregar clase</button><button class="btn chico" id="hCopiar">' + ico('copy') + 'Copiar este día a toda la semana</button></div>' +
        '<details style="margin-top:16px"><summary class="nota">Pegar el horario desde Excel o Sheets</summary><p class="nota">Copia la tabla completa (primera fila con los días, primera columna con las horas «7:00-7:50») y pégala aquí.</p>' +
        '<label class="campo"><textarea id="hPegar" placeholder="Hora	Lunes	Martes…"></textarea></label><button class="btn chico" id="hLeer">Leer lo pegado</button></details>' +
        '<div class="botones"><button class="btn prin lleno" id="hGuardar">' + ico('check') + 'Guardar horario</button></div>';
      $$('[data-d]', cu).forEach(b => b.onclick = () => { leerFilas(); dia = Number(b.dataset.d); pinta(); });
      $$('[data-quitar]', cu).forEach(b => b.onclick = () => { leerFilas(); bs.splice(Number(b.dataset.quitar), 1); pinta(); });
      $('#hMas', cu).onclick = () => { leerFilas(); const u = bs[bs.length - 1]; const ini = u ? u.fin : '07:00'; const s = aSeg(ini) + 50 * 60;
        bs.push({ ini, fin: String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0'), materia: '', salon: '' }); pinta(); $$('[data-k=materia]', cu).pop().focus(); };
      $('#hCopiar', cu).onclick = () => { leerFilas(); for(let n = 1; n <= 5; n++) if(n !== dia) copia.dias[n] = JSON.parse(JSON.stringify(bs)); brindis('Copiado de lunes a viernes'); pinta(); };
      $('#hLeer', cu).onclick = () => { const r = leerPegado($('#hPegar', cu).value); const n = Object.values(r).flat().length; if(!n){ brindis('No se entendió. Revisa que la primera fila traiga los días.'); return; } Object.assign(copia.dias, r); brindis(n + ' clases leídas'); pinta(); };
      $('#hGuardar', cu).onclick = async () => {
        leerFilas();
        const nombre = $('#hGrupo', cu).value.trim(); if(!nombre){ brindis('Falta el grupo.'); return; }
        const rec = Object.assign({}, copia, { grupo: nombre, nombre, turno: $('#hTurno', cu).value });
        if(h.grupo && norm(h.grupo).replace(/[^a-z0-9]/g, '') !== norm(nombre).replace(/[^a-z0-9]/g, '')) delete rec.id;
        const j = await hacer('guardar', { cajon: 'horarios', rec }, 'Horario guardado');
        if(j){ if(!L.get('soc_grupo') && !(yo() && yo().grupo)) L.set('soc_grupo', j.rec.grupo); cerrar(); render(true); }
      };
    };
    const leerFilas = () => { $$('.renglon-h', cu).forEach(f => { const b = copia.dias[dia][Number(f.dataset.i)]; $$('[data-k]', f).forEach(x => { b[x.dataset.k] = x.value.trim(); }); }); copia.dias[dia] = copia.dias[dia].filter(b => b.materia || b.ini); };
    pinta();
  });
}

/* LA PANTALLA DE HORARIOS: para una tele en el pasillo. Todos los grupos,
   qué tienen ahora y cuánto les falta. */
function vPantalla(c){
  c.innerHTML = '<div class="tele-h"><img src="escudo.png" alt=""><h1>¿Qué clase toca?</h1><span class="hora" id="teleHora"></span><button class="btn chico" id="telePlena">' + ico('maximize') + 'Pantalla completa</button><a class="btn chico" href="#/horarios">' + ico('x') + 'Salir</a></div><div class="tele-g" id="teleG"></div>';
  $('#telePlena', c).onclick = () => document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
  pintarTele();
}
function pintarTele(){
  const g = $('#teleG'); if(!g) return;
  const { seg } = ahoraMx(), hs = S.d.horarios.slice().sort((a, b) => a.grupo.localeCompare(b.grupo, 'es', { numeric: true }));
  $('#teleHora').textContent = ((Math.floor(seg / 3600) % 12) || 12) + ':' + String(Math.floor(seg / 60) % 60).padStart(2, '0');
  g.innerHTML = hs.length ? hs.map(h => { const q = queToca(h), t = textoReloj(q); const b = q.actual || q.siguiente || q.manana;
    return '<div class="tele-c"><div class="g">' + e(h.nombre || h.grupo) + '</div><div class="m">' + e(t ? t.uno : 'Sin clases') + '</div><div class="s">' + e(t ? t.pie : '') + (b && b.salon ? ' · ' + e(b.salon) : '') + '</div>' +
      '<div class="r-barra"><i style="width:' + (t ? t.p * 100 : 0).toFixed(1) + '%"></i></div></div>'; }).join('') : '<p>Todavía no hay horarios capturados.</p>';
}

/* ══ AVISOS ═════════════════════════════════════════════════════════════ */
const CATS = ['general', 'urgente', 'eventos', 'deportes', 'académico', 'objetos perdidos'];
function tarjetaAviso(a){
  return '<article class="tarjeta' + (a.fijo ? ' fijo' : '') + '" data-aviso="' + e(a.id) + '"><div class="meta">' + (a.fijo ? '<span class="chip oro">' + ico('pin') + 'Fijado</span>' : '') +
    '<span class="chip ' + (a.cat === 'urgente' ? 'mal' : 'azul') + '">' + e(a.cat) + '</span><span>' + hace(a.creado) + '</span></div>' +
    '<h3 style="margin-top:8px">' + e(a.titulo) + '</h3>' + (a.img ? '<img class="aviso-img" src="' + a.img + '" alt="">' : '') + '<p class="texto">' + e(a.texto) + '</p>' +
    (a.hasta ? '<p class="nota">Vigente hasta ' + fechaBonita(a.hasta, false) + '</p>' : '') +
    (esSoc() ? '<div class="botones"><button class="btn chico" data-editar-aviso="' + e(a.id) + '">' + ico('pencil') + 'Editar</button><button class="btn chico mal" data-borrar-aviso="' + e(a.id) + '">' + ico('trash') + 'Quitar</button></div>' : '') + '</article>';
}
function vAvisos(c){
  const f = S.filtros.cat || '';
  const lista = S.d.avisos.filter(a => (!f || a.cat === f) && (vigente(a) || esSoc())).sort((a, b) => (b.fijo - a.fijo) || (b.creado - a.creado));
  c.innerHTML = '<div class="cabeza"><div><h1>Avisos</h1><p class="sub">El tablón de la sociedad: eventos, deportes, lo urgente y lo perdido.</p></div>' +
    (esSoc() ? '<button class="btn prin" id="nuevoAviso">' + ico('plus') + 'Nuevo aviso</button>' : '') + '</div>' +
    '<div class="filtros">' + ['', ...CATS].map(x => '<button data-cat="' + x + '" class="' + (x === f ? 'si' : '') + '">' + (x || 'Todos') + '</button>').join('') + '</div>' +
    (lista.length ? '<div class="lista dos">' + lista.map(tarjetaAviso).join('') + '</div>' : vacio('megaphone', 'No hay avisos por ahora.'));
  $$('[data-cat]', c).forEach(b => b.onclick = () => { S.filtros.cat = b.dataset.cat; render(true); });
  const n = $('#nuevoAviso', c); if(n) n.onclick = () => editarAviso({});
  enlazarAvisos(c);
}
function enlazarAvisos(c){
  $$('[data-editar-aviso]', c).forEach(b => b.onclick = () => editarAviso(S.d.avisos.find(a => a.id === b.dataset.editarAviso)));
  $$('[data-borrar-aviso]', c).forEach(b => b.onclick = async () => { if(b.dataset.seguro){ await hacer('borrar', { cajon: 'avisos', id: b.dataset.borrarAviso }, 'Aviso quitado'); render(true); } else { b.dataset.seguro = 1; b.lastChild.textContent = '¿Seguro? Toca otra vez'; } });
}
function editarAviso(a){
  hoja(a.id ? 'Editar aviso' : 'Nuevo aviso', '<form id="fAviso">' +
    '<label class="campo"><span>Título</span><input name="titulo" required maxlength="90" value="' + e(a.titulo || '') + '"></label>' +
    '<label class="campo"><span>Qué hay que saber</span><textarea name="texto" maxlength="2000">' + e(a.texto || '') + '</textarea></label>' +
    '<div class="fila2"><label class="campo"><span>Tipo</span><select name="cat">' + CATS.map(x => '<option' + (x === a.cat ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
    '<label class="campo"><span>Quitar el</span><input type="date" name="hasta" value="' + e(a.hasta || '') + '"></label></div>' +
    '<label class="campo"><span>Imagen (opcional)</span><input type="file" name="foto" accept="image/*"></label>' +
    '<label class="palomita"><input type="checkbox" name="fijo"' + (a.fijo ? ' checked' : '') + '>Fijarlo arriba (importante)</label>' +
    (a.id ? '' : '<label class="palomita"><input type="checkbox" name="avisar" checked>Mandar notificación a los teléfonos</label>') +
    '<button class="btn prin lleno" style="margin-top:12px">' + ico('send') + (a.id ? 'Guardar' : 'Publicar') + '</button></form>', (cu, cerrar) => {
    $('#fAviso', cu).onsubmit = async (ev) => {
      ev.preventDefault(); const o = leer(ev.target), f = ev.target.foto.files[0];
      let img = a.img || ''; if(f) img = await aDato(await achicar(f, 1200, 280000));
      if(await hacer('guardar', { cajon: 'avisos', rec: Object.assign({}, a, o, { img }), avisar: o.avisar }, a.id ? 'Guardado' : 'Publicado')){ cerrar(); render(true); }
    };
  });
}

/* ══ EVENTOS Y COMPETENCIAS ════════════════════════════════════════════ */
const TIPOS_EV = { competencia: 'Competencia', torneo: 'Torneo', evento: 'Evento', convocatoria: 'Convocatoria' };
const EST_EV = { propuesta: ['Propuesta', ''], 'votación': ['En votación', 'oro'], inscripciones: ['Inscripciones abiertas', 'bien'], confirmado: ['Confirmado', 'azul'], 'en curso': ['En curso', 'mal'], terminado: ['Terminado', ''], cancelado: ['Cancelado', 'mal'] };
function tarjetaEvento(x){
  const f = diaMes(x.fecha), est = EST_EV[x.estado] || [x.estado, ''];
  return '<button class="tarjeta tocable ev" data-evento="' + e(x.id) + '"><div class="fecha-b">' + (f ? '<b>' + f.d + '</b><small>' + f.m + '</small>' : '<b>·</b><small>por fijar</small>') + '</div><div>' +
    '<div class="meta"><span class="chip ' + est[1] + '">' + e(est[0]) + '</span><span>' + e(TIPOS_EV[x.tipo] || x.tipo) + (x.categoria ? ' · ' + e(x.categoria) : '') + '</span></div>' +
    '<h3 style="margin-top:6px">' + e(x.titulo) + '</h3><div class="meta">' + (x.fecha ? '<span>' + ico('clock') + fechaBonita(x.fecha) + '</span>' : '') + (x.lugar ? '<span>' + ico('map-pin') + e(x.lugar) + '</span>' : '') +
    (x.inscrito ? '<span class="chip bien">' + ico('check') + 'Inscrito</span>' : '') + '</div>' +
    (x.cupo ? '<div class="cupo" title="' + x.nInscritos + ' de ' + x.cupo + '"><i style="width:' + Math.min(100, x.nInscritos / x.cupo * 100) + '%"></i></div><p class="nota" style="margin:4px 0 0">' + x.nInscritos + ' de ' + x.cupo + ' lugares</p>' : x.nInscritos ? '<p class="nota" style="margin:6px 0 0">' + x.nInscritos + ' inscritos</p>' : '') +
    '</div></button>';
}
function enlazarEventos(c){ $$('[data-evento]', c).forEach(b => b.onclick = () => verEvento(b.dataset.evento)); }
function vEventos(c){
  const f = S.filtros.tipo || '', modo = S.filtros.modo || 'lista';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  let lista = S.d.eventos.filter(x => !f || x.tipo === f);
  if(S.filtros.diaCal) lista = lista.filter(x => (x.fecha || '').slice(0, 10) === S.filtros.diaCal);
  const vienen = lista.filter(x => !x.fecha || aFecha(x.fecha) >= hoy).sort((a, b) => (a.fecha || '9').localeCompare(b.fecha || '9'));
  const pasados = lista.filter(x => x.fecha && aFecha(x.fecha) < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha));
  c.innerHTML = '<div class="cabeza"><div><h1>Eventos y competencias</h1><p class="sub">Fechas, lugar, requisitos y cómo inscribirte. Dibujo, canto, torneos y lo que se organice.</p></div>' +
    (esSoc() ? '<button class="btn prin" id="nuevoEv">' + ico('plus') + 'Nuevo</button>' : '') + '</div>' + avisoCuenta('inscribirte') +
    '<div class="filtros">' + [['', 'Todos'], ...Object.entries(TIPOS_EV)].map(([k, t]) => '<button data-tipo="' + k + '" class="' + (k === f ? 'si' : '') + '">' + t + '</button>').join('') +
      '<button data-modo="' + (modo === 'lista' ? 'cal' : 'lista') + '">' + ico(modo === 'lista' ? 'calendar-days' : 'list-checks') + (modo === 'lista' ? 'Calendario' : 'Lista') + '</button></div>' +
    (modo === 'cal' ? calendario() : '') +
    (S.filtros.diaCal ? '<p><span class="chip azul">' + fechaBonita(S.filtros.diaCal, false) + '</span> <button class="btn chico" id="quitarDia">Ver todos</button></p>' : '') +
    (vienen.length ? '<div class="lista">' + vienen.map(tarjetaEvento).join('') + '</div>' : vacio('calendar-days', 'No hay eventos próximos.')) +
    (pasados.length ? '<h2>' + ico('calendar-check') + 'Ya pasaron</h2><div class="lista">' + pasados.slice(0, 20).map(tarjetaEvento).join('') + '</div>' : '');
  $$('[data-tipo]', c).forEach(b => b.onclick = () => { S.filtros.tipo = b.dataset.tipo; render(true); });
  $$('[data-modo]', c).forEach(b => b.onclick = () => { S.filtros.modo = b.dataset.modo; S.filtros.diaCal = ''; render(true); });
  $$('[data-dcal]', c).forEach(b => b.onclick = () => { S.filtros.diaCal = b.dataset.dcal; render(true); });
  $$('[data-mes]', c).forEach(b => b.onclick = () => { S.cal = Number(b.dataset.mes); render(true); });
  const q = $('#quitarDia', c); if(q) q.onclick = () => { S.filtros.diaCal = ''; render(true); };
  const n = $('#nuevoEv', c); if(n) n.onclick = () => editarEvento({});
  enlazarEventos(c);
}
function calendario(){
  const base = new Date(); base.setDate(1); base.setHours(0, 0, 0, 0); if(S.cal) base.setMonth(base.getMonth() + S.cal);
  const mes = base.getMonth(), anio = base.getFullYear(), primero = (base.getDay() + 6) % 7, diasMes = new Date(anio, mes + 1, 0).getDate();
  const con = {}; for(const x of S.d.eventos) if(x.fecha) (con[x.fecha.slice(0, 10)] = con[x.fecha.slice(0, 10)] || []).push(x);
  const hoyS = new Date().toISOString().slice(0, 10);
  let celdas = ''; for(let i = 0; i < primero; i++) celdas += '<span></span>';
  for(let d = 1; d <= diasMes; d++){ const k = anio + '-' + String(mes + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'), n = (con[k] || []).length;
    celdas += '<button data-dcal="' + k + '" style="min-height:44px;border-radius:10px;border:1px solid ' + (k === hoyS ? 'var(--oro)' : 'var(--linea)') + ';background:' + (n ? 'var(--azulT)' : 'var(--sup)') + ';font-weight:' + (n ? 800 : 500) + ';cursor:pointer;position:relative">' + d + (n ? '<i style="position:absolute;bottom:5px;left:50%;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:var(--azul2)"></i>' : '') + '</button>'; }
  const nombre = base.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return '<div class="tarjeta" style="margin-bottom:16px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><button class="ico-btn" data-mes="' + ((S.cal || 0) - 1) + '" aria-label="Mes anterior">' + ico('chevron-left') + '</button><b style="flex:1;text-align:center;text-transform:capitalize">' + e(nombre) + '</b><button class="ico-btn" data-mes="' + ((S.cal || 0) + 1) + '" aria-label="Mes siguiente">' + ico('chevron-right') + '</button></div>' +
    '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center;font-size:12px;color:var(--tenue);margin-bottom:4px">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => '<span>' + x + '</span>').join('') + '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">' + celdas + '</div></div>';
}
function verEvento(id){
  const x = S.d.eventos.find(v => v.id === id); if(!x) return;
  const est = EST_EV[x.estado] || [x.estado, ''];
  const abiertas = ['inscripciones', 'propuesta', 'votación', 'confirmado'].indexOf(x.estado) >= 0 && (!x.cierre || Date.now() < (aFecha(x.cierre) || 0) + 864e5);
  const lleno = x.cupo && x.nInscritos >= x.cupo && !x.inscrito;
  const voto = x.votoId && S.d.votos.find(v => v.id === x.votoId), torneo = x.torneoId && S.d.torneos.find(t => t.id === x.torneoId);
  hoja(x.titulo, (x.img ? '<img class="aviso-img" src="' + x.img + '" alt="">' : '') +
    '<div class="meta"><span class="chip ' + est[1] + '">' + e(est[0]) + '</span><span>' + e(TIPOS_EV[x.tipo] || x.tipo) + (x.categoria ? ' · ' + e(x.categoria) : '') + '</span></div>' +
    '<div class="meta" style="margin:10px 0">' + (x.fecha ? '<span>' + ico('calendar-days') + fechaBonita(x.fecha) + '</span>' : '<span>Fecha por fijar</span>') + (x.lugar ? '<span>' + ico('map-pin') + e(x.lugar) + '</span>' : '') +
      (x.cierre ? '<span>' + ico('calendar-clock') + 'Inscripciones hasta ' + fechaBonita(x.cierre, false) + '</span>' : '') + '</div>' +
    (x.desc ? '<p class="texto">' + e(x.desc) + '</p>' : '') +
    (x.requisitos ? '<h3 style="margin-top:16px">' + 'Requisitos' + '</h3><p class="texto">' + e(x.requisitos) + '</p>' : '') +
    (x.premios ? '<h3 style="margin-top:16px">Premios</h3><p class="texto">' + e(x.premios) + '</p>' : '') +
    (x.cupo ? '<div class="cupo"><i style="width:' + Math.min(100, x.nInscritos / x.cupo * 100) + '%"></i></div><p class="nota">' + x.nInscritos + ' de ' + x.cupo + ' lugares</p>' : '<p class="nota">' + x.nInscritos + ' inscritos</p>') +
    (voto ? '<p><a class="btn chico" href="#/votar">' + ico('vote') + 'Ir a la votación</a></p>' : '') + (torneo ? '<p><a class="btn chico" href="#/torneo/' + e(torneo.id) + '">' + ico('trophy') + 'Ver las llaves del torneo</a></p>' : '') +
    (abiertas ? (conCuenta() ? '<form id="fInsc">' + (x.porEquipo && !x.inscrito ? '<label class="campo"><span>Nombre de tu equipo</span><input name="equipo" maxlength="40" required></label>' : '') +
      (!x.inscrito ? '<label class="campo"><span>Algo que debamos saber (opcional)</span><input name="nota" maxlength="140" placeholder="Categoría, instrumento, talla…"></label>' : '') +
      '<button class="btn ' + (x.inscrito ? '' : 'prin') + ' lleno"' + (lleno ? ' disabled' : '') + '>' + ico(x.inscrito ? 'user-minus' : 'user-plus') + (x.inscrito ? 'Ya no voy (darme de baja)' : lleno ? 'Ya no hay lugar' : 'Inscribirme') + '</button></form>'
      : avisoCuenta('inscribirte')) : '<p class="nota">Las inscripciones están cerradas.</p>') +
    '<h3 style="margin-top:20px">Cómo va</h3>' + (x.bitacora && x.bitacora.length ? '<div class="bitacora">' + x.bitacora.slice().reverse().map(b => '<div><small>' + hace(b.t) + ' · ' + e(b.por) + '</small><p class="texto">' + e(b.texto) + '</p></div>').join('') + '</div>' : '<p class="nota">Todavía no hay novedades.</p>') +
    (esSoc() ? '<form id="fBit" style="margin-top:8px"><label class="campo"><span>Anotar cómo va la organización</span><textarea name="texto" maxlength="600" style="min-height:70px" required></textarea></label><button class="btn chico">' + ico('notebook-pen') + 'Anotar</button></form>' +
      (x.lista ? '<h3 style="margin-top:20px">Inscritos (' + x.lista.length + ')</h3>' + (x.lista.length ? '<div class="tabla-caja"><table class="tabla"><tr><th>Nombre</th><th>Grupo</th><th>' + (x.porEquipo ? 'Equipo' : 'Nota') + '</th></tr>' + x.lista.map(i => '<tr><td>' + e(i.alias) + '</td><td>' + e(nombreGrupo(i.grupo)) + '</td><td>' + e(i.equipo || i.nota || '') + '</td></tr>').join('') + '</table></div><button class="btn chico" id="csvInsc" style="margin-top:8px">' + ico('download') + 'Bajar la lista (Excel)</button>' : '<p class="nota">Nadie todavía.</p>') : '') +
      '<div class="botones"><button class="btn chico" id="editEv">' + ico('pencil') + 'Editar</button>' + (x.tipo === 'torneo' && !torneo ? '<button class="btn chico" id="armarT">' + ico('trophy') + 'Armar llaves con los inscritos</button>' : '') + '<button class="btn chico mal" id="borrarEv">' + ico('trash') + 'Borrar</button></div>' : ''),
  (cu, cerrar) => {
    const fi = $('#fInsc', cu); if(fi) fi.onsubmit = async (ev) => { ev.preventDefault(); const o = leer(fi); const j = await hacer('inscribir', { id, equipo: o.equipo || '', nota: o.nota || '' }); if(j){ brindis(j.inscrito ? '¡Listo, quedaste inscrito!' : 'Te diste de baja'); cerrar(); render(true); } };
    const fb = $('#fBit', cu); if(fb) fb.onsubmit = async (ev) => { ev.preventDefault(); const t = leer(fb).texto.trim(); if(!t) return; const rec = Object.assign({}, x, { bitacora: (x.bitacora || []).concat({ t: Date.now(), texto: t, por: yo().alias }) });
      if(await hacer('guardar', { cajon: 'eventos', rec }, 'Anotado')) verEvento(id); };
    const ed = $('#editEv', cu); if(ed) ed.onclick = () => editarEvento(x);
    const bo = $('#borrarEv', cu); if(bo) bo.onclick = async () => { if(bo.dataset.seguro){ if(await hacer('borrar', { cajon: 'eventos', id }, 'Borrado')){ cerrar(); render(true); } } else { bo.dataset.seguro = 1; bo.lastChild.textContent = '¿Seguro? Toca otra vez'; } };
    const csv = $('#csvInsc', cu); if(csv) csv.onclick = () => bajarCSV(x.titulo + ' - inscritos', [['Nombre', 'Grupo', 'Equipo', 'Nota', 'Fecha'], ...x.lista.map(i => [i.alias, nombreGrupo(i.grupo), i.equipo || '', i.nota || '', new Date(i.t).toLocaleString('es-MX')])]);
    const at = $('#armarT', cu); if(at) at.onclick = async () => {
      const equipos = [...new Set(x.lista.map(i => x.porEquipo ? i.equipo : i.alias + ' · ' + nombreGrupo(i.grupo)).filter(Boolean))];
      if(equipos.length < 2){ brindis('Hacen falta al menos 2 inscritos.'); return; }
      const j = await hacer('guardar', { cajon: 'torneos', rec: { nombre: x.titulo, deporte: x.categoria, rondas: armarLlaves(equipos), estado: 'en curso' } });
      if(j){ await hacer('guardar', { cajon: 'eventos', rec: Object.assign({}, x, { torneoId: j.rec.id }) }); cerrar(); location.hash = '#/torneo/' + j.rec.id; }
    };
  });
}
function editarEvento(x){
  hoja(x.id ? 'Editar evento' : 'Nuevo evento o competencia', '<form id="fEv">' +
    '<label class="campo"><span>Nombre</span><input name="titulo" required maxlength="90" value="' + e(x.titulo || '') + '" placeholder="Concurso de dibujo"></label>' +
    '<div class="fila2"><label class="campo"><span>Tipo</span><select name="tipo">' + Object.entries(TIPOS_EV).map(([k, t]) => '<option value="' + k + '"' + (k === x.tipo ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>' +
    '<label class="campo"><span>Categoría</span><input name="categoria" maxlength="40" value="' + e(x.categoria || '') + '" placeholder="Dibujo, canto, fútbol…" list="catsEv"></label></div>' +
    '<datalist id="catsEv">' + ['Dibujo', 'Canto', 'Baile', 'Fútbol', 'Básquetbol', 'Voleibol', 'Ajedrez', 'Oratoria', 'Ciencia', 'Videojuegos', 'Cultural', 'Convivio'].map(t => '<option value="' + t + '">').join('') + '</datalist>' +
    '<div class="fila2"><label class="campo"><span>Cuándo</span><input type="datetime-local" name="fecha" value="' + e(paraInput(x.fecha)) + '"></label>' +
    '<label class="campo"><span>Dónde</span><input name="lugar" maxlength="80" value="' + e(x.lugar || '') + '" placeholder="Cancha, auditorio…"></label></div>' +
    '<div class="fila2"><label class="campo"><span>Inscripciones hasta</span><input type="date" name="cierre" value="' + e((x.cierre || '').slice(0, 10)) + '"></label>' +
    '<label class="campo"><span>Lugares (0 = sin límite)</span><input type="number" name="cupo" min="0" max="2000" value="' + e(x.cupo || 0) + '"></label></div>' +
    '<label class="campo"><span>De qué se trata</span><textarea name="desc" maxlength="3000">' + e(x.desc || '') + '</textarea></label>' +
    '<label class="campo"><span>Requisitos</span><textarea name="requisitos" maxlength="1500" style="min-height:80px" placeholder="Qué traer, quién puede entrar, reglas…">' + e(x.requisitos || '') + '</textarea></label>' +
    '<label class="campo"><span>Premios</span><input name="premios" maxlength="600" value="' + e(x.premios || '') + '"></label>' +
    '<div class="fila2"><label class="campo"><span>Estado</span><select name="estado">' + Object.entries(EST_EV).map(([k, [t]]) => '<option value="' + k + '"' + (k === (x.estado || 'inscripciones') ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>' +
    '<label class="campo"><span>Votación ligada</span><select name="votoId"><option value="">Ninguna</option>' + S.d.votos.map(v => '<option value="' + e(v.id) + '"' + (v.id === x.votoId ? ' selected' : '') + '>' + e(v.pregunta) + '</option>').join('') + '</select></label></div>' +
    '<label class="campo"><span>Torneo ligado</span><select name="torneoId"><option value="">Ninguno</option>' + S.d.torneos.map(t => '<option value="' + e(t.id) + '"' + (t.id === x.torneoId ? ' selected' : '') + '>' + e(t.nombre) + '</option>').join('') + '</select></label>' +
    '<label class="campo"><span>Imagen (opcional)</span><input type="file" name="foto" accept="image/*"></label>' +
    '<label class="palomita"><input type="checkbox" name="porEquipo"' + (x.porEquipo ? ' checked' : '') + '>Se inscriben por equipo</label>' +
    (x.id ? '' : '<label class="palomita"><input type="checkbox" name="avisar" checked>Mandar notificación a los teléfonos</label>') +
    '<button class="btn prin lleno" style="margin-top:12px">' + ico('check') + (x.id ? 'Guardar' : 'Publicar') + '</button></form>', (cu, cerrar) => {
    $('#fEv', cu).onsubmit = async (ev) => {
      ev.preventDefault(); const o = leer(ev.target), f = ev.target.foto.files[0];
      let img = x.img || ''; if(f) img = await aDato(await achicar(f, 1200, 280000));
      const j = await hacer('guardar', { cajon: 'eventos', rec: Object.assign({}, x, o, { img, cupo: Number(o.cupo) || 0 }), avisar: o.avisar }, x.id ? 'Guardado' : 'Publicado');
      if(j){ cerrar(); render(true); }
    };
  });
}
function bajarCSV(nombre, filas){
  const txt = '﻿' + filas.map(f => f.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = nombre.replace(/[^\wáéíóúñ .-]/gi, '') + '.csv'; a.click();
}

/* ══ VOTACIONES ═════════════════════════════════════════════════════════ */
function tarjetaVoto(v){
  const ab = abierta(v), total = v.total || 0, puede = ab && conCuenta() && (!v.soloGrupo || (yo() && yo().grupo === v.soloGrupo));
  return '<article class="tarjeta" data-voto="' + e(v.id) + '"><div class="meta"><span class="chip ' + (ab ? 'bien' : '') + '">' + (ab ? 'Abierta' : 'Cerrada') + '</span>' +
    (v.cierra ? '<span>' + ico('clock') + (ab ? 'Cierra ' : 'Cerró ') + fechaBonita(v.cierra) + '</span>' : '') + (v.soloGrupo ? '<span>Sólo ' + e(nombreGrupo(v.soloGrupo)) + '</span>' : '') + '<span>' + total + ' voto' + (total === 1 ? '' : 's') + '</span></div>' +
    '<h3 style="margin-top:8px">' + e(v.pregunta) + '</h3>' + (v.desc ? '<p class="texto nota">' + e(v.desc) + '</p>' : '') +
    v.opciones.map(o => { const n = v.cuenta ? v.cuenta[o.id] || 0 : null, pct = n != null && total ? Math.round(n / total * 100) : 0;
      return '<button class="opcion' + (v.miVoto === o.id ? ' mio' : '') + '" data-op="' + e(o.id) + '"' + (puede ? '' : ' disabled') + '>' + (n != null ? '<span class="barra-v" style="width:' + pct + '%"></span>' : '') +
        '<span class="marca-v">' + (v.miVoto === o.id ? ico('check') : '') + '</span><span>' + e(o.texto) + (o.detalle ? '<br><small class="nota">' + e(o.detalle) + '</small>' : '') + '</span>' + (n != null ? '<span class="pct">' + pct + '%</span>' : '') + '</button>'; }).join('') +
    (ab && !v.cuenta ? '<p class="nota" style="margin-top:8px">Los resultados se ven cuando cierre. ' + (v.miVoto ? 'Puedes cambiar tu voto hasta entonces.' : '') + '</p>' : '') +
    (esSoc() ? '<div class="botones">' + (ab ? '<button class="btn chico" data-cerrar-voto>' + ico('lock') + 'Cerrar ya</button>' : '') + '<button class="btn chico mal" data-borrar-voto>' + ico('trash') + 'Borrar</button></div>' : '') + '</article>';
}
function enlazarVotos(c){
  $$('[data-voto]', c).forEach(t => {
    const id = t.dataset.voto, v = S.d.votos.find(x => x.id === id);
    $$('[data-op]', t).forEach(b => b.onclick = async () => { if(await hacer('votar', { id, opcion: b.dataset.op }, '¡Voto contado!')) render(true); });
    const ce = $('[data-cerrar-voto]', t); if(ce) ce.onclick = async () => { const ahora = new Date(Date.now() - 60000); const s = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0') + '-' + String(ahora.getDate()).padStart(2, '0') + 'T' + String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');
      if(await hacer('guardar', { cajon: 'votos', rec: Object.assign({}, v, { cierra: s }) }, 'Votación cerrada')) render(true); };
    const bo = $('[data-borrar-voto]', t); if(bo) bo.onclick = async () => { if(bo.dataset.seguro){ if(await hacer('borrar', { cajon: 'votos', id }, 'Borrada')) render(true); } else { bo.dataset.seguro = 1; bo.lastChild.textContent = '¿Seguro?'; } };
  });
}
function vVotar(c){
  const ab = S.d.votos.filter(abierta).sort((a, b) => b.creado - a.creado), ce = S.d.votos.filter(v => !abierta(v)).sort((a, b) => b.creado - a.creado);
  c.innerHTML = '<div class="cabeza"><div><h1>Votaciones</h1><p class="sub">Qué evento hacemos, cuándo y cómo. Un voto por alumno.</p></div>' +
    (esSoc() ? '<button class="btn prin" id="nuevoVoto">' + ico('plus') + 'Nueva votación</button>' : '') + '</div>' + avisoCuenta('votar') +
    (ab.length ? '<div class="lista dos">' + ab.map(tarjetaVoto).join('') + '</div>' : vacio('vote', 'No hay votaciones abiertas.')) +
    (ce.length ? '<h2>' + ico('lock') + 'Resultados</h2><div class="lista dos">' + ce.slice(0, 20).map(tarjetaVoto).join('') + '</div>' : '');
  enlazarVotos(c);
  const n = $('#nuevoVoto', c); if(n) n.onclick = () => nuevaVotacion();
}
function nuevaVotacion(){
  let ops = ['', ''];
  hoja('Nueva votación', '<form id="fVoto"><label class="campo"><span>La pregunta</span><input name="pregunta" required maxlength="140" placeholder="¿Qué evento hacemos en noviembre?"></label>' +
    '<label class="campo"><span>Explicación (opcional)</span><textarea name="desc" maxlength="1200" style="min-height:70px"></textarea></label><div id="ops"></div>' +
    '<button type="button" class="btn chico" id="masOp">' + ico('plus') + 'Otra opción</button>' +
    '<div class="fila2" style="margin-top:12px"><label class="campo"><span>Cierra</span><input type="datetime-local" name="cierra" required></label>' +
    '<label class="campo"><span>¿Quién vota?</span><select name="soloGrupo"><option value="">Toda la escuela</option>' + S.d.grupos.map(g => '<option value="' + e(g.id) + '">Sólo ' + e(g.nombre) + '</option>').join('') + '</select></label></div>' +
    '<label class="palomita"><input type="checkbox" name="verAntes">Que se vea cómo va antes de cerrar</label><label class="palomita"><input type="checkbox" name="avisar" checked>Mandar notificación</label>' +
    '<button class="btn prin lleno" style="margin-top:12px">' + ico('send') + 'Abrir la votación</button></form>', (cu, cerrar) => {
    const pinta = () => { $('#ops', cu).innerHTML = ops.map((o, i) => '<label class="campo"><span>Opción ' + (i + 1) + '</span><input data-op="' + i + '" maxlength="80" value="' + e(o) + '"' + (i < 2 ? ' required' : '') + '></label>').join(''); $$('[data-op]', cu).forEach(x => x.oninput = () => { ops[Number(x.dataset.op)] = x.value; }); };
    pinta();
    $('#masOp', cu).onclick = () => { if(ops.length < 12){ ops.push(''); pinta(); $$('[data-op]', cu).pop().focus(); } };
    const en7 = new Date(Date.now() + 7 * 864e5); cu.querySelector('[name=cierra]').value = en7.getFullYear() + '-' + String(en7.getMonth() + 1).padStart(2, '0') + '-' + String(en7.getDate()).padStart(2, '0') + 'T14:00';
    $('#fVoto', cu).onsubmit = async (ev) => {
      ev.preventDefault(); const o = leer(ev.target);
      const rec = { pregunta: o.pregunta, desc: o.desc, cierra: o.cierra, soloGrupo: o.soloGrupo, verAntes: o.verAntes, opciones: ops.filter(t => t.trim()).map((t, i) => ({ id: 'o' + i, texto: t.trim() })) };
      if(rec.opciones.length < 2){ brindis('Pon al menos dos opciones.'); return; }
      if(await hacer('guardar', { cajon: 'votos', rec, avisar: o.avisar }, 'Votación abierta')){ cerrar(); render(true); }
    };
  });
}

/* ══ EL BUZÓN ═══════════════════════════════════════════════════════════ */
const TIPOS_BZ = [['propuesta', 'lightbulb', 'Propuesta'], ['queja', 'message-square-warning', 'Queja'], ['cambio', 'refresh-cw', 'Cambio'], ['docentes', 'graduation-cap', 'Docentes'], ['idea', 'sparkles', 'Idea'], ['otro', 'ellipsis-vertical', 'Otro']];
const EST_BZ = { recibida: ['Recibida', ''], 'en revisión': ['En revisión', 'oro'], 'en proceso': ['En proceso', 'azul'], resuelta: ['Resuelta', 'bien'], descartada: ['Descartada', 'mal'] };
function tarjetaBuzon(b, soc){
  const est = EST_BZ[b.estado] || [b.estado, ''], tipo = TIPOS_BZ.find(t => t[0] === b.tipo) || TIPOS_BZ[5];
  return '<article class="tarjeta" data-bz="' + e(b.id) + '"><div class="meta"><span class="chip ' + est[1] + '">' + e(est[0]) + '</span><span>' + ico(tipo[1]) + e(b.tipo === 'reporte' ? 'Reporte de chat' : tipo[2]) + '</span><span>' + hace(b.creado) + '</span>' +
    (b.mia ? '<span class="chip azul">Tuya</span>' : '') + (soc && b.publico ? '<span class="chip">' + ico('eye') + 'Pública</span>' : '') + '</div>' +
    (b.titulo ? '<h3 style="margin-top:8px">' + e(b.titulo) + '</h3>' : '<div style="height:8px"></div>') + '<p class="texto">' + e(b.texto) + '</p><p class="nota">' + e(b.alias || 'Anónimo') + '</p>' +
    (b.respuesta ? '<div class="tarjeta" style="background:var(--sup2);box-shadow:none;margin-top:8px"><b>Respuesta de la sociedad</b><p class="texto" style="margin:4px 0 0">' + e(b.respuesta) + '</p></div>' : '') +
    '<div class="botones">' + (b.publico || b.mia ? '<button class="btn chico" data-apoyar>' + ico(b.apoye ? 'circle-check-big' : 'thumbs-up') + (b.apoye ? 'Apoyada' : 'Apoyar') + ' · ' + (b.apoyos || 0) + '</button>' : '') +
    (soc ? '<button class="btn chico azul" data-contestar>' + ico('send') + 'Contestar</button>' : '') + (b.mia && b.estado === 'recibida' ? '<button class="btn chico mal" data-quitar-bz>' + ico('trash') + 'Retirar</button>' : '') + '</div></article>';
}
function vBuzon(c){
  const soc = esSoc(), tab = S.filtros.bz || (soc ? 'recibidas' : 'escribir');
  const mias = S.d.buzon.filter(b => b.mia), publicas = S.d.buzon.filter(b => b.publico).sort((a, b) => (b.apoyos - a.apoyos) || (b.creado - a.creado));
  const fEst = S.filtros.bzEst || 'abiertas';
  const recibidas = S.d.buzon.filter(b => fEst === 'todas' || (fEst === 'abiertas' ? ['recibida', 'en revisión', 'en proceso'].indexOf(b.estado) >= 0 : b.estado === fEst)).sort((a, b) => b.creado - a.creado);
  const tabs = [['escribir', 'Escribir'], ['mias', 'Lo que mandé · ' + mias.length], ['publicas', 'Lo que se atiende · ' + publicas.length]].concat(soc ? [['recibidas', 'Recibidas · ' + S.d.buzon.filter(b => b.estado === 'recibida').length]] : []);
  let html = '<h1>Buzón</h1><p class="sub">Propuestas, quejas, cambios que quieres ver y temas con docentes. Puedes mandarlo anónimo: ni la sociedad sabe quién fue.</p>' +
    '<div class="filtros">' + tabs.map(([k, t]) => '<button data-tab="' + k + '" class="' + (k === tab ? 'si' : '') + '">' + t + '</button>').join('') + '</div>';
  if(tab === 'escribir') html += avisoCuenta('escribir al buzón') + '<form id="fBz" class="tarjeta"><div class="tipos">' + TIPOS_BZ.map(([k, i, t], n) => '<button type="button" data-tipobz="' + k + '" class="' + (n === 0 ? 'si' : '') + '">' + ico(i) + t + '</button>').join('') + '</div>' +
    '<label class="campo"><span>En pocas palabras</span><input name="titulo" maxlength="100" placeholder="Bebederos en el patio"></label>' +
    '<label class="campo"><span>Cuéntanos</span><textarea name="texto" required maxlength="2500" placeholder="Qué pasa, qué propones y por qué ayudaría."></textarea></label>' +
    '<label class="palomita"><input type="checkbox" name="anonimo">Mandarlo anónimo</label><button class="btn prin lleno" style="margin-top:8px"' + (conCuenta() ? '' : ' disabled') + '>' + ico('send') + 'Mandar</button></form>';
  if(tab === 'mias') html += mias.length ? '<div class="lista">' + mias.sort((a, b) => b.creado - a.creado).map(b => tarjetaBuzon(b, false)).join('') + '</div>' : vacio('inbox', 'Todavía no mandas nada.');
  if(tab === 'publicas') html += publicas.length ? '<div class="lista dos">' + publicas.map(b => tarjetaBuzon(b, soc)).join('') + '</div>' : vacio('inbox', 'La sociedad todavía no publica respuestas.');
  if(tab === 'recibidas' && soc) html += '<div class="filtros">' + [['abiertas', 'Sin resolver'], ...Object.entries(EST_BZ).map(([k, v]) => [k, v[0]]), ['todas', 'Todas']].map(([k, t]) => '<button data-bzest="' + k + '" class="' + (k === fEst ? 'si' : '') + '">' + t + '</button>').join('') + '</div>' +
    (recibidas.length ? '<div class="lista dos">' + recibidas.map(b => tarjetaBuzon(b, true)).join('') + '</div>' : vacio('inbox', 'Nada aquí.'));
  c.innerHTML = html;
  $$('[data-tab]', c).forEach(b => b.onclick = () => { S.filtros.bz = b.dataset.tab; render(true); });
  $$('[data-bzest]', c).forEach(b => b.onclick = () => { S.filtros.bzEst = b.dataset.bzest; render(true); });
  let tipo = 'propuesta';
  $$('[data-tipobz]', c).forEach(b => b.onclick = () => { tipo = b.dataset.tipobz; $$('[data-tipobz]', c).forEach(x => x.classList.toggle('si', x === b)); });
  const f = $('#fBz', c); if(f) f.onsubmit = async (ev) => { ev.preventDefault(); const o = leer(f); if(await hacer('buzon', Object.assign(o, { tipo }), o.anonimo ? 'Mandado, sin tu nombre' : 'Mandado. Te avisamos cuando lo atiendan')){ S.filtros.bz = 'mias'; render(true); } };
  $$('[data-bz]', c).forEach(t => {
    const id = t.dataset.bz, b = S.d.buzon.find(x => x.id === id);
    const ap = $('[data-apoyar]', t); if(ap) ap.onclick = async () => { if(await hacer('apoyar', { id })) render(true); };
    const q = $('[data-quitar-bz]', t); if(q) q.onclick = async () => { if(await hacer('borrar', { cajon: 'buzon', id }, 'Retirada')) render(true); };
    const co = $('[data-contestar]', t); if(co) co.onclick = () => hoja('Contestar', '<p class="texto">' + e(b.texto) + '</p><form id="fCo"><label class="campo"><span>Estado</span><select name="estado">' + Object.entries(EST_BZ).map(([k, v]) => '<option value="' + k + '"' + (k === b.estado ? ' selected' : '') + '>' + v[0] + '</option>').join('') + '</select></label>' +
      '<label class="campo"><span>Respuesta</span><textarea name="respuesta" maxlength="2000">' + e(b.respuesta || '') + '</textarea></label><label class="palomita"><input type="checkbox" name="publico"' + (b.publico ? ' checked' : '') + '>Que la vea toda la escuela (y la puedan apoyar)</label>' +
      '<button class="btn prin lleno" style="margin-top:8px">' + ico('check') + 'Guardar</button>' + (b.tipo === 'reporte' && b.ref ? '<button type="button" class="btn mal lleno" id="borrarRep" style="margin-top:8px">' + ico('trash') + 'Borrar ese mensaje del chat</button>' : '') + '</form>', (cu, cerrar) => {
      $('#fCo', cu).onsubmit = async (ev) => { ev.preventDefault(); if(await hacer('contestar', Object.assign({ id }, leer(ev.target)), 'Guardado')){ cerrar(); render(true); } };
      const br = $('#borrarRep', cu); if(br) br.onclick = async () => { if(await hacer('quitarMsg', { canal: b.ref.canal, id: b.ref.id }, 'Mensaje borrado')){ await hacer('contestar', { id, estado: 'resuelta' }); cerrar(); render(true); } };
    });
  });
}

/* ══ LOS CHATS ══════════════════════════════════════════════════════════ */
function canales(){
  const y = yo(), out = [['general', 'Toda la escuela', 'school', 'Todos los alumnos del Rembrandt']];
  if(y && y.grupo) out.push(['g:' + y.grupo, 'Mi grupo · ' + (y.grupoNombre || nombreGrupo(y.grupo)), 'users', 'Sólo tu grupo']);
  if(esSoc()){ out.push(['soc', 'La sociedad', 'crown', 'Sólo los de la sociedad']); for(const t of S.d.temas.filter(t => t.estado !== 'resuelto')) out.push(['t:' + t.id, t.titulo, 'square-kanban', 'Tema · ' + t.categoria]); }
  return out;
}
function vChats(c){
  c.innerHTML = '<h1>Chats</h1><p class="sub">Para platicar con tu grupo y con toda la escuela. Sé buena onda: lo que reportan lo revisa la sociedad.</p>' + avisoCuenta('platicar') +
    (yo() ? '<div class="canales">' + canales().map(([k, t, i, s]) => '<a class="canal' + (k === 'soc' ? ' oro' : '') + '" href="#/chat/' + encodeURIComponent(k) + '"><span class="bola">' + ico(i) + '</span><div><b>' + e(t) + '</b><small>' + e(s) + '</small></div></a>').join('') + '</div>' : '');
}
function vChat(c, canal){
  const ca = canales().find(x => x[0] === canal);
  if(!ca){ c.innerHTML = vacio('lock', 'No puedes abrir este chat.') ; return; }
  S.chat = { canal, ms: [] };
  c.innerHTML = '<section class="chat"><div class="cab-chat"><a class="ico-btn" href="#/chats" aria-label="Atrás">' + ico('arrow-left') + '</a><h1>' + e(ca[1]) + '</h1></div>' +
    '<div class="mensajes" id="msjs" aria-live="polite"><div class="cargando-s" style="min-height:30vh">Cargando…</div></div>' +
    '<form class="escribir" id="fMsg"><label class="ico-btn" aria-label="Mandar foto">' + ico('camera') + '<input type="file" accept="image/*" id="fotoMsg" hidden></label>' +
    '<textarea id="txtMsg" rows="1" maxlength="800" placeholder="Escribe un mensaje" aria-label="Mensaje"></textarea><button class="ico-btn enviar" aria-label="Mandar">' + ico('send') + '</button></form></section>';
  const ta = $('#txtMsg', c);
  ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
  ta.onkeydown = (ev) => { if(ev.key === 'Enter' && !ev.shiftKey && matchMedia('(pointer:fine)').matches){ ev.preventDefault(); $('#fMsg', c).requestSubmit(); } };
  let mandando = false;
  $('#fMsg', c).onsubmit = async (ev) => {
    ev.preventDefault(); const t = ta.value.trim(); if(!t || mandando) return;
    mandando = true; const r = await soc('decir', { canal, texto: t }); mandando = false;
    if(!r.ok){ brindis(r.j.error || 'No se mandó.'); return; }
    ta.value = ''; ta.style.height = ''; traerChat();
  };
  $('#fotoMsg', c).onchange = async (ev) => {
    const f = ev.target.files[0]; if(!f) return;
    const img = await aDato(await achicar(f, 900, 110000));
    const r = await soc('decir', { canal, texto: ta.value.trim(), img }); ev.target.value = '';
    if(!r.ok){ brindis(r.j.error || 'No se mandó.'); return; } ta.value = ''; traerChat();
  };
  traerChat();
}
let trayendo = null;
async function traerChat(){
  if(trayendo) return trayendo;
  trayendo = (async () => {
    const canal = S.chat.canal; if(!canal) return;
    const u = S.chat.ms[S.chat.ms.length - 1];
    const r = await soc('chat', { canal, desde: u ? u.id : '' });
    if(canal !== S.chat.canal || !r.ok) return;
    const nuevos = r.j.mensajes.filter(m => !S.chat.ms.some(x => x.id === m.id));
    /* lo borrado mientras se veía: se vuelve a pedir completo de vez en cuando */
    S.chat.ms = S.chat.ms.concat(nuevos);
    pintarMensajes();
  })().finally(() => { trayendo = null; });
  return trayendo;
}
function pintarMensajes(){
  const box = $('#msjs'); if(!box) return;
  const abajo = box.scrollHeight - box.scrollTop - box.clientHeight < 80 || !box.dataset.listo;
  const yoC = miCodigo(); let dia = '';
  box.innerHTML = S.chat.ms.length ? S.chat.ms.filter(m => !m.borrado).map(m => {
    const d = new Date(m.t).toDateString(), sep = d !== dia ? '<div class="dia-chat">' + (d === new Date().toDateString() ? 'Hoy' : new Date(m.t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })) + '</div>' : ''; dia = d;
    const mio = m.de === yoC;
    return sep + '<div class="msg' + (mio ? ' mio' : '') + '" data-m="' + e(m.id) + '">' + (mio ? '' : '<div class="de">' + e(m.alias) + ' · ' + e(nombreGrupo(m.grupo)) + (m.rol ? '<span class="chip oro">' + (m.rol === 'presidencia' ? 'Presidencia' : 'Sociedad') + '</span>' : '') + '</div>') +
      (m.img ? '<img src="' + m.img + '" alt="Foto" loading="lazy">' : '') + (m.texto ? '<span class="texto">' + e(m.texto) + '</span>' : '') + '<span class="cuando">' + horaDe(m.t) + '</span>' +
      '<button class="ico-btn opc" data-opc aria-label="Opciones del mensaje">' + ico('ellipsis-vertical') + '</button></div>';
  }).join('') : vacio('message-circle', 'Nadie ha escrito. ¡Rompe el hielo!');
  box.dataset.listo = 1;
  if(abajo) box.scrollTop = box.scrollHeight;
  $$('[data-opc]', box).forEach(b => b.onclick = () => {
    const m = S.chat.ms.find(x => x.id === b.closest('[data-m]').dataset.m), mio = m.de === miCodigo();
    hoja('Mensaje', '<p class="texto">' + e(m.texto || '(foto)') + '</p><div class="botones">' + (mio || esSoc() ? '<button class="btn mal" id="mBorrar">' + ico('trash') + 'Borrar</button>' : '') +
      (!mio ? '<button class="btn" id="mRep">' + ico('flag') + 'Reportar</button>' : '') + (esSoc() && !mio ? '<button class="btn" id="mPausa">' + ico('clock') + 'Pausar a ' + e(m.alias) + ' 1 hora</button>' : '') + '</div>', (cu, cerrar) => {
      const bo = $('#mBorrar', cu); if(bo) bo.onclick = async () => { const r = await soc('quitarMsg', { canal: S.chat.canal, id: m.id }); if(r.ok){ m.borrado = true; pintarMensajes(); cerrar(); } else brindis(r.j.error); };
      const re = $('#mRep', cu); if(re) re.onclick = async () => { const r = await soc('reportar', { canal: S.chat.canal, id: m.id, texto: m.texto }); brindis(r.ok ? 'Reportado. Lo revisa la sociedad.' : r.j.error); cerrar(); };
      const pa = $('#mPausa', cu); if(pa) pa.onclick = async () => { const r = await soc('pausar', { cod: m.de, minutos: 60 }); brindis(r.ok ? 'Pausado una hora' : r.j.error); cerrar(); };
    });
  });
}

/* ══ EL MURO DE RECUERDOS Y EL MATERIAL ═════════════════════════════════ */
function vMuro(c){
  const fotos = S.d.pubs.filter(p => p.clase === 'foto' && p.estado === 'aprobada'), mias = S.d.pubs.filter(p => p.clase === 'foto' && p.mia && p.estado !== 'aprobada');
  const albums = [...new Set(fotos.map(p => p.album).filter(Boolean))], f = S.filtros.album || '';
  const lista = fotos.filter(p => !f || p.album === f).sort((a, b) => b.creado - a.creado);
  c.innerHTML = '<div class="cabeza"><div><h1>Muro de recuerdos</h1><p class="sub">Las fotos de la escuela. Cada una la revisa la sociedad antes de salir aquí.</p></div><button class="btn prin" id="subirF">' + ico('upload') + 'Subir fotos</button></div>' + avisoCuenta('subir fotos') +
    (mias.length ? '<p class="nota">' + ico('clock') + ' Tienes ' + mias.length + ' por revisar' + (mias.some(p => p.estado === 'rechazada') ? ' o rechazadas' : '') + '. <a href="#/revisar" id="verMias">Ver</a></p>' : '') +
    (albums.length ? '<div class="filtros">' + ['', ...albums].map(a => '<button data-album="' + e(a) + '" class="' + (a === f ? 'si' : '') + '">' + e(a || 'Todas') + '</button>').join('') + '</div>' : '') +
    (lista.length ? '<div class="muro">' + lista.flatMap(p => p.archivos.map((a, i) => '<button class="foto" data-pub="' + e(p.id) + '" data-i="' + i + '">' + (a.mini ? '<img src="' + a.mini + '" alt="' + e(p.titulo || 'Foto') + '" loading="lazy">' : '') + (i === 0 && p.titulo ? '<span class="pie">' + e(p.titulo) + '</span>' : '') + '</button>')).join('') + '</div>' : vacio('images', 'Todavía no hay fotos. ¡Sube las primeras!'));
  $$('[data-album]', c).forEach(b => b.onclick = () => { S.filtros.album = b.dataset.album; render(true); });
  $('#subirF', c).onclick = () => conCuenta() ? subirPub('foto') : (location.hash = '#/cuenta');
  const vm = $('#verMias', c); if(vm) vm.onclick = (ev) => { ev.preventDefault(); misPendientes(); };
  $$('[data-pub]', c).forEach(b => b.onclick = () => verPub(b.dataset.pub, Number(b.dataset.i)));
}
function vMaterial(c){
  const todo = S.d.pubs.filter(p => p.clase === 'material' && p.estado === 'aprobada'), q = norm(S.filtros.qMat || ''), g = S.filtros.gMat || '';
  const lista = todo.filter(p => (!g || p.grupo === g) && (!q || norm(p.titulo + ' ' + p.materia + ' ' + p.desc).includes(q)));
  const porMateria = {}; for(const p of lista) (porMateria[p.materia || 'Otros'] = porMateria[p.materia || 'Otros'] || []).push(p);
  c.innerHTML = '<div class="cabeza"><div><h1>Material académico</h1><p class="sub">Apuntes, guías, resúmenes y presentaciones. Revisados antes de publicarse.</p></div><button class="btn prin" id="subirM">' + ico('upload') + 'Compartir material</button></div>' + avisoCuenta('compartir material') +
    '<div class="fila2"><label class="campo"><span>Buscar</span><input id="qMat" value="' + e(S.filtros.qMat || '') + '" placeholder="Física, examen, guía…" type="search"></label>' +
    '<label class="campo"><span>Grupo</span><select id="gMat"><option value="">Todos</option>' + S.d.grupos.map(x => '<option value="' + e(x.id) + '"' + (x.id === g ? ' selected' : '') + '>' + e(x.nombre) + '</option>').join('') + '</select></label></div>' +
    (lista.length ? Object.entries(porMateria).sort().map(([m, ps]) => '<h2>' + ico('book-open') + e(m) + '</h2><div class="lista dos">' + ps.sort((a, b) => b.creado - a.creado).map(p =>
      '<button class="tarjeta tocable archivo" data-pub="' + e(p.id) + '"><span class="bola">' + ico('file-text') + '</span><div><h3>' + e(p.titulo || p.archivos[0].nombre) + '</h3><div class="meta"><span>' + e(nombreGrupo(p.grupo)) + '</span><span>' + hace(p.creado) + '</span><span>' + p.archivos.length + ' archivo' + (p.archivos.length === 1 ? '' : 's') + '</span></div></div>' + ico('chevron-right') + '</button>').join('') + '</div>').join('')
      : vacio('book-open', todo.length ? 'Nada con esa búsqueda.' : 'Todavía no hay material. Comparte tus apuntes.'));
  const qi = $('#qMat', c); qi.oninput = () => { S.filtros.qMat = qi.value; clearTimeout(qi._t); qi._t = setTimeout(() => { render(true); const n = $('#qMat'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 350); };
  $('#gMat', c).onchange = (ev) => { S.filtros.gMat = ev.target.value; render(true); };
  $('#subirM', c).onclick = () => conCuenta() ? subirPub('material') : (location.hash = '#/cuenta');
  $$('[data-pub]', c).forEach(b => b.onclick = () => verPub(b.dataset.pub, 0));
}
function subirPub(clase){
  const foto = clase === 'foto';
  hoja(foto ? 'Subir fotos' : 'Compartir material', '<form id="fPub"><label class="campo"><span>' + (foto ? 'Fotos (hasta 20)' : 'Archivos (PDF, Word, PowerPoint, Excel o fotos; hasta 12 MB cada uno)') + '</span><input type="file" name="archivos" multiple required accept="' + (foto ? 'image/*' : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*') + '"></label>' +
    '<label class="campo"><span>Título</span><input name="titulo" maxlength="100" placeholder="' + (foto ? 'Día del estudiante' : 'Guía para el examen de física') + '"></label>' +
    (foto ? '<label class="campo"><span>Álbum</span><input name="album" maxlength="60" list="albums" placeholder="Graduación 2026"><datalist id="albums">' + [...new Set(S.d.pubs.map(p => p.album).filter(Boolean))].map(a => '<option value="' + e(a) + '">').join('') + '</datalist></label>'
      : '<div class="fila2"><label class="campo"><span>Materia</span><input name="materia" maxlength="60" required list="materiasM"></label><label class="campo"><span>Grupo</span><select name="grupo">' + S.d.grupos.map(x => '<option value="' + e(x.id) + '"' + (yo() && x.id === yo().grupo ? ' selected' : '') + '>' + e(x.nombre) + '</option>').join('') + '</select></label></div>' +
        '<datalist id="materiasM">' + [...new Set(S.d.horarios.flatMap(h => Object.values(h.dias || {}).flat().map(b => b.materia)).concat(S.d.pubs.map(p => p.materia)).filter(Boolean))].map(m => '<option value="' + e(m) + '">').join('') + '</datalist>') +
    '<label class="campo"><span>Descripción (opcional)</span><textarea name="desc" maxlength="1200" style="min-height:70px"></textarea></label>' +
    '<p class="nota">' + (esSoc() ? 'Eres de la sociedad: sale publicado de una vez.' : 'Lo revisa la sociedad antes de que lo vean los demás.') + '</p><p id="avance" class="nota"></p>' +
    '<button class="btn prin lleno">' + ico('upload') + 'Subir</button></form>', (cu, cerrar) => {
    const f = $('#fPub', cu);
    f.onsubmit = async (ev) => {
      ev.preventDefault(); const o = leer(f), files = [...f.archivos.files].slice(0, 20), btn = f.querySelector('button.prin'), av = $('#avance', cu);
      if(!files.length) return; btn.disabled = true;
      try{
        const archivos = [];
        for(let i = 0; i < files.length; i++){
          const x = files[i], esImg = /^image\//.test(x.type);
          av.textContent = 'Subiendo ' + (i + 1) + ' de ' + files.length + '…';
          const blob = esImg ? await achicar(x, 2000, 700000) : x, mime = esImg ? 'image/jpeg' : x.type || 'application/octet-stream';
          if(blob.size > 12 * 1024 * 1024) throw new Error(x.name + ' pesa más de 12 MB.');
          const id = await subirArchivo(blob, mime, p => { av.textContent = 'Subiendo ' + (i + 1) + ' de ' + files.length + '… ' + Math.round(p * 100) + '%'; });
          archivos.push({ id, nombre: x.name, mini: esImg ? await aDato(await achicar(x, 360, 40000)) : '' });
        }
        const j = await hacer('publicar', { clase, titulo: o.titulo, desc: o.desc, album: o.album || '', materia: o.materia || '', grupo: o.grupo || '', archivos });
        if(j){ brindis(j.estado === 'aprobada' ? 'Publicado' : 'Listo: la sociedad lo revisa y sale en cuanto lo aprueben'); cerrar(); render(true); }
      }catch(err){ brindis(err.message); av.textContent = err.message; }
      btn.disabled = false;
    };
  });
}
function verPub(id, i){
  const p = S.d.pubs.find(x => x.id === id); if(!p) return;
  const foto = p.clase === 'foto';
  hoja(p.titulo || (foto ? 'Foto' : 'Material'), '<div class="meta">' + (p.album ? '<span>' + ico('images') + e(p.album) + '</span>' : '') + (p.materia ? '<span>' + ico('book-open') + e(p.materia) + '</span>' : '') + '<span>' + e(p.alias || '') + '</span><span>' + hace(p.creado) + '</span></div>' +
    (p.desc ? '<p class="texto" style="margin-top:8px">' + e(p.desc) + '</p>' : '') +
    '<div id="pubArch" class="lista" style="margin-top:12px">' + p.archivos.map((a, k) => foto ? '<div class="visor" data-k="' + k + '">' + (a.mini ? '<img src="' + a.mini + '" alt="">' : '') + '</div>'
      : '<button class="tarjeta tocable archivo" data-abrir="' + k + '"><span class="bola">' + ico('file-text') + '</span><div><b>' + e(a.nombre) + '</b><div class="meta"><span>' + (a.tam > 1048576 ? (a.tam / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(a.tam / 1024)) + ' KB') + '</span></div></div>' + ico('download') + '</button>').join('') + '</div>' +
    (esSoc() || (p.mia && p.estado !== 'aprobada') ? '<div class="botones"><button class="btn chico mal" id="borrarPub">' + ico('trash') + 'Borrar</button></div>' : ''),
  (cu, cerrar) => {
    if(foto) $$('.visor', cu).forEach(async (v) => { const a = p.archivos[Number(v.dataset.k)]; try{ const u = await bajarArchivo(a); v.innerHTML = '<img src="' + u + '" alt=""><div class="botones"><a class="btn chico" href="' + u + '" download="' + e(a.nombre || 'foto.jpg') + '">' + ico('download') + 'Guardar</a></div>'; }catch(err){} });
    if(foto && i){ const v = $$('.visor', cu)[i]; v && v.scrollIntoView(); }
    $$('[data-abrir]', cu).forEach(b => b.onclick = async () => { const a = p.archivos[Number(b.dataset.abrir)]; b.disabled = true; try{ const u = await bajarArchivo(a); const l = document.createElement('a'); l.href = u; l.download = a.nombre || 'archivo'; l.target = '_blank'; l.click(); }catch(err){ brindis(err.message); } b.disabled = false; });
    const bo = $('#borrarPub', cu); if(bo) bo.onclick = async () => { if(bo.dataset.seguro){ if(await hacer('borrar', { cajon: 'pubs', id }, 'Borrado')){ cerrar(); render(true); } } else { bo.dataset.seguro = 1; bo.lastChild.textContent = '¿Seguro? Toca otra vez'; } };
  });
}
function misPendientes(){
  const ps = S.d.pubs.filter(p => p.mia && p.estado !== 'aprobada');
  hoja('Lo que subiste', ps.map(p => '<div class="tarjeta archivo"><span class="bola">' + ico(p.clase === 'foto' ? 'image' : 'file-text') + '</span><div><b>' + e(p.titulo || p.archivos[0].nombre) + '</b><div class="meta"><span class="chip ' + (p.estado === 'rechazada' ? 'mal' : 'oro') + '">' + (p.estado === 'rechazada' ? 'No se aprobó' : 'Por revisar') + '</span>' + (p.motivo ? '<span>' + e(p.motivo) + '</span>' : '') + '</div></div></div>').join(''));
}
function vRevisar(c){
  const ps = S.d.pubs.filter(p => p.estado === 'pendiente').sort((a, b) => a.creado - b.creado);
  c.innerHTML = '<h1>Por revisar</h1><p class="sub">Fotos y material que subieron los alumnos. Nada sale al muro sin que alguien de la sociedad lo apruebe.</p>' +
    (ps.length ? '<div class="lista dos">' + ps.map(p => '<article class="tarjeta" data-rev="' + e(p.id) + '"><div class="meta"><span class="chip oro">' + (p.clase === 'foto' ? 'Fotos' : 'Material') + '</span><span>' + e(p.alias) + '</span><span>' + hace(p.creado) + '</span></div>' +
      '<h3 style="margin-top:8px">' + e(p.titulo || '(sin título)') + '</h3>' + (p.desc ? '<p class="texto nota">' + e(p.desc) + '</p>' : '') +
      (p.clase === 'foto' ? '<div class="muro" style="margin:8px 0">' + p.archivos.map((a, i) => '<button class="foto" data-ver="' + i + '">' + (a.mini ? '<img src="' + a.mini + '" alt="">' : '') + '</button>').join('') + '</div>' : '<p>' + p.archivos.map(a => e(a.nombre)).join(', ') + ' <button class="btn chico" data-ver="0">' + ico('eye') + 'Abrir</button></p>') +
      '<div class="botones"><button class="btn azul" data-ok>' + ico('check') + 'Aprobar</button><button class="btn mal" data-no>' + ico('x') + 'Rechazar</button></div></article>').join('') + '</div>' : vacio('shield-check', 'Nada pendiente. Todo al día.'));
  $$('[data-rev]', c).forEach(t => {
    const id = t.dataset.rev;
    $$('[data-ver]', t).forEach(b => b.onclick = () => verPub(id, Number(b.dataset.ver)));
    $('[data-ok]', t).onclick = async () => { if(await hacer('revisar', { id, estado: 'aprobada' }, 'Aprobado')) render(true); };
    $('[data-no]', t).onclick = () => hoja('¿Por qué no?', '<form id="fNo"><label class="campo"><span>Motivo (lo ve quien lo subió)</span><input name="motivo" maxlength="200" placeholder="Sale alguien que no dio permiso"></label><button class="btn mal lleno">Rechazar</button></form>', (cu, cerrar) => {
      $('#fNo', cu).onsubmit = async (ev) => { ev.preventDefault(); if(await hacer('revisar', { id, estado: 'rechazada', motivo: leer(ev.target).motivo }, 'Rechazado')){ cerrar(); render(true); } };
    });
  });
}

/* ══ TORNEOS ════════════════════════════════════════════════════════════ */
function vTorneos(c){
  const ts = S.d.torneos.slice().sort((a, b) => (a.estado === 'terminado') - (b.estado === 'terminado') || b.creado - a.creado);
  c.innerHTML = '<div class="cabeza"><div><h1>Torneos</h1><p class="sub">Quién juega contra quién, marcadores y cómo va cada torneo.</p></div>' + (esSoc() ? '<button class="btn prin" id="nuevoT">' + ico('plus') + 'Nuevo torneo</button>' : '') + '</div>' +
    (ts.length ? '<div class="lista dos">' + ts.map(t => { const fin = t.rondas.length && t.rondas[t.rondas.length - 1][0], camp = fin && fin.gana, vivo = t.rondas.flat().some(p => p.envivo);
      return '<a class="tarjeta tocable" style="display:block;text-decoration:none" href="#/torneo/' + e(t.id) + '"><div class="meta"><span class="chip ' + (t.estado === 'terminado' ? '' : 'bien') + '">' + e(t.estado) + '</span>' + (vivo ? '<span class="chip mal">● En vivo</span>' : '') + (t.deporte ? '<span>' + e(t.deporte) + '</span>' : '') + '</div>' +
        '<h3 style="margin-top:8px">' + e(t.nombre) + '</h3><div class="meta"><span>' + ico('users') + (t.rondas[0] || []).reduce((n, p) => n + (p.a ? 1 : 0) + (p.b ? 1 : 0), 0) + ' equipos</span>' + (camp ? '<span>' + ico('crown') + 'Campeón: ' + e(camp) + '</span>' : '') + '</div></a>'; }).join('') + '</div>' : vacio('trophy', 'Todavía no hay torneos.'));
  const n = $('#nuevoT', c); if(n) n.onclick = () => hoja('Nuevo torneo', '<form id="fT"><label class="campo"><span>Nombre</span><input name="nombre" required maxlength="90" placeholder="Copa Rembrandt de fútbol"></label>' +
    '<label class="campo"><span>Deporte o competencia</span><input name="deporte" maxlength="40" placeholder="Fútbol"></label>' +
    '<label class="campo"><span>Equipos (uno por renglón, en el orden en que se enfrentan)</span><textarea name="equipos" required placeholder="3.1&#10;2B&#10;1A&#10;3.2"></textarea></label>' +
    '<label class="campo"><span>Reglas (opcional)</span><textarea name="reglas" maxlength="1500" style="min-height:70px"></textarea></label>' +
    '<label class="palomita"><input type="checkbox" name="avisar" checked>Mandar notificación</label><button class="btn prin lleno" style="margin-top:8px">' + ico('trophy') + 'Armar las llaves</button></form>', (cu, cerrar) => {
    $('#fT', cu).onsubmit = async (ev) => { ev.preventDefault(); const o = leer(ev.target), eq = o.equipos.split('\n').map(x => x.trim()).filter(Boolean);
      if(eq.length < 2){ brindis('Hacen falta al menos 2 equipos.'); return; }
      const j = await hacer('guardar', { cajon: 'torneos', rec: { nombre: o.nombre, deporte: o.deporte, reglas: o.reglas, rondas: armarLlaves(eq), estado: 'en curso' }, avisar: o.avisar }, 'Torneo armado');
      if(j){ cerrar(); location.hash = '#/torneo/' + j.rec.id; } };
  });
}
function vTorneo(c, id){
  const t = S.d.torneos.find(x => x.id === id); if(!t){ c.innerHTML = vacio('trophy', 'Ese torneo ya no existe.'); return; }
  const R = t.rondas, fin = R.length && R[R.length - 1][0], camp = fin && fin.gana;
  /* la tabla sale sola de los marcadores: nadie la captura dos veces */
  const tabla = {}; const fila = (n) => tabla[n] = tabla[n] || { equipo: n, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 };
  for(const p of R.flat()) if(p.a && p.b && p.pa !== '' && p.pb !== '' && !isNaN(p.pa) && !isNaN(p.pb)){ const a = fila(p.a), b = fila(p.b), x = Number(p.pa), y = Number(p.pb);
    a.pj++; b.pj++; a.gf += x; a.gc += y; b.gf += y; b.gc += x; if(x > y || (x === y && p.gana === p.a)){ a.pg++; b.pp++; } else if(y > x || (x === y && p.gana === p.b)){ b.pg++; a.pp++; } else { a.pe++; b.pe++; } }
  const tab = Object.values(tabla).sort((a, b) => (b.pg * 3 + b.pe) - (a.pg * 3 + a.pe) || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
  c.innerHTML = '<div class="cabeza"><div><a href="#/torneos" class="nota" style="text-decoration:none">' + ico('arrow-left') + ' Torneos</a><h1>' + e(t.nombre) + '</h1><div class="meta">' + (t.deporte ? '<span>' + e(t.deporte) + '</span>' : '') + '<span class="chip">' + e(t.estado) + '</span></div></div></div>' +
    (esSoc() ? '<p class="nota">Toca un partido para poner el marcador. Quien gana pasa solo a la siguiente ronda.</p>' : '') +
    '<div class="llaves">' + R.map((ps, r) => '<div class="ronda"><small>' + nombreRonda(r, R.length) + '</small>' + ps.map((p, i) =>
      '<' + (esSoc() && p.a && p.b ? 'button' : 'div') + ' class="partido' + (p.envivo ? ' vivo' : '') + '" data-r="' + r + '" data-i="' + i + '">' + [['a', 'pa'], ['b', 'pb']].map(([k, pk]) =>
        '<div class="eq' + (p.gana && p.gana === p[k] ? ' gano' : p.gana ? ' perdio' : '') + (p[k] ? '' : ' hueco') + '"><span>' + e(p[k] || (r === 0 ? 'descansa' : 'por definir')) + '</span><b>' + e(p[pk]) + '</b></div>').join('') +
        (p.cuando || p.envivo ? '<div class="eq" style="font-size:12px;color:var(--tenue);min-height:26px;padding:3px 10px">' + (p.envivo ? '<span class="chip mal">● En vivo</span>' : '') + e(p.cuando || '') + '</div>' : '') + '</' + (esSoc() && p.a && p.b ? 'button' : 'div') + '>').join('') + '</div>').join('') +
    '<div class="ronda"><small>Campeón</small><div class="campeon-b">' + ico('trophy') + '<br>' + (camp ? e(camp) : '¿Quién será?') + '</div></div></div>' +
    (tab.length ? '<h2>' + ico('list-checks') + 'Tabla</h2><div class="tabla-caja tarjeta" style="padding:8px"><table class="tabla"><tr><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>Pts</th></tr>' +
      tab.map(x => '<tr><td>' + e(x.equipo) + '</td><td>' + x.pj + '</td><td>' + x.pg + '</td><td>' + x.pe + '</td><td>' + x.pp + '</td><td>' + x.gf + '</td><td>' + x.gc + '</td><td><b>' + (x.pg * 3 + x.pe) + '</b></td></tr>').join('') + '</table></div>' : '') +
    (t.reglas ? '<h2>' + ico('clipboard-list') + 'Reglas</h2><p class="texto">' + e(t.reglas) + '</p>' : '') +
    '<h2>' + ico('notebook-pen') + 'Cómo va</h2>' + (t.notas && t.notas.length ? '<div class="bitacora">' + t.notas.slice().reverse().map(b => '<div><small>' + hace(b.t) + ' · ' + e(b.por) + '</small><p class="texto">' + e(b.texto) + '</p></div>').join('') + '</div>' : '<p class="nota">Sin novedades.</p>') +
    (esSoc() ? '<form id="fNota" style="margin-top:8px"><label class="campo"><span>Anotar algo del torneo</span><input name="texto" maxlength="400" required placeholder="Se cambió la final al viernes"></label><button class="btn chico">' + ico('notebook-pen') + 'Anotar</button></form>' +
      '<div class="botones"><button class="btn chico" id="finT">' + ico(t.estado === 'terminado' ? 'refresh-cw' : 'flag') + (t.estado === 'terminado' ? 'Reabrir' : 'Dar por terminado') + '</button><button class="btn chico mal" id="borrarT">' + ico('trash') + 'Borrar torneo</button></div>' : '');
  const guardarT = (cambio, msj) => hacer('guardar', { cajon: 'torneos', rec: Object.assign({}, t, cambio) }, msj).then(j => { if(j) render(true); return j; });
  if(esSoc()){
    $$('button.partido', c).forEach(b => b.onclick = () => {
      const r = Number(b.dataset.r), i = Number(b.dataset.i), p = R[r][i];
      hoja(p.a + ' vs ' + p.b, '<form id="fP"><div class="fila2"><label class="campo"><span>' + e(p.a) + '</span><input name="pa" inputmode="numeric" maxlength="4" value="' + e(p.pa) + '"></label><label class="campo"><span>' + e(p.b) + '</span><input name="pb" inputmode="numeric" maxlength="4" value="' + e(p.pb) + '"></label></div>' +
        '<label class="campo"><span>Si empatan, ¿quién pasa? (penales)</span><select name="gana"><option value="">Según el marcador</option><option' + (p.gana === p.a ? ' selected' : '') + '>' + e(p.a) + '</option><option' + (p.gana === p.b ? ' selected' : '') + '>' + e(p.b) + '</option></select></label>' +
        '<label class="campo"><span>Cuándo / dónde</span><input name="cuando" maxlength="40" value="' + e(p.cuando || '') + '" placeholder="Vie 12:30 · cancha"></label>' +
        '<label class="palomita"><input type="checkbox" name="envivo"' + (p.envivo ? ' checked' : '') + '>Se está jugando ahora</label><label class="palomita"><input type="checkbox" name="final"' + (p.gana ? ' checked' : '') + '>Ya terminó (pasa el ganador)</label>' +
        '<button class="btn prin lleno" style="margin-top:8px">' + ico('check') + 'Guardar</button></form>', (cu, cerrar) => {
        $('#fP', cu).onsubmit = async (ev) => {
          ev.preventDefault(); const o = leer(ev.target), x = Number(o.pa), y = Number(o.pb);
          p.pa = o.pa.trim(); p.pb = o.pb.trim(); p.cuando = o.cuando; p.envivo = o.envivo && !o.final;
          p.gana = o.final ? (o.gana || (x > y ? p.a : y > x ? p.b : '')) : '';
          if(o.final && !p.gana){ brindis('Empataron: elige quién pasa.'); return; }
          avanzar(R); if(await guardarT({ rondas: R }, 'Marcador guardado')) cerrar();
        };
      });
    });
    $('#fNota', c).onsubmit = (ev) => { ev.preventDefault(); guardarT({ notas: (t.notas || []).concat({ t: Date.now(), texto: leer(ev.target).texto, por: yo().alias }) }, 'Anotado'); };
    $('#finT', c).onclick = () => guardarT({ estado: t.estado === 'terminado' ? 'en curso' : 'terminado' });
    const bo = $('#borrarT', c); bo.onclick = async () => { if(bo.dataset.seguro){ if(await hacer('borrar', { cajon: 'torneos', id }, 'Borrado')) location.hash = '#/torneos'; } else { bo.dataset.seguro = 1; bo.lastChild.textContent = '¿Seguro? Toca otra vez'; } };
  }
}

/* ══ EL PANEL DE LA SOCIEDAD ════════════════════════════════════════════ */
const COLS = [['por discutir', 'Por discutir', 'messages-square'], ['en discusión', 'En discusión', 'message-circle'], ['por hacer', 'Por hacer', 'list-checks'], ['en proceso', 'En proceso', 'refresh-cw'], ['resuelto', 'Resuelto', 'circle-check-big']];
function vPanel(c){
  const d = S.d, cats = [...new Set(d.temas.map(t => t.categoria))].sort(), f = S.filtros.catT || '';
  const temas = d.temas.filter(t => !f || t.categoria === f);
  const pend = d.pubs.filter(p => p.estado === 'pendiente').length, bz = d.buzon.filter(b => b.estado === 'recibida').length;
  c.innerHTML = '<div class="cabeza"><div><h1>Panel de la sociedad</h1><p class="sub">Los temas por resolver, quién los lleva y cómo van. Sólo lo ve la sociedad.</p></div><button class="btn prin" id="nuevoTema">' + ico('plus') + 'Nuevo tema</button></div>' +
    '<div class="lista dos" style="margin-bottom:16px"><a class="tarjeta tocable archivo" href="#/buzon" style="text-decoration:none" id="irBz"><span class="bola">' + ico('inbox') + '</span><div><b>' + bz + ' en el buzón sin abrir</b><div class="meta"><span>Propuestas, quejas y reportes</span></div></div>' + ico('chevron-right') + '</a>' +
      '<a class="tarjeta tocable archivo" href="#/revisar" style="text-decoration:none"><span class="bola">' + ico('shield-check') + '</span><div><b>' + pend + ' por revisar</b><div class="meta"><span>Fotos y material de los alumnos</span></div></div>' + ico('chevron-right') + '</a></div>' +
    (cats.length ? '<div class="filtros">' + ['', ...cats].map(x => '<button data-catt="' + e(x) + '" class="' + (x === f ? 'si' : '') + '">' + e(x || 'Todas las categorías') + '</button>').join('') + '</div>' : '') +
    '<div class="tablero">' + COLS.map(([k, t, i]) => { const ts = temas.filter(x => x.estado === k).sort((a, b) => ({ alta: 0, media: 1, baja: 2 }[a.prioridad] - { alta: 0, media: 1, baja: 2 }[b.prioridad]) || b.t - a.t);
      return '<section class="columna"><h3>' + ico(i) + e(t) + '<span class="chip">' + ts.length + '</span></h3>' + ts.map(x => { const h = x.tareas.filter(y => y.hecho).length;
        return '<a class="tema" href="#/tema/' + e(x.id) + '" style="text-decoration:none"><div class="meta"><span class="chip ' + (x.prioridad === 'alta' ? 'mal' : x.prioridad === 'baja' ? '' : 'oro') + '">' + e(x.prioridad) + '</span><span>' + e(x.categoria) + '</span>' + (x.docentes ? '<span>' + ico('graduation-cap') + '</span>' : '') + '</div>' +
          '<b style="display:block;margin-top:6px">' + e(x.titulo) + '</b><div class="meta">' + (x.responsables ? '<span>' + ico('user-round') + e(x.responsables) + '</span>' : '') + (x.limite ? '<span>' + ico('calendar-clock') + fechaBonita(x.limite, false) + '</span>' : '') + '</div>' +
          (x.tareas.length ? '<div class="avance"><i style="width:' + (h / x.tareas.length * 100) + '%"></i></div><small class="nota">' + h + ' de ' + x.tareas.length + ' tareas</small>' : '') + '</a>'; }).join('') + '</section>'; }).join('') + '</div>';
  $$('[data-catt]', c).forEach(b => b.onclick = () => { S.filtros.catT = b.dataset.catt; render(true); });
  $('#irBz', c).onclick = () => { S.filtros.bz = 'recibidas'; };
  $('#nuevoTema', c).onclick = () => editarTema({});
}
function editarTema(x){
  const cats = [...new Set(S.d.temas.map(t => t.categoria).concat(['Eventos', 'Instalaciones', 'Docentes', 'Alumnado', 'Deportes', 'Cultural', 'Finanzas', 'Comunicación']))];
  hoja(x.id ? 'Editar tema' : 'Nuevo tema', '<form id="fTema"><label class="campo"><span>Tema</span><input name="titulo" required maxlength="120" value="' + e(x.titulo || '') + '" placeholder="Arreglar los bebederos"></label>' +
    '<div class="fila2"><label class="campo"><span>Categoría</span><input name="categoria" maxlength="40" list="catsT" value="' + e(x.categoria || '') + '" placeholder="Instalaciones"></label><label class="campo"><span>Prioridad</span><select name="prioridad">' + ['alta', 'media', 'baja'].map(p => '<option' + (p === (x.prioridad || 'media') ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></label></div>' +
    '<datalist id="catsT">' + cats.map(t => '<option value="' + e(t) + '">').join('') + '</datalist>' +
    '<label class="campo"><span>De qué se trata</span><textarea name="desc" maxlength="3000">' + e(x.desc || '') + '</textarea></label>' +
    '<div class="fila2"><label class="campo"><span>Quién lo lleva</span><input name="responsables" maxlength="120" value="' + e(x.responsables || '') + '"></label><label class="campo"><span>Para cuándo</span><input type="date" name="limite" value="' + e(x.limite || '') + '"></label></div>' +
    '<label class="campo"><span>Estado</span><select name="estado">' + COLS.map(([k, t]) => '<option value="' + k + '"' + (k === (x.estado || 'por discutir') ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>' +
    '<label class="palomita"><input type="checkbox" name="docentes"' + (x.docentes ? ' checked' : '') + '>Es un tema con docentes</label>' +
    '<button class="btn prin lleno" style="margin-top:8px">' + ico('check') + 'Guardar</button></form>', (cu, cerrar) => {
    $('#fTema', cu).onsubmit = async (ev) => { ev.preventDefault(); const j = await hacer('guardar', { cajon: 'temas', rec: Object.assign({ tareas: [], bitacora: [] }, x, leer(ev.target)) }, 'Guardado'); if(j){ cerrar(); location.hash = '#/tema/' + j.rec.id; render(true); } };
  });
}
function vTema(c, id){
  const x = S.d.temas.find(t => t.id === id); if(!x){ c.innerHTML = vacio('square-kanban', 'Ese tema ya no existe.'); return; }
  const guardar = (cambio, msj) => hacer('guardar', { cajon: 'temas', rec: Object.assign({}, x, cambio) }, msj).then(j => { if(j) render(true); return j; });
  c.innerHTML = '<a href="#/sociedad" class="nota" style="text-decoration:none">' + ico('arrow-left') + ' Panel</a><h1>' + e(x.titulo) + '</h1>' +
    '<div class="meta"><span class="chip ' + (x.prioridad === 'alta' ? 'mal' : 'oro') + '">' + e(x.prioridad) + '</span><span>' + e(x.categoria) + '</span>' + (x.docentes ? '<span>' + ico('graduation-cap') + 'Con docentes</span>' : '') +
      (x.responsables ? '<span>' + ico('user-round') + e(x.responsables) + '</span>' : '') + (x.limite ? '<span>' + ico('calendar-clock') + fechaBonita(x.limite, false) + '</span>' : '') + '</div>' +
    '<div class="filtros" style="margin-top:12px">' + COLS.map(([k, t]) => '<button data-est="' + k + '" class="' + (k === x.estado ? 'si' : '') + '">' + t + '</button>').join('') + '</div>' +
    (x.desc ? '<p class="texto">' + e(x.desc) + '</p>' : '') +
    '<div class="botones"><button class="btn chico" id="editTema">' + ico('pencil') + 'Editar</button><a class="btn chico azul" href="#/chat/' + encodeURIComponent('t:' + x.id) + '">' + ico('messages-square') + 'Platicarlo</a><button class="btn chico mal" id="borrarTema">' + ico('trash') + 'Borrar</button></div>' +
    '<h2>' + ico('list-checks') + 'Lo que hay que hacer</h2><div class="tarjeta" style="padding:4px 16px">' + (x.tareas.length ? x.tareas.map((t, i) => '<label class="tarea' + (t.hecho ? ' hecha' : '') + '"><input type="checkbox" data-t="' + i + '"' + (t.hecho ? ' checked' : '') + '><span>' + e(t.texto) + (t.quien ? ' <small class="nota">· ' + e(t.quien) + '</small>' : '') + '</span><button type="button" class="ico-btn" data-qt="' + i + '" aria-label="Quitar">' + ico('x') + '</button></label>').join('') : '<p class="nota" style="padding:10px 0">Sin tareas todavía.</p>') +
      '<form id="fTarea" style="display:flex;gap:8px;padding:10px 0"><input name="texto" required maxlength="160" placeholder="Nueva tarea" style="flex:1;min-height:44px;border:1px solid var(--linea);border-radius:12px;padding:0 12px;background:var(--sup)"><input name="quien" maxlength="40" placeholder="Quién" style="width:96px;min-height:44px;border:1px solid var(--linea);border-radius:12px;padding:0 10px;background:var(--sup)"><button class="btn chico azul" aria-label="Agregar">' + ico('plus') + '</button></form></div>' +
    '<h2>' + ico('notebook-pen') + 'Bitácora</h2><form id="fBitT"><label class="campo"><textarea name="texto" maxlength="800" required style="min-height:70px" placeholder="Qué se acordó, con quién se habló, qué sigue…"></textarea></label><button class="btn chico">' + ico('notebook-pen') + 'Anotar</button></form>' +
    (x.bitacora.length ? '<div class="bitacora" style="margin-top:12px">' + x.bitacora.slice().reverse().map(b => '<div><small>' + hace(b.t) + ' · ' + e(b.por) + '</small><p class="texto">' + e(b.texto) + '</p></div>').join('') + '</div>' : '');
  $$('[data-est]', c).forEach(b => b.onclick = () => guardar({ estado: b.dataset.est, bitacora: x.bitacora.concat({ t: Date.now(), texto: 'Pasó a «' + COLS.find(k => k[0] === b.dataset.est)[1] + '»', por: yo().alias }) }, 'Movido'));
  $$('[data-t]', c).forEach(b => b.onchange = () => { const ts = x.tareas.map(t => Object.assign({}, t)); ts[Number(b.dataset.t)].hecho = b.checked; guardar({ tareas: ts }); });
  $$('[data-qt]', c).forEach(b => b.onclick = (ev) => { ev.preventDefault(); guardar({ tareas: x.tareas.filter((t, i) => i !== Number(b.dataset.qt)) }); });
  $('#fTarea', c).onsubmit = (ev) => { ev.preventDefault(); const o = leer(ev.target); guardar({ tareas: x.tareas.concat({ texto: o.texto, quien: o.quien, hecho: false }) }); };
  $('#fBitT', c).onsubmit = (ev) => { ev.preventDefault(); guardar({ bitacora: x.bitacora.concat({ t: Date.now(), texto: leer(ev.target).texto, por: yo().alias }) }, 'Anotado'); };
  $('#editTema', c).onclick = () => editarTema(x);
  const bo = $('#borrarTema', c); bo.onclick = async () => { if(bo.dataset.seguro){ if(await hacer('borrar', { cajon: 'temas', id }, 'Borrado')) location.hash = '#/sociedad'; } else { bo.dataset.seguro = 1; bo.lastChild.textContent = '¿Seguro? Toca otra vez'; } };
}
function vMiembros(c){
  const ms = S.d.miembros;
  c.innerHTML = '<h1>Miembros</h1>' + (S.d.admin && !esSoc() ? '<div class="aviso-cuenta">' + ico('shield-check') + '<div>Entraste con el pasador de la cooperativa: puedes nombrar a la presidencia.</div></div>' : '') + '<p class="sub">Quién es de la sociedad. ' + (esPres() ? 'Para agregar a alguien necesitas el código de 4 letras de su cuenta (lo ve en «Tu cuenta»).' : 'Los agrega la presidencia.') + '</p>' +
    '<div class="lista">' + ms.map(m => '<div class="tarjeta archivo"><span class="bola">' + ico(m.rol === 'presidencia' ? 'crown' : 'user-round') + '</span><div><b>' + e(m.alias) + '</b><div class="meta"><span class="chip ' + (m.rol === 'presidencia' ? 'oro' : 'azul') + '">' + e(m.rol) + '</span><span>' + e(m.cod) + '</span></div></div>' +
      (esPres() && m.cod !== miCodigo() ? '<button class="btn chico mal" data-quitar-m="' + e(m.cod) + '">' + ico('user-minus') + 'Quitar</button>' : '') + '</div>').join('') + '</div>' +
    (esPres() ? '<h2>' + ico('user-plus') + 'Agregar</h2><form id="fM" class="tarjeta"><div class="fila2"><label class="campo"><span>Código</span><input name="cod" required maxlength="4" style="text-transform:uppercase;letter-spacing:.2em;font-weight:800" placeholder="AB12"></label>' +
      '<label class="campo"><span>Papel</span><select name="rol"><option value="sociedad">Sociedad</option><option value="presidencia">Presidencia</option></select></label></div><button class="btn prin lleno">' + ico('user-plus') + 'Agregar</button></form>' : '');
  $$('[data-quitar-m]', c).forEach(b => b.onclick = async () => { if(await hacer('miembros', { cod: b.dataset.quitarM, rol: '' }, 'Quitado')) render(true); });
  const f = $('#fM', c); if(f) f.onsubmit = async (ev) => { ev.preventDefault(); const o = leer(f); if(await hacer('miembros', { cod: o.cod.toUpperCase(), rol: o.rol }, 'Agregado')) render(true); };
}

/* ══ FADORI Y RADIO DIVERGENTES ═════════════════════════════════════════ */
async function pintarFila(caja, chico){
  if(!caja) return;
  const r = await soc('fila'); if(!r.ok){ caja.innerHTML = ''; return; } S.fila = r.j;
  const f = r.j, mio = f.mios.filter(p => ['en_cola', 'preparando', 'listo'].indexOf(p.estado) >= 0);
  const EST = { en_cola: 'En la fila', preparando: 'Preparando', listo: '¡Ya está! Pasa por él', entregado: 'Entregado', cancelado: 'Cancelado', apartado: 'Apartado' };
  caja.innerHTML = '<div class="tarjeta"><div class="meta"><span>' + ico('utensils') + 'Fadori · cooperativa</span></div>' +
    (mio.length ? mio.map(p => '<h3 style="margin-top:8px">Tu turno ' + e(p.turno) + ' · <span style="color:' + (p.estado === 'listo' ? 'var(--bien)' : 'var(--azul2)') + '">' + e(EST[p.estado] || p.estado) + '</span></h3><p class="nota">' + e(p.que) + '</p>').join('')
      : '<h3 style="margin-top:8px">' + (f.enCola ? f.enCola + ' pedido' + (f.enCola === 1 ? '' : 's') + ' en la fila' : 'La fila está libre') + '</h3>') +
    (!chico && f.listos.length ? '<p class="nota" style="margin-top:8px">Ya pueden pasar</p><div class="turnos listos">' + f.listos.map(n => '<b>' + n + '</b>').join('') + '</div>' : '') +
    (!chico && f.preparando.length ? '<p class="nota" style="margin-top:8px">Preparando</p><div class="turnos">' + f.preparando.map(n => '<b>' + n + '</b>').join('') + '</div>' : '') +
    '<div class="botones"><a class="btn prin" href="../fadori/">' + ico('utensils') + 'Pedir en Fadori</a>' + (chico ? '<a class="btn" href="#/fadori">Ver la fila</a>' : '') + '</div></div>';
}
function vFadori(c){
  c.innerHTML = '<h1>Fadori</h1><p class="sub">La cooperativa sin filas. Tu cuenta es la misma: lo que pidas allá sale aquí.</p><div id="filaF"></div>';
  const caja = $('#filaF', c); pintarFila(caja, false);
  const t = setInterval(() => { if(!document.body.contains(caja)) return clearInterval(t); pintarFila(caja, false); }, 15000);
}
async function traerRadio(){ if(S.radio) return S.radio; const r = await soc('radio'); S.radio = r.ok ? r.j.episodios : []; return S.radio; }
async function pintarRadioChico(caja){
  if(!caja) return;
  const eps = await traerRadio(), u = eps[0];
  caja.innerHTML = '<a class="tarjeta tocable episodio" style="text-decoration:none" href="#/radio">' + (u && u.portada ? '<img src="' + u.portada + '" alt="">' : '<img src="../podcast/marca/radio-divergentes.png" alt="">') +
    '<div><div class="meta"><span>' + ico('radio') + 'Radio Divergentes</span></div><b>' + e(u ? u.nombre : 'El podcast de Ética del 3.1') + '</b><div class="meta"><span>' + (u ? 'Episodio nuevo' : 'Próximamente') + '</span></div></div>' + ico('chevron-right') + '</a>';
}
async function vRadio(c){
  c.innerHTML = '<div class="cabeza"><div><h1>Radio Divergentes</h1><p class="sub">El podcast del 3.1. Los episodios que ya salieron y los que vienen.</p></div><a class="btn" href="../podcast/">' + ico('mic-vocal') + 'Abrir el estudio</a></div>' +
    '<h2>' + ico('headphones') + 'Ya salieron</h2><div id="epsYa" class="lista"><div class="cargando-s" style="min-height:80px">Cargando…</div></div><h2>' + ico('calendar-days') + 'Los temas</h2><div id="epsPlan" class="lista dos"></div>';
  const eps = await traerRadio(), ya = $('#epsYa', c); if(!ya) return;
  ya.innerHTML = eps.length ? eps.map((m, i) => '<div class="tarjeta"><div class="episodio">' + (m.portada ? '<img src="' + m.portada + '" alt="">' : '<span class="num">' + ico(m.esAudio ? 'headphones' : 'tv') + '</span>') + '<div><b>' + e(m.nombre) + '</b><div class="meta"><span>' + hace(m.t) + '</span><span>' + (m.tam / 1048576).toFixed(0) + ' MB</span></div></div>' +
    '<button class="btn chico prin" data-ep="' + i + '">' + ico('play') + 'Escuchar</button></div><div data-rep="' + i + '"></div></div>').join('') : vacio('radio', 'Todavía no sube ningún episodio.');
  $$('[data-ep]', ya).forEach(b => b.onclick = async () => { const m = eps[Number(b.dataset.ep)]; b.disabled = true; b.lastChild.textContent = 'Bajando…';
    try{ const u = await bajarEpisodio(m); const caja = $('[data-rep="' + b.dataset.ep + '"]', ya); caja.innerHTML = m.esAudio ? '<audio controls autoplay src="' + u + '"></audio>' : '<video controls autoplay playsinline src="' + u + '" style="width:100%;border-radius:12px;margin-top:8px"></video>'; b.remove(); }
    catch(err){ brindis(err.message); b.disabled = false; b.lastChild.textContent = 'Escuchar'; } });
  try{
    const { EPISODIOS } = await import('../podcast/episodios.js');
    const plan = $('#epsPlan', c); if(plan) plan.innerHTML = EPISODIOS.map(x => '<div class="tarjeta episodio"><span class="num">' + x.n + '</span><div><b>' + e(x.titulo) + '</b>' + (x.dilema ? '<p class="nota" style="margin:2px 0 0">' + e(x.dilema) + '</p>' : '') + '</div></div>').join('');
  }catch(err){}
}

/* ══ TU CUENTA ══════════════════════════════════════════════════════════ */
function vCuenta(c){
  const y = yo();
  if(!y){
    c.innerHTML = '<h1>Entra</h1><p class="sub">Con tu cuenta de Fadori: el mismo correo y contraseña. Si ya entraste a Fadori en este teléfono, ya estás dentro.</p>' +
      (miCodigo() ? '<div class="aviso-cuenta">' + ico('info') + '<div>Este teléfono tiene un código de Fadori pero no está ligado a una cuenta con correo. Entra con tu correo, o crea tu cuenta en Fadori.</div></div>' : '') +
      '<form id="fEntrar" class="tarjeta"><label class="campo"><span>Correo</span><input type="email" name="correo" required autocomplete="email"></label><label class="campo"><span>Contraseña</span><input type="password" name="clave" required autocomplete="current-password"></label>' +
      '<p class="error" id="errEntrar"></p><button class="btn prin lleno">' + ico('log-in') + 'Entrar</button></form>' +
      '<div class="tarjeta"><h3>¿No tienes cuenta?</h3><p class="nota">Se hace una sola vez en Fadori: tu nombre, tu grupo, una foto de tu credencial y tu correo. Sirve para pedir en la cooperativa y para todo lo de aquí.</p><a class="btn azul" href="../fadori/">' + ico('user-plus') + 'Crear mi cuenta en Fadori</a></div>';
    $('#fEntrar', c).onsubmit = async (ev) => {
      ev.preventDefault(); const o = leer(ev.target), b = ev.target.querySelector('button'); b.disabled = true;
      const r = await entrar(o.correo.trim(), o.clave); b.disabled = false;
      if(r.error){ $('#errEntrar', c).textContent = r.error; return; }
      await cargar(); brindis('¡Bienvenido!'); location.hash = '#/';
    };
    return;
  }
  c.innerHTML = '<h1>Tu cuenta</h1><div class="tarjeta"><div class="archivo"><span class="bola">' + ico(y.rol === 'presidencia' ? 'crown' : 'user-round') + '</span><div><b>' + e(y.nombre || y.alias) + '</b><div class="meta"><span>' + e(y.grupoNombre || nombreGrupo(y.grupo)) + '</span>' + (y.rol ? '<span class="chip oro">' + e(y.rol) + '</span>' : '') + '</div></div></div>' +
    '<p class="nota" style="margin-top:12px">Tu código (para que la sociedad te agregue):</p><p style="font-size:32px;font-weight:900;letter-spacing:.2em;margin:0">' + e(y.cod) + '</p>' +
    (y.cuenta ? '' : '<p class="error">Tu cuenta todavía no tiene correo o credencial. Complétala en Fadori para votar y escribir.</p>') + '</div>' +
    '<h2>' + ico('bell') + 'Notificaciones</h2><div class="tarjeta"><p class="nota">Te avisamos de avisos nuevos, eventos, votaciones, torneos y fotos. En iPhone primero agrega la página a tu inicio (Compartir → Agregar a inicio).</p><div class="botones"><button class="btn azul" id="activarPush">' + ico('bell') + 'Activar avisos</button><button class="btn" id="quitarPush">' + ico('bell-off') + 'Apagarlos</button></div></div>' +
    '<h2>' + ico('palette') + 'Cómo se ve</h2><div class="filtros">' + [['', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(([k, t]) => '<button data-tema="' + k + '" class="' + ((L.get('soc_tema') || '') === k ? 'si' : '') + '">' + t + '</button>').join('') + '</div>' +
    '<div class="botones" style="margin-top:24px"><button class="btn mal" id="salir">' + ico('log-out') + 'Salir de este teléfono</button></div><p class="nota">Salir también te saca de Fadori en este teléfono.</p>';
  $$('[data-tema]', c).forEach(b => b.onclick = () => { L.set('soc_tema', b.dataset.tema || null); if(b.dataset.tema) document.documentElement.dataset.tema = b.dataset.tema; else delete document.documentElement.dataset.tema; render(true); });
  $('#salir', c).onclick = async () => { salir(); await cargar(); render(); };
  $('#activarPush', c).onclick = activarPush;
  $('#quitarPush', c).onclick = async () => { try{ const reg = await navigator.serviceWorker.ready, s = await reg.pushManager.getSubscription(); if(s) await s.unsubscribe(); }catch(err){} await soc('push', { baja: true }); brindis('Avisos apagados'); };
}
async function activarPush(){
  try{
    if(!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Este navegador no deja mandar avisos. En iPhone, agrega la página a tu inicio y ábrela desde ahí.');
    if(await Notification.requestPermission() !== 'granted') throw new Error('No diste permiso para los avisos.');
    const reg = await navigator.serviceWorker.ready;
    const k = await (await fetch(API + '/api/push/clave?casa=' + encodeURIComponent(CASA))).json();
    const raw = atob(k.clave.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((k.clave.length + 3) % 4));
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, ch => ch.charCodeAt(0)) });
    const r = await soc('push', { sub: sub.toJSON() });
    brindis(r.ok ? '¡Listo! Te avisamos aquí' : r.j.error);
  }catch(err){ brindis(err.message); }
}
