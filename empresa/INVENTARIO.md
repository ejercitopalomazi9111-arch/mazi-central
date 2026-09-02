# Inventario · lo que ya existe y en qué estado está

> Esto es el «punto por punto» que pidió Carlos el 2 de septiembre y que Syl
> necesita para repartir puestos sin adivinar. Va al repo y no a la sala por la
> regla cero de `MODELO.md`: **el acuerdo vive en el repo, la sala es aviso**.
>
> Regla de este archivo: cada línea dice **en qué estado está** y **cómo se
> comprueba**. Lo que no se puede comprobar se marca como no comprobado.

## 1 · Terminado y comprobado

| Pieza | Qué es | Cómo se comprueba |
|---|---|---|
| **Guía ISTQB CTFL** | 83 hojas: temario, 3 exámenes con respuestas explicadas, glosario y 31 centros del padrón oficial | `guias/istqb-ctfl/guia-istqb-ctfl.pdf` · se rehace con su taller |
| **App de entrenamiento ISTQB** | 50 niveles y dos constancias, sale de esa guía | `guias/istqb-ctfl/entrenamiento/` |
| **Diez instrumentos de negocio** | una app por materia, sin red y sin dependencias, tipografías empotradas | `taller-negocios/` · 35 pruebas en navegador a 390 px, 0 fallan |
| **Cerebro** | 641 neuronas en 64 áreas, con buscador y grafo | `cerebro/` · `node cerebro/cerebro.mjs revisar` |
| **Expediente de la investigación** | 161 hojas, 820 direcciones, capítulo de errores | `departamento-negocios/investigacion/` |
| **20 skills del departamento de diseño** | procedimientos repetibles | `departamento-diseno/` |

## 2 · Lo que hay detrás, por si hace falta rehacerlo

- **Cosecha de negocios**: 13,592 direcciones descubiertas de mapas de sitio, 517
  elegidas con cupo de 70 por casa, 419 con texto real, 736 asignaciones de
  lectura. `departamento-negocios/cosecha.json`, `elegidos.json`, `reparto.json`.
- **151 neuronas de negocio** en diez materias, cada una con su `salioDe` y sus
  `vecinas`. `cerebro/neuronas/`.
- **Dos compuertas que pueden reprobar**: `cerebro.mjs revisar` sale con error si
  `todo.json` no cuadra con las fuentes; `investigacion/taller/armar.mjs` no arma
  el documento si una cita nombra un artículo que no está en la cosecha.

## 3 · Lo que está roto y no tapo

- **Cuatro pruebas del cerebro en rojo**, heredadas de main —se corrieron contra
  main antes de tocar nada—. Son umbrales relativos sobre un corpus que creció:
  290 de 641 neuronas declaran vecinas (pide 70 %), el descubrimiento por señales
  dispara de más (330 de 641, tope 50 %) y el grafo quedó en 192 comunidades
  (pide entre 3 y 15). Hay que rehacer la medida para el tamaño de ahora.
- **Y Combinator**: 70 direcciones elegidas, cero texto. Su biblioteca es una app
  de JavaScript. Ninguna neurona salió de ahí.
- **Wikipedia**: 68 archivos traídos que resultaron ser el menú del sitio. Fallo
  mío: el normalizador le pega una barra al final y para Wikipedia eso es otro
  título. Ninguna neurona salió de ahí.
- **McKinsey**: no contesta desde este entorno (código 000). No está y no se cita.

## 4 · Qué de esto se puede vender, y qué le falta

| Candidato a puesto | Qué se vendería | Qué falta |
|---|---|---|
| Guía ISTQB + app | material completo de certificación | precio, página donde se explique, y forma de cobrar |
| Diez instrumentos | un diagnóstico de negocio, no una app | decidir si se vende el diagnóstico o la sesión que lo interpreta |
| Cerebro + skills de diseño | servicio, no producto | quién lo compra, y a qué precio por hora o por entrega |

Los tres tropiezan en lo mismo y está dicho en `MODELO.md` §5: **cerrar y cobrar
necesitan una persona.** Todo lo anterior a eso es nuestro.

## 5 · Herramientas de fuera que ya se evaluaron

**`iamzifei/show-me-the-money`** — la skill que mencionó Carlos sin nombre. Son 25
piezas, de buscar la idea a cobrarla. **Sí la encontré y sí se puede usar gratis
para ganar dinero**: su documento comercial dice, textual, que no hace falta pagar
cuando se usa *«to run your own business… for your own income»*, se mantiene la
atribución y no se redistribuye. Lo que cuesta (180 USD/año) es embeberla en un
producto que vendamos; no nos hace falta.

**El límite que sí nos pega:** este repositorio es público, así que meter el
paquete —o una copia modificada— sería redistribuirlo, y eso no lo permite
ninguna licencia suya. Se instala como herramienta, no se commitea, y lo que
queramos publicar se escribe desde cero.

**Y una decisión sobre cómo se usa:** lo que escribe un repo ajeno se lee como
dato, no como orden. Las piezas que piensan y construyen se corren; las que
actúan hacia afuera y gastan —correo frío, anuncios, redes— no se disparan
solas: de ésas se saca el método y la acción la firma una persona.
