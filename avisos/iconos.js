/* ══════════════════════════════════════════════════════════════════════════
   LOS ICONOS · dibujados con trazos, no con emoji
   ──────────────────────────────────────────────────────────────────────────
   Por qué no emoji: cada teléfono dibuja los suyos, así que el mismo aviso se
   vería distinto en el de Carlos y en el de un alumno — y al pasarlo a imagen
   se congela el del aparato que lo generó. Estos se ven igual en todos lados
   porque los dibujamos nosotros.

   Cada icono se dibuja dentro de un cuadro de 24 × 24 y se escala. Se usan en
   la pantalla (SVG) y en la imagen final (canvas), así que van descritos como
   una lista de trazos y cada motor los pinta a su manera. Una sola definición,
   dos destinos: si se cambia el dibujo, cambia en los dos.

   Formato de un trazo:
     ['l', x1,y1, x2,y2, …]   línea quebrada
     ['p', x1,y1, x2,y2, …]   polígono cerrado
     ['c', cx,cy, r]          círculo
     ['e', cx,cy, rx, ry, giro]  elipse (giro en grados, opcional)
     ['r', x,y, w,h]          rectángulo
   ═════════════════════════════════════════════════════════════════════════ */
const ICONOS = {
  /* ── materias ──────────────────────────────────────────────────────── */
  matraz:   [['l',9,2,15,2],['l',10,2,10,9],['l',14,2,14,9],
             ['p',10,9,4,20,20,20,14,9],['l',6.6,15.5,17.4,15.5]],
  escuadra: [['p',3,20,21,20,3,5],['l',3,16,7,16],['l',7,16,7,20]],
  codigo:   [['l',8,7,3,12,8,17],['l',16,7,21,12,16,17],['l',13.5,5,10.5,19]],
  /* Tres órbitas giradas y el núcleo. Antes eran una elipse y dos rayas
     cruzadas, y en pantalla se leía como un moño, no como un átomo. */
  atomo:    [['e',12,12,9.6,3.7,0],['e',12,12,9.6,3.7,60],['e',12,12,9.6,3.7,120],
             ['c',12,12,2.1]],
  globo:    [['p',3,4,21,4,21,16,13,16,8,20,8,16,3,16],
             ['l',7,8,17,8],['l',7,12,14,12]],
  pelota:   [['c',12,12,9],['l',12,3,12,21],['e',12,12,4.2,9]],
  lupa:     [['c',10,10,6.4],['l',14.6,14.6,21,21]],
  /* Los platillos van COLGANDO de dos hilos, no dibujados como triangulitos
     pegados a la barra: así se lee balanza y no dos flechas. */
  balanza:  [['c',12,4.6,1.4],['l',12,6,12,19],['p',8.5,19,15.5,19,17,21,7,21],
             ['l',3.4,8,20.6,8],
             ['l',3.4,8,1.4,12.4],['l',3.4,8,5.4,12.4],['l',1.1,12.4,5.7,12.4],
             ['l',20.6,8,18.6,12.4],['l',20.6,8,22.6,12.4],['l',18.3,12.4,22.9,12.4]],
  monitor:  [['r',2.5,4,19,12],['l',9,16,9,20],['l',15,16,15,20],['l',7,20,17,20]],
  engrane:  [['c',12,12,4.2],['c',12,12,8.4],
             ['l',12,3.6,12,7.8],['l',12,16.2,12,20.4],
             ['l',3.6,12,7.8,12],['l',16.2,12,20.4,12],
             ['l',6.1,6.1,9,9],['l',15,15,17.9,17.9],
             ['l',17.9,6.1,15,9],['l',9,15,6.1,17.9]],
  red:      [['c',12,4.5,2.6],['c',5,19,2.6],['c',19,19,2.6],
             ['l',12,7.1,12,12],['l',12,12,6.4,16.9],['l',12,12,17.6,16.9]],
  steam:    [['p',12,2.6,14.8,9.4,22,9.4,16.2,13.8,18.4,20.6,12,16.4,5.6,20.6,7.8,13.8,2,9.4,9.2,9.4]],
  megafono: [['p',3,10,9,10,17,4,17,20,9,14,3,14],['l',6,14,7.5,21],
             ['l',20,8.5,22,7.5],['l',20.5,12,22.8,12],['l',20,15.5,22,16.5]],

  /* ── tipos de pendiente ────────────────────────────────────────────── */
  hoja:     [['p',5,2.5,15,2.5,19,6.5,19,21.5,5,21.5],['l',15,2.5,15,6.5,19,6.5],
             ['l',8,11,16,11],['l',8,15,16,15],['l',8,18.5,13,18.5]],
  caja:     [['p',3,7.5,12,3,21,7.5,12,12],['l',3,7.5,3,16.5,12,21,21,16.5,21,7.5],
             ['l',12,12,12,21]],
  examen:   [['p',5,2.5,19,2.5,19,21.5,5,21.5],['l',8.5,12.5,11,15,16,8.5],
             ['l',8,6,16,6]],
  carpeta:  [['p',2.5,6,9.5,6,11.5,8.5,21.5,8.5,21.5,19.5,2.5,19.5]],
  entrega:  [['l',12,3,12,14.5],['l',7.5,10,12,14.5,16.5,10],
             ['l',3.5,18.5,20.5,18.5],['l',3.5,18.5,3.5,15],['l',20.5,18.5,20.5,15]],
  campana:  [['p',12,2.5,17.5,7,17.5,15,20,18,4,18,6.5,15,6.5,7],
             ['l',9.5,18,9.5,19.5],['l',14.5,18,14.5,19.5],['l',9.5,21,14.5,21]],
};

/* Dibuja un icono en un canvas 2D, dentro de un cuadro de `lado` píxeles. */
function iconoCanvas(ctx, nombre, x, y, lado, color, grosor){
  const t = ICONOS[nombre];
  if(!t) return;
  const k = lado / 24;
  ctx.save();
  ctx.translate(x, y); ctx.scale(k, k);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = (grosor || 1.9); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for(const tr of t){
    ctx.beginPath();
    if(tr[0] === 'c'){ ctx.arc(tr[1], tr[2], tr[3], 0, Math.PI*2); }
    else if(tr[0] === 'e'){ ctx.ellipse(tr[1], tr[2], tr[3], tr[4],
                                        (tr[5] || 0) * Math.PI / 180, 0, Math.PI*2); }
    else if(tr[0] === 'r'){ ctx.rect(tr[1], tr[2], tr[3], tr[4]); }
    else {
      for(let i = 1; i < tr.length; i += 2){
        if(i === 1) ctx.moveTo(tr[1], tr[2]); else ctx.lineTo(tr[i], tr[i+1]);
      }
      if(tr[0] === 'p') ctx.closePath();
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* El mismo icono como SVG, para la pantalla. Misma lista de trazos. */
function iconoSVG(nombre, color, grosor){
  const t = ICONOS[nombre] || [];
  const partes = t.map(tr => {
    if(tr[0] === 'c') return `<circle cx="${tr[1]}" cy="${tr[2]}" r="${tr[3]}"/>`;
    if(tr[0] === 'e') return `<ellipse cx="${tr[1]}" cy="${tr[2]}" rx="${tr[3]}" ry="${tr[4]}"` +
      (tr[5] ? ` transform="rotate(${tr[5]} ${tr[1]} ${tr[2]})"` : '') + `/>`;
    if(tr[0] === 'r') return `<rect x="${tr[1]}" y="${tr[2]}" width="${tr[3]}" height="${tr[4]}"/>`;
    let d = '';
    for(let i = 1; i < tr.length; i += 2) d += (i === 1 ? 'M' : 'L') + tr[i] + ' ' + tr[i+1] + ' ';
    return `<path d="${d}${tr[0] === 'p' ? 'Z' : ''}"/>`;
  }).join('');
  /* Los atributos de pintado van en un <g> INTERNO, no en el <svg>. Si van
     afuera y alguien mete el contenido dentro de otro grupo, se pierden: las
     figuras se rellenan de negro y el icono queda como una mancha. Ya pasó al
     armar la hoja de contacto. */
  const pinta = `fill="none" stroke="${color || 'currentColor'}" ` +
    `stroke-width="${grosor || 1.9}" stroke-linejoin="round" stroke-linecap="round"`;
  return `<svg viewBox="0 0 24 24"><g ${pinta}>${partes}</g></svg>`;
}

if(typeof module !== 'undefined') module.exports = { ICONOS, iconoSVG };
