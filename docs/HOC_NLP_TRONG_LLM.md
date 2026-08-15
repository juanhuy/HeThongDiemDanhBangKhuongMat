# Học NLP trong LLM

Tài liệu học tập về cách một Large Language Model (LLM) xử lý ngôn ngữ tự nhiên (NLP),
kèm liên hệ thực tế với dự án "Hệ thống Điểm danh bằng Khuôn mặt" (phần Hệ thống Tài liệu).

---

## Mục lục

1. [NLP là gì?](#1-nlp-là-gì)
2. [Pipeline xử lý ngôn ngữ của LLM](#2-pipeline-xử-lý-ngôn-ngữ-của-llm)
3. [Kiến trúc Transformer](#3-kiến-trúc-transformer)
4. [Attention hoạt động thế nào?](#4-attention-hoạt-động-thế-nào)
5. [Liên hệ với dự án](#5-liên-hệ-với-dự-án)
6. [Câu hỏi ôn tập](#6-câu-hỏi-ôn-tập)

---

## 1. NLP là gì?

**NLP (Natural Language Processing)** là lĩnh vực giúp máy tính hiểu, phân tích và sinh
ra ngôn ngữ tự nhiên của con người.

Có 2 cách tiếp cận chính:

| Cách tiếp cận | Mô tả | Ví dụ |
|---------------|-------|-------|
| **Quy tắc (rule-based)** | Viết tay các quy tắc ngữ pháp, regex | Tìm câu dạng "X là ..." để tạo câu hỏi |
| **Thống kê / học máy** | Học từ dữ liệu lớn, không cần quy tắc tay | LLM như Qwen, GPT |

> LLM thuộc nhóm **thống kê / học máy**: mô hình học cách "dự đoán token tiếp theo"
> từ hàng tỷ văn bản, không được lập trình ngữ pháp thủ công.

---

## 2. Pipeline xử lý ngôn ngữ của LLM

Khi bạn gửi một câu văn vào LLM, nó trải qua các bước:

```
Văn bản đầu vào
      │
      ▼
[1] Tokenization   → tách thành các token (số nguyên)
      │
      ▼
[2] Embedding      → mỗi token thành vector số nhiều chiều
      │
      ▼
[3] Transformer     → nhiều lớp Attention + FFN xử lý ngữ cảnh
      │
      ▼
[4] Softmax         → tính xác suất cho token kế tiếp
      │
      ▼
[5] Sinh token      → chọn token, lặp lại (autoregressive)
```

### 2.1 Tokenization (mã hóa từ)

Văn bản được tách thành **token** — đơn vị nhỏ nhất. Không phải lúc nào cũng là "một từ".

Ví dụ (tiếng Việt/Anh):

| Văn bản | Token có thể |
|---------|--------------|
| `điểm danh` | `điểm`, ` danh` (2 token) |
| `flashcard` | `flash`, `card` |
| `học` | `học` (1 token) |

Thuật toán phổ biến: **BPE** (Byte Pair Encoding) — gộp các cặp ký tự xuất hiện
nhiều lần thành token con. Kết quả mỗi token là một **ID số nguyên**.

### 2.2 Embedding (nhúng từ)

Mỗi token ID được ánh xạ thành một **vector số thực** (vd 4096 chiều).

- Các từ có nghĩa gần nhau → vector gần nhau trong không gian.
- Ví dụ: `vector("chó")` gần `vector("mèo")` hơn `vector("ô tô")`.

Cộng thêm **positional encoding** (mã hóa vị trí) để mô hình biết token đứng ở đâu
trong câu, vì Transformer không xử lý tuần tự như RNN.

### 2.3 Transformer layers

Vector đi qua **nhiều lớp** (vd 32 lớp cho Qwen2.5-7B). Mỗi lớp gồm 2 thành phần:

1. **Self-Attention** — học quan hệ giữa các token.
2. **Feed-Forward Network (FFN)** — xử lý phi tuyến thêm.

Xem chi tiết ở mục 3.

### 2.4 Softmax & dự đoán token

Vector cuối cùng đi qua lớp **softmax** → ra phân phối xác suất trên toàn bộ từ vựng.
Mô hình chọn token có xác suất cao nhất (hoặc lấy mẫu theo nhiệt độ) và **lặp lại**
quá trình cho tới khi sinh đủ câu.

> Vì vậy LLM được gọi là **autoregressive**: sinh từng token một, token mới phụ thuộc
> vào các token đã sinh trước đó.

---

## 3. Kiến trúc Transformer

Transformer (2017, bài báo "Attention Is All You Need") gồm 2 khối:

- **Encoder** (mã hóa) — đọc và hiểu đầu vào.
- **Decoder** (giải mã) — sinh đầu ra.

> Các LLM hiện đại (GPT, Qwen, LLaMA) chỉ dùng **Decoder** (decoder-only).

Mỗi lớp Transformer gồm:

```
  ┌─────────────────────────────┐
  │         Input vector        │
  └────────────┬────────────────┘
               ▼
  ┌─────────────────────────────┐
  │  Multi-Head Self-Attention  │  ← token nhìn vào nhau
  └────────────┬────────────────┘
               ▼  (Residual + LayerNorm)
  ┌─────────────────────────────┐
  │   Feed-Forward Network      │  ← xử lý phi tuyến
  └────────────┬────────────────┘
               ▼  (Residual + LayerNorm)
  ┌─────────────────────────────┐
  │        Output vector        │
  └─────────────────────────────┘
```

### Residual connection & LayerNorm

- **Residual**: cộng đầu vào với đầu ra của khối (`x + F(x)`) để gradient truyền sâu,
  giúp huấn luyện mạng rất sâu ổn định.
- **LayerNorm**: chuẩn hóa để giá trị không bùng nổ / tắt dần.

---

## 4. Attention hoạt động thế nào?

Attention trả lời câu hỏi: **"token nào nên chú ý đến token nào?"**

Mỗi token tạo ra 3 vector:

| Vector | Vai trò | Ví dụ |
|--------|---------|-------|
| **Query (Q)** | "Tôi đang tìm gì?" | từ hiện tại |
| **Key (K)** | "Tôi có gì?" | các từ khác |
| **Value (V)** | "Nội dung thực sự là gì?" | thông tin |

Công thức chính:

```
Attention(Q, K, V) = softmax( Q·Kᵀ / √d_k ) · V
```

Giải thích:

1. `Q·Kᵀ` → tính độ tương đồng (dot product) giữa từ hiện tại và mọi từ khác.
2. `√d_k` → chia để chuẩn hóa, tránh giá trị quá lớn.
3. `softmax` → chuyển thành trọng số (tổng = 1).
4. `·V` → lấy trung bình có trọng số của các Value.

Ví dụ câu: **"Con mèo ngồi trên thảm vì nó mệt"**

- Khi xử lý từ "nó", Attention học được "nó" trỏ về "con mèo" (trọng số cao nhất),
  không phải "thảm".

**Multi-Head Attention**: chạy nhiều head song song, mỗi head học một loại quan hệ
khác nhau (ngữ pháp, ngữ nghĩa, vị trí...) rồi ghép lại.

---

## 5. Liên hệ với dự án

Dự án dùng **Ollama** chạy **Qwen2.5-7B** cục bộ (không gửi dữ liệu ra ngoài).

### 5.1 Nơi gọi LLM trong code

- File: `backend/app/services/document_ai.py`
- Hàm `_get_llm()` lấy instance LLM từ `llm_client` (dòng 380).
- Hàm `analyze_document_ai()` gửi prompt và bóc JSON kết quả (dòng 388).

### 5.2 Cách prompt được cấu trúc

Prompt hệ thống `_LLM_SYSTEM_PROMPT` (dòng 364) yêu cầu LLM trả về **một JSON hợp lệ**
với các trường:

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

### 5.3 Luồng xử lý NLP → Flashcard

```
Tài liệu upload
      │
      ▼
extract_text()           → trích text từ PDF/DOCX
      │
      ▼
analyze_document_ai()    → gửi text cho LLM (Ollama)
      │
      ▼
extract_json(resp)       → bóc JSON từ câu trả lời
      │
      ▼
flashcards[]             → lưu vào bảng flashcards (source="auto")
```

- Nếu LLM không chạy được → **fallback** sang thuật toán quy tắc `generate_flashcards()`
  (dòng 290) — đây chính là nhánh "NLP rule-based" trong dự án.

### 5.4 So sánh LLM vs rule-based trong dự án

| Tiêu chí | LLM (Qwen) | Rule-based |
|----------|------------|------------|
| Chất lượng | Tốt, tự nhiên | Cơ bản, rập khuôn |
| Cần GPU/RAM | Có (7B params) | Không |
| Tốc độ | Chậm hơn | Rất nhanh |
| Kết quả | Linh hoạt | Dự đoán được |

---

## 6. Câu hỏi ôn tập

1. Tokenization khác embedding ở điểm nào?
2. Tại sao Transformer cần positional encoding?
3. Trong công thức Attention, vai trò của `√d_k` là gì?
4. "Autoregressive" nghĩa là gì trong ngữ cảnh LLM?
5. Trong dự án, khi nào flashcard được sinh bằng LLM và khi nào bằng rule-based?

---

## Tài liệu tham khảo

- Vaswani et al. (2017), "Attention Is All You Need".
- OpenAI, "How GPT works" (tokenizer, embedding, decoder).
- Ollama docs: https://ollama.com/
- Qwen2.5: https://qwenlm.github.io/
