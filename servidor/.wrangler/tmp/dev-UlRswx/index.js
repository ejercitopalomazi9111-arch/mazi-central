var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var CAJONES = ["productos", "alumnos", "pedidos", "conteos", "eventos"];
var Cooperativa = class {
  static {
    __name(this, "Cooperativa");
  }
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.listo = ctx.blockConcurrencyWhile(async () => {
      this.reloj = await ctx.storage.get("reloj") || 0;
      this.turno = await ctx.storage.get("turno") || { dia: 0, n: 0 };
      this.datos = {};
      for (const c of CAJONES) this.datos[c] = await ctx.storage.get(c) || {};
      this.config = await ctx.storage.get("config") || null;
      this.hechas = await ctx.storage.get("hechas") || [];
    });
  }
  async fetch(pedido) {
    await this.listo;
    const url = new URL(pedido.url);
    if (url.pathname.endsWith("/vivo")) return this.enchufar(pedido);
    if (url.pathname.endsWith("/sync")) {
      const cuerpo = await pedido.json().catch(() => null);
      if (!cuerpo) return json({ error: "El cuerpo no es JSON." }, 400);
      return json(await this.sincronizar(cuerpo));
    }
    if (url.pathname.endsWith("/todo")) {
      return json({ reloj: this.reloj, cambios: this.desde(0), turno: this.turno });
    }
    return json({ error: "No existe." }, 404);
  }
  /* ── El WebSocket. No manda los datos: manda "hubo cambio, ven por él".
     Así el mensaje pesa lo mismo aunque el menú tenga fotos, y el que llega
     tarde no se pierde nada: pide desde su reloj y ya. ──────────────────── */
  enchufar(pedido) {
    if (pedido.headers.get("Upgrade") !== "websocket")
      return json({ error: "Esto es para WebSocket." }, 426);
    const par = new WebSocketPair();
    const [cliente, servidor] = Object.values(par);
    this.ctx.acceptWebSocket(servidor);
    servidor.send(JSON.stringify({ tipo: "reloj", reloj: this.reloj }));
    return new Response(null, { status: 101, webSocket: cliente });
  }
  webSocketMessage(ws, msg) {
    if (msg === "ping") {
      try {
        ws.send("pong");
      } catch (e) {
      }
    }
  }
  /* con hibernación el runtime vuelve a llamar aquí después de dormir, así
     que estos dos tienen que existir aunque no hagan nada */
  webSocketClose() {
  }
  webSocketError() {
  }
  avisar() {
    const m = JSON.stringify({ tipo: "reloj", reloj: this.reloj });
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(m);
      } catch (e) {
      }
    }
  }
  /* ── La mezcla ──────────────────────────────────────────────────────────
     Entra lo que el aparato tocó desde la última vez; sale todo lo que
     cambió aquí desde el reloj que él trae. */
  async sincronizar(cuerpo) {
    const desde = Number(cuerpo.desde) || 0;
    const cambios = cuerpo.cambios || {};
    const nuevo = this.reloj + 1;
    let tocado = false;
    for (const cajon of CAJONES) {
      const lista = Array.isArray(cambios[cajon]) ? cambios[cajon] : [];
      for (const r of lista) {
        if (!r || typeof r.id !== "string" || !r.id) continue;
        const viejo = this.datos[cajon][r.id];
        const t = Number(r.t) || 0;
        if (viejo && !(t > (viejo.t || 0) || t === (viejo.t || 0) && r.id > viejo.id)) continue;
        const copia = Object.assign({}, r);
        if (cajon === "pedidos") {
          const teniaTurno = copia.turno !== null && copia.turno !== void 0;
          if (viejo && viejo.turno) copia.turno = viejo.turno;
          else if (!teniaTurno) copia.turno = this.siguienteTurno(copia.creado);
          if (!teniaTurno && copia.turno) copia.t = Math.max((Number(r.t) || 0) + 1, Date.now());
        }
        copia._r = nuevo;
        this.datos[cajon][r.id] = copia;
        tocado = true;
      }
    }
    if (cambios.config && typeof cambios.config === "object") {
      const t = Number(cambios.config.t) || 0;
      if (!this.config || t > (this.config.t || 0)) {
        this.config = Object.assign({}, cambios.config, { _r: nuevo });
        tocado = true;
      }
    }
    if (tocado) {
      this.reloj = nuevo;
      await this.guardar();
      this.avisar();
    }
    return {
      reloj: this.reloj,
      cambios: this.desde(desde),
      /* el aparato necesita saber que su pedido ya trae turno del bueno */
      turno: this.turno
    };
  }
  siguienteTurno(creado) {
    const dia = diaDe(creado || Date.now());
    if (this.turno.dia !== dia) this.turno = { dia, n: 0 };
    this.turno.n++;
    return this.turno.n;
  }
  desde(r) {
    const salida = {};
    for (const cajon of CAJONES) {
      salida[cajon] = Object.values(this.datos[cajon]).filter((x) => (x._r || 0) > r);
    }
    if (this.config && (this.config._r || 0) > r) salida.config = this.config;
    return salida;
  }
  async guardar() {
    const g = this.ctx.storage;
    await g.put("reloj", this.reloj);
    await g.put("turno", this.turno);
    for (const c of CAJONES) await g.put(c, this.datos[c]);
    if (this.config) await g.put("config", this.config);
  }
};
var src_default = {
  async fetch(pedido, env) {
    const url = new URL(pedido.url);
    const origen = pedido.headers.get("Origin") || "";
    const cabezas = puerta(origen, env);
    if (pedido.method === "OPTIONS") return new Response(null, { status: 204, headers: cabezas });
    if (url.pathname === "/api/salud") {
      return json({ bien: true, quien: "fadori", hora: Date.now() }, 200, cabezas);
    }
    if (url.pathname.startsWith("/api/")) {
      const casa = (url.searchParams.get("casa") || "rembrandt").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "rembrandt";
      const id = env.COOPERATIVA.idFromName(casa);
      const r = await env.COOPERATIVA.get(id).fetch(pedido);
      if (r.status === 101) return r;
      const copia = new Response(r.body, r);
      for (const [k, v] of Object.entries(cabezas)) copia.headers.set(k, v);
      return copia;
    }
    return new Response("Fadori \xB7 aqu\xED s\xF3lo vive la API. La app est\xE1 en Pages.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};
function puerta(origen, env) {
  const lista = String(env.ORIGENES || "").split(",").map((s) => s.trim()).filter(Boolean);
  const h = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400"
  };
  if (origen && lista.indexOf(origen) >= 0) h["Access-Control-Allow-Origin"] = origen;
  return h;
}
__name(puerta, "puerta");
function json(o, estado, cabezas) {
  return new Response(JSON.stringify(o), {
    status: estado || 200,
    headers: Object.assign({ "content-type": "application/json; charset=utf-8" }, cabezas || {})
  });
}
__name(json, "json");
function diaDe(ms) {
  const d = new Date(ms);
  return d.getFullYear() * 1e4 + (d.getMonth() + 1) * 100 + d.getDate();
}
__name(diaDe, "diaDe");

// ../../../../opt/node22/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../opt/node22/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-r0J9xM/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../opt/node22/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-r0J9xM/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  Cooperativa,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
