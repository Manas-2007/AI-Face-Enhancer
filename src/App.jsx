import { useEffect, useRef, useState } from "react";
import BatchEnhancer from "./Components/BatchEnhancer";
import Navbar from "./Components/Navbar";
import Hero from "./Components/Hero";
import AI_Label from "./Components/AI_Label";
import Preview from "./Components/Preview";
import Comparison from "./Components/Comparison";

const API_BASE_URL = "http://127.0.0.1:8000";

const API_KEY_STORAGE_NAME = "face-enhancer-api-key";

const MODEL_IDS = [
  "codeformer",
  "restoreformer",
  "sparnethd",
  "rgformer",
];

function readNumberHeader(response, name) {
  const raw = response.headers.get(name);

  if (raw == null || raw.trim() === "") {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function readStoredApiKey() {
  try {
    return sessionStorage.getItem(API_KEY_STORAGE_NAME) || "";
  } catch {
    return "";
  }
}

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState({});
  const [errors, setErrors] = useState({});
  const [comparisonSummary, setComparisonSummary] = useState("");
  const [scalePickerRequest, setScalePickerRequest] = useState(0);

  // Backend API key state.
  const [apiKeyInput, setApiKeyInput] = useState(readStoredApiKey);
  const [apiKey, setApiKey] = useState(readStoredApiKey);
  const [apiKeyMessage, setApiKeyMessage] = useState("");

  const previewUrlRef = useRef(null);
  const resultUrlsRef = useRef([]);

  // Save the API key for the current browser tab/session.
  const handleSaveApiKey = (event) => {
    event?.preventDefault();

    const trimmedKey = apiKeyInput.trim();

    if (!trimmedKey) {
      setApiKey("");
      setApiKeyMessage("Please enter your backend API key first.");
      return;
    }

    try {
      sessionStorage.setItem(API_KEY_STORAGE_NAME, trimmedKey);
    } catch {
      setApiKeyMessage(
        "Could not save the key in session storage. Please try another browser tab."
      );
      return;
    }

    setApiKey(trimmedKey);
    setApiKeyInput(trimmedKey);
    setApiKeyMessage(
      "API key saved for this browser session. You can now generate images."
    );
  };

  // Remove the saved API key from the current browser session.
  const handleClearApiKey = () => {
    try {
      sessionStorage.removeItem(API_KEY_STORAGE_NAME);
    } catch {
      // The component can still clear its in-memory key.
    }

    setApiKey("");
    setApiKeyInput("");
    setApiKeyMessage("API key cleared.");
  };

  const clearResultUrls = () => {
    resultUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    resultUrlsRef.current = [];

    setResults({});
    setErrors({});
    setComparisonSummary("");
  };

  const clearPreviousResults = () => {
    resultUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });

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

    setSelectedImage({
      file,
      preview,
    });
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

  // Generate an image with the selected model.
  const handleGenerateModel = async (
    modelId,
    outputSize = 512,
    referenceFile = null
  ) => {
    if (!apiKey) {
      throw new Error(
        "Please enter and save your Backend API Key in the box below the navbar."
      );
    }

    if (!MODEL_IDS.includes(modelId)) {
      throw new Error("This model is not connected.");
    }

    if (!selectedImage?.file) {
      throw new Error("Please upload a face image first.");
    }

    if (modelId === "rgformer" && !referenceFile) {
      throw new Error(
        "RGFormer needs a clear, high-quality reference photo of the same person."
      );
    }

    setProcessing((previous) => ({
      ...previous,
      [modelId]: true,
    }));

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

      // Send the saved API key to the protected backend.
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
          // Keep response text if the server does not return JSON.
        }

        if (response.status === 401) {
          throw new Error(
            "Invalid API key. Check your key in the Backend API Key box and save it again."
          );
        }

        if (response.status === 503) {
          throw new Error(
            "Backend API key is not configured. Restart the backend with FACE_ENHANCER_API_KEY set."
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

      const processingTime = readNumberHeader(
        response,
        "X-Processing-Time"
      );

      // Read actual image measurements returned by the backend.
      const metrics = {
        sharpness: readNumberHeader(response, "X-Image-Sharpness"),
        brightness: readNumberHeader(response, "X-Image-Brightness"),
        contrast: readNumberHeader(response, "X-Image-Contrast"),
        saturation: readNumberHeader(response, "X-Image-Saturation"),
        width: readNumberHeader(response, "X-Output-Width"),
        height: readNumberHeader(response, "X-Output-Height"),
      };

      setResults((previous) => ({
        ...previous,
        [modelId]: {
          imageUrl,
          processingTime,
          metrics,
        },
      }));

      return {
        modelId,
        success: true,
        processingTime,
        metrics,
      };
    } catch (error) {
      const message =
        error?.message || `${modelId} failed to process the image.`;

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

  // The Hero action opens the existing output-size selector.
  const handleRunAllModels = () => {
    setScalePickerRequest((current) => current + 1);
  };

  // Run models sequentially to avoid competing for GPU memory.
  // A failed model does not stop the remaining models.
  const handleCompareAllModels = async (referenceFile) => {
    if (!apiKey) {
      throw new Error(
        "Please enter and save your Backend API Key in the box below the navbar."
      );
    }

    if (!selectedImage?.file) {
      throw new Error("Please upload a face image first.");
    }

    if (!referenceFile) {
      throw new Error(
        "Add a high-quality reference photo of the same person in the RGFormer card before comparing all four models."
      );
    }

    // Clear old results before a new comparison.
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
        "All four models failed. Check the individual errors shown in the comparison section."
      );
    }

    return {
      successCount,
      failureCount,
      failures,
    };
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      resultUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#030b1a] text-white">
      <Navbar />

      {/* Backend API key panel — visible directly below the navbar. */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-cyan-400/20 bg-[#071427] p-4 shadow-lg shadow-black/20 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white sm:text-lg">
                Backend API Key
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Enter the secret key generated in your backend terminal to
                connect this website to your local AI models.
              </p>

              <div className="mt-2 flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    apiKey ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />

                <span
                  className={
                    apiKey ? "text-emerald-300" : "text-amber-300"
                  }
                >
                  {apiKey ? "API key saved for this session" : "API key required"}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSaveApiKey}
              className="flex w-full flex-col gap-2 sm:flex-row md:max-w-2xl"
            >
              <label htmlFor="backend-api-key" className="sr-only">
                Backend API Key
              </label>

              <input
                id="backend-api-key"
                name="backend-api-key"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                value={apiKeyInput}
                onChange={(event) => {
                  setApiKeyInput(event.target.value);
                  setApiKeyMessage("");
                }}
                placeholder="Paste your backend API key here"
                aria-describedby="api-key-message"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#030b1a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />

              <button
                type="submit"
                className="min-h-11 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#071427]"
              >
                Save API Key
              </button>

              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  className="min-h-11 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-red-400/50 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          <p
            id="api-key-message"
            role="status"
            aria-live="polite"
            className={`mt-3 text-sm ${
              apiKeyMessage.toLowerCase().includes("could not") ||
              apiKeyMessage.toLowerCase().includes("please enter")
                ? "text-amber-300"
                : apiKeyMessage
                  ? "text-emerald-300"
                  : "text-slate-500"
            }`}
          >
            {apiKeyMessage ||
              "Your key is kept in this browser session and is not written into your source code."}
          </p>
        </div>
      </section>

      <main>
        <Hero
          selectedImage={selectedImage}
          onImageSelect={handleImageSelect}
          onClear={handleClear}
          onRunAllModels={handleRunAllModels}
        />
        <BatchEnhancer apiKey={apiKey} />

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