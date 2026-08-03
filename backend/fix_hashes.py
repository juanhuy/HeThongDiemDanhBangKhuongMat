import sys
from app.db.session import SessionLocal
from app.models.account import Account
from app.core.security import get_password_hash

db = SessionLocal()
accs = db.query(Account).all()
updated = 0
for a in accs:
    if not a.password_hash.startswith('$2b$'):
        if a.password_hash == '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' or a.password_hash == '123456':
            a.password_hash = get_password_hash('123456')
            updated += 1
db.commit()
print(f'Updated {updated} invalid hashes in database')
