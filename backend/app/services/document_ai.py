"""Dịch vụ AI cho hệ thống tài liệu (chạy offline, không cần API ngoài).

- Trích xuất văn bản từ PDF (.pdf) / Word (.docx).
- Sinh thẻ (tags), từ khóa (keywords), tóm tắt (summary), ý chính (key_points).
- Sinh flashcard dạng câu hỏi - trả lời từ nội dung.
"""
import re
import unicodedata

# Vietnamese stopwords (tập con thông dụng)
VIETNAMESE_STOPWORDS = set("""
và là của có trong cho các với như không được một những khi này đó theo tại thì ra
sẽ về nếu còn rồi từ đó để do cũng nhưng hoặc hay nên vì mà bởi cả đã đang sẽ là
về phía trên dưới sau trước giữa cùng về lại lên xuống vào ra qua khỏi theo tại
đối với bởi vì ngoài ra hơn nhất mỗi mọi vài những các đây đó kia này ấy có thể
được phải cần nên sẽ nếu thì hay hoặc chúng tôi chúng ta anh chi em bạn thầy cô
sinh viên giảng viên học phần môn học điểm danh buổi học lớp học hệ thống phần mềm
bài giảng tài liệu nội dung chương trình đề tài nghiên cứu khoa học công nghệ thông tin
nhau cũng đều làm cho bi de toi ta minh noi lai roi thi thi va vd vv diem
also the and of to in for on with as by at from this that these those is are was were be been
will would can could should must have has had do does did not no yes your our their its
""".split())


def _normalize_keyword(word: str) -> str:
    """Chuẩn hóa: bỏ dấu để gom từ cùng gốc, hạ thường, bỏ ký tự đặc biệt."""
    word = unicodedata.normalize("NFD", word.lower().strip())
    word = "".join(c for c in word if unicodedata.category(c) != "Mn")
    return word


def extract_text(data: bytes, ext: str) -> str:
    """Trích xuất văn bản thuần từ nội dung file."""
    ext = (ext or "").lower().strip(".")
    try:
        if ext == "pdf":
            return _extract_pdf(data)
        if ext in ("docx", "doc"):
            return _extract_docx(data)
    except Exception:
        pass
    return ""


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader
    import io
    reader = PdfReader(io.BytesIO(data))
    parts = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(parts)


def _extract_docx(data: bytes) -> str:
    import io
    from docx import Document as DocxDocument
    doc = DocxDocument(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text for c in row.cells if c.text and c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n".join(parts)


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _split_sentences(text: str) -> list:
    """Tách câu tiếng Việt (theo dấu chấm / chấm than / chấm hỏi)."""
    raw = re.split(r"(?<=[.!?])\s+|\n+", text)
    sentences = []
    for s in raw:
        s = s.strip()
        if len(s) >= 15:
            sentences.append(s)
    return sentences


def _word_frequencies(text: str, limit: int = 20) -> list:
    """Đếm tần suất từ (bỏ stopwords + từ quá ngắn/dài). Trả về [{word, key, count}]."""
    words = re.findall(r"[A-Za-zÀ-ỹ0-9]+", text.lower())
    freq = {}          # normalized_key -> {"count": int, "display": str}
    for w in words:
        if len(w) < 4 or len(w) > 40:
            continue
        key = _normalize_keyword(w)
        if key in VIETNAMESE_STOPWORDS or key == "ve":
            continue
        entry = freq.setdefault(key, {"count": 0, "display": w})
        entry["count"] += 1
        # Giữ dạng hiển thị dài hơn (nhiều dấu) làm đại diện cho nhóm từ cùng gốc
        if len(w) > len(entry["display"]):
            entry["display"] = w
    return sorted(
        [{"word": v["display"], "key": k, "count": v["count"]} for k, v in freq.items()],
        key=lambda x: -x["count"],
    )[:limit]


def _restore_keyword(key: str) -> str:
    return key.upper()


def analyze_document(text: str, max_text: int = 45000):
    """Trả về dict: tags, keywords, summary, key_points từ văn bản trích xuất."""
    text = _clean_text(text or "")[:max_text]
    if not text:
        return {
            "tags": "", "keywords": "", "summary": "",
            "key_points": "", "content_text": text,
        }

    top_words = _word_frequencies(text, limit=12)
    tags = [w["word"] for w in top_words[:5]]
    keywords = [w["word"] for w in top_words[:8]]

    sentences = _split_sentences(text)
    summary = ""
    key_points = []

    if sentences:
        # Tóm tắt: 2 câu đầu tiên mang tính giới thiệu
        summary = " ".join(sentences[:2])

        # Ý chính: chọn câu chứa nhiều từ khóa nhất
        scored = []
        for s in sentences:
            sl = _normalize_keyword(s)
            score = sum(1 for w in top_words[:8] if w["key"] in sl)
            scored.append((score, s))
        scored.sort(key=lambda x: -x[0])
        seen = set()
        for score, s in scored:
            if score < 1:
                break
            if s in seen:
                continue
            seen.add(s)
            key_points.append(s)
            if len(key_points) >= 5:
                break
        if not key_points and sentences:
            key_points = sentences[:3]

    return {
        "tags": ", ".join(tags),
        "keywords": ", ".join(keywords),
        "summary": summary,
        "key_points": "\n".join(key_points),
        "content_text": text,
    }


def _blank_word(sentence: str, word: str) -> str:
    """Điền khuyết từ khóa trong câu (khớp nguyên từ, không khớp chuỗi con)."""
    pattern = r"(?<![A-Za-zÀ-ỹ0-9])" + re.escape(word) + r"(?![A-Za-zÀ-ỹ0-9])"
    return re.sub(pattern, "......", sentence, count=1, flags=re.IGNORECASE)


def generate_flashcards(text: str, max_cards: int = 10) -> list:
    """Tự sinh flashcard: câu có từ khóa quan trọng -> điền khuyết chỗ từ khóa.

    Trả về [{question, answer}].
    """
    text = _clean_text(text or "")[:45000]
    if not text:
        return []
    top_words = _word_frequencies(text, limit=15)
    sentences = _split_sentences(text)
    cards = []
    seen = set()
    for w in top_words:
        for s in sentences:
            if len(cards) >= max_cards:
                break
            # Khớp nguyên từ trong câu chuẩn hóa
            sl = _normalize_keyword(s)
            if w["key"] in sl and s not in seen:
                question = _blank_word(s, w["word"])
                if question == s:
                    continue
                seen.add(s)
                cards.append({
                    "question": question,
                    "answer": w["word"].upper(),
                    "context": s,
                })
                break
        if len(cards) >= max_cards:
            break
    return cards
