# Auditoría · [NOMBRE DEL SISTEMA]

**Fecha:** AAAA-MM-DD
**Quién la pidió:** Carlos · o se disparó sola por [qué tocaba el cambio]
**Qué se auditó:** [archivos, rutas, tablas — concreto]
**Dónde corre:** [GitHub Pages · Supabase · localStorage · el teléfono]
**¿Hay datos de personas?** sí / no · **¿de menores?** sí / no · **¿el repo es público?** sí / no
**Mesa convocada:** chica (6) · por área · completa (24) — y por qué ese tamaño

> ⚠️ **Recordatorio de la regla del acta:** este archivo vive en un repo público. Mientras un
> hallazgo 🔴 esté abierto, aquí va **sólo área, nivel y "en proceso"**. El detalle se le dice a
> Carlos en el chat y se escribe **después** de que está tapado.

**Auditorías previas de este sistema:** [enlace, o "ninguna"]
**Riesgos que se habían aceptado, y si siguen siendo aceptables:**

---

## El sistema, en tres líneas

[Qué hace, quién lo usa, y qué es lo peor que pasaría si se rompe. Si no cabe en tres líneas,
el consejo va a auditar en abstracto.]

---

## 🏗 Arquitectura · Verónica, Beto, Kenji, Lucía

**Qué pieza está haciendo trabajo que no le toca**

**El acoplamiento que va a doler**

**La suposición enterrada que no está escrita en ningún lado**

**Qué pasa con 10 veces más datos, usuarios o pantallas**

> **La pieza que va a estorbar en seis meses, y qué la acomoda hoy:**

---

## 🕳 Cuervo · el sombrero negro EN CONTRA (a ciegas)

*Sólo con lo que tiene cualquiera: la página, el inspector y el repo público.*

| # | Por dónde | Qué se lleva o qué rompe | Qué tan fácil |
|---|---|---|---|
| 1 | | | |

---

## 🕳 AK · el sombrero negro A FAVOR (con los planos)

*Pega más duro, y además explica de qué clase es y cómo se cierra. Clases en
[`vulnerabilidades.md`](../skills/consejo-tecnico/reference/vulnerabilidades.md).*

| # | Clase | Cómo aplica aquí | Cómo se cierra |
|---|---|---|---|
| 1 | | | |

*Área y efecto — el paso a paso va en el chat mientras el hallazgo esté abierto.*

**Lo que viaja al navegador y no debería**

**Lo que se valida sólo en el cliente — o sea, lo que no se valida**

**Lo que queda guardado en el teléfono**

**Lo que hay en el historial del repo aunque ya no esté en el código**

> **El camino más corto al daño más grande:**

---

## 🛡 Los sombreros blancos · Damián, Emilio, Paola, Tadeo

| Nivel | Hallazgo | Arreglo concreto | Cómo se comprueba |
|---|---|---|---|
| 🔴 Sangra | | | |
| 🟠 Duele | | | |
| 🟡 Estorba | | → a `PENDIENTES.md` | |
| ⚪ Se acepta | | **Por qué se acepta:** · **Qué lo cambiaría:** | |

> **Los tres arreglos de hoy, en orden, con horas:**
> 1.
> 2.
> 3.

---

## 🎨 Diseño gráfico · Renée, Mateo, Sol, Bruno

*Sólo si el cambio se ve. Y no se entrega el reclamo: se entrega la propuesta.*

**Qué está fuera de la marca** (color medido, tipografía de la casa, logo compuesto)

**La propuesta, hecha** — archivo o captura, no párrafo:

**Formatos que faltan** (avatar, favicon, cuadrado, vertical) y cuánto pesan

---

## 🖥 Front end · Ximena, Iker, Pilar, Gonzalo

*Apartado por apartado. Veredicto y arreglo de cada uno, y qué poner donde falta.*

| Apartado | Cómo se ve hoy | El arreglo | Nivel |
|---|---|---|---|
| | | | |

**Lo que NO debería existir**

**Lo que falta y qué poner ahí**

**Movimiento** — ¿guiado por scroll, o secuestrado? (regla 3)

**Tacto y accesibilidad** — objetivos < 44 px · contraste · foco · `prefers-reduced-motion`

**Anchos** — teléfono 390 · laptop 1280 · ancho 1920. Desbordes horizontales:

---

## 📉 El Medidor

| Qué | Medido | Presupuesto | ¿Pasa? |
|---|---|---|---|
| Peso de la primera pantalla | | < 200 KB | |
| Usable en | | < 1.5 s (teléfono con datos) | |
| Peticiones antes del primer toque | | | |

**Qué crece sin límite**

**Qué se pide de más**

> **El número que NO pasa, y por cuánto:**

---

## 🌙 Oficio y operación · cuánto cuesta y por dónde no moverse

### Nayeli · las tres cubetas

| | Dónde | Por qué |
|---|---|---|
| 🟢 **Terreno firme** | | |
| 🟡 **Con cuidado** | | |
| 🔴 **Minado** | | |

**La estimación honesta, y qué la infla:**

**Por dónde empezar para llegar más lejos hoy:**

### 🌙 El de Guardia

**Cuando falle, ¿cómo me entero? ¿el mensaje dice algo?**

**Si truena a la mitad, ¿qué queda a medias?**

**¿Se puede deshacer sin borrarle nada a nadie?**

**Qué me va a hacer perder la tarde en un año**

**Sin señal · doble clic · recarga a media operación**

> **Qué hace falta para poder dormir:**

---

## 🐈 Michi · lo que nadie planeó

*Doble clic · recarga a media operación · sin señal en el paso 3 · atrás después de guardar ·
formulario vacío · nombre de 4,000 letras · archivo que miente sobre lo que es · girar el teléfono.*

| Qué le hizo | Qué pasó |
|---|---|
| | |

---

## 🐕 Rocco · la evidencia

*Nadie dice "ya quedó" sin esto.*

| Qué se probó | Cómo | Resultado |
|---|---|---|
| | | |

**Capturas:**
**Prueba de regresión enterrada en:**

---

## ⚖️ Nadia Berrones · la Jueza Técnica

# VEREDICTO: `ENVIAR` · `ARREGLAR PRIMERO` · `NO SE ENVÍA`

**Qué rechazo de mi propio equipo, y por qué:** *(un consejo donde todos tuvieron razón
no sirvió de nada)*

**El riesgo más grande, en una línea:**

**La prueba que reproduce el hallazgo más grave:**
```
[comando, script, o secuencia exacta de toques]
```

**Si es ARREGLAR PRIMERO — lo que exactamente lo convierte en ENVIAR:**
1.

---

## Qué pasó después

*(Se llena cuando se corren los arreglos.)*

- [ ] Se corrió la prueba que reproduce · resultado:
- [ ] 🔴 tapados · fecha:
- [ ] 🟠 arreglados · fecha:
- [ ] 🟡 anotados en `PENDIENTES.md`
- [ ] ⚪ aceptados por escrito, con su por qué
- [ ] **Detalle de los hallazgos, escrito ya que están tapados:**
