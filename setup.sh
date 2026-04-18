#!/bin/bash
set -e

echo "================================"
echo "EYeOn Setup"
echo "================================"

if ! command -v node >/dev/null; then
  echo "Node.js not installed. Install from https://nodejs.org"
  exit 1
fi
echo "Node: $(node -v)"

if ! command -v python3 >/dev/null; then
  echo "Python 3 not installed. Install from https://python.org"
  exit 1
fi
echo "Python: $(python3 --version)"

echo ""
echo "[1/3] Backend (Node)"
pushd backend >/dev/null
npm install
popd >/dev/null

echo ""
echo "[2/3] Surveillance (Python / FastAPI)"
pushd surveillance >/dev/null
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r requirements.txt
deactivate
popd >/dev/null

echo ""
echo "[3/3] Frontend (React / Vite)"
pushd frontend >/dev/null
npm install
popd >/dev/null

echo ""
echo "================================"
echo "Setup complete"
echo "================================"
echo ""
echo "Run in three terminals:"
echo "  1) cd backend && npm run dev               # port 5001"
echo "  2) cd surveillance && source .venv/bin/activate && python main.py   # port 8000"
echo "  3) cd frontend && npm run dev              # port 5173"
