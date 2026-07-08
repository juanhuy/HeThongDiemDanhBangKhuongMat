import os
import sys
import time
import threading
import numpy as np
import cv2 as cv
import insightface
from insightface.app import FaceAnalysis
from config.settings import settings
from core.face_matcher import tinh_cosine_similarity

# Thiết lập PATH cho CUDA/CuDNN trong venv (chạy từ thư mục con core/)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
venv_path = os.path.join(project_root, 'venv', 'Lib', 'site-packages')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cublas', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cudnn', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'onnxruntime', 'capi')

class FaceAnalyzer:
    def __init__(self):
        # Đọc cấu hình từ settings
        ai_config = settings.ai
        db_config = settings.database
        
        self.embeddings_dir = os.path.join(project_root, db_config.get("embeddings_dir", "./database/embeddings"))
        self.threshold = ai_config.get("threshold", 0.65)
        self.det_size = tuple(ai_config.get("det_size", [480, 480]))
        
        if not os.path.exists(self.embeddings_dir):
            os.makedirs(self.embeddings_dir, exist_ok=True)
            
        # Khởi tạo mô hình InsightFace
        self.app = FaceAnalysis(
            name=ai_config.get("model_name", "buffalo_l"), 
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
        )
        self.app.prepare(ctx_id=0, det_size=self.det_size)
        
        try:
            print(f"-> He thong AI dang chay tren backend: {self.app.backend.get_provider()}")
        except Exception:
            print("-> Dang kiem tra cau hinh phan cung...")
            
        self.known_embeddings = []
        self.known_names = []
        self.load_database()
        
        # Các biến phục vụ luồng nhận dạng song song (AI Worker)
        self.current_frame = None
        self.running = False
        self.results = []
        self.frame_ready_event = threading.Event()
        self.worker_thread = None

    def load_database(self):
        self.known_embeddings = []
        self.known_names = []
        if not os.path.exists(self.embeddings_dir):
            return
            
        for file_name in os.listdir(self.embeddings_dir):
            if file_name.endswith(".npy"):
                name = os.path.splitext(file_name)[0]
                embedding = np.load(os.path.join(self.embeddings_dir, file_name))
                self.known_embeddings.append(embedding)
                self.known_names.append(name)
        print(f"-> Da tai {len(self.known_names)} khuon mat tu database vector.")


    def dang_ky_mat(self, image_path, name):
        """Trích xuất và lưu vector khuôn mặt của một người"""
        img = cv.imread(image_path)
        if img is None:
            print(f"Không thể đọc được ảnh tại: {image_path}")
            return False
            
        faces = self.app.get(img)
        if len(faces) == 0:
            print("Không tìm thấy khuôn mặt trong ảnh.")
            return False
        elif len(faces) > 1:
            print("Có nhiều hơn một khuôn mặt. Vui lòng chọn ảnh chỉ có một khuôn mặt.")
            return False
            
        embedding = faces[0].normed_embedding
        save_path = os.path.join(self.embeddings_dir, f"{name}.npy")
        np.save(save_path, embedding)
        print(f"Đăng ký thành công khuôn mặt cho {name}")
        self.load_database()
        return True

    def start_worker(self):
        """Khởi động luồng AI chạy ngầm"""
        if self.running:
            return
        self.running = True
        self.worker_thread = threading.Thread(target=self._ai_worker, daemon=True)
        self.worker_thread.start()

    def stop_worker(self):
        """Dừng luồng AI chạy ngầm"""
        self.running = False
        self.frame_ready_event.set() # Đánh thức luồng để thoát
        if self.worker_thread:
            self.worker_thread.join(timeout=2.0)

    def update_frame(self, frame):
        """Gửi khung hình mới cho luồng AI xử lý"""
        self.current_frame = frame
        self.frame_ready_event.set()

    def _ai_worker(self):
        while self.running:
            if not self.frame_ready_event.wait(timeout=1.0):
                continue
                
            self.frame_ready_event.clear()
            if self.current_frame is None or len(self.known_embeddings) == 0:
                continue
                
            frame_to_process = self.current_frame.copy()
            # Resize về kích thước det_size cấu hình để tăng tốc độ AI
            target_w, target_h = self.det_size
            small_frame = cv.resize(frame_to_process, (target_w, target_h))
            
            scale_x = frame_to_process.shape[1] / float(target_w)
            scale_y = frame_to_process.shape[0] / float(target_h)
            
            faces = self.app.get(small_frame)
            temp_results = []
            
            for face in faces:
                bbox = face.bbox
                x1, y1 = int(bbox[0] * scale_x), int(bbox[1] * scale_y)
                x2, y2 = int(bbox[2] * scale_x), int(bbox[3] * scale_y)
                
                current_embedding = face.normed_embedding
                
                # So sánh độ tương đồng Cosine
                best_name = "Unknown"
                best_score = -1.0
                
                # Sử dụng dot product nhanh trên ma trận numpy
                scores = np.dot(self.known_embeddings, current_embedding)
                best_idx = np.argmax(scores)
                best_score = scores[best_idx]
                
                if best_score > self.threshold:
                    raw_name = self.known_names[best_idx]
                    best_name = raw_name.split("_")[0] if "_" in raw_name else raw_name
                    is_known = True
                else:
                    best_name = "Unknown"
                    is_known = False
                    
                temp_results.append({
                    "box": (x1, y1, x2, y2),
                    "name": best_name,
                    "score": best_score,
                    "is_known": is_known
                })
                
            self.results = temp_results
            time.sleep(0.01)

    def recognize_image(self, img):
        """Nhận diện khuôn mặt từ một ảnh tĩnh (OpenCV Image)"""
        faces = self.app.get(img)
        results = []
        for face in faces:
            bbox = face.bbox
            x1, y1 = int(bbox[0]), int(bbox[1])
            x2, y2 = int(bbox[2]), int(bbox[3])
            
            current_embedding = face.normed_embedding
            best_name = "Unknown"
            best_score = -1.0
            is_known = False
            
            if len(self.known_embeddings) > 0:
                scores = np.dot(self.known_embeddings, current_embedding)
                best_idx = np.argmax(scores)
                best_score = scores[best_idx]
                
                if best_score > self.threshold:
                    raw_name = self.known_names[best_idx]
                    best_name = raw_name.split("_")[0] if "_" in raw_name else raw_name
                    is_known = True
                    
            results.append({
                "box": (x1, y1, x2, y2),
                "name": best_name,
                "score": float(best_score),
                "is_known": is_known
            })
        return results
