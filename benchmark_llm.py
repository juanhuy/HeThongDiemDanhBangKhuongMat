"""Benchmark hiệu năng LLM (Ollama) dùng cho chatbot & phân tích tài liệu.

Đo qua API /api/generate của Ollama:
  - Thời gian nạp model vào VRAM (load_duration)
  - Thời gian sinh (eval_duration)
  - Tốc độ sinh (tokens/giây)
  - Tổng thời gian phản hồi

Chạy:
    .venv/bin/python benchmark_llm.py [model]
"""
import os
import sys
import time

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config.settings import settings

LLM_CFG = settings.config.get("llm", {})
BASE_URL = (LLM_CFG.get("base_url") or "http://127.0.0.1:11434").rstrip("/")
MODEL = sys.argv[1] if len(sys.argv) > 1 else (LLM_CFG.get("model") or "qwen2.5:7b")

PROMPTS = [
    "Tóm tắt quy trình đăng ký môn học trong 3 câu ngắn gọn.",
    "Liệt kê 5 điều sinh viên cần lưu ý khi xin nghỉ phép.",
]


def measure_vram_mb():
    try:
        out = os.popen("nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits").read().strip()
        return int(out.splitlines()[0])
    except Exception:
        return None


def bench_once(prompt: str, num_predict: int = 256, temperature: float = 0.3):
    wall0 = time.perf_counter()
    r = requests.post(
        f"{BASE_URL}/api/generate",
        json={"model": MODEL, "prompt": prompt, "stream": False,
              "options": {"num_predict": num_predict, "temperature": temperature}},
        timeout=600,
    )
    r.raise_for_status()
    wall = time.perf_counter() - wall0
    j = r.json()
    eval_count = j.get("eval_count") or 0
    eval_dur_s = (j.get("eval_duration") or 0) / 1e9
    load_dur_s = (j.get("load_duration") or 0) / 1e9
    prompt_dur_s = (j.get("prompt_eval_duration") or 0) / 1e9
    tokens_s = eval_count / eval_dur_s if eval_dur_s > 0 else 0.0
    return {
        "wall": wall,
        "load_s": load_dur_s,
        "prompt_s": prompt_dur_s,
        "eval_s": eval_dur_s,
        "tokens": eval_count,
        "tokens_s": tokens_s,
    }


def main():
    print("=" * 60)
    print(f"BENCHMARK LLM (Ollama) — model: {MODEL}")
    print("=" * 60)
    print(f"- VRAM trước khi nạp: ~{measure_vram_mb()} MB")

    # Lần đầu có thể mất thời gian nạp model vào VRAM
    print("\n[Lần chạy 1 — có thể bao gồm thời gian nạp model]")
    r1 = bench_once(PROMPTS[0])
    print(f"  Thời gian nạp model : {r1['load_s']:.2f}s")
    print(f"  Prompt processing   : {r1['prompt_s']:.2f}s")
    print(f"  Sinh {r1['tokens']} tokens trong {r1['eval_s']:.2f}s "
          f"({r1['tokens_s']:.1f} tokens/s)")
    print(f"  Tổng thời gian       : {r1['wall']:.2f}s")

    print("\n[Lần chạy 2 — model đã nạp sẵn, đo ổn định]")
    totals = {"tokens": 0, "eval_s": 0.0}
    for i, p in enumerate(PROMPTS, 1):
        r = bench_once(p)
        totals["tokens"] += r["tokens"]
        totals["eval_s"] += r["eval_s"]
        print(f"  Prompt {i}: {r['tokens']} tokens, {r['eval_s']:.2f}s, "
              f"{r['tokens_s']:.1f} tokens/s, wall {r['wall']:.2f}s")

    print("\n" + "=" * 60)
    print("KẾT QUẢ TỔNG HỢP")
    print("=" * 60)
    avg_tps = totals["tokens"] / totals["eval_s"] if totals["eval_s"] > 0 else 0
    print(f"- Tốc độ sinh trung bình : {avg_tps:.1f} tokens/s")
    print(f"- VRAM sau khi nạp      : ~{measure_vram_mb()} MB")


if __name__ == "__main__":
    main()
