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
SELLO="$(date +%Y%m%d-%H%M%S)"

# ── DÓNDE SE INSTALA ─────────────────────────────────────────────────────
#  Sin argumentos → en la MÁQUINA (~/.claude). Sirve para el Claude que corre
#  en su computadora.
#
#  Con `--repo <ruta>` → DENTRO DE UN REPOSITORIO (<ruta>/.claude). Eso es lo
#  que hace falta para un Claude que corre EN GITHUB: ahí no existe la carpeta
#  del usuario, cada sesión clona el repo y lee lo que traiga adentro. Si las
#  skills no están commiteadas en el repo, para esa sesión no existen.
#
#    bash kit-colaborador/instalar.sh                    ← su computadora
#    bash kit-colaborador/instalar.sh --repo ~/mi-repo   ← su Claude de GitHub
MODO="maquina"
CASA="${CLAUDE_HOME:-$HOME/.claude}"
DESTINO_REPO=""

if [ "${1:-}" = "--repo" ]; then
  if [ -z "${2:-}" ]; then
    printf '\033[31m!!\033[0m  Falta la ruta: instalar.sh --repo <ruta-del-repo>\n'; exit 1
  fi
  if [ ! -d "$2" ]; then
    printf '\033[31m!!\033[0m  No existe esa carpeta: %s\n' "$2"; exit 1
  fi
  MODO="repo"
  DESTINO_REPO="$(cd "$2" && pwd)"
  CASA="$DESTINO_REPO/.claude"
fi

DESTINO="$CASA/skills"
# El respaldo NUNCA va dentro del repo: acabaría commiteado y metiéndole basura
# al historial de alguien más. En modo repo se guarda al lado, fuera de él.
if [ "$MODO" = "repo" ]; then
  RESPALDO="$(dirname "$DESTINO_REPO")/$(basename "$DESTINO_REPO")-respaldo-skills-$SELLO"
else
  RESPALDO="$CASA/respaldos/skills-$SELLO"
fi

amarillo(){ printf '\n\033[33m>> %s\033[0m\n' "$1"; }
verde(){    printf '   \033[32mOK\033[0m  %s\n' "$1"; }
rojo(){     printf '   \033[31m!!\033[0m  %s\n' "$1"; }
gris(){     printf '   ..  %s\n' "$1"; }

cat <<'PORTADA'

  GRUPO MAZI · kit de colaborador
  Si no existe la herramienta, se construye la herramienta.

PORTADA

if [ "$MODO" = "repo" ]; then
  gris "instalando DENTRO del repositorio: $DESTINO_REPO"
  gris "así lo ve un Claude que corre en GitHub, que no tiene carpeta de usuario"
else
  gris "instalando en la máquina: $CASA"
fi

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
if [ "$MODO" = "repo" ]; then
  # En un repo va a la RAÍZ, junto al CLAUDE.md del proyecto, porque es lo que
  # la sesión de GitHub lee al clonar.
  ARCHIVO="$DESTINO_REPO/CLAUDE-mazi.md"
  ENGANCHE="@CLAUDE-mazi.md"
else
  ARCHIVO="$CASA/CLAUDE-mazi.md"
  ENGANCHE="@$ARCHIVO"
fi
mkdir -p "$(dirname "$ARCHIVO")"
cp "$AQUI/CLAUDE-colaborador.md" "$ARCHIVO"
verde "método de la casa en $ARCHIVO"
gris "va en archivo APARTE: tu CLAUDE.md no se toca."
gris "Para engancharlo, pégale esta línea a tu CLAUDE.md:"
printf '\n      %s\n\n' "$ENGANCHE"

# ── 4 · Lo que este script NO hizo, dicho en voz alta ────────────────────
amarillo "Lo que NO se tocó, a propósito"
gris "tu memoria — ni un archivo. Lo que tu Claude aprendió contigo es tuyo."
gris "tu CLAUDE.md — sigue igual."
gris "no se instaló nada de los proyectos de Carlos ni se pidió acceso a sus repos."

if [ "$MODO" = "repo" ]; then
  amarillo "Falta UN paso, y sin él no sirve"
  gris "un Claude de GitHub lee lo que está COMMITEADO. Desde tu repo:"
  printf '\n      git add .claude CLAUDE-mazi.md && git commit -m "La forma de trabajar de Mazi"\n'
  printf '      git push\n\n'
  gris "hasta que eso esté empujado, tu Claude de GitHub no ve nada de esto."
fi

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
