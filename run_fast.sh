#!/usr/bin/env bash
# ============================================================
# Khởi động nhanh hệ thống (backend + frontend) cho dev.
# Cách dùng:
#   ./run_fast.sh            # backend 0.0.0.0:8000 + web :5173 (chạy máy tính)
#   ./run_fast.sh --all      # đầy đủ: backend + web + build APK Android
#   ./run_fast.sh --all 192.168.1.11   # --all nhưng chỉ IP cụ thể
#   ./run_fast.sh --apk      # backend + build APK (không mở web)
#   ./run_fast.sh --apk 192.168.1.11   # build APK với IP cụ thể
#   ./run_fast.sh --no-web   # chỉ backend
#   ./run_fast.sh --stop     # tắt mọi tiến trình đã khởi động
# ============================================================
set -uo pipefail
cd "$(dirname "$0")"

ROOT="$(pwd)"
PY="$ROOT/.venv/bin/python"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
PID_FILE="$ROOT/.run_fast.pids"
PORT=8000
API_BASE=""

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

log() { echo -e "\033[1;32m[RUN]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }

ensure_firewall() {
  if command -v ufw >/dev/null 2>&1; then
    sudo ufw status >/dev/null 2>&1 && sudo ufw allow "$PORT/tcp" >/dev/null 2>&1 \
      && log "Firewall: đã mở port $PORT/tcp"
  fi
}

start_backend() {
  if [ ! -x "$PY" ]; then
    warn "Không tìm thấy $PY — đang chạy 'uv sync'..."
    (cd "$BACKEND_DIR" && uv sync) || exit 1
  fi
  log "Khởi động backend: http://0.0.0.0:$PORT  (Swagger: /docs)"
  (cd "$BACKEND_DIR" && exec "$PY" -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT") &
  echo "$!" >> "$PID_FILE"
  sleep 2
  ensure_firewall
}

start_web() {
  log "Khởi động frontend: http://localhost:5173"
  (cd "$FRONTEND_DIR" && exec npm run dev) &
  echo "$!" >> "$PID_FILE"
}

build_apk() {
  local ip="${1:-$LAN_IP}"
  if [ -z "$ip" ]; then warn "Không dò được IP, truyền tay: $0 --apk 192.168.x.x"; return; fi
  API_BASE="http://$ip:$PORT"
  log "Build APK Android với VITE_API_BASE=$API_BASE"
  (cd "$FRONTEND_DIR" && VITE_API_BASE="$API_BASE" npm run build && npx cap sync android) || exit 1
  log "Đã sync xong. Mở Android Studio thư mục $FRONTEND_DIR/android và Run/Generate APK."
}

stop_all() {
  if [ -f "$PID_FILE" ]; then
    while read -r pid; do
      kill "$pid" 2>/dev/null
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    log "Đã tắt mọi tiến trình."
  else
    warn "Không có tiến trình nào đang theo dõi."
  fi
}

mkdir -p "$(dirname "$PID_FILE")"
MODE="web"
IP_ARG=""
for arg in "$@"; do
  case "$arg" in
    --no-web) MODE="no_web" ;;
    --apk)    MODE="apk" ;;
    --all)    MODE="apk_web" ;;
    --stop)   stop_all; exit 0 ;;
    --*)      warn "Bỏ qua tham số không rõ: $arg" ;;
    *)        IP_ARG="$arg" ;;
  esac
done

case "$MODE" in
  apk_web)
    start_backend
    start_web
    build_apk "${IP_ARG:-$LAN_IP}"
    log "Xong. Backend: http://$LAN_IP:$PORT/docs | Web: http://localhost:5173"
    log "Mở Android Studio thư mục frontend/android và chạy app cho điện thoại."
    ;;
  apk)
    start_backend
    build_apk "${IP_ARG:-$LAN_IP}"
    log "Backend đang chạy. Mở Android Studio thư mục frontend/android."
    ;;
  no_web)
    start_backend
    log "Xong. Backend tại http://$LAN_IP:$PORT/docs"
    ;;
  *)
    start_backend
    start_web
    log "Xong. Backend: http://$LAN_IP:$PORT/docs | Web: http://localhost:5173"
    log "Điện thoại cùng mạng truy cập backend: http://$LAN_IP:$PORT"
    ;;
esac

log "Tắt nhanh: ./run_fast.sh --stop"
