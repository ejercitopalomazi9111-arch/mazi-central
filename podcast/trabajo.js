/* ESTUDIO · el trabajador de fondo.
   Limpiar 20 minutos de audio son unos segundos de cálculo seguido: en la
   página principal el teléfono congela la pantalla y Safari ofrece «cerrar
   la página». Aquí corre aparte y la pantalla sigue viva con su barra de
   avance. Los arreglos viajan TRANSFERIDOS, no copiados: un episodio largo
   pesa más de cien megas y copiarlo dos veces es lo que tumba al iPhone. */
import { limpiar, armar, aMp3, SR } from './motor.js';
import { jingle } from './jingle.js';

let lame = null;
async function cargarLame(){
  if(lame) return lame;
  /* lamejs no es un módulo: define una función global. Se evalúa aparte y se
     toma lo que deja (licencia LGPL, archivo intacto en vendor/) */
  const txt = await (await fetch(new URL('./vendor/lame-1.2.1.min.js', import.meta.url))).text();
  lame = (0, eval)(txt + ';lamejs');
  return lame;
}

self.onmessage = async (e) => {
  const { id, op, datos } = e.data;
  try{
    let r, transf = [];
    if(op === 'limpiar'){
      r = limpiar(datos.audio, SR, datos.opciones);
      transf = [r.datos.buffer];
    } else if(op === 'jingle'){
      const a = jingle(datos);
      r = { datos: a }; transf = [a.buffer];
    } else if(op === 'armar'){
      r = armar(datos.partes, SR, datos.opciones);
      transf = [r.datos.buffer];
    } else if(op === 'mp3'){
      const l = await cargarLame();
      const b = await aMp3(datos.audio, SR, datos.kbps || 96, l,
        (p) => self.postMessage({ id, avance: p }));
      r = { datos: b }; transf = [b.buffer];
    } else throw new Error('No sé hacer: ' + op);
    self.postMessage({ id, ok: true, r }, transf);
  }catch(err){
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};
