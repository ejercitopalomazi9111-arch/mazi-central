/* ══════════════════════════════════════════════════════════════════════════
   LO QUE LA TIENDA RECUERDA DEL CLIENTE · en su propio teléfono
   ──────────────────────────────────────────────────────────────────────────
   Lo que Amazon y Mercado Libre tienen y aquí faltaba: favoritos (con aviso
   cuando baja el precio), vistos recientemente, las últimas búsquedas y lo
   «guardado para después» del carrito. Vive en el teléfono y no pide cuenta:
   se puede ver y guardar sin registrarse, que es la regla de la tienda.
   Módulo puro con el almacén inyectado (pruebas-memoria.mjs).
   ═════════════════════════════════════════════════════════════════════════ */

export const TOPE_VISTOS = 20, TOPE_BUSQUEDAS = 8, TOPE_FAVORITOS = 200;
const cent = (p) => Math.round(Number(p || 0) * 100);

export function crearMemoria(almacen, slug, ahora = () => Date.now()){
  const llave = (k) => `tienda-${k}-${slug}`;
  const leer = (k, def) => { try{ const v = JSON.parse(almacen.getItem(llave(k)) || 'null'); return v ?? def; }catch(e){ return def; } };
  const escribir = (k, v) => { try{ almacen.setItem(llave(k), JSON.stringify(v)); }catch(e){} oyentes.forEach((f) => f(k)); };
  const oyentes = new Set();

  const favoritos = {
    /* [{ id, precio (pesos, al guardarlo), cuando }] — lo más nuevo primero */
    todos: () => leer('favoritos', []),
    tiene: (id) => leer('favoritos', []).some((f) => f.id === id),
    poner(p){
      const l = leer('favoritos', []).filter((f) => f.id !== p.id);
      l.unshift({ id: p.id, precio: p.p, cuando: ahora() });
      escribir('favoritos', l.slice(0, TOPE_FAVORITOS));
      return true;
    },
    quitar(id){ escribir('favoritos', leer('favoritos', []).filter((f) => f.id !== id)); return false; },
    alternar(p){ return this.tiene(p.id) ? this.quitar(p.id) : this.poner(p); },
  };

  const vistos = {
    todos: () => leer('vistos', []),
    ver(id){ escribir('vistos', [id, ...leer('vistos', []).filter((x) => x !== id)].slice(0, TOPE_VISTOS)); },
    borrar(){ escribir('vistos', []); },
  };

  const busquedas = {
    todas: () => leer('busquedas', []),
    /* Se guarda lo que se buscó y SÍ encontró algo: una búsqueda vacía no se repite. */
    guardar(t){
      const q = String(t || '').trim().replace(/\s+/g, ' ');
      if(q.length < 2) return;
      const k = q.toLowerCase();
      escribir('busquedas', [q, ...leer('busquedas', []).filter((x) => x.toLowerCase() !== k)].slice(0, TOPE_BUSQUEDAS));
    },
    quitar(t){ escribir('busquedas', leer('busquedas', []).filter((x) => x !== t)); },
    borrar(){ escribir('busquedas', []); },
  };

  const despues = {
    /* [[id, cantidad]] — lo que salió del carrito sin perderse */
    todos: () => leer('despues', []),
    guardar(id, n){ escribir('despues', [[id, n], ...leer('despues', []).filter(([x]) => x !== id)]); },
    quitar(id){ escribir('despues', leer('despues', []).filter(([x]) => x !== id)); },
  };

  return { favoritos, vistos, busquedas, despues, alCambiar(f){ oyentes.add(f); return () => oyentes.delete(f); } };
}

/* Cuánto bajó (o subió) desde que lo guardó, en centavos. + = bajó. */
export function bajoDesde(fav, p){ return p ? cent(fav.precio) - cent(p.p) : 0; }

/* La barra de «te faltan $X para envío gratis». Centavos.
   → null si no hay envío gratis configurado. */
export function envioGratis(subtotal, { gratis_desde, costo } = {}){
  if(gratis_desde == null || !(Number(costo) > 0)) return null;
  const meta = cent(gratis_desde);
  const falta = Math.max(0, meta - subtotal);
  return { meta, falta, listo: falta === 0, avance: meta ? Math.min(100, Math.round(subtotal / meta * 100)) : 100 };
}

/* Lo que ya compró, sin repetir, lo más reciente primero: el «Comprar de nuevo».
   pedidos: los de misPedidos() (con renglones y creado); lo cancelado no cuenta. */
export function comprados(pedidos, NO = new Set(['cancelado', 'no_entregado'])){
  const m = new Map();
  for(const p of [...(pedidos || [])].sort((a, b) => new Date(b.creado) - new Date(a.creado))){
    if(NO.has(p.estado)) continue;
    for(const r of p.renglones || []){
      if(!r.producto_id) continue;
      const e = m.get(r.producto_id);
      if(e){ e.veces++; e.piezas += r.cantidad; }
      else m.set(r.producto_id, { id: r.producto_id, nombre: r.nombre, ultima: p.creado, veces: 1, piezas: r.cantidad });
    }
  }
  return [...m.values()];
}
