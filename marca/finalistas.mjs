#!/usr/bin/env node
/**
 * finalistas.mjs — la hoja de las que salvó el consejo.
 *
 * De los doce históricos de `herramientas/tipos.mjs`, el consejo dejó tres para
 * la marca y ascendió una al laboratorio. Esta hoja existe para una sola cosa:
 * verlas juntas Y verlas CHIQUITAS, que es donde se decide. El veredicto
 * anterior dejó dicho que la prueba de 10 minutos manda sobre la opinión, y la
 * prueba de 10 minutos es el cuadrito de 48 px de WhatsApp.
 *
 *   node marca/finalistas.mjs marca/finalistas.html
 */
import { writeFileSync } from 'node:fs';
import { svg } from '../herramientas/tipos.mjs';

const VACIO = '#120C1A', HUESO = '#EAE5E3';

const FINALISTAS = [
  {
    id: 'H12', papel: 'El logotipo', nombre: 'Gótica con rebote japonés',
    op: { alfabeto: 'textura', pincel: 'hane', grosor: 0.24, remate: 'ninguno' },
    porque: 'Estructura de Textura del siglo XIII con el final hane 跳ね, donde el pincel se '
          + 'levanta de golpe. Negra, condensada y hecha a mano — y el cruce sólo se puede hacer '
          + 'teniendo el esqueleto y el pincel separados. Ninguna fundidora la vende.',
    aguanta: 'Aguanta chica: el asta es gruesa y no hay pelo que desaparezca.',
  },
  {
    id: 'H02', papel: 'El sello, para tamaños chicos', nombre: 'Kakuji 角字',
    op: { alfabeto: 'tensho', grosor: 0.30, tracking: 0.06 },
    porque: 'El esqueleto del sello de la dinastía Qin —sin una sola diagonal, lo oblicuo '
          + 'resuelto con escalera— engordado hasta que el hueco casi se cierra. Es la versión '
          + 'de bloque que se usaba para grabar.',
    aguanta: 'La que mejor aguanta a 24 px: es casi todo masa.',
  },
  {
    id: 'H03', papel: 'Cartel y encabezado grande', nombre: 'Kanteiryū 勘亭流',
    op: { alfabeto: 'kanteiryu' },
    porque: 'Del Edo, para los carteles de kabuki: trazo gordo curvado hacia adentro y '
          + 'terminación en ángulo recto. No se diseñó para verse bien — se diseñó para no dejar '
          + 'hueco en el papel, porque el hueco significaba butaca vacía.',
    aguanta: 'Aguanta media calle. A 24 px empieza a cerrarse sola.',
  },
];

const VETADA = {
  id: 'H05', papel: 'Vetada como marca · asciende al laboratorio',
  nombre: 'Higemoji 髭文字',
  op: { alfabeto: 'kanteiryu', pincel: 'higemoji', cerdas: 7, grosor: 0.34, remate: 'ninguno' },
  porque: 'La letra de bigote de los puestos de hielo raspado y de sake. El oficio manda un '
        + 'reparto de 7-5-3: siete cerdas en el cuerpo del trazo, cinco donde se angosta y tres '
        + 'al terminar — y aquí eso no está escrito a mano, sale de que cada cerda sólo existe '
        + 'donde el trazo da para ella.',
  aguanta: 'Por qué se veta: las cerdas miden menos de un píxel a 32 px. No se ven peor — '
         + 'no se ven. Grande y en movimiento, es el mejor argumento de venta del sitio.',
};

const M = 'GRUPO MAZI';

const bloque = (f, veto = false) => `
<article class="${veto ? 'veto' : ''}">
  <header>
    <b>${f.id}</b>
    <h2>${f.nombre}</h2>
    <span>${f.papel}</span>
  </header>
  <div class="osc">${svg(M, f.op, HUESO, VACIO)}</div>
  <div class="clr">${svg(M, f.op, VACIO, HUESO)}</div>
  <div class="lock">
    <img src="logo/paloma.svg" alt="">
    <div>${svg(M, f.op, HUESO, VACIO)}</div>
  </div>
  <div class="chico">
    <span class="et">La prueba de verdad</span>
    <figure><div class="av">${svg(M, f.op, HUESO, VACIO)}</div><figcaption>48 px · avatar</figcaption></figure>
    <figure><div class="fv">${svg(M, f.op, HUESO, VACIO)}</div><figcaption>24 px · favicon</figcaption></figure>
  </div>
  <p>${f.porque}</p>
  <p class="ag">${f.aguanta}</p>
</article>`;

writeFileSync(process.argv[2] || 'marca/finalistas.html', `<meta charset="utf-8">
<title>Las que salvó el consejo</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:${VACIO};color:${HUESO};
       font:400 14px/1.65 "Segoe UI",system-ui,sans-serif;padding:44px 30px 60px}
  .wrap{max-width:1120px;margin:0 auto}
  h1{font-size:26px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px}
  .sub{color:#A99FB4;max-width:80ch;margin:0 0 6px}
  .sub b{color:${HUESO}}
  .fallo{color:#F2B03C;font-weight:600;margin:14px 0 34px}
  article{border-top:1px solid #2A2036;padding-top:18px;margin:0 0 40px}
  article.veto{border-top:1px solid #4A2036}
  header{display:flex;align-items:baseline;gap:12px;margin:0 0 16px;flex-wrap:wrap}
  header b{color:#AD21ED;font-size:12px;letter-spacing:.14em}
  .veto header b{color:#D4574E}
  header h2{font-size:19px;font-weight:700;margin:0;letter-spacing:-.01em}
  header span{margin-left:auto;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;
              color:#8B8296}
  article>div{padding:22px 26px;border-radius:11px;margin:0 0 9px}
  .osc{background:${VACIO};border:1px solid #2A2036}
  .clr{background:${HUESO}}
  .osc svg,.clr svg{width:100%;height:auto;max-height:96px;display:block}
  .lock{display:flex;align-items:center;gap:20px;flex-wrap:wrap;background:${VACIO};border:1px solid #2A2036}
  .lock img{height:64px;flex:0 0 auto}
  .lock>div{flex:1 1 220px;min-width:0}
  .lock svg{width:100%;height:auto;max-height:34px;display:block}
  .chico{display:flex;align-items:flex-end;gap:30px;flex-wrap:wrap;background:#180F22;border:1px solid #2A2036}
  .chico .et{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#8B8296;
             align-self:center;margin-right:4px}
  .chico figure{margin:0;text-align:center}
  .chico figcaption{font-size:10px;color:#6E657C;margin-top:8px;letter-spacing:.04em}
  .av svg{height:48px;width:auto}
  .fv svg{height:24px;width:auto}
  article p{color:#A99FB4;font-size:13.5px;margin:12px 0 0;max-width:88ch}
  article p.ag{color:#8B8296;font-size:12.5px;border-left:2px solid #2A2036;padding-left:12px}
  .veto p.ag{border-left-color:#D4574E;color:#C99B96}
</style>
<div class="wrap">
  <h1>Las que salvó el consejo</h1>
  <p class="sub">De las doce escrituras históricas, el equipo y los cuatro jueces dejaron
  <b>tres para la marca</b> y ascendieron una al laboratorio. El criterio que las separó no fue
  el gusto: fue <b>si sobreviven chiquitas</b>. Nueve murieron ahí.</p>
  <p class="fallo">VEREDICTO: CONSTRUIR — con tres, y una vetada. La H12 manda; la prueba de
  10 minutos manda sobre nosotros.</p>
  ${FINALISTAS.map(f => bloque(f)).join('\n')}
  ${bloque(VETADA, true)}
</div>
`);
console.log('✒  ' + (process.argv[2] || 'marca/finalistas.html'));
