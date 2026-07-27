import requests
import json
import time
import random

BASE_URL = "http://localhost:8000/api/admin/lecturers"

def print_json(data):
    if data:
        print(json.dumps(data, indent=4, ensure_ascii=False))

def wait_for_user(step):
    print(f"\n[!] TẠM DỪNG TẠI BƯỚC: {step}")
    input(">>> Nhấn ENTER để tiếp tục...")

def run_lecturer_tests():
    print("====================================================")
    print("🚀 BẮT ĐẦU KIỂM THỬ API GIẢNG VIÊN (CÓ REPORT TỔNG KẾT)")
    print("====================================================")
    
    # --- BIẾN TRACKING TRẠNG THÁI TEST ---
    passed_cases = []
    failed_cases = []

    def record_test(case_name, condition):
        """Hàm lưu vết trạng thái của từng test case"""
        if condition:
            passed_cases.append(case_name)
            return "✅ THÀNH CÔNG (Pass)"
        else:
            failed_cases.append(case_name)
            return "❌ LỖI (Fail)"

    # Tạo dữ liệu ngẫu nhiên
    timestamp = int(time.time())
    random_suffix = random.randint(1000, 9999)
    
    lecturer_id = f"GV{random_suffix}"
    fake_id = "FAKE_GV_9999"
    email_ngau_nhien = f"gv_{timestamp}_{random_suffix}@ptit.edu.vn"
    name_ngau_nhien = f"Thầy Đình Thuần {random_suffix}"
    
    payload = {
        "lecturer_id": lecturer_id,
        "full_name": name_ngau_nhien,
        "email": email_ngau_nhien,
        "phone_number": f"090{random_suffix}",
        "department": "CNTT"
    }

    # ==========================================
    # THỰC THI CÁC BÀI TEST
    # ==========================================

    # ---------------------------------------------------------
    # TEST CASE 1 & 2: POST - TẠO MỚI
    # ---------------------------------------------------------
    print(f"\n[CASE 1] Tạo mới giảng viên hợp lệ ({lecturer_id})...")
    res = requests.post(f"{BASE_URL}/", json=payload)
    status_msg = record_test("Case 1: Tạo mới giảng viên (201)", res.status_code == 201)
    print(" ->", res.status_code, status_msg)
    if res.status_code == 201:
        print_json(res.json())

    print(f"\n[CASE 2] Tạo lại giảng viên bị trùng mã ({lecturer_id})...")
    res = requests.post(f"{BASE_URL}/", json=payload)
    status_msg = record_test("Case 2: Bắt lỗi trùng mã giảng viên (400)", res.status_code == 400)
    print(" ->", res.status_code, status_msg)

    wait_for_user("Xong Case 1, 2 (Tạo mới). Kiểm tra bảng lecturers và accounts trên DBeaver!")

    # ---------------------------------------------------------
    # TEST CASE 3: GET - LẤY DANH SÁCH & TÌM KIẾM
    # ---------------------------------------------------------
    print("\n[CASE 3.1] Lấy danh sách toàn bộ giảng viên:")
    res = requests.get(f"{BASE_URL}/")
    status_msg = record_test("Case 3.1: Lấy danh sách không điều kiện (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg, f"| Đang có tổng số: {len(res.json()) if res.status_code == 200 else 0} giảng viên")

    print(f"\n[CASE 3.2] Tìm kiếm giảng viên với từ khóa '{lecturer_id}':")
    res = requests.get(f"{BASE_URL}/", params={"search": lecturer_id})
    status_msg = record_test("Case 3.2: Tìm kiếm có kết quả (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg, f"| Tìm thấy: {len(res.json()) if res.status_code == 200 else 0} kết quả")

    wait_for_user("Xong Case 3 (Lấy dữ liệu và Tìm kiếm).")

    # ---------------------------------------------------------
    # TEST CASE 4 & 5: PUT - CẬP NHẬT
    # ---------------------------------------------------------
    print(f"\n[CASE 4] Cập nhật giảng viên {lecturer_id} (Khóa tài khoản)...")
    update_payload = {
        "full_name": f"{name_ngau_nhien} (Đã bị khóa)",
        "is_active": False
    }
    res = requests.put(f"{BASE_URL}/{lecturer_id}", json=update_payload)
    status_msg = record_test("Case 4: Cập nhật giảng viên tồn tại (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg)
    
    print(f"\n[CASE 5] Cập nhật một giảng viên KHÔNG TỒN TẠI ({fake_id})...")
    res = requests.put(f"{BASE_URL}/{fake_id}", json=update_payload)
    status_msg = record_test("Case 5: Bắt lỗi cập nhật giảng viên không tồn tại (404)", res.status_code == 404)
    print(" ->", res.status_code, status_msg)

    wait_for_user("Xong Case 4, 5 (Cập nhật).")

    # ==========================================
    # REPORT TỔNG KẾT
    # ==========================================
    print("\n\n" + "="*55)
    print("📊 BẢNG TỔNG KẾT KẾT QUẢ KIỂM THỬ API GIẢNG VIÊN")
    print("="*55)
    print(f"Tổng số Case đã chạy : {len(passed_cases) + len(failed_cases)}")
    print(f"✅ Pass (Thành công)  : {len(passed_cases)}")
    print(f"❌ Fail (Thất bại)    : {len(failed_cases)}")
    print("-" * 55)

    if passed_cases:
        print("\n✅ CÁC CASE ĐÃ PASS:")
        for case in passed_cases:
            print(f"  ✔️ {case}")

    if failed_cases:
        print("\n❌ CÁC CASE CHƯA PASS (Cần fix code):")
        for case in failed_cases:
            print(f"  ❌ {case}")
    else:
        print("\n🎉 TUYỆT VỜI! Hệ thống API Giảng Viên của bạn hoạt động hoàn hảo!")
        
    print("="*55 + "\n")

if __name__ == "__main__":
    try:
        run_lecturer_tests()
    except requests.exceptions.ConnectionError:
        print("\n❌ LỖI KẾT NỐI: Backend chưa chạy! Hãy đảm bảo đã chạy 'uv run uvicorn...'")
    except Exception as e:
        print(f"\n❌ Lỗi hệ thống không xác định: {e}")