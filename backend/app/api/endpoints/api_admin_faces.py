from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud import crud_student as crud
from app.crud import crud_face as crud_face

router = APIRouter()

#API Kiểm tra dữ liệu khuôn mặt
@router.get("/{student_id}/faces")
def get_face_status(student_id: str, db: Session = Depends(get_db)):
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    faces = crud_face.get_student_faces(db, student_id=student_id)
    return {"student_id": student_id, "has_face_data": len(faces) > 0, "total_vectors": len(faces)}

#API Upload dữ liệu khuôn mặt
@router.post("/{student_id}/faces", status_code=status.HTTP_201_CREATED)
async def upload_student_face(student_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Vui lòng upload file hình ảnh")
    
    image_bytes = await file.read()
    mock_vector_data = b"MOCK_VECTOR_" + image_bytes[:20] 
    crud_face.register_face(db, student_id=student_id, face_vector_bytes=mock_vector_data)
    
    return {"message": "Đã lưu dữ liệu khuôn mặt thành công", "student_id": student_id}
    
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