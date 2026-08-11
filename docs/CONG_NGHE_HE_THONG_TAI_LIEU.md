# Công nghệ sử dụng trong Hệ thống Đăng tải & Chia sẻ Tài liệu

Tài liệu mô tả công nghệ, kiến trúc và cách vận hành của **Hệ thống tài liệu** (Document System) tích hợp trong đồ án *"Hệ thống Điểm danh bằng Khuôn mặt"* — phục vụ sinh viên và giảng viên chia sẻ tài liệu học tập, với các tính năng AI: gắn thẻ, tóm tắt, flashcard và xử lý đồng thời chịu tải.

---

## 1. Tổng quan công nghệ

| Tầng | Công nghệ | Vai trò |
|---|---|---|
| **Frontend** | React 18 + Vite | Giao diện thư viện, đăng tải, xem tài liệu, flashcard |
| **Backend** | FastAPI (Python 3.14) | REST API, xử lý nghiệp vụ, background tasks |
| **ORM / DB** | SQLAlchemy + MySQL 8 | Lưu tài liệu, thẻ, bình luận, flashcard |
| **Trích xuất văn bản** | pypdf, python-docx | Đọc nội dung PDF / Word |
| **LLM local** | Qwen2.5-7B qua **Ollama** (llama.cpp) | Tóm tắt học thuật, gắn thẻ, sinh flashcard |
| **Xử lý đồng thời** | FastAPI `BackgroundTasks` (threadpool) | Phân tích AI chạy nền, không chặn request |
| **Đọc giọng nói** | Web Speech API (trình duyệt) | Sách nói AI / đọc flashcard, không cần server |
| **Xem file** | `<iframe>` (PDF), trích xuất văn bản (Word) | Xem trực tuyến, không tải về |

---

## 2. Backend (FastAPI)

- **API REST** tại prefix `/api/documents`, mọi endpoint yêu cầu xác thực JWT (`get_current_user` / `require_admin`).
- **Các endpoint chính:**
  - `POST /upload` — đăng tải PDF/Word, trả về ngay, AI phân tích nền
  - `GET /` — thư viện (tìm kiếm, lọc tag/môn, phân trang, sắp xếp)
  - `GET /{id}` , `GET /{id}/summary`, `GET /{id}/text`, `GET /{id}/file`, `GET /{id}/download`
  - `GET|POST /{id}/comments`, `GET /{id}/similar` (gợi ý theo tag)
  - `GET /{id}/flashcards`, `POST /flashcards/personal`, `GET /flashcards/mine`
  - `POST /{id}/reanalyze`, `GET /moderation/pending`, `POST /{id}/moderate`
- **Cơ sở dữ liệu:** 3 bảng chính `documents`, `document_comments`, `flashcards`; schema được tự đồng bộ khi khởi động (`sync_schema.py`).

---

## 3. NLP & LLM Local — phần lõi AI

### 3.1 Mô hình ngôn ngữ lớn (LLM)
- **Model:** `Qwen2.5-7B-Instruct` (Alibaba) — mô hình transformer **decoder-only** ~7 tỷ tham số, đa ngôn ngữ, tiếng Việt tốt.
- **Cấu trúc model:**
  ```
  Văn bản → Tokenize → Embedding → [Self-Attention × 28 lớp] → Dự đoán từ kế tiếp
  ```
  - **Self-Attention:** mỗi token học mức độ liên quan với các token khác → hiểu ngữ cảnh.
  - **Multi-Head Attention:** nhiều "đầu" học nhiều khía cạnh khác nhau.
  - **Positional Encoding:** bổ sung thông tin vị trí từ.
- **Quá trình huấn luyện:**
  1. **Pre-training:** dự đoán từ kế tiếp trên hàng nghìn tỷ token → học ngôn ngữ + kiến thức nền.
  2. **SFT (Fine-tuning giám sát):** học trả lời theo cặp hỏi–đáp mẫu.
  3. **RLHF:** căn chỉnh câu trả lời hữu ích, trung thực.
- **Inference:** sinh **từng token một** (autoregressive), `temperature=0.2`, giới hạn `num_ctx=8192`.

### 3.2 Ollama & lượng tử hóa
- **Ollama** là runtime chạy model LLM local, expose **REST API** `http://127.0.0.1:11434`.
- Model lưu dạng **GGUF** với lượng tử hóa **Q4_K_M (~4.7GB)** — giảm từ FP16 (~14GB), chấp nhận sai số nhẹ.
- **GPU offload:** Ollama (llama.cpp) tự phân bổ các lớp model vào **GPU CUDA** (RTX 5060 8GB), phần còn lại chạy CPU.
- Client gọi: `POST /api/chat` với `{model, messages, stream:false, options}` → nhận JSON.

### 3.3 Prompt Engineering & Kết quả có cấu trúc
- Prompt hệ thống yêu cầu model trả về **một JSON hợp lệ duy nhất**:
  ```json
  {
    "overview": "tóm tắt tổng quan",
    "keywords": ["..."],
    "chapters": [{"title": "...", "summary": "...", "keywords": ["..."]}],
    "key_points": ["..."],
    "conclusion": "...",
    "terms": [{"term": "...", "definition": "..."}],
    "flashcards": [{"question": "...", "answer": "...", "chapter": "..."}]
  }
  ```
- Hàm `extract_json()` bóc JSON khỏi phản hồi (loại bỏ code fence, ký tự thừa).

### 3.4 Thuật toán quy tắc (Fallback — chạy offline)
Khi LLM không khả dụng (tắt Ollama, model lỗi, không đủ tài nguyên), hệ thống tự động rơi về thuật toán **heuristic**:
- **Tokenization + Normalization:** tách từ, hạ thường, bỏ dấu để gom từ cùng gốc.
- **Stopwords tiếng Việt:** lọc từ ít ý nghĩa ("và", "của", "trong"...).
- **TF (tần suất từ):** chọn từ khóa/thẻ xuất hiện nhiều nhất.
- **Tóm tắt trích rút (extractive):** chấm điểm câu theo từ khóa + vị trí, chọn 3-4 câu điểm cao.
- **Nhận diện chương/mục:** regex theo mẫu "Chương 1", "1.1", "MỞ ĐẦU"...
- **Thẻ định nghĩa:** mẫu câu "X là ..." → thẻ "X là gì?".
- **Tóm tắt abstractive** (LLM) vs **extractive** (quy tắc) — 2 tầng bổ trợ.

---

## 4. Kiến trúc xử lý đồng thời (chịu tải nhiều người dùng)

### 4.1 Vấn đề
- Phân tích LLM tốn **~15-20s/tài liệu**.
- Nếu chạy đồng bộ trong request, **event loop bị chặn** → mọi request khác (login, xem danh sách) đứng yên; 10 người upload cùng lúc = 200s chờ tuần tự.

### 4.2 Giải pháp: Background Processing
```
Upload (0.05s) ─► lưu file + tạo Document (analysis_status=processing) ─► phản hồi NGAY
                        │
                        ▼
            FastAPI BackgroundTasks (thread riêng, Starlette chạy sync fn trong threadpool)
                        │
              document_analysis() → Ollama (tự xếp hàng các request)
                        │
              Cập nhật analysis_json + flashcards → analysis_status=done
                        │
              Frontend poll mỗi 4-5s → hiển thị kết quả
```
- **`BackgroundTasks`** chạy hàm đồng bộ trong **threadpool** → event loop luôn rảnh.
- Mỗi background task mở **session riêng** (an toàn đa luồng).
- **Trạng thái:** `processing` / `done` / `failed` (+ `analysis_error`).
- **UI:** badge "Đang phân tích AI...", tự refresh; tab tóm tắt hiện spinner và poll.

### 4.3 Kết quả đo
| Chỉ số | Trước | Sau |
|---|---|---|
| 3 upload đồng thời | ~60s (chặn server) | **0.05-0.09s** |
| Backend phản hồi khi đang phân tích | Bị chặn | Rảnh hoàn toàn |
| Upload đơn lẻ | ~20s | **0.01s** |

### 4.4 Mở rộng thêm (khi cần)
- Nhiều worker: `uvicorn app.main:app --workers 4`
- Ollama song song: `OLLAMA_NUM_PARALLEL=2` (đổi lấy VRAM)
- Task queue chính quy (Celery/RQ + Redis) cho quy mô lớn.

---

## 5. Frontend (React)

- **Routing hash nhẹ** (không cần react-router):
  `#/documents`, `#/documents/{id}`, `#/documents/{id}/summary`, `#/upload`, `#/flashcards/{id}`, `#/moderation`.
- **Các trang:** Thư viện (tìm kiếm/lọc/phân trang), Đăng tải, Chi tiết (xem PDF/Word, tóm tắt AI, bình luận, gợi ý tương tự), Học Flashcard (lật thẻ, TTS).
- **Xem PDF:** fetch file có token → Blob URL → `<iframe>`.
- **Xem Word:** hiển thị văn bản trích xuất từ backend.
- **Sách nói AI / TTS:** **Web Speech API** (`speechSynthesis`, ngôn ngữ `vi-VN`) — đọc câu hỏi/trả lời flashcard, chạy hoàn toàn trên trình duyệt, không cần server.
- **API client:** `apiFetch` tự gắn `Authorization: Bearer`, xử lý 401 tự logout; `authFetch` cho fetch trực tiếp có token.

---

## 6. Bảo mật

- Mọi endpoint yêu cầu **JWT** (`get_current_user`), kiểm duyệt chỉ **admin**.
- **Phân quyền đăng tải:** giảng viên/admin → xuất bản ngay; sinh viên → **chờ kiểm duyệt**.
- **Upload an toàn:** giới hạn định dạng (PDF/DOCX) + dung lượng tối đa 20MB.
- **File không serve công khai:** phải có token mới xem/tải được.
- **Phân quyền thao tác:** chỉ chủ sở hữu/admin mới sửa tóm tắt, xóa tài liệu.

---

## 7. Sơ đồ luồng tổng thể

```
PDF/DOCX → extract_text (pypdf/python-docx)
                │
                ▼
          upload nhanh (0.05s) ──► Document(status, analysis_status=processing)
                │
                ▼  BackgroundTasks
   document_analysis() ──► LLM available? ──NO──► thuật toán quy tắc (fallback)
                │ YES
        Qwen2.5-7B (Ollama, GPU)
                │
        JSON {overview, chapters[], key_points[], terms[], conclusion, flashcards[]}
                │
        Lưu analysis_json + Flashcard rows
                │
        analysis_status=done
                │
        UI: tab Tóm tắt AI + Học Flashcard (poll tự cập nhật)
```

---

## 8. Kết luận

Hệ thống tài liệu kết hợp **NLP hiện đại (LLM local Qwen2.5-7B)** với **kiến trúc xử lý nền** để đảm bảo trải nghiệm mượt mà khi nhiều người dùng cùng hoạt động. Toàn bộ AI chạy **offline, miễn phí**, có **fallback quy tắc** đảm bảo hệ thống không bao giờ gián đoạn; đồng thời dễ mở rộng (đổi model, thêm worker, nâng cấp RAG).

*Tài liệu phục vụ báo cáo đồ án — Hệ thống Điểm danh bằng Khuôn mặt & Hệ thống Tài liệu tích hợp.*
