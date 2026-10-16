/* ══════════════════════════════════════════════════════════════════════════
   SECRE · guardar todo en La Sala, cifrado
   ──────────────────────────────────────────────────────────────────────────
   En un servidor gratis (Render) el disco se borra en cada reinicio. Sin esto,
   cada reinicio sería volver a vincular WhatsApp y perder la configuración.
   Carlos: «no vamos a gastar un peso» — y La Sala ya es suya y ya es gratis.

   Todo va CIFRADO aquí (AES-256-GCM con una llave sacada de SECRE_CLAVE):
   La Sala guarda bytes que no puede leer. Si se cambia SECRE_CLAVE, lo
   guardado ya no se abre y hay que vincular de nuevo (se avisa en el panel).

   Un solo paquete por cuenta: { config, estado, auth }. Se sube a los pocos
   segundos de un cambio de la sesión de WhatsApp (lo que no puede perderse)
   y cada 30 s si cambió algo más; y al apagarse.
   ═════════════════════════════════════════════════════════════════════════ */
import crypto from 'crypto';
import { initAuthCreds, BufferJSON, proto } from 'baileys';

const SALA = (process.env.SECRE_SALA_URL || 'https://sala.palomazi9111.workers.dev').replace(/\/+$/, '');
const SALA_NOMBRE = process.env.SECRE_SALA || 'GRUPAZ';

export function llaveDe(clave){ return crypto.scryptSync(String(clave), 'secre-mazi-v1', 32); }
export function cifrar(texto, llave){
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', llave, iv);
  const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return 'v1.' + Buffer.concat([iv, c.getAuthTag(), datos]).toString('base64');
}
export function descifrar(caja, llave){
  if(!caja || !caja.startsWith('v1.')) throw new Error('formato desconocido');
  const b = Buffer.from(caja.slice(3), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', llave, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}

/* la sesión de WhatsApp en memoria, con la misma forma que useMultiFileAuthState */
export function authEnMemoria(guardada, alCambiar){
  const datos = guardada || { creds: initAuthCreds(), keys: {} };
  const state = {
    creds: datos.creds,
    keys: {
      async get(tipo, ids){
        const salida = {};
        for(const id of ids){
          let v = datos.keys[tipo] && datos.keys[tipo][id];
          if(v && tipo === 'app-state-sync-key') v = proto.Message.AppStateSyncKeyData.fromObject(v);
          if(v) salida[id] = v;
        }
        return salida;
      },
      async set(cambios){
        for(const tipo in cambios){
          datos.keys[tipo] = datos.keys[tipo] || {};
          for(const id in cambios[tipo]){
            const v = cambios[tipo][id];
            if(v) datos.keys[tipo][id] = v; else delete datos.keys[tipo][id];
          }
        }
        alCambiar(true);
      },
    },
  };
  return { state, saveCreds: async () => alCambiar(true), foto: () => ({ creds: state.creds, keys: datos.keys }) };
}

/* el cajón de una cuenta: baja lo guardado al arrancar y sube los cambios */
export async function abrirCajon(cuenta, { clave, llaveSala, registro = console }){
  const llave = llaveDe(clave);
  const url = `${SALA}/api/sala/${SALA_NOMBRE}/secre`;
  const cabeceras = { 'content-type': 'application/json', 'X-Llave': llaveSala };
  let guardado = null, aviso = '';
  for(let intento = 1; intento <= 5; intento++){
    try{
      const r = await fetch(`${url}?k=${encodeURIComponent(cuenta)}`, { headers: cabeceras, signal: AbortSignal.timeout(30_000) });
      const j = await r.json().catch(() => ({}));
      if(!r.ok) throw new Error(j.error || `La Sala contestó ${r.status}`);
      if(j.datos){
        try{ guardado = JSON.parse(descifrar(j.datos, llave), BufferJSON.reviver); }
        catch{ aviso = 'Lo guardado no se pudo abrir (¿cambió SECRE_CLAVE?). Empiezo de cero: hay que vincular otra vez.'; }
      }
      break;
    }catch(e){
      /* sin La Sala no se arranca: arrancar vacío pisaría lo guardado al primer cambio */
      if(intento === 5) throw new Error('No pude leer lo guardado en La Sala: ' + e.message);
      await new Promise(r => setTimeout(r, intento * 3000));
    }
  }
  const paquete = { config: (guardado && guardado.config) || {}, estado: (guardado && guardado.estado) || {} };
  let sucio = false, urgente = false, subiendo = null, auth = null;
  const subir = async () => {
    if(!sucio || subiendo) return subiendo;
    sucio = false; urgente = false;
    const cuerpo = JSON.stringify({ config: paquete.config, estado: paquete.estado, auth: auth ? auth.foto() : null }, BufferJSON.replacer);
    subiendo = fetch(url, { method: 'POST', headers: cabeceras, body: JSON.stringify({ k: cuenta, datos: cifrar(cuerpo, llave) }), signal: AbortSignal.timeout(60_000) })
      .then(async r => { if(!r.ok) throw new Error(((await r.json().catch(() => ({}))).error) || `La Sala contestó ${r.status}`); })
      .catch(e => { sucio = true; registro.error(`[${cuenta}] no pude guardar en La Sala: ${e.message}`); })
      .finally(() => { subiendo = null; });
    return subiendo;
  };
  const cambio = (esUrgente) => { sucio = true; if(esUrgente && !urgente){ urgente = true; setTimeout(subir, 3000); } };
  setInterval(subir, 30_000).unref();
  auth = authEnMemoria(guardado && guardado.auth, cambio);
  return {
    aviso,
    almacen: { leer: (k, d) => (k in paquete && Object.keys(paquete[k]).length ? paquete[k] : d), guardar: (k, v) => { paquete[k] = v; cambio(false); } },
    auth,
    subir: async () => { sucio = true; await subir(); if(subiendo) await subiendo; },
    olvidarSesion(){ auth = authEnMemoria(null, cambio); cambio(true); return auth; },
  };
}
