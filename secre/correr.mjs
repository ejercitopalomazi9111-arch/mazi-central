#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   SECRE · prender las cuentas y el panel
   ──────────────────────────────────────────────────────────────────────────
   Corre en una máquina que no se apague (la compu de Carlos o un servidor):
   WhatsApp necesita una conexión abierta todo el tiempo, y eso no cabe en los
   workers de Cloudflare.

     SECRE_CUENTAS="principal:5214421234567,segunda:5214427654321" \
     SECRE_CLAVE="una-contraseña-larga" \
     SECRE_SALA_LLAVE="…la llave de La Sala…" \
     node secre/correr.mjs

   La primera vez, cada cuenta saca un CÓDIGO de 8 letras (en la consola y en
   el panel): en el teléfono → WhatsApp → Dispositivos vinculados → Vincular
   con número de teléfono → se escribe el código. Después ya no se pide.

   Todo lo de Carlos (la sesión, sus chats, su configuración) vive en
   secre/datos/, que NUNCA entra al repo (.gitignore).
   ═════════════════════════════════════════════════════════════════════════ */
import fs from 'fs'; import path from 'path'; import http from 'http'; import crypto from 'crypto';
import { Secre, AYUDA, configBase } from './nucleo.mjs';
const FALSO = !!process.env.SECRE_FALSO;
const { ia } = await import(FALSO ? './falso.mjs' : './ia.mjs');

const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const DATOS = process.env.SECRE_DATOS || path.join(RAIZ, 'datos');
/* en un servidor (Railway y similares) el puerto lo pone el servidor en PORT */
const PUERTO = Number(process.env.SECRE_PUERTO) || Number(process.env.PORT) || 8790;
let CLAVE = process.env.SECRE_CLAVE || '';
if(!CLAVE){ CLAVE = crypto.randomBytes(9).toString('base64url'); console.log(`\n🔑 No pusiste SECRE_CLAVE. La contraseña del panel por esta vez es: ${CLAVE}\n`); }

/* «principal:5214421234567,segunda:5214427654321» */
const CUENTAS = (process.env.SECRE_CUENTAS || '').split(',').map(x => x.trim()).filter(Boolean).map(x => { const [id, tel] = x.split(':'); return { id: id.replace(/[^\w-]/g, ''), telefono: (tel || '').replace(/\D/g, '') }; });
if(!CUENTAS.length){ console.error('Falta SECRE_CUENTAS, por ejemplo: SECRE_CUENTAS="principal:5214421234567,segunda:5214427654321"'); process.exit(1); }

/* guardar en archivos: escribe a uno temporal y lo renombra, para que un apagón no deje el JSON a medias */
function almacenEn(dir){
  fs.mkdirSync(dir, { recursive: true });
  return {
    leer(k, d){ try{ return JSON.parse(fs.readFileSync(path.join(dir, k + '.json'), 'utf8')); }catch{ return d; } },
    guardar(k, v){ const f = path.join(dir, k + '.json'); fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 1)); fs.renameSync(f + '.tmp', f); },
  };
}

const vivas = {};     /* id → { secre, estado: { conectado, codigo, error }, transporte } */
const { conectar } = await import(FALSO ? './falso.mjs' : './whatsapp.mjs');
if(FALSO) console.log('🧪 Modo de prueba: nada sale a WhatsApp ni a la IA.');
/* En un servidor gratis (Render) el disco se borra al reiniciar: todo se guarda
   cifrado en La Sala (nube.mjs). En una compu propia, en secre/datos/. */
const NUBE = (!FALSO || process.env.SECRE_NUBE === 'si') && process.env.SECRE_NUBE !== 'no' && !!(process.env.SECRE_SALA_LLAVE || process.env.MAZI_LLAVE) && !!process.env.SECRE_CLAVE;
if(!FALSO && !NUBE) console.log('💾 Guardando en disco (secre/datos/). Para guardar en La Sala pon SECRE_SALA_LLAVE y SECRE_CLAVE.');
const cajones = {};
async function prender(c){
  const dir = path.join(DATOS, c.id);
  const v = vivas[c.id] = { estado: { conectado: false, error: 'Arrancando…' }, secre: null };
  let almacen = null, auth = null;
  if(NUBE){
    const { abrirCajon } = await import('./nube.mjs');
    const cajon = cajones[c.id] = await abrirCajon(c.id, { clave: CLAVE, llaveSala: process.env.SECRE_SALA_LLAVE || process.env.MAZI_LLAVE });
    if(cajon.aviso) v.estado.aviso = cajon.aviso;   /* aparte de `error`: conectar no lo borra */
    almacen = cajon.almacen; auth = cajon.auth;
  } else almacen = almacenEn(dir);
  /* el transporte llega después de conectar; mientras, el núcleo no manda nada */
  const puente = { yo: () => (v.transporte ? v.transporte.yo() : []), enviar: (j, t) => v.transporte.enviar(j, t),
    /* sin esto el rol nunca mandaba stickers: quizaSticker pregunta si existe y se callaba */
    enviarSticker: (j, b) => v.transporte.enviarSticker(j, b),
    /* los números de sus OTRAS cuentas: dos Secres no se contestan entre ellas */
    otrosYo: () => Object.entries(vivas).filter(([k, x]) => k !== c.id && x.transporte).flatMap(([, x]) => x.transporte.yo()),
    escribiendo: (j, ms) => v.transporte.escribiendo(j, ms), leido: (j) => v.transporte.leido(j) };
  v.secre = new Secre({ cuenta: c.id, transporte: puente, ia, almacen });
  /* con qué número se pide el código: el de SECRE_CUENTAS, o el que se eligió en el panel
     (en México WhatsApp puede tener la cuenta como 52… o como 521…) */
  v.almacen = almacen;
  const numero = () => (almacen.leer('vinculo', {}).tel) || c.telefono;
  const enchufar = async () => {
    v.transporte = await conectar({ dir: path.join(dir, 'sesion'), auth, telefono: numero,
      alMensaje: (m) => v.secre.alMensaje(m).catch(e => console.error(`[${c.id}]`, e.message)),
      alContactos: (l) => { try{ v.secre.cargarContactos(l); }catch(e){ console.error(`[${c.id}]`, e.message); } },
      alEstado: (e) => {
        v.estado = { ...v.estado, ...e };
        if(e.codigo){ console.log(`\n📱 [${c.id}] Código para vincular: ${e.codigo}\n   WhatsApp → Dispositivos vinculados → Vincular con número de teléfono\n`); v.estado.error = ''; }
        if(e.conectado){ console.log(`✅ [${c.id}] conectada`); v.estado.codigo = ''; v.estado.error = ''; }
        if(e.error) console.log(`⚠️  [${c.id}] ${e.error}`);
        /* te saliste desde el teléfono: sesión nueva y código nuevo, sin reiniciar nada */
        if(e.cerrada && NUBE){ auth = cajones[c.id].olvidarSesion(); setTimeout(() => enchufar().catch(err => console.error(err.message)), 2000); }
      } });
  };
  /* «Pedir otro código» del panel: suelta la conexión y la sesión a medias y empieza de cero */
  v.reenchufar = async () => {
    try{ await v.transporte?.cerrar(); }catch{}
    if(NUBE) auth = cajones[c.id].olvidarSesion();
    else fs.rmSync(path.join(dir, 'sesion'), { recursive: true, force: true });
    v.estado = { ...v.estado, conectado: false, codigo: '', error: 'Pidiendo un código nuevo…' };
    await enchufar();
  };
  await enchufar();
}
/* el reloj: cada 5 segundos cada cuenta revisa su cola, saludos y resumen */
setInterval(() => { for(const v of Object.values(vivas)) if(v.estado.conectado && v.secre) v.secre.tic().catch(e => console.error(e.message)); }, 5000);

/* ══ el panel ══════════════════════════════════════════════════════════════
   Una página para el teléfono, con contraseña. Desde la misma red de la casa:
   http://<ip-de-la-compu>:8790 · desde fuera, con Tailscale o similar (no se
   abre el puerto a internet). */
const sesiones = new Set();
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
const cuerpo = (req) => new Promise((si) => { let d = ''; req.on('data', x => { d += x; if(d.length > 200_000) req.destroy(); }); req.on('end', () => { try{ si(JSON.parse(d || '{}')); }catch{ si({}); } }); });
const galleta = (req) => (String(req.headers.cookie || '').match(/(?:^|;\s*)secre=([\w-]+)/) || [])[1] || '';
const intentos = new Map();

function vista(v, id){
  /* una cuenta que no pudo arrancar se enseña con su error, no rompe el panel */
  if(!v.secre) return { cuenta: id, conexion: v.estado, config: configBase(), chats: [], propuestas: [], pendientes: [], charla: [], registro: [], ahora: Date.now(), ayuda: AYUDA };
  const s = v.secre, c = s.config, e = s.estado;
  return {
    /* los stickers (imágenes) no viajan al panel en cada repaso: pesan y no se pintan */
    cuenta: s.cuenta, conexion: v.estado, config: { ...c, chats: Object.fromEntries(Object.entries(c.chats).map(([k, x]) => { const { stickers, ...r } = x; return [k, r]; })) }, deTurno: s.deTurno(),
    chats: Object.entries(c.chats).filter(([, x]) => x.nombre).map(([id, x]) => { const { stickers, ...resto } = x; return { id, ...resto, nStickers: (stickers || []).length, modoAhora: s.modo(id, '', !!x.grupo) }; }).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    propuestas: e.propuestas, pendientes: e.pendientes.filter(p => !p.hecho).concat(e.pendientes.filter(p => p.hecho).slice(-10)),
    charla: e.charla.slice(-60), registro: e.registro.slice(-60), ahora: Date.now(), ayuda: AYUDA,
  };
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if(url.pathname === '/' || url.pathname === '/index.html'){
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer' });
    return res.end(fs.readFileSync(path.join(RAIZ, 'panel.html')));
  }
  /* para que el servidor sepa que sigue vivo; no dice nada de nadie */
  if(url.pathname === '/salud'){ res.setHeader('access-control-allow-origin', '*'); return json(res, 200, { bien: true }); }   /* la Central pregunta si está prendida */
  if(url.pathname === '/api/entrar' && req.method === 'POST'){
    /* detrás del proxy del servidor, la IP de verdad viene en x-forwarded-for; 8 intentos fallidos cada 15 minutos */
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();
    const ahora = Date.now(), prev = intentos.get(ip);
    const n = (prev && ahora - prev.desde < 15 * 60_000 ? prev.n : 0) + 1;
    intentos.set(ip, { n, desde: prev && n > 1 ? prev.desde : ahora });
    if(n > 8) return json(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' });
    const b = await cuerpo(req);
    if(!igual(b.clave || '', CLAVE)) return json(res, 401, { error: 'Esa no es la contraseña.' });
    intentos.delete(ip);
    const tok = crypto.randomBytes(24).toString('base64url'); sesiones.add(tok);
    const segura = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `secre=${tok}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${segura}` });
    return res.end('{"bien":true}');
  }
  if(!url.pathname.startsWith('/api/')) return json(res, 404, { error: 'No existe.' });
  if(!sesiones.has(galleta(req))) return json(res, 401, { error: 'Entra con la contraseña.' });
  const [, , id, que] = url.pathname.split('/');
  if(id === 'cuentas') return json(res, 200, { cuentas: Object.entries(vivas).map(([k, v]) => ({ id: k, ...v.estado })) });
  const v = vivas[id]; if(!v) return json(res, 404, { error: 'No conozco esa cuenta.' });
  if(req.method === 'GET' && !que) return json(res, 200, vista(v, id));
  if(!v.secre) return json(res, 409, { error: v.estado.error || 'Esa cuenta todavía está arrancando.' });
  if(req.method !== 'POST') return json(res, 405, { error: 'Así no.' });
  const b = await cuerpo(req), s = v.secre;
  /* sólo en modo de prueba: hacer como que alguien escribió */
  if(FALSO && que === 'llega'){ await v.transporte.llega(b); return json(res, 200, { bien: true }); }
  if(que === 'numero'){
    if(v.estado.conectado) return json(res, 409, { error: 'Esa cuenta ya está vinculada.' });
    const tel = String(b.tel || '').replace(/\D/g, '');
    if(tel.length < 10 || tel.length > 15) return json(res, 400, { error: 'Ese número no se ve bien: lleva lada del país y sin espacios.' });
    v.almacen.guardar('vinculo', { tel });
    v.reenchufar().catch(e => { v.estado.error = e.message; });
    return json(res, 200, { bien: true });
  }
  if(!v.estado.conectado && (que === 'orden' || que === 'propuesta')) return json(res, 409, { error: 'Esa cuenta no está conectada a WhatsApp todavía.' });
  /* el botón «Cargar contactos»: la agenda y los grupos de WhatsApp */
  if(que === 'contactos'){
    if(!v.estado.conectado || !v.transporte || !v.transporte.cargarContactos) return json(res, 409, { error: 'Esa cuenta no está conectada a WhatsApp todavía.' });
    try{ const r = await v.transporte.cargarContactos(); return json(res, 200, { bien: true, ...r, total: Object.values(s.config.chats).filter(x => x.nombre).length }); }
    catch(e){ return json(res, 502, { error: 'WhatsApp no me dio los contactos: ' + e.message }); }
  }
  /* cambiar el modo de muchos chats de un toque (los grupos, o los que se vean filtrados) */
  if(que === 'modos'){
    const ids = Array.isArray(b.ids) ? b.ids.slice(0, 2000) : [];
    if(!['', 'borrador', 'callado', 'auto', 'rol'].includes(b.modo)) return json(res, 400, { error: 'Modo raro.' });
    let n = 0;
    for(const id of ids){ const c = s.config.chats[id]; if(!c) continue; if(b.modo === 'rol' && !c.grupo) continue; c.rol = b.modo === 'rol'; c.modo = b.modo === 'rol' ? 'auto' : b.modo; n++; }
    if(b.porDefectoGrupos !== undefined && ['borrador', 'callado'].includes(b.porDefectoGrupos)) s.config.grupos = b.porDefectoGrupos;
    s.guardar(); return json(res, 200, { bien: true, n });
  }
  /* el botón «Comunidad de rol»: qué comunidades hay y guardar una */
  if(que === 'comunidades'){
    if(!v.estado.conectado || !v.transporte || !v.transporte.comunidades) return json(res, 409, { error: 'Esa cuenta no está conectada a WhatsApp todavía.' });
    try{ return json(res, 200, { comunidades: await v.transporte.comunidades(), guardadas: s.config.comunidades || {} }); }
    catch(e){ return json(res, 502, { error: 'WhatsApp no me dio las comunidades: ' + e.message }); }
  }
  if(que === 'comunidad'){
    const hecho = s.ponerComunidad({ id: String(b.id || ''), nombre: b.nombre, grupos: Array.isArray(b.grupos) ? b.grupos : [], activos: Array.isArray(b.activos) ? b.activos : [],
      personaje: b.personaje, mundo: b.mundo, marca: b.marca, instrucciones: b.instrucciones });
    return json(res, hecho ? 200 : 400, hecho ? { bien: true, hecho } : { error: 'Esa no es una comunidad.' });
  }
  if(que === 'accion'){ const hecho = s.aplicar(b); s.guardar(); return json(res, hecho ? 200 : 400, hecho ? { bien: true, hecho } : { error: 'No pude aplicar eso.' }); }
  /* hablarle a Secre desde el panel es lo mismo que escribirle en el chat propio */
  if(que === 'orden'){ await s.orden(String(b.texto || '').slice(0, 2000)); return json(res, 200, { bien: true }); }
  if(que === 'propuesta'){
    const n = +b.n;
    await s.orden(b.todas ? 'todas' : b.tirar ? `x${n}` : (b.texto ? `${n} ${String(b.texto).slice(0, 4000)}` : `${n}`));
    return json(res, 200, { bien: true });
  }
  if(que === 'pendiente'){ const p = s.estado.pendientes.find(x => x.n === +b.n); if(p){ p.hecho = !!b.hecho; s.guardar(); } return json(res, 200, { bien: !!p }); }
  if(que === 'chat'){
    const c = s.config.chats[b.id]; if(!c) return json(res, 404, { error: 'No conozco ese chat.' });
    if(b.modo !== undefined){
      if(!['', 'borrador', 'callado', 'auto', 'rol'].includes(b.modo)) return json(res, 400, { error: 'Modo raro.' });
      if(b.modo === 'rol' && !c.grupo) return json(res, 400, { error: 'El rol es para grupos.' });
      /* un grupo en automático lo prende Carlos aquí, con su nombre a la vista: eso es autorizarlo */
      c.rol = b.modo === 'rol'; c.modo = b.modo === 'rol' ? 'auto' : b.modo;
    }
    if(b.personaje !== undefined) c.personaje = String(b.personaje).slice(0, 800);
    if(b.mundo !== undefined) c.mundo = String(b.mundo).slice(0, 4000);
    if(b.marca !== undefined){ const mk = String(b.marca).trim().slice(0, 30); if(mk) c.marca = mk; else delete c.marca; }
    if(b.nota !== undefined) c.nota = String(b.nota).slice(0, 500);
    if(b.etiquetas !== undefined) c.etiquetas = String(b.etiquetas).split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 10);
    s.guardar(); return json(res, 200, { bien: true });
  }
  return json(res, 404, { error: 'No existe.' });
}).listen(PUERTO, '0.0.0.0', async () => {
  console.log(`\n🗂  Panel de Secre: http://localhost:${PUERTO}  (desde el teléfono, con la IP de esta máquina)\n`);
  /* el panel primero (el servidor revisa /salud al arrancar), las cuentas después */
  for(const c of CUENTAS){
    try{ await prender(c); }
    catch(e){ console.error(`[${c.id}] no arrancó: ${e.message}`); vivas[c.id] = vivas[c.id] || { estado: {}, secre: null }; vivas[c.id].estado = { conectado: false, error: e.message }; }
  }
});

/* Render gratis se duerme a los 15 minutos sin visitas: Secre se visita sola cada 10 */
if(process.env.RENDER_EXTERNAL_URL) setInterval(() => fetch(process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '') + '/salud').catch(() => {}), 10 * 60_000).unref();
/* al apagarse (reinicio del servidor), subir lo último antes de irse */
for(const senal of ['SIGTERM', 'SIGINT']) process.on(senal, async () => {
  await Promise.race([Promise.all(Object.values(cajones).map(c => c.subir())), new Promise(r => setTimeout(r, 8000))]);
  process.exit(0);
});
