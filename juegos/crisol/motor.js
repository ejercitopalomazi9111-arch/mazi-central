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

/* Tabla de reacciones indexada por par, para no recorrer 24 reglas por celda
   por cuadro. Con doscientos elementos eso sería la diferencia entre correr y
   arrastrarse. */
const TABLA = new Map();
const clave = (a, b) => a * 512 + b;
for(const [a, b, ra, rb, prob, calor] of REACCIONES){
  if(prob <= 0) continue;
  const A = IDX[a], B = IDX[b];
  TABLA.set(clave(A, B), { a: ra === null ? A : IDX[ra], b: rb === null ? B : IDX[rb], p: prob, q: calor || 0 });
  TABLA.set(clave(B, A), { a: rb === null ? B : IDX[rb], b: ra === null ? A : IDX[ra], p: prob, q: calor || 0 });
}

export const AMBIENTE = 22;
/* Gravedad en celdas por paso al cuadrado, y tope de velocidad. El tope no es
   pereza: sin él una partícula salta media pantalla en un cuadro y atraviesa
   paredes delgadas por el mismo agujero que ya tapamos en el movimiento
   lateral. */
export const GRAVEDAD = 0.28;
export const VMAX = 6;
/* Hasta dónde llega la corriente desde una fuente. Es lo que hace que una
   resistencia sirva: si el alcance fuera infinito, atenuar no apagaría nada. */
export const ALCANCE = 110;
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
    this.flotante = new Uint8Array(n);
    /* de quién vino la corriente a cada celda: sin esto una compuerta no puede
       distinguir una entrada de su propia salida */
    this._padre = new Int32Array(n);   /* este paso ya lleva su balance de flotación hecho */
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
    this.t[k] = tipo;
    this.vida[k] = 0;
    this.car[k] = 0;
    this.vy[k] = 0; this.vx[k] = 0;
    this.fase[k] = 0; this.color[k] = 0;
    const e = EL[tipo];
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
  revienta(x, y, fuerza){
    this.despierta(x, y, Math.max(3, Math.round(fuerza * 1.4)) + 2);
    this.suelta(x, y, Math.max(3, Math.round(fuerza * 1.6)));
    const r = Math.max(2, Math.round(fuerza * 1.4));
    for(let dy = -r; dy <= r; dy++){
      for(let dx = -r; dx <= r; dx++){
        const d = Math.hypot(dx, dy);
        if(d > r) continue;
        const nx = x + dx, ny = y + dy;
        if(!this.dentro(nx, ny)) continue;
        const k = this.i(nx, ny);
        if(EL[this.t[k]].id === 'muro') continue;
        const cerca = 1 - d / r;
        this.pres[k] += fuerza * 26 * cerca * cerca;
        this.temp[k] += fuerza * 95 * cerca;
        if(d > 0.4){
          this.vx[k] += (dx / d) * fuerza * .85 * cerca;
          this.vy[k] += (dy / d) * fuerza * .85 * cerca;
        }
      }
    }
    /* el corazón sí se convierte en fuego: es la deflagración */
    const rc = Math.max(1, Math.round(fuerza * .35));
    for(let dy = -rc; dy <= rc; dy++) for(let dx = -rc; dx <= rc; dx++){
      if(Math.hypot(dx, dy) > rc) continue;
      const nx = x + dx, ny = y + dy;
      if(!this.dentro(nx, ny)) continue;
      const k = this.i(nx, ny);
      if(EL[this.t[k]].id === 'muro') continue;
      this.cambia(k, this.rnd() < .7 ? IDX.fuego : IDX.humo);
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
    let cab = 0, fin = 0;
    sop.fill(0);
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k = y * an + x;
        const tk = t[k];
        if(tk === VACIO) continue;
        const e = EL[tk];
        if(e.fijo){ sop[k] = 1; cola[fin++] = k; continue; }
        if(this.estadoDe(k) !== 'solido') continue;
        if(y === al - 1){ sop[k] = 1; cola[fin++] = k; continue; }
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
        if(this.estadoDe(ab) === 'polvo' || EL[t[ab]].fijo){ sop[k] = 1; cola[fin++] = k; }
      }
    }
    while(cab < fin){
      const k = cola[cab++];
      const x = k % an, y = (k / an) | 0;
      if(x > 0      && this.pegado(k - 1)){  sop[k - 1]  = 1; cola[fin++] = k - 1; }
      if(x < an - 1 && this.pegado(k + 1)){  sop[k + 1]  = 1; cola[fin++] = k + 1; }
      if(y > 0      && this.pegado(k - an)){ sop[k - an] = 1; cola[fin++] = k - an; }
      if(y < al - 1 && this.pegado(k + an)){ sop[k + an] = 1; cola[fin++] = k + an; }
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
        for(let i = 0; i < fin; i++){
          const k = cola[i];
          this.vy[k] = Math.max(-VMAX, this.vy[k] - sube);
          this.suelto[k] = 1; sop[k] = 0;
          /* el balance de esta pieza ya está hecho AQUÍ, con su peso y lo que
             encierra. Si `mueve` le volviera a sumar la gravedad por celda,
             estaría contando dos veces y ningún globo despegaría. */
          this.flotante[k] = 1;
        }
      }
    }
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
    for(let iy = 1; iy < h - 1; iy++){
      for(let ix = 1; ix < w - 1; ix++){
        if(fuera[iy * w + ix]) continue;
        const gx = x0 - 1 + ix, gy = y0 - 1 + iy;
        if(gx < 0 || gy < 0 || gx >= this.an || gy >= this.al) continue;
        const k = gy * an + gx;
        if(visto[k]) continue;                    /* la cáscara misma ya se contó */
        peso += EL[t[k]].dens || 1; celdas++;
      }
    }
    return { peso, celdas };
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
  presiona(x, y, v){
    if(!this.dentro(x, y)) return;
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
    /* sólo se copia la caja, no el mundo entero */
    for(let y = y0; y <= y1; y++){
      const f = y * an;
      for(let x = x0; x <= x1; x++) p0[f + x] = pres[f + x];
    }
    /* transmisión por celda, calculada UNA vez y usada cinco: la miran sus
       cuatro vecinas y ella misma */
    const tr = this._trans, am = this._amort;
    for(let y = y0; y <= y1; y++){
      const f = y * an;
      for(let x = x0; x <= x1; x++){
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
        if(tk !== VACIO && EL[tk].estado === 'gas'){
          const eq = this.temp[k] > AMBIENTE ? (this.temp[k] - AMBIENTE) * 0.03 : 0;
          p += (eq - p) * 0.06;
        }
        /* El hueco es el desahogo: es aire abierto, no una cámara. Se desahoga
           SÓLO cuando no está oscilando, así que el frente de la onda —que
           lleva velocidad grande— lo cruza sin perder nada, y en cambio el
           desnivel plano que queda después sí se drena. Sin esto la sala se
           quedaba presurizada de por vida: a 900 pasos la energía seguía
           clavada en 5.21e6 empujándolo todo. */
        if(tk === VACIO && v > -0.5 && v < 0.5) p *= 0.95;
        if(p > -0.04 && p < 0.04 && v > -0.04 && v < 0.04){ p = 0; v = 0; }
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
    const { an, al, t, pres } = this;
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
             revienta y uno de concreto aguanta el mismo golpe. */
          const aguanta = 40 + (v.dureza || 0) * 420;
          if(dif <= aguanta) continue;
          if(this.rnd() > (dif - aguanta) * .004) continue;
          /* no desaparece: SALE DESPEDIDA, que es lo que hace la metralla */
          this.vx[k2] += dx * (dif - aguanta) * .05;
          this.vy[k2] += dy * (dif - aguanta) * .05;
          this.suelta(x + dx, y + dy, 2);
          if(this.rnd() < .35) this.cambia(k2, VACIO);
          pres[k] *= .6;
        }
      }
    }
  }

  /* La presión empuja lo que se puede mover. Se llama por celda. */
  empuja(x, y, k, e){
    const p = this.pres[k];
    if(p < 3) return;
    if(e.estado === 'solido') return;
    let gx = 0, gy = 0;
    for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
      if(!this.dentro(x+dx, y+dy)) continue;
      const k2 = this.i(x+dx, y+dy);
      if(EL[this.t[k2]].estado === 'solido') continue;
      const dif = this.pres[k] - this.pres[k2];
      if(dif > 0){ gx += dx * dif; gy += dy * dif; }
    }
    const m = Math.max(0.35, (e.dens || 1) * 0.12);   /* la masa se resiste */
    this.vx[k] += (gx / m) * 0.016;
    this.vy[k] += (gy / m) * 0.016;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     UN PASO DE MUNDO
     ═══════════════════════════════════════════════════════════════════════ */
  paso(){
    this.paso_++;
    this.mov.fill(0);
    this.sostenPaso();
    this.globoPaso();
    this.electricidad();
    this.magnetismo();
    this.presionPaso();

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
        if(e.explota){ this.revienta(x, y, e.explota); return; }
        this.cambia(k, IDX.fuego);
        return;
      }
    }
    /* Detona por GOLPE, no por existir. Y el golpe puede venir de dos lados,
       que es lo que se me pasó: que ELLA caiga rápido y se estrelle, o que
       algo LE CAIGA ENCIMA. Medir sólo su propia velocidad dejaba fuera el
       caso obvio — tirarle una piedra — y era justo el que se prueba primero. */
    if(e.golpe){
      const propio = Math.abs(this.vy[k]) + Math.abs(this.vx[k]);
      let impacto = propio > e.golpe &&
        (() => { const a = this.dentro(x, y+1) ? EL[this.t[this.i(x,y+1)]] : EL[IDX.muro];
                 return a.estado === 'solido' || a.estado === 'polvo'; })();
      if(!impacto){
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          if(!this.dentro(x+dx, y+dy)) continue;
          const k2 = this.i(x+dx, y+dy);
          if(this.t[k2] === VACIO) continue;
          if(Math.abs(this.vy[k2]) + Math.abs(this.vx[k2]) > e.golpe){ impacto = true; break; }
        }
      }
      if(impacto){ this.revienta(x, y, e.explota || 6); return; }
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
        this.vy[k2] -= e.piston;
        this.suelto[k2] = 1;                 /* lanzado: ya no está anclado */
        this.pres[k2] += 18; this.despierta(x, y - 1, 2);
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
    if(e.mecha && (this.vida[k] > 0 || this.temp[k] > 700)){
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
    /* 6-bis · un motor con corriente empuja lo que tenga encima */
    if(e.motor && this.car[k] && this.dentro(x, y-1)){
      const k2 = this.i(x, y-1);
      if(this.t[k2] !== VACIO && EL[this.t[k2]].estado !== 'solido') this.vy[k2] -= 1.1;
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
      if(this.t[k2] === VACIO || v.id === 'acido' || v.id === 'muro') continue;
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
      if(!this.flotante[k]) this.vy[k] = Math.min(this.vy[k] + GRAVEDAD - this.flota(k, e), VMAX);
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
        let cayo = false;
        for(let i = 0; i < saltos; i++){
          if(!this.trata(cx, cy, ck, cx, cy + 1, e)) break;
          cy++; ck = this.i(cx, cy); cayo = true;
        }
        if(!cayo && saltos > 0) this.vy[ck] *= .1;
      }
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
      const sube = d < DENS_AIRE;
      const dy = sube ? -1 : 1;
      /* ── EL GLOBO ────────────────────────────────────────────────────────
         Un gas que quiere subir y tiene un sólido encima le PASA su empuje.
         Eso es literalmente lo que hace un globo: el helio no tira de la tela,
         la empuja desde dentro. Con esto, cualquier cáscara que Carlos
         construya y llene de helio se levanta sola, sin un elemento «globo»
         inventado ni un caso especial. */
      if(sube && this.dentro(x, y - 1)){
        const ka = this.i(x, y - 1);
        if(this.t[ka] !== VACIO && this.estadoDe(ka) === 'solido' && !EL[this.t[ka]].fijo){
          const empuje = (DENS_AIRE - d) * 0.55;
          this.vy[ka] -= empuje;
          /* si el empuje es de verdad, la cáscara deja de estar anclada: es lo
             que hace que un globo pintado a mano llegue a despegar */
          if(empuje > 0.25) this.suelto[ka] = 1;
        }
      }
      const dirs = [[0,dy],[0,dy],[-1,dy],[1,dy],[-1,0],[1,0]];
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
    this.vy[k] = Math.min(this.vy[k] + GRAVEDAD - this.flota(k, e), VMAX);
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
    if(this.mov[k2]) return false;
    const dest = this.t[k2];
    /* ⚠ aquí decía `if(dest === k)`: comparaba un TIPO con un ÍNDICE de celda.
       No truena y casi siempre da falso, así que pasa desapercibido — pero el
       día que el número de un tipo coincide con el de una celda, esa celda
       deja de moverse sin motivo. Manzanas con naranjas. */
    if(dest === VACIO){ this.intercambia(k, k2); return true; }
    const v = EL[dest];
    const ev = this.estadoDe(k2);
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
          const c = Math.min(e.cond || .1, EL[t[k2]].cond || .1);
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
        const perdida = masa === 0 ? 0.34 : Math.min(0.09, 0.9 / (8 + masa));
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
           v.observa || v.pila) continue;
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
      this.temp[k] += e.resiste ? 4.5 : 0.6;
    }
    this.car = sig;
    this.dist = dist;
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
  limpia(){
    this.t.fill(VACIO); this.temp.fill(AMBIENTE);
    this.vida.fill(0); this.car.fill(0);
    this.vy.fill(0); this.vx.fill(0); this.pres.fill(0); this.pv.fill(0);
    this._caja = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
    this.fase.fill(0); this.color.fill(0); this.suelto.fill(0); this.sop.fill(0);
  }
}
