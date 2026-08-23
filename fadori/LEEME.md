# Fadori · cómo está armado

> Proyecto Sin Filas · Instituto Rembrandt de Querétaro · construido por Grupo Mazi.
> Qué es y por qué: [`PROYECTO.md`](PROYECTO.md). Qué hace, función por función:
> [`FUNCIONES.md`](FUNCIONES.md). Esto de aquí es **cómo está hecho**.

---

## Las cuatro pantallas

| Archivo | Quién la usa | Cómo se ve |
|---|---|---|
| [`index.html`](index.html) | **el alumno**, en su teléfono | oscura, fotos grandes |
| [`mostrador.html`](mostrador.html) | **la cooperativa**, en una tablet | clara, alto contraste, botones enormes |
| [`pantalla.html`](pantalla.html) | **colgada junto a la cooperativa** | números gigantes, nada más |
| [`medidor.html`](medidor.html) | **Carlos**, para el reporte STEAM | cifras, gráfica y CSV |

Son **opuestas a propósito**. El alumno la ve en un pasillo con el teléfono en la mano; la
cooperativa la usa con las manos ocupadas, sucias y muchas veces con sol pegando. Una interfaz
que sirve para las dos no sirve bien para ninguna.

## Y un solo cerebro

```
              ┌─────────────────────────────┐
              │        nucleo.js            │
              │  datos · fila · medidor     │
              └──────────────┬──────────────┘
                             │
     ┌───────────┬───────────┼───────────┬───────────┐
  index.html  mostrador  pantalla    medidor      estilo.css
```

**Ninguna pantalla toca los datos directamente.** Todas hablan con `window.FADORI`. Eso es lo
que permite cambiarle el motor por debajo sin reescribir nada.

---

## Las tres decisiones que sostienen todo

### 1 · El motor de datos es un adaptador nuestro

Regla §2 de la casa: *conectar sí, depender no.*

```js
const MotorLocal    = { leer, escribir, alCambiar };   // ← el que corre hoy
const MotorServidor = { leer, escribir, alCambiar };   // ← el hueco, ya escrito
```

Hoy corre el **local**: `localStorage` más `BroadcastChannel`, o sea que **no necesita cuenta de
nadie, no necesita internet y no cuesta un peso**. Entre pestañas del mismo aparato se sincroniza
solo — que es exactamente lo que hace falta para enseñar el proyecto: el teléfono del alumno y la
pantalla del mostrador abiertos al mismo tiempo, moviéndose juntos.

El día que la escuela autorice un servidor, se llena `MotorServidor` y **ninguna pantalla se
entera**. El externo queda abajo y reemplazable.

> **El límite, dicho con todas sus letras:** con el motor local, cada aparato tiene su propia
> copia. Sirve completo para la demostración y para operar desde **una** tablet, no para
> doscientos teléfonos hablando entre sí. Eso lo resuelve el motor de servidor, y por eso el
> hueco ya está hecho.

### 2 · La fila se ordena en un solo lugar

`colaOrdenada()` en `nucleo.js`. Nadie más ordena nada. Regla 4 del catálogo, decidida antes de
la primera tabla porque después sale carísimo.

No es "primero en llegar". El orden es:

1. Lo que **ya está en la plancha** nunca se reordena.
2. Los **anticipados** entran primero — por eso sirve pedir desde el salón.
3. **EL TOPE.** Quien lleve esperando más de N turnos se vuelve intocable y se ordena sólo por
   antigüedad.
4. Y **sólo entonces**, lo rápido primero.

El paso 3 no es un detalle: sin él, atender primero lo rápido baja el promedio de todos **pero
deja sin comer al que pidió el plato fuerte**, y eso se nota al tercer día.

### 3 · Cero datos de más

Nombre de pila y grupo. **Sin apellidos, sin correo, sin teléfono, sin contraseña, sin fotos de
alumnos.** Cientos de menores sin una base de datos de menores.

Y dos reglas que están puestas en el código, no en un documento:

- **La pantalla pública muestra números, nunca nombres.** Hay una prueba que falla si algún día
  se cuela un nombre ahí.
- **La deuda de un alumno no aparece en ninguna pantalla que vea otro alumno.** Que un compañero
  vea lo que debes es humillación, no administración.

Y `cerrarCiclo()` borra alumnos, pedidos y adeudos. Si nadie escribe cuándo se borra, no se borra
nunca.

---

## Nada se detiene si algo falla

Es la regla 3 del catálogo y está implementada en tres capas independientes:

| Si se cae… | Qué pasa |
|---|---|
| **el internet** | el motor local no lo usa. Se pide igual |
| **la notificación** | el turno se ve en pantalla, y la señora sigue gritando números |
| **la app entera** | el mostrador congela la lista y la imprime. Se despacha en papel |

La app **acelera, no reemplaza**. El día que se caiga, el recreo sigue.

---

## Las pruebas

Cada pantalla trae las suyas y **corren solas al cargar**. Si algo se rompe, sale en la consola
antes de que lo vea un alumno.

```
index.html      19 pruebas    registro, fila, tope, deuda, resumen, presupuesto
mostrador.html   9 pruebas    pedido de a pie, dos despachadores, agotar, cobrar, corte
pantalla.html    4 pruebas    que el número salga y que el NOMBRE nunca salga
medidor.html    10 pruebas    quién alcanzó, la curva, el contador, el CSV
```

Las de `pantalla.html` son las más importantes de todas y son las más chiquitas: comprueban que
un nombre de alumno **no** aparece en una pantalla pública.

---

## Lo que falta

| Qué | Por qué no está |
|---|---|
| **El motor de servidor** | necesita permiso de la escuela. El hueco ya está escrito |
| **Pago desde la app** | Carlos lo marcó como "más adelante". El ticket ya contempla "pagado en línea" |
| **La notificación en iPhone** | sólo llega si la app se instala en la pantalla de inicio. **Falta probarlo en un iPhone real antes de prometerlo** |
| **Fotos de verdad del menú** | las sube la cooperativa desde su pantalla. Mientras, cada categoría tiene su color y su ícono |

---

## Cómo entrar como cooperativa

La pantalla del mostrador es una dirección más: **`/fadori/mostrador.html`** — desde la app del
alumno, hasta abajo en "Lo mío", o directo por la URL.

Pide un **pasador**. El de arranque es **`1234`** y se cambia en *Ajustes → El pasador de esta
pantalla*.

> ⚠️ **Es un pasador, no una cerradura, y hay que decirlo con todas sus letras.** El número vive
> en el mismo aparato que lo comprueba, así que cualquiera que sepa abrir las herramientas del
> navegador lo ve. Sirve para lo que de verdad pasa en una escuela —que un alumno abra la
> pantalla de la cooperativa de curioso y le mueva a un pedido o a un fiado— y **no** sirve
> contra alguien que se lo proponga.
>
> La cerradura de verdad llega con el motor de servidor, donde el rol vive en la base de datos y
> no en el teléfono. Está anotado como lo primero que se conecta ese día.

El medidor (`/fadori/medidor.html`) no pide pasador: no deja tocar nada, sólo mira.

---

## Las fotos del menú

Son **reales y con licencia libre**, bajadas de Wikimedia Commons y recortadas cuadradas a
560 px. El crédito y la licencia de cada una está en [`fotos/CREDITOS.md`](fotos/CREDITOS.md) —
varias son CC BY-SA, que obliga a dar crédito, así que ese archivo no es cortesía: es lo que
cumple con la licencia.

**Son el arranque, no una lista fija.** En cuanto la cooperativa suba las fotos de su comida de
verdad desde su pantalla, éstas desaparecen y el menú se ve el doble de bien.

---

## Cómo se prueba en dos minutos

1. Abre `mostrador.html` en una pestaña y `index.html` en otra.
2. En la del alumno: pon tu nombre, acepta, toca dos platos, pide.
3. Mira cómo aparece **al instante** en el mostrador.
4. Tómalo, marca los renglones, dale "pedido listo".
5. Vuelve a la del alumno: ya dice **"¡Ya está! Ve por él"**.
6. Abre `medidor.html`: ahí está el segundo exacto que tardó.

---

*Fadori · Grupo Mazi · si no existe la herramienta, se construye la herramienta.*
