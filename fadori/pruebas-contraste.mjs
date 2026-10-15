#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LOS AVISOS SE LEEN EN CLARO Y EN OSCURO (15 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Salió grabando el comercial en modo oscuro: «Ya están preparando tu
   pedido» venía en crema sobre crema. El fondo era `var(--cafe)`, que en
   oscuro se invierte (es la TINTA del tema), y la letra blanca se quedaba.
   La misma pareja estaba en el tostón y en la etiqueta de «agotado».

   Se pinta cada aviso de verdad con su clase, en los dos temas, y se mide el
   contraste de la letra contra el fondo que el navegador calculó: 4.5 o más.

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-contraste.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
const { ok, fallas, aparato, cerrar } = await abrirMesa('contraste');

const AVISOS = [
  ['aviso grande «preparando»', '<div class="alerta-grande cambio sale"><b>Ya están preparando tu pedido</b><span>Turno 4</span></div>', '.alerta-grande b'],
  ['aviso grande «listo»',      '<div class="alerta-grande listo sale"><b>¡Tu pedido ya está!</b></div>', '.alerta-grande b'],
  ['aviso grande «se acabó»',   '<div class="alerta-grande falta sale"><b>Se acabó</b></div>', '.alerta-grande b'],
  ['tostón',                    '<div class="toston vivo">Listo, lo agregaste</div>', '.toston'],
  ['etiqueta «agotado»',        '<div class="plato" style="position:relative"><span class="marca-esq agotado">Agotado</span></div>', '.marca-esq'],
];

for(const tema of ['claro', 'oscuro']){
  console.log('\n· tema ' + tema);
  const pg = await aparato('/fadori/', { tema });
  await pg.waitForFunction(() => window.FADORI);
  ok('el <html> trae data-tema=' + tema, await pg.evaluate(() => document.documentElement.dataset.tema) === tema);
  for(const [nombre, html, sel] of AVISOS){
    const r = await pg.evaluate(([html, sel]) => {
      document.querySelectorAll('.prueba-contraste').forEach(e => e.remove());
      const caja = document.createElement('div'); caja.className = 'prueba-contraste'; caja.innerHTML = html;
      document.body.appendChild(caja);
      const el = caja.querySelector(sel);
      const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]) => { const f = v => (v /= 255) <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      /* el fondo es el del primer ancestro que pinta uno */
      let n = el, fondo = null;
      while(n && n !== document.documentElement){ const c = rgb(getComputedStyle(n).backgroundColor); if(c.length >= 3 && (c[3] === undefined || c[3] > .5)){ fondo = c; break; } n = n.parentElement; }
      const letra = rgb(getComputedStyle(el).color);
      if(!fondo) return { c: 0, letra: letra.join(','), fondo: 'ninguno' };
      const a = lum(letra), b = lum(fondo);
      return { c: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), letra: letra.slice(0, 3).join(','), fondo: fondo.slice(0, 3).join(',') };
    }, [html, sel]);
    ok(nombre + ' se lee (' + r.c.toFixed(2) + ':1)', r.c >= 4.5, 'letra ' + r.letra + ' sobre ' + r.fondo);
  }
  await pg.context().close();
}

await cerrar();
console.log(fallas.length ? '\n✗ ' + fallas.length + ' fallan' : '\n✓ todo pasa');
process.exit(fallas.length ? 1 : 0);
