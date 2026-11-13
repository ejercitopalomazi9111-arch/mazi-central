/* ¿La foto sí es del tema? (pertinente en sala/lienzo.js). En «Elige la imagen», la de «Corazón» salió una bodega.
   node sala/pruebas-fotos.mjs */
const s = (await import('node:fs')).readFileSync(new URL('./lienzo.js', import.meta.url), 'utf8');
const i = s.indexOf('const VACIAS_IMG'), j = s.indexOf('export function buscarImagen');
const code = s.slice(i, j).replace('export function pertinente','function pertinente') + '; return pertinente;';
const pertinente = new Function(code)();
const casos = [
 ['Corazón humano', { type:'standard', title:'Corazón', description:'órgano muscular' }, true],
 ['Corazón humano', { type:'standard', title:'Corazón (película)', description:'película de 2010' }, false],
 ['Corazón humano', { type:'standard', title:'Nave industrial', description:'edificio' }, false],
 ['Corazón', { type:'disambiguation', title:'Corazón', description:'' }, false],
 ['Mitocondria', { type:'standard', title:'Mitocondria', description:'orgánulo celular' }, true],
 ['Pulmones', { type:'standard', title:'Pulmón', description:'órgano' }, true],
 ['Río Nilo', { type:'standard', title:'Nilo', description:'río de África' }, true],
 ['Benito Juárez', { type:'standard', title:'Benito Juárez', description:'presidente de México' }, true],
];
let mal = 0;
for(const [q, j, esp] of casos){ const r = pertinente(q, j); if(r !== esp) mal++; console.log(r === esp ? '  ✓' : '  ✗', q, '→', j.title, r ? 'sí' : 'no'); }
console.log(`\n${casos.length - mal} pasan · ${mal} fallan`); process.exit(mal ? 1 : 0);
