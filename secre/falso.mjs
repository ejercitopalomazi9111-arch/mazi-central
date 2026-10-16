/* ══════════════════════════════════════════════════════════════════════════
   SECRE · WhatsApp y la IA de mentiras, para probar el panel sin teléfono
   ──────────────────────────────────────────────────────────────────────────
   SECRE_FALSO=1 node secre/correr.mjs
   Cada cuenta se «conecta» sola, apunta lo que se mandaría en vez de mandarlo
   y la IA contesta con frases fijas. Nada sale de la máquina.
   ═════════════════════════════════════════════════════════════════════════ */
export const enviados = [];

export async function conectar({ telefono, alMensaje, alEstado, alContactos = () => {} }){
  const tel = String((typeof telefono === 'function' ? telefono() : telefono) || '5210000000000');
  const yo = [`${tel}@s.whatsapp.net`];
  /* SECRE_FALSO_SIN_VINCULAR=1: se queda esperando a que pongas el código, para probar esa pantalla */
  if(process.env.SECRE_FALSO_SIN_VINCULAR) setTimeout(() => alEstado({ conectado: false, codigo: 'ABCD-' + tel.slice(-4), para: tel, desde: Date.now() }), 50);
  else setTimeout(() => alEstado({ conectado: true, yo: yo[0] }), 50);
  return {
    yo: () => yo,
    async enviar(jid, texto){ enviados.push({ jid, texto, t: Date.now() }); return 'falso-' + enviados.length; },
    async enviarSticker(jid){ enviados.push({ jid, texto: '[sticker]', t: Date.now() }); return 'falso-' + enviados.length; },
    async escribiendo(){}, async leido(){}, async cerrar(){},
    /* una agenda de mentiras: tres contactos y dos grupos */
    async cargarContactos(){
      alContactos([{ id: '5214423330001@s.whatsapp.net', nombre: 'Mamá' }, { id: '5214423330002@s.whatsapp.net', nombre: 'Profe Omar' }, { id: '5214423330003@s.whatsapp.net', nombre: 'Rosa clienta', lid: '98765@lid' },
        { id: '120363000000000002@g.us', nombre: 'Taberna', grupo: true }, { id: '120363000000000009@g.us', nombre: 'Equipo de fut', grupo: true }]);
      return { grupos: 2, personas: 3 };
    },
    /* una comunidad de rol de mentiras con tres grupos, para probar el panel */
    async comunidades(){
      return [{ id: '120363000000000001@g.us', nombre: 'Reino de Valdor', grupos: [
        { id: '120363000000000002@g.us', nombre: 'Taberna' }, { id: '120363000000000003@g.us', nombre: 'Bosque' }, { id: '120363000000000004@g.us', nombre: 'Castillo' }] }];
    },
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
