/* ══════════════════════════════════════════════════════════════════════════
   SECRE · el criterio: lo que NO puede decir aunque la IA lo escriba
   ──────────────────────────────────────────────────────────────────────────
   Carlos, 4 de noviembre: «se está comprometiendo a cosas sin preguntar… si le
   doy una orden de no digas esto en ningún chat, no lo entiende y lo sigue
   diciendo… mi tía me preguntó ¿quién dejó esta leche afuera? y este güey dijo
   que yo… necesito que se le puedan cargar datos de precios y que los diga bien».

   La IA recibe las reglas en su instrucción, pero una instrucción se puede
   ignorar. Esto se revisa DESPUÉS, en código, sobre lo que ya escribió: si
   rompe algo, no se manda — se vuelve «necesita tu decisión» y Carlos la ve.
   Todo aquí es puro (sin WhatsApp ni IA) para poder probarlo.
   ═════════════════════════════════════════════════════════════════════════ */
import { HORARIOS } from './horarios.mjs';

export const plano = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ── los precios que Carlos carga ─────────────────────────────────────────
   «precios:» y luego un renglón por cosa: «sudadera negra - $450», «termo 350
   pesos», «corte $120 (con barba $180)». Regresa [{ nombre, precio, nota }]. */
export function leerPrecios(texto){
  const out = [];
  for(const r of String(texto || '').split(/\n|;/)){
    const l = r.replace(/^[\s•\-*·]+/, '').trim(); if(!l) continue;
    const m = /^(.{2,80}?)\s*(?:[-–:=]|\ba\b|\ben\b)?\s*\$?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(?:pesos|mxn|varos)?\s*(.*)$/i.exec(l);
    if(!m) continue;
    const precio = Number(m[2].replace(/,/g, '')); if(!Number.isFinite(precio) || precio <= 0) continue;
    out.push({ nombre: m[1].replace(/[\s:$-]+$/, '').trim(), precio, nota: m[3].replace(/^[\s,(-]+|[)\s]+$/g, '').slice(0, 120) });
  }
  return out;
}
export const textoPrecio = (p) => `${p.nombre}: $${p.precio.toLocaleString('en-US')}${p.nota ? ` (${p.nota})` : ''}`;

/* todas las cantidades de dinero que trae un texto: «$450», «450 pesos», «1,200 varos» */
export function cantidades(texto){
  const t = String(texto || ''), out = [];
  for(const m of t.matchAll(/\$\s*(\d[\d,]*(?:\.\d{1,2})?)|(\d[\d,]*(?:\.\d{1,2})?)\s*(?:pesos|mxn|varos|baros)\b/gi)) out.push(Number((m[1] || m[2]).replace(/,/g, '')));
  return out.filter(Number.isFinite);
}

/* ── lo que Carlos prohibió decir ─────────────────────────────────────────
   { texto: 'no hablar de mi novia', palabras: ['novia'] }: el texto va a la IA;
   las palabras se buscan en lo que escribió (sin acentos, como palabra entera). */
export function rompeProhibido(resp, prohibidos = []){
  const r = ' ' + plano(resp).replace(/[^a-z0-9ñ]+/g, ' ') + ' ';
  for(const p of prohibidos){
    for(const w of p.palabras || []){
      const k = plano(w).replace(/[^a-z0-9ñ]+/g, ' ').trim();
      if(k && r.includes(' ' + k + ' ')) return p;
    }
  }
  return null;
}

/* ── comprometerlo o echarle la culpa ─────────────────────────────────────
   Lo que nunca sale sin que él lo vea: «sí voy», «yo lo saco», «fui yo», «Carlos
   te lo lleva», «él la dejó». Se busca en primera persona (cuando se hace pasar
   por él) y en tercera (cuando habla como su asistente). Vale más frenar de más
   que comprometerlo: si frena, Carlos sólo tiene que mandar un número. */
const VERBOS = 'saco|sacar|muevo|mover|llevo|llevar|traigo|traer|recojo|recoger|paso por|lavo|lavar|limpio|limpiar|arreglo|arreglar|pago|pagar|presto|prestar|deposito|transfiero|compro|comprar|voy|ir|llego|caigo|hago|hacer|cubro|cubrir|apoyo|ayudo|devuelvo|regreso|entrego|entregar';
const PRIMERA = new RegExp(`\\b(?:fui yo|yo fui|fue mi culpa|yo (?:la|lo|las|los) (?:deje|puse|saque|tome|tire|rompi|use|agarre)|(?:si|claro|va|sale|ok|orale|simon|ahorita|al rato|manana|luego)[, ]+(?:yo )?(?:te |se |lo |la |los |las )?(?:${VERBOS})\\b|(?:yo )?(?:te|se) (?:lo|la|los|las) (?:llevo|traigo|paso|presto|deposito|mando)|(?:yo )?(?:lo|la|los|las) (?:saco|muevo|llevo|recojo|lavo|limpio|arreglo|pago|hago|traigo)\\b|ahi (?:estoy|estare|nos vemos)|cuenta conmigo|(?:si|claro|va) (?:puedo|voy|me apunto)|me comprometo|te lo prometo|te prometo|yo me encargo)`);
export function comprometeA(resp, nombre = 'carlos'){
  const t = plano(resp).replace(/[¿?¡!.,;:]+/g, ' ').replace(/\s+/g, ' ');
  if(PRIMERA.test(t)) return 'lo comprometía a algo';
  const n = plano(nombre);
  const TERCERA = new RegExp(`(?<!(?:pregunt\\w*|avis\\w*|dig\\w*|consult\\w*|checo con|veo con|le paso a)\\s+(?:a\\s+)?)\\b(?:${n}|el)\\s+(?!si\\b)(?:va|puede|te (?:lo|la)|lo (?:hace|saca|lleva|trae|paga)|la (?:hace|saca|lleva|trae|paga)|(?:la|lo|las|los) (?:dejo|puso|saco|tomo|tiro|rompio|uso)|fue (?:el|quien)|llega|se encarga|te (?:paga|presta|deposita|lleva|trae))\\b`);
  if(TERCERA.test(t)) return `comprometía a ${nombre} o decía algo de él que no sé`;
  return '';
}

/* ¿el texto habla COMO Carlos («sí voy, ahí nos vemos») y no DE Carlos («Carlos dice que sí va»)? */
export function enPrimeraPersona(resp, nombre = 'carlos'){
  const t = plano(resp).replace(/[¿?¡!.,;:]+/g, ' ').replace(/\s+/g, ' ');
  if(new RegExp(`\\b(?:${plano(nombre)}|el) (?:dice|dijo|comenta|te manda|va|puede|esta)\\b`).test(t)) return false;
  return PRIMERA.test(t) || /\b(?:voy|estoy|puedo|llego|paso por|me late|nos vemos)\b/.test(t);
}

/* ── todo junto: ¿se puede mandar? '' = sí; si no, por qué ── */
export function revisarRespuesta(resp, { nombre = 'Carlos', prohibidos = [], precios = [], datos = [], chat = '', vetados = [] } = {}){
  const r = String(resp || '').trim(); if(!r) return '';
  const p = rompeProhibido(r, prohibidos);
  if(p) return `iba a decir algo que me prohibiste («${p.texto}»)`;
  /* lo que nos CUESTA un producto nunca se le dice a un cliente */
  const veto = cantidades(r).find(c => vetados.includes(c));
  if(veto !== undefined) return `iba a decir lo que nos cuesta ($${veto})`;
  /* un precio que no salió de su lista, de lo que contó, ni del chat, es inventado */
  const buenos = new Set([...precios.map(x => x.precio), ...cantidades(precios.map(x => x.nota).join('\n')), ...cantidades(datos.join('\n')), ...cantidades(chat)]);
  const malo = cantidades(r).find(c => !buenos.has(c));
  if(malo !== undefined) return `iba a dar un precio que no está en tu lista ($${malo})`;
  const c = comprometeA(r, nombre);
  if(c) return c;
  return '';
}

/* ── dónde anda ahorita, según su horario de clases ───────────────────────
   Para que no prometa que «ahorita lo saca» cuando está en clase. dia: 0=domingo. */
export function enQueAnda({ dia, hora, horario = '3.1' }){
  const H = HORARIOS[horario]; if(!H || dia < 1 || dia > 5) return '';
  const aMin = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + b; };
  const m = aMin(hora);
  const b = H.bloques.find(x => m >= aMin(x.hora) && m < aMin(x.fin));
  if(b && b.dias && b.dias[dia]) return `en clase (${b.dias[dia]}) hasta las ${b.fin}`;
  const ini = aMin(H.bloques[0].hora), fin = aMin(H.bloques[H.bloques.length - 1].fin);
  if(m >= ini && m < fin) return 'en la escuela (entre clases)';
  return '';
}
