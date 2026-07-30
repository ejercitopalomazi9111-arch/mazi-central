# Auditoría · [NOMBRE DEL SISTEMA]

**Fecha:** AAAA-MM-DD
**Quién la pidió:** Carlos · o se disparó sola por [qué tocaba el cambio]
**Qué se auditó:** [archivos, rutas, tablas — concreto]
**Dónde corre:** [GitHub Pages · Supabase · localStorage · el teléfono]
**¿Hay datos de personas?** sí / no · **¿de menores?** sí / no · **¿el repo es público?** sí / no

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

## 🏗 La Arquitecta

**Qué pieza está haciendo trabajo que no le toca**

**El acoplamiento que va a doler**

**La suposición enterrada que no está escrita en ningún lado**

**Qué pasa con 10 veces más datos, usuarios o pantallas**

> **La pieza que va a estorbar en seis meses, y qué la acomoda hoy:**

---

## 🕳 El Sombrero Negro

*Los caminos, sin receta. Área y efecto — el paso a paso va en el chat mientras esté abierto.*

| # | Por dónde | Qué se lleva o qué rompe | Qué tan fácil |
|---|---|---|---|
| 1 | | | |

**Lo que viaja al navegador y no debería**

**Lo que se valida sólo en el cliente — o sea, lo que no se valida**

**Lo que queda guardado en el teléfono**

**Lo que hay en el historial del repo aunque ya no esté en el código**

> **El camino más corto al daño más grande:**

---

## 🛡 El Sombrero Blanco

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

## 🌙 El de Guardia

**Cuando falle, ¿cómo me entero? ¿el mensaje dice algo?**

**Si truena a la mitad, ¿qué queda a medias?**

**¿Se puede deshacer sin borrarle nada a nadie?**

**Qué me va a hacer perder la tarde en un año**

**Sin señal · doble clic · recarga a media operación**

> **Qué hace falta para poder dormir:**

---

## ⚖️ El Juez Técnico

# VEREDICTO: `ENVIAR` · `ARREGLAR PRIMERO` · `NO SE ENVÍA`

**Qué rechazo de mis propios cinco, y por qué:**

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
