/* ══════════════════════════════════════════════════════════════════════════
   SORTEO DEL MES · Bloque 11, el lado del cliente
   ──────────────────────────────────────────────────────────────────────────
   «Cuánto te falta este mes para entrar.» La barra sale de SUS compras
   reales del mes (nucleo/sorteo.js). Sólo se enseña un sorteo activo, y uno
   activo ya trae permiso de Gobernación: la base no deja activarlo sin él.
   ═════════════════════════════════════════════════════════════════════════ */
import { enlace } from '../nucleo/rutas.js';
import { icono } from '../nucleo/iconos.js';
import { esc, pesos, estado } from '../nucleo/piezas.js';
import { sorteos, misPedidos } from '../nucleo/datos.js';
import { avance } from '../nucleo/sorteo.js';

const esteMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const quedanDias = () => { const d = new Date(), fin = new Date(d.getFullYear(), d.getMonth() + 1, 1); return Math.ceil((fin - d) / 86400000); };

/* El sorteo activo de este mes, o null. */
export async function sorteoDelMes(){
  const lista = await sorteos().catch(() => []);
  return lista.find((s) => s.activo && String(s.mes).slice(0, 7) === esteMes()) || null;
}

export function tarjetaSorteo(s, a, { enlazar = true } = {}){
  const d = quedanDias();
  return `<div class="tarjeta sorteo-cliente">
    <div class="sorteo-cabeza">${icono('sorteo')}<div><p class="etq">Sorteo del mes</p><h3>${esc(s.premio)}</h3></div></div>
    <p>Compra <b>${pesos(s.minimo_mensual)}</b> o más este mes y entras.</p>
    <div class="barra-avance" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${a.porcentaje}" aria-label="Cuánto llevas para entrar"><span style="width:${a.porcentaje}%"></span></div>
    <p class="avance-texto">${a.dentro ? `${icono('listo')}<b>¡Ya estás dentro!</b> Llevas ${pesos(a.gasto)} este mes.`
      : `Llevas <b>${pesos(a.gasto)}</b>. Te faltan <b>${pesos(a.falta)}</b> — quedan ${d === 1 ? '1 día' : `${d} días`}.`}</p>
    ${enlazar ? `<a class="ver-todo" href="${enlace('/sorteo')}">Ver las bases</a>` : ''}
  </div>`;
}

async function sorteoPantalla(){
  const [s, mios] = await Promise.all([sorteoDelMes(), misPedidos().catch(() => [])]);
  if(!s) return { html: estado({ icono: 'sorteo', titulo: 'Este mes no hay sorteo', texto: 'Cuando haya uno, aquí vas a ver el premio y cuánto te falta para entrar.',
    botones: `<a class="boton principal" href="${enlace('/')}">Ir a la tienda</a>` }) };
  const a = avance(mios, s);
  return { html: `${tarjetaSorteo(s, a, { enlazar: false })}
    <section class="seccion"><header><h2>Las bases</h2></header>
      <ul class="bases">
        <li>Entra quien compre ${pesos(s.minimo_mensual)} o más entre el primer y el último día del mes, con lo que compre a su nombre: en línea o en el mostrador (ahí, pide que la cuenta vaya a tu nombre).</li>
        <li>Lo cancelado o no entregado no cuenta.</li>
        <li>El ganador sale al azar entre todos los que llegaron al mínimo, y se le avisa por WhatsApp.</li>
        <li>Permiso de la Secretaría de Gobernación: <b>${esc(s.permiso_segob)}</b>. Aviso a PROFECO del ${esc(s.aviso_profeco)}.</li>
      </ul>
      ${a.dentro ? '' : `<a class="boton principal ancho" href="${enlace('/')}">${icono('carrito')}Seguir comprando</a>`}
    </section>` };
}

export const PANTALLAS = { sorteo: sorteoPantalla };
