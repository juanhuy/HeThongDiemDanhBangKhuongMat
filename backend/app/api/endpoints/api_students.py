# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from typing import List

# from app.db.session import get_db
# from app.schemas import student as schemas
# from app.crud import crud_student as crud

# router = APIRouter()

# @router.post("/", response_model=schemas.StudentResponse, status_code=status.HTTP_201_CREATED)
# def create_new_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
#     """API Tạo mới một hồ sơ sinh viên"""
#     db_student = crud.get_student(db, student_id=student.student_id)
#     if db_student:
#         raise HTTPException(status_code=400, detail="Mã số sinh viên đã tồn tại trong hệ thống")
#     return crud.create_student(db=db, student=student)

# @router.get("/", response_model=List[schemas.StudentResponse])
# def read_all_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
#     """API Lấy danh sách toàn bộ sinh viên (hỗ trợ phân trang)"""
#     return crud.get_students(db, skip=skip, limit=limit)

# @router.get("/{student_id}", response_model=schemas.StudentResponse)
# def read_student_by_id(student_id: str, db: Session = Depends(get_db)):
#     """API Lấy thông tin chi tiết của một sinh viên"""
#     db_student = crud.get_student(db, student_id=student_id)
#     if db_student is None:
#         raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
#     return db_student

# @router.put("/{student_id}", response_model=schemas.StudentResponse)
# def update_existing_student(student_id: str, student_in: schemas.StudentUpdate, db: Session = Depends(get_db)):
#     """API Cập nhật thông tin sinh viên"""
#     db_student = crud.get_student(db, student_id=student_id)
#     if db_student is None:
#         raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên để cập nhật")
#     return crud.update_student(db=db, db_student=db_student, student_update=student_in)

# @router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
# def remove_student(student_id: str, db: Session = Depends(get_db)):
#     """API Xóa hồ sơ sinh viên"""
#     db_student = crud.get_student(db, student_id=student_id)
#     if db_student is None:
#         raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên để xóa")
#     crud.delete_student(db=db, student_id=student_id)
#     return None