/* ══════════════════════════════════════════════════════════════════════════
   SECRE · el banco de imágenes de Carlos (adaptador)
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 16 de octubre: «que pueda darle acceso al banco de imágenes y que en
   el chat de All's o en otros que le seleccione publique algunas fotos del
   banco con su nombre… todos los días» y «que si le piden algo pueda
   responder también con imágenes».

   El banco es el mismo de Presentaciones y Carteles: vive en La Sala
   (/api/sala/GRUPAZ/banco), con su título, descripción, temas, palabras clave
   y carpeta por foto. Secre sólo LEE: no sube, no cambia, no borra.
   ═════════════════════════════════════════════════════════════════════════ */
const SALA = (process.env.SECRE_SALA_URL || 'https://sala.palomazi9111.workers.dev').replace(/\/+$/, '');
const SALA_NOMBRE = process.env.SECRE_BANCO_SALA || process.env.SECRE_SALA || 'GRUPAZ';

export const sinAc = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VACIAS = new Set('de la el los las un una unos unas y o a en con por para que me te se tu su sus mi mis del al es son hay tienes tienen tiene quiero quieres ver foto fotos imagen imagenes mandame manda pasame pasa algo algun alguna como cual cuales cuanto cuesta precio hola oye porfa pls favor si no ya tambien otra otro mas'.split(' '));

/* el nombre que se le pone a una foto al publicarla */
export function nombreDe(f){
  return String(f.titulo || '').trim() || String(f.nombre || 'Foto').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').trim();
}
export function pieDe(f, conDescripcion = true){
  const d = String(f.descripcion || '').replace(/\s+/g, ' ').trim();
  return `*${nombreDe(f)}*` + (conDescripcion && d ? '\n' + (d.length > 220 ? d.slice(0, 219) + '…' : d) : '');
}

/** las fotos que mejor van con un texto (palabras que coinciden en título, descripción, temas, palabras clave, carpeta y nombre) */
export function buscarFotos(fichas, texto, { carpeta = '', n = 8, sinCambios = true } = {}){
  const pal = sinAc(texto).split(/[^a-z0-9ñ]+/).filter(w => w.length > 2 && !VACIAS.has(w));
  const car = sinAc(carpeta);
  const lista = (fichas || []).filter(f => (!car || sinAc(f.carpeta) === car) && !(sinCambios && f.estado === 'cambios'));
  if(!pal.length) return car ? lista.slice(0, n) : [];
  const raiz = (w) => w.replace(/(es|s)$/, '');
  return lista.map(f => {
    const campos = [[f.titulo, 4], [(f.palabras || []).join(' '), 3], [(f.temas || []).join(' '), 3], [f.carpeta, 2], [f.descripcion, 1], [f.nombre, 1]];
    let p = 0;
    for(const w of pal){ const r = raiz(w); for(const [c, peso] of campos){ const t = sinAc(c); if(t && (t.includes(w) || (r.length > 2 && t.includes(r)))) p += peso; } }
    return { f, p };
  }).filter(x => x.p > 0).sort((a, b) => b.p - a.p || (b.f.creado || 0) - (a.f.creado || 0)).slice(0, n).map(x => x.f);
}

/** el banco por La Sala; `hacer` se cambia en las pruebas */
export function bancoDeSala({ llave = process.env.SECRE_SALA_LLAVE || process.env.MAZI_LLAVE, hacer = fetch } = {}){
  let cache = null, cuando = 0;
  const base = `${SALA}/api/sala/${SALA_NOMBRE}/banco`;
  return {
    listo: () => !!llave,
    async fichas(){
      if(!llave) throw new Error('Para usar el banco de imágenes hace falta SECRE_SALA_LLAVE.');
      if(cache && Date.now() - cuando < 5 * 60_000) return cache;
      const r = await hacer(base, { headers: { 'X-Llave': llave }, signal: AbortSignal.timeout(30_000) });
      const j = await r.json().catch(() => ({}));
      if(!r.ok || !j.bien) throw new Error(j.error || `El banco contestó ${r.status}`);
      cache = j.fichas || []; cuando = Date.now();
      return cache;
    },
    async bajar(id){
      const r = await hacer(`${base}?id=${encodeURIComponent(id)}`, { headers: { 'X-Llave': llave }, signal: AbortSignal.timeout(60_000) });
      if(!r.ok) throw new Error(`No pude bajar la foto (${r.status})`);
      return { buf: Buffer.from(await r.arrayBuffer()), mime: r.headers.get('content-type') || 'image/jpeg' };
    },
  };
}
