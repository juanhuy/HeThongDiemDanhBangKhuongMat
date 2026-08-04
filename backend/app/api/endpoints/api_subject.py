from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
from app.models.subject import Subject

from app.db.session import get_db
from app.schemas import SubjectCreate, SubjectUpdate, SubjectResponse
from app.crud import crud_subject as crud

router = APIRouter()

# =========================================================================
# 1. API Lấy danh sách môn học
# =========================================================================
@router.get("/", response_model=List[SubjectResponse])
def read_subjects(
    skip: int = 0, 
    limit: int = 100, 
    query: Optional[str] = None,  
    db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả môn học. Hỗ trợ tìm kiếm theo mã hoặc tên môn."""
    if query:
        return crud.search_subjects(db, query=query)
    return crud.get_subjects(db, skip=skip, limit=limit)


# =========================================================================
# 2. API Xem chi tiết 1 môn học
# =========================================================================
@router.get("/{subject_id}", response_model=SubjectResponse)
def read_subject_by_id(subject_id: str, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết của một môn học"""
    db_obj = crud.get_subject_by_id(db, subject_id=subject_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
    return db_obj


# =========================================================================
# 3. API Tạo mới môn học
# =========================================================================
@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(subject: SubjectCreate, db: Session = Depends(get_db)):
    """Thêm môn học mới (Lưu ý: credits sẽ được DB tự động tính)"""
    db_obj = crud.get_subject_by_id(db, subject_id=subject.subject_id)
    if db_obj:
        raise HTTPException(status_code=400, detail="Mã môn học đã tồn tại")
    return crud.create_subject(db=db, subject=subject)


# =========================================================================
# 4. API Cập nhật môn học
# =========================================================================
@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(subject_id: str, subject: SubjectUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin môn học"""
    db_obj = crud.update_subject(db, subject_id=subject_id, subject_update=subject)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
    return db_obj

# =========================================================================
# 5. API Import môn học từ CSV
# =========================================================================
@router.post("/import/csv")
async def import_subjects_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    from app.models.faculty import Faculty
    try:
        contents = await file.read()
        try:
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        except Exception:
            try:
                df = pd.read_csv(io.StringIO(contents.decode('cp1252')))
            except Exception:
                raise HTTPException(status_code=400, detail="Không thể đọc file CSV. Vui lòng kiểm tra định dạng encoding (UTF-8).")
        
        imported = 0
        
        # Build map of faculty_name -> faculty_id (case-insensitive) to resolve department names
        faculties = db.query(Faculty).all()
        faculty_name_map = {f.faculty_name.strip().lower(): f.faculty_id for f in faculties if f.faculty_name}
        
        # Add some common aliases from the CSV that don't match the DB perfectly
        alias_map = {
            "khoa cntt 2": "FIT2",
            "khoa điện tử 2": "FTE2", # Map Điện tử to Viễn thông 2
        }
        
        for _, row in df.iterrows():
            sub_id = str(row.get('subject_id', '')).strip()
            if not sub_id or sub_id.lower() == 'nan':
                continue
            
            existing = db.query(Subject).filter(Subject.subject_id == sub_id).first()
            if existing:
                continue
            
            theory = int(row.get('theory_credits', 0)) if pd.notna(row.get('theory_credits')) else 0
            practical = int(row.get('practical_credits', 0)) if pd.notna(row.get('practical_credits')) else 0
            
            raw_faculty = str(row.get('faculty_id', row.get('department', 'N/A'))).strip()
            
            # Try to resolve raw_faculty as a name
            resolved_faculty_id = faculty_name_map.get(raw_faculty.lower())
            if not resolved_faculty_id:
                resolved_faculty_id = alias_map.get(raw_faculty.lower())
            
            # If still not found, check if it's already a valid ID
            if not resolved_faculty_id:
                check_id = db.query(Faculty).filter(Faculty.faculty_id == raw_faculty).first()
                if check_id:
                    resolved_faculty_id = check_id.faculty_id
                else:
                    resolved_faculty_id = None # Set to None to avoid FK constraint error

            new_subject = Subject(
                subject_id=sub_id,
                subject_name=str(row.get('subject_name', '')).strip(),
                theory_credits=theory,
                practical_credits=practical,
                faculty_id=resolved_faculty_id,
                is_active=str(row.get('is_active', 'True')).strip().lower() in ['true', '1', 't', 'yes']
            )
            db.add(new_subject)
            imported += 1
        
        db.commit()
        return {"message": f"Đã import thành công {imported} môn học"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Lỗi import: {str(e)}")