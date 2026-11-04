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
  jidNormalizedUser, isJidGroup, normalizeMessageContent, getContentType, downloadMediaMessage, generateMessageIDV2 } from 'baileys';
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
export async function conectar({ dir, auth, telefono, alMensaje, alEstado = () => {}, alContactos = () => {}, alLlamada = () => {}, registro = 'warn' }){
  const logger = pino({ level: registro });
  /* `auth` viene de nube.mjs cuando el disco no sobrevive a un reinicio (servidor gratis) */
  const { state, saveCreds } = auth || await useMultiFileAuthState(dir);
  let sock = null, yoJids = [], vivo = true;
  /* `registered` lo pone la vinculación con código; `account`, cualquier vinculación que cuajó */
  const vinculada = () => !!(state.creds.registered || state.creds.account);
  const numero = () => String(typeof telefono === 'function' ? telefono() : telefono || '').replace(/\D/g, '');
  const ultimas = new Map();          /* jid → llaves de lo último que llegó, para marcar leído */
  const grupos = new Map();           /* jid → nombre del grupo */
  /* el historial viejo de un chat (las 1,000 fotos del grupo de Mayoreo, 4 nov): el mensaje más
     viejo que se ha visto de cada chat es el ancla para pedirle a WhatsApp los de antes */
  /* chat → los mensajes más viejos vistos (hasta 30), del más viejo al más nuevo. Varios, no uno: si el
     ancla se borra («escribe un punto y bórralo»), el teléfono ya no la encuentra y no contesta nada */
  const viejos = new Map();
  const historicos = new Set();       /* chats cuyo historial sí se procesa */
  const recibidos = new Map();        /* chat → cuántos mensajes viejos han llegado (para el latido) */
  const verViejo = (chat, k, t) => {
    if(!k || !k.id || !t) return;
    const l = viejos.get(chat) || [];
    if(l.some(x => x.key.id === k.id)) return;
    l.push({ key: { remoteJid: k.remoteJid, id: k.id, fromMe: !!k.fromMe, ...(k.participant ? { participant: k.participant } : {}) }, t });
    l.sort((a, b) => a.t - b.t); viejos.set(chat, l.slice(0, 30));
  };
  const borrado = (chat, id) => { const l = viejos.get(chat); if(l) viejos.set(chat, l.filter(x => x.key.id !== id)); };
  /* ⚠ los ids de lo que manda Secre, apuntados ANTES de mandarlo. Baileys avisa
     de un mensaje propio con un process.nextTick que puede llegar antes de que
     sendMessage regrese: sin esto, la copia de lo que mandó Secre se leía como
     si Carlos hubiera escrito a mano y Secre se callaba 15 min en ese chat
     («a veces responde y a veces no», 16 de octubre) */
  const propios = new Set();
  const idPropio = () => { const id = generateMessageIDV2(sock && sock.user && sock.user.id); propios.add(id); if(propios.size > 500) propios.delete(propios.values().next().value); return id; };

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
    /* los contactos y grupos de Carlos, para que Secre los conozca aunque no le
       hayan escrito (16 de octubre: «carga todos los contactos a Secre») */
    /* ⚠ 4 nov (Carlos: «yo a mis contactos los tengo guardados de una manera y él los tiene con el
       nombre base de WhatsApp»): `name` es como ÉL lo guardó en su agenda; `notify` es el que la
       persona se puso. Se mandan los dos y el núcleo prefiere el de la agenda siempre. */
    const deContacto = (x) => ({ id: x.phoneNumber || x.id, lid: x.lid || (String(x.id).endsWith('@lid') ? x.id : ''), nombre: x.name || x.notify || x.verifiedName || x.username || '', guardado: !!x.name, alias: x.notify || x.verifiedName || '' });
    const avisarContactos = (lista) => { const l = (lista || []).map(deContacto).filter(x => x.id && x.nombre); if(l.length) try{ alContactos(l); }catch{} };
    sock.ev.on('contacts.upsert', avisarContactos);
    sock.ev.on('contacts.update', avisarContactos);
    sock.ev.on('messaging-history.set', ({ contacts }) => avisarContactos(contacts));
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
        /* los grupos donde está, al conectar: así salen en el panel desde el principio */
        este.groupFetchAllParticipating().then(gs => { for(const g of Object.values(gs)) grupos.set(g.id, g.subject || '');
          try{ alContactos(Object.values(gs).filter(g => !g.isCommunity && !g.isCommunityAnnounce).map(g => ({ id: g.id, nombre: g.subject || '', grupo: true }))); }catch{} }).catch(() => {});
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
    /* llamadas de WhatsApp: Baileys no puede contestarlas con voz (sólo rechazar). Se rechaza
       y el núcleo le escribe a quien llamó para saber quién es y qué quiere (4 nov) */
    sock.ev.on('call', async (llamadas) => {
      for(const c of llamadas || []){
        if(c.status !== 'offer') continue;
        try{ await sock.rejectCall(c.id, c.from); }catch{}
        try{ await alLlamada({ de: jidNormalizedUser(c.from), video: !!c.isVideo, t: Date.now() }); }catch{}
      }
    });
    /* lo que pidió el historial (pedirHistorial) llega aquí, viejo; sólo de los chats pedidos */
    sock.ev.on('messaging-history.set', async ({ messages, syncType }) => {
      if(historicos.size) console.log(`[historial] llegaron ${(messages || []).length} mensajes viejos (tipo ${syncType}); de los grupos pedidos: ${(messages || []).filter(x => x.key && historicos.has(jidNormalizedUser(x.key.remoteJid))).length}`);
      const ms = (messages || []).filter(x => x.key && x.key.remoteJid).sort((a, b) => Number(a.messageTimestamp || 0) - Number(b.messageTimestamp || 0));
      for(const msg of ms){
        const chat = jidNormalizedUser(msg.key.remoteJid), t = (Number(msg.messageTimestamp) || 0) * 1000;
        if(t) verViejo(chat, msg.key, t);
        if(historicos.has(chat)){ recibidos.set(chat, (recibidos.get(chat) || 0) + 1); await procesar(msg, true); }
      }
    });
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for(const msg of messages || []){
        const k = msg.key || {}, t = (Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000;
        /* un mensaje borrado «para todos» ya no sirve de ancla */
        const pm = msg.message && msg.message.protocolMessage;
        if(pm && pm.type === 0 && pm.key && k.remoteJid){ borrado(jidNormalizedUser(k.remoteJid), pm.key.id); continue; }
        if(k.remoteJid && !pm) verViejo(jidNormalizedUser(k.remoteJid), k, t);
        /* lo que baja del historial al vincular no es nuevo (salvo de un chat cuyo historial se pidió) */
        const viejo = type !== 'notify' && Date.now() - t > 2 * 60_000;
        if(viejo && !(k.remoteJid && historicos.has(jidNormalizedUser(k.remoteJid)))) continue;
        await procesar(msg, viejo);
      }
    });
    async function procesar(msg, historico){
        try{
          const k = msg.key || {};
          if(k.fromMe && propios.has(k.id)) return;   /* lo mandó Secre, no Carlos */
          if(!k.remoteJid || k.remoteJid === 'status@broadcast') return;
          const t = (Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000;
          const texto = textoDe(msg);
          if(!texto) return;
          /* WhatsApp ya manda muchos chats con un LID (un id que esconde el número). La agenda
             viene por número, así que se usa el número cuando Baileys lo trae (remoteJidAlt) */
          const alt = k.remoteJidAlt && /@s\.whatsapp\.net$/.test(k.remoteJidAlt) ? k.remoteJidAlt : '';
          const chat = jidNormalizedUser(String(k.remoteJid).endsWith('@lid') && alt ? alt : k.remoteJid);
          const grupo = isJidGroup(chat);
          const cont = normalizeMessageContent(msg.message) || {};
          /* una foto: no se baja hasta que alguien la necesita (Mayoreo, o preguntan precio de una) */
          const im = cont.imageMessage;
          /* reuploadRequest: una foto vieja ya no está en el servidor de WhatsApp y se le pide al teléfono que la vuelva a subir */
          const imagen = im ? { mime: im.mimetype || 'image/jpeg', pie: im.caption || '', bajar: () => downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage }) } : null;
          /* si contestan citando un mensaje (la foto de un producto), cuál era */
          const ctx = (cont[getContentType(cont)] || {}).contextInfo || {};
          const citado = ctx.stanzaId || '';
          if(!k.fromMe && !historico) ultimas.set(chat, [...(ultimas.get(chat) || []), k].slice(-10));
          let nombre = msg.pushName || '';
          if(grupo){
            if(!grupos.has(chat)) grupos.set(chat, (await sock.groupMetadata(chat).catch(() => ({}))).subject || '');
            nombre = k.fromMe ? '' : (msg.pushName || '');
          }
          /* los stickers que manda CARLOS en un grupo se guardan, para que en el rol
             los use su personaje (Carlos, 16 de octubre: «de vez en cuando usamos stickers») */
          let sticker = null;
          if(grupo && k.fromMe && texto === '[sticker]' && !historico){
            const buf = await downloadMediaMessage(msg, 'buffer', {}).catch(() => null);
            if(buf && buf.length <= 100_000) sticker = { b64: buf.toString('base64'), animado: !!(normalizeMessageContent(msg.message).stickerMessage || {}).isAnimated };
          }
          /* una nota de voz (fuera de grupos) se baja para que Secre la oiga; hasta 8 MB */
          let audio = null;
          const au = !historico && !grupo && /^\[(nota de voz|audio)\]$/.test(texto) && normalizeMessageContent(msg.message).audioMessage;
          if(au && Number(au.fileLength || 0) <= 8_000_000){
            const buf = await downloadMediaMessage(msg, 'buffer', {}).catch(() => null);
            if(buf && buf.length <= 8_000_000) audio = { b64: buf.toString('base64'), mime: au.mimetype || 'audio/ogg', segundos: Number(au.seconds || 0) };
          }
          await alMensaje({ id: k.id, chat, de: grupo ? (k.participantAlt || k.participant || '') : chat, nombre, nombreChat: grupo ? grupos.get(chat) : nombre, texto, mio: !!k.fromMe, grupo, t, sticker, audio, imagen, citado, historico: !!historico, lid: String(k.remoteJid).endsWith('@lid') ? jidNormalizedUser(k.remoteJid) : '' });
        }catch(e){ logger.warn({ err: e.message }, 'secre: mensaje que no pude leer'); }
    }
  }
  await arrancar();

  return {
    yo: () => yoJids,
    async enviar(jid, texto){ const r = await sock.sendMessage(jid, { text: texto }, { messageId: idPropio() }); return r && r.key && r.key.id; },
    /* nota de voz: OGG/Opus mono, con ptt para que salga con su onda y su micrófono */
    async enviarAudio(jid, ogg, segundos){ const r = await sock.sendMessage(jid, { audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: true, ...(segundos ? { seconds: segundos } : {}) }, { messageId: idPropio() }); return r && r.key && r.key.id; },
    /* una foto con su pie (las del banco de imágenes) */
    async enviarImagen(jid, buf, mime, pie){ const r = await sock.sendMessage(jid, { image: buf, mimetype: mime || 'image/jpeg', ...(pie ? { caption: pie } : {}) }, { messageId: idPropio() }); return r && r.key && r.key.id; },
    async grabando(jid, ms){ try{ await sock.sendPresenceUpdate('recording', jid); await new Promise(r => setTimeout(r, ms)); await sock.sendPresenceUpdate('paused', jid); }catch{} },
    async enviarSticker(jid, b64){ const r = await sock.sendMessage(jid, { sticker: Buffer.from(b64, 'base64') }, { messageId: idPropio() }); return r && r.key && r.key.id; },
    /* las comunidades de WhatsApp y sus grupos, para el botón «Comunidad de rol» del panel.
       El grupo de avisos de la comunidad no es para jugar: se deja fuera. */
    /* el botón «Cargar contactos»: los grupos y, de la agenda de WhatsApp, los
       contactos guardados (se vuelven a pedir; llegan por contacts.upsert) */
    /* los grupos donde está la cuenta, con su nombre (para encontrar «Shopy go mayoreo 1» por nombre) */
    async grupos(){ const gs = Object.values(await sock.groupFetchAllParticipating()); for(const g of gs) grupos.set(g.id, g.subject || ''); return gs.map(g => ({ id: g.id, nombre: g.subject || '' })); },
    /* pide a WhatsApp (al teléfono) los n mensajes de antes del más viejo que se ha visto. false = sin ancla todavía */
    ancla: (chat) => (viejos.get(chat) || [])[0] || null,
    /* saltar: el ancla de antes no dio nada (borrada o rara): se usa la siguiente. seg: el tiempo en segundos
       (el campo dice «Ms», el ejemplo de Baileys manda segundos; se prueban los dos) */
    async pedirHistorial(chat, n = 50, ancla = null, { saltar = false, seg = false } = {}){
      historicos.add(chat);
      if(ancla && ancla.key && !(viejos.get(chat) || []).length) viejos.set(chat, [ancla]);
      let l = viejos.get(chat) || [];
      if(saltar && l.length > 1){ l = l.slice(1); viejos.set(chat, l); }
      const v = l[0]; if(!v) return false;
      console.log(`[historial] pido ${Math.min(50, n)} mensajes antes del ${new Date(v.t).toISOString()} (ancla ${l.length} de ${l.length}, ${seg ? 'segundos' : 'milisegundos'}${saltar ? ', ancla nueva' : ''})`);
      await sock.fetchMessageHistory(Math.min(50, n), v.key, seg ? Math.floor(v.t / 1000) : v.t);
      return true;
    },
    masViejo: (chat) => ((viejos.get(chat) || [])[0] || {}).t || 0,
    recibidos: (chat) => recibidos.get(chat) || 0,
    /* ¿ese número tiene WhatsApp? regresa su jid o '' (52 + 10 dígitos) */
    async existe(tel){ const d = String(tel || '').replace(/\D/g, '').replace(/^(?:52)?1?(\d{10})$/, '52$1'); if(d.length !== 12) return ''; const [r] = await sock.onWhatsApp(d).catch(() => []); return r && r.exists ? jidNormalizedUser(r.jid) : ''; },
    async cargarContactos(){
      const gs = Object.values(await sock.groupFetchAllParticipating()).filter(g => !g.isCommunity && !g.isCommunityAnnounce);
      try{ alContactos(gs.map(g => ({ id: g.id, nombre: g.subject || '', grupo: true }))); }catch{}
      let personas = 0;
      const contar = (l) => { personas += (l || []).length; };
      sock.ev.on('contacts.upsert', contar);
      try{ await sock.resyncAppState(['critical_unblock_low'], true); }catch{}
      await new Promise(r => setTimeout(r, 2500));
      sock.ev.off('contacts.upsert', contar);
      return { grupos: gs.length, personas };
    },
    async comunidades(){
      const todos = Object.values(await sock.groupFetchAllParticipating());
      const coms = new Map();
      for(const g of todos) if(g.isCommunity) coms.set(g.id, { id: g.id, nombre: g.subject || '', grupos: [] });
      for(const g of todos){
        if(!g.linkedParent || g.isCommunityAnnounce) continue;
        if(!coms.has(g.linkedParent)){
          const p = await sock.groupMetadata(g.linkedParent).catch(() => ({}));
          coms.set(g.linkedParent, { id: g.linkedParent, nombre: p.subject || 'Comunidad sin nombre', grupos: [] });
        }
        coms.get(g.linkedParent).grupos.push({ id: g.id, nombre: g.subject || '' });
      }
      return [...coms.values()].map(c => ({ ...c, grupos: c.grupos.sort((a, b) => a.nombre.localeCompare(b.nombre)) }));
    },
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
