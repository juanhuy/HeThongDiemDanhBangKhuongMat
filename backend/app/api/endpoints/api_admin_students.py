from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io

from app.db.session import get_db
from app.schemas import student as schemas
from app.crud import crud_student as crud

router = APIRouter()

# Hàm helper để map Object DB (có Profile lồng nhau) thành schema phẳng
def map_student_to_schema(student: Student) -> dict:
    return {
        "student_id": student.student_id,
        "account_id": student.profile.account_id if student.profile else None,
        "profile_id": student.profile_id,
        "full_name": student.profile.full_name if student.profile else "",
        "email": student.profile.personal_email if student.profile else "",
        "phone_number": student.profile.phone_number if student.profile else "",
        "administrative_class": student.administrative_class,
        "major": student.major,
        "cohort": student.cohort,
        "training_program": student.training_program,
        "academic_status": student.academic_status
    }

@router.get("/", response_model=List[schemas.StudentResponse])
def get_all_students(
    skip: int = 0, limit: int = 100, 
    search: Optional[str] = None, 
    status: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    students = crud.get_students(db, skip=skip, limit=limit, search=search, status=status)
    return [map_student_to_schema(s) for s in students]

@router.get("/export")
def export_students_to_excel(db: Session = Depends(get_db)):
    students = crud.get_students(db, skip=0, limit=10000)
    
    data = []
    for s in students:
        data.append({
            "MSSV": s.student_id,
            "Họ và Tên": s.profile.full_name if s.profile else "",
            "Email": s.profile.personal_email if s.profile else "",
            "Số điện thoại": s.profile.phone_number if s.profile else "",
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
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    return map_student_to_schema(db_student)

@router.post("/", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
def create_new_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    db_student = crud.get_student(db, student_id=student.student_id)
    if db_student:
        raise HTTPException(status_code=400, detail="Mã sinh viên đã tồn tại")
    
    new_student = crud.create_student(db=db, student=student)
    return map_student_to_schema(new_student)

@router.put("/{student_id}", response_model=schemas.StudentResponse)
def update_existing_student(student_id: str, student_in: schemas.StudentUpdate, db: Session = Depends(get_db)):
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
        
    updated_student = crud.update_student(db=db, db_student=db_student, student_update=student_in)
    return map_student_to_schema(updated_student)

@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_students_from_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Vui lòng upload file Excel (.xlsx)")
    
    try:
        contents = file.file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        success_count = 0
        for index, row in df.iterrows():
            student_id = str(row.get("MSSV", "")).strip()
            if not student_id or crud.get_student(db, student_id=student_id):
                continue
                
            student_data = schemas.StudentCreate(
                student_id=student_id,
                full_name=str(row.get("Họ và Tên", "")),
                email=str(row.get("Email", "")) if pd.notna(row.get("Email")) else None,
                phone_number=str(row.get("Số điện thoại", "")) if pd.notna(row.get("Số điện thoại")) else None,
                administrative_class=str(row.get("Lớp hành chính", "")) if pd.notna(row.get("Lớp hành chính")) else None,
                major="Công nghệ thông tin",
                academic_status="Đang học"
            )
            crud.create_student(db=db, student=student_data)
            success_count += 1
            
        return {"message": f"Đã import thành công {success_count} sinh viên."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi đọc file: {str(e)}")