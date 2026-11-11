/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL REFLEJO
   ───────────────────────────────────────────────────────────────────────────
   Carlos, 11 nov: «un sistema nervioso que se encarga de resolver todo primero,
   como el reflejo de quitar el brazo cuando quema». Contesta lo que preguntan
   siempre con respuestas ya hechas, sin gastar IA. Si no está seguro, no
   adivina: regresa null y le toca al cerebro.

   Un caso es:
     { id, frases: ['cuanto cuesta fumigar', …], palabras: ['precio', …],
       respuesta: 'texto con {variables}', necesita: ['m2','plaga'], dueno: false }
   ═══════════════════════════════════════════════════════════════════════════ */

const VACIAS = new Set(('a al algo como con de del el en es esa ese eso esta este esto ha hay la las le lo los me mi mis ' +
  'muy no o para pero por que qué se si sí su sus te tu tus un una uno unos y ya yo oye hola buenas buenos dias tardes ' +
  'noches quisiera quiero queria gustaria saber favor porfa pls usted ustedes ustedes').split(' '));

export const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();

const fichas = (t) => normalizar(t).split(' ').filter(p => p && !VACIAS.has(p))
  /* raíz burda: «cucarachas» y «cucaracha» cuentan igual */
  .map(p => p.length > 4 ? p.replace(/(es|s)$/, '') : p);

/** El caso que mejor contesta `texto`, o null si ninguno pasa del umbral. */
export function reflejo(texto, casos, umbral = 0.55){
  const n = normalizar(texto), f = new Set(fichas(texto));
  if(!f.size) return null;
  let mejor = null;
  for(const c of casos){
    let p = 0;
    for(const fr of c.frases || []){
      const nf = normalizar(fr);
      if(nf && n.includes(nf)){ p = Math.max(p, 1); break; }
      const ff = fichas(fr); if(!ff.length) continue;
      const comunes = ff.filter(x => f.has(x)).length;
      /* cuánto de la frase del caso aparece, castigado si el mensaje trae mucho más */
      p = Math.max(p, (comunes / ff.length) * Math.min(1, (ff.length + 2) / f.size));
    }
    for(const w of c.palabras || []) if(f.has(fichas(w)[0])) p = Math.max(p, 0.6);
    if(!mejor || p > mejor.confianza) mejor = { caso: c, confianza: +p.toFixed(2) };
  }
  return mejor && mejor.confianza >= umbral ? mejor : null;
}

/** Llena {variables} con lo que se sabe; lo que falta se queda fuera de la frase. */
export const llenar = (texto, datos = {}) =>
  String(texto).replace(/\{(\w+)\}/g, (_, k) => datos[k] != null ? String(datos[k]) : '').replace(/\s{2,}/g, ' ').trim();
