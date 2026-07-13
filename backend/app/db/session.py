from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Thay bằng thông tin MySQL của bạn
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:rootpassword@localhost:3306/ai_attendance_db"

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