from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.account import Account
from app.models.student import Student
from app.models.lecturer import Lecturer
from app.core.security import get_password_hash, verify_password

router = APIRouter()

@router.post("/login")
def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    username_lower = username.strip().lower()
    account = db.query(Account).filter(Account.username == username_lower).first()
    if not account or not verify_password(password, account.password_hash):
        raise HTTPException(status_code=401, detail="Ten dang nhap hoac mat khau khong dung")
    
    # Lấy thông tin sinh viên hoặc giảng viên liên kết nếu có
    student_info = None
    lecturer_info = None
    if account.role in ["sinh_vien", "student"]:
        from app.models import UserProfile
        student = db.query(Student).join(UserProfile).filter(UserProfile.account_id == account.account_id).first()
        if student:
            student_info = student
    elif account.role in ["giang_vien", "lecturer"]:
        from app.models import UserProfile
        lecturer = db.query(Lecturer).join(UserProfile).filter(UserProfile.account_id == account.account_id).first()
        if lecturer:
            lecturer_info = lecturer
    
    user_data = {
        "username": account.username,
        "role": account.role,
        "mssv": student_info.student_id if student_info else None,
        "lecturer_id": lecturer_info.lecturer_id if lecturer_info else None,
        "ho_ten": student_info.full_name if student_info else (lecturer_info.full_name if lecturer_info else None),
        "lop_base": student_info.administrative_class if student_info else None
    }
    
    return {"status": "success", "message": "Dang nhap thanh cong.", "user": user_data}

@router.post("/register")
def register(username: str = Form(...), password: str = Form(...), mssv: str = Form(None), db: Session = Depends(get_db)):
    username_lower = username.strip().lower()
    existing_account = db.query(Account).filter(Account.username == username_lower).first()
    if existing_account:
        raise HTTPException(status_code=400, detail="Tai khoan da ton tai.")
    
    # Kiểm tra xem sinh viên có tồn tại không
    student = None
    if mssv:
        student = db.query(Student).filter(Student.student_id == mssv.strip().upper()).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Khong tim thay sinh vien {mssv} de lien ket tai khoan.")
    
    new_account = Account(
        username=username_lower,
        password_hash=get_password_hash(password),
        role="sinh_vien" if mssv else "giang_vien"
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    
    if student:
        if not student.profile:
            from app.models import UserProfile
            profile = UserProfile(
                account_id=new_account.account_id,
                full_name=student.student_id
            )
            db.add(profile)
            db.flush()
            student.profile_id = profile.profile_id
        else:
            student.profile.account_id = new_account.account_id
        db.commit()
        
    return {"status": "success", "message": f"Tai khoan {username} da duoc tao."}
