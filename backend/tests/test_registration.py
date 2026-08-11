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
    """Tạo môn + 2 lớp cùng môn -> SV đăng ký lớp 2 bị chặn trùng môn.
    Dùng bộ dữ liệu riêng (prefix DUP) để không đụng fixture `registered`
    (module-scoped, chỉ được dọn cuối module)."""
    SUB = "DUPSUB01"; CLS1 = "DUPCLS01"; CLS2 = "DUPCLS02"; STU = "DUPSV01"
    client.post("/api/subjects/", headers=auth(admin_token),
                json={"subject_id": SUB, "subject_name": "Môn trùng", "credits": 3})
    for cid in (CLS1, CLS2):
        client.post("/api/lop_tin_chi", headers=auth(admin_token),
                    data={"ma_lop_tc": cid, "ma_mon": SUB, "hoc_ky": 1,
                          "nam_hoc": "2025-2026", "khoa": "D22", "si_so_toi_da": 50, "trang_thai": "Active"})
    client.post("/api/admin/students/", headers=auth(admin_token),
                json={"student_id": STU, "full_name": "SV trùng", "email": "dupsv01@ptit.edu.vn",
                      "administrative_class": "D22CQCNPM01", "major": "CNTT", "cohort": "D22"})
    r0 = client.post("/api/sinh_vien_lop_tin_chi",
                     headers=auth(admin_token),
                     data={"ma_lop_tc": CLS2, "mssv": STU})
    assert r0.status_code == 200, f"Đăng ký CLS2 thất bại: {r0.text}"
    r = client.post("/api/sinh_vien_lop_tin_chi",
                    headers=auth(admin_token),
                    data={"ma_lop_tc": CLS1, "mssv": STU})
    assert r.status_code == 400
    assert "trùng môn" in r.json().get("detail", "").lower() or "đã đăng ký" in r.json().get("detail", "")
    # dọn
    client.delete(f"/api/sinh_vien_lop_tin_chi/{CLS2}/{STU}", headers=auth(admin_token))
    client.delete(f"/api/lop_tin_chi/{CLS2}", headers=auth(admin_token))
    client.delete(f"/api/lop_tin_chi/{CLS1}", headers=auth(admin_token))
    client.delete(f"/api/admin/students/{STU}", headers=auth(admin_token))
    client.delete(f"/api/subjects/{SUB}", headers=auth(admin_token))


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
