from datetime import date

from app.api.endpoints.categories import get_semesters


class _DummyQuery:
    def __init__(self, rows):
        self._rows = rows

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return self._rows


class _DummySession:
    def query(self, model):
        return _DummyQuery([
            type(
                "SemesterStub",
                (),
                {
                    "semester_id": "20241",
                    "semester_number": 1,
                    "academic_year": "2024-2025",
                    "start_date": date(2024, 8, 1),
                    "end_date": date(2024, 12, 31),
                    "status": "Upcoming",
                },
            )()
        ])


def test_get_semesters_includes_start_and_end_dates():
    result = get_semesters(db=_DummySession())

    assert result["status"] == "success"
    assert len(result["data"]) == 1
    assert result["data"][0]["semester_id"] == "20241"
    assert result["data"][0]["start_date"] == "2024-08-01"
    assert result["data"][0]["end_date"] == "2024-12-31"
