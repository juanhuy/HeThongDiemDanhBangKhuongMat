from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
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
    summary = Column(Text, nullable=True)       # tóm tắt AI
    key_points = Column(Text, nullable=True)    # ý chính, mỗi dòng 1 ý
    content_text = Column(Text, nullable=True)  # văn bản trích xuất (phục vụ tìm kiếm & flashcard)

    status = Column(String(20), default="pending", index=True)  # pending / approved / rejected
    moderation_note = Column(String(255), nullable=True)

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
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source = Column(String(20), default="auto")   # auto / personal
    created_at = Column(DateTime, server_default=func.now())
