#!/usr/bin/env bash
# Auto-deploy : pull + restart SEULEMENT si le code a changé.
# Ajouter en crontab : */2 * * * * /chemin/du/projet/scripts/auto-deploy.sh >> /var/log/chasse-deploy.log 2>&1

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

BEFORE=$(git rev-parse HEAD)
git pull origin main --quiet
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
  exit 0  # Rien de nouveau, on ne touche à rien
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Nouveau commit détecté : $BEFORE → $AFTER"

# Installer les dépendances si package.json a changé
if git diff --name-only "$BEFORE" "$AFTER" | grep -q "package.*json"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] package.json modifié → npm install"
  npm install --quiet
fi

# Redémarrer le serveur (pm2 en priorité, sinon systemd)
if command -v pm2 &>/dev/null && pm2 list | grep -q "online"; then
  pm2 restart all --update-env
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Redémarré via pm2"
elif systemctl list-units --type=service | grep -q "node\|chasse"; then
  SERVICE=$(systemctl list-units --type=service | grep -o "[a-z-]*chasse[a-z-]*\|[a-z-]*node[a-z-]*" | head -1)
  systemctl restart "$SERVICE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Redémarré via systemctl $SERVICE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ Aucun process manager détecté — redémarre manuellement"
fi
