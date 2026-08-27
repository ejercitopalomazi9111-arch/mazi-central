/* ══════════════════════════════════════════════════════════════════════════
   figuras.js — LAS FIGURAS DE CADA IA
   ──────────────────────────────────────────────────────────────────────────
   Un glifo por familia de modelo. Se usa en La Sala (el avatar del chat), en
   el Taller (el cuarto 3D) y en el Cerebro (el núcleo de cada IA en la red).

   VIVE EN UN SOLO LUGAR A PROPÓSITO. Tener la tabla copiada en tres archivos
   es exactamente el defecto `renombrar-de-un-lado` del cerebro esperando a
   pasar: se agrega un modelo en uno, se olvida en los otros, y la misma IA
   sale con tres caras distintas según dónde la mires.

   SON DIBUJO NUESTRO, no los logos de cada empresa. Son marcas registradas y
   esto vive en un repo público de una empresa que vende servicios. Con formas
   propias se distinguen igual y nadie tiene nada que reclamar.

   Se carga con un <script src> normal y deja todo en `window.FIGURAS_IA`.
   Si no carga, cada página tiene su respaldo: mejor un círculo que una página
   rota por un adorno.
   ═════════════════════════════════════════════════════════════════════════ */
(function(){
  const FIGURAS = {
  persona:   '<circle cx="12" cy="8.4" r="3.6"/><path d="M4.9 20c0-4 3.2-6.5 7.1-6.5S19.1 16 19.1 20"/>',
  claude:    '<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><path d="M12 2.2v3.6M12 18.2v3.6M2.2 12h3.6M18.2 12h3.6M5.1 5.1l2.5 2.5M16.4 16.4l2.5 2.5M18.9 5.1l-2.5 2.5M7.6 16.4l-2.5 2.5"/>',
  gpt:       '<path d="M12 2.6 20.1 7.3v9.4L12 21.4 3.9 16.7V7.3z"/>',
  gemini:    '<circle cx="8.9" cy="12" r="4.9"/><circle cx="15.1" cy="12" r="4.9"/>',
  llama:     '<path d="M2.4 19.2 9 8.2l3.9 6 2.6-3.6 6.1 8.6z"/>',
  mistral:   '<path d="M3 7.6h10.4a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3 12h14.6"/><path d="M3 16.4h9.2a2.8 2.8 0 1 1-2.8 2.8"/>',
  deepseek:  '<path d="M5.8 6.6 12 11.7l6.2-5.1"/><path d="M5.8 12.9 12 18l6.2-5.1"/>',
  qwen:      '<path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/><path d="M12 8.3 15.7 12 12 15.7 8.3 12z" fill="currentColor" stroke="none"/>',
  grok:      '<path d="M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4"/>',
  comando:   '<path d="M5.2 6.4 10.9 12l-5.7 5.6"/><path d="M12.6 17.8h6.6"/>',
  perplexity:'<circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/><path d="M6.9 17.1a7.2 7.2 0 0 1 0-10.2"/><path d="M17.1 6.9a7.2 7.2 0 0 1 0 10.2"/>',
  copilot:   '<rect x="3.2" y="6.2" width="17.6" height="11.6" rx="5.8"/><circle cx="8.6" cy="12" r="2.3" fill="#fff" stroke="none"/><circle cx="15.4" cy="12" r="2.3" fill="#fff" stroke="none"/>',
  groq:      '<path d="M13.6 2.4 5.2 13.6h5.4L9.4 21.6 18.8 10h-5.8z"/>',
  local:     '<path d="M3.6 10.6 12 3.9l8.4 6.7V20H3.6z"/><circle cx="12" cy="15.2" r="1.8" fill="currentColor" stroke="none"/>',
  otra:      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>',
  agente:    '<rect x="4.6" y="4.6" width="14.8" height="14.8" rx="4.6"/>',
  ninguna:   '<circle cx="12" cy="12" r="8" stroke-dasharray="3 3.4"/>',
  };

  const NOMBRE_FAM = {
  persona:'Persona', claude:'Claude', gpt:'GPT', gemini:'Gemini',
  llama:'Llama', mistral:'Mistral', deepseek:'DeepSeek', qwen:'Qwen',
  grok:'Grok', comando:'Cohere', perplexity:'Perplexity',
  copilot:'Copilot', groq:'Groq', local:'En tu máquina',
  otra:'Otra IA', agente:'No dijo cuál', ninguna:'Ya no está en la sala',
  };

  /* Los caminos de cada figura, para dibujarlas en canvas en vez de en SVG.
     `Path2D` acepta el mismo texto de `d` que un <path>, así que la tabla
     sirve para las dos formas de pintar sin escribirla dos veces. */
  function caminosDe(familia){
    const svg = FIGURAS[familia] || FIGURAS.otra;
    const trozos = [];
    for(const m of svg.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)){
      trozos.push({ tipo:'path', d:m[1], relleno:/fill="currentColor"/.test(m[2]) });
    }
    for(const m of svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"([^>]*)\/>/g)){
      trozos.push({ tipo:'circulo', x:+m[1], y:+m[2], r:+m[3],
                    relleno:/fill="currentColor"/.test(m[4]) });
    }
    for(const m of svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)"([^>]*)\/>/g)){
      trozos.push({ tipo:'rect', x:+m[1], y:+m[2], an:+m[3], al:+m[4], r:+m[5],
                    relleno:/fill="currentColor"/.test(m[6]) });
    }
    return trozos;
  }

  window.FIGURAS_IA = { FIGURAS, NOMBRE_FAM, caminosDe, CAJA: 24 };
})();
