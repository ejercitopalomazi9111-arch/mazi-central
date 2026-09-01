/* Junta los diecinueve pedazos de `fuente/` y expande las marcas [[…]] con
   tablas SACADAS DEL REPOSITORIO. Ninguna cifra ni ninguna dirección de este
   documento está escrita a mano dos veces.
     node armar.mjs <salida.txt>

   Es la misma lección que costó el desfase de `todo.json`: un artefacto que
   repite a mano lo que dice la fuente miente el día que la fuente cambia, y
   nadie se entera porque no hay nada que compare. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { DATOS, MATERIAS, RAIZ, articulo } from './datos.mjs';

const AQUI   = dirname(new URL(import.meta.url).pathname);
const FUENTE = join(AQUI, '..', 'fuente');
const SALIDA = process.argv[2] || join(AQUI, '..', 'investigacion.txt');

/* ⚠ Una barra vertical dentro de una celda parte la fila en dos columnas y
   descuadra la tabla entera. Los títulos de artículo vienen con barra muy a
   menudo: «Customer Success Strategy | The GitLab Handbook». */
const celda = (s) => String(s ?? '').replace(/\|/g,'·').replace(/\s+/g,' ').trim();
const tabla = (cab, filas) =>
  ['| ' + cab.map(celda).join(' | ') + ' |']
    .concat(filas.map(f => '| ' + f.map(celda).join(' | ') + ' |')).join('\n');

const CASAS = {
  gitlab:'GitLab Handbook', basecamp:'Basecamp', atlassian:'Atlassian',
  ycombinator:'Y Combinator', sloan:'MIT Sloan Management Review',
  wharton:'Knowledge at Wharton', hbr:'Harvard Business Review',
  farnam:'Farnam Street', wikipedia:'Wikipedia',
};
const ORDEN = ['gitlab','basecamp','atlassian','ycombinator','sloan','wharton','hbr','farnam','wikipedia'];

/* cuántos archivos de cada casa quedaron legibles en la bodega: se cuenta de
   las propias listas del reparto no se puede, porque el reparto sólo ve los
   que puntuaron. Se cuenta de la bodega si está, y si no se dice que no. */
function traidasPorCasa(){
  const r = JSON.parse(readFileSync(join(RAIZ,'departamento-negocios/reparto.json'),'utf8'));
  const cuenta = {};
  try{
    for(const f of readdirSync(r.bodega).filter(x=>x.endsWith('.txt'))){
      const c = (readFileSync(join(r.bodega,f),'utf8').split('\n',3)[2]||'')
                  .replace(/^#\s*casa:\s*/,'').trim();
      if(c) cuenta[c] = (cuenta[c]||0)+1;
    }
  }catch{ return null; }
  return cuenta;
}

const MARCAS = {
  'cosecha:casas'(){
    const t = traidasPorCasa();
    const filas = ORDEN.map(c => [
      CASAS[c],
      (DATOS.cosecha.porCasa[c] ?? 0).toLocaleString('es-MX'),
      DATOS.elegidos.porCasa[c] ?? 0,
      t ? (t[c] ?? 0) : '—',
      DATOS.reparto.casas[c] ?? 0,
    ]);
    filas.push(['Total',
      DATOS.cosecha.total.toLocaleString('es-MX'),
      DATOS.elegidos.total,
      t ? Object.values(t).reduce((a,b)=>a+b,0) : '—',
      DATOS.reparto.asignaciones]);
    return tabla(['Casa','Descubiertas','Elegidas','Traídas','Asignadas'], filas);
  },

  'reparto:materias'(){
    return tabla(['Materia','Archivos en su lista de lectura','Neuronas que salieron'],
      DATOS.materias.map(m => [m.nombre, m.asignados.length, m.neuronas.length]));
  },

  origenes(){
    const vistos = new Map();
    for(const m of DATOS.materias) for(const f of m.fuentes) if(!vistos.has(f.texto)) vistos.set(f.texto, f);
    const todos = [...vistos.values()];
    const conUrl = todos.filter(f => f.url).length;
    const sintesis = todos.filter(f => f.sintesis).length;
    const sinUrl = todos.length - conUrl - sintesis;
    return tabla(['Tipo de origen','Cuántos','Qué quiere decir'], [
      ['Artículo con su dirección', conUrl, 'se puede abrir y comprobar'],
      ['Trabajo citado dentro de otro', sinUrl, 'lleva el nombre de quien lo firma y la vía por la que llegó'],
      ['Síntesis de varios de una casa', sintesis, 'no hay un artículo único, y por eso no lleva dirección'],
      ['Orígenes distintos en total', todos.length, 'para 151 neuronas'],
    ]);
  },

  instrumentos(){
    return tabla(['Materia','Instrumento','Qué calcula'],
      PIEZAS.map(p => [p.materia, p.nombre, p.que]));
  },

  nomide(){
    return tabla(['Instrumento','Lo que no mide'],
      PIEZAS.map(p => [p.nombre, limite(p)]));
  },

  'fuentes:todas'(){
    const out = [];
    for(const m of DATOS.materias){
      out.push('', '### ' + m.nombre, '');
      out.push('**De dónde salió cada neurona.**', '');
      out.push(tabla(['Origen','Dirección'],
        m.fuentes.map(f => [f.texto, f.url || '—'])));
      out.push('', '**Lo que se leyó para esta materia**, ' + m.asignados.length +
               ' artículos, en el orden en que los puso el reparto.', '');
      /* ⚠ UNA SOLA COLUMNA, Y ES POR TAMAÑO. Con dos columnas el título se
         parte en tres renglones y la dirección en dos, así que cada artículo
         ocupa cuatro. Juntos en una celda ancha ocupan dos. Medido sobre el
         documento entero: 178 hojas contra 130. */
      out.push(tabla(['Artículo · dirección'],
        m.asignados.map(a => ['**' + limpiarTitulo(a.titulo) + '** · ' + a.url])));
      out.push('', '[hoja]');
    }
    out.pop();               /* el último salto sobra: ya viene el cierre */
    return out.join('\n');
  },
};

/* El título de la página trae la casa pegada detrás: «… - Knowledge at
   Wharton», «… | The GitLab Handbook». En una lista donde la casa ya se sabe
   por la dirección, eso son tres palabras de ruido por renglón y a veces un
   renglón entero de más. Se quitan sólo los sufijos conocidos, y nunca si
   dejan el título vacío. */
const COLAS = [' - Knowledge at Wharton', ' - Inside Atlassian', ' | The GitLab Handbook',
  ' - Wikipedia', ' | Getting Real', ' | Shape Up', ' - Farnam Street',
  ' | MIT Sloan Management Review', ' - MIT Sloan Management Review',
  ' | Basecamp', ' - Atlassian', ' | Atlassian'];
const sinCola = (t) => {
  for(const c of COLAS){
    if(t.toLowerCase().endsWith(c.toLowerCase())){
      const corto = t.slice(0, -c.length).trim().replace(/[·|,-]$/,'').trim();
      if(corto.length >= 8) return corto;
    }
  }
  return t;
};

const limpiarTitulo = (s) => sinCola(String(s)
  .replace(/&amp;/g,'&').replace(/&#8217;|&#039;|&#39;/g,'’').replace(/&quot;/g,'"')
  .replace(/&#8216;/g,'‘').replace(/&#8211;/g,'–').replace(/&#8212;/g,'—')
  .replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim());

/* ── los instrumentos ──────────────────────────────────────────────────────
   El límite de cada uno se saca de su propia ayuda, del apartado que dice «lo
   que no mide» o «lo que NO hace». No se copia aquí: si mañana cambia el
   texto dentro de la aplicación, cambia el documento. */
const PIEZAS = [];
for(const m of MATERIAS){
  const mod = await import(join(RAIZ,'taller-negocios/taller/piezas', m.pieza + '.js'));
  PIEZAS.push(mod.PIEZA);
}
PIEZAS.sort((a,b)=>a.n-b.n);

function limite(p){
  const a = p.ayuda || '';
  const i = a.search(/<h3>[^<]*no\s+(mide|hace)[^<]*<\/h3>/i);
  if(i < 0) return '—';
  return a.slice(i).replace(/<h3>[^<]*<\/h3>/,'').split(/<h[23]>/)[0]
          .replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
}

MARCAS['instrumento'] = (id) => {
  const p = PIEZAS.find(x => x.id === id);
  if(!p) throw new Error('no hay instrumento «'+id+'»');
  const f = fuentesDe(p);
  const partes = ['**' + p.nombre + '.** ' + p.que, '',
                  'Pide ' + p.campos.length + ' datos.'];
  if(f.length){
    partes.push('', 'Sale de:', '',
      tabla(['Artículo','Dirección'], f.map(a => [limpiarTitulo(a.titulo), a.url])));
  }
  partes.push('', '> **Lo que no mide.** ' + limite(p));
  return partes.join('\n');
};

/* La cabecera de cada pieza nombra sus artículos entre comillas angulares.
   ⚠ DOS TRAMPAS, LAS DOS MEDIDAS SOBRE EL TEXTO REAL:
   · sólo se mira la CABECERA. Cortando por caracteres se colaba «Mejorar el
     negocio», que es una etiqueta de la interfaz, citada como si fuera fuente.
   · y no toda comilla angular de la cabecera es un título: ahí dentro se citan
     frases sueltas —«delega más», «¿por qué existe este paso?»—. Así que cada
     candidato se BUSCA EN LO QUE SE COSECHÓ. Lo que no esté, no se cita. */
function fuentesDe(p){
  const todo = readFileSync(join(RAIZ,'taller-negocios/taller/piezas',
    MATERIAS.find(m=>m.id===p.id).pieza + '.js'), 'utf8');
  const cierre = todo.indexOf('*/');
  if(cierre < 0) return [];
  const vistos = new Map();
  for(const m of todo.slice(0, cierre).matchAll(/«([^»]{6,120})»/g)){
    const t = m[1].replace(/\s+/g,' ').trim();
    const a = articulo(t);
    if(a && !vistos.has(a.url)) vistos.set(a.url, a);
  }
  return [...vistos.values()];
}

/* ── armar ───────────────────────────────────────────────────────────────── */
const trozos = readdirSync(FUENTE).filter(f => f.endsWith('.md')).sort();
let texto = trozos.map(f => readFileSync(join(FUENTE,f),'utf8')).join('\n');

texto = texto.replace(/\[\[([a-z:]+?)(?::([a-z]+))?\]\]/g, (todo, marca, arg) => {
  if(marca === 'instrumento') return MARCAS.instrumento(arg);
  const clave = arg ? marca + ':' + arg : marca;
  if(MARCAS[clave]) return MARCAS[clave]();
  if(marca === 'neuronas'){
    const m = DATOS.materias.find(x => x.id === arg);
    if(!m) throw new Error('no hay materia «'+arg+'»');
    return tabla(['Neurona','Gravedad','De dónde salió'],
      m.neuronas.map(n => [n.titulo, n.gravedad, n.salioDe || '—']));
  }
  throw new Error('marca sin resolver: ' + todo);
});

if(/\[\[/.test(texto)) throw new Error('quedaron marcas sin expandir');

/* ── la compuerta que caza un título mal copiado ───────────────────────────
   Una cita que nombra un artículo entre comillas angulares y NO dice «vía» ni
   «citado en» tiene que ser un artículo de la cosecha. Si no resuelve, no es
   que falte el enlace: es que el título está mal escrito.
   Ya cazó uno: una neurona citaba «…New Ways to Court Prospects» y el artículo
   se llama «…New Ways to Court Private Equity Deals». Sin esta comprobación el
   documento habría salido con una cita que no existe. */
{
  const malas = [];
  const vistos = new Set();
  for(const m of DATOS.materias) for(const f of m.fuentes){
    if(vistos.has(f.texto)) continue; vistos.add(f.texto);
    if(!f.titulo || f.url || f.sintesis) continue;
    if(/\bv[ií]a\b|citado en/i.test(f.texto)) continue;   /* citado dentro de otro */
    malas.push(m.id + ' · ' + f.texto);
  }
  if(malas.length){
    console.error('\n✗ citas que nombran un artículo y no lo encuentran en la cosecha:');
    for(const x of malas) console.error('   ' + x);
    console.error('  o el título está mal copiado, o ese artículo no se cosechó.\n');
    process.exit(1);
  }
}
writeFileSync(SALIDA, texto.replace(/\n{3,}/g,'\n\n').trim() + '\n');
console.log('armado:', SALIDA, (texto.length/1024).toFixed(0) + ' KB',
            texto.split('\n').length, 'renglones');
