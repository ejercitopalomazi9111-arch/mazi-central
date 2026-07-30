# El catálogo, a detalle

Cada ficha: qué hace, dónde vive, cuándo sí y cuándo no.

---

## 1 · Plausible Analytics — `github.com/plausible/analytics`
**Reemplaza:** Google Analytics

Analítica web open source, **sin cookies** y enfocada en privacidad. Más simple y más barata.
Un solo tablero: visitantes únicos, vistas, tasa de rebote, duración media, páginas top y
fuentes top.

**Cuándo sí:** siempre que haya que medir un sitio nuestro o de un cliente. Sin cookies
significa **sin banner de consentimiento**, que es una fricción menos en la conversión.
**Cuándo no:** si el cliente necesita embudos complejos o integración profunda con anuncios de
Google. Ahí gana la herramienta de Google, y se usa detrás de un adaptador.

→ **Fase 6 del plan.**

---

## 2 · AppFlowy — `github.com/AppFlowy-IO/AppFlowy`
**Reemplaza:** Notion

Documentos, wikis y tableros de proyecto en un solo lugar. Espacios, procesos, recursos y
tableros tipo kanban (por hacer / en progreso / completado).

**Cuándo sí:** documentación interna, base de conocimiento, seguimiento de proyectos.
**Cuándo no:** si el equipo ya vive en otra herramienta y sólo son dos personas, migrar cuesta
más de lo que rinde.

---

## 3 · Penpot — `github.com/penpot/penpot`
**Reemplaza:** Figma

Diseño y prototipado open source. **Alternativa real**, no un juguete: capas, componentes,
prototipos con interacciones, animación entre pantallas y colaboración en tiempo real.

**Cuándo sí:** cuando haya que diseñar antes de construir, y sobre todo cuando el cliente
quiera ver el prototipo sin pagar asiento.
**Cuándo no:** si el cliente ya trabaja en Figma y hay que entregarle archivos editables. Ahí
la compatibilidad manda.

---

## 4 · n8n — `github.com/n8n-io/n8n`
**Reemplaza:** Zapier

Automatización de flujos con **400+ integraciones** y nodos de IA. Ejemplo típico: webhook →
leer hoja de cálculo → generar texto con IA → mandar correo → avisar en chat → crear página.
Trae panel de ejecuciones con exitosas, fallidas y tiempo medio.

**Cuándo sí:** para pegar el Panel Mazi con WhatsApp, correo y redes sin construir cada
integración a mano. Es la pieza que hace que las Fases 2 y 5 no sean trabajo manual.
**Cuándo no:** para una sola automatización simple. Un script de veinte líneas no necesita un
motor de flujos con servidor.

→ **Fases 2 y 5 del plan.**

---

## 5 · Cal.com — `github.com/calcom/cal.com`
**Reemplaza:** Calendly

Agenda de reuniones y reservas. Elegir fecha → elegir hora → reserva confirmada, con enlace de
videollamada y zona horaria (incluye `América/México_City`). Panel de próximas reuniones con
estados confirmada / pendiente.

**Cuándo sí:** agendar juntas con clientes desde **nuestro** sitio, no mandándolos a un dominio
ajeno. Y para clientes que agendan citas — que es medio catálogo de negocios locales.
**Cuándo no:** si sólo hay dos juntas al mes. Un enlace de calendario alcanza.

→ **Fase 4 del plan.**

---

## 6 · Bitwarden — `github.com/bitwarden/clients`
**Reemplaza:** 1Password, LastPass

Gestor de contraseñas open source **auditado de forma independiente**. Seguro, útil, con plan
gratis en la nube y opción de auto-hospedar.

**Cuándo sí:** **ya.** Las llaves de Supabase, GitHub, dominios y accesos de clientes no pueden
vivir en notas del teléfono. Esto es higiene básica, no lujo.
**Cuándo no:** no hay cuándo no. Lo único a decidir es si en la nube (gratis, más fácil) o
auto-hospedado (más control, más trabajo).

---

## 7 · Ollama — `github.com/ollama/ollama`
**Reemplaza:** APIs de LLM de pago, para ciertos casos

Corre modelos open-weight **localmente**. Privado, offline y sin factura por token. Modelos
tipo `llama3:8b` (~4.7 GB), `mistral:7b` (~4.1 GB), `codellama:7b` (~3.8 GB). Se bajan con
`ollama pull <modelo>`.

**Cuándo sí:** datos de clientes que no deben salir de la máquina; volumen alto de tareas
simples (clasificar, resumir, etiquetar) donde pagar por token no tiene sentido; y para
demostrarle a un cliente que su información no viaja a ningún lado.
**Cuándo no:** para razonamiento serio. Un modelo de 7B no compite con los grandes, y fingir
que sí es cómo se entregan resultados malos. Necesita RAM y disco de verdad.

---

## 8 · Whisper — `github.com/openai/whisper`
**Reemplaza:** servicios de transcripción de pago

Voz a texto en decenas de idiomas. Transcribe audio **localmente y gratis**.

**Cuándo sí:** subtítulos de video (directo a `remotion` y al comercial del sitio), transcribir
juntas con clientes, convertir notas de voz en texto. En un negocio donde el cliente manda
audios de WhatsApp, esto vale oro.
**Cuándo no:** si necesitas transcripción en vivo con baja latencia. Whisper trabaja sobre
archivo, no sobre flujo.

---

## 9 · yt-dlp — `github.com/yt-dlp/yt-dlp`
**Reemplaza:** descargadores de pago

Descarga video y audio de YouTube y **más de 1,000 sitios**. Gratis y open source.

```bash
yt-dlp -f best -o "%(title)s.%(ext)s" <URL>
```

**Cuándo sí:** respaldar material propio subido a plataformas, bajar referencias para estudio,
recuperar video de un cliente que perdió el original.
**Cuándo no:** ⚠️ **descargar contenido ajeno para usarlo en trabajo de cliente.** Eso es
material con derechos y nos mete en un problema legal — y choca con la regla de arte con
licencia. La herramienta es legítima; el uso es lo que hay que cuidar.

---

## 10 · Fooocus — `github.com/lllyasviel/Fooocus`
**Reemplaza:** Midjourney y similares

Genera imágenes localmente con **Stable Diffusion XL**. Alternativa para crear sin pagar
suscripción mensual.

**⚠️ Choca con la regla número uno de la casa.** El arte no se dibuja por código, y esto es
exactamente eso.

**Cuándo sí:** pruebas internas desechables, maquetas para decidir composición **antes** de
salir a buscar el asset real. Nunca sale del escritorio.
**Cuándo no:** producción. Nada de imágenes generadas en un proyecto de cliente ni en el
portafolio. Si el proyecto necesita imágenes, se buscan reales con licencia abierta y se bajan
al repo con crédito.

---

## Lo que falta en esta lista

Vino de un carrusel de Instagram, no de una auditoría. **Falta lo que más nos hace falta:**

- **Un CRM auto-hospedable** — pero ese lo estamos construyendo nosotros (Panel Mazi, Fase 2),
  que es lo correcto: es el corazón del negocio, no infraestructura genérica.
- **Correo transaccional** — para que Ligas Mazi mande confirmaciones sin depender de Gmail.
- **Almacenamiento de archivos** — hoy vive en Supabase; convendría saber cuál es la salida.
- **Un servidor donde poner todo esto**, que es la pregunta que ninguna de las diez responde.
