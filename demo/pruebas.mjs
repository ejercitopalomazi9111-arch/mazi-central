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
const b=await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
let fallas=0;
const ok=(c,t)=>{ console.log((c?'  ✓ ':'  ✗ ')+t); if(!c) fallas++; };

for(const [n,w,h] of [['390',390,844],['320',320,720],['1440',1440,900]]){
  console.log('\n── '+n+' px ──');
  const pg=await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2})).newPage();
  const err=[]; pg.on('console',m=>m.type()==='error'&&err.push(m.text())); pg.on('pageerror',e=>err.push('PAGEERROR '+e.message));
  await pg.goto('http://127.0.0.1:8792/demo/',{waitUntil:'networkidle'});
  await pg.waitForTimeout(1000);

  /* MEDIR LO PINTADO, NO LA CAJA — la neurona medir-el-texto-pintado. Se toma
     el rectángulo REAL de cada bloque de texto (Range sobre el nodo, que da lo
     que se dibujó con la fuente de verdad) y se comprueba que ninguno se monte
     sobre otro. Es lo que habría cazado el titular encimado sin mirar nada. */
  const choques = await pg.evaluate(() => {
    const cajas=[];
    for(const el of document.querySelectorAll('h1 span,h2 span,p,li,dd,dt,caption,th,td,label,.arriba')){
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

  const m = await pg.evaluate(()=>({
    h1:document.querySelectorAll('h1').length,
    desborde:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
    charset:document.characterSet,
    lang:document.documentElement.lang,
    /* la prueba del dedo, contada */
    tocables:[...document.querySelectorAll('a,button,select,input,[tabindex]')].length,
    chicos:[...document.querySelectorAll('a,button,select')].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.height<44;}).map(e=>e.tagName+':'+Math.round(e.getBoundingClientRect().height)),
  }));
  ok(m.h1===1,'un solo h1');
  ok(!m.desborde,'sin desbordamiento horizontal');
  ok(m.charset==='UTF-8','charset UTF-8');
  ok(m.lang==='es','lang declarado');
  ok(m.chicos.length===0,'todo lo tocable ≥44px'+(m.chicos.length?': '+m.chicos.join(','):''));
  ok(m.tocables>=2,`responde al dedo en ${m.tocables} lugares`);

  await pg.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await pg.waitForTimeout(600);
  const arr = await pg.evaluate(()=>{const a=document.querySelector('[data-arriba]');return a?!a.classList.contains('lejos'):null;});
  ok(arr===true,'«volver arriba» aparece al bajar');
  await pg.screenshot({path:`${OUT}/rev-${n}.png`});
  ok(err.length===0,'cero errores de consola'+(err.length?': '+err[0]:''));
  await pg.close();
}

/* Sin JavaScript: completa y quieta, y la tabla legible. */
console.log('\n── sin JavaScript ──');
const ctx=await b.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
const pg=await ctx.newPage();
await pg.goto('http://127.0.0.1:8792/demo/',{waitUntil:'load'});
const sin=await pg.evaluate(()=>({
  quieto:document.documentElement.classList.contains('quieto'),
  filas:document.querySelectorAll('#tabla tbody tr').length,
  tablaVisible:!document.getElementById('tabla').hidden,
  arriba:!!document.querySelector('[data-arriba]'),
}));
ok(sin.quieto,'la clase `quieto` se queda: nada de movimiento');
ok(sin.filas===7 && sin.tablaVisible,'los 7 horarios se leen completos');
ok(sin.arriba,'«volver arriba» sigue ahí (es un ancla)');
await pg.screenshot({path:`${OUT}/rev-sinjs.png`});
await b.close();
console.log(fallas? `\n✗ ${fallas} fallas` : '\n✓ todo pasa');
process.exit(fallas?1:0);
