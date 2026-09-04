/* ══════════════════════════════════════════════════════════════════════════
   LA COMPUERTA DEL CARTEL
   ──────────────────────────────────────────────────────────────────────────
   Tres cosas que una lámina puede tener mal sin que se note mirándola:

   1 · CONTRASTE CONTRA EL FONDO DE VERDAD. Aquí el fondo no es un color: es
       un degradado con un haz de luz cruzando por detrás del titular. Medir
       contra «el negro del cartel» daría un número bonito y falso. Se apaga
       la capa de texto, se fotografía lo que queda, y cada texto se compara
       contra los PÍXELES REALES que tiene debajo — el peor de todos.
   2 · ÁREA SEGURA. Nada legible puede entrar en los 18 mm del corte, porque
       la guillotina no es exacta.
   3 · CUERPO MÍNIMO. Impreso, por debajo de 3 mm no se lee.
   4 · QUE LA MARCA SEA VERDE DE MARCA. Ésta se añadió porque FALLÓ: el
       primer corte de esta versión enseñaba por el hueco la nebulosa tal
       cual, y la nebulosa es azul-teal — la marca salía CIAN. Se veía en
       la pantalla y ninguna comprobación lo decía. Ahora el aspa se mide
       contra #1DB954 y el anillo se recorre punto por punto: una marca
       rota o de otro color pone la compuerta roja.
   ═══════════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = dirname(fileURLToPath(import.meta.url));   /* la carpeta de este archivo */
const T = { '.html':'text/html', '.woff2':'font/woff2', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg' };
const srv = http.createServer(async (q,r)=>{ const f=join(DIR,decodeURIComponent(new URL(q.url,'http://x').pathname));
  try{ const d=await readFile(f); r.setHeader('content-type',T[extname(f)]||'application/octet-stream'); r.end(d); }
  catch(e){ r.statusCode=404; r.end('no'); } });
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const P = srv.address().port;

let nav=null;
for(const d of ['playwright','/opt/node22/lib/node_modules/playwright/index.mjs','/usr/lib/node_modules/playwright/index.mjs']){
  try{ nav=await (await import(d)).chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}); break; }catch(e){}
}
if(!nav){ console.log('sin navegador'); process.exit(0); }

let bien=0, mal=0;
const ok=(q,c,d)=>{ if(c){bien++;console.log('  ✓ '+q);} else {mal++;console.log('  ✗ '+q+(d?'\n      '+d:''));} };

const ctx = await nav.newContext({ viewport:{ width:1912, height:2668 }, deviceScaleFactor:1 });
const pg = await ctx.newPage();
await pg.goto(`http://127.0.0.1:${P}/poster.html`, { waitUntil:'networkidle' });
await pg.evaluate(()=>document.fonts.ready);
await pg.waitForTimeout(600);

/* ── el fondo solo, sin una letra encima ── */
await pg.evaluate(()=>{ document.querySelector('.capa').style.visibility='hidden'; });
await pg.waitForTimeout(200);
const fondo = (await pg.screenshot()).toString('base64');
await pg.evaluate(()=>{ document.querySelector('.capa').style.visibility='visible'; });

const r = await pg.evaluate(async (b64)=>{
  const img = new Image();
  await new Promise(res=>{ img.onload=res; img.src='data:image/png;base64,'+b64; });
  const cv = document.createElement('canvas');
  cv.width=img.width; cv.height=img.height;
  const cx = cv.getContext('2d'); cx.drawImage(img,0,0);

  const lum = ([R,G,B]) => { const f=v=>{v/=255; return v<=.03928? v/12.92 : Math.pow((v+.055)/1.055,2.4);};
                             return .2126*f(R)+.7152*f(G)+.0722*f(B); };
  const raz = (a,b)=>{ const [x,y]=[lum(a),lum(b)]; const [hi,lo]=x>y?[x,y]:[y,x]; return (hi+.05)/(lo+.05); };
  const rgb = s => s.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);

  /* Cada texto que alguien va a leer. El cuerpo mínimo va en mm porque un
     cartel se lee impreso, no a 100 % en pantalla. */
  const piezas = [
    ['cejilla',            '.cejilla',      3.0],
    ['folio',              '.folio',        3.0],
    ['titular · línea 1',  '.titular h1',   8.0],
    ['titular · línea 2',  '.titular h1 span', 8.0],
    ['bajada',             '.bajada',       3.6],
    ['aviso de concepto',  '.pie .aviso',   3.0],
    ['firma',              '.pie .marca',   3.0],
  ];
  const MM = 3.7795275591;
  const seguro = 21 * MM;                       /* 18 mm + 3 mm de sangrado */
  const hoja = { w:506*MM, h:706*MM };

  const out = [];
  for(const [nombre, sel, mmMin] of piezas){
    const el = document.querySelector(sel);
    if(!el){ out.push({ nombre, falta:true }); continue; }
    const c = el.getBoundingClientRect();
    const color = rgb(getComputedStyle(el).color);
    const cuerpo = parseFloat(getComputedStyle(el).fontSize) / MM;

    /* el peor píxel del fondo bajo la caja del texto */
    const x0=Math.max(0,Math.floor(c.left)), y0=Math.max(0,Math.floor(c.top));
    const w=Math.min(Math.ceil(c.width), cv.width-x0), h=Math.min(Math.ceil(c.height), cv.height-y0);
    let peor=Infinity, peorPx=null;
    if(w>0 && h>0){
      const d = cx.getImageData(x0,y0,w,h).data;
      const paso = Math.max(1, Math.floor(Math.sqrt(w*h/2600)));
      for(let y=0;y<h;y+=paso) for(let x=0;x<w;x+=paso){
        const i=(y*w+x)*4; const px=[d[i],d[i+1],d[i+2]];
        const v=raz(color,px);
        if(v<peor){ peor=v; peorPx=px; }
      }
    }
    out.push({ nombre, contraste:+peor.toFixed(2), peorPx, cuerpo:+cuerpo.toFixed(2), mmMin,
      dentro: c.left>=seguro-.5 && c.top>=seguro-.5 &&
              c.right<=hoja.w-seguro+.5 && c.bottom<=hoja.h-seguro+.5,
      caja:[Math.round(c.left),Math.round(c.top),Math.round(c.right),Math.round(c.bottom)] });
  }
  return { out, seguro:Math.round(seguro), hoja:{w:Math.round(hoja.w),h:Math.round(hoja.h)} };
}, fondo);

console.log('\n── CONTRASTE CONTRA EL FONDO REAL (mínimo AA para texto grande: 3.0; normal: 4.5) ──');
for(const p of r.out){
  if(p.falta){ ok(p.nombre+': existe', false, 'no se encontró el elemento'); continue; }
  const grande = p.cuerpo >= 6.2;                  /* ≈ 24 px / 18 pt */
  const min = grande ? 3.0 : 4.5;
  ok(`${p.nombre} — ${p.contraste}:1 sobre rgb(${p.peorPx}) · ${p.cuerpo} mm`,
     p.contraste >= min, `pide ${min}:1 y da ${p.contraste}:1`);
}
console.log('\n── ÁREA SEGURA (nada legible dentro de 18 mm del corte) ──');
for(const p of r.out) if(!p.falta)
  ok(`${p.nombre} dentro del área segura`, p.dentro, `caja ${p.caja} · seguro ${r.seguro}..${r.hoja.w-r.seguro}`);
console.log('\n── CUERPO MÍNIMO PARA IMPRESIÓN ──');
for(const p of r.out) if(!p.falta)
  ok(`${p.nombre} — ${p.cuerpo} mm (mínimo ${p.mmMin})`, p.cuerpo >= p.mmMin);

/* ── 4 · EL COLOR Y LA INTEGRIDAD DE LA MARCA ──────────────────────────────
   El hueco es el único sitio de la lámina con el color a saturación entera,
   así que es el único que puede equivocarse de color sin que nada avise. */
/* Se mide sobre la LÁMINA RENDERIZADA, no sobre el SVG suelto: el SVG
   referencia imágenes externas y como data-uri no las carga — daría verde
   por no dibujar nada, que es la peor clase de comprobación. */
const lamina = (await pg.screenshot()).toString('base64');
const m = await pg.evaluate(async (b64)=>{
  const img = new Image();
  await new Promise(res=>{ img.onload=res; img.src='data:image/png;base64,'+b64; });
  const cv = document.createElement('canvas');
  cv.width=img.width; cv.height=img.height;
  const cx = cv.getContext('2d'); cx.drawImage(img,0,0);
  const d = cx.getImageData(0,0,cv.width,cv.height).data;
  const W = cv.width;
  const en = (x,y)=>{ const i=((y|0)*W+(x|0))*4; return [d[i],d[i+1],d[i+2]]; };
  const tono = ([R,G,B])=>{ const M=Math.max(R,G,B), n=Math.min(R,G,B), c=M-n;
    if(!c) return -1; let h;
    if(M===R) h=((G-B)/c)%6; else if(M===G) h=(B-R)/c+2; else h=(R-G)/c+4;
    return (h*60+360)%360; };

  /* el aspa: un disco en el cruce, promediado para que una estrella no mande */
  let s=[0,0,0], n=0;
  for(let y=-34;y<=34;y+=2) for(let x=-34;x<=34;x+=2){
    if(x*x+y*y>34*34) continue;
    const p=en(956+x,800+y); s[0]+=p[0]; s[1]+=p[1]; s[2]+=p[2]; n++;
  }
  const aspa = s.map(v=>Math.round(v/n));

  /* el anillo: 24 puntos sobre la circunferencia r=290 */
  const ring=[];
  for(let k=0;k<24;k++){
    const a=k*Math.PI/12;
    ring.push(en(956+290*Math.cos(a), 800+290*Math.sin(a)));
  }
  return { aspa, tonoAspa:Math.round(tono(aspa)), tam:[cv.width,cv.height],
           ring: ring.map(p=>({p, t:Math.round(tono(p)), verde:p[1]>p[0]+18 && p[1]>p[2]+10})) };
}, lamina);

console.log('\n── LA MARCA ES VERDE DE MARCA, Y ENTERA ──');
{
  const [R,G,B] = m.aspa;
  /* El tono SOLO significa algo si hay croma. Un gris da un ángulo de tono
     cualquiera y pasaría la prueba: mutando el hueco a la foto cruda salió
     rgb(68,97,75) —casi gris— con tono 134°, y este check se quedó verde.
     Por eso el croma va DENTRO de la misma comprobación y no al lado. */
  const croma = Math.max(R,G,B) - Math.min(R,G,B);
  ok(`el aspa es verde de marca y no cian ni gris — rgb(${m.aspa}) tono ${m.tonoAspa}° croma ${croma}`,
     m.tonoAspa >= 105 && m.tonoAspa <= 160 && croma >= 70,
     `verde de Xbox ≈ 141° con croma alto; cian ≈ 175-195°; croma < 70 = no hay color que juzgar`);
  ok(`el verde domina en el aspa — G=${G} R=${R} B=${B}`,
     G > R + 40 && G > B + 25, 'si G no domina, el hueco se pintó del color de la foto');
  const vivos = m.ring.filter(x=>x.verde).length;
  ok(`el anillo está entero — ${vivos}/24 puntos en verde`,
     vivos >= 18, 'el polvo puede velar el anillo, no cortarlo');
}

console.log(`\n${bien} bien · ${mal} mal\n`);
await nav.close(); srv.close();
process.exit(mal?1:0);
