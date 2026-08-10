from app.db.session import SessionLocal
from app.crud.crud_subject import create_subject
from app.schemas.subject import SubjectCreate

db = SessionLocal()
try:
    subject_data = SubjectCreate(
        subject_id="SUBJ999",
        subject_name="Test Subject",
        credits=3,
        theory_credits=2,
        practical_credits=1,
        department="CNTT"
    )
    res = create_subject(db, subject_data)
    print("OK", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.rollback()
    db.close()
