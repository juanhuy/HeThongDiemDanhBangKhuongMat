import numpy as np
import cv2 as cv
import os
import sys
import threading
import insightface
from insightface.app import FaceAnalysis

# Cấu hình môi trường cho CUDA/ONNX nếu dùng GPU
venv_path = os.path.join(os.path.dirname(__file__), 'venv', 'Lib', 'site-packages')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cublas', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cudnn', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'onnxruntime', 'capi')

class hocnhandien:
    def __init__(self, db_path="./face_database"):
        self.db_path = db_path
        if not os.path.exists(self.db_path):
            os.makedirs(self.db_path)
            
        # Khởi tạo InsightFace
        self.app = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
        self.app.prepare(ctx_id=0, det_size=(480, 480))
        
        try:
            print(f"Đang sử dụng AI trên: {self.app.models['detection'].execution_provider}")
        except:
            print("Đang kiểm tra phần cứng...")
            
        self.known_embedding = []
        self.known_name = []
        self.threshold = 0.45  # buffalo_l thường dùng ngưỡng khoảng 0.4 - 0.5 cho Cosine Similarity
        self.result = []
        self.current_frame = None
        self.running = True
        self.frame_ready_event = threading.Event()
        self.lock = threading.Lock()
        
        # Tự động load database khi khởi tạo
        self.load_database()

    def dangkymay(self, image_path, name):
        img = cv.imread(image_path)
        if img is None:
            print(f"Không có ảnh để đăng ký hoặc đường dẫn {image_path} bị sai")
            return False
            
        faces = self.app.get(img)
        if len(faces) == 0:
            print("Không tìm thấy khuôn mặt trong ảnh")
            return False
        elif len(faces) > 1:
            print("Có nhiều hơn một khuôn mặt. Vui lòng dùng ảnh chỉ có 1 khuôn mặt")
            return False
            
        embedding = faces[0].normed_embedding  # Sửa lỗi chính tả nomerd
        np.save(os.path.join(self.db_path, f"{name}.npy"), embedding)
        print(f"Đăng ký khuôn mặt thành công cho {name}")
        self.load_database()
        return True

    def load_database(self):
        self.known_name = []
        self.known_embedding = []
        if not os.path.exists(self.db_path) or not os.listdir(self.db_path):
            print("Trong database chưa có khuôn mặt nào cả")
            return
            
        for file_name in os.listdir(self.db_path):
            if file_name.endswith(".npy"):  # Sửa lỗi endswitch
                name = os.path.splitext(file_name)[0]  # Sửa lỗi lấy nhầm file_name[0]
                embedding = np.load(os.path.join(self.db_path, file_name))
                self.known_embedding.append(embedding)
                self.known_name.append(name)
        print(f"Đã tải xong {len(self.known_name)} khuôn mặt từ database")

    def _aiworker_(self):
        while self.running:
            if not self.frame_ready_event.wait(timeout=1.0):
                continue
            self.frame_ready_event.clear()
            
            with self.lock:
                if self.current_frame is None:
                    continue
                frame_copy = self.current_frame.copy()
                
            target_size = (480, 480)
            small_frame = cv.resize(frame_copy, target_size)
            scale_x = frame_copy.shape[1] / target_size[0]
            scale_y = frame_copy.shape[0] / target_size[1]
            
            faces = self.app.get(small_frame)
            temp_results = []
            
            if len(faces) > 0 and len(self.known_embedding) > 0:
                embedding_db = np.atleast_2d(self.known_embedding)
                for face in faces:
                    bbox = face.bbox
                    x1, y1 = int(bbox[0] * scale_x), int(bbox[1] * scale_y)
                    x2, y2 = int(bbox[2] * scale_x), int(bbox[3] * scale_y)
                    
                    current_embedding = face.normed_embedding
                    # Tính toán ma trận dot product giữa DB và khuôn mặt hiện tại
                    scores = np.dot(embedding_db, current_embedding)
                    best_match_index = np.argmax(scores)
                    best_score = scores[best_match_index]
                    
                    if best_score > self.threshold:
                        raw_name = self.known_name[best_match_index]
                        name = raw_name.split("_")[0] if "_" in raw_name else raw_name
                        is_known = True
                    else:
                        is_known = False
                        name = "Unknown"
                        
                    temp_results.append({
                        "box": (x1, y1, x2, y2),
                        "name": f"{name} ({best_score:.2f})",
                        "is_known": is_known
                    })
                    
            with self.lock:
                self.result = temp_results

    def nhandienmat(self):
        cap = cv.VideoCapture(0)
        cap.set(cv.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv.CAP_PROP_FRAME_HEIGHT, 720)
        cap.set(cv.CAP_PROP_FPS, 30)
        
        self.running = True
        ai_thread = threading.Thread(target=self._aiworker_, daemon=True)
        ai_thread.start()  # Sửa lỗi thiếu dấu ngoặc ()
        
        print("Hệ thống nhận diện đa luồng đang bật. Nhấn 'q' để thoát.")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Không mở được camera")
                break
                
            with self.lock:
                self.current_frame = frame
                
            self.frame_ready_event.set()
            
            with self.lock:
                local_results = self.result.copy() if self.result else []  # Sửa lỗi self.results
                
            for res in local_results:
                x1, y1, x2, y2 = res["box"]
                name = res["name"]
                is_known = res["is_known"]
                
                color = (0, 255, 0) if is_known else (0, 0, 255)
                cv.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                # Sửa lỗi đóng ngoặc cv.putText
                cv.putText(frame, name, (x1, y1 - 10), cv.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                
            cv.imshow("Nhan dien khuon mat", frame)
            if cv.waitKey(1) & 0xFF == ord('q'):
                break
                
        self.running = False
        self.frame_ready_event.set()
        ai_thread.join(timeout=1.0)
        cap.release()
        cv.destroyAllWindows()

if __name__ == "__main__":
    nhandien = hocnhandien()
    # Bạn có thể đăng ký ảnh trước bằng lệnh dưới nếu muốn:
    # nhandien.dangkymay("anh_cua_ban.jpg", "TenCuaBan")
    nhandien.nhandienmat()