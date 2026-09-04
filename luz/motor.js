/* El motor de la página. Sin dependencias y sin una sola petición de red: la
   astronomía se calcula aquí (ver `sol.js`) y no hay API que pueda caerse. */
import { luzDe } from './sol.js';
import { LUGARES } from './lugares.js';
import { MES, hhmm, duracion, cambio } from './formato.js';

const $  = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ── estado ──────────────────────────────────────────────────────────── */
const hoy = new Date();
let lugar = LUGARES[0];
let fecha = { a:hoy.getFullYear(), m:hoy.getMonth()+1, d:hoy.getDate() };
let propio = null;          /* «mi ubicación», si se concede */

/* ── el año entero, cacheado: 365 cuentas por lugar y año ────────────── */
const cache = new Map();
function elAno(l, a){
  const llave = l.id + ':' + a;
  if(cache.has(llave)) return cache.get(llave);
  const dias = [];
  const d = new Date(Date.UTC(a, 0, 1));
  while(d.getUTCFullYear() === a){
    const r = luzDe(a, d.getUTCMonth()+1, d.getUTCDate(), l.lat, l.lon, l.huso);
    dias.push({ m:d.getUTCMonth()+1, d:d.getUTCDate(), r });
    d.setUTCDate(d.getUTCDate()+1);
  }
  cache.set(llave, dias);
  return dias;
}

/* ── la banda del año, en un canvas ──────────────────────────────────
   Se dibuja por columnas: una por día, y en cada una los cinco tramos del
   cielo de arriba abajo. Es un solo `fillRect` por tramo — 365 × 9 rectángulos
   pintados una vez, no una animación. */
const TRAMOS = [
  ['astronomico', '--astro'],
  ['nautico',     '--nautico'],
  ['civil',       '--civil'],
  ['salida',      '--dia'],
];
function pintarBanda(){
  const c = $('#banda'), g = c.getContext('2d');
  const dias = elAno(lugar, fecha.a);
  const cs = getComputedStyle(document.documentElement);
  const col = (v) => cs.getPropertyValue(v).trim();

  /* el lienzo se dibuja a la resolución del aparato, topada a 2: por encima
     de eso no se distingue y sí se nota en la memoria. */
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const ancho = c.parentElement.clientWidth, alto = Math.round(ancho * 0.42);
  c.width = Math.round(ancho*dpr); c.height = Math.round(alto*dpr);
  c.style.height = alto + 'px';
  g.setTransform(dpr,0,0,dpr,0,0);

  g.fillStyle = col('--noche'); g.fillRect(0,0,ancho,alto);
  const px = ancho / dias.length;
  const y = (min) => alto * (min / 1440);

  /* ⚠ CADA COLUMNA A PÍXEL ENTERO. Con `x = i*px` y un ancho fraccionario, el
     borde derecho de una columna y el izquierdo de la siguiente caen los dos
     dentro del MISMO píxel, cada uno cubriéndolo a medias: el compositor suma
     dos medias coberturas y no llega a una entera. El resultado es una raya
     más oscura cada tres píxeles a lo largo de toda la banda — se ve como una
     trama, y parecía textura a propósito. */
  dias.forEach((dia, i) => {
    const x0 = Math.round(i*px), x1 = Math.max(x0 + 1, Math.round((i+1)*px));
    for(const [clave, variable] of TRAMOS){
      const t = dia.r[clave];
      g.fillStyle = col(variable);
      if(t) g.fillRect(x0, y(t[0]), x1-x0, y(t[1]) - y(t[0]));
      else if(dia.r[clave + 'Siempre'] === 'dia') g.fillRect(x0, 0, x1-x0, alto);
    }
  });

  /* las reglas: sólo las líneas. El texto va en HTML, al lado y debajo. */
  g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 1;
  const horas = $('#ejeHoras'); horas.textContent = '';
  for(let h = 3; h < 24; h += 3){
    const yy = Math.round(y(h*60)) + .5;
    g.beginPath(); g.moveTo(0,yy); g.lineTo(ancho,yy); g.stroke();
    const e = document.createElement('span');
    e.style.top = (h*60/1440*100) + '%';
    e.textContent = String(h).padStart(2,'0') + ':00';
    horas.appendChild(e);
  }
  const meses = $('#meses'); meses.textContent = '';
  let acum = 0;
  for(let m = 0; m < 12; m++){
    const largoMes = new Date(Date.UTC(fecha.a, m+1, 0)).getUTCDate();
    if(m){ const xx = Math.round(acum*px) + .5;
           g.beginPath(); g.moveTo(xx,0); g.lineTo(xx,alto); g.stroke(); }
    const e = document.createElement('span');
    e.style.left = (acum/dias.length*100) + '%';
    e.textContent = MES[m].slice(0,3).toUpperCase();
    meses.appendChild(e);
    acum += largoMes;
  }
  c.__dias = dias; c.__px = px;
}

/* ── el globo que sigue al dedo o al ratón sobre la banda ────────────── */
function seguir(ev){
  const caja = $('#banda').getBoundingClientRect();
  const dias = $('#banda').__dias; if(!dias) return;
  const x = Math.max(0, Math.min(caja.width - 1, ev.clientX - caja.left));
  const i = Math.min(dias.length - 1, Math.floor(x / (caja.width / dias.length)));
  const dia = dias[i];
  $('#cruz').style.left = x + 'px';
  const g = $('#globo');
  g.textContent = `${dia.d} ${MES[dia.m-1]} · ${duracion(dia.r.horasLuz)}` +
                  (dia.r.salida ? ` · ${hhmm(dia.r.salida[0])}–${hhmm(dia.r.salida[1])}` : ' · sin salida ni puesta');
  g.style.left = Math.max(g.offsetWidth/2 + 4,
                          Math.min(caja.width - g.offsetWidth/2 - 4, x)) + 'px';
  $('#lienzo').classList.add('viva');
}

/* ── hoy ─────────────────────────────────────────────────────────────── */
function pintarHoy(){
  const r  = luzDe(fecha.a, fecha.m, fecha.d, lugar.lat, lugar.lon, lugar.huso);
  const ay = new Date(Date.UTC(fecha.a, fecha.m-1, fecha.d - 1));
  const ra = luzDe(ay.getUTCFullYear(), ay.getUTCMonth()+1, ay.getUTCDate(),
                   lugar.lat, lugar.lon, lugar.huso);

  const t = Math.round(r.horasLuz * 60);
  $('#horas').textContent = Math.floor(t/60);
  $('#mins').textContent  = String(t%60).padStart(2,'0');
  $('#delta').textContent = cambio((r.horasLuz - ra.horasLuz) * 60);
  $('#dondeCuando').textContent =
    `${lugar.nombre} · ${fecha.d} de ${MES[fecha.m-1]} de ${fecha.a}`;

  /* la barra del día: los mismos tramos, en horizontal */
  const b = $('#barraDia');
  b.querySelectorAll('.tramo,.marcaHora,.sol').forEach(e => e.remove());
  const pon = (a1, a2, color) => {
    const e = document.createElement('div');
    e.className = 'tramo';
    e.style.cssText = `position:absolute;top:0;bottom:0;left:${a1/14.4}%;` +
                      `width:${(a2-a1)/14.4}%;background:var(${color})`;
    b.appendChild(e);
  };
  if(r.astronomico) pon(r.astronomico[0], r.astronomico[1], '--astro');
  if(r.nautico)     pon(r.nautico[0],     r.nautico[1],     '--nautico');
  if(r.civil)       pon(r.civil[0],       r.civil[1],       '--civil');
  if(r.salida)      pon(r.salida[0],      r.salida[1],      '--dia');
  else if(r.salidaSiempre === 'dia') pon(0, 1440, '--dia');

  const regla = $('#reglaHoras'); regla.textContent = '';
  for(let h = 0; h <= 24; h += 6){
    if(h && h < 24){
      const m = document.createElement('div');
      m.className = 'marcaHora'; m.style.left = (h/24*100) + '%';
      b.appendChild(m);
    }
    const e = document.createElement('span');
    /* las dos de los bordes se pegan al borde, si no se salen de la caja */
    e.style.left = (h/24*100) + '%';
    if(h === 0)  e.style.transform = 'none';
    if(h === 24) e.style.transform = 'translateX(-100%)';
    e.textContent = (h === 24 ? '24' : String(h).padStart(2,'0')) + ':00';
    regla.appendChild(e);
  }
  const s = document.createElement('div');
  s.className = 'sol'; s.style.left = (r.medio/1440*100) + '%';
  b.appendChild(s);

  $('#salePone').textContent = r.salida
    ? `Sale ${hhmm(r.salida[0])} · mediodía solar ${hhmm(r.medio)} · se pone ${hhmm(r.salida[1])}`
    : (r.salidaSiempre === 'dia'
        ? `Hoy el sol no se pone. Mediodía solar a las ${hhmm(r.medio)}.`
        : `Hoy el sol no sale. Mediodía solar a las ${hhmm(r.medio)}.`);

  /* el aviso del sol de medianoche sólo aparece cuando toca */
  $('#avisoPolar').hidden = !!r.salida;
}

/* ── los cuatro días y la tabla del mes ──────────────────────────────── */
function pintarTabla(){
  const dias = elAno(lugar, fecha.a);
  const largo = dias.reduce((a,b) => b.r.horasLuz > a.r.horasLuz ? b : a);
  const corto = dias.reduce((a,b) => b.r.horasLuz < a.r.horasLuz ? b : a);
  $('#extremos').innerHTML =
    `<tr><th scope="row">Día más largo</th><td>${largo.d} de ${MES[largo.m-1]}</td>` +
    `<td class="n">${duracion(largo.r.horasLuz)}</td></tr>` +
    `<tr><th scope="row">Día más corto</th><td>${corto.d} de ${MES[corto.m-1]}</td>` +
    `<td class="n">${duracion(corto.r.horasLuz)}</td></tr>` +
    `<tr><th scope="row">Diferencia</th><td>entre uno y otro</td>` +
    `<td class="n">${duracion(largo.r.horasLuz - corto.r.horasLuz)}</td></tr>`;

  $('#mensual').innerHTML = MES.map((nombre, i) => {
    const d = dias.find(x => x.m === i+1 && x.d === 15);
    return `<tr><th scope="row">${nombre[0].toUpperCase()+nombre.slice(1)} 15</th>` +
           `<td class="n">${hhmm(d.r.salida && d.r.salida[0])}</td>` +
           `<td class="n">${hhmm(d.r.salida && d.r.salida[1])}</td>` +
           `<td class="n">${duracion(d.r.horasLuz)}</td></tr>`;
  }).join('');
}

function todo(){ pintarHoy(); pintarBanda(); pintarTabla(); }

/* ── mandos ──────────────────────────────────────────────────────────── */
const sel = $('#lugar');
LUGARES.forEach(l => sel.add(new Option(l.nombre, l.id)));
sel.add(new Option('Mi ubicación…', 'propio'));
sel.value = lugar.id;

sel.addEventListener('change', () => {
  if(sel.value === 'propio') return pedirUbicacion();
  lugar = LUGARES.find(l => l.id === sel.value) || (propio && propio.id === sel.value ? propio : LUGARES[0]);
  todo();
});

const cal = $('#fecha');
cal.value = `${fecha.a}-${String(fecha.m).padStart(2,'0')}-${String(fecha.d).padStart(2,'0')}`;
cal.addEventListener('change', () => {
  const [a,m,d] = cal.value.split('-').map(Number);
  if(!a || !m || !d) return;
  fecha = { a, m, d }; todo();
});
$('#hoyBtn').addEventListener('click', () => {
  const n = new Date();
  fecha = { a:n.getFullYear(), m:n.getMonth()+1, d:n.getDate() };
  cal.value = `${fecha.a}-${String(fecha.m).padStart(2,'0')}-${String(fecha.d).padStart(2,'0')}`;
  todo();
});

/* ── mi ubicación: los cuatro finales, no sólo el bueno ──────────────── */
function pedirUbicacion(){
  const aviso = $('#avisoUbi');
  const volver = () => { sel.value = propio ? propio.id : lugar.id; };
  if(!navigator.geolocation){
    aviso.hidden = false;
    aviso.innerHTML = '<b>Este navegador no sabe dónde está.</b> No ofrece ubicación, ' +
      'así que elige la ciudad más cercana de la lista: a doscientos kilómetros la ' +
      'diferencia son un par de minutos.';
    volver(); return;
  }
  sel.disabled = true;
  aviso.hidden = false;
  aviso.innerHTML = '<b>Preguntando al navegador…</b> Si aparece un permiso, es el del ' +
                    'aparato: la posición no sale de esta página ni se guarda.';
  navigator.geolocation.getCurrentPosition(
    (p) => {
      propio = { id:'propio', nombre:'Mi ubicación',
                 lat:+p.coords.latitude.toFixed(2), lon:+p.coords.longitude.toFixed(2),
                 huso:-new Date().getTimezoneOffset() };
      if(!LUGARES.some(l => l.id === 'propio')) LUGARES.push(propio);
      if(![...sel.options].some(o => o.value === 'propio' && o.textContent === 'Mi ubicación'))
        [...sel.options].find(o => o.value === 'propio').textContent = 'Mi ubicación';
      lugar = propio; sel.disabled = false; sel.value = 'propio';
      aviso.hidden = true;
      todo();
    },
    (e) => {
      sel.disabled = false; volver();
      aviso.innerHTML = e.code === 1
        ? '<b>No diste permiso, y no pasa nada.</b> Sigue funcionando con la lista de ' +
          'ciudades; ninguna cuenta de esta página necesita saber dónde estás.'
        : '<b>El aparato no consiguió la posición.</b> Puede ser el GPS o la red. ' +
          'Elige la ciudad más cercana de la lista mientras tanto.';
    },
    { timeout:10000, maximumAge:600000 });
}

/* ── tema ────────────────────────────────────────────────────────────── */
const bt = $('#tema');
const leerTema = () => document.documentElement.getAttribute('data-tema')
  || (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
const ponerTema = (t) => {
  document.documentElement.setAttribute('data-tema', t);
  bt.textContent = t === 'oscuro' ? 'Claro' : 'Oscuro';
  try{ localStorage.setItem('luz_tema', t); }catch(e){}
  pintarBanda();
};
bt.textContent = leerTema() === 'oscuro' ? 'Claro' : 'Oscuro';
bt.addEventListener('click', () => ponerTema(leerTema() === 'oscuro' ? 'claro' : 'oscuro'));

/* ── la banda responde al ratón y al dedo ────────────────────────────── */
const lienzo = $('#lienzo');
lienzo.addEventListener('pointermove', seguir);
lienzo.addEventListener('pointerdown', seguir);
lienzo.addEventListener('pointerleave', () => lienzo.classList.remove('viva'));

let temporizador;
addEventListener('resize', () => {
  clearTimeout(temporizador); temporizador = setTimeout(pintarBanda, 120);
});

document.documentElement.classList.add('con-js');
todo();
