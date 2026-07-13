import requests
import json
import time

BASE_URL = "http://localhost:8000/api/subjects"

def print_json(data):
    print(json.dumps(data, indent=4, ensure_ascii=False))

def wait_for_user(step):
    print(f"\n[!] TẠM DỪNG TẠI BƯỚC: {step}")
    input(">>> Nhấn ENTER để tiếp tục...")

def run_subject_tests():
    print("=== BẮT ĐẦU TEST MÔN HỌC (Step-by-Step) ===")
    
    # Dữ liệu thử nghiệm
    subject_id = "IT101"
    payload = {
        "subject_id": subject_id,
        "subject_name": "Lập trình Python",
        "credits": 3,
        "is_active": True
    }

    # 1. POST (Tạo mới)
    print(f"\n1. Đang tạo môn học: {subject_id}...")
    res = requests.post(f"{BASE_URL}/", json=payload)
    if res.status_code == 201:
        print(" -> THÀNH CÔNG!")
        print_json(res.json())
        wait_for_user("Sau khi tạo môn học (Kiểm tra trong DBeaver bảng 'subjects')")
    else:
        print(f" -> LỖI: {res.status_code} - {res.text}")

    # 2. GET (Lấy danh sách)
    print("\n2. Kiểm tra danh sách môn học:")
    res = requests.get(f"{BASE_URL}/")
    print(f" -> Tổng số môn học: {len(res.json())}")
    wait_for_user("Sau khi lấy danh sách")

    # 3. PUT (Cập nhật - Khai tử môn học)
    print(f"\n3. Cập nhật trạng thái môn {subject_id} thành 'is_active: False' (Khai tử):")
    update_payload = {"subject_name": "Lập trình Python (Ngừng dạy)", "is_active": False}
    res = requests.put(f"{BASE_URL}/{subject_id}", json=update_payload)
    
    if res.status_code == 200:
        print(" -> CẬP NHẬT THÀNH CÔNG!")
        print_json(res.json())
    else:
        print(f" -> LỖI: {res.status_code} - {res.text}")
    
    wait_for_user("Sau khi cập nhật trạng thái (Kiểm tra cột 'is_active' trong DBeaver)")

    print("\n=== HOÀN TẤT KIỂM THỬ MÔN HỌC ===")

if __name__ == "__main__":
    try:
        run_subject_tests()
    except Exception as e:
        print(f"\n❌ Lỗi hệ thống: {e}")