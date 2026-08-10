from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

response = client.get("/api/admin/lecturers")
print(response.status_code)
print(response.json())
