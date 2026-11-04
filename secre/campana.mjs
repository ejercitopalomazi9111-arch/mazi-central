/* ══════════════════════════════════════════════════════════════════════════
   SECRE · la campaña a negocios sin página web
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 4 de noviembre: «manda lo de los negocios usando Secre». La lista
   (536 negocios de Querétaro sacados de Google Maps, sin página o sólo con
   redes) NO va en el repo, que es público: vive en La Sala (k=prospectos) y
   Secre la lee con su llave.

   Se manda POCO a poco, de la cuenta del negocio, en horario de oficina: muchos
   mensajes a desconocidos de golpe y WhatsApp bloquea el número. Cada mensaje
   dice quién escribe y ofrece no volver a escribir.
   ═════════════════════════════════════════════════════════════════════════ */
const SALA = (process.env.SECRE_SALA_URL || 'https://sala.palomazi9111.workers.dev').replace(/\/+$/, '');
const SALA_NOMBRE = process.env.SECRE_SALA || 'GRUPAZ';

export const CAMPANA_BASE = { activo: false, cuenta: 'negocio', porDia: 25, desde: '10:00', hasta: '18:30', dias: [1, 2, 3, 4, 5, 6], tel: '4428833786', minEntre: 6, maxEntre: 15 };

/* la lista: [{ negocio, giro, tel, resenas, estrellas, tiene }] */
export function prospectosDeSala({ llave = process.env.SECRE_SALA_LLAVE || process.env.MAZI_LLAVE || '', hacer = fetch } = {}){
  return async () => {
    if(!llave) throw new Error('Para la campaña hace falta SECRE_SALA_LLAVE.');
    const r = await hacer(`${SALA}/api/sala/${SALA_NOMBRE}/secre?k=prospectos`, { headers: { 'X-Llave': llave }, signal: AbortSignal.timeout(30_000) });
    const j = await r.json().catch(() => ({}));
    if(!r.ok || !j.bien) throw new Error(j.error || `La Sala contestó ${r.status}`);
    return j.datos ? JSON.parse(j.datos) : [];
  };
}

/* tres maneras de decirlo, para que no salgan cien mensajes idénticos */
export function mensajeProspecto(p, { hora = 12, variante = 0 } = {}){
  const saludo = hora < 12 ? 'buen día' : hora < 19 ? 'buenas tardes' : 'buenas noches';
  const n = String(p.negocio || 'su negocio').replace(/\s*[|·].*$/, '').replace(/,?\s+S\.?\s?A\.?(\s+de\s+C\.?\s?V\.?)?\s*$/i, '').trim();
  const soloRedes = /redes/.test(p.tiene || '');
  const falta = soloRedes ? 'sólo tienen redes sociales, sin página propia' : 'no tienen página web';
  const extra = /barber|peluquer|estetica|estética|uñas|spa/i.test(p.giro || '') ? 'con reservas de citas por WhatsApp' : /taquer|restaur|pizz|cafe|café|comida|mariscos/i.test(p.giro || '') ? 'con su menú y pedidos por WhatsApp' : 'con botón de WhatsApp, ubicación y horarios';
  const resenas = +p.resenas > 50 ? `${(+p.resenas).toLocaleString('en-US')} reseñas` : 'buenas reseñas';
  const cierre = 'Si no le interesa, me dice y no le vuelvo a escribir.';
  const v = [
    `Hola, ${saludo}. Vi que ${n} tiene ${resenas} en Google, pero ${falta}. Soy Carlos, de Grupo Mazi, aquí en Querétaro. Hacemos páginas desde $2,000, listas en 3 a 5 días, ${extra}. ¿Le mando un ejemplo de una que hicimos? ${cierre}`,
    `Qué tal, ${saludo}. Le escribe Carlos de Grupo Mazi (Querétaro). Encontré ${n} en Google Maps: ${resenas}, se nota que la gente los quiere. Me di cuenta de que ${falta}, y ahí se van clientes que los buscan en internet. Hacemos páginas desde $2,000 ${extra}. ¿Le gustaría ver un ejemplo? ${cierre}`,
    `Hola, ${saludo}. Soy Carlos, de Grupo Mazi. Vi ${n} en Google y ${falta}. Nosotros las hacemos aquí en Querétaro desde $2,000, en 3 a 5 días, ${extra}, y lista para que los encuentren en Google. Si gusta, le mando ejemplos sin compromiso. ${cierre}`,
  ];
  return v[Math.abs(variante) % v.length];
}
