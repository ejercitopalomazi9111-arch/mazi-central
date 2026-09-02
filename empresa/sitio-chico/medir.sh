#!/usr/bin/env bash
# Mide el sitio de un negocio DESDE FUERA, con curl, que es lo único que sale de
# esta máquina.
#
# ⚠ LO IMPORTANTE DE ESTE PROGRAMA NO ES MEDIR: ES SABER CUÁNDO NO PUEDE MEDIR.
# La primera versión daba «no abre» sobre sitios que probablemente están bien.
# Lo que llegaba no era la página del negocio: era un muro anti-robots. Un
# taller de Querétaro contestó 202 con 169 bytes y dentro venía
# `<meta http-equiv="refresh" ... /.well-known/sgcaptcha/>`. Otro contestó 403
# con 111 bytes. Si eso se anota como «su página no abre» y se le manda por
# WhatsApp al dueño, se le está diciendo una mentira comprobable y se quema el
# negocio en el primer mensaje.
#
# Así que clasifica antes de juzgar, y sólo `pagina-real` sirve para la lista:
#
#   pagina-real  → contestó una página de verdad. Aquí SÍ se puede medir.
#   reto-de-bot  → un captcha o un redirect a uno. No se sabe nada del sitio.
#   bloqueado    → 401/403/429 y cuerpo mínimo. Tampoco se sabe nada.
#   vacia        → 200 pero casi sin contenido. Sospechoso, no concluyente.
#   sin-respuesta→ ni siquiera contestó. Puede ser el sitio o puede ser la salida
#                  de esta máquina: NO es prueba de que esté caído.
#
#   ./medir.sh https://ejemplo.mx
set -u
U="${1:?uso: medir.sh <url>}"
TMP=$(mktemp)
R=$(curl -sS -L --max-time 20 -o "$TMP" -w '%{http_code} %{time_total} %{size_download} %{url_effective}' \
    -H 'user-agent: Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' \
    "$U" 2>/dev/null) || { echo "$U | estado=sin-respuesta | no concluyente: puede ser la salida de esta máquina"; rm -f "$TMP"; exit 0; }
set -- $R
CODIGO=$1; TIEMPO=$2; PESO=$3; FINAL=$4

CUERPO=$(tr -d '\n' < "$TMP")
ESTADO=pagina-real
if   grep -qiE 'sgcaptcha|/cdn-cgi/challenge|hcaptcha|recaptcha/api|Just a moment' <<<"$CUERPO"; then ESTADO=reto-de-bot
elif [ "$CODIGO" = 401 ] || [ "$CODIGO" = 403 ] || [ "$CODIGO" = 429 ]; then ESTADO=bloqueado
elif [ "$PESO" -lt 900 ]; then ESTADO=vacia
fi

if [ "$ESTADO" != pagina-real ]; then
  echo "$U | estado=$ESTADO codigo=$CODIGO peso=${PESO}B | NO se puede juzgar el sitio desde aquí"
  rm -f "$TMP"; exit 0
fi

VP=no; grep -qiE '<meta[^>]+name=["'"'"']?viewport' "$TMP" && VP=si
HOR=no; grep -qiE 'horario|abierto|lunes|mart|mi[eé]rc|hrs\b|[0-9]{1,2}:[0-9]{2}' "$TMP" && HOR=si
TEL=no; grep -qiE 'tel:|whatsapp|wa\.me|[0-9]{3}[ .-][0-9]{3}[ .-][0-9]{4}' "$TMP" && TEL=si

FALTA=""
[ "$VP"  = no ] && FALTA="$FALTA no-se-ve-en-telefono"
[ "$HOR" = no ] && FALTA="$FALTA sin-horarios"
[ "$TEL" = no ] && FALTA="$FALTA sin-contacto"
awk "BEGIN{exit !($TIEMPO > 5)}" && FALTA="$FALTA tarda-${TIEMPO}s"

echo "$U | estado=pagina-real codigo=$CODIGO tiempo=${TIEMPO}s peso=${PESO}B |${FALTA:- nada-que-ofrecerle} | final=$FINAL"
rm -f "$TMP"
