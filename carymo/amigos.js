/* amigos.js — AMIGOS, ESTUDIAR JUNTOS Y CÓMO TE FUE EN EL EXAMEN (CARYMO)
 * ===========================================================================
 * Carlos, 13 nov: «machear a otra persona que esté con la app abierta y ofrecerle
 * jugar juntos… se ponga un timer y los dos tengamos que estudiar durante ese
 * tiempo… saludos, felicitaciones cuando estudien… cuando sea su examen una
 * retroalimentación de cómo le fue, y guardar esos datos en su historial».
 *
 * El servidor es sala/servidor/estudio.js (latido, amistad, mandar, invitar,
 * responder, salirSesion, examen). Aquí:
 *   · el LATIDO cada 20 s mientras la app está abierta: dice quién está en línea,
 *     trae el buzón y el estado de la sesión;
 *   · la sección «Amigos» (dentro de Ranking): en línea ahora, solicitudes, tus
 *     amigos, y agregar por usuario;
 *   · la invitación que llega (hoja con la mascota), la BARRA de la sesión con el
 *     cronómetro y el marcador de los dos, y el final de la sesión;
 *   · después de la fecha de un examen, «¿cómo te fue?» → historial + aviso a amigos.
 * ===========================================================================*/

export function iniciarAmigos(h){
  const { sala, brindis, hoja, cerrarHoja, esc, ico, tono, SON, vibrar, mascotaEn, perfil, planes, guardarPlan, estudiando, $ } = h;
  let estado = { enLinea: [], amigos: [], pide: [], sesion: null }, desde = Date.now() - 60_000, reloj = 0, latiendo = false, invitacionVista = '', finVisto = '';
  const MSG = { saludo: 'te saludó', felicita: 'te felicitó', amistad: 'quiere ser tu amigo', amigos: 'ya es tu amigo', acepta: 'aceptó estudiar contigo',
    rechaza: 'ahorita no puede estudiar', examen: 'ya hizo su examen', fin: 'terminó la sesión' };

  async function latido(){
    if(latiendo || document.hidden) return;
    latiendo = true;
    try{
      const p = planes()[h.actual()] || null;
      const r = await sala({ accion: 'latido', estado: estudiando() ? 'estudiando' : 'libre', materia: p ? p.materia : '', desde });
      /* la hora del servidor, para que el cronómetro no dependa del reloj del teléfono */
      if(r.hora) desfase = r.hora - Date.now();
      estado = r; if(r.hora) desde = Math.max(desde, ...(r.buzon || []).map((m) => m.t), desde);
      for(const m of r.buzon || []) avisar(m);
      pintarSesion();
      if(h.vista() === 'ranking') pintarSeccion();
    }catch{}
    finally{ latiendo = false; }
  }
  function arrancar(){ clearInterval(reloj); latido(); reloj = setInterval(latido, 20_000); }
  document.addEventListener('visibilitychange', () => { if(!document.hidden) latido(); });

  /* lo que llega al buzón */
  function avisar(m){
    if(m.tipo === 'invita'){ invitacion(m); return; }
    const t = m.tipo === 'saludo' ? `${m.nombre} te saludó${m.texto ? ': ' + m.texto : ''}` : m.tipo === 'felicita' ? `${m.nombre} te felicitó${m.texto ? ': ' + m.texto : ''}`
      : m.tipo === 'examen' ? `${m.nombre} · ${m.texto}. ¡Felicítalo!` : `${m.nombre} ${MSG[m.tipo] || ''}`;
    tono(m.tipo === 'felicita' || m.tipo === 'amigos' ? SON.moneda : SON.pop); vibrar(12);
    brindis(t, m.tipo === 'rechaza' ? 'vino' : '', { saludo: 'hand', felicita: 'party-popper', amistad: 'user-plus', amigos: 'users', examen: 'graduation-cap', acepta: 'timer', rechaza: 'clock', fin: 'flag' }[m.tipo] || 'sparkles');
  }
  function invitacion(m){
    if(invitacionVista === m.sesion) return; invitacionVista = m.sesion;
    tono(SON.subir); vibrar([30, 40, 30]);
    const hh = hoja('', `<div style="display:grid;justify-items:center;gap:8px;text-align:center"><div class="masc-prep" id="mascInv"></div>
      <h3 style="margin:0">${esc(m.nombre)} te invita a estudiar juntos</h3><p style="color:var(--suave)">${esc(m.texto || '25 minutos')}. Los dos estudian al mismo tiempo y gana el que junte más XP.</p>
      <div style="display:grid;gap:10px;width:100%;margin-top:6px"><button class="bt fuerte ancho" id="invSi">${ico('timer')}¡Va!</button><button class="bt ancho" id="invNo">Ahorita no</button></div></div>`);
    { const k = mascotaEn($('#mascInv', hh), { tam: 96 }); if(k) k.play('sorpresa', { dura: 1800 }); }
    $('#invSi', hh).addEventListener('click', async () => { cerrarHoja(); try{ const r = await sala({ accion: 'responder', sesion: m.sesion, si: true }); estado.sesion = r.sesion; pintarSesion(); tono(SON.combo); brindis('¡A estudiar! El cronómetro ya corre', '', 'timer'); }catch(e){ brindis(e.message, 'vino', 'x'); } });
    $('#invNo', hh).addEventListener('click', async () => { cerrarHoja(); try{ await sala({ accion: 'responder', sesion: m.sesion, si: false }); }catch{} });
  }

  /* la barra de la sesión: cronómetro y marcador de los dos */
  let tic = 0, desfase = 0;
  const ahoraServidor = () => Date.now() + desfase;
  function pintarSesion(){
    let b = document.getElementById('barraSesion');
    const x = estado.sesion;
    if(!x || (x.estado !== 'activa' && x.estado !== 'terminada' && x.estado !== 'invitada')){ b?.remove(); clearInterval(tic); return; }
    if(x.estado === 'terminada'){ b?.remove(); clearInterval(tic); finSesion(x); return; }
    const yo = h.cuenta(), el = x.de === yo ? x.a : x.de;
    if(!b){ b = document.createElement('div'); b.id = 'barraSesion'; b.className = 'barra-sesion entra'; document.body.append(b);
      b.addEventListener('click', async (e) => { if(!e.target.closest('[data-salir-ses]')) return; if(!b.dataset.seguro){ b.dataset.seguro = '1'; e.target.closest('[data-salir-ses]').textContent = '¿Salir?'; setTimeout(() => { delete b.dataset.seguro; pintarSesion(); }, 2500); return; }
        try{ const r = await sala({ accion: 'salirSesion', sesion: x.id }); estado.sesion = r.sesion; finSesion(r.sesion); b.remove(); }catch{} }); }
    const pinta = () => {
      const s = x.estado === 'invitada' ? null : Math.max(0, Math.round((x.fin - ahoraServidor()) / 1000));
      const t = s == null ? 'Esperando a que acepte…' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const mio = x.xp?.[yo] || 0, suyo = x.xp?.[el] || 0;
      b.innerHTML = `<span class="crono">${ico('timer')}<b>${t}</b></span><span class="marcador"><span class="${mio >= suyo ? 'gana' : ''}">Tú ${mio}</span><i>vs</i><span class="${suyo > mio ? 'gana' : ''}">${esc(x.nombres?.[el] || el)} ${suyo}</span></span><button class="bt redondo fantasma" data-salir-ses aria-label="Salir de la sesión">${ico('x')}</button>`;
      if(s === 0){ clearInterval(tic); latido(); }
    };
    pinta(); clearInterval(tic); tic = setInterval(pinta, 1000);
  }
  function finSesion(x){
    if(!x || finVisto === x.id) return; finVisto = x.id;
    const yo = h.cuenta(), el = x.de === yo ? x.a : x.de, mio = x.xp?.[yo] || 0, suyo = x.xp?.[el] || 0, nom = x.nombres?.[el] || el;
    const gane = mio > suyo, empate = mio === suyo, salioOtro = x.salio && x.salio !== yo;
    tono(gane ? SON.fin : SON.subir);
    const hh = hoja('', `<div style="display:grid;justify-items:center;gap:8px;text-align:center"><div class="masc-fin" id="mascSes"></div>
      <h3 style="margin:0">${salioOtro ? `${esc(nom)} terminó la sesión antes` : empate ? '¡Empate!' : gane ? '¡Le ganaste!' : `Ganó ${esc(nom)}`}</h3><p style="color:var(--suave)">Tú juntaste <b>${mio} XP</b> y ${esc(nom)} <b>${suyo} XP</b> en ${Math.max(1, Math.round(((x.fin || ahoraServidor()) - (x.inicio || x.creada)) / 60000))} de ${x.minutos} minutos.${salioOtro ? ' Si quieres, invítalo otra vez desde Ranking.' : ''}</p>
      <div style="display:grid;gap:10px;width:100%"><button class="bt fuerte ancho" id="sesFelicita">${ico('party-popper')}Felicitar a ${esc(nom)}</button><button class="bt ancho" id="sesCerrar">Listo</button></div></div>`);
    { const k = mascotaEn($('#mascSes', hh), { tam: 110 }); if(k) k.play(gane || empate ? 'festeja' : 'bien', { dura: 3400 }); }
    $('#sesFelicita', hh).addEventListener('click', async () => { cerrarHoja(); try{ await sala({ accion: 'mandar', a: el, tipo: 'felicita', texto: '¡Buena sesión!' }); brindis(`Le mandaste una felicitación a ${nom}`, '', 'party-popper'); }catch{} });
    $('#sesCerrar', hh).addEventListener('click', cerrarHoja);
    sala({ accion: 'salirSesion', sesion: x.id }).catch(() => {});
  }

  /* la sección «Amigos», dentro de Ranking */
  function fila(x, acciones){
    return `<div class="amigo"><span class="av" style="background:${h.colorDe(x.cuenta)}">${esc((x.nombre || '?').charAt(0).toUpperCase())}${x.enLinea || x.estado ? '<i class="punto"></i>' : ''}</span>
      <span class="quien"><b>${esc(x.nombre || x.cuenta)}</b><small>@${esc(x.cuenta)}${x.estado === 'estudiando' ? ' · estudiando' + (x.materia ? ' ' + esc(x.materia) : '') : x.enLinea || x.estado ? ' · en línea' : ''}</small></span>
      <span class="acc">${acciones}</span></div>`;
  }
  const btn = (accion, cuenta, icono, texto) => `<button class="bt mini" data-am="${accion}" data-cuenta="${esc(cuenta)}" aria-label="${esc(texto)}">${ico(icono)}<span>${esc(texto)}</span></button>`;
  function pintarSeccion(){
    const v = document.getElementById('vRanking'); if(!v) return;
    let s = document.getElementById('secAmigos');
    if(!s){ s = document.createElement('section'); s.id = 'secAmigos'; s.className = 'sec-amigos'; v.prepend(s); }
    const enLinea = estado.enLinea || [], amigos = estado.amigos || [], pide = estado.pide || [];
    const ses = estado.sesion && (estado.sesion.estado === 'activa' || estado.sesion.estado === 'invitada');
    s.innerHTML = `<div class="seccion-t">Personas conectadas ${enLinea.length ? `<small>· ${enLinea.length}</small>` : ''}</div>
      ${enLinea.length ? enLinea.map((x) => fila({ ...x, enLinea: true }, (ses ? '' : btn('invitar', x.cuenta, 'timer', 'Estudiar juntos')) + btn('saludo', x.cuenta, 'hand', 'Saludar') + (x.amigo ? '' : btn('amistad', x.cuenta, 'user-plus', 'Agregar')))).join('')
        : '<p class="vacio-am">Nadie conectado en este momento.</p>'}
      ${pide.length ? `<div class="seccion-t">Te quieren agregar</div>${pide.map((x) => fila(x, btn('amistad', x.cuenta, 'check', 'Aceptar'))).join('')}` : ''}
      <div class="seccion-t">Amigos ${amigos.length ? `<small>· ${amigos.length}</small>` : ''}</div>
      ${amigos.length ? amigos.map((x) => fila(x, (x.enLinea && !ses ? btn('invitar', x.cuenta, 'timer', 'Estudiar juntos') : '') + btn('felicita', x.cuenta, 'party-popper', 'Felicitar') + btn('saludo', x.cuenta, 'hand', 'Saludar'))).join('') : '<p class="vacio-am">No hay nadie por aquí.</p>'}
      <form class="agregar-am" id="fAgregar"><input class="campo" id="amUsuario" placeholder="Usuario de tu amigo" autocomplete="off" autocapitalize="none" aria-label="Usuario de tu amigo"><button class="bt fuerte">${ico('user-plus')}Agregar</button></form>
      <div class="seccion-t" style="margin-top:22px">Ranking de la semana</div>`;
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-am]'); if(!b) return;
    const cuenta = b.dataset.cuenta, accion = b.dataset.am;
    b.disabled = true; setTimeout(() => { b.disabled = false; }, 1200);
    try{
      if(accion === 'invitar'){ elegirMinutos(cuenta); return; }
      if(accion === 'amistad'){ const r = await sala({ accion: 'amistad', a: cuenta }); brindis(r.amigos ? '¡Ya son amigos!' : 'Solicitud mandada', '', r.amigos ? 'users' : 'user-plus'); tono(SON.pop); }
      if(accion === 'saludo' || accion === 'felicita'){ await sala({ accion: 'mandar', a: cuenta, tipo: accion }); brindis(accion === 'saludo' ? 'Saludo mandado' : 'Felicitación mandada', '', accion === 'saludo' ? 'hand' : 'party-popper'); tono(SON.pop); }
      latido();
    }catch(err){ brindis(err.message, 'vino', 'x'); }
  });
  document.addEventListener('submit', async (e) => {
    if(e.target.id !== 'fAgregar') return; e.preventDefault();
    const u = $('#amUsuario').value.trim().replace(/^@/, '').toLowerCase(); if(!u) return;
    try{ const r = await sala({ accion: 'amistad', a: u }); brindis(r.amigos ? '¡Ya son amigos!' : 'Solicitud mandada', '', 'user-plus'); $('#amUsuario').value = ''; latido(); }
    catch(err){ brindis(err.message, 'vino', 'x'); }
  });
  function elegirMinutos(cuenta){
    const hh = hoja('¿Cuánto tiempo?', `<p style="color:var(--suave);margin-bottom:12px">Los dos estudian al mismo tiempo; gana el que junte más XP.</p>
      <div class="chips">${[10, 15, 25, 45].map((m) => `<button class="chip" data-min="${m}" aria-pressed="${m === 25}">${m} min</button>`).join('')}</div>
      <button class="bt fuerte ancho" style="margin-top:16px" id="minListo">${ico('send')}Mandar invitación</button>`);
    let min = 25;
    hh.addEventListener('click', (e) => { const c = e.target.closest('[data-min]'); if(c){ min = +c.dataset.min; hh.querySelectorAll('[data-min]').forEach((x) => x.setAttribute('aria-pressed', x === c)); } });
    $('#minListo', hh).addEventListener('click', async () => {
      cerrarHoja();
      try{ const r = await sala({ accion: 'invitar', a: cuenta, minutos: min }); estado.sesion = r.sesion; pintarSesion(); brindis('Invitación mandada', '', 'send'); tono(SON.whoosh); }
      catch(err){ brindis(err.message, 'vino', 'x'); }
    });
  }

  /* «¿Cómo te fue?»: el día después de la fecha de un examen, una vez por plan */
  function preguntarExamen(){
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const p = Object.values(planes()).find((x) => x.fecha && !x.academia && !x.examen && new Date(x.fecha + 'T12:00:00') < hoy && !(x.examenOmitido && Date.now() - x.examenOmitido < 2 * 864e5));
    if(!p || document.getElementById('hoja')) return;
    let como = '';
    const hh = hoja('', `<div style="display:grid;justify-items:center;gap:6px;text-align:center"><div class="masc-prep" id="mascEx"></div>
      <h3 style="margin:0">¿Cómo te fue en ${esc(p.titulo)}?</h3><p style="color:var(--suave)">Se guarda en tu historial y tus amigos se enteran para felicitarte.</p></div>
      <div class="opciones-ex">${[['excelente', 'Excelente', 'trophy'], ['bien', 'Bien', 'check'], ['regular', 'Regular', 'minus'], ['mal', 'No tan bien', 'cloud-rain']].map(([k, t, i]) => `<button class="chip" data-como="${k}" aria-pressed="false">${ico(i)}${t}</button>`).join('')}</div>
      <label class="seccion-t" for="exCalif" style="display:block">Tu calificación (si ya la sabes)</label><input class="campo" id="exCalif" type="number" inputmode="decimal" min="0" max="10" step="0.1" placeholder="Ej. 8.5">
      <label class="seccion-t" for="exNota" style="display:block">¿Qué venía que no esperabas? (opcional)</label><input class="campo" id="exNota" autocomplete="off">
      <div style="display:grid;gap:10px;margin-top:14px"><button class="bt fuerte ancho" id="exListo" disabled>Guardar</button><button class="bt ancho" id="exLuego">Todavía no lo hago</button></div>`);
    const m = mascotaEn($('#mascEx', hh), { tam: 92 }); if(m) m.play('piensa');
    hh.addEventListener('click', (e) => { const c = e.target.closest('[data-como]'); if(!c) return; como = c.dataset.como; hh.querySelectorAll('[data-como]').forEach((x) => x.setAttribute('aria-pressed', x === c)); $('#exListo', hh).disabled = false;
      if(m) m.play(como === 'excelente' ? 'festeja' : como === 'bien' ? 'bien' : como === 'regular' ? 'calma' : 'triste', { dura: 0 }); tono(SON.toque); });
    $('#exLuego', hh).addEventListener('click', () => { p.examenOmitido = Date.now(); guardarPlan(p); cerrarHoja(); });
    $('#exListo', hh).addEventListener('click', async () => {
      const calif = $('#exCalif', hh).value === '' ? null : Number($('#exCalif', hh).value);
      try{ const r = await sala({ accion: 'examen', plan: p.id, titulo: p.titulo, materia: p.materia, fecha: p.fecha, como, calif, nota: $('#exNota', hh).value });
        p.examen = r.examen; guardarPlan(p); cerrarHoja(); tono(como === 'excelente' || como === 'bien' ? SON.fin : SON.toque);
        brindis(como === 'mal' ? 'Guardado. El siguiente sale mejor' : '¡Guardado en tu historial!', '', 'graduation-cap'); }
      catch(err){ brindis(err.message, 'vino', 'x'); }
    });
  }

  return { arrancar, latido, pintarSeccion, preguntarExamen, get estado(){ return estado; } };
}
