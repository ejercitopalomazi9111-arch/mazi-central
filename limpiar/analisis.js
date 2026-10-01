/* ══════════════════════════════════════════════════════════════════════════
   LIMPIAR FOTOS · el análisis, aparte de la pantalla
   ──────────────────────────────────────────────────────────────────────────
   Carlos: «una app para hacer limpieza de mi teléfono, especialmente fotos y
   videos… que elija qué fotos mantener y cuáles eliminar, y que las elimine
   solo, para mantener buena cantidad de espacio y mi fototeca organizada».

   Qué se mira de cada foto, y por qué con eso basta para decidir:
   · HUELLA (dHash de 64 bits): dos fotos casi iguales —una ráfaga, la misma
     toma tres veces, la que llegó por WhatsApp de la que tomaste— tienen
     huellas a pocos bits de distancia. Con eso se arman los grupos.
   · NITIDEZ (varianza del laplaciano): una foto movida tiene orillas suaves y
     da un número bajo. En cada grupo se queda la más nítida.
   · LUZ (promedio y dispersión): la foto «de bolsillo», negra o quemada.
   · DE DÓNDE VIENE: EXIF (fecha, cámara) en las fotos de cámara; las
     capturas de pantalla son PNG sin cámara, del tamaño exacto de una
     pantalla de iPhone, y iOS les escribe «Screenshot» adentro.
   Todo es puro y sobre arreglos, para probarlo sin pantalla.
   ═════════════════════════════════════════════════════════════════════════ */

/* ── EXIF de un JPEG: fecha de captura, cámara y tamaño ──
   Lee sólo lo necesario. Si no hay EXIF (PNG, imagen de WhatsApp, HEIC en
   la compu), regresa {} y la app usa la fecha del archivo. */
export function leerExif(bytes){
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if(v.byteLength >= 8 && v.getUint32(0) === 0x89504E47) return leerPng(v, bytes);
  if(v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return {};
  let p = 2;
  while(p + 4 <= v.byteLength){
    const marca = v.getUint16(p), largo = v.getUint16(p + 2);
    if((marca & 0xFF00) !== 0xFF00) return {};
    if(marca === 0xFFE1 && p + 10 <= v.byteLength && v.getUint32(p + 4) === 0x45786966){   // «Exif»
      try{ return tiff(v, p + 10, Math.min(v.byteLength, p + 2 + largo)); } catch{ return {}; }
    }
    if(marca === 0xFFDA) return {};          // empezó la imagen: ya no hay EXIF
    p += 2 + largo;
  }
  return {};
}
/* PNG (las capturas de pantalla): el EXIF va en un trozo «eXIf» y/o la fecha
   en el XMP de un trozo de texto. Sin eso no hay fecha de captura confiable. */
function leerPng(v, bytes){
  let res = {}, p = 8;
  while(p + 8 <= v.byteLength){
    const largo = v.getUint32(p), tipo = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
    if(tipo === 'eXIf' && p + 8 + largo <= v.byteLength){ try{ res = { ...tiff(v, p + 8, p + 8 + largo), ...res }; } catch{} }
    if(tipo === 'IDAT' || tipo === 'IEND') break;
    p += 12 + largo;
  }
  if(!res.fecha){
    let t = ''; const n = Math.min(bytes.length, 65536);
    for(let i = 0; i < n; i++) t += String.fromCharCode(bytes[i]);
    const m = /(?:DateTimeOriginal|DateCreated|CreateDate)["'>=\s]+(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(t);
    if(m) res.fecha = `${m[1]}:${m[2]}:${m[3]} ${m[4]}:${m[5]}:${m[6]}`;
  }
  return res;
}
function tiff(v, base, fin){
  const le = v.getUint16(base) === 0x4949;
  const u16 = (o) => v.getUint16(base + o, le), u32 = (o) => v.getUint32(base + o, le);
  const texto = (o, n) => { let s = ''; for(let i = 0; i < n - 1 && base + o + i < fin; i++){ const c = v.getUint8(base + o + i); if(!c) break; s += String.fromCharCode(c); } return s; };
  const res = {};
  const ifd = (o, que) => {
    if(base + o + 2 > fin) return;
    const n = u16(o);
    for(let k = 0; k < n; k++){
      const e = o + 2 + k * 12; if(base + e + 12 > fin) return;
      const tag = u16(e), tipo = u16(e + 2), cuenta = u32(e + 4);
      const val = () => tipo === 3 ? u16(e + 8) : u32(e + 8);
      const str = () => cuenta <= 4 ? texto(e + 8, cuenta) : texto(u32(e + 8), cuenta);
      if(que === 0){
        if(tag === 0x010F) res.marca = str();
        else if(tag === 0x0110) res.modelo = str();
        else if(tag === 0x0132) res.fechaArchivo = str();
        else if(tag === 0x0131) res.programa = str();
        else if(tag === 0x8769) ifd(val(), 1);
      } else {
        if(tag === 0x9003) res.fecha = str();
        else if(tag === 0x9010) res.zona = str();
        else if(tag === 0x9286) res.comentario = 'si';
        else if(tag === 0xA002) res.ancho = val();
        else if(tag === 0xA003) res.alto = val();
      }
    }
  };
  ifd(u32(4), 0);
  return res;
}

/* «2024:05:03 14:22:31» → «2024-05-03 14:22:31» (o null). */
export function fechaExif(s){
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s || '');
  return m && m[1] !== '0000' ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}` : null;
}

/* Las pantallas de iPhone (y algunas de Android), en pixeles, de pie. */
const PANTALLAS = [[640, 1136], [750, 1334], [828, 1792], [1080, 1920], [1080, 2340], [1080, 2400], [1125, 2436], [1170, 2532],
  [1179, 2556], [1206, 2622], [1242, 2208], [1242, 2688], [1284, 2778], [1290, 2796], [1320, 2868], [1440, 3200], [1440, 3120]];
export function esTamanoDePantalla(w, h){
  const [a, b] = w < h ? [w, h] : [h, w];
  return PANTALLAS.some(([x, y]) => x === a && y === b);
}
/* iOS escribe «Screenshot» en los metadatos de cada captura (XMP / iTXt). */
export function diceCaptura(bytes){
  const n = Math.min(bytes.length, 65536);
  for(let i = 0; i < n - 10; i++){
    if(bytes[i] === 83 && bytes[i + 1] === 99 && bytes[i + 2] === 114 && bytes[i + 3] === 101 && bytes[i + 4] === 101 &&
       bytes[i + 5] === 110 && bytes[i + 6] === 115 && bytes[i + 7] === 104 && bytes[i + 8] === 111 && bytes[i + 9] === 116) return true;   // Screenshot
  }
  return false;
}

/* Achicar gris w×h a W×H promediando cada bloque. drawImage de 512 a 9 px
   toma unos cuantos pixeles sueltos: el ruido y el desenfoque movían la
   huella hasta 10 bits y la ráfaga no se juntaba. El promedio no se mueve. */
export function reducir(gris, w, h, W = 9, H = 8){
  const o = new Float64Array(W * H), n = new Float64Array(W * H);
  for(let y = 0; y < h; y++){ const by = Math.min(H - 1, Math.floor(y * H / h));
    for(let x = 0; x < w; x++){ const k = by * W + Math.min(W - 1, Math.floor(x * W / w)); o[k] += gris[y * w + x]; n[k]++; } }
  for(let k = 0; k < o.length; k++) o[k] /= n[k] || 1;
  return o;
}

/* ── huella: dHash 9×8 en gris → 64 bits en dos enteros ── */
export function huella(gris9x8){
  let a = 0, b = 0;
  for(let y = 0; y < 8; y++) for(let x = 0; x < 8; x++){
    const bit = gris9x8[y * 9 + x] > gris9x8[y * 9 + x + 1] ? 1 : 0, k = y * 8 + x;
    if(k < 32) a = (a | (bit << k)) >>> 0; else b = (b | (bit << (k - 32))) >>> 0;
  }
  return [a, b];
}
const pop = (x) => { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; };
export function distancia(h1, h2){ return pop((h1[0] ^ h2[0]) >>> 0) + pop((h1[1] ^ h2[1]) >>> 0); }

/* ── nitidez y luz, sobre gris de w×h ── */
export function medir(gris, w, h){
  let s = 0, s2 = 0, n = 0, l = 0, l2 = 0, negros = 0, blancos = 0;
  for(let i = 0; i < gris.length; i++){ const g = gris[i]; l += g; l2 += g * g; if(g < 16) negros++; else if(g > 245) blancos++; }
  for(let y = 1; y < h - 1; y++) for(let x = 1; x < w - 1; x++){
    const i = y * w + x;
    const lap = gris[i - 1] + gris[i + 1] + gris[i - w] + gris[i + w] - 4 * gris[i];
    s += lap; s2 += lap * lap; n++;
  }
  const N = gris.length, media = l / N;
  return {
    nitidez: n ? s2 / n - (s / n) ** 2 : 0,
    luz: media,
    contraste: Math.sqrt(Math.max(0, l2 / N - media * media)),
    negros: negros / N, blancos: blancos / N,
  };
}

/* Umbrales, en las medidas de arriba, con gris a 512 px de lado mayor. */
export const UMBRAL = {
  borrosa: 22,          // varianza del laplaciano: una foto movida queda abajo de ~20
  parecida: 9,          // bits de huella: una ráfaga queda en 0-6
  minutos: 15,          // dos fotos parecidas tomadas lejos en el tiempo no son ráfaga…
  idéntica: 3,          // …salvo que la huella sea casi igual: es la misma imagen guardada dos veces
  diasCaptura: 30,      // las capturas de más de un mes, se proponen para borrar
};

/* Qué tan buena es una foto para quedarse con ella dentro de su grupo. */
export function puntaje(f){
  const nit = Math.log10(1 + (f.nitidez || 0));                // 0 a ~4
  const luz = 1 - Math.min(1, Math.abs((f.luz ?? 128) - 120) / 120);
  const px = Math.log10(1 + (f.ancho || 0) * (f.alto || 0)) / 7; // las grandes valen más (la original, no la de WhatsApp)
  return nit * 2 + luz + px + (f.camara ? 0.5 : 0);
}

/* ── decidir ──
   fotos: [{ id, tipo:'foto'|'video', huella, nitidez, luz, contraste, negros,
             blancos, ancho, alto, peso, fecha (ms o null), camara, captura }]
   Regresa los grupos de parecidas y, por foto, si se propone borrar y por qué.
   La razón va en palabras de persona: es lo que lee Carlos en la tarjeta. */
export function decidir(fotos, hoy = Date.now()){
  const ids = new Map(fotos.map((f, i) => [f.id, i]));
  const padre = fotos.map((_, i) => i);
  const raiz = (i) => { while(padre[i] !== i){ padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
  const solo = fotos.map((f) => f.tipo === 'foto' && f.huella && !f.captura);
  for(let i = 0; i < fotos.length; i++) if(solo[i]) for(let j = i + 1; j < fotos.length; j++) if(solo[j]){
    const a = fotos[i], b = fotos[j], d = distancia(a.huella, b.huella);
    if(d > UMBRAL.parecida) continue;
    const cerca = a.fecha && b.fecha ? Math.abs(a.fecha - b.fecha) <= UMBRAL.minutos * 60000 : false;
    if(d <= UMBRAL.idéntica || cerca){ const ra = raiz(i), rb = raiz(j); if(ra !== rb) padre[rb] = ra; }
  }
  const porRaiz = new Map();
  fotos.forEach((f, i) => { if(!solo[i]) return; const r = raiz(i); if(!porRaiz.has(r)) porRaiz.set(r, []); porRaiz.get(r).push(i); });
  const grupos = [];
  const veredicto = fotos.map(() => ({ borrar: false, razon: '', grupo: -1, mejor: false }));
  for(const miembros of porRaiz.values()){
    if(miembros.length < 2) continue;
    miembros.sort((x, y) => puntaje(fotos[y]) - puntaje(fotos[x]));
    const g = grupos.length;
    grupos.push(miembros.map((i) => fotos[i].id));
    miembros.forEach((i, k) => {
      const v = veredicto[i]; v.grupo = g;
      if(k === 0){ v.mejor = true; return; }
      const d = distancia(fotos[i].huella, fotos[miembros[0]].huella);
      v.borrar = true;
      v.razon = d <= UMBRAL.idéntica ? 'Repetida: ya está la otra igual' : 'Parecida: se queda la más nítida del grupo';
    });
  }
  fotos.forEach((f, i) => {
    const v = veredicto[i];
    if(v.borrar || v.mejor || f.tipo !== 'foto') return;
    if(f.captura){
      /* sin fecha de captura no se sabe si es vieja: se enseña, pero no se marca */
      const dias = f.fecha ? (hoy - f.fecha) / 86400000 : 0;
      if(dias > UMBRAL.diasCaptura){ v.borrar = true; v.razon = `Captura de pantalla de hace ${Math.round(dias)} días`; }
      return;
    }
    if(f.luz < 14 && f.contraste < 12){ v.borrar = true; v.razon = 'Casi negra: foto de bolsillo'; return; }
    if(f.luz > 245 && f.contraste < 10){ v.borrar = true; v.razon = 'Quemada: casi blanca'; return; }
    if(f.nitidez < UMBRAL.borrosa){ v.borrar = true; v.razon = 'Borrosa o movida'; }
  });
  return { grupos, veredicto: new Map(fotos.map((f, i) => [f.id, veredicto[i]])), ids };
}

/* «hace cuánto» y pesos para la pantalla */
export function peso(b){ return b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? Math.round(b / 1e6) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB'; }

/* La lista que lee el atajo: una fecha de captura por renglón. */
export function lista(fotos){
  const dos = (n) => String(n).padStart(2, '0');
  return fotos.filter((f) => f.fecha).map((f) => { const d = new Date(f.fecha); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`; }).join('\n');
}
