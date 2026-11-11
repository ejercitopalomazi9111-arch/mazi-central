/* ═══════════════════════════════════════════════════════════════════════════
   URBAN PEST · A QUIÉN TOCARLE LA PUERTA (industria en Querétaro)
   ───────────────────────────────────────────────────────────────────────────
   Carlos, 11 nov: «lo que más necesitamos es conseguirle contacto con
   industria». Saca del DENUE del INEGI (directorio público de empresas, de
   libre uso) las empresas de Querétaro de los giros que más necesitan control
   de plagas con registros: alimentos, bebidas, comida para animales,
   farmacéuticas, hospitales y bodegas. Deja fuera las de 0 a 10 personas.

     DENUE_TOKEN=… node urban-pest/prospectos/denue.mjs
   (o la llave en /tmp/claude-0/llave-inegi). La llave NUNCA va en el repo.
   Sale industria.csv (para Excel) e industria.json, por prioridad.
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN = process.env.DENUE_TOKEN || (() => { try { return readFileSync('/tmp/claude-0/llave-inegi', 'utf8').trim(); } catch { return ''; } })();
if(!TOKEN){ console.error('Falta DENUE_TOKEN'); process.exit(1); }
const BASE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta';
const QRO = 22;

/* subsector o rama SCIAN → por qué le importa a una fumigadora (y cuánto pesa) */
const GIROS = [
  { scian: '311', nivel: 'subsector', giro: 'Industria alimentaria', peso: 10, porque: 'Planta de alimentos: la norma de higiene le pide control de plagas con registros, y las auditorías lo revisan.' },
  { scian: '312', nivel: 'subsector', giro: 'Bebidas', peso: 9, porque: 'Planta de bebidas: inocuidad y auditorías de clientes.' },
  { scian: '3254', nivel: 'rama', giro: 'Farmacéutica', peso: 9, porque: 'Farmacéutica: buenas prácticas de fabricación con control de plagas documentado.' },
  { scian: '622', nivel: 'subsector', giro: 'Hospitales', peso: 8, porque: 'Hospital: plagas = riesgo sanitario y queja de pacientes.' },
  { scian: '4931', nivel: 'rama', giro: 'Bodegas y almacenes', peso: 7, porque: 'Almacén: la mercancía de sus clientes no puede tener plaga; roedores, sobre todo.' },
  { scian: '4311', nivel: 'rama', giro: 'Mayoreo de alimentos', peso: 7, porque: 'Distribuidor de alimentos: bodega con comida.' },
  { scian: '7223', nivel: 'rama', giro: 'Comedores industriales y banquetes', peso: 6, porque: 'Cocina que da de comer a fábricas: la auditan sus propios clientes.' },
];
const TAMANO = { '11 a 30 personas': 1, '31 a 50 personas': 2, '51 a 100 personas': 3, '101 a 250 personas': 4, '251 y más personas': 5 };

async function pagina(g, desde, hasta){
  /* BuscarAreaAct/{entidad}/{municipio}/{localidad}/{AGEB}/{manzana}/{sector}/{subsector}/{rama}/{clase}/{nombre}/{ini}/{fin}/{id}/{token} */
  const s = g.nivel === 'subsector' ? g.scian : '0', r = g.nivel === 'rama' ? g.scian : '0';
  const url = `${BASE}/BuscarAreaAct/${QRO}/0/0/0/0/0/${s}/${r}/0/0/${desde}/${hasta}/0/${TOKEN}`;
  for(let intento = 0; intento < 3; intento++){
    try { const res = await fetch(url, { signal: AbortSignal.timeout(60000) }); const j = await res.json(); return Array.isArray(j) ? j : []; }
    catch { await new Promise(z => setTimeout(z, 2000)); }
  }
  return [];
}

const filas = [];
for(const g of GIROS){
  let n = 0;
  for(let desde = 1; desde < 20000; desde += 1000){
    const p = await pagina(g, desde, desde + 999);
    for(const e of p){
      const t = TAMANO[e.Estrato]; if(!t) continue;
      filas.push({
        prioridad: g.peso * 10 + t * 4 + (e.Telefono ? 3 : 0) + (e.Correo_e ? 3 : 0),
        empresa: (e.Nombre || '').trim(), razon_social: (e.Razon_social || '').trim(), giro: g.giro, actividad: e.Clase_actividad,
        personal: e.Estrato, telefono: (e.Telefono || '').trim(), correo: (e.Correo_e || '').trim().toLowerCase(), web: (e.Sitio_internet || '').trim(),
        direccion: [e.Tipo_vialidad, e.Calle, e.Num_Exterior, e.Colonia, e.CP && 'CP ' + e.CP].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
        municipio: (e.Ubicacion || '').split(',').map(x => x.trim()).filter(Boolean).slice(-2, -1)[0] || '',
        lat: +e.Latitud || null, lon: +e.Longitud || null, porque: g.porque, denue_id: e.Id,
      });
      n++;
    }
    if(p.length < 1000) break;
  }
  console.log(`${g.giro}: ${n} con más de 10 personas`);
}
/* sin repetidos (la misma empresa puede caer en dos giros) */
const vistos = new Set(), unicas = filas.sort((a, b) => b.prioridad - a.prioridad).filter(f => !vistos.has(f.denue_id) && vistos.add(f.denue_id));
writeFileSync(new URL('./industria.json', import.meta.url), JSON.stringify({ fuente: 'DENUE, INEGI (libre uso, se cita la fuente)', sacado: new Date().toISOString().slice(0, 10), total: unicas.length, empresas: unicas }, null, 1));
const cols = ['prioridad', 'empresa', 'razon_social', 'giro', 'actividad', 'personal', 'telefono', 'correo', 'web', 'direccion', 'municipio', 'porque'];
const csv = '﻿' + [cols.join(','), ...unicas.map(f => cols.map(c => `"${String(f[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\r\n');
writeFileSync(new URL('./industria.csv', import.meta.url), csv);
console.log(`\n${unicas.length} empresas · con teléfono ${unicas.filter(f => f.telefono).length} · con correo ${unicas.filter(f => f.correo).length}`);
