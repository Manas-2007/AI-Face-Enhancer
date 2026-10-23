"""Prepare face crops and an approximate reference-face mask for RGFormer inference."""
import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageOps


def largest_face(image: Image.Image):
    rgb = np.asarray(image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.equalizeHist(gray)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    if cascade.empty():
        raise RuntimeError("OpenCV frontal-face detector could not be loaded.")
    minimum = max(24, min(image.size) // 30)
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=4,
        minSize=(minimum, minimum),
    )
    if len(faces) == 0:
        return None
    return max(faces, key=lambda box: int(box[2]) * int(box[3]))


def make_square_crop(image: Image.Image, face, allow_face_missing: bool, label: str):
    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size
    if face is None:
        if not allow_face_missing:
            raise ValueError(
                f"Could not detect a face in the {label} image. Upload a clear, front-facing photo."
            )
        aspect_delta = abs(width - height) / max(width, height)
        if max(width, height) > 64 and aspect_delta > 0.20:
            raise ValueError(
                "Could not detect a face in the input image. Use a clearer photo or a square, face-cropped input for RGFormer."
            )
        # Tiny inputs and already face-cropped square inputs may not be detectable;
        # keep their whole frame as the low-quality restoration input.
        side = max(width, height)
        left = (width - side) // 2
        top = (height - side) // 2
        square = Image.new("RGB", (side, side), (0, 0, 0))
        square.paste(image, (-left, -top))
        return square, None

    x, y, fw, fh = [int(v) for v in face]
    # Include forehead, chin and some surrounding context for the restoration crop.
    side = max(int(max(fw, fh) * 2.15), 64)
    center_x = x + fw / 2
    center_y = y + fh * 0.55
    left = int(round(center_x - side / 2))
    top = int(round(center_y - side / 2))

    square = Image.new("RGB", (side, side), (0, 0, 0))
    src_left = max(left, 0)
    src_top = max(top, 0)
    src_right = min(left + side, width)
    src_bottom = min(top + side, height)
    if src_right <= src_left or src_bottom <= src_top:
        raise ValueError(f"Could not crop the detected face from the {label} image.")
    piece = image.crop((src_left, src_top, src_right, src_bottom))
    square.paste(piece, (src_left - left, src_top - top))

    # Return the face box coordinates relative to the square crop for mask creation.
    relative_face = (x - left, y - top, fw, fh)
    return square, relative_face


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lq_path", required=True)
    parser.add_argument("--ref_path", required=True)
    parser.add_argument("--lq_out", required=True)
    parser.add_argument("--ref_out", required=True)
    parser.add_argument("--mask_out", required=True)
    args = parser.parse_args()

    try:
        with Image.open(args.lq_path) as opened:
            lq_image = ImageOps.exif_transpose(opened).convert("RGB")
        with Image.open(args.ref_path) as opened:
            ref_image = ImageOps.exif_transpose(opened).convert("RGB")
    except (OSError, ValueError) as error:
        raise SystemExit(f"Invalid RGFormer input/reference image: {error}")

    lq_face = largest_face(lq_image)
    ref_face = largest_face(ref_image)
    try:
        lq_crop, _ = make_square_crop(lq_image, lq_face, allow_face_missing=True, label="input")
        ref_crop, relative_face = make_square_crop(
            ref_image, ref_face, allow_face_missing=False, label="reference"
        )
    except ValueError as error:
        raise SystemExit(str(error))

    if relative_face is None:
        raise SystemExit("Could not detect a face in the reference image.")

    for target in (args.lq_out, args.ref_out, args.mask_out):
        Path(target).parent.mkdir(parents=True, exist_ok=True)

    lq_crop.save(args.lq_out, format="PNG")
    ref_crop.save(args.ref_out, format="PNG")

    rx, ry, rw, rh = relative_face
    mask = Image.new("L", ref_crop.size, 0)
    draw = ImageDraw.Draw(mask)
    center = (int(rx + rw / 2), int(ry + rh / 2))
    axes = (max(1, int(rw * 0.58)), max(1, int(rh * 0.68)))
    draw.ellipse(
        (center[0] - axes[0], center[1] - axes[1], center[0] + axes[0], center[1] + axes[1]),
        fill=255,
    )
    mask.save(args.mask_out, format="PNG")
    print("Prepared square face crops and automatic approximate reference mask.")


if __name__ == "__main__":
    main()
