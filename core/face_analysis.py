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
from collections import deque
import numpy as np
import cv2 as cv
from insightface.app import FaceAnalysis
from config.settings import settings

class FaceAnalyzer:
    def __init__(self):
        ai_config = settings.ai
        
        self.threshold = ai_config.get("threshold", 0.65)
        self.det_size = tuple(ai_config.get("det_size", [480, 480]))
        
        # Khởi tạo mô hình InsightFace với cấu hình CUDA tối ưu hiệu năng (sử dụng DEFAULT algo search để tránh độ trễ cuDNN EXHAUSTIVE)
        cuda_options = {
            "device_id": "0",
            "arena_extend_strategy": "kNextPowerOfTwo",
            "cudnn_conv_algo_search": "DEFAULT",
            "do_copy_in_default_stream": "1",
            "cudnn_conv_use_max_workspace": "1",
            "use_tf32": "1",
            "enable_cuda_graph": "0"
        }
        self.app = FaceAnalysis(
            name=ai_config.get("model_name", "buffalo_l"), 
            providers=[("CUDAExecutionProvider", cuda_options), "CPUExecutionProvider"],
            # Chỉ tải detection + recognition. Bỏ qua age/gender/landmark_2d_106/1k3d68
            # để giảm thời gian xử lý mỗi frame theo thời gian thực.
            allowed_modules=["detection", "recognition"]
        )
        self.app.prepare(ctx_id=0, det_size=self.det_size)
        
        try:
            print(f"-> He thong AI dang chay tren backend: {self.app.models['detection'].session.get_providers()[0]}")
        except Exception:
            print("-> Dang kiem tra cau hinh phan cung...")
            
        self.known_embeddings = []
        self.known_names = []
        self.index = None 
        
        from core.liveness_detection import LivenessDetector
        self.liveness_detector = LivenessDetector()
        
        # Cache liveness theo MSSV để không chạy lại mô hình Silent-Face (CPU) mỗi frame
        # cho cùng một người đã được kiểm tra gần đây. Giúp giảm độ trễ theo thời gian thực.
        self._liveness_cache = {}
        self.liveness_interval = float(ai_config.get("liveness_interval", 2.0))

        # ĐA KHUNG HÌNH: buffer điểm liveness theo từng danh tính.
        # Chỉ kết luận thật/giả khi đã gom đủ min_frames trong window_seconds,
        # chống ảnh in / video replay hiệu quả hơn so với 1 frame.
        liveness_cfg = settings.config.get("liveness", {}) or {}
        self.multi_frame = bool(liveness_cfg.get("multi_frame", True))
        self.min_frames = int(liveness_cfg.get("min_frames", 4) or 4)
        self.real_ratio = float(liveness_cfg.get("real_ratio", 0.6) or 0.6)
        self.window_seconds = float(liveness_cfg.get("window_seconds", 4.0) or 4.0)
        self.still_threshold = float(liveness_cfg.get("still_threshold", 0.8) or 0.8)
        self._liveness_buffer = {}  # key -> deque[(ts, is_real, gray80)]
        
        # Load database ngay khi khởi động
        self.load_database()

        # Thực hiện GPU Warmup để pre-allocate VRAM & CUDA streams
        try:
            warmup_img = np.zeros((self.det_size[1], self.det_size[0], 3), dtype=np.uint8)
            self.app.get(warmup_img)
            if hasattr(self, 'liveness_detector') and self.liveness_detector.session is not None:
                self.liveness_detector.is_real_face(warmup_img, [50, 50, 200, 200])
            print("-> [GPU Warmup] Đã khởi tạo và làm nóng GPU CUDA thành công.")
        except Exception as warmup_err:
            print(f"-> [GPU Warmup] Cảnh báo warmup: {warmup_err}")
        
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
            from app.models.student import Student
            from app.models.account import Account
            from app.models.user_profile import UserProfile
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
                        import bcrypt
                        pw_hash = bcrypt.hashpw(b"123456", bcrypt.gensalt()).decode("utf-8")
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
                        academic_status="Đang học"
                    )
                    db.add(student)
                    db.flush()
                else:
                    # Đảm bảo sinh viên có tài khoản/hồ sơ liên kết
                    if not student.profile:
                        username_lower = str(mssv).strip().lower()
                        account = db.query(Account).filter(Account.username == username_lower).first()
                        if not account:
                            import bcrypt
                            pw_hash = bcrypt.hashpw(b"123456", bcrypt.gensalt()).decode("utf-8")
                            account = Account(
                                username=username_lower,
                                password_hash=pw_hash,
                                role="sinh_vien",
                                is_active=True
                            )
                            db.add(account)
                            db.flush()

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

    def _bbox_key(self, bbox):
        """Lượng tử hóa bbox để gom các frame của cùng một người đứng yên."""
        x1, y1, x2, y2 = [int(v) for v in bbox]
        return f"{x1 // 40}-{y1 // 40}-{x2 // 40}-{y2 // 40}"

    def _face_crop_gray(self, img, bbox):
        """Cắt vùng mặt 2.7x -> 80x80 grayscale để so khác biệt giữa các frame."""
        try:
            import cv2 as _cv
            x1, y1, x2, y2 = [int(v) for v in bbox]
            h, w = img.shape[:2]
            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
            crop = int(max(x2 - x1, y2 - y1) * 2.7)
            if crop <= 0:
                return None
            nx1, ny1 = int(cx - crop / 2), int(cy - crop / 2)
            nx2, ny2 = nx1 + crop, ny1 + crop
            face_crop = np.zeros((crop, crop, 3), dtype=img.dtype)
            sy1, sy2 = max(0, ny1), min(h, ny2)
            sx1, sx2 = max(0, nx1), min(w, nx2)
            if sy2 <= sy1 or sx2 <= sx1:
                return None
            face_crop[sy1 - ny1:sy1 - ny1 + (sy2 - sy1),
                      sx1 - nx1:sx1 - nx1 + (sx2 - sx1)] = img[sy1:sy2, sx1:sx2]
            return _cv.cvtColor(_cv.resize(face_crop, (80, 80)), _cv.COLOR_BGR2GRAY)
        except Exception:
            return None

    def _multi_frame_liveness(self, img, bbox, cache_key, now):
        """Chống giả mạo ĐA KHUNG HÌNH.

        - Gộp nhiều frame rồi mới quyết định (chống nhiễu 1 frame).
        - Nếu các frame gần như GIỐNG HỆT nhau dù model nói "thật" -> nghi ảnh
          in/ảnh chụp cầm giữ yên trước camera -> đánh giả.

        Trả về (is_real, score, confirmed):
        - confirmed=False: chưa đủ frame để kết luận (trạng thái "đang xác minh").
        - confirmed=True : đã đủ frame, is_real là quyết định cuối.
        """
        is_real, score = self.liveness_detector.is_real_face(img, bbox)

        if not self.multi_frame:
            return is_real, score, True

        # Key ổn định: MSSV nếu biết, còn không dùng bbox lượng tử hóa
        key = cache_key or self._bbox_key(bbox)
        buf = self._liveness_buffer.setdefault(key, deque())

        gray = self._face_crop_gray(img, bbox)
        buf.append((now, is_real, gray))
        # Chỉ giữ các frame trong cửa sổ thời gian
        while buf and now - buf[0][0] > self.window_seconds:
            buf.popleft()

        # Dọn buffer cũ khi phình to (tránh rò rỉ bộ nhớ trong phiên dài)
        if len(self._liveness_buffer) > 512:
            cutoff = now - self.window_seconds
            for k in [k for k, v in self._liveness_buffer.items() if not v or v[-1][0] < cutoff]:
                self._liveness_buffer.pop(k, None)

        if len(buf) < self.min_frames:
            # Chưa đủ frame -> chưa kết luận (trả kết quả frame hiện tại, confirmed=False)
            return is_real, score, False

        real_count = sum(1 for _, r, _ in buf if r)
        decided = (real_count / len(buf)) >= self.real_ratio

        # Kiểm tra "đứng yên tuyệt đối" (ảnh in / ảnh chụp cầm giữ yên):
        # người thật dù đứng im vẫn có chút khác biệt giữa các frame (nháy mắt, hít thở,
        # nhiễu sensor). Nếu các frame gần như GIỐNG HỆT => khả năng cao là ảnh tĩnh.
        if decided and self.still_threshold is not None:
            grays = [g for _, _, g in buf if g is not None]
            if len(grays) >= 2:
                diffs = [
                    np.abs(grays[i + 1].astype(np.int16) - grays[i].astype(np.int16)).mean()
                    for i in range(len(grays) - 1)
                ]
                if diffs and max(diffs) < self.still_threshold:
                    decided = False
                    score = min(score, 0.05)  # ép score xuống để rõ "Giả mạo"
                    # Xóa buffer để người dùng phải di chuyển/làm thử thách lại
                    buf.clear()

        return decided, score, True

    def recognize_image(self, img):
        """Nhận diện khuôn mặt từ một ảnh tĩnh (OpenCV Image)"""
        if img is None:
            print("-> [AI] Anh nhan vao bi null!")
            return []
            
        faces = self.app.get(img)
        results = []
        now = time.time()
        
        for face in faces:
            bbox = face.bbox
            x1, y1 = int(bbox[0]), int(bbox[1])
            x2, y2 = int(bbox[2]), int(bbox[3])
            
            # ĐÃ FIX BUG: Khai báo biến current_embedding
            current_embedding = face.normed_embedding 
            
            # Khớp FAISS trước (rẻ) để biết có phải người đã biết không
            best_name = "Unknown"
            best_score = 0.0
            is_known = False
            matched_mssv = None
            
            if self.index is not None and len(self.known_embeddings) > 0:
                import faiss
                query_vector = np.array([current_embedding]).astype('float32')
                faiss.normalize_L2(query_vector)
                scores, indices = self.index.search(query_vector, 1)
                
                best_idx = indices[0][0]
                best_score = float(scores[0][0])
                
                if best_idx != -1 and best_score > self.threshold:
                    raw_name = self.known_names[best_idx]
                    matched_mssv = raw_name.split("_")[0] if "_" in raw_name else raw_name
                    best_name = matched_mssv
                    is_known = True
            
            # Kiểm tra Liveness (chống giả mạo) — ĐA KHUNG HÌNH
            # - Người đã biết & mới kiểm tra gần đây: tái sử dụng kết quả cache để tránh chi phí CPU mỗi frame.
            # - Khuôn mặt lạ/giả mạo: không cache để luôn kiểm tra lại.
            is_real = True
            liveness_score = 1.0
            liveness_confirmed = True
            cache_key = matched_mssv if is_known else None

            cached = self._liveness_cache.get(cache_key) if cache_key else None
            if cached and now - cached["ts"] < self.liveness_interval:
                is_real = cached["is_real"]
                liveness_score = cached["score"]
            else:
                is_real, liveness_score, liveness_confirmed = self._multi_frame_liveness(img, bbox, cache_key, now)
                # Chỉ cache khi đã có kết luận cuối (đủ frame) và là người thật
                if liveness_confirmed and is_real and cache_key:
                    self._liveness_cache[cache_key] = {"ts": now, "is_real": True, "score": liveness_score}

            if not is_real:
                best_name = "Spoof/Fake"
                best_score = float(liveness_score)
                is_known = False
                # Không giữ cache cho khuôn mặt giả mạo (luôn kiểm tra lại frame kế tiếp)
                if cache_key:
                    self._liveness_cache.pop(cache_key, None)
            else:
                if not is_known:
                    best_score = 0.0
                # Nếu là người đã biết nhưng FAISS không cho kết quả thì giữ Unknown
                if cache_key is None:
                    best_name = "Unknown"

            results.append({
                "box": (x1, y1, x2, y2),
                "name": best_name,
                "score": best_score,
                "is_known": is_known,
                "is_real": is_real,
                "liveness_confirmed": liveness_confirmed
            })
        
        # Dọn cache cũ để tránh phình bộ nhớ trong phiên chạy dài
        if len(self._liveness_cache) > 256:
            cutoff = now - max(self.liveness_interval, 5.0)
            for k in [k for k, v in self._liveness_cache.items() if v["ts"] < cutoff]:
                self._liveness_cache.pop(k, None)
            
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
            if self.current_frame is None or len(self.known_embeddings) == 0:
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
