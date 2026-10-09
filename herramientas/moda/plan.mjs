/* El calendario de All's fashion: 15 días × 10 anuncios (6 publicaciones + 4 historias) y las tandas.
   Sin precios, sin «originales», sin envíos ni dirección: nada que Carlos no haya confirmado. */
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = (process.env.TRABAJO || new URL('./trabajo', import.meta.url).pathname) + '/';
const cat = JSON.parse(readFileSync(DIR + 'catalogo.json'));
const info = JSON.parse(readFileSync(DIR + 'recortes/info.json'));
const porI = Object.fromEntries(cat.map((c) => [c.i, c]));
const R = (i) => `${DIR}recortes/${porI[i].id}.png`;
const F = (i) => `${DIR}fotos/${porI[i].arch}`;
const COLOR = (i) => info[porI[i].id]?.color;

/* azar con semilla, para que el lote salga igual cada vez */
let s = 20261009; const rnd = () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 1 >>> 0) / 4294967296);
const giro = (arr) => { let k = 0; return () => arr[k++ % arr.length]; };
const barajar = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fila = (arr) => giro(barajar(arr));

/* ── lo que hay ── */
const recortables = (c) => cat.filter((x) => x.cat === c && info[x.id] && !info[x.id].malo).map((x) => x.i);
const todas = (c) => cat.filter((x) => x.cat === c).map((x) => x.i);
const SUD = fila(recortables('sudadera')), CHAM = fila(recortables('chamarra'));
const TEN = fila(recortables('tenis')), BOT = fila(recortables('botas')), BOL = fila(recortables('bolsa'));
const CAM = fila(recortables('camisa')), PANr = fila(recortables('pantalon')), PANf = fila([55, 59, 60]);
const LOC = fila(recortables('locion')), TER = fila(recortables('termo'));

/* ── las frases ── */
const T = {
  sudadera: { k: ['Nuevo en tienda', 'Recién llegada', 'Temporada de frío', 'Sudaderas de marca', 'Otoño · Invierno', 'Hoodie season', 'Para el frío'],
    t: ['Sudaderas que sí abrigan', 'Llegó el frío. Llegaron las sudaderas.', 'Tu próxima sudadera favorita', 'Capucha arriba, estilo también', 'Para las mañanas frías', 'Combina con todo', 'Esta no dura en el rack', 'Abriga bonito', 'El básico que nunca falla', 'Cómoda y de marca', 'Para la escuela, el gym o la noche', 'Una sudadera así se presume', 'Cómodo sin verte flojo', 'Frío afuera, estilo adentro', 'La que vas a usar diario', 'Hecha para esta temporada'],
    s: ['Pregunta por tu talla', 'Con cierre o cerrada, tú escoges', 'Varios colores', 'Mándanos DM y te damos precio', ''],
    c: ['Pide la tuya por DM', 'Aparta la tuya', 'Pregunta por tu talla', 'Mándanos DM'], palabra: ['Hoodie', 'Frío', 'Style', 'Cozy'] },
  chamarra: { k: ['Chamarras', 'Para el frío'], t: ['Deportiva y con estilo', 'Chamarras para el frío', 'Ligera, cómoda y de marca'], s: ['Pregunta por tu talla', ''], c: ['Pide la tuya', 'Mándanos DM'], palabra: ['Jacket'] },
  tenis: { k: ['Recién llegados', 'Tenis de marca', 'Nuevos en tienda', 'Para diario'],
    t: ['Tus próximos tenis favoritos', 'Pisa con estilo', 'Para caminar todo el día', 'Estrena tenis esta semana', 'Unos tenis así no se repiten', 'Del gym a la calle', 'Con estos el outfit se arma solo', 'El par que te faltaba', 'Tus pies te lo van a agradecer'],
    s: ['Pregunta por tu número', 'Mándanos DM y te decimos qué números hay', ''], c: ['Pide los tuyos', 'Pregunta por tu número', 'Mándanos DM'], palabra: ['Sneakers', 'Tenis', 'Kicks'] },
  botas: { k: ['Botas de marca', 'Otoño · Invierno', 'Recién llegadas'], t: ['Botas para la temporada', 'Pisa fuerte', 'Elegantes y cómodas', 'El toque que tu outfit pedía'],
    s: ['Pregunta por tu número', ''], c: ['Pide las tuyas', 'Pregunta por tu número'], palabra: ['Boots', 'Botas'] },
  bolsa: { k: ['Bolsas de marca', 'Accesorios', 'Nuevas en tienda'], t: ['La bolsa que le faltaba a tu outfit', 'Cabe todo. Se ve mejor.', 'Regálatela', 'Para diario o para salir', 'El accesorio que todos notan', 'Chiquita, bonita y de marca', 'Para llevar lo importante'],
    s: ['Mándanos DM y te damos precio', 'Pregunta por los colores', ''], c: ['Pide la tuya', 'Aparta la tuya', 'Mándanos DM'], palabra: ['Bags', 'Bolsas'] },
  camisa: { k: ['Camisas de vestir', 'Para verte bien'], t: ['Camisas para verte bien sin esfuerzo', 'Para la oficina, la cita o la boda', 'Formal, pero con estilo', 'Lista para impresionar'],
    s: ['Pregunta por tu talla', 'Lisas y de cuadros', ''], c: ['Pide la tuya', 'Pregunta por tu talla'], palabra: ['Shirt', 'Formal'] },
  pantalon: { k: ['Jeans de marca', 'Recién llegados'], t: ['El jeans que buscabas', 'Un buen jeans lo arregla todo', 'Combina con todo lo que ya tienes', 'Claro, oscuro o deslavado'],
    s: ['Pregunta por tu talla', ''], c: ['Pide el tuyo', 'Pregunta por tu talla'], palabra: ['Denim', 'Jeans'] },
  locion: { k: ['Lociones', 'Perfumería'], t: ['Huele a que te va bien', 'El detalle que todos notan', 'Para regalar (o regalarte)', 'Tu aroma de todos los días'],
    s: ['Mándanos DM y te damos precio', ''], c: ['Pide la tuya', 'Mándanos DM'], palabra: ['Scent', 'Aroma'] },
  termo: { k: ['Termos y vasos', 'Accesorios'], t: ['Tu bebida, como la dejaste', 'Frío o caliente, todo el día', 'Para que te acompañe todo el día'],
    s: ['Varios colores', ''], c: ['Pide el tuyo', 'Mándanos DM'], palabra: ['Termo'] },
};
const pick = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) if (Array.isArray(v)) r[k] = fila(v); return r; };
const P = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, pick(v)]));
const HIST_CTA = fila(['Responde esta historia', 'Responde y aparta', 'Mándanos DM']);

/* un anuncio de una prenda recortada, en el diseño que toque */
function prenda(catg, i, tipo, formato, dia) {
  const p = P[catg], o = { tipo, formato, img: R(i), kicker: p.k(), titulo: p.t(), sub: p.s(), cta: formato === 'historia' ? HIST_CTA() : p.c() };
  if (tipo === 'crema') { o.palabra = p.palabra(); o.num = `Nº ${String(dia).padStart(2, '0')}`; }
  if (tipo === 'color') { o.palabra = p.palabra(); o.color = COLOR(i); }
  if (tipo === 'etiqueta') Object.assign(o, { t1: 'Precio y tallas', t2: 'Por DM', t3: 'Te contestamos', titulo: p.t() });
  if (tipo === 'revista') {
    const nombre = { sudadera: 'Sudaderas de marca', chamarra: 'Chamarras', tenis: 'Tenis de marca', botas: 'Botas', bolsa: 'Bolsas de marca', camisa: 'Camisas de vestir', pantalon: 'Jeans de marca', locion: 'Lociones', termo: 'Termos' }[catg];
    Object.assign(o, { num: `Edición Nº ${String(dia).padStart(2, '0')}`, claro: dia % 2 === 0,
      lineas: [['Lo nuevo', nombre], [catg === 'tenis' || catg === 'botas' ? 'Números' : catg === 'bolsa' || catg === 'locion' || catg === 'termo' ? 'Precio' : 'Tallas', catg === 'bolsa' || catg === 'locion' || catg === 'termo' ? 'Pregúntalo por DM' : 'Pregunta por la tuya']],
      sello: formato === 'historia' ? 'Responde<br>y aparta' : 'Pide<br>por DM' });
  }
  return o;
}
const DISENOS = ['estudio', 'crema', 'color', 'revista', 'etiqueta'];

/* grupos para «escoge tu color» */
const TRIOS = [
  { imgs: [79, 95, 97], cat: 'sudadera', k: 'Mismo modelo', t: 'Escoge tu color' },
  { imgs: [96, 108, 113], cat: 'sudadera', k: 'Con cierre', t: '¿Cuál es la tuya?' },
  { imgs: [90, 100, 107], cat: 'sudadera', k: 'Estampado en la espalda', t: 'Se ven de frente y de espaldas' },
  { imgs: [78, 80, 83], cat: 'sudadera', k: 'Cerradas, con bolsa al frente', t: 'Las de todos los días' },
  { imgs: [45, 46, 49], cat: 'tenis', k: 'Para correr o para diario', t: 'Escoge tu par' },
  { imgs: [38, 41, 42], cat: 'botas', k: 'Botas', t: 'Tres estilos, una temporada' },
  { imgs: [31, 32, 127], cat: 'bolsa', k: 'Bolsas', t: '¿Con cuál sales hoy?' },
  { imgs: [56, 57], cat: 'locion', k: 'Lociones', t: 'Para él' },
  { imgs: [117, 118], cat: 'camisa', k: 'Camisas de vestir', t: 'Lisa o de cuadros' },
  { imgs: [33, 39], cat: 'termo', k: 'Termos', t: 'Tu bebida, como la dejaste' },
  { imgs: [86, 87, 112], cat: 'sudadera', k: 'En blanco', t: 'El color que combina con todo' },
  { imgs: [37, 40, 50], cat: 'tenis', k: 'Para diario', t: 'Blancos o negros' },
  { imgs: [92, 98, 104], cat: 'sudadera', k: 'En negro', t: 'Negra nunca falla' },
  { imgs: [81, 85, 88], cat: 'sudadera', k: 'Con estilo', t: 'Para cada personalidad' },
  { imgs: [120, 121, 48], cat: 'tenis', k: 'Recién llegados', t: '¿Cuáles te llevas?' },
];
const trio = giro(TRIOS);
function hacerTrio(formato, dia) {
  const g = trio(), p = P[g.cat];
  return { tipo: 'trio', formato, oscuro: dia % 2 === 1, imgs: g.imgs.map(R), kicker: g.k, titulo: g.t, sub: formato === 'historia' ? '' : p.s(), cta: formato === 'historia' ? HIST_CTA() : p.c() };
}

/* fotos completas (grupos y la bodega) */
const FOTOS = fila([
  { i: 9, k: 'Playeras de marca', t: 'Una para cada día de la semana', s: 'Muchos colores para escoger', c: 'Pide las tuyas' },
  { i: 11, k: 'Playeras de marca', t: 'Arma tu semana', s: 'Pregunta por tu talla', c: 'Pide las tuyas' },
  { i: 13, k: 'Básicos de marca', t: 'Clásicas que nunca fallan', s: 'Muchos colores', c: 'Mándanos DM' },
  { i: 14, k: 'Playeras', t: 'Escoge tu color', s: 'Pregunta por tu talla', c: 'Pide la tuya' },
  { i: 15, k: 'Nuevas en tienda', t: 'Playeras para diario', s: '', c: 'Pide las tuyas' },
  { i: 52, k: 'Playeras y más', t: 'Para cada estilo, una playera', s: 'Pregunta por tu talla', c: 'Mándanos DM' },
  { i: 53, k: 'Playeras de marca', t: 'Colores para todos los gustos', s: '', c: 'Pide la tuya' },
  { i: 51, k: 'Polos', t: 'Arreglado sin esfuerzo', s: 'Muchos colores', c: 'Pide el tuyo' },
  { i: 122, k: 'Camisas de vestir', t: 'Lisas, de cuadros y estampadas', s: 'Pregunta por tu talla', c: 'Pide la tuya' },
  { i: 123, k: 'Camisas de vestir', t: 'Para la oficina, la cita o la boda', s: '', c: 'Pide la tuya' },
  { i: 3, k: 'Bolsas de marca', t: '¿Cuál te llevas?', s: 'Dinos en los comentarios', c: 'Mándanos DM' },
  { i: 2, k: 'Bolsas y carteras', t: 'Una para cada ocasión', s: '', c: 'Pide la tuya' },
  { i: 26, k: 'Bolsas', t: 'Para diario o para salir', s: '', c: 'Pide la tuya' },
  { i: 30, k: 'Carteras y bolsitas', t: 'El detalle perfecto para regalar', s: '', c: 'Mándanos DM' },
  { i: 35, k: 'Tenis de marca', t: '¿Cuáles te llevas?', s: 'Dinos en los comentarios', c: 'Pide los tuyos' },
  { i: 17, k: 'Tenis', t: 'Hay para escoger', s: 'Pregunta por tu número', c: 'Mándanos DM' },
  { i: 55, k: 'Jeans de marca', t: 'El jeans que buscabas', s: 'Pregunta por tu talla', c: 'Pide el tuyo' },
  { i: 59, k: 'Jeans', t: 'Claro, oscuro o deslavado', s: '', c: 'Pregunta por tu talla' },
  { i: 29, k: 'Body mist y lociones', t: 'Aromas para todos los gustos', s: '', c: 'Pide la tuya' },
  { i: 34, k: 'También cosméticos', t: 'Para consentirte', s: '', c: 'Mándanos DM' },
  { i: 109, k: 'Sudaderas de marca', t: 'Se presume de espaldas', s: '', c: 'Pide la tuya' },
]);
const BODEGA = fila([
  { i: 0, t: 'Todo en un solo lugar' }, { i: 1, t: 'Si no lo ves, pregúntalo' }, { i: 19, t: 'Ropa y accesorios de marca' },
  { i: 21, t: 'De todo para todos' }, { i: 7, t: 'Lociones, cosméticos y más' }, { i: 5, t: 'Bolsas para cada ocasión' }, { i: 8, t: 'Tenis para toda la familia' }, { i: 20, t: 'Playeras de todos los colores' },
]);
const LISTA = 'Ropa · Tenis · Bolsas · Lociones · y más';
const REJ = fila([
  { imgs: [36, 46, 40, 47, 49, 120], tira: '¿Cuáles te llevas? · 1, 2, 3 o 4' },
  { imgs: [79, 102, 93, 85, 97, 111], tira: 'Sudaderas nuevas · Pide por DM' },
  { imgs: [31, 125, 126, 127, 32, 3], tira: '¿Cuál te llevas? · Dinos en comentarios' },
  { imgs: [38, 42, 23, 41, 36, 37], tira: 'Botas de temporada · Pide por DM' },
  { imgs: [56, 57, 33, 39, 29, 34], tira: 'Lociones y termos · Pide por DM' },
  { imgs: [54, 58, 117, 118, 55, 123], tira: 'Jeans y camisas · Pide por DM' },
  { imgs: [9, 52, 53, 51, 13, 14], tira: 'Playeras y polos · Pide por DM' },
  { imgs: [44, 45, 48, 49, 50, 121], tira: 'Tenis para correr · Pide por DM' },
]);
function foto(formato) { const f = FOTOS(); return { tipo: 'foto', formato, img: F(f.i), kicker: f.k, titulo: f.t, sub: f.s, cta: formato === 'historia' ? HIST_CTA() : f.c }; }
function bodega(formato) { const b = BODEGA(); return { tipo: 'tienda', formato, img: F(b.i), titulo: b.t, lista: LISTA, cta: formato === 'historia' ? HIST_CTA() : 'Escríbenos por DM' }; }
function rejilla(formato) { const r = REJ(); const imgs = r.imgs.slice(0, formato === 'historia' ? 6 : 4).map(F); return { tipo: 'rejilla', formato, imgs, tira: r.tira }; }

/* ── los 15 días ── */
const plan = [];
const MISC = giro(['camisa', 'pantalon', 'locion', 'termo', 'camisa', 'pantalon', 'locion', 'chamarra']);
const MISC_I = { camisa: CAM, pantalon: PANr, locion: LOC, termo: TER, chamarra: CHAM };
for (let d = 1; d <= 15; d++) {
  const D = String(d).padStart(2, '0'), dz = (k) => DISENOS[(d + k) % DISENOS.length];
  const calzado = d % 3 === 0 ? ['botas', BOT] : ['tenis', TEN];
  const misc = MISC();
  const slots = [
    prenda('sudadera', SUD(), dz(0), 'feed', d),
    prenda(calzado[0], calzado[1](), dz(1), 'feed', d),
    d % 2 ? prenda('bolsa', BOL(), dz(2), 'feed', d) : foto('feed'),
    d % 3 === 1 ? rejilla('feed') : foto('feed'),
    hacerTrio('feed', d),
    d % 4 === 0 ? bodega('feed') : prenda(misc, MISC_I[misc](), dz(3), 'feed', d),
    prenda(d % 5 === 0 ? 'chamarra' : 'sudadera', d % 5 === 0 ? CHAM() : SUD(), ['estudio', 'color', 'revista', 'crema'][d % 4], 'historia', d),
    prenda(d % 2 ? 'tenis' : 'bolsa', d % 2 ? TEN() : BOL(), ['color', 'estudio', 'crema', 'revista'][d % 4], 'historia', d),
    d % 3 === 2 ? rejilla('historia') : d % 3 === 0 ? bodega('historia') : foto('historia'),
    d % 2 ? hacerTrio('historia', d) : prenda('sudadera', SUD(), ['revista', 'estudio', 'color', 'crema'][d % 4], 'historia', d),
  ];
  slots.forEach((o, k) => { o.arch = `Dia ${D}/${String(k + 1).padStart(2, '0')}-${o.formato === 'historia' ? 'historia' : 'publicacion'}.jpg`; plan.push(o); });
}

/* ── las tandas ── */
const tanda = (carpeta, nombre, o) => plan.push({ ...o, arch: `Tandas/${carpeta}/${nombre}.jpg` });
const TANDAS = [
  { carpeta: '1 Playeras', cosa: 'playera', plural: 'playeras', icono: 'shirt', foto: F(10), foto2: F(9) },
  { carpeta: '2 Sudaderas', cosa: 'sudadera', plural: 'sudaderas', icono: 'shirt', foto: F(95), foto2: F(111), trio: [79, 95, 97] },
  { carpeta: '3 Pantalones', cosa: 'pantalón', plural: 'pantalones', icono: 'shopping-bag', foto: F(55), duo: [54, 58] },
];
for (const tt of TANDAS) {
  const k = `Tanda de ${tt.plural}`, pasos = ['Apartas uno de los 15 lugares', 'Cada día das tu parte', `Cada día alguien estrena, hasta que los 15 tengan su ${tt.cosa}`];
  tanda(tt.carpeta, '01-como-funciona-publicacion', { tipo: 'tanda-como', formato: 'feed', icono: tt.icono, kicker: k, titulo: `Estrena ${tt.cosa} dando poquito cada día`, pasos, cta: 'Aparta tu lugar por DM' });
  tanda(tt.carpeta, '02-15-dias-publicacion', { tipo: 'tanda-15', formato: 'feed', img: tt.foto, kicker: k, cosa: tt.cosa, sub: `Das poquito al día y en 15 días todos tienen su ${tt.cosa} de marca`, cta: 'Quiero mi lugar' });
  tanda(tt.carpeta, '03-cuentas-publicacion', { tipo: 'tanda-formula', formato: 'feed', kicker: k, cosa: tt.cosa, titulo: '= un pago chiquito al día', sub: `Tu ${tt.cosa} en 15 partes, sin sentirlo`, cta: 'Aparta tu lugar' });
  tanda(tt.carpeta, '04-calendario-publicacion', { tipo: 'tanda-cal', formato: 'feed', icono: tt.icono, kicker: k, titulo: `Cada día alguien estrena ${tt.cosa}`, sub: `15 días · 15 personas · todos con su ${tt.cosa}`, cta: 'Aparta tu lugar por DM' });
  tanda(tt.carpeta, '05-lugares-publicacion', { tipo: 'tanda-boleto', formato: 'feed', img: tt.foto2 || tt.foto, kicker: k, titulo: 'Sólo hay 15 lugares', b1: k, b2: 'Tu lugar te espera', sub: 'Cuando se llenan los 15, arranca', cta: 'Aparta el tuyo' });
  tanda(tt.carpeta, '06-como-funciona-historia', { tipo: 'tanda-como', formato: 'historia', icono: tt.icono, kicker: k, titulo: `Estrena ${tt.cosa} dando poquito cada día`, pasos, cta: 'Responde «YO» para entrar' });
  tanda(tt.carpeta, '07-15-dias-historia', { tipo: 'tanda-15', formato: 'historia', img: tt.foto, kicker: k, cosa: tt.cosa, sub: `Das poquito al día y en 15 días todos tienen su ${tt.cosa}`, cta: 'Responde para apartar' });
  tanda(tt.carpeta, '08-quedan-pocos-historia', { tipo: 'tanda-boleto', formato: 'historia', img: tt.foto2 || tt.foto, kicker: k, titulo: 'Quedan pocos lugares', b1: k, b2: '¿Te apuntas?', sub: 'Cuando se llenan los 15, arranca', cta: 'Responde para apartar' });
  if (tt.trio || tt.duo) tanda(tt.carpeta, '09-proxima-tanda-publicacion', { tipo: 'trio', formato: 'feed', oscuro: true, imgs: (tt.trio || tt.duo).map(R), kicker: 'Próxima tanda', titulo: `Tanda de ${tt.plural}`, sub: `15 personas · 15 días · un${tt.cosa === 'pantalón' ? '' : 'a'} ${tt.cosa} para cada quien`, cta: 'Aparta tu lugar' });
  for (let n = 1; n <= 15; n++) tanda(`${tt.carpeta}/Avance diario`, `Dia ${String(n).padStart(2, '0')}`, { tipo: 'tanda-dia', formato: 'historia', icono: tt.icono, n, kicker: k,
    titulo: `Hoy se entrega ${tt.cosa === 'pantalón' ? 'el' : 'la'} ${tt.cosa} #${n}`, sub: n === 15 ? '¡Tanda completa! Gracias por cumplir' : `Faltan ${15 - n} · ¡Gracias por cumplir!` });
}
/* chamarras o lociones: que voten */
const VS = { kicker: 'Después de pantalones…', titulo: '¿Qué tanda sigue?', lados: [['A', [R(89)], 'Chamarras'], ['B', [R(56), R(57)], 'Lociones']], sub: 'Vota en los comentarios: A o B' };
tanda('4 Chamarras o lociones', '01-vota-publicacion', { tipo: 'tanda-versus', formato: 'feed', ...VS });
tanda('4 Chamarras o lociones', '02-vota-historia', { tipo: 'tanda-versus', formato: 'historia', ...VS, sub: 'Responde A o B' });
tanda('4 Chamarras o lociones', '03-tanda-chamarras-publicacion', { tipo: 'tanda-15', formato: 'feed', img: F(94), kicker: 'Tanda de chamarras', cosa: 'chamarra', sub: 'Das poquito al día y en 15 días todos tienen su chamarra', cta: 'Quiero mi lugar' });
tanda('4 Chamarras o lociones', '04-tanda-lociones-publicacion', { tipo: 'tanda-15', formato: 'feed', img: F(56), kicker: 'Tanda de lociones', cosa: 'loción', sub: 'Das poquito al día y en 15 días todos tienen su loción', cta: 'Quiero mi lugar' });
tanda('4 Chamarras o lociones', '05-chamarras-cuentas-publicacion', { tipo: 'tanda-formula', formato: 'feed', kicker: 'Tanda de chamarras', cosa: 'chamarra', titulo: '= un pago chiquito al día', sub: 'Tu chamarra en 15 partes, sin sentirlo', cta: 'Aparta tu lugar' });
tanda('4 Chamarras o lociones', '06-lociones-cuentas-publicacion', { tipo: 'tanda-formula', formato: 'feed', kicker: 'Tanda de lociones', cosa: 'loción', titulo: '= un pago chiquito al día', sub: 'Tu loción en 15 partes, sin sentirlo', cta: 'Aparta tu lugar' });

writeFileSync(DIR + 'plan.json', JSON.stringify(plan, null, 1));
console.log('anuncios:', plan.length, '· de días:', plan.filter((o) => o.arch.startsWith('Dia')).length, '· de tandas:', plan.filter((o) => o.arch.startsWith('Tandas')).length);
