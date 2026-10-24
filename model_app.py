from pathlib import Path
import modal

# Place this file in the root of "Deep Learning Project", beside app.py and backend/.
ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
API_SOURCE = next((p for p in (ROOT / "app.py", BACKEND / "app.py") if p.is_file()), ROOT / "app.py")

if not BACKEND.is_dir():
    raise RuntimeError("Missing ./backend. Put modal_app.py in your project root.")
if not API_SOURCE.is_file():
    raise RuntimeError("Missing ./app.py. Put modal_app.py beside your existing app.py.")
for dependency_file in (
    "codeformer-linux.txt",
    "restoreformerpp-linux.txt",
    "sparnet-linux.txt",
    "rgformer-linux.txt",
):
    if not (BACKEND / "modal-deps" / dependency_file).is_file():
        raise RuntimeError(f"Missing backend/modal-deps/{dependency_file}")

app = modal.App("ai-face-enhancer-backend")

# The API process uses Torch 2.5.1 for the health check. Each model keeps its
# own venv because the model repositories require different Torch versions.
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "build-essential",
        "cmake",
        "ffmpeg",
        "git",
        "libgl1",
        "libglib2.0-0",
        "libgomp1",
        "libsm6",
        "libxext6",
        "libxrender1",
    )
    .pip_install(
        "fastapi==0.115.12",
        "python-multipart==0.0.20",
        "numpy==1.26.4",
        "Pillow==10.4.0",
    )
    .pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        index_url="https://download.pytorch.org/whl/cu124",
    )
    # Use copy=True so build steps can install from the Linux dependency files,
    # and the inference repos/checkpoints are present in the container image.
    .add_local_dir(
        str(BACKEND),
        remote_path="/root/project/backend",
        copy=True,
        ignore=["**/.git/**", "**/__pycache__/**"],
    )
    # The supplied app.py expects to live one level below PROJECT_ROOT.
    .add_local_file(
        str(API_SOURCE),
        remote_path="/root/project/backend/app.py",
        copy=True,
    )
    .run_commands(
        "mkdir -p /root/project",
        # CodeFormer
        "python -m venv /root/project/.venv-codeformer",
        "mkdir -p /root/project/.venv-codeformer/Scripts && ln -sfn ../bin/python /root/project/.venv-codeformer/Scripts/python.exe",
        "/root/project/.venv-codeformer/bin/python -m pip install --upgrade pip setuptools wheel",
        "/root/project/.venv-codeformer/bin/python -m pip install torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cu124",
        "/root/project/.venv-codeformer/bin/python -m pip install -r /root/project/backend/modal-deps/codeformer-linux.txt",
        # RestoreFormer++
        "python -m venv /root/project/.venv-restoreformerpp",
        "mkdir -p /root/project/.venv-restoreformerpp/Scripts && ln -sfn ../bin/python /root/project/.venv-restoreformerpp/Scripts/python.exe",
        "/root/project/.venv-restoreformerpp/bin/python -m pip install --upgrade 'pip<24.1' setuptools wheel",
        "/root/project/.venv-restoreformerpp/bin/python -m pip install torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cu124",
        "/root/project/.venv-restoreformerpp/bin/python -m pip install -r /root/project/backend/modal-deps/restoreformerpp-linux.txt",
        # SPARNetHD
        "python -m venv /root/project/.venv-sparnet",
        "mkdir -p /root/project/.venv-sparnet/Scripts && ln -sfn ../bin/python /root/project/.venv-sparnet/Scripts/python.exe",
        "/root/project/.venv-sparnet/bin/python -m pip install --upgrade pip setuptools wheel",
        "/root/project/.venv-sparnet/bin/python -m pip install torch==2.12.0 torchvision==0.27.0 --index-url https://download.pytorch.org/whl/cu132",
        "/root/project/.venv-sparnet/bin/python -m pip install -r /root/project/backend/modal-deps/sparnet-linux.txt",
        # RGFormer
        "python -m venv /root/project/.venv-rgformer",
        "mkdir -p /root/project/.venv-rgformer/Scripts && ln -sfn ../bin/python /root/project/.venv-rgformer/Scripts/python.exe",
        "/root/project/.venv-rgformer/bin/python -m pip install --upgrade pip setuptools wheel",
        "/root/project/.venv-rgformer/bin/python -m pip install torch==2.0.0 torchvision==0.15.0 --index-url https://download.pytorch.org/whl/cu118",
        "/root/project/.venv-rgformer/bin/python -m pip install -r /root/project/backend/modal-deps/rgformer-linux.txt",
    )
)

@app.function(
    image=image,
    gpu="A10G",
    cpu=4,
    memory=16384,
    timeout=1200,
    scaledown_window=300,
    secrets=[modal.Secret.from_name("face-enhancer-api-key")],
)
@modal.concurrent(max_inputs=1)
@modal.asgi_app()
def fastapi_app():
    import sys

    sys.path.insert(0, "/root/project/backend")
    from app import app as api

    return api
