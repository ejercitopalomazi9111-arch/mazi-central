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
/* ⚠ ESTA PRUEBA CAMBIÓ DE SENTIDO Y SE REESCRIBIÓ, no se borró. Exigía DOS
   códigos rotulados porque así lo pidió Carlos en su día —«que quede ese
   ADEMÁS del de redes»—. El 3 de septiembre pidió lo contrario: quitar el de
   habilidades. La prueba vieja habría quedado en rojo para siempre diciendo la
   verdad de ayer, así que ahora afirma lo que se pidió hoy. */
ok('en el reverso queda UN solo código', dos.cuantos === 1, dos.cuantos + ' códigos');
ok('y sin rótulo, que ya no hay con qué confundirlo',
   dos.rotulos.length === 0, dos.rotulos.join(' · '));

await page.evaluate(() => {
  document.querySelector('#impresora').innerHTML = pliegosDe(CRED.gente);
  document.body.classList.add('imprime-cred');
});
await page.waitForTimeout(600);
const pdf = await page.pdf({ format:'Letter', printBackground:true,
  margin:{ top:'10mm', bottom:'10mm', left:'10mm', right:'10mm' } });
const ruta = TMP + '/cred-prueba.pdf';
writeFileSync(ruta, pdf);

/* 600 ppp es lo que hace cualquier impresora de oficina. El código de
   Instagram es de los adornados —puntitos y el logo en medio— así que es el
   que va justo de detalle: a 300 se pierde. Ahora que está SOLO se pinta a
   20 mm en vez de a 17.5, o sea con más margen que antes; se mide igual a las
   dos resoluciones para que quede escrito dónde empieza a fallar.

   Y se comprueba además que el de habilidades YA NO ESTÉ. Quitarlo de la
   pantalla y que siguiera saliendo impreso sería justo el tipo de defecto que
   nadie mira: la credencial que se ve no es la que sale del papel. */
for(const ppp of [300, 600]){
  execFileSync('pdftoppm', ['-r', String(ppp), '-png', ruta, TMP + '/cp' + ppp]);
  const leidos = leer(TMP + '/cp' + ppp + '-1.png');
  const hab = leidos.some(x => /credencial\/#PM-014$/.test(x));
  const red = leidos.some(x => /instagram\.com/.test(x));
  console.log('   a ' + ppp + ' ppp → habilidades:' + (hab?'sí':'no') + ' · redes:' + (red?'sí':'no'));
  ok('a ' + ppp + ' ppp el código de habilidades NO está impreso', !hab,
     'se retiró de la credencial y no debe salir en el papel');
  if(ppp === 600){
    ok('y a 600 ppp —lo normal de una impresora— el de redes sí se lee', red,
       'redes:' + red);
  }
  try{ unlinkSync(TMP + '/cp' + ppp + '-1.png'); }catch(e){}
}
try{ unlinkSync(ruta); }catch(e){}

ok('la página no tiró ningún error', errores.length === 0, errores[0] || '');

await b.close();
console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
