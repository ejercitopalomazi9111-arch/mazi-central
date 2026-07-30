# Elevación visual y pulido final

Los dos pases que separan "ya quedó" de "esto se ve caro".

---

## EL UPGRADE DE DISEÑO
**Cuándo:** el sitio ya funciona pero se siente plano. Este es el pase de "criterio de senior".

```
Revisa el diseño actual y aplica criterio de diseñador senior:
- mejora la jerarquía tipográfica
- aumenta el contraste donde sea necesario
- agrega micro-animaciones sutiles en los elementos interactivos
- asegúrate de que el espaciado entre secciones sea consistente

El resultado debe verse como un sitio de una agencia de diseño de [Nueva York / Londres /
Berlín].
```

**Nombrar una ciudad no es capricho:** le da al modelo una referencia estética evaluable en vez
de "hazlo bonito". Nueva York tiende a lo tipográfico y denso; Berlín a lo brutalista y
monocromo; Londres a lo editorial.

---

## EL PULIDO FINAL · MÓVIL Y VELOCIDAD
**Cuándo:** antes de entregar. Siempre. Sin excepción.

```
Revisa todo el sitio en versión mobile. Asegúrate de que:
- el texto sea legible sin zoom
- los botones tengan mínimo 44px de altura
- las imágenes no se desborden
- el menú funcione como hamburguesa
- el espaciado vertical entre secciones sea de mínimo 64px en mobile

Luego optimiza la velocidad:
- lazy load en imágenes
- animaciones desactivadas si el usuario prefiere movimiento reducido (prefers-reduced-motion)
```

**Los 44px no son inventados:** es el tamaño mínimo de objetivo táctil que recomiendan las guías
de interfaz de Apple. Es el número que evita que la gente falle el botón con el pulgar.

---

## Extensiones propias

Estos no venían en las librerías originales; los agrego porque el pulido se queda corto sin
ellos.

### SEO mínimo decente

```
Revisa el SEO técnico del sitio:
- un solo <h1> por página, y que diga de qué va la página
- jerarquía de encabezados sin saltos (h1 → h2 → h3)
- <title> único y descriptivo, máximo 60 caracteres
- meta description de 150-160 caracteres que invite al clic
- alt real en cada imagen (describiendo la imagen, no repitiendo palabras clave)
- Open Graph para que se vea bien al compartir en WhatsApp y redes
- URLs legibles, sin parámetros ni ids
```

### Accesibilidad que sí se nota

```
Revisa accesibilidad:
- contraste mínimo 4.5:1 en texto normal, 3:1 en texto grande
- todo lo interactivo alcanzable con teclado, en orden lógico
- foco visible — nunca outline: none sin reemplazo
- que nada dependa SOLO del color para comunicar (errores, estados)
- etiquetas reales en los formularios, no placeholders haciendo de label
- respeta prefers-reduced-motion en todas las animaciones
```

### Rendimiento real

```
Optimiza carga:
- imágenes en formato moderno y del tamaño en que se muestran
- lazy load en todo lo que esté bajo el pliegue
- fuentes con font-display: swap, y sólo los pesos que de verdad se usan
- nada de librerías completas para usar una función
- que la primera pantalla no dependa de JavaScript para verse
```

**El último punto es el que más se ignora y el que más importa** en teléfonos con señal mala —
que es donde vive buena parte del mercado de Grupo Mazi.
