#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
DATASET_DIR="${PROJECT_ROOT}/test-data/uploads"
LOG_DIR="${PROJECT_ROOT}/.tmp"
BACKEND_BOOTSTRAP_LOG="${LOG_DIR}/backend-bootstrap.log"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-bankdb_local}"
DB_USER="${DB_USER:-bank_local_user}"
DB_PASSWORD="${DB_PASSWORD:-bank_local_password}"
DB_ADMIN_USER="${DB_ADMIN_USER:-${USER:-postgres}}"
BOOTSTRAP_PORT="${BOOTSTRAP_PORT:-3001}"

BALANCE_DATASET_FILE="${BALANCE_DATASET_FILE:-capital_2025-01.csv}"
FIN_RESULTS_DATASET_FILE="${FIN_RESULTS_DATASET_FILE:-fin_results_2025-01.csv}"

BACKEND_PID=""

log() {
  printf '[bootstrap-local-db] %s\n' "$1"
}

fail() {
  printf '[bootstrap-local-db] ERROR: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    log "Stopping temporary backend process (${BACKEND_PID})"
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}

on_error() {
  cleanup
  fail "Bootstrap failed at line ${1}"
}

trap 'on_error ${LINENO}' ERR
trap cleanup EXIT

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

run_migrations() {
  log "Running curated migration strategy for local bootstrap"
  (
    cd "${BACKEND_DIR}"

    local migration_dir="${BACKEND_DIR}/src/migrations"
    local migration_file=""
    local curated_migrations=(
      "001_create_schemas.sql"
      "005_create_formats_table.sql"
      "006_load_formats_data.sql"
      "007_create_config_schema.sql"
      "008_create_config_history_table.sql"
      "009_migrate_layout_data.sql"
      "012_insert_component_fields_for_cards.sql"
      "013_add_component_fields_metadata.sql"
      "018_create_upload_tables.sql"
      "019_create_component_queries.sql"
      "020_remove_component_id_from_queries.sql"
      "021_add_header_component.sql"
      "022_add_button_components.sql"
      "023_create_layout_views.sql"
      "024_add_layout_query_config.sql"
      "026_create_fin_results_tables.sql"
      "027_create_fin_results_ods_mart.sql"
      "028_add_fin_results_to_dashboard.sql"
      "028_fix_fin_results_unique_index.sql"
      "030_add_field_type.sql"
      "031_migrate_field_types.sql"
      "032_add_calculated_fields.sql"
      "033_update_layout_view_field_type.sql"
      "034_fix_field_types.sql"
      "035_remove_deprecated_columns.sql"
      "036_add_display_group.sql"
      "037_set_display_groups.sql"
      "038_update_layout_view_display_group.sql"
      "040_create_field_mappings.sql"
      "041_mart_tables_to_mv.sql"
      "042_add_technical_name.sql"
      "043_update_mart_mv_three_names.sql"
      "044_mv_kpi_fin_results_add_chod.sql"
      "045_mv_kpi_fin_results_add_aggregates.sql"
      "046_mv_kpi_balance_use_tech_name.sql"
      "047_create_kpi_derived_mv.sql"
      "048_create_kpi_all_mv.sql"
      "049_fix_kpi_derived.sql"
      "050_add_kpi_card_function.sql"
      "051_create_kpi_cards.sql"
      "052_update_v_kpi_all_and_query.sql"
      "053_add_query_id_to_components.sql"
      "054_set_kpi_data_source_key.sql"
      "055_add_layout_id_to_v_kpi_all.sql"
      "056_create_v_p_dates.sql"
      "057_update_header_dates_query.sql"
      "058_dedup_v_kpi_all.sql"
    )

    for migration_file in "${curated_migrations[@]}"; do
      if [[ ! -f "${migration_dir}/${migration_file}" ]]; then
        fail "Missing required curated migration: ${migration_file}"
      fi
    done

    log "Resetting managed schemas for deterministic bootstrap"
    PGPASSWORD="${DB_PASSWORD}" psql -v ON_ERROR_STOP=1 \
      -h "${DB_HOST}" \
      -p "${DB_PORT}" \
      -U "${DB_USER}" \
      -d "${DB_NAME}" \
      -c "DROP SCHEMA IF EXISTS sec CASCADE; DROP SCHEMA IF EXISTS config CASCADE; DROP SCHEMA IF EXISTS dict CASCADE; DROP SCHEMA IF EXISTS stg CASCADE; DROP SCHEMA IF EXISTS ods CASCADE; DROP SCHEMA IF EXISTS mart CASCADE; DROP SCHEMA IF EXISTS ing CASCADE; DROP SCHEMA IF EXISTS log CASCADE;"

    for migration_file in "${curated_migrations[@]}"; do
      if [[ "${migration_file}" == "021_add_header_component.sql" ]]; then
        log "Applying compatibility fix for layout_component_mapping schema"
        PGPASSWORD="${DB_PASSWORD}" psql -v ON_ERROR_STOP=1 \
          -h "${DB_HOST}" \
          -p "${DB_PORT}" \
          -U "${DB_USER}" \
          -d "${DB_NAME}" <<'SQL'
ALTER TABLE config.layout_component_mapping
  ADD COLUMN IF NOT EXISTS parent_component_id VARCHAR(200);
ALTER TABLE config.layout_component_mapping
  ALTER COLUMN instance_id DROP NOT NULL;
SQL
      fi

      if [[ "${migration_file}" == "028_add_fin_results_to_dashboard.sql" ]]; then
        log "Seeding default main_dashboard layout for fin_results migration"
        PGPASSWORD="${DB_PASSWORD}" psql -v ON_ERROR_STOP=1 \
          -h "${DB_HOST}" \
          -p "${DB_PORT}" \
          -U "${DB_USER}" \
          -d "${DB_NAME}" \
          -c "INSERT INTO config.layouts (id, name, description, status, is_active, is_default, created_by, created_at) VALUES ('main_dashboard', 'Main Dashboard', 'Bootstrap default layout', 'published', TRUE, TRUE, 'bootstrap', CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;"
      fi

      if [[ "${migration_file}" == "051_create_kpi_cards.sql" ]]; then
        log "Applying compatibility fix for component_fields constraints"
        PGPASSWORD="${DB_PASSWORD}" psql -v ON_ERROR_STOP=1 \
          -h "${DB_HOST}" \
          -p "${DB_PORT}" \
          -U "${DB_USER}" \
          -d "${DB_NAME}" \
          -c "ALTER TABLE config.component_fields ALTER COLUMN data_type DROP NOT NULL;"
        PGPASSWORD="${DB_PASSWORD}" psql -v ON_ERROR_STOP=1 \
          -h "${DB_HOST}" \
          -p "${DB_PORT}" \
          -U "${DB_USER}" \
          -d "${DB_NAME}" <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_lcm_layout_component'
  ) THEN
    ALTER TABLE config.layout_component_mapping
      ADD CONSTRAINT uq_lcm_layout_component UNIQUE (layout_id, component_id);
  END IF;
END
$$;
SQL
        PGPASSWORD="${DB_PASSWORD}" psql -v ON_ERROR_STOP=1 \
          -h "${DB_HOST}" \
          -p "${DB_PORT}" \
          -U "${DB_USER}" \
          -d "${DB_NAME}" \
          -c "SELECT setval(pg_get_serial_sequence('config.layout_component_mapping', 'id'), COALESCE((SELECT MAX(id) FROM config.layout_component_mapping), 0) + 1, false);"
      fi

      log "Applying migration: ${migration_file}"
      PGPASSWORD="${DB_PASSWORD}" psql -v ON_ERROR_STOP=1 \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -f "${migration_dir}/${migration_file}"
    done

    log "Applying local schema overrides for upload datasets"
    PGPASSWORD="${DB_PASSWORD}" psql -v ON_ERROR_STOP=1 \
      -h "${DB_HOST}" \
      -p "${DB_PORT}" \
      -U "${DB_USER}" \
      -d "${DB_NAME}" \
      -c "ALTER TABLE stg.fin_results_upload ALTER COLUMN data_source TYPE VARCHAR(255); ALTER TABLE ods.fin_results ALTER COLUMN data_source TYPE VARCHAR(255);"
  )
}

wait_for_backend() {
  local attempts=45
  local attempt=1

  while (( attempt <= attempts )); do
    if curl --silent --show-error --fail "http://127.0.0.1:${BOOTSTRAP_PORT}/api-docs" >/dev/null 2>&1; then
      log "Temporary backend is ready on port ${BOOTSTRAP_PORT}"
      return 0
    fi

    sleep 1
    ((attempt++))
  done

  fail "Backend did not become ready on port ${BOOTSTRAP_PORT}. See ${BACKEND_BOOTSTRAP_LOG}"
}

start_temporary_backend() {
  mkdir -p "${LOG_DIR}"
  log "Starting temporary backend for upload pipeline"
  (
    cd "${BACKEND_DIR}"
    # Force local bootstrap connection params even if .env has cloud DATABASE_URL.
    DATABASE_URL="" \
    DB_HOST="${DB_HOST}" \
    DB_PORT="${DB_PORT}" \
    DB_NAME="${DB_NAME}" \
    DB_USER="${DB_USER}" \
    DB_PASSWORD="${DB_PASSWORD}" \
    FRONTEND_URL="http://127.0.0.1:65535" \
    PORT="${BOOTSTRAP_PORT}" \
    npm run dev
  ) >"${BACKEND_BOOTSTRAP_LOG}" 2>&1 &
  BACKEND_PID="$!"

  wait_for_backend
}

upload_dataset() {
  local file_path="$1"
  local target_table="$2"

  [[ -f "${file_path}" ]] || fail "Dataset file not found: ${file_path}"

  log "Uploading $(basename "${file_path}") as ${target_table}"
  local response
  response="$(
    curl --silent --show-error --fail \
      -X POST "http://127.0.0.1:${BOOTSTRAP_PORT}/api/upload" \
      -F "file=@${file_path}" \
      -F "targetTable=${target_table}"
  )"

  local compact_response
  compact_response="$(printf '%s' "${response}" | tr -d '[:space:]')"
  if [[ "${compact_response}" != *"\"status\":\"completed\""* ]]; then
    fail "Upload for ${target_table} did not complete successfully. Response: ${response}"
  fi

  log "Upload completed for ${target_table}"
}

main() {
  require_cmd curl
  require_cmd npm
  require_cmd sed

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
  run_migrations
  start_temporary_backend
  upload_dataset "${DATASET_DIR}/${BALANCE_DATASET_FILE}" "balance"
  upload_dataset "${DATASET_DIR}/${FIN_RESULTS_DATASET_FILE}" "fin_results"

  log "Bootstrap completed successfully"
  log "Connection settings:"
  log "  DB_HOST=${DB_HOST}"
  log "  DB_PORT=${DB_PORT}"
  log "  DB_NAME=${DB_NAME}"
  log "  DB_USER=${DB_USER}"
}

main "$@"
