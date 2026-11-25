/* avisos.js — LOS AVISOS DE CARYMO EN EL TELÉFONO (Carlos, 13 nov, bloque 7)
 * ===========================================================================
 * «Recordatorios con notificación». El servidor decide CUÁNDO (avisos-estudio.js,
 * cada 15 min); aquí sólo se prende el permiso, se apunta el teléfono y se eligen
 * cuáles y a qué hora.
 *
 * ⚠ EN IPHONE sólo hay avisos si CARYMO está en la pantalla de inicio (Compartir →
 * Agregar a inicio, iOS 16.4 o más nuevo). En Safari normal `PushManager` no existe,
 * así que en vez de un botón que no hace nada se explica cómo ponerla.
 *
 * ⚠ Y EL PERMISO SE PIDE EN EL TOQUE: Safari sólo deja preguntar si viene de un
 * toque de la persona, así que `Notification.requestPermission()` va antes de
 * cualquier `await` del botón.
 * ===========================================================================*/
const GUARDA = 'carymo.avisos';
const leer = () => { try{ return JSON.parse(localStorage.getItem(GUARDA) || 'null') || {}; }catch{ return {}; } };
const guardar = (x) => { try{ localStorage.setItem(GUARDA, JSON.stringify(x)); }catch{} };
const HORAS = []; for(let h = 7; h <= 22; h++) for(const m of ['00', '30']) HORAS.push(`${String(h).padStart(2, '0')}:${m}`);
const bonita = (h) => { const [a, b] = h.split(':').map(Number); const p = a < 12 ? 'a. m.' : 'p. m.'; return `${a % 12 || 12}:${String(b).padStart(2, '0')} ${p}`; };

const b64aBytes = (t) => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - t.length % 4) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };

export function soportaAvisos(){
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;
}
const esIPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const enInicio = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function iniciarAvisos({ sala, esc, ico, brindis, tono, SON, alAbrir = () => {} }){
  let estado = leer();          /* { on, ajustes } */
  let caja = null, ocupado = false;

  async function registro(){
    const url = new URL('sw.js', import.meta.url);
    return navigator.serviceWorker.register(url, { scope: new URL('./', import.meta.url).pathname });
  }

  async function prender(){
    /* primero el permiso, dentro del toque */
    const permiso = await Notification.requestPermission();
    if(permiso !== 'granted'){ pintar(); brindis(permiso === 'denied' ? 'Bloqueaste los avisos' : 'No diste permiso', 'vino', 'bell-off'); return; }
    ocupado = true; pintar();
    try{
      const reg = await registro();
      await navigator.serviceWorker.ready;
      const st = await sala({ accion: 'avisos', que: 'estado' });
      if(!st.publica) throw new Error('El servidor todavía no tiene los avisos.');
      let sus = await reg.pushManager.getSubscription();
      if(!sus) sus = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64aBytes(st.publica) });
      const j = sus.toJSON();
      const r = await sala({ accion: 'avisos', que: 'suscribir', suscripcion: { endpoint: sus.endpoint, keys: j.keys }, ajustes: estado.ajustes || st.ajustes });
      estado = { on: true, ajustes: r.ajustes }; guardar(estado);
      tono(SON.bien); brindis('Avisos prendidos', '', 'bell-ring');
    }catch(e){
      brindis('No se pudieron prender: ' + (e.message || e), 'vino', 'triangle-alert');
    }
    ocupado = false; pintar();
  }

  async function apagar(){
    ocupado = true; pintar();
    try{
      const reg = await navigator.serviceWorker.getRegistration(new URL('./', import.meta.url).pathname);
      const sus = reg && await reg.pushManager.getSubscription();
      await sala({ accion: 'avisos', que: 'desuscribir', suscripcion: sus ? { endpoint: sus.endpoint } : null });
      if(sus) await sus.unsubscribe();
      estado = { ...estado, on: false }; guardar(estado);
      brindis('Avisos apagados en este teléfono', '', 'bell-off');
    }catch(e){ brindis('No se pudieron apagar: ' + (e.message || e), 'vino', 'triangle-alert'); }
    ocupado = false; pintar();
  }

  async function cambiar(parcial){
    estado = { ...estado, ajustes: { ...(estado.ajustes || {}), ...parcial } }; guardar(estado);
    try{ const r = await sala({ accion: 'avisos', que: 'ajustes', ajustes: estado.ajustes }); estado.ajustes = r.ajustes; guardar(estado); }
    catch{ brindis('Se guardó aquí; se manda cuando haya red', 'vino', 'clock'); }
  }

  async function probar(){
    try{ const r = await sala({ accion: 'avisos', que: 'probar' }); brindis(r.enviados ? 'Te mandé uno de prueba' : 'No llegó a ningún teléfono: apágalos y préndelos otra vez', r.enviados ? '' : 'vino', 'send'); }
    catch(e){ brindis(e.message || 'No se pudo mandar', 'vino', 'triangle-alert'); }
  }

  function interruptor(k, txt, sub, icono){
    const si = (estado.ajustes || {})[k] !== false;
    return `<div class="ajuste">${ico(icono)}<span>${txt}<small style="display:block;color:var(--tenue);font-weight:500">${sub}</small></span><button class="interruptor" role="switch" data-av-k="${k}" aria-checked="${si}" aria-label="${esc(txt)}"></button></div>`;
  }

  function html(){
    if(!soportaAvisos()){
      if(esIPhone() && !enInicio()) return `<div class="ajuste av-nota">${ico('smartphone')}<span>Para que CARYMO te mande avisos en iPhone, ponla en tu pantalla de inicio: toca <b>Compartir</b> y luego <b>Agregar a inicio</b>. Ábrela desde ahí y prende los avisos aquí.</span></div>`;
      return `<div class="ajuste av-nota">${ico('bell-off')}<span>Este navegador no deja que CARYMO mande avisos.</span></div>`;
    }
    if(Notification.permission === 'denied') return `<div class="ajuste av-nota">${ico('bell-off')}<span>Bloqueaste los avisos de CARYMO. Se prenden en los ajustes del teléfono, en <b>Notificaciones</b>.</span></div>`;
    if(!estado.on) return `<button class="bt fuerte ancho" data-av="prender" ${ocupado ? 'disabled' : ''}>${ico('bell-ring')}${ocupado ? 'Prendiendo…' : 'Prender avisos'}</button>
      <p class="av-sub">Te recuerdo estudiar, cuidar tu racha, tus exámenes y a tu compañero. Nada más.</p>`;
    const a = estado.ajustes || {};
    const hora = a.estudiar === '' ? '' : (a.estudiar || '18:00');
    return `<div class="ajuste">${ico('alarm-clock')}<span>Recordatorio para estudiar<small style="display:block;color:var(--tenue);font-weight:500">Sólo si ese día no has estudiado</small></span>
        <select class="campo" data-av-hora style="max-width:130px;min-height:40px" aria-label="Hora del recordatorio"><option value="" ${hora ? '' : 'selected'}>Sin recordatorio</option>${HORAS.map((h) => `<option value="${h}" ${h === hora ? 'selected' : ''}>${bonita(h)}</option>`).join('')}</select></div>
      ${interruptor('racha', 'Racha en peligro', 'A las 9 de la noche, si no has estudiado', 'flame')}
      ${interruptor('examen', 'Examen cerca', 'A las 8 de la mañana, el día antes y el mismo día', 'calendar-clock')}
      ${interruptor('mascota', 'Tu compañero', 'A la 1 de la tarde, si tiene hambre o está triste', 'heart')}
      <div class="fila-bt" style="margin-top:8px"><button class="bt" data-av="probar">${ico('send')}Probar aviso</button><button class="bt" data-av="apagar" ${ocupado ? 'disabled' : ''}>${ico('bell-off')}Apagar aquí</button></div>`;
  }

  function pintar(nueva){
    if(nueva){
      caja = nueva;
      caja.addEventListener('click', (e) => {
        const b = e.target.closest('[data-av]');
        if(b){ if(b.dataset.av === 'prender') prender(); else if(b.dataset.av === 'apagar') apagar(); else probar(); return; }
        const s = e.target.closest('[data-av-k]');
        if(s){ const k = s.dataset.avK, si = s.getAttribute('aria-checked') !== 'true'; s.setAttribute('aria-checked', String(si)); tono(SON.toque); cambiar({ [k]: si }); }
      });
      caja.addEventListener('change', (e) => { if(e.target.matches('[data-av-hora]')){ tono(SON.toque); cambiar({ estudiar: e.target.value }); } });
    }
    if(caja && caja.isConnected) caja.innerHTML = html();
  }

  /* si el teléfono se des-suscribió solo (Safari lo hace al borrar datos), que el botón lo diga */
  async function revisar(){
    if(!soportaAvisos() || !estado.on) return;
    try{
      const reg = await navigator.serviceWorker.getRegistration(new URL('./', import.meta.url).pathname);
      const sus = reg && await reg.pushManager.getSubscription();
      if(!sus || Notification.permission !== 'granted'){ estado = { ...estado, on: false }; guardar(estado); pintar(); }
    }catch{}
  }

  /* tocar un aviso: abre el plan o el cuarto (con la app abierta llega por mensaje; cerrada, en la dirección) */
  function escucharToques(){
    try{ navigator.serviceWorker?.addEventListener('message', (e) => { if(e.data && e.data.aviso) alAbrir(e.data.aviso); }); }catch{}
    const q = new URLSearchParams(location.search), plan = q.get('ir') || '', abrir = q.get('abrir') || '';
    if(plan || abrir){ history.replaceState(null, '', location.pathname); setTimeout(() => alAbrir({ plan, abrir }), 3400); }
  }
  escucharToques(); revisar();

  return { pintar, prendidos: () => !!estado.on };
}
