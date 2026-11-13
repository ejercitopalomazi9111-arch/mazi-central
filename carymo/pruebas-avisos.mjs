/* Pruebas de pantalla de los avisos de CARYMO (avisos.js + sw.js).
   Navegador de verdad a 390×844. El servicio de push no existe sin internet, así que se
   finge sólo `pushManager.subscribe` (lo de Google/Apple); el trabajador de fondo sí se registra de verdad.
   node carymo/pruebas-avisos.mjs            (FOTOS=carpeta para sacar capturas) */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8700 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let f = 0, n = 0; const ok = (c, t) => { n++; console.log((c ? '  ✓ ' : '  ✗ ') + t); if(!c) f++; };

const llamadas = [];
let ajustes = { estudiar: '18:00', racha: true, examen: true, mascota: true }, telefonos = 0;
const perfil = { cuenta: 'ana', nombre: 'Ana', xp: 120, racha: 2, cubos: 10, cuidado: { hambre: 80, limpieza: 80, animo: 80, t: Date.now() } };
async function servidor(r){
  const q = r.request(); let c = {}; try{ c = JSON.parse(q.postData() || '{}'); }catch{}
  let res = { bien: true, perfil, planes: [], ranking: { semana: '', filas: [] } };
  if(c.accion === 'avisos'){
    llamadas.push(c);
    if(c.que === 'estado') res = { bien: true, publica: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U', ajustes, telefonos };
    if(c.que === 'suscribir'){ telefonos = 1; if(c.ajustes) ajustes = { ...ajustes, ...c.ajustes }; res = { bien: true, ajustes, telefonos }; }
    if(c.que === 'ajustes'){ ajustes = { ...ajustes, ...c.ajustes }; res = { bien: true, ajustes }; }
    if(c.que === 'desuscribir'){ telefonos = 0; res = { bien: true, telefonos }; }
    if(c.que === 'probar') res = { bien: true, enviados: telefonos };
  }
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(res) });
}
const FINGIR_PUSH = () => {
  let sus = null;
  const hacer = () => ({ endpoint: 'https://push.ejemplo/telefono-ana', toJSON(){ return { endpoint: this.endpoint, keys: { p256dh: 'BPllave', auth: 'secreto' } }; }, unsubscribe: async () => { sus = null; return true; } });
  PushManager.prototype.subscribe = async function(){ sus = hacer(); return sus; };
  PushManager.prototype.getSubscription = async function(){ return sus; };
};
const b = await chromium.launch();
async function pagina({ ua, permiso = 'granted', sinPush = false, buscar = '' } = {}){
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.FOTOS ? 2 : 1, ...(ua ? { userAgent: ua } : {}) });
  if(permiso === 'granted') await ctx.grantPermissions(['notifications'], { origin: `http://127.0.0.1:${PUERTO}` });
  const pg = await ctx.newPage();
  const err = []; pg.on('pageerror', (e) => err.push(e.message));
  await pg.route(/^http:\/\/localhost:1\//, servidor);
  await pg.addInitScript(({ sinPush, permiso }) => {
    localStorage.setItem('salaLlave', 'x'); localStorage.setItem('est.ajustes', JSON.stringify({ sonido: false, vibrar: false, mascota: 'gatito' }));
    sessionStorage.setItem('carymo.entrada', '1');
    if(sinPush){ delete window.PushManager; }
    /* el Chromium sin pantalla contesta «denied» aunque se le dé el permiso: se finge, igual que el push */
    let p = permiso;
    Object.defineProperty(Notification, 'permission', { get: () => p });
    Notification.requestPermission = async () => (p = permiso === 'denied' ? 'denied' : 'granted');
  }, { sinPush, permiso });
  if(!sinPush) await pg.addInitScript(FINGIR_PUSH);
  await pg.goto(`http://127.0.0.1:${PUERTO}/carymo/?servidor=http://localhost:1&sala=G${buscar}`, { waitUntil: 'load' });
  await pg.waitForFunction(() => window.__estudio && window.__estudio.avisos && window.__estudio.avisos());
  await pg.waitForTimeout(500);
  return { pg, ctx, err };
}
const alPerfil = async (pg) => { await pg.click('[data-ir="perfil"]'); await pg.waitForSelector('#pAvisos'); await pg.waitForTimeout(400); };
const foto = async (pg, nombre) => { if(process.env.FOTOS) await pg.locator('#pAvisos').screenshot({ path: `${process.env.FOTOS}/${nombre}.png` }); };

console.log('Prender los avisos');
{
  const { pg, err } = await pagina();
  await alPerfil(pg);
  ok(/Prender avisos/.test(await pg.textContent('#pAvisos')), 'en Perfil hay una sección «Avisos» con «Prender avisos»');
  await foto(pg, 'avisos-1-apagados');
  await pg.click('[data-av="prender"]');
  await pg.waitForSelector('[data-av-hora]', { timeout: 8000 });
  const sus = llamadas.find((c) => c.que === 'suscribir');
  ok(!!sus && sus.suscripcion.endpoint === 'https://push.ejemplo/telefono-ana' && sus.suscripcion.keys.p256dh === 'BPllave', 'al prenderlos, el teléfono se apunta en el servidor CON sus llaves');
  ok(await pg.evaluate(async () => !!(await navigator.serviceWorker.getRegistration('/carymo/'))), 'el trabajador de fondo de CARYMO quedó registrado en /carymo/');
  ok(await pg.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration('/carymo/'); return !!(r && (r.active || r.installing || r.waiting)); }), 'y arrancó (sw.js se lee sin errores)');
  ok(await pg.locator('#pAvisos [data-av-k]').count() === 3, 'salen los tres interruptores: racha, examen y compañero');
  await foto(pg, 'avisos-2-prendidos');

  console.log('Elegir cuáles y a qué hora');
  await pg.selectOption('[data-av-hora]', '20:30'); await pg.waitForTimeout(300);
  ok(ajustes.estudiar === '20:30', 'cambiar la hora del recordatorio se guarda en el servidor');
  await pg.click('[data-av-k="racha"]'); await pg.waitForTimeout(300);
  ok(ajustes.racha === false && (await pg.getAttribute('[data-av-k="racha"]', 'aria-checked')) === 'false', 'apagar «racha en peligro» se guarda y el interruptor se ve apagado');
  await pg.selectOption('[data-av-hora]', ''); await pg.waitForTimeout(300);
  ok(ajustes.estudiar === '', 'se puede quitar el recordatorio diario');
  await pg.click('[data-av="probar"]'); await pg.waitForTimeout(400);
  ok(llamadas.some((c) => c.que === 'probar') && /prueba/i.test(await pg.textContent('#brindis')), '«Probar aviso» pide uno al servidor y lo dice');

  console.log('Se quedan prendidos');
  await pg.click('[data-ir="plan"]'); await pg.waitForTimeout(200); await alPerfil(pg);
  ok(await pg.locator('[data-av-hora]').count() === 1, 'al volver a Perfil siguen prendidos (no vuelve a salir «Prender»)');
  ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390, 'nada se sale de lado a 390');

  console.log('Apagar');
  await pg.click('[data-av="apagar"]'); await pg.waitForSelector('[data-av="prender"]', { timeout: 5000 });
  ok(llamadas.some((c) => c.que === 'desuscribir') && telefonos === 0, '«Apagar aquí» lo quita del servidor y regresa el botón de prender');
  ok(err.length === 0, 'cero errores' + (err.length ? ': ' + err[0] : ''));
  await pg.context().close();
}

console.log('Donde no se puede');
{
  const { pg, err } = await pagina({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', sinPush: true });
  await alPerfil(pg);
  const t = await pg.textContent('#pAvisos');
  ok(/pantalla de inicio/.test(t) && /Agregar a inicio/.test(t) && !(await pg.locator('[data-av="prender"]').count()), 'en Safari de iPhone explica cómo ponerla en la pantalla de inicio, sin un botón que no hace nada');
  await foto(pg, 'avisos-3-iphone');
  ok(err.length === 0, 'cero errores');
  await pg.context().close();
}
{
  const { pg } = await pagina({ permiso: 'denied' });
  await alPerfil(pg);
  ok(/Bloqueaste los avisos/.test(await pg.textContent('#pAvisos')), 'si los bloqueaste, dice dónde se prenden');
  await pg.context().close();
}

console.log('Tocar un aviso');
{
  const { pg, err } = await pagina({ buscar: '&abrir=companero' });
  await pg.waitForSelector('#capa.companero', { timeout: 6000 }).catch(() => {});
  ok(await pg.locator('#capa.companero').count() === 1, 'el aviso de «tu compañero tiene hambre» abre su cuarto');
  ok(!/abrir=/.test(pg.url()), 'y la dirección queda limpia (recargar no lo vuelve a abrir)');
  ok(err.length === 0, 'cero errores' + (err.length ? ': ' + err[0] : ''));
  await pg.context().close();
}

console.log(`\n${n - f} pasan · ${f} fallan`);
await b.close(); srv.kill(); process.exit(f ? 1 : 0);
