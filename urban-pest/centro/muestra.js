/* DATOS DE MUESTRA del centro (se abre con ?muestra).
   Sirven para probarlo de pie, como lo usaría el fumigador, sin servidor y sin tocar nada real.
   NADA de esto es del cliente: los nombres dicen «de muestra» a propósito y lo que sólo él sabe
   (registros de producto, placas) va como FALTA. Las fechas se calculan desde hoy para que el
   tablero siempre tenga algo «de hoy», algo atrasado y un seguimiento que ya toca. */
const mas = (hoy, d) => new Date(Date.parse(hoy + 'T12:00:00Z') + d * 864e5).toISOString().slice(0, 10);

export function muestra(hoy) {
  const citas = [
    { id: 'm1', estado: 'pendiente', cliente: 'Cliente de muestra A', fecha: hoy, hora: '10:00', zona: 'Juriquilla', plaga: 'Cucarachas', tecnico: 'Técnico de muestra', precio: 500, telefono: '' },
    { id: 'm2', estado: 'pendiente', cliente: 'Planta de muestra B (industria)', fecha: hoy, hora: '16:30', zona: 'Parque industrial', plaga: 'Roedores', precio: 4200 },
    { id: 'm3', estado: 'pendiente', cliente: 'Cliente de muestra C', fecha: mas(hoy, -1), zona: 'El Campanario', plaga: 'Hormigas', precio: 650 },
    { id: 'm4', estado: 'hecho', cliente: 'Cliente de muestra D', fecha: mas(hoy, -16), zona: 'Centro', plaga: 'Cucarachas', precio: 500, seguimiento: { fecha: mas(hoy, -1), hecho: false } },
    { id: 'm5', estado: 'cerrado', cliente: 'Cliente de muestra E', fecha: mas(hoy, -3), plaga: 'Alacranes', precio: 800, seguimiento: { fecha: mas(hoy, 12), hecho: false } },
    { id: 'm6', estado: 'pendiente', cliente: 'Cliente de muestra F', fecha: mas(hoy, 2), hora: '09:00', zona: 'Milenio', plaga: 'Chinches', precio: 900 },
  ];
  const mov = (delta, motivo) => ({ delta, motivo, quien: 'muestra', cuando: Date.parse(hoy + 'T15:00:00Z') });
  const insumos = [
    { id: 'i1', nombre: 'Insecticida líquido (muestra)', registro: 'FALTA', unidad: 'L', cantidad: 1.5, minimo: 2, movimientos: [mov(5, 'Compra'), mov(-3.5, 'Servicios de la semana')] },
    { id: 'i2', nombre: 'Gel para cucaracha (muestra)', registro: 'FALTA', unidad: 'jeringas', cantidad: 9, minimo: 4, movimientos: [mov(12, 'Compra'), mov(-3, 'Servicios')] },
    { id: 'i3', nombre: 'Cebo para roedor (muestra)', registro: 'FALTA', unidad: 'kg', cantidad: 6, minimo: 3, movimientos: [mov(6, 'Compra')] },
    { id: 'i4', nombre: 'Guantes de nitrilo', unidad: 'pares', cantidad: 3, minimo: 10, movimientos: [mov(20, 'Compra'), mov(-17, 'Uso')] },
  ];
  const vehiculos = [
    { id: 'v1', nombre: 'Camioneta (muestra)', placas: 'FALTA', km: 84200, revisiones: [
      { id: 'r1', tipo: 'aceite', fecha: mas(hoy, -150), km: 79500, costo: 1200, nota: '', proxima_fecha: null, proxima_km: 84500, quien: 'muestra' },
      { id: 'r2', tipo: 'verificación', fecha: mas(hoy, -170), km: null, costo: null, nota: '', proxima_fecha: mas(hoy, 5), proxima_km: null, quien: 'muestra' },
      { id: 'r3', tipo: 'llantas', fecha: mas(hoy, -60), km: 82000, costo: 6800, nota: '', proxima_fecha: mas(hoy, 300), proxima_km: 122000, quien: 'muestra' } ] },
  ];
  const datos = {};
  for (const c of citas) datos['cita:' + c.id] = c;
  for (const i of insumos) datos['insumo:' + i.id] = i;
  for (const v of vehiculos) datos['vehiculo:' + v.id] = v;
  return { datos, extra: { bot: { chats: 7, reflejo: 11, ia: 3, tu: 2, cotizaciones: 2 }, avisos: 1 } };
}
