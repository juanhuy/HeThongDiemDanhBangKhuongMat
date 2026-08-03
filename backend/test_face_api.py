import requests
import io

STUDENT_URL = "http://localhost:8000/api/admin/students"
FACE_URL = "http://localhost:8000/api"
TEST_STUDENT_ID = "N22DCCN160"

def run_tests():
    print("=== BẮT ĐẦU KIỂM THỬ API FACE DATA ===")
    
    # 1. Đảm bảo sinh viên N22DCCN160 tồn tại
    print("\n1. Đang kiểm tra/Tạo sinh viên test...")
    student_payload = {
        "student_id": TEST_STUDENT_ID,
        "full_name": "Phạm Văn Phú",
        "email": f"{TEST_STUDENT_ID}@test.com"
    }
    res = requests.post(STUDENT_URL + "/", json=student_payload)
    if res.status_code in [201, 400]: # 201 là tạo mới, 400 là đã tồn tại (đều OK)
        print(" -> Sinh viên đã sẵn sàng.")

    # 2. Test API Upload Ảnh (POST /faces)
    print("\n2. Test Upload Ảnh (Tạo Vector)...")
    # Tạo một file ảnh giả lập trên RAM
    fake_image_file = io.BytesIO(b"Day la du lieu bytes cua mot buc anh PNG/JPEG")
    files = {"file": ("test_avatar.jpg", fake_image_file, "image/jpeg")}
    
    res = requests.post(f"{FACE_URL}/{TEST_STUDENT_ID}/faces", files=files)
    assert res.status_code == 201, f"Lỗi Upload: {res.text}"
    print(" -> PASS: Đã upload và lưu Vector thành công! Trả về:", res.json())

    # 3. Test API Get Face Status (GET /faces)
    print("\n3. Test Kiểm tra trạng thái dữ liệu khuôn mặt...")
    res = requests.get(f"{FACE_URL}/{TEST_STUDENT_ID}/faces")
    assert res.status_code == 200, "Lỗi Get Status"
    data = res.json()
    assert data["has_face_data"] is True, "Logic sai: Đã upload mà báo chưa có"
    print(f" -> PASS: Xác nhận sinh viên {TEST_STUDENT_ID} CÓ dữ liệu khuôn mặt (has_face_data=True).")

    # 4. Test API Delete (Reset) (DELETE /faces)
    print("\n4. Test Reset dữ liệu khuôn mặt...")
    res = requests.delete(f"{FACE_URL}/{TEST_STUDENT_ID}/faces")
    assert res.status_code == 204, f"Lỗi Reset: {res.text}"
    print(" -> PASS: Xóa (Reset) thành công!")

    # 5. Xác nhận lại bằng API Get Face Status
    res = requests.get(f"{FACE_URL}/{TEST_STUDENT_ID}/faces")
    assert res.json()["has_face_data"] is False, "Logic sai: Đã xóa mà vẫn báo có"
    print(" -> PASS: Xác nhận sinh viên đã về trạng thái CHƯA CÓ ảnh (has_face_data=False).")
    
    print("\n=== HOÀN TẤT TẤT CẢ TEST CASES THÀNH CÔNG TỐT ĐẸP! ===")

if __name__ == "__main__":
    # Yêu cầu cài requests: uv pip install requests
    run_tests()