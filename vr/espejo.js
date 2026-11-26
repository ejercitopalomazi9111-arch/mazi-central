/* EL ESPEJO, lado del visor (Carlos, 26 nov: «compartir mi pantalla para que se vea en tiempo real lo que se está viendo
   dentro de las gafas y yo pueda controlar un poco la explicación»). El servidor es sala/servidor/espejo.js; la pantalla
   del docente, vr/operador.html.
     · Al abrirse, el visor saca un código de 4 números y lo enseña (MONARCH lo pone en la pantalla del idioma).
     · Sólo cuando hay alguien mirando manda cuadros: el ojo izquierdo, a 480 px, en JPEG, ~3 por segundo.
     · Le manda su estado (fase, escena, título) y recibe órdenes; quién las cumple lo decide la experiencia (alOrden).
   Si no hay red o no hay servidor, no pasa nada: el visor sigue igual. */
export function crearEspejo(V, { alOrden = () => {}, estado = () => ({}) } = {}){
  const E = { codigo: '', ws: null, mirando: 0, enviados: 0, abierto: false };
  const lienzo = document.createElement('canvas'), x = lienzo.getContext('2d');
  let ultimo = 0, ocupado = false, estadoAntes = '', reintento = null;
  function url(){ const u = new URL(`/api/sala/vr/espejo/${E.codigo}?rol=visor`, location.href); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'; return u.href; }
  E.abrir = () => {
    if(E.abierto) return E.codigo; E.abierto = true;
    if(!E.codigo){ try{ E.codigo = sessionStorage.getItem('mazivr.espejo') || ''; }catch{} }
    if(!E.codigo){ E.codigo = String(1000 + Math.floor(Math.random() * 9000)); try{ sessionStorage.setItem('mazivr.espejo', E.codigo); }catch{} }
    conectar(); return E.codigo;
  };
  function conectar(){
    if(!E.abierto) return;
    let ws; try{ ws = new WebSocket(url()); }catch{ return; }
    ws.binaryType = 'arraybuffer'; E.ws = ws;
    ws.onmessage = (ev) => { if(typeof ev.data !== 'string') return; let m; try{ m = JSON.parse(ev.data); }catch{ return; }
      if(m.tipo === 'gente'){ const antes = E.mirando; E.mirando = m.operadores || 0; if(E.mirando > antes){ V.hud?.('El docente está mirando', 1.6); estadoAntes = ''; mandarEstado(); } }
      else if(m.tipo === 'orden') try{ alOrden(m); }catch(e){ V.fallo?.('E-ESPEJO', 'orden ' + m.accion, e); } };
    ws.onclose = (ev) => { E.ws = null; E.mirando = 0; if(ev.code === 4000) return;   /* otro visor tomó el código: éste se queda quieto */
      if(E.abierto){ clearTimeout(reintento); reintento = setTimeout(conectar, 4000); } };
    ws.onerror = () => {};
  }
  E.cerrar = () => { E.abierto = false; clearTimeout(reintento); try{ E.ws?.close(); }catch{} E.ws = null; E.mirando = 0; };
  function mandarEstado(){ if(!E.ws || E.ws.readyState !== 1) return; const s = JSON.stringify({ tipo: 'estado', ...estado() }); if(s === estadoAntes) return; estadoAntes = s; try{ E.ws.send(s); }catch{} }
  /* después de pintar cada cuadro (V.trasCuadro): el lienzo de WebGL todavía tiene el cuadro, se copia el ojo izquierdo */
  V.trasCuadro.push(() => {
    if(!E.ws || E.ws.readyState !== 1 || !E.mirando) return;
    const ahora = performance.now(); if(ahora - ultimo < 330 || ocupado || E.ws.bufferedAmount > 200000) return; ultimo = ahora;
    mandarEstado();
    const cv = V.render.domElement;
    /* acostado (vertical en la pantalla, de lado en el visor): el ojo izquierdo es la mitad de ARRIBA y va girado; se endereza
       para el docente (27 nov: en el espejo se veía una tira acostada) */
    if(V.estaAcostado?.()){ const sw = cv.width, sh = cv.height / 2, w = 480, h = Math.round(w * sw / Math.max(1, sh));
      if(lienzo.width !== w || lienzo.height !== h){ lienzo.width = w; lienzo.height = h; }
      try{ x.save(); x.translate(0, h); x.rotate(-Math.PI / 2); x.drawImage(cv, 0, 0, sw, sh, 0, 0, h, w); x.restore(); }catch{ x.restore(); return; } }
    else { const ojo = V.modo?.mono ? cv.width : cv.width / 2, w = 480, h = Math.round(w * cv.height / Math.max(1, ojo));
      if(lienzo.width !== w || lienzo.height !== h){ lienzo.width = w; lienzo.height = h; }
      try{ x.drawImage(cv, 0, 0, ojo, cv.height, 0, 0, w, h); }catch{ return; } }
    ocupado = true;
    lienzo.toBlob((b) => { ocupado = false; if(!b || !E.ws || E.ws.readyState !== 1) return; b.arrayBuffer().then((buf) => { try{ E.ws.send(buf); E.enviados++; }catch{} }); }, 'image/jpeg', .6);
  });
  E.estado = mandarEstado;
  return E;
}
