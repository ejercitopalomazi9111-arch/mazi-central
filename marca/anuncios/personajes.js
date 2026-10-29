/* LOS CUBITOS: los personajes de los videos graciosos. Son de la familia del logo (cubos, isométricos,
   un color por personaje) y tienen cara pintada en un lienzo que se vuelve a dibujar cuando cambia el
   gesto: ojos que parpadean y miran, cejas (normal, feliz, enojado, triste, sorpresa), boca que se
   abre cuando el personaje habla, y lo de cada quien (el bigote de Don Toño, la gorra de Kevin).
     const toño = cubito({ color: '#7E1735', bigote: true });  escena.add(toño);
     toño.userData.cara({ boca: .6, ojos: 1, ceja: 'enojado', mira: [.3, 0] });
   habla(t, linea) da la apertura de la boca mientras suena esa línea del guion. */
import * as THREE from 'three';

export function cubito({ color = '#5A5A67', bigote = false, gorra = null, lentes = false, techo = null, corbata = null, tam = 1 } = {}){
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = (col, mapa) => new THREE.MeshStandardMaterial({ color: mapa ? '#ffffff' : col, map: mapa || null, roughness: .55, metalness: .05 });
  const lado = m(color), frente = m(color, tex), arriba = m(techo || color);
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(tam, tam, tam), [lado, lado, arriba, lado, frente, lado]);
  const g = new THREE.Group(), cuerpoG = new THREE.Group(); cuerpoG.add(cuerpo); g.add(cuerpoG);
  /* la gorra: una tapa y una visera, hacia atrás o hacia el frente */
  if(gorra){ const mg = new THREE.MeshStandardMaterial({ color: gorra.color || '#AC27FF', roughness: .5 });
    const tapa = new THREE.Mesh(new THREE.BoxGeometry(tam * 1.04, tam * .16, tam * 1.04), mg); tapa.position.y = tam * .58;
    const visera = new THREE.Mesh(new THREE.BoxGeometry(tam * .9, tam * .05, tam * .4), mg); visera.position.set(0, tam * .53, (gorra.atras ? -1 : 1) * tam * .68);
    cuerpoG.add(tapa, visera); }
  /* el lienzo de la cara: color de fondo del personaje, todo lo demás encima */
  const piel = new THREE.Color(color).getStyle();
  let ultimo = '';
  g.userData.cara = ({ boca = 0, ojos = 1, ceja = 'normal', mira = [0, 0], rubor = 0 } = {}) => {
    const firma = [boca.toFixed(2), ojos.toFixed(2), ceja, mira.map(v => v.toFixed(2)).join(), rubor.toFixed(2)].join('|');
    if(firma === ultimo) return; ultimo = firma;
    x.fillStyle = piel; x.fillRect(0, 0, 512, 512);
    const yO = 215, dx = 92;
    for(const s of [-1, 1]){
      const cx = 256 + s * dx;
      /* el ojo: blanco, pupila que mira, y el parpadeo aplasta el ojo */
      x.save(); x.translate(cx, yO); x.scale(1, Math.max(.06, ojos));
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(0, 0, 50, 58, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#17121D'; x.beginPath(); x.arc(mira[0] * 18, mira[1] * 18 + 6, ceja === 'sorpresa' ? 18 : 24, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(mira[0] * 18 + 8, mira[1] * 18 - 4, 7, 0, Math.PI * 2); x.fill();
      x.restore();
      if(lentes){ x.strokeStyle = '#17121D'; x.lineWidth = 12; x.beginPath(); x.roundRect(cx - 64, yO - 62, 128, 120, 26); x.stroke(); }
      /* la ceja */
      x.strokeStyle = '#17121D'; x.lineWidth = 16; x.lineCap = 'round'; x.beginPath();
      const yC = yO - 82, ang = { normal: 0, feliz: -.12, enojado: .32, triste: -.32, sorpresa: -.05 }[ceja] * s, sube = ceja === 'sorpresa' ? -18 : ceja === 'feliz' ? -6 : 0;
      x.moveTo(cx - 40, yC + sube - Math.tan(ang) * 40); x.lineTo(cx + 40, yC + sube + Math.tan(ang) * 40); x.stroke();
    }
    if(lentes){ x.beginPath(); x.moveTo(256 - 28, yO - 10); x.lineTo(256 + 28, yO - 10); x.stroke(); }
    if(rubor){ x.fillStyle = `rgba(255,120,150,${.35 * rubor})`; for(const s of [-1, 1]){ x.beginPath(); x.ellipse(256 + s * 150, 320, 38, 22, 0, 0, Math.PI * 2); x.fill(); } }
    /* la boca: una sonrisa cerrada que se abre al hablar; enojado o triste la voltean */
    const yB = 365, ab = Math.max(0, boca);
    x.fillStyle = '#3A0E1E'; x.strokeStyle = '#17121D'; x.lineWidth = 12;
    if(ab > .05){ x.beginPath(); x.ellipse(256, yB + ab * 10, 58, 10 + ab * 46, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#FF7A9B'; x.beginPath(); x.ellipse(256, yB + ab * 30, 34, 6 + ab * 16, 0, 0, Math.PI); x.fill(); }
    else { x.beginPath(); const curva = { triste: -1, enojado: -.6 }[ceja] ?? 1; x.moveTo(206, yB); x.quadraticCurveTo(256, yB + 36 * curva, 306, yB); x.stroke(); }
    /* el bigote de Don Toño */
    if(bigote){ x.fillStyle = '#F4EEF2'; x.beginPath(); x.moveTo(256, yB - 44);
      x.bezierCurveTo(212, yB - 64, 150, yB - 52, 132, yB - 8); x.bezierCurveTo(170, yB - 24, 214, yB - 18, 256, yB - 22);
      x.bezierCurveTo(298, yB - 18, 342, yB - 24, 380, yB - 8); x.bezierCurveTo(362, yB - 52, 300, yB - 64, 256, yB - 44); x.fill(); }
    /* la corbata del vendedor, asomando abajo */
    if(corbata){ x.fillStyle = corbata; x.beginPath(); x.moveTo(236, 448); x.lineTo(276, 448); x.lineTo(268, 470); x.lineTo(288, 512); x.lineTo(224, 512); x.lineTo(244, 470); x.closePath(); x.fill();
      x.fillStyle = '#F4EEF2'; x.beginPath(); x.moveTo(190, 430); x.lineTo(256, 452); x.lineTo(322, 430); x.lineTo(322, 448); x.lineTo(256, 470); x.lineTo(190, 448); x.closePath(); x.fill(); }
    tex.needsUpdate = true;
  };
  g.userData.cara({});
  g.userData.cuerpo = cuerpoG; g.userData.techo = arriba;           // el techo se puede recolorear (el tinte de la clienta)
  return g;
}

/* cuánto se abre la boca mientras suena una línea (no es lectura de labios: es ritmo que se ve vivo) */
export function habla(t, l){
  if(!l || t < l.t0 || t > l.t1) return 0;
  const u = t - l.t0; return Math.max(0, .25 + .55 * Math.abs(Math.sin(u * 13.7)) * (.6 + .4 * Math.sin(u * 3.1)) - (l.t1 - t < .08 ? .5 : 0));
}
/* parpadeo cada tantos segundos, distinto para cada quien */
export const parpadeo = (t, fase = 0) => { const u = (t + fase) % 3.4; return u < .13 ? Math.abs(u - .065) / .065 : 1; };
/* un salto con aplastamiento al caer (para las entradas) */
export function salto(t, t0, alto = .5, dur = .5){
  const u = (t - t0) / dur; if(u < 0 || u > 1.35) return { y: 0, sx: 1, sy: 1 };
  if(u <= 1) return { y: 4 * alto * u * (1 - u), sx: 1 - .08 * Math.sin(u * Math.PI), sy: 1 + .1 * Math.sin(u * Math.PI) };
  const v = (u - 1) / .35; return { y: 0, sx: 1 + .14 * Math.sin(v * Math.PI), sy: 1 - .16 * Math.sin(v * Math.PI) };
}
