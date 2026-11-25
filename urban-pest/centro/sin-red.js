/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · EL CENTRO SIN INTERNET
   ───────────────────────────────────────────────────────────────────────────
   Carlos pidió que el centro «funcione sin internet». El fumigador lo usa de
   pie, en una azotea o en un sótano: ahí no hay señal y antes la pantalla se
   quedaba en «Sin conexión. Revisa tu internet».

   Cómo funciona, en tres ideas:

   1. LA RÉPLICA. Cada lista que llega con señal (servicios, insumos, vehículos)
      se guarda en el teléfono. Sin señal se contesta desde ahí.
   2. LAS MISMAS REGLAS. Sin señal no se inventa otra lógica: se corre el MISMO
      motor del servidor (motor.js es copia exacta de servidor/src/centro.js y
      una prueba se pone roja si dejan de ser iguales). Por eso el seguimiento a
      15 días, la garantía a $0 y «no pueden salir más de los que hay» se
      comportan igual con señal y sin ella.
   3. LA COLA. Lo que se hace sin señal se aplica aquí y se apunta en una cola.
      Al volver la señal se manda EN ORDEN. Nada se pierde callado: lo que el
      servidor no acepta queda en «no entró», con su porqué, a la vista.

   Este archivo no sabe que existe la pantalla (skill app-de-campo: «el motor
   primero, sin pantalla»). Sus pruebas: node urban-pest/centro/pruebas.mjs
   ═══════════════════════════════════════════════════════════════════════════ */

/* La llave NO se renombra nunca: ahí vive lo que una persona ya capturó sin señal. */
export const LLAVE = 'urbanpest.centro.v1';
export const LLAVE_MUESTRA = 'urbanpest.centro.muestra.v1';

const YO = 'este teléfono';
const copia = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
const azar = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const VACIO = () => ({ datos: {}, extra: {}, cola: [], rechazados: [], ids: {}, al: 0, n: 0 });

/* Lo que el servidor contesta con «ahorita no» (se reintenta) y no con «eso está mal» (se rechaza). */
const AHORITA_NO = (j) => j.sinRed || [401, 403, 408, 429].includes(j.status) || j.status >= 500;

/** Para la franja de estado: qué es cada cambio pendiente, dicho como lo diría el dueño. */
export function describir(ruta, b, datos = {}) {
  const cita = datos['cita:' + b.id], insumo = datos['insumo:' + b.id];
  const veh = datos['vehiculo:' + (b.vehiculo || b.id)];
  switch (ruta) {
    case '/api/citas': return (b.id ? 'Servicio corregido: ' : 'Servicio nuevo: ') + (b.cliente || cita?.cliente || '');
    case '/api/citas/estado': return `Servicio de ${cita?.cliente || '…'}: ${{ hecho: 'ya se hizo', cerrado: 'ya se cobró', cancelado: 'cancelado', pendiente: 'pendiente' }[b.estado] || b.estado}`;
    case '/api/citas/seguimiento': return `Seguimiento de ${cita?.cliente || '…'}: ${b.sigue_plaga ? 'sigue la plaga, va garantía' : 'ya no hay plaga'}`;
    case '/api/insumos': return (b.id ? 'Insumo corregido: ' : 'Insumo nuevo: ') + (b.nombre || insumo?.nombre || '');
    case '/api/insumos/mover': return `${Number(b.delta) > 0 ? 'Entrada' : 'Salida'} de ${Math.abs(Number(b.delta))} ${insumo?.unidad || ''} de ${insumo?.nombre || 'un insumo'}`.replace(/\s+/g, ' ');
    case '/api/vehiculos': return (b.id ? 'Vehículo corregido: ' : 'Vehículo nuevo: ') + (b.nombre || veh?.nombre || '');
    case '/api/vehiculos/revision': return `Revisión de ${b.tipo || ''} en ${veh?.nombre || 'el vehículo'}`.replace(/\s+/g, ' ');
  }
  return 'Un cambio';
}

/**
 * @param red      (metodo, ruta, cuerpo) => respuesta del servidor; si no hubo red, { bien:false, sinRed:true }
 * @param motor    las funciones de servidor/src/centro.js (motor.js)
 * @param caja     { leer(k), poner(k, v) } — localStorage en la página, un Map en las pruebas
 * @param hoy      () => 'AAAA-MM-DD' del teléfono
 * @param soloLocal datos de muestra: nunca toca la red
 * @param semilla  { datos, extra } con que arranca una caja vacía (la muestra)
 */
export function crearRed({ red, motor: M, caja, llave = LLAVE, hoy, ahora = Date.now, soloLocal = false, semilla = null, autoRefresco = true }) {
  const estado = { sinRed: false, sinEspacio: false, cajaRota: false, detenida: null };
  let E = leer(), enviando = null, ultimoRefresco = 0;

  function leer() {
    let crudo = null;
    try { crudo = caja.leer(llave); } catch { /* sin permiso de almacenamiento: se trabaja en memoria */ }
    if (crudo) {
      try { const e = JSON.parse(crudo); if (e && typeof e.datos === 'object' && Array.isArray(e.cola)) return { ...VACIO(), ...e }; throw 0; }
      catch {
        /* Lo guardado no se puede leer. No se tira: se aparta, por si ahí iba una cola sin enviar. */
        estado.cajaRota = true;
        try { caja.poner(llave + '.roto', crudo); } catch { /* ni modo */ }
      }
    }
    const e = VACIO();
    if (semilla) { e.datos = copia(semilla.datos); e.extra = copia(semilla.extra || {}); e.al = ahora(); }
    return e;
  }
  function guardar() {
    try { caja.poner(llave, JSON.stringify(E)); estado.sinEspacio = false; }
    catch { estado.sinEspacio = true; }   /* se acabó el espacio: se dice en pantalla, no se calla */
  }

  /* El almacén que espera el motor. Entrega COPIAS: el motor cambia el objeto antes de guardarlo,
     y si la regla lo rechaza a medio camino la réplica no debe quedar tocada. */
  const A = {
    get: async (k) => copia(E.datos[k]) ?? null,
    put: async (k, v) => { E.datos[k] = copia(v); },
    list: async (pref) => Object.keys(E.datos).filter(k => k.startsWith(pref)).sort().map(k => [k, copia(E.datos[k])]),
  };

  const LOCAL = {
    'GET /api/tablero': async (b, h) => { const t = await M.tablero(A, h); if (E.extra.bot) { t.bot = E.extra.bot; t.avisos = E.extra.avisos || 0; } return t; },
    'GET /api/citas': () => M.listarCitas(A),
    'GET /api/insumos': () => M.listarInsumos(A),
    'GET /api/vehiculos': (b, h) => M.listarVehiculos(A, h),
    'GET /api/numeros': (b, h) => (E.extra.numeros ? copia(E.extra.numeros) : M.numeros(A, h)),
    'POST /api/citas': (b) => M.guardarCita(A, b, YO),
    'POST /api/citas/estado': (b, h) => M.estadoCita(A, b, YO, h),
    'POST /api/citas/seguimiento': (b) => M.seguimientoHecho(A, b, YO),
    'POST /api/insumos': (b) => M.guardarInsumo(A, b),
    'POST /api/insumos/mover': (b) => M.moverInsumo(A, b, YO),
    'POST /api/vehiculos': (b) => M.guardarVehiculo(A, b),
    'POST /api/vehiculos/revision': (b) => M.revisionVehiculo(A, b, YO),
  };
  const local = async (metodo, camino, b) => {
    const f = LOCAL[metodo + ' ' + camino];
    if (!f) return { bien: false, error: 'Eso necesita internet. Inténtalo cuando vuelva la señal.' };
    return f(copia(b) || {}, hoy());
  };

  /* Lo que llega del servidor reemplaza la réplica. Sólo se llama SIN cola pendiente. */
  function absorber(camino, j) {
    const pon = (pref, lista, limpia) => {
      for (const k of Object.keys(E.datos)) if (k.startsWith(pref)) delete E.datos[k];
      for (const x of lista || []) E.datos[pref + x.id] = limpia(x);
    };
    if (camino === '/api/citas') pon('cita:', j.citas, x => x);
    else if (camino === '/api/insumos') pon('insumo:', j.insumos, ({ bajo, ...x }) => x);            /* «bajo» lo calcula el motor */
    else if (camino === '/api/vehiculos') pon('vehiculo:', j.vehiculos, ({ proximas, ...x }) => x);  /* «proximas» también */
    else if (camino === '/api/tablero') { E.extra.bot = j.bot; E.extra.avisos = j.avisos; }          /* lo del bot no se puede recalcular aquí */
    else if (camino === '/api/numeros') E.extra.numeros = j;
    else return;
    E.al = ahora(); guardar();
  }
  function parchar(j) {
    if (j.cita?.id) E.datos['cita:' + j.cita.id] = j.cita;
    if (j.garantia?.id) E.datos['cita:' + j.garantia.id] = j.garantia;
    if (j.insumo?.id) { const { bajo, ...x } = j.insumo; E.datos['insumo:' + x.id] = x; }
    if (j.vehiculo?.id) { const { proximas, ...x } = j.vehiculo; E.datos['vehiculo:' + x.id] = x; }
    guardar();
  }

  async function refrescar() {
    ultimoRefresco = ahora();
    for (const c of ['/api/citas', '/api/insumos', '/api/vehiculos', '/api/tablero']) {
      if (E.cola.length) return;                       /* entró algo a la cola mientras tanto: la réplica manda */
      const j = await red('GET', c);
      if (j.sinRed) { estado.sinRed = true; return; }
      if (j.bien) absorber(c, j);
    }
  }

  /* Un servicio creado sin señal tiene un id de aquí; el servidor le pone otro. Lo que se hizo después
     sobre ese servicio (marcarlo hecho, por ejemplo) tiene que viajar con el id del servidor. */
  const conIds = (b) => { const c = { ...b }; for (const k of ['id', 'cita', 'vehiculo']) if (c[k] && E.ids[c[k]]) c[k] = E.ids[c[k]]; return c; };
  const idDe = (j) => j.cita?.id || j.insumo?.id || j.vehiculo?.id || null;

  function enviarCola() {
    if (soloLocal) return Promise.resolve();
    if (enviando) return enviando;                     /* nunca dos envíos a la vez: mandaría doble */
    enviando = (async () => {
      let salio = 0;
      while (E.cola.length) {
        const it = E.cola[0];
        it.intentos = (it.intentos || 0) + 1; guardar();
        const j = await red('POST', it.ruta, conIds(it.cuerpo));
        if (AHORITA_NO(j)) { estado.sinRed = !!j.sinRed; estado.detenida = j.sinRed ? null : (j.error || 'El servidor no está contestando.'); break; }
        estado.sinRed = false; estado.detenida = null;
        E.cola.shift(); salio++;
        if (j.bien) {
          if (it.local && idDe(j)) E.ids[it.local] = idDe(j);
          if (it.localGarantia && j.garantia?.id) E.ids[it.localGarantia] = j.garantia.id;
        } else {
          E.rechazados.push({ que: it.que, error: j.error || 'El servidor no lo aceptó.', cuando: it.cuando });
        }
        guardar();
      }
      if (salio && !E.cola.length) { E.ids = {}; await refrescar(); }   /* la verdad vuelve a ser la del servidor */
    })().finally(() => { enviando = null; });
    return enviando;
  }

  async function api(metodo, ruta, cuerpo) {
    const camino = ruta.split('?')[0];
    if (soloLocal) { const j = await local(metodo, camino, cuerpo); if (metodo !== 'GET' && j.bien) guardar(); return j; }
    if (E.cola.length) await enviarCola();             /* primero lo pendiente */

    if (metodo === 'GET') {
      if (!E.cola.length) {
        const j = await red(metodo, ruta);
        if (!j.sinRed) {
          estado.sinRed = false;
          if (j.bien) {
            absorber(camino, j);
            if (autoRefresco && camino === '/api/tablero' && ahora() - ultimoRefresco > 60000) refrescar();   /* sin esperar */
          }
          return j;
        }
        estado.sinRed = true;
      }
      /* Sin señal y sin nada guardado: decirlo. Una lista vacía se leería como «no hay servicios». */
      if (!E.al) return { bien: false, error: 'Sin internet, y este teléfono todavía no tiene nada guardado. Ábrelo una vez con señal.' };
      return local(metodo, camino);
    }

    if (!E.cola.length) {
      const j = await red(metodo, ruta, cuerpo);
      if (!j.sinRed) { estado.sinRed = false; if (j.bien) parchar(j); return j; }
    }
    estado.sinRed = true;
    const que = describir(camino, cuerpo || {}, E.datos);
    const j = await local(metodo, camino, cuerpo);
    if (!j.bien) return j;                             /* la misma regla del servidor dijo que no: no se encola */
    /* «idem» identifica cada cambio. El servidor todavía no lo usa (ver LEEME): cuando lo use, un cambio
       que sí llegó pero cuya respuesta se perdió no se aplicará dos veces. */
    E.cola.push({ n: ++E.n, ruta: camino, cuerpo: { ...cuerpo, idem: azar() }, cuando: ahora(), que,
      local: cuerpo?.id ? null : idDe(j), localGarantia: j.garantia?.id || null });
    guardar();
    return { ...j, pendiente: true };
  }

  return {
    api, enviarCola, refrescar,
    olvidarRechazados: () => { E.rechazados = []; guardar(); },
    estado: () => ({ ...estado, muestra: soloLocal, al: E.al, pendientes: E.cola.length, cola: E.cola.map(c => c.que), rechazados: copia(E.rechazados) }),
  };
}
