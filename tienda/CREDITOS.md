# Créditos

## Iconos · Lucide

Los iconos de `iconos.js` son de [Lucide](https://lucide.dev), versión 0.469.0 (también `telefono`, el «phone» de Lucide).

> ISC License — Copyright (c) for portions of Lucide are held by Cole Bemis
> 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held
> by Lucide Contributors 2022.
>
> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted, provided that the above
> copyright notice and this permission notice appear in all copies.

## Catálogo de muestra

Los productos de `catalogo.json` son de **Odara Professional** (odara.mx), tomados
de su catálogo público para diseñar con datos reales. Nombres, marcas y fotos son
de sus dueños. **Es muestra**: no se publica fuera del taller y se reemplaza con el
catálogo del cliente.

## Librerías en `nucleo/vendor/`

Copiadas tal cual, sin tocar, con su licencia al lado. No hay CDN: la app abre
aunque ese servicio desaparezca (regla §2).

| Archivo | Qué hace | Licencia |
|---|---|---|
| `supabase-2.57.4.js` | cliente de la base | MIT · `LICENCIA-supabase-js.txt` |
| `qrcode-generator-2.0.4.mjs` | los QR de las etiquetas | MIT, Kazuhiko Arase · `LICENCIA-qrcode-generator.txt` |
| `jsbarcode-3.12.3.min.js` | los códigos de barras de las etiquetas | MIT, Johan Lindell · `LICENCIA-jsbarcode.txt` |
| `xlsx-0.20.3.core.min.js` | leer Excel (.xlsx, .xls) y CSV en el importador | Apache-2.0, SheetJS · `LICENCIA-sheetjs.txt`. Bajada de cdn.sheetjs.com: la de npm se quedó en 0.18.5, con fallas conocidas |
| `leaflet-1.9.4/` | el mapa del repartidor, del dueño y del seguimiento | BSD-2-Clause, Volodymyr Agafonkin · `LICENCIA-leaflet.txt`. Sin sus imágenes de marcador: los marcadores son nuestros (divIcon) |

## Mapas

Los mosaicos del mapa salen de OpenStreetMap (© colaboradores de OpenStreetMap, ODbL), con
la atribución puesta en cada mapa. Su política no permite uso intensivo en producción: el
proveedor se cambia en `nucleo/mapa.js`, en un solo lugar.
