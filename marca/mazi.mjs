#!/usr/bin/env node
/**
 * mazi.mjs — la tipografía de la casa, y de dónde salió cada parte.
 *
 * Carlos eligió como base "la que parece reloj" —Norma, la superelipse de
 * tablero de instrumento— y pidió combinarle las otras dos. Esta hoja no sólo
 * la enseña: enseña QUÉ entró de cada quien, porque una combinación que no se
 * puede desarmar no es una combinación, es una mezcla.
 *
 *   node marca/mazi.mjs marca/mazi.html
 */
import { writeFileSync } from 'node:fs';
import { svg } from '../herramientas/tipos.mjs';

const VACIO = '#120C1A', HUESO = '#EAE5E3', VIOLETA = '#AD21ED';
const M = 'GRUPO MAZI';
const OP = { alfabeto: 'mazi' };

const PADRES = [
  ['Norma', 'norma', 'el esqueleto entero',
   'La que parece reloj. Superelipse en cada letra redonda —lado recto, esquina curva—, '
   + 'peso parejo y ritmo idéntico. Es la base, y se tiene que notar que es la base.'],
  ['Reactor', 'reactor', 'el bisel, mudado a la punta',
   'De aquí NO entró la condensación ni la inclinación ni el estencil: eso rompía la letra '
   + 'de reloj. Entró el bisel, pero cambiado de sitio — de la esquina de la letra a la punta '
   + 'del trazo. Eso es el ochavo.'],
  ['Cercana', 'cercana', 'la apertura abierta',
   'La C, la G y la S dejan de morderse la cola, y la minúscula respira. Es lo único que le '
   + 'baja lo frío a un instrumento sin volverlo blando.'],
];

const DETALLES = [
  ['El ochavo', 'Cada punta libre lleva dos chaflanes de 45° en vez de un corte a escuadra. '
    + 'Sólo las libres: en una unión, un chaflán deja muesca. Es lo maquinado sin condensar.'],
  ['Ancho al 100%', 'Norma iba al 106%. Bajó a 100% por una razón medida, no de gusto: al 106% '
    + 'el logotipo no cabe cuadrado en un favicon sin encogerse de más.'],
  ['Grosor 0.19', 'Norma pesaba 0.15 y Reactor 0.21. Éste no es el promedio: es el mínimo con el '
    + 'que el ochavo se ALCANZA A VER. A 0.175 el chaflán medía tres píxeles y no existía.'],
  ['La M a 3.8', 'Norma tenía el vértice muy alto y con el ochavo se cerraba el hueco. Bajó al '
    + 'punto medio con Cercana.'],
  ['Las divisiones', 'Después entró también el corte de estencil de Reactor. Va sólo en el asta '
    + 'de altura completa: un brazo de E cortado a la mitad no se lee estarcido, se lee roto. En '
    + 'Reactor eso no pasaba porque va condensada y los brazos no llegaban al mínimo; en una '
    + 'letra ancha sí llegan.'],
  ['Modo segmentos', 'Lo que Carlos mandó con la foto del reloj de LED: la letra no es un dibujo '
    + 'continuo, son barras que NUNCA se tocan, con un hueco fino en cada unión y las puntas '
    + 'cortadas en diagonal pero con la punta PLANA, no de rombo. Y no hubo que inventar dónde van '
    + 'los huecos: la lista de uniones de cada glifo ya existía, escrita para taparlas con un '
    + 'disco. En modo segmentos se hace lo contrario — cada unión se vuelve corte y el disco no se '
    + 'dibuja. Un campo que servía para pegar, usado para separar.'],
  ['La I como el 1 del reloj', 'En un display de segmentos el 1 no es una barra: son dos barras '
    + 'apiladas con un hueco en medio y las puntas que se miran cortadas en diagonal, porque si no '
    + 'los segmentos se tocarían. Aquí sale de la división al centro más el ochavo. Es la excepción '
    + 'a la regla de que una letra de un solo trazo no se parte — en este alfabeto, partida ES la '
    + 'letra.'],
  ['La M, triángulo de punta plana', 'Las astas ya no son verticales: se abren hacia la base, así '
    + 'que la letra es ancha abajo y angosta arriba, y el vértice del medio se queda a media altura '
    + 'para que las patas no se separen del todo. Antes eran dos astas paralelas con un hueco '
    + 'enorme entre las patitas; ahora es UNA figura. La v y la w llevan la misma punta plana.'],
  ['La caja baja, rehecha', 'Venía heredada del esqueleto neutro, que es circular, y por eso no '
    + 'encajaba: una O de superelipse junto a una o de compás cantan. Ahora el juego completo sigue '
    + 'la misma ley que la mayúscula — cuenco de lado recto y esquina curva, hombro de techo plano, '
    + 'asta derecha.'],
  ['La g que se leía como q', 'La razón era concreta: su cola arrancaba a la altura de x, así que '
    + 'todo el lado derecho de la letra era una recta larga de arriba abajo — que es exactamente el '
    + 'asta de la q. Ahora el cuenco es un anillo cerrado y la cola nace del PIE del cuenco. Eso es '
    + 'lo único que de verdad las separa.'],
  ['La división de la R', 'La única que no puede salir de una regla. El asta, el cuenco y la '
    + 'pierna se juntan en un punto, y aunque el puente automático cayera ahí, el cuenco y la '
    + 'pierna lo tapaban con su propia tinta — por eso la R parecía la única sin corte. Se '
    + 'declara en el glifo y se cortan los tres trazos en el mismo punto. Arreglado también en '
    + 'Reactor, que es donde se vio.'],
];

const comp = (nom, alf, papel, txt) => `
  <div class="pad">
    <div class="pn"><b>${nom}</b><span>${papel}</span></div>
    <div class="pm">${svg(M, { alfabeto: alf }, '#8B8296', VACIO)}</div>
    <p>${txt}</p>
  </div>`;

writeFileSync(process.argv[2] || 'marca/mazi.html', `<meta charset="utf-8">
<title>Mazi — la tipografía de la casa</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:${VACIO};color:${HUESO};
       font:400 14px/1.65 "Segoe UI",system-ui,sans-serif;padding:44px 30px 60px}
  .wrap{max-width:1120px;margin:0 auto}
  h1{font-size:27px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px}
  .sub{color:#A99FB4;max-width:80ch;margin:0 0 30px}
  .sub b{color:${HUESO}}
  h3{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8B8296;
     margin:38px 0 14px;border-top:1px solid #2A2036;padding-top:16px}
  .caja{padding:24px 26px;border-radius:12px;margin:0 0 9px;
        background:${VACIO};border:1px solid #2A2036}
  .clr{background:${HUESO};border-color:${HUESO}}
  .caja>svg{width:100%;height:auto;max-height:104px;display:block}
  .lock{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
  .lock img{height:70px;flex:0 0 auto}
  .lock>div{flex:1 1 220px;min-width:0}
  .lock svg{width:100%;height:auto;max-height:36px;display:block}
  .et{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#8B8296;
      display:block;margin:0 0 14px}
  .chico{display:flex;align-items:flex-end;gap:30px;flex-wrap:wrap;background:#180F22}
  .chico .et{align-self:center;margin:0 4px 0 0}
  .chico figure{margin:0;text-align:center}
  .chico figcaption{font-size:10px;color:#6E657C;margin-top:8px;letter-spacing:.04em}
  .av svg{height:48px;width:auto}
  .fv svg{height:24px;width:auto}
  .juego{background:#180F22}
  .juego svg{width:100%;height:auto;max-height:42px;display:block;margin:0 0 10px}
  .uso{background:#180F22}
  .uso .mx svg{width:100%;height:auto;max-height:54px;display:block;margin:0 0 14px}
  .uso .ln svg{width:100%;height:auto;max-height:22px;display:block}
  .pad{border-top:1px solid #2A2036;padding:16px 0 0;margin:0 0 22px}
  .pn{display:flex;align-items:baseline;gap:12px;margin:0 0 12px}
  .pn b{font-size:15px}
  .pn span{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:${VIOLETA}}
  .pm svg{width:100%;height:auto;max-height:44px;display:block}
  .pad p{color:#8B8296;font-size:13px;margin:10px 0 0;max-width:88ch}
  ul{margin:14px 0 0;padding-left:20px;color:#A99FB4;font-size:13.5px;max-width:90ch}
  li{margin:0 0 9px}
  li b{color:${HUESO}}
</style>
<div class="wrap">
  <h1>Mazi · la tipografía de la casa</h1>
  <p class="sub">Base: <b>Norma</b>, la que parece reloj. Sobre ese esqueleto entran las otras
  dos, y cada una entra por <b>una sola puerta</b> — combinar es elegir qué se toma de cada
  quien, no promediar tres cosas hasta que no quede ninguna.</p>

  <div class="caja">${svg(M, OP, HUESO, VACIO)}</div>
  <div class="caja clr">${svg(M, OP, VACIO, HUESO)}</div>
  <div class="caja lock"><img src="logo/paloma.svg" alt=""><div>${svg(M, OP, HUESO, VACIO)}</div></div>

  <div class="caja chico">
    <span class="et">La prueba de verdad</span>
    <figure><div class="av">${svg(M, OP, HUESO, VACIO)}</div><figcaption>48 px · avatar</figcaption></figure>
    <figure><div class="fv">${svg(M, OP, HUESO, VACIO)}</div><figcaption>24 px · favicon</figcaption></figure>
  </div>

  <h3>De dónde salió cada parte</h3>
  ${PADRES.map(p => comp(...p)).join('')}

  <h3>Lo que sale de la mezcla y de ninguna de las tres</h3>
  <ul>${DETALLES.map(([q, t]) => `<li><b>${q}.</b> ${t}</li>`).join('')}</ul>

  <h3>El juego completo</h3>
  <div class="caja juego">
    ${svg('ABCDEFGHIJKLMNOPQRSTUVWXYZ', OP, HUESO, VACIO)}
    ${svg('abcdefghijklmnopqrstuvwxyz', OP, HUESO, VACIO)}
    ${svg('0123456789 ÁÉÍÓÚÜÑ ¿? ¡! & @ · /', OP, HUESO, VACIO)}
  </div>

  <h3>En uso</h3>
  <div class="caja uso">
    <div class="mx">${svg('Grupo Mazi', OP, HUESO, VACIO)}</div>
    <div class="ln">${svg('No lo hacemos en corto, lo hacemos a la larga.', OP, HUESO, VACIO)}</div>
    <div class="ln">${svg('Web · software · marketing · video · gestión', OP, HUESO, VACIO)}</div>
    <div class="ln">${svg('442 883 3786 · grupomazi.oficial@gmail.com', OP, HUESO, VACIO)}</div>
  </div>
</div>
`);
console.log('✒  ' + (process.argv[2] || 'marca/mazi.html'));
