from app.api.endpoints import api_admin_lecturers
import requests
import json
import time
import random

BASE_URL = "http://localhost:8000/api/admin/lecturers"

def print_json(data):
    print(json.dumps(data, indent=4, ensure_ascii=False))

def wait_for_user(step_name):
    print(f"\n--- TẠM DỪNG: {step_name} ---")
    input("Nhấn ENTER để chạy tiếp và quan sát trên DBeaver...")

def run_lecturer_tests():
    print("=== BẮT ĐẦU TEST GIẢNG VIÊN (Dữ liệu ngẫu nhiên) ===")
    
    # --- PHẦN QUAN TRỌNG: Tạo thông tin ngẫu nhiên mỗi lần chạy ---
    timestamp = int(time.time())
    random_suffix = random.randint(1000, 9999)
    
    # Chúng ta không cần ID vì server tự sinh, nhưng email thì cần unique
    lecture_id_ngau_nhien = f"GV00{random_suffix}"
    email_ngau_nhien = f"gv_{timestamp}_{random_suffix}@ptit.edu.vn"
    name_ngau_nhien = f"Thầy Nguyễn Văn {random_suffix}"
    
    payload = {
        "lecturer_id": lecture_id_ngau_nhien,
        "full_name": name_ngau_nhien,
        "email": email_ngau_nhien,
        "phone_number": f"090{random_suffix}",
        "department": "CNTT"
    }
    # -------------------------------------------------------------

    # 1. Test Tạo giảng viên
    print(f"\n1. Đang tạo giảng viên với email: {email_ngau_nhien}...")
    res = requests.post(f"{BASE_URL}/", json=payload)
    
    if res.status_code == 201:
        data = res.json()
        print(" -> THÀNH CÔNG! Giảng viên vừa tạo:")
        print_json(data)
        wait_for_user("Sau khi tạo giảng viên (Kiểm tra ID vừa tạo trên DBeaver)")
        
        # Lấy ID mà server vừa tạo để dùng cho các bước sau
        created_id = data["lecturer_id"]
    else:
        assert False, f"Lỗi tạo: {res.text}"

    # 2. Test Lấy danh sách
    print("\n2. Kiểm tra danh sách giảng viên:")
    res = requests.get(f"{BASE_URL}/")
    if any(item["lecturer_id"] == created_id for item in res.json()):
        print(f" -> THÀNH CÔNG! Tìm thấy giảng viên {created_id} trong danh sách.")
        wait_for_user("Sau khi lấy danh sách")
    else:
        assert False, "Không tìm thấy giảng viên vừa tạo!"

    # 3. Test Khóa tài khoản
    print(f"\n3. Thực hiện khóa tài khoản giảng viên {created_id}...")
    update_payload = {
        "full_name": f"{name_ngau_nhien} (Đã bị khóa)",
        "is_active": False
    }
    res = requests.put(f"{BASE_URL}/{created_id}", json=update_payload)
    
    if res.status_code == 200:
        print(" -> THÀNH CÔNG! Thông tin sau khi khóa:")
        print_json(res.json())
        wait_for_user("Sau khi khóa (Kiểm tra cột 'is_active' trong bảng accounts)")
    else:
        assert False, f"Lỗi cập nhật: {res.text}"

    print("\n=== HOÀN TẤT KIỂM THỬ ===")

if __name__ == "__main__":
    try:
        run_lecturer_tests()
    except Exception as e:
        print(f"\n❌ Bài test thất bại: {e}")