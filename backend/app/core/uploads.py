"""Xác thực file ảnh upload an toàn.

- Giới hạn kích thước (chống DoS).
- Kiểm tra magic bytes (không tin MIME content_type).
- Chặn path traversal ở tên file.
"""
import os
import re

from fastapi import UploadFile, HTTPException

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB


def _detect_image_ext(data: bytes):
    if len(data) >= 3 and data[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if len(data) >= 8 and data[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


def validate_and_read_image(file: UploadFile):
    """Đọc nội dung file, kiểm tra kích thước + magic bytes.

    Trả về (bytes, phần mở rộng chuẩn) hoặc raise HTTPException.
    """
    data = file.file.read(MAX_IMAGE_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="File rỗng.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413,
                            detail="File ảnh vượt quá kích thước cho phép (tối đa 5MB).")
    ext = _detect_image_ext(data)
    if ext is None:
        raise HTTPException(status_code=400,
                            detail="File không phải ảnh hợp lệ (jpg/png/webp).")
    return data, ext


def safe_filename(identifier: str, ext: str = ".jpg") -> str:
    """Tạo tên file an toàn từ mã định danh, chặn path traversal.

    Chỉ giữ ký tự chữ/số/'-'/'_', mọi ký tự khác bị bỏ.
    """
    cleaned = re.sub(r"[^A-Za-z0-9\-_]", "", str(identifier))
    cleaned = cleaned[:50] or "file"
    return f"{cleaned}{ext}"


def write_image(directory: str, identifier: str, data: bytes, ext: str = ".jpg") -> str:
    """Ghi ảnh an toàn; trả về đường dẫn tuyệt đối."""
    os.makedirs(directory, exist_ok=True)
    filename = safe_filename(identifier, ext)
    path = os.path.join(directory, filename)
    with open(path, "wb") as f:
        f.write(data)
    return path
