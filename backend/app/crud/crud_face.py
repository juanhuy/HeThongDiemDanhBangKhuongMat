from sqlalchemy.orm import Session
from app.models.face_feature import FaceFeature

def get_student_faces(db: Session, student_id: str):
    """Lấy danh sách các vector khuôn mặt của sinh viên"""
    return db.query(FaceFeature).filter(FaceFeature.student_id == student_id).all()

def register_face(db: Session, student_id: str, face_vector_bytes: bytes):
    """Lưu vector khuôn mặt mới, xóa hoặc vô hiệu hóa các vector cũ"""
    # Xóa các dữ liệu khuôn mặt cũ của sinh viên này để Reset (Theo nghiệp vụ)
    db.query(FaceFeature).filter(FaceFeature.student_id == student_id).delete()
    
    # Tạo bản ghi mới
    new_face = FaceFeature(
        student_id=student_id,
        face_vector=face_vector_bytes,
        is_primary=True
    )
    db.add(new_face)
    db.commit()
    db.refresh(new_face)
    return new_face

def delete_student_faces(db: Session, student_id: str):
    """Thực hiện chức năng Reset (Xóa) dữ liệu khuôn mặt"""
    deleted_count = db.query(FaceFeature).filter(FaceFeature.student_id == student_id).delete()
    db.commit()
    return deleted_count