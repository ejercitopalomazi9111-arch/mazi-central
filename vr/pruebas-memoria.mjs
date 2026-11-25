/* La memoria del narrador de MONARCH (vr/monarca/memoria.js): recuerda lo que hiciste y lo saca escenas después.
     node vr/pruebas-memoria.mjs */
import { crearMemoria, FRASES, TOPE } from './monarca/memoria.js';
import { LINEAS } from './monarca/narrador.js';
let ok = 0, mal = 0; const sí = (c, m) => { if(c){ ok++; console.log('✓ ' + m); } else { mal++; console.log('✗ ' + m); } };
const ORDEN = ['bienvenida', 'mariposa', 'ciclo', 'flores', 'migracion', 'cuerpo', 'santuario', 'tala', 'campo', 'decision', 'cuestionario', 'final'];

/* 1. el ejemplo de Carlos: manos en la bienvenida → la broma llega en la migración, no antes */
const O = { orden: ORDEN };
let m = crearMemoria(O); let dichos = [];
m.alEntrar('bienvenida'); m.apuntar('r-manos-juega', 'bienvenida'); m.apuntar('r-manos-juega', 'bienvenida');
for(const e of ORDEN.slice(1)){ const r = m.alEntrar(e); if(r) dichos.push([e, r]); }
sí(dichos.length && dichos[0][0] === 'migracion' && dichos[0][1] === 'm-manos-migracion', `manos en la bienvenida: la broma llega en la migración, como pidió Carlos (${dichos.map((d) => d.join(':')).join(', ')})`);
sí(!dichos.some(([e]) => ['bienvenida', 'cuestionario', 'final', 'decision'].includes(e)), 'nunca en el cuestionario, la decisión ni el final');

/* 2. si hay frase propia de la escena, gana: manos guardadas hasta la migración */
m = crearMemoria(O); m.alEntrar('bienvenida'); m.alEntrar('mariposa'); m.alEntrar('ciclo'); m.alEntrar('flores');
m.apuntar('r-saludo', 'flores'); /* en flores: todavía fresco */
sí(m.alEntrar('migracion') === null, 'lo de la escena anterior no se saca todavía (está fresco)');
sí(m.alEntrar('cuerpo') === 'm-manos-1', 'una escena después, la frase general de manos');

/* 3. la frase propia gana: lejos en la mariposa → santuario */
m = crearMemoria(O); m.alEntrar('bienvenida'); m.alEntrar('mariposa'); m.apuntar('r-lejos-2', 'mariposa');
const r3 = []; for(const e of ['ciclo', 'flores', 'migracion', 'cuerpo', 'santuario']){ const r = m.alEntrar(e); if(r) r3.push(r); }
sí(r3.length === 1, `cada recuerdo se usa UNA vez (${r3.join(', ')})`);

/* 4. tope de 3 por vuelta y nunca dos escenas seguidas */
m = crearMemoria(O); m.alEntrar('bienvenida');
for(const id of ['r-manos-juega', 'r-lejos-1', 'r-prisa-1', 'r-tocar-mariposa', 'r-quieto-1', 'r-vueltas-1']) m.apuntar(id, 'bienvenida');
const usados = []; let antes = -9;
ORDEN.slice(1).forEach((e, k) => { const r = m.alEntrar(e); if(r){ usados.push([k, r]); } });
sí(usados.length <= TOPE, `máximo ${TOPE} recuerdos por vuelta (${usados.length})`);
sí(usados.every(([k], i) => !i || k - usados[i - 1][0] >= 2), 'nunca en dos escenas seguidas');
sí(usados.some(([k, r]) => Object.values(FRASES).some((f) => f[ORDEN[k + 1]] === r)), `con muchos recuerdos, prefiere la frase hecha para la escena (${usados.map(([k, r]) => ORDEN[k + 1] + ':' + r).join(', ')})`);

/* 5. «Otra vez» empieza limpio */
m.reiniciar(); sí(m.alEntrar('mariposa') === null && m.st.recuerdos.length === 0, 'reiniciar borra los recuerdos');

/* 6. cada frase existe en el narrador, y ninguna dice cosas feas */
const todas = Object.values(FRASES).flatMap((f) => Object.values(f).flat());
sí(todas.every((id) => LINEAS[id]), 'cada frase de memoria tiene su renglón (y audio) en narrador.js');
const FEO = /\b(idiota|tont[oa]|estúpid\w*|grosero|grosería|pegar|culo|cog\w*|chingad\w*|pendej\w*|mens[oa]|sexy|nalga\w*|encuer\w*|desnud\w*|acostad[oa])\b/i;
const feas = Object.entries(LINEAS).filter(([, [, t]]) => FEO.test(t)).map(([k]) => k);
sí(!feas.length, `el narrador no insulta ni dice cosas de doble sentido${feas.length ? ': ' + feas.join(', ') : ''}`);
console.log(`${ok} bien · ${mal} mal`); process.exit(mal ? 1 : 0);
