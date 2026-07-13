from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.schemas import lecturer as schemas
from app.crud import crud_lecturer as crud

router = APIRouter()

@router.get("/", response_model=List[schemas.LecturerResponse])
def read_all_lecturers(skip: int = 0, limit: int = 100, search: Optional[str] = None, db: Session = Depends(get_db)):
    """Lấy danh sách giảng viên (Hỗ trợ phân trang và tìm kiếm)"""
    return crud.get_lecturers(db, skip=skip, limit=limit, search=search)

@router.post("/", response_model=schemas.LecturerResponse, status_code=status.HTTP_201_CREATED)
def create_new_lecturer(lecturer: schemas.LecturerCreate, db: Session = Depends(get_db)):
    """Thêm mới giảng viên (Tự động tạo tài khoản đăng nhập)"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer.lecturer_id)
    if db_lecturer:
        raise HTTPException(status_code=400, detail="Mã giảng viên đã tồn tại")
    return crud.create_lecturer(db=db, lecturer=lecturer)

@router.put("/{lecturer_id}", response_model=schemas.LecturerResponse)
def update_existing_lecturer(lecturer_id: str, lecturer_in: schemas.LecturerUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin giảng viên và Khóa/Mở khóa tài khoản"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer_id)
    if not db_lecturer:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")
    return crud.update_lecturer(db=db, db_lecturer=db_lecturer, lecturer_update=lecturer_in)