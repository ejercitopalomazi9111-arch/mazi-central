/* perfil-otro.js — VER A ALGUIEN DEL RANKING (Carlos, 14 nov)
 * ===========================================================================
 * «Si alguien quiere ver a alguien más que está en el ranking: qué nivel tiene, qué cursos ha tomado, para qué ha
 *  usado la aplicación, cuánta experiencia, las mascotas que tiene, los estilos.»
 * Tocas una fila del ranking (o de tus amigos) y sale su hoja. Lo que se enseña lo decide el servidor
 * (GET ?perfil=<cuenta>, estudio.js): nada de cubitos, amigos ni avisos.
 * ===========================================================================*/
import { nombreHTML, insigniasHTML } from './nombre.js';
import { ligaDe, trofeoSVG } from './ligas.js';
import { crearMascota } from './mascota.js';
import { ESPECIES, ETAPAS } from './crianza-datos.js';

export function iniciarPerfilOtro(h){
  const { sala, hoja, esc, ico, tono, SON } = h;
  const mascotas = [];

  async function abrir(cuenta, nombre = ''){
    if(!cuenta) return;
    tono?.(SON?.toque);
    const hj = hoja(nombre ? `Perfil de ${nombre}` : 'Perfil', `<div class="po" aria-busy="true"><p class="po-carga">${ico('sparkles')}Cargando…</p></div>`);
    let o;
    try{ o = (await sala(null, '?perfil=' + encodeURIComponent(cuenta))).otro; }
    catch(err){ const c = hj.querySelector('.po'); if(c){ c.removeAttribute('aria-busy'); c.innerHTML = `<p class="po-carga">${ico('circle-x')}${esc(err.message || 'No se pudo abrir su perfil.')}</p>`; } return; }
    if(!hj.isConnected) return;
    pintar(hj, o);
  }

  function pintar(hj, o){
    mascotas.splice(0).forEach((m) => m?.destruir?.());
    const L = ligaDe(o.liga), materias = Object.entries(o.materias || {}).sort((a, b) => b[1] - a[1]);
    const vivas = (o.mascotas || []).filter((m) => !m.muerta);
    const c = hj.querySelector('.po'); c.removeAttribute('aria-busy');
    c.innerHTML = `
      <div class="po-cab">
        <span class="av po-av" data-po-av></span>
        <div class="po-quien"><h4>${nombreHTML(o.nombre, o.estilo)}</h4>${(o.titulos || []).length ? `<div class="insignias">${insigniasHTML(o.titulos, ico)}</div>` : ''}</div>
      </div>
      <div class="po-datos">
        <div><b>${o.nivel || 1}</b><small>Nivel</small></div>
        <div><b>${o.xp || 0}</b><small>XP en total</small></div>
        <div><b>${o.racha || 0}</b><small>Días de racha</small></div>
        <div class="po-liga">${trofeoSVG(o.liga | 0, { tam: 30 })}<small>Liga ${esc(L.nombre)}</small></div>
      </div>
      ${o.xpSemana ? `<p class="po-semana">${ico('zap')}Esta semana lleva ${o.xpSemana} XP</p>` : ''}
      <h5>${ico('book-open')}Para qué usa CARYMO</h5>
      ${materias.length ? `<div class="po-materias">${materias.map(([m, n]) => `<span class="pastilla">${esc(m)}<small>${n}</small></span>`).join('')}</div>` : '<p class="po-nada">Todavía no arma ningún plan.</p>'}
      ${(o.cursos || []).length ? `<h5>${ico('graduation-cap')}Cursos que ha tomado</h5><ul class="po-cursos">${o.cursos.slice(0, 8).map((x) => `<li>${esc(x.titulo || 'Sin nombre')}${x.materia ? `<small>${esc(x.materia)}</small>` : ''}</li>`).join('')}</ul>${o.cursos.length > 8 ? `<p class="po-nada">y ${o.cursos.length - 8} más</p>` : ''}` : ''}
      <h5>${ico('heart')}Sus mascotas</h5>
      ${vivas.length ? `<div class="po-mascotas">${vivas.map((m, i) => `<div class="po-masc"><span class="po-dib" data-po-m="${i}"></span><b>${esc(m.nombre || ESPECIES[m.especie]?.nombre || 'Mascota')}</b><small>Nivel ${m.nivel} · ${esc(ETAPAS[m.etapa] || '')}</small></div>`).join('')}</div>` : '<p class="po-nada">Todavía no adopta ninguna.</p>'}`;
    vivas.forEach((m, i) => {
      const caja = c.querySelector(`[data-po-m="${i}"]`);
      if(caja) mascotas.push(crearMascota(caja, { personaje: m.especie, tam: 78, vestido: { etapa: m.etapa, skin: m.skin, acc: m.acc, progreso: 0 } }));
    });
    if(o.personaje && h.svgPersonaje){ const av = c.querySelector('[data-po-av]'); h.svgPersonaje(o.personaje).then((svg) => { if(av.isConnected){ av.innerHTML = svg; av.classList.add('con-pj'); } }).catch(() => {}); }
    else c.querySelector('[data-po-av]').textContent = (o.nombre || '?').charAt(0).toUpperCase();
  }

  /* tocar una fila del ranking o de amigos (la tuya no: para eso está «Tú») */
  const fila = (e) => e.target.closest('.fila-rank[data-cuenta]:not(.yo)');
  document.addEventListener('click', (e) => { const f = fila(e); if(f && !e.target.closest('button, a')) abrir(f.dataset.cuenta, f.querySelector('.nom-txt')?.textContent || ''); });
  document.addEventListener('keydown', (e) => { if(e.key !== 'Enter' && e.key !== ' ') return; const f = fila(e); if(f){ e.preventDefault(); abrir(f.dataset.cuenta, f.querySelector('.nom-txt')?.textContent || ''); } });

  return { abrir };
}
