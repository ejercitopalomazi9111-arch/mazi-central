#!/usr/bin/env node
/* ============================================================================
   pantallas.mjs — las PANTALLAS REALES que flotan en la experiencia
   ----------------------------------------------------------------------------
   Saca capturas de nuestros propios productos corriendo, para que lo que cae
   del cielo en la portada sea software de verdad y no un mockup dibujado.

   POR QUÉ ESTO ES UNA HERRAMIENTA Y NO UN PUÑADO DE COMANDOS:
   las capturas se van a volver a sacar cada que el producto cambie. Si el cómo
   se sacaron vive en el historial de una terminal, se pierde. Aquí vive el
   guion completo: qué pantalla, con qué estado, y con qué se llenó.

   POR QUÉ SE SIEMBRA UN PARTIDO DE DEMOSTRACIÓN:
   Ligas Mazi enseña estados vacíos cuando no hay liga activa ("la tabla se
   llena cuando se jueguen partidos"), y un estado vacío no prueba nada. El
   propio producto trae un "partido de prueba" —Halcones vs Titanes, equipos
   inventados a propósito— hecho justo para enseñarlo. Eso es lo que se captura.

   Y POR QUÉ ESO NO ES MENTIR:
   son pantallas del software REAL, con su modo de demostración REAL. No hay
   cliente inventado, no hay marca ajena, y sobre todo: **no hay un solo dato de
   una persona de verdad**. La liga trae menores de edad; sus nombres y sus
   fotos no salen del sistema ni para una captura. Esa es la única forma en que
   esto se puede publicar.

   Uso:
     npx http-server -p 8080 -s &
     node sitio/pantallas.mjs
   ==========================================================================*/

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const CAPTURA = RAIZ + '/herramientas/captura.mjs';
const SERVIDOR = process.env.MAZI_SERVIDOR || 'http://127.0.0.1:8080';
const DESTINO = RAIZ + '/sitio/img/pantallas';

/* ── El estado sembrado ──────────────────────────────────────────────────────
   Un partido a media marcha: tercer cuarto, marcador cerrado, faltas repartidas
   y bitácora con jugadas. Un 0–0 en el primer cuarto se ve igual de vacío que
   no tener nada. */
const SIEMBRA = `
  const T = GAME.teams;
  T[0].score = 58; T[1].score = 54; T[0].tf = 3; T[1].tf = 5;
  T[0].players.forEach((p,i) => p.pts = [14,12,9,8,6,4,3,2][i] || 0);
  T[1].players.forEach((p,i) => p.pts = [16,11,10,7,5,3,2,0][i] || 0);
  GAME.period = 3; GAME.remainSec = 427; GAME.clock = '07:07'; GAME.running = true;
  GAME.log = [
    { t:'07:12', m:'<b>Halcones</b> #7 anotó <b class="g">+3</b>' },
    { t:'07:40', m:'<b>Titanes</b> #5 · <b class="rd">falta personal</b>' },
    { t:'08:02', m:'<b>Titanes</b> #12 anotó <b class="g">+2</b>' },
    { t:'08:31', m:'<b>Cambio</b> entra #9 por #4' },
  ];
`;

/* El guion: cada toma es una pantalla del sistema.
   El rol hace falta porque Ligas Mazi aísla por sombrero — la mesa de control
   sólo la ve quien dirige la liga, y eso es una función, no un descuido. */
const TOMAS = [
  { id: 'entrada',  nota: 'La entrada · cuentas reales',        pasos: '' },
  { id: 'hub',      nota: 'El tablero del aficionado',          pasos: `invitado();` },
  { id: 'mesa',     nota: 'La mesa de control · dirigir el partido',
    pasos: `invitado(); liga(); demo(); sembrar(); render('mesa');` },
  { id: 'marcador', nota: 'El marcador en vivo, público',
    pasos: `invitado(); liga(); demo(); sembrar(); render('marcador');` },
  { id: 'liga',     nota: 'La liga · equipos, calendario, responsivas',
    pasos: `invitado(); liga(); render('liga');` },
  { id: 'perillas', nota: 'Las reglas del torneo · las perillas',
    pasos: `invitado(); liga(); render('perillas');` },
];

/* El guion se ejecuta con espera: la app arranca contra Supabase y pintar antes
   de que termine da pantallas a medio dibujar. */
const guion = (pasos) => `(() => {
  const barra = document.getElementById('mazi-barra'); if (barra) barra.remove();
  const invitado = () => { try { guestEnter(); } catch (e) {} };
  const liga     = () => { currentRole = 'liga'; };
  const demo     = () => { try { startPreviewDemo(); } catch (e) { console.log('demo:', e.message); } };
  const sembrar  = () => { try { ${SIEMBRA} } catch (e) { console.log('siembra:', e.message); } };
  setTimeout(() => { try { ${pasos || ''} } catch (e) { console.log('guion:', e.message); } }, 2600);
})()`;

mkdirSync(DESTINO, { recursive: true });
console.log(`Sacando ${TOMAS.length} pantallas de ${SERVIDOR}/ligas-mazi/\n`);

for (const t of TOMAS) {
  const salida = `${DESTINO}/${t.id}.jpg`;
  console.log(`· ${t.id} — ${t.nota}`);
  execFileSync('node', [CAPTURA, `${SERVIDOR}/ligas-mazi/`, salida,
    '--movil', '--escala', '2', '--espera', '6500', '--jpeg', '90',
    '--js', guion(t.pasos),
  ], { stdio: 'inherit' });
}

console.log(`\n✓ ${TOMAS.length} pantallas en sitio/img/pantallas/`);
