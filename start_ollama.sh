#!/usr/bin/env bash
# Khởi động Ollama (LLM local) cho Hệ thống Tài liệu
# Dùng:  bash start_ollama.sh
set -e

OLLAMA_BIN="$HOME/.local/ollama/bin/ollama"

if [ ! -f "$OLLAMA_BIN" ]; then
  echo "Chưa có Ollama. Chạy: curl -fsSL https://ollama.com/install.sh | sh"
  exit 1
fi

if curl -s --max-time 3 http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
  echo "Ollama đã đang chạy tại http://127.0.0.1:11434"
else
  echo "Đang khởi động Ollama serve..."
  export OLLAMA_HOST=127.0.0.1:11434
  nohup "$OLLAMA_BIN" serve > /tmp/ollama.log 2>&1 &
  sleep 5
fi

# Đảm bảo model đã có
if ! "$OLLAMA_BIN" list 2>/dev/null | grep -q "qwen2.5:7b"; then
  echo "Đang tải model qwen2.5:7b (lần đầu, ~4.7GB)..."
  "$OLLAMA_BIN" pull qwen2.5:7b
fi

echo "Ollama sẵn sàng. Model: qwen2.5:7b"
