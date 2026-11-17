#!/usr/bin/env bash
# Install or update on an Ubuntu server (idempotent):
#   BOT_TOKEN=123:abc bash deploy.sh                 # first run; DOMAIN defaults to <ip>.sslip.io
#   bash deploy.sh                                   # later updates
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/kazuhaa99/secret-santa.git}"
APP_DIR="${APP_DIR:-$HOME/secret-santa}"
log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  log 'Packages: docker, compose, git'
  sudo apt-get update -y
  sudo apt-get install -y docker.io docker-compose-v2 git curl
  sudo systemctl enable --now docker
fi

if [ "$(swapon --show | wc -l)" -eq 0 ] && [ "$(free -m | awk '/^Mem:/ {print $2}')" -lt 4000 ]; then
  log 'Swap: 2 GB'
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# Oracle's Ubuntu images reject everything but SSH in iptables.
if command -v netfilter-persistent >/dev/null; then
  for port in 80 443; do
    sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
  done
  sudo netfilter-persistent save
fi

log "Code: $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull --ff-only; else git clone "$REPO_URL" "$APP_DIR"; fi
cd "$APP_DIR"

if [ ! -f .env ]; then
  : "${BOT_TOKEN:?first run needs BOT_TOKEN=<token from @BotFather>}"
  if [ -z "${DOMAIN:-}" ]; then
    ip="$(curl -fsS https://api.ipify.org)"
    DOMAIN="${ip//./-}.sslip.io"
  fi
  umask 077
  printf 'DOMAIN=%s\nBOT_TOKEN=%s\n' "$DOMAIN" "$BOT_TOKEN" >.env
fi

log 'Build and start'
sudo docker compose up -d --build --remove-orphans
# git pull replaces the Caddyfile (new inode); restart Caddy so the bind mount sees the new one.
sudo docker compose restart caddy >/dev/null
sudo docker image prune -f >/dev/null
log "Done: https://$(sed -n 's/^DOMAIN=//p' .env)"
echo 'Organiser account: sudo docker compose exec app node server/cli.ts create <login> "<Имя>"'
