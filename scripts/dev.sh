#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-3000}

# Limpia lock de Next
rm -f .next/dev/lock

# Mata procesos en el puerto
for i in {1..5}; do
  PIDS=$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    echo "🛑 Cerrando $PORT: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
    sleep 0.5
  else
    break
  fi
done

# Verifica que quedó libre
if lsof -tiTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠ Port $PORT still busy"
  lsof -iTCP:$PORT -sTCP:LISTEN || true
  exit 1
fi

# Arranca Next
exec env PORT=$PORT next dev --hostname 0.0.0.0
