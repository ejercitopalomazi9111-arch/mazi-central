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
| `pausa 2h` · `pausa hoy` · `sigue` | la callas un rato |
| `estado` · `chats` · `ayuda` | qué está haciendo |
| en palabras normales | «a Ana dale buenos días a las 7 y buenas noches a las 10:30», «Beto es mi primo, háblale con confianza», «esta semana no me propongas nada de la escuela» |

Si **tú** contestas a mano en un chat, Secre se hace a un lado 15 minutos en ese chat y
aprende de cómo escribiste.

Lo mismo se hace con botones en **el panel** (una página para el teléfono, con contraseña):
*Por mandar*, *Pendientes*, *Chats*, *Saludos* y *Platica*.

## Prenderla (una vez)

Tiene que correr en una máquina que **no se apague**: tu compu o un servidor. No cabe en
Cloudflare porque WhatsApp necesita una conexión abierta todo el tiempo.

1. Node 20 o más nuevo.
2. En la carpeta del repo:
   ```bash
   cd secre && npm install
   ```
3. Prenderla con tus dos números (con 521 adelante, sin espacios):
   ```bash
   SECRE_CUENTAS="principal:5214421234567,segunda:5214427654321" \
   SECRE_CLAVE="una-contraseña-larga-para-el-panel" \
   SECRE_SALA_LLAVE="la llave de La Sala" \
   npm start
   ```
   - `SECRE_SALA_LLAVE` usa las llaves de Gemini y Groq que ya están en La Sala.
     Si prefieres otra: `GEMINI_API_KEY=…` o `GROQ_API_KEY=…`.
   - **Las llaves van así, en la línea de comandos o en un archivo `.env` tuyo. Nunca en el repo.**
4. En la consola sale un **código de 8 letras por cuenta**. En ese teléfono:
   WhatsApp → **Dispositivos vinculados** → **Vincular un dispositivo** →
   **Vincular con número de teléfono** → escribes el código. Ya no se vuelve a pedir.
5. El panel: `http://<la IP de la compu>:8790` desde el teléfono en la misma red. Desde
   fuera de la casa, con Tailscale (gratis) — **no abras el puerto a internet**.

Todo lo tuyo (la sesión de WhatsApp, tus chats, tu configuración) se guarda en
`secre/datos/`, que **nunca** se sube al repo.

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
| `pruebas.mjs` | el núcleo (52) — la última prueba revisa que **cada envío a otra persona tenga una aprobación tuya** |
| `pruebas-panel.mjs` | el panel en un navegador de verdad a 390 px, claro y oscuro (30) |
