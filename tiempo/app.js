/* TIEMPO EN PANTALLA · el plan (guardado en el teléfono) y los pasos que salen de él. */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TRABAJO = ['Claude', 'WhatsApp', 'WhatsApp Business', 'Safari (Central y Sala)', 'Duolingo', 'Alarmy', 'Teléfono', 'Mensajes', 'Mapas', 'Cámara'];
const TENTACION = ['Instagram', 'TikTok', 'Facebook', 'X', 'YouTube', 'Reddit', 'Snapchat'];
const SITIOS = ['claude.ai', 'mazi-central.palomazi9111.workers.dev', 'sala.palomazi9111.workers.dev', 'ejercitopalomazi9111-arch.github.io', 'web.whatsapp.com', 'duolingo.com', 'google.com'];
const NUNCA = ['instagram.com', 'tiktok.com', 'facebook.com', 'x.com', 'twitter.com', 'reddit.com', 'youtube.com'];

const PLAN0 = {
  apps: ['Claude', 'WhatsApp', 'WhatsApp Business', 'Safari (Central y Sala)', 'Duolingo', 'Alarmy', 'Teléfono'],
  extra: [], ocio: 30, dormir: '23:30', despertar: '06:30',
  tentacion: ['Instagram', 'TikTok', 'Facebook', 'X', 'YouTube'], franjaDe: '20:00', franjaA: '21:00',
  web: 'estricto', quien: '',
};
const guardado = (k, def) => { try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch{ return def; } };
const guardar = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); } catch{} };
let plan = { ...PLAN0, ...guardado('tiempo.plan', {}) };
let hecho = guardado('tiempo.hecho', {});

/* «23:30» → «11:30 pm» */
const hora = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); const ap = h < 12 ? 'am' : 'pm', h12 = h % 12 || 12; return `${h12}:${String(m).padStart(2, '0')} ${ap}`; };
const minutos = (n) => n >= 60 ? (n % 60 ? `${Math.floor(n / 60)} h ${n % 60} min` : `${n / 60} hora${n > 60 ? 's' : ''}`) : `${n} minuto${n > 1 ? 's' : ''}`;
const fichas = (xs) => `<div class="lista">${xs.map((x) => `<span>${esc(x)}</span>`).join('')}</div>`;
const ruta = (s) => `<span class="ruta">${s}</span>`;

/* ── los pasos, con SUS datos ── */
function pasos(){
  const quien = plan.quien.trim() || 'alguien de confianza';
  const apps = [...plan.apps, ...plan.extra];
  const ocio = +plan.ocio;
  const t = plan.tentacion;
  return [
    { id: 'codigo', titulo: `Que ${esc(quien)} ponga el código`, html: `
      ${ruta('Ajustes › Tiempo en pantalla › Bloquear ajustes de Tiempo en pantalla')}
      <ol><li>Dale el teléfono a ${esc(quien)} y que escriba un código de 4 números <b>sin que lo veas</b>.</li>
      <li>Si te pide tu Apple ID para recuperarlo, toca <b>Cancelar</b>: si lo puedes recuperar tú, el candado no sirve.</li></ol>
      <p class="porque">Todo lo demás se puede quitar en dos toques si sabes el código. Éste es el paso que hace que lo demás funcione.</p>
      <p class="nota">En versiones viejas del iPhone dice «Usar código de Tiempo en pantalla», y en algunas el menú se llama «Tiempo de uso».</p>` },
    { id: 'permitidas', titulo: 'Tus apps de trabajo, siempre abiertas', html: `
      ${ruta('Ajustes › Tiempo en pantalla › Siempre permitido')}
      <p>Deja en la lista de arriba («Apps permitidas») sólo éstas, y quita las demás con el botón rojo:</p>
      ${fichas(apps.map((a) => a.replace(' (Central y Sala)', '')))}
      ${apps.some((a) => /Safari/.test(a)) ? '<p class="nota">Safari va porque ahí abres la Central y la Sala; lo que se puede abrir en él lo cierra el paso 5.</p>' : ''}` },
    { id: 'tope', titulo: `Todo lo demás: ${minutos(ocio)} al día`, html: `
      ${ruta('Ajustes › Tiempo en pantalla › Límites de apps › Agregar límite')}
      <ol><li>Marca <b>Todas las apps y categorías</b> y toca <b>Siguiente</b>.</li>
      <li>Pon <b>${ocio >= 60 ? Math.floor(ocio / 60) + ' h ' : '0 h '}${ocio % 60} min</b> y deja <b>Todos los días</b>.</li>
      <li>Activa <b>Bloquear al final del límite</b> y toca <b>Agregar</b>.</li></ol>
      <p class="porque">Las apps de trabajo no cuentan: están en «Siempre permitido». Todo lo demás —juegos, redes, videos— comparte esa bolsa de tiempo, y al acabarse se bloquea hasta mañana.</p>
      <p class="nota">Si dice «Límites de uso de apps», es el mismo.</p>` },
    { id: 'dormir', titulo: `A dormir: de ${hora(plan.dormir)} a ${hora(plan.despertar)}`, html: `
      ${ruta('Ajustes › Tiempo en pantalla › Tiempo de inactividad')}
      <ol><li>Activa <b>Programado</b> y pon <b>Todos los días</b>, de <b>${hora(plan.dormir)}</b> a <b>${hora(plan.despertar)}</b>.</li>
      <li>Activa <b>Bloquear en tiempo de inactividad</b>.</li></ol>
      ${ruta('App Salud › Explorar › Dormir › Horario completo y opciones')}
      <ul><li>Pon el mismo horario y activa <b>Relajación</b> 30 minutos antes: el teléfono se pone en gris y en silencio para que te vayas soltando.</li>
      <li>Alarmy sigue sonando: está en «Siempre permitido».</li></ul>` },
    { id: 'web', titulo: plan.web === 'estricto' ? 'Internet: sólo tus páginas' : 'Internet: sin adultos ni redes', html: `
      ${ruta('Ajustes › Tiempo en pantalla › Restricciones de contenido y privacidad')}
      <ol><li>Actívalo arriba.</li>
      <li>Entra a <b>Restricciones de tienda, web, Siri y Game Center</b> › <b>Contenido web</b>.</li>
      ${plan.web === 'estricto'
        ? `<li>Elige <b>Solo sitios web permitidos</b>, borra los que trae de ejemplo y agrega éstos (luego suma los que uses para trabajar):</li></ol>${fichas(SITIOS)}`
        : `<li>Elige <b>Limitar sitios web para adultos</b>.</li><li>En <b>Nunca permitir</b> agrega:</li></ol>${fichas(NUNCA)}`}
      <p class="porque">Esto aplica en Safari y en las apps que abren páginas adentro.${plan.web === 'estricto' ? ' Si una página que necesitas no abre, ' + esc(quien) + ' la agrega con el código.' : ''}</p>` },
    { id: 'tienda', titulo: 'Que no se puedan volver a instalar', html: `
      ${ruta('Restricciones de contenido y privacidad › Compras en iTunes y App Store')}
      <ul><li><b>Instalar apps</b>: <b>No permitir</b>.</li><li><b>Eliminar apps</b>: <b>No permitir</b>.</li></ul>
      <p>Y ahora borra las de tentación que ya tengas: ${fichas(t)}</p>
      <p class="porque">Sin esto, la tentación se arregla en 20 segundos desde la App Store. Cuando necesites instalar algo de trabajo, ${esc(quien)} lo activa un momento.</p>` },
    { id: 'franja', opcional: true, titulo: `Redes sólo de ${hora(plan.franjaDe)} a ${hora(plan.franjaA)}`, html: `
      <p>Si decides conservar alguna (${esc(t.join(', ') || 'ninguna marcada')}), que sólo abra en tu franja. Lo hace un atajo:</p>
      ${ruta('Atajos › Automatización › ＋ › App')}
      <ol><li>Elige ${esc(t.join(', ') || 'las apps')}, marca <b>Se abre</b> y <b>Ejecutar inmediatamente</b>. Toca <b>Siguiente</b> › <b>Nueva automatización en blanco</b>.</li>
      <li>Agrega <b>Si</b>: <b>Fecha actual</b> <b>no está entre</b> ${hora(plan.franjaDe)} y ${hora(plan.franjaA)}.</li>
      <li>Adentro: <b>Mostrar notificación</b> «Ahorita no: tus redes son de ${hora(plan.franjaDe)} a ${hora(plan.franjaA)}» y <b>Ir a pantalla de inicio</b>.</li></ol>
      <p class="porque">Cada vez que la abras fuera de tu hora te regresa al inicio. Así el límite es por hora, no sólo por día.</p>
      <p class="nota">No lo he podido probar en un iPhone de verdad. Si el paso 2 no te deja elegir «no está entre», mándame captura.</p>` },
    { id: 'filtro', opcional: true, titulo: 'Filtro contra porno en todo el teléfono', html: `
      <p>El paso 5 cuida Safari. Esto cuida <b>todas</b> las apps y también los datos del celular, gratis:</p>
      <ol><li>En Safari abre <a href="https://cleanbrowsing.org/support/mobile/ios" target="_blank" rel="noopener">cleanbrowsing.org/support/mobile/ios</a> y baja el perfil <b>Family</b>.</li>
      <li>Ajustes › <b>Perfil descargado</b> › <b>Instalar</b>.</li></ol>
      <p class="porque">Bloquea sitios para adultos aunque los abras desde otra app, y obliga la búsqueda segura en Google. Es un servicio de fuera: si un día falla, se cambia el perfil y ya.</p>
      ${plan.web === 'estricto' ? '<p class="nota">Con internet en «Estricto», cleanbrowsing.org no abre: agrégalo un momento a tu lista.</p>' : ''}` },
    { id: 'mas', titulo: 'Cuando quieras más tiempo', html: `
      <p>Al acabarse el tiempo aparece <b>Pedir más tiempo</b>, y eso pide el código. O sea: se lo tienes que pedir a ${esc(quien)} y explicarle para qué.</p>
      <p class="porque">Ésa es la idea: que caer en la tentación cueste una conversación, no un toque.</p>` },
    { id: 'semana', titulo: 'Cada domingo, 2 minutos', html: `
      ${ruta('Ajustes › Tiempo en pantalla › Ver toda la actividad')}
      <p>Mira cuánto usaste, qué app se comió el ocio y a qué hora. Si algo se coló, súmalo al paso 3 o al 5.</p>` },
  ];
}

/* ── pintar ── */
function pintarPlan(){
  const chip = (lista, sel) => lista.map((a) => `<button type="button" aria-pressed="${sel.includes(a)}" data-v="${esc(a)}">${esc(a)}</button>`).join('');
  $('#apps').innerHTML = chip([...TRABAJO, ...plan.extra], [...plan.apps, ...plan.extra]);
  $('#tentacion').innerHTML = chip(TENTACION, plan.tentacion);
  $('#ocio').value = String(plan.ocio);
  $('#dormir').value = plan.dormir; $('#despertar').value = plan.despertar;
  $('#franjaDe').value = plan.franjaDe; $('#franjaA').value = plan.franjaA;
  for(const r of document.querySelectorAll('input[name=web]')) r.checked = r.value === plan.web;
  $('#quien').value = plan.quien;
}
function pintarPasos(){
  const ps = pasos();
  $('#lista').replaceChildren(...ps.map((p, i) => {
    const a = document.createElement('article');
    a.className = 'paso' + (hecho[p.id] ? ' hecho' : '') + (p.opcional ? ' opcional' : '');
    a.dataset.paso = p.id;
    a.innerHTML = `<span class="num" aria-hidden="true">${hecho[p.id] ? '✓' : i + 1}</span><h3>${p.titulo}</h3><div class="cuerpo">${p.html}</div>
      <div class="listo"><label><input type="checkbox" ${hecho[p.id] ? 'checked' : ''}> Listo</label></div>`;
    return a;
  }));
  const obligatorios = ps.filter((p) => !p.opcional), n = obligatorios.filter((p) => hecho[p.id]).length;
  $('#cuenta').textContent = `${n} de ${obligatorios.length}`;
  $('#barra').style.width = (100 * n / obligatorios.length) + '%';
}
function cambio(){ guardar('tiempo.plan', plan); pintarPasos(); }

$('#apps').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-v]'); if(!b) return;
  const v = b.dataset.v;
  if(plan.extra.includes(v)) plan.extra = plan.extra.filter((x) => x !== v);
  else plan.apps = plan.apps.includes(v) ? plan.apps.filter((x) => x !== v) : [...plan.apps, v];
  pintarPlan(); cambio();
});
$('#tentacion').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-v]'); if(!b) return;
  const v = b.dataset.v;
  plan.tentacion = plan.tentacion.includes(v) ? plan.tentacion.filter((x) => x !== v) : [...plan.tentacion, v];
  pintarPlan(); cambio();
});
const agregar = () => {
  const v = $('#otraApp').value.trim(); if(!v) return;
  if(![...TRABAJO, ...plan.extra].includes(v)) plan.extra.push(v); else if(!plan.apps.includes(v)) plan.apps.push(v);
  $('#otraApp').value = ''; pintarPlan(); cambio();
};
$('#agregarApp').addEventListener('click', agregar);
$('#otraApp').addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); agregar(); } });
$('#ocio').addEventListener('change', (e) => { plan.ocio = +e.target.value; cambio(); });
for(const id of ['dormir', 'despertar', 'franjaDe', 'franjaA']) $('#' + id).addEventListener('change', (e) => { if(e.target.value){ plan[id] = e.target.value; cambio(); } });
for(const r of document.querySelectorAll('input[name=web]')) r.addEventListener('change', () => { plan.web = r.value; cambio(); });
$('#quien').addEventListener('input', (e) => { plan.quien = e.target.value; cambio(); });
$('#plan').addEventListener('submit', (e) => e.preventDefault());
$('#lista').addEventListener('change', (e) => {
  const a = e.target.closest('.paso'); if(!a || e.target.type !== 'checkbox') return;
  hecho[a.dataset.paso] = e.target.checked; guardar('tiempo.hecho', hecho); pintarPasos();
});

pintarPlan(); pintarPasos();
