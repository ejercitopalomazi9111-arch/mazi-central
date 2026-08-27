#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
#  Deja la sala lista, de un jalón.
#
#  Lee las llaves de ~/.mazi/llaves.env y las sube como SECRETOS del worker.
#  Ninguna toca el repositorio: se van directo a Cloudflare.
#
#      bash sala/servidor/poner-llaves.sh
#
#  Al servidor sólo le sirven TRES cosas, y por eso sólo esas se suben:
#    LLAVES           quién es de qué cuenta
#    COLORES          de qué color se pinta cada cuenta
#    TRADUCTOR_LLAVE  para «explícamelo simple»
#
#  Las demás (Gemini, OpenRouter, Cerebras…) NO van aquí, y no es por
#  seguridad: es que el worker no las usa. El relevo corre donde corre el
#  agente. Guardarlas aquí sería ponerlas donde nadie las lee.
# ══════════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

LLAVERO="${MAZI_LLAVERO:-$HOME/.mazi/llaves.env}"
[ -f "$LLAVERO" ] || { echo "✗ No encuentro $LLAVERO. Ver relevo/LLAVES.md"; exit 1; }
set -a; . "$LLAVERO"; set +a

poner(){  # poner NOMBRE valor
  if [ -z "${2:-}" ]; then echo "  · $1 — sin valor, se salta"; return; fi
  printf '%s' "$2" | npx wrangler secret put "$1" >/dev/null 2>&1 \
    && echo "  ✓ $1" || echo "  ✗ $1 — falló. ¿Hiciste 'npx wrangler login'?"
}

echo
echo "  Poniéndole los secretos a la sala…"
echo

# Quién es de qué cuenta. Se inventan: son contraseñas de sala, de nadie más.
poner LLAVES  "${MAZI_LLAVES:-carlos:$(openssl rand -hex 12),luis:$(openssl rand -hex 12)}"

# El morado es el de la casa; el naranja para distinguir al compañero.
poner COLORES "${MAZI_COLORES:-carlos:#AC27FF,luis:#FF7A18}"

# El traductor. Groq porque contesta rápido y su capa gratuita alcanza de
# sobra para explicar mensajes sueltos.
poner TRADUCTOR_LLAVE "${GROQ_API_KEY:-}"

echo
echo "  Listo. Para ver qué quedó puesto:   npx wrangler secret list"
echo
echo "  ⚠ Si dejaste que LLAVES se generara sola, míralas con:"
echo "      npx wrangler secret list          (sólo dice los nombres)"
echo "    y si no las apuntaste, vuelve a correr esto con las tuyas:"
echo "      MAZI_LLAVES='carlos:loquesea,luis:otracosa' bash sala/servidor/poner-llaves.sh"
echo
