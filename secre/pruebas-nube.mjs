#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   SECRE · que lo guardado sobreviva a un reinicio (nube.mjs + La Sala)
   ──────────────────────────────────────────────────────────────────────────
   En Render gratis el disco se borra en cada reinicio. Aquí se prende La Sala
   local, se prende Secre guardando ahí, se le cuenta algo, se le escribe, se
   APAGA, se vuelve a prender y se comprueba que se acuerda de todo. Y que lo
   que queda en La Sala va cifrado: ni una palabra en claro.
     node secre/pruebas-nube.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { spawn } from 'child_process'; import path from 'path';
import { cifrar, descifrar, llaveDe, authEnMemoria } from './nube.mjs';
import { BufferJSON } from 'baileys';
const RAIZ = path.dirname(new URL(import.meta.url).pathname);

const fallas = []; let pasan = 0;
const ok = (que, si, extra) => { if(si){ pasan++; console.log('  ✓', que); } else { fallas.push(que); console.log('  ✗', que, extra !== undefined ? '· ' + JSON.stringify(extra).slice(0, 200) : ''); } };
const dormir = (ms) => new Promise(r => setTimeout(r, ms));

console.log('\n1 · El candado');
{
  const L = llaveDe('una-clave'), caja = cifrar('hola Carlos', L);
  ok('cifra y descifra', descifrar(caja, L) === 'hola Carlos');
  ok('lo cifrado no deja ver el texto', !/hola|Carlos/.test(caja));
  let tronó = false; try{ descifrar(caja, llaveDe('otra')); }catch{ tronó = true; }
  ok('con otra clave no se abre', tronó);
}

console.log('\n2 · La sesión de WhatsApp en memoria');
{
  let cambios = 0;
  const a = authEnMemoria(null, () => cambios++);
  await a.state.keys.set({ 'pre-key': { '1': { public: Buffer.from([1, 2, 3]), private: Buffer.from([4, 5]) } }, session: { 'x@s': Buffer.from('ses') } });
  ok('guardar llaves avisa que hubo cambio', cambios === 1);
  const viaje = JSON.parse(JSON.stringify(a.foto(), BufferJSON.replacer), BufferJSON.reviver);
  const b = authEnMemoria(viaje, () => {});
  const k = await b.state.keys.get('pre-key', ['1', '2']);
  ok('después del viaje, las llaves vuelven como bytes', Buffer.isBuffer(k['1'].public) && k['1'].public.equals(Buffer.from([1, 2, 3])) && !k['2']);
  ok('y la identidad de la cuenta es la misma', Buffer.from(b.state.creds.noiseKey.public).equals(Buffer.from(a.state.creds.noiseKey.public)));
  await b.state.keys.set({ session: { 'x@s': null } });
  ok('borrar una llave la quita', !(await b.state.keys.get('session', ['x@s']))['x@s']);
}

console.log('\n3 · Apagar y volver a prender');
const PS = 8900 + Math.floor(Math.random() * 300), PC = PS + 400;
const sala = spawn(process.execPath, [path.join(RAIZ, '../sala/servidor/local.mjs'), String(PS)], { env: { ...process.env, LLAVES: 'carlos:LLAVE-PRUEBA' }, stdio: 'ignore' });
const procesos = [sala];
const fin = (code) => { for(const p of procesos) try{ p.kill('SIGKILL'); }catch{} process.exit(code); };
await dormir(1200);
const prender = async (clave = 'clave-larga-de-prueba') => {
  const env = { ...process.env, SECRE_FALSO: '1', SECRE_NUBE: 'si', SECRE_SALA_URL: `http://127.0.0.1:${PS}`, SECRE_SALA_LLAVE: 'LLAVE-PRUEBA', SECRE_CLAVE: clave, SECRE_PUERTO: String(PC), SECRE_CUENTAS: 'principal:5214420000000' };
  const p = spawn(process.execPath, [path.join(RAIZ, 'correr.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let salida = ''; p.stdout.on('data', d => salida += d); p.stderr.on('data', d => salida += d);
  procesos.push(p);
  for(let i = 0; i < 80 && !/conectada/.test(salida); i++) await dormir(100);
  const r = await fetch(`http://127.0.0.1:${PC}/api/entrar`, { method: 'POST', body: JSON.stringify({ clave }) });
  const galleta = (r.headers.get('set-cookie') || '').split(';')[0];
  const api = async (ruta, cuerpo) => (await fetch(`http://127.0.0.1:${PC}/api/${ruta}`, { method: cuerpo ? 'POST' : 'GET', headers: { cookie: galleta }, body: cuerpo ? JSON.stringify(cuerpo) : undefined })).json();
  return { p, api, salida: () => salida };
};
const apagar = (x) => new Promise(r => { x.p.on('exit', r); x.p.kill('SIGTERM'); });
try{
  let s = await prender();
  await s.api('principal/accion', { accion: 'dato', texto: 'el viernes hay examen de mate a las 8' });
  await s.api('principal/llega', { chat: '5214421111111@s.whatsapp.net', de: '5214421111111@s.whatsapp.net', nombre: 'Ana', texto: 'hola' });
  await dormir(300);
  await apagar(s);
  const enSala = await (await fetch(`http://127.0.0.1:${PS}/api/sala/GRUPAZ/secre?k=principal`, { headers: { 'X-Llave': 'LLAVE-PRUEBA' } })).json();
  ok('al apagarse, subió lo último a La Sala', !!enSala.datos, enSala);
  ok('y en La Sala va cifrado: ni «examen» ni «Ana» en claro', enSala.datos && !/examen|Ana/.test(enSala.datos));

  s = await prender();
  const e = await s.api('principal');
  ok('al volver a prender se acuerda de lo que le contaste', (e.config.datos || []).some(d => /examen de mate/.test(d.texto)), e.config.datos);
  ok('y de quién le había escrito', e.chats.some(c => c.nombre === 'Ana'), e.chats.map(c => c.nombre));
  await apagar(s);

  s = await prender('otra-clave-distinta');
  const e2 = await s.api('principal');
  ok('con otra SECRE_CLAVE no truena: arranca de cero y lo dice', /no se pudo abrir/.test(e2.conexion.aviso || ''), e2.conexion);
  await apagar(s);
}catch(e){ ok('la prueba corrió completa', false, e.message); }

console.log(fallas.length ? `\n✗ ${pasan} pasan · ${fallas.length} fallan` : `\n✓ ${pasan}/${pasan}`);
fin(fallas.length ? 1 : 0);
