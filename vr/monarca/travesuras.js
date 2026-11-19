/* LO QUE HACE EL JUGADOR EN VEZ DE PONER ATENCIÓN (Carlos, 19 nov: «el narrador debe ser capaz de prever cualquier
   estupidez que se le ocurra al jugador: desde ignorar por completo, hacer otras cosas o jugar con sus manos, hasta lo
   más absurdo, y reaccionar a ello»).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Lógica pura (sin three, sin pantalla): monarca.js le pasa una «foto» por cuadro y los eventos (botones, escenas,
   respuestas) y esto contesta qué reacción del narrador toca, o nada. Se prueba en Node (vr/pruebas-travesuras.mjs).

   La foto (todo opcional; lo que falta no se juzga):
     { t (s), escena, explicando, yaw (rad, 0 = de frente al cartel), pitch (rad, + arriba), roll (rad),
       pos [x,y,z] (m, 6DoF), manos [{ pellizco, palma, puno, x, y, alto (m respecto a los ojos), dMariposa (m) }],
       luz (0–1, la cámara), zona ('zona' | 'obstaculo' | null), ejes (stick, magnitud 0–1), vertical (bool),
       sacudida (m/s², del acelerómetro) }
   Eventos: evento(tipo, datos) con tipo en boton · atras · siguiente · voz · opciones · puntaje · creditos · otraVez ·
     escena · pregunta · respuesta · planta · oculto · visible · entrar · final.

   Para no volverse insoportable: una reacción cada 7 s como mucho (lo de seguridad se salta la fila), cada travesura con
   su propio enfriamiento, y las que escalan (mirar lejos, quedarse quieto, dar vueltas) suben de tono cada vez. */

export const T = {
  cada: 7,                   /* s entre dos reacciones cualesquiera */
  ventana: 22,               /* s de historia que se guardan */
  lejos: 75, atras: 150, lejosSeg: 3,          /* grados y segundos para «mirar a otro lado» */
  piso: -55, cielo: 55, verticalSeg: 3,        /* grados de cabeceo */
  ladeo: 35, ladeoSeg: 2.5,
  vueltas: 540, vueltasSeg: 4,                 /* grados acumulados en esa ventana */
  oscila: 4, oscilaSeg: 1.6, oscilaGrados: 8,  /* sí y no con la cabeza */
  sinCabeza: .2, sinCabezaSeg: 20,             /* grados de rango: así de quieto sólo está un visor en la mesa */
  agacha: .35, salta: .15, cartel: .8, lejosCuerpo: 1.5,
  manosJuega: 6, saludo: 4, saludoAmp: .08, pellizcos: 6, pellizcosSeg: 4,
  oscuro: .06, oscuroSeg: 1.5, machaca: 8, machacaSeg: 3, stickSeg: 5,
  quieto: [25, 25, 60, 120, 240],              /* s sin tocar nada → r-quieto-1…5 (el 5 avanza solo) */
  record: 60, rapidoResp: 1.2, floresRapido: 5, largo: 15 * 60, sacudida: 25,
};

const deg = (r) => r * 180 / Math.PI;
const dAng = (a, b) => { let d = a - b; while(d > Math.PI) d -= 2 * Math.PI; while(d < -Math.PI) d += 2 * Math.PI; return d; };
/* cuántas veces cambia de dirección una serie, contando sólo vaivenes de al menos `amp` */
function vaivenes(xs, amp){
  let n = 0, dir = 0, ext = xs[0];
  for(const x of xs){ const d = x - ext;
    if(dir <= 0 && d > amp){ if(dir < 0) n++; dir = 1; ext = x; }
    else if(dir >= 0 && d < -amp){ if(dir > 0) n++; dir = -1; ext = x; }
    else if((dir > 0 && x > ext) || (dir < 0 && x < ext)) ext = x; }
  return n;
}

/* reiniciar el punto de partida del cuerpo (al recentrar) */
export function crearTravesuras(op = {}){
  const L = { ...T, ...op };
  const h = [];                                     /* las fotos de los últimos `ventana` s */
  const ultimo = {};                                /* id → t de la última vez */
  const veces = {};                                 /* familia → cuántas veces se ha dicho (para escalar) */
  const st = { dicho: null, enEscena: new Set(), ultimaT: -99, inicio: null, tocoEn: 0, quietos: 0, saltadas: 0, base: null,
    botones: [], pingpong: [], voces: [], puntaje: 0, creditos: 0, otraVez: 0, pregEn: 0, plantas: [], ocultoEn: null,
    salioEn: null, finalDicho: false, largoDicho: false, escena: null };

  /* decide si una reacción se puede decir ahora */
  function puede(id, t, { seguridad = false, unaVez = false, enfria = 30 } = {}){
    if(unaVez && ultimo[id] != null) return false;
    if(ultimo[id] != null && t - ultimo[id] < enfria) return false;
    if(!seguridad && t - st.ultimaT < L.cada) return false;
    return true;
  }
  function decir(id, t){ ultimo[id] = t; st.ultimaT = t; st.dicho = id; st.enEscena.add(id); return id; }
  /* la que sigue de una familia que escala: r-lejos-1, -2, -3… (se queda en la última) */
  function escalar(fam, n, t, opts){ const k = Math.min(n, (veces[fam] || 0) + 1), id = `${fam}-${k}`;
    if(!puede(fam, t, opts)) return null; veces[fam] = k; ultimo[fam] = t; return decir(id, t); }

  function durante(pred, seg, t){         /* ¿`pred` se cumple en TODAS las fotos de los últimos `seg` s (y hay suficientes)? */
    const xs = h.filter((f) => t - f.t <= seg); if(!xs.length || t - xs[0].t < seg * .8) return false;
    return xs.every(pred);
  }

  function paso(f){
    const t = f.t; if(st.inicio == null) st.inicio = t;
    h.push(f); while(h.length && t - h[0].t > L.ventana) h.shift();
    if(f.pos && !st.base) st.base = [...f.pos];

    /* ── seguridad primero: se salta la fila ── */
    if(f.zona === 'obstaculo' && puede('r-zona', t, { seguridad: true, enfria: 20 })) return decir('r-zona', t);

    /* ── el teléfono ── */
    if(f.sacudida > L.sacudida && puede('r-agitar', t, { enfria: 60 })) return decir('r-agitar', t);
    if(f.vertical && durante((x) => x.vertical, 2, t) && puede('r-vertical', t, { enfria: 90 })) return decir('r-vertical', t);
    if(f.luz != null && durante((x) => x.luz != null && x.luz < L.oscuro, L.oscuroSeg, t) && puede('r-oscuro', t, { enfria: 45 })) return decir('r-oscuro', t);
    if(!st.largoDicho && t - st.inicio > L.largo && puede('r-largo', t)){ st.largoDicho = true; return decir('r-largo', t); }

    /* ── la cabeza ── */
    if(f.yaw != null){
      const xs = h.filter((x) => t - x.t <= L.vueltasSeg && x.yaw != null);
      let giro = 0; for(let i = 1; i < xs.length; i++) giro += Math.abs(dAng(xs[i].yaw, xs[i - 1].yaw));
      if(deg(giro) > L.vueltas && t - xs[0].t > L.vueltasSeg * .6){ const r = escalar('r-vueltas', 2, t, { enfria: 20 }); if(r) return r; }
      const ys = h.filter((x) => t - x.t <= L.oscilaSeg && x.yaw != null);
      if(ys.length > 6){
        const yaw = ys.map((x) => deg(x.yaw)), pit = ys.map((x) => deg(x.pitch || 0));
        if(vaivenes(yaw, L.oscilaGrados) >= L.oscila && puede('r-no-cabeza', t, { enfria: 60 })) return decir('r-no-cabeza', t);
        if(vaivenes(pit, L.oscilaGrados) >= L.oscila && puede('r-si-cabeza', t, { enfria: 60 })) return decir('r-si-cabeza', t);
      }
      if(durante((x) => x.yaw != null && Math.abs(deg(x.yaw)) > L.atras, L.lejosSeg, t) && puede('r-atras-mira', t, { enfria: 45 })) return decir('r-atras-mira', t);
      if(f.explicando && !f.mirarLibre && durante((x) => x.yaw != null && Math.abs(deg(x.yaw)) > L.lejos, L.lejosSeg, t)){ const r = escalar('r-lejos', 3, t, { enfria: 25 }); if(r) return r; }
      if(durante((x) => deg(x.pitch || 0) < L.piso, L.verticalSeg, t) && puede('r-piso', t, { enfria: 60 })) return decir('r-piso', t);
      if(durante((x) => deg(x.pitch || 0) > L.cielo, L.verticalSeg, t) && puede('r-cielo', t, { enfria: 60 })) return decir('r-cielo', t);
      if(durante((x) => Math.abs(deg(x.roll || 0)) > L.ladeo, L.ladeoSeg, t) && puede('r-ladeado', t, { enfria: 90 })) return decir('r-ladeado', t);
      const zs = h.filter((x) => t - x.t <= L.sinCabezaSeg && x.yaw != null);
      if(f.conGiro && zs.length > 20 && t - zs[0].t > L.sinCabezaSeg * .9){
        const rango = (k) => { const v = zs.map((x) => deg(x[k] || 0)); return Math.max(...v) - Math.min(...v); };
        if(rango('yaw') < L.sinCabeza && rango('pitch') < L.sinCabeza && puede('r-sin-cabeza', t, { enfria: 120 })) return decir('r-sin-cabeza', t);
      }
    }

    /* ── el cuerpo (con 6DoF) ── */
    if(f.pos && st.base){
      const dy = f.pos[1] - st.base[1], dh = Math.hypot(f.pos[0] - st.base[0], f.pos[2] - st.base[2]);
      if(durante((x) => x.pos && x.pos[1] - st.base[1] < -L.agacha, 1.5, t) && puede('r-agachado', t, { enfria: 60 })) return decir('r-agachado', t);
      const antes = h.find((x) => x.pos && t - x.t <= .6);
      if(antes && dy > L.salta && f.pos[1] - antes.pos[1] > L.salta && puede('r-salto', t, { enfria: 60 })) return decir('r-salto', t);
      if(f.dCartel != null && f.dCartel < L.cartel && puede('r-cerca-cartel', t, { enfria: 60 })) return decir('r-cerca-cartel', t);
      if(dh > L.lejosCuerpo && puede('r-lejos-cuerpo', t, { enfria: 45 })) return decir('r-lejos-cuerpo', t);
    }

    /* ── las manos ── */
    const manos = f.manos || [];
    if(manos.some((m) => m.dMariposa != null && m.dMariposa < .2) && puede('r-tocar-mariposa', t, { enfria: 60 })) return decir('r-tocar-mariposa', t);
    if(manos.length >= 2 && manos.every((m) => m.alto != null && m.alto > .1) && durante((x) => (x.manos || []).length >= 2 && x.manos.every((m) => m.alto > .1), 1, t) && puede('r-manos-arriba', t, { enfria: 60 })) return decir('r-manos-arriba', t);
    if(manos.length >= 2 && manos.every((m) => m.puno) && durante((x) => (x.manos || []).filter((m) => m.puno).length >= 2, 1, t) && puede('r-punos', t, { enfria: 60 })) return decir('r-punos', t);
    { const xs = h.filter((x) => t - x.t <= 1.6 && (x.manos || []).some((m) => m.palma)).map((x) => x.manos.find((m) => m.palma).x);
      if(xs.length > 6 && vaivenes(xs, L.saludoAmp) >= L.saludo && puede('r-saludo', t, { enfria: 60 })) return decir('r-saludo', t); }
    { let n = 0, antes = false; for(const x of h){ if(t - x.t > L.pellizcosSeg) continue; const p = (x.manos || []).some((m) => m.pellizco); if(p && !antes) n++; antes = p; }
      if(n >= L.pellizcos && puede('r-pellizcos', t, { enfria: 60 })) return decir('r-pellizcos', t); }
    if(f.explicando && durante((x) => (x.manos || []).length > 0, L.manosJuega, t) && puede('r-manos-juega', t, { enfria: 90 })) return decir('r-manos-juega', t);

    /* ── el control ── */
    if(st.botones.filter((b) => t - b <= L.machacaSeg).length >= L.machaca && puede('r-machaca', t, { enfria: 45 })) return decir('r-machaca', t);
    if(durante((x) => (x.ejes || 0) > .7, L.stickSeg, t) && puede('r-stick', t, { enfria: 60 })) return decir('r-stick', t);

    /* ── no hacer nada: sube de tono; la quinta vez avanza solo ── */
    if(!f.ocupado && !f.final){
      const quieto = t - Math.max(st.tocoEn, st.calladoEn ?? st.inicio);
      const sig = L.quieto[Math.min(st.quietos, L.quieto.length - 1)];
      if(st.quietos < L.quieto.length && quieto > sig && puede('r-quieto', t, { enfria: 0 })){ st.quietos++; st.calladoEn = t; return decir(`r-quieto-${st.quietos}`, t); }
    } else if(f.ocupado) st.calladoEn = t;
    return null;
  }

  /* lo que pasa con botones y escenas */
  function evento(tipo, d = {}){
    const t = d.t ?? (h.length ? h[h.length - 1].t : 0);
    if(['boton', 'atras', 'siguiente', 'voz', 'opciones', 'puntaje', 'creditos', 'otraVez', 'respuesta', 'planta'].includes(tipo)){ st.tocoEn = t; st.botones.push(t); st.botones = st.botones.filter((b) => t - b <= 10); st.quietos = Math.min(st.quietos, 2); }
    if(tipo === 'escena'){ st.enEscena = new Set(); st.escena = d.id; st.quietos = 0; st.calladoEn = t; if(d.saltada) st.saltadas++; return null; }
    if(tipo === 'opciones' && puede('r-opciones', t, { seguridad: true, enfria: 30 })) return decir('r-opciones', t);
    if(tipo === 'atras' || tipo === 'siguiente'){
      st.pingpong.push([t, tipo]); st.pingpong = st.pingpong.filter(([x]) => t - x <= 15);
      let cambios = 0; for(let i = 1; i < st.pingpong.length; i++) if(st.pingpong[i][1] !== st.pingpong[i - 1][1]) cambios++;
      if(cambios >= 3 && puede('r-pingpong', t, { seguridad: true, enfria: 60 })){ st.pingpong = []; return decir('r-pingpong', t); }
    }
    if(tipo === 'voz'){ st.voces.push(t); st.voces = st.voces.filter((x) => t - x <= 12);
      if(st.voces.length >= 3 && d.prendida && puede('r-voz-juega', t, { seguridad: true, enfria: 60 })) return decir('r-voz-juega', t); }
    if(tipo === 'puntaje'){ st.puntaje++; return decir(st.puntaje >= 3 ? 'r-puntaje-2' : 'r-puntaje', t); }
    if(tipo === 'creditos'){ st.creditos++; return st.creditos >= 2 ? decir('r-creditos-2', t) : null; }
    if(tipo === 'otraVez'){ st.otraVez++; st.inicio = t; st.saltadas = 0; st.finalDicho = false; return st.otraVez >= 2 ? decir('r-otra-vez-2', t) : null; }
    if(tipo === 'pregunta'){ st.pregEn = t; return null; }
    if(tipo === 'respuesta' && t - st.pregEn < L.rapidoResp && puede('r-rapido-resp', t, { seguridad: true, unaVez: true })) return decir('r-rapido-resp', t);
    if(tipo === 'planta'){ st.plantas.push(t); st.plantas = st.plantas.filter((x) => t - x <= L.floresRapido);
      if(st.plantas.length >= 5 && puede('r-flores-rapido', t, { seguridad: true, unaVez: true })) return decir('r-flores-rapido', t); }
    if(tipo === 'oculto'){ st.ocultoEn = t; return null; }
    if(tipo === 'visible'){ const fue = st.ocultoEn != null && t - st.ocultoEn > 5; st.ocultoEn = null; if(fue && puede('r-volviste', t, { seguridad: true, enfria: 30 })) return decir('r-volviste', t); return null; }
    if(tipo === 'salir'){ st.salioEn = t; return null; }
    if(tipo === 'entrar'){ const volvio = st.salioEn != null; st.salioEn = null; if(volvio && puede('r-regresa-exp', t, { seguridad: true, enfria: 120 })) return decir('r-regresa-exp', t); return null; }
    /* al llegar al final: ¿récord de velocidad? ¿cinco de cinco sin escuchar? (se dice DESPUÉS del final normal) */
    if(tipo === 'final' && !st.finalDicho){ st.finalDicho = true;
      if(d.puntos === d.total && st.saltadas >= 5) return decir('r-sospechoso', t);
      if(t - (st.inicio ?? t) < L.record) return decir('r-record', t); }
    return null;
  }
  const recentrar = () => { st.base = null; };
  return { paso, evento, recentrar, st, L };
}
