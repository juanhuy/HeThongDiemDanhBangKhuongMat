import os
import yaml
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Tìm config.yaml từ thư mục làm việc hoặc đi ngược lên thư mục cha
current_dir = os.path.dirname(os.path.abspath(__file__))
config_path = None
temp_dir = current_dir
for _ in range(5):
    potential_path = os.path.join(temp_dir, "config", "config.yaml")
    if os.path.exists(potential_path):
        config_path = potential_path
        break
    temp_dir = os.path.dirname(temp_dir)

# Đọc file config.yaml nếu tồn tại, ngược lại dùng giá trị mặc định
config = {}
if config_path and os.path.exists(config_path):
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
    except Exception as e:
        print(f"Lỗi khi đọc file config.yaml trong session.py: {e}")

db_config = config.get("database", {})
host = db_config.get("host", "127.0.0.1")
port = db_config.get("port", 3309)
user = db_config.get("user", "root")
password = db_config.get("password", "")
db_name = db_config.get("db_name", "ptit_diem_danh")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{user}:{password}@{host}:{port}/{db_name}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Hàm tạo session để tiêm (inject) vào các API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()