from app.api.endpoints.categories import get_semesters
from app.db.session import SessionLocal
from app.models import Semester

with SessionLocal() as db:
    sems = db.query(Semester).all()
    print('count', len(sems))
    if sems:
        s = sems[0]
        print('sample', s.semester_id, s.start_date, s.end_date)
