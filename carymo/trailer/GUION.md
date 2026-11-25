# CARYMO · el tráiler

Carlos, 14 nov: *«un tráiler mamoncísimo… imágenes de la vida real… alguien levantando su teléfono y en el teléfono se abre un efecto de luz hacia el cielo… como para una película sobre una aplicación en la que todo empezó con un chavito, que su novia quería estudiar, y él le construyó una aplicación… con amor inspirado por Mónica… que no sepan qué estás viendo hasta el final: Grupo Mazi presenta CARYMO… que se nos queden pendejos los anuncios de Uber, DiDi, Google, Puma, Adidas»*.

## 1 · Lo que hacen los que mejor anuncian (y qué tomamos)

Estudio de campañas públicas conocidas. Va lo que se sabe de ellas, no números inventados.

| Quién | Qué hace | Qué tomamos |
|---|---|---|
| **Duolingo** | Su fuerza no está en el comercial de TV: está en Duo, el búho, convertido en personaje con actitud en TikTok (el «dramático» que te persigue si no haces tu lección). Su Super Bowl 2024 fue un anuncio de 5 segundos («haz tu lección… o si no»). Y la «muerte de Duo» (2025) fue un evento que la gente siguió como telenovela | **La mascota es el gancho emocional, y la racha es la historia.** El tráiler abre con la racha y tiene un huevo que nace. Los memes se hacen aparte, con la mascota como personaje |
| **Open English** | Comerciales de televisión largos en Latinoamérica, en tono de comedia, con la promesa clara: inglés en línea, con maestros nativos, y que te sirve para crecer en el trabajo | **Una promesa en una frase.** Aquí: «Estudia como juegas» |
| **Google · «Parisian Love» (Super Bowl 2010)** | Cuenta una historia de amor completa sin actores: sólo con lo que alguien escribe en el buscador | **La historia se cuenta con lo que pasa en el teléfono** (XP, combo, racha, el huevo), sin decir qué app es |
| **Google · «Loretta» (Super Bowl 2020)** | Un señor le pide al asistente que recuerde cosas de su esposa. Pura emoción, cero especificaciones técnicas | **Una persona concreta, no «millones de usuarios».** Él la hizo para ella; la dedicatoria a Mónica va al final |
| **Nike · «Dream Crazy» (2018)** | Voz grave, frases cortas, tomas reales de gente esforzándose, y la marca casi al final | **Voz de manifiesto en frases de 3 a 6 palabras**, sobre video real |
| **Uber y DiDi** | Anuncios de servicio: problema cotidiano y solución rápida. Funcionan por claridad, no por épica | Es justo lo que NO hacemos aquí: este video es épico; el tutorial de CARYMO es el claro |
| **Tráilers de Marvel** | Gancho en frío; tensión que sube; tarjetas de texto a mitad de pantalla; un negro con silencio antes de la explosión; montaje que se acelera; el logo con el golpe de música; y una escena chistosa o tierna después del logo | **La estructura completa del tráiler**, incluido el negro con latido y el remate después del logo |

**Las tres reglas que salen de esto:**
1. Los primeros 2 segundos deciden si alguien se queda (en Reels y TikTok se desliza al tercero). Por eso abre con la luz que sale del teléfono, no con un logo.
2. Una persona y una emoción le ganan a una lista de funciones. Ninguna función se nombra.
3. La marca al final, con el golpe más fuerte de la música.

## 2 · El guion (65 s, 9:16)

| Tiempo | Imagen (video real de Mixkit) | Texto en pantalla | Voz | Sonido |
|---|---|---|---|---|
| 0–3.7 | Una mano con el teléfono encendido. La pantalla brilla y **una columna de luz sale hacia arriba** | «RACHA DE 100 DÍAS» sube con la luz | — | subida, golpe al disparar |
| 3.7–7.7 | Cielo con estrellas corriendo; la columna llega al cielo | TODA HISTORIA GRANDE / EMPIEZA CON ALGO PEQUEÑO | «Toda historia grande empieza con algo pequeño.» | música que sube |
| 8.1–13.8 | Ella estudia de noche; un estudiante frustrado | ELLA TENÍA UN EXAMEN · Y NO LE ALCANZABA LA NOCHE | igual | golpe al cortar |
| 14–19.3 | Él programa a oscuras | ÉL NO SABÍA ENSEÑAR · PERO SABÍA CONSTRUIR | igual | golpe |
| 19.3–24.6 | Montaje rápido: código, ciudad de madrugada, café. Reloj: 1:12 → 4:31 a. m., «PRUEBA 12 → 41», mensajes «¿Sigues despierto?» «Ya casi. Es para ti.» | NOCHES SIN DORMIR · CIENTOS DE INTENTOS | igual | whoosh en cada corte |
| 24.6–28.4 | **Negro.** Latido | HASTA QUE ESTUDIAR / SE SINTIÓ COMO JUGAR | igual | latido, silencio |
| 28.4–38.5 | Ella sonríe con su teléfono; otra chava en la cama con el teléfono | +15 XP · COMBO x5 · ¡30 DÍAS SEGUIDOS! · un huevo tiembla, se agrieta y **nace** con luz: ¡NACIÓ TU MASCOTA! | — | toques, ding |
| 38.5–48 | Vía láctea; pareja con fuegos artificiales; estudiantes entrando a la universidad | LO HIZO PARA UNA PERSONA · AHORA ES PARA TODOS | igual | golpes; subida |
| 48.4 | Negro; la cabeza de la paloma | GRUPO MAZI PRESENTA | igual | **el clímax de la música** |
| 52.7 | Destello: el logo de CARYMO | — | «CARYMO.» | golpe |
| 55.5–65 | El logo flotando con partículas | ESTUDIA COMO JUEGAS · *Con amor, inspirado por Mónica.* · Muy pronto · Sé alfa tester | «Estudia como juegas.» | la música se va |

## 3 · Créditos (van en la descripción de la publicación)

- Video: Mixkit (licencia libre de Mixkit, uso comercial).
- Música: «Heroic Age», Kevin MacLeod (incompetech.com), CC BY 4.0.
- Voz: provisional (Google). Cuando Chris tenga saldo se rehace con la voz de la casa.

## 4 · Cómo se rehace

```
python3 carymo/trailer/preparar.py                       # baja los clips y saca los cuadros (no van al repo)
node marca/anuncios/voces.mjs carymo/trailer              # las voces (MAZI_LLAVE en el entorno)
node herramientas/video/armar.mjs carymo/trailer/index.html marca/anuncios/salida/carymo-trailer.mp4
```
