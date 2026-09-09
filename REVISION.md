# Revisión de toda la casa · 9 de septiembre de 2026

Lo pidió Carlos: *«revisa todo y avísame cuando pueda revisar la página»*.

Esto es el censo de **las 41 suites de pruebas del repo, corridas de verdad**, no
leídas. Existe porque hasta hoy nadie sabía cuáles estaban verdes: se corrían
las tres o cuatro del proyecto que se estaba tocando y las demás vivían en un
limbo donde **un suite que no arranca se lee exactamente igual que uno que
pasa**.

---

## Lo primero, porque es lo que Carlos preguntó

**La página de Toydarians está lista para revisar:**

<https://mazi-central.palomazi9111.workers.dev/toydarians/>

Producción ya sirve el commit `11c4ed9` — 382 KB, con lo mío y lo de Godines
juntos: la Bungee empotrada, el logo con su proporción real, los estados de
toque, el escalonado del scroll y los 68 precios con PayPal que cableó él.
La compuerta (`toydarians/taller/revisar.mjs`) dice **limpio** en las seis
combinaciones: 390 / 768 / 1440 px, con JavaScript y sin él.

---

## Cómo se corre el censo

Casi la mitad de las suites son de navegador y **necesitan que algo esté
servido**. Sin eso revientan con `ERR_CONNECTION_REFUSED`, que **se ve idéntico
a un defecto** y no lo es. Los puertos no son negociables: están escritos dentro
de cada suite.

```bash
node build.mjs                                   # ⚠ o mides un dist viejo
cd dist && python3 -m http.server 8791 &         # puercos
             python3 -m http.server 8792 &       # demo, laboratorio, sala, sitio
             python3 -m http.server 8123 &       # sala (identidad, idioma, avisos)
             python3 -m http.server 8781 &       # fadori
cd empresa/clases && python3 -m http.server 8124 &   # clases
cd juegos/servidor && npx wrangler dev --port 8815 --local &   # puercos a distancia
```

Y **desde la raíz del repo**: varias suites resuelven rutas contra el
directorio actual y desde `dist/` fallan con `ERR_MODULE_NOT_FOUND`, que otra
vez parece un defecto y es un `cd`.

---

## Verde · 33 suites

| Suite | Resultado |
|---|---|
| `juegos/guerra-de-puercos/pruebas.mjs` | 74 · 0 |
| `juegos/guerra-de-puercos/pruebas-pantalla.mjs` | 75 · 0 |
| `juegos/guerra-de-puercos/pruebas-linea.mjs` | 25 · 0 |
| `toydarians/taller/revisar.mjs` | limpio · 6 combinaciones |
| `sala/servidor/pruebas.mjs` | 316 · 0 |
| `sala/servidor/pruebas-push.mjs` | 39 · 0 |
| `sala/pruebas-proceso.mjs` | 32 / 32 |
| `sala/pruebas-avisos-navegador.mjs` | 32 · 0 |
| `sala/pruebas-idioma.mjs` | 20 / 20 |
| `sala/pruebas-multicuenta.mjs` | 18 / 18 |
| `sala/pruebas-galeria.mjs` | 0 fallan |
| `sala/pruebas-punto.mjs` | 0 fallan |
| `sala/pruebas-identidad.mjs` | 8 / 8 |
| `sala/pruebas-mesa.mjs` | verde |
| `sala/vigilante/pruebas-buzon.mjs` | 11 / 11 |
| `sala/vigilante/pruebas-oir.mjs` | 7 · 0 |
| `guias/istqb-ctfl/entrenamiento/pruebas.mjs` | 94 / 94 |
| `jabonera/pruebas.mjs` | 61 · 0 |
| `jabonera/pruebas-pantalla.mjs` | 51 · 0 |
| `lamina/pruebas.mjs` | 56 / 56 |
| `luz/pruebas.mjs` | 52 / 52 |
| `entorno/pruebas-mandos.mjs` | 50 / 50 |
| `reportes/pruebas-app.mjs` | 51 / 51 |
| `reportes/pruebas-credencial.mjs` | 11 · 0 |
| `empresa/pruebas-libro.mjs` | 40 · 0 |
| `empresa/clases/pruebas-revisar.mjs` | 33 · 0 |
| `herramientas/pruebas-acta.mjs` | 39 · 0 |
| `herramientas/pruebas-relevo.mjs` | 29 · 0 |
| `herramientas/pruebas-bodega.mjs` | 17 · 0 |
| `herramientas/pruebas-oficios.mjs` | 17 · 0 |
| `herramientas/pruebas-tipos-navegador.mjs` | OK · 7 603 bytes de SVG |
| `marca/pruebas-figuras.mjs` | 9 · 0 |
| `demo/pruebas.mjs` · `laboratorio/pruebas.mjs` · `fadori/pruebas-cortinilla.mjs` | verdes con servidor |

---

## Arreglado hoy · el sitio de la empresa se caía entero

`sitio/pruebas.mjs` abría con `import { chromium } from 'playwright'`. En este
contenedor playwright vive **sólo en la instalación global**, así que ese import
revienta con `ERR_MODULE_NOT_FOUND` antes de la primera comprobación. **El suite
llevaba tiempo sin arrancar y nadie se enteró**, porque un suite que no arranca
no reprueba: calla.

Es la **tercera** vez que aparece ese renglón exacto — ya estaba en
`toydarians/taller/revisar.mjs` y en `explorador/pruebas.mjs`, y las tres veces
tapó defectos distintos.

En cuanto arrancó cazó uno de verdad, y era gordo: `montarEncendido()` llama a
`terminar(true)` cuando hay `prefers-reduced-motion`, y `terminar` usa `parar`,
declarado con `const` **ciento cincuenta líneas más abajo**. Zona muerta
temporal → `ReferenceError` → el módulo entero se cae y con él **toda la
experiencia de la portada**: el foco, el parpadeo, el viaje del logo, los
efectos. Sólo le pasaba a quien tiene puesta la preferencia de menos
movimiento, o sea **justo a quien menos puede permitirse una página rota**.

`let parar = null` arriba del atajo lo apaga. Medido: **63/67 → 64/67**, y la
que cambió es exactamente «sin errores ni 404».

---

## Rojo · 8 suites, con diagnóstico

Ninguna bloquea la página de Toydarians. Van por orden de lo que costaría
arreglarlas.

| Suite | Estado | Qué pasa |
|---|---|---|
| `sala/pruebas-retrato.mjs` | revienta | Le falta el archivo `/tmp/cara.png`, que es un accesorio de prueba que nadie genera. La suite depende de algo que no está en el repo: o se genera al arrancar, o se guarda |
| `explorador/pruebas.mjs` | 58/58 ✓, sale en 1 | Pasa todo y aun así reprueba por **un** 404 de consola. Hay que averiguar qué recurso es; el número de pruebas está impecable |
| `entorno/pruebas-teclado.mjs` | 11 / 12 | Una sola. No imprime cuál con `✗`, así que primero hay que hacer que diga qué falló — hoy hay que leerlas todas para encontrarla |
| `cerebro/pruebas-red.mjs` | 7 · 1 | «encender una neurona enciende sus sinapsis → no se encendió ninguna». Es el mismo problema de abajo visto desde la vista de red |
| `sala/pruebas-presencia.mjs` | 27 · 3 | «el fantasma se va», «el panel se cierra solo», «el otro navegador también lo ve irse». Las tres son de que alguien se desconecte: huele a tiempo de espera, no a lógica |
| `reportes/pruebas-impresion.mjs` | 62 · 4 | Cuatro clientes —mazi, rembrandt, presidencia, geraldmed— llevan **la marca de agua de la casa en vez de la suya**. Es de contenido y se ve en el papel impreso: vale la pena |
| `sala/pruebas-fusion.mjs` | revienta | «no pudo entrar: la puerta sigue puesta». Necesita algo más que el servidor estático; hay que ver qué levanta |
| `cerebro/pruebas.mjs` | 77 · 4 | **Ya estaba documentado en `CLAUDE.md`.** 552 neuronas escritas y sólo 168 llevan a otras; el grafo se parte en 175 comunidades. La tanda grande del ecosistema entró sin `vecinas`. No se arregla metiendo `vecinas` a mano en 384 neuronas: hay que decidir si el descubrimiento por señales se afina o si el umbral estaba mal puesto desde que el corpus era chico |

### Y lo que queda rojo del sitio, que es decisión y no bug

- **21 objetivos táctiles por debajo de 44 px** en la portada. Es el mismo
  defecto que ya estaba anotado para Ligas Mazi, y se arregla con maquetación.
- **«la portada se ve completa» mide el `.ave` de la intro, no el de la
  portada.** Con menos movimiento la intro se salta y ese nodo mide 0 px de
  alto; sin la preferencia pasa **por accidente**, porque a los 2.5 s la intro
  todavía no termina. O sea: la prueba está mal escrita y aprueba por
  casualidad. **Es la prueba la que hay que arreglar, no la página** — y hasta
  arreglarla no sabemos si el ave de la portada se ve o no.

---

*Este documento es una foto, como todas. Si algo de aquí ya no cuadra cuando lo
leas, gana lo que midas tú — son cinco servidores y un `for`.*
