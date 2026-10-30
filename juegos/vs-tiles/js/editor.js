/* EL EDITOR DE NIVELES (Carlos, 30 oct: «el apartado de crear tu nivel a mano como geometry dash y el de subir
   para la comunidad»). Una cuadrícula de cinco carriles que corre hacia arriba como la pista: se toca un hueco y
   ahí queda la nota, pegada al golpe más cercano de la canción. Se escucha con las notas sonando, se prueba en el
   juego de verdad y se comparte con un código que cabe en un mensaje de WhatsApp (nada pasa por un servidor:
   el nivel viaja DENTRO del código). */

const COLS = ['#FF3D8B', '#B44BFF', '#38E1FF', '#B44BFF', '#FF3D8B'];
const TIPOS = { toque: 'tap', mantener: 'hold', deslizar: 'flick' };
const FLECHAS = { 0: '↑', 1: '↗', 2: '→', 6: '←', 7: '↖', 4: '↓' };

/* el código: [segundos en ms, columna, tipo, extra] comprimido y en base64 de URL */
const aB64 = (u8) => { let s = ''; u8.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const deB64 = (t) => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
async function flujo(u8, Clase, modo){ const s = new Blob([u8]).stream().pipeThrough(new Clase(modo)); return new Uint8Array(await new Response(s).arrayBuffer()); }
export async function aCodigo(nv){
  const d = { v: 1, c: nv.c, ti: nv.titulo, a: nv.autor, n: nv.notas.map(n => [Math.round(n.t * 1000), n.c, n.tipo === 'hold' ? 1 : n.tipo === 'flick' ? 2 : 0, n.tipo === 'hold' ? Math.round((n.fin - n.t) * 1000) : n.tipo === 'flick' ? n.dir || 0 : 0]) };
  const crudo = new TextEncoder().encode(JSON.stringify(d));
  if(typeof CompressionStream === 'function'){ try{ return 'VST1z.' + aB64(await flujo(crudo, CompressionStream, 'deflate-raw')); }catch(e){} }
  return 'VST1.' + aB64(crudo); }
export async function deCodigo(codigo){
  const m = String(codigo).trim().match(/VST1(z?)\.([A-Za-z0-9_-]+)/); if(!m) throw new Error('Ese no es un código de nivel.');
  let u8 = deB64(m[2]); if(m[1]) u8 = await flujo(u8, DecompressionStream, 'deflate-raw');
  const d = JSON.parse(new TextDecoder().decode(u8)); if(d.v !== 1 || !Array.isArray(d.n)) throw new Error('Ese código está roto.');
  return { c: String(d.c), titulo: String(d.ti || 'Sin nombre').slice(0, 40), autor: String(d.a || 'Anónimo').slice(0, 16),
    notas: d.n.slice(0, 4000).map(([ms, c, ti, ex]) => { const t = ms / 1000, n = { t, c: Math.max(0, Math.min(4, c | 0)), tipo: ['tap', 'hold', 'flick'][ti] || 'tap' };
      if(n.tipo === 'hold') n.fin = t + Math.max(100, ex) / 1000; if(n.tipo === 'flick') n.dir = ex | 0; return n; }) }; }

export function montarEditor({ $, Y, CANCIONES, datos, audio, reloj, sonidos, guardar, aviso, mostrar, esc, jugarNivel }){
  const lienzo = $('#edLienzo'), x = lienzo.getContext('2d');
  let nv = null, an = null, buf = null, cursor = 0, zoom = 160, snap = 2, herr = 'toque', dir = 0, tocando = false, rejilla = [], deshacer = [];
  let W = 0, H = 0, dpr = 1, ultimoSonado = -1, animando = 0;
  Y.niveles ||= [];

  /* ── la lista: mis niveles, los que me pasaron y las dos puertas (nuevo, pegar código) ── */
  function lista(msg){
    mostrar('niveles'); const L = $('#nivLista'); L.innerHTML = '';
    const mios = Y.niveles.filter(n => !n.de), ajenos = Y.niveles.filter(n => n.de);
    const fila = (n) => { const c = CANCIONES.find(x => x.id === n.c), b = document.createElement('div'); b.className = 'fila nivel';
      b.innerHTML = `<div><b>${esc(n.titulo)}</b><span>${c ? esc(c.titulo) : 'Canción que no tienes'} · ${n.notas.length} notas${n.de ? ' · de ' + esc(n.de) : ''}</span></div>
        <div class="acc"><button class="b chico" data-a="jugar">▶</button>${n.de ? '' : '<button class="b chico" data-a="editar">✎</button><button class="b chico" data-a="compartir">Compartir</button>'}<button class="b chico" data-a="quitar">✕</button></div>`;
      b.onclick = async (e) => { const a = e.target.dataset?.a; if(!a) return;
        if(!c && a !== 'quitar'){ aviso('Ese nivel es de una canción que no está en tu teléfono. Métela en «Mi música» con el mismo archivo.'); return; }
        if(a === 'jugar') jugarNivel(n); if(a === 'editar') abrir(n); if(a === 'compartir') compartir(n);
        if(a === 'quitar'){ if(b.dataset.seguro){ Y.niveles = Y.niveles.filter(x => x !== n); guardar(); lista(); } else { b.dataset.seguro = 1; e.target.textContent = '¿Seguro?'; } } };
      return b; };
    const h = (t) => { const e = document.createElement('h4'); e.className = 'ojo grupo'; e.textContent = t; L.appendChild(e); };
    h(`Mis niveles · ${mios.length}`); mios.forEach(n => L.appendChild(fila(n)));
    if(!mios.length){ const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'Todavía no haces ninguno. Toca «Nuevo nivel».'; L.appendChild(p); }
    h(`De la comunidad · ${ajenos.length}`); ajenos.forEach(n => L.appendChild(fila(n)));
    if(!ajenos.length){ const p = document.createElement('p'); p.className = 'sub'; p.textContent = 'Cuando alguien te pase un código o un enlace de nivel, aparece aquí.'; L.appendChild(p); }
    $('#nivMsg').textContent = msg || '';
  }
  async function nuevo(){ const c = CANCIONES.find(x => x.id === $('#nivCancion').value) || CANCIONES[0];
    abrir({ id: Date.now().toString(36), titulo: 'Mi nivel ' + (Y.niveles.filter(n => !n.de).length + 1), c: c.id, autor: Y.nombre || 'Anónimo', notas: [] }); }
  async function pegar(){ const campo = $('#nivCodigo'); try{ const d = await deCodigo(campo.value); importar(d); campo.value = ''; }catch(e){ $('#nivMsg').textContent = e.message || 'No se pudo leer el código.'; } }
  function importar(d){ const ya = Y.niveles.find(n => n.de && n.titulo === d.titulo && n.de === d.autor && n.c === d.c);
    if(ya) ya.notas = d.notas; else Y.niveles.push({ id: Date.now().toString(36), titulo: d.titulo, c: d.c, de: d.autor, notas: d.notas });
    guardar(); lista(`Llegó «${d.titulo}» de ${d.autor}.`); }
  async function compartir(n){ const codigo = await aCodigo(n), url = `${location.origin}${location.pathname}#nivel=${codigo}`;
    const texto = `Juega mi nivel «${n.titulo}» en VS TILES: ${url}`;
    try{ if(navigator.share){ await navigator.share({ title: 'VS TILES', text: texto }); return; } }catch(e){ if(e.name === 'AbortError') return; }
    try{ await navigator.clipboard.writeText(texto); aviso('Copiado. Pégalo en WhatsApp o donde quieras.'); }catch(e){ $('#nivCodigo').value = codigo; aviso('Copia el código de la caja.'); } }

  /* ── la mesa de trabajo ── */
  async function abrir(n){
    nv = JSON.parse(JSON.stringify(n)); deshacer = [];
    const c = CANCIONES.find(x => x.id === nv.c); if(!c){ aviso('No encuentro esa canción.'); return; }
    mostrar('editor'); $('#edTitulo').value = nv.titulo; $('#edCancion').textContent = c.titulo; $('#edEstado').textContent = 'Cargando la canción…';
    [an, buf] = await Promise.all([datos(c.id), audio(c.id)]);
    const g = an.golpes, beat = g.length > 1 ? (g[g.length - 1] - g[0]) / (g.length - 1) : .5; nv.beat = beat; nv.g0 = g[0] || 0;
    armarRejilla(); cursor = Math.max(0, (nv.notas[0]?.t || nv.g0) - 1); medir(); herramienta(herr); estado(); pintar(); }
  function armarRejilla(){ rejilla = []; const paso = nv.beat / snap; for(let t = nv.g0 % paso, k = 0; t < an.dur; t += paso, k++){
    const enBeat = Math.abs(((t - nv.g0) / nv.beat) - Math.round((t - nv.g0) / nv.beat)) < .01, b = Math.round((t - nv.g0) / nv.beat); rejilla.push({ t, fuerte: enBeat && b % 4 === 0, beat: enBeat, compas: Math.floor(b / 4) + 1 }); } }
  const pegado = (t) => { let mejor = rejilla[0]?.t ?? t; for(const r of rejilla){ if(Math.abs(r.t - t) < Math.abs(mejor - t)) mejor = r.t; if(r.t > t + 1) break; } return mejor; };
  function medir(){ dpr = Math.min(2, devicePixelRatio || 1); const r = lienzo.getBoundingClientRect(); W = r.width; H = r.height; lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr); }
  /* dónde queda cada cosa: la línea de golpe abajo, el futuro arriba, cinco columnas y la regla a la derecha */
  const REGLA = 44, linea = () => H * .82, colX = (c) => ((W - REGLA) / 5) * (c + .5), anchoCol = () => (W - REGLA) / 5;
  const yDe = (t) => linea() - (t - cursor) * zoom, tDe = (y) => cursor + (linea() - y) / zoom;
  function estado(){ $('#edEstado').textContent = `${nv.notas.length} notas · compás ${Math.floor(Math.max(0, cursor - nv.g0) / nv.beat / 4) + 1} · ${fmt(cursor)}`; }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function pintar(){
    if(!nv || !an) return; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    x.fillStyle = '#0B0614'; x.fillRect(0, 0, W, H);
    const ac = anchoCol();
    for(let c = 0; c < 5; c++){ x.fillStyle = c % 2 ? '#ffffff06' : '#ffffff0c'; x.fillRect(c * ac, 0, ac, H); }
    /* la rejilla: los compases fuertes con su número, los golpes medianos, las subdivisiones tenues */
    const t0 = tDe(H), t1 = tDe(0);
    for(const r of rejilla){ if(r.t < t0 - .1) continue; if(r.t > t1 + .1) break; const y = yDe(r.t);
      x.fillStyle = r.fuerte ? '#ffffff55' : r.beat ? '#ffffff26' : '#ffffff10'; x.fillRect(0, Math.round(y), W - REGLA, r.fuerte ? 2 : 1);
      if(r.fuerte){ x.fillStyle = '#ffffff88'; x.font = '700 11px Orbitron, sans-serif'; x.textAlign = 'center'; x.fillText(String(r.compas), W - REGLA / 2, y + 4); } }
    /* la regla: la energía de la canción, para ver dónde viene lo fuerte */
    x.fillStyle = '#ffffff08'; x.fillRect(W - REGLA, 0, REGLA, H);
    if(an.energia?.length){ const n = an.energia.length; x.fillStyle = '#B44BFF55'; for(let y = 0; y < H; y += 3){ const t = tDe(y); if(t < 0 || t > an.dur) continue; const e = an.energia[Math.min(n - 1, Math.floor(t / an.dur * n))] || 0; x.fillRect(W - 6 - e * (REGLA - 12), y, e * (REGLA - 12), 2); } }
    /* las notas */
    for(const n of nv.notas){ const y = yDe(n.t); if(y < -40 || (n.fin ? yDe(n.fin) > H + 40 : y > H + 40)) continue; const cx = colX(n.c), col = COLS[n.c];
      if(n.tipo === 'hold'){ const yf = yDe(n.fin); x.fillStyle = col + '88'; x.fillRect(cx - ac * .18, yf, ac * .36, y - yf); x.fillStyle = '#fff'; x.fillRect(cx - ac * .3, yf - 3, ac * .6, 6); }
      x.fillStyle = col; rect(cx - ac * .4, y - 9, ac * .8, 18, 6); x.fill(); x.strokeStyle = '#ffffffcc'; x.lineWidth = 2; x.stroke();
      if(n.tipo === 'flick'){ x.fillStyle = '#fff'; x.font = '900 16px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(FLECHAS[n.dir] || '↑', cx, y + 1); x.textBaseline = 'alphabetic'; } }
    /* la línea de golpe */
    x.fillStyle = '#FFF3B0'; x.fillRect(0, linea() - 1.5, W - REGLA, 3); x.fillStyle = '#FFF3B0'; x.font = '700 10px Orbitron, sans-serif'; x.textAlign = 'left'; x.fillText(fmt(cursor), 6, linea() + 16);
  }
  const rect = (a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };

  /* ── tocar la mesa: arrastrar mueve la canción; un toque pone o quita; jalar la punta de una larga la estira ── */
  let dedo = null;
  lienzo.addEventListener('pointerdown', (e) => { if(!nv) return; const r = lienzo.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    lienzo.setPointerCapture?.(e.pointerId);
    const punta = px < W - REGLA && nv.notas.find(n => n.tipo === 'hold' && Math.abs(colX(n.c) - px) < anchoCol() / 2 && Math.abs(yDe(n.fin) - py) < 16);
    dedo = { id: e.pointerId, x0: px, y0: py, c0: cursor, t0: performance.now(), movio: false, punta, regla: px >= W - REGLA }; });
  lienzo.addEventListener('pointermove', (e) => { if(!dedo || e.pointerId !== dedo.id) return; const r = lienzo.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    if(Math.hypot(px - dedo.x0, py - dedo.y0) > 10) dedo.movio = true; if(!dedo.movio) return;
    if(dedo.punta){ if(!dedo.guardado){ recordar(); dedo.guardado = true; } dedo.punta.fin = Math.max(dedo.punta.t + nv.beat / snap, pegado(tDe(py))); }
    else { parar(); cursor = Math.max(0, Math.min(an.dur, dedo.c0 + (py - dedo.y0) / zoom * (dedo.regla ? 4 : 1))); estado(); }
    pintar(); });
  lienzo.addEventListener('pointerup', (e) => { if(!dedo || e.pointerId !== dedo.id) return; const d = dedo; dedo = null; if(d.movio || d.regla) return;
    const col = Math.floor(d.x0 / anchoCol()); if(col < 0 || col > 4) return; const t = tDe(d.y0);
    /* se busca la nota en el MISMO hueco de la rejilla al que caería el toque, no sólo a 14 px: con la nota pegada al golpe puede quedar más lejos del dedo */
    const tp0 = pegado(t), toca = nv.notas.find(n => n.c === col && (Math.abs(n.t - tp0) < .002 || Math.abs(yDe(n.t) - d.y0) < 14 || n.tipo === 'hold' && t > n.t && t < n.fin));
    recordar();
    if(toca) nv.notas = nv.notas.filter(n => n !== toca);
    else { const tp = pegado(t); if(tp < .3 || tp > an.dur - .3) return; const n = { t: tp, c: col, tipo: TIPOS[herr] };
      if(n.tipo === 'hold') n.fin = Math.min(an.dur - .2, tp + nv.beat); if(n.tipo === 'flick') n.dir = dir;
      nv.notas.push(n); nv.notas.sort((a, b) => a.t - b.t || a.c - b.c); if(sonidos.golpe) reloj.golpe(sonidos.golpe, .35); }
    estado(); pintar(); });
  lienzo.addEventListener('wheel', (e) => { e.preventDefault(); if(!nv) return; parar(); cursor = Math.max(0, Math.min(an.dur, cursor - e.deltaY / zoom)); estado(); pintar(); }, { passive: false });
  const recordar = () => { deshacer.push(JSON.stringify(nv.notas)); if(deshacer.length > 60) deshacer.shift(); };

  /* ── escuchar: la canción desde donde está la línea, y cada nota suena al pasar ── */
  async function escuchar(){ if(tocando){ parar(); return; } await reloj.despertar(); reloj.pararFondo(.2); reloj.tocar(buf, { desde: cursor, espera: .12 }); tocando = true; ultimoSonado = cursor; $('#edPlay').textContent = '⏸';
    const vuelta = () => { if(!tocando) return; cursor = Math.min(an.dur, reloj.ahora());
      for(const n of nv.notas){ if(n.t > ultimoSonado && n.t <= cursor && sonidos.golpe) reloj.golpe(sonidos.golpe, .4); } ultimoSonado = cursor;
      if(cursor >= an.dur - .05) parar(); estado(); pintar(); animando = requestAnimationFrame(vuelta); }; vuelta(); }
  function parar(){ if(!tocando) return; tocando = false; reloj.parar(); cancelAnimationFrame(animando); $('#edPlay').textContent = '▶'; }
  function herramienta(h){ herr = h; document.querySelectorAll('#edHerr [data-h]').forEach(b => b.classList.toggle('si', b.dataset.h === h)); $('#edDir').hidden = h !== 'deslizar'; }
  function guardarNivel(){ nv.titulo = ($('#edTitulo').value || 'Mi nivel').trim().slice(0, 40); const limpio = { id: nv.id, titulo: nv.titulo, c: nv.c, autor: Y.nombre || 'Anónimo', notas: nv.notas.map(n => ({ ...n })) };
    const i = Y.niveles.findIndex(n => n.id === nv.id); if(i >= 0) Y.niveles[i] = limpio; else Y.niveles.push(limpio); guardar(); return limpio; }

  /* los botones */
  $('#edPlay').onclick = escuchar;
  document.querySelectorAll('#edHerr [data-h]').forEach(b => b.onclick = () => herramienta(b.dataset.h));
  document.querySelectorAll('#edDir [data-d]').forEach(b => b.onclick = () => { dir = +b.dataset.d; document.querySelectorAll('#edDir [data-d]').forEach(o => o.classList.toggle('si', o === b)); });
  $('#edSnap').onclick = () => { snap = { 1: 2, 2: 4, 4: 1 }[snap]; $('#edSnap').textContent = `1/${snap}`; armarRejilla(); pintar(); };
  $('#edZoom').onclick = () => { zoom = { 110: 160, 160: 240, 240: 110 }[zoom]; pintar(); };
  $('#edDeshacer').onclick = () => { const a = deshacer.pop(); if(a){ nv.notas = JSON.parse(a); estado(); pintar(); } };
  $('#edProbar').onclick = () => { parar(); const n = guardarNivel(); /* desde el principio, salvo que estés muy adentro de la canción: entonces desde un poco antes de la línea (como el «start pos» de Geometry Dash) */
    jugarNivel(n, cursor > 8 ? Math.max(0, cursor - 2) : null); };
  $('#edSalir').onclick = () => { parar(); guardarNivel(); lista('Guardado.'); };
  $('#nivNuevo').onclick = nuevo; $('#nivPegar').onclick = pegar;
  /* la cuadrícula cambia de alto cuando aparece o se va la fila de flechas: si no se vuelve a medir, los toques
     caen corridos respecto a lo que se ve (se ponía una nota nueva al querer quitar otra) */
  new ResizeObserver(() => { if(nv && document.querySelector('#editor.vis')){ medir(); pintar(); } }).observe(lienzo);

  /* la lista de canciones para un nivel nuevo: las de la casa, las de Mi música y la secreta si la tiene */
  function llenarCanciones(){ const s = $('#nivCancion'); s.innerHTML = CANCIONES.filter(c => !c.secreto || Y.tiene.includes('cancion:' + c.id)).map(c => `<option value="${esc(c.id)}">${esc(c.titulo)} · ${esc(c.artista)}</option>`).join(''); }
  /* si se abrió el juego con un enlace de nivel, se guarda solo */
  async function desdeEnlace(){ const m = location.hash.match(/nivel=([^&]+)/); if(!m) return false;
    try{ const d = await deCodigo(decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); llenarCanciones(); importar(d); return true; }catch(e){ aviso('El enlace de nivel venía roto.'); return false; } }
  return { lista: () => { llenarCanciones(); lista(); }, abrir, desdeEnlace, get nivel(){ return nv; } };
}
