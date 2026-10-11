#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   FADORI · LAS CUENTAS, como las usaría un alumno (10 de octubre)
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «me preocupa que hagan pedidos a nombre de otras personas… una foto
   de su credencial, sólo una vez… correo y contraseña… recuperar con el
   código y el correo».

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori/pruebas-cuentas.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { abrirMesa } from './mesa-de-pruebas.mjs';
import path from 'path';
const { ok, fallas, aparato, tarda, mostrador, alumno, cerrar, CASA } = await abrirMesa('cuentas');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FOTO = path.join(RAIZ, 'fadori/fotos/agua.jpg');

console.log('\n1 · Una cuenta nueva pide la credencial UNA vez');
const ana = await aparato('/fadori/', { credencial: true });
await ana.waitForSelector('#p-entrada:not([hidden])');
ok('la entrada ya no promete «sin correo»: dice lo de la credencial', /credencial/.test(await ana.textContent('#p-entrada')));
await ana.fill('#eNombre', 'Ana P'); await ana.fill('#eGrupo', '3B');
await ana.click('#bEntrar');
await ana.waitForSelector('#p-terminos:not([hidden])');
ok('los términos dicen que la foto se borra al revisarla', /se borra/.test(await ana.textContent('#p-terminos')));
await ana.click('#bAcepto');
ok('después de los términos, la credencial', (await tarda(ana, () => !document.querySelector('#p-credencial').hidden, null, 4000)) != null);
ok('«Mandarla» está apagado hasta que haya foto', await ana.isDisabled('#bMandarCred'));
await ana.setInputFiles('#fCredGal', FOTO);
const FOTOS = process.env.FOTOS; const foto = async (pg, n) => { if(FOTOS) await pg.screenshot({ path: FOTOS + '/' + n + '.png' }); };
ok('la foto se ve antes de mandarla', (await tarda(ana, () => !!document.querySelector('#credVista img'), null, 5000)) != null);
const peso = await ana.evaluate(() => document.querySelector('#credVista img').src.length);
await foto(ana, 'credencial');
ok(`y va achicada (${Math.round(peso / 1024)} KB, menos de 100)`, peso <= 100000);
await ana.click('#bMandarCred');
ok('al mandarla, ya puede pedir', (await tarda(ana, () => !document.querySelector('#p-menu').hidden, null, 8000)) != null);
const cod = await ana.evaluate(() => FADORI.yo().codigo);
ok('su cuenta queda «en revisión»', await ana.evaluate(() => FADORI.yo().verif === 'pendiente'));
await ana.reload(); await ana.waitForFunction(() => window.FADORI && FADORI.yo());
ok('al volver a abrir la app NO se la vuelve a pedir', (await tarda(ana, () => document.querySelector('#p-credencial').hidden && !document.querySelector('#p-menu').hidden, null, 6000)) != null);

console.log('\n2 · La cooperativa la revisa en el mostrador y la foto se va');
const most = await mostrador();
ok('el mostrador avisa que hay una por revisar', (await tarda(most, () => /1 credencial por revisar/.test(document.querySelector('#porRevisar').textContent), null, 25000)) != null);
await most.click('#bRevisar');
await foto(most, 'revisar');
ok('se ve la foto con el nombre y el grupo', await most.isVisible('.cred-rev img') && /Ana P/.test(await most.textContent('.cred-rev')) && /3B/.test(await most.textContent('.cred-rev')));
/* un pedido de una cuenta todavía sin revisar sale marcado */
await most.click('#hCerrar');
const pid = await ana.evaluate(() => { const F = FADORI, d = F.productos(true).filter(p => p.disponible); return F.pedir(F.yo().codigo, [{ prod: d[0].id, cant: 1 }], {}).id; });
ok('su pedido le llega al mostrador marcado «credencial por revisar»', (await tarda(most, (id) => { const r = [...document.querySelectorAll('#cola .renglon, #actual')].find(x => x.innerHTML.includes('credencial por revisar')); return !!r; }, pid, 12000)) != null);
await most.click('#bRevisar');
await most.click('.cred-rev [data-cred-si]');
ok('«Es él/ella» quita el aviso', (await tarda(most, () => !document.querySelector('#porRevisar').textContent.trim(), null, 6000)) != null);
ok('…y la marca del pedido', (await tarda(most, () => !document.body.innerHTML.includes('credencial por revisar') || !document.querySelector('#cola').innerHTML.includes('sin-verif'), null, 6000)) != null);
ok('a Ana le llega «Cuenta verificada»', (await tarda(ana, () => FADORI.yo() && FADORI.yo().verif === 'si', null, 12000)) != null);
await ana.click('#bPestYo').catch(async () => { await ana.evaluate(() => document.querySelector('[data-pest="yo"], #tabYo') && document.querySelector('[data-pest="yo"], #tabYo').click()); });

console.log('\n3 · Protege su cuenta con correo y contraseña');
await ana.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Lo mío/.test(x.textContent)); b && b.click(); });
await ana.waitForSelector('#miCuenta #bProteger', { timeout: 6000 });
ok('«Lo mío» dice que está verificada', /verificada/.test(await ana.textContent('#miCuenta')));
await ana.fill('#pCorreo', 'ana.p@escuela.mx'); await ana.fill('#pClave', 'torta2026');
await ana.click('#bProteger');
ok('queda «Protegida con an•••@escuela.mx»', (await tarda(ana, () => /an•••@escuela\.mx/.test(document.querySelector('#miCuenta').textContent), null, 6000)) != null);
await ana.evaluate(() => document.querySelector('#miCuenta').scrollIntoView()); await foto(ana, 'lo-mio');

console.log('\n4 · Otro teléfono: con el código solo ya no entra; con su correo sí');
const otro = await aparato('/fadori/', { credencial: true });
await otro.waitForSelector('#p-entrada:not([hidden])');
await otro.evaluate(() => document.querySelector('#eCorreo').scrollIntoView()); await foto(otro, 'entrar');
await otro.fill('#eCodigo', cod); await otro.click('#bVolver');
ok('con sólo el código: «tiene contraseña: entra con tu correo»', (await tarda(otro, () => /entra con tu correo/.test(document.body.innerText), null, 5000)) != null);
ok('…y no entró', await otro.evaluate(() => !FADORI.yo()));
await otro.fill('#eCorreo', 'ana.p@escuela.mx'); await otro.fill('#eClave', 'mal');
await otro.click('#bEntrarCorreo');
ok('con la contraseña mal no entra', (await tarda(otro, () => /no coinciden/.test(document.body.innerText), null, 5000)) != null && await otro.evaluate(() => !FADORI.yo()));
await otro.fill('#eClave', 'torta2026'); await otro.click('#bEntrarCorreo');
ok('con correo y contraseña entra como Ana', (await tarda(otro, (c) => FADORI.yo() && FADORI.yo().codigo === c, cod, 8000)) != null);
ok('…sin que le pida otra vez la credencial (ya está verificada)', (await tarda(otro, () => !document.querySelector('#p-menu').hidden || !document.querySelector('#p-turno').hidden, null, 5000)) != null);

console.log('\n5 · Olvidó la contraseña: código + correo');
const tercero = await aparato('/fadori/', { credencial: true });
await tercero.waitForSelector('#p-entrada:not([hidden])');
await tercero.click('#bOlvide');
await tercero.fill('#eCorreo', 'ana.p@escuela.mx'); await tercero.fill('#rCodigo', cod); await tercero.fill('#rNueva', 'nueva2026');
await tercero.click('#bRecuperar');
ok('con su código y su correo pone contraseña nueva y entra', (await tarda(tercero, (c) => FADORI.yo() && FADORI.yo().codigo === c, cod, 8000)) != null);

console.log('\n6 · «No la traigo hoy»');
const beto = await aparato('/fadori/', { credencial: true });
await beto.waitForSelector('#p-entrada:not([hidden])');
await beto.fill('#eNombre', 'Beto R'); await beto.fill('#eGrupo', '2C'); await beto.click('#bEntrar');
await beto.click('#bAcepto');
await beto.waitForSelector('#p-credencial:not([hidden])');
await beto.click('#bSinCred');
ok('deja pedir hoy', (await tarda(beto, () => !document.querySelector('#p-menu').hidden, null, 4000)) != null);
await beto.reload(); await beto.waitForFunction(() => window.FADORI && FADORI.yo());
ok('y hoy ya no la vuelve a pedir', (await tarda(beto, () => !document.querySelector('#p-menu').hidden, null, 6000)) != null);
await beto.evaluate(() => localStorage.setItem('fadori_cred_luego', 'Mon Jan 01 2001'));
await beto.reload(); await beto.waitForFunction(() => window.FADORI && FADORI.yo());
ok('otro día, sí', (await tarda(beto, () => !document.querySelector('#p-credencial').hidden, null, 6000)) != null);

console.log('\n7 · Tamaños y errores');
for(const [n, pg] of [['Ana', ana], ['otro', otro]]){
  for(const w of [320, 390]){ await pg.setViewportSize({ width: w, height: 800 }); await pg.waitForTimeout(150);
    const d = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(`${n}: nada se sale a ${w}`, d <= 0, d); }
}
for(const [n, pg] of [['Ana', ana], ['otro', otro], ['tercero', tercero], ['Beto', beto], ['mostrador', most]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);

console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
