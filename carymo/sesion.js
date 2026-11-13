/* sesion.js — VARIOS CURSOS A LA VEZ: LA FILA DE CURSOS Y LA SESIÓN DE ESTUDIO CON POMODORO (CARYMO)
 * ===========================================================================
 * Carlos, 13 nov: «que tengas varios cursos activos, porque en semana de exámenes tenemos que estudiar para
 * programación, matemáticas, química y biología… que tengas todos tus cursitos ya preparados y abiertos para
 * que los puedas ir cambiando entre ellos, como un plan de estudio. De media hora esto, incluso pomodoros».
 *
 *   · la FILA: arriba del camino, todos tus cursos con su avance; uno se cambia de un toque;
 *   · la SESIÓN: eliges cursos, minutos por bloque y descanso; corre sola: bloque de un curso → descanso →
 *     el curso que sigue. Si el bloque se acaba a media lección, no te saca: te avisa y cambia al salir.
 *     Vive en el teléfono (localStorage) con horas de verdad, así que sobrevive a cerrar la app.
 * ===========================================================================*/
const CLAVE = 'carymo.sesionEstudio';

export function iniciarSesionEstudio(h){
  const { $, esc, ico, hoja, cerrarHoja, brindis, tono, SON } = h;
  let s = (() => { try{ return JSON.parse(localStorage.getItem(CLAVE) || 'null'); }catch{ return null; } })();
  let tic = 0, pendiente = false;
  const guardar = () => { try{ if(s) localStorage.setItem(CLAVE, JSON.stringify(s)); else localStorage.removeItem(CLAVE); }catch{} };
  const cursos = () => Object.values(h.planes()).filter((p) => !p.academia).sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));

  /* ── la fila de cursos ── */
  function fila(){
    const lista = cursos(); if(!lista.length) return '';
    const act = h.actual();
    return `<div class="cursos-fila" role="tablist" aria-label="Tus cursos"><button class="curso-chip sesion" data-sesion-abrir>${ico('timer')}<span><b>${s ? 'Tu sesión' : 'Sesión de estudio'}</b><small>${s ? 'en curso' : 'pomodoro'}</small></span></button>${(lista.length < 2 ? [] : lista).map((p) => { const a = h.avanceDe(p), c = h.colorDe(p.materia || p.titulo);
      return `<button role="tab" class="curso-chip" data-curso="${esc(p.id)}" aria-selected="${p.id === act}" style="--c:${c}"><i style="--p:${a.pct}"></i><span><b>${esc(p.materia || p.titulo)}</b><small>${esc(h.cuando(p.fecha))}</small></span></button>`; }).join('')}
</div>`;
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-curso]'); if(c){ h.cambiarPlan(c.dataset.curso); tono(SON.toque); return; }
    if(e.target.closest('[data-sesion-abrir]')){ s ? controles() : armar(); }
  });

  /* ── armar la sesión ── */
  function armar(){
    const lista = cursos(); if(!lista.length){ brindis('Primero crea un plan', 'vino', 'notebook-pen'); return; }
    const elegidos = new Set(lista.slice(0, 4).map((p) => p.id)); let min = 25, pausa = 5, vueltas = 1;
    const hj = hoja('Sesión de estudio', `<p class="cuenta-txt">Estudias un rato cada curso, con descanso entre uno y otro (pomodoro). Va pasando solo al siguiente.</p>
      <div class="seccion-t" style="margin-top:6px">Cursos</div>
      <div class="ses-cursos">${lista.map((p) => `<button class="chip" data-ses-c="${esc(p.id)}" aria-pressed="${elegidos.has(p.id)}" style="--c:${h.colorDe(p.materia || p.titulo)}">${esc(p.materia || p.titulo)}</button>`).join('')}</div>
      <div class="seccion-t">Cada bloque</div><div class="chips" data-grupo="min">${[15, 25, 30, 45].map((m) => `<button class="chip" data-v="${m}" aria-pressed="${m === min}">${m} min</button>`).join('')}</div>
      <div class="seccion-t">Descanso</div><div class="chips" data-grupo="pausa">${[3, 5, 10].map((m) => `<button class="chip" data-v="${m}" aria-pressed="${m === pausa}">${m} min</button>`).join('')}</div>
      <div class="seccion-t">Vueltas a todos</div><div class="chips" data-grupo="vueltas">${[1, 2, 3].map((m) => `<button class="chip" data-v="${m}" aria-pressed="${m === vueltas}">${m}</button>`).join('')}</div>
      <p class="ses-total" id="sesTotal"></p>
      <button class="bt fuerte ancho" id="sesEmpezar">${ico('play')}Empezar</button>`, (x) => {
      const total = () => { const n = elegidos.size * vueltas, t = n * min + Math.max(0, n - 1) * pausa; $('#sesTotal', x).textContent = n ? `${n} ${n === 1 ? 'bloque' : 'bloques'} · ${Math.floor(t / 60) ? Math.floor(t / 60) + ' h ' : ''}${t % 60} min en total` : 'Elige al menos un curso'; $('#sesEmpezar', x).disabled = !n; };
      x.addEventListener('click', (e) => {
        const c = e.target.closest('[data-ses-c]'); if(c){ const id = c.dataset.sesC; elegidos.has(id) ? elegidos.delete(id) : elegidos.add(id); c.setAttribute('aria-pressed', String(elegidos.has(id))); total(); return; }
        const v = e.target.closest('[data-v]'); if(v){ const g = v.parentElement.dataset.grupo; if(g === 'min') min = +v.dataset.v; if(g === 'pausa') pausa = +v.dataset.v; if(g === 'vueltas') vueltas = +v.dataset.v; v.parentElement.querySelectorAll('[data-v]').forEach((y) => y.setAttribute('aria-pressed', String(y === v))); total(); }
      });
      $('#sesEmpezar', x).addEventListener('click', () => {
        const orden = lista.filter((p) => elegidos.has(p.id)).map((p) => p.id), bloques = [];
        for(let k = 0; k < vueltas; k++) bloques.push(...orden);
        s = { bloques, i: 0, min, pausa, fase: 'estudio', hasta: Date.now() + min * 60_000, pausadoQueda: null, empezo: Date.now() };
        guardar(); cerrarHoja(); h.cambiarPlan(bloques[0]); tono(SON.fin);
        h.dice(`¡Va! ${min} minutos de ${nombre(bloques[0])}. Yo te aviso.`, 'festeja', { si: () => brindis(`${min} min de ${nombre(bloques[0])}`, '', 'timer') });
        correr();
      });
      total();
    });
  }
  const nombre = (id) => { const p = h.planes()[id]; return p ? (p.materia || p.titulo) : 'tu curso'; };

  /* ── el reloj ── */
  const queda = () => !s ? 0 : s.pausadoQueda != null ? s.pausadoQueda : Math.max(0, s.hasta - Date.now());
  const mmss = (ms) => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  function pintarPastilla(){
    let b = document.getElementById('pomodoro');
    if(!s){ b?.remove(); document.body.classList.remove('con-pomodoro'); return; }
    if(!b){ b = document.createElement('button'); b.id = 'pomodoro'; b.className = 'pomodoro'; b.addEventListener('click', controles); document.body.append(b); }
    document.body.classList.add('con-pomodoro');
    const desc = s.fase === 'descanso';
    b.classList.toggle('descanso', desc); b.classList.toggle('pausado', s.pausadoQueda != null);
    const txt = `${ico(desc ? 'cloud-rain' : 'timer')}<b>${mmss(queda())}</b><span>${desc ? 'Descanso' : esc(nombre(s.bloques[s.i]))}</span>${s.pausadoQueda != null ? '<small>en pausa</small>' : ''}`;
    if(b._t !== txt){ b.innerHTML = txt; b._t = txt; }
    b.setAttribute('aria-label', `${desc ? 'Descanso' : 'Estudiando ' + nombre(s.bloques[s.i])}: quedan ${mmss(queda())}. Toca para pausar o terminar.`);
  }
  function correr(){
    clearInterval(tic);
    if(!s){ pintarPastilla(); return; }
    const paso = () => {
      if(!s){ clearInterval(tic); pintarPastilla(); return; }
      if(s.pausadoQueda == null && Date.now() >= s.hasta) avanzar();
      if(pendiente && !h.ocupado()) cambiarAhora();   /* saliste de la lección: ahora sí, el curso que toca */
      pintarPastilla();
    };
    paso(); tic = setInterval(paso, 1000);
  }
  function avanzar(){
    if(s.fase === 'estudio'){
      const ultimo = s.i >= s.bloques.length - 1;
      if(ultimo){ terminar(true); return; }
      s.fase = 'descanso'; s.hasta = Date.now() + s.pausa * 60_000; guardar();
      tono(SON.subir); try{ navigator.vibrate?.([60, 80, 60]); }catch{}
      h.dice(`¡Descanso de ${s.pausa} minutos! Estírate, toma agua. Luego sigue ${nombre(s.bloques[s.i + 1])}.`, 'amor', { si: () => brindis(`Descanso de ${s.pausa} min · luego ${nombre(s.bloques[s.i + 1])}`, 'oro', 'cloud-rain') });
    } else {
      s.fase = 'estudio'; s.i += 1; s.hasta = Date.now() + s.min * 60_000; guardar();
      tono(SON.fin); try{ navigator.vibrate?.([40, 40, 40]); }catch{}
      if(h.ocupado()){ pendiente = true; brindis(`Ya toca ${nombre(s.bloques[s.i])}: cambia al terminar esto`, '', 'timer'); }
      else cambiarAhora();
    }
  }
  function cambiarAhora(){
    pendiente = false; if(!s) return;
    h.cambiarPlan(s.bloques[s.i]);
    h.dice(`¡Ahora ${nombre(s.bloques[s.i])}! ${s.min} minutos.`, 'saluda', { si: () => brindis(`Ahora: ${nombre(s.bloques[s.i])}`, '', 'timer') });
  }
  function terminar(completa){
    const n = s ? s.bloques.length : 0; s = null; guardar(); clearInterval(tic); pintarPastilla();
    /* primero se vuelve a pintar (la fila ya sin «en curso») y DESPUÉS habla la mascota: al revés, el repintado
       se llevaba a la mascota con todo y su globo */
    h.alCambiar?.();
    if(completa){ tono(SON.fin); h.dice(`¡Terminamos la sesión! ${n} ${n === 1 ? 'bloque' : 'bloques'}. Eres una máquina.`, 'festeja', { si: () => brindis('¡Sesión terminada!', 'oro', 'trophy') }); }
  }
  function controles(){
    if(!s) return;
    const sig = s.bloques.slice(s.i + (s.fase === 'estudio' ? 1 : 1)).map(nombre);
    const hj = hoja('Tu sesión de estudio', `<p class="cuenta-txt">${s.fase === 'descanso' ? 'Estás en descanso.' : `Estudiando <b>${esc(nombre(s.bloques[s.i]))}</b>.`} Quedan <b>${mmss(queda())}</b>.${sig.length ? ` Después: ${esc(sig.join(' → '))}.` : ' Es el último bloque.'}</p>
      <div class="fila-bt"><button class="bt" id="sesPausa">${ico(s.pausadoQueda != null ? 'play' : 'pause')}${s.pausadoQueda != null ? 'Seguir' : 'Pausar'}</button><button class="bt" id="sesSaltar">${ico('chevron-right')}Saltar</button></div>
      <button class="bt ancho peligro-suave" id="sesFin" style="margin-top:10px">${ico('x')}Terminar la sesión</button>`, (x) => {
      $('#sesPausa', x).addEventListener('click', () => { if(s.pausadoQueda != null){ s.hasta = Date.now() + s.pausadoQueda; s.pausadoQueda = null; } else s.pausadoQueda = Math.max(0, s.hasta - Date.now()); guardar(); cerrarHoja(); correr(); });
      $('#sesSaltar', x).addEventListener('click', () => { s.pausadoQueda = null; s.hasta = Date.now(); guardar(); cerrarHoja(); correr(); });
      $('#sesFin', x).addEventListener('click', (e) => { const b = e.currentTarget; if(!b.dataset.seguro){ b.dataset.seguro = '1'; b.innerHTML = `${ico('x')}Toca otra vez para terminar`; return; } cerrarHoja(); terminar(false); });
    });
  }
  /* cuando sales de una lección (y la app vuelve a pintar el camino), se hace el cambio pendiente */
  function alPintar(){ if(pendiente && !h.ocupado()) cambiarAhora(); }
  if(s) correr();
  return { fila, alPintar, get activa(){ return !!s; } };
}
