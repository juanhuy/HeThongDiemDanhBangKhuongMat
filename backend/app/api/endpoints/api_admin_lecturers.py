from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.schemas import lecturer as schemas
from app.crud import crud_lecturer as crud
from app.core.require import get_current_user
from app.core.audit import log_audit

router = APIRouter()

#API Lấy danh sách giảng viên
@router.get("/", response_model=List[schemas.LecturerResponse])
def read_all_lecturers(skip: int = 0, limit: int = 100, search: Optional[str] = None, db: Session = Depends(get_db)):
    """Lấy danh sách giảng viên (Hỗ trợ phân trang và tìm kiếm)"""
    return crud.get_lecturers(db, skip=skip, limit=limit, search=search)

#API Thêm mới giảng viên
@router.post("/", response_model=schemas.LecturerResponse, status_code=status.HTTP_201_CREATED)
def create_new_lecturer(lecturer: schemas.LecturerCreate, db: Session = Depends(get_db),
                        current_user: dict = Depends(get_current_user)):
    """Thêm mới giảng viên (Tự động tạo tài khoản đăng nhập)"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer.lecturer_id)
    if db_lecturer:
        raise HTTPException(status_code=400, detail="Mã giảng viên đã tồn tại")
    created = crud.create_lecturer(db=db, lecturer=lecturer)
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="CREATE", target="lecturers", target_id=lecturer.lecturer_id,
              detail=f"Tạo giảng viên {lecturer.full_name}")
    return created

#API Cập nhật thông tin giảng viên
@router.put("/{lecturer_id}", response_model=schemas.LecturerResponse)
def update_existing_lecturer(lecturer_id: str, lecturer_in: schemas.LecturerUpdate, db: Session = Depends(get_db),
                             current_user: dict = Depends(get_current_user)):
    """Cập nhật thông tin giảng viên và Khóa/Mở khóa tài khoản"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer_id)
    if not db_lecturer:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")
    updated = crud.update_lecturer(db=db, db_lecturer=db_lecturer, lecturer_update=lecturer_in)
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="UPDATE", target="lecturers", target_id=lecturer_id,
              detail=f"Cập nhật giảng viên: {lecturer_in.model_dump(exclude_unset=True)}")
    return updated

#API Xóa giảng viên
@router.delete("/{lecturer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_lecturer(lecturer_id: str, db: Session = Depends(get_db),
                             current_user: dict = Depends(get_current_user)):
    """Xóa giảng viên (khóa tài khoản liên kết)"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer_id)
    if not db_lecturer:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")
    crud.delete_lecturer(db=db, lecturer_id=lecturer_id)
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="DELETE", target="lecturers", target_id=lecturer_id, detail="Xóa giảng viên")
    return None