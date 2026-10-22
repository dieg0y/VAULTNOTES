#!/bin/bash
# ============================================================
# VAULTNOTES — PUSH PENDIENTE (V11)
# ============================================================
# La sesión de trabajo terminó con TODO listo y commiteado
# localmente (commit 5eb769a, fast-forward limpio), pero el
# token de GitHub que estaba embebido en el remote fue
# REVOCADO/EXPIRÓ (401), así que el push final no pudo salir.
#
# TU CÓDIGO ESTÁ SEGURO: el commit vive en el repo local.
#
# PARA SUBIRLO (1 solo paso): pon tu token nuevo abajo y corre
# este script (o copia los 2 comandos a mano):
#
#   1) Crea un token con permisos de repo en:
#      https://github.com/settings/tokens
#   2) Edita este archivo y reemplaza TU_TOKEN_NUEVO
#   3) Ejecuta:  bash push-pendiente.sh
# ============================================================

set -e
cd "$(dirname "$0")"

TOKEN="TU_TOKEN_NUEVO"   # <-- REEMPLAZA ESTO con tu token

if [ "$TOKEN" = "TU_TOKEN_NUEVO" ]; then
  echo "ERROR: edita este archivo y pon tu token real en TOKEN="
  exit 1
fi

git remote set-url origin "https://${TOKEN}@github.com/dieg0y/VAULTNOTES.git"
git push origin main
echo "OK — V11 subida a GitHub."
