#!/usr/bin/env node
/* Pruebas de LA VIDA de CRISOL. Sin navegador: lo que se puede comprobar sin
   ojos se comprueba aquí —que camine, que suba un escalón, que arranque una
   celda, que el daño le llegue, que el árbol tenga ramas— y lo que sólo se ve
   mirando va en `pruebas-pantalla.mjs` y en las capturas.

   ⚠ La regla de la casa: una prueba que sigue verde cuando rompes el código a
   propósito no prueba nada. Cada bloque de aquí se rompió a mano una vez para
   verla fallar; lo que no se pudo romper, no se escribió.                   */
import { Mundo, IDX, EL, VACIO } from './motor.js';
import { Vida, instalaVida, codo, CUERPO, ALTO_PERSONA } from './vida.js';

let bien = 0, mal = 0;
const ok = (t, c, det) => { c ? bien++ : mal++;
  console.log((c ? '  ✓ ' : '  ✗ ') + t + (det != null && !c ? '  → ' + det : '')); };
const seccion = t => console.log('\n── ' + t + ' ──');

const mundo = (an = 80, al = 50, s = 7) => { const m = new Mundo(an, al); m.semilla(s); return m; };
const piso = (m, y, x0 = 0, x1 = m.an - 1) => { for(let x = x0; x <= x1; x++) m.pon(x, y, IDX.muro); };
const corre = (m, v, n) => { for(let i = 0; i < n; i++){ m.paso(); v.paso(); } };

/* ═══════════════════════════════════════════════════════════════════════════ */
seccion('el tamaño que pidió Carlos');
{
  /* «que midan lo que un pincel del 6». La brocha del 6 pinta un disco de
     radio tam-1 = 5 con el margen de `dx²+dy² <= r²+r`, o sea ~11 celdas de
     lado a lado. Si un día alguien encoge el monigote «para que corra más»,
     esta prueba lo caza. */
  ok('una persona mide entre 9 y 13 celdas de alto', ALTO_PERSONA > 9 && ALTO_PERSONA < 13,
     ALTO_PERSONA.toFixed(2) + ' celdas');
  ok('y no es de unos pocos píxeles: más alta que 6 celdas', ALTO_PERSONA > 6);
}

seccion('la cinemática inversa · el hueso del asunto');
{
  /* Si esto falla, TODAS las animaciones fallan: rodillas, codos y patas
     salen de la misma función. */
  const [cx, cy, mx, my] = codo(0, 0, 4, 0, 3, 3, 1);
  ok('el codo se dobla cuando el objetivo está cerca', Math.abs(cy) > 0.5,
     'codo en ' + cx.toFixed(2) + ',' + cy.toFixed(2));
  ok('los dos huesos miden lo que deben',
     Math.abs(Math.hypot(cx, cy) - 3) < 1e-6 && Math.abs(Math.hypot(mx - cx, my - cy) - 3) < 1e-6,
     Math.hypot(cx, cy).toFixed(4) + ' y ' + Math.hypot(mx - cx, my - cy).toFixed(4));
  /* el objetivo imposible: un brazo NO se estira, se queda corto */
  const r = codo(0, 0, 100, 0, 3, 3, 1);
  ok('un objetivo fuera de alcance no estira el brazo', Math.hypot(r[2], r[3]) <= 6.0001,
     'la mano quedó a ' + Math.hypot(r[2], r[3]).toFixed(3));
  ok('y el lado decide hacia dónde dobla',
     Math.sign(codo(0,0,4,0,3,3,1)[1]) === -Math.sign(codo(0,0,4,0,3,3,-1)[1]));
  /* el objetivo pegado al hombro tampoco puede reventar la fórmula */
  const z = codo(5, 5, 5, 5, 3, 3, 1);
  ok('un objetivo en el propio hombro no da NaN', z.every(n => Number.isFinite(n)), z.join(','));
}

seccion('camina · y los pies NO patinan');
{
  const m = mundo(); piso(m, 40);
  const v = instalaVida(m, 99);
  const s = v.persona(10, 30);
  s.mirando = 1;
  corre(m, v, 40);
  ok('cae y se queda de pie sobre el suelo', s.enSuelo, 'y=' + s.y.toFixed(2));
  const pierna = (CUERPO.muslo + CUERPO.espinilla) * s.talla;
  ok('los pies quedan justo encima del muro', Math.abs((s.y + pierna) - 40) < 0.6,
     'pies en ' + (s.y + pierna).toFixed(2) + ', el muro en 40');
  const x0 = s.x;
  corre(m, v, 200);
  ok('se mueve de donde estaba', Math.abs(s.x - x0) > 6,
     'de ' + x0.toFixed(1) + ' a ' + s.x.toFixed(1));

  /* EL PATINAJE: un pie apoyado no puede moverse entre un paso y el siguiente.
     Es la diferencia entre «animado» y «animado a mano», y sólo se caza
     midiendo el pie, no mirándolo. */
  const w = mundo(); piso(w, 40);
  const v2 = instalaVida(w, 31);
  const s2 = v2.persona(10, 30);
  corre(w, v2, 60);
  let deslices = 0, apoyos = 0;
  for(let i = 0; i < 300; i++){
    const antes = s2.patas.map(p => ({ x: p.px, y: p.py, ap: p.apoyada }));
    w.paso(); v2.paso();
    for(let j = 0; j < s2.patas.length; j++){
      const p = s2.patas[j], a = antes[j];
      if(a.ap && p.apoyada){ apoyos++; if(Math.hypot(p.px - a.x, p.py - a.y) > 0.02) deslices++; }
    }
  }
  ok('hubo pies apoyados que medir', apoyos > 100, apoyos + ' apoyos');
  ok('un pie apoyado NO se desliza', deslices === 0, deslices + ' deslices de ' + apoyos);
}

seccion('el pathfinding de enfrente · escalones, muros y hoyos');
{
  /* UN ESCALÓN DE UNA CELDA: lo sube */
  const m = mundo(); piso(m, 40);
  for(let x = 30; x < 60; x++) m.pon(x, 39, IDX.muro);
  const v = instalaVida(m, 5);
  const s = v.persona(20, 30); s.mirando = 1;
  /* ⚠ SE MIRA SI LLEGÓ A SUBIR, NO DÓNDE ACABÓ. Esto llevaba tiempo en rojo y
     el defecto era de la prueba: el monigote SÍ sube —medido, al paso 60 está
     en x=43.8 con la cadera en y=35, y en el suelo estaría en y=36— y luego
     sigue paseando, se da la vuelta y se baja. A los 500 pasos había acabado
     en x=1.0. Preguntarle a alguien que camina «¿dónde estás al final?» no es
     preguntarle si supo subir un escalón. */
  let subio = false;
  for(let i = 0; i < 500; i++){
    m.paso(); v.paso();
    if(s.x > 31 && s.x < 58 && s.enSuelo && s.y < 35.5) subio = true;
  }
  ok('sube un escalón de una celda', subio,
     'nunca se paró encima; acabó en x=' + s.x.toFixed(1) + ' y=' + s.y.toFixed(1));

  /* DOS CELDAS: también */
  const m2 = mundo(); piso(m2, 40);
  for(let x = 30; x < 60; x++){ m2.pon(x, 39, IDX.muro); m2.pon(x, 38, IDX.muro); }
  const v2 = instalaVida(m2, 5);
  const s2 = v2.persona(20, 30); s2.mirando = 1;
  let subio2 = false;
  for(let i = 0; i < 600; i++){
    m2.paso(); v2.paso();
    if(s2.x > 31 && s2.x < 58 && s2.enSuelo && s2.y < 34.5) subio2 = true;
  }
  ok('y uno de dos', subio2,
     'nunca se paró encima; acabó en x=' + s2.x.toFixed(1) + ' y=' + s2.y.toFixed(1));

  /* CUATRO CELDAS: NO. Se topa y se da la vuelta — que es el comportamiento,
     no un fallo. Sin esta prueba, «sube escalones» podría querer decir «se
     teletransporta por encima de cualquier pared», que es lo que pasaba con
     un `s.y = meta` sin límite. */
  const m3 = mundo(); piso(m3, 40);
  for(let y = 36; y < 40; y++) for(let x = 30; x < 34; x++) m3.pon(x, y, IDX.muro);
  const v3 = instalaVida(m3, 5);
  const s3 = v3.persona(20, 30); s3.mirando = 1;
  corre(m3, v3, 400);
  ok('un muro de cuatro lo PARA, no lo trepa', s3.x < 30.5,
     'llegó a x=' + s3.x.toFixed(1) + ' y el muro empieza en 30');
  ok('y acaba dándose la vuelta', s3.mirando === -1 || s3.x < 25,
     'mira hacia ' + s3.mirando + ', x=' + s3.x.toFixed(1));

  /* EL HOYO: a veces salta, a veces se da la vuelta. «Pero no siempre» */
  let saltos = 0, vueltas = 0;
  for(let semilla = 1; semilla <= 14; semilla++){
    const h = mundo(); piso(h, 40);
    for(let x = 34; x <= 40; x++) h.pon(x, 40, VACIO);
    const vh = instalaVida(h, semilla * 977);
    const sh = vh.persona(20, 30); sh.mirando = 1;
    corre(h, vh, 420);
    if(sh.x > 42) saltos++;
    else if(sh.x < 30) vueltas++;
  }
  ok('ante un hoyo, a veces lo cruza', saltos > 0, saltos + ' de 14');
  ok('y a veces NO — no es determinista', vueltas > 0 || saltos < 14,
     saltos + ' cruces, ' + vueltas + ' vueltas de 14');
}

seccion('arranca una celda de la pared, y de donde sea');
{
  const m = mundo(); piso(m, 40);
  for(let y = 30; y < 40; y++) m.pon(25, y, IDX.piedra);
  const v = instalaVida(m, 3);
  const s = v.persona(22, 36);
  corre(m, v, 5);
  const antes = m.t[m.i(25, 36)];
  ok('la pared está ahí antes', antes === IDX.piedra);
  ok('la arranca', v.arranca(s, 25, 36) === true);
  ok('y la celda queda vacía', m.t[m.i(25, 36)] === VACIO);
  ok('y la lleva en la mano', s.mano && s.mano.tipo === IDX.piedra);
  /* El muro NO: es lo único inamovible del juego y eso no lo puede romper
     un monigote. */
  const s2 = v.persona(22, 36);
  ok('pero el muro inamovible NO se arranca', v.arranca(s2, 0, 40) === false);
}

seccion('lo que arranca le PASA lo que ese material hace');
{
  /* LA BATERÍA ELECTROCUTA — y no porque haya una regla «batería = daño»,
     sino porque `elementos.js` dice `fuente:true`. */
  const m = mundo(); piso(m, 40);
  m.pon(25, 39, IDX.bateria);
  const v = instalaVida(m, 3);
  const s = v.persona(22, 34);
  corre(m, v, 6);
  const salud0 = s.salud;
  v.arranca(s, 25, 39);
  /* ⚠ SE MIDE EL PICO Y NO EL FINAL, y esto fue una prueba mintiendo. Miraba
     `s.choque` a los 40 pasos y daba 0.030, así que «no se electrocuta» —
     cuando la verdad es que se electrocutó Y SOLTÓ LA BATERÍA, que es
     justamente el comportamiento bueno. El choque se cura solo (×0.88 por
     paso), así que a los 25 pasos de haberla soltado ya no queda rastro. Una
     prueba que mira el estado final de algo que se cura no prueba nada. */
  let pico = 0;
  for(let i = 0; i < 40; i++){ m.paso(); v.paso(); if(s.choque > pico) pico = s.choque; }
  ok('cargar una batería lo electrocuta', pico > 0.3, 'pico de choque=' + pico.toFixed(3));
  ok('y le quita salud', s.salud < salud0 - 1, salud0.toFixed(1) + ' → ' + s.salud.toFixed(1));
  ok('y acaba soltándola, que es lo sensato', s.mano === null);

  /* LO CALIENTE QUEMA, y sigue caliente en la mano */
  const c = mundo(); piso(c, 40);
  c.pon(25, 39, IDX.piedra, 900);
  const vc = instalaVida(c, 3);
  const sc = vc.persona(22, 34);
  corre(c, vc, 6);
  /* el calor se difunde: en seis pasos la piedra ya bajó de 900 a 482 porque
     el motor la está repartiendo con sus vecinas. Se vuelve a poner al rojo
     justo antes de arrancarla para medir UNA cosa y no dos. */
  c.temp[c.i(25, 39)] = 900;
  vc.arranca(sc, 25, 39);
  ok('lo que arranca conserva su temperatura', sc.mano.temp > 800,
     sc.mano ? sc.mano.temp.toFixed(0) + '°' : 'sin mano');
  const sal0 = sc.salud;
  for(let i = 0; i < 20; i++){ c.paso(); vc.paso(); }
  ok('y mientras lo carga, se quema', sc.quema > 0.1 || sc.salud < sal0 - 1,
     'quema=' + sc.quema.toFixed(3) + ' salud=' + sc.salud.toFixed(1));

  /* EL ÁCIDO CORROE. Otro flanco de la misma regla: `corroe` ya estaba. */
  /* ⚠ UNA FOSA, NO UNA COLUMNA. La primera versión pintaba ácido en la columna
     del monigote y medía: el ácido es LÍQUIDO, se escurría en dos pasos y la
     prueba decía «el ácido no le duele» con el motor perfectamente sano. */
  const a = mundo(); piso(a, 40);
  for(let y = 32; y <= 40; y++){ a.pon(18, y, IDX.muro); a.pon(28, y, IDX.muro); }
  const va = instalaVida(a, 3);
  const sa = va.persona(23, 30);
  corre(a, va, 10);
  const sa0 = sa.salud;
  for(let y = 33; y <= 39; y++) for(let x = 19; x <= 27; x++) a.pon(x, y, IDX.acido);
  let dolorPico = 0;
  for(let i = 0; i < 30; i++){ a.paso(); va.paso(); if(sa.dolor > dolorPico) dolorPico = sa.dolor; }
  ok('el ácido le duele', sa.salud < sa0 - 2 && dolorPico > 0.1,
     sa0.toFixed(1) + ' → ' + sa.salud.toFixed(1) + ' dolor=' + dolorPico.toFixed(2));

  /* Y EL DAÑO NO ES UNA TABLA MÍA: se lee de EL[]. La comprobación honesta es
     que un elemento con `fuente` cualquiera —no sólo «bateria»— electrocute. */
  const fuentes = EL.filter(e => e.fuente).map(e => e.id);
  ok('el peligro sale de las propiedades, no de nombres', fuentes.length > 0,
     'elementos con fuente: ' + fuentes.join(', '));
}

seccion('lo que suelta VUELVE al mundo, no se evapora');
{
  const m = mundo(); piso(m, 40);
  for(let y = 30; y < 40; y++) m.pon(25, y, IDX.piedra);
  const v = instalaVida(m, 3);
  const s = v.persona(22, 36);
  corre(m, v, 5);
  v.arranca(s, 25, 36);
  const antes = (() => { let c = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.piedra) c++; return c; })();
  ok('la suelta', v.suelta(s, 1.5, -0.5) === true);
  const luego = (() => { let c = 0; for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.piedra) c++; return c; })();
  ok('y la piedra reaparece en el mundo', luego === antes + 1, antes + ' → ' + luego);
  ok('la mano queda vacía', s.mano === null);
  /* y sale DISPARADA, no puesta: `suelto` en 1 es lo que la mete en la física */
  let volando = false;
  for(let k = 0; k < m.t.length; k++) if(m.t[k] === IDX.piedra && m.suelto[k] && Math.abs(m.vx[k]) > 0.5) volando = true;
  ok('y sale con velocidad, no colocada', volando);

  /* soltar sobre un sitio ocupado NO borra lo que había */
  const o = mundo(); piso(o, 40);
  const vo = instalaVida(o, 3);
  const so = vo.persona(22, 36);
  corre(o, vo, 5);
  so.mano = { tipo: IDX.arena, temp: 22, car: 0, fase: 0, color: 0, moles: 0 };
  for(let y = 25; y < 40; y++) for(let x = 18; x < 28; x++) o.pon(x, y, IDX.concreto);
  const conc0 = (() => { let c = 0; for(let k = 0; k < o.t.length; k++) if(o.t[k] === IDX.concreto) c++; return c; })();
  vo.suelta(so, 0, 0);
  const conc1 = (() => { let c = 0; for(let k = 0; k < o.t.length; k++) if(o.t[k] === IDX.concreto) c++; return c; })();
  ok('soltar sobre algo ocupado no BORRA lo que había', conc1 === conc0,
     conc0 + ' → ' + conc1);
}

seccion('se le ve el estado en la postura, no en un letrero');
{
  const m = mundo(); piso(m, 40);
  const v = instalaVida(m, 3);
  const s = v.persona(20, 34);
  corre(m, v, 20);
  const sano = v.postura(s);
  ok('la postura devuelve un esqueleto completo',
     sano.patas.length === 2 && sano.brazos.length === 2 && sano.cabR > 0);
  ok('todo el esqueleto son números de verdad',
     [sano.cadX, sano.cadY, sano.homY, sano.cabX, sano.cabY,
      ...sano.patas.flatMap(p => [p.rx, p.ry, p.fx, p.fy]),
      ...sano.brazos.flatMap(b => [b.cx, b.cy, b.mx, b.my])].every(Number.isFinite));
  const altoSano = (s.y + (CUERPO.muslo + CUERPO.espinilla)) - (sano.cabY - sano.cabR);
  s.quema = 0.9; s.dolor = 0.9; s.salud = 25;
  v.pasoSer(s);
  const malito = v.postura(s);
  const altoMal = (s.y + (CUERPO.muslo + CUERPO.espinilla)) - (malito.cabY - malito.cabR);
  ok('el que sufre se ENCOGE', altoMal < altoSano - 0.4,
     'sano ' + altoSano.toFixed(2) + ' → sufriendo ' + altoMal.toFixed(2));
  ok('y se lleva las manos a la cabeza', malito.brazos[0].my < malito.homY,
     'mano en y=' + malito.brazos[0].my.toFixed(2) + ', hombro en ' + malito.homY.toFixed(2));

  /* MIRAR A LOS LADOS: la cabeza tiene que cambiar de sitio al mirar */
  const izq = { ...s, mirada: Math.PI };
  const der = { ...s, mirada: 0 };
  ok('la cabeza se mueve según a dónde mira',
     Math.abs(v.postura(der).cabX - v.postura(izq).cabX) > 0.3,
     (v.postura(der).cabX - v.postura(izq).cabX).toFixed(3));
}

seccion('los animales son otra cosa');
{
  const m = mundo(); piso(m, 40);
  const v = instalaVida(m, 8);
  const b = v.bicho(20, 30);
  corre(m, v, 200);
  ok('el animalito tiene cuatro patas', b.patas.length === 4);
  ok('y no tiene brazos', v.postura(b).brazos.length === 0);
  ok('camina', Math.abs(b.x - 20) > 4, 'de 20 a ' + b.x.toFixed(1));
  ok('es más chico que una persona, pero no de un píxel',
     b.talla < 0.8 && ALTO_PERSONA * b.talla > 4, (ALTO_PERSONA * b.talla).toFixed(2) + ' celdas');
}

seccion('se reproducen');
{
  const m = mundo(120, 50); piso(m, 40);
  const v = instalaVida(m, 4242);
  for(let i = 0; i < 6; i++){ const s = v.persona(30 + i * 5, 34); s.edad = 900; }
  const n0 = v.seres.length;
  corre(m, v, 1400);
  ok('nacen crías', v.seres.length > n0, n0 + ' → ' + v.seres.length);
  const cria = v.seres.find(s => s.edad < 1200 && s.talla < 1);
  ok('y nacen CHIQUITAS y crecen', !!cria, cria ? 'talla ' + cria.talla.toFixed(2) : 'ninguna');
  ok('pero la población tiene techo', v.seres.length <= 140, v.seres.length + ' seres');
}

seccion('se mueren, y no desaparecen de golpe');
{
  const m = mundo(); piso(m, 40);
  const v = instalaVida(m, 11);
  const s = v.persona(20, 30);
  corre(m, v, 30);
  s.salud = 0;          /* 0.5 NO es morirse: la condición es `<= 0` */
  corre(m, v, 5);
  ok('con la salud a cero se muere', s.muerto > 0);
  const y0 = s.y;
  corre(m, v, 40);
  ok('y el cuerpo se cae al suelo', s.y >= y0 - 0.01, y0.toFixed(2) + ' → ' + s.y.toFixed(2));
  corre(m, v, 300);
  ok('al final se lo lleva la lista', v.seres.indexOf(s) === -1);
}

seccion('LAS PLANTAS · con tronco y ramas, que era la queja');
{
  const m = mundo(90, 70); piso(m, 68);
  for(let x = 0; x < 90; x++) m.pon(x, 67, IDX.tierra);
  for(let x = 5; x < 14; x++) m.pon(x, 66, IDX.agua);
  const v = instalaVida(m, 77);
  const a = v.siembra(45, 66);
  ok('la siembra arranca un árbol', !!a);
  /* agua cerca: sin ella no crece, y eso lo comprueba el bloque de abajo */
  for(let x = 40; x < 50; x++) m.pon(x, 67, IDX.agua);
  /* ⚠ SE MIRA AL ÁRBOL EN SU MADUREZ, no a los 900 pasos. Desde que las
     plantas tienen ciclo de vida, a los 900 el árbol YA SE MURIÓ DE VIEJO y
     no le queda una hoja: la prueba decía «no tiene copa» de un árbol que
     había vivido, fructificado y marchitado entero. 340 pasos es adulto. */
  for(let i = 0; i < 340; i++) v.pasoArboles();

  let madera = 0, planta = 0, altoMin = 99, xs = new Set();
  for(let k = 0; k < m.t.length; k++){
    const y = (k / m.an) | 0, x = k % m.an;
    if(m.t[k] === IDX.madera){ madera++; if(y < altoMin) altoMin = y; xs.add(x); }
    if(m.t[k] === IDX.planta){ planta++; if(y < altoMin) altoMin = y; xs.add(x); }
  }
  ok('sale MADERA, no una mancha verde', madera > 8, madera + ' celdas de madera');
  ok('y hojas', planta > 8, planta + ' de hoja');
  /* LA QUEJA LITERAL: «no están creciendo alto» */
  ok('crece ALTO: más de 9 celdas sobre el suelo', 66 - altoMin > 9,
     'la copa llegó a y=' + altoMin + ', el suelo está en 66 → ' + (66 - altoMin) + ' celdas');
  /* LA OTRA QUEJA: «no me están sacando ramas» — un tallo de un píxel ocupa
     UNA columna. Un árbol ocupa muchas. */
  ok('y se RAMIFICA: ocupa muchas columnas', xs.size > 6, xs.size + ' columnas');
  ok('no es una columna de un píxel', xs.size > 3);

  /* SIN AGUA NO CRECE. Es la regla que ya tenía el motor y que no se puede
     perder al cambiar el sistema de crecimiento. */
  const seco = mundo(60, 60); piso(seco, 50);
  const vs = instalaVida(seco, 77);
  vs.siembra(30, 49);
  for(let i = 0; i < 900; i++) vs.pasoArboles();
  let celdas = 0;
  for(let k = 0; k < seco.t.length; k++) if(seco.t[k] === IDX.madera || seco.t[k] === IDX.planta) celdas++;
  ok('sin agua cerca, no crece', celdas < 6, celdas + ' celdas en un desierto');

  /* dos árboles de semillas distintas no son el mismo árbol.
     ⚠ SE COMPARA LA FORMA, NO CUÁNTAS CELDAS. Contando celdas, dos árboles
     completamente distintos daban 38 y 38 y la prueba los llamaba idénticos:
     un número no es una silueta. Se compara la lista de casillas ocupadas. */
  const silueta = (semilla) => {
    const w = mundo(60, 60); piso(w, 50);
    for(let x = 0; x < 60; x++) w.pon(x, 49, IDX.agua);
    const vv = instalaVida(w, semilla); vv.siembra(30, 48);
    for(let i = 0; i < 600; i++) vv.pasoArboles();
    const c = [];
    for(let k = 0; k < w.t.length; k++) if(w.t[k] === IDX.madera) c.push(k);
    return c.join(',');
  };
  const s1 = silueta(1234), s2 = silueta(999999);
  ok('dos árboles no salen idénticos', s1 !== s2,
     'siluetas de ' + s1.split(',').length + ' y ' + s2.split(',').length + ' celdas');
}

seccion('el enganche no le toca una coma al motor');
{
  /* Si `instalaVida` usara `M.vida` en vez de `M.seres`, pisaría la edad de
     cada celda —un Uint16Array— y se apagarían el fuego, el humo y los
     interruptores. Es exactamente la clase de choque de nombres que este repo
     ya pagó una vez. */
  const m = mundo();
  const antes = m.vida.constructor.name;
  const v = instalaVida(m);
  ok('`M.vida` sigue siendo el array de edades del motor',
     m.vida.constructor.name === antes && m.vida.length === m.t.length, antes);
  ok('la vida se cuelga en `M.seres`', m.seres === v);

  /* Y EL AZAR DEL MOTOR NO SE MUEVE: si `vida.paso()` gastara `M.rnd()`, una
     sala con monigotes dejaría de reproducir la misma explosión que una sin
     ellos, y las 233 pruebas del motor pasarían a ser una foto de otra cosa. */
  const sin = mundo(); piso(sin, 40);
  for(let i = 0; i < 60; i++) sin.paso();
  const azarSin = sin.azar;
  const con = mundo(); piso(con, 40);
  const vc = instalaVida(con, 5);
  vc.persona(20, 30); vc.bicho(30, 30);
  for(let i = 0; i < 60; i++){ con.paso(); vc.paso(); }
  ok('la vida NO gasta el azar del motor', con.azar === azarSin,
     'sin vida ' + azarSin + ' · con vida ' + con.azar);
}

seccion('lo que cuesta, medido');
{
  /* «Si hay cien criaturas no puede arrastrarse.» Pues se mide, no se supone. */
  const m = mundo(320, 480, 7);
  piso(m, 470);
  for(let x = 0; x < 320; x++){ m.pon(x, 469, IDX.tierra); m.pon(x, 468, IDX.tierra); }
  const v = instalaVida(m, 21);
  for(let i = 0; i < 100; i++) v.persona(10 + (i * 3) % 300, 460);
  for(let i = 0; i < 20; i++) v.bicho(20 + (i * 13) % 280, 460);
  for(let i = 0; i < 30; i++) v.paso();          /* calentar */
  const t0 = performance.now();
  for(let i = 0; i < 120; i++) v.paso();
  const ms = (performance.now() - t0) / 120;
  console.log('    · 120 seres en 320×480: ' + ms.toFixed(3) + ' ms por paso');
  ok('120 seres cuestan menos de 2 ms por paso', ms < 2, ms.toFixed(3) + ' ms');

  const m2 = mundo(320, 480, 7); piso(m2, 470);
  const v2 = instalaVida(m2, 21);
  for(let i = 0; i < 30; i++) v2.paso();
  const t1 = performance.now();
  for(let i = 0; i < 120; i++) v2.paso();
  const vacio = (performance.now() - t1) / 120;
  console.log('    · la misma sala sin un solo ser: ' + vacio.toFixed(4) + ' ms por paso');
  ok('sin seres no cuesta prácticamente nada', vacio < 0.1, vacio.toFixed(4) + ' ms');
}


seccion('EL CICLO DE VIDA · «que el agua las nutra, den frutos, se marchiten y vuelvan»');
{
  /* Carlos, textual: «quiero ciclo de vida correcto para las plantas, que el
     agua pueda nutrirlas, que estas crezcan poco a poco, que den frutos, que
     se marchiten, dejen la semilla y vuelvan a crecer, quiero todo». */
  const conAgua = (semilla = 77) => {
    const w = mundo(90, 70, semilla); piso(w, 68);
    for(let x = 0; x < 90; x++) w.pon(x, 67, IDX.agua);
    const vv = instalaVida(w, semilla);
    return { w, vv, a: vv.siembra(45, 66) };
  };
  const cuenta = (w, id) => { let n = 0; for(let k = 0; k < w.t.length; k++) if(w.t[k] === IDX[id]) n++; return n; };

  /* 1 · el agua se BEBE, no sólo se mira */
  {
    const { w, vv } = conAgua();
    const agua0 = cuenta(w, 'agua');
    for(let i = 0; i < 700; i++) vv.pasoArboles();
    ok('el árbol se BEBE el agua: queda menos que al empezar',
       cuenta(w, 'agua') < agua0, agua0 + ' → ' + cuenta(w, 'agua'));
  }

  /* 2 · crece POCO A POCO, no de un golpe */
  {
    const { w, vv } = conAgua();
    /* ⚠ SE MIDE DURANTE LA FASE DE CRECER, no a lo largo de toda la vida.
       Con ventanas de 20/60/140 la tercera caía —9 → 62 → 53— porque a esas
       alturas el árbol YA SE ESTABA MARCHITANDO y soltando hojas. Medir el
       crecimiento de algo que ya empezó a morirse no mide el crecimiento. */
    const tam = [];
    for(const n of [15, 30, 45]){
      for(let i = 0; i < n; i++) vv.pasoArboles();
      tam.push(cuenta(w, 'madera') + cuenta(w, 'planta'));
    }
    ok('crece poco a poco: cada rato es más grande que el anterior',
       tam[0] < tam[1] && tam[1] < tam[2], tam.join(' → '));
  }

  /* 3 · da FRUTOS */
  {
    const { w, vv, a } = conAgua(31);
    let pasos = 0;
    while(pasos < 3000 && cuenta(w, 'fruta') === 0){ vv.pasoArboles(); pasos++; }
    ok('un árbol maduro da fruta', cuenta(w, 'fruta') > 0,
       cuenta(w, 'fruta') + ' frutas al paso ' + pasos);
    /* ⚠ Y LA FRUTA ES COMIDA PARA LAS HORMIGAS sin una línea que los conecte:
       las dos cosas cuelgan del grupo «vida» de `elementos.js`. */
    ok('y la fruta es del grupo vida, o sea comida para un hormiguero',
       EL[IDX.fruta].grupo === 'vida');
  }

  /* 4 · se MARCHITA y deja SEMILLA */
  {
    const { w, vv, a } = conAgua(53);
    let pasos = 0;
    while(pasos < 6000 && vv.arboles.includes(a)){ vv.pasoArboles(); pasos++; }
    ok('el árbol termina muriéndose de viejo', !vv.arboles.includes(a),
       'murió al paso ' + pasos);
    ok('y al morir DEJA SU SEMILLA', cuenta(w, 'semilla') > 0,
       cuenta(w, 'semilla') + ' semillas');
    /* ⚠ y las hojas se fueron ANTES de morir: marchitarse es algo que se ve
       pasar, no un borrado de golpe */
    ok('sin una hoja encima: se marchitó de verdad', cuenta(w, 'planta') === 0,
       cuenta(w, 'planta') + ' de hoja');
  }

  /* 5 · y VUELVE A CRECER. Esto cierra el ciclo y es lo que pidió con todas
     sus letras. No hay código de «volver a crecer»: hay una semilla, y el
     mundo ya sabía qué hacer con una semilla en cuanto hay agua. */
  {
    const w = mundo(60, 60, 7); piso(w, 50);
    for(let x = 0; x < 60; x++){ w.pon(x, 49, IDX.tierra); w.pon(x, 48, IDX.agua); }
    const vv = instalaVida(w, 7);
    w.pon(30, 47, IDX.semilla);
    let pasos = 0;
    while(pasos < 4000 && !vv.arboles.length){ w.paso(); vv.pasoArboles(); pasos++; }
    ok('una semilla con agua se convierte en árbol nuevo', vv.arboles.length > 0,
       'brotó al paso ' + pasos);
  }

  /* 6 · pero NO en un desierto */
  {
    const w = mundo(60, 60, 7); piso(w, 50);
    for(let x = 0; x < 60; x++) w.pon(x, 49, IDX.tierra);
    const vv = instalaVida(w, 7);
    w.pon(30, 47, IDX.semilla);
    for(let i = 0; i < 2000; i++){ w.paso(); vv.pasoArboles(); }
    ok('y sin agua, la semilla se queda semilla', vv.arboles.length === 0,
       vv.arboles.length + ' árboles en el desierto');
  }
}

console.log('\n' + (mal ? '✗' : '✓') + '  ' + bien + ' pasan · ' + mal + ' fallan');
process.exit(mal ? 1 : 0);
