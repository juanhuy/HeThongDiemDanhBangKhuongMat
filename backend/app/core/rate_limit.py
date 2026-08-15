"""Rate-limit đăng nhập chống brute-force (in-memory, sliding window).

Chạy đơn tiến trình (uvicorn mặc định) nên bộ đếm trong RAM là đủ.
Nếu chạy nhiều worker/instance cần chuyển sang Redis.
"""
import threading
import time
from collections import defaultdict, deque

_MAX_ATTEMPTS = 5          # số lần thất bại tối đa
_WINDOW_SECONDS = 900      # trong 15 phút
_LOCKOUT_SECONDS = 900     # khoá 15 phút sau khi vượt

_lock = threading.Lock()
# key = f"{ip}|{username}" -> deque of timestamps (lần thất bại gần đây)
_failed = defaultdict(deque)
# key -> thời điểm hết khoá
_locked_until = {}


def _prune(key, now):
    dq = _failed.get(key)
    if dq:
        while dq and now - dq[0] > _WINDOW_SECONDS:
            dq.popleft()


def is_locked(ip: str, username: str) -> tuple[bool, int]:
    """(có bị khoá?, số giây còn lại)."""
    now = time.time()
    with _lock:
        until = _locked_until.get((ip, username), 0)
        if until > now:
            return True, int(until - now)
        _prune(f"{ip}|{username}", now)
        return False, 0


def record_failure(ip: str, username: str):
    """Ghi nhận một lần đăng nhập thất bại; trả về (bị khoá?, còn lại bao nhiêu giây)."""
    now = time.time()
    key = f"{ip}|{username}"
    with _lock:
        _prune(key, now)
        _failed[key].append(now)
        if len(_failed[key]) >= _MAX_ATTEMPTS:
            until = now + _LOCKOUT_SECONDS
            _locked_until[(ip, username)] = until
            _failed[key].clear()
            return True, _LOCKOUT_SECONDS
        return False, 0


def record_success(ip: str, username: str):
    """Xoá bộ đếm khi đăng nhập thành công."""
    key = f"{ip}|{username}"
    with _lock:
        _failed.pop(key, None)
        _locked_until.pop((ip, username), None)


# =========================================================================
# RATE-LIMIT ĐĂNG KÝ HỌC PHẦN (chống auto-click / tool đăng ký tự động)
# Sliding window: 1 user tối đa _REG_MAX_REQ request đăng ký trong _REG_WINDOW giây.
# =========================================================================
_REG_MAX_REQ = 3
_REG_WINDOW_SECONDS = 1.0

_reg_lock = threading.Lock()
_reg_reqs = defaultdict(deque)  # key = username -> deque timestamps


def check_registration_rate(username: str) -> bool:
    """True nếu cho phép đăng ký (chưa vượt giới hạn)."""
    now = time.time()
    key = username.strip().lower()
    with _reg_lock:
        dq = _reg_reqs.get(key)
        if dq:
            while dq and now - dq[0] > _REG_WINDOW_SECONDS:
                dq.popleft()
            if len(dq) >= _REG_MAX_REQ:
                return False
        _reg_reqs[key].append(now)
        # Dọn key cũ để tránh phình bộ nhớ
        if len(_reg_reqs) > 10000:
            cutoff = now - _REG_WINDOW_SECONDS
            for k in [k for k, v in _reg_reqs.items() if not v or v[-1] < cutoff]:
                _reg_reqs.pop(k, None)
        return True
