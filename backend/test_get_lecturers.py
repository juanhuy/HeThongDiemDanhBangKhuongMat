from app.db.session import SessionLocal
from app.crud.crud_lecturer import get_lecturers
from app.schemas.lecturer import LecturerResponse

db = SessionLocal()
try:
    lecturers = get_lecturers(db)
    print(f"Total lecturers: {len(lecturers)}")
    for i, l in enumerate(lecturers):
        try:
            res = LecturerResponse.model_validate(l)
        except Exception as e:
            print(f"Failed to validate lecturer {i}: {l.lecturer_id}")
            import traceback
            traceback.print_exc()
            break
    print("Done validation")
finally:
    db.close()
