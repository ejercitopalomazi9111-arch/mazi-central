/* Pruebas de la app de entrenamiento ISTQB.
   Se juega la app entera, no se lee el código: se resuelven los cincuenta
   niveles con la clave que la propia página trae, y se comprueba lo que sale.

     node guias/istqb-ctfl/entrenamiento/pruebas.mjs [http://127.0.0.1:8791]

   Lo que estas pruebas SÍ pueden cachar, y por qué está cada una:
   · que un nivel quede sin respuesta correcta alcanzable (se juegan los 50)
   · que el avance no sobreviva a recargar la página
   · que un nombre con HTML se ejecute en la constancia
   · que algo se salga de la pantalla del teléfono
   · que un control quede por debajo de los 44 px que exige el dedo */
const BASE = process.argv[2] || 'http://127.0.0.1:8791';
const RUTA = BASE + '/guias/istqb-ctfl/entrenamiento/';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;

let bien = 0, mal = 0;
const ok = (que, cond, detalle = '') => {
  if(cond){ bien++; console.log('  ✓ ' + que); }
  else { mal++; console.log('  ✗ ' + que + (detalle ? '  → ' + detalle : '')); }
};

const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const abrir = async (ancho = 390, alto = 844) => {
  const ctx = await nav.newContext({ viewport:{ width:ancho, height:alto }, hasTouch:ancho < 700 });
  const p = await ctx.newPage();
  p.__errores = [];
  p.on('pageerror', e => p.__errores.push(String(e)));
  await p.goto(RUTA, { waitUntil:'networkidle' });
  return p;
};

/* ── 1 · LA ENTRADA ──────────────────────────────────────────────────── */
console.log('\n── la entrada ──');
{
  const p = await abrir();
  ok('arranca en la portada', await p.locator('#pPortada').isVisible());
  ok('el aviso dice que NO es la certificación ISTQB',
     (await p.locator('.aviso-legal').textContent()).includes('No son la certificación ISTQB'));

  await p.fill('#fNombre', 'Ana');
  await p.click('#fEntrar button[type=submit]');
  ok('un nombre de una sola palabra no deja pasar', await p.locator('#pPortada').isVisible());
  ok('y lo dice con un error visible', await p.locator('#errNombre').isVisible());

  await p.fill('#fNombre', '  María   Fernanda  Reyes ');
  await p.click('#fEntrar button[type=submit]');
  ok('con nombre completo entra al mapa', await p.locator('#pMapa').isVisible());
  ok('y le quita los espacios de más al nombre',
     (await p.locator('#quien').textContent()).trim() === 'María Fernanda Reyes',
     await p.locator('#quien').textContent());
  ok('sin errores de JavaScript', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

/* ── 2 · EL MAPA Y EL CANDADO ────────────────────────────────────────── */
console.log('\n── el mapa y el orden ──');
const entrar = async (p, nombre = 'María Fernanda Reyes') => {
  await p.fill('#fNombre', nombre);
  await p.click('#fEntrar button[type=submit]');
};
{
  const p = await abrir();
  await entrar(p);
  ok('hay 50 casillas', await p.locator('.casilla').count() === 50);
  ok('la 1 está abierta', !(await p.locator('.casilla').nth(0).isDisabled()));
  ok('la 2 está cerrada', await p.locator('.casilla').nth(1).isDisabled());
  ok('la 50 está cerrada', await p.locator('.casilla').nth(49).isDisabled());
  ok('el botón de constancias NO se ve todavía', await p.locator('#bCertificados').isHidden());
  ok('el avance dice 0', (await p.locator('#mHechos').textContent()) === '0');
  await p.context().close();
}

/* ── 3 · UN NIVEL, CON TODO ──────────────────────────────────────────── */
console.log('\n── un nivel por dentro ──');
{
  const p = await abrir();
  await entrar(p);
  await p.locator('.casilla').nth(0).click();
  ok('se abre el nivel', await p.locator('#pNivel').isVisible());
  ok('«Siguiente» empieza apagado', await p.locator('#bSiguiente').isDisabled());
  ok('«Comprobar» empieza apagado, sin respuesta elegida', await p.locator('#bComprobar').isDisabled());

  /* respuesta equivocada a propósito: el nivel 1 es de opción y la buena es la a */
  await p.locator('.opcion').nth(1).click();
  ok('al elegir, «Comprobar» se enciende', !(await p.locator('#bComprobar').isDisabled()));
  await p.click('#bComprobar');
  ok('una respuesta mala da veredicto negativo', await p.locator('#nVeredicto .veredicto.mal').isVisible());
  ok('y NO desbloquea «Siguiente»', await p.locator('#bSiguiente').isDisabled());

  await p.click('#bPista');
  ok('la primera pista aparece', await p.locator('#nPistas .pista').count() === 1);
  await p.click('#bPista'); await p.click('#bPista');
  ok('salen las tres pistas', await p.locator('#nPistas .pista').count() === 3);
  ok('y el botón de pista se esconde al acabarse', await p.locator('#bPista').isHidden());

  await p.click('#bManual');
  ok('el paso a paso aparece con sus pasos', await p.locator('#nPasos li').count() >= 3);
  ok('y su botón se esconde', await p.locator('#bManual').isHidden());

  await p.locator('.opcion').nth(0).click();
  await p.click('#bComprobar');
  ok('la respuesta buena da veredicto positivo', await p.locator('#nVeredicto .veredicto.bien').isVisible());
  ok('y enciende «Siguiente»', !(await p.locator('#bSiguiente').isDisabled()));

  await p.click('#bVolver');
  ok('el mapa marca el 1 como hecho',
     (await p.locator('.casilla').nth(0).getAttribute('class')).includes('hecho'));
  ok('y abre el 2', !(await p.locator('.casilla').nth(1).isDisabled()));
  ok('sin errores de JavaScript', p.__errores.length === 0, p.__errores[0]);
  await p.context().close();
}

/* ── 4 · LOS CINCUENTA, JUGADOS ──────────────────────────────────────── */
console.log('\n── los cincuenta niveles, resueltos con la clave de la página ──');
const jugarTodo = async (p) => {
  const claves = await p.evaluate(() => NIVELES.map(x => ({
    n:x.n, tipo:x.tipo, correcta:x.correcta, correctas:x.correctas, respuesta:x.respuesta })));
  const fallos = [];
  for(const k of claves){
    await p.evaluate(n => { document.querySelectorAll('.casilla')[n-1].click(); }, k.n);
    await p.waitForTimeout(20);
    if(k.tipo === 'opcion') await p.locator('.opcion').nth(k.correcta).click();
    else if(k.tipo === 'multi'){ for(const i of k.correctas) await p.locator('.opcion').nth(i).click(); }
    else await p.fill('#nNum', String(k.respuesta));
    await p.click('#bComprobar');
    await p.waitForTimeout(20);
    if(!(await p.locator('#nVeredicto .veredicto.bien').isVisible())) fallos.push(k.n);
    await p.click('#bVolver');
    await p.waitForTimeout(20);
  }
  return fallos;
};
let paginaLlena = null;
{
  const p = await abrir();
  await entrar(p);
  const fallos = await jugarTodo(p);
  ok('los 50 niveles se resuelven con su propia clave', fallos.length === 0,
     'fallan los niveles ' + fallos.join(', '));
  ok('el contador llega a 50', (await p.locator('#mHechos').textContent()) === '50');
  ok('las 50 casillas quedan marcadas', await p.locator('.casilla.hecho').count() === 50);
  ok('aparece el botón de constancias', await p.locator('#bCertificados').isVisible());
  ok('sin errores de JavaScript en toda la partida', p.__errores.length === 0, p.__errores[0]);
  paginaLlena = p;
}

/* ── 5 · LAS CONSTANCIAS ─────────────────────────────────────────────── */
console.log('\n── las constancias ──');
{
  const p = paginaLlena;
  await p.click('#bCertificados');
  ok('salen dos constancias', await p.locator('.diploma').count() === 2);
  const t = await p.locator('#nDiplomas').textContent();
  ok('llevan el nombre de la persona', t.includes('María Fernanda Reyes'));
  ok('la primera dice curso completado', t.includes('Constancia de curso completado'));
  ok('la segunda dice preparación para el examen', t.includes('Constancia de preparación'));
  ok('llevan folio', /GM-CTFL-\d{8}-[A-Z0-9]{6}/.test(t), t.slice(0,120));
  ok('DICEN que no son la certificación ISTQB',
     t.includes('No es la certificación ISTQB') && t.includes('validez ante ISTQB'));
  ok('dicen 50 de 50', t.includes('50 de 50'));

  /* el folio no puede cambiar entre visitas: si cambia no sirve para verificar */
  const f1 = (t.match(/GM-CTFL-\d{8}-[A-Z0-9]{6}/) || [])[0];
  await p.click('#bVolverMapa'); await p.click('#bCertificados');
  const f2 = ((await p.locator('#nDiplomas').textContent()).match(/GM-CTFL-\d{8}-[A-Z0-9]{6}/) || [])[0];
  ok('el folio es el mismo cada vez que se abren', f1 === f2, f1 + ' vs ' + f2);

  await p.reload({ waitUntil:'networkidle' });
  ok('al recargar, el avance sigue ahí', (await p.locator('#mHechos').textContent()) === '50');
  await p.context().close();
}

/* ── 6 · UN NOMBRE CON HTML ──────────────────────────────────────────── */
console.log('\n── un nombre con HTML dentro ──');
{
  const p = await abrir();
  await entrar(p, 'Ana <img src=x onerror="window.__roto=1"> Pérez');
  await p.evaluate(() => {
    /* se rellena el avance a mano para llegar a las constancias sin jugar 50 */
    const d = JSON.parse(localStorage.getItem('mazi_istqb_v1'));
    d.hechos = []; for(let i = 1; i <= 50; i++) d.hechos.push(i);
    localStorage.setItem('mazi_istqb_v1', JSON.stringify(d));
  });
  await p.reload({ waitUntil:'networkidle' });
  await p.click('#bCertificados');
  ok('el nombre con HTML sale como TEXTO, no se ejecuta',
     await p.evaluate(() => !window.__roto));
  ok('y no aparece ninguna etiqueta img en la constancia',
     await p.locator('#nDiplomas img').count() === 0);
  ok('pero el texto sí se lee completo',
     (await p.locator('.diploma .nombre').first().textContent()).includes('onerror'));
  await p.context().close();
}

/* ── 7 · LAS PROPORCIONES ────────────────────────────────────────────── */
console.log('\n── las proporciones ──');
for(const [ancho, como] of [[390,'teléfono'], [1100,'computadora']]){
  const p = await abrir(ancho, 900);
  await entrar(p);
  const revisar = async (donde) => {
    const f = await p.evaluate((ancho) => {
      const desbordan = [], chicos = [];
      const doc = document.documentElement;
      const pagina = doc.scrollWidth > ancho + 1;
      document.querySelectorAll('.pantalla.viva *').forEach(el => {
        const r = el.getBoundingClientRect();
        if(!r.width && !r.height) return;
        if(r.right > ancho + 1 || r.left < -1){
          const cs = getComputedStyle(el);
          if(cs.overflowX !== 'auto' && cs.overflowX !== 'scroll')
            desbordan.push((el.className || el.tagName) + ' ' + Math.round(r.right));
        }
      });
      document.querySelectorAll('.pantalla.viva button, .pantalla.viva input').forEach(el => {
        const r = el.getBoundingClientRect();
        if(r.height && r.height < 44) chicos.push((el.id || el.className) + ' ' + Math.round(r.height));
      });
      return { pagina, desbordan, chicos };
    }, ancho);
    ok(donde + ': la página no se va de lado', !f.pagina);
    ok(donde + ': nada se sale de la pantalla', f.desbordan.length === 0, f.desbordan.slice(0,3).join(' · '));
    ok(donde + ': ningún control mide menos de 44 px', f.chicos.length === 0, f.chicos.slice(0,3).join(' · '));
  };
  console.log('  · a ' + ancho + ' px (' + como + ')');
  await revisar('mapa');
  await p.locator('.casilla').nth(0).click();
  await p.click('#bPista'); await p.click('#bManual');
  await revisar('nivel');
  await p.context().close();
}

await nav.close();
console.log('\n' + (mal ? '✗ ' : '✓ ') + bien + '/' + (bien + mal) + ' pruebas de la app de entrenamiento');
process.exit(mal ? 1 : 0);
