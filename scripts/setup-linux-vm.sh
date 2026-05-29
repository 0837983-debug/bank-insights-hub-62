#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"

APP_ENV="${APP_ENV:-dev}"
APP_USER="${APP_USER:-bankapp}"
APP_ROOT="${APP_ROOT:-/opt/bank-insights}"
APP_DIR="${APP_DIR:-${APP_ROOT}/app}"
WEB_ROOT="${WEB_ROOT:-/var/www/bank-insights}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bank-insights}"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-bank_insights_${APP_ENV}}"
DB_USER="${DB_USER:-bank_${APP_ENV}_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost}"
SERVER_NAME="${SERVER_NAME:-_}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"

INSTALL_CERTBOT="${INSTALL_CERTBOT:-false}"
ENABLE_UFW="${ENABLE_UFW:-true}"
DEPLOY_APP="${DEPLOY_APP:-false}"

log() {
  printf '[%s] %s\n' "${SCRIPT_NAME}" "$1"
}

fail() {
  printf '[%s] ERROR: %s\n' "${SCRIPT_NAME}" "$1" >&2
  exit 1
}

usage() {
  cat <<EOF
Usage:
  APP_ENV=dev DB_PASSWORD='strong_password' bash scripts/${SCRIPT_NAME}

Required:
  DB_PASSWORD              PostgreSQL password for application user

Common optional env:
  APP_ENV                  dev | prod, default: dev
  APP_USER                 Linux app user, default: bankapp
  DB_NAME                  default: bank_insights_\${APP_ENV}
  DB_USER                  default: bank_\${APP_ENV}_user
  SERVER_NAME              Nginx server_name, default: _
  FRONTEND_URL             CORS/frontend URL, default: http://localhost
  REPO_URL                 optional Git repository URL
  BRANCH                   branch to clone/pull, default: main
  DEPLOY_APP               true to clone/build/start app, default: false
  ENABLE_UFW               true to enable firewall 22/80/443, default: true
  INSTALL_CERTBOT          true to install certbot, default: false

What it does on an existing Ubuntu/Debian VM:
  - installs OS packages
  - installs Node.js 20
  - installs PostgreSQL, Nginx, PM2
  - creates Linux app user
  - creates PostgreSQL database/user
  - writes /etc/bank-insights.env
  - configures Nginx reverse proxy
  - creates /usr/local/bin/bank-insights-deploy helper
  - optionally clones/builds/starts app when DEPLOY_APP=true and REPO_URL is set
EOF
}

require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    fail "Run as root or with sudo"
  fi
}

require_ubuntu_like() {
  if [[ ! -f /etc/os-release ]]; then
    fail "Unsupported OS: /etc/os-release not found"
  fi

  # shellcheck disable=SC1091
  source /etc/os-release
  case "${ID:-}" in
    ubuntu|debian)
      ;;
    *)
      fail "Unsupported OS: ${ID:-unknown}. Use Ubuntu/Debian Linux."
      ;;
  esac
}

ensure_inputs() {
  [[ "${1:-}" != "--help" && "${1:-}" != "-h" ]] || { usage; exit 0; }
  [[ -n "${DB_PASSWORD}" ]] || fail "DB_PASSWORD is required"
}

escape_sql_literal() {
  printf '%s' "$1" | sed "s/'/''/g"
}

install_packages() {
  log "Installing base packages"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates \
    curl \
    git \
    jq \
    nginx \
    postgresql \
    postgresql-contrib \
    unzip \
    build-essential \
    ufw

  if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 20 ]]; then
    log "Installing Node.js 20"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  else
    log "Node.js $(node -v) already installed"
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    log "Installing PM2"
    npm install -g pm2
  fi

  if [[ "${INSTALL_CERTBOT}" == "true" ]]; then
    log "Installing certbot"
    DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
  fi
}

ensure_app_user() {
  if id "${APP_USER}" >/dev/null 2>&1; then
    log "User ${APP_USER} already exists"
  else
    log "Creating user ${APP_USER}"
    useradd --create-home --shell /bin/bash "${APP_USER}"
  fi

  mkdir -p "${APP_ROOT}" "${WEB_ROOT}" "${BACKUP_DIR}"
  chown -R "${APP_USER}:${APP_USER}" "${APP_ROOT}" "${WEB_ROOT}" "${BACKUP_DIR}"
}

setup_postgres() {
  local escaped_password
  escaped_password="$(escape_sql_literal "${DB_PASSWORD}")"

  log "Starting PostgreSQL"
  systemctl enable postgresql
  systemctl start postgresql

  log "Ensuring PostgreSQL role ${DB_USER}"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE "${DB_USER}" LOGIN PASSWORD '${escaped_password}';
  ELSE
    ALTER ROLE "${DB_USER}" WITH LOGIN PASSWORD '${escaped_password}';
  END IF;
END
\$\$;
SQL

  log "Ensuring database ${DB_NAME}"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres <<SQL
SELECT 'CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
SQL

  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
}

write_env_file() {
  log "Writing /etc/bank-insights.env"
  cat >/etc/bank-insights.env <<EOF
APP_ENV=${APP_ENV}
NODE_ENV=$([[ "${APP_ENV}" == "prod" ]] && printf 'production' || printf 'development')
PORT=${BACKEND_PORT}
FRONTEND_URL=${FRONTEND_URL}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF
  chmod 600 /etc/bank-insights.env
  chown root:root /etc/bank-insights.env
}

configure_nginx() {
  log "Configuring Nginx"
  cat >/etc/nginx/sites-available/bank-insights <<EOF
server {
    listen 80 default_server;
    server_name ${SERVER_NAME};

    root ${WEB_ROOT};
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  rm -f /etc/nginx/sites-enabled/default
  ln -sf /etc/nginx/sites-available/bank-insights /etc/nginx/sites-enabled/bank-insights
  nginx -t
  systemctl enable nginx
  systemctl restart nginx
}

configure_firewall() {
  if [[ "${ENABLE_UFW}" != "true" ]]; then
    log "Skipping UFW configuration"
    return
  fi

  log "Configuring UFW"
  ufw allow OpenSSH >/dev/null || true
  ufw allow 'Nginx Full' >/dev/null || true
  ufw --force enable >/dev/null || true
}

write_deploy_helper() {
  log "Writing /usr/local/bin/bank-insights-deploy"
  cat >/usr/local/bin/bank-insights-deploy <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

APP_USER="${APP_USER:-bankapp}"
APP_DIR="${APP_DIR:-/opt/bank-insights/app}"
WEB_ROOT="${WEB_ROOT:-/var/www/bank-insights}"
BRANCH="${BRANCH:-main}"

log() {
  printf '[bank-insights-deploy] %s\n' "$1"
}

fail() {
  printf '[bank-insights-deploy] ERROR: %s\n' "$1" >&2
  exit 1
}

[[ -d "${APP_DIR}/.git" ]] || fail "Repo is not cloned at ${APP_DIR}"
[[ -f /etc/bank-insights.env ]] || fail "/etc/bank-insights.env not found"

chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}" "${WEB_ROOT}"

sudo -u "${APP_USER}" bash -lc "
  set -Eeuo pipefail
  cd '${APP_DIR}'
  git fetch origin
  git checkout '${BRANCH}'
  git pull --ff-only origin '${BRANCH}'
  npm ci
  cd backend
  npm ci
  npm run migrate
  npm run build
  cd ..
  npm run build
"

rsync -a --delete "${APP_DIR}/dist/" "${WEB_ROOT}/"
chown -R "${APP_USER}:${APP_USER}" "${WEB_ROOT}"

sudo -u "${APP_USER}" bash -lc "
  set -a
  source /etc/bank-insights.env
  set +a
  cd '${APP_DIR}/backend'
  if pm2 describe bank-insights-backend >/dev/null 2>&1; then
    pm2 restart bank-insights-backend --update-env
  else
    pm2 start dist/server.js --name bank-insights-backend --update-env
  fi
  pm2 save
"

systemctl reload nginx
log "Deploy completed"
EOF
  chmod +x /usr/local/bin/bank-insights-deploy
}

maybe_clone_and_deploy() {
  if [[ "${DEPLOY_APP}" != "true" ]]; then
    log "Skipping app deploy (DEPLOY_APP=false)"
    return
  fi

  [[ -n "${REPO_URL}" ]] || fail "REPO_URL is required when DEPLOY_APP=true"

  if [[ -d "${APP_DIR}/.git" ]]; then
    log "Repository already exists at ${APP_DIR}"
  else
    log "Cloning repository into ${APP_DIR}"
    rm -rf "${APP_DIR}"
    sudo -u "${APP_USER}" git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
  fi

  APP_USER="${APP_USER}" APP_DIR="${APP_DIR}" WEB_ROOT="${WEB_ROOT}" BRANCH="${BRANCH}" /usr/local/bin/bank-insights-deploy
}

print_summary() {
  cat <<EOF

Setup completed.

Environment:
  APP_ENV=${APP_ENV}
  APP_USER=${APP_USER}
  APP_DIR=${APP_DIR}
  WEB_ROOT=${WEB_ROOT}
  ENV_FILE=/etc/bank-insights.env
  DB_NAME=${DB_NAME}
  DB_USER=${DB_USER}

Next steps:
  1. If repo was not deployed:
     sudo -iu ${APP_USER}
     git clone <repo-url> ${APP_DIR}
     exit

  2. Deploy/update app:
     sudo APP_USER=${APP_USER} APP_DIR=${APP_DIR} WEB_ROOT=${WEB_ROOT} BRANCH=${BRANCH} /usr/local/bin/bank-insights-deploy

  3. Check services:
     systemctl status nginx
     sudo -iu ${APP_USER} pm2 status

  4. Keep /etc/bank-insights.env private.
EOF
}

main() {
  ensure_inputs "${1:-}"
  require_root
  require_ubuntu_like
  install_packages
  ensure_app_user
  setup_postgres
  write_env_file
  configure_nginx
  configure_firewall
  write_deploy_helper
  maybe_clone_and_deploy
  print_summary
}

main "$@"
