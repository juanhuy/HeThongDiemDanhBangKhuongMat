import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from config.settings import settings

app = FastAPI(
    title="He thong nhan dien khuon mat API",
    description="Web Backend Server cho viec nhan dien khuon mat va diem danh su dung InsightFace & FastAPI.",
    version="1.0.0"
)

# Cấu hình CORS cho phép mọi nguồn kết nối (thuận tiện cho việc phát triển web front-end)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký router chứa các endpoints nghiệp vụ
app.include_router(router)

if __name__ == "__main__":
    # Đọc cấu hình mạng từ file config.yaml
    server_cfg = settings.server
    host = server_cfg.get("host", "127.0.0.1")
    port = server_cfg.get("port", 8000)
    
    print(f"\n========================================================")
    print(f"Khởi chạy Web API Server tại: http://{host}:{port}")
    print(f"Tài liệu hướng dẫn trực quan (Swagger UI): http://{host}:{port}/docs")
    print(f"========================================================\n")
    
    uvicorn.run("api.main:app", host=host, port=port, reload=True)
