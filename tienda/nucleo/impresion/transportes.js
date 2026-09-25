/* ══════════════════════════════════════════════════════════════════════════
   TRANSPORTES · cómo llegan los bytes a la impresora
   ──────────────────────────────────────────────────────────────────────────
   Uno por tipo de conexión, todos con la misma forma:
     disponible()   ¿este navegador puede? (Safari no trae USB ni Bluetooth)
     conectar()     pide permiso — SÓLO desde un toque de la persona
     reconectar()   sin preguntar, con el permiso que ya se dio (al abrir la app)
     enviar(bytes)  manda y espera a que salga
   La ventana de imprimir no está aquí: no manda bytes, manda una página
   (ver impresora.js).
   ═════════════════════════════════════════════════════════════════════════ */
import { USB_FABRICANTES, BLE_SERVICIOS } from './catalogo.js';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const hexa = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
export class ErrorImpresora extends Error{}

/* ── USB (WebUSB) ──────────────────────────────────────────────────────── */
let usb = null;   // { dispositivo, interfaz, salida }
async function abrirUsb(d){
  await d.open();
  if(d.configuration === null) await d.selectConfiguration(1);
  for(const i of d.configuration.interfaces){
    for(const alt of i.alternates){
      const e = alt.endpoints.find((x) => x.direction === 'out' && x.type === 'bulk');
      // La primera interfaz con salida de datos: clase 7 (impresora), 255
      // (propia del fabricante) o 10 (USB-serial) según la marca.
      if(e){
        try{ await d.claimInterface(i.interfaceNumber); }
        catch(err){
          throw new ErrorImpresora('La computadora tiene tomada la impresora con su controlador. En Windows: instala el controlador WinUSB con Zadig, o usa el puente local o la ventana de imprimir.');
        }
        if(alt.alternateSetting) await d.selectAlternateInterface(i.interfaceNumber, alt.alternateSetting);
        return { dispositivo: d, interfaz: i.interfaceNumber, salida: e.endpointNumber };
      }
    }
  }
  throw new ErrorImpresora('Ese aparato USB no tiene por dónde recibir datos. ¿Es la impresora?');
}
const USB = {
  disponible: () => !!navigator.usb,
  async conectar(){
    const d = await navigator.usb.requestDevice({ filters: [{ classCode: 7 }, ...USB_FABRICANTES.map((vendorId) => ({ vendorId }))] });
    usb = await abrirUsb(d);
    return d.productName || d.manufacturerName || 'Impresora USB';
  },
  async reconectar(){
    if(usb?.dispositivo.opened) return usb.dispositivo.productName;
    const [d] = await navigator.usb.getDevices();
    if(!d) return null;
    usb = await abrirUsb(d);
    return d.productName || 'Impresora USB';
  },
  async enviar(b){
    if(!usb?.dispositivo.opened && !(await USB.reconectar())) throw new ErrorImpresora('Conecta la impresora USB primero.');
    for(let i = 0; i < b.length; i += 4096){
      const r = await usb.dispositivo.transferOut(usb.salida, b.subarray(i, i + 4096));
      if(r.status !== 'ok') throw new ErrorImpresora('La impresora no recibió los datos (' + r.status + ').');
    }
  },
};

/* ── Bluetooth (Web Bluetooth, BLE) ────────────────────────────────────── */
let ble = null;   // { dispositivo, caracteristica }
async function abrirBle(d){
  const gatt = await d.gatt.connect();
  for(const uuid of BLE_SERVICIOS){
    let s; try{ s = await gatt.getPrimaryService(uuid); }catch(e){ continue; }
    for(const c of await s.getCharacteristics()){
      if(c.properties.writeWithoutResponse || c.properties.write) return { dispositivo: d, caracteristica: c };
    }
  }
  throw new ErrorImpresora('Esa impresora Bluetooth no aceptó datos. Si es de Bluetooth «clásico», usa la ventana de imprimir.');
}
const BLUETOOTH = {
  disponible: () => !!navigator.bluetooth,
  async conectar(){
    const d = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICIOS });
    ble = await abrirBle(d);
    d.addEventListener('gattserverdisconnected', () => { if(ble?.dispositivo === d) ble.desconectada = true; });
    return d.name || 'Impresora Bluetooth';
  },
  async reconectar(){
    if(ble && !ble.desconectada) return ble.dispositivo.name;
    if(ble?.dispositivo){ ble = await abrirBle(ble.dispositivo); return ble.dispositivo.name; }
    const ds = navigator.bluetooth.getDevices ? await navigator.bluetooth.getDevices() : [];
    if(!ds[0]) return null;
    ble = await abrirBle(ds[0]); return ds[0].name;
  },
  /* paquete: muchas portátiles se ahogan con más de 100 bytes; algunas con 20. */
  async enviar(b, { paquete = 100 } = {}){
    if(!(await BLUETOOTH.reconectar().catch(() => null))) throw new ErrorImpresora('Conecta la impresora Bluetooth primero.');
    const c = ble.caracteristica, sinRespuesta = c.properties.writeWithoutResponse;
    for(let i = 0; i < b.length; i += paquete){
      const trozo = b.slice(i, i + paquete);
      if(sinRespuesta && c.writeValueWithoutResponse){ await c.writeValueWithoutResponse(trozo); await espera(8); }
      else await c.writeValue(trozo);
    }
  },
};

/* ── Puerto serie (Web Serial) ─────────────────────────────────────────── */
let serie = null;
const SERIAL = {
  disponible: () => !!navigator.serial,
  async conectar({ baudios = 9600 } = {}){
    const p = await navigator.serial.requestPort();
    await p.open({ baudRate: baudios, flowControl: 'hardware' }).catch(() => p.open({ baudRate: baudios }));
    serie = p; return 'Puerto serie';
  },
  async reconectar({ baudios = 9600 } = {}){
    if(serie?.writable) return 'Puerto serie';
    const [p] = await navigator.serial.getPorts();
    if(!p) return null;
    if(!p.writable) await p.open({ baudRate: baudios }).catch(() => {});
    serie = p; return 'Puerto serie';
  },
  async enviar(b, conf){
    if(!(await SERIAL.reconectar(conf))) throw new ErrorImpresora('Conecta el puerto serie primero.');
    const w = serie.writable.getWriter();
    try{ await w.write(b); } finally{ w.releaseLock(); }
  },
};

/* ── Red · Epson ePOS-Print ────────────────────────────────────────────── */
/* Los bytes ESC/POS van como hexadecimal en <command>: así el ticket es el
   mismo que por USB. Desde una página https la impresora tiene que servir
   https (en la impresora: Ajustes de red → SSL/TLS) y abrir una vez
   https://IP en este navegador para aceptar su certificado. */
const EPSON = {
  disponible: () => true,
  async conectar({ ip }){ if(!ip) throw new ErrorImpresora('Escribe la IP de la impresora.'); return `Epson en ${ip}`; },
  reconectar: async ({ ip }) => ip ? `Epson en ${ip}` : null,
  async enviar(b, { ip, epsonId = 'local_printer' }){
    const proto = location.protocol === 'https:' ? 'https' : 'http';
    const xml = `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>`
      + `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print"><command>${hexa(b)}</command></epos-print></s:Body></s:Envelope>`;
    let r;
    try{
      r = await fetch(`${proto}://${ip}/cgi-bin/epos/service.cgi?devid=${encodeURIComponent(epsonId)}&timeout=10000`,
        { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' }, body: xml });
    }catch(e){ throw new ErrorImpresora(`No contestó la impresora en ${ip}. ¿Misma red? ${proto === 'https' ? `Abre https://${ip} una vez y acepta el certificado.` : ''}`); }
    const t = await r.text();
    if(!/success="true"/.test(t)) throw new ErrorImpresora('La Epson respondió con error: ' + (/code="([^"]*)"/.exec(t)?.[1] || r.status));
  },
};

/* ── Red · Star WebPRNT ────────────────────────────────────────────────── */
const STAR = {
  disponible: () => true,
  async conectar({ ip }){ if(!ip) throw new ErrorImpresora('Escribe la IP de la impresora.'); return `Star en ${ip}`; },
  reconectar: async ({ ip }) => ip ? `Star en ${ip}` : null,
  async enviar(b, { ip }){
    const proto = location.protocol === 'https:' ? 'https' : 'http';
    // WebPRNT acepta comandos crudos en base64 dentro de <rawdata>.
    const b64 = btoa(String.fromCharCode(...b));
    const pedido = `<root><rawdata>${b64}</rawdata></root>`;
    const xml = `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>`
      + `<StarWebPrint xmlns="http://www.star-m.jp" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><Request>${pedido.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Request>`
      + `<PrintSetting><PaperType>normal</PaperType></PrintSetting></StarWebPrint></s:Body></s:Envelope>`;
    let r;
    try{ r = await fetch(`${proto}://${ip}/StarWebPRNT/SendMessage`, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=UTF-8' }, body: xml }); }
    catch(e){ throw new ErrorImpresora(`No contestó la impresora Star en ${ip}. ¿Está activado WebPRNT?`); }
    if(!r.ok) throw new ErrorImpresora('La Star respondió con error ' + r.status);
  },
};

/* ── Puente local (tienda/puente/puente.mjs) ───────────────────────────── */
const PUENTE = {
  disponible: () => true,
  async conectar({ puente = 'http://127.0.0.1:9101' }){
    let r;
    try{ r = await fetch(puente + '/salud'); }catch(e){ throw new ErrorImpresora('El puente no está corriendo en esta computadora. Descárgalo y ábrelo (ver ayuda).'); }
    const j = await r.json(); return `Puente ${j.version || ''}`.trim();
  },
  reconectar: async (c) => PUENTE.conectar(c).catch(() => null),
  async enviar(b, { puente = 'http://127.0.0.1:9101', destino }){
    if(!destino) throw new ErrorImpresora('Falta decir a qué impresora manda el puente (IP:9100 o nombre).');
    let r;
    try{ r = await fetch(`${puente}/imprimir?destino=${encodeURIComponent(destino)}`, { method: 'POST', body: b, headers: { 'Content-Type': 'application/octet-stream' } }); }
    catch(e){ throw new ErrorImpresora('El puente no está corriendo en esta computadora.'); }
    if(!r.ok) throw new ErrorImpresora('El puente dijo: ' + (await r.text()));
  },
};

export const TRANSPORTES = { usb: USB, bluetooth: BLUETOOTH, serial: SERIAL, epson: EPSON, star: STAR, puente: PUENTE };
