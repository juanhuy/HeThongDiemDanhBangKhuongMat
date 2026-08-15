from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
from fastapi import UploadFile, File
from pydantic import ValidationError

from app.db.session import get_db
from app.schemas.classroom import ClassroomCreate, ClassroomUpdate, ClassroomResponse, ImportResponse
from app.crud import crud_classroom as crud
from app.core.require import get_current_user, require_admin, require_roles

router = APIRouter()

@router.get("/", response_model=List[ClassroomResponse], dependencies=[Depends(require_roles("giang_vien","admin"))])
def read_all_classrooms(skip: int = 0, limit: int = 200, search: Optional[str] = None, status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_classrooms(db, skip=skip, limit=limit, search=search, status=status_filter)

@router.get("/{room_id}", response_model=ClassroomResponse, dependencies=[Depends(require_roles("giang_vien","admin"))])
def read_classroom_by_id(room_id: str, db: Session = Depends(get_db)):
    db_room = crud.get_classroom(db, room_id=room_id)
    if not db_room:
        raise HTTPException(status_code=404, detail="Khong tim thay phong hoc")
    return db_room

@router.post("/", response_model=ClassroomResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_new_classroom(classroom: ClassroomCreate, db: Session = Depends(get_db)):
    # Bỏ qua check trùng ID nếu FE không gửi room_id lên
    if classroom.room_id:
        db_room = crud.get_classroom(db, room_id=classroom.room_id)
        if db_room:
            raise HTTPException(status_code=400, detail="Ma phong hoc da ton tai")
            
    # FIX LỖI 1: Sửa "classroom=classroom" thành "obj_in=classroom"
    return crud.create_classroom(db=db, obj_in=classroom)

@router.put("/{room_id}", response_model=ClassroomResponse, dependencies=[Depends(require_admin)])
def update_existing_classroom(room_id: str, classroom_in: ClassroomUpdate, db: Session = Depends(get_db)):
    # FIX LỖI 2: Phải tìm db_room ra trước
    db_room = crud.get_classroom(db, room_id=room_id)
    if not db_room:
        raise HTTPException(status_code=404, detail="Khong tim thay phong hoc")
        
    # Sau đó mới gọi hàm update truyền db_obj vào
    return crud.update_classroom(db=db, db_obj=db_room, obj_in=classroom_in)

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_existing_classroom(room_id: str, db: Session = Depends(get_db)):
    # Chặn xóa khi phòng đang được dùng trong buổi học / lịch học
    from app.models import ClassSession, ClassSchedule
    n_sess = db.query(ClassSession).filter(ClassSession.room_id == room_id.strip()).count()
    n_sched = db.query(ClassSchedule).filter(
        (ClassSchedule.room_id == room_id.strip()) | (ClassSchedule.room == room_id.strip())).count()
    if n_sess + n_sched > 0:
        raise HTTPException(status_code=400,
                            detail=f"Không thể xóa phòng {room_id}: đang được dùng trong {n_sess + n_sched} buổi/lịch học.")
    db_room = crud.delete_classroom(db, room_id=room_id)
    if not db_room:
        raise HTTPException(status_code=404, detail="Khong tim thay phong hoc")
    return None

@router.post("/import", response_model=ImportResponse, status_code=status.HTTP_200_OK, dependencies=[Depends(require_admin)])
async def import_classrooms_from_csv(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Import danh sách phòng học từ file CSV.
    Yêu cầu file CSV phải có các cột (Header) tương ứng với ClassroomCreate schema.
    """
    # 1. Kiểm tra định dạng file
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Vui lòng upload file định dạng .csv")

    # 2. Đọc nội dung file
    try:
        content = await file.read()
        # Decode file với chuẩn UTF-8 (chuẩn cho tiếng Việt)
        decoded_content = content.decode('utf-8-sig') 
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Lỗi định dạng file. Vui lòng lưu file CSV ở chuẩn UTF-8.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể đọc file: {str(e)}")

    # 3. Parse CSV
    csv_reader = csv.DictReader(io.StringIO(decoded_content))
    
    # Kiểm tra xem file có rỗng hoặc thiếu header không
    if not csv_reader.fieldnames:
        raise HTTPException(status_code=400, detail="File CSV rỗng hoặc không có dòng Header (tiêu đề cột)")

    success_count = 0
    errors = []
    
    # 4. Duyệt qua từng dòng và Insert vào Database
    # Bắt đầu từ 2 vì dòng 1 là Header
    for row_idx, row in enumerate(csv_reader, start=2):
        try:
            # Xử lý data: Loại bỏ khoảng trắng thừa ở key và value.
            # Nếu value rỗng ("") thì chuyển thành None để Pydantic lấy giá trị default
            cleaned_row = {}
            for k, v in row.items():
                if k:  # Đảm bảo tên cột không bị rỗng
                    val = v.strip() if v else None
                    cleaned_row[k.strip()] = val if val != "" else None

            # Bỏ qua nếu dòng trống hoàn toàn
            if not any(cleaned_row.values()):
                continue

            # Validate dữ liệu bằng Pydantic Schema
            classroom_in = ClassroomCreate(**cleaned_row)
            
            # Lưu vào Database thông qua hàm CRUD có sẵn
            crud.create_classroom(db=db, obj_in=classroom_in)
            success_count += 1
            
        except ValidationError as e:
            # Lỗi do thiếu trường bắt buộc hoặc sai kiểu dữ liệu (VD: capacity không phải số nguyên)
            error_msg = "; ".join([f"{err['loc'][0]}: {err['msg']}" for err in e.errors()])
            errors.append({"row": row_idx, "error": f"Lỗi xác thực: {error_msg}"})
        except Exception as e:
            # Các lỗi khác (VD: trùng ID nếu import kèm ID)
            errors.append({"row": row_idx, "error": f"Lỗi hệ thống: {str(e)}"})

    return ImportResponse(
        total_processed=success_count + len(errors),
        success_count=success_count,
        error_count=len(errors),
        errors=errors
    )