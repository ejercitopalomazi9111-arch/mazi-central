/* LA SOCIEDAD · pruebas en un navegador de verdad, como la usarían: la
   cooperativa nombra a la presidencia, la presidencia captura el horario,
   publica, abre una votación y arma un torneo; una alumna vota, se inscribe,
   escribe al buzón, platica y sube una foto que sólo sale al aprobarla.

   LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node sociedad/pruebas-pantalla.mjs
   CAPTURAS=/carpeta  guarda una foto de cada pantalla a 390 y a 1280 */
import { abrirMesa, PROD } from '../fadori/mesa-de-pruebas.mjs';
import fs from 'fs';
const M = await abrirMesa('soc');
const { ok, fallas } = M, CAP = process.env.CAPTURAS || '';
const API = 'https://fadori.palomazi9111.workers.dev';
const ir = async (pg, ruta) => { await pg.evaluate(r => { location.hash = r; }, ruta); await pg.waitForTimeout(500); };
const foto = async (pg, n) => { if(CAP){ fs.mkdirSync(CAP, { recursive: true }); await pg.screenshot({ path: CAP + '/' + n + '.png', fullPage: false }); } };
const desborde = (pg) => pg.evaluate(() => { const w = document.documentElement.clientWidth; const d = document.querySelector('dialog[open]');
  return Math.max(document.documentElement.scrollWidth - w, d ? d.scrollWidth - d.clientWidth : 0); });
const sociedad = async (pg, ruta = '') => { await pg.goto(PROD + '/sociedad/' + (ruta ? '#/' + ruta : '')); await pg.waitForFunction(() => !document.querySelector('.cargando-s'), null, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(600); };

try{
  console.log('· la cooperativa nombra a la presidencia');
  const m = await M.mostrador();
  const pres = await M.alumno('Carlos Palomares', '3.1');
  const codPres = await pres.evaluate(() => FADORI.yo().codigo);
  const r = await m.evaluate(async ([api, casa, cod]) => { const x = await fetch(api + '/api/soc/miembros?casa=' + casa, { method: 'POST', headers: { 'content-type': 'application/json', 'x-fadori-admin': FADORI.llaveMostrador(), 'x-fadori-aparato': localStorage.getItem('fadori_aparato') }, body: JSON.stringify({ cod, rol: 'presidencia' }) }); return x.status; }, [API, M.CASA, codPres]);
  ok('la cooperativa nombra a Carlos presidente', r === 200, r);

  console.log('· la presidencia');
  await sociedad(pres);
  ok('la sociedad abre con la cuenta de Fadori, sin volver a entrar', await pres.evaluate(() => /Hola, Carlos/.test(document.body.innerText)));
  ok('el menú enseña el panel de la sociedad a la presidencia', await pres.isVisible('#lado a[href="#/sociedad"]').catch(() => false) || await pres.evaluate(() => !!document.querySelector('#lado a[href="#/sociedad"]')));
  ok('el reloj pide el horario (todavía no hay)', /Sin horario|Elige/.test(await pres.textContent('#reloj')));
  await foto(pres, '01-inicio-vacio-390');

  /* el horario: pegado desde Excel, con la hora de ahora para que el reloj tenga qué enseñar */
  await ir(pres, '#/horarios');
  await pres.click('#editarH');
  const tabla = await pres.evaluate(() => {
    const p = {}; for(const x of new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())) p[x.type] = x.value;
    const s = (Number(p.hour) % 24) * 60 + Number(p.minute), hm = (m) => String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0') + ':' + String(((m % 60) + 60) % 60).padStart(2, '0');
    const a = s - 20, b = s + 30, c = s + 80;
    const fila = (x, y, t) => hm(x) + '-' + hm(y) + '\t' + [t, t, t, t, t, t].join('\t');
    return 'Hora\tLunes\tMartes\tMiércoles\tJueves\tViernes\tSábado\n' + fila(a, b, 'Física (B3)') + '\n' + fila(b, c, 'Química') + '\n';
  });
  await pres.fill('#hGrupo', '3.1');
  await pres.click('summary'); await pres.fill('#hPegar', tabla); await pres.click('#hLeer');
  await pres.click('#hGuardar'); await pres.waitForTimeout(800);
  ok('el horario pegado de Excel se guarda', await pres.evaluate(() => document.querySelectorAll('.bloque').length === 2), await pres.evaluate(() => document.querySelectorAll('.bloque').length));
  await pres.evaluate(() => { localStorage.setItem('soc_grupo', '31'); }); await ir(pres, '#/'); await ir(pres, '#/horarios');
  const rel = await pres.textContent('#reloj');
  ok('el reloj de arriba dice qué clase toca AHORA', /Física/.test(rel) && /Ahora/i.test(rel), rel);
  ok('la clase de ahora está marcada en el día', await pres.evaluate(() => !!document.querySelector('.bloque.ahora')));
  await foto(pres, '02-horarios-390');

  await ir(pres, '#/avisos'); await pres.click('#nuevoAviso');
  await pres.fill('[name=titulo]', 'Torneo de fútbol el viernes'); await pres.fill('[name=texto]', 'Inscríbanse en Eventos.\nCupo limitado.');
  await pres.check('[name=fijo]'); await pres.click('#fAviso button.prin'); await pres.waitForTimeout(800);
  ok('la presidencia publica un aviso fijado', await pres.evaluate(() => /Torneo de fútbol el viernes/.test(document.body.innerText) && !!document.querySelector('.fijo')));

  await ir(pres, '#/eventos'); await pres.click('#nuevoEv');
  await pres.fill('[name=titulo]', 'Concurso de dibujo'); await pres.selectOption('[name=tipo]', 'competencia'); await pres.fill('[name=categoria]', 'Dibujo');
  await pres.fill('[name=fecha]', '2099-11-20T12:00'); await pres.fill('[name=lugar]', 'Biblioteca'); await pres.fill('[name=cupo]', '30');
  await pres.fill('[name=requisitos]', 'Hoja tamaño carta y lápices'); await pres.selectOption('[name=estado]', 'inscripciones');
  await pres.click('#fEv button.prin'); await pres.waitForTimeout(800);
  ok('se publica una competencia con requisitos', await pres.evaluate(() => /Concurso de dibujo/.test(document.body.innerText)));

  await ir(pres, '#/votar'); await pres.click('#nuevoVoto');
  await pres.fill('[name=pregunta]', '¿Qué hacemos en noviembre?');
  await pres.fill('[data-op="0"]', 'Torneo de fútbol'); await pres.fill('[data-op="1"]', 'Concurso de canto');
  await pres.click('#fVoto button.prin'); await pres.waitForTimeout(800);
  ok('se abre una votación', await pres.evaluate(() => document.querySelectorAll('[data-voto]').length === 1));

  await ir(pres, '#/torneos'); await pres.click('#nuevoT');
  await pres.fill('[name=nombre]', 'Copa Rembrandt'); await pres.fill('[name=deporte]', 'Fútbol'); await pres.fill('[name=equipos]', '3.1\n2B\n1A\n3.2\n2A');
  await pres.click('#fT button.prin'); await pres.waitForTimeout(1000);
  ok('el torneo arma sus llaves (5 equipos → 3 rondas)', await pres.evaluate(() => document.querySelectorAll('.ronda').length === 4 && location.hash.startsWith('#/torneo/')));
  await pres.click('button.partido'); await pres.fill('[name=pa]', '3'); await pres.fill('[name=pb]', '1'); await pres.check('[name=final]'); await pres.click('#fP button.prin'); await pres.waitForTimeout(900);
  ok('el ganador pasa solo a la siguiente ronda', await pres.evaluate(() => [...document.querySelectorAll('.ronda')[1].querySelectorAll('.eq')].some(x => /^3\.1/.test(x.textContent))));
  ok('la tabla sale sola del marcador', await pres.evaluate(() => /3\.1\s*1\s*1\s*0\s*0\s*3\s*1\s*3/.test(document.querySelector('.tabla').innerText.replace(/\t/g, ' '))));
  await foto(pres, '03-torneo-390');

  await ir(pres, '#/sociedad'); await pres.click('#nuevoTema');
  await pres.fill('[name=titulo]', 'Bebederos del patio'); await pres.fill('[name=categoria]', 'Instalaciones'); await pres.click('#fTema button.prin'); await pres.waitForTimeout(900);
  await pres.fill('#fTarea [name=texto]', 'Hablar con dirección'); await pres.click('#fTarea button'); await pres.waitForTimeout(800);
  await pres.click('[data-est="por hacer"]'); await pres.waitForTimeout(800);
  await ir(pres, '#/sociedad');
  ok('el tema queda en «Por hacer» con su tarea', await pres.evaluate(() => { const c = [...document.querySelectorAll('.columna')].find(x => /Por hacer/.test(x.querySelector('h3').textContent)); return c && /Bebederos/.test(c.textContent) && /0 de 1/.test(c.textContent); }));
  await foto(pres, '04-panel-390');

  console.log('· una alumna');
  const ana = await M.alumno('Ana Pérez', '3.1');
  await sociedad(ana);
  ok('Ana no ve el panel de la sociedad', await ana.evaluate(() => !document.querySelector('#lado a[href="#/sociedad"]')));
  ok('Ana ve el aviso fijado en el inicio', await ana.evaluate(() => /Torneo de fútbol el viernes/.test(document.body.innerText)));
  ok('el reloj de Ana (3.1) ya sabe su clase sin elegir nada', /Física/.test(await ana.textContent('#reloj')), await ana.textContent('#reloj'));
  await foto(ana, '05-inicio-alumna-390');
  await ir(ana, '#/votar'); await ana.click('[data-op]'); await ana.waitForTimeout(800);
  ok('Ana vota y ve su palomita', await ana.evaluate(() => !!document.querySelector('.opcion.mio')));
  ok('mientras está abierta, Ana no ve los porcentajes', await ana.evaluate(() => !document.querySelector('.opcion .pct')));
  await ir(ana, '#/eventos'); await ana.click('[data-evento]'); await ana.click('#fInsc button'); await ana.waitForTimeout(800);
  ok('Ana se inscribe al concurso', await ana.evaluate(() => /Inscrito/.test(document.body.innerText)));
  await ir(ana, '#/buzon');
  await ana.click('[data-tipobz="queja"]'); await ana.fill('#fBz [name=texto]', 'No hay papel en los baños de arriba'); await ana.check('[name=anonimo]'); await ana.click('#fBz button.prin'); await ana.waitForTimeout(800);
  ok('Ana manda una queja anónima y la ve en «Lo que mandé»', await ana.evaluate(() => /No hay papel/.test(document.body.innerText) && /Recibida/.test(document.body.innerText)));
  await ir(ana, '#/chat/' + encodeURIComponent('g:31'));
  await ana.fill('#txtMsg', 'Mañana hay examen de física'); await ana.click('#fMsg .enviar'); await ana.waitForTimeout(900);
  ok('Ana escribe en el chat de su grupo', await ana.evaluate(() => /examen de física/.test(document.querySelector('#msjs').innerText)));
  await foto(ana, '06-chat-390');
  /* la presidencia (también 3.1) lo recibe sin recargar, por el socket */
  await ir(pres, '#/chat/' + encodeURIComponent('g:31'));
  const t = await M.tarda(pres, () => /examen de física/.test((document.querySelector('#msjs') || {}).innerText || ''), null, 8000);
  ok('el mensaje le llega a la presidencia', t !== null);
  await pres.fill('#txtMsg', 'Gracias, Ana'); await pres.click('#fMsg .enviar');
  const t2 = await M.tarda(ana, () => /Gracias, Ana/.test(document.querySelector('#msjs').innerText), null, 8000);
  ok('y la respuesta le llega a Ana al instante, sin recargar (' + t2 + ' ms)', t2 !== null && t2 < 5000);

  await ir(ana, '#/muro'); await ana.click('#subirF');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAATUlEQVR42u3PMQ0AAAgDIN8/9K3hHFQgnVQqlUqlUqlUKpVKpVKpVKpVKpVKpVKpVKpVKpVKpVKpVKpVKpVKpVKpVKpVKpVKpVKp/D2xVwFBsB1GywAAAABJRU5ErkJggg==', 'base64');
  await ana.setInputFiles('#fPub [name=archivos]', { name: 'grad.png', mimeType: 'image/png', buffer: png });
  await ana.fill('#fPub [name=titulo]', 'Graduación'); await ana.click('#fPub button.prin');
  await ana.waitForFunction(() => !document.querySelector('#hoja[open]'), null, { timeout: 15000 }).catch(() => {});
  await ana.waitForTimeout(600);
  ok('la foto de Ana NO sale todavía en el muro', await ana.evaluate(() => !document.querySelector('.muro') && /por revisar/.test(document.body.innerText)));
  await ir(pres, '#/'); await pres.waitForTimeout(1500); await ir(pres, '#/revisar');
  ok('la presidencia la ve en «Por revisar»', await pres.evaluate(() => /Graduación/.test(document.body.innerText)));
  await foto(pres, '07-revisar-390');
  await pres.click('[data-ok]'); await pres.waitForTimeout(900);
  await M.tarda(ana, () => !!document.querySelector('.muro .foto'), null, 8000);
  ok('aprobada, sale en el muro de Ana sin recargar', await ana.evaluate(() => !!document.querySelector('.muro .foto')));
  await foto(ana, '08-muro-390');

  console.log('· la presidencia contesta el buzón');
  await ir(pres, '#/buzon');
  ok('ve la queja SIN el nombre de Ana', await pres.evaluate(() => /No hay papel/.test(document.body.innerText) && /Anónimo/.test(document.body.innerText) && !/Ana P/.test(document.querySelector('[data-bz]').innerText)));
  await pres.click('[data-contestar]'); await pres.selectOption('#fCo [name=estado]', 'en proceso'); await pres.fill('#fCo [name=respuesta]', 'Ya lo hablamos con dirección'); await pres.check('#fCo [name=publico]'); await pres.click('#fCo button.prin'); await pres.waitForTimeout(800);
  await M.tarda(ana, () => true, null, 100); await ir(ana, '#/'); await ana.waitForTimeout(1200); await ir(ana, '#/buzon');
  await ana.click('[data-tab="mias"]');
  ok('Ana ve la respuesta y el estado', await ana.evaluate(() => /Ya lo hablamos con dirección/.test(document.body.innerText) && /En proceso/.test(document.body.innerText)));

  console.log('· pantallas: sin desborde, sin errores, en teléfono y en computadora');
  const rutas = ['', 'horarios', 'avisos', 'eventos', 'votar', 'buzon', 'chats', 'muro', 'material', 'torneos', 'fadori', 'radio', 'sociedad', 'revisar', 'miembros', 'cuenta', 'pantalla'];
  for(const [w, h] of [[390, 844], [1280, 800]]){
    await pres.setViewportSize({ width: w, height: h });
    const malas = [];
    for(const r of rutas){ await ir(pres, '#/' + r); await pres.waitForTimeout(250); const d = await desborde(pres); if(d > 1) malas.push(r + ' (' + d + ' px)'); if(r === 'sociedad' || r === '' || r === 'pantalla') await foto(pres, '10-' + (r || 'inicio') + '-' + w); }
    ok('a ' + w + ' px ninguna pantalla se sale de lado', !malas.length, malas.join(', '));
  }
  await pres.setViewportSize({ width: 320, height: 640 }); await ir(pres, '#/');
  ok('a 320 px el reloj y la marca caben en la barra', await pres.evaluate(() => { const b = document.querySelector('.barra').getBoundingClientRect(), r = document.querySelector('#reloj').getBoundingClientRect(); return r.right <= b.right + 0.5 && document.documentElement.scrollWidth <= 320; }));
  await pres.setViewportSize({ width: 390, height: 844 });
  const errores = [...pres.errores, ...ana.errores, ...m.errores.filter(x => !/Failed to fetch|NetworkError/.test(x))];
  ok('ni un error de página', !pres.errores.length && !ana.errores.length, [...pres.errores, ...ana.errores].join(' | ').slice(0, 400));
}catch(err){ console.log('  ✗ la prueba tronó: ' + err.message); fallas.push(err.message); }
await M.cerrar();
console.log(fallas.length ? '\n✗ ' + fallas.length + ' fallas' : '\n✓ todo bien');
process.exit(fallas.length ? 1 : 0);
