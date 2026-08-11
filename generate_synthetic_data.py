"""Sinh dữ liệu GIẢ LẬP các tình huống kiểm duyệt tài liệu (làm giàu dataset fine-tune).

- Định dạng JSONL giống hệt hệ thống (instruction/input/output).
- Nội dung mô phỏng tài liệu học thuật chứa (hoặc không chứa) vi phạm.
- Chạy:  python generate_synthetic_data.py
- Kết quả: dataset/moderation_synthetic.jsonl
"""
import json
import random

random.seed(2026)

INSTRUCTION = (
    "Kiểm duyệt đoạn nội dung sau theo các loại vi phạm: phapluat, dothi, doitruy, "
    "spam, rip, link_doc_hai, buon_ban, daovan, sai_chu_de, chat_luong_thap, sai_lech. "
    'Trả về JSON {"verdict": "approved"|"rejected"|"review", "risk": 0-1, '
    '"reason": "...", "categories": [...]}.'
)

# --- Nội dung học thuật BÌNH THƯỜNG ---
ACADEMIC = [
    "Bài giảng chương 2 trình bày về cấu trúc dữ liệu mảng và danh sách liên kết.",
    "Thuật toán tìm kiếm nhị phân có độ phức tạp O(log n), áp dụng trên mảng đã sắp xếp.",
    "Trong mạng máy tính, giao thức TCP đảm bảo truyền dữ liệu tin cậy bằng bắt tay ba bước.",
    "Cơ sở dữ liệu quan hệ dùng khóa chính để xác định duy nhất mỗi bản ghi.",
    "Hàm băm SHA-256 được dùng phổ biến trong xác thực và chữ ký số.",
    "Độ phức tạp của sắp xếp nổi bọt trong trường hợp xấu nhất là O(n bình phương).",
    "Kiến trúc client-server gồm máy khách gửi yêu cầu và máy chủ phản hồi kết quả.",
    "Trong học máy, tập huấn luyện và tập kiểm tra được tách riêng để đánh giá khách quan.",
    "Lập trình hướng đối tượng có bốn đặc tính: đóng gói, kế thừa, đa hình, trừu tượng.",
    "Firewall lọc lưu lượng mạng dựa trên tập luật được cấu hình trước.",
    "Địa chỉ IP gồm hai phiên bản IPv4 và IPv6, IPv6 có không gian địa chỉ rộng hơn.",
    "Ngăn xếp hoạt động theo nguyên tắc LIFO, hàng đợi hoạt động theo FIFO.",
    "Kỹ thuật mã hóa khóa công khai RSA dựa trên độ khó phân tích thừa số nguyên tố.",
    "Trong thiết kế hệ thống, nguyên tắc chia để trị giúp giải quyết bài toán lớn.",
    "Chuẩn IEEE 802.11 định nghĩa mạng không dây WLAN.",
    "Vi điều khiển gồm CPU, bộ nhớ và các cổng vào ra được tích hợp trên một chip.",
    "Giao thức HTTP hoạt động theo mô hình yêu cầu - phản hồi trên nền TCP.",
    "Tổng quan về trí tuệ nhân tạo: học có giám sát, không giám sát và học tăng cường.",
]

# --- Các câu VI PHẠM theo từng loại ---
VIOLATIONS = {
    "phapluat": [
        "Lời kêu gọi nhân dân nổi dậy lật đổ chính quyền hiện hành ngay lập tức.",
        "Hãy tổ chức biểu tình vũ trang đánh phá trụ sở chính phủ đêm nay.",
        "Chính phủ hiện tại là chế độ độc tài, cần phải bị lật đổ bằng mọi giá.",
        "Kêu gọi khủng bố quan chức nhà nước để trả thù.",
        "Tuyên truyền kích động bạo loạn tại các trường đại học trong cả nước.",
    ],
    "dothi": [
        "Tôi mắng thằng ngu dốt này, đồ vô học không xứng đáng.",
        "Cái lũ đàn bà ngu đần chỉ biết ăn hại, mất dạy.",
        "Đồ khốn nạn, mày là đứa mất dạy, cút ngay khỏi đây.",
        "Người dân tộc thiểu số đều là lũ lười biếng, không ra gì.",
        "Chửi thề: đm thằng điên này nói toàn chuyện nhảm nhí.",
    ],
    "doitruy": [
        "Video khiêu dâm 18+ không che, link trong mô tả.",
        "Cảnh quay nhạy cảm nóng bỏng không phù hợp, xem ngay.",
        "Nội dung đồi trụy mô tả chi tiết hành vi tình dục không phù hợp.",
        "Album ảnh nóng bỏng dành cho người lớn, tải về miễn phí.",
    ],
    "spam": [
        "Đăng ký khóa học tiếng Anh giảm 50% hôm nay, liên hệ 0909 123 456.",
        "Mời bạn tham gia nhóm kiếm tiền online, thu nhập 10 triệu mỗi tháng.",
        "Nhắn tin ngay để nhận quà tặng miễn phí, chỉ còn vài suất cuối.",
        "Quảng cáo sản phẩm giảm giá sốc, đặt hàng tại link bên dưới.",
        "Tuyển cộng tác viên bán hàng đa cấp, thu nhập không giới hạn.",
    ],
    "rip": [
        "Hồ sơ sinh viên Nguyễn Văn A, CCCD 079123456789, SĐT 0909123456.",
        "Danh sách tài khoản ngân hàng và mật khẩu của các thành viên lớp.",
        "Thông tin cá nhân của giảng viên: địa chỉ nhà, số điện thoại, CCCD.",
        "File excel chứa email và số điện thoại toàn bộ sinh viên khóa 2025.",
    ],
    "link_doc_hai": [
        "Tải phần mềm hack game miễn phí tại http://link-la.xyz/download",
        "Mở link này để nhận tiền thưởng: https://scam-site.tld/promo",
        "File cài đặt có chứa keylogger, hãy chạy thử để xem kết quả.",
        "Truy cập web đen https://malware.example.com để lấy tool miễn phí.",
    ],
    "buon_ban": [
        "Cần mua luận văn tốt nghiệp chất lượng cao? Chỉ 500 nghìn, giao trong 3 ngày.",
        "Bán bài tập mẫu môn Cấu trúc dữ liệu, liên hệ Zalo để mua.",
        "Dịch vụ làm bài tập hộ, nhận bài ngay trong ngày, giá rẻ.",
        "Mua đồ án tốt nghiệp điểm cao, bảo hành 1 năm.",
    ],
    "daovan": [
        "Đoạn này được sao chép nguyên văn từ giáo trình mà không ghi nguồn.",
        "Bài viết chép nguyên văn từ bài đăng trên mạng của tác giả khác.",
        "Toàn bộ chương 1 trùng nguyên văn với cuốn sách có bản quyền.",
    ],
    "sai_chu_de": [
        "Truyện cười: con mèo và con chuột gặp nhau trên cánh đồng, trò chuyện vui vẻ.",
        "Tin tức giải trí showbiz hôm nay, ca sĩ nổi tiếng công khai chuyện tình.",
        "Nội dung xem bói, tâm linh hoàn toàn không liên quan môn học.",
        "Bài thơ sáng tác ngẫu hứng về mùa thu, không phải tài liệu học tập.",
    ],
    "chat_luong_thap": [
        "Tài liệu chỉ có một dòng chữ duy nhất, không đủ nội dung để học.",
        "Bản scan mờ không thể đọc được chữ, toàn hình ảnh nhiễu.",
        "File rỗng không có bất kỳ nội dung nào.",
        "Chỉ có một trang tiêu đề, không có phần thân bài.",
    ],
    "sai_lech": [
        "Khẳng định trái đất phẳng, trái ngược hoàn toàn với khoa học.",
        "Tuyên bố vắc-xin gây tự kỷ, thông tin sai lệch nguy hiểm.",
        "Nội dung khẳng định 2 + 2 = 5 để đánh lừa người đọc.",
        "Phương pháp chữa ung thư bằng nước muối, phản khoa học.",
    ],
    "trung_lap": [
        "Đây là bản sao gần như nguyên vẹn của tài liệu đã đăng trước trong hệ thống.",
        "Nội dung trùng lặp 90% với một tài liệu khác đã tồn tại.",
    ],
}

REJECT_REASON = {
    "phapluat": "Nội dung vi phạm pháp luật/chính trị.",
    "dothi": "Ngôn từ độc hại, xúc phạm.",
    "doitruy": "Nội dung đồi trụy/18+.",
    "spam": "Nội dung quảng cáo, spam.",
    "rip": "Lộ thông tin cá nhân.",
    "link_doc_hai": "Chứa liên kết/file độc hại.",
    "buon_ban": "Rao bán tài liệu, kinh doanh trái phép.",
}
REVIEW_REASON = {
    "daovan": "Nghi ngờ sao chép không ghi nguồn.",
    "sai_chu_de": "Nội dung không liên quan học thuật.",
    "chat_luong_thap": "Chất lượng tài liệu quá thấp.",
    "sai_lech": "Nội dung sai lệch/phản khoa học.",
    "trung_lap": "Nội dung trùng lặp tài liệu đã có.",
}


def make_doc(acad_count, violation=None):
    """Tạo một tài liệu: câu học thuật + (tuỳ chọn) câu vi phạm."""
    parts = random.sample(ACADEMIC, k=acad_count)
    if violation:
        parts.append(random.choice(VIOLATIONS[violation]))
    return " ".join(parts)


def main():
    samples = []
    # 1) Duyệt (approved) - tài liệu học thuật thuần
    for _ in range(1200):
        doc = make_doc(random.randint(2, 4))
        samples.append({
            "instruction": INSTRUCTION,
            "input": doc,
            "output": json.dumps(
                {"verdict": "approved", "risk": round(random.uniform(0.0, 0.2), 2),
                 "reason": "Nội dung học thuật bình thường.", "categories": []},
                ensure_ascii=False),
        })

    # 2) Từ chối (rejected) - mỗi loại nghiêm trọng ~100 mẫu
    for cat in REJECT_REASON:
        for _ in range(100):
            doc = make_doc(random.randint(1, 2), violation=cat)
            samples.append({
                "instruction": INSTRUCTION,
                "input": doc,
                "output": json.dumps(
                    {"verdict": "rejected", "risk": round(random.uniform(0.8, 1.0), 2),
                     "reason": REJECT_REASON[cat], "categories": [cat]},
                    ensure_ascii=False),
            })

    # 3) Cần xem xét (review) - mỗi loại trung bình ~60 mẫu
    for cat in REVIEW_REASON:
        for _ in range(60):
            doc = make_doc(random.randint(1, 2), violation=cat)
            samples.append({
                "instruction": INSTRUCTION,
                "input": doc,
                "output": json.dumps(
                    {"verdict": "review", "risk": round(random.uniform(0.5, 0.7), 2),
                     "reason": REVIEW_REASON[cat], "categories": [cat]},
                    ensure_ascii=False),
            })

    random.shuffle(samples)
    with open("dataset/moderation_synthetic.jsonl", "w", encoding="utf-8") as f:
        for s in samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    print(f"Da sinh {len(samples)} mau -> dataset/moderation_synthetic.jsonl")
    from collections import Counter
    c = Counter(json.loads(s["output"])["verdict"] for s in samples)
    print("Phan bo:", dict(c))


if __name__ == "__main__":
    main()
