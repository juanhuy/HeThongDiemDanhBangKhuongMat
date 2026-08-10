# Khởi chạy trợ giúp CUDA để preload thư viện trên Linux
try:
    from core.cuda_helper import preload_cuda
    preload_cuda()
except Exception:
    try:
        from cuda_helper import preload_cuda
        preload_cuda()
    except Exception:
        pass

import os
import cv2 as cv
import numpy as np
import onnxruntime as ort

class LivenessDetector:
    def __init__(self, model_path=None):
        if model_path is None:
            # Đường dẫn mặc định
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(current_dir, "models", "silent_face.onnx")
            
        self.model_path = model_path
        self.session = None
        
        # Đọc cấu hình để bật/tắt chống giả mạo
        try:
            import sys
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if project_root not in sys.path:
                sys.path.append(project_root)
            from config.settings import settings
            liveness_cfg = settings.config.get("liveness", {}) or {}
            self.enabled = liveness_cfg.get("enabled", True)
            self.challenge_threshold = float(liveness_cfg.get("challenge_threshold", 0.30))
            self.ai_threshold = float(liveness_cfg.get("ai_threshold", 0.35))
            self.heuristic_min = float(liveness_cfg.get("heuristic_min", 80))
        except Exception as e:
            print(f"-> [Liveness] Lỗi đọc config: {e}")
            self.enabled = True
            self.challenge_threshold = 0.30
            self.ai_threshold = 0.35
            self.heuristic_min = 80
        
        if self.enabled and os.path.exists(self.model_path):
            try:
                self.session = ort.InferenceSession(
                    self.model_path, 
                    providers=["CPUExecutionProvider"]
                )
                print(f"-> [Liveness] Loaded anti-spoofing model successfully on CPU from {self.model_path}")
            except Exception as e:
                print(f"-> [Liveness] Error loading ONNX model: {e}. Falling back to heuristic mode.")
        elif self.enabled:
            print(f"-> [Liveness] ONNX model not found at {self.model_path}.")
            print("-> [Liveness] Falling back to heuristic texture/blur analysis. Place your ONNX model there for AI liveness detection.")
        else:
            print("-> [Liveness] Liveness detection is DISABLED by configuration.")

    def is_real_face(self, frame, bbox, threshold=0.35, pose=None) -> tuple:
        """
        Kiểm tra khuôn mặt có phải là người thật hay không.
        Trả về: (bool: True nếu là thật, float: score độ tin cậy)
        """
        if not self.enabled:
            return True, 1.0
            
        if frame is None or bbox is None:
            return False, 0.0

        x1, y1, x2, y2 = map(int, bbox)
        h, w, _ = frame.shape
        
        # Tính toán box 2.7x xung quanh tâm khuôn mặt
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        bw = x2 - x1
        bh = y2 - y1
        
        # Silent-Face-Anti-Spoofing cần scale 2.7x
        scale = 2.7
        crop_size = int(max(bw, bh) * scale)
        
        nx1 = int(cx - crop_size / 2)
        ny1 = int(cy - crop_size / 2)
        nx2 = nx1 + crop_size
        ny2 = ny1 + crop_size
        
        # Cắt vùng khuôn mặt 2.7x với Zero-Padding khi vượt biên để giữ khuôn mặt luôn vuông không bị méo
        face_crop = np.zeros((crop_size, crop_size, 3), dtype=frame.dtype)
        
        src_y1 = max(0, ny1)
        src_y2 = min(h, ny2)
        src_x1 = max(0, nx1)
        src_x2 = min(w, nx2)
        
        dst_y1 = src_y1 - ny1
        dst_y2 = dst_y1 + (src_y2 - src_y1)
        dst_x1 = src_x1 - nx1
        dst_x2 = dst_x1 + (src_x2 - src_x1)
        
        if (src_y2 > src_y1) and (src_x2 > src_x1):
            face_crop[dst_y1:dst_y2, dst_x1:dst_x2] = frame[src_y1:src_y2, src_x1:src_x2]
        else:
            return False, 0.0
        
        # Nếu có mô hình ONNX, chạy suy luận
        if self.session is not None:
            try:
                # Tiền xử lý ảnh cho Silent-Face-Anti-Spoofing (thường là scale về 80x80 hoặc 256x256)
                # Dưới đây là chuẩn hóa đầu vào mẫu: resize về 80x80, chuẩn hóa về dạng float32 CHW
                input_size = 80
                # Mô hình Silent-Face-Anti-Spoofing yêu cầu đầu vào BGR, KHÔNG ĐƯỢC chuyển sang RGB!
                resized = cv.resize(face_crop, (input_size, input_size))
                # Không chia 255.0 vì model Silent-Face-Anti-Spoofing yêu cầu pixel value gốc (0-255)
                img_data = resized.astype(np.float32)
                img_data = np.transpose(img_data, (2, 0, 1))  # HWC to CHW
                img_data = np.expand_dims(img_data, axis=0)   # Batch dim
                
                # Chạy model
                input_name = self.session.get_inputs()[0].name
                outputs = self.session.run(None, {input_name: img_data})
                
                # Phân tích kết quả đầu ra (ví dụ: softmax / logits)
                # Silent-Face-Anti-Spoofing trả về phân phối xác suất cho 3 class: Real, Fake (photo), Fake (video)
                # Phân tích kết quả đầu ra (áp dụng Softmax cho logits)
                # Dùng flatten() để tránh lỗi list/array index khi ONNX model trả về shape khác nhau
                logits = np.array(outputs[0]).flatten()
                if len(logits) == 0:
                    raise ValueError(f"Invalid ONNX output shape: {outputs}")
                    
                exp_logits = np.exp(logits - np.max(logits))
                probs = exp_logits / np.sum(exp_logits)
                
                print(f"-> [Liveness] RAW Probs: {probs}")
                
                # Theo chuẩn của mô hình Silent-Face-Anti-Spoofing: 
                # Index 0: Fake (Print attack)
                # Index 1: Real / Live Face (Người thật) -> Dùng probs[1]!
                # Index 2: Fake (Replay attack)
                real_score = float(probs[1])
                
                # Nếu người dùng đang quay đầu/ngẩng mặt để làm thử thách (yaw/pitch > 10 độ), 
                # mô hình Silent-Face vốn chỉ được huấn luyện trên mặt nhìn thẳng sẽ giảm score.
                # Hành động quay đầu chính là bằng chứng người thật đang tương tác.
                # Ngưỡng được cấu hình trong config.yaml (liveness.challenge_threshold).
                effective_threshold = threshold
                if pose is not None:
                    pitch, yaw, roll = pose
                    if abs(yaw) > 10 or abs(pitch) > 10:
                        effective_threshold = self.challenge_threshold
                
                is_real = real_score >= effective_threshold
                return is_real, real_score
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"-> [Liveness] Inference error: {e}. Falling back to heuristic.")

        # CHẾ ĐỘ FALLBACK: Phân tích kết cấu ảnh (Texture/Blur analysis)
        # Ảnh chụp lại màn hình hoặc giấy thường có độ mờ (blur) hoặc tương phản nhân tạo khác biệt.
        # Sử dụng phương sai Laplacian để phát hiện ảnh bị chụp lại từ thiết bị khác (thường bị mờ/nhiễu).
        gray = cv.cvtColor(face_crop, cv.COLOR_BGR2GRAY)
        laplacian_var = cv.Laplacian(gray, cv.CV_64F).var()
        
        # Nếu phương sai Laplacian cực thấp (< heuristic_min) hoặc quá cao do phản sáng màn hình điện thoại
        # thì có nguy cơ cao là ảnh giả mạo.
        # Ngưỡng chuẩn thông thường cho webcam thực tế là khoảng 100 - 1500.
        is_real = self.heuristic_min <= laplacian_var <= 3000.0
        
        # Chuẩn hóa score về khoảng [0, 1] cho trực quan
        score = min(1.0, max(0.0, laplacian_var / 1000.0))
        return is_real, score
