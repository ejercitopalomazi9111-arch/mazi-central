/* Las pruebas de la CREDENCIAL que no caben dentro de la página.
 *
 * Por qué existe aparte: las de la página corren al cargar y son síncronas.
 * Lo que de verdad importa aquí no lo es — hay que armar el QR (asíncrono),
 * mandar la credencial a PDF y DECODIFICAR los códigos de la imagen impresa.
 *
 * Y ese último paso es el que vale. Un QR que se ve bonito en pantalla y no
 * escanea al imprimirse no sirve para nada, y eso no se ve mirándolo: ya me
 * pasó con la primera versión de este mismo código, que salió versión 24 con
 * 0.18 mm por módulo y era ilegible.
 *
 *   node reportes/pruebas-credencial.mjs [http://127.0.0.1:8791]
 */
const BASE = process.argv[2] || 'http://127.0.0.1:8791';
const pw = await import('/opt/node22/lib/node_modules/playwright/index.js');
const chromium = pw.chromium || pw.default.chromium;
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

let bien = 0, mal = 0;
const ok = (q, c, d='') => { if(c){ bien++; console.log('  ✓ ' + q); }
                             else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };

const TMP = '/tmp/claude-0/-home-user-mazi-central/617efe1d-4733-537e-8ae2-f3b050e50e7a/scratchpad';
const leer = (png) => {
  try{
    return execFileSync('zbarimg', ['-q','--raw',png],
      { encoding:'utf8', stdio:['ignore','pipe','ignore'] })
      .split('\n').map(x=>x.trim()).filter(Boolean);
  }catch(e){ return String(e.stdout||'').split('\n').map(x=>x.trim()).filter(Boolean); }
};

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{ width:390, height:844 } });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', e => errores.push(String(e)));
await page.goto(BASE + '/reportes/', { waitUntil:'networkidle' });
await page.waitForTimeout(800);

/* ── Dos credenciales, que es lo que Carlos no lograba ─────────────────── */
console.log('\n── Dos credenciales en un solo PDF ──');
await page.evaluate(() => {
  verVista('credencial');
  CRED.gente = [
    Object.assign(credNueva(), { apellidos:'RAMÍREZ', nombres:'ANA',
      num:'PM-014', habilidades:'RCP básico\nPrimeros auxilios\nVía aérea' }),
    Object.assign(credNueva(), { apellidos:'LÓPEZ', nombres:'BETO',
      num:'PM-022', habilidades:'Extracción vehicular' }),
  ];
  credActiva = 0; guardarCred(); pintarCred();
});
await page.waitForTimeout(1500);

ok('se pueden tener dos credenciales a la vez',
   await page.evaluate(() => CRED.gente.length) === 2);
ok('y las dos aparecen en la lista para cambiar entre ellas',
   await page.evaluate(() => document.querySelectorAll('#listaCred [data-cred]').length) === 2);

/* El botón GRANDE de la barra. Éste es el defecto que reportó Carlos: estando
   en la pestaña de credenciales, imprimía el REPORTE. */
await page.evaluate(() => { window.print = () => {}; });
await page.click('#bImprimir');
await page.waitForTimeout(300);
const tras = await page.evaluate(() => ({
  pestana: vistaActual(),
  modo: document.body.classList.contains('imprime-cred'),
  caras: (document.querySelector('#impresora').innerHTML.match(/class="cred/g)||[]).length,
}));
ok('el botón de arriba NO te saca de la pestaña de credenciales',
   tras.pestana === 'credencial', 'te mandó a «' + tras.pestana + '»');
ok('entra en modo credencial, no en modo reporte', tras.modo === true);
ok('y manda a imprimir las CUATRO caras (dos personas)', tras.caras === 4,
   tras.caras + ' caras');

/* ── Los dos códigos, decodificados de la hoja impresa ─────────────────── */
console.log('\n── Los dos códigos, leídos del PDF ──');
await page.evaluate(() => {
  document.body.classList.remove('imprime-cred');
  CRED.gente = [CRED.gente[0]]; credActiva = 0; pintarCred();
});
await page.waitForTimeout(1200);

const dos = await page.evaluate(() => ({
  cuantos: document.querySelectorAll('#mesaCred .bloque-inf .qr').length,
  rotulos: [...document.querySelectorAll('#mesaCred .rotulo-qr')].map(r => r.textContent),
}));
ok('la credencial lleva los DOS códigos, no uno en lugar del otro',
   dos.cuantos === 2, dos.cuantos + ' códigos');
ok('cada uno dice cuál es', dos.rotulos.includes('HABILIDADES') && dos.rotulos.includes('REDES'),
   dos.rotulos.join(' · ') || 'sin rótulos');

await page.evaluate(() => {
  document.querySelector('#impresora').innerHTML = pliegosDe(CRED.gente);
  document.body.classList.add('imprime-cred');
});
await page.waitForTimeout(600);
const pdf = await page.pdf({ format:'Letter', printBackground:true,
  margin:{ top:'10mm', bottom:'10mm', left:'10mm', right:'10mm' } });
const ruta = TMP + '/cred-prueba.pdf';
writeFileSync(ruta, pdf);

/* 600 ppp es lo que hace cualquier impresora de oficina. A 300 el código de
   Instagram —que es de los adornados, con puntitos y el logo en medio— pierde
   detalle y deja de leerse; el de habilidades aguanta los dos. Se comprueban
   los dos para que quede escrito cuál es el que va justo. */
for(const ppp of [300, 600]){
  execFileSync('pdftoppm', ['-r', String(ppp), '-png', ruta, TMP + '/cp' + ppp]);
  const leidos = leer(TMP + '/cp' + ppp + '-1.png');
  const hab = leidos.some(x => /credencial\/#PM-014$/.test(x));
  const red = leidos.some(x => /instagram\.com/.test(x));
  console.log('   a ' + ppp + ' ppp → habilidades:' + (hab?'sí':'no') + ' · redes:' + (red?'sí':'no'));
  if(ppp === 300){
    ok('a 300 ppp el código de HABILIDADES ya se lee', hab,
       'a 17.5 mm debería seguir leyéndose');
  } else {
    ok('a 600 ppp —lo normal de una impresora— se leen LOS DOS', hab && red,
       'habilidades:' + hab + ' redes:' + red);
  }
  try{ unlinkSync(TMP + '/cp' + ppp + '-1.png'); }catch(e){}
}
try{ unlinkSync(ruta); }catch(e){}

ok('la página no tiró ningún error', errores.length === 0, errores[0] || '');

await b.close();
console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
