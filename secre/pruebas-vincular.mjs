/* ══════════════════════════════════════════════════════════════════════════
   SECRE · vincular con código, contra WhatsApp DE VERDAD (necesita internet)
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 16 de octubre: «Ya lo intenté con varios códigos generados y aún no
   deja». Dos defectos, reproducidos aquí:
   1. el código se pedía en 'connecting', antes del saludo: «Connection Closed»;
   2. tras pedir uno, la reconexión intentaba ENTRAR (creds.me puesto) y
      WhatsApp contestaba 401: todos los códigos siguientes nacían muertos.
   Usa el 1-555-0100, un número de ficción que no es de nadie: no le llega
   aviso a ningún teléfono. node secre/pruebas-vincular.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { conectar } from './whatsapp.mjs';
import { authEnMemoria } from './nube.mjs';

let pasan = 0, fallan = 0;
const ok = (t, c, extra) => { if(c){ pasan++; console.log('  ✓', t); } else { fallan++; console.log('  ✗', t, extra !== undefined ? JSON.stringify(extra) : ''); } };
const esperar = (f, ms) => new Promise((si) => { const t0 = Date.now(); const i = setInterval(() => { if(f() || Date.now() - t0 > ms){ clearInterval(i); si(f()); } }, 100); });

const estados = [];
const auth = authEnMemoria(null, () => {});
const tr = await conectar({ auth, telefono: () => '15550100', alMensaje: async () => {}, alEstado: (e) => estados.push({ ...e, t: Date.now() }), registro: 'silent' });
const codigos = () => estados.filter(e => e.codigo).map(e => e.codigo);

await esperar(() => codigos().length >= 1, 30_000);
ok('pide un código cuando WhatsApp ya está listo', codigos().length >= 1, estados);
ok('sin error al pedirlo', !estados.some(e => /No pude pedir/.test(e.error || '')), estados.filter(e => e.error));
ok('el código dice para qué número es', estados.find(e => e.codigo)?.para === '15550100');

/* la red corta a media vinculación (Render, el teléfono que tarda, lo que sea) */
tr._soltar();
await esperar(() => codigos().length >= 2, 40_000);
ok('tras un corte, sale un código NUEVO', codigos().length >= 2 && codigos()[1] !== codigos()[0], codigos());
ok('y no se toma por «te saliste desde el teléfono»', !estados.some(e => e.cerrada), estados.filter(e => e.cerrada));

await tr.cerrar();
console.log(`\n${fallan ? '✗' : '✓'}  ${pasan} pasan · ${fallan} fallan`);
process.exit(fallan ? 1 : 0);
