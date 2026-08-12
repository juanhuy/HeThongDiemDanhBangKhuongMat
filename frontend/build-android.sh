#!/usr/bin/env bash
# ============================================================
# Build Android (Capacitor) — tách biệt với native dev / docker.
#
# Cách dùng:
#   ./build-android.sh                # dùng IP máy LAN tự dò được
#   ./build-android.sh 192.168.0.186  # truyền IP máy chạy backend
#
# Lưu ý: backend phải bind 0.0.0.0 (config.yaml đã sẵn 0.0.0.0)
# để điện thoại trong cùng mạng truy cập được.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")"

IP="${1:-}"
if [ -z "$IP" ]; then
  IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi
if [ -z "$IP" ]; then
  echo "ERROR: Không tự dò được IP. Truyền IP thủ công: $0 192.168.x.x" >&2
  exit 1
fi

BASE="http://${IP}:8000"
echo "==> Build frontend cho Android: VITE_API_BASE=${BASE}"
VITE_API_BASE="${BASE}" npm run build

echo "==> Sync sang Capacitor (android/)"
npx cap sync android

echo "==> Done. Mở Android Studio và chạy app."
