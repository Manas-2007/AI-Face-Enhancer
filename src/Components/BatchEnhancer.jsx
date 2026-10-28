import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";

const API_BASE_URL = "http://127.0.0.1:8000";
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MODELS = [
  { id: "codeformer", label: "CodeFormer" },
  { id: "restoreformer", label: "RestoreFormer++" },
  { id: "sparnethd", label: "SPARNetHD" },
  { id: "rgformer", label: "RGFormer" },
];

function isSupportedImage(file) {
  const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
  const supportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
  return supportedTypes.includes(file.type) || supportedExtension;
}

function fileKey(file) {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

function makeJpegBlob(imageBlob) {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(imageBlob);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(sourceUrl);
          reject(new Error("Could not prepare the output image for JPG conversion."));
          return;
        }

        context.drawImage(image, 0, 0);
        canvas.toBlob(
          (jpegBlob) => {
            URL.revokeObjectURL(sourceUrl);
            if (jpegBlob) resolve(jpegBlob);
            else reject(new Error("JPG conversion failed."));
          },
          "image/jpeg",
          0.95
        );
      } catch (error) {
        URL.revokeObjectURL(sourceUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("The model output could not be read as an image."));
    };

    image.src = sourceUrl;
  });
}

function getUniqueZipPath(file, usedPaths) {
  const relativePath = file.webkitRelativePath || file.name;
  const lastSlash = relativePath.lastIndexOf("/");
  const folderPath = lastSlash >= 0 ? relativePath.slice(0, lastSlash) : "";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "enhanced-image";
  const folderPrefix = folderPath ? `${folderPath}/` : "";

  let candidate = `${folderPrefix}${baseName}.jpg`;
  let suffix = 2;

  while (usedPaths.has(candidate.toLowerCase())) {
    candidate = `${folderPrefix}${baseName} (${suffix}).jpg`;
    suffix += 1;
  }

  usedPaths.add(candidate.toLowerCase());
  return candidate;
}

async function readErrorMessage(response) {
  const responseText = await response.text();
  try {
    const parsed = JSON.parse(responseText);
    return parsed.detail || responseText || `Backend returned ${response.status}.`;
  } catch {
    return responseText || `Backend returned ${response.status}.`;
  }
}

export default function BatchEnhancer({ apiKey }) {
  const imageInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedModel, setSelectedModel] = useState("codeformer");
  const [outputSize, setOutputSize] = useState("512");
  const [referenceFile, setReferenceFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, currentName: "" });
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [failures, setFailures] = useState([]);
  const [zipUrl, setZipUrl] = useState("");
  const [zipName, setZipName] = useState("");

  useEffect(() => {
    return () => {
      if (zipUrl) URL.revokeObjectURL(zipUrl);
    };
  }, [zipUrl]);

  const clearZip = () => {
    setZipUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return "";
    });
    setZipName("");
  };

  const addFiles = (incomingFileList) => {
    const incoming = Array.from(incomingFileList || []);
    if (!incoming.length) return;

    const supported = incoming.filter(isSupportedImage);
    const tooLarge = supported.filter((file) => file.size > MAX_FILE_SIZE);
    const sizeOkay = supported.filter((file) => file.size <= MAX_FILE_SIZE);

    setSelectedFiles((existing) => {
      const existingKeys = new Set(existing.map(fileKey));
      const merged = [...existing];

      for (const file of sizeOkay) {
        const key = fileKey(file);
        if (!existingKeys.has(key)) {
          merged.push(file);
          existingKeys.add(key);
        }
      }

      return merged.slice(0, MAX_FILES);
    });

    clearZip();
    setFailures([]);
    setProgress({ completed: 0, total: 0, currentName: "" });
    setMessageIsError(false);

    const ignoredCount = incoming.length - supported.length;
    const details = [];
    if (ignoredCount) details.push(`${ignoredCount} unsupported file(s) ignored`);
    if (tooLarge.length) details.push(`${tooLarge.length} image(s) exceeded 10 MB and were ignored`);
    if (incoming.length && supported.length === 0) {
      setMessage("Choose JPG, PNG, or WEBP images only.");
      setMessageIsError(true);
    } else if (details.length) {
      setMessage(details.join(". ") + ". Maximum 10 images can be queued.");
    } else {
      setMessage("Images added. You can add more images or select a folder, up to 10 total.");
    }
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((existing) => existing.filter((_, index) => index !== indexToRemove));
    clearZip();
    setMessage("Image removed from the batch.");
    setMessageIsError(false);
    setFailures([]);
  };

  const clearBatch = () => {
    setSelectedFiles([]);
    setReferenceFile(null);
    setFailures([]);
    setProgress({ completed: 0, total: 0, currentName: "" });
    setMessage("Batch cleared.");
    setMessageIsError(false);
    clearZip();
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const handleProcessBatch = async () => {
    if (!apiKey) {
      setMessage("Enter and save your Backend API Key in the panel above before processing.");
      setMessageIsError(true);
      return;
    }
    if (!selectedFiles.length) {
      setMessage("Add at least one image to the batch first.");
      setMessageIsError(true);
      return;
    }
    if (selectedModel === "rgformer" && !referenceFile) {
      setMessage("RGFormer needs a clear reference photo. The reference must show the same person as every image in this batch.");
      setMessageIsError(true);
      return;
    }

    setIsProcessing(true);
    setFailures([]);
    setProgress({ completed: 0, total: selectedFiles.length, currentName: "" });
    setMessage("Batch processing started. Images are processed one at a time to reduce GPU memory pressure.");
    setMessageIsError(false);
    clearZip();

    const zip = new JSZip();
    const usedPaths = new Set();
    const failedItems = [];
    let successCount = 0;

    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        setProgress({ completed: index, total: selectedFiles.length, currentName: file.name });

        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("model_id", selectedModel);
          formData.append("output_size", outputSize);
          if (selectedModel === "rgformer" && referenceFile) {
            formData.append("ref_file", referenceFile);
          }

          const response = await fetch(`${API_BASE_URL}/api/enhance`, {
            method: "POST",
            headers: { "X-API-Key": apiKey },
            credentials: "omit",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(await readErrorMessage(response));
          }

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.startsWith("image/")) {
            throw new Error("Backend did not return an image.");
          }

          const outputBlob = await makeJpegBlob(await response.blob());
          const zipPath = getUniqueZipPath(file, usedPaths);
          zip.file(zipPath, outputBlob);
          successCount += 1;
        } catch (error) {
          failedItems.push({
            name: file.name,
            message: error?.message || "Processing failed.",
          });
        }

        setProgress({ completed: index + 1, total: selectedFiles.length, currentName: file.name });
      }

      setFailures(failedItems);

      if (successCount === 0) {
        setMessage("No images were enhanced successfully. Check the errors below and your backend status.");
        setMessageIsError(true);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const newZipUrl = URL.createObjectURL(zipBlob);
      setZipUrl(newZipUrl);
      setZipName(`face-enhanced-${selectedModel}.zip`);

      if (failedItems.length) {
        setMessage(`${successCount} of ${selectedFiles.length} images processed. The ZIP contains successful JPG outputs; ${failedItems.length} image(s) failed.`);
        setMessageIsError(true);
      } else {
        setMessage(`All ${successCount} images were enhanced successfully. Your ZIP is ready to download.`);
        setMessageIsError(false);
      }
    } catch (error) {
      setMessage(error?.message || "Could not build the batch ZIP.");
      setMessageIsError(true);
    } finally {
      setIsProcessing(false);
      setProgress((current) => ({ ...current, currentName: "" }));
    }
  };

  const progressPercent = progress.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <section className="w-full px-4 py-4 sm:px-5 lg:px-7" aria-labelledby="batch-enhancer-heading">
      <div className="overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#081a31] via-[#041226] to-[#030b18] p-4 shadow-[0_10px_35px_rgba(0,0,0,0.15)] sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-700/50 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-cyan-300 sm:text-[11px]">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              BATCH RESEARCH WORKFLOW
            </div>
            <h2 id="batch-enhancer-heading" className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
              Enhance Multiple Images
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Select up to 10 images or choose a whole folder. One AI model will process every image, and the successful JPG results will be packaged into one ZIP.
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-full border border-blue-400/20 bg-blue-400/[0.06] px-3 py-2 text-xs font-medium text-blue-200">
            {selectedFiles.length}/{MAX_FILES} images selected
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-xl border border-slate-700/60 bg-[#030d1d]/70 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-100">1. Add images</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">JPG, PNG, or WEBP · max 10 MB per image · 10 images per batch</p>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              webkitdirectory=""
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={isProcessing || selectedFiles.length >= MAX_FILES}
                onClick={() => imageInputRef.current?.click()}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/[0.08] px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true">＋</span> Select multiple images
              </button>
              <button
                type="button"
                disabled={isProcessing || selectedFiles.length >= MAX_FILES}
                onClick={() => folderInputRef.current?.click()}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-400/[0.07] px-4 py-3 text-sm font-semibold text-blue-200 transition hover:bg-blue-400/[0.13] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true">▣</span> Select a folder
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {selectedFiles.length ? (
                selectedFiles.map((file, index) => (
                  <div key={`${fileKey(file)}-${index}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-800/30 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] text-sm text-cyan-200">{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200" title={file.name}>{file.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                      className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-700 px-4 py-7 text-center text-sm text-slate-500">
                  Your selected images will appear here.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-700/60 bg-[#030d1d]/70 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">2. Configure enhancement</h3>
              <label htmlFor="batch-model" className="mt-4 block text-xs font-medium text-slate-400">AI model for this batch</label>
              <select
                id="batch-model"
                value={selectedModel}
                disabled={isProcessing}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-[#071427] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-50"
              >
                {MODELS.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
              </select>

              <label htmlFor="batch-output-size" className="mt-4 block text-xs font-medium text-slate-400">Output size</label>
              <select
                id="batch-output-size"
                value={outputSize}
                disabled={isProcessing}
                onChange={(event) => setOutputSize(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-700 bg-[#071427] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-50"
              >
                <option value="128">128 × 128</option>
                <option value="256">256 × 256</option>
                <option value="512">512 × 512</option>
              </select>

              {selectedModel === "rgformer" && (
                <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] p-3">
                  <label htmlFor="batch-reference" className="block text-xs font-semibold text-amber-200">RGFormer reference image</label>
                  <p className="mt-1 text-xs leading-5 text-amber-100/70">The same reference is used for every image. Use RGFormer only when every input shows the same person.</p>
                  <input
                    id="batch-reference"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    disabled={isProcessing}
                    onChange={(event) => setReferenceFile(event.target.files?.[0] || null)}
                    className="mt-3 block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-100 hover:file:bg-slate-600"
                  />
                  {referenceFile && <p className="mt-2 truncate text-xs text-emerald-300">Reference: {referenceFile.name}</p>}
                </div>
              )}

              <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-xs leading-5 text-slate-400">
                Each file is sent to your existing FastAPI <code className="text-cyan-200">/api/enhance</code> endpoint separately. Original base filenames are kept, and outputs are converted to <code className="text-cyan-200">.jpg</code> inside the ZIP.
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-[#030d1d]/70 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-100">3. Process and download</h3>
              <button
                type="button"
                disabled={isProcessing || !selectedFiles.length}
                onClick={handleProcessBatch}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-bold text-[#03101d] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isProcessing ? "Processing images…" : "Enhance batch and build ZIP"}
              </button>

              {(isProcessing || progress.total > 0) && (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span>{isProcessing ? `Processing: ${progress.currentName || "Starting…"}` : "Last batch progress"}</span>
                    <span>{progress.completed}/{progress.total}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              )}

              {message && (
                <p role="status" aria-live="polite" className={`mt-4 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${messageIsError ? "border-amber-400/20 bg-amber-400/[0.05] text-amber-200" : "border-cyan-400/20 bg-cyan-400/[0.05] text-cyan-100"}`}>
                  {message}
                </p>
              )}

              {failures.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.04] p-3">
                  <p className="text-xs font-semibold text-red-200">Images that failed</p>
                  <ul className="mt-2 space-y-2">
                    {failures.map((failure, index) => (
                      <li key={`${failure.name}-${index}`} className="text-xs leading-5 text-red-100/80">
                        <span className="font-medium">{failure.name}:</span> {failure.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {zipUrl && !isProcessing && (
                <a
                  href={zipUrl}
                  download={zipName}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-400/[0.10] px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/[0.17]"
                >
                  <span aria-hidden="true">↓</span> Download ZIP ({progress.completed ? `${selectedFiles.length - failures.length} JPG output(s)` : "ready"})
                </a>
              )}

              <button
                type="button"
                disabled={isProcessing || (!selectedFiles.length && !zipUrl)}
                onClick={clearBatch}
                className="mt-3 min-h-10 w-full rounded-xl border border-slate-700/70 px-4 py-2 text-xs font-semibold text-slate-400 transition hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear batch
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
