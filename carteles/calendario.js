/* ═══════════════════════════════════════════════════════════════════════════
   CARTELES · CALENDARIO — N días × M anuncios, sin que se repita nada
   ───────────────────────────────────────────────────────────────────────────
   Lo que Carlos pidió para All's fashion, hecho regla: «como 10 todos los días
   durante 15 días». Lo que cuida el reparto:
     · cada día mezcla categorías (no diez sudaderas el lunes);
     · ninguna prenda sale dos veces el mismo día, y todas salen parejo;
     · ningún estilo se repite en el día si hay de dónde escoger, y todos se
       usan parejo en la campaña;
     · la foto con fondo quitado va a los estilos de estudio; la foto completa
       (la bodega, el montón de playeras) a los que la lucen entera;
     · si hay con qué, cada día lleva una «colección» (2-3 de la misma
       categoría) y un «mosaico» (4-6 fotos);
     · las frases salen de frases.js, por categoría, sin repetir hasta agotar.

   No toca imágenes: recibe productos con id y devuelve anuncios con ids. La
   pantalla pone las fotos. Así se prueba en Node, sin navegador.
   ═══════════════════════════════════════════════════════════════════════════ */
import { azar } from './motor.js';
import { repartidor, CAT } from './frases.js';

/* Qué estilo luce qué tipo de foto */
export const CON_RECORTE = ['estudio', 'maison', 'pasarela', 'minimal', 'preppy', 'nautico', 'glamour', 'dorado', 'rebaja', 'departamental', 'revista', 'etiqueta', 'color'];
export const CON_FOTO = ['portada', 'vitrina', 'glamour', 'maison', 'pasarela', 'dorado', 'estudio', 'departamental', 'minimal', 'nautico', 'revista'];
export const DE_LUGAR = ['vitrina', 'portada'];                 // la foto de la tienda o del montón
export const MODA = [...new Set([...CON_RECORTE, ...CON_FOTO, 'coleccion', 'mosaico'])];

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'], MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function etiquetaFecha(inicio, n) {
  if (!inicio) return `Día ${String(n).padStart(2, '0')}`;
  const d = new Date(inicio + 'T12:00:00'); d.setDate(d.getDate() + n - 1);
  return `Día ${String(n).padStart(2, '0')} · ${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

const TRIO = {
  la: ['Escoge tu color', '¿Cuál es la tuya?', 'Mismo estilo, tu color', 'Para cada personalidad'],
  el: ['Escoge tu color', '¿Cuál es el tuyo?', 'Mismo estilo, tu color', 'Para cada personalidad'],
  los: ['Escoge tu par', '¿Cuáles son los tuyos?', 'Para cada estilo, un par', 'Escoge tu color'],
  las: ['Escoge tu par', '¿Cuáles son las tuyas?', 'Para cada estilo, un par', 'Escoge tu color'],
};
const MOSAICO = ['¿Cuál te llevas? · Dinos en comentarios', 'Lo nuevo de la semana · Pide por DM', '¿Cuál es tu favorito? · 1, 2, 3 o 4', 'Recién llegado · Pregunta por DM'];

/**
 * @param {Array<{id, cat, recortada:boolean, precio?, antes?, promo?, nombre?}>} productos
 * @param {{dias, porDia, historias, cuadros, estilos, semilla, inicio, whatsapp}} op
 * @returns {Array<{dia, etiqueta, anuncios: Array<{n, formato, estilo, fotos:string[], prod:object, numero}>}>}
 */
export function planCampana(productos, op = {}) {
  const { dias = 15, porDia = 10, historias = 4, cuadros = 0, semilla = 1, inicio = '', whatsapp = '' } = op;
  const permitidos = (op.estilos && op.estilos.length ? op.estilos : MODA).filter(e => MODA.includes(e));
  const r = azar('campaña|' + semilla), rep = repartidor(r);
  const lista = productos.filter(p => p && p.id);
  if (!lista.length) return [];
  const menosUsadas = a => barajar(a).sort((x, y) => usoProd.get(x.id) - usoProd.get(y.id));
  const barajar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // fila de productos que alterna categorías: sud, tenis, bolsa, sud, tenis, …
  const porCat = new Map();
  for (const p of barajar(lista)) { const c = p.cat || 'producto'; if (!porCat.has(c)) porCat.set(c, []); porCat.get(c).push(p); }
  const cats = barajar([...porCat.keys()]).sort((a, b) => (a === 'tienda') - (b === 'tienda'));
  const fila = [];
  for (let i = 0; fila.length < lista.length; i++) for (const c of cats) { const q = porCat.get(c); if (q[i]) fila.push(q[i]); }
  let cursor = 0;
  const usoProd = new Map(lista.map(p => [p.id, 0]));
  const usoEstilo = new Map(permitidos.map(e => [e, 0]));

  const recortadas = c => (porCat.get(c) || []).filter(p => p.recortada);
  const catsColeccion = cats.filter(c => c !== 'tienda' && recortadas(c).length >= 2);
  const conFoto = lista.filter(p => !p.recortada || p.cat !== 'tienda');
  let iCol = 0, iMos = 0;

  function elegirEstilo(p, hoy) {
    const aptos = p.cat === 'tienda' ? DE_LUGAR : p.recortada ? CON_RECORTE : CON_FOTO;
    let cand = permitidos.filter(e => aptos.includes(e));
    if (!cand.length) cand = permitidos.filter(e => !['coleccion', 'mosaico'].includes(e));
    if (!cand.length) cand = aptos;
    const libres = cand.filter(e => !hoy.has(e)); if (libres.length) cand = libres;
    const min = Math.min(...cand.map(e => usoEstilo.get(e) ?? 0));
    const e = r.uno(cand.filter(x => (usoEstilo.get(x) ?? 0) === min));
    usoEstilo.set(e, (usoEstilo.get(e) ?? 0) + 1); hoy.add(e); return e;
  }
  function textos(cat, formato, p = {}) {
    const historia = formato === 'historia';
    return { categoria: cat, kicker: rep.kicker(cat), frase: rep.titular(cat), cta: rep.llamado(cat, { whatsapp, historia }), palabra: rep.palabra(cat),
      ...(p.nombre ? { nombre: p.nombre } : {}), ...(p.precio ? { precio: p.precio } : {}), ...(p.antes ? { antes: p.antes } : {}), ...(p.promo ? { promo: p.promo } : {}) };
  }

  const salida = [];
  for (let d = 1; d <= dias; d++) {
    const hoy = new Set(), usados = new Set(), anuncios = [];
    const formatos = Array.from({ length: porDia }, (_, k) => k < porDia - historias - cuadros ? 'feed' : k < porDia - cuadros ? 'historia' : 'cuadro');
    // qué va en cada lugar: colección y mosaico si se puede, lo demás prendas sueltas
    const tipos = formatos.map(() => 'suelta');
    if (porDia >= 5 && catsColeccion.length && permitidos.includes('coleccion')) tipos[Math.min(3, porDia - 1)] = 'coleccion';
    if (porDia >= 6 && conFoto.length >= 4 && permitidos.includes('mosaico')) tipos[(d % 2 ? 2 : porDia - 2)] = tipos[(d % 2 ? 2 : porDia - 2)] === 'suelta' ? 'mosaico' : tipos[(d % 2 ? 2 : porDia - 2)];
    formatos.forEach((formato, k) => {
      let a;
      if (tipos[k] === 'coleccion') {
        const c = catsColeccion[iCol++ % catsColeccion.length], rs = menosUsadas(recortadas(c)).slice(0, Math.min(3, recortadas(c).length));
        const g = (CAT[c] || CAT.producto).genero;
        a = { estilo: 'coleccion', fotos: rs.map(p => p.id), prod: { ...textos(c, formato), frase: TRIO[g][Math.floor(r() * TRIO[g].length)], kicker: (CAT[c] || CAT.producto).nombre } };
        rs.forEach(p => usoProd.set(p.id, usoProd.get(p.id) + 1)); usoEstilo.set('coleccion', (usoEstilo.get('coleccion') || 0) + 1);
      } else if (tipos[k] === 'mosaico') {
        const n = formato === 'historia' ? 6 : 4;
        const c = cats.filter(c => (porCat.get(c) || []).length >= n)[iMos % Math.max(1, cats.filter(c => (porCat.get(c) || []).length >= n).length)];
        const fuente = c ? porCat.get(c) : lista; iMos++;
        const fs = menosUsadas(fuente).slice(0, n); fs.forEach(p => usoProd.set(p.id, usoProd.get(p.id) + 1));
        a = { estilo: 'mosaico', fotos: fs.map(p => p.id), prod: { ...textos(c || 'producto', formato), frase: MOSAICO[(d + k) % MOSAICO.length] } };
        usoEstilo.set('mosaico', (usoEstilo.get('mosaico') || 0) + 1);
      } else {
        // la siguiente prenda de la fila que no haya salido hoy (y, si se puede, de las menos usadas)
        let p = null;
        for (let t = 0; t < fila.length; t++) { const x = fila[(cursor + t) % fila.length]; if (!usados.has(x.id)) { p = x; cursor = (cursor + t + 1) % fila.length; break; } }
        p ||= fila[cursor++ % fila.length];
        usados.add(p.id); usoProd.set(p.id, usoProd.get(p.id) + 1);
        const estilo = elegirEstilo(p, hoy);
        a = { estilo, fotos: [p.id], prod: textos(p.cat || 'producto', formato, p) };
      }
      anuncios.push({ n: k + 1, formato, numero: d, semilla: semilla * 1000 + d * 37 + k, ...a });
    });
    salida.push({ dia: d, etiqueta: etiquetaFecha(inicio, d), anuncios });
  }
  return salida;
}
