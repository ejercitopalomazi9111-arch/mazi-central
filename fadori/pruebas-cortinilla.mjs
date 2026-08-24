/* Las pruebas de la cortinilla — la hamburguesa que se arma al abrir.
 *
 * Por qué existe, aparte: Carlos la vio y dijo "está medio chafa". Al medirla
 * salieron tres defectos que NINGUNA prueba de las que ya había podía cachar,
 * porque las pruebas de la página revisan datos y texto, no tiempos:
 *
 *   1. las capas caían FRENANDO, como un panel de interfaz, no acelerando
 *      como algo que se cae — ése era el defecto de fondo;
 *   2. la torre no reaccionaba a los golpes: cada capa aterrizaba y todo lo
 *      de abajo se quedaba como piedra;
 *   3. el nombre entraba medio segundo después del último golpe, así que el
 *      final se leía como dos cosas sueltas.
 *
 * Los tres son de RITMO, y el ritmo no se ve leyendo el CSS: hay que rebobinar
 * la animación de verdad en un navegador de verdad. Eso hace esto.
 *
 *   node fadori/pruebas-cortinilla.mjs [http://localhost:8781]
 */
const BASE = process.argv[2] || 'http://localhost:8781';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

let bien = 0, mal = 0;
const ok = (que, cond, detalle='') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '  → ' + detalle : '')); }
};

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:390,height:844} });
const pg = await ctx.newPage();
const errores = [];
pg.on('pageerror', e => errores.push(e.message));
await pg.goto(BASE + '/fadori/index.html');
await pg.waitForSelector('.burger .pan-arriba');

const d = await pg.evaluate(() => {
  const burger = document.querySelector('.burger');
  const torre  = burger.getAnimations().find(a => a.animationName === 'torre-golpes');

  // Rebobinamos la torre a mano. Usar el reloj de pared no sirve: la animación
  // arranca al primer pintado y cualquier medición llega tarde.
  // Si la torre no existe se devuelve la curva vacía en vez de tronar: una
  // prueba que se cae no reporta nada, y justo el caso que hay que reportar es
  // que alguien le quitó la animación a la torre.
  const curva = [];
  if(torre){
    for(let t = 0; t <= 2000; t += 5){
      torre.currentTime = t;
      curva.push([t, new DOMMatrixReadOnly(getComputedStyle(burger).transform).d]);
    }
  }

  const capas = [...burger.querySelectorAll('.cap')]
    .filter(c => !c.classList.contains('sombra'))
    .map(c => {
      const a = c.getAnimations().find(x => x.animationName === 'cae');
      const { delay, duration } = a.effect.getTiming();
      return { capa: c.className.replace('cap ',''), delay, duration,
               aterriza: delay + duration * 0.72 };
    }).sort((a,b) => a.aterriza - b.aterriza);

  // ¿la caída ACELERA? Medimos la altura de una capa a un cuarto de su caída.
  // Si va acelerando ha bajado MENOS de un cuarto del camino; si va frenando
  // (la curva de interfaz) ya lleva más de la mitad.
  const cap = burger.querySelector('.carne');
  const caida = cap.getAnimations().find(x => x.animationName === 'cae');
  // OJO: `currentTime` cuenta desde el arranque del RETARDO, no desde que la
  // capa empieza a moverse. Sin sumar el retardo se muestrea tres veces la
  // capa quieta y la cuenta sale NaN.
  const { delay: dRet, duration: dDur } = caida.effect.getTiming();
  const alturaEn = f => { caida.currentTime = dRet + dDur * f;
                          return cap.getBoundingClientRect().top; };
  const y0 = alturaEn(0.001), yFin = alturaEn(0.72), yCuarto = alturaEn(0.25);
  const avance = (yCuarto - y0) / (yFin - y0);

  const marca = document.querySelector('.cort-marca').getAnimations()[0].effect.getTiming();
  const pie   = document.querySelector('.cort-pie').getAnimations()[0].effect.getTiming();

  // ¿el pan de arriba se sale de la pantalla mientras cae?
  const arriba = burger.querySelector('.pan-arriba');
  const suCaida = arriba.getAnimations().find(x => x.animationName === 'cae');
  suCaida.currentTime = 0;
  const masAlto = arriba.getBoundingClientRect().top;

  return { curva, capas, avance, marca, pie, masAlto,
           sombra: !!burger.querySelector('.sombra')
                     .getAnimations().find(x => x.animationName === 'sombra-golpes') };
});

// mínimos locales de la escala vertical = los apretones de la torre
const golpes = [];
for(let i = 1; i < d.curva.length - 1; i++){
  const [t, s] = d.curva[i];
  if(s < d.curva[i-1][1] && s <= d.curva[i+1][1] && s < 0.999) golpes.push({ t, s });
}

console.log('\n── la caída ──');
ok('las capas caen ACELERANDO, no frenando',
   d.avance < 0.25,
   `a un cuarto del tiempo ya bajó el ${(d.avance*100).toFixed(0)}% del camino ` +
   `(acelerando <25 %, frenando >50 %)`);

console.log('\n── la torre siente cada golpe ──');
ok('la torre trae su animación de golpes', d.curva.length > 0,
   'sin ella cada capa aterriza sobre piedra y se ve de calcomanía');
d.capas.forEach(c => {
  const g = golpes.find(g => Math.abs(g.t - c.aterriza) <= 25);
  ok(`«${c.capa}» aterriza en ${(c.aterriza/1000).toFixed(2)} s y la torre se aprieta ahí`,
     !!g, g ? '' : 'la torre no reaccionó — la capa cae sobre piedra');
});

console.log('\n── una capa aterrizada nunca destapa a la de abajo ──');
// El reporte de Carlos: «el ingrediente que cae se comprime más de lo que hace
// alguno de los de abajo y se logra ver el de abajo». El queso tapa el 100 % de
// la carne, así que basta que se encoja o se levante un pelo para destaparla.
// Desde el golpe hasta el final, una capa sólo puede taparlo todo o MÁS.
const destapes = await pg.evaluate(() => {
  const malos = [];
  document.querySelectorAll('.burger .cap:not(.sombra)').forEach(c => {
    const a = c.getAnimations().find(x => x.animationName === 'cae');
    const { delay, duration } = a.effect.getTiming();
    const capa = c.className.replace('cap ', '');
    // del golpe (72 %) al final, de 1 % en 1 %
    for(let f = 0.72; f <= 1.0001; f += 0.01){
      a.currentTime = delay + duration * Math.min(f, 1);
      const m = new DOMMatrixReadOnly(getComputedStyle(c).transform);
      const en = ' al ' + Math.round(f*100) + '% de su caída';
      if(m.a < 0.999) malos.push([capa, 'se angosta (scaleX ' + m.a.toFixed(3) + ')' + en]);
      if(m.d < 0.999) malos.push([capa, 'se encoge de alto (scaleY ' + m.d.toFixed(3) + ')' + en]);
      if(m.f < -0.5)  malos.push([capa, 'se levanta ' + (-m.f).toFixed(1) + ' px sobre su lugar' + en]);
      if(Math.abs(m.b) > 0.002) malos.push([capa, 'sigue ladeada' + en]);
    }
  });
  return malos;
});
const porCapa = {};
destapes.forEach(([c, q]) => { (porCapa[c] = porCapa[c] || []).push(q); });
['pan-abajo','carne','queso','jitomate','lechuga','pan-arriba'].forEach(capa => {
  ok('«' + capa + '» ya aterrizada no destapa nada de abajo',
     !porCapa[capa], porCapa[capa] ? porCapa[capa][0] : '');
});

// La prueba de arriba mira la transformación de CADA capa por separado. Ésta
// mira lo que de verdad se ve: el traslape en píxeles entre capas vecinas,
// rebobinando TODAS las animaciones a la vez — incluida la de la torre, que
// también escala a las capas y podría abrir un hueco sin que ninguna capa se
// mueva sola.
const traslapes = await pg.evaluate(() => {
  const orden = ['pan-abajo','carne','queso','jitomate','lechuga','pan-arriba'];
  const el = {}, cae = {}, fin = {};
  orden.forEach(c => {
    el[c] = document.querySelector('.burger .' + c);
    cae[c] = el[c].getAnimations().find(x => x.animationName === 'cae');
    const t = cae[c].effect.getTiming();
    // Se cuenta desde el GOLPE (72 % de su caída), no desde que la animación
    // termina. El destape se ve justo al aterrizar, y midiendo sólo el reposo
    // esta prueba pasaba con el bug puesto.
    fin[c] = t.delay + t.duration * 0.72;
  });
  const todas = [...document.querySelector('.burger').getAnimations(),
                 ...orden.flatMap(c => el[c].getAnimations())];
  const poner = t => todas.forEach(a => { a.currentTime = t; });

  // El traslape se mide EN PROPORCIÓN al alto de la capa de arriba, no en
  // píxeles. Si se mide en píxeles, el aplaste de la torre —que encoge TODO un
  // 6.5 % en el remate— sale como «pierde 2 px de traslape» cuando en realidad
  // no se abrió ningún hueco: la hamburguesa entera se hizo más bajita y el
  // traslape encogió con ella. Eso es lo correcto, y en proporción se ve igual.
  // El divisor es el alto de LA TORRE, no el de la capa. Dividir entre la capa
  // sale mal justo cuando la capa rebota creciendo: el traslape se queda igual
  // pero el divisor sube, y la fracción baja sola — daba un ✗ que no existía.
  // La torre es la referencia estable y además absorbe su propio aplaste, que
  // es lo que había que descontar.
  const caja = document.querySelector('.burger');
  const razon = i => {
    const a = el[orden[i-1]].getBoundingClientRect();
    const b = el[orden[i]].getBoundingClientRect();
    return (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
           / caja.getBoundingClientRect().height;
  };
  poner(2000);                                // en reposo: el traslape bueno
  const reposo = {};
  for(let i = 1; i < orden.length; i++) reposo[orden[i]] = razon(i);
  const peor = {};
  for(let t = 0; t <= 2000; t += 10){
    poner(t);
    for(let i = 1; i < orden.length; i++){
      const arriba = orden[i];
      // sólo cuentan las dos ya aterrizadas
      if(t < fin[arriba] || t < fin[orden[i-1]]) continue;
      const tr = razon(i);
      if(!(arriba in peor) || tr < peor[arriba][0]) peor[arriba] = [tr, t];
    }
  }
  return orden.slice(1).map(c => ({ capa: c, reposo: reposo[c],
                                    peor: peor[c] ? peor[c][0] : null,
                                    cuando: peor[c] ? peor[c][1] : null }));
});
traslapes.forEach(t => {
  const perdido = t.peor == null ? 1 : t.reposo - t.peor;
  ok('«' + t.capa + '» nunca se despega de la de abajo',
     t.peor != null && perdido <= 0.005,
     'en reposo se encima ' + (t.reposo*100).toFixed(1) + '% del alto de la torre y baja a ' +
     (t.peor*100).toFixed(1) + '% en ' + (t.cuando/1000).toFixed(2) + ' s');
});

console.log('\n── el ritmo ──');
const huecos = d.capas.slice(1).map((c,i) => c.aterriza - d.capas[i].aterriza);
ok('el ritmo se aprieta conforme sube la torre',
   huecos[0] > huecos[1] && huecos[1] > huecos[2] && huecos[2] > huecos[3],
   'huecos: ' + huecos.map(h => (h/1000).toFixed(2)).join(', ') + ' s');
ok('hay un respiro antes del pan de arriba',
   huecos[huecos.length-1] > huecos[huecos.length-2],
   'el remate necesita aire; sin él se pierde entre los otros golpes');

const remate = golpes.length ? golpes.reduce((a,g) => g.s < a.s ? g : a) : null;
const ultima = d.capas[d.capas.length-1];
ok('el golpe más fuerte es el del pan de arriba',
   remate && Math.abs(remate.t - ultima.aterriza) <= 25,
   remate ? `el más fuerte cayó en ${(remate.t/1000).toFixed(2)} s y el pan en ${(ultima.aterriza/1000).toFixed(2)} s`
          : 'no hubo ni un apretón de la torre');

console.log('\n── el remate ──');
const desfase = d.marca.delay - ultima.aterriza;
ok('el nombre entra EN el golpe del pan, no después',
   desfase >= 0 && desfase <= 120,
   `entra ${(desfase/1000).toFixed(2)} s después del golpe (antes eran 0.48 s ` +
   `y el final se leía como dos cosas sueltas)`);
ok('el pie entra después del nombre', d.pie.delay > d.marca.delay);
ok('la sombra late con los mismos golpes', d.sombra);

console.log('\n── que quepa ──');
ok('el pan de arriba no se sale de la pantalla al caer',
   d.masAlto > 0, `su punto más alto queda en ${Math.round(d.masAlto)} px`);

console.log('\n── el respeto al que pide menos movimiento ──');
const pg2 = await (await b.newContext({ viewport:{width:390,height:844},
                                        reducedMotion:'reduce' })).newPage();
await pg2.goto(BASE + '/fadori/index.html');
await pg2.waitForTimeout(500);
ok('con «menos movimiento» la cortinilla no sale',
   !(await pg2.evaluate(() => !!document.querySelector('.cortinilla'))));

console.log('\n── que se vaya sola ──');
const pg3 = await (await b.newContext({ viewport:{width:390,height:844} })).newPage();
await pg3.goto(BASE + '/fadori/index.html');
await pg3.waitForTimeout((d.pie.delay + d.pie.duration) + 150);
ok('la cortinilla sigue ahí cuando el pie acaba de entrar',
   await pg3.evaluate(() => !!document.querySelector('.cortinilla')),
   'se cerraba a media animación');
await pg3.waitForTimeout(1400);
ok('y a los ~3 s ya se fue sola',
   !(await pg3.evaluate(() => !!document.querySelector('.cortinilla'))));

ok('ningún error de JavaScript', errores.length === 0, errores.join(' · '));

await b.close();
console.log(`\nFadori cortinilla · ${bien}/${bien+mal} pruebas`);
process.exit(mal ? 1 : 0);
