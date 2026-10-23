
import io
import os
import secrets
import subprocess
import tempfile
import shutil
import time
from pathlib import Path

import numpy as np
import torch
from PIL import Image, UnidentifiedImageError
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    Depends,
    Header,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

# --------------------------------------------------
# PROJECT PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SMALL_IMAGE_MAX_SIDE = 32
SUPPORTED_OUTPUT_SIZES = (128, 256, 512)

# SPARNet / SPARNetHD
SPARNET_DIR = PROJECT_ROOT / "backend" / "Face-SPARNet"
SPARNET_PRETRAIN_DIR = SPARNET_DIR / "pretrain_models"
SPARNET_PYTHON_EXE = PROJECT_ROOT / ".venv-sparnet" / "Scripts" / "python.exe"

HD_ALIGNED_SCRIPT = SPARNET_DIR / "test.py"
HD_UNALIGNED_SCRIPT = SPARNET_DIR / "test_enhance_single_unalign.py"
HD_WEIGHTS = SPARNET_PRETRAIN_DIR / "SPARNetHD_V4_Attn2D_net_H-epoch10.pth"
FACE_DETECTOR = SPARNET_PRETRAIN_DIR / "mmod_human_face_detector.dat"
LANDMARK_PREDICTOR = SPARNET_PRETRAIN_DIR / "shape_predictor_5_face_landmarks.dat"
FFHQ_TEMPLATE = SPARNET_PRETRAIN_DIR / "FFHQ_template.npy"

# CodeFormer
CODEFORMER_DIR = PROJECT_ROOT / "backend" / "CodeFormer"
CODEFORMER_PYTHON_EXE = PROJECT_ROOT / ".venv-codeformer" / "Scripts" / "python.exe"
CODEFORMER_SCRIPT = CODEFORMER_DIR / "inference_codeformer.py"
CODEFORMER_WEIGHTS = CODEFORMER_DIR / "weights" / "CodeFormer" / "codeformer.pth"
CODEFORMER_DETECTION = CODEFORMER_DIR / "weights" / "facelib" / "detection_Resnet50_Final.pth"
CODEFORMER_PARSING = CODEFORMER_DIR / "weights" / "facelib" / "parsing_parsenet.pth"

# RestoreFormer++
RESTOREFORMER_DIR = PROJECT_ROOT / "backend" / "RestoreFormerPlusPlus"
RESTOREFORMER_PYTHON_EXE = PROJECT_ROOT / ".venv-restoreformerpp" / "Scripts" / "python.exe"
RESTOREFORMER_SCRIPT = RESTOREFORMER_DIR / "inference.py"

# RGFormer
RGFORMER_DIR = PROJECT_ROOT / "backend" / "RGFormer"
RGFORMER_PYTHON_EXE = PROJECT_ROOT / ".venv-rgformer" / "Scripts" / "python.exe"
RGFORMER_SCRIPT = RGFORMER_DIR / "infer.py"
RGFORMER_PREPARE_SCRIPT = RGFORMER_DIR / "prepare_rgformer_inputs.py"
RGFORMER_WEIGHTS = RGFORMER_DIR / "weights" / "best.pt"
RGFORMER_CODEFORMER_CACHE = RGFORMER_DIR / "weights" / "CodeFormer" / "codeformer.pth"


# --------------------------------------------------
# API AUTHENTICATION
# --------------------------------------------------

def verify_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    """
    Protect the API using a random key configured outside the source code.
    Never commit the key to GitHub or embed it in a Vite environment variable.
    """
    expected_key = os.environ.get("FACE_ENHANCER_API_KEY", "")

    if not expected_key:
        raise HTTPException(
            status_code=503,
            detail="Backend API key is not configured.",
        )

    if not x_api_key or not secrets.compare_digest(
        x_api_key, expected_key
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key.",
        )


# --------------------------------------------------
# IMAGE METRICS
# --------------------------------------------------

def calculate_image_metrics(image: Image.Image) -> dict:
    """Calculate image statistics, not subjective quality scores."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)

    luminance = (
        0.2126 * rgb[:, :, 0]
        + 0.7152 * rgb[:, :, 1]
        + 0.0722 * rgb[:, :, 2]
    )

    if luminance.shape[0] >= 3 and luminance.shape[1] >= 3:
        center = luminance[1:-1, 1:-1]

        laplacian = (
            luminance[:-2, 1:-1]
            + luminance[2:, 1:-1]
            + luminance[1:-1, :-2]
            + luminance[1:-1, 2:]
            - 4 * center
        )

        sharpness = float(np.var(laplacian))
    else:
        sharpness = 0.0

    hsv = np.asarray(image.convert("HSV"), dtype=np.float32)

    return {
        "sharpness": round(sharpness, 4),
        "brightness": round(float(np.mean(luminance)), 2),
        "contrast": round(float(np.std(luminance)), 2),
        "saturation": round(float(np.mean(hsv[:, :, 1])), 2),
        "width": image.width,
        "height": image.height,
    }


# --------------------------------------------------
# FASTAPI APP
# --------------------------------------------------

app = FastAPI(
    title="Face Restoration API",
    description=(
        "Face restoration with CodeFormer, RestoreFormer++, "
        "SPARNetHD and reference-guided RGFormer"
    ),
    version="1.7.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-face-enhancer.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=[
        "X-Processing-Time",
        "X-Processing-Model",
        "X-Output-Size",
        "X-Image-Sharpness",
        "X-Image-Brightness",
        "X-Image-Contrast",
        "X-Image-Saturation",
        "X-Output-Width",
        "X-Output-Height",
    ],
)


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get(
    "/api/health",
    dependencies=[Depends(verify_api_key)],
)
def health_check():
    sparnethd_files = {
        "python_environment": SPARNET_PYTHON_EXE.is_file(),
        "hd_aligned_script": HD_ALIGNED_SCRIPT.is_file(),
        "hd_unaligned_script": HD_UNALIGNED_SCRIPT.is_file(),
        "hd_weights": HD_WEIGHTS.is_file(),
        "face_detector": FACE_DETECTOR.is_file(),
        "landmark_predictor": LANDMARK_PREDICTOR.is_file(),
        "ffhq_template": FFHQ_TEMPLATE.is_file(),
    }
    codeformer_files = {
        "python_environment": CODEFORMER_PYTHON_EXE.is_file(),
        "inference_script": CODEFORMER_SCRIPT.is_file(),
        "codeformer_weights": CODEFORMER_WEIGHTS.is_file(),
        "face_detection_weights": CODEFORMER_DETECTION.is_file(),
        "face_parsing_weights": CODEFORMER_PARSING.is_file(),
    }

    sparnethd_ready = all(sparnethd_files.values())
    codeformer_ready = all(codeformer_files.values())

    restoreformerpp_files = {
        "python_environment": RESTOREFORMER_PYTHON_EXE.is_file(),
        "inference_script": RESTOREFORMER_SCRIPT.is_file(),
        "model_source": (
            RESTOREFORMER_DIR / "RestoreFormer" / "RestoreFormer.py"
        ).is_file(),
    }
    restoreformerpp_ready = all(restoreformerpp_files.values())

    rgformer_files = {
        "python_environment": RGFORMER_PYTHON_EXE.is_file(),
        "inference_script": RGFORMER_SCRIPT.is_file(),
        "preprocessing_script": RGFORMER_PREPARE_SCRIPT.is_file(),
        "model_source": (
            (RGFORMER_DIR / "model_cls.py").is_file()
            and (RGFORMER_DIR / "utils.py").is_file()
        ),
        "checkpoint": RGFORMER_WEIGHTS.is_file(),
    }
    rgformer_ready = all(rgformer_files.values())

    return {
        "status": (
            "ready"
            if (
                sparnethd_ready
                and codeformer_ready
                and restoreformerpp_ready
                and rgformer_ready
            )
            else "setup_incomplete"
        ),
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": (
            torch.cuda.get_device_name(0)
            if torch.cuda.is_available()
            else "CPU"
        ),
        "models": {
            "sparnethd": {
                "ready": sparnethd_ready,
                "files": sparnethd_files,
            },
            "codeformer": {
                "ready": codeformer_ready,
                "files": codeformer_files,
            },
            "restoreformer": {
                "ready": restoreformerpp_ready,
                "files": restoreformerpp_files,
                "checkpoint": (
                    "RestoreFormer++.ckpt is cached/downloaded by the "
                    "official inference script on first use."
                ),
            },
            "rgformer": {
                "ready": rgformer_ready,
                "files": rgformer_files,
                "input_requirements": (
                    "A low-quality face photo plus a clear, high-quality "
                    "reference photo of the same person."
                ),
                "mask": (
                    "A face-region mask is estimated automatically from "
                    "the reference photo."
                ),
            },
        },
        "output_sizes": list(SUPPORTED_OUTPUT_SIZES),
    }


# --------------------------------------------------
# MODEL COMMANDS
# --------------------------------------------------

def run_codeformer(
    input_path: Path,
    output_dir: Path,
    tiny_input: bool,
):
    required_files = [
        CODEFORMER_PYTHON_EXE,
        CODEFORMER_SCRIPT,
        CODEFORMER_WEIGHTS,
        CODEFORMER_DETECTION,
        CODEFORMER_PARSING,
    ]
    missing = [str(path) for path in required_files if not path.is_file()]

    if missing:
        raise HTTPException(
            status_code=500,
            detail="CodeFormer setup is incomplete. Missing: " + ", ".join(missing),
        )

    command = [
        str(CODEFORMER_PYTHON_EXE),
        str(CODEFORMER_SCRIPT),
        "--input_path", str(input_path),
        "--output_path", str(output_dir),
        "-w", "0.7",
    ]

    if tiny_input:
        command.append("--has_aligned")
        output_path = output_dir / "restored_faces" / "input.png"
    else:
        command.append("--only_center_face")
        output_path = output_dir / "restored_faces" / "input_00.png"

    return command, output_path, str(CODEFORMER_DIR), "image/png", 300


def run_restoreformerpp(
    input_path: Path,
    output_dir: Path,
    tiny_input: bool,
):
    required_files = [
        RESTOREFORMER_PYTHON_EXE,
        RESTOREFORMER_SCRIPT,
        RESTOREFORMER_DIR / "RestoreFormer" / "RestoreFormer.py",
    ]
    missing = [str(path) for path in required_files if not path.is_file()]

    if missing:
        raise HTTPException(
            status_code=500,
            detail="RestoreFormer++ setup is incomplete. Missing: " + ", ".join(missing),
        )

    command = [
        str(RESTOREFORMER_PYTHON_EXE),
        str(RESTOREFORMER_SCRIPT),
        "--input", str(input_path),
        "--output", str(output_dir),
        "--version", "RestoreFormer++",
        "--upscale", "2",
        "--bg_upsampler", "none",
        "--save",
    ]

    command.append("--aligned" if tiny_input else "--only_center_face")

    output_path = output_dir / "restored_faces" / "input_00.png"
    return command, output_path, str(RESTOREFORMER_DIR), "image/png", 600


def run_sparnethd(
    input_path: Path,
    input_dir: Path,
    output_dir: Path,
    tiny_input: bool,
):
    if not SPARNET_PYTHON_EXE.is_file():
        raise HTTPException(status_code=500, detail="SPARNet Python environment not found.")

    if tiny_input:
        required_files = [
            SPARNET_PYTHON_EXE,
            HD_ALIGNED_SCRIPT,
            HD_WEIGHTS,
        ]
        missing = [str(path) for path in required_files if not path.is_file()]

        if missing:
            raise HTTPException(
                status_code=500,
                detail="SPARNetHD tiny-image setup is incomplete. Missing: " + ", ".join(missing),
            )

        command = [
            str(SPARNET_PYTHON_EXE),
            str(HD_ALIGNED_SCRIPT),
            "--gpus", "1",
            "--model", "sparnethd",
            "--name", "SPARNetHD_V4_Attn2D",
            "--res_depth", "10",
            "--att_name", "spar",
            "--Gnorm", "in",
            "--load_size", "512",
            "--dataset_name", "single",
            "--dataroot", str(input_dir),
            "--pretrain_model_path", str(HD_WEIGHTS),
            "--save_as_dir", str(output_dir),
        ]
        return command, output_dir / "input.png", str(SPARNET_DIR), "image/png", 300

    required_files = [
        SPARNET_PYTHON_EXE,
        HD_UNALIGNED_SCRIPT,
        HD_WEIGHTS,
        FACE_DETECTOR,
        LANDMARK_PREDICTOR,
        FFHQ_TEMPLATE,
    ]
    missing = [str(path) for path in required_files if not path.is_file()]

    if missing:
        raise HTTPException(
            status_code=500,
            detail="SPARNetHD setup is incomplete. Missing: " + ", ".join(missing),
        )

    command = [
        str(SPARNET_PYTHON_EXE),
        str(HD_UNALIGNED_SCRIPT),
        "--gpus", "1",
        "--model", "sparnethd",
        "--name", "SPARNetHD_V4_Attn2D",
        "--res_depth", "10",
        "--att_name", "spar",
        "--Gnorm", "in",
        "--pretrain_model_path", str(HD_WEIGHTS),
        "--test_img_path", str(input_path),
        "--results_dir", str(output_dir),
    ]

    return command, output_dir / "HQ" / "000.jpg", str(SPARNET_DIR), "image/jpeg", 300


def run_rgformer(
    input_path: Path,
    reference_path: Path,
    temp_root: Path,
    output_dir: Path,
):
    required_files = [
        RGFORMER_PYTHON_EXE,
        RGFORMER_SCRIPT,
        RGFORMER_PREPARE_SCRIPT,
        RGFORMER_WEIGHTS,
        RGFORMER_DIR / "model_cls.py",
        RGFORMER_DIR / "utils.py",
    ]
    missing = [str(path) for path in required_files if not path.is_file()]

    if missing:
        raise HTTPException(
            status_code=500,
            detail="RGFormer setup is incomplete. Missing: " + ", ".join(missing),
        )

    lq_dir = temp_root / "rgformer_lq"
    ref_dir = temp_root / "rgformer_ref"
    mask_dir = temp_root / "rgformer_mask"

    for folder in (lq_dir, ref_dir, mask_dir):
        folder.mkdir(parents=True, exist_ok=True)

    prepare_command = [
        str(RGFORMER_PYTHON_EXE),
        str(RGFORMER_PREPARE_SCRIPT),
        "--lq_path", str(input_path),
        "--ref_path", str(reference_path),
        "--lq_out", str(lq_dir / "input.png"),
        "--ref_out", str(ref_dir / "input.png"),
        "--mask_out", str(mask_dir / "input.png"),
    ]

    try:
        prepared = subprocess.run(
            prepare_command,
            cwd=str(RGFORMER_DIR),
            capture_output=True,
            text=True,
            timeout=90,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="RGFormer face preparation took too long.")

    if prepared.returncode != 0:
        log = (prepared.stderr or "") + "\n" + (prepared.stdout or "")
        print(f"RGFormer input preparation failed:\n{log[-4000:]}")
        lines = log.strip().splitlines()
        user_detail = lines[-1] if lines else "Could not prepare RGFormer face inputs."

        raise HTTPException(status_code=422, detail=user_detail[-500:])

    if CODEFORMER_WEIGHTS.is_file() and not RGFORMER_CODEFORMER_CACHE.is_file():
        RGFORMER_CODEFORMER_CACHE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(CODEFORMER_WEIGHTS, RGFORMER_CODEFORMER_CACHE)

    command = [
        str(RGFORMER_PYTHON_EXE),
        str(RGFORMER_SCRIPT),
        "--lq_dir", str(lq_dir),
        "--ref_dir", str(ref_dir),
        "--mask_dir", str(mask_dir),
        "--check_path", str(RGFORMER_WEIGHTS),
        "--save_path", str(output_dir),
        "--target_size", "256",
        "--output_size", "512",
        "--batch_size", "1",
        "--fidelity_w", "0.7",
    ]

    return command, output_dir / "input.png", str(RGFORMER_DIR), "image/png", 900


# --------------------------------------------------
# IMAGE ENHANCEMENT
# --------------------------------------------------

@app.post(
    "/api/enhance",
    dependencies=[Depends(verify_api_key)],
)
def enhance_image(
    file: UploadFile = File(...),
    model_id: str = Form("sparnethd"),
    output_size: int = Form(512),
    ref_file: UploadFile | None = File(None),
):
    if model_id not in ("codeformer", "restoreformer", "sparnethd", "rgformer"):
        raise HTTPException(
            status_code=422,
            detail="model_id must be 'codeformer', 'restoreformer', 'sparnethd', or 'rgformer'.",
        )

    if output_size not in SUPPORTED_OUTPUT_SIZES:
        raise HTTPException(status_code=422, detail="output_size must be 128, 256, or 512.")

    contents = file.file.read(MAX_UPLOAD_BYTES + 1)

    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be smaller than 10 MB.")
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    try:
        with Image.open(io.BytesIO(contents)) as opened_image:
            opened_image.load()
            image = opened_image.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid image. Upload a valid photo.")

    reference_image = None

    if model_id == "rgformer":
        if ref_file is None:
            raise HTTPException(
                status_code=422,
                detail="RGFormer requires a clear, high-quality reference photo of the same person.",
            )

        reference_contents = ref_file.file.read(MAX_UPLOAD_BYTES + 1)

        if len(reference_contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Reference image must be smaller than 10 MB.")
        if not reference_contents:
            raise HTTPException(status_code=400, detail="Uploaded reference image is empty.")

        try:
            with Image.open(io.BytesIO(reference_contents)) as opened_reference:
                opened_reference.load()
                reference_image = opened_reference.convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="Invalid reference image. Upload a valid photo.",
            )

    tiny_input = max(image.size) <= SMALL_IMAGE_MAX_SIDE

    selected_model = {
        "codeformer": "CodeFormer",
        "restoreformer": "RestoreFormer++",
        "sparnethd": "SPARNetHD",
        "rgformer": "RGFormer",
    }[model_id]

    with tempfile.TemporaryDirectory(prefix=f"{model_id}_request_") as temporary_directory:
        temp_root = Path(temporary_directory)

        input_path = temp_root / "input.png"
        image.save(input_path, format="PNG")

        reference_path = temp_root / "reference.png"
        if reference_image is not None:
            reference_image.save(reference_path, format="PNG")

        input_dir = temp_root / "input"
        input_dir.mkdir()
        (input_dir / "input.png").write_bytes(input_path.read_bytes())

        output_dir = temp_root / "results"
        output_dir.mkdir()

        start_time = time.perf_counter()

        if model_id == "codeformer":
            command, output_path, working_dir, output_media_type, timeout_seconds = run_codeformer(
                input_path=input_path,
                output_dir=output_dir,
                tiny_input=tiny_input,
            )
        elif model_id == "restoreformer":
            command, output_path, working_dir, output_media_type, timeout_seconds = run_restoreformerpp(
                input_path=input_path,
                output_dir=output_dir,
                tiny_input=tiny_input,
            )
        elif model_id == "rgformer":
            command, output_path, working_dir, output_media_type, timeout_seconds = run_rgformer(
                input_path=input_path,
                reference_path=reference_path,
                temp_root=temp_root,
                output_dir=output_dir,
            )
        else:
            command, output_path, working_dir, output_media_type, timeout_seconds = run_sparnethd(
                input_path=input_path,
                input_dir=input_dir,
                output_dir=output_dir,
                tiny_input=tiny_input,
            )

        try:
            process = subprocess.run(
                command,
                cwd=str(working_dir),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(
                status_code=504,
                detail=f"{selected_model} took too long to process this image.",
            )

        elapsed_seconds = time.perf_counter() - start_time

        if process.returncode != 0 or not output_path.is_file():
            combined_logs = (process.stderr or "") + "\n" + (process.stdout or "")
            print(f"{selected_model} inference failed:\n{combined_logs[-6000:]}")

            no_face_detected = (
                "detect 0 faces" in combined_logs.lower()
                or "no faces detected" in combined_logs.lower()
                or "no face detected" in combined_logs.lower()
            )

            if not tiny_input and no_face_detected:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"{selected_model} could not detect a face. "
                        "Try a clearer photo with a visible face."
                    ),
                )

            raise HTTPException(
                status_code=500,
                detail=(
                    f"{selected_model} inference failed. "
                    "Check the backend terminal for details."
                ),
            )

        raw_output = output_path.read_bytes()

    try:
        with Image.open(io.BytesIO(raw_output)) as generated_image:
            result_image = generated_image.convert("RGB")

        if result_image.size != (output_size, output_size):
            result_image = result_image.resize(
                (output_size, output_size),
                Image.Resampling.LANCZOS,
            )

        image_metrics = calculate_image_metrics(result_image)

        output_buffer = io.BytesIO()

        if output_media_type == "image/png":
            result_image.save(output_buffer, format="PNG", optimize=True)
        else:
            result_image.save(
                output_buffer,
                format="JPEG",
                quality=95,
                optimize=True,
            )

        output_bytes = output_buffer.getvalue()

    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(
            status_code=500,
            detail="Could not prepare the generated image for download.",
        ) from error

    return Response(
        content=output_bytes,
        media_type=output_media_type,
        headers={
            "X-Processing-Time": f"{elapsed_seconds:.3f}",
            "X-Processing-Model": selected_model,
            "X-Output-Size": f"{output_size}x{output_size}",
            "X-Image-Sharpness": str(image_metrics["sharpness"]),
            "X-Image-Brightness": str(image_metrics["brightness"]),
            "X-Image-Contrast": str(image_metrics["contrast"]),
            "X-Image-Saturation": str(image_metrics["saturation"]),
            "X-Output-Width": str(image_metrics["width"]),
            "X-Output-Height": str(image_metrics["height"]),
        },
    )
