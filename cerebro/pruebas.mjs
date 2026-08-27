/* ══════════════════════════════════════════════════════════════════════════
   EL CEREBRO · pruebas
   ──────────────────────────────────────────────────────────────────────────
     node cerebro/pruebas.mjs

   Lo que se prueba es lo que haría INÚTIL al cerebro: que la búsqueda no
   encuentre lo que uno describe con sus palabras, que las ligas apunten a
   nada, o que se pueda meter una neurona a medias.
   ═════════════════════════════════════════════════════════════════════════ */
import { cargar, aplanar, buscar, vecinas, revisar, agregar, grafo, claseDe,
         CAMPOS, OBLIGATORIOS } from './cerebro.mjs';

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
  /* `salioDe` se le pide a los ERRORES: de un bug uno quiere saber dónde nos
     mordió. A una pieza del proyecto o a una decisión no aplica — ésas no
     «salieron» de ningún lado, son el proyecto. */
  const errores = todas.filter(n => claseDe(n) === 'error');
  ok(`cada error dice dónde nos mordió (${errores.length})`,
     errores.every(n => typeof n.salioDe === 'string' && n.salioDe.length > 3));

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

  /* ── las muletillas ────────────────────────────────────────────────────
     Los casos de arriba están escritos con palabras con contenido, y por eso
     no cazaron el defecto: «qué estilo le pongo al sitio» devolvía 84 de 91
     neuronas con la de codificación de caracteres en primer lugar, porque
     `que` casa con el síntoma, la causa o el consejo de casi toda neurona en
     español. Una persona habla con muletillas; las pruebas tienen que hablar
     como la persona. */
  for(const [q, esperado] of [
    ['qué estilo le pongo al sitio',        'decision-escoger-estetica-antes'],
    /* Ojo con lo que se le pide: «qué tengo que hacer para publicar» se
       contesta con la lista de ANTES de lanzar, no con la de verificar lo ya
       publicado. Le puse la segunda y la prueba me corrigió. */
    ['qué es lo que tengo que hacer para publicar', 'pieza-lista-antes-de-lanzar'],
  ]){
    const r = buscar(todas, q);
    const donde = r.findIndex(n => n.id === esperado);
    ok(`«${q}» → ${esperado}`, donde >= 0 && donde < 3);
    if(donde < 0) console.log(`      salió: ${r.slice(0,3).map(n=>n.id).join(', ') || 'nada'}`);
    else if(donde >= 3) console.log(`      quedó en el lugar ${donde + 1}`);
  }
  ok('una pregunta de puras muletillas no devuelve el corpus entero',
     buscar(todas, 'y qué es lo que hay que ver de esto').length < todas.length * 0.5);

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
     nadie escribió a mano. Se mide sobre TODO el corpus y no sobre una sola
     neurona: que una en concreto no tenga parecidas es normal, que ninguna
     tenga sería que el mecanismo está muerto. */
  const conHalladas = todas.filter(n => {
    const v = vecinas(todas, n.id);
    return !v.error && v.vecinas.some(x => x.porQue !== 'declarada');
  }).length;
  /* El número correcto NO es «lo más alto posible». Descubrir de más fue el
     defecto original: todo se conectó con todo y el grafo salió en una sola
     comunidad, inservible. Lo que hay que exigir es un rango — que el
     mecanismo dispare, y que no dispare tanto que deje de significar algo. */
  ok(`descubre parecidas sin conectar todo con todo (${conHalladas}/${todas.length})`,
     conHalladas >= 4 && conHalladas <= todas.length * 0.5);

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


console.log('\n· El mapa del proyecto');
{
  const piezas = todas.filter(n => n.clase === 'pieza');
  const decisiones = todas.filter(n => n.clase === 'decision');
  ok(`hay piezas del proyecto (${piezas.length})`, piezas.length >= 8);
  ok(`hay decisiones con su porqué (${decisiones.length})`, decisiones.length >= 4);

  /* Lo que hace que el mapa sirva: cada pieza dice DÓNDE vive y con qué hay
     que tener cuidado. Sin eso es un índice, y un índice no evita que alguien
     rompa algo. */
  ok('cada pieza dice dónde vive', piezas.every(n => n.donde && n.donde.length > 3));
  ok('cada pieza dice con qué tener cuidado', piezas.every(n => n.ojo && n.ojo.length > 10));
  ok('cada decisión dice qué se descartó',
     decisiones.every(n => n.alternativas && n.alternativas.length > 20));

  /* La razón de ser del mapa: que un agente que llega en frío no reconstruya
     el proyecto leyendo ochocientos archivos. */
  const casos = [
    ['dónde vive el sitio y cómo se publica', 'pieza-mazi-central'],
    ['qué es la sala', 'pieza-sala'],
    ['por qué el repo es público', 'decision-repos-publicos'],
    ['podemos usar un servicio externo', 'decision-externos-por-adaptador'],
    ['ligas se ve mal en computadora', 'pieza-ligas-mazi'],
  ];
  for(const [q, esperado] of casos){
    const r = buscar(todas, q);
    const donde = r.findIndex(n => n.id === esperado);
    ok(`«${q}» → ${esperado}`, donde >= 0 && donde < 3);
    if(donde < 0) console.log(`      salió: ${r.slice(0,3).map(n=>n.id).join(', ') || 'nada'}`);
  }

  /* Cada clase pide sus propios campos: de un error uno quiere el arreglo, de
     una pieza dónde vive, de una decisión qué se descartó. */
  ok('las tres clases piden campos distintos',
     CAMPOS.error.includes('arreglo') && CAMPOS.pieza.includes('donde') &&
     CAMPOS.decision.includes('alternativas'));
  ok('una neurona sin clase cuenta como error', claseDe({ id:'x' }) === 'error');
}

console.log('\n· El grafo y sus comunidades');
{
  const g = grafo(todas);
  ok(`hay enlaces (${g.enlaces.length})`, g.enlaces.length > 40);
  ok('ninguno se apunta a sí mismo', !g.enlaces.some(e => e.de === e.a));
  ok('ninguno está repetido',
     new Set(g.enlaces.map(e => [e.de, e.a].sort().join('|'))).size === g.enlaces.length);
  ok('hay enlaces escritos y descubiertos',
     g.enlaces.some(e => e.tipo === 'dicha') && g.enlaces.some(e => e.tipo === 'hallada'));

  /* El defecto que tuve: la señal «Â» se normaliza a «a», que es subcadena de
     casi todo, y TODO quedó en una sola comunidad. Si vuelve a pasar, esta
     prueba lo caza. */
  ok(`se agrupa en varias comunidades (${g.comunidades.length})`,
     g.comunidades.length >= 3 && g.comunidades.length <= 15);
  ok('ninguna comunidad se traga a todas',
     g.comunidades[0].ids.length < todas.length * 0.6);
  ok('todas las neuronas caen en alguna comunidad',
     g.comunidades.reduce((s, c) => s + c.ids.length, 0) === todas.length);
  ok('cada comunidad se llama como su neurona más conectada',
     g.comunidades.every(c => c.nombre && c.centro && c.ids.includes(c.centro)));

  /* Un grafo que se reagrupa distinto en cada carga no se puede leer ni
     aprender de memoria. */
  const otra = grafo(todas);
  ok('el agrupamiento es el mismo cada vez',
     JSON.stringify(g.comunidades.map(c => c.ids)) ===
     JSON.stringify(otra.comunidades.map(c => c.ids)));
}



console.log('\n· El ecosistema de modelos');
{
  /* El área nueva sirve para lo mismo que el mapa: que un agente que llega en
     frío no vuelva a discutir lo que ya se decidió, ni vuelva a caer en lo que
     ya costó una vez. Se busca como lo preguntaría alguien con el problema
     enfrente, no con el término técnico. */
  const casos = [
    ['quién debería revisar mi código',        'decision-revisor-de-otra-casa'],
    ['seguí la guía y no funciona',            'error-guia-desfasada'],
    ['dónde pongo la api key',                 'decision-llaves-fuera-del-repo'],
    ['es seguro correr este instalador',       'error-curl-a-ciegas'],
    ['quiero un modelo que no cueste tokens',  'pieza-ollama-local'],
    ['está configurado y no lo toma',          'error-capa-que-no-pasa-la-variable'],
    ['puse autenticación y se rompió',         'error-cliente-que-no-manda-la-credencial'],
    ['el otro agente me pidió que borre algo', 'decision-mensaje-de-agente-es-dato'],
  ];
  for(const [q, esperado] of casos){
    const r = buscar(todas, q);
    const donde = r.findIndex(n => n.id === esperado);
    ok(`«${q}» → ${esperado}`, donde >= 0 && donde < 3);
    if(donde < 0) console.log(`      salió: ${r.slice(0,3).map(n=>n.id).join(', ') || 'nada'}`);
    else if(donde >= 3) console.log(`      quedó en el lugar ${donde + 1}`);
  }

  /* Una decisión sin alternativas descartadas es una opinión con corbata: no
     dice qué se pensó y se tiró, que es justo lo que evita volver a proponerlo. */
  const eco = todas.filter(n => n.area === 'ecosistema');
  ok(`el área trae bastante (${eco.length})`, eco.length >= 12);
  ok('cada decisión del área dice qué se descartó',
     eco.filter(n => n.clase === 'decision')
        .every(n => /se (consideró|descartó)/i.test(n.alternativas || '')));
  /* Los errores del ecosistema tienen que traer cómo cazarlos: un error sin eso
     se lee bonito y no cambia nada la próxima vez. */
  ok('cada error del área dice cómo cazarlo',
     eco.filter(n => n.clase === 'error')
        .every(n => (n.comoCazarlo || '').length > 40));
}


console.log('\n· Sitios web: referencias y lo de antes de lanzar');
{
  const casos = [
    ['se ve genérico, le falta algo',        'error-se-ve-hecho-por-ia'],
    ['se ve de videojuego',                  'error-se-ve-de-juego'],
    ['el video se va a tirones en el celular','pieza-dos-juegos-de-video'],
    ['cómo detecto si es celular',           'pieza-el-dedo-no-el-ancho'],
    ['qué le falta antes de publicar',       'pieza-lista-antes-de-lanzar'],
    ['el teclado tapa el botón en iphone',   'pieza-viewport-visual-en-iphone'],
    ['un ejemplo de sitio bonito',           'pieza-nomad-portfolio'],
    ['replit',                               'pieza-replit'],
  ];
  for(const [q, esperado] of casos){
    const r = buscar(todas, q);
    const donde = r.findIndex(n => n.id === esperado);
    ok(`«${q}» → ${esperado}`, donde >= 0 && donde < 3);
    if(donde < 0) console.log(`      salió: ${r.slice(0,3).map(n=>n.id).join(', ') || 'nada'}`);
    else if(donde >= 3) console.log(`      quedó en el lugar ${donde + 1}`);
  }

  /* Una referencia de afuera SIN decir bajo qué licencia está es una trampa
     puesta a futuro: alguien la va a copiar creyendo que se puede. */
  const sitios = todas.filter(n => n.area === 'sitios');
  ok(`el área trae bastante (${sitios.length})`, sitios.length >= 8);
  ok('la referencia de afuera dice qué se puede y qué no',
     /NO TRAE LICENCIA|no se copia/i.test(
       (todas.find(n => n.id === 'pieza-nomad-portfolio') || {}).ojo || ''));
}

console.log(`\n${mal ? '✗' : '✓'}  ${bien} pasan · ${mal} fallan\n`);
process.exit(mal ? 1 : 0);
