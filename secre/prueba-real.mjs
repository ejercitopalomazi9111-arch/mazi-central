#!/usr/bin/env node
/* SECRE · pláticas de prueba contra la IA DE VERDAD (Gemini y Groq por La Sala), con WhatsApp de mentiras.
   No es una prueba que pase o truene: imprime cada plática para leerla, y marca lo que rompe una regla.
     SECRE_SALA_LLAVE=… node secre/prueba-real.mjs */
import { Secre } from './nucleo.mjs';
import { ia } from './ia.mjs';
const YO = '5214420000000@s.whatsapp.net', J = (n) => `52144200000${String(n).padStart(2, '0')}@s.whatsapp.net`, ALLS = '120363222222@g.us';
let ahora = Date.UTC(2026, 10, 4, 23, 30); const reloj = () => ahora;
const env = []; let sig = 1;
const transporte = { yo: () => [YO], async enviar(jid, texto){ env.push({ jid, texto }); return 'S' + sig++; }, async enviarImagen(jid){ env.push({ jid, texto: '[foto]' }); return 'I' + sig++; }, async enviarAudio(jid){ env.push({ jid, texto: '[audio]' }); return 'A' + sig++; }, async escribiendo(){}, async leido(){} };
const datos = {}; const almacen = { leer: (k, d) => datos[k] ? JSON.parse(datos[k]) : d, guardar: (k, v) => { datos[k] = JSON.stringify(v); } };
const s = new Secre({ cuenta: 'real', transporte, ia, almacen, reloj, banco: null });
s.telefono = { listas: () => false };
s.cargarContactos([[1, 'Tía Rosa'], [2, 'Beto Taller'], [3, 'Sofi Clienta'], [4, 'Don Ramiro Barbería'], [5, 'Lupe Bodas']].map(([n, x]) => ({ id: J(n), nombre: x, guardado: true })));
s.cargarContactos([{ id: ALLS, nombre: "All's fashion clientas", grupo: true }]);
s.config.chats[ALLS].tienda = true; s.config.chats[ALLS].modo = 'auto';
s.config.productos = [{ id: 'p1', desc: 'Conjunto deportivo dama', costo: 350, precio: 600, tallas: ['S', 'M', 'L'], huella: '' }];
s.estado.fotoProducto = { FOTO1: 'p1' };
const mira = async (jid, nombre, texto, extra = {}) => {
  const antes = env.length;
  await s.alMensaje({ id: 'm' + sig++, chat: jid, de: jid, nombre, texto, mio: false, t: ahora, ...extra }); ahora += 30_000; await s.tic();
  console.log(`\n── ${s.nombreDe(jid)}: «${texto}»`);
  for(const e of env.slice(antes)) console.log(`   ${e.jid === YO ? '→ a Carlos' : '→ a ' + s.nombreDe(e.jid)}: ${e.texto.replace(/\n/g, ' / ').slice(0, 400)}`);
};
const dice = async (texto) => { const antes = env.length; await s.alMensaje({ id: 'o' + sig++, chat: YO, de: YO, texto, mio: true, t: ahora }); ahora += 5000;
  console.log(`\n── CARLOS: «${texto}»`); for(const e of env.slice(antes)) console.log(`   ${e.jid === YO ? '→ a Carlos' : '→ a ' + s.nombreDe(e.jid)}: ${e.texto.replace(/\n/g, ' / ').slice(0, 400)}`); };
const solo = process.argv[2] ? Number(process.argv[2]) : 0;
const casos = [
  () => mira(J(1), 'Rosa', '¿Quién dejó la leche afuera? Ya se echó a perder'),
  () => mira(J(4), 'Ramiro', 'Buenas, ¿ustedes hacen páginas? ¿tienen la suya para verla?'),
  () => mira(J(4), 'Ramiro', '¿Cuánto me sale una página para mi barbería con publicidad para que me lleguen clientes?'),
  () => mira(J(5), 'Lupe', 'Oye Carlos, voy a hacer la boda de mi hija en diciembre, como 200 personas, ¿conoces a alguien de paramédicos?'),
  () => mira(ALLS, 'Sofi', '¿precio? ¿hay en M?', { grupo: true, nombreChat: "All's fashion clientas", citado: 'FOTO1' }),
  () => mira(J(2), 'Beto', 'Oye carnal, ¿mañana me ayudas a mover unas cajas al taller como a las 10?'),
  () => mira(J(2), 'Beto', 'dile a Carlos que me marque urgente porfa, es lo del coche'),
  () => dice('pregúntale a Beto Taller si siempre sí va el sábado al partido'),
  async () => { s.config.chats[J(1)].modo = 'borrador'; await mira(J(1), 'Rosa', '¿Vas a venir a comer el domingo o no?'); await dice('sí dile que sí voy pero más cariñosa'); },
  () => dice('qué nos ha dicho la tía rosa hoy?'),
];
for(const [i, c] of casos.entries()) if(!solo || solo === i + 1) await c().catch(e => console.log('   ✗ falló:', e.message));
console.log('\n── pendientes:', s.estado.pendientes.filter(p => !p.hecho).map(p => p.texto).join(' | ') || '(ninguno)');
