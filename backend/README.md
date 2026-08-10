## Hướng dẫn khởi động
*1> Khởi động tự động 
'''
cd ..\HeThongDiemDanhBangKhuongMat

    python start_system.py
'''
*2> Khởi động từng bước 
'''
cd ..\HeThongDiemDanhBangKhuongMat\backend\database
docker compose up -d
cd ..\HeThongDiemDanhBangKhuongMat\backend
.\.venv\Scripts\activate
uv run uvicorn app.main:app --reload --port 8000
''' 
