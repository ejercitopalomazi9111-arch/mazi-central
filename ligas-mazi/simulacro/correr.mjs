#!/usr/bin/env node
/* ============================================================================
   correr.mjs — EL SIMULACRO COMPLETO
   ----------------------------------------------------------------------------
   Las tres pasadas que pidió Carlos, en el orden que él dictó:

     1. Cuentas: liga, equipos, papás, jugadores, y visitantes que llegan por
        anuncio o por redes.
     2. Se define cómo van a ser los enfrentamientos.
     3. Los visitantes siguen una liga, ven qué partidos vienen y curiosean.
     4. Llega la notificación de que ya va a empezar.
     5. Algunos entran antes y ven las estadísticas GENERALES del equipo — o el
        mensaje de "es la primera vez que este equipo se enfrenta a otro usando
        la app" si el EQUIPO es nuevo (del equipo, no de la app).
     6. A la hora, ven el partido y ganan 5 puntos por minuto visto.
     7. Con esos puntos hay tarjeta de visitante y gachapón — para visitantes y
        para jugadores.
     8. Tienda: los puntos compran el ACCESO AL CÓDIGO, el precio en pesos se
        enseña aparte, y al canjearlo la liga descuenta una pieza. Todo detrás
        de una perilla.
     9. Las tres fases del torneo hasta el campeón y la tabla final con
        posición y puntaje.
    10. Se junta todo en un reporte para que lo revise el tribunal.

   PASADA 1 · una liga, todo el reparto.
   PASADA 2 · la MISMA gente, liga nueva: los equipos se reinscriben y las
              estadísticas y las cartas tienen que sobrevivir.
   PASADA 3 · DOS ligas a la vez: cada visitante escoge cuál ver, cada equipo
              se gestiona solo, y los papás con varios hijos los llevan en las
              dos.

   Uso:
     node ligas-mazi/simulacro/correr.mjs [--url http://127.0.0.1:8099/ligas-mazi/]
                                          [--muestra N]   (personas en la app)
                                          [--sin-app]     (sólo la temporada)
   ==========================================================================*/

import { writeFileSync } from 'node:fs';
import { armarReparto } from './personas.mjs';
import * as M from './mundo.mjs';
import { abrirApp, recorrerTodos, traducirLiga, juntar } from './app.mjs';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const bandera = (n) => process.argv.includes('--' + n);
const SITIO = arg('url', 'http://127.0.0.1:8099/ligas-mazi/');
const MUESTRA = Number(arg('muestra', 0)) || 0;      // 0 = todas
const SIN_APP = bandera('sin-app');

const linea = (s) => console.log(s);
const t0 = Date.now();

/* ══════════════════════════════════════════════════════════════════════════
   UNA PASADA COMPLETA
   ══════════════════════════════════════════════════════════════════════════ */
function correrTemporada({ nombre, reparto, semilla, historialPrevio, categoriasVisitante }){
  const liga = M.abrirLiga({ nombre, reparto, semilla, historialPrevio });
  M.armarCalendario(liga);

  // 3 · Los visitantes siguen la liga y escogen qué categorías les interesan.
  //     Nadie sigue nueve: se sigue lo de uno.
  const cats = liga.categorias.map(c => c.id);
  const visitantes = reparto.personas.filter(p => p.rol === 'publico');
  visitantes.forEach((p, i) => {
    M.seguirLiga(liga, p.id, { categorias: categoriasVisitante
      || [cats[i % cats.length], cats[(i + 3) % cats.length]] });
  });

  // 4-6 · Notificación, previa y partido. Las primeras previas se guardan para
  //       el reporte: ahí se comprueba lo de "primera vez" del EQUIPO.
  const previas = [];
  const regulares = liga.calendario.filter(p => p.fase === 'regular');
  regulares.forEach((p, i) => {
    if (i < 6) previas.push(M.previaDelPartido(liga, p));
    const aud = M.audiencia(liga, p, reparto.personas);
    M.jugarPartido(liga, p, { espectadores: aud });
  });

  // 7-8 · Gachapón y tienda, con TODOS los que alcanzan — no con uno de
  //       muestra: el punto era ver si la economía da o no da.
  const compras = { ok: 0, faltaron: 0, agotados: 0, canjes: 0, dobles: 0, apagada: 0 };
  const sobres = { visitantes: 0, jugadores: 0, sinSaldo: 0 };
  const productos = liga.tienda.productos.map(p => p.id);
  visitantes.forEach((v, i) => {
    const r = M.comprarCodigo(liga, v.id, productos[i % productos.length]);
    if (r.ok){
      compras.ok++;
      if (M.canjearCodigo(liga, r.codigo).ok) compras.canjes++;
      if (M.canjearCodigo(liga, r.codigo).ok) compras.dobles++;   // NO debe poder
    }
    else if (r.faltan) compras.faltaron++;
    else if (r.motivo === 'Agotado') compras.agotados++;
    const s = M.abrirSobre(liga, v.id);
    if (s.ok) sobres.visitantes++; else sobres.sinSaldo++;
  });
  // La perilla apagada tiene que negar la compra. Si no, la liga no manda.
  liga.perillas.tiendaPorPuntos = false;
  if (!M.comprarCodigo(liga, visitantes[0].id, productos[0]).ok) compras.apagada = 1;
  liga.perillas.tiendaPorPuntos = true;

  Object.keys(liga.jugadores).forEach(jid => {
    if (M.abrirSobre(liga, jid, { esJugador: true }).ok) sobres.jugadores++;
  });

  // 9 · Las tres fases hasta el campeón.
  const coronas = cats.map(c => M.liguilla(liga, c, { espectadores: [] })).filter(Boolean);

  return { liga, previas, compras, sobres, coronas, partidos: liga.calendario.length };
}

/* ══════════════════════════════════════════════════════════════════════════
   ARRANQUE
   ══════════════════════════════════════════════════════════════════════════ */
linea('\n══ SIMULACRO LIGAS MAZI ══');
const reparto = armarReparto();
const porRol = {};
reparto.personas.forEach(p => { porRol[p.rol] = (porRol[p.rol] || 0) + 1; });
linea(`Reparto: ${reparto.personas.length} personas · ${reparto.equipos.length} equipos`);
linea('  ' + Object.entries(porRol).map(([r, n]) => `${r}:${n}`).join(' · '));

const pasadas = [];

// ── PASADA 1 ────────────────────────────────────────────────────────────────
linea('\n── Pasada 1 · Copa Mazi Otoño ─────────────────────────────');
const p1 = correrTemporada({ nombre:'Copa Mazi Otoño', reparto, semilla: 9111 });
linea(`  ${p1.partidos} partidos jugados · ${p1.coronas.length} campeones`);
linea(`  previa del primer partido: "${p1.previas[0].local.mensaje}"`);
pasadas.push({ n:1, titulo:'Copa Mazi Otoño', ...p1 });

// ── PASADA 2 · misma gente, liga nueva ──────────────────────────────────────
linea('\n── Pasada 2 · Copa Mazi Invierno (misma gente, liga nueva) ─');
const hist = M.exportarHistorial(p1.liga);
const p2 = correrTemporada({ nombre:'Copa Mazi Invierno', reparto, semilla: 2222, historialPrevio: hist });
const sobrevive = p2.previas[0].local.nuevo === false;
linea(`  ${p2.partidos} partidos · previa ahora: "${p2.previas[0].local.mensaje}"`);
linea(`  ¿las estadísticas del equipo sobrevivieron el cambio de liga? ${sobrevive ? 'SÍ' : 'NO ← BUG'}`);
pasadas.push({ n:2, titulo:'Copa Mazi Invierno', ...p2, sobrevive });

// ── PASADA 3 · dos ligas al mismo tiempo ────────────────────────────────────
linea('\n── Pasada 3 · dos ligas a la vez ───────────────────────────');
const hist2 = M.exportarHistorial(p2.liga);
const cats = p2.liga.categorias.map(c => c.id);
const pA = correrTemporada({ nombre:'Liga Metropolitana', reparto, semilla: 3131,
  historialPrevio: hist2, categoriasVisitante: cats.slice(0, 4) });
const pB = correrTemporada({ nombre:'Liga del Bajío', reparto, semilla: 4141,
  historialPrevio: hist2, categoriasVisitante: cats.slice(4) });
const solapa = Object.keys(pA.liga.puntos).filter(id => pB.liga.puntos[id]).length;
linea(`  Liga Metropolitana: ${pA.partidos} partidos · Liga del Bajío: ${pB.partidos}`);
linea(`  personas activas en LAS DOS ligas al mismo tiempo: ${solapa}`);
pasadas.push({ n:3, titulo:'Metropolitana + Bajío', ...pA, segunda: pB, solapa });

/* ══════════════════════════════════════════════════════════════════════════
   LA APP DE VERDAD
   ══════════════════════════════════════════════════════════════════════════ */
let revision = null;
if (!SIN_APP){
  linea('\n── La app real, persona por persona ────────────────────────');
  const { navegador, pagina, errores } = await abrirApp({ url: SITIO });
  const appLiga = traducirLiga(p1.liga, reparto.admin.email);
  const gente = MUESTRA ? reparto.personas.slice(0, MUESTRA) : reparto.personas;
  linea(`  ${gente.length} personas × sus pantallas…`);

  const { hallazgos, visitadas } = await recorrerTodos({
    pagina, personas: gente, liga: p1.liga, appLiga,
    alAvanzar: ({ hechas, total, visitadas, hallazgos }) => {
      process.stdout.write(`\r  ${hechas}/${total} personas · ${visitadas} pantallas · ${hallazgos} hallazgos   `);
    },
  });
  process.stdout.write('\n');
  await navegador.close();

  revision = { juntos: juntar(hallazgos), crudos: hallazgos.length, visitadas, errores };
  linea(`  ${visitadas} pantallas revisadas · ${revision.juntos.length} problemas distintos`);
  linea(`  errores de consola: ${errores.length}`);
}

/* ══════════════════════════════════════════════════════════════════════════
   EL REPORTE
   ══════════════════════════════════════════════════════════════════════════ */
const seg = ((Date.now() - t0) / 1000).toFixed(1);
const md = [];
const L = (s = '') => md.push(s);

L('# Simulacro de Ligas Mazi · reporte');
L('');
L(`Corrido el ${new Date().toISOString().slice(0, 10)} · ${seg}s · ${reparto.personas.length} personas · ${pasadas.length} pasadas`);
L('');
L('> Cada persona de este reparto tiene nombre, temperamento y CURP válido, y hace lo que');
L('> haría alguien de verdad. **Nadie abandona a la primera**: la gente es terca, así que lo');
L('> que se anota no es "se rindió" sino **dónde costó**. Ésa es la diferencia entre');
L('> "pantalla rota" y "pantalla confusa", y se arreglan distinto.');
L('');

L('## El reparto');
L('');
L('| Rol | Cuántos |');
L('|---|---|');
Object.entries(porRol).forEach(([r, n]) => L(`| ${r} | ${n} |`));
L(`| **total** | **${reparto.personas.length}** |`);
L('');
const conVarios = reparto.papas.filter(p => (p.hijos || []).length > 1).length;
L(`${reparto.equipos.length} equipos en ${p1.liga.categorias.length} categorías. ` +
  `${reparto.papas.length} papás, de los cuales **${conVarios} traen más de un hij@** — que es lo que ` +
  'rompe las apps que suponen un hijo por cuenta.');
L('');

L('## Las tres pasadas');
L('');
pasadas.forEach(p => {
  L(`### Pasada ${p.n} · ${p.titulo}`);
  L('');
  L(`- **${p.partidos} partidos** jugados minuto a minuto`);
  L(`- **${p.coronas.length} campeones** (uno por categoría)`);
  const cambios = p.liga.calendario.reduce((a, x) => a + ((x.cambios || []).length), 0);
  L(`- **${cambios} decisiones del coach** entre cambios de jugador y ajustes de posición`);
  L(`- tienda: ${p.compras.ok} códigos comprados con puntos · ${p.compras.canjes} canjeados por la liga · ` +
    `${p.compras.faltaron} se quedaron cortos de puntos`);
  L(`- gachapón: ${p.sobres.visitantes} sobres de visitantes · ${p.sobres.jugadores} de jugadores`);
  L(`- ${p.compras.dobles > 0
      ? `🔴 **${p.compras.dobles} códigos se pudieron canjear DOS veces** — eso es regalar mercancía`
      : '✅ ningún código se pudo canjear dos veces'}`);
  L(`- ${p.compras.apagada ? '✅' : '🔴'} con la perilla apagada, la tienda por puntos ` +
    `${p.compras.apagada ? 'sí niega la compra' : 'NO niega la compra'}`);
  if (p.n === 2) L(`- ${p.sobrevive ? '✅' : '🔴'} las estadísticas del equipo ` +
    `**${p.sobrevive ? 'sobrevivieron' : 'NO sobrevivieron'}** el cambio de liga`);
  if (p.n === 3) L(`- ${p.solapa} personas activas en las dos ligas al mismo tiempo`);
  L('');
  L('**Campeones:**');
  L('');
  p.coronas.forEach(c => L(`- \`${c.categoria}\` — **${c.campeon.nombre}** (subcampeón: ${c.subcampeon.nombre})`));
  L('');
});

L('## La previa del partido · lo del equipo nuevo');
L('');
L('Carlos lo precisó: *"el punto es si el EQUIPO es nuevo, no la app, porque habla de sus');
L('estadísticas generales, no sólo de la liga"*. Se mide contra el historial completo del');
L('equipo, no contra la liga en curso.');
L('');
L('| Momento | Lo que se enseña |');
L('|---|---|');
L(`| Antes de su primer partido | ${p1.previas[0].local.mensaje} |`);
L(`| Ya con historia (pasada 2, liga NUEVA) | ${p2.previas[0].local.mensaje} |`);
L('');

L('## La tabla final · una muestra');
L('');
const muestraCat = p1.liga.categorias[3].id;
L(`Categoría \`${muestraCat}\`, con posición y puntaje como se pidió:`);
L('');
L('| Pos | Equipo | G-P | Dif | Pts |');
L('|---|---|---|---|---|');
M.tabla(p1.liga, muestraCat).forEach(r =>
  L(`| ${r.pos} | ${r.nombre} | ${r.g}-${r.p} | ${r.dif > 0 ? '+' : ''}${r.dif} | ${r.pts} |`));
L('');

if (revision){
  L('## La app de verdad · lo que encontró el inspector');
  L('');
  L(`${revision.visitadas} pantallas caminadas con identidades reales del reparto. ` +
    `${revision.crudos} hallazgos en bruto, **${revision.juntos.length} problemas distintos** ` +
    '(la misma cosa la encuentran muchas personas; se agrupan y se cuenta a cuánta gente le pasa, ' +
    'que además es lo que dice qué tan urgente es).');
  L('');
  if (revision.errores.length){
    L('### 🔴 Errores de consola');
    L('');
    [...new Set(revision.errores)].slice(0, 20).forEach(e => L('- `' + e.slice(0, 200) + '`'));
    L('');
  } else {
    L('✅ **Ningún error de consola** en todo el recorrido.');
    L('');
  }
  const graves = revision.juntos.filter(h => h.gravedad === 'grave');
  const medios = revision.juntos.filter(h => h.gravedad === 'medio');
  const pinta = (lista, titulo, tope) => {
    if (!lista.length) return;
    L(`### ${titulo} (${lista.length})`);
    L('');
    L('| Pantalla | Qué | Dónde | A cuánta gente | Roles |');
    L('|---|---|---|---|---|');
    lista.slice(0, tope).forEach(h =>
      L(`| \`${h.pantalla}\` | ${String(h.que).replace(/\|/g, '·')} | \`${h.donde}\` | ${h.veces} | ${h.roles.join(', ')} |`));
    if (lista.length > tope) L(`| … | y ${lista.length - tope} más | | | |`);
    L('');
  };
  pinta(graves, '🔴 Graves', 40);
  pinta(medios, '🟡 Incómodos', 40);
}

L('## Lo que este simulacro NO prueba');
L('');
L('Se dice con todas sus letras para que nadie lo confunda:');
L('');
L('- **No prueba la nube.** Corre en modo local, sin Supabase. Es a propósito: ése es el modo');
L('  en el que la app tiene que aguantar sola. Lo de la nube se prueba con la nube.');
L('- **No sabe si algo se ve bonito.** Mide lo que se puede medir —tamaño del dedo, desborde,');
L('  pantalla vacía, texto invisible por color—. El juicio de si se ve caro o barato es de la');
L('  mesa de diseño. Decir lo contrario sería vender humo.');
L('- **No sustituye abrir la app.** Encuentra lo que se puede medir a escala; lo que se siente');
L('  al usarla, se siente usándola.');
L('');
L('---');
L('');
L('Generado por `ligas-mazi/simulacro/correr.mjs`. Semilla fija: la misma corrida produce la');
L('misma gente y los mismos partidos, así que cualquier hallazgo se puede volver a producir.');

const salida = new global.URL('./REPORTE.md', import.meta.url).pathname;
writeFileSync(salida, md.join('\n'));
linea(`\n✅ Reporte en ${salida}  (${seg}s)`);
