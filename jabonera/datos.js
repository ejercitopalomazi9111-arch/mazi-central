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

/* ── datos de demostración ─────────────────────────────────────────────────
   Para poder presentar el proyecto ANTES de tener tres semanas de campo.
   Van marcados con `demo:true` y la marca sale impresa en el resumen de
   Excel y en un letrero rojo en la pantalla: un dato inventado que se pueda
   confundir con una medición es exactamente lo que no debe pasar en un
   proyecto de ciencias. */
function datosDemo(hoy = Date.now()){
  const e = estadoVacio();
  e.demo = true;
  e.escuela = { nombre:'Escuela de ejemplo', ciclo:'2025–2026', turno:'Matutino',
                responsable:'Equipo STEAM' };
  e.dispensador = { modelo:'Dispensador mecánico de pulsador', capacidad:1000,
                    dosisPorPulsada:1.2,
                    notas:'Dosis medida en clase: 10 pulsadas en una probeta = 12 mL.' };

  const liq = { id:'pl', nombre:'Jabón líquido para manos', tipo:'liquido',
                marca:'Genérico', tamanoEnvase:5000 };
  const sol = { id:'ps', nombre:'Jabón en barra', tipo:'solido',
                marca:'Genérico', tamanoEnvase:1200, gramosPorPieza:100,
                /* Medido pesando una barra antes y después de 50 lavadas
                   contadas. La barra NO usa la dosis del dispensador de
                   líquido: son dos unidades y dos experimentos. */
                gramosPorLavada:0.55 };
  e.productos = [liq, sol];

  e.banos = [
    { id:'b1', nombre:'Baño hombres · planta baja', zona:'Edificio A', tipo:'hombres', dispensadores:3, alumnos:180 },
    { id:'b2', nombre:'Baño mujeres · planta baja', zona:'Edificio A', tipo:'mujeres', dispensadores:3, alumnos:175 },
    { id:'b3', nombre:'Baño hombres · planta alta', zona:'Edificio A', tipo:'hombres', dispensadores:2, alumnos:120 },
    { id:'b4', nombre:'Baño mujeres · planta alta', zona:'Edificio A', tipo:'mujeres', dispensadores:2, alumnos:118 },
    { id:'b5', nombre:'Baño de talleres',           zona:'Edificio B', tipo:'mixto',   dispensadores:2, alumnos:90  },
    { id:'b6', nombre:'Baño accesible',             zona:'Edificio A', tipo:'accesible',dispensadores:1, alumnos:25  },
  ];

  /* Un generador CON SEMILLA: los mismos datos en cada máquina, para que la
     presentación no cambie de números entre el ensayo y el examen. */
  let s = 20260115;
  const azar = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

  const DIA = 86400000;
  const inicio = new Date(hoy - 21*DIA); inicio.setHours(7,30,0,0);
  /* Intensidad por baño: el de planta baja está junto a la cafetería y se usa
     mucho más. No es adorno — es lo que hace que el ranking tenga algo que
     enseñar. */
  const peso = { b1:1.00, b2:0.95, b3:0.55, b4:0.52, b5:0.40, b6:0.10 };

  e.entregas = [
    { id:'e1', ts:inicio.getTime()-DIA, productoId:'pl', envases:8, costoTotal:1360, proveedor:'Distribuidora local' },
    { id:'e2', ts:inicio.getTime()+9*DIA, productoId:'pl', envases:4, costoTotal:700,  proveedor:'Distribuidora local' },
    { id:'e3', ts:inicio.getTime()-DIA, productoId:'ps', envases:3, costoTotal:255,  proveedor:'Distribuidora local' },
  ];

  const dentro = {};                     /* lo que hay ahora en cada dispensador */
  for(const b of e.banos){ dentro[b.id+'pl'] = 0; dentro[b.id+'ps'] = 0; }

  for(let d = 0; d <= 21; d++){
    const cuando = new Date(inicio.getTime() + d*DIA);
    const finde = cuando.getDay() === 0 || cuando.getDay() === 6;
    for(const b of e.banos){
      /* Se visita a diario salvo fin de semana. Dos veces al día en los dos
         baños grandes: eso es lo que le da material al perfil por horas. */
      const veces = finde ? 0 : (peso[b.id] > 0.9 ? 2 : 1);
      for(let k = 0; k < veces; k++){
        const hora = k === 0 ? 7.5 : 13.5;
        const ts = new Date(cuando); ts.setHours(Math.floor(hora), (hora%1)*60, 0, 0);
        for(const p of [liq, sol]){
          const clave = b.id + p.id;
          /* Gasto desde la visita anterior. El sólido se gasta bastante menos. */
          const base = p.tipo === 'liquido' ? 210 : 26;
          const gastado = finde ? 0
            : base * peso[b.id] * (0.7 + azar()*0.6) * (veces === 2 ? 0.55 : 1);
          dentro[clave] = Math.max(0, dentro[clave] - gastado);
          /* Se rellena cuando baja del 25 % de la capacidad. */
          const cap = p.tipo === 'liquido' ? 1000 * (b.dispensadores||1) : 300;
          let repuesto = 0;
          if(dentro[clave] < cap * 0.25){ repuesto = cap - dentro[clave]; dentro[clave] = cap; }
          e.visitas.push({
            id: idNuevo('v'), ts: ts.getTime(), banoId: b.id, productoId: p.id,
            restante: Math.round((dentro[clave] - repuesto) * 10)/10,
            repuesto: Math.round(repuesto * 10)/10,
            quien: 'Intendencia', nota: '',
          });
        }
      }
    }
  }
  return e;
}

const API = { LLAVE, idNuevo, estadoVacio, cargar, guardar, sanear, hojasDeExcel, datosDemo };
if(typeof module !== 'undefined') module.exports = API;
globalThis.DATOS = API;
})();
