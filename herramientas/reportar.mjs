#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   reportar.mjs — HERRAMIENTA MAZI · decir en qué ando
   ──────────────────────────────────────────────────────────────────────────
   Manda a La Sala en qué está trabajando un agente. Es lo que enciende el
   monitor del Taller (`entorno/`) y la pantalla de la mesa (`sala/`).

   POR QUÉ EXISTE, y no es un adorno: sin esto, «ver cómo trabajas en tiempo
   real» se convierte en que yo escriba mensajes contándolo — y cada mensaje
   es un turno completo de modelo, cobrado, que además despierta a los demás.
   Reportar NO es hablar: no entra al hilo, no cuenta como vuelta y no
   despierta a nadie. Cuesta una llamada HTTP.

   ── uso ───────────────────────────────────────────────────────────────────
     node herramientas/reportar.mjs "en qué ando" [paso] [va] [total]
     node herramientas/reportar.mjs --fin           borra el reporte

   ── configuración, por variable de entorno (NUNCA en el repo) ─────────────
     MAZI_SALA       código de 6 letras de la sala
     MAZI_YO         el id con el que entré a la sala
     MAZI_LLAVE      la llave de la cuenta, si la sala tiene llaves
     MAZI_SERVIDOR   por si no es el de producción

   ── el rastro ─────────────────────────────────────────────────────────────
   Los últimos pasos se guardan en un archivo temporal y se mandan como
   `pasos`, que es lo que pinta la estela en el monitor. Sin rastro, la
   pantalla sólo dice DÓNDE está y no CÓMO llegó — y el cómo llegó es
   justamente lo que Carlos quería ver.
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SERVIDOR = (process.env.MAZI_SERVIDOR || 'https://sala.palomazi9111.workers.dev')
                   .replace(/\/$/, '');
const SALA  = (process.env.MAZI_SALA  || '').toUpperCase();
const YO    =  process.env.MAZI_YO    || '';
const LLAVE =  process.env.MAZI_LLAVE || '';
const RASTRO = join(tmpdir(), `mazi-rastro-${SALA}-${YO}.json`);
const TOPE_PASOS = 8;

const [,, ...args] = process.argv;

if(!SALA || !YO){
  /* Se sale en silencio y con éxito. Esto lo va a llamar un gancho en cada
     herramienta que yo use: si tronara cuando la sala no está configurada,
     rompería el trabajo real por no poder contar el trabajo real. */
  process.exit(0);
}

const enviar = async (cuerpo) => {
  const r = await fetch(`${SERVIDOR}/api/sala/${SALA}/trabajando`, {
    method:'POST',
    headers: LLAVE ? { 'content-type':'application/json', 'X-Llave':LLAVE }
                   : { 'content-type':'application/json' },
    body: JSON.stringify({ de: YO, ...cuerpo }),
  });
  if(!r.ok) throw new Error(`la sala contestó ${r.status}: ${(await r.text()).slice(0,140)}`);
};

try{
  if(args[0] === '--fin'){
    await enviar({ en:null });
    await writeFile(RASTRO, '[]').catch(() => {});
    process.exit(0);
  }

  const [en, paso, va, total] = args;
  if(!en){ console.error('  ✗ ¿En qué andas? Pásame al menos el encargo.'); process.exit(1); }

  let pasos = [];
  try{ pasos = JSON.parse(await readFile(RASTRO, 'utf8')); }catch(e){}
  if(paso && pasos[pasos.length - 1] !== paso) pasos.push(paso);
  pasos = pasos.slice(-TOPE_PASOS);

  /* El rastro se guarda DESPUÉS de que el envío funcionó, no antes. Al revés,
     un reporte que no salió —la sala apagada, la red caída— igual dejaba su
     paso en la estela, y la pantalla acababa enseñando un camino que nunca se
     reportó. Salió probándolo con la sala apagada. */
  await enviar({ en, paso: paso || '', pasos,
                 va: Number(va) || 0, total: Number(total) || 0 });
  await writeFile(RASTRO, JSON.stringify(pasos)).catch(() => {});
}catch(e){
  /* Tampoco truena si la sala no contesta. Un monitor caído no puede tumbar
     el trabajo que está monitoreando. */
  console.error(`  · no se pudo reportar: ${e.message}`);
  process.exit(0);
}
