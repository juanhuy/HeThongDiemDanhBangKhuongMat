from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config.settings import settings

db_config = settings.database
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
