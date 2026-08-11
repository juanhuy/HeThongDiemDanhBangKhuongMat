from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

from app.db.session import get_db
from app.schemas.faculty import FacultyCreate, FacultyUpdate, FacultyResponse
from app.crud import crud_faculty as crud
from app.models.faculty import Faculty
from app.core.require import get_current_user, require_admin

router = APIRouter()

@router.get("", response_model=List[FacultyResponse], dependencies=[Depends(get_current_user)])
@router.get("/", response_model=List[FacultyResponse], dependencies=[Depends(get_current_user)])
def get_all_faculties(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_faculties(db, skip=skip, limit=limit)

@router.get("/{faculty_id}", response_model=FacultyResponse, dependencies=[Depends(get_current_user)])
def get_faculty(faculty_id: str, db: Session = Depends(get_db)):
    db_obj = crud.get_faculty(db, faculty_id=faculty_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy Khoa")
    return db_obj

@router.post("/", response_model=FacultyResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_faculty(faculty: FacultyCreate, db: Session = Depends(get_db)):
    db_obj = crud.get_faculty(db, faculty_id=faculty.faculty_id)
    if db_obj:
        raise HTTPException(status_code=400, detail="Mã Khoa đã tồn tại")
    return crud.create_faculty(db=db, faculty=faculty)

@router.put("/{faculty_id}", response_model=FacultyResponse, dependencies=[Depends(require_admin)])
def update_faculty(faculty_id: str, faculty_update: FacultyUpdate, db: Session = Depends(get_db)):
    db_obj = crud.get_faculty(db, faculty_id=faculty_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy Khoa")
    return crud.update_faculty(db=db, db_faculty=db_obj, faculty_update=faculty_update)

@router.post("/import/csv", dependencies=[Depends(require_admin)])
async def import_faculties_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
            fac_id = str(row.get('faculty_id', '')).strip()
            if not fac_id or fac_id.lower() == 'nan':
                continue
            
            existing = crud.get_faculty(db, faculty_id=fac_id)
            if existing:
                continue
            
            new_faculty = Faculty(
                faculty_id=fac_id,
                faculty_name=str(row.get('faculty_name', fac_id)).strip(),
                dean_id=str(row.get('dean_id', '')).strip() if pd.notna(row.get('dean_id')) and str(row.get('dean_id')).strip() != 'nan' else None,
                office_room=str(row.get('office_room', '')).strip() if pd.notna(row.get('office_room')) and str(row.get('office_room')).strip() != 'nan' else None,
                phone_number=str(row.get('phone_number', '')).strip() if pd.notna(row.get('phone_number')) and str(row.get('phone_number')).strip() != 'nan' else None,
                status=str(row.get('status', 'Active')).strip() if pd.notna(row.get('status')) and str(row.get('status')).strip() != 'nan' else 'Active'
            )
            db.add(new_faculty)
            imported += 1
        
        db.commit()
        return {"message": f"Đã import thành công {imported} Khoa"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Lỗi import: {str(e)}")
