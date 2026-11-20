/* CARYMO · TU ENSAYO (lista de herramientas de Carlos, #116: «ensayos»).
   Pegas o escribes tu texto (ensayo, resumen, reseña, reporte) y la IA lo revisa como lo haría una maestra con rúbrica:
   calificación, cuatro criterios con su nota, frases TUYAS marcadas con qué tienen (ortografía, claridad, argumento o algo
   bien hecho), un solo párrafo reescrito para que veas cómo se mejora, y qué hacer después.
   No te lo reescribe entero: el ensayo sigue siendo tuyo (lo pedagógico de CARYMO: primero haces, luego comparas).
   Las marcas se comprueban contra tu texto: si la IA «cita» algo que no escribiste, se tira (no se inventa nada).
   Los últimos 20 quedan en el teléfono (`carymo.ensayos`).
   Cero parpadeo (regla 13): tocar una marca sólo cambia clases; no se vuelve a pintar nada. */
const LLAVE = 'carymo.ensayos';
export const leerEnsayos = () => { try{ const x = JSON.parse(localStorage.getItem(LLAVE) || '[]'); return Array.isArray(x) ? x : []; }catch{ return []; } };
const guardarEnsayos = (l) => { try{ localStorage.setItem(LLAVE, JSON.stringify(l.slice(0, 20))); }catch{} };
const corta = (t, n) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const nota = (x) => { const n = Number(x); return Number.isFinite(n) ? Math.round(Math.max(0, Math.min(10, n)) * 10) / 10 : null; };
export const TIPOS_MARCA = { ortografia: 'Ortografía', claridad: 'Claridad', argumento: 'Argumento', bien: 'Bien hecho' };
export const MIN_LETRAS = 200;

export const SISTEMA_ENSAYO = (tutor) => `Eres un maestro ${tutor} que revisa textos escritos por alumnos (ensayo, resumen, reseña o reporte).
Revisa como con rúbrica, en español de México, con cariño pero sin regalar puntos. NO reescribas el texto completo: el alumno lo corrige.
Contesta SÓLO JSON:
{"titulo":"un título corto para el texto","tipo":"ensayo|resumen|reseña|reporte|otro","calificacion":0-10,"resumen":"una frase de cómo está",
"criterios":[{"nombre":"Ideas","puntos":0-10,"comentario":""},{"nombre":"Orden","puntos":0-10,"comentario":""},{"nombre":"Argumentos","puntos":0-10,"comentario":""},{"nombre":"Redacción","puntos":0-10,"comentario":""}],
"marcas":[{"frase":"copia EXACTA de 2 a 15 palabras del texto del alumno","tipo":"ortografia|claridad|argumento|bien","nota":"qué tiene y cómo arreglarlo, una frase"}],
"mejora":{"original":"copia EXACTA del párrafo más flojo","nuevo":"ese mismo párrafo mejorado, con las mismas ideas"},
"siguiente":["qué hacer primero","qué hacer después"]}
Entre 3 y 10 marcas, al menos una «bien». Las frases van copiadas letra por letra del texto, con sus mismos errores.`;

/** limpia lo que arma la IA y tira las citas que no están en el texto; truena si no sirve (y se pide otra vez) */
export function revisarEnsayo(j, texto){
  if(!j || typeof j !== 'object') throw new Error('La IA no armó la revisión.');
  const criterios = (Array.isArray(j.criterios) ? j.criterios : []).map((c) => ({ nombre: corta(c?.nombre, 30), puntos: nota(c?.puntos), comentario: corta(c?.comentario, 300) }))
    .filter((c) => c.nombre && c.puntos != null).slice(0, 6);
  if(!criterios.length) throw new Error('La IA no calificó los criterios.');
  const vistas = new Set();
  const marcas = (Array.isArray(j.marcas) ? j.marcas : []).map((m) => ({ frase: String(m?.frase ?? '').trim(), tipo: TIPOS_MARCA[m?.tipo] ? m.tipo : 'claridad', nota: corta(m?.nota, 260) }))
    .filter((m) => m.frase.length >= 3 && m.frase.length <= 220 && texto.includes(m.frase) && !vistas.has(m.frase) && vistas.add(m.frase)).slice(0, 12);
  const cal = nota(j.calificacion) ?? Math.round(criterios.reduce((s, c) => s + c.puntos, 0) / criterios.length * 10) / 10;
  const m = j.mejora && typeof j.mejora === 'object' ? { original: String(j.mejora.original ?? '').trim().slice(0, 1600), nuevo: String(j.mejora.nuevo ?? '').trim().slice(0, 2000) } : null;
  return { titulo: corta(j.titulo, 90) || 'Tu texto', tipo: corta(j.tipo, 20) || 'texto', calificacion: cal, resumen: corta(j.resumen, 240), criterios, marcas,
    mejora: m && m.original && m.nuevo && m.original !== m.nuevo ? m : null,
    siguiente: (Array.isArray(j.siguiente) ? j.siguiente : []).map((x) => corta(x, 200)).filter(Boolean).slice(0, 4) };
}

/** parte el texto en tramos: [{t, i}] con i = índice de marca (o -1); la primera aparición de cada frase, sin encimarse */
export function tramos(texto, marcas){
  const pos = marcas.map((m, i) => ({ i, a: texto.indexOf(m.frase), n: m.frase.length })).filter((p) => p.a >= 0).sort((x, y) => x.a - y.a);
  const out = []; let k = 0;
  for(const p of pos){ if(p.a < k) continue; if(p.a > k) out.push({ t: texto.slice(k, p.a), i: -1 }); out.push({ t: texto.slice(p.a, p.a + p.n), i: p.i }); k = p.a + p.n; }
  if(k < texto.length) out.push({ t: texto.slice(k), i: -1 });
  return out;
}

export function iniciarEnsayo(h){
  const { capa, cerrarCapa, ico, esc, brindis, tono, SON, sumarXP } = h;

  function abrir(){
    const lista = leerEnsayos(), c = capa('academia ensayo');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Cerrar">${ico('x')}</button><div style="flex:1"></div></div>
      <div class="cuerpo entra"><div class="acad-cab"><div class="marca-carymo"><b>ENSAYO</b><span>CARYMO</span></div>
        <h1>Tu ensayo</h1><p>Pégalo y te digo cómo va.</p></div>
        <textarea class="campo es-texto" id="esTexto" maxlength="12000" placeholder="Pega o escribe tu texto aquí"></textarea>
        <p class="es-cuenta" id="esCuenta">0 letras</p>
        <input class="campo" id="esPide" maxlength="300" placeholder="¿Qué te pidieron? (opcional)">
        <button class="bt fuerte ancho" id="esRevisar" style="margin-top:12px">${ico('feather')}Revisar</button>
        ${lista.length ? `<div class="seccion-t">Recientes</div><div class="mz-lista">${lista.map((e, i) => `<button class="mz-mazo" data-viejo="${i}"><span class="acad-ico">${ico('file-text')}</span><span class="mz-txt"><b>${esc(e.titulo)}</b><small>${esc(e.tipo)} · ${e.calificacion}/10</small></span>${ico('chevron-right')}</button>`).join('')}</div>` : ''}</div>`;
    const ta = c.querySelector('#esTexto'), cuenta = c.querySelector('#esCuenta'), bt = c.querySelector('#esRevisar');
    const contar = () => { const n = ta.value.trim().length; const t = n < MIN_LETRAS ? `${n} letras · mínimo ${MIN_LETRAS}` : `${n} letras`; if(cuenta.textContent !== t) cuenta.textContent = t; };
    ta.addEventListener('input', contar);
    let ocupado = false;
    bt.addEventListener('click', async () => {
      const texto = ta.value.trim(); if(ocupado) return;
      if(texto.length < MIN_LETRAS){ brindis(`Escribe al menos ${MIN_LETRAS} letras`, 'vino', 'x'); ta.focus(); return; }
      ocupado = true; const antes = bt.innerHTML; bt.textContent = 'Leyendo…'; bt.classList.add('apagado'); bt.setAttribute('aria-disabled', 'true');
      try{
        const pide = c.querySelector('#esPide').value.trim();
        const r = await h.ia({ sistema: SISTEMA_ENSAYO(h.tutor ? h.tutor() : 'de preparatoria en México'), tope: 5000, revisar: (j) => revisarEnsayo(j, texto),
          texto: (pide ? `Lo que le pidieron: ${pide}\n\n` : '') + `El texto del alumno:\n${texto}` });
        Object.assign(r, { texto, pide, cuando: Date.now() });
        guardarEnsayos([r, ...leerEnsayos()]);
        sumarXP?.(10, 'Ensayo: ' + r.titulo); tono(SON.ding);
        ver(r);
      }catch(err){ brindis(err.message || 'La IA no contestó', 'vino', 'x');
        if(bt.isConnected){ bt.innerHTML = antes; bt.classList.remove('apagado'); bt.removeAttribute('aria-disabled'); } }
      finally{ ocupado = false; }
    });
    c.addEventListener('click', (e) => {
      if(e.target.closest('[data-cerrar]')){ cerrarCapa(); return; }
      const v = e.target.closest('[data-viejo]'); if(v){ const r = leerEnsayos()[+v.dataset.viejo]; if(r) ver(r); }
    });
  }

  /* la revisión: calificación, criterios, tu texto con marcas que se tocan, el párrafo mejorado y qué sigue */
  function ver(r){
    const c = capa('academia ensayo');
    const color = r.calificacion >= 8 ? 'bien' : r.calificacion >= 6 ? 'medio' : 'bajo';
    const partes = tramos(r.texto, r.marcas);
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-volver aria-label="Atrás">${ico('arrow-left')}</button><div style="flex:1"></div></div>
      <div class="cuerpo entra"><p class="tr-materia">${esc(r.tipo)}</p><h1 class="mz-titulo">${esc(r.titulo)}</h1>
        <div class="es-cal es-${color}"><b>${r.calificacion}</b><span>/10</span><p>${esc(r.resumen)}</p></div>
        <div class="es-criterios">${r.criterios.map((k) => `<div class="es-crit"><div class="es-crit-cab"><b>${esc(k.nombre)}</b><span>${k.puntos}</span></div>
          <div class="es-barra"><i style="width:${k.puntos * 10}%"></i></div>${k.comentario ? `<p>${esc(k.comentario)}</p>` : ''}</div>`).join('')}</div>
        ${r.marcas.length ? `<div class="seccion-t">Tu texto</div><div class="es-leyenda">${Object.entries(TIPOS_MARCA).filter(([t]) => r.marcas.some((m) => m.tipo === t)).map(([t, n]) => `<span class="es-m es-${t}">${n}</span>`).join('')}</div>
        <div class="es-doc" id="esDoc">${partes.map((p) => p.i < 0 ? esc(p.t) : `<mark class="es-m es-${r.marcas[p.i].tipo}" data-m="${p.i}" tabindex="0">${esc(p.t)}</mark>`).join('')}</div>
        <ol class="es-notas" id="esNotas">${r.marcas.map((m, i) => `<li class="es-nota es-${m.tipo}" data-n="${i}"><b>${TIPOS_MARCA[m.tipo]}</b> «${esc(m.frase)}» — ${esc(m.nota)}</li>`).join('')}</ol>` : ''}
        ${r.mejora ? `<div class="seccion-t">Un párrafo, mejorado</div><div class="es-mejora"><div><small>Así estaba</small><p>${esc(r.mejora.original)}</p></div><div class="es-nuevo"><small>Así queda mejor</small><p>${esc(r.mejora.nuevo)}</p></div></div>` : ''}
        ${r.siguiente.length ? `<div class="seccion-t">Qué sigue</div><ol class="tr-cuidado">${r.siguiente.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
        <button class="bt fuerte ancho" data-otro style="margin-top:18px">${ico('feather')}Otro texto</button></div>`;
    /* tocar una marca enciende su nota (y al revés); sólo cambian clases */
    let activa = -1;
    const encender = (i) => {
      c.querySelectorAll('.es-activa').forEach((x) => x.classList.remove('es-activa'));
      if(i === activa){ activa = -1; return; } activa = i;
      c.querySelector(`[data-m="${i}"]`)?.classList.add('es-activa'); const n = c.querySelector(`[data-n="${i}"]`); n?.classList.add('es-activa');
      n?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); tono(SON.toque);
    };
    c.addEventListener('click', (e) => {
      if(e.target.closest('[data-volver]') || e.target.closest('[data-otro]')){ abrir(); return; }
      const m = e.target.closest('[data-m]'); if(m){ encender(+m.dataset.m); return; }
      const n = e.target.closest('[data-n]'); if(n) encender(+n.dataset.n);
    });
    c.addEventListener('keydown', (e) => { const m = e.target.closest?.('[data-m]'); if(m && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); encender(+m.dataset.m); } });
  }
  return { abrir, ver };
}
