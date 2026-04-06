#!/usr/bin/env bash
# =============================================================================
# ChromePeps VPS Setup & Hardening Script
# Target: Ubuntu 24.04 LTS (fresh install)
#
# Usage:
#   chmod +x setup-server.sh
#   sudo ./setup-server.sh --domain chromepeps.com --email admin@chromepeps.com
#
# What this script does:
#   1. System updates & essential packages
#   2. Creates non-root deploy user with SSH key auth
#   3. Hardens SSH (key-only, no root login, custom port)
#   4. Configures UFW firewall
#   5. Installs & configures Fail2Ban
#   6. Installs Docker & Docker Compose
#   7. Sets up Let's Encrypt SSL certificates
#   8. Clones the project and starts the stack
#   9. Enables automatic security updates
# =============================================================================

set -euo pipefail

# ---- Color output ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ---- Parse arguments ----
DOMAIN=""
EMAIL=""
DEPLOY_USER="deploy"
SSH_PORT="2222"
REPO_URL="https://github.com/HamudL/ChromePeps.git"
PROJECT_DIR="/opt/chromepeps"

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email)  EMAIL="$2"; shift 2 ;;
    --user)   DEPLOY_USER="$2"; shift 2 ;;
    --ssh-port) SSH_PORT="$2"; shift 2 ;;
    --repo)   REPO_URL="$2"; shift 2 ;;
    *) err "Unknown option: $1" ;;
  esac
done

[[ -z "$DOMAIN" ]] && err "Usage: $0 --domain <domain> --email <email>"
[[ -z "$EMAIL" ]]  && err "Usage: $0 --domain <domain> --email <email>"

# ---- Must run as root ----
[[ $EUID -ne 0 ]] && err "This script must be run as root (sudo)"

log "Starting ChromePeps VPS setup for: $DOMAIN"

# =============================================================================
# 1. System Update & Essentials
# =============================================================================
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git unzip htop ncdu \
  ufw fail2ban \
  apt-transport-https ca-certificates gnupg lsb-release \
  software-properties-common

# ---- Automatic security updates ----
log "Enabling automatic security updates..."
apt-get install -y -qq unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APTCONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APTCONF

# =============================================================================
# 2. Create Deploy User
# =============================================================================
if ! id "$DEPLOY_USER" &>/dev/null; then
  log "Creating deploy user: $DEPLOY_USER"
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$DEPLOY_USER"

  # Copy SSH keys from root
  mkdir -p "/home/$DEPLOY_USER/.ssh"
  if [[ -f /root/.ssh/authorized_keys ]]; then
    cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
  fi
  chmod 700 "/home/$DEPLOY_USER/.ssh"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys" 2>/dev/null || true
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
else
  log "Deploy user $DEPLOY_USER already exists, skipping..."
fi

# =============================================================================
# 3. Harden SSH
# =============================================================================
log "Hardening SSH configuration..."
SSHD_CONFIG="/etc/ssh/sshd_config"
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.backup.$(date +%s)"

# Apply SSH hardening
sed -i "s/^#\?Port .*/Port $SSH_PORT/" "$SSHD_CONFIG"
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' "$SSHD_CONFIG"
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#\?ChallengeResponseAuthentication .*/ChallengeResponseAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#\?UsePAM .*/UsePAM no/' "$SSHD_CONFIG"
sed -i 's/^#\?X11Forwarding .*/X11Forwarding no/' "$SSHD_CONFIG"
sed -i 's/^#\?MaxAuthTries .*/MaxAuthTries 3/' "$SSHD_CONFIG"
sed -i 's/^#\?ClientAliveInterval .*/ClientAliveInterval 300/' "$SSHD_CONFIG"
sed -i 's/^#\?ClientAliveCountMax .*/ClientAliveCountMax 2/' "$SSHD_CONFIG"

# Allow only deploy user
if ! grep -q "^AllowUsers" "$SSHD_CONFIG"; then
  echo "AllowUsers $DEPLOY_USER" >> "$SSHD_CONFIG"
fi

systemctl restart sshd
log "SSH hardened: port=$SSH_PORT, key-only, no root login"

# =============================================================================
# 4. Configure UFW Firewall
# =============================================================================
log "Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT/tcp" comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable
log "UFW enabled: SSH($SSH_PORT), HTTP(80), HTTPS(443)"

# =============================================================================
# 5. Configure Fail2Ban
# =============================================================================
log "Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local <<FAIL2BAN
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 7200
FAIL2BAN

systemctl enable fail2ban
systemctl restart fail2ban
log "Fail2Ban configured and running"

# =============================================================================
# 6. Install Docker & Docker Compose
# =============================================================================
log "Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$DEPLOY_USER"
  systemctl enable docker
  systemctl start docker
  log "Docker installed"
else
  log "Docker already installed, skipping..."
fi

# =============================================================================
# 7. Install Certbot & Get SSL Certificates
# =============================================================================
log "Setting up SSL with Let's Encrypt..."
apt-get install -y -qq certbot

# Create webroot for ACME challenges
mkdir -p /var/www/certbot

# Stop any service on port 80 temporarily
systemctl stop nginx 2>/dev/null || true
docker stop chromepeps-nginx 2>/dev/null || true

if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  certbot certonly --standalone \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --no-eff-email
  log "SSL certificate obtained for $DOMAIN"
else
  log "SSL certificate already exists for $DOMAIN"
fi

# Auto-renew cron
if ! crontab -l 2>/dev/null | grep -q certbot; then
  (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --deploy-hook 'docker restart chromepeps-nginx'") | crontab -
  log "SSL auto-renewal cron job added"
fi

# =============================================================================
# 8. Clone Project & Start Stack
# =============================================================================
log "Setting up project..."
if [[ ! -d "$PROJECT_DIR" ]]; then
  git clone "$REPO_URL" "$PROJECT_DIR"
else
  cd "$PROJECT_DIR" && git pull origin main
fi

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$PROJECT_DIR"

# Create .env from example if not exists
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  warn "Created .env from example — EDIT $PROJECT_DIR/.env WITH REAL VALUES BEFORE STARTING!"
  warn "Required: DATABASE_URL, REDIS_URL, AUTH_SECRET, STRIPE keys, NEXT_PUBLIC_APP_URL"
  warn ""
  warn "Generate AUTH_SECRET: openssl rand -base64 32"
  warn "Set NEXT_PUBLIC_APP_URL=https://$DOMAIN"
fi

# Update Nginx config with actual domain
NGINX_CONF="$PROJECT_DIR/docker/nginx/nginx.conf"
sed -i "s/chromepeps\.com/$DOMAIN/g" "$NGINX_CONF"

# Add POSTGRES_PASSWORD to .env if not set
if ! grep -q "^POSTGRES_PASSWORD=" "$PROJECT_DIR/.env"; then
  PG_PASS=$(openssl rand -base64 24)
  echo "POSTGRES_PASSWORD=$PG_PASS" >> "$PROJECT_DIR/.env"
  log "Generated Postgres password"
fi

log ""
log "============================================="
log "  ChromePeps VPS Setup Complete!"
log "============================================="
log ""
log "  Domain:       $DOMAIN"
log "  SSH Port:     $SSH_PORT"
log "  Deploy User:  $DEPLOY_USER"
log "  Project Dir:  $PROJECT_DIR"
log ""
log "  NEXT STEPS:"
log "  1. Edit $PROJECT_DIR/.env with production values"
log "  2. cd $PROJECT_DIR"
log "  3. docker compose -f docker/docker-compose.yml up -d --build"
log "  4. docker compose -f docker/docker-compose.yml exec app npx prisma migrate deploy"
log "  5. docker compose -f docker/docker-compose.yml exec app npx prisma db seed"
log ""
warn "  IMPORTANT: Connect via SSH on port $SSH_PORT from now on:"
warn "  ssh -p $SSH_PORT $DEPLOY_USER@$DOMAIN"
log ""
