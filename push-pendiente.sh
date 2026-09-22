#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# VAULTNOTES — PUSH PENDIENTE (expansión HelpDesk completa)
# ═══════════════════════════════════════════════════════════════════
# POR QUÉ: el PAT que vivía en el remote volvió a quedar INVÁLIDO
# (push → "Invalid username or token"; GitHub auto-revoca tokens
# filtrados). El trabajo está COMPLETO y commiteado localmente, pero
# NO publicado. Quedan 4 commits por publicar sobre origin/main
# (6d392fb):
#   · 8e18e87 — FASE 1: Dexie v19 + datasets HelpDesk (glosario 639,
#     roadmap HD 65, 48 tickets Nexora, 28 KB, 4 labs, perfil L1)
#   · e61b792 — (stray) fix AttackCategory 'PrivEsc' (89→102 ataques)
#   · eabcdbd — FASE 2: 15 tools HelpDesk integradas (44 utilidades)
#   · 1623c3c — FASE 3+4: UI Service Desk + Roadmap HelpDesk +
#     backup v3.5.0 (helpdeskTickets.json + roadmapHelpDesk.json)
#
# PREPARACIÓN (1 minuto):
#   1. Crea un token nuevo: github.com/settings/tokens
#      → "Generate new token (classic)" → scope: repo (Completo)
#   2. Pégalo abajo en TOKEN="…"
#   3. Ejecuta: bash push-pendiente.sh
#
# NOTA: ejecuta esto en la copia del repo que CONTENGA el commit
# 1623c3c (la del entorno de desarrollo). Si tu clon local no lo
# tiene aún, dímelo por chat con el token nuevo y hago el push desde
# el entorno en segundos.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

# ── CONFIGURA AQUÍ ──────────────────────────────────────────────────
TOKEN="PEGA_AQUI_TU_TOKEN_NUEVO"          # ghp_… (classic, scope repo)
REPO_DIR="${1:-.}"                        # carpeta del repo (default: actual)
# ────────────────────────────────────────────────────────────────────

if [[ "$TOKEN" == "PEGA_AQUI_TU_TOKEN_NUEVO" ]]; then
  echo "✗ Edita el script y pega tu token nuevo en TOKEN=…" >&2
  exit 1
fi

cd "$REPO_DIR"
git remote set-url origin "https://${TOKEN}@github.com/dieg0y/VAULTNOTES.git"

echo "→ Publicando main (HEAD: $(git rev-parse --short HEAD))…"
git push origin main

echo ""
echo "✓ GitHub queda así:"
git ls-remote --heads origin
echo ""
git log --oneline -5
echo ""
echo "✓ Listo. En tu PC: doble clic en IniciarVaultNotes.bat → botón Pull."
