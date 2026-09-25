/* El WhatsApp del negocio (Ajustes → contacto) con el mensaje ya escrito.
   Sin número configurado no hay botón: un enlace que abre WhatsApp sin
   destinatario deja al cliente sin saber a quién escribirle. */
export function waNegocio(n, texto){
  const d = String(n?.ajustes?.contacto?.whatsapp || '').replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
  return d.length === 10 ? `https://wa.me/52${d}?text=${encodeURIComponent(texto)}` : '';
}
/* La dirección pública de un producto (la que se comparte). */
export function ligaProducto(id){
  const u = new URL(location.href); u.hash = '#/p/' + encodeURIComponent(id); return u.href;
}
