import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Dùng một biến tạm để lưu mã giảng viên được sinh ra trong lúc test POST
# nhằm phục vụ cho các test case GET chi tiết, PUT và DELETE tiếp theo.
CREATED_LECTURER_ID = None

# =========================================================================
# TEST CASE 1: Thêm mới Giảng viên (POST /api/admin/lecturers/)
# =========================================================================
def test_create_lecturer():
    global CREATED_LECTURER_ID
    payload = {
        "full_name": "Thầy Nguyễn Đình Test",
        "email": "nguyendinhtest@ptithcm.edu.vn",
        "phone_number": "0909123456",
        "department": "FIT2",
        "academic_title": "ThS",
        "position": "Giảng viên",
        "employment_type": "Cơ hữu",
        "teaching_status": "Active"
    }
    
    response = client.post("/api/admin/lecturers/", json=payload)
    
    # Kiểm tra trả về thành công 201 Created
    assert response.status_code == 201
    data = response.json()
    
    # Kiểm tra dữ liệu phản hồi khớp với payload gửi lên
    assert data["full_name"] == payload["full_name"]
    assert data["email"] == payload["email"]
    assert "lecturer_id" in data
    
    # Lưu lại lecturer_id để dùng cho các test case sau
    CREATED_LECTURER_ID = data["lecturer_id"]
    print(f"\n[SUCCESS] Đã tạo thành công giảng viên với mã: {CREATED_LECTURER_ID}")


# =========================================================================
# TEST CASE 2: Lấy danh sách Giảng viên (GET /api/admin/lecturers/)
# =========================================================================
def test_get_all_lecturers():
    response = client.get("/api/admin/lecturers/")
    assert response.status_code == 200
    data = response.json()
    
    # Đảm bảo danh sách trả về là một list và có ít nhất 1 phần tử vừa tạo
    assert isinstance(data, list)
    assert len(data) > 0


# =========================================================================
# TEST CASE 3: Lấy chi tiết Giảng viên theo ID (GET /api/admin/lecturers/{id})
# =========================================================================
def test_get_lecturer_by_id():
    global CREATED_LECTURER_ID
    assert CREATED_LECTURER_ID is not None, "Cần chạy test_create_lecturer trước để có ID"
    
    response = client.get(f"/api/admin/lecturers/{CREATED_LECTURER_ID}")
    assert response.status_code == 200
    data = response.json()
    
    assert data["lecturer_id"] == CREATED_LECTURER_ID
    assert data["full_name"] == "Thầy Nguyễn Đình Test"


# =========================================================================
# TEST CASE 4: Cập nhật thông tin Giảng viên (PUT /api/admin/lecturers/{id})
# =========================================================================
def test_update_lecturer():
    global CREATED_LECTURER_ID
    assert CREATED_LECTURER_ID is not None
    
    update_payload = {
        "full_name": "Thầy Nguyễn Đình Test (Đã cập nhật)",
        "academic_title": "TS",
        "teaching_status": "Active"
    }
    
    response = client.put(f"/api/admin/lecturers/{CREATED_LECTURER_ID}", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["full_name"] == "Thầy Nguyễn Đình Test (Đã cập nhật)"
    assert data["academic_title"] == "TS"


# =========================================================================
# TEST CASE 5: Xóa Giảng viên (DELETE /api/admin/lecturers/{id})
# =========================================================================
def test_delete_lecturer():
    global CREATED_LECTURER_ID
    assert CREATED_LECTURER_ID is not None
    
    response = client.delete(f"/api/admin/lecturers/{CREATED_LECTURER_ID}")
    
    # Kiểm tra xóa thành công trả về 204 No Content
    assert response.status_code == 204
    
    # Kiểm tra lại xem đã xóa thực sự chưa (Gọi lại GET phải trả về 404 Not Found)
    check_response = client.get(f"/api/admin/lecturers/{CREATED_LECTURER_ID}")
    assert check_response.status_code == 404
    print(f"\n[SUCCESS] Đã xóa thành công giảng viên: {CREATED_LECTURER_ID}")

if __name__ == "__main__":
    import pytest
    pytest.main(["-s", "-v", __file__])