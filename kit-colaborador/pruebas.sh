#!/usr/bin/env bash
# Las pruebas del kit de colaborador.
#
# Comprueban LAS TRES PROMESAS contra un Claude de mentiras que YA tiene skills
# propias — incluida una que choca de nombre. Sin esta prueba, el instalador
# es una promesa escrita en un comentario.
#
#   bash kit-colaborador/pruebas.sh
set -u
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FALSO="$(mktemp -d)"
bien=0; mal=0
ok(){ if [ "$2" = "1" ]; then bien=$((bien+1)); echo "  ✓ $1";
      else mal=$((mal+1)); echo "  ✗ $1${3:+  → $3}"; fi; }

# ── Un compañero que ya trabajó con su Claude ────────────────────────────
mkdir -p "$FALSO/skills/find-skill" "$FALSO/skills/mi-skill-propia" "$FALSO/projects/algo/memory"
echo "SU VERSION, distinta, que no se debe perder" > "$FALSO/skills/find-skill/SKILL.md"
echo "skill que solo tiene el"                     > "$FALSO/skills/mi-skill-propia/SKILL.md"
echo "lo que su Claude aprendio con el"            > "$FALSO/projects/algo/memory/aprendido.md"
echo "# El CLAUDE.md del compañero"                > "$FALSO/CLAUDE.md"
huellaMem="$(md5sum "$FALSO/projects/algo/memory/aprendido.md" | cut -d' ' -f1)"
huellaMd="$(md5sum "$FALSO/CLAUDE.md" | cut -d' ' -f1)"

CLAUDE_HOME="$FALSO" bash "$AQUI/instalar.sh" >/dev/null 2>&1

echo
echo "── Promesa 1 · no pierdes lo que ya tienes ──"
grep -q "SU VERSION" "$FALSO/skills/find-skill/SKILL.md" 2>/dev/null && r=1 || r=0
ok "la skill del compañero que chocaba sigue siendo la SUYA" "$r"
[ -f "$FALSO/skills/find-skill-mazi/SKILL.md" ] && r=1 || r=0
ok "y la de Mazi quedó al lado, como find-skill-mazi" "$r"
grep -q "solo tiene el" "$FALSO/skills/mi-skill-propia/SKILL.md" 2>/dev/null && r=1 || r=0
ok "su skill propia quedó intacta" "$r"
[ -d "$FALSO/skills/four-judges" ] && r=1 || r=0
ok "y sí entraron las de la casa que no chocaban" "$r"

echo
echo "── Promesa 2 · no se toca tu memoria ──"
[ "$(md5sum "$FALSO/projects/algo/memory/aprendido.md" | cut -d' ' -f1)" = "$huellaMem" ] && r=1 || r=0
ok "su memoria quedó byte por byte igual" "$r"
[ "$(md5sum "$FALSO/CLAUDE.md" | cut -d' ' -f1)" = "$huellaMd" ] && r=1 || r=0
ok "su CLAUDE.md quedó byte por byte igual" "$r"
[ -f "$FALSO/CLAUDE-mazi.md" ] && r=1 || r=0
ok "el método de la casa entró en un archivo APARTE" "$r"

echo
echo "── Promesa 3 · nada de Carlos viaja ──"
if grep -rliE "icamp|ligas.mazi|torre.infinita|comisi[oó]n|@gmail|whatsapp|442 ?883" \
     "$FALSO/CLAUDE-mazi.md" >/dev/null 2>&1; then r=0; else r=1; fi
ok "el método no menciona clientes, proyectos, precios ni contactos" "$r"
ls -d "$FALSO"/respaldos/skills-* >/dev/null 2>&1 && r=1 || r=0
ok "quedó respaldo de lo que él tenía antes" "$r"
grep -rq "SU VERSION" "$FALSO"/respaldos/*/find-skill/SKILL.md 2>/dev/null && r=1 || r=0
ok "y el respaldo sí trae su versión, no la nuestra" "$r"

echo
echo "── MUTACIÓN · ¿la prueba cazaría un instalador que sí pisa? ──"
CLAUDE_HOME="$FALSO" bash -c '
  cp -R "'"$AQUI"'/../.claude/skills/find-skill" "'"$FALSO"'/skills/find-skill.pisado" 2>/dev/null
  cp -R "'"$AQUI"'/../.claude/skills/find-skill/." "'"$FALSO"'/skills/find-skill/" 2>/dev/null' >/dev/null 2>&1
grep -q "SU VERSION" "$FALSO/skills/find-skill/SKILL.md" 2>/dev/null && r=0 || r=1
ok "MUTACIÓN: pisando la skill a mano, la comprobación SÍ lo detecta" "$r" \
   "si esto falla, la promesa 1 no se está comprobando de verdad"

rm -rf "$FALSO"
echo
echo "$bien bien · $mal mal"
[ "$mal" -eq 0 ] || exit 1
