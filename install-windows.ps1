# ═══════════════════════════════════════════════════════════════
#  SignalMaster Pro v7 — Instalador para Windows Server
#  Execute no PowerShell como Administrador:
#  Set-ExecutionPolicy Bypass -Scope Process -Force; .\install-windows.ps1
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

function ok   { Write-Host "  OK  $args" -ForegroundColor Green }
function info { Write-Host "  >>  $args" -ForegroundColor Cyan }
function warn { Write-Host "  !!  $args" -ForegroundColor Yellow }
function step { Write-Host "`n===== $args =====" -ForegroundColor Blue }

Write-Host @"

  SIGNAL MASTER PRO v7 — Instalacao Windows
  ==========================================

"@ -ForegroundColor White

# ── Verificar se é Administrador ──────────────────────────────
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERRO: Execute o PowerShell como Administrador!" -ForegroundColor Red
    Write-Host "Clique com o botao direito no PowerShell > Executar como Administrador" -ForegroundColor Yellow
    pause; exit 1
}

# ── Coletar informações ────────────────────────────────────────
step "Configuracao Inicial"

Write-Host ""
$GITHUB_URL    = Read-Host "  URL do GitHub (ex: https://github.com/usuario/Signal-Master-Pro)"
$DB_PASS       = Read-Host "  Senha para o banco de dados"
$SESSION_SEC   = Read-Host "  SESSION_SECRET (pode inventar uma frase longa)"
if ([string]::IsNullOrEmpty($SESSION_SEC)) { $SESSION_SEC = [System.Guid]::NewGuid().ToString("N") + [System.Guid]::NewGuid().ToString("N") }
$TWELVE_KEY    = Read-Host "  TWELVE_DATA_API_KEY (para Forex em tempo real — Enter para pular)"
$RESEND_KEY    = Read-Host "  RESEND_API_KEY (Enter para pular)"
$STRIPE_PRO    = Read-Host "  STRIPE_PRICE_PRO (Enter para pular)"
$STRIPE_PREM   = Read-Host "  STRIPE_PRICE_PREMIUM (Enter para pular)"
$STRIPE_WH     = Read-Host "  STRIPE_WEBHOOK_SECRET (Enter para pular)"
$APP_PORT      = "8080"
$INSTALL_DIR   = "C:\signalmaster"
$DB_NAME       = "signalmaster"
$DB_USER       = "smpuser"

Write-Host ""
warn "Resumo:"
Write-Host "  Pasta:    $INSTALL_DIR"
Write-Host "  Banco:    $DB_NAME"
Write-Host "  Porta:    $APP_PORT"
Write-Host ""
$confirm = Read-Host "Confirmar instalacao? (s/n)"
if ($confirm -ne "s" -and $confirm -ne "S") { Write-Host "Cancelado."; exit }

# ── Instalar Chocolatey (gerenciador de pacotes Windows) ───────
step "Instalando Chocolatey"
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    info "Instalando Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
ok "Chocolatey pronto"

# ── Instalar Node.js ───────────────────────────────────────────
step "Instalando Node.js 20"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y --no-progress
    $env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
ok "Node.js $(node -v)"

# ── Instalar pnpm e PM2 ────────────────────────────────────────
step "Instalando pnpm e PM2"
npm install -g pnpm@9 pm2 --quiet
ok "pnpm e PM2 instalados"

# ── Instalar Git ───────────────────────────────────────────────
step "Instalando Git"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y --no-progress
    $env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
ok "Git instalado"

# ── Instalar PostgreSQL ────────────────────────────────────────
step "Instalando PostgreSQL"
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    choco install postgresql14 --params "/Password:$DB_PASS" -y --no-progress
    $env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Start-Sleep -Seconds 5
}
ok "PostgreSQL instalado"

# ── Criar banco de dados ───────────────────────────────────────
step "Criando banco de dados"
$pgCmd = Get-Command psql -ErrorAction SilentlyContinue
if ($pgCmd) { $pgPath = $pgCmd.Source } else { $pgPath = "C:\Program Files\PostgreSQL\14\bin\psql.exe" }
if (-not (Test-Path $pgPath)) { $pgPath = "C:\Program Files\PostgreSQL\15\bin\psql.exe" }
if (-not (Test-Path $pgPath)) { $pgPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe" }
$env:PGPASSWORD = $DB_PASS
& $pgPath -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>$null
& $pgPath -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>$null
& $pgPath -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>$null
ok "Banco '$DB_NAME' criado"

$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# ── Clonar projeto ─────────────────────────────────────────────
step "Baixando projeto do GitHub"
if (Test-Path $INSTALL_DIR) {
    info "Pasta ja existe, atualizando..."
    Set-Location $INSTALL_DIR
    git pull
} else {
    git clone $GITHUB_URL $INSTALL_DIR
}
ok "Projeto em $INSTALL_DIR"

# ── Criar arquivo .env ─────────────────────────────────────────
step "Criando arquivo de configuracao (.env)"
$envContent = @"
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$SESSION_SEC
REFRESH_SECRET=$SESSION_SEC
TWELVE_DATA_API_KEY=$TWELVE_KEY
RESEND_API_KEY=$RESEND_KEY
STRIPE_PRICE_PRO=$STRIPE_PRO
STRIPE_PRICE_PREMIUM=$STRIPE_PREM
STRIPE_WEBHOOK_SECRET=$STRIPE_WH
PORT=$APP_PORT
NODE_ENV=production
"@
$envContent | Out-File -FilePath "$INSTALL_DIR\artifacts\api-server\.env" -Encoding utf8
ok "Arquivo .env criado"

# ── Build do projeto ───────────────────────────────────────────
step "Compilando o projeto"
Set-Location $INSTALL_DIR
info "Instalando dependencias..."
pnpm install --frozen-lockfile

info "Compilando backend..."
pnpm --filter @workspace/api-server run build

info "Rodando migracoes do banco..."
pnpm --filter @workspace/db run migrate

info "Compilando frontend..."
pnpm --filter @workspace/signalmaster-pro run build

ok "Build completo"

# ── Iniciar com PM2 ───────────────────────────────────────────
step "Iniciando app com PM2 (24/7)"
try { pm2 delete smp-api 2>$null } catch {}
Set-Location "$INSTALL_DIR\artifacts\api-server"
pm2 start node --name smp-api -- --enable-source-maps .\dist\index.mjs
pm2 save

# Configurar PM2 para iniciar com o Windows
pm2 startup | Out-Null
info "Configurando inicio automatico..."
$pm2StartupCmd = pm2 startup | Select-String "pm2"
if ($pm2StartupCmd) { Invoke-Expression $pm2StartupCmd }

ok "App rodando na porta $APP_PORT"

# ── Instalar e configurar Nginx Windows ───────────────────────
step "Instalando Nginx"
choco install nginx -y --no-progress
$nginxDir = "C:\tools\nginx"
if (-not (Test-Path $nginxDir)) { $nginxDir = "C:\nginx" }

$nginxConf = @"
worker_processes 1;
events { worker_connections 1024; }
http {
    include mime.types;
    default_type application/octet-stream;
    server {
        listen 80;
        server_name localhost;
        root $INSTALL_DIR\artifacts\signalmaster-pro\dist;
        index index.html;
        location / {
            try_files `$uri `$uri/ /index.html;
        }
        location /api {
            proxy_pass http://localhost:$APP_PORT;
            proxy_http_version 1.1;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
        }
        location /socket.io {
            proxy_pass http://localhost:$APP_PORT;
            proxy_http_version 1.1;
            proxy_set_header Upgrade `$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 86400;
        }
    }
}
"@

$nginxConf | Out-File -FilePath "$nginxDir\conf\nginx.conf" -Encoding utf8
Start-Process -FilePath "$nginxDir\nginx.exe" -WorkingDirectory $nginxDir -WindowStyle Hidden
ok "Nginx rodando na porta 80"

# ── Criar script de atualização ───────────────────────────────
$updateScript = @"
Write-Host "Atualizando SignalMaster Pro..." -ForegroundColor Cyan
Set-Location $INSTALL_DIR
git pull
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/signalmaster-pro run build
pnpm --filter @workspace/db run migrate
pm2 restart smp-api
Write-Host "Atualizado com sucesso!" -ForegroundColor Green
"@
$updateScript | Out-File -FilePath "C:\smp-update.ps1" -Encoding utf8

# ── Abrir firewall ─────────────────────────────────────────────
step "Abrindo portas no firewall"
netsh advfirewall firewall add rule name="SignalMaster HTTP" dir=in action=allow protocol=TCP localport=80 2>$null
netsh advfirewall firewall add rule name="SignalMaster API" dir=in action=allow protocol=TCP localport=$APP_PORT 2>$null
ok "Portas 80 e $APP_PORT abertas"

# ── Finalização ───────────────────────────────────────────────
Write-Host @"

  =============================================
    INSTALACAO CONCLUIDA COM SUCESSO!
  =============================================

  Acesse pelo navegador: http://IP_DA_SUA_VPS

  Ver status do app:    pm2 status
  Ver logs em tempo real: pm2 logs smp-api
  Atualizar o app:       powershell C:\smp-update.ps1

  Para verificar Binance ao vivo:
    pm2 logs smp-api | Select-String "AssetData"

"@ -ForegroundColor Green
