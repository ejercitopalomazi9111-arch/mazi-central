/* CARYMO · TU TAREA (lista de herramientas de Carlos, #116: «foto de tarea resuelta»).
   Le tomas foto a un ejercicio (o lo escribes) y la IA te lo explica PASO A PASO. No suelta la respuesta de golpe: cada
   paso se destapa cuando tú quieras (como dice lo pedagógico de CARYMO: primero piensa, luego compara), y al final viene
   el resultado, en qué se equivoca la gente y un ejercicio PARECIDO para practicar con la respuesta escondida.
   Las últimas 20 tareas quedan en el teléfono (`carymo.tareas`) para volver a verlas.
   Cero parpadeo (regla 13): destapar un paso AGREGA su nodo; no se vuelve a pintar la lista. */
const LLAVE = 'carymo.tareas';
export const leerTareas = () => { try{ const x = JSON.parse(localStorage.getItem(LLAVE) || '[]'); return Array.isArray(x) ? x : []; }catch{ return []; } };
const guardarTareas = (l) => { try{ localStorage.setItem(LLAVE, JSON.stringify(l.slice(0, 20))); }catch{} };
const corta = (t, n) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
/* «1.», «Paso 2:», «(3)» al principio: el número ya lo pone la pantalla */
const sinNumero = (t) => corta(t, 600).replace(/^(?:paso\s*)?\(?\d{1,2}\s*[.):\-–]\s*/i, '');

export const SISTEMA_TAREA = (tutor) => `Eres un tutor ${tutor}. Te mandan un ejercicio de tarea (foto o texto).
Explícalo PASO A PASO para que el alumno ENTIENDA y pueda hacer uno igual solo: cada paso dice qué se hace y por qué, sin saltarte cuentas.
Escribe en español de México, frases cortas y claras. Fórmulas en texto plano (x^2, raíz de 9, 3/4).
No inventes datos que no se vean. Si la foto no se lee o no es un ejercicio, contesta {"error":"qué pasó en una frase"}.
Contesta SÓLO JSON:
{"materia":"","tema":"","enunciado":"lo que pide el ejercicio, con sus datos","pasos":[{"titulo":"","explica":""}],"resultado":"la respuesta final","cuidado":["error común 1","error común 2"],"parecido":{"enunciado":"un ejercicio parecido con otros números","respuesta":"su respuesta"}}
Entre 2 y 8 pasos. Los títulos SIN número.`;

/** limpia lo que arma la IA; truena si no sirve (y se pide otra vez) */
export function revisarTarea(j){
  if(j && j.error && !(j.pasos && j.pasos.length)) { const e = new Error(corta(j.error, 160) || 'No pude leer el ejercicio.'); e.sinReintento = true; throw e; }
  const pasos = (Array.isArray(j?.pasos) ? j.pasos : []).map((p) => typeof p === 'string' ? { titulo: '', explica: corta(p, 900) } : { titulo: sinNumero(p?.titulo), explica: corta(p?.explica, 900) })
    .filter((p) => p.explica || p.titulo).slice(0, 10);
  if(!pasos.length) throw new Error('La IA no armó los pasos.');
  const par = j.parecido && typeof j.parecido === 'object' ? { enunciado: corta(j.parecido.enunciado, 500), respuesta: corta(j.parecido.respuesta, 300) } : null;
  return { materia: corta(j.materia, 60), tema: corta(j.tema, 90) || 'Tu ejercicio', enunciado: corta(j.enunciado, 900), pasos,
    resultado: corta(j.resultado, 500), cuidado: (Array.isArray(j.cuidado) ? j.cuidado : []).map((x) => corta(x, 240)).filter(Boolean).slice(0, 4),
    parecido: par && par.enunciado ? par : null };
}

/* la foto se achica antes de mandarla */
async function fotoChica(archivo){
  const img = await createImageBitmap(archivo).catch(() => null); if(!img) return null;
  const k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
  cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return { mime: 'image/jpeg', data: cv.toDataURL('image/jpeg', .85).split(',')[1] };
}

export function iniciarTarea(h){
  const { capa, cerrarCapa, ico, esc, brindis, tono, SON, sumarXP } = h;

  function abrir(){
    const lista = leerTareas(), c = capa('academia tarea');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Cerrar">${ico('x')}</button><div style="flex:1"></div></div>
      <div class="cuerpo entra"><div class="acad-cab"><div class="marca-carymo"><b>TAREA</b><span>CARYMO</span></div>
        <h1>Tu tarea</h1><p>Foto del ejercicio y te lo explico paso a paso.</p></div>
        <label class="bt fuerte ancho" id="trFotoBt">${ico('camera')}Foto<input type="file" accept="image/*" capture="environment" id="trFoto" hidden></label>
        <details class="mz-pegar tr-escribir"><summary>${ico('pencil')}Escribirlo</summary><textarea class="campo" id="trTexto" maxlength="3000" placeholder="Ej. Resuelve 2x + 5 = 17"></textarea>
          <button class="bt ancho" id="trExplicar">${ico('sparkles')}Explicar</button></details>
        <textarea class="campo tr-duda" id="trDuda" maxlength="400" placeholder="¿Qué no entiendes? (opcional)"></textarea>
        ${lista.length ? `<div class="seccion-t">Recientes</div><div class="mz-lista">${lista.map((t, i) => `<button class="mz-mazo" data-vieja="${i}"><span class="acad-ico">${ico('file-text')}</span><span class="mz-txt"><b>${esc(t.tema)}</b><small>${esc(t.materia || 'Tarea')} · ${t.pasos.length} pasos</small></span>${ico('chevron-right')}</button>`).join('')}</div>` : ''}</div>`;
    let ocupado = false;
    async function explicar(texto, imagenes = []){
      if(ocupado) return; ocupado = true;
      const bts = [c.querySelector('#trFotoBt'), c.querySelector('#trExplicar')];
      const antes = bts.map((b) => b.innerHTML); bts.forEach((b) => { b.classList.add('apagado'); b.setAttribute('aria-disabled', 'true'); });
      bts[imagenes.length ? 0 : 1].textContent = 'Leyendo…';
      try{
        const duda = c.querySelector('#trDuda').value.trim();
        const t = await h.ia({ sistema: SISTEMA_TAREA(h.tutor ? h.tutor() : 'de preparatoria en México'), imagenes, tope: 5000, revisar: revisarTarea,
          texto: (texto ? `El ejercicio:\n${texto}` : 'El ejercicio está en la foto.') + (duda ? `\n\nLo que no entiendo: ${duda}` : '') });
        t.cuando = Date.now();
        guardarTareas([t, ...leerTareas()]);
        sumarXP?.(10, 'Tarea: ' + t.tema); tono(SON.ding);
        ver(t);
      }catch(err){ brindis(err.message || 'La IA no contestó', 'vino', 'x');
        if(c.isConnected) bts.forEach((b, i) => { b.innerHTML = antes[i]; b.classList.remove('apagado'); b.removeAttribute('aria-disabled'); }); }
      finally{ ocupado = false; }
    }
    c.querySelector('#trFoto').addEventListener('change', async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if(!f) return;
      const img = await fotoChica(f); if(!img){ brindis('No pude abrir esa foto', 'vino', 'x'); return; } explicar('', [img]); });
    c.querySelector('#trExplicar').addEventListener('click', () => { const t = c.querySelector('#trTexto').value.trim(); if(!t){ c.querySelector('#trTexto').focus(); return; } explicar(t); });
    c.addEventListener('click', (e) => {
      if(e.target.closest('[data-cerrar]')){ cerrarCapa(); return; }
      const v = e.target.closest('[data-vieja]'); if(v){ const t = leerTareas()[+v.dataset.vieja]; if(t) ver(t, true); }
    });
  }

  /* la explicación: los pasos se destapan uno por uno (cada uno es un nodo nuevo; los de antes no se tocan) */
  function ver(t, todo = false){
    const c = capa('academia tarea');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-volver aria-label="Atrás">${ico('arrow-left')}</button><div class="mz-cuenta" id="trCuenta"></div></div>
      <div class="cuerpo entra"><p class="tr-materia">${esc(t.materia || 'Tarea')}</p><h1 class="mz-titulo">${esc(t.tema)}</h1>
        ${t.enunciado ? `<div class="tr-enunciado">${esc(t.enunciado)}</div>` : ''}
        <ol class="tr-pasos" id="trPasos"></ol>
        <button class="bt fuerte ancho" id="trSig">${ico('arrow-down')}Primer paso</button>
        <div id="trFinal"></div></div>`;
    const ol = c.querySelector('#trPasos'), sig = c.querySelector('#trSig'), cuenta = c.querySelector('#trCuenta');
    let k = 0;
    const pinta = () => { cuenta.textContent = k < t.pasos.length ? `${k} de ${t.pasos.length}` : 'Listo'; };
    function destapar(){
      if(k < t.pasos.length){
        const p = t.pasos[k], li = document.createElement('li'); li.className = 'tr-paso entra';
        li.innerHTML = `${p.titulo ? `<b>${esc(p.titulo)}</b>` : ''}<span>${esc(p.explica)}</span>`; ol.appendChild(li); k++;
        sig.innerHTML = k < t.pasos.length ? `${ico('arrow-down')}Siguiente paso` : `${ico('flag')}Ver resultado`;
        tono(SON.toque); pinta(); return;
      }
      sig.remove(); final(); pinta();
    }
    function final(){
      const f = c.querySelector('#trFinal');
      f.innerHTML = `${t.resultado ? `<div class="tr-resultado entra"><small>Resultado</small><b>${esc(t.resultado)}</b></div>` : ''}
        ${t.cuidado.length ? `<div class="seccion-t">Ojo con</div><ul class="tr-cuidado">${t.cuidado.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${t.parecido ? `<div class="seccion-t">Ahora tú</div><div class="tr-parecido"><p>${esc(t.parecido.enunciado)}</p>
          <button class="bt ancho" id="trVer">${ico('eye')}Ver respuesta</button><p class="tr-resp" id="trResp" hidden>${esc(t.parecido.respuesta)}</p></div>` : ''}
        <button class="bt fuerte ancho" data-otra style="margin-top:18px">${ico('camera')}Otra tarea</button>`;
      f.querySelector('#trVer')?.addEventListener('click', (e) => { f.querySelector('#trResp').hidden = false; e.currentTarget.remove(); tono(SON.toque); });
    }
    sig.addEventListener('click', destapar);
    c.addEventListener('click', (e) => { if(e.target.closest('[data-volver]') || e.target.closest('[data-otra]')) abrir(); });
    if(todo){ while(k < t.pasos.length) destapar(); destapar(); } else pinta();
  }
  return { abrir, ver };
}
