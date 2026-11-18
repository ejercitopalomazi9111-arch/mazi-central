/* MAZI VR · el teclado. Una tecla por pieza, flotando enfrente; se escribe con el control (flechas + X), con la mano
   (apuntar + pellizcar) o mirando fijo. Círculo o L1 borran, R1 pone espacio, «Ir» manda.
     const texto = await pedirTexto('Buscar en YouTube')     → el texto, o null si se canceló */
const FILAS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '-', '/'],
  ['.com', '@', 'Espacio', 'Borrar', 'Ir'],
];
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
  const teclas = [];
  FILAS.forEach((fila, r) => {
    const anchos = fila.map((k) => (k === 'Espacio' ? 3.2 : k.length > 1 ? 1.6 : 1));
    const total = anchos.reduce((a, b) => a + b, 0) * PASO;
    let x = -total / 2;
    fila.forEach((k, i) => {
      const w = anchos[i] * PASO - .012, h = PASO - .012;
      const p = new V.Panel(w, h, 420); const m = p.malla;
      const dib = (f) => { const { x: c, cv } = p; c.clearRect(0, 0, cv.width, cv.height);
        V.redondo(c, 3, 3, cv.width - 6, cv.height - 6, 14); c.fillStyle = f ? '#3A1A5C' : (k === 'Ir' ? '#7E1735' : '#24123A'); c.fill();
        c.strokeStyle = f ? '#AC27FF' : '#3C2652'; c.lineWidth = f ? 5 : 2; c.stroke();
        c.fillStyle = '#F4EEF2'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${k.length > 1 ? 18 : 26}px system-ui, -apple-system, sans-serif`;
        c.fillText(k, cv.width / 2, cv.height / 2 + 1); p.listo(); };
      dib(false); p.foco = (f) => { if(p._f === f) return; p._f = f; dib(f); };
      m.position.set(x + anchos[i] * PASO / 2, .3 - r * PASO, -D);
      m.userData.accion = () => tecla(k);
      v.grupo.add(m); teclas.push(m); x += anchos[i] * PASO;
    });
  });
  function tecla(k){
    if(k === 'Ir'){ terminar(texto.trim() || null); return; }
    if(k === 'Borrar') texto = texto.slice(0, -1);
    else if(k === 'Espacio') texto += ' ';
    else texto += k.length > 1 ? k : k.toLowerCase();
    V.sonar('toque', .2); pintarCaja();
  }
  function terminar(valor){ const r = resolver; resolver = null; V.ir(volver); r?.(valor); }
  v.entrar = () => { V.texto.activo = true; pintarCaja(); };
  /* un teclado de verdad (Bluetooth, o el control del visor en modo teclado) escribe directo */
  addEventListener('keydown', (e) => {
    if(V.ahora() !== 'teclado') return;
    if(e.key === 'Enter'){ e.preventDefault(); tecla('Ir'); }
    else if(e.key === 'Backspace'){ e.preventDefault(); tecla('Borrar'); }
    else if(e.key.length === 1){ e.preventDefault(); texto += e.key === ' ' ? ' ' : e.key.toLowerCase(); V.sonar('toque', .2); pintarCaja(); }
  });
  v.escribir = (s) => { for(const ch of s) tecla(ch === ' ' ? 'Espacio' : ch.toUpperCase()); };
  v.elegibles = () => teclas;
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
