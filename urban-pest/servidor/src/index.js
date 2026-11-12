/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL SERVIDOR (Cloudflare Worker + un Durable Object)
   ───────────────────────────────────────────────────────────────────────────
   Las rutas están en ../RUTAS.md: es el contrato con el centro de operaciones
   que hace Godines. Si se cambia una ruta, se cambia allá primero.

   Secretos (wrangler secret put, NUNCA en el repo):
     GROQ_API_KEY · GEMINI_API_KEY (las gratis) · META_APP_SECRET · META_VERIFY_TOKEN ·
     WA_TOKEN · META_PAGE_TOKEN · LLAVE_PANEL
     (ANTHROPIC_API_KEY sólo cuando el cliente se quede: es de paga)
   Variables: WA_PHONE_ID · IG_ID · FB_PAGE_ID · GRAPH_VERSION · DUENO_WA ·
     MOTORES_IA · ORIGENES
   ═══════════════════════════════════════════════════════════════════════════ */
import { Oficina } from './oficina.js';
import { firmaValida, leerAviso, enviar } from './meta.js';
import { pensar } from './cerebro.js';
import { cotizar } from './cotizador.js';
import { estimarM2, MEDIDAS } from './medidor.js';
import CASOS_FABRICA from '../../bot/casos.json' with { type: 'json' };

/* Para PROBAR mientras llega el Excel: precios DE EJEMPLO, sólo en el canal «prueba» y
   marcados como tales. Nunca se usan con un cliente de verdad. */
const TARIFAS_EJEMPLO = { ejemplo: true, minimo: 500, mano_obra_m2: 2, costo_km: 4, radio_km: 40, margen: .3, umbral_visita_m2: 400, fuera_m2_minimo: 200,
  plagas: { cucaracha: { litros_m2: .05, precio_litro: 60 }, roedor: { litros_m2: .04, precio_litro: 70 }, hormiga: { litros_m2: .04, precio_litro: 55 },
    chinche: { litros_m2: .06, precio_litro: 80 }, alacran: { litros_m2: .05, precio_litro: 65 }, pulga: { litros_m2: .05, precio_litro: 60 },
    termita: { litros_m2: .08, precio_litro: 90 }, arana: { litros_m2: .04, precio_litro: 55 }, mosco: { litros_m2: .03, precio_litro: 50 }, mosca: { litros_m2: .03, precio_litro: 50 } },
  tipos: { casa: { factor: 1 }, negocio: { factor: 1.2 }, industria: { factor: 1.4, visita: true } },
  zonas: { centro: 6, juriquilla: 18, 'el marques': 15, corregidora: 10, 'el refugio': 14, zibata: 20, 'san juan del rio': 55 } };

/* las llaves de IA que el worker trae puestas, para el objeto (su env propio no las tiene si vienen de La Sala) */
const llavesIA = (env) => Object.fromEntries(['GROQ_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY'].filter(k => env[k]).map(k => [k, env[k]]));
const huella = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t))))].map(b => b.toString(16).padStart(2, '0')).join('');
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
      if(mensajes.length) ctx.waitUntil(despacho.fetch(new Request('https://do/interno/recibir', { method: 'POST', body: JSON.stringify({ mensajes, llaves: llavesIA(env) }) })));
      return new Response('ok');
    }

    /* Todo lo demás es del panel (el centro de operaciones). Entra quien trae la llave del panel
       (Grupo Mazi) o un ACCESO: un código por persona que sólo abre esto y se quita cuando se quiera
       (los testers, 11 nov). */
    const admin = !!env.LLAVE_PANEL && req.headers.get('x-llave') === env.LLAVE_PANEL;
    let quien = admin ? 'Grupo Mazi' : null;
    const acceso = req.headers.get('x-acceso');
    if(!admin && acceso){
      const a = await (await despacho.fetch(new Request('https://do/interno/acceso', { method: 'POST', body: JSON.stringify({ codigo: acceso }) }))).json();
      quien = a.nombre || null;
    }
    if(!quien) return json({ bien: false, error: 'Necesitas tu link de acceso. Pídeselo a Grupo Mazi.' }, 401, cors);
    if(ruta.startsWith('/api/accesos') && !admin) return json({ bien: false, error: 'Sólo Grupo Mazi da accesos.' }, 403, cors);
    const cuerpo = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const r = await (await despacho.fetch(new Request('https://do/interno/panel', { method: 'POST', body: JSON.stringify({ metodo: req.method, ruta, q: Object.fromEntries(url.searchParams), b: cuerpo, quien, llaves: llavesIA(env) }) }))).json();
    return json(r, r.estado || 200, cors);
  },
};

/* Durable Object a la antigua (fetch y no RPC): así también corre en las pruebas de
   La Sala, que cargan el servidor en Node, donde «cloudflare:workers» no existe. */
export class Despacho {
  constructor(ctx, env){
    const s = ctx.storage;
    this.almacen = {
      get: (k) => s.get(k), put: (k, v) => s.put(k, v), del: (k) => s.delete(k),
      list: async (prefijo) => [...(await s.list({ prefix: prefijo })).entries()],
    };
    /* el canal «prueba» no sale a Meta: es Carlos escribiendo como cliente desde el chat central */
    const enviarOPrueba = (e, canal, chat, texto) => canal === 'prueba' ? { bien: true } : enviar(e, canal, chat, texto);
    this.envBase = env;
    this.of = new Oficina({ almacen: this.almacen, env, enviar: enviarOPrueba, pensar });
    /* las respuestas ya hechas de fábrica, si todavía no hay otras guardadas */
    ctx.blockConcurrencyWhile(async () => { if(!(await s.get('casos'))) await s.put('casos', CASOS_FABRICA); });
  }

  async fetch(req){
    const u = new URL(req.url), j = await req.json().catch(() => null);
    if(j && j.llaves) this.of.env = { ...this.envBase, ...j.llaves };
    if(u.pathname === '/interno/recibir'){ await this.recibir(Array.isArray(j) ? j : (j?.mensajes || [])); return new Response('ok'); }
    if(u.pathname === '/interno/panel') return Response.json(await this.panel(j.metodo, j.ruta, j.q || {}, j.b || {}, j.quien));
    if(u.pathname === '/interno/acceso'){ const a = j?.codigo ? await this.almacen.get('acceso:' + await huella(j.codigo)) : null; return Response.json({ nombre: a?.nombre || null }); }
    return new Response('no', { status: 404 });
  }

  /* Cada mensaje se atiende con await DENTRO de este encargo: un waitUntil anidado en un
     Durable Object se pierde (ya nos pasó con La Sala). */
  async recibir(mensajes){
    for(const m of mensajes){ try { await this.of.atender(m); } catch(e){ await this.almacen.put('error:' + Date.now(), String(e?.stack || e)); } }
  }

  async panel(metodo, ruta, q, b, quien = 'Grupo Mazi'){
    const A = this.almacen;
    const lista = async (p) => (await A.list(p)).map(([id, v]) => ({ id, ...v }));
    switch(`${metodo} ${ruta}`){
      case 'GET /api/conversaciones': return { bien: true, conversaciones: (await lista('conv:')).map(({ mensajes, ...c }) => ({ ...c, n: mensajes.length, ultimo_texto: mensajes.at(-1)?.texto, ultima_via: mensajes.at(-1)?.via })).sort((a, b) => b.ultimo - a.ultimo) };
      case 'GET /api/conversacion': return { bien: true, conversacion: await A.get(`conv:${q.canal}:${q.chat}`) };
      case 'GET /api/yo': return { bien: true, quien };
      case 'POST /api/responder': return this.of.contestaDueno(b.canal, b.chat, String(b.texto || '').slice(0, 2000), quien);
      case 'GET /api/accesos': return { bien: true, accesos: (await lista('acceso:')).map(({ nombre, creado }) => ({ nombre, creado })) };
      case 'POST /api/accesos': {
        /* el código sólo se ve aquí, una vez; se guarda su huella */
        const nombre = String(b.nombre || '').trim().slice(0, 40); if(!nombre) return { bien: false, error: 'Falta el nombre.', estado: 400 };
        const codigo = [...crypto.getRandomValues(new Uint8Array(12))].map(x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
        await A.put('acceso:' + await huella(codigo), { nombre, creado: Date.now() }); return { bien: true, nombre, codigo };
      }
      case 'POST /api/accesos/quitar': {
        let n = 0; for(const [k, v] of await A.list('acceso:')) if(v.nombre === b.nombre){ await A.del(k); n++; }
        return { bien: true, quitados: n };
      }
      case 'GET /api/manual': return { bien: true, manual: await lista('manual:') };
      case 'POST /api/manual/aprobar': {
        /* lo que contestó la IA se vuelve reflejo */
        const e = await A.get(b.id); if(!e) return { bien: false, error: 'No existe.', estado: 404 };
        const casos = (await A.get('casos')) || [];
        casos.push({ id: b.caso || b.id.replace('manual:', 'aprendido-'), frases: [e.pregunta, ...(b.frases || [])], respuesta: b.respuesta || e.respuesta });
        await A.put('casos', casos); await A.put(b.id, { ...e, estado: 'aprobado' }); return { bien: true, casos: casos.length };
      }
      case 'POST /api/manual/descartar': { const e = await A.get(b.id); if(e) await A.put(b.id, { ...e, estado: 'descartado' }); return { bien: !!e }; }
      case 'GET /api/avisos': return { bien: true, avisos: (await lista('aviso:')).sort((a, b) => b.cuando - a.cuando) };
      case 'POST /api/aviso/visto': { const a = await A.get(b.id); if(a) await A.put(b.id, { ...a, estado: 'visto' }); return { bien: !!a }; }
      case 'GET /api/casos': return { bien: true, casos: (await A.get('casos')) || [] };
      case 'POST /api/casos': await A.put('casos', b.casos || []); return { bien: true };
      case 'GET /api/medidas': return { bien: true, medidas: (await A.get('medidas')) || MEDIDAS };
      case 'POST /api/medidas': await A.put('medidas', b.medidas); return { bien: true };
      case 'POST /api/estimar': return estimarM2(b, (await A.get('medidas')) || MEDIDAS);
      case 'POST /api/tarifas': await A.put('tarifas', b.tarifas); return { bien: true };
      case 'POST /api/negocio': await A.put('negocio', b.negocio); return { bien: true };
      case 'POST /api/personales': await A.put('personales', b.numeros || []); return { bien: true };
      case 'POST /api/probar': {
        /* Carlos escribe como si fuera cliente; si no hay tarifas reales, se prueba con las de ejemplo */
        const texto = String(b.texto || '').slice(0, 1000).trim(); if(!texto) return { bien: false, error: 'Escribe algo.', estado: 400 };
        const chat = String(b.chat || 'prueba').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'prueba';
        const r = await this.of.atender({ canal: 'prueba', chat, nombre: String(b.nombre || 'Prueba').slice(0, 60), quien, id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6), texto, cuando: Date.now() }, { tarifas: TARIFAS_EJEMPLO });
        return { bien: true, ...r };
      }
      case 'POST /api/probar/borrar': { await A.del(`conv:prueba:${String(b.chat || 'prueba').replace(/[^a-z0-9-]/gi, '')}`); return { bien: true }; }
      case 'POST /api/cotizar': return { bien: true, ...cotizar(b, await A.get('tarifas')) };
      default: return { bien: false, error: 'No existe esa ruta.', estado: 404 };
    }
  }
}
