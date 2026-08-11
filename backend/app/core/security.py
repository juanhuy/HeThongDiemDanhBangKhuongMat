import hashlib
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

from config.settings import settings


def get_password_hash(password: str) -> str:
    # Cắt chuỗi dưới 72 bytes theo yêu cầu của bcrypt
    pwd_bytes = password.encode('utf-8')
    if len(pwd_bytes) > 72:
        pwd_bytes = pwd_bytes[:72]

    # Tạo salt và hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def _is_bcrypt(hashed_password: str) -> bool:
    return isinstance(hashed_password, str) and hashed_password.startswith("$2")


def _is_legacy_sha256(hashed_password: str) -> bool:
    return (
        isinstance(hashed_password, str)
        and len(hashed_password) == 64
        and not _is_bcrypt(hashed_password)
    )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xác thực mật khẩu; hỗ trợ cả bcrypt (mới) và SHA-256 (dữ liệu cũ)."""
    if not hashed_password:
        return False
    if _is_bcrypt(hashed_password):
        pwd_bytes = plain_password.encode('utf-8')
        if len(pwd_bytes) > 72:
            pwd_bytes = pwd_bytes[:72]
        try:
            return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
        except (ValueError, TypeError):
            return False
    # Legacy SHA-256 không muối
    return hashlib.sha256(plain_password.encode('utf-8')).hexdigest() == hashed_password


def password_needs_rehash(hashed_password: str) -> bool:
    """True nếu hash cũ (SHA-256) cần được nâng cấp lên bcrypt."""
    return _is_legacy_sha256(hashed_password)


def get_auth_config():
    auth_cfg = settings.config.get("auth", {})
    if not auth_cfg:
        auth_cfg = settings.auth
    return auth_cfg


_DEFAULT_SECRET = "ptit-diem-danh-jwt-secret-key-doi-ngay-khi-deploy"


def _resolve_secret(auth_cfg) -> str:
    """Lấy JWT secret; nếu rỗng (config.yaml có secret_key: "") thì dùng mặc định, không ký bằng secret rỗng."""
    secret = auth_cfg.get("secret_key") or ""
    if isinstance(secret, str) and secret.strip():
        return secret
    return _DEFAULT_SECRET


def create_access_token(payload: dict) -> str:
    """Tạo JWT access token với thời hạn cấu hình trong config.yaml.

    payload phải chứa ít nhất: sub (username), role.
    Các trường khác (mssv, lecturer_id, ho_ten, ...) được nhúng nguyên vẹn
    vào claims để các endpoint tra cứu danh tính mà không cần hỏi DB.
    """
    auth_cfg = get_auth_config()
    expire_minutes = auth_cfg.get("expire_minutes", 480)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)

    to_encode = {
        "sub": payload.get("sub", ""),
        "role": payload.get("role", "sinh_vien"),
        "exp": expires_at,
    }
    for key in ("username", "mssv", "lecturer_id", "ho_ten", "lop_base"):
        if key in payload:
            to_encode[key] = payload[key]

    return jwt.encode(
        to_encode,
        _resolve_secret(auth_cfg),
        algorithm=auth_cfg.get("algorithm", "HS256"),
    )


def decode_token(token: str) -> dict | None:
    """Giải mã JWT token. Trả về dict claims hoặc None nếu token lỗi/hết hạn."""
    auth_cfg = get_auth_config()
    try:
        payload = jwt.decode(
            token,
            _resolve_secret(auth_cfg),
            algorithms=[auth_cfg.get("algorithm", "HS256")],
        )
        return payload
    except JWTError:
        return None