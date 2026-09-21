#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# VAULTNOTES — PUSH PENDIENTE + LIMPIEZA DE RAMA HUÉRFANA
# ═══════════════════════════════════════════════════════════════════
# POR QUÉ: el PAT que vivía en el remote fue REVOCADO por GitHub
# (API: 401 Bad credentials — GitHub auto-revoca tokens filtrados).
# El commit final de la sesión (a4a7b21 "chore: deep clean, optimize
# and improve pull button - production ready") está listo pero NO
# publicado. Este script lo publica con un token NUEVO.
#
# PREPARACIÓN (1 minuto):
#   1. Crea un token nuevo: github.com/settings/tokens
#      → "Generate new token (classic)" → scope: repo (Completo)
#   2. Pégalo abajo en TOKEN="…"
#   3. Ejecuta: bash push-pendiente.sh
#
# NOTA: ejecuta esto en la copia del repo que CONTENGA el commit
# a4a7b21. Si tu clon local no lo tiene aún, dímelo por chat con el
# token nuevo y hago el push desde el entorno en segundos.
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

echo "→ Publicando main (commit: $(git rev-parse --short HEAD))…"
git push origin main

echo "→ Eliminando la rama huérfana del bot de auditoría…"
git push origin --delete jules-audit-cleanup-report-15968749568198072801 2>/dev/null \
  || echo "  · ya estaba eliminada (ok)"

echo ""
echo "✓ GitHub queda así:"
git ls-remote --heads origin
echo ""
git log --oneline -3
echo ""
echo "✓ Listo. En tu PC: doble clic en IniciarVaultNotes.bat → botón Pull."
