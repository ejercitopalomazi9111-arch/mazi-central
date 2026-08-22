# Ligas Mazi · Pendientes

> Lo que falta, con diagnóstico. Sin diagnóstico no es un pendiente, es un recado.
> Última revisión: 31 de julio de 2026.

---

## 🔴 Urgente · privacidad

### La foto de una persona real en la tienda
El producto **BALÓN** trae como imagen la foto personal de alguien. La tienda es pública: la ve
cualquiera que abra la app.

**Dónde está:** no es del repo. Es un renglón de la tabla `products` en Supabase, subido desde la
app con "Agregar producto". Por eso no lo puedo borrar yo desde el código — **lo tiene que borrar
quien subió el producto**, o cambiarle la imagen desde la misma pantalla de la tienda.

**Lo que sí toca hacer del lado del código:** avisar al subir una imagen de producto que **va a ser
pública**. Ahorita no lo dice en ningún lado, y así es como se sube una foto personal sin querer.

---

## 🟡 Diseño y sensación

### Los sobres del gachapón se ven muy simples
Es el momento de premio de toda la app y hoy es una caja de color. Falta peso: apertura, luz,
antes/después. Referencia de lo que sí se siente: la reacción de la carta (`cardReact`).

### Los efectos de rareza alta se ven planos
Diamante Rosa, Galaxy Opal y Dark Matter deberían verse *caros*. Hoy la diferencia contra un
Esmeralda casi no se nota. La escalera de 20 peldaños ya está bien medida (`RARITY` + `POMPA`);
lo que falta es que los peldaños de arriba **se vean** distintos.

### La animación de carga está desincronizada
La red y el balón corren con tiempos distintos y se ve como si uno se hubiera trabado. Es un
detalle, pero es lo PRIMERO que ve cualquiera al abrir.

### La sección de entrada se ve chica y descuadrada
Reportado por Carlos en captura. Falta medirla en 390×844 y en escritorio.

### Los círculos de jugada, centrados con su borde punteado
En `estrategias`, los círculos de la defensa (`stroke-dasharray`) no quedan centrados respecto de
su posición. Se ve chueco en el diagrama de la jugada.

---

## 🟡 Escritorio · ya diagnosticado

**Ligas Mazi se diseñó sólo para teléfono y en escritorio nada más se centró.** Capturado a 1920px:

- queda una tarjeta con forma de celular flotando en un vacío negro
- los campos se estiran a ~1100px (deberían toparse en 480)
- la pestaña "Crear cuenta" no tiene contenedor
- la foto se recorta mal

**No es pulido: falta un layout de escritorio.** El arreglo va con la skill `frontend-design`,
sección Layout.

---

## 🟡 Objetivos táctiles

`#segIn` y `#segUp` miden **161×36** en teléfono. El mínimo cómodo es **44** de alto. Son los
botones de la pantalla de entrada, o sea los primeros que toca cualquiera.

---

## ✅ Cerrado hace poco (para no volver a abrirlo)

- Cerrar sesión ya no te deja fuera de tu propia cuenta (`cuentas-local.js`, el llavero local)
- Una sola escalera de rarezas, de 20 peldaños, con auto-prueba al cargar
- Las previsualizaciones de cosméticos ya dibujan de verdad (brillo, accesorio, marco, efecto, fondo)
- La rareza de la carta ahora sale del **atuendo completo**, no de una sola pieza
- La foto ya no tapa el número de rareza ni el texto de cómo juega
- El premio del gachapón ya no se cierra solo
- El CURP quedó sólo en el flujo de "vincular a mi hij@"
- Cada partido muestra su **categoría** (un papá encuentra el de su hij@ entre nueve categorías)
- **El coach asigna posiciones**: antes del partido en el vestidor y durante el juego en los cambios

---

## 🔵 En construcción

**La herramienta de simulacro** (`ligas-mazi/simulacro/`): 570 personas con nombre, carácter y CURP
válido que recorren la app completa —cuentas, enfrentamientos, notificación, partido en vivo,
puntos por minuto visto, tienda por códigos, las tres fases del torneo— tres veces. El reparto ya
está (`personas.mjs`); falta el motor que los mueva.

---

## 🔵 De la sesión del 1 de agosto

### El traspaso de la cuenta del hijo al hijo
Hoy un niño chiquito vive **dentro** de la cuenta del papá (`children[]`) y no tiene sesión propia
— y eso está bien, es lo correcto para un niño de 7. Lo que falta es **el día que crezca**: hoy
tiene que registrarse aparte y que la liga lo empate a mano con su código.

Debería poder hacerse desde la app: el papá toca "entregarle su cuenta", el chavo se registra, y
sus estadísticas, su carta y sus cosméticos se van con él. Es la única parte del ciclo de vida de
un jugador que todavía es manual.

### Rebotes y asistencias
La carta enseña REB y AST y la mesa **no los captura**. O se anotan, o se quitan de la carta —
enseñar una casilla que nunca se llena es peor que no enseñarla.

### La herramienta de simulacro, como producto
Carlos lo dijo con todas sus letras: si se pule, se le puede vender a estudios de videojuegos,
aeronáuticas, científicos y psicólogos, porque **contratar testers humanos sale carísimo**. Hoy es
específica de Ligas Mazi en el puente (`app.mjs`) pero el inspector ya es genérico. Lo que falta
para que sea producto:

- Un archivo de configuración en vez de código para describir roles y recorridos
- Que el reparto de personas se pueda definir sin tocar `personas.mjs`
- Un reporte que no dependa de conocer el dominio
- Y lo más importante: **cerrar el cuarto eslabón** de los abandonos del papá, que quedó abierto

### El cuarto eslabón (abierto)
El simulacro reporta abandonos en los papás que **no se han podido eliminar**. Ya se cerraron tres
causas, todas de la prueba y no de la app: el papá se registraba sin hijos vinculados; el registro
borraba la liga; y dos hermanos de la misma edad salían con el mismo cumpleaños. Queda al menos
una más sin encontrar. **La app funciona a mano** — verificado con capturas y 40/40 comprobaciones.
