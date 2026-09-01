/* Saca del REPO los números y las tablas que van en el documento, para que el
   documento no pueda desfasarse de los datos. Es exactamente la lección de
   `todo.json`: un artefacto que repite a mano lo que dice la fuente miente el
   día que la fuente cambia y nadie se entera.
     import { DATOS } from './datos.mjs'
   No imprime nada por sí solo; `armar.mjs` lo usa. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const RAIZ = new URL('../../..', import.meta.url).pathname.replace(/\/$/,'');

export const MATERIAS = [
  { id:'estrategia',   nombre:'Estrategias',            pieza:'01-estrategia' },
  { id:'marketing',    nombre:'Marketing',              pieza:'02-marketing' },
  { id:'gestion',      nombre:'Gestión de empresas',    pieza:'03-gestion' },
  { id:'liderazgo',    nombre:'Liderazgo',              pieza:'04-liderazgo' },
  { id:'organizacion', nombre:'Organización',           pieza:'05-organizacion' },
  { id:'optimizacion', nombre:'Optimización',           pieza:'06-optimizacion' },
  { id:'desarrollo',   nombre:'Desarrollo de negocios', pieza:'07-desarrollo' },
  { id:'innovacion',   nombre:'Innovación',             pieza:'08-innovacion' },
  { id:'atencion',     nombre:'Atención al cliente',    pieza:'09-atencion' },
  { id:'ventas',       nombre:'Ventas',                 pieza:'10-ventas' },
];

const leer = (p) => JSON.parse(readFileSync(join(RAIZ, p), 'utf8'));

/* ── el índice de títulos ───────────────────────────────────────────────────
   `reparto.json` sólo guarda los artículos que puntuaron en alguna materia:
   279 títulos distintos de los 419 cosechados. La bodega tiene los 419 con su
   cabecera «# título / # url / # casa», así que si sigue en disco se indexa de
   ahí y si no, de `reparto.json`. Lo que NO se hace es inventar una URL. */
export function indiceTitulos(){
  const idx = new Map();
  const mete = (titulo, url, casa) => {
    const t = clave(titulo);
    if(t && !idx.has(t)) idx.set(t, { titulo:limpiar(titulo), url, casa });
  };
  const r = leer('departamento-negocios/reparto.json');
  for(const m of Object.keys(r.reparto))
    for(const a of r.reparto[m]) mete(a.titulo, a.url, a.casa);
  const bodega = r.bodega;
  if(bodega && existsSync(bodega)){
    for(const f of readdirSync(bodega).filter(x=>x.endsWith('.txt'))){
      const cab = readFileSync(join(bodega,f),'utf8').split('\n',3);
      const t = (cab[0]||'').replace(/^#\s*/,'').trim();
      const u = (cab[1]||'').replace(/^#\s*/,'').trim();
      const c = (cab[2]||'').replace(/^#\s*casa:\s*/,'').trim();
      if(t && /^https?:/.test(u)) mete(t, u, c);
    }
  }
  return idx;
}

/* ⚠ La comparación de títulos se hace SIN PUNTUACIÓN. El título que escribí en
   la cabecera de un instrumento decía «Confluence, Jira and Jira Service
   Management» y el de la página cosechada «Confluence, Jira, and Jira Service
   Management»: una coma de Oxford, y el enlace no salía. Quitar todo lo que no
   sea letra o número es seguro para esto — para que un título fuera prefijo
   normalizado de otro distinto tendrían que ser el mismo artículo. */
const clave = (s) => limpiar(s).toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');

const limpiar = (s) => String(s)
  .replace(/&amp;/g,'&').replace(/&#8217;|&#039;|&#39;/g,'’').replace(/&quot;/g,'"')
  .replace(/&#8216;/g,'‘').replace(/&#8211;/g,'–').replace(/&#8212;/g,'—')
  .replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();

/* ── de qué artículo salió una neurona ──────────────────────────────────────
   `salioDe` es texto escrito a mano y tiene tres formas legítimas:
     · «Título» · Casa            → hay artículo, se busca la URL
     · Autor, «Título» · vía Casa → hay artículo citado dentro de otro
     · Síntesis de … · Casa       → NO hay un artículo: son varios de esa casa
   La tercera no se fuerza a una URL. Decir «este renglón salió de aquí»
   señalando un artículo que no lo dice es peor que no poner enlace. */
export function fuenteDe(salioDe, idx){
  const s = limpiar(salioDe || '');
  if(!s) return null;
  const sintesis = /^s[ií]ntesis\b/i.test(s);
  const m = s.match(/«([^»]+)»/);
  const titulo = m ? limpiar(m[1]) : null;
  let art = null;
  if(titulo){
    const t = clave(titulo);
    art = idx.get(t) || null;
    /* el título de la página suele traer la casa pegada detrás: «… - Inside
       Atlassian», «… | The GitLab Handbook». Por eso vale el prefijo. */
    if(!art && t.length >= 12) for(const [k,v] of idx) if(k.startsWith(t)){ art=v; break; }
  }
  return { texto:s, titulo, url:art?art.url:null, casa:art?art.casa:null, sintesis };
}

export const DATOS = (() => {
  const idx = indiceTitulos();
  const cosecha = leer('departamento-negocios/cosecha.json');
  const elegidos = leer('departamento-negocios/elegidos.json');
  const reparto = leer('departamento-negocios/reparto.json');

  const materias = MATERIAS.map(m => {
    const n = leer('cerebro/neuronas/'+m.id+'.json');
    const asignados = reparto.reparto[m.id] || [];
    const fuentes = [];
    const vistas = new Set();
    for(const x of n.neuronas){
      const f = fuenteDe(x.salioDe, idx);
      if(!f) continue;
      const clave = f.texto;
      if(vistas.has(clave)) continue;
      vistas.add(clave); fuentes.push(f);
    }
    const casas = {};
    for(const a of asignados) casas[a.casa] = (casas[a.casa]||0)+1;
    return { ...m, que:n.que, neuronas:n.neuronas, asignados, fuentes, casas };
  });

  /* el cerebro entero, no sólo negocios */
  const areas = readdirSync(join(RAIZ,'cerebro/neuronas')).filter(f=>f.endsWith('.json'));
  let totalNeuronas = 0;
  for(const f of areas) totalNeuronas += leer('cerebro/neuronas/'+f).neuronas.length;

  const casasReparto = {};
  for(const m of materias) for(const [c,k] of Object.entries(m.casas))
    casasReparto[c] = (casasReparto[c]||0)+k;

  return {
    cosecha:{ cuando:cosecha.cuando, total:cosecha.total, porCasa:cosecha.porCasa },
    elegidos:{ total:elegidos.total, cupoPorCasa:elegidos.cupoPorCasa, porCasa:elegidos.porCasa },
    reparto:{ cuando:reparto.cuando, archivos:reparto.archivos,
              asignaciones:materias.reduce((a,m)=>a+m.asignados.length,0), casas:casasReparto },
    materias,
    cerebro:{ areas:areas.length, neuronas:totalNeuronas,
              negocios:materias.reduce((a,m)=>a+m.neuronas.length,0) },
    titulosIndexados: idx.size,
  };
})();

/* Busca un título suelto en el índice de la cosecha. Se usa para decidir si una
   frase entre comillas angulares es un ARTÍCULO de verdad o es prosa
   entrecomillada: si no está en lo que se cosechó, no se cita como fuente. */
export const INDICE = indiceTitulos();
export function articulo(titulo){
  const t = clave(titulo);
  if(t.length < 12) return null;
  if(INDICE.has(t)) return INDICE.get(t);
  for(const [k,v] of INDICE) if(k.startsWith(t)) return v;
  return null;
}
