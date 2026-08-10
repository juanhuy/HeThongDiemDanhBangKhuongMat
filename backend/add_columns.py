from app.db.session import engine
from sqlalchemy import text

with engine.begin() as conn:
    print("Adding columns to accounts table...")
    try:
        conn.execute(text("ALTER TABLE accounts ADD COLUMN failed_login_attempts INT DEFAULT 0"))
    except Exception as e:
        print("failed_login_attempts:", e)
    
    try:
        conn.execute(text("ALTER TABLE accounts ADD COLUMN lock_until DATETIME DEFAULT NULL"))
    except Exception as e:
        print("lock_until:", e)
        
    try:
        conn.execute(text("ALTER TABLE accounts ADD COLUMN last_login DATETIME DEFAULT NULL"))
    except Exception as e:
        print("last_login:", e)
        
    try:
        conn.execute(text("ALTER TABLE accounts ADD COLUMN refresh_token TEXT DEFAULT NULL"))
    except Exception as e:
        print("refresh_token:", e)
        
    print("Done")
