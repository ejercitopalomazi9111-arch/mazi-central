/* MAZI VR · el teclado. Una tecla por pieza, flotando enfrente; se escribe con el control (flechas + X), con la mano
   (apuntar + pellizcar) o mirando fijo. Círculo o L1 borran, R1 pone espacio, «Ir» manda.
     const texto = await pedirTexto('Buscar en YouTube')     → el texto, o null si se canceló */
/* DOS CAPAS (Carlos, 25 nov: «coloca todos los caracteres: los puntos, la diagonal, los dos puntos… actualmente sólo hay
   algunos y no permite buscar páginas web»): letras con Mayús, y «#+=» con TODOS los símbolos de una dirección o una
   búsqueda (: / . ? = & % # + _ ~ y los demás del teclado de un teléfono), más atajos de https://, www. y .com */
const CAPAS = {
  abc: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['Mayús', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '/'],
    ['#+=', ':', '@', 'Espacio', '-', '.com', 'Borrar', 'Ir'],
  ],
  sim: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    [':', '/', '.', '?', '=', '&', '%', '#', '+', '_'],
    ['-', '~', '!', '$', '*', '(', ')', '[', ']', '@'],
    ['{', '}', '<', '>', ';', ',', "'", '"', '|', '\\'],
    ['ABC', '^', '`', 'https://', 'www.', 'Espacio', 'Borrar', 'Ir'],
  ],
};
const ESPECIALES = new Set(['Espacio', 'Borrar', 'Ir', 'Mayús', '#+=', 'ABC']);
export function montarTeclado(V){
  const { THREE, B } = V;
  const v = { grupo: new THREE.Group() };
  let texto = '', resolver = null, volver = 'inicio', titulo = '';
  const D = 1.3, PASO = .155;
  /* el renglón de lo escrito */
  const caja = new V.Panel(1.62, .26, 500); caja.malla.position.set(0, .52, -D); v.grupo.add(caja.malla);
  const pintarCaja = () => { const { x, cv } = caja; x.clearRect(0, 0, cv.width, cv.height);
    V.redondo(x, 4, 4, cv.width - 8, cv.height - 8, 30); x.fillStyle = '#1E1428'; x.fill(); x.strokeStyle = '#AC27FF'; x.lineWidth = 4; x.stroke();
    x.textBaseline = 'middle'; x.font = '700 26px system-ui, -apple-system, sans-serif'; x.fillStyle = '#C9B6DA'; x.textAlign = 'left'; x.fillText(titulo, 30, 30);
    x.font = '800 40px system-ui, -apple-system, sans-serif'; x.fillStyle = '#F4EEF2';
    let t = texto + '▏'; while(x.measureText(t).width > cv.width - 60 && t.length > 2) t = '…' + t.slice(2);
    x.fillText(t, 30, 84); caja.listo(); };
  const teclas = [], porCapa = { abc: [], sim: [] };
  let capa = 'abc', mayus = false;
  for(const [nombreCapa, FILAS] of Object.entries(CAPAS)) FILAS.forEach((fila, r) => {
    const anchos = fila.map((k) => (k === 'Espacio' ? 2.6 : k.length > 1 ? 1.5 : 1));
    const total = anchos.reduce((a, b) => a + b, 0) * PASO;
    let x = -total / 2;
    fila.forEach((k, i) => {
      const w = anchos[i] * PASO - .012, h = PASO - .012;
      const p = new V.Panel(w, h, 420); const m = p.malla;
      const dib = (f) => { const { x: c, cv } = p; c.clearRect(0, 0, cv.width, cv.height);
        V.redondo(c, 3, 3, cv.width - 6, cv.height - 6, 14); c.fillStyle = f ? '#3A1A5C' : (k === 'Ir' ? '#7E1735' : '#24123A'); c.fill();
        c.strokeStyle = f ? '#AC27FF' : '#3C2652'; c.lineWidth = f ? 5 : 2; c.stroke();
        c.fillStyle = (k === 'Mayús' && mayus) ? '#F7A23B' : '#F4EEF2'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${k.length > 1 ? 18 : 26}px system-ui, -apple-system, sans-serif`;
        const vis = /^[A-ZÑ]$/.test(k) ? (mayus ? k : k.toLowerCase()) : k;
        c.fillText(vis, cv.width / 2, cv.height / 2 + 1); p.listo(); };
      m.userData.redibujar = () => dib(p._f);
      dib(false); p.foco = (f) => { if(p._f === f) return; p._f = f; dib(f); };
      m.position.set(x + anchos[i] * PASO / 2, .3 - r * PASO, -D);
      m.userData.accion = () => tecla(k);
      p.titulo = k; m.visible = nombreCapa === capa;
      v.grupo.add(m); teclas.push(m); porCapa[nombreCapa].push(m); x += anchos[i] * PASO;
    });
  });
  function ponerCapa(c){ capa = c; for(const [n, L] of Object.entries(porCapa)) L.forEach((m) => { m.visible = n === capa; }); }
  function tecla(k){
    if(k === 'Ir'){ terminar(texto.trim() || null); return; }
    if(k === '#+='){ ponerCapa('sim'); return; }
    if(k === 'ABC'){ ponerCapa('abc'); return; }
    if(k === 'Mayús'){ mayus = !mayus; porCapa.abc.forEach((m) => m.userData.redibujar()); return; }
    if(k === 'Borrar') texto = texto.slice(0, -1);
    else if(k === 'Espacio') texto += ' ';
    else if(/^[A-ZÑ]$/.test(k)){ texto += mayus ? k : k.toLowerCase(); }
    else texto += k;
    V.sonar('toque', .2); pintarCaja();
  }
  function terminar(valor){ const r = resolver; resolver = null; V.ir(volver); r?.(valor); }
  v.entrar = () => { V.texto.activo = true; ponerCapa('abc'); pintarCaja(); };
  /* un teclado de verdad (Bluetooth, o el control del visor en modo teclado) escribe directo */
  addEventListener('keydown', (e) => {
    if(V.ahora() !== 'teclado') return;
    if(e.key === 'Enter'){ e.preventDefault(); tecla('Ir'); }
    else if(e.key === 'Backspace'){ e.preventDefault(); tecla('Borrar'); }
    else if(e.key.length === 1){ e.preventDefault(); texto += e.key; V.sonar('toque', .2); pintarCaja(); }
  });
  v.escribir = (s) => { for(const ch of s){ if(ch === ' ') tecla('Espacio'); else if(/[a-zñ]/i.test(ch) && ch.length === 1){ const m0 = mayus; mayus = ch !== ch.toLowerCase(); tecla(ch.toUpperCase()); mayus = m0; } else { texto += ch; pintarCaja(); } } };
  v.elegibles = () => teclas.filter((m) => m.visible);
  v.texto = () => texto;   /* lo escrito (la persona simulada lo revisa) */
  v.capa = () => capa;
  v.control = (c) => {
    if(c.oprimido[B.R1]) tecla('Espacio');
    if(c.oprimido[B.L1]) tecla('Borrar');
    if(c.oprimido[B.R2]) tecla('Ir');
    return {};
  };
  v.atras = () => { if(texto){ tecla('Borrar'); } else terminar(null); };
  v.cerrar = () => { terminar(null); return true; };   /* el botón «Atrás» (mirándolo o con la mano) cancela de un jalón */
  v.atrasEn = [0, -.62, -1.3];
  v.salir = () => { V.texto.activo = false; if(resolver){ const r = resolver; resolver = null; r(null); } };
  V.registrar('teclado', v); window.__teclado = v;
  return function pedirTexto(t, { inicial = '', regresarA } = {}){
    titulo = t; texto = inicial; volver = regresarA || V.ahora() || 'inicio';
    return new Promise((ok) => { resolver = ok; V.ir('teclado'); });
  };
}
