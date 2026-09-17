/* ═══════════════════════════════════════════════════════════════════════════
   CRISOL · LAS HORMIGAS
   ---------------------------------------------------------------------------
   Carlos: «quiero hormigas que midan uno o dos píxeles y vayan haciendo cuevas
   con aire bajo los sólidos, unas negras unas rojas y unas verdes; las razas
   luchan entre sí haciendo sus colonias, pero sólo las verdes pueden romper
   CUALQUIER material menos muro; las otras dos son más normales, pero las
   rojas son venenosas y las negras se reproducen un poco más rápido y
   requieren menos comida. Haz que necesiten comer, que lleven esta comida a
   sus nidos, etc.»

   ── POR QUÉ NO VIVEN EN LA REJILLA ───────────────────────────────────────
   Por lo mismo que los monigotes de `vida.js`: una hormiga tiene ESTADO que no
   cabe en una casilla —de qué colonia es, qué lleva en la boca, cuánta hambre
   trae, cuánto veneno le metieron—. Metida en `t[]` habría que enseñarle a
   `sostenPaso`, a `cuerpoPaso` y a `esfuerzoPaso` lo que es una colonia.
   Así que son objetos en una lista y TOCAN la rejilla: leen lo que pisan,
   se comen celdas y dejan aire donde cavan.

   ── Y NO TOCA `motor.js` ──────────────────────────────────────────────────
   Ni una línea. `instalaHormigas(M)` se cuelga del mundo desde fuera y el
   resto corre desde `hormigas.paso()`. Si este archivo no se carga, el motor
   se comporta exactamente como antes.

   ── LO QUE SALE SOLO, SIN CÓDIGO QUE LO DIGA ─────────────────────────────
   Cavar deja VACÍO y avisa al motor (`despertar` + `sop`), así que un
   hormiguero excavado de más SE DERRUMBA por el sostén que ya existe. No hay
   una línea que diga «derrumbe»: hay un techo al que le quitaron las patas.
   ═════════════════════════════════════════════════════════════════════════ */
import { EL, IDX, VACIO } from './motor.js';

/* ── LAS TRES RAZAS ───────────────────────────────────────────────────────
   Cada número de esta tabla sale de una frase del encargo, y por eso están
   juntos: cambiar el equilibrio del juego es tocar esta tabla y nada más.

   `talla` es de DIBUJO, no de simulación: una hormiga ocupa una casilla para
   moverse —dos casillas articuladas serían un monigote, y para eso ya está
   `vida.js`— y se pinta de uno o dos píxeles, que es lo que pidió. */
export const RAZAS = {
  negra: {
    col: '#23232B', talla: 1,
    rompeTodo: false,
    veneno: 0,
    /* «se reproducen un poco más rápido y requieren menos comida» — UN POCO.
       Con el doble se comían el mapa y las otras dos no existían nunca. */
    costoCria: 16, hambre: 0.7,
    mordida: 2.4, vidaMax: 90,
  },
  roja: {
    col: '#A8301C', talla: 1,
    rompeTodo: false,
    /* «las rojas son venenosas»: el veneno no mata en la mordida, sigue
       trabajando después. Por eso una roja pierde casi todas las peleas de
       tú a tú y aun así se lleva por delante a la que la mató. */
    veneno: 22,
    costoCria: 22, hambre: 1.0,
    mordida: 2.2, vidaMax: 85,
  },
  verde: {
    col: '#3C8A37', talla: 2,
    /* «sólo las verdes pueden romper CUALQUIER material menos muro» */
    rompeTodo: true,
    veneno: 0,
    /* y por eso son las más caras de criar: si además fueran baratas no
       habría partida */
    costoCria: 30, hambre: 1.15,
    mordida: 3.0, vidaMax: 105,
  },
};
export const NOMBRES = Object.keys(RAZAS);

/* Cuánta hambre se pasa por paso, y cuánto aguanta una hormiga en ayunas.
   Separado de la tabla de razas a propósito: esto es el ritmo del mundo, no
   el carácter de una raza. */
const RITMO_HAMBRE = 0.045;
const ENERGIA_MAX  = 100;
/* El tope de población. Sin él, «que se reproduzcan» termina en un teléfono
   moviendo diez mil hormigas a seis cuadros por segundo. */
const TOPE = 900;
/* Lo que una hormiga puede alejarse del nido antes de dar la vuelta. Sin esto
   las obreras se iban al otro lado del mapa y ninguna volvía nunca. */
const RADIO_FORRAJEO = 70;
/* Dureza máxima que muerden la negra y la roja. La piedra está en 0.6 y la
   tierra en polvo: la frontera deja pasar tierra, arena, planta, hielo y
   madera blanda, y deja fuera piedra, metal y concreto. */
const DUREZA_BLANDA = 0.35;

export function nuevaHormiga(raza, x, y, nido = -1){
  const R = RAZAS[raza];
  return {
    raza, x, y, nido,
    vida: R.vidaMax,
    energia: ENERGIA_MAX * 0.75,
    veneno: 0,            /* el que le metieron a ELLA */
    carga: 0,             /* tipo de celda que lleva a casa, 0 = nada */
    edad: 0,
    rx: 0, ry: 0,         /* el rumbo de paseo, para que no tiemble en el sitio */
    viva: true,
  };
}

export class Hormigas {
  constructor(M, semilla = 20260917){
    this.M = M;
    this.hormigas = [];
    this.colonias = [];
    this.paso_ = 0;
    this._s = semilla >>> 0;
    this.ms = 0;
  }

  /* generador propio y determinista: una prueba de hormigas que dependa del
     `Math.random` del navegador no se puede volver a correr */
  rnd(){
    this._s ^= this._s << 13; this._s >>>= 0;
    this._s ^= this._s >> 17;
    this._s ^= this._s << 5;  this._s >>>= 0;
    return this._s / 4294967296;
  }
  entero(n){ return Math.floor(this.rnd() * n); }

  /* ── LA REJILLA, VISTA POR UNA HORMIGA ───────────────────────────────── */
  dentro(x, y){ return x >= 0 && y >= 0 && x < this.M.an && y < this.M.al; }
  idx(x, y){ return y * this.M.an + x; }

  solido(x, y){
    if(!this.dentro(x, y)) return true;       /* el borde del mundo es pared */
    const k = this.idx(x, y);
    if(this.M.t[k] === VACIO) return false;
    const e = this.M.estadoDe(k);
    return e === 'solido' || e === 'polvo';
  }

  /* ── QUÉ PUEDE MORDER CADA RAZA ──────────────────────────────────────────
     El encargo es literal: «sólo las verdes pueden romper CUALQUIER material
     menos muro». Así que la regla del muro es de LAS TRES, y no una excepción
     de las verdes: `fijo` no se muerde y punto. Lo que cambia entre razas es
     lo de en medio. */
  puedeRomper(raza, x, y){
    if(!this.dentro(x, y)) return false;
    const k = this.idx(x, y), tipo = this.M.t[k];
    if(tipo === VACIO) return false;
    const e = EL[tipo];
    if(e.fijo) return false;                  /* el muro, ni las verdes */
    const est = this.M.estadoDe(k);
    if(est === 'gas' || est === 'liquido') return false;   /* eso no se cava */
    if(RAZAS[raza].rompeTodo) return true;
    if(est === 'polvo') return true;          /* tierra y arena, cualquiera */
    return (e.dureza || 0) <= DUREZA_BLANDA;
  }

  /* ── QUÉ ES COMIDA ───────────────────────────────────────────────────────
     Se lee del elemento, no de una lista mía: cualquier cosa del grupo «vida»
     que no sea fija alimenta. Así, el día que se agregue una fruta nueva a
     `elementos.js`, las hormigas se la comen sin tocar este archivo. */
  esComida(tipo){
    if(tipo === VACIO) return false;
    const e = EL[tipo];
    return !e.fijo && e.grupo === 'vida';
  }
  comidaEn(x, y){
    if(!this.dentro(x, y)) return false;
    return this.esComida(this.M.t[this.idx(x, y)]);
  }

  /* ── CAVAR ───────────────────────────────────────────────────────────────
     Deja VACÍO y AVISA. El aviso es la mitad importante: sin `despierta` y sin
     borrar el sostén, el techo del túnel no se entera de que le quitaron las
     patas y el hormiguero queda flotando como un dibujo. Con él, cavar de más
     derrumba — que es lo que hace un hormiguero de verdad. */
  cava(x, y){
    const M = this.M, k = this.idx(x, y);
    const tipo = M.t[k];
    if(tipo === VACIO) return 0;
    M.cambia(k, VACIO);
    M.car[k] = 0; M.moles[k] = 0; M.fase[k] = 0; M.color[k] = 0;
    M.vx[k] = 0; M.vy[k] = 0; M.suelto[k] = 0; M.sop[k] = 0;
    M.despierta(x, y, 2);
    return tipo;
  }

  /* ── COLONIAS ────────────────────────────────────────────────────────── */
  nido(x, y, raza, cuantas = 6){
    const c = { raza, x, y, despensa: 0, criadas: 0, id: this.colonias.length };
    this.colonias.push(c);
    for(let i = 0; i < cuantas; i++){
      if(this.hormigas.length >= TOPE) break;
      this.hormigas.push(nuevaHormiga(raza, x, y, c.id));
    }
    return c;
  }
  vivasDe(id){
    let n = 0;
    for(const h of this.hormigas) if(h.viva && h.nido === id) n++;
    return n;
  }
  porRaza(raza){
    let n = 0;
    for(const h of this.hormigas) if(h.viva && h.raza === raza) n++;
    return n;
  }

  /* ── DAÑO DEL AMBIENTE ───────────────────────────────────────────────────
     Como en `vida.js`: no hay tabla de «cosas que matan hormigas». Se lee lo
     que la celda ES. Una hormiga de una casilla es frágil, así que el fuego y
     la corriente la matan de un paso, no de diez. */
  ambiente(h){
    const M = this.M, k = this.idx(h.x, h.y);
    if(!this.dentro(h.x, h.y)) return;
    const tipo = M.t[k], T = M.temp[k];
    if(T > 65) h.vida -= (T - 65) * 0.12;
    if(T < -8)  h.vida -= (-8 - T) * 0.06;
    if(tipo !== VACIO){
      const e = EL[tipo];
      if(e.calor) h.vida -= 40;
      if(e.corroe) h.vida -= e.corroe * 14;
      if(e.ahoga || M.estadoDe(k) === 'liquido') h.vida -= 2.2;
      if(e.fuente || (e.elec && M.car[k])) h.vida -= 25;
    }
  }

  /* ═════════════════════════════════════════════════════════════════════
     EL PASO
     ═══════════════════════════════════════════════════════════════════ */
  paso(){
    const reloj = typeof performance !== 'undefined' ? performance : Date;
    const t0 = reloj.now();
    this.paso_++;

    /* ⚠ EL MAPA DE QUIÉN ESTÁ DÓNDE SE ARMA UNA VEZ POR PASO. Buscando
       enemigos con un bucle sobre todas contra todas, doscientas hormigas son
       cuarenta mil comparaciones por paso. Con el mapa son ocho miradas por
       hormiga. Y se reconstruye cada paso a propósito: mantenerlo al día
       mientras se mueven es justo el tipo de índice viejo que ya costó tres
       bichos en este proyecto. */
    const donde = new Map();
    for(const h of this.hormigas){
      if(!h.viva) continue;
      const k = this.idx(h.x, h.y);
      const l = donde.get(k);
      if(l) l.push(h); else donde.set(k, [h]);
    }

    for(const h of this.hormigas){
      if(!h.viva) continue;
      this.pasoHormiga(h, donde);
    }

    /* las muertas se retiran de un golpe al final: borrar de una lista que se
       está recorriendo es como se saltan elementos */
    if(this.paso_ % 8 === 0){
      this.hormigas = this.hormigas.filter(h => h.viva);
    }

    this.ms = reloj.now() - t0;
  }

  pasoHormiga(h, donde){
    const R = RAZAS[h.raza];
    h.edad++;

    /* 1 · hambre y veneno */
    h.energia -= RITMO_HAMBRE * R.hambre;
    if(h.energia <= 0){ h.energia = 0; h.vida -= 0.35; }
    if(h.veneno > 0){
      /* el veneno de las rojas: sigue trabajando después de la pelea */
      h.vida -= h.veneno * 0.035;
      h.veneno *= 0.985;
      if(h.veneno < 0.4) h.veneno = 0;
    }
    this.ambiente(h);
    if(h.vida <= 0){ this.muere(h); return; }

    /* 2 · la guerra. «las razas luchan entre sí» */
    if(this.pelea(h, donde)) return;

    /* 3 · si lleva comida, a casa */
    const col = this.colonias[h.nido];
    if(h.carga){
      if(col && Math.abs(h.x - col.x) <= 1 && Math.abs(h.y - col.y) <= 1){
        col.despensa += 10;
        h.carga = 0;
        this.cria(col);
      } else {
        this.haciaEl(h, col ? col.x : h.x, col ? col.y : h.y);
      }
      return;
    }

    /* 4 · comer de la despensa si está en casa y trae hambre */
    if(col && h.energia < ENERGIA_MAX * 0.55 &&
       Math.abs(h.x - col.x) <= 1 && Math.abs(h.y - col.y) <= 1 && col.despensa >= 5){
      col.despensa -= 5;
      h.energia = Math.min(ENERGIA_MAX, h.energia + 30);
      return;
    }

    /* 5 · ¿hay comida al lado? se la lleva */
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      if(!dx && !dy) continue;
      const nx = h.x + dx, ny = h.y + dy;
      if(!this.comidaEn(nx, ny)) continue;
      h.carga = this.cava(nx, ny);
      /* comer un poco en el acto: una obrera hambrienta no llega al nido */
      h.energia = Math.min(ENERGIA_MAX, h.energia + 8);
      return;
    }

    /* 6 · a buscar: pasear y cavar */
    this.forrajea(h);
  }

  muere(h){
    h.viva = false;
    /* ⚠ y lo que llevaba en la boca NO se evapora: se cae donde murió. Si la
       carga desapareciera, matar hormigas sería una forma de borrar materia
       del mundo — y las hormigas de otra raza matarían plantas sin querer. */
    if(h.carga && this.dentro(h.x, h.y) && this.M.t[this.idx(h.x, h.y)] === VACIO){
      this.M.cambia(this.idx(h.x, h.y), h.carga);
    }
    h.carga = 0;
  }

  /* ── LA PELEA ────────────────────────────────────────────────────────────
     Se muerden las de razas distintas que estén en la misma casilla o pegadas.
     El veneno de la roja se le queda al otro encima y sigue después: por eso
     una roja pierde casi todas las peleas de tú a tú y aun así se lleva a la
     que la mató. Devuelve true si se gastó el turno peleando. */
  pelea(h, donde){
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      const nx = h.x + dx, ny = h.y + dy;
      if(!this.dentro(nx, ny)) continue;
      const lista = donde.get(this.idx(nx, ny));
      if(!lista) continue;
      for(const o of lista){
        if(o === h || !o.viva || o.raza === h.raza) continue;
        const R = RAZAS[h.raza];
        o.vida -= R.mordida;
        if(R.veneno) o.veneno = Math.min(60, o.veneno + R.veneno * 0.25);
        if(o.vida <= 0) this.muere(o);
        /* pelear cansa */
        h.energia -= 0.25;
        return true;
      }
    }
    return false;
  }

  /* ── CRIAR ───────────────────────────────────────────────────────────────
     «las negras se reproducen un poco más rápido»: no hay una regla aparte
     para las negras, sale de que su cría cuesta menos despensa. */
  cria(col){
    const R = RAZAS[col.raza];
    if(col.despensa < R.costoCria) return null;
    if(this.hormigas.length >= TOPE) return null;
    col.despensa -= R.costoCria;
    col.criadas++;
    const b = nuevaHormiga(col.raza, col.x, col.y, col.id);
    this.hormigas.push(b);
    return b;
  }

  /* ── MOVERSE ─────────────────────────────────────────────────────────────
     Una hormiga no cae como una piedra: se agarra. Mientras tenga algo sólido
     pegado puede andar por un techo, y si se queda en el aire, baja.
     Devuelve true si se movió o si cavó. */
  anda(h, dx, dy){
    const nx = h.x + dx, ny = h.y + dy;
    if(!this.dentro(nx, ny)) return false;
    if(!this.solido(nx, ny)){ h.x = nx; h.y = ny; return true; }
    if(this.puedeRomper(h.raza, nx, ny)){
      const tipo = this.cava(nx, ny);
      h.x = nx; h.y = ny;
      /* cavar da hambre, y ésa es la razón de que un hormiguero no crezca
         hasta el infinito aunque haya tierra de sobra */
      h.energia -= 0.5;
      /* si lo que mordió era comida, se la lleva */
      if(this.esComida(tipo)) h.carga = tipo;
      return true;
    }
    return false;
  }

  agarrada(h){
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      if(!dx && !dy) continue;
      if(this.solido(h.x + dx, h.y + dy)) return true;
    }
    return false;
  }

  /* camina hacia un punto, y si le estorba algo lo muerde si puede */
  haciaEl(h, tx, ty){
    if(!this.agarrada(h) && this.anda(h, 0, 1)) return;   /* en el aire: baja */
    const dx = Math.sign(tx - h.x), dy = Math.sign(ty - h.y);
    const intentos = [[dx, dy], [dx, 0], [0, dy],
                      [dx, -dy], [-dx, dy], [0, 1], [0, -1]];
    for(const [ax, ay] of intentos){
      if(!ax && !ay) continue;
      if(this.anda(h, ax, ay)) return;
    }
  }

  /* ── FORRAJEAR ───────────────────────────────────────────────────────────
     «vayan haciendo cuevas con aire bajo los sólidos». De ahí sale el sesgo:
     una hormiga que anda al aire libre prefiere METERSE, y una que ya está
     bajo tierra pasea. Sin ese sesgo se quedaban correteando por la superficie
     y nunca salía un túnel.

     El rumbo se guarda entre pasos (`rx`, `ry`) y sólo cambia de vez en
     cuando: con un rumbo nuevo cada paso, una hormiga tiembla en el sitio y
     no llega a ninguna parte — lo que dibuja no es una cueva, es un borrón. */
  forrajea(h){
    const col = this.colonias[h.nido];
    /* demasiado lejos de casa: de regreso */
    if(col){
      const d = Math.abs(h.x - col.x) + Math.abs(h.y - col.y);
      if(d > RADIO_FORRAJEO){ this.haciaEl(h, col.x, col.y); return; }
    }
    if(!h.rx && !h.ry || this.rnd() < 0.08){
      h.rx = this.entero(3) - 1;
      h.ry = this.entero(3) - 1;
      /* al aire libre, hacia abajo: así se abre la cueva */
      if(!this.techo(h) && this.rnd() < 0.7) h.ry = 1;
      if(!h.rx && !h.ry) h.rx = 1;
    }
    if(this.anda(h, h.rx, h.ry)) return;
    /* topó con algo que no puede morder: da la vuelta */
    h.rx = this.entero(3) - 1;
    h.ry = this.entero(3) - 1;
    if(!h.rx && !h.ry) h.ry = 1;
    this.anda(h, h.rx, h.ry);
  }

  /* ¿tiene algo sólido encima? o sea, ¿ya está bajo tierra? */
  techo(h){
    for(let y = h.y - 1; y >= Math.max(0, h.y - 6); y--){
      if(this.solido(h.x, y)) return true;
    }
    return false;
  }

  /* ── PARA LA PANTALLA ────────────────────────────────────────────────────
     Devuelve lo mínimo para pintar: dónde, de qué color y de qué tamaño. La
     pantalla no tiene por qué saber de despensas ni de veneno. */
  paraPintar(){
    const out = [];
    for(const h of this.hormigas){
      if(!h.viva) continue;
      out.push({ x: h.x, y: h.y, col: RAZAS[h.raza].col,
                 talla: RAZAS[h.raza].talla, carga: !!h.carga });
    }
    return out;
  }

  limpia(){ this.hormigas.length = 0; this.colonias.length = 0; }
}

export function instalaHormigas(M, semilla){
  const H = new Hormigas(M, semilla);
  M.hormigas = H;
  return H;
}
