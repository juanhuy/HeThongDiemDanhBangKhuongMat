from app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE user_profiles ADD COLUMN place_of_birth VARCHAR(100);"))
        conn.commit()
        print("Cập nhật thành công")
    except Exception as e:
        print("Lỗi:", e)
