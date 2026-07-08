import os
import yaml

class Settings:
    def __init__(self, config_path=None):
        if config_path is None:
            # Lấy đường dẫn config.yaml tương đối với file settings.py
            current_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(current_dir, "config.yaml")
        
        self.config_path = config_path
        self.config = {}
        self.load_config()

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


# Khởi tạo một thực thể cấu hình dùng chung
settings = Settings()
