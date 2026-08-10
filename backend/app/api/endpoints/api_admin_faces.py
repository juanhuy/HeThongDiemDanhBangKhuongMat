from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil

from app.db.session import get_db
from app.crud import crud_student as crud
from app.crud import crud_face as crud_face
from app.api.endpoints.api_ai import analyzer, images_dir

router = APIRouter()

#API Kiểm tra dữ liệu khuôn mặt
@router.get("/{student_id}/faces")
def get_face_status(student_id: str, db: Session = Depends(get_db)):
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    faces = crud_face.get_student_faces(db, student_id=student_id)
    return {"student_id": student_id, "has_face_data": len(faces) > 0, "total_vectors": len(faces)}

#API Upload dữ liệu khuôn mặt bằng AI thật
@router.post("/{student_id}/faces", status_code=status.HTTP_201_CREATED)
async def upload_student_face(student_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")

    from app.core.uploads import validate_and_read_image, write_image
    data, ext = validate_and_read_image(file)
    temp_img_path = write_image(images_dir, student_id, data, ext)
    
    # Sử dụng FaceAnalyzer thực tế để trích xuất vector khuôn mặt và ghi vào database
    success = analyzer.dang_ky_mat(
        temp_img_path, 
        mssv=student_id, 
        ho_ten=db_student.full_name, 
        lop_base=db_student.administrative_class
    )
    
    if not success:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        raise HTTPException(status_code=400, detail="AI không tìm thấy khuôn mặt hợp lệ (hoặc có quá nhiều mặt) trong ảnh.")
    
    return {"message": "Đã lưu dữ liệu khuôn mặt thành công bằng AI", "student_id": student_id}
    
#API Xóa dữ liệu khuôn mặt
@router.delete("/{student_id}/faces", status_code=status.HTTP_204_NO_CONTENT)
def reset_student_face(student_id: str, db: Session = Depends(get_db)):
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    deleted = crud_face.delete_student_faces(db, student_id=student_id)
    if deleted == 0:
        raise HTTPException(status_code=400, detail="Sinh viên này chưa có dữ liệu khuôn mặt")
    return None