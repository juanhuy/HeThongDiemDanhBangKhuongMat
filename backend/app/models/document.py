from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Document(Base):
    """Tài liệu được chia sẻ giữa sinh viên & giảng viên."""
    __tablename__ = "documents"

    document_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    original_name = Column(String(255), nullable=False)
    stored_name = Column(String(255), nullable=False)
    file_ext = Column(String(10), nullable=False)        # .pdf / .docx
    content_type = Column(String(100), nullable=True)
    file_size = Column(Integer, default=0)

    uploaded_by = Column(String(100), nullable=False, index=True)   # account.username
    uploaded_by_role = Column(String(20), nullable=False, default="sinh_vien")
    uploader_name = Column(String(100), nullable=True)

    subject_id = Column(String(50), nullable=True, index=True)

    # AI phân tích
    tags = Column(Text, nullable=True)          # danh sách thẻ, phân tách bằng dấu phẩy
    keywords = Column(Text, nullable=True)      # từ khóa AI
    summary = Column(LONGTEXT, nullable=True)   # tóm tắt AI
    key_points = Column(LONGTEXT, nullable=True)    # ý chính, mỗi dòng 1 ý
    content_text = Column(LONGTEXT, nullable=True)  # văn bản trích xuất (có thể rất lớn với PDF)
    analysis_json = Column(LONGTEXT, nullable=True) # toàn bộ kết quả phân tích AI dạng JSON

    status = Column(String(20), default="pending", index=True)  # pending / approved / rejected
    moderation_note = Column(String(255), nullable=True)

    analysis_status = Column(String(20), default="pending", index=True)  # pending / processing / done / failed
    analysis_error = Column(String(255), nullable=True)

    # Kiểm duyệt tự động (3 loại nguy hiểm)
    moderation_verdict = Column(String(20), nullable=True)   # approved / rejected / review / None(chưa kiểm tra)
    moderation_reason = Column(String(500), nullable=True)   # lý do từ chối
    moderation_risk = Column(String(10), nullable=True)      # 0.0 - 1.0
    moderation_categories = Column(Text, nullable=True)      # JSON: ["phapluat","dothi","doitruy"]

    view_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    comments = relationship("DocumentComment", back_populates="document",
                            cascade="all, delete-orphan", order_by="DocumentComment.created_at")


class DocumentComment(Base):
    """Bình luận trên tài liệu."""
    __tablename__ = "document_comments"

    comment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    username = Column(String(100), nullable=False)
    full_name = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    document = relationship("Document", back_populates="comments")


class Flashcard(Base):
    """Thẻ học (Flashcard) — tự sinh từ tài liệu hoặc do người dùng tạo."""
    __tablename__ = "flashcards"

    card_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=True)
    owner_username = Column(String(100), nullable=True, index=True)  # None = thẻ tự sinh từ tài liệu
    chapter = Column(String(200), nullable=True)                    # chương/mục nguồn (thẻ tự sinh)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source = Column(String(20), default="auto")   # auto / personal
    card_type = Column(String(20), default="fill-blank")  # definition / fill-blank (thẻ tự sinh)
    created_at = Column(DateTime, server_default=func.now())
