/* LO QUE COMPARTEN LOS TRES MEMES (además de gmod.js): la ruta de los sonidos y la pantalla de la
   herramienta de Grupo Mazi que se ve en la laptop. La pantalla es interfaz (texto y barras), no arte. */
import { THREE } from './gmod.js';
export const sfx = (n) => `../sfx/${n}.mp3`;

/* la pantalla: una app oscura con la marca, una barra de avance completa y el «antes / ahora» */
export function pantallaMazi(antes, ahora, { titulo = 'Herramienta Mazi' } = {}){
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640; const x = c.getContext('2d');
  x.fillStyle = '#170A26'; x.fillRect(0, 0, 1024, 640);
  const g = x.createLinearGradient(0, 0, 1024, 640); g.addColorStop(0, '#7E173555'); g.addColorStop(1, '#AC27FF33'); x.fillStyle = g; x.fillRect(0, 0, 1024, 640);
  x.fillStyle = '#241036'; x.fillRect(0, 0, 1024, 70);
  x.fillStyle = '#C77DFF'; x.font = '700 34px "Inter Tight", Arial, sans-serif'; x.fillText('GRUPO MAZI', 36, 47);
  x.fillStyle = '#B9AFC4'; x.font = '500 26px "Inter Tight", Arial, sans-serif'; x.fillText(titulo, 300, 46);
  x.fillStyle = '#F4EEF2'; x.font = '800 58px "Inter Tight", Arial, sans-serif'; x.fillText('Trabajo terminado', 60, 190);
  x.fillStyle = '#3a2350'; x.fillRect(60, 240, 900, 44); x.fillStyle = '#AC27FF'; x.fillRect(60, 240, 900, 44);
  x.fillStyle = '#fff'; x.font = '800 30px "Inter Tight", Arial, sans-serif'; x.fillText('100 %', 860, 273);
  x.fillStyle = '#B9AFC4'; x.font = '500 34px "Inter Tight", Arial, sans-serif'; x.fillText('Antes: ' + antes, 60, 380);
  x.fillStyle = '#C77DFF'; x.font = '800 54px "Inter Tight", Arial, sans-serif'; x.fillText('Ahora: ' + ahora, 60, 460);
  for(let i = 0; i < 4; i++){ x.fillStyle = '#2E1A44'; x.fillRect(60 + i * 230, 520, 200, 70); x.fillStyle = '#7E1735'; x.fillRect(60 + i * 230, 520, 200 * (.5 + i * .15), 70); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
