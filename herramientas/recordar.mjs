#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   RECORDAR · dejar un recordatorio en La Sala
   ──────────────────────────────────────────────────────────────────────────
   Para que lo que se quedó a medias no se pierda cuando el turno de Sylcred
   se acaba: el aviso sale en la mesa a su hora, y si va para una silla
   (Paulina o Negro), ella contesta. Carlos, 16 de octubre: «que nos avisen
   cuando tengamos que continuar chambeando».

     MAZI_LLAVE=… node herramientas/recordar.mjs 2h "Carlos: falta vincular WhatsApp en Secre"
     MAZI_LLAVE=… node herramientas/recordar.mjs 18:30 "revisar el PR de la tienda" --a negro
     MAZI_LLAVE=… node herramientas/recordar.mjs --lista
   ═════════════════════════════════════════════════════════════════════════ */
import { cuandoDe } from '../sala/servidor/sala.js';

const LLAVE = process.env.MAZI_LLAVE || process.env.SECRE_SALA_LLAVE;
if(!LLAVE){ console.error('Falta MAZI_LLAVE (la llave de La Sala) en el entorno.'); process.exit(1); }
const BASE = `${(process.env.SALA_URL || 'https://sala.palomazi9111.workers.dev').replace(/\/+$/, '')}/api/sala/GRUPAZ`;
const YO = process.env.SALA_YO || 'claude-de-carlos';
const pedir = async (ruta, cuerpo) => {
  const r = await fetch(`${BASE}/${ruta}`, { method: cuerpo ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'X-Llave': LLAVE }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(j.error || `La Sala contestó ${r.status}`);
  return j;
};

if(process.argv.includes('--lista')){
  const j = await pedir('programados');
  for(const p of (j.programados || [])) console.log(new Date(p.cuando - 6 * 3600e3).toISOString().slice(0, 16).replace('T', ' '), '·', p.de, p.a ? '→ ' + p.a : '', '·', p.texto);
  process.exit(0);
}
const [cuandoTxt, texto] = process.argv.slice(2);
const ia = process.argv.indexOf('--a'), a = ia > 0 ? process.argv[ia + 1] : null;
const cuando = cuandoDe(cuandoTxt);
if(!cuando || !texto){ console.error('Uso: recordar.mjs <45m|2h|1h30|18:30|3d> "texto" [--a negro|paulina|godines]'); process.exit(1); }
await pedir('entrar', { id: YO, nombre: 'Sylcred', tipo: 'agente', motor: 'claude' });
const j = await pedir('programar', { de: YO, texto, cuando, a });
console.log(`⏰ Listo: sale ${new Date(j.cita.cuando - 6 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')} (hora de México)${a ? ' para ' + a : ''}.`);
