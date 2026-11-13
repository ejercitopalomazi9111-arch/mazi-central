# CARYMO · Learn. Explore. Grow.

> «Todo lo que puedes aprender, en un solo lugar.» Nombre y lema de Carlos (12 nov).
> Nació en La Sala como «Estudio» (app tipo Duolingo/Knowunity) y ahora es una app aparte.

**Dónde se abre:** `https://mazi-central.palomazi9111.workers.dev/carymo/` (y en la Central, la fila
«CARYMO»). Las direcciones viejas `sala/estudio` y `sala/carymo` llevan aquí, y la pestaña «CARYMO» de
La Sala también abre esta app.

## Qué hace

1. **Plan de examen.** Materia (las del 3.1, de `avisos/datos.js`), fecha y temas o fotos de apuntes.
   La IA (Negro; Paulina si hay fotos) arma unidades con temas.
2. **El camino.** Cada unidad abre con un **panorama** general en el pizarrón. Después, por cada tema,
   una **cátedra** en el pizarrón (corta y personalizada: sabe qué examen preparas, qué ya estudiaste
   y qué te costó) y luego su **nivel**. La unidad cierra con **tarjetas**. Al final van el
   **simulacro** y el **examen**.
3. **El nivel.**
   - **La lección:** una idea por pantalla, con su dibujo que se traza solo.
   - **Los ejercicios, de 8 tipos:**
     - opción múltiple;
     - completar el hueco;
     - **escribir** (con tolerancia a errores de dedo);
     - **conectar ideas**;
     - **elegir la imagen** (foto de Wikipedia o dibujo);
     - **encontrar el error** en un diagrama;
     - **armar el diagrama** de flujo;
     - **clasificar**.
   - La que fallas regresa al final.
   - El **combo** sale en cada acierto seguido, con sonido, chispas y onda, y crece y se pone dorado.
4. **Pizarrón** (pestaña): Explica libre, el mismo de La Sala.
5. Grado de 6 a 10, XP, racha con racha congelada, **ranking de la semana** entre cuentas, horario
   pegado de Excel y perfil con sonidos y vibración.

6. **Academia Grupo Mazi** (botón en «Tus planes» y en la pantalla vacía). Tres cursos para
   vendedores —*Conoce Grupo Mazi*, *Lo que vendemos y cuánto cuesta* y *Cómo vender con Grupo
   Mazi*— con lecciones y 55 preguntas ya escritas (no gastan IA), cátedras en el pizarrón que sólo
   usan la hoja oficial (`HECHOS`), y la Guía del vendedor y la presentación para descargar. La
   Chuleta de Carlos NO va: es para él. **El porcentaje de comisión no está escrito**: el curso
   dice que lo confirma Carlos.
7. **Si una IA se cae, contesta otra** (de otra compañía): Negro ↔ Paulina, luego la nube de
   Cloudflare (sin llave) y, si Carlos pega sus llaves en `/llaves-ia`, OpenRouter, Cerebras y
   Mistral. Ver `sala/servidor/respaldos.js`.
8. **Sonidos con variación**: cada vez suenan un poco distinto, los aciertos seguidos suben de
   nota y todo pasa por una sala suave (`sala/sonidos/sonidos.js`).

## Cómo está armado

| Archivo | Qué es |
|---|---|
| `carymo/index.html` | La página y TODO su diseño (CSS): colores vino, morado oscuro y morado claro |
| `carymo/carymo.js` | Toda la lógica: plan, camino, lección, los 8 ejercicios (`EJ`), combo (`comboVFX`), tarjetas, ranking, horario, perfil |
| `carymo/academia.js` | La Academia: hoja oficial (`HECHOS`), material (`MATERIAL`) y los 3 cursos (`CURSOS`). Cambia un precio aquí y cambia en los cursos y en las cátedras |
| `carymo/iconos.js` | Los íconos de los botones (Lucide) |
| `sala/servidor/estudio.js` | **Servidor** (dentro de La Sala): planes, XP, racha y ranking. Ruta `/api/sala/GRUPAZ/estudio` |
| `sala/explica.html` + `explica.js` | El pizarrón (Explica): lo usan CARYMO y La Sala |
| `sala/lienzo.js` | El motor del pizarrón: muchos cursores, 33 tipos de elemento, cámara infinita |
| `sala/json-ia.js` | Repara el JSON que manda la IA (comas de más, comentarios, respuestas cortadas) |
| `sala/sonidos/` | Los 12 sonidos (`hacer.py` los genera; son nuestros) y `sonidos.js` para usarlos |
| `sala/iconos-clase.js` | Los 231 dibujos que la IA puede pedir |

**Lo que se le pide a la IA:**
- `sistemaPlan()` y `sistemaLeccion()` en `carymo/carymo.js`;
- `sistema()` en `sala/explica.js`.

Todo lo que contesta pasa por `normalizarPlan` / `normalizarLeccion` / `normalizarPizarra`: un ejercicio
roto se tira y nunca truena la app.

## Pruebas

```bash
node sala/pruebas-estudio.mjs
```

```bash
node sala/pruebas-explica.mjs
```

```bash
node sala/servidor/pruebas.mjs
```

- `pruebas-estudio.mjs` es CARYMO completo: servidor y pantalla, con una IA de mentiras que a veces
  contesta mal a propósito. Con `FOTOS=carpeta` saca capturas de cada ejercicio.
- `pruebas-explica.mjs` es el pizarrón: los 33 tipos de elemento, cursores, apuntes y «lo dicho».
- `servidor/pruebas.mjs` son las 451 de La Sala.

## Cómo seguirle

- **Un ejercicio nuevo:**
  1. Una pieza más en `EJ` (`pintar`, `tocar`, `listo`, `revisar`, `marcar`).
  2. Su forma en `sistemaLeccion()`.
  3. Su revisión en `normalizarLeccion`.
  4. Su tarjeta en `tarjetasDe`.
  5. Su caso en `contestar()` de la prueba.
- **Un elemento nuevo del pizarrón:**
  1. Una entrada más en `ELEMENTOS` de `sala/lienzo.js`.
  2. Su forma en `CATALOGO` de `sala/explica.js`.
  3. Su revisión en `normalizarPizarra`.
- **Pendiente que se ve venir:**
  - que la app se instale en la pantalla de inicio (falta el ícono, que lo decide Carlos);
  - que el pizarrón arranque solo sin tocar «Explícame» (el iPhone pide un toque para hablar).
