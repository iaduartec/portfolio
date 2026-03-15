#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/srv/apps/portfolio}"
BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
SERVICE_NAME="${SERVICE_NAME:-portfolio}"
PORT="${PORT:-3001}"
ENV_FILE="${ENV_FILE:-/etc/default/portfolio.env}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/home/ubuntu/.nvm/versions/node/v24.10.0/bin}"
PUBLIC_HEALTHCHECK_URL="${PUBLIC_HEALTHCHECK_URL:-https://kiri-vnic.tail4b3cf6.ts.net/portfolio}"
SKIP_GIT_SYNC="${SKIP_GIT_SYNC:-0}"

load_running_service_env() {
  local main_pid=""

  if ! command -v systemctl >/dev/null 2>&1; then
    return 1
  fi

  main_pid="$(systemctl show -p MainPID --value "${SERVICE_NAME}" 2>/dev/null || true)"
  if [[ -z "${main_pid}" || "${main_pid}" == "0" || ! -r "/proc/${main_pid}/environ" ]]; then
    return 1
  fi

  while IFS= read -r line; do
    [[ "${line}" == *=* ]] || continue
    export "${line}"
  done < <(tr '\0' '\n' < "/proc/${main_pid}/environ")

  return 0
}

if [[ -r "${ENV_FILE}" ]]; then
  # Load the same runtime env file used by the systemd service, including PORT if set.
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
elif [[ -f "${ENV_FILE}" ]]; then
  echo "[deploy] env file exists but is not readable: ${ENV_FILE}"
  if load_running_service_env; then
    echo "[deploy] loaded runtime environment from the active ${SERVICE_NAME} process"
  else
    echo "[deploy] continuing without sourcing ${ENV_FILE}; no active service environment available"
  fi
fi

export PATH="${NODE_BIN_DIR}:/home/ubuntu/.local/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"
export NEXT_TELEMETRY_DISABLED=1

cd "${REPO_DIR}"

echo "[deploy] working directory: ${REPO_DIR}"
if [[ "${SKIP_GIT_SYNC}" != "1" ]]; then
  echo "[deploy] fetching ${REMOTE}/${BRANCH}"
  git fetch --prune --no-tags "${REMOTE}"
  git reset --hard "${REMOTE}/${BRANCH}"
fi

echo "[deploy] ensuring pnpm version from packageManager"
corepack enable
corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

echo "[deploy] installing dependencies"
pnpm install --frozen-lockfile

echo "[deploy] running checks"
pnpm check

echo "[deploy] building application"
pnpm build

echo "[deploy] restarting ${SERVICE_NAME}"
sudo -n systemctl restart "${SERVICE_NAME}"

echo "[deploy] waiting for service"
for _ in {1..12}; do
  if sudo -n systemctl is-active --quiet "${SERVICE_NAME}"; then
    break
  fi
  sleep 2
done
sudo -n systemctl is-active --quiet "${SERVICE_NAME}"

echo "[deploy] checking local health endpoint"
curl --retry 5 --retry-delay 2 --retry-connrefused --fail --silent --show-error \
  "http://127.0.0.1:${PORT}/portfolio" >/dev/null

echo "[deploy] checking public health endpoint"
curl --retry 5 --retry-delay 2 --retry-connrefused --fail --silent --show-error \
  "${PUBLIC_HEALTHCHECK_URL}" >/dev/null

echo "[deploy] deploy completed successfully"
