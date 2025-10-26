#!/usr/bin/env bash
set -euo pipefail

echo "Starting autorepost API..."
node apps/api/dist/apps/api/src/main.js &
API_PID=$!

echo "Starting autorepost worker..."
node apps/worker/dist/apps/worker/src/main.js &
WORKER_PID=$!

trap 'echo "Stopping services..."; kill $API_PID $WORKER_PID' INT TERM

wait $API_PID
wait $WORKER_PID
