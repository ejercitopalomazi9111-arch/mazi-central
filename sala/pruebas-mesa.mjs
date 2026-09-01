/* Prueba del campo para pegar la llave. Levanta la sala local con llave puesta
   y comprueba el caso EXACTO de Carlos: un aparato sin llave guardada y sin
   poder ponerla en la URL. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const pg=await (await b.newContext({viewport:{width:390,height:844},hasTouch:true})).newPage();
const err=[]; pg.on('pageerror',e=>err.push(e.message));
let f=0; const ok=(c,t)=>{ console.log((c?'  ✓ ':'  ✗ ')+t); if(!c) f++; };

await pg.goto('http://127.0.0.1:8792/sala/?sala=PRUEBA',{waitUntil:'networkidle'});
await pg.waitForTimeout(500);
ok(await pg.locator('#pegarLlave').isHidden(), 'el campo de llave NO se enseña de entrada');

/* Se fuerza el error de llave, que es el camino que importa. */
await pg.evaluate(()=>{ asomarPegarLlave({message:'Esta sala tiene llave puesta (401)'}); });
ok(await pg.locator('#pegarLlave').isVisible(), 'y sí aparece cuando el rechazo es por la llave');
await pg.evaluate(()=>{ document.getElementById('pegarLlave').hidden = true;
                        asomarPegarLlave({message:'El código son 6 letras.'}); });
ok(await pg.locator('#pegarLlave').isHidden(), 'pero no ante un error que no es de llave');

/* El pegado: link completo, link de agente y llave pelada. */
const saca = (t) => pg.evaluate((x)=>llaveDePegado(x), t);
ok(await saca('https://x.dev/sala/?sala=GRUPAZ&llave=abc123') === 'abc123', 'saca la llave de un link de persona');
ok(await saca('https://sala.x.dev/entrar/GRUPAZ?llave=abc123') === 'abc123', 'y de un link de agente');
ok(await saca('  abc123  ') === 'abc123', 'y acepta la llave pelada con espacios');
ok(await saca('"abc123"') === 'abc123', 'y con comillas de un copiado torpe');
ok(await saca('') === '', 'y no inventa nada si no le pegan nada');
/* El caso que importa: se guarda y sobrevive a cerrar y abrir, que es lo que
   hace el acceso directo del iPhone. */
/* Se vuelve a abrir: el paso anterior lo cerró a propósito. */
await pg.evaluate(()=>{ asomarPegarLlave({message:'llave'}); });
await pg.fill('#llaveIn','https://x.dev/sala/?sala=GRUPAZ&llave=guardada99');
await Promise.all([pg.waitForLoadState('load'), pg.click('#bGuardarLlave')]);
await pg.waitForTimeout(600);
ok(await pg.evaluate(()=>localStorage.getItem('salaLlave')) === 'guardada99',
   'al guardarla queda en este aparato, sin pasar por la URL');
ok(err.length===0, 'cero errores'+(err.length?': '+err[0]:''));

/* ══ LO QUE SE PUEDE TOCAR DENTRO DE UN MENSAJE ═══════════════════════════
   Y sobre todo: LO QUE NO SE PUEDE INYECTAR. Convertir direcciones en ligas
   quiere decir meter HTML en algo que escribió otra persona, y en esta sala
   escriben agentes y gente de dos cuentas distintas. Si el escapado se hiciera
   después de buscar direcciones en vez de antes, un mensaje bien armado
   ejecutaría lo que quisiera en la pantalla del otro. */
console.log('\n── el texto de un mensaje ──');
const pinta = (t) => pg.evaluate((x) => conCodigo(x), t);

const veneno = await pinta('<img src=x onerror="alert(1)"> y <script>alert(2)</scr' + 'ipt>');
ok(!/<img|<script/i.test(veneno), 'el HTML que alguien escriba se queda como texto muerto');
ok(veneno.includes('&lt;img'), 'y se ve escapado, no desaparecido');

const conLiga = await pinta('mira https://github.com/x/y/pull/9 va');
ok(/<a class="liga-msj" href="https:\/\/github.com\/x\/y\/pull\/9"/.test(conLiga),
   'una dirección se vuelve liga');
const puntoFinal = await pinta('mira https://x.dev/a.');
ok(/href="https:\/\/x.dev\/a"/.test(puntoFinal) && puntoFinal.endsWith('.'),
   'y el punto del final del renglón se queda fuera de la liga');

const ref = await pinta('quedó en #92 ya');
ok(/href="https:\/\/github.com\/[^"]+\/pull\/92"/.test(ref), '«#92» lleva al PR');
const noRef = await pinta('el color #63a y canal#3');
ok(!/liga-msj/.test(noRef), 'pero «#63a» y «canal#3» NO son ligas');

const jsUrl = await pinta('javascript:alert(1)');
ok(!/<a /.test(jsUrl), 'y una dirección `javascript:` nunca se vuelve liga');

/* ══ EL ZOOM DE iOS ═══════════════════════════════════════════════════════ */
console.log('\n── los campos ──');
const chicos = await pg.evaluate(() =>
  [...document.querySelectorAll('input, textarea, select')]
    .filter(e => parseFloat(getComputedStyle(e).fontSize) < 16)
    .map(e => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize));
ok(chicos.length === 0,
   'ningún campo baja de 16px, que es lo que dispara el zoom de iOS' + (chicos.length ? ': ' + chicos.join(', ') : ''));

/* ══ LA PESTAÑA QUE SOBRABA ═══════════════════════════════════════════════ */
ok(await pg.locator('[data-vista="hebras"]').count() === 0, 'la pestaña duplicada de hebras ya no está');
ok(await pg.evaluate(() => typeof mostrarVista === 'function' && !!document.getElementById('taller')),
   'pero la vista sigue viva y se llega desde el menú');

await b.close();
console.log(f? `\n✗ ${f} fallas` : '\n✓ todo pasa');
process.exit(f?1:0);
