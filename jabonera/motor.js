/* ══════════════════════════════════════════════════════════════════════════
   JABONERA · EL MOTOR
   ──────────────────────────────────────────────────────────────────────────
   Toda la cuenta y NADA de pantalla. Va aparte a propósito: un sistema de
   inventario no se cae por el diseño, se cae por la aritmética — y la
   aritmética no se ve mirando la app, se ve en una prueba.

   LAS CINCO TRAMPAS DE ESTE PROBLEMA, que es lo que este archivo resuelve:

   1. EL CONSUMO NO SE MIDE, SE DEDUCE. Nadie puede ver cuánto jabón se usó:
      sólo se ve cuánto QUEDA. El consumo entre dos visitas es
          (lo que quedaba + lo que se repuso) − lo que queda ahora
      y por eso una visita registra DOS números y no uno. Si alguien rellena
      sin apuntarlo, la resta sale NEGATIVA: eso no se esconde ni se corrige
      en silencio, se cuenta como 0 y se marca como hueco (ver `calidad`).

   2. LÍQUIDO Y SÓLIDO NO SE PUEDEN SUMAR. Un envase de 5 L y una barra de
      100 g no comparten unidad, y meterlos en la misma columna es de donde
      salen los números falsos. Aquí TODO se guarda en unidad canónica —el
      líquido en mL, el sólido en GRAMOS— y la barra es sólo una forma de
      MOSTRARLO (`enPiezas`). Los totales de dos tipos distintos nunca se
      suman: se suman sus COSTOS, que sí comparten unidad.

   3. UN INTERVALO NO CABE EN UN DÍA. Si una visita es el lunes y la
      siguiente el viernes, ese consumo no es «del viernes». Se reparte
      PROPORCIONALMENTE entre los días que abarca (`porDia`). Cargárselo a
      un solo día es la forma más fácil de dibujar una gráfica preciosa y
      mentirosa.

   4. LA HORA SÓLO LA PUEDEN DECIR LOS INTERVALOS CORTOS. Un intervalo de
      cinco días no sabe nada de «a qué hora se gasta». `porHora` usa SÓLO
      los intervalos de menos de 12 h y DEVUELVE CUÁNTOS pudo usar, para que
      la pantalla pueda decir «con 3 mediciones» en vez de fingir certeza.

   5. EL PROMEDIO POR ALUMNO NECESITA DENOMINADOR. Sin alumnos por baño no
      hay promedio por alumno: se devuelve `null`, no un cero que parece un
      dato. Lo mismo con el costo cuando no hay entregas registradas.
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


const DIA = 86400000;

/* ── unidades ─────────────────────────────────────────────────────────────
   Canónica: mL para líquido, GRAMOS para sólido. Todo lo demás es formato. */
const UNIDAD = { liquido: 'mL', solido: 'g' };

/** Convierte a la unidad canónica del producto desde lo que teclea la gente.
 *  El líquido se captura en mL o en L; el sólido en g, kg o PIEZAS (barras),
 *  y para piezas hace falta saber cuánto pesa una — por eso `producto`. */
function aCanonica(cantidad, unidad, producto){
  const n = Number(cantidad);
  if(!isFinite(n)) return 0;
  switch(unidad){
    case 'mL': case 'g': return n;
    case 'L':  return n * 1000;
    case 'kg': return n * 1000;
    case 'pz': {
      const pieza = Number(producto?.gramosPorPieza);
      /* Sin peso de la barra, una pieza no se puede convertir a gramos. Cero
         es la respuesta honesta: la pantalla no debe ofrecer 'pz' si falta. */
      return pieza > 0 ? n * pieza : 0;
    }
    default: return n;
  }
}

/** Gramos → barras, para MOSTRAR. Nunca para guardar. */
function enPiezas(gramos, producto){
  const pieza = Number(producto?.gramosPorPieza);
  return pieza > 0 ? gramos / pieza : null;
}

/* ── el costo, que es un promedio ponderado y no el último precio ─────────
   Si se compraron 20 L a $300 y luego 5 L a $100, el mL no cuesta ni lo uno
   ni lo otro: cuesta (300+100)/(25000). Usar el último precio infla o
   desinfla el gasto histórico entero. */
function costoPorUnidad(productoId, entregas, productos){
  const p = productos.find(x => x.id === productoId);
  if(!p) return null;
  let unidades = 0, pesos = 0;
  for(const e of entregas){
    if(e.productoId !== productoId) continue;
    unidades += Number(e.envases) * Number(p.tamanoEnvase);
    pesos    += Number(e.costoTotal);
  }
  if(unidades <= 0) return null;      /* sin compras no hay precio que inventar */
  return pesos / unidades;
}

/* ── el consumo, que es una resta entre visitas ───────────────────────────── */

/** Ordena las visitas de un mismo baño y producto y devuelve los INTERVALOS.
 *  Cada intervalo es el trozo de tiempo entre dos visitas seguidas, con lo
 *  que se gastó dentro. Una sola visita no produce ningún intervalo: con un
 *  solo punto no hay consumo que medir, y ésa es la respuesta correcta. */
function intervalos(visitas){
  const por = new Map();
  for(const v of visitas){
    const k = v.banoId + '·' + v.productoId;
    if(!por.has(k)) por.set(k, []);
    por.get(k).push(v);
  }
  const out = [];
  for(const [, lista] of por){
    lista.sort((a,b) => a.ts - b.ts);
    for(let i = 1; i < lista.length; i++){
      const a = lista[i-1], b = lista[i];
      const bruto = (Number(a.restante) + Number(a.repuesto)) - Number(b.restante);
      out.push({
        banoId: b.banoId, productoId: b.productoId,
        desde: a.ts, hasta: b.ts, horas: (b.ts - a.ts) / 3600000,
        consumo: Math.max(0, bruto),
        /* El hueco NO se borra: es la señal de que alguien rellenó sin
           apuntarlo, y eso hay que poder decirlo en voz alta. */
        hueco: bruto < 0 ? -bruto : 0,
      });
    }
  }
  return out.sort((x,y) => x.hasta - y.hasta);
}

/** Filtra intervalos a una ventana [desde, hasta] por su fecha de cierre. */
function enRango(lista, desde, hasta){
  return lista.filter(i =>
    (desde == null || i.hasta >= desde) && (hasta == null || i.hasta <= hasta));
}

/* ── los cortes que pide el análisis ─────────────────────────────────────── */

/** Consumo por baño, de mayor a menor. Separado POR PRODUCTO, porque sumar
 *  mL con gramos es la trampa nº 2. */
function porBano(ints, banos){
  const m = new Map();
  for(const i of ints){
    const k = i.banoId + '·' + i.productoId;
    const a = m.get(k) || { banoId: i.banoId, productoId: i.productoId, consumo: 0, intervalos: 0, huecos: 0 };
    a.consumo += i.consumo; a.intervalos++; a.huecos += i.hueco > 0 ? 1 : 0;
    m.set(k, a);
  }
  const out = [...m.values()];
  for(const r of out) r.bano = banos.find(b => b.id === r.banoId) || null;
  return out.sort((a,b) => b.consumo - a.consumo);
}

/** Consumo repartido por DÍA. Un intervalo que abarca cuatro días pone un
 *  cuarto en cada uno — ver trampa nº 3. Devuelve un mapa AAAA-MM-DD → mL/g
 *  por producto. */
function porDia(ints){
  const m = new Map();
  for(const i of ints){
    const ini = i.desde, fin = i.hasta;
    const span = Math.max(fin - ini, 1);
    /* Se recorre día a día y se reparte según cuánto del día cae dentro. */
    let cursor = new Date(ini); cursor.setHours(0,0,0,0);
    let t0 = cursor.getTime();
    let vueltas = 0;
    while(t0 < fin && vueltas++ < 400){
      const t1 = t0 + DIA;
      const solapa = Math.min(fin, t1) - Math.max(ini, t0);
      if(solapa > 0){
        const clave = fechaISO(t0) + '·' + i.productoId;
        const a = m.get(clave) || { dia: fechaISO(t0), productoId: i.productoId, consumo: 0 };
        a.consumo += i.consumo * (solapa / span);
        m.set(clave, a);
      }
      t0 = t1;
    }
  }
  return [...m.values()].sort((a,b) => a.dia < b.dia ? -1 : 1);
}

/** Consumo por día de la SEMANA (0 = domingo). Mismo reparto proporcional. */
function porDiaSemana(ints){
  const acc = Array.from({length:7}, (_,d) => ({ dia:d, consumo:0 }));
  for(const d of porDia(ints)){
    const [a,m,x] = d.dia.split('-').map(Number);
    acc[new Date(a, m-1, x).getDay()].consumo += d.consumo;
  }
  return acc;
}

/** Perfil por HORA — trampa nº 4. Sólo intervalos de menos de `topeHoras`,
 *  y se informa CON CUÁNTOS se hizo para que nadie lo lea como certeza. */
function porHora(ints, topeHoras = 12){
  const acc = Array.from({length:24}, (_,h) => ({ hora:h, consumo:0 }));
  const usados = ints.filter(i => i.horas > 0 && i.horas <= topeHoras);
  for(const i of usados){
    /* Se reparte por horas del reloj que abarca el intervalo. */
    const pasos = Math.max(1, Math.round(i.horas));
    for(let k = 0; k < pasos; k++){
      const t = i.desde + (i.hasta - i.desde) * (k + .5) / pasos;
      acc[new Date(t).getHours()].consumo += i.consumo / pasos;
    }
  }
  return { horas: acc, muestras: usados.length, descartados: ints.length - usados.length, topeHoras };
}

/* ── existencias y dinero ─────────────────────────────────────────────────── */

/** Lo que queda en el almacén: lo que entró menos lo que se llevó a los baños.
 *  NO cuenta lo que sigue dentro de los dispensadores: eso ya salió del
 *  almacén. Son dos preguntas distintas y mezclarlas da un inventario que
 *  nunca cuadra con el estante. */
function existencias(productos, entregas, visitas){
  return productos.map(p => {
    const entro = entregas.filter(e => e.productoId === p.id)
      .reduce((s,e) => s + Number(e.envases) * Number(p.tamanoEnvase), 0);
    const salio = visitas.filter(v => v.productoId === p.id)
      .reduce((s,v) => s + Number(v.repuesto), 0);
    const enDispensadores = ultimoRestantePorBano(visitas, p.id);
    return { producto: p, entro, salio, almacen: entro - salio, enDispensadores };
  });
}

/** Suma del último `restante` conocido de cada baño para un producto: lo que
 *  hay puesto ahora mismo en los dispensadores. */
function ultimoRestantePorBano(visitas, productoId){
  const ult = new Map();
  for(const v of visitas){
    if(v.productoId !== productoId) continue;
    const a = ult.get(v.banoId);
    if(!a || v.ts > a.ts) ult.set(v.banoId, v);
  }
  return [...ult.values()].reduce((s,v) => s + Number(v.restante), 0);
}

/** Dinero. Devuelve `null` en `costo` cuando no hay entregas: un gasto de $0
 *  y un gasto DESCONOCIDO no son lo mismo y no se pueden pintar igual. */
function dinero(ints, productos, entregas){
  let gasto = 0, conPrecio = 0, sinPrecio = 0;
  const porProducto = new Map();
  for(const i of ints){
    const c = costoPorUnidad(i.productoId, entregas, productos);
    if(c == null){ sinPrecio += i.consumo; continue; }
    const $ = i.consumo * c;
    gasto += $; conPrecio += i.consumo;
    porProducto.set(i.productoId, (porProducto.get(i.productoId) || 0) + $);
  }
  const invertido = entregas.reduce((s,e) => s + Number(e.costoTotal), 0);
  return {
    gasto: conPrecio > 0 ? gasto : null,
    invertido,
    porProducto: [...porProducto].map(([productoId, pesos]) => ({ productoId, pesos })),
    consumoSinPrecio: sinPrecio,
  };
}

/** Días que aguantan las existencias al ritmo medido. `null` si no hay ritmo
 *  (sin datos no se proyecta: se dice que no se sabe). */
function proyeccion(existencia, consumoDiario){
  if(!(consumoDiario > 0)) return null;
  return existencia / consumoDiario;
}

/* ── promedios por alumno ─────────────────────────────────────────────────── */

/** Consumo por alumno y por día. `null` si el baño no tiene alumnos
 *  asignados — trampa nº 5: una división sin denominador no es un cero. */
function porAlumno(ints, bano){
  const alumnos = Number(bano?.alumnos);
  if(!(alumnos > 0)) return null;
  const dias = diasCubiertos(ints);
  if(!(dias > 0)) return null;
  const consumo = ints.reduce((s,i) => s + i.consumo, 0);
  return consumo / alumnos / dias;
}

/** Días REALES que cubren los intervalos: de la primera medición a la
 *  última. No es «cuántos días lleva el proyecto»: es cuánto tiempo hay
 *  efectivamente medido. */
function diasCubiertos(ints){
  if(!ints.length) return 0;
  const ini = Math.min(...ints.map(i => i.desde));
  const fin = Math.max(...ints.map(i => i.hasta));
  return Math.max((fin - ini) / DIA, 0);
}

/* ── el dispensador mecánico ──────────────────────────────────────────────── */

/** Cuántos lavados salieron de ese jabón. Es el número que de verdad se
 *  entiende en una presentación: «1 250 lavadas de manos», no «6 300 mL».
 *
 *  ⚠ ESTO YA ESTUVO MAL UNA VEZ y no lo cazó ninguna prueba: dividía los
 *  GRAMOS del jabón en barra entre los MILILITROS por pulsada del
 *  dispensador de líquido, y soltaba «1 205 lavadas» tan campante. Es la
 *  trampa nº 2 entrando por la puerta de atrás. Ahora cada tipo tiene su
 *  propia medida y, si no está medida, se contesta que no se sabe:
 *   · líquido → `dispensador.dosisPorPulsada` en mL por pulsada;
 *   · barra   → `producto.gramosPorLavada`, que se mide pesando la barra
 *               antes y después de N lavadas. Es, de hecho, un experimento
 *               mejor que el del líquido. */
function lavados(consumo, dispensador, producto){
  const tipo = producto?.tipo;
  if(tipo === 'solido'){
    const g = Number(producto?.gramosPorLavada);
    return g > 0 ? consumo / g : null;
  }
  if(tipo && tipo !== 'liquido') return null;
  const dosis = Number(dispensador?.dosisPorPulsada);
  if(!(dosis > 0)) return null;
  return consumo / dosis;
}

/** Cuántas recargas completas caben en lo que queda en almacén.
 *
 *  ⚠ TERCERA VEZ QUE LA MISMA TRAMPA INTENTA COLARSE. La capacidad del
 *  dispensador está en MILILITROS; el almacén de jabón en barra está en
 *  GRAMOS. La pantalla soltaba «alcanza para 1.3 recargas» dividiendo gramos
 *  entre mililitros. Ahora la función exige saber de qué producto habla y se
 *  niega si no es líquido: un dispensador de bombeo no se recarga con barras.
 *  La comprobación vive AQUÍ y no en la pantalla porque la pantalla ya se
 *  equivocó una vez. */
function recargasPosibles(almacen, dispensador, producto){
  if(producto && producto.tipo !== 'liquido') return null;
  const cap = Number(dispensador?.capacidad);
  if(!(cap > 0)) return null;
  return almacen / cap;
}

/* ── la honestidad del análisis ───────────────────────────────────────────── */

/** Lo que la pantalla tiene que poder decir en voz alta antes de enseñar una
 *  sola gráfica. Un análisis que no dice sobre cuántos datos está hablando
 *  es una opinión con ejes. */
function calidad(visitas, ints, banos){
  const conDatos = new Set(ints.map(i => i.banoId));
  const huecos = ints.filter(i => i.hueco > 0);
  return {
    visitas: visitas.length,
    intervalos: ints.length,
    dias: diasCubiertos(ints),
    banosSinDatos: banos.filter(b => !conDatos.has(b.id)).map(b => b.nombre),
    banosConUnaSolaVisita: banos.filter(b => {
      const n = visitas.filter(v => v.banoId === b.id).length;
      return n === 1;
    }).map(b => b.nombre),
    huecos: huecos.length,
    huecoTotal: huecos.reduce((s,i) => s + i.hueco, 0),
    /* Regla de dedo declarada, no escondida: con menos de 2 semanas y menos
       de 3 intervalos por baño, los promedios se mueven muchísimo. */
    suficiente: ints.length >= 6 && diasCubiertos(ints) >= 7,
  };
}

/* ── utilidades de fecha ──────────────────────────────────────────────────── */
function fechaISO(ts){
  const d = new Date(ts);
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function fechaHora(ts){
  const d = new Date(ts);
  const p = n => String(n).padStart(2,'0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ── el informe entero, de una ────────────────────────────────────────────── */
function informe(estado, desde = null, hasta = null){
  const { banos, productos, visitas, entregas, dispensador } = estado;
  const todos = intervalos(visitas);
  const ints  = enRango(todos, desde, hasta);
  const dias  = diasCubiertos(ints);

  const porProducto = productos.map(p => {
    const mios = ints.filter(i => i.productoId === p.id);
    const consumo = mios.reduce((s,i) => s + i.consumo, 0);
    const ex = existencias([p], entregas, visitas)[0];
    return {
      producto: p, consumo,
      unidad: UNIDAD[p.tipo],
      piezas: p.tipo === 'solido' ? enPiezas(consumo, p) : null,
      diario: dias > 0 ? consumo / dias : null,
      lavados: lavados(consumo, dispensador, p),
      almacen: ex.almacen,
      enDispensadores: ex.enDispensadores,
      diasRestantes: proyeccion(ex.almacen, dias > 0 ? consumo / dias : 0),
      costoUnidad: costoPorUnidad(p.id, entregas, productos),
    };
  });

  /* ⚠ La semana y las horas se calculan de UN SOLO PRODUCTO —el de mayor
     consumo— y no de todos juntos. Sumar mililitros con gramos en la misma
     barra es la trampa nº 2, y se me coló justo aquí: las dos gráficas salían
     con un eje que no era ninguna unidad. Se ve bonito y no significa nada. */
  const principal = [...porProducto].sort((a,b) => b.consumo - a.consumo)[0] || null;
  const deUno = principal ? ints.filter(i => i.productoId === principal.producto.id) : [];

  return {
    rango: { desde, hasta, dias },
    principal,
    porProducto,
    banos: porBano(ints, banos).map(r => ({
      ...r,
      porAlumno: porAlumno(ints.filter(i => i.banoId === r.banoId && i.productoId === r.productoId),
                           banos.find(b => b.id === r.banoId)),
    })),
    dia: porDia(ints),
    semana: porDiaSemana(deUno),
    hora: porHora(deUno),
    dinero: dinero(ints, productos, entregas),
    calidad: calidad(visitas, ints, banos),
    intervalos: ints,
  };
}

const API = {
  DIA, UNIDAD,
  aCanonica, enPiezas, costoPorUnidad,
  intervalos, enRango, porBano, porDia, porDiaSemana, porHora,
  existencias, ultimoRestantePorBano, dinero, proyeccion,
  porAlumno, diasCubiertos, lavados, recargasPosibles, calidad,
  fechaISO, fechaHora, informe,
};

/* Tres formas de cargarlo, un solo archivo: `module.exports` para node,
   `globalThis` para la página. `globalThis` y no `window` para que también
   sirva desde un Worker, que no tiene `window`. */
if(typeof module !== 'undefined') module.exports = API;
globalThis.JABONERA = API;
})();
