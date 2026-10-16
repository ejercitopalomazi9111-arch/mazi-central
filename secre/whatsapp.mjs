/* ══════════════════════════════════════════════════════════════════════════
   SECRE · el adaptador de WhatsApp (Baileys 7.0.0-rc14, MIT, fijado)
   ──────────────────────────────────────────────────────────────────────────
   Habla con WhatsApp como un «dispositivo vinculado», igual que WhatsApp Web.
   Es NO oficial: WhatsApp puede bloquear el número (tienda/PLAN.md §9). Para
   bajar el riesgo, Secre sólo le escribe a Carlos (a su chat propio) y, a
   otra persona, nada más lo que él aprueba con un número.

   Regla §2 del CLAUDE.md: todo lo de WhatsApp vive AQUÍ. El núcleo no sabe
   qué librería hay abajo; si mañana conviene otra, se cambia este archivo.

   ⚠ Nada de paquetes «anti-bloqueo»: en abril de 2026 uno con 56 mil
   descargas robaba sesiones y mensajes. Aquí sólo va la librería principal.
   ═════════════════════════════════════════════════════════════════════════ */
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion,
  jidNormalizedUser, isJidGroup, normalizeMessageContent, getContentType } from 'baileys';
import pino from 'pino';

/* el texto de un mensaje, o una etiqueta si no es texto (para que la IA sepa qué llegó) */
export function textoDe(msg){
  const c = normalizeMessageContent(msg.message);
  if(!c) return '';
  const tipo = getContentType(c);
  if(tipo === 'conversation') return c.conversation || '';
  if(tipo === 'extendedTextMessage') return (c.extendedTextMessage && c.extendedTextMessage.text) || '';
  const pie = (x) => (x && x.caption) ? ' ' + x.caption : '';
  switch(tipo){
    case 'imageMessage': return '[foto]' + pie(c.imageMessage);
    case 'videoMessage': return '[video]' + pie(c.videoMessage);
    case 'audioMessage': return c.audioMessage && c.audioMessage.ptt ? '[nota de voz]' : '[audio]';
    case 'stickerMessage': return '[sticker]';
    case 'documentMessage': return '[documento] ' + ((c.documentMessage && c.documentMessage.fileName) || '');
    case 'locationMessage': return '[ubicación]';
    case 'contactMessage': return '[contacto]';
    case 'reactionMessage': return '';   /* las reacciones no piden respuesta */
    case 'protocolMessage': return '';   /* borrados, ediciones de sistema */
    default: return '';
  }
}

/* conecta UNA cuenta. Devuelve el transporte que usa el núcleo.
   alMensaje(m) recibe { id, chat, de, nombre, texto, mio, grupo, t }
   alEstado(e) recibe { conectado, codigo, error } para el panel */
export async function conectar({ dir, auth, telefono, alMensaje, alEstado = () => {}, registro = 'warn' }){
  const logger = pino({ level: registro });
  /* `auth` viene de nube.mjs cuando el disco no sobrevive a un reinicio (servidor gratis) */
  const { state, saveCreds } = auth || await useMultiFileAuthState(dir);
  let sock = null, yoJids = [], vivo = true;
  /* `registered` lo pone la vinculación con código; `account`, cualquier vinculación que cuajó */
  const vinculada = () => !!(state.creds.registered || state.creds.account);
  const numero = () => String(typeof telefono === 'function' ? telefono() : telefono || '').replace(/\D/g, '');
  const ultimas = new Map();          /* jid → llaves de lo último que llegó, para marcar leído */
  const grupos = new Map();           /* jid → nombre del grupo */

  async function arrancar(){
    /* ⚠ requestPairingCode apunta el número en creds.me ANTES de que el teléfono
       acepte. Si ese intento no se completa, la siguiente conexión trae creds.me
       y Baileys intenta ENTRAR en vez de VINCULARSE: WhatsApp contesta 401 y
       todos los códigos que siguen nacen muertos. Reproducido el 16 de octubre
       contra WhatsApp de verdad («No se pudo vincular el dispositivo» de Carlos). */
    if(!state.creds.registered && !state.creds.account && state.creds.me){
      delete state.creds.me; delete state.creds.pairingCode;
      try{ await saveCreds(); }catch{}
    }
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
    let pedido = false;                  /* un código por conexión: el de una conexión vieja ya no sirve */
    sock = makeWASocket({ ...(version ? { version } : {}), auth: state, logger,
      browser: Browsers.macOS('Chrome'), /* «Chrome (Mac OS)»: la forma que WhatsApp acepta al vincular con código */
      qrTimeout: 60_000,                 /* cada código vive ~6 min en vez de ~2: da tiempo de escribirlo */
      markOnlineOnConnect: false,        /* que no salga «en línea» todo el día por el bot */
      syncFullHistory: false });
    const este = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u) => {
      /* el código se pide cuando llega `qr`: ahí el servidor ya terminó el saludo.
         Pedirlo en 'connecting' (como antes) truena con «Connection Closed». */
      if(u.qr && !vinculada() && numero() && !pedido){
        pedido = true;
        try{
          const codigo = await este.requestPairingCode(numero());
          alEstado({ conectado: false, codigo: codigo.match(/.{1,4}/g).join('-'), para: numero(), desde: Date.now() });
        }catch(e){ alEstado({ conectado: false, error: 'No pude pedir el código: ' + e.message }); }
      }
      if(u.connection === 'open'){
        const me = state.creds.me || {};
        yoJids = [me.id, me.lid].filter(Boolean).map(jidNormalizedUser);
        alEstado({ conectado: true, yo: yoJids[0] });
      }
      if(u.connection === 'close'){
        const codigo = u.lastDisconnect && u.lastDisconnect.error && u.lastDisconnect.error.output && u.lastDisconnect.error.output.statusCode;
        /* sin vincular, un 401 es un intento de vinculación que no cuajó, no «te saliste» */
        if(codigo === DisconnectReason.loggedOut && vinculada()){ vivo = false; alEstado({ conectado: false, cerrada: true, error: 'WhatsApp cerró la sesión (te saliste desde el teléfono). Hay que vincular otra vez.' }); return; }
        if(!vivo || este !== sock) return;   /* se cerró a propósito o ya hay otra conexión */
        alEstado({ conectado: false, codigo: '', error: vinculada() ? 'Se cortó; reconectando…' : 'Pidiendo un código nuevo…' });
        setTimeout(() => arrancar().catch(e => alEstado({ conectado: false, error: e.message })), 3000);
      }
    });
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for(const msg of messages || []){
        try{
          const k = msg.key || {};
          if(!k.remoteJid || k.remoteJid === 'status@broadcast') continue;
          const t = (Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000;
          /* lo que baja del historial al vincular no es nuevo */
          if(type !== 'notify' && Date.now() - t > 2 * 60_000) continue;
          const texto = textoDe(msg);
          if(!texto) continue;
          const chat = jidNormalizedUser(k.remoteJid);
          const grupo = isJidGroup(chat);
          if(!k.fromMe) ultimas.set(chat, [...(ultimas.get(chat) || []), k].slice(-10));
          let nombre = msg.pushName || '';
          if(grupo){
            if(!grupos.has(chat)) grupos.set(chat, (await sock.groupMetadata(chat).catch(() => ({}))).subject || '');
            nombre = k.fromMe ? '' : (msg.pushName || '');
          }
          await alMensaje({ id: k.id, chat, de: grupo ? (k.participantAlt || k.participant || '') : chat, nombre, nombreChat: grupo ? grupos.get(chat) : nombre, texto, mio: !!k.fromMe, grupo, t });
        }catch(e){ logger.warn({ err: e.message }, 'secre: mensaje que no pude leer'); }
      }
    });
  }
  await arrancar();

  return {
    yo: () => yoJids,
    async enviar(jid, texto){ const r = await sock.sendMessage(jid, { text: texto }); return r && r.key && r.key.id; },
    /* «escribiendo…» un rato proporcional al largo, como una persona */
    async escribiendo(jid, ms){
      await sock.sendPresenceUpdate('composing', jid).catch(() => {});
      await new Promise(r => setTimeout(r, Math.min(ms, 8000)));
      await sock.sendPresenceUpdate('paused', jid).catch(() => {});
    },
    async leido(jid){ const ks = ultimas.get(jid); if(ks && ks.length){ await sock.readMessages(ks).catch(() => {}); ultimas.delete(jid); } },
    async cerrar(){ vivo = false; try{ sock.end(undefined); }catch{} },
    /* para las pruebas: cortar la conexión como la corta la red o WhatsApp, sin apagar a Secre */
    _soltar(){ sock.end(new Error('corte de prueba')); },
  };
}
