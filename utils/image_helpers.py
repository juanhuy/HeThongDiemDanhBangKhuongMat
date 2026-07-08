import cv2 as cv
import numpy as np

# Hàm phụ trợ loại bỏ dấu Tiếng Việt nếu hệ thống không dùng PIL để tránh hiển thị lỗi font trên OpenCV
def strip_vietnamese_accents(text):
    patterns = {
        '[àáảãạăằắẳẵặâầấẩẫậ]': 'a',
        '[ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬ]': 'A',
        '[đ]': 'd',
        '[Đ]': 'D',
        '[èéẻẽẹêềếểễệ]': 'e',
        '[ÈÉEẺẼẸÊỀẾỂỄỆ]': 'E',
        '[ìíỉĩị]': 'i',
        '[ÌÍỈĨỊ]': 'I',
        '[òóỏõọôồốổỗộơờớởỡợ]': 'o',
        '[ÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]': 'O',
        '[ùúủũụưừứửữự]': 'u',
        '[ÙÚỦŨỤƯỪỨỬỮỰ]': 'U',
        '[ỳýỷỹỵ]': 'y',
        '[ỲÝỶỸỴ]': 'Y'
    }
    import re
    output = text
    for pattern, replace in patterns.items():
        output = re.sub(pattern, replace, output)
    return output

def draw_face_info(frame, box, name, score, is_known=True):
    """Vẽ bounding box và nhãn thông tin khuôn mặt lên khung hình"""
    x1, y1, x2, y2 = box
    color = (0, 255, 0) if is_known else (0, 0, 255)
    
    # Vẽ hộp bao quanh khuôn mặt (bo góc nhẹ)
    cv.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    
    # Hiển thị thông tin tên và độ tin cậy
    display_text = f"{name} ({score:.2f})"
    
    # Chuyển đổi ký tự tiếng Việt có dấu thành không dấu để tránh hiển thị lỗi trên OpenCV
    display_text_safe = strip_vietnamese_accents(display_text)
    
    # Vẽ nhãn nền cho text
    label_size, base_line = cv.getTextSize(display_text_safe, cv.FONT_HERSHEY_SIMPLEX, 0.6, 2)
    y1_label = max(y1, label_size[1] + 10)
    cv.rectangle(frame, (x1, y1_label - label_size[1] - 10), (x1 + label_size[0], y1_label + base_line - 10), color, cv.FILLED)
    
    # Viết text màu đen (hoặc trắng) lên nhãn nền
    cv.putText(frame, display_text_safe, (x1, y1_label - 7), cv.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2, cv.LINE_AA)
