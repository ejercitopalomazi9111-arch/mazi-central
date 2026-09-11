/* ═══════════════════════════════════════════════════════════════════════════
   CRISOL · EL MOTOR
   ---------------------------------------------------------------------------
   La simulación, aparte de la pantalla, para que se pueda probar sin navegador.

   ⚠ Y un aviso que ya nos costó caro en Guerra de Puercos: que el motor pase
   sus pruebas NO quiere decir que el juego funcione. Ahí las 74 del motor
   pasaban con el modo a distancia muerto. El motor probado es condición, no
   garantía — la pantalla se prueba aparte y con un navegador de verdad.

   Todo va en arreglos tipados y no en objetos por celda: son ~30 000 celdas
   por cuadro a 60 por segundo, y un objeto por celda es basura que recoger
   sesenta veces por segundo en un teléfono.
   ═════════════════════════════════════════════════════════════════════════ */
import { ELEMENTOS, REACCIONES } from './elementos.js';

/* ── índices: el motor trabaja con números, no con cadenas ─────────────── */
export const IDS = Object.keys(ELEMENTOS);
export const IDX = {};
IDS.forEach((id, i) => { IDX[id] = i; });
export const EL = IDS.map(id => Object.assign({ id }, ELEMENTOS[id]));
export const VACIO = IDX.vacio;
/* Tabla plana de «¿esto es cuerda?». Parece una tontería al lado de
   `EL[t[k]].cuerda`, y son 16 ms por paso en una habitación de 320×480: el
   buscador de cuerdas recorre la rejilla entera cada paso, y preguntarle una
   propiedad a un objeto ciento cincuenta mil veces cuesta lo que no cuesta
   leer un byte de un array. Medido con y sin cuerda en la misma habitación. */
export const ES_CUERDA = new Uint8Array(EL.length);
EL.forEach((e, i) => { if(e.cuerda) ES_CUERDA[i] = 1; });

/* Tabla de reacciones indexada por par, para no recorrer 24 reglas por celda
   por cuadro. Con doscientos elementos eso sería la diferencia entre correr y
   arrastrarse. */
const TABLA = new Map();
const clave = (a, b) => a * 512 + b;
for(const [a, b, ra, rb, prob, calor, enciende, aprieta] of REACCIONES){
  if(prob <= 0) continue;
  const A = IDX[a], B = IDX[b];
  /* `enciende` es la temperatura mínima. Nació de un reporte de Carlos:
     «coloqué hidrógeno y oxígeno pero no sé cómo volverlo agua» — y la
     reacción llevaba desde el principio en probabilidad CERO con un comentario
     que decía «sólo con chispa». Esa chispa nunca se implementó: una regla que
     no podía dispararse nunca, con una nota explicando por qué. */
  const t = enciende == null ? -1e9 : enciende;
  /* la presión mínima alternativa: `Infinity` si la reacción no la admite */
  const pr = aprieta == null ? Infinity : aprieta;
  TABLA.set(clave(A, B), { a: ra === null ? A : IDX[ra], b: rb === null ? B : IDX[rb], p: prob, q: calor || 0, t, pr });
  TABLA.set(clave(B, A), { a: rb === null ? B : IDX[rb], b: ra === null ? A : IDX[ra], p: prob, q: calor || 0, t, pr });
}

export const AMBIENTE = 22;
/* Conducción efectiva del aire por convección. No es la conductividad del
   aire —ésa es 0.02 y está bien— sino lo que acarrea al moverse. */
export const CONVEC = 0.45;
/* Lo que le cuesta al calor cruzar del material al aire. Mucho menor. */
export const CONVEC_BORDE = 0.07;
/* Gravedad en celdas por paso al cuadrado, y tope de velocidad. El tope no es
   pereza: sin él una partícula salta media pantalla en un cuadro y atraviesa
   paredes delgadas por el mismo agujero que ya tapamos en el movimiento
   lateral. */
export const GRAVEDAD = 0.28;
/* ── LA GRAVEDAD EN UNIDADES DE VERDAD ──────────────────────────────────
   Carlos la pidió en m/s²: «9.81, 5, 1, 0, -9.81». El motor trabaja en
   celdas por paso al cuadrado, así que hace falta el cambio de unidades, y
   se calibra por su propio número: 0.28 celdas/paso² ES la gravedad de la
   Tierra dentro de este mundo. Todo lo demás sale de una regla de tres, no
   de una tabla inventada. */
export const G_TIERRA = 9.81;
export const aCeldas = ms2 => GRAVEDAD * (ms2 / G_TIERRA);
export const aMetros = cel => G_TIERRA * (cel / GRAVEDAD);
export const VMAX = 6;
/* Hasta dónde llega la corriente desde una fuente. Es lo que hace que una
   resistencia sirva: si el alcance fuera infinito, atenuar no apagaría nada. */
export const ALCANCE = 110;
/* el puente entre la escala de la presión y la de las resistencias · ver esfuerzoPaso */
export const ESCALA_ESF = 0.05;
/* Cuántas veces su resistencia tiene que llevarse una celda para reventar en
   el acto en vez de sólo fatigarse. Es lo que separa el corazón de una
   explosión del frente que sólo pasa. */
export const ROMPE_YA = 4;
/* Tope de compresión por celda. 40 atmósferas de gas en una celda es ya un
   tanque de buceo; más que eso sólo servía para hacer números absurdos. */
export const MOLES_MAX = 40;
/* Presión de detonación: lo más fuerte que puede ser el frente de UNA
   explosión, por mucho explosivo que juntes. */
export const TOPE_DETON = 900;
/* Cuánta energía trae UNA unidad de `explota`, en la moneda de `costeRomper`.
   Es el número que convierte «cuánto explosivo pusiste» en «cuántas celdas se
   lleva», y es el único que hay que mover si los cráteres saben a poco. */
export const JULIOS = 150;
/* Cuánta presión del campo `pres` vale UNA atmósfera por encima del ambiente.
   Con 300, una cámara al triple de su gas revienta la piedra (aguanta ~960) y
   el muro no, que es lo que se quiere. */
export const ATM = 300;
/* la fuerza que hace UNA celda de mano. Se suma por cada celda que el puño
   toca y se divide entre la masa de la pieza entera, así que agarrar un
   objeto que cabe en la mano se siente exactamente igual que antes y agarrar
   la esquina de un peñasco, no. */
export const PUÑO = 2.2;
/* cuánto FRENA el brazo por cuadro lo que ya va moviéndose */
export const FRENO_MANO = 0.6;
/* cuánto de la energía sobrante de un rayo de explosión se vuelve velocidad */
export const EMPUJE_BLAST = 0.55;
/* qué parte de la energía de una explosión se gasta ROMPIENDO; el resto empuja */
export const CAVA = 0.5;
/* a partir de cuántas celdas una pieza es «el suelo» y ya no se lanza */
export const TOPE_LANZA = 600;
/* ── EL HUECO ES AIRE, NO VACÍO ─────────────────────────────────────────
   Carlos lo pidió por su nombre: «no tienen peso, resistencia del aire,
   gravedad etc, deberías sumar todo eso». Nada de eso se puede calcular sin
   un medio: sin aire no hay arrastre, no hay flotación y no hay globo.
   Materializar el aire como celdas costaría 153 600 partículas activas por
   cuadro para nada. Así que el hueco SE COMPORTA como aire, con esta
   densidad, y no hace falta simular ni una celda.
   La escala está comprimida a propósito: en la vida el agua es 833 veces el
   aire y aquí es 8.3. Lo que importa para flotar es el ORDEN, no el factor, y
   con 833 un globo saldría disparado a velocidad absurda en una rejilla. */
export const DENS_AIRE = 1.2;

export class Mundo {
  constructor(an, al){
    this.an = an; this.al = al;
    const n = an * al;
    this.t    = new Uint8Array(n);        /* tipo */
    this.temp = new Float32Array(n);      /* °C */
    this.vida = new Uint16Array(n);       /* pasos vividos */
    this.car  = new Uint8Array(n);        /* carga eléctrica */
    this.mov  = new Uint8Array(n);
    /* ── FÍSICA DE VERDAD, no «una celda por paso» ──────────────────────
       Carlos lo señaló exacto: «que las partículas al caer no tomen la de
       abajo como quieta porque aún no está cayendo; si tienen físicas, su
       capa debe caer junto con el resto». Sin velocidad, cada partícula
       decide por su cuenta cada paso y una columna se desmorona en vez de
       caer. Con velocidad acumulada, toda la columna lleva la misma y cae
       junta — y además ACELERA, que es lo que hace que se sienta gravedad. */
    this.vy   = new Float32Array(n);      /* velocidad vertical, celdas/paso */
    this.vx   = new Float32Array(n);      /* velocidad horizontal */
    /* Presión: un campo propio que se difunde y empuja. Es lo que convierte
       una explosión en una ONDA en vez de un parpadeo, y lo que permite una
       recámara, un cañón y una olla a presión. */
    this.pres = new Float32Array(n);
    /* ── LA ONDA, QUE ES LO QUE FALTABA ────────────────────────────────
       Carlos: «tus ondas expansivas se quedan donde fue la explosión, no se
       expanden ni luchan con el entorno». Tenía razón y se mide: el radio
       pasaba de 18.9 a 24.2 en cuarenta pasos mientras la presión total se
       desplomaba de 76 244 a 12 530. Eso no es una onda, es una mancha que se
       apaga en el sitio — porque el campo se estaba DIFUNDIENDO (como el
       calor) y una difusión no viaja: se reparte.
       Una onda necesita DOS campos, no uno: la presión y su ritmo de cambio.
       Con ellos sale la ecuación de onda de verdad, y con ella salen solas
       las cuatro cosas que pidió: el frente viaja, se debilita al repartirse
       en un círculo cada vez más grande, REBOTA en lo rígido y se DIFRACTA
       en las esquinas, y atraviesa una pared floja perdiendo fuerza mientras
       parte se queda del otro lado. Ninguna está programada aparte. */
    this.pv = new Float32Array(n);        /* ∂presión/∂tiempo */
    /* ── FASE por celda ────────────────────────────────────────────────
       0 sólido · 1 líquido · 2 gas.
       Los 118 de la tabla traen su punto de fusión y de ebullición REALES, y
       hacía falta que sirvieran de algo. La salida fácil era inventar un
       «hierro fundido», un «oro fundido» y 116 más — o sea duplicar la tabla
       para no tocar el motor. Con una fase por celda, CUALQUIER elemento se
       funde y hierve a su temperatura sin un solo elemento nuevo: el hierro a
       1538, el oro a 1064, el mercurio ya nace líquido a temperatura
       ambiente. Un campo contra ciento dieciocho. */
    this.fase = new Uint8Array(n);
    /* Color propio de la partícula, para la pirotecnia: una chispa de estrella
       roja tiene que seguir siendo roja aunque el elemento «chispa» sea uno
       solo. 0 = usa el color de su elemento. */
    this.color = new Uint8Array(n);
    this.paleta = ['', '#FF3B4E', '#3BFF6E', '#3B8AFF', '#FFD43B'];
    /* ⚠ Búferes REUTILIZADOS. La primera versión hacía `new Float32Array(n)`
       dos veces por paso —una para el calor y otra para la presión—, y en una
       sala de 153 600 celdas eso es más de un mega de basura por cuadro,
       sesenta veces por segundo. A 17 000 celdas ni se notaba; la sala grande
       lo destapó de golpe. Se reservan una vez y se van turnando. */
    this._temp2 = new Float32Array(n);
    this._pres2 = new Float32Array(n);
    this._trans = new Float32Array(n);
    this._amort = new Float32Array(n);
    /* ── SOSTÉN ESTRUCTURAL ────────────────────────────────────────────
       Ahora que los sólidos caen hace falta saber cuáles NO deben caerse, o
       el techo de cualquier caja se desploma hacia dentro en el primer paso.
       Un sólido se sostiene si está pegado —por una cadena de sólidos— a algo
       inamovible, al suelo del mundo, o a algo que ya no puede bajar. De ahí
       salen los arcos, los voladizos y que volar la base tire la torre. */
    this.sop  = new Uint8Array(n);
    this.sopD = new Uint8Array(n);   /* eslabones hasta un anclaje de verdad */
    this.carga = new Float32Array(n);  /* fuerza acumulada que atraviesa esta celda */
    this.cargaLocal = new Float32Array(n); /* la que recibe ELLA, del empuje de al lado */
    this._repartida = new Float32Array(n);
    this.fatiga = new Float32Array(n); /* daño acumulado: la repetición también rompe */
    /* ── SUELTO ────────────────────────────────────────────────────────
       Lo que PINTAS se queda puesto: si no, construir un circuito en el aire
       sería imposible y habría que levantar un pilar antes de cada cosa. Lo
       que recibe un golpe de verdad —una explosión, un pistón, la presión que
       revienta una pared, el empuje de un globo— se SUELTA, y a partir de ahí
       obedece la física como cualquier piedra.
       Y soltarse se CONTAGIA hacia lo que no se sostiene: por eso volarle la
       base a una torre la tira entera en vez de dejar el resto flotando. */
    this.suelto = new Uint8Array(n);
    this._cola = new Int32Array(n);
    this._cola2 = new Int32Array(n);
    this._visto = new Uint8Array(n);
    this._vistoC = new Uint8Array(n);
    this._padreC = new Int32Array(n);
    this.flotante = new Uint8Array(n);
    /* EL NUDO. Guarda en qué paso se amarró esta celda a una cuerda, y viaja
       con ella. Sin él el amarre era «estar pegadito», y eso se pierde en
       cuanto el eslabón de la punta se mueve una celda: el peso quedaba a
       distancia 2, nadie lo encontraba y se caía solo después de columpiarse
       noventa pasos. Un nudo es del objeto, no de la casilla. */
    this.nudo = new Int32Array(n);
    /* de quién vino la corriente a cada celda: sin esto una compuerta no puede
       distinguir una entrada de su propia salida */
    this._padre = new Int32Array(n);
    this._detona = [];   /* choques que van a detonar, resueltos al final del paso */
    /* ── EL TECHO DE LA ONDA ────────────────────────────────────────────
       Una onda NUNCA puede ser más fuerte que lo que la creó. Suena obvio y
       es que hacía falta escribirlo: la pareja onda + rotura se realimenta
       —la celda revienta, el sitio pasa de transmitir 0.23 a transmitir 1 con
       toda la presión dentro, y esa patada rompe a la siguiente— y de ahí
       salían 147 MIL MILLONES de presión a partir de un empujón de 3 000,
       con la sala entera arrasada. Perseguí ese número por cuatro sitios
       equivocados: el explosivo, el borde de la caja, el paso de tiempo y la
       propia ecuación. Ninguno era. La ecuación sola es estable en los cuatro
       materiales, y romper solo también; lo que se dispara es el par.
       En vez de seguir buscando el modo exacto, se escribe la ley: se guarda
       el pico inyectado, se deja caer despacio, y ninguna celda puede pasarlo.
       Un tope así no maquilla nada — sólo prohíbe crear energía, que es lo
       que la física ya prohibía. */
    this.picoOnda = 0;
    /* ── CUÁNTO GAS HAY EN ESTA CELDA ───────────────────────────────────
       Carlos: «las presiones en un espacio cerrado deben incluir el aire para
       poder aumentar la presión en un lugar y que explote al rebasarse», y
       «no tengo manera de aumentar la presión dentro de un espacio».
       Tenía razón y era estructural: una celda de gas era una celda de gas y
       ya. Sin una CANTIDAD, meter más gas en un sitio lleno no era ni
       representable — no había dónde apuntarlo—, así que la ley de los gases
       sólo podía subir por temperatura. Ahora cada celda lleva sus moles:
       pintar gas encima de gas lo comprime, y encoger la cámara con un pistón
       sube la presión sin tocar la temperatura, que es Boyle. */
    this.moles = new Float32Array(n);
    this.camara = new Int32Array(n);      /* a qué cámara sellada pertenece */
    this.camaraP = [];                    /* presión de cada cámara */
    this._abierto = new Uint8Array(n);
    this._vistoCuerpo = new Uint8Array(n);
    this._colaCuerpo = new Int32Array(n);
    /* qué celdas soldó el jugador en una estructura: mismo número = misma
       pieza, aunque sean materiales distintos */
    this.soldado = new Int32Array(n);
    this.soldadoN = 0;
    /* el interruptor que pidió Carlos: apagado, cada celda vuelve a ser suya */
    this.rigido = true;
    this.enCuerpo = new Uint8Array(n);
    /* ── EL VOLTAJE ─────────────────────────────────────────────────────
       Carlos: «la resistencia debe poder tener más poder (producir más calor)
       conforme más voltaje tenga, al punto de que pueda quemar algo», y «los
       pistones deben poder tener distintos empujes». Las dos piden lo mismo y
       faltaba lo mismo: el circuito sólo sabía SÍ o NO. Ahora hay un número,
       y la manera de subirlo es la de siempre — apilar pilas. Una batería de
       una celda da 1; tres celdas pegadas dan 3, y con eso la resistencia
       calienta nueve veces más, porque la potencia va con el CUADRADO del
       voltaje. Eso no es un ajuste: es P = V²/R. */
    this.volt = new Float32Array(n);
    /* ── EL CAMPO GRAVITATORIO ────────────────────────────────────────
       Carlos no pidió «activar y desactivar la gravedad»: pidió magnitud,
       dirección, zonas, por objeto y puntos que atraen o repelen, «combinar
       campos mediante suma vectorial». Así que la gravedad deja de ser una
       constante y pasa a ser un CAMPO que se consulta por celda.

       · `gGlobal` es el vector de toda la sala
       · `zonas` son rectángulos que suman o reemplazan
       · `puntos` atraen o repelen hacia un sitio, con radio
       · `gmul` es por CELDA, y viaja con la partícula: es la gravedad
         propia de un objeto

       Y no hay teletransporte en ninguna parte: todo esto cambia la
       ACELERACIÓN. Al cruzar de una zona a otra, la velocidad y la inercia
       se conservan solas porque nadie las toca. */
    this.gGlobal = { x: 0, y: GRAVEDAD };
    this.zonas = [];
    this.puntos = [];
    this.gmul = new Float32Array(n);
    this.gmul.fill(1);
    this._gx = 0; this._gy = GRAVEDAD; this._gSimple = true;
    /* ── LA LUZ ────────────────────────────────────────────────────────
       Carlos: «la lámpara no produce iluminación, de hecho no tenemos
       iluminación». Cierto: la lámpara se pintaba amarilla y ahí acababa
       todo. Esto es un campo de luz de verdad — se reparte desde las
       lámparas encendidas, se apaga con la distancia y la BLOQUEAN los
       sólidos, así que una pared da sombra. */
    this.luz = new Float32Array(n);   /* este paso ya lleva su balance de flotación hecho */
    /* la caja de dónde hay onda; vacía al revés quiere decir «silencio» */
    this._caja = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
    this.temp.fill(AMBIENTE);
    this.paso_ = 0;
    this.azar = 123456789;
    /* Contador de lo que ha NACIDO por reacción. Es lo que alimenta la
       mochila: no se descubre lo que pintas, se descubre lo que LOGRAS. */
    this.nacidos = {};
  }

  colorIdx(hex){ const i = this.paleta.indexOf(hex); return i < 0 ? 0 : i; }

  /* Azar propio y reproducible: con `Math.random` dos corridas iguales dan
     resultados distintos y ninguna prueba de simulación sirve. */
  rnd(){
    this.azar ^= this.azar << 13; this.azar ^= this.azar >>> 17;
    this.azar ^= this.azar << 5;  this.azar |= 0;
    return ((this.azar >>> 0) % 100000) / 100000;
  }
  semilla(s){ this.azar = s | 0 || 123456789; }

  /* El estado que de verdad tiene una celda: el de su elemento, salvo que la
     temperatura la haya fundido o hervido. Todo el motor pregunta por aquí. */
  /* ¿Está abierta esta válvula? Con corriente o accionada a mano. */
  valvulaAbierta(k){
    const e = EL[this.t[k]];
    if(!e.valvula) return false;
    return !!this.vida[k] || !!this.car[k];
  }

  estadoDe(k){
    const f = this.fase[k];
    if(f === 1) return 'liquido';
    if(f === 2) return 'gas';
    return EL[this.t[k]].estado;
  }

  i(x, y){ return y * this.an + x; }
  dentro(x, y){ return x >= 0 && y >= 0 && x < this.an && y < this.al; }
  get(x, y){ return this.dentro(x, y) ? this.t[y * this.an + x] : IDX.muro; }

  pon(x, y, tipo, temp){
    if(!this.dentro(x, y)) return;
    /* pintar es CONSTRUIR: lo que pones queda anclado hasta que algo lo golpee */
    this.suelto[this.i(x, y)] = 0;
    const k = y * this.an + x;
    /* ⚠ PINTAR GAS SOBRE EL MISMO GAS LO COMPRIME. Ésta es la respuesta
       directa a «no tengo manera de aumentar la presión dentro de un espacio»:
       antes, repasar con el dedo una recámara ya llena de hidrógeno no hacía
       absolutamente nada — la celda ya era hidrógeno—. Ahora suma moles, y de
       ahí sale la presión que funde el hidrógeno con el oxígeno, la que
       convierte el carbón en diamante y la que revienta el recipiente. */
    if(this.t[k] === tipo && EL[tipo].estado === 'gas'){
      this.moles[k] = Math.min(MOLES_MAX, this.moles[k] + 1);
      if(temp != null) this.temp[k] = temp;
      this.despierta(x, y, 2);
      return;
    }
    this.t[k] = tipo;
    this.vida[k] = 0;
    this.car[k] = 0;
    this.vy[k] = 0; this.vx[k] = 0;
    this.fase[k] = 0; this.color[k] = 0;
    const e = EL[tipo];
    this.moles[k] = e.estado === 'gas' ? 1 : 0;
    if(temp != null) this.temp[k] = temp;
    else if(e.nace != null) this.temp[k] = e.nace;
    else if(e.calor) this.temp[k] = e.id === 'lava' ? 1200 : 900;
    else if(e.frio) this.temp[k] = -12;
  }

  nace(tipo){
    const id = EL[tipo].id;
    this.nacidos[id] = (this.nacidos[id] || 0) + 1;
  }

  cambia(k, tipo, porReaccion){
    this.t[k] = tipo; this.vida[k] = 0;
    if(porReaccion) this.nace(tipo);
  }

  intercambia(k1, k2){
    const a = this.t[k1], b = this.t[k2];
    this.t[k1] = b; this.t[k2] = a;
    const tv = this.temp[k1]; this.temp[k1] = this.temp[k2]; this.temp[k2] = tv;
    const vv = this.vida[k1]; this.vida[k1] = this.vida[k2]; this.vida[k2] = vv;
    const cv = this.car[k1];  this.car[k1]  = this.car[k2];  this.car[k2]  = cv;
    /* ⚠ la velocidad VIAJA con la partícula. Si se queda en la celda, una
       partícula que cae le hereda su impulso a la que se queda atrás y el
       montón se pone a temblar solo. */
    const fv = this.fase[k1]; this.fase[k1] = this.fase[k2]; this.fase[k2] = fv;
    const cl = this.color[k1]; this.color[k1] = this.color[k2]; this.color[k2] = cl;
    const yv = this.vy[k1]; this.vy[k1] = this.vy[k2]; this.vy[k2] = yv;
    const xv = this.vx[k1]; this.vx[k1] = this.vx[k2]; this.vx[k2] = xv;
    /* ⚠ Y LA MARCA DE «SUELTO» TAMBIÉN VIAJA, que es donde me tropecé: iba en
       la CELDA y no en la partícula, así que una piedra soltada por una
       explosión caía UNA celda y en la siguiente ya estaba anclada otra vez.
       Se veía como «nada se cae», nunca como lo que era. Es exactamente el
       mismo error que ya estaba anotado dos líneas más arriba para la
       velocidad — y lo volví a cometer con el campo de al lado. */
    const sv = this.suelto[k1]; this.suelto[k1] = this.suelto[k2]; this.suelto[k2] = sv;
    /* la gravedad PROPIA es del objeto, así que viaja con él — el mismo error
       que ya costó dos veces con la velocidad y con «suelto» */
    const gv = this.gmul[k1]; this.gmul[k1] = this.gmul[k2]; this.gmul[k2] = gv;
    /* ⚠ Y LA MARCA DE «YA ME MOVIÓ OTRO SISTEMA» TAMBIÉN. Tercera vez que
       tropiezo con lo mismo en este archivo —pasó con la velocidad, con
       `suelto` y con `gmul`—: en una rejilla es facilísimo confundir la
       CASILLA con la COSA. Aquí costó un péndulo: la cuerda movía el peso,
       `flotante` se quedaba en la celda vieja, y `mueve` volvía a moverlo con
       su velocidad entera. El peso salía disparado y dejaba la cuerda atrás.
       Todo lo que describe al objeto viaja con él. Sólo lo que describe al
       sitio se queda. */
    const flv = this.flotante[k1]; this.flotante[k1] = this.flotante[k2]; this.flotante[k2] = flv;
    const nuv = this.nudo[k1]; this.nudo[k1] = this.nudo[k2]; this.nudo[k2] = nuv;
    /* los moles son de la COSA: si el gas se mueve, se lleva su cantidad */
    const mov2 = this.moles[k1]; this.moles[k1] = this.moles[k2]; this.moles[k2] = mov2;
    const sov = this.soldado[k1]; this.soldado[k1] = this.soldado[k2]; this.soldado[k2] = sov;
    this.mov[k1] = 1; this.mov[k2] = 1;
  }

  /* ── explosión ─────────────────────────────────────────────────────────
     ⚠ Carlos: «tus explosiones son demasiado instantáneas y poco
     impresionantes». Tenía razón y la causa era de diseño: la vieja versión
     recorría un círculo y CAMBIABA los tipos de golpe. Todo pasaba en un
     cuadro, así que no había nada que ver — ni onda, ni cosas saliendo
     volando, ni retumbo.

     Ahora una explosión no rompe nada por sí misma: INYECTA PRESIÓN, CALOR y
     VELOCIDAD en un punto. La presión se difunde sola en los cuadros
     siguientes, empuja lo que encuentra y rompe lo que no aguante. Eso es una
     onda expansiva, y de paso es la misma pieza con la que funciona un cañón:
     presión encerrada que encuentra por dónde salir. */
  /* ⚠ LA FUERZA ES POR CELDA, NO POR EXPLOSIÓN, y ahí estaba el reclamo de
     Carlos entero: «todos los explosivos explotan demasiado fuerte y sin
     contar el muro todo material se destruye SIN IMPORTAR LA CANTIDAD de
     explosivo». Medido antes de tocar nada, contra un suelo de piedra:

         nitro    1→246  2→251  4→251  9→251  25→251  64→596
         pólvora  1→0    2→11   4→11   9→11   25→11   64→61

     O sea: UNA celda de nitroglicerina destruía 246 celdas de piedra, y
     multiplicar el explosivo por sesenta y cuatro apenas cambiaba nada. Las
     dos mitades del reclamo son el mismo defecto: el radio salía de una
     constante del MATERIAL —`explota`— y no de cuánto habías puesto, así que
     cada celda hacía la explosión completa ella sola y las demás sólo la
     repetían encima, en el mismo sitio, sin sumar casi nada.

     Ahora `explota` es la energía de UNA celda y es chica. Muchas celdas
     hacen muchos estallidos pequeños cuyas presiones SÍ se suman —la línea
     de abajo es `+=`—, y de ahí sale solo lo que pedía: el doble de explosivo
     hace el doble de daño, sin una tabla que lo diga. El radio crece con la
     raíz de la energía porque en un plano el área es el cuadrado del radio;
     ponerlo lineal es lo que hacía que un petardo tuviera alcance de bomba. */
  revienta(x, y, fuerza){
    const r = Math.max(1, Math.round(Math.sqrt(fuerza) * 1.15));
    this.despierta(x, y, r + 2);
    this.suelta(x, y, r + 1);
    for(let dy = -r; dy <= r; dy++){
      for(let dx = -r; dx <= r; dx++){
        const d = Math.hypot(dx, dy);
        if(d > r) continue;
        const nx = x + dx, ny = y + dy;
        if(!this.dentro(nx, ny)) continue;
        const k = this.i(nx, ny);
        if(EL[this.t[k]].id === 'muro') continue;
        const cerca = 1 - d / r;
        /* ⚠ TOPE POR CELDA, y es lo que quita el acantilado. Sin él, sesenta
           y cuatro celdas detonando en el mismo sitio SUMAN sus presiones sin
           límite: la curva de daño iba 4→4, 16→54 y de golpe 64→1304, o sea
           media sala. Y no es que 64 celdas hagan media sala de daño — es que
           el pico se dispara tanto que TODO lo que toca revienta en el acto y
           cada hueco abre el siguiente.
           Un explosivo de verdad tiene una presión de detonación propia: más
           cantidad hace el frente MÁS GRANDE y más largo, no infinitamente más
           intenso. Con el tope, más explosivo sigue haciendo más daño —cubre
           más área— pero ya no se desboca. */
        const p2 = this.pres[k] + fuerza * 22 * cerca * cerca;
        this.pres[k] = p2 > TOPE_DETON ? TOPE_DETON : p2;
        this.anotaPico(this.pres[k]);
        this.temp[k] += fuerza * 60 * cerca;
        if(d > 0.4){
          this.vx[k] += (dx / d) * Math.sqrt(fuerza) * .5 * cerca;
          this.vy[k] += (dy / d) * Math.sqrt(fuerza) * .5 * cerca;
        }
      }
    }
    /* ── EL CRÁTER SALE DE LA ENERGÍA, NO DE UN RADIO ─────────────────
       Carlos: «el cráter, en lugar de hacerlo fijo, haz que se calcule según
       los NEWTONS de la explosión». Tiene razón y lo mío era un parche: yo
       había puesto un tope a la presión de detonación para matar el
       desbocamiento, y de rebote el cráter dejaba de crecer pasadas unas 64
       celdas. O sea que arreglé el síntoma tapando también el efecto bueno.

       Lo correcto es un PRESUPUESTO. Una explosión trae una energía —la de su
       explosivo, por cuánto pusiste— y romper una celda CUESTA: cuesta según
       lo duro y lo pesado que sea ese material. Se excava desde el centro
       hacia afuera y se para cuando el presupuesto se acaba.

       De ahí sale solo todo lo que uno esperaría, sin una tabla que lo diga:
       · el doble de explosivo hace el doble de cráter, y sin techo
       · el mismo cargo abre un hoyo grande en madera y uno chico en metal
       · y NO se puede desbocar, porque la energía es finita: lo que se gasta
         rompiendo ya no está para romper lo siguiente. Eso es lo que el tope
         hacía a la fuerza y aquí sale de la contabilidad. */
    this.excava(x, y, fuerza);

    /* ⚠ HALLAZGO SIN ARREGLAR, Y VA ESCRITO AQUÍ PORQUE ES DONDE SE VE.
       CONTADO con el motor en la mano, en el bote de Carlos con TREINTA celdas
       de nitroglicerina dentro: `revienta` se llama SEIS veces. Las otras
       veinticuatro no detonan — se las come el fuego que deja la primera, que
       es deflagración y no detonación. O sea que un cargo entrega un QUINTO de
       la energía que uno puso, y de ahí viene buena parte de lo que Carlos
       reportó: no es sólo que el empuje fuera flojo, es que había cinco veces
       menos explosivo del que él creía haber puesto.

       Lo probé: meter un frente de detonación que se lleve la masa entera
       —encolando los vecinos con `explota` en `_detona`— sube las detonaciones
       de 6 a 37 y multiplica por cinco el impulso. Y descalibra el motor: se
       ponen en rojo la pared de metal (deja pasar 42% en vez de poco), las
       paredes que deben aguantar, y la curva de daño se vuelve no monótona
       (16→89, 64→59). Bajar JULIOS a 60 o a 40 no lo arregla: cambia de sitio.

       Así que NO se sube a medias. Es un cambio de física que necesita su
       propia pasada de calibración, no un parche de paso. Lo que sí está
       arreglado y medido es lo otro: la energía se parte entre romper y
       empujar, y el impulso se le da a la pieza entera. */


    /* el corazón sí se convierte en fuego: es la deflagración */
    const rc = Math.max(0, Math.round(Math.sqrt(fuerza) * .35));
    for(let dy = -rc; dy <= rc; dy++) for(let dx = -rc; dx <= rc; dx++){
      if(Math.hypot(dx, dy) > rc) continue;
      const nx = x + dx, ny = y + dy;
      if(!this.dentro(nx, ny)) continue;
      const k = this.i(nx, ny);
      if(EL[this.t[k]].id === 'muro') continue;
      this.cambia(k, this.rnd() < .7 ? IDX.fuego : IDX.humo);
    }
  }

  /* ── LAS CÁMARAS SELLADAS ───────────────────────────────────────────────
     Carlos, dos veces en el mismo mensaje: «las presiones en un espacio
     cerrado deben incluir el aire para poder aumentar la presión en un lugar y
     que explote al rebasarse», y «no tengo manera de aumentar la presión
     dentro de un espacio, por ejemplo para fusionar hidrógeno y oxígeno, o
     someter a tanta presión carbono que se vuelva diamante».

     Medido antes de tocar nada: una caja de muro llena de gas natural, metiendo
     más gas doscientos pasos seguidos, marcaba presión CERO. Y no era un ajuste
     malo — es que la presión sólo podía nacer de la TEMPERATURA. Un gas frío
     encerrado no pesaba nada, y el aire de una habitación no existía siquiera
     como cosa que se pueda comprimir.

     Aquí se busca qué huecos están sellados —lo que no se alcanza desde el
     borde del mundo— y a cada uno se le aplica la ley de los gases:

         P = (n/V)·(T/T₀) − 1        en atmósferas POR ENCIMA del ambiente

     · `n` son los moles: cada celda de gas los suyos (que suben al pintar
       encima), y cada hueco cuenta como UNA de aire — eso es literalmente lo
       que pidió, «deben incluir el aire».
     · `V` es el volumen que queda: los líquidos ocupan sitio y no comprimen,
       así que restan volumen en vez de sumar gas. Por eso meter agua a una
       cámara sellada la presuriza.
     · y de ahí sale solo lo demás: un pistón que encoge la cámara sube la
       presión sin tocar el fuego (Boyle), calentarla la sube sin meter nada
       (Gay-Lussac), y si la mezcla reacciona y quedan menos moles, BAJA.

     Lo que sale por el otro lado es que el recipiente reviente cuando no
     aguante, y eso no hace falta escribirlo: la presión se escribe en el mismo
     campo que usa la onda, así que la maquinaria de romper ya estaba puesta. */
  camaraPaso(){
    const { an, al, t } = this;
    const abierto = this._abierto;
    const cola = this._cola;
    abierto.fill(0);
    let cab = 0, fin = 0;
    const pasable = k => {
      const e = EL[t[k]];
      if(e.fijo) return false;
      const est = this.estadoDe(k);
      return est !== 'solido' && est !== 'polvo';
    };
    /* 1 · lo que se alcanza desde el borde del mundo está al aire libre */
    const borde = k => { if(!abierto[k] && pasable(k)){ abierto[k] = 1; cola[fin++] = k; } };
    for(let x = 0; x < an; x++){ borde(x); borde((al - 1) * an + x); }
    for(let y = 0; y < al; y++){ borde(y * an); borde(y * an + an - 1); }
    while(cab < fin){
      const k = cola[cab++], x = k % an, y = (k / an) | 0;
      if(x > 0)      borde(k - 1);
      if(x < an - 1) borde(k + 1);
      if(y > 0)      borde(k - an);
      if(y < al - 1) borde(k + an);
    }
    /* 2 · lo que quedó sin alcanzar son cámaras. Una por componente. */
    this.camara.fill(0);
    this.camaraP.length = 0;
    const cola2 = this._cola2;
    for(let k0 = 0; k0 < t.length; k0++){
      if(abierto[k0] || this.camara[k0] || !pasable(k0)) continue;
      const id = this.camaraP.length + 1;
      let c2 = 0, f2 = 0;
      cola2[f2++] = k0; this.camara[k0] = id;
      let vol = 0, moles = 0, tsum = 0;
      while(c2 < f2){
        const k = cola2[c2++], x = k % an, y = (k / an) | 0;
        const tk = t[k];
        if(tk === VACIO){ vol++; moles += 1; tsum += this.temp[k]; }
        else if(EL[tk].estado === 'gas'){ vol++; moles += this.moles[k] || 1; tsum += this.temp[k]; }
        /* los líquidos ocupan sitio y no comprimen: ni volumen ni moles */
        const mete = k2 => { if(!this.camara[k2] && !abierto[k2] && pasable(k2)){ this.camara[k2] = id; cola2[f2++] = k2; } };
        if(x > 0)      mete(k - 1);
        if(x < an - 1) mete(k + 1);
        if(y > 0)      mete(k - an);
        if(y < al - 1) mete(k + an);
        if(f2 > cola2.length - 4) break;
      }
      if(vol < 1){ this.camaraP.push(0); continue; }
      /* ⚠ SÓLO LA COMPRESIÓN, NO LA TEMPERATURA — y esto costó seis pruebas
         rojas antes de verlo. La presión que da el CALOR ya la ponía el motor
         celda a celda desde la tanda del cohete, y meterla otra vez aquí la
         contaba dos veces: la misma recámara a 2 600° pasó de 77 a 2 600 de
         presión, treinta y cuatro veces más, y con eso un recipiente CERRADO
         y sin gravedad se propulsaba solo doce celdas. Lo que faltaba no era
         el calor: era que meter MÁS GAS en el mismo sitio contara. Así que
         esto mide sólo el exceso sobre «una de aire por hueco», que es
         exactamente el agujero que Carlos señaló, y a una atmósfera normal
         da cero y no toca nada de lo que ya funcionaba. */
      const tmed = tsum / vol + 273;
      const atm = Math.max(0, moles / vol - 1) * (tmed / (AMBIENTE + 273));
      this.camaraP.push(atm * ATM);
      if(atm > 0.05) this.despierta(k0 % an, (k0 / an) | 0, 2);
    }
    /* ── 3 · LO QUE ESTÁ SUMERGIDO TAMBIÉN ESTÁ A ESA PRESIÓN ──────────
       Sin esto, apretar una cámara aplastaba lo que hubiera DENTRO, y salía
       una tontería memorable: el carbón se volvía diamante y a los sesenta
       pasos los dieciséis diamantes habían desaparecido, triturados por la
       misma presión que los hizo. El defecto es de bulto: la rotura compara
       la presión de una celda con la de su vecina sólida, y un objeto
       sumergido tenía 11 000 alrededor y 0 dentro. Un cuerpo rodeado de
       presión POR IGUAL no siente fuerza neta — por eso un buzo no se aplasta
       y un submarino sí.
       Lo que distingue la PARED del recipiente de lo que hay dentro es una
       sola cosa: la pared toca el aire libre por fuera. Así el bote sigue
       reventando —que es lo que se quiere— y lo de dentro aguanta.
       ⚠ Y se mira SÓLO a los vecinos. Lo intenté primero propagando «toca
       fuera» por toda la cadena de sólidos, y con eso cualquier cosa APOYADA
       en el suelo del recipiente contaba como pared: los diamantes seguían
       haciéndose polvo porque estaban posados encima. Tocar a alguien que
       toca la calle no es estar en la calle. */
    for(let k = 0; k < t.length; k++){
      if(t[k] === VACIO || this.camara[k]) continue;
      const est = this.estadoDe(k);
      if(est !== 'solido' && est !== 'polvo') continue;
      if(EL[t[k]].fijo) continue;
      const x = k % an, y = (k / an) | 0;
      if(x === 0 || y === 0 || x === an - 1 || y === al - 1) continue;
      if(abierto[k - 1] || abierto[k + 1] || abierto[k - an] || abierto[k + an]) continue;
      const id = this.camara[k - 1] || this.camara[k + 1] || this.camara[k - an] || this.camara[k + an];
      if(id) this.camara[k] = id;
    }
  }

  /* Lo que cuesta arrancar UNA celda de su sitio, en la misma moneda que el
     presupuesto de la explosión. Sale de lo duro que es y de lo que pesa —un
     material duro y denso cuesta más que uno blando y ligero—, que es la
     misma tenacidad que ya usa la fractura por impacto. */
  costeRomper(k){
    const e = EL[this.t[k]];
    return 40 + (e.dureza || 0) * 900 + (e.dens || 1) * 6;
  }

  /* Excava el cráter gastando el presupuesto de la explosión, de dentro hacia
     afuera. Anillo por anillo: lo que está pegado al centro se lleva la
     energía primero, que es lo que hace que un cráter sea un cráter y no un
     colador. */
  excava(x, y, fuerza){
    const total = fuerza * JULIOS;
    if(total <= 0) return;
    /* ── LA ENERGÍA SE PARTE EN DOS: LA QUE ROMPE Y LA QUE EMPUJA ──────────
       Carlos, después de probarlo: «puse un muro con glicerina adentro, dejé
       abierta la parte de arriba y arriba coloqué piedra, madera y concreto en
       tres pruebas distintas; accioné la explosión y no salió volando ninguna
       de las anteriores». Medido antes de tocar nada: la tapa de piedra salía
       de y=46 y acababa en y=67 — o sea que se DESHACÍA y caía, en vez de
       salir disparada. Un bote con la boca tapada es un cañón, y el mío era
       una trituradora.

       La causa: TODA la energía se gastaba rompiendo. El presupuesto se
       compraba la tapa celda por celda hasta que no quedaba tapa, y nunca
       quedaba nada para lanzarla. Y en un explosivo de verdad la fragmentación
       es sólo una parte: el resto es gas expandiéndose, que es justo lo que
       lanza las cosas. Así que el presupuesto se parte, y las dos mitades
       hacen cosas distintas:

         · CAVA abre el cráter, igual que antes — sigue saliendo de la energía
           y sigue creciendo con la carga, sin techo
         · lo demás sale en RAYOS y empuja lo primero que cada rayo no puede
           romper, con E = ½mv². Eso es lo que lanza la tapa. */
    const cava = total * CAVA;
    this.cavaCrater(x, y, cava);
    this.empujaBlast(x, y, total - cava);
  }

  /* la mitad que abre el hoyo */
  cavaCrater(x, y, julios){
    /* ⚠ SE SIGUE BUSCANDO MIENTRAS QUEDE PRESUPUESTO, y las dos versiones
       anteriores lo tiraban por la ventana. La primera paraba el cráter entero
       al toparse con UNA celda que no podía pagar —una veta de metal en medio
       de la tierra y ahí se acababa la explosión—, y además calculaba de
       antemano hasta dónde llegar suponiendo que todo era blando, así que en
       cuanto el centro ya estaba hueco el recorrido se quedaba corto sin haber
       gastado nada. Ahora lo que no se puede pagar se SALTA, no se abandona. */
    /* ⚠ EL RADIO MÁXIMO SE DEMUESTRA, NO SE ADIVINA, Y ACOTA EL GROSOR DE LO
       EXCAVADO — NO LA DISTANCIA AL BLANCO. Romper la celda más barata que
       existe cuesta 40 julios —es la constante de `costeRomper`—, así que un
       presupuesto de J no puede romper más de J/40 celdas, y ésas no caben en
       un disco de radio menor que √(J/40π). Se toma √(J/40), que es ese radio
       con holgura de sobra, más tres celdas de cortesía.

       Pero el contador NO empieza en el centro: empieza donde empieza el
       gasto. Puesto a secas rompía la curva de daño, porque una pila de 256
       celdas mide 16 de alto y las de arriba detonan a 16 celdas de la piedra:
       se les acababa el radio cruzando aire. El presupuesto limita cuántas
       celdas se pueden romper, no cuánto hay que viajar para llegar a ellas.

       ⚠⚠ Y AQUÍ DEJO ESCRITO EL ERROR MÁS CARO DE ESTA TANDA, que fue MÍO y
       no del motor. Lancé un barrido de constantes en segundo plano —un `for`
       que reescribía `JULIOS` con `sed`— y en paralelo, en primer plano,
       restauré el valor bueno. El barrido siguió escribiendo DESPUÉS, y el
       archivo se quedó en `JULIOS = 30` en vez de 150. Con eso medí durante
       una hora: «cavaCrater rompe CERO celdas», «la curva de daño es no
       monótona», «revienta cuesta 0.1 ms». Las tres eran falsas y me llevaron
       a tres arreglos que no hacían falta. Con el valor de verdad: la curva es
       1→0 4→4 16→34 64→56 144→130 256→182, monótona, y `revienta` cuesta 2.1
       ms de 57.4. **Dos procesos escribiendo el mismo archivo es una medición
       inventada, y no avisa: sale un número creíble.** */
    /* ⚠ Y EL RADIO ACOTA EL GROSOR DE LO EXCAVADO, NO LA DISTANCIA AL BLANCO.
       Puesto a secas, el tope rompió la curva de daño: 64 celdas de nitro
       hacían 51 y 256 hacían 48 — MENOS con cuatro veces más explosivo. La
       razón es que una pila de 256 mide 16 celdas de alto, así que las de
       arriba detonan a 16 celdas de la piedra y el tope se les acababa
       cruzando aire. El presupuesto limita cuántas celdas se pueden romper,
       no cuánto hay que viajar para llegar a ellas. Así que el contador
       empieza donde empieza el gasto. */
    const grosor = 3 + Math.ceil(Math.sqrt(julios / 40));
    let rMax = 60, gasto = false;
    const BARATO = 46;
    for(let d = 0; d <= rMax && julios >= BARATO; d++){
      const antes = julios;
      for(let dy = -d; dy <= d; dy++){
        for(let dx = -d; dx <= d; dx++){
          /* sólo el borde del anillo: lo de dentro ya se visitó */
          if(Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
          if(dx * dx + dy * dy > d * d + d) continue;
          if(!this.dentro(x + dx, y + dy)) continue;
          const k = this.i(x + dx, y + dy);
          const e = EL[this.t[k]];
          if(this.t[k] === VACIO || e.fijo) continue;
          const est = this.estadoDe(k);
          if(est !== 'solido' && est !== 'polvo') continue;
          const coste = this.costeRomper(k);
          if(coste > julios) continue;       /* esta no la puedo pagar: sigo */
          julios -= coste;
          /* no se borra sin más: sale despedida, que es la metralla */
          const dd = Math.hypot(dx, dy) || 1;
          this.vx[k] += (dx / dd) * 2.2;
          this.vy[k] += (dy / dd) * 2.2;
          this.suelto[k] = 1; this.sop[k] = 0;
          if(this.rnd() < .55){ this.cambia(k, VACIO); this.pres[k] = 0; this.pv[k] = 0; }
        }
      }
      if(!gasto && julios !== antes){ gasto = true; rMax = Math.min(60, d + grosor); }
    }
  }

  /* y la mitad que lanza: rayos que empujan lo primero que no pueden romper */
  empujaBlast(x, y, julios){
    if(julios <= 0) return;
    const { t } = this;
    const RAYOS = 48;
    const porRayo = julios / RAYOS;
    const AIRE = 3;                    /* lo que le cuesta al frente cruzar vacío */
    /* la misma losa la van a golpear muchos rayos: se busca una vez */
    const cache = new Map();
    for(let a = 0; a < RAYOS; a++){
      const ang = (a / RAYOS) * Math.PI * 2;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      let e = porRayo, px = -1, py = -1;
      for(let d = 1; d <= 60 && e > 0; d++){
        const nx = Math.round(x + ux * d), ny = Math.round(y + uy * d);
        if(nx === px && ny === py) continue;      /* el redondeo repite celda */
        px = nx; py = ny;
        if(!this.dentro(nx, ny)) break;
        const k = this.i(nx, ny);
        const el = EL[this.t[k]];
        if(el.fijo) break;                        /* el muro para el frente */
        if(this.t[k] === VACIO){ e -= AIRE; continue; }
        const est = this.estadoDe(k);
        if(est !== 'solido' && est !== 'polvo'){ e -= AIRE; continue; }
        /* lo primero sólido que encuentra se lleva TODO lo que le queda al
           rayo: es la cara que recibe el gas, y detrás de ella hay sombra */
        /* ⚠ EL IMPULSO SE LE DA A LA LOSA, NO A LA CELDA QUE RECIBIÓ EL GOLPE,
           y ésta es la MISMA lección que la mano de Carlos con otra cara. Dar
           la velocidad sólo a la celda golpeada no lanza nada por dos razones
           que se suman: esa celda es justo la que el cráter se está comiendo,
           así que el impulso se va con ella; y aunque sobreviva, las otras
           cincuenta y nueve de la losa siguen ancladas y no la dejan moverse.
           Medido: la tapa de concreto se quedaba clavada en y=55 con treinta
           celdas de nitroglicerina debajo, con una velocidad media de −0.196,
           que no llega ni al mínimo para moverse una celda.
           Un impulso sobre un cuerpo rígido se reparte entre TODA su masa:
           Δv = m·v / M. Eso es lo que lanza la losa entera en vez de
           desconchar la cara de abajo. */
        const m = el.dens || 1;
        let v = Math.sqrt(2 * e / m) * EMPUJE_BLAST;
        if(v > 2.5) v = 2.5;
        let reg = cache.get(k);
        if(!reg){
          const pieza = this.piezaDe([k], TOPE_LANZA);
          /* si llegó al tope, la pieza es el suelo o un edificio: no se lanza */
          if(pieza.length >= TOPE_LANZA) reg = { pieza:null };
          else {
            let masa = 0;
            for(const k2 of pieza) masa += EL[t[k2]].dens || 1;
            reg = { pieza, masa: masa || 1 };
          }
          cache.set(k, reg);
          if(reg.pieza) for(const k2 of reg.pieza) cache.set(k2, reg);
        }
        if(!reg.pieza){                       /* anclada: sólo se le pica */
          this.vx[k] += ux * v; this.vy[k] += uy * v;
          this.suelto[k] = 1; this.sop[k] = 0;
          break;
        }
        const dv = v * m / reg.masa;
        for(const k2 of reg.pieza){
          this.vx[k2] += ux * dv;
          this.vy[k2] += uy * dv;
          this.suelto[k2] = 1; this.sop[k2] = 0;
        }
        break;
      }
    }
  }

  /* ── PRESIÓN · ECUACIÓN DE ONDA ────────────────────────────────────────
     ⚠ ESTO ERA UNA DIFUSIÓN DISFRAZADA DE ONDA Y CARLOS LO CAZÓ MIRANDO.
     La versión anterior repartía la presión entre los vecinos y la multiplicaba
     por 0.955 cada paso. Eso es exactamente lo que hace el calor, y el calor no
     viaja: se reparte y se enfría donde está. Medido antes de tocar nada: el
     radio de la onda pasaba de 18.9 a 24.2 celdas en cuarenta pasos —o sea
     0.13 celdas por paso— mientras la presión total caía de 76 244 a 12 530.
     Una explosión que se queda en su sitio y se desvanece.

     Una onda es de segundo orden: no basta con saber cuánta presión hay, hace
     falta saber a qué RITMO está cambiando. Con esos dos campos sale la
     ecuación de onda —∂²p/∂t² = c²∇²p— y con ella salen solas, sin una línea
     dedicada a cada una, las cuatro cosas que pidió Carlos:

       · el frente VIAJA en vez de quedarse
       · se DEBILITA al repartirse en una circunferencia cada vez mayor
       · REBOTA en lo rígido y se DIFRACTA al doblar una esquina
       · una pared floja la deja pasar DEBILITADA y refleja el resto: parte
         se queda de este lado y parte sigue del otro con menos fuerza

     El acoplamiento con cada vecino es lo que decide qué pasa en el borde: 0
     es reflexión perfecta (el muro), 1 es paso libre (aire, líquido), y en
     medio están los sólidos según su dureza. Es el coeficiente de transmisión
     de toda la vida, sólo que aquí se lee como «qué tan buena pared eres».

     Estabilidad: en dos dimensiones la condición es c²·dt²/dx² ≤ ½. Con 0.42
     y dos sub-pasos por cuadro el frente avanza ~1.3 celdas por paso, que a
     sesenta cuadros se ve como una onda y no como una animación. Pasarse de
     ½ no da «más rápido»: da números que explotan a infinito en cuatro pasos. */
  presionPaso(){
    /* Dos sub-pasos: el frente avanza ~1.4 celdas por paso, que a sesenta
       cuadros son 84 celdas por segundo y se lee como una explosión. Con uno
       solo va a la mitad y se ve como una animación lenta — y además el
       desahogo del aire corre la mitad de veces, así que la sala tardaba 700
       pasos en callarse en vez de 400. Se puede pagar: medido en una sala
       normal de 320×480 con suelo, arena, agua y un circuito, el paso entero
       cuesta 12.3 ms en reposo y 15.1 con una explosión encima — MENOS que los
       13.7 y 16.4 de la difusión que había antes. */
    this.ondaSubPaso();
    this.ondaSubPaso();
    this.presionRompe();
  }

  /* Marca que hay onda en esta zona, para que el sub-paso sepa dónde mirar.
     Todo el que inyecte presión tiene que llamarlo, o su onda no se propaga. */
  despierta(x, y, r){
    const c = this._caja;
    c.x0 = Math.min(c.x0, x - r); c.x1 = Math.max(c.x1, x + r);
    c.y0 = Math.min(c.y0, y - r); c.y1 = Math.max(c.y1, y + r);
  }

  /* ── QUÉ SÓLIDOS SE SOSTIENEN ──────────────────────────────────────────
     Recorrido en anchura desde lo que no se puede caer, propagando por
     sólidos pegados. Las semillas son tres, y las tres hacen falta:

       · lo FIJO (el muro), que es el ancla de verdad
       · el suelo del mundo
       · cualquier sólido que ya tenga algo debajo por donde no puede bajar

     La tercera es la que se me iba a olvidar y la que rompe todo: sin ella,
     una caja de piedra apoyada sobre ARENA no está anclada a nada, así que su
     techo —que tiene hueco debajo, el interior de la caja— se desploma hacia
     dentro en el primer paso. Con ella, la caja se apoya, se sostiene entera,
     y sigue siendo una caja.

     Lo que esto compra: arcos que aguantan, voladizos, techos, recámaras…
     y que volarle la base a una torre la tire de verdad. */
  sostenPaso(){
    const { an, al, t, sop } = this;
    const cola = this._cola;
    const sopD = this.sopD;
    let cab = 0, fin = 0;
    sop.fill(0);
    sopD.fill(255);
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k = y * an + x;
        const tk = t[k];
        if(tk === VACIO) continue;
        const e = EL[tk];
        if(e.fijo){ sop[k] = 1; sopD[k] = 0; cola[fin++] = k; continue; }
        if(this.estadoDe(k) !== 'solido') continue;
        if(y === al - 1){ sop[k] = 1; sopD[k] = 0; cola[fin++] = k; continue; }
        const ab = k + an;
        if(t[ab] === VACIO) continue;
        /* ⚠ AQUÍ DECÍA TAMBIÉN «o apoyado en un SÓLIDO», y esa condición se
           cumple sola dentro de cualquier torre: cada piedra se apoya en la de
           abajo. O sea que la torre entera se declaraba sostenida a sí misma
           —incluido el trozo que colgaba en el aire— y borrarle la base no
           tiraba nada. Un anillo de razonamiento, no un error de tecleo.
           Sólido sobre sólido lo resuelve el RECORRIDO desde las anclas de
           verdad, que para eso está. Semilla sólo lo que no depende de otro
           sólido: lo fijo, el suelo del mundo, y apoyarse en un montón de
           polvo, que sí es sostén propio. */
        if(this.estadoDe(ab) === 'polvo' || EL[t[ab]].fijo){ sop[k] = 1; sopD[k] = 0; cola[fin++] = k; }
      }
    }
    while(cab < fin){
      const k = cola[cab++];
      const x = k % an, y = (k / an) | 0;
      /* `sopD` es a cuántos eslabones está esta celda de un anclaje de verdad.
         Es lo que permite saber HACIA DÓNDE viaja la carga: siempre cuesta
         abajo, hacia el apoyo. Sin esa dirección no hay forma de distinguir
         compresión de tracción ni de saber dónde está el punto débil. */
      const d = sopD[k] + 1;
      if(x > 0      && this.pegado(k - 1)){  sop[k - 1]  = 1; sopD[k - 1]  = d; cola[fin++] = k - 1; }
      if(x < an - 1 && this.pegado(k + 1)){  sop[k + 1]  = 1; sopD[k + 1]  = d; cola[fin++] = k + 1; }
      if(y > 0      && this.pegado(k - an)){ sop[k - an] = 1; sopD[k - an] = d; cola[fin++] = k - an; }
      if(y < al - 1 && this.pegado(k + an)){ sop[k + an] = 1; sopD[k + an] = d; cola[fin++] = k + an; }
    }

    /* El contagio del soltado. Un sólido suelto que NO se sostiene arrastra a
       sus vecinos que tampoco se sostienen: es lo que convierte «le volé la
       base» en «se me cayó la torre» y no en «se quedó el resto flotando».
       Va cuadro a cuadro a propósito — el derrumbe se ve caer. */
    const su = this.suelto;
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k = y * an + x;
        if(!su[k] || sop[k]) continue;
        if(t[k] === VACIO || this.estadoDe(k) !== 'solido') continue;
        if(x > 0      && !sop[k-1]  && this.esSolido(k-1))  su[k-1]  = 1;
        if(x < an - 1 && !sop[k+1]  && this.esSolido(k+1))  su[k+1]  = 1;
        if(y > 0      && !sop[k-an] && this.esSolido(k-an)) su[k-an] = 1;
        if(y < al - 1 && !sop[k+an] && this.esSolido(k+an)) su[k+an] = 1;
      }
    }
  }

  esSolido(k){ return this.t[k] !== VACIO && this.estadoDe(k) === 'solido'; }

  /* ═══════════════════════════════════════════════════════════════════════
     ESFUERZOS: QUÉ SE ROMPE PRIMERO Y POR QUÉ
     -----------------------------------------------------------------------
     Carlos lo planteó con un caso concreto y con la pregunta correcta:
     un recipiente de concreto, un tapón de madera, presión dentro. «No quiero
     que simplemente se rompa todo al mismo tiempo… debe calcularse el
     resultado según las propiedades y geometría reales». Y remató con el caso
     difícil: una cruz de madera empotrada en concreto, y qué cambia si le
     metes una varilla dentro.

     Lo que hace falta para contestar eso, y es lo que hay aquí:

     1 · LA CARGA ENTRA. La presión que empuja contra una cara de un sólido es
         una fuerza. Se mide por celda: presión de fuera menos presión de
         dentro del material.
     2 · LA CARGA VIAJA hacia los apoyos. Cada celda pasa lo que recibe a sus
         vecinas que están MÁS CERCA de un anclaje (`sopD` más bajo). Eso es
         «la madera transmite esa fuerza hacia sus puntos de apoyo».
     3 · SE REPARTE entre caminos paralelos. Si hay dos vecinas más cerca del
         anclaje, cada una se lleva la mitad. De ahí sale solo el refuerzo:
         meterle una varilla a la madera crea un segundo camino, y cada uno
         soporta menos.
     4 · CADA CELDA FALLA EN SU MODO. Con la dirección de la carga y la del
         apoyo se sabe si está a compresión (empujada contra su apoyo), a
         tracción (estirada lejos de él) o a corte (empujada de lado). Se
         compara contra la resistencia de ESE modo y gana el peor margen.

     Con eso no está escrito en ninguna parte quién se rompe primero: sale de
     los números. Un tapón de madera falla al corte contra las paredes porque
     la madera aguanta 2 al corte; el mismo tapón de metal aguanta 40 y
     entonces lo que cede es el concreto por tracción, que aguanta 3.
     ═════════════════════════════════════════════════════════════════════ */
  esfuerzoPaso(){
    const { an, al, t, sop, sopD, carga, pres } = this;
    carga.fill(0); this.cargaLocal.fill(0);
    let hay = false;
    /* 1 · la carga que entra por presión */
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k = y * an + x;
        if(!sop[k] || !this.esSolido(k)) continue;
        const e = EL[t[k]];
        if(e.fijo) continue;
        let f = 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          if(!this.dentro(x+dx, y+dy)) continue;
          const k2 = this.i(x+dx, y+dy);
          const d = pres[k2] - pres[k];
          if(d > 0) f += d;
        }
        if(f > 0.5){ carga[k] = f; this.cargaLocal[k] = f; hay = true; }
      }
    }
    if(!hay) return;

    /* 1-bis · REPARTO POR RIGIDEZ, que es lo que hace que un refuerzo sirva.
       ⚠ Sin esto, meterle una varilla de metal a una viga de madera no cambia
       NADA: cada celda de madera seguía aguantando su propio empuje entera y
       se rompía igual, con el acero al lado mirando. Medido: 18 celdas rotas
       sin varilla y 23 con ella.
       Una sección no resiste celda por celda: resiste como conjunto, y la
       parte más rígida se lleva la mayor porción de la carga. Eso es
       literalmente para qué existe el concreto armado. Aquí, cada celda
       cargada reparte su carga con las vecinas sólidas en proporción a su
       rigidez — y una vecina de acero, que es veinte veces más rígida que la
       madera, se lleva veinte veces más. */
    const rig = (kk) => {
      const ee = EL[t[kk]];
      return (ee.compresion || 10) + (ee.traccion || 2) + (ee.corte || 2);
    };
    const repartida = this._repartida;
    repartida.set(this.cargaLocal);
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k = y * an + x;
        const f = this.cargaLocal[k];
        if(f <= 0) continue;
        let total = rig(k);
        const socios = [];
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          if(!this.dentro(x+dx, y+dy)) continue;
          const k2 = this.i(x+dx, y+dy);
          if(!this.esSolido(k2) || EL[t[k2]].fijo) continue;
          socios.push(k2); total += rig(k2);
        }
        if(!socios.length) continue;
        repartida[k] -= f * (1 - rig(k) / total);
        for(const k2 of socios) repartida[k2] += f * (rig(k2) / total);
      }
    }
    this.cargaLocal.set(repartida);

    /* 2 y 3 · la carga baja hacia los anclajes, repartida entre los caminos.
       Se recorre por distancia DESCENDENTE: primero lo más lejos del apoyo,
       que es de donde viene la carga, y así cada celda ya tiene todo lo suyo
       cuando le toca repartir. */
    /* ⚠ POR CUBETAS Y NO RECORRIENDO EL MUNDO POR CADA NIVEL. La primera
       versión hacía un barrido completo por cada distancia al anclaje, o sea
       O(distancia × celdas): con una estructura alta eso son cientos de
       barridos de 153 600 celdas. Medido: el paso con explosión pasó de 26 a
       59 ms. Es el mismo truco de cubetas que ya usa la electricidad aquí —
       se agrupa una vez por distancia y se recorre cada grupo una sola vez. */
    const cubetas = [];
    let dMax = 0;
    for(let k = 0; k < carga.length; k++){
      if(carga[k] <= 0) continue;
      const d = sopD[k];
      if(d === 255 || d === 0) continue;
      (cubetas[d] || (cubetas[d] = [])).push(k);
      if(d > dMax) dMax = d;
    }
    for(let d = dMax; d > 0; d--){
      const lote = cubetas[d];
      if(!lote) continue;
      for(const k of lote){
        if(carga[k] <= 0) continue;
        const x = k % an, y = (k / an) | 0;
        let n1 = -1, n2 = -1, n3 = -1, n4 = -1, cuantos = 0;
        if(y > 0      && sopD[k-an] < d && this.esSolido(k-an)){ n1 = k-an; cuantos++; }
        if(y < al - 1 && sopD[k+an] < d && this.esSolido(k+an)){ n2 = k+an; cuantos++; }
        if(x > 0      && sopD[k-1]  < d && this.esSolido(k-1)){  n3 = k-1;  cuantos++; }
        if(x < an - 1 && sopD[k+1]  < d && this.esSolido(k+1)){  n4 = k+1;  cuantos++; }
        if(!cuantos) continue;
        const parte = carga[k] / cuantos;
        /* la vecina que recibe carga y aún no estaba en su cubeta, entra */
        for(const k2 of [n1, n2, n3, n4]){
          if(k2 < 0) continue;
          const antes = carga[k2];
          carga[k2] += parte;
          const d2 = sopD[k2];
          if(antes <= 0 && d2 > 0 && d2 !== 255) (cubetas[d2] || (cubetas[d2] = [])).push(k2);
        }
      }
    }

    /* 4 · quién falla, y en qué modo */
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k = y * an + x;
        const f = carga[k];
        if(f <= 0) continue;
        const e = EL[t[k]];
        if(e.fijo) continue;
        /* ¿por dónde se apoya? */
        let apX = 0, apY = 0, apoyos = 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          if(!this.dentro(x+dx, y+dy)) continue;
          const k2 = this.i(x+dx, y+dy);
          if(sopD[k2] < sopD[k] && this.esSolido(k2)){ apX += dx; apY += dy; apoyos++; }
        }
        /* ⚠ LOS ANCLAJES ERAN INDESTRUCTIBLES POR DEFINICIÓN, y eso hacía que
           la respuesta a la pregunta de Carlos estuviera decidida de antemano
           — justo lo que él no quería. Una celda a distancia 0 está pegada al
           suelo o al muro, así que NINGUNA vecina está «más cerca del
           anclaje»: se quedaba sin apoyos y salía por el `continue` sin que
           nadie le mirara el esfuerzo. Con eso, en cualquier montaje siempre
           cedía el brazo y nunca el empotramiento, que es media pregunta
           contestada a mano.
           Un anclaje sí falla: su apoyo es lo inamovible que tiene al lado, o
           el borde del mundo. */
        if(!apoyos){
          for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
            if(!this.dentro(x+dx, y+dy)){ apX += dx; apY += dy; apoyos++; continue; }
            const k2 = this.i(x+dx, y+dy);
            const est2 = this.t[k2] !== VACIO && this.estadoDe(k2);
            if(EL[this.t[k2]].fijo || est2 === 'polvo'){ apX += dx; apY += dy; apoyos++; }
          }
        }
        if(!apoyos) continue;
        /* ¿por dónde empuja la presión? */
        let emX = 0, emY = 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          if(!this.dentro(x+dx, y+dy)) continue;
          const k2 = this.i(x+dx, y+dy);
          const dp = pres[k2] - pres[k];
          if(dp > 0){ emX -= dx * dp; emY -= dy * dp; }   /* la fuerza va HACIA dentro */
        }
        const mE = Math.hypot(emX, emY), mA = Math.hypot(apX, apY);
        if(mE < 1e-6 || mA < 1e-6) continue;
        /* coseno entre el empuje y la dirección del apoyo:
             +1 → la empujan CONTRA su apoyo → compresión
             −1 → la estiran lejos del apoyo → tracción
              0 → la empujan de lado         → corte                        */
        const cos = (emX * apX + emY * apY) / (mE * mA);
        const comp = Math.max(0, cos), trac = Math.max(0, -cos);
        const cort = Math.sqrt(Math.max(0, 1 - cos * cos));
        /* el área es la geometría: cuantos más apoyos, más repartida la carga */
        /* ⚠ LA ESCALA. Las resistencias están en unidades de material y la
           carga sale del campo de presión, que es otra escala: sin este
           factor, una onda que sólo PASABA por una pared de concreto la
           demolía. Se calibra contra dos casos que tienen que salir bien los
           dos, y por eso está aquí y no a ojo:
             · una recámara de gas caliente a ~30 de presión NO revienta un
               recipiente de concreto
             · una explosión de 300+ SÍ
           `ESCALA_ESF` es el puente entre las dos escalas. Cambiarlo cambia
           el juego entero, así que va con su porqué escrito. */
        /* ⚠ AQUÍ MEZCLÉ DOS COSAS Y SE VIO EN UNA PARED ALTA. Usaba la carga
           ACUMULADA con la dirección LOCAL, y eso no es un esfuerzo: en un muro
           de sesenta celdas toda la carga de la onda baja hasta la base, y la
           base «fallaba al corte» con la dirección del empuje de su propia
           celda. Resultado: una onda que sólo PASABA demolía un muro de
           concreto, y la prueba de transmisión decía que el concreto dejaba
           pasar el 94% — o sea que ya no había muro.
           Son dos esfuerzos distintos y se calculan aparte:
             · el LOCAL, del empuje que recibe esta celda → tracción y corte
             · el ACUMULADO, el peso de todo lo que cuelga de ella → compresión
           Una columna aplasta su base; una onda no. */
        const area = apoyos;
        const s = this.cargaLocal[k] / area * ESCALA_ESF;
        /* el acumulado sólo aplasta: es lo que sostiene, no lo que la empuja */
        const sAcum = f / area * ESCALA_ESF;
        const margen = Math.max(
          comp * s     / (e.compresion || 10),
          trac * s     / (e.traccion   || 2),
          cort * s     / (e.corte      || 2),
          sAcum * 0.25 / (e.compresion || 10),
        );
        /* ⚠ UNA ONDA QUE PASA NO ES UNA CARGA QUE APLASTA, y el umbral de 1
           no sabía distinguirlas. La piedra aguanta 4 a tracción; el frente de
           una explosión trae gradientes de mil, o sea margen 6. Con fallo
           instantáneo en cuanto margen pasa de 1, la onda iba rompiendo TODA
           la sala celda por celda mientras la cruzaba — y cada hueco nuevo la
           realimentaba. Medido: un solo empujón de 3 000 dejaba un suelo de
           2 400 piedras en CERO, y ésa es la otra mitad del reclamo de Carlos,
           «sin contar el muro todo material se destruye».

           Ahora hay dos umbrales, que es como se comporta un material de
           verdad: por encima de `ROMPE_YA` revienta en el acto —es el
           corazón de la explosión, y ahí sí revienta— y entre 1 y ése se
           FATIGA. Si la carga se va, la fatiga se relaja y la pieza aguanta;
           si se queda o se repite, acaba cediendo igual. El frente pasa y deja
           la pared cascada, no pulverizada. */
        if(margen < ROMPE_YA){
          if(margen > 0.55) this.fatiga[k] += (margen - 0.55) * 0.6;
          else this.fatiga[k] *= 0.995;
          if(this.fatiga[k] < 60) continue;
        }
        /* falla. Un material elástico se deforma antes de irse: cede sitio y
           se lleva parte de la carga, en vez de desaparecer de golpe. */
        this.fatiga[k] = 0;
        this.suelta(x, y, 1);
        if(this.rnd() < (e.elastico || 0)){
          this.vx[k] += emX / mE * 0.8; this.vy[k] += emY / mE * 0.8;
          continue;                                   /* se dobla, no se rompe */
        }
        this.vx[k] += emX / mE * 1.6; this.vy[k] += emY / mE * 1.6;
        if(this.rnd() < 0.5){
          this.cambia(k, VACIO);
          /* ⚠ EL MISMO HUECO SILENCIOSO QUE EN `presionRompe`, y aquí era
             MUCHO peor porque aquí es donde de verdad se rompía la sala. Con
             el sostén apagado, un empujón de 3 000 en un suelo de 6 400
             piedras dejaba 6 400 y la onda moría en 200 pasos; con el sostén
             encendido quedaban 2 438 piedras y la presión llegaba a 147 MIL
             MILLONES. La pareja rota es la misma: la celda revienta, el sitio
             pasa de transmitir 0.23 a transmitir 1 con toda su presión dentro,
             y esa patada rompe a la siguiente.
             Aislarlo costó cuatro medidas equivocadas —culpé al explosivo, al
             borde de la caja, al paso de tiempo y a la ecuación— y las cuatro
             veces la respuesta fue la misma: apagar UNA pieza por vez hasta
             que la sala dejó de arrasarse. La ecuación de onda sola es
             estable en los cuatro materiales; romper solo, también. */
          this.pres[k] = 0; this.pv[k] = 0;
        } else {
          /* aunque no desaparezca, romperse consume la onda que la rompió */
          this.pres[k] *= 0.5;
        }
      }
    }
  }

  /* Qué modo va más justo en esta celda, para que el termómetro lo pueda
     enseñar sin recalcular nada. */
  modoDeFallo(x, y){
    if(!this.dentro(x, y)) return null;
    const k = this.i(x, y);
    if(!this.esSolido(k)) return null;
    const e = EL[this.t[k]];
    if(e.fijo) return { modo:'inamovible', margen:0 };
    const f = this.carga[k];
    if(f <= 0) return { modo:'sin carga', margen:0, carga:0 };
    return { modo:'con carga', margen:0, carga: Math.round(f * 10) / 10 };
  }



  /* ═══════════════════════════════════════════════════════════════════════
     CUERDAS Y PÉNDULOS
     -----------------------------------------------------------------------
     Carlos: «péndulos y cuerdas para amarrar cosas».

     Esto fue lo último de toda la lista, y no por difícil de programar sino
     porque es de OTRA CLASE. Todo lo demás de este juego son reglas por celda:
     esta piedra cae, este gas sube, esta pared aguanta tanto. Una cuerda no:
     su comportamiento vive en la RELACIÓN entre celdas. Un eslabón no sabe qué
     hacer mirando a sus vecinos — necesita saber quién es el ANTERIOR y
     mantenerse pegado a él, eslabón por eslabón hasta el amarre.

     O sea que hace falta un resolvedor de restricciones, y va aparte:

       1 · se encuentran las cadenas (celdas de cuerda pegadas, en 8 vecinos)
       2 · se busca el AMARRE: un eslabón pegado a algo sólido que se sostiene
       3 · se recorre la cadena desde el amarre, dando a cada eslabón su padre
       4 · cada eslabón cae por su cuenta… y después se le obliga a estar
           pegado a su padre. Esa corrección ES la tensión: no hay una fuerza
           de tensión escrita en ninguna parte, hay una restricción que se
           cumple — que es como se hacen las cuerdas en un motor de física.
       5 · lo que cuelga del último eslabón se queda colgando: eso es amarrar.

     Una cuerda sin amarre no es una cuerda: es un montón de celdas cayendo, y
     así se comporta. */
  cuerdaPaso(){
    const { an, al, t, sop } = this;
    const visto = this._vistoC;
    visto.fill(0);
    const cola = this._cola2;
    const padres = this._padreC;

    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k0 = y * an + x;
        if(visto[k0] || !ES_CUERDA[t[k0]]) continue;

        /* 1 · la cadena entera, por 8 vecinos: una cuerda dobla en diagonal */
        let cab = 0, fin = 0;
        cola[fin++] = k0; visto[k0] = 1;
        const cadena = [];
        while(cab < fin){
          const k = cola[cab++];
          cadena.push(k);
          const cx = k % an, cy = (k / an) | 0;
          for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
            if(!dx && !dy) continue;
            const nx = cx + dx, ny = cy + dy;
            if(nx < 0 || ny < 0 || nx >= an || ny >= al) continue;
            const k2 = ny * an + nx;
            if(visto[k2] || !ES_CUERDA[t[k2]]) continue;
            visto[k2] = 1; cola[fin++] = k2;
          }
          if(cadena.length > 3000) break;
        }

        /* 2 · el amarre */
        let amarre = -1;
        for(const k of cadena){
          const cx = k % an, cy = (k / an) | 0;
          for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
            const nx = cx + dx, ny = cy + dy;
            if(nx < 0 || ny < 0 || nx >= an || ny >= al) continue;
            const k2 = ny * an + nx;
            if(t[k2] === VACIO || ES_CUERDA[t[k2]]) continue;
            if(EL[t[k2]].fijo || (sop[k2] && this.estadoDe(k2) === 'solido')){ amarre = k; break; }
          }
          if(amarre >= 0) break;
        }
        if(amarre < 0){ for(const k of cadena) this.suelto[k] = 1; continue; }

        /* 3 · cada eslabón con su padre, desde el amarre.
           ⚠ Y EL PADRE SE GUARDA COMO PUESTO EN LA CADENA, NO COMO CELDA. Con
           la celda parecía más simple y estaba mal: en cuanto un eslabón se
           MUEVE, el siguiente sigue mirando la casilla donde su padre ESTABA —
           que ya está vacía. La restricción se calculaba contra un fantasma y
           la cuerda se quedaba estirada, tiesa, sin volver nunca. Otra vez la
           casilla confundida con la cosa, esta vez dentro del mismo paso. */
        for(const k of cadena) padres[k] = -1;
        const orden = [amarre];
        const dePadre = [0];
        padres[amarre] = amarre;
        for(let i = 0; i < orden.length; i++){
          const k = orden[i];
          const cx = k % an, cy = (k / an) | 0;
          for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
            if(!dx && !dy) continue;
            const nx = cx + dx, ny = cy + dy;
            if(nx < 0 || ny < 0 || nx >= an || ny >= al) continue;
            const k2 = ny * an + nx;
            if(!ES_CUERDA[t[k2]]) continue;
            if(padres[k2] !== -1) continue;
            padres[k2] = k; dePadre.push(i); orden.push(k2);
          }
        }

        /* 4 · el amarre no se mueve; los demás caen y luego se les obliga.
           `pos` lleva DÓNDE ESTÁ AHORA cada eslabón, que es lo que cambia. */
        const pos = orden.slice();
        /* cuántos eslabones hay entre éste y el amarre: ÉSA es su cuerda, y
           por eso no se calcula con el puesto en la lista —la búsqueda es a lo
           ancho y en una cuerda con ramas el puesto no es la profundidad— */
        const prof = [0];
        for(let i = 1; i < orden.length; i++) prof.push(prof[dePadre[i]] + 1);
        sop[amarre] = 1; this.flotante[amarre] = 1;
        this.vy[amarre] = 0; this.vx[amarre] = 0;
        for(let i = 1; i < orden.length; i++){
          const k = pos[i];
          this.flotante[k] = 1;
          this.gravedadEn(k % an, (k / an) | 0, k);
          this.vy[k] = Math.max(-VMAX, Math.min(this.vy[k] + this._gy, VMAX));
          this.vx[k] = Math.max(-VMAX, Math.min(this.vx[k] + this._gx, VMAX));
          this.arrastra(k, EL[t[k]]);
          pos[i] = this.tensa(k, pos[dePadre[i]], amarre, prof[i]);
        }

        /* 5 · lo que cuelga de la cuerda se queda colgando: eso es AMARRAR.
           ⚠ Y SE LE APLICA LA MISMA RESTRICCIÓN QUE A UN ESLABÓN, que es donde
           me quedé corto: al principio sólo le ponía `sop` para que no cayera,
           y eso lo sujeta HACIA ABAJO y nada más. Al empujarlo de lado salía
           volando y dejaba la cuerda atrás — o sea que se podía colgar un peso
           pero no había péndulo. Un amarre sujeta en todas las direcciones.

           ⚠ Y SE BUSCA EN LOS OCHO VECINOS, NO EN CUATRO. Con cuatro, la
           primera vez que el peso se movía UNA celda de lado quedaba en
           DIAGONAL del último eslabón — sujeto por la restricción, invisible
           para la búsqueda— y al paso siguiente nadie volvía a encontrarlo:
           se soltaba y caía al suelo con la cuerda intacta colgando arriba.
           El amarre se perdía justo en el instante en que empezaba a servir.
           Y se recorre `pos`, no `orden`: los eslabones YA se movieron en el
           paso 4, así que `orden` son las casillas donde ESTABAN. */
        /* ⚠ DE LA PUNTA HACIA EL AMARRE, no al revés. Recorriéndola desde
           arriba, un peso que sube pegado a la cuerda se iba «reamarrando» al
           eslabón de más arriba que tocara: se trepaba por la cuerda hasta el
           techo y se quedaba colgado del amarre con un eslabón de correa. Lo
           que uno amarra, lo amarra a la PUNTA. */
        for(let i = pos.length - 1; i >= 0; i--){
          const k = pos[i];
          const cx = k % an, cy = (k / an) | 0;
          for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++){
            if(!dx && !dy) continue;
            const nx = cx + dx, ny = cy + dy;
            if(nx < 0 || ny < 0 || nx >= an || ny >= al) continue;
            const k2 = ny * an + nx;
            if(t[k2] === VACIO || ES_CUERDA[t[k2]] || EL[t[k2]].fijo) continue;
            /* pegado: se amarra. A dos celdas: sólo si YA venía amarrado el
               paso pasado — eso es el nudo aguantando, no un imán */
            if(dx < -1 || dx > 1 || dy < -1 || dy > 1){
              if(this.nudo[k2] < this.paso_ - 1) continue;
            }
            if(this.estadoDe(k2) !== 'solido') continue;
            if(this.flotante[k2]) continue;            /* ya lo lleva otra cuerda */
            sop[k2] = 0; this.flotante[k2] = 1; this.nudo[k2] = this.paso_;
            this.gravedadEn(nx, ny, k2);
            this.vy[k2] = Math.max(-VMAX, Math.min(this.vy[k2] + this._gy, VMAX));
            this.vx[k2] = Math.max(-VMAX, Math.min(this.vx[k2] + this._gx, VMAX));
            this.arrastra(k2, EL[t[k2]]);
            this.tensa(k2, k, amarre, prof[i] + 1);   /* la carga se sujeta al último eslabón */
          }
        }
      }
    }
  }

  /* Mueve un eslabón hacia donde apunta su velocidad y luego lo obliga a
     seguir pegado a su padre. Esa corrección es la TENSIÓN. */
  tensa(k, padre, ancla = -1, alcance = 0){
    const { an } = this;
    /* devuelve DÓNDE QUEDÓ, para que el eslabón siguiente sepa dónde está su
       padre de verdad y no dónde estaba al empezar el paso */
    let x = k % an, y = (k / an) | 0;
    const px = padre % an, py = (padre / an) | 0;
    /* ⚠ Y ADEMÁS NO SE PUEDE ALEJAR DEL AMARRE MÁS QUE LA CUERDA QUE TIENE.
       Sin este tope el péndulo no subía nunca: la restricción con el padre se
       mide en celdas vecinas, y en una rejilla un paso en diagonal cuesta lo
       mismo que uno recto. O sea que diez eslabones «tensos» en diagonal
       alcanzan 14 celdas, no 10 — la cuerda se ESTIRA sola al torcerse. Con
       eso, el peso empujado se iba de lado a la misma altura, en línea recta,
       hasta quedarse sin impulso: no describía un arco porque no había nada
       que lo obligara a subir. El tope es la longitud real de la cuerda. */
    const ax0 = ancla >= 0 ? ancla % an : 0, ay0 = ancla >= 0 ? (ancla / an) | 0 : 0;
    /* medio celda de holgura: una rejilla no tiene puntos a distancia exacta 9,
       y sin ella el peso de un péndulo tenso se quedaba clavado —CUALQUIER
       casilla vecina se pasaba del tope por centésimas */
    const tope = (alcance + 0.5) * (alcance + 0.5);
    const lejosDelAmarre = (nx, ny) => ancla >= 0 &&
      (nx - ax0) * (nx - ax0) + (ny - ay0) * (ny - ay0) > tope;

    /* ── LA CUERDA TENSA MATA LA VELOCIDAD QUE APUNTA HACIA AFUERA ───────
       Esto es la tensión, y es lo que convierte una caída en un ARCO. Una
       cuerda estirada no puede empujar ni estirarse: lo único que hace es
       cancelar la parte de la velocidad que se aleja del amarre, y deja
       intacta la que va de lado. Lo que queda es exactamente la componente
       tangencial — o sea, la gravedad frenando al peso conforme sube y
       acelerándolo conforme baja, sin una sola línea que diga «péndulo».
       Y esa parte cancelada no se pierde: se la lleva el padre. Eso es que
       la cuerda TIRE de lo de arriba en vez de sólo aguantar lo de abajo. */
    if(ancla >= 0 && alcance > 0){
      const rx = x - ax0, ry = y - ay0;
      const d = Math.sqrt(rx * rx + ry * ry);
      if(d > 0.5 && d >= alcance - 0.5){
        const ux = rx / d, uy = ry / d;
        const rad = this.vx[k] * ux + this.vy[k] * uy;
        if(rad > 0){
          this.vx[k] -= rad * ux; this.vy[k] -= rad * uy;
          /* ⚠ Y EL TIRÓN AL PADRE VA POR EL TRAMO DE CUERDA, no en la
             dirección del amarre. Con la dirección del amarre, los eslabones
             que estaban justo debajo del clavo recibían un tirón hacia ABAJO
             —que es a donde apunta el radio ahí— y no se movían de lado
             nunca: el péndulo se columpiaba con la punta doblada como un
             látigo y los quince eslabones de arriba tiesos y verticales.
             Una cuerda tira a lo largo de sí misma, tramo por tramo. */
          const m1 = EL[this.t[k]].dens || 1, m2 = EL[this.t[padre]].dens || 1;
          const t2 = rad * m1 / (m1 + m2);
          const sx = x - px, sy = y - py, sl = Math.sqrt(sx * sx + sy * sy) || 1;
          this.vx[padre] = Math.max(-VMAX, Math.min(this.vx[padre] + t2 * sx / sl, VMAX));
          this.vy[padre] = Math.max(-VMAX, Math.min(this.vy[padre] + t2 * sy / sl, VMAX));
        }
      }
    }
    const dx = this.vx[k] > 0.35 ? 1 : this.vx[k] < -0.35 ? -1 : 0;
    const dy = this.vy[k] > 0.35 ? 1 : this.vy[k] < -0.35 ? -1 : 0;
    let kk = k, movido = false;
    if(dx || dy){
      /* primero en diagonal y si no cabe por separado: así una cuerda dobla
         en vez de quedarse trabada en una esquina */
      for(const [ax, ay] of [[dx, dy], [dx, 0], [0, dy]]){
        if(!ax && !ay) continue;
        if(Math.max(Math.abs(x + ax - px), Math.abs(y + ay - py)) > 1) continue;
        if(lejosDelAmarre(x + ax, y + ay)) continue;
        if(!this.dentro(x + ax, y + ay)) continue;
        const kd = this.i(x + ax, y + ay);
        if(kd === padre) continue;
        if(this.t[kd] !== VACIO){
          const ed = EL[this.t[kd]];
          const est = this.estadoDe(kd);
          if(est === 'solido' || est === 'polvo' || ed.fijo) continue;
          if((ed.dens || 0) >= (EL[this.t[kk]].dens || 1)) continue;
        }
        this.intercambia(kk, kd);
        kk = kd; x = kk % an; y = (kk / an) | 0;
        movido = true;
        break;
      }
    }
    const bloqueado = (dx || dy) && !movido;
    const lejos = Math.max(Math.abs(x - px), Math.abs(y - py)) > 1;
    if(lejos){
      /* quedó lejos: la cuerda TIRA de él */
      let mejor = -1, mejorD = 1e9;
      for(let ddy = -1; ddy <= 1; ddy++) for(let ddx = -1; ddx <= 1; ddx++){
        if(!ddx && !ddy) continue;
        const nx = px + ddx, ny = py + ddy;
        if(!this.dentro(nx, ny)) continue;
        const kd = this.i(nx, ny);
        if(kd === kk){ mejor = -1; break; }
        if(this.t[kd] !== VACIO){
          const est = this.estadoDe(kd);
          if(est === 'solido' || est === 'polvo' || EL[this.t[kd]].fijo) continue;
        }
        const d = (nx - x) * (nx - x) + (ny - y) * (ny - y);
        if(d < mejorD){ mejorD = d; mejor = kd; }
      }
      if(mejor >= 0){ this.intercambia(kk, mejor); kk = mejor; }
    }
    /* ── EL TIRÓN VIAJA HACIA ARRIBA ────────────────────────────────────
       Y aquí estaba el péndulo que no era péndulo. Con la restricción sola,
       el peso quedaba SUJETO —eso ya funcionaba— pero la cuerda ni se
       enteraba: el peso empujado se iba a la casilla de al lado, la
       restricción le negaba la siguiente, y ahí se quedaba clavado para
       siempre con la cuerda perfectamente vertical arriba. Un peso colgado
       tieso a 45°, que es lo único que no hace un péndulo.

       Una cuerda no sólo IMPIDE: TRANSMITE. Si el hijo no pudo ir a donde
       iba, esa velocidad no se evapora — tira del padre. Se reparte como un
       choque perfectamente inelástico (los dos hacia su velocidad común,
       pesados por la densidad), que es lo que conserva la cantidad de
       movimiento: un peso pesado arrastra a la cuerda ligera casi entera, y
       una cuerda gruesa apenas se inmuta con algo liviano colgando.
       El amarre no cuenta: su velocidad se pone en cero cada paso, así que
       absorbe el tirón — que es exactamente lo que hace un clavo. */
    /* ⚠ Y SÓLO SI LA RESTRICCIÓN DE VERDAD LE ESTORBÓ. Antes bastaba con que
       no se hubiera movido, y eso incluye el caso más común de todos: que la
       velocidad no llegue a una celda entera. O sea que un péndulo lento
       repartía su velocidad con la cuerda en CADA paso y se paraba en tres
       oscilaciones — un rozamiento inventado, disfrazado de tensión. */
    if(bloqueado || lejos){
      const m1 = EL[this.t[kk]].dens || 1, m2 = EL[this.t[padre]].dens || 1;
      const suma = m1 + m2, acopla = 0.55;
      const cx = (m1 * this.vx[kk] + m2 * this.vx[padre]) / suma;
      const cy = (m1 * this.vy[kk] + m2 * this.vy[padre]) / suma;
      this.vx[kk] += acopla * (cx - this.vx[kk]);
      this.vy[kk] += acopla * (cy - this.vy[kk]);
      this.vx[padre] = Math.max(-VMAX, Math.min(this.vx[padre] + acopla * (cx - this.vx[padre]), VMAX));
      this.vy[padre] = Math.max(-VMAX, Math.min(this.vy[padre] + acopla * (cy - this.vy[padre]), VMAX));
    }
    return kk;
  }

  /* ── EL GLOBO ─────────────────────────────────────────────────────────
     Carlos: «el helio no permite crear globos porque no tienen física los
     sólidos». Darles física no bastaba, y esto costó entenderlo: con el
     empuje aplicado celda a celda, el helio levantaba SÓLO el trozo de techo
     que tenía encima y salía volando el techo sin el globo. Un globo vuela
     porque es UNA pieza y porque el gas de DENTRO cuenta — no el que roza la
     tela por arriba.

     Así que aquí se busca la cáscara entera como componente conectado, se
     averigua qué encierra, y se pesa el conjunto contra el aire que desplaza:

       peso     = Σ densidad de la cáscara + Σ densidad de lo que encierra
       desplaza = (celdas de cáscara + celdas encerradas) × densidad del aire

     Si desplaza más de lo que pesa, sube. Y de ahí sale solo que el mismo
     globo lleno de helio vuele, lleno de aire se quede y lleno de CO₂ se
     hunda, sin una línea para cada caso. También sale que haga falta una tela
     LIGERA: con madera no vuela, igual que en la vida real.

     Sólo se analizan las cáscaras que tocan un gas más ligero que el aire.
     Sin ese filtro habría que recorrer cada muro del mundo por si acaso. */
  globoPaso(){
    const { an, al, t, sop } = this;
    this.flotante.fill(0);
    const visto = this._visto;
    visto.fill(0);
    const cola = this._cola;
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k0 = y * an + x;
        if(visto[k0] || !this.esSolido(k0) || EL[t[k0]].fijo) continue;
        /* ¿toca un gas más ligero que el aire? si no, ni lo miramos */
        if(!this.tocaGasLigero(x, y)) continue;
        /* componente conectado */
        let cab = 0, fin = 0;
        cola[fin++] = k0; visto[k0] = 1;
        let x0 = x, x1 = x, y0 = y, y1 = y, peso = 0, celdas = 0;
        while(cab < fin){
          const k = cola[cab++];
          const cx = k % an, cy = (k / an) | 0;
          if(cx < x0) x0 = cx; if(cx > x1) x1 = cx;
          if(cy < y0) y0 = cy; if(cy > y1) y1 = cy;
          peso += EL[t[k]].dens || 1; celdas++;
          if(celdas > 4000) break;                 /* una cáscara sensata */
          if(cx > 0      && !visto[k-1]  && this.esSolido(k-1)  && !EL[t[k-1]].fijo){  visto[k-1]  = 1; cola[fin++] = k-1; }
          if(cx < an - 1 && !visto[k+1]  && this.esSolido(k+1)  && !EL[t[k+1]].fijo){  visto[k+1]  = 1; cola[fin++] = k+1; }
          if(cy > 0      && !visto[k-an] && this.esSolido(k-an) && !EL[t[k-an]].fijo){ visto[k-an] = 1; cola[fin++] = k-an; }
          if(cy < al - 1 && !visto[k+an] && this.esSolido(k+an) && !EL[t[k+an]].fijo){ visto[k+an] = 1; cola[fin++] = k+an; }
        }
        if(celdas < 4 || celdas > 4000) continue;
        /* lo que ENCIERRA: se inunda desde fuera de su caja y lo que no se
           moja por dentro es lo de dentro */
        const enc = this.encerradas(x0, y0, x1, y1, visto);
        peso += enc.peso;
        const total = celdas + enc.celdas;
        const desplaza = total * DENS_AIRE;
        if(desplaza <= peso) continue;             /* pesa más que el aire: no vuela */
        const sube = GRAVEDAD * (desplaza - peso) / peso;

        /* ⚠ UN GLOBO SE MUEVE COMO UNA PIEZA, Y AQUÍ ESTABA EL DEFECTO. Yo le
           ponía velocidad a cada celda de la cáscara por su cuenta… y la
           cáscara no es rígida: las celdas de ABAJO subían hacia el interior
           —el helio es menos denso, así que las deja pasar— y el globo se
           IMPLOSIONABA en vez de subir. Medido: empezaba en y=60 y acababa en
           y=68, o sea que se hundía, con el balance de flotación saliendo
           correcto (desplaza 118.8, pesa 101.3).
           Ahora el impulso se acumula en la pieza entera y, cuando junta una
           celda completa, se mueve TODO —cáscara y lo que encierra— o no se
           mueve nada. Eso es lo que separa un cuerpo de un montón de píxeles
           que casualmente están juntos. */
        let vy = this.vy[cola[0]] - sube;
        if(vy < -VMAX) vy = -VMAX;
        /* ⚠ Y SI SE MOVIÓ, LAS CELDAS YA NO ESTÁN DONDE DICE `cola`. La marca
           se ponía en las casillas de ANTES del movimiento —que ya son aire—
           y las de verdad se quedaban sin marcar: 9 de las 36 celdas de un
           globo, medido. No se notaba mientras nadie más mirara esa marca,
           pero en cuanto los cuerpos rígidos empezaron a recoger «lo que no
           está marcado», esas nueve se iban por su cuenta y el globo se
           deshacía en el aire: subía cuatro celdas y acababa en el suelo.
           Otra vez la casilla confundida con la cosa, y otra vez el disfraz
           fue un índice guardado antes de mover. */
        let corr = 0;
        if(vy <= -1){
          if(this.mueveGlobo(cola, fin, enc.celdasLista, -1)){ vy += 1; corr = -an; }
          else vy = 0;                             /* topó con algo */
        }
        for(let i = 0; i < fin; i++){
          const k = cola[i] + corr;
          this.vy[k] = vy; this.vx[k] = 0;
          this.suelto[k] = 1; sop[k] = 0;
          /* el balance de esta pieza ya está hecho AQUÍ, con su peso y lo que
             encierra. Si `mueve` le volviera a sumar la gravedad por celda,
             estaría contando dos veces y ningún globo despegaría. */
          this.flotante[k] = 1;
        }
        for(const k of enc.celdasLista) this.flotante[k + corr] = 1;
      }
    }
  }

  /* ── CUERPOS RÍGIDOS ────────────────────────────────────────────────────
     Carlos: «los sólidos se tratan como partículas al caer o agarrarlos, en
     lugar de unirse con las del mismo tipo y volverse un solo cuerpo, si me
     entiendes». Sí: una piedra de veinte celdas caía como veinte piedras de
     una celda, se deshilachaba al chocar y al agarrarla con la mano se estiraba
     como plastilina. Cada celda hacía su propia física y el objeto no existía
     en ninguna parte.

     Lo que se junta en un cuerpo son celdas PEGADAS y del MISMO material —eso
     lo dijo él— o soldadas a mano con la herramienta de estructura, que es lo
     que resuelve la otra mitad de su encargo: «si uno varios tipos de
     materiales en una sola estructura, como una pistola que incluye muchos
     materiales, poder decidirlo».

     Y sólo se agrupa lo que está EN MOVIMIENTO —lo que no se sostiene o va
     lanzado—, por dos razones que valen igual: una torre quieta no necesita
     saberse un cuerpo para no moverse, y recorrer los sólidos del mundo entero
     cada paso cuesta lo que no hay en un teléfono.

     El interruptor `rigido` lo apaga y se vuelve al grano por grano, que
     también lo pidió por su nombre. */
  cuerpoPaso(){
    if(!this.rigido) return;
    const { an, al, t, sop } = this;
    const visto = this._vistoCuerpo;
    visto.fill(0);
    this.enCuerpo.fill(0);
    const cola = this._colaCuerpo;
    /* ⚠ SE JUNTA LO QUE SE TOCA, NO SÓLO LO DEL MISMO MATERIAL. Empecé por
       «mismo tipo», que es lo que Carlos escribió, y rompió cinco pruebas de
       golpe: el cohete quedaba partido en DOS cuerpos —la carcasa de metal por
       un lado y la válvula por otro— y cada uno se movía por su cuenta, así
       que un recipiente cerrado y sin gravedad se propulsaba solo seis celdas
       y media. Una caja con una válvula en la pared es UN objeto; separarla
       porque son materiales distintos crea fuerza de la nada.
       Lo del mismo tipo sí se cumple —es un caso particular de tocarse— y lo
       de «poder decidirlo» lo da la soldadura: un número de estructura marca
       qué celdas van juntas y CUÁLES NO, aunque estén pegadas. Eso es lo que
       permite montar una pistola de muchos materiales y que el proyectil no
       forme parte del cañón. */
    const juntos = (k, k2) => {
      if(t[k2] === VACIO || EL[t[k2]].fijo) return false;
      if(this.estadoDe(k2) !== 'solido') return false;
      return this.soldado[k] === this.soldado[k2];
    };
    /* ⚠ Y SOSTENIDO ES SOSTENIDO AUNQUE LE HAYAN PEGADO. La primera versión
       entraba también con `suelto`, que sólo quiere decir «algo la golpeó», y
       con eso una viga EMPOTRADA se convertía en cuerpo libre al primer
       empujón y se iba entera: el refuerzo de acero pasó de aguantar sin
       perder una celda a perder doce. Se copia la misma condición que usa el
       movimiento celda a celda —hace falta velocidad de verdad, no una marca—
       para que anclado y lanzado signifiquen lo mismo en los dos sitios. */
    /* ⚠ EL ORDEN DE ESTAS CINCO LÍNEAS SON CINCO MILISEGUNDOS. Se pregunta
       por celda en las 153 600 de una sala, así que lo barato va primero: casi
       todas están vacías, y de las que no, casi todas están sostenidas y
       quietas. `estadoDe` es una llamada y se deja para el final, cuando ya
       sólo quedan las pocas que de verdad se mueven. Puesto al revés costaba
       23.6 ms por paso; puesto así, 21.3 — medido, no estimado. */
    const enMarcha = k => {
      if(t[k] === VACIO) return false;
      if(this.flotante[k]) return false;
      if(sop[k] && !(this.vy[k] < -0.35 || this.vx[k] > 0.35 || this.vx[k] < -0.35)) return false;
      if(EL[t[k]].fijo) return false;
      return this.estadoDe(k) === 'solido';
    };

    for(let k0 = 0; k0 < t.length; k0++){
      if(visto[k0] || !enMarcha(k0)) continue;
      let cab = 0, fin = 0;
      cola[fin++] = k0; visto[k0] = 1;
      while(cab < fin){
        const k = cola[cab++], x = k % an, y = (k / an) | 0;
        const mete = k2 => { if(!visto[k2] && enMarcha(k2) && juntos(k, k2)){ visto[k2] = 1; cola[fin++] = k2; } };
        if(x > 0)      mete(k - 1);
        if(x < an - 1) mete(k + 1);
        if(y > 0)      mete(k - an);
        if(y < al - 1) mete(k + an);
        if(fin > cola.length - 4) break;
      }
      if(fin < 2) continue;            /* una celda suelta ya la lleva `mueve` */

      /* la velocidad del cuerpo es la de su centro de masa: así un trozo que
         recibe un empujón en una esquina arrastra al resto en vez de arrancarse */
      let masa = 0, svy = 0, svx = 0, sx = 0, sy = 0;
      for(let i = 0; i < fin; i++){
        const k = cola[i], m = EL[t[k]].dens || 1;
        masa += m; svy += this.vy[k] * m; svx += this.vx[k] * m;
        sx += k % an; sy += (k / an) | 0;
      }
      let vy = svy / masa, vx = svx / masa;
      const cx = Math.round(sx / fin), cy = Math.round(sy / fin);
      /* ── LA PRESIÓN SE LE APLICA A LA PIEZA, NO A CADA CELDA ────────────
         Y ésta era la última que faltaba para que un recipiente cerrado no se
         moviera solo. Repartir la fuerza celda a celda y luego promediar NO da
         lo mismo: cada celda dividía por SU masa, y esa división lleva dentro
         un `max(0.35, …)` que aplasta a las ligeras. Con eso, en una carcasa
         de dos materiales las fuerzas de arriba y de abajo dejaban de
         cancelarse, y un bote sellado y sin gravedad se propulsaba dos celdas.
         Sumar primero las fuerzas y dividir DESPUÉS entre la masa total es la
         segunda ley aplicada a un cuerpo, y con ella un recipiente cerrado da
         cero exacto sin que nadie se lo pida — mientras que abrirle una boca
         rompe la simetría y ahí sí sale disparado. */
      /* ⚠ Y ES LA PRESIÓN SOBRE LA CARA, NO EL GRADIENTE. Lo escribí primero
         copiando la fórmula de `empuja` —«me empujan hacia donde hay menos»— y
         salió el signo al revés: el bote cerrado pasó de subirse dos celdas
         solo a BAJARSE dos. Y estaba mal por una razón de fondo: esa fórmula
         describe a la celda que TIENE la presión, o sea al gas. Un sólido no
         se mueve porque él tenga presión, se mueve porque el fluido de al lado
         empuja su cara. Así que se recorre el contorno de la pieza y cada cara
         mojada suma la presión del fluido que la toca, en dirección contraria
         a ese fluido. Con eso una carcasa cerrada da CERO exacto —cada cara de
         arriba tiene su gemela abajo— y abrirle una boca quita la cara que
         cancelaba: de ahí sale el empuje, sin una línea que diga «cohete». */
      let fx = 0, fy = 0;
      for(let i = 0; i < fin; i++){
        const k = cola[i], x = k % an, y = (k / an) | 0;
        for(const [ddx, ddy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          if(!this.dentro(x+ddx, y+ddy)) continue;
          const k2 = this.i(x+ddx, y+ddy);
          if(visto[k2]) continue;                  /* cara interna de la pieza */
          if(t[k2] !== VACIO && this.estadoDe(k2) === 'solido') continue;
          const p2 = this.pres[k2];
          if(p2 > -3 && p2 < 3) continue;
          fx -= ddx * p2; fy -= ddy * p2;
        }
      }
      /* la misma escala que usa `empuja` celda a celda: allí la masa entra
         como dens·0.12, así que aquí entra como masa total·0.12. Sin ese 0.12
         la pieza pesaba ocho veces de más y el cohete apenas se despegaba. */
      vy += (fy / (masa * 0.12)) * 0.016;
      vx += (fx / (masa * 0.12)) * 0.016;
      this.gravedadEn(cx, cy, cola[0]);
      const dens = masa / fin;
      const f = 1 - DENS_AIRE / (dens || 1);
      vy = Math.max(-VMAX, Math.min(vy + this._gy * f, VMAX));
      vx = Math.max(-VMAX, Math.min(vx + this._gx * f, VMAX));
      /* el rozamiento del aire lo siente la PIEZA, no cada celda: por eso una
         plancha grande y una piedrita del mismo material caen distinto */
      const c = 0.5 * DENS_AIRE / (dens > 0.05 ? dens : 0.05) / Math.sqrt(fin);
      if(vy > 0.02 || vy < -0.02) vy -= c * vy * Math.abs(vy);
      if(vx > 0.02 || vx < -0.02) vx -= c * vx * Math.abs(vx);

      /* ⚠ LAS CELDAS YA NO ESTÁN DONDE DICE LA LISTA EN CUANTO SE MUEVE UNA
         VEZ, y esto es lo que Carlos vio y nombró perfecto: «tus sólidos caen
         por LÁMINAS en lugar de unirse en un solo objeto». Un bloque de 6 000
         celdas cayendo se partía en tres, seis, ocho trozos — barras
         horizontales con huecos negros entre ellas, exactamente eso.

         La causa: `lista` guarda ÍNDICES, y a velocidad de dos celdas por
         cuadro el bucle movía dos veces. La primera movía la pieza; la segunda
         seguía usando los índices de ANTES, que ya no apuntan a la piedra sino
         a lo que quedó ahí. O sea que el segundo empujón movía a otra gente:
         la pieza se cortaba en capas y se desfasaba.

         Es la TERCERA vez en este archivo que un índice guardado antes de
         mover se convierte en un bicho: la cuerda, el globo y ahora esto. Y
         las tres veces se disfrazó de otra cosa —tieso, hundido, en láminas—
         sin parecerse nunca a «índice viejo». */
      let lista = cola.slice(0, fin);
      const corre = (dx, dy) => {
        if(!this.mueveCuerpo(lista, dx, dy)) return false;
        const salto = dy * an + dx;
        for(let i = 0; i < lista.length; i++) lista[i] += salto;
        return true;
      };
      let pasos = this.pasosDe(Math.abs(vy)); const dy = vy > 0 ? 1 : -1;
      for(let i = 0; i < pasos; i++) if(!corre(0, dy)){ vy = 0; break; }
      pasos = this.pasosDe(Math.abs(vx)); const dx = vx > 0 ? 1 : -1;
      for(let i = 0; i < pasos; i++) if(!corre(dx, 0)){ vx = 0; break; }
      for(const k of lista){
        this.vy[k] = vy; this.vx[k] = vx;
        this.flotante[k] = 1;          /* ya se movió como pieza: `mueve` no lo toca */
        this.suelto[k] = 1;
        this.enCuerpo[k] = 1;          /* y que `empuja` no la empuje otra vez */
      }
    }
  }

  /* ── SOLDAR UNA ESTRUCTURA ──────────────────────────────────────────────
     Carlos: «si uno varios tipos de materiales en una sola estructura, como
     una pistola que incluye muchos materiales, poder decidirlo, y así para
     hacer más estructuras».

     Desde que lo que se toca ya forma un cuerpo, soldar no sirve para PEGAR:
     sirve para SEPARAR y para que la separación aguante. Al tocar una pieza se
     le pone un número de estructura propio, y a partir de ahí sólo es una
     pieza con lo que lleve ese mismo número — aunque esté pegada a otra cosa.
     Eso es lo que permite que una pistola sea una pistola y que el proyectil
     que tiene dentro NO forme parte del cañón: sin esto, apuntar y disparar
     movería el arma entera con la bala pegada.

     Devuelve cuántas celdas quedaron en la estructura, para que la pantalla
     pueda decir qué se soldó en vez de no decir nada. */
  suelda(x, y, r = 2, grupo = 0){
    /* ⚠ SE PINTA, NO SE CONTAGIA. La primera versión inundaba desde el toque
       por todo lo que estuviera pegado, y con eso era imposible hacer lo único
       para lo que sirve: en una pistola con un proyectil DENTRO, el flood se
       llevaba el proyectil al mismo grupo que el cañón. Si la estructura la
       decide el contacto, no la decide el jugador — y él pidió literalmente
       «poder decidirlo». Así que se marca con la brocha, arrastrando encima de
       lo que uno quiere que sea una pieza. */
    const g = grupo || ++this.soldadoN;
    let n = 0;
    for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){
      if(dx * dx + dy * dy > r * r) continue;
      if(!this.dentro(x + dx, y + dy)) continue;
      const k = this.i(x + dx, y + dy);
      if(this.t[k] === VACIO || EL[this.t[k]].fijo) continue;
      if(this.estadoDe(k) !== 'solido') continue;
      if(this.soldado[k] === g) continue;
      this.soldado[k] = g; n++;
    }
    this.soldadoUltimo = g;
    return n;
  }

  /* Y deshacerlo: la estructura vuelve a ser lo que toque. */
  dessuelda(x, y){
    if(!this.dentro(x, y)) return 0;
    const k0 = this.i(x, y);
    const g = this.soldado[k0];
    if(!g) return 0;
    let n = 0;
    for(let k = 0; k < this.soldado.length; k++) if(this.soldado[k] === g){ this.soldado[k] = 0; n++; }
    return n;
  }

  /* Mueve un cuerpo entero una celda, o ninguna. Es la misma ley que la del
     globo —todos los destinos libres o propios, y si no, no se mueve— pero en
     cualquier dirección y devolviendo si cupo, que es lo que convierte «no
     cabe» en un choque en vez de en una deformación. */
  mueveCuerpo(lista, dx, dy){
    const { an, al } = this;
    const mios = new Set(lista);
    for(const k of lista){
      const x = k % an, y = (k / an) | 0;
      const nx = x + dx, ny = y + dy;
      if(nx < 0 || ny < 0 || nx >= an || ny >= al) return false;
      const kd = ny * an + nx;
      if(mios.has(kd)) continue;
      if(this.t[kd] === VACIO) continue;
      const ed = EL[this.t[kd]];
      if(ed.fijo) return false;
      const est = this.estadoDe(kd);
      if(est === 'solido' || est === 'polvo') return false;
      /* un fluido más denso que la pieza tampoco se aparta: por eso un corcho
         no se hunde y una piedra sí */
      if((ed.dens || 0) >= (EL[this.t[lista[0]]].dens || 1)) return false;
    }
    /* el orden importa: se empieza por el borde que avanza, o una celda pisa a
       la siguiente antes de que ésta se haya quitado */
    const orden = lista.slice().sort((a, b) => {
      const ax = a % an, ay = (a / an) | 0, bx = b % an, by = (b / an) | 0;
      return (bx * dx + by * dy) - (ax * dx + ay * dy);
    });
    for(const k of orden){
      const x = k % an, y = (k / an) | 0;
      const kd = (y + dy) * an + (x + dx);
      if(kd === k) continue;
      this.intercambia(k, kd);
    }
    return true;
  }

  /* Mueve una pieza entera una celda en vertical, o ninguna. Primero se
     comprueba que TODOS los destinos estén libres —o sean de la propia
     pieza—, y sólo entonces se mueve. Un cuerpo no se mueve a trozos. */
  mueveGlobo(cola, fin, dentro, dy){
    const { an } = this;
    const mios = new Set();
    for(let i = 0; i < fin; i++) mios.add(cola[i]);
    for(const k of dentro) mios.add(k);
    const lista = [...mios];
    /* ¿cabe? */
    for(const k of lista){
      const y = (k / an) | 0, x = k % an;
      const ny = y + dy;
      if(ny < 0 || ny >= this.al) return false;
      const kd = this.i(x, ny);
      if(mios.has(kd)) continue;                   /* se mete en su propio sitio */
      if(this.t[kd] === VACIO) continue;
      const ed = EL[this.t[kd]];
      if(ed.fijo) return false;
      const est = this.estadoDe(kd);
      if(est === 'solido' || est === 'polvo') return false;
      if((ed.dens || 0) >= 1.2) return false;      /* un fluido más pesado que el aire no se aparta */
    }
    /* se mueve en el orden correcto: hacia arriba, primero los de arriba */
    lista.sort((a, b) => dy < 0 ? a - b : b - a);
    for(const k of lista){
      const y = (k / an) | 0, x = k % an;
      const kd = this.i(x, y + dy);
      if(kd === k) continue;
      this.intercambia(k, kd);
    }
    return true;
  }

  tocaGasLigero(x, y){
    for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
      if(!this.dentro(x+dx, y+dy)) continue;
      const k = this.i(x+dx, y+dy);
      if(this.t[k] === VACIO) continue;
      if(this.estadoDe(k) !== 'gas') continue;
      if((EL[this.t[k]].dens || 0) < DENS_AIRE) return true;
    }
    return false;
  }

  /* Lo que queda ATRAPADO dentro de una cáscara: se inunda desde el borde de
     su caja y lo que el agua no alcanza es el interior. */
  encerradas(x0, y0, x1, y1, visto){
    const { an, t } = this;
    const w = x1 - x0 + 3, h = y1 - y0 + 3;
    const fuera = new Uint8Array(w * h);
    const pila = this._cola2;
    let n = 0;
    const meter = (ix, iy) => {
      if(ix < 0 || iy < 0 || ix >= w || iy >= h) return;
      const p = iy * w + ix;
      if(fuera[p]) return;
      const gx = x0 - 1 + ix, gy = y0 - 1 + iy;
      if(gx >= 0 && gy >= 0 && gx < this.an && gy < this.al){
        const k = gy * an + gx;
        if(visto[k]) return;                      /* la cáscara corta el paso */
      }
      fuera[p] = 1; pila[n++] = p;
    };
    for(let ix = 0; ix < w; ix++){ meter(ix, 0); meter(ix, h-1); }
    for(let iy = 0; iy < h; iy++){ meter(0, iy); meter(w-1, iy); }
    while(n > 0){
      const p = pila[--n];
      const ix = p % w, iy = (p / w) | 0;
      meter(ix-1, iy); meter(ix+1, iy); meter(ix, iy-1); meter(ix, iy+1);
    }
    let peso = 0, celdas = 0;
    const celdasLista = [];
    for(let iy = 1; iy < h - 1; iy++){
      for(let ix = 1; ix < w - 1; ix++){
        if(fuera[iy * w + ix]) continue;
        const gx = x0 - 1 + ix, gy = y0 - 1 + iy;
        if(gx < 0 || gy < 0 || gx >= this.an || gy >= this.al) continue;
        const k = gy * an + gx;
        if(visto[k]) continue;                    /* la cáscara misma ya se contó */
        peso += EL[t[k]].dens || 1; celdas++;
        celdasLista.push(k);
      }
    }
    return { peso, celdas, celdasLista };
  }


  /* ── QUÉ GRAVEDAD SE SIENTE EN ESTA CELDA ─────────────────────────────
     Suma vectorial, que es lo que Carlos pidió textualmente: «preferiblemente
     utilizar vectores y suma de fuerzas para que los campos puedan interactuar
     de manera coherente».

     El orden de prioridad, y es el que él listó:
       1 · se parte del campo global
       2 · una zona con modo `reemplaza` lo sustituye; con `suma`, se suma
       3 · los puntos gravitatorios se suman siempre, con caída 1/d²
       4 · el multiplicador propio de la celda escala el resultado

     Devuelve celdas/paso². Para hablar en m/s² están `aCeldas` y `aMetros`. */
  /* ⚠ ESCRIBE EN DOS CAMPOS Y NO DEVUELVE UN ARREGLO. Devolver `[gx, gy]` se
     lee mucho mejor, y es un arreglo nuevo por cada celda que se mueve sesenta
     veces por segundo: la misma basura que este archivo evita desde su primera
     línea al no usar un objeto por celda. Feo, y es lo que corre.

     ⚠ Y UNA CORRECCIÓN MÍA, porque el error estuvo a punto de quedarse escrito
     aquí como si fuera un dato: creí ver una regresión de 12.6 a 19.2 ms al
     meter el campo, y NO EXISTÍA. Los 12.6 eran de antes de que se reiniciara
     el contenedor, o sea de otra máquina. Medido el mismo día contra el commit
     anterior, tres corridas cada uno: 19.6/19.1/20.0 con el campo y
     18.7/19.7/20.3 sin él. El campo no cuesta nada medible.
     La lección no es sobre gravedad: un número de rendimiento sólo vale
     comparado contra el otro CORRIDO EL MISMO DÍA en la MISMA máquina. */
  gravedadEn(x, y, k){
    /* camino rápido: sin zonas, sin puntos y sin gravedad propia, que es el
       caso de siempre, esto es leer dos números */
    if(this._gSimple && this.gmul[k] === 1){
      this._gx = this.gGlobal.x; this._gy = this.gGlobal.y;
      return;
    }
    let gx = this.gGlobal.x, gy = this.gGlobal.y;
    for(const z of this.zonas){
      if(!z.activa) continue;
      if(x < z.x0 || x > z.x1 || y < z.y0 || y > z.y1) continue;
      if(z.modo === 'reemplaza'){ gx = z.gx; gy = z.gy; }
      else { gx += z.gx; gy += z.gy; }
    }
    for(const p of this.puntos){
      if(!p.activa) continue;
      const dx = p.x - x, dy = p.y - y;
      const d2 = dx*dx + dy*dy;
      if(d2 < 0.5 || d2 > p.radio * p.radio) continue;
      const d = Math.sqrt(d2);
      /* 1/d² como la de verdad, y con un suelo para que no se dispare al
         acercarse al centro y mande una partícula al otro lado del mundo */
      const f = (p.atrae ? 1 : -1) * p.fuerza * (p.radio * p.radio) / (d2 * 40);
      gx += (dx / d) * f; gy += (dy / d) * f;
    }
    const m = this.gmul[k];
    if(m !== 1){ gx *= m; gy *= m; }
    this._gx = gx; this._gy = gy;
  }

  /* Se recalcula cuando cambia algo del campo, no en cada consulta. */
  revisaCampo(){
    this._gSimple = this.zonas.length === 0 && this.puntos.length === 0;
  }

  /* Las herramientas de la pantalla se apoyan en esto, y devuelven lo que
     crearon para poder quitarlo o apagarlo después. */
  zonaGravedad(x0, y0, x1, y1, gxMs2, gyMs2, modo = 'reemplaza'){
    const z = {
      x0: Math.min(x0,x1), y0: Math.min(y0,y1), x1: Math.max(x0,x1), y1: Math.max(y0,y1),
      gx: aCeldas(gxMs2), gy: aCeldas(gyMs2), modo, activa: true,
    };
    this.zonas.push(z);
    this.revisaCampo();
    return z;
  }
  puntoGravedad(x, y, fuerzaMs2, radio, atrae = true){
    const p = { x, y, fuerza: aCeldas(fuerzaMs2), radio, atrae, activa: true };
    this.puntos.push(p);
    this.revisaCampo();
    return p;
  }
  ponGravedadGlobal(gxMs2, gyMs2){
    this.gGlobal = { x: aCeldas(gxMs2), y: aCeldas(gyMs2) };
  }
  /* gravedad propia de un trozo de materia, pintada con brocha */
  pintaGravedad(x, y, r, mult){
    for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){
      if(dx*dx + dy*dy > r*r + r) continue;
      if(!this.dentro(x+dx, y+dy)) continue;
      this.gmul[this.i(x+dx, y+dy)] = mult;
    }
  }

  /* ── LA MANO ──────────────────────────────────────────────────────────
     Carlos: «quiero una herramienta para poder mover los sólidos con físicas
     como si los arrastrara», y con la condición explícita de que «el arrastre
     debe aplicar una FUERZA al objeto, no simplemente cambiar su posición».

     Así que no hay teletransporte ni se escribe una posición. Se agarra lo que
     hay alrededor del punto de agarre y se le aplica una fuerza hacia el dedo,
     dividida por su densidad — que es F = m·a despejada. De ahí salen solas
     las cuatro cosas que pidió, sin programar ninguna:

       · lo pesado cuesta: el osmio recibe la misma fuerza y menos aceleración
       · lo atorado no cede: la fuerza se aplica, pero el movimiento lo decide
         `mueve`, que sigue chocando con lo que haya
       · no atraviesa nada, porque no se mueve por su cuenta: pide sitio
       · al soltarlo sigue con su velocidad, porque la velocidad es suya

     El punto de agarre persigue al MATERIAL, no al dedo. Por eso un bloque
     pesado se queda atrás y se siente el peso en la mano.

     Devuelve cuántas celdas agarró, para que la pantalla sepa si enganchó. */
  agarra(cx, cy, fx, fy, r = 4){
    const { an, t } = this;
    /* ── 1. LO QUE CAE BAJO LA BROCHA ─────────────────────────────────── */
    const semilla = [];
    const rr = r * r + r;
    for(let dy = -r; dy <= r; dy++){
      for(let dx = -r; dx <= r; dx++){
        if(dx*dx + dy*dy > rr) continue;
        const x = Math.round(cx) + dx, y = Math.round(cy) + dy;
        if(!this.dentro(x, y)) continue;
        const k = this.i(x, y);
        if(t[k] === VACIO) continue;
        if(EL[t[k]].fijo) continue;                /* el muro no se arrastra */
        const est = this.estadoDe(k);
        if(est !== 'solido' && est !== 'polvo') continue;
        semilla.push(k);
      }
    }
    if(!semilla.length) return { n:0, cx, cy };
    let sx = 0, sy = 0;
    for(const k of semilla){ sx += k % an; sy += (k / an) | 0; }
    const gx = sx / semilla.length, gy = sy / semilla.length;

    /* ── 2. Y LA PIEZA ENTERA A LA QUE PERTENECE ──────────────────────────
       ⚠ AQUÍ ESTABA EL BUG QUE CARLOS REPORTÓ COMO «la manita de agarrar no
       agarra nada», y no se veía leyendo porque la mano SÍ aplicaba su fuerza:
       lo hacía sobre un mordisco redondo del objeto. Desde que existen los
       cuerpos rígidos, esas celdas mordidas formaban un cuerpo aparte — las
       de fuera del círculo conservaban su sostén y no entraban— y el cuerpo
       chocaba contra el resto de SU PROPIA PIEDRA. `mueveCuerpo` devolvía
       falso, la velocidad se ponía a cero, y el bloque no se movía ni una
       celda por mucho que se tirara de él. Medido en navegador: 104 tirones
       seguidos, 31 celdas agarradas cada vez, cero movimiento.

       Una mano no agarra un círculo de piedra: agarra LA PIEDRA. Así que se
       crece desde la brocha por la misma regla con la que `cuerpoPaso` junta
       un cuerpo —pegadas, sólidas, de la misma estructura soldada— y la
       fuerza se le aplica a la pieza completa.

       El polvo no crece: la arena no es una pieza, y arrastrar un grano no
       puede llevarse el montón entero. */
    const pieza = this.piezaDe(semilla);

    /* ── 3. LA SEGUNDA LEY, UNA VEZ PARA TODA LA PIEZA ────────────────────
       La fuerza la hacen las celdas que la mano toca; la masa que se resiste
       es la de la pieza ENTERA. De ahí salen solas las dos cosas que pidió
       Carlos sin programar ninguna: lo pesado cuesta, y agarrar la punta de
       una viga larga cuesta más que agarrar una piedrita — porque la fuerza
       es la del puño y la masa es la del objeto. */
    let masa = 0;
    for(const k of pieza) masa += EL[t[k]].dens || 1;
    if(masa < 0.2) masa = 0.2;
    let fX = 0, fY = 0;
    for(const k of semilla){
      const x = k % an, y = (k / an) | 0;
      fX += (fx - x) * PUÑO; fY += (fy - y) * PUÑO;
    }
    /* ⚠ Y UN MUELLE SIN AMORTIGUAR NO ES UNA MANO, ES UNA CATAPULTA. Con
       sólo la fuerza de arriba, la primera prueba en navegador mandó el
       bloque de la celda 134 a la 2 —hasta la pared de enfrente— tirando de
       él quince celdas: la fuerza se sumaba cada cuadro y la velocidad no
       tenía con qué bajar. Un brazo de verdad también FRENA lo que arrastra,
       y ese freno es lo que hace que el objeto persiga al dedo en vez de
       salir disparado. Es el término que le faltaba al muelle. */
    let vmx = 0, vmy = 0;
    for(const k of pieza){ const m = EL[t[k]].dens || 1; vmx += this.vx[k] * m; vmy += this.vy[k] * m; }
    vmx /= masa; vmy /= masa;
    let ax = fX / masa - FRENO_MANO * vmx, ay = fY / masa - FRENO_MANO * vmy;
    const tope = 1.6;
    if(ax > tope) ax = tope; else if(ax < -tope) ax = -tope;
    if(ay > tope) ay = tope; else if(ay < -tope) ay = -tope;

    for(const k of pieza){
      const x = k % an, y = (k / an) | 0;
      this.vx[k] += ax;
      /* mientras la mano tira, se compensa la gravedad para poder levantar
         — que es lo que hace una mano de verdad, no una excepción */
      this.gravedadEn(x, y, k);
      this.vy[k] += ay - this._gy * 0.9;
      this.suelto[k] = 1;
      this.sop[k] = 0;
    }
    /* ⚠ Y EL PUNTO DE AGARRE VIAJA CON LA PIEZA, NO SE QUEDA DONDE ESTABA.
       Medido: con el punto quieto, la madera y la tela de globo se escapaban
       de la mano en seis cuadros —`agarró 0`— y salían volando hasta la pared
       de enfrente, mientras que la piedra y el metal sí se dejaban llevar. No
       era cosa del material: es que lo ligero acelera más, y en un cuadro se
       salía del círculo de la brocha, que mide tres celdas. La piedra no se
       escapaba porque apenas se movía.
       Así que el agarre se adelanta lo que la pieza va a moverse este paso.
       Es lo mismo que hace una mano: no se queda en el aire donde estaba el
       objeto, se va con él. */
    let nvx = 0, nvy = 0;
    for(const k of pieza){ const m = EL[t[k]].dens || 1; nvx += this.vx[k] * m; nvy += this.vy[k] * m; }
    return { n: pieza.length, cx: gx + nvx / masa, cy: gy + nvy / masa };
  }

  /* ── DE QUÉ PIEZA FORMAN PARTE ESTAS CELDAS ─────────────────────────────
     Crece desde unas celdas semilla por la misma regla con la que
     `cuerpoPaso` junta un cuerpo: pegadas, sólidas, de la misma estructura
     soldada. El polvo no crece — la arena no es una pieza, y mover un grano no
     puede llevarse el montón entero.

     Vive aparte porque lo necesitan DOS sitios y por la misma razón: la mano,
     que si no agarra un mordisco redondo del objeto; y el empuje de una
     explosión, que si no le da el impulso a cuatro celdas de una losa mientras
     las otras cincuenta y seis siguen ancladas y no la dejan moverse. Es el
     mismo defecto con dos caras.

     ⚠ Y LLEVA TOPE, que no es un detalle de rendimiento sino de física. Sin
     él, el empuje de una explosión pedía la pieza de una celda del SUELO — y
     el suelo de una sala es una sola pieza pegada de 57 600 celdas. Medido:
     un paso de 1 245 ms, o sea un segundo y cuarto congelado. Y aunque fuera
     gratis estaría mal: una explosión no lanza el planeta. Pasado el tope, la
     pieza se considera anclada y el golpe se queda donde cayó, que es lo que
     hace un explosivo contra el suelo: un hoyo, no un despegue. */
  piezaDe(semilla, tope = 60000){
    const { an, t } = this;
    const visto = this._vistoCuerpo;
    const pieza = semilla.slice();
    for(const k of pieza) visto[k] = 1;
    for(let i = 0; i < pieza.length && pieza.length < tope; i++){
      const k = pieza[i];
      if(this.estadoDe(k) !== 'solido') continue;
      const x = k % an, y = (k / an) | 0;
      for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
        if(!this.dentro(x+dx, y+dy)) continue;
        const k2 = this.i(x+dx, y+dy);
        if(visto[k2]) continue;
        if(t[k2] === VACIO || EL[t[k2]].fijo) continue;
        if(this.estadoDe(k2) !== 'solido') continue;
        if(this.soldado[k] !== this.soldado[k2]) continue;
        visto[k2] = 1; pieza.push(k2);
      }
    }
    for(const k of pieza) visto[k] = 0;           /* se deja como estaba */
    return pieza;
  }

  /* ── EL TERMÓMETRO ────────────────────────────────────────────────────
     Qué material es, a qué temperatura está y a qué temperaturas cambia de
     estado. Vive en el motor y no en la pantalla porque los datos son del
     motor, y así se puede probar sin navegador.

     ⚠ La FISIÓN no va aquí, y lo dijo el propio Carlos al corregirse: no es
     un cambio de estado, es un fenómeno nuclear. Los cambios de estado son
     fusión, solidificación, vaporización, ebullición, condensación y
     sublimación. Meter la fisión en esta lista sería enseñar mal la física
     en una herramienta cuyo único trabajo es enseñar física. */
  informe(x, y){
    if(!this.dentro(x, y)) return null;
    const k = this.i(x, y);
    const e = EL[this.t[k]];
    const est = this.estadoDe(k);
    const r = {
      id: e.id, nombre: e.nom, simbolo: e.sim || null, z: e.z || null,
      temperatura: Math.round(this.temp[k] * 10) / 10,
      estado: est === 'energia' ? 'energía' : est,
      densidad: e.dens, masa: e.masa || null,
      conduceCalor: e.cond ?? null, conduceElec: e.elec ?? null,
      dureza: e.dureza ?? null,
      presion: Math.round(this.pres[k] * 100) / 100,
      /* Carlos: «la presión no se nota». Aquí es donde tiene que notarse: el
         termómetro dice si estás dentro de algo SELLADO, a cuántas
         atmósferas, y cuánto gas lleva metido esa celda. Sin estos tres
         números, comprimir una cámara es a ciegas. */
      sellado: !!this.camara[k],
      atmosferas: Math.round((this.pres[k] / ATM) * 100) / 100,
      moles: this.moles[k] ? Math.round(this.moles[k] * 10) / 10 : null,
      corriente: !!this.car[k],
      /* el voltaje, a la vista: sin verlo, «apila más pilas» es adivinar */
      voltaje: this.car[k] ? Math.round((this.volt[k] || 0) * 100) / 100 : 0,
      sostenido: !!this.sop[k], suelto: !!this.suelto[k],
      cambios: [],
    };
    /* los 118 traen sus temperaturas MEDIDAS */
    if(e.fusReal != null) r.cambios.push({ que:'fusión', a: e.fusReal, nota:'de sólido a líquido' });
    if(e.ebuReal != null) r.cambios.push({ que:'ebullición', a: e.ebuReal, nota:'de líquido a gas' });
    /* los de juego cambian de elemento, que es su forma de cambiar de fase */
    if(e.fus) r.cambios.push({ que:'fusión', a: e.fus[0], nota:'se vuelve ' + (EL[IDX[e.fus[1]]] || {}).nom });
    if(e.ebu) r.cambios.push({ que:'ebullición', a: e.ebu[0], nota:'se vuelve ' + (EL[IDX[e.ebu[1]]] || {}).nom });
    if(e.congela) r.cambios.push({ que:'solidificación', a: e.congela[0], nota:'se vuelve ' + (EL[IDX[e.congela[1]]] || {}).nom });
    /* sublimación: pasar de sólido a gas SIN pasar por líquido. Es real y se
       reconoce por el dato: hierve por debajo de donde se funde. */
    if(e.fusReal != null && e.ebuReal != null && e.ebuReal < e.fusReal)
      r.cambios.push({ que:'sublimación', a: e.ebuReal, nota:'de sólido a gas, sin pasar por líquido' });
    if(e.aprieta) r.cambios.push({ que:'por presión', a: null,
      nota: 'a ' + Math.round(e.aprieta[0] / ATM) + ' atmósferas ' +
            (e.aprieta[1].startsWith('__revienta') ? 'revienta'
             : 'se vuelve ' + (EL[IDX[e.aprieta[1]]] || {}).nom) });
    if(e.arde) r.cambios.push({ que:'combustión', a: null, nota:'arde con una fuente de calor cerca' });
    if(e.radia) r.cambios.push({ que:'fisión', a: null, nota:'nuclear, no es un cambio de estado' });
    return r;
  }

  /* ¿Tiene una llama pegada? Fuego, lava, termita: cualquier cosa que sea
     calor en sí misma, no algo que esté caliente. */
  tocaLlama(x, y){
    for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
      if(!this.dentro(x + dx, y + dy)) continue;
      const k2 = this.i(x + dx, y + dy);
      if(this.t[k2] !== VACIO && EL[this.t[k2]].calor) return true;
    }
    return false;
  }

  /* Soltar lo que hay en un radio: lo llama todo el que da un golpe de
     verdad. Sin esto, un sólido pintado es inamovible aunque le revientes una
     bomba al lado. */
  suelta(x, y, r){
    for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){
      if(!this.dentro(x+dx, y+dy)) continue;
      const k = this.i(x+dx, y+dy);
      if(EL[this.t[k]].fijo) continue;
      this.suelto[k] = 1;
    }
  }

  /* ¿Este vecino es sólido, y todavía sin marcar? Es lo único por lo que el
     sostén se propaga: un líquido no sostiene un techo. */
  pegado(k){
    return !this.sop[k] && this.t[k] !== VACIO && this.estadoDe(k) === 'solido';
  }

  /* La forma SANCIONADA de meter presión. Escribir `pres[k]` a pelo también
     funciona… hasta que se te olvida despertar la caja, y entonces la onda se
     queda congelada sin un solo error: pico clavado en 300 durante trescientos
     pasos. Me pasó al escribir la propia prueba de la onda, y las 70 del motor
     pasaron igual porque las que reventaban de verdad sí despertaban. */
  /* Toda inyección de presión pasa por aquí y por `revienta`, y las dos
     levantan el techo. Si algún día aparece una tercera, tiene que hacerlo
     también o su onda se quedará recortada. */
  anotaPico(v){ const a = Math.abs(v); if(a > this.picoOnda) this.picoOnda = a; }

  presiona(x, y, v){
    if(!this.dentro(x, y)) return;
    this.anotaPico(this.pres[this.i(x, y)] + v);
    this.pres[this.i(x, y)] += v;
    this.despierta(x, y, 1);
  }

  ondaSubPaso(){
    /* Red de seguridad: cada tanto se rehace la caja mirando el mundo entero.
       Cuesta un recorrido cada treinta pasos —repartido, nada— y convierte
       «se me olvidó despertar» en medio segundo de retraso en vez de en una
       onda muerta para siempre. Una caja es una optimización, y una
       optimización que puede mentir tiene que poder corregirse sola. */
    if((this.paso_ % 30) === 0) this.recajea();
    const { an, al, t, pres, pv, fase } = this;
    const caja = this._caja;
    /* ⚠ SIN ESTA CAJA EL JUEGO NO CORRE EN UN TELÉFONO, y lo aprendí a
       cachetadas: la onda pasó el coste de 11.9 a 126.7 ms por paso en la sala
       de 153 600 celdas. La culpa no es de la ecuación, es de recorrerlo todo:
       después de una explosión NINGUNA celda vale cero exacto, así que el salto
       rápido no saltaba nunca y se calculaban 153 600 celdas por dos sub-pasos.
       Una onda vive en un anillo, no en la sala. Se lleva la caja de dónde hay
       algo y se recorre sólo eso, creciendo dos celdas por sub-paso —que es más
       de lo que el frente puede avanzar, así que no se le escapa. */
    if(caja.x1 < caja.x0) return;                    /* silencio absoluto: gratis */
    let x0 = Math.max(0, caja.x0 - 2), x1 = Math.min(an - 1, caja.x1 + 2);
    let y0 = Math.max(0, caja.y0 - 2), y1 = Math.min(al - 1, caja.y1 + 2);
    const p0 = this._pres2;
    /* ⚠ SE COPIA UNA CELDA MÁS DE LA QUE SE CALCULA, Y ESE BORDE ERA UNA
       FÁBRICA DE ENERGÍA. Antes se copiaba exactamente la caja y se calculaba
       exactamente la caja — pero para calcular una celda hay que leer a sus
       CUATRO VECINAS, y las del borde caen fuera de lo copiado. Ahí `p0` no
       era la presión de ahora: era una foto vieja, de cuando la caja estaba en
       otro sitio. La onda se alimentaba de su propio pasado.

       Y no se veía nunca en el aire, que es donde uno prueba: en el hueco la
       onda avanza rápido, la caja crece con ella y el borde va siempre por
       delante, en ceros. En un sólido la onda avanza despacio, la caja se
       queda quieta encima de restos de fotos anteriores, y ahí es donde se
       dispara. Medido, con NADA que romper y sin tocar el material:

           aire     1:13k   20:116k   100:80k    200:25k      ← baja, correcto
           piedra   1:3k    20:113k   100:178M   200:147 MIL MILLONES
           metal    1:3k    20:9k     100:71M    200:11 BILLONES

       Ésta es la mitad grande de «todo material se destruye sin importar la
       cantidad de explosivo»: no era el explosivo, era que dentro de la piedra
       la onda crecía sin techo hasta arrasar la sala. Y llevaba ahí desde que
       se escribió la ecuación de onda — todas las pruebas la miraban en el
       aire. */
    const cx0 = Math.max(0, x0 - 1), cx1 = Math.min(an - 1, x1 + 1);
    const cy0 = Math.max(0, y0 - 1), cy1 = Math.min(al - 1, y1 + 1);
    for(let y = cy0; y <= cy1; y++){
      const f = y * an;
      for(let x = cx0; x <= cx1; x++) p0[f + x] = pres[f + x];
    }
    /* transmisión por celda, calculada UNA vez y usada cinco: la miran sus
       cuatro vecinas y ella misma */
    const tr = this._trans, am = this._amort;
    for(let y = cy0; y <= cy1; y++){
      const f = y * an;
      for(let x = cx0; x <= cx1; x++){
        const k = f + x, e = EL[t[k]];
        let v;
        if(e.fijo) v = 0;
        else {
          const fa = fase[k];
          const ev = fa === 1 ? 'liquido' : fa === 2 ? 'gas' : e.estado;
          if(ev === 'solido') v = 0.05 + 0.45 * (1 - (e.dureza || 0));
          else if(ev === 'polvo') v = 0.55;
          else v = 1;
        }
        tr[k] = v;
        /* ⚠ Y EL TECHO TIENE QUE CONTAR LA PRESIÓN DE LOS GASES, que no pasa
           ni por `presiona` ni por `revienta`. Sin esto el techo valía CERO
           mientras no hubiera explotado nada, y una recámara caliente y
           sellada se quedaba a presión 0.00 — o sea que el tope, puesto para
           que la onda no creara energía, le prohibía existir a la presión que
           sí nace de algo. Se cazó en cuatro pruebas del cohete de un golpe. */
        if(v > 0 && t[k] !== VACIO && e.estado === 'gas'){
          const eqk = (this.temp[k] - AMBIENTE) * 0.03;
          if(eqk > this.picoOnda) this.picoOnda = eqk;
        }
        /* la amortiguación también, en el mismo recorrido: una llamada por
           celda por paso en 153 600 celdas se nota y no aporta nada */
        am[k] = e.id === 'vacio' ? 0.99
              : e.estado === 'gas' ? 0.99
              : e.estado === 'liquido' ? 0.985
              : e.estado === 'polvo' ? 0.93 : 0.90;
      }
    }
    /* Estabilidad en dos dimensiones: c²·dt²/dx² ≤ ½. A 0.48 el frente avanza
       ~0.7 celdas por paso, que a sesenta cuadros son 42 celdas por segundo y
       se lee como una onda. Pasarse de ½ no da «más rápido»: da números que
       llegan a infinito en cuatro pasos. */
    const C2 = 0.48;
    /* el techo baja solo: una explosión de hace diez segundos ya no autoriza
       nada. Sin esta caída, el primer petardo de la partida dejaría permiso
       para siempre. Se lee DESPUÉS del recorrido de arriba, que es donde los
       gases calientes lo levantan. */
    this.picoOnda *= 0.995;
    const techo = this.picoOnda * 1.05 + 1;
    let nx0 = an, nx1 = -1, ny0 = al, ny1 = -1;
    for(let y = y0; y <= y1; y++){
      const f = y * an;
      const arrF = y > 0 ? f - an : -1, abaF = y < al - 1 ? f + an : -1;
      for(let x = x0; x <= x1; x++){
        const k = f + x;
        const tc = tr[k];
        if(tc === 0){ pres[k] = 0; pv[k] = 0; continue; }   /* muro: reflector */
        const pk = p0[k];
        let lap = 0;
        /* Bordes del mundo: absorben, no reflejan. Si el vecino cae fuera se
           trata como presión cero, que es lo que hace que lo que se va no
           vuelva. Un MURO sí refleja — para eso está. */
        if(arrF < 0) lap -= pk; else { const c = tc < tr[arrF+x] ? tc : tr[arrF+x]; if(c) lap += (p0[arrF+x] - pk) * c; }
        if(abaF < 0) lap -= pk; else { const c = tc < tr[abaF+x] ? tc : tr[abaF+x]; if(c) lap += (p0[abaF+x] - pk) * c; }
        if(x === 0)      lap -= pk; else { const c = tc < tr[k-1] ? tc : tr[k-1]; if(c) lap += (p0[k-1] - pk) * c; }
        if(x === an - 1) lap -= pk; else { const c = tc < tr[k+1] ? tc : tr[k+1]; if(c) lap += (p0[k+1] - pk) * c; }

        let v = (pv[k] + C2 * lap) * am[k];
        let p = pk + v;
        const tk = t[k];
        const cam = this.camara[k];
        const cal = (tk !== VACIO && EL[tk].estado === 'gas' && this.temp[k] > AMBIENTE)
                  ? (this.temp[k] - AMBIENTE) * 0.03 : 0;
        if(cam){
          /* dentro de una cámara sellada la celda tiende a lo que le toca por
             estar apretada, MÁS lo que ya daba por estar caliente. Vale para
             el hueco igual que para el gas — el aire de una habitación
             cerrada también empuja, que es justo lo que Carlos echaba en
             falta. */
          const eq = (this.camaraP[cam - 1] || 0) + cal;
          p += (eq - p) * 0.10;
          if(eq > this.picoOnda) this.picoOnda = eq;
        }
        else if(cal) p += (cal - p) * 0.06;
        /* El hueco es el desahogo: es aire abierto, no una cámara. Se desahoga
           SÓLO cuando no está oscilando, así que el frente de la onda —que
           lleva velocidad grande— lo cruza sin perder nada, y en cambio el
           desnivel plano que queda después sí se drena. Sin esto la sala se
           quedaba presurizada de por vida: a 900 pasos la energía seguía
           clavada en 5.21e6 empujándolo todo. */
        /* ⚠ Y EL DESAHOGO NO VALE DENTRO DE UNA CÁMARA. Es el drenaje que
           impide que la sala se quede presurizada de por vida, y estaba bien
           puesto para el aire libre — pero aplicado dentro de un bote sellado
           le abre un agujero que no existe: la presión se escapaba por donde
           no hay salida y ninguna recámara subía nunca. */
        if(tk === VACIO && !cam && v > -0.5 && v < 0.5) p *= 0.95;
        if(p > -0.04 && p < 0.04 && v > -0.04 && v < 0.04){ p = 0; v = 0; }
        if(p > techo) p = techo; else if(p < -techo) p = -techo;
        if(v > techo) v = techo; else if(v < -techo) v = -techo;
        pv[k] = v; pres[k] = p;
        if(p !== 0 || v !== 0){
          if(x < nx0) nx0 = x; if(x > nx1) nx1 = x;
          if(y < ny0) ny0 = y; if(y > ny1) ny1 = y;
        }
      }
    }
    caja.x0 = nx0; caja.x1 = nx1; caja.y0 = ny0; caja.y1 = ny1;
  }

  /* La presión a la que TIENDE un gas por estar caliente y encerrado. Ley de
     los gases en su versión de píxeles: es de aquí de donde sale la fuerza que
     empuja un proyectil por un cañón. */
  presionDeGas(k){
    return Math.max(0, this.temp[k] - AMBIENTE) * 0.03;
  }

  recajea(){
    const { pres, pv, an } = this;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for(let k = 0; k < pres.length; k++){
      if(pres[k] === 0 && pv[k] === 0) continue;
      const x = k % an, y = (k / an) | 0;
      if(x < x0) x0 = x; if(x > x1) x1 = x;
      if(y < y0) y0 = y; if(y > y1) y1 = y;
    }
    this._caja = { x0, y0, x1, y1 };
  }

  /* Qué tan bien pasa la onda de un borde al otro. Es el coeficiente de
     transmisión, y es TODO el comportamiento de bordes en un solo número.

     ⚠ Y TIENE QUE SER SIMÉTRICO, que es donde me equivoqué y no se ve leyendo.
     La primera versión miraba sólo al VECINO: la celda A usaba f(B) y la B
     usaba f(A). Dos números distintos para el mismo borde — y un operador
     asimétrico no conserva energía, la FABRICA. Se veía en la medición y en
     ningún otro sitio: la onda decaía bien hasta el paso 20 y a partir del 40
     la energía volvía a subir (4.20e6 → 6.90e6) con el pico estancado en 45
     en vez de apagarse. Una explosión que en vez de morir se alimenta sola.
     El mínimo de los dos lados es simétrico por construcción, y además es lo
     físico: manda el peor conductor del par, igual que ya hacía el calor. */
  acople(k, k2){
    const a = this.transmite(k), b = this.transmite(k2);
    return a < b ? a : b;
  }

  transmite(k){
    const e = EL[this.t[k]];
    if(e.fijo) return 0;                       /* muro: rebota entera */
    if(e.valvula && this.valvulaAbierta(k)) return 1;   /* abierta: no estorba */
    const ev = this.estadoDe(k);
    if(ev === 'solido'){
      /* Una pared dura refleja casi todo; una floja deja pasar la mitad y se
         queda con el resto. Eso es «un residuo se queda tras la pared y otro
         atraviesa pero pierde fuerza», que es literalmente lo que pidió. */
      return 0.05 + 0.45 * (1 - (e.dureza || 0));
    }
    if(ev === 'polvo') return 0.55;            /* la arena amortigua: por eso los sacos terreros */
    return 1;
  }

  /* Cuánto se apaga la onda al viajar por cada medio. En el aire casi nada
     —por eso se oye lejos—; en un sólido se come el golpe en dos celdas. */
  amortigua(e){
    if(e.id === 'vacio') return 0.995;
    const ev = e.estado;
    if(ev === 'gas') return 0.99;
    if(ev === 'liquido') return 0.985;
    if(ev === 'polvo') return 0.93;
    return 0.90;
  }

  /* ── lo que la presión ROMPE ──────────────────────────────────────────
     Aparte de la propagación, y a propósito: mezclarlo con el bucle de la onda
     era lo que hacía que romper una pared dependiera del orden de recorrido.
     Lo que rompe no es la presión en sí, es la DIFERENCIA a los dos lados de
     la pared — que es lo que de verdad revienta un recipiente. */
  presionRompe(){
    const { an, al, t, pres, pv } = this;
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k = y * an + x;
        if(pres[k] < 40) continue;
        const e = EL[t[k]];
        if(e.fijo) continue;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          if(!this.dentro(x+dx, y+dy)) continue;
          const k2 = this.i(x+dx, y+dy);
          const v = EL[t[k2]];
          if(v.fijo) continue;                 /* el muro no cede: para eso está */
          if(this.estadoDe(k2) !== 'solido') continue;
          const dif = pres[k] - pres[k2];
          if(dif < 40) continue;
          /* La dureza es la resistencia del material, y aquí es donde compite
             de verdad con la presión de dentro: un recipiente de vidrio
             revienta y uno de concreto aguanta el mismo golpe.

             ⚠ Y AQUÍ ESTABA LA MITAD GRANDE DEL RECLAMO DE CARLOS —«sin
             contar el muro TODO material se destruye sin importar la cantidad
             de explosivo»—, que resultó no ser de los explosivos sino de la
             onda. Medido: UN solo empujón de 3000 en un suelo de 2400 piedras
             lo dejaba en CERO a los 200 pasos, y la presión total del cuarto
             subía de 35 mil a 1.1 millones por el camino.

             La causa es que romper salía GRATIS. Dos cosas:
             · el aguante de la piedra eran 292 contra una onda de 1400, y la
               probabilidad `(dif-aguanta)*.004` pasaba de 1 en cuanto la
               diferencia llegaba a 542 — o sea, certeza. Con certeza, una
               onda que cruza mil celdas rompe mil celdas.
             · y al romper, la onda sólo se multiplicaba por 0.6. Fija. Da
               igual reventar corcho que acero.

             Ahora romper CUESTA lo que aguanta el material, y ese costo sale
             de la onda. Una carga chica abolla y se apaga; una grande sigue.
             De ahí sale sola la proporcionalidad que pedía: no hay tabla de
             «cuánto explosivo hace cuánto daño», hay un presupuesto. */
          const aguanta = 120 + (v.dureza || 0) * 1400;
          if(dif <= aguanta) continue;
          const exceso = dif - aguanta;
          if(this.rnd() > Math.min(0.55, exceso * .0009)) continue;
          /* no desaparece: SALE DESPEDIDA, que es lo que hace la metralla */
          this.vx[k2] += dx * exceso * .02;
          this.vy[k2] += dy * exceso * .02;
          this.suelta(x + dx, y + dy, 2);
          if(this.rnd() < .35){
            this.cambia(k2, VACIO);
            /* ⚠ Y EL HUECO NACE EN SILENCIO. Aquí estaba el motor del
               desastre, y no se ve leyendo ninguna de las dos piezas por
               separado: la ecuación de onda SOLA es estable en todos los
               materiales —medido, cae a cero en los cuatro—, y romper solo
               tampoco crea nada. Lo que se realimenta es la pareja.
               Una celda de piedra transmite 0.23; en cuanto se rompe, ese
               mismo sitio pasa a transmitir 1 — más de CUATRO VECES— con la
               presión que ya tenía dentro. El siguiente sub-paso lee un salto
               enorme donde antes había un muro blando, y de ahí sale una
               patada que rompe la siguiente celda, que abre otro hueco, que
               da otra patada. Medido: 3 000 de presión inicial llegaban a
               147 MIL MILLONES en 200 pasos dentro de piedra, y a 11 billones
               dentro de metal, arrasando la sala entera.
               El sitio que se abre empieza vacío de presión, que es lo que de
               verdad pasa cuando algo revienta: el hueco no hereda el empuje
               del ladrillo que ya no está. */
            pres[k2] = 0; pv[k2] = 0;
          }
          /* lo que costó romperlo se lo lleva de la onda */
          pres[k] = Math.max(0, pres[k] - aguanta * 1.15);
        }
      }
    }
  }

  /* La presión empuja lo que se puede mover. Se llama por celda. */
  empuja(x, y, k, e){
    const p = this.pres[k];
    if(p < 3) return;
    if(e.fijo) return;
    /* si esta celda va dentro de un cuerpo, su empuje ya se sumó al de la
       pieza entera: contarlo aquí otra vez es contarlo dos veces */
    if(this.enCuerpo[k]) return;
    let gx = 0, gy = 0;
    for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
      if(!this.dentro(x+dx, y+dy)) continue;
      const k2 = this.i(x+dx, y+dy);
      if(this.estadoDe(k2) === 'solido' && this.t[k2] !== VACIO) continue;
      const dif = this.pres[k] - this.pres[k2];
      if(dif > 0){ gx += dx * dif; gy += dy * dif; }
    }
    const m = Math.max(0.35, (e.dens || 1) * 0.12);   /* la masa se resiste */
    const ax = (gx / m) * 0.016, ay = (gy / m) * 0.016;
    this.vx[k] += ax;
    this.vy[k] += ay;

    /* ── ACCIÓN Y REACCIÓN · el empuje del cohete ───────────────────────────
       Carlos: «quiero experimentar con sistemas de propulsión impulsados por
       presión y expansión de gases; el sistema debe simular las fuerzas
       resultantes de forma física, en lugar de mover el objeto hacia adelante
       mediante una animación».

       Pues es la tercera ley y ya. Si esta celda de gas sale acelerada hacia
       algún lado, algo la empujó — y ese algo se lleva el impulso contrario.
       Ese algo es el sólido que tiene JUSTO DETRÁS: la pared de la recámara.
       Con eso, un recipiente cerrado no se mueve —las paredes opuestas se
       cancelan, como debe ser— y en cuanto le abres una boca, el gas sale por
       ahí y la pared de enfrente se queda con todo el impulso. Eso es un
       cohete, y no hay una sola línea que diga «cohete».

       El impulso se reparte por masa: el gas es ligero y el recipiente pesado,
       así que el recipiente se mueve poco por cada bocanada — pero son muchas
       bocanadas, y de ahí sale la aceleración sostenida. */
    if(e.estado === 'solido') return;              /* un sólido no propulsa nada */
    const mag = Math.abs(ax) + Math.abs(ay);
    if(mag < 0.004) return;
    const dx = ax > 0 ? -1 : ax < 0 ? 1 : 0;
    const dy = ay > 0 ? -1 : ay < 0 ? 1 : 0;
    for(const [rx, ry] of [[dx, 0], [0, dy]]){
      if(!rx && !ry) continue;
      if(!this.dentro(x + rx, y + ry)) continue;
      const kr = this.i(x + rx, y + ry);
      if(this.t[kr] === VACIO) continue;
      const er = EL[this.t[kr]];
      if(er.fijo) continue;                        /* el muro se lo traga: por eso ancla */
      if(this.estadoDe(kr) !== 'solido') continue;
      /* momento igual y contrario, repartido por las masas */
      const mr = er.dens || 1;
      const f = (e.dens || 1) / mr;
      if(rx) this.vx[kr] -= ax * f;
      if(ry) this.vy[kr] -= ay * f;
      this.suelto[kr] = 1;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     UN PASO DE MUNDO
     ═══════════════════════════════════════════════════════════════════════ */
  paso(){
    this.paso_++;
    this.mov.fill(0);
    this.sostenPaso();
    this.globoPaso();
    this.cuerdaPaso();
    this.cuerpoPaso();
    this.electricidad();
    this.luzPaso();
    this.magnetismo();
    /* ⚠ CADA DOS PASOS, Y NO CADA CUATRO AUNQUE SEAN 2.7 ms MÁS BARATOS.
       Son tres recorridos del mundo entero y la tentación era espaciarlos:
       medido en la sala de 320×480 son 23 ms cada paso, 18.7 cada dos y 16.0
       cada cuatro. Pero a cuatro se rompen dos pruebas del cohete, y con
       razón: entre pasada y pasada el gas SE MUEVE, así que la marca de «esta
       celda pertenece a la cámara» se queda vieja y la presión se aplica a
       unas celdas sí y a otras no. Esa asimetría le da empuje neto a un
       recipiente cerrado — se propulsaba 1.57 celdas él solo. Una foto vieja
       de quién está dentro es peor que ninguna. */
    if((this.paso_ & 1) === 0) this.camaraPaso();
    this.presionPaso();
    this.esfuerzoPaso();

    /* De abajo hacia arriba: si se recorriera al revés, un grano de arena
       caería toda la columna en un solo cuadro. Y las filas se recorren
       alternando el sentido, porque hacerlo siempre de izquierda a derecha
       le mete a los líquidos una corriente que nadie pidió. */
    for(let y = this.al - 1; y >= 0; y--){
      const izq = ((y + this.paso_) & 1) === 0;
      for(let n = 0; n < this.an; n++){
        const x = izq ? n : this.an - 1 - n;
        const k = y * this.an + x;
        if(this.mov[k]) continue;
        const tipo = this.t[k];
        if(tipo === VACIO) continue;
        this.celda(x, y, k, tipo);
      }
    }

    /* ⚠ EL CALOR VA AL FINAL Y ESTO ERA UN DEFECTO DE VERDAD. Estaba al
       principio, así que la difusión corría ANTES de que nadie pudiera
       reaccionar a la temperatura: ponías arena a 1800° y el primer paso la
       enfriaba 156° repartiéndola con los vecinos, y para cuando se
       comprobaba el punto de fusión ya estaba por debajo. La arena nunca se
       hacía vidrio y el motor «no tenía nada malo».
       Primero se actúa con la temperatura que hay, luego evoluciona. */
    this.calor();
    /* Las detonaciones por choque se resuelven AQUÍ y no dentro del
       movimiento: reventar en medio del recorrido cambia el mundo debajo del
       bucle que lo está recorriendo, y eso es como se corrompe un motor. */
    if(this._detona.length){
      const lista = this._detona;
      this._detona = [];
      for(const [dx, dy, f] of lista) this.revienta(dx, dy, f);
    }
  }

  celda(x, y, k, tipo){
    const e = EL[tipo];

    /* 1 · vive y muere */
    if(e.vida){
      this.vida[k]++;
      if(this.vida[k] > e.vida){ this.cambia(k, IDX[e.muere]); return; }
    }

    /* 2 · cambios de estado por temperatura */
    const T = this.temp[k];
    /* Fusión y ebullición REALES, por fase y sin elementos nuevos. */
    if(e.fusReal != null){
      const antes = this.fase[k];
      if(e.ebuReal != null && T >= e.ebuReal) this.fase[k] = 2;
      else if(T >= e.fusReal) this.fase[k] = 1;
      else this.fase[k] = 0;
      if(this.fase[k] !== antes && this.fase[k] > 0) this.nace(this.t[k]);
    } else if(e.ebuReal != null){
      this.fase[k] = T >= e.ebuReal ? 2 : 0;
    }
    if(e.fus && T >= e.fus[0]){ this.cambia(k, IDX[e.fus[1]], true); return; }
    if(e.ebu && T >= e.ebu[0]){ this.cambia(k, IDX[e.ebu[1]], true); return; }
    if(e.congela && T <= e.congela[0]){ this.cambia(k, IDX[e.congela[1]], true); return; }

    /* ⚠ LA ESTRELLA VA ANTES DE LA COMBUSTIÓN. Estaba después, así que el
       bloque de «lo que arde, arde» la convertía en fuego y nunca llegaba a
       reventar en chispas: la pirotecnia se veía como una fogata cualquiera.
       El orden dentro del paso decide qué reglas existen. */
    if(e.chispa && (this.temp[k] > 300 || this.vecinoCaliente(x, y, e))){
      for(let i = 0; i < 18; i++){
        const a = this.rnd() * Math.PI * 2, d = this.rnd() * 3;
        const nx = Math.round(x + Math.cos(a)*d), ny = Math.round(y + Math.sin(a)*d);
        if(!this.dentro(nx, ny)) continue;
        const k2 = this.i(nx, ny);
        if(this.t[k2] !== VACIO && k2 !== k) continue;
        this.pon(nx, ny, IDX.chispa);
        this.color[k2] = this.colorIdx(e.chispa);
        this.vx[k2] = Math.cos(a) * 2.6;
        this.vy[k2] = Math.sin(a) * 2.6 - 1.2;
      }
      this.temp[k] += 400;
      this.cambia(k, VACIO);
      return;
    }

    /* Un gas caliente es una FUENTE de presión, así que hay que visitarlo
       aunque la onda no haya llegado nunca por aquí: si no, la caja no lo
       alcanza y la recámara nunca sube de presión. */
    if(e.estado === 'gas' && tipo !== VACIO && this.temp[k] > AMBIENTE + 40) this.despierta(x, y, 1);

    /* 3 · lo que arde, arde */
    if(e.arde && this.vecinoCaliente(x, y, e)){
      this.temp[k] += (e.calorArde || 500) * .12;
      if(this.rnd() < e.arde * .3){
        /* ⚠ Y SI ADEMÁS EXPLOTA, TAMBIÉN DEJA SU PRODUCTO. Esta línea salía
           antes que la de abajo, así que el hidrógeno —que explota— nunca
           llegaba a hacer vapor: reventaba y se acababa la historia. Explotar
           en oxígeno no es lo contrario de hacer agua, es la misma cosa más
           rápido. */
        if(e.explota){
          this.revienta(x, y, e.explota);
          if(e.ardeEn) this.cambia(k, IDX[e.ardeEn]);
          return;
        }
        /* ⚠ LO QUE ARDE NO SIEMPRE DEJA FUEGO Y YA. El hidrógeno que arde
           HACE AGUA — arder en oxígeno ES la reacción—, y aquí se convertía en
           fuego y el agua se perdía. No se notaba hasta que el aire empezó a
           acarrear calor: con el calor quieto, la chispa encendía poco y la
           reacción tenía tiempo de correr; con el calor viajando, la llama se
           come el hidrógeno antes. La prueba pasó de «hace agua» a «no queda
           hidrógeno y no hay agua», y el arreglo no era bajarle al aire: era
           que quemar hidrógeno diera lo que da. */
        this.cambia(k, e.ardeEn ? IDX[e.ardeEn] : IDX.fuego);
        if(e.ardeEn) this.temp[k] += (e.calorArde || 500) * .5;
        return;
      }
    }
    /* Detona por GOLPE, no por existir. Y el golpe puede venir de dos lados,
       que es lo que se me pasó: que ELLA caiga rápido y se estrelle, o que
       algo LE CAIGA ENCIMA. Medir sólo su propia velocidad dejaba fuera el
       caso obvio — tirarle una piedra — y era justo el que se prueba primero. */
    /* ── DETONA POR GOLPE, Y EL GOLPE ES RELATIVO ─────────────────────────
       Carlos, dos veces: «la nitroglicerina sigue explotando nada más
       ponerla». Reproducido: en reposo aguantaba, pero pintada en el aire caía
       a velocidad terminal 6 contra un umbral de 2.2 y detonaba sola. O sea
       que bastaba soltarla.

       Lo que estaba mal era medir la velocidad ABSOLUTA. Un charco que cae
       entero lleva velocidad 6 y no se está golpeando con nada: se está
       cayendo. Lo que detona un explosivo es un choque, y un choque es
       velocidad RELATIVA — la diferencia con lo que tiene al lado.

       Con eso: un charco cayendo junto tiene relativa 0 y aguanta; una piedra
       que le cae encima tiene relativa 6 y lo revienta; y una onda de choque
       de otra explosión también, que es la detonación simpática de verdad.

       ⚠ Y ojo: durante un rato esto «se arregló solo» porque la resistencia
       del aire le bajó la velocidad terminal a 2.37, justo por encima del
       umbral de 2.2. Eso no es un arreglo, es una casualidad de dos números
       que se rompe al primer ajuste. */
    if(e.golpe){
      let impacto = false;
      const vyk = this.vy[k], vxk = this.vx[k];
      for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
        if(!this.dentro(x+dx, y+dy)) continue;
        const k2 = this.i(x+dx, y+dy);
        if(this.t[k2] === VACIO) continue;
        if(this.t[k2] === tipo) continue;          /* uno de los suyos no lo golpea */
        const rel = Math.abs(this.vy[k2] - vyk) + Math.abs(this.vx[k2] - vxk);
        if(rel > e.golpe){ impacto = true; break; }
      }
      /* y la onda de choque de otra explosión: detonación simpática */
      /* el umbral baja con los explosivos: desde que `explota` es energía por
         celda y no por explosión, una onda vecina trae mucha menos presión
         —eran 70 contra picos que ya no llegan— y la detonación simpática
         dejaba 10 de 10 celdas sin detonar */
      if(!impacto && this.pres[k] > 18) impacto = true;
      if(impacto){ this.revienta(x, y, e.explota || 6); return; }
    }
    /* ── LO QUE CAMBIA POR APRETARLO ────────────────────────────────────
       Carlos: «someter a tanta presión carbono que se vuelva diamante, o
       uranio que explote». Es hermano de `fus` y `ebu` —lo mismo pero con el
       otro eje del diagrama de fases— y por eso se escribe igual: en el
       elemento, no en el motor. Quien quiera meter otro material que se
       transforme al apretarlo, le pone `aprieta:[presión,'producto']` y ya. */
    if(e.aprieta && this.pres[k] >= e.aprieta[0]){
      const destino = e.aprieta[1];
      if(destino.startsWith('__revienta ')){
        this.revienta(x, y, +destino.slice(11));
        this.cambia(k, VACIO);
      } else this.cambia(k, IDX[destino]);
      return;
    }
    if(e.radia){
      this.temp[k] += 1.2;
      if(this.rnd() < .002){
        const [vx, vy] = this.vecinoAzar(x, y);
        if(this.dentro(vx, vy) && this.t[this.i(vx,vy)] === VACIO) this.pon(vx, vy, IDX.fuego);
      }
    }

    /* 4 · reacciones con los cuatro vecinos */
    this.reacciona(x, y, k, tipo);
    if(this.t[k] !== tipo) return;

    /* 5 · ácido */
    if(e.corroe) this.corroe(x, y, k, e);

    /* 6 · vida vegetal */
    if(e.crece && this.rnd() < .004) this.crece(x, y);
    if(e.germina) this.germina(x, y, k);

    /* PISTÓN: con corriente, empuja fuerte hacia arriba. Es el que lanza. */
    if(e.piston && this.car[k] && this.dentro(x, y-1)){
      const k2 = this.i(x, y-1);
      /* ⚠ AQUÍ DECÍA «Y NO SEA SÓLIDO», que es exactamente lo contrario de
         para qué sirve un pistón. Con los sólidos clavados en su celda no
         tenía sentido empujarlos, así que se excluían… y eso hacía imposible
         lo que Carlos pidió por su nombre: «cómo creo una pistola que dispare
         un proyectil». El proyectil de una pistola es un SÓLIDO. */
      if(this.t[k2] !== VACIO && !EL[this.t[k2]].fijo){
        /* «Los pistones deben poder tener distintos empujes» — y el mando es
           el mismo que el de la resistencia y el motor: cuántas pilas le
           pongas. Un solo tipo de pistón, la fuerza la decides tú. */
        this.vy[k2] -= e.piston * (this.volt[k] || 1);
        this.suelto[k2] = 1;                 /* lanzado: ya no está anclado */
        this.pres[k2] += 18; this.anotaPico(this.pres[k2]); this.despierta(x, y - 1, 2);
      }
    }
    /* RESORTE: guarda el golpe que recibe y lo devuelve. `vida` es la
       compresión acumulada. */
    if(e.resorte){
      let golpe = 0;
      for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
        if(!this.dentro(x+dx, y+dy)) continue;
        const k2 = this.i(x+dx, y+dy);
        if(this.t[k2] === VACIO) continue;
        golpe = Math.max(golpe, Math.abs(this.vy[k2]) + Math.abs(this.vx[k2]));
      }
      if(golpe > .6){ this.vida[k] = Math.min(200, this.vida[k] + golpe * 12); }
      else if(this.vida[k] > 0){
        /* devuelve lo guardado hacia arriba */
        const suelta = Math.min(this.vida[k] / 12, e.resorte);
        if(this.dentro(x, y-1)){
          const k2 = this.i(x, y-1);
          if(this.t[k2] !== VACIO && !EL[this.t[k2]].fijo){ this.vy[k2] -= suelta; this.suelto[k2] = 1; }
        }
        this.vida[k] = Math.max(0, this.vida[k] - suelta * 12);
      }
    }
    /* MECHA: se quema despacio y SÓLO hacia sus vecinas, no en bola. Es lo
       que permite retrasar una tronada un rato exacto. */
    /* ⚠ UNA MECHA ENCENDIDA ARDE SOLA. Antes sólo contaba mientras algo la
       calentara desde fuera, y con masa térmica el calor de la vecina se
       disipaba en pocos pasos: la mecha avanzaba dos celdas y se apagaba.
       Una vez prendida se mantiene ella misma —que es literalmente lo que
       hace— y al consumirse enciende a la siguiente. */
    /* ⚠ Y SE PASA EL FUEGO AL TERMINAR, NO POR ESTAR CALIENTE. Con el paso
       anterior la mecha ya ardía sola a 430°… y eso encendía a sus vecinas de
       inmediato, así que la línea entera prendía a la vez: treinta celdas
       ardiendo en paralelo, que es una traca, no una mecha. El relevo es
       explícito —la que se consume prende a la siguiente— y el encendido por
       calor pide un fuego de verdad, no el calor de la mecha de al lado. */
    /* ⚠ EL UMBRAL ERAN 700° Y POR ESO «LA MECHA NO SE QUEMA». Medido: una
       mecha de 30 celdas con fuego pegado al extremo se quedaba en 30 celdas
       tras 300 pasos — cero. Y 700 es más de lo que da casi nada de lo que uno
       tiene a mano: una resistencia con una pila llegaba a 39°. Una mecha de
       verdad prende con una cerilla, no con un soplete. A 320° prende con
       fuego, con lava, con una chispa de pirotecnia y con una resistencia de
       dos pilas — que son justo las cuatro cosas con las que uno intenta
       encenderla. */
    /* ⚠ Y PRENDE POR CONTACTO CON LA LLAMA, no sólo por temperatura, que es
       lo que faltaba de verdad. Medido con el umbral ya bajado a 320°: con
       LAVA al lado la mecha ardía (la vecina llegaba a 820°) y con FUEGO al
       lado NO — la vecina se quedaba en 27°. El fuego es un gas: sube y se va
       en un paso o dos, así que nunca está el rato que hace falta para
       calentar por conducción. Pero uno enciende una mecha con una llama, no
       apoyándole una piedra al rojo: tocarla ya es encenderla. */
    if(e.mecha && (this.vida[k] > 0 || this.temp[k] > 320 || this.tocaLlama(x, y))){
      this.temp[k] = Math.max(this.temp[k], 430);
      this.vida[k]++;
      if(this.vida[k] > 26){
        /* ⚠ y ENCIENDE A SU VECINA. Sin esto la mecha se consumía una celda y
           ahí se paraba: el fuego que dejaba es «energía» y SUBE, se va
           volando antes de tocar la siguiente. Una mecha que no propaga no es
           una mecha, es un punto quemado. */
        for(const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
          if(!this.dentro(x+dx, y+dy)) continue;
          const k2 = this.i(x+dx, y+dy);
          if(EL[this.t[k2]].mecha && this.vida[k2] === 0) this.vida[k2] = 1;
        }
        this.cambia(k, IDX.fuego);
        return;
      }
    }
    /* 6-bis · UN MOTOR CON CORRIENTE EMPUJA LO QUE TENGA ENCIMA.
       ⚠ Y AQUÍ DECÍA «y NO sea sólido», que es la misma línea que ya se había
       corregido en el pistón y que aquí se quedó puesta. Carlos: «el motor no
       funciona» — y no funcionaba literalmente: la corriente le llegaba
       (medido, `car` en 1) y el motor excluía a mano lo único que uno le pone
       encima. Un aviso arreglado en una pieza no arregla a la de al lado.
       La fuerza va con el voltaje: apilar pilas mueve más peso, que es lo que
       hace un motor de verdad. */
    if(e.motor && this.car[k] && this.dentro(x, y-1)){
      const k2 = this.i(x, y-1);
      if(this.t[k2] !== VACIO && !EL[this.t[k2]].fijo){
        const V = this.volt[k] || 1;
        this.vy[k2] -= 1.1 * V;
        this.suelto[k2] = 1;
        this.sop[k2] = 0;
        this.despierta(x, y - 1, 2);
      }
    }

    /* 7 · la presión empuja antes de mover */
    this.empuja(x, y, k, e);

    /* 8 · movimiento */
    this.mueve(x, y, k, e);
  }

  /* Cuántas celdas avanzar con una velocidad que no es entera. La parte
     entera va segura y la fracción se juega a los dados: a la larga da la
     velocidad exacta, y a corto plazo evita que todo lo que va a menos de una
     celda por paso se quede clavado o, peor, se vaya al revés. */
  pasosDe(v){
    if(v <= 0) return 0;
    const ent = Math.floor(v);
    return Math.min(6, ent + (this.rnd() < v - ent ? 1 : 0));
  }

  vecinoAzar(x, y){
    const d = [[0,-1],[0,1],[-1,0],[1,0]][(this.rnd()*4)|0];
    return [x + d[0], y + d[1]];
  }

  vecinoCaliente(x, y, e){
    const min = 260;
    for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
      if(!this.dentro(x+dx, y+dy)) continue;
      const k = this.i(x+dx, y+dy);
      const v = EL[this.t[k]];
      if(v.id === 'fuego' || v.calor) return true;
      if(this.temp[k] > min) return true;
    }
    return false;
  }

  reacciona(x, y, k, tipo){
    for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
      if(!this.dentro(x+dx, y+dy)) continue;
      const k2 = this.i(x+dx, y+dy);
      const r = TABLA.get(clave(tipo, this.t[k2]));
      if(!r) continue;
      /* hay reacciones que necesitan una CHISPA: no pasan solas por estar
         juntas, hace falta que alguien las encienda */
      /* la condición de encendido: CALOR o PRESIÓN, cualquiera de las dos.
         La segunda es la que pidió Carlos para fusionar hidrógeno y oxígeno
         sin chispa — apretarlos en una cámara sellada. */
      if(r.t > -1e8 && this.temp[k] < r.t && this.temp[k2] < r.t &&
         !(this.pres[k] >= r.pr || this.pres[k2] >= r.pr)) continue;
      if(this.rnd() > r.p) continue;
      const antesA = this.t[k], antesB = this.t[k2];
      this.t[k] = r.a; this.vida[k] = 0;
      this.t[k2] = r.b; this.vida[k2] = 0;
      if(r.a !== antesA) this.nace(r.a);
      if(r.b !== antesB) this.nace(r.b);
      if(r.q){ this.temp[k] += r.q * .35; this.temp[k2] += r.q * .35; }
      return;
    }
  }

  corroe(x, y, k, e){
    for(const [dx, dy] of [[0,1],[0,-1],[-1,0],[1,0]]){
      if(!this.dentro(x+dx, y+dy)) continue;
      const k2 = this.i(x+dx, y+dy);
      const v = EL[this.t[k2]];
      /* ⚠ LA LISTA ESTABA ESCRITA A MANO —«acido» y «muro»— y en cuanto entró
         un segundo corrosivo se rompió sola: el hidronio se corroía A SÍ MISMO
         y se gastaba en tres pasos, así que la reacción funcionaba y el
         producto desaparecía antes de poder verlo. Lo que no se corroe no es
         una lista de nombres: es lo inamovible y lo que también corroe. */
      if(this.t[k2] === VACIO || v.corroe || v.fijo) continue;
      /* ⚠ Si para este par HAY una reacción escrita, manda la reacción y no la
         corrosión. Sin esto el ácido se comía el agua antes de que pudiera
         reaccionar con ella, y el hidronio no se formaba nunca: la regla
         existía y otra la pisaba. Dos mecanismos peleando por el mismo par. */
      if(TABLA.has(clave(this.t[k], this.t[k2]))) continue;
      if(this.rnd() < e.corroe * (1 - (v.dureza || 0))){
        this.cambia(k2, this.rnd() < .3 ? IDX.humo : VACIO);
        if(this.rnd() < .18) this.cambia(k, VACIO);   /* el ácido se gasta */
        return;
      }
    }
  }

  crece(x, y){
    const arr = [[0,-1],[-1,-1],[1,-1],[-1,0],[1,0]];
    const [dx, dy] = arr[(this.rnd()*arr.length)|0];
    if(!this.dentro(x+dx, y+dy)) return;
    const k2 = this.i(x+dx, y+dy);
    if(this.t[k2] !== VACIO) return;
    /* sólo crece si tiene agua cerca: una planta que crece en el vacío es un
       adorno, no una simulación */
    if(!this.hayCerca(x, y, IDX.agua, 3) && !this.hayCerca(x, y, IDX.salada, 3)) return;
    this.cambia(k2, IDX.planta, true);
  }

  germina(x, y, k){
    if(this.rnd() > .01) return;
    const abajo = this.dentro(x, y+1) ? this.t[this.i(x, y+1)] : IDX.muro;
    if(abajo !== IDX.tierra) return;
    if(!this.hayCerca(x, y, IDX.agua, 4)) return;
    this.cambia(k, IDX.planta, true);
  }

  hayCerca(x, y, tipo, r){
    for(let dy = -r; dy <= r; dy++)
      for(let dx = -r; dx <= r; dx++){
        if(!this.dentro(x+dx, y+dy)) continue;
        if(this.t[this.i(x+dx, y+dy)] === tipo) return true;
      }
    return false;
  }

  /* ── movimiento ───────────────────────────────────────────────────────
     Con VELOCIDAD, no «una celda por paso». La diferencia se ve en cuanto
     sueltas un montón: antes cada partícula decidía sola cada cuadro y el
     bloque se desmoronaba; ahora todas llevan la misma velocidad, caen
     juntas y aceleran. */
  mueve(x, y, k, e){
    const est = this.estadoDe(k);

    /* ── SÓLIDOS CON FÍSICA ────────────────────────────────────────────────
       Carlos: «ponle físicas a los sólidos o sea que puedan moverse caerse
       etc no solo el polvo y el gas porque si no cómo creo una pistola que
       dispare un proyectil». Aquí salía `return` a secas: un sólido era un
       decorado clavado en su celda. El pistón lo empujaba y no se movía, una
       explosión no lanzaba metralla, y un proyectil era imposible.

       Ahora caen y se pueden lanzar. Lo único que no se mueve es lo FIJO —el
       muro— y lo que el sostén estructural dice que está agarrado a algo.
       Sin ese sostén, el techo de cualquier caja se desploma hacia dentro en
       el primer paso, porque debajo tiene el hueco de la caja. */
    if(est === 'solido'){
      if(e.fijo){ this.vy[k] = 0; this.vx[k] = 0; return; }
      /* ⚠ Si esta celda es parte de una pieza que flota, YA la movió
         `globoPaso` como conjunto — y moverla otra vez por su cuenta es lo que
         volvía a implosionar el globo: la cáscara de abajo se metía hacia
         dentro celda por celda justo después de que la pieza entera subiera.
         Un cuerpo se mueve una vez por paso, no dos. */
      if(this.flotante[k]) return;
      const lanzado = this.vy[k] < -0.35 || this.vx[k] > 0.35 || this.vx[k] < -0.35;
      /* ── LO QUE NO SE SOSTIENE, SE CAE ─────────────────────────────────
         Y esto lo decidió Carlos sin saberlo, con la frase con que cerró el
         encargo: «deja un muro inamovible POR SI QUIERO HACER ALGO ESPECIAL».
         Pedir una excepción es dar por hecho que lo demás se mueve.
         Probé antes un modelo más cómodo —lo pintado se queda anclado hasta
         que algo lo golpee— y lo tiré: hacía que borrarle la base a una torre
         la dejara flotando, que es justo lo primero que él va a intentar.
         Se sostiene lo que está pegado, por una cadena de sólidos, a algo
         inamovible, al suelo, o a algo por lo que no puede colarse. Para
         clavar cualquier cosa en el aire está el muro. */
      if(!lanzado && this.sop[k]){ this.vy[k] = 0; this.vx[k] = 0; return; }
      /* un sólido no se escurre en diagonal: eso es lo que separa un ladrillo
         de un grano de arena. Cae recto, o se queda donde topó. */
      if(!this.flotante[k]){
        this.gravedadEn(x, y, k);
        const gx = this._gx, gy = this._gy;
        /* Un cuerpo sumergido en un medio siente g·(1 − ρmedio/ρcuerpo): si
           pesa menos que el aire, sale negativo y sube. Un solo número para la
           gravedad y la flotación, en la dirección que sea. */
        const f = 1 - DENS_AIRE / (e.dens || 1);
        this.vy[k] = Math.max(-VMAX, Math.min(this.vy[k] + gy * f, VMAX));
        this.vx[k] = Math.max(-VMAX, Math.min(this.vx[k] + gx * f, VMAX));
      }
      this.arrastra(k, e);
      let cx = x, cy = y, ck = k;
      /* ⚠ CELDAS ENTERAS PARA VELOCIDADES FRACCIONARIAS: el mismo defecto de
         la tanda pasada, en otro umbral. Un globo sube a 0.18 celdas por paso;
         con `floor` eso son CERO celdas, y el código se iba a la rama de caer
         y lo hacía bajar una. Una velocidad hacia arriba pequeña se convertía
         en caída. Ahora la parte fraccionaria se juega a los dados —con el
         azar propio, que tiene semilla, así que sigue siendo reproducible— y
         un cuerpo que sube a 0.18 sube una celda cada cinco o seis pasos, que
         es exactamente lo que quiere decir 0.18 celdas por paso. */
      const vy = this.vy[ck];
      if(vy < 0){
        const subidas = this.pasosDe(-vy);
        let subio = false;
        for(let i = 0; i < subidas; i++){
          if(!this.trata(cx, cy, ck, cx, cy - 1, e)) break;
          cy--; ck = this.i(cx, cy); subio = true;
        }
        if(!subio && subidas > 0) this.vy[ck] = 0;
      } else {
        const saltos = this.pasosDe(vy);
        let cayo = false, topo = false;
        for(let i = 0; i < saltos; i++){
          if(!this.trata(cx, cy, ck, cx, cy + 1, e)){ topo = true; break; }
          cy++; ck = this.i(cx, cy); cayo = true;
        }
        /* ⚠ EL GOLPE SE MIDE AL TOPAR, NO AL NO MOVERSE. Aquí decía
           `if(!cayo)`, o sea que sólo contaba el impacto cuando el cuerpo no
           había avanzado NI UNA celda en el cuadro… y un cuerpo en caída
           avanza cinco o seis y LUEGO topa. Con eso ningún golpe de verdad se
           contaba nunca: un proyectil de osmio a velocidad terminal no le
           hacía ni un rasguño a una losa de piedra, y la fórmula de la energía
           estaba perfecta. El defecto no estaba en el cálculo, estaba en
           cuándo se llamaba. */
        if(topo && this.dentro(cx, cy + 1)) this.impacta(ck, e, this.i(cx, cy + 1));
        if(!cayo && saltos > 0) this.vy[ck] *= .1;
        else if(topo) this.vy[ck] *= .18;
      }
      this.roza(ck, e);
      if(this.vx[ck] > .35 || this.vx[ck] < -.35){
        const d = this.vx[ck] > 0 ? 1 : -1;
        if(this.trata(cx, cy, ck, cx + d, cy, e)){ cx += d; ck = this.i(cx, cy); }
        else this.vx[ck] = 0;
        this.vx[ck] *= .88;
      }
      return;
    }

    if(est === 'gas' || est === 'energia'){
      if(this.burbujea(x, y, k, e)) return;
      /* ── LOS GASES VAN POR FLOTACIÓN, NO «HACIA ARRIBA» ──────────────────
         Antes TODOS subían, sin más. Eso hace que el CO₂ suba —y el CO₂ pesa
         una vez y media lo que el aire: se acumula en el suelo, que es por lo
         que asfixia en un sótano y por lo que sirve para apagar un fuego—, y
         hace imposible un globo, porque si todo sube da igual con qué lo
         llenes. Ahora manda la densidad contra la del aire, y con eso el
         helio y el hidrógeno suben, el vapor sube, y el CO₂ y el oxígeno
         bajan. Uno solo número decide, y decide bien. */
      const d = e.dens || 0;
      this.gravedadEn(x, y, k);
      const ggx = this._gx, ggy = this._gy;
      /* ⚠ «Arriba» no es «y menor»: es CONTRA LA GRAVEDAD. Con la gravedad
         invertida, un globo tiene que bajar y una piedra subir, y si esto se
         quedara clavado en −1 el helio seguiría trepando al techo en un mundo
         del revés. Con gravedad cero no hay arriba ni abajo y el gas se queda
         difundiendo, que es exactamente lo que hace. */
      const ligero = d < DENS_AIRE;
      let dy = 0, dxg = 0;
      if(ggy > 0.005) dy = ligero ? -1 : 1;
      else if(ggy < -0.005) dy = ligero ? 1 : -1;
      if(ggx > 0.005) dxg = ligero ? -1 : 1;
      else if(ggx < -0.005) dxg = ligero ? 1 : -1;
      const sube = dy === -1;
      /* ── EL GLOBO ────────────────────────────────────────────────────────
         Un gas que quiere subir y tiene un sólido encima le PASA su empuje.
         Eso es literalmente lo que hace un globo: el helio no tira de la tela,
         la empuja desde dentro. Con esto, cualquier cáscara que Carlos
         construya y llene de helio se levanta sola, sin un elemento «globo»
         inventado ni un caso especial. */
      if(sube && this.dentro(x, y - 1)){
        const ka = this.i(x, y - 1);
        if(this.t[ka] !== VACIO && this.estadoDe(ka) === 'solido' && !EL[this.t[ka]].fijo){
          /* ⚠ Y SE DIVIDE ENTRE LA MASA DEL SÓLIDO, que es lo que faltaba.
             Sin eso, una sola celda de hidrógeno —lo más ligero que hay—
             levantaba una VÁLVULA de densidad 29 y la arrancaba de la pared
             de un recipiente. Se veía como «la válvula cerrada tiene fugas» y
             lo que pasaba era que el gas se llevaba la válvula puesta.
             Un empuje es una fuerza; lo que se le comunica a un cuerpo es
             fuerza entre masa. Aquí faltaba la masa.
             Y NO se suelta el sólido: quién despega de verdad lo decide
             `globoPaso`, que pesa la cáscara entera contra el aire que
             desplaza. Una celda suelta no puede tomar esa decisión. */
          this.vy[ka] -= (DENS_AIRE - d) * 0.55 / (EL[this.t[ka]].dens || 1);
        }
      }
      const dirs = dy === 0 && dxg === 0
        ? [[0,-1],[0,1],[-1,0],[1,0]]                     /* sin gravedad: difunde */
        : [[dxg,dy],[dxg,dy],[dxg-1,dy],[dxg+1,dy],[-1,0],[1,0]];
      const veces = (e.sube || 1) + 2;
      for(let i = 0; i < veces; i++){
        const [ddx, ddy] = dirs[(this.rnd()*dirs.length)|0];
        if(this.trata(x, y, k, x+ddx, y+ddy, e)) return;
      }
      return;
    }

    /* ── vuelo y caída ───────────────────────────────────────────────────
       ⚠ AQUÍ FALTABA LA MITAD DEL MOVIMIENTO Y NO SE VEÍA. Esto sólo sabía
       CAER: `saltos = max(1, floor(vy))` con una velocidad negativa daba 1, o
       sea que un objeto lanzado hacia arriba... bajaba una celda. El pistón
       empujaba en vano, el resorte devolvía nada y una explosión no levantaba
       nada del suelo. Todo el sistema de velocidad estaba a medias y las
       pruebas del motor pasaban igual, porque todas medían cosas cayendo.
       Ahora si la velocidad apunta hacia arriba, SUBE. */
    {
      this.gravedadEn(x, y, k);
      const gx = this._gx, gy = this._gy;
      const f = 1 - DENS_AIRE / (e.dens || 1);
      this.vy[k] = Math.max(-VMAX, Math.min(this.vy[k] + gy * f, VMAX));
      this.vx[k] = Math.max(-VMAX, Math.min(this.vx[k] + gx * f, VMAX));
    }
    this.arrastra(k, e);
    let cx = x, cy = y, ck = k, cayo = false;

    if(this.vy[ck] < -0.5){
      const subidas = Math.min(6, Math.floor(-this.vy[ck]));
      let subio = false;
      for(let i = 0; i < subidas; i++){
        if(!this.trata(cx, cy, ck, cx, cy - 1, e)) break;
        cy--; ck = this.i(cx, cy); subio = true;
      }
      if(subio){
        /* el impulso lateral también cuenta mientras vuela */
        if(Math.abs(this.vx[ck]) > .35){
          const d = this.vx[ck] > 0 ? 1 : -1;
          if(this.trata(cx, cy, ck, cx + d, cy, e)){ cx += d; ck = this.i(cx, cy); }
          this.vx[ck] *= .9;
        }
        return;
      }
      /* chocó con el techo: pierde el impulso hacia arriba */
      this.vy[ck] = 0;
    }

    const saltos = Math.max(1, Math.floor(this.vy[ck]));
    for(let i = 0; i < saltos; i++){
      if(!this.trata(cx, cy, ck, cx, cy + 1, e)) break;
      cy++; ck = this.i(cx, cy); cayo = true;
    }
    if(cayo){
      /* si le quedaba impulso lateral, lo gasta mientras cae */
      if(Math.abs(this.vx[ck]) > .35){
        const d = this.vx[ck] > 0 ? 1 : -1;
        if(this.trata(cx, cy, ck, cx + d, cy, e)){ cx += d; ck = this.i(cx, cy); }
        this.vx[ck] *= .82;
      }
      return;
    }
    /* topó: pierde casi toda la velocidad vertical, como un golpe */
    this.vy[ck] *= .18;

    /* impulso lateral suelto — es lo que lanza las cosas en una explosión */
    if(Math.abs(this.vx[ck]) > .35){
      const d = this.vx[ck] > 0 ? 1 : -1;
      if(this.trata(cx, cy, ck, cx + d, cy, e)){ ck = this.i(cx + d, cy); cx += d; }
      this.vx[ck] *= .74;
      if(Math.abs(this.vx[ck]) < .35) this.vx[ck] = 0;
    }

    x = cx; y = cy; k = ck;
    const izqPrim = this.rnd() < .5;
    const d1 = izqPrim ? -1 : 1, d2 = -d1;
    if(this.trata(x, y, k, x+d1, y+1, e)) return;
    if(this.trata(x, y, k, x+d2, y+1, e)) return;

    if(est === 'liquido'){
      /* Los líquidos se ESPARCEN, pero sólo hacia donde puedan BAJAR.
         ⚠ Antes se esparcían hacia cualquier hueco de al lado, y eso tenía una
         consecuencia que no se ve leyendo: en un canal cerrado el agua se
         agitaba para siempre, cambiando de sitio cada paso sin ir a ningún
         lado. Con eso, un canal de agua salada rompía y rehacía la cadena en
         cada cuadro y la corriente NUNCA llegaba al otro extremo. El circuito
         parecía mal y lo que estaba mal era el oleaje.

         Un líquido fluye de lado buscando por dónde descender. Si no hay
         descenso en todo su alcance, se queda quieto — que es lo que hace el
         agua en un tubo lleno. */
      /* ⚠ Y EL CAMINO ENTERO TIENE QUE ESTAR LIBRE, NO SÓLO EL DESTINO.
         Esto era un agujero de los gordos: el bucle miraba únicamente la celda
         final, así que con alcance 5 un líquido SALTABA POR ENCIMA DE UN MURO
         y aparecía del otro lado. El agua atravesaba paredes, el vidrio
         fundido se fugaba del crisol y el agua salada se salía de su canal —
         y los tres se veían como «la reacción no funciona», nunca como lo que
         era. Se camina celda por celda y se para en el primer estorbo. */
      const alcance = 5;
      for(const d of [d1, d2]){
        for(let i = 1; i <= alcance; i++){
          const nx = x + d * i;
          if(!this.dentro(nx, y)) break;
          const kl = this.i(nx, y);
          if(this.t[kl] !== VACIO) break;          /* topé con algo: hasta aquí */
          if(!this.puedeBajar(nx, y, e)) continue; /* libre, pero no baja: sigo mirando */
          if(this.trata(x, y, k, nx, y, e)) return;
        }
      }
      /* ── EL AGUA SE NIVELA ────────────────────────────────────────────
         Carlos: «el agua suele volverse una pila en lugar de distribuirse
         bien». Medido: al verter una columna en un estanque quedaba el perfil
         1111222222333334444333333222222111 — un cerro de tres celdas de
         desnivel— y se quedaba ASÍ para siempre: idéntico en el paso 100 y en
         el 1200. No es que tardara: es que no se movía.

         La causa era la regla de arriba, puesta a propósito para matar un
         oleaje eterno: un líquido sólo se mueve de lado si desde ahí puede
         BAJAR. En un charco lleno no se puede bajar en ninguna parte, así que
         lo que cae encima se apila. Correcto para un tubo, falso para un
         estanque.

         Lo que faltaba es que la SUPERFICIE se reparta. Una celda de líquido
         que no tiene nada encima —o sea, la superficie— puede correrse a un
         hueco de al lado que sí tenga suelo. Eso es un paseo al azar por la
         superficie, y un paseo al azar aplana un cerro: es difusión, la misma
         razón por la que la arena de un montón acaba extendida.

         ⚠ Y AQUÍ ESTÁ EL FRENO QUE EVITA EL OLEAJE DE ANTES, que no es un
         tope de pasos sino la propia condición: dentro de un tubo lleno TODA
         celda tiene líquido encima, así que ninguna entra por aquí. El
         defecto viejo —el canal de agua salada agitándose y rompiendo la
         cadena eléctrica cada cuadro— no puede volver, y sigue habiendo
         prueba que lo vigila. */
      /* ⚠ Y HACE FALTA TENER LÍQUIDO DEBAJO, no sólo aire encima. Sin esa
         condición un charco de UNA celda de hondo se paseaba solo por el suelo
         para siempre —un paseo al azar sin nada que lo empuje—, y eso reventó
         la prueba de la nitroglicerina: el reguero se había caminado a otro
         lado antes de que le cayera la piedra encima. Lo que aplana un cerro
         es el peso del agua de arriba; donde no hay agua encima de agua no hay
         nada que repartir, y entonces no se mueve. */
      const arriba = y > 0 ? this.i(x, y - 1) : -1;
      const abajo = y < this.al - 1 ? this.i(x, y + 1) : -1;
      if((arriba < 0 || this.t[arriba] === VACIO) &&
         abajo >= 0 && this.t[abajo] !== VACIO && this.estadoDe(abajo) === 'liquido'){
        for(const d of [d1, d2]){
          const nx = x + d;
          if(!this.dentro(nx, y)) continue;
          const kl = this.i(nx, y);
          if(this.t[kl] !== VACIO) continue;
          if(!this.dentro(nx, y + 1)) continue;
          if(this.t[this.i(nx, y + 1)] === VACIO) continue;  /* ahí no hay suelo */
          if(this.trata(x, y, k, nx, y, e)) return;
        }
      }
    }
  }

  /* ── FRICCIÓN Y CONTACTO ──────────────────────────────────────────────
     Carlos: «una pared no se rompe si la roza un objeto… debes meter también
     la fricción», y separó él mismo las siete cosas que no son lo mismo:
     contacto, rozamiento, fuerza normal, impacto, corte, deformación y
     fractura. Aquí están las dos que faltaban.

     ROZAR es tangencial y sólo FRENA. Cuánto, lo deciden los dos materiales:
     manda el más áspero. El hielo resbala, la arena agarra. */
  roza(k, e){
    const vx = this.vx[k];
    if(vx > -0.02 && vx < 0.02) return;
    const x = k % this.an, y = (k / this.an) | 0;
    let mu = 0;
    for(const [dx, dy] of [[0,1],[0,-1]]){          /* el suelo y el techo */
      if(!this.dentro(x + dx, y + dy)) continue;
      const k2 = this.i(x + dx, y + dy);
      if(this.t[k2] === VACIO) continue;
      const ev = this.estadoDe(k2);
      if(ev !== 'solido' && ev !== 'polvo') continue;
      const m2 = EL[this.t[k2]].friccion;
      const m1 = e.friccion;
      const c = Math.max(m1 == null ? 0.35 : m1, m2 == null ? 0.35 : m2);
      if(c > mu) mu = c;
    }
    if(mu === 0) return;
    this.vx[k] = vx * (1 - mu * 0.55);
    if(this.vx[k] > -0.02 && this.vx[k] < 0.02) this.vx[k] = 0;
  }

  /* GOLPEAR es otra cosa. Lo que rompe un material no es tocarlo: es la
     ENERGÍA que le entra de golpe, ½·m·v², contra lo que ese material aguanta.
     Con eso, rozar una pared a 0.3 celdas por paso no le hace nada —la energía
     es cien veces menor que su tenacidad— y un proyectil a 6 sí la abolla.
     La misma fórmula para los dos casos, que es justo lo que él pedía:
     «si un objeto simplemente roza una pared con una fuerza pequeña, la pared
     no debería romperse, pero si existe suficiente fuerza, velocidad o
     repetición del esfuerzo, entonces sí». */
  impacta(k, e, k2){
    const vy = this.vy[k], vx = this.vx[k];
    const v2 = vy*vy + vx*vx;
    if(v2 < 4) return;                       /* por debajo de 2 celdas/paso no marca */
    const v = EL[this.t[k2]];
    if(v.fijo) return;                       /* el muro no cede: para eso está */
    const energia = 0.5 * (e.dens || 1) * v2;
    /* la tenacidad sale de la dureza y de la densidad: un material duro y
       pesado aguanta más que uno duro y ligero */
    const aguanta = 40 + (v.dureza || 0) * 900 + (v.dens || 1) * 4;
    if(energia < aguanta) return;
    /* pasa de aguantar: se abolla. El daño se acumula en `vida`, así que la
       REPETICIÓN también rompe — que es el desgaste que él nombró. */
    this.vida[k2] += Math.round((energia - aguanta) / 10);
    this.suelto[k2] = 1;
    if(this.vida[k2] > 40){
      this.cambia(k2, VACIO);
      this.suelta(k2 % this.an, (k2 / this.an) | 0, 2);
    }
  }

  /* ── FLOTACIÓN ────────────────────────────────────────────────────────
     Cuánta gravedad le quita al cuerpo el medio que desplaza. Si el cuerpo
     pesa menos que el aire, sale negativo y SUBE — que es lo que hace que una
     cáscara ligera se levante sin ningún caso especial. */
  flota(k, e){
    const d = e.dens || 1;
    if(d <= 0) return 0;
    return GRAVEDAD * (DENS_AIRE / d);
  }

  /* ── RESISTENCIA DEL AIRE ─────────────────────────────────────────────
     Carlos la pidió por su nombre. Es cuadrática, como la de verdad, y va
     dividida por la densidad: por eso la ceniza revolotea y el hierro cae a
     plomo. La velocidad terminal sale sola de igualar arrastre y gravedad —
     √(g·densidad / (c·aire))—, así que no hay una tabla de «qué tan rápido
     cae cada cosa»: hay una fórmula y ciento ochenta y cinco densidades. */
  arrastra(k, e){
    const d = e.dens || 1;
    const c = 0.5 * DENS_AIRE / (d > 0.05 ? d : 0.05);
    const vy = this.vy[k], vx = this.vx[k];
    if(vy > 0.02 || vy < -0.02) this.vy[k] = vy - c * vy * (vy > 0 ? vy : -vy);
    if(vx > 0.02 || vx < -0.02) this.vx[k] = vx - c * vx * (vx > 0 ? vx : -vx);
  }

  /* ¿Desde aquí se puede descender? Es lo que separa fluir de agitarse. */
  puedeBajar(x, y, e){
    if(!this.dentro(x, y + 1)) return false;
    const k2 = this.i(x, y + 1);
    const d = this.t[k2];
    if(d === VACIO) return true;
    const v = EL[d];
    const ev = this.estadoDe(k2);
    if(ev === 'solido' || ev === 'polvo') return false;
    return (v.dens || 0) < (e.dens || 0);
  }

  /* ── Gases DENTRO de líquidos ───────────────────────────────────────────
     Carlos: «haz que pueda poner cosas dentro de otras, como gas dentro del
     agua». Antes era imposible: un gas sólo entraba a un hueco, así que al
     pintarlo sobre agua se quedaba encima. Ahora un gas puede meterse en un
     líquido —queda disuelto— y sube en burbujas hasta salir, que es lo que
     hace de verdad. */
  burbujea(x, y, k, e){
    if(e.estado !== 'gas' || this.t[k] === VACIO) return false;
    const arr = this.dentro(x, y-1) ? this.i(x, y-1) : -1;
    if(arr < 0) return false;
    const v = EL[this.t[arr]];
    if(v.estado !== 'liquido') return false;
    /* sube a través del líquido: el gas es siempre menos denso */
    this.intercambia(k, arr);
    return true;
  }

  /* Devuelve true si se movió. La regla de oro: sólo se pasa a un hueco o se
     intercambia con algo MENOS DENSO. Eso solo ya da que el aceite flote sobre
     el agua y que la piedra se hunda en la lava, sin una línea por cada caso. */
  trata(x, y, k, nx, ny, e){
    if(!this.dentro(nx, ny)) return false;
    const k2 = this.i(nx, ny);
    /* ⚠ EL CHOQUE SE MIRA ANTES QUE NADA. Estaba más abajo, después de la
       guarda de «esta celda ya se movió este cuadro»… y el líquido de abajo se
       procesa ANTES que el cuerpo que le cae encima, así que casi siempre ya
       se había movido y `trata` salía en la primera línea sin llegar a mirar
       el impacto. La nitro aguantaba una piedra de osmio a plomo. */
    {
      const d0 = this.t[k2];
      if(d0 !== VACIO && EL[d0].golpe){
        const rel = Math.abs(this.vy[k] - this.vy[k2]) + Math.abs(this.vx[k] - this.vx[k2]);
        /* ⚠ SE GUARDA EL SITIO Y LA FUERZA, NO EL ÍNDICE DE LA CELDA. Guardé
           el índice y para cuando se resolvía la detonación el que había
           entrado YA OCUPABA esa celda: se leía «osmio, esto no explota» y se
           descartaba en silencio. La nitro aguantaba una piedra a plomo y el
           choque sí se estaba detectando. */
        if(rel > EL[d0].golpe)
          this._detona.push([nx, ny, EL[d0].explota || 6]);
      }
    }
    if(this.mov[k2]) return false;
    const dest = this.t[k2];
    /* ⚠ aquí decía `if(dest === k)`: comparaba un TIPO con un ÍNDICE de celda.
       No truena y casi siempre da falso, así que pasa desapercibido — pero el
       día que el número de un tipo coincide con el de una celda, esa celda
       deja de moverse sin motivo. Manzanas con naranjas. */
    if(dest === VACIO){ this.intercambia(k, k2); return true; }
    const v = EL[dest];
    /* ⚠ UN CUERPO RÁPIDO SE SALTA A SUS VECINOS. La nitro miraba a los cuatro
       lados buscando algo que llegara deprisa… y una piedra de osmio pasa de
       y=54 a y=58 en UN paso: nunca está pegada, se le mete dentro de golpe.
       Comprobarlo desde el que recibe no funciona con velocidades altas.
       Aquí sí, porque `trata` es por donde pasa TODO movimiento: el choque se
       detecta en el instante en que uno entra donde está el otro. */
    const ev = this.estadoDe(k2);
    /* Una VÁLVULA ABIERTA deja pasar lo que no es sólido. Cerrada es una
       pared como cualquier otra, y por eso contiene la presión. */
    if(ev === 'solido' && v.valvula && this.valvulaAbierta(k2) && e.estado !== 'solido'){
      this.intercambia(k, k2); return true;
    }
    if(ev === 'solido' || ev === 'polvo') return false;
    if((v.dens || 0) < (e.dens || 0)){ this.intercambia(k, k2); return true; }
    return false;
  }

  /* ── calor: difusión entre vecinos ───────────────────────────────────── */
  calor(){
    const { an, al, temp, t } = this;
    const nuevo = this._temp2;
    nuevo.set(temp);
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k = y * an + x;
        const e = EL[t[k]];
        if(e.calor){ nuevo[k] = Math.max(temp[k], e.id === 'lava' ? 1150 : 820); continue; }
        /* Salto rápido: si esta celda y las de al lado ya están al ambiente,
           no hay nada que transferir. En una sala grande la enorme mayoría de
           las celdas están en reposo, y comprobarlo cuesta mucho menos que
           calcular. */
        const dT = temp[k] - AMBIENTE;
        if(dT > -0.35 && dT < 0.35){
          const ar = y > 0 ? temp[k-an] : AMBIENTE, ab = y < al-1 ? temp[k+an] : AMBIENTE;
          const iz = x > 0 ? temp[k-1] : AMBIENTE, de = x < an-1 ? temp[k+1] : AMBIENTE;
          if(Math.abs(ar-AMBIENTE) < .35 && Math.abs(ab-AMBIENTE) < .35 &&
             Math.abs(iz-AMBIENTE) < .35 && Math.abs(de-AMBIENTE) < .35){
            nuevo[k] = AMBIENTE; continue;
          }
        }
        let suma = 0, cuenta = 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const px = x+dx, py = y+dy;
          if(px < 0 || py < 0 || px >= an || py >= al) continue;
          const k2 = py * an + px;
          let c = Math.min(e.cond || .1, EL[t[k2]].cond || .1);
          /* ── CONVECCIÓN: EL AIRE NO CONDUCE, ACARREA ────────────────────
             Carlos: «el aire (vacío) no transfiere el calor, así que una
             resistencia muy cerca de una batería no la calienta». Medido antes
             de tocar nada: a UNA celda de una fuente a 900° el aire marcaba
             32.8°, y a DOS ya estaba en los 22° del ambiente. Muerto.

             Y la conductividad no era el error: el aire de verdad conduce
             malísimo —0.026 contra 0.6 del agua—, así que ese 0.02 estaba
             bien puesto. Lo que faltaba es lo OTRO que hace el aire, que es
             cien veces más fuerte: moverse. El aire caliente sube y se lleva
             el calor encima. Por eso una vela calienta el techo y no la pared.

             Aquí no hay celdas de aire que mover —el vacío es vacío a
             propósito, y eso es lo que hace que quepan 150 mil celdas—, así
             que la convección se escribe en la propia ecuación: entre celdas
             donde hay hueco, la conducción se multiplica, y el intercambio
             hacia ARRIBA pesa más que hacia los lados y mucho más que hacia
             abajo. Sale una pluma de calor que sube, que es lo que se ve. */
          if(t[k] === VACIO || t[k2] === VACIO){
            /* ⚠ Y EL BORDE NO VALE LO MISMO QUE EL AIRE LIBRE. Al principio
               puse el mismo número para todo y rompí cuatro pruebas de golpe:
               el agua a 130° dejaba de hervir porque se enfriaba 21° por paso
               contra el aire. Y estaba bien que fallara — con un solo número,
               una olla al rojo en una cocina se enfriaría en tres segundos.
               En la realidad el cuello de botella es justo el borde: el calor
               le cuesta SALIR del sólido al aire (eso es el coeficiente de
               película), y una vez fuera el aire lo acarrea rapidísimo. Son
               dos números y por eso son dos. */
            c = Math.max(c, (t[k] === VACIO && t[k2] === VACIO) ? CONVEC : CONVEC_BORDE);
            /* ⚠ AQUÍ HABÍA UN SESGO HACIA ARRIBA —el de abajo me pasaba 2.6
               veces más calor que el de al lado— para que la pluma subiera
               como sube la de una vela. Se quitó, y no por gusto: DENTRO de
               un recipiente cerrado ese sesgo calienta el gas de abajo más que
               el de arriba, el gas de abajo se expande más, y el bote se
               empuja a sí mismo. La prueba lo cazó exactamente así: un
               recipiente CERRADO y sin gravedad subía 1.67 celdas solo.
               Un cacharro que se mueve sin tirar nada afuera es una máquina de
               movimiento perpetuo, y eso pesa más que lo bonita que se veía la
               pluma. La convección queda igual en las cuatro direcciones. */
          }
          suma += (temp[k2] - temp[k]) * c;
          cuenta++;
        }
        /* ── MASA TÉRMICA ────────────────────────────────────────────────
           ⚠ Carlos, dos veces: «las zonas calientes y frías se quedan activas
           siempre, deben respetar la transferencia de energía». Tenía razón y
           yo lo había dado por arreglado sin medirlo. Medido ahora: una zona
           caliente pintada en el VACÍO tardaba MIL pasos —dieciséis segundos—
           en volver al ambiente.

           La causa es que el retorno al ambiente era una constante igual para
           todo, y eso ignora la física: el vacío no tiene masa que calentar,
           así que no puede guardar calor. Un ladrillo sí. Ahora la pérdida
           depende de la densidad — poca masa, se enfría rápido; mucha masa,
           aguanta. Que es exactamente por qué una olla de hierro conserva el
           guiso y el aire de la cocina no. */
        const masa = t[k] === 0 ? 0 : (e.dens || 1);
        /* ⚠ ESTE 0.34 ERA EL QUE MATABA LA PLUMA, y estaba puesto por una
           razón buena: Carlos se quejó DOS VECES de que una zona caliente
           pintada en el vacío tardaba mil pasos en enfriarse. La respuesta
           entonces fue subir la pérdida del hueco, y con eso el aire ya no
           guardaba calor… ni lo dejaba pasar. Se arreglaba el síntoma de un
           reporte creando el del siguiente.
           Lo correcto es separarlos: el aire pierde rápido su calor PROPIO
           (poca masa) pero no tanto como para no poder pasárselo al vecino en
           el mismo paso. Con 0.12 la pluma llega a ocho celdas y una mancha
           caliente suelta vuelve al ambiente en ~40 pasos, no en mil. */
        const perdida = masa === 0 ? 0.085 : Math.min(0.09, 0.9 / (8 + masa));
        nuevo[k] = temp[k] + suma * .22 + (AMBIENTE - temp[k]) * perdida;
      }
    }
    this.temp = nuevo;
  }

  /* ── ELECTRICIDAD ──────────────────────────────────────────────────────
     ⚠ REESCRITA, Y EL DEFECTO ERA GORDO: la versión anterior encendía una
     celda si CUALQUIER vecino tenía carga. Eso se retroalimenta — el cable A
     se alimenta de B y B de A — así que en cuanto la corriente llegaba a un
     tramo, ese tramo se quedaba encendido PARA SIEMPRE aunque cortaras la
     batería. Se veía funcionar de maravilla mientras sólo encendías cosas;
     el día que quieres APAGAR algo, no se apaga, y ahí es donde Carlos dijo
     que esto estaba «raro de operar». Tenía razón y era esto.

     Ahora la corriente se reparte desde las FUENTES con un recorrido en
     anchura, guardando a qué distancia está cada celda. Sin camino hasta una
     fuente no hay carga, así que cortar el circuito lo apaga de verdad. */
  electricidad(){
    const { an, al, t, car } = this;
    const n = car.length;
    const sig = new Uint8Array(n);
    const dist = new Uint8Array(n).fill(255);
    const cola = [];
    const colaPuertas = [];   /* reparten DESPUÉS, ver el porqué abajo */

    /* 1 · quién es fuente ESTE paso. Las compuertas se resuelven con la carga
       del paso anterior, que es lo que les da su retardo de un cuadro — y ese
       retardo es justo lo que permite hacer memorias y osciladores. */
    for(let y = 0; y < al; y++) for(let x = 0; x < an; x++){
      const k = y * an + x, e = EL[t[k]];
      if(!e.elec) continue;
      let esFuente = false;
      if(e.fuente) esFuente = true;
      /* PILA RECARGABLE: `vida` es la carga que le queda. Se gasta mientras
         entrega y se recupera con calor — que es lo que pidió Carlos: «que las
         baterías se acaben y puedan recargarse». */
      else if(e.pila){
        if(this.vida[k] === 0 && this.paso_ < 3) this.vida[k] = e.pila;
        if(this.temp[k] > 90 && this.vida[k] < e.pila) this.vida[k] += 3;
        if(this.vida[k] > 0){ esFuente = true; this.vida[k]--; }
      }
      /* ── GENERADOR · movimiento → corriente, CON conservación ─────────
         Toma la energía cinética de lo que pasa a su lado y la convierte en
         corriente. Y frena a quien se la dio: sin esa segunda mitad esto sería
         una fuente de energía gratis, que es exactamente lo que Carlos dijo
         que no quería («la energía no debe aparecer ni desaparecer
         arbitrariamente»).
         Lo que se le quita al que empuja es proporcional a lo que se genera:
         el generador no puede sacar más de lo que le entra. */
      else if(e.genera){
        let cinetica = 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const px = x+dx, py = y+dy;
          if(px < 0 || py < 0 || px >= an || py >= al) continue;
          const k2 = py * an + px;
          if(t[k2] === VACIO) continue;
          const v2 = this.vy[k2]*this.vy[k2] + this.vx[k2]*this.vx[k2];
          if(v2 < 0.04) continue;
          const m2 = EL[t[k2]].dens || 1;
          const saca = Math.min(0.85, e.genera);
          cinetica += 0.5 * m2 * v2 * saca;
          /* la conservación: se le quita al que empuja la MISMA fracción de
             velocidad que se le sacó de energía. √(1−saca) porque la energía
             va con el cuadrado de la velocidad. */
          const freno = Math.sqrt(1 - saca);
          this.vy[k2] *= freno; this.vx[k2] *= freno;
        }
        /* la energía se acumula: con poquito movimiento tarda en encender,
           con mucho enciende de inmediato. Eso es un volante de inercia. */
        /* ── VOLANTE DE INERCIA ────────────────────────────────────────
           La energía se ACUMULA y se gasta poco a poco, en vez de dispararse
           de golpe cada vez que junta un umbral. Esa diferencia es la que
           separa «una lámpara encendida» de «una lámpara parpadeando»: con
           umbral de 12 encendía 24 de cada 600 pasos, y con umbral de 4, 72.
           Las dos cosas se leen como estropeado — y con razón, es exactamente
           la queja que Carlos tuvo con la compuerta NO.
           Guardando la energía y gastando 1 por paso, un chorro constante la
           mantiene encendida, un chorro más gordo la mantiene MÁS TIEMPO, y al
           cortar el agua se apaga sola cuando se acaba lo guardado — que es lo
           que hace un volante de verdad. */
        this.vida[k] = Math.min(600, this.vida[k] + cinetica);
        if(this.vida[k] >= 1){ esFuente = true; this.vida[k] -= 1; }
      }
      else if(e.pulso) esFuente = (Math.floor(this.paso_ / e.pulso) & 1) === 1;
      /* RELOJ DE ARENA: cuenta mientras le llega señal y sólo deja pasar
         cuando llenó su tiempo. Tocarlo lo vacía y vuelve a empezar. */
      else if(e.retardo){
        let entra = 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const px = x+dx, py = y+dy;
          if(px < 0 || py < 0 || px >= an || py >= al) continue;
          const k2 = py * an + px;
          if(EL[t[k2]].elec && car[k2] && !EL[t[k2]].retardo) entra++;
        }
        if(entra){ if(this.vida[k] < 65535) this.vida[k]++; }
        else this.vida[k] = 0;
        esFuente = this.vida[k] >= e.retardo;
      }
      /* REPETIDOR: si le llega algo, vuelve a mandar desde cero. Sin esto la
         corriente se apaga a los 110 de distancia y no se puede cablear una
         sala de 320×480. */
      else if(e.repite){
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const px = x+dx, py = y+dy;
          if(px < 0 || py < 0 || px >= an || py >= al) continue;
          const k2 = py * an + px;
          if(EL[t[k2]].elec && car[k2] && !EL[t[k2]].repite){ esFuente = true; break; }
        }
      }
      /* OBSERVADOR: mira la celda de ARRIBA y suelta un pulso cuando cambia.
         Guarda lo último que vio en `vida`. */
      else if(e.observa){
        const arr = y > 0 ? t[k - an] : 255;
        const visto = this.vida[k] & 255;
        if(visto !== arr){ this.vida[k] = arr | 256; esFuente = true; }
        else esFuente = (this.vida[k] & 256) !== 0 && (this.vida[k] &= ~256, true);
      }
      else if(e.puerta){
        /* ═══════════════════════════════════════════════════════════════════
           ⚠ LAS COMPUERTAS SE LEÍAN A SÍ MISMAS. Carlos, sin rodeos: «tus
           módulos de lógica no sirven para una mierda, supuse que la Y sería
           que si recibe dos señales eléctricas separadas entonces permite el
           paso, pero con una ya lo permite; la NO no hace nada más que
           parpadear». Las dos quejas son EL MISMO defecto, y es de raíz:

           esto contaba como entrada a CUALQUIER vecino con carga… incluido su
           propio cable de SALIDA, que la compuerta misma había encendido el
           paso anterior. Entonces la Y con una sola entrada se encendía, al
           paso siguiente veía su salida como segunda entrada y se quedaba
           encendida para siempre. Y la NO se veía a sí misma: se apagaba,
           dejaba de verse, se encendía — eso es literalmente el parpadeo que
           él describió. No era que estuvieran mal calibradas: era que una
           compuerta no tenía forma de saber por dónde ENTRA la señal.

           Ahora sí la tiene. El reparto de corriente apunta de quién viene
           cada celda encendida (`padre`), así que un vecino es ENTRADA sólo si
           su carga no salió de esta misma compuerta. Con eso la Y necesita dos
           entradas de verdad, separadas, y la NO se queda quieta.
           ═══════════════════════════════════════════════════════════════════ */
        let vivos = 0, entradas = 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const px = x+dx, py = y+dy;
          if(px < 0 || py < 0 || px >= an || py >= al) continue;
          const k2 = py * an + px;
          if(!EL[t[k2]].elec) continue;
          entradas++;
          /* su propia salida NO es una entrada */
          if(car[k2] && this._padre[k2] !== k) vivos++;
        }
        switch(e.puerta){
          case 'not':  esFuente = vivos === 0; break;
          case 'and':  esFuente = vivos >= 2; break;
          case 'or':   esFuente = vivos >= 1; break;
          case 'nand': esFuente = vivos < 2;  break;
          case 'nor':  esFuente = vivos === 0; break;
          case 'xor':  esFuente = (vivos & 1) === 1; break;
          case 'xnor': esFuente = (vivos & 1) === 0; break;
          default:     esFuente = vivos >= 1; break;   /* diodo */
        }
      }
      if(esFuente){
        sig[k] = 1; dist[k] = 0;
        /* Dos listas y no una, y esto es la SEGUNDA mitad del arreglo de las
           compuertas. Una compuerta encendida también empuja corriente hacia
           ATRÁS, por su propio cable de entrada — y como sale a distancia 0,
           llegaba a esa celda antes que la batería, que estaba a cuatro o
           cinco de distancia. O sea que la compuerta se adueñaba de su propia
           entrada, al paso siguiente ya no la contaba, se apagaba, la batería
           la reclamaba, se encendía… un parpadeo al 50% que se medía como
           «10 de 20 pasos encendida». Primero reparten las fuentes de verdad
           y sólo después las compuertas, sobre lo que quede sin dueño. */
        (e.puerta ? colaPuertas : cola).push(k);
      }
    }

    /* 1-bis · cuánto voltaje da cada fuente: el tamaño de su propio montón de
       pilas. Se calcula una vez por grupo y se comparte, para que las tres
       celdas de una pila de tres den 3 y no 1 cada una. */
    const volt = this.volt;
    volt.fill(0);
    {
      const visto = this._vistoCuerpo;
      visto.fill(0);
      const pila = this._colaCuerpo;
      for(const k0 of cola){
        if(visto[k0] || !EL[t[k0]].fuente) continue;
        let cab = 0, fin = 0;
        pila[fin++] = k0; visto[k0] = 1;
        while(cab < fin){
          const k = pila[cab++], x = k % an, y = (k / an) | 0;
          const mete = k2 => { if(!visto[k2] && EL[t[k2]].fuente){ visto[k2] = 1; pila[fin++] = k2; } };
          if(x > 0)      mete(k - 1);
          if(x < an - 1) mete(k + 1);
          if(y > 0)      mete(k - an);
          if(y < al - 1) mete(k + an);
          if(fin > pila.length - 4) break;
        }
        for(let i = 0; i < fin; i++) volt[pila[i]] = fin;
      }
      /* lo que no es batería pero manda corriente —un generador, una
         compuerta— vale un voltio, que es lo que valía todo antes */
      for(const k0 of cola) if(!volt[k0]) volt[k0] = 1;
      for(const k0 of colaPuertas) if(!volt[k0]) volt[k0] = 1;
    }

    /* 2 · repartir desde las fuentes.
       Con costes distintos por pieza hay que atender siempre la celda MÁS
       CERCANA pendiente, o una resistencia visitada primero bloquearía un
       camino barato que llegaba después.
       ⚠ Lo resolví primero con un `sort` DENTRO del bucle, que es O(n² log n)
       y en 17 000 celdas se come el cuadro entero. Va por CUBETAS: una lista
       por distancia, recorridas en orden. Mismo resultado, coste lineal. */
    const padre = this._padre;
    padre.fill(-1);
    this.reparte(cola, dist, sig, padre);
    this.reparte(colaPuertas, dist, sig, padre);
    this.electricidadRemate(dist, sig);
  }

  /* Reparte la corriente desde una lista de fuentes por el camino más barato.
     Se llama DOS veces: primero con las fuentes de verdad y después con las
     compuertas, para que una compuerta no pueda adueñarse de su propia
     entrada. Ver el comentario grande de arriba. */
  reparte(cola, dist, sig, padre){
    const { an, al, t } = this;
    const cubeta = new Array(ALCANCE + 2);
    for(const k of cola){ (cubeta[0] || (cubeta[0] = [])).push(k); }
    for(let d = 0; d <= ALCANCE; d++){
      const lote = cubeta[d];
      if(!lote) continue;
      for(const k of lote){
        if(dist[k] !== d) continue;   /* llegó otro camino más barato */
        const x = k % an, y = (k / an) | 0;
      for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
        const px = x+dx, py = y+dy;
        if(px < 0 || py < 0 || px >= an || py >= al) continue;
        const k2 = py * an + px;
        if(dist[k2] !== 255) continue;
        const v = EL[t[k2]];
        if(!v.elec) continue;
        /* ⚠ Estas piezas MANDAN POR SU CUENTA y no se dejan atravesar. Faltaban
           las nuevas en la lista, y el efecto era que el reloj de arena dejaba
           pasar la corriente DE INMEDIATO por el camino normal — o sea que un
           temporizador no temporizaba nada. Cada pieza que decide su salida
           tiene que estar aquí o su lógica es decorativa. */
        if(v.puerta || v.fuente || v.pulso || v.retardo || v.repite ||
           v.observa || v.pila || v.genera) continue;
        /* un interruptor ABIERTO corta el paso: es todo su trabajo */
        if(v.interruptor && !this.vida[k2]) continue;
        /* ⚠ LA RESISTENCIA NO CORTA AL AZAR, y así estaba: con 55% de
           probabilidad de tijeretazo por paso, el circuito parpadeaba solo y
           la lámpara del otro lado encendía a ratos. Eso no es una
           resistencia, es un cable roto.
           Una resistencia CAÍDA DE TENSIÓN: cuesta más «distancia» pasar por
           ella, y la corriente sólo llega hasta cierto alcance. Con eso, dos
           resistencias en serie apagan lo que una sola dejaba encendido, que
           es exactamente lo que hacen de verdad — y es determinista, así que
           el circuito que armas hoy se comporta igual mañana. */
        let coste = 1;
        if(v.resiste) coste += Math.round(v.resiste * 26);
        /* el agua dulce conduce a medias: `elec` es un número, no un sí o no */
        if(v.elec < 1) coste += Math.round((1 - v.elec) * 22);
        const nd = d + coste;
        if(nd > ALCANCE) continue;
        dist[k2] = nd; sig[k2] = 1;
        /* El voltaje CAE por el camino, y cae de golpe EN una resistencia:
           eso es lo que hace que la resistencia se lleve el calor y no el
           cable.
           ⚠ Y LA CAÍDA ES AL SALIR DE ELLA, NO AL ENTRAR. Puesto al entrar,
           la resistencia se quedaba con el voltaje YA rebajado y una pila
           suelta calentaba menos que antes de todo esto — un circuito que
           funcionaba ayer empeoraba hoy, que es lo peor que puede pasarle a
           quien ya tenía cosas construidas. La caída de tensión está EN el
           componente: él ve la tensión entera y los de después ven menos. */
        /* el cobre pierde poquísimo: 0.015 por celda hacía que un cable de
           seis celdas ya le quitara un 9% a la resistencia del final */
        const cae = (EL[t[k]].resiste ? EL[t[k]].resiste * 0.55 : 0) + 0.004;
        const nv = this.volt[k] - cae;
        this.volt[k2] = nv > 0 ? nv : 0;
        /* ⚠ DE QUIÉN VIENE LA CORRIENTE, que es lo que faltaba para que las
           compuertas funcionaran. Sin esto una compuerta no puede distinguir
           una ENTRADA de su propia SALIDA, y se lee a sí misma. */
        padre[k2] = k;
        (cubeta[nd] || (cubeta[nd] = [])).push(k2);
      }
      }
    }
  }

  electricidadRemate(dist, sig){
    const { t } = this;
    const n = t.length;
    /* 3 · el calor que produce la corriente */
    for(let k = 0; k < n; k++){
      if(!sig[k]) continue;
      const e = EL[t[k]];
      if(e.fuente) continue;
      /* ⚠ P = V²/R, y por eso el voltaje entra al cuadrado. Con una pila
         suelta esto da los mismos 4.5 de antes —nada cambia para quien ya
         tenía circuitos hechos— y con tres pilas apiladas da 40, que ya
         prende madera. Medido antes de tocar: la resistencia se quedaba en
         53.7° contra 46.2° del cable, o sea que no servía para encender nada,
         y Carlos pidió justamente «al punto de que pueda quemar algo». */
      const V = this.volt[k] || 0;
      this.temp[k] += e.resiste ? 6.5 * e.resiste / 0.55 * V * V : 0.6;
    }
    this.car = sig;
    this.dist = dist;
  }

  /* ── ILUMINACIÓN ──────────────────────────────────────────────────────
     Un reparto desde cada lámpara encendida, igual que la corriente pero con
     otra regla de atenuación: la luz se apaga con la distancia y la frenan los
     materiales según lo opacos que sean. Un cristal la deja pasar casi entera,
     el agua a medias, la piedra nada — y de eso salen las sombras solas.

     Se apoya en la electricidad, que ya corrió: una lámpara alumbra si le
     llega corriente, y se apaga si le cortas el circuito o se le acaba la
     pila. Es lo que pidió: que la luz sea una consecuencia del circuito y no
     un icono que parpadea. */
  luzPaso(){
    const { an, al, t, luz } = this;
    luz.fill(0);
    const focos = [];
    for(let k = 0; k < t.length; k++){
      const e = EL[t[k]];
      if(e.luz && this.car[k]) focos.push([k, e.luz]);
      else if(e.calor || e.id === 'fuego') focos.push([k, 9]);   /* el fuego también alumbra */
      else if(e.chispa === undefined && e.id === 'chispa') focos.push([k, 5]);
    }
    if(!focos.length){ this.hayLuz = false; return; }
    this.hayLuz = true;
    /* Cubetas por «cuánta luz queda», de más a menos: así cada celda se
       resuelve con el camino que más luz le trae y no con el primero que
       llegó. Es el mismo truco de la corriente, al revés. */
    const NIV = 24;
    const cubeta = new Array(NIV + 1);
    const mete = (k, v) => {
      const n = Math.round(v);
      if(n <= 0 || n > NIV) return;
      if(luz[k] >= n) return;
      luz[k] = n;
      (cubeta[n] || (cubeta[n] = [])).push(k);
    };
    for(const [k, f] of focos) mete(k, Math.min(NIV, f));
    for(let v = NIV; v > 0; v--){
      const lote = cubeta[v];
      if(!lote) continue;
      for(const k of lote){
        if(luz[k] !== v) continue;
        const x = k % an, y = (k / an) | 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const px = x + dx, py = y + dy;
          if(px < 0 || py < 0 || px >= an || py >= al) continue;
          const k2 = py * an + px;
          mete(k2, v - this.opaco(k2));
        }
      }
    }
  }

  /* Cuánta luz se come cada material al atravesarlo. El aire casi nada —por
     eso la luz llega lejos—, el agua algo, y un sólido la para en seco: eso
     es una sombra. */
  opaco(k){
    if(this.t[k] === VACIO) return 1;
    const est = this.estadoDe(k);
    if(est === 'gas' || est === 'energia') return 1;
    if(est === 'liquido') return 3;
    if(est === 'polvo') return 7;
    const e = EL[this.t[k]];
    if(e.id === 'vidrio') return 2;            /* el cristal es cristal */
    return 24;                                  /* sólido: sombra */
  }

  /* ── MAGNETISMO ────────────────────────────────────────────────────────
     Lo pidió Carlos por su nombre. Los imanes tiran de lo ferroso con una
     fuerza que cae con la distancia, y el electroimán sólo mientras le llegue
     corriente — que es justo lo que lo vuelve una pieza de máquina y no un
     adorno: con un pulsador y un electroimán ya tienes algo que agarra y
     suelta solo. */
  magnetismo(){
    const { an, al, t } = this;
    const imanes = [];
    for(let y = 0; y < al; y++) for(let x = 0; x < an; x++){
      const k = y * an + x, e = EL[t[k]];
      if(e.iman) imanes.push([x, y, e.iman]);
      else if(e.electroiman && this.car[k]) imanes.push([x, y, e.electroiman]);
    }
    if(!imanes.length) return;
    for(let y = 0; y < al; y++) for(let x = 0; x < an; x++){
      const k = y * an + x, e = EL[t[k]];
      if(!e.ferroso || e.estado === 'solido') continue;
      for(const [ix, iy, f] of imanes){
        const dx = ix - x, dy = iy - y;
        const d = Math.hypot(dx, dy);
        if(d < 0.5 || d > f) continue;
        const fuerza = (1 - d / f) * 0.55 * e.ferroso;
        this.vx[k] += (dx / d) * fuerza;
        this.vy[k] += (dy / d) * fuerza;
      }
    }
  }

  /* Abre o cierra el interruptor que haya en esa celda. Devuelve si hizo algo,
     para que la pantalla sepa si contarlo como toque o como pintura. */
  acciona(x, y){
    if(!this.dentro(x, y)) return false;
    const k = this.i(x, y);
    const e = EL[this.t[k]];
    /* «que se puedan apagar al tiempo»: tocar el reloj lo vacía */
    if(e.retardo){ this.vida[k] = 0; return true; }
    /* la válvula se abre y se cierra tocándola, igual que un interruptor */
    if(e.valvula){ this.vida[k] = this.vida[k] ? 0 : 1; return true; }
    if(!e.interruptor) return false;
    this.vida[k] = this.vida[k] ? 0 : 1;
    return true;
  }

  /* ── utilidades ──────────────────────────────────────────────────────── */
  cuenta(){
    const c = {};
    for(let k = 0; k < this.t.length; k++){
      const id = EL[this.t[k]].id;
      if(id === 'vacio') continue;
      c[id] = (c[id] || 0) + 1;
    }
    return c;
  }
  /* ── DESHACER Y GUARDAR ─────────────────────────────────────────────────
     Carlos: «el botón de borrar no hace confirmación», «necesito un botón de
     regresar» y «necesito guardados». Los tres se apoyan en lo mismo: poder
     sacarle una foto a la habitación y volver a ponerla.

     La foto lleva el TIPO de cada celda y su TEMPERATURA, que es lo que uno
     construyó. Lo demás —velocidades, presiones, cargas— es el estado del
     movimiento y se vuelve a formar solo en unos pasos; guardarlo cuadruplica
     el tamaño para conservar algo que dura un parpadeo. En una sala de
     320×480 una foto son 154 KB de tipos y 614 de temperatura: con eso caben
     de sobra las seis que guarda el deshacer. */
  instantanea(){
    return { an: this.an, al: this.al, t: this.t.slice(), temp: this.temp.slice() };
  }

  restaura(f){
    if(!f || f.an !== this.an || f.al !== this.al) return false;
    this.t.set(f.t); this.temp.set(f.temp);
    /* ⚠ y se limpia el movimiento, que NO va en la foto. Sin esto quedan
       velocidades y presiones de un mundo que ya no existe empujando celdas
       que no las ganaron: al deshacer, lo restaurado salía disparado. */
    this.vy.fill(0); this.vx.fill(0); this.pres.fill(0); this.pv.fill(0);
    this.suelto.fill(0); this.fase.fill(0); this.car.fill(0);
    this._caja = { x0: 0, y0: 0, x1: this.an - 1, y1: this.al - 1 };
    return true;
  }

  /* La habitación en una cadena corta, para el localStorage del teléfono.
     Se cuenta por rachas: una sala recién abierta son 150 mil celdas de aire
     seguidas, o sea DOS números en vez de 150 mil. */
  aTexto(){
    const p = [];
    let ini = this.t[0], n = 1;
    for(let k = 1; k < this.t.length; k++){
      if(this.t[k] === ini && n < 60000) n++;
      else { p.push(ini + ':' + n); ini = this.t[k]; n = 1; }
    }
    p.push(ini + ':' + n);
    return this.an + 'x' + this.al + '|' + p.join(',');
  }

  deTexto(txt){
    if(typeof txt !== 'string') return false;
    const [tam, cuerpo] = txt.split('|');
    const [an, al] = tam.split('x').map(Number);
    if(an !== this.an || al !== this.al) return false;
    this.limpia();
    let k = 0;
    for(const tramo of cuerpo.split(',')){
      const [tp, n] = tramo.split(':').map(Number);
      for(let i = 0; i < n && k < this.t.length; i++, k++) this.t[k] = tp;
    }
    this._caja = { x0: 0, y0: 0, x1: this.an - 1, y1: this.al - 1 };
    return true;
  }

  limpia(){
    this.t.fill(VACIO); this.temp.fill(AMBIENTE);
    this.vida.fill(0); this.car.fill(0);
    this.vy.fill(0); this.vx.fill(0); this.pres.fill(0); this.pv.fill(0);
    this._caja = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
    this.fase.fill(0); this.color.fill(0); this.suelto.fill(0); this.sop.fill(0); this.gmul.fill(1);
    this.carga.fill(0); this.cargaLocal.fill(0); this.fatiga.fill(0);
  }
}
