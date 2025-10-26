#!/usr/bin/env bash
set -euo pipefail

echo "Starting autorepost API..."
node apps/api/dist/src/main.js &
API_PID=$!

echo "Starting autorepost worker..."
node apps/worker/dist/src/main.js &
WORKER_PID=$!

trap 'echo "Stopping services..."; kill $API_PID $WORKER_PID' INT TERM

wait $API_PID
wait $WORKER_PID
