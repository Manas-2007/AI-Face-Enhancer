import { useMemo, useState } from "react";

const MODELS = [
  {
    id: "codeformer",
    name: "CodeFormer",
    color: "#38aaff",
    soft: "rgba(56,170,255,0.10)",
    description: "General face restoration",
    detail: "Focuses on restoring facial appearance and details.",
  },
  {
    id: "restoreformer",
    name: "RestoreFormer++",
    color: "#24ddb0",
    soft: "rgba(36,221,176,0.10)",
    description: "Real-world face restoration",
    detail: "Designed for restoring faces with real-world degradation.",
  },
  {
    id: "facesparnet",
    name: "Face-SPARNet",
    color: "#ffad42",
    soft: "rgba(255,173,66,0.10)",
    description: "Face super-resolution",
    detail: "Focuses on increasing facial image resolution.",
  },
  {
    id: "rgformer",
    name: "RGFormer",
    color: "#ec67e5",
    soft: "rgba(236,103,229,0.10)",
    description: "Reference-guided super-resolution",
    detail: "Uses reference guidance in its enhancement workflow.",
  },
];

const METRICS = [
  {
    key: "sharpness",
    label: "Sharpness",
    description: "Clarity of facial edges",
  },
  {
    key: "detailRecovery",
    label: "Detail Recovery",
    description: "Eyes, hair, beard and lips",
  },
  {
    key: "noiseReduction",
    label: "Noise Reduction",
    description: "Reduction of grain and noise",
  },
  {
    key: "skinNaturalness",
    label: "Skin Naturalness",
    description: "Natural-looking skin texture",
  },
  {
    key: "faceSimilarity",
    label: "Face Similarity",
    description: "Similarity to the original person",
  },
  {
    key: "brightnessContrast",
    label: "Brightness & Contrast",
    description: "Balanced light and dark areas",
  },
  {
    key: "colorAccuracy",
    label: "Color Accuracy",
    description: "Natural-looking colors and skin tone",
  },
  {
    key: "artifactReduction",
    label: "Artifact Reduction",
    description: "Fewer unwanted marks and distortions",
  },
];

function getResult(result) {
  if (typeof result === "string") {
    return { src: result, time: null };
  }

  if (!result || typeof result !== "object") {
    return { src: null, time: null };
  }

  return {
    src:
      result.imageUrl ||
      result.image_url ||
      result.url ||
      result.preview ||
      null,
    time: result.processingTime ?? result.processing_time ?? null,
  };
}

function getScore(qualityScores, modelId, metricKey) {
  const raw = qualityScores?.[modelId]?.[metricKey];

  if (raw === "" || raw == null) return null;

  const score = Number(raw);

  if (!Number.isFinite(score) || score < 1 || score > 5) {
    return null;
  }

  return score;
}

function formatTime(time) {
  if (time == null || time === "") return null;

  const value = Number(time);

  if (Number.isFinite(value)) {
    return `${value.toFixed(2)} s`;
  }

  return String(time);
}

function SmallImageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

function PanelHeading({ children, subtitle, icon }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/[0.07] text-cyan-300">
        {icon}
      </span>

      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-slate-100 sm:text-lg">
          {children}
        </h2>

        {subtitle && (
          <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-[13px]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Comparison({
  selectedImage,
  results = {},
  qualityScores = {},
  processing = {},
  processingTimes = {},
}) {
  const [activeModel, setActiveModel] = useState("codeformer");

  const originalSrc = selectedImage?.preview || null;

  const modelResults = useMemo(() => {
    return MODELS.map((model) => {
      const result = getResult(results?.[model.id]);

      const time =
        processingTimes?.[model.id] ??
        result.time;

      const scores = METRICS.map((metric) =>
        getScore(qualityScores, model.id, metric.key)
      );

      const complete = scores.every((score) => score !== null);

      const average = complete
        ? scores.reduce((sum, score) => sum + score, 0) /
          METRICS.length
        : null;

      return {
        ...model,
        ...result,
        time,
        scores,
        complete,
        average,
        isProcessing: Boolean(processing?.[model.id]),
      };
    });
  }, [results, qualityScores, processing, processingTimes]);

  // Recommend a model only when all four have complete ratings.
  const allRated = modelResults.every((model) => model.complete);

  const recommended = allRated
    ? [...modelResults].sort((a, b) => {
        if (b.average !== a.average) {
          return b.average - a.average;
        }

        const aTime = Number(a.time);
        const bTime = Number(b.time);

        if (
          a.time != null &&
          b.time != null &&
          Number.isFinite(aTime) &&
          Number.isFinite(bTime)
        ) {
          return aTime - bTime;
        }

        return 0;
      })[0]
    : null;

  const timedModels = modelResults.filter((model) => {
    return (
      model.time != null &&
      Number.isFinite(Number(model.time))
    );
  });

  const fastest = timedModels.length
    ? [...timedModels].sort(
        (a, b) => Number(a.time) - Number(b.time)
      )[0]
    : null;

  const active = modelResults.find(
    (model) => model.id === activeModel
  );

  return (
    <section className="w-full px-4 pb-8 pt-2 sm:px-5 lg:px-7">
      <style>{`
        @keyframes comparisonEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .comparison-panel {
          animation: comparisonEnter .45s ease-out both;
        }

        .comparison-model-option {
          transition:
            border-color .22s ease,
            background-color .22s ease,
            transform .22s ease,
            box-shadow .22s ease;
        }

        .comparison-model-option:hover {
          transform: translateY(-2px);
        }

        @media (prefers-reduced-motion: reduce) {
          .comparison-panel,
          .comparison-model-option {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.12fr_1fr]">

        {/* LEFT: PERFORMANCE TABLE */}
        <div
          className="comparison-panel min-w-0 rounded-2xl border border-blue-500/25 bg-gradient-to-br from-[#07182e] to-[#030d1c] p-3.5 sm:p-5"
        >
          <PanelHeading
            subtitle="Compare image-quality ratings and actual processing time."
            icon={
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
              </svg>
            }
          >
            Model Performance Analysis
          </PanelHeading>

          {/* SCORE LEGEND */}
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-700/50 bg-[#030d1c]/70 px-3 py-2.5">
            <span className="text-[11px] font-medium text-slate-300">
              Quality score
            </span>

            {[1, 2, 3, 4, 5].map((score) => (
              <span
                key={score}
                className="flex items-center gap-1 text-[10px] text-slate-400"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-semibold ${
                    score === 5
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border-slate-700 bg-slate-800/60"
                  }`}
                >
                  {score}
                </span>
              </span>
            ))}

            <span className="ml-auto text-[10px] text-slate-500">
              5 = Best
            </span>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto rounded-xl border border-blue-500/20">
            <table className="w-full min-w-[580px] border-collapse text-left">
              <thead>
                <tr className="bg-[#0a1b32]">
                  <th className="w-[34%] px-3 py-3 text-[11px] font-semibold text-slate-300 sm:text-xs">
                    Parameter
                  </th>

                  {modelResults.map((model) => (
                    <th
                      key={model.id}
                      className="px-2 py-3 text-center text-[10px] font-semibold sm:text-[11px]"
                      style={{ color: model.color }}
                    >
                      <span className="block leading-tight">
                        {model.name}
                      </span>

                      {recommended?.id === model.id && (
                        <span className="mt-1 inline-block rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[8px] text-emerald-300">
                          BEST
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {METRICS.map((metric, rowIndex) => (
                  <tr
                    key={metric.key}
                    className="border-t border-slate-700/45 transition-colors hover:bg-blue-400/[0.025]"
                  >
                    <td className="px-3 py-3">
                      <p className="text-[11px] font-medium leading-snug text-slate-200 sm:text-xs">
                        {metric.label}
                      </p>

                      <p className="mt-1 hidden text-[10px] leading-relaxed text-slate-500 2xl:block">
                        {metric.description}
                      </p>
                    </td>

                    {modelResults.map((model) => {
                      const score = getScore(
                        qualityScores,
                        model.id,
                        metric.key
                      );

                      const isBest =
                        recommended?.id === model.id;

                      return (
                        <td
                          key={model.id}
                          className={`px-2 py-3 text-center ${
                            isBest
                              ? "bg-emerald-400/[0.035]"
                              : ""
                          }`}
                        >
                          {score == null ? (
                            <span className="text-xs text-slate-600">
                              —
                            </span>
                          ) : (
                            <div className="mx-auto flex max-w-[86px] flex-col items-center gap-1.5">
                              <span
                                className={`text-xs font-semibold tabular-nums ${
                                  isBest
                                    ? "text-emerald-300"
                                    : "text-slate-200"
                                }`}
                              >
                                {score.toFixed(1)}
                                <span className="text-[9px] font-normal text-slate-500">
                                  /5
                                </span>
                              </span>

                              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(score / 5) * 100}%`,
                                    backgroundColor: model.color,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* PROCESSING TIME */}
                <tr className="border-t border-slate-700/60 bg-[#08192c]/60">
                  <td className="px-3 py-3">
                    <p className="text-[11px] font-semibold text-slate-200 sm:text-xs">
                      Processing Time
                    </p>

                    <p className="mt-1 text-[10px] text-slate-500">
                      Lower is faster
                    </p>
                  </td>

                  {modelResults.map((model) => (
                    <td
                      key={model.id}
                      className="px-2 py-3 text-center"
                    >
                      {model.isProcessing ? (
                        <span className="text-[10px] text-cyan-300">
                          Running...
                        </span>
                      ) : model.time != null ? (
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            fastest?.id === model.id
                              ? "text-emerald-300"
                              : "text-slate-200"
                          }`}
                        >
                          {formatTime(model.time)}
                          {fastest?.id === model.id && (
                            <span className="ml-1 text-[9px]">
                              FAST
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* OVERALL AVERAGE */}
                <tr className="border-t border-blue-500/25 bg-blue-400/[0.035]">
                  <td className="px-3 py-3">
                    <p className="text-xs font-bold text-slate-100">
                      Overall Quality
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Average of 8 ratings
                    </p>
                  </td>

                  {modelResults.map((model) => (
                    <td
                      key={model.id}
                      className="px-2 py-3 text-center"
                    >
                      {model.average == null ? (
                        <span className="text-xs text-slate-600">
                          Pending
                        </span>
                      ) : (
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            recommended?.id === model.id
                              ? "text-emerald-300"
                              : "text-slate-200"
                          }`}
                        >
                          {model.average.toFixed(2)}
                          <span className="text-[9px] font-normal text-slate-500">
                            /5
                          </span>
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* SCORING CRITERIA */}
          <div className="mt-4 rounded-xl border border-blue-400/20 bg-[#06152a]/75 p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-cyan-300">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 7h.01" />
                </svg>
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-100">
                  How Is the Score Calculated?
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Each visual parameter receives a rating from 1 to 5:
                  1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good,
                  and 5 = Excellent.
                </p>

                <div className="mt-3 rounded-lg border border-slate-700/60 bg-[#030d1b] px-3 py-2.5">
                  <p className="text-xs font-semibold text-cyan-200">
                    Overall Quality = Total of 8 ratings ÷ 8
                  </p>

                  <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                    All eight visual parameters carry equal weight.
                    Processing time is measured separately and is not
                    included in the quality average.
                  </p>
                </div>

                <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                  Ratings should be assigned after reviewing all four
                  outputs using the same input photo and consistent
                  criteria. They are not automatically inferred by
                  this UI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex min-w-0 flex-col gap-4">

          {/* VISUAL COMPARISON */}
          <div className="comparison-panel min-w-0 rounded-2xl border border-blue-500/25 bg-gradient-to-br from-[#07182e] to-[#030d1c] p-3.5 sm:p-5">
            <PanelHeading
              subtitle="View complete photos side by side. Select a model to inspect its output."
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="8" height="16" rx="2" />
                  <rect x="13" y="4" width="8" height="16" rx="2" />
                  <path d="M7 9h.01M17 9h.01" />
                </svg>
              }
            >
              Visual Comparison
            </PanelHeading>

            {/* FULL PHOTO SIDE-BY-SIDE */}
            <div className="grid grid-cols-2 gap-3">
              {/* Original */}
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-300">
                    Original
                  </span>

                  <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                    SOURCE
                  </span>
                </div>

                <div className="flex h-[155px] items-center justify-center overflow-hidden rounded-xl border border-slate-700/70 bg-[#020914] sm:h-[185px]">
                  {originalSrc ? (
                    <img
                      src={originalSrc}
                      alt="Original photo"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-600">
                      <SmallImageIcon />
                      <span className="text-[10px]">
                        Upload image
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected model output */}
              <div className="min-w-0">
                <div className="mb-2 flex min-w-0 items-center justify-between gap-1">
                  <span
                    className="truncate text-xs font-semibold"
                    style={{ color: active?.color }}
                  >
                    {active?.name}
                  </span>

                  <span className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] px-1.5 py-0.5 text-[9px] text-cyan-200">
                    OUTPUT
                  </span>
                </div>

                <div
                  className="flex h-[155px] items-center justify-center overflow-hidden rounded-xl border bg-[#020914] sm:h-[185px]"
                  style={{ borderColor: `${active?.color}70` }}
                >
                  {active?.isProcessing ? (
                    <div className="flex flex-col items-center gap-2 text-cyan-300">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
                      <span className="text-[10px]">
                        Processing...
                      </span>
                    </div>
                  ) : active?.src ? (
                    <img
                      src={active.src}
                      alt={`${active.name} output`}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 px-2 text-center text-slate-500">
                      <SmallImageIcon />
                      <span className="text-[10px]">
                        No generated output yet
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MODEL SELECTORS */}
            <div className="mt-4">
              <p className="mb-2.5 text-[11px] font-medium text-slate-400">
                Select a model
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {modelResults.map((model) => {
                  const selected = activeModel === model.id;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setActiveModel(model.id)}
                      aria-pressed={selected}
                      className={`comparison-model-option min-w-0 rounded-xl border p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                        selected
                          ? "bg-white/[0.04]"
                          : "border-slate-700/70 bg-[#030d1c]/60 hover:bg-white/[0.025]"
                      }`}
                      style={{
                        borderColor: selected
                          ? model.color
                          : undefined,
                        boxShadow: selected
                          ? `0 0 14px ${model.color}12`
                          : "none",
                      }}
                    >
                      <div className="mb-2 flex h-[75px] items-center justify-center overflow-hidden rounded-lg bg-[#020914]">
                        {model.src ? (
                          <img
                            src={model.src}
                            alt={`${model.name} thumbnail`}
                            loading="lazy"
                            className="h-full w-full object-contain p-0.5"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-600">
                            <SmallImageIcon />
                            <span className="text-[8px]">
                              No output
                            </span>
                          </div>
                        )}
                      </div>

                      <p
                        className="break-words text-[10px] font-semibold leading-tight"
                        style={{
                          color: selected ? model.color : "#cbd5e1",
                        }}
                      >
                        {model.name}
                      </p>

                      <p className="mt-1 text-[9px] text-slate-500">
                        {model.isProcessing
                          ? "Processing"
                          : model.src
                            ? "Output ready"
                            : "Awaiting output"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected model description */}
            <div
              className="mt-3 rounded-xl border p-3"
              style={{
                borderColor: `${active?.color}35`,
                background: active?.soft,
              }}
            >
              <p className="text-xs font-semibold text-slate-100">
                {active?.name}: What to look for
              </p>

              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                {active?.detail}
              </p>

              {active?.id === "rgformer" && (
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  Reference guidance may require an additional reference
                  image, depending on the inference workflow.
                </p>
              )}
            </div>
          </div>

          {/* KEY CHARACTERISTICS */}
          <div className="comparison-panel rounded-2xl border border-blue-500/25 bg-gradient-to-br from-[#07182e] to-[#030d1c] p-3.5 sm:p-5">
            <PanelHeading
              subtitle="Each model has a different restoration approach."
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3v18M3 12h18" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
              }
            >
              Key Model Characteristics
            </PanelHeading>

            <div className="flex flex-col gap-2.5">
              {modelResults.map((model) => (
                <button
                  type="button"
                  key={model.id}
                  onClick={() => setActiveModel(model.id)}
                  className="comparison-model-option flex items-start gap-3 rounded-xl border border-slate-700/50 bg-[#030d1b]/65 p-3 text-left hover:border-slate-600"
                  style={{
                    borderLeft: `3px solid ${model.color}`,
                    background:
                      activeModel === model.id
                        ? model.soft
                        : undefined,
                  }}
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                    style={{
                      color: model.color,
                      backgroundColor: model.soft,
                      borderColor: `${model.color}40`,
                    }}
                  >
                    <SmallImageIcon />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-xs font-semibold"
                      style={{ color: model.color }}
                    >
                      {model.name}
                    </span>

                    <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">
                      {model.description}
                    </span>
                  </span>

                  <span className="mt-1 shrink-0 text-slate-500">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* OVERALL INSIGHTS */}
      <div className="mt-4 rounded-2xl border border-blue-500/25 bg-gradient-to-r from-[#081a31] via-[#071329] to-[#101332] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18h6M10 21h4" />
                <path d="M8 14.5a7 7 0 1 1 8 0c-.9.7-1 1.4-1 2.5H9c0-1.1-.1-1.8-1-2.5Z" />
              </svg>
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-100 sm:text-lg">
                Overall Insights
              </h2>

              {recommended ? (
                <>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    Recommended:{" "}
                    <span
                      className="font-bold"
                      style={{ color: recommended.color }}
                    >
                      {recommended.name}
                    </span>{" "}
                    with an average visual-quality score of{" "}
                    <strong className="text-white">
                      {recommended.average.toFixed(2)}/5
                    </strong>.
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    This recommendation uses the eight ratings entered
                    for each model. It does not guarantee that the
                    same model will be best for every photo.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    Your model recommendation will appear after all
                    four models receive scores for all eight quality
                    parameters.
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Scores are currently pending. No model has been
                    declared the winner without complete ratings.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-[245px]">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
              <p className="text-[10px] font-medium text-slate-400">
                Best Quality
              </p>

              <p className="mt-1.5 text-sm font-bold text-emerald-300">
                {recommended?.name || "Pending"}
              </p>

              <p className="mt-1 text-[10px] text-slate-500">
                Based on average rating
              </p>
            </div>

            <div className="rounded-xl border border-blue-400/20 bg-blue-400/[0.05] p-3">
              <p className="text-[10px] font-medium text-slate-400">
                Fastest Model
              </p>

              <p className="mt-1.5 text-sm font-bold text-blue-300">
                {fastest?.name || "Pending"}
              </p>

              <p className="mt-1 text-[10px] text-slate-500">
                {fastest ? formatTime(fastest.time) : "Awaiting timings"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}