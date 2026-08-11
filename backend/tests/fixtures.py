"""Các fixture dùng chung cho test: client + tài khoản."""
import pytest
import httpx

from conftest import BASE_URL


@pytest.fixture(scope="session")
def client():
    return httpx.Client(base_url=BASE_URL, timeout=15)


def _login(client, username, password):
    r = client.post("/api/auth/login", data={"username": username, "password": password})
    assert r.status_code == 200, f"Login {username} thất bại: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(client):
    return _login(client, "admin", "123456")


@pytest.fixture(scope="session")
def lecturer_token(client):
    return _login(client, "giangvien", "123456")


@pytest.fixture(scope="session")
def student_token(client):
    return _login(client, "N22DCCN160", "123456")


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# Dữ liệu test (tạo riêng, tiền tố TEST để dễ dọn)
TEST_SUBJECT = "TESTSUB01"
TEST_CLASS = "TESTCLS01"
TEST_STUDENT = "TESTSV01"
TEST_LECTURER = "TESTGV01"


def create_subject(client, token, subject_id=TEST_SUBJECT, name="Test môn", credits=3, prereq=None):
    payload = {"subject_id": subject_id, "subject_name": name, "credits": credits}
    if prereq:
        payload["prerequisites"] = prereq
    return client.post("/api/subjects/", headers=auth(token), json=payload)


def create_credit_class(client, token, class_id=TEST_CLASS, subject_id=TEST_SUBJECT,
                        semester=1, year="2025-2026", cohort="D22", max_sv=50, status="Active",
                        lecturer_id=None):
    data = {
        "ma_lop_tc": class_id, "ma_mon": subject_id,
        "hoc_ky": semester, "nam_hoc": year, "khoa": cohort,
        "si_so_toi_da": max_sv, "trang_thai": status,
    }
    if lecturer_id:
        data["ma_gv"] = lecturer_id
    return client.post("/api/lop_tin_chi", headers=auth(token), data=data)


def create_student(client, token, mssv=TEST_STUDENT, name="Test SV", lop="D22CQCNPM01", cohort="D22"):
    return client.post("/api/admin/students/", headers=auth(token), json={
        "student_id": mssv, "full_name": name,
        "email": f"{mssv.lower()}@ptit.edu.vn",
        "administrative_class": lop, "major": "CNTT", "cohort": cohort,
    })


def delete_class(client, token, class_id=TEST_CLASS):
    return client.delete(f"/api/lop_tin_chi/{class_id}", headers=auth(token))


def delete_subject(client, token, subject_id=TEST_SUBJECT):
    return client.delete(f"/api/subjects/{subject_id}", headers=auth(token))


def delete_student(client, token, mssv=TEST_STUDENT):
    return client.delete(f"/api/admin/students/{mssv}", headers=auth(token))
