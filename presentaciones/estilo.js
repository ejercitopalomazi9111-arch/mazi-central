/* ══════════════════════════════════════════════════════════════════════════
   PRESENTACIONES · el estilo de un elemento, como en Canva
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «figuras con formas variadas y colores varios así como texturas,
   varios degradados en una sola figura, ajustar transparencia, escala,
   rotación… bajo una interfaz más dinámica y cómoda tipo Canva».

   Cuatro hojas que se abren desde la barra del elemento elegido:
   · RELLENO: color, degradado de hasta seis colores (lineal o radial, con
     ángulo), patrón de PowerPoint o textura en mosaico (las diez de la casa,
     una del banco o una tuya).
   · TRANSPARENCIA, GIRAR y TAMAÑO: una perilla. Mientras la mueves el
     elemento cambia en la lámina (sólo en pantalla); al soltarla se guarda,
     y es UN deshacer.
   Todo va al archivo como PowerPoint nativo (nucleo.js · ponerRelleno…).
   ═════════════════════════════════════════════════════════════════════════ */
import { fondoCss } from './vista.js';

export const TEXTURAS = [['madera', 'Madera'], ['marmol', 'Mármol'], ['concreto', 'Concreto'], ['papel', 'Papel'], ['piel', 'Piel'],
  ['metal', 'Metal'], ['ladrillo', 'Ladrillo'], ['azulejo', 'Azulejo'], ['tierra', 'Tierra'], ['tela', 'Tela']];
const urlTextura = (k) => new URL(`./texturas/${k}.jpg`, import.meta.url).href;

export function crearEstilo(U){
  const { h, $$, hoja, cerrar, aviso, segmento, aplicar, N, D, selectorColor, BANCO } = U;
  /* El elemento en la lámina grande, para la vista previa en vivo. */
  const enLamina = (cid) => $$(`#visor .lienzo [data-cid="${cid}"]`);
  const perilla = ({ min, max, paso = 1, valor, unidad = '', etiqueta }) => {
    const salida = h('output', { class: 'perilla-valor' }, `${valor}${unidad}`);
    const r = h('input', { type: 'range', min, max, step: paso, value: valor, 'aria-label': etiqueta, class: 'perilla' });
    r.addEventListener('input', () => { salida.textContent = `${r.value}${unidad}`; });
    return { r, nodo: h('label', { class: 'campo perilla-campo' }, h('span', { class: 'fila-perilla' }, h('span', {}, etiqueta), salida), r) };
  };

  /* ── RELLENO ── */
  function relleno(i, cid, alCambiar){
    const d = D();
    const pal = N.paletaTema(d);
    const tema = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'dk2', 'lt2'].map((k) => pal[k] && '#' + pal[k]).filter(Boolean);
    let tipo = 'degradado', color = tema[0] || '#AC27FF';
    let paradas = [{ color: '#FF512F' }, { color: '#F09819' }, { color: '#AC27FF' }], angulo = 90, forma = 'lineal';
    let patron = 'pct20', pColor = color, pFondo = '#FFFFFF';
    let textura = null, texturaMuestra = null, escala = 40, puesto = false;
    const muestra = h('div', { class: 'muestra-relleno', 'aria-hidden': 'true' });
    const zona = h('div');
    const conPos = () => paradas.map((p, k) => ({ ...p, pos: p.pos ?? (k / Math.max(1, paradas.length - 1)) * 100 }));
    /* Lo que se va a poner, en la forma que entiende la vista (para la muestra
       y para verlo ya en la lámina) y en la que entiende el núcleo. */
    const comoVista = () => tipo === 'solido' ? { color }
      : tipo === 'degradado' ? { degradado: conPos(), angulo: forma === 'radial' ? 90 : angulo, radial: forma === 'radial' }
      : tipo === 'patron' ? { patron, color: pColor, fondo: pFondo }
      : tipo === 'textura' ? (texturaMuestra ? { imagen: texturaMuestra, mosaico: escala / 100 } : { nada: true })
      : { nada: true };
    const previa = () => {
      const css = fondoCss(comoVista());
      muestra.style.background = css;
      for(const e of enLamina(cid)) e.style.background = css;
    };
    const pintaZona = () => {
      if(tipo === 'solido') zona.replaceChildren(selectorColor(color, (c) => { color = c; previa(); }, tema));
      else if(tipo === 'degradado'){
        const lista = h('div', { class: 'paradas' });
        const pintaParadas = () => {
          lista.replaceChildren(...paradas.map((p, k) => h('span', { class: 'parada' },
            h('input', { type: 'color', value: p.color.toLowerCase(), 'aria-label': `Color ${k + 1}`, on: { input: (e) => { p.color = e.target.value.toUpperCase(); previa(); } } }),
            paradas.length > 2 ? h('button', { class: 'quitar', type: 'button', 'aria-label': `Quitar el color ${k + 1}`, on: { click: () => { paradas.splice(k, 1); pintaParadas(); previa(); } } }, '✕') : null)),
          paradas.length < 6 ? h('button', { class: 'chip', type: 'button', 'data-mas-color': '', on: { click: () => { paradas.push({ color: paradas.at(-1).color }); paradas.forEach((x) => delete x.pos); pintaParadas(); previa(); } } }, '＋ Color') : null);
        };
        pintaParadas();
        const ang = perilla({ min: 0, max: 355, paso: 5, valor: angulo, unidad: '°', etiqueta: 'Dirección' });
        ang.r.addEventListener('input', () => { angulo = Number(ang.r.value); previa(); });
        const zonaAng = h('div', { hidden: forma === 'radial' }, ang.nodo);
        zona.replaceChildren(
          h('div', { class: 'degradados-listos' }, N.DEGRADADOS.map(([nom, cols]) => h('button', { type: 'button', class: 'degradado-listo', title: nom, 'aria-label': `Degradado ${nom}`,
            style: { background: `linear-gradient(90deg, ${cols.join(', ')})` }, on: { click: () => { paradas = cols.map((c) => ({ color: c })); pintaParadas(); previa(); } } }))),
          h('p', { class: 'nota' }, 'Toca uno armado o arma el tuyo: hasta seis colores en la misma figura.'),
          lista,
          segmento([['lineal', 'En línea'], ['radial', 'Desde el centro']], forma, (v) => { forma = v; zonaAng.hidden = v === 'radial'; previa(); }),
          zonaAng);
      }else if(tipo === 'patron'){
        const rej = h('div', { class: 'patrones' });
        const pintaRej = () => rej.replaceChildren(...N.PATRONES.map(([k, nom]) => h('button', { type: 'button', class: 'patron', 'data-patron': k, 'aria-pressed': String(k === patron), title: nom, 'aria-label': `Patrón ${nom}`,
          style: { background: fondoCss({ patron: k, color: pColor, fondo: pFondo }) }, on: { click: () => { patron = k; pintaRej(); previa(); } } })));
        pintaRej();
        zona.replaceChildren(rej, h('div', { class: 'fila dos' },
          h('label', { class: 'campo' }, 'Dibujo', h('input', { type: 'color', value: pColor.toLowerCase(), on: { input: (e) => { pColor = e.target.value.toUpperCase(); pintaRej(); previa(); } } })),
          h('label', { class: 'campo' }, 'Fondo', h('input', { type: 'color', value: pFondo.toLowerCase(), on: { input: (e) => { pFondo = e.target.value.toUpperCase(); pintaRej(); previa(); } } }))));
      }else if(tipo === 'textura'){
        const esc = perilla({ min: 10, max: 100, paso: 5, valor: escala, unidad: '%', etiqueta: 'Tamaño del dibujo' });
        esc.r.addEventListener('input', () => { escala = Number(esc.r.value); previa(); });
        const elegir = async (bytes, mime) => { textura = { bytes, mime }; texturaMuestra = URL.createObjectURL(new Blob([bytes], { type: mime })); previa(); };
        const subir = h('input', { class: 'oculto', type: 'file', accept: 'image/*', on: { change: async () => { const f = subir.files[0]; if(f) await elegir(new Uint8Array(await f.arrayBuffer()), f.type || 'image/jpeg'); } } });
        const delBanco = h('div');
        zona.replaceChildren(
          h('div', { class: 'texturas' }, TEXTURAS.map(([k, nom]) => h('button', { type: 'button', class: 'textura', 'data-textura': k, title: nom, on: { click: async (e) => {
            $$('.textura', e.currentTarget.parentNode).forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
            try{ const r = await fetch(urlTextura(k)); await elegir(new Uint8Array(await r.arrayBuffer()), 'image/jpeg'); }catch(err){ aviso('No se pudo abrir esa textura.', 'mal'); }
          } } }, h('img', { src: urlTextura(k), alt: '', loading: 'lazy' }), h('span', {}, nom)))),
          h('div', { class: 'fila' },
            h('label', { class: 'btn' }, 'Subir la mía', subir),
            BANCO ? h('button', { class: 'btn', type: 'button', on: { click: () => BANCO.elegir(delBanco, (b) => elegir(b.bytes || b, b.mime || 'image/jpeg')) } }, 'Del banco') : null),
          delBanco,
          esc.nodo,
          h('p', { class: 'nota' }, 'Texturas libres de ambientCG (CC0). Se repiten en mosaico dentro de la figura.'));
      }
      if(tipo !== 'nada') zona.append(h('button', { class: 'chip', type: 'button', style: { marginTop: '10px' }, on: { click: () => { tipo = 'nada'; pintaZona(); } } }, 'Sin relleno'));
      else zona.replaceChildren(h('p', { class: 'nota' }, 'La figura queda sin relleno: sólo su borde y su texto. Toca otra pestaña para volver a rellenarla.'));
      previa();
    };
    const d0 = hoja('Relleno', [
      muestra,
      segmento([['solido', 'Color'], ['degradado', 'Degradado'], ['patron', 'Patrón'], ['textura', 'Textura']], tipo, (v) => { tipo = v; pintaZona(); }),
      zona,
      h('button', { class: 'btn primario ancho', type: 'button', 'data-poner-relleno': '', on: { click: async () => {
        if(tipo === 'textura' && !textura){ aviso('Primero elige una textura.', 'mal'); return; }
        const r = tipo === 'solido' ? { tipo, color } : tipo === 'degradado' ? { tipo, paradas: conPos(), angulo, forma }
          : tipo === 'patron' ? { tipo, patron, color: pColor, fondo: pFondo } : tipo === 'textura' ? { tipo, ...textura, escala: escala / 100 } : { tipo: 'nada' };
        puesto = true;
        cerrar('#hoja2');
        await aplicar('Relleno', () => N.ponerRelleno(d, i, cid, r), (n) => n ? 'Relleno puesto.' : 'A ese elemento no se le puede poner relleno.');
        alCambiar();
      } } }, 'Poner este relleno')], '#hoja2', { baja: true });
    // Si se cierra sin poner, la lámina vuelve a como estaba.
    d0.addEventListener('close', () => { if(!puesto) alCambiar(); }, { once: true });
    pintaZona();
  }

  /* ── las tres perillas ── */
  function perillaHoja({ titulo, i, cid, alCambiar, min, max, paso, valor, unidad, etiqueta, nota, rapidos = [], vivo, guardar, nombreOp }){
    const p = perilla({ min, max, paso, valor, unidad, etiqueta });
    let guardado = false, ultimo = valor;
    const confirmar = async (v) => {
      if(Number(v) === Number(ultimo)) return;
      ultimo = Number(v); guardado = true;
      await aplicar(nombreOp, () => guardar(Number(v)), null);
      alCambiar({ quedarse: true });   // la lámina se repinta con lo guardado
    };
    p.r.addEventListener('input', () => { for(const e of enLamina(cid)) vivo(e, Number(p.r.value)); });
    p.r.addEventListener('change', () => confirmar(p.r.value));
    const d0 = hoja(titulo, [
      p.nodo,
      rapidos.length ? h('div', { class: 'ejemplos' }, rapidos.map(([t, v]) => h('button', { class: 'chip', type: 'button', on: { click: () => {
        const nv = typeof v === 'function' ? v(Number(p.r.value)) : v;
        p.r.value = String(nv); p.r.dispatchEvent(new Event('input')); confirmar(nv);
      } } }, t))) : null,
      nota ? h('p', { class: 'nota' }, nota) : null,
      h('button', { class: 'btn primario ancho', type: 'button', on: { click: () => cerrar('#hoja2') } }, 'Listo')], '#hoja2', { baja: true });
    d0.addEventListener('close', () => { if(!guardado) alCambiar(); }, { once: true });
    return p.r;
  }
  function transparencia(i, cid, alCambiar){
    const d = D();
    const v = Math.round(N.transparenciaDe(d, i, cid) * 100);
    return perillaHoja({ titulo: 'Transparencia', i, cid, alCambiar, min: 0, max: 100, paso: 1, valor: v, unidad: '%', etiqueta: 'Se ve al',
      nota: '100 % es sólido; mientras más bajo, más se transparenta (relleno, borde, texto e imagen).',
      rapidos: [['100 %', 100], ['75 %', 75], ['50 %', 50], ['25 %', 25]],
      vivo: (e, x) => { e.style.opacity = String(x / 100); },
      guardar: (x) => N.ponerTransparencia(d, i, cid, x / 100), nombreOp: 'Transparencia' });
  }
  function girar(i, cid, alCambiar){
    const d = D();
    let g = Math.round(N.giroDe(d, i, cid)); if(g > 180) g -= 360;
    return perillaHoja({ titulo: 'Girar', i, cid, alCambiar, min: -180, max: 180, paso: 1, valor: g, unidad: '°', etiqueta: 'Giro',
      nota: 'También puedes girarlo con la manija redonda de arriba del elemento.',
      rapidos: [['↺ 15°', (x) => Math.max(-180, x - 15)], ['↻ 15°', (x) => Math.min(180, x + 15)], ['90°', 90], ['Derecho', 0]],
      vivo: (e, x) => { e.style.rotate = `${x - g}deg`; },
      guardar: (x) => { const r = N.girarForma(d, i, cid, x); g = x; return r; }, nombreOp: 'Girar' });
  }
  function tamano(i, cid, alCambiar){
    const d = D();
    let base = 100;
    return perillaHoja({ titulo: 'Tamaño', i, cid, alCambiar, min: 20, max: 300, paso: 5, valor: 100, unidad: '%', etiqueta: 'Tamaño',
      nota: 'Crece o se encoge desde su centro, sin deformarse.',
      rapidos: [['Mitad', 50], ['75 %', 75], ['125 %', 125], ['Doble', 200]],
      vivo: (e, x) => { e.style.scale = String(x / base); },
      guardar: (x) => { const r = N.escalarForma(d, i, cid, x / base); base = x; return r; }, nombreOp: 'Tamaño' });
  }
  return { relleno, transparencia, girar, tamano };
}
