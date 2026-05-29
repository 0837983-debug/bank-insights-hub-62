#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
DATASET_DIR="${PROJECT_ROOT}/test-data/uploads"
LOG_DIR="${PROJECT_ROOT}/.tmp"
BACKEND_LOG="${LOG_DIR}/backend-sanitize-seed.log"

SANITIZE_PORT="${SANITIZE_PORT:-3001}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-bankdb_local}"
DB_USER="${DB_USER:-bank_local_user}"
DB_PASSWORD="${DB_PASSWORD:-bank_local_password}"

BALANCE_DATASET_FILES="${BALANCE_DATASET_FILES:-capital_seed_2024-12.csv,capital_2025-01.csv,capital_seed_2025-02.csv}"
FIN_RESULTS_DATASET_FILE="${FIN_RESULTS_DATASET_FILE:-fin_results_2025-01.csv}"

BACKEND_PID=""

TARGET_TABLES=(
  "stg.balance_upload"
  "stg.fin_results_upload"
  "ods.balance"
  "ods.fin_results"
  "ing.uploads"
  "log.upload_errors"
)

log() {
  printf '[sanitize-and-seed-dev-db] %s\n' "$1"
}

fail() {
  printf '[sanitize-and-seed-dev-db] ERROR: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    log "Stopping temporary backend process (${BACKEND_PID})"
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command not found: $1"
  fi
}

run_psql() {
  local sql="$1"
  PGPASSWORD="${DB_PASSWORD}" psql \
    -v ON_ERROR_STOP=1 \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -c "${sql}"
}

assert_runtime_guards() {
  [[ "${ALLOW_DATA_RESET:-}" == "true" ]] || fail "Set ALLOW_DATA_RESET=true to run this script"

  if [[ "${NODE_ENV:-}" == "production" ]]; then
    fail "NODE_ENV=production is forbidden for sanitize/reset operations"
  fi
}

assert_safe_database_target() {
  local host_lc db_lc endpoint db_info
  host_lc="$(printf '%s' "${DB_HOST}" | tr '[:upper:]' '[:lower:]')"
  db_lc="$(printf '%s' "${DB_NAME}" | tr '[:upper:]' '[:lower:]')"
  endpoint="${host_lc}/${db_lc}"

  if [[ "${endpoint}" =~ prod|production|rds\.amazonaws\.com|bankdb\.ctogouqa8w5k\.eu-north-1\.rds\.amazonaws\.com ]]; then
    fail "Refusing to run against suspicious DB target (${DB_HOST}/${DB_NAME})"
  fi

  db_info="$(
    PGPASSWORD="${DB_PASSWORD}" psql -tA \
      -h "${DB_HOST}" \
      -p "${DB_PORT}" \
      -U "${DB_USER}" \
      -d "${DB_NAME}" \
      -c "SELECT current_database() || '|' || coalesce(inet_server_addr()::text, 'local_socket') || '|' || coalesce(current_setting('application_name', true), '');"
  )"

  if [[ -z "${db_info}" ]]; then
    fail "Could not verify database target details"
  fi

  local live_db live_addr live_lc
  IFS='|' read -r live_db live_addr _ <<< "${db_info}"
  live_lc="$(printf '%s|%s' "${live_db}" "${live_addr}" | tr '[:upper:]' '[:lower:]')"

  if [[ "${live_lc}" =~ prod|production|rds\.amazonaws\.com ]]; then
    fail "Live DB inspection looks unsafe (${live_db}/${live_addr})"
  fi
}

print_execution_plan() {
  log "The script will sanitize and reseed only these tables:"
  for table_name in "${TARGET_TABLES[@]}"; do
    printf '  - %s\n' "${table_name}"
  done
}

truncate_sensitive_data() {
  log "Clearing sensitive data from STG/ODS/ING/LOG schemas"
  run_psql "
    TRUNCATE TABLE
      log.upload_errors,
      stg.balance_upload,
      stg.fin_results_upload,
      ods.balance,
      ods.fin_results,
      ing.uploads
    RESTART IDENTITY;
  "
}

wait_for_backend() {
  local attempts=45
  local attempt=1

  while (( attempt <= attempts )); do
    if curl --silent --show-error --fail "http://127.0.0.1:${SANITIZE_PORT}/api-docs" >/dev/null 2>&1; then
      log "Temporary backend is ready on port ${SANITIZE_PORT}"
      return 0
    fi
    sleep 1
    ((attempt++))
  done

  fail "Backend did not become ready on port ${SANITIZE_PORT}. See ${BACKEND_LOG}"
}

start_temporary_backend() {
  mkdir -p "${LOG_DIR}"
  log "Starting temporary backend for test-data upload"
  (
    cd "${BACKEND_DIR}"
    DATABASE_URL="" \
    DB_HOST="${DB_HOST}" \
    DB_PORT="${DB_PORT}" \
    DB_NAME="${DB_NAME}" \
    DB_USER="${DB_USER}" \
    DB_PASSWORD="${DB_PASSWORD}" \
    FRONTEND_URL="http://127.0.0.1:65535" \
    PORT="${SANITIZE_PORT}" \
    npm run dev
  ) >"${BACKEND_LOG}" 2>&1 &

  BACKEND_PID="$!"
  wait_for_backend
}

upload_dataset() {
  local file_path="$1"
  local target_table="$2"

  [[ -f "${file_path}" ]] || fail "Dataset file not found: ${file_path}"

  log "Uploading $(basename "${file_path}") as ${target_table}"
  local response compact_response
  response="$(
    curl --silent --show-error --fail \
      -X POST "http://127.0.0.1:${SANITIZE_PORT}/api/upload" \
      -F "file=@${file_path}" \
      -F "targetTable=${target_table}"
  )"
  compact_response="$(printf '%s' "${response}" | tr -d '[:space:]')"

  if [[ "${compact_response}" != *"\"status\":\"completed\""* ]]; then
    fail "Upload for ${target_table} did not complete successfully. Response: ${response}"
  fi
}

upload_balance_datasets() {
  local raw_list="${BALANCE_DATASET_FILES}"
  local dataset_file
  local uploaded_count=0

  IFS=',' read -r -a balance_files <<< "${raw_list}"

  for dataset_file in "${balance_files[@]}"; do
    # Keep comma-separated env input robust against accidental spaces.
    dataset_file="${dataset_file#"${dataset_file%%[![:space:]]*}"}"
    dataset_file="${dataset_file%"${dataset_file##*[![:space:]]}"}"
    if [[ -z "${dataset_file}" ]]; then
      continue
    fi
    upload_dataset "${DATASET_DIR}/${dataset_file}" "balance"
    ((uploaded_count++))
  done

  if (( uploaded_count < 3 )); then
    fail "At least 3 BALANCE_DATASET_FILES are required to build strict p1/p2/p3 flow (uploaded: ${uploaded_count})"
  fi
}

verify_header_dates_contract() {
  local check_result
  check_result="$(
    PGPASSWORD="${DB_PASSWORD}" psql -tA \
      -h "${DB_HOST}" \
      -p "${DB_PORT}" \
      -U "${DB_USER}" \
      -d "${DB_NAME}" \
      -c "
        WITH flags AS (
          SELECT
            MAX(CASE WHEN is_p1 THEN period_date END) AS p1_date,
            MAX(CASE WHEN is_p2 THEN period_date END) AS p2_date,
            MAX(CASE WHEN is_p3 THEN period_date END) AS p3_date
          FROM mart.v_p_dates
        )
        SELECT p1_date || '|' || p2_date || '|' || p3_date
        FROM flags
        WHERE p1_date IS NOT NULL
          AND p2_date IS NOT NULL
          AND p3_date IS NOT NULL
          AND p1_date <> p2_date
          AND p1_date <> p3_date
          AND p2_date <> p3_date;
      "
  )"

  if [[ -z "${check_result}" ]]; then
    fail "Strict header_dates contract is not satisfied (p1/p2/p3 must exist on different dates)"
  fi

  log "Verified strict header_dates contract: ${check_result}"
}

refresh_mart_materialized_views() {
  log "Refreshing MART materialized views"
  run_psql "
    REFRESH MATERIALIZED VIEW mart.balance;
    REFRESH MATERIALIZED VIEW mart.fin_results;
    REFRESH MATERIALIZED VIEW mart.mv_kpi_balance;
    REFRESH MATERIALIZED VIEW mart.mv_kpi_fin_results;
    REFRESH MATERIALIZED VIEW mart.mv_kpi_derived;
  "
}

main() {
  require_cmd curl
  require_cmd npm
  require_cmd psql

  [[ -d "${BACKEND_DIR}" ]] || fail "Backend directory not found: ${BACKEND_DIR}"

  assert_runtime_guards
  assert_safe_database_target
  print_execution_plan
  truncate_sensitive_data
  start_temporary_backend

  upload_balance_datasets
  upload_dataset "${DATASET_DIR}/${FIN_RESULTS_DATASET_FILE}" "fin_results"

  refresh_mart_materialized_views
  verify_header_dates_contract

  log "Sanitize + seed completed successfully"
  log "Data source: test-data/uploads only"
  log "DB target: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
}

main "$@"
