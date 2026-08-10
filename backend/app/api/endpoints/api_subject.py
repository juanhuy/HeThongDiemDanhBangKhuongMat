from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas import subject as schemas
from app.crud import crud_subject as crud
from app.core.require import require_admin, get_current_user
from app.core.audit import log_audit

router = APIRouter()

#API Tạo mới môn học
@router.post("/", response_model=schemas.SubjectResponse, dependencies=[Depends(require_admin)])
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db),
                   current_user: dict = Depends(get_current_user)):
    db_obj = crud.get_subject_by_id(db, subject_id=subject.subject_id)
    if db_obj:
        raise HTTPException(status_code=400, detail="Mã môn học đã tồn tại")
    created = crud.create_subject(db=db, subject=subject)
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="CREATE", target="subjects", target_id=subject.subject_id, detail=f"Tạo môn học {subject.subject_name}")
    return created

#API Cập nhật thông tin môn học
@router.put("/{subject_id}", response_model=schemas.SubjectResponse, dependencies=[Depends(require_admin)])
def update_subject(subject_id: str, subject: schemas.SubjectUpdate, db: Session = Depends(get_db),
                   current_user: dict = Depends(get_current_user)):
    db_obj = crud.update_subject(db, subject_id=subject_id, subject_update=subject)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="UPDATE", target="subjects", target_id=subject_id,
              detail=f"Cập nhật môn học: {subject.model_dump(exclude_unset=True)}")
    return db_obj

#API Lấy danh sách tất cả môn học (đã đăng nhập)
@router.get("/", response_model=List[schemas.SubjectResponse], dependencies=[Depends(get_current_user)])
def read_subjects(
    skip: int = 0, 
    limit: int = 100, 
    query: str | None = None,  
    db: Session = Depends(get_db)
):
    if query:
        return crud.search_subjects(db, query=query)
    # Nếu không có từ khóa, trả về danh sách mặc định
    return crud.get_subjects(db, skip=skip, limit=limit)

#API Xóa môn học (chỉ admin; lớp tín chỉ liên quan bị xóa theo CASCADE)
@router.delete("/{subject_id}", dependencies=[Depends(require_admin)])
def delete_subject(subject_id: str, db: Session = Depends(get_db),
                   current_user: dict = Depends(get_current_user)):
    db_obj = crud.delete_subject(db, subject_id=subject_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="DELETE", target="subjects", target_id=subject_id, detail="Xóa môn học")
    return {"message": f"Đã xóa môn học {subject_id}"}