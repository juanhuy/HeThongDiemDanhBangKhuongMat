"""Cấu hình pytest: đường dẫn + conftest.

Chạy:  cd backend && ../.venv/bin/python -m pytest tests/ -v
Yêu cầu backend đang chạy tại http://127.0.0.1:8000
"""
import os
import sys

# Để import app.* (nếu cần)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8000")

pytest_plugins = ["tests.fixtures"]
