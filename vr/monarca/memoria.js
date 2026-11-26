/* LA MEMORIA DEL NARRADOR (prompt maestro de Carlos, e1354 §7: «que recuerde el comportamiento del jugador y lo use
   después»). Sólo dura la sesión: nada personal, nada guardado.
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   · apuntar(idReaccion, escena, t): cada reacción que el narrador SÍ dijo se vuelve un recuerdo («jugaste con las
     manos en la bienvenida»). Se apuntan también los eventos sueltos (prisa, tocar la mariposa).
   · alEntrar(escena): al empezar una escena nueva, decide si saca un recuerdo viejo para hacer la broma tarde:
       - sólo recuerdos de escenas ANTERIORES (lo de esta escena todavía está fresco),
       - máximo 3 por vuelta y nunca en dos escenas seguidas,
       - cada recuerdo se usa una vez, y se prefiere la frase hecha para esa escena (las manos en la migración),
       - nunca en el cuestionario ni en el final: ahí la persona está pensando.
   Devuelve el id de la línea (narrador.js) o null. */
export const DE_REACCION = {
  'r-manos-juega': 'manos', 'r-saludo': 'manos', 'r-pellizcos': 'manos', 'r-manos-arriba': 'manos', 'r-punos': 'manos',
  'r-lejos-1': 'lejos', 'r-lejos-2': 'lejos', 'r-lejos-3': 'lejos', 'r-atras-mira': 'lejos',
  'r-prisa-1': 'prisa', 'r-prisa-2': 'prisa', 'r-prisa-3': 'prisa', 'r-record': 'prisa',
  'r-tocar-mariposa': 'mariposa',
  'r-quieto-1': 'quieto', 'r-quieto-2': 'quieto', 'r-quieto-3': 'quieto', 'r-quieto-4': 'quieto',
  'r-vueltas-1': 'vueltas', 'r-vueltas-2': 'vueltas',
  'r-cielo': 'cielo', 'r-piso': 'piso',
};
/* qué frase sale: primero la hecha para la escena, si no la general */
export const FRASES = {
  manos: { migracion: 'm-manos-migracion', _: ['m-manos-1', 'm-manos-2'] },
  lejos: { santuario: 'm-lejos-santuario', _: ['m-lejos-1'] },
  prisa: { tala: 'm-prisa-tala', _: ['m-prisa-1'] },
  mariposa: { flores: 'm-mariposa-flores', _: ['m-mariposa-1'] },
  quieto: { migracion: 'm-quieto-migracion', _: ['m-quieto-1'] },
  vueltas: { migracion: 'm-vueltas-migracion', _: ['m-vueltas-1'] },
  cielo: { santuario: 'm-cielo-santuario', _: [] },
  piso: { flores: 'm-piso-flores', _: [] },
};
const NUNCA = new Set(['bienvenida', 'cuestionario', 'final', 'decision']);
export const TOPE = 3;

/* orden: el de las escenas, para guardar un recuerdo que tiene su frase propia más adelante (las manos, para la migración) */
export function crearMemoria({ orden = [] } = {}){
  const st = { recuerdos: [], usados: 0, ultimaEscena: -9, nEscena: 0, escena: null, generales: {} };
  function apuntar(id, escena, t = 0){
    const que = DE_REACCION[id] || (['manos', 'lejos', 'prisa', 'mariposa', 'quieto', 'vueltas', 'cielo', 'piso'].includes(id) ? id : null);
    if(!que) return;
    const r = st.recuerdos.find((x) => x.que === que && !x.usado);
    if(r){ r.veces++; r.t = t; } else st.recuerdos.push({ que, escena: escena ?? st.escena, n: st.nEscena, veces: 1, t, usado: false });
  }
  function alEntrar(escena){
    st.nEscena++; st.escena = escena;
    if(NUNCA.has(escena) || st.usados >= TOPE || st.nEscena - st.ultimaEscena < 2) return null;
    const viejos = st.recuerdos.filter((r) => !r.usado && r.n <= st.nEscena - 2);   /* de hace por lo menos una escena: lo de recién todavía está fresco */
    if(!viejos.length) return null;
    /* lo que tenga frase propia para esta escena gana; si no, lo que más se repitió */
    const propio = viejos.find((r) => FRASES[r.que]?.[escena]);
    const aqui = orden.indexOf(escena), despues = (q) => aqui >= 0 && Object.keys(FRASES[q] || {}).some((e) => e !== '_' && orden.indexOf(e) > aqui);
    const r = propio || viejos.filter((x) => FRASES[x.que]?._.length && !despues(x.que)).sort((a, b) => b.veces - a.veces)[0];
    if(!r) return null;
    let id = FRASES[r.que][escena];
    if(!id){ const g = FRASES[r.que]._; const k = st.generales[r.que] || 0; id = g[k % g.length]; st.generales[r.que] = k + 1; }
    r.usado = true; st.usados++; st.ultimaEscena = st.nEscena;
    return id;
  }
  function reiniciar(){ st.recuerdos = []; st.usados = 0; st.ultimaEscena = -9; st.nEscena = 0; st.escena = null; st.generales = {}; }
  return { apuntar, alEntrar, reiniciar, st };
}
