#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   NOMBRES QUE NO EXISTEN · `node tienda/nucleo/pruebas-lint.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Salió del gato de pruebas-personas.mjs: en Categorías, «Editar» y «Nueva
   categoría» tronaban con `recargar is not defined` —alMontar recibía
   { aviso, ir } y la hoja pedía `recargar`—. Ninguna prueba de pantalla lo
   veía porque sólo pintan: el error salía al TOCAR. ESLint con no-undef lo ve
   sin tocar nada, en todos los archivos a la vez.
   Los nombres globales se sacan del Chromium de las pruebas (lo que de verdad
   existe en un navegador), no de una lista a mano que se queda vieja.
   ═════════════════════════════════════════════════════════════════════════ */
import { readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const { ESLint } = await import('/opt/node22/lib/node_modules/eslint/lib/api.js');

const TIENDA = join(dirname(fileURLToPath(import.meta.url)), '..');
const b = await chromium.launch(); const pg = await b.newPage();
const nombres = await pg.evaluate(() => { const s = new Set(); let o = window; while(o){ Object.getOwnPropertyNames(o).forEach((k) => s.add(k)); o = Object.getPrototypeOf(o); } return [...s]; });
await b.close();
// Lo que existe sólo en páginas seguras o en el trabajador de fondo, y la API
// que se usa detrás de un `'BarcodeDetector' in window`.
const globals = Object.fromEntries([...nombres, 'caches', 'clients', 'skipWaiting', 'registration', 'BarcodeDetector'].filter((k) => /^[A-Za-z_$][\w$]*$/.test(k)).map((k) => [k, 'readonly']));

const archivos = [];
const recorrer = (d) => { for(const f of readdirSync(d)){ const r = join(d, f);
  if(/^(vendor|node_modules|puente|supabase|datos|muestra)$/.test(f)) continue;
  if(statSync(r).isDirectory()) recorrer(r); else if(/\.js$/.test(f) && !/^pruebas-/.test(f)) archivos.push(r); } };
recorrer(TIENDA);

const eslint = new ESLint({ cwd: TIENDA, overrideConfigFile: true, overrideConfig: [{
  files: ['**/*.js'],
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals },
  rules: { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-const-assign': 'error', 'no-redeclare': 'error',
    'no-self-assign': 'error', 'no-dupe-else-if': 'error', 'no-unsafe-finally': 'error', 'use-isnan': 'error', 'valid-typeof': 'error', 'no-import-assign': 'error' },
}] });
const res = await eslint.lintFiles(archivos);
const fallas = res.flatMap((r) => r.messages.map((m) => `${relative(TIENDA, r.filePath)}:${m.line} ${m.message}`));
fallas.forEach((f) => console.log('  ✗ ' + f));
const malos = new Set(fallas.map((f) => f.split(':')[0])).size;
console.log(`\n${fallas.length ? '✗' : '✓'} ${archivos.length - malos} pasan · ${malos} fallan (${archivos.length} archivos revisados${fallas.length ? `, ${fallas.length} hallazgos` : ''})\n`);
process.exit(fallas.length ? 1 : 0);
