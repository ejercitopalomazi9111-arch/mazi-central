/* ══════════════════════════════════════════════════════════════════════════
   PIEZAS · lo que usan todas las pantallas, de los cuatro apartados
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace, RUTAS, APARTADOS } from './rutas.js';
import { icono } from './iconos.js';

export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Pesos mexicanos con separador de miles y sin centavos cuando son cero:
   «$1,240» se lee de un vistazo, «$1,240.00» obliga a leer dos veces. */
export const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-MX', {
  minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 });

export const quitaAcentos = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/* La pantalla con que arranca cada apartado: la primera suya del menú. */
export const inicioDe = (apartado) => RUTAS.find((r) => r.apartado === apartado && r.menu);

/* Estado de pantalla completa: vacío, error, en obra, sin permiso. Siempre con
   salida — una pantalla sin botón es un callejón. */
export function estado({ icono: ico = 'info', titulo, texto, extra = '', botones = '', error = false }){
  return `<div class="estado${error ? ' error' : ''}">
    <span class="circulo">${icono(ico)}</span>
    <h2>${esc(titulo)}</h2>
    ${texto ? `<p>${esc(texto)}</p>` : ''}
    ${extra}
    <div class="botones">${botones}</div>
  </div>`;
}

const botonRegresar = `<button class="boton secundario" data-atras>${icono('atras')}Regresar</button>`;

/* ── En obra: dice qué va a ser, no «próximamente» ─────────────────────── */
export function obra({ ruta }){
  const inicio = inicioDe(ruta.apartado);
  return { html: estado({
    icono: ruta.icono, titulo: ruta.titulo, texto: ruta.promesa,
    extra: `<span class="bloque">Se construye en el bloque ${ruta.bloque} de 14</span>`,
    botones: botonRegresar + (inicio && inicio.ruta !== ruta.ruta
      ? `<a class="boton principal" href="${enlace(inicio.ruta)}">Ir a ${esc(inicio.titulo)}</a>` : ''),
  }) };
}

/* ── No existe: tampoco es un callejón ────────────────────────────────── */
export function noexiste(){
  return { titulo: 'No encontrado', html: estado({
    icono: 'buscar', titulo: 'Esta página no existe', texto: 'Puede que el enlace esté viejo o incompleto.',
    botones: `<a class="boton principal" href="${enlace('/')}">Ir al inicio</a>`,
  }) };
}

/* ── Sin permiso: en un negocio real, el menú ya no enseña el apartado; esto
   es para quien llega con un enlace guardado. */
export function sinPermiso({ ruta }){
  const ap = APARTADOS.find((a) => a.id === ruta.apartado);
  return { titulo: ap?.nombre || 'Sin permiso', html: estado({
    icono: 'cuenta', titulo: 'Esta parte es del personal',
    texto: `«${ruta.titulo}» se abre con una cuenta de ${ap?.nombre.toLowerCase() || 'personal'}. Si trabajas aquí, pídele tu acceso a quien administra la tienda.`,
    botones: `<a class="boton principal" href="${enlace('/')}">Ir a la tienda</a>`,
  }) };
}

/* ── Error al cargar: dice qué pasó y deja reintentar ──────────────────── */
export function fallo(e){
  return { html: estado({
    icono: 'alerta', error: true, titulo: e?.message || 'Algo falló',
    texto: navigator.onLine === false ? 'Parece que no hay internet. Revisa la señal y vuelve a intentar.'
      : 'Puede ser la señal o algo de nuestro lado. Vuelve a intentar en un momento.',
    botones: `<button class="boton principal" data-reintentar>${icono('actualizar')}Volver a intentar</button>` + botonRegresar,
  }) };
}

export function cargando(){
  return `<div aria-busy="true" aria-label="Cargando">
    <div class="esqueleto" style="height:56px"></div>
    <div class="rejilla" style="margin-top:32px">${'<div class="esqueleto" style="aspect-ratio:3/4"></div>'.repeat(4)}</div>
  </div>`;
}

/* ── Hoja: sube desde abajo en teléfono, diálogo al centro en pantalla ancha.
   Devuelve el <dialog> ya abierto; al cerrarse se quita solo del documento.
   Esc y el velo la cierran (lo hace <dialog> por sí mismo, más el clic afuera). */
export function hoja({ titulo, cuerpo, clase = '' }){
  const d = document.createElement('dialog');
  d.className = 'hoja ' + clase;
  d.setAttribute('aria-label', titulo);
  d.innerHTML = `<div class="hoja-cabeza"><h2>${esc(titulo)}</h2>
      <button class="boton-ico" data-cerrar-hoja aria-label="Cerrar">${icono('cerrar')}</button></div>
    <div class="hoja-cuerpo">${cuerpo}</div>`;
  d.addEventListener('click', (e) => {
    if(e.target === d || e.target.closest('[data-cerrar-hoja]')) d.close();
  });
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  return d;
}

/* Números como los escribe la gente: «$1,250.50», «1250», « 80 ». */
export function numero(texto){
  const t = String(texto ?? '').replace(/[$\s,]/g, '');
  if(t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

const FECHA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const fecha = (d) => FECHA.format(new Date(d));

/* Descargar una tabla como CSV que Excel abre bien: BOM para los acentos y
   punto y coma NO — Excel en español de México lee coma. */
export function descargarCSV(nombre, filas){
  const celda = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const texto = '﻿' + filas.map((f) => f.map(celda).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  a.download = nombre;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
