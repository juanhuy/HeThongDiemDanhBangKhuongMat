import cv2 as cv
import numpy as np
import insightface
from insightface.app import FaceAnalysis
import os

# ==========================================
# PHẦN 1: TOÁN HỌC SO KHỚP VECTOR BẰNG NUMPY
# ==========================================
def tinh_cosine_similarity(vector_a, vector_b):
    """
    Tính độ tương đồng Cosine giữa 2 vector đặc trưng A và B.
    Công thức: Cosine_Similarity = (A . B) / (||A|| * ||B||)
    Nếu 2 vector đã được chuẩn hóa (độ dài/norm = 1), công thức chỉ đơn giản là tích vô hướng A . B
    """
    # 1. Tính tích vô hướng (Dot Product) của A và B
    tich_vo_huong = np.dot(vector_a, vector_b)
    
    # 2. Tính độ dài (L2 norm) của từng vector
    do_dai_a = np.linalg.norm(vector_a)
    do_dai_b = np.linalg.norm(vector_b)
    
    # 3. Áp dụng công thức Cosine Similarity
    cosine_score = tich_vo_huong / (do_dai_a * do_dai_b)
    
    return cosine_score, do_dai_a, do_dai_b


# ==========================================
# PHẦN 2: THIẾT LẬP AI VÀ CƠ SỞ DỮ LIỆU
# ==========================================
# Khởi tạo mô hình AI phát hiện và trích xuất đặc trưng khuôn mặt
app = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(640, 640))

db_path = "./face_database"

# Nạp database khuôn mặt mẫu đã lưu
known_embeddings = []
known_names = []

if os.path.exists(db_path):
    for file_name in os.listdir(db_path):
        if file_name.endswith(".npy"):
            name = os.path.splitext(file_name)[0]
            embedding = np.load(os.path.join(db_path, file_name))
            known_embeddings.append(embedding)
            known_names.append(name)
            
print(f"➔ Đã nạp thành công {len(known_names)} khuôn mặt từ database.")


# ==========================================
# PHẦN 3: ĐỌC CAMERA VÀ XỬ LÝ NHẬN DIỆN
# ==========================================
cap = cv.VideoCapture(0)
threshold = 0.65  # Ngưỡng nhận diện tin cậy (65%)

print("Đang mở camera... Nhấn phím 'q' trên cửa sổ camera để thoát.")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Không thể đọc được ảnh từ camera!")
        break
        
    # Phát hiện các khuôn mặt trong khung hình hiện tại
    faces = app.get(frame)
    
    for face in faces:
        # Lấy tọa độ hộp giới hạn (Bounding Box)
        bbox = face.bbox.astype(int)
        x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
        
        # Lấy vector đặc trưng của khuôn mặt hiện tại
        current_emb = face.normed_embedding  # Hoặc dùng face.embedding để thử nghiệm vector chưa chuẩn hóa
        
        # So sánh khuôn mặt này với tất cả các khuôn mặt trong database
        best_name = "Unknown"
        best_score = -1.0
        
        for idx, db_emb in enumerate(known_embeddings):
            # TỰ TÍNH TOÁN ĐỘ TƯƠNG ĐỒNG BẰNG HÀM NUMPY ĐÃ VIẾT Ở PHẦN 1
            score, norm_a, norm_b = tinh_cosine_similarity(db_emb, current_emb)
            
            # Cập nhật kết quả khớp tốt nhất
            if score > best_score:
                best_score = score
                best_name = known_names[idx]
        
        # Lọc kết quả qua ngưỡng (threshold)
        if best_score > threshold:
            display_name = f"{best_name.split('_')[0]} ({best_score:.2f})"
            color = (0, 255, 0) # Màu xanh lá cây nếu nhận diện đúng
        else:
            display_name = f"Unknown ({best_score:.2f})"
            color = (0, 0, 255) # Màu đỏ nếu không khớp
            
        # Vẽ hộp giới hạn xung quanh khuôn mặt
        cv.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        
        # Hiển thị tên và điểm số lên phía trên hộp
        cv.putText(frame, display_name, (x1, y1 - 10), cv.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
    # Hiển thị kết quả ra màn hình
    cv.imshow("Hoc Nhan Dien Khuon Mat", frame)
    
    # Thoát nếu bấm phím 'q'
    if cv.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv.destroyAllWindows()
