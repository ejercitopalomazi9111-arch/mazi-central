#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LA PANTALLA DE TURNOS Y LA TABLET (10 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Lo que pidió Carlos, convertido en pruebas con varios aparatos a la vez
   (el mostrador, dos alumnos, la pantalla colgada y la tablet de la fila)
   contra el servidor:

     «el turno que toca en una esquina y en grande un episodio del podcast»
     «un timbre al cambiar de turno o al estar listo y que diga el número»
     «que el número de turno marque qué comida está saliendo»
     «opcional si quiere que se vea su nombre, sólo el pedido o sólo el código»
     «toque la pantalla … haga su pedido … le sale el número de turno»
     «¿quieres pedir algo más? cinco segundos y se cambia otra vez»
     «transiciones para los anuncios … un logo girando, como Televisa»

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-tele.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, aparato, tarda, mostrador, alumno, cerrar, CASA } = await abrirMesa('tele');

/* la pantalla: la voz se apunta en vez de sonar (en el servidor de pruebas no hay bocinas) */
async function pantalla(w = 1280, h = 800){
  const p = await aparato('/fadori/pantalla.html', { w, h });
  await p.addInitScript(() => {});
  await p.evaluate(() => {
    window.__dichos = [];
    if('speechSynthesis' in window) speechSynthesis.speak = (u) => window.__dichos.push(u.text);
  });
  await p.waitForFunction(() => window.TELE && window.TELE.listo, null, { timeout: 15000 });
  return p;
}

const most = await mostrador();
const ana = await alumno('Ana Pérez', '3B');
const beto = await alumno('Beto Ruiz', '2C');
const tv = await pantalla();
await tv.click('#bArranque').catch(() => {});

console.log('\n1 · el turno en la esquina, con lo que pidió y el nombre sólo si quiso');
const pedir = (pg, ver, prods) => pg.evaluate(([v, ps]) => {
  const F = FADORI, disp = F.productos(true).filter(p => p.disponible);
  return F.pedir(F.yo().codigo, ps.map(([i, c]) => ({ prod: disp[i].id, cant: c })), { ver: v }).id;
}, [ver, prods]);
const idA = await pedir(ana, 'nombre', [[0, 2], [1, 1]]);
const idB = await pedir(beto, 'pedido', [[2, 1]]);
ok('a la pantalla le llegan los dos pedidos', (await tarda(tv, ([a, b]) => !!FADORI.pedido(a) && !!FADORI.pedido(b), [idA, idB])) != null);
await tarda(most, ([a, b]) => !!FADORI.pedido(a) && !!FADORI.pedido(b), [idA, idB]);
await most.evaluate(id => { const F = FADORI; F.tomar(id, 'prueba'); F.marcarListo(id); }, idA);
const ms = await tarda(tv, id => document.querySelector('#llamando').dataset.turno === id, idA);
ok(`el de Ana sale en «Ya puede pasar» (${ms} ms)`, ms != null);
const esquina = await tv.textContent('#llamando');
ok('con su primer nombre, porque ella eligió «mi nombre»', /Ana/.test(esquina), esquina);
ok('sin su apellido ni su grupo', !/Pérez|3B/.test(await tv.textContent('body')));
ok('y con lo que pidió («2 …» del primer platillo)', /2 \S/.test(esquina), esquina);
ok('salió el letrero grande encima del programa', (await tarda(tv, () => document.querySelector('#llamado').classList.contains('sale'), null, 4000)) != null);
const dicho = await tarda(tv, () => window.__dichos.length > 0, null, 6000);
ok('y la voz dice el turno y su nombre', dicho != null && await tv.evaluate(() => /^Turno \d+\. Ana, tu pedido está listo\.$/.test(window.__dichos[0])), await tv.evaluate(() => window.__dichos.join(' | ')));
await most.evaluate(id => { const F = FADORI; F.tomar(id, 'prueba'); F.marcarListo(id); }, idB);
await tarda(tv, id => document.querySelector('#llamando').dataset.turno === id, idB);
const esq2 = await tv.textContent('#llamando');
ok('el de Beto sale con lo que pidió y SIN nombre (eligió «sólo mi pedido»)', !/Beto/.test(esq2) && esq2.length > 20, esq2);
await tv.waitForTimeout(7600);
ok('los avisos van en fila: también se dijo el de Beto, sin nombre', await tv.evaluate(() => window.__dichos.length >= 2 && /^Turno \d+\. tu pedido está listo\.$/.test(window.__dichos[1])), await tv.evaluate(() => window.__dichos.join(' | ')));
ok('Ana pasa a «También listos»', /Ana/.test(await tv.textContent('#bListos')));

console.log('\n2 · la tanda de anuncios con el logo que gira');
await tv.evaluate(() => { window.TELE.Programa.corte(); });
await tv.waitForTimeout(1400);
const enCorte = await tv.evaluate(() => { const c = document.querySelector('#tanda'); if(c.hidden) return null;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let luz = 0; for(let i = 0; i < d.length; i += 400) luz += d[i] + d[i + 1] + d[i + 2]; return luz; });
ok('la tanda se ve encima del programa (no en negro)', enCorte > 10000, enCorte);
ok('abre y cierra con el logo del canal, con anuncios en medio', await tv.evaluate(() => { const p = (window.__corte || {}).piezas || []; return p[0] === 'canal:rembrandt' && p[p.length - 1] === 'canal:rembrandt' && p.some(x => /^anuncio:/.test(x)) && p.some(x => /^ident:/.test(x)); }),
  await tv.evaluate(() => JSON.stringify(window.__corte)));
const t1 = await tv.evaluate(() => window.__corte.t);
ok('al terminar, como no hay episodios, empieza otra: la pantalla nunca se queda vacía', (await tarda(tv, t => window.__corte.t !== t, t1, 35000)) != null);

console.log('\n3 · el programa: un episodio cargado en la tablet, y el corte cada tantos minutos');
await tv.evaluate(async () => {
  /* un «episodio» de 6 s fabricado aquí mismo */
  const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d');
  const rec = new MediaRecorder(c.captureStream(20), { mimeType: 'video/webm' }), tr = []; rec.ondataavailable = e => tr.push(e.data);
  const fin = new Promise(r => rec.onstop = r); rec.start();
  const t0 = performance.now(); await new Promise(r => { const p = () => { g.fillStyle = '#0A6'; g.fillRect(0, 0, 320, 180); g.fillStyle = '#fff'; g.fillText(((performance.now() - t0) / 1000).toFixed(1), 20, 90); if(performance.now() - t0 < 6000) requestAnimationFrame(p); else r(); }; p(); });
  rec.stop(); await fin;
  const blob = new Blob(tr, { type: 'video/webm' });
  const bd = await new Promise(r => { const q = indexedDB.open('fadori-tele', 1); q.onsuccess = () => r(q.result); });
  await new Promise(r => { const t = bd.transaction('cosas', 'readwrite'); t.objectStore('cosas').put({ blob, nombre: 'Episodio 5' }, 'ep:prueba'); t.objectStore('cosas').put(['ep:prueba'.slice(3)], 'eps'); t.oncomplete = r; });
  const cfg = JSON.parse(localStorage.getItem('fadori_tele') || '{}'); cfg.cadaMin = 0.05; localStorage.setItem('fadori_tele', JSON.stringify(cfg));
});
await tv.reload(); await tv.waitForFunction(() => window.TELE && window.TELE.listo);
await tv.evaluate(() => { window.__dichos = []; });
await tv.click('#bArranque').catch(() => {});
ok('el episodio sale con su nombre en el marco', /Episodio 5/.test(await tv.textContent('#progQue')), await tv.textContent('#progQue'));
ok('y avanza', (await tarda(tv, () => document.querySelector('#prog').currentTime > 1, null, 8000)) != null);
ok('a los 3 s de programa (así lo pusimos) entra la tanda sola', (await tarda(tv, () => window.TELE.Programa.enCorte, null, 10000)) != null);
ok('y el programa sigue donde se quedó', (await tarda(tv, () => !window.TELE.Programa.enCorte && !document.querySelector('#prog').paused, null, 40000)) != null);

console.log('\n4 · la tablet de la fila: tocar, pedir y ver el turno');
const tab = await pantalla();
await tab.click('#bArranque').catch(() => {});
await tab.click('#bAjustes');
await tab.fill('#ajTabPase', '1234'); await tab.click('#ajTabletSi');
ok('con el pasador, el modo tablet se prende', (await tarda(tab, () => document.body.classList.contains('con-tablet'), null, 10000)) != null);
ok('y la tablet queda con la llave de la cooperativa', await tab.evaluate(() => !!FADORI.llaveMostrador()));
await tab.click('#ajCerrar');
await tab.waitForTimeout(800);
await tab.mouse.click(420, 360);
ok('al tocar la pantalla se abre la app para pedir', (await tarda(tab, () => !document.querySelector('#kCapa').hidden, null, 4000)) != null);
const k = tab.frame({ url: /kiosco/ });
await k.waitForFunction(() => window.KIOSCO, null, { timeout: 15000 });
ok('arriba a la izquierda, en chiquito, quién ya puede pasar', /Ya puede pasar/.test(await tab.textContent('#kMini')));
ok('en la tablet no se pide cuenta ni términos: va directo al menú', await k.evaluate(() => !document.querySelector('#p-menu').hidden && document.querySelector('#p-entrada').hidden));
const mas = k.locator('#rejilla button[aria-label^="Agregar"]');
await mas.nth(0).click(); await mas.nth(3).click();
await k.click('#bPedir');
await k.click('#bConfirmar');
ok('sin nombre no deja pedir', await k.evaluate(() => document.querySelector('#kTicket').hidden));
await k.fill('#kNombreIn', 'Valeria');
await k.click('[data-ver="nombre"]');
ok('la muestra dice cómo se va a ver en la pantalla', /Valeria/.test(await k.textContent('#verMuestra')));
await k.click('#bConfirmar');
ok('sale el ticket con el número de turno (lo pone el servidor)', (await tarda(tab, () => { const f = document.querySelector('#kMarco').contentDocument; const n = f && f.querySelector('#kNum'); return n && /^\d+$/.test(n.textContent); }, null, 10000)) != null);
ok('con lo que pidió y su código para anotarlo', / · /.test(await k.textContent('#kPidio')) && /^[A-Z0-9]{4,6}$/.test(await k.textContent('#kFolio')), (await k.textContent('#kPidio')) + ' / ' + (await k.textContent('#kFolio')));
const turnoK = await k.textContent('#kNum');
await k.click('#kOk');
ok('luego pregunta «¿Quieres pedir algo más?»', !(await k.evaluate(() => document.querySelector('#kMas').hidden)));
const t5 = Date.now();
ok('y si nadie contesta, a los 5 s regresa sola a la pantalla', (await tarda(tab, () => document.querySelector('#kCapa').hidden, null, 9000)) != null);
const seg = (Date.now() - t5) / 1000;
ok(`… en ~5 s, no antes (${seg.toFixed(1)} s)`, seg > 4 && seg < 8.5);
ok('el turno nuevo está en la fila de la pantalla', (await tarda(tab, n => [...document.querySelectorAll('#bFila .numeros b')].some(b => b.textContent === n), turnoK, 6000)) != null, turnoK + ' / ' + await tab.textContent('#bFila'));
ok('a la cooperativa le llega como pedido de la tablet, con el nombre', (await tarda(most, () => FADORI.estado().pedidos.some(p => p.origen === 'kiosco' && p.nombre === 'Valeria'), null, 10000)) != null);
const pK = await most.evaluate(() => FADORI.estado().pedidos.find(p => p.origen === 'kiosco'));
ok('y con lo que eligió para la pantalla', pK && pK.ver === 'nombre', JSON.stringify(pK && { ver: pK.ver, origen: pK.origen }));

/* «¿algo más?» → sí: otra persona pide sin volver a la pantalla */
await tab.mouse.click(420, 360);
await k.waitForFunction(() => !document.querySelector('#p-menu').hidden);
ok('la siguiente persona empieza en blanco (sin el nombre de la anterior)', await k.evaluate(() => document.querySelector('#cestaCuantos').textContent === '0'));
ok('y no queda nada de la persona anterior en la página', !(await k.evaluate(() => document.body.innerHTML.includes('Valeria'))),
  await k.evaluate(() => [...document.querySelectorAll('body *')].filter(e => !e.children.length && /Valeria/.test(e.textContent + (e.value || ''))).map(e => e.id || e.className).join(',')));
await k.locator('#rejilla button[aria-label^="Agregar"]').nth(1).click();
await k.waitForFunction(() => document.querySelector('#cestaCuantos').textContent === '1');
await k.click('#bPedir');
ok('…ni su nombre en el carrito', (await k.inputValue('#kNombreIn')) === '', await k.inputValue('#kNombreIn'));
await tab.click('#kCerrar');
ok('«Volver a la pantalla» la cierra', (await tarda(tab, () => document.querySelector('#kCapa').hidden, null, 3000)) != null);

console.log('\n5 · tamaños y errores');
for(const [w, h] of [[1280, 800], [1920, 1080], [800, 1280]]){
  await tv.setViewportSize({ width: w, height: h }); await tv.waitForTimeout(300);
  const d = await tv.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight }));
  ok(`nada se sale a ${w}×${h}`, d.x <= 0 && d.y <= 2, JSON.stringify(d));
}
for(const [n, pg] of [['pantalla', tv], ['tablet', tab], ['mostrador', most], ['Ana', ana], ['Beto', beto]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);

console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
