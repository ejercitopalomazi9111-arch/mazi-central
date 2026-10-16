# Secre · tu secretaria de WhatsApp

Lee lo que te escriben en tus dos cuentas, **te deja la respuesta lista** con tu forma de
escribir, anota tus pendientes y te prepara los buenos días y las buenas noches a la hora
que digas. **No le manda nada a nadie sin que tú lo apruebes.**

## Cómo se usa (desde el teléfono)

En tu chat **«Mensaje a ti mismo»** te llega esto:

```
🤖 #3 · Ana: «¿siempre sí vienes mañana?»
Propuesta: «sí voy, nomás confirmo la hora y te digo»
→ «3» la manda · «3 tu texto» manda el tuyo · «x3» la tira
```

| Escribes | Pasa |
|---|---|
| `3` | manda la propuesta #3 tal cual |
| `3 sí, a las 5` | manda TU texto |
| `x3` | la tira |
| `pendientes` · `hecho 2` · `anota comprar pilas` | tus pendientes |
| `turno de Paulina` · `que conteste Negro` · `turnos` | quién de las tres está de guardia (Secre, Paulina, Negro se rotan cada 8 h y se recorren cada día) |
| `dato: el viernes hay examen de mate a las 8, temas: derivadas` · `datos` · `olvida 2` | lo que Secre sabe y usa al escribirte las respuestas |
| `pausa 2h` · `pausa hoy` · `sigue` | la callas un rato |
| `estado` · `chats` · `ayuda` | qué está haciendo |
| en palabras normales | «a Ana dale buenos días a las 7 y buenas noches a las 10:30», «Beto es mi primo, háblale con confianza», «esta semana no me propongas nada de la escuela» |

Si **tú** contestas a mano en un chat, Secre se hace a un lado 15 minutos en ese chat y
aprende de cómo escribiste.

Lo mismo se hace con botones en **el panel** (una página para el teléfono, con contraseña):
*Por mandar*, *Pendientes*, *Chats*, *Saludos* y *Platica*.

## Prenderla gratis, sin compu (Render)

Desde el iPhone: **Central → Secre** y sigue los pasos. En corto:

1. **Crear en Render** (botón de la página): entras con GitHub. Render lee `render.yaml`
   (en la raíz del repo) y arma el servicio gratis.
2. Te pide tres datos, que te pasa Sylcred por el chat (no van al repo):
   - `SECRE_CUENTAS` — tus cuentas, por ejemplo `negocio:524421234567,personal:17861234567`
   - `SECRE_CLAVE` — la contraseña del panel. **También es la llave del candado de lo
     guardado: si la cambias, Secre arranca de cero y hay que vincular otra vez.**
   - `SECRE_SALA_LLAVE` — la llave de La Sala (la IA y el cajón donde guarda todo).
3. Cuando diga **Live**, pegas su link en la página de la Central y abres el panel.
4. En el panel sale un **código de 8 letras por cuenta**: WhatsApp → Dispositivos
   vinculados → Vincular un dispositivo → Vincular con número de teléfono.
   - Abajo del código dice **para qué número es**. Cada código sirve unos minutos; si
     cambia en el panel, usa el nuevo. **«Pedir otro código»** saca uno al momento.
   - En México WhatsApp puede tener tu cuenta como `52…` o como `521…`. Si con uno sale
     «No se pudo vincular», toca **«¿No te deja? Probar como…»** y usa el código nuevo.
     Se queda guardado el que funcione.

**Por qué así y no de paga:** Render gratis da 750 horas al mes (alcanza para el mes
entero) pero se duerme a los 15 minutos sin visitas y **borra su disco al reiniciar**.
Secre se visita sola cada 10 minutos (`RENDER_EXTERNAL_URL`) y guarda todo **cifrado**
(AES-256-GCM con `SECRE_CLAVE`) en La Sala (`/api/sala/GRUPAZ/secre`, sólo la cuenta
dueña), así que un reinicio no le hace nada. Railway gratis no alcanza: sólo cargar la
parte de WhatsApp gasta ~110 MB, más que el dólar al mes que regala.

## Prenderla en una compu propia

```bash
cd secre && npm ci
SECRE_CUENTAS="principal:5214421234567,segunda:5214427654321" SECRE_CLAVE="…" SECRE_SALA_LLAVE="…" npm start
```
Con `SECRE_NUBE=no` guarda en `secre/datos/` (nunca entra al repo) en vez de La Sala.

## Lo que hay que saber

- **WhatsApp no permite oficialmente esto.** Secre se conecta como «dispositivo vinculado»
  (igual que WhatsApp Web) con una librería no oficial (Baileys). Hay riesgo de que bloqueen
  el número. Para bajarlo: Secre sólo te escribe a ti, no manda nada solo, no sale «en
  línea» todo el día, y escribe con pausas de persona. Si te preocupa, empieza con la
  cuenta menos importante.
- Si cierras la sesión desde el teléfono (Dispositivos vinculados → cerrar), hay que
  vincular otra vez: borra `secre/datos/<cuenta>/sesion/` y prende de nuevo.
- Una propuesta que no apruebas en 6 horas se tira sola. Un saludo que ya se pasó más de
  una hora (porque Secre estaba apagada) ya no se propone ese día.

## Para quien le mueva

| Archivo | Qué es |
|---|---|
| `nucleo.mjs` | toda la lógica, sin WhatsApp ni IA adentro |
| `whatsapp.mjs` | el adaptador de WhatsApp (Baileys 7.0.0-rc14, fijado). Si mañana conviene otra librería, se cambia sólo éste |
| `ia.mjs` | el adaptador de la IA (La Sala → Gemini → Groq) |
| `correr.mjs` | prende las cuentas, el reloj y el panel |
| `panel.html` | el panel |
| `falso.mjs` | WhatsApp e IA de mentiras: `SECRE_FALSO=1 npm start` prueba todo sin teléfono |
| `pruebas.mjs` | el núcleo (59) — la última prueba revisa que **cada envío a otra persona tenga una aprobación tuya** |
| `pruebas-panel.mjs` | el panel en un navegador de verdad a 390 px, claro y oscuro (38) |
| `pruebas-vincular.mjs` | vincular contra WhatsApp DE VERDAD con un número de ficción (1-555-0100): código a tiempo y código nuevo tras un corte (5) |
| `pruebas-vincular-panel.mjs` | la pantalla del código: número, «Pedir otro código», el formato 52/521 y escribir otro número (14) |
| `nube.mjs` · `pruebas-nube.mjs` | guardar cifrado en La Sala; la prueba apaga y prende Secre y revisa que se acuerde de todo (12) |
