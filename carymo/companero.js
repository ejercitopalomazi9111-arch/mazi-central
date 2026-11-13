/* companero.js — TU COMPAÑERO: SU CUARTO, SU CUIDADO Y LA TIENDA DE PALOMIUM (CARYMO)
 * ===========================================================================
 * Carlos, 13 nov: «un sistema de cuidado a tu compañero… un espacio donde tenerlo… salitas, comidita,
 * cosas para bañarlo, como un tipo Pou… y si no te conectas o no estudias, se va deteriorando y se va
 * sintiendo mal». Y la moneda: «cubitos de palomium… súper poquitos».
 *
 * Lo que cuesta y lo que se gana lo decide el servidor (sala/servidor/palomium.js); aquí sólo se pinta
 * y se le pide. Tres piezas:
 *   · la pastilla de cubitos (arriba, junto a la racha) que abre el cuarto;
 *   · el CUARTO: la mascota en grande con sus muebles, tres barras (hambre, limpieza, ánimo) y
 *     Comer / Bañar / Jugar. La mascota dice cómo se siente, con su modo;
 *   · la TIENDA: comida, aseo, juguetes, muebles y el congelador de racha.
 * Y `premios(r)`: cuando el servidor paga cubitos, sale el aviso con el cubito.
 * ===========================================================================*/
import { CUBO, COSAS, LUGAR } from './cosas.js';
import { ESPECIES, ETAPAS, ACCESORIOS, SKINS, MAX_ACCESORIOS, nivelMascota, xpDeNivel, etapaDe, MUERE_HORAS } from './crianza-datos.js';

const FRASES = {
  feliz: ['¡Qué bonito está mi cuarto!', '¡Hoy me siento genial!', '¿Estudiamos otro ratito?', 'Me encanta cuando vienes.'],
  normal: ['Hoy quiero estudiar contigo.', '¿Me das algo de comer?', 'Ya te extrañaba.'],
  hambre: ['Tengo hambre…', 'Mi pancita hace ruidos.', '¿Hay algo de comer?'],
  sucio: ['Necesito un baño…', 'Estoy todo sucio.'],
  triste: ['Me sentía solito.', 'No viniste a estudiar… y me puse triste.'],
  'muy-mal': ['Me siento muy mal… ¿me cuidas?', 'Ya no aguanto el hambre…'],
};
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const GRUPOS = [['comida', 'Comida'], ['aseo', 'Para bañarlo'], ['juguete', 'Para jugar'], ['mueble', 'Para su cuarto'], ['racha', 'Para tu racha']];

export function iniciarCompanero(h){
  const { sala, capa, cerrarCapa, hoja, cerrarHoja, esc, ico, tono, SON, vibrar, crearMascota, $ } = h;
  const activa = () => (h.activa ? h.activa() : (h.ajustes && h.ajustes().mascota) || 'tigre');
  const misMascotas = () => h.perfil().mascotas || {};
  const vivasMias = () => Object.entries(misMascotas()).filter(([, m]) => !m.muerta).map(([k]) => k);
  const nombreDe = (k) => misMascotas()[k]?.nombre || ESPECIES[k]?.nombre || 'Tu mascota';
  const precioAdoptar = (k) => vivasMias().length ? ESPECIES[k].precio : 0;
  let tienda = (() => { try{ return JSON.parse(localStorage.getItem('est.tienda') || 'null'); }catch{ return null; } })();
  let masc = null;

  const cubos = () => h.perfil().cubos ?? 0;
  const cuidado = () => h.perfil().cuidado || { hambre: 80, limpieza: 90, animo: 80 };
  function quePasa(c){
    if(Math.min(c.hambre, c.limpieza, c.animo) < 15) return 'muy-mal';
    if(c.hambre < 35) return 'hambre';
    if(c.limpieza < 35) return 'sucio';
    if(c.animo < 35) return 'triste';
    return Math.min(c.hambre, c.limpieza, c.animo) >= 60 ? 'feliz' : 'normal';
  }

  /* ── la pastilla de arriba ── */
  /* Carlos, 14 nov: «encontrar la habitación de la mascota es difícil; el loguito del cubo nada más es un cubo… que sea el icono
     de la mascota con una barrita alrededor de cómo está, que vaya disminuyendo, y que le salgan exclamaciones cuando ya está
     en peligro». La pastilla ahora es TU MASCOTA con un aro que se vacía (verde, amarillo, rojo) y un «!» que brinca. */
  let mascPastilla = null, quienPastilla = '';
  function pintarPastilla(){
    const b = $('#pCubos'); if(!b) return;
    const c = cuidado(), q = quePasa(c), salud = Math.max(0, Math.min(100, Math.round(Math.min(c.hambre ?? 80, c.limpieza ?? 80, c.animo ?? 80))));
    const muerta = (h.ajustes && h.ajustes().mascota) !== 'no' && activa() === 'no' && Object.keys(misMascotas()).length > 0;
    const quien = activa(), conMasc = quien !== 'no';
    if(!b.querySelector('.pm-cubos')){
      b.innerHTML = `<span class="pm-aro"><span class="pm-masc"></span></span><span class="pm-alerta" aria-hidden="true">!</span><span class="pm-cubos"><span class="cubo-ico">${CUBO}</span><b></b></span>`;
      mascPastilla = null; quienPastilla = '';
    }
    if(!conMasc && mascPastilla){ try{ mascPastilla.destruir(); }catch{} mascPastilla = null; quienPastilla = ''; b.querySelector('.pm-masc').innerHTML = ''; }
    if(conMasc && quienPastilla !== quien){ try{ mascPastilla?.destruir?.(); }catch{} b.querySelector('.pm-masc').innerHTML = ''; mascPastilla = crearMascota(b.querySelector('.pm-masc'), { personaje: quien, tam: 34 }); quienPastilla = quien; }
    b.classList.toggle('sin-masc', !conMasc);
    b.style.setProperty('--salud', salud);
    b.dataset.salud = muerta || salud < 25 ? 'peligro' : salud < 50 ? 'baja' : 'bien';
    const n = b.querySelector('.pm-cubos b'); if(n.textContent !== String(cubos())) n.textContent = cubos();
    const como = { 'muy-mal': 'está muy mal', hambre: 'tiene hambre', sucio: 'necesita un baño', triste: 'está triste', normal: 'está bien', feliz: 'está feliz' }[q];
    b.setAttribute('aria-label', muerta ? `Tu compañero se fue. Toca para adoptar otro. ${cubos()} cubitos de palomium` : `Tu compañero ${como} (${salud} %). ${cubos()} cubitos de palomium. Toca para entrar a su cuarto`);
    b.classList.toggle('aviso', muerta || salud < 50);
  }

  /* ── el aviso de cubitos ganados ── */
  function premios(r){
    const ps = (r && r.premios) || []; if(!ps.length) return;
    const total = ps.reduce((a, x) => a + x.cubos, 0);
    const d = document.createElement('div'); d.className = 'oro cubos-brindis';
    d.innerHTML = `<span class="cubo-ico">${CUBO}</span>+${total} ${total === 1 ? 'cubito' : 'cubitos'}<small>${esc(ps.map((x) => x.que).join(' · '))}</small>`;
    const b = $('#brindis'); b.append(d); while(b.children.length > 2) b.firstElementChild.remove(); setTimeout(() => d.remove(), 3400);
    tono(SON.moneda, { tono: 1.15 }); vibrar(18);
    const p = $('#pCubos'); if(p){ p.classList.remove('gana'); void p.offsetWidth; p.classList.add('gana'); }
    pintarPastilla();
  }

  async function traerTienda(){
    try{ const r = await sala(null, '?tienda=1'); tienda = r.tienda; try{ localStorage.setItem('est.tienda', JSON.stringify(tienda)); }catch{} if(r.perfil) h.ponerPerfil(r.perfil); }
    catch(e){ if(!tienda) throw e; }
  }
  async function pedir(cuerpo){
    try{ const r = await sala(cuerpo); h.ponerPerfil(r.perfil); return r; }
    catch(e){ if(e.datos && e.datos.perfil) h.ponerPerfil(e.datos.perfil); throw e; }
  }

  /* ── el cuarto ──
     Carlos, 14 nov: «cambiar de mascota es difícil… a prueba de tontos, como para un niño de 4 o 5 años». Arriba van
     TUS MASCOTAS en grande: tocar una = ahora te acompaña esa (un toque). La última tarjeta es «Adoptar». Abajo, el
     cuarto: se acaricia con el dedo y con «Jugar» sale la pelota, que la mascota persigue. */
  async function abrir(op = {}){
    const c = capa('companero');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Volver">${ico('arrow-left')}</button><h2 style="flex:1;margin:0;font:800 20px/1.2 Titulo">Tu compañero</h2><span class="pastilla cubos" id="cubosCuarto"></span></div>
      <div class="cuerpo">
        <div class="mis-masc" id="misMasc" role="list" aria-label="Tus mascotas"></div>
        <div class="masc-ficha" id="mascFicha"></div>
        <div class="cuarto" id="cuarto"><div class="pared"></div><div class="ventana"></div><div class="piso"></div><div class="muebles" id="muebles"></div><div class="masc-cuarto" id="mascCuarto"></div><div class="pelota-capa" id="pelotaCapa"></div><div class="cielo-carta" id="cieloCarta" hidden></div></div>
        <p class="pista-cuarto" id="pistaCuarto">${ico('hand')}Acarícialo con el dedo</p>
        <div class="barras-cuidado" id="barras"></div>
        <div class="acciones-cuidado"><button class="bt" data-cuidar="comer">${ico('heart')}Comer</button><button class="bt" data-cuidar="banar">${ico('sparkles')}Bañar</button><button class="bt" data-cuidar="jugar">${ico('party-popper')}Pelota</button><button class="bt" data-vestir>${ico('shirt')}Vestir</button></div>
        <div class="seccion-t">Tienda</div>
        <div id="tienda"><p style="color:var(--suave)">Cargando la tienda…</p></div>
        <div id="cieloLista"></div>
        <div class="como-ganar"><b>Cómo se ganan los cubitos</b><p>Terminando lecciones, subiendo de grado, terminando planes, con tu racha de cada día, cada 7 días seguidos, subiendo de nivel y estudiando con amigos. Son poquitos: cuídalos.</p><b style="margin-top:10px">Cómo crece tu mascota</b><p>Gana experiencia contigo mientras estudias. Empieza bebé (las aves, en huevo), luego es joven, adulta y al final sabia. Después del nivel 10 crece más lento: conviene tener varias e irlas turnando. Si nadie la cuida en 3 días, se va.</p></div>
      </div>`;
    c.addEventListener('click', alTocar);
    ponerMascota();
    pintarCuarto(true);
    acariciar($('#cuarto', c));
    if(op.adoptar) setTimeout(() => adoptarHoja(op.adoptar), 250);
    try{ await traerTienda(); pintarCuarto(); }catch(e){ $('#tienda', c).innerHTML = `<p style="color:var(--suave)">No se pudo abrir la tienda: ${esc(e.message)}</p>`; }
  }
  function ponerMascota(){
    const c = $('#capa.companero'); if(!c) return;
    pelotaFuera();
    try{ masc?.destruir(); }catch{} masc = null;
    const caja = $('#mascCuarto', c); caja.innerHTML = ''; caja.style.left = '50%';
    const q = activa();
    if(q !== 'no') masc = crearMascota(caja, { personaje: q, tam: 150 });
  }
  function pintarMis(){
    const c = $('#capa.companero'); if(!c) return;
    const mias = misMascotas(), vivas = vivasMias(), q = activa();
    const caja = $('#misMasc', c);
    const firma = JSON.stringify([q, vivas.map((k) => [k, mias[k].xp, mias[k].skin, mias[k].acc, mias[k].nombre])]);
    if(caja.dataset.firma === firma) return; caja.dataset.firma = firma;
    caja.innerHTML = vivas.map((k) => { const n = nivelMascota(mias[k].xp || 0);
      return `<button role="listitem" class="mi-masc ${k === q ? 'activa' : ''}" data-elegir="${k}" aria-pressed="${k === q}" aria-label="${esc(nombreDe(k))}, nivel ${n}${k === q ? ', te acompaña' : '. Toca para que te acompañe'}"><span class="mm-dib" data-mm="${k}"></span><b>${esc(nombreDe(k))}</b><small>Nivel ${n}</small>${k === q ? `<i class="mm-sello">${ico('check')}</i>` : ''}</button>`; }).join('')
      + `<button role="listitem" class="mi-masc adoptar" data-adoptar-abrir aria-label="Adoptar otra mascota"><span class="mm-mas">${ico('plus')}</span><b>Adoptar</b><small>${vivas.length ? 'Otra más' : 'Gratis'}</small></button>`;
    caja.querySelectorAll('[data-mm]').forEach((d) => crearMascota(d, { personaje: d.dataset.mm, tam: 58 }));
  }
  function pintarFicha(){
    const c = $('#capa.companero'); if(!c) return;
    const q = activa(), m = misMascotas()[q], f = $('#mascFicha', c);
    const muerta = q === 'no' && Object.values(misMascotas()).some((x) => x.muerta) && !vivasMias().length;
    $('#cieloCarta', c).hidden = !muerta;
    if(muerta){ const ult = (h.perfil().cielo || []).slice(-1)[0];
      $('#cieloCarta', c).innerHTML = `<b>${ult ? `Tu ${esc((ESPECIES[ult.especie]?.nombre || 'mascota').toLowerCase())} se fue` : 'Tu mascota se fue'}</b><p>Pasaron ${MUERE_HORAS / 24} días sin cuidados. Llegó al nivel ${ult?.nivel || 1}.</p><button class="bt fuerte" data-adoptar-abrir>${ico('heart')}Adopta otra (gratis)</button>`; }
    $('#pistaCuarto', c).hidden = !m || m.muerta;
    if(!m || m.muerta){ f.innerHTML = vivasMias().length ? '' : `<p class="mf-vacio">${muerta ? '' : 'Todavía no tienes mascota. Toca «Adoptar» y elige una.'}</p>`; return; }
    const n = nivelMascota(m.xp || 0), a = xpDeNivel(n), b = xpDeNivel(n + 1), et = etapaDe(q, n);
    const pct = n >= 30 ? 100 : Math.round(((m.xp || 0) - a) / Math.max(1, b - a) * 100);
    f.innerHTML = `<div class="mf-nombre"><b>${esc(nombreDe(q))}</b><button class="bt redondo fantasma mini" data-renombrar aria-label="Ponerle nombre">${ico('pencil')}</button></div>
      <div class="mf-nivel"><span class="mf-etapa">${esc(ETAPAS[et])}</span><span>Nivel ${n}</span><i><i style="width:${pct}%"></i></i><small>${n >= 30 ? 'Nivel máximo' : `${b - (m.xp || 0)} XP para el ${n + 1}`}</small></div>`;
  }
  function pintarCielo(){
    const c = $('#capa.companero'); if(!c) return;
    const cielo = h.perfil().cielo || [];
    $('#cieloLista', c).innerHTML = cielo.length ? `<div class="seccion-t">Las que se fueron</div><div class="cielo-l">${cielo.slice().reverse().map((x) => `<span>${esc(ESPECIES[x.especie]?.nombre || x.especie)} · nivel ${x.nivel}</span>`).join('')}</div>` : '';
  }
  function pintarCuarto(primera = false){
    const c = $('#capa.companero'); if(!c) return;
    const p = h.perfil(), cu = cuidado(), q = quePasa(cu);
    $('#cubosCuarto', c).innerHTML = `<span class="cubo-ico">${CUBO}</span>${cubos()}`;
    $('#muebles', c).innerHTML = ((p.cuarto && p.cuarto.puestos) || []).filter((k) => COSAS[k] && LUGAR[k]).map((k) => `<span class="mueble" data-mueble="${k}" style="left:${LUGAR[k].x}%;top:${LUGAR[k].y}%;width:${LUGAR[k].w}%">${COSAS[k]}</span>`).join('');
    const barra = (k, t, icono) => { const v = Math.round(cu[k] ?? 0); return `<div class="barra-c ${v < 35 ? 'baja' : ''}"><span>${ico(icono)}${t}</span><i><i style="width:${v}%"></i></i><b>${v}</b></div>`; };
    $('#barras', c).innerHTML = barra('hambre', 'Llenito', 'heart') + barra('limpieza', 'Limpio', 'sparkles') + barra('animo', 'Contento', 'party-popper');
    pintarMis(); pintarFicha(); pintarCielo();
    if(masc && primera){
      const accion = { feliz: 'saluda', normal: 'calma', hambre: 'triste', sucio: 'triste', triste: 'triste', 'muy-mal': 'triste' }[q];
      setTimeout(() => masc?.play(accion, { decir: azar(FRASES[q]), decirMs: 3200 }), 450);
    }
    pintarTienda();
    pintarPastilla();
  }

  /* ── acariciarla: tallar con el dedo encima. Cada tanto que tallas, se derrite de gusto y suelta corazones ── */
  function acariciar(cuarto){
    let ultimo = null, recorrido = 0, mandado = 0;
    cuarto.addEventListener('pointerdown', (e) => { if(!masc || pelota || !e.target.closest('.masc-cuarto')) return; ultimo = { x: e.clientX, y: e.clientY }; recorrido = 0; });
    cuarto.addEventListener('pointermove', (e) => {
      if(!ultimo || !masc) return;
      const r = masc.el.getBoundingClientRect();
      if(e.clientX < r.left - 20 || e.clientX > r.right + 20 || e.clientY < r.top - 20 || e.clientY > r.bottom + 20){ ultimo = null; return; }
      recorrido += Math.hypot(e.clientX - ultimo.x, e.clientY - ultimo.y); ultimo = { x: e.clientX, y: e.clientY };
      if(recorrido > 160){
        recorrido = 0; masc.play('amor'); masc.icono('corazon', { x: (e.clientX - r.left) / r.width }); vibrar(6); tono(SON.pop, { tono: 1.3 });
        const ahora = Date.now(); if(ahora - mandado > 2500){ mandado = ahora; pedir({ accion: 'cuidar', que: 'caricia' }).then(() => pintarCuarto()).catch(() => {}); }
      }
    });
    const suelta = () => { if(ultimo && recorrido < 12 && masc){ /* un toque sin tallar lo hace el propio motor (reacciona) */ } ultimo = null; };
    cuarto.addEventListener('pointerup', suelta); cuarto.addEventListener('pointercancel', suelta);
  }

  /* ── la pelota: aparece, la avientas con el dedo (o tocas el piso y va para allá) y tu mascota corre por ella ── */
  let pelota = null;
  function pelotaFuera(){ const c = $('#capa.companero'), cuarto = c && c.querySelector('#cuarto'); if(pelota){ cancelAnimationFrame(pelota.raf); pelota.el.remove(); cuarto?.removeEventListener('pointerdown', pelota.alPiso); pelota = null; } cuarto?.classList.remove('jugando'); }
  function jugarPelota(){
    const c = $('#capa.companero'); if(!c || !masc) return;
    if(pelota){ pelotaFuera(); return; }
    const cuarto = $('#cuarto', c), capaP = $('#pelotaCapa', c), caja = $('#mascCuarto', c);
    cuarto.classList.add('jugando');
    const W = () => cuarto.clientWidth, H = () => cuarto.clientHeight, R = 18;
    const el = document.createElement('div'); el.className = 'pelota'; el.innerHTML = COSAS.pelota || ''; el.setAttribute('aria-label', 'Pelota: avíentala con el dedo');
    capaP.append(el);
    const piso = () => H() * .9 - R;
    const st = { x: W() * .25, y: piso() - 120, vx: 120, vy: 0, mx: W() / 2, agarrada: false, arrastre: null, atrapadas: 0, espera: 0, t: performance.now() };
    pelota = { el, raf: 0 };
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); el.setPointerCapture?.(e.pointerId); const b = cuarto.getBoundingClientRect(); st.arrastre = [{ x: e.clientX - b.left, y: e.clientY - b.top, t: performance.now() }]; st.agarrada = true; });
    el.addEventListener('pointermove', (e) => { if(!st.agarrada) return; const b = cuarto.getBoundingClientRect(); const pt = { x: e.clientX - b.left, y: e.clientY - b.top, t: performance.now() }; st.arrastre.push(pt); if(st.arrastre.length > 5) st.arrastre.shift(); st.x = Math.max(R, Math.min(W() - R, pt.x)); st.y = Math.min(piso(), pt.y); });
    const soltar = () => { if(!st.agarrada) return; st.agarrada = false; const a = st.arrastre[0], z = st.arrastre[st.arrastre.length - 1], dt = Math.max(16, z.t - a.t) / 1000;
      st.vx = Math.max(-1400, Math.min(1400, (z.x - a.x) / dt)); st.vy = Math.max(-1600, Math.min(900, (z.y - a.y) / dt)); if(Math.hypot(st.vx, st.vy) < 60){ st.vy = -650; st.vx = (Math.random() - .5) * 500; } tono(SON.whoosh); };
    el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
    /* tocar el cuarto (no la pelota): la pelota va hacia allá */
    pelota.alPiso = (e) => { if(st.agarrada || e.target.closest('.pelota')) return; const b = cuarto.getBoundingClientRect(); const x = e.clientX - b.left; st.vx = (x - st.x) * 1.6; st.vy = -700; tono(SON.whoosh); };
    cuarto.addEventListener('pointerdown', pelota.alPiso);
    masc.decir('¡Avíentamela!', 2000);
    const paso = (ahora) => {
      if(!pelota || !el.isConnected){ pelotaFuera(); return; }
      const dt = Math.min(.04, (ahora - st.t) / 1000); st.t = ahora;
      if(!st.agarrada && ahora > st.espera){
        st.vy += 1800 * dt; st.x += st.vx * dt; st.y += st.vy * dt;
        if(st.x < R){ st.x = R; st.vx = Math.abs(st.vx) * .7; } if(st.x > W() - R){ st.x = W() - R; st.vx = -Math.abs(st.vx) * .7; }
        if(st.y < R){ st.y = R; st.vy = Math.abs(st.vy) * .5; }
        if(st.y > piso()){ st.y = piso(); if(Math.abs(st.vy) > 120){ st.vy = -st.vy * .55; tono(SON.rebote, { vol: .25 }); } else st.vy = 0; st.vx *= Math.pow(.25, dt); }
      }
      /* la mascota corre hacia la pelota */
      const objetivo = Math.max(W() * .18, Math.min(W() * .82, st.x)), dx = objetivo - st.mx;
      if(Math.abs(dx) > 4){ st.mx += Math.sign(dx) * Math.min(Math.abs(dx), 260 * dt); masc?.el.style.setProperty('--voltea', dx < 0 ? -1 : 1); }
      caja.style.left = (st.mx / W() * 100).toFixed(2) + '%';
      /* la atrapa si está a ras de piso y cerquita */
      if(!st.agarrada && ahora > st.espera && st.y > piso() - 50 && Math.abs(st.x - st.mx) < 34){
        st.espera = ahora + 1100; st.atrapadas += 1; el.style.opacity = '0';
        masc.play('festeja', { decir: azar(['¡La tengo!', '¡Otra vez!', '¡Jajaja!', '¡Atrapada!']), decirMs: 1200 }); tono(SON.combo); vibrar(14);
        pedir({ accion: 'cuidar', que: 'pelota' }).then(() => pintarCuarto()).catch(() => {});
        if(st.atrapadas === 3) cuidar('jugar', null, { callado: true });
        setTimeout(() => { if(!pelota) return; el.style.opacity = '1'; st.x = st.mx; st.y = piso() - 70; st.vx = (Math.random() < .5 ? -1 : 1) * (260 + Math.random() * 260); st.vy = -820; }, 900);
      }
      el.style.transform = `translate(${(st.x - R).toFixed(1)}px, ${(st.y - R).toFixed(1)}px) rotate(${(st.x * 2).toFixed(0)}deg)`;
      pelota.raf = requestAnimationFrame(paso);
    };
    pelota.raf = requestAnimationFrame(paso);
  }

  /* ── adoptar: todas las especies, la que ya es tuya dice «Ya es tuya»; un toque elige y un botón grande confirma ── */
  function adoptarHoja(sugerida){
    const mias = misMascotas();
    hoja('Adopta una mascota', `<p class="sub-vista" style="margin:0 0 10px">${vivasMias().length ? 'Las nuevas cuestan cubitos. Empiezan bebés y crecen contigo.' : 'Tu primera mascota es gratis. Empieza bebé y crece contigo.'}</p>
      <div class="adopta-g">${Object.entries(ESPECIES).map(([k, E]) => { const ya = mias[k] && !mias[k].muerta, pr = precioAdoptar(k);
        return `<button class="adopta ${k === sugerida ? 'elegida' : ''}" data-adopta="${k}" ${ya ? 'disabled' : ''} aria-label="${esc(E.nombre)}${ya ? ', ya es tuya' : pr ? `, ${pr} cubitos` : ', gratis'}"><span class="ad-dib" data-ad="${k}"></span><b>${esc(E.nombre)}</b><small>${ya ? 'Ya es tuya' : pr ? `<span class="cubo-ico">${CUBO}</span>${pr}` : 'Gratis'}</small></button>`; }).join('')}</div>
      <button class="bt fuerte ancho" data-adopta-si style="margin-top:12px" ${sugerida && !(mias[sugerida] && !mias[sugerida].muerta) ? '' : 'disabled'}>${sugerida ? textoAdoptar(sugerida) : 'Elige una'}</button>`, (hj) => {
      hj.querySelectorAll('[data-ad]').forEach((d) => crearMascota(d, { personaje: d.dataset.ad, tam: 64, vestido: ESPECIES[d.dataset.ad].ave ? { etapa: 'huevo' } : { etapa: 'bebe' } }));
      let elegida = sugerida && !(mias[sugerida] && !mias[sugerida].muerta) ? sugerida : null;
      hj.addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-adopta]');
        if(b){ elegida = b.dataset.adopta; hj.querySelectorAll('[data-adopta]').forEach((x) => x.classList.toggle('elegida', x === b)); const si = hj.querySelector('[data-adopta-si]'); si.disabled = false; si.innerHTML = textoAdoptar(elegida); tono(SON.toque); return; }
        const si = ev.target.closest('[data-adopta-si]'); if(!si || !elegida) return;
        const pr = precioAdoptar(elegida);
        if(cubos() < pr){ tono(SON.mal); h.brindis(`Te faltan ${pr - cubos()} cubitos`, 'vino', 'circle-x'); return; }
        si.disabled = true;
        try{ await pedir({ accion: 'crianza', que: 'adoptar', especie: elegida }); cerrarHoja(); h.elegir?.(elegida); tono(SON.compra || SON.moneda); h.confeti?.(); ponerMascota(); pintarCuarto(); setTimeout(() => masc?.play('festeja', { decir: ESPECIES[elegida].ave ? '…' : '¡Hola! Soy tuyo.', decirMs: 2600 }), 300); }
        catch(err){ si.disabled = false; tono(SON.mal); h.brindis(err.message, 'vino', 'circle-x'); }
      });
    });
  }
  const textoAdoptar = (k) => { const pr = precioAdoptar(k); return `${ico('heart')}Adoptar ${esc(ESPECIES[k].nombre.toLowerCase())}${pr ? ` · <span class="cubo-ico">${CUBO}</span>${pr}` : ' gratis'}`; };

  /* ── vestir: arriba tu mascota como va a quedar; abajo ropa y colores. Lo que no tienes dice su precio y se compra ahí ── */
  function vestirHoja(){
    const q = activa(), m = misMascotas()[q]; if(!m || m.muerta) return;
    let prueba = { skin: m.skin || 'normal', acc: [...(m.acc || [])] }, tab = 'ropa', vista = null;
    const armario = () => h.perfil().armario || [];
    const vestido = () => ({ ...(h.vestidoDe ? h.vestidoDe(q) : {}), skin: prueba.skin, acc: prueba.acc });
    hoja(`Vestir a ${nombreDe(q)}`, `<div class="vestir-vista" id="vestirVista"></div>
      <div class="pestanas-v" role="tablist"><button role="tab" data-tab="ropa" aria-selected="true">${ico('crown')}Ropa</button><button role="tab" data-tab="color" aria-selected="false">${ico('palette')}Colores</button></div>
      <div class="vestir-g" id="vestirG"></div><p class="sub-vista" style="margin:8px 0 0;font-size:13px">Hasta ${MAX_ACCESORIOS} cosas a la vez, una por lugar (un gorro, unos lentes…).</p>
      <button class="bt fuerte ancho" data-vestir-listo style="margin-top:12px">${ico('check')}Listo</button>`, (hj) => {
      vista = crearMascota(hj.querySelector('#vestirVista'), { personaje: q, tam: 130, vestido: vestido() });
      const pintar = () => {
        const g = hj.querySelector('#vestirG'), arm = armario();
        const lista = tab === 'ropa' ? Object.entries(ACCESORIOS).filter(([k, A]) => A.precio != null || arm.includes(k)) : Object.entries(SKINS).filter(([k, S]) => !S.soloCreadores || arm.includes(k));
        g.innerHTML = lista.map(([k, A]) => { const tengo = A.precio === 0 || arm.includes(k), puesto = tab === 'ropa' ? prueba.acc.includes(k) : prueba.skin === k;
          return `<button class="prenda ${puesto ? 'puesta' : ''} ${tengo ? '' : 'sin'}" data-prenda="${k}" aria-pressed="${puesto}"><span class="pr-dib" data-pr="${k}"></span><b>${esc(A.nombre)}</b><small>${tengo ? (puesto ? 'Puesto' : 'Tuyo') : `<span class="cubo-ico">${CUBO}</span>${A.precio}`}</small></button>`; }).join('');
        g.querySelectorAll('[data-pr]').forEach((d) => { const k = d.dataset.pr; crearMascota(d, { personaje: q, tam: 46, vestido: tab === 'ropa' ? { acc: [k] } : { skin: k } }); });
      };
      pintar();
      hj.addEventListener('click', async (ev) => {
        const t = ev.target.closest('[data-tab]'); if(t){ tab = t.dataset.tab; hj.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === t)); tono(SON.toque); pintar(); return; }
        const pr = ev.target.closest('[data-prenda]');
        if(pr){
          const k = pr.dataset.prenda, A = ACCESORIOS[k] || SKINS[k];
          if(!(A.precio === 0 || armario().includes(k))){
            if(cubos() < A.precio){ tono(SON.mal); h.brindis(`Te faltan ${A.precio - cubos()} cubitos`, 'vino', 'circle-x'); return; }
            pr.disabled = true;
            try{ await pedir({ accion: 'crianza', que: 'comprarRopa', item: k }); tono(SON.compra || SON.moneda); vibrar(12); }
            catch(err){ pr.disabled = false; tono(SON.mal); h.brindis(err.message, 'vino', 'circle-x'); return; }
          }
          if(tab === 'color') prueba.skin = k;
          else if(prueba.acc.includes(k)) prueba.acc = prueba.acc.filter((x) => x !== k);
          else { const l = ACCESORIOS[k].lugar; prueba.acc = [...prueba.acc.filter((x) => ACCESORIOS[x].lugar !== l), k].slice(-MAX_ACCESORIOS); }
          tono(SON.pop); vista.vestir(vestido()); vista.play('bien'); pintar(); return;
        }
        if(ev.target.closest('[data-vestir-listo]')){
          try{ await pedir({ accion: 'crianza', que: 'vestir', especie: q, skin: prueba.skin, acc: prueba.acc }); cerrarHoja(); ponerMascota(); pintarCuarto(); setTimeout(() => masc?.play('festeja', { decir: '¡Me veo increíble!' }), 250); }
          catch(err){ tono(SON.mal); h.brindis(err.message, 'vino', 'circle-x'); }
        }
      });
    });
  }

  function renombrar(){
    const q = activa(); if(q === 'no') return;
    hoja('Ponle nombre', `<input class="campo" id="nombreMasc" maxlength="20" value="${esc(misMascotas()[q]?.nombre || '')}" placeholder="${esc(ESPECIES[q]?.nombre || '')}" aria-label="Nombre de tu mascota"><button class="bt fuerte ancho" data-nombre-si style="margin-top:12px">${ico('check')}Guardar</button>`, (hj) => {
      const i = hj.querySelector('#nombreMasc'); setTimeout(() => i.focus(), 100);
      const listo = async () => { try{ await pedir({ accion: 'crianza', que: 'nombre', especie: q, nombre: i.value }); cerrarHoja(); pintarCuarto(); masc?.play('amor', { decir: i.value.trim() ? `¡Me llamo ${i.value.trim()}!` : '' }); }catch(err){ h.brindis(err.message, 'vino', 'circle-x'); } };
      hj.querySelector('[data-nombre-si]').addEventListener('click', listo);
      i.addEventListener('keydown', (e) => { if(e.key === 'Enter') listo(); });
    });
  }

  /* ── cuando crece (lo manda el servidor al sumar XP) y cuando se muere ── */
  function crecio(s){
    return new Promise((listo) => {
      const cambio = s.etapa !== s.etapaAntes;
      if(!cambio){ h.brindis(`${nombreDe(s.especie)} subió a nivel ${s.nivel}`, 'oro', 'star'); tono(SON.subir); return listo(); }
      const f = document.createElement('div'); f.className = 'fiesta fiesta-crece'; f.setAttribute('role', 'dialog');
      const titulo = s.etapaAntes === 'huevo' ? '¡Nació!' : s.etapa === 'viejo' ? `¡${nombreDe(s.especie)} ya es sabio!` : `¡${nombreDe(s.especie)} creció!`;
      f.setAttribute('aria-label', titulo);
      f.innerHTML = `<div class="crece-masc" id="creceMasc"></div><h1>${esc(titulo)}</h1><p>Ahora es ${esc(ETAPAS[s.etapa].toLowerCase())} · nivel ${s.nivel}. Sigue estudiando y seguirá creciendo contigo.</p><button class="bt blanco">Continuar</button>`;
      document.body.append(f);
      const v = h.vestidoDe ? h.vestidoDe(s.especie) : null;
      const m = crearMascota(f.querySelector('#creceMasc'), { personaje: s.especie, tam: 170, vestido: v ? { ...v, etapa: s.etapaAntes } : { etapa: s.etapaAntes } });
      tono(SON.nivel); setTimeout(() => { m.el.classList.add('crece-luz'); }, 500);
      setTimeout(() => { m.vestir({ ...(v || {}), etapa: s.etapa }); m.play('festeja'); h.confeti?.(); tono(SON.subir); }, 1300);
      f.querySelector('button').addEventListener('click', () => { m.destruir(); f.remove(); listo(); }); f.querySelector('button').focus();
    });
  }
  function murio(a){
    const n = ESPECIES[a.especie]?.nombre || 'mascota';
    hoja(`Tu ${n.toLowerCase()} se fue`, `<p style="margin:0 0 12px">Pasaron ${MUERE_HORAS / 24} días sin que nadie le diera de comer, la bañara o jugara con ella, y se fue. Llegó al nivel ${a.nivel}. Puedes adoptar otra mascota; esta vez cuídala un ratito cada día.</p>
      <button class="bt fuerte ancho" data-adoptar-otra>${ico('heart')}Adoptar otra (gratis)</button>`, (hj) => {
      hj.querySelector('[data-adoptar-otra]').addEventListener('click', () => { cerrarHoja(); abrir({ adoptar: a.especie }); });
    });
    tono(SON.perdio); pintarPastilla();
  }

  function pintarTienda(){
    const c = $('#capa.companero'); if(!c || !tienda) return;
    const p = h.perfil(), inv = p.inv || {};
    $('#tienda', c).innerHTML = GRUPOS.map(([tipo, titulo]) => {
      const cosas = Object.entries(tienda).filter(([, it]) => it.tipo === tipo); if(!cosas.length) return '';
      return `<h4 class="grupo-t">${titulo}</h4><div class="tienda-g">${cosas.map(([k, it]) => {
        const tengo = tipo === 'racha' ? (p.congeladas || 0) : (inv[k] || 0), unico = tipo === 'mueble' || tipo === 'juguete';
        const alcanza = cubos() >= it.precio, comprado = unico && tengo;
        return `<div class="cosa"><span class="cosa-dib">${COSAS[k] || ''}</span><b>${esc(it.nombre)}</b>
          <small>${tengo && !unico ? `Tienes ${tengo}` : comprado ? 'Ya es tuyo' : it.que ? esc(it.que) : ''}</small>
          <button class="bt mini ${alcanza && !comprado ? 'fuerte' : ''}" data-comprar="${k}" ${comprado ? 'disabled' : ''} aria-label="Comprar ${esc(it.nombre)} por ${it.precio} cubitos"><span class="cubo-ico">${CUBO}</span>${it.precio}</button></div>`;
      }).join('')}</div>`;
    }).join('');
  }

  async function alTocar(e){
    if(e.target.closest('[data-cerrar]')){ pelotaFuera(); cerrarCapa(); masc = null; h.alCerrar?.(); return; }
    const el = e.target.closest('[data-elegir]');
    if(el){ const k = el.dataset.elegir; if(k === activa()){ masc?.play('saluda'); return; }
      tono(SON.pop); vibrar(10); h.elegir?.(k); ponerMascota(); pintarCuarto();
      pedir({ accion: 'crianza', que: 'activa', especie: k }).catch((err) => h.brindis(err.message, 'vino', 'circle-x'));
      setTimeout(() => masc?.play('saluda', { decir: azar(['¡Me toca a mí!', '¡Vamos a estudiar!', '¡Hola otra vez!']) }), 200); return; }
    if(e.target.closest('[data-adoptar-abrir]')){ tono(SON.toque); adoptarHoja(); return; }
    if(e.target.closest('[data-vestir]')){ tono(SON.toque); if(!masc) return adoptarHoja(); vestirHoja(); return; }
    if(e.target.closest('[data-renombrar]')){ renombrar(); return; }
    const b = e.target.closest('[data-comprar]');
    if(b){
      const k = b.dataset.comprar, it = tienda[k];
      if(cubos() < it.precio){ tono(SON.mal); h.brindis(`Te faltan ${it.precio - cubos()} cubitos`, 'vino', 'circle-x'); masc?.play('piensa_corto', { decir: 'Sigue estudiando y juntamos más.' }); return; }
      b.disabled = true;
      try{ await pedir({ accion: 'comprar', item: k }); tono(SON.compra || SON.moneda); vibrar(15); masc?.play('bien', { decir: it.tipo === 'mueble' ? '¡Me encanta para mi cuarto!' : it.tipo === 'racha' ? 'Tu racha está protegida.' : '¡Gracias!' }); pintarCuarto(); }
      catch(err){ tono(SON.mal); h.brindis(err.message, 'vino', 'circle-x'); pintarCuarto(); }
      return;
    }
    const m = e.target.closest('[data-mueble]');
    if(m){ masc?.play('amor', { decir: tienda?.[m.dataset.mueble] ? `Mi ${tienda[m.dataset.mueble].nombre.toLowerCase()}` : '' }); return; }
    const q = e.target.closest('[data-cuidar]');
    if(!q) return;
    const que = q.dataset.cuidar, inv = h.perfil().inv || {};
    if(!masc){ adoptarHoja(); return; }
    if(que === 'jugar'){ tono(SON.toque); jugarPelota(); return; }
    if(que === 'comer'){
      const comida = Object.keys(inv).filter((k) => tienda?.[k]?.tipo === 'comida' && inv[k] > 0);
      if(!comida.length){ masc?.play('triste', { decir: 'No hay comida… ¿me compras algo?' }); $('#tienda')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      hoja('¿Qué le das?', `<div class="tienda-g">${comida.map((k) => `<button class="cosa elegir" data-dar="${k}"><span class="cosa-dib">${COSAS[k] || ''}</span><b>${esc(tienda[k].nombre)}</b><small>Tienes ${inv[k]}</small></button>`).join('')}</div>`, (hj) => {
        hj.addEventListener('click', async (ev) => { const d = ev.target.closest('[data-dar]'); if(!d) return; cerrarHoja(); await cuidar('comer', d.dataset.dar); });
      });
      return;
    }
    if(que === 'banar' && !inv.jabon){ masc?.play('triste', { decir: 'Me falta jabón…' }); $('#tienda')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    await cuidar(que);
  }
  async function cuidar(que, item, op = {}){
    try{
      await pedir({ accion: 'cuidar', que, item });
      if(op.callado){ pintarCuarto(); return; }
      if(que === 'comer'){ tono(SON.comer || SON.pop); masc?.play('bien', { decir: azar(['¡Qué rico!', '¡Mmm, delicioso!', 'Ya me siento mejor.']) }); }
      if(que === 'banar'){ tono(SON.burbujas || SON.whoosh); masc?.lluvia(['gota', 'chispa'], 12); masc?.play('amor', { decir: '¡Ya estoy limpiecito!' }); }
      if(que === 'jugar'){ tono(SON.rebote || SON.combo); masc?.play('juega', { decir: azar(['¡Otra vez!', '¡Jajaja!', '¡Qué divertido!']) }); }
      vibrar(12); pintarCuarto();
    }catch(err){ if(!op.callado) masc?.play('piensa_corto', { decir: err.message }); }
  }

  return { abrir, premios, pintarPastilla, crecio, murio };
}
