"""Test luồng xác thực: login, sai mật khẩu, rate-limit, đổi mật khẩu."""
import pytest
import httpx

from conftest import BASE_URL
from fixtures import auth


def test_login_admin_ok(client, admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 20


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", data={"username": "admin", "password": "sai_mat_khau"})
    assert r.status_code in (401, 429)  # 401 sai pass, hoặc 429 nếu bị rate-limit


def test_login_unknown_user(client):
    r = client.post("/api/auth/login", data={"username": "khongton tai", "password": "123456"})
    assert r.status_code == 401


def test_rate_limit_login(client):
    """Sau 5 lần sai liên tiếp từ cùng IP -> 429."""
    # Dùng username giả để không ảnh hưởng tài khoản thật
    for i in range(5):
        client.post("/api/auth/login", data={"username": "ratelimit_test", "password": f"x{i}"})
    r = client.post("/api/auth/login", data={"username": "ratelimit_test", "password": "ok"})
    assert r.status_code == 429


def test_change_password(client, admin_token):
    # Đổi sang mật khẩu mới, đăng nhập lại, rồi đổi về
    r = client.post("/api/auth/change-password",
                    headers=auth(admin_token),
                    data={"current_password": "123456", "new_password": "temp123"})
    assert r.status_code == 200

    r = client.post("/api/auth/login", data={"username": "admin", "password": "temp123"})
    assert r.status_code == 200

    # đổi về mật khẩu cũ
    new_tok = r.json()["access_token"]
    r = client.post("/api/auth/change-password",
                    headers=auth(new_tok),
                    data={"current_password": "temp123", "new_password": "123456"})
    assert r.status_code == 200


def test_change_password_wrong_current(client, admin_token):
    r = client.post("/api/auth/change-password",
                    headers=auth(admin_token),
                    data={"current_password": "sai", "new_password": "abcdef"})
    assert r.status_code == 400
