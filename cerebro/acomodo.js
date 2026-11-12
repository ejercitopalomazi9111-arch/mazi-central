/* ══════════════════════════════════════════════════════════════════════════
   EL ACOMODO DE LA RED · dónde va cada neurona en el dibujo
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 12 nov: «la red neuronal causa un chingo de lag».

   Medido en un teléfono simulado (CPU 4× más lenta, 390 px): picar «RED»
   congelaba la página 2.7 s. No era el dibujo: era ESTO, corriendo en el
   teléfono cada vez que se abría la red. Son 723 neuronas contra 723,
   260 vueltas: 68 millones de cuentas para llegar siempre al mismo dibujo,
   porque la semilla es fija.

   Por eso ahora se hace UNA vez, al armar `todo.json` (`cerebro.mjs armar`),
   y el teléfono sólo lee las posiciones. Si alguna neurona nueva no trae la
   suya (se escribió y no se rearmó), la página cae aquí mismo, como antes.

   Y un defecto que salió al medir: dos neuronas que caían casi encimadas se
   empujaban con fuerza 2600/d² con d cerca de cero, y una salió disparada a
   137,000 unidades del centro. El encuadre la incluía, así que la red se veía
   VACÍA: 723 puntos de menos de un pixel y un núcleo solo. Ahora la distancia
   tiene piso (no hay empujón infinito) y cada vuelta mueve a lo más 30.
   ═════════════════════════════════════════════════════════════════════════ */
export function acomodar(ids, enlaces, vueltas = 260){
  const nodos = ids.map((id, i) => {
    /* Semilla fija: el mismo cerebro se dibuja igual siempre. */
    const a = (i * 2.399963) % (Math.PI * 2), r = 60 + (i % 9) * 34;
    return { id, x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0 };
  });
  const porId = new Map(nodos.map((o) => [o.id, o]));
  const ligas = enlaces.map((e) => ({ a: porId.get(e.de), b: porId.get(e.a), tipo: e.tipo })).filter((e) => e.a && e.b);
  for(let v = 0; v < vueltas; v++){
    const frio = 1 - v / vueltas;
    for(let i = 0; i < nodos.length; i++){
      for(let j = i + 1; j < nodos.length; j++){
        const a = nodos[i], b = nodos[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = Math.max(dx * dx + dy * dy, 36);
        const f = 2600 / d2, d = Math.sqrt(d2);
        a.vx -= (dx / d) * f; a.vy -= (dy / d) * f;
        b.vx += (dx / d) * f; b.vy += (dy / d) * f;
      }
    }
    for(const e of ligas){
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      /* Los enlaces escritos a mano jalan más que los descubiertos. */
      const largo = e.tipo === 'dicha' ? 78 : 128;
      const f = (d - largo) * (e.tipo === 'dicha' ? 0.035 : 0.014);
      e.a.vx += (dx / d) * f; e.a.vy += (dy / d) * f;
      e.b.vx -= (dx / d) * f; e.b.vy -= (dy / d) * f;
    }
    for(const o of nodos){
      o.vx -= o.x * 0.0022; o.vy -= o.y * 0.0022;
      const v = Math.hypot(o.vx, o.vy), tope = v > 30 ? 30 / v : 1;
      o.x += o.vx * tope * frio; o.y += o.vy * tope * frio;
      o.vx *= 0.82; o.vy *= 0.82;
    }
  }
  /* un decimal: el dibujo es igual y `todo.json` no crece de más */
  const pos = {};
  for(const o of nodos) pos[o.id] = [Math.round(o.x * 10) / 10, Math.round(o.y * 10) / 10];
  return pos;
}
