/* EL LOGO ORIGINAL EN UN SOLO ARCHIVO: la paloma vectorizada + «GRUPO MAZI» en la letra de la casa,
   en renglón (Carlos, 4 nov: «usa el logo original en todo por ahora»). Sale en dos tintas:
     logo/original-claro.svg  → letras hueso, para fondo oscuro
     logo/original-tinta.svg  → letras casi negras, para fondo claro
   node marca/logo/armar-original.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { svg } from '../../herramientas/tipos.mjs';
const aqui = (f) => new URL('./' + f, import.meta.url);
const pal = readFileSync(aqui('paloma.svg'), 'utf8').replace(/<\?xml[^>]*\?>/, '');
const [px, py, pw, ph] = pal.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const palCuerpo = pal.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const txt = svg('GRUPO MAZI', { alfabeto: 'mazi' }, 'currentColor', null);
const [tx, ty, tw, th] = txt.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const txtCuerpo = txt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
/* la paloma mide 1 de alto; el texto, .42 de su alto, centrado y a .12 de separación */
const H = 1000, sP = H / ph, aP = pw * sP, hT = H * .5, sT = hT / th, aT = tw * sT, sep = H * .12;
const W = aP + sep + aT;
for (const [nombre, tinta] of [['original-claro', '#E9E4E4'], ['original-tinta', '#170A26']]) {
  writeFileSync(aqui(nombre + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="${(W / 2).toFixed(0)}" height="${H / 2}" viewBox="0 0 ${W.toFixed(1)} ${H}" role="img" aria-label="Grupo Mazi">
<g transform="scale(${sP.toFixed(5)}) translate(${-px} ${-py})">${palCuerpo}</g>
<g color="${tinta}" fill="${tinta}" transform="translate(${(aP + sep).toFixed(1)} ${((H - hT) / 2).toFixed(1)}) scale(${sT.toFixed(5)}) translate(${-tx} ${-ty})">${txtCuerpo}</g>
</svg>\n`);
  console.log('listo', nombre);
}
