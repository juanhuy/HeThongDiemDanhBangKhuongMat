"""Benchmark hiệu năng mô hình nhận diện khuôn mặt (InsightFace buffalo_l).

Đo:
  - Thời gian nhận diện trung bình / ảnh (detection + embedding + FAISS + liveness)
  - Thông lượng (ảnh/giây) và FPS ước tính
  - Độ chính xác nhận diện trên bộ ảnh đã đăng ký trong database/registered_images

Chạy:
    .venv/bin/python benchmark_face.py
"""
import glob
import os
import sys
import time

import cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from core.face_analysis import FaceAnalyzer


def measure_vram_mb():
    """Đọc VRAM đang dùng (MB) qua nvidia-smi nếu có."""
    try:
        out = os.popen("nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits").read().strip()
        return int(out.splitlines()[0])
    except Exception:
        return None


def main():
    print("=" * 60)
    print("BENCHMARK NHẬN DIỆN KHUÔN MẶT (InsightFace buffalo_l)")
    print("=" * 60)

    t0 = time.perf_counter()
    analyzer = FaceAnalyzer()
    load_time = time.perf_counter() - t0
    print(f"\n- Thời gian nạp model + DB + FAISS + warmup: {load_time:.2f}s")
    print(f"- Số vector đã biết trong FAISS: {len(analyzer.known_embeddings)}")
    vram = measure_vram_mb()
    if vram:
        print(f"- VRAM đang dùng: ~{vram} MB")

    known_ids = {n.split("_")[0].upper() for n in analyzer.known_names}
    images = sorted(glob.glob("database/registered_images/*.jpg"))
    if not images:
        images = ["test_face.jpg"]

    results = []
    for path in images:
        img = cv2.imread(path)
        if img is None:
            continue
        expected = os.path.basename(path).split(".")[0].upper()

        # Warmup 1 lần rồi đo 5 lần lấy trung bình
        analyzer.recognize_image(img)
        times = []
        last_faces = []
        for _ in range(5):
            t1 = time.perf_counter()
            last_faces = analyzer.recognize_image(img)
            times.append(time.perf_counter() - t1)
        avg_ms = sum(times) / len(times) * 1000

        known_hits = [f for f in last_faces if f["is_known"]]
        got = known_hits[0]["name"].split("_")[0].upper() if known_hits else None
        expect_known = expected in known_ids
        correct = (got == expected) if expect_known else (got is None)

        results.append({
            "file": os.path.basename(path),
            "faces": len(last_faces),
            "avg_ms": avg_ms,
            "got": got or "Unknown",
            "expected": expected if expect_known else "(không đăng ký)",
            "correct": correct,
        })
        print(f"  {os.path.basename(path):<28} {len(last_faces)} mặt "
              f"{avg_ms:7.1f} ms/ảnh  -> {got or 'Unknown'} "
              f"{'OK' if correct else 'SAI'}")

    if not results:
        print("Không đọc được ảnh nào để benchmark.")
        return

    avg_all = sum(r["avg_ms"] for r in results) / len(results)
    correct = sum(1 for r in results if r["correct"])
    total_faces = sum(r["faces"] for r in results)
    face_times = [r["avg_ms"] / r["faces"] for r in results if r["faces"] > 0]
    avg_face_ms = sum(face_times) / len(face_times) if face_times else 0.0

    print("\n" + "=" * 60)
    print("KẾT QUẢ TỔNG HỢP")
    print("=" * 60)
    print(f"- Độ trễ trung bình/ảnh : {avg_all:.1f} ms  (thông lượng {1000/avg_all:.1f} ảnh/s)")
    print(f"- Độ trễ trung bình/mặt : {avg_face_ms:.1f} ms  (ước tính {1000/avg_face_ms:.0f} FPS 1 mặt)")
    print(f"- Độ chính xác          : {correct}/{len(results)} ảnh ({correct/len(results)*100:.1f}%)")
    print(f"- VRAM sau khi chạy     : ~{measure_vram_mb()} MB")


if __name__ == "__main__":
    main()
