/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · ABRIR UN SOBRE
   ───────────────────────────────────────────────────────────────────────────
   El flujo, como lo dictó Carlos el 5 de noviembre:
     1. Se desliza el dedo (o el mouse) para ROMPER la parte de arriba.
     2. Se desliza HACIA ABAJO para sacar las cartas del sobre abierto.
     3. La carta de hasta abajo sube a la parte más alta: es la primera que se
        revisa.
     4. Al tocarla o deslizarla se VOLTEA y se va a la izquierda, a una mesa
        donde se acomodan por TIPO y RAREZA: puercos por rareza, soporte, y
        cosméticos por clase.

   A PRUEBA DE TONTOS, porque lo va a jugar gente con prisa y en un teléfono:
   · el rasgado acepta el dedo en cualquier parte del sobre y en los dos
     sentidos, y si se suelta pasada la mitad se termina solo;
   · si alguien toca en vez de deslizar, a la segunda se le enseña el gesto;
   · a la tercera, se rasga solo (nadie se queda trabado en un sobre);
   · lo que trae el sobre se COBRA en cuanto se rasga: cerrar la página a la
     mitad de la animación no pierde ninguna carta;
   · «Saltar» voltea todo de un jalón.
   ═══════════════════════════════════════════════════════════════════════════ */
import { THREE, E, carta, textura, texturaDeLienzo, ponerDorso, animar, esperar, sale, suave, entra, resorte, mezcla, cl,
         vista, aPantalla, tocado, halo, chispas, cadaCuadro, CARTA_W, CARTA_H, alCambiarTamano } from './escena.js';
import { C, RAREZA, ORDEN_RAREZA, CLASES_COSMETICO, cosmetico } from './coleccion.js';
import { CAT, SOBRES, cobrarSobre } from './tienda.js';
import { caraSobre, tiraSobre, caraCosmetico, COLOR_RAREZA } from './caras.js';
import { SON } from './sonido.js';
import { aviso, pista, cumplida, quitarPista } from './avisos.js';

const SEG = 14;   /* en cuántos pedazos se rasga la tira */

/* El grupo en la mesa de la izquierda al que va cada cosa, y su orden. */
function grupoDe(x){
  if(x.tipo === 'puerco') return { k: 'p' + x.nivel, orden: ORDEN_RAREZA.indexOf(x.nivel), titulo: 'Puercos · ' + RAREZA[x.nivel], color: COLOR_RAREZA[x.nivel] };
  if(x.tipo === 'soporte') return { k: 'soporte', orden: 6, titulo: 'Soporte', color: COLOR_RAREZA.ESP };
  const clases = Object.keys(CLASES_COSMETICO);
  return { k: 'c-' + x.clase, orden: 7 + clases.indexOf(x.clase), titulo: 'Cosméticos · ' + CLASES_COSMETICO[x.clase].nombre, color: '#FFF0F6' };
}
function detalleDe(x){
  if(x.tipo === 'puerco'){ const f = CAT.puercos.find(f => f.nombre + '·' + f.puntos === x.llave); return f ? f.nombre + ' · ' + f.puntos + ' pts' : ''; }
  if(x.tipo === 'soporte') return x.esp === 'bono' ? 'Alcancía · +5 a tu carta' : 'Carnitas · −5 a la del rival';
  const k = cosmetico(x.id); return k ? k.nombre : '';
}
async function frenteDe(x){
  if(x.tipo === 'puerco'){ const f = CAT.puercos.find(f => f.nombre + '·' + f.puntos === x.llave); return textura(f.arte); }
  if(x.tipo === 'soporte') return textura((x.esp === 'bono' ? CAT.bono : CAT.castigo).arte);
  return texturaDeLienzo(await caraCosmetico(x.id));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export async function abrirSobre(sobre, { capa, alTerminar }){
  const tipo = SOBRES[sobre.tipo] || SOBRES.chico;
  const raiz = new THREE.Group(); E.s.add(raiz);
  const dom = document.createElement('div'); dom.className = 'abrir'; capa.appendChild(dom);
  dom.innerHTML = `
    <div class="abrir__toque" data-toque></div>
    <button class="btn-chico abrir__saltar" data-saltar hidden>Saltar</button>
    <div class="abrir__rotulos" data-rotulos></div>
    <div class="abrir__ficha" data-ficha hidden></div>
    <div class="abrir__fin" data-fin hidden></div>`;
  const $ = (s) => dom.querySelector(s);
  const limpieza = [];

  /* ── EL ACOMODO · se recalcula si gira el teléfono ── */
  const L = {};
  function acomodar(){
    const v = vista(0), vertical = E.ancho < E.alto;
    L.pw = Math.min(vertical ? v.ancho * .56 : v.alto * .42, 3.2);
    L.ph = L.pw * 1.5; L.tira = L.pw * .17;
    L.px = vertical ? v.ancho * .5 - L.pw / 2 - v.ancho * .05 : v.ancho * .12;
    L.py = vertical ? v.alto * .02 : 0;
    L.esc = L.pw * .82;                      /* las cartas dentro del sobre */
    /* La mesa de resultados: de la orilla izquierda hasta antes del sobre. */
    L.mx0 = -v.ancho / 2 + .18; L.mx1 = L.px - L.pw / 2 - .18;
    L.my0 = v.alto / 2 - (vertical ? 1.5 : .8);
    L.v = v; L.vertical = vertical;
  }
  acomodar();

  /* ── EL SOBRE: cuerpo inflado y la tira en pedazos ── */
  const [cara, tira] = await Promise.all([caraSobre(sobre.tipo), tiraSobre(sobre.tipo)]);
  const texCara = texturaDeLienzo(cara), texTira = texturaDeLienzo(tira);
  const matSobre = new THREE.MeshStandardMaterial({ map: texCara, metalness: .45, roughness: .3, envMapIntensity: 1.4 });
  const geoCuerpo = new THREE.PlaneGeometry(1, 1.5 - .17, 24, 30);
  { const p = geoCuerpo.attributes.position; for(let i = 0; i < p.count; i++){ const x = p.getX(i) * 2, y = p.getY(i) / ((1.5 - .17) / 2); p.setZ(i, .09 * (1 - x * x) * (1 - y * y * .6)); } geoCuerpo.computeVertexNormals(); }
  const cuerpo = new THREE.Mesh(geoCuerpo, matSobre); cuerpo.castShadow = true;
  const sobreG = new THREE.Group(); sobreG.add(cuerpo); raiz.add(sobreG);
  const pedazos = [];
  for(let i = 0; i < SEG; i++){
    const g = new THREE.PlaneGeometry(1 / SEG, .17, 1, 1), uv = g.attributes.uv;
    for(let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / SEG);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: texTira, metalness: .45, roughness: .3, envMapIntensity: 1.4, transparent: true }));
    const piv = new THREE.Group(); piv.add(m); m.position.y = .17 / 2;
    piv.position.set(-.5 + (i + .5) / SEG, (1.5 - .17) / 2, .02);
    sobreG.add(piv); pedazos.push({ piv, m, u: 0 });
  }
  function ponerSobre(){ sobreG.scale.setScalar(L.pw); sobreG.position.set(L.px, L.py, .4); }
  ponerSobre();

  /* ── LAS CARTAS, dentro del sobre, boca abajo ── */
  const dorsoUrl = (cosmetico(C.puesto.dorso) || cosmetico('ds-autora')).img;
  const texDorso = textura(dorsoUrl);
  const items = sobre.salen.map((x, i) => ({ x, i, g: grupoDe(x), c: null }));
  for(const it of items){
    it.c = carta(null, texDorso); it.c.rotation.y = Math.PI; it.c.scale.setScalar(L.esc);
    raiz.add(it.c);
    frenteDe(it.x).then(t => { const m = it.c.userData.mf; m.map = t; m.color.set('#fff'); m.needsUpdate = true; });
  }
  /* El montón: la de índice 0 es la de hasta ARRIBA (la primera que se ve). */
  let monton = items.slice();
  function ponerMonton(anim = false){
    monton.forEach((it, k) => {
      const z = .3 - k * .035, y = L.py + .05 - k * .025;
      if(anim) animar({ dur: .35, cada: (u) => { it.c.position.lerp(new THREE.Vector3(L.px, y, z), u); } });
      else it.c.position.set(L.px, y, z);
    });
  }
  ponerMonton();
  for(const it of items) it.c.visible = false;     /* hasta que se abra el sobre */

  const quitarAcomodo = alCambiarTamano(() => { acomodar(); ponerSobre(); if(estado !== 'cerrado' && estado !== 'abierto') ponerMonton(); acomodarMesa(); });
  limpieza.push(quitarAcomodo);

  /* El sobre flota y brilla mientras espera. */
  let t0 = 0, estado = 'llega';
  limpieza.push(cadaCuadro((dt, t) => {
    t0 = t;
    if(estado === 'cerrado' || estado === 'rasgando'){
      sobreG.rotation.y = Math.sin(t * .8) * .09; sobreG.rotation.x = Math.sin(t * .6) * .04;
      sobreG.position.y = L.py + Math.sin(t * 1.3) * .04;
    }
  }));

  /* Llega volando desde abajo, girando. */
  sobreG.position.y = -L.v.alto; sobreG.rotation.z = .5;
  await animar({ dur: .7, ease: resorte, cada: (u) => { sobreG.position.y = mezcla(-L.v.alto, L.py, u); sobreG.rotation.z = mezcla(.5, 0, u); } });
  estado = 'cerrado';
  const enPantalla = (p) => aPantalla(new THREE.Vector3(p.x, p.y, p.z));
  const puntoTira = () => enPantalla(new THREE.Vector3(L.px - L.pw * .3, L.py + L.ph / 2 - L.tira / 2, .5));
  pista('rasgar', puntoTira(), 'Desliza el dedo por la tira para abrirlo', { gesto: 'desliza-der', veces: 4 });

  /* ═══ 1 · RASGAR ═══ */
  let tocadas = 0, rasgado = 0;
  const pintarRasgado = (p) => {
    pedazos.forEach((q, i) => {
      const borde = p * SEG - i, u = cl(borde);
      q.u = u;
      q.piv.rotation.x = -u * 1.1; q.piv.rotation.z = u * .18; q.piv.position.z = .02 + u * .25;
    });
  };
  const capaToque = $('[data-toque]');
  await new Promise((listo) => {
    let x0 = null, ultimo = 0;
    const terminar = async () => {
      capaToque.onpointerdown = capaToque.onpointermove = capaToque.onpointerup = capaToque.onpointercancel = null;
      cumplida('rasgar'); quitarPista();
      estado = 'abriendo';
      await animar({ dur: .25, cada: (u) => pintarRasgado(mezcla(rasgado, 1, u)) });
      SON.abre();
      chispas(new THREE.Vector3(L.px, L.py + L.ph / 2, .6), { color: '#FFF0F6', cuantas: 50, fuerza: 2.5 });
      /* la tira entera sale volando */
      const vuela = pedazos.map((q, i) => ({ q, vx: (Math.random() * .6 + .4) * (i / SEG + .3), vy: 1.4 + Math.random(), r: (Math.random() - .5) * 6 }));
      animar({ dur: .8, ease: (u) => u, cada: (u) => { for(const w of vuela){ w.q.piv.position.x += w.vx * .03; w.q.piv.position.y += (w.vy - u * 3) * .02; w.q.piv.rotation.z += w.r * .01; w.q.m.material.opacity = 1 - u; } } })
        .then(() => vuela.forEach(w => w.q.piv.visible = false));
      listo();
    };
    capaToque.onpointerdown = (e) => {
      const hit = tocado(e.clientX, e.clientY, [sobreG]);
      x0 = { x: e.clientX, y: e.clientY, hit: !!hit, movio: false };
      capaToque.setPointerCapture?.(e.pointerId);
    };
    capaToque.onpointermove = (e) => {
      if(!x0) return;
      const dx = Math.abs(e.clientX - x0.x), anchoPx = Math.max(80, L.pw / L.v.ancho * E.ancho);
      if(dx > 6) x0.movio = true;
      const p = cl(dx / (anchoPx * .85));
      if(p > rasgado){
        if(Math.floor(p * SEG) > Math.floor(rasgado * SEG) && performance.now() - ultimo > 40){ SON.rasga(p); ultimo = performance.now(); }
        rasgado = p; estado = 'rasgando'; pintarRasgado(rasgado);
      }
      if(rasgado >= .92) { x0 = null; terminar(); }
    };
    capaToque.onpointerup = capaToque.onpointercancel = () => {
      if(!x0) return;
      const fue = x0; x0 = null;
      if(rasgado >= .5){ terminar(); return; }
      if(!fue.movio && fue.hit){
        tocadas++;
        if(tocadas === 2) aviso('Desliza, no toques: pasa el dedo de lado a lado', { icono: 'img/gestos/touch_swipe_right.png' });
        if(tocadas >= 3){ rasgado = .55; terminar(); return; }
      }
      /* se soltó antes de la mitad: la tira regresa */
      const desde = rasgado; rasgado = 0;
      animar({ dur: .3, cada: (u) => pintarRasgado(mezcla(desde, 0, u)) }).then(() => estado = 'cerrado');
    };
  });

  /* Se cobra AQUÍ: en cuanto el sobre está roto, lo que trae ya es tuyo. */
  const cobro = cobrarSobre(sobre.id) || sobre.salen.map(x => ({ ...x, nueva: true, vuelven: 0 }));
  items.forEach((it, i) => { it.r = cobro[i]; });
  const devueltas = cobro.reduce((s, x) => s + (x.vuelven | 0), 0);

  /* ═══ 2 · SACAR LAS CARTAS (deslizar hacia abajo) ═══ */
  for(const it of items) it.c.visible = true;
  estado = 'abierto';
  await esperar(.25);
  pista('sacar', enPantalla(new THREE.Vector3(L.px, L.py, .5)), 'Ahora desliza hacia abajo para sacar las cartas', { gesto: 'desliza-abajo', veces: 4 });
  await new Promise((listo) => {
    let y0 = null, tiempo0 = 0, bajado = 0;
    const altoPx = () => L.ph / L.v.alto * E.alto;
    const fuera = async () => {
      capaToque.onpointerdown = capaToque.onpointermove = capaToque.onpointerup = capaToque.onpointercancel = null;
      cumplida('sacar'); quitarPista(); SON.saca();
      const desde = sobreG.position.y;
      await animar({ dur: .45, ease: entra, cada: (u) => { sobreG.position.y = mezcla(desde, -L.v.alto * .9, u); sobreG.rotation.z = u * .25; } });
      sobreG.visible = false;
      listo();
    };
    capaToque.onpointerdown = (e) => { y0 = e.clientY; tiempo0 = performance.now(); capaToque.setPointerCapture?.(e.pointerId); };
    capaToque.onpointermove = (e) => {
      if(y0 == null) return;
      bajado = cl((e.clientY - y0) / altoPx(), 0, 1);
      sobreG.position.y = L.py - bajado * L.ph * .9;
      if(bajado > .6){ y0 = null; fuera(); }
    };
    capaToque.onpointerup = capaToque.onpointercancel = (e) => {
      if(y0 == null) return;
      const rapido = (e.clientY - y0) / Math.max(1, performance.now() - tiempo0) > .6;   /* un jalón corto y rápido también cuenta */
      y0 = null;
      if(bajado > .28 || rapido){ fuera(); return; }
      if(bajado < .02){ tocadas++; if(tocadas >= 5){ fuera(); return; } }
      const desde = sobreG.position.y;
      animar({ dur: .3, ease: resorte, cada: (u) => { sobreG.position.y = mezcla(desde, L.py, u); } });
      bajado = 0;
    };
  });

  /* ═══ 3 y 4 · REVISAR UNA POR UNA ═══ */
  estado = 'revisando';
  ponerMonton(true);
  $('[data-saltar]').hidden = false;
  let saltar = false;
  $('[data-saltar]').onclick = () => { saltar = true; SON.toque(); };

  /* La mesa de la izquierda: una fila por grupo, en el orden fijo. */
  const grupos = [...new Map(items.map(it => [it.g.k, it.g])).values()].sort((a, b) => a.orden - b.orden);
  const enMesa = Object.fromEntries(grupos.map(g => [g.k, []]));
  const rotulos = $('[data-rotulos]');
  for(const g of grupos){
    const r = document.createElement('div'); r.className = 'abrir__rotulo'; r.dataset.k = g.k; r.style.setProperty('--c', g.color);
    r.textContent = g.titulo; rotulos.appendChild(r); g.nodo = r;
  }
  function lugarEnMesa(g, k, total){
    const filas = grupos.length, ancho = Math.max(.6, L.mx1 - L.mx0);
    const maxEnFila = Math.max(...grupos.map(x => items.filter(it => it.g.k === x.k).length));
    const espacioFila = Math.min(L.vertical ? 1.7 : 2.1, (L.my0 - (-L.v.alto / 2 + .35)) / filas);
    const sAlto = (espacioFila - .48) / CARTA_H, sAncho = ancho / (1 + (maxEnFila - 1) * .55);
    const s = Math.max(.22, Math.min(L.vertical ? .62 : 1.05, sAlto, sAncho));
    const fila = grupos.indexOf(g);
    const y = L.my0 - .3 - fila * espacioFila - CARTA_H * s / 2;
    const x = L.mx0 + CARTA_W * s / 2 + k * CARTA_W * s * .55;
    return { pos: new THREE.Vector3(x, y, .05 + k * .02), s, yRot: L.my0 - .08 - fila * espacioFila };
  }
  function acomodarMesa(){
    for(const g of grupos){
      const lista = enMesa[g.k];
      lista.forEach((it, k) => { const l = lugarEnMesa(g, k, lista.length); it.c.position.copy(l.pos); it.c.scale.setScalar(l.s); });
      const l = lugarEnMesa(g, 0, 1), p = aPantalla(new THREE.Vector3(L.mx0, l.yRot, 0));
      g.nodo.style.left = p.x + 'px'; g.nodo.style.top = p.y + 'px';
      g.nodo.style.maxWidth = Math.max(90, aPantalla(new THREE.Vector3(L.mx1, 0, 0)).x - p.x) + 'px';
    }
  }
  acomodarMesa();

  const ficha = $('[data-ficha]');
  function enseñarFicha(it){
    const r = it.r, x = it.x;
    const etiqueta = x.tipo === 'puerco' ? RAREZA[x.nivel] : x.tipo === 'soporte' ? 'Soporte' : CLASES_COSMETICO[x.clase].una;
    ficha.innerHTML = `<b class="abrir__tipo" style="--c:${it.g.color}">${etiqueta}</b><span>${detalleDe(x)}</span>`
      + (r.nueva ? '<em class="nueva">¡Nueva!</em>' : `<em class="repe">Repetida · +${r.vuelven} monedas</em>`);
    const p = aPantalla(new THREE.Vector3(L.px, L.py - CARTA_H * L.esc / 2 - .15, .3));
    ficha.style.left = p.x + 'px'; ficha.style.top = p.y + 'px';
    ficha.hidden = false; ficha.classList.remove('ve'); void ficha.offsetWidth; ficha.classList.add('ve');
  }

  let primera = true;
  while(monton.length){
    /* La de hasta ABAJO sube a la parte más alta. */
    const it = monton.pop();
    if(monton.length){
      /* sale por un lado del montón y entra por arriba */
      SON.sube();
      const c = it.c, x0 = c.position.x, y0 = c.position.y, z0 = c.position.z;
      ponerMonton(true);
      await animar({ dur: saltar ? .14 : .34, ease: suave, cada: (u) => {
        c.position.set(x0 + Math.sin(u * Math.PI) * L.pw * .62, mezcla(y0, L.py + .05, u) - Math.sin(u * Math.PI) * .2, mezcla(z0, .6, u));
        c.rotation.z = Math.sin(u * Math.PI) * -.14; } });
      c.rotation.z = 0;
    }
    it.c.position.set(L.px, L.py + .05, .6);
    primera = false;

    if(!saltar){
      pista('voltear', enPantalla(new THREE.Vector3(L.px, L.py, .6)), 'Toca la carta (o deslízala) para voltearla', { gesto: 'toca', veces: 3 });
      await new Promise((ok) => {
        let x0 = null;
        const ir = () => { capaToque.onpointerdown = capaToque.onpointerup = null; clearInterval(revisaSaltar); cumplida('voltear'); quitarPista(); ok(); };
        capaToque.onpointerdown = (e) => { x0 = { x: e.clientX, y: e.clientY }; };
        capaToque.onpointerup = (e) => { if(!x0) return; x0 = null; ir(); };
        const revisaSaltar = setInterval(() => { if(saltar) ir(); }, 60);
      });
    }

    /* El volteo: se levanta, gira, y cae boca arriba. */
    SON.volteo();
    const c = it.c, malo = it.x.tipo === 'puerco' ? it.x.nivel : 'B';
    await animar({ dur: saltar ? .2 : .45, ease: suave, cada: (u) => { c.rotation.y = mezcla(Math.PI, 0, u); c.position.z = .6 + Math.sin(u * Math.PI) * 1.2; c.scale.setScalar(L.esc * (1 + Math.sin(u * Math.PI) * .12)); } });
    const especial = it.x.tipo === 'puerco' ? ({ S: 'legendaria', A: 'epica', B: 'rara' }[malo] || 'normal') : it.x.nivel === 'S' || it.x.nivel === 'A' ? 'epica' : 'rara';
    SON[especial]?.();
    if(!saltar){
      enseñarFicha(it);
      if(especial === 'legendaria' || especial === 'epica'){
        const h = halo(COLOR_RAREZA[it.x.nivel] || '#FFD54A', L.esc * 2.4); h.position.set(L.px, L.py + .05, .2); raiz.add(h);
        animar({ dur: 1.6, ease: (u) => u, cada: (u) => { h.material.opacity = Math.sin(u * Math.PI) * (especial === 'legendaria' ? 1 : .7); h.rotation.z = u * 1.5; } }).then(() => raiz.remove(h));
        chispas(new THREE.Vector3(L.px, L.py, .7), { color: COLOR_RAREZA[it.x.nivel], cuantas: especial === 'legendaria' ? 140 : 70, fuerza: especial === 'legendaria' ? 4.5 : 3 });
        if(especial === 'legendaria') sacudir(.18);
      }
      if(!it.r.nueva && it.r.vuelven) setTimeout(() => SON.moneda(), 250);
      /* Se queda a la vista un momento; un toque lo apura. */
      await Promise.race([esperar(especial === 'legendaria' ? 1.6 : 1.05), toqueCualquiera(capaToque)]);
      ficha.classList.remove('ve');
    }

    /* Y se va a su fila de la mesa. */
    /* el grupo DE LA MESA (el que tiene su rótulo), no la copia que trae cada carta */
    const g = grupos.find(x => x.k === it.g.k), lista = enMesa[g.k];
    lista.push(it);
    const destino = lugarEnMesa(g, lista.length - 1, lista.length);
    const de = c.position.clone(), sDe = c.scale.x;
    await animar({ dur: saltar ? .22 : .5, ease: sale, cada: (u) => {
      c.position.set(mezcla(de.x, destino.pos.x, u), mezcla(de.y, destino.pos.y, u) + Math.sin(u * Math.PI) * .35, mezcla(de.z, destino.pos.z, u) + Math.sin(u * Math.PI) * .6);
      c.scale.setScalar(mezcla(sDe, destino.s, u)); c.rotation.z = Math.sin(u * Math.PI) * .2;
    } });
    c.rotation.z = 0;
    SON.aterriza();
    g.nodo.classList.add('ve');
    acomodarMesa();
  }
  $('[data-saltar]').hidden = true;
  capaToque.style.pointerEvents = 'none';

  /* ═══ EL RESUMEN ═══ */
  const nuevas = items.filter(it => it.r.nueva).length;
  const fin = $('[data-fin]');
  const quedan = C.sobres.length;
  fin.innerHTML = `<h2>¡Listo!</h2>
    <p>${nuevas ? `<b>${nuevas}</b> ${nuevas === 1 ? 'nueva' : 'nuevas'}` : 'Nada nuevo esta vez'}${devueltas ? ` · repetidas: <b>+${devueltas}</b> monedas` : ''}</p>
    <div class="abrir__botones">
      ${quedan ? `<button class="btn grande" data-otro>Abrir el siguiente <small>(${quedan})</small></button>` : ''}
      <button class="btn" data-ver>Ver mi colección</button>
      <button class="btn suave" data-volver>Volver</button>
    </div>`;
  fin.hidden = false; requestAnimationFrame(() => fin.classList.add('ve'));
  const salida = await new Promise((ok) => {
    fin.querySelector('[data-otro]')?.addEventListener('click', () => ok('otro'));
    fin.querySelector('[data-ver]').addEventListener('click', () => ok('coleccion'));
    fin.querySelector('[data-volver]').addEventListener('click', () => ok('volver'));
  });
  SON.toque();
  cerrar();
  alTerminar && alTerminar(salida);

  function cerrar(){
    quitarPista();
    for(const f of limpieza) f();
    raiz.traverse(o => { if(o.geometry && !o.geometry.parameters?.shapes) o.geometry.dispose?.(); });
    E.s.remove(raiz); dom.remove();
  }
}

function toqueCualquiera(nodo){
  return new Promise((ok) => { const f = () => { nodo.removeEventListener('pointerup', f); ok(); }; nodo.addEventListener('pointerup', f); });
}
function sacudir(fuerza){
  const p0 = E.cam.position.clone();
  animar({ dur: .5, ease: (u) => u, cada: (u) => { const k = fuerza * (1 - u); E.cam.position.set(p0.x + (Math.random() - .5) * k, p0.y + (Math.random() - .5) * k, p0.z); } })
    .then(() => E.cam.position.copy(p0));
}
