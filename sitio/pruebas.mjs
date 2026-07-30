import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
const RAIZ='/home/user/mazi-central';
const M={'.html':'text/html;charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml',
 '.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf'};
const srv=createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);
 if(p.endsWith('/'))p+='index.html'; const f=join(RAIZ,p);
 if(!existsSync(f)||statSync(f).isDirectory()){s.writeHead(404);s.end('404');return;}
 s.writeHead(200,{'Content-Type':M[extname(f)]||'text/plain;charset=utf-8'});s.end(readFileSync(f));});
await new Promise(r=>srv.listen(8092,'127.0.0.1',r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
const P=[]; const rev=(n,ok,d='')=>P.push({n,ok:!!ok,d});
for (const [nom,an,al,rm] of [['telefono',390,844,false],['laptop',1280,900,false],
                              ['ancho',1920,1080,false],['sin-movimiento',390,844,true]]) {
  const ctx=await nav.newContext({viewport:{width:an,height:al},deviceScaleFactor:2,
    isMobile:an<500,hasTouch:an<500,colorScheme:'dark',reducedMotion:rm?'reduce':'no-preference'});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('C:'+m.text())});
  const f404=[]; p.on('response',r=>{if(!r.ok())f404.push(r.status()+' '+r.url())});
  await p.goto('http://127.0.0.1:8092/sitio/',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3400);
  const d=await p.evaluate(()=>{
    const v=e=>{const s=getComputedStyle(e);return s.opacity!=='0'&&s.visibility!=='hidden'&&
      e.getBoundingClientRect().height>0};
    const rel=document.getElementById('reloj').textContent.replace(/\s/g,'');
    return{doc:document.documentElement.scrollWidth,win:innerWidth,
      logoFuente:getComputedStyle(document.querySelector('.logotipo')).fontFamily,
      cuerpoFuente:getComputedStyle(document.querySelector('.texto')).fontFamily,
      logoVisible:v(document.querySelector('.logotipo')),
      aveVisible:v(document.querySelector('.ave')),
      fraseVisible:v(document.querySelector('.frase')),
      seisVisible:v(document.querySelector('.seis')),
      seis:document.querySelector('.seis').textContent.trim().slice(0,40),
      wasapSinScroll:(()=>{const b=document.querySelector('.display .wasap');
        return b.getBoundingClientRect().top<innerHeight})(),
      reloj:rel, relojColor:getComputedStyle(document.getElementById('reloj')).color,
      secciones:document.querySelectorAll('section.dentro').length,
      chicos:[...document.querySelectorAll('a,button')].filter(e=>{const r=e.getBoundingClientRect();
        return r.height>0&&r.height<44}).length,
      desb:[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();
        return r.width>innerWidth+2&&r.right>innerWidth+2}).map(e=>e.tagName).slice(0,3),
      barra:!!document.getElementById('mazi-barra'),
    };});
  rev(nom+': sin desborde',d.doc<=d.win+1,`${d.doc}/${d.win} ${d.desb.join()}`);
  rev(nom+': logotipo en Mazi',/Mazi/.test(d.logoFuente),d.logoFuente.slice(0,20));
  rev(nom+': cuerpo NO en Mazi',!/Mazi/.test(d.cuerpoFuente),d.cuerpoFuente.slice(0,20));
  rev(nom+': la portada se ve completa',d.logoVisible&&d.aveVisible&&d.fraseVisible&&d.seisVisible,
    JSON.stringify({l:d.logoVisible,a:d.aveVisible,f:d.fraseVisible,s:d.seisVisible}));
  rev(nom+': los seis servicios en la 1a pantalla',/Páginas web/.test(d.seis),d.seis);
  rev(nom+': WhatsApp visible sin scroll',d.wasapSinScroll);
  rev(nom+': el reloj da hora real',/^\d{2}:\d{2}$/.test(d.reloj),d.reloj);
  rev(nom+': el fosforo solo en el reloj',d.relojColor.includes('232, 35, 42'),d.relojColor);
  rev(nom+': objetivos tactiles 44px',d.chicos===0,d.chicos+' chicos');
  rev(nom+': SIN barra interna (es la cara publica)',!d.barra);
  rev(nom+': sin errores ni 404',errs.length===0&&f404.length===0,[...errs,...f404].slice(0,2).join(' | '));
  // los efectos: que existan, que dibujen, y que respondan al DEDO
  const ef=await p.evaluate(async()=>{
    const cv=document.getElementById('neural');
    const cx=cv&&cv.getContext('2d');
    const antes=cx?cx.getImageData(0,0,cv.width,cv.height).data.some(v=>v!==0):null;
    return {neural:!!cv, neuralAncho:cv?cv.width:0, neuralPinta:antes,
      liquidoCanvas:!!document.querySelector('[data-liquido]'),
      liquidoListo:!!document.querySelector('[data-liquido].listo'),
      rx:!!document.querySelector('[data-rx-abajo]'),
      rxMascara:(()=>{const e=document.querySelector('[data-rx-abajo]');
        return e?(getComputedStyle(e).webkitMaskImage||getComputedStyle(e).maskImage||'').includes('radial'):false})(),
      ecos:document.querySelectorAll('.eco-capa').length,
    };});
  if(rm){
    // Con prefers-reduced-motion los efectos NO deben arrancar. Que esten
    // apagados aqui es la condicion correcta, no una falla.
    rev(nom+': los efectos NO arrancan (es lo correcto)',
      !ef.neuralPinta&&!ef.liquidoListo&&ef.ecos===0,
      JSON.stringify({n:ef.neuralPinta,l:ef.liquidoListo,e:ef.ecos}));
  } else {
    rev(nom+': fondo neural dibujando',ef.neural&&ef.neuralPinta===true,JSON.stringify({a:ef.neuralAncho,p:ef.neuralPinta}));
    rev(nom+': shader de liquido activo',ef.liquidoListo,'canvas='+ef.liquidoCanvas+' listo='+ef.liquidoListo);
    rev(nom+': mascara de rayos X puesta',ef.rxMascara,String(ef.rxMascara));
    rev(nom+': eco de texto (3 capas)',ef.ecos===3,ef.ecos+' capas');
  }
  // toca la pantalla y verifica que el efecto SIGUE al dedo
  if(!rm){
    await p.evaluate(()=>document.querySelector('.rx').scrollIntoView({block:'center'}));
    await p.waitForTimeout(400);
    const m1=await p.evaluate(()=>getComputedStyle(document.querySelector('[data-rx-abajo]')).webkitMaskImage);
    await p.mouse.move(60,120); await p.waitForTimeout(400);
    const m2=await p.evaluate(()=>getComputedStyle(document.querySelector('[data-rx-abajo]')).webkitMaskImage);
    rev(nom+': la mascara SIGUE al dedo',m1!==m2&&m2.includes('radial'),'cambio='+(m1!==m2));
    await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(300);
  }
  await p.screenshot({path:'caps/60-sitio-'+nom+'.png'});
  await ctx.close();
}
// prueba dura: si el JS truena, la portada TIENE que verse igual
const ctx=await nav.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p=await ctx.newPage();
await ctx.route('**/sitio/', async r=>{const t=(await (await fetch('http://127.0.0.1:8092/sitio/')).text())
  .replace(/<script>[\s\S]*?<\/script>/,'<script>throw new Error("truena a proposito")<\/script>');
  r.fulfill({status:200,contentType:'text/html;charset=utf-8',body:t});});
await p.goto('http://127.0.0.1:8092/sitio/',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(3600);
const vivo=await p.evaluate(()=>{const l=document.querySelector('.logotipo');
  return getComputedStyle(l).opacity!=='0'&&l.getBoundingClientRect().height>0
    && getComputedStyle(document.querySelector('.frase')).opacity!=='0';});
rev('si el JS truena, la portada se ve igual',vivo);
await p.screenshot({path:'caps/61-sitio-sin-js.png'});
console.log('\n'+'═'.repeat(66));
let mal=0;P.forEach(t=>{if(!t.ok)mal++;console.log((t.ok?'  ok  ':' FALLA')+' · '+t.n+(t.d?'  → '+t.d:''))});
console.log('═'.repeat(66));console.log(`${P.length-mal}/${P.length}`);
await nav.close();srv.close();process.exit(mal?1:0);
