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
/* 30 de septiembre: ahora cada cara sale en SU página (formato de imprenta),
   así que se leen TODAS las páginas, no sólo la primera. Y el QR ya no es la
   imagen adornada de Instagram sino uno vectorial de cuadros negros: se exige
   que se lea desde 300 ppp, no sólo a 600. */
const { readdirSync } = await import('node:fs');
for(const ppp of [300, 600]){
  execFileSync('pdftoppm', ['-r', String(ppp), '-png', ruta, TMP + '/cp' + ppp]);
  const paginas = readdirSync(TMP).filter(f => f.startsWith('cp' + ppp + '-')).map(f => TMP + '/' + f);
  const leidos = paginas.flatMap(f => leer(f));
  const hab = leidos.some(x => /credencial\/#PM-014$/.test(x));
  const red = leidos.some(x => /instagram\.com/.test(x));
  console.log('   a ' + ppp + ' ppp → habilidades:' + (hab?'sí':'no') + ' · redes:' + (red?'sí':'no'));
  ok('a ' + ppp + ' ppp el código de habilidades NO está impreso', !hab,
     'se retiró de la credencial y no debe salir en el papel');
  ok('y a ' + ppp + ' ppp el QR de redes SÍ se lee', red, 'redes:' + red);
  paginas.forEach(f => { try{ unlinkSync(f); }catch(e){} });
}
try{ unlinkSync(ruta); }catch(e){}

/* ── 30 de septiembre · lo que Carlos vio en la imprenta ─────────────────── */
console.log('\n── Lo que salía mal al imprimir ──');
const imp = await page.evaluate(() => {
  const r = document.querySelector('#mesaCred .cred.reverso'), f = document.querySelector('#mesaCred .cred');
  const est = r.querySelector('.estrella'), ley = r.querySelector('.leyenda');
  const raya = f.querySelector('.ecg .raya'), pico = f.querySelector('.ecg svg:not(.raya)');
  const cs = (el) => getComputedStyle(el);
  return {
    horneada: f.classList.contains('horneada') && r.classList.contains('horneada'),
    panal: cs(f.querySelector('.panal')).display,
    estrellaPlana: est.classList.contains('plana') && cs(est).opacity === '1' && /none/.test(cs(est).maskImage || cs(est).webkitMaskImage || 'none'),
    grosor: [raya.getBoundingClientRect().height, pico.getBoundingClientRect().height,
             raya.querySelector('path').getAttribute('stroke-width'), pico.querySelector('path').getAttribute('stroke-width'),
             raya.viewBox.baseVal.height, pico.viewBox.baseVal.height],
    leyenda: cs(ley).fontStretch,
    qrVector: !!r.querySelector('.qr svg path'),
    formato: CRED.base.formato, acomodo: CRED.base.acomodo,
  };
});
ok('el fondo va horneado en una imagen opaca (sin panal transparente encima)', imp.horneada && imp.panal === 'none', JSON.stringify(imp));
ok('la estrella de la vida va aplanada: sin opacidad ni máscara, que eran el «cuadro negro»', imp.estrellaPlana);
const [hR, hP, sR, sP, vR, vP] = imp.grosor;
ok('la raya del electro y el pico tienen el MISMO grosor (misma caja, mismo trazo, misma escala)',
   Math.abs(hR - hP) < 0.01 && sR === sP && vR === vP, JSON.stringify(imp.grosor));
ok('la leyenda va en letra de ancho normal, no condensada', /normal|100%/.test(imp.leyenda), imp.leyenda);
ok('el QR es vectorial (cuadros), no la imagen adornada de Instagram', imp.qrVector);
ok('por defecto: credencial estándar CR80 y una por página', imp.formato === 'cr80' && imp.acomodo === 'una', imp.formato + ' · ' + imp.acomodo);

await page.evaluate(() => {
  document.querySelector('#impresora').innerHTML = pliegosDe(CRED.gente);
  document.body.classList.add('imprime-cred');
  const m = medidasCred(CRED.base);
  const st = document.createElement('style'); st.id = 'pagina-cred';
  st.textContent = '@page{size:' + m.an + 'mm ' + m.al + 'mm; margin:0}'; document.head.appendChild(st);
});
const pdf2 = await page.pdf({ preferCSSPageSize:true, printBackground:true });
const ruta2 = TMP + '/cred-cr80.pdf'; writeFileSync(ruta2, pdf2);
const info = execFileSync('pdfinfo', [ruta2], { encoding:'utf8' });
const tam = (info.match(/Page size:\s+([\d.]+) x ([\d.]+)/) || []).slice(1).map(Number);
ok('el PDF sale a la medida EXACTA de la CR80 (54 × 85.6 mm), una cara por página',
   /Pages:\s+2/.test(info) && Math.abs(tam[0] - 153.07) < 1 && Math.abs(tam[1] - 242.65) < 1, tam.join(' × ') + ' pt');
const lista = execFileSync('pdfimages', ['-list', ruta2], { encoding:'utf8' }).split('\n').slice(2).filter(Boolean)
  .map(l => l.trim().split(/\s+/)).map(c => ({ tipo:c[2], ancho:+c[3] }));
/* las únicas máscaras que se permiten son las de los dos logos (PNG con su
   silueta); ni el fondo (≥ 1400 px) ni la estrella (600 px) pueden llevar */
const mascaras = lista.filter(x => x.tipo === 'smask').map(x => x.ancho);
ok('ni el fondo ni la estrella llevan máscara de transparencia en el PDF',
   !mascaras.some(a => a >= 1400 || a === 600), 'máscaras de ' + mascaras.join(', ') + ' px');
try{ unlinkSync(ruta2); }catch(e){}

ok('la página no tiró ningún error', errores.length === 0, errores[0] || '');

await b.close();
console.log('\n' + bien + ' bien · ' + mal + ' mal');
process.exit(mal ? 1 : 0);
