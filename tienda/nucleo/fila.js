/* ══════════════════════════════════════════════════════════════════════════
   LA FILA DE VENTAS SIN RED · (pruebas-fila.mjs)
   ──────────────────────────────────────────────────────────────────────────
   Si se cae el internet a media venta, el mostrador NO se detiene: la venta se
   guarda en el teléfono con un folio provisional («L3») y se sube sola cuando
   vuelve la red, en el mismo orden en que se hizo.
   Lo que tiene que ser cierto:
     · sólo se encola por FALTA DE RED; un «ya no alcanzan» es un no de verdad
       y se le dice al cajero en ese momento;
     · subir es de una en una y en orden; si la red se vuelve a caer a la
       mitad, se detiene y lo que falta se queda;
     · la que el servidor rechaza al subir (se vendió la última pieza en línea
       mientras tanto) NO se pierde: se queda marcada para que alguien la vea.
   El almacén se inyecta (localStorage en la app, un objeto en las pruebas).
   ═════════════════════════════════════════════════════════════════════════ */

/* ¿El error es porque no hay red? (y no porque el servidor dijo que no). */
export function sinRed(err, enLinea = globalThis.navigator?.onLine ?? true){   // «undefined» (Node, navegadores raros) no es «sin red»
  if(!enLinea) return true;
  const m = String(err?.causa?.message || err?.message || '') + ' ' + String(err?.causa?.details || '');
  return /Failed to fetch|NetworkError|Load failed|fetch failed|network|ERR_INTERNET|ERR_NETWORK/i.test(m);
}

export function crearFila(almacen, llave){
  const leer = () => { try{ return JSON.parse(almacen.getItem(llave) || '{"n":0,"ventas":[]}'); }catch(e){ return { n: 0, ventas: [] }; } };
  const guardar = (f) => { try{ almacen.setItem(llave, JSON.stringify(f)); }catch(e){} };
  return {
    agregar(venta){
      const f = leer(); f.n += 1;
      const item = { ...venta, id: `${Date.now().toString(36)}-${f.n}`, folio: `L${f.n}`, cuando: venta.cuando || Date.now(), error: null };
      f.ventas.push(item); guardar(f); return item;
    },
    todas: () => leer().ventas,
    pendientes: () => leer().ventas.filter((v) => !v.error),
    rechazadas: () => leer().ventas.filter((v) => v.error),
    quitar(id){ const f = leer(); f.ventas = f.ventas.filter((v) => v.id !== id); guardar(f); },
    marcar(id, error){ const f = leer(); const v = f.ventas.find((x) => x.id === id); if(v){ v.error = error; guardar(f); } },
  };
}

/* Sube lo pendiente con `vender(item)`. → { subidas: [{item, resultado}], rechazadas: [item], cortada } */
let _subiendo = null;
export function subir(fila, vender){
  // Dos avisos de «volvió la red» seguidos no suben dos veces la misma venta.
  return _subiendo ??= (async () => {
    const salida = { subidas: [], rechazadas: [], cortada: false };
    for(const item of fila.pendientes()){
      try{ const resultado = await vender(item); fila.quitar(item.id); salida.subidas.push({ item, resultado }); }
      catch(err){
        if(sinRed(err)){ salida.cortada = true; break; }
        fila.marcar(item.id, err.message || 'El servidor no la aceptó');
        salida.rechazadas.push({ ...item, error: err.message });
      }
    }
    return salida;
  })().finally(() => { _subiendo = null; });
}
