
import { useState } from "react";

const MODELS = [
  { id: "codeformer", name: "CodeFormer", color: "#38aaff" },
  { id: "restoreformer", name: "RestoreFormer++", color: "#24ddb0" },
  { id: "sparnethd", name: "SPARNetHD", color: "#ffae42" },
  { id: "rgformer", name: "RGFormer", color: "#ec67e5" },
];

function getResult(result) {
  if (typeof result === "string") {
    return { src: result, time: null, metrics: null };
  }

  if (!result || typeof result !== "object") {
    return { src: null, time: null, metrics: null };
  }

  return {
    src: result.imageUrl || result.image_url || result.url || null,
    time: result.processingTime ?? result.processing_time ?? null,
    metrics: result.metrics || null,
  };
}

function formatNumber(value, decimals = 2) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(decimals);
}

function formatTime(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toFixed(2)} s`;
}

function ImagePlaceholder({ text = "No output yet" }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-slate-500">
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span className="text-xs">{text}</span>
    </div>
  );
}

export default function Comparison({
  selectedImage,
  results = {},
  processing = {},
  errors = {},
  comparisonSummary = "",
}) {
  const [activeModel, setActiveModel] = useState("codeformer");

  const models = MODELS.map((model) => ({
    ...model,
    ...getResult(results[model.id]),
    isProcessing: Boolean(processing[model.id]),
    error: errors[model.id] || null,
  }));

  const active = models.find((model) => model.id === activeModel) || models[0];

  const readyCount = models.filter((model) => model.src).length;
  const runningCount = models.filter((model) => model.isProcessing).length;
  const failedCount = models.filter(
    (model) => model.error && !model.isProcessing && !model.src
  ).length;

  const metricRows = [
    {
      label: "Processing time",
      description: "Total time reported by the backend",
      getValue: (model) => formatTime(model.time),
    },
    {
      label: "Output resolution",
      description: "Final generated image dimensions",
      getValue: (model) => {
        const metrics = model.metrics;
        if (metrics?.width == null || metrics?.height == null) return "—";
        return `${metrics.width} × ${metrics.height} px`;
      },
    },
    {
      label: "Edge sharpness",
      description: "Laplacian variance; higher values indicate more edge variation",
      getValue: (model) => formatNumber(model.metrics?.sharpness, 2),
    },
    {
      label: "Brightness",
      description: "Mean luminance on a 0–255 scale",
      getValue: (model) => formatNumber(model.metrics?.brightness, 2),
    },
    {
      label: "Contrast",
      description: "Standard deviation of luminance; 0–255 scale",
      getValue: (model) => formatNumber(model.metrics?.contrast, 2),
    },
    {
      label: "Colour saturation",
      description: "Mean HSV saturation on a 0–255 scale",
      getValue: (model) => formatNumber(model.metrics?.saturation, 2),
    },
  ];

  return (
    <section className="w-full px-4 pb-10 pt-3 sm:px-5 lg:px-7">
      <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-[#07182e] to-[#030d1c] p-4 sm:p-6">
        {/* Heading */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">
              Model Comparison
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
              Compare the generated images, processing speed and measured
              image statistics.
            </p>
          </div>

          <span className="rounded-full border border-blue-400/25 bg-blue-400/[0.07] px-3 py-1.5 text-xs font-semibold text-blue-200">
            {readyCount}/4 outputs ready
          </span>
        </div>

        {/* Comparison status */}
        {comparisonSummary && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-4 py-3 text-sm leading-relaxed text-cyan-200"
          >
            {comparisonSummary}
          </div>
        )}

        {/* Summary cards */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-3">
            <p className="text-2xl font-bold text-emerald-300">{readyCount}</p>
            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
              Successful outputs
            </p>
          </div>

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3">
            <p className="text-2xl font-bold text-cyan-300">{runningCount}</p>
            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
              Processing
            </p>
          </div>

          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-3">
            <p className="text-2xl font-bold text-rose-300">{failedCount}</p>
            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
              Failed outputs
            </p>
          </div>
        </div>

        {/* Original versus selected model */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-slate-700/60 bg-[#020914] p-3">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">
              Original Image
            </h3>

            <div className="flex min-h-[230px] items-center justify-center overflow-hidden rounded-lg bg-[#010610] sm:min-h-[300px]">
              {selectedImage?.preview ? (
                <img
                  src={selectedImage.preview}
                  alt="Original uploaded image"
                  className="max-h-[430px] w-full object-contain"
                />
              ) : (
                <ImagePlaceholder text="Upload an image to begin" />
              )}
            </div>
          </div>

          <div
            className="min-w-0 rounded-xl border bg-[#020914] p-3"
            style={{ borderColor: `${active.color}70` }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3
                className="text-sm font-semibold"
                style={{ color: active.color }}
              >
                {active.name}
              </h3>
              <span className="rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-300">
                OUTPUT
              </span>
            </div>

            <div className="flex min-h-[230px] items-center justify-center overflow-hidden rounded-lg bg-[#010610] sm:min-h-[300px]">
              {active.isProcessing ? (
                <div className="flex flex-col items-center gap-3 text-cyan-300">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
                  <span className="text-xs">Generating image...</span>
                </div>
              ) : active.src ? (
                <img
                  src={active.src}
                  alt={`${active.name} enhanced result`}
                  className="max-h-[430px] w-full object-contain"
                />
              ) : active.error ? (
                <div className="max-w-sm px-5 py-6 text-center">
                  <p className="text-sm font-semibold text-rose-300">
                    Generation failed
                  </p>
                  <p className="mt-2 break-words text-xs leading-relaxed text-slate-400">
                    {active.error}
                  </p>
                </div>
              ) : (
                <ImagePlaceholder text="No generated output yet" />
              )}
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Processing time:{" "}
              <span className="font-semibold text-slate-200">
                {formatTime(active.time)}
              </span>
            </p>
          </div>
        </div>

        {/* All outputs */}
        <div className="mt-7">
          <h3 className="text-base font-bold text-slate-100">
            All Model Outputs
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Select any model to inspect its generated result.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {models.map((model) => {
              const selected = activeModel === model.id;

              const status = model.isProcessing
                ? "Processing"
                : model.src
                  ? "Output ready"
                  : model.error
                    ? "Failed"
                    : "Awaiting output";

              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setActiveModel(model.id)}
                  aria-pressed={selected}
                  className="min-w-0 rounded-xl border bg-[#030d1c] p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                  style={{
                    borderColor: selected
                      ? model.color
                      : "rgba(71,85,105,0.65)",
                    backgroundColor: selected ? model.color + "0D" : undefined,
                  }}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{ color: model.color }}
                    >
                      {model.name}
                    </span>

                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-semibold ${
                        model.isProcessing
                          ? "bg-cyan-400/10 text-cyan-300"
                          : model.src
                            ? "bg-emerald-400/10 text-emerald-300"
                            : model.error
                              ? "bg-rose-400/10 text-rose-300"
                              : "bg-slate-700/60 text-slate-400"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="flex h-[190px] items-center justify-center overflow-hidden rounded-lg bg-[#010610]">
                    {model.isProcessing ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
                    ) : model.src ? (
                      <img
                        src={model.src}
                        alt={`${model.name} output`}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    ) : model.error ? (
                      <p className="break-words px-3 py-4 text-center text-[10px] leading-relaxed text-rose-300">
                        {model.error}
                      </p>
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>

                  <p className="mt-3 text-[11px] text-slate-400">
                    Processing time: {formatTime(model.time)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actual measurement table */}
        <div className="mt-8">
          <h3 className="text-base font-bold text-slate-100 sm:text-lg">
            Actual Data Comparison
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Measurements are calculated from each generated output image.
            A dash means that measurement is not available yet.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-blue-500/20">
            <table className="w-full min-w-[650px] border-collapse text-left">
              <thead>
                <tr className="bg-[#0a1b32]">
                  <th className="w-[28%] px-3 py-3 text-xs font-semibold text-slate-300 sm:px-4">
                    Metric
                  </th>

                  {models.map((model) => (
                    <th
                      key={model.id}
                      className="px-3 py-3 text-center text-xs font-semibold sm:px-4"
                      style={{ color: model.color }}
                    >
                      {model.name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {metricRows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-t border-slate-700/50 transition hover:bg-blue-400/[0.025]"
                  >
                    <td className="px-3 py-3 sm:px-4">
                      <p className="text-xs font-medium text-slate-200">
                        {row.label}
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                        {row.description}
                      </p>
                    </td>

                    {models.map((model) => (
                      <td
                        key={model.id}
                        className="px-3 py-3 text-center text-xs tabular-nums text-slate-200 sm:px-4"
                      >
                        {model.isProcessing
                          ? "Running..."
                          : row.getValue(model)}
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="border-t border-slate-700/50 bg-[#08192c]/50">
                  <td className="px-3 py-3 sm:px-4">
                    <p className="text-xs font-medium text-slate-200">
                      Result status
                    </p>
                  </td>

                  {models.map((model) => (
                    <td
                      key={model.id}
                      className="px-3 py-3 text-center text-xs sm:px-4"
                    >
                      <span
                        className={
                          model.src
                            ? "text-emerald-300"
                            : model.error
                              ? "text-rose-300"
                              : model.isProcessing
                                ? "text-cyan-300"
                                : "text-slate-500"
                        }
                      >
                        {model.src
                          ? "Success"
                          : model.error
                            ? "Failed"
                            : model.isProcessing
                              ? "Processing"
                              : "Pending"}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Interpretation note */}
        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
          <h4 className="text-xs font-bold text-amber-200">
            How to interpret these measurements
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Higher edge sharpness does not automatically mean a better
            restoration; noise and artifacts can increase it. Brightness,
            contrast and saturation describe image appearance, not identity
            preservation. These measurements are not a subjective quality
            rating. Face similarity and ground-truth metrics such as PSNR
            or SSIM require additional reference data and evaluation logic.
          </p>
        </div>
      </div>
    </section>
  );
}
