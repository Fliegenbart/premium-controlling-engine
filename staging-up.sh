#!/bin/bash
set -e

# Premium Controlling Engine staging bring-up helper (intended to run alongside prod)

cd "$(dirname "$0")"

echo "=== Controlling Engine Staging Up ==="

# Used by compose port interpolation
export APP_BIND_ADDRESS=${APP_BIND_ADDRESS:-127.0.0.1}
export APP_PORT=${APP_PORT:-3001}
export OLLAMA_BIND_ADDRESS=${OLLAMA_BIND_ADDRESS:-127.0.0.1}
export OLLAMA_PORT=${OLLAMA_PORT:-11435}

COMPOSE_FILES=(
  -f docker-compose.yml
  -f docker-compose.staging.yml
)

docker compose "${COMPOSE_FILES[@]}" up -d --build

echo "Health check..."
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:3001/api/health}
max_attempts=30
attempt=1
while true; do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    echo "Health check OK: $HEALTH_URL"
    break
  fi
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Health check failed after ${max_attempts} attempts: $HEALTH_URL"
    exit 1
  fi
  echo "Health check failed (${attempt}/${max_attempts}), retrying..."
  attempt=$((attempt + 1))
  sleep 3
done

echo ""
echo "Staging is up."
echo "If the port is bound to localhost, use an SSH tunnel:"
echo "  ssh -L 3001:127.0.0.1:3001 root@<server-ip>"

