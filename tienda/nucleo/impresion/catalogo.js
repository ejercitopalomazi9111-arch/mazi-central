/* ══════════════════════════════════════════════════════════════════════════
   CATÁLOGO DE IMPRESORAS · con qué viene configurada cada una
   ──────────────────────────────────────────────────────────────────────────
   Elegir el modelo pone los ajustes de fábrica; todo se puede cambiar después
   en «Ajustes avanzados». Si el modelo no está, «Genérica ESC/POS» funciona con
   casi cualquier térmica china (Xprinter, HOIN, POS-58, POS-80…).

   Conexiones:
     usb        Chrome/Edge en computadora y Android (WebUSB)
     bluetooth  Chrome en Android y computadora (Web Bluetooth, sólo BLE)
     serial     Chrome/Edge en computadora (Web Serial: puerto COM, USB-serial)
     epson      Epson con ePOS-Print por red (TM-m30, TM-T88VI, TM-T20III…)
     star       Star con WebPRNT por red (TSP650II, mC-Print3, TSP143IV…)
     puente     cualquier impresora de red (puerto 9100) o instalada en la
                computadora, a través del puente local (tienda/puente/)
     navegador  la ventana de imprimir del sistema: funciona en TODO, incluido
                iPhone (AirPrint), con el controlador de la impresora

   columnas: renglón a letra normal (fuente A). 80 mm = 48, 58 mm = 32; las de
   matriz de punto (TM-U220) = 40 en papel de 76 mm.
   NINGUNA se probó con el aparato en la mano todavía: los números vienen de
   los manuales de cada fabricante. Por eso existe «Imprimir prueba».
   ═════════════════════════════════════════════════════════════════════════ */

const T80 = { papel: 80, columnas: 48, dialecto: 'escpos', pagina: 'cp850', qr: true, corte: 'parcial', cajon: true };
const T58 = { papel: 58, columnas: 32, dialecto: 'escpos', pagina: 'cp850', qr: true, corte: 'no', cajon: false };
const STAR = { papel: 80, columnas: 48, dialecto: 'star', pagina: 'cp858', qr: true, corte: 'parcial', cajon: true };

export const MODELOS = [
  // ── Genéricas ──
  { id: 'generica-80', marca: 'Genérica', modelo: 'ESC/POS de 80 mm', ...T80, conexiones: ['usb', 'serial', 'bluetooth', 'puente', 'navegador'],
    nota: 'Xprinter XP-80, HOIN, Rongta, Munbyn, «POS-80» y casi cualquier térmica de 80 mm.' },
  { id: 'generica-58', marca: 'Genérica', modelo: 'ESC/POS de 58 mm', ...T58, conexiones: ['usb', 'bluetooth', 'serial', 'puente', 'navegador'],
    nota: 'Xprinter XP-58, «POS-58», Goojprt PT-210, MTP-II y las portátiles de 58 mm.' },
  { id: 'navegador', marca: 'Cualquiera', modelo: 'La que tenga instalada el teléfono o la computadora', papel: 80, columnas: 48, dialecto: 'escpos', pagina: 'cp850', qr: true,
    conexiones: ['navegador'], nota: 'Usa la ventana de imprimir del sistema. Es la única vía en iPhone (AirPrint) y en impresoras que sólo imprimen gráficos.' },

  // ── Hechas o vendidas en México ──
  { id: '3nstar-rpt004', marca: '3nStar', modelo: 'RPT004 / RPT006 / RPT008', ...T80, conexiones: ['usb', 'serial', 'puente', 'navegador'] },
  { id: '3nstar-ppt300', marca: '3nStar', modelo: 'PPT300 / PPT305 portátil (58 mm)', ...T58, conexiones: ['bluetooth', 'usb', 'navegador'] },
  { id: 'ecline-80250', marca: 'EC Line', modelo: 'EC-PM-80250 / EC-PM-80340', ...T80, conexiones: ['usb', 'serial', 'puente', 'navegador'] },
  { id: 'ecline-5890', marca: 'EC Line', modelo: 'EC-PM-5890X (58 mm)', ...T58, conexiones: ['usb', 'bluetooth', 'navegador'] },
  { id: 'ghia-gtp801', marca: 'Ghia', modelo: 'GTP801 / GTP582', ...T80, conexiones: ['usb', 'serial', 'puente', 'navegador'] },
  { id: 'nextep-ne511', marca: 'Nextep', modelo: 'NE-511 / NE-510', ...T80, conexiones: ['usb', 'puente', 'navegador'] },
  { id: 'qian-t80', marca: 'Qian', modelo: 'QOP-T80UL', ...T80, conexiones: ['usb', 'puente', 'navegador'] },
  { id: 'posmovil-58', marca: 'Genérica', modelo: 'Mini portátil Bluetooth 58 mm (las de Mercado Libre)', ...T58, conexiones: ['bluetooth', 'navegador'],
    nota: 'Si en Bluetooth no aparece, es de Bluetooth «clásico»: esas sólo funcionan con la app del fabricante o por la ventana de imprimir en Android.' },

  // ── Epson ──
  { id: 'epson-tm-t20', marca: 'Epson', modelo: 'TM-T20II / TM-T20III / TM-T20X', ...T80, conexiones: ['usb', 'epson', 'puente', 'serial', 'navegador'],
    nota: 'La versión de red (-L o con tarjeta Ethernet) acepta ePOS-Print.' },
  { id: 'epson-tm-t88', marca: 'Epson', modelo: 'TM-T88V / TM-T88VI / TM-T88VII', ...T80, conexiones: ['usb', 'epson', 'puente', 'serial', 'navegador'] },
  { id: 'epson-tm-m30', marca: 'Epson', modelo: 'TM-m30 / TM-m30II / TM-m30III', ...T80, conexiones: ['epson', 'usb', 'bluetooth', 'puente', 'navegador'] },
  { id: 'epson-tm-t82', marca: 'Epson', modelo: 'TM-T82 / TM-T82III', ...T80, conexiones: ['usb', 'puente', 'serial', 'navegador'] },
  { id: 'epson-tm-m10', marca: 'Epson', modelo: 'TM-m10 (58 mm)', ...T58, corte: 'parcial', cajon: true, conexiones: ['usb', 'epson', 'bluetooth', 'navegador'] },
  { id: 'epson-tm-u220', marca: 'Epson', modelo: 'TM-U220 (matriz de punto)', papel: 76, columnas: 40, dialecto: 'escpos', pagina: 'cp850', qr: false, corte: 'parcial', cajon: true,
    conexiones: ['usb', 'serial', 'puente', 'navegador'], nota: 'De matriz de punto: no imprime QR ni imágenes con calidad.' },
  { id: 'epson-tm-p20', marca: 'Epson', modelo: 'TM-P20 / TM-P20II portátil', ...T58, conexiones: ['bluetooth', 'usb', 'navegador'] },

  // ── Star ──
  { id: 'star-tsp650', marca: 'Star', modelo: 'TSP650II / TSP654', ...STAR, conexiones: ['usb', 'star', 'puente', 'navegador'] },
  { id: 'star-tsp700', marca: 'Star', modelo: 'TSP700II / TSP800II', ...STAR, conexiones: ['usb', 'star', 'puente', 'navegador'] },
  { id: 'star-mcp31', marca: 'Star', modelo: 'mC-Print3 / mC-Print2', ...STAR, conexiones: ['star', 'usb', 'bluetooth', 'puente', 'navegador'] },
  { id: 'star-tsp143', marca: 'Star', modelo: 'TSP100 / TSP143 (III y IV)', ...STAR, modoImagen: true, conexiones: ['star', 'navegador'],
    nota: 'La TSP100 sólo imprime gráficos: la app le manda el ticket como imagen. Por USB, usa «ventana de imprimir» con su controlador.' },
  { id: 'star-sm-l200', marca: 'Star', modelo: 'SM-L200 / SM-S230i portátil', ...STAR, papel: 58, columnas: 32, cajon: false, corte: 'no', conexiones: ['bluetooth', 'navegador'] },

  // ── Otras marcas ──
  { id: 'bixolon-srp350', marca: 'Bixolon', modelo: 'SRP-350III / SRP-330II / SRP-E300', ...T80, conexiones: ['usb', 'serial', 'puente', 'navegador'] },
  { id: 'bixolon-spp-r200', marca: 'Bixolon', modelo: 'SPP-R200III / SPP-R310 portátil', ...T58, conexiones: ['bluetooth', 'usb', 'navegador'] },
  { id: 'citizen-cts310', marca: 'Citizen', modelo: 'CT-S310II / CT-S601II / CT-E351', ...T80, conexiones: ['usb', 'serial', 'puente', 'navegador'] },
  { id: 'xprinter-q200', marca: 'Xprinter', modelo: 'XP-Q200 / XP-Q260 / XP-N160', ...T80, conexiones: ['usb', 'puente', 'serial', 'navegador'] },
  { id: 'xprinter-58iih', marca: 'Xprinter', modelo: 'XP-58IIH / XP-P300 (58 mm)', ...T58, conexiones: ['usb', 'bluetooth', 'navegador'] },
  { id: 'rongta-rp80', marca: 'Rongta', modelo: 'RP80 / RP326 / RP850', ...T80, conexiones: ['usb', 'serial', 'puente', 'navegador'] },
  { id: 'munbyn-itpp047', marca: 'Munbyn', modelo: 'ITPP047 / ITPP068', ...T80, conexiones: ['usb', 'puente', 'navegador'] },
  { id: 'sunmi', marca: 'Sunmi', modelo: 'Impresora integrada (V2, T2, D2)', ...T58, conexiones: ['navegador', 'bluetooth'],
    nota: 'La integrada aparece como «InnerPrinter»; desde el navegador se usa la ventana de imprimir.' },
  { id: 'hprt-tp805', marca: 'HPRT', modelo: 'TP805 / TP806 / MT800 portátil', ...T80, conexiones: ['usb', 'bluetooth', 'puente', 'navegador'] },
  { id: 'zebra-zq320', marca: 'Zebra', modelo: 'ZQ320 / iMZ320 (modo recibo)', ...T58, pagina: 'cp850', conexiones: ['bluetooth', 'navegador'],
    nota: 'Zebra habla ZPL/CPCL; en modo «line print» acepta texto. Si no, usa la ventana de imprimir.' },
];

export const CONEXIONES = {
  navegador: { nombre: 'Ventana de imprimir', dice: 'Funciona en cualquier aparato, con el controlador de la impresora.' },
  usb:       { nombre: 'USB directo', dice: 'Chrome o Edge. En Windows puede pedir el controlador WinUSB (ver ayuda).' },
  bluetooth: { nombre: 'Bluetooth', dice: 'Chrome en Android o computadora. Sólo impresoras BLE.' },
  serial:    { nombre: 'Puerto serie / COM', dice: 'Chrome o Edge en computadora, con cable serial o USB-serial.' },
  epson:     { nombre: 'Red · Epson ePOS', dice: 'Escribe la IP. Hay que activar ePOS-Print en la impresora.' },
  star:      { nombre: 'Red · Star WebPRNT', dice: 'Escribe la IP. Hay que activar WebPRNT en la impresora.' },
  puente:    { nombre: 'Puente local', dice: 'Para cualquier impresora de red o instalada en la computadora.' },
};

/* Fabricantes conocidos por USB (para el filtro de WebUSB) + la clase
   «impresora» (7), que cubre a las que no están en la lista. */
export const USB_FABRICANTES = [
  0x04b8, // Epson
  0x0519, // Star Micronics
  0x1504, // Bixolon
  0x1d90, // Citizen
  0x0dd4, // Custom
  0x154f, // SNBC
  0x0483, // STMicro (Xprinter y muchas genéricas)
  0x0416, // Winbond (POS-58/80 genéricas)
  0x0fe6, // ICS (POS-58 genéricas)
  0x28e9, // GigaDevice (clones recientes)
  0x1fc9, // NXP (clones)
  0x6868, // Hprt/Xprinter
  0x20d1, // Rongta
  0x0525, // Netchip (Sunmi y otras)
  0x1a86, // QinHeng CH340 (USB-serial)
  0x067b, // Prolific (USB-serial)
  0x0493, // MAG-TEK (cajones)
];

/* Servicios BLE que usan las impresoras de tickets. */
export const BLE_SERVICIOS = [
  '000018f0-0000-1000-8000-00805f9b34fb',   // el más común (característica 2af1)
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',   // Microchip/ISSC (muchas portátiles)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',   // Goojprt, MTP-II y parecidas
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
];

export const PAPELES = [
  { mm: 58, columnas: 32, texto: '58 mm (32 letras)' },
  { mm: 76, columnas: 40, texto: '76 mm matriz (40 letras)' },
  { mm: 80, columnas: 48, texto: '80 mm (48 letras)' },
  { mm: 80, columnas: 42, texto: '80 mm, letra grande (42 letras)' },
  { mm: 80, columnas: 64, texto: '80 mm, letra chica (64 letras)' },
];
