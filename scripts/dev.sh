#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-3000}

# Limpia lock de Next
rm -f .next/dev/lock

# Mata procesos en el puerto (lsof)
for i in {1..5}; do
  PIDS=$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    echo "🛑 Cerrando $PORT via lsof: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
    sleep 0.4
  else
    break
  fi
done

# Fallback: fuser (si está disponible)
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
fi

# Fallback: usa ss para capturar PIDs si quedaran
for i in {1..3}; do
  PIDS=$(
    ss -ltnp 2>/dev/null \
      | grep -F ":$PORT" \
      | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
      | sort -u \
      | tr '\n' ' '
  )
  if [[ -n "$PIDS" ]]; then
    echo "🛑 Cerrando $PORT via ss: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
    sleep 0.4
  else
    break
  fi
done

# Verifica que quedó libre
if lsof -tiTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠ Port $PORT still busy (lsof)"
  lsof -iTCP:$PORT -sTCP:LISTEN || true
  exit 1
fi
if ss -ltnp 2>/dev/null | grep -q ":$PORT"; then
  echo "⚠ Port $PORT still busy (ss)"
  ss -ltnp | grep ":$PORT" || true
  exit 1
fi

# Arranca Next
exec env PORT=$PORT next dev --hostname 0.0.0.0
