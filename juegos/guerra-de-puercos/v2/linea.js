/* ═══════════════════════════════════════════════════════════════════════════
   GUERRA DE PUERCOS 2 · A DISTANCIA
   ───────────────────────────────────────────────────────────────────────────
   Carlos, 5 nov: «ya pon el modo para multijugador tanto en el mismo teléfono
   como online». Esto es la parte de internet: un websocket a la sala de 4
   letras del servidor de siempre (`juegos/servidor/sala.js`).

   · La partida vive en el servidor, con las mismas reglas de `motor.js`; aquí
     sólo llega TU vista (tus cartas y, del rival, cuántas trae).
   · Si se corta el internet, se vuelve a conectar solo con el «secreto» del
     asiento: salir de la app y volver no te quita el lugar.
   ═══════════════════════════════════════════════════════════════════════════ */
import { SERVIDOR } from './cuenta.js';

export async function codigoNuevo(){
  const r = await fetch(SERVIDOR + '/api/puercos/codigo');
  const j = await r.json().catch(() => ({}));
  if(!r.ok || !j.codigo) throw new Error('El servidor de salas no contesta. Prueba otra vez.');
  return j.codigo;
}
export async function comoEsta(codigo){
  const r = await fetch(SERVIDOR + '/api/puercos/sala/' + encodeURIComponent(codigo));
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(j.error || 'Ese código no existe.');
  return j;
}
export const codigoValido = (c) => /^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(c);

/* datos = { pv, nombre, avatar, mazo } — el mazo como `D20.C40.B60` */
export function conectar(codigo, datos = {}){
  const cx = { codigo, asiento: null, vista: null, abierta: false, cerrada: false, porque: '' };
  const oyentes = new Set();
  const avisar = (m) => { for(const f of [...oyentes]){ try{ f(m); }catch(e){ console.error(e); } } };
  const llave = 'puercos2_secreto_' + codigo;
  let ws = null, intentos = 0, reloj = 0, ultimo = Date.now(), sordo = false;
  function abrir(){
    if(cx.cerrada) return;
    let secreto = ''; try{ secreto = localStorage.getItem(llave) || ''; }catch(e){}
    const q = new URLSearchParams();
    if(secreto) q.set('secreto', secreto);
    if(datos.pv) q.set('pv', datos.pv);
    if(datos.nombre) q.set('nombre', datos.nombre);
    if(datos.avatar) q.set('avatar', datos.avatar);
    if(datos.mazo) q.set('mazo', datos.mazo);
    if(datos.lider) q.set('lider', datos.lider);
    ws = new WebSocket(SERVIDOR.replace(/^http/, 'ws') + '/api/puercos/sala/' + codigo + '?' + q);
    ws.onopen = () => { intentos = 0; ultimo = Date.now(); cx.abierta = true; avisar({ tipo: 'conexion', abierta: true }); };
    ws.onmessage = (ev) => {
      if(sordo) return;                                  /* pruebas: conexión muerta sin aviso */
      ultimo = Date.now();
      let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
      if(m.tipo === 'pong') return;
      if(m.tipo === 'sentado'){ cx.asiento = m.asiento; try{ localStorage.setItem(llave, m.secreto); }catch(e){} }
      if(m.tipo === 'estado') cx.vista = m.vista;
      if(m.tipo === 'lleno'){ cx.porque = m.porque; cx.cerrada = true; }
      avisar(m);
    };
    ws.onclose = (ev) => {
      cx.abierta = false;
      /* 4000: entraste a esta misma sala desde otro lado; 4001: sala llena */
      if(ev.code === 4000){ cx.cerrada = true; cx.porque = 'Entraste a esta sala desde otra pestaña o teléfono.'; }
      if(cx.cerrada){ avisar({ tipo: 'cerrada', porque: cx.porque }); return; }
      avisar({ tipo: 'conexion', abierta: false });
      clearTimeout(reloj); reloj = setTimeout(abrir, Math.min(8000, 700 * 2 ** intentos++));
    };
  }
  cx.enviar = (m) => { if(sordo) return true; if(ws && ws.readyState === 1){ ws.send(JSON.stringify(m)); return true; } return false; };
  cx.oir = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
  cx.cortar = () => { try{ ws && ws.close(); }catch(e){} };   /* para las pruebas: como si se fuera el internet */
  /* para las pruebas: la conexión se queda MUERTA sin cerrarse (lo que hace el iPhone al cambiar de red) */
  cx.ensordecer = (si = true) => { sordo = si; };
  cx.cerrar = () => { cx.cerrada = true; clearTimeout(reloj); clearInterval(latido); try{ ws && ws.close(1000); }catch(e){} };
  /* espera a que la vista cumpla algo (p. ej. «ya llegó el otro») */
  cx.esperar = (cond) => new Promise((ok, no) => {
    if(cx.vista && cond(cx.vista)) return ok(cx.vista);
    const q = cx.oir((m) => {
      if(m.tipo === 'estado' && cond(m.vista)){ q(); ok(m.vista); }
      if(m.tipo === 'cerrada' || m.tipo === 'lleno'){ q(); no(new Error(m.porque || 'Se cerró la sala.')); }
    });
  });
  /* EL LATIDO: en el iPhone, al bloquear la pantalla o cambiar de wifi a datos, la conexión se puede quedar MUERTA
     sin avisar (ni error ni cierre) y la mesa esperaría para siempre. Cada 5 s se pide la vista fresca; si en 15 s no
     llega nada, se da por muerta y se vuelve a conectar. */
  const latido = setInterval(() => {
    if(cx.cerrada){ clearInterval(latido); return; }
    if(!ws || ws.readyState !== 1) return;
    if(Date.now() - ultimo > 15000){
      /* una conexión muerta puede tardar mucho en «cerrarse»: se suelta ya y se abre otra en su lugar */
      sordo = false; const vieja = ws; vieja.onclose = vieja.onmessage = vieja.onerror = null; try{ vieja.close(); }catch(e){}
      cx.abierta = false; avisar({ tipo: 'conexion', abierta: false }); abrir(); return;
    }
    if(!sordo) try{ ws.send(JSON.stringify({ tipo: 'ping' })); }catch(e){}
  }, 5000);
  /* volvió el internet: no esperar al siguiente intento */
  addEventListener('online', () => { if(!cx.abierta && !cx.cerrada){ clearTimeout(reloj); intentos = 0; abrir(); } });
  /* al volver a la app con el teléfono dormido, se reconecta de inmediato */
  const despierta = () => { if(document.visibilityState === 'visible' && !cx.abierta && !cx.cerrada){ clearTimeout(reloj); intentos = 0; try{ ws && ws.close(); }catch(e){} abrir(); } };
  document.addEventListener('visibilitychange', despierta);
  abrir();
  globalThis.__cx = cx;
  return cx;
}
