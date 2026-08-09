import os
import sys

# Khởi chạy trợ giúp CUDA để preload thư viện trên Linux
try:
    from core.cuda_helper import preload_cuda
    preload_cuda()
except Exception:
    try:
        from cuda_helper import preload_cuda
        preload_cuda()
    except Exception as e:
        print(f"-> [CUDA Helper] Không thể preload thư viện: {e}")

# Thiết lập PATH cho CUDA/CuDNN trong venv cho Windows
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for venv_name in ['.venv', 'venv']:
    venv_path = os.path.join(project_root, venv_name, 'Lib', 'site-packages')
    if os.path.exists(venv_path):
        os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cublas', 'bin')
        os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'nvidia', 'cudnn', 'bin')
        os.environ["PATH"] += os.pathsep + os.path.join(venv_path, 'onnxruntime', 'capi')
        break

import time
import threading
import numpy as np
import cv2 as cv
import insightface
from insightface.app import FaceAnalysis
from config.settings import settings
from core.face_matcher import tinh_cosine_similarity
from services.database_service import DatabaseService

class FaceAnalyzer:
    def __init__(self):
        # Đọc cấu hình từ settings
        ai_config = settings.ai
        db_config = settings.database
        
        self.db_service = DatabaseService()
        self.threshold = ai_config.get("threshold", 0.65)
        self.det_size = tuple(ai_config.get("det_size", [480, 480]))
        
        # Khởi tạo mô hình InsightFace với cấu hình CUDA tối ưu hiệu năng tối đa (không bật CUDA Graph cho detector do kích thước động)
        cuda_options = {
            "device_id": "0",
            "arena_extend_strategy": "kNextPowerOfTwo",
            "cudnn_conv_algo_search": "EXHAUSTIVE",
            "do_copy_in_default_stream": "1",
            "cudnn_conv_use_max_workspace": "1",
            "use_tf32": "1",
            "enable_cuda_graph": "0"
        }
        self.app = FaceAnalysis(
            name=ai_config.get("model_name", "buffalo_l"), 
            providers=[("CUDAExecutionProvider", cuda_options), "CPUExecutionProvider"]
        )
        self.app.prepare(ctx_id=0, det_size=self.det_size)
        
        try:
            print(f"-> He thong AI dang chay tren backend: {self.app.backend.get_provider()}")
        except Exception:
            print("-> Dang kiem tra cau hinh phan cung...")
            
        self.known_embeddings = []
        self.known_names = []
        self.index = None  # Khởi tạo FAISS index
        from core.liveness_detection import LivenessDetector
        self.liveness_detector = LivenessDetector()
        self.load_database()

        # Tự động đăng ký sinh viên mặc định N22DCCN134 nếu chưa tồn tại
        if "N22DCCN134" not in self.known_names:
            img_path = os.path.join(project_root, "database", "registered_images", "N22DCCN134.jpg")
            if os.path.exists(img_path):
                print(f"-> [AI Seeding] Tu dong dang ky sinh vien mac dinh N22DCCN134 tu {img_path}...")
                self.dang_ky_mat(
                    image_path=img_path,
                    mssv="N22DCCN134",
                    ho_ten="Nguyễn Huy Hoàng",
                    lop_base="D22CQCN01-N",
                    email="n22dccn134@student.ptit.edu.vn"
                )
        
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
            # Chuẩn hóa L2 để Inner Product bằng Cosine Similarity
            faiss.normalize_L2(embeddings_arr)
            self.index = faiss.IndexFlatIP(512)
            self.index.add(embeddings_arr)
            print(f"-> [FAISS] Da xay dung chi muc FAISS voi {len(self.known_embeddings)} vector.")
        else:
            self.index = None
            print("-> [FAISS] Khong co vector nao de xay dung chi muc.")

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
            from app.models.account import Account
            from app.models.student import Student
            from app.models.face_feature import FaceFeature
            
            db = SessionLocal()
            try:
                features = db.query(FaceFeature).all()
                for feat in features:
                    if feat.face_vector:
                        # Giải mã vector trước khi convert sang numpy
                        from core.crypto_utils import decrypt_vector
                        try:
                            decrypted = decrypt_vector(feat.face_vector)
                            vec = np.frombuffer(decrypted, dtype=np.float32)
                        except Exception:
                            vec = np.frombuffer(feat.face_vector, dtype=np.float32)
                            
                        if len(vec) == 512:
                            self.known_embeddings.append(vec)
                            self.known_names.append(feat.student_id)
                        else:
                            print(f"-> [SQLAlchemy] Bo qua vector gia lap/loi: {feat.student_id} (chieu: {len(vec)})")
                print(f"-> [SQLAlchemy] Da tai {len(self.known_names)} khuon mat hop le tu database vector.")
                self.build_faiss_index()
                return
            except Exception as db_err:
                print(f"Loi truy van FaceFeature qua SQLAlchemy: {db_err}. fallback to DatabaseService.")
            finally:
                db.close()
        except Exception as e:
            print(f"Khong the import app/db/session, su dung DatabaseService cu: {e}")

        # Fallback cũ sử dụng DatabaseService
        students = self.db_service.get_all_sinh_vien()
        for sv in students:
            if sv["face_vector"] is not None:
                vec = sv["face_vector"]
                if len(vec) == 512:
                    self.known_embeddings.append(vec)
                    self.known_names.append(sv["mssv"])
                else:
                    print(f"-> [Fallback] Bo qua vector gia lap/loi: {sv['mssv']} (chieu: {len(vec)})")
        print(f"-> [Fallback] Da tai {len(self.known_names)} khuon mat hop le tu database vector.")
        self.build_faiss_index()


    def dang_ky_mat(self, image_path, mssv, ho_ten, lop_base, **kwargs):
        """Trích xuất và lưu vector khuôn mặt của một sinh viên"""
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
        
        # Thử lưu bằng SQLAlchemy qua SessionLocal nếu được
        try:
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            backend_path = os.path.join(project_root, 'backend')
            if backend_path not in sys.path:
                sys.path.append(backend_path)
                
            from app.db.session import SessionLocal
            from app.models.account import Account
            from app.models.student import Student, UserProfile
            from app.models.face_feature import FaceFeature
            
            db = SessionLocal()
            try:
                # Kiểm tra/Cập nhật thông tin sinh viên
                student = db.query(Student).filter(Student.student_id == mssv).first()
                if not student:
                    # 0. Tạo tài khoản đăng nhập tự động
                    username_lower = str(mssv).strip().lower()
                    account = db.query(Account).filter(Account.username == username_lower).first()
                    if not account:
                        import hashlib
                        pw_hash = hashlib.sha256("123456".encode()).hexdigest()
                        account = Account(
                            username=username_lower,
                            password_hash=pw_hash,
                            role="sinh_vien",
                            is_active=True
                        )
                        db.add(account)
                        db.flush()
                    
                    # Tạo UserProfile liên kết
                    profile = UserProfile(
                        account_id=account.account_id,
                        full_name=ho_ten,
                        personal_email=kwargs.get("email") or f"{mssv}@student.ptit.edu.vn",
                        phone_number=kwargs.get("sdt")
                    )
                    db.add(profile)
                    db.flush()

                    student = Student(
                        student_id=mssv,
                        profile_id=profile.profile_id,
                        administrative_class=lop_base,
                        academic_status="studying"
                    )
                    db.add(student)
                    db.flush()
                else:
                    # Đảm bảo sinh viên có tài khoản/hồ sơ liên kết
                    if not student.profile:
                        # 0. Lấy hoặc tạo tài khoản
                        username_lower = str(mssv).strip().lower()
                        account = db.query(Account).filter(Account.username == username_lower).first()
                        if not account:
                            import hashlib
                            pw_hash = hashlib.sha256("123456".encode()).hexdigest()
                            account = Account(
                                username=username_lower,
                                password_hash=pw_hash,
                                role="sinh_vien",
                                is_active=True
                            )
                            db.add(account)
                            db.flush()

                        # Tạo profile mới
                        profile = UserProfile(
                            account_id=account.account_id,
                            full_name=ho_ten,
                            personal_email=kwargs.get("email") or f"{mssv}@student.ptit.edu.vn",
                            phone_number=kwargs.get("sdt")
                        )
                        db.add(profile)
                        db.flush()
                        student.profile_id = profile.profile_id
                    else:
                        student.profile.full_name = ho_ten
                        if kwargs.get("sdt"):
                            student.profile.phone_number = kwargs.get("sdt")
                        if kwargs.get("email"):
                            student.profile.personal_email = kwargs.get("email")
                    
                    student.administrative_class = lop_base
                    db.add(student)
                    db.flush()
                
                # Xóa các vector khuôn mặt cũ và thêm vector mới
                db.query(FaceFeature).filter(FaceFeature.student_id == mssv).delete()
                
                # Ghi vector dưới dạng bytes (đã mã hóa)
                from core.crypto_utils import encrypt_vector
                encrypted_emb = encrypt_vector(embedding.tobytes())
                new_feat = FaceFeature(
                    student_id=mssv,
                    face_vector=encrypted_emb,
                    is_primary=True
                )
                db.add(new_feat)
                db.commit()
                print(f"[SQLAlchemy] Dang ky thanh cong khuon mat cho {ho_ten} ({mssv})")
                self.load_database()
                return True
            except Exception as db_err:
                db.rollback()
                print(f"Loi ghi DB qua SQLAlchemy trong dang_ky_mat: {db_err}")
            finally:
                db.close()
        except Exception as e:
            print(f"Khong the su dung SQLAlchemy trong dang_ky_mat: {e}")

        # Fallback cũ sử dụng DatabaseService
        success = self.db_service.add_sinh_vien(mssv, ho_ten, lop_base, embedding, **kwargs)
        if success:
            print(f"[Fallback] Dang ky thanh cong khuon mat cho {ho_ten} ({mssv})")
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
                
                # So sánh độ tương đồng bằng FAISS
                best_name = "Unknown"
                best_score = -1.0
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

    def recognize_image(self, img):
        """Nhận diện khuôn mặt từ một ảnh tĩnh (OpenCV Image)"""
        if img is None:
            print("-> [AI] Anh nhan vao bi null!")
            return []
            
        print(f"-> [AI] Dang xu ly nhan dang khung hinh (Kich thuoc: {img.shape})")
        faces = self.app.get(img)
        print(f"-> [AI] Phat hien {len(faces)} khuon mat trong khung hinh.")
        
        results = []
        for face in faces:
            bbox = face.bbox
            x1, y1 = int(bbox[0]), int(bbox[1])
            x2, y2 = int(bbox[2]), int(bbox[3])
            
            # Khởi tạo giá trị mặc định cho mỗi khuôn mặt
            best_name = "Unknown"
            best_score = -1.0
            is_known = False
            
            # Trích xuất góc quay đầu (pose: pitch, yaw, roll) trước để hỗ trợ kiểm tra Liveness khi đang nghiêng mặt
            yaw, pitch, roll = 0.0, 0.0, 0.0
            if hasattr(face, 'pose') and face.pose is not None:
                pitch, yaw, roll = face.pose

            # Kiểm tra Liveness (chống giả mạo)
            is_real, liveness_score = self.liveness_detector.is_real_face(img, bbox, pose=(pitch, yaw, roll))
            
            if not is_real:
                print(f"   + [Spoof Alert] Phat hien khuon mat gia mao voi score {liveness_score:.2f}!")
                best_name = "Spoof/Fake"
                best_score = liveness_score
                is_known = False
            else:
                if self.index is not None and len(self.known_embeddings) > 0:
                    import faiss
                    query_vector = np.array([face.normed_embedding]).astype('float32')
                    faiss.normalize_L2(query_vector)
                    scores, indices = self.index.search(query_vector, 1)
                    best_idx = indices[0][0]
                    best_score = float(scores[0][0])
                    if best_idx != -1 and best_score > self.threshold:
                        raw_name = self.known_names[best_idx]
                        best_name = raw_name.split("_")[0] if "_" in raw_name else raw_name
                        is_known = True

            print(f"   + Mat quet duoc: {best_name} (Score so khop: {best_score:.2f}, Nguong: {self.threshold})")
            results.append({
                "box": (x1, y1, x2, y2),
                "name": best_name,
                "score": float(best_score),
                "is_known": is_known,
                "is_real": is_real,
                "active_state": {
                    "yaw": float(yaw),
                    "pitch": float(pitch),
                    "roll": float(roll)
                }
            })
        return results
