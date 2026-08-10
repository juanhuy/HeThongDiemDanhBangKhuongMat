import os
import sys
import json
from sqlalchemy.orm import Session

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
if project_root not in sys.path:
    sys.path.append(project_root)

from config.settings import settings
from app.models.system_setting import SystemSetting

DEMO_KEY = "demo_controls"
_DEFAULT = {
    "demo_mode": False,
    "bypass_registration_window": False,
    "bypass_semester": False,
    "bypass_capacity": False,
    "bypass_prerequisites": False,
    "bypass_credit_limit": False,
    "bypass_eligibility": False,
    "bypass_duplicate_subject": False,
    # --- Các quy tắc linh hoạt, có thể bật/tắt để test bằng tay ---
    "allow_unenroll_after_attendance": False,  # cho phép hủy đăng ký dù đã điểm danh
    "allow_after_hours_leave": False,          # cho phép nộp đơn nghỉ sau giờ học
    "allow_override_present_leave": False,     # cho phép duyệt đơn ghi đè buổi đã có mặt
}



def _config_defaults() -> dict:
    cfg = settings.demo or {}
    return {
        key: bool(cfg.get(key, default))
        for key, default in _DEFAULT.items()
    }


def get_demo_controls(db: Session) -> dict:
    """Lấy cấu hình demo: ưu tiên bản ghi hệ thống (DB) nếu có, ngược lại dùng config.yaml."""
    merged = _config_defaults()
    row = db.query(SystemSetting).filter(SystemSetting.setting_key == DEMO_KEY).first()
    if row and row.setting_value:
        try:
            stored = json.loads(row.setting_value)
            if isinstance(stored, dict):
                for key in _DEFAULT:
                    if key in stored:
                        merged[key] = bool(stored[key])
        except Exception:
            pass
    for key, default in _DEFAULT.items():
        merged.setdefault(key, default)
    return merged


def update_demo_controls(db: Session, payload: dict) -> dict:
    """Lưu lại công tắc demo tùy chỉnh. Trả về cấu hình mới sau khi hợp nhất."""
    data = {}
    for key in _DEFAULT:
        if key in payload:
            data[key] = bool(payload[key])

    row = db.query(SystemSetting).filter(SystemSetting.setting_key == DEMO_KEY).first()
    if not row:
        row = SystemSetting(setting_key=DEMO_KEY, setting_value=json.dumps(data))
        db.add(row)
    else:
        row.setting_value = json.dumps(data)
    db.commit()
    return get_demo_controls(db)