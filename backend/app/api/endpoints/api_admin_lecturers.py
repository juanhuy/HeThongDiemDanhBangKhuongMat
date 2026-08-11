import csv
import io
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.schemas import LecturerCreate, LecturerUpdate, LecturerResponse
from app.crud import crud_lecturer as crud
from app.core.require import get_current_user, require_admin, require_roles
from app.core.audit import log_audit
from app.schemas.lecturer import ImportResponse

router = APIRouter()

# =========================================================================
# 1. API Lấy danh sách giảng viên
# =========================================================================
@router.get("", response_model=List[LecturerResponse], dependencies=[Depends(require_roles("giang_vien", "admin"))])
@router.get("/", response_model=List[LecturerResponse], dependencies=[Depends(require_roles("giang_vien", "admin"))])
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
@router.get("/{lecturer_id}", response_model=LecturerResponse, dependencies=[Depends(require_roles("giang_vien", "admin"))])
def read_lecturer_by_id(lecturer_id: str, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết của một giảng viên cụ thể"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer_id)
    if not db_lecturer:
        from app.models import Account
        account = db.query(Account).filter(Account.username == lecturer_id.strip().lower()).first()
        if account:
            return {
                "lecturer_id": lecturer_id.upper(),
                "full_name": account.username,
                "email": f"{account.username}@ptit.edu.vn",
                "phone_number": "N/A",
                "faculty_id": "N/A",
                "academic_title": "Giảng viên",
                "degree": "Thạc sĩ",
                "department": "CNTT"
            }
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")
    return db_lecturer


# =========================================================================
# 3. API Thêm mới giảng viên
# =========================================================================
@router.post("/", response_model=LecturerResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_new_lecturer(
    lecturer: LecturerCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Thêm mới giảng viên (Tự động tạo tài khoản đăng nhập)"""
    if not lecturer.lecturer_id:
        lecturer.lecturer_id = crud.generate_lecturer_id(db)
        
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer.lecturer_id)
    if db_lecturer:
        raise HTTPException(status_code=400, detail="Mã giảng viên đã tồn tại")
    created = crud.create_lecturer(db=db, lecturer=lecturer)
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="CREATE", target="lecturers", target_id=lecturer.lecturer_id,
              detail=f"Tạo giảng viên {lecturer.full_name}")
    return created


# =========================================================================
# 4. API Cập nhật thông tin giảng viên
# =========================================================================
@router.put("/{lecturer_id}", response_model=LecturerResponse, dependencies=[Depends(require_admin)])
def update_existing_lecturer(
    lecturer_id: str, 
    lecturer_in: LecturerUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cập nhật thông tin giảng viên và Khóa/Mở khóa tài khoản"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer_id)
    if not db_lecturer:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")
    updated = crud.update_lecturer(db=db, db_lecturer=db_lecturer, lecturer_update=lecturer_in)
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="UPDATE", target="lecturers", target_id=lecturer_id,
              detail=f"Cập nhật giảng viên: {lecturer_in.model_dump(exclude_unset=True)}")
    return updated


# =========================================================================
# 5. API Xóa giảng viên
# =========================================================================
@router.delete("/{lecturer_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_existing_lecturer(
    lecturer_id: str, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Xóa giảng viên (khóa tài khoản liên kết)"""
    db_lecturer = crud.get_lecturer(db, lecturer_id=lecturer_id)
    if not db_lecturer:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng viên")
    crud.delete_lecturer(db=db, lecturer_id=lecturer_id)
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="DELETE", target="lecturers", target_id=lecturer_id, detail="Xóa giảng viên")
    return None


# =========================================================================
# 6. API Import danh sách giảng viên từ CSV
# =========================================================================
@router.post("/import", response_model=ImportResponse, status_code=status.HTTP_200_OK, dependencies=[Depends(require_admin)])
async def import_lecturers_from_csv(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Import hàng loạt giảng viên từ file CSV.
    - Hỗ trợ tự sinh mã GV nếu cột lecturer_id bỏ trống.
    - Định dạng ngày sinh (date_of_birth) bắt buộc: YYYY-MM-DD
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Vui lòng upload file định dạng .csv")

    try:
        content = await file.read()
        decoded_content = content.decode('utf-8-sig') # Chuẩn UTF-8 để không bị lỗi font Tiếng Việt
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Lỗi định dạng file. Vui lòng lưu file CSV ở chuẩn UTF-8.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể đọc file: {str(e)}")

    csv_reader = csv.DictReader(io.StringIO(decoded_content))
    
    if not csv_reader.fieldnames:
        raise HTTPException(status_code=400, detail="File CSV rỗng hoặc không có Header")

    success_count = 0
    errors = []

    for row_idx, row in enumerate(csv_reader, start=2):
        try:
            cleaned_row = {}
            for k, v in row.items():
                if k:
                    val = v.strip() if v else None
                    cleaned_row[k.strip()] = val if val != "" else None

            if not any(cleaned_row.values()):
                continue

            lecturer_id = cleaned_row.get("lecturer_id")
            if lecturer_id:
                existing_gv = crud.get_lecturer(db, lecturer_id=lecturer_id)
                if existing_gv:
                    errors.append({"row": row_idx, "error": f"Mã giảng viên {lecturer_id} đã tồn tại."})
                    continue

            lecturer_in = LecturerCreate(**cleaned_row)
            crud.create_lecturer(db=db, lecturer=lecturer_in)
            success_count += 1

        except ValidationError as e:
            error_msg = "; ".join([f"{err['loc'][0]}: {err['msg']}" for err in e.errors()])
            errors.append({"row": row_idx, "error": f"Lỗi nhập liệu: {error_msg}"})
            
        except IntegrityError as e:
            db.rollback()
            error_detail = str(e.orig)
            errors.append({"row": row_idx, "error": f"Lỗi CSDL (Có thể trùng Email/CCCD hoặc sai Mã Khoa): {error_detail}"})
            
        except Exception as e:
            db.rollback()
            errors.append({"row": row_idx, "error": f"Lỗi hệ thống: {str(e)}"})

    return ImportResponse(
        total_processed=success_count + len(errors),
        success_count=success_count,
        error_count=len(errors),
        errors=errors
    )
