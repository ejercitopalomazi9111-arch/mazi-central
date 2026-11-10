/* INKWELL Studio · mesa de dibujo (al estilo de Krita o Procreate, en el teléfono).
   abrirDibujo({ ancho, alto, base, titulo }) → Promise<null | { blob, x, y, w, h }>
   - base: una imagen (Image o ImageBitmap) que entra como primera capa, para dibujar encima.
   - Lo que regresa es SÓLO lo dibujado, recortado a su contenido, con dónde quedó (x, y) en el lienzo.
   Herramientas: pincel, lápiz, marcador, aerógrafo, borrador, cubeta y gotero; tamaño, opacidad y
   color; presión del lápiz digital; capas (agregar, borrar, ocultar, opacidad, subir/bajar);
   deshacer y rehacer; acercar con dos dedos. */
import { icono } from '../iconos.js';

const CSS = `
.dj{position:fixed; inset:0; z-index:100; display:flex; flex-direction:column; background:#1a1720; color:#eee; font:15px/1.3 var(--sans, system-ui)}
.dj button{font:inherit; font-weight:600; color:#eee; background:#2a2633; border:1px solid #3a3545; border-radius:12px; min-height:44px; min-width:44px; padding:0 10px; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center; gap:6px; touch-action:manipulation; white-space:nowrap}
.dj button[aria-pressed="true"]{background:#AC27FF; border-color:#AC27FF; color:#fff}
.dj button[disabled]{opacity:.35}
.dj .ico{width:20px; height:20px}
.dj-barra{display:flex; align-items:center; gap:6px; padding:calc(6px + env(safe-area-inset-top)) 8px 6px; background:#211d28; border-bottom:1px solid #3a3545}
.dj-barra b{flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.dj-barra .listo{background:#AC27FF; border-color:#AC27FF; color:#fff}
.dj-mesa{flex:1; min-height:0; position:relative; overflow:hidden; touch-action:none;
  background:repeating-conic-gradient(#2c2836 0 25%, #24202d 0 50%) 0 0/24px 24px}
.dj-hoja{position:absolute; left:0; top:0; transform-origin:0 0; box-shadow:0 0 0 1px #000, 0 10px 40px rgba(0,0,0,.6);
  background:repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0/20px 20px}
.dj-hoja canvas{display:block; width:100%; height:100%}
.dj-herr{display:flex; gap:6px; overflow-x:auto; padding:6px 8px; background:#211d28; border-top:1px solid #3a3545; scrollbar-width:none}
.dj-herr::-webkit-scrollbar{display:none}
.dj-herr button{flex:none; flex-direction:column; gap:2px; min-width:60px; min-height:54px; font-size:11px}
.dj-ajustes{display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; padding:6px 10px calc(8px + env(safe-area-inset-bottom)); background:#211d28}
.dj-ajustes label{display:flex; align-items:center; gap:6px; font-size:12px; color:#bbb}
.dj-ajustes input[type=range]{width:110px; accent-color:#AC27FF}
.dj-ajustes input[type=color]{width:44px; height:44px; border:1px solid #3a3545; border-radius:12px; padding:2px; background:#2a2633}
.dj-muestras{display:flex; gap:4px; flex-wrap:wrap}
.dj-muestras button{min-width:28px; min-height:28px; width:28px; height:28px; padding:0; border-radius:50%; border:2px solid #3a3545}
.dj-capas{position:absolute; right:8px; top:8px; width:min(260px, calc(100% - 16px)); max-height:calc(100% - 16px); overflow:auto; background:#211d28ee; border:1px solid #3a3545; border-radius:14px; padding:8px; display:flex; flex-direction:column; gap:6px}
.dj-capas[hidden]{display:none}
.dj-capa{display:grid; grid-template-columns:40px minmax(0,1fr) 44px; align-items:center; gap:6px; padding:4px; border-radius:10px; border:1px solid #3a3545; cursor:pointer}
.dj-capa[aria-current="true"]{border-color:#AC27FF; background:#2a1838}
.dj-capa canvas{width:40px; height:40px; background:#fff; border-radius:6px}
.dj-capa span{font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
`;

const HERRAMIENTAS = [['pincel', 'Pincel', 'pen-tool'], ['lapiz', 'Lápiz', 'pen-tool'], ['marcador', 'Marcador', 'bookmark'], ['aero', 'Aerógrafo', 'sparkles'],
  ['borrador', 'Borrador', 'x'], ['cubeta', 'Cubeta', 'layers'], ['gotero', 'Gotero', 'search']];
const MUESTRAS = ['#111111', '#ffffff', '#e11d48', '#f97316', '#facc15', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#8b5a2b', '#f2c9a0', '#6b7280'];

export function abrirDibujo({ ancho = 1024, alto = 1024, base = null, titulo = 'Mesa de dibujo', guia = null } = {}){
  if(!document.getElementById('dj-css')){ const st = document.createElement('style'); st.id = 'dj-css'; st.textContent = CSS; document.head.append(st); }
  return new Promise((resolver) => {
    const raiz = document.createElement('div'); raiz.className = 'dj'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-label', titulo);
    raiz.innerHTML = `
      <div class="dj-barra"><button type="button" data-a="cancelar" aria-label="Salir sin guardar">${icono('x')}</button><b>${titulo}</b>
        <button type="button" data-a="deshacer" aria-label="Deshacer"><span style="display:inline-flex; transform:scaleX(-1)">${icono('refresh-cw')}</span></button><button type="button" data-a="rehacer" aria-label="Rehacer">${icono('refresh-cw')}</button>
        <button type="button" data-a="capas" aria-label="Capas">${icono('library')}</button><button type="button" class="listo" data-a="listo">Listo</button></div>
      <div class="dj-mesa"><div class="dj-hoja"><canvas></canvas></div><div class="dj-capas" hidden></div></div>
      <div class="dj-herr" role="toolbar" aria-label="Herramientas">${HERRAMIENTAS.map(([k, n, ic]) => `<button type="button" data-h="${k}" aria-pressed="${k === 'pincel'}">${icono(ic)}${n}</button>`).join('')}
        <button type="button" data-a="centrar">${icono('compass')}Encuadrar</button></div>
      <div class="dj-ajustes">
        <input type="color" value="#111111" aria-label="Color" data-c="color">
        <div class="dj-muestras">${MUESTRAS.map((m) => `<button type="button" data-m="${m}" style="background:${m}" aria-label="Color ${m}"></button>`).join('')}</div>
        <label>Tamaño<input type="range" min="1" max="120" value="12" data-c="tam"></label>
        <label>Opacidad<input type="range" min="5" max="100" value="100" data-c="opac"></label>
      </div>`;
    document.body.append(raiz);
    const $ = (s) => raiz.querySelector(s);
    const vista = $('.dj-hoja canvas'), vctx = vista.getContext('2d');
    vista.width = ancho; vista.height = alto;
    const hoja = $('.dj-hoja'), mesa = $('.dj-mesa');
    hoja.style.width = ancho + 'px'; hoja.style.height = alto + 'px';
    const nuevaCapa = (nombre) => { const c = document.createElement('canvas'); c.width = ancho; c.height = alto; return { c, x: c.getContext('2d', { willReadFrequently: true }), nombre, visible: true, opac: 1 }; };
    const capas = [];
    if(base){ const b = nuevaCapa('Imagen'); b.x.drawImage(base, 0, 0, ancho, alto); capas.push(b); }
    capas.push(nuevaCapa(`Capa ${capas.length + 1}`));
    let activa = capas.length - 1, herr = 'pincel', color = '#111111', tam = 12, opac = 1;
    const pasado = [], futuro = [];

    /* ── componer y encuadrar ── */
    /* la guía (la página de abajo) se ve tenue mientras dibujas, pero no sale en el resultado */
    if(guia){ hoja.style.backgroundImage = `url(${guia.toDataURL('image/jpeg', .7)})`; hoja.style.backgroundSize = '100% 100%'; hoja.style.opacity = 1; }
    function componer(){
      vctx.clearRect(0, 0, ancho, alto);
      for(const k of capas){ if(!k.visible) continue; vctx.globalAlpha = k.opac; vctx.drawImage(k.c, 0, 0); }
      vctx.globalAlpha = 1;
    }
    let esc = 1, tx = 0, ty = 0;
    const aplicar = () => { hoja.style.transform = `translate(${tx}px,${ty}px) scale(${esc})`; };
    function centrar(){ const r = mesa.getBoundingClientRect(); esc = Math.min((r.width - 24) / ancho, (r.height - 24) / alto); tx = (r.width - ancho * esc) / 2; ty = (r.height - alto * esc) / 2; aplicar(); }
    const aHoja = (e) => { const r = mesa.getBoundingClientRect(); return { x: (e.clientX - r.left - tx) / esc, y: (e.clientY - r.top - ty) / esc }; };

    /* ── deshacer: se guarda la capa antes de cada trazo ── */
    function guardarPaso(){ const k = capas[activa]; pasado.push({ i: activa, img: k.x.getImageData(0, 0, ancho, alto) }); if(pasado.length > 30) pasado.shift(); futuro.length = 0; botones(); }
    function botones(){ $('[data-a="deshacer"]').disabled = !pasado.length; $('[data-a="rehacer"]').disabled = !futuro.length; }
    function volver(de, a){ const p = de.pop(); if(!p || !capas[p.i]) return; const k = capas[p.i]; a.push({ i: p.i, img: k.x.getImageData(0, 0, ancho, alto) }); k.x.putImageData(p.img, 0, 0); componer(); pintarCapas(); botones(); }

    /* ── pinceles ── */
    function punta(ctx, x, y, r){
      if(herr === 'aero'){ const n = Math.max(6, r * 1.2); for(let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, d = Math.random() * r; ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.4, 1.4); } return; }
      ctx.beginPath(); ctx.arc(x, y, Math.max(.5, r / 2), 0, Math.PI * 2); ctx.fill();
    }
    function estilo(ctx){
      ctx.globalCompositeOperation = herr === 'borrador' ? 'destination-out' : 'source-over';
      ctx.fillStyle = ctx.strokeStyle = color;
      ctx.globalAlpha = herr === 'marcador' ? Math.min(opac, .45) : herr === 'aero' ? Math.min(opac, .35) : opac;
    }
    const radio = (e) => { const p = e.pointerType === 'pen' ? Math.max(.1, e.pressure || .5) : 1; return (herr === 'lapiz' ? Math.max(1, tam * .35) : tam) * (e.pointerType === 'pen' ? .3 + p * 1.2 : 1); };
    let trazo = null;
    function empezar(e){
      const q = aHoja(e), k = capas[activa];
      if(herr === 'gotero'){ const d = vctx.getImageData(Math.round(q.x), Math.round(q.y), 1, 1).data; if(d[3]){ color = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''); $('[data-c="color"]').value = color; } return; }
      if(!k.visible){ return; }
      guardarPaso();
      if(herr === 'cubeta'){ rellenar(k.x, Math.round(q.x), Math.round(q.y)); componer(); pintarCapas(); return; }
      trazo = { ultimo: q, medio: q };
      estilo(k.x); punta(k.x, q.x, q.y, radio(e)); componer();
    }
    function seguir(e){
      if(!trazo) return; const k = capas[activa], q = aHoja(e), r = radio(e);
      const a = trazo.ultimo, dist = Math.hypot(q.x - a.x, q.y - a.y), paso = Math.max(1, r / 4);
      estilo(k.x);
      if(herr === 'aero'){ for(let t = paso; t <= dist; t += paso * 2) punta(k.x, a.x + (q.x - a.x) * t / dist, a.y + (q.y - a.y) * t / dist, r); }
      else {
        /* línea suave entre puntos medios: así el trazo no sale quebrado */
        const m = { x: (a.x + q.x) / 2, y: (a.y + q.y) / 2 };
        k.x.lineCap = 'round'; k.x.lineJoin = 'round'; k.x.lineWidth = r;
        k.x.beginPath(); k.x.moveTo(trazo.medio.x, trazo.medio.y); k.x.quadraticCurveTo(a.x, a.y, m.x, m.y); k.x.stroke();
        trazo.medio = m;
      }
      trazo.ultimo = q; componer();
    }
    function terminar(){ if(!trazo) return; trazo = null; capas[activa].x.globalCompositeOperation = 'source-over'; capas[activa].x.globalAlpha = 1; pintarCapas(); }
    function rellenar(ctx, x0, y0){
      if(x0 < 0 || y0 < 0 || x0 >= ancho || y0 >= alto) return;
      const img = ctx.getImageData(0, 0, ancho, alto), d = img.data, i0 = (y0 * ancho + x0) * 4;
      const ref = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]], n = parseInt(color.slice(1), 16), nuevo = [n >> 16 & 255, n >> 8 & 255, n & 255, Math.round(opac * 255)];
      if(ref.every((v, j) => Math.abs(v - nuevo[j]) < 2)) return;
      const tol = 40, igual = (i) => Math.abs(d[i] - ref[0]) <= tol && Math.abs(d[i + 1] - ref[1]) <= tol && Math.abs(d[i + 2] - ref[2]) <= tol && Math.abs(d[i + 3] - ref[3]) <= tol;
      const visto = new Uint8Array(ancho * alto), pila = [x0, y0];
      while(pila.length){
        const y = pila.pop(), x = pila.pop(); let xi = x;
        while(xi >= 0 && !visto[y * ancho + xi] && igual((y * ancho + xi) * 4)) xi--;
        xi++; let arriba = false, abajo = false;
        while(xi < ancho && !visto[y * ancho + xi] && igual((y * ancho + xi) * 4)){
          const p = y * ancho + xi, i = p * 4; visto[p] = 1; d[i] = nuevo[0]; d[i + 1] = nuevo[1]; d[i + 2] = nuevo[2]; d[i + 3] = nuevo[3];
          if(y > 0){ const s = !visto[p - ancho] && igual((p - ancho) * 4); if(s && !arriba){ pila.push(xi, y - 1); arriba = true; } else if(!s) arriba = false; }
          if(y < alto - 1){ const s = !visto[p + ancho] && igual((p + ancho) * 4); if(s && !abajo){ pila.push(xi, y + 1); abajo = true; } else if(!s) abajo = false; }
          xi++;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    /* ── dedos: uno dibuja, dos acercan y mueven ── */
    const dedos = new Map(); let pellizco = null;
    mesa.addEventListener('pointerdown', (e) => {
      if(e.target.closest('.dj-capas')) return;
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY }); try{ mesa.setPointerCapture(e.pointerId); }catch{}
      if(dedos.size === 2){
        if(trazo){ terminar(); volver(pasado, futuro); futuro.length = 0; botones(); }   // el primer dedo no era trazo: era el principio del pellizco
        const [a, b] = [...dedos.values()]; pellizco = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, esc, tx, ty };
      } else if(dedos.size === 1) empezar(e);
    });
    mesa.addEventListener('pointermove', (e) => {
      if(!dedos.has(e.pointerId)) return; dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if(pellizco && dedos.size >= 2){
        const [a, b] = [...dedos.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, r = mesa.getBoundingClientRect();
        const ne = Math.min(12, Math.max(.1, pellizco.esc * d / pellizco.d));
        tx = cx - r.left - (pellizco.cx - r.left - pellizco.tx) * ne / pellizco.esc; ty = cy - r.top - (pellizco.cy - r.top - pellizco.ty) * ne / pellizco.esc; esc = ne; aplicar();
      } else seguir(e);
    });
    const soltar = (e) => { dedos.delete(e.pointerId); if(dedos.size < 2) pellizco = null; if(!dedos.size) terminar(); };
    mesa.addEventListener('pointerup', soltar); mesa.addEventListener('pointercancel', soltar);
    mesa.addEventListener('wheel', (e) => { e.preventDefault(); const r = mesa.getBoundingClientRect(), ne = Math.min(12, Math.max(.1, esc * (e.deltaY < 0 ? 1.1 : .9))); tx = e.clientX - r.left - (e.clientX - r.left - tx) * ne / esc; ty = e.clientY - r.top - (e.clientY - r.top - ty) * ne / esc; esc = ne; aplicar(); }, { passive: false });

    /* ── capas ── */
    function pintarCapas(){
      const caja = $('.dj-capas'); if(caja.hidden) return;
      caja.innerHTML = `<div style="display:flex; gap:6px"><button type="button" data-k="nueva">${icono('plus')}Capa</button><button type="button" data-k="borrar" ${capas.length < 2 ? 'disabled' : ''}>Borrar</button></div>`
        + [...capas.keys()].reverse().map((i) => `<div class="dj-capa" data-i="${i}" aria-current="${i === activa}"><canvas width="40" height="40"></canvas><span>${capas[i].nombre}</span><button type="button" data-k="ver" aria-label="${capas[i].visible ? 'Ocultar' : 'Mostrar'}">${capas[i].visible ? 'Ver' : 'Oculta'}</button></div>`).join('')
        + `<label style="font-size:12px; color:#bbb">Opacidad de la capa<input type="range" min="0" max="100" value="${Math.round(capas[activa].opac * 100)}" data-k="opac" style="width:100%; accent-color:#AC27FF"></label>
           <div style="display:flex; gap:6px"><button type="button" data-k="subir">Subir</button><button type="button" data-k="bajar">Bajar</button></div>`;
      caja.querySelectorAll('.dj-capa').forEach((f) => { const m = f.querySelector('canvas').getContext('2d'); m.drawImage(capas[+f.dataset.i].c, 0, 0, 40, 40); });
    }
    $('.dj-capas').addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'), f = e.target.closest('.dj-capa');
      if(b?.dataset.k === 'nueva'){ capas.splice(activa + 1, 0, nuevaCapa(`Capa ${capas.length + 1}`)); activa++; }
      else if(b?.dataset.k === 'borrar' && capas.length > 1){ capas.splice(activa, 1); activa = Math.max(0, activa - 1); pasado.length = futuro.length = 0; botones(); }
      else if(b?.dataset.k === 'ver'){ const k = capas[+f.dataset.i]; k.visible = !k.visible; }
      else if(b?.dataset.k === 'subir' && activa < capas.length - 1){ [capas[activa], capas[activa + 1]] = [capas[activa + 1], capas[activa]]; activa++; pasado.length = futuro.length = 0; botones(); }
      else if(b?.dataset.k === 'bajar' && activa > 0){ [capas[activa], capas[activa - 1]] = [capas[activa - 1], capas[activa]]; activa--; pasado.length = futuro.length = 0; botones(); }
      else if(f && !b) activa = +f.dataset.i;
      else return;
      componer(); pintarCapas();
    });
    $('.dj-capas').addEventListener('input', (e) => { if(e.target.dataset.k === 'opac'){ capas[activa].opac = e.target.value / 100; componer(); } });

    /* ── barra, herramientas y ajustes ── */
    function cerrar(r){ raiz.remove(); removeEventListener('resize', centrar); resolver(r); }
    raiz.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if(!b) return;
      if(b.dataset.h){ herr = b.dataset.h; raiz.querySelectorAll('[data-h]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
      else if(b.dataset.m){ color = b.dataset.m; $('[data-c="color"]').value = color; if(herr === 'borrador' || herr === 'gotero'){ herr = 'pincel'; raiz.querySelectorAll('[data-h]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.h === 'pincel'))); } }
      else if(b.dataset.a === 'deshacer') volver(pasado, futuro);
      else if(b.dataset.a === 'rehacer') volver(futuro, pasado);
      else if(b.dataset.a === 'capas'){ const c = $('.dj-capas'); c.hidden = !c.hidden; pintarCapas(); }
      else if(b.dataset.a === 'centrar') centrar();
      else if(b.dataset.a === 'cancelar'){ if(!pasado.length || confirm('¿Salir sin guardar lo que dibujaste?')) cerrar(null); }
      else if(b.dataset.a === 'listo'){
        componer();
        /* se recorta a lo dibujado: así el personaje o el objeto entra al cómic sin un cuadro vacío alrededor */
        const d = vctx.getImageData(0, 0, ancho, alto).data; let x0 = ancho, y0 = alto, x1 = -1, y1 = -1;
        for(let y = 0; y < alto; y++) for(let x = 0; x < ancho; x++) if(d[(y * ancho + x) * 4 + 3] > 8){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
        if(x1 < 0){ cerrar(null); return; }
        const w = x1 - x0 + 1, h = y1 - y0 + 1, c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(vista, x0, y0, w, h, 0, 0, w, h);
        const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
        cerrar({ blob, x: x0, y: y0, w, h });
      }
    });
    raiz.addEventListener('input', (e) => { const c = e.target.dataset.c; if(c === 'color') color = e.target.value; if(c === 'tam') tam = +e.target.value; if(c === 'opac') opac = e.target.value / 100; });
    addEventListener('resize', centrar);
    componer(); botones(); requestAnimationFrame(centrar);
    raiz.__dj = { capas: () => capas, herr: () => herr };
  });
}
