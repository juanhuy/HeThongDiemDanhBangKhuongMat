"""Test quy tắc đăng ký học phần (9 quy tắc + trùng lịch).

Tạo dữ liệu test riêng (TESTSUB01/TESTCLS01/TESTSV01) và tự dọn sau test.
"""
import pytest

from fixtures import (
    auth, create_subject, create_credit_class, create_student,
    delete_class, delete_subject, delete_student, TEST_CLASS, TEST_SUBJECT, TEST_STUDENT,
)


@pytest.fixture(scope="module")
def registered(client, admin_token):
    """Tạo SV + môn + lớp, đăng ký cho SV. Dọn sạch sau khi xong."""
    create_subject(client, admin_token)
    create_credit_class(client, admin_token)
    r = create_student(client, admin_token)
    assert r.status_code == 201, f"Tạo SV thất bại: {r.text}"
    r = client.post("/api/sinh_vien_lop_tin_chi",
                    headers=auth(admin_token),
                    data={"ma_lop_tc": TEST_CLASS, "mssv": TEST_STUDENT})
    assert r.status_code == 200, f"Đăng ký thất bại: {r.text}"
    yield
    # Dọn dẹp
    client.delete(f"/api/sinh_vien_lop_tin_chi/{TEST_CLASS}/{TEST_STUDENT}", headers=auth(admin_token))
    delete_class(client, admin_token)
    delete_student(client, admin_token)
    delete_subject(client, admin_token)


def test_register_ok(client, admin_token, registered):
    # Đã đăng ký thành công trong fixture -> kiểm tra tồn tại
    r = client.get(f"/api/students/{TEST_STUDENT}/classes", headers=auth(admin_token))
    assert r.status_code == 200
    classes = r.json().get("classes", [])
    assert any(c["class_id"] == TEST_CLASS for c in classes)


def test_register_duplicate(client, admin_token, registered):
    # Sinh viên tự đăng ký trùng -> hệ thống trả 200 (idempotent) hoặc chặn
    r = client.post("/api/sinh_vien_lop_tin_chi",
                    headers=auth(admin_token),
                    data={"ma_lop_tc": TEST_CLASS, "mssv": TEST_STUDENT})
    assert r.status_code == 200


def test_register_duplicate_subject(client, admin_token):
    """Tạo môn + 2 lớp cùng môn -> SV đăng ký lớp 2 bị chặn trùng môn."""
    create_subject(client, admin_token)
    create_credit_class(client, admin_token, class_id="TESTCLS02")
    create_student(client, admin_token)
    client.post("/api/sinh_vien_lop_tin_chi",
                headers=auth(admin_token),
                data={"ma_lop_tc": "TESTCLS02", "mssv": TEST_STUDENT})
    r = client.post("/api/sinh_vien_lop_tin_chi",
                    headers=auth(admin_token),
                    data={"ma_lop_tc": TEST_CLASS, "mssv": TEST_STUDENT})
    assert r.status_code == 400
    assert "trùng môn" in r.json().get("detail", "").lower() or "đã đăng ký" in r.json().get("detail", "")
    # dọn
    client.delete(f"/api/sinh_vien_lop_tin_chi/TESTCLS02/{TEST_STUDENT}", headers=auth(admin_token))
    delete_class(client, admin_token, class_id="TESTCLS02")
    delete_student(client, admin_token)
    delete_subject(client, admin_token)


def test_register_full_class(client, admin_token):
    """Lớp max_students=1 -> SV thứ 2 bị chặn sĩ số."""
    create_subject(client, admin_token)
    create_credit_class(client, admin_token, max_sv=1)
    create_student(client, admin_token, mssv="TESTSV02", name="SV2")
    create_student(client, admin_token, mssv="TESTSV03", name="SV3")
    client.post("/api/sinh_vien_lop_tin_chi",
                headers=auth(admin_token), data={"ma_lop_tc": TEST_CLASS, "mssv": "TESTSV02"})
    r = client.post("/api/sinh_vien_lop_tin_chi",
                    headers=auth(admin_token), data={"ma_lop_tc": TEST_CLASS, "mssv": "TESTSV03"})
    assert r.status_code == 400
    assert "sĩ số" in r.json().get("detail", "").lower() or "đủ" in r.json().get("detail", "")
    # dọn
    client.delete(f"/api/sinh_vien_lop_tin_chi/{TEST_CLASS}/TESTSV02", headers=auth(admin_token))
    delete_class(client, admin_token)
    delete_student(client, admin_token, mssv="TESTSV02")
    delete_student(client, admin_token, mssv="TESTSV03")
    delete_subject(client, admin_token)


def test_register_wrong_cohort(client, admin_token):
    """Lớp mở cho khóa D21, SV khóa D22 -> chặn khóa."""
    create_subject(client, admin_token)
    create_credit_class(client, admin_token, cohort="D21")
    create_student(client, admin_token)
    r = client.post("/api/sinh_vien_lop_tin_chi",
                    headers=auth(admin_token), data={"ma_lop_tc": TEST_CLASS, "mssv": TEST_STUDENT})
    assert r.status_code == 400
    assert "khóa" in r.json().get("detail", "").lower()
    delete_class(client, admin_token)
    delete_student(client, admin_token)
    delete_subject(client, admin_token)


def test_register_wrong_semester(client, admin_token):
    """Lớp học kỳ 2 trong khi đang mở kỳ 1 -> chặn."""
    create_subject(client, admin_token)
    create_credit_class(client, admin_token, semester=2)
    create_student(client, admin_token)
    r = client.post("/api/sinh_vien_lop_tin_chi",
                    headers=auth(admin_token), data={"ma_lop_tc": TEST_CLASS, "mssv": TEST_STUDENT})
    assert r.status_code == 400
    assert "học kỳ" in r.json().get("detail", "").lower()
    delete_class(client, admin_token)
    delete_student(client, admin_token)
    delete_subject(client, admin_token)
