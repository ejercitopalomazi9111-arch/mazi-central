/* FADORI · pruebas. Un WebSocket de verdad al servidor desde Node, por el proxy del contenedor y con TLS verificado
   (ALPN http/1.1: con h2 el proxy no deja pasar la mejora a WebSocket). Para el relevo de las pruebas. */
import http from 'http'; import tls from 'tls'; import fs from 'fs'; import crypto from 'crypto';
const CA = fs.readFileSync('/root/.ccr/ca-bundle.crt');
export function abrirWS(url, origen, alMensaje, alCerrar) {
  return new Promise((ok, mal) => {
    const u = new URL(url), px = new URL(process.env.HTTPS_PROXY);
    const headers = { Host: `${u.host}:443` };
    if (px.username) headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(decodeURIComponent(px.username) + ':' + decodeURIComponent(px.password)).toString('base64');
    const q = http.request({ host: px.hostname, port: px.port, method: 'CONNECT', path: `${u.host}:443`, headers });
    q.on('connect', (res, sock) => {
      if (res.statusCode !== 200) return mal(new Error('CONNECT ' + res.statusCode));
      const t = tls.connect({ socket: sock, servername: u.host, ca: CA, ALPNProtocols: ['http/1.1'] }, () => {
        const key = crypto.randomBytes(16).toString('base64');
        t.write(`GET ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nOrigin: ${origen}\r\n\r\n`);
      });
      let buf = Buffer.alloc(0), abierto = false;
      const ws = {
        enviar(txt) { const d = Buffer.from(txt), m = crypto.randomBytes(4); const h = d.length < 126 ? Buffer.from([0x81, 0x80 | d.length]) : Buffer.concat([Buffer.from([0x81, 0x80 | 126]), Buffer.from([d.length >> 8, d.length & 255])]);
          const x = Buffer.alloc(d.length); for (let i = 0; i < d.length; i++) x[i] = d[i] ^ m[i % 4]; t.write(Buffer.concat([h, m, x])); },
        cerrar() { try { t.destroy(); } catch (e) {} },
      };
      t.on('data', ch => {
        buf = Buffer.concat([buf, ch]);
        if (!abierto) { const i = buf.indexOf('\r\n\r\n'); if (i < 0) return; const linea = buf.slice(0, buf.indexOf('\r\n')).toString(); buf = buf.slice(i + 4);
          if (!/ 101 /.test(linea)) { mal(new Error(linea)); return t.destroy(); } abierto = true; ok(ws); }
        while (buf.length >= 2) { let n = buf[1] & 0x7f, o = 2; if (n === 126) { if (buf.length < 4) return; n = buf.readUInt16BE(2); o = 4; }
          if (buf.length < o + n) return; const op = buf[0] & 0x0f, d = buf.slice(o, o + n); buf = buf.slice(o + n);
          if (op === 1) alMensaje(d.toString()); else if (op === 8) { alCerrar && alCerrar(); t.destroy(); } }
      });
      t.on('close', () => alCerrar && alCerrar()); t.on('error', e => mal(e));
    });
    q.on('error', mal); q.end();
  });
}
