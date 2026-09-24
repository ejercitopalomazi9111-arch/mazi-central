# Puente de impresión

Para imprimir tickets en una impresora **de red** (cable Ethernet o WiFi, puerto 9100) o en una
**instalada en la computadora** cuando la app no puede hablarle directo.

## Una vez

1. Instala Node desde https://nodejs.org (la versión LTS).
2. Guarda `puente.mjs` en la computadora de la caja.
3. Doble clic no sirve: abre una terminal en esa carpeta y escribe `node puente.mjs`.
4. En la app: **Punto de venta → Impresora → Conexión: Puente local**, y en **Destino**:
   - la IP de la impresora de red, por ejemplo `192.168.1.50`;
   - en Windows, comparte la impresora (Propiedades → Compartir) y escribe `win:NombreCompartido`;
   - en Mac o Linux, `cups:Nombre_de_la_impresora` (el que sale en `lpstat -p`).
5. Toca **Imprimir prueba**.

## Que arranque solo

- **Windows:** crea un acceso directo a `node puente.mjs` y ponlo en `shell:startup`.
- **Mac:** Ajustes del sistema → General → Ítems de inicio.
- **Linux:** un servicio de systemd de usuario con `ExecStart=node /ruta/puente.mjs`.

## Seguridad

Escucha sólo en la propia computadora (`127.0.0.1`): nadie de la red puede usarlo. Para que sólo
la tienda pueda mandarle tickets: `PUENTE_ORIGENES=https://la-direccion-de-la-tienda node puente.mjs`.
