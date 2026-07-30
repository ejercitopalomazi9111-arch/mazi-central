# Ligas Mazi — pasar de pruebas a producción

Notas prácticas para cuando pases del uso interno de prueba a un lanzamiento con
usuarios reales.

## 1. SMTP para correos de confirmación (item 22 del plan)

Hoy la confirmación por correo está apagada en Supabase para poder crear
cuentas de prueba sin límite. Para producción hay que:

1. **Registrarse en un proveedor** — cualquiera de estos sirve:
   - **Resend** (recomendado, plan gratis 3,000 correos/mes) — resend.com
   - **SendGrid** (100 correos/día gratis) — sendgrid.com
   - **Amazon SES** (más barato con volumen, más setup)

2. **Verificar tu dominio** en el proveedor (registros DNS: SPF + DKIM). Sin
   esto los correos caen a spam. Toma ~10 min si tienes acceso al DNS.

3. **En Supabase** → Project Settings → Auth → SMTP Settings, meter:
   - **Sender email**: `hola@tudominio.com` (el que verificaste)
   - **Host**: `smtp.resend.com` (o el que corresponda)
   - **Port**: `587` (TLS) o `465` (SSL)
   - **Username** / **Password**: los del proveedor
   - Guardar → probar con "Send test email"

4. **Reactivar la confirmación** en Auth → Providers → Email:
   - `Enable email confirmations` → ON
   - `Enable secure email change` → ON

5. **Textos de correo** (Auth → Email Templates) — personalizar:
   - Confirm signup, Magic link, Reset password.
   - Usa el color y el nombre de "Ligas Mazi" para no verse genérico.

6. **Rate limits**: los planes gratis suelen ser 3,000/mes. Si arrancas con
   más de 50 usuarios/día, sube al plan de pago del proveedor.

## 2. Base de datos — cosas que hay que sostener

- Todas las tablas tienen RLS activo. Cualquier tabla nueva **debe** tener RLS
  o rompes la seguridad de la app.
- Backups automáticos de Supabase están activos (7 días en plan gratis).
  Para producción con datos importantes, activar Point-In-Time Recovery
  (plan Pro).
- Índices: los que ya hay cubren las búsquedas actuales. Si notas búsquedas
  lentas cuando haya muchos jugadores, medir con `explain analyze` y agregar
  índices sobre columnas que aparezcan en `.eq()` o `.ilike()`.

## 3. Almacenamiento de imágenes

Las fotos (logos, escudos, foto de carta) se guardan **inline como base64
dentro del JSON** de cada entidad. Eso funciona bien hasta ~50 KB por
imagen; si suben fotos grandes sin recorte, hincha la tabla.

- El recortador ya baja las fotos a ~480×640 JPG calidad 0.85 antes de
  guardar. Con eso quedan en ~40 KB.
- Si en algún momento agregamos videos VAR o galerías, mover a Supabase
  Storage (bucket público) en vez de base64 inline.

## 4. Notificaciones push (siguiente iteración)

Hoy las notificaciones son in-app (bandeja). Para push nativas del sistema
(que suenen aunque la app esté cerrada) hay dos caminos:

- **Web Push** con VAPID + Service Worker (ya tienes SW). Requiere permiso
  del usuario y una clave VAPID pública en Supabase.
- **OneSignal** (más fácil, gratis hasta 10k usuarios).

## 5. Métricas de uso

Si quieres saber cuántos usuarios activos hay sin instalar analytics:

```sql
select count(distinct account_id) as usuarios_activos_7d
from public.app_state
where updated_at > now() - interval '7 days';
```
