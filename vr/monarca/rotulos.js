/* RÓTULOS DINÁMICOS DE MONARCH (Carlos, 25 nov: «ya no quiero esos recuadros de texto tipo carteles, hazlo todo dinámico»).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Nada de cartel con párrafos: lo que se cuenta lo cuenta el narrador (con sus subtítulos), y en el aire sólo flota lo
   que vale la pena VER: el título que entra y se va arriba, y las cifras clave que aparecen justo cuando el narrador
   las dice, en un arco enfrente, sin caja (letra con contorno y sombra para leerse sobre cualquier foto 360°).
     · titulo(texto, materias)   entra grande, se queda 3 s y sube chiquito a la orilla de arriba.
     · claves(lista)             [{ grande, chico, en }]: cada una aparece cuando el narrador va en la fracción `en`.
     · mensaje(titulo, lineas)   respuesta, consecuencia, pregunta: líneas que entran una tras otra.
     · fuente(texto)             renglón chiquito abajo (la fuente del dato: no se negocia).
     · avanzar(f)                fracción de la explicación (0..1): la llama monarca.js cada cuadro.
   Todo se pinta UNA vez por cambio de contenido (regla 13); lo que se anima es la malla (posición, escala, opacidad). */
const NARANJA = '#F7A23B', VINO = '#7E1735';
export function crearRotulos({ THREE, V, grupo }){
  const R = { items: [], f: 0 };
  const capa = new THREE.Group(); grupo.add(capa);
  /* un rótulo = un Panel transparente; se reutilizan (pool) */
  const pool = [];
  function tomar(w, h){
    let p = pool.find((x) => !x.usado && x.w === w && x.h === h);
    if(!p){ p = new V.Panel(w, h, 620); p.w = w; p.h = h; p.malla.material.depthWrite = false; p.malla.renderOrder = 10; capa.add(p.malla); pool.push(p); }
    p.usado = true; p.malla.visible = true; p.malla.material.opacity = 0; return p;
  }
  function soltar(it){ it.p.usado = false; it.p.malla.visible = false; }
  /* letra legible sobre foto: contorno oscuro + sombra */
  function escribir(x, texto, cx, y, tam, peso, color, maxW){
    x.font = `${peso} ${tam}px system-ui, -apple-system, sans-serif`;
    while(maxW && x.measureText(texto).width > maxW && tam > 18){ tam -= 2; x.font = `${peso} ${tam}px system-ui, -apple-system, sans-serif`; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.shadowColor = 'rgba(0,0,0,.75)'; x.shadowBlur = tam * .35; x.lineWidth = Math.max(4, tam * .16); x.strokeStyle = 'rgba(12,5,20,.92)'; x.strokeText(texto, cx, y);
    x.shadowBlur = 0; x.fillStyle = color; x.fillText(texto, cx, y);
  }
  function partir(x, texto, ancho){ const out = []; let r = ''; for(const pa of String(texto).split(' ')){ const n = r ? r + ' ' + pa : pa; if(x.measureText(n).width > ancho && r){ out.push(r); r = pa; } else r = n; } if(r) out.push(r); return out; }

  function nuevo(tipo, w, h, pintar, o){
    const p = tomar(w, h); const { x, cv } = p; x.clearRect(0, 0, cv.width, cv.height); pintar(x, cv.width, cv.height); p.listo();
    const it = { tipo, p, t0: null, ...o }; R.items.push(it); return it;
  }
  const ahora = () => performance.now() / 1000;

  /* el título: entra en el centro y sube */
  R.titulo = (texto, materias = []) => {
    R.items.filter((i) => i.tipo === 'titulo').forEach((i) => { i.salir = ahora(); });
    nuevo('titulo', 2.4, .56, (x, w, h) => {
      escribir(x, texto, w / 2, h * .38, 170, 900, NARANJA, w - 40);
      if(materias.length){ x.font = '700 34px system-ui, -apple-system, sans-serif'; let tot = -16; const an = materias.map((m) => x.measureText(m).width + 40); an.forEach((a) => { tot += a + 16; });
        let cx = w / 2 - tot / 2; materias.forEach((m, k) => { V.redondo(x, cx, h * .74, an[k], 50, 25); x.fillStyle = VINO; x.fill(); x.fillStyle = '#F4EEF2'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(m, cx + an[k] / 2, h * .74 + 26); cx += an[k] + 16; }); }
    }, { t0: ahora() });
    R.tituloEn = ahora();
  };
  /* las cifras clave: aparecen con la narración, en arco */
  const ARCO = [[-1.15, .55], [1.15, .55], [-1.15, -.02], [1.15, -.02], [0, .74]];
  R.claves = (lista = []) => {
    R.items.filter((i) => i.tipo === 'clave').forEach((i) => { i.salir = ahora(); });
    lista.forEach((c, k) => { const [px, py] = c.pos || ARCO[k % ARCO.length];
      nuevo('clave', 1.2, .46, (x, w, h) => { escribir(x, c.grande, w / 2, h * .36, 128, 900, NARANJA, w - 30); if(c.chico) escribir(x, c.chico, w / 2, h * .8, 52, 700, '#FFFFFF', w - 30); },
        { en: c.en ?? k / Math.max(1, lista.length), base: new THREE.Vector3(px, py, -2.25 + Math.abs(px) * .3), k }); });
  };
  /* un mensaje (respuesta, pregunta, consecuencia): líneas una tras otra, al centro.
     QUE NO LO TAPEN LOS BOTONES (27 nov, Carlos: «donde decimos lo de materia se está cubriendo con los botones y no se alcanza
     a leer»): los renglones bajaban sin fijarse dónde empiezan los botones. Ahora nada baja de `hasta` (la orilla de arriba de
     los botones); lo que no cabe se parte en PÁGINAS que cambian solas cada 9 s (y con mensaje(…, { pagina }) a mano), con
     «1/3» junto al título. Devuelve cuántas páginas salieron. */
  R.mensaje = (titulo, lineas = [], { chico = false, hasta = -.26, pagina = 0 } = {}) => {
    R.items.filter((i) => i.tipo === 'mensaje' || i.tipo === 'clave').forEach((i) => { i.salir = ahora(); });
    R.paginas = null;
    const t = ahora();
    const digito = /^\d$/.test(String(titulo || ''));
    const tam = chico ? 46 : 66, x0 = document.createElement('canvas').getContext('2d'); x0.font = `700 ${tam}px system-ui, -apple-system, sans-serif`;
    const piezas = lineas.map((l) => { const rs = partir(x0, l, 2.3 * 620 - 80); return { rs, alto: .04 + rs.length * tam * 1.3 / 620 }; });
    const y0 = titulo ? .46 : .62, cabe = y0 - hasta;
    const paginas = [[]]; let usado = 0;
    for(const pz of piezas){ if(usado + pz.alto > cabe && paginas.at(-1).length){ paginas.push([]); usado = 0; } paginas.at(-1).push(pz); usado += pz.alto + .03; }
    const n = paginas.length, pg = ((pagina % n) + n) % n;
    const tit = titulo && n > 1 ? `${titulo}  ${pg + 1}/${n}` : titulo;
    if(tit) nuevo('mensaje', 2.4, .42, (x, w, h) => escribir(x, tit, w / 2, h / 2, digito ? 240 : 150, 900, NARANJA, w - 40), { t0: t, base: new THREE.Vector3(0, .72, -2.2) });
    let y = y0;
    paginas[pg].forEach(({ rs, alto }, k) => {
      nuevo('mensaje', 2.4, alto, (x, w, h) => { rs.forEach((r, j) => escribir(x, r, w / 2, (j + .5) * (h / rs.length), tam, 700, '#FFFFFF', w - 40)); },
        { t0: t + .35 * (k + 1), base: new THREE.Vector3(0, y - alto / 2, -2.2) });
      y -= alto + .03;
    });
    if(n > 1) R.paginas = { titulo, lineas, op: { chico, hasta }, pg, n, t };
    return n;
  };
  R.fuente = (texto) => {
    R.items.filter((i) => i.tipo === 'fuente').forEach((i) => { i.salir = ahora(); });
    if(texto) nuevo('fuente', 2.4, .1, (x, w, h) => escribir(x, texto, w / 2, h / 2, 36, 600, '#D8C8E8', w - 30), { t0: ahora() + 1, base: new THREE.Vector3(0, -.88, -2.1) });
  };
  R.limpiar = () => { R.paginas = null; const t = ahora(); R.items.forEach((i) => { if(!i.salir) i.salir = t; }); };
  R.avanzar = (f) => { R.f = f; };
  R.mostrarTodo = () => { R.f = 1; };

  /* cada cuadro: entradas, salidas y un flotar suave */
  const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  R.cuadro = (t) => {
    /* las páginas de un mensaje largo cambian solas */
    if(R.paginas && t - R.paginas.t > 9){ const P = R.paginas; R.mensaje(P.titulo, P.lineas, { ...P.op, pagina: P.pg + 1 }); }
    for(const it of R.items){
      const m = it.p.malla;
      /* las cifras esperan a que el título se haya ido para arriba (si no, se enciman) */
      if(it.tipo === 'clave' && it.t0 == null && R.f >= it.en && t >= (R.tituloEn || 0) + 3.1) it.t0 = t;
      if(it.t0 == null || t < it.t0){ m.material.opacity = 0; continue; }
      const k = ease((t - it.t0) / .55), sale = it.salir ? ease((t - it.salir) / .4) : 0;
      let px = 0, py = 0, pz = -2.2, esc = 1;
      if(it.tipo === 'titulo'){
        const sube = ease((t - it.t0 - 2.4) / .8);
        px = 0; py = .45 + sube * .62; pz = -2.2 - sube * .2; esc = (.55 + .45 * k) * (1 - sube * .55);
      } else if(it.base){ px = it.base.x; py = it.base.y + Math.sin(t * 1.1 + (it.k || 0) * 1.7) * .015; pz = it.base.z; esc = it.tipo === 'clave' ? .6 + .4 * (k < 1 ? 1 + Math.sin(k * Math.PI) * .12 : 1) : .92 + .08 * k; }
      m.position.set(px, py + (it.tipo === 'mensaje' ? (1 - k) * -.05 : 0), pz); m.scale.setScalar(Math.max(.01, esc));
      m.lookAt(0, m.position.y * .3, 0);
      m.material.opacity = k * (1 - sale);
    }
    /* lo que ya salió del todo, de regreso al pool */
    for(let i = R.items.length - 1; i >= 0; i--){ const it = R.items[i]; if(it.salir && t - it.salir > .45){ soltar(it); R.items.splice(i, 1); } }
  };
  /* para las pruebas: lo que se ve ahorita */
  R.visibles = () => R.items.filter((i) => i.p.malla.material.opacity > .05 && !i.salir).map((i) => i.tipo);
  R.capa = capa;
  return R;
}
