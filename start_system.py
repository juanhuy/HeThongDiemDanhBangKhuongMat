import os
import subprocess
import platform
import time

# --- CẤU HÌNH ĐƯỜNG DẪN ---
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, 'backend')
DB_DIR = os.path.join(BACKEND_DIR, 'database')
FRONTEND_DIR = os.path.join(ROOT_DIR, 'frontend')

def clear_screen():
    """Xóa màn hình terminal cho gọn gàng."""
    os.system('cls' if os.name == 'nt' else 'clear')

def run_in_new_terminal(command, cwd, title):
    """Mở một terminal mới và chạy lệnh (hỗ trợ Windows, macOS, Linux)."""
    system = platform.system()
    if system == "Windows":
        cmd = f'start "{title}" cmd /k "cd /d "{cwd}" && {command}"'
        subprocess.Popen(cmd, shell=True)
    elif system == "Darwin":
        escaped_cmd = command.replace('"', '\\"')
        script = f'''
        tell application "Terminal"
            do script "cd '{cwd}' && {escaped_cmd}"
            activate
        end tell
        '''
        subprocess.Popen(["osascript", "-e", script])
    else:  
        try:
            subprocess.Popen(['gnome-terminal', '--', 'bash', '-c', f'cd "{cwd}" && {command}; exec bash'])
        except Exception:
            subprocess.Popen(command, shell=True, cwd=cwd)

def ensure_docker_running():
    """Kiểm tra và yêu cầu người dùng bật Docker nếu chưa bật."""
    print("⏳ Đang kiểm tra trạng thái Docker...")
    while True:
        try:
            # Chạy lệnh docker info để kiểm tra xem daemon có phản hồi không
            subprocess.run(['docker', 'info'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            print("✅ Docker đang hoạt động!")
            return True
        except FileNotFoundError:
            print("❌ LỖI: Không tìm thấy lệnh 'docker' trên máy. Vui lòng cài đặt Docker trước!")
            return False
        except subprocess.CalledProcessError:
            print("\n❌ LỖI: Docker chưa được khởi động (Docker daemon không phản hồi)!")
            print("👉 HƯỚNG DẪN: Hãy mở Docker Desktop lên (hoặc start service docker).")
            input("🔄 Sau khi Docker đã chạy, hãy nhấn [Enter] để hệ thống kiểm tra lại và đi tiếp...")
            print("⏳ Đang kiểm tra lại...")

def docker_control(action):
    """Thực thi các lệnh điều khiển Docker Compose cho Database."""
    if not ensure_docker_running():
        return

    if not os.path.exists(DB_DIR):
        print(f"⚠️ Không tìm thấy thư mục database tại {DB_DIR}")
        return

    commands = {
        "up": (['docker', 'compose', 'up', '-d'], "Đang khởi động Database (chạy ngầm)..."),
        "restart": (['docker', 'compose', 'restart'], "Đang khởi động lại Database..."),
        "stop": (['docker', 'compose', 'stop'], "Đang tạm dừng Database..."),
        "start": (['docker', 'compose', 'start'], "Đang tiếp tục chạy Database..."),
        "down": (['docker', 'compose', 'down'], "Đang tắt và gỡ bỏ container Database...")
    }

    if action in commands:
        cmd, msg = commands[action]
        print(f"\n{msg}")
        try:
            subprocess.run(cmd, cwd=DB_DIR, check=True)
            print("✅ Thực thi thành công!")
        except subprocess.CalledProcessError:
            print("❌ LỖI: Lệnh Docker thất bại.")

def start_backend():
    """Kiểm tra môi trường và khởi động Backend."""
    if not os.path.exists(BACKEND_DIR):
        print(f"⚠️ Không tìm thấy thư mục backend tại {BACKEND_DIR}")
        return

    venv_path = os.path.join(BACKEND_DIR, '.venv')
    if not os.path.exists(venv_path):
        print("\n⏳ Đang đồng bộ môi trường ảo bằng 'uv sync'...")
        try:
            subprocess.run(['uv', 'sync'], cwd=BACKEND_DIR, check=True)
            print("✅ Đã đồng bộ thư viện thành công.")
        except subprocess.CalledProcessError:
            print("❌ LỖI: Quá trình đồng bộ 'uv sync' thất bại.")
            return
        except FileNotFoundError:
            print("❌ LỖI: Không tìm thấy lệnh 'uv'.")
            return
    
    if platform.system() == "Windows":
        backend_cmd = ".\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --port 8000"
    else:
        backend_cmd = "./.venv/bin/python -m uvicorn app.main:app --reload --port 8000"
    
    run_in_new_terminal(backend_cmd, BACKEND_DIR, "Backend Server - FastAPI")
    print("✅ Đã mở cửa sổ mới để chạy Backend.")

def start_frontend():
    """Khởi động Frontend."""
    if not os.path.exists(FRONTEND_DIR):
        print(f"⚠️ Không tìm thấy thư mục frontend tại {FRONTEND_DIR}")
        return
    frontend_cmd = "npm install && npm run dev" 
    run_in_new_terminal(frontend_cmd, FRONTEND_DIR, "Frontend Server")
    print("✅ Đã mở cửa sổ mới để chạy Frontend.")

def start_all():
    """Khởi động toàn bộ hệ thống."""
    print("\n--- BƯỚC 0: KIỂM TRA DOCKER ---")
    if not ensure_docker_running():
        print("⚠️ Hủy khởi động hệ thống vì không có Docker.")
        return False

    print("\n--- BƯỚC 1: KHỞI ĐỘNG DATABASE ---")
    docker_control("up")
    time.sleep(2)
    print("\n--- BƯỚC 2: KHỞI ĐỘNG BACKEND ---")
    start_backend()
    print("\n--- BƯỚC 3: KHỞI ĐỘNG FRONTEND ---")
    start_frontend()
    return True

def show_menu():
    """Hiển thị menu tương tác."""
    while True:
        clear_screen()
        print("="*60)
        print("    ⚙️  BẢNG ĐIỀU KHIỂN HỆ THỐNG ĐIỂM DANH")
        print("="*60)
        print("[1]. 🚀 Khởi động lại toàn bộ hệ thống (DB, Backend, Frontend)")
        print("-" * 60)
        print("ĐIỀU KHIỂN DATABASE (DOCKER):")
        print("[2]. 🐘 Khởi động lại (Restart)")
        print("[3]. ⏸️  Tạm dừng (Stop)")
        print("[4]. ▶️  Tiếp tục (Start)")
        print("[5]. 🛑 Tắt hoàn toàn (Down - Xóa container)")
        print("-" * 60)
        print("ĐIỀU KHIỂN SERVER (FASTAPI / FRONTEND):")
        print("[6]. 🔄 Mở lại Backend (Lưu ý: Hãy đóng cửa sổ Backend cũ trước)")
        print("[7]. 🌐 Mở lại Frontend (Lưu ý: Hãy đóng cửa sổ Frontend cũ trước)")
        print("-" * 60)
        print("[0]. ❌ Thoát")
        print("="*60)
        
        choice = input("👉 Nhập lựa chọn của bạn (0-7): ").strip()
        
        if choice == '1':
            start_all()
        elif choice == '2':
            docker_control("restart")
        elif choice == '3':
            docker_control("stop")
        elif choice == '4':
            docker_control("start")
        elif choice == '5':
            docker_control("down")
        elif choice == '6':
            print("\n⚠️ CHÚ Ý: Nếu cửa sổ Backend cũ đang chạy, port 8000 sẽ bị chiếm dụng.")
            print("Hãy chắc chắn bạn đã tắt terminal Backend cũ.")
            input("Nhấn Enter để tiếp tục mở Backend mới...")
            start_backend()
        elif choice == '7':
            start_frontend()
        elif choice == '0':
            print("\n👋 Đã thoát bảng điều khiển. Chúc bạn code vui vẻ!")
            break
        else:
            print("\n⚠️ Lựa chọn không hợp lệ, vui lòng thử lại!")
        
        input("\nNhấn Enter để tiếp tục...")

if __name__ == "__main__":
    try:
        clear_screen()
        print("="*60)
        print("    🚀 ĐANG TỰ ĐỘNG KHỞI ĐỘNG HỆ THỐNG LẦN ĐẦU...")
        print("="*60)
        
        # Mặc định gọi khởi động toàn bộ khi chạy file
        is_success = start_all()
        
        if is_success:
            print("\n" + "="*60)
            print("🎉 QUÁ TRÌNH KHỞI ĐỘNG TỰ ĐỘNG HOÀN TẤT!")
            print("👉 Swagger API Docs (Backend): http://localhost:8000/docs")
            print("="*60)
        else:
            print("\n" + "="*60)
            print("⚠️ HỆ THỐNG CHƯA ĐƯỢC KHỞI ĐỘNG HOÀN TOÀN.")
            print("="*60)
        
        input("\n👉 Nhấn Enter để mở Bảng Điều Khiển (Menu)...")
        
        # Sau khi chạy xong mặc định, gọi Menu ra
        show_menu()
        
    except KeyboardInterrupt:
        print("\n\n👋 Đã thoát script đột ngột. Tạm biệt!")