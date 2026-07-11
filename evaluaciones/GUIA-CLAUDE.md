# GUÍA PARA CLAUDE — Edición LITE (gratuita)
**Archivo:** `offline-lite/index.html` · **Proyecto:** Sistema de Evaluaciones del Instituto Rembrandt de Querétaro.

> App de **un solo archivo HTML** (HTML+CSS+JS inline), **sin servidor**, base de datos en `localStorage`. Es la versión **recortada/gratuita** del producto. La versión COMPLETA está en `offline-demo/` (lee también su `GUIA-CLAUDE.md`).

---

## 1. Propósito y diferencia con la Completa
La Lite es la **muestra gratuita** (y el proyecto escolar de Carlos). Hace **solo lo esencial del examen diagnóstico**:
- Alumno entra con **código único de 1 uso** → contesta el **examen diagnóstico completo** (5 materias × 20, opción múltiple) → calificación automática.
- **Un solo acceso = Coordinación** (`coordinacion` / `coord2026`). NO hay roles de profesor/dirección.
- Coordinación: **Calificaciones** (con constancia PDF), **Alumnos** (registrar + códigos), **Preguntas** (editor del banco), **Configuración** (datos institución, escala, tiempo, grupos, ciclos).
- Incluye: **constancia PDF**, **editor de preguntas**, **cronómetro**.
- **NO incluye** (gancho de la Completa): exámenes parciales, preguntas abiertas, importar Excel, guías, recorridos, reportes, multiusuario/roles, modo debug.

La Completa = todo lo anterior + exámenes tipo Forms, roles con permisos, anti-trampa, debug, etc.

## 2. Cómo se genera (IMPORTANTE — no edites a ciegas)
**La Lite se GENERA con un script**, no se escribe a mano: `tests/build-lite.mjs`.
- Ese script **extrae el `<style>` (CSS) de la Completa** (`offline-demo/index.html`) para que ambas se vean idénticas de pulidas, y le pega un **HTML+JS recortado** definido dentro del propio script.
- Si quieres cambiar el CSS de la Lite → cámbialo en la Completa y **regenera**: `node tests/build-lite.mjs`.
- Si quieres cambiar la lógica/HTML de la Lite → edita las plantillas `HEAD`/`JS` dentro de `build-lite.mjs` y regenera.
- Editar `offline-lite/index.html` a mano funciona, pero se **PERDERÁ** la próxima vez que alguien regenere. Prefiere editar el generador.

## 3. Estructura (igual patrón que la Completa, más simple)
- `<head><style>` = CSS heredado de la Completa.
- `<body>`: `bgfx`, `#splash`, `#constancia`, header, y vistas: `vHub`, `vCode`, `vQuiz`, `vThanks`, `vLogin`, `vAdmin`.
- `#vAdmin` tabs: `tabCal`, `tabAlumnos`, `tabPreg`, `tabCfg`.
- `<script>` `anime.min.js` + script inline recortado.

## 4. Datos (MISMAS claves que la Completa — clave para el negocio)
Usa **exactamente** `ev_cfg, ev_bank, ev_res, ev_students` con las **mismas formas de registro** que la Completa. Esto es intencional: si la escuela usa la Lite y luego compra la Completa, **sus datos ya están listos** (basta abrir la Completa en el mismo navegador/dominio), y el **modo Debug de la Completa puede leer/editar** lo capturado en la Lite. 
➡️ **NO cambies nombres de clave ni shapes.** El examen se guarda con `mode:'__all__'`, `level:'secundaria'`, `subject:'Examen completo'`, igual que el diagnóstico de la Completa.

- `BANK` se construye con TODOS los niveles (para no pisar datos de la Completa al guardar), aunque la Lite solo edita/usa Secundaria (`const LV='secundaria'`).

## 5. Funciones clave
`validateCode` (código de alumno) · `launchExam`/`renderQ`/`finishQuiz` (quiz) · `abrirConstancia`/`renderCert`/`imprimirConstancia` · `addStudent`/`renderRoster` (con buscador) · editor `renderEditor`/`saveBank` · `saveConfig`/`renderCats`. Helpers idénticos a la Completa: `toast`, `uiModal/uiAlert/uiConfirm`, `esc`, `jss`, `nivel`, `load/save`.

## 6. Convenciones (NO romper)
- Mantenla **simple**: la gracia comercial es que la Completa sea "jugosa". No le agregues funciones premium.
- Nunca `alert/confirm` nativos → `uiModal/uiAlert/uiConfirm`. Escapa con `esc`/`jss`. anime.js para microinteracciones.
- **Compatibilidad de claves con la Completa = sagrada** (§4).
- Un solo acceso (Coordinación). Si agregas algo, que no rompa el modelo de un solo rol.

## 7. Probar
Arnés Playwright en `tests/run-lite.mjs` (9 casos, incluye el test de **enlace de datos** Lite→Completa). Ajusta la constante de ruta al inicio. `cd tests && node run-lite.mjs`. Si editas el generador, **regenera** (`node build-lite.mjs`) y luego prueba.

## 8. Git
Repo `github.com/ejercitopalomazi9111-arch/evaluaciones-rembrandt`. Commits semánticos, autor `Palomazi <cegg.caoz@gmail.com>`. Probar → commit → push `master`.
