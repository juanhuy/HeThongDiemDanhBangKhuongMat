import requests
import json
import time

BASE_URL = "http://localhost:8000/api/subjects"

def print_json(data):
    if data:
        print(json.dumps(data, indent=4, ensure_ascii=False))

def wait_for_user(step):
    print(f"\n[!] TẠM DỪNG TẠI BƯỚC: {step}")
    pass

def run_subject_tests():
    print("====================================================")
    print("🚀 BẮT ĐẦU KIỂM THỬ API MÔN HỌC (CÓ REPORT TỔNG KẾT)")
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
            
    # Dùng timestamp để tạo subject_id ngẫu nhiên, giúp bạn có thể chạy file test 
    # nhiều lần liên tiếp mà không cần vào DB xóa dữ liệu cũ
    subject_id = f"IT_{int(time.time())}"
    fake_id = "FAKE_MON_HOC_9999"
    payload = {
        "subject_id": subject_id,
        "subject_name": "Lập trình Python Cơ Bản",
        "credits": 3,
        "is_active": True
    }

    # ==========================================
    # THỰC THI CÁC BÀI TEST
    # ==========================================

    # ---------------------------------------------------------
    # TEST CASE 1 & 2: POST - TẠO MỚI
    # ---------------------------------------------------------
    print(f"\n[CASE 1] Tạo mới môn học hợp lệ ({subject_id})...")
    res = requests.post(f"{BASE_URL}/", json=payload)
    status_msg = record_test("Case 1: Tạo mới môn học (200/201)", res.status_code in [200, 201])
    print(" ->", res.status_code, status_msg)
    if res.status_code in [200, 201]:
        print_json(res.json())

    print(f"\n[CASE 2] Tạo lại môn học bị trùng mã ({subject_id})...")
    res = requests.post(f"{BASE_URL}/", json=payload)
    status_msg = record_test("Case 2: Bắt lỗi trùng mã môn học (400)", res.status_code == 400)
    print(" ->", res.status_code, status_msg)

    wait_for_user("Xong Case 1, 2 (Tạo mới). Kiểm tra DB để xác nhận!")

    # ---------------------------------------------------------
    # TEST CASE 3, 4, 5: GET - LẤY DANH SÁCH & TÌM KIẾM
    # ---------------------------------------------------------
    print("\n[CASE 3] Lấy danh sách toàn bộ môn học:")
    res = requests.get(f"{BASE_URL}/")
    status_msg = record_test("Case 3: Lấy danh sách không điều kiện (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg, f"| Đang có tổng số: {len(res.json()) if res.status_code == 200 else 0} môn học")

    print("\n[CASE 4] Tìm kiếm môn học với từ khóa 'Python':")
    res = requests.get(f"{BASE_URL}/", params={"query": "Python"})
    status_msg = record_test("Case 4: Tìm kiếm có kết quả (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg, f"| Tìm thấy: {len(res.json()) if res.status_code == 200 else 0} kết quả")

    print("\n[CASE 5] Tìm kiếm với từ khóa lạ 'XamLinhTinh123':")
    res = requests.get(f"{BASE_URL}/", params={"query": "XamLinhTinh123"})
    status_msg = record_test("Case 5: Tìm kiếm không có kết quả trả về mảng rỗng (200)", res.status_code == 200 and len(res.json()) == 0)
    print(" ->", res.status_code, status_msg)

    wait_for_user("Xong Case 3, 4, 5 (Get và Search).")

    # ---------------------------------------------------------
    # TEST CASE 6 & 7: PUT - CẬP NHẬT
    # ---------------------------------------------------------
    print(f"\n[CASE 6] Cập nhật môn học {subject_id} (Khai tử & Tăng tín chỉ)...")
    update_payload = {
        "subject_name": "Lập trình Python (Đã Khai Tử)", 
        "credits": 4, 
        "is_active": False
    }
    res = requests.put(f"{BASE_URL}/{subject_id}", json=update_payload)
    status_msg = record_test("Case 6: Cập nhật môn học tồn tại (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg)
    
    print(f"\n[CASE 7] Cập nhật một môn học KHÔNG TỒN TẠI ({fake_id})...")
    res = requests.put(f"{BASE_URL}/{fake_id}", json=update_payload)
    status_msg = record_test("Case 7: Bắt lỗi cập nhật môn học không tồn tại (404)", res.status_code == 404)
    print(" ->", res.status_code, status_msg)

    wait_for_user("Xong Case 6, 7 (Cập nhật).")

    # ==========================================
    # REPORT TỔNG KẾT
    # ==========================================
    print("\n\n" + "="*55)
    print("📊 BẢNG TỔNG KẾT KẾT QUẢ KIỂM THỬ API MÔN HỌC")
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
        print("\n🎉 TUYỆT VỜI! Hệ thống API Môn Học của bạn không có lỗi nào!")
        
    print("="*55 + "\n")

if __name__ == "__main__":
    try:
        run_subject_tests()
    except requests.exceptions.ConnectionError:
        print("\n❌ LỖI KẾT NỐI: Backend chưa chạy! Hãy đảm bảo đã chạy 'uv run uvicorn...'")
    except Exception as e:
        print(f"\n❌ Lỗi hệ thống không xác định: {e}")