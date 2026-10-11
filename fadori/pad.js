/* EL PAD DE NÚMEROS · para poner el pasador sin el teclado del teléfono
   ----------------------------------------------------------------------------
   Lo pidió Carlos: el de la cooperativa puede traer las manos sucias o estar
   cobrando, y no va a tocar mil veces la pantalla. Diez teclas grandes, los
   puntitos de cuántos lleva, y en cuanto completa los dígitos del pasador
   entra solo, sin buscar el botón de «Entrar».

     FadoriPad.abrir({ titulo, sub, largo, revisar })  → Promise<código|null>
        Ventana encima de todo (es un <dialog>, así que también encima de otro). `revisar(código)` dice si sirve (puede ser
        async: true, false o { error }). Si no sirve, tiembla y se borra.
     FadoriPad.montar(caja, { campo, largo, alCompletar })
        El mismo pad metido en una página (la reja del mostrador): escribe en
        `campo` y llama `alCompletar` cuando junta los dígitos. */
(function(global){
  'use strict';
  const CSS = `
  .fpad{display:grid; gap:12px; justify-items:center; user-select:none; -webkit-user-select:none}
  .fpad:focus{outline:none}
  .fpad.sin-puntos .fpad-puntos{display:none}
  .fpad-puntos{display:flex; gap:12px; min-height:22px; margin:4px 0 6px}
  .fpad-puntos i{width:18px; height:18px; border-radius:50%; border:2px solid currentColor; opacity:.55}
  .fpad-puntos i.lleno{background:currentColor; opacity:1}
  .fpad-teclas{display:grid; grid-template-columns:repeat(3, minmax(72px, 96px)); gap:12px}
  .fpad-teclas button{min-height:76px; border-radius:22px; border:1px solid rgba(128,100,80,.35); background:rgba(255,255,255,.08);
    color:inherit; font:inherit; font-size:34px; font-weight:800; font-variant-numeric:tabular-nums; cursor:pointer;
    -webkit-tap-highlight-color:transparent; touch-action:manipulation; transition:transform .08s, background .12s}
  .fpad-teclas button:active{transform:scale(.94); background:rgba(255,255,255,.18)}
  .fpad-teclas .fpad-ok{background:#C2410C; color:#fff; border-color:transparent; font-size:20px}
  .fpad-teclas .fpad-borra{font-size:22px}
  .fpad.tiembla{animation:fpad-tiembla .4s}
  @keyframes fpad-tiembla{20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}
  .fpad-msg{min-height:20px; font-weight:800; font-size:15px; color:#FF8A80; text-align:center}
  dialog.fpad-capa{position:fixed; inset:0; width:100%; height:100%; max-width:none; max-height:none; margin:0; padding:16px; border:0;
    box-sizing:border-box; display:grid; place-items:center; background:rgba(10,6,4,.78);
    -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); color:#FFF4E8; font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif}
  dialog.fpad-capa:not([open]){display:none}
  dialog.fpad-capa::backdrop{background:transparent}
  .fpad-caja{background:#1A110B; border:1px solid #3A271A; border-radius:28px; padding:22px 22px 18px; text-align:center; position:relative;
    box-shadow:0 30px 90px rgba(0,0,0,.6); animation:fpad-entra .3s cubic-bezier(.2,1.2,.4,1)}
  @keyframes fpad-entra{from{transform:scale(.92); opacity:0}}
  .fpad-caja h2{margin:0; font-size:22px} .fpad-caja p{margin:6px 0 0; color:#C9AE96; font-size:14px}
  .fpad-x{position:absolute; top:12px; right:12px; width:44px; height:44px; border-radius:14px; border:1px solid #3A271A; background:#24170F;
    color:#FFF4E8; font-size:22px; cursor:pointer}
  @media (prefers-reduced-motion: reduce){ .fpad.tiembla, .fpad-caja{animation:none} }`;
  function estilos(){
    if(document.getElementById('fpad-css')) return;
    const s = document.createElement('style'); s.id = 'fpad-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function construir({ largo = 6, alCambiar, alCompletar, conOk = true }){
    estilos();
    let v = '', auto = true;   /* tras un intento malo ya no entra solo: por si su pasador es más largo */
    const raiz = document.createElement('div'); raiz.className = 'fpad';
    const puntos = document.createElement('div'); puntos.className = 'fpad-puntos'; puntos.setAttribute('aria-hidden', 'true');
    const msg = document.createElement('div'); msg.className = 'fpad-msg'; msg.setAttribute('role', 'status');
    const teclas = document.createElement('div'); teclas.className = 'fpad-teclas';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borra', '0', 'ok'].forEach(k => {
      const b = document.createElement('button'); b.type = 'button';
      if(k === 'borra'){ b.className = 'fpad-borra'; b.textContent = '⌫'; b.setAttribute('aria-label', 'Borrar'); }
      else if(k === 'ok'){ b.className = 'fpad-ok'; b.textContent = 'Entrar'; if(!conOk) b.style.visibility = 'hidden'; }
      else { b.textContent = k; b.dataset.d = k; }
      b.addEventListener('click', () => {
        msg.textContent = '';
        if(k === 'borra') v = v.slice(0, -1);
        else if(k === 'ok'){ if(v.length >= 4) alCompletar(v); return; }
        else if(v.length < 8) v += k;
        pintar(); alCambiar && alCambiar(v);
        if(auto && largo && v.length === largo) setTimeout(() => alCompletar(v), 120);
      });
      teclas.appendChild(b);
    });
    function pintar(){
      const n = Math.max(largo || 0, v.length, 4);
      puntos.innerHTML = Array.from({ length: n }, (_, i) => '<i' + (i < v.length ? ' class="lleno"' : '') + '></i>').join('');
    }
    pintar();
    raiz.append(puntos, teclas, msg);
    /* también con el teclado de una computadora */
    raiz.tabIndex = -1;
    raiz.addEventListener('keydown', (e) => {
      if(/^\d$/.test(e.key)){ const b = teclas.querySelector('[data-d="' + e.key + '"]'); b && b.click(); }
      else if(e.key === 'Backspace') teclas.querySelector('.fpad-borra').click();
      else if(e.key === 'Enter') teclas.querySelector('.fpad-ok').click();
    });
    return {
      raiz,
      limpiar(error){ v = ''; if(error) auto = false; pintar(); alCambiar && alCambiar(v); if(error){ msg.textContent = error; raiz.classList.remove('tiembla'); void raiz.offsetWidth; raiz.classList.add('tiembla'); } },
      valor: () => v,
    };
  }
  function abrir({ titulo = 'Pasador', sub = '', largo = 6, revisar } = {}){
    estilos();
    return new Promise((fin) => {
      /* un <dialog> abierto con showModal: así queda encima hasta de otro
         diálogo abierto (los Ajustes de la pantalla), cosa que ningún z-index
         logra — ya nos pasó con «Listo» en el editor de láminas */
      const capa = document.createElement('dialog'); capa.className = 'fpad-capa';
      const caja = document.createElement('div'); caja.className = 'fpad-caja';
      caja.innerHTML = '<button class="fpad-x" type="button" aria-label="Cerrar">×</button><h2></h2><p></p>';
      caja.querySelector('h2').textContent = titulo; caja.querySelector('p').textContent = sub;
      let hecho = false;
      const cerrar = (r) => { if(hecho) return; hecho = true; try{ capa.close(); }catch(e){} capa.remove(); fin(r); };
      capa.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(null); });
      caja.querySelector('.fpad-x').addEventListener('click', () => cerrar(null));
      let ocupado = false;
      const pad = construir({ largo, alCompletar: async (v) => {
        if(ocupado) return; ocupado = true;
        let r = true;
        try{ r = revisar ? await revisar(v) : true; }catch(e){ r = { error: e.message }; }
        ocupado = false;
        if(r === true) return cerrar(v);
        pad.limpiar(((r && r.error) || 'Ese no es el pasador') + ' · ponlo completo y toca Entrar');
      } });
      caja.appendChild(pad.raiz);
      capa.appendChild(caja);
      capa.addEventListener('click', (e) => { if(e.target === capa) cerrar(null); });
      document.body.appendChild(capa);
      try{ capa.showModal(); }catch(e){ capa.setAttribute('open', ''); }
      pad.raiz.focus();
    });
  }
  function montar(caja, { campo, largo = 6, alCompletar, conOk = true } = {}){
    /* con `campo`, los puntitos ya los enseña el campo (es de contraseña) */
    const pad = construir({ largo, conOk, alCambiar: (v) => { if(campo) campo.value = v; }, alCompletar: (v) => { if(campo) campo.value = v; alCompletar && alCompletar(v); } });
    if(campo) pad.raiz.classList.add('sin-puntos');
    caja.appendChild(pad.raiz);
    return pad;
  }
  global.FadoriPad = { abrir, montar };
})(typeof window !== 'undefined' ? window : globalThis);
