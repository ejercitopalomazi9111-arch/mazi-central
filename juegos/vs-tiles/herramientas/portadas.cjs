/* LAS PORTADAS DEL MENÚ: fotos de las Vocaloid en sus escenarios, sacadas del mismo juego (sin dibujar nada).
   Con el servidor de pruebas en el 8765:  node juegos/vs-tiles/herramientas/portadas.cjs */
const { chromium } = require('playwright');
const FOTOS = [
  { id: 'historia', voces: ['miku-akuma'], esc: 3, ang: .12, alto: .1, cuerpo: 1, t: 3.3 },
  { id: 'libre', voces: ['gumi', 'miku', 'luka'], esc: 0, ang: 0, alto: .05, cuerpo: .9, t: 5.1 },
  { id: 'reto', voces: ['miku-akuma', 'miku-hagane'], esc: 5, ang: -.25, alto: -.25, cuerpo: .9, t: 7.7 },
  { id: 'lab', voces: ['luka'], esc: 1, ang: -.1, alto: .1, cuerpo: 1, t: 2.2 },
  { id: 'mercado', voces: ['miku-hagane', 'una'], esc: 4, ang: .1, alto: .05, cuerpo: .9, t: 6.4 },
  { id: 'vestidor', voces: ['una'], esc: 2, ang: .1, alto: .15, cuerpo: .55, t: 4.1, ancho: true },
  { id: 'records', voces: ['gumi'], esc: 6, ang: -.1, alto: .1, cuerpo: .6, t: 1.6, ancho: true },
  { id: 'ajustes', voces: ['miku'], esc: 2, ang: .25, alto: .2, cuerpo: .5, t: 8.2, ancho: true },
  { id: 'creditos', voces: ['gumi', 'miku', 'luka'], esc: 3, ang: 0, alto: .05, cuerpo: .85, t: 9.4, ancho: true },
];
(async () => {
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for(const F of FOTOS){
  const [w, h] = F.ancho ? [960, 540] : [800, 1000];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/juegos/vs-tiles/index.html'); await p.waitForFunction(() => window.VST, null, { timeout: 30000 });
  const url = await p.evaluate(async (F) => {
    const E = VST.escena; VST.partida.pintarMenu = () => {};
    document.querySelectorAll('.pantalla').forEach(s => s.style.display = 'none');
    await E.ponerCantantes(F.voces);
    const carta = { eventos: [{ t: 0, tipo: 'escenario', n: F.esc, tono: 0 }], notas: [], dif: 'dificil' };
    const est = { desde: 0, estado: {}, vel: 1 };
    const t0 = performance.now(); while(performance.now() - t0 < 1500){ E.pintar(F.t, { an: null, carta, est, modo: 'menu' }); await new Promise(r => requestAnimationFrame(r)); }
    /* encuadre automático: la caja de todas las cantantes, y la cámara a la distancia justa para que quepan */
    const T = await import('/juegos/vs-tiles/vendor/three.module.min.js'); const caja = new T.Box3();
    E.s.updateMatrixWorld(true); for(const k of E.cantantes) caja.expandByObject(k.raiz, true);
    const tam = caja.getSize(new T.Vector3()), cen = caja.getCenter(new T.Vector3()), asp = innerWidth / innerHeight, tg = Math.tan(19 * Math.PI / 180);
    const alto = tam.y * F.cuerpo, mira = new T.Vector3(cen.x, caja.max.y - alto / 2 + tam.y * .02, cen.z);
    const d = Math.max(alto * .56 / tg, tam.x * .62 / (tg * asp));
    const c = E.cam.clone(); c.position.set(cen.x + Math.sin(F.ang) * d, mira.y + F.alto * alto, cen.z + Math.cos(F.ang) * d); c.up.set(0, 1, 0); c.fov = 38; c.aspect = asp; c.lookAt(mira); c.updateProjectionMatrix();
    E.carril.visible = false; E.r.render(E.s, c); return E.r.domElement.toDataURL('image/jpeg', .82);
  }, F);
  require('fs').writeFileSync(`/home/user/mazi-central/juegos/vs-tiles/portadas/${F.id}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(F.id, errs.length ? errs : 'ok'); await p.close(); }
await b.close(); })();
