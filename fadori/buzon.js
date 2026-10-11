/* EL BUZÓN DE LA PANTALLA, para usarlo desde otra app (el Estudio de podcast)
   ----------------------------------------------------------------------------
   Carlos, 10 de octubre: «si lo subo desde mi teléfono, que la tablet también
   lo tenga». Desde la pantalla de turnos eso ya lo hace `tele.js`; esto es lo
   mismo pero suelto, para que el Estudio mande el episodio que acaba de
   exportar sin pasar por los Ajustes de la pantalla.

   Lee lo mismo que guarda Fadori en este teléfono (misma dirección, misma
   llave de la cooperativa, mismo aparato), así que si ya pusiste el pasador
   en Fadori, aquí no lo vuelve a pedir.

     hayLlave()                         → ¿este teléfono ya tiene la llave?
     entrar(pasador)                    → { ok } | { error }
     mandar(blob, { nombre }, avance)   → sube el episodio en pedazos */

const FABRICA = 'https://fadori.palomazi9111.workers.dev';
const lee = (k) => { try{ return localStorage.getItem(k) || ''; }catch(e){ return ''; } };
function direccion(){
  const v = lee('fadori_servidor');
  if(v === 'local') return '';
  if(v) return v;
  return /(^|\.)mazi-central\.palomazi9111\.workers\.dev$/.test(location.hostname) ? FABRICA : '';
}
function aparato(){
  let v = lee('fadori_aparato');
  if(!/^[a-f0-9]{32}$/.test(v)){
    const b = new Uint8Array(16); crypto.getRandomValues(b);
    v = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    try{ localStorage.setItem('fadori_aparato', v); }catch(e){}
  }
  return v;
}
function llave(){
  try{ const j = JSON.parse(lee('fadori_llave_mostrador') || 'null'); if(j && /^[a-f0-9]{64}$/.test(j.token || '') && (j.vence || 0) > Date.now()) return j.token; }catch(e){}
  return '';
}
export const hayServidor = () => !!direccion();
export const hayLlave = () => !!llave();
const url = (ruta, q = {}) => direccion() + ruta + '?' + new URLSearchParams(Object.assign({ casa: lee('fadori_casa') || 'rembrandt' }, q));
const cabezas = (bin) => Object.assign({ 'content-type': bin ? 'application/octet-stream' : 'application/json', 'x-fadori-aparato': aparato() }, llave() ? { 'x-fadori-admin': llave() } : {});

export async function entrar(pasador){
  if(!direccion()) return { error: 'No hay servidor de Fadori.' };
  try{
    const r = await fetch(url('/api/entrar'), { method: 'POST', headers: cabezas(false), body: JSON.stringify({ pasador: String(pasador || '') }) });
    const j = await r.json().catch(() => ({}));
    if(r.ok && j.token){ try{ localStorage.setItem('fadori_llave_mostrador', JSON.stringify({ token: j.token, vence: j.vence })); }catch(e){} return { ok: true }; }
    return { error: j.error || 'Ese no es el pasador.' };
  }catch(e){ return { error: 'Sin conexión.' }; }
}

async function pide(ruta, { cuerpo, q, bin } = {}){
  for(let i = 0; ; i++){
    try{
      const r = await fetch(url(ruta, q), { method: 'POST', headers: cabezas(bin), body: bin ? cuerpo : JSON.stringify(cuerpo || {}) });
      const j = await r.json().catch(() => ({}));
      if(!r.ok) throw Object.assign(new Error(j.error || ('El servidor contestó ' + r.status)), { definitivo: r.status < 500 && r.status !== 429 });
      return j;
    }catch(e){ if(e.definitivo || i >= 3) throw e; await new Promise(s => setTimeout(s, 1000 * (i + 1))); }
  }
}
export async function mandar(blob, { nombre = 'Episodio' } = {}, avance = () => {}){
  const id = 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const alta = await pide('/api/medios/alta', { cuerpo: { id, tipo: 'ep', clase: 'archivo', nombre, mime: blob.type, tam: blob.size } });
  for(let k = 0; k < alta.partes; k++){
    avance(k / alta.partes);
    await pide('/api/medios/parte', { q: { id, k }, bin: true, cuerpo: await blob.slice(k * alta.parte, (k + 1) * alta.parte).arrayBuffer() });
  }
  avance(1);
  return id;
}
