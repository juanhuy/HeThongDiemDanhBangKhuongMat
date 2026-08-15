# Học NLP qua chính dự án này

Tài liệu này giúp bạn học NLP bằng cách đọc **code thật** trong dự án. Mỗi khái niệm NLP
đều có chỗ code tương ứng để bạn mở ra xem và chạy thử.

> Code chính nằm ở `backend/app/services/document_ai.py` (xử lý ngôn ngữ)
> và `backend/app/services/llm_client.py` (gọi LLM).

---

## Bản đồ: dự án dùng những kỹ thuật NLP nào?

| # | Kỹ thuật NLP | Dùng ở đâu | Loại |
|---|--------------|-----------|------|
| 1 | Trích xuất text từ PDF/DOCX | `extract_text()` | Tiền xử lý |
| 2 | Chuẩn hóa Unicode (bỏ dấu) | `_normalize_keyword()` | Tiền xử lý |
| 3 | Loại bỏ stopwords | `VIETNAMESE_STOPWORDS` | Tiền xử lý |
| 4 | Tách câu (sentence splitting) | `_split_sentences()` | Tiền xử lý |
| 5 | Đếm tần suất từ (Bag-of-Words) | `_word_frequencies()` | Trích xuất đặc trưng |
| 6 | Nhận diện tiêu đề chương/mục | `_is_heading()`, `extract_chapters()` | Phân tích cấu trúc |
| 7 | Trích xuất câu định nghĩa "X là Y" | `_definition_card()` | Khai phá mẫu (regex) |
| 8 | Tóm tắt trích rút (extractive) | `analyze_document()` | Tóm tắt |
| 9 | Sinh flashcard điền khuyết | `generate_flashcards()` | Sinh văn bản quy tắc |
| 10 | LLM (Qwen qua Ollama) | `analyze_document_ai()` | Sinh văn bản học máy |

---

## Phần 1: Tiền xử lý (Preprocessing)

Trước khi phân tích, văn bản phải "sạch". Dự án làm 3 việc:

### 1.1 Chuẩn hóa Unicode — `_normalize_keyword()` (dòng 25)

```python
def _normalize_keyword(word: str) -> str:
    word = unicodedata.normalize("NFD", word.lower().strip())
    word = "".join(c for c in word if unicodedata.category(c) != "Mn")
    return word
```

**Tại sao cần?** Tiếng Việt có dấu. `"học"` và `"hoc"` là cùng một từ gốc.
- `NFD` tách chữ có dấu thành chữ gốc + dấu riêng (vd `ọ` → `o` + dấu nặng).
- `category(c) != "Mn"` lọc bỏ các ký tự dấu → còn lại chữ không dấu.

→ Giúp gom `"máy tính"`, `"Máy Tính"`, `"MAY TINH"` về cùng một key để đếm tần suất.

### 1.2 Stopwords — `VIETNAMESE_STOPWORDS` (dòng 11)

Stopwords là từ quá phổ biến, không mang nghĩa (`và, là, của, trong, các...`).
Dự án định nghĩa sẵn 1 tập stopwords tiếng Việt + vài từ tiếng Anh.

**Tại sao bỏ?** Nếu không bỏ, từ `"là"` sẽ có tần suất cao nhất và trở thành
"từ khóa" vô nghĩa.

### 1.3 Tách câu — `_split_sentences()` (dòng 76)

```python
raw = re.split(r"(?<=[.!?])\s+|\n+", text)
```

Dùng **regex lookbehind** `(?<=[.!?])` để tách sau dấu chấm/chấm than/chấm hỏi
nhưng vẫn giữ lại dấu câu.

---

## Phần 2: Trích xuất đặc trưng (Feature Extraction)

### 2.1 Bag-of-Words — `_word_frequencies()` (dòng 87)

Đây là kỹ thuật NLP kinh điển: **đếm số lần mỗi từ xuất hiện**, bỏ qua thứ tự từ.

```python
words = re.findall(r"[A-Za-zÀ-ỹ0-9]+", text.lower())
```

Luồng:
1. Regex tách tất cả từ.
2. Bỏ từ quá ngắn (<4 ký tự) hoặc quá dài (>40 ký tự).
3. Chuẩn hóa (bỏ dấu) → dùng làm key gom nhóm.
4. Bỏ stopwords.
5. Sắp xếp theo tần suất giảm dần.

→ Kết quả là `top_words`: danh sách từ khóa quan trọng nhất. Đây chính là nguồn
sinh ra **tags** và **keywords** của tài liệu.

### 2.2 Nhận diện tiêu đề chương — `_is_heading()` (dòng 215)

Dùng regex để phát hiện dòng tiêu đề như:
- `Chương 1`, `PHẦN 2`, `Mục III`
- `1.2 Nội dung ...`
- `Mở đầu`, `Tổng quan`, `Kết luận`
- Dòng toàn chữ HOA ngắn (<=60 ký tự)

Đây là dạng **nhận diện thực thể / cấu trúc văn bản** bằng quy tắc (không cần ML).

---

## Phần 3: Khai phá mẫu bằng Regex (Pattern Mining)

### 3.1 Câu định nghĩa "X là Y" — `_definition_card()` (dòng 269)

```python
_DEFINITION_RE = re.compile(
    r"^(.+?)\s+(?:được\s+(?:định nghĩa|hiểu|gọi|coi)\s+là|là|nghĩa là|chính là)\s+(.+)",
    re.IGNORECASE,
)
```

Regex này tìm câu dạng `"Mạng nơ-ron là ..."` và tách thành:
- **Chủ ngữ** (X) → câu hỏi `"X là gì?"`
- **Phần giải thích** (Y) → câu trả lời

**Đây chính là cách sinh flashcard "định nghĩa" không cần LLM.**

### 3.2 Flashcard điền khuyết — `_blank_word()` (dòng 284)

```python
pattern = r"(?<![A-Za-zÀ-ỹ0-9])" + re.escape(word) + r"(?![A-Za-zÀ-ỹ0-9])"
return re.sub(pattern, "......", sentence, count=1, flags=re.IGNORECASE)
```

Thay từ khóa quan trọng trong câu bằng `......` → tạo câu hỏi điền khuyết.
Lookbehind/lookahead đảm bảo chỉ khớp **nguyên từ** (không khớp chuỗi con).

---

## Phần 4: Tóm tắt trích rút (Extractive Summarization)

Nằm trong `analyze_document()` (dòng 112).

Ý tưởng: **chọn ra vài câu quan trọng nhất từ văn bản gốc** (không viết lại).

Cách chấm điểm mỗi câu (`_score_sentence`, dòng 132):
1. Cộng 1 điểm cho mỗi từ khóa trong top 8 xuất hiện trong câu.
2. Câu đầu tiên +2 điểm (câu mở đầu thường giới thiệu chủ đề).
3. Câu quá ngắn (<40 ký tự) hoặc quá dài (>300) bị trừ điểm.

→ Chọn 3 câu điểm cao nhất, sắp xếp lại theo thứ tự gốc → làm **summary**.

> Phân biệt:
> - **Extractive** = cắt câu gốc (dự án làm ở fallback).
> - **Abstractive** = viết lại bằng từ mới (LLM làm).

---

## Phần 5: LLM — sinh văn bản bằng học máy

### 5.1 Gọi model — `llm_client.py`

```python
class OllamaClient:
    def chat(self, system, user, temperature=0.2, max_tokens=2000):
        r = requests.post(f"{self.base_url}/api/chat", json={...})
```

Đây chỉ là HTTP request tới Ollama. Phần "thông minh" nằm trong **prompt**:

- `temperature=0.2` → càng thấp càng "chắc chắn" (ít ngẫu nhiên), phù hợp phân tích.
- `num_ctx=16384` → cửa sổ ngữ cảnh (độ dài tối đa model nhớ được).

### 5.2 Prompt engineering — `document_ai.py` (dòng 364)

Prompt hệ thống yêu cầu model trả về **JSON đúng format**:

```
"flashcards": [{"question": "...", "answer": "...", "chapter": "..."}]
```

### 5.3 Bóc JSON — `extract_json()` (llm_client.py dòng 88)

LLM hay thêm text thừa quanh JSON. Hàm này:
1. Bỏ code fence ``` ```json ... ``` ```.
2. Cắt đoạn từ `{` đầu đến `}` cuối.
3. `json.loads()` để parse.

---

## Phần 6: Luồng đầy đủ (cái nhìn tổng thể)

```
User upload PDF/DOCX
        │
        ▼
extract_text()                  [Phần 1] lấy text thô
        │
        ▼
analyze_document()              [Phần 2-4] quy tắc: tags, keywords,
        │                        summary, chapters, terms (LUÔN chạy)
        ▼
analyze_document_ai()           [Phần 5] hỏi LLM (chỉ khi Ollama chạy)
        │
        ├─ LLM OK ──────────► dùng kết quả LLM (flashcards, overview...)
        │
        └─ LLM lỗi/None ────► giữ kết quả quy tắc (fallback)
        │
        ▼
document_flashcards()           nếu LLM không trả flashcards
        │                        thì gọi generate_flashcards() (quy tắc)
        ▼
Lưu vào bảng documents + flashcards
```

Điểm hay của kiến trúc: **LLM là "nâng cấp", quy tắc là "nền tảng"** — hệ thống
không bao giờ chết dù không có model.

---

## Bài tập thực hành

1. **Đọc** `_normalize_keyword()` rồi tự tay chạy thử:
   ```python
   # trong thư mục backend
   python -c "from app.services.document_ai import _normalize_keyword; print(_normalize_keyword('Học Máy Tính'))"
   ```
   Kết quả mong đợi: `hoc may tinh`

2. **Thử** `_split_sentences` với đoạn văn nhiều câu, quan sát cách tách.

3. **Thử** `_definition_card` với câu `"Thuật toán là một dãy các bước hữu hạn."`
   → xem nó tạo câu hỏi gì.

4. **Thử** `_blank_word` với câu chứa từ khóa → xem từ nào bị thay bằng `......`.

5. **So sánh**: tắt Ollama (`enabled: false` trong `config/config.yaml`) rồi upload
   tài liệu → xem flashcard sinh bằng quy tắc khác gì so với khi bật LLM.

---

## Gợi ý lộ trình học tiếp

| Bước | Chủ đề | Vì sao liên quan |
|------|--------|------------------|
| 1 | Regex (Python `re`) | Hiểu mọi hàm quy tắc trong dự án |
| 2 | TF-IDF | Nâng cấp `_word_frequencies` (thay đếm thô) |
| 3 | TextRank | Nâng cấp tóm tắt extractive |
| 4 | Tokenizer / Embedding | Hiểu bên trong LLM (xem file HOC_NLP_TRONG_LLM.md) |
| 5 | Prompt engineering | Cải thiện chất lượng LLM output |
