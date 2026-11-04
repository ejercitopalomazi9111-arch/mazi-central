#!/usr/bin/env node
/* SECRE · el conmutador de llamadas, sin Twilio de verdad: cada paso de la llamada como lo mandaría
   Twilio, y lo que contesta. Lo que pidió Carlos el 4 de noviembre, en orden.  node secre/pruebas-conmutador.mjs */
import { conmutador, firmaTwilio, firmaValida, ALBURES } from './conmutador.mjs';
let pasan = 0, fallan = 0; const ok = (q, si, x) => { si ? pasan++ : fallan++; console.log(si ? '  ✓' : '  ✗', q, si || x === undefined ? '' : '· ' + String(x).slice(0, 300)); };
const avisos = [], llamadas = [], cambios = [];
const secre = { config: { nombre: 'Carlos' }, estado: { propuestas: [{ n: 4, nombre: 'Ana', tipo: 'respuesta', motivo: 'saber si va el sábado', dijo: '¿vas?' }] },
  async avisar(t){ avisos.push(t); }, ordenes: [], async orden(t){ this.ordenes.push(t); this.estado.propuestas = []; } };
const ia = { async llamada({ dijo }){ return /estimado cliente|tarjeta/i.test(dijo) ? { spam: true } : { spam: false, nombre: 'Carlos', motivo: 'la página web' }; },
  async decision({ dijo }){ return /pásamelo|contesto yo/i.test(dijo) ? { pasar: true } : { pasar: false, decir: 'que ahorita no puede y te escribe por WhatsApp' }; } };
let contesta = true;
const twilio = { async llamar(x){ llamadas.push(x); return contesta ? 'CA-carlos' : ''; }, async cambiar(sid, twiml){ cambios.push({ sid, twiml }); } };
const C = conmutador({ ia, twilio, secre, base: 'https://secre.test', carlos: '5214420000000', desde: '+15550001111', azar: () => 0 });

let x = await C.atender('/voz/entra', { CallSid: 'CA1', From: '+524421234567' });
ok('contesta preguntando quién habla y para qué, y escucha', /¿Con quién tengo el gusto y para qué le llamas\?/.test(x) && /<Gather input="speech" language="es-MX"/.test(x) && /action="https:\/\/secre\.test\/voz\/quien"/.test(x), x);
x = await C.atender('/voz/quien', { CallSid: 'CA1', SpeechResult: 'Hola, soy Carlos, llamo para ver lo de la página web' });
ok('le dice que va a preguntar si está Eduardo, con su nombre y su motivo', /Ok, Carlos\. Déjame preguntar si está disponible Carlos Eduardo para lo de la página web/.test(x), x);
ok('y lo pone en espera', /<Enqueue waitUrl="https:\/\/secre\.test\/voz\/espera"[^>]*>c-CA1<\/Enqueue>/.test(x), x);
ok('le marca a Carlos, con aviso si no contesta', llamadas[0] && llamadas[0].a === '5214420000000' && /\/voz\/carlos\?c=CA1/.test(llamadas[0].url) && /carlos-estado/.test(llamadas[0].estado));
x = await C.atender('/voz/carlos', { CallSid: 'CA-carlos' }, { c: 'CA1' });
ok('a Carlos: «te está llamando Carlos por la página web, ¿contestas tú o le digo algo?»', /te está llamando Carlos por la página web\. ¿Quieres contestar tú o le digo algo yo\?/.test(x), x);
x = await C.atender('/voz/decide', { CallSid: 'CA-carlos', SpeechResult: 'dile que no estoy, que le escribo' }, { c: 'CA1' });
ok('si dice qué decirle, regresa a la llamada con el recado y cuelga', cambios[0] && cambios[0].sid === 'CA1' && /se encuentra ocupado en este momento, pero me comentó que te dijera: que ahorita no puede/.test(cambios[0].twiml) && /<Hangup\/>/.test(cambios[0].twiml), cambios[0] && cambios[0].twiml);
ok('a Carlos le confirma y cuelga, y le deja el recado por WhatsApp', /Listo, se lo digo/.test(x) && avisos.some(a => /Le dije: «que ahorita no puede/.test(a)));
await C.atender('/voz/entra', { CallSid: 'CA2', From: '+524429998877' });
await C.atender('/voz/quien', { CallSid: 'CA2', SpeechResult: 'Soy Ana, es por el pastel' });
x = await C.atender('/voz/decide', { CallSid: 'CA-carlos', SpeechResult: 'pásamelo' }, { c: 'CA2' });
ok('si dice «pásamelo», lo conecta con quien está esperando', /<Dial><Queue>c-CA2<\/Queue><\/Dial>/.test(x), x);
x = await C.atender('/voz/entra', { CallSid: 'CA3', From: '+525500000000' });
x = await C.atender('/voz/quien', { CallSid: 'CA3', SpeechResult: 'Estimado cliente, le hablamos de su tarjeta de crédito' });
ok('al spam: albur', x.includes(ALBURES[0].replace(/'/g, '&apos;')), x);
ok('y que si es real mande WhatsApp, y cuelga', /si esta llamada es real.*manda un WhatsApp al 442 883 3786/.test(x) && /<Hangup\/>$/.test(x.replace('</Response>', '')), x);
ok('a Carlos le avisa que fue spam', avisos.some(a => /📵 Te marcó spam/.test(a)));
await C.atender('/voz/entra', { CallSid: 'CA4', From: '+524421112233' });
await C.atender('/voz/quien', { CallSid: 'CA4', SpeechResult: 'Soy Beto del taller' });
await C.atender('/voz/carlos-estado', { CallStatus: 'no-answer' }, { c: 'CA4' });
ok('si Carlos no contesta, a quien llamó le dice que le contesta por mensaje', cambios.some(c => c.sid === 'CA4' && /no está disponible ahorita/.test(c.twiml)) && avisos.some(a => /no contestaste/.test(a)));
contesta = false;
await C.atender('/voz/entra', { CallSid: 'CA5', From: '+524421112244' });
x = await C.atender('/voz/quien', { CallSid: 'CA5', SpeechResult: 'Soy Lupe' });
ok('si no le pudo marcar a Carlos, no deja a nadie colgado en espera', !/<Enqueue/.test(x) && /te contesta por mensaje/.test(x), x);
x = await C.atender('/voz/entra', { CallSid: 'CA6', From: '+15550001111' });
ok('la llamada a Carlos que regresa por el desvío no se contesta (no se encicla)', x.includes('<Hangup/>') && !/Gather/.test(x));
x = await C.atender('/voz/pendientes', { CallSid: 'CA7' });
ok('cuando algo importante espera su decisión, le marca y le dice cuáles son', /Tenemos una situación\. 1: Ana quiere saber si va el sábado\. ¿Qué le digo a cada uno\?/.test(x), x);
x = await C.atender('/voz/pendientes-dice', { CallSid: 'CA7', SpeechResult: 'a Ana dile que sí voy' });
ok('lo que él contesta se hace como si lo escribiera', secre.ordenes[0] === 'a Ana dile que sí voy' && /ya contesté una/.test(x), x);
const p = { CallSid: 'CA1', From: '+52', SpeechResult: 'hola' }, u = 'https://secre.test/voz/quien';
ok('la firma de Twilio se comprueba (y una falsa no pasa)', firmaValida('tok', u, p, firmaTwilio('tok', u, p)) && !firmaValida('tok', u, p, 'falsa') && !firmaValida('', u, p, firmaTwilio('tok', u, p)));
console.log(fallan ? `\n✗ ${fallan} fallaron` : `\n✓ ${pasan}/${pasan}`); process.exit(fallan ? 1 : 0);
