/* Las cuentas y la tabla de líderes de Puercos 2, contra el servidor de verdad.
 *   cd juegos/servidor && npx wrangler dev --port 8815 --local
 *   node juegos/guerra-de-puercos/v2/pruebas/cuentas.mjs [http://127.0.0.1:8815]
 * Usa apodos al azar, así se puede correr contra producción sin chocar. */
const S = process.argv[2] || 'http://127.0.0.1:8815';
let bien = 0, mal = 0;
const ok = (q, c, d = '') => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (d ? '  → ' + d : '')); } };
const post = (r, b) => fetch(S + '/api/puercos/' + r, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(async x => ({ s: x.status, j: await x.json().catch(() => ({})) }));
const sufijo = Math.random().toString(36).slice(2, 7);
const apodo = 'Prueba ' + sufijo, pin = '4821';
const datos = (rev, v, d, m, n) => ({ rev, monedas: m, stats: { victorias: v, derrotas: d, partidas: v + d }, cartas: Object.fromEntries(Array.from({ length: n }, (_, i) => ['c' + i + '·1', 1])) });

console.log('crear y entrar');
let r = await post('cuenta/crear', { apodo, pin, datos: datos(3, 2, 1, 50, 10) });
ok('se crea con apodo y PIN', r.s === 200 && r.j.token && r.j.token.length === 48, JSON.stringify(r));
const t1 = r.j.token;
r = await post('cuenta/crear', { apodo: apodo.toUpperCase(), pin: '1111' });
ok('el mismo apodo con otras mayúsculas ya está tomado', r.s === 409, r.s);
r = await post('cuenta/crear', { apodo: 'ab', pin });
ok('apodo de 2 letras no', r.s === 400);
r = await post('cuenta/crear', { apodo: '<script>x', pin });
ok('apodo con signos raros no', r.s === 400);
r = await post('cuenta/crear', { apodo: 'Otro ' + sufijo, pin: '12' });
ok('PIN de 2 números no', r.s === 400);
r = await post('cuenta/entrar', { apodo: apodo.toLowerCase(), pin });
ok('entra con el PIN bueno y le regresa sus cartas', r.s === 200 && r.j.datos && Object.keys(r.j.datos.cartas).length === 10, JSON.stringify(r).slice(0, 200));
const t2 = r.j.token;
ok('entrar da una sesión nueva', t2 && t2 !== t1);

console.log('guardar');
r = await post('cuenta/guardar', { token: t1, datos: datos(4, 3, 1, 60, 11) });
ok('la sesión del otro teléfono sigue sirviendo (la misma cuenta en dos teléfonos)', r.s === 200 && r.j.bien, JSON.stringify(r).slice(0, 160));
r = await post('cuenta/guardar', { token: t2, datos: datos(5, 3, 1, 60, 12) });
ok('guarda con la sesión buena', r.s === 200 && r.j.bien);
r = await post('cuenta/guardar', { token: t2, datos: datos(2, 0, 0, 0, 1) });
ok('una copia más vieja no pisa: le regresa la nueva', r.s === 200 && r.j.viejo && r.j.datos && Object.keys(r.j.datos.cartas).length === 12);
r = await post('cuenta/guardar', { token: t2, datos: datos(6, 300, 1, 60, 12) });
ok('300 victorias de golpe no cuadran', r.s === 422);
r = await post('cuenta/guardar', { token: 'x'.repeat(48), datos: datos(7, 1, 1, 1, 1) });
ok('un token inventado no guarda', r.s === 401);

console.log('PIN malo');
let ultimo;
for(let i = 0; i < 5; i++) ultimo = await post('cuenta/entrar', { apodo, pin: '0000' });
ok('PIN malo dice que no, sin decir cuál de los dos falló', ultimo.s === 401 && /no coinciden/.test(ultimo.j.error));
r = await post('cuenta/entrar', { apodo, pin });
ok('a los 5 malos hay que esperar, aunque ya ponga el bueno', r.s === 429, r.s + ' ' + JSON.stringify(r.j));
r = await post('cuenta/entrar', { apodo: 'nadie ' + sufijo, pin });
ok('un apodo que no existe dice lo mismo que un PIN malo', r.s === 401 && /no coinciden/.test(r.j.error));

console.log('tabla de líderes');
const l = await fetch(S + '/api/puercos/lideres').then(x => x.json());
const fila = (k) => (l[k] || []).find(x => x.apodo === apodo);
ok('sale en victorias con 3', fila('victorias')?.n === 3, JSON.stringify(l.victorias?.slice(0, 3)));
ok('sale en monedas con 60', fila('monedas')?.n === 60);
ok('sale en cartas con 12', fila('cartas')?.n === 12);
ok('sale en derrotas con 1', fila('derrotas')?.n === 1);
ok('la tabla no trae PIN, huella, sal ni token', !JSON.stringify(l).match(/huella|sal"|token|pin/i));
ok('cuenta cuántos jugadores hay', l.jugadores >= 1);

console.log('amigos y retos');
const ana = 'Ana ' + sufijo, beto = 'Beto ' + sufijo, caro = 'Caro ' + sufijo;
const tA = (await post('cuenta/crear', { apodo: ana, pin: '1111' })).j.token;
const tB = (await post('cuenta/crear', { apodo: beto, pin: '2222' })).j.token;
const tC = (await post('cuenta/crear', { apodo: caro, pin: '3333' })).j.token;
const lista = async (t) => (await post('amigos', { token: t })).j;
r = await post('reto', { token: tA, apodo: beto, codigo: 'ABCD' });
ok('no se puede retar a quien no es tu amigo', r.s === 400);
r = await post('amigos/pedir', { token: tA, apodo: beto.toUpperCase() });
ok('Ana le pide amistad a Beto (sin importar mayúsculas)', r.s === 200 && r.j.bien);
ok('a Beto le aparece la solicitud de Ana', (await lista(tB)).piden.includes(ana));
ok('Ana la ve como mandada, todavía no amiga', (await lista(tA)).mandadas.includes(beto) && !(await lista(tA)).amigos.length);
r = await post('amigos/aceptar', { token: tA, apodo: beto });
ok('Ana no puede aceptar su propia solicitud', r.s === 400);
r = await post('amigos/aceptar', { token: tB, apodo: ana });
ok('Beto acepta', r.s === 200);
ok('ya son amigos los dos', (await lista(tA)).amigos.some(x => x.apodo === beto) && (await lista(tB)).amigos.some(x => x.apodo === ana));
ok('Beto sale «en línea» porque acaba de usar la app', (await lista(tA)).amigos.find(x => x.apodo === beto)?.enLinea === true);
r = await post('amigos/pedir', { token: tC, apodo: ana }); r = await post('amigos/pedir', { token: tA, apodo: caro });
ok('si los dos se piden, quedan como amigos', (await lista(tC)).amigos.some(x => x.apodo === ana));
r = await post('reto', { token: tA, apodo: beto, codigo: 'QWER' });
ok('Ana reta a Beto con un código de sala', r.s === 200);
ok('a Beto le llega el reto con el código', (await lista(tB)).retos.some(x => x.de === ana && x.codigo === 'QWER'));
r = await post('reto', { token: tA, apodo: beto, codigo: 'qw<' });
ok('un código raro no se acepta', r.s === 400);
r = await post('reto/borrar', { token: tB, apodo: ana });
ok('Beto contesta y el reto se borra', r.s === 200 && !(await lista(tB)).retos.length);
r = await post('amigos/pedir', { token: tA, apodo: 'nadie ' + sufijo });
ok('pedirle a un apodo que no existe lo dice', r.s === 404);
r = await post('amigos/pedir', { token: tA, apodo: ana });
ok('no te puedes agregar a ti mismo', r.s === 400);
r = await post('amigos/quitar', { token: tB, apodo: ana });
ok('quitar amigo lo quita de los dos lados', r.s === 200 && !(await lista(tA)).amigos.some(x => x.apodo === beto));
r = await post('amigos', { token: 'z'.repeat(48) });
ok('sin sesión no se ven amigos', r.s === 401);

console.log('\n' + (mal ? '✗' : '✓') + ` ${bien}/${bien + mal}`);
process.exit(mal ? 1 : 0);
