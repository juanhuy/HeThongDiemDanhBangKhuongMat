import pytest
from fastapi.testclient import TestClient

# Import app từ file main của bạn (Sửa lại đường dẫn 'app.main' cho đúng với project của bạn)
from app.main import app 

# Khởi tạo TestClient
client = TestClient(app)

# =========================================================================
# TEST CASE 1: Tạo mới một môn học
# =========================================================================
def test_create_subject():
    payload = {
        "subject_id": "TEST101",
        "subject_name": "Môn học Test Tự động",
        "theory_credits": 2,
        "practical_credits": 1,
        "faculty_id": "FIT2",  # Giả sử Khoa FIT2 đã có sẵn trong Database
        "is_active": True
    }
    
    # Gọi API POST
    response = client.post("/api/subjects/", json=payload)
    
    # Nếu bị trùng do đã test trước đó thì bỏ qua, còn không thì phải trả về 201 Created
    if response.status_code == 400 and "đã tồn tại" in response.text:
        pass
    else:
        assert response.status_code == 201
        data = response.json()
        assert data["subject_id"] == "TEST101"
        assert data["theory_credits"] == 2


# =========================================================================
# TEST CASE 2: Lấy chi tiết Môn học (Kiểm tra xem có trả về Tên Khoa không)
# =========================================================================
def test_get_subject_by_id():
    # Gọi API GET
    response = client.get("/api/subjects/TEST101")
    
    # Kiểm tra status code phải là 200 OK
    assert response.status_code == 200
    
    data = response.json()
    
    # 1. Kiểm tra các trường cơ bản
    assert data["subject_id"] == "TEST101"
    
    # 2. KIỂM TRA QUAN TRỌNG NHẤT: Đảm bảo object 'faculty' có tồn tại trong JSON
    assert "faculty" in data
    
    # 3. Đảm bảo tên khoa được fetch thành công từ Database
    if data["faculty_id"] is not None:
        assert data["faculty"] is not None
        assert "faculty_name" in data["faculty"]
        assert data["faculty"]["faculty_id"] == "FIT2"
        print("\n[SUCCESS] API trả về Tên Khoa:", data["faculty"]["faculty_name"])


# =========================================================================
# TEST CASE 3: Lấy danh sách Môn học (Kiểm tra Lazy Loading / JOIN)
# =========================================================================
def test_get_all_subjects():
    response = client.get("/api/subjects/")
    assert response.status_code == 200
    
    data = response.json()
    
    # Xử lý trường hợp trả về List hoặc Dict (Paginated)
    items = data.get("items") if isinstance(data, dict) else data
    
    assert len(items) > 0
    
    # Lấy thử môn học đầu tiên để kiểm tra
    first_subject = items[0]
    
    # Đảm bảo rẳng khi gọi list (nhiều môn học), relationship vẫn hoạt động tốt
    if first_subject.get("faculty_id"):
        assert "faculty" in first_subject
        assert isinstance(first_subject["faculty"], dict)
        assert "faculty_name" in first_subject["faculty"]


# Thêm vào cuối file test_api_subjects.py
if __name__ == "__main__":
    import pytest
    pytest.main(["-s", "-v", __file__])