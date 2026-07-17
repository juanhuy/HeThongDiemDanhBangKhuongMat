import cv2 as cv
import numpy as np  
import insightface
from insightface.app import FaceAnalysis
import os
import threading
import sys
import time
venv_path = os.path.join(os.path.dirname(__file__), 'venv', 'Lib', 'site-packages')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cublas', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cudnn', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'onnxruntime', 'capi')
class Nhandien:
    def __init__(self, db_path="./face_database"):
        self.db_path = db_path
        if not os.path.exists(self.db_path):
            os.makedirs(self.db_path)
     
        self.app = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
        self.app.prepare(ctx_id=0, det_size=(480, 480)) # Hạ det_size xuống 480x480 giúp AI chạy nhanh hơn nữa
        
        # Kiểm tra xem ONNX thực sự có nhận được GPU (CUDA) của bạn không
        try:
            print(f"➔ Hệ thống AI thực tế đang chạy bằng: {self.app.backend.get_provider()}")
        except:
            print("➔ Đang kiểm tra cấu hình phần cứng...")
        
        self.known_embeddings = []
        self.known_names = []
        self.load_database()
        self.threshold = 0.65
        
        # Các biến phục vụ cho luồng chạy song song
        self.current_frame = None  # Lưu khung hình mới nhất từ camera
        self.running = False       # Trạng thái hoạt động của luồng AI
        self.results = []          # Lưu kết quả AI tính toán được (box, name)
        
        # CƠ CHẾ CHỐNG NGHẼN CPU: Sử dụng Event thay vì vòng lặp check liên tục
        self.frame_ready_event = threading.Event()
        
    def load_database(self):
        self.known_embeddings = []
        self.known_names = []
        for file_name in os.listdir(self.db_path):
            if file_name.endswith(".npy"):
                name = os.path.splitext(file_name)[0]
                embedding = np.load(os.path.join(self.db_path, file_name))
                self.known_embeddings.append(embedding)
                self.known_names.append(name)
        print(f"➔ Đã tải {len(self.known_names)} khuôn mặt từ database.")

    def dangkymat(self, image_path, name):
        img = cv.imread(image_path)
        if img is None:
            print(f"Không thể đọc được ảnh tại đường dẫn: {image_path}")
            return False
            
        faces = self.app.get(img)
        if len(faces) == 0:
            print("Không tìm thấy khuôn mặt trong ảnh.")
            return False
        elif len(faces) > 1:
            print("Có nhiều hơn một khuôn mặt trong ảnh. Vui lòng sử dụng ảnh chỉ có một khuôn mặt.")
            return False
            
        embedding = faces[0].normed_embedding
        np.save(os.path.join(self.db_path, f"{name}.npy"), embedding)
        print(f"Đăng ký thành công khuôn mặt cho {name}")
        self.load_database()
        return True

    def _ai_worker(self):
        while self.running:
            # Luồng AI sẽ ngủ hoàn toàn tại đây, giải phóng 100% CPU. 
            # Chỉ thức dậy khi có tín hiệu hiệu frame_ready_event từ luồng chính (Timeout 1 giây để tránh kẹt)
            if not self.frame_ready_event.wait(timeout=1.0):
                continue
                
            self.frame_ready_event.clear() # Đặt lại trạng thái chờ cho lượt tiếp theo
            
            if self.current_frame is None:
                continue
            
            # Tạo một bản sao và resize nhỏ lại để AI xử lý siêu tốc (giảm tải cho GPU/CPU)
            frame_to_process = self.current_frame.copy()
            small_frame = cv.resize(frame_to_process, (480, 480))
            
            # Tính toán tỷ lệ chênh lệch kích thước để vẽ box trên khung hình gốc cho chuẩn
            scale_x = frame_to_process.shape[1] / 480.0
            scale_y = frame_to_process.shape[0] / 480.0
            
            faces = self.app.get(small_frame)
            
            temp_results = []
            for face in faces:
                bbox = face.bbox
                # Tính lại toạ độ dựa trên tỷ lệ scale ban nãy
                x1, y1 = int(bbox[0] * scale_x), int(bbox[1] * scale_y)
                x2, y2 = int(bbox[2] * scale_x), int(bbox[3] * scale_y)
                
                current_embedding = face.normed_embedding
                score = np.dot(self.known_embeddings, current_embedding)
                best_match_idx = np.argmax(score)
                best_score = score[best_match_idx]
                
                if best_score > self.threshold:
                    raw_name = self.known_names[best_match_idx]
                    # Nếu tên có dạng 'Tên_GócMặt' thì chỉ lấy phần 'Tên'
                    name = raw_name.split("_")[0] if "_" in raw_name else raw_name
                    is_known = True
                else:
                    name = "Unknown"
                    is_known = False
                    
                temp_results.append({
                    "box": (x1, y1, x2, y2),
                    "name": f"{name} ({best_score:.2f})",
                    "is_known": is_known
                })
            
            # Cập nhật kết quả tính toán mới nhất ra cho luồng chính lấy dùng
            self.results = temp_results
            
            # Khống chế nhịp độ của luồng AI phù hợp với tốc độ phần cứng
            time.sleep(0.01)

    def nhandienkm(self):
        if len(self.known_embeddings) == 0:
            print("Cơ sở dữ liệu khuôn mặt trống. Vui lòng đăng ký khuôn mặt trước.")
            return
            
        cap = cv.VideoCapture(0)
        # Thiết lập camera chạy mượt ở 30 FPS từ phần cứng
        cap.set(cv.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv.CAP_PROP_FRAME_HEIGHT, 720)
        cap.set(cv.CAP_PROP_FPS, 30)

        # Kích hoạt luồng chạy ngầm
        self.running = True
        ai_thread = threading.Thread(target=self._ai_worker, daemon=True)
        ai_thread.start()
        
        print("Hệ thống nhận diện đa luồng đã bật. Bấm 'q' tại cửa sổ camera để thoát.")

        while True:
            ret, frame = cap.read()
            if not ret:
                print("Không thể đọc được khung hình từ camera")
                break
                
            # Gửi khung hình mới nhất sang cho luồng AI lấy xử lý
            self.current_frame = frame
            # Phát tín hiệu ĐÁNH THỨC luồng AI dậy tính toán khung hình vừa nhận được
            self.frame_ready_event.set()
            
            # Luồng chính không tính toán AI, chỉ việc lấy kết quả gần nhất để vẽ (Cực kỳ mượt)
            local_results = self.results.copy()
            for res in local_results:
                x1, y1, x2, y2 = res["box"]
                name = res["name"]
                color = (0, 255, 0) if res["is_known"] else (0, 0, 255)
                
                cv.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv.putText(frame, name, (x1, y1 - 10), cv.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                
            cv.imshow("Face Recognition", frame)
            
            if cv.waitKey(1) & 0xFF == ord('q'):
                break   
                
        # Tắt luồng ngầm khi thoát chương trình
        self.running = False
        self.frame_ready_event.set() # Đánh thức luồng lần cuối để tự giải phóng
        cap.release()
        cv.destroyAllWindows()

if __name__ == "__main__":
    nhandien = Nhandien()
    nhandien.dangkymat(r'C:\Users\ADMIN\Downloads\Documents\Hethongnhandienkhuonmat\asset\huy1.jpg', 'Nguyễn lê Nhật Huy')
    # Chạy nhận diện mượt mà 30 FPS với mức CPU cực thấp
    nhandien.nhandienkm()