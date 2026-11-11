/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL SERVIDOR (Cloudflare Worker + un Durable Object)
   ───────────────────────────────────────────────────────────────────────────
   Las rutas están en ../RUTAS.md: es el contrato con el centro de operaciones
   que hace Godines. Si se cambia una ruta, se cambia allá primero.

   Secretos (wrangler secret put, NUNCA en el repo):
     ANTHROPIC_API_KEY · META_APP_SECRET · META_VERIFY_TOKEN · WA_TOKEN ·
     META_PAGE_TOKEN · LLAVE_PANEL
   Variables: WA_PHONE_ID · IG_ID · FB_PAGE_ID · GRAPH_VERSION · DUENO_WA ·
     MODELO_IA · ESFUERZO_IA · ORIGENES
   ═══════════════════════════════════════════════════════════════════════════ */
import { DurableObject } from 'cloudflare:workers';
import { Oficina } from './oficina.js';
import { firmaValida, leerAviso, enviar } from './meta.js';
import { pensar } from './cerebro.js';
import { cotizar } from './cotizador.js';

const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...h } });

export default {
  async fetch(req, env, ctx){
    const url = new URL(req.url), ruta = url.pathname;
    const origen = req.headers.get('origin');
    const cors = origen && (env.ORIGENES || '').split(',').includes(origen)
      ? { 'access-control-allow-origin': origen, 'access-control-allow-headers': 'content-type, x-llave', 'access-control-allow-methods': 'GET, POST', vary: 'origin' } : {};
    if(req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if(ruta === '/api/salud') return json({ bien: true }, 200, cors);
    const despacho = env.DESPACHO.get(env.DESPACHO.idFromName('urban-pest'));

    /* Meta: verificación del webhook (una vez, al conectar) */
    if(ruta === '/webhook/meta' && req.method === 'GET'){
      const ok = url.searchParams.get('hub.mode') === 'subscribe' && env.META_VERIFY_TOKEN && url.searchParams.get('hub.verify_token') === env.META_VERIFY_TOKEN;
      return ok ? new Response(url.searchParams.get('hub.challenge') || '') : new Response('no', { status: 403 });
    }
    /* Meta: mensajes. Se contesta 200 de inmediato (Meta reintenta si tardamos) y se atiende atrás. */
    if(ruta === '/webhook/meta' && req.method === 'POST'){
      const cuerpo = await req.text();
      if(!(await firmaValida(cuerpo, req.headers.get('x-hub-signature-256'), env.META_APP_SECRET))) return new Response('firma', { status: 401 });
      const mensajes = leerAviso(JSON.parse(cuerpo));
      if(mensajes.length) ctx.waitUntil(despacho.recibir(mensajes));
      return new Response('ok');
    }

    /* Todo lo demás es del panel (el centro de operaciones) y pide su llave */
    if(!env.LLAVE_PANEL || req.headers.get('x-llave') !== env.LLAVE_PANEL) return json({ bien: false, error: 'Falta la llave del panel.' }, 401, cors);
    const cuerpo = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const r = await despacho.panel(req.method, ruta, Object.fromEntries(url.searchParams), cuerpo);
    return json(r, r.estado || 200, cors);
  },
};

export class Despacho extends DurableObject {
  constructor(ctx, env){
    super(ctx, env);
    const s = ctx.storage;
    this.almacen = {
      get: (k) => s.get(k), put: (k, v) => s.put(k, v), del: (k) => s.delete(k),
      list: async (prefijo) => [...(await s.list({ prefix: prefijo })).entries()],
    };
    this.of = new Oficina({ almacen: this.almacen, env, enviar, pensar });
  }

  /* Cada mensaje se atiende con await DENTRO de este encargo: un waitUntil anidado en un
     Durable Object se pierde (ya nos pasó con La Sala). */
  async recibir(mensajes){
    for(const m of mensajes){ try { await this.of.atender(m); } catch(e){ await this.almacen.put('error:' + Date.now(), String(e?.stack || e)); } }
  }

  async panel(metodo, ruta, q, b){
    const A = this.almacen;
    const lista = async (p) => (await A.list(p)).map(([id, v]) => ({ id, ...v }));
    switch(`${metodo} ${ruta}`){
      case 'GET /api/conversaciones': return { bien: true, conversaciones: (await lista('conv:')).map(({ mensajes, ...c }) => ({ ...c, n: mensajes.length, ultimo_texto: mensajes.at(-1)?.texto })).sort((a, b) => b.ultimo - a.ultimo) };
      case 'GET /api/conversacion': return { bien: true, conversacion: await A.get(`conv:${q.canal}:${q.chat}`) };
      case 'POST /api/responder': return this.of.contestaDueno(b.canal, b.chat, b.texto);
      case 'GET /api/manual': return { bien: true, manual: await lista('manual:') };
      case 'POST /api/manual/aprobar': {
        /* lo que contestó la IA se vuelve reflejo */
        const e = await A.get(b.id); if(!e) return { bien: false, error: 'No existe.', estado: 404 };
        const casos = (await A.get('casos')) || [];
        casos.push({ id: b.caso || b.id.replace('manual:', 'aprendido-'), frases: [e.pregunta, ...(b.frases || [])], respuesta: b.respuesta || e.respuesta });
        await A.put('casos', casos); await A.put(b.id, { ...e, estado: 'aprobado' }); return { bien: true, casos: casos.length };
      }
      case 'GET /api/avisos': return { bien: true, avisos: (await lista('aviso:')).sort((a, b) => b.cuando - a.cuando) };
      case 'POST /api/aviso/visto': { const a = await A.get(b.id); if(a) await A.put(b.id, { ...a, estado: 'visto' }); return { bien: !!a }; }
      case 'GET /api/casos': return { bien: true, casos: (await A.get('casos')) || [] };
      case 'POST /api/casos': await A.put('casos', b.casos || []); return { bien: true };
      case 'POST /api/tarifas': await A.put('tarifas', b.tarifas); return { bien: true };
      case 'POST /api/negocio': await A.put('negocio', b.negocio); return { bien: true };
      case 'POST /api/personales': await A.put('personales', b.numeros || []); return { bien: true };
      case 'POST /api/cotizar': return { bien: true, ...cotizar(b, await A.get('tarifas')) };
      default: return { bien: false, error: 'No existe esa ruta.', estado: 404 };
    }
  }
}
