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
        
    return {"status": "success", "message": "Dang nhap thanh cong.", "user": user}
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
    ma_buoi_hoc: int = Query(None, description="Mã buổi học muốn ghi nhận."),
    phong_hoc: str = Query(None, description="Tên phòng học từ Camera gửi lên.")
):
    """Nhận diện khuôn mặt sinh viên và điểm danh tự động theo quy trình 6 bước"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File gửi lên phải là file ảnh.")

    # Đọc file ảnh từ bộ nhớ
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv.imdecode(nparr, cv.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không thể giải mã file ảnh: {e}")

    if img is None:
        raise HTTPException(status_code=400, detail="Ảnh bị lỗi hoặc không thể đọc.")

    # Nhận diện khuôn mặt qua AI
    faces_results = analyzer.recognize_image(img)
    
    recognized_faces = []
    for face in faces_results:
        mssv = face["name"]
        score = face["score"]
        is_known = face["is_known"]
        ho_ten = "Unknown"
        lop_base = "Unknown"
        trang_thai = "Chưa xác định"

        # Chạy quy trình điểm danh tự động cho sinh viên này
        success, msg, sv_info = attendance_service.record_attendance(
            mssv, ma_buoi_hoc=ma_buoi_hoc, phong_hoc=phong_hoc, score=score
        )

        if not success:
            # Nếu gặp bất kỳ lỗi logic điểm danh nào, hủy và báo lỗi tương ứng
            raise HTTPException(status_code=400, detail=msg)
        
        if sv_info:
            ho_ten = sv_info["ho_ten"]
            lop_base = sv_info["lop_base"]
            trang_thai = msg

        recognized_faces.append({
            "box": face["box"],
            "mssv": mssv,
            "fullname": ho_ten,
            "lop_base": lop_base,
            "score": score,
            "is_known": is_known,
            "trang_thai": trang_thai
        })

    return {
        "faces_detected": len(recognized_faces),
        "results": recognized_faces
    }

@router.get("/api/admin/pending_faces")
def get_pending_faces():
    """Lấy danh sách sinh viên đang chờ duyệt khuôn mặt"""
    try:
        conn = db_service.get_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT mssv, ho_ten, lop_base, ngay_cap_nhat_anh, trang_thai_ho_so 
                FROM sinh_vien 
                WHERE trang_thai_ho_so = 'Pending'
            """)
            rows = cursor.fetchall()
            pending = []
            for r in rows:
                pending.append({
                    "mssv": r[0],
                    "ho_ten": r[1],
                    "lop_base": r[2],
                    "ngay_cap_nhat_anh": str(r[3]),
                    "trang_thai": r[4]
                })
            return {"pending": pending}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.post("/api/admin/approve_face")
def approve_face(mssv: str = Form(...)):
    """Phòng Đào Tạo duyệt hồ sơ ảnh khuôn mặt"""
    success = db_service.approve_face_registration(mssv.strip().upper())
    if success:
        return {"status": "success", "message": f"Đã duyệt hồ sơ khuôn mặt cho {mssv}"}
    raise HTTPException(status_code=500, detail="Không thể duyệt hồ sơ.")

@router.post("/api/student/leave_request")
def submit_leave_request(
    mssv: str = Form(...),
    ma_buoi_hoc: int = Form(...),
    ly_do: str = Form(...),
    minh_chung: str = Form("Chưa có")
):
    """Sinh viên nộp đơn xin nghỉ phép kèm minh chứng"""
    success = db_service.submit_leave_request(mssv.strip().upper(), ma_buoi_hoc, ly_do, minh_chung)
    if success:
        return {"status": "success", "message": "Đã gửi đơn xin nghỉ phép thành công."}
    raise HTTPException(status_code=500, detail="Không thể nộp đơn xin nghỉ phép.")

@router.get("/api/teacher/leave_requests")
def get_leave_requests(ma_lop_tc: str = Query(None)):
    """Giảng viên xem danh sách các đơn xin nghỉ phép"""
    requests = db_service.get_leave_requests(ma_lop_tc)
    return {"requests": requests}

@router.post("/api/teacher/approve_leave")
def approve_leave(request_id: int = Form(...), nguoi_duyet: str = Form(...)):
    """Giảng viên duyệt đơn xin nghỉ phép (Trạng thái chuyên cần cập nhật thành 'Có phép')"""
    success = db_service.approve_leave_request(request_id, nguoi_duyet)
    if success:
        return {"status": "success", "message": "Đã duyệt đơn nghỉ phép."}
    raise HTTPException(status_code=500, detail="Không thể duyệt đơn.")

@router.post("/api/teacher/reject_leave")
def reject_leave(request_id: int = Form(...), nguoi_duyet: str = Form(...)):
    """Giảng viên từ chối đơn xin nghỉ phép"""
    success = db_service.reject_leave_request(request_id, nguoi_duyet)
    if success:
        return {"status": "success", "message": "Đã từ chối đơn nghỉ phép."}
    raise HTTPException(status_code=500, detail="Không thể từ chối đơn.")

@router.post("/api/teacher/manual_checkin")
def manual_checkin(
    mssv: str = Form(...),
    ma_buoi_hoc: int = Form(...),
    trang_thai: str = Form(...), # Đúng giờ, Đi muộn, Vắng không phép, Có phép
    nguoi_xac_nhan: str = Form(...) # Tên hoặc Mã GV sửa đổi
):
    """Giảng viên can thiệp ghi nhận trạng thái điểm danh thủ công (Manual Check-in)"""
    success = db_service.manual_check_in(mssv.strip().upper(), ma_buoi_hoc, trang_thai, nguoi_xac_nhan)
    if success:
        return {"status": "success", "message": f"Đã ghi nhận điểm danh thủ công cho {mssv} là '{trang_thai}'"}
    raise HTTPException(status_code=500, detail="Không thể điểm danh thủ công.")

@router.get("/api/reports/attendance")
def get_attendance_report(ma_lop_tc: str = Query(...)):
    """Tổng kết chuyên cần của lớp tín chỉ, tính điểm, tỷ lệ vắng và cấm thi"""
    report = db_service.calculate_attendance_report(ma_lop_tc)
    return {"report": report}
