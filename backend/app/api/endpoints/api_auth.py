from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.account import Account
from app.models.student import Student
from app.models.lecturer import Lecturer
from app.core.security import create_access_token, get_password_hash, verify_password, password_needs_rehash
from app.core.rate_limit import is_locked, record_failure, record_success
from fastapi import Request

from app.core.require import get_current_user

router = APIRouter()


def normalize_role(role: str) -> str:
    if not role:
        return "sinh_vien"
    r = role.lower()
    if r in ("admin",):
        return "admin"
    if r in ("giang_vien", "lecturer"):
        return "giang_vien"
    return "sinh_vien"


def _build_user_payload(account: Account, db: Session) -> dict:
    """Lấy thông tin SV/GV liên kết để nhúng vào payload & token."""
    role = normalize_role(account.role)
    student_info = None
    lecturer_info = None
    if role == "sinh_vien":
        from app.models.student import UserProfile
        student = db.query(Student).join(UserProfile).filter(
            UserProfile.account_id == account.account_id
        ).first()
        if student:
            student_info = student
    elif role == "giang_vien":
        from app.models.student import UserProfile
        lecturer = db.query(Lecturer).join(UserProfile, Lecturer.profile_id == UserProfile.profile_id).filter(
            UserProfile.account_id == account.account_id
        ).first()
        if not lecturer:
            lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == account.username).first()
        if lecturer:
            lecturer_info = lecturer

    user_data = {
        "username": account.username,
        "role": role,
        "mssv": student_info.student_id if student_info else None,
        "lecturer_id": lecturer_info.lecturer_id if lecturer_info else None,
        "ho_ten": (
            student_info.full_name if student_info else
            (lecturer_info.full_name if lecturer_info else account.username)
        ),
        "lop_base": student_info.administrative_class if student_info else None,
    }
    return user_data


@router.post("/login")
def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db),
          request: Request = None):
    client_ip = request.client.host if request and request.client else "unknown"
    locked, remaining = is_locked(client_ip, username.strip().lower())
    if locked:
        raise HTTPException(status_code=429,
                            detail=f"Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau {remaining // 60 + 1} phút.")
    
    account = db.query(Account).filter(
        Account.username == username.strip().lower()
    ).first()
    if not account or not verify_password(password, account.password_hash):
        locked_now, _ = record_failure(client_ip, username.strip().lower())
        if locked_now:
            raise HTTPException(status_code=429, detail="Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút.")
        raise HTTPException(status_code=401, detail="Ten dang nhap hoac mat khau khong dung")
    if account.is_active is False:
        raise HTTPException(status_code=403, detail="Tai khoan da bi khoa.")

    if password_needs_rehash(account.password_hash):
        account.password_hash = get_password_hash(password)
        db.add(account)
        db.commit()

    record_success(client_ip, username.strip().lower())

    user_data = _build_user_payload(account, db)
    access_token = create_access_token({
        "sub": account.username,
        "role": user_data["role"],
        "username": user_data["username"],
        "mssv": user_data["mssv"],
        "lecturer_id": user_data["lecturer_id"],
        "ho_ten": user_data["ho_ten"],
        "lop_base": user_data["lop_base"],
    })

    return {
        "status": "success",
        "message": "Dang nhap thanh cong.",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 60 * 60 * 8,
        "user": user_data,
    }


@router.post("/register")
def register(username: str = Form(...), password: str = Form(...), mssv: str = Form(None), db: Session = Depends(get_db)):
    username_lower = username.strip().lower()
    if not username_lower or not password:
        raise HTTPException(status_code=400, detail="Ten dang nhap va mat khau khong duoc de trong.")

    existing_account = db.query(Account).filter(Account.username == username_lower).first()
    if existing_account:
        raise HTTPException(status_code=400, detail="Tai khoan da ton tai.")

    role = "sinh_vien"
    student = None
    if mssv:
        student = db.query(Student).filter(Student.student_id == mssv.strip().upper()).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Khong tim thay sinh vien {mssv} de lien ket tai khoan.")

    pw_hash = get_password_hash(password)
    new_account = Account(
        username=username_lower,
        password_hash=pw_hash,
        role=role,
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    if student:
        if not student.profile:
            from app.models.student import UserProfile
            profile = UserProfile(
                account_id=new_account.account_id,
                full_name=student.student_id
            )
            db.add(profile)
            db.flush()
            student.profile_id = profile.profile_id
        else:
            student.profile.account_id = new_account.account_id
        db.commit()

    return {"status": "success", "message": f"Tai khoan {username} da duoc tao (sinh vien)."}

@router.post("/change-password")
def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Đổi mật khẩu cho tài khoản đang đăng nhập."""
    username = current_user.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Không xác định được tài khoản.")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 6 ký tự.")

    account = db.query(Account).filter(Account.username == username.strip().lower()).first()
    if not account:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

    if not verify_password(current_password, account.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng.")

    account.password_hash = get_password_hash(new_password)
    db.add(account)
    db.commit()

    return {"status": "success", "message": "Đổi mật khẩu thành công."}


@router.get("/notifications")
def get_my_notifications(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Danh sách thông báo của người dùng đang đăng nhập."""
    from app.models.notification import Notification
    username = (current_user.get("username") or "").strip().lower()
    items = db.query(Notification).filter(Notification.username == username) \
        .order_by(Notification.created_at.desc()).limit(50).all()
    return {
        "status": "success",
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "is_read": bool(n.is_read),
                "timestamp": n.created_at.strftime("%Y-%m-%d %H:%M:%S") if n.created_at else None,
            }
            for n in items
        ],
    }


@router.post("/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    from app.models.notification import Notification
    username = (current_user.get("username") or "").strip().lower()
    db.query(Notification).filter(Notification.username == username, Notification.is_read == False).update(
        {Notification.is_read: True}
    )
    db.commit()
    return {"status": "success", "message": "Đã đánh dấu tất cả là đã đọc."}


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db),
                           current_user: dict = Depends(get_current_user)):
    from app.models.notification import Notification
    username = (current_user.get("username") or "").strip().lower()
    n = db.query(Notification).filter(
        Notification.id == notification_id, Notification.username == username
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")
    n.is_read = True
    db.commit()
    return {"status": "success"}
