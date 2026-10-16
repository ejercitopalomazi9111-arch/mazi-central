/* SECRE · la pantalla de «falta vincular», en un navegador de verdad a 390 px:
   dice para qué número es el código, «Pedir otro código» trae uno nuevo, y en
   México se puede probar el otro formato (52… / 521…). node secre/pruebas-vincular-panel.mjs */
import { createRequire } from 'module'; import { spawn } from 'child_process'; import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire('/opt/node22/lib/node_modules/'); const { chromium } = require('playwright');
const RAIZ = path.dirname(new URL(import.meta.url).pathname);
let pasan = 0, fallan = 0;
const ok = (t, c, x) => { if(c){ pasan++; console.log('  ✓', t); } else { fallan++; console.log('  ✗', t, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
const DATOS = fs.mkdtempSync(path.join(os.tmpdir(), 'secre-v-'));
const PUERTO = 9300 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, [path.join(RAIZ, 'correr.mjs')], { env: { ...process.env, SECRE_FALSO: '1', SECRE_FALSO_SIN_VINCULAR: '1', SECRE_DATOS: DATOS, SECRE_PUERTO: String(PUERTO), SECRE_CLAVE: 'clave-de-prueba', SECRE_CUENTAS: 'negocio:524420000000,personal:17860000000' }, stdio: ['ignore', 'pipe', 'pipe'] });
let salida = ''; srv.stdout.on('data', d => salida += d); srv.stderr.on('data', d => salida += d);
const fin = (c) => { try{ srv.kill(); }catch{} fs.rmSync(DATOS, { recursive: true, force: true }); process.exit(c); };
for(let i = 0; i < 50 && !/Panel de Secre/.test(salida); i++) await new Promise(r => setTimeout(r, 100));
const br = await chromium.launch();
const page = await (await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
const errores = []; page.on('pageerror', e => errores.push(e.message));
const URL0 = `http://127.0.0.1:${PUERTO}/`;
const espera = async (f, ms = 9000) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ if(await f().catch(() => false)) return true; await page.waitForTimeout(150); } return false; };
await page.goto(URL0);
await page.fill('#clave', 'clave-de-prueba'); await page.click('#fEntrar button');
ok('sale el código', await espera(async () => /ABCD-0000/.test(await page.textContent('#conexion'))));
ok('dice para qué número', /\+52 442 000 0000/.test(await page.textContent('#conexion')), await page.textContent('#conexion'));
ok('ofrece probar con el 1', /Probar como \+52 1 442 000 0000/.test(await page.textContent('#bOtroNumero').catch(() => '')));
if(process.env.CAPTURA) await page.screenshot({ path: process.env.CAPTURA });
await page.click('#bOtroNumero');
ok('al tocarlo, el código nuevo es para 521…', await espera(async () => /\+52 1 442 000 0000\./.test(await page.textContent('#conexion'))), await page.textContent('#conexion'));
ok('y ahora ofrece regresar al de sin 1', /Probar como \+52 442 000 0000/.test(await page.textContent('#bOtroNumero').catch(() => '')));
ok('el número elegido se queda guardado', JSON.parse(fs.readFileSync(path.join(DATOS, 'negocio', 'vinculo.json'), 'utf8')).tel === '5214420000000');
await page.click('#bOtroCodigo');
ok('«Pedir otro código» no truena', await espera(async () => /ABCD-0000/.test(await page.textContent('#conexion'))));
await page.click('.cuenta[data-c="personal"]');
ok('la de EU no ofrece el formato de México', await espera(async () => /\+1 786 000 0000/.test(await page.textContent('#conexion'))) && await page.locator('#bOtroNumero').count() === 0);
ok('sin desborde', await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0);
ok('botones de 44 px o más', (await page.evaluate(() => [...document.querySelectorAll('#conexion button')].map(b => b.getBoundingClientRect().height))).every(h => h >= 44));
ok('cero errores de consola', errores.length === 0, errores);
await br.close();
console.log(`\n${fallan ? '✗' : '✓'} ${pasan}/${pasan + fallan}`);
fin(fallan ? 1 : 0);
