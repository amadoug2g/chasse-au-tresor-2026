#!/usr/bin/env bash
# Auto-deploy : sync sur origin/main + restart SEULEMENT si le code a changé.
# Cron : */2 * * * * /home/claudeuser/chasse-au-tresor-2026/scripts/auto-deploy.sh >> /var/log/chasse-deploy.log 2>&1

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

BEFORE=$(git rev-parse HEAD)
git fetch origin main --quiet
AFTER=$(git rev-parse origin/main)

if [ "$BEFORE" = "$AFTER" ]; then
  exit 0  # Déjà à jour, on ne touche à rien
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Nouveau commit : $BEFORE → $AFTER"
git reset --hard origin/main

# npm install si package.json a changé
if git diff --name-only "$BEFORE" "$AFTER" | grep -q "package.*json"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] package.json modifié → npm install"
  npm install --quiet
fi

# Restart pm2 (nom du process : chasse)
if command -v pm2 &>/dev/null; then
  pm2 restart chasse --update-env
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] pm2 chasse redémarré ✓"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ pm2 non trouvé — redémarre manuellement"
fi
