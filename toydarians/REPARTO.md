# Toydarians · reparto de trabajo entre Godines y Sylcred

**14 de septiembre.** Luis: *«dales su propia web y conecta al claude de
carlos para que los dos trabajen en esos»*.

Esto es la mitad que sí puedo dejar hecha. La otra mitad —hablarnos en vivo por
La Sala— está bloqueada y al final digo exactamente con qué se destraba.

---

## Dónde está el sitio hoy

Tres páginas, 62 piezas, y **ninguna salida a toydarians.com** salvo la
atribución del pie:

| Página | Categoría | Piezas |
|---|---|---|
| `index.html` | Vintage Collection (Hasbro) | 47 |
| `funko.html` | Funko Pop! | 8 |
| `3d-print.html` | Impresión 3D | 7 |

---

## Lo que falta, medido hoy contra la tienda

Esto **no** sale de `activos/categorias.json`, que en varias categorías dice 0
y es falso. Sale de pedirle a la tienda cada categoría el 14 de septiembre y
contar las fichas. Cada renglón se puede volver a comprobar con un `curl`.

| Categoría | `product_cat=` | En la tienda | Aquí |
|---|---|---:|---:|
| Vintage Collection | `vintage-collection` | ~321 (33 páginas) | 47 |
| Black Series | `figuras-black-series`, `packs-…`, `vehiculos-…` | ~30 | 0 |
| Funko | `funko` | 8 | **8** |
| 3D Print | `3d-print` | 7 | **7** |
| GI Joe | `classified-series` | 2 | 0 |
| Mattel | `mattel` | 2 | 0 |
| Super 7 | `reaction`, `ultimates` | 2 | 0 |
| Retro Collection | `retro-collection` | 2 | 0 |
| Disney / Droids Factory | `disney` | 1 | 0 |
| NECA | `neca` | 1 | 0 |
| Merch | `merch` | 0 | 0 |

**Dos trampas que ya me costaron tiempo, para que no las pagues tú:**

1. El parámetro es `?product_cat=`, **no** `?product-category=`. Con el guion
   la tienda devuelve **200 y la portada**, así que una categoría inexistente
   parece tener 8 productos… que son de otra. Me pasó con Funko.
2. **La categoría padre no lista los productos de sus hijas.**
   `?product_cat=black-series` devuelve cero y sus 30 figuras están en
   `figuras-black-series`. Si cuentas por el padre, concluyes que está vacía.

Y la paginación: 10 por página, `&paged=2`, `&paged=3`…

---

## El reparto, para no chocar

La división es por **tamaño**, no por gusto: una de las dos partes es el 85 %
del catálogo y no tiene sentido que la hagamos los dos.

**Sylcred (Claude de Carlos) — la cola larga, 8 categorías, ~40 piezas.**
Black Series, GI Joe, Mattel, Super 7, Retro Collection, Disney, NECA, Merch.
Son pocas piezas pero muchas categorías distintas: cada una es una página
nueva y cada una tiene su propia forma de nombre que hay que partir bien.

**Godines (Claude de Luis) — Vintage Collection, ~274 piezas que faltan.**
Es una sola categoría, 33 páginas y ~1 400 fotos que bajar, convertir y
comprobar. Es trabajo de volumen y de no romper lo que ya funciona: las 47 que
hay ya están en producción.

**Merch queda para el final de quien acabe antes.** Hoy tiene cero productos
en la tienda; puede que el cliente lo llene.

### Por qué no chocamos aunque empujemos el mismo día

Lo dejé preparado, no es un acuerdo de palabra:

- **Un archivo de datos por categoría.** `taller/activos/cat-<slug>.json`.
  Añadir NECA es **crear un archivo que no existía**. Antes era un `extra.json`
  compartido y dos personas añadiendo dos categorías chocaban seguro.
- Lo único compartido de verdad es la lista `PAGINAS` de `taller/armar.py`:
  **una entrada por categoría, seguidas**. Un conflicto ahí se resuelve
  quedándose con las dos entradas.
- Las fotos van con prefijo por categoría (`fk3-0.webp`, `3d1-2.webp`), así
  que tampoco se pisan en `fotos/`.

---

## Cómo se añade una categoría (la receta entera)

Todo está en `taller/raspador/`. Son cuatro pasos y ninguno adivina nada:

```bash
cd toydarians/taller/raspador
python3 raspar.py <slug>      # trae nombre, precio, stock y galería → crudo.json
python3 fotos.py              # baja las fotos, las cuadra a 680×680 WebP
python3 recortar.py           # SOLO si vienen sobre blanco: les quita el fondo
python3 limpiar.py            # parte el nombre largo → activos/cat-<slug>.json
```

Después, en `taller/armar.py`, una entrada en `PAGINAS` y otra en `COPIA` con
el texto de la portada. Y entonces:

```bash
python3 taller/armar.py
node taller/revisar.mjs ../<slug>.html      # tiene que decir «limpio»
python3 taller/empaquetar.py                # rehace el ZIP del cliente
```

**Tres cosas que la receta no hace por ti, y son las que importan:**

- **La galería sale de `data-thumb`**, no de recortar el HTML entre
  `woocommerce-product-gallery` y el primer `</figure>`. Esa cadena aparece
  antes en un `<noscript>` del `<head>`, así que el recorte se traga la
  cabecera y el carrusel de «productos relacionados»: los 15 productos salieron
  con el logo de la tienda y fotos **de otros productos**. Parecía bien —seis
  fotos cada uno— y era falso.
- **El expediente de la ficha es por página.** Tiene `Escala`, `Estado`,
  `Formato`… y estuvo escrito a mano con los datos de Vintage Collection: al
  abrir un trono impreso en 3D decía «Escala 3.75″» y «En su cartón original,
  sin abrir», las dos falsas y con autoridad de ficha técnica. Escribe las de
  tu categoría o no pongas ninguna.
- **Lo que la tienda no dice, no se dice.** «No incluye figura» lo dicen tres
  de las siete impresiones 3D, no las siete: va pieza por pieza, en `nota`.
  Y si una categoría no publica precio, la ficha dice «Precio a consultar» y
  no deja agregar al carrito — no se inventa un importe para que el botón
  quede bonito.

---

## Lo que está bloqueado, y con qué se destraba

**No puedo hablar con Sylcred en vivo desde esta sesión.** Medido, no supuesto:

- `env` no trae `MAZI_LLAVE` — ninguna variable con «MAZI» en el nombre.
- La Sala **sí** responde: `GET /api/salud` → `{"bien":true}`, HTTP 200. No es
  la red ni la lista blanca.
- Sus rutas son `/api/sala/<CÓDIGO>/…` con cabecera `x-llave`, y no tengo ni el
  código ni la llave.
- `ListAgents` no ve ninguna sesión alcanzable.

**Lo que lo destraba, en un renglón:** `MAZI_LLAVE` y el código de sala en el
entorno de la sesión —o pegados en el chat—, y entro como `claude-de-luis`.

Mientras tanto este archivo es el canal: Sylcred trabaja en este repo y lo lee.
Si tomas una categoría, **escríbelo aquí abajo antes de empezar**, que es lo
que evita que la hagamos dos veces.

## Quién tiene qué, ahora mismo

| Categoría | Quién | Estado |
|---|---|---|
| Vintage Collection (las 274 que faltan) | Godines | sin empezar |
| Black Series, GI Joe, Mattel, Super 7, Retro, Disney, NECA | Sylcred | sin asignar en persona |
| Merch | — | la tienda no tiene productos |
