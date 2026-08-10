"""Test báo cáo 6 cấp + phân quyền xem báo cáo."""
import pytest

from fixtures import auth


def test_attendance_permission_student(client, student_token, admin_token):
    """SV chỉ xem log của mình; cố tình xem người khác -> 403."""
    r = client.get("/api/attendance", headers=auth(student_token))
    assert r.status_code == 200
    for log in r.json().get("logs", []):
        assert log["mssv"].upper() == "N22DCCN160", "SV thấy log của người khác!"

    r = client.get("/api/attendance?mssv=N22DCCN134", headers=auth(student_token))
    assert r.status_code == 403


def test_attendance_filters_admin(client, admin_token):
    r = client.get("/api/attendance?limit=5", headers=auth(admin_token))
    assert r.status_code == 200
    assert "logs" in r.json() and "total" in r.json()


def test_report_class_permission_lecturer(client, lecturer_token):
    """GV chỉ xem báo cáo lớp mình dạy (hoặc tất cả lớp GV001)."""
    r = client.get("/api/reports/attendance?ma_lop_tc=D22CQCNPM02-N", headers=auth(lecturer_token))
    assert r.status_code == 200
    assert "report" in r.json()


def test_report_class_not_found(client, lecturer_token):
    r = client.get("/api/reports/attendance?ma_lop_tc=KHONGTONT", headers=auth(lecturer_token))
    assert r.status_code == 200  # lớp không có SV vẫn trả report rỗng, không lỗi
    assert r.json()["report"] == []


def test_report_lecturer_own(client, lecturer_token):
    r = client.get("/api/reports/lecturer?lecturer_id=GV001", headers=auth(lecturer_token))
    assert r.status_code == 200
    assert "classes" in r.json()


def test_report_lecturer_forbidden(client, lecturer_token):
    """GV không thể xem báo cáo GV khác (dùng mã khác)."""
    r = client.get("/api/reports/lecturer?lecturer_id=GV999", headers=auth(lecturer_token))
    assert r.status_code == 403


def test_report_student_own(client, student_token):
    r = client.get("/api/reports/student", headers=auth(student_token))
    assert r.status_code == 200
    assert "classes" in r.json()


def test_report_student_other_forbidden(client, student_token):
    r = client.get("/api/reports/student?mssv=N22DCCN134", headers=auth(student_token))
    assert r.status_code == 403


def test_report_faculty_admin_only(client, admin_token, lecturer_token):
    r = client.get("/api/admin/reports/faculty?cohort=D22", headers=auth(admin_token))
    assert r.status_code == 200
    assert "students" in r.json()

    r = client.get("/api/admin/reports/faculty?cohort=D22", headers=auth(lecturer_token))
    assert r.status_code == 403


def test_admin_summary(client, admin_token):
    r = client.get("/api/admin/reports/summary", headers=auth(admin_token))
    assert r.status_code == 200
    assert "tong_lop" in r.json()


def test_export_excel(client, lecturer_token):
    r = client.get("/api/reports/attendance/export?ma_lop_tc=D22CQCNPM02-N", headers=auth(lecturer_token))
    assert r.status_code == 200
    assert "spreadsheet" in r.headers.get("content-type", "")
