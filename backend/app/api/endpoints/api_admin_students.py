from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io

from app.db.session import get_db
from app.schemas import StudentCreate, StudentUpdate, StudentResponse
from app.crud import crud_student as crud

router = APIRouter()

# =========================================================================
# 1. API Lấy danh sách sinh viên
# =========================================================================
@router.get("/", response_model=List[StudentResponse])
def get_all_students(
    skip: int = 0, limit: int = 100, 
    search: Optional[str] = None, 
    status: Optional[str] = None, 
    lecturer_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lấy danh sách sinh viên (Hỗ trợ phân trang, tìm kiếm theo tên/MSSV, lọc trạng thái, lọc giảng viên phụ trách)"""
    return crud.get_students(db, skip=skip, limit=limit, search=search, status=status, lecturer_id=lecturer_id)


# =========================================================================
# 2. API Lấy chi tiết hồ sơ sinh viên
# =========================================================================
@router.get("/{student_id}", response_model=StudentResponse)
def get_student_detail(student_id: str, db: Session = Depends(get_db)):
    """Xem chi tiết hồ sơ một sinh viên"""
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    return db_student


# =========================================================================
# 3. API Thêm mới một sinh viên
# =========================================================================
@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_new_student(student: StudentCreate, db: Session = Depends(get_db)):
    """Thêm mới một sinh viên (Tự động tạo Account -> UserProfile -> Student)"""
    db_student = crud.get_student(db, student_id=student.student_id)
    if db_student:
        raise HTTPException(status_code=400, detail="Mã sinh viên đã tồn tại")
    return crud.create_student(db=db, student=student)


# =========================================================================
# 4. API Cập nhật thông tin sinh viên
# =========================================================================
@router.put("/{student_id}", response_model=StudentResponse)
def update_existing_student(student_id: str, student_in: StudentUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin sinh viên (Tự động cập nhật UserProfile và khóa tài khoản nếu cần)"""
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    return crud.update_student(db=db, db_student=db_student, student_update=student_in)


# =========================================================================
# 5. API Xóa sinh viên
# =========================================================================
@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_student(student_id: str, db: Session = Depends(get_db)):
    """Xóa một sinh viên và tài khoản liên quan"""
    db_student = crud.get_student(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
    
    # Ở cấu trúc Database mới, khi xoá Account thì các bảng UserProfile và Student 
    # sẽ tự động bị xoá hoặc set null tùy theo cấu hình khóa ngoại.
    if db_student.profile and db_student.profile.account_id:
        from app.models.account import Account
        account = db.query(Account).filter(Account.account_id == db_student.profile.account_id).first()
        if account:
            db.delete(account)
            
    crud.delete_student(db=db, student_id=student_id)
    return None


# =========================================================================
# 6. API Export danh sách sinh viên ra file Excel
# =========================================================================
@router.get("/export/excel")
def export_students_to_excel(db: Session = Depends(get_db)):
    """Xuất toàn bộ danh sách sinh viên ra file Excel"""
    students = crud.get_students(db, skip=0, limit=10000) 
    
    data = []
    for s in students:
        data.append({
            "MSSV": s.student_id,
            "Họ và Tên": s.profile.full_name if s.profile else "N/A",
            "Email": s.profile.personal_email if s.profile else "N/A",
            "Số điện thoại": s.profile.phone_number if s.profile else "N/A",
            "Lớp hành chính": s.administrative_class or "N/A",
            "Trạng thái": s.academic_status or "N/A"
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


# =========================================================================
# 7. API Import danh sách sinh viên hàng loạt từ file Excel
# =========================================================================
@router.post("/import/excel", status_code=status.HTTP_201_CREATED)
def import_students_from_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import danh sách sinh viên hàng loạt từ file Excel"""
    if not file.filename.endswith(('.xls', '.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Vui lòng upload file Excel (.xlsx, .xls) hoặc file .csv")
    
    try:
        contents = file.file.read()
        if file.filename.endswith('.csv'):
            # Đọc CSV (xử lý BOM nếu có, utf-8), ép kiểu string để không mất số 0 ở đầu
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8-sig', dtype=str)
        else:
            df = pd.read_excel(io.BytesIO(contents), dtype=str)
        
        success_count = 0
        
        def get_val(row, keys, default=None):
            for key in keys:
                if key in row:
                    val = row[key]
                    if pd.notna(val) and str(val).strip() not in ["", "nan"]:
                        return str(val).strip()
            return default

        for index, row in df.iterrows():
            # Hỗ trợ lấy theo tên cột Tiếng Việt hoặc Tiếng Anh (từ file dssv.csv)
            student_id = get_val(row, ["MSSV", "student_id"])
            if not student_id or crud.get_student(db, student_id=student_id):
                continue # Bỏ qua nếu dòng trống hoặc sinh viên đã tồn tại
                
            # Xử lý tự động sinh email
            generated_email = f"{student_id.lower()}@student.ptithcm.edu.vn"
                
            student_data = StudentCreate(
                student_id=student_id,
                full_name=get_val(row, ["Họ và Tên", "full_name", "Tên"], ""),
                email=generated_email,
                phone_number=get_val(row, ["Số điện thoại", "phone_number"]),
                administrative_class=get_val(row, ["Lớp hành chính", "administrative_class_id", "administrative_class"]),
                major_id=get_val(row, ["Ngành học", "major_id"]),
                specialization=get_val(row, ["Chuyên ngành", "specialization"]),
                faculty_id=get_val(row, ["Khoa", "faculty_id"]),
                cohort=get_val(row, ["Khóa", "Niên khóa", "cohort"]),
                training_program=get_val(row, ["Hệ đào tạo", "Bậc hệ đào tạo", "training_program"]),
                academic_status=get_val(row, ["Trạng thái", "academic_status"], "Đang học"),
                gender=get_val(row, ["Giới tính", "gender"]),
                citizen_id=get_val(row, ["CMND", "CCCD", "citizen_id"]),
                ethnicity=get_val(row, ["Dân tộc", "ethnicity"]),
                religion=get_val(row, ["Tôn giáo", "religion"]),
                nationality=get_val(row, ["Quốc tịch", "nationality"], "Việt Nam"),
                place_of_birth=get_val(row, ["Nơi sinh", "place_of_birth"]),
                address=get_val(row, ["Địa chỉ", "address"])
            )

            # Xử lý ngày sinh
            dob_val = row.get("Ngày sinh", row.get("date_of_birth"))
            if pd.notna(dob_val):
                try:
                    dob = pd.to_datetime(dob_val).date()
                    student_data.date_of_birth = dob
                except Exception:
                    pass
            crud.create_student(db=db, student=student_data)
            success_count += 1
            
        return {"status": "success", "message": f"Đã import thành công {success_count} sinh viên."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi đọc file hoặc ghi database: {str(e)}")