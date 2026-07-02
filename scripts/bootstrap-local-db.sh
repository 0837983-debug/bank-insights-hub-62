#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
DATASET_DIR="${PROJECT_ROOT}/test-data/uploads"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-bankdb_local}"
DB_USER="${DB_USER:-bank_local_user}"
DB_PASSWORD="${DB_PASSWORD:-bank_local_password}"
DB_ADMIN_USER="${DB_ADMIN_USER:-${USER:-postgres}}"

BALANCE_DATASET_FILES="${BALANCE_DATASET_FILES:-capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv}"
FIN_RESULTS_DATASET_FILES="${FIN_RESULTS_DATASET_FILES:-fin_results_2024-12.csv,fin_results_2025-01.csv,fin_results_2025-02.csv}"

log() {
  printf '[bootstrap-local-db] %s\n' "$1"
}

fail() {
  printf '[bootstrap-local-db] ERROR: %s\n' "$1" >&2
  exit 1
}

on_error() {
  fail "Bootstrap failed at line ${1}"
}

trap 'on_error ${LINENO}' ERR

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command not found: $1"
  fi
}

escape_sql_literal() {
  printf '%s' "$1" | sed "s/'/''/g"
}

discover_brew_postgres_formula() {
  local formula=""
  local candidate=""
  local prefix=""
  local formula_list=""

  # Prefer explicit project target, then generic formula.
  for candidate in postgresql@16 postgresql; do
    if brew list --versions "${candidate}" >/dev/null 2>&1; then
      prefix="$(brew --prefix "${candidate}" 2>/dev/null || true)"
      if [[ -n "${prefix}" && -x "${prefix}/bin/postgres" ]]; then
        printf '%s\n' "${candidate}"
        return 0
      fi
    fi
  done

  # Check installed formulas for any postgresql variant with server binary.
  formula_list="$(brew list --formula 2>/dev/null || true)"
  if [[ -n "${formula_list}" ]]; then
    for candidate in postgresql@16 postgresql; do
      if printf '%s\n' "${formula_list}" | awk -v f="${candidate}" '$0 == f { found=1 } END { exit(found ? 0 : 1) }'; then
        prefix="$(brew --prefix "${candidate}" 2>/dev/null || true)"
        if [[ -n "${prefix}" && -x "${prefix}/bin/postgres" ]]; then
          printf '%s\n' "${candidate}"
          return 0
        fi
      fi
    done

    # If only another version (e.g. postgresql@18) is installed, use it.
    formula="$(
      printf '%s\n' "${formula_list}" \
        | awk '/^postgresql(@[0-9]+)?$/ { print; exit }'
    )"
    if [[ -n "${formula}" ]]; then
      prefix="$(brew --prefix "${formula}" 2>/dev/null || true)"
      if [[ -n "${prefix}" && -x "${prefix}/bin/postgres" ]]; then
        printf '%s\n' "${formula}"
        return 0
      fi
    fi
  fi

  # Try prefix-based detection only when server binary exists.
  for candidate in postgresql@16 postgresql; do
    prefix="$(brew --prefix "${candidate}" 2>/dev/null || true)"
    if [[ -n "${prefix}" && -x "${prefix}/bin/postgres" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done

  # Last-resort inference from psql location under Homebrew.
  if command -v psql >/dev/null 2>&1; then
    local psql_path=""
    psql_path="$(command -v psql)"

    if [[ "${psql_path}" == *"/opt/"*"/bin/psql" ]]; then
      formula="${psql_path%/bin/psql}"
      formula="${formula##*/opt/}"
      if [[ "${formula}" =~ ^postgresql(@[0-9]+)?$ ]]; then
        prefix="$(brew --prefix "${formula}" 2>/dev/null || true)"
        if [[ -n "${prefix}" && -x "${prefix}/bin/postgres" ]]; then
          printf '%s\n' "${formula}"
          return 0
        fi
      fi
    fi
  fi

  return 1
}

install_postgres_macos() {
  require_cmd brew

  local formula=""
  formula="$(discover_brew_postgres_formula || true)"

  if [[ -z "${formula}" ]]; then
    formula="postgresql@16"
    if command -v psql >/dev/null 2>&1; then
      log "psql is available, but PostgreSQL server formula was not detected"
    fi
    log "Installing PostgreSQL server via brew (${formula})"
    brew install "${formula}"
  fi

  if [[ -n "${formula}" ]]; then
    log "Starting PostgreSQL service (${formula})"
    brew services start "${formula}"
  else
    log "Unable to detect Homebrew PostgreSQL formula from installed packages"
    log "Trying fallback service start sequence: postgresql@16 -> postgresql"
    if ! brew services start postgresql@16 >/dev/null 2>&1 && ! brew services start postgresql >/dev/null 2>&1; then
      log "Fallback service start failed. If PostgreSQL is managed outside brew, start it manually."
      log "If installed via Homebrew, run one of:"
      log "  brew services start postgresql@16"
      log "  brew services start postgresql"
    fi
  fi
}

install_postgres_linux() {
  require_cmd sudo
  require_cmd apt-get

  if ! command -v psql >/dev/null 2>&1; then
    log "Installing PostgreSQL via apt-get"
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
  else
    log "psql already available; skipping apt-get install"
  fi

  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start postgresql || true
  else
    sudo service postgresql start || true
  fi
}

wait_for_postgres() {
  require_cmd pg_isready

  local attempts=30
  local attempt=1

  while (( attempt <= attempts )); do
    if pg_isready -h "${DB_HOST}" -p "${DB_PORT}" >/dev/null 2>&1; then
      log "PostgreSQL is accepting connections"
      return 0
    fi

    sleep 1
    ((attempt++))
  done

  fail "PostgreSQL did not become ready on ${DB_HOST}:${DB_PORT}"
}

admin_psql() {
  local sql="$1"
  if [[ "$(uname -s)" == "Linux" ]]; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres -c "${sql}"
  else
    PGPASSWORD="${DB_ADMIN_PASSWORD:-}" psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_ADMIN_USER}" -d postgres -c "${sql}"
  fi
}

ensure_role_and_db() {
  local escaped_password
  escaped_password="$(escape_sql_literal "${DB_PASSWORD}")"

  log "Ensuring role ${DB_USER} exists"
  admin_psql "DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE \"${DB_USER}\" LOGIN PASSWORD '${escaped_password}';
  ELSE
    ALTER ROLE \"${DB_USER}\" WITH LOGIN PASSWORD '${escaped_password}';
  END IF;
END
\$\$;"

  local db_exists="0"
  if [[ "$(uname -s)" == "Linux" ]]; then
    db_exists="$(sudo -u postgres psql -tA -d postgres -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || true)"
  else
    db_exists="$(PGPASSWORD="${DB_ADMIN_PASSWORD:-}" psql -tA -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_ADMIN_USER}" -d postgres -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || true)"
  fi

  if [[ "${db_exists}" != "1" ]]; then
    log "Creating database ${DB_NAME}"
    admin_psql "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";"
  else
    log "Database ${DB_NAME} already exists"
  fi

  if [[ "$(uname -s)" == "Linux" ]]; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
  else
    PGPASSWORD="${DB_ADMIN_PASSWORD:-}" psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_ADMIN_USER}" -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
  fi
}

run_npm_reset() {
  log "Running npm run db:reset (DROP + migrate + seed via runCuratedMigrations)"
  (
    cd "${BACKEND_DIR}"
    DATABASE_URL="" \
    DB_HOST="${DB_HOST}" \
    DB_PORT="${DB_PORT}" \
    DB_NAME="${DB_NAME}" \
    DB_USER="${DB_USER}" \
    DB_PASSWORD="${DB_PASSWORD}" \
    DB_ADMIN_USER="${DB_ADMIN_USER}" \
    DB_ADMIN_PASSWORD="${DB_ADMIN_PASSWORD:-}" \
    DATASET_DIR="${DATASET_DIR}" \
    BALANCE_DATASET_FILES="${BALANCE_DATASET_FILES}" \
    FIN_RESULTS_DATASET_FILES="${FIN_RESULTS_DATASET_FILES}" \
    BOOTSTRAP_USE_TEMP_BACKEND=true \
    ALLOW_DATA_RESET=true \
    npm run db:reset
  )
}

main() {
  require_cmd npm

  if [[ ! -d "${BACKEND_DIR}" ]]; then
    fail "Backend directory not found: ${BACKEND_DIR}"
  fi

  log "Detected OS: $(uname -s)"
  case "$(uname -s)" in
    Darwin)
      install_postgres_macos
      ;;
    Linux)
      install_postgres_linux
      ;;
    *)
      fail "Unsupported OS: $(uname -s). Supported: macOS and Debian/Ubuntu Linux"
      ;;
  esac

  wait_for_postgres
  ensure_role_and_db
  run_npm_reset

  log "Bootstrap completed successfully"
  log "Connection settings:"
  log "  DB_HOST=${DB_HOST}"
  log "  DB_PORT=${DB_PORT}"
  log "  DB_NAME=${DB_NAME}"
  log "  DB_USER=${DB_USER}"
}

main "$@"
