#!/usr/bin/env bash
set -euo pipefail

echo "Starting autorepost API..."
node apps/api/dist/main.js &
API_PID=$!

echo "Starting autorepost worker..."
node apps/worker/dist/main.js &
WORKER_PID=$!

trap 'echo "Stopping services..."; kill $API_PID $WORKER_PID' INT TERM

wait $API_PID
wait $WORKER_PID
