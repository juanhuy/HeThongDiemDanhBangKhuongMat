import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from fastapi import FastAPI
import sys
import os

# Đảm bảo Python nhận diện được thư mục gốc backend
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Import file API của bạn
from app.api.endpoints.api_credit_classes import router 
from app.db.session import get_db

# Khởi tạo app FastAPI mô phỏng
app = FastAPI()
app.include_router(router)

# ==========================================
# 1. FIXTURE & MOCK DATABASE SETUP (BẮT BUỘC PHẢI CÓ)
# ==========================================
@pytest.fixture
def mock_db():
    """Tạo Mock Session cho SQLAlchemy"""
    return MagicMock()

@pytest.fixture
def client(mock_db):
    """Ghi đè dependency get_db bằng mock_db và sinh ra TestClient"""
    def override_get_db():
        yield mock_db
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ==========================================
# 2. TEST CASES: TẠO LỚP TÍN CHỈ MỚI
# ==========================================
def test_add_credit_class_success(client, mock_db):
    """Test API tạo lớp tín chỉ thành công (Pass)"""
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        MagicMock(subject_id="INT1339"), # Pass check Môn học
        MagicMock(lecturer_id="GV01"),   # Pass check Giảng viên
        None                             # Pass check trùng class_id
    ]
    
    payload = {
        "subject_id": "INT1339",
        "lecturer_id": "GV01",
        "semester_id": "HK1_2025",
        "class_type": "Theory",
        "start_week": 1,
        "end_week": 15,
        "max_students": 60,
        "status": "Planning",
        "class_group": "01"
    }
    response = client.post("/lop_tin_chi", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert "Tạo lớp tín chỉ thành công" in data["message"]
    assert "class_id" in data["data"] 

def test_add_credit_class_missing_subject(client, mock_db):
    """Test API tạo lớp tín chỉ thất bại do Môn học không tồn tại (Fail 404)"""
    mock_db.query.return_value.filter.return_value.first.side_effect = [None]
    
    payload = {
        "subject_id": "INVALID_SUB",
        "lecturer_id": "GV01",
        "semester_id": "HK1_2025",
        "class_type": "Theory",
        "start_week": 1,
        "end_week": 15,
        "max_students": 60,
        "status": "Planning"
    }
    response = client.post("/lop_tin_chi", json=payload)
    
    assert response.status_code == 404
    assert "Không tìm thấy môn học" in response.json()["detail"]

def test_add_credit_class_missing_lecturer(client, mock_db):
    """Test API tạo lớp tín chỉ thất bại do Giảng viên không tồn tại (Fail 404)"""
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        MagicMock(subject_id="INT1339"), 
        None
    ]
    
    payload = {
        "subject_id": "INT1339",
        "lecturer_id": "INVALID_GV",
        "semester_id": "HK1_2025",
        "class_type": "Theory",
        "start_week": 1,
        "end_week": 15,
        "max_students": 60,
        "status": "Planning"
    }
    response = client.post("/lop_tin_chi", json=payload)
    
    assert response.status_code == 404
    assert "Không tìm thấy giảng viên" in response.json()["detail"]


# ==========================================
# 3. TEST CASES: LẤY DANH SÁCH LỚP TÍN CHỈ
# ==========================================
def test_get_credit_classes_no_filter(client, mock_db):
    """Test API lấy toàn bộ danh sách lớp tín chỉ (không dùng param filter)"""
    mock_class = MagicMock()
    mock_class.class_id = "INT1339_HK1_ABCDEF"
    mock_class.parent_class_id = None
    mock_class.subject_id = "INT1339"
    mock_class.lecturer_id = "GV01"
    mock_class.semester_id = "HK1_2025"
    mock_class.class_group = "01"
    mock_class.class_type = "Theory"
    mock_class.start_week = 1
    mock_class.end_week = 15
    mock_class.max_students = 60
    mock_class.current_students = 20
    mock_class.status = "Active"
    
    mock_target = MagicMock()
    mock_target.administrative_class_id = "D22CQCNMT01-N"
    mock_class.target_audiences = [mock_target]

    query_mock = mock_db.query.return_value
    query_mock.options.return_value = query_mock
    query_mock.filter.return_value = query_mock
    query_mock.join.return_value = query_mock
    query_mock.unique.return_value = query_mock
    query_mock.all.return_value = [mock_class] 
    
    response = client.get("/lop_tin_chi")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total"] == 1
    assert len(data["data"]) == 1
    
    item = data["data"][0]
    assert item["class_id"] == "INT1339_HK1_ABCDEF"
    assert "D22CQCNMT01-N" in item["target_classes"]

def test_get_credit_classes_with_filters(client, mock_db):
    """Test API lấy danh sách lớp tín chỉ CÓ kèm query parameters"""
    query_mock = mock_db.query.return_value
    query_mock.options.return_value = query_mock
    query_mock.filter.return_value = query_mock
    query_mock.join.return_value = query_mock
    query_mock.unique.return_value = query_mock
    query_mock.all.return_value = [] 
    
    response = client.get("/lop_tin_chi?semester_id=HK1_2025&subject_id=INT1339&status=Active")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total"] == 0
    assert data["data"] == []