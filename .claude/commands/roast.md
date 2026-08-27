---
description: Rostiza una idea con el consejo de cuatro jueces — Creyente, Escéptico, Inversionista y Juez — y guarda el veredicto para que el consejo tenga memoria.
---

Corre el consejo de los cuatro jueces sobre esto: $ARGUMENTS

Sigue la skill `four-judges` **al pie de la letra**: los cuatro prompts van textuales desde
`.claude/skills/four-judges/reference/prompts.md`, no parafraseados — el sesgo de cada uno está
escrito a propósito y parafrasearlo lo deshace.

El orden importa y no se salta: **el Juez sólo falla después de haber escuchado a los tres.**
Cada juez recibe la idea *y lo que dijeron los anteriores*.

```
IDEA → Creyente → Escéptico → Inversionista → Juez → veredicto → memoria
```

Antes de empezar:

1. Busca si ya hay veredicto previo sobre esta idea en `.claude/veredictos/`. Si lo hay, el
   consejo arranca sabiendo qué se decidió y por qué, y juzga **qué cambió desde entonces**.
2. Busca en el Cerebro lo que ya sepamos del terreno:
   `node cerebro/cerebro.mjs buscar "<la idea>"`.

Al terminar:

- Guarda el acta en `.claude/veredictos/AAAA-MM-DD-<nombre-de-la-idea>.md` con la plantilla de
  `.claude/skills/four-judges/templates/veredicto.md`.
- Si el veredicto es **CONSTRUIR** o **ARREGLAR PRIMERO**, la decisión se vuelve neurona
  `decision-…` en el Cerebro, **con las alternativas descartadas**. Sin eso, en tres meses
  alguien vuelve a proponer lo que ya se tiró y nadie se acuerda de por qué.

Y lo que le da sentido a todo: **si el veredicto es MATAR, se dice.** Aunque Carlos ya se haya
ilusionado. Un consejo que sólo confirma lo que él ya quería no sirve de nada y mejor ni correrlo.
