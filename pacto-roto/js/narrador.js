/* ============================================================
   EL PACTO ROTO — narrador.js
   Dos modos: motor de reglas (sin datos) y árbitro LLM (Groq/Anthropic).
   El código decide la geometría; el LLM decide el significado.
   Contratos JSON estrictos + validación + auto-reparación.
   ============================================================ */
window.NARR = (function () {
  const S = () => G.state;

  /* ---------- proveedor LLM ---------- */
  function cfg() { return G.getCfg(); }
  function hasLLM() { const c = cfg(); return !!(c.key && c.prov); }

  async function llm(system, user, { temp = 0.7, maxTok = 700 } = {}) {
    const c = cfg();
    if (!c.key) throw new Error('sin-key');
    if (c.prov === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': c.key,
                   'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: c.model || 'claude-sonnet-5', max_tokens: maxTok, temperature: temp,
          system, messages: [{ role: 'user', content: user }] })
      });
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      return j.content.map(b => b.text || '').join('');
    }
    // groq (default) — openai compatible
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + c.key },
      body: JSON.stringify({ model: c.model || 'llama-3.3-70b-versatile', temperature: temp, max_tokens: maxTok,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
    });
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    return j.choices[0].message.content;
  }

  function parseJSON(txt) {
    if (!txt) return null;
    let t = txt.trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    try { return JSON.parse(t); } catch (e) { return null; }
  }

  // llama al LLM esperando JSON; reintenta una vez con el error de vuelta.
  async function llmJSON(system, user, opts) {
    for (let i = 0; i < 2; i++) {
      try {
        const raw = await llm(system, i === 0 ? user : user + '\n\nTU RESPUESTA ANTERIOR NO FUE JSON VÁLIDO. Devuelve SOLO el objeto JSON, sin texto extra.', opts);
        const j = parseJSON(raw);
        if (j) return j;
      } catch (e) { if (i === 1) throw e; }
    }
    throw new Error('json-invalido');
  }

  /* ---------- estado comprimido para el árbitro ---------- */
  function compactState() {
    const s = S();
    return {
      clase: DATA.CLASES[s.clase].nombre, raza: DATA.RAZAS[s.raza].nombre,
      nivel: s.nivel, hp: s.hp + '/' + s.hpMax, mana: s.mana + '/' + s.manaMax, oro: s.oro,
      hechiceria: s.hechiceria, stats: s.stats, rastro: s.rastro, moral: s.moral,
      lugar: DATA.NODOS[s.lugar] ? DATA.NODOS[s.lugar].nombre : s.lugar,
      region: DATA.NODOS[s.lugar] ? DATA.NODOS[s.lugar].region : 'ruinas',
      grimorio: s.grimorio.map(h => h.nombre).slice(-8),
      hilos: s.hilos.slice(-6), ultimo: s.ultimo.slice(-3),
      guerra: s.mundo.guerra.activa ? `frente ${s.mundo.guerra.frente}, avance ${s.mundo.guerra.avance}` : 'latente',
    };
  }
  function idsArte() { return Object.keys(G.catalog); }

  const TONO = `Eres el árbitro y narrador de "El Pacto Roto", un RPG oscuro de mundo abierto en español mexicano.
Tono: seco, literario, sin cursilerías, sin signos de exclamación de más. Segunda persona.
El mundo: los Sombreros Puntiagudos monopolizan la magia y borraron el recuerdo de que fue de todos.
Dibujar sobre carne está prohibido; los Caballeros Moralis cazan a quien lo hace y le borran la memoria.
NUNCA rompas el personaje. NUNCA menciones que eres una IA. Responde SIEMPRE en JSON válido, sin texto fuera del objeto.`;

  function registrarHilo(s, hilo) { if (hilo) { s.hilos.push(hilo); if (s.hilos.length > 20) s.hilos.shift(); } }
  function registrarUltimo(s, acc) { s.ultimo.push(acc); if (s.ultimo.length > 6) s.ultimo.shift(); }

  /* ============================================================
     TURNO DE EXPLORACIÓN
     ============================================================ */
  async function turno(accion) {
    const s = S();
    registrarUltimo(s, accion);
    if (hasLLM()) {
      try { return await turnoLLM(accion); }
      catch (e) { G.toast('El oráculo calla. Sigo con las reglas.', ''); return turnoReglas(accion); }
    }
    return turnoReglas(accion);
  }

  async function turnoLLM(accion) {
    const system = TONO + `
CONTRATO (turno normal). Devuelve exactamente:
{"narracion":"2-4 frases","imagen_id":"<una id del catálogo>","opciones":[{"t":"texto del botón","hint":"consecuencia breve"}],"cambios":{"hp":0,"mana":0,"oro":0,"rastro":0,"xp":0,"moral":0},"lugar":"nombre","enemigo":null,"hilo":null}
Reglas: 2 a 4 opciones, SIEMPRE al menos una que no sea pelear. "enemigo": null o {"n":"nombre","nivel":N,"hp":N}. "hilo": null o una frase de algo que el mundo ahora recuerda. "cambios" son deltas y pueden ser negativos. imagen_id DEBE ser una de: ${idsArte().join(', ')}.`;
    const user = `ESTADO:\n${JSON.stringify(compactState())}\n\nEL JUGADOR HACE: "${accion}"\nNarra lo que ocurre y ofrece opciones.`;
    const j = await llmJSON(system, user, { temp: 0.8, maxTok: 700 });
    return normalizarTurno(j);
  }

  function normalizarTurno(j) {
    const ids = idsArte();
    const out = {
      narracion: String(j.narracion || 'El camino sigue, mudo.'),
      imagen_id: ids.includes(j.imagen_id) ? j.imagen_id : null,
      opciones: Array.isArray(j.opciones) ? j.opciones.slice(0, 4).map(o => ({ t: String(o.t || '…'), hint: o.hint ? String(o.hint) : '', ir: o.ir || null, r: sanitCambios(o.r), loot: o.loot || null, enemigo: o.enemigo || null })) : [],
      cambios: sanitCambios(j.cambios),
      enemigo: j.enemigo && j.enemigo.n ? { n: String(j.enemigo.n), nivel: G.clamp(+j.enemigo.nivel || 1, 1, 12), hp: G.clamp(+j.enemigo.hp || 12, 4, 140) } : null,
      hilo: j.hilo ? String(j.hilo) : null,
    };
    if (!out.opciones.length) out.opciones = [{ t: 'Seguir adelante', hint: '' }];
    return out;
  }

  function sanitCambios(c) {
    if (!c || typeof c !== 'object') return {};
    const o = {};
    for (const k of ['hp','mana','oro','xp','rastro','moral','suerte']) {
      if (c[k] != null && !isNaN(+c[k])) {
        let v = Math.round(+c[k]);
        if (k === 'rastro') v = G.clamp(v, -2, 2);
        if (k === 'moral') v = G.clamp(v, -3, 3);
        if (k === 'hp' || k === 'mana') v = G.clamp(v, -60, 60);
        if (k === 'oro') v = G.clamp(v, -200, 300);
        if (k === 'xp') v = G.clamp(v, 0, 60);
        o[k] = v;
      }
    }
    return o;
  }

  /* ---------- modo reglas ---------- */
  function turnoReglas(accion) {
    const s = S();
    const region = DATA.NODOS[s.lugar] ? DATA.NODOS[s.lugar].region : 'ruinas';
    const pool = DATA.EVENTOS[region] || DATA.EVENTOS.ruinas;
    const ev = G.pick(pool);
    if (ev.enemigo) {
      const b = DATA.BESTIARIO[ev.enemigo];
      return { narracion: ev.t, imagen_id: ev.art, opciones: [], enemigo: { key: ev.enemigo, n: b.nombre, nivel: b.nivel, hp: b.hp }, cambios: {}, hilo: null };
    }
    const ops = (ev.ops || [{ t: 'Seguir', r: {} }]).map(o => ({ t: o.t, hint: o.hint || '', r: o.r || {}, loot: o.loot || null, ir: o.ir || null }));
    return { narracion: ev.t, imagen_id: ev.art, opciones: ops, cambios: {}, enemigo: null, hilo: null };
  }

  /* ============================================================
     ACCIÓN LIBRE — el jugador escribe lo que quiere hacer
     ============================================================ */
  function invResumen() {
    const inv = S().inv, out = [];
    for (const k in inv) { if (DATA.MATS[k]) out.push(`${k}:${inv[k]}`); }
    return out.join(', ') || '(vacío)';
  }
  const MAT_IDS = Object.keys(DATA.MATS);

  async function accionLibre(texto) {
    const s = S();
    registrarUltimo(s, texto);
    if (hasLLM()) {
      try { return await accionLibreLLM(texto); }
      catch (e) { G.toast('El oráculo calla. El mundo responde a medias.', ''); return accionLibreReglas(texto); }
    }
    return accionLibreReglas(texto);
  }

  async function accionLibreLLM(texto) {
    const system = TONO + `
El jugador puede hacer LO QUE SEA con palabras: buscar, robar, hablar, quemar, matar, construir,
esconderse, rezar, lo que escriba. Interprétalo con criterio y consecuencias reales. Puedes darle o
quitarle cosas, crear objetos, moverlo, o hacer que un pueblo quede en cenizas.
CONTRATO (acción libre). Devuelve exactamente:
{"narracion":"2-4 frases, segunda persona","imagen_id":"<id del catálogo>","opciones":[{"t":"","hint":""}],"cambios":{"hp":0,"mana":0,"oro":0,"rastro":0,"moral":0,"xp":0},"dar":{},"gastar":{},"objeto":null,"crear":null,"enemigo":null,"lugar":null,"fantasma":false,"hilo":null}
- "dar"/"gastar": objetos {id:cantidad} SOLO con estos materiales: ${MAT_IDS.join(', ')}.
- "objeto": null o un equipable creado {"nombre":"","slot":"arma|armadura|foco","base":{"ataque":0,"defensa":0,"mana":0},"rareza":"tosca|comun|fina|maestra|legendaria"}.
- "crear": null o un consumible {"tipo":"pocion|comida","nombre":"","efecto":{"hp":0,"mana":0},"rareza":""}.
- "fantasma": true SOLO si el jugador destruye/masacra el pueblo donde está (queda en cenizas para siempre).
- "enemigo": null o {"n":"","nivel":N,"hp":N} si su acción provoca un combate.
- "lugar": null o el nombre de un sitio si se mueve. Sé justo: acciones tontas fallan, las crueles pesan en la moral y el Rastro.
imagen_id de: ${idsArte().join(', ')}.`;
    const user = `ESTADO:\n${JSON.stringify(compactState())}\nINVENTARIO: ${invResumen()}\n\nEL JUGADOR ESCRIBE: "${texto}"\nInterpreta y resuelve.`;
    const j = await llmJSON(system, user, { temp: 0.85, maxTok: 750 });
    const base = normalizarTurno(j);
    return Object.assign(base, {
      dar: sanitItems(j.dar), gastar: sanitItems(j.gastar),
      objeto: normObjeto(j.objeto), crear: normCrear(j.crear),
      lugar: j.lugar ? String(j.lugar) : null, fantasma: !!j.fantasma,
    });
  }

  function sanitItems(o) {
    const out = {}; if (!o || typeof o !== 'object') return out;
    for (const k in o) if (DATA.MATS[k] && !isNaN(+o[k])) out[k] = G.clamp(Math.round(+o[k]), 0, 20);
    return out;
  }
  function normObjeto(o) {
    if (!o || !o.nombre) return null;
    return { nombre: String(o.nombre).slice(0, 40), slot: ['arma','armadura','foco'].includes(o.slot) ? o.slot : 'arma',
      base: o.base || {}, rareza: ['tosca','comun','fina','maestra','legendaria'].includes(o.rareza) ? o.rareza : 'comun' };
  }
  function normCrear(c) {
    if (!c || !c.nombre) return null;
    return { tipo: c.tipo === 'comida' ? 'comida' : 'pocion', nombre: String(c.nombre).slice(0, 40),
      efecto: c.efecto || c.buff || {}, rareza: ['tosca','comun','fina','maestra','legendaria'].includes(c.rareza) ? c.rareza : 'comun' };
  }

  function accionLibreReglas(texto) {
    const s = S(), region = DATA.NODOS[s.lugar] ? DATA.NODOS[s.lugar].region : 'ruinas';
    const t = (texto || '').toLowerCase();
    // heurística mínima sin IA
    if (/(quem|masacr|destru|arras|mat[ao] a todo)/.test(t) && DATA.NODOS[s.lugar] && DATA.NODOS[s.lugar].tipo === 'pueblo') {
      return { narracion: 'Prendes fuego a todo lo que arde. Cuando el humo baja, no queda nadie. El pueblo es ceniza y así se queda.', imagen_id: 'guerra_ira', opciones: [{ t: 'Seguir', hint: '' }], cambios: { moral: -4, rastro: 1, oro: 40, xp: 18 }, dar: {}, gastar: {}, objeto: null, crear: null, enemigo: null, lugar: null, fantasma: true, hilo: 'Dejaste un pueblo en cenizas.' };
    }
    if (/(busc|recog|junt|recolect|hierba|le[ñn]a|mena|caz)/.test(t)) {
      const g = ['madera','raiz','seta','mena','esporas','ceniza_h'][Math.floor(Math.random()*6)];
      return { narracion: `Rebuscas por los alrededores. Entre la maleza y la piedra, algo aprovechable.`, imagen_id: MUNDO ? MUNDO.regionArt(region) : null, opciones: [{ t: 'Seguir', hint: '' }], cambios: { xp: 2 }, dar: { [g]: 1 }, gastar: {}, objeto: null, crear: null, enemigo: null, lugar: null, fantasma: false, hilo: null };
    }
    return { narracion: `Intentas: "${texto}". El mundo apenas responde sin el oráculo despierto — pega tu llave en ⚙ para que la IA lo interprete de verdad.`, imagen_id: null, opciones: [{ t: 'Seguir', hint: '' }], cambios: {}, dar: {}, gastar: {}, objeto: null, crear: null, enemigo: null, lugar: null, fantasma: false, hilo: null };
  }

  /* ============================================================
     MESA DE TRABAJO LIBRE — avienta lo que sea, la IA juzga
     ============================================================ */
  async function juzgarCreacion(ctx) {
    // ctx: {ingredientes:[{key,nombre,qty}], acciones:[verbos], oficio, score, nivelOficio}
    if (hasLLM()) {
      try { return await creacionLLM(ctx); }
      catch (e) { return creacionReglas(ctx); }
    }
    return creacionReglas(ctx);
  }

  async function creacionLLM(ctx) {
    const system = TONO + `
El jugador está en un banco de trabajo y combina lo que quiera (materiales, comida, hasta una espada
o una gema) aplicándole acciones. TÚ decides qué sale: puede ser útil, mediocre, o basura. Sé
coherente: metal + fuego + forjar = arma; hierbas + hervir/destilar = poción (a veces inútil);
comida + cocinar = platillo; combinaciones absurdas = basura o algo raro.
CONTRATO (creación). Devuelve exactamente:
{"nombre":"","tipo":"comida|pocion|arma|armadura|objeto|basura","rareza":"tosca|comun|fina|maestra|legendaria","narracion":"1-3 frases secas","efecto":{"hp":0,"mana":0,"rastro":0},"atributos":{"ataque":0,"defensa":0,"mana":0},"consumo":{}}
- "consumo": exactamente qué ingredientes y cuántos se gastan (ids: los que te doy), puede ser todos o algunos.
- Para comida/poción usa "efecto"; para arma/armadura/objeto usa "atributos"; para basura ambos vacíos.
- La ejecución (0..1) y el nivel de oficio suben la calidad.`;
    const ingr = ctx.ingredientes.map(i => `${i.key}(${i.nombre}) x${i.qty}`).join(', ');
    const user = `INGREDIENTES: ${ingr}\nACCIONES: ${ctx.acciones.join(' → ') || '(ninguna)'}\nOFICIO: ${ctx.oficio || 'libre'}\nEJECUCIÓN: ${(ctx.score != null ? ctx.score : 0.6).toFixed(2)}\nNIVEL DE OFICIO: ${ctx.nivelOficio || 0}`;
    const j = await llmJSON(system, user, { temp: 0.8, maxTok: 400 });
    return normalizarCreacion(j, ctx);
  }

  // traduce el vocabulario libre de la IA (daño, salud, etc.) a claves canónicas del juego
  function mapStats(pool) {
    const out = {};
    const map = { ataque:'ataque', daño:'ataque', dano:'ataque', filo:'ataque', poder:'ataque', fuerza:'ataque',
      defensa:'defensa', armadura:'defensa', proteccion:'defensa', 'protección':'defensa',
      hp:'hp', salud:'hp', vida:'hp', cura:'hp', saciedad:'hp', 'nutrición':'hp', nutricion:'hp',
      mana:'mana', 'maná':'mana', energia:'mana', 'energía':'mana', magia:'mana',
      rastro:'rastro', oro:'oro', xp:'xp', suerte:'suerte' };
    for (const k in (pool || {})) {
      const canon = map[String(k).toLowerCase()];
      if (!canon) continue;
      let v = pool[k]; if (typeof v === 'string') v = parseInt(v.replace(/[^\-0-9]/g, ''), 10);
      if (!isNaN(v)) out[canon] = (out[canon] || 0) + Math.round(v);
    }
    return out;
  }

  function normalizarCreacion(j, ctx) {
    const tipos = ['comida','pocion','arma','armadura','objeto','basura'];
    const tipo = tipos.includes(j.tipo) ? j.tipo : 'basura';
    // pool combinado de stats, con vocabulario normalizado
    const pool = mapStats(Object.assign({}, j.atributos || {}, j.efecto || {}));
    const equip = (tipo === 'arma' || tipo === 'armadura' || tipo === 'objeto');
    const efecto = {}, atributos = {};
    for (const k in pool) {
      if (equip) { if (['ataque','defensa','mana'].includes(k)) atributos[k] = pool[k]; }
      else { if (['hp','mana','rastro','suerte','oro'].includes(k)) efecto[k] = pool[k]; }
    }
    if (equip && !Object.keys(atributos).length) atributos[tipo === 'armadura' ? 'defensa' : 'ataque'] = 4; // nunca un arma sin filo
    // consumo: aceptar {id:qty} o {ids:[...]}, validar contra lo ofrecido
    const ofrecido = {}; ctx.ingredientes.forEach(i => ofrecido[i.key] = i.qty);
    const consumo = {};
    let raw = j.consumo;
    if (raw && Array.isArray(raw.ids)) { const o = {}; raw.ids.forEach(id => o[id] = ofrecido[id] || 1); raw = o; }
    if (Array.isArray(raw)) { const o = {}; raw.forEach(id => o[id] = ofrecido[id] || 1); raw = o; }
    if (raw && typeof raw === 'object') for (const k in raw) if (ofrecido[k]) consumo[k] = G.clamp(Math.round(+raw[k] || 0), 0, ofrecido[k]);
    if (!Object.keys(consumo).length) ctx.ingredientes.forEach(i => consumo[i.key] = i.qty); // si no dice, gasta todo
    return {
      nombre: String(j.nombre || 'Cosa sin nombre').slice(0, 40), tipo,
      rareza: ['tosca','comun','fina','maestra','legendaria'].includes(j.rareza) ? j.rareza : 'comun',
      narracion: String(j.narracion || ''), efecto, atributos, consumo,
    };
  }

  function creacionReglas(ctx) {
    const keys = ctx.ingredientes.map(i => i.key);
    const acc = (ctx.acciones || []).join(' ');
    const consumo = {}; ctx.ingredientes.forEach(i => consumo[i.key] = i.qty);
    const tieneMetal = keys.some(k => ['lingote','mena','carbon','gema'].includes(k));
    const tieneHierba = keys.some(k => ['raiz','ceniza_h','esporas','lagrima'].includes(k));
    const tieneComida = keys.some(k => DATA.MATS[k] && DATA.MATS[k].tipo === 'ingrediente');
    const calor = /fund|forj|herv|fre|horn|coc|templ/.test(acc);
    const score = ctx.score != null ? ctx.score : 0.5;
    const rareza = score > 0.85 ? 'maestra' : score > 0.6 ? 'fina' : score > 0.35 ? 'comun' : 'tosca';
    const mult = { tosca: 0.6, comun: 1, fina: 1.4, maestra: 1.9 }[rareza] || 1;
    if (tieneMetal && calor) return { nombre: 'Hoja improvisada', tipo: 'arma', rareza, narracion: 'El metal cede al calor y toma filo. Tosca, pero corta.', efecto: {}, atributos: { ataque: Math.round(6 * mult) }, consumo };
    if (tieneComida && calor) { let hp = 0; keys.forEach(k => { if (DATA.MATS[k] && DATA.MATS[k].tipo === 'ingrediente') hp += 6; }); return { nombre: 'Platillo del momento', tipo: 'comida', rareza, narracion: 'Sale comida. Reconforta más de lo que se ve.', efecto: { hp: Math.round(hp * mult) }, atributos: {}, consumo }; }
    if (tieneHierba) { const util = Math.random() < 0.6; return { nombre: util ? 'Brebaje turbio' : 'Agua sucia', tipo: util ? 'pocion' : 'basura', rareza: util ? rareza : 'tosca', narracion: util ? 'Huele feo, pero algo hace.' : 'No sirvió de nada. Solo perdiste lo que echaste.', efecto: util ? { mana: Math.round(12 * mult) } : {}, atributos: {}, consumo }; }
    return { nombre: 'Amasijo inútil', tipo: 'basura', rareza: 'tosca', narracion: 'Lo que sea que intentabas, no salió. Basura.', efecto: {}, atributos: {}, consumo };
  }

  /* ============================================================
     JUICIO DE SELLO (magia dibujada)
     ============================================================ */
  async function juzgarSello(lectura, intencion, sobreCarne) {
    const s = S();
    const t = G.tirada(DATA.CLASES[s.clase].bonus_sello);
    registrarUltimo(s, 'dibujó un sello: ' + intencion);
    if (hasLLM()) {
      try { return await selloLLM(lectura, intencion, sobreCarne, t); }
      catch (e) { return selloReglas(lectura, intencion, sobreCarne, t); }
    }
    return selloReglas(lectura, intencion, sobreCarne, t);
  }

  function lecturaTexto(l, sobreCarne) {
    const dentro = l.dentro.map(g => `${g.g} ${g.nombre}${g.inv ? ' (invertido)' : ''}`).join(' · ') || '(nada)';
    const fuera = l.fuera.map(g => `${g.g} ${g.nombre}`).join(' · ') || '(nada)';
    return `LECTURA DEL SELLO:
- anillo: ${l.anillo ? 'cerrado' : 'ABIERTO O AUSENTE'}, ${l.redondez}% redondo, ocupa ${l.area}% de la hoja
- sigilo (elemento): ${l.sigilo ? l.sigilo.g + ' ' + l.sigilo.nombre : '(ninguno)'}
- signos dentro del anillo (cuentan): ${dentro}
- fuera del anillo (NO cuenta): ${fuera}
- simetría interior: ${l.simetria} · temblor de mano: ${l.temblor}
${sobreCarne ? '- DIBUJADO SOBRE CARNE. Magia prohibida. Genera Rastro.' : ''}`;
  }

  async function selloLLM(l, intencion, sobreCarne, t) {
    const system = TONO + `
CONTRATO (juicio de sello). Devuelve exactamente:
{"nombre":"nombre del hechizo","narracion":"2-4 frases de qué pasó al cerrar el anillo","exito":"total|parcial|fallo|contragolpe","efecto":"qué hace en juego, una frase","imagen_id":"<id del catálogo>","cambios":{"hp":0,"mana":0,"rastro":0,"xp":0},"aprendido":null}
La declaración del jugador es su INTENCIÓN, no un hecho. Si los trazos no la respaldan, sale otra cosa o le revienta (contragolpe). Sin anillo cerrado, el sello NO activa: exito="fallo", nada pasa. Garabato (temblor alto, poca área) = hechizo pobre. Trazo limpio y grande = potente. "aprendido": null o el nombre si salió lo bastante bien para guardarlo. imagen_id de: ${idsArte().join(', ')}. Gramática: ${DATA.EJEMPLOS_SELLO.join(' ; ')}.`;
    const user = `ESTADO:\n${JSON.stringify(compactState())}\n\n${lecturaTexto(l, sobreCarne)}\n\nTIRADA: d20=${t.dado} + bono ${t.bono} = ${t.total}\n\nEL JUGADOR DICE QUE QUISO DIBUJAR: "${intencion || '(no dijo nada)'}"`;
    const j = await llmJSON(system, user, { temp: 0.5, maxTok: 600 });
    return normalizarSello(j, l, sobreCarne);
  }

  function normalizarSello(j, l, sobreCarne) {
    const ids = idsArte();
    const exito = ['total','parcial','fallo','contragolpe'].includes(j.exito) ? j.exito : (l.anillo ? 'parcial' : 'fallo');
    const out = {
      nombre: String(j.nombre || 'Sello sin nombre'),
      narracion: String(j.narracion || (l.anillo ? 'El anillo se cierra y algo cambia en el aire.' : 'El anillo quedó abierto. No pasa nada.')),
      exito, efecto: String(j.efecto || ''),
      imagen_id: ids.includes(j.imagen_id) ? j.imagen_id : (sobreCarne ? 'goya_saturno' : 'circulo_magico'),
      cambios: sanitCambios(j.cambios),
      aprendido: j.aprendido ? String(j.aprendido) : null,
    };
    if (sobreCarne && !out.cambios.rastro) out.cambios.rastro = 1;
    return out;
  }

  /* ---------- juicio de sello por reglas ---------- */
  function selloReglas(l, intencion, sobreCarne, t) {
    if (!l.anillo) return { nombre: 'Sello roto', narracion: 'El anillo quedó abierto. La tinta se seca sin efecto. Nada pasa.', exito: 'fallo', efecto: '', imagen_id: 'circulo_magico', cambios: {}, aprendido: null };
    if (!l.dentro.length && !l.sigilo) return { nombre: 'Descarga', narracion: 'Solo el anillo, vacío por dentro. La energía no tiene forma y estalla contra ti.', exito: 'contragolpe', efecto: 'daño a ti mismo', imagen_id: 'guerra_ira', cambios: { hp: -8, mana: -6 }, aprendido: null };

    const sig = l.sigilo || { nombre: 'Fuerza cruda', efecto: 'energía', clave: null };
    const signos = l.dentro.map(g => g.inv ? (g.invEfecto || g.nombre) : g.efecto);
    const potencia = (l.area / 20) + (l.redondez / 40) - (l.temblor * 2) + (t.total / 25);
    let exito, dhp = 0, dmana = -Math.max(4, Math.round(8 - potencia)), rastro = sobreCarne ? 1 : 0;
    if (potencia >= 3.2 && t.total >= 20) exito = 'total';
    else if (potencia >= 1.6) exito = 'parcial';
    else if (t.dado === 1 || potencia < 0.4) { exito = 'contragolpe'; dhp = -Math.round(6 + Math.random()*6); }
    else exito = 'fallo';

    const efecto = `${sig.nombre} + ${signos.join(', ') || 'forma simple'}`;
    let narr;
    if (exito === 'total') narr = `El anillo se cierra limpio. ${sig.nombre} obedece: ${signos.join(', ') || 'toma forma pura'}. El sello sale entero y potente.`;
    else if (exito === 'parcial') narr = `El anillo aguanta a medias. ${sig.nombre} responde, pero el trazo tiembla y el efecto sale débil.`;
    else if (exito === 'contragolpe') narr = `El trazo se quiebra a media formación. ${sig.nombre} se te vuelve encima. Duele.`;
    else narr = `La tinta no prende. El sello se apaga sin dar nada.`;

    const nombre = intencion ? intencion.slice(0, 40) : efecto;
    const aprendido = (exito === 'total') ? nombre : null;
    const xp = exito === 'total' ? 10 : exito === 'parcial' ? 4 : 0;
    let art = sobreCarne ? 'goya_saturno' : (sig.clave === 'luz' ? 'circulo_magico' : sig.clave === 'agua' ? 'bocklin_isla' : sig.clave === 'fuego' ? 'dore_satan' : 'circulo_magico');
    return { nombre, narracion: narr, exito, efecto, imagen_id: art, cambios: { hp: dhp, mana: dmana, rastro, xp }, aprendido };
  }

  /* ============================================================
     JUICIO DE CALIDAD DE OFICIO / BOTÍN DE ORBE
     ============================================================ */
  async function juzgarCalidad(ctx) {
    // ctx: {oficio, receta, ejecucion(0..1), nivelOficio}
    if (hasLLM()) {
      try {
        const system = TONO + `\nCONTRATO (calidad de oficio). Devuelve: {"rareza":"tosca|comun|fina|maestra|legendaria","nota":"una frase seca del resultado","bono":{}}. La calidad depende de la ejecución (0..1) y del nivel de oficio. bono son stats extra opcionales.`;
        const user = `OFICIO: ${ctx.oficio}\nRECETA: ${ctx.receta}\nEJECUCIÓN: ${ctx.ejecucion.toFixed(2)}\nNIVEL DE OFICIO: ${ctx.nivelOficio}`;
        const j = await llmJSON(system, user, { temp: 0.6, maxTok: 200 });
        const rar = ['tosca','comun','fina','maestra','legendaria'].includes(j.rareza) ? j.rareza : calidadReglas(ctx).rareza;
        return { rareza: rar, nota: String(j.nota || ''), bono: (j.bono && typeof j.bono==='object') ? j.bono : {} };
      } catch (e) { return calidadReglas(ctx); }
    }
    return calidadReglas(ctx);
  }
  function calidadReglas(ctx) {
    const score = ctx.ejecucion * 0.75 + Math.min(1, ctx.nivelOficio / 10) * 0.25 + Math.random() * 0.12;
    let r;
    if (score > 0.92) r = 'legendaria'; else if (score > 0.75) r = 'maestra';
    else if (score > 0.55) r = 'fina'; else if (score > 0.32) r = 'comun'; else r = 'tosca';
    const notas = { tosca:'Sale, pero mal.', comun:'Cumple.', fina:'Buen trabajo.', maestra:'Obra de manos firmes.', legendaria:'Algo así no se ve dos veces.' };
    return { rareza: r, nota: notas[r], bono: {} };
  }

  // Botín de orbe con la regla del diferencial
  async function juzgarOrbe(nivelEnemigo, tipoEnemigo) {
    const dif = nivelEnemigo - S().nivel;
    if (hasLLM()) {
      try {
        const system = TONO + `\nCONTRATO (orbe). Un enemigo derrotado dejó un orbe de habilidad. Regla del diferencial: si el enemigo estaba MUY por encima del jugador, la habilidad es buenísima; si estaba por debajo, es inútil o estúpida. Devuelve: {"habilidad":"nombre","desc":"una frase","potencia":"nula|floja|decente|fuerte|brutal"}.`;
        const user = `NIVEL ENEMIGO: ${nivelEnemigo}\nNIVEL JUGADOR: ${S().nivel}\nTIPO: ${tipoEnemigo}\nDIFERENCIAL: ${dif}`;
        const j = await llmJSON(system, user, { temp: 0.85, maxTok: 200 });
        return { habilidad: String(j.habilidad||'Chispa inútil'), desc: String(j.desc||''), potencia: j.potencia||'floja' };
      } catch (e) {}
    }
    let pot;
    if (dif >= 6) pot = 'brutal'; else if (dif >= 3) pot = 'fuerte'; else if (dif >= 0) pot = 'decente'; else if (dif >= -4) pot = 'floja'; else pot = 'nula';
    const nombres = { nula:'Polvo sin uso', floja:'Truco menor', decente:'Habilidad sólida', fuerte:'Don robado', brutal:'Poder muy por encima de ti' };
    return { habilidad: nombres[pot], desc: pot==='nula'?'No sirve para nada.':'Un poder acorde a lo que mataste.', potencia: pot };
  }

  return { hasLLM, turno, accionLibre, juzgarCreacion, juzgarSello, juzgarCalidad, juzgarOrbe, registrarHilo, lecturaTexto, llm, parseJSON };
})();
