from app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT full_name, ethnicity, religion, place_of_birth FROM user_profiles LIMIT 5;"))
    for row in res:
        print(row)
