/* ══════════════════════════════════════════════════════════════════════════
   buscador.mjs — EL CEREBRO, la parte que corre EN CUALQUIER LADO
   ──────────────────────────────────────────────────────────────────────────
   Aquí vive todo lo que NO toca el disco: los campos de cada clase, la
   búsqueda, las vecinas, la revisión de integridad y el grafo.

   POR QUÉ ESTÁ SEPARADO. `cerebro.mjs` importa `node:fs` en su primera línea,
   y eso lo vuelve inservible fuera de Node — un worker de Cloudflare, un
   navegador o cualquier otro agente no lo pueden cargar. Es EXACTAMENTE lo que
   ya nos costó una auditoría con `tipos.mjs`: el plan del sitio afirmaba que
   corría en el navegador y no corría, porque importaba `node:fs` arriba.

   Esta vez se separó ANTES de que mordiera, y por eso el cerebro se le puede
   abrir a cualquier IA que hable HTTP sin copiar la búsqueda a otro lado.

   Sin dependencias. Sin `node:`. Sin globales. Se importa desde donde sea.
   ═════════════════════════════════════════════════════════════════════════ */

export const CAMPOS = {
  error:    ['id','titulo','sintoma','causa','porque','arreglo','comoCazarlo','consejo','senales'],
  pieza:    ['id','titulo','que','donde','porque','ojo','senales'],
  decision: ['id','titulo','que','porque','alternativas','ojo','senales'],
};
export const claseDe = (n) => CAMPOS[n.clase] ? n.clase : 'error';
export const OBLIGATORIOS = CAMPOS.error;

export const aplanar = (areas) => areas.flatMap(a => a.neuronas);

/* ── buscar ────────────────────────────────────────────────────────────────
   Se busca sobre todo en `senales`: las frases con las que una PERSONA
   describe el problema, no los términos técnicos. Quien tiene el bug enfrente
   dice «se ve chiquito en el celular», no «falta el meta viewport» — si
   supiera eso, ya lo habría arreglado. */
/* ── las muletillas no son palabras de búsqueda ────────────────────────────
   Salió buscando «qué estilo le pongo al sitio»: la primera respuesta fue una
   neurona de codificación de caracteres, que no tiene nada que ver. La causa
   es que `que` mide tres letras y casa con el `sintoma`, la `causa` o el
   `consejo` de CASI TODA neurona en español — así que la búsqueda le sumaba
   puntos a todo el corpus por igual y ganaba la que tuviera los campos más
   largos, no la que hablara del tema.

   No se nota con veinte neuronas; con noventa lo arruina todo. Y las pruebas
   no lo cazaban porque los casos estaban escritos con palabras con contenido,
   sin las muletillas con las que de verdad habla una persona. */
const VACIAS = new Set(['que','con','por','para','como','esta','este','pero','muy',
                        'los','las','del','una','uno','sin','ver','hay','mas','ya',
                        'cual','cuales','donde','cuando','pongo','tiene','tengo',
                        'lo','se','no','si','me','le','al','en','de','la','el','y','a']);

export function buscar(neuronas, texto){
  const q = normal(texto);
  if(!q) return [];
  const palabras = q.split(/\s+/).filter(p => p.length > 2 && !VACIAS.has(p));
  if(!palabras.length) return [];

  return neuronas.map(n => {
    let puntos = 0;
    for(const s of (n.senales || [])){
      const sn = normal(s);
      if(q.includes(sn)) puntos += 12;                     /* la señal completa */
      else if(palabras.filter(p => sn.includes(p)).length >= 2) puntos += 6;
    }
    const campos = [['titulo', 5], ['sintoma', 3], ['que', 3], ['causa', 2],
                    ['consejo', 1], ['ojo', 1], ['donde', 2], ['id', 4], ['area', 3]];
    for(const [c, peso] of campos){
      const v = normal(n[c] || '');
      for(const p of palabras) if(v.includes(p)) puntos += peso;
    }
    return { n, puntos };
  })
  .filter(x => x.puntos > 0)
  .sort((a, b) => b.puntos - a.puntos || pesoGravedad(b.n) - pesoGravedad(a.n))
  .map(x => x.n);
}

const pesoGravedad = (n) => ({ alta:3, media:2, baja:1 })[n.gravedad] || 0;

/* ── cuándo dos señales cuentan como la misma ──────────────────────────────
   Con `includes` a secas todo se conectaba con todo y el grafo salía en UNA
   sola comunidad, inservible. La causa era bonita: la señal «Â» se normaliza
   a «a» —se le quita el acento— y «a» es subcadena de casi cualquier frase.

   Entonces: una señal corta tiene que coincidir COMPLETA; sólo las de seis
   letras para arriba pueden contar como subcadena. */
const CORTA = 6;
const palabrasDe = (t) => t.split(/\s+/).filter(p => p.length >= 4 && !VACIAS.has(p));

function parecidas(a, b){
  if(a === b) return true;
  /* Subcadena, sólo entre señales largas: con las cortas todo se conecta con
     todo — la señal «Â» se normaliza a «a» y es subcadena de casi cualquier
     frase, y el grafo salía en UNA comunidad, inservible. */
  if(a.length >= CORTA && b.length >= CORTA && (a.includes(b) || b.includes(a))) return true;
  /* Y dos palabras de contenido en común. Sin esto el descubrimiento casi no
     disparaba (4 de 49): «se ve chiquito en el celular» y «se ve chiquito en
     el teléfono» son la misma señal y no compartían subcadena. */
  const pa = palabrasDe(a), pb = palabrasDe(b);
  return pa.filter(p => pb.includes(p)).length >= 2;
}

/* Sin acentos y en minúsculas: nadie escribe «codificación» con tilde cuando
   está apurado buscando por qué se le rompió algo. */
export const normal = (t) => String(t || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ── vecinas ───────────────────────────────────────────────────────────────
   Las declaradas a mano, más las que comparten señales. Lo segundo es lo que
   hace que el cerebro descubra parentescos que nadie escribió. */
export function vecinas(neuronas, id){
  const yo = neuronas.find(n => n.id === id);
  if(!yo) return { error: `No hay ninguna neurona con id "${id}".` };

  const dichas = (yo.vecinas || [])
    .map(v => neuronas.find(n => n.id === v))
    .filter(Boolean)
    .map(n => ({ ...n, porQue: 'declarada' }));

  const mias = new Set((yo.senales || []).map(normal));
  const similares = neuronas
    .filter(n => n.id !== id && !(yo.vecinas || []).includes(n.id))
    .map(n => {
      const comunes = (n.senales || []).filter(s => {
        const sn = normal(s);
        return [...mias].some(m => parecidas(m, sn));
      });
      return { n, comunes };
    })
    .filter(x => x.comunes.length)
    .sort((a, b) => b.comunes.length - a.comunes.length)
    .slice(0, 4)
    .map(x => ({ ...x.n, porQue: `comparten señal: ${x.comunes.join(', ')}` }));

  return { yo, vecinas: dichas.concat(similares) };
}

/* ── revisar ───────────────────────────────────────────────────────────────
   Un cerebro con ligas rotas miente, y mentir aquí es peor que no existir:
   alguien va a seguir un consejo que apunta a nada. */
export function revisar(areas){
  const todas = aplanar(areas);
  const ids = new Set();
  const fallas = [];

  for(const n of todas){
    for(const c of CAMPOS[claseDe(n)]){
      const v = n[c];
      if(v == null || (typeof v === 'string' && !v.trim()) ||
         (Array.isArray(v) && !v.length)){
        fallas.push(`${n.id || '(sin id)'}: le falta "${c}"`);
      }
    }
    if(ids.has(n.id)) fallas.push(`${n.id}: el id está repetido`);
    ids.add(n.id);
    if(n.gravedad && !['alta','media','baja'].includes(n.gravedad)){
      fallas.push(`${n.id}: gravedad "${n.gravedad}" no existe`);
    }
  }
  for(const n of todas){
    for(const v of (n.vecinas || [])){
      if(!ids.has(v)) fallas.push(`${n.id}: apunta a "${v}", que no existe`);
    }
    if((n.vecinas || []).includes(n.id)) fallas.push(`${n.id}: se apunta a sí misma`);
  }
  return { total: todas.length, areas: areas.length, fallas };
}

/* ── el grafo y sus comunidades ────────────────────────────────────────────
   Las áreas las escogí yo al crear los archivos. Las COMUNIDADES las descubre
   el grafo: quién habla con quién de verdad. Casi nunca coinciden, y ahí está
   lo interesante — «charset» vive en despliegue y su comunidad real incluye
   piezas del sitio y neuronas de diseño, porque es con esas con las que
   aparece junto en un problema.

   El método es propagación de etiquetas: cada nodo toma la etiqueta más común
   entre sus vecinos, y se repite hasta que deja de moverse. Es el más simple
   que funciona y no necesita librerías — que aquí importa, porque el cerebro
   tiene que poder correr sin instalar nada.

   Se ordena por id antes de propagar para que el resultado sea SIEMPRE el
   mismo. Un grafo que se reagrupa distinto en cada carga no se puede leer. */
export function grafo(neuronas){
  const porId = new Map(neuronas.map(n => [n.id, n]));
  const enlaces = [];
  const vistos = new Set();

  const poner = (a, b, tipo, porQue) => {
    if(a === b) return;
    const llave = a < b ? `${a}|${b}` : `${b}|${a}`;
    if(vistos.has(llave)) return;
    vistos.add(llave);
    enlaces.push({ de:a, a:b, tipo, porQue });
  };

  for(const n of neuronas){
    for(const v of (n.vecinas || [])) if(porId.has(v)) poner(n.id, v, 'dicha', 'la menciona');
  }
  /* Y los que nadie escribió: los que se describen con las mismas palabras. */
  for(let i = 0; i < neuronas.length; i++){
    for(let j = i + 1; j < neuronas.length; j++){
      const a = neuronas[i], b = neuronas[j];
      const sa = (a.senales || []).map(normal), sb = (b.senales || []).map(normal);
      const comunes = sa.filter(x => sb.some(y => parecidas(x, y)));
      if(comunes.length) poner(a.id, b.id, 'hallada', `se describen igual: «${comunes[0]}»`);
    }
  }

  const vecinasDe = new Map(neuronas.map(n => [n.id, []]));
  for(const e of enlaces){ vecinasDe.get(e.de).push(e.a); vecinasDe.get(e.a).push(e.de); }

  const orden = [...neuronas].map(n => n.id).sort();
  const etiqueta = new Map(orden.map(id => [id, id]));
  for(let vuelta = 0; vuelta < 25; vuelta++){
    let movio = false;
    for(const id of orden){
      const cuenta = new Map();
      for(const v of vecinasDe.get(id)){
        const e = etiqueta.get(v);
        cuenta.set(e, (cuenta.get(e) || 0) + 1);
      }
      if(!cuenta.size) continue;
      /* En empate gana la etiqueta menor por orden alfabético: sin esa regla
         el resultado cambia entre corridas y el mapa se vuelve inservible. */
      let mejor = null, mas = -1;
      for(const [e, c] of [...cuenta].sort((x, y) => String(x[0]).localeCompare(String(y[0])))){
        if(c > mas){ mas = c; mejor = e; }
      }
      if(mejor && mejor !== etiqueta.get(id)){ etiqueta.set(id, mejor); movio = true; }
    }
    if(!movio) break;
  }

  const grupos = new Map();
  for(const id of orden){
    const e = etiqueta.get(id);
    if(!grupos.has(e)) grupos.set(e, []);
    grupos.get(e).push(id);
  }

  /* A cada comunidad se le pone de nombre el título de su nodo más conectado:
     un número no le dice nada a nadie. */
  const comunidades = [...grupos.entries()]
    .map(([_, ids]) => {
      const centro = ids.slice().sort((a, b) =>
        vecinasDe.get(b).length - vecinasDe.get(a).length || a.localeCompare(b))[0];
      return { centro, nombre: porId.get(centro).titulo, ids };
    })
    .sort((a, b) => b.ids.length - a.ids.length);

  comunidades.forEach((c, i) => c.ids.forEach(id => { porId.get(id).comunidad = i; }));

  return {
    enlaces,
    comunidades,
    grados: Object.fromEntries(neuronas.map(n => [n.id, vecinasDe.get(n.id).length])),
  };
}

/* ── armar ─────────────────────────────────────────────────────────────────
   Un solo archivo para servirlo y para que un agente lo baje de un jalón. */

/* ══════════════════════════════════════════════════════════════════════════
   EL CEREBRO POR ARCHIVO · «¿qué es esto y qué rompo si le muevo?»
   ──────────────────────────────────────────────────────────────────────────
   De dónde salió, y es una corrección de Carlos con toda la razón: yo me
   acababa de gastar media sesión LEYENDO `fadori/nucleo.js`, `mostrador.html`
   y `servidor/src/index.js` de arriba abajo para entender cómo se guardaba
   una deuda. Él lo cachó al vuelo: «eso que acabas de hacer de leer los
   archivos del proyecto para saber cómo funciona es lo que quiero que la red
   neuronal elimine — con la red ya sabrías dónde está, qué hace, qué
   apartados se pueden romper si se edita».

   Tenía razón y el hueco era real: las neuronas de clase `pieza` decían
   `donde` en PROSA («sala/index.html · sala/servidor/»), que un humano lee
   pero un agente no puede consultar. Un agente que va a tocar un archivo no
   pregunta «¿qué sabes de La Sala?»: tiene una RUTA en la mano.

   Por eso ahora cada neurona puede traer `toca`: rutas de verdad. Y con eso
   la pregunta se invierte — en vez de buscar por tema y esperar suerte, se
   pregunta por el archivo que se va a editar y el cerebro contesta qué es,
   qué ya se rompió ahí antes y con qué hay que tener cuidado.

   `toca` acepta un archivo (`fadori/nucleo.js`) o una carpeta
   (`sala/servidor/`). Una carpeta cubre todo lo que cuelga de ella.
   ═════════════════════════════════════════════════════════════════════════ */

/* Rutas comparables: sin `./`, sin `/` al final, sin barras de Windows. */
export function rutaLimpia(r){
  return String(r || '').trim().replace(/\\/g, '/')
    .replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+$/, '');
}

/* ¿La neurona habla de este archivo? Tres formas de que sí:
     · la ruta es exactamente la que apunta          fadori/nucleo.js
     · la neurona apunta a una carpeta que lo contiene   sala/servidor/
     · la neurona apunta a un archivo DENTRO de la carpeta que se preguntó
       — que es el caso de «¿qué sé de `fadori/`?» y también importa. */
export function tocaA(neurona, ruta){
  const r = rutaLimpia(ruta);
  if(!r) return false;
  return (neurona.toca || []).some(t => {
    const c = rutaLimpia(t);
    if(!c) return false;
    return c === r || r.startsWith(c + '/') || c.startsWith(r + '/');
  });
}

/* Todo lo que el cerebro sabe de una ruta, ordenado como se necesita leerlo:
   primero QUÉ ES (piezas), luego LO QUE YA SE ROMPIÓ AHÍ (errores), luego POR
   QUÉ ESTÁ ASÍ (decisiones). Ese orden no es estético: si un agente sólo
   alcanza a leer lo primero, que sea lo que le dice dónde está parado. */
const PESO_CLASE = { pieza: 0, error: 1, decision: 2 };

export function sobreArchivo(neuronas, ruta){
  const r = rutaLimpia(ruta);
  const dan = neuronas.filter(n => tocaA(n, r));
  dan.sort((a, b) =>
    (PESO_CLASE[claseDe(a)] - PESO_CLASE[claseDe(b)]) ||
    String(a.id).localeCompare(String(b.id)));

  /* El aviso es lo que de verdad se venía a buscar: qué se rompe si le mueves.
     Sale del campo `ojo` de piezas y decisiones y del `comoCazarlo` de los
     errores, que es lo mismo dicho desde el otro lado. */
  const cuidado = dan.flatMap(n => {
    const t = claseDe(n) === 'error' ? n.comoCazarlo : n.ojo;
    return t ? [{ id: n.id, titulo: n.titulo, clase: claseDe(n), aviso: t }] : [];
  });

  return {
    ruta: r,
    cuantas: dan.length,
    piezas:    dan.filter(n => claseDe(n) === 'pieza'),
    errores:   dan.filter(n => claseDe(n) === 'error'),
    decisiones:dan.filter(n => claseDe(n) === 'decision'),
    cuidado,
    /* A dónde seguir: las vecinas de todo lo que salió, sin repetir y sin
       incluir lo que ya se está enseñando. */
    lleva: [...new Set(dan.flatMap(n => n.vecinas || []))]
             .filter(id => !dan.some(n => n.id === id)),
  };
}

/* El índice al revés: ruta → ids. Sirve para pintar el mapa y para saber, de
   un vistazo, qué parte del repo el cerebro NO conoce. */
export function indiceDeArchivos(neuronas){
  const ind = {};
  for(const n of neuronas){
    for(const t of (n.toca || [])){
      const c = rutaLimpia(t);
      if(!c) continue;
      (ind[c] = ind[c] || []).push(n.id);
    }
  }
  for(const k in ind) ind[k].sort();
  return ind;
}

/* Qué carpetas del repo no tienen ni una neurona. Un cerebro que no sabe qué
   ignora se cree completo, y ése es el estado en el que un agente vuelve a
   leerse los archivos a mano sin saber que había atajo. */
export function cobertura(neuronas, carpetas){
  const ind = indiceDeArchivos(neuronas);
  const cubiertas = Object.keys(ind);
  const con = [], sin = [];
  for(const c of carpetas.map(rutaLimpia).filter(Boolean)){
    const ids = new Set();
    for(const k of cubiertas){
      if(k === c || k.startsWith(c + '/') || c.startsWith(k + '/')){
        ind[k].forEach(id => ids.add(id));
      }
    }
    (ids.size ? con : sin).push({ carpeta: c, neuronas: [...ids].sort() });
  }
  return { con, sin, porcentaje: carpetas.length
    ? Math.round(con.length / carpetas.length * 100) : 0 };
}
