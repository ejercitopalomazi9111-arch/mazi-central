/* LA CRIANZA EN PANTALLA (Carlos, 14 nov): varias mascotas que crecen, ropa y colores, acariciarla, la pelota y
   «si se te muere, mamaste». Contra el servidor de verdad en memoria (sala/servidor/estudio.js), en un Chromium a 390.
   Comprueba el EFECTO de cada toque en lo que guarda el servidor, no que el botón exista.
   FOTOS=carpeta guarda capturas. node carymo/pruebas-crianza.mjs */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atenderEstudio } from '../sala/servidor/estudio.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8600 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };
const FOTOS = process.env.FOTOS;

const m = new Map();
const s = { async get(k){ return structuredClone(m.get(k)); }, async put(k, v){ if(typeof k === 'object'){ for(const [a, b] of Object.entries(k)) m.set(a, structuredClone(b)); } else m.set(k, structuredClone(v)); },
  async delete(k){ for(const x of [].concat(k)) m.delete(x); }, async list({ prefix }){ return new Map([...m].filter(([k]) => k.startsWith(prefix)).sort()); } };
const ahora = Date.now();
const PERFIL = { cuenta: 'carlos', nombre: 'Carlos', xp: 500, racha: 3, ids: [], t: ahora, cubos: 500, mascota: 'tigre',
  mascotas: { tigre: { xp: 300, nacio: ahora - 9e8, skin: 'normal', acc: [] }, paloma: { xp: 0, nacio: ahora, skin: 'normal', acc: [] } },
  cuidado: { hambre: 70, limpieza: 80, animo: 50, t: ahora } };
const perfil = () => m.get('est:perfil:carlos');

const b = await chromium.launch();
async function abrir(sembrar){
  m.clear(); m.set('est:perfil:carlos', structuredClone(sembrar));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: FOTOS ? 2 : 1, hasTouch: false });
  const pg = await ctx.newPage(); const err = []; pg.on('pageerror', (e) => err.push(e.message));
  await pg.route(/^http:\/\/localhost:1\//, async (r) => {
    const q = r.request(), u = new URL(q.url());
    const req = new Request('http://x/estudio' + u.search, { method: q.method(), body: q.method() === 'POST' ? q.postData() : undefined });
    const res = await atenderEstudio(s, req, new URL(req.url), 'carlos');
    await r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
  });
  await pg.addInitScript(() => {
    if(sessionStorage.getItem('sembrado')) return; sessionStorage.setItem('sembrado', '1');
    localStorage.setItem('salaLlave', 'x');
    localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'tigre' }));
    sessionStorage.setItem('carymo.entrada', '1');
  });
  await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G`, { waitUntil: 'load' });
  await pg.waitForFunction(() => window.__estudio && window.__estudio.companero && window.__estudio.companero(), null, { timeout: 20000 });
  await pg.waitForTimeout(1500);
  return { ctx, pg, err };
}
const ve = (pg, sel, ms = 5000) => pg.locator(sel).first().waitFor({ state: 'attached', timeout: ms }).then(() => true, () => false);
const foto = (pg, nombre) => FOTOS ? pg.screenshot({ path: `${FOTOS}/${nombre}.png` }) : null;
const espera = async (cond, ms = 4000) => { const t = Date.now(); while(Date.now() - t < ms){ if(cond()) return true; await new Promise((r) => setTimeout(r, 80)); } return cond(); };

try{
  console.log('Cuarto y colección');
  let { ctx, pg, err } = await abrir(PERFIL);
  ok(await pg.locator('#pCubos .pm-masc .masc').count() === 1, 'la pastilla de arriba trae a tu mascota');
  await pg.evaluate(() => window.__estudio.companero().abrir()); await pg.waitForSelector('#capa.companero #misMasc .mi-masc');
  ok(await pg.locator('#misMasc .mi-masc[data-elegir]').count() === 2, 'tus dos mascotas salen arriba, en grande');
  ok(await pg.locator('#misMasc [data-adoptar-abrir]').count() === 1, 'y la tarjeta de «Adoptar» al final');
  ok(/Joven|Bebé|Adulto/.test(await pg.locator('#mascFicha').innerText()), 'la ficha dice la etapa (el tigre con 300 XP)');
  ok(/Nivel 5/.test(await pg.locator('#mascFicha').innerText()), 'y el nivel que da su XP (300 → 5)');
  ok(await pg.locator('#mascCuarto .masc[data-etapa="joven"]').count() === 1, 'el tigre se dibuja joven (más chico, cabeza más grande)');
  await foto(pg, '1-cuarto');

  console.log('Cambiar de mascota: un toque');
  await pg.click('#misMasc [data-elegir="paloma"]');
  ok(await espera(() => perfil().mascota === 'paloma'), 'el servidor ya sabe que te acompaña la paloma');
  ok(await pg.locator('#mascCuarto .masc[data-etapa="huevo"]').count() === 1, 'la paloma nivel 1 sale en HUEVO');
  ok(await pg.locator('#misMasc [data-elegir="paloma"].activa').count() === 1, 'su tarjeta queda marcada');
  ok(await pg.evaluate(() => JSON.parse(localStorage.getItem('est.ajustes')).mascota) === 'paloma', 'y el teléfono lo recuerda');
  await foto(pg, '2-huevo');
  await pg.click('#misMasc [data-elegir="tigre"]'); await espera(() => perfil().mascota === 'tigre');

  console.log('Adoptar');
  await pg.click('#misMasc [data-adoptar-abrir]'); await pg.waitForSelector('.adopta-g');
  ok(await pg.locator('.adopta[data-adopta="tigre"][disabled]').count() === 1, 'la que ya tienes dice «Ya es tuya» y no se puede volver a adoptar');
  ok(await pg.locator('[data-adopta-si][disabled]').count() === 1, 'el botón grande no hace nada hasta que eliges');
  await pg.click('.adopta[data-adopta="conejo"]');
  ok(/70/.test(await pg.locator('[data-adopta-si]').innerText()), 'al elegir, el botón dice el precio (conejo, 70)');
  await foto(pg, '3-adoptar');
  await pg.click('[data-adopta-si]');
  ok(await espera(() => perfil().mascotas.conejo && perfil().cubos === 430), 'el conejo es tuyo y costó 70 cubitos');
  ok(await espera(() => perfil().mascota === 'conejo'), 'y queda como tu compañero');
  ok(await ve(pg, '#misMasc .mi-masc[data-elegir="conejo"]') && await pg.locator('#misMasc .mi-masc[data-elegir]').count() === 3, 'ya son tres en la colección');
  await pg.waitForTimeout(500);

  console.log('Vestir');
  await pg.click('[data-vestir]'); await pg.waitForSelector('#vestirG .prenda');
  ok(await pg.locator('#vestirVista .masc').count() === 1, 'arriba se ve cómo va a quedar');
  await pg.click('#vestirG [data-prenda="corona"]');
  ok(await espera(() => (perfil().armario || []).includes('corona') && perfil().cubos === 395), 'la corona se compra ahí mismo (35)');
  ok(await ve(pg, '#vestirVista [data-acc="corona"]'), 'y ya se ve puesta en la vista');
  await pg.click('#vestirG [data-prenda="birrete"]');
  ok(await ve(pg, '#vestirVista [data-acc="birrete"]') && await pg.locator('#vestirVista [data-acc="corona"]').count() === 0, 'dos gorros no: el birrete reemplaza a la corona');
  await pg.click('[data-tab="color"]'); await pg.click('#vestirG [data-prenda="menta"]');
  ok(await espera(() => (perfil().armario || []).includes('menta')), 'el color menta también se compra');
  await foto(pg, '4-vestir');
  await pg.click('[data-vestir-listo]');
  ok(await espera(() => perfil().mascotas.conejo.skin === 'menta' && perfil().mascotas.conejo.acc.includes('birrete')), 'al dar «Listo», el servidor guarda color y ropa');
  ok(await ve(pg, '#mascCuarto [data-acc="birrete"]'), 'y en el cuarto ya sale vestido');
  ok(await ve(pg, '#pCubos .pm-masc [data-acc="birrete"]'), 'también en la pastilla de arriba');

  console.log('Acariciar');
  const r0 = (perfil().mimosDia || { n: 0 }).n;
  const mb = await pg.locator('#mascCuarto .masc').boundingBox();
  await pg.mouse.move(mb.x + mb.width * .3, mb.y + mb.height * .4); await pg.mouse.down();
  for(let k = 0; k < 14; k++) await pg.mouse.move(mb.x + mb.width * (k % 2 ? .7 : .3), mb.y + mb.height * .4, { steps: 4 });
  await pg.mouse.up();
  ok(await espera(() => (perfil().mimosDia || { n: 0 }).n > r0), 'tallarlo con el dedo cuenta como caricia en el servidor');

  console.log('Pelota');
  await pg.click('[data-cuidar="jugar"]');
  ok(await pg.locator('.pelota').count() === 1, 'con «Pelota» sale la pelota en el cuarto');
  await pg.waitForTimeout(300);
  await foto(pg, '5-pelota');
  const n0 = perfil().mimosDia.n;
  /* se avienta hacia la mascota: la persigue y la atrapa */
  const pb = await pg.locator('.pelota').boundingBox(), mc = await pg.locator('#mascCuarto .masc').boundingBox();
  await pg.mouse.move(pb.x + 18, pb.y + 18); await pg.mouse.down();
  await pg.mouse.move(pb.x + 40, pb.y + 10, { steps: 3 }); await pg.mouse.move(mc.x + mc.width / 2, mc.y + mc.height * .7, { steps: 3 }); await pg.mouse.up();
  ok(await espera(() => perfil().mimosDia.n > n0, 9000), 'la mascota atrapa la pelota y eso cuenta en el servidor');
  const izq0 = await pg.locator('#mascCuarto').evaluate((e) => e.style.left);
  ok(/%$/.test(izq0), 'la mascota se mueve por el cuarto siguiendo la pelota');
  await pg.click('[data-cuidar="jugar"]');
  ok(await pg.locator('.pelota').count() === 0, 'otro toque a «Pelota» la guarda');

  console.log('Crecer');
  await pg.evaluate(() => { window.__estudio.companero().crecio({ especie: 'paloma', nivel: 2, etapa: 'bebe', etapaAntes: 'huevo' }); });
  await pg.waitForSelector('.fiesta-crece'); await pg.waitForTimeout(1600);
  ok(/Nació/.test(await pg.locator('.fiesta-crece h1').innerText()), 'cuando sale del huevo, la fiesta dice «¡Nació!»');
  ok(await pg.locator('.fiesta-crece .masc[data-etapa="bebe"]').count() === 1, 'y se ve el bebé al final');
  await foto(pg, '6-nacio');
  await pg.click('.fiesta-crece button');
  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.join(' | ') : ''));
  await ctx.close();

  console.log('Si se te muere');
  ({ ctx, pg, err } = await abrir({ ...PERFIL, mascotas: { tigre: { xp: 300, nacio: ahora - 9e8, skin: 'normal', acc: [], muerta: ahora - 1000 } }, cielo: [{ especie: 'tigre', nivel: 5, muerta: ahora - 1000 }],
    avisoMascota: { tipo: 'murio', especie: 'tigre', nivel: 5 } }));
  await pg.waitForTimeout(1200);
  ok(/se fue/.test(await pg.locator('body').innerText()), 'al abrir la app te avisa que tu tigre se fue');
  await foto(pg, '7-murio');
  ok(await pg.locator('#pCubos[data-salud="peligro"]').count() === 1, 'la pastilla queda en rojo');
  ok(await espera(() => true) && (await pg.waitForFunction(() => !document.querySelector('#pCubos .pm-masc .masc'), null, { timeout: 4000 }).then(() => true, () => false)), 'y ya no sale el tigre en la pastilla');
  await pg.click('[data-adoptar-otra]'); await pg.waitForSelector('.adopta-g');
  ok(/gratis/i.test(await pg.locator('[data-adopta-si]').innerText()), 'la siguiente es gratis');
  ok(await pg.locator('.adopta[data-adopta="tigre"]:not([disabled])').count() === 1, 'y puedes volver a adoptar la misma especie');
  await pg.click('.adopta[data-adopta="gatito"]'); await pg.click('[data-adopta-si]');
  ok(await espera(() => perfil().mascotas.gatito && !perfil().mascotas.gatito.muerta && perfil().cubos === 500), 'adoptas un gatito sin pagar');
  ok(await ve(pg, '#pCubos .pm-masc .masc'), 'y vuelve a haber mascota en la pastilla');
  ok(/Las que se fueron/i.test(await pg.locator('#capa.companero').innerText()), 'el cuarto recuerda a las que se fueron');
  ok(err.length === 0, 'sin errores en la consola' + (err.length ? ': ' + err.join(' | ') : ''));
  await ctx.close();
}catch(e){ console.log(e); f++; }
await b.close(); srv.kill();
console.log(`\n${n - f} de ${n} pasan`);
process.exit(f ? 1 : 0);
