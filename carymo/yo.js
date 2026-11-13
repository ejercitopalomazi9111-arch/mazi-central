/* yo.js — LA PESTAÑA «TÚ» (Carlos, 13 nov: «todo se está sobrecargando… en lugar de tener 50 pestañitas
 * divídelo en 3: plan, yo y una más… en yo puedes meter el ranking, tus apuntes, tu horario… que haya botones»)
 * ===========================================================================
 * Abajo quedan tres: Estudiar (el camino), Comunidad (ranking, ligas y amigos) y Tú (esto).
 * Aquí arriba van tu personaje y TU MASCOTA A LA VISTA («el apartado donde está tu mascota está súper
 * escondido»): se toca y entras a su cuarto. Abajo, un botón grande por cosa; cada una abre su pantalla
 * con «‹ Tú» para regresar. Las pantallas son las de siempre (horario, apuntes, pizarrón, buscar, ajustes):
 * aquí sólo se ordena cómo se llega a ellas.
 * ===========================================================================*/
import { personajeDeArranque, normalizarPersonaje } from './ropa.js';

/* las sub-pantallas de «Tú»: su título en la barrita de regreso */
export const SUBVISTAS = { horario: 'Horario', apuntes: 'Apuntes', pizarron: 'Pizarrón libre', buscar: 'Buscar un tema', perfil: 'Ajustes y cuenta' };

export function iniciarYo(h){
  const { esc, ico, $ } = h;
  let masc = null;

  function estadoMascota(){
    const c = h.perfil().cuidado || {};
    if((c.hambre ?? 80) < 25) return ['Tiene hambre', 'baja'];
    if((c.limpieza ?? 80) < 25) return ['Necesita un baño', 'baja'];
    if((c.animo ?? 80) < 25) return ['Está triste', 'baja'];
    return ['Está contenta', ''];
  }
  function boton(dest, icono, titulo, sub, extra = ''){
    return `<button class="yo-bt" ${dest.startsWith('@') ? `data-yo="${dest.slice(1)}"` : `data-ir="${dest}"`} ${extra}><span class="yo-ico">${ico(icono)}</span><span><b>${esc(titulo)}</b><small>${esc(sub)}</small></span></button>`;
  }
  async function pintar(){
    const v = $('#vYo'); if(!v) return;
    const p = h.perfil(), aj = h.ajustes(), conMasc = aj.mascota && aj.mascota !== 'no';
    const [como, cl] = estadoMascota();
    const planes = Object.values(h.planes()), nApuntes = h.cuantosApuntes();
    v.innerHTML = `<div class="yo-cab">
        <button class="yo-pj" data-yo="vestidor" aria-label="Tu personaje: cambiar ropa y accesorios"><span class="yo-pj-dib" id="yoPj"></span><span class="yo-pj-lapiz">${ico('pencil')}</span></button>
        <div class="yo-quien"><h2>${esc(p.nombre || 'Tú')}</h2>
          <div class="yo-chips"><span class="pastilla racha">${ico('flame')}${p.racha || 0}</span><span class="pastilla">${ico('zap')}${p.xp || 0} XP</span><span class="pastilla cubos" id="yoCubos"></span></div></div>
      </div>
      ${conMasc ? `<button class="yo-masc ${cl}" data-yo="companero" aria-label="Tu compañero: ${esc(como)}. Entrar a su cuarto"><span class="yo-masc-dib" id="yoMasc"></span><span class="yo-masc-txt"><b>Tu compañero</b><small>${esc(como)} · entra a su cuarto</small></span>${ico('chevron-right')}</button>`
        : `<button class="yo-masc" data-ir="perfil" aria-label="Elegir un compañero"><span class="yo-masc-dib">${ico('heart')}</span><span class="yo-masc-txt"><b>Elige un compañero</b><small>Te acompaña mientras estudias</small></span>${ico('chevron-right')}</button>`}
      <div class="yo-rejilla">
        ${boton('horario', 'calendar-days', 'Horario', 'Tus clases y tus exámenes')}
        ${boton('apuntes', 'notebook-pen', 'Apuntes', nApuntes ? `${nApuntes} guardados, por materia` : 'Por materia')}
        ${boton('pizarron', 'presentation', 'Pizarrón libre', 'Pídele una clase de lo que sea')}
        ${boton('buscar', 'search', 'Buscar un tema', 'En tus planes y cursos')}
        ${boton('@vestidor', 'shirt', 'Tu personaje', 'Ropa, gorros y lentes')}
        ${boton('perfil', 'settings', 'Ajustes y cuenta', `${planes.length} ${planes.length === 1 ? 'plan' : 'planes'} · voz · avisos`)}
      </div>`;
    h.pintarCubos($('#yoCubos'));
    const pj = normalizarPersonaje(p.personaje || personajeDeArranque(p.cuenta || p.nombre || ''), p.ropa || [], p.cuenta || '');
    h.svgPersonaje(pj).then((s) => { const e = $('#yoPj'); if(e) e.innerHTML = s; }).catch(() => {});
    if(masc){ try{ masc.destruir(); }catch{} masc = null; }
    if(conMasc){ masc = h.crearMascota($('#yoMasc'), { personaje: aj.mascota, tam: 86 }); if(cl) setTimeout(() => masc?.play('triste'), 500); }
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-yo]'); if(!b) return;
    h.tono(h.SON.toque);
    if(b.dataset.yo === 'vestidor') h.abrirVestidor();
    if(b.dataset.yo === 'companero') h.abrirCompanero();
  });
  return { pintar };
}
