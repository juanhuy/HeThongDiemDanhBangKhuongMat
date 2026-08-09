import ctypes
import os
import sys

def preload_cuda():
    """
    Tự động liên kết các thư viện CUDA/cuDNN được cài đặt thông qua pip trong môi trường ảo (.venv)
    để ONNX Runtime và InsightFace có thể tìm thấy và chạy trên GPU bằng CUDAExecutionProvider.
    """
    if not sys.platform.startswith("linux"):
        return
        
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    python_version = f"python{sys.version_info.major}.{sys.version_info.minor}"
    
    nvidia_paths = [
        os.path.join(project_root, ".venv", "lib", python_version, "site-packages", "nvidia", "cu13", "lib"),
        os.path.join(project_root, ".venv", "lib", python_version, "site-packages", "nvidia", "cudnn", "lib"),
        os.path.join(project_root, ".venv", "lib", python_version, "site-packages", "nvidia", "nccl", "lib"),
        os.path.join(project_root, ".venv", "lib", python_version, "site-packages", "nvidia", "nvshmem", "lib")
    ]
    
    loaded_count = 0
    for folder in nvidia_paths:
        if os.path.exists(folder):
            for file in sorted(os.listdir(folder)):
                if file.endswith(".so") or ".so." in file:
                    full_path = os.path.join(folder, file)
                    try:
                        ctypes.CDLL(full_path, mode=ctypes.RTLD_GLOBAL)
                        loaded_count += 1
                    except Exception:
                        pass
    if loaded_count > 0:
        print(f"-> [CUDA Helper] Đã tự động tải {loaded_count} thư viện CUDA/cuDNN từ .venv.")
