/* ¿La foto del pizarrón es la correcta? (Carlos, 14 nov: «¿cuáles son las trompas de Falopio? y muestran una imagen de
   semen marcada como la correcta. Pues no, güey»). Ya no se busca en Wikipedia: sólo sale una foto del banco que está en
   la carpeta «Escuela», que Carlos marcó «lista» y cuyo título, temas o palabras traen TODAS las palabras buscadas.
   node sala/pruebas-fotos.mjs */
import { fotoVerificada, atenderBancoEscuela } from './servidor/banco.js';
let mal = 0; const ok = (c, t) => { if(!c) mal++; console.log(c ? '  ✓' : '  ✗', t); };
const F = (id, o) => ({ id, titulo: '', temas: [], palabras: [], estado: 'lista', carpeta: 'Escuela', descripcion: '', ...o });
const fichas = {
  trompas: F('trompas', { titulo: 'Trompas de Falopio', temas: ['aparato reproductor femenino', 'biología'], palabras: ['útero', 'ovario'] }),
  semen: F('semen', { titulo: 'Espermatozoides al microscopio', temas: ['aparato reproductor masculino'], palabras: ['semen'] }),
  corazon: F('corazon', { titulo: 'Corazón humano', temas: ['sistema circulatorio'], palabras: ['aurículas', 'ventrículos'] }),
  corazonSinRevisar: F('corazonSinRevisar', { titulo: 'Corazón humano (otra)', estado: 'sin-revisar' }),
  corazonCambios: F('corazonCambios', { titulo: 'Corazón humano dibujo', estado: 'cambios' }),
  bolsa: F('bolsa', { titulo: 'Bolsa de corazón', carpeta: "All's fashion", palabras: ['corazón'] }),
  celula: F('celula', { titulo: 'Célula animal', carpeta: 'Escuela · Biología', temas: ['células'] }),
};
const ids = (q) => fotoVerificada(fichas, q).map((x) => x.id);
ok(ids('trompas de Falopio')[0] === 'trompas' && !ids('trompas de Falopio').includes('semen'), 'las trompas de Falopio traen SU foto, nunca la de espermatozoides');
ok(!ids('semen').includes('trompas'), 'y al revés tampoco se cruzan');
ok(JSON.stringify(ids('corazón humano')) === '["corazon"]', 'del corazón sólo sale la verificada: ni la que está sin revisar, ni la que pide cambios, ni la bolsa de All\'s');
ok(ids('corazones').includes('corazon'), 'el plural también encuentra');
ok(ids('células').includes('celula') && ids('celula animal')[0] === 'celula', 'una subcarpeta de Escuela cuenta, y sin acentos encuentra');
ok(!ids('corazón de pollo').length, 'si falta una palabra de lo buscado («pollo»), no hay foto: mejor el dibujo');
ok(!ids('').length && !ids('de la el').length, 'una búsqueda vacía no trae nada');
/* la imagen sólo se entrega si es de las verificadas */
const almacen = { async get(k){ return k === 'banco:fichas' ? fichas : null; } };
const r1 = await atenderBancoEscuela(almacen, new Request('http://x/'), new URL('http://x/?id=bolsa&parte=mini'));
ok(r1.status === 404, 'pedir por id una foto que no es de la escuela da 404');
const r2 = await atenderBancoEscuela(almacen, new Request('http://x/'), new URL('http://x/?buscar=trompas%20de%20falopio'));
ok((await r2.json()).fotos[0].id === 'trompas', 'la ruta /banco-escuela contesta lo mismo');
const r3 = await atenderBancoEscuela(almacen, new Request('http://x/', { method: 'POST', body: '{}' }), new URL('http://x/'));
ok(r3.status === 405, 'y no deja escribir nada');
console.log(mal ? `\n${mal} fallan` : '\ntodas pasan'); process.exit(mal ? 1 : 0);
