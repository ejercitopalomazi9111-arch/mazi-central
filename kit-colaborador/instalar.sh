#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
#  KIT DE COLABORADOR · GRUPO MAZI
#  Instala la FORMA DE TRABAJAR de la casa en el Claude de un colaborador.
#
#  Uso:  bash kit-colaborador/instalar.sh
# ──────────────────────────────────────────────────────────────────────────
#  LAS TRES PROMESAS, que son la razón de que este archivo exista:
#
#   1. NO PIERDES LO QUE YA TIENES. Si ya tienes una skill con el mismo
#      nombre, la tuya NO se toca: la de Mazi entra al lado con el sufijo
#      `-mazi` y al final se te dice cuáles fueron. Nunca se sobrescribe.
#
#   2. NO SE TOCA TU MEMORIA. Ni un archivo. Lo que tu Claude aprendió
#      contigo es tuyo y no tiene por qué saberlo nadie más.
#
#   3. NO TE LLEVAS NADA DE CARLOS. Aquí no viajan sus proyectos, sus
#      clientes, sus precios ni su memoria personal. Sólo el método.
# ══════════════════════════════════════════════════════════════════════════
set -u

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$AQUI/.." && pwd)"
ORIGEN="$REPO/.claude/skills"
DESTINO="${CLAUDE_HOME:-$HOME/.claude}/skills"
SELLO="$(date +%Y%m%d-%H%M%S)"
RESPALDO="${CLAUDE_HOME:-$HOME/.claude}/respaldos/skills-$SELLO"

amarillo(){ printf '\n\033[33m>> %s\033[0m\n' "$1"; }
verde(){    printf '   \033[32mOK\033[0m  %s\n' "$1"; }
rojo(){     printf '   \033[31m!!\033[0m  %s\n' "$1"; }
gris(){     printf '   ..  %s\n' "$1"; }

cat <<'PORTADA'

  GRUPO MAZI · kit de colaborador
  Si no existe la herramienta, se construye la herramienta.

PORTADA

if [ ! -d "$ORIGEN" ]; then
  rojo "No encuentro $ORIGEN. ¿Corriste esto desde el repo clonado?"
  exit 1
fi

# ── 1 · Respaldo, ANTES de tocar nada ────────────────────────────────────
amarillo "Respaldando lo que ya tienes"
if [ -d "$DESTINO" ]; then
  mkdir -p "$RESPALDO"
  cp -R "$DESTINO/." "$RESPALDO/" 2>/dev/null
  verde "copia de tus skills en $RESPALDO"
  gris  "si algo sale mal: borra $DESTINO y copia esa carpeta de vuelta"
else
  mkdir -p "$DESTINO"
  gris "no tenías skills todavía; se crea $DESTINO"
fi

# ── 2 · Las skills, SIN pisar las tuyas ──────────────────────────────────
amarillo "Instalando las skills de la casa"
nuevas=0; alado=0; iguales=0
CHOCARON=""

for ruta in "$ORIGEN"/*/; do
  [ -d "$ruta" ] || continue
  nombre="$(basename "$ruta")"
  destino_skill="$DESTINO/$nombre"

  if [ ! -e "$destino_skill" ]; then
    cp -R "$ruta" "$destino_skill"
    verde "$nombre"
    nuevas=$((nuevas+1))
    continue
  fi

  # Ya existe una con ese nombre. Si es idéntica, no hay nada que hacer.
  if diff -r -q "$ruta" "$destino_skill" >/dev/null 2>&1; then
    gris "$nombre — ya la tenías igual, no se toca"
    iguales=$((iguales+1))
    continue
  fi

  # Es distinta: LA TUYA MANDA. La de Mazi entra al lado.
  cp -R "$ruta" "$DESTINO/${nombre}-mazi"
  rojo "$nombre — ya tenías una TUYA y es distinta"
  gris "la de Mazi quedó como ${nombre}-mazi · compáralas y quédate con lo que sirva"
  CHOCARON="$CHOCARON $nombre"
  alado=$((alado+1))
done

# ── 3 · El CLAUDE.md, que se AGREGA y no reemplaza ───────────────────────
amarillo "Poniendo la forma de trabajar"
CASA="${CLAUDE_HOME:-$HOME/.claude}/CLAUDE-mazi.md"
cp "$AQUI/CLAUDE-colaborador.md" "$CASA"
verde "método de la casa en $CASA"
gris "va en archivo APARTE: tu CLAUDE.md no se toca."
gris "Para engancharlo, pégale esta línea a tu CLAUDE.md:"
printf '\n      @%s\n\n' "$CASA"

# ── 4 · Lo que este script NO hizo, dicho en voz alta ────────────────────
amarillo "Lo que NO se tocó, a propósito"
gris "tu memoria — ni un archivo. Lo que tu Claude aprendió contigo es tuyo."
gris "tu CLAUDE.md — sigue igual."
gris "no se instaló nada de los proyectos de Carlos ni se pidió acceso a sus repos."

echo
echo "  ============================================================"
printf "   %s skills nuevas · %s ya las tenías · %s quedaron al lado\n" "$nuevas" "$iguales" "$alado"
if [ -n "$CHOCARON" ]; then
  echo
  echo "   Chocaron y NO se sobrescribieron:"
  for c in $CHOCARON; do echo "     · $c   (la de Mazi está en ${c}-mazi)"; done
fi
echo "  ============================================================"
echo
