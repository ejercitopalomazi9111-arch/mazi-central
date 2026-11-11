/* INKWELL Studio · Mis personajes: los personajes de cada escritor, con sus poses (subidas o dibujadas
   en la mesa de dibujo). Viven en este teléfono (IndexedDB «inkwell-personajes») y sirven en todas las obras:
   al ponerlos en una página, sus poses se COPIAN a la obra, para que la obra se exporte y se abra sola. */
const DB = 'inkwell-personajes';
function abrir(){
  return new Promise((ok, mal) => {
    const q = indexedDB.open(DB, 1);
    q.onupgradeneeded = () => q.result.createObjectStore('personajes', { keyPath: 'id' });
    q.onsuccess = () => ok(q.result); q.onerror = () => mal(q.error);
  });
}
async function tx(modo, f){ const d = await abrir(); return new Promise((ok, mal) => { const t = d.transaction('personajes', modo); const r = f(t.objectStore('personajes')); t.oncomplete = () => ok(r && r.result); t.onerror = () => mal(t.error); }); }
export async function todos(){ return ((await tx('readonly', (s) => s.getAll())) || []).sort((a, b) => (b.cambio || 0) - (a.cambio || 0)); }
export async function uno(id){ return tx('readonly', (s) => s.get(id)); }
export async function guardar(p){ p.cambio = Date.now(); await tx('readwrite', (s) => s.put(p)); return p; }
export async function borrar(id){ await tx('readwrite', (s) => s.delete(id)); }
export function nuevo(nombre){ return { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nombre: String(nombre || 'Mi personaje').slice(0, 40), poses: [], creado: Date.now() }; }
/* una imagen subida, recortada a lo que tiene dibujo (sin márgenes transparentes) y con tope de 1200 px */
export async function aPose(archivo){
  const bm = await createImageBitmap(archivo), k = Math.min(1, 1200 / Math.max(bm.width, bm.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bm.width * k); cv.height = Math.round(bm.height * k);
  const x = cv.getContext('2d'); x.drawImage(bm, 0, 0, cv.width, cv.height);
  const d = x.getImageData(0, 0, cv.width, cv.height).data; let a = cv.width, b = cv.height, c = -1, e = -1;
  for(let y = 0; y < cv.height; y++) for(let i = 0; i < cv.width; i++) if(d[(y * cv.width + i) * 4 + 3] > 8){ if(i < a) a = i; if(i > c) c = i; if(y < b) b = y; if(y > e) e = y; }
  if(c < 0) return new Promise((ok) => cv.toBlob(ok, 'image/png'));
  const r = document.createElement('canvas'); r.width = c - a + 1; r.height = e - b + 1; r.getContext('2d').drawImage(cv, -a, -b);
  return new Promise((ok) => r.toBlob(ok, 'image/png'));
}
