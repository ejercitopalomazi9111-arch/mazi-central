# Jabonera · control de jabón en baños escolares

Lo pidió Carlos: un sistema de inventario de jabón para los baños de una
escuela, con análisis de consumo, exportación a Excel, jabón líquido y en
barra, y un diseño presentable para un examen de la modalidad **STEAM**. El
dispensador mecánico ya lo tiene la escuela.

**Abre en `jabonera/index.html`.** Sin servidor, sin cuenta y sin internet.

> **El diseño y contra qué se comparó están en `DISENO.md`.** Carlos pidió una
> web famosa como punto de comparación: es `stripe.com`, y no de memoria — se
> bajó su hoja de estilos y se midió. El diagnóstico de la primera versión
> salió de ahí: 13 tamaños de letra contra 7, ocho pesos contra cinco, y el
> tipo más grande a 26 px contra 48. Por eso parecía un panel de
> administración.

---

## La pregunta que contesta, que no es la obvia

No es «¿cuánto jabón usamos?» —eso se contesta pesando una caja— sino
**«¿cuánto jabón hace falta, y cómo lo sabemos?»**. La segunda necesita un
método, y el método es todo el proyecto.

## Las cinco trampas del problema

Están documentadas en la cabecera de `motor.js` y cada una tiene su prueba.
Son la razón de que esto no sea una hoja de cálculo:

1. **El consumo no se mide, se deduce.** Nadie ve cuánto jabón se usó: sólo
   se ve cuánto queda. El consumo entre dos visitas es
   `(lo que quedaba + lo que se repuso) − lo que queda ahora`, y por eso una
   visita apunta **dos números y no uno**. Si alguien rellena sin apuntarlo,
   la resta sale negativa: eso no se corrige en silencio, se cuenta como 0 y
   **se denuncia** en el análisis.
2. **Líquido y sólido no se pueden sumar.** Un envase de 5 L y una barra de
   100 g no comparten unidad. Todo se guarda en unidad canónica —mL y
   gramos— y las barras son sólo una forma de mostrarlo.
3. **Un intervalo no cabe en un día.** Si una visita es lunes y la siguiente
   viernes, ese consumo no es «del viernes»: se reparte proporcionalmente
   entre los días que abarca.
4. **La hora sólo la pueden decir los intervalos cortos.** El perfil horario
   usa únicamente los intervalos de menos de 12 h, y **dice cuántos pudo
   usar** en vez de fingir certeza.
5. **Sin denominador no hay promedio.** Sin alumnos asignados no hay consumo
   por alumno: se devuelve «no se sabe», no un cero que parece un dato. Lo
   mismo con el costo cuando no hay entregas.

## Lo que hace

| | |
|---|---|
| **Inicio** | La portada: el estado del proyecto en una cifra y los baños con su medidor de cuánto les queda dentro |
| **Registrar** | Un recorrido de tres pasos, no un formulario. Baño → los dos números → **lo que se va a calcular, antes de guardar**. Pensado para hacerse **de pie en el baño, con una mano** |
| **Análisis** | Qué baño gasta más, por día, por día de la semana, a qué hora, por alumno, y cuánto cuesta |
| **Almacén** | Entregas con su costo, existencias, y **cuántos días aguanta** al ritmo medido |
| **Proyecto** | Lo que se presenta: los datos del proyecto, **el reporte en formato Rembrandt**, cómo cumple STEAM, el dispensador y su calibración, el método para repetirlo, y **lo que el sistema NO puede decir** |
| **Ajustes** | Desde el engrane, o desde la portada. Baños, productos, dispensador, mediciones, respaldo y demostración |

### El reporte en formato Rembrandt

Carlos pidió *«un documento con el formato Rembrandt que usa nuestro sistema
de reportes actual»*. **No se redibujó el membrete**: la herramienta
`reportes/` de esta misma central ya tiene el formato oficial del Instituto
—sacado del `.docx` que mandó Carlos, con sus márgenes de 30 mm medidos del
`sectPr` y sus colores muestreados de las imágenes— más la marca de agua, la
numeración, las firmas y el sello de verificación.

Jabonera escribe un archivo con **la misma forma que esa herramienta
importa**, y ella lo maqueta y lo imprime. Un solo formato oficial, en un
solo sitio: tenerlo en dos garantiza que se separen el día que la escuela
cambie el suyo.

```
Jabonera → Proyecto → «Generar el reporte»   (baja un .json)
Reportes → Guardados → Importar → ese archivo → Imprimir / PDF
```

Comprobado de verdad, no supuesto: se importa en la herramienta real y salen
**seis hojas** con el membrete, el folio y el sello. El reporte trae los
datos del proyecto, el planteamiento, el método, el instrumento y su
calibración, las instalaciones, los resultados, **y el apartado de alcance y
limitaciones**, que es el que pregunta un sinodal.

### Lo que se investigó, con sus fuentes

Carlos pidió buscar precios de refill y cuánto gasta un dispensador. Está en
`datos.js`, en el bloque `REFERENCIAS`, con procedencia y fecha — un número
sin fuente es una suposición con formato de dato.

| | Valor de arranque | De dónde |
|---|---|---|
| Jabón líquido | **$26.94 / L** | Mediana de 6 precios del mercado mexicano ($17 a $45/L). Se usa la mediana y no el promedio ($28.52) porque uno de $45 es un valor extremo que arrastra la media |
| Jabón en barra | **$23 la barra de 150 g** ($153/kg) | Menudeo $31, mayoreo $15 |
| Dosis del dispensador | **1.2 mL por pulsada** | ASTM E2755 pide 1.5 mL, EN 1500 pide 3, ASTM E1174 pide 5, y Leapfrog exige ≥1.0; pero los estudios de dispensadores reales miden **menos de 1 mL** en muchos y encuentran raro pasar de 1.5 |
| Consumo esperado de un baño | alumnos × 2 usos × dosis | Con los datos de Carlos: **Baño 1 ≈ 50 mL/día** (21 alumnos), **Baño 2 ≈ 156 mL/día** (65 alumnos) |

**Son referencias para empezar, no mediciones de la escuela.** En cuanto se
registra una entrega real, el sistema usa ESE precio y olvida el de
referencia. Y la dosis hay que medirla: es el experimento del proyecto. El
consumo esperado no es una predicción, es **la vara con la que se compara la
medición** — y si no coinciden, eso es el hallazgo.

### Excel de verdad, no un CSV

`.xlsx` auténtico de **nueve hojas**, escrito a mano en `excel.js` sin una
sola dependencia: un `.xlsx` es un ZIP con unos XML dentro. Las fechas van
como fechas y los pesos con formato de moneda, así que se puede seguir
analizando dentro de Excel.

No es un CSV porque un CSV es **una** tabla y aquí hacen falta nueve; porque
en un CSV las fechas llegan como texto y Excel en español las malinterpreta
según la computadora; y porque los decimales cambian de significado según la
coma o el punto del sistema.

### Funciona sin internet, y es una decisión

Los datos viven en el propio navegador (`localStorage`). El registro se hace
**de pie en el baño**, donde puede no haber señal; nadie tiene que crear una
cuenta ni desplegar nada; y la escuela no acaba con datos de sus alumnos en
un servidor ajeno.

**El precio es real y está escrito en la propia app, no en un pie de página:
los datos viven en ESE aparato.** Por eso el respaldo a `.json` y la
exportación a Excel no son un extra — son la forma de que el trabajo no se
pierda.

## Cómo se usa y se prueba

```
node jabonera/pruebas.mjs           # el motor · 61 comprobaciones
node jabonera/pruebas-pantalla.mjs  # la pantalla · 44 comprobaciones (necesita playwright)
node jabonera/armar-suelto.mjs      # genera jabonera.html, el archivo único para USB
```

La compuerta de pantalla mide también **la disciplina tipográfica en lo que se
renderiza**, no en lo que dice el CSS: si alguien vuelve a meter un tamaño
suelto o un peso inventado, se pone roja.

`jabonera.html` es **generado**: no se edita a mano. Se cambian los
originales y se vuelve a correr el armador; `pruebas-pantalla.mjs` comprueba
que esté al día.

## Los seis defectos que sólo se vieron corriéndolo

Se dejan escritos porque son la parte cara del trabajo, y los seis pasaban
las pruebas del motor sin despeinarse.

1. **La página salía EN BLANCO.** Los tres módulos declaraban `const API` y,
   como se cargan con `<script>` clásico, comparten el ámbito global: el
   segundo reventaba con *«Identifier 'API' has already been declared»*. En
   node no pasaba porque ahí cada archivo tiene su propio ámbito. Ahora cada
   módulo va dentro de una función.
2. **Los campos se quedaban en 13.33 px** —justo por debajo del umbral en
   que iOS hace zoom solo al tocarlos—. La causa: `font: 400 16px/1.4
   inherit` es **inválido**, porque el atajo `font` exige una familia y
   `inherit` no lo es, así que el navegador tiraba la declaración entera.
   A ojo no se ve; lo cazó la compuerta de pantalla.
3. **Los campos del jabón en barra salían con el producto en líquido**, con
   el atributo `hidden` puesto y todo: `[hidden]` del navegador pierde por
   especificidad contra un `display:grid` de clase.
4. **El armador de un solo archivo se rompía solo.** `String.replace`
   interpreta `$&` y `$'` *dentro del texto de reemplazo*, y nuestro propio
   código los contiene: `"$"#,##0.00` del formato de moneda y `'$' +` del
   formateador de pesos. El `$&` volvía a pegar las etiquetas originales y
   salía un HTML que pedía archivos inexistentes. Se arregla reemplazando
   con una función.
5. **La trampa nº 2, tres veces, por la puerta de atrás.** Las «lavadas de
   manos» del jabón en barra se calculaban dividiendo **gramos** entre los
   **mililitros** por pulsada del dispensador de líquido; las gráficas por
   día de la semana y por hora **sumaban mL con gramos** en el mismo eje; y
   el almacén decía «alcanza para 1.3 recargas» dividiendo gramos entre la
   capacidad en mL. Las tres se vieron mirando la salida, no en una prueba.
   Ahora las comprobaciones viven en el motor, no en la pantalla — porque la
   pantalla ya se equivocó.
6. **El botón «Borrar» medía 38 px**, por debajo de los 44 con los que un
   pulgar acierta.
7. **Desde la portada no había forma de volver a Ajustes** una vez
   configurado todo: el único botón que llevaba ahí desaparecía en cuanto
   dejaba de hacer falta, y el engrane vive en una cabecera que la portada
   esconde. Lo cazó la compuerta al no encontrar la puerta.
8. **El empaquetador de un solo archivo se rompió al añadir `reporte.js`**,
   porque la expresión que sustituía los `<script src>` estaba escrita a
   mano con los cuatro anteriores. Ahora se arma desde la misma lista de
   módulos: añadir uno y olvidarlo ya no es posible.

## Lo que este sistema NO puede decir

Va en la propia app, en la pestaña *Proyecto*, porque un proyecto de
ciencias que sólo enseña lo que sí puede afirmar está incompleto:

- **No sabe quién gastó.** Mide el baño, no a las personas — y así debe ser:
  registrar el uso individual del baño de un alumno sería vigilarlo.
- **No distingue el uso del desperdicio.** Un dispensador que gotea y un
  grupo que se lava bien las manos se ven igual en el número.
- **No sabe cuánta gente entró.** El «por alumno» usa los alumnos
  *asignados* al baño, no los que realmente lo usaron ese día.
- **Si alguien rellena sin apuntarlo, ese consumo se pierde.** El sistema lo
  detecta y lo denuncia, pero no puede recuperarlo.

## Los datos de demostración

Cargan tres semanas de mediciones inventadas —siempre las mismas, con
generador de semilla fija, para que la presentación no cambie de números
entre el ensayo y el examen—. Quedan marcados con un letrero rojo en
pantalla **y con una advertencia dentro del Excel**: un dato inventado que se
pueda confundir con una medición es exactamente lo que no debe pasar en un
proyecto de ciencias.

## Lo que falta y sólo lo puede dar la escuela

1. La lista real de baños, con su número de alumnos.
2. La dosis del dispensador **medida** (10 pulsadas en una probeta ÷ 10), y
   los gramos por lavada de la barra (pesarla antes y después de N lavadas).
3. El costo real por envase y por barra.
4. Quién captura los datos y con qué aparato.
