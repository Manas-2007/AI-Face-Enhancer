
import { useEffect, useRef, useState } from "react";

import Navbar from "./Components/Navbar";
import Hero from "./Components/Hero";
import AI_Label from "./Components/AI_Label";
import Preview from "./Components/Preview";
import Comparison from "./Components/Comparison";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const MODEL_IDS = [
  "codeformer",
  "restoreformer",
  "sparnethd",
  "rgformer",
];

const API_KEY_STORAGE = "face-enhancer-api-key";

function readNumberHeader(response, name) {
  const raw = response.headers.get(name);

  if (raw == null || raw.trim() === "") return null;

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState({});
  const [errors, setErrors] = useState({});
  const [comparisonSummary, setComparisonSummary] = useState("");
  const [scalePickerRequest, setScalePickerRequest] = useState(0);

  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyMessage, setApiKeyMessage] = useState("");

  const previewUrlRef = useRef(null);
  const resultUrlsRef = useRef([]);

  // Restore this browser tab's key after a page refresh.
  useEffect(() => {
    try {
      const storedKey = sessionStorage.getItem(API_KEY_STORAGE);

      if (storedKey) {
        setApiKey(storedKey);
        setApiKeyInput(storedKey);
        setApiKeyMessage("API key loaded for this browser session.");
      }
    } catch {
      setApiKeyMessage(
        "Browser session storage is unavailable. Enter the key again."
      );
    }
  }, []);

  const saveApiKey = (event) => {
    event.preventDefault();

    const nextKey = apiKeyInput.trim();

    if (!nextKey) {
      setApiKeyMessage("Enter your backend API key first.");
      return;
    }

    try {
      sessionStorage.setItem(API_KEY_STORAGE, nextKey);
      setApiKey(nextKey);
      setApiKeyMessage("API key saved for this browser session.");
    } catch {
      setApiKeyMessage(
        "Unable to save this key in session storage. Check browser settings."
      );
    }
  };

  const clearApiKey = () => {
    try {
      sessionStorage.removeItem(API_KEY_STORAGE);
    } catch {
      // Continue clearing in-memory state.
    }

    setApiKey("");
    setApiKeyInput("");
    setApiKeyMessage("API key cleared from this browser session.");
  };

  const clearResultUrls = () => {
    resultUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    resultUrlsRef.current = [];

    setResults({});
    setErrors({});
    setComparisonSummary("");
  };

  const clearPreviousResults = () => {
    resultUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    resultUrlsRef.current = [];

    setResults({});
  };

  const handleImageSelect = (file) => {
    if (!file) return;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    clearResultUrls();
    setProcessing({});

    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;

    setSelectedImage({ file, preview });
  };

  const handleClear = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    clearResultUrls();
    setProcessing({});
    setSelectedImage(null);
  };

  const handleGenerateModel = async (
    modelId,
    outputSize = 512,
    referenceFile = null
  ) => {
    if (!MODEL_IDS.includes(modelId)) {
      throw new Error("This model is not connected.");
    }

    if (!apiKey) {
      throw new Error(
        "Enter and save your backend API key at the top of the page first."
      );
    }

    if (!selectedImage?.file) {
      throw new Error("Please upload a face image first.");
    }

    if (modelId === "rgformer" && !referenceFile) {
      throw new Error(
        "RGFormer needs a clear, high-quality reference photo of the same person."
      );
    }

    setProcessing((previous) => ({ ...previous, [modelId]: true }));

    setErrors((previous) => {
      const next = { ...previous };
      delete next[modelId];
      return next;
    });

    try {
      const formData = new FormData();
      formData.append("file", selectedImage.file);
      formData.append("model_id", modelId);
      formData.append("output_size", String(outputSize));

      if (modelId === "rgformer") {
        formData.append("ref_file", referenceFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/enhance`, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
        },
        credentials: "omit",
        body: formData,
      });

      if (!response.ok) {
        const responseText = await response.text();
        let detail = responseText;

        try {
          const parsed = JSON.parse(responseText);
          detail = parsed.detail || responseText;
        } catch {
          // Keep the raw server response when it isn't JSON.
        }

        if (response.status === 401) {
          throw new Error(
            "Backend rejected the API key. Check the key entered above."
          );
        }

        throw new Error(
          detail || `Backend returned error ${response.status}.`
        );
      }

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.startsWith("image/")) {
        throw new Error("The backend did not return an image.");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      resultUrlsRef.current.push(imageUrl);

      const metrics = {
        sharpness: readNumberHeader(response, "X-Image-Sharpness"),
        brightness: readNumberHeader(response, "X-Image-Brightness"),
        contrast: readNumberHeader(response, "X-Image-Contrast"),
        saturation: readNumberHeader(response, "X-Image-Saturation"),
        width: readNumberHeader(response, "X-Output-Width"),
        height: readNumberHeader(response, "X-Output-Height"),
      };

      const result = {
        imageUrl,
        processingTime: readNumberHeader(response, "X-Processing-Time"),
        metrics,
      };

      setResults((previous) => ({
        ...previous,
        [modelId]: result,
      }));

      return { modelId, success: true, ...result };
    } catch (error) {
      const message = error?.message || `${modelId} inference failed.`;

      setErrors((previous) => ({
        ...previous,
        [modelId]: message,
      }));

      console.error(`${modelId} inference failed:`, error);
      throw error;
    } finally {
      setProcessing((previous) => ({
        ...previous,
        [modelId]: false,
      }));
    }
  };

  // Open the existing output-size selector.
  const handleRunAllModels = () => {
    setScalePickerRequest((current) => current + 1);
  };

  // Run sequentially to avoid overlapping GPU inference.
  const handleCompareAllModels = async (referenceFile) => {
    if (!selectedImage?.file) {
      throw new Error("Please upload a face image first.");
    }

    if (!apiKey) {
      throw new Error("Enter and save your backend API key first.");
    }

    if (!referenceFile) {
      throw new Error(
        "Add a high-quality reference photo of the same person before comparing all four models."
      );
    }

    clearPreviousResults();
    setErrors({});
    setComparisonSummary("");

    let successCount = 0;
    const failures = [];

    for (const modelId of MODEL_IDS) {
      try {
        await handleGenerateModel(modelId, 512, referenceFile);
        successCount += 1;
      } catch (error) {
        failures.push({
          modelId,
          message: error?.message || "Inference failed.",
        });
      }
    }

    const failureCount = MODEL_IDS.length - successCount;

    if (failureCount === 0) {
      setComparisonSummary(
        `Comparison complete: all ${successCount} models generated outputs successfully.`
      );
    } else if (successCount > 0) {
      setComparisonSummary(
        `Comparison partially complete: ${successCount} of ${MODEL_IDS.length} models succeeded. Failed: ${failures
          .map((item) => item.modelId)
          .join(", ")}.`
      );
    } else {
      setComparisonSummary(
        "All four models failed. Check the individual errors in the comparison section."
      );
    }

    return { successCount, failureCount, failures };
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      resultUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#030b1a] text-white">
      <Navbar />

      <main>
        {/* Session-only backend authentication */}
        <section className="mx-4 mb-3 mt-4 rounded-xl border border-blue-500/25 bg-[#07182e] p-4 sm:mx-5 lg:mx-7">
          <form onSubmit={saveApiKey} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="backend-api-key"
                className="block text-sm font-semibold text-slate-100"
              >
                Private backend access
              </label>

              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Enter the API key configured in your local backend. It is
                stored in this browser tab's session storage.
              </p>

              <input
                id="backend-api-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                placeholder="Paste your backend API key"
                className="mt-3 min-h-11 w-full rounded-lg border border-slate-600 bg-[#020914] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />

              {apiKeyMessage && (
                <p
                  role="status"
                  className="mt-2 break-words text-xs text-cyan-200"
                >
                  {apiKeyMessage}
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="submit"
                className="min-h-10 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-[#04101e] hover:bg-cyan-400"
              >
                Save key
              </button>

              <button
                type="button"
                onClick={clearApiKey}
                className="min-h-10 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <Hero
          selectedImage={selectedImage}
          onImageSelect={handleImageSelect}
          onClear={handleClear}
          onRunAllModels={handleRunAllModels}
        />

        <AI_Label
          selectedImage={selectedImage}
          onGenerateModel={handleGenerateModel}
          onCompareAll={handleCompareAllModels}
          openScalePickerSignal={scalePickerRequest}
        />

        <Preview
          selectedImage={selectedImage}
          results={results}
          processing={processing}
        />

        <Comparison
          selectedImage={selectedImage}
          results={results}
          processing={processing}
          errors={errors}
          comparisonSummary={comparisonSummary}
        />
      </main>
    </div>
  );
}

export default App;
