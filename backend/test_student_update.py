from app.db.session import SessionLocal
from app.crud.crud_student import update_student, get_student
from app.schemas.student import StudentUpdate

db = SessionLocal()
try:
    student_id = "N22DCCN6052"
    db_student = get_student(db, student_id)
    if db_student:
        update_data = StudentUpdate(academic_status="graduated")
        res = update_student(db, db_student, update_data)
        print("OK", res)
    else:
        print("Student not found")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.rollback()
    db.close()
