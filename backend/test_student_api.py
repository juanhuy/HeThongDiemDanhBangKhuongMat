import requests
import json
import random
import os
import pandas as pd
import io

BASE_URL = "http://localhost:8000/api/admin/students"

def print_json(data):
    if data:
        print(json.dumps(data, indent=4, ensure_ascii=False))

def wait_for_user(step):
    print(f"\n[!] TẠM DỪNG TẠI BƯỚC: {step}")
    pass

def run_student_tests():
    print("====================================================")
    print("🚀 BẮT ĐẦU KIỂM THỬ API SINH VIÊN (CÓ REPORT TỔNG KẾT)")
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
    suffix = random.randint(1000, 9999)
    student_id = f"N22DCCN{suffix}"
    fake_id = "N99XXXX9999"
    payload = {
        "student_id": student_id,
        "full_name": f"Sinh Viên {suffix}",
        "email": f"sv{suffix}@ptit.edu.vn",
        "administrative_class": "D22CQCNMT01-N",
        "major": "CNTT"
    }

    # ==========================================
    # THỰC THI CÁC BÀI TEST
    # ==========================================
    
    # [CASE 1, 2] POST - Tạo mới
    print(f"\n[CASE 1] Tạo mới sinh viên hợp lệ ({student_id})...")
    res = requests.post(f"{BASE_URL}/", json=payload)
    status_msg = record_test("Case 1: Tạo mới hợp lệ (201)", res.status_code == 201)
    print(" ->", res.status_code, status_msg)

    print(f"\n[CASE 2] Tạo lại sinh viên bị trùng mã ({student_id})...")
    res = requests.post(f"{BASE_URL}/", json=payload)
    status_msg = record_test("Case 2: Bắt lỗi trùng mã (400)", res.status_code == 400)
    print(" ->", res.status_code, status_msg)
    
    wait_for_user("Xong Case Tạo Mới")

    # [CASE 3] GET - Lấy danh sách & Phân trang
    print("\n[CASE 3.1] Lấy danh sách toàn bộ sinh viên:")
    res = requests.get(f"{BASE_URL}/")
    status_msg = record_test("Case 3.1: Lấy toàn bộ danh sách (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg)

    print(f"\n[CASE 3.2] Tìm kiếm sinh viên với từ khóa '{student_id}':")
    res = requests.get(f"{BASE_URL}/", params={"search": student_id})
    status_msg = record_test("Case 3.2: Tìm kiếm theo tên/MSSV (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg)

    print("\n[CASE 3.3] Lọc sinh viên theo trạng thái 'Đang học':")
    res = requests.get(f"{BASE_URL}/", params={"status": "Đang học"})
    status_msg = record_test("Case 3.3: Lọc theo trạng thái (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg)

    wait_for_user("Xong Case Lấy dữ liệu & Tìm kiếm")

    # [CASE 4, 5] GET - Xem chi tiết
    print(f"\n[CASE 4] Xem chi tiết sinh viên ({student_id}):")
    res = requests.get(f"{BASE_URL}/{student_id}")
    status_msg = record_test("Case 4: Xem chi tiết SV tồn tại (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg)

    print(f"\n[CASE 5] Xem chi tiết sinh viên KHÔNG TỒN TẠI ({fake_id}):")
    res = requests.get(f"{BASE_URL}/{fake_id}")
    status_msg = record_test("Case 5: Bắt lỗi xem chi tiết SV không tồn tại (404)", res.status_code == 404)
    print(" ->", res.status_code, status_msg)

    # [CASE 6, 7] PUT - Cập nhật
    print(f"\n[CASE 6] Cập nhật sinh viên {student_id}...")
    res = requests.put(f"{BASE_URL}/{student_id}", json={"academic_status": "graduated"})
    status_msg = record_test("Case 6: Cập nhật SV tồn tại (200)", res.status_code == 200)
    print(" ->", res.status_code, status_msg)

    print(f"\n[CASE 7] Cập nhật sinh viên KHÔNG TỒN TẠI ({fake_id})...")
    res = requests.put(f"{BASE_URL}/{fake_id}", json={"academic_status": "graduated"})
    status_msg = record_test("Case 7: Bắt lỗi cập nhật SV không tồn tại (404)", res.status_code == 404)
    print(" ->", res.status_code, status_msg)

    wait_for_user("Xong Case Chi tiết & Cập nhật")

    # [CASE 10] GET - Export
    print("\n[CASE 10] Test Xuất file Excel (Export)...")
    res = requests.get(f"{BASE_URL}/export/excel")
    if res.status_code == 200:
        with open("test_export.xlsx", "wb") as f:
            f.write(res.content)
        status_msg = record_test("Case 10: Xuất file Excel thành công (200)", True)
    else:
        status_msg = record_test("Case 10: Xuất file Excel thành công (200)", False)
    print(" ->", res.status_code, status_msg)

    # [CASE 11] POST - Import hợp lệ
    print("\n[CASE 11] Test Nhập file (Import Excel) hợp lệ...")
    df_import = pd.DataFrame({
        "MSSV": [f"N22DCCN{suffix+1}", f"N22DCCN{suffix+2}"],
        "Họ và Tên": ["Test Import 1", "Test Import 2"],
        "Email": [f"imp1_{suffix}@ptit.edu.vn", f"imp2_{suffix}@ptit.edu.vn"],
        "Số điện thoại": ["0123456789", "0987654321"],
        "Lớp hành chính": ["D22CQCNMT01-N", "D22CQCNMT01-N"]
    })
    
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine='openpyxl') as writer:
        df_import.to_excel(writer, index=False)
    stream.seek(0)

    files = {"file": ("test_import.xlsx", stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res = requests.post(f"{BASE_URL}/import/excel", files=files)
    status_msg = record_test("Case 11: Import file Excel hợp lệ (201)", res.status_code in [200, 201])
    print(" ->", res.status_code, status_msg)

    # [CASE 12] POST - Import sai định dạng
    print("\n[CASE 12] Test Nhập file sai định dạng (VD: file .txt)...")
    files_invalid = {"file": ("dummy.txt", b"Khong phai excel", "text/plain")}
    res = requests.post(f"{BASE_URL}/import/excel", files=files_invalid)
    status_msg = record_test("Case 12: Bắt lỗi Import file sai định dạng (400)", res.status_code == 400)
    print(" ->", res.status_code, status_msg)

    wait_for_user("Xong Import & Export")

    # ==========================================
    # REPORT TỔNG KẾT
    # ==========================================
    print("\n\n" + "="*55)
    print("📊 BẢNG TỔNG KẾT KẾT QUẢ KIỂM THỬ API")
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
        print("\n🎉 TUYỆT VỜI! Hệ thống của bạn không có lỗi nào!")
        
    print("="*55 + "\n")

if __name__ == "__main__":
    try:
        run_student_tests()
    except requests.exceptions.ConnectionError:
        print("\n❌ LỖI KẾT NỐI: Backend chưa chạy! Hãy đảm bảo đã chạy 'uv run uvicorn...'")
    except Exception as e:
        print(f"\n❌ Lỗi hệ thống không xác định: {e}")