/* k6 · carga: muchos clientes abriendo la misma página a la vez (lo que manda la herramienta que
   pasó Carlos el 5 de noviembre: «visitantes de mentiras»). Pide la página, su letra y sus fotos
   como lo haría un teléfono, y falla si algo tarda o truena.
     k6 run -e URL=https://mazi-central.palomazi9111.workers.dev/district-roll/ herramientas/k6/carga.js
   Instalar k6 (no va en el repo): curl -sSL https://github.com/grafana/k6/releases/download/v0.54.0/k6-v0.54.0-linux-amd64.tar.gz | tar xz
   El modo navegador (flujo-*.js) además necesita K6_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium K6_BROWSER_ARGS=no-sandbox.
   Ojo: esto es para NUESTRAS páginas. Mandarle carga a un sitio ajeno es atacarlo. */
import http from 'k6/http';
import { check, sleep } from 'k6';
const URL = __ENV.URL || 'https://mazi-central.palomazi9111.workers.dev/district-roll/';
export const options = {
  stages: [{ duration: '15s', target: 30 }, { duration: '30s', target: 30 }, { duration: '10s', target: 0 }],
  thresholds: { http_req_failed: ['rate<0.01'], 'http_req_duration{tipo:pagina}': ['p(95)<800'], 'http_req_duration{tipo:recurso}': ['p(95)<1200'] },
};
export default function () {
  const r = http.get(URL, { tags: { tipo: 'pagina' } });
  check(r, { 'la página contesta 200': (x) => x.status === 200, 'trae la carta': (x) => /Rollos empanizados/.test(x.body || '') });
  const base = URL.replace(/[^/]*$/, '');
  const recursos = ['fuentes/archivo.woff2', 'img/logo.webp', 'img/real-local.webp', 'img/real-empanizados.webp', 'vendor/qrcode-1.4.4.min.js'];
  const rs = http.batch(recursos.map((p) => ['GET', base + p, null, { tags: { tipo: 'recurso' } }]));
  check(rs, { 'todo lo de la página carga': (l) => l.every((x) => x.status === 200) });
  sleep(1 + Math.random() * 2);
}
