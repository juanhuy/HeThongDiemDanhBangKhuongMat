"""Ghi nhật ký thao tác (audit trail) cho các hành động quản trị."""
from app.models.audit_log import AuditLog


def log_audit(db, actor_username: str = None, actor_role: str = None,
              action: str = "UPDATE", target: str = None, target_id: str = None,
              detail: str = None, commit: bool = True):
    """Ghi một bản ghi audit. Nếu commit=True sẽ commit ngay (tách session riêng)."""
    try:
        entry = AuditLog(
            actor_username=actor_username,
            actor_role=actor_role,
            action=action,
            target=target,
            target_id=target_id,
            detail=detail,
        )
        db.add(entry)
        if commit:
            db.commit()
    except Exception:
        # Audit không được làm hỏng nghiệp vụ chính
        try:
            db.rollback()
        except Exception:
            pass
