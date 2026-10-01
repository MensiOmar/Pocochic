#!/usr/bin/env bash
# Start the local POCOCHIC shop + admin (APIs and Vite). Ctrl+C stops what this script started.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/../node_modules/vite-node/vite-node.mjs" ]]; then
  NM="$ROOT/../node_modules"
elif [[ -f "$ROOT/node_modules/vite-node/vite-node.mjs" ]]; then
  NM="$ROOT/node_modules"
else
  echo "Missing node_modules. From the repo root run: npm install" >&2
  exit 1
fi

VITE_NODE="$NM/vite-node/vite-node.mjs"
VITE="$NM/vite/bin/vite.js"
LOG_DIR="${TMPDIR:-/tmp}/pocochic-dev"
mkdir -p "$LOG_DIR"

if [[ ! -f "$ROOT/data/pocochic.db" ]]; then
  echo "No database at data/pocochic.db. Import first:" >&2
  echo "  npx vite-node backend/db/scripts/import-v1.ts" >&2
  exit 1
fi

load_env() {
  local file="$ROOT/.env"
  [[ -f "$file" ]] || return 0
  local line key
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "$line" || "$line" != *=* ]] && continue
    key="${line%%=*}"
    if [[ -z "${!key+x}" ]]; then
      export "$key=${line#*=}"
    fi
  done < "$file"
}
load_env

export SHOP_API_PORT="${SHOP_API_PORT:-8787}"
export ADMIN_API_PORT="${ADMIN_API_PORT:-8788}"
export SHOP_WEB_ORIGIN="${SHOP_WEB_ORIGIN:-http://localhost:5173}"
export ADMIN_WEB_ORIGIN="${ADMIN_WEB_ORIGIN:-http://localhost:5174}"

ADMIN_SESSION_SECRET="${ADMIN_SESSION_SECRET:-}"
if [[ ${#ADMIN_SESSION_SECRET} -lt 16 ]]; then
  echo "Warning: ADMIN_SESSION_SECRET is missing or shorter than 16 characters. Admin login will be rejected until you set a long random value in pocochic/.env" >&2
fi

pids=()
cleanup() {
  local pid
  for pid in "${pids[@]+"${pids[@]}"}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

port_open() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 1 "$1" || true)"
  [[ "$code" == "200" ]]
}

wait_for() {
  local url="$1" name="$2" i
  for i in $(seq 1 40); do
    if port_open "$url"; then
      return 0
    fi
    sleep 0.25
  done
  echo "$name did not become ready: $url" >&2
  echo "Log: $LOG_DIR/$name.log" >&2
  tail -30 "$LOG_DIR/$name.log" >&2 || true
  exit 1
}

start() {
  local name="$1" url="$2" dir="$3"
  shift 3
  if port_open "$url"; then
    echo "$name already up ($url)"
    return 0
  fi
  echo "starting $name"
  ( cd "$dir" && "$@" ) >"$LOG_DIR/$name.log" 2>&1 &
  pids+=("$!")
  wait_for "$url" "$name"
}

start shop-api "http://127.0.0.1:${SHOP_API_PORT}/health" "$ROOT" \
  node "$VITE_NODE" "$ROOT/backend/shop-api/src/node.ts"
start admin-api "http://127.0.0.1:${ADMIN_API_PORT}/health" "$ROOT" \
  node "$VITE_NODE" "$ROOT/backend/admin-api/src/node.ts"
start shop-web "http://127.0.0.1:5173/" "$ROOT/frontend/shop-web" \
  node "$VITE" --host 127.0.0.1 --port 5173 --strictPort
start admin-web "http://127.0.0.1:5174/" "$ROOT/frontend/admin-web" \
  node "$VITE" --host 127.0.0.1 --port 5174 --strictPort

styles="$(curl -sf --max-time 8 "http://127.0.0.1:${SHOP_API_PORT}/styles" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s); if(!Array.isArray(j)||!j.length) process.exit(1); console.log(j.length)})")"

echo
echo "POCOCHIC is up"
echo "  Shop   ${SHOP_WEB_ORIGIN}"
echo "  Admin  ${ADMIN_WEB_ORIGIN}"
echo "  Styles ${styles}"
echo "  Logs   $LOG_DIR"
echo "Ctrl+C stops the processes this script started."

if [[ ${#pids[@]} -eq 0 ]]; then
  exit 0
fi
wait
