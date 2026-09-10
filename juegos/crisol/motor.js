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

  /* ── PRESIÓN ───────────────────────────────────────────────────────────
     Un campo que se difunde y decae. Los sólidos la contienen —por eso una
     recámara aguanta y un tubo abierto no—, y donde se acumula, empuja y
     acaba rompiendo lo que no resiste. Con esto salen la onda expansiva, la
     olla a presión, el cañón y el estallido de una tubería. */
  presionPaso(){
    const { an, al, t, pres } = this;
    const nuevo = this._pres2;
    nuevo.fill(0);
    for(let y = 0; y < al; y++){
      for(let x = 0; x < an; x++){
        const k = y * an + x;
        /* Salto rápido: sin presión aquí ni al lado, no hay nada que difundir.
           La presión sólo existe en un puñado de celdas casi siempre. */
        if(pres[k] === 0){
          const ar = y > 0 ? pres[k-an] : 0, ab = y < al-1 ? pres[k+an] : 0;
          const iz = x > 0 ? pres[k-1] : 0, de = x < an-1 ? pres[k+1] : 0;
          if(ar === 0 && ab === 0 && iz === 0 && de === 0 &&
             t[k] !== VACIO === false){ continue; }
          if(ar === 0 && ab === 0 && iz === 0 && de === 0 && EL[t[k]].estado !== 'gas'){ continue; }
        }
        const e = EL[t[k]];
        /* Un gas caliente y encerrado empuja: es la ley de los gases en su
           versión de píxeles, y es de donde sale la fuerza de una pistola. */
        let p = pres[k];
        if(e.estado === 'gas' && t[k] !== VACIO){
          p += Math.max(0, (this.temp[k] - AMBIENTE)) * 0.004;
        }
        if(e.id === 'muro'){ nuevo[k] = 0; continue; }
        let suma = 0, n = 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const px = x+dx, py = y+dy;
          if(px < 0 || py < 0 || px >= an || py >= al) continue;
          const k2 = py * an + px;
          const v = EL[t[k2]];
          /* la presión NO atraviesa sólidos: eso es lo que hace que un
             recipiente sea un recipiente */
          if(v.estado === 'solido'){
            /* pero sí los EMPUJA, y si no aguantan, ceden */
            if(pres[k] > 55 && this.rnd() < (pres[k] - 55) * .0012 * (1 - (v.dureza||0))){
              this.cambia(k2, VACIO);
              this.vx[k2] += dx * 2; this.vy[k2] += dy * 2;
            }
            continue;
          }
          suma += pres[k2] - pres[k]; n++;
        }
        p += suma * .24;
        nuevo[k] = p * 0.955;               /* decae: si no, nunca se calma */
        if(nuevo[k] < 0.02) nuevo[k] = 0;
      }
    }
    this._pres2 = pres; this.pres = nuevo;
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
      if(this.t[k2] !== VACIO && this.estadoDe(k2) !== 'solido'){
        this.vy[k2] -= e.piston;
        this.pres[k2] += 18;
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
          if(this.t[k2] !== VACIO && this.estadoDe(k2) !== 'solido') this.vy[k2] -= suelta;
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
    if(est === 'solido'){ this.vy[k] = 0; this.vx[k] = 0; return; }

    if(est === 'gas' || est === 'energia'){
      if(this.burbujea(x, y, k, e)) return;
      const sube = e.sube || 1;
      const dirs = [[0,-1],[0,-1],[-1,-1],[1,-1],[-1,0],[1,0]];
      for(let i = 0; i < sube + 2; i++){
        const [dx, dy] = dirs[(this.rnd()*dirs.length)|0];
        if(this.trata(x, y, k, x+dx, y+dy, e)) return;
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
    this.vy[k] = Math.min(this.vy[k] + GRAVEDAD, VMAX);
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
        let vivos = 0;
        for(const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const px = x+dx, py = y+dy;
          if(px < 0 || py < 0 || px >= an || py >= al) continue;
          const k2 = py * an + px;
          if(EL[t[k2]].elec && car[k2]) vivos++;
        }
        if(e.puerta === 'not')      esFuente = vivos === 0;
        else if(e.puerta === 'and') esFuente = vivos >= 2;
        else if(e.puerta === 'or')  esFuente = vivos >= 1;
        else                        esFuente = vivos >= 1;   /* diodo */
      }
      if(esFuente){ sig[k] = 1; dist[k] = 0; cola.push(k); }
    }

    /* 2 · repartir desde las fuentes.
       Con costes distintos por pieza hay que atender siempre la celda MÁS
       CERCANA pendiente, o una resistencia visitada primero bloquearía un
       camino barato que llegaba después.
       ⚠ Lo resolví primero con un `sort` DENTRO del bucle, que es O(n² log n)
       y en 17 000 celdas se come el cuadro entero. Va por CUBETAS: una lista
       por distancia, recorridas en orden. Mismo resultado, coste lineal. */
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
        (cubeta[nd] || (cubeta[nd] = [])).push(k2);
      }
      }
    }

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
    this.vy.fill(0); this.vx.fill(0); this.pres.fill(0);
    this.fase.fill(0); this.color.fill(0);
  }
}
