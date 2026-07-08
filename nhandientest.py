import os 
import sys
import numpy as np 
import cv2 as cv
import threading
import insightface  
from insightface.app import FaceAnalysis
import time

# Cấu hình biến môi trường tăng tốc độ phần cứng
venv_path = os.path.join(os.path.dirname(__file__), 'venv', 'Lib', 'site-packages')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cublas', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cudnn', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'onnxruntime', 'capi')

class nhandienkhuongmat:
    def __init__(self, db_path="./face_database"):
        self.db_path = db_path
        if not os.path.exists(self.db_path):
            os.makedirs(self.db_path)
            
      
        self.app = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
        self.app.prepare(ctx_id=0, det_size=(480, 480)) 
        
        try:
            print(f"Đang sử dụng AI trên: {self.app.backend.get_provider()}")
        except:
            print("Đang kiểm tra cấu hình phần cứng...")
            
        self.known_embeddings = []
        self.known_names = []
        self.load_database()
        self.threshold = 0.65
        
        self.current_frame = None
        self.results = []
        self.running = False
        self.frame_ready_event = threading.Event()
        self.lock = threading.Lock()
        
    def load_database(self):
        self.known_embeddings = []
        self.known_names = []
        if not os.path.exists(self.db_path) or not os.listdir(self.db_path):
            print("Không tìm thấy dữ liệu khuôn mặt trong thư mục database.")
            return
            
        for file_name in os.listdir(self.db_path):
            if file_name.endswith(".npy"):
                name = os.path.splitext(file_name)[0]
                embedding = np.load(os.path.join(self.db_path, file_name))
                self.known_embeddings.append(embedding)
                self.known_names.append(name)
        print(f"Đã tải {len(self.known_names)} khuôn mặt từ database.")
        
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
            
            # Đảm bảo có cả mặt trên cam và dữ liệu trong database
            if len(faces) > 0 and len(self.known_embeddings) > 0:
                # Ép mảng database về dạng 2D để tránh lỗi kích thước ma trận khi có 1 người
                embeddings_db = np.atleast_2d(self.known_embeddings)
                
                for face in faces:
                    bbox = face.bbox
                    x1, y1 = int(bbox[0] * scale_x), int(bbox[1] * scale_y)
                    x2, y2 = int(bbox[2] * scale_x), int(bbox[3] * scale_y)
                    
                    current_embedding = face.normed_embedding
                    
                    # Tính toán khoảng cách toán học Cosine
                    score = np.dot(embeddings_db, current_embedding)
                    best_match_index = np.argmax(score)
                    best_score = score[best_match_index]
                    
                    if best_score > self.threshold:
                        raw_name = self.known_names[best_match_index]
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
            
            # Khóa và cập nhật ngay lập tức
            with self.lock:
                self.results = temp_results
                
            time.sleep(0.001)
    def nhandienhinh(self):
        cap = cv.VideoCapture(0)
        cap.set(cv.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv.CAP_PROP_FRAME_HEIGHT, 720)
        cap.set(cv.CAP_PROP_FPS, 30)
        
        self.running = True
        ai_thread = threading.Thread(target=self._ai_worker, daemon=True)
        ai_thread.start()
        
        print("Hệ thống nhận diện đa luồng đã bật. Bấm 'q' tại cửa sổ camera để thoát.")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Không thể đọc được ảnh từ camera")
                break
                
            with self.lock:
                self.current_frame = frame
                
            if not self.frame_ready_event.is_set():
                self.frame_ready_event.set()
                
            with self.lock:
                local_results = self.results.copy() if self.results else []
                
            for res in local_results:
                x1, y1, x2, y2 = res["box"]
                name = res["name"]
                is_known = res["is_known"]
                color = (0, 255, 0) if is_known else (0, 0, 255)
                
                cv.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv.putText(frame, name, (x1, y1 - 10), cv.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)   
                
            # SỬA LỖI ĐẶT SAI VỊ TRÍ: Đưa imshow ra ngoài vòng lặp for vẽ bounding box
            cv.imshow("Nhan dien mat", frame)
            
            if cv.waitKey(1) & 0xFF == ord('q'):
                break
                
        self.running = False
        self.frame_ready_event.set()
        ai_thread.join(timeout=1.0)
        cap.release()
        cv.destroyAllWindows()

if __name__ == "__main__":
    nhandien = nhandienkhuongmat()
    nhandien.nhandienhinh()