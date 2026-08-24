/* Lista, por diapositiva, cada forma con su posición y su texto. Es el mapa
   que hace falta para editar el formato sin romperlo: sin él, uno anda
   cambiando <a:t> a ciegas. */
import { readFileSync, readdirSync } from 'node:fs';
const EMU = 914400;
const dir = '/home/user/mazi-central/fadori/presentacion/desempacado/ppt/slides/';
const n = +(process.argv[2] || 1);
const xml = readFileSync(dir + 'slide' + n + '.xml', 'utf8');

/* recorre sp, pic y grpSp sin perderse en los grupos */
function recorre(s, nivel, ruta){
  const re = /<p:(sp|pic|grpSp)>/g;
  let m, i = 0;
  while((m = re.exec(s))){
    const tipo = m[1];
    /* encontrar el cierre correspondiente contando anidados */
    let d = 1, p = re.lastIndex;
    const abre = new RegExp('<p:'+tipo+'>', 'g'), cierra = new RegExp('</p:'+tipo+'>', 'g');
    while(d > 0){
      abre.lastIndex = p; cierra.lastIndex = p;
      const a = abre.exec(s), c = cierra.exec(s);
      if(!c) break;
      if(a && a.index < c.index){ d++; p = a.index + 1; }
      else { d--; p = c.index + 1; }
    }
    const fin = p - 1;
    const cuerpo = s.slice(m.index + m[0].length, fin);
    i++;
    const nom = (cuerpo.match(/name="([^"]*)"/) || [,''])[1];
    const off = cuerpo.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
    const ext = cuerpo.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    const pos = off && ext
      ? (+off[1]/EMU).toFixed(2)+','+(+off[2]/EMU).toFixed(2)+' '+
        (+ext[1]/EMU).toFixed(2)+'×'+(+ext[2]/EMU).toFixed(2)
      : '—';
    const textos = [...cuerpo.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(x => x[1]);
    const sz = [...cuerpo.matchAll(/sz="(\d+)"/g)].map(x => +x[1]/100);
    console.log('  '.repeat(nivel) + (ruta?ruta+'.':'') + i + ' [' + tipo + '] ' +
      pos.padEnd(24) + ' ' + (sz.length ? sz[0]+'pt ' : '') +
      (nom ? '«'+nom+'» ' : '') +
      (textos.length ? JSON.stringify(textos.join(' ').slice(0,90)) : ''));
    if(tipo === 'grpSp') recorre(cuerpo, nivel+1, (ruta?ruta+'.':'')+i);
    re.lastIndex = fin;
  }
}
const cuerpo = xml.slice(xml.indexOf('<p:spTree>'), xml.lastIndexOf('</p:spTree>'));
console.log('══ diapositiva ' + n + ' ══');
recorre(cuerpo, 0, '');
