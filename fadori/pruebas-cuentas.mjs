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
const { ok, fallas, aparato, tarda, mostrador, alumno, cerrar, CASA, br } = await abrirMesa('cuentas');
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FOTO = path.join(RAIZ, 'fadori/fotos/agua.jpg');
/* una credencial de mentira con el formato de la escuela (nombre en
   mayúsculas arriba de «Número de Matrícula»), dibujada aquí: nada real */
import os from 'os'; import fs from 'fs';
async function credencial(nombre){
  const pg = await br.newPage({ viewport: { width: 640, height: 1000 } });
  await pg.setContent(`<body style="margin:0;font-family:Arial;background:#fff">
    <div style="height:260px;background:linear-gradient(160deg,#d4111f 0 40%,#fff 40% 46%,#463d78 46% 70%,#fff 70%)"></div>
    <div style="width:220px;height:240px;margin:-120px auto 20px;background:#bbb;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)"></div>
    <h1 style="text-align:center;font-size:34px;margin:10px 30px;line-height:1.15">${nombre.split('|').join('<br>')}</h1>
    <hr style="width:60%;border:0;border-top:3px solid #000">
    <p style="text-align:center;color:#d4111f;font-size:24px;line-height:1.5">Número de Matrícula: 00000TEST0001<br>Grupo: 3.1<br>Ciclo Escolar: AGOSTO 2026 - DICIEMBRE 2026</p>
    <div style="height:160px;background:linear-gradient(20deg,#463d78 0 20%,#fff 20% 26%,#d4111f 26% 55%,#fff 55%)"></div></body>`);
  const f = path.join(os.tmpdir(), 'cred-' + Math.random().toString(36).slice(2) + '.jpg');
  fs.writeFileSync(f, await pg.screenshot({ type: 'jpeg', quality: 80 })); await pg.close();
  return f;
}

console.log('\n1 · Una cuenta nueva pide credencial Y correo, una vez');
const ana = await aparato('/fadori/', { credencial: true });
await ana.waitForSelector('#p-entrada:not([hidden])');
ok('la entrada ya no promete «sin correo»: dice lo de la credencial', /credencial/.test(await ana.textContent('#p-entrada')));
await ana.fill('#eNombre', 'Ana P'); await ana.fill('#eGrupo', '3B');
await ana.click('#bEntrar');
await ana.waitForSelector('#p-terminos:not([hidden])');
ok('los términos dicen que la foto se borra al revisarla', /se borra/.test(await ana.textContent('#p-terminos')));
await ana.click('#bAcepto');
ok('después de los términos, la cuenta', (await tarda(ana, () => !document.querySelector('#p-credencial').hidden, null, 4000)) != null);
ok('ya no hay «No la traigo hoy»', !(await ana.evaluate(() => /no la traigo/i.test(document.querySelector('#p-credencial').textContent))));
ok('pide credencial y correo en la misma pantalla', await ana.isVisible('#credPaso') && await ana.isVisible('#correoPaso'));
ok('«Listo» está apagado sin nada', await ana.isDisabled('#bMandarCred'));
const FOTOS = process.env.FOTOS; const foto = async (pg, n) => { if(FOTOS) await pg.screenshot({ path: FOTOS + '/' + n + '.png', fullPage: true }); };
const lectura = () => tarda(ana, () => { const e = document.querySelector('#credLectura'); return e && !e.hidden && !e.classList.contains('leyendo') ? e.className : null; }, null, 60000);
/* 1 · la credencial de OTRA persona: no deja mandarla */
await ana.setInputFiles('#fCredGal', await credencial('LUIS MARIO|TORRES DÍAZ'));
ok('con la credencial de otro, la app lee el nombre y dice que no coincide', (await lectura()) != null && /LUIS MARIO TORRES DIAZ/.test(await ana.textContent('#credLectura')) && /no coincide|tu cuenta dice/i.test(await ana.textContent('#credLectura')), await ana.textContent('#credLectura'));
await ana.fill('#cCorreo', 'x@x.mx'); await ana.fill('#cClave', 'xxxxxxx');
ok('…y «Listo» sigue apagado aunque haya correo', await ana.isDisabled('#bMandarCred'));
await foto(ana, 'credencial-ajena');
/* 2 · una foto sin letras, dos veces: a la segunda, «que la revise la cooperativa» */
await ana.setInputFiles('#fCredGal', FOTO); await lectura();
ok('una foto sin nombre: «no se alcanzó a leer»', /no se alcanz/i.test(await ana.textContent('#credLectura')) && !(await ana.isVisible('#bQueRevisen')));
await ana.setInputFiles('#fCredGal', FOTO); await lectura();
ok('a la segunda ofrece que la revise la cooperativa', await ana.isVisible('#bQueRevisen'));
/* 3 · la suya */
await ana.fill('#cCorreo', ''); await ana.fill('#cClave', '');
await ana.setInputFiles('#fCredGal', await credencial('ANA PAOLA|PÉREZ LÓPEZ'));
ok('con SU credencial: «coincide con tu cuenta»', (await lectura()) != null && /coincide con tu cuenta/i.test(await ana.textContent('#credLectura')), await ana.textContent('#credLectura'));
await foto(ana, 'credencial-suya');
ok('la foto se ve antes de mandarla', (await tarda(ana, () => !!document.querySelector('#credVista img'), null, 5000)) != null);
const peso = await ana.evaluate(() => document.querySelector('#credVista img').src.length);
ok(`y va achicada (${Math.round(peso / 1024)} KB, menos de 100)`, peso <= 100000);
ok('con la foto pero sin correo sigue apagado', await ana.isDisabled('#bMandarCred'));
await ana.fill('#cCorreo', 'ana.p@escuela.mx'); await ana.fill('#cClave', 'torta2026');
ok('con foto, correo y contraseña se prende', !(await ana.isDisabled('#bMandarCred')));
await foto(ana, 'cuenta');
await ana.click('#bMandarCred');
ok('al mandarla, ya puede pedir', (await tarda(ana, () => !document.querySelector('#p-menu').hidden, null, 8000)) != null);
const cod = await ana.evaluate(() => FADORI.yo().codigo);
ok('su cuenta queda «en revisión» y con correo', await ana.evaluate(() => FADORI.yo().verif === 'pendiente' && /an•••@escuela\.mx/.test(FADORI.yo().protegida || '')));
await ana.reload(); await ana.waitForFunction(() => window.FADORI && FADORI.yo());
ok('al volver a abrir la app NO se la vuelve a pedir', (await tarda(ana, () => document.querySelector('#p-credencial').hidden && !document.querySelector('#p-menu').hidden, null, 6000)) != null);

console.log('\n2 · La cooperativa la revisa en el mostrador y la foto se va');
const most = await mostrador();
ok('el mostrador avisa que hay una por revisar', (await tarda(most, () => /1 credencial por revisar/.test(document.querySelector('#porRevisar').textContent), null, 25000)) != null);
await most.click('#bRevisar');
await foto(most, 'revisar');
ok('se ve la foto con el nombre y el grupo', await most.isVisible('.cred-rev img') && /Ana P/.test(await most.textContent('.cred-rev')) && /3B/.test(await most.textContent('.cred-rev')));
ok('y dice que la app ya leyó que el nombre coincide', /el nombre coincide/.test(await most.textContent('.cred-rev')));
/* un pedido de una cuenta todavía sin revisar sale marcado */
await most.click('#hCerrar');
const pid = await ana.evaluate(() => { const F = FADORI, d = F.productos(true).filter(p => p.disponible); return F.pedir(F.yo().codigo, [{ prod: d[0].id, cant: 1 }], {}).id; });
ok('su pedido le llega al mostrador marcado «credencial por revisar»', (await tarda(most, (id) => { const r = [...document.querySelectorAll('#cola .renglon, #actual')].find(x => x.innerHTML.includes('credencial por revisar')); return !!r; }, pid, 12000)) != null);
ok('y con su correo completo y «primer pedido»', (await tarda(most, () => /ana\.p@escuela\.mx/.test(document.body.innerText) && /primer pedido/.test(document.body.innerText), null, 8000)) != null,
  await most.evaluate(() => [...document.querySelectorAll('.dato-cuenta')].map(x => x.textContent).join(' | ')));
await foto(most, 'mostrador-cuenta');
await most.click('#bRevisar');
await most.click('.cred-rev [data-cred-si]');
ok('«Es él/ella» quita el aviso', (await tarda(most, () => !document.querySelector('#porRevisar').textContent.trim(), null, 6000)) != null);
ok('…y la marca del pedido', (await tarda(most, () => !document.body.innerHTML.includes('credencial por revisar') || !document.querySelector('#cola').innerHTML.includes('sin-verif'), null, 6000)) != null);
ok('a Ana le llega «Cuenta verificada»', (await tarda(ana, () => FADORI.yo() && FADORI.yo().verif === 'si', null, 12000)) != null);
await ana.click('#bPestYo').catch(async () => { await ana.evaluate(() => document.querySelector('[data-pest="yo"], #tabYo') && document.querySelector('[data-pest="yo"], #tabYo').click()); });

console.log('\n3 · «Lo mío» dice cómo está la cuenta');
await ana.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Lo mío/.test(x.textContent)); b && b.click(); });
await ana.waitForSelector('#miCuenta #bProteger', { timeout: 6000 });
ok('«Lo mío» dice que está verificada', /verificada/.test(await ana.textContent('#miCuenta')));
ok('y «Protegida con an•••@escuela.mx»', /an•••@escuela\.mx/.test(await ana.textContent('#miCuenta')));
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

console.log('\n6 · Sin correo ni credencial, el servidor no deja pedir');
const beto = await aparato('/fadori/', { credencial: true });
await beto.waitForSelector('#p-entrada:not([hidden])');
await beto.fill('#eNombre', 'Beto R'); await beto.fill('#eGrupo', '2C'); await beto.click('#bEntrar');
await beto.click('#bAcepto');
ok('la app lo detiene en «Tu cuenta, una vez»', (await tarda(beto, () => !document.querySelector('#p-credencial').hidden, null, 4000)) != null);
await beto.waitForTimeout(2500);   /* que su alta llegue al servidor */
const idB = await beto.evaluate(() => { const F = FADORI, d = F.productos(true).filter(p => p.disponible); return F.pedir(F.yo().codigo, [{ prod: d[0].id, cant: 1 }], {}).id; });
const rech = await tarda(beto, (id) => { const p = FADORI.estado().pedidos.find(x => x.id === id); return p && p.estado === 'cancelado' && p.rechazo ? p.rechazo : null; }, idB, 12000);
ok('y si se lo salta a la mala, el servidor lo rechaza', rech != null);
ok('con el motivo: «necesitas tu correo y la foto de tu credencial»', await beto.evaluate((id) => /correo y la foto de tu credencial/.test((FADORI.estado().pedidos.find(x => x.id === id) || {}).rechazo || ''), idB));
ok('…y el mostrador nunca lo ve', !(await most.evaluate((id) => FADORI.estado().pedidos.some(p => p.id === id && p.estado !== 'cancelado'), idB)));

console.log('\n6b · Una credencial, una cuenta (Carlos, 15 de octubre)');
const cami = await aparato('/fadori/', { credencial: true });
await cami.waitForSelector('#p-entrada:not([hidden])');
await cami.fill('#eNombre', 'Ana P'); await cami.fill('#eGrupo', '2A'); await cami.click('#bEntrar');
await cami.click('#bAcepto');
await tarda(cami, () => !document.querySelector('#p-credencial').hidden || null, null, 4000);
await cami.waitForTimeout(2500);   /* que su alta llegue al servidor */
const lecturaC = () => tarda(cami, () => { const e = document.querySelector('#credLectura'); return e && !e.hidden && !e.classList.contains('leyendo') ? e.className : null; }, null, 60000);
await cami.setInputFiles('#fCredGal', await credencial('ANA PAOLA|PÉREZ LÓPEZ'));
ok('el lector dice que coincide (la credencial es de «Ana P»)', (await lecturaC()) != null && /coincide con tu cuenta/i.test(await cami.textContent('#credLectura')), await cami.textContent('#credLectura'));
await cami.fill('#cCorreo', 'otra.ana@escuela.mx'); await cami.fill('#cClave', 'torta2026');
await cami.click('#bMandarCred');
ok('pero la credencial de Ana ya está en su cuenta: el servidor no la deja usar en otra', (await tarda(cami, () => /ya está en otra cuenta/.test(document.querySelector('#credLectura').textContent) || null, null, 8000)) != null, await cami.textContent('#credLectura'));
ok('…y la nueva cuenta sigue sin poder pedir', await cami.evaluate(() => !document.querySelector('#p-credencial').hidden));
/* otra foto de la misma credencial puede leer una letra distinta: tampoco pasa */
const casi = await cami.evaluate(async () => FADORI.subirCredencial(FADORI.yo().codigo, 'data:image/jpeg;base64,AAAA', 'coincide', 'ANA PAOLA PERES LOPEZ'));
ok('con una letra mal leída («PERES») tampoco: 409', casi.estado === 409 && casi.credOcupada, casi);
const ajena = await cami.evaluate(async () => FADORI.subirCredencial(FADORI.yo().codigo, 'data:image/jpeg;base64,AAAA', 'coincide', 'ANA PAOLA RAMOS LOPEZ'));
ok('una credencial de otra persona (otro apellido) sí pasa', ajena.ok, ajena);

console.log('\n7 · Tamaños y errores');
for(const [n, pg] of [['Ana', ana], ['otro', otro]]){
  for(const w of [320, 390]){ await pg.setViewportSize({ width: w, height: 800 }); await pg.waitForTimeout(150);
    const d = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(`${n}: nada se sale a ${w}`, d <= 0, d); }
}
for(const [n, pg] of [['Ana', ana], ['otro', otro], ['tercero', tercero], ['Beto', beto], ['Cami', cami], ['mostrador', most]])
  ok(`${n}: sin errores (${pg.errores.slice(0, 2).join(' | ')})`, !pg.errores.length);

console.log(`\n${fallas.length ? '✗ ' + fallas.length + ' fallas' : '✓ todo bien'} · escuela de prueba ${CASA}`);
await cerrar();
process.exit(fallas.length ? 1 : 0);
