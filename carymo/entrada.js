/* entrada.js — LA ANIMACIÓN DE ENTRADA DE CARYMO
 * Carlos, 13 nov: «no olvides poner una animación de entrada, porque siempre la misma pantalla aburrida no
 * llama a entrar. Si la abres y hay una animación y se ve mamador, me dan ganas de quedarme».
 *
 * El telón (#entrada) ya viene puesto en el HTML para que no se vea la app un instante antes; un script
 * de una línea lo quita si ya se vio en esta visita o si el teléfono pide «reducir movimiento».
 * La secuencia (≈3 s), sólo con transform y opacity:
 *   1. destellos que aparecen alrededor;
 *   2. el ícono llega girando y rebota, con una onda de luz;
 *   3. C·A·R·Y·M·O cae letra por letra y pasa un brillo;
 *   4. el lema, y la mascota que sube y saluda;
 *   5. el telón se cierra en un círculo hacia el ícono y queda la app.
 * Un toque en cualquier parte la salta. */
import { crearMascota } from './mascota.js';

const quieta = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch{ return false; } };
const curva = { rebote: 'cubic-bezier(.3,1.55,.45,1)', sale: 'cubic-bezier(.2,.9,.25,1)', entra: 'cubic-bezier(.55,0,.75,.2)' };

export function entrada({ personaje = 'tigre' } = {}){
  const el = document.getElementById('entrada');
  if(!el) return Promise.resolve();
  if(quieta()){ el.remove(); return Promise.resolve(); }
  try{ sessionStorage.setItem('carymo.entrada', '1'); }catch{}
  const ico = el.querySelector('.en-ico'), onda = el.querySelector('.en-onda'), letras = [...el.querySelectorAll('.en-nombre i')],
    brillo = el.querySelector('.en-brillo'), lema = el.querySelector('.en-lema'), masc = el.querySelector('.en-masc');
  /* los destellos, en lugares al azar alrededor del centro */
  const chispas = el.querySelector('.en-chispas');
  for(let k = 0; k < 16; k++){
    const s = document.createElement('i'); const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 190;
    s.style.left = `calc(50% + ${Math.cos(a) * r}px)`; s.style.top = `calc(36% + ${Math.sin(a) * r * .9}px)`; s.style.scale = String(.4 + Math.random() * .9);
    chispas.append(s);
    s.animate([{ opacity: 0, transform: 'scale(0) rotate(0deg)' }, { opacity: 1, transform: 'scale(1) rotate(90deg)', offset: .4 }, { opacity: .55, transform: 'scale(.7) rotate(160deg)' }],
      { duration: 1400 + Math.random() * 900, delay: 80 + Math.random() * 1500, easing: curva.sale, fill: 'both' });
  }
  const anims = [];
  const A = (nodo, frames, op) => { const x = nodo.animate(frames, { fill: 'both', ...op }); anims.push(x); return x; };
  A(ico, [{ opacity: 0, transform: 'scale(.25) rotate(-24deg)' }, { opacity: 1, transform: 'scale(1.1) rotate(4deg)', offset: .65 }, { opacity: 1, transform: 'scale(1) rotate(0)' }], { duration: 760, delay: 120, easing: curva.rebote });
  A(onda, [{ opacity: .9, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(2.6)' }], { duration: 900, delay: 620, easing: curva.sale });
  letras.forEach((l, i) => A(l, [{ opacity: 0, transform: 'translateY(46px) scale(.5) rotate(-10deg)' }, { opacity: 1, transform: 'translateY(-8px) scale(1.12) rotate(3deg)', offset: .6 }, { opacity: 1, transform: 'none' }],
    { duration: 560, delay: 760 + i * 75, easing: curva.rebote }));
  A(brillo, [{ transform: 'translateX(-120%) skewX(-20deg)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: 'translateX(220%) skewX(-20deg)', opacity: 0 }], { duration: 780, delay: 1340, easing: 'ease-in-out' });
  A(lema, [{ opacity: 0, transform: 'translateY(14px)', letterSpacing: '.6em' }, { opacity: 1, transform: 'none', letterSpacing: '.32em' }], { duration: 620, delay: 1420, easing: curva.sale });
  let m = null;
  if(personaje && personaje !== 'no'){
    m = crearMascota(masc, { personaje, tam: 120 });
    A(masc, [{ opacity: 0, transform: 'translateY(120px)' }, { opacity: 1, transform: 'translateY(-10px)', offset: .7 }, { opacity: 1, transform: 'none' }], { duration: 620, delay: 1550, easing: curva.rebote });
    setTimeout(() => m && m.play('saluda'), 1900);
  }

  return new Promise((listo) => {
    let cerrando = false;
    const cerrar = () => {
      if(cerrando) return; cerrando = true; clearTimeout(t);
      const r = ico.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const fin = el.animate([{ clipPath: `circle(150% at ${cx}px ${cy}px)` }, { clipPath: `circle(0px at ${cx}px ${cy}px)` }], { duration: 560, easing: curva.entra, fill: 'forwards' });
      fin.finished.catch(() => {}).then(() => { m?.destruir(); el.remove(); listo(); });
    };
    const t = setTimeout(cerrar, 3150);
    el.addEventListener('pointerdown', () => { for(const a of anims) a.finish(); cerrar(); }, { once: true });
  });
}
