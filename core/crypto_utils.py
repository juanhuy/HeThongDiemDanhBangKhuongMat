from cryptography.fernet import Fernet
from config.settings import settings

# Lấy khóa mã hóa từ settings, nếu không có sẽ tự động dùng khóa mặc định.
KEY_STR = settings.database.get("encryption_key", "j9z1S0Hpx3D5D-zD5vQo_N_T5yP6yS1z4aB8c7D9eFg=")
cipher_suite = Fernet(KEY_STR.encode())

def encrypt_vector(vector_bytes: bytes) -> bytes:
    """
    Mã hóa dữ liệu nhị phân của vector khuôn mặt bằng Fernet (AES-128).
    """
    if not vector_bytes:
        return vector_bytes
    return cipher_suite.encrypt(vector_bytes)

def decrypt_vector(encrypted_bytes: bytes) -> bytes:
    """
    Giải mã dữ liệu nhị phân của vector khuôn mặt.
    """
    if not encrypted_bytes:
        return encrypted_bytes
    return cipher_suite.decrypt(encrypted_bytes)
