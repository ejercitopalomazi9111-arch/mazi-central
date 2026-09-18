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
/* ── EL PLANO DEL HORMIGUERO ──────────────────────────────────────────────
   Carlos: «quiero que las hormigas sean capaces de hacerme cosas más
   impresionantes: túneles, pequeñas islitas, cámaras, habitaciones».

   Cavando al azar NUNCA sale eso, y se ve: lo que dibujaban eran rayas
   punteadas en diagonal. Una galería no es un paseo aleatorio que salió
   bonito — es una FORMA, y una forma hay que quererla antes de cavarla.

   Así que cada colonia nace con un plano: un pozo vertical desde la entrada,
   galerías horizontales a los lados cada tantas filas, cámaras redondas al
   final de algunas, y la más honda y más grande para la reina. Las obreras no
   pasean: van a la celda del plano que todavía está rellena y la muerden.

   Y de ahí sale gratis lo otro que pidió: si se derrumba, las celdas del plano
   vuelven a estar rellenas, así que las mismas obreras las vuelven a cavar. No
   hay código de «reconstruir»: hay un plano que no se cumple. */
const POZO_HONDO = 34;      /* qué tan abajo baja el pozo principal */
const POZO_ANCHO = 2;       /* de una sola celda no se cruzan dos hormigas */
const GAL_CADA   = 7;       /* cada cuántas filas sale una galería */
const GAL_LARGO  = 14;      /* y cuánto mide */
const GAL_ALTO   = 2;
const CAM_RADIO  = 4;       /* las cámaras del final */
const CAM_REAL   = 6;       /* la de la reina, más grande */
/* Cada cuántos pasos se comprueba quién puede llegar a la reina. Es un
   recorrido en anchura y no hace falta cada cuadro: un derrumbe tarda más que
   esto en importar. */
const CADA_ALCANCE = 24;

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
    /* «obrera» cava el plano, «forrajera» busca comida, «reina» no sale del
       nido. El papel no es decoración: es lo que hace que unas construyan
       mientras otras comen, en vez de que todas hagan lo mismo a medias. */
    papel: 'forrajera',
    meta: -1,             /* la celda del plano que va a morder ahora */
    obra: 0,              /* 1 mientras abre galería: entonces apuntala */
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
  cava(x, y, apisona = false){
    const M = this.M, k = this.idx(x, y);
    const tipo = M.t[k];
    if(tipo === VACIO) return 0;
    M.cambia(k, VACIO);
    M.car[k] = 0; M.moles[k] = 0; M.fase[k] = 0; M.color[k] = 0;
    M.vx[k] = 0; M.vy[k] = 0; M.suelto[k] = 0; M.sop[k] = 0;
    M.despierta(x, y, 2);
    if(apisona) this.apisona(x, y);
    return tipo;
  }

  /* ── APISONAR LA PARED ───────────────────────────────────────────────────
     Lo que convierte un agujero en una GALERÍA. Un túnel en tierra suelta se
     derrumba en el acto —la tierra es un polvo y un polvo cae—, así que la
     hormiga compacta lo que le queda alrededor, que es justo lo que hace una
     de verdad al cementar la pared con saliva.

     Sólo se apisona POLVO: la piedra ya se sostiene sola y convertirla en
     tierra sería debilitarla. Y sólo alrededor de lo que se cava a propósito,
     no de cada mordisco de paseo, o el mapa entero acabaría apisonado. */
  apisona(x, y){
    const M = this.M;
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      if(!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if(!this.dentro(nx, ny)) continue;
      const k2 = this.idx(nx, ny);
      if(M.t[k2] === VACIO || EL[M.t[k2]].fijo) continue;
      if(M.estadoDe(k2) !== 'polvo') continue;
      M.cambia(k2, IDX.tierraap);
      M.suelto[k2] = 0;
    }
  }

  /* ── EL PLANO ────────────────────────────────────────────────────────────
     Devuelve la lista de celdas que la colonia QUIERE huecas, en orden de
     dentro hacia fuera: primero el pozo, luego las galerías, luego las
     cámaras. El orden importa porque las obreras atacan lo más cercano y así
     el hormiguero crece de arriba abajo en vez de aparecer a trozos. */
  planoDe(x0, y0){
    const plan = [], vistas = new Set();
    const mete = (x, y) => {
      if(!this.dentro(x, y)) return;
      const k = this.idx(x, y);
      if(vistas.has(k)) return;
      /* ⚠ EL MURO NO ENTRA AL PLANO, NI SIQUIERA PARA LAS VERDES. Si entrara,
         las obreras se quedarían clavadas mordiendo algo que nunca cede, y el
         hormiguero no se terminaría jamás. */
      if(this.M.t[k] !== VACIO && EL[this.M.t[k]].fijo) return;
      vistas.add(k); plan.push(k);
    };
    const disco = (cx, cy, r) => {
      for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){
        /* un poco achatado: una cámara de hormigas es más ancha que alta */
        if(dx * dx + (dy * dy) * 2.1 > r * r) continue;
        mete(cx + dx, cy + dy);
      }
    };

    /* el pozo */
    const hondo = Math.min(POZO_HONDO, this.M.al - y0 - 3);
    for(let d = 0; d < hondo; d++)
      for(let w = 0; w < POZO_ANCHO; w++) mete(x0 + w, y0 + d);

    /* las galerías, alternando lado, y una cámara al final de cada una */
    let lado = 1, ultima = null;
    for(let d = GAL_CADA; d < hondo - 2; d += GAL_CADA){
      const y = y0 + d;
      const desde = lado > 0 ? x0 + POZO_ANCHO : x0 - 1;
      for(let i = 0; i < GAL_LARGO; i++)
        for(let h = 0; h < GAL_ALTO; h++) mete(desde + lado * i, y + h);
      const fx = desde + lado * (GAL_LARGO - 1);
      disco(fx, y + 1, CAM_RADIO);
      ultima = { x: fx, y: y + 1 };
      lado = -lado;
    }

    /* la cámara real: al fondo del pozo, la más grande. Si el pozo salió
       cortito porque el suelo se acaba, se usa la última galería. */
    const rx = hondo > GAL_CADA ? x0 : (ultima ? ultima.x : x0);
    const ry = hondo > GAL_CADA ? y0 + hondo - 1 : (ultima ? ultima.y : y0);
    disco(rx, ry, CAM_REAL);
    return { plan, reina: { x: rx, y: ry } };
  }

  /* ── COLONIAS ────────────────────────────────────────────────────────── */
  nido(x, y, raza, cuantas = 6){
    const { plan, reina } = this.planoDe(x, y);
    const c = {
      raza, x, y, despensa: 0, criadas: 0, id: this.colonias.length,
      plan,
      /* dónde va la reina, y quién es. Son dos cosas: el SITIO sigue ahí
         aunque la reina muera, y es a donde van a criar a la siguiente. */
      trono: reina, reina: null,
      /* quién puede llegar al trono hoy. Se rehace cada tantos pasos. */
      alcance: new Set(), revisado: -999,
      derrumbes: 0,
    };
    this.colonias.push(c);
    for(let i = 0; i < cuantas; i++){
      if(this.hormigas.length >= TOPE) break;
      const h = nuevaHormiga(raza, x, y, c.id);
      /* ⚠ LA REINA NACE EN LA BOCA DEL POZO, NO EN SU CÁMARA. Puesta en la
         cámara nacía ENTERRADA en tierra sin cavar: el recorrido desde el
         trono no encontraba un solo hueco, así que TODAS las hormigas se
         declaraban incomunicadas, abandonaban la comida y se iban a rescatar
         a una reina que no estaba atrapada. Cuatro pruebas rojas de un golpe.
         Baja ella sola conforme le abren la cámara. */
      if(i === 0){ h.papel = 'reina'; c.reina = h; }
      else h.papel = (i % 2) ? 'obrera' : 'forrajera';
      this.hormigas.push(h);
    }
    return c;
  }

  /* ── ¿QUIÉN PUEDE LLEGAR AL TRONO? ───────────────────────────────────────
     Recorrido en anchura desde la cámara real por lo que NO es sólido. Lo que
     queda fuera es lo que un derrumbe dejó incomunicado, y esas hormigas
     dejan lo que estén haciendo y se abren paso.

     Se limita a una caja alrededor del plano: sin el tope, un hormiguero con
     salida al aire libre inunda la sala entera y cuesta un recorrido completo
     cada vez. */
  revisaAlcance(col){
    const M = this.M, an = M.an;
    const trono = col.trono;
    if(!this.dentro(trono.x, trono.y)) return;
    const R = POZO_HONDO + GAL_LARGO + 8;
    const x0 = Math.max(0, col.x - R), x1 = Math.min(an - 1, col.x + R);
    const y0 = Math.max(0, col.y - 8), y1 = Math.min(M.al - 1, col.y + R);
    const vis = col.alcance;
    vis.clear();
    const cola = [this.idx(trono.x, trono.y)];
    vis.add(cola[0]);
    for(let i = 0; i < cola.length && i < 20000; i++){
      const k = cola[i], x = k % an, y = (k / an) | 0;
      for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
        if(!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if(nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
        const k2 = this.idx(nx, ny);
        if(vis.has(k2)) continue;
        if(this.solido(nx, ny)) continue;
        vis.add(k2); cola.push(k2);
      }
    }
  }

  /* la celda del plano más cercana que TODAVÍA está rellena. No se recorre el
     plano entero por hormiga y por paso —serían decenas de miles de cuentas—:
     se mira un puñado al azar y se escoge la más cercana de ésas. Dirige
     igual de bien y cuesta una fracción. */
  metaDelPlan(h, col){
    if(!col || !col.plan.length) return -1;
    const M = this.M, an = M.an, n = col.plan.length;
    let mejor = -1, mejorD = 1e9;
    const cuantas = Math.min(28, n);
    for(let i = 0; i < cuantas; i++){
      const k = col.plan[this.entero(n)];
      if(M.t[k] === VACIO) continue;                 /* ya está cavada */
      if(EL[M.t[k]].fijo) continue;
      if(!this.puedeRomper(h.raza, k % an, (k / an) | 0)) continue;
      const dx = (k % an) - h.x, dy = ((k / an) | 0) - h.y;
      const d = dx * dx + dy * dy;
      if(d < mejorD){ mejorD = d; mejor = k; }
    }
    return mejor;
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

    /* el mapa de quién llega al trono se rehace de tanto en tanto, y una
       colonia por vuelta: con seis colonias eso es un recorrido cada cuatro
       pasos, no seis cada paso */
    if(this.colonias.length){
      const c = this.colonias[this.paso_ % this.colonias.length];
      if(this.paso_ - c.revisado >= CADA_ALCANCE){
        const antes = c.alcance.size;
        this.revisaAlcance(c);
        /* perder de golpe la mitad de lo excavado es un derrumbe, y se cuenta:
           es el número que dice si la colonia está reconstruyendo */
        if(antes > 30 && c.alcance.size < antes * 0.55) c.derrumbes++;
        c.revisado = this.paso_;
      }
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

    const col = this.colonias[h.nido];

    /* 2-bis · LA REINA NO SALE. Come de la despensa, pone crías y ya. Si se
       la llevan por delante, la colonia se queda sin centro — y por eso el
       trono es un SITIO y no ella: la siguiente nace ahí mismo. */
    if(h.papel === 'reina'){
      if(col){
        if(h.energia < ENERGIA_MAX * 0.8 && col.despensa >= 4){
          col.despensa -= 4; h.energia = Math.min(ENERGIA_MAX, h.energia + 26);
        }
        this.cria(col);
        /* si se salió de su cámara —la tiró un derrumbe— vuelve */
        if(Math.abs(h.x - col.trono.x) > 2 || Math.abs(h.y - col.trono.y) > 2)
          this.haciaEl(h, col.trono.x, col.trono.y);
      }
      return;
    }

    /* 2-ter · ¿SE QUEDÓ INCOMUNICADA? Entonces lo único que importa es volver
       con la reina, cavando si hace falta. Esto es lo que Carlos pidió con
       todas sus letras —«en caso de derrumbe todas buscarán cómo llegar a la
       reina y restaurar la colonia»— y no necesita código de reconstrucción:
       abrirse paso hasta el trono ES reconstruir el pozo. */
    /* ⚠ Y SÓLO CUANDO EL HORMIGUERO YA EXISTE. Un nido recién puesto tampoco
       tiene camino a la reina —no ha cavado nada— y eso NO es un derrumbe: es
       un hormiguero joven. Sin este umbral, una colonia nueva se pasaba la
       vida rescatando a nadie y no comía. */
    if(col && col.alcance.size > 25 && !col.alcance.has(this.idx(h.x, h.y))){
      h.obra = 1;                       /* va abriendo galería, no de paseo */
      this.haciaEl(h, col.trono.x, col.trono.y);
      h.obra = 0;
      return;
    }

    /* 3 · si lleva comida, a casa */
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

    /* 6 · la obrera cumple el plano; la forrajera sale a buscar.
       Y una obrera con la despensa vacía se vuelve forrajera: de nada sirve
       un palacio si dentro no hay qué comer. */
    if(h.papel === 'obrera' && col){
      if(col.despensa < 6 && this.rnd() < 0.35){ this.forrajea(h); return; }
      if(h.meta < 0 || this.M.t[h.meta] === VACIO) h.meta = this.metaDelPlan(h, col);
      if(h.meta >= 0){
        const an = this.M.an, mx = h.meta % an, my = (h.meta / an) | 0;
        if(Math.abs(mx - h.x) <= 1 && Math.abs(my - h.y) <= 1){
          if(this.puedeRomper(h.raza, mx, my)){
            const t = this.cava(mx, my, true);      /* obra: se apisona */
            h.energia -= 0.5;
            if(this.esComida(t)) h.carga = t;
          }
          h.meta = -1;
        } else { h.obra = 1; this.haciaEl(h, mx, my); h.obra = 0; }
        return;
      }
      /* el plano ya está entero: se pone a buscar comida como las demás */
    }
    this.forrajea(h);
  }

  muere(h){
    h.viva = false;
    /* ⚠ SI CAE LA REINA, LA COLONIA NO SE MUERE: CORONA A OTRA. El trono es un
       SITIO, no una hormiga, y por eso esto se puede hacer. La que esté más
       cerca de la cámara real se queda; si no hay ninguna, la colonia se
       queda sin reina hasta que alguna llegue, y deja de criar mientras
       tanto — que es exactamente lo que le pasa a un hormiguero de verdad. */
    const c0 = this.colonias[h.nido];
    if(c0 && c0.reina === h){
      c0.reina = null;
      let mejor = null, mejorD = 1e9;
      for(const o of this.hormigas){
        if(!o.viva || o.nido !== h.nido || o.papel === 'reina') continue;
        const d = (o.x - c0.trono.x) ** 2 + (o.y - c0.trono.y) ** 2;
        if(d < mejorD){ mejorD = d; mejor = o; }
      }
      if(mejor){ mejor.papel = 'reina'; c0.reina = mejor; }
    }
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
    /* ⚠ SIN REINA NO HAY CRÍAS. Antes cualquiera que llegara con comida las
       hacía brotar, y eso convertía a la reina en un adorno: matarla no
       cambiaba nada. */
    if(!col.reina) return null;
    col.despensa -= R.costoCria;
    col.criadas++;
    const b = nuevaHormiga(col.raza, col.x, col.y, col.id);
    /* nacen en la cámara real si ya está cavada; si no, en la boca del pozo —
       nacer dentro de la roca es la misma trampa que la de la reina */
    if(this.dentro(col.trono.x, col.trono.y) &&
       this.M.t[this.idx(col.trono.x, col.trono.y)] === VACIO){
      b.x = col.trono.x; b.y = col.trono.y;
    }
    /* dos de cada tres cavan: un hormiguero joven necesita casa antes que
       despensa, y en cuanto el plano está hecho las obreras salen a buscar
       igual que las demás */
    b.papel = (col.criadas % 3) ? 'obrera' : 'forrajera';
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
    /* ⚠ LA PARED APISONADA NO SE MUERDE DE PASO. Es la estructura del nido, y
       mordiéndola al pasar las propias forrajeras abrían el techo de su
       cámara y enterraban a la reina: medido, el alcance subía a 115 al
       juntarse los túneles y caía a 2 cien pasos después. Sólo la muerde
       quien va DE OBRA —una obrera cumpliendo el plano o una rescatando a la
       reina—, y ésas apuntalan detrás. Las demás dan la vuelta. */
    if(!h.obra && this.M.t[this.idx(nx, ny)] === IDX.tierraap) return false;
    if(this.puedeRomper(h.raza, nx, ny)){
      /* ⚠ SI VA DE OBRA, APUNTALA. Un túnel de rescate es un túnel: sin esto,
         las hormigas que se abrían paso hasta la reina rompían la pared
         entibada de su cámara y la ENTERRABAN — medido, el alcance pasaba de
         60 a 1 justo cuando las dos primeras llegaban. Llegar a la reina y
         sepultarla en el intento no es rescatarla. */
      const tipo = this.cava(nx, ny, !!h.obra);
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
  /* ── BUSCAR COMIDA DE VERDAD ─────────────────────────────────────────────
     Se miran unas cuantas celdas al azar de una caja alrededor y se toma la
     comida más cercana. No es un barrido: con doscientas hormigas, recorrer
     una caja entera por hormiga y por paso es el paso completo. */
  buscaComida(h, r = 22){
    const M = this.M, an = M.an;
    let mejor = -1, mejorD = 1e9;
    for(let i = 0; i < 26; i++){
      const nx = h.x + this.entero(r * 2 + 1) - r;
      const ny = h.y + this.entero(r * 2 + 1) - r;
      if(!this.dentro(nx, ny)) continue;
      const k = this.idx(nx, ny);
      if(!this.esComida(M.t[k])) continue;
      const dx = nx - h.x, dy = ny - h.y, d = dx * dx + dy * dy;
      if(d < mejorD){ mejorD = d; mejor = k; }
    }
    return mejor;
  }

  forrajea(h){
    const col = this.colonias[h.nido];
    /* demasiado lejos de casa: de regreso */
    if(col){
      const d = Math.abs(h.x - col.x) + Math.abs(h.y - col.y);
      if(d > RADIO_FORRAJEO){ this.haciaEl(h, col.x, col.y); return; }
    }

    /* ⚠ PRIMERO SE BUSCA COMIDA, Y ESTO ERA LO QUE FALTABA. Sin esta parte la
       única regla era pasear con sesgo hacia abajo, así que la colonia entera
       terminaba amontonada EN EL FONDO DEL MUNDO —medido: las 21 hormigas
       entre y=54 y y=67, con el jardín en y=18— cavando hacia ninguna parte.
       Una forrajera que excava hacia abajo no es una forrajera. */
    const k = this.buscaComida(h);
    if(k >= 0){
      const an = this.M.an;
      this.haciaEl(h, k % an, (k / an) | 0);
      return;
    }

    /* sin comida a la vista: se sube a buscarla. La comida crece arriba, no
       en el fondo de la mina. */
    if(!h.rx && !h.ry || this.rnd() < 0.08){
      h.rx = this.entero(3) - 1;
      h.ry = this.entero(3) - 1;
      if(this.techo(h) && this.rnd() < 0.7) h.ry = -1;   /* bajo tierra: arriba */
      else if(this.rnd() < 0.4) h.ry = 1;                /* al aire libre: a cavar */
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
                 /* la reina se pinta más grande: en un hormiguero de mil
                    píxeles idénticos, si no se distingue, no existe */
                 talla: h.papel === 'reina' ? RAZAS[h.raza].talla + 1 : RAZAS[h.raza].talla,
                 carga: !!h.carga, reina: h.papel === 'reina' });
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
