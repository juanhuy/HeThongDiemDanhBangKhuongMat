"""Hệ thống Đăng tải & Chia sẻ tài liệu (Document System).

- Upload PDF/Word + AI tự gắn thẻ / tóm tắt / ý chính.
- Thư viện & chia sẻ: xem, tìm kiếm, tải về, bình luận, gợi ý tương tự theo tag.
- Flashcard tự sinh + cá nhân hóa, Tóm tắt AI.
- Quản trị & kiểm duyệt: duyệt / từ chối / xóa tài liệu.
"""
import os
import sys
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Document, DocumentComment, Flashcard, Subject
from app.core.require import get_current_user, require_admin
from app.services.document_ai import extract_text, analyze_document, generate_flashcards

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from config.settings import settings

router = APIRouter()

DOCUMENTS_DIR = os.path.join(project_root, "database", "documents")
os.makedirs(DOCUMENTS_DIR, exist_ok=True)

MAX_DOC_BYTES = 20 * 1024 * 1024  # 20MB
ALLOWED_EXT = {".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

AUTO_APPROVE_ROLES = {"giang_vien", "admin", "lecturer"}


def _storage_path(stored_name: str) -> str:
    return os.path.join(DOCUMENTS_DIR, stored_name)


def _can_view(doc: Document, current_user: dict) -> bool:
    if doc.status == "approved":
        return True
    if current_user["role"] == "admin":
        return True
    return (doc.uploaded_by or "").lower() == (current_user.get("username") or "").lower()


def _doc_to_dict(doc: Document, current_user: dict) -> dict:
    tags = [t.strip() for t in (doc.tags or "").split(",") if t.strip()]
    return {
        "document_id": doc.document_id,
        "title": doc.title,
        "description": doc.description,
        "original_name": doc.original_name,
        "file_ext": doc.file_ext,
        "file_size": doc.file_size,
        "uploaded_by": doc.uploaded_by,
        "uploaded_by_role": doc.uploaded_by_role,
        "uploader_name": doc.uploader_name,
        "subject_id": doc.subject_id,
        "tags": tags,
        "status": doc.status,
        "moderation_note": doc.moderation_note if current_user["role"] == "admin" else None,
        "view_count": doc.view_count,
        "download_count": doc.download_count,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


# =========================================================================
# UPLOAD — Đăng tải tài liệu + AI phân tích
# =========================================================================
@router.post("/upload", summary="Đăng tải tài liệu (PDF/Word) + AI gắn thẻ & tóm tắt")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(None),
    subject_id: str = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng PDF (.pdf) hoặc Word (.docx).")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="File rỗng.")
    if len(data) > MAX_DOC_BYTES:
        raise HTTPException(status_code=413, detail="File vượt quá kích thước tối đa 20MB.")

    # Trích xuất văn bản + phân tích AI
    content_text = extract_text(data, ext)
    analysis = analyze_document(content_text)

    stored_name = f"{uuid.uuid4().hex[:20]}{ext}"
    with open(_storage_path(stored_name), "wb") as f:
        f.write(data)

    role = (current_user.get("role") or "sinh_vien").lower()
    status_val = "approved" if role in AUTO_APPROVE_ROLES else "pending"

    doc = Document(
        title=title.strip()[:255],
        description=(description or "").strip() or None,
        original_name=(file.filename or "")[:255],
        stored_name=stored_name,
        file_ext=ext,
        content_type=ALLOWED_EXT[ext],
        file_size=len(data),
        uploaded_by=current_user.get("username") or "unknown",
        uploaded_by_role=role,
        uploader_name=current_user.get("ho_ten") or current_user.get("username") or "N/A",
        subject_id=(subject_id or "").strip() or None,
        tags=analysis["tags"],
        keywords=analysis["keywords"],
        summary=analysis["summary"],
        key_points=analysis["key_points"],
        content_text=analysis["content_text"],
        status=status_val,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Tự sinh flashcard cho tài liệu được duyệt (GV/Admin)
    if status_val == "approved" and analysis["content_text"]:
        cards = generate_flashcards(analysis["content_text"])
        for c in cards:
            db.add(Flashcard(
                document_id=doc.document_id, owner_username=None,
                question=c["question"], answer=c["answer"], source="auto",
            ))
        db.commit()

    return {"status": "success", "message": "Đã đăng tải tài liệu thành công.", "document": _doc_to_dict(doc, current_user)}


# =========================================================================
# THƯ VIỆN — danh sách, tìm kiếm, phân trang
# =========================================================================
@router.get("", summary="Danh sách tài liệu (tìm kiếm, lọc tag, phân trang)")
def list_documents(
    search: str = Query(None, description="Tìm theo tiêu đề/mô tả/nội dung"),
    tag: str = Query(None, description="Lọc theo thẻ"),
    subject_id: str = Query(None, description="Lọc theo môn học"),
    sort: str = Query("newest", pattern="^(newest|most_viewed|most_downloaded)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    username = (current_user.get("username") or "").lower()
    role = current_user["role"]
    is_admin = role == "admin"

    q = db.query(Document)
    # Ai không phải admin: chỉ thấy approved + tài liệu của chính mình
    if not is_admin:
        q = q.filter(or_(Document.status == "approved", func.lower(Document.uploaded_by) == username))
    else:
        q = q.filter(Document.status == "approved")

    if search:
        like = f"%{search.strip()}%"
        q = q.filter(or_(Document.title.ilike(like), Document.description.ilike(like),
                         Document.content_text.ilike(like)))
    if tag:
        q = q.filter(Document.tags.ilike(f"%{tag.strip()}%"))
    if subject_id:
        q = q.filter(Document.subject_id == subject_id.strip())

    if sort == "most_viewed":
        q = q.order_by(Document.view_count.desc())
    elif sort == "most_downloaded":
        q = q.order_by(Document.download_count.desc())
    else:
        q = q.order_by(Document.created_at.desc())

    total = q.count()
    docs = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "status": "success",
        "total": total,
        "page": page,
        "page_size": page_size,
        "documents": [_doc_to_dict(d, current_user) for d in docs],
    }


@router.get("/tags", summary="Danh sách thẻ phổ biến")
def list_tags(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    docs = db.query(Document).filter(Document.status == "approved").all()
    counter = {}
    for d in docs:
        for t in (d.tags or "").split(","):
            t = t.strip()
            if t:
                counter[t] = counter.get(t, 0) + 1
    tags = sorted([{"tag": k, "count": v} for k, v in counter.items()], key=lambda x: -x["count"])
    return {"status": "success", "tags": tags[:50]}


# =========================================================================
# CHI TIẾT TÀI LIỆU
# =========================================================================
def _get_doc(db: Session, doc_id: int, current_user: dict) -> Document:
    doc = db.query(Document).filter(Document.document_id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")
    if not _can_view(doc, current_user):
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")
    return doc


@router.get("/{doc_id}", summary="Chi tiết tài liệu")
def get_document(doc_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = _get_doc(db, doc_id, current_user)
    doc.view_count = (doc.view_count or 0) + 1
    db.commit()
    return {"status": "success", "document": _doc_to_dict(doc, current_user)}


@router.get("/{doc_id}/summary", summary="Tóm tắt AI của tài liệu (Keywords, Summary, Key Points)")
def get_document_summary(doc_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = _get_doc(db, doc_id, current_user)
    return {
        "status": "success",
        "summary": doc.summary or "",
        "keywords": [k.strip() for k in (doc.keywords or "").split(",") if k.strip()],
        "key_points": [k.strip() for k in (doc.key_points or "").split("\n") if k.strip()],
    }


@router.get("/{doc_id}/text", summary="Văn bản trích xuất (dùng để xem Word trực tuyến)")
def get_document_text(doc_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = _get_doc(db, doc_id, current_user)
    return {"status": "success", "content": doc.content_text or ""}


@router.get("/{doc_id}/file", summary="Xem tài liệu trực tuyến (inline)")
def view_document_file(doc_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = _get_doc(db, doc_id, current_user)
    path = _storage_path(doc.stored_name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File không tồn tại.")
    disposition = "inline" if doc.file_ext == ".pdf" else "attachment"
    return FileResponse(path, media_type=doc.content_type or "application/octet-stream",
                        filename=doc.original_name, content_disposition_type=disposition)


@router.get("/{doc_id}/download", summary="Tải tài liệu về máy")
def download_document(doc_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = _get_doc(db, doc_id, current_user)
    path = _storage_path(doc.stored_name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File không tồn tại.")
    doc.download_count = (doc.download_count or 0) + 1
    db.commit()
    return FileResponse(path, media_type=doc.content_type or "application/octet-stream",
                        filename=doc.original_name, content_disposition_type="attachment")


@router.get("/{doc_id}/similar", summary="Gợi ý tài liệu tương tự theo Tag")
def similar_documents(doc_id: int, limit: int = Query(5, ge=1, le=20),
                      db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = _get_doc(db, doc_id, current_user)
    doc_tags = set(t.strip().lower() for t in (doc.tags or "").split(",") if t.strip())
    others = db.query(Document).filter(
        Document.status == "approved", Document.document_id != doc_id
    ).all()
    scored = []
    for d in others:
        d_tags = set(t.strip().lower() for t in (d.tags or "").split(",") if t.strip())
        overlap = len(doc_tags & d_tags)
        if overlap > 0:
            scored.append((overlap, d))
    scored.sort(key=lambda x: -x[0])
    return {
        "status": "success",
        "documents": [_doc_to_dict(d, current_user) for _, d in scored[:limit]],
    }


# =========================================================================
# BÌNH LUẬN
# =========================================================================
@router.get("/{doc_id}/comments", summary="Danh sách bình luận")
def list_comments(doc_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    _get_doc(db, doc_id, current_user)
    comments = db.query(DocumentComment).filter(DocumentComment.document_id == doc_id)\
        .order_by(DocumentComment.created_at).all()
    return {"status": "success", "comments": [
        {"comment_id": c.comment_id, "username": c.username, "full_name": c.full_name,
         "content": c.content, "created_at": c.created_at.isoformat() if c.created_at else None}
        for c in comments
    ]}


@router.post("/{doc_id}/comments", summary="Thêm bình luận")
def add_comment(doc_id: int, content: str = Form(...),
                db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    _get_doc(db, doc_id, current_user)
    content = (content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Nội dung bình luận không được rỗng.")
    c = DocumentComment(
        document_id=doc_id,
        username=current_user.get("username") or "unknown",
        full_name=current_user.get("ho_ten") or current_user.get("username") or "N/A",
        content=content[:1000],
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"status": "success", "message": "Đã thêm bình luận.", "comment": {
        "comment_id": c.comment_id, "username": c.username, "full_name": c.full_name,
        "content": c.content, "created_at": c.created_at.isoformat() if c.created_at else None,
    }}


# =========================================================================
# FLASHCARD — tự sinh từ tài liệu + cá nhân hóa
# =========================================================================
@router.post("/flashcards/personal", summary="Tạo flashcard cá nhân")
def create_personal_flashcard(
    question: str = Form(...), answer: str = Form(...),
    document_id: int = Form(None),
    db: Session = Depends(get_db), current_user: dict = Depends(get_current_user),
):
    c = Flashcard(
        document_id=document_id,
        owner_username=current_user.get("username"),
        question=(question or "").strip()[:500],
        answer=(answer or "").strip()[:500],
        source="personal",
    )
    if not c.question or not c.answer:
        raise HTTPException(status_code=400, detail="Câu hỏi và trả lời không được rỗng.")
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"status": "success", "card": {"card_id": c.card_id, "question": c.question, "answer": c.answer}}


@router.get("/flashcards/mine", summary="Flashcard cá nhân của tôi")
def my_flashcards(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    cards = db.query(Flashcard).filter(Flashcard.owner_username == current_user.get("username"))\
        .order_by(Flashcard.created_at.desc()).all()
    return {"status": "success", "cards": [
        {"card_id": c.card_id, "question": c.question, "answer": c.answer,
         "document_id": c.document_id} for c in cards
    ]}


@router.delete("/flashcards/{card_id}", summary="Xóa flashcard của tôi")
def delete_flashcard(card_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    c = db.query(Flashcard).filter(Flashcard.card_id == card_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy flashcard.")
    if c.owner_username and c.owner_username != current_user.get("username") and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền xóa flashcard này.")
    db.delete(c)
    db.commit()
    return {"status": "success", "message": "Đã xóa flashcard."}


@router.get("/{doc_id}/flashcards", summary="Flashcard tự sinh từ tài liệu")
def get_document_flashcards(doc_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = _get_doc(db, doc_id, current_user)
    cards = db.query(Flashcard).filter(Flashcard.document_id == doc_id, Flashcard.source == "auto").all()
    if not cards and doc.content_text:
        cards = [Flashcard(document_id=doc_id, owner_username=None, question=c["question"],
                           answer=c["answer"], source="auto")
                 for c in generate_flashcards(doc.content_text)]
        for c in cards:
            db.add(c)
        db.commit()
    return {"status": "success", "cards": [
        {"card_id": c.card_id, "question": c.question, "answer": c.answer} for c in cards
    ]}


# =========================================================================
# QUẢN TRỊ & KIỂM DUYỆT (Admin)
# =========================================================================
@router.get("/moderation/pending", summary="Danh sách tài liệu chờ duyệt", dependencies=[Depends(require_admin)])
def moderation_pending(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    docs = db.query(Document).filter(Document.status == "pending").order_by(Document.created_at.desc()).all()
    return {"status": "success", "documents": [_doc_to_dict(d, current_user) for d in docs]}


@router.post("/{doc_id}/moderate", summary="Duyệt / từ chối tài liệu", dependencies=[Depends(require_admin)])
def moderate_document(
    doc_id: int,
    action: str = Form(..., description="approved / rejected"),
    note: str = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.document_id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")
    if action not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="action phải là approved hoặc rejected.")
    doc.status = action
    doc.moderation_note = (note or "").strip() or None
    # Khi được duyệt: tự sinh flashcard nếu chưa có
    if action == "approved" and doc.content_text:
        exists = db.query(Flashcard).filter(Flashcard.document_id == doc.document_id,
                                            Flashcard.source == "auto").first()
        if not exists:
            for c in generate_flashcards(doc.content_text):
                db.add(Flashcard(document_id=doc.document_id, owner_username=None,
                                 question=c["question"], answer=c["answer"], source="auto"))
    db.commit()
    return {"status": "success", "message": "Đã cập nhật trạng thái tài liệu."}


@router.delete("/{doc_id}", summary="Xóa tài liệu (chủ sở hữu hoặc admin)")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.document_id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")
    is_owner = (doc.uploaded_by or "").lower() == (current_user.get("username") or "").lower()
    if not is_owner and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền xóa tài liệu này.")
    path = _storage_path(doc.stored_name)
    db.delete(doc)
    db.commit()
    if os.path.isfile(path):
        try:
            os.remove(path)
        except Exception:
            pass
    return {"status": "success", "message": "Đã xóa tài liệu."}


# =========================================================================
# Dữ liệu phụ trợ: môn học để chọn khi đăng tải
# =========================================================================
@router.get("/meta/subjects", summary="Danh sách môn học để liên kết tài liệu")
def document_subjects(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    subs = db.query(Subject).all()
    return {"status": "success", "subjects": [
        {"subject_id": s.subject_id, "subject_name": s.subject_name} for s in subs
    ]}
