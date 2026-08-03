from app.db.session import SessionLocal
from app.crud.crud_lecturer import create_lecturer
from app.schemas.lecturer import LecturerCreate

db = SessionLocal()
try:
    lecturer_data = LecturerCreate(
        lecturer_id="GV999",
        full_name="Nguyễn Văn Giảng",
        email="gv@ptit.edu.vn",
        phone_number="0987654321",
        department="CNTT"
    )
    res = create_lecturer(db, lecturer_data)
    print("OK", res)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.rollback()
    db.close()
