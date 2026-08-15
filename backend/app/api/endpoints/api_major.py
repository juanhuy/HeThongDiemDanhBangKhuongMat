from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

from app.db.session import get_db
from app.schemas.major import MajorCreate, MajorUpdate, MajorResponse
from app.crud import crud_major as crud
from app.models.major import Major
from app.models.faculty import Faculty
from app.core.require import get_current_user, require_admin

router = APIRouter()

@router.get("", response_model=List[MajorResponse], dependencies=[Depends(get_current_user)])
@router.get("/", response_model=List[MajorResponse], dependencies=[Depends(get_current_user)])
def get_all_majors(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_majors(db, skip=skip, limit=limit)

@router.get("/{major_id}", response_model=MajorResponse, dependencies=[Depends(get_current_user)])
def get_major(major_id: str, db: Session = Depends(get_db)):
    db_obj = crud.get_major(db, major_id=major_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy Ngành")
    return db_obj

@router.post("/", response_model=MajorResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_major(major: MajorCreate, db: Session = Depends(get_db)):
    db_obj = crud.get_major(db, major_id=major.major_id)
    if db_obj:
        raise HTTPException(status_code=400, detail="Mã Ngành đã tồn tại")
    return crud.create_major(db=db, major=major)

@router.put("/{major_id}", response_model=MajorResponse, dependencies=[Depends(require_admin)])
def update_major(major_id: str, major_update: MajorUpdate, db: Session = Depends(get_db)):
    db_obj = crud.get_major(db, major_id=major_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy Ngành")
    return crud.update_major(db=db, db_major=db_obj, major_update=major_update)

@router.delete("/{major_id}", dependencies=[Depends(require_admin)])
def delete_major(major_id: str, db: Session = Depends(get_db)):
    from app.models.student import Student
    db_obj = crud.get_major(db, major_id=major_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy Ngành")
    n_sv = db.query(Student).filter(Student.major_id == major_id.strip()).count()
    if n_sv > 0:
        raise HTTPException(status_code=400,
                            detail=f"Không thể xóa Ngành {major_id}: còn {n_sv} sinh viên đang theo học.")
    crud.delete_major(db=db, major_id=major_id)
    return {"message": f"Đã xóa Ngành {major_id}"}

@router.post("/import/csv", dependencies=[Depends(require_admin)])
async def import_majors_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        contents = await file.read()
        try:
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        except Exception:
            try:
                df = pd.read_csv(io.StringIO(contents.decode('cp1252')))
            except Exception:
                raise HTTPException(status_code=400, detail="Không thể đọc file CSV. Vui lòng kiểm tra định dạng encoding.")
        
        imported = 0
        for _, row in df.iterrows():
            maj_id = str(row.get('major_id', '')).strip()
            if not maj_id or maj_id.lower() == 'nan':
                continue
            
            existing = crud.get_major(db, major_id=maj_id)
            if existing:
                continue
                
            faculty_id = str(row.get('faculty_id', '')).strip()
            if not faculty_id or faculty_id.lower() == 'nan':
                faculty_id = None
            else:
                # Kiểm tra khoa tồn tại chưa, nếu chưa có thể auto tạo hoặc bỏ qua
                existing_fac = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
                if not existing_fac:
                    new_fac = Faculty(faculty_id=faculty_id, faculty_name=faculty_id)
                    db.add(new_fac)
                    db.flush()
            
            new_major = Major(
                major_id=maj_id,
                major_name=str(row.get('major_name', maj_id)).strip(),
                faculty_id=faculty_id,
                degree_level=str(row.get('degree_level', 'Bachelors')).strip() if pd.notna(row.get('degree_level')) and str(row.get('degree_level')).strip() != 'nan' else 'Bachelors'
            )
            db.add(new_major)
            imported += 1
        
        db.commit()
        return {"message": f"Đã import thành công {imported} Ngành"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Lỗi import: {str(e)}")
