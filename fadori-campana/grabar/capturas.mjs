/* LAS CAPTURAS DE LA APP que van en los pósters (img/app-*.png), sacadas de
   la app de verdad a 1170×2532 (un iPhone a 3x). Son las 9:43 en México: el
   recreo es de 10:00 a 10:30 (Carlos, 15 de octubre), así que la app dice
   «para el recreo 17 min» y «el recreo empieza a las 10:00».

   Correr:  LOCAL=1 API_LOCAL=http://127.0.0.1:8791 node fadori-campana/grabar/capturas.mjs */
const { abrirMesa } = await import('../../fadori/mesa-de-pruebas.mjs');
import path from 'path';
const IMG = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'img');
const hoy = new Date(); hoy.setUTCHours(15, 43, 0, 0);
const desfase = hoy.getTime() - Date.now(), zona = 'America/Mexico_City';
const M = await abrirMesa('capturas');
const most = await M.mostrador({ desfase, zona });
const pedir = (pg, ps) => pg.evaluate(ps => { const F = FADORI, d = F.productos(true).filter(p => p.disponible && p.foto); return F.pedir(F.yo().codigo, ps.map(i => ({ prod: d[i % d.length].id, cant: 1 })), {}).id; }, ps);
const al = [];
for(const [n, g] of [['Ana Pérez', '3.1'], ['Beto Ruiz', '2B'], ['Caro Silva', '1A'], ['Dani Mora', '3.2'], ['Eli Torres', '2A'], ['Fer Gómez', '1B'], ['Gabi Luna', '3.1']]){
  const pg = await M.aparato('/fadori/', { desfase, zona, escala: 3, tema: 'claro' }); al.push(await M.alumno(n, g, pg));
}
const ids = [];
for(let i = 0; i < al.length - 1; i++){ await al[i].reload(); await al[i].waitForTimeout(1500); ids.push(await pedir(al[i], [i % 5, (i + 3) % 7])); }
if(await M.tarda(most, ids => ids.every(i => FADORI.pedido(i)) || (FADORI.cargar && FADORI.cargar(), null), ids, 30000) == null) throw new Error('el mostrador no ve los pedidos');
await most.evaluate(ids => { const F = FADORI; for(const id of ids.slice(0, 2)){ F.tomar(id, 'S'); F.marcarListo(id); } for(const id of ids.slice(2, 4)) F.tomar(id, 'S'); }, ids);
await most.waitForTimeout(3000);
const turno = async (pg) => { await pg.reload(); await pg.waitForTimeout(2500); await pg.click('#pulgar [data-ir="turno"]'); await pg.waitForTimeout(1500); };
await turno(al[5]); await al[5].screenshot({ path: path.join(IMG, 'app-turno-fila.png') });
await turno(al[1]); await al[1].screenshot({ path: path.join(IMG, 'app-turno-listo.png') });
const g = al[6]; await g.reload(); await g.waitForTimeout(2500);
const dice = await g.textContent('#estadoFila');
if(!/10:00/.test(dice)) throw new Error('la app no dice 10:00: ' + dice);
await g.screenshot({ path: path.join(IMG, 'app-menu.png') });
await g.evaluate(() => window.scrollBy(0, 640)); await g.waitForTimeout(700); await g.screenshot({ path: path.join(IMG, 'app-menu2.png') });
await g.evaluate(() => window.scrollBy(0, 900)); await g.waitForTimeout(700); await g.screenshot({ path: path.join(IMG, 'app-menu3.png') });
console.log('✓ capturas · la app dice:', dice.replace(/\s+/g, ' ').trim());
await M.cerrar();
