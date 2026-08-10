from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.demo_service import get_demo_controls, update_demo_controls, _DEFAULT

router = APIRouter()


class DemoControls(BaseModel):
    demo_mode: bool = False
    bypass_registration_window: bool = False
    bypass_semester: bool = False
    bypass_capacity: bool = False
    bypass_prerequisites: bool = False
    bypass_credit_limit: bool = False
    bypass_eligibility: bool = False
    bypass_duplicate_subject: bool = False
    allow_unenroll_after_attendance: bool = False
    allow_after_hours_leave: bool = False
    allow_override_present_leave: bool = False


@router.get("/controls")
def get_controls(db: Session = Depends(get_db)):
    """Trả về trạng thái hiện tại của bảng điều khiển DEMO."""
    controls = get_demo_controls(db)
    return {
        "status": "success",
        "controls": controls,
        "available_keys": list(_DEFAULT.keys()),
    }


@router.put("/controls")
def put_controls(payload: DemoControls, db: Session = Depends(get_db)):
    """Cập nhật các công tắc DEMO; chỉ những khóa có trong payload mới được lưu."""
    new_controls = update_demo_controls(db, payload.dict())
    return {"status": "success", "message": "Đã cập nhật bảng điều khiển DEMO.", "controls": new_controls}