/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL MEDIDOR (cuando el cliente no sabe cuánto mide su casa)
   ───────────────────────────────────────────────────────────────────────────
   Carlos, 11 nov: «no todos saben cuánto mide su casa». La IA le pregunta cosas
   que sí sabe —¿es chica, mediana o grande?, ¿cuántas recámaras y baños?, ¿tiene
   patio?, ¿en qué colonia?— y aquí se vuelve un estimado de metros.

   Cómo: cada espacio mide, en promedio, según el tamaño de la casa (una recámara
   de casa grande anda en los 18 m²; Carlos: «unos 20, algunas 10, otras 15»),
   se suman, se agrega lo de pasillos y escaleras, y se ajusta por colonia: en
   Juriquilla las casas son más grandes que el promedio.

   ⚠ TODOS ESTOS NÚMEROS SON NUESTRO PRIMER ESTIMADO, no datos medidos. Se
   calibran con los servicios reales del dueño: la tabla vive en el servidor
   (POST /api/medidas) y se puede cambiar sin tocar código.
   ═══════════════════════════════════════════════════════════════════════════ */

export const MEDIDAS = {
  /* m² por espacio, según cómo describe el cliente su casa */
  espacios: {
    chica:   { recamara: 9,  bano: 3, sala: 12, comedor: 8,  cocina: 6,  patio: 10, estudio: 7,  cochera: 14, lavado: 3 },
    mediana: { recamara: 12, bano: 4, sala: 18, comedor: 12, cocina: 9,  patio: 20, estudio: 10, cochera: 18, lavado: 4 },
    grande:  { recamara: 18, bano: 6, sala: 28, comedor: 18, cocina: 14, patio: 40, estudio: 14, cochera: 30, lavado: 6 },
  },
  /* cuando sólo se sabe el tamaño */
  solo_tamano: { chica: 60, mediana: 110, grande: 200 },
  /* pasillos, escaleras y muros: lo que no es «un cuarto» pero también se fumiga */
  circulacion: 0.15,
  /* colonias con casas más grandes (o más chicas) que el promedio. Primer estimado: se calibra con el dueño */
  colonias: { juriquilla: 1.3, jurica: 1.3, 'el campanario': 1.4, 'el refugio': 1.15, zibata: 1.15, 'cumbres del lago': 1.25 },
};

const normal = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const TAMANOS = { chica: 'chica', chico: 'chica', pequena: 'chica', pequeno: 'chica', mediana: 'mediana', mediano: 'mediana', normal: 'mediana', grande: 'grande', amplia: 'grande', enorme: 'grande' };

/** Estima los m² de una CASA. `d` = { tamano, recamaras, banos, sala, comedor, cocina, patio, estudio, cochera, pisos, zona } */
export function estimarM2(d = {}, medidas = MEDIDAS){
  const tamano = TAMANOS[normal(d.tamano)] || null;
  const t = medidas.espacios[tamano || 'mediana'];
  const cuenta = (v) => v === true ? 1 : Number.isFinite(+v) && +v > 0 ? +v : 0;
  /* casi toda casa tiene sala, comedor y cocina: si dijo cuántas recámaras, se cuentan salvo que diga que no */
  const hay = (v) => v === false ? 0 : (cuenta(d.recamaras) ? Math.max(1, cuenta(v)) : cuenta(v));
  const cuartos = { recamara: cuenta(d.recamaras), bano: cuenta(d.banos), sala: hay(d.sala), comedor: hay(d.comedor), cocina: hay(d.cocina),
    patio: cuenta(d.patio), estudio: cuenta(d.estudio), cochera: cuenta(d.cochera) };
  let m2 = Object.entries(cuartos).reduce((s, [k, n]) => s + n * (t[k] || 0), 0);
  const porCuartos = m2 > 0;
  if(!porCuartos){
    if(!tamano) return { bien: false, falta: ['tamaño de la casa o cuántas recámaras tiene'] };
    m2 = medidas.solo_tamano[tamano];
  } else {
    m2 *= 1 + medidas.circulacion;
  }
  const colonia = normal(d.zona);
  const factor = Object.entries(medidas.colonias).find(([c]) => colonia.includes(c))?.[1] || 1;
  m2 *= factor;
  const r5 = (n) => Math.max(5, Math.round(n / 5) * 5);
  return {
    bien: true, m2: r5(m2), rango: [r5(m2 * 0.8), r5(m2 * 1.2)], estimado: true,
    como: porCuartos ? 'por cuartos' : 'sólo por tamaño', tamano: tamano || 'mediana (supuesto)', factorColonia: factor,
    /* qué preguntar para afinar: lo que todavía no dijo */
    afinar: [!tamano && 'tamaño', !cuartos.recamara && 'recámaras', !cuartos.bano && 'baños', d.patio == null && 'patio', !d.zona && 'colonia'].filter(Boolean),
  };
}
