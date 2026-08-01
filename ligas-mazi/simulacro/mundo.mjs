/* ============================================================================
   mundo.mjs — LA TEMPORADA DE VERDAD
   ----------------------------------------------------------------------------
   Aquí vive el estado del torneo: la liga, sus equipos, el rol de juegos, los
   partidos minuto a minuto, los puntos del visitante, la tienda por códigos y
   las tres fases hasta el campeón.

   POR QUÉ ESTE ARCHIVO NO ABRE UN NAVEGADOR. Son dos trabajos distintos y
   mezclarlos fue lo que hizo lentos otros simulacros:

     · AQUÍ se decide QUÉ pasa en la temporada. Es determinista, corre en
       milisegundos y se puede repetir idéntico con la misma semilla.
     · En `app.mjs` se mete ese "qué pasó" a la app REAL en un navegador y se
       comprueba que la app lo cuente bien. Ahí es donde salen los bugs.

   Si el simulacro tuviera que abrir una pantalla para cada tiro de cada partido
   de nueve categorías, no acabaría hoy — y Carlos pidió acabar rápido.

   ── LO QUE CARLOS DICTÓ Y AQUÍ SE RESPETA ────────────────────────────────
   · Los partidos SÍ suceden. Las esperas son falsas, el juego no.
   · El visitante gana 5 puntos por minuto visto (en el simulacro, por segundo).
   · "Primera vez" es del EQUIPO y contra su historia COMPLETA, no contra la
     liga en curso. Un equipo que ya jugó otra liga NO es nuevo.
   · La tienda cobra PUNTOS por el acceso a un código; el precio en pesos se
     enseña aparte. Al canjear el código, el producto baja uno de existencia.
     Todo detrás de una perilla de la liga.
   · El coach mete cambios, mueve posiciones, edita su estrategia y deja notas.
   ==========================================================================*/

import { jornadas } from './personas.mjs';

/* Mismo dado que el reparto: semilla fija, temporada repetible. Un fallo que no
   se puede volver a producir no se puede arreglar. */
export function dado(semilla){
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export const POSICIONES = ['Base','Escolta','Alero','Ala-pívot','Pívot'];

const LUGARES = ['Gimnasio Municipal', 'Deportiva Juriquilla', 'CBTis 118',
  'Unidad Bicentenario', 'Cancha del Cerro', 'Club Alameda'];
const DIAS = ['sábado','domingo'];
const HORAS = ['09:00','10:30','12:00','13:30','16:00','17:30'];

/* ══════════════════════════════════════════════════════════════════════════
   1 · ABRIR UNA LIGA
   Recibe el reparto (la gente) y arma la temporada. El historial de cada equipo
   se ARRASTRA entre pasadas: es lo que hace que en la pasada 2 los equipos ya
   no sean "nuevos" y que la pantalla previa al partido cambie de mensaje.
   ══════════════════════════════════════════════════════════════════════════ */
export function abrirLiga({ nombre, reparto, semilla = 9111, historialPrevio = null }){
  const rnd = dado(semilla);
  const equipos = reparto.equipos.map(e => ({
    ...e,
    historial: historialPrevio?.[e.id]
      ? { ...historialPrevio[e.id] }
      : { ligas: 0, partidos: 0, ganados: 0, perdidos: 0, puntosF: 0, puntosC: 0 },
    temporada: { j: 0, g: 0, p: 0, pf: 0, pc: 0 },
    // La alineación del coach: quién juega de qué. Empieza por defecto y el
    // coach la va a mover — antes del partido y durante.
    alineacion: {},
    estrategia: 'man',
    notas: [],
  }));
  equipos.forEach(eq => { eq.historial.ligas += 1; });

  const jugadores = {};
  reparto.personas.filter(p => p.rol === 'jugador').forEach(p => {
    jugadores[p.id] = {
      ...p,
      dorsal: 0,
      pos: 'Base',
      temporada: { pj:0, pts:0, faltas:0, min:0 },
      carrera: jugadores[p.id]?.carrera || { pj:0, pts:0, faltas:0 },
      monedas: 0,
    };
  });

  // Dorsales y posiciones de arranque, por equipo. El coach las va a cambiar,
  // pero alguien tiene que ponerlas primero: es lo que hace un roster nuevo.
  equipos.forEach(eq => {
    eq.jugadores.forEach((jid, i) => {
      const j = jugadores[jid]; if (!j) return;
      j.dorsal = 3 + i;
      j.pos = POSICIONES[i % 5];
      eq.alineacion[jid] = j.pos;
    });
  });

  return {
    nombre, semilla, fase: 'inscripcion',
    admin: reparto.admin.id,
    categorias: reparto.categorias,
    equipos, jugadores,
    calendario: [],
    seguidores: {},        // personaId → true
    puntos: {},            // personaId → puntos por ver partidos
    vistas: {},            // personaId → segundos vistos
    sobres: {},            // personaId → sobres de gachapón abiertos
    tienda: nuevaTienda(rnd),
    perillas: { tiendaPorPuntos: true, gachaVisitantes: true },
    bitacora: [],
    rnd,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · EL ROL DE JUEGOS
   Una jornada por semana, un partido por equipo por jornada, todos contra
   todos. Cada partido lleva SU CATEGORÍA, su día y su lugar: es lo que pidió
   Carlos para que un papá sepa cuándo y dónde juega su hij@ entre nueve
   categorías que juegan la misma semana.
   ══════════════════════════════════════════════════════════════════════════ */
export function armarCalendario(liga){
  liga.calendario = [];
  liga.categorias.forEach(cat => {
    const ids = liga.equipos.filter(e => e.categoria === cat.id).map(e => e.id);
    jornadas(ids).forEach((jor, ji) => {
      jor.forEach((p, pi) => {
        liga.calendario.push({
          id: `${cat.id}-j${ji + 1}-${pi}`,
          jornada: ji + 1, categoria: cat.id, fase: 'regular',
          local: p.local, visita: p.visita,
          dia: DIAS[(ji + pi) % DIAS.length],
          hora: HORAS[(ji * 2 + pi) % HORAS.length],
          lugar: LUGARES[(ji + pi) % LUGARES.length],
          estado: 'programado', marcador: null,
        });
      });
    });
  });
  liga.fase = 'regular';
  return liga.calendario;
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · LA PANTALLA DE ANTES DEL PARTIDO
   Carlos, textual: *"verán estats del equipo a menos que no tenga por ser
   nueva en la app, en cuyo caso dirá que es la primera vez que se enfrenta a
   otro equipo usando la app"*. Y después lo precisó: **es del EQUIPO, no de la
   app, y habla de sus estadísticas GENERALES, no sólo de esta liga.**

   Por eso se mide contra `historial.partidos`, que arrastra de temporadas
   anteriores — no contra `temporada.j`, que se reinicia cada liga.
   ══════════════════════════════════════════════════════════════════════════ */
export function previaDelPartido(liga, partido){
  const eq = (id) => liga.equipos.find(e => e.id === id);
  const ficha = (e) => {
    const h = e.historial;
    if (h.partidos === 0){
      return { equipo: e.nombre, nuevo: true,
        mensaje: `Es la primera vez que ${e.nombre} se enfrenta a otro equipo usando la app.` };
    }
    return { equipo: e.nombre, nuevo: false,
      partidos: h.partidos, ganados: h.ganados, perdidos: h.perdidos,
      ligas: h.ligas,
      promFavor:  +(h.puntosF / h.partidos).toFixed(1),
      promContra: +(h.puntosC / h.partidos).toFixed(1),
      mensaje: `${h.partidos} partidos en ${h.ligas} liga(s) · ${h.ganados}-${h.perdidos}` };
  };
  const L = eq(partido.local), V = eq(partido.visita);
  return {
    categoria: partido.categoria, dia: partido.dia, hora: partido.hora, lugar: partido.lugar,
    local: ficha(L), visita: ficha(V),
    // Si LOS DOS son nuevos, el mensaje es uno solo y más claro que dos avisos.
    ambosNuevos: L.historial.partidos === 0 && V.historial.partidos === 0,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · EL PARTIDO
   Sucede de verdad, minuto a minuto. Cada minuto:
     · se reparten posesiones y salen canastas, faltas y rebotes
     · el coach decide si mete cambio (por faltas, por cansancio o por táctica)
     · los que están viendo suman 5 puntos por minuto
   El coach también mueve POSICIONES: al entrar alguien de banca cubre la del
   que sale, y a veces el coach la corrige a media cancha.
   ══════════════════════════════════════════════════════════════════════════ */
export function jugarPartido(liga, partido, { minutos = 24, espectadores = [], alMinuto = null } = {}){
  const rnd = liga.rnd;
  const eq = (id) => liga.equipos.find(e => e.id === id);
  const L = eq(partido.local), V = eq(partido.visita);

  // La plantilla que baja a la cancha: cinco titulares por posición y el resto
  // a la banca. La alineación es la que dejó el coach en el vestidor.
  const plantilla = (e) => e.jugadores.map((jid, i) => {
    const j = liga.jugadores[jid];
    return { id: jid, nm: j.nombre, num: j.dorsal, pos: e.alineacion[jid] || j.pos,
             pts: 0, f: 0, min: 0, on: i < 5 };
  });
  const equipos = [
    { ref: L, nombre: L.nombre, marcador: 0, jug: plantilla(L) },
    { ref: V, nombre: V.nombre, marcador: 0, jug: plantilla(V) },
  ];

  const bitacora = [];
  const anota = (t, m) => bitacora.push({ min: t, m });
  const cambios = [];
  const enCancha = (t) => equipos[t].jug.filter(p => p.on);
  const enBanca  = (t) => equipos[t].jug.filter(p => !p.on);

  // Antes de arrancar, el coach deja su estrategia y una nota. Esto no es
  // decorado: son dos pantallas de la app que si no se usan, no se prueban.
  [L, V].forEach(e => {
    e.estrategia = ['man','z23','z32','z131','press','pnr','motion','out41','fast','iso'][Math.floor(rnd()*10)];
    e.notas.push({ partido: partido.id, texto: 'Cerrar el rebote defensivo y correr.' });
  });

  for (let m = 1; m <= minutos; m++){
    for (let t = 0; t < 2; t++){
      const cancha = enCancha(t);
      if (!cancha.length) continue;
      cancha.forEach(p => { p.min += 1; });

      // Dos o tres posesiones por minuto por equipo.
      const posesiones = 2 + (rnd() < 0.4 ? 1 : 0);
      for (let q = 0; q < posesiones; q++){
        const tirador = cancha[Math.floor(rnd() * cancha.length)];
        const r = rnd();
        if (r < 0.40){                                   // canasta de dos
          tirador.pts += 2; equipos[t].marcador += 2;
          anota(m, `${tirador.nm} anota de dos`);
        } else if (r < 0.52){                            // triple
          tirador.pts += 3; equipos[t].marcador += 3;
          anota(m, `${tirador.nm} anota de tres`);
        } else if (r < 0.60){                            // falta del rival
          const rival = enCancha(1 - t);
          const quien = rival[Math.floor(rnd() * rival.length)];
          if (quien){
            quien.f += 1;
            anota(m, `Falta de ${quien.nm} (${quien.f})`);
            // Tiros libres
            if (rnd() < 0.7){ tirador.pts += 1; equipos[t].marcador += 1; }
            if (rnd() < 0.7){ tirador.pts += 1; equipos[t].marcador += 1; }
            // CINCO FALTAS = FUERA. Si la app no lo saca, el coach queda con
            // seis en cancha y el partido deja de ser un partido.
            if (quien.f >= 5 && quien.on){
              const banca = enBanca(1 - t);
              const entra = banca[0];
              quien.on = false;
              if (entra){ entra.on = true; entra.pos = quien.pos;
                cambios.push({ min: m, equipo: 1 - t, sale: quien.nm, entra: entra.nm, pos: entra.pos, motivo: 'expulsado por faltas' });
                anota(m, `<b>Cambio</b> entra ${entra.nm} de ${entra.pos} por ${quien.nm} (5 faltas)`);
              }
            }
          }
        }
        // el resto de posesiones son fallos y rebotes; no todas anotan
      }
    }

    // ── El coach ──────────────────────────────────────────────────────────
    // Rota cada cinco minutos, como cualquier coach de categorías infantiles
    // donde todos tienen que jugar.
    if (m % 5 === 0){
      for (let t = 0; t < 2; t++){
        const banca = enBanca(t); if (!banca.length) continue;
        const cansado = enCancha(t).slice().sort((a, b) => b.min - a.min)[0];
        const entra = banca.sort((a, b) => a.min - b.min)[0];
        if (cansado && entra){
          cansado.on = false; entra.on = true;
          entra.pos = cansado.pos;              // el que entra cubre la posición
          cambios.push({ min: m, equipo: t, sale: cansado.nm, entra: entra.nm, pos: entra.pos, motivo: 'rotación' });
          anota(m, `<b>Cambio</b> entra ${entra.nm} de ${entra.pos} por ${cansado.nm}`);
        }
      }
    }
    // Y de vez en cuando corrige una posición sin sacar a nadie: pasa a media
    // cancha todo el tiempo y es justo lo que Carlos pidió que se pudiera.
    if (m % 7 === 0){
      const t = rnd() < 0.5 ? 0 : 1;
      const quien = enCancha(t)[Math.floor(rnd() * enCancha(t).length)];
      if (quien){
        const nueva = POSICIONES[Math.floor(rnd() * POSICIONES.length)];
        if (nueva !== quien.pos){
          cambios.push({ min: m, equipo: t, mueve: quien.nm, de: quien.pos, a: nueva, motivo: 'ajuste' });
          anota(m, `<b>Posición</b> ${quien.nm} pasa a ${nueva}`);
          quien.pos = nueva;
        }
      }
    }

    // ── Los que están viendo ──────────────────────────────────────────────
    // 5 puntos POR MINUTO VISTO. Lo importante es "visto": sólo suma quien
    // sigue conectado en este minuto. El que se salió al medio tiempo se lleva
    // la mitad, que es lo justo y lo que hace que la tienda signifique algo.
    // (En el simulacro un minuto de partido es un segundo de reloj; los puntos
    // son los mismos, porque Carlos pidió tiempos falsos y partidos reales.)
    espectadores.forEach(v => {
      const pid = typeof v === 'string' ? v : v.id;
      const hasta = typeof v === 'string' ? minutos : v.minutos;
      if (m > hasta) return;
      liga.puntos[pid] = (liga.puntos[pid] || 0) + 5;
      liga.vistas[pid] = (liga.vistas[pid] || 0) + 1;
    });

    if (alMinuto) alMinuto({ min: m, marcador: [equipos[0].marcador, equipos[1].marcador], bitacora });
  }

  // ── Cerrar y guardar ────────────────────────────────────────────────────
  // Nada de empates: si acabó igualado, se juega tiempo extra hasta que alguien
  // gane. Una tabla con empates en baloncesto es un bug, no un resultado.
  while (equipos[0].marcador === equipos[1].marcador){
    const t = rnd() < 0.5 ? 0 : 1;
    equipos[t].marcador += 2;
    anota(minutos, `<b>Tiempo extra</b> — canasta de ${equipos[t].nombre}`);
  }

  partido.estado = 'jugado';
  partido.marcador = [equipos[0].marcador, equipos[1].marcador];
  partido.cambios = cambios;
  partido.bitacora = bitacora;

  // Estadísticas: de la temporada Y de la carrera. Las dos, porque la pantalla
  // de antes del partido lee la de carrera y la tabla lee la de temporada.
  equipos.forEach((e, t) => {
    const otro = equipos[1 - t];
    const gano = e.marcador > otro.marcador;
    e.ref.temporada.j += 1; e.ref.temporada[gano ? 'g' : 'p'] += 1;
    e.ref.temporada.pf += e.marcador; e.ref.temporada.pc += otro.marcador;
    e.ref.historial.partidos += 1; e.ref.historial[gano ? 'ganados' : 'perdidos'] += 1;
    e.ref.historial.puntosF += e.marcador; e.ref.historial.puntosC += otro.marcador;
    e.jug.forEach(p => {
      const j = liga.jugadores[p.id]; if (!j) return;
      if (p.min > 0) j.temporada.pj += 1;
      j.temporada.pts += p.pts; j.temporada.faltas += p.f; j.temporada.min += p.min;
      j.carrera.pts += p.pts; j.carrera.faltas += p.f;
      if (p.min > 0) j.carrera.pj += 1;
      // Monedas del jugador: es lo que alimenta su gachapón.
      j.monedas += 10 + p.pts;
    });
  });

  liga.bitacora.push({ partido: partido.id, categoria: partido.categoria,
    marcador: partido.marcador, cambios: cambios.length, eventos: bitacora.length });
  return partido;
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · LA TABLA
   Posición y puntaje, como pidió Carlos para la pantalla final. Desempate por
   diferencia de puntos y luego por puntos a favor — nunca por orden de lista,
   que es como una tabla miente sin que se note.
   ══════════════════════════════════════════════════════════════════════════ */
export function tabla(liga, categoriaId){
  return liga.equipos
    .filter(e => e.categoria === categoriaId)
    .map(e => ({
      id: e.id, nombre: e.nombre,
      j: e.temporada.j, g: e.temporada.g, p: e.temporada.p,
      pf: e.temporada.pf, pc: e.temporada.pc, dif: e.temporada.pf - e.temporada.pc,
      // Puntos de tabla: 2 por ganado, 1 por jugado y perdido (formato FIBA).
      pts: e.temporada.g * 2 + e.temporada.p,
    }))
    .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.pf - a.pf)
    .map((r, i) => ({ ...r, pos: i + 1 }));
}

/* ══════════════════════════════════════════════════════════════════════════
   6 · LAS TRES FASES
   Regular → liguilla (los cuatro primeros) → final. Devuelve el campeón y la
   tabla final con posición y puntaje.
   ══════════════════════════════════════════════════════════════════════════ */
export function liguilla(liga, categoriaId, opciones = {}){
  const t = tabla(liga, categoriaId);
  const clasificados = t.slice(0, Math.min(4, t.length));
  if (clasificados.length < 2) return null;

  const eqDe = (id) => liga.equipos.find(e => e.id === id);
  const partido = (localId, visitaId, fase, n) => ({
    id: `${categoriaId}-${fase}-${n}`, jornada: 0, categoria: categoriaId, fase,
    local: localId, visita: visitaId,
    dia: DIAS[n % DIAS.length], hora: HORAS[n % HORAS.length], lugar: LUGARES[n % LUGARES.length],
    estado: 'programado', marcador: null,
  });

  const gana = (p) => p.marcador[0] > p.marcador[1] ? p.local : p.visita;
  const semis = [];
  if (clasificados.length >= 4){
    semis.push(partido(clasificados[0].id, clasificados[3].id, 'semifinal', 1));
    semis.push(partido(clasificados[1].id, clasificados[2].id, 'semifinal', 2));
  } else {
    semis.push(partido(clasificados[0].id, clasificados[1].id, 'semifinal', 1));
  }
  semis.forEach(p => { liga.calendario.push(p); jugarPartido(liga, p, opciones); });

  const finalistas = semis.map(gana);
  let campeon, subcampeon, laFinal = null;
  if (finalistas.length === 2){
    laFinal = partido(finalistas[0], finalistas[1], 'final', 1);
    liga.calendario.push(laFinal);
    jugarPartido(liga, laFinal, opciones);
    campeon = gana(laFinal);
    subcampeon = campeon === laFinal.local ? laFinal.visita : laFinal.local;
  } else {
    campeon = finalistas[0];
    subcampeon = semis[0].local === campeon ? semis[0].visita : semis[0].local;
  }

  return {
    categoria: categoriaId,
    campeon: { id: campeon, nombre: eqDe(campeon).nombre },
    subcampeon: { id: subcampeon, nombre: eqDe(subcampeon).nombre },
    semifinales: semis, final: laFinal,
    tablaFinal: tabla(liga, categoriaId),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   7 · LA TIENDA POR CÓDIGOS
   Carlos, textual: *"algunas cosas de la tienda solo puedan comprarse por
   puntos de la app para adquirir acceso a el código y que la liga al ingresar
   el código que tenía el usuario se marque una cantidad menos de el producto
   vendido; obvio debe salir el precio en pesos real"*.

   O sea: **los puntos NO compran el producto, compran el CÓDIGO.** El producto
   se paga en pesos, en persona. El código es lo que prueba que te tocaba, y al
   canjearlo la liga descuenta una pieza del inventario. Todo detrás de una
   perilla que la liga puede apagar.
   ══════════════════════════════════════════════════════════════════════════ */
function nuevaTienda(rnd){
  const base = [
    { id:'jersey',   nombre:'Jersey de la liga',      precioPesos: 450, costoPuntos: 600, stock: 40 },
    { id:'balon',    nombre:'Balón oficial',          precioPesos: 380, costoPuntos: 500, stock: 25 },
    { id:'sudadera', nombre:'Sudadera',               precioPesos: 620, costoPuntos: 900, stock: 15 },
    { id:'termo',    nombre:'Termo',                  precioPesos: 180, costoPuntos: 250, stock: 60 },
    { id:'gorra',    nombre:'Gorra bordada',          precioPesos: 220, costoPuntos: 300, stock: 30 },
  ];
  return { productos: base.map(p => ({ ...p, vendidos: 0, codigos: [] })) };
}

/* Compra el ACCESO al código. Cobra puntos, no pesos. Devuelve el código o el
   motivo por el que no se pudo — que es lo que la app tiene que saber decir. */
export function comprarCodigo(liga, personaId, productoId){
  if (!liga.perillas.tiendaPorPuntos)
    return { ok: false, motivo: 'La liga tiene apagada la tienda por puntos' };
  const p = liga.tienda.productos.find(x => x.id === productoId);
  if (!p) return { ok: false, motivo: 'Ese producto no existe' };
  if (p.stock <= 0) return { ok: false, motivo: 'Agotado' };
  const tengo = liga.puntos[personaId] || 0;
  if (tengo < p.costoPuntos)
    return { ok: false, motivo: `Te faltan ${p.costoPuntos - tengo} puntos`, faltan: p.costoPuntos - tengo };

  liga.puntos[personaId] = tengo - p.costoPuntos;
  const codigo = (productoId.slice(0,3) + '-' + Math.floor(liga.rnd() * 90000 + 10000)).toUpperCase();
  p.codigos.push({ codigo, de: personaId, canjeado: false });
  return { ok: true, codigo, precioPesos: p.precioPesos,
    aviso: `Este código te aparta el producto. Se paga $${p.precioPesos} en persona con la liga.` };
}

/* La liga teclea el código. Si es bueno, baja una pieza del inventario. Un
   código no se puede canjear dos veces: eso sería regalar mercancía. */
export function canjearCodigo(liga, codigo){
  for (const p of liga.tienda.productos){
    const c = p.codigos.find(x => x.codigo === codigo);
    if (!c) continue;
    if (c.canjeado) return { ok: false, motivo: 'Ese código ya se había canjeado' };
    c.canjeado = true; p.stock -= 1; p.vendidos += 1;
    return { ok: true, producto: p.nombre, stock: p.stock, vendidos: p.vendidos,
      cobrar: p.precioPesos };
  }
  return { ok: false, motivo: 'Ese código no existe' };
}

/* ══════════════════════════════════════════════════════════════════════════
   8 · SEGUIR UNA LIGA Y EL GACHAPÓN
   El visitante llega por un anuncio, sigue la liga, ve partidos y con lo que
   junta abre sobres. El jugador junta monedas jugando. Los dos usan el mismo
   gachapón — Carlos lo pidió expresamente: *"no olvides usar el gachapón para
   visitantes, jugadores, etc."*
   ══════════════════════════════════════════════════════════════════════════ */
export function seguirLiga(liga, personaId, { categorias = null, equipos = null } = {}){
  liga.seguidores[personaId] = { categorias, equipos };
}

/* ── QUIÉN VE CADA PARTIDO ──────────────────────────────────────────────────
   Esto salió de un hallazgo del propio simulacro y vale la pena dejarlo
   escrito. La primera versión ponía a todos los visitantes a ver los 148
   partidos completos, y cada uno terminaba con **17,760 puntos**. Con esa
   cantidad la tienda no prueba nada: todo se alcanza al instante y el aviso de
   "te faltan X puntos" nunca se dispara, que es justo el camino que hay que
   revisar.

   Nadie ve nueve categorías enteras. La gente ve lo suyo:
     · el papá, los partidos de su hij@ — y casi completos
     · el coach y el dueño, los de su equipo
     · el jugador, los de su categoría cuando no le toca jugar
     · el visitante, los de la categoría que eligió, y se sale a media función

   Devuelve `[{id, minutos}]`: cuántos minutos ve cada quien de ESE partido.
   Los puntos salen de ahí, no de suponer que todo el mundo aguanta todo. */
export function audiencia(liga, partido, personas, { minutos = 24 } = {}){
  const rnd = liga.rnd;
  const L = liga.equipos.find(e => e.id === partido.local);
  const V = liga.equipos.find(e => e.id === partido.visita);
  const enJuego = new Set([...(L?.jugadores || []), ...(V?.jugadores || [])]);
  const staff = new Set([L?.dueño, L?.coach, V?.dueño, V?.coach].filter(Boolean));
  const out = [];

  personas.forEach(p => {
    let prob = 0, trozo = 1;
    if (staff.has(p.id)) { prob = 0.95; trozo = 1; }
    else if (p.rol === 'papa' && (p.hijos || []).some(h => enJuego.has(h))) { prob = 0.9; trozo = 0.95; }
    else if (p.rol === 'jugador' && enJuego.has(p.id)) { prob = 0; }   // está jugando, no viendo
    else if (p.rol === 'jugador' && liga.jugadores[p.id]) {
      const suyo = liga.equipos.find(e => e.id === p.equipo);
      prob = (suyo && suyo.categoria === partido.categoria) ? 0.35 : 0.08; trozo = 0.6;
    }
    else if (p.rol === 'publico' && liga.seguidores[p.id]) {
      const s = liga.seguidores[p.id];
      const leToca = !s.categorias || s.categorias.includes(partido.categoria);
      prob = leToca ? 0.55 : 0.1;
      trozo = 0.5 + rnd() * 0.5;         // se sale a media función, como todos
    }
    else if (p.rol === 'mesa') { prob = 0.25; trozo = 1; }

    if (prob > 0 && rnd() < prob){
      const m = Math.max(1, Math.round(minutos * trozo * (0.7 + rnd() * 0.3)));
      out.push({ id: p.id, minutos: Math.min(minutos, m) });
    }
  });
  return out;
}

export function proximosPartidos(liga, { categoria = null, limite = 5 } = {}){
  return liga.calendario
    .filter(p => p.estado === 'programado' && (!categoria || p.categoria === categoria))
    .slice(0, limite)
    .map(p => ({
      ...p,
      // Sin la categoría en la tarjeta, un papá no encuentra el partido de su
      // hij@ entre nueve categorías jugando la misma jornada.
      etiqueta: `${p.categoria} · ${p.dia} ${p.hora} · ${p.lugar}`,
    }));
}

const COSTO_SOBRE = 150;
export function abrirSobre(liga, personaId, { esJugador = false } = {}){
  if (!liga.perillas.gachaVisitantes && !esJugador)
    return { ok: false, motivo: 'La liga tiene apagado el gachapón para visitantes' };
  const saldo = esJugador
    ? (liga.jugadores[personaId]?.monedas || 0)
    : (liga.puntos[personaId] || 0);
  if (saldo < COSTO_SOBRE)
    return { ok: false, motivo: `Te faltan ${COSTO_SOBRE - saldo} para un sobre` };
  if (esJugador) liga.jugadores[personaId].monedas -= COSTO_SOBRE;
  else liga.puntos[personaId] -= COSTO_SOBRE;
  liga.sobres[personaId] = (liga.sobres[personaId] || 0) + 1;
  return { ok: true, sobres: liga.sobres[personaId] };
}

/* ══════════════════════════════════════════════════════════════════════════
   9 · EL HISTORIAL QUE VIAJA ENTRE PASADAS
   Carlos: en la pasada 2 se reutiliza a casi toda la gente, cambia la liga, y
   *"las estadísticas deben funcionar así como las cartas"*. Esto es lo que se
   lleva de una liga a la siguiente.
   ══════════════════════════════════════════════════════════════════════════ */
export function exportarHistorial(liga){
  const h = {};
  liga.equipos.forEach(e => { h[e.id] = { ...e.historial }; });
  return h;
}
