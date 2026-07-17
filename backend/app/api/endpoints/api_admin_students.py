from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io

from app.db.session import get_db
from app.schemas import student as schemas
from app.crud import crud_student as crud

from app.crud import crud_face
from fastapi import UploadFile, File

router = APIRouter()

@router.get("/", response_model=List[schemas.StudentResponse])
def get_all_students(
    skip: int = 0, limit: int = 100, 
    search: Optional[str] = None, 
    status: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """Lấy danh sách sinh viên (Hỗ trợ phân trang, tìm kiếm theo tên/MSSV, lọc trạng thái)"""
    return crud.get_students(db, skip=skip, limit=limit, search=search, status=status)

@router.get("/export")
def export_students_to_excel(db: Session = Depends(get_db)):
    """Xuất toàn bộ danh sách sinh viên ra file Excel"""
    students = crud.get_students(db, skip=0, limit=10000) # Lấy tối đa 10,000 dòng theo yêu cầu thiết kế
    
    data = []
    for s in students:
        data.append({
            "MSSV": s.student_id,
            "Họ và Tên": s.full_name,
            "Email": s.email,
            "Số điện thoại": s.phone_number,
            "Lớp hành chính": s.administrative_class,
            "Trạng thái": s.academic_status
        })
        
    df = pd.DataFrame(data)
    stream = io.BytesIO()
    with pd.ExcelWriter(stream, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name="DanhSachSinhVien")
    stream.seek(0)
    
    return StreamingResponse(
        stream, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        headers={"Content-Disposition": "attachment; filename=students_export.xlsx"}
    )

@router.get("/{student_id}", response_model=schemas.StudentResponse)
def get_student_detail(student_id: str, db: Session = Depends(get_db)):
    """Xem chi tiết hồ sơ một sinh viên"""
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    return db_student

@router.post("/", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
def create_new_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    """Thêm mới một sinh viên và tự động tạo tài khoản"""
    db_student = crud.get_student(db, student_id=student.student_id)
    if db_student:
        raise HTTPException(status_code=400, detail="Mã sinh viên đã tồn tại")
    return crud.create_student(db=db, student=student)

@router.put("/{student_id}", response_model=schemas.StudentResponse)
def update_existing_student(student_id: str, student_in: schemas.StudentUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin sinh viên (Tự động khóa tài khoản nếu thôi học/tốt nghiệp)"""
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    return crud.update_student(db=db, db_student=db_student, student_update=student_in)

@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_students_from_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import danh sách sinh viên hàng loạt từ file Excel"""
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Vui lòng upload file Excel (.xlsx)")
    
    try:
        contents = file.file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        success_count = 0
        for index, row in df.iterrows():
            # Ánh xạ cột Excel vào Model (Giả định cột trong Excel là: MSSV, Họ và Tên, Email...)
            student_id = str(row.get("MSSV", "")).strip()
            if not student_id or crud.get_student(db, student_id=student_id):
                continue # Bỏ qua nếu không có mã hoặc mã đã tồn tại
                
            student_data = schemas.StudentCreate(
                student_id=student_id,
                full_name=str(row.get("Họ và Tên", "")),
                email=str(row.get("Email", "")),
                phone_number=str(row.get("Số điện thoại", "")) if pd.notna(row.get("Số điện thoại")) else None,
                administrative_class=str(row.get("Lớp hành chính", "")) if pd.notna(row.get("Lớp hành chính")) else None,
                major="Công nghệ thông tin",
                academic_status="studying"
            )
            crud.create_student(db=db, student=student_data)
            success_count += 1
            
        return {"message": f"Đã import thành công {success_count} sinh viên."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi đọc file: {str(e)}")


# #--------------------------------------------
# #--------API nghiep vu face ----------
# #
# @router.get("/{student_id}/faces")
# def get_face_status(student_id: str, db: Session = Depends(get_db)):
#     """Kiểm tra trạng thái dữ liệu khuôn mặt của sinh viên"""
#     db_student = crud.get_student(db, student_id=student_id)
#     if not db_student:
#         raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
        
#     faces = crud_face.get_student_faces(db, student_id=student_id)
#     return {
#         "student_id": student_id,
#         "has_face_data": len(faces) > 0,
#         "total_vectors": len(faces)
#     }

# @router.post("/{student_id}/faces", status_code=status.HTTP_201_CREATED)
# async def upload_student_face(student_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
#     """Admin tải ảnh lên để trích xuất và lưu mẫu khuôn mặt (MOCK AI CORE)"""
#     # 1. Kiểm tra sinh viên có tồn tại không
#     db_student = crud.get_student(db, student_id=student_id)
#     if not db_student:
#         raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
        
#     # 2. Đọc file ảnh đầu vào
#     if not file.content_type.startswith("image/"):
#         raise HTTPException(status_code=400, detail="Vui lòng upload file hình ảnh")
    
#     image_bytes = await file.read()
    
#     # --- MOCK AI CORE TRÍCH XUẤT VECTOR ---
#     # Trong thực tế, đoạn này sẽ gửi image_bytes sang AI Core API và nhận về Float32 Array
#     # Ở đây ta giả lập biến đổi mảng bytes của ảnh thành một đoạn bytes giả định của Vector
#     mock_vector_data = b"MOCK_VECTOR_" + image_bytes[:20] 
#     # ---------------------------------------
    
#     # 3. Lưu vào DB
#     crud_face.register_face(db, student_id=student_id, face_vector_bytes=mock_vector_data)
    
#     return {"message": "Đã trích xuất và lưu dữ liệu khuôn mặt thành công", "student_id": student_id}

# @router.delete("/{student_id}/faces", status_code=status.HTTP_204_NO_CONTENT)
# def reset_student_face(student_id: str, db: Session = Depends(get_db)):
#     """Thực hiện Reset (Xóa) dữ liệu khuôn mặt của sinh viên"""
#     db_student = crud.get_student(db, student_id=student_id)
#     if not db_student:
#         raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
        
#     deleted = crud_face.delete_student_faces(db, student_id=student_id)
#     if deleted == 0:
#         raise HTTPException(status_code=400, detail="Sinh viên này chưa có dữ liệu khuôn mặt để xóa")
#     return None

@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    """Xóa tài khoản và hồ sơ sinh viên"""
    try:
        from app.models.student import Student
        from app.models.account import Account
        db_student = db.query(Student).filter(Student.student_id == student_id).first()
        if not db_student:
            raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
        
        if db_student.account_id:
            account = db.query(Account).filter(Account.account_id == db_student.account_id).first()
            if account:
                db.delete(account)
        
        db.delete(db_student)
        db.commit()
        return {"status": "success", "message": "Xóa sinh viên và tài khoản thành công"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")