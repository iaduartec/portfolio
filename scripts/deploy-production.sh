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

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

if ! sudo -n true 2>/dev/null; then
  echo "[deploy] passwordless sudo is required for service restart checks"
  exit 1
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
