/* Visor de la presentación · lee el .pptx YA GENERADO y lo dibuja en HTML
   para poder mirarlo. No es una maqueta de lo que quise hacer: sale de las
   coordenadas que de verdad quedaron dentro del archivo.
   (LibreOffice no corre en este contenedor, ni con un .txt.) */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
const EMU = 914400, W = 13.333, H = 7.5, ESC = 96;   /* px por pulgada */

execSync('rm -rf /tmp/desempacado && mkdir -p /tmp/desempacado && cd /tmp/desempacado && unzip -q ' +
         JSON.stringify(process.cwd() + '/Fadori-STEAM.pptx'));

const leer = (p) => readFileSync('/tmp/desempacado/' + p, 'utf8');
const esc = (t) => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const orden = leer('ppt/presentation.xml')
  .match(/<p:sldId [^>]*r:id="([^"]+)"/g).map(m => m.match(/r:id="([^"]+)"/)[1]);
const relsPres = leer('ppt/_rels/presentation.xml.rels');
const laminas = orden.map(id => {
  const m = relsPres.match(new RegExp('Id="'+id+'"[^>]*Target="([^"]+)"'));
  return m[1].replace(/^\/?/, '').replace(/^\.\.\//,'');
});

let html = `<meta charset="utf-8"><style>
 body{background:#3a3a3a;font-family:system-ui;margin:0;padding:22px}
 .l{position:relative;width:${W*ESC}px;height:${H*ESC}px;margin:0 auto 26px;
    overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.5);background:#fff}
 .n{position:absolute;left:8px;top:6px;color:#fff;font:700 13px system-ui;
    background:#000a;padding:2px 8px;border-radius:8px;z-index:99}
 .sh{position:absolute;box-sizing:border-box}
 .tx{position:absolute;box-sizing:border-box;overflow:hidden;white-space:pre-wrap}
</style>`;

laminas.forEach((ruta, i) => {
  const xml = leer('ppt/' + ruta);
  const rels = leer('ppt/slides/_rels/' + ruta.split('/').pop() + '.rels');
  const fondo = (xml.match(/<p:bg>.*?srgbClr val="([0-9A-Fa-f]{6})"/s) || [,'FFFFFF'])[1];
  html += `<div class="l" style="background:#${fondo}"><span class="n">${i+1}</span>`;

  /* cada forma: caja + relleno + texto */
  for(const m of xml.matchAll(/<p:(sp|pic)>(.*?)<\/p:\1>/gs)){
    const tipo = m[1], cuerpo = m[2];
    const off = cuerpo.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
    const ext = cuerpo.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    if(!off || !ext) continue;
    const x = +off[1]/EMU*ESC, y = +off[2]/EMU*ESC;
    const w = +ext[1]/EMU*ESC, h = +ext[2]/EMU*ESC;

    if(tipo === 'pic'){
      const emb = cuerpo.match(/r:embed="([^"]+)"/);
      let src = '';
      if(emb){
        const t = rels.match(new RegExp('Id="'+emb[1]+'"[^>]*Target="([^"]+)"'));
        if(t){
          const f = t[1].replace(/^\.\.\//,'');
          const b = readFileSync('/tmp/desempacado/ppt/' + f).toString('base64');
          src = 'data:image/png;base64,' + b;
        }
      }
      html += `<img class="sh" src="${src}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">`;
      continue;
    }

    /* el relleno de la FORMA vive dentro de <p:spPr>. Sin acotarlo ahí, se
       agarra el color de la LETRA y cada caja de texto sale como una barra
       de color. Pasó en la primera pasada. */
    const spPr = (cuerpo.match(/<p:spPr>(.*?)<\/p:spPr>/s) || [,''])[1];
    const relleno = spPr.match(/<a:solidFill><a:srgbClr val="([0-9A-Fa-f]{6})"/);
    const redondo = /roundRect|ellipse/.test(spPr);
    const circulo = /prst="ellipse"/.test(spPr);
    if(relleno){
      html += `<div class="sh" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;`+
        `background:#${relleno[1]};border-radius:${circulo?'50%':(redondo?'12px':'0')}"></div>`;
    }

    /* el texto, con su tamaño y color reales */
    const parrafos = [...cuerpo.matchAll(/<a:p>(.*?)<\/a:p>/gs)].map(p => p[1]);
    if(!parrafos.length) continue;
    const alin = /algn="ctr"/.test(cuerpo) ? 'center' : 'left';
    const anc  = /anchor="ctr"/.test(cuerpo) ? 'center' : 'flex-start';
    let dentro = '';
    for(const p of parrafos){
      for(const r of p.matchAll(/<a:rPr([^>]*?)(?:\/>|>(.*?)<\/a:rPr>)\s*<a:t>(.*?)<\/a:t>/gs)){
        const at = r[1] + (r[2] || ''), t = r[3];
        const sz = (at.match(/sz="(\d+)"/) || [,1800])[1] / 100;
        const bold = /b="1"/.test(at);
        const col = (r[0].match(/<a:srgbClr val="([0-9A-Fa-f]{6})"/) || [,'000000'])[1];
        dentro += `<span style="font-size:${sz*ESC/72}px;font-weight:${bold?800:400};color:#${col}">${esc(t)}</span>`;
      }
      dentro += '<br>';
    }
    html += `<div class="tx" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;`+
      `display:flex;flex-direction:column;justify-content:${anc};text-align:${alin};`+
      `line-height:1.25">${dentro}</div>`;
  }
  html += '</div>';
});

mkdirSync('/tmp/vista', { recursive: true });
writeFileSync('/tmp/vista/index.html', html);
console.log('✓ /tmp/vista/index.html ·', laminas.length, 'láminas');
