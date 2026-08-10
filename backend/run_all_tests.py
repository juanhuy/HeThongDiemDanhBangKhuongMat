import sys
import traceback

def main():
    print("========================================")
    print("      RUNNING ALL API TESTS             ")
    print("========================================")

    test_modules = [
        "test_student_api",
        "test_lecturer_api",
        "test_subject_api",
        "test_face_api"
    ]
    
    failed_tests = []
    
    for module_name in test_modules:
        print(f"\n--- Bắt đầu chạy: {module_name} ---")
        try:
            mod = __import__(module_name)
            
            # The test functions might vary in name
            if hasattr(mod, 'run_student_tests'):
                mod.run_student_tests()
            elif hasattr(mod, 'run_lecturer_tests'):
                mod.run_lecturer_tests()
            elif hasattr(mod, 'run_subject_tests'):
                mod.run_subject_tests()
            elif hasattr(mod, 'run_tests'):
                mod.run_tests()
            else:
                print(f"Không tìm thấy hàm chạy test trong {module_name}")
                failed_tests.append(module_name)
                
            print(f"--- Hoàn thành: {module_name} ---")
        except Exception as e:
            print(f"!!! LỖI khi chạy {module_name}: {e}")
            traceback.print_exc()
            failed_tests.append(module_name)
            
    print("\n========================================")
    print("           BÁO CÁO TỔNG KẾT             ")
    print("========================================")
    
    if not failed_tests:
        print("TẤT CẢ CÁC BÀI TEST ĐỀU THÀNH CÔNG (PASS)!")
    else:
        print("CÁC BÀI TEST THẤT BẠI:")
        for failed in failed_tests:
            print(f"- {failed}")
        sys.exit(1)

if __name__ == "__main__":
    main()
