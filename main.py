import os
import cv2 as cv
import sys
from config.settings import settings
from core.face_analysis import FaceAnalyzer
from services.database_service import DatabaseService
from services.attendance_service import AttendanceService
from utils.image_helpers import draw_face_info

def register_new_face(image_path, username, fullname, analyzer, db_service):
    """Đăng ký cả SQLite và trích xuất vector khuôn mặt"""
    print(f"\n-> Bat dau dang ky khuon mat cho: {fullname} ({username})...")
    # 1. Thêm thông tin vào SQLite
    db_success = db_service.add_user(username, fullname)
    if not db_success:
        print("Lỗi: Không thể lưu thông tin vào cơ sở dữ liệu SQLite.")
        return False
        
    # 2. Trích xuất vector và lưu file npy
    ai_success = analyzer.dang_ky_mat(image_path, username)
    if not ai_success:
        print("Lỗi: Không thể đăng ký vector khuôn mặt qua AI.")
        return False
        
    print("-> Dang ky khuon mat hoan tat thanh cong!")
    return True

def run_recognition_system():
    # 1. Khởi tạo dịch vụ
    db_service = DatabaseService()
    attendance_service = AttendanceService(db_service)
    
    print("-> Dang khoi tao mo hinh AI (InsightFace)...")
    analyzer = FaceAnalyzer()
    
    # Tự động quét và đăng ký khuôn mặt mẫu từ thư mục asset cũ của bạn nếu DB trống
    if len(analyzer.known_embeddings) == 0:
        project_root = os.path.dirname(os.path.abspath(__file__))
        demo_image = os.path.join(project_root, 'asset', 'huy1.jpg')
        if os.path.exists(demo_image):
            register_new_face(demo_image, "huy_nguyen", "Nguyễn lê Nhật Huy", analyzer, db_service)
        else:
            print("Cảnh báo: Cơ sở dữ liệu trống và không tìm thấy ảnh mẫu để tự động đăng ký.")
            print("Vui lòng đăng ký ít nhất một khuôn mặt trước khi chạy nhận dạng.")

    # 2. Thiết lập camera từ cấu hình config.yaml
    cam_config = settings.camera
    device_id = cam_config.get("device_id", 0)
    cap = cv.VideoCapture(device_id)
    
    cap.set(cv.CAP_PROP_FRAME_WIDTH, cam_config.get("width", 1280))
    cap.set(cv.CAP_PROP_FRAME_HEIGHT, cam_config.get("height", 720))
    cap.set(cv.CAP_PROP_FPS, cam_config.get("fps", 30))

    if not cap.isOpened():
        print(f"Lỗi: Không thể mở Camera ID {device_id}")
        return

    # 3. Kích hoạt luồng AI chạy ngầm
    analyzer.start_worker()
    print("\n========================================================")
    print("Hệ thống nhận diện đã sẵn sàng!")
    print("- Nhấn 'q' tại màn hình hiển thị để thoát chương trình.")
    print("- Nhấn 'r' để đăng ký khuôn mặt mới từ ảnh có sẵn.")
    print("========================================================\n")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Lỗi: Không nhận được tín hiệu hình ảnh từ camera.")
                break

            # Gửi khung hình hiện tại sang cho luồng AI xử lý
            analyzer.update_frame(frame)

            # Lấy danh sách kết quả AI gần nhất và hiển thị
            current_results = analyzer.results.copy()
            for res in current_results:
                box = res["box"]
                username = res["name"]
                score = res["score"]
                is_known = res["is_known"]

                # Nếu nhận diện thành công, ghi nhận điểm danh (có cooldown chống trùng lặp)
                if is_known:
                    # Ghi nhận điểm danh
                    attendance_service.record_attendance(username, score)
                    
                    # Truy xuất họ tên đầy đủ từ SQLite để hiển thị lên màn hình
                    user_info = db_service.get_user(username)
                    display_name = user_info["fullname"] if user_info else username
                else:
                    display_name = "Unknown"

                # Vẽ bounding box và text
                draw_face_info(frame, box, display_name, score, is_known)

            cv.imshow("He thong Nhan dien Khuon mat & Diem danh", frame)
            
            key = cv.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                # Cho phép đăng ký nhanh qua dòng lệnh
                cap.release()
                cv.destroyAllWindows()
                analyzer.stop_worker()
                
                print("\n--- ĐĂNG KÝ THÀNH VIÊN MỚI ---")
                img_p = input("Nhập đường dẫn ảnh chân dung (VD: C:\\anh.jpg): ").strip()
                uname = input("Nhập tên đăng nhập viết liền không dấu (VD: nguyen_a): ").strip()
                fname = input("Nhập họ và tên đầy đủ (VD: Nguyễn Văn A): ").strip()
                
                if os.path.exists(img_p):
                    register_new_face(img_p, uname, fname, analyzer, db_service)
                else:
                    print("Lỗi: File ảnh không tồn tại. Quay lại màn hình chính.")
                
                # Khởi động lại hệ thống
                cap = cv.VideoCapture(device_id)
                cap.set(cv.CAP_PROP_FRAME_WIDTH, cam_config.get("width", 1280))
                cap.set(cv.CAP_PROP_FRAME_HEIGHT, cam_config.get("height", 720))
                analyzer.start_worker()

    finally:
        # Tắt camera và dọn dẹp tài nguyên
        analyzer.stop_worker()
        cap.release()
        cv.destroyAllWindows()
        print("Đã tắt hệ thống nhận dạng.")

if __name__ == "__main__":
    run_recognition_system()
