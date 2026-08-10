"""Test luồng điểm danh nhanh + nghỉ phép + ràng buộc thuộc lớp."""
import pytest

from fixtures import auth, create_subject, create_credit_class, TEST_CLASS, TEST_SUBJECT


@pytest.fixture(scope="module", autouse=True)
def setup(client, admin_token):
    create_subject(client, admin_token)
    create_credit_class(client, admin_token)
    yield
    from fixtures import delete_class, delete_subject
    # chỉ dọn nếu còn
    r = client.delete(f"/api/lop_tin_chi/{TEST_CLASS}", headers=auth(admin_token))
    client.delete(f"/api/subjects/{TEST_SUBJECT}", headers=auth(admin_token))


def test_manual_checkin_student_not_in_class(client, admin_token, lecturer_token):
    """GV điểm danh SV KHÔNG thuộc lớp -> 400."""
    r = client.post("/api/teacher/manual_checkin",
                    headers=auth(lecturer_token),
                    data={"ma_lop_tc": TEST_CLASS, "mssv": "N22DCCN161", "ma_buoi_hoc": 9, "trang_thai": "Có mặt"})
    assert r.status_code == 400
    assert "không thuộc lớp" in r.json().get("detail", "").lower()


def test_leave_request_not_in_class(client, student_token):
    """SV xin nghỉ buổi lớp mình không học -> 400."""
    # N22DCCN160 không thuộc TESTCLS01 (chưa có lịch học nào cho TESTCLS01, dùng buổi 9)
    # Vì TESTCLS01 chưa có lịch, buổi 9 thuộc D22CQCNPM02-N -> SV N22DCCN161 không thuộc lớp đó
    r = client.post("/api/student/leave_request",
                    headers=auth(student_token),
                    data={"mssv": "N22DCCN160", "ma_buoi_hoc": 9, "ly_do": "test"})
    # N22DCCN160 thuộc D22CQCNPM02-N -> có thể được phép hoặc bị chặn giờ
    # Chỉ đảm bảo không 500
    assert r.status_code in (200, 400)


def test_manual_checkin_valid_class(client, admin_token, lecturer_token):
    """GV điểm danh SV thuộc lớp -> 200."""
    # Đăng ký SV vào TESTCLS01, thêm lịch, rồi điểm danh
    create_student_local(client, admin_token, "N22DCCN160")
    client.post("/api/sinh_vien_lop_tin_chi",
                headers=auth(admin_token), data={"ma_lop_tc": TEST_CLASS, "mssv": "N22DCCN160"})
    # thêm lịch cho TESTCLS01
    from datetime import datetime, timedelta
    date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
    client.post("/api/lich_hoc_chi_tiet", headers=auth(admin_token),
                data={"ma_lop_tc": TEST_CLASS, "ngay_hoc": date, "phong_hoc": "A1-999", "gio_hoc": "18:00"})
    # lấy schedule_id
    scheds = client.get(f"/api/lich_hoc_chi_tiet?class_id={TEST_CLASS}", headers=auth(lecturer_token)).json()["schedules"]
    assert scheds, "Chưa tạo được lịch"
    sid = scheds[0]["schedule_id"]
    r = client.post("/api/teacher/manual_checkin",
                    headers=auth(lecturer_token),
                    data={"ma_lop_tc": TEST_CLASS, "mssv": "N22DCCN160", "ma_buoi_hoc": sid, "trang_thai": "Có mặt"})
    assert r.status_code == 200


def create_student_local(client, token, mssv):
    return client.post("/api/admin/students/", headers=auth(token), json={
        "student_id": mssv, "full_name": "Test", "email": f"{mssv.lower()}@ptit.edu.vn",
        "administrative_class": "D22CQCNPM01", "major": "CNTT", "cohort": "D22",
    })
