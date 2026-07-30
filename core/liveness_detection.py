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
        
        # Thử tải mô hình ONNX
        if os.path.exists(self.model_path):
            try:
                self.session = ort.InferenceSession(self.model_path, providers=["CPUExecutionProvider"])
                print(f"-> [Liveness] Loaded anti-spoofing model successfully from {self.model_path}")
            except Exception as e:
                print(f"-> [Liveness] Error loading ONNX model: {e}. Falling back to heuristic mode.")
        else:
            print(f"-> [Liveness] ONNX model not found at {self.model_path}.")
            print("-> [Liveness] Falling back to heuristic texture/blur analysis. Place your ONNX model there for AI liveness detection.")

    def is_real_face(self, frame, bbox, threshold=0.7) -> tuple:
        """
        Kiểm tra khuôn mặt có phải là người thật hay không.
        Trả về: (bool: True nếu là thật, float: score độ tin cậy)
        """
        if frame is None or bbox is None:
            return False, 0.0

        x1, y1, x2, y2 = map(int, bbox)
        h, w, _ = frame.shape
        
        # Tránh lỗi tràn biên ảnh
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        if (x2 - x1) <= 0 or (y2 - y1) <= 0:
            return False, 0.0

        # Cắt vùng khuôn mặt
        face_crop = frame[y1:y2, x1:x2]
        
        # Nếu có mô hình ONNX, chạy suy luận
        if self.session is not None:
            try:
                # Tiền xử lý ảnh cho Silent-Face-Anti-Spoofing (thường là scale về 80x80 hoặc 256x256)
                # Dưới đây là chuẩn hóa đầu vào mẫu: resize về 80x80, chuẩn hóa về dạng float32 CHW
                input_size = 80
                resized = cv.resize(face_crop, (input_size, input_size))
                img_data = resized.astype(np.float32)
                img_data = np.transpose(img_data, (2, 0, 1))  # HWC to CHW
                img_data = np.expand_dims(img_data, axis=0)   # Batch dim
                
                # Chạy model
                input_name = self.session.get_inputs()[0].name
                outputs = self.session.run(None, {input_name: img_data})
                
                # Phân tích kết quả đầu ra (ví dụ: softmax / logits)
                # Silent-Face-Anti-Spoofing trả về phân phối xác suất cho 3 class: Real, Fake (photo), Fake (video)
                prob = outputs[0][0]
                real_score = float(prob[0])  # Xác suất lớp 0 là người thật (tùy thuộc vào cấu trúc của model cụ thể)
                
                # Giả định lớp đầu tiên/lớn nhất là real
                is_real = real_score >= threshold
                return is_real, real_score
            except Exception as e:
                print(f"-> [Liveness] Inference error: {e}. Falling back to heuristic.")

        # CHẾ ĐỘ FALLBACK: Phân tích kết cấu ảnh (Texture/Blur analysis)
        # Ảnh chụp lại màn hình hoặc giấy thường có độ mờ (blur) hoặc tương phản nhân tạo khác biệt.
        # Sử dụng phương sai Laplacian để phát hiện ảnh bị chụp lại từ thiết bị khác (thường bị mờ/nhiễu).
        gray = cv.cvtColor(face_crop, cv.COLOR_BGR2GRAY)
        laplacian_var = cv.Laplacian(gray, cv.CV_64F).var()
        
        # Nếu phương sai Laplacian cực thấp (< 80) hoặc quá cao do phản sáng màn hình điện thoại
        # thì có nguy cơ cao là ảnh giả mạo.
        # Ngưỡng chuẩn thông thường cho webcam thực tế là khoảng 100 - 1500.
        is_real = 80.0 <= laplacian_var <= 3000.0
        
        # Chuẩn hóa score về khoảng [0, 1] cho trực quan
        score = min(1.0, max(0.0, laplacian_var / 1000.0))
        return is_real, score
