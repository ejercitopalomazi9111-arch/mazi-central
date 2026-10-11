#!/usr/bin/env node
/* El buzón de la pantalla: subir en pedazos, bajar idéntico, y que nadie sin
   el pasador lo toque.   API=http://127.0.0.1:8791 node servidor/prueba-medios.mjs */
import crypto from 'crypto';
const API = process.env.API || 'http://127.0.0.1:8791', CASA = 'medios-' + Date.now();
let bien = 0, mal = 0; const ok = (q, c, x) => { if(c){ bien++; console.log('  ✓ ' + q); } else { mal++; console.log('  ✗ ' + q + (x ? ' · ' + x : '')); } };
const ap = () => crypto.randomBytes(16).toString('hex');
const pide = async (ruta, { metodo = 'POST', cuerpo, admin, aparato = ap(), query = {} } = {}) => {
  const h = { 'x-fadori-aparato': aparato }; if(admin) h['x-fadori-admin'] = admin;
  let body = cuerpo; if(cuerpo && !(cuerpo instanceof Uint8Array)){ h['content-type'] = 'application/json'; body = JSON.stringify(cuerpo); } else if(cuerpo) h['content-type'] = 'application/octet-stream';
  const r = await fetch(API + ruta + '?' + new URLSearchParams(Object.assign({ casa: CASA }, query)), { method: metodo, headers: h, body });
  return r;
};
const tel = ap();
const e = await (await pide('/api/entrar', { cuerpo: { pasador: '121026' }, aparato: tel })).json();
const ADMIN = e.token;
ok('el teléfono de Carlos entra con el pasador', !!ADMIN);
const datos = crypto.randomBytes(3.6e6), id = 'ep' + crypto.randomBytes(5).toString('hex');
let r = await pide('/api/medios/alta', { cuerpo: { id, tipo: 'ep', clase: 'archivo', nombre: 'Episodio 6', mime: 'video/mp4', tam: datos.length } });
ok('sin el pasador no se sube nada', r.status === 401);
r = await pide('/api/medios/alta', { cuerpo: { id, tipo: 'ep', clase: 'archivo', nombre: 'Episodio 6', mime: 'video/mp4', tam: datos.length }, admin: ADMIN, aparato: tel });
const alta = await r.json();
ok('con el pasador se da de alta, en pedazos', r.status === 200 && alta.partes === 3, JSON.stringify(alta));
r = await pide('/api/medios/lista', { cuerpo: {}, admin: ADMIN });
ok('a medias no sale en la lista (la tablet no baja algo incompleto)', !(await r.json()).medios.some(m => m.id === id));
for(let k = 0; k < alta.partes; k++){
  const p = new Uint8Array(datos.subarray(k * alta.parte, (k + 1) * alta.parte));
  r = await pide('/api/medios/parte', { cuerpo: p, admin: ADMIN, aparato: tel, query: { id, k } });
}
ok('el último pedazo lo deja listo', (await r.json()).listo === true);
const tablet = ap(), et = await (await pide('/api/entrar', { cuerpo: { pasador: '121026' }, aparato: tablet })).json();
r = await pide('/api/medios/lista', { cuerpo: {}, admin: et.token, aparato: tablet });
const lista = (await r.json()).medios, m = lista.find(x => x.id === id);
ok('la tablet lo ve en la lista con su nombre y su tamaño', m && m.nombre === 'Episodio 6' && m.tam === datos.length);
const partes = [];
for(let k = 0; k < m.partes; k++){ const x = await pide('/api/medios/parte', { metodo: 'GET', admin: et.token, aparato: tablet, query: { id, k } }); partes.push(Buffer.from(await x.arrayBuffer())); }
ok('y lo baja idéntico, byte por byte', Buffer.concat(partes).equals(datos));
r = await pide('/api/medios/parte', { metodo: 'GET', aparato: ap(), query: { id, k: 0 } });
ok('un teléfono sin pasador no puede bajarlo', r.status === 401);
r = await pide('/api/medios/alta', { cuerpo: { id: 'yt' + crypto.randomBytes(4).toString('hex'), tipo: 'rel', clase: 'youtube', nombre: 'Lista', embed: 'https://www.youtube-nocookie.com/embed/videoseries?list=X' }, admin: ADMIN });
ok('un enlace de YouTube también viaja (sin pedazos)', r.status === 200);
r = await pide('/api/medios/alta', { cuerpo: { id: 'malo1234', tipo: 'rel', clase: 'youtube', nombre: 'x', embed: 'https://malo.com/x' }, admin: ADMIN });
const lst = (await (await pide('/api/medios/lista', { cuerpo: {}, admin: ADMIN })).json()).medios;
ok('un enlace que no es de YouTube ni Spotify se guarda sin dirección', !lst.find(x => x.id === 'malo1234').embed);
r = await pide('/api/medios/alta', { cuerpo: { id: 'gigante1', tipo: 'ep', clase: 'archivo', nombre: 'x', tam: 2e9 }, admin: ADMIN });
ok('uno de 2 GB se rechaza con su razón', r.status === 413 && /720p/.test((await r.json()).error));
await pide('/api/medios/borrar', { cuerpo: { id }, admin: ADMIN });
const tras = await (await pide('/api/medios/lista', { cuerpo: {}, admin: ADMIN })).json();
ok('al borrarlo se va de la lista y queda la marca para que las pantallas lo quiten', !tras.medios.some(x => x.id === id) && tras.borrados.some(b => b.id === id));
console.log(`\n${mal ? '✗' : '✓'} medios · ${bien}/${bien + mal}`); process.exit(mal ? 1 : 0);
