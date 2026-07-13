from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas import subject as schemas
from app.crud import crud_subject as crud

router = APIRouter()

@router.post("/", response_model=schemas.SubjectResponse)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db)):
    db_obj = crud.get_subject_by_id(db, subject_id=subject.subject_id)
    if db_obj:
        raise HTTPException(status_code=400, detail="Mã môn học đã tồn tại")
    return crud.create_subject(db=db, subject=subject)

@router.get("/", response_model=List[schemas.SubjectResponse])
def read_subjects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    subjects = crud.get_subjects(db, skip=skip, limit=limit)
    return subjects