
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

function readNumberHeader(response, name) {
  const raw = response.headers.get(name);

  if (raw == null || raw.trim() === "") {
    return null;
  }

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

  const previewUrlRef = useRef(null);
  const resultUrlsRef = useRef([]);

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

      const response = await fetch(`${API_BASE_URL}/api/enhance`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const responseText = await response.text();
        let detail = responseText;

        try {
          const parsed = JSON.parse(responseText);
          detail = parsed.detail || responseText;
        } catch {
          // Keep response text when the server does not return JSON.
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

      // Read real image measurements returned by backend/app.py.
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
    if (!selectedImage?.file) {
      throw new Error("Please upload a face image first.");
    }

    if (!referenceFile) {
      throw new Error(
        "Add a high-quality reference photo of the same person in the RGFormer card before comparing all four models."
      );
    }

    // Prevent old outputs from being mistaken for fresh comparison results.
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

      <main>
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
