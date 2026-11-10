/* ══ INKWELL · LA COMUNIDAD ═════════════════════════════════════════════════
   Carlos, 10 de noviembre: comentarios por cómic y por capítulo, foros,
   perfiles, seguir a otros y cuentas de verdad. Vive en el servidor de La Sala
   (un Durable Object con SQLite) para que no haya que crear nada en el panel
   de Cloudflare: se publica solo al fusionar, igual que «Mis pingüinos».

   Cuentas: usuario + contraseña, SIN correo (mandar correos pide un servicio
   de paga). Al crear la cuenta se entrega un código de recuperación de un
   solo uso; con él se pone otra contraseña. La contraseña se guarda con
   PBKDF2-SHA256 (100 000 vueltas y sal propia); la sesión es un token al azar
   del que sólo se guarda su huella SHA-256.

   Moderación: quien tenga la llave de GRUPAZ (X-Llave, la de La Sala) nombra
   admins con /admin; index.js la comprueba preguntándole a la sala GRUPAZ. Un admin oculta comentarios y temas y ve los reportes.

   Todas las rutas: /api/sala/comunidad/<accion>  (GET o POST con JSON).
   El token va en el encabezado «x-token».                                    */

export const TOPE = { usuario: 20, nombre: 40, bio: 300, texto: 2000, titulo: 120, foto: 160_000, cuerpo: 220_000, estante: 60 };
export const REACCIONES = ['gusta', 'encanta', 'risa', 'wow', 'triste'];
export const CATEGORIAS = ['general', 'recomendaciones', 'teorias', 'escritura', 'dibujo', 'ayuda'];
const DIA = 864e5;
const RE_USUARIO = /^[a-z0-9_]{3,20}$/;
const RE_OBRA = /^[A-Za-z0-9:_.-]{1,80}$/;
const RE_FOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const mal = (status, error) => json({ bien: false, error }, status);
const limpio = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const azar = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; };
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codigo = (n) => [...azar(n)].map((b) => LETRAS[b % LETRAS.length]).join('');
async function huella(t){ return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))); }
async function derivar(clave, sal){
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(sal), iterations: 100_000 }, base, 256));
}
const iguales = (a, b) => { if(a.length !== b.length) return false; let d = 0; for(let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

export const ESQUEMA = `
CREATE TABLE IF NOT EXISTS cuentas(usuario TEXT PRIMARY KEY, nombre TEXT, sal TEXT, clave TEXT, recuperacion TEXT, admin INTEGER DEFAULT 0, bio TEXT DEFAULT '', foto TEXT DEFAULT '', estante TEXT DEFAULT '[]', publico INTEGER DEFAULT 1, creado INTEGER, fallos INTEGER DEFAULT 0, bloqueo INTEGER DEFAULT 0, suspendido INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sesiones(huella TEXT PRIMARY KEY, usuario TEXT, vence INTEGER);
CREATE TABLE IF NOT EXISTS comentarios(id INTEGER PRIMARY KEY AUTOINCREMENT, obra TEXT, cap TEXT DEFAULT '', padre INTEGER DEFAULT 0, usuario TEXT, texto TEXT, creado INTEGER, editado INTEGER DEFAULT 0, oculto INTEGER DEFAULT 0, spoiler INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS c_obra ON comentarios(obra, cap, creado);
CREATE TABLE IF NOT EXISTS reacciones(comentario INTEGER, usuario TEXT, tipo TEXT, PRIMARY KEY(comentario, usuario));
CREATE TABLE IF NOT EXISTS temas(id INTEGER PRIMARY KEY AUTOINCREMENT, categoria TEXT, titulo TEXT, usuario TEXT, creado INTEGER, actividad INTEGER, respuestas INTEGER DEFAULT 0, oculto INTEGER DEFAULT 0, fijo INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS siguiendo(quien TEXT, a TEXT, desde INTEGER, PRIMARY KEY(quien, a));
CREATE TABLE IF NOT EXISTS avisos(id INTEGER PRIMARY KEY AUTOINCREMENT, para TEXT, tipo TEXT, de TEXT, obra TEXT, comentario INTEGER, texto TEXT, creado INTEGER, leido INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS a_para ON avisos(para, creado);
CREATE TABLE IF NOT EXISTS reportes(id INTEGER PRIMARY KEY AUTOINCREMENT, comentario INTEGER, usuario TEXT, motivo TEXT, creado INTEGER, resuelto INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS ritmo(usuario TEXT, cuando INTEGER);
`;

/* El corazón, aparte de Cloudflare: `q(sql, ...valores)` regresa los renglones. Así las pruebas lo corren en Node
   con node:sqlite y es el mismo código. `llaves` = las de La Sala, para nombrar admins. */
export async function manejar(q, pedido, { ahora = Date.now(), llaveOk = false } = {}){
  const url = new URL(pedido.url);
  const accion = url.pathname.split('/').pop();
  let d = {};
  if(pedido.method === 'POST'){
    const crudo = await pedido.text();
    if(crudo.length > TOPE.cuerpo) return mal(413, 'Es demasiado grande.');
    try{ d = crudo ? JSON.parse(crudo) : {}; }catch{ return mal(400, 'No se entendió lo que mandaste.'); }
    if(!d || typeof d !== 'object') d = {};
  }
  const p = (k) => url.searchParams.get(k) || '';
  const uno = (sql, ...v) => q(sql, ...v)[0] || null;

  /* quién pide: por su token */
  let yo = null;
  const tok = pedido.headers.get('x-token') || '';
  if(tok && tok.length <= 100){
    const s = uno('SELECT usuario, vence FROM sesiones WHERE huella = ?', await huella(tok));
    if(s && s.vence > ahora) yo = uno('SELECT * FROM cuentas WHERE usuario = ?', s.usuario);
  }
  const pide = () => yo ? null : mal(401, 'Entra a tu cuenta para hacer esto.');
  const esAdmin = () => !!(yo && yo.admin);
  /* contra el spam: 12 cosas por minuto y 300 al día por cuenta */
  const ritmo = () => {
    q('DELETE FROM ritmo WHERE cuando < ?', ahora - DIA);
    const min = uno('SELECT COUNT(*) n FROM ritmo WHERE usuario = ? AND cuando > ?', yo.usuario, ahora - 60_000).n;
    const dia = uno('SELECT COUNT(*) n FROM ritmo WHERE usuario = ?', yo.usuario).n;
    if(min >= 12 || dia >= 300) return mal(429, 'Vas muy rápido. Espera un momento.');
    q('INSERT INTO ritmo(usuario, cuando) VALUES(?, ?)', yo.usuario, ahora); return null;
  };
  const publico = (c) => c && { usuario: c.usuario, nombre: c.nombre, foto: c.foto ? 1 : 0, admin: !!c.admin };
  const nuevaSesion = async (usuario) => {
    const t = hex(azar(32));
    q('INSERT INTO sesiones(huella, usuario, vence) VALUES(?, ?, ?)', await huella(t), usuario, ahora + 90 * DIA);
    return t;
  };
  const avisar = (para, tipo, de, extra = {}) => {
    if(!para || para === de) return;
    q('INSERT INTO avisos(para, tipo, de, obra, comentario, texto, creado) VALUES(?, ?, ?, ?, ?, ?, ?)', para, tipo, de, extra.obra || '', extra.comentario || 0, (extra.texto || '').slice(0, 140), ahora);
    q('DELETE FROM avisos WHERE para = ? AND id NOT IN (SELECT id FROM avisos WHERE para = ? ORDER BY id DESC LIMIT 200)', para, para);
  };
  const menciones = (texto, de, extra) => {
    const vistos = new Set();
    for(const m of texto.matchAll(/@([a-z0-9_]{3,20})/gi)){
      const u = m[1].toLowerCase(); if(vistos.has(u) || vistos.size >= 5) continue; vistos.add(u);
      if(uno('SELECT 1 x FROM cuentas WHERE usuario = ?', u)) avisar(u, 'mencion', de, extra);
    }
  };

  switch(accion){
    /* ── cuentas ── */
    case 'registro': {
      const usuario = limpio(d.usuario, 40).toLowerCase(), clave = String(d.clave || '');
      if(!RE_USUARIO.test(usuario)) return mal(400, 'El usuario va de 3 a 20 letras sin acentos, números o guion bajo.');
      if(clave.length < 8 || clave.length > 200) return mal(400, 'La contraseña necesita al menos 8 caracteres.');
      if(uno('SELECT 1 x FROM cuentas WHERE usuario = ?', usuario)) return mal(409, 'Ese usuario ya existe. Prueba con otro.');
      const sal = hex(azar(16)), rec = codigo(12);
      const nadie = !uno('SELECT 1 x FROM cuentas LIMIT 1');
      q('INSERT INTO cuentas(usuario, nombre, sal, clave, recuperacion, creado) VALUES(?, ?, ?, ?, ?, ?)',
        usuario, limpio(d.nombre, TOPE.nombre) || usuario, sal, await derivar(clave, sal), await huella(rec), ahora);
      return json({ bien: true, token: await nuevaSesion(usuario), recuperacion: rec, yo: publico(uno('SELECT * FROM cuentas WHERE usuario = ?', usuario)), primera: nadie });
    }
    case 'entrar': {
      const usuario = limpio(d.usuario, 40).toLowerCase(), c = uno('SELECT * FROM cuentas WHERE usuario = ?', usuario);
      if(c && c.bloqueo > ahora) return mal(429, 'Demasiados intentos. Espera 15 minutos.');
      if(!c || !iguales(await derivar(String(d.clave || ''), c.sal), c.clave)){
        if(c){ const f = c.fallos + 1; q('UPDATE cuentas SET fallos = ?, bloqueo = ? WHERE usuario = ?', f >= 5 ? 0 : f, f >= 5 ? ahora + 15 * 60_000 : 0, usuario); }
        return mal(401, 'Usuario o contraseña equivocados.');
      }
      if(c.suspendido) return mal(403, 'Esta cuenta está suspendida.');
      q('UPDATE cuentas SET fallos = 0, bloqueo = 0 WHERE usuario = ?', usuario);
      return json({ bien: true, token: await nuevaSesion(usuario), yo: publico(c) });
    }
    case 'recuperar': {
      const usuario = limpio(d.usuario, 40).toLowerCase(), c = uno('SELECT * FROM cuentas WHERE usuario = ?', usuario), clave = String(d.clave || '');
      if(c && c.bloqueo > ahora) return mal(429, 'Demasiados intentos. Espera 15 minutos.');
      if(!c || !iguales(await huella(limpio(d.codigo, 40).toUpperCase().replace(/[^A-Z0-9]/g, '')), c.recuperacion)){
        if(c){ const f = c.fallos + 1; q('UPDATE cuentas SET fallos = ?, bloqueo = ? WHERE usuario = ?', f >= 5 ? 0 : f, f >= 5 ? ahora + 15 * 60_000 : 0, usuario); }
        return mal(401, 'Ese código no es el de esa cuenta.');
      }
      if(clave.length < 8 || clave.length > 200) return mal(400, 'La contraseña nueva necesita al menos 8 caracteres.');
      const sal = hex(azar(16)), rec = codigo(12);
      q('UPDATE cuentas SET sal = ?, clave = ?, recuperacion = ?, fallos = 0, bloqueo = 0 WHERE usuario = ?', sal, await derivar(clave, sal), await huella(rec), usuario);
      q('DELETE FROM sesiones WHERE usuario = ?', usuario);
      return json({ bien: true, token: await nuevaSesion(usuario), recuperacion: rec, yo: publico(c) });
    }
    case 'salir': {
      if(tok) q('DELETE FROM sesiones WHERE huella = ?', await huella(tok));
      return json({ bien: true });
    }
    case 'yo': {
      if(!yo) return json({ bien: true, yo: null });
      const sin = uno('SELECT COUNT(*) n FROM avisos WHERE para = ? AND leido = 0', yo.usuario).n;
      return json({ bien: true, yo: { ...publico(yo), bio: yo.bio, estante: JSON.parse(yo.estante || '[]'), publico: !!yo.publico, avisos: sin } });
    }
    case 'admin': {
      if(!llaveOk) return mal(403, 'Sólo con la llave de La Sala.');
      const u = limpio(d.usuario, 40).toLowerCase();
      if(!uno('SELECT 1 x FROM cuentas WHERE usuario = ?', u)) return mal(404, 'No existe ese usuario.');
      q('UPDATE cuentas SET admin = ? WHERE usuario = ?', d.quitar ? 0 : 1, u);
      return json({ bien: true });
    }

    /* ── perfiles ── */
    case 'perfil': {
      if(pedido.method === 'POST'){
        const r = pide(); if(r) return r;
        const foto = d.foto === '' ? '' : d.foto == null ? yo.foto : String(d.foto);
        if(foto && (foto.length > TOPE.foto || !RE_FOTO.test(foto))) return mal(400, 'La foto no sirve o pesa demasiado.');
        const estante = Array.isArray(d.estante) ? d.estante.slice(0, TOPE.estante).map((x) => ({ id: limpio(x && x.id, 80), titulo: limpio(x && x.titulo, 80), lista: limpio(x && x.lista, 20), nota: Math.max(0, Math.min(5, +(x && x.nota) || 0)) })).filter((x) => x.id && x.titulo) : JSON.parse(yo.estante || '[]');
        q('UPDATE cuentas SET nombre = ?, bio = ?, foto = ?, estante = ?, publico = ? WHERE usuario = ?',
          limpio(d.nombre, TOPE.nombre) || yo.nombre, d.bio == null ? yo.bio : limpio(d.bio, TOPE.bio), foto, JSON.stringify(estante), d.publico == null ? yo.publico : (d.publico ? 1 : 0), yo.usuario);
        return json({ bien: true });
      }
      const c = uno('SELECT * FROM cuentas WHERE usuario = ?', p('u').toLowerCase());
      if(!c || c.suspendido) return mal(404, 'No existe ese perfil.');
      const n = (sql) => uno(sql, c.usuario).n;
      return json({ bien: true, perfil: { ...publico(c), bio: c.bio, creado: c.creado,
        estante: c.publico ? JSON.parse(c.estante || '[]') : null,
        seguidores: n('SELECT COUNT(*) n FROM siguiendo WHERE a = ?'), siguiendo: n('SELECT COUNT(*) n FROM siguiendo WHERE quien = ?'),
        comentarios: n('SELECT COUNT(*) n FROM comentarios WHERE usuario = ? AND oculto = 0'),
        loSigo: !!(yo && uno('SELECT 1 x FROM siguiendo WHERE quien = ? AND a = ?', yo.usuario, c.usuario)) } });
    }
    case 'foto': {
      const c = uno('SELECT foto FROM cuentas WHERE usuario = ?', p('u').toLowerCase());
      if(!c || !c.foto) return mal(404, 'Sin foto.');
      const [cab, datos] = c.foto.split(',');
      const bytes = Uint8Array.from(atob(datos), (x) => x.charCodeAt(0));
      return new Response(bytes, { headers: { 'content-type': cab.slice(5, cab.indexOf(';')), 'cache-control': 'public, max-age=300' } });
    }
    case 'seguir': {
      const r = pide(); if(r) return r;
      const a = limpio(d.usuario, 40).toLowerCase();
      if(a === yo.usuario || !uno('SELECT 1 x FROM cuentas WHERE usuario = ?', a)) return mal(400, 'No puedes seguir a esa cuenta.');
      if(d.si === false) q('DELETE FROM siguiendo WHERE quien = ? AND a = ?', yo.usuario, a);
      else if(!uno('SELECT 1 x FROM siguiendo WHERE quien = ? AND a = ?', yo.usuario, a)){ q('INSERT INTO siguiendo(quien, a, desde) VALUES(?, ?, ?)', yo.usuario, a, ahora); avisar(a, 'seguidor', yo.usuario); }
      return json({ bien: true });
    }

    /* ── comentarios: por obra («webtoon:777»), por capítulo (cap) y respuestas (padre) ── */
    case 'hilo': {
      const obra = p('obra'), cap = p('cap');
      if(!RE_OBRA.test(obra)) return mal(400, 'Falta de qué obra.');
      const filas = q(`SELECT c.*, k.nombre, k.foto AS conFoto, k.admin FROM comentarios c LEFT JOIN cuentas k ON k.usuario = c.usuario
        WHERE c.obra = ? AND c.cap = ? AND (c.oculto = 0 OR ? = 1) ORDER BY c.creado ASC LIMIT 500`, obra, cap, esAdmin() ? 1 : 0);
      const ids = filas.map((f) => f.id);
      const reac = ids.length ? q(`SELECT comentario, tipo, COUNT(*) n FROM reacciones WHERE comentario IN (${ids.map(() => '?').join(',')}) GROUP BY comentario, tipo`, ...ids) : [];
      const mias = yo && ids.length ? q(`SELECT comentario, tipo FROM reacciones WHERE usuario = ? AND comentario IN (${ids.map(() => '?').join(',')})`, yo.usuario, ...ids) : [];
      const comentarios = filas.map((f) => ({ id: f.id, padre: f.padre, usuario: f.usuario, nombre: f.nombre || f.usuario, foto: f.conFoto ? 1 : 0, admin: !!f.admin,
        texto: f.texto, creado: f.creado, editado: f.editado, oculto: !!f.oculto, spoiler: !!f.spoiler,
        reacciones: Object.fromEntries(reac.filter((r) => r.comentario === f.id).map((r) => [r.tipo, r.n])),
        mia: (mias.find((m) => m.comentario === f.id) || {}).tipo || null, puedoBorrar: !!yo && (yo.usuario === f.usuario || !!yo.admin) }));
      return json({ bien: true, comentarios, total: comentarios.length });
    }
    case 'cuantos': {
      /* cuántos comentarios tiene cada capítulo de una obra (para la ficha) */
      const obra = p('obra'); if(!RE_OBRA.test(obra)) return mal(400, 'Falta de qué obra.');
      return json({ bien: true, caps: Object.fromEntries(q('SELECT cap, COUNT(*) n FROM comentarios WHERE obra = ? AND oculto = 0 GROUP BY cap', obra).map((r) => [r.cap, r.n])) });
    }
    case 'comentar': {
      const r = pide() || ritmo(); if(r) return r;
      const obra = limpio(d.obra, 80), cap = limpio(d.cap, 20), texto = limpio(d.texto, TOPE.texto);
      if(!RE_OBRA.test(obra)) return mal(400, 'Falta de qué obra.');
      if(!texto) return mal(400, 'Escribe algo.');
      let padre = 0, del = null;
      if(d.padre){ del = uno('SELECT * FROM comentarios WHERE id = ? AND obra = ? AND cap = ?', +d.padre, obra, cap); if(!del) return mal(404, 'Ese comentario ya no está.'); padre = del.padre || del.id; }
      q('INSERT INTO comentarios(obra, cap, padre, usuario, texto, creado, spoiler) VALUES(?, ?, ?, ?, ?, ?, ?)', obra, cap, padre, yo.usuario, texto, ahora, d.spoiler ? 1 : 0);
      const id = uno('SELECT last_insert_rowid() id').id;
      if(obra.startsWith('tema:')) q('UPDATE temas SET actividad = ?, respuestas = respuestas + 1 WHERE id = ?', ahora, +obra.slice(5));
      if(del) avisar(del.usuario, 'respuesta', yo.usuario, { obra, comentario: id, texto });
      if(obra.startsWith('tema:')){ const t = uno('SELECT usuario FROM temas WHERE id = ?', +obra.slice(5)); if(t && (!del || del.usuario !== t.usuario)) avisar(t.usuario, 'tema', yo.usuario, { obra, comentario: id, texto }); }
      menciones(texto, yo.usuario, { obra, comentario: id, texto });
      return json({ bien: true, id });
    }
    case 'editar': {
      const r = pide(); if(r) return r;
      const c = uno('SELECT * FROM comentarios WHERE id = ?', +d.id), texto = limpio(d.texto, TOPE.texto);
      if(!c || c.usuario !== yo.usuario) return mal(403, 'Sólo puedes editar lo tuyo.');
      if(!texto) return mal(400, 'Escribe algo.');
      q('UPDATE comentarios SET texto = ?, editado = ? WHERE id = ?', texto, ahora, c.id);
      return json({ bien: true });
    }
    case 'borrar': {
      const r = pide(); if(r) return r;
      const c = uno('SELECT * FROM comentarios WHERE id = ?', +d.id);
      if(!c) return mal(404, 'Ya no está.');
      if(c.usuario !== yo.usuario && !yo.admin) return mal(403, 'Sólo puedes borrar lo tuyo.');
      q('UPDATE comentarios SET oculto = 1 WHERE id = ? OR padre = ?', c.id, c.id);
      return json({ bien: true });
    }
    case 'reaccionar': {
      const r = pide(); if(r) return r;
      const id = +d.id, tipo = String(d.tipo || '');
      if(!uno('SELECT 1 x FROM comentarios WHERE id = ? AND oculto = 0', id)) return mal(404, 'Ese comentario ya no está.');
      const ya = uno('SELECT tipo FROM reacciones WHERE comentario = ? AND usuario = ?', id, yo.usuario);
      if(!REACCIONES.includes(tipo) || (ya && ya.tipo === tipo)) q('DELETE FROM reacciones WHERE comentario = ? AND usuario = ?', id, yo.usuario);
      else{
        q('INSERT OR REPLACE INTO reacciones(comentario, usuario, tipo) VALUES(?, ?, ?)', id, yo.usuario, tipo);
        if(!ya){ const c = uno('SELECT usuario, obra FROM comentarios WHERE id = ?', id); avisar(c.usuario, 'reaccion', yo.usuario, { obra: c.obra, comentario: id, texto: tipo }); }
      }
      return json({ bien: true });
    }
    case 'reportar': {
      const r = pide(); if(r) return r;
      const id = +d.id; if(!uno('SELECT 1 x FROM comentarios WHERE id = ?', id)) return mal(404, 'Ya no está.');
      if(!uno('SELECT 1 x FROM reportes WHERE comentario = ? AND usuario = ?', id, yo.usuario)) q('INSERT INTO reportes(comentario, usuario, motivo, creado) VALUES(?, ?, ?, ?)', id, yo.usuario, limpio(d.motivo, 200), ahora);
      return json({ bien: true });
    }

    /* ── foros ── */
    case 'temas': {
      const cat = p('categoria');
      const filas = q(`SELECT t.*, k.nombre FROM temas t LEFT JOIN cuentas k ON k.usuario = t.usuario WHERE t.oculto = 0 ${cat ? 'AND t.categoria = ?' : ''} ORDER BY t.fijo DESC, t.actividad DESC LIMIT 100`, ...(cat ? [cat] : []));
      return json({ bien: true, categorias: CATEGORIAS, temas: filas.map((t) => ({ id: t.id, categoria: t.categoria, titulo: t.titulo, usuario: t.usuario, nombre: t.nombre || t.usuario, creado: t.creado, actividad: t.actividad, respuestas: t.respuestas, fijo: !!t.fijo })) });
    }
    case 'tema': {
      if(pedido.method === 'GET'){
        const t = uno('SELECT t.*, k.nombre FROM temas t LEFT JOIN cuentas k ON k.usuario = t.usuario WHERE t.id = ? AND (t.oculto = 0 OR ? = 1)', +p('id'), esAdmin() ? 1 : 0);
        if(!t) return mal(404, 'Ese tema ya no está.');
        return json({ bien: true, tema: { id: t.id, categoria: t.categoria, titulo: t.titulo, usuario: t.usuario, nombre: t.nombre || t.usuario, creado: t.creado, respuestas: t.respuestas, fijo: !!t.fijo, mio: !!yo && yo.usuario === t.usuario } });
      }
      const r = pide() || ritmo(); if(r) return r;
      const titulo = limpio(d.titulo, TOPE.titulo), texto = limpio(d.texto, TOPE.texto), cat = CATEGORIAS.includes(d.categoria) ? d.categoria : 'general';
      if(titulo.length < 4) return mal(400, 'Ponle un título de al menos 4 letras.');
      if(!texto) return mal(400, 'Escribe de qué quieres hablar.');
      q('INSERT INTO temas(categoria, titulo, usuario, creado, actividad) VALUES(?, ?, ?, ?, ?)', cat, titulo, yo.usuario, ahora, ahora);
      const id = uno('SELECT last_insert_rowid() id').id;
      q('INSERT INTO comentarios(obra, cap, padre, usuario, texto, creado) VALUES(?, ?, 0, ?, ?, ?)', 'tema:' + id, '', yo.usuario, texto, ahora);
      menciones(texto, yo.usuario, { obra: 'tema:' + id, texto: titulo });
      return json({ bien: true, id });
    }
    case 'moderar': {
      const r = pide(); if(r) return r;
      if(!yo.admin) return mal(403, 'Sólo los admins.');
      if(d.tema) q('UPDATE temas SET oculto = ?, fijo = ? WHERE id = ?', d.ocultar ? 1 : 0, d.fijar ? 1 : 0, +d.tema);
      if(d.comentario) q('UPDATE comentarios SET oculto = ? WHERE id = ?', d.ocultar ? 1 : 0, +d.comentario);
      if(d.reporte) q('UPDATE reportes SET resuelto = 1 WHERE id = ?', +d.reporte);
      if(d.suspender) q('UPDATE cuentas SET suspendido = ? WHERE usuario = ? AND admin = 0', d.suspender.si ? 1 : 0, String(d.suspender.usuario || '').toLowerCase());
      return json({ bien: true });
    }
    case 'reportes': {
      const r = pide(); if(r) return r;
      if(!yo.admin) return mal(403, 'Sólo los admins.');
      return json({ bien: true, reportes: q(`SELECT r.id, r.comentario, r.usuario AS reporta, r.motivo, r.creado, c.texto, c.usuario, c.obra, c.oculto
        FROM reportes r LEFT JOIN comentarios c ON c.id = r.comentario WHERE r.resuelto = 0 ORDER BY r.creado DESC LIMIT 100`) });
    }

    /* ── avisos ── */
    case 'avisos': {
      const r = pide(); if(r) return r;
      if(pedido.method === 'POST'){ q('UPDATE avisos SET leido = 1 WHERE para = ?', yo.usuario); return json({ bien: true }); }
      return json({ bien: true, avisos: q('SELECT a.*, k.nombre FROM avisos a LEFT JOIN cuentas k ON k.usuario = a.de WHERE a.para = ? ORDER BY a.id DESC LIMIT 60', yo.usuario)
        .map((a) => ({ id: a.id, tipo: a.tipo, de: a.de, nombre: a.nombre || a.de, obra: a.obra, comentario: a.comentario, texto: a.texto, creado: a.creado, leido: !!a.leido })) });
    }
    /* lo último que se dijo en toda la comunidad (para la portada) */
    case 'reciente': {
      return json({ bien: true, comentarios: q(`SELECT c.id, c.obra, c.cap, c.usuario, k.nombre, c.texto, c.creado, c.spoiler FROM comentarios c LEFT JOIN cuentas k ON k.usuario = c.usuario
        WHERE c.oculto = 0 ORDER BY c.id DESC LIMIT 30`) });
    }
  }
  return mal(404, 'No existe esa ruta.');
}

/* El objeto de Cloudflare: una sola Comunidad para todo INKWELL, con su SQLite. */
export class Comunidad {
  constructor(ctx, env){
    this.ctx = ctx; this.env = env;
    ctx.blockConcurrencyWhile(async () => { ctx.storage.sql.exec(ESQUEMA); });
  }
  async fetch(pedido){
    const q = (sql, ...v) => this.ctx.storage.sql.exec(sql, ...v).toArray();
    /* la llave de La Sala ya la revisó index.js contra GRUPAZ: aquí sólo llega su marca */
    try{ return await manejar(q, pedido, { llaveOk: pedido.headers.get('x-llave-ok') === '1' }); }
    catch(e){ return mal(500, 'La comunidad tuvo un error: ' + String((e && e.message) || e).slice(0, 160)); }
  }
}
