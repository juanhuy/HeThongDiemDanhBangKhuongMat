"""Tạo thông báo trong hệ thống (lưu DB)."""
from app.models.notification import Notification


def notify(db, username: str, title: str, message: str = None, ntype: str = "info", commit: bool = True):
    try:
        db.add(Notification(username=username, title=title, message=message, type=ntype))
        if commit:
            db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
