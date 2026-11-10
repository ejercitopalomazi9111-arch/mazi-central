/* INKWELL Studio · las obras de quien escribe, guardadas en su teléfono (IndexedDB «inkwell-studio»).
   Son privadas: nada sale del teléfono hasta que quien la hizo la exporta o la pasa a su librero.

   obra = { id, tipo: 'libro' | 'comic', titulo, autor, sinopsis, portada: Blob|null, creada, editada,
            capitulos: [{ id, titulo, html }]                      // libro
            paginas:   [{ id, formato, ancho, alto, fondo, capas }] // cómic (ver comic.html)
          } */
function abrir(){
  return new Promise((ok, mal) => {
    const q = indexedDB.open('inkwell-studio', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('obras', { keyPath: 'id' });
    q.onsuccess = () => ok(q.result); q.onerror = () => mal(q.error);
  });
}
function tx(modo, fn){
  return abrir().then((d) => new Promise((ok, mal) => {
    const t = d.transaction('obras', modo), st = t.objectStore('obras'); let res;
    const r = fn(st); if(r) r.onsuccess = () => { res = r.result; };
    t.oncomplete = () => ok(res); t.onerror = () => mal(t.error);
  }));
}
export const nuevoId = (p = 'o') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const todas = async () => ((await tx('readonly', (st) => st.getAll())) || []).sort((a, b) => b.editada - a.editada);
export const una = (id) => tx('readonly', (st) => st.get(id));
export const guardar = (o) => { o.editada = Date.now(); return tx('readwrite', (st) => st.put(o)); };
export const borrar = (id) => tx('readwrite', (st) => st.delete(id));

export function nueva(tipo, titulo, formato = 'vertical'){
  const o = { id: nuevoId(), tipo, titulo: titulo || (tipo === 'libro' ? 'Mi libro' : 'Mi cómic'), autor: '', sinopsis: '', portada: null, creada: Date.now(), editada: Date.now() };
  if(tipo === 'libro') o.capitulos = [{ id: nuevoId('c'), titulo: 'Capítulo 1', html: '' }];
  else o.paginas = [paginaNueva(formato)];
  return o;
}
export const FORMATOS = {
  vertical: { nombre: 'Webtoon / manhwa (vertical)', ancho: 800, alto: 1280 },
  pagina:   { nombre: 'Cómic / manga (página)',      ancho: 800, alto: 1130 },
  cuadrado: { nombre: 'Viñeta cuadrada (redes)',     ancho: 1000, alto: 1000 },
};
export function paginaNueva(formato = 'vertical'){
  const f = FORMATOS[formato] || FORMATOS.vertical;
  return { id: nuevoId('p'), formato, ancho: f.ancho, alto: f.alto, fondo: '#ffffff', capas: [] };
}

/* ── pasar una obra al librero de INKWELL (para leerla en «Libros») ── */
function abrirLibros(){
  return new Promise((ok, mal) => {
    const q = indexedDB.open('inkwell-libros', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('libros', { keyPath: 'id' });
    q.onsuccess = () => ok(q.result); q.onerror = () => mal(q.error);
  });
}
export async function alLibrero(registro){
  const d = await abrirLibros();
  await new Promise((ok, mal) => { const t = d.transaction('libros', 'readwrite'); t.objectStore('libros').put(registro); t.oncomplete = ok; t.onerror = () => mal(t.error); });
}
