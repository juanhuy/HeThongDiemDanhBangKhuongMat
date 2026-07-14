# Hệ thống điểm danh bằng khuôn mặt

### Run MySQL Server:

```bash
...\backend\database\> docker compose up -d
```
**vào giao diện dòng lệnh của MySQL bên trong container để kiểm tra dữ liệu**:

```bash
...\backend\database\> docker exec -it ai_attendance_mysql mysql -u admin -p
Enter password: adminpassword
```



### Run backend:

```bash
...\backend>.\.venv\Scripts\activate
uv run uvicorn app.main:app --reload --port 8000
```

**Tai lieu dac ta API Swager**: 

- http://localhost:8000/docs

