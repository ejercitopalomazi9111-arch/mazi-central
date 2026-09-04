/* ══════════════════════════════════════════════════════════════════════════
   JABONERA · EL ESTADO Y SU GUARDADO
   ──────────────────────────────────────────────────────────────────────────
   Dónde viven los datos y cómo se convierten en un libro de Excel.

   SE GUARDA EN EL PROPIO NAVEGADOR (`localStorage`) y no en un servidor, y
   es una decisión, no una limitación:
   · el registro se hace DE PIE EN EL BAÑO, donde puede no haber señal;
   · no hay que pedirle a nadie una cuenta, una llave ni un despliegue para
     que el proyecto exista mañana;
   · y la escuela no acaba con datos de sus alumnos en un servidor ajeno.
   El precio es real y hay que decirlo en voz alta: **los datos viven en ESE
   teléfono**. Por eso el respaldo a archivo (`.json`) y la exportación a
   Excel no son un extra bonito — son la forma de que el trabajo no se
   pierda, y por eso el aviso de respaldo está en la pantalla y no en un pie.
   ═════════════════════════════════════════════════════════════════════════ */
/* ⚠ TODO EL ARCHIVO VA DENTRO DE UNA FUNCIÓN, y no es manía. Estos módulos se
   cargan con <script src> clásico —no como módulos ES, porque un módulo ES no
   carga desde `file://` y ahí se acabaría el «lo abro en la compu del salón»—
   y los scripts clásicos COMPARTEN el ámbito global. Los tres declaraban
   `const API` al final y el segundo reventaba con «Identifier 'API' has
   already been declared», dejando la página en blanco. En node no pasaba
   porque ahí cada archivo tiene su propio ámbito: sólo se vio abriéndolo en
   un navegador de verdad. */
(function(){
'use strict';


const LLAVE = 'jabonera.v1';

function idNuevo(p='x'){
  return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
}

function estadoVacio(){
  return {
    version: 1,
    escuela: { nombre:'', ciclo:'', turno:'', responsable:'' },
    /* El dispensador que YA TIENEN. No lo diseñamos nosotros: se describe,
       y sobre todo se anota su DOSIS medida, que es lo que permite traducir
       mililitros a lavadas de manos. */
    dispensador: { modelo:'Dispensador mecánico de pulsador', capacidad:1000,
                   dosisPorPulsada:0, notas:'' },
    /* Lo que encabeza el reporte en formato Rembrandt. */
    proyecto: { nombre:'', modalidad:'STEAM', asignatura:'', integrantes:[],
                asesor:'', grupo:'', conclusiones:'' },
    banos: [],
    productos: [],
    visitas: [],
    entregas: [],
    demo: false,
  };
}

function cargar(){
  try{
    const crudo = localStorage.getItem(LLAVE);
    if(!crudo) return estadoVacio();
    const e = JSON.parse(crudo);
    return sanear(e);
  }catch(err){
    /* Un JSON roto no puede borrar el trabajo de nadie en silencio: se avisa
       y se deja el original donde está para poder rescatarlo a mano. */
    console.error('Jabonera: no se pudo leer lo guardado.', err);
    try{ localStorage.setItem(LLAVE + '.roto.' + Date.now(), localStorage.getItem(LLAVE)); }catch(_){}
    return estadoVacio();
  }
}

/** Rellena lo que falte sin tirar lo que haya. Un archivo de hace tres
 *  versiones tiene que seguir abriendo. */
function sanear(e){
  const base = estadoVacio();
  const out = { ...base, ...e };
  out.escuela      = { ...base.escuela, ...(e.escuela || {}) };
  out.dispensador  = { ...base.dispensador, ...(e.dispensador || {}) };
  out.proyecto     = { ...base.proyecto, ...(e.proyecto || {}) };
  if(!Array.isArray(out.proyecto.integrantes)) out.proyecto.integrantes = [];
  out.banos        = Array.isArray(e.banos) ? e.banos : [];
  out.productos    = Array.isArray(e.productos) ? e.productos : [];
  out.visitas      = (Array.isArray(e.visitas) ? e.visitas : []).map(v => ({
    ...v, ts:Number(v.ts), restante:Number(v.restante)||0, repuesto:Number(v.repuesto)||0 }));
  out.entregas     = (Array.isArray(e.entregas) ? e.entregas : []).map(x => ({
    ...x, ts:Number(x.ts), envases:Number(x.envases)||0, costoTotal:Number(x.costoTotal)||0 }));
  return out;
}

function guardar(estado){
  try{
    localStorage.setItem(LLAVE, JSON.stringify(estado));
    return { bien:true };
  }catch(err){
    /* El navegador puede negarse (modo privado, cuota llena). Devolver
       `bien:false` obliga a la pantalla a decirlo: un guardado que falla en
       silencio es cómo se pierde una semana de mediciones. */
    return { bien:false, error: String(err && err.message || err) };
  }
}

/* ── el libro de Excel ─────────────────────────────────────────────────── */

/** Convierte el informe del motor en las hojas del .xlsx. Va aquí y no en
 *  `excel.js` a propósito: `excel.js` no sabe nada de jabón, y así se puede
 *  reusar tal cual en cualquier otro proyecto. */
function hojasDeExcel(estado, informe, M){
  const nom = id => estado.banos.find(b => b.id === id)?.nombre || '—';
  const prod = id => estado.productos.find(p => p.id === id)?.nombre || '—';
  const uni  = id => M.UNIDAD[estado.productos.find(p => p.id === id)?.tipo] || '';
  const n2 = x => (x == null ? null : Math.round(x * 100) / 100);
  const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

  /* 1 · RESUMEN. Es la hoja que alguien va a proyectar, así que arriba va lo
     que se puede afirmar y abajo, con todas sus letras, sobre cuántos datos
     se está afirmando. */
  const resumen = [];
  resumen.push(['Escuela', estado.escuela.nombre || '(sin capturar)', null]);
  resumen.push(['Ciclo / turno', [estado.escuela.ciclo, estado.escuela.turno].filter(Boolean).join(' · ') || '(sin capturar)', null]);
  resumen.push(['Exportado', M.fechaHora(Date.now()), null]);
  resumen.push(['', '', null]);
  resumen.push(['DÍAS MEDIDOS', n2(informe.calidad.dias), null]);
  resumen.push(['Visitas registradas', informe.calidad.visitas, null]);
  resumen.push(['Intervalos de consumo', informe.calidad.intervalos, null]);
  resumen.push(['', '', null]);
  for(const p of informe.porProducto){
    resumen.push([`Consumo · ${p.producto.nombre} (${p.unidad})`, n2(p.consumo), null]);
    if(p.piezas != null) resumen.push([`  equivale a barras`, n2(p.piezas), null]);
    if(p.lavados != null) resumen.push([`  equivale a lavadas de manos`, Math.round(p.lavados), null]);
    if(p.diario != null) resumen.push([`  promedio por día (${p.unidad})`, n2(p.diario), null]);
    resumen.push([`  en almacén (${p.unidad})`, n2(p.almacen), null]);
    if(p.diasRestantes != null) resumen.push([`  días que aguanta el almacén`, n2(p.diasRestantes), null]);
    if(p.costoUnidad != null) resumen.push([`  costo por ${p.unidad}`, null, n2(p.costoUnidad)]);
  }
  resumen.push(['', '', null]);
  resumen.push(['Invertido en compras', null, n2(informe.dinero.invertido)]);
  resumen.push(['Valor de lo consumido', null, informe.dinero.gasto == null ? null : n2(informe.dinero.gasto)]);
  if(informe.dinero.gasto == null)
    resumen.push(['  (no hay entregas registradas: sin precio no se puede valorar el consumo)', '', null]);
  resumen.push(['', '', null]);
  resumen.push(['— HASTA DÓNDE LLEGAN ESTOS DATOS —', '', null]);
  resumen.push(['¿Suficiente para concluir?',
                informe.calidad.suficiente ? 'Sí (7+ días y 6+ intervalos)'
                                           : 'Todavía no: hacen falta más días o más mediciones', null]);
  if(informe.calidad.banosSinDatos.length)
    resumen.push(['Baños SIN una sola medición', informe.calidad.banosSinDatos.join(', '), null]);
  if(informe.calidad.banosConUnaSolaVisita.length)
    resumen.push(['Baños con una sola visita (aún no dicen consumo)', informe.calidad.banosConUnaSolaVisita.join(', '), null]);
  if(informe.calidad.huecos)
    resumen.push([`Recargas no registradas detectadas`, `${informe.calidad.huecos} · faltan ${n2(informe.calidad.huecoTotal)} sin apuntar`, null]);
  if(estado.demo)
    resumen.push(['⚠ ATENCIÓN', 'Este archivo contiene DATOS DE DEMOSTRACIÓN, no mediciones reales.', null]);

  const hojas = [
    { nombre:'Resumen',
      columnas:[{titulo:'Concepto',ancho:42},{titulo:'Valor',ancho:26,tipo:'numero'},{titulo:'Pesos',ancho:14,tipo:'dinero'}],
      filas: resumen },

    { nombre:'Consumo por baño',
      columnas:[{titulo:'Baño',ancho:30},{titulo:'Producto',ancho:22},{titulo:'Unidad',ancho:9},
                {titulo:'Consumo',ancho:14,tipo:'numero'},{titulo:'Por alumno y día',ancho:18,tipo:'numero'},
                {titulo:'Alumnos',ancho:10,tipo:'entero'},{titulo:'Mediciones',ancho:12,tipo:'entero'},
                {titulo:'Recargas sin apuntar',ancho:20,tipo:'entero'}],
      filas: informe.banos.map(r => [
        nom(r.banoId), prod(r.productoId), uni(r.productoId), n2(r.consumo),
        n2(r.porAlumno), r.bano?.alumnos || null, r.intervalos, r.huecos ]) },

    { nombre:'Consumo por día',
      columnas:[{titulo:'Día',ancho:14},{titulo:'Producto',ancho:22},{titulo:'Unidad',ancho:9},
                {titulo:'Consumo',ancho:14,tipo:'numero'}],
      filas: informe.dia.map(d => [ d.dia, prod(d.productoId), uni(d.productoId), n2(d.consumo) ]) },

    /* La semana y las horas hablan de UN producto —el de mayor consumo—
       porque mezclar mL con gramos en una columna da un total que no es de
       ninguna unidad. El encabezado lo dice para que nadie lo suponga. */
    { nombre:'Por día de la semana',
      columnas:[{titulo:'Día',ancho:14},
                {titulo:`Consumo · ${informe.principal ? informe.principal.producto.nombre + ' (' + informe.principal.unidad + ')' : '—'}`,ancho:38,tipo:'numero'}],
      filas: informe.semana.map(s => [ DIAS[s.dia], n2(s.consumo) ]) },

    { nombre:'Por hora',
      columnas:[{titulo:'Hora',ancho:10,tipo:'entero'},
                {titulo:`Consumo · ${informe.principal ? informe.principal.producto.nombre + ' (' + informe.principal.unidad + ')' : '—'}`,ancho:34,tipo:'numero'},
                {titulo:'Nota',ancho:60}],
      filas: informe.hora.horas.map((h,i) => [ h.hora, n2(h.consumo),
        i === 0 ? `Sólo con los ${informe.hora.muestras} intervalos de menos de ${informe.hora.topeHoras} h. `
                + `Se descartaron ${informe.hora.descartados} por ser demasiado largos para decir nada de la hora.` : '' ]) },

    { nombre:'Visitas',
      columnas:[{titulo:'Fecha y hora',ancho:20,tipo:'fecha'},{titulo:'Baño',ancho:30},
                {titulo:'Producto',ancho:22},{titulo:'Unidad',ancho:9},
                {titulo:'Encontrado',ancho:13,tipo:'numero'},{titulo:'Repuesto',ancho:13,tipo:'numero'},
                {titulo:'Quién',ancho:18},{titulo:'Nota',ancho:34}],
      filas: [...estado.visitas].sort((a,b)=>b.ts-a.ts).map(v => [
        v.ts, nom(v.banoId), prod(v.productoId), uni(v.productoId),
        n2(v.restante), n2(v.repuesto), v.quien || '', v.nota || '' ]) },

    { nombre:'Entregas',
      columnas:[{titulo:'Fecha',ancho:20,tipo:'fecha'},{titulo:'Producto',ancho:22},
                {titulo:'Envases',ancho:10,tipo:'numero'},{titulo:'Contenido total',ancho:16,tipo:'numero'},
                {titulo:'Unidad',ancho:9},{titulo:'Costo total',ancho:14,tipo:'dinero'},
                {titulo:'Costo por unidad',ancho:16,tipo:'dinero'},{titulo:'Proveedor',ancho:22}],
      filas: [...estado.entregas].sort((a,b)=>b.ts-a.ts).map(e => {
        const p = estado.productos.find(x => x.id === e.productoId);
        const total = p ? e.envases * p.tamanoEnvase : null;
        return [ e.ts, prod(e.productoId), e.envases, n2(total), uni(e.productoId),
                 n2(e.costoTotal), total ? n2(e.costoTotal/total) : null, e.proveedor || '' ]; }) },

    { nombre:'Baños',
      columnas:[{titulo:'Baño',ancho:30},{titulo:'Zona',ancho:22},{titulo:'Tipo',ancho:14},
                {titulo:'Dispensadores',ancho:14,tipo:'entero'},{titulo:'Alumnos',ancho:10,tipo:'entero'}],
      filas: estado.banos.map(b => [ b.nombre, b.zona||'', b.tipo||'', b.dispensadores||null, b.alumnos||null ]) },

    { nombre:'Productos',
      columnas:[{titulo:'Producto',ancho:26},{titulo:'Tipo',ancho:12},{titulo:'Marca',ancho:18},
                {titulo:'Contenido por envase',ancho:20,tipo:'numero'},{titulo:'Unidad',ancho:9},
                {titulo:'Gramos por barra',ancho:16,tipo:'numero'}],
      filas: estado.productos.map(p => [ p.nombre, p.tipo, p.marca||'',
                n2(p.tamanoEnvase), M.UNIDAD[p.tipo], p.tipo==='solido' ? n2(p.gramosPorPieza) : null ]) },
  ];
  return hojas;
}

/* ── LO QUE SE INVESTIGÓ, CON SUS FUENTES ─────────────────────────────────
   Carlos pidió: «busca refills en la web y haz un promedio y usa ese; además
   investiga cuánto gasta un dispensador en promedio». Esto es lo que salió.
   Va aquí, con fuente y fecha, y NO escondido en el código: un número sin
   procedencia es una suposición con formato de dato.

   ⚠ SON REFERENCIAS PARA EMPEZAR, NO MEDICIONES DE LA ESCUELA. En cuanto
   haya una entrega real registrada, el sistema usa ESE precio y olvida éste
   (el costo se calcula como promedio ponderado de las entregas, ver el
   motor). Y la dosis del dispensador hay que medirla: es el experimento del
   proyecto.                                                     (sept. 2026) */
const REFERENCIAS = {
  jabonLiquido: {
    /* Seis precios de mercado mexicano, por litro:
       $30.88 (refill 4 L, MercadoLibre)      $35.60 (5 L, VivoNatural)
       $23.00 (20 L, Vive Limpio)             $17.00 (20 L, distribuidor)
       $19.66 (20 L, Ninu)                    $45.00 (20 L, Química PH)
       Se usa la MEDIANA y no el promedio: el de $45 es un valor extremo que
       arrastra la media hasta $28.52 sin representar lo que se compra. Con
       seis datos y uno atípico, la mediana es la medida honesta — y de paso
       es un ejemplo de libro para la parte de matemáticas del proyecto. */
    porLitro: 26.94, media: 28.52, minimo: 17.00, maximo: 45.00, muestras: 6,
    fuente: 'MercadoLibre MX, VivoNatural, Vive Limpio, Ninu, Química PH (consulta sept. 2026)',
  },
  jabonBarra: {
    /* $31.00 la barra de 150 g al menudeo (Escudo, farmacia) y $15.00 la
       misma barra a mayoreo. Mediana $23.00 por barra = $153.33 por kilo. */
    porBarra150: 23.00, porKilo: 153.33, minimo: 15.00, maximo: 31.00, muestras: 2,
    fuente: 'Farmacias del Ahorro / YZA y precios de mayoreo (consulta sept. 2026)',
  },
  dispensador: {
    /* Cuánto suelta un dispensador por accionamiento, según la literatura:
       · ASTM E2755 pide 1.5 mL · EN 1500 pide 3 mL · ASTM E1174 pide 5 mL
       · la guía Leapfrog (2022) exige al menos 1.0 mL por accionamiento
       · pero los estudios de dispensadores REALES encuentran que muchos
         entregan menos de 1 mL y que pasar de 1.5 mL es poco común.
       Por eso el valor de arranque es 1.2 mL: dentro de lo que exige la
       norma y dentro de lo que se mide en la práctica. Hay que medirlo. */
    dosisReferencia: 1.2, dosisMinimaNorma: 1.0, rangoReal: [0.7, 1.5],
    fuente: 'Am J Infect Control 2025 (consistencia de dispensadores); J Hosp Infect 2025; ASTM E2755 / EN 1500 / ASTM E1174; Leapfrog 2022',
  },
  /* Consumo esperado de un baño, para contrastar con lo medido:
       alumnos × usos por día × dosis. Dos usos por alumno y día es lo que se
       supone en una jornada escolar (después del recreo y después del baño).
     NO es una predicción: es la vara con la que se compara la medición, y si
     no coinciden, eso ES el hallazgo del proyecto. */
  usosPorAlumnoDia: 2,
};

/** Consumo diario esperado de un baño, en mL. Sirve para poner la medición
 *  en contexto — «medimos 190 y la referencia decía 156» es una frase de
 *  proyecto de ciencias; «medimos 190» sola, no. */
function consumoEsperado(bano, dispensador){
  const alumnos = Number(bano?.alumnos);
  const dosis = Number(dispensador?.dosisPorPulsada) || REFERENCIAS.dispensador.dosisReferencia;
  if(!(alumnos > 0)) return null;
  return alumnos * REFERENCIAS.usosPorAlumnoDia * dosis;
}

/* ── datos de demostración ─────────────────────────────────────────────────
   Con LOS DOS BAÑOS REALES que dio Carlos —el 1 con un flujo de 20 a 22
   alumnos y el 2 con unos 65— y con los precios investigados arriba. Son
   dos y no seis a propósito: inventar cuatro baños que no existen para que
   la gráfica se vea más llena sería exactamente lo que este proyecto no
   debe hacer. Añadir más es un toque en Ajustes.

   Van marcados con `demo:true`, y la marca sale en pantalla, en el Excel y
   en el reporte: un dato inventado que se pueda confundir con una medición
   es lo que no debe pasar en un proyecto de ciencias. */
function datosDemo(hoy = Date.now()){
  const e = estadoVacio();
  e.demo = true;
  e.escuela = { nombre:'Escuela de ejemplo', ciclo:'2025–2026', turno:'Matutino',
                responsable:'Equipo STEAM' };
  e.proyecto = { nombre:'Control de consumo de jabón en los baños escolares',
                 modalidad:'STEAM', asignatura:'Proyecto integrador',
                 integrantes:['(nombre del integrante)','(nombre del integrante)'],
                 asesor:'(nombre del asesor)', grupo:'', conclusiones:'' };
  e.dispensador = { modelo:'Dispensador mecánico de pulsador', capacidad:1000,
                    dosisPorPulsada: REFERENCIAS.dispensador.dosisReferencia,
                    notas:'Valor de referencia de la literatura (1.2 mL). PENDIENTE de medir en clase: 10 pulsadas en una probeta ÷ 10.' };

  const liq = { id:'pl', nombre:'Jabón líquido para manos', tipo:'liquido',
                marca:'Genérico', tamanoEnvase:5000 };
  const sol = { id:'ps', nombre:'Jabón en barra', tipo:'solido',
                marca:'Genérico', tamanoEnvase:1800, gramosPorPieza:150,
                /* Medido pesando una barra antes y después de lavadas
                   contadas. La barra NO usa la dosis del dispensador de
                   líquido: son dos unidades y dos experimentos. */
                gramosPorLavada:0.55 };
  e.productos = [liq, sol];

  e.banos = [
    { id:'b1', nombre:'Baño 1', zona:'Planta baja', tipo:'mixto', dispensadores:1, alumnos:21 },
    { id:'b2', nombre:'Baño 2', zona:'Planta alta', tipo:'mixto', dispensadores:2, alumnos:65 },
  ];

  /* Generador CON SEMILLA: los mismos datos en cada máquina, para que la
     presentación no cambie de números entre el ensayo y el examen. */
  let s = 20260115;
  const azar = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

  const DIA = 86400000;
  const inicio = new Date(hoy - 21*DIA); inicio.setHours(7,30,0,0);

  /* Precios de las entregas, tomados de REFERENCIAS. */
  const pl = REFERENCIAS.jabonLiquido.porLitro;
  e.entregas = [
    { id:'e1', ts:inicio.getTime()-DIA,   productoId:'pl', envases:4, costoTotal: Math.round(4*5*pl), proveedor:'Distribuidora local' },
    { id:'e2', ts:inicio.getTime()+11*DIA, productoId:'pl', envases:2, costoTotal: Math.round(2*5*pl), proveedor:'Distribuidora local' },
    { id:'e3', ts:inicio.getTime()-DIA,   productoId:'ps', envases:1,
      costoTotal: Math.round(12*REFERENCIAS.jabonBarra.porBarra150), proveedor:'Distribuidora local' },
  ];

  const dentro = {};
  for(const b of e.banos){ dentro[b.id+'pl'] = 0; dentro[b.id+'ps'] = 0; }

  for(let d = 0; d <= 21; d++){
    const cuando = new Date(inicio.getTime() + d*DIA);
    const finde = cuando.getDay() === 0 || cuando.getDay() === 6;
    for(const b of e.banos){
      /* Dos visitas al día en el baño grande: es lo que le da material al
         perfil por horas, que sólo puede usar intervalos de menos de 12 h. */
      const veces = finde ? 0 : (b.alumnos > 40 ? 2 : 1);
      for(let k = 0; k < veces; k++){
        const hora = k === 0 ? 7.5 : 13.5;
        const ts = new Date(cuando); ts.setHours(Math.floor(hora), (hora%1)*60, 0, 0);
        for(const p of [liq, sol]){
          const clave = b.id + p.id;
          /* El gasto se construye desde el consumo ESPERADO —alumnos × usos
             × dosis— y se le mete ±30 % de variación. Así la demostración no
             es un número al aire: es el modelo del propio proyecto. */
          const esperado = consumoEsperado(b, e.dispensador) || 60;
          const base = p.tipo === 'liquido' ? esperado : esperado * 0.12;
          const gastado = finde ? 0 : base * (0.7 + azar()*0.6) / veces;
          dentro[clave] = Math.max(0, dentro[clave] - gastado);
          const cap = p.tipo === 'liquido' ? 1000 * (b.dispensadores||1) : 300 * (b.dispensadores||1);
          let repuesto = 0;
          if(dentro[clave] < cap * 0.25){ repuesto = cap - dentro[clave]; dentro[clave] = cap; }
          e.visitas.push({
            id: idNuevo('v'), ts: ts.getTime(), banoId: b.id, productoId: p.id,
            restante: Math.round((dentro[clave] - repuesto) * 10)/10,
            repuesto: Math.round(repuesto * 10)/10,
            quien: 'Equipo del proyecto', nota: '',
          });
        }
      }
    }
  }
  return e;
}

const API = { LLAVE, idNuevo, estadoVacio, cargar, guardar, sanear, hojasDeExcel, datosDemo,
              REFERENCIAS, consumoEsperado };
if(typeof module !== 'undefined') module.exports = API;
globalThis.DATOS = API;
})();
