/* ══════════════════════════════════════════════════════════════════════════
   EL MINUTO ANTES · las pruebas
   ──────────────────────────────────────────────────────────────────────────
       node demo/pruebas.mjs          (con la página servida en :8792)

   POR QUÉ MIDE EL TEXTO PINTADO Y NO LAS CAJAS. Es la neurona
   `medir-el-texto-pintado` de la casa, y me la gané a golpes: el titular se
   montaba sobre el párrafo con el CSS perfectamente escrito y la caja midiendo
   lo correcto. Aquí se toma el rectángulo REAL de cada bloque —con un Range
   sobre el contenido, que da lo que se dibujó con la fuente de verdad— y se
   comprueba que ninguno se monte sobre otro.

   ⚠ Y ESTA PRUEBA SE PROBÓ A SÍ MISMA. Se le volvió a meter el defecto a
   propósito y se puso roja en los tres anchos, nombrando los tres choques. Sin
   eso sería otra de las que pasan sin haber ejercido nada — que es la neurona
   `la-prueba-paso-sin-que-existiera-el-caso`, y da más miedo que el defecto.

   También cuenta LO QUE RESPONDE AL DEDO, que es la prueba de la lista de
   antes de lanzar: si nada responde al toque, se ve de IA por bonita que esté
   la paleta.
   ═════════════════════════════════════════════════════════════════════════ */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const OUT = process.env.SALIDA || '/tmp';
/* La dirección se puede cambiar para correr esto CONTRA LO PUBLICADO y no sólo
   contra el disco. No es un lujo: ya me pasó dar por bueno un despliegue
   leyendo el reporte del merge en vez de lo que el servidor entrega.

   ⚠ DESDE EL CONTENEDOR DEL CLAUDE DE LUIS ESTO NO CORRE CONTRA INTERNET, y lo
   digo aquí para que nadie pierda la tarde que perdí yo. La salida pasa por un
   proxy que abre el TLS con su propia autoridad (/root/.ccr/ca-bundle.crt);
   `curl` la trae del sistema, pero Chromium tiene su propio almacén y no la
   conoce, así que contesta ERR_CONNECTION_RESET. No se arregla apagando la
   verificación — eso no se hace. Desde ahí lo publicado se comprueba con
   `curl` y se mira que los bytes servidos sean los nuevos; el navegador corre
   contra el disco, que es el mismo archivo. En un runner con salida directa
   esta variable sí sirve tal cual. */
const SITIO = process.env.SITIO || 'http://127.0.0.1:8792/demo/';
/* El proxy sólo hace falta para correr esto contra lo publicado: la salida a
   internet del contenedor pasa por ahí, y Chromium no lee HTTPS_PROXY solo. */
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
const b=await chromium.launch({
  args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'],
  ...(SITIO.startsWith('http://127.') || !PROXY ? {} : { proxy:{ server:PROXY } }),   /* ver la nota de arriba */
});
let fallas=0;
const ok=(c,t)=>{ console.log((c?'  ✓ ':'  ✗ ')+t); if(!c) fallas++; };

for(const [n,w,h] of [['390',390,844],['320',320,720],['1440',1440,900]]){
  console.log('\n── '+n+' px ──');
  const pg=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2})).newPage();
  const err=[]; pg.on('console',m=>m.type()==='error'&&err.push(m.text())); pg.on('pageerror',e=>err.push('PAGEERROR '+e.message));
  await pg.goto(SITIO,{waitUntil:'networkidle'});
  await pg.waitForTimeout(1000);

  /* MEDIR LO PINTADO, NO LA CAJA — la neurona medir-el-texto-pintado. Se toma
     el rectángulo REAL de cada bloque de texto (Range sobre el nodo, que da lo
     que se dibujó con la fuente de verdad) y se comprueba que ninguno se monte
     sobre otro. Es lo que habría cazado el titular encimado sin mirar nada. */
  const choques = await pg.evaluate(() => {
    const cajas=[];
    for(const el of document.querySelectorAll('h1 span,h2 span,p,li,dd,dt,caption,th,td,label,.arriba')){
      /* ⚠ TAMAÑO NO ES LO MISMO QUE PINTADO, y esto me lo enseñó un falso
         positivo: la tabla vive dentro de un <details> cerrado, y Chrome ya no
         la mete en `display:none` —usa `content-visibility:hidden` para que
         funcione buscar en la página—, así que sus celdas SIGUEN MIDIENDO y sus
         rectángulos caen encima del párrafo de al lado. Tres choques que en la
         pantalla no existen. `checkVisibility` es la pregunta correcta: ¿esto
         se pinta? Sin ella, esta prueba se pone roja por algo que nadie ve, y
         una prueba que grita en falso se acaba ignorando. */
      if(!el.checkVisibility({ contentVisibilityAuto:true, opacityProperty:true, visibilityProperty:true })) continue;
      const r=document.createRange(); r.selectNodeContents(el);
      const b=r.getBoundingClientRect();
      if(b.width<1||b.height<1) continue;
      const s=getComputedStyle(el);
      if(s.position==='fixed') continue;
      cajas.push({t:(el.textContent||'').trim().slice(0,26), x:b.x, y:b.y+scrollY, w:b.width, h:b.height, el});
    }
    const malos=[];
    for(let i=0;i<cajas.length;i++) for(let j=i+1;j<cajas.length;j++){
      const a=cajas[i],c=cajas[j];
      if(a.el.contains(c.el)||c.el.contains(a.el)) continue;
      /* ⚠ DOS RENGLONES DEL MISMO TITULAR NO SON UN CHOQUE. Con `line-height`
         menor que 1 —que aquí es una decisión, no un descuido— las cajas de
         MÉTRICA de dos líneas seguidas se solapan aunque las letras ni se
         rocen: la caja incluye ascendente y descendente completos de la
         fuente, y eso es más alto que el renglón. Se saltan los hermanos del
         mismo padre, que es justo lo que son las líneas de un titular.
         Lo demás sigue midiéndose, y el defecto de verdad —un titular montado
         sobre el párrafo siguiente— tiene padres distintos y se caza igual. */
      if(a.el.parentElement === c.el.parentElement) continue;
      const sx=Math.min(a.x+a.w,c.x+c.w)-Math.max(a.x,c.x);
      const sy=Math.min(a.y+a.h,c.y+c.h)-Math.max(a.y,c.y);
      if(sx>2 && sy>2) malos.push(`«${a.t}» ⨯ «${c.t}» (${Math.round(sy)}px)`);
    }
    return malos;
  });
  ok(choques.length===0, 'ningún texto pintado se encima'+(choques.length?': '+choques.slice(0,3).join(' · '):''));

  /* ── NI SE RECORTA ────────────────────────────────────────────────────────
     Otro defecto que el «no se encima» no ve, y me lo acabo de hacer solo:
     subí el tope del titular para que llenara la pantalla grande y «El minuto»
     se quedó en «El minut». La palabra no se encimaba con nada — se salía de
     su caja, y la máscara del destape, que lleva `overflow:hidden`, se comió
     la última letra. Medir dónde está el texto no dice si CABE.

     Se compara lo que el contenido mide contra lo que la caja enseña. Vale
     para cualquier caja que recorte, no sólo para el titular de hoy. */
  const cortados = await pg.evaluate(() => {
    const malos=[];
    for(const el of document.querySelectorAll('[data-mueve="mascara"], .marco, .tarjeta, .chip')){
      if(!el.checkVisibility({contentVisibilityAuto:true})) continue;
      const s=getComputedStyle(el);
      if(s.overflowX==='visible' && s.overflowY==='visible') continue;
      const dx=el.scrollWidth-el.clientWidth, dy=el.scrollHeight-el.clientHeight;
      if(dx>1||dy>1) malos.push(`«${(el.textContent||'').trim().slice(0,22)}» sobra ${dx>1?dx+'px de ancho':''}${dx>1&&dy>1?' y ':''}${dy>1?dy+'px de alto':''}`);
    }
    return malos;
  });
  ok(cortados.length===0, 'ningún texto se sale de su caja'+(cortados.length?': '+cortados.slice(0,3).join(' · '):''));

  const m = await pg.evaluate(()=>({
    h1:document.querySelectorAll('h1').length,
    desborde:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
    charset:document.characterSet,
    lang:document.documentElement.lang,
    /* la prueba del dedo, contada */
    /* `summary` va en la lista: se toca con el dedo igual que un botón, y si
       no se cuenta ni se mide, es un control de 20px que nadie revisa. */
    tocables:[...document.querySelectorAll('a,button,select,input,summary,[tabindex]')].length,
    chicos:[...document.querySelectorAll('a,button,select,summary')].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.height<44;}).map(e=>e.tagName+':'+Math.round(e.getBoundingClientRect().height)),
  }));
  ok(m.h1===1,'un solo h1');
  ok(!m.desborde,'sin desbordamiento horizontal');
  ok(m.charset==='UTF-8','charset UTF-8');
  ok(m.lang==='es','lang declarado');
  ok(m.chicos.length===0,'todo lo tocable ≥44px'+(m.chicos.length?': '+m.chicos.join(','):''));
  /* El piso ya no es 2. La lista de la casa dice CONTAR cuántas veces algo
     responde al toque; con el desplegable eran 2 y Carlos tenía razón en que
     eso se ve de IA. Con las fichas son 9, y si alguien las quita, esto se
     pone rojo. */
  ok(m.tocables>=9,`responde al dedo en ${m.tocables} lugares`);

  /* ── LA PANTALLA CONTESTA ────────────────────────────────────────────────
     No basta con que exista: se toca una ficha y tiene que cambiar la hora. Es
     lo único de la página que hace algo, y una prueba que sólo comprueba que
     el botón está ahí no comprueba el producto. */
  const chips = pg.locator('.chip');
  ok(await chips.count() === 7, 'siete fichas, una por categoría');
  const antes = (await pg.locator('.tarjeta .hora').textContent().catch(()=>null));
  await chips.nth(3).click();
  await pg.waitForTimeout(120);
  const luego = await pg.locator('.tarjeta .hora').textContent();
  const marcada = await pg.locator('.chip[aria-pressed="true"]').count();
  ok(antes && luego && antes !== luego, `tocar una ficha cambia la hora (${antes} → ${luego})`);
  ok(marcada === 1, 'sólo una ficha queda marcada');

  /* Y el estado vacío se DICE. Es la última ficha, «Libre»: esa semana
     descansan. Un hueco en blanco se lee como «falló». */
  await chips.nth(6).click();
  await pg.waitForTimeout(120);
  ok(await pg.locator('.tarjeta .sinjuego').count() === 1, 'sin partido, lo dice en vez de dejar el hueco');
  await chips.nth(1).click();
  await pg.waitForTimeout(120);
  ok(await pg.locator('.tarjeta .cambio').count() === 1, 'el cambio de horario sale en rojo y aparte');

  /* ── «VOLVER ARRIBA» ─────────────────────────────────────────────────────
     ⚠ ESTA PRUEBA ESTABA ROTA Y PASABA. Preguntaba «al final NO tiene la clase
     `lejos`». Esa clase la ponía `mueve.js` en un camino que en un navegador
     moderno NUNCA SE EJECUTA — así que la clase no existía jamás y la
     comprobación era cierta siempre, con el botón visible desde el primer
     píxel encima de la portada. Pasaba sin ejercitar nada.

     Ahora se mide LO PINTADO, no una clase: la opacidad de verdad arriba y
     abajo. Y además se intenta TOCARLO estando invisible, que es el defecto
     que de verdad duele — un enlace transparente que sí se puede clicar en la
     esquina de la pantalla. */
  await pg.evaluate(()=>window.scrollTo(0,0));
  await pg.waitForTimeout(500);
  const arribaArriba = await pg.evaluate(()=>{
    const a=document.querySelector('[data-arriba]');
    const s=getComputedStyle(a);
    return { op:parseFloat(s.opacity), toques:s.pointerEvents };
  });
  ok(arribaArriba.op < 0.02, `«volver arriba» escondido en la portada (opacidad ${arribaArriba.op})`);
  ok(arribaArriba.toques === 'none', 'y estando invisible tampoco se puede tocar');

  await pg.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await pg.waitForTimeout(600);
  const arr = await pg.evaluate(()=>{
    const a=document.querySelector('[data-arriba]');
    return parseFloat(getComputedStyle(a).opacity);
  });
  ok(arr > 0.98, `«volver arriba» aparece al bajar (opacidad ${arr})`);
  await pg.screenshot({path:`${OUT}/rev-${n}.png`});
  ok(err.length===0,'cero errores de consola'+(err.length?': '+err[0]:''));
  await pg.close();
}

/* ── QUIEN PIDIÓ MENOS MOVIMIENTO ─────────────────────────────────────────
   ⚠ ESTE CAMINO NO LO RECORRÍA NINGUNA PRUEBA, y ahí seguía vivo un defecto
   que ya se había arreglado en el camino normal: el bloque de
   `prefers-reduced-motion` le ponía `margin-bottom:0` a la máscara, gana por
   especificidad sobre `h1`, y le borraba el margen al titular. O sea que a
   quien pide menos movimiento —que muchas veces lo pide por mareo— se le
   entregaba la única versión con el texto encimado.

   La lección es la de siempre: un camino que ninguna prueba pisa es donde se
   acumulan los defectos que ya creías arreglados. */
console.log('\n── con «menos movimiento» ──');
{
  const ctx=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const pg=await ctx.newPage();
  await pg.goto(SITIO,{waitUntil:'networkidle'});
  await pg.waitForTimeout(400);
  const r=await pg.evaluate(()=>{
    const h1=document.querySelector('h1');
    const p=document.querySelector('.entrada');
    const a=h1.getBoundingClientRect(), c=p.getBoundingClientRect();
    return {
      quieto:document.documentElement.classList.contains('quieto'),
      hueco:Math.round(c.top-a.bottom),
      /* Nada de transformaciones a medias: el texto tiene que estar donde va. */
      movido:[...document.querySelectorAll('[data-mueve="mascara"] > span')]
        .some(s=>getComputedStyle(s).transform!=='none'),
    };
  });
  ok(r.quieto,'la clase `quieto` se queda: nada de movimiento');
  ok(!r.movido,'ningún texto se queda desplazado');
  /* ⚠ EL UMBRAL NO ES `>= 0`, Y ASÍ LO ESCRIBÍ PRIMERO. Con el defecto puesto
     el hueco de CAJA queda en 0 y la prueba pasaba tan campante — pero con
     `line-height:.86` las letras se salen de su renglón, así que 0 de caja ya
     es el punto de «antes.» encima del párrafo. La caja no es lo pintado, otra
     vez. El titular tiene `margin-bottom:.42em` escrito y a 390px eso son ~28
     píxeles: se exige que la mayor parte de ese margen siga ahí. */
  ok(r.hueco>=20,`el titular no se come al párrafo (${r.hueco}px de aire)`);
  await pg.close();
}

/* Sin JavaScript: completa y quieta, y la tabla legible. */
console.log('\n── sin JavaScript ──');
const ctx=await b.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
const pg=await ctx.newPage();
await pg.goto(SITIO,{waitUntil:'load'});
const sin=await pg.evaluate(()=>({
  quieto:document.documentElement.classList.contains('quieto'),
  filas:document.querySelectorAll('#tabla tbody tr').length,
  tablaVisible:!document.getElementById('tabla').hidden,
  abierta:document.getElementById('todos').open,
  arriba:!!document.querySelector('[data-arriba]'),
  /* La pantalla la construye el script. Sin script no puede quedar un botón
     que no filtra nada: un control muerto es peor que no tenerlo. */
  fichas:document.querySelectorAll('.chip').length,
  appEscondida:document.getElementById('app').hidden,
}));
ok(sin.quieto,'la clase `quieto` se queda: nada de movimiento');
ok(sin.filas===7 && sin.tablaVisible && sin.abierta,'los 7 horarios se leen completos y abiertos');
ok(sin.fichas===0 && sin.appEscondida,'sin script no quedan fichas muertas');
ok(sin.arriba,'«volver arriba» sigue ahí (es un ancla)');
await pg.screenshot({path:`${OUT}/rev-sinjs.png`});
await b.close();
console.log(fallas? `\n✗ ${fallas} fallas` : '\n✓ todo pasa');
process.exit(fallas?1:0);
