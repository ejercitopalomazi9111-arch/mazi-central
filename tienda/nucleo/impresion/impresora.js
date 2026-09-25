/* ══════════════════════════════════════════════════════════════════════════
   IMPRESORA · lo que usan las pantallas
   ──────────────────────────────────────────────────────────────────────────
   La configuración es DE ESTE APARATO (localStorage): la tableta de la caja
   tiene su impresora USB y el teléfono del repartidor su portátil Bluetooth.
   Lo que dice el ticket (encabezado, pie, RFC, QR) es del negocio y vive en
   Ajustes.
     imprimir(venta)   el ticket, con las copias y el cajón que diga la conf
     abrirCajon()      sólo el cajón
     prueba()          acentos, regla de columnas, QR y corte
   ═════════════════════════════════════════════════════════════════════════ */
import { negocioPedido } from '../../config.js';
import { MODELOS } from './catalogo.js';
import { TRANSPORTES, ErrorImpresora } from './transportes.js';
import { Ticket, aBits } from './escpos.js';
import { piezasTicket, piezasCorte, aBytes, aRenglones } from './plantilla.js';

const LLAVE = 'tienda-impresora-' + negocioPedido();
export const CONF_INICIAL = { modelo: 'navegador', conexion: 'navegador', papel: 80, columnas: 48, dialecto: 'escpos', pagina: 'cp850', paginaNumero: null,
  corte: 'parcial', avance: 4, cajon: false, qr: true, modoImagen: false, copias: 1, automatico: false,
  ip: '', epsonId: 'local_printer', puente: 'http://127.0.0.1:9101', destino: '', baudios: 9600, paquete: 100, conectada: '' };

export function leerConf(){
  try{ return { ...CONF_INICIAL, ...JSON.parse(localStorage.getItem(LLAVE) || '{}') }; }catch(e){ return { ...CONF_INICIAL }; }
}
export function guardarConf(c){ try{ localStorage.setItem(LLAVE, JSON.stringify(c)); }catch(e){} return c; }
export function confDeModelo(id, actual = leerConf()){
  const m = MODELOS.find((x) => x.id === id); if(!m) return actual;
  const { marca, modelo, conexiones, nota, id: _, ...ajustes } = m;
  return { ...actual, ...ajustes, modoImagen: !!m.modoImagen, modelo: id, conexion: conexiones.includes(actual.conexion) ? actual.conexion : conexiones[0], paginaNumero: null };
}

/* ── Dibujar el ticket (modo imagen y ventana de imprimir) ─────────────── */
const PUNTOS = { 58: 384, 76: 400, 80: 576 };
let _qr;
const qrMod = () => _qr ??= import('../vendor/qrcode-generator-2.0.4.mjs').then((m) => m.default);

export async function dibujar(renglones, conf){
  const ancho = PUNTOS[conf.papel] || 576;
  const fuente = Math.floor(ancho / conf.columnas / 0.6);
  const alto = renglones.reduce((t, r) => t + (r.qr ? ancho * 0.5 : (r.grande ? 2 : 1) * fuente * 1.2), 0) + fuente;
  const cv = document.createElement('canvas'); cv.width = ancho; cv.height = Math.ceil(alto);
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000'; g.textBaseline = 'top';
  let y = fuente * 0.5;
  for(const r of renglones){
    if(r.qr){
      const qrcode = await qrMod(); const q = qrcode(0, 'M'); q.addData(r.qr); q.make();
      const n = q.getModuleCount(), lado = Math.floor(ancho * 0.45 / n), x0 = Math.floor((ancho - n * lado) / 2);
      for(let i = 0; i < n; i++) for(let j = 0; j < n; j++) if(q.isDark(i, j)) g.fillRect(x0 + j * lado, y + i * lado, lado, lado);
      y += ancho * 0.5; continue;
    }
    const f = r.grande ? fuente * 2 : fuente;
    g.font = `${r.negritas || r.grande ? 'bold ' : ''}${f}px ui-monospace, "DejaVu Sans Mono", Menlo, Consolas, monospace`;
    g.fillText(r.v, 0, y, ancho);
    y += f * 1.2;
  }
  return cv;
}

/* La ventana de imprimir: una página del ancho del papel, en letra fija. */
async function porNavegador(renglones, conf){
  const cv = await dibujar(renglones, conf);
  const hoja = document.createElement('div'); hoja.className = 'ticket-papel';
  hoja.innerHTML = `<img src="${cv.toDataURL('image/png')}" alt="Ticket" style="width:${conf.papel - 6}mm">`;
  const css = document.createElement('style');
  css.textContent = `@page{ size: ${conf.papel}mm auto; margin: 2mm; } @media print{ body.imprimiendo-ticket .ticket-papel img{ display:block; } }`;
  document.body.append(hoja, css);
  document.body.classList.add('imprimiendo-ticket');
  await new Promise((ok) => {
    const fin = () => { document.body.classList.remove('imprimiendo-ticket'); hoja.remove(); css.remove(); ok(); };
    window.addEventListener('afterprint', fin, { once: true });
    setTimeout(() => window.print(), 50);
    setTimeout(() => { if(hoja.isConnected) fin(); }, 60000);
  });
}

async function mandar(bytes, conf){
  const t = TRANSPORTES[conf.conexion];
  if(!t) throw new ErrorImpresora('Esa conexión no existe: ' + conf.conexion);
  if(!t.disponible()) throw new ErrorImpresora('Este navegador no puede usar esa conexión. Usa Chrome o la ventana de imprimir.');
  await t.enviar(bytes, conf);
}

async function bytesDe(piezas, conf, extra){
  if(!conf.modoImagen) return aBytes(piezas, conf, extra);
  const cv = await dibujar(aRenglones(piezas, conf.columnas), conf);
  const g = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  return aBytes(piezas, conf, { ...extra, imagen: aBits(g.data, cv.width, cv.height, { tramado: false }) });
}

export async function imprimir(venta, negocio, { cajon = false, conf = leerConf() } = {}){
  const copias = Math.max(1, Math.min(5, Number(conf.copias) || 1));
  for(let i = 0; i < copias; i++){
    const piezas = piezasTicket(venta, negocio, { copia: i ? 'COPIA' : '' });
    if(conf.conexion === 'navegador') await porNavegador(aRenglones(piezas, conf.columnas), conf);
    else await mandar(await bytesDe(piezas, conf, { cajon: cajon && conf.cajon && i === 0 }), conf);
  }
}

/* Cualquier papel que no es un ticket de venta (el corte de caja). */
export async function imprimirPiezas(piezas, { conf = leerConf() } = {}){
  if(conf.conexion === 'navegador') return porNavegador(aRenglones(piezas, conf.columnas), conf);
  return mandar(await bytesDe(piezas, conf, { cajon: false }), conf);
}
export const imprimirCorte = (corte, negocio, o) => imprimirPiezas(piezasCorte(corte, negocio), o);

export async function abrirCajon(conf = leerConf()){
  if(conf.conexion === 'navegador') throw new ErrorImpresora('Con la ventana de imprimir el cajón no se puede abrir desde la app: configura la impresora por USB, red o puente.');
  await mandar(new Ticket(conf).cajon().bytes(), conf);
}

export function piezasPrueba(conf, negocio){
  const regla = '1234567890'.repeat(Math.ceil(conf.columnas / 10)).slice(0, conf.columnas);
  return [
    { t: 'texto', v: 'PRUEBA DE IMPRESORA', alinear: 'centro', negritas: true, grande: true },
    { t: 'texto', v: negocio?.marca?.nombre_corto || negocio?.nombre || 'Tienda', alinear: 'centro' },
    { t: 'raya' },
    { t: 'texto', v: `Papel ${conf.papel} mm · ${conf.columnas} letras` },
    { t: 'texto', v: regla },
    { t: 'texto', v: 'Si la regla de arriba salió en UN renglón, las letras están bien.' },
    { t: 'raya' },
    { t: 'texto', v: 'Acentos: á é í ó ú ü ñ Ñ ¿? ¡! Á É Í Ó Ú' },
    { t: 'texto', v: 'Si salen letras raras, cambia la «tabla de caracteres» o activa «Imprimir como imagen».' },
    { t: 'par', izq: 'Precio', der: '$1,250.00', negritas: true },
    { t: 'saltar' },
    { t: 'qr', v: location.origin + location.pathname },
    { t: 'texto', v: 'Si se ve el cuadro de arriba, el QR funciona.', alinear: 'centro' },
  ];
}
export async function prueba(negocio, conf = leerConf()){
  const ps = piezasPrueba(conf, negocio);
  if(conf.conexion === 'navegador') return porNavegador(aRenglones(ps, conf.columnas), conf);
  return mandar(await bytesDe(ps, conf, { cajon: false }), conf);
}

export { TRANSPORTES, ErrorImpresora };
