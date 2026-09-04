/* ══════════════════════════════════════════════════════════════════════════
   JABONERA · EL REPORTE EN FORMATO REMBRANDT
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «la función para dar un documento con el formato Rembrandt que usa
   nuestro sistema de reportes actual».

   NO SE REDIBUJA EL MEMBRETE. La herramienta `reportes/` de esta misma
   central ya tiene el formato oficial del Instituto Rembrandt —sacado del
   `.docx` que mandó Carlos, con sus márgenes de 30 mm medidos del `sectPr` y
   sus colores muestreados de las imágenes— más la marca de agua, la
   numeración de páginas, el bloque de firmas y el sello de verificación.
   Copiar todo eso aquí sería tener DOS formatos oficiales que se van a
   separar el día que la escuela cambie el suyo.

   Lo que se hace en su lugar: Jabonera escribe un archivo con la MISMA forma
   que la herramienta de reportes importa (`bImportar`), y ella lo abre, lo
   maqueta y lo imprime. Un solo formato oficial, en un solo sitio.

   El cuerpo va en la marcación que esa herramienta entiende:
     ## Apartado · ### Sub · **negrita** · - viñeta · 1. numerada
     | a | b |  tabla, una fila por renglón, la primera es el encabezado
     Campo: valor  ficha de datos  ·  > recuadro destacado
   ═════════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const n2 = x => (x == null || !isFinite(x)) ? null : Math.round(x*100)/100;
const mil = (x, d=0) => x == null || !isFinite(x) ? '—'
  : x.toLocaleString('es-MX', { minimumFractionDigits:d, maximumFractionDigits:d });
const pesos = x => x == null || !isFinite(x) ? 'no se sabe'
  : '$' + x.toLocaleString('es-MX', { minimumFractionDigits:2, maximumFractionDigits:2 });

/** El cuerpo del reporte, en la marcación de la herramienta de reportes. */
function cuerpo(estado, informe, M){
  const p = estado.proyecto || {};
  const c = informe.calidad;
  const L = [];
  const nom = id => estado.banos.find(b => b.id === id)?.nombre || '—';

  L.push('## I. Datos del proyecto');
  L.push('');
  L.push(`**Proyecto:** ${p.nombre || 'Control de consumo de jabón en baños escolares'}`);
  L.push(`**Modalidad:** ${p.modalidad || 'STEAM'}`);
  L.push(`**Asignatura:** ${p.asignatura || '—'}`);
  L.push(`**Integrantes:** ${(p.integrantes || []).join(', ') || '—'}`);
  L.push(`**Asesor:** ${p.asesor || '—'}`);
  L.push(`**Periodo medido:** ${mil(informe.rango.dias,1)} días`);
  L.push('');

  L.push('## II. Planteamiento');
  L.push('');
  L.push(p.planteamiento || `La escuela compra jabón para los baños sin saber cuánto se consume
realmente, en qué baños y en qué momentos. La pregunta de este proyecto no es
"cuánto jabón usamos" —eso se contesta pesando una caja— sino **"cuánto jabón
hace falta, y cómo lo sabemos"**, que exige un método de medición repetible.`);
  L.push('');

  L.push('## III. Método');
  L.push('');
  L.push(`El consumo de jabón no se puede observar directamente: sólo se puede ver
**cuánto queda**. Por eso cada visita a un baño registra dos cantidades, no una:
lo que se encontró dentro del dispensador y lo que se repuso en ese momento. El
consumo entre dos visitas consecutivas se obtiene por diferencia:`);
  L.push('');
  L.push('> consumo = (lo que quedaba + lo que se repuso) − lo que queda ahora');
  L.push('');
  L.push(`Cuando la diferencia resulta negativa significa que alguien repuso jabón sin
registrarlo. En ese caso el sistema **no** corrige el dato en silencio: lo cuenta
como cero y lo reporta como faltante, porque un consumo perdido no debe
confundirse con un consumo bajo.`);
  L.push('');
  L.push(`Las cantidades de jabón líquido se registran en mililitros y las de jabón en
barra en gramos. **No se suman entre sí en ningún cálculo**, por ser magnitudes
distintas; sólo comparten unidad los importes en pesos.`);
  L.push('');

  L.push('## IV. Instrumento de medición');
  L.push('');
  const d = estado.dispensador || {};
  L.push(`**Dispensador:** ${d.modelo || '—'}`);
  L.push(`**Capacidad:** ${mil(d.capacidad)} mL`);
  L.push(`**Dosis por accionamiento:** ${d.dosisPorPulsada > 0 ? mil(d.dosisPorPulsada,2)+' mL (medida)' : 'sin medir'}`);
  if(d.notas) L.push(`**Procedimiento de calibración:** ${d.notas}`);
  L.push('');
  L.push(`La dosis se determina accionando el dispensador diez veces sobre una probeta
graduada y dividiendo el volumen obtenido entre diez, repitiendo la medición tres
veces y promediando. La primera pulsada posterior a una recarga se descarta
porque el conducto contiene aire. Para el jabón en barra la dosis se obtiene
pesando la barra antes y después de un número contado de lavados.`);
  L.push('');

  L.push('## V. Instalaciones bajo estudio');
  L.push('');
  L.push('| Baño | Zona | Alumnos | Dispensadores |');
  for(const b of estado.banos)
    L.push(`| ${b.nombre} | ${b.zona||'—'} | ${b.alumnos||'—'} | ${b.dispensadores||'—'} |`);
  L.push('');

  L.push('## VI. Resultados');
  L.push('');
  if(!c.intervalos){
    L.push('Todavía no hay dos mediciones consecutivas en ningún baño, por lo que no es posible calcular consumo.');
  }else{
    for(const pr of informe.porProducto){
      L.push(`### ${pr.producto.nombre}`);
      L.push('');
      L.push(`**Consumo total:** ${mil(pr.consumo,1)} ${pr.unidad}` +
             (pr.piezas != null ? ` (equivalente a ${mil(pr.piezas,1)} barras)` : ''));
      if(pr.diario != null) L.push(`**Promedio diario:** ${mil(pr.diario,1)} ${pr.unidad}`);
      if(pr.lavados != null) L.push(`**Lavados de manos estimados:** ${mil(Math.round(pr.lavados))}`);
      L.push(`**Existencia en almacén:** ${mil(pr.almacen,1)} ${pr.unidad}`);
      if(pr.diasRestantes != null) L.push(`**Autonomía al ritmo medido:** ${mil(pr.diasRestantes,1)} días`);
      if(pr.costoUnidad != null) L.push(`**Costo unitario:** ${pesos(pr.costoUnidad*1000)} por ${pr.producto.tipo==='liquido'?'litro':'kilogramo'}`);
      L.push('');
    }

    L.push('### Consumo por instalación');
    L.push('');
    L.push('| Baño | Producto | Consumo | Por alumno y día | Mediciones |');
    for(const r of informe.banos){
      const pr = estado.productos.find(x => x.id === r.productoId);
      L.push(`| ${nom(r.banoId)} | ${pr?.nombre||'—'} | ${mil(r.consumo,1)} ${M.UNIDAD[pr?.tipo]||''} | ` +
             `${r.porAlumno != null ? mil(r.porAlumno,2)+' '+(M.UNIDAD[pr?.tipo]||'') : 'sin dato de alumnos'} | ${r.intervalos} |`);
    }
    L.push('');

    const pico = informe.semana.reduce((a,b,i,arr) => arr[a].consumo >= b.consumo ? a : i, 0);
    L.push('### Distribución en el tiempo');
    L.push('');
    L.push(`El día de mayor consumo es el **${DIAS[pico]}**.`);
    L.push('');
    if(informe.hora.muestras){
      const ph = informe.hora.horas.reduce((a,b,i,arr) => arr[a].consumo >= b.consumo ? a : i, 0);
      L.push(`El consumo se concentra hacia las **${ph}:00 h**. Este dato procede
únicamente de ${informe.hora.muestras} intervalo(s) de menos de ${informe.hora.topeHoras} horas;
se descartaron ${informe.hora.descartados} intervalos por ser demasiado largos para
atribuir consumo a una hora del día.`);
    }else{
      L.push(`No es posible determinar la hora de mayor consumo: ninguna medición está lo
bastante próxima a la anterior. Se requieren dos visitas el mismo día al mismo baño.`);
    }
    L.push('');

    L.push('### Costo');
    L.push('');
    L.push(`**Invertido en adquisiciones:** ${pesos(informe.dinero.invertido)}`);
    L.push(`**Valor del jabón consumido:** ${informe.dinero.gasto == null
      ? 'no determinable, por no haber entregas registradas con su costo' : pesos(informe.dinero.gasto)}`);
    L.push('');
  }

  L.push('## VII. Alcance y limitaciones de los datos');
  L.push('');
  L.push(`**Días efectivamente medidos:** ${mil(c.dias,1)}`);
  L.push(`**Visitas registradas:** ${c.visitas}`);
  L.push(`**Intervalos de consumo obtenidos:** ${c.intervalos}`);
  L.push(`**Suficiencia para concluir:** ${c.suficiente
    ? 'sí; se superan los siete días y los seis intervalos considerados como mínimo'
    : 'todavía no; por debajo de siete días y seis intervalos un solo día atípico desplaza todos los promedios'}`);
  L.push('');
  if(c.banosSinDatos.length)
    L.push(`- Sin ninguna medición: ${c.banosSinDatos.join(', ')}. Su consumo es desconocido, no cero.`);
  if(c.banosConUnaSolaVisita.length)
    L.push(`- Con una sola visita, insuficiente para calcular consumo: ${c.banosConUnaSolaVisita.join(', ')}.`);
  if(c.huecos)
    L.push(`- Se detectaron ${c.huecos} reposición(es) no registrada(s), con ${mil(c.huecoTotal,1)} unidades sin documentar. El consumo real es superior al reportado.`);
  L.push('');
  L.push('Este instrumento **no** puede determinar:');
  L.push('');
  L.push('- Qué persona consumió el jabón. Mide la instalación, no a los usuarios; registrar el uso individual constituiría una vigilancia improcedente sobre alumnos.');
  L.push('- La diferencia entre consumo y desperdicio. Una fuga en el dispensador y un lavado correcto producen la misma lectura.');
  L.push('- El número real de usuarios. El indicador por alumno emplea la matrícula asignada al baño, no la afluencia observada.');
  L.push('');

  if(p.conclusiones){ L.push('## VIII. Conclusiones'); L.push(''); L.push(p.conclusiones); L.push(''); }

  L.push('> Los datos de este informe fueron capturados en campo por el equipo del proyecto y procesados por el sistema NERA. El detalle completo de mediciones se entrega en el archivo de hoja de cálculo adjunto.');

  if(estado.demo){
    L.push('');
    L.push('> ADVERTENCIA: este documento se generó con DATOS DE DEMOSTRACIÓN. No corresponde a mediciones reales y no debe presentarse como tal.');
  }
  return L.join('\n');
}

/** El objeto con la forma que importa la herramienta `reportes/`. */
function paraReportes(estado, informe, M){
  const p = estado.proyecto || {};
  const hoy = new Date();
  const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const integrantes = p.integrantes || [];
  return [{
    id: 'jab' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    tipo: 'actividad',
    titulo: p.nombre || 'Control de consumo de jabón en baños escolares',
    fecha: iso(hoy),
    grupo: p.grupo || '',
    para: p.para || 'Dirección académica',
    lugar: p.lugar || 'Santiago de Querétaro, Qro.',
    autor: integrantes[0] || '',
    cargo: p.cargo || 'Integrante del equipo',
    autor2: integrantes[1] || '',
    cargo2: integrantes[1] ? 'Integrante del equipo' : '',
    semestre: p.semestre || '', tutor: p.asesor || '', periodo: p.periodo || '',
    apagados: [],
    cuerpo: cuerpo(estado, informe, M),
    evidencias: [],
    creado: Date.now(), tocado: Date.now(),
  }];
}

const API = { cuerpo, paraReportes };
if(typeof module !== 'undefined') module.exports = API;
globalThis.REPORTE = API;
})();
