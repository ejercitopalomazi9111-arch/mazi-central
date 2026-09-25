#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   PUENTE DE IMPRESIÓN · `node puente.mjs`
   ──────────────────────────────────────────────────────────────────────────
   Un navegador no puede abrir el puerto 9100 de una impresora de red, ni
   escribir en una impresora instalada en Windows. Este programita sí: corre
   en la computadora de la caja, escucha SÓLO en esa computadora (127.0.0.1)
   y reenvía los bytes del ticket.

   Destinos (lo que se escribe en la app, en «Destino»):
     192.168.1.50            impresora de red, puerto 9100
     192.168.1.50:9101       otro puerto
     cups:Nombre_de_la_cola  Mac o Linux (la impresora instalada, en crudo)
     win:NombreCompartido    Windows: comparte la impresora con ese nombre
     archivo:/dev/usb/lp0    Linux: la impresora USB directo
     com:COM3                Windows: puerto serie

   Sin nada que instalar: sólo Node (nodejs.org). Para que arranque solo al
   prender la computadora, ver LEEME.md.
   Variables: PUENTE_PUERTO (9101), PUENTE_ORIGENES (lista de sitios que
   pueden mandar, separada por comas; vacío = cualquiera).
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const VERSION = '1.0';
const PUERTO = Number(process.env.PUENTE_PUERTO || 9101);
const ORIGENES = (process.env.PUENTE_ORIGENES || '').split(',').map((s) => s.trim()).filter(Boolean);
const TOPE = 5 * 1024 * 1024;

function aTcp(host, puerto, datos){
  return new Promise((ok, mal) => {
    const s = connect({ host, port: puerto, timeout: 8000 }, () => s.end(datos, ok));
    s.on('timeout', () => { s.destroy(); mal(new Error(`la impresora ${host}:${puerto} no contestó`)); });
    s.on('error', (e) => mal(new Error(`no se pudo conectar a ${host}:${puerto} (${e.code})`)));
  });
}
function aCups(cola, datos){
  return new Promise((ok, mal) => {
    const p = spawn('lp', ['-d', cola, '-o', 'raw']);
    p.on('error', () => mal(new Error('no está el comando lp (¿CUPS instalado?)')));
    p.on('close', (c) => c === 0 ? ok() : mal(new Error(`lp terminó con ${c}`)));
    p.stdin.end(datos);
  });
}
export async function enviar(destino, datos){
  const [tipo, resto] = destino.includes(':') && /^(cups|win|archivo|com):/.test(destino) ? [destino.slice(0, destino.indexOf(':')), destino.slice(destino.indexOf(':') + 1)] : ['tcp', destino];
  if(tipo === 'tcp'){
    const m = /^([\w.-]+)(?::(\d+))?$/.exec(resto);
    if(!m) throw new Error('destino no válido: ' + destino);
    return aTcp(m[1], Number(m[2] || 9100), datos);
  }
  if(tipo === 'cups') return aCups(resto, datos);
  if(tipo === 'win') return writeFile(`\\\\localhost\\${resto}`, datos);
  if(tipo === 'archivo') return writeFile(resto, datos);
  if(tipo === 'com') return writeFile(`\\\\.\\${resto}`, datos);
  throw new Error('tipo de destino desconocido');
}

export function crearPuente(){
  return createServer(async (req, res) => {
    const origen = req.headers.origin || '';
    const permitido = !ORIGENES.length || ORIGENES.includes(origen);
    res.setHeader('Access-Control-Allow-Origin', permitido ? (origen || '*') : 'null');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');   // Chrome: página pública → localhost
    res.setHeader('Vary', 'Origin');
    if(req.method === 'OPTIONS'){ res.writeHead(204).end(); return; }
    if(!permitido){ res.writeHead(403).end('origen no permitido'); return; }
    const url = new URL(req.url, 'http://127.0.0.1');
    if(req.method === 'GET' && url.pathname === '/salud'){
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ bien: true, version: VERSION })); return;
    }
    if(req.method === 'POST' && url.pathname === '/imprimir'){
      const destino = url.searchParams.get('destino');
      if(!destino){ res.writeHead(400).end('falta ?destino='); return; }
      const trozos = []; let n = 0;
      for await(const t of req){ n += t.length; if(n > TOPE){ res.writeHead(413).end('demasiado grande'); return; } trozos.push(t); }
      try{
        await enviar(destino, Buffer.concat(trozos));
        console.log(new Date().toLocaleTimeString('es-MX'), '→', destino, n, 'bytes');
        res.writeHead(200).end('ok');
      }catch(e){ console.error('✗', destino, e.message); res.writeHead(502).end(e.message); }
      return;
    }
    res.writeHead(404).end('no existe');
  });
}

// Sólo arranca si se corre directo (no al importarlo en las pruebas: el
// nombre «pruebas-puente.mjs» también termina en «puente.mjs»).
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href){
  crearPuente().listen(PUERTO, '127.0.0.1', () => {
    console.log(`Puente de impresión ${VERSION} escuchando en http://127.0.0.1:${PUERTO}`);
    console.log('Deja esta ventana abierta mientras se venda. Ctrl+C para cerrarlo.');
  });
}
