/* TUTORIAL UNIVERSAL DE INICIO DE MAZI ARE1 (prompt maestro de Carlos §5, y 25 nov: «al abrir que elija el idioma el que
   controla la experiencia antes del usuario, pasen 5 segundos y ahora sí inicie el tutorial; y que el gesto de atrás, si
   lo hago antes de hacer algo del tutorial, me permita saltármelo»).
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Lo usa cualquier experiencia: la experiencia pone la VOZ (decir) y, si quiere, una guía (Monarch usa una mariposa);
   este módulo sólo lleva los pasos y comprueba que se hicieron de verdad:
     mirar     voltear ≥ 35° a la izquierda y ≥ 35° a la derecha
     manos     una mano a la vista de la cámara (sin cámara o sin manos: se dice cómo elegir sin ellas y se sigue)
     apuntar   que el botón de práctica reciba el foco (rayo de la mano, mirada o control)
     elegir    que se elija (pellizco, mirada fija, X del control o toque)
   SALTAR: el gesto de «atrás» (palma arriba sostenida, o Círculo) en cualquier momento del tutorial lo salta.
   crearTutorial({ THREE, V, grupo, decir(id, alTerminar), boton(texto, accion), guia(dir|null), alTerminar(saltado) }) */
import { crearMaestro } from './maestro.js';
export function crearTutorial({ THREE, V, grupo, decir, boton, guia = () => {}, alTerminar = () => {}, textos = {} }){
  const T = { activo: false, paso: null, saltado: false, hechos: [] };
  let t0 = 0, izq = false, der = false, practica = null, fallos = 0, esperaDesde = 0, hablando = false;
  const ahora = () => performance.now() / 1000;
  const dir = new THREE.Vector3();
  /* el maestro de gestos (maestro.js): unas manos fantasma enfrente HACEN lo que la voz pide, en bucle, hasta que lo haces */
  let maestro = null; crearMaestro(V, grupo).then((m) => { maestro = m; ensenar(); }).catch((e) => V.fallo?.('E-MAESTRO', 'cargar la mano fantasma', e));
  function ensenar(){ if(!maestro) return;
    if(!T.activo || T.paso === 'mirar') return maestro.ocultar();
    if(T.paso === 'manos') return maestro.mostrar('levantar');
    if(T.paso === 'apuntar' && practica) return maestro.mostrar('apuntar', practica.position);
    if(T.paso === 'elegir' && practica) return maestro.mostrar('pellizcar', practica.position);
    maestro.ocultar(); }
  T.maestro = () => maestro;
  /* decir(lineas[], alTerminar): la experiencia dice la fila en orden y avisa al acabar */
  function ir(paso, lineas = []){
    T.paso = paso; t0 = ahora(); esperaDesde = t0;
    if(lineas.length){ hablando = true; decir(lineas, () => { hablando = false; esperaDesde = ahora(); }); } else hablando = false;
    if(paso === 'mirar'){ izq = der = false; guia(new THREE.Vector3(-1.6, .5, -1.2)); }
    if(paso === 'apuntar'){
      guia(null);
      practica = boton(textos.aqui || 'Aquí', () => elegido(), .62); practica.position.set(0, -.05, -1.25); practica.scale.setScalar(1.3); practica.lookAt(0, -.05, 0); grupo.add(practica);   /* cerca y grande: es el primer botón que alguien toca en su vida en VR */
      practica.userData.alFoco = () => { if(T.paso === 'apuntar'){ T.hechos.push('apuntar'); ir('elegir', ['t-elegir']); } };
    }
    ensenar();
  }
  function elegido(){
    if(T.paso !== 'apuntar' && T.paso !== 'elegir') return;
    T.hechos.push('elegir'); quitarPractica(); terminar(false);
  }
  function quitarPractica(){ if(practica){ grupo.remove(practica); practica = null; } }
  function terminar(saltado){
    if(!T.activo) return;
    T.activo = false; T.paso = null; T.saltado = saltado; guia(null); quitarPractica(); maestro?.ocultar();
    decir([saltado ? 't-saltar' : 't-listo'], () => alTerminar(saltado));
  }
  T.empezar = () => { T.activo = true; T.saltado = false; T.hechos = []; fallos = 0; ir('mirar', ['t-hola', 't-mirar']); };
  T.saltar = () => { if(T.activo) terminar(true); };
  T.elegibles = () => (practica ? [practica] : []);
  /* cada cuadro: comprobar el paso */
  T.cuadro = () => {
    if(!T.activo) return;
    maestro?.cuadro();
    const t = ahora();
    if(T.paso === 'mirar'){
      if(hablando && t - t0 < 3) return;   /* que primero oiga qué hacer */
      V.cabeza.getWorldDirection(dir); const yaw = Math.atan2(-dir.x, -dir.z) * 180 / Math.PI;   /* + = izquierda */
      if(yaw > 35){ izq = true; guia(new THREE.Vector3(1.6, .5, -1.2)); }
      if(izq && yaw < -35) der = true;
      if(izq && der){ T.hechos.push('mirar'); ir('manos', ['t-mirar-bien', 't-manos']); }
      return;
    }
    if(T.paso === 'manos'){
      if((V.extra.manos || []).length){ T.hechos.push('manos'); ir('apuntar', ['t-manos-bien', 't-apuntar']); return; }
      /* sin cámara o con las manos apagadas, o 9 s sin ver una mano: se explica cómo elegir sin ellas y se sigue */
      const sinManos = !V.hayCamara?.() || !V.AJ?.manos;
      if((sinManos && !hablando) || t - t0 > 9 + 6){ T.hechos.push('sin-manos'); ir('apuntar', ['t-sin-manos', 't-apuntar']); }
      return;
    }
    if(T.paso === 'elegir' && !hablando && t - esperaDesde > 12 && fallos < 2){ fallos++; esperaDesde = t; hablando = true; decir(['t-elegir-otra'], () => { hablando = false; esperaDesde = ahora(); }); }
  };
  return T;
}
