import os
import shutil
import cv2 as cv
import numpy as np
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query
from fastapi.responses import JSONResponse, HTMLResponse
from core.face_analysis import FaceAnalyzer
from services.database_service import DatabaseService
from services.attendance_service import AttendanceService
from config.settings import settings

router = APIRouter()

# Khởi tạo các services dùng chung trong API
db_service = DatabaseService()
attendance_service = AttendanceService(db_service)
analyzer = FaceAnalyzer()

# Đọc cấu hình thư mục lưu ảnh chân dung đăng ký
db_config = settings.database
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
images_dir = os.path.join(project_root, db_config.get("images_dir", "./database/registered_images"))
os.makedirs(images_dir, exist_ok=True)

@router.post("/api/auth/login")
def login(username :str=Form(...), password:str=Form(...)):
    user=db_service.authenticate_user(username,password)
    if not user:
        raise HTTPException(status_code=401,detail="Ten dang nhap hoac mat khau khong dung")
        
    return {"status":"success","message":f"Dang nhap thanh cong."}
@router.post("/api/auth/register")
def register(username:str=Form(...),password:str=Form(...),mssv:str=Form(None)):
    success=db_service.register_account(username,password,mssv)
    if not success:
        raise HTTPException(status_code=500,detail="Khong the them duoc tai khoan nay")
    return {"status":"success","message":f"Tai khoan {username} da duoc tao."}
@router.get("/", response_class=HTMLResponse)
def read_root():
    template_path = os.path.join(project_root, "templates", "index.html")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Khong tim thay tep giao dien templates/index.html</h1>", status_code=404)

@router.get("/api/users")
def get_users():
    """Lấy danh sách tất cả sinh viên (Giữ lại để tương thích ngược)"""
    return get_students()

@router.get("/api/students")
def get_students():
    """Lấy danh sách tất cả sinh viên trong hệ thống"""
    try:
        students = db_service.get_all_sinh_vien()
        # Loại bỏ face_vector khỏi response để giảm tải băng thông
        for sv in students:
            sv.pop("face_vector", None)
        return {"students": students}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi truy van database: {e}")

@router.get("/api/students/{mssv}")
def get_student_by_mssv(mssv: str):
    """Lấy thông tin chi tiết một sinh viên"""
    try:
        sv = db_service.get_sinh_vien(mssv.strip().upper())
        if sv:
            sv.pop("face_vector", None)
            return sv
        raise HTTPException(status_code=404, detail=f"Khong tim thay sinh vien {mssv}")
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi lay thong tin sinh vien: {e}")

@router.post("/api/register")
async def register_student(
    mssv: str = Form(...),
    ho_ten: str = Form(...),
    lop_base: str = Form(...),
    file: UploadFile = File(...),
    ngay_sinh: str = Form(None),
    gioi_tinh: str = Form(None),
    sdt: str = Form(None),
    cccd: str = Form(None),
    dan_toc: str = Form(None),
    ton_giao: str = Form(None),
    noi_sinh: str = Form(None),
    quoc_tich: str = Form(None),
    email: str = Form(None),
    dia_chi: str = Form(None)
):
    """Đăng ký sinh viên mới và trích xuất khuôn mặt"""
    # Kiểm tra định dạng ảnh
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File gui len phai la file anh.")

    mssv = mssv.strip().upper()
    img_filename = f"{mssv}.jpg"
    temp_img_path = os.path.join(images_dir, img_filename)

    # Lưu file ảnh tạm thời lên Server để trích xuất vector khuôn mặt
    try:
        with open(temp_img_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Khong the ghi file anh: {e}")

    # Đăng ký AI Vector và thông tin vào SQLite/MySQL
    ai_success = analyzer.dang_ky_mat(
        temp_img_path, mssv, ho_ten, lop_base,
        ngay_sinh=ngay_sinh, gioi_tinh=gioi_tinh, sdt=sdt, cccd=cccd,
        dan_toc=dan_toc, ton_giao=ton_giao, noi_sinh=noi_sinh,
        quoc_tich=quoc_tich, email=email, dia_chi=dia_chi
    )
    if not ai_success:
        # Nếu AI trích xuất thất bại, xóa ảnh và trả lỗi
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        raise HTTPException(status_code=400, detail="AI khong tim thay khuon mat hop le (hoac co qua nhieu mat) trong anh.")

    return {
        "status": "success",
        "message": f"Dang ky thanh cong sinh vien {ho_ten} ({mssv})."
    }

@router.post("/api/mon_hoc")
def add_subject(ma_mon: str = Form(...), ten_mon: str = Form(...)):
    """Thêm môn học mới"""
    if db_service.add_mon_hoc(ma_mon, ten_mon):
        return {"status": "success", "message": f"Da them mon hoc: {ten_mon} ({ma_mon})"}
    raise HTTPException(status_code=500, detail="Khong the them mon hoc.")

@router.post("/api/lop_tin_chi")
def add_credit_class(ma_lop_tc: str = Form(...), ma_mon: str = Form(...)):
    """Thêm lớp tín chỉ mới"""
    if db_service.add_lop_tin_chi(ma_lop_tc, ma_mon):
        return {"status": "success", "message": f"Da them lop tin chi: {ma_lop_tc}"}
    raise HTTPException(status_code=500, detail="Khong the them lop tin chi.")

@router.post("/api/sinh_vien_lop_tin_chi")
def enroll_student(ma_lop_tc: str = Form(...), mssv: str = Form(...)):
    """Đăng ký sinh viên vào lớp tín chỉ"""
    if db_service.add_sinh_vien_vao_lop(ma_lop_tc, mssv):
        return {"status": "success", "message": f"Da dang ky sinh vien {mssv} vao lop {ma_lop_tc}"}
    raise HTTPException(status_code=500, detail="Khong the dang ky sinh vien vao lop.")

@router.post("/api/lich_hoc_chi_tiet")
def add_schedule(
    ma_lop_tc: str = Form(...),
    ngay_hoc: str = Form(...), # YYYY-MM-DD
    phong_hoc: str = Form(...),
    gio_bat_dau: str = Form(...) # HH:MM:SS
):
    """Thêm lịch học chi tiết cho lớp tín chỉ"""
    if db_service.add_lich_hoc(ma_lop_tc, ngay_hoc, phong_hoc, gio_bat_dau):
        return {"status": "success", "message": f"Da them lich hoc cho lop {ma_lop_tc} tai phong {phong_hoc}"}
    raise HTTPException(status_code=500, detail="Khong the them lich hoc.")

@router.get("/api/attendance")
def get_attendance_history():
    """Lấy danh sách lịch sử điểm danh gần đây nhất"""
    try:
        with db_service.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT lsd.id, lsd.mssv, sv.ho_ten, sv.lop_base, lsd.ma_buoi_hoc, lsd.thoi_gian_quet, lsd.trang_thai
                FROM lich_su_diem_danh lsd
                LEFT JOIN sinh_vien sv ON lsd.mssv = sv.mssv
                ORDER BY lsd.thoi_gian_quet DESC LIMIT 100
            """)
            rows = cursor.fetchall()
            logs = []
            for r in rows:
                logs.append({
                    "id": r[0],
                    "mssv": r[1],
                    "fullname": r[2] if r[2] else "N/A",
                    "lop_base": r[3] if r[3] else "N/A",
                    "ma_buoi_hoc": r[4],
                    "timestamp": r[5],
                    "trang_thai": r[6]
                })
            return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi truy van database: {e}")

@router.post("/api/recognize")
async def recognize_uploaded_image(
    file: UploadFile = File(...),
    ma_buoi_hoc: int = Query(None, description="Ma buoi hoc muon ghi nhan diem danh. Neu khong truyen, he thong tu dong tim buoi dang dien ra.")
):
    """Nhận diện khuôn mặt sinh viên và điểm danh tự động"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File gui len phai la file anh.")

    # Đọc file ảnh từ bộ nhớ
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv.imdecode(nparr, cv.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Khong the giai ma file anh: {e}")

    if img is None:
        raise HTTPException(status_code=400, detail="Anh bi loi hoac khong the doc.")

    # Nhận diện khuôn mặt
    faces_results = analyzer.recognize_image(img)
    
    recognized_faces = []
    for face in faces_results:
        mssv = face["name"]
        score = face["score"]
        is_known = face["is_known"]
        ho_ten = "Unknown"
        lop_base = "Unknown"

        if is_known:
            # Ghi nhận điểm danh
            attendance_service.record_attendance(mssv, ma_buoi_hoc, score)
            # Lấy thông tin sinh viên
            sv_info = db_service.get_sinh_vien(mssv)
            if sv_info:
                ho_ten = sv_info["ho_ten"]
                lop_base = sv_info["lop_base"]
        
        recognized_faces.append({
            "box": face["box"],
            "mssv": mssv,
            "fullname": ho_ten,
            "lop_base": lop_base,
            "score": score,
            "is_known": is_known
        })

    return {
        "faces_detected": len(recognized_faces),
        "results": recognized_faces
    }
