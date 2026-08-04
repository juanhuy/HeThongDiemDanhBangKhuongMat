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
from app.schemas.lecturer import ImportResponse

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

# =========================================================================
# 6. API Import danh sách giảng viên từ CSV
# =========================================================================
@router.post("/import", response_model=ImportResponse, status_code=status.HTTP_200_OK)
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
            # 1. Làm sạch dữ liệu: Xoá khoảng trắng, đổi "" thành None
            cleaned_row = {}
            for k, v in row.items():
                if k:
                    val = v.strip() if v else None
                    cleaned_row[k.strip()] = val if val != "" else None

            # Bỏ qua nếu dòng rỗng
            if not any(cleaned_row.values()):
                continue

            # 2. Check thủ công mã GV nếu có truyền (Tránh crash database)
            lecturer_id = cleaned_row.get("lecturer_id")
            if lecturer_id:
                existing_gv = crud.get_lecturer(db, lecturer_id=lecturer_id)
                if existing_gv:
                    errors.append({"row": row_idx, "error": f"Mã giảng viên {lecturer_id} đã tồn tại."})
                    continue

            # 3. Validate dữ liệu qua Pydantic
            lecturer_in = LecturerCreate(**cleaned_row)
            
            # 4. Lưu vào Database
            crud.create_lecturer(db=db, lecturer=lecturer_in)
            success_count += 1

        except ValidationError as e:
            # Lỗi Pydantic (Sai format email, ngày tháng...)
            error_msg = "; ".join([f"{err['loc'][0]}: {err['msg']}" for err in e.errors()])
            errors.append({"row": row_idx, "error": f"Lỗi nhập liệu: {error_msg}"})
            
        except IntegrityError as e:
            # LỖI QUAN TRỌNG: Trùng lặp Unique Key (Email, CCCD) hoặc sai Khóa ngoại (faculty_id)
            db.rollback() # Bắt buộc phải rollback transaction hiện tại để các dòng sau có thể chạy tiếp
            error_detail = str(e.orig)
            errors.append({"row": row_idx, "error": f"Lỗi CSDL (Có thể trùng Email/CCCD hoặc sai Mã Khoa): {error_detail}"})
            
        except Exception as e:
            # Lỗi hệ thống khác
            db.rollback()
            errors.append({"row": row_idx, "error": f"Lỗi hệ thống: {str(e)}"})

    return ImportResponse(
        total_processed=success_count + len(errors),
        success_count=success_count,
        error_count=len(errors),
        errors=errors
    )