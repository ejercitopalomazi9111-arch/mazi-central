/* LO QUE PASA EN LA TELE CUANDO NO HAY EPISODIO NUEVO
   ----------------------------------------------------------------------------
   Lo pidió Carlos: «en caso de que no se tenga un episodio nuevo del podcast
   pueda poner música de YouTube con video, o de Spotify con la carátula de la
   canción si no tiene video, o incluso películas».

   Aquí sólo va lo que no depende de la pantalla, para poder probarlo solo:

     enlace(url)      → qué es un enlace de YouTube o de Spotify y con qué
                        dirección se mete en un marco. null si no es ninguno.
     leerID3(bytes)   → título, artista y carátula de un MP3 (la etiqueta ID3
                        que traen casi todas las canciones bajadas).
     largoID3(bytes)  → cuántos bytes ocupa esa etiqueta (para leer sólo eso
                        y no las 5 MB de la canción).
     YT               → cómo hablarle al reproductor de YouTube metido en un
                        marco SIN cargar su librería (es un externo): por
                        mensajes, que es como lo hace su propia librería.

   Lo que NO se promete, dicho claro: Spotify en una página sólo deja oír 30
   segundos de cada canción si en ese navegador no hay una cuenta de Spotify
   abierta, y no deja que la página le dé play sola: hay que tocar ▶ una vez.
   Lo dice la propia documentación de Spotify para sus marcos. */

/* ── los enlaces ────────────────────────────────────────────────────── */
const ID_YT = /^[A-Za-z0-9_-]{11}$/;
export function enlace(texto, { origen = '' } = {}){
  let u;
  try{ u = new URL(String(texto || '').trim()); }catch(e){ return null; }
  const h = u.hostname.replace(/^www\.|^m\.|^music\./, '');
  /* YouTube: watch?v=, youtu.be/, shorts/, embed/, live/ y listas */
  if(h === 'youtube.com' || h === 'youtu.be' || h === 'youtube-nocookie.com'){
    let id = '';
    if(h === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if(u.searchParams.get('v')) id = u.searchParams.get('v');
    else { const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/); if(m) id = m[1]; }
    if(id && !ID_YT.test(id)) id = '';
    const lista = (u.searchParams.get('list') || '').replace(/[^A-Za-z0-9_-]/g, '');
    if(!id && !lista) return null;
    const q = new URLSearchParams({ autoplay: '1', enablejsapi: '1', playsinline: '1', rel: '0', modestbranding: '1', iv_load_policy: '3' });
    if(lista) q.set('list', lista);
    if(origen) q.set('origin', origen);
    /* youtube-nocookie: el mismo reproductor sin galletas de rastreo */
    const embed = 'https://www.youtube-nocookie.com/embed/' + (id || 'videoseries') + '?' + q.toString();
    return { tipo: 'youtube', id, lista, embed, nombre: lista && !id ? 'Lista de YouTube' : 'Video de YouTube', conVideo: true };
  }
  /* Spotify: canción, disco, lista, artista, podcast o episodio */
  if(h === 'open.spotify.com' || h === 'spotify.link'){
    const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|artist|show|episode)\/([A-Za-z0-9]{10,40})/);
    if(!m) return null;
    const NOM = { track: 'Canción', album: 'Disco', playlist: 'Lista', artist: 'Artista', show: 'Podcast', episode: 'Episodio' };
    return { tipo: 'spotify', clase: m[1], id: m[2], embed: 'https://open.spotify.com/embed/' + m[1] + '/' + m[2] + '?utm_source=generator&theme=0',
      nombre: NOM[m[1]] + ' de Spotify', conVideo: false };
  }
  return null;
}

/* ── la etiqueta ID3 de un MP3 ──────────────────────────────────────── */
const sincro = (b, i) => ((b[i] & 0x7f) << 21) | ((b[i + 1] & 0x7f) << 14) | ((b[i + 2] & 0x7f) << 7) | (b[i + 3] & 0x7f);
export function largoID3(bytes){
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if(b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return 0;
  return 10 + sincro(b, 6) + (b[5] & 0x10 ? 10 : 0);
}
function texto(b, cod){
  /* 0 = latin-1 · 1 = UTF-16 con BOM · 2 = UTF-16BE · 3 = UTF-8 */
  try{
    if(cod === 0) return new TextDecoder('latin1').decode(b);
    if(cod === 3) return new TextDecoder('utf-8').decode(b);
    if(cod === 2) return new TextDecoder('utf-16be').decode(b);
    if(b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(b.subarray(2));
    if(b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder('utf-16le').decode(b.subarray(2));
    return new TextDecoder('utf-16le').decode(b);
  }catch(e){ return ''; }
}
const limpio = (s) => String(s || '').replace(/\0+$/g, '').split('\0')[0].trim();
/* dónde acaba un texto terminado en nulo (uno o dos bytes según el código) */
function finDeTexto(b, i, cod){
  if(cod === 1 || cod === 2){ for(let k = i; k + 1 < b.length; k += 2) if(b[k] === 0 && b[k + 1] === 0) return k + 2; return b.length; }
  for(let k = i; k < b.length; k++) if(b[k] === 0) return k + 1;
  return b.length;
}
export function leerID3(bytes){
  let b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const largo = largoID3(b); if(!largo) return {};
  const ver = b[3], banderas = b[5];
  let cuerpo = b.subarray(10, Math.min(b.length, largo));
  /* «desincronización»: cada FF 00 de la etiqueta vale FF */
  if(banderas & 0x80){
    const o = []; for(let i = 0; i < cuerpo.length; i++){ o.push(cuerpo[i]); if(cuerpo[i] === 0xFF && cuerpo[i + 1] === 0) i++; }
    cuerpo = new Uint8Array(o);
  }
  let i = 0;
  if(banderas & 0x40){ i = ver === 4 ? sincro(cuerpo, 0) : (((cuerpo[0] << 24) | (cuerpo[1] << 16) | (cuerpo[2] << 8) | cuerpo[3]) >>> 0) + 4; }
  const out = {};
  const corto = ver === 2;
  while(i + (corto ? 6 : 10) <= cuerpo.length){
    const id = String.fromCharCode(...cuerpo.subarray(i, i + (corto ? 3 : 4)));
    if(!/^[A-Z0-9]{3,4}$/.test(id)) break;           /* el relleno de ceros del final */
    const n = corto ? ((cuerpo[i + 3] << 16) | (cuerpo[i + 4] << 8) | cuerpo[i + 5])
            : ver === 4 ? sincro(cuerpo, i + 4)
            : (((cuerpo[i + 4] << 24) | (cuerpo[i + 5] << 16) | (cuerpo[i + 6] << 8) | cuerpo[i + 7]) >>> 0);
    const ini = i + (corto ? 6 : 10), d = cuerpo.subarray(ini, ini + n);
    if(n <= 0 || ini + n > cuerpo.length) break;
    if(id === 'TIT2' || id === 'TT2') out.titulo = limpio(texto(d.subarray(1), d[0]));
    else if(id === 'TPE1' || id === 'TP1') out.artista = limpio(texto(d.subarray(1), d[0]));
    else if(id === 'TALB' || id === 'TAL') out.disco = limpio(texto(d.subarray(1), d[0]));
    else if((id === 'APIC' || id === 'PIC') && !out.portada){
      const cod = d[0]; let k = 1, mime;
      if(id === 'PIC'){ const f = String.fromCharCode(d[1], d[2], d[3]).toLowerCase(); mime = f === 'png' ? 'image/png' : 'image/jpeg'; k = 4; }
      else { const fin = finDeTexto(d, 1, 0); mime = new TextDecoder('latin1').decode(d.subarray(1, fin - 1)) || 'image/jpeg'; k = fin; }
      k += 1;                                         /* el tipo de imagen (3 = portada) */
      k = finDeTexto(d, k, cod);                      /* la descripción */
      const img = d.slice(k);
      if(img.length > 64){
        if(!/^image\//.test(mime)) mime = 'image/' + (mime.toLowerCase() === 'png' ? 'png' : 'jpeg');
        out.portada = { mime, bytes: img };
      }
    }
    i = ini + n;
  }
  return out;
}

/* ── hablarle a YouTube por mensajes ────────────────────────────────── */
export const YT = {
  ORIGENES: ['https://www.youtube-nocookie.com', 'https://www.youtube.com'],
  mandar(marco, func, args = []){
    try{ marco.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args, id: 1, channel: 'widget' }), '*'); }catch(e){}
  },
  /* «avísame lo que pase»: se repite unas veces porque el reproductor tarda
     en estar listo y el primer mensaje se pierde */
  escuchar(marco){
    let n = 0;
    const t = setInterval(() => {
      try{ marco.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); }catch(e){}
      if(++n >= 8) clearInterval(t);
    }, 700);
    return () => clearInterval(t);
  },
  /* de un mensaje que llegó, el estado: −1 sin empezar · 0 acabó · 1 suena · 2 en pausa · 3 cargando */
  estado(datos){
    let d = datos;
    if(typeof d === 'string'){ try{ d = JSON.parse(d); }catch(e){ return null; } }
    if(!d || typeof d !== 'object') return null;
    if(d.event === 'onStateChange' && typeof d.info === 'number') return d.info;
    if(d.event === 'infoDelivery' && d.info && typeof d.info.playerState === 'number') return d.info.playerState;
    return null;
  },
};
