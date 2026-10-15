/* LAS LLAVES DE UN TORNEO · las usan la pantalla en vivo de Fadori
   (transmision.js) y los torneos de la sociedad de alumnos. Sin pantalla:
   sólo quién juega contra quién y quién pasa. */
/* ── LAS LLAVES DEL TORNEO ────────────────────────────────────────────
   rondas[0] = los partidos de la primera ronda; quien gana pasa solo al
   partido que le toca de la siguiente. Con 6 equipos se completa a 8 con
   «descansa» (pasa directo). */
export function armarLlaves(equipos){
  const lista = equipos.map(x => String(x || '').trim()).filter(Boolean).slice(0, 32);
  let n = 2; while(n < lista.length) n *= 2;
  /* los que descansan van al FINAL y uno por partido: así los primeros
     enfrentamientos quedan como los escribió Carlos y nadie juega contra nadie */
  const descansan = n - lista.length, juegan = n / 2 - descansan;
  const rondas = [];
  let partidos = [], k = 0;
  for(let i = 0; i < n / 2; i++){
    if(i < juegan){ partidos.push({ a: lista[k], b: lista[k + 1], pa: '', pb: '', gana: '' }); k += 2; }
    else { partidos.push({ a: lista[k], b: '', pa: '', pb: '', gana: '' }); k += 1; }
  }
  rondas.push(partidos);
  while(partidos.length > 1){
    partidos = Array.from({ length: partidos.length / 2 }, () => ({ a: '', b: '', pa: '', pb: '', gana: '' }));
    rondas.push(partidos);
  }
  return avanzar(rondas);
}
/* quien gana (o pasa por descanso) se escribe en la ronda que sigue */
export function avanzar(rondas){
  for(let r = 0; r < rondas.length; r++){
    rondas[r].forEach((p, i) => {
      if(r > 0){
        const a = rondas[r - 1][i * 2], b = rondas[r - 1][i * 2 + 1];
        const ga = a ? ganadorDe(a) : '', gb = b ? ganadorDe(b) : '';
        if(p.a !== ga || p.b !== gb){ if(p.gana && p.gana !== ga && p.gana !== gb) p.gana = ''; p.a = ga; p.b = gb; }
      }
    });
  }
  return rondas;
}
export function ganadorDe(p){
  if(p.gana) return p.gana;
  if(p.a && !p.b) return p.a;          /* descansa: pasa directo */
  if(p.b && !p.a) return p.b;
  return '';
}
export const nombreRonda = (r, total) => {
  const quedan = total - r;
  return quedan === 1 ? 'Final' : quedan === 2 ? 'Semifinal' : quedan === 3 ? 'Cuartos' : quedan === 4 ? 'Octavos' : 'Ronda ' + (r + 1);
};
