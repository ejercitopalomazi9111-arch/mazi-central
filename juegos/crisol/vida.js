/* ═══════════════════════════════════════════════════════════════════════════
   CRISOL · LA VIDA
   ---------------------------------------------------------------------------
   Carlos: «quiero que pongas personas que sean un círculo en la cabeza, con su
   cuerpo de un palito, dos bracitos, dos piernitas, pero no de unos pocos
   píxeles, sino que midan lo que un pincel del 6… que no le pongas animaciones
   manuales, sino que se generen por código».

   ── POR QUÉ ESTO NO VIVE EN LA REJILLA ───────────────────────────────────
   Todo lo demás de CRISOL es una celda con un tipo. Un monigote NO puede
   serlo: tiene articulaciones, y una articulación es una RELACIÓN entre
   partes, no una propiedad de una casilla. Meterlo en `t[]` obligaría a que
   `cuerpoPaso`, `sostenPaso` y `esfuerzoPaso` supieran de rodillas. Es el
   mismo razonamiento que ya está escrito en `elementos.js` para la cuerda:
   lo que vive en la relación entre celdas va aparte.

   Entonces: los seres son objetos en una lista, y TOCAN la rejilla — leen lo
   que pisan, arrancan celdas, las cargan, las avientan. El daño no se
   inventa: sale de `elementos.js`. Si una celda está a 900° los quema; si
   lleva corriente los electrocuta; si corroe, los deshace. No hay una tabla
   de «cosas que hacen daño»: hay las propiedades que ya existen.

   ── Y NO TOCA `motor.js` ──────────────────────────────────────────────────
   Ni una línea. `instalaVida(M)` se cuelga del mundo desde fuera: reemplaza
   en LA INSTANCIA los dos métodos de plantas —`crece` y `germina`— y el resto
   corre desde `vida.paso()`, que la pantalla llama después de `M.paso()`.
   Si este archivo no se carga, el motor se comporta exactamente como antes.
   ═════════════════════════════════════════════════════════════════════════ */
import { EL, IDX, VACIO, AMBIENTE } from './motor.js';

/* ── medidas, en CELDAS y a talla 1 ──────────────────────────────────────
   El encargo pone la escala: «que midan lo que un pincel del 6». La brocha
   del 6 pinta un disco de radio 5 y pico, o sea unas once celdas de lado a
   lado. Un monigote de once de alto es lo que cuadra, y por eso estas cifras
   no son gusto: están medidas contra la herramienta que ya existe. */
/* ⚠ LAS PROPORCIONES SE CORRIGIERON MIRANDO LA PANTALLA, no el código.
   Antes la cabeza tenía radio 1.45 —2.9 de diámetro— y los hombros 1.55: la
   cabeza era MÁS ANCHA QUE EL CUERPO ENTERO, y la persona medía 3.7 cabezas
   de alto cuando una de verdad mide siete y media. De lejos se leía como un
   alfiler con una bola encima, que es justo lo que Carlos llamó feo.
   Ahora: cabeza más chica, hombros más anchos que la cabeza y cadera con
   cuerpo. Sale una figura de 5 cabezas — todavía de caricatura, que es lo que
   queremos a este tamaño, pero ya se lee como una persona. */
export const CUERPO = {
  cabeza:   1.05,   /* radio */
  cuello:   0.25,   /* con 0.55 y la cabeza chica quedaba una jirafa */
  torso:    3.40,   /* cadera → hombro */
  hombro:   2.10,   /* ancho de hombros, completo */
  cadera:   1.40,
  muslo:    2.00,
  espinilla:2.00,
  brazo:    1.55,
  antebrazo:1.60,
};
export const ALTO_PERSONA = CUERPO.muslo + CUERPO.espinilla + CUERPO.torso
                          + CUERPO.cuello + CUERPO.cabeza * 2;   /* ≈ 10.8 */

/* Lo que un ser aguanta antes de caerse. 100 es «entero». */
const SALUD_MAX = 100;
/* El tope de población. Sin él, «que se reproduzcan» acaba en un teléfono
   dibujando cuatrocientos monigotes a seis cuadros por segundo. */
const TOPE = 140;

/* ── 2 huesos, 1 objetivo: la cinemática inversa ─────────────────────────
   Esto es lo que hace que la animación sea CÓDIGO y no fotogramas. Se le da
   dónde está el hombro y dónde quiere estar la mano, y devuelve dónde cae el
   codo. La misma función resuelve el codo, la rodilla, la pata del animal y
   el brazo estirándose a arrancar un ladrillo: cuatro animaciones distintas
   con una fórmula, que es justo lo que pidió Carlos. */
export function codo(ax, ay, bx, by, l1, l2, lado){
  let dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy);
  if(d < 1e-6){ dx = 0; dy = 1e-6; d = 1e-6; }
  /* el objetivo se acerca si está fuera del alcance: un brazo no se estira */
  const max = l1 + l2 - 1e-4, min = Math.abs(l1 - l2) + 1e-4;
  const dc = d > max ? max : d < min ? min : d;
  const cos = (l1*l1 + dc*dc - l2*l2) / (2 * l1 * dc);
  const a = Math.acos(cos < -1 ? -1 : cos > 1 ? 1 : cos);
  const base = Math.atan2(dy, dx);
  const ang = base + a * lado;
  return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1,
          ax + (dx/d) * dc, ay + (dy/d) * dc];   /* codo + mano ya alcanzable */
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* ═══════════════════════════════════════════════════════════════════════════
   EL SER
   ═════════════════════════════════════════════════════════════════════════ */
let SIGUIENTE = 1;
export function nuevoSer(tipo, x, y, talla = 1){
  const patas = tipo === 'bicho' ? 4 : 2;
  const s = {
    id: SIGUIENTE++,
    tipo, x, y,
    vx: 0, vy: 0,
    talla,
    mirando: 1,
    enSuelo: false,
    salud: SALUD_MAX,
    energia: 80,
    /* lo que se le VE encima, cada uno con su gesto */
    quema: 0, choque: 0, veneno: 0, frio: 0, dolor: 0,
    edad: 0, cria: 0, muerto: 0,
    fase: 0,                      /* el ciclo de marcha */
    zancada: 2.1,
    humor: 'pasea',
    reloj: 0,                     /* cuánto lleva en este humor */
    mirada: 0,                    /* a dónde mira la cabeza, en radianes */
    miradaObj: 0,
    tiembla: 0,
    velocidad: 0.42,
    andando: true,
    topado: 0,
    mano: null,                   /* la celda que carga */
    objetivo: null,               /* a qué celda va */
    alcance: null,                /* a dónde estira el brazo ahora mismo */
    patas: [],
    aliento: 0,
  };
  for(let i = 0; i < patas; i++){
    s.patas.push({ px: x, py: y, dx: x, dy: y, hx: x, hy: y, t: -1, apoyada: 0 });
  }
  return s;
}

export class Vida {
  constructor(M, semilla = 20260917){
    this.M = M;
    this.seres = [];
    this.arboles = [];
    this.azar = semilla | 0 || 1;
    this.ms = 0;             /* lo que costó el último paso, en milisegundos */
    this.paso_ = 0;
  }

  /* azar PROPIO. Si usara `M.rnd()` movería el flujo de azar del motor, y con
     eso una sala con monigotes dejaría de reproducir la misma explosión que
     una sin ellos. Las pruebas del motor se volverían mentira. */
  rnd(){
    this.azar ^= this.azar << 13; this.azar ^= this.azar >>> 17;
    this.azar ^= this.azar << 5;  this.azar |= 0;
    return ((this.azar >>> 0) % 100000) / 100000;
  }
  entre(a, b){ return a + this.rnd() * (b - a); }

  /* ── lectura del mundo ─────────────────────────────────────────────── */
  solido(x, y){
    const M = this.M;
    if(x < 0 || x >= M.an) return true;        /* las paredes del mundo frenan */
    if(y < 0) return false;
    if(y >= M.al) return true;
    const k = y * M.an + x;
    if(M.t[k] === VACIO) return false;
    const e = M.estadoDe(k);
    return e === 'solido' || e === 'polvo';
  }
  /* la primera fila sólida bajo (x, desde), o null si no hay ninguna cerca */
  sueloBajo(x, desde, hasta){
    const xi = Math.round(x);
    for(let y = Math.floor(desde); y <= hasta; y++) if(this.solido(xi, y)) return y;
    return null;
  }

  /* ── EL DAÑO SALE DE `elementos.js`, NO DE UNA TABLA MÍA ──────────────
     Es la parte del encargo que más fácil se hace mal: sería cómodo escribir
     «si toca batería, 8 de daño». Entonces el día que alguien meta un
     elemento nuevo que electrocute, el monigote no se enteraría. Aquí se lee
     lo que la celda ES: su temperatura, su corriente, si corroe, si radia. */
  peligroDe(k){
    const M = this.M, tipo = M.t[k];
    if(tipo === VACIO){
      const T = M.temp[k];
      /* el aire también quema y también congela: es lo que hace que estar
         al lado de la lava duela sin tocarla */
      return { quema: T > 70 ? (T - 70) / 700 : 0, frio: T < -10 ? (-10 - T) / 80 : 0,
               choque: 0, acido: 0, veneno: 0, T };
    }
    const e = EL[tipo], T = M.temp[k];
    let quema = T > 55 ? (T - 55) / 420 : 0;
    if(e.calor) quema = Math.max(quema, 1.2);          /* fuego y lava, directo */
    const choque = (e.fuente || (e.elec && M.car[k])) ? (e.fuente ? 1.1 : (M.volt[k] || 1) * 0.5) : 0;
    return {
      quema, frio: T < -10 ? (-10 - T) / 80 : 0,
      choque, acido: e.corroe || 0, veneno: e.radia ? 0.45 : (e.ahoga ? 0.12 : 0), T,
    };
  }

  /* lo que le entra al cuerpo por una celda que está tocando */
  sufre(s, p, escala){
    if(!p) return;
    const f = escala / Math.max(0.4, s.talla);    /* uno chiquito sufre más */
    if(p.quema > 0){ s.quema = Math.min(1, s.quema + p.quema * 0.20 * f); s.salud -= p.quema * 1.5 * f; }
    if(p.choque > 0){ s.choque = Math.min(1, s.choque + p.choque * 0.5 * f); s.salud -= p.choque * 2.2 * f; }
    if(p.acido > 0){ s.dolor = Math.min(1, s.dolor + p.acido * 0.4 * f); s.salud -= p.acido * 3.2 * f; }
    if(p.veneno > 0){ s.veneno = Math.min(1, s.veneno + p.veneno * 0.05 * f); s.salud -= p.veneno * 0.35 * f; }
    if(p.frio > 0){ s.frio = Math.min(1, s.frio + p.frio * 0.12 * f); s.salud -= p.frio * 0.7 * f; }
  }

  /* ═════════════════════════════════════════════════════════════════════
     EL PASO
     ═══════════════════════════════════════════════════════════════════ */
  paso(){
    const reloj = typeof performance !== 'undefined' ? performance : Date;
    const t0 = reloj.now();
    this.paso_++;
    for(let i = this.seres.length - 1; i >= 0; i--){
      const s = this.seres[i];
      this.pasoSer(s);
      if(s.muerto > 260){ this.entierra(s); this.seres.splice(i, 1); }
    }
    if((this.paso_ & 1) === 0) this.pasoArboles();
    this.ms = reloj.now() - t0;
  }

  pasoSer(s){
    const M = this.M;
    const pierna = (CUERPO.muslo + CUERPO.espinilla) * s.talla;
    s.edad++;
    if(s.cria > 0) s.cria--;
    /* los males se curan solos si dejas de tocar lo que los causaba */
    s.quema *= 0.97; s.choque *= 0.88; s.dolor *= 0.95; s.frio *= 0.985; s.veneno *= 0.999;
    if(s.tipo === 'persona' && s.talla < 1) s.talla = Math.min(1, s.talla + 0.0006);
    if(s.tipo === 'bicho' && s.talla < 0.62) s.talla = Math.min(0.62, s.talla + 0.0005);

    /* ── gravedad, LA DEL MUNDO ────────────────────────────────────────
       No una constante propia: se consulta el campo, así que un monigote
       dentro de una zona de gravedad invertida se cae hacia arriba y uno
       cerca de un punto que atrae se columpia. Sale gratis por reusar. */
    const hx = clamp(Math.round(s.x), 0, M.an - 1), hy = clamp(Math.round(s.y), 0, M.al - 1);
    M.gravedadEn(hx, hy, M.i(hx, hy));
    const gx = M._gx, gy = M._gy;

    if(s.muerto){ this.ragdoll(s, gx, gy, pierna); return; }

    /* ── lo que está tocando le PASA ───────────────────────────────── */
    this.revisaCuerpo(s, pierna);
    if(s.mano) this.revisaMano(s);
    if(s.salud <= 0){ s.muerto = 1; if(s.mano) this.suelta(s, 0, 0); return; }

    /* ── la cabeza ───────────────────────────────────────────────────── */
    this.decide(s, pierna);

    /* ── andar ────────────────────────────────────────────────────────── */
    s.vy += gy;
    s.vx += gx * 0.6;
    const antesX = s.x;
    if(s.enSuelo){
      const quiere = s.andando ? s.mirando * s.velocidad : 0;
      s.vx = lerp(s.vx, quiere, 0.28);
      if(!s.andando) s.vx *= 0.72;
    } else {
      s.vx *= 0.995;
    }
    s.vy = clamp(s.vy, -3, 3);
    s.vx = clamp(s.vx, -1.6, 1.6);

    /* el muro de enfrente: lo que se puede subir se sube, lo que no, se
       rodea. Esto ES el «pequeño pathfinding hacia el píxel que está
       adelante» que pidió Carlos, y es lo que le da carácter: un escalón
       lo trepa, un muro lo hace darse la vuelta, un hoyo lo hace dudar. */
    if(Math.abs(s.vx) > 0.004){
      const dir = s.vx > 0 ? 1 : -1;
      const fila = Math.round(s.y + pierna);            /* la que pisa */
      const xf = Math.round(s.x) + dir;
      let h = 0;
      while(h < 6 && this.solido(xf, fila - 1 - h)) h++;
      const techo = this.solido(xf, Math.round(s.y - CUERPO.torso * s.talla));
      if(h >= 3 || (h > 0 && techo)){
        s.vx = 0; s.topado++;
        if(s.topado > 6){ s.mirando = -dir; s.topado = 0; s.humor = 'pasea'; s.reloj = 0; }
      } else {
        s.topado = 0;
        /* ¿y hay suelo del otro lado? */
        if(h === 0 && s.enSuelo){
          const abajo = this.sueloBajo(xf, fila, fila + 4);
          if(abajo == null){
            /* un hoyo. «Pero no siempre»: a veces salta, a veces se da la
               vuelta, y a veces se cae — que es lo que hace una persona */
            const d = this.rnd();
            if(d < 0.45){ s.vy = -1.35; }
            else if(d < 0.85){ s.vx = 0; s.mirando = -dir; }
          }
        }
      }
    }

    s.x = clamp(s.x + s.vx, 1, M.an - 2);
    s.y += s.vy;
    if(s.y > M.al + 20) s.salud = 0;

    /* ── apoyarse en el suelo ─────────────────────────────────────────── */
    const suelo = this.sueloBajo(s.x, s.y + 0.2, Math.floor(s.y + pierna + 3));
    s.enSuelo = false;
    if(suelo != null){
      const meta = suelo - pierna;
      if(s.y > meta - 0.02){
        if(s.y - meta > 0.45){
          /* el suelo subió de golpe: se TREPA, no se teletransporta */
          s.y -= Math.min(s.y - meta, 0.38);
        } else { s.y = meta; }
        if(s.vy > 0) s.vy = 0;
        s.enSuelo = true;
      }
    }
    /* desatascar: si la cadera se quedó dentro de algo, sale hacia arriba */
    if(this.solido(Math.round(s.x), Math.round(s.y))){ s.y -= 0.5; s.vy = Math.min(s.vy, 0); }

    /* ── la animación, generada ───────────────────────────────────────── */
    this.animaPatas(s, pierna, antesX);
    s.aliento += 0.08;
    s.tiembla = Math.max(s.quema, s.choque * 1.4, s.dolor * 0.8);
    /* la cabeza gira hacia donde mira, no de golpe */
    let d = s.miradaObj - s.mirada;
    while(d > Math.PI) d -= Math.PI * 2;
    while(d < -Math.PI) d += Math.PI * 2;
    s.mirada += d * 0.16;

    s.energia -= 0.004 + Math.abs(s.vx) * 0.006;
    if(s.energia < 0){ s.salud -= 0.05; s.energia = 0; }
  }

  /* ── EL CUERPO TOCA EL MUNDO ──────────────────────────────────────────
     Se muestrean pocos puntos a propósito: pies, panza, pecho y cabeza.
     Recorrer el rectángulo entero del monigote son 60 celdas por ser y por
     paso — con cien seres, seis mil lecturas por cuadro para enterarse de lo
     mismo. */
  revisaCuerpo(s, pierna){
    const M = this.M;
    const xi = Math.round(s.x);
    const puntos = [
      [xi, Math.round(s.y + pierna - 0.5), 1.0],                        /* pies  */
      [xi, Math.round(s.y), 1.0],                                       /* panza */
      [xi, Math.round(s.y - CUERPO.torso * s.talla), 0.9],              /* pecho */
      [xi, Math.round(s.y - (CUERPO.torso + CUERPO.cuello + CUERPO.cabeza) * s.talla), 1.1],
    ];
    let peor = 0;
    for(const [px, py, w] of puntos){
      if(!M.dentro(px, py)) continue;
      const p = this.peligroDe(M.i(px, py));
      this.sufre(s, p, w);
      const t = p.quema + p.choque + p.acido;
      if(t > peor) peor = t;
    }
    if(peor > 0.25){
      s.dolor = Math.min(1, s.dolor + peor * 0.12);
      if(s.humor !== 'huye' && this.rnd() < 0.5){ s.humor = 'huye'; s.reloj = 0; }
    }
    /* y si se está quemando de verdad, CALIENTA lo que hay alrededor: un
       monigote en llamas es un incendio andante, no un icono naranja */
    if(s.quema > 0.75 && this.rnd() < 0.08){
      const px = xi + ((this.rnd() * 3) | 0) - 1, py = Math.round(s.y) + ((this.rnd() * 3) | 0) - 1;
      if(M.dentro(px, py) && M.t[M.i(px, py)] === VACIO) M.temp[M.i(px, py)] += 60;
    }
  }

  revisaMano(s){
    const m = s.mano;
    const p = this.peligroEnMano(m);
    this.sufre(s, p, 1.35);          /* en la mano duele más: lo tiene agarrado */
    /* lo que carga se enfría en la mano, como se enfría de verdad */
    m.temp = m.temp + (AMBIENTE - m.temp) * 0.004;
    /* y si quema demasiado, lo suelta. No siempre: a veces aguanta */
    if((p.quema > 0.5 || p.choque > 0.4) && this.rnd() < 0.05 + p.quema * 0.1){
      this.suelta(s, s.mirando * 0.6, -0.4);
      s.humor = 'huye'; s.reloj = 0;
    }
  }
  /* el peligro de lo que se lleva en la mano, que ya no está en la rejilla */
  peligroEnMano(m){
    const e = EL[m.tipo];
    let quema = m.temp > 55 ? (m.temp - 55) / 420 : 0;
    if(e.calor) quema = Math.max(quema, 1.2);
    const choque = (e.fuente || (e.elec && m.car)) ? 0.9 : 0;
    return { quema, frio: m.temp < -10 ? (-10 - m.temp) / 80 : 0, choque,
             acido: e.corroe || 0, veneno: e.radia ? 0.45 : 0, T: m.temp };
  }

  /* ═════════════════════════════════════════════════════════════════════
     LA CABEZA · lo que decide qué hacer
     «Pero no siempre» — de ahí que casi cada rama lleve un dado. Un autómata
     que siempre agarra el ladrillo de enfrente se ve como un autómata.
     ═══════════════════════════════════════════════════════════════════ */
  decide(s, pierna){
    s.reloj++;
    s.velocidad = (s.tipo === 'bicho' ? 0.55 : 0.42) * (0.7 + s.talla * 0.4);
    s.andando = true;

    /* dolor manda sobre todo lo demás */
    if((s.quema > 0.35 || s.choque > 0.3 || s.dolor > 0.55) && s.humor !== 'huye'){
      s.humor = 'huye'; s.reloj = 0;
    }

    switch(s.humor){
      case 'huye': {
        s.velocidad *= 1.7;
        s.miradaObj = s.mirando > 0 ? 0 : Math.PI;
        if(s.reloj === 1 && s.mano && this.rnd() < 0.7) this.suelta(s, s.mirando * 1.2, -0.6);
        if(s.reloj % 14 === 0 && this.rnd() < 0.25) s.mirando = -s.mirando;
        if(s.reloj > 70 && s.quema < 0.2 && s.choque < 0.15 && s.dolor < 0.3){
          s.humor = 'pasea'; s.reloj = 0;
        }
        break;
      }
      case 'otea': {
        /* se para y BUSCA: la cabeza barre de un lado a otro. Es el gesto que
           pidió Carlos —«que vean hacia los lados, que busquen»— y no hace
           falta dibujarlo: es una función del reloj. */
        s.andando = false;
        s.miradaObj = Math.sin(s.reloj * 0.06) * 1.25 + (s.mirando > 0 ? 0 : Math.PI);
        if(s.reloj > this.entre(40, 130)){
          s.humor = 'pasea'; s.reloj = 0;
          if(this.rnd() < 0.45) s.mirando = -s.mirando;
        }
        break;
      }
      case 'busca': {
        /* va hacia una celda que le llamó la atención */
        const o = s.objetivo;
        if(!o || !this.M.dentro(o.x, o.y) || this.M.t[this.M.i(o.x, o.y)] === VACIO){
          s.objetivo = null; s.humor = 'pasea'; s.reloj = 0; break;
        }
        s.mirando = o.x >= s.x ? 1 : -1;
        const hom = s.y - CUERPO.torso * s.talla;
        s.miradaObj = Math.atan2(o.y - hom, o.x - s.x);
        const d = Math.hypot(o.x - s.x, o.y - (s.y - CUERPO.torso * s.talla * 0.6));
        if(d < (CUERPO.brazo + CUERPO.antebrazo) * s.talla + 1.1){ s.humor = 'agarra'; s.reloj = 0; }
        else if(s.reloj > 200){ s.humor = 'pasea'; s.reloj = 0; s.objetivo = null; }
        break;
      }
      case 'agarra': {
        s.andando = false;
        const o = s.objetivo;
        if(!o){ s.humor = 'pasea'; s.reloj = 0; break; }
        const hom = s.y - CUERPO.torso * s.talla;
        /* el brazo SE ESTIRA hacia la celda: la animación es la interpolación,
           no una secuencia dibujada */
        const t = clamp(s.reloj / 22, 0, 1);
        s.alcance = { x: lerp(s.x + s.mirando * 0.8, o.x + 0.5, t),
                      y: lerp(hom + 1.0, o.y + 0.5, t) };
        s.miradaObj = Math.atan2(o.y - hom, o.x - s.x);
        if(s.reloj >= 24){
          /* el tirón: mientras la toca YA le está pasando lo del material */
          if(this.M.dentro(o.x, o.y)) this.sufre(s, this.peligroDe(this.M.i(o.x, o.y)), 1.6);
          if(this.arranca(s, o.x, o.y)) s.humor = this.rnd() < 0.5 ? 'carga' : 'avienta';
          else s.humor = 'pasea';
          s.reloj = 0; s.objetivo = null; s.alcance = null;
        }
        break;
      }
      case 'carga': {
        /* pasea con la cosa en la mano, y a lo tonto la suelta o la avienta */
        if(!s.mano){ s.humor = 'pasea'; s.reloj = 0; break; }
        s.velocidad *= 0.82;
        s.miradaObj = (s.mirando > 0 ? 0 : Math.PI) + Math.sin(s.reloj * 0.03) * 0.5;
        if(s.reloj % 30 === 0 && this.rnd() < 0.12) s.mirando = -s.mirando;
        if(s.reloj > this.entre(90, 400)){ s.humor = 'avienta'; s.reloj = 0; }
        break;
      }
      case 'avienta': {
        s.andando = false;
        if(!s.mano){ s.humor = 'pasea'; s.reloj = 0; s.alcance = null; break; }
        const t = clamp(s.reloj / 16, 0, 1);
        const hom = s.y - CUERPO.torso * s.talla;
        /* el brazo se echa atrás y suelta: dos tramos de una misma curva */
        const a = t < 0.6 ? -1.2 * (t / 0.6) : -1.2 + 3.0 * ((t - 0.6) / 0.4);
        s.alcance = { x: s.x + s.mirando * (0.6 + a * 0.9), y: hom + 0.4 - Math.abs(a) * 0.5 };
        if(s.reloj >= 17){
          this.suelta(s, s.mirando * this.entre(0.9, 2.4), -this.entre(0.3, 1.5));
          s.humor = 'pasea'; s.reloj = 0; s.alcance = null;
        }
        break;
      }
      default: {   /* pasea */
        s.humor = 'pasea';
        s.alcance = null;
        s.miradaObj = (s.mirando > 0 ? 0 : Math.PI) + Math.sin(s.edad * 0.013) * 0.35;
        if(!s.enSuelo) break;
        if(s.reloj % 9 === 0){
          const d = this.rnd();
          if(d < 0.05) s.mirando = -s.mirando;
          else if(d < 0.12){ s.humor = 'otea'; s.reloj = 0; break; }
          else if(d < 0.30 && !s.mano && s.tipo === 'persona'){
            const o = this.buscaCelda(s);
            if(o){ s.objetivo = o; s.humor = 'busca'; s.reloj = 0; break; }
          } else if(d < 0.40 && s.tipo === 'bicho'){
            this.pasta(s);
          }
        }
        if(s.tipo === 'persona' && s.energia < 45 && this.rnd() < 0.03) this.pasta(s);
        this.reproduce(s);
      }
    }
  }

  /* ── ¿qué celda le llama la atención? ────────────────────────────────
     Mira un abanico corto delante de él, a la altura del brazo. Y NO filtra
     lo peligroso: por eso a veces agarra la batería y se electrocuta, que es
     exactamente lo que pidió Carlos. */
  buscaCelda(s){
    const M = this.M;
    const hom = Math.round(s.y - CUERPO.torso * s.talla * 0.6);
    const R = Math.round((CUERPO.brazo + CUERPO.antebrazo) * s.talla + 4);
    const cand = [];
    for(let dy = -3; dy <= 4; dy++){
      for(let dx = 1; dx <= R; dx++){
        const x = Math.round(s.x) + s.mirando * dx, y = hom + dy;
        if(!M.dentro(x, y)) continue;
        const k = M.i(x, y), tipo = M.t[k];
        if(tipo === VACIO) continue;
        const e = EL[tipo];
        if(e.fijo) break;                          /* el muro no se arranca */
        if(M.estadoDe(k) === 'gas') continue;
        cand.push({ x, y });
        break;                                     /* la primera de cada fila */
      }
    }
    if(!cand.length) return null;
    return cand[(this.rnd() * cand.length) | 0];
  }

  /* ── ARRANCAR ──────────────────────────────────────────────────────────
     Sacarla de la pared, del suelo, de donde esté. Lo que se lleva no es «un
     ladrillo»: es la celda entera con su temperatura, su carga y su fase, y
     por eso al soltarla sigue estando al rojo. */
  arranca(s, x, y){
    const M = this.M;
    if(!M.dentro(x, y)) return false;
    const k = M.i(x, y), tipo = M.t[k];
    if(tipo === VACIO || EL[tipo].fijo) return false;
    if(M.estadoDe(k) === 'gas') return false;
    s.mano = { tipo, temp: M.temp[k], car: M.car[k], fase: M.fase[k],
               color: M.color[k], moles: M.moles[k] };
    M.cambia(k, VACIO);
    M.car[k] = 0; M.moles[k] = 0; M.fase[k] = 0; M.color[k] = 0;
    M.vx[k] = 0; M.vy[k] = 0; M.suelto[k] = 0; M.sop[k] = 0;
    /* lo de encima se entera de que le quitaron el apoyo */
    M.despierta(x, y, 2);
    return true;
  }

  /* ── SOLTAR O AVENTAR ───────────────────────────────────────────────── */
  suelta(s, vx, vy){
    const M = this.M;
    const m = s.mano;
    if(!m) return false;
    s.mano = null;
    const hom = s.y - CUERPO.torso * s.talla;
    let x = Math.round(s.x + s.mirando * 1.6), y = Math.round(hom + 0.4);
    /* si el sitio está ocupado, se busca uno libre alrededor: soltar algo
       encima de otra cosa la BORRABA, y borrar la pared que acabas de
       arrancar no es soltar, es perder */
    if(!M.dentro(x, y) || M.t[M.i(x, y)] !== VACIO){
      let libre = null;
      for(let dy = -2; dy <= 2 && !libre; dy++)
        for(let dx = -2; dx <= 2; dx++){
          const nx = x + dx, ny = y + dy;
          if(M.dentro(nx, ny) && M.t[M.i(nx, ny)] === VACIO){ libre = [nx, ny]; break; }
        }
      if(!libre) return false;
      x = libre[0]; y = libre[1];
    }
    M.pon(x, y, m.tipo, m.temp);
    const k = M.i(x, y);
    M.car[k] = m.car; M.fase[k] = m.fase; M.color[k] = m.color;
    if(m.moles) M.moles[k] = m.moles;
    /* soltado NO es pintado: obedece la física desde el primer paso */
    M.suelto[k] = 1; M.sop[k] = 0;
    M.vx[k] = vx; M.vy[k] = vy;
    M.despierta(x, y, 2);
    return true;
  }

  /* ── comer: la planta se la come y le da energía ──────────────────── */
  pasta(s){
    const M = this.M;
    const xi = Math.round(s.x);
    const yi = Math.round(s.y + (CUERPO.muslo + CUERPO.espinilla) * s.talla) - 1;
    for(let dy = -2; dy <= 1; dy++) for(let dx = -3; dx <= 3; dx++){
      const x = xi + dx, y = yi + dy;
      if(!M.dentro(x, y)) continue;
      const k = M.i(x, y);
      if(M.t[k] !== IDX.planta) continue;
      M.cambia(k, VACIO);
      s.energia = Math.min(100, s.energia + 14);
      s.salud = Math.min(SALUD_MAX, s.salud + 1.5);
      s.miradaObj = Math.atan2(y - s.y, x - s.x);
      return true;
    }
    return false;
  }

  /* ── que se reproduzcan ─────────────────────────────────────────────── */
  reproduce(s){
    if(this.seres.length >= TOPE) return;
    const adulto = s.tipo === 'bicho' ? 0.58 : 0.94;
    if(s.cria > 0 || s.edad < 700 || s.talla < adulto) return;
    if(s.energia < 55 || s.salud < 60) return;
    if(this.rnd() > 0.03) return;
    for(const o of this.seres){
      if(o === s || o.tipo !== s.tipo || o.muerto || o.cria > 0) continue;
      if(o.edad < 700 || o.energia < 55 || o.talla < adulto) continue;
      if(Math.abs(o.x - s.x) > 4 || Math.abs(o.y - s.y) > 3) continue;
      s.cria = 900; o.cria = 900;
      s.energia -= 25; o.energia -= 25;
      s.miradaObj = o.x > s.x ? 0 : Math.PI;
      const b = nuevoSer(s.tipo, (s.x + o.x) / 2, Math.min(s.y, o.y),
                         s.tipo === 'bicho' ? 0.22 : 0.34);
      b.mirando = this.rnd() < 0.5 ? 1 : -1;
      this.seres.push(b);
      return;
    }
  }

  /* ── el muerto se cae de verdad ─────────────────────────────────────── */
  ragdoll(s, gx, gy, pierna){
    s.muerto++;
    s.vy += gy; s.vx = s.vx * 0.9 + gx * 0.5;
    s.x = clamp(s.x + s.vx, 1, this.M.an - 2);
    s.y += s.vy;
    const suelo = this.sueloBajo(s.x, s.y + 0.2, Math.floor(s.y + pierna + 3));
    if(suelo != null && s.y > suelo - pierna * 0.35){
      s.y = suelo - pierna * 0.35; s.vy = 0; s.vx *= 0.6;
    }
    s.quema *= 0.99;
  }
  entierra(s){
    const M = this.M;
    const x = Math.round(s.x), y = Math.round(s.y);
    if(M.dentro(x, y) && M.t[M.i(x, y)] === VACIO) M.pon(x, y, s.quema > 0.4 ? IDX.ceniza : IDX.tierra);
  }

  /* ═════════════════════════════════════════════════════════════════════
     LA MARCHA · ni un fotograma dibujado
     Los pies se PLANTAN en el suelo de verdad y se quedan ahí mientras el
     cuerpo avanza. Eso es lo que quita el patinaje: la razón de que un
     monigote animado a mano se vea como un muñeco es justamente que sus pies
     resbalan. Aquí el pie no se mueve mientras está apoyado — se mueve el
     resto, y cuando ya no llega, da un paso.
     ═══════════════════════════════════════════════════════════════════ */
  animaPatas(s, pierna, antesX){
    const avance = Math.abs(s.x - antesX);
    const zancada = s.zancada * s.talla;
    s.fase += avance / Math.max(0.3, zancada);
    if(!s.enSuelo) s.fase += 0.02;
    s.fase %= 1;
    const n = s.patas.length;
    for(let i = 0; i < n; i++){
      const p = s.patas[i];
      /* el desfase entre patas: dos alternan, cuatro van cruzadas como un
         trote de verdad — delantera izquierda con trasera derecha */
      const off = n === 2 ? i * 0.5 : [0, 0.5, 0.55, 0.05][i];
      const lat = n === 2 ? (i === 0 ? -0.18 : 0.18)
                          : (i < 2 ? s.mirando : -s.mirando) * CUERPO.torso * s.talla * 0.42;
      const f = (s.fase + off) % 1;
      if(!s.enSuelo){
        /* en el aire las patas cuelgan y se recogen un poco */
        p.px = s.x + lat + s.mirando * 0.3 * (i % 2 ? 1 : -1);
        p.py = s.y + pierna * 0.92;
        p.t = -1; p.apoyada = 0;
        continue;
      }
      if(f < 0.36){
        if(p.t < 0){
          /* arranca el paso: de donde estaba a donde va a caer */
          p.dx = p.px; p.dy = p.py;
          const meta = s.x + lat + s.mirando * zancada * 0.5 * (s.andando ? 1 : 0.1);
          const suelo = this.sueloBajo(meta, s.y, Math.floor(s.y + pierna + 3));
          p.hx = meta; p.hy = suelo != null ? suelo : s.y + pierna;
        }
        p.t = f / 0.36;
        p.px = lerp(p.dx, p.hx, p.t);
        p.py = lerp(p.dy, p.hy, p.t) - Math.sin(Math.PI * p.t) * (0.55 + avance * 1.6) * s.talla;
        p.apoyada = 0;
      } else {
        if(p.t >= 0){ p.px = p.hx; p.py = p.hy; p.t = -1; }
        p.apoyada = 1;
        /* si el pie se quedó demasiado atrás —porque el cuerpo se deslizó— se
           reengancha al suelo que tenga debajo, no se queda flotando */
        if(Math.abs(p.px - s.x - lat) > zancada * 1.15){
          const suelo = this.sueloBajo(s.x + lat, s.y, Math.floor(s.y + pierna + 3));
          p.px = s.x + lat; p.py = suelo != null ? suelo : s.y + pierna;
        }
      }
    }
  }

  /* ═════════════════════════════════════════════════════════════════════
     LA POSTURA · de estado a esqueleto, cada cuadro
     Devuelve puntos en coordenadas de MUNDO. La pantalla sólo los pinta: si
     mañana se dibujan en otro sitio, esto no cambia.
     ═══════════════════════════════════════════════════════════════════ */
  postura(s){
    const T = s.talla, C = CUERPO;
    const tem = s.tiembla;
    const tx = tem ? (this.ruido(s.id * 7 + s.edad) - 0.5) * tem * 0.9 : 0;
    const ty = tem ? (this.ruido(s.id * 13 + s.edad) - 0.5) * tem * 0.9 : 0;
    /* el que sufre se ENCOGE: el torso se acorta y el cuerpo se dobla. Es la
       postura, que es lo que la animación por código da gratis y lo que Carlos
       pidió —«que se vea cómo sufren»— sin una sola letra en pantalla */
    const mal = clamp(Math.max(s.quema, s.dolor, s.choque) * 1.1
                      + (1 - s.salud / SALUD_MAX) * 0.5, 0, 1);
    const muerto = s.muerto > 0;
    const torso = C.torso * T * (muerto ? 0.5 : 1 - mal * 0.28);
    const inclina = muerto ? s.mirando * 1.5
      : s.mirando * (Math.abs(s.vx) * 0.35 + mal * 0.30) + (s.humor === 'huye' ? s.mirando * 0.22 : 0);

    const cadX = s.x + tx;
    const cadY = s.y + ty + Math.sin(s.aliento) * 0.06 * T + mal * 0.5 * T;
    const homX = cadX + inclina * torso * 0.5, homY = cadY - torso;
    const cueX = homX + inclina * 0.4, cueY = homY - C.cuello * T;
    const cabR = C.cabeza * T;
    /* la cabeza MIRA: el círculo se desplaza hacia donde mira y los ojos con
       él. Con eso se lee a dónde atiende sin dibujar una cara */
    const mx = Math.cos(s.mirada), my = Math.sin(s.mirada);
    const cabX = cueX + mx * 0.30 * T, cabY = cueY - cabR + my * 0.22 * T;

    const patas = [];
    const n = s.patas.length;
    for(let i = 0; i < n; i++){
      const p = s.patas[i];
      /* de dónde sale la pata: dos, de la cadera; cuatro, del lomo */
      let ox, oy;
      if(n === 4){
        ox = cadX + (i < 2 ? s.mirando : -s.mirando) * C.torso * T * 0.42;
        oy = cadY + (i % 2 ? 0.12 : -0.12) * T;
      } else {
        ox = cadX + (i === 0 ? -1 : 1) * C.cadera * T * 0.5;
        oy = cadY;
      }
      const lado = n === 4 ? (i < 2 ? 1 : -1) * s.mirando
                           : (i === 0 ? -1 : 1) * (s.mirando > 0 ? 1 : -1);
      const [rx, ry, fx, fy] = codo(ox, oy, p.px, p.py, C.muslo * T, C.espinilla * T, lado);
      patas.push({ ox, oy, rx, ry, fx, fy, apoyada: p.apoyada });
    }

    /* los brazos: sólo las personas los tienen. Van a donde el humor diga */
    const brazos = [];
    if(n === 2){
      const l1 = C.brazo * T, l2 = C.antebrazo * T;
      for(let i = 0; i < 2; i++){
        const ox = homX + (i === 0 ? -1 : 1) * C.hombro * T * 0.5, oy = homY;
        let hx, hy;
        if(muerto){ hx = ox - s.mirando * 1.3 * T; hy = oy + 1.4 * T; }
        else if(s.alcance){                      /* estirando hacia algo */
          hx = s.alcance.x + (i === 0 ? -0.25 : 0.25) * T; hy = s.alcance.y;
        } else if(s.mano){                       /* cargando, por delante */
          hx = homX + s.mirando * 1.35 * T + (i === 0 ? -0.2 : 0.2) * T;
          hy = homY + 1.15 * T;
        } else if(mal > 0.45){                   /* sufriendo: a la cabeza */
          hx = cueX + (i === 0 ? -1 : 1) * 1.0 * T + tx * 2;
          hy = cueY - 0.6 * T + ty * 2;
        } else if(!s.enSuelo){                   /* en el aire, arriba */
          hx = homX + (i === 0 ? -1.2 : 1.2) * T; hy = homY - 0.9 * T;
        } else {                                 /* andando: contrapeso */
          const sw = Math.sin((s.fase + i * 0.5) * Math.PI * 2);
          hx = homX - s.mirando * sw * (0.55 + Math.abs(s.vx) * 0.9) * T;
          hy = homY + (C.brazo + C.antebrazo) * T * 0.82;
        }
        const [cx, cy, mx2, my2] = codo(ox, oy, hx, hy, l1, l2, i === 0 ? -1 : 1);
        brazos.push({ ox, oy, cx, cy, mx: mx2, my: my2 });
      }
    }

    /* dónde va lo que lleva en la mano */
    let carga = null;
    if(s.mano && brazos.length === 2){
      carga = { x: (brazos[0].mx + brazos[1].mx) / 2, y: (brazos[0].my + brazos[1].my) / 2,
                tipo: s.mano.tipo, temp: s.mano.temp, car: s.mano.car,
                lado: Math.max(0.9, T * 1.05) };
    }
    return { cadX, cadY, homX, homY, cueX, cueY, cabX, cabY, cabR,
             patas, brazos, carga, mira: [mx, my], mal, T, muerto,
             /* para que la pantalla pueda vestirlos: el id da una paleta
                estable —el mismo monigote con la misma camisa siempre— y
                `mirando` dice de qué lado va la cara */
             id: s.id, mirando: s.mirando, bicho: n === 4 };
  }

  /* ruido barato y estable por ser, para el temblor */
  ruido(n){
    n = (n * 374761393 + 668265263) | 0;
    n = ((n ^ (n >> 13)) * 1274126177) | 0;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }

  /* ── altas ───────────────────────────────────────────────────────────── */
  persona(x, y, talla = 1){
    if(this.seres.length >= TOPE) return null;
    const s = nuevoSer('persona', x, y, talla);
    s.mirando = this.rnd() < 0.5 ? 1 : -1;
    this.seres.push(s);
    return s;
  }
  bicho(x, y, talla = 0.62){
    if(this.seres.length >= TOPE) return null;
    const s = nuevoSer('bicho', x, y, talla);
    s.mirando = this.rnd() < 0.5 ? 1 : -1;
    s.zancada = 1.5;
    this.seres.push(s);
    return s;
  }
  limpia(){ this.seres.length = 0; this.arboles.length = 0; }

  /* ═════════════════════════════════════════════════════════════════════
     LAS PLANTAS · con TRONCO y RAMAS
     ---------------------------------------------------------------------
     Carlos: «tus plantas, a la hora de crecer, no me están sacando ramas, no
     están creciendo alto, están creciendo de un solo píxel».
     Tenía razón y la causa está a la vista en `motor.js`: `crece()` elegía UNA
     de cinco celdas vecinas al azar y la volvía planta. Eso no es un árbol, es
     una mancha que se expande — no tiene arriba, no tiene tronco y no se
     ramifica porque no hay nada que recuerde hacia dónde iba.
     Un árbol necesita memoria de dirección. Aquí cada árbol lleva sus PUNTAS:
     cada punta sabe hacia dónde apunta y cuánto vigor le queda. Avanza, se
     endereza hacia arriba, se parte en dos de vez en cuando con menos vigor
     cada vez, y al agotarse suelta hojas. Es un sistema-L, pero con el vigor
     mandando en vez de un número fijo de iteraciones: así un árbol que crece
     pegado a una pared sale torcido y más chaparro, que es lo que hace un
     árbol de verdad.
     El tronco es MADERA y las hojas PLANTA — dos elementos que ya existían,
     así que un árbol arde como arde la madera sin una línea nueva.
     ═══════════════════════════════════════════════════════════════════ */
  siembra(x, y){
    const M = this.M;
    if(!M.dentro(x, y)) return null;
    if(this.arboles.length > 90) return null;
    for(const a of this.arboles) if(Math.abs(a.rx - x) < 3 && Math.abs(a.ry - y) < 6) return null;
    /* ⚠ LA RAÍZ SE PLANTA DE VERDAD, Y ESTO COSTÓ UNA TARDE. La primera
       versión dejaba la celda de la raíz como estaba y arrancaba la punta en
       (x+0.5, y+0.5) — o sea que la PRIMERA celda que escribía era la de al
       lado, y la raíz nunca llegaba a ser madera. A los 24 pasos el vigilante
       de «¿sigue viva la raíz?» miraba esa celda, la veía vacía y mataba el
       árbol. Resultado: cinco celdas de tronco, cero hojas y cuatro de alto,
       o sea EXACTAMENTE la queja de Carlos, pero por otro motivo. Un árbol
       que se mata solo se ve igual que un árbol que no sabe crecer. */
    /* ⚠ EL VIGOR ESTÁ MEDIDO, NO PUESTO A OJO, y de él salen el alto, las
       ramas y la copa de un tirón. Barrido con seis semillas a 340 pasos:
           10-19 → 21 madera · 11 hoja ·  6.2 columnas · 15.7 de alto
           16-26 → 29 · 32 ·  9.5 · 20.0
           22-34 → 42 · 45 · 11.0 · 26.3   ← éste
           28-44 → 51 · 89 · 15.2 · 30.7   (no cabe en una sala de 70)
       Con 10-19 salía la queja de Carlos: «no están creciendo alto, no me
       están sacando ramas». No era el algoritmo, era el número. */
    const vigor = this.entre(22, 34);
    const kr = M.i(x, y);
    const tr = M.t[kr];
    if(tr === VACIO || tr === IDX.planta || tr === IDX.semilla) M.pon(x, y, IDX.madera);
    const arbol = {
      rx: x, ry: y, edad: 0, vivo: true,
      /* ── EL CICLO DE VIDA ────────────────────────────────────────────────
         Carlos: «quiero ciclo de vida correcto para las plantas, que el agua
         pueda nutrirlas, que crezcan poco a poco, que den frutos, que se
         marchiten, dejen la semilla y vuelvan a crecer, quiero todo».
         Cuatro fases y una moneda: el AGUA. Crecer cuesta agua, fructificar
         cuesta más, y sin agua no pasa ninguna de las dos — el árbol se
         queda parado hasta que llueva. */
      fase: 'crece',
      /* ⚠ ARRANCA EN CERO, y por eso una semilla en el desierto no da NADA.
         Con una reserva de salida crecía siete celdas antes de secarse, y la
         prueba «sin agua cerca, no crece» seguía en rojo con otro número. */
      agua: 0,                   /* lo que lleva bebido y no ha gastado */
      sed: 0,                    /* pasos seguidos sin encontrar agua */
      frutos: 0,
      /* cuánto vive ya maduro antes de marchitarse. Con vigor entra el
         tamaño: un árbol grande dura más, como debe ser. */
      aguanta: Math.round(this.entre(260, 520) + vigor * 14),
      maduro: 0,
      puntas: [{ x, y, ang: -Math.PI / 2 + this.entre(-0.18, 0.18),
                 vigor, grosor: 1 + vigor / 13, gen: 0, choques: 0 }],
    };
    this.arboles.push(arbol);
    return arbol;
  }

  pasoArboles(){
    const M = this.M;
    for(let i = this.arboles.length - 1; i >= 0; i--){
      const a = this.arboles[i];
      a.edad++;
      /* la raíz manda: si la quemaron o la arrancaron, el árbol deja de crecer */
      if(a.edad % 24 === 0){
        const k = M.dentro(a.rx, a.ry) ? M.i(a.rx, a.ry) : -1;
        const t = k < 0 ? -1 : M.t[k];
        if(t !== IDX.madera && t !== IDX.planta && t !== IDX.semilla) a.vivo = false;
      }
      if(!a.vivo){ this.siembraSemilla(a); this.arboles.splice(i, 1); continue; }

      /* ── BEBER ───────────────────────────────────────────────────────────
         ⚠ Y AQUÍ ESTABA «sin agua cerca, no crece» EN ROJO. La comprobación
         era `a.edad % 16 === 0 && !hayAgua(...)`: o sea que se miraba el agua
         UN PASO DE CADA DIECISÉIS y los otros quince crecía en pleno
         desierto. Medido: 32 celdas de árbol sin una gota. Ahora se bebe cada
         paso, y beber GASTA el agua — el árbol se la lleva. */
      this.bebe(a);

      if(a.fase === 'crece'){
        if(!a.puntas.length){ a.fase = 'fructifica'; continue; }
        if(a.agua < 1){ a.sed++; continue; }        /* seco: se para y espera */
        if(this.rnd() > 0.34) continue;
        a.agua -= 1;                                 /* crecer cuesta */
        this.creceArbol(a);
        continue;
      }

      a.maduro++;
      if(a.fase === 'fructifica'){
        /* dar fruta cuesta más que crecer: por eso un árbol sediento crece
           raquítico pero no da nada */
        if(a.agua >= 3 && this.rnd() < 0.05){ a.agua -= 3; this.daFruta(a); }
        if(a.maduro > a.aguanta) a.fase = 'marchita';
        continue;
      }

      if(a.fase === 'marchita'){
        this.marchita(a);
        continue;
      }
    }
  }

  /* ── BEBER ────────────────────────────────────────────────────────────────
     Busca agua alrededor de la raíz y se la lleva: una celda cada tantos
     pasos. Que el agua SE GASTE es la mitad del encargo —«que el agua pueda
     nutrirlas»—: si no se gastara, un charco alimentaría un bosque infinito y
     regar no significaría nada. */
  bebe(a){
    const M = this.M;
    if(a.agua > 14) return;                  /* lleno: no sorbe más */
    let k = -1;
    for(let dy = -2; dy <= 6 && k < 0; dy++) for(let dx = -5; dx <= 5; dx++){
      const nx = a.rx + dx, ny = a.ry + dy;
      if(!M.dentro(nx, ny)) continue;
      const kk = M.i(nx, ny);
      const t = M.t[kk];
      if(t === IDX.agua || t === IDX.salada){ k = kk; break; }
    }
    if(k < 0){ a.sed++; return; }
    a.sed = 0;
    /* ⚠ CUÁNTO SE BEBE ESTÁ MEDIDO CONTRA LO QUE CUESTA CRECER, no puesto a
       ojo. Crecer gasta 1 y pasa en el 34% de los pasos: 0.34 por paso. Con un
       trago de celda entera al 12% el árbol se bebía el charco en un suspiro y
       salía raquítico —las pruebas de copa y ramas se pusieron en rojo—. Al 3%
       el balance queda en 0.68 contra 0.34: crece bien y aun así un charco se
       nota bajar, que es lo que hay que ver. */
    if(this.rnd() < 0.03){ M.cambia(k, VACIO); a.agua += 6; }
    else a.agua += 0.5;
  }

  /* ── DAR FRUTA ───────────────────────────────────────────────────────────
     La fruta sale en una hoja, no en el aire: se busca una celda de planta de
     la copa y se convierte. Es polvo, así que en cuanto la hoja de debajo se
     cae, la fruta se cae también — y se la llevan las hormigas, porque es del
     grupo «vida». */
  daFruta(a){
    const M = this.M;
    const R = 14;
    for(let i = 0; i < 30; i++){
      const nx = a.rx + ((this.rnd() * R * 2) | 0) - R;
      const ny = a.ry - ((this.rnd() * R * 1.6) | 0);
      if(!M.dentro(nx, ny)) continue;
      const k = M.i(nx, ny);
      if(M.t[k] !== IDX.planta) continue;
      /* y con hueco abajo o al lado: una fruta enterrada en la copa no se ve */
      M.cambia(k, IDX.fruta);
      a.frutos++;
      return true;
    }
    return false;
  }

  /* ── MARCHITARSE ─────────────────────────────────────────────────────────
     Las hojas se van cayendo hasta que no queda ninguna, y entonces el árbol
     muere y deja su semilla. No se borra de golpe: marchitarse es algo que se
     ve pasar. */
  marchita(a){
    const M = this.M;
    const R = 15;
    /* ⚠ SE RECORRE LA COPA ENTERA, NO 26 POSICIONES AL AZAR. Con muestreo,
       «no vi ninguna hoja» se confundía con «no queda ninguna»: el árbol se
       daba por muerto y dejaba TRECE hojas colgando en el aire para siempre.
       Un muestreo contesta «probablemente» y aquí hace falta un sí o un no.
       Cuesta un recorrido de una caja de 30×24, y sólo mientras se marchita. */
    let quedan = 0;
    const x0 = Math.max(0, a.rx - R), x1 = Math.min(M.an - 1, a.rx + R);
    const y0 = Math.max(0, a.ry - Math.round(R * 1.6)), y1 = Math.min(M.al - 1, a.ry + 1);
    for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++){
      const k = M.i(x, y);
      if(M.t[k] !== IDX.planta && M.t[k] !== IDX.fruta) continue;
      /* ⚠ SÓLO LAS HOJAS DECIDEN SI SIGUE VIVO. Contando también la fruta, el
         árbol NO SE MORÍA NUNCA: la fruta se suelta pero no se borra, así que
         `quedan` no llegaba a cero jamás — 6000 pasos y seguía marchitándose.
         Una fruta caída ya no es parte del árbol. */
      if(M.t[k] === IDX.planta) quedan++;
      /* poquito por paso: marchitarse es algo que se ve pasar, no un borrado
         de golpe. La fruta madura se CAE en vez de desaparecer — ya es polvo,
         así que en cuanto se suelta obedece la gravedad y se la llevan. */
      if(this.rnd() < 0.04){
        if(M.t[k] === IDX.fruta) M.suelto[k] = 1;
        else M.cambia(k, VACIO);
      }
    }
    if(!quedan) a.vivo = false;              /* sin una hoja: se acabó */
  }

  /* ── LA SEMILLA ──────────────────────────────────────────────────────────
     Lo que cierra el ciclo. Cae al pie del árbol, y el gancho `germina` que ya
     existe la convierte en árbol nuevo EN CUANTO HAYA AGUA. Por eso no hace
     falta código de «volver a crecer»: vuelve a crecer porque hay una semilla
     y el mundo ya sabe qué hacer con una semilla. */
  siembraSemilla(a){
    const M = this.M;
    for(let i = 0; i < 12; i++){
      const nx = a.rx + ((this.rnd() * 7) | 0) - 3;
      const ny = a.ry - 1 - ((this.rnd() * 3) | 0);
      if(!M.dentro(nx, ny)) continue;
      if(M.t[M.i(nx, ny)] !== VACIO) continue;
      M.pon(nx, ny, IDX.semilla);
      return true;
    }
    return false;
  }

  hayAgua(x, y){
    const M = this.M;
    for(let dy = -3; dy <= 6; dy++) for(let dx = -6; dx <= 6; dx++){
      const nx = x + dx, ny = y + dy;
      if(!M.dentro(nx, ny)) continue;
      const t = M.t[M.i(nx, ny)];
      if(t === IDX.agua || t === IDX.salada) return true;
    }
    return false;
  }

  creceArbol(a){
    const M = this.M;
    const nuevas = [];
    for(let j = a.puntas.length - 1; j >= 0; j--){
      const p = a.puntas[j];
      if(p.vigor <= 0){ this.hojas(p); a.puntas.splice(j, 1); continue; }
      /* gravitropismo: la punta se endereza hacia arriba, y el azar la
         despeina. Sin lo primero el árbol se tumba; sin lo segundo salen dos
         árboles iguales y se nota */
      let d = -Math.PI / 2 - p.ang;
      while(d > Math.PI) d -= Math.PI * 2;
      while(d < -Math.PI) d += Math.PI * 2;
      p.ang += d * (0.05 + 0.10 / (1 + p.gen)) + this.entre(-0.26, 0.26);
      const nx = p.x + Math.cos(p.ang), ny = p.y + Math.sin(p.ang);
      const xi = Math.round(nx), yi = Math.round(ny);
      if(!M.dentro(xi, yi) || yi < 1){ this.hojas(p); a.puntas.splice(j, 1); continue; }
      const t = M.t[M.i(xi, yi)];
      if(t !== VACIO && t !== IDX.planta && t !== IDX.madera){
        /* hay algo en el camino: se dobla. Tres intentos y se rinde */
        p.choques++;
        p.ang += this.rnd() < 0.5 ? 0.8 : -0.8;
        if(p.choques > 2){ this.hojas(p); a.puntas.splice(j, 1); }
        continue;
      }
      p.choques = 0;
      p.x = nx; p.y = ny;
      M.pon(xi, yi, p.grosor >= 0.85 ? IDX.madera : IDX.planta);
      /* el tronco ENGORDA: con grosor 2 se pinta la celda de al lado, y con 3
         las dos. Es lo que hace que se vea un tronco y no un alambre */
      if(p.grosor >= 2){
        const lados = p.grosor >= 3 ? [-1, 1] : [Math.sin(p.ang) >= 0 ? -1 : 1];
        for(const l of lados){
          const ax = xi + l;
          if(M.dentro(ax, yi) && M.t[M.i(ax, yi)] === VACIO) M.pon(ax, yi, IDX.madera);
        }
      }
      p.vigor -= 1;
      p.grosor *= 0.955;
      /* ¿se parte? Más arriba, más probable, y cada rama hereda menos vigor:
         de ahí sale la silueta de un árbol sin dibujarla */
      const pRama = p.gen === 0 ? 0.13 : 0.20;
      if(p.vigor > 2 && a.puntas.length + nuevas.length < 26 && this.rnd() < pRama){
        const abre = this.entre(0.45, 1.0) * (this.rnd() < 0.5 ? 1 : -1);
        nuevas.push({ x: p.x, y: p.y, ang: p.ang + abre,
                      vigor: p.vigor * this.entre(0.45, 0.70),
                      grosor: p.grosor * 0.62, gen: p.gen + 1, choques: 0 });
        p.ang -= abre * 0.30;
        p.vigor *= 0.86;
        p.grosor *= 0.86;
      }
    }
    for(const n of nuevas) a.puntas.push(n);
  }

  /* la copa: un puñado de hojas donde se acabó la rama */
  hojas(p){
    const M = this.M;
    const r = 1 + ((this.rnd() * 2) | 0);
    for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){
      if(dx * dx + dy * dy > r * r + 1) continue;
      if(this.rnd() < 0.32) continue;
      const x = Math.round(p.x) + dx, y = Math.round(p.y) + dy;
      if(!M.dentro(x, y)) continue;
      if(M.t[M.i(x, y)] !== VACIO) continue;
      M.pon(x, y, IDX.planta);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EL ENGANCHE · una función, y `motor.js` no se entera
   ═════════════════════════════════════════════════════════════════════════ */
export function instalaVida(M, semilla){
  const v = new Vida(M, semilla);
  M.seres = v;                       /* ⚠ `seres` y NO `vida`: `M.vida` ya
                                        existe y es la edad de cada celda.
                                        Pisarla habría roto el fuego, el humo
                                        y los interruptores de un plumazo. */
  /* la mancha de un píxel se retira, y en su lugar una planta suelta que esté
     apoyada arranca un árbol de verdad */
  M.crece = (x, y) => {
    if(v.arboles.length > 60) return;
    if(v.rnd() > 0.06) return;
    if(!v.solido(x, y + 1)) return;
    if(!v.hayAgua(x, y)) return;
    v.siembra(x, y);
  };
  M.germina = (x, y, k) => {
    if(v.rnd() > 0.02) return;
    const abajo = M.dentro(x, y + 1) ? M.t[M.i(x, y + 1)] : IDX.muro;
    if(abajo !== IDX.tierra && abajo !== IDX.arena) return;
    if(!v.hayAgua(x, y)) return;
    M.cambia(k, IDX.madera, true);
    v.siembra(x, y);
  };
  return v;
}
