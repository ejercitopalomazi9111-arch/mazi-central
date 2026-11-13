# Relevo de Sylcred a Luna · CARYMO · 13 de noviembre (noche)

Carlos: «Publica todo funcionando y pasa batuta a Luna».

**Estado al pasarla:**
- `main` (`5e77226`) está publicado.
- Pruebas verdes: `node sala/pruebas-estudio.mjs` 182/182 y `node sala/servidor/pruebas.mjs` 455/455.

## Lo que Carlos pidió y falta (su último mensaje a Sylcred)

1. **Sonido agudo que se queda pegado.**
   - Qué pasa: tras muchas correctas seguidas, la escalera de `bien` llega arriba y ya no cambia de tono (`ESCALA`/`ESCALERA` en `sala/sonidos/sonidos.js`; el tope es la octava).
   - Lo que quiere: al llegar arriba, que **varíe para arriba y para abajo**, como una melodía, sin repetir dos veces la misma nota y sin regresar al piso.
   - Idea: un paseo por la pentatónica alta {7, 9, 12, 14, 16}. Hoy el timbre ya cambia en cada repetición; lo que falta es el tono.
2. **Ligas con sus trofeos**, como Duolingo.
   - Varias ligas (Bronce, Plata, Oro, Zafiro, Rubí, Esmeralda, Amatista, Perla, Obsidiana, Diamante o las que convengan), cada una con su trofeo dibujado en SVG (nada de emojis ni recortes).
   - Cada semana, los primeros de la liga suben y los últimos bajan.
   - Va en el servidor (`ranking` y `est:sem:*` en `sala/servidor/estudio.js`), en la pantalla de Ranking y en una vitrina de trofeos en el perfil.
3. **Fotos que no son del tema.**
   - Qué pasó: en «Elige la imagen», la de «Corazón» salió una alberca o bodega (`referencias/carymo/error-foto-corazon.jpg`).
   - Es tu sección 10 de `carymo/PLAN-13NOV.md`, y urge: Carlos ya la vio en su teléfono.
   - Mínimo: descartar resultados que no son del tema (páginas de desambiguación, títulos que no coinciden) y, en duda, usar un dibujo de `DIBUJOS`.
4. **Paloma.**
   - Que las **alas vayan detrás del cuerpo**, para que no se encimen con la cara.
   - Que se parezca a la de su hoja («vectoriza la que te di, ésa sí está chida»).
   - Revisa tu paloma mejorada contra las hojas.
5. **Logo.**
   - Carlos confirmó que el nombre es **CARYMO**.
   - El logo con letras que mandó dice «CARIMO» (`referencias/carymo/logo-dice-CARIMO.jpg`): hay que armarlo con «CARYMO», componiendo el emblema de la C con birrete y las letras; no generarlo.
   - El icono CM ya está puesto (`carymo/marca/`).

## Ya hecho por Sylcred en esta vuelta

- El horario de Carlos en su cuenta: «Inglés I» del miércoles 8:00 → **Inglés III** (él confirmó que era error).
- **Tres hojas nuevas de personajes en fondo negro**, para vectorizar o sacar referencias, más las dos blancas: `referencias/carymo/hoja-negra-*.jpg` y `hoja-blanca-*.jpg`. Esta carpeta **no se publica** (no está en `build.mjs`).
- **OpenRouter prendido** como respaldo (secreto `OPENROUTER_API_KEY` en el proyecto `sala`). Carlos pegó la llave en el chat: si quiere, que la rote.

## Reglas que Carlos repitió hoy

- Cero errores en los fondos: nada recortado que se vea roto.
- Las mascotas, por piezas y animadas como Duolingo.
- Sin emojis.
- Todo en español mexicano.

## Lo que hizo Luna con esto (13 nov, noche)

1. ✅ **Sonido:** arriba se pasea por la pentatónica alta sin repetir nota ni bajar al piso (`sala/sonidos/sonidos.js`, `node sala/pruebas-sonidos.mjs`).
2. ⏳ **Ligas con trofeos:** es lo siguiente.
3. ✅ **Fotos del tema:** `pertinente` en `sala/lienzo.js` tira desambiguaciones, títulos que no coinciden y películas, empresas, pueblos… En duda, se queda el dibujo. Además se le pide a la IA el título exacto del artículo. Prueba: `node sala/pruebas-fotos.mjs`.
4. ✅ **Paloma:** cuerpo de campana, panza ancha, ojos juntos y alas DETRÁS del cuerpo (`carymo/zoo.js`).
5. ✅ **Logo:** `carymo/marca/logo-512.webp` y `logo-1024.png` dicen CARYMO. Es su misma imagen con la palabra recompuesta en Montserrat y la estrellita en la O. Va como imagen al compartir links (og:image).
