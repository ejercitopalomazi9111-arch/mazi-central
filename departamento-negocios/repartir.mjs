/* Reparte los artículos cosechados entre las diez materias del programa.
     BODEGA=<carpeta> node departamento-negocios/repartir.mjs

   ⚠ NO ES UN CLASIFICADOR LISTO: es un ÍNDICE PARA LEER. Cuenta apariciones
   de términos por materia, normaliza por longitud del texto y ordena. Sirve
   para saber por dónde empezar a leer 419 archivos, no para decidir de qué
   trata cada uno — eso lo decide quien lo lee. Un artículo puede salir alto en
   dos materias y estar bien: «precio» es de marketing y de ventas.

   Se escribe el reparto a `reparto.json` para que quede constancia de QUÉ se
   leyó para cada materia, que es lo que hace falta cuando alguien pregunta de
   dónde salió una neurona. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BODEGA = process.env.BODEGA ||
  '/tmp/claude-0/-home-user-evaluaciones-rembrandt/bf88face-536e-5b8f-9dd9-93f513378ced/scratchpad/cosecha-negocios';

export const MATERIAS = [
  { id:'estrategia', nombre:'Estrategias', terminos:[
    'strategy','strategic','competitive advantage','positioning','trade-off','tradeoff',
    'differentiation','moat','five forces','value chain','bets','long term','vision',
    'competitor','market position','core competen'] },
  { id:'marketing', nombre:'Marketing', terminos:[
    'marketing','brand','audience','campaign','segment','positioning statement','messaging',
    'advertis','demand generation','content marketing','funnel','awareness','copy','channel mix'] },
  { id:'gestion', nombre:'Gestión de empresas', terminos:[
    'management','manager','operating','planning','budget','forecast','governance',
    'accountab','okr','kpi','performance review','resource allocation','portfolio','risk'] },
  { id:'liderazgo', nombre:'Liderazgo', terminos:[
    'leader','leadership','trust','psychological safety','feedback','coaching','delegat',
    'motivation','culture','morale','difficult conversation','influence','manager of managers'] },
  { id:'organizacion', nombre:'Organización', terminos:[
    'org chart','organization','organisational','structure','team topolog','span of control',
    'reorg','hierarchy','handbook','remote work','asynchronous','process','roles and responsib',
    'coordination','meeting'] },
  { id:'optimizacion', nombre:'Optimización', terminos:[
    'efficiency','productivity','bottleneck','throughput','cycle time','lead time','waste',
    'lean','constraint','automation','continuous improvement','flow','wip','queue','optimiz'] },
  { id:'desarrollo', nombre:'Desarrollo de negocios', terminos:[
    'business development','partnership','alliance','pipeline','deal','expansion','market entry',
    'growth','new market','channel partner','revenue stream','pricing model','unit economics'] },
  { id:'innovacion', nombre:'Innovación', terminos:[
    'innovation','disrupt','experiment','r&d','prototype','discovery','ideation','new product',
    'venture','incubat','creative','invention','learning loop','hypothesis'] },
  { id:'atencion', nombre:'Atención al cliente', terminos:[
    'customer service','support','customer experience','complaint','churn','retention',
    'satisfaction','nps','help desk','ticket','service recovery','loyalty','customer success'] },
  { id:'ventas', nombre:'Ventas', terminos:[
    'sales','selling','quota','prospect','close the deal','objection','negotiat','buyer',
    'discount','price','revenue','account executive','crm','win rate','pipeline coverage'] },
];

const archivos = readdirSync(BODEGA).filter(f => f.endsWith('.txt'));
const reparto = {};
MATERIAS.forEach(m => reparto[m.id] = []);

for(const f of archivos){
  const crudo = readFileSync(join(BODEGA, f), 'utf8');
  const bajo = crudo.toLowerCase();
  const palabras = bajo.split(/\s+/).length;
  if(palabras < 250) continue;                 /* páginas de índice, no artículos */
  const titulo = (crudo.split('\n')[0] || '').replace(/^#\s*/, '').trim();
  const url    = (crudo.split('\n')[1] || '').replace(/^#\s*/, '').trim();
  const casa   = (crudo.split('\n')[2] || '').replace(/^#\s*casa:\s*/, '').trim();
  for(const m of MATERIAS){
    let golpes = 0, distintos = 0;
    for(const t of m.terminos){
      const c = bajo.split(t).length - 1;
      if(c){ golpes += c; distintos++; }
    }
    /* Normalizado por longitud: si no, gana siempre el artículo más largo, que
       es un sesgo por tamaño y no por tema. Y se exige variedad de términos:
       un texto que repite «sales» treinta veces y ninguna otra palabra del
       campo suele ser un artículo de otra cosa que menciona ventas. */
    if(distintos >= 3 && golpes >= 5)
      reparto[m.id].push({ archivo:f, titulo, url, casa,
                           puntos:+(golpes * 1000 / palabras).toFixed(2), distintos, palabras });
  }
}
for(const id in reparto) reparto[id].sort((a,b) => b.puntos - a.puntos);

writeFileSync('departamento-negocios/reparto.json',
  JSON.stringify({ cuando:new Date().toISOString().slice(0,10), bodega:BODEGA,
                   archivos:archivos.length, reparto }, null, 1));

console.log('archivos leídos: ' + archivos.length + '\n');
for(const m of MATERIAS){
  const r = reparto[m.id];
  console.log(String(r.length).padStart(4) + ' · ' + m.nombre.padEnd(24) +
    ' top: ' + r.slice(0,3).map(x => x.titulo.slice(0,42)).join(' | '));
}
