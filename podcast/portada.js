/* ESTUDIO · la portada del podcast
   Cuadrada, de 3000 × 3000, que es lo que piden Apple y Spotify (Apple además
   pide menos de 512 KB, y por eso se baja en JPEG ajustando la calidad hasta
   que quepa). Se diseña para verse en CHIQUITO: en la app del teléfono la
   portada mide lo que una uña, así que el nombre va enorme y casi nada más.
   El adorno es la onda de TU episodio, no un dibujo genérico. */

export const TEMAS = {
  noche:     { nombre: 'Noche',     fondo: ['#16121C', '#2A1630'], tinta: '#F6EFE8', acento: '#FF5A4E', suave: '#B9A9C2' },
  crema:     { nombre: 'Crema',     fondo: ['#F4ECDF', '#EADCC6'], tinta: '#22160F', acento: '#D2421B', suave: '#7A5A42' },
  electrico: { nombre: 'Eléctrico', fondo: ['#14186A', '#2B1A8F'], tinta: '#FFFFFF', acento: '#C6F432', suave: '#B7BCF5' },
  atardecer: { nombre: 'Atardecer', fondo: ['#FF7A2F', '#C2185B'], tinta: '#FFF8F0', acento: '#1E0B1A', suave: '#FFE3CF' },
};

/* parte el texto en renglones que quepan en `ancho` con el tamaño dado */
function renglones(ctx, texto, ancho){
  const palabras = String(texto || '').trim().split(/\s+/).filter(Boolean), out = [];
  let r = '';
  for(const p of palabras){
    const prueba = r ? r + ' ' + p : p;
    if(ctx.measureText(prueba).width <= ancho || !r) r = prueba; else { out.push(r); r = p; }
  }
  if(r) out.push(r);
  return out;
}
/* el tamaño más grande con el que el texto cabe en `maxR` renglones */
function ajustar(ctx, texto, ancho, maxR, desde, hasta, peso = 900, maxAlto = Infinity){
  for(let t = desde; t >= hasta; t -= 8){
    ctx.font = `${peso} ${t}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    const r = renglones(ctx, texto, ancho);
    if(r.length <= maxR && r.length * t * 0.98 <= maxAlto && r.every(x => ctx.measureText(x).width <= ancho)) return { t, r };
  }
  ctx.font = `${peso} ${hasta}px system-ui, sans-serif`;
  return { t: hasta, r: renglones(ctx, texto, ancho).slice(0, maxR) };
}

export function dibujarPortada(cv, o = {}){
  const N = cv.width, ctx = cv.getContext('2d'), T = TEMAS[o.tema] || TEMAS.noche, u = N / 3000;
  const m = 230 * u;   /* margen: en la app el borde se recorta redondeado */

  /* fondo: degradado, o la foto con un velo para que el texto se lea */
  const g = ctx.createLinearGradient(0, 0, N, N);
  g.addColorStop(0, T.fondo[0]); g.addColorStop(1, T.fondo[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, N, N);
  if(o.foto){
    const f = o.foto, k = Math.max(N / f.width, N / f.height);
    ctx.drawImage(f, (N - f.width * k) / 2, (N - f.height * k) / 2, f.width * k, f.height * k);
    const v = ctx.createLinearGradient(0, 0, 0, N);
    v.addColorStop(0, 'rgba(0,0,0,.15)'); v.addColorStop(.45, 'rgba(0,0,0,.35)'); v.addColorStop(1, 'rgba(0,0,0,.82)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, N, N);
  }
  const tinta = o.foto ? '#FFFFFF' : T.tinta, suave = o.foto ? 'rgba(255,255,255,.78)' : T.suave;

  /* la onda del episodio, como franja de barras a media altura */
  const onda = o.onda && o.onda.length ? o.onda : null;
  const barras = 64, anchoB = (N - 2 * m) / barras, yOnda = N * 0.36, altoMax = 330 * u;
  ctx.fillStyle = T.acento; ctx.globalAlpha = o.foto ? 0.9 : 1;
  for(let b = 0; b < barras; b++){
    let v;
    if(onda){
      const a = Math.floor(b * onda.length / barras), z = Math.floor((b + 1) * onda.length / barras);
      let s = 0; for(let i = a; i < z; i += 7) s = Math.max(s, Math.abs(onda[i]));
      v = Math.min(1, s * 1.6);
    } else v = 0.25 + 0.75 * Math.abs(Math.sin(b * 0.55) * Math.cos(b * 0.21));
    const h = Math.max(18 * u, v * altoMax);
    const x = m + b * anchoB + anchoB * 0.18, w = anchoB * 0.64;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, yOnda - h / 2, w, h, w / 2) : ctx.rect(x, yOnda - h / 2, w, h); ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* «EPISODIO 3» como píldora arriba */
  let y = m;
  if(o.episodio){
    ctx.font = `800 ${92 * u}px system-ui, -apple-system, sans-serif`;
    const txt = ('EPISODIO ' + o.episodio).toUpperCase();
    const w = ctx.measureText(txt).width + 120 * u, h = 170 * u;
    ctx.fillStyle = T.acento; ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(m, y, w, h, h / 2) : ctx.rect(m, y, w, h); ctx.fill();
    ctx.fillStyle = (o.tema === 'electrico' || o.tema === 'atardecer') ? T.fondo[0] : '#FFFFFF';
    ctx.textBaseline = 'middle'; ctx.fillText(txt, m + 60 * u, y + h / 2 + 4 * u);
  }

  /* el nombre del podcast: lo que tiene que leerse en una uña */
  ctx.textBaseline = 'alphabetic'; ctx.fillStyle = tinta;
  /* el nombre no puede subir hasta la onda: cabe entre ella y lo de abajo */
  const abajo = N - m - (o.escuela ? 190 * u : 0) - (o.titulo ? 230 * u : 0);
  const libre = abajo - (yOnda + altoMax / 2 + 90 * u) + 560 * u * 0.2;
  const nom = ajustar(ctx, o.nombre || 'Mi podcast', N - 2 * m, 3, 560 * u, 200 * u, 900, libre);
  const inter = nom.t * 0.98;
  let yNom = abajo - inter * (nom.r.length - 1);
  nom.r.forEach((r, i) => ctx.fillText(r, m - nom.t * 0.04, yNom + i * inter));

  /* el título del episodio, más chico, abajo del nombre */
  if(o.titulo){
    const t = ajustar(ctx, o.titulo, N - 2 * m, 1, 150 * u, 90 * u, 700);
    ctx.fillStyle = suave; ctx.fillText(t.r[0], m, yNom + inter * (nom.r.length - 1) + 210 * u);
  }
  /* la escuela o el grupo, al pie */
  if(o.escuela){
    ctx.font = `700 ${86 * u}px system-ui, -apple-system, sans-serif`; ctx.fillStyle = suave;
    ctx.fillText(String(o.escuela).toUpperCase(), m, N - m + 20 * u);
  }
  return cv;
}

/* JPEG que quepa en 512 KB (límite de Apple), bajando la calidad de a poco */
export async function aJpeg(cv, maxBytes = 512 * 1024){
  for(const q of [0.92, 0.86, 0.8, 0.72, 0.64, 0.55]){
    const b = await new Promise(r => cv.toBlob(r, 'image/jpeg', q));
    if(b && b.size <= maxBytes) return b;
  }
  return await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.5));
}
