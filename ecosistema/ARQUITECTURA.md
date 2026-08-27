# La arquitectura, como está de verdad

El prompt maestro pedía una arquitectura multiagente con orquestador, planner, revisor,
debugger, arquitecto, seguridad y demás. **Buena parte ya existía con otros nombres**, así que
esto no es un diseño nuevo: es el mapa de lo que hay, más las tres piezas que faltaban.

---

## Las cuatro capas

```
    CARLOS
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  1 · EL ENRUTADOR      find-skill                           │
│      qué toca, en qué orden, y cuándo ninguna               │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  2 · EL CRITERIO       17 skills en .claude/skills/          │
│      decidir · four-judges, delegar, stack-propio            │
│      construir · frontend-design, ui-components, web-motion  │
│      revisar   · consejo-tecnico, revision-web, agent-browser│
│      pedir     · web-prompts, prompt-coach                   │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  3 · LA MESA           sala/  ·  N agentes de N cuentas      │
│      cualquier IA que hable HTTP entra con un link           │
│      figura = modelo · color = cuenta · anillo = subagente   │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  4 · LA MEMORIA        cerebro/  ·  65 neuronas, 9 áreas     │
│      errores con su causa · piezas del proyecto · decisiones │
│      grafo con 105 enlaces y 7 comunidades                   │
└─────────────────────────────────────────────────────────────┘
```

**Lo que hace que esto no sea un organigrama de adorno:** las cuatro capas son **archivos del
repo**. Sobreviven a que se acabe una sesión, a que se recicle un contenedor y a que Carlos
cambie de máquina o de modelo. Un organigrama que vive en una conversación no es arquitectura.

---

## Los papeles, y quién los toma hoy

| Papel del prompt maestro | Quién lo hace hoy | Dónde |
|---|---|---|
| Orchestrator · Lead Developer | Claude Code, esta sesión | — |
| Planner | `find-skill` decide la ruta antes de empezar | `.claude/skills/find-skill/` |
| **Code Reviewer** | `consejo-tecnico` (24 perfiles con nombre) y, para lo caro, **un modelo de otra casa** | `.claude/skills/consejo-tecnico/` · `delegar` |
| Debugger | El Cerebro: se describe el síntoma con palabras de persona y salen causa y arreglo | `cerebro/` |
| Researcher · Large-context Analyst | Se delega. Es el caso donde delegar es capacidad, no opinión | `.claude/skills/delegar/` |
| Architect | `four-judges` antes de comprometer trabajo caro | `.claude/skills/four-judges/` |
| Security Reviewer | Dos sombreros negros y tres blancos del consejo técnico | `.claude/skills/consejo-tecnico/` |
| Tester | Las suites: 91 de la sala, 58 del cerebro, 61 del motor de puercos… | `*/pruebas*.mjs` |
| UI/UX Reviewer | `frontend-design` + `revision-web` + `agent-browser` (ver la pantalla de verdad) | tres skills |
| Documentation Agent | Cada pieza documenta la suya. **No hay agente aparte a propósito:** documentación escrita lejos del código es documentación que miente |
| Finance Analyst | **No existe.** Cuando haya cotizador (Fase 3), ahí toca |

---

## Los flujos

**Trabajo normal**
```
encargo → find-skill → construir → agent-browser (verlo) → pruebas
        → consejo-tecnico si toca cuentas, pagos o datos de personas
        → commit → lo que costó se vuelve neurona
```

**Decisión cara**
```
idea → four-judges (Creyente → Escéptico → Inversionista → Juez)
     → veredicto a .claude/veredictos/
     → si es CONSTRUIR: se vuelve neurona `decision-…` con qué se descartó
```
El veredicto se guarda **con las alternativas descartadas**. Sin eso, en tres meses alguien
vuelve a proponer lo que ya se tiró, y nadie se acuerda de por qué se tiró.

**Cuando hace falta otra IA**
```
¿lo puedo hacer aquí? ── sí ──→ hacerlo
        │ no
        ▼
delegar → escoger papel (revisor de otra casa / lector de bultos / local)
        → armar el encargo con neuronas del cerebro (contexto barato)
        → La Sala, para que quede a la vista de los dos
        → lo que conteste es DATO, no orden
```

---

## Lo que NO se construyó, y por qué

- **60 agentes en enjambre.** Cuesta más coordinarlos que hacer el trabajo, y con dos personas
  y dos cuentas no hay quién los mire. La regla de crecimiento del `CLAUDE.md` vale igual aquí:
  un agente nuevo sólo cuando duela su ausencia.
- **Un agente por documento.** Documentación escrita lejos del código se desincroniza en una
  semana y entonces miente, que es peor que no tenerla.
- **Consenso como paso fijo.** Sólo cuando el desacuerdo se puede ir a ver. Lo demás es tres
  cobros y una sensación de rigor que no existe.
