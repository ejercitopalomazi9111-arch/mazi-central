/* Alba · la app. Sin dependencias, sin red: todo vive en este teléfono.
   Si corre dentro del APK, window.AlbaNativo programa las notificaciones con el sistema (llegan aunque la
   app esté cerrada) y ofrece la huella; en el navegador, las notificaciones salen al abrir la app.
   Las fechas se manejan como 'AAAA-MM-DD' y se cuentan en días UTC: así el cambio de horario no mueve nada. */
(function () {
  'use strict';
  var A = window.ALBA, N = window.AlbaNativo || null;
  var PARA = 'Isis', FIRMA = 'tu esposo';   // los mensajes del día van firmados por él   // para quién es Alba: así la saluda desde el primer momento (lo puede cambiar)
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ic = function (n, cl) { return '<svg class="ic ' + (cl || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ((window.ICONOS || {})[n] || '') + '</svg>'; };

  /* ═════════ fechas ═════════ */
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function num(s) { var p = s.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5); }
  function deNum(n) { return new Date(n * 864e5).toISOString().slice(0, 10); }
  function suma(s, k) { return deNum(num(s) + k); }
  function dif(a, b) { return num(b) - num(a); }
  function hoy() { var d = new Date(); return deNum(Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5)); }
  function partes(s) { var p = s.split('-'); return { a: +p[0], m: +p[1] - 1, d: +p[2], s: new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay() }; }
  function larga(s) { var p = partes(s); return DIAS[p.s] + ' ' + p.d + ' de ' + MESES[p.m]; }
  function corta(s) { var p = partes(s); return DIAS[p.s].slice(0, 3) + ' ' + p.d + ' ' + MESES[p.m].slice(0, 3); }
  function mayus(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function enDias(n) { return n === 0 ? 'hoy' : n === 1 ? 'mañana' : 'en ' + n + ' días'; }
  function media(l) { return l.reduce(function (a, b) { return a + b; }, 0) / l.length; }

  /* ═════════ datos ═════════ */
  var CLAVE = 'alba.v1';
  function nuevo() {
    return { v: 1, perfil: null, acceso: null, listo: false, periodo: [], abierto: null, dias: {}, mios: [], visto: null, avisados: {},
      ajustes: { ciclo: 28, periodo: 5, tema: 'auto', huella: false,
        rec: { mensaje: true, horaMensaje: '08:00', periodo: true, antes: 2, fertil: true, diario: true, horaDiario: '21:00', pastilla: false, horaPastilla: '09:00', hora: '09:00' } } };
  }
  var D;
  try { D = JSON.parse(localStorage.getItem(CLAVE)) || nuevo(); } catch (e) { D = nuevo(); }
  (function completar(b, d) { for (var k in b) if (!(k in d)) d[k] = b[k]; else if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) completar(b[k], d[k]); })(nuevo(), D);
  function guardar(silencio) {
    try { localStorage.setItem(CLAVE, JSON.stringify(D)); } catch (e) { toast('No se pudo guardar: el teléfono no tiene espacio.'); return; }
    if (!silencio) programar();
  }

  /* ═════════ acceso: PIN con sal, SHA-256 repetido ═════════
     SHA-256 propio: WebCrypto exige contexto seguro y dentro del APK la página abre desde file://. */
  function sha256(m) {
    function r(n, x) { return (x >>> n) | (x << (32 - n)); }
    var K = [], H = [], i, j, p = 2, c = 0;
    while (c < 64) { for (j = 2; j * j <= p; j++) if (p % j === 0) break; if (j * j > p) { if (c < 8) H[c] = (Math.pow(p, 1 / 2) * 4294967296) | 0; K[c++] = (Math.pow(p, 1 / 3) * 4294967296) | 0; } p++; }
    m = unescape(encodeURIComponent(m)); var l = m.length * 8, w = [];
    for (i = 0; i < m.length; i++) w[i >> 2] |= m.charCodeAt(i) << (24 - (i % 4) * 8);
    w[l >> 5] |= 0x80 << (24 - l % 32); w[((l + 64 >> 9) << 4) + 15] = l;
    for (i = 0; i < w.length; i += 16) {
      var a = H.slice(0), W = [];
      for (j = 0; j < 64; j++) {
        if (j < 16) W[j] = w[i + j] | 0; else { var s0 = r(7, W[j - 15]) ^ r(18, W[j - 15]) ^ (W[j - 15] >>> 3), s1 = r(17, W[j - 2]) ^ r(19, W[j - 2]) ^ (W[j - 2] >>> 10); W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0; }
        var t1 = (a[7] + (r(6, a[4]) ^ r(11, a[4]) ^ r(25, a[4])) + ((a[4] & a[5]) ^ (~a[4] & a[6])) + K[j] + W[j]) | 0;
        var t2 = ((r(2, a[0]) ^ r(13, a[0]) ^ r(22, a[0])) + ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]))) | 0;
        a = [(t1 + t2) | 0].concat(a); a[4] = (a[4] + t1) | 0; a.length = 8;
      }
      for (j = 0; j < 8; j++) H[j] = (H[j] + a[j]) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  function huellaPIN(pin, sal) { var h = sal; for (var i = 0; i < 4000; i++) h = sha256(h + ':' + pin + ':' + sal); return h; }
  function sal() { var a = new Uint32Array(4); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 4294967296; }); return Array.prototype.map.call(a, function (x) { return x.toString(16); }).join(''); }

  /* ═════════ el ciclo ═════════ */
  function rellenarAbierto(h) {
    if (!D.abierto) return;
    var tope = Math.min(num(h), num(D.abierto) + promedios().periodo - 1);
    for (var n = num(D.abierto); n <= tope; n++) marcarPeriodo(deNum(n), true, true);
    if (num(h) - num(D.abierto) >= promedios().periodo) D.abierto = null;
  }
  function marcarPeriodo(s, si, quieto) {
    var i = D.periodo.indexOf(s);
    if (si && i < 0) { D.periodo.push(s); D.periodo.sort(); }
    if (!si && i >= 0) D.periodo.splice(i, 1);
    var d = D.dias[s] || (D.dias[s] = {});
    if (si && !(d.flujo >= 2)) d.flujo = 3;
    if (!si && d.flujo >= 2) d.flujo = 0;
    if (!quieto) guardar();
  }
  function corridas() {
    var r = [], c = null;
    D.periodo.slice().sort().forEach(function (s) {
      if (c && dif(c.fin, s) <= 2) c.fin = s; else { c = { inicio: s, fin: s }; r.push(c); }
    });
    r.forEach(function (x) { x.dias = dif(x.inicio, x.fin) + 1; });
    return r;
  }
  function promedios() {
    var c = corridas(), largos = [];
    for (var i = 1; i < c.length; i++) { var L = dif(c[i - 1].inicio, c[i].inicio); if (L >= 15 && L <= 60) largos.push(L); }
    var u = largos.slice(-6), cerrados = c.filter(function (x) { return !(D.abierto && x.inicio === D.abierto); }).slice(-6).map(function (x) { return x.dias; });
    return { corridas: c, largos: largos, ciclo: u.length ? Math.round(media(u)) : D.ajustes.ciclo, periodo: cerrados.length ? Math.round(media(cerrados)) : D.ajustes.periodo,
      variacion: u.length >= 2 ? Math.max.apply(0, u) - Math.min.apply(0, u) : null, medidos: u.length };
  }
  var C = null;   // el cálculo vigente
  function calcular() {
    var h = hoy(); rellenarAbierto(h);
    var p = promedios(), u = p.corridas[p.corridas.length - 1] || null;
    C = { hoy: h, p: p, ultimo: u, mapa: {}, fase: null };
    if (!u) return C;
    C.dia = dif(u.inicio, h) + 1;
    C.enPeriodo = dif(u.inicio, h) >= 0 && (dif(h, u.fin) >= 0 || (D.abierto && D.abierto === u.inicio));
    C.proximo = suma(u.inicio, p.ciclo);
    C.retraso = !C.enPeriodo && dif(C.proximo, h) > 0 ? dif(C.proximo, h) : 0;
    /* ovulación ≈ 14 días antes del siguiente periodo (fase lútea); fértil: los 5 días previos y el siguiente */
    var base = C.retraso ? h : C.proximo;
    C.ovulacion = suma(C.proximo, -14); C.fertil = [suma(C.ovulacion, -5), suma(C.ovulacion, 1)];
    for (var k = 0; k < 7; k++) {
      var ini = k === 0 ? C.proximo : suma(C.proximo, p.ciclo * k);
      if (C.retraso && k > 0) ini = suma(base, p.ciclo * k);
      for (var j = 0; j < p.periodo; j++) pon(suma(ini, j), 'pred');
      for (j = 1; j <= 5; j++) pon(suma(ini, -j), 'spm');
      var ov = suma(ini, -14); for (j = -5; j <= 1; j++) pon(suma(ov, j), j === 0 ? 'ovulacion' : 'fertil');
    }
    /* el ciclo en curso también lleva sus días (para el anillo y el calendario) */
    var ovA = C.ovulacion; for (j = -5; j <= 1; j++) pon(suma(ovA, j), j === 0 ? 'ovulacion' : 'fertil', true);
    D.periodo.forEach(function (s) { C.mapa[s] = 'periodo'; });
    /* lo que le falta al periodo en curso se ve como previsto */
    if (D.abierto) for (j = 0; j < p.periodo; j++) { var sa = suma(D.abierto, j); if (dif(h, sa) > 0 && C.mapa[sa] !== 'periodo') C.mapa[sa] = 'pred'; }
    C.fase = faseDe(h);
    return C;
    function pon(s, t, fuerza) { if (C.mapa[s] !== 'periodo' && (fuerza || !C.mapa[s] || C.mapa[s] === 'spm')) C.mapa[s] = t; }
  }
  function faseDe(s) {
    if (!C.ultimo) return null;
    if (C.mapa[s] === 'periodo') return 'menstruacion';
    if (s === C.ovulacion) return 'ovulacion';
    if (dif(C.fertil[0], s) >= 0 && dif(s, C.fertil[1]) >= 0) return 'fertil';
    var falta = dif(s, C.proximo);
    if (falta >= 1 && falta <= 5) return 'premenstrual';
    if (dif(s, C.fertil[0]) > 0) return 'folicular';
    return 'lutea';
  }
  function alertas() {
    var p = C.p, l = [];
    if (p.medidos >= 2 && (p.ciclo < 21 || p.ciclo > 35)) l.push('Tus ciclos promedian ' + p.ciclo + ' días, fuera del rango habitual de 21 a 35. Vale la pena comentarlo con tu ginecóloga.');
    if (p.variacion != null && p.medidos >= 3 && p.variacion > 9) l.push('Tus ciclos varían ' + p.variacion + ' días entre el más corto y el más largo. Más de 9 se considera irregular: coméntalo en tu próxima consulta.');
    var largo = p.corridas.filter(function (x) { return x.dias > 8; }).slice(-1)[0];
    if (largo && dif(largo.fin, C.hoy) < 60) l.push('Tu periodo del ' + corta(largo.inicio) + ' duró ' + largo.dias + ' días. Si pasa de 8 días seguido, conviene revisarlo con tu médica.');
    if (C.retraso >= 7) l.push('Tu periodo lleva ' + C.retraso + ' días de retraso. El estrés o los viajes pueden moverlo; si tienes dudas, una prueba o tu médica te sacan de ella.');
    return l;
  }

  /* ═════════ mensaje del día ═════════ */
  function mensajeDe(s) {
    var n = num(s), po = A.poemas[n % A.poemas.length], fr = A.frases[(n * 7 + 3) % A.frases.length], mio = null;
    if (D.mios.length && n % 3 === 0) mio = D.mios[Math.floor(n / 3) % D.mios.length];
    return { poema: po, frase: mio || fr, mio: !!mio };
  }

  /* ═════════ recordatorios ═════════ */
  function aMs(s, hora) { var p = partes(s), h = (hora || '09:00').split(':'); return new Date(p.a, p.m, p.d, +h[0], +h[1], 0).getTime(); }
  function avisos() {
    var r = D.ajustes.rec, l = [], ahora = Date.now(), h = C.hoy, nombre = D.perfil ? D.perfil.nombre : '', id = 1;
    function agrega(s, hora, t, x) { var c = aMs(s, hora); if (c > ahora + 30000) l.push({ id: id++, cuando: c, titulo: t, texto: x }); else id++; }
    for (var k = 0; k < 30; k++) {
      var s = suma(h, k);
      if (r.mensaje) { var m = mensajeDe(s); agrega(s, r.horaMensaje, 'Buenos días' + (nombre ? ', ' + nombre : ''), 'Tu esposo te dejó tu mensaje de hoy: «' + m.poema.v[0].replace(/[,;:]$/, '') + '…»'); } else id++;
      if (r.diario) agrega(s, r.horaDiario, '¿Cómo te sientes hoy?', 'Registra tu día en diez segundos: ánimo, síntomas o flujo.'); else id++;
      if (r.pastilla) agrega(s, r.horaPastilla, 'Hora de tu pastilla', 'Tómala y márcala en Alba para no perder la cuenta.'); else id++;
    }
    if (C.ultimo) {
      var vistos = {};
      for (var c = 0; c < 3; c++) {
        var ini = suma(C.proximo, C.p.ciclo * c); if (C.retraso && c) ini = suma(h, C.p.ciclo * c);
        if (r.periodo && r.antes > 0) agrega(suma(ini, -r.antes), r.hora, 'Tu periodo se acerca', 'Podría llegar ' + enDias(r.antes) + ' (' + corta(ini) + '). Ten lo necesario a la mano.'); else id++;
        if (r.periodo) agrega(ini, r.hora, 'Hoy podría llegar tu periodo', 'Cuando llegue, márcalo en Alba: así las predicciones se afinan.'); else id++;
        if (r.periodo) agrega(suma(ini, 3), r.hora, '¿Ya llegó tu periodo?', 'Si ya empezó, regístralo; si no, Alba lleva la cuenta del retraso.'); else id++;
        var ov = suma(ini, -14);
        if (r.fertil && !vistos[ov]) { vistos[ov] = 1; agrega(suma(ov, -5), r.hora, 'Empieza tu ventana fértil', 'Es una estimación de Alba, no un método anticonceptivo.'); agrega(ov, r.hora, 'Ovulación estimada', 'Hoy es tu día de ovulación según tus fechas.'); } else id += 2;
      }
    }
    return l.sort(function (a, b) { return a.cuando - b.cuando; }).slice(0, 60);
  }
  function programar() {
    if (!C || !D.listo) return;
    var l = avisos();
    if (N && N.programar) { try { N.programar(JSON.stringify(l)); } catch (e) {} return; }
    avisarWeb(l);
  }
  /* sin APK: lo que toca hoy y ya pasó su hora se avisa al abrir; lo de las próximas horas, mientras siga abierta */
  var timers = [];
  function avisarWeb(l) {
    timers.forEach(clearTimeout); timers = [];
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    l.forEach(function (a) { var falta = a.cuando - Date.now(); if (falta > 0 && falta < 6 * 3600e3) timers.push(setTimeout(function () { notificarWeb(a); }, falta)); });
  }
  function notificarWeb(a) {
    if (D.avisados[a.titulo + a.cuando]) return; D.avisados[a.titulo + a.cuando] = 1; guardar(true);
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification(a.titulo, { body: a.texto, icon: 'icono-192.png', badge: 'icono-192.png' }); }).catch(function () { try { new Notification(a.titulo, { body: a.texto }); } catch (e) {} });
    else try { new Notification(a.titulo, { body: a.texto }); } catch (e) {}
  }
  function pedirPermiso(alListo) {
    if (N && N.permisoNotificaciones) {
      if (estadoPermiso() === 'concedido') { alListo(); return; }
      var hecho = false, una = function () { if (hecho) return; hecho = true; window.albaPermiso = null; alListo(); };
      window.albaPermiso = una; N.permisoNotificaciones(); setTimeout(una, 20000); return;   // Android contesta cuando ella decide
    }
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(alListo); else alListo();
  }
  function estadoPermiso() {
    if (N && N.estadoNotificaciones) return N.estadoNotificaciones();
    return 'Notification' in window ? ({ granted: 'concedido', denied: 'negado', default: 'pendiente' })[Notification.permission] : 'no';
  }

  /* ═════════ utilidades de interfaz ═════════ */
  var raiz = $('#app');
  function toast(t) {
    var e = $('#toast'); e.textContent = t; e.classList.add('ve'); clearTimeout(toast.t);
    toast.t = setTimeout(function () { e.classList.remove('ve'); }, 2800);
    e.onclick = function () { clearTimeout(toast.t); e.classList.remove('ve'); };   // si estorba, se quita con un toque
  }
  function vibrar(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
  function tema() { var t = D.ajustes.tema; if (t === 'auto') document.documentElement.removeAttribute('data-tema'); else document.documentElement.setAttribute('data-tema', t); }
  function hoja(html, alCerrar) {
    var f = $('#hoja'), c = $('.hoja__caja', f); c.innerHTML = '<button class="hoja__x" type="button" aria-label="Cerrar">' + ic('x') + '</button>' + html;
    f.hidden = false; requestAnimationFrame(function () { f.classList.add('abierta'); });
    function cerrar() { f.classList.remove('abierta'); setTimeout(function () { f.hidden = true; c.innerHTML = ''; if (alCerrar) alCerrar(); }, 620); }
    $('.hoja__x', c).onclick = cerrar; f.onclick = function (e) { if (e.target === f) cerrar(); };
    return { caja: c, cerrar: cerrar };
  }
  function cuenta(el, n) {
    if (suaveMov) { el.textContent = n; return; }
    var t0 = performance.now(); (function p(t) { var k = Math.min(1, (t - t0) / 1500); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(p); })(t0);
  }
  var suaveMov = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═════════ acceso ═════════ */
  var fallos = 0, bloqueadoHasta = 0;
  function pantallaAcceso() {
    var crear = !D.acceso;
    document.body.className = 'en-acceso';
    raiz.innerHTML = '<section class="acceso">' + logo() +
      (crear ? '<h1 class="acceso__t">Hola, ' + PARA + '</h1><p class="acceso__s">Alba es para ti: tu ciclo, con cariño. Todo se queda en este teléfono.</p>' +
        '<label class="campo acceso__nombre"><span>¿Cómo quieres que te llame?</span><input id="nombre" autocomplete="given-name" maxlength="24" value="' + PARA + '" placeholder="Tu nombre"></label>' +
        '<p class="acceso__pide" id="pide">Crea un PIN de 4 dígitos</p>'
        : '<h1 class="acceso__t">Hola, ' + esc(D.perfil.nombre) + '</h1><p class="acceso__pide" id="pide">Escribe tu PIN</p>') +
      '<div class="puntos" id="puntos" aria-live="polite"><i></i><i></i><i></i><i></i></div>' +
      '<div class="teclado" id="teclado">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-n="' + n + '">' + n + '</button>'; }).join('') +
      (!crear && D.ajustes.huella && N && N.hayHuella && N.hayHuella() ? '<button type="button" class="tecla-huella" data-huella aria-label="Usar huella">' + ic('fingerprint-pattern') + '</button>' : '<span></span>') +
      '<button type="button" data-n="0">0</button><button type="button" class="tecla-borra" data-borra aria-label="Borrar">' + ic('chevron-left') + '</button></div>' +
      (!crear ? '<button type="button" class="enlace" data-olvide>Olvidé mi PIN</button>' : '') + '</section>';
    var pin = '', primero = null;
    function pinta() { $$('#puntos i').forEach(function (e, i) { e.classList.toggle('lleno', i < pin.length); }); }
    function error(t) { var p = $('#puntos'); p.classList.remove('tiembla'); void p.offsetWidth; p.classList.add('tiembla'); vibrar(80); $('#pide').textContent = t; pin = ''; setTimeout(pinta, 220); }
    function listo() {
      if (crear) {
        var nombre = ($('#nombre').value || '').trim();
        if (!nombre) { error('Primero escribe tu nombre'); $('#nombre').focus(); return; }
        if (!primero) { primero = pin; pin = ''; pinta(); $('#pide').textContent = 'Escríbelo otra vez para confirmar'; return; }
        if (primero !== pin) { primero = null; error('No coincidieron. Crea tu PIN de nuevo'); return; }
        var s = sal(); D.perfil = { nombre: nombre, desde: hoy() }; D.acceso = { sal: s, h: huellaPIN(pin, s) }; guardar(true);
        entrar(); return;
      }
      if (Date.now() < bloqueadoHasta) { error('Espera unos segundos e intenta de nuevo'); return; }
      if (huellaPIN(pin, D.acceso.sal) === D.acceso.h) { fallos = 0; entrar(); }
      else { fallos++; if (fallos >= 5) { bloqueadoHasta = Date.now() + 30000; fallos = 0; error('Demasiados intentos. Espera 30 segundos'); } else error('PIN incorrecto'); }
    }
    $('#teclado').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; vibrar(8);
      if (b.hasAttribute('data-borra')) { pin = pin.slice(0, -1); pinta(); return; }
      if (b.hasAttribute('data-huella')) { N.huella(); return; }
      if (pin.length < 4) { pin += b.getAttribute('data-n'); pinta(); if (pin.length === 4) setTimeout(listo, 140); }
    });
    var olv = $('[data-olvide]'); if (olv) olv.onclick = function () {
      var h = hoja('<h2 class="hoja__t">¿Olvidaste tu PIN?</h2><p>Para cuidar tu privacidad, Alba no guarda tu PIN en ningún lado y no hay forma de recuperarlo.</p><p>Puedes borrar todo y empezar de nuevo. <b>Se perderán tus registros</b>, salvo que tengas un respaldo.</p><button class="boton boton--peligro" type="button" data-borrar>Borrar todo y empezar</button>');
      $('[data-borrar]', h.caja).onclick = function () { localStorage.removeItem(CLAVE); location.reload(); };
    };
    if (!crear && D.ajustes.huella && N && N.hayHuella && N.hayHuella()) setTimeout(function () { N.huella(); }, 400);
  }
  window.albaHuella = function (ok) { if (ok && document.body.className === 'en-acceso' && D.acceso) entrar(); };
  function logo() { return '<div class="logo" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><mask id="lunaM"><rect width="120" height="120" fill="#fff"/><circle class="logo__sombra" cx="78" cy="48" r="33" fill="#000"/></mask></defs><circle class="logo__luna" cx="60" cy="60" r="38" mask="url(#lunaM)"/><path class="logo__flor" d="M60 96c0-14 8-22 20-26M60 96c0-12-6-19-16-22" /><circle class="logo__brote" cx="81" cy="69" r="3.5"/></svg></div>'; }

  var desbloqueada = false, ocultaDesde = 0;
  function entrar() {
    desbloqueada = true; calcular();
    if (!D.listo) { bienvenida(); return; }
    if (D.visto !== C.hoy) mensajeDelDia(true); else inicio('hoy');
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) ocultaDesde = Date.now();
    else if (desbloqueada && ocultaDesde && Date.now() - ocultaDesde > 60000) { desbloqueada = false; pantallaAcceso(); }
  });
  window.albaVolvio = function () { if (!desbloqueada) return; calcular(); programar(); };

  /* ═════════ mensaje del día ═════════ */
  function mensajeDelDia(alEntrar) {
    var m = mensajeDe(C.hoy), nombre = D.perfil.nombre;
    var capa = document.createElement('section'); capa.className = 'mensaje'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', 'Mensaje del día');
    capa.innerHTML = '<canvas class="mensaje__petalos" aria-hidden="true"></canvas><div class="mensaje__caja">' +
      '<p class="mensaje__fecha">' + mayus(larga(C.hoy)) + '</p><p class="mensaje__para">Para ti, ' + esc(nombre) + '</p>' +
      '<span class="mensaje__corazon">' + ic('heart') + '</span>' +
      '<blockquote class="mensaje__poema">' + m.poema.v.map(function (v, i) { return '<span class="verso" style="--i:' + i + '"><span>' + esc(v) + '</span></span>'; }).join('') + '</blockquote>' +
      '<p class="mensaje__autor" style="--i:' + m.poema.v.length + '">' + esc(m.poema.a) + ' · <i>' + esc(m.poema.o) + '</i></p>' +
      '<p class="mensaje__frase" style="--i:' + (m.poema.v.length + 1) + '">' + esc(m.frase) + '<span class="mensaje__firma">— ' + FIRMA + '</span></p>' +
      '<button class="boton boton--lleno mensaje__ir" type="button">' + (alEntrar ? 'Entrar' : 'Cerrar') + '</button></div>';
    document.body.appendChild(capa); requestAnimationFrame(function () { capa.classList.add('ve'); });
    petalos($('.mensaje__petalos', capa));
    $('.mensaje__ir', capa).onclick = function () {
      D.visto = C.hoy; guardar(true); capa.classList.add('sale');
      setTimeout(function () { capa.remove(); }, 1000); if (alEntrar) setTimeout(function () { inicio('hoy'); }, 380);
    };
  }
  function petalos(cv) {
    var g = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), P = [], vivo = true;
    function medir() { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
    medir(); for (var i = 0; i < 16; i++) P.push({ x: Math.random(), y: Math.random() * -1, s: 6 + Math.random() * 9, r: Math.random() * 6.28, v: 0.018 + Math.random() * 0.025, f: Math.random() * 6.28 });
    var t0 = performance.now();
    (function cuadro(t) {
      if (!cv.isConnected) return;
      var dt = Math.min(0.05, (t - t0) / 1000); t0 = t; g.clearRect(0, 0, cv.width, cv.height);
      P.forEach(function (p) {
        p.y += p.v * dt * (suaveMov ? 0.35 : 1); p.r += dt * 0.25; if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        var x = (p.x + Math.sin(t * 0.00035 + p.f) * 0.03) * cv.width, y = p.y * cv.height, s = p.s * dpr;
        g.save(); g.translate(x, y); g.rotate(p.r); g.fillStyle = 'rgba(232,129,151,.35)';
        g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s); g.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s); g.fill(); g.restore();
      });
      if (vivo) requestAnimationFrame(cuadro);
    })(t0);
  }

  /* ═════════ bienvenida (primera vez) ═════════ */
  function bienvenida() {
    document.body.className = 'en-bienvenida';
    var paso = 0, ultima = null, ciclo = D.ajustes.ciclo, per = D.ajustes.periodo, vistaMes = hoy().slice(0, 7);
    function pinta() {
      var cont = [
        function () { return '<h1>¿Cuándo empezó tu último periodo?</h1><p class="sub">Toca el primer día. Si no lo recuerdas, puedes registrarlo después.</p>' + miniCal(vistaMes, ultima) + '<button class="enlace" type="button" data-salta>No lo recuerdo</button>'; },
        function () { return '<h1>¿Cada cuántos días te baja?</h1><p class="sub">De un primer día de periodo al siguiente. Si no lo sabes, deja 28: Alba aprende con tus registros.</p>' + paso2('ciclo', ciclo, 18, 45); },
        function () { return '<h1>¿Cuántos días te dura?</h1><p class="sub">Casi siempre entre 3 y 7.</p>' + paso2('per', per, 2, 10); },
        function () { return '<h1>Te aviso a tiempo</h1><p class="sub">Alba puede recordarte cuándo se acerca tu periodo, tu ventana fértil, registrar tu día y tu mensaje de cada mañana.</p><ul class="lista-aviso"><li>' + ic('droplet') + 'Tu periodo, 2 días antes</li><li>' + ic('sprout') + 'Tu ventana fértil</li><li>' + ic('heart') + 'Tu mensaje del día, a las 8:00</li><li>' + ic('notebook-pen') + 'Registrar cómo te sientes, a las 21:00</li></ul>'; }
      ][paso]();
      raiz.innerHTML = '<section class="bienvenida"><div class="pasos">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i <= paso ? 'si' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="bienvenida__cuerpo entra">' + cont + '</div><div class="bienvenida__pie">' + (paso ? '<button class="boton" type="button" data-atras>Atrás</button>' : '<span></span>') +
        '<button class="boton boton--lleno" type="button" data-sigue>' + (paso === 3 ? 'Activar avisos' : 'Siguiente') + '</button></div>' +
        (paso === 3 ? '<button class="enlace" type="button" data-sin>Ahora no</button>' : '') + '</section>';
    }
    function paso2(k, v, mn, mx) { return '<div class="contador" data-k="' + k + '"><button type="button" data-d="-1" aria-label="Menos">−</button><b>' + v + '</b><span>días</span><button type="button" data-d="1" aria-label="Más">+</button></div><input type="range" class="regla" min="' + mn + '" max="' + mx + '" value="' + v + '" data-k="' + k + '" aria-label="Días">'; }
    function fin(conAvisos) {
      D.ajustes.ciclo = ciclo; D.ajustes.periodo = per;
      if (ultima) for (var j = 0; j < per; j++) { var s = suma(ultima, j); if (dif(s, hoy()) >= 0) marcarPeriodo(s, true, true); }
      if (ultima && dif(ultima, hoy()) < per) D.abierto = ultima;
      if (!conAvisos) ['mensaje', 'periodo', 'fertil', 'diario'].forEach(function (k) { D.ajustes.rec[k] = false; });
      D.listo = true; guardar(true); calcular();
      if (conAvisos) pedirPermiso(function () { programar(); }); else programar();
      mensajeDelDia(true);
    }
    raiz.onclick = function (e) {
      var b = e.target.closest('button'); if (!b || document.body.className !== 'en-bienvenida') return;
      if (b.hasAttribute('data-dia')) { ultima = b.getAttribute('data-dia'); pinta(); return; }
      if (b.hasAttribute('data-mes')) { var p = vistaMes.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1 + +b.getAttribute('data-mes'), 1)); vistaMes = d.toISOString().slice(0, 7); pinta(); return; }
      if (b.hasAttribute('data-d')) { var k = b.closest('.contador').getAttribute('data-k'), dd = +b.getAttribute('data-d'); if (k === 'ciclo') ciclo = Math.max(18, Math.min(45, ciclo + dd)); else per = Math.max(2, Math.min(10, per + dd)); pinta(); return; }
      if (b.hasAttribute('data-salta')) { ultima = null; paso = 1; pinta(); return; }
      if (b.hasAttribute('data-atras')) { paso--; pinta(); return; }
      if (b.hasAttribute('data-sigue')) { if (paso === 0 && !ultima) { toast('Toca el primer día, o «No lo recuerdo»'); return; } if (paso < 3) { paso++; pinta(); } else fin(true); return; }
      if (b.hasAttribute('data-sin')) fin(false);
    };
    raiz.oninput = function (e) { if (e.target.classList.contains('regla')) { if (e.target.getAttribute('data-k') === 'ciclo') ciclo = +e.target.value; else per = +e.target.value; $('.contador b').textContent = e.target.value; } };
    pinta();
  }
  function miniCal(mes, sel) {
    var p = mes.split('-'), a = +p[0], m = +p[1] - 1, primero = new Date(Date.UTC(a, m, 1)).getUTCDay(), total = new Date(Date.UTC(a, m + 1, 0)).getUTCDate(), h = hoy(), html = '';
    for (var i = 0; i < (primero + 6) % 7; i++) html += '<span></span>';
    for (var d = 1; d <= total; d++) { var s = deNum(Math.round(Date.UTC(a, m, d) / 864e5)), fut = dif(h, s) > 0; html += '<button type="button" ' + (fut ? 'disabled ' : 'data-dia="' + s + '" ') + 'class="' + (s === sel ? 'sel' : '') + (s === h ? ' hoy' : '') + '">' + d + '</button>'; }
    return '<div class="minical"><div class="minical__cab"><button type="button" data-mes="-1" aria-label="Mes anterior">' + ic('chevron-left') + '</button><b>' + mayus(MESES[m]) + ' ' + a + '</b><button type="button" data-mes="1" aria-label="Mes siguiente">' + ic('chevron-right') + '</button></div><div class="minical__sem">' + 'LMMJVSD'.split('').map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="minical__dias">' + html + '</div></div>';
  }

  /* ═════════ la app: pestañas ═════════ */
  var actual = 'hoy', mesVista = null;
  function inicio(p) {
    document.body.className = 'en-app';
    raiz.innerHTML = '<main class="pantalla" id="pantalla"></main><nav class="barra" aria-label="Secciones">' +
      [['hoy', 'house', 'Hoy'], ['calendario', 'calendar-days', 'Calendario'], ['tendencias', 'chart-column', 'Tendencias'], ['guia', 'book-heart', 'Guía'], ['ajustes', 'settings', 'Ajustes']].map(function (x) {
        return '<button type="button" data-p="' + x[0] + '">' + ic(x[1]) + '<span>' + x[2] + '</span></button>';
      }).join('') + '<i class="barra__luz" aria-hidden="true"></i></nav><button class="fab" type="button" data-p="registrar" aria-label="Registrar mi día">' + ic('plus') + '</button>';
    $('.barra').onclick = function (e) { var b = e.target.closest('[data-p]'); if (!b) return; vibrar(6); ir(b.getAttribute('data-p')); };
    $('.fab').onclick = function () { vibrar(6); registrar(C.hoy); };
    ir(p || 'hoy'); programar();
  }
  var ORDEN = ['hoy', 'calendario', 'tendencias', 'guia', 'ajustes'], guiaTab = 'cuidados';
  function ir(p) {
    var antes = ORDEN.indexOf(actual), ahora = ORDEN.indexOf(p); actual = p; calcular();
    var pant = $('#pantalla'); pant.className = 'pantalla ' + (ahora >= antes ? 'de-der' : 'de-izq'); void pant.offsetWidth;
    pant.innerHTML = PANT[p](); pant.classList.add('entra'); pant.scrollTop = 0; window.scrollTo(0, 0);
    $$('.barra [data-p]').forEach(function (b) { b.classList.toggle('activa', b.getAttribute('data-p') === p); });
    var b = $('.barra [data-p="' + p + '"]'), l = $('.barra__luz'); if (b && l) { l.style.width = b.offsetWidth + 'px'; l.style.transform = 'translateX(' + b.offsetLeft + 'px)'; }
    if (DESPUES[p]) DESPUES[p](pant);
  }

  var PANT = {}, DESPUES = {};
  /* ── Hoy ── */
  PANT.hoy = function () {
    var f = C.fase ? A.fases[C.fase] : null, n = D.perfil.nombre, m = mensajeDe(C.hoy), h = C.hoy;
    var centro, sub;
    if (!C.ultimo) { centro = '<b class="anillo__n">–</b><span class="anillo__f">Sin datos</span>'; sub = 'Registra tu periodo para empezar a ver tu ciclo.'; }
    else {
      centro = '<span class="anillo__d">Día</span><b class="anillo__n" data-cuenta="' + C.dia + '">' + C.dia + '</b><span class="anillo__f">' + (f ? f.t : '') + '</span>';
      sub = C.enPeriodo ? 'Día ' + (dif(C.ultimo.inicio, h) + 1) + ' de tu periodo' : C.retraso ? 'Tu periodo lleva ' + C.retraso + (C.retraso === 1 ? ' día' : ' días') + ' de retraso' : 'Tu periodo llega ' + enDias(dif(h, C.proximo));
    }
    var accion = C.enPeriodo || D.abierto ? '<button class="boton boton--lleno" type="button" data-termino>' + ic('check') + 'Terminó mi periodo</button>' : '<button class="boton boton--lleno" type="button" data-empezo>' + ic('droplet') + 'Empezó mi periodo</button>';
    var al = C.ultimo ? alertas() : [];
    var reg = D.dias[h] || {}, tiene = Object.keys(reg).some(function (k) { var v = reg[k]; return Array.isArray(v) ? v.length : v != null && v !== '' && v !== 0 && v !== false; });
    return '<header class="cab"><div><p class="cab__fecha">' + mayus(larga(h)) + '</p><h1 class="cab__t">Hola, ' + esc(n) + '</h1></div><button class="cab__msj" type="button" data-mensaje aria-label="Ver el mensaje del día">' + ic('heart') + '</button></header>' +
      '<section class="anillo-caja">' + anillo() + '<div class="anillo__centro">' + centro + '</div></section>' +
      '<p class="estado">' + esc(sub) + '</p>' +
      '<div class="acciones">' + accion + '<button class="boton" type="button" data-hoy>' + ic(tiene ? 'pencil' : 'notebook-pen') + (tiene ? 'Editar mi día' : 'Registrar hoy') + '</button></div>' +
      (al.length ? '<section class="tarjeta tarjeta--aviso">' + ic('circle-alert', 'ic--aviso') + '<div>' + al.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div></section>' : '') +
      (f ? '<section class="tarjeta fase fase--' + f.c + '"><p class="eti">Qué está pasando</p><h2>' + f.t + '</h2><p>' + esc(f.que) + '</p><p class="fase__tip">' + ic('sparkles') + esc(f.tip) + '</p>' +
        (C.fase === 'menstruacion' || C.fase === 'premenstrual' ? '<button class="boton boton--ancho boton--suave" type="button" data-guia="cuidados">' + ic('hand-heart') + '¿Te duele mucho? Qué hacer</button>' : '') + '</section>' : '') +
      (C.ultimo ? '<section class="tarjeta"><p class="eti">Próximos días</p><ul class="proximos">' +
        '<li><i class="punto punto--periodo"></i><span>Próximo periodo</span><b>' + (C.retraso ? 'con retraso' : corta(C.proximo)) + '</b><em>' + (C.retraso ? '' : enDias(dif(h, C.proximo))) + '</em></li>' +
        (dif(h, C.fertil[1]) >= 0 ? '<li><i class="punto punto--fertil"></i><span>Ventana fértil</span><b>' + corta(C.fertil[0]) + ' – ' + corta(C.fertil[1]) + '</b><em>' + (dif(h, C.fertil[0]) > 0 ? enDias(dif(h, C.fertil[0])) : 'ahora') + '</em></li>' : '') +
        (dif(h, C.ovulacion) >= 0 ? '<li><i class="punto punto--ovulacion"></i><span>Ovulación estimada</span><b>' + corta(C.ovulacion) + '</b><em>' + enDias(dif(h, C.ovulacion)) + '</em></li>' : '') +
        '</ul><p class="nota">Son estimaciones con tus fechas. Alba no diagnostica ni es un método anticonceptivo.</p></section>' : '') +
      '<section class="tarjeta tarjeta--poema" data-mensaje><p class="eti">Tu mensaje de hoy · de ' + FIRMA + '</p><p class="poema-corto">' + esc(m.poema.v[0]) + '…</p><p class="nota">' + esc(m.poema.a) + ' · toca para leerlo</p></section>' +
      '<section class="tarjeta tarjeta--guia" data-guia="cuidados"><span class="tarjeta--guia__ic">' + ic('book-heart') + '</span><div><p class="eti">Guía</p><p><b>Cuidados del periodo y salud sexual</b></p><p class="nota">Qué hacer si duele mucho, cuándo ir al médico, métodos y cómo usarlos.</p></div>' + ic('chevron-right') + '</section>';
  };
  function anillo() {
    if (!C.ultimo) return '<svg class="anillo" viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="112" class="anillo__base"/></svg>';
    var L = Math.max(C.p.ciclo, C.dia), R = 112, segs = '', gap = L > 40 ? 0.6 : 1.2;
    for (var i = 0; i < L; i++) {
      var s = suma(C.ultimo.inicio, i), t = C.mapa[s] || 'nada', a0 = (i / L) * 360 + gap / 2, a1 = ((i + 1) / L) * 360 - gap / 2;
      if (t === 'pred' && dif(s, C.ultimo.fin) >= 0) t = 'periodo';
      segs += '<path class="seg seg--' + t + (s === C.hoy ? ' seg--hoy' : '') + '" style="--i:' + i + '" d="' + arco(130, 130, R, a0, a1) + '"/>';
    }
    var ah = ((C.dia - 0.5) / L) * 360 - 90, x = 130 + R * Math.cos(ah * Math.PI / 180), y = 130 + R * Math.sin(ah * Math.PI / 180);
    return '<svg class="anillo" viewBox="0 0 260 260" role="img" aria-label="Día ' + C.dia + ' de un ciclo de ' + L + ' días"><circle cx="130" cy="130" r="' + R + '" class="anillo__base"/>' + segs +
      '<circle class="anillo__hoy-halo" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="15"/><circle class="anillo__hoy" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="9"/></svg>';
  }
  function arco(cx, cy, r, a0, a1) {
    var p = function (a) { var t = (a - 90) * Math.PI / 180; return (cx + r * Math.cos(t)).toFixed(2) + ' ' + (cy + r * Math.sin(t)).toFixed(2); };
    return 'M' + p(a0) + ' A' + r + ' ' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + p(a1);
  }
  DESPUES.hoy = function (el) {
    $$('[data-cuenta]', el).forEach(function (b) { cuenta(b, +b.getAttribute('data-cuenta')); });
    el.onclick = function (e) {
      var b = e.target.closest('[data-empezo],[data-termino],[data-hoy],[data-mensaje],[data-guia]'); if (!b) return;
      if (b.hasAttribute('data-guia')) { guiaTab = b.getAttribute('data-guia'); ir('guia'); return; }
      if (b.hasAttribute('data-empezo')) { D.abierto = C.hoy; marcarPeriodo(C.hoy, true); vibrar(20); toast('Anotado. Que sea leve.'); ir('hoy'); }
      else if (b.hasAttribute('data-termino')) {
        var u = C.ultimo; D.abierto = null;
        if (u) D.periodo = D.periodo.filter(function (s) { return !(dif(u.inicio, s) >= 0 && dif(C.hoy, s) > 0); });
        guardar(); toast('Listo. Tu periodo quedó registrado.'); ir('hoy');
      }
      else if (b.hasAttribute('data-hoy')) registrar(C.hoy);
      else mensajeDelDia(false);
    };
  };

  /* ── Calendario ── */
  PANT.calendario = function () {
    if (!mesVista) mesVista = C.hoy.slice(0, 7);
    var p = mesVista.split('-'), a = +p[0], m = +p[1] - 1, primero = new Date(Date.UTC(a, m, 1)).getUTCDay(), total = new Date(Date.UTC(a, m + 1, 0)).getUTCDate(), html = '';
    for (var i = 0; i < (primero + 6) % 7; i++) html += '<span class="cd cd--vacio"></span>';
    for (var d = 1; d <= total; d++) {
      var s = deNum(Math.round(Date.UTC(a, m, d) / 864e5)), t = C.mapa[s] || '', r = D.dias[s], marcas = r && ((r.sintomas || []).length || (r.animo || []).length || r.notas || r.moco || r.temp);
      html += '<button type="button" class="cd' + (t ? ' cd--' + t : '') + (s === C.hoy ? ' cd--hoy' : '') + (dif(C.hoy, s) > 0 ? ' cd--futuro' : '') + '" data-dia="' + s + '" style="--i:' + d + '"><span>' + d + '</span>' + (marcas ? '<i></i>' : '') + '</button>';
    }
    return '<header class="cab"><div><p class="cab__fecha">Calendario</p><h1 class="cab__t">' + mayus(MESES[m]) + ' <span class="tenue">' + a + '</span></h1></div>' +
      '<div class="cab__nav"><button type="button" data-mes="-1" aria-label="Mes anterior">' + ic('chevron-left') + '</button><button type="button" data-mes="0" class="hoy-btn">Hoy</button><button type="button" data-mes="1" aria-label="Mes siguiente">' + ic('chevron-right') + '</button></div></header>' +
      '<div class="cal"><div class="cal__sem">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="cal__dias" id="calDias">' + html + '</div></div>' +
      '<ul class="leyenda"><li><i class="punto punto--periodo"></i>Periodo</li><li><i class="punto punto--pred"></i>Periodo previsto</li><li><i class="punto punto--fertil"></i>Ventana fértil</li><li><i class="punto punto--ovulacion"></i>Ovulación</li><li><i class="punto punto--spm"></i>Premenstrual</li><li><i class="punto punto--nota"></i>Con registro</li></ul>' +
      '<p class="nota centro">Toca un día para registrar o corregir.</p>';
  };
  DESPUES.calendario = function (el) {
    el.onclick = function (e) {
      var b = e.target.closest('[data-mes],[data-dia]'); if (!b) return;
      if (b.hasAttribute('data-dia')) { registrar(b.getAttribute('data-dia')); return; }
      var k = +b.getAttribute('data-mes'), p = mesVista.split('-');
      mesVista = k === 0 ? C.hoy.slice(0, 7) : new Date(Date.UTC(+p[0], +p[1] - 1 + k, 1)).toISOString().slice(0, 7);
      var dir = k < 0 ? 'de-izq' : 'de-der'; el.innerHTML = PANT.calendario(); var g = $('#calDias', el); g.classList.add(dir); void g.offsetWidth; g.classList.add('entra');
    };
    var x0 = null; el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) { var b = $('[data-mes="' + (dx < 0 ? 1 : -1) + '"]', el); if (b) b.click(); } }, { passive: true });
  };

  /* ── Registrar (hoja) ── */
  function registrar(s) {
    var futuro = dif(C.hoy, s) > 0, r = D.dias[s] || {}, enP = D.periodo.indexOf(s) >= 0;
    if (futuro) {
      var t = C.mapa[s], f = t ? { pred: 'Periodo previsto', fertil: 'Ventana fértil (estimada)', ovulacion: 'Ovulación estimada', spm: 'Días premenstruales' }[t] : 'Un día como cualquier otro';
      hoja('<p class="eti">' + mayus(larga(s)) + '</p><h2 class="hoja__t">' + f + '</h2><p>Los días futuros no se registran: Alba los calcula con tus fechas y los corrige cuando registras.</p>'); return;
    }
    var chip = function (grupo, l, sel, multi) { return '<div class="chips" data-grupo="' + grupo + '"' + (multi ? ' data-multi' : '') + '>' + l.map(function (x) { var id = x.id != null ? x.id : x.v, on = multi ? (sel || []).indexOf(id) >= 0 : sel === id; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-v="' + id + '">' + (x.ic ? ic(x.ic) : '') + '<span>' + x.t + '</span></button>'; }).join('') + '</div>'; };
    var h = hoja('<p class="eti">' + (s === C.hoy ? 'Hoy · ' : '') + mayus(larga(s)) + '</p><h2 class="hoja__t">¿Cómo estuvo tu día?</h2>' +
      '<section class="bloque"><h3>' + ic('droplet') + 'Sangrado</h3>' + chip('flujo', A.flujo, r.flujo || 0) + '<p class="nota">«Manchado» no cuenta como día de periodo.</p></section>' +
      '<section class="bloque"><h3>' + ic('activity') + 'Síntomas</h3>' + chip('sintomas', A.sintomas, r.sintomas, true) + '</section>' +
      '<section class="bloque"><h3>' + ic('heart') + 'Ánimo</h3>' + chip('animo', A.animos, r.animo, true) + '</section>' +
      '<section class="bloque"><h3>' + ic('zap') + 'Energía</h3>' + chip('energia', A.energia, r.energia) + '</section>' +
      '<section class="bloque"><h3>' + ic('waves-horizontal') + 'Flujo vaginal</h3>' + chip('moco', A.moco, r.moco) + '<p class="nota">Cambia durante el ciclo; el elástico suele acompañar la ovulación.</p></section>' +
      '<section class="bloque bloque--dos"><label class="campo"><span>' + ic('thermometer') + 'Temperatura basal</span><input type="number" inputmode="decimal" step="0.01" min="34" max="42" placeholder="36.50" data-campo="temp" value="' + (r.temp || '') + '"><em>°C, al despertar</em></label>' +
      '<label class="campo"><span>' + ic('bed') + 'Horas de sueño</span><input type="number" inputmode="decimal" step="0.5" min="0" max="16" placeholder="8" data-campo="sueno" value="' + (r.sueno || '') + '"></label>' +
      '<label class="campo"><span>' + ic('glass-water') + 'Vasos de agua</span><input type="number" inputmode="numeric" min="0" max="20" placeholder="6" data-campo="agua" value="' + (r.agua || '') + '"></label>' +
      '<label class="campo"><span>' + ic('scale') + 'Peso</span><input type="number" inputmode="decimal" step="0.1" min="20" max="250" placeholder="kg" data-campo="peso" value="' + (r.peso || '') + '"></label></section>' +
      (D.ajustes.rec.pastilla ? '<section class="bloque"><button type="button" class="interruptor-fila" data-pastilla role="switch" aria-checked="' + !!r.pastilla + '">' + ic('pill') + '<span>Tomé mi pastilla</span><i class="interruptor"></i></button></section>' : '') +
      '<section class="bloque"><label class="campo"><span>' + ic('notebook-pen') + 'Notas</span><textarea rows="3" maxlength="600" placeholder="Algo que quieras recordar de hoy" data-campo="notas">' + esc(r.notas || '') + '</textarea></label></section>' +
      '<button class="boton boton--lleno boton--ancho" type="button" data-listo>Listo</button>', function () { if (actual) ir(actual); });
    var c = h.caja, t0;
    function guarda(msg) { var d = D.dias[s] || (D.dias[s] = {}); clearTimeout(t0); t0 = setTimeout(function () { guardar(); toast(msg || 'Guardado'); }, 250); return d; }
    c.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (b) {
        var g = b.closest('.chips'), grupo = g.getAttribute('data-grupo'), v = b.getAttribute('data-v'), d = D.dias[s] || (D.dias[s] = {});
        if (grupo === 'flujo' || grupo === 'energia') v = +v;
        if (g.hasAttribute('data-multi')) { var l = d[grupo] || (d[grupo] = []), i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v); b.classList.toggle('on'); }
        else { var mismo = d[grupo] === v && grupo !== 'flujo'; d[grupo] = mismo ? null : v; $$('.chip', g).forEach(function (x) { x.classList.toggle('on', !mismo && x === b); }); }
        if (grupo === 'flujo') { var antes = D.periodo.indexOf(s) >= 0; marcarPeriodo(s, v >= 2, true); D.dias[s].flujo = v; if (v >= 2 && !antes && s === C.hoy && !D.abierto) D.abierto = s; }
        b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); vibrar(6); guarda(); return;
      }
      if (e.target.closest('[data-pastilla]')) { var p = e.target.closest('[data-pastilla]'), dd = guarda('Pastilla anotada'); dd.pastilla = !dd.pastilla; p.setAttribute('aria-checked', dd.pastilla); return; }
      if (e.target.closest('[data-listo]')) h.cerrar();
    });
    c.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-campo'); if (!k) return; var d = guarda(), v = e.target.value;
      d[k] = k === 'notas' ? v : (v === '' ? null : +v);
    });
    void enP;
  }

  /* ── Guía: cuidados del periodo y salud sexual ── */
  PANT.guia = function () {
    var l = A.guia[guiaTab], li = function (x) { return '<li>' + esc(x) + '</li>'; };
    var cuerpo = function (c) {
      var h = '';
      if (c.items) h += '<ul class="guia__lista">' + c.items.map(li).join('') + '</ul>';
      if (c.pasos) h += '<ol class="guia__pasos">' + c.pasos.map(li).join('') + '</ol>';
      if (c.pares) h += '<dl class="guia__pares">' + c.pares.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>';
      if (c.tabla) h += '<ul class="metodos">' + c.tabla.map(function (x) { return '<li><div class="metodos__cab"><b>' + esc(x[0]) + '</b><span class="metodos__ef">' + esc(x[2]) + '</span></div><p>' + esc(x[1]) + '</p>' + (x[3] ? '<span class="etiqueta-its">' + ic('shield-check') + 'Protege de infecciones</span>' : '') + '</li>'; }).join('') + '</ul>';
      if (c.nota) h += '<p class="nota">' + esc(c.nota) + '</p>';
      return h;
    };
    return '<header class="cab"><div><p class="cab__fecha">Guía</p><h1 class="cab__t">' + (guiaTab === 'cuidados' ? 'Cuidarte' : 'Salud sexual') + '</h1></div></header>' +
      '<div class="segmentado segmentado--dos" data-guia-tab><button type="button" data-v="cuidados" class="' + (guiaTab === 'cuidados' ? 'on' : '') + '">' + ic('hand-heart') + 'Dolor y cuidados</button><button type="button" data-v="sexual" class="' + (guiaTab === 'sexual' ? 'on' : '') + '">' + ic('heart-handshake') + 'Salud sexual</button></div>' +
      (guiaTab === 'cuidados' ? '<section class="tarjeta tarjeta--urgente">' + ic('siren') + '<p><b>Si el dolor es muy fuerte y de un lado, hay fiebre, te desmayas o el sangrado empapa una toalla cada hora:</b> ve a urgencias o llama al <a href="tel:911">911</a>.</p></section>' : '') +
      l.map(function (c, i) { return '<details class="guia' + (c.alerta ? ' guia--alerta' : '') + '"' + (c.abierta ? ' open' : '') + ' style="--i:' + i + '"><summary><span class="guia__ic">' + ic(c.ic) + '</span><span class="guia__t">' + esc(c.t) + '</span>' + ic('chevron-down', 'guia__flecha') + '</summary><div class="guia__cuerpo"><div>' + cuerpo(c) + '</div></div></details>'; }).join('') +
      '<section class="tarjeta"><p class="eti">Fuentes</p><ul class="fuentes">' + A.fuentesGuia.map(li).join('') + '</ul><p class="nota">Información general para cuidarte. No sustituye la consulta con tu médica.</p></section>';
  };
  DESPUES.guia = function (el) {
    el.onclick = function (e) {
      var b = e.target.closest('[data-guia-tab] button'); if (!b || b.classList.contains('on')) return;
      guiaTab = b.getAttribute('data-v'); ir('guia');
    };
  };

  /* ── Tendencias ── */
  PANT.tendencias = function () {
    var p = C.p, c = p.corridas, h = C.hoy, desde = suma(h, -90), cuentaS = {}, cuentaA = {}, diasReg = 0;
    Object.keys(D.dias).forEach(function (s) { if (dif(desde, s) < 0 || dif(s, h) < 0) return; var r = D.dias[s]; if ((r.sintomas || []).length || (r.animo || []).length) diasReg++; (r.sintomas || []).forEach(function (x) { cuentaS[x] = (cuentaS[x] || 0) + 1; }); (r.animo || []).forEach(function (x) { cuentaA[x] = (cuentaA[x] || 0) + 1; }); });
    var top = function (o, cat) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).slice(0, 5).map(function (k) { var x = cat.filter(function (y) { return y.id === k; })[0]; return { t: x ? x.t : k, ic: x && x.ic, n: o[k] }; }); };
    var ts = top(cuentaS, A.sintomas), ta = top(cuentaA, A.animos), max = Math.max.apply(0, ts.concat(ta).map(function (x) { return x.n; }).concat([1]));
    var barras = function (l) { return l.length ? '<ul class="barras">' + l.map(function (x, i) { return '<li style="--i:' + i + '">' + (x.ic ? ic(x.ic) : '') + '<span>' + x.t + '</span><b>' + x.n + '</b><i style="--v:' + (x.n / max).toFixed(3) + '"></i></li>'; }).join('') + '</ul>' : '<p class="vacio">Aún no hay registros en los últimos 90 días.</p>'; };
    var al = C.ultimo ? alertas() : [];
    return '<header class="cab"><div><p class="cab__fecha">Tendencias</p><h1 class="cab__t">Tu ritmo</h1></div></header>' +
      '<div class="cifras"><div class="cifra"><b data-cuenta="' + p.ciclo + '">' + p.ciclo + '</b><span>días de ciclo' + (p.medidos ? ' en promedio' : ' (estimado)') + '</span></div>' +
      '<div class="cifra"><b data-cuenta="' + p.periodo + '">' + p.periodo + '</b><span>días de periodo</span></div>' +
      '<div class="cifra"><b>' + (p.variacion == null ? '–' : '±' + Math.round(p.variacion / 2)) + '</b><span>' + (p.variacion == null ? 'variación: faltan ciclos' : 'días de variación') + '</span></div>' +
      '<div class="cifra"><b data-cuenta="' + c.length + '">' + c.length + '</b><span>periodos registrados</span></div></div>' +
      (al.length ? '<section class="tarjeta tarjeta--aviso">' + ic('circle-alert', 'ic--aviso') + '<div>' + al.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div></section>' : '') +
      '<section class="tarjeta"><p class="eti">Tus últimos ciclos</p>' + graficaCiclos(p) + '</section>' +
      '<section class="tarjeta"><p class="eti">Síntomas más frecuentes · 90 días</p>' + barras(ts) + '</section>' +
      '<section class="tarjeta"><p class="eti">Tu ánimo · 90 días</p>' + barras(ta) + '</section>' +
      '<section class="tarjeta"><p class="eti">Historial</p>' + (c.length ? '<ul class="historial">' + c.slice().reverse().slice(0, 12).map(function (x, i, arr) { var sig = i ? arr[i - 1] : null; return '<li><b>' + corta(x.inicio) + '</b><span>' + x.dias + ' días de periodo</span><em>' + (sig ? dif(x.inicio, sig.inicio) + ' días de ciclo' : 'ciclo en curso') + '</em></li>'; }).join('') + '</ul>' : '<p class="vacio">Cuando registres tus periodos, aquí verás cada ciclo.</p>') + '</section>' +
      '<p class="nota centro">Rango habitual: ciclos de 21 a 35 días y periodos de 2 a 7. Cada cuerpo es distinto.</p>';
  };
  function graficaCiclos(p) {
    var l = p.largos.slice(-8);
    if (!l.length) return '<p class="vacio">Con dos periodos registrados verás aquí cuánto dura cada ciclo.</p>';
    var W = 320, H = 150, max = Math.max(40, Math.max.apply(0, l) + 2), bw = Math.min(30, (W - 40) / l.length - 8), y = function (v) { return H - 22 - (v / max) * (H - 40); }, prom = Math.round(media(l));
    var barras = l.map(function (v, i) { var x = 32 + i * ((W - 40) / l.length) + 4, fuera = v < 21 || v > 35; return '<rect class="gb' + (fuera ? ' gb--fuera' : '') + '" style="--i:' + i + '" x="' + x.toFixed(1) + '" y="' + y(v).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (H - 22 - y(v)).toFixed(1) + '" rx="5"/><text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y(v) - 6).toFixed(1) + '" class="gt">' + v + '</text>'; }).join('');
    return '<svg class="grafica" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Duración de tus últimos ciclos"><rect class="gbanda" x="28" y="' + y(35).toFixed(1) + '" width="' + (W - 32) + '" height="' + (y(21) - y(35)).toFixed(1) + '"/>' +
      '<text class="ge" x="2" y="' + (y(35) + 4).toFixed(1) + '">35</text><text class="ge" x="2" y="' + (y(21) + 4).toFixed(1) + '">21</text>' + barras +
      '<line class="gprom" x1="28" x2="' + W + '" y1="' + y(prom).toFixed(1) + '" y2="' + y(prom).toFixed(1) + '"/><text class="gpt" x="' + (W - 2) + '" y="' + (y(prom) - 5).toFixed(1) + '">promedio ' + prom + '</text></svg><p class="nota">La franja es el rango habitual (21 a 35 días).</p>';
  }
  DESPUES.tendencias = function (el) { $$('[data-cuenta]', el).forEach(function (b) { cuenta(b, +b.getAttribute('data-cuenta')); }); };

  /* ── Ajustes ── */
  PANT.ajustes = function () {
    var r = D.ajustes.rec, perm = estadoPermiso();
    var sw = function (k, t, d, icn) { return '<button type="button" class="interruptor-fila" data-rec="' + k + '" role="switch" aria-checked="' + !!r[k] + '">' + ic(icn) + '<span>' + t + (d ? '<small>' + d + '</small>' : '') + '</span><i class="interruptor"></i></button>'; };
    var hora = function (k, t) { return '<label class="fila-hora"><span>' + t + '</span><input type="time" data-hora="' + k + '" value="' + r[k] + '"></label>'; };
    return '<header class="cab"><div><p class="cab__fecha">Ajustes</p><h1 class="cab__t">Tu Alba</h1></div></header>' +
      '<section class="tarjeta"><p class="eti">Recordatorios</p>' +
      (perm === 'negado' ? '<p class="aviso-perm">' + ic('bell') + 'Las notificaciones están bloqueadas para Alba. Actívalas en los ajustes del teléfono.</p>' : perm === 'pendiente' ? '<button class="boton boton--ancho" type="button" data-permiso>' + ic('bell-ring') + 'Permitir notificaciones</button>' : '') +
      sw('mensaje', 'Mensaje del día', 'Un poema y una frase cada mañana', 'heart') + (r.mensaje ? hora('horaMensaje', 'Hora del mensaje') : '') +
      sw('periodo', 'Mi periodo', 'Antes de que llegue, el día previsto y si se retrasa', 'droplet') +
      (r.periodo ? '<div class="fila-hora"><span>Avisarme antes</span><div class="mini-contador"><button type="button" data-antes="-1" aria-label="Menos">−</button><b>' + r.antes + ' d</b><button type="button" data-antes="1" aria-label="Más">+</button></div></div>' : '') +
      sw('fertil', 'Ventana fértil y ovulación', 'Estimadas con tus fechas', 'sprout') + (r.periodo || r.fertil ? hora('hora', 'Hora de estos avisos') : '') +
      sw('diario', 'Registrar mi día', 'Un recordatorio amable cada noche', 'notebook-pen') + (r.diario ? hora('horaDiario', 'Hora') : '') +
      sw('pastilla', 'Pastilla anticonceptiva', 'Un aviso diario a la misma hora', 'pill') + (r.pastilla ? hora('horaPastilla', 'Hora de la pastilla') : '') +
      '<button class="boton boton--ancho" type="button" data-probar>' + ic('bell') + 'Probar una notificación</button>' +
      (N ? '' : '<p class="nota">En el navegador, los avisos salen mientras Alba está abierta o al abrirla. En el APK de Android llegan a su hora aunque la app esté cerrada.</p>') + '</section>' +
      '<section class="tarjeta"><p class="eti">Mi ciclo</p><div class="fila-hora"><span>Ciclo si aún no hay datos</span><div class="mini-contador"><button type="button" data-aj="ciclo" data-d="-1" aria-label="Menos">−</button><b>' + D.ajustes.ciclo + ' d</b><button type="button" data-aj="ciclo" data-d="1" aria-label="Más">+</button></div></div>' +
      '<div class="fila-hora"><span>Periodo si aún no hay datos</span><div class="mini-contador"><button type="button" data-aj="periodo" data-d="-1" aria-label="Menos">−</button><b>' + D.ajustes.periodo + ' d</b><button type="button" data-aj="periodo" data-d="1" aria-label="Más">+</button></div></div>' +
      '<p class="nota">Con dos o más periodos registrados, Alba usa tus promedios reales.</p></section>' +
      '<section class="tarjeta"><p class="eti">Mensajes de tu esposo</p><p class="nota">Él puede escribir aquí sus propios mensajes, uno por renglón: saldrán cada tercer día, firmados «— ' + FIRMA + '».</p><textarea class="mios" rows="4" data-mios placeholder="Te quiero más de lo que sé decir.">' + esc(D.mios.join('\n')) + '</textarea></section>' +
      '<section class="tarjeta"><p class="eti">Seguridad</p><button type="button" class="fila-boton" data-cambia-pin>' + ic('lock') + '<span>Cambiar mi PIN</span>' + ic('chevron-right') + '</button>' +
      (N && N.hayHuella && N.hayHuella() ? '<button type="button" class="interruptor-fila" data-huella role="switch" aria-checked="' + !!D.ajustes.huella + '">' + ic('fingerprint-pattern') + '<span>Entrar con huella</span><i class="interruptor"></i></button>' : '') +
      '<label class="fila-hora"><span>Nombre</span><input type="text" data-nombre value="' + esc(D.perfil.nombre) + '" maxlength="24"></label></section>' +
      '<section class="tarjeta"><p class="eti">Apariencia</p><div class="segmentado" data-tema>' + [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(function (x) { return '<button type="button" data-v="' + x[0] + '" class="' + (D.ajustes.tema === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></section>' +
      '<section class="tarjeta"><p class="eti">Tus datos</p><p class="nota">Todo vive sólo en este teléfono: Alba no tiene servidor ni cuentas en internet.</p>' +
      '<button type="button" class="fila-boton" data-exportar>' + ic('download') + '<span>Guardar un respaldo</span>' + ic('chevron-right') + '</button>' +
      '<label class="fila-boton">' + ic('upload') + '<span>Restaurar un respaldo</span>' + ic('chevron-right') + '<input type="file" accept="application/json,.json" data-importar hidden></label>' +
      '<button type="button" class="fila-boton fila-boton--peligro" data-borrar>' + ic('trash') + '<span>Borrar todo</span>' + ic('chevron-right') + '</button></section>' +
      '<section class="tarjeta"><p class="eti">Acerca de Alba</p><p>Alba estima tus fechas con tus propios registros. <b>No diagnostica ni sirve como método anticonceptivo.</b> Si algo te preocupa, consulta a tu ginecóloga.</p><details><summary>Fuentes</summary><ul class="fuentes">' + A.fuentes.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul></details><p class="nota">Poemas de autores en dominio público; las traducciones marcadas «libre» son de Alba. Hecha con cariño.</p></section>';
  };
  DESPUES.ajustes = function (el) {
    var r = D.ajustes.rec;
    el.onclick = function (e) {
      var b;
      if ((b = e.target.closest('[data-rec]'))) { var k = b.getAttribute('data-rec'); r[k] = !r[k]; guardar(); if (r[k]) pedirPermiso(function () { ir('ajustes'); }); else ir('ajustes'); return; }
      if ((b = e.target.closest('[data-antes]'))) { r.antes = Math.max(1, Math.min(7, r.antes + +b.getAttribute('data-antes'))); guardar(); ir('ajustes'); return; }
      if ((b = e.target.closest('[data-aj]'))) { var a = b.getAttribute('data-aj'), lim = a === 'ciclo' ? [18, 45] : [2, 10]; D.ajustes[a] = Math.max(lim[0], Math.min(lim[1], D.ajustes[a] + +b.getAttribute('data-d'))); guardar(); ir('ajustes'); return; }
      if (e.target.closest('[data-permiso]')) { pedirPermiso(function () { programar(); ir('ajustes'); }); return; }
      if (e.target.closest('[data-probar]')) { pedirPermiso(function () { if (N && N.probar) N.probar(); else notificarWeb({ titulo: 'Así se verán tus avisos', texto: 'Con cariño, desde Alba.', cuando: Date.now() }); toast('Notificación enviada'); }); return; }
      if ((b = e.target.closest('[data-huella]'))) { D.ajustes.huella = !D.ajustes.huella; guardar(true); b.setAttribute('aria-checked', D.ajustes.huella); return; }
      if ((b = e.target.closest('[data-tema] button'))) { D.ajustes.tema = b.getAttribute('data-v'); guardar(true); tema(); ir('ajustes'); return; }
      if (e.target.closest('[data-cambia-pin]')) { cambiarPIN(); return; }
      if (e.target.closest('[data-exportar]')) { exportar(); return; }
      if (e.target.closest('[data-borrar]')) {
        var h = hoja('<h2 class="hoja__t">¿Borrar todo?</h2><p>Se borran tus registros, tu PIN y tus ajustes de este teléfono. No se puede deshacer.</p><button class="boton boton--peligro boton--ancho" type="button" data-si>Sí, borrar todo</button>');
        $('[data-si]', h.caja).onclick = function () { localStorage.removeItem(CLAVE); if (N && N.programar) N.programar('[]'); location.reload(); };
      }
    };
    el.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-hora')) { r[t.getAttribute('data-hora')] = t.value || r[t.getAttribute('data-hora')]; guardar(); toast('Hora guardada'); }
      if (t.hasAttribute('data-nombre') && t.value.trim()) { D.perfil.nombre = t.value.trim(); guardar(); toast('Nombre guardado'); }
      if (t.hasAttribute('data-mios')) { D.mios = t.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 200); guardar(true); toast(D.mios.length ? D.mios.length + ' mensajes guardados' : 'Mensajes borrados'); }
      if (t.hasAttribute('data-importar') && t.files[0]) importar(t.files[0]);
    });
  };
  function cambiarPIN() {
    var h = hoja('<h2 class="hoja__t">Cambiar mi PIN</h2><label class="campo"><span>PIN actual</span><input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" data-a></label><label class="campo"><span>PIN nuevo (4 dígitos)</span><input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" data-b></label><button class="boton boton--lleno boton--ancho" type="button" data-ok>Guardar</button>');
    $('[data-ok]', h.caja).onclick = function () {
      var a = $('[data-a]', h.caja).value, b = $('[data-b]', h.caja).value;
      if (huellaPIN(a, D.acceso.sal) !== D.acceso.h) { toast('El PIN actual no es correcto'); return; }
      if (!/^\d{4}$/.test(b)) { toast('El PIN nuevo debe tener 4 dígitos'); return; }
      var s = sal(); D.acceso = { sal: s, h: huellaPIN(b, s) }; guardar(true); h.cerrar(); toast('PIN cambiado');
    };
  }
  function exportar() {
    var copia = JSON.parse(JSON.stringify(D)); delete copia.acceso; var txt = JSON.stringify({ app: 'alba', version: 1, fecha: new Date().toISOString(), datos: copia });
    var nombre = 'alba-respaldo-' + C.hoy + '.json';
    if (N && N.compartir) { N.compartir(txt, nombre); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Respaldo guardado');
  }
  function importar(f) {
    var lr = new FileReader();
    lr.onload = function () {
      try {
        var j = JSON.parse(lr.result); if (j.app !== 'alba' || !j.datos || !Array.isArray(j.datos.periodo)) throw 0;
        var h = hoja('<h2 class="hoja__t">¿Restaurar este respaldo?</h2><p>Del ' + esc((j.fecha || '').slice(0, 10)) + '. Reemplaza tus registros actuales; tu PIN se queda igual.</p><button class="boton boton--lleno boton--ancho" type="button" data-si>Restaurar</button>');
        $('[data-si]', h.caja).onclick = function () { var acc = D.acceso; D = j.datos; D.acceso = acc; (function completar(b, d) { for (var k in b) if (!(k in d)) d[k] = b[k]; else if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) completar(b[k], d[k]); })(nuevo(), D); guardar(); h.cerrar(); toast('Respaldo restaurado'); ir('hoy'); };
      } catch (e) { toast('Ese archivo no es un respaldo de Alba'); }
    };
    lr.readAsText(f);
  }

  /* el botón «atrás» de Android: cierra lo abierto, luego vuelve a Hoy; si ya está en Hoy, deja salir */
  window.albaAtras = function () {
    var f = $('#hoja'); if (f && !f.hidden) { var x = $('.hoja__x', f); if (x) x.click(); return true; }
    var m = $('.mensaje'); if (m) { var b = $('.mensaje__ir', m); if (b) b.click(); return true; }
    if (document.body.className === 'en-app' && actual !== 'hoy') { ir('hoy'); return true; }
    return false;
  };
  window.albaRespaldo = function (ok) { toast(ok ? 'Respaldo guardado' : 'No se guardó el respaldo'); };

  /* ═════════ arranque ═════════ */
  tema();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
  pantallaAcceso();
  window.__alba = { D: function () { return D; }, C: function () { calcular(); return C; }, avisos: function () { calcular(); return avisos(); } };   // para pruebas
})();
