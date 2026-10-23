import { useEffect, useState } from "react";
const models = [
  {
    id: "codeformer",
    name: "CodeFormer",
    subtitle: "Face Restoration",
    description: "Recover facial details",
    color: "#38aaff",
    light: "#8bd5ff",
    glow: "rgba(56, 170, 255, 0.22)",
    background: "rgba(56, 170, 255, 0.09)",
  },
  {
    id: "restoreformer",
    name: "RestoreFormer++",
    subtitle: "Real-World Restoration",
    description: "Restore degraded faces",
    color: "#24e0b0",
    light: "#8bffdf",
    glow: "rgba(36, 224, 176, 0.20)",
    background: "rgba(36, 224, 176, 0.08)",
  },
  {
    id: "sparnethd",
    name: "SPARNetHD",
    subtitle: "Super Resolution",
    description: "Recover facial resolution",
    color: "#ffae42",
    light: "#ffd69b",
    glow: "rgba(255, 174, 66, 0.20)",
    background: "rgba(255, 174, 66, 0.08)",
  },
  {
    id: "rgformer",
    name: "RGFormer",
    subtitle: "Reference-Guided SR",
    description: "Reference-guided enhancement",
    color: "#ec67e5",
    light: "#ffb5f9",
    glow: "rgba(236, 103, 229, 0.20)",
    background: "rgba(236, 103, 229, 0.08)",
  },
];

const OUTPUT_SIZES = [128, 256, 512];

function ModelIcon({ color }) {
  return (
    <svg
      viewBox="0 0 44 44"
      className="h-11 w-11 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14 3.8h16L40.2 14v16L30 40.2H14L3.8 30V14L14 3.8Z"
        fill={color}
        fillOpacity="0.1"
        stroke={color}
        strokeWidth="1.6"
      />
      <rect
        x="10"
        y="10"
        width="24"
        height="24"
        rx="6"
        stroke={color}
        strokeWidth="1.7"
      />
      <path
        d="M15 18.5Q22 12 29 18.5V24Q22 32 15 24Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="20" r="1.5" fill={color} />
      <circle cx="25" cy="20" r="1.5" fill={color} />
      <path
        d="M19 25Q22 27.5 25 25"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M22 5.5V8M35 22H38"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 2.1 6.1L20 12l-5.9 2.1L12 20l-2.1-5.9L4 12l5.9-2.9L12 3Z" />
      <path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" />
    </svg>
  );
}
function ComparisonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21V3" />
      <path d="M3 21h18" />
      <rect x="6" y="12" width="3.5" height="6" rx="1" />
      <rect x="11" y="8" width="3.5" height="10" rx="1" />
      <rect x="16" y="4" width="3.5" height="14" rx="1" />
    </svg>
  );
}
function LoadingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity=".25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
export default function AI_Label({
  selectedImage,
  onGenerateModel,
  onCompareAll,
  onModelSelect,
  openScalePickerSignal = 0,
}) {
  const [activeModel, setActiveModel] = useState("sparnethd");
  const [generatingModel, setGeneratingModel] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [message, setMessage] = useState("");
  const [scalePickerModel, setScalePickerModel] = useState(null);
  const [outputSize, setOutputSize] = useState(512);
  const [inputDimensions, setInputDimensions] = useState(null);
  const [referenceImage, setReferenceImage] = useState(null);
  const [referencePanelOpen, setReferencePanelOpen] = useState(false);

  useEffect(() => {
    const file = selectedImage?.file;
    let active = true;

    setScalePickerModel(null);
    setOutputSize(512);
    setReferenceImage(null);
    setReferencePanelOpen(false);

    if (!file) {
      setInputDimensions(null);
      return undefined;
    }

    const imageUrl = URL.createObjectURL(file);
    const probe = new Image();

    probe.onload = () => {
      if (active) {
        setInputDimensions({
          width: probe.naturalWidth,
          height: probe.naturalHeight,
        });
      }
    };

    probe.onerror = () => {
      if (active) setInputDimensions(null);
    };

    probe.src = imageUrl;

    return () => {
      active = false;
      probe.onload = null;
      probe.onerror = null;
      URL.revokeObjectURL(imageUrl);
    };
  }, [selectedImage?.file]);

  // The Hero action also opens the selector rather than generating at a hidden default size.
  useEffect(() => {
    if (!openScalePickerSignal) return;

    if (!selectedImage?.file) {
      setMessage("Upload an image first to choose an output size.");
      return;
    }

    setActiveModel("sparnethd");
    setMessage("");
    setOutputSize(512);
    setScalePickerModel("sparnethd");
    onModelSelect?.("sparnethd");
  }, [openScalePickerSignal]);

  const selectModel = (model) => {
    setActiveModel(model.id);
    setScalePickerModel(null);
    setMessage("");
    onModelSelect?.(model.id);
  };

  const openScalePicker = (model) => {
    if (generatingModel || isComparing) return;

    if (!["codeformer", "restoreformer", "sparnethd", "rgformer"].includes(model.id)) {
      setMessage("This model is not connected yet.");
      return;
    }

    if (!selectedImage?.file) {
      setMessage("Upload an image first to generate an enhanced result.");
      return;
    }

    if (model.id === "rgformer" && !referenceImage) {
      setReferencePanelOpen(true);
      setMessage("Add a clear, high-quality reference photo of the same person in the RGFormer reference dropdown.");
      return;
    }

    if (!onGenerateModel) {
      setMessage(
        `${model.name} is selected. Connect the Python inference backend to run this model.`
      );
      return;
    }

    setActiveModel(model.id);
    setMessage("");
    setOutputSize(512);
    setScalePickerModel(model.id);
    onModelSelect?.(model.id);
  };

  const runSelectedModel = async (model) => {
    if (generatingModel || isComparing) return;

    if (!selectedImage?.file) {
      setScalePickerModel(null);
      setMessage("Upload an image first to generate an enhanced result.");
      return;
    }

    if (!["codeformer", "restoreformer", "sparnethd", "rgformer"].includes(model.id)) {
      setMessage("This model is not connected yet.");
      return;
    }

    if (model.id === "rgformer" && !referenceImage) {
      setReferencePanelOpen(true);
      setMessage("Add a clear, high-quality reference photo of the same person in the RGFormer reference dropdown.");
      return;
    }

    if (!onGenerateModel) {
      setMessage("Connect the Python inference backend to run this model.");
      return;
    }

    setMessage("");
    setScalePickerModel(null);
    setGeneratingModel(model.id);

    try {
      await onGenerateModel(model.id, outputSize, referenceImage);
    } catch (error) {
      console.error(error);
      setMessage(
        error?.message ||
          `Unable to process ${model.name}. Please try again.`
      );
    } finally {
      setGeneratingModel(null);
    }
  };

  const getScaleCaption = (size) => {
    const inputSide = inputDimensions
      ? Math.max(inputDimensions.width, inputDimensions.height)
      : null;

    if (inputSide && inputSide <= 128) {
      const factor = size / inputSide;
      const formattedFactor = Number(factor.toFixed(2)).toString();
      return `${formattedFactor}× from input`;
    }

    if (size === 512) return "Native 512px face";
    return "Resized face crop";
  };

  const compareAll = async () => {
    if (generatingModel || isComparing) return;

    if (!selectedImage?.file) {
      setMessage("Upload an image first to compare the four models.");
      return;
    }

    if (!referenceImage) {
      setActiveModel("rgformer");
      setReferencePanelOpen(true);
      onModelSelect?.("rgformer");
      setMessage("Add a high-quality reference photo of the same person in the RGFormer reference dropdown before comparing all four models.");
      return;
    }

    if (!onCompareAll) {
      setMessage("The model-comparison action is not connected yet.");
      return;
    }

    setMessage("");
    setIsComparing(true);

    try {
      await onCompareAll(referenceImage);
    } catch (error) {
      console.error(error);
      setMessage("Comparison failed. Please try again.");
    } finally {
      setIsComparing(false);
    }
  };
  return (
    <section className="w-full px-4 pb-6 pt-2 sm:px-5 sm:pb-8 lg:px-7">
      <style>{`
        @keyframes aiLabelEnter {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes aiLabelHalo {
          0%, 100% {
            box-shadow: 0 0 10px var(--model-glow);
          }
          50% {
            box-shadow: 0 0 23px var(--model-glow);
          }
        }
        @keyframes aiLabelShine {
          0% {
            transform: translateX(-160%) skewX(-20deg);
          }
          100% {
            transform: translateX(260%) skewX(-20deg);
          }
        }
        @keyframes aiLabelFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .ai-model-card {
          isolation: isolate;
          animation: aiLabelEnter .65s cubic-bezier(.2,.8,.2,1) both;
          transition:
            transform .3s ease,
            border-color .3s ease,
            box-shadow .3s ease,
            background-color .3s ease;
        }
        .ai-model-card::before {
          position: absolute;
          content: "";
          z-index: -1;
          inset: 0;
          opacity: 0;
          background:
            radial-gradient(
              circle at 50% 0%,
              var(--model-glow),
              transparent 75%
            );
          transition: opacity .35s ease;
          pointer-events: none;
        }
        .ai-model-card:hover::before,
        .ai-model-card-active::before {
          opacity: 1;
        }
        .ai-model-card:hover {
          transform: translateY(-5px);
          border-color: var(--model-color);
          box-shadow:
            0 12px 28px var(--model-glow),
            inset 0 0 24px rgba(255,255,255,.015);
        }
        .ai-model-card-active {
          border-color: var(--model-color);
          animation:
            aiLabelEnter .65s cubic-bezier(.2,.8,.2,1) both,
            aiLabelHalo 3.5s ease-in-out 1s infinite;
        }
        .ai-model-icon {
          transition: filter .3s ease;
        }
        .ai-model-card:hover .ai-model-icon {
          animation: aiLabelFloat 1.4s ease-in-out infinite;
          filter: drop-shadow(0 0 8px var(--model-color));
        }
        .ai-model-shine {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 35%;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.13),
            transparent
          );
          transform: translateX(-160%) skewX(-20deg);
        }
        .ai-model-generate:hover .ai-model-shine {
          animation: aiLabelShine .85s ease forwards;
        }
        .ai-model-generate:active {
          transform: scale(.975);
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-model-card,
          .ai-model-card-active,
          .ai-model-icon,
          .ai-model-generate,
          .ai-model-shine {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      {/* Section heading */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-cyan-300 to-blue-600" />
            <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
              Choose Your AI Model
            </h2>
          </div>
          <p className="pl-3 text-xs leading-relaxed text-slate-400 sm:text-sm">
            Select a model to enhance your image or compare all four.
          </p>
        </div>
        <span className="rounded-full border border-blue-400/20 bg-blue-400/[0.07] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-blue-200 sm:text-xs">
          04 MODELS AVAILABLE
        </span>
      </div>
      {/* Model cards and comparison */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_155px]">
        {models.map((model, index) => {
          const isActive = activeModel === model.id;
          const isGenerating = generatingModel === model.id;
          const isBusy = Boolean(generatingModel) || isComparing;
          return (
            <article
              key={model.id}
              onClick={() => selectModel(model)}
              className={`
                ai-model-card relative min-w-0 cursor-pointer
                overflow-hidden rounded-2xl border p-4 sm:p-5
                ${
                  isActive
                    ? "ai-model-card-active"
                    : "border-blue-500/25"
                }
              `}
              style={{
                "--model-color": model.color,
                "--model-glow": model.glow,
                animationDelay: `${index * 100}ms`,
                background: `
                  linear-gradient(
                    145deg,
                    ${model.background},
                    rgba(5, 17, 35, .97) 65%
                  )
                `,
              }}
            >
              {/* Top highlight */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${model.color}, transparent)`,
                  opacity: isActive ? 1 : 0.35,
                }}
              />
              {/* Model heading */}
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="ai-model-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: `${model.color}60`,
                    backgroundColor: model.background,
                    boxShadow: isActive
                      ? `0 0 17px ${model.glow}`
                      : "none",
                  }}
                >
                  <ModelIcon color={model.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className="break-words text-sm font-bold tracking-tight sm:text-base"
                    style={{
                      color: isActive ? model.light : "#f1f5f9",
                    }}
                  >
                    {model.name}
                  </h3>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400 sm:text-xs">
                    {model.subtitle}
                  </p>
                </div>
                {isActive && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: model.color,
                      boxShadow: `0 0 12px ${model.color}`,
                    }}
                    title="Selected model"
                  />
                )}
              </div>
              {/* Short description */}
              <p className="mb-4 mt-4 text-xs leading-relaxed text-slate-400 sm:text-[13px]">
                {model.description}
              </p>
              {model.id === "rgformer" && (
                <div
                  className="mb-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/[0.04]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-expanded={referencePanelOpen}
                    onClick={(event) => {
                      event.stopPropagation();
                      setReferencePanelOpen((open) => !open);
                      setMessage("");
                    }}
                    className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-fuchsia-400/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-fuchsia-100">
                        {referenceImage ? "Reference photo added" : "Add reference photo"}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                        {referenceImage ? referenceImage.name : "Same person · higher quality"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[10px] font-semibold text-fuchsia-200">
                      {referenceImage ? "Change" : "Choose"}
                      <span aria-hidden="true" className={`inline-block transition-transform ${referencePanelOpen ? "rotate-180" : ""}`}>⌄</span>
                    </span>
                  </button>
                  {referencePanelOpen && (
                    <div className="border-t border-fuchsia-400/20 px-3 pb-3 pt-2">
                      <label className="block text-[11px] font-medium text-slate-200">
                        Select a clear photo of the same person
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            setReferenceImage(file);
                            if (file) {
                              setActiveModel("rgformer");
                              onModelSelect?.("rgformer");
                              setReferencePanelOpen(false);
                            }
                            setMessage("");
                          }}
                          className="mt-2 block w-full cursor-pointer text-[10px] text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-fuchsia-400/15 file:px-2 file:py-1.5 file:text-[10px] file:font-semibold file:text-fuchsia-100 hover:file:bg-fuchsia-400/25"
                        />
                      </label>
                      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                        RGFormer automatically crops the face and estimates a reference mask.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Generate */}
              <button
                type="button"
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation();
                  openScalePicker(model);
                }}
                className="ai-model-generate group relative flex min-h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-lg border px-3 py-2.5 text-sm font-bold transition-all duration-300 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-60"
                style={{
                  color: model.light,
                  background: `linear-gradient(110deg, ${model.background}, ${model.glow})`,
                  borderColor: `${model.color}85`,
                  boxShadow: isActive
                    ? `0 0 14px ${model.glow}`
                    : "none",
                }}
              >
                <span className="ai-model-shine" />
                <span className="relative z-10">
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <LoadingIcon />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <SparkleIcon />
                      Generate
                    </span>
                  )}
                </span>
              </button>
              {scalePickerModel === model.id && (
                <div
                  className="mt-4 rounded-xl border p-3"
                  style={{
                    borderColor: `${model.color}60`,
                    background: "rgba(2, 9, 20, 0.76)",
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-100">
                      Choose rescaling factor
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                      Select the final output dimensions before generating.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {OUTPUT_SIZES.map((size) => {
                      const isSelectedSize = outputSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          aria-pressed={isSelectedSize}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOutputSize(size);
                          }}
                          className="flex min-w-0 flex-col items-center justify-center rounded-lg border px-1 py-2 transition-colors"
                          style={{
                            borderColor: isSelectedSize
                              ? model.color
                              : "rgba(148, 163, 184, 0.22)",
                            backgroundColor: isSelectedSize
                              ? model.background
                              : "rgba(15, 23, 42, 0.45)",
                            color: isSelectedSize ? model.light : "#cbd5e1",
                          }}
                        >
                          <span className="text-xs font-bold">{size}px</span>
                          <span className="mt-1 text-center text-[9px] leading-tight text-slate-400">
                            {getScaleCaption(size)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                    {model.name} produces a 512×512 restored face crop. The
                    128px and 256px options resize that result to your chosen dimensions.
                  </p>

                  <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setScalePickerModel(null);
                      }}
                      className="rounded-lg border border-slate-600/60 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800/70"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        runSelectedModel(model);
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                      style={{
                        background: `linear-gradient(110deg, ${model.color}, ${model.light})`,
                        color: "#04101e",
                      }}
                    >
                      <SparkleIcon />
                      Generate {outputSize}×{outputSize}
                    </button>
                  </div>
                </div>
              )}
              {/* Selected status */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? "animate-pulse" : ""
                  }`}
                  style={{
                    backgroundColor: isActive ? model.color : "#475569",
                  }}
                />
                {isActive ? (scalePickerModel === model.id ? "Choose output size" : "Ready for enhancement") : "Click to select"}
              </div>
            </article>
          );
        })}
        {/* Comparison card */}
        <button
          type="button"
          onClick={compareAll}
          disabled={Boolean(generatingModel) || isComparing}
          className="
            group relative flex min-h-[175px] flex-col
            items-center justify-center gap-3 overflow-hidden
            rounded-2xl border border-blue-500/30
            bg-gradient-to-br from-[#0c2342] to-[#061329]
            p-4 text-center text-slate-200
            transition-all duration-300
            hover:-translate-y-1 hover:border-cyan-400/70
            hover:text-cyan-200
            hover:shadow-[0_10px_28px_rgba(34,211,238,0.12)]
            active:scale-[0.98]
            disabled:cursor-wait disabled:opacity-60
            focus-visible:outline-2
            focus-visible:outline-offset-2
            focus-visible:outline-cyan-300
          "
          style={{ animation: "aiLabelEnter .7s ease-out .4s both" }}
        >
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/[0.07] text-cyan-300 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.18)]">
            {isComparing ? <LoadingIcon /> : <ComparisonIcon />}
          </div>
          <div>
            <span className="block text-sm font-bold sm:text-base">
              {isComparing ? "Comparing..." : "Compare Models"}
            </span>
            <span className="mt-1.5 block text-xs leading-relaxed text-slate-400">
              Analyze all four outputs
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-cyan-300 transition-transform duration-300 group-hover:translate-x-1">
            Open comparison <span aria-hidden="true">→</span>
          </span>
        </button>
      </div>
      {/* Status message */}
      {message && (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] px-4 py-3 text-sm leading-relaxed text-cyan-200"
        >
          <span className="mt-0.5 shrink-0">ⓘ</span>
          <p>{message}</p>
        </div>
      )}
    </section>
  );
}
