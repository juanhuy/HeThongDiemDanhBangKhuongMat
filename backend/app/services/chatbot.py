"""Chatbot trợ lý hệ thống điểm danh (RAG trên dữ liệu có cấu trúc + quy chế).

- Lấy dữ liệu THẬT của người dùng theo vai trò (sinh_vien / giang_vien / admin).
- Đọc file quy chế (.md) làm ngữ cảnh.
- Gọi LLM (Ollama) sinh câu trả lời tự nhiên; nếu LLM không khả dụng
  thì dùng fallback quy tắc trả lời trực tiếp từ dữ liệu (không bị rỗng).
"""
import os
import re

from datetime import datetime

from app.core.attendance_report import build_student_summary, build_class_report
from app.services.llm_client import _get_llm

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

_RULE_FILES = [
    "qui-tat-lop-tin-chi.md",
    "quy_tat-sinh-tkb.md",
]


def _load_rules() -> str:
    """Đọc nội dung các file quy chế để làm ngữ cảnh cho bot."""
    parts = []
    for fname in _RULE_FILES:
        for base in (PROJECT_ROOT, os.path.join(PROJECT_ROOT, "backend")):
            p = os.path.join(base, fname)
            if os.path.isfile(p):
                try:
                    with open(p, encoding="utf-8") as f:
                        parts.append(f.read())
                except Exception:
                    pass
                break
    text = "\n\n".join(parts)
    return text[:10000]


def _fmt_dt(v):
    return v.strftime("%d/%m %H:%M") if v else "—"


def _student_context(db, mssv: str) -> str:
    mssv = mssv.upper()
    summary = build_student_summary(db, mssv)
    lines = []
    if summary:
        st = summary.get("student", {})
        lines.append(f"- Sinh viên: {st.get('ho_ten')} (MSSV: {st.get('mssv')})")
        lines.append(f"- Cấm thi: {'CÓ' if summary.get('cam_thi') else 'KHÔNG'}")
        for c in summary.get("classes", []):
            lines.append(
                f"- Lớp {c.get('ma_lop_tc')} - môn {c.get('subject_name')}: "
                f"đi muộn {c.get('di_muon')} lần, vắng không phép {c.get('vang_kp')} lần, "
                f"vắng có phép {c.get('co_phep')} lần, tỷ lệ vắng {c.get('ty_le_vang')}%, "
                f"điểm chuyên cần {c.get('score')}, trạng thái {c.get('trang_thai')}"
            )
    # Lịch học sắp tới
    from app.models import StudentClassEnrollment, ClassSession
    enrolled_ids = [e.class_id for e in db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.student_id == mssv).all()]
    if enrolled_ids:
        today = datetime.now().date()
        sessions = db.query(ClassSession).filter(
            ClassSession.class_id.in_(enrolled_ids),
            ClassSession.session_date >= today,
        ).order_by(ClassSession.session_date, ClassSession.start_time).limit(5).all()
        if sessions:
            lines.append("- Lịch học sắp tới:")
            for s in sessions:
                lines.append(
                    f"  - Ngày {_fmt_dt(s.session_date)} từ {_fmt_dt(s.start_time)} đến {_fmt_dt(s.end_time)}, "
                    f"phòng {s.room_id} (lớp {s.class_id})"
                )
    return "\n".join(lines) or "(không có dữ liệu sinh viên)"


def _lecturer_context(db, lecturer_id: str) -> str:
    from app.models import CreditClass, ClassSession, LeaveRequest
    classes = db.query(CreditClass).filter(
        CreditClass.lecturer_id == lecturer_id.strip()).all()
    lines = []
    today = datetime.now().date()
    for cc in classes:
        data = build_class_report(db, cc.class_id)
        rows = data.get("report", [])
        at_risk = sum(1 for r in rows if r.get("trang_thai") == "Cấm thi")
        present_today = 0
        sessions = db.query(ClassSession).filter(
            ClassSession.class_id == cc.class_id,
            ClassSession.session_date == today,
        ).all()
        for s in sessions:
            from app.models import AttendanceRecord
            present_today += db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == s.session_id).count()
        lines.append(
            f"- Lớp {cc.class_id} - môn {cc.subject.subject_name if cc.subject else 'N/A'}: "
            f"số sinh viên {len(rows)}, số sinh viên cấm thi {at_risk}, "
            f"số lượt điểm danh hôm nay {present_today}/{len(sessions)} buổi"
        )
    pending = db.query(LeaveRequest).filter(LeaveRequest.status == "Pending").count()
    lines.append(f"- Số đơn nghỉ phép đang chờ duyệt: {pending}")
    return "\n".join(lines) or "(không có dữ liệu lớp học)"


def _admin_context(db) -> str:
    from app.models import Student, CreditClass, ClassSession
    n_students = db.query(Student).count()
    n_classes = db.query(CreditClass).count()
    n_sessions = db.query(ClassSession).count()
    return (
        f"- Tổng số sinh viên: {n_students}\n"
        f"- Tổng số lớp tín chỉ: {n_classes}\n"
        f"- Tổng số buổi học: {n_sessions}"
    )


def _build_context(db, current_user: dict) -> str:
    role = (current_user.get("role") or "").lower()
    if role in ("sinh_vien", "student"):
        mssv = (current_user.get("mssv") or current_user.get("username") or "").upper()
        return f"[DU LIEU SINH VIEN]\n{_student_context(db, mssv)}"
    if role in ("giang_vien", "lecturer"):
        lid = current_user.get("lecturer_id") or current_user.get("username") or ""
        return f"[DU LIEU GIANG VIEN]\n{_lecturer_context(db, lid)}"
    return f"[DU LIEU ADMIN]\n{_admin_context(db)}"


def _fallback_reply(message: str, context: str, role: str) -> str:
    """Trả lời bằng quy tắc khi LLM không khả dụng."""
    msg = message.lower()
    context_l = context.lower()
    if any(w in msg for w in ["chào", "hello", "hi", "xin chao"]):
        return "Xin chào! Tôi là trợ lý của hệ thống điểm danh PTIT. Bạn có thể hỏi về điểm danh, tỷ lệ vắng, cấm thi, lịch học hoặc quy chế."
    if any(w in msg for w in ["cấm thi", "cam thi"]):
        for line in context.splitlines():
            if "cam_thi" in line.lower():
                return "Theo dữ liệu hiện tại: " + line.strip()
        return "Không tìm thấy thông tin cấm thi trong dữ liệu của bạn."
    if any(w in msg for w in ["tỷ lệ vắng", "ty le vang", "vắng"]):
        for line in context.splitlines():
            if "ty_le_vang" in line.lower():
                return "Theo dữ liệu hiện tại: " + line.strip()
    if any(w in msg for w in ["lịch", "lich", "buổi", "buoi hoc"]):
        for line in context.splitlines():
            if "lich sap toi" in line.lower() or "->" in line:
                return "Lịch học sắp tới:\n" + "\n".join(
                    l for l in context.splitlines() if "->" in l)
        return "Không có lịch học sắp tới trong dữ liệu."
    if any(w in msg for w in ["quy chế", "quy che", "quy định", "quy dinh", "nghỉ phép", "nghi phep"]):
        return "Tôi chưa thể tra cứu quy chế chi tiết vì LLM đang không sẵn sàng. Bạn thử bật Ollama để tôi trả lời đầy đủ hơn."
    return (
        "Xin lỗi, tôi chưa hiểu câu hỏi (LLM đang không sẵn sàng, tôi đang trả lời ở chế độ đơn giản).\n"
        "Bạn có thể hỏi: tỷ lệ vắng, cấm thi, lịch học, hoặc quy chế.\n"
        "Dữ liệu hiện tại của bạn:\n" + (context[:1500])
    )


def handle_chat(db, current_user: dict, message: str, history: list) -> tuple:
    """Xử lý 1 tin nhắn. Trả về (reply, used_fallback_bool)."""
    role = (current_user.get("role") or "").lower()
    context = _build_context(db, current_user)
    rules = _load_rules()

    history_text = ""
    if history:
        recent = history[-6:]
        history_text = "\n".join(
            f"{'Nguoi' if m.get('role') == 'user' else 'Tro ly'}: {m.get('content')}"
            for m in recent if m.get('content')
        )

    system = (
        "Bạn là trợ lý ảo của HỆ THỐNG ĐIỂM DANH BẰNG KHUÔN MẶT PTIT.\n"
        "QUY TẮC BẮT BUỘC: LUÔN trả lời bằng TIẾNG VIỆT CÓ DẤU trong MỌI câu trả lời. "
        "Tuyệt đối KHÔNG được trả lời bằng tiếng Anh, kể cả khi dữ liệu bên dưới không dấu. "
        "Nếu người dùng hỏi tiếng Anh, bạn vẫn trả lời tiếng Việt.\n"
        "Trả lời ngắn gọn, thân thiện, dùng dữ liệu được cung cấp, KHÔNG bịa số liệu. "
        "Câu hỏi ngoài phạm vi thì trả lời gọn và từ chối nhẹ nhàng.\n\n"
        f"VAI TRÒ NGƯỜI DÙNG: {role}\n\n"
        f"[QUY CHẾ HỆ THỐNG]\n{rules}\n\n"
        f"[DỮ LIỆU THỰC TẾ]\n{context}"
    )
    user_prompt = message if not history_text else (
        f"Lịch sử:\n{history_text}\n\nCâu hỏi mới của người dùng: {message}\n"
        "Hãy trả lời bằng tiếng Việt có dấu."
    )

    llm = _get_llm()
    if llm and llm.available():
        try:
            reply = llm.chat(system, user_prompt, temperature=0.3, max_tokens=600)
            if reply and reply.strip():
                return reply.strip(), False
        except Exception:
            pass

    return _fallback_reply(message, context, role), True
