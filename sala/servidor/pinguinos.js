/* ══ MIS PINGÜINOS · el respaldo en el servidor ═══════════════════════════
   Carlos, 22 de octubre: «que se guarden en un servidor por si acaso». La
   app (pinguinos/) guarda todo en el teléfono; esto es la copia de afuera,
   para que un teléfono perdido o un Safari que borra lo guardado no se lleve
   la colección.

   ⚠ NO HAY CUENTA: HAY UN CÓDIGO. Cada colección nace en el teléfono con un
   código de 20 letras al azar (≈ 10^30 combinaciones) y ése es el único
   permiso: quien lo tiene, ve y cambia esa colección; quien no, no puede ni
   saber que existe. Es lo que permite pasarla a otro teléfono escribiendo el
   código, sin pedirle correo a nadie.

   Un objeto (Durable Object) por colección, aparte de las salas: un peluche
   no tiene nada que hacer en la mesa de las IAs, y así el tope de una cosa no
   toca a la otra.

     POST /api/pinguinos/<código>/poner   { id, nombre, nota, creado, foto }  foto = data:image/jpeg;base64,…
     POST /api/pinguinos/<código>/quitar  { id }
     GET  /api/pinguinos/<código>/lista                       → sin fotos
     GET  /api/pinguinos/<código>/foto?id=…                   → la imagen   */

export const LETRAS_COL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LARGO_COL = 20;
export const TOPE = { peluches: 600, foto: 450_000, nombre: 40, nota: 200, cuerpo: 520_000 };

export const esColeccion = (c) => typeof c === 'string' && c.length === LARGO_COL
  && [...c].every((x) => LETRAS_COL.includes(x));

const json = (d, status = 200) => new Response(JSON.stringify(d), {
  status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const texto = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const RE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const RE_FOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/* El corazón, aparte de Cloudflare: recibe el almacén y el pedido. Así las
   pruebas lo corren en Node con un almacén de mentiras y es el mismo código. */
export async function manejar(almacen, pedido){
  const url = new URL(pedido.url);
  const accion = url.pathname.split('/').pop();

  if(pedido.method === 'GET' && accion === 'lista'){
    /* La ficha y la foto van en llaves distintas a propósito: listar trae sólo
       las fichas. Juntas, pedir la lista cargaba cada foto (hasta 600 × 450 KB). */
    const todo = await almacen.list({ prefix: 'p:' });
    const peluches = [...todo.values()];
    return json({ bien: true, peluches });
  }
  if(pedido.method === 'GET' && accion === 'foto'){
    const id = url.searchParams.get('id') || '';
    if(!RE_ID.test(id)) return json({ bien: false, error: 'Falta cuál.' }, 400);
    const foto = await almacen.get('f:' + id);
    if(!foto) return json({ bien: false, error: 'No está.' }, 404);
    const [cabeza, datos] = foto.split(',');
    const tipo = cabeza.slice(5, cabeza.indexOf(';'));
    const bytes = Uint8Array.from(atob(datos), (c) => c.charCodeAt(0));
    return new Response(bytes, { headers: { 'content-type': tipo, 'cache-control': 'private, max-age=31536000, immutable' } });
  }
  if(pedido.method !== 'POST') return json({ bien: false, error: 'No existe esa ruta.' }, 404);

  const crudo = await pedido.text();
  if(crudo.length > TOPE.cuerpo) return json({ bien: false, error: 'La foto pesa demasiado.' }, 413);
  let c; try{ c = JSON.parse(crudo); }catch(e){ return json({ bien: false, error: 'No entendí.' }, 400); }
  const id = String((c && c.id) || '');
  if(!RE_ID.test(id)) return json({ bien: false, error: 'Falta cuál.' }, 400);

  if(accion === 'quitar'){
    await almacen.delete(['p:' + id, 'f:' + id]);
    return json({ bien: true });
  }
  if(accion === 'poner'){
    const viejo = await almacen.get('p:' + id);
    if(!viejo){
      const cuantos = (await almacen.list({ prefix: 'p:', limit: TOPE.peluches + 1 })).size;
      if(cuantos >= TOPE.peluches) return json({ bien: false, error: 'La colección ya está llena (' + TOPE.peluches + ').' }, 409);
    }
    /* La foto puede no venir: al cambiar sólo el nombre no se vuelve a subir. */
    if(c.foto){
      const foto = String(c.foto);
      if(!RE_FOTO.test(foto)) return json({ bien: false, error: 'Esa foto no se entiende.' }, 400);
      if(foto.length > TOPE.foto) return json({ bien: false, error: 'La foto pesa demasiado.' }, 413);
      await almacen.put('f:' + id, foto);
    } else if(!viejo) return json({ bien: false, error: 'Falta la foto.' }, 400);
    const p = { id, nombre: texto(c.nombre, TOPE.nombre) || 'Sin nombre', nota: texto(c.nota, TOPE.nota),
      creado: Number(c.creado) || Date.now(), t: Date.now() };
    await almacen.put('p:' + id, p);
    return json({ bien: true, t: p.t });
  }
  return json({ bien: false, error: 'No existe esa ruta.' }, 404);
}

export class Coleccion {
  constructor(ctx){ this.ctx = ctx; }
  async fetch(pedido){ return manejar(this.ctx.storage, pedido); }
}
