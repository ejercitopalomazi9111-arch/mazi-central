/* ══════════════════════════════════════════════════════════════════════════
   SECRE · los horarios de clases que se pueden poner en un grupo
   ──────────────────────────────────────────────────────────────────────────
   Del horario que mandó Carlos el 16 de octubre (captura «SEMESTRE 3°» del
   Bachillerato Rembrandt). Sin nombres de maestros: el repositorio es público
   y el aviso no los necesita (lo mismo que avisos/datos.js).

   Dos cosas de la captura que se corrigieron, y por qué:
     · «Geografía Analítica» (martes 8:00 y jueves 9:00) → Geometría Analítica:
       mismo maestro y misma materia que las otras tres veces de la semana.
     · «Inglés I» (miércoles 8:00) → Inglés III: las otras cuatro dicen III.
   Si Carlos dice que no, se cambian aquí y ya.

   dias: 1 = lunes … 5 = viernes. '' = no hay clase en ese bloque.
   ═════════════════════════════════════════════════════════════════════════ */
const REDES = 'Admón. y Estruc. de redes', METODO = 'Metodología de la Inv. I STEAM', INGLES = 'Inglés III',
  MTTO = 'Mto. Equipo de Cómputo y SO', HUMAN = 'Humanidades III y Ética', PROGRA = 'Programación y BD',
  FISICA = 'Física I Enfoque STEAM', QUIMBIO = 'Química y Biología III STEAM', GEOM = 'Geometría Analítica',
  EFISICA = 'Educación Física III', TEC = 'Técnicas de Expresión y Comunicación III';

export const HORARIOS = {
  '3.1': {
    nombre: '3.1 · tercer semestre',
    bloques: [
      { hora: '07:00', fin: '08:00', dias: { 1: REDES,   2: METODO,  3: REDES,   4: EFISICA, 5: FISICA } },
      { hora: '08:00', fin: '09:00', dias: { 1: INGLES,  2: GEOM,    3: INGLES,  4: QUIMBIO, 5: EFISICA } },
      { hora: '09:00', fin: '10:00', dias: { 1: MTTO,    2: TEC,     3: PROGRA,  4: GEOM,    5: METODO } },
      { hora: '10:00', fin: '10:30', receso: true },
      { hora: '10:30', fin: '11:20', dias: { 1: METODO,  2: PROGRA,  3: MTTO,    4: PROGRA,  5: QUIMBIO } },
      { hora: '11:20', fin: '12:10', dias: { 1: HUMAN,   2: INGLES,  3: EFISICA, 4: INGLES,  5: INGLES } },
      { hora: '12:10', fin: '13:00', dias: { 1: PROGRA,  2: MTTO,    3: HUMAN,   4: MTTO,    5: GEOM } },
      { hora: '13:00', fin: '13:50', dias: { 1: FISICA,  2: QUIMBIO, 3: METODO,  4: FISICA,  5: PROGRA } },
      { hora: '13:50', fin: '14:40', dias: { 1: '',      2: HUMAN,   3: GEOM,    4: METODO,  5: '' } },
    ],
  },
};

/* «3.1», «3-1», «tercero», «el del 3.1» → la clave del horario ('' si no hay) */
export function cualHorario(t){
  const s = String(t || '').toLowerCase();
  if(/3\s*[.\-°]?\s*1|tercer|3ro|3°/.test(s) || !s.trim()) return '3.1';
  return Object.keys(HORARIOS).find(k => s.includes(k)) || '';
}

/* los mensajes de cada bloque y día: qué toca ahora y qué sigue */
export function mensajesDeHorario(clave){
  const H = HORARIOS[clave]; if(!H) return [];
  const sale = [];
  for(let d = 1; d <= 5; d++){
    const delDia = H.bloques.map(b => ({ ...b, materia: b.receso ? '' : (b.dias[d] || '') })).filter(b => b.receso || b.materia);
    delDia.forEach((b, i) => {
      const sig = delDia.slice(i + 1).find(x => !x.receso);
      const ultima = !b.receso && !sig;
      const texto = b.receso
        ? `🍔 Receso hasta las ${b.fin}.` + (sig ? ` Regresando toca ${sig.materia}.` : '')
        : `📚 Ahorita toca *${b.materia}* (${b.hora}–${b.fin}).` + (ultima ? '\nEs la última del día 🙌' : delDia[i + 1] && delDia[i + 1].receso ? '\nDespués: receso 🍔' : `\nDespués: ${sig.materia} a las ${sig.hora}.`);
      sale.push({ dia: d, hora: b.hora, texto });
    });
  }
  return sale;
}
