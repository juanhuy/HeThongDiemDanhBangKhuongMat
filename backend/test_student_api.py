import requests
import json
import random

BASE_URL = "http://localhost:8000/api/admin/students"

def print_json(data):
    print(json.dumps(data, indent=4, ensure_ascii=False))

def wait_for_user(step):
    print(f"\n[!] TẠM DỪNG TẠI BƯỚC: {step}")
    input(">>> Nhấn ENTER để tiếp tục...")

def run_student_tests():
    print("=== BẮT ĐẦU TEST SINH VIÊN (Chế độ Step-by-Step) ===")
    
    # Tạo dữ liệu ngẫu nhiên
    suffix = random.randint(1000, 9999)
    student_id = f"N22DCCN{suffix}"
    payload = {
        "student_id": student_id,
        "full_name": f"Sinh Viên {suffix}",
        "email": f"sv{suffix}@ptit.edu.vn",
        "administrative_class": "D22CQCNMT01-N",
        "major": "CNTT"
    }

    # 1. POST (Tạo mới)
    print(f"\n1. Đang tạo SV: {student_id}...")
    res = requests.post(f"{BASE_URL}/", json=payload)
    if res.status_code == 201:
        print(" -> THÀNH CÔNG!")
        print_json(res.json())
        wait_for_user("Sau khi tạo mới (Kiểm tra bảng students và accounts)")
    
    # 2. GET All
    print("\n2. Kiểm tra danh sách:")
    res = requests.get(f"{BASE_URL}/")
    print(f" -> Tổng số sinh viên hiện có: {len(res.json())}")
    wait_for_user("Sau khi lấy danh sách")

    # 3. GET Detail
    print(f"\n3. Xem chi tiết SV {student_id}:")
    res = requests.get(f"{BASE_URL}/{student_id}")
    print_json(res.json())
    wait_for_user("Sau khi xem chi tiết")

    # 4. PUT (Cập nhật)
    print(f"\n4. Cập nhật trạng thái thành 'graduated':")
    update_payload = {"academic_status": "graduated"}
    res = requests.put(f"{BASE_URL}/{student_id}", json=update_payload)
    print_json(res.json())
    wait_for_user("Sau khi update trạng thái (Kiểm tra xem 'is_active' trong accounts đã đổi chưa)")

    # 5. Export
    print("\n5. Test Xuất file Excel:")
    res = requests.get(f"{BASE_URL}/export")
    if res.status_code == 200:
        with open("test_export.xlsx", "wb") as f:
            f.write(res.content)
        print(" -> THÀNH CÔNG! Đã lưu file 'test_export.xlsx'.")
    wait_for_user("Sau khi export dữ liệu")
    
    print("\n=== HOÀN TẤT KIỂM THỬ SINH VIÊN ===")

if __name__ == "__main__":
    try:
        run_student_tests()
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")