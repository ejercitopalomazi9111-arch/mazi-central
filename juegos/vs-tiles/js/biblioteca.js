/* MI MÚSICA. Las canciones que el jugador mete desde su teléfono se guardan EN SU TELÉFONO (IndexedDB) con su
   análisis, su nombre y su portada, y desde ahí se juegan como las de la casa. Nada se sube a ningún lado: es
   como osu! o Clone Hero, donde cada quien pone su música. Así caben las canciones con dueño (anime, Vocaloid,
   Rush E…) sin que el juego las reparta por internet.
   El nombre y la portada salen de las etiquetas del archivo: ID3 en los MP3 y las del iTunes en los M4A. Si no
   trae, del nombre del archivo («Artista - Título»). */

const BD = 'vstiles-musica', ALMACEN = 'canciones';
let _bd = null;
function abrir(){
  return _bd ||= new Promise((ok, mal) => { const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN, { keyPath: 'id' });
    r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });
}
async function tx(modo, f){ const bd = await abrir(); return new Promise((ok, mal) => { const t = bd.transaction(ALMACEN, modo), a = t.objectStore(ALMACEN), r = f(a);
  t.oncomplete = () => ok(r?.result); t.onerror = () => mal(t.error); t.onabort = () => mal(t.error); }); }

export const biblioteca = {
  listar: () => tx('readonly', a => a.getAll()).then(l => (l || []).sort((x, y) => x.agregada - y.agregada)),
  guardar: (rec) => tx('readwrite', a => a.put(rec)),
  uno: (id) => tx('readonly', a => a.get(id)),
  borrar: (id) => tx('readwrite', a => a.delete(id)),
  /* Safari borra lo que guarda una página que no se abre en 7 días, salvo que se pida guardarlo para siempre
     (y en la pantalla de inicio no lo borra nunca) */
  async persistir(){ try{ return await navigator.storage?.persist?.(); }catch(e){ return false; } }
};

/* ── las etiquetas ── */
const dec = (b, cod) => { try{ return new TextDecoder(cod).decode(b).replace(/\0+$/, '').replace(/\0/g, ' ').trim(); }catch(e){ return ''; } };
function texto(b){ const c = b[0], r = b.subarray(1);   // ID3: el primer byte dice la codificación
  if(c === 1){ return dec(r, r[0] === 0xFE ? 'utf-16be' : 'utf-16le').replace(/^﻿/, ''); }
  if(c === 2) return dec(r, 'utf-16be'); if(c === 3) return dec(r, 'utf-8'); return dec(r, 'latin1'); }
const fin = (b, i, ancho) => { for(; i < b.length - ancho + 1; i += ancho){ let cero = true; for(let k = 0; k < ancho; k++) if(b[i + k]){ cero = false; break; } if(cero) return i; } return b.length; };

function id3(b){
  if(b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return null;   // «ID3»
  const v = b[3], tam = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9], fuera = {};
  let i = 10; if(b[5] & 0x40){ const ext = v === 4 ? (b[10] << 21) | (b[11] << 14) | (b[12] << 7) | b[13] : (b[10] << 24 | b[11] << 16 | b[12] << 8 | b[13]) + 4; i += ext; }
  while(i + 10 < Math.min(b.length, 10 + tam)){
    const nom = String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]); if(!/^[A-Z0-9]{4}$/.test(nom)) break;
    const t = v === 4 ? (b[i + 4] << 21) | (b[i + 5] << 14) | (b[i + 6] << 7) | b[i + 7] : (b[i + 4] << 24 | b[i + 5] << 16 | b[i + 6] << 8 | b[i + 7]) >>> 0;
    const d = b.subarray(i + 10, i + 10 + t); i += 10 + t; if(!t) continue;
    if(nom === 'TIT2') fuera.titulo = texto(d); else if(nom === 'TPE1') fuera.artista = texto(d);
    else if(nom === 'APIC' && !fuera.portada){ const c = d[0]; let k = fin(d, 1, 1); const mime = dec(d.subarray(1, k), 'latin1') || 'image/jpeg'; k += 2;   // mime, \0, tipo de imagen
      k = fin(d, k, c === 1 || c === 2 ? 2 : 1) + (c === 1 || c === 2 ? 2 : 1);   // la descripción
      fuera.portada = new Blob([d.slice(k)], { type: mime.includes('/') ? mime : 'image/' + mime.toLowerCase() }); }
  }
  return fuera;
}

/* M4A: cajas anidadas moov › udta › meta › ilst › (©nam, ©ART, covr) › data */
function mp4(b){
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), fuera = {};
  const cajas = (ini, fin_, f) => { let i = ini; while(i + 8 <= fin_){ let t = dv.getUint32(i); const tipo = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    let cab = 8; if(t === 1){ t = Number(dv.getBigUint64(i + 8)); cab = 16; } else if(t === 0) t = fin_ - i; if(t < cab) break; f(tipo, i + cab, Math.min(fin_, i + t)); i += t; } };
  const dato = (ini, fin_, f) => cajas(ini, fin_, (t, a, z) => { if(t === 'data') f(dv.getUint32(a) & 0xFFFFFF, b.subarray(a + 8, z)); });
  cajas(0, b.length, (t, a, z) => { if(t !== 'moov') return; cajas(a, z, (t, a, z) => { if(t !== 'udta') return; cajas(a, z, (t, a, z) => { if(t !== 'meta') return;
    cajas(a + 4, z, (t, a, z) => { if(t !== 'ilst') return; cajas(a, z, (t, a, z) => {
      if(t === '©nam') dato(a, z, (_, d) => fuera.titulo = dec(d, 'utf-8'));
      else if(t === '©ART') dato(a, z, (_, d) => fuera.artista = dec(d, 'utf-8'));
      else if(t === 'covr') dato(a, z, (k, d) => fuera.portada ||= new Blob([d.slice()], { type: k === 14 ? 'image/png' : 'image/jpeg' })); }); }); }); }); });
  return fuera;
}

export async function etiquetas(archivo){
  let e = null;
  try{ const cab = new Uint8Array(await archivo.slice(0, 10).arrayBuffer());
    if(cab[0] === 0x49 && cab[1] === 0x44 && cab[2] === 0x33){ const tam = (cab[6] << 21) | (cab[7] << 14) | (cab[8] << 7) | cab[9]; e = id3(new Uint8Array(await archivo.slice(0, tam + 10).arrayBuffer())); }
    else if(String.fromCharCode(...cab.subarray(4, 8)) === 'ftyp' && archivo.size < 400e6) e = mp4(new Uint8Array(await archivo.arrayBuffer()));
  }catch(err){ e = null; }
  e ||= {};
  /* sin etiquetas, del nombre: «Artista - Título.mp3» */
  const base = archivo.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim(), partes = base.split(/\s+[-–—]\s+/);
  if(!e.titulo) e.titulo = partes.length > 1 ? partes.slice(1).join(' - ') : base;
  if(!e.artista) e.artista = partes.length > 1 ? partes[0] : 'Tu música';
  e.titulo = e.titulo.slice(0, 60); e.artista = e.artista.slice(0, 40);
  return e;
}
