#!/bin/bash
# Database runtime build — intentionally a no-op.
#
# VaultNotes is 100% local-first: all persistence lives in the browser
# (Dexie/IndexedDB). There is no server-side database (Prisma was removed
# during the dead-code cleanup), so this step has nothing to build.
#
# Kept as a no-op (instead of deleted) because .zscripts/build.sh calls it
# unconditionally during the sandbox deploy pipeline.

set -euo pipefail

echo "ℹ️  No server-side database needed — VaultNotes stores data in the browser (IndexedDB)."
