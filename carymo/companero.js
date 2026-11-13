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
  function pintarPastilla(){
    const b = $('#pCubos'); if(!b) return;
    b.innerHTML = `<span class="cubo-ico">${CUBO}</span>${cubos()}`;
    b.setAttribute('aria-label', `${cubos()} cubitos de palomium. Abrir tu compañero`);
    const c = cuidado(), q = quePasa(c);
    b.classList.toggle('aviso', q === 'hambre' || q === 'sucio' || q === 'triste' || q === 'muy-mal');
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

  /* ── el cuarto ── */
  async function abrir(){
    const c = capa('companero');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Volver">${ico('arrow-left')}</button><h2 style="flex:1;margin:0;font:800 20px/1.2 Titulo">Tu compañero</h2><span class="pastilla cubos" id="cubosCuarto"></span></div>
      <div class="cuerpo">
        <div class="cuarto" id="cuarto"><div class="pared"></div><div class="ventana"></div><div class="piso"></div><div class="muebles" id="muebles"></div><div class="masc-cuarto" id="mascCuarto"></div></div>
        <div class="barras-cuidado" id="barras"></div>
        <div class="acciones-cuidado"><button class="bt" data-cuidar="comer">${ico('heart')}Darle de comer</button><button class="bt" data-cuidar="banar">${ico('sparkles')}Bañarlo</button><button class="bt" data-cuidar="jugar">${ico('party-popper')}Jugar</button></div>
        <div class="seccion-t">Tienda</div>
        <div id="tienda"><p style="color:var(--suave)">Cargando la tienda…</p></div>
        <div class="como-ganar"><b>Cómo se ganan los cubitos</b><p>Terminando lecciones, subiendo de grado, terminando planes, con tu racha de cada día, cada 7 días seguidos, subiendo de nivel y estudiando con amigos. Son poquitos: cuídalos.</p></div>
      </div>`;
    c.addEventListener('click', alTocar);
    if(h.ajustes().mascota !== 'no'){ masc = crearMascota($('#mascCuarto', c), { personaje: h.ajustes().mascota, tam: 150 }); }
    pintarCuarto(true);
    try{ await traerTienda(); pintarCuarto(); }catch(e){ $('#tienda', c).innerHTML = `<p style="color:var(--suave)">No se pudo abrir la tienda: ${esc(e.message)}</p>`; }
  }
  function pintarCuarto(primera = false){
    const c = $('#capa.companero'); if(!c) return;
    const p = h.perfil(), cu = cuidado(), q = quePasa(cu);
    $('#cubosCuarto', c).innerHTML = `<span class="cubo-ico">${CUBO}</span>${cubos()}`;
    $('#muebles', c).innerHTML = ((p.cuarto && p.cuarto.puestos) || []).filter((k) => COSAS[k] && LUGAR[k]).map((k) => `<span class="mueble" data-mueble="${k}" style="left:${LUGAR[k].x}%;top:${LUGAR[k].y}%;width:${LUGAR[k].w}%">${COSAS[k]}</span>`).join('');
    const barra = (k, t, icono) => { const v = Math.round(cu[k] ?? 0); return `<div class="barra-c ${v < 35 ? 'baja' : ''}"><span>${ico(icono)}${t}</span><i><i style="width:${v}%"></i></i><b>${v}</b></div>`; };
    $('#barras', c).innerHTML = barra('hambre', 'Llenito', 'heart') + barra('limpieza', 'Limpio', 'sparkles') + barra('animo', 'Contento', 'party-popper');
    if(masc && primera){
      const accion = { feliz: 'saluda', normal: 'calma', hambre: 'triste', sucio: 'triste', triste: 'triste', 'muy-mal': 'triste' }[q];
      setTimeout(() => masc.play(accion, { decir: azar(FRASES[q]), decirMs: 3200 }), 450);
    }
    pintarTienda();
    pintarPastilla();
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
    if(e.target.closest('[data-cerrar]')){ cerrarCapa(); masc = null; h.alCerrar?.(); return; }
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
  async function cuidar(que, item){
    try{
      await pedir({ accion: 'cuidar', que, item });
      if(que === 'comer'){ tono(SON.comer || SON.pop); masc?.play('bien', { decir: azar(['¡Qué rico!', '¡Mmm, delicioso!', 'Ya me siento mejor.']) }); }
      if(que === 'banar'){ tono(SON.burbujas || SON.whoosh); masc?.lluvia(['gota', 'chispa'], 12); masc?.play('amor', { decir: '¡Ya estoy limpiecito!' }); }
      if(que === 'jugar'){ tono(SON.rebote || SON.combo); masc?.play('juega', { decir: azar(['¡Otra vez!', '¡Jajaja!', '¡Qué divertido!']) }); }
      vibrar(12); pintarCuarto();
    }catch(err){ masc?.play('piensa_corto', { decir: err.message }); }
  }

  return { abrir, premios, pintarPastilla };
}
