/* ══════════════════════════════════════════════════════════════════════════
   CAMBIAR COLOR · qué es cabello, qué es piel, qué es ropa
   ──────────────────────────────────────────────────────────────────────────
   Elegir sólo por color tiene un techo: un cabello rubio se parece al fondo
   deslavado y a la frente, y unos jeans gastados tienen partes casi grises.
   Con una foto de verdad, tocar el cabello pintaba de rosa medio paisaje.
   El modelo «selfie multiclass» de MediaPipe (Google, Apache 2.0) corre DENTRO
   del teléfono y dice, pixel por pixel, si es fondo, cabello, piel del
   cuerpo, piel de la cara, ropa u otra cosa. Con eso el toque se queda en su
   parte: el color decide la orilla fina, el modelo decide hasta dónde llega.
   Reusa el motor de MediaPipe que ya está en ../presentaciones/vendor (el
   del quitafondos); aquí sólo vive el modelo, en vendor/.
   Si no carga (sin internet la primera vez, teléfono viejo), todo sigue
   funcionando sólo por color.
   ═════════════════════════════════════════════════════════════════════════ */
const MP = new URL('../presentaciones/vendor/mediapipe/', import.meta.url).href;
const MODELO = new URL('./vendor/selfie_multiclass_256x256.tflite', import.meta.url).href;

export const PARTES = ['fondo', 'cabello', 'piel', 'cara', 'ropa', 'otros'];

let segmentador = null, cargando = null;
export function cargarPartes(){
  if(segmentador) return Promise.resolve(segmentador);
  if(cargando) return cargando;
  cargando = (async () => {
    const { ImageSegmenter, FilesetResolver } = await import(MP + 'vision_bundle.mjs');
    const fs = await FilesetResolver.forVisionTasks(MP + 'wasm');
    segmentador = await ImageSegmenter.createFromOptions(fs, {
      baseOptions: { modelAssetPath: MODELO, delegate: 'CPU' },
      runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true,
    });
    return segmentador;
  })();
  cargando.catch(() => { cargando = null; });
  return cargando;
}

/* Confianza de cada parte (0-255) al tamaño de `lienzo`. */
export async function partes(lienzo){
  const s = await cargarPartes();
  const r = s.segment(lienzo);
  try{
    const W = lienzo.width, H = lienzo.height;
    return r.confidenceMasks.map((m) => {
      const f = m.getAsFloat32Array(), mw = m.width, mh = m.height, o = new Uint8Array(W * H);
      if(mw === W && mh === H){ for(let i = 0; i < o.length; i++) o[i] = f[i] * 255; }
      else for(let y = 0; y < H; y++){ const sy = Math.min(mh - 1, (y * mh / H) | 0); for(let x = 0; x < W; x++) o[y * W + x] = f[sy * mw + Math.min(mw - 1, (x * mw / W) | 0)] * 255; }
      return o;
    });
  } finally { r.close?.(); }
}
