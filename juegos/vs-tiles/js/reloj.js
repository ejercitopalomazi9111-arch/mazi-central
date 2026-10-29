/* EL RELOJ. Todo el juego mide el tiempo con UNA sola regla: «qué segundo de la canción está saliendo
   por la bocina en este instante». Carlos pidió que «jamás falle la entrada y tenga una tasa de reacción
   perfecta, para que no sea excusa los controles», y eso sólo se cumple si:
     · el toque se juzga con la HORA EXACTA del evento (event.timeStamp), no con la del cuadro en que se
       atendió: a 60 cuadros por segundo eso ya serían hasta 16 ms de error regalados;
     · esa hora se traduce al reloj del audio con getOutputTimestamp(), que dice qué muestra está sonando
       en qué momento de performance.now() (ya trae descontada la latencia de salida del aparato);
     · la traducción se suaviza: getOutputTimestamp avanza a saltos del tamaño del búfer de audio, y un
       reloj que salta hace notas que tiemblan y juicios que bailan;
     · lo que queda (audífonos Bluetooth, la pantalla del teléfono) lo corrige la calibración del jugador.
   reloj.ahora() → segundo de la canción que se oye ahora · reloj.en(ms) → el de un evento */

export const reloj = {
  ctx: null, inicio: 0, t0: 0, desde: 0, vel: 1, desfase: 0, desfaseVisual: 0, tocando: false, fuente: null, ganancia: null,
  _off: null, _ult: 0, pausado: false,

  preparar(){
    if(this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    /* con el switch de silencio del iPhone puesto, Safari calla el audio web salvo que se pida «reproducción»,
       como una app de música (Safari 16.4+; en los demás no existe y no pasa nada) */
    try{ if(navigator.audioSession) navigator.audioSession.type = 'playback'; }catch(e){}
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.ganancia = this.ctx.createGain(); this.ganancia.connect(this.ctx.destination);
    return this.ctx;
  },
  /* el iPhone no deja sonar nada hasta que alguien toca, y cuenta como «toque» SOLTAR el dedo (touchend,
     click), no ponerlo: un resume() pedido en el pointerdown se puede quedar colgado para siempre. Por eso
     nunca se espera más de medio segundo aquí, y desbloquear() lo vuelve a intentar al soltar cada toque. */
  async despertar(){ this.preparar(); this._mudo();
    if(this.ctx.state !== 'running') await Promise.race([this.ctx.resume().catch(() => {}), new Promise(r => setTimeout(r, 500))]); },
  /* un búfer mudo de un cuadro, que en Safari termina de «abrir» la salida */
  _mudo(){ try{ const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(); }catch(e){} },
  /* se instala una vez: al soltar cualquier toque, si el audio no corre (bloqueado, o «interrumpido» por una
     llamada o por salir de la app) y no es una pausa a propósito, se despierta */
  desbloquear(){ const f = () => { if(!this.ctx || this.pausado || this.ctx.state === 'running') return; this.ctx.resume().catch(() => {}); this._mudo(); };
    for(const n of ['touchend', 'pointerup', 'click', 'keydown']) addEventListener(n, f, { capture: true, passive: true }); },

  async cargar(url){ this.preparar(); const r = await fetch(url); const a = await r.arrayBuffer(); return await this.ctx.decodeAudioData(a); },

  /* el modelo lineal entre performance.now() y el tiempo del audio que se OYE */
  _medir(){
    const c = this.ctx, ahora = performance.now();
    let off;
    if(c.getOutputTimestamp){ const ts = c.getOutputTimestamp();
      if(ts && ts.contextTime > 0 && ts.performanceTime > 0) off = ts.contextTime - ts.performanceTime / 1000; }
    if(off === undefined){ const lat = (c.outputLatency || 0) + (c.baseLatency || 0); off = c.currentTime - lat - ahora / 1000; }
    /* se suaviza: los saltos chicos son el búfer; uno grande (más de 40 ms) es que el audio se trabó y se
       acepta de golpe para no quedarse desfasado */
    if(this._off === null || Math.abs(off - this._off) > .04) this._off = off;
    else this._off += (off - this._off) * .06;
    this._ult = ahora;
    return this._off;
  },
  /* segundo de la canción que está sonando en el instante `ms` de performance.now() */
  en(ms){ if(!this.ctx) return 0; if(performance.now() - this._ult > 8) this._medir(); return this.desde + (ms / 1000 + this._off - this.t0) * this.vel - this.desfase; },
  ahora(){ return this.en(performance.now()); },
  /* para pintar: el mismo reloj más el ajuste visual de la calibración */
  vista(){ return this.ahora() - this.desfaseVisual; },

  /* tocar el búfer empezando en `desde` segundos de la canción, con `espera` segundos de cuenta */
  tocar(buf, { desde = 0, espera = 2, vel = 1 } = {}){
    this.parar(); const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = vel; s.connect(this.ganancia);
    const t0 = c.currentTime + espera;
    /* con `desde` negativo la canción espera callada lo que falte (la cuenta antes del primer golpe) */
    s.start(t0 + Math.max(0, -desde) / vel, Math.max(0, desde));
    this._off = null; this._medir();
    this.t0 = t0; this.desde = desde; this.inicio = t0 - desde / vel; this.fuente = s; this.tocando = true; this.vel = vel;
    s.onended = () => { if(this.fuente === s) this.tocando = false; };
    return t0;
  },
  /* parar también quita la pausa: salir desde la pausa dejaba el audio suspendido y la siguiente canción no avanzaba */
  parar(){ if(this.fuente){ try{ this.fuente.onended = null; this.fuente.stop(); }catch(e){} this.fuente = null; } this.tocando = false;
    if(this.pausado){ this.pausado = false; this.ctx?.resume().catch(() => {}); } },
  pausar(){ this.pausado = true; if(this.ctx && this.ctx.state === 'running') return this.ctx.suspend(); },
  seguir(){ this.pausado = false; if(this.ctx) return this.ctx.resume().then(() => { this._off = null; this._medir(); }); },

  /* un sonido corto YA (los golpes): sin programarlo, para que salga lo antes posible */
  golpe(buf, vol = .5){ if(!buf || !this.ctx) return; const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); g.gain.value = vol; s.buffer = buf; s.connect(g); g.connect(this.ctx.destination); s.start(); },
  /* un clic de metrónomo en un segundo exacto de la canción (la calibración) */
  clic(buf, t, vol = .7){ const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); g.gain.value = vol; s.buffer = buf; s.connect(g); g.connect(this.ctx.destination); s.start(Math.max(this.ctx.currentTime, this.t0 + (t - this.desde) / this.vel)); }
};
