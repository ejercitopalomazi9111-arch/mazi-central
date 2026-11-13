/* «Escuchar» en cada mensaje de La Sala (Carlos, e1177, 13 nov). La voz del navegador se cambia por una de
   mentiras que apunta lo que le piden decir: aquí no hay bocinas, y lo que importa es QUÉ se manda a leer. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const raiz = fileURLToPath(new URL('..', import.meta.url));
const PUERTO = 8800 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PUERTO), '--bind', '127.0.0.1'], { cwd: raiz, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:2});
const pg=await ctx.newPage();
const err=[]; pg.on('pageerror',e=>err.push(e.message));
let f=0; const ok=(c,t)=>{ console.log((c?'  ✓ ':'  ✗ ')+t); if(!c) f++; };
await pg.addInitScript(()=>{
  window.__dicho=[];
  const real=window.speechSynthesis;
  const falso={ _cola:[], paused:false, speaking:false, getVoices:()=>[{name:'Paulina',lang:'es-MX',localService:true},{name:'Samantha',lang:'en-US'},{name:'Paulina (mejorada)',lang:'es-MX',localService:true}],
    addEventListener(){}, cancel(){ this._cola.forEach(u=>u.onerror&&u.onerror({error:'canceled'})); this._cola=[]; window.__dicho.push('<cancel>'); },
    resume(){}, speak(u){ this._cola.push(u); window.__dicho.push({t:u.text,voz:u.voice&&u.voice.name}); },
    _acabar(){ const c=this._cola; this._cola=[]; c.forEach(u=>u.onend&&u.onend()); } };
  Object.defineProperty(window,'speechSynthesis',{value:falso});
  window.SpeechSynthesisUtterance=function(t){ this.text=t; };
});
await pg.goto(`http://127.0.0.1:${PUERTO}/sala/`,{waitUntil:'load'});
await pg.click('#bDemo'); await pg.waitForTimeout(800);
const n=await pg.locator('[data-oir]').count();
ok(n>0, `cada mensaje trae su botón de escuchar (${n})`);
const id=await pg.locator('[data-oir]').first().getAttribute('data-oir');
await pg.locator('[data-oir]').first().scrollIntoViewIfNeeded();
await pg.locator('[data-oir]').first().tap();
await pg.waitForTimeout(200);
const d=await pg.evaluate(()=>window.__dicho);
const hablado=d.filter(x=>x.t);
ok(hablado.length>0 && / dice: /.test(hablado[0].t), 'al tocarlo lo lee, con quién lo dijo: «'+(hablado[0]?.t||'').slice(0,70)+'…»');
ok(hablado.every(x=>x.voz==='Paulina (mejorada)'), 'con la voz mexicana mejorada si el teléfono la tiene');
ok(hablado.every(x=>x.t.length<=230), 'en pedazos cortos');
ok(await pg.locator(`[data-oir="${id}"].sonando`).count()===1, 'el botón queda en «parar» mientras suena');
if(process.env.FOTO) await pg.screenshot({path:process.env.FOTO});
await pg.locator(`[data-oir="${id}"]`).tap(); await pg.waitForTimeout(100);
ok(await pg.locator('.sonando').count()===0, 'tocarlo otra vez lo calla');
await pg.locator('[data-oir]').first().tap(); await pg.waitForTimeout(100);
await pg.evaluate(()=>speechSynthesis._acabar()); await pg.waitForTimeout(100);
ok(await pg.locator('.sonando').count()===0, 'al terminar de leer, el botón vuelve a «escuchar»');
const t=await pg.evaluate(()=>textoParaOir({de:{id:'x',nombre:'Luna'},texto:'Mira **esto**:\n```js\nconst a=1;\n```\nY https://x.dev/a ya quedó.',adjuntos:[{},{}]}));
ok(!/const a|https|\*\*/.test(t) && /pedazo de código/.test(t) && /un enlace/.test(t) && /2 archivos/.test(t), 'no lee el código ni los links letra por letra: «'+t+'»');
const ancho=await pg.evaluate(()=>document.documentElement.scrollWidth);
ok(ancho<=390, 'nada se sale de lado ('+ancho+')');
ok(err.length===0, 'cero errores'+(err.length?': '+err[0]:''));
console.log(`\n${10 - f} pasan · ${f} fallan`);
await b.close(); srv.kill(); process.exit(f?1:0);
