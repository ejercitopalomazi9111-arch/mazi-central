/* ══════════════════════════════════════════════════════════════════════════
   LO QUE CONTESTA LA IA, VUELTO JSON (aunque venga mal escrito)
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 12 nov, en CARYMO: «Expected double-quoted property name in JSON at
   position 742 (line 15 column 11)». La IA (Negro, Groq) a veces deja una coma
   de más antes de cerrar, un comentario, comillas «bonitas», saltos de línea
   dentro de un texto o la respuesta cortada a la mitad porque se acabó el tope.
   Antes eso tronaba la lección entera; ahora se REPARA aquí, y si de plano no
   se puede, quien llama vuelve a pedirla (el error trae `reintentar`).
   Lo usan CARYMO (estudio.js) y Explica (explica.js).
   ═════════════════════════════════════════════════════════════════════════ */
export function repararJSON(s){
  let out = '', enCadena = false, escape = false;
  const pila = [];
  const quitarComaFinal = () => { out = out.replace(/,\s*$/, ''); };
  for(let i = 0; i < s.length; i++){
    const c = s[i];
    if(enCadena){
      if(escape){ out += c; escape = false; continue; }
      if(c === '\\'){ out += c; escape = true; continue; }
      if(c === '"' || c === '”'){
        /* una comilla «de cierre» seguida de algo que no cierra el valor es una comilla DENTRO del texto */
        const sig = s.slice(i + 1).match(/^\s*(.)/);
        if(sig && !/[,:}\]]/.test(sig[1])){ out += '\\"'; continue; }
        enCadena = false; out += '"'; continue;
      }
      if(c === '\n'){ out += '\\n'; continue; }
      if(c === '\r'){ continue; }
      if(c === '\t'){ out += '\\t'; continue; }
      out += c; continue;
    }
    if(c === '"' || c === '“' || c === '”'){ enCadena = true; out += '"'; continue; }
    if(c === "'"){
      /* cadena con comilla sencilla → con doble */
      let j = i + 1, txt = '';
      while(j < s.length && s[j] !== "'"){ txt += s[j] === '"' ? '\\"' : s[j]; j++; }
      out += '"' + txt + '"'; i = j; continue;
    }
    if(c === '/' && s[i + 1] === '/'){ while(i < s.length && s[i] !== '\n') i++; continue; }
    if(c === '/' && s[i + 1] === '*'){ const f = s.indexOf('*/', i + 2); if(f < 0) break; i = f + 1; continue; }
    if(c === '{' || c === '['){ pila.push(c === '{' ? '}' : ']'); out += c; continue; }
    if(c === '}' || c === ']'){ quitarComaFinal(); pila.pop(); out += c; continue; }
    /* llave sin comillas: { titulo: "…" } */
    if(/[A-Za-z_]/.test(c) && /[{,]\s*$/.test(out)){
      const m = s.slice(i).match(/^([A-Za-z_][\w]*)\s*:/);
      if(m){ out += `"${m[1]}":`; i += m[0].length - 1; continue; }
    }
    out += c;
  }
  /* la respuesta se cortó a la mitad: se cierra lo que quedó abierto */
  if(enCadena) out += '"';
  /* dentro de un objeto, un «"llave"» o «"llave":» sin valor sobra; dentro de una lista, un texto suelto SÍ es un valor */
  if(pila[pila.length - 1] === '}') out = out.replace(/([{,])\s*"[^"]*"\s*:?\s*$/, '$1');
  out = out.replace(/:\s*$/, ': null');
  quitarComaFinal();
  while(pila.length){ quitarComaFinal(); out += pila.pop(); }
  return out;
}
export function sacarJSON(t){
  const s = String(t || '').replace(/^﻿/, '').replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '');
  const a = s.indexOf('{');
  if(a < 0){ const e = new Error('La IA no contestó con lo que se le pidió.'); e.reintentar = true; throw e; }
  const b = s.lastIndexOf('}');
  const crudo = b > a ? s.slice(a, b + 1) : s.slice(a);
  try{ return JSON.parse(crudo); }catch{}
  /* primero con TODO lo que viene después del primer {: si la respuesta se cortó, lo que va
     después del último } también es parte del JSON (si no, se perderían las preguntas) */
  try{ return JSON.parse(repararJSON(s.slice(a))); }catch{}
  try{ return JSON.parse(repararJSON(crudo)); }catch{}
  const e = new Error('La IA mandó la respuesta mal escrita.'); e.reintentar = true; throw e;
}
