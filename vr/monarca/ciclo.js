/* EL CICLO DE VIDA COMPLETO (prompt maestro de Carlos §13): las 16 etapas, con el día y la noche pasando rápido.
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   · Nada se dibuja: cada etapa es una FOTO real de esa etapa (serie «Monarch Life Cycle» de SidPix y huevo del USFWS,
     Flickr, CC BY 2.0; créditos en medios/ciclo/CREDITOS.json). Del primer vuelo en adelante, la mariposa es la del
     ecosistema (alas fotografiadas del escaneo) que despega de la foto y se va con las demás.
   · Los días salen de Monarch Joint Venture (CIENCIA.md): huevo 3-5 días, oruga 9-14 en cinco estadios, crisálida
     8-15, y la recién salida pasa VARIAS HORAS colgada secando las alas antes de volar. Aquí: eclosión el día 4, crisálida
     el día 17, sale el día 28 (dentro de los rangos), y el secado se cuenta en horas, de noche y de día.
   · El cielo se oscurece y se aclara con cada día que pasa (sólo el color de la foto 360°, sin repintar nada).
   crearCiclo({ THREE, V, grupo, eco, aqui, idioma, cielo }) → { empezar(), parar(), cuadro(t), etapa, listo } */
const ETAPAS = [
  /* [foto, segundos, día inicial, día final, nombre] */
  ['sidpix-20.jpg', 3, 0, 0, { es: 'Mariposa adulta', en: 'Adult butterfly' }],
  ['huevo.jpg', 2.5, 0, 0, { es: 'Busca algodoncillo', en: 'Finds milkweed' }],
  ['huevo.jpg', 2.5, 0, 0, { es: 'Pone un huevo', en: 'Lays an egg' }],
  ['huevo.jpg', 4, 0, 4, { es: 'Desarrollo del embrión', en: 'Embryo develops' }],
  ['sidpix-03.jpg', 2.5, 4, 4, { es: 'Eclosión', en: 'Hatching' }],
  ['sidpix-03.jpg', 2.5, 4, 5, { es: 'Aparece la oruga', en: 'The caterpillar appears' }],
  ['sidpix-05.jpg', 4, 5, 11, { es: 'Cinco estadios', en: 'Five instars' }],
  ['sidpix-06.jpg', 4, 11, 17, { es: 'Come y crece', en: 'Eats and grows' }],
  ['sidpix-08.jpg', 2.5, 17, 17, { es: 'Se cuelga en J', en: 'Hangs in a J' }],
  ['sidpix-10.jpg', 2.5, 17, 18, { es: 'Forma la crisálida', en: 'Forms the chrysalis' }],
  ['sidpix-11.jpg', 5, 18, 28, { es: 'Transformación interna', en: 'Inner transformation' }],
  ['sidpix-12.jpg', 2.5, 28, 28, { es: 'Se abre la crisálida', en: 'The chrysalis opens' }],
  ['sidpix-14.jpg', 3, 28, 28, { es: 'Emerge la mariposa', en: 'The butterfly emerges' }],
  ['sidpix-15.jpg', 3, 28, 28, { es: 'Expande las alas', en: 'Expands its wings' }],
  ['sidpix-16.jpg', 4, 28, 28.25, { es: 'Seca las alas (varias horas)', en: 'Dries its wings (several hours)' }],
  [null, 3.5, 28.25, 28.3, { es: 'Primer vuelo', en: 'First flight' }],
  [null, 3, 28.3, 28.35, { es: 'Se une al ecosistema', en: 'Joins the ecosystem' }],
];
export const N_ETAPAS = ETAPAS.length - 1;   /* «adulta» y «se une» abren y cierran el círculo: 16 pasos */

export function crearCiclo({ THREE, V, grupo, eco, aqui, idioma = () => 'es', cielo = null }){
  const C = { activo: false, etapa: -1, listo: false, dia: 0 };
  const capa = new THREE.Group(); capa.visible = false; grupo.add(capa);
  /* dos marcos para cruzar las fotos sin parpadeo (regla 13): uno se va mientras el otro llega */
  const marcos = [0, 1].map(() => { const p = new V.Panel(.95, 1.18, 560); p.malla.material.depthWrite = false; p.malla.position.set(0, .32, -2.25); capa.add(p.malla); return p; });
  const rotulo = new V.Panel(1.6, .36, 560); rotulo.malla.position.set(0, -.42, -2.2); rotulo.malla.material.depthWrite = false; capa.add(rotulo.malla);
  const fotos = {};
  const foto = (f) => fotos[f] || (fotos[f] = new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = aqui('medios/ciclo/' + f); }));
  let frente = 0, t0 = 0, cruce = 0, puesto = '';
  function pintarFoto(p, img){
    const { x, cv } = p, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
    x.save(); V.redondo(x, 8, 8, w - 16, h - 16, 40); x.clip();
    if(img){ const s = Math.max((w - 16) / img.width, (h - 16) / img.height); x.drawImage(img, 8 + (w - 16 - img.width * s) / 2, 8 + (h - 16 - img.height * s) / 2, img.width * s, img.height * s); }
    x.restore(); V.redondo(x, 8, 8, w - 16, h - 16, 40); x.lineWidth = 6; x.strokeStyle = '#F28C1B'; x.stroke(); p.listo();
  }
  function pintarRotulo(nombre, dia, k){
    const clave = nombre + '|' + dia; if(clave === puesto) return; puesto = clave;
    const { x, cv } = rotulo, w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    const esc = (t, y, tam, col) => { x.font = `900 ${tam}px system-ui, -apple-system, sans-serif`; while(x.measureText(t).width > w - 30 && tam > 24){ tam -= 2; x.font = `900 ${tam}px system-ui, -apple-system, sans-serif`; } x.lineWidth = tam * .16; x.strokeStyle = 'rgba(12,5,20,.92)'; x.strokeText(t, w / 2, y); x.fillStyle = col; x.fillText(t, w / 2, y); };
    esc(`${k + 1}/${N_ETAPAS} · ${nombre}`, h * .32, 64, '#F7A23B');
    esc(dia, h * .76, 50, '#FFFFFF');
    rotulo.listo();
  }
  const enIngles = () => idioma() === 'en';
  function textoDia(d){
    const dias = Math.floor(d), horas = Math.round((d - dias) * 24);
    if(dias >= 28 && horas) return enIngles() ? `Day ${dias} · ${horas} h` : `Día ${dias} · ${horas} h`;
    return enIngles() ? `Day ${dias}` : `Día ${dias}`;
  }
  /* el vuelo: una mariposa del ecosistema despega de donde estaba la foto */
  let vuela = null;
  C.empezar = () => {
    C.activo = true; C.listo = false; C.etapa = -1; t0 = performance.now() / 1000; capa.visible = true; puesto = ''; vuela = null;
    marcos.forEach((p) => { p.malla.material.opacity = 0; }); frente = 0;
    for(const [f] of ETAPAS) if(f) foto(f);   /* que estén listas antes de su turno */
  };
  C.parar = () => { C.activo = false; capa.visible = false; if(cielo) cielo.material.color.setRGB(1, 1, 1); eco.guiar(null); };
  C.cuadro = (t) => {
    if(!C.activo) return;
    let s = t - t0, k = 0;
    while(k < ETAPAS.length - 1 && s > ETAPAS[k][1]){ s -= ETAPAS[k][1]; k++; }
    const [f, dur, d0, d1, nombre] = ETAPAS[k], frac = Math.min(1, s / dur);
    C.dia = d0 + (d1 - d0) * frac;
    if(k !== C.etapa){
      const antes = C.etapa >= 0 ? ETAPAS[C.etapa][0] : null; C.etapa = k;
      if(f && f !== antes){ frente = 1 - frente; const p = marcos[frente]; p.malla.material.opacity = 0; foto(f).then((img) => { pintarFoto(p, img); cruce = t; }); }
      if(!f && k === ETAPAS.length - 2){
        /* primer vuelo: la guía sale del marco y se va subiendo; el marco se desvanece */
        vuela = t; eco.guiar(new THREE.Vector3(1.6, 1.4, -1.6), { posarse: false });
      }
      if(k === ETAPAS.length - 1){ eco.guiar(null); C.listo = true; }
    }
    /* el cruce de fotos (.6 s) y la salida del marco al volar */
    const kc = Math.min(1, (t - cruce) / .6);
    marcos[frente].malla.material.opacity = vuela ? Math.max(0, 1 - (t - vuela) / 1.2) : kc;
    marcos[1 - frente].malla.material.opacity = vuela ? 0 : 1 - kc;
    pintarRotulo(nombre[idioma()] || nombre.es, textoDia(C.dia), Math.min(k, N_ETAPAS - 1));
    /* día y noche: el cielo se oscurece con cada noche que pasa (sólo el color de la foto) */
    if(cielo){ const luz = .32 + .68 * Math.max(0, Math.sin(2 * Math.PI * (C.dia + .25))); cielo.material.color.setRGB(luz, luz * (.92 + .08 * luz), Math.min(1, luz * 1.08)); }
  };
  C.capa = capa;
  return C;
}
