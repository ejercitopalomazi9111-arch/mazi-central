#!/bin/bash
# Renderiza la presentación a imágenes. Sin esto se trabaja a ciegas: el medidor
# revisa CAJAS y un título que se parte en dos renglones no mueve ninguna caja.
set -e
D=${2:-/tmp/render}
rm -rf "$D"; mkdir -p "$D"
soffice --headless --norestore -env:UserInstallation="file://$D/ui" \
        --convert-to pdf --outdir "$D" "$1" >/dev/null 2>&1
pdftoppm -jpeg -r ${3:-110} "$D/$(basename "${1%.pptx}").pdf" "$D/lamina"
ls -1 "$D"/lamina-*.jpg
