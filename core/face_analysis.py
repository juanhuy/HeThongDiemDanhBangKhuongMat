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
from services.database_service import DatabaseService

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
        
        self.db_service = DatabaseService()
        self.threshold = ai_config.get("threshold", 0.65)
        self.det_size = tuple(ai_config.get("det_size", [480, 480]))
        
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
        
        # Thử dùng SQLAlchemy qua SessionLocal nếu import được
        try:
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            backend_path = os.path.join(project_root, 'backend')
            if backend_path not in sys.path:
                sys.path.append(backend_path)
                
            from app.db.session import SessionLocal
            from app.models.face_feature import FaceFeature
            
            db = SessionLocal()
            try:
                features = db.query(FaceFeature).all()
                for feat in features:
                    if feat.face_vector:
                        # Convert LargeBinary bytes back to numpy array
                        vec = np.frombuffer(feat.face_vector, dtype=np.float32)
                        self.known_embeddings.append(vec)
                        self.known_names.append(feat.student_id)
                print(f"-> [SQLAlchemy] Da tai {len(self.known_names)} khuon mat tu database vector.")
                return
            except Exception as db_err:
                print(f"Loi truy van FaceFeature qua SQLAlchemy: {db_err}. fallback to DatabaseService.")
            finally:
                db.close()
        except Exception as e:
            print(f"Không thể import app/db/session, sử dụng DatabaseService cũ: {e}")

        # Fallback cũ sử dụng DatabaseService
        students = self.db_service.get_all_sinh_vien()
        for sv in students:
            if sv["face_vector"] is not None:
                self.known_embeddings.append(sv["face_vector"])
                self.known_names.append(sv["mssv"])
        print(f"-> [Fallback] Da tai {len(self.known_names)} khuon mat tu database vector.")


    def dang_ky_mat(self, image_path, mssv, ho_ten, lop_base, **kwargs):
        """Trích xuất và lưu vector khuôn mặt của một sinh viên"""
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
        
        # Thử lưu bằng SQLAlchemy qua SessionLocal nếu được
        try:
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            backend_path = os.path.join(project_root, 'backend')
            if backend_path not in sys.path:
                sys.path.append(backend_path)
                
            from app.db.session import SessionLocal
            from app.models.student import Student
            from app.models.face_feature import FaceFeature
            
            db = SessionLocal()
            try:
                # Kiểm tra/Cập nhật thông tin sinh viên
                student = db.query(Student).filter(Student.student_id == mssv).first()
                if not student:
                    student = Student(
                        student_id=mssv,
                        full_name=ho_ten,
                        administrative_class=lop_base,
                        email=kwargs.get("email") or f"{mssv}@student.ptit.edu.vn",
                        phone_number=kwargs.get("sdt"),
                        academic_status="studying"
                    )
                    db.add(student)
                else:
                    student.full_name = ho_ten
                    student.administrative_class = lop_base
                    if kwargs.get("sdt"):
                        student.phone_number = kwargs.get("sdt")
                
                # Xóa các vector khuôn mặt cũ và thêm vector mới
                db.query(FaceFeature).filter(FaceFeature.student_id == mssv).delete()
                
                # Ghi vector dưới dạng bytes
                new_feat = FaceFeature(
                    student_id=mssv,
                    face_vector=embedding.tobytes(),
                    is_primary=True
                )
                db.add(new_feat)
                db.commit()
                print(f"[SQLAlchemy] Đăng ký thành công khuôn mặt cho {ho_ten} ({mssv})")
                self.load_database()
                return True
            except Exception as db_err:
                db.rollback()
                print(f"Lỗi ghi DB qua SQLAlchemy trong dang_ky_mat: {db_err}")
            finally:
                db.close()
        except Exception as e:
            print(f"Không thể sử dụng SQLAlchemy trong dang_ky_mat: {e}")

        # Fallback cũ sử dụng DatabaseService
        success = self.db_service.add_sinh_vien(mssv, ho_ten, lop_base, embedding, **kwargs)
        if success:
            print(f"[Fallback] Đăng ký thành công khuôn mặt cho {ho_ten} ({mssv})")
            self.load_database()
            return True
        return False

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
