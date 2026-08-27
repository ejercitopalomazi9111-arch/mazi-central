/* ══════════════════════════════════════════════════════════════════════════
   EL CEREBRO · pruebas
   ──────────────────────────────────────────────────────────────────────────
     node cerebro/pruebas.mjs

   Lo que se prueba es lo que haría INÚTIL al cerebro: que la búsqueda no
   encuentre lo que uno describe con sus palabras, que las ligas apunten a
   nada, o que se pueda meter una neurona a medias.
   ═════════════════════════════════════════════════════════════════════════ */
import { cargar, aplanar, buscar, vecinas, revisar, agregar, OBLIGATORIOS } from './cerebro.mjs';

let bien = 0, mal = 0;
const ok = (q, cierto) => {
  if(cierto){ bien++; console.log(`  ✓ ${q}`); }
  else{ mal++; console.log(`  ✗ ${q}`); }
};

const areas = await cargar();
const todas = aplanar(areas);

console.log('\n· Integridad');
{
  const r = revisar(areas);
  ok(`hay neuronas (${r.total})`, r.total >= 20);
  ok('ninguna liga rota ni campo faltante', r.fallas.length === 0);
  if(r.fallas.length) r.fallas.forEach(f => console.log(`      ${f}`));

  ok('todas traen señales en lenguaje de persona',
     todas.every(n => (n.senales || []).length >= 2));
  ok('todas dicen de dónde salieron',
     todas.every(n => typeof n.salioDe === 'string' && n.salioDe.length > 3));

  /* Que se llamen entre sí es la mitad del punto: una neurona suelta es un
     apunte, y los apuntes no evitan que vuelva a pasar. */
  const conVecinas = todas.filter(n => (n.vecinas || []).length).length;
  ok(`la mayoría lleva a otras (${conVecinas}/${todas.length})`,
     conVecinas >= todas.length * 0.7);
}

console.log('\n· Buscar como habla una persona');
{
  /* Cada caso es cómo lo DIRÍA alguien con el problema enfrente, no el
     término técnico. Si supiera el término, ya lo habría arreglado. */
  const casos = [
    ['se ve chiquito en el celular',            'falta-el-viewport'],
    ['los acentos salen raros',                 'charset-que-no-manda-el-servidor'],
    ['sólo el primero funciona',                'bandera-global-primera-vez'],
    ['ya lo arreglé y me sigue saliendo mal',   'ajuste-guardado-por-documento'],
    ['las pruebas pasan pero el bug sigue',     'pruebas-que-no-prueban-nada'],
    ['se ilumina y no abre',                    'ventana-nueva-bloqueada'],
    ['la página no carga, already been declared','funcion-duplicada'],
    ['no me contesta el otro agente',           'conectado-no-es-vivo'],
    ['se acabó el saldo muy rápido',            'cada-mensaje-es-un-turno'],
    ['en mi repo sí está pero no se ve',        'verificar-lo-publicado'],
  ];
  for(const [pregunta, esperado] of casos){
    const r = buscar(todas, pregunta);
    const donde = r.findIndex(n => n.id === esperado);
    ok(`«${pregunta}» → ${esperado}`, donde >= 0 && donde < 3);
    if(donde < 0) console.log(`      salió: ${r.slice(0,3).map(n => n.id).join(', ') || 'nada'}`);
    else if(donde >= 3) console.log(`      quedó en el lugar ${donde + 1}`);
  }

  ok('buscar vacío no truena', buscar(todas, '').length === 0);
  ok('algo que no existe devuelve nada',
     buscar(todas, 'zzzqqq').length === 0);
  ok('la búsqueda ignora acentos',
     buscar(todas, 'codificacion').length === buscar(todas, 'codificación').length);
}

console.log('\n· Que se llamen entre sí');
{
  const r = vecinas(todas, 'renombrar-de-un-lado');
  ok('una neurona trae vecinas', !r.error && r.vecinas.length > 0);
  ok('las declaradas vienen primero', r.vecinas[0].porQue === 'declarada');
  ok('ninguna vecina es ella misma', !r.vecinas.some(v => v.id === 'renombrar-de-un-lado'));

  /* Lo que hace que el cerebro sirva de verdad: descubre parentescos que
     nadie escribió a mano. */
  const halladas = r.vecinas.filter(v => v.porQue !== 'declarada');
  ok('encuentra parecidas por señal, no sólo las declaradas', halladas.length > 0);

  const mala = vecinas(todas, 'no-existe-esta');
  ok('pedir vecinas de una que no existe da error claro', !!mala.error);
}

console.log('\n· Que no entre basura');
{
  const r1 = await agregar({ id:'a-medias', titulo:'x' }, 'estado');
  ok('una neurona incompleta se rechaza', !!r1.error && /faltan/i.test(r1.error));

  const completa = Object.fromEntries(OBLIGATORIOS.map(c =>
    [c, c === 'senales' ? ['x','y'] : 'algo']));
  completa.id = 'ver-la-pantalla';                 /* id que ya existe */
  const r2 = await agregar(completa, 'diagnostico');
  ok('un id repetido se rechaza', !!r2.error && /ya hay/i.test(r2.error));

  completa.id = 'nueva-de-prueba';
  const r3 = await agregar(completa, 'area-inventada');
  ok('un área que no existe se rechaza', !!r3.error && /no existe el área/i.test(r3.error));
}

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
