from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.schemas import LecturerCreate, LecturerUpdate, LecturerResponse
from app.crud import crud_lecturer as crud

router = APIRouter()

# =========================================================================
# 1. API Lấy danh sách giảng viên
# =========================================================================
@router.get("/", response_model=List[LecturerResponse])
def read_all_lecturers(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """Lấy danh sách giảng viên (Hỗ trợ phân trang và tìm kiếm theo Tên hoặc Mã GV)"""
    return crud.get_lecturers(db, skip=skip, limit=limit, search=search)


# =========================================================================
# 2. API Lấy chi tiết hồ sơ một giảng viên
# =========================================================================
@router.get("/{lecturer_id}", response_model=LecturerResponse)
def read_lecturer_by_id(lecturer_id: str, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết của một giảng viên cụ thể"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer_id)
    if not db_lecturer:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")
    return db_lecturer


# =========================================================================
# 3. API Thêm mới giảng viên
# =========================================================================
@router.post("/", response_model=LecturerResponse, status_code=status.HTTP_201_CREATED)
def create_new_lecturer(lecturer: LecturerCreate, db: Session = Depends(get_db)):
    # Nếu Frontend không gửi lecturer_id, tự động sinh mã mới
    if not lecturer.lecturer_id:
        lecturer.lecturer_id = crud.generate_lecturer_id(db) # (Hoặc hàm tự sinh mã của bạn)
        
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer.lecturer_id)
    if db_lecturer:
        raise HTTPException(status_code=400, detail="Mã giảng viên đã tồn tại trong hệ thống")
    return crud.create_lecturer(db=db, lecturer=lecturer)


# =========================================================================
# 4. API Cập nhật thông tin giảng viên
# =========================================================================
@router.put("/{lecturer_id}", response_model=LecturerResponse)
def update_existing_lecturer(lecturer_id: str, lecturer_in: LecturerUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin giảng viên. Tự động Khóa/Mở khóa tài khoản nếu thay đổi trạng thái giảng dạy."""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer_id)
    if not db_lecturer:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")
    return crud.update_lecturer(db=db, db_lecturer=db_lecturer, lecturer_update=lecturer_in)


# =========================================================================
# 5. API Xóa giảng viên
# =========================================================================
@router.delete("/{lecturer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_lecturer(lecturer_id: str, db: Session = Depends(get_db)):
    """Xóa một giảng viên và tài khoản liên quan ra khỏi hệ thống"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer_id)
    if not db_lecturer:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")
    
    # Xoá Account (Các bảng liên kết như UserProfile và Lecturer sẽ xử lý tự động qua Foreign Key)
    if db_lecturer.profile and db_lecturer.profile.account_id:
        from app.models.account import Account
        account = db.query(Account).filter(Account.account_id == db_lecturer.profile.account_id).first()
        if account:
            db.delete(account)
            
    db.delete(db_lecturer)
    db.commit()
    return None