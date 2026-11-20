/* CARYMO · LA PIZARRA QUE CORRIGE (lista de herramientas de Carlos, #116: «pizarra que corrige»).
   Resuelves un ejercicio a mano en una pizarra (el lápiz de los apuntes, trazo.js) y la IA mira TU procedimiento: lee
   cada renglón, dice cuál está bien y cuál no, y ENCIERRA EN ROJO el primer error sobre la misma pizarra, en una capa
   aparte que no se manda la siguiente vez ni se borra con tu trazo. Primero da una pista para que lo corrijas tú; el
   resultado correcto se destapa sólo si lo pides (lo pedagógico de CARYMO: piensa, luego compara).
   La cuenta y la limpieza viven aquí (se prueban en Node); la pantalla, en `iniciarCorrige`.
   Cero parpadeo (regla 13): la pizarra se crea una vez; revisar sólo cambia el bloque del resultado y la capa roja. */
import { crearLienzoDibujo, PINCELES } from './trazo.js';

const corta = (t, n) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (x, d) => { const n = Number(x); return Number.isFinite(n) ? n : d; };

export const SISTEMA_CORRIGE = (tutor) => `Eres un tutor ${tutor}. Ves la imagen de una pizarra donde un alumno resolvió un ejercicio
a mano (y, si viene, el enunciado). Revisa SU procedimiento renglón por renglón; no lo resuelvas por él de entrada.
Español de México, frases cortas. Contesta SÓLO JSON:
{"veredicto":"bien|casi|mal","resumen":"una frase","pasos":[{"lee":"lo que escribió en ese renglón","ok":true,"nota":"por qué está bien o qué falló"}],
"fallo":{"paso":2,"zona":{"x":0.1,"y":0.4,"w":0.6,"h":0.1}},"pista":"una pista para que él mismo lo corrija, SIN dar el resultado","correcto":"el resultado correcto"}
"zona" es el rectángulo del primer error en la imagen, de 0 a 1 (x, y = esquina de arriba a la izquierda). Sin errores, "fallo": null.
Si no se lee nada o no es un ejercicio, contesta {"ilegible":"qué pasó"}.`;

/** limpia lo que arma la IA; truena si no sirve (y se pide otra vez) */
export function revisarCorrige(j){
  const pasosCrudos = Array.isArray(j?.pasos) ? j.pasos : [];
  if(j && j.ilegible && !pasosCrudos.length){ const e = new Error(corta(j.ilegible, 160) || 'No alcancé a leer tu pizarra.'); e.sinReintento = true; throw e; }
  const pasos = pasosCrudos.map((p) => ({ lee: corta(p?.lee, 200), ok: p?.ok !== false && p?.ok !== 'false', nota: corta(p?.nota, 300) })).filter((p) => p.lee).slice(0, 12);
  if(!pasos.length) throw new Error('La IA no leyó tu procedimiento.');
  const malos = pasos.filter((p) => !p.ok).length;
  const veredicto = ['bien', 'casi', 'mal'].includes(j.veredicto) ? j.veredicto : !malos ? 'bien' : malos === 1 ? 'casi' : 'mal';
  let fallo = null;
  if(j.fallo && typeof j.fallo === 'object'){
    const z = j.fallo.zona || {};
    const w = lim(num(z.w, 0), .04, 1), h = lim(num(z.h, 0), .03, 1);
    const zona = Number.isFinite(Number(z.x)) && Number.isFinite(Number(z.y)) ? { x: lim(num(z.x, 0), 0, 1 - w), y: lim(num(z.y, 0), 0, 1 - h), w, h } : null;
    const paso = lim(Math.round(num(j.fallo.paso, 0)), 0, pasos.length);
    fallo = { paso, zona };
  }
  /* si la IA dice «bien» pero marcó renglones malos, manda lo que ve en los renglones */
  const v = veredicto === 'bien' && malos ? 'casi' : veredicto;
  return { veredicto: v, resumen: corta(j.resumen, 300), pasos, fallo: v === 'bien' ? null : fallo,
    pista: corta(j.pista, 400), correcto: corta(j.correcto, 300), cuando: Date.now() };
}

/** el contorno rojo, como lo encierra un maestro: una elipse un poco más grande que la zona */
export function elipseDe(zona, ancho, alto){
  const cx = (zona.x + zona.w / 2) * ancho, cy = (zona.y + zona.h / 2) * alto;
  return { cx, cy, rx: Math.max(40, zona.w * ancho / 2 + 26), ry: Math.max(30, zona.h * alto / 2 + 20) };
}

const TITULO = { bien: '¡Bien!', casi: 'Casi', mal: 'Revísalo' };
const ICONO = { bien: 'circle-check', casi: 'lightbulb', mal: 'circle-x' };

export function iniciarCorrige(h){
  const { capa, cerrarCapa, ico, esc, brindis, tono, SON, sumarXP } = h;
  const ANCHO = 1080, ALTO = 1200;

  function abrir(){
    const c = capa('academia corrige');
    c.innerHTML = `<div class="arriba"><button class="bt redondo fantasma" data-cerrar aria-label="Cerrar">${ico('x')}</button><div style="flex:1"></div></div>
      <div class="cuerpo entra"><div class="acad-cab"><div class="marca-carymo"><b>PIZARRA</b><span>CARYMO</span></div>
        <h1>Tu pizarra</h1><p>Resuélvelo aquí y te digo dónde vas.</p></div>
        <input class="campo" id="pcEnunciado" maxlength="400" placeholder="¿Qué ejercicio es? (opcional)">
        <div class="pc-tabla"><div class="pc-caja" id="pcCaja"></div></div>
        <div class="pc-herr" role="toolbar" aria-label="Pizarra">
          <button class="bt pc-h activo" data-h="pincel" aria-pressed="true">${ico('pencil')}Lápiz</button>
          <button class="bt pc-h" data-h="borrador" aria-pressed="false">${ico('eraser')}Borrar</button>
          <button class="bt redondo" data-deshacer aria-label="Deshacer">${ico('undo-2')}</button>
          <button class="bt redondo" data-limpiar aria-label="Limpiar la pizarra">${ico('trash')}</button>
        </div>
        <button class="bt fuerte ancho" id="pcRevisar">${ico('check-check')}Revisar</button>
        <div class="pc-res" id="pcRes" aria-live="polite"></div></div>`;
    const caja = c.querySelector('#pcCaja'), res = c.querySelector('#pcRes'), bt = c.querySelector('#pcRevisar');
    const lz = crearLienzoDibujo(caja, { ancho: ANCHO, alto: ALTO, fondo: 'cuadros' });
    lz.pincel = { ...(PINCELES.find((p) => p.id === 'pluma') || PINCELES[0]), tam: 9 };
    lz.color = '#2A1240';
    /* la capa roja va ARRIBA, bloqueada: el dedo nunca pinta en ella y no viaja a la IA */
    const roja = lz.agregarCapa(); roja.nombre = 'Correcciones'; roja.bloqueada = true; lz.actual = 0;
    requestAnimationFrame(() => lz.ajustar());
    let escrito = false;   /* ¿hay algo tuyo en la pizarra? (borrar o limpiar no cuenta como escribir) */
    caja.addEventListener('pointerdown', () => { if(lz.herramienta === 'pincel') escrito = true; });
    let anim = 0;
    const limpiarRoja = () => { cancelAnimationFrame(anim); roja.hoja.getContext('2d').clearRect(0, 0, ANCHO, ALTO); lz.refrescar(); };
    function encerrar(zona){
      const k = roja.hoja.getContext('2d'), e = elipseDe(zona, ANCHO, ALTO), t0 = performance.now(), dura = 520;
      const paso = (t) => {
        const f = Math.min(1, (t - t0) / dura), a0 = -Math.PI * .65;
        k.clearRect(0, 0, ANCHO, ALTO); k.strokeStyle = '#E0264E'; k.lineWidth = 9; k.lineCap = 'round';
        k.beginPath(); k.ellipse(e.cx, e.cy, e.rx, e.ry, -.04, a0, a0 + Math.PI * 2.08 * (1 - (1 - f) ** 3)); k.stroke();
        lz.refrescar(); if(f < 1) anim = requestAnimationFrame(paso);
      };
      anim = requestAnimationFrame(paso);
    }
    c.querySelectorAll('.pc-h').forEach((b) => b.addEventListener('click', () => {
      lz.herramienta = b.dataset.h;
      c.querySelectorAll('.pc-h').forEach((x) => { const on = x === b; x.classList.toggle('activo', on); x.setAttribute('aria-pressed', String(on)); });
    }));
    c.querySelector('[data-deshacer]').addEventListener('click', () => { lz.actual = 0; lz.deshacer(); });
    c.querySelector('[data-limpiar]').addEventListener('click', () => { lz.actual = 0; lz.limpiarCapa(0); limpiarRoja(); escrito = false; if(res.firstChild) res.replaceChildren(); });
    c.querySelector('[data-cerrar]').addEventListener('click', () => { cancelAnimationFrame(anim); lz.destruir(); cerrarCapa(); });

    let ocupado = false;
    bt.addEventListener('click', async () => {
      if(ocupado) return;
      if(!escrito){ brindis('Escribe tu solución primero', 'vino', 'pencil'); return; }
      ocupado = true; const antes = bt.innerHTML; bt.textContent = 'Revisando…'; bt.classList.add('apagado'); bt.setAttribute('aria-disabled', 'true');
      try{
        roja.visible = false; const lienzo = lz.componer(.6); roja.visible = true;
        const data = lienzo.toDataURL('image/jpeg', .85).split(',')[1];
        const enun = c.querySelector('#pcEnunciado').value.trim();
        const r = await h.ia({ sistema: SISTEMA_CORRIGE(h.tutor ? h.tutor() : 'de preparatoria en México'), tope: 4000, revisar: revisarCorrige,
          imagenes: [{ mime: 'image/jpeg', data }], texto: enun ? `El ejercicio: ${enun}\nRevisa mi pizarra.` : 'Revisa mi pizarra.' });
        pintar(r);
      }catch(err){ brindis(err.message || 'La IA no contestó', 'vino', 'x'); }
      finally{ ocupado = false; if(bt.isConnected){ bt.innerHTML = antes; bt.classList.remove('apagado'); bt.removeAttribute('aria-disabled'); } }
    });

    function pintar(r){
      limpiarRoja();
      if(r.fallo?.zona) encerrar(r.fallo.zona);
      res.innerHTML = `<div class="pc-veredicto pc-${r.veredicto}">${ico(ICONO[r.veredicto])}<div><b>${TITULO[r.veredicto]}</b>${r.resumen ? `<p>${esc(r.resumen)}</p>` : ''}</div></div>
        <ol class="pc-pasos">${r.pasos.map((p, i) => `<li class="${p.ok ? 'pc-ok' : 'pc-mal'}${r.fallo?.paso === i + 1 ? ' pc-primero' : ''}"><span class="pc-marca">${ico(p.ok ? 'check' : 'x')}</span><span><b>${esc(p.lee)}</b>${p.nota ? `<small>${esc(p.nota)}</small>` : ''}</span></li>`).join('')}</ol>
        ${r.veredicto !== 'bien' && r.pista ? `<div class="pc-pista"><small>${ico('lightbulb')}Pista</small><p>${esc(r.pista)}</p></div>` : ''}
        ${r.correcto ? (r.veredicto === 'bien' ? `<div class="pc-correcto"><small>Resultado</small><p>${esc(r.correcto)}</p></div>` : `<button class="bt ancho" data-ver>${ico('eye')}Ver resultado</button>`) : ''}`;
      res.querySelector('[data-ver]')?.addEventListener('click', (e) => {
        const d = document.createElement('div'); d.className = 'pc-correcto'; d.innerHTML = `<small>Resultado</small><p>${esc(r.correcto)}</p>`;
        e.currentTarget.replaceWith(d);
      }, { once: true });
      if(r.veredicto === 'bien'){ sumarXP?.(8, 'Pizarra: bien resuelto'); tono(SON.ding); } else tono(SON.pop);
      /* se queda viendo la pizarra (con su círculo rojo) y el veredicto asoma debajo */
      c.querySelector('.pc-tabla')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    }
  }
  return { abrir };
}
