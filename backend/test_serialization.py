from app.db.session import SessionLocal
from app.crud.crud_student import create_student
from app.schemas.student import StudentCreate

db = SessionLocal()
try:
    student_data = StudentCreate(
        student_id="TEST_001",
        full_name="Nguyễn Văn Test",
        email="test@ptit.edu.vn",
        phone_number="0123456789"
    )
    res = create_student(db, student_data)
    print("OK", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    # rollback to not pollute DB
    db.rollback()
    db.close()
