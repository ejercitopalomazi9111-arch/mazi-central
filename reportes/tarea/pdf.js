/* pdf.js — UN PDF DE PÁGINAS-IMAGEN, HECHO A MANO
 * Cada página es un canvas (carta a 200 ppp) que entra como JPEG. Sin librerías: el formato PDF para «una imagen
 * por hoja» son unas cuantas líneas, y así funciona sin internet y en el iPhone.
 * Sale con cero transparencias (sin /SMask): lo que se imprime o se ve en el visor del iPhone sale igual.
 */
const enc = new TextEncoder();
export async function pdfDeLienzos(lienzos, { titulo = 'Documento', autor = '' } = {}){
  const partes = [], offs = [];
  let largo = 0;
  const pon = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; partes.push(b); largo += b.length; };
  const obj = (n, cuerpo) => { offs[n] = largo; pon(`${n} 0 obj\n`); for(const c of [].concat(cuerpo)) pon(c); pon('\nendobj\n'); };
  const esc = (s) => String(s).replace(/[\\()]/g, (c) => '\\' + c).replace(/[^\x20-\x7e]/g, (c) => {
    /* acentos del español en WinAnsi */
    const m = { á: 225, é: 233, í: 237, ó: 243, ú: 250, ñ: 241, Á: 193, É: 201, Í: 205, Ó: 211, Ú: 218, Ñ: 209, ü: 252, Ü: 220 }[c];
    return m ? '\\' + m.toString(8) : '';
  });
  pon('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = lienzos.length, W = 612, H = 792;
  /* 1 catálogo, 2 páginas, 3 info; por hoja: página, imagen, contenido */
  const ids = lienzos.map((_, i) => ({ pag: 4 + i * 3, img: 5 + i * 3, cont: 6 + i * 3 }));
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Count ${n} /Kids [${ids.map((x) => `${x.pag} 0 R`).join(' ')}] >>`);
  obj(3, `<< /Title (${esc(titulo)}) /Author (${esc(autor)}) /Producer (Reportes Grupo Mazi) >>`);
  for(let i = 0; i < n; i++){
    const c = lienzos[i];
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.84));
    const jpg = new Uint8Array(await blob.arrayBuffer());
    obj(ids[i].pag, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${ids[i].img} 0 R >> >> /Contents ${ids[i].cont} 0 R >>`);
    obj(ids[i].img, [`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, '\nendstream']);
    const dib = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    obj(ids[i].cont, `<< /Length ${dib.length} >>\nstream\n${dib}\nendstream`);
  }
  const total = 4 + n * 3, xref = largo;
  let tabla = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for(let k = 1; k < total; k++) tabla += String(offs[k]).padStart(10, '0') + ' 00000 n \n';
  pon(tabla + `trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(partes, { type: 'application/pdf' });
}
