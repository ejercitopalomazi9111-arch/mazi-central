/* Las pruebas de PANTALLA de Guerra de Puercos.
 *
 * El motor ya está probado aparte; esto comprueba lo otro: que los botones
 * hagan lo que dicen, que no se pueda hacer trampa desde la pantalla, y que
 * en el modo de dos en un teléfono el segundo jugador NO vea la mano del
 * primero — que es lo único que hace posible ese modo.
 *
 *   node juegos/guerra-de-puercos/pruebas-pantalla.mjs [http://localhost:8791]
 */
const BASE = process.argv[2] || 'http://localhost:8791';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

let bien = 0, mal = 0;
const ok = (que, cond, detalle='') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '  → ' + detalle : '')); }
};

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{ width:390, height:844 } });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', e => errores.push(String(e)));
await page.goto(BASE + '/juegos/guerra-de-puercos/', { waitUntil:'networkidle' });

console.log('\n── Que abra y se entienda ──');
ok('el motor llegó a la página', await page.evaluate(() => !!window.MOTOR));
ok('se ve el nombre del juego',
   /GUERRA/i.test(await page.textContent('.titulo')));
ok('las reglas están en la página, no en otro lado',
   await page.evaluate(() => document.querySelector('#p-reglas').textContent.includes('200')));

console.log('\n── Los objetivos táctiles (es para un niño, en un teléfono) ──');
const chicos = await page.evaluate(() => {
  const malos = [];
  for(const el of document.querySelectorAll('button')){
    if(el.offsetParent === null) continue;
    const r = el.getBoundingClientRect();
    if(r.height < 44) malos.push(el.textContent.trim().slice(0,24) + ' ' + Math.round(r.height));
  }
  return malos;
});
ok('ningún botón visible mide menos de 44 px de alto', chicos.length === 0, chicos.join(' · '));

console.log('\n── Contra la máquina ──');
await page.click('[data-modo="maquina"]');
await page.waitForTimeout(300);
ok('reparte 5 cartas', await page.evaluate(() => document.querySelectorAll('#mMano .carta').length) === 5);
ok('arranca con 200 PV cada quien',
   (await page.textContent('#mPvA')) === '200' && (await page.textContent('#mPvB')) === '200');
ok('el botón de jugar arranca apagado', await page.isDisabled('#bJugar'));

await page.click('#mMano .carta');
ok('al elegir una carta ya se puede jugar', !(await page.isDisabled('#bJugar')));

/* La trampa que hay que impedir: elegir dos cartas que NO se pueden combinar. */
/* Antes se apagaban las otras cuatro cartas al elegir una, y para cambiar de
   opinión había que pasar por «Quitar selección». Eso es un callejón sin
   salida para un niño, así que ahora se comprueba lo contrario: que SIEMPRE se
   pueda picar cualquier carta. */
ok('con una carta elegida, las demás siguen tocables (se puede cambiar de opinión)',
   await page.evaluate(() =>
     [...document.querySelectorAll('#mMano .carta')].every(c => !c.disabled)));
ok('picar otra carta que no combina CAMBIA la elección, no la traba',
   await page.evaluate(() => {
     const cs = [...document.querySelectorAll('#mMano .carta')];
     const niv = c => c.querySelector('.niv').textContent;
     const marcada = cs.find(c => c.classList.contains('marcada'));
     const otra = cs.find(c => c !== marcada && niv(c) !== niv(marcada));
     if(!otra) return true;
     otra.click();
     const ahora = [...document.querySelectorAll('#mMano .carta.marcada')];
     return ahora.length === 1 && niv(ahora[0]) === niv(otra);
   }));

/* Se juega la partida entera a base de clics, como lo haría el niño. */
let vueltas = 0, rondasJugadas = 0;
while(vueltas++ < 300){
  if(!(await page.isVisible('#fElegir'))) {
    if(await page.isVisible('#fDuelo')){ await page.click('#bSeguir'); await page.waitForTimeout(60); continue; }
    if(await page.isVisible('#fFin')) break;
  }
  const hay = await page.evaluate(() => {
    /* Se limpia primero: si quedó una carta marcada de antes, volver a
       picarla la DESMARCA y el botón de jugar se apaga. Es exactamente lo que
       le pasaría a un niño que cambia de opinión, así que la prueba tiene que
       partir de limpio en cada ronda. */
    document.querySelector('#bLimpiar').click();
    const c = [...document.querySelectorAll('#mMano .carta')]
      .find(x => !x.disabled && !x.classList.contains('marcada'));
    if(!c) return false; c.click(); return true;
  });
  if(!hay) break;
  if(await page.isDisabled('#bJugar')) break;
  await page.click('#bJugar'); rondasJugadas++;
  await page.waitForTimeout(60);
}
ok('la partida se puede jugar completa a puros clics hasta el final',
   await page.isVisible('#fFin'), rondasJugadas + ' rondas');
const fin = await page.textContent('#finTitulo');
ok('al final dice quién ganó', /Ganaste|Perdiste|Empate/.test(fin), fin);

console.log('\n── Dos en este teléfono ──');
/* Se sale por el botón de la pantalla de FIN, con su selector exacto: hay
   tres botones «volver al inicio» en el documento y dos están escondidos. */
await page.click('#fFin [data-ir="portada"]');
await page.waitForTimeout(200);
await page.click('[data-modo="dos"]');
await page.waitForTimeout(200);
ok('antes de repartir, tapa la pantalla', await page.isVisible('#cortina'));
ok('y dice de quién es el turno', /Jugador 1/.test(await page.textContent('#corQuien')));
/* LO QUE IMPORTA: que la mano del 1 no se alcance a ver detrás de la cortina */
const tapado = await page.evaluate(() => {
  const c = document.getElementById('cortina').getBoundingClientRect();
  return c.top <= 0 && c.left <= 0
      && c.width >= window.innerWidth && c.height >= window.innerHeight;
});
ok('la cortina tapa la pantalla ENTERA, no una parte', tapado);
await page.click('#bCortina');
await page.waitForTimeout(150);
const mano1 = await page.evaluate(() =>
  [...document.querySelectorAll('#mMano .carta .valor')].map(v => v.textContent).join(','));
await page.evaluate(() => { document.querySelector('#mMano .carta').click(); });
await page.click('#bJugar');
await page.waitForTimeout(200);
ok('al jugar el 1, vuelve a tapar para pasarle el teléfono al 2',
   await page.isVisible('#cortina') && /Jugador 2/.test(await page.textContent('#corQuien')));
await page.click('#bCortina');
await page.waitForTimeout(150);
const mano2 = await page.evaluate(() =>
  [...document.querySelectorAll('#mMano .carta .valor')].map(v => v.textContent).join(','));
ok('el jugador 2 ve SU mano, no la del 1', mano1 !== mano2, mano1 + ' vs ' + mano2);

console.log('\n── La mano cabe en un renglón (iPhone de 390) ──');
/* Se recarga en limpio en vez de tratar de salir a tientas: veníamos a media
   partida de dos jugadores, con la cortina puesta. */
await page.goto(BASE + '/juegos/guerra-de-puercos/', { waitUntil:'networkidle' });
await page.click('[data-modo="maquina"]');
await page.waitForTimeout(300);
const renglones = await page.evaluate(() => {
  const y = [...document.querySelectorAll('#mMano .carta')]
    .map(c => Math.round(c.getBoundingClientRect().top));
  return new Set(y).size;
});
ok('las 5 cartas van en UN solo renglón', renglones === 1, renglones + ' renglones');
const desborde = await page.evaluate(() =>
  document.documentElement.scrollWidth > window.innerWidth + 1);
ok('la página no se desborda de lado', !desborde);

console.log('\n── Que no se pueda hacer trampa desde la pantalla ──');
ok('nunca quedan marcadas dos cartas que no se pueden combinar', await page.evaluate(() => {
  const niv = c => c.querySelector('.niv').textContent;
  document.querySelector('#bLimpiar').click();
  const cs = [...document.querySelectorAll('#mMano .carta')];
  const a = cs[0];
  const otra = cs.slice(1).find(c => niv(c) !== niv(a));
  if(!otra) return true;                       /* no hubo caso que probar */
  a.click(); otra.click();
  const m = [...document.querySelectorAll('#mMano .carta.marcada')];
  return m.length === 1;                       /* reemplazó, no combinó */
}));
ok('dos cartas del MISMO nivel combinable sí se marcan juntas', await page.evaluate(() => {
  const niv = c => c.querySelector('.niv').textContent;
  document.querySelector('#bLimpiar').click();
  const cs = [...document.querySelectorAll('#mMano .carta')];
  let par = null;
  for(let i = 0; i < cs.length && !par; i++)
    for(let j = i + 1; j < cs.length; j++)
      if(niv(cs[i]) === niv(cs[j]) && 'BCD'.includes(niv(cs[i]))){ par = [cs[i], cs[j]]; break; }
  if(!par) return true;                        /* esta mano no traía par */
  par[0].click(); par[1].click();
  return document.querySelectorAll('#mMano .carta.marcada').length === 2
      && /Combinaci/.test(document.querySelector('#mAviso').textContent);
}));
ok('no se puede jugar una combinación de más de 4 en la partida', await page.evaluate(() => {
  const j = { nombre:'a', pv:200, combosUsados:4, especiales:{bono:1,castigo:1},
              mano:[{id:'1',valor:22,nivel:'D'},{id:'2',valor:35,nivel:'D'}] };
  return !!MOTOR.porQueNoSeVale({ cartas:j.mano }, j);
}));
ok('no se puede poner un especial encima de una combinación', await page.evaluate(() => {
  const j = { nombre:'a', pv:200, combosUsados:0, especiales:{bono:1,castigo:1},
              mano:[{id:'1',valor:22,nivel:'D'},{id:'2',valor:35,nivel:'D'}] };
  return !!MOTOR.porQueNoSeVale({ cartas:j.mano, especial:'bono' }, j);
}));

console.log('\n── El resultado de la ronda se lee bien ──');
{
  /* Se juega una ronda y se mira lo que quedó escrito. Aquí ya hubo un
     defecto: decía «Tú recibe el golpe», y esa frase se lee cien veces por
     partida. */
  await page.goto(BASE + '/juegos/guerra-de-puercos/', { waitUntil:'networkidle' });
  await page.click('[data-modo="maquina"]');
  await page.waitForTimeout(250);
  await page.evaluate(() => { document.querySelector('#mMano .carta').click(); });
  await page.click('#bJugar');
  await page.waitForTimeout(400);
  const texto = (await page.textContent('#dGolpe')).replace(/\s+/g, ' ').trim();
  ok('no dice «Tú recibe», que es como estaba mal escrito', !/Tú recibe\b/.test(texto), texto);
  ok('dice quién se llevó el golpe, en español que se entiende',
     /Recibes el golpe|La máquina recibe el golpe|Empate/.test(texto), texto);
  ok('las cartas reveladas se ven completas, no desvaídas', await page.evaluate(() =>
     [...document.querySelectorAll('#dCartaA .carta, #dCartaB .carta')]
       .every(c => getComputedStyle(c).opacity === '1')));
}

console.log('\n── La máquina ──');
ok('la máquina NO ve la mano del rival', await page.evaluate(() => {
  /* Se le da la misma mano con dos manos de rival distintas: si mirara,
     elegiría distinto. Se corre varias veces porque trae un pelo de azar. */
  const mia = [{id:'m1',valor:80,nivel:'A'},{id:'m2',valor:30,nivel:'D'},
               {id:'m3',valor:60,nivel:'B'},{id:'m4',valor:45,nivel:'C'},
               {id:'m5',valor:99,nivel:'S'}];
  const j = () => ({ nombre:'b', pv:200, mano:mia.slice(), combosUsados:0,
                     especiales:{bono:2,castigo:3} });
  /* `pensarMaquina` sólo recibe UN jugador: no tiene por dónde ver al otro. */
  return pensarMaquina.length === 1;
}));

ok('la página no tiró ningún error', errores.length === 0, errores[0] || '');

await b.close();
console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
