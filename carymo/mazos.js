/* ══════════════════════════════════════════════════════════════════════════
   MIS TARJETAS · mazos que arma el propio alumno (pendiente de Carlos: «herramientas: flashcards…»)
   ──────────────────────────────────────────────────────────────────────────
   Las tarjetas de los planes las arma CARYMO; éstas las escribe el alumno: frente y reverso, o una lista
   pegada («palabra - significado», una por renglón). Se repasan volteando y diciendo si te la sabías.
   El repaso es el mismo de todo CARYMO (repaso.js, cajas de Leitner): la que fallas vuelve hoy mismo al
   final de la tanda y mañana; la que sabes se aleja 1 → 2 → 4 → 8 → 16 días. Sin IA y sin internet:
   todo vive en el teléfono (carymo.mazos).
   Con IA (opcional): pegas tus apuntes o un tema, o tomas foto de tu cuaderno, y la IA arma las tarjetas;
   caen al mazo como cualquier otra y se quitan con la x. Es lo único que pide internet.
   Cero parpadeo (regla 13): durante el repaso la tarjeta es SIEMPRE el mismo nodo; sólo cambia su texto y
   la clase que la voltea.
   ═════════════════════════════════════════════════════════════════════════ */
import { HUECOS } from './repaso.js';

const LLAVE = 'carymo.mazos';
const dia = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const sumarDias = (hoy, n) => dia(new Date(hoy + 'T12:00:00').getTime() + n * 864e5);
const nuevoId = () => Math.random().toString(36).slice(2, 9);

/* ── la lógica, sin pantalla (se prueba en Node) ── */
export function leerMazos(){ try{ const m = JSON.parse(localStorage.getItem(LLAVE) || '[]'); return Array.isArray(m) ? m : []; }catch{ return []; } }
export function guardarMazos(m){ try{ localStorage.setItem(LLAVE, JSON.stringify(m)); }catch{} }
export const tarjeta = (frente, reverso) => ({ id: nuevoId(), frente: String(frente).trim().slice(0, 200), reverso: String(reverso).trim().slice(0, 400), caja: 0, toca: '' });
/** las que tocan hoy: nuevas (sin fecha) o vencidas; primero las de caja más baja (las que más fallas) */
export function paraHoy(mazo, hoy = dia()){
  return mazo.tarjetas.filter((t) => !t.toca || t.toca <= hoy).sort((a, b) => a.caja - b.caja);
}
/** contestar: bien sube de caja y se aleja; mal regresa a la primera y vuelve mañana */
export function calificar(t, bien, hoy = dia()){
  t.caja = bien ? Math.min(HUECOS.length - 1, t.caja + 1) : 0;
  t.toca = sumarDias(hoy, bien ? HUECOS[t.caja] : 1);
  return t;
}
/** «frente - reverso» por renglón (también con tabulador, «:» o «=»; lo que viene de Excel o de una lista) */
export function leerLista(texto){
  return String(texto || '').replace(/\r/g, '').split('\n').map((r) => r.trim()).filter(Boolean).map((r) => {
    const m = /^(.+?)\s*(?:\t|\s[-–—]\s|\s?[:=]\s)\s*(.+)$/.exec(r); return m ? tarjeta(m[1], m[2]) : null; }).filter(Boolean);
}

/* lo que se le pide a la IA y cómo se revisa lo que contesta (se prueba en Node) */
export const SISTEMA_TARJETAS = `Armas tarjetas de memoria (flashcards) para un estudiante mexicano. Te pasa sus apuntes, una foto de su cuaderno o sólo un tema.
Reglas:
- Si te pasa apuntes o foto, usa SÓLO lo que viene ahí; no inventes datos.
- Si sólo te pasa un tema, usa lo básico y seguro que se ve en clase; nada dudoso.
- Frente: una pregunta o término corto (máximo 12 palabras). Reverso: la respuesta, corta y exacta (máximo 25 palabras).
- Una idea por tarjeta. Entre 5 y 20 tarjetas. En español, salvo que el tema sea de otro idioma (vocabulario: frente en ese idioma, reverso en español).
- Nada de numerar ni de «Pregunta:»/«Respuesta:».
Contesta SÓLO este JSON: {"tarjetas":[{"frente":"…","reverso":"…"}]}`;
export function revisarTarjetas(j){
  const xs = (Array.isArray(j) ? j : j && j.tarjetas) || [];
  const limpio = (t) => String(t ?? '').replace(/^\s*(?:\d{1,2}[.)]\s*|(?:pregunta|respuesta|frente|reverso)\s*:\s*)/i, '').trim();
  const vistas = new Set();
  const out = xs.map((x) => x && tarjeta(limpio(x.frente), limpio(x.reverso))).filter((t) => {
    if(!t || !t.frente || !t.reverso) return false; const k = t.frente.toLowerCase(); if(vistas.has(k)) return false; vistas.add(k); return true; }).slice(0, 30);
  if(!out.length) throw new Error('La IA no armó tarjetas.');
  return out;
}
/* la foto se achica antes de mandarla (como la del horario) */
async function fotoChica(archivo){
  const img = await createImageBitmap(archivo).catch(() => null); if(!img) return null;
  const k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
  cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return { mime: 'image/jpeg', data: cv.toDataURL('image/jpeg', .85).split(',')[1] };
}

/* ── la pantalla ── */
export function iniciarMazos(h){
  const { capa, cerrarCapa, ico, esc, brindis, tono, SON, sumarXP } = h;
  let mazos = leerMazos();
  const guardar = () => guardarMazos(mazos);

  function abrir(){
    mazos = leerMazos();
    const c = capa('academia mazos');
    const hoy = dia();
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Cerrar">${ico('x')}</button><div style="flex:1"></div></div>
      <div class="cuerpo entra"><div class="acad-cab"><div class="marca-carymo"><b>TARJETAS</b><span>CARYMO</span></div>
        <h1>Tus tarjetas</h1><p>Escribe lo que quieres memorizar y repásalo un ratito al día.</p></div>
        <div class="mz-lista">${mazos.length ? mazos.map((m) => { const n = paraHoy(m, hoy).length;
          return `<button class="mz-mazo" data-mazo="${m.id}"><span class="acad-ico">${ico('layers')}</span><span class="mz-txt"><b>${esc(m.nombre)}</b><small>${m.tarjetas.length} ${m.tarjetas.length === 1 ? 'tarjeta' : 'tarjetas'}</small></span>${n ? `<span class="mz-toca">${n} hoy</span>` : `<span class="mz-listo">${ico('circle-check')}</span>`}</button>`; }).join('')
          : '<p class="mz-vacio">Todavía no tienes tarjetas. Arma tu primer mazo: vocabulario, fechas, fórmulas…</p>'}</div>
        <button class="bt fuerte ancho" data-nuevo>${ico('plus')}Nuevo mazo</button></div>`;
    c.addEventListener('click', (e) => {
      if(e.target.closest('[data-cerrar]')){ cerrarCapa(); return; }
      if(e.target.closest('[data-nuevo]')){ nuevoMazo(); return; }
      const b = e.target.closest('[data-mazo]'); if(b) verMazo(b.dataset.mazo);
    });
  }
  function nuevoMazo(){
    const hj = h.hoja('Nuevo mazo', `<label class="seccion-t" for="mzNom" style="display:block;margin-top:0">Nombre</label><input class="campo" id="mzNom" maxlength="60" placeholder="Ej. Verbos en inglés">
      <button class="bt fuerte ancho" style="margin-top:14px" id="mzCrear">Crear</button>`);
    hj.querySelector('#mzCrear').addEventListener('click', () => {
      const nombre = hj.querySelector('#mzNom').value.trim(); if(!nombre){ hj.querySelector('#mzNom').focus(); return; }
      const m = { id: nuevoId(), nombre, tarjetas: [] }; mazos.push(m); guardar(); h.cerrarHoja(); verMazo(m.id);
    });
  }
  function verMazo(id){
    const m = mazos.find((x) => x.id === id); if(!m) return abrir();
    const c = capa('academia mazos'), n = paraHoy(m).length;
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-volver aria-label="Atrás">${ico('arrow-left')}</button><div style="flex:1"></div><button class="bt redondo fantasma" data-borrar aria-label="Borrar mazo">${ico('trash')}</button></div>
      <div class="cuerpo entra"><h1 class="mz-titulo">${esc(m.nombre)}</h1>
        <button class="bt fuerte ancho" data-repasar ${n ? '' : 'disabled'}>${ico('layers')}${n ? `Repasar (${n})` : 'Al día'}</button>
        <div class="seccion-t">Agregar</div>
        <div class="mz-form"><input class="campo" id="mzF" maxlength="200" placeholder="Frente (la pregunta)"><textarea class="campo" id="mzR" maxlength="400" placeholder="Reverso (la respuesta)"></textarea>
          <button class="bt ancho" id="mzAgregar">${ico('plus')}Agregar tarjeta</button>
          <details class="mz-pegar"><summary>Pegar una lista</summary><p>Una por renglón: <b>frente - reverso</b></p><textarea class="campo" id="mzLista" placeholder="dog - perro&#10;cat - gato"></textarea><button class="bt ancho" id="mzPegar">Agregar la lista</button></details>
          ${h.ia ? `<details class="mz-pegar mz-ia"><summary>${ico('sparkles')}Con IA</summary><textarea class="campo" id="mzTexto" maxlength="6000" placeholder="Pega tus apuntes o escribe un tema"></textarea>
            <div class="mz-ia-bots"><button class="bt ancho" id="mzIa">${ico('sparkles')}Crear</button><label class="bt ancho" id="mzFotoBt">${ico('camera')}Foto<input type="file" accept="image/*" id="mzFoto" hidden></label></div></details>` : ''}</div>
        <div class="seccion-t">${m.tarjetas.length} ${m.tarjetas.length === 1 ? 'tarjeta' : 'tarjetas'}</div>
        <div class="mz-tarjetas">${m.tarjetas.map((t) => `<div class="mz-t"><b>${esc(t.frente)}</b><span>${esc(t.reverso)}</span><button data-quitar="${t.id}" aria-label="Quitar ${esc(t.frente)}">${ico('x')}</button></div>`).join('')}</div></div>`;
    const agregar = (lista) => { if(!lista.length) return false; m.tarjetas.push(...lista); guardar(); verMazo(m.id); return true; };
    c.querySelector('#mzAgregar').addEventListener('click', () => {
      const f = c.querySelector('#mzF').value, r = c.querySelector('#mzR').value;
      if(!f.trim()){ c.querySelector('#mzF').focus(); return; } if(!r.trim()){ c.querySelector('#mzR').focus(); return; }
      agregar([tarjeta(f, r)]); tono(SON.toque); });
    c.querySelector('#mzPegar').addEventListener('click', () => { const l = leerLista(c.querySelector('#mzLista').value);
      if(agregar(l)) brindis(`${l.length} ${l.length === 1 ? 'tarjeta agregada' : 'tarjetas agregadas'}`, '', 'layers'); else brindis('Escribe una por renglón: frente - reverso', 'vino', 'layers'); });
    /* con IA: texto o foto → tarjetas al mazo */
    let ocupado = false;
    async function conIA(texto, imagenes = []){
      if(ocupado) return; ocupado = true;
      const bt = c.querySelector('#mzIa'), antes = bt.innerHTML; bt.disabled = true; c.querySelector('#mzFotoBt').classList.add('apagado'); bt.textContent = 'Creando…';
      try{
        const l = await h.ia({ sistema: SISTEMA_TARJETAS, texto: `Mazo: ${m.nombre}\n\n${texto || 'Arma las tarjetas con la foto de mis apuntes.'}`, imagenes, tope: 4000, revisar: revisarTarjetas });
        const nuevas = l.filter((t) => !m.tarjetas.some((x) => x.frente.toLowerCase() === t.frente.toLowerCase()));
        if(agregar(nuevas)){ brindis(`${nuevas.length} ${nuevas.length === 1 ? 'tarjeta nueva' : 'tarjetas nuevas'}`, '', 'sparkles'); tono(SON.ding); }
        else brindis('Ya tenías esas tarjetas', '', 'layers');
      }catch(err){ brindis(err.message || 'La IA no contestó', 'vino', 'x'); if(c.isConnected && c.querySelector('#mzIa')){ bt.disabled = false; bt.innerHTML = antes; c.querySelector('#mzFotoBt').classList.remove('apagado'); } }
      finally{ ocupado = false; }
    }
    c.querySelector('#mzIa')?.addEventListener('click', () => { const t = c.querySelector('#mzTexto').value.trim(); if(!t){ c.querySelector('#mzTexto').focus(); return; } conIA(t); });
    c.querySelector('#mzFoto')?.addEventListener('change', async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if(!f) return;
      const img = await fotoChica(f); if(!img){ brindis('No pude abrir esa foto', 'vino', 'x'); return; } conIA(c.querySelector('#mzTexto').value.trim(), [img]); });
    c.addEventListener('click', (e) => {
      if(e.target.closest('[data-volver]')){ abrir(); return; }
      if(e.target.closest('[data-repasar]')){ repasar(m); return; }
      const q = e.target.closest('[data-quitar]'); if(q){ m.tarjetas = m.tarjetas.filter((t) => t.id !== q.dataset.quitar); guardar(); q.closest('.mz-t').remove(); return; }
      const bo = e.target.closest('[data-borrar]');
      if(bo){ if(bo.dataset.seguro){ mazos = mazos.filter((x) => x !== m); guardar(); brindis('Mazo borrado', '', 'trash'); abrir(); }
        else { bo.dataset.seguro = '1'; brindis('Toca otra vez para borrar el mazo', 'vino', 'trash'); setTimeout(() => { delete bo.dataset.seguro; }, 3000); } }
    });
  }
  /* el repaso: una sola tarjeta (el mismo nodo) que se voltea; las falladas vuelven al final de la tanda */
  function repasar(m){
    const cola = paraHoy(m).slice(0, 30), fallo = new Set(); let k = 0, bien = 0;
    const c = capa('academia mazos');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-volver aria-label="Terminar">${ico('x')}</button><div class="mz-cuenta" id="mzCuenta"></div></div>
      <div class="cuerpo"><button class="mz-carta" id="mzCarta" aria-live="polite"><span class="mz-cara mz-frente" id="mzFr"></span><span class="mz-cara mz-reves" id="mzRe"></span></button>
        <p class="mz-pista" id="mzPista">Toca para voltear</p>
        <div class="mz-botones" id="mzBots" hidden><button class="bt ancho" data-mal>No me la sabía</button><button class="bt fuerte ancho" data-bien>Me la sabía</button></div></div>`;
    const carta = c.querySelector('#mzCarta'), bots = c.querySelector('#mzBots'), pista = c.querySelector('#mzPista');
    function mostrar(){
      if(k >= cola.length) return fin();
      const t = cola[k]; carta.classList.remove('volteada'); c.querySelector('#mzFr').textContent = t.frente; c.querySelector('#mzRe').textContent = t.reverso;
      bots.hidden = true; pista.hidden = false; c.querySelector('#mzCuenta').textContent = `${k + 1} de ${cola.length}`;
    }
    function fin(){
      guardar(); if(bien && sumarXP) sumarXP(Math.min(30, bien * 2), 'Tarjetas: ' + m.nombre);
      c.querySelector('.cuerpo').innerHTML = `<div class="mz-fin entra"><span class="acad-ico">${ico('circle-check')}</span><h1>¡Listo!</h1><p>${bien} de ${cola.length - fallo.size} a la primera. Las que fallaste vuelven mañana.</p><button class="bt fuerte ancho" data-volver>Terminar</button></div>`;
      tono(SON.ding);
    }
    carta.addEventListener('click', () => { if(k >= cola.length) return; carta.classList.toggle('volteada'); if(carta.classList.contains('volteada')){ bots.hidden = false; pista.hidden = true; } tono(SON.toque); });
    c.addEventListener('click', (e) => {
      if(e.target.closest('[data-volver]')){ guardar(); verMazo(m.id); return; }
      const sabia = e.target.closest('[data-bien]') ? true : e.target.closest('[data-mal]') ? false : null; if(sabia === null) return;
      const t = cola[k];
      if(!fallo.has(t.id)){ calificar(t, sabia); if(sabia) bien++; }
      if(!sabia && !fallo.has(t.id)){ fallo.add(t.id); cola.push(t); }   /* la fallada vuelve al final de la tanda (ya quedó para mañana) */
      k++; mostrar();
    });
    mostrar();
  }
  return { abrir };
}
