#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  SignalMaster Pro v7 — Script de Instalação Automática
#  Execute na sua VPS: bash install.sh
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✔ $1${NC}"; }
info() { echo -e "${CYAN}→ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✖ $1${NC}"; exit 1; }
step() { echo -e "\n${BOLD}${BLUE}══ $1 ══${NC}"; }

echo -e "${BOLD}"
echo "  ███████╗██╗ ██████╗ ███╗   ██╗ █████╗ ██╗     "
echo "  ██╔════╝██║██╔════╝ ████╗  ██║██╔══██╗██║     "
echo "  ███████╗██║██║  ███╗██╔██╗ ██║███████║██║     "
echo "  ╚════██║██║██║   ██║██║╚██╗██║██╔══██║██║     "
echo "  ███████║██║╚██████╔╝██║ ╚████║██║  ██║███████╗"
echo "  ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝"
echo ""
echo "       SignalMaster Pro v7 — Instalação VPS"
echo -e "${NC}"

[[ $EUID -ne 0 ]] && err "Execute como root: sudo bash install.sh"

# ── 1. Coletar informações ─────────────────────────────────────
step "Configuração Inicial"

echo -e "\n${BOLD}Preencha as informações abaixo:${NC}\n"

read -p "  Seu domínio (ex: sinais.meusite.com): " DOMAIN
[[ -z "$DOMAIN" ]] && err "Domínio obrigatório"

read -p "  URL do repositório GitHub (ex: https://github.com/usuario/repo): " GITHUB_URL
[[ -z "$GITHUB_URL" ]] && err "URL do GitHub obrigatória"

read -p "  Senha para o banco de dados: " DB_PASS
[[ -z "$DB_PASS" ]] && err "Senha do banco obrigatória"

read -p "  SESSION_SECRET (chave secreta longa — pode inventar): " SESSION_SECRET
[[ -z "$SESSION_SECRET" ]] && SESSION_SECRET=$(openssl rand -hex 32)

read -p "  TWELVE_DATA_API_KEY (para Forex em tempo real — pressione Enter para pular): " TWELVE_KEY
read -p "  RESEND_API_KEY (para envio de email — pressione Enter para pular): " RESEND_KEY

read -p "  STRIPE_PRICE_PRO (ID do plano Stripe — pressione Enter para pular): " STRIPE_PRO
read -p "  STRIPE_PRICE_PREMIUM (ID plano Premium — pressione Enter para pular): " STRIPE_PREM
read -p "  STRIPE_WEBHOOK_SECRET (whsec_... — pressione Enter para pular): " STRIPE_WEBHOOK

INSTALL_DIR="/var/www/signalmaster"
DB_NAME="signalmaster"
DB_USER="smpuser"
APP_PORT=8080

echo ""
warn "Resumo da instalação:"
echo "  Domínio:     $DOMAIN"
echo "  Pasta:       $INSTALL_DIR"
echo "  Banco:       $DB_NAME"
echo "  Porta API:   $APP_PORT"
echo ""
read -p "Confirmar instalação? (s/n): " CONFIRM
[[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]] && err "Instalação cancelada"

# ── 2. Atualizar sistema ───────────────────────────────────────
step "Atualizando sistema"
apt-get update -qq && apt-get upgrade -y -qq
ok "Sistema atualizado"

# ── 3. Instalar Node.js 20 ────────────────────────────────────
step "Instalando Node.js 20"
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
  apt-get install -y nodejs -qq
fi
ok "Node.js $(node -v) instalado"

# ── 4. Instalar pnpm ──────────────────────────────────────────
step "Instalando pnpm"
npm install -g pnpm@9 pm2 -q
ok "pnpm e PM2 instalados"

# ── 5. Instalar PostgreSQL ────────────────────────────────────
step "Instalando PostgreSQL"
if ! command -v psql &>/dev/null; then
  apt-get install -y postgresql postgresql-contrib -qq
fi
systemctl enable postgresql --now &>/dev/null
ok "PostgreSQL instalado e rodando"

# ── 6. Criar banco de dados ───────────────────────────────────
step "Configurando banco de dados"
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
ok "Banco '$DB_NAME' criado"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# ── 7. Instalar Nginx ─────────────────────────────────────────
step "Instalando Nginx"
apt-get install -y nginx certbot python3-certbot-nginx -qq
ok "Nginx instalado"

# ── 8. Clonar projeto ─────────────────────────────────────────
step "Baixando projeto do GitHub"
if [[ -d "$INSTALL_DIR" ]]; then
  info "Pasta já existe — atualizando..."
  cd "$INSTALL_DIR" && git pull
else
  git clone "$GITHUB_URL" "$INSTALL_DIR"
fi
ok "Projeto baixado em $INSTALL_DIR"

# ── 9. Criar arquivo .env ─────────────────────────────────────
step "Criando configurações (.env)"
cat > "${INSTALL_DIR}/artifacts/api-server/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${SESSION_SECRET}
REFRESH_SECRET=${SESSION_SECRET}
TWELVE_DATA_API_KEY=${TWELVE_KEY}
RESEND_API_KEY=${RESEND_KEY}
STRIPE_PRICE_PRO=${STRIPE_PRO}
STRIPE_PRICE_PREMIUM=${STRIPE_PREM}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK}
PORT=${APP_PORT}
NODE_ENV=production
EOF
ok "Arquivo .env criado"

# ── 10. Instalar dependências e fazer build ───────────────────
step "Instalando dependências e compilando"
cd "$INSTALL_DIR"
pnpm install --frozen-lockfile 2>&1 | tail -3

info "Compilando backend..."
pnpm --filter @workspace/api-server run build 2>&1 | tail -5

info "Rodando migrations do banco..."
pnpm --filter @workspace/db run migrate 2>&1 | tail -5

info "Compilando frontend..."
pnpm --filter @workspace/signalmaster-pro run build 2>&1 | tail -5
ok "Build completo"

# ── 11. Configurar PM2 (backend 24/7) ─────────────────────────
step "Configurando PM2 (processo 24/7)"
pm2 delete smp-api 2>/dev/null || true
pm2 start node \
  --name smp-api \
  --cwd "${INSTALL_DIR}/artifacts/api-server" \
  -- --enable-source-maps ./dist/index.mjs
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true
ok "Backend rodando com PM2"

# ── 12. Configurar Nginx ──────────────────────────────────────
step "Configurando Nginx"
cat > "/etc/nginx/sites-available/signalmaster" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    root ${INSTALL_DIR}/artifacts/signalmaster-pro/dist;
    index index.html;

    # Frontend (React SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket (Socket.io — sinais em tempo real)
    location /socket.io {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }
}
EOF

ln -sf /etc/nginx/sites-available/signalmaster /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ok "Nginx configurado"

# ── 13. SSL grátis com Let's Encrypt ──────────────────────────
step "Instalando certificado SSL (HTTPS)"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}" 2>&1 | tail -5 || warn "SSL falhou — configure manualmente depois"

# ── 14. Criar script de atualização ───────────────────────────
cat > "/usr/local/bin/smp-update" <<'UPDATEEOF'
#!/bin/bash
echo "Atualizando SignalMaster Pro..."
cd /var/www/signalmaster
git pull
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/signalmaster-pro run build
pnpm --filter @workspace/db run migrate
pm2 restart smp-api
echo "Atualizado com sucesso!"
UPDATEEOF
chmod +x /usr/local/bin/smp-update

# ── Finalização ────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ═══════════════════════════════════════════════"
echo "    INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "  ═══════════════════════════════════════════════"
echo -e "${NC}"
echo -e "  ${BOLD}Acesse seu app:${NC}  https://${DOMAIN}"
echo -e "  ${BOLD}Status backend:${NC}  pm2 status"
echo -e "  ${BOLD}Logs em tempo real:${NC} pm2 logs smp-api"
echo -e "  ${BOLD}Atualizar app:${NC}   smp-update"
echo ""
echo -e "  ${YELLOW}Para ver os sinais da Binance funcionando:"
echo -e "  pm2 logs smp-api | grep AssetData${NC}"
echo ""
