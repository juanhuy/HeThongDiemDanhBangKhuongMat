import os
import sys
import time
import threading
import numpy as np
import cv2 as cv

try:
    from insightface.app import FaceAnalysis
except ImportError:
    FaceAnalysis = None

from config.settings import settings

# Thiết lập PATH cho CUDA/CuDNN trong venv
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
venv_path = os.path.join(project_root, 'venv', 'Lib', 'site-packages')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cublas', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cudnn', 'bin')
os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'onnxruntime', 'capi')

class FaceAnalyzer:
    def __init__(self):
        ai_config = settings.ai
        
        self.threshold = ai_config.get("threshold", 0.65)
        self.det_size = tuple(ai_config.get("det_size", [480, 480]))
        self.app = None
        
        # Khởi tạo mô hình InsightFace nếu có sẵn
        if FaceAnalysis is not None:
            try:
                self.app = FaceAnalysis(
                    name=ai_config.get("model_name", "buffalo_l"), 
                    providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
                )
                self.app.prepare(ctx_id=0, det_size=self.det_size)
                
                try:
                    print(f"-> He thong AI dang chay tren backend: {self.app.backend.get_provider()}")
                except Exception:
                    print("-> Dang kiem tra cau hinh phan cung...")
            except Exception as e:
                print(f"-> [AI] Không thể khởi tạo InsightFace: {e}")
                self.app = None
        else:
            print("-> [AI] insightface chưa được cài đặt. Chức năng nhận diện sẽ bị vô hiệu hóa.")
            
        self.known_embeddings = []
        self.known_names = []
        self.index = None 
        
        from core.liveness_detection import LivenessDetector
        self.liveness_detector = LivenessDetector()
        
        # Load database ngay khi khởi động
        self.load_database()
        
        # Các biến phục vụ luồng nhận dạng song song (AI Worker)
        self.current_frame = None
        self.running = False
        self.results = []
        self.frame_ready_event = threading.Event()
        self.worker_thread = None

    def build_faiss_index(self):
        """Xây dựng chỉ mục FAISS từ danh sách vector khuôn mặt đã biết"""
        import faiss
        if len(self.known_embeddings) > 0:
            embeddings_arr = np.array(self.known_embeddings).astype('float32')
            faiss.normalize_L2(embeddings_arr)
            self.index = faiss.IndexFlatIP(512)
            self.index.add(embeddings_arr)
            print(f"-> [FAISS] Da xay dung chi muc FAISS voi {len(self.known_embeddings)} vector.")
        else:
            self.index = None
            print("-> [FAISS] Khong co vector nao de xay dung chi muc.")

    def load_database(self):
        """Tải toàn bộ Vector khuôn mặt từ bảng FaceFeature lên RAM (FAISS)"""
        self.known_embeddings = []
        self.known_names = []
        
        try:
            from app.db.session import SessionLocal
            from app.models.face_feature import FaceFeature
            
            db = SessionLocal()
            try:
                features = db.query(FaceFeature).all()
                for feat in features:
                    if feat.face_vector:
                        try:
                            from core.crypto_utils import decrypt_vector
                            decrypted = decrypt_vector(feat.face_vector)
                            vec = np.frombuffer(decrypted, dtype=np.float32)
                        except Exception:
                            vec = np.frombuffer(feat.face_vector, dtype=np.float32)
                            
                        if len(vec) == 512:
                            self.known_embeddings.append(vec)
                            self.known_names.append(feat.student_id)
                        else:
                            print(f"-> [AI] Bo qua vector loi cua: {feat.student_id}")
                            
                print(f"-> [AI] Da tai {len(self.known_names)} khuon mat hop le tu Database.")
                self.build_faiss_index()
            except Exception as db_err:
                print(f"Loi truy van FaceFeature: {db_err}")
            finally:
                db.close()
        except Exception as e:
            print(f"Khong the ket noi Database de tai vector: {e}")

    def dang_ky_mat(self, image_path, mssv, ho_ten="Unknown", lop_base="Unknown", **kwargs):
        """Trích xuất và lưu vector khuôn mặt vào bảng FaceFeature"""
        if self.app is None:
            print("-> [AI] Không thể đăng ký khuôn mặt vì InsightFace chưa sẵn sàng.")
            return False

        img = cv.imread(image_path)
        if img is None:
            print(f"Khong the doc duoc anh tai: {image_path}")
            return False
            
        faces = self.app.get(img)
        if len(faces) == 0:
            print("Khong tim thay khuon mat trong anh.")
            return False
        elif len(faces) > 1:
            print("Co nhieu hon mot khuon mat. Vui long chon anh chi co mot khuon mat.")
            return False
            
        embedding = faces[0].normed_embedding
        
        try:
            from app.db.session import SessionLocal
            from app.models.face_feature import FaceFeature
            
            db = SessionLocal()
            try:
                # 1. Xóa các vector khuôn mặt cũ của sinh viên này
                db.query(FaceFeature).filter(FaceFeature.student_id == mssv).delete()
                
                # 2. Mã hóa Vector (nếu có hàm) và lưu vào bảng
                try:
                    from core.crypto_utils import encrypt_vector
                    encrypted_emb = encrypt_vector(embedding.tobytes())
                except ImportError:
                    encrypted_emb = embedding.tobytes()
                    
                new_feat = FaceFeature(
                    student_id=mssv,
                    face_vector=encrypted_emb,
                    is_primary=True
                )
                db.add(new_feat)
                db.commit()
                
                print(f"[AI] Dang ky thanh cong khuon mat cho MSSV: {mssv}")
                self.load_database() # Cập nhật lại FAISS Index ngay lập tức
                return True
            except Exception as db_err:
                db.rollback()
                print(f"Loi ghi FaceFeature vao Database: {db_err}")
            finally:
                db.close()
        except Exception as e:
            print(f"Khong the ket noi Database: {e}")
            
        return False

    def recognize_image(self, img):
        """Nhận diện khuôn mặt từ một ảnh tĩnh (OpenCV Image)"""
        if img is None:
            print("-> [AI] Anh nhan vao bi null!")
            return []

        if self.app is None:
            print("-> [AI] InsightFace chưa sẵn sàng. Bỏ qua nhận diện.")
            return []
            
        faces = self.app.get(img)
        results = []
        
        for face in faces:
            bbox = face.bbox
            x1, y1 = int(bbox[0]), int(bbox[1])
            x2, y2 = int(bbox[2]), int(bbox[3])
            
            # ĐÃ FIX BUG: Khai báo biến current_embedding
            current_embedding = face.normed_embedding 
            
            # Kiểm tra Liveness (chống giả mạo)
            is_real, liveness_score = self.liveness_detector.is_real_face(img, bbox)
            
            if not is_real:
                best_name = "Spoof/Fake"
                best_score = float(liveness_score)
                is_known = False
            else:
                best_name = "Unknown"
                best_score = 0.0
                is_known = False
                
                if self.index is not None and len(self.known_embeddings) > 0:
                    import faiss
                    query_vector = np.array([current_embedding]).astype('float32')
                    faiss.normalize_L2(query_vector)
                    scores, indices = self.index.search(query_vector, 1)
                    
                    best_idx = indices[0][0]
                    best_score = float(scores[0][0])
                    
                    if best_idx != -1 and best_score > self.threshold:
                        raw_name = self.known_names[best_idx]
                        best_name = raw_name.split("_")[0] if "_" in raw_name else raw_name
                        is_known = True
            
            results.append({
                "box": (x1, y1, x2, y2),
                "name": best_name,
                "score": best_score,
                "is_known": is_known,
                "is_real": is_real
            })
            
        return results

    # =========================================================================
    # CÁC HÀM XỬ LÝ WORKER CHẠY NGẦM DÀNH CHO CAMERA THỰC TẾ
    # =========================================================================
    def start_worker(self):
        if self.running:
            return
        self.running = True
        self.worker_thread = threading.Thread(target=self._ai_worker, daemon=True)
        self.worker_thread.start()

    def stop_worker(self):
        self.running = False
        self.frame_ready_event.set()
        if self.worker_thread:
            self.worker_thread.join(timeout=2.0)

    def update_frame(self, frame):
        self.current_frame = frame
        self.frame_ready_event.set()

    def _ai_worker(self):
        while self.running:
            if not self.frame_ready_event.wait(timeout=1.0):
                continue
                
            self.frame_ready_event.clear()
            if self.current_frame is None or len(self.known_embeddings) == 0 or self.app is None:
                continue
                
            frame_to_process = self.current_frame.copy()
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
                
                best_name = "Unknown"
                best_score = 0.0
                is_known = False
                
                if self.index is not None and len(self.known_embeddings) > 0:
                    import faiss
                    query_vector = np.array([current_embedding]).astype('float32')
                    faiss.normalize_L2(query_vector)
                    scores, indices = self.index.search(query_vector, 1)
                    best_idx = indices[0][0]
                    best_score = float(scores[0][0])
                    
                    if best_idx != -1 and best_score > self.threshold:
                        raw_name = self.known_names[best_idx]
                        best_name = raw_name.split("_")[0] if "_" in raw_name else raw_name
                        is_known = True
                    
                temp_results.append({
                    "box": (x1, y1, x2, y2),
                    "name": best_name,
                    "score": best_score,
                    "is_known": is_known
                })
                
            self.results = temp_results
            time.sleep(0.01)