#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

cleanup() {
  echo ""
  echo "Shutting down servers..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

echo "============================================"
echo "  RAG Console — Data Intelligence Platform"
echo "============================================"
echo ""

# ── Backend ──
echo "[1/2] Starting Python backend (port 9191)..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
  echo "  → Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate

if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "  → Installing dependencies..."
  pip install -r requirements.txt --quiet
fi

export PORT=9191
python3 -m app.main &
BACKEND_PID=$!
echo "  → Backend PID: $BACKEND_PID"

# ── Frontend ──
echo "[2/2] Starting Next.js frontend (port 3001)..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "  → Installing dependencies..."
  npm install --silent
fi

npx next dev -p 3001 -H 0.0.0.0 &
FRONTEND_PID=$!
echo "  → Frontend PID: $FRONTEND_PID"

echo ""
echo "============================================"
echo "  Frontend:  http://localhost:3001"
echo "  Backend:   http://localhost:9191"
echo "  Health:    http://localhost:9191/health"
echo "  Remote:    http://10.10.3.141:3001"
echo "============================================"
echo "  Press Ctrl+C to stop all servers"
echo "============================================"

wait
