# MONARCH · Investigación científica de la mariposa monarca

Para quien arma Monarch (narración, ciclo de vida, mariposas, mapa). Las cifras que el juego importa están en
**`vr/monarca/ciencia.json`**; aquí está de dónde sale cada una, cómo se usa y qué hay que corregir de lo que Monarch
dice hoy.

- **Consulta:** todas las fuentes se abrieron el **23 de noviembre de 2026**.
- **Regla:** cada dato lleva su **[ID]**, que apunta a la [Bibliografía](#bibliografía). Una fuente cuenta como leída sólo si
  abrí la página o el PDF. Las que no pude abrir están [aparte](#fuentes-que-no-pude-abrir) y no se citan como leídas.
- **Si dos fuentes no coinciden, van las dos con su rango.** Ninguna se elige en silencio.
- **Estado:** versión 1. Lo que falta está en [Pendiente](#pendiente).

---

## 1. Lo esencial en una tabla

| Dato | Valor | Fuente |
|---|---|---|
| Huevo | 3–5 días (unos 4). La SSA da 2–5 | [MJV-CICLO] [USFS-BIOLOGIA] [USFWS-SSA-2024] |
| Oruga | **5 estadios**, 9–14 días en verano (la SSA da 9–18; la CCA 9–13) | [MJV-CICLO] [USFWS-SSA-2024] [CCA-2008] |
| Crisálida | 8–15 días (la CCA da 9–15; la SSA 6–14) | [MJV-CICLO] [CCA-2008] [USFWS-SSA-2024] |
| Al salir | Cuelga, bombea fluido a las alas y pasa **varias horas** secándose antes de volar | [MJV-CICLO] |
| Huevo a adulto, verano | ~20–34 días (suma de MJV); 17–37 (suma de la SSA); «en apenas 25 días» (NPS) | [MJV-CICLO] [USFWS-SSA-2024] [NPS-ACADIA-2023] |
| Huevo a adulto, primavera fresca | 40–50 días o más | [MJV-CICLO] |
| Se desarrolla entre | 12 °C y 33 °C | [USFWS-SSA-2024] |
| Adulta de verano | vive 2–5 semanas | [MJV-CICLO] [USFWS-SSA-2024] |
| Adulta migratoria | vive 6–9 meses (la CCA dice 7–9) | [USFWS-SSA-2024] [MJV-MIGRACION] [CCA-2008] |
| Generaciones al año | 3 a 5, normalmente 4 | [USFWS-SSA-2024] [MJV-MIGRACION] [NPS-GRCA-2023] |
| Regreso al norte | 2–3 generaciones de México a Canadá (el USFS dice 3–4) | [USFWS-SSA-2024] [FLOCKHART-2013] [USFS-MIGRACION] |
| Distancia volada, oriental | más de 3,000 km; hasta unos 4,800 km (3,000 millas) | [USFWS-SSA-2024] [MJV-MIGRACION] [USFS-MIGRACION] |
| Distancia volada, occidental | 500–1,600 km | [USFWS-SSA-2024] [USFWS-FR-2024] |
| Llegada a México | últimos días de octubre, cerca del 2 de noviembre; colonias a mediados de noviembre | [TAYLOR-2019] |
| Santuarios | 11–12 macizos de Michoacán y Edomex, oyamel, 2,400–3,600 m (la SSA: 2,900–3,300 m) | [USFS-MIGRACION] [CCA-2008] [USFWS-SSA-2024] |
| Reserva (RBMM) | 56,259 ha: núcleo 13,551 + amortiguamiento 42,707. Patrimonio Mundial 2008 | [CONAFOR-2013] |
| Temporada 2025-2026 | **2.93 ha** de colonias, 64 % más que 2024-2025 (1.79 ha) | [EXPANSION-2026] [UNOTV-2026] [MW-2026] |
| Máximo y mínimo | 18.19 ha (1996-1997) · 0.67 ha (2013-2014) | [EXPANSION-2026] [UNOTV-2026] |

---

## 2. Ciclo de vida, etapa por etapa (para la simulación del punto 13)

Las duraciones dependen de la temperatura: con calor todo es más rápido, con frío más lento, y **por debajo de 12 °C o
por encima de 33 °C no se desarrolla** [USFWS-SSA-2024]. En el ciclo acelerado con día y noche, eso permite que la
noche fresca «frene» el avance sin inventar nada.

| # | Paso del encargo | Lo que pasa de verdad | Duración | Fuente |
|---|---|---|---|---|
| 1 | Mariposa adulta | Las de verano se aparean a los **3–8 días** de edad. La cópula dura de una tarde a la mañana siguiente, **hasta 16 h**. | — | [MJV-CICLO] |
| 2 | Selección de algodoncillo | La hembra pone **sólo en algodoncillo** (y en unas enredaderas parientes). | — | [NPS-GRCA-2023] [CCA-2008] |
| 3 | Puesta del huevo | **Un huevo por vez**, casi siempre en el **envés de una hoja cerca de la punta**; lo deja pegado. Pone **300–500** en 2–5 semanas (el USFS dice 100–300; la CCA 300–400 en el campo). | — | [MJV-CICLO] [CCA-2008] [USFS-BIOLOGIA] |
| 4 | Desarrollo embrionario | Huevo cónico, amarillo crema, con costillas, de **1.2 × 0.9 mm**. | 3–5 días | [MJV-CICLO] [CCA-2008] |
| 5 | Eclosión | La oruguita **se come su cascarón**. | — | [MJV-CICLO] |
| 6 | Aparición de la oruga | Mide 2–6 mm. Blanca con rayas negras y amarillas, dos pares de filamentos negros. | — | [MJV-CICLO] [CCA-2008] |
| 7 | Cinco estadios | Ver la tabla de abajo. **5 estadios = 4 mudas mientras crece**; la quinta vez que cambia de piel ya sale la crisálida. | 9–14 días | [MJV-CICLO] [USFWS-SSA-2024] |
| 8 | Alimentación y crecimiento | Sólo hojas de algodoncillo. Crece casi **2,000 veces su masa** (CONAFOR dice «3 mil veces su tamaño»). Guarda los cardenólidos de la planta y se vuelve tóxica. | — | [MJV-CICLO] [CONAFOR-2013] [CCA-2008] |
| 9 | Formación de la crisálida | Al final del 5.º estadio **se aleja de la planta**, busca un lugar alto y escondido, teje un cojín de seda, **se cuelga de cabeza en J** y cambia de piel por última vez. | sin cifra (pendiente) | [MJV-CICLO] [CCA-2008] [CONAFOR-2013] |
| 10 | Transformación interna | Crisálida de **~3 cm, verde turquesa con manchas doradas**. | 8–15 días | [CCA-2008] [MJV-CICLO] |
| 11 | Apertura de la crisálida | **El último día** se ven a través de la cubierta el naranja, negro y blanco de las alas. Ojo: MJV aclara que **no es que la cubierta se vuelva transparente**; lo que cambia es el ala que se pintó adentro. | último día | [CCA-2008] [MJV-CICLO] [JN-CRISALIDA] |
| 12 | Emergencia | Rompe la cubierta por una línea débil y sale colgando. | — | [JN-CRISALIDA] |
| 13 | Expansión de las alas | **Bombea fluido** a las alas para darles forma. | sin cifra | [MJV-CICLO] |
| 14 | Secado | **Varias horas** colgada secándose. **No vuela en cuanto sale.** | «varias horas» | [MJV-CICLO] |
| 15 | Primer vuelo | Cuando está seca, se va a buscar néctar o pareja. | — | [MJV-CICLO] |
| 16 | Incorporación al ecosistema | Toma néctar de muchas flores y agua. Si nace en verano, a los 3–8 días ya se aparea; si nace **después de mediados de agosto** (oriental), entra en **diapausa** y migra. | — | [MJV-CICLO] [MJV-MIGRACION] [CCA-2008] |

**Los cinco estadios** [MJV-CICLO] (todo depende de la temperatura):

| Estadio | Días | Largo | Ancho | Cápsula de la cabeza |
|---|---|---|---|---|
| 1 | 1–3 | 2–6 mm | 0.5–1.5 mm | 0.6 mm |
| 2 | 1–3 | 6–9 mm | 1–2 mm | 0.8 mm |
| 3 | 1–3 | 10–14 mm | 2–3.5 mm | 1.5 mm |
| 4 | 1–3 | 13–25 mm | 2.5–5 mm | 2.2 mm |
| 5 | 3–5 | 25–45 mm | 5–8 mm | 3.5 mm |

**Para la simulación:** si cada día de juego dura lo mismo, un ciclo de verano «típico» cabe en unos **30 días**
(4 de huevo + ~12 de oruga + ~10 de crisálida; todos dentro de los rangos de arriba). El secado de alas no se mide en
días sino en horas: debe verse como una pausa larga y quieta, de día, antes del primer vuelo. **Sin número exacto de
horas:** ninguna fuente leída lo da, así que el juego no debe decir una cifra.

---

## 3. Alimentación

- **Oruga:** sólo hojas de algodoncillo. «Monarch butterflies exclusively lay their eggs on milkweed», «milkweed is the
  only plant monarch caterpillars will use to eat» [NPS-GRCA-2023]. La CCA: las larvas son «especialistas estrictas»
  [CCA-2008].
- **Adulta:** generalista. Néctar de muchas flores, y agua [CCA-2008] [MJV-CICLO].
- **Por qué importa el néctar en otoño:** es el combustible del vuelo y lo convierten en la grasa que las sostiene todo
  el invierno [CCA-2008] [USFWS-SSA-2024].
- **En el santuario:** con el avance de la temporada seca bajan a beber; «literalmente, millones de mariposas salen de sus
  colonias y se alinean para beber» en arroyos y en el rocío [CCA-2008].

**Aplicación en Monarch:** la oruga del ciclo sólo come algodoncillo; la mariposa adulta del ecosistema visita varias
flores distintas y, en el santuario, a veces baja a un arroyo o a la hierba mojada.

## 4. Reproducción

- Madurez: 3–8 días de edad; cópula hasta 16 h [MJV-CICLO].
- Huevos: 300–500 por hembra en 2–5 semanas, récord en cautiverio 1,179 [MJV-CICLO]; 100–300 [USFS-BIOLOGIA];
  300–400 en el campo y 700 de promedio en cautiverio [CCA-2008]. **Las fuentes no coinciden**: usar «cientos».
- La generación migratoria **no se reproduce** hasta después del invierno (diapausa); rompe la diapausa y se aparea en
  los santuarios en **febrero–marzo** [USFWS-SSA-2024].

## 5. Plantas hospederas (algodoncillo)

- Género *Asclepias*. En español: **algodoncillo** (por las semillas) o **venenillo** (por el látex tóxico) [CCA-2008].
- **~115 especies** en Norteamérica y el Caribe; **más de 140** en el mundo [CCA-2008]. El NPS dice «más de 200
  especies de milkweed» en el mundo [NPS-ACADIA-2023] (probablemente con una definición más amplia; las dos cifras van).
- También comen enredaderas parientes: *Sarcostemma*, *Cynanchum* y *Matelea* [CCA-2008].
- **En México**: *Asclepias curassavica* (algodoncillo tropical, veintiunilla) «es probablemente la especie hospedera más
  importante»; también se hallaron huevos y larvas en *A. glaucescens* en Michoacán [CCA-2008].
- En el norte (EE. UU. y Canadá), *A. syriaca*, el algodoncillo común; en el sur de EE. UU., *A. viridis*, *A. asperula*
  y *A. oenotheroides* [CCA-2008].
- **Defensa:** el látex tiene cardenólidos; la oruga los guarda y queda tóxica para casi todos los vertebrados
  [CCA-2008] [NPS-ACADIA-2023].

**Aplicación en Monarch:** la planta de la actividad de plantación y del ciclo debe ser un algodoncillo
(*A. curassavica* es la que tiene sentido en México). Hoy no hay modelo libre de asclepia (ver `LEEME.md`), y por eso el
minijuego usa otra flor: eso está bien **para néctar**, no para poner huevos.

## 6. Plantas nectaríferas

- Generalista: muchas flores [CCA-2008].
- Ejemplos en la migración de otoño [CCA-2008]: **vara de oro** (*Solidago*), **aster** (*Aster*), **liatris**
  (*Liatris*) en el norte; **verbesina** (*Verbesina virginica*) en Texas; campos de trébol, girasol y alfalfa.
- El propio algodoncillo es fuente de néctar para muchos insectos [CCA-2008], y en el oeste árido puede ser la principal
  [USFWS-SSA-2024].
- **Pendiente:** nectaríferas de los santuarios de México con fuente.

**Aplicación en Monarch:** el minijuego «Flores en el camino» usa *Empodium* (Poly Haven, CC0), un género de flor del sur
de África. Como néctar «de cualquier flor» no es falso, pero **no hay que decir ni dar a entender que es una flor de la
ruta**. Si se consigue un modelo libre, mejor un girasol, un aster o una vara de oro.

---

## 7. Generaciones, súper generación, diapausa y longevidad

- **Generaciones al año:** de 3 a 5, según el ambiente [USFWS-SSA-2024] [USFWS-FR-2024]; MJV y el NPS hablan de 4
  [MJV-MIGRACION] [NPS-GRCA-2023]. Flockhart et al. muestrean hasta una quinta generación en septiembre–octubre
  [FLOCKHART-2013].
- **La generación migratoria** («súper generación»; la CCA la llama «generación Matusalén»): en el este, la que emerge
  **después de mediados de agosto**, normalmente la cuarta del año [MJV-MIGRACION] [CCA-2008].
- **Diapausa reproductiva:** «un estado en el que se detiene el desarrollo reproductivo de machos y hembras», causado por
  la **hormona juvenil suprimida** [HERMAN-TATAR-2001]. La disparan los días más cortos, las noches más frías y quizá la
  planta envejecida [CCA-2008].
- **Longevidad:** las de verano viven **2–5 semanas** como adultas [MJV-CICLO] [USFWS-SSA-2024] (MJV en otra página dice
  2–6 [MJV-MIGRACION]; la CCA «alrededor de cuatro semanas»). La migratoria vive **6–9 meses** [USFWS-SSA-2024]
  [MJV-MIGRACION] (la CCA: 7–9 [CCA-2008]); Herman y Tatar: «de agosto/septiembre a marzo» [HERMAN-TATAR-2001].
- **Por qué vive más:** quitarle a una adulta de verano la fuente de la hormona juvenil le alarga la vida un 100 %; darle
  la hormona a una migrante se la acorta [HERMAN-TATAR-2001].

### La ida y la vuelta: lo que hace cada generación (población oriental)

1. **Otoño:** la generación migratoria vuela del norte a México [MJV-MIGRACION].
2. **Invierno:** en diapausa en los bosques de oyamel [USFWS-SSA-2024].
3. **Febrero–marzo:** **las mismas mariposas** rompen la diapausa, se aparean y **empiezan el regreso**: vuelan hacia el
   sur de EE. UU., ponen huevos y mueren [USFWS-SSA-2024] [MJV-MIGRACION]. La CCA lo dice así: la migratoria «puede vivir
   hasta nueve meses y hacer el viaje de ida y vuelta» [CCA-2008].
4. **Abril–mayo:** la **primera generación** nace sobre todo en el **este de Texas y el sur de Oklahoma** [FLOCKHART-2013].
5. **Verano:** dos o tres generaciones más terminan de subir hasta Canadá [USFWS-SSA-2024] [FLOCKHART-2013] (el USFS
   dice que hacen falta 3–4 generaciones para llegar al norte [USFS-MIGRACION]).

**Lo que hay que decir:** una misma mariposa hace la ida completa y **empieza** la vuelta, pero **ninguna termina el
regreso al norte**: eso lo hacen sus hijas, nietas y bisnietas. Decir «ninguna hace sola la ida y la vuelta» es
impreciso (ver la [auditoría](#12-auditoría-lo-que-monarch-dice-hoy)).

---

## 8. La migración

### 8.1 Dos poblaciones

| | Oriental | Occidental |
|---|---|---|
| Dónde se reproduce | Centro y este de EE. UU. y sur de Canadá [CCA-2008] | Oeste de las Rocosas, oeste de EE. UU. y Canadá [CCA-2008] [USFWS-SSA-2024] |
| Dónde inverna | Bosques de oyamel en el este de Michoacán y el oeste del Estado de México [CCA-2008] | Arboledas de la costa de California y Baja California; algunas a Arizona y Sonora [USFWS-SSA-2024] [CCA-2008] |
| Distancia volada | Más de 3,000 km; hasta ~4,800 km [USFWS-SSA-2024] [MJV-MIGRACION] | 500–1,600 km [USFWS-SSA-2024] [USFWS-FR-2024] |
| Árboles | Oyamel (*Abies religiosa*) [USFWS-SSA-2024] | Eucalipto (introducido), pino y ciprés de Monterey [USFWS-SSA-2024] [CCA-2008] |
| Sitios | Menos de 20 en México [USFWS-FR-2024]; 11–12 macizos [USFS-MIGRACION] | Unas 400 arboledas, ~1,225 km de costa; cada año sólo una parte [USFWS-SSA-2024] |
| Llegada | Últimos días de octubre [TAYLOR-2019] | Hacia finales de octubre [MJV-MIGRACION] |
| Salida | Febrero–marzo [USFWS-SSA-2024] | Febrero–marzo [MJV-MIGRACION] |
| Cuántas hay hoy | 2.93 ha de colonias en 2025-2026 [EXPANSION-2026] | 12,260 contadas en 249 sitios en 2025 [XERCES-2026] |

No están separadas del todo: algunas del oeste bajan por Arizona a Sonora [CCA-2008], y la SSA dice que los datos de
marcaje sugieren que las de Nevada van a California, las de Nuevo México a México y las de Arizona a cualquiera de los
dos [USFWS-SSA-2024].

### 8.2 Distancias: línea recta contra ruta real

**La regla:** la distancia en línea recta (la más corta sobre la Tierra) **no es** lo que vuela la mariposa. Para una
mariposa concreta nadie conoce la ruta exacta: «We won't ever know exactly what this butterfly's route was»
[MW-2025]. Las cifras de distancia que dan las instituciones son **voladas y aproximadas**; las de línea recta de abajo
son **cálculo propio** (gran círculo, radio terrestre 6,371 km, hasta El Rosario ≈ 19.59 N, 100.27 O).

| Desde | Línea recta a El Rosario (cálculo propio) |
|---|---|
| Toronto, Ontario | 3,307 km |
| Halifax, Nueva Escocia | 4,378 km |
| Winnipeg, Manitoba | 3,382 km |
| Minneapolis, Minnesota | 2,896 km |
| Cape May, Nueva Jersey | 3,247 km |
| San Antonio, Texas | 1,108 km |
| 49.34 N sobre 100.3 O (inicio del modelo de Taylor 2019) | 3,308 km |

Contraste con lo publicado:

- «Más de 3,000 km» [USFWS-SSA-2024] [USFWS-FR-2024]; «hasta 3,000 millas» (≈ 4,800 km) [MJV-MIGRACION]
  [USFS-MIGRACION]; «más de 4,000 km» [TAYLOR-2019]; «la mayoría, más de 2,500 km» [CCA-2008]; «3 mil kilómetros desde
  Canadá hasta México en tan sólo dos meses» [CONAFOR-2013]. **No se contradicen:** dependen de dónde sale cada una.
- Taylor et al. modelan una ruta de **3,300 km** desde 49.34 N hasta la Reserva [TAYLOR-2019]; nuestro cálculo en línea
  recta para ese punto da 3,308 km, o sea que esa cifra es prácticamente la línea recta, no un trayecto con curvas.
- El mapa de Monarch dibuja una poligonal desde (46 N, 79.5 O) que mide **3,617 km**; la recta entre sus extremos mide
  3,493 km (cálculo propio). Está bien como ruta ilustrativa, pero el número que se diga no debe presentarse como «la»
  distancia.
- Ejemplo real de Monarch Watch: una hembra marcada en Biddeford, Maine, el 28 de agosto, encontrada en Perryton, Texas,
  el 15 de octubre de 2025: «just shy of 1,700 miles» de gran círculo en unas seis semanas, y todavía no llegaba a México
  [MW-2025]. Cuenta propia con ese caso: la recta de Maine a El Rosario mide **3,840 km**, pero esta mariposa, a mediados
  de octubre, ya estaba **más al oeste que El Rosario** y todavía a 36° N. Aunque desde ahí volara en línea recta
  (1,870 km), su viaje sería de al menos **4,558 km** (2,688 + 1,870). La ruta real no se parece a la recta.

### 8.3 Ritmo y calendario (oriental)

- **Por mariposa:** 50–100 millas al día (80–160 km), récord de 265 millas (426 km) en un día [USFS-MIGRACION];
  «recorriendo 130 kilómetros por día» de promedio [CONAFOR-2013].
- **El frente de la migración** (marcaje) avanza más despacio, unos 17–47 km por día según la quincena, el máximo hacia el
  1 de octubre [TAYLOR-2019]. **No confundir:** una cosa es cuánto vuela una mariposa en un día y otra cuánto avanza la
  migración entera.
- **Calendario:** empieza a principios de agosto en el norte y desde mediados de agosto en general [TAYLOR-2019]
  [MJV-MIGRACION]; se encauza por Texas en octubre y noviembre [USFWS-SSA-2024]; llegan a la Reserva en los últimos días
  de octubre, «roughly coinciding with the Day of the Dead (2 November)»; colonias visibles a mediados de noviembre;
  últimas llegadas a principios de diciembre [TAYLOR-2019]. El viaje dura hasta dos meses o más [USFS-MIGRACION]
  [USFWS-SSA-2024].
- **Regreso:** salen en febrero–marzo [USFWS-SSA-2024]; entran a Texas en marzo [MJV-MIGRACION].

**Aplicación en Monarch:** el mapa debe mostrar las **dos** poblaciones (hoy sólo dibuja la oriental) y, si da tiempo, la
ida en un color y el regreso escalonado por generaciones en otro. La guía de mariposas del punto 10 puede hacer que la
bandada «se vaya» hacia el suroeste cuando el narrador cuente la migración.

---

## 9. México: santuarios, Reserva y temporadas

### 9.1 Los santuarios

- **11–12 macizos montañosos** del Estado de México y Michoacán [USFS-MIGRACION]; «doce macizos diferentes en el Eje
  Neovolcánico Transversal» [CCA-2008].
- Bosque de **oyamel (*Abies religiosa*)**, un abeto [USFWS-SSA-2024] [CCA-2008], en laderas que miran al sur-suroeste
  [JN-INVERNADA].
- Altitud: 2,400–3,600 m [USFS-MIGRACION]; 2,900–3,300 m [USFWS-SSA-2024] [USFWS-FR-2024]; ~3,000 m [MJV-MIGRACION].
- Temperatura: 0–15 °C; si hace más frío gastan sus reservas de grasa [USFS-MIGRACION].
- De todo el polígono de ~10,000 km², sólo ~562 km² tienen el microclima que necesitan [CCA-2008].
- Viven en **racimos densos en ramas y troncos**, con metabolismo bajo y poca actividad de mediados de noviembre a
  mediados de marzo [CCA-2008]. Sierra Chincua y El Rosario están abiertos al público [JN-INVERNADA].

**Aplicación en Monarch:** la «colonia» de hoy son 18 mariposas volando en círculos. Lo que se ve de verdad son
**racimos colgados** de ramas y troncos, casi quietos, con unas pocas volando cuando sale el sol.

### 9.2 La Reserva de la Biosfera Mariposa Monarca (RBMM)

- **56,259 ha**: tres zonas núcleo (**13,551 ha**) y dos de amortiguamiento (**42,707 ha**) (CONANP 2001, citada en
  [CONAFOR-2013]). La SSA y el Federal Register dicen «más de 56,000 ha» [USFWS-SSA-2024] [USFWS-FR-2024].
- Municipios: Temascalcingo, San José del Rincón, Donato Guerra y Villa de Allende (Edomex); Contepec, Senguio,
  Angangueo, Ocampo, Zitácuaro y Áporo (Michoacán). Altitudes de 2,040 a 3,640 msnm [CONAFOR-2013].
- Decretos de 1980, 1986 y 2000; el de 2000 (10 de noviembre) amplió la zona núcleo de 4,490 a 13,551 ha. Patrimonio
  Mundial de la UNESCO en **2008** [CONAFOR-2013]. La página de la UNESCO no la pude abrir (ver abajo).

### 9.3 Superficie ocupada por temporada

Lo que se mide cada invierno es **el bosque que ocupan las colonias**, no el número de mariposas.

| Temporada | Hectáreas | Fuente |
|---|---|---|
| 1996-1997 | **18.19** (máximo histórico) | [EXPANSION-2026] [UNOTV-2026] |
| 2013-2014 | **0.67** (mínimo histórico) | [UNOTV-2026] |
| 2024-2025 | 1.79 | [EXPANSION-2026] [UNOTV-2026] [MW-2026] |
| 2025-2026 | **2.93** (+64 %) | [EXPANSION-2026] [UNOTV-2026] [MW-2026] |

Temporada 2025-2026, detalle: **9 colonias**, 3 en Michoacán y 6 en el Estado de México; 5 dentro de la Reserva y 4
fuera [UNOTV-2026]; la mayor en el **Ejido El Rosario, 1.62 ha**, y la menor en San Francisco, Michoacán, 0.031 ha. La
midieron la CONANP y WWF México visitando 13 santuarios, con imágenes satelitales y análisis geoespacial
[EXPANSION-2026].

Degradación de la zona núcleo, **febrero 2024 – febrero 2025: 2.55 ha** (tala ilegal 1.85, incendios 0.58, sequía 0.11;
las tres suman 2.54 por redondeo). Informe de **WWF México con apoyo técnico de la UNAM** [EXPANSION-2026].

**Ojo:** estas cifras de temporada las confirmé en tres medios que reportan el anuncio oficial del 17 de marzo de 2026;
la página de WWF con el informe me devolvió 403 (ver abajo).

---

## 10. Estado de conservación

- **UICN:** la monarca **migratoria** (subespecie *Danaus plexippus plexippus*) entró como **En Peligro** en julio de
  2022; el 27 de septiembre de 2023 se anunció su paso a **Vulnerable**, publicado el 7 de diciembre de 2023. La UICN
  dijo que sus modelos anteriores eran «too precautionary»: **la caída es más lenta de lo que se pensaba, no que la
  población se haya recuperado** [NATGEO-2023].
- **EE. UU.:** el USFWS **propuso** listarla como amenazada (Federal Register del 12 de diciembre de 2024, comentarios
  hasta el 12 de marzo de 2025) [USFWS-FR-2024]; al 21 de septiembre de 2026, «There has not yet been a final ruling»
  [USFWS-MONARCA]. Probabilidad de extinción hacia 2080: 56–74 % la oriental y más de 95 % la occidental [USFWS-MONARCA].
- **Occidental:** 12,260 en 2025, la tercera cifra más baja desde 1997 (después de 2020, con 1,901, y 2024, con 9,119);
  en los años ochenta eran «low millions» [XERCES-2026].

---

## 11. Lo que Monarch NO debe decir

- Que **una** mariposa hace todo el viaje redondo, o que **ninguna** hace parte de la vuelta. (La migratoria hace la ida y
  empieza la vuelta; la terminan sus descendientes.)
- Que la distancia «es» una cifra única, o presentar la línea recta como ruta volada.
- Que en el santuario «duermen» o «hibernan» como un oso: están en **diapausa reproductiva**, casi quietas por el frío, y
  salen a beber en días tibios.
- Que la población «se recuperó» o que la UICN la bajó a Vulnerable porque mejoró.
- Que la oruga «muda cinco veces para crecer».
- Una cifra de horas para el secado de alas (ninguna fuente leída la da).
- Que la flor del minijuego es una flor de la ruta migratoria.

---

## 12. Auditoría: lo que Monarch dice hoy

Revisé `monarca.js` (carteles, etapas, cuestionario, mapa), `narrador.js` (todas las líneas; los audios son esas mismas
frases leídas, así que la corrección del texto aplica también al audio), `travesuras.js` (sólo lógica, sin datos
científicos), `DOCENTE.md` y `LEEME.md`. **No edité ninguno.**

Leyenda: ✅ correcto · ⚠️ impreciso · ❌ incorrecto · ❔ sin fuente verificada.

| Dónde | Lo que dice hoy | Veredicto | Cómo debe decir | Fuente |
|---|---|---|---|---|
| `monarca.js` escena `mariposa`; `narrador.js` `e-mariposa` | «La hembra pone sus huevos sólo en el algodoncillo (asclepia). Es lo único que comen sus orugas.» | ✅ (matiz) | Correcto. Si se quiere precisión: «sólo en algodoncillos (asclepias y unas enredaderas parientes)». | [NPS-GRCA-2023] [CCA-2008] |
| `mariposa`; `e-mariposa` | «Ya adulta, toma néctar de muchas flores.» | ✅ | — | [CCA-2008] [MJV-CICLO] |
| `mariposa`, `flores` | `fuente: 'National Park Service'` | ⚠️ | Hay varias páginas del NPS con ese título; poner la que se usó: «NPS, Grand Canyon, *Milkweed and Monarchs*, 2023». | [NPS-GRCA-2023] |
| escena `ciclo`; `e-ciclo` | «muda de piel 5 veces para crecer» / «muda de piel cinco veces para crecer» | ⚠️ | «Pasa por cinco etapas de oruga: cambia de piel cuatro veces mientras crece, y la quinta vez que se la quita ya es crisálida.» | [MJV-CICLO] [USFWS-SSA-2024] |
| `ciclo`; `e-ciclo` | «En verano, de huevo a adulta tarda menos de 30 días; con frío, más.» | ⚠️ | «En verano, de huevo a adulta tarda unas cuatro semanas (de tres a cinco, según el calor); en primavera fresca, hasta 40 o 50 días.» Las sumas de etapas dan 20–34 días (MJV) y 17–37 (SSA): «menos de 30» deja fuera buena parte del rango. | [MJV-CICLO] [USFWS-SSA-2024] [NPS-ACADIA-2023] |
| `ciclo`, etapa Huevo | «~4 días» | ✅ | (Rango: 3–5.) | [MJV-CICLO] [USFS-BIOLOGIA] |
| `ciclo`, etapa Oruga | «9 a 14 días» | ✅ | (La SSA da 9–18.) | [MJV-CICLO] |
| `ciclo`, etapa Crisálida | «9 a 15 días» | ✅ | Está en el rango de la CCA; MJV da 8–15 y la SSA 6–14. | [CCA-2008] [MJV-CICLO] |
| `ciclo` | Cuatro etapas: Huevo, Oruga, Crisálida, «Adulta: vuela» | ⚠️ | Falta el paso entre crisálida y vuelo: «Adulta: varias horas secando las alas, y luego vuela». Es justo lo que pide el punto 13 («no debe volar inmediatamente»). | [MJV-CICLO] |
| `ciclo` | `fuente: 'U.S. Forest Service · USFWS'` | ⚠️ | La página de biología del USFS que leí no da 9–14 ni 9–15 días. Poner las que sí: «Monarch Joint Venture · CCA (2008)». | [MJV-CICLO] [CCA-2008] |
| escena `flores`; `e-flores`; `LEEME.md` | Plantar flores de *Empodium* «en el camino» de la monarca | ⚠️ | *Empodium* es un género del sur de África. Como «una flor con néctar» sirve; no presentarla como flor de la ruta. Mejor un girasol, aster o vara de oro cuando haya modelo libre. | [CCA-2008] |
| escena `migracion`; `e-migracion` | «Cada otoño viajan más de 3,000 km hasta el centro de México» | ⚠️ | «Las que salen del norte vuelan más de 3,000 km; las del sur de EE. UU., mucho menos.» No todas recorren 3,000 km. | [USFWS-SSA-2024] [CCA-2008] |
| `migracion`; `e-migracion` | «desde Canadá, unos 4,500» | ⚠️ | Desde el sur de Canadá la **línea recta** es de 3,300 km (Ontario) a 4,400 km (Nueva Escocia), y la ruta volada es más larga. Decir: «Desde Canadá, de 3,300 a más de 4,000 km, y nunca en línea recta.» O usar la cifra publicada: «hasta unos 4,800 km». | [MJV-MIGRACION] [TAYLOR-2019] + cálculo propio |
| `migracion`; `e-migracion`; `DOCENTE.md` | «Ninguna hace sola la ida y la vuelta: es un viaje de varias generaciones.» | ❌ | «La que baja a México también **empieza** el regreso: en primavera vuela al sur de Estados Unidos, pone huevos y muere. Sus hijas, nietas y bisnietas terminan el viaje al norte.» | [USFWS-SSA-2024] [CCA-2008] [FLOCKHART-2013] |
| `migracion`; `e-migracion` | «La que viaja al sur vive hasta unos 9 meses; las de verano, semanas.» | ✅ | (Precisión opcional: «de seis a nueve meses; las de verano, de dos a cinco semanas».) | [USFWS-SSA-2024] [MJV-CICLO] |
| `migracion` | `fuente: 'U.S. Fish & Wildlife Service, 2024'` | ✅ | (La SSA 2024 sostiene ambas cifras.) | [USFWS-SSA-2024] |
| mapa (`RUTA`) | Sólo dibuja la ruta oriental | ⚠️ | El encargo pide diferenciar oriental y occidental: añadir la occidental (de las Rocosas a la costa de California, 500–1,600 km). La poligonal oriental mide 3,617 km (cálculo propio): no decir que esa es «la» distancia. | [USFWS-SSA-2024] |
| `PREGUNTAS[2]`; `q-3`; `q-3-mal` | «¿Una sola mariposa hace la ida y la vuelta?» → «No: son varias generaciones» / «Ninguna hace sola la ida y la vuelta.» | ❌ | Pregunta: «¿Una sola mariposa termina el regreso hasta Canadá?» → «No: lo terminan sus descendientes». `q-3-mal`: «No. La que baja a México empieza el regreso, pero lo terminan sus hijas y nietas.» | [USFWS-SSA-2024] [FLOCKHART-2013] |
| `narrador.js` `r-quieto-2` | «Ella vuela más de tres mil kilómetros.» | ⚠️ | «Ella vuela miles de kilómetros.» (no todas hacen 3,000). | [CCA-2008] |
| escena `santuario`; `e-santuario` | «11 o 12 montañas de Michoacán y el Estado de México, de octubre a finales de marzo, en bosques de oyamel» | ✅ | — | [USFS-MIGRACION] [CCA-2008] |
| `santuario`; `e-santuario` | «La Reserva … mide 56,259 ha y es Patrimonio Mundial desde 2008.» | ✅ | — | [CONAFOR-2013] |
| `santuario` | `fuente: 'U.S. Forest Service · UNESCO'` | ⚠️ | La cifra de 56,259 ha es de la CONANP: «USFS · CONANP · UNESCO». | [CONAFOR-2013] |
| `e-santuario` | «Mira a tu alrededor. Despacio. Están dormidas.» | ⚠️ | «Están casi quietas por el frío, ahorrando grasa. En los días tibios bajan a beber agua.» (No duermen: están en diapausa.) | [CCA-2008] [HERMAN-TATAR-2001] |
| `santuario` (la colonia en 3D) | 18 mariposas volando en círculos | ⚠️ | Racimos colgados de ramas y troncos, casi quietos; unas pocas en vuelo. | [CCA-2008] |
| escena `tala`; `e-tala` | «Entre febrero de 2024 y febrero de 2025 se degradaron 2.55 ha del corazón de la reserva: tala ilegal 1.85, incendios 0.58, sequía 0.11.» | ✅ | (Las tres suman 2.54: redondeo del informe.) | [EXPANSION-2026] |
| `e-tala` | «en la última temporada, todas las colonias juntas ocuparon menos de tres hectáreas» | ✅ | (2.93 ha.) | [EXPANSION-2026] |
| `PREGUNTAS[4]`; `q-5-mal` | «¿Qué degradó más bosque en 2024-2025?» → «La tala ilegal», «1.85 ha» | ✅ | — | [EXPANSION-2026] |
| escena `campo`; `e-campo` | «Sin algodoncillo no hay orugas, y sin orugas no hay migración.» | ✅ | — | [NPS-GRCA-2023] |
| `campo`; `e-campo` | «En 2022 la UICN la puso En Peligro; en 2023, Vulnerable.» | ✅ (matiz) | Precisar que es la **monarca migratoria** (la subespecie). | [NATGEO-2023] |
| `e-campo` | «Mejoró. Un poco. No lo celebres todavía.» | ⚠️ | La UICN la bajó porque revisó sus modelos, no porque la población mejorara: «La UICN revisó sus cálculos: cae más despacio de lo que se creía. Pero sigue cayendo.» | [NATGEO-2023] |
| escena `decision`; `r-talar` | «el bosque tarda décadas en volver» | ❔ | Suena razonable, pero no lo verifiqué. Dejarlo como opinión del dilema o buscar fuente. | — |
| escena `final`; `e-final` | «Temporada 2025-2026: 2.93 ha, 64 % más que el año anterior. Máximo 18.19 ha (1996-97), mínimo 0.67 ha (2013-14).» | ✅ | — | [EXPANSION-2026] [UNOTV-2026] [MW-2026] |
| `narrador.js` `r-tocar-mariposa` | «Sus alas están cubiertas de escamas muy delicadas.» | ✅ | (Es lo que define a los lepidópteros: «alas con escamas»; no busqué fuente aparte.) | — |
| `DOCENTE.md` | «Cuestionario: 4 preguntas» | ⚠️ (no científico) | Hoy son 5 (`PREGUNTAS` tiene 5). | — |
| `DOCENTE.md` | «La migración: Más de 3,000 km; varias generaciones» | ⚠️ | «Miles de kilómetros (más de 3,000 desde el norte); la que baja empieza el regreso y sus descendientes lo terminan.» | [USFWS-SSA-2024] |
| `LEEME.md` | «el oyamel es un abeto» | ✅ | (*Abies religiosa*.) | [USFWS-SSA-2024] |

---

## Bibliografía

Todas consultadas el **23 de noviembre de 2026**. «Fecha de publicación» es la que muestra la página; si no muestra
ninguna, se dice.

**[MJV-CICLO]** Monarch Joint Venture. *Life Cycle*. https://monarchjointventure.org/monarch-biology/life-cycle ·
Publicación: no la muestra (pie «© 2026»). · Obtenido: duración del huevo (3–5 días, «about four»), cinco estadios con
días y medidas, larva 9–14 días, crisálida 8–15, crecimiento ~2,000 veces su masa, 300–500 huevos (récord 1,179), madurez
3–8 días, cópula hasta 16 h, adultas de verano 2–5 semanas, migratoria hasta 9 meses, huevo en el envés de una hoja cerca
de la punta, se come el cascarón, J y cojín de seda, alas visibles sin que la cubierta se vuelva transparente, bombea
fluido, «several hours drying», primavera hasta 40–50 días. · En Monarch: base de las duraciones del ciclo y de la
secuencia de emergencia.

**[MJV-MIGRACION]** Monarch Joint Venture. *Migration*. https://monarchjointventure.org/monarch-biology/monarch-migration ·
Publicación: no la muestra (© 2026). · Obtenido: «up to 3,000 miles» a México; occidental a la costa de California;
salida desde mediados de agosto; llegada desde principios de noviembre; oyamel a ~3,000 m; regreso a Texas en marzo;
generación migratoria = la cuarta; diapausa; occidental 6–9 meses contra 2–5 semanas, llega a finales de octubre y sale
en febrero–marzo; más de 400 sitios históricos en California. · En Monarch: escena de migración, mapa y diferencias
entre poblaciones.

**[USFS-BIOLOGIA]** USDA Forest Service. *Monarch Butterfly Biology*.
https://www.fs.usda.gov/wildflowers/pollinators/Monarch_Butterfly/biology/index.shtml · Publicación: no la muestra. ·
Obtenido: 100–300 huevos por hembra, eclosión a unos 4 días, larva de <1 a ~5 cm, adultas de verano 2–5 semanas,
migratoria hasta 9 meses, hasta cuatro generaciones. · En Monarch: respaldo del huevo de ~4 días; contraste del número de
huevos.

**[USFS-MIGRACION]** USDA Forest Service. *Monarch Butterfly Migration and Overwintering*.
https://www.fs.usda.gov/wildflowers/pollinators/Monarch_Butterfly/migration/index.shtml · Publicación: no la muestra. ·
Obtenido: «as far as 3,000 miles», 50–100 millas por día, récord de 265 millas en un día, hasta dos meses de viaje, 11–12
áreas montañosas en Edomex y Michoacán, oyamel a 2,400–3,600 m, 0–15 °C, de octubre a finales de marzo, 3–4 generaciones
para llegar al norte, RBMM creada en 1986. · En Monarch: escena del santuario y ritmo de vuelo.

**[USFWS-SSA-2024]** U.S. Fish and Wildlife Service. *Monarch Butterfly (Danaus plexippus) Species Status Assessment
Report, version 2.3*. https://fws.gov/sites/default/files/documents/2025-01/ssa_monarch-butterfly_2024.pdf · Publicación:
diciembre de 2024. · Obtenido (págs. 5–15): huevo 2–5 días, cinco estadios en 9–18 días, crisálida 6–14 días (de Zalucki
1982, a 22–32 °C), adultas 2–5 semanas, migratorias en diapausa 6–9 meses (Herman y Tatar 2001), no se desarrolla bajo
12 °C ni sobre 33 °C, migración de más de 3,000 km y más de dos meses, rompen la diapausa en febrero–marzo y las mismas
mariposas empiezan el regreso, de México a Canadá en 2–3 generaciones (Flockhart 2013), 3–5 generaciones al año,
occidental 500–1,600 km (Yang 2016), sitios a 2,900–3,300 m, RBMM de más de 56,000 ha, ~400 arboledas en ~1,225 km de
costa, se encauzan por Texas en octubre–noviembre, posible ruta por Florida a Cuba y Yucatán. · En Monarch: la fuente
principal de las cifras del juego.

**[USFWS-FR-2024]** U.S. Fish and Wildlife Service. *Threatened Species Status With Section 4(d) Rule for Monarch
Butterfly and Designation of Critical Habitat* (propuesta). Federal Register 89 (239): 100662–100716.
https://www.govinfo.gov/content/pkg/FR-2024-12-12/html/2024-28855.htm · Publicación: 12 de diciembre de 2024. ·
Obtenido: propuesta de especie amenazada, comentarios hasta el 12 de marzo de 2025, «over 2,000 miles (3,000 km)»,
occidental «300 mi to 1,000 mi (500 km to 1,600 km)», 3–5 generaciones, migratorias 6–9 meses, sitios a 2,900–3,300 m,
RBMM de más de 56,000 ha, menos de 20 sitios en México, ~400 arboledas en California. (Leí la primera tercera parte del
documento.) · En Monarch: estado legal en EE. UU. y confirmación de cifras de la SSA.

**[USFWS-MONARCA]** U.S. Fish and Wildlife Service. *Save the Monarch*. https://fws.gov/monarch · Publicación:
actualizada el 21 de septiembre de 2026. · Obtenido: no hay decisión final de listado; probabilidad de extinción hacia
2080 de 56–74 % (oriental) y más de 95 % (occidental). · En Monarch: escena de amenazas o final, si se quiere el dato
de EE. UU.

**[CCA-2008]** Comisión para la Cooperación Ambiental (Canadá, EE. UU. y México). *Plan de América del Norte para la
conservación de la mariposa monarca*.
https://www.cec.org/files/documents/publications/2350-north-american-monarch-conservation-plan-es.pdf · Publicación:
junio de 2008 (con revisión de especialistas). · Obtenido (págs. 12–19): adultas de verano 2–5 semanas y migratorias 7–9
meses («generación Matusalén», «hacer el viaje de ida y vuelta»), huevos 1.2 × 0.9 mm, 300–400 en el campo, larvas en 3–5
días y cinco fases en 9–13 días, crisálida de 3 cm durante 9–15 días con las alas visibles el último día, ~115 especies de
*Asclepias* en Norteamérica y el Caribe y más de 140 en el mundo, enredaderas *Sarcostemma*, *Cynanchum* y *Matelea*,
*A. curassavica* como hospedera más importante en México y *A. glaucescens* en Michoacán, nectaríferas de otoño
(*Solidago*, *Aster*, *Liatris*, *Verbesina virginica*), diapausa disparada por días cortos y noches frías, «más de
2,500 km», doce macizos, racimos en ramas y troncos, actividad mínima de mediados de noviembre a mediados de marzo, 562 km²
con microclima de 10,000 km², salen a beber agua, más de 300 sitios en California, algunas del oeste llegan a Sonora. ·
En Monarch: fuente principal en español para plantas, santuario y comportamiento.

**[CONAFOR-2013]** Comisión Nacional Forestal, Fondo Mexicano para la Conservación de la Naturaleza y Fondo Monarca.
*El Fondo Monarca: un instrumento innovador de pago por servicios ambientales…*.
https://www.gob.mx/cms/uploads/attachment/file/85092/El_Fondo_Monarca.pdf · Publicación: primera edición, 2013. ·
Obtenido: RBMM de 56,259 ha (núcleo 13,551, amortiguamiento 42,707; cita CONANP 2001), municipios, altitudes de 2,040 a
3,640 msnm, decretos de 1980, 1986 y 2000, núcleo ampliado de 4,490 a 13,551 ha, UNESCO 2008, «3 mil kilómetros desde
Canadá hasta México en tan sólo dos meses», «130 kilómetros por día», la oruga «aumenta 3 mil veces su tamaño» y se
cuelga en J. · En Monarch: datos de la Reserva.

**[EXPANSION-2026]** Expansión Política (Brenda Yañez). *Ocupación de la mariposa monarca en México crece 64% en la
temporada 2025-2026*.
https://politica.expansion.mx/mexico/2026/03/17/ocupacion-de-la-mariposa-monarca-en-mexico-crece-64-en-la-temporada-2025-2026 ·
Publicación: 17 de marzo de 2026. · Obtenido: 2.93 ha contra 1.79, nueve colonias (3 Michoacán, 6 Edomex), El Rosario
1.62 ha, San Francisco 0.031 ha, máximo 18.19 ha (1996-1997), monitoreo de CONANP y WWF en 13 santuarios, degradación
de 2.55 ha (feb 2024–feb 2025) con tala 1.85, incendios 0.58 y sequía 0.11, informe de WWF con apoyo técnico de la UNAM.
· En Monarch: escenas de tala y final. (Es prensa que reporta el anuncio oficial; la fuente primaria de WWF no abrió.)

**[UNOTV-2026]** Uno TV (Melina Ochoa). *Aumenta 64% la presencia de mariposa monarca en México, pero su ocupación aún es
baja: Semarnat*.
https://www.unotv.com/ciencia-y-tecnologia/aumenta-64-la-presencia-de-mariposa-monarca-en-mexico-pero-su-ocupacion-aun-es-baja-semarnat/ ·
Publicación: 17 de marzo de 2026. · Obtenido: 2.93 y 1.79 ha, nueve colonias, 5 dentro y 4 fuera de la RBMM, El Rosario
1.62 ha, máximo 18.19 ha (1996-1997) y mínimo 0.67 ha (2013-2014). · En Monarch: escena final (confirma el mínimo).

**[MW-2026]** Monarch Watch, Universidad de Kansas (Jim Lovett). *Monarch Population Status*.
https://monarchwatch.org/blog/2026/03/17/monarch-population-status-55/ · Publicación: 17 de marzo de 2026. ·
Obtenido: nueve colonias, 2.93 ha, 64 % más que 1.79 ha. · En Monarch: tercera confirmación de la temporada.

**[MW-2025]** Monarch Watch. *A Remarkable Recovery*. https://monarchwatch.org/blog/2025/10/31/a-remarkable-recovery/ ·
Publicación: 31 de octubre de 2025. · Obtenido: hembra ALNT377 marcada en Biddeford, Maine (28 de agosto) y hallada al sur
de Perryton, Texas (15 de octubre de 2025), «just shy of 1,700 miles» de gran círculo en unas seis semanas; «We won't ever
know exactly what this butterfly's route was». · En Monarch: ejemplo de línea recta contra ruta real.

**[FLOCKHART-2013]** Flockhart, D. T. T., Wassenaar, L. I., Martin, T. G., Hobson, K. A., Wunder, M. B. y Norris, D. R.
*Tracking multi-generational colonization of the breeding grounds by monarch butterflies in eastern North America*.
Proceedings of the Royal Society B 280 (1768): 20131087. doi:10.1098/rspb.2013.1087.
https://pmc.ncbi.nlm.nih.gov/articles/PMC3757963 · Publicación: 7 de octubre de 2013 (revisado por pares). · Obtenido: la
primera generación (abril–mayo) nace sobre todo en el este de Texas y el sur de Oklahoma; generaciones muestreadas hasta
una quinta en septiembre–octubre; área de reproducción de más de 4.5 millones de km². · En Monarch: el regreso
escalonado por generaciones.

**[HERMAN-TATAR-2001]** Herman, W. S. y Tatar, M. *Juvenile hormone regulation of longevity in the migratory monarch
butterfly*. Proceedings of the Royal Society B 268 (1485): 2509–2514. doi:10.1098/rspb.2001.1765.
https://pmc.ncbi.nlm.nih.gov/articles/PMC1088908 · Publicación: 22 de diciembre de 2001 (revisado por pares). ·
Obtenido: las migrantes viven «from August/September to March» en diapausa reproductiva por la hormona juvenil
suprimida; sin la fuente de esa hormona, la supervivencia de las adultas de verano sube 100 %; con la hormona, la de las
migrantes baja. · En Monarch: explicar por qué la súper generación vive tanto.

**[TAYLOR-2019]** Taylor, O. R. Jr., Lovett, J. P., Gibo, D. L., Weiser, E. L., Thogmartin, W. E., Semmens, D. J.,
Diffendorfer, J. E., Pleasants, J. M., Pecoraro, S. D. y Grundel, R. *Is the Timing, Pace, and Success of the Monarch
Migration Associated With Sun Angle?* Frontiers in Ecology and Evolution 7: 442. doi:10.3389/fevo.2019.00442.
https://www.frontiersin.org/journals/ecology-and-evolution/articles/10.3389/fevo.2019.00442/full · Publicación: 10 de
diciembre de 2019 (revisado por pares). · Obtenido: empieza a principios de agosto en el norte; el frente avanza ~17–47 km
por día (43 km/día de máximo hacia el 1 de octubre); llegan a la RBMM en los últimos días de octubre, cerca del 2 de
noviembre; colonias a mediados de noviembre; últimas a principios de diciembre; «more than 4,000 km»; ruta modelada de
3,300 km desde 49.34 N. (Leí los primeros 100,000 caracteres de 126,000.) · En Monarch: calendario de la migración.

**[YANG-2016]** Yang, L. H., Ostrovsky, D., Rogers, M. C. y Welker, J. M. *Intra-population variation in the natal
origins and wing morphology of overwintering western monarch butterflies Danaus plexippus*. Ecography 39 (10).
doi:10.1111/ecog.01994. https://escholarship.org/uc/item/2nb0j62f · Publicación: 1 de octubre de 2016 (revisado por pares).
· Obtenido: las occidentales vienen de orígenes muy distintos, unas de cerca y otras de lejos, y las que viajan más
lejos tienen alas más grandes. **La cifra de 500–1,600 km que la SSA le atribuye no la encontré en el texto** de esta
versión; por eso esa cifra va con [USFWS-SSA-2024] y [USFWS-FR-2024]. · En Monarch: población occidental.

**[JN-INVERNADA]** Journey North (University of Wisconsin–Madison Arboretum). *All about monarch overwintering*.
https://journeynorth.org/monarch/Map_MX_MonarchOWSites.html · Publicación: actualizada el 8 de enero de 2026. ·
Obtenido: oyamel en laderas al sur-suroeste, «potentially 2,000 miles or more», Sierra Chincua y El Rosario abiertos al
público. · En Monarch: santuario.

**[JN-CRISALIDA]** Journey North. *Out of the Chrysalis*. https://archive.journeynorth.org/tm/monarch/sl/14/text.html ·
Publicación: no la muestra (archivo). · Obtenido: «about two weeks as a chrysalis»; emerge rompiendo la cubierta por una
línea débil; puede tardar varias horas después del cambio de color. · En Monarch: emergencia.

**[XERCES-2026]** The Xerces Society for Invertebrate Conservation. *Western Monarch Numbers Remain at Historic Low*.
https://xerces.org/press/western-monarch-numbers-remain-at-historic-low · Publicación: 29 de enero de 2026. · Obtenido:
~12,260 monarcas en 249 sitios en 2025, tercera cifra más baja desde 1997 (2020: 1,901; 2024: 9,119), «low millions» en
los años ochenta. · En Monarch: población occidental.

**[NPS-GRCA-2023]** National Park Service, Grand Canyon National Park. *Milkweed and Monarchs*.
https://www.nps.gov/grca/learn/nature/milkweed-and-monarchs.htm · Publicación: actualizada el 24 de enero de 2023. ·
Obtenido: «exclusively lay their eggs on milkweed», «the only plant monarch caterpillars will use to eat», adultas en
plantas con néctar, «4 generations every year». · En Monarch: escena «La monarca».

**[NPS-ACADIA-2023]** National Park Service, Acadia National Park. *Milkweed and Monarchs*.
https://www.nps.gov/articles/000/milkweed-and-monarchs.htm · Publicación: actualizada el 20 de marzo de 2023. · Obtenido:
sólo ponen y sólo comen algodoncillo, «over 200 different species of milkweed worldwide», glucósidos cardiacos, adultas
«in as few as 25 days». · En Monarch: ciclo y plantas.

**[NATGEO-2023]** National Geographic (Jason Bittel). *Monarch butterflies aren't endangered, reversing recent decision.
Is that good news?* https://www.nationalgeographic.com/animals/article/migratory-monarch-butterflies-not-endangered-vulnerable ·
Publicación: 4 de octubre de 2023. · Obtenido: la UICN pasó a la monarca migratoria de En Peligro a Vulnerable (anuncio
27 sep 2023, publicación 7 dic 2023) porque sus modelos eran «too precautionary»; occidental de ~10 millones en los
ochenta a 1,914 en 2021. · En Monarch: escena «Sin algodoncillo». (Fuente secundaria; la de la UICN, pendiente.)

**Cálculo propio.** Distancias en línea recta por la fórmula del gran círculo (haversine), radio 6,371 km, con
coordenadas aproximadas de cada ciudad y de El Rosario (19.59 N, 100.27 O). No es una fuente: es una cuenta para separar
línea recta de ruta.

## Fuentes que no pude abrir

No las cito como leídas. Lo que sé de ellas viene de otras fuentes y así se dice.

| Fuente | Qué pasó |
|---|---|
| UNESCO, *Monarch Butterfly Biosphere Reserve* (whc.unesco.org/es/list/1290 y /en/list/1290) | 403 |
| WWF, informe *Area of Forest Occupied by the Colonies of Monarch Butterflies in Mexico… 2025-2026* y su nota en español | 403 (por eso las cifras van con tres medios que reportan el anuncio) |
| Thogmartin et al. 2017, *Density estimates of monarch butterflies overwintering in central Mexico*, PeerJ 5:e3221 | 403. Según el índice de búsqueda da una mediana de 21.1 millones de mariposas por hectárea; **no lo uso** hasta leerlo |
| Univ. of Florida, *Book of Insect Records*, cap. 35 (récord de distancia) | 404 |
| monarchscience.org (récord de Nueva Escocia) | 403 |
| Monarch Lab (Univ. de Minnesota), página del ciclo de vida | 404 |

## Pendiente

- [ ] Horas de la J (prepupa) y del secado de alas con una fuente que dé número.
- [ ] Nectaríferas de los santuarios de México.
- [ ] Especies de *Asclepias* en México (CONABIO o UNAM).
- [ ] Fuente primaria de la UICN (2022 y 2023) y de la UNESCO.
- [ ] Una fuente de la UNAM o de la CONANP abierta directamente (hoy la CONANP llega citada por CONAFOR y por la prensa).
- [ ] Densidad de mariposas por hectárea (Thogmartin 2017), para traducir hectáreas a «millones de mariposas».
