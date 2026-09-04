# Póster Xbox · pieza de concepto

**Ejercicio de diseño. No es publicidad oficial de Xbox ni de Microsoft, no
está autorizado por el titular de la marca, y eso va escrito en la propia
lámina —a 3.6 mm, legible— y no escondido en un pie de 2 pt.** Se hizo así
desde el primer minuto: una pieza de concepto que no lo diga es una
falsificación con buenas intenciones.

Lo pidió Luis: «un póster promocional para Xbox, da tu mejor trabajo con
todos los recursos a tu alcance». Eligió, sabiendo lo de arriba, que fuera de
la marca Xbox y no de un producto nuestro.

---

## La idea, que es una sola

**La X es una puerta.** El plano es negro y la única luz de la lámina entra
por el hueco. No hay una X pintada de verde encima del fondo: hay un hueco
con forma de X, y por eso tiene profundidad. Del hueco cae un haz que llega
hasta el titular, y eso es lo que ata la mitad de arriba con la de abajo.

De ahí sale todo lo demás:

- **El verde aparece UNA vez a saturación completa** —dentro de la abertura—
  y el resto de la lámina es neutro. Es lo que hace que un color de marca se
  sienta caro en vez de decorativo. Repartirlo por toda la hoja lo abarata.
- **El titular va abajo.** La mitad de arriba es la puerta; meterle texto
  encima sería taparle la idea a la lámina.
- **La retícula se ve.** No es adorno: es la pieza enseñando de qué está
  hecha, tan tenue que se siente antes de leerse.

## Cómo está hecho

Todo en código, sin una imagen generada. **El logo no lo dibuja un modelo de
imagen** —regla de la casa en `marca/PLACA.md`— y además se nota: la marca es
geometría, un anillo y dos aspas recortadas por el círculo interior.

```
node render.mjs 3     # PDF de imprenta + PNG a 288 dpi + PNG de pantalla
node medir.mjs        # la compuerta: contraste, área segura, cuerpo mínimo
node detalle.mjs      # recortes 1:1 para mirar la letra chica
```

### Medidas, pensadas en milímetros y no en píxeles

Un cartel se piensa en el tamaño en que se imprime. Diseñar en píxeles y
«escalar al final» es cómo se acaba con texto de 4 pt y sangrado inventado.

| | |
|---|---|
| Hoja | 500 × 700 mm |
| Sangrado | 3 mm por lado, con marcas de corte |
| Área segura | 18 mm desde el corte |
| Retícula | 6 columnas · medianil 8 mm |
| Salida | PDF vectorial de 1 página · PNG a 288 dpi |

## La compuerta

`medir.mjs` comprueba las tres cosas que una lámina puede tener mal sin que
se note mirándola. **21 comprobaciones, y las tres clases verificadas
rompiendo el diseño a propósito** para ver que se ponen rojas.

1. **Contraste contra el fondo DE VERDAD.** Aquí el fondo no es un color: es
   un degradado con un haz de luz cruzando por detrás del titular. Medir
   contra «el negro del cartel» daría un número bonito y falso — es el error
   que ya tengo anotado en el Cerebro (`color.json`: *el contraste se midió
   contra el fondo equivocado*). Así que se apaga la capa de texto, se
   fotografía lo que queda, y cada texto se compara contra **los píxeles
   reales que tiene debajo**, quedándose con el peor.
2. **Área segura.** Nada legible entra en los 18 mm del corte: la guillotina
   no es exacta.
3. **Cuerpo mínimo.** Impreso, por debajo de 3 mm no se lee. El aviso de
   pieza de concepto va a 3.6 mm a propósito: un descargo que no se puede
   leer no descarga nada.

## Dos defectos que sólo salieron mirando la pantalla

Los dos pasaron las pruebas de sintaxis y ninguno se veía en el código.

1. **La X salió OVALADA.** La primera versión enmascaraba un `<div>` con
   `objectBoundingBox`; como la hoja no es cuadrada, el círculo se estiró.
   Un logo ovalado se ve mal antes de que nadie sepa por qué. Ahora el plano,
   la luz y el hueco viven en un solo `<svg>` con `viewBox`, así que un
   círculo es un círculo.
2. **El haz tenía canto.** Un trapecio de relleno plano tiene una raya recta
   arriba —cruzando el anillo— y dos aristas a los lados, y entonces se lee
   como una rampa y no como luz. La luz no tiene filo. Se arregló naciendo en
   cero por arriba y con una máscara que se come los lados.

## Lo que no se hizo, y por qué

- **No hay imagen generada.** Ni el logo ni el fondo. Un cartel se sostiene
  en composición y tipografía; lo generado se nota y encima aquí sería
  fabricar la marca de un tercero.
- **No se tocó la tipografía de Mazi.** Es una pieza de otra marca. Va en
  Inter y JetBrains Mono, incluidas en la carpeta para que el render salga
  igual en cualquier máquina.
