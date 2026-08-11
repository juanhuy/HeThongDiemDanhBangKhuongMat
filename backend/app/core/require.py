"""Bộ phụ thuộc xác thực & phân quyền dùng chung cho các API.

Mỗi dependency trả về một object tựa dict với các claim của người dùng:
    {
        "username": ...,
        "role": "admin" | "giang_vien" | "sinh_vien",
        "mssv": ... | None,
        "lecturer_id": ... | None,
        "ho_ten": ...,
        "lop_base": ...,
    }

Cách dùng:
    @router.get("/...", dependencies=[Depends(require_admin)])
    def some_endpoint(current_user: dict = Depends(get_current_user)):
        ...
"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_token

# HTTPBearer ghi nhận token từ header: Authorization: Bearer <token>
_security = HTTPBearer(auto_error=False)

NORMALIZED_ROLES = {
    "admin": "admin",
    "giang_vien": "giang_vien",
    "lecturer": "giang_vien",
    "sinh_vien": "sinh_vien",
    "student": "sinh_vien",
}


def _normalize_role(role: str) -> str:
    return NORMALIZED_ROLES.get((role or "").lower(), "sinh_vien")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    """Yêu cầu token hợp lệ. Trả về claims người dùng."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Chua dang nhap (thieu token).")

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Token khong hop le hoac da het han.")

    return {
        "username": payload.get("sub", payload.get("username", "")),
        "role": _normalize_role(payload.get("role", "sinh_vien")),
        "mssv": payload.get("mssv"),
        "lecturer_id": payload.get("lecturer_id"),
        "ho_ten": payload.get("ho_ten"),
        "lop_base": payload.get("lop_base"),
    }


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict | None:
    """Dependency không bắt buộc đăng nhập (Token tùy chọn, không báo 401 nếu thiếu)."""
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials)
    if payload is None:
        return None
    return {
        "username": payload.get("sub", payload.get("username", "")),
        "role": _normalize_role(payload.get("role", "sinh_vien")),
        "mssv": payload.get("mssv"),
        "lecturer_id": payload.get("lecturer_id"),
        "ho_ten": payload.get("ho_ten"),
        "lop_base": payload.get("lop_base"),
    }



def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Ban khong co quyen admin.")
    return current_user


def require_roles(*roles: str):
    """Depends factories cho nhiều quyền. VD: require_roles("giang_vien", "admin")."""
    normalized = {_normalize_role(r) for r in roles}

    def _guard(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in normalized:
            raise HTTPException(status_code=403, detail="Tai khoan khong co quyen truy cap.")
        return current_user

    return _guard