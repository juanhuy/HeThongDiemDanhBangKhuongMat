#!/usr/bin/env bash
# Entrypoint backend: chờ MySQL sẵn sàng → seed demo nếu DB trống → chạy server.
set -e

MYSQL_PING_ARGS=()
[ -n "${DB_PASSWORD:-}" ] && MYSQL_PING_ARGS=(-p"${DB_PASSWORD}")

echo "==> Đợi MySQL tại ${DB_HOST:-db}:${DB_PORT:-3306} ..."
until mysqladmin ping -h"${DB_HOST:-db}" -P"${DB_PORT:-3306}" -u"${DB_USER:-root}" "${MYSQL_PING_ARGS[@]}" --silent 2>/dev/null; do
  echo "    MySQL chưa sẵn sàng, thử lại sau 2s..."
  sleep 2
done
echo "==> MySQL đã sẵn sàng."

# Seed dữ liệu demo nếu chưa có tài khoản nào
cd /app
python - <<'PY'
import sys
sys.path.insert(0, "/app")
sys.path.insert(0, "/app/backend")
import seed_demo

if seed_demo.needs_seed():
    print("==> DB trống, chạy seed_demo ...")
    seed_demo.main()
else:
    print("==> DB đã có dữ liệu, bỏ qua seed.")
PY

# Seed khuôn mặt demo nếu SV có ảnh nhưng chưa có face vector
python - <<'PY'
import sys
sys.path.insert(0, "/app")
sys.path.insert(0, "/app/backend")
from app.db.session import SessionLocal
from app.models.face_feature import FaceFeature

db = SessionLocal()
try:
    empty = db.query(FaceFeature).first() is None
finally:
    db.close()

if empty:
    import seed_faces
    print("==> Chưa có face vector, chạy seed_faces ...")
    seed_faces.main()
else:
    print("==> Đã có face vector, bỏ qua seed khuôn mặt.")
PY

echo "==> Khởi động Uvicorn (host 0.0.0.0:8000) ..."
cd /app/backend
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
