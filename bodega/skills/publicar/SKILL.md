---
name: publicar
description: Cómo se publica el sitio del Instituto Rembrandt — GitHub Pages automático desde master, el archivo único sitio.html y el despliegue en Vercel — y qué NO hay que tocar al hacerlo. Úsala cuando pidan publicar, desplegar, «subir el sitio», un link para compartir, revisar por qué el sitio publicado no se ve o no se actualizó, configurar variables de entorno del despliegue, o cuando alguien esté a punto de editar sitio.html a mano.
---

# Publicar

Hay tres superficies y conviene no confundirlas.

## 1. GitHub Pages (automático)

Cada push a `master` dispara `.github/workflows/publicar.yml`:

- Compila con `EXPORT_ESTATICO=1` y `RUTA_BASE=/<repo>` (el prefijo se deduce
  del nombre del repositorio, así que renombrarlo no obliga a tocar nada).
- Empuja el resultado a la rama `gh-pages`, **no** usa `actions/deploy-pages`:
  ese camino exige permisos de administrador que el token de Actions no tiene y
  responde «Resource not accessible by integration».
- Hace `touch out/.nojekyll`. Sin ese archivo Jekyll se traga todo lo que
  empieza por guion bajo y el sitio se queda sin `_next/`: ni estilos ni JS.

URL: `https://<owner>.github.io/<repo>/`

Qué se pierde ahí, por ser alojamiento de sólo archivos: envío real de correo
(el formulario ofrece correo/WhatsApp/llamada con el mensaje ya redactado),
optimización de imágenes y cabeceras desde Next. Nada de eso rompe el sitio.

## 2. `sitio.html` — el sitio entero en un archivo

Las 13 rutas públicas con navegación, todo incrustado (tipografías, arte, JS),
cero peticiones externas. Sirve para compartir el sitio sin desplegar nada.

**Es un artefacto generado: no se edita a mano.** Lo regenera el mismo workflow
en cada publicación, así que cualquier edición manual se pierde en el siguiente
push. Para cambiarlo se toca `scripts/empaquetar-una-pagina.mjs`.

Regenerarlo en local:

```bash
npm run build
npx next start -p 3310 &
node scripts/empaquetar-una-pagina.mjs   # deja sitio-una-pagina.html
```

## 3. Vercel (el destino recomendado)

Recupera lo que Pages pierde: `next/image` optimiza, las cabeceras se envían y
el formulario **manda correo de verdad** por Resend.

Variables de entorno, ninguna obligatoria:

| Variable | Si falta |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | usa la URL de producción de Vercel si la expone; si no, `www.irembrandt.com.mx` |
| `RESEND_API_KEY` | el formulario ofrece correo, WhatsApp o llamada |
| `CORREO_DESTINO` | `contacto@irembrandt.com.mx` |
| `CORREO_REMITENTE` | sin él no se envía (el dominio debe estar verificado en Resend) |
| `NEXT_PUBLIC_WHATSAPP` | el botón de WhatsApp no aparece |

**Nunca definas `EXPORT_ESTATICO` ni `RUTA_BASE` en Vercel.** Son del modo
estático de Pages y ahí romperían todas las rutas.

## Antes de publicar

Corre la skill `verificar`, incluido el build del export estático. Lo que falla
en CI falla igual en local, y el workflow no revisa nada: compila y empuja.

## Si el sitio publicado no se actualizó

En orden, de lo más probable a lo menos:

1. El push no llegó a `master` (el workflow sólo escucha esa rama).
2. El workflow ignora los pushes que sólo tocan `sitio.html` — es a propósito,
   evita que el commit que él mismo hace se realimente en un bucle.
3. El build falló: revisa la ejecución en Actions antes de suponer que Pages va
   con retraso.
