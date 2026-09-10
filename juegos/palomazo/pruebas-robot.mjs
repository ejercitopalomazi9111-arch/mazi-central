#!/usr/bin/env node
/* El robot de PALOMAZO: juega una canción entera tocando en el instante en
   que cada nota SUENA, y reporta el juicio. Es la única prueba que dice si el
   motor de ritmo sirve — leer el código no lo dice.

   Uso:  node juegos/palomazo/pruebas-robot.mjs [seis|cables|halcon|palomazo]
   Necesita el repo servido en 8795:  python3 -m http.server 8795
*/
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium ?? pw.default.chromium;
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--autoplay-policy=no-user-gesture-required'] });
const pg = await (await nav.newContext({ viewport:{width:390,height:844} })).newPage();
pg.on('pageerror', e => console.log('PAGEERROR:', e.message));
await pg.goto('http://127.0.0.1:8795/juegos/palomazo/', { waitUntil:'load' });
await pg.waitForTimeout(400);

const cual = process.argv[2] || 'seis';
const r = await pg.evaluate(async (id) => {
  const P = window.PALOMAZO;
  const todas = P.CANCIONES.concat(P.PIEZAS || []);
  const cual = todas.find(c => c.id === id);
  if(!cual) return { error:'no existe esa canción: ' + id +
                     ' · hay: ' + todas.map(c=>c.id).join(', ') };
  P.lanzar(cual);
  await new Promise(r => setTimeout(r, 60));
  if(!P.J.activo) return { error:'no arrancó' };

  /* El robot: en cada cuadro toca las notas que ya están en la ventana
     perfecta, y suelta las largas cuando toca. */
  const sostenidas = [];
  return await new Promise(listo => {
    const tic = () => {
      if(!P.J.activo){
        listo({ ...P.J.cuenta, puntos:P.J.puntos, racha:P.J.mejorCombo,
                energia:Math.round(P.J.energia) });
        return;
      }
      /* ⚠ EL ROBOT NO PUEDE USAR `pasoAhora()`: es la misma función que el
         juicio, así que si el reloj del juicio se desplaza, el robot se
         desplaza con él y sigue atinando. Ya me pasó: le metí 120 ms de
         desfase y la prueba siguió en verde, midiendo con la regla chueca.

         Toca contra el reloj del AUDIO comparado con el instante en que la
         nota SUENA — que es exactamente lo que hace el agendador de fondo, y
         es lo único que oye una persona. Si el juicio se corre respecto al
         sonido, esto tiene que ponerse rojo. */
      const ahora = P.A.ctx.currentTime;
      for(const n of P.J.notas){
        if(n.est !== 0) continue;
        const tSuena = P.J.t0 + n.p * P.J.pasoDur;
        if(tSuena - ahora > 1) break;
        if(Math.abs(ahora - tSuena) <= 0.018){ P.tocar(n.carril); }
      }
      for(let c=0;c<3;c++){
        const s = P.J.sost[c];
        if(s && ahora >= P.J.t0 + (s.sostHasta - 0.2) * P.J.pasoDur) P.soltar(c);
      }
      requestAnimationFrame(tic);
    };
    requestAnimationFrame(tic);
  });
}, cual);
console.log(cual, '→', r);
await nav.close();
