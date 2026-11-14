/* Arma la memoria técnica en PDF: portada aparte (sin encabezado), cuerpo con encabezado y número de página, y el
   índice con las páginas REALES (se imprime una vez, se buscan los títulos en el PDF y se vuelve a imprimir).
   node escuela/memoria-red-lan/armar.mjs  →  escuela/memoria-red-lan/Memoria-tecnica-red-LAN.pdf */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as D from './diagramas.mjs';

const aqui = fileURLToPath(new URL('.', import.meta.url));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* el índice: [id, nivel, texto, clave para encontrarlo en el PDF] */
const INDICE = [
  ['s1', 1, '1. Introducción'],
  ['s2', 1, '2. Descripción del escenario'], ['s2-1', 2, '2.1 La empresa'], ['s2-2', 2, '2.2 Distribución de áreas y usuarios'], ['s2-3', 2, '2.3 Necesidades y requerimientos de conectividad'],
  ['s3', 1, '3. Diseño de la red LAN'], ['s3-1', 2, '3.1 Arquitectura general de la red'], ['s3-2', 2, '3.2 Distribución de los equipos'], ['s3-3', 2, '3.3 Diagrama de la topología física'], ['s3-4', 2, '3.4 Diagrama de la topología lógica'],
  ['s3-5', 2, '3.5 Distribución de puntos de red'], ['s3-6', 2, '3.6 Medio de transmisión y cableado estructurado'], ['s3-7', 2, '3.7 Direccionamiento IP'], ['s3-8', 2, '3.8 Segmentación de la red con VLAN'], ['s3-9', 2, '3.9 Justificación de las decisiones de diseño'],
  ['s4', 1, '4. Características de los componentes del sistema de comunicación'], ['s4-1', 2, '4.1 Elementos del proceso de comunicación'], ['s4-2', 2, '4.2 Dispositivos físicos de la red'],
  ['s5', 1, '5. Configuración básica de los dispositivos de red'], ['s5-1', 2, '5.1 Parámetros IPv4 de los equipos finales'], ['s5-2', 2, '5.2 Router R-BORDE'], ['s5-3', 2, '5.3 Servicio DHCP en R-BORDE'], ['s5-4', 2, '5.4 Switch de núcleo SW-CORE'], ['s5-5', 2, '5.5 Switches de acceso SW-ACC1 y SW-ACC2'], ['s5-6', 2, '5.6 Puntos de acceso inalámbrico'], ['s5-7', 2, '5.7 Verificación de la configuración'],
  ['s6', 1, '6. Identificación de topologías físicas y lógicas'], ['s6-1', 2, '6.1 Topología física'], ['s6-2', 2, '6.2 Topología lógica'], ['s6-3', 2, '6.3 Diferencias entre la topología física y la lógica'],
  ['s7', 1, '7. Clasificación de dispositivos según los modelos de referencia'], ['s7-1', 2, '7.1 Modelo OSI'], ['s7-2', 2, '7.2 Modelo TCP/IP'], ['s7-3', 2, '7.3 Tabla comparativa OSI y TCP/IP'],
  ['s8', 1, '8. Línea del tiempo: evolución de las redes de datos'], ['s8-1', 2, '8.1 Cronología'], ['s8-2', 2, '8.2 La confiabilidad de las redes'],
  ['s9', 1, '9. Conclusiones'],
  ['sA', 1, 'Anexo: Uso de Inteligencia Artificial'],
  ['sF', 1, 'Fuentes de consulta', 'Fuentesenespañol'],
];

/* la línea del tiempo: [año, título, descripción, importancia para la confiabilidad, etiqueta, ¿hito de confiabilidad?] */
const HITOS = [
  ['1964', 'Redes distribuidas de Paul Baran', 'En la RAND Corporation, Baran propone una red con muchos caminos entre nodos y mensajes divididos en bloques (conmutación de paquetes).', 'Origen de la idea de confiabilidad por redundancia: si un nodo cae, los datos toman otro camino.', 'cnf', true],
  ['1969', 'ARPANET', 'Entra en operación la red de la agencia ARPA de EE. UU., con sus primeros nodos en universidades de California y Utah (Leiner et al., 1997).', 'Demuestra en la práctica la conmutación de paquetes entre computadoras distintas.', 'inf'],
  ['1973', 'Nace Ethernet', 'Robert Metcalfe y su equipo en Xerox PARC diseñan una red local de cable coaxial compartido a 2.94 Mb/s.', 'Primera tecnología LAN de uso extendido; su detección de colisiones (CSMA/CD) regula el acceso a un medio compartido.', 'inf'],
  ['1974', 'Protocolo TCP', 'Vinton Cerf y Robert Kahn publican el diseño de un protocolo para interconectar redes distintas.', 'TCP retransmite lo que se pierde: la confiabilidad pasa a resolverse extremo a extremo.', 'cnf', true],
  ['1980', 'Ethernet DIX', 'Digital, Intel y Xerox publican la especificación de Ethernet a 10 Mb/s como estándar abierto.', 'Equipos de varios fabricantes empiezan a funcionar juntos.', 'std'],
  ['1983', 'TCP/IP en ARPANET e IEEE 802.3', 'El 1 de enero ARPANET adopta TCP/IP como protocolo oficial; ese año IEEE aprueba la norma 802.3 basada en Ethernet (Leiner et al., 1997).', 'Una pila de protocolos común y una norma formal para las LAN.', 'std'],
  ['1984', 'Modelo de referencia OSI', 'ISO publica el modelo de siete capas, adoptado después por la UIT-T como Recomendación X.200 (UIT-T, 1994).', 'Ofrece un lenguaje común para diseñar y diagnosticar redes por capas.', 'std'],
  ['1985', 'Algoritmo de árbol de expansión', 'Radia Perlman crea el algoritmo que permite conectar puentes con caminos redundantes sin formar bucles.', 'Hace posible tener enlaces de respaldo en una LAN: base del STP.', 'cnf', true],
  ['1990', 'LAN comerciales conmutadas', 'IEEE aprueba 10BASE-T (Ethernet sobre par trenzado, 802.3i) y la norma 802.1D de puentes con STP; aparecen los primeros switches Ethernet comerciales y el protocolo SNMP (Case et al., 1990).', 'Cableado en estrella, reconfiguración automática ante fallas y monitoreo centralizado de equipos.', 'cnf', true],
  ['1991', 'Cableado estructurado', 'Se publica la primera norma de cableado de telecomunicaciones para edificios comerciales (TIA/EIA-568).', 'Instalaciones ordenadas y certificables, independientes del fabricante.', 'inf'],
  ['1995', 'Fast Ethernet', 'IEEE 802.3u lleva Ethernet a 100 Mb/s sobre par trenzado y fibra.', 'Más capacidad para servidores y enlaces entre switches.', 'std'],
  ['1997', 'IEEE 802.11', 'Primera norma de LAN inalámbrica, a 1 y 2 Mb/s.', 'Inicia la conectividad sin cables dentro de las organizaciones.', 'ina'],
  ['1998', 'VLAN, Gigabit Ethernet y routers redundantes', 'IEEE 802.1Q normaliza las VLAN; 802.3z lleva Ethernet a 1 Gb/s por fibra óptica; se publica HSRP para duplicar la puerta de enlace (Li et al., 1998).', 'Segmentación segura y primer protocolo extendido de router de respaldo.', 'cnf', true],
  ['1999', 'Gigabit sobre cobre y Wi-Fi', 'IEEE 802.3ab (1000BASE-T) usa los cuatro pares del UTP; 802.11b y 802.11a impulsan las redes inalámbricas y se crea la alianza que certificará la marca Wi-Fi.', 'Gigabit hasta el escritorio con el cableado existente.', 'ina'],
  ['2000', 'Agregación de enlaces', 'IEEE 802.3ad define LACP para agrupar varios enlaces físicos en uno lógico (hoy IEEE 802.1AX).', 'Si un cable del grupo falla, los demás siguen transportando el tráfico.', 'cnf', true],
  ['2001', 'RSTP y 802.1X', 'IEEE 802.1w (Rapid Spanning Tree) reduce la recuperación de decenas de segundos a unos pocos; 802.1X autentica los puertos antes de dar acceso.', 'Recuperación rápida ante fallas y control de quién se conecta.', 'cnf', true],
  ['2002', '10 Gigabit Ethernet y MSTP', 'IEEE 802.3ae alcanza 10 Gb/s sobre fibra óptica; 802.1s permite varias instancias de árbol de expansión.', 'Troncales de alta capacidad y mejor uso de los enlaces redundantes.', 'std'],
  ['2004', 'Seguridad inalámbrica WPA2', 'Se ratifica IEEE 802.11i, base de WPA2 con cifrado AES.', 'Redes inalámbricas confiables para uso empresarial.', 'cnf', true],
  ['2008', 'Redes definidas por software', 'Se presenta OpenFlow, que separa el plano de control del plano de datos de los switches; es el punto de partida de las redes definidas por software (Cisco Systems, s. f.-j).', 'Administración centralizada y programable de toda la red.', 'inf'],
  ['2009', 'Wi-Fi 4 y PoE+', 'IEEE 802.11n introduce MIMO; 802.3at eleva la potencia de PoE para alimentar puntos de acceso y cámaras.', 'Equipos alimentados por el propio switch, que puede respaldarse con UPS.', 'ina'],
  ['2010', '40 y 100 Gigabit Ethernet', 'IEEE 802.3ba define 40 y 100 Gb/s, sobre todo en fibra óptica, para centros de datos y redes troncales.', 'Más capacidad en el núcleo y en los enlaces entre edificios.', 'std'],
  ['2016', 'Ethernet multigigabit', 'IEEE 802.3bz permite 2.5 y 5 Gb/s sobre cableado Cat 5e y Cat 6 existente.', 'Enlaces más rápidos a los puntos de acceso sin recablear.', 'std'],
  ['2018', 'WPA3', 'La Wi-Fi Alliance presenta WPA3, con protección contra ataques de diccionario.', 'Contraseñas inalámbricas más difíciles de vulnerar.', 'cnf', true],
  ['2019–2021', 'Wi-Fi 6 (802.11ax)', 'Se certifica Wi-Fi 6 (2019) y se aprueba la norma IEEE 802.11ax (2021), pensada para muchos dispositivos simultáneos.', 'Mejor desempeño en oficinas con decenas de equipos conectados.', 'ina'],
  ['2024', 'Redes de muy alta velocidad', 'IEEE aprueba Ethernet a 800 Gb/s (802.3df) y se certifica Wi-Fi 7.', 'La redundancia, la agregación y la segmentación siguen siendo la base sobre la que crecen estas velocidades.', 'std'],
];
const TAG = { inf: 'Infraestructura', std: 'Estándar', ina: 'Inalámbrico', cnf: 'Confiabilidad' };
const linea = HITOS.map(([a, ti, d, imp, tag, conf]) => `<div class="hito${conf ? ' conf' : ''}"><span class="anio">${a}</span><div class="caja"><b class="t">${ti}<span class="tag ${tag}">${TAG[tag]}</span></b><p class="d">${d}</p><p class="imp">Confiabilidad: ${imp}</p></div></div>`).join('\n');

function armarCuerpo(paginas = {}){
  let h = readFileSync(aqui + 'memoria.html', 'utf8');
  const indice = '<ol class="indice">' + INDICE.map(([id, n, tx]) => `<li class="n${n}"><span class="t">${tx}</span><span class="punt"></span><span class="pg">${paginas[id] ?? '00'}</span></li>`).join('') + '</ol>';
  const rep = { '{{INDICE}}': indice, '{{FIG_FISICA}}': D.fisica(), '{{FIG_LOGICA}}': D.logica(), '{{FIG_PLANO}}': D.plano(), '{{FIG_RACK}}': D.rack(), '{{FIG_RECORRIDO}}': D.recorrido(), '{{LINEA}}': linea, '{{PROMPT}}': esc(readFileSync(aqui + 'prompt.txt', 'utf8').trim().replace(/\n\s*\n/g, '\n')) };
  for(const [k, v] of Object.entries(rep)) h = h.split(k).join(v);   /* sin replace(): el texto trae «$» */
  writeFileSync(aqui + '.cuerpo.html', h);
}

const ENC = `<div style="width:100%;font:500 7.5pt Inter,sans-serif;color:#5B6675;padding:0 20mm;display:flex;justify-content:space-between;border:0">
  <span>Memoria técnica · Diseño e implementación de una red LAN</span><span>Universidad Tecnológica de Querétaro</span></div>`;
const PIE = `<div style="width:100%;font:500 7.5pt Inter,sans-serif;color:#5B6675;padding:0 20mm;display:flex;justify-content:space-between">
  <span>Evaluación de la primera unidad</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;

const b = await chromium.launch();
const pg = await b.newPage();
async function imprimir(){
  await pg.goto('file://' + aqui + '.cuerpo.html', { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.pdf({ path: aqui + '.cuerpo.pdf', format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: ENC, footerTemplate: PIE, margin: { top: '24mm', bottom: '22mm', left: '20mm', right: '20mm' } });
}
const sinEspacios = (s) => s.replace(/\s+/g, '');
function paginasDe(){
  const n = +execFileSync('pdfinfo', [aqui + '.cuerpo.pdf']).toString().match(/Pages:\s+(\d+)/)[1];
  const textos = []; for(let i = 1; i <= n; i++) textos.push(sinEspacios(execFileSync('pdftotext', ['-f', String(i), '-l', String(i), aqui + '.cuerpo.pdf', '-']).toString()));
  const inicio = textos.findIndex((t) => t.includes(sinEspacios('Una red de área local (LAN')));
  const r = {};
  for(const [id, , tx, clave] of INDICE){
    const k = clave || sinEspacios(tx);
    const i = textos.findIndex((t, j) => j >= inicio && t.includes(k));
    r[id] = i < 0 ? '??' : i + 1;
  }
  return { r, n };
}
armarCuerpo(); await imprimir();
let { r } = paginasDe(); armarCuerpo(r); await imprimir();
const segunda = paginasDe();
if(JSON.stringify(segunda.r) !== JSON.stringify(r)){ armarCuerpo(segunda.r); await imprimir(); r = paginasDe().r; }
console.log('páginas del índice:', JSON.stringify(r));

/* portada */
await pg.goto('file://' + aqui + 'portada.html', { waitUntil: 'load' });
await pg.evaluate(() => document.fonts.ready);
await pg.pdf({ path: aqui + '.portada.pdf', format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
await b.close();
execFileSync('pdfunite', [aqui + '.portada.pdf', aqui + '.cuerpo.pdf', aqui + 'Memoria-tecnica-red-LAN.pdf']);
console.log('listo:', aqui + 'Memoria-tecnica-red-LAN.pdf');
