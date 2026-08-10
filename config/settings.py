import os
import yaml


def _load_dotenv(path):
    """Nạp file .env (KEY=VALUE) vào os.environ nếu chưa có (không dùng thư viện ngoài)."""
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


# Nạp .env (nếu có) trước khi đọc cấu hình
_load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

_SECRET_ENV_MAP = {
    "database": {
        "host": "DB_HOST",
        "port": "DB_PORT",
        "user": "DB_USER",
        "password": "DB_PASSWORD",
        "db_name": "DB_NAME",
        "encryption_key": "DB_ENCRYPTION_KEY",
    },
    "auth": {
        "secret_key": "JWT_SECRET_KEY",
        "expire_minutes": "JWT_EXPIRE_MINUTES",
        "algorithm": "JWT_ALGORITHM",
    },
}


class Settings:
    def __init__(self, config_path=None):
        if config_path is None:
            # Lấy đường dẫn config.yaml tương đối với file settings.py
            current_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(current_dir, "config.yaml")
        
        self.config_path = config_path
        self.config = {}
        self.load_config()
        self._apply_env_overrides()

    def _apply_env_overrides(self):
        """Bí mật (mật khẩu DB, JWT secret, ...) lấy từ env/.env, ghi đè config.yaml."""
        for section, mapping in _SECRET_ENV_MAP.items():
            section_cfg = self.config.setdefault(section, {})
            for key, env_name in mapping.items():
                val = os.environ.get(env_name)
                if val:
                    if env_name in ("DB_PORT", "JWT_EXPIRE_MINUTES"):
                        try:
                            section_cfg[key] = int(val)
                        except ValueError:
                            pass
                    else:
                        section_cfg[key] = val

    def load_config(self):
        if not os.path.exists(self.config_path):
            # Tạo giá trị mặc định nếu không tìm thấy file cấu hình
            self.config = {
                "ai": {"model_name": "buffalo_l", "det_size": [480, 480], "threshold": 0.65},
                "camera": {"device_id": 0, "width": 1280, "height": 720, "fps": 30},
                "database": {
                    "embeddings_dir": "./database/embeddings",
                    "images_dir": "./database/registered_images",
                    "db_file": "./database/app_db.sqlite"
                },
                "attendance": {"cooldown_seconds": 30, "log_file": "./logs/attendance_log.csv"}
            }
            return

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                self.config = yaml.safe_load(f) or {}
        except Exception as e:
            print(f"Lỗi khi đọc file config: {e}. Sử dụng cấu hình mặc định.")
            self.config = {}

    @property
    def ai(self):
        return self.config.get("ai", {})

    @property
    def camera(self):
        return self.config.get("camera", {})

    @property
    def database(self):
        return self.config.get("database", {})

    @property
    def attendance(self):
        return self.config.get("attendance", {})

    @property
    def server(self):
        return self.config.get("server", {"host": "127.0.0.1", "port": 8000})

    @property
    def registration(self):
        return self.config.get("registration", {
            "semester": 1,
            "academic_year": "2025-2026",
            "open_date": "",
            "close_date": "",
            "min_credits": 6,
            "max_credits": 25,
        })

    @property
    def demo(self):
        return self.config.get("demo", {
            "demo_mode": False,
            "bypass_registration_window": False,
            "bypass_semester": False,
            "bypass_capacity": False,
            "bypass_prerequisites": False,
            "bypass_credit_limit": False,
            "bypass_eligibility": False,
            "bypass_duplicate_subject": False,
        })

    @property
    def auth(self):
        return self.config.get("auth", {
            "secret_key": "ptit-diem-danh-jwt-secret-key-doi-ngay-khi-deploy",
            "algorithm": "HS256",
            "expire_minutes": 480,
            "token_type": "bearer",
        })


# Khởi tạo một thực thể cấu hình dùng chung
settings = Settings()
