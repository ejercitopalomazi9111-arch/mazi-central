/* ══════════════════════════════════════════════════════════════════════════
   SOL · dónde está el sol, para una fecha y un lugar
   ──────────────────────────────────────────────────────────────────────────
   Es el algoritmo de la NOAA (Solar Calculation Details), el mismo que usan
   sus hojas de cálculo públicas. Setenta líneas, cero dependencias.

   ⚠ POR QUÉ NO SE PIDE A UNA API. Una API de salida y puesta del sol convierte
   una página que funciona sin red en una que depende de que un servidor ajeno
   siga vivo, sea rápido y no cobre. La cuenta es aritmética del siglo XVIII:
   cabe aquí y no puede caerse.

   ⚠ LA PRECISIÓN, DICHA DE FRENTE. Este algoritmo da el minuto correcto entre
   los paralelos 60 y −60; más cerca de los polos el error crece porque el sol
   roza el horizonte durante horas. Y en los días de sol de medianoche o noche
   polar no hay salida ni puesta: la función devuelve `null` y la página tiene
   que saber dibujar eso — no es un caso raro, es medio año en Ushuaia.
   ═════════════════════════════════════════════════════════════════════════ */
const GR = Math.PI / 180;

/* Día juliano a mediodía UTC de una fecha civil. */
export function diaJuliano(a, m, d){
  if(m <= 2){ a -= 1; m += 12; }
  const A = Math.floor(a / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (a + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

/* Todo lo que depende sólo del instante, no del lugar. */
function sol(jd){
  const t = (jd - 2451545) / 36525;                       /* siglos julianos */
  const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const M  = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e  = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C  = Math.sin(M*GR) * (1.914602 - t*(0.004817 + 0.000014*t))
           + Math.sin(2*M*GR) * (0.019993 - 0.000101*t)
           + Math.sin(3*M*GR) * 0.000289;
  const lam = L0 + C;                                     /* longitud verdadera */
  const om  = 125.04 - 1934.136 * t;
  const lamAp = lam - 0.00569 - 0.00478 * Math.sin(om*GR);/* longitud aparente */
  const e0 = 23 + (26 + ((21.448 - t*(46.815 + t*(0.00059 - t*0.001813))))/60)/60;
  const eps = e0 + 0.00256 * Math.cos(om*GR);             /* oblicuidad corregida */
  const dec = Math.asin(Math.sin(eps*GR) * Math.sin(lamAp*GR)) / GR;

  /* la ecuación del tiempo, en minutos */
  const y = Math.tan(eps/2*GR) ** 2;
  const ec = 4 * (y*Math.sin(2*L0*GR) - 2*e*Math.sin(M*GR)
            + 4*e*y*Math.sin(M*GR)*Math.cos(2*L0*GR)
            - 0.5*y*y*Math.sin(4*L0*GR) - 1.25*e*e*Math.sin(2*M*GR)) / GR;
  return { dec, ec };
}

/* El ángulo horario para una altura dada del sol, en grados.
   Devuelve null si el sol no cruza esa altura en todo el día. */
function anguloHorario(lat, dec, altura){
  const cos = (Math.cos((90 - altura)*GR) - Math.sin(lat*GR)*Math.sin(dec*GR))
            / (Math.cos(lat*GR) * Math.cos(dec*GR));
  if(cos > 1 || cos < -1) return null;
  return Math.acos(cos) / GR;
}

/* ── la única función que usa la página ──────────────────────────────────
   Devuelve minutos desde la medianoche LOCAL del lugar (husoMin = minutos de
   desplazamiento respecto a UTC; −360 para el centro de México).

   `alturas` son las que se dibujan: −0.833° es la salida y la puesta —el
   −0.833 es el radio aparente del disco más la refracción, y por eso el sol
   "sale" cuando geométricamente aún está bajo el horizonte—, y −6, −12 y −18
   son los tres crepúsculos. */
export const ALTURAS = { salida:-0.833, civil:-6, nautico:-12, astronomico:-18 };

export function luzDe(a, m, d, lat, lon, husoMin){
  const jd = diaJuliano(a, m, d);
  const { dec, ec } = sol(jd + 0.5 - lon/360);   /* iterado una vez sobre el mediodía */
  /* mediodía solar, en minutos locales */
  const medio = 720 - 4*lon - ec + husoMin;
  const r = { medio, dec };
  for(const nombre in ALTURAS){
    const ha = anguloHorario(lat, dec, ALTURAS[nombre]);
    if(ha === null){
      /* ni sale ni se pone. ¿Es de día todo el día, o de noche? */
      const alturaMedio = 90 - Math.abs(lat - dec);
      r[nombre] = null;
      r[nombre + 'Siempre'] = alturaMedio > ALTURAS[nombre] ? 'dia' : 'noche';
    }else{
      r[nombre] = [medio - 4*ha, medio + 4*ha];
    }
  }
  r.horasLuz = r.salida ? (r.salida[1] - r.salida[0]) / 60
             : (r.salidaSiempre === 'dia' ? 24 : 0);
  return r;
}
