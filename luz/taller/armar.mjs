/* Arma luz/index.html.
     node luz/taller/armar.mjs

   ⚠ POR QUÉ HAY UN GENERADOR PARA UNA PÁGINA QUE YA CALCULA SOLA.
   Sin él, con JavaScript apagado esta página es un esqueleto: tres títulos y
   dos tablas vacías. Con él, el HTML sale del horno con el año entero de la
   ciudad por omisión ya escrito —los dos extremos y los doce meses—, así que
   sin JavaScript se lee, se busca con Ctrl+F, se imprime y sale en cualquier
   buscador. El JavaScript deja de ser el que trae el contenido y pasa a ser el
   que lo hace interactivo, que es su sitio.

   Lo único que NO se puede hornear es el bloque de «hoy»: un archivo estático
   no sabe qué día es. Ahí se hornea una fecha fija —el solsticio de junio— y
   se dice cuál es, en vez de dejar un hueco o, peor, fingir que es hoy. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { luzDe } from '../sol.js';
import { LUGARES } from '../lugares.js';
import { MES, hhmm, duracion, cambio } from '../formato.js';

const AQUI = dirname(new URL(import.meta.url).pathname);
const RAIZ = join(AQUI, '..');
const L = LUGARES[0];
const ANO = new Date().getFullYear();

/* el año entero de la ciudad por omisión */
const dias = [];
{
  const d = new Date(Date.UTC(ANO, 0, 1));
  while(d.getUTCFullYear() === ANO){
    dias.push({ m:d.getUTCMonth()+1, d:d.getUTCDate(),
                r: luzDe(ANO, d.getUTCMonth()+1, d.getUTCDate(), L.lat, L.lon, L.huso) });
    d.setUTCDate(d.getUTCDate()+1);
  }
}
const largo = dias.reduce((a,b) => b.r.horasLuz > a.r.horasLuz ? b : a);
const corto = dias.reduce((a,b) => b.r.horasLuz < a.r.horasLuz ? b : a);

const extremos =
  `<tr><th scope="row">Día más largo</th><td>${largo.d} de ${MES[largo.m-1]}</td>` +
  `<td class="n">${duracion(largo.r.horasLuz)}</td></tr>` +
  `<tr><th scope="row">Día más corto</th><td>${corto.d} de ${MES[corto.m-1]}</td>` +
  `<td class="n">${duracion(corto.r.horasLuz)}</td></tr>` +
  `<tr><th scope="row">Diferencia</th><td>entre uno y otro</td>` +
  `<td class="n">${duracion(largo.r.horasLuz - corto.r.horasLuz)}</td></tr>`;

const mensual = MES.map((nombre, i) => {
  const x = dias.find(y => y.m === i+1 && y.d === 15);
  return `<tr><th scope="row">${nombre[0].toUpperCase()+nombre.slice(1)} 15</th>` +
         `<td class="n">${hhmm(x.r.salida && x.r.salida[0])}</td>` +
         `<td class="n">${hhmm(x.r.salida && x.r.salida[1])}</td>` +
         `<td class="n">${duracion(x.r.horasLuz)}</td></tr>`;
}).join('');

/* el «hoy» horneado: el día más largo del año, dicho con su fecha */
const ay = new Date(Date.UTC(ANO, largo.m-1, largo.d - 1));
const anterior = luzDe(ay.getUTCFullYear(), ay.getUTCMonth()+1, ay.getUTCDate(),
                       L.lat, L.lon, L.huso);
const t = Math.round(largo.r.horasLuz * 60);

const cuerpo = readFileSync(join(AQUI,'cuerpo.html'),'utf8')
  .replace('__DONDE__',   `${L.nombre} · ${largo.d} de ${MES[largo.m-1]} de ${ANO}`)
  .replace('__HORAS__',   String(Math.floor(t/60)))
  .replace('__MINS__',    String(t%60).padStart(2,'0'))
  .replace('__DELTA__',   cambio((largo.r.horasLuz - anterior.horasLuz) * 60))
  .replace('__SALEPONE__',`Sale ${hhmm(largo.r.salida[0])} · mediodía solar ` +
                          `${hhmm(largo.r.medio)} · se pone ${hhmm(largo.r.salida[1])}`)
  .replace('__DONDE_ANO__', `${L.nombre}, ${ANO}`)
  .replace('__EXTREMOS__', extremos)
  .replace('__MENSUAL__',  mensual);

const html = `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>El año en luz · cuánto dura el día y cómo cambia</title>
<meta name="description" content="Cuántas horas de luz hay hoy y cómo cambian a lo largo del año, calculado en tu propio aparato. Sin peticiones, sin cuentas y sin rastreo.">
<meta name="theme-color" content="#FBF8F3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B0E15" media="(prefers-color-scheme: dark)">
<link rel="icon" href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="%230D1220"/><circle cx="16" cy="20" r="9" fill="%23E8B04B"/><rect y="20" width="32" height="12" fill="%230D1220"/><rect y="19" width="32" height="1.6" fill="%23C8794A"/></svg>'>
<link rel="stylesheet" href="estilo.css">
<script>
/* El tema, ANTES de pintar: aplicarlo después deja un destello del tema
   equivocado en cada carga, y ese destello se ve siempre. */
try{ var t = localStorage.getItem('luz_tema');
     if(t) document.documentElement.setAttribute('data-tema', t); }catch(e){}
</script>
</head>
<body>
${cuerpo}
<script type="module" src="motor.js"></script>
</body>
</html>
`;
writeFileSync(join(RAIZ,'index.html'), html);
console.log(`el año en luz · ${(html.length/1024).toFixed(0)} KB de HTML · ` +
            `${L.nombre} ${ANO} horneado: ${duracion(largo.r.horasLuz)} el ${largo.d}/${largo.m}`);
