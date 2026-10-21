/* LA CONSTANCIA DE LO QUE SE DEBE · para mandársela a los papás
   ----------------------------------------------------------------------------
   Carlos, 21 de octubre: «necesitamos una manera de mandar una tipo constancia
   de cuánto se debe, por qué se debe, desde qué día, por qué producto, qué se
   compró, cuánto se pagó y cuánto se debe… para que los papás ya sepan con un
   ticket, aunque sea electrónico».

   La sacan la cooperativa (en Fiados) y el propio alumno (en «Mi cuenta»),
   para reenviarla. Tres salidas: WhatsApp con el texto, una IMAGEN de ticket
   (lo que de verdad se reenvía a un papá) y copiar el texto.

     FadoriConstancia.abrir(código)   → la hoja, encima de todo (<dialog>)
     FadoriConstancia.imagen(código)  → Promise<Blob PNG>
   Los datos salen de FADORI.estadoDeCuenta / constanciaTexto (nucleo.js). */
(function(global){
  'use strict';
  const CSS = `
  dialog.fcons{width:min(520px, calc(100% - 24px)); max-height:calc(100% - 24px); padding:0; border:0; border-radius:24px;
    background:var(--sup, #fff); color:var(--tinta, #1a120c); box-shadow:0 30px 90px rgba(0,0,0,.45); overflow:auto}
  dialog.fcons::backdrop{background:rgba(10,6,4,.6)}
  .fcons-in{padding:20px 18px 18px; display:grid; gap:14px}
  .fcons-cab{display:flex; align-items:center; gap:10px}
  .fcons-cab h2{margin:0; flex:1; font-size:21px}
  .fcons-x{width:44px; height:44px; border-radius:14px; border:1px solid var(--linea, #ddd); background:transparent; color:inherit; font-size:22px; cursor:pointer}
  .fcons-ticket{background:#FFFDF8; color:#1A120C; border-radius:14px; padding:16px; border:1px dashed #C9B8A6;
    font-variant-numeric:tabular-nums; font-size:15px; line-height:1.45}
  .fcons-ticket .t1{font-weight:900; font-size:17px}
  .fcons-ticket .sub{color:#6B5A4C; font-size:13px}
  .fcons-ticket .debe{font-size:30px; font-weight:900; color:#B3261E; margin-top:10px; letter-spacing:-.02em}
  .fcons-ticket ul{list-style:none; margin:12px 0 0; padding:0; display:grid; gap:8px}
  .fcons-ticket li{display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:10px; border-top:1px solid #EEE3D6; padding-top:8px}
  .fcons-ticket li small{display:block; color:#6B5A4C; font-size:12.5px}
  .fcons-ticket .mas{color:#B3261E; font-weight:800} .fcons-ticket .menos{color:#1F7A4D; font-weight:800}
  .fcons-ticket .tot{display:grid; grid-template-columns:1fr auto; gap:4px 10px; margin-top:12px; border-top:2px solid #1A120C; padding-top:10px}
  .fcons-ticket .tot b{font-weight:900}
  .fcons-acc{display:grid; gap:8px}
  .fcons-acc button{min-height:52px; border-radius:14px; border:1px solid var(--linea, #ddd); background:var(--tarjeta, transparent); color:inherit;
    font:inherit; font-weight:800; font-size:16px; cursor:pointer}
  .fcons-acc .fuerte{background:#1F7A4D; color:#fff; border-color:transparent}
  .fcons-msg{min-height:18px; font-size:14px; font-weight:700; text-align:center}`;
  function estilos(){
    if(document.getElementById('fcons-css')) return;
    const s = document.createElement('style'); s.id = 'fcons-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dia = (t) => new Date(t).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  const cuando = (t) => new Date(t).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  /* cada movimiento en dos renglones: qué fue y su detalle, con su monto */
  function renglones(c){
    const P = global.FADORI.pesos, r = [];
    if(c.sinDetalle) r.push({ que: 'De antes', det: 'sin detalle guardado', monto: '+' + P(c.sinDetalle), signo: 1 });
    for(const m of c.movimientos){
      if(m.k === 'compra') r.push({ que: m.q || 'Compra', det: dia(m.t) + ' · costó ' + P(m.tot) + ', pagó ' + P(m.pag), monto: '+' + P(m.d), signo: 1 });
      else if(m.k === 'mano') r.push({ que: m.mo || 'Fiado', det: dia(m.t) + ' · apuntado en la cooperativa', monto: '+' + P(m.d), signo: 1 });
      else if(m.k === 'abono') r.push({ que: 'Abono', det: dia(m.t), monto: '−' + P(-m.d), signo: -1 });
      else r.push({ que: 'Ajuste de la cooperativa', det: dia(m.t), monto: (m.d < 0 ? '−' + P(-m.d) : '+' + P(m.d)), signo: m.d < 0 ? -1 : 1 });
    }
    return r;
  }
  function lugar(){ return 'Fadori · ' + ((global.FADORI.estado().config || {}).nombreLugar || 'Cooperativa'); }

  function html(cod){
    const F = global.FADORI, c = F.estadoDeCuenta(cod); if(!c) return '';
    const a = c.alumno;
    let h = '<div class="t1">' + esc(lugar()) + ' · Estado de cuenta</div>' +
      '<div><b>' + esc(a.nombre) + '</b>' + (a.grupo ? ' · ' + esc(a.grupo) : '') + ' · código ' + esc(a.codigo) + '</div>' +
      '<div class="sub">' + esc(cuando(c.hoy)) + '</div>';
    if(!c.deuda) return h + '<div class="debe" style="color:#1F7A4D">No debe nada</div>';
    h += '<div class="debe">Debe ' + F.pesos(c.deuda) + '</div>' +
      (c.desde ? '<div class="sub">Desde el ' + esc(dia(c.desde)) + (c.completo ? '' : ' (o antes)') + '</div>' : '') +
      '<ul>' + renglones(c).map(x => '<li><span>' + esc(x.que) + '<small>' + esc(x.det) + '</small></span><span class="' + (x.signo < 0 ? 'menos' : 'mas') + '">' + esc(x.monto) + '</span></li>').join('') + '</ul>' +
      '<div class="tot"><span>Se fió</span><span>' + F.pesos(c.cargado + c.sinDetalle) + '</span>' +
      '<span>Abonado</span><span>' + F.pesos(c.abonado) + '</span>' +
      '<b>Falta</b><b>' + F.pesos(c.deuda) + '</b></div>' +
      '<div class="sub" style="margin-top:10px">Se paga en la cooperativa. Cualquier duda, ahí mismo.</div>';
    return h;
  }

  /* LA IMAGEN · 1080 de ancho (lo que WhatsApp enseña completo), en dos
     pasadas: se mide cuánto mide todo y luego se pinta en un lienzo de ese alto */
  async function imagen(cod){
    const F = global.FADORI, c = F.estadoDeCuenta(cod); if(!c) return null;
    const W = 1080, M = 72, ANCHO = W - 2 * M, LETRA = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    const lienzo = document.createElement('canvas'), g = lienzo.getContext('2d');
    const partir = (t, px, peso, ancho) => {
      g.font = peso + ' ' + px + 'px ' + LETRA;
      const pal = String(t).split(/\s+/), out = []; let l = '';
      for(const w of pal){ const p = l ? l + ' ' + w : w; if(g.measureText(p).width > ancho && l){ out.push(l); l = w; } else l = p; }
      if(l) out.push(l); return out;
    };
    const ops = []; let y = M;
    const texto = (t, px, peso, color, ancho = ANCHO, x = M, alto = 1.3) => {
      for(const l of partir(t, px, peso, ancho)){ y += px * alto; ops.push(['t', l, x, y, px, peso, color]); }
    };
    const linea = (grueso, color) => { y += 22; ops.push(['l', y, grueso, color]); y += 8; };
    texto(lugar(), 34, '900', '#C2410C');
    texto('Estado de cuenta', 56, '900', '#1A120C');
    y += 10;
    texto(c.alumno.nombre + (c.alumno.grupo ? ' · ' + c.alumno.grupo : '') + ' · código ' + c.alumno.codigo, 34, '700', '#1A120C');
    texto(cuando(c.hoy), 28, '500', '#6B5A4C');
    y += 18;
    if(!c.deuda) texto('No debe nada ✓', 76, '900', '#1F7A4D');
    else {
      texto('Debe ' + F.pesos(c.deuda), 92, '900', '#B3261E');
      if(c.desde) texto('Desde el ' + dia(c.desde) + (c.completo ? '' : ' (o antes)'), 30, '600', '#6B5A4C');
      linea(3, '#1A120C');
      for(const x of renglones(c)){
        const y0 = y;
        texto(x.que, 32, '700', '#1A120C', ANCHO - 220);
        texto(x.det, 26, '500', '#6B5A4C', ANCHO - 220);
        ops.push(['d', x.monto, W - M, y0 + 32 * 1.3, 34, '900', x.signo < 0 ? '#1F7A4D' : '#B3261E']);
        linea(1, '#E5D8C8');
      }
      const fila = (a, b, px, peso, color) => { y += px * 1.45; ops.push(['t', a, M, y, px, peso, color]); ops.push(['d', b, W - M, y, px, peso, color]); };
      fila('Se fió', F.pesos(c.cargado + c.sinDetalle), 32, '600', '#1A120C');
      fila('Abonado', F.pesos(c.abonado), 32, '600', '#1A120C');
      fila('Falta', F.pesos(c.deuda), 44, '900', '#B3261E');
      y += 30;
      texto('Se paga en la cooperativa. Cualquier duda, ahí mismo.', 28, '500', '#6B5A4C');
    }
    y += M;
    lienzo.width = W; lienzo.height = Math.ceil(y);
    g.fillStyle = '#FFFDF8'; g.fillRect(0, 0, W, lienzo.height);
    g.fillStyle = '#C2410C'; g.fillRect(0, 0, W, 14);
    g.textBaseline = 'alphabetic';
    for(const o of ops){
      if(o[0] === 'l'){ g.fillStyle = o[3]; g.fillRect(M, o[1], ANCHO, o[2]); continue; }
      g.font = o[5] + ' ' + o[4] + 'px ' + LETRA; g.fillStyle = o[6];
      g.textAlign = o[0] === 'd' ? 'right' : 'left';
      g.fillText(o[1], o[2], o[3] - o[4] * .22);
    }
    return await new Promise(ok => lienzo.toBlob(ok, 'image/png'));
  }

  function nombreArchivo(cod){
    const c = global.FADORI.estadoDeCuenta(cod);
    const n = String(c ? c.alumno.nombre : cod).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return 'estado-de-cuenta-' + (n || cod) + '.png';
  }

  function abrir(cod){
    estilos();
    const F = global.FADORI, c = F.estadoDeCuenta(cod); if(!c) return;
    const capa = document.createElement('dialog'); capa.className = 'fcons';
    capa.innerHTML = '<div class="fcons-in"><div class="fcons-cab"><h2>Estado de cuenta</h2>' +
      '<button class="fcons-x" type="button" aria-label="Cerrar">×</button></div>' +
      '<div class="fcons-ticket" id="fconsTicket">' + html(cod) + '</div>' +
      '<div class="fcons-acc">' +
        '<button class="fuerte" type="button" data-k="imagen">Mandar la imagen (para los papás)</button>' +
        '<button type="button" data-k="whats">Mandar por WhatsApp como texto</button>' +
        '<button type="button" data-k="copiar">Copiar el texto</button>' +
      '</div><div class="fcons-msg" role="status"></div></div>';
    const msg = capa.querySelector('.fcons-msg');
    const cerrar = () => { try{ capa.close(); }catch(e){} capa.remove(); };
    capa.querySelector('.fcons-x').addEventListener('click', cerrar);
    capa.addEventListener('click', (e) => { if(e.target === capa) cerrar(); });
    capa.addEventListener('close', () => capa.remove());
    capa.querySelector('[data-k="whats"]').addEventListener('click', () => {
      global.open('https://wa.me/?text=' + encodeURIComponent(F.constanciaTexto(cod)), '_blank', 'noopener');
    });
    capa.querySelector('[data-k="copiar"]').addEventListener('click', async () => {
      try{ await navigator.clipboard.writeText(F.constanciaTexto(cod)); msg.textContent = 'Copiado. Pégalo en el chat.'; }
      catch(e){ msg.textContent = 'No se pudo copiar en este aparato.'; }
    });
    capa.querySelector('[data-k="imagen"]').addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true; msg.textContent = 'Armando la imagen…';
      try{
        const blob = await imagen(cod);
        const archivo = new File([blob], nombreArchivo(cod), { type: 'image/png' });
        if(navigator.canShare && navigator.canShare({ files: [archivo] })){
          try{ await navigator.share({ files: [archivo], title: 'Estado de cuenta' }); msg.textContent = ''; }
          catch(er){ msg.textContent = er && er.name === 'AbortError' ? '' : 'No se pudo compartir.'; }
        } else {
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = archivo.name;
          document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          msg.textContent = 'Se bajó la imagen: mándala desde tus fotos.';
        }
      }catch(er){ msg.textContent = 'No se pudo armar la imagen.'; }
      b.disabled = false;
    });
    document.body.appendChild(capa);
    try{ capa.showModal(); }catch(e){ capa.setAttribute('open', ''); }
  }

  global.FadoriConstancia = { abrir, imagen, html };
})(typeof window !== 'undefined' ? window : globalThis);
