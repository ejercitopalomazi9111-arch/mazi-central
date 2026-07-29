#!/usr/bin/env node
/* ============================================================================
   navegador.mjs — HERRAMIENTA MAZI · las manos
   ----------------------------------------------------------------------------
   El hermano de captura.mjs. Ese saca la foto; éste USA la página: hace clic,
   escribe, hace scroll, espera, y reporta lo que encontró.

   Sirve para lo que un screenshot no alcanza:
     · probar un flujo completo (registro → login → crear algo)
     · verificar que un botón hace lo que dice
     · cazar errores de consola que sólo salen al interactuar
     · revisar la misma página en varios tamaños (la cátedra de revision-web)

   Uso:
     node herramientas/navegador.mjs <url> --guion <archivo.json> [opciones]
     node herramientas/navegador.mjs <url> --tamanos           (barrido de la cátedra)

   Opciones:
     --guion ARCHIVO   pasos a ejecutar (ver formato abajo)
     --tamanos         captura en teléfono, laptop y pantalla ancha, claro y oscuro
     --salida CARPETA  dónde dejar las capturas   (por defecto ./capturas)
     --lento MS        pausa entre pasos          (por defecto 500)
     --ver             deja el navegador con cabeza (para depurar en local)

   Formato del guion (JSON):
     [
       { "hacer": "escribir",  "en": "#correo", "texto": "prueba@mazi.mx" },
       { "hacer": "clic",      "en": "button[type=submit]" },
       { "hacer": "esperar",   "que": ".panel", "ms": 5000 },
       { "hacer": "scroll",    "a": 0.5 },
       { "hacer": "foto",      "nombre": "despues-de-entrar" },
       { "hacer": "verificar", "que": ".saludo", "contiene": "Bienvenido" },
       { "hacer": "tecla",     "cual": "Enter" },
       { "hacer": "pausa",     "ms": 1200 }
     ]
   ==========================================================================*/

import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RAICES = [
  process.env.MAZI_PUPPETEER,
  '/workspace/torre-infinita/node_modules/puppeteer/',
  '/home/user/mazi-central/node_modules/puppeteer/',
].filter(Boolean);

let puppeteer = null;
try { puppeteer = (await import('puppeteer')).default; } catch { /* seguimos */ }
for (const raiz of RAICES) {
  if (puppeteer) break;
  try {
    const pkg = JSON.parse(readFileSync(raiz + 'package.json', 'utf8'));
    puppeteer = (await import(raiz + (pkg.module || pkg.main))).default;
  } catch { /* siguiente */ }
}
if (!puppeteer) { console.error('No encontré puppeteer. npm i -D puppeteer'); process.exit(1); }

const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const args = process.argv.slice(2);
const url  = args[0];
if (!url) { console.error('Uso: node herramientas/navegador.mjs <url> [--guion g.json] [--tamanos]'); process.exit(1); }
const opt     = (n, d) => { const i = args.indexOf('--' + n); return i === -1 ? d : args[i + 1]; };
const bandera = (n) => args.includes('--' + n);

const SALIDA = opt('salida', './capturas');
const LENTO  = Number(opt('lento', 500));
mkdirSync(resolve(SALIDA), { recursive: true });

const dormir = (ms) => new Promise(r => setTimeout(r, ms));

// los tamaños de la cátedra (ver skill revision-web)
const TAMANOS = [
  { nombre: 'telefono', ancho: 390,  alto: 844,  movil: true  },
  { nombre: 'laptop',   ancho: 1440, alto: 900,  movil: false },
  { nombre: 'ancha',    ancho: 1920, alto: 1080, movil: false },
];

const navegador = await puppeteer.launch({
  headless: bandera('ver') ? false : 'new',
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-gpu'],
});

const problemas = [];
const hallazgos = [];

async function nuevaPagina(ancho, alto, movil, tema) {
  const p = await navegador.newPage();
  await p.setViewport({ width: ancho, height: alto, deviceScaleFactor: 2, isMobile: movil, hasTouch: movil });
  if (movil) await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  if (tema) await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: tema }]);
  p.on('pageerror', e => problemas.push(`[${ancho}px] ERROR: ${e.message}`));
  p.on('console', m => {
    if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text()))
      problemas.push(`[${ancho}px] ${m.text().slice(0, 200)}`);
  });
  return p;
}

// ── modo TAMAÑOS: el barrido de la cátedra ──────────────────────────────────
if (bandera('tamanos')) {
  console.log('CÁTEDRA · barriendo tamaños y temas\n');
  for (const t of TAMANOS) {
    for (const tema of ['light', 'dark']) {
      const p = await nuevaPagina(t.ancho, t.alto, t.movil, tema);
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await dormir(3000);

      // desbordes horizontales: la causa nº1 de "se ve feo en computadora"
      const desborde = await p.evaluate(() => {
        const doc = document.documentElement;
        const culpables = [];
        if (doc.scrollWidth > doc.clientWidth + 1) {
          for (const el of document.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.right > doc.clientWidth + 1 || r.left < -1) {
              culpables.push((el.tagName.toLowerCase() +
                (el.id ? '#' + el.id : '') +
                (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : ''))
                .slice(0, 60));
              if (culpables.length >= 5) break;
            }
          }
        }
        return { hay: doc.scrollWidth > doc.clientWidth + 1, ancho: doc.scrollWidth, viewport: doc.clientWidth, culpables };
      });

      // objetivos táctiles chicos (regla de Vercel: ≥24px, ≥44px en móvil)
      const minimo = t.movil ? 44 : 24;
      const chicos = await p.evaluate((min) => {
        const malos = [];
        for (const el of document.querySelectorAll('a,button,input,select,textarea,[role=button]')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;          // oculto, no cuenta
          if (r.height < min || r.width < min) {
            malos.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} ${Math.round(r.width)}×${Math.round(r.height)}`);
            if (malos.length >= 8) break;
          }
        }
        return malos;
      }, minimo);

      const archivo = `${SALIDA}/${t.nombre}-${tema}.png`;
      await p.screenshot({ path: resolve(archivo), fullPage: true });
      console.log(`📸 ${archivo}`);
      if (desborde.hay) {
        hallazgos.push(`DESBORDE en ${t.nombre}/${tema}: la página mide ${desborde.ancho}px en un viewport de ${desborde.viewport}px`);
        if (desborde.culpables.length) hallazgos.push(`   culpables: ${desborde.culpables.join(' · ')}`);
      }
      if (chicos.length) hallazgos.push(`OBJETIVOS CHICOS en ${t.nombre} (mínimo ${minimo}px): ${chicos.join(' · ')}`);
      await p.close();
    }
  }
}

// ── modo GUION: ejecutar pasos ──────────────────────────────────────────────
const guionArchivo = opt('guion', null);
if (guionArchivo) {
  const pasos = JSON.parse(readFileSync(resolve(guionArchivo), 'utf8'));
  const p = await nuevaPagina(390, 844, true, null);
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dormir(2500);
  console.log(`GUION · ${pasos.length} pasos\n`);

  for (const [i, paso] of pasos.entries()) {
    const n = String(i + 1).padStart(2, '0');
    try {
      switch (paso.hacer) {
        case 'clic':
          await p.waitForSelector(paso.en, { timeout: paso.ms || 8000 });
          await p.click(paso.en);
          console.log(`  ${n} ✓ clic en ${paso.en}`);
          break;
        case 'escribir':
          await p.waitForSelector(paso.en, { timeout: paso.ms || 8000 });
          await p.type(paso.en, paso.texto, { delay: 30 });
          console.log(`  ${n} ✓ escribí en ${paso.en}`);
          break;
        case 'tecla':
          // sostenida: en headless los toques instantáneos se pierden
          await p.keyboard.down(paso.cual); await dormir(120); await p.keyboard.up(paso.cual);
          console.log(`  ${n} ✓ tecla ${paso.cual}`);
          break;
        case 'esperar':
          await p.waitForSelector(paso.que, { timeout: paso.ms || 10000 });
          console.log(`  ${n} ✓ apareció ${paso.que}`);
          break;
        case 'scroll':
          await p.evaluate(f => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), paso.a ?? 1);
          console.log(`  ${n} ✓ scroll a ${Math.round((paso.a ?? 1) * 100)}%`);
          break;
        case 'foto': {
          const f = `${SALIDA}/${paso.nombre || 'paso-' + n}.png`;
          await p.screenshot({ path: resolve(f) });
          console.log(`  ${n} 📸 ${f}`);
          break;
        }
        case 'verificar': {
          await p.waitForSelector(paso.que, { timeout: paso.ms || 8000 });
          const txt = await p.$eval(paso.que, el => el.textContent || '');
          const ok = !paso.contiene || txt.includes(paso.contiene);
          console.log(`  ${n} ${ok ? '✓' : '✗'} ${paso.que} ${paso.contiene ? `contiene "${paso.contiene}"` : 'existe'}`);
          if (!ok) hallazgos.push(`VERIFICACIÓN FALLIDA paso ${n}: ${paso.que} decía "${txt.trim().slice(0, 80)}"`);
          break;
        }
        case 'pausa':
          await dormir(paso.ms || 1000);
          console.log(`  ${n} · pausa`);
          break;
        default:
          console.log(`  ${n} ? paso desconocido: ${paso.hacer}`);
      }
    } catch (e) {
      console.log(`  ${n} ✗ FALLÓ (${paso.hacer} ${paso.en || paso.que || ''}) — ${e.message.split('\n')[0]}`);
      hallazgos.push(`PASO ${n} FALLÓ: ${paso.hacer} · ${e.message.split('\n')[0]}`);
    }
    await dormir(LENTO);
  }
  await p.close();
}

// ── reporte ─────────────────────────────────────────────────────────────────
console.log('');
if (hallazgos.length) {
  console.log('── HALLAZGOS ──');
  hallazgos.forEach(h => console.log('  • ' + h));
} else {
  console.log('✓ sin hallazgos de layout ni de flujo');
}
if (problemas.length) {
  console.log('── CONSOLA ──');
  [...new Set(problemas)].slice(0, 12).forEach(p => console.log('  • ' + p));
} else {
  console.log('✓ sin errores de consola');
}

await navegador.close();
process.exit(hallazgos.length ? 1 : 0);
