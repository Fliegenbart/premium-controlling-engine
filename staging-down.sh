#!/bin/bash
set -e

# Premium Controlling Engine staging teardown helper

cd "$(dirname "$0")"

echo "=== Controlling Engine Staging Down ==="

# Must match staging-up (used by compose port interpolation)
export APP_BIND_ADDRESS=${APP_BIND_ADDRESS:-127.0.0.1}
export APP_PORT=${APP_PORT:-3001}
export OLLAMA_BIND_ADDRESS=${OLLAMA_BIND_ADDRESS:-127.0.0.1}
export OLLAMA_PORT=${OLLAMA_PORT:-11435}

docker compose -f docker-compose.yml -f docker-compose.staging.yml down

