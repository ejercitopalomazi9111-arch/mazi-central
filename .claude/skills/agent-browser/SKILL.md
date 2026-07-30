---
name: agent-browser
description: Ver y usar la pantalla de verdad — maneja un navegador real para capturar, hacer clic, escribir, recorrer flujos completos y cazar errores que sólo salen al interactuar. Úsala antes de decir que algo funciona, para QA visual, para reproducir un bug reportado, para el barrido de tamaños de la cátedra, y siempre que haya que verificar en vez de suponer. Herramientas propias, sin servicios externos.
---

# Los ojos y las manos

**Nunca digas que algo funciona sin haberlo visto funcionar.** Leer el código no cuenta.

Dos herramientas propias, hermanas:

| Herramienta | Qué hace |
|---|---|
| `herramientas/captura.mjs` | **los ojos** — abre una URL y saca la foto |
| `herramientas/navegador.mjs` | **las manos** — usa la página: clic, escribe, recorre, verifica |

Chromium ya viene en la caja. Sin servicios de pago, sin API de terceros.

## Cuándo se usa — sin excepciones

- **Antes de entregar cualquier interfaz.** Siempre.
- **Antes de decir "ya quedó".** Si no lo viste, no quedó.
- **Al reproducir un bug** que Carlos reportó. Reproducir antes de arreglar es regla de la casa.
- **En la cátedra** (`revision-web`), para el barrido de tamaños y temas.
- **Al sacar material de portafolio** — capturas reales de proyectos reales.

## Los ojos · `captura.mjs`

```bash
node herramientas/captura.mjs <url> <salida.png> [opciones]
```

| Opción | Para qué |
|---|---|
| `--movil` | viewport de iPhone y user-agent táctil |
| `--ancho N --alto N` | tamaño a la medida |
| `--espera MS` | esperar antes de disparar (apps que tardan en montar) |
| `--teclas a,b,c` | pulsar teclas antes de la foto (para entrar a un juego, por ejemplo) |
| `--js "código"` | ejecutar JS antes (saltar a un estado concreto) |
| `--completa` | la página entera, no sólo el viewport |

Reporta errores de consola de paso, filtrando el ruido de red del proxy.

## Las manos · `navegador.mjs`

### Barrido de la cátedra

```bash
node herramientas/navegador.mjs <url> --tamanos --salida ./capturas
```

Captura en **teléfono (390×844), laptop (1440×900) y ancha (1920×1080)**, en **claro y oscuro**
— seis vistas. Y de paso detecta solo:

- **Desbordes horizontales**, con los elementos culpables por nombre. Ésta es la causa número
  uno de "se ve feo en computadora".
- **Objetivos táctiles chicos** — menos de 44px en teléfono, menos de 24px en escritorio, que
  es la regla de Vercel.

Sale con código 1 si encontró algo, así que sirve como puerta de calidad.

### Recorrer un flujo

```bash
node herramientas/navegador.mjs <url> --guion flujo.json --salida ./capturas
```

El guion es JSON, en español:

```json
[
  { "hacer": "escribir",  "en": "#correo", "texto": "prueba@mazi.mx" },
  { "hacer": "escribir",  "en": "#pass",   "texto": "12345678" },
  { "hacer": "clic",      "en": "#entrar" },
  { "hacer": "esperar",   "que": ".panel", "ms": 8000 },
  { "hacer": "foto",      "nombre": "ya-adentro" },
  { "hacer": "verificar", "que": ".saludo", "contiene": "Bienvenido" },
  { "hacer": "scroll",    "a": 1 },
  { "hacer": "tecla",     "cual": "Enter" },
  { "hacer": "pausa",     "ms": 1500 }
]
```

Cada paso reporta ✓ o ✗ con el motivo real del fallo.

## Cómo leer una captura

Sacar la foto es la mitad. **Mirarla con criterio es la otra.** Qué buscar:

1. **¿Hay vacío enorme a los lados?** → se diseñó para teléfono y se estiró. Es lo que le pasa
   a Ligas Mazi en escritorio: la app queda como tarjeta de teléfono flotando en negro.
2. **¿Los campos miden 1000px de ancho?** → un campo de correo no debe pasar de ~480px, sin
   importar el ancho de la pantalla.
3. **¿Algo se encima o se sale?** → el barrido ya te dice el culpable.
4. **¿Se lee sin acercar?** → si dudas, es que no.
5. **¿El tema oscuro se ve intencional o accidental?** → los `<select>` nativos son los que más
   delatan.

## Trucos que ahorran horas

- **Pulsación sostenida.** En headless los frames van lentos y un toque instantáneo se le
  pierde al sondeo de los motores de juego. Ambas herramientas ya sostienen ~120ms.
- **Saltar al estado que importa** con `--js`. Para llegar a la pantalla de muerte de un juego
  no juegues doce pisos: siembra el estado y arranca ahí.
- **Filtrar el ruido de red.** El proxy tira `ERR_CONNECTION_RESET`; eso no es bug del
  proyecto y ambas herramientas ya lo ignoran.
- **`--ver` para depurar en local.** Abre el navegador con cabeza.
- **Servir el proyecto primero:** `python3 -m http.server 8080` en la raíz del repo.

## Límites honestos

- **Es Chromium, no Safari de iPhone.** La mayoría de los bugs salen igual, pero WebAudio,
  gestos táctiles y el rasqueo de video se portan distinto en iOS. Para eso sigue haciendo
  falta el teléfono de Carlos.
- **No mide rendimiento real.** Un headless en un servidor no dice cuánto tarda en un teléfono
  con señal mala.
- **No sustituye tener criterio.** La herramienta te enseña la pantalla; ver qué está mal es
  trabajo de `revision-web` y `frontend-design`.

## Trabaja con otras skills

- **`revision-web`** — es su pareja. Esta skill consigue la evidencia; esa la juzga.
- **`frontend-design`** — cuando la captura muestra que algo está feo, ahí está el cómo arreglarlo.
- **`scroll-cinema`** — probar que la secuencia va suave y no pesa de más.
- **`four-judges`** — si al ver la pantalla resulta que el problema es de concepto y no de
  pulido, rostízalo antes de seguir puliendo.
