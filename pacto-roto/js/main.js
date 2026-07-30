/* ============================================================
   EL PACTO ROTO — main.js
   Arranque: carga el catálogo de arte y despierta la portada.
   ============================================================ */
(async function () {
  try { await G.loadCatalog(); } catch (e) {}
  UI.initPortada();
  // precarga la lámina de portada si existe
  const c = G.art('circulo_magico');
  if (c) { const img = new Image(); img.src = c.src; }
  // aviso suave si no hay oráculo configurado
  if (!NARR.hasLLM()) {
    // el juego corre igual; solo lo notamos en consola
    console.log('Pacto Roto: modo sin datos (sin llave de oráculo). Config en ⚙.');
  }
  window.addEventListener('error', (e) => { console.warn('err', e.message); });
})();
