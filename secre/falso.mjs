/* ══════════════════════════════════════════════════════════════════════════
   SECRE · WhatsApp y la IA de mentiras, para probar el panel sin teléfono
   ──────────────────────────────────────────────────────────────────────────
   SECRE_FALSO=1 node secre/correr.mjs
   Cada cuenta se «conecta» sola, apunta lo que se mandaría en vez de mandarlo
   y la IA contesta con frases fijas. Nada sale de la máquina.
   ═════════════════════════════════════════════════════════════════════════ */
export const enviados = [];

export async function conectar({ telefono, alMensaje, alEstado }){
  const yo = [`${telefono || '5210000000000'}@s.whatsapp.net`];
  setTimeout(() => alEstado({ conectado: true, yo: yo[0] }), 50);
  return {
    yo: () => yo,
    async enviar(jid, texto){ enviados.push({ jid, texto, t: Date.now() }); return 'falso-' + enviados.length; },
    async escribiendo(){}, async leido(){}, async cerrar(){},
    /* para las pruebas: hacer como que llegó un mensaje */
    llega: (m) => alMensaje({ id: 'm' + Math.random().toString(36).slice(2), mio: false, grupo: false, t: Date.now(), ...m }),
  };
}

export const ia = {
  async leer({ nuevos }){
    const t = nuevos.map(x => x.texto).join(' ');
    return { pendientes: /mañana|entrega|traes/i.test(t) ? ['Llevar lo que pidieron mañana'] : [], respuesta: 'Va, ahorita te confirmo 👍', motivo: '', urgente: false };
  },
  async saludo({ cual }){ return cual === 'manana' ? 'Buenos días ☀️' : 'Buenas noches, descansa 🌙'; },
  async orden({ texto }){
    if(/silencio|callad/i.test(texto)) return { respuesta: 'Listo, a ese chat ya no le propongo nada.', acciones: [] };
    return { respuesta: 'Entendido (IA de prueba).', acciones: [] };
  },
};
