
import { useRef, useState } from "react";

export default function Hero({
  selectedImage,
  onImageSelect,
  onClear,
  onRunAllModels,
}) {
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Validate and select image
  const handleFile = (file) => {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      setNotice("");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10 MB.");
      setNotice("");
      return;
    }

    setError("");
    setNotice("");
    onImageSelect(file);
  };

  // Handle drag and drop
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    handleFile(event.dataTransfer.files?.[0]);
  };

  // Clear image
  const handleClear = () => {
    setError("");
    setNotice("");
    onClear?.();
  };

  // Open the output-size selector
  const handleRunAll = () => {
    if (!selectedImage?.file) {
      setNotice("Please upload an image first.");
      setError("");
      return;
    }

    if (onRunAllModels) {
      onRunAllModels(selectedImage.file);
    } else {
      setNotice("Image ready! The model-selection action is not connected yet.");
    }
  };

  return (
    <section className="w-full px-4 py-5 sm:px-5 sm:py-6 lg:px-7">
      <style>{`
        @keyframes heroEntrance {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes heroGlow {
          0%, 100% {
            opacity: .45;
          }
          50% {
            opacity: .9;
          }
        }

        @keyframes uploadFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes uploadShine {
          from {
            transform: translateX(-150%) skewX(-18deg);
          }
          to {
            transform: translateX(300%) skewX(-18deg);
          }
        }

        .hero-card {
          animation: heroEntrance .65s ease-out both;
        }

        .hero-glow {
          animation: heroGlow 4s ease-in-out infinite;
        }

        .upload-icon {
          transition: transform .3s ease, filter .3s ease;
        }

        .upload-zone:hover .upload-icon {
          transform: translateY(-4px);
          filter: drop-shadow(0 0 12px rgba(56, 189, 248, .65));
        }

        .upload-zone:hover .upload-shine {
          animation: uploadShine .9s ease forwards;
        }

        .hero-action {
          transition:
            transform .25s ease,
            box-shadow .25s ease,
            filter .25s ease;
        }

        .hero-action:hover {
          transform: translateY(-2px);
        }

        .hero-action:active {
          transform: scale(.98);
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-card,
          .hero-glow,
          .upload-icon,
          .upload-shine,
          .hero-action {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* HERO INTRO + UPLOAD */}
        <div
          className="
            hero-card relative isolate grid min-w-0
            grid-cols-1 gap-6 overflow-hidden
            rounded-2xl border border-blue-500/30
            bg-gradient-to-br from-[#0a1e3a]
            via-[#06152b] to-[#030d1e]
            p-5 shadow-[0_8px_35px_rgba(0,0,0,0.15)]
            sm:grid-cols-[0.9fr_1.1fr]
            sm:items-center sm:gap-5 sm:p-6
            lg:gap-7 lg:p-7
            md:col-span-2 xl:col-span-7
          "
        >
          {/* Decorative background glow */}
          <div
            className="
              hero-glow pointer-events-none absolute
              -right-20 -top-24 -z-10
              h-64 w-64 rounded-full
              bg-blue-500/10 blur-[90px]
            "
          />

          <div
            className="
              pointer-events-none absolute -bottom-24
              left-1/4 -z-10 h-48 w-48 rounded-full
              bg-purple-500/[0.07] blur-[70px]
            "
          />

          {/* Heading */}
          <div className="flex min-w-0 flex-col justify-center">
            <div
              className="
                mb-4 flex w-fit items-center gap-2
                rounded-full border border-cyan-400/20
                bg-cyan-400/[0.06] px-3 py-1.5
              "
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="
                    absolute inline-flex h-full w-full
                    animate-ping rounded-full bg-cyan-400 opacity-40
                  "
                />
                <span className="relative h-2 w-2 rounded-full bg-cyan-400" />
              </span>

              <span className="text-[10px] font-bold tracking-[0.12em] text-cyan-300 sm:text-[11px]">
                AI-POWERED ENHANCEMENT
              </span>
            </div>

            <h2
              className="
                text-[26px] font-bold leading-[1.2]
                tracking-tight text-slate-100
                sm:text-[28px] lg:text-[30px] 2xl:text-[32px]
              "
            >
              Enhance Faces

              <span className="mt-1 block">
                with
                <span
                  className="
                    ml-2 inline-block
                    bg-gradient-to-r from-cyan-300
                    via-blue-400 to-purple-400
                    bg-clip-text text-transparent
                  "
                >
                  Next-Gen AI
                </span>
              </span>
            </h2>

            <p
              className="
                mt-3 max-w-sm text-xs
                leading-5 text-slate-400
                sm:text-[13px] sm:leading-5
              "
            >
              Bring your photos back to life. Restore facial
              details, improve clarity, and explore four
              powerful AI models in one workspace.
            </p>

            {/* Feature indicators */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Face Restoration",
                "Detail Recovery",
                "AI Upscaling",
              ].map((feature) => (
                <span
                  key={feature}
                  className="
                    rounded-md border border-slate-700/70
                    bg-slate-800/40 px-2.5 py-1.5
                    text-[10px] font-medium text-slate-300
                    sm:text-[11px]
                  "
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* UPLOAD AREA */}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsDragging(false);
              }
            }}
            onDrop={handleDrop}
            className={`
              upload-zone relative flex min-h-[190px]
              w-full min-w-0 items-center justify-center
              overflow-hidden rounded-xl border border-dashed
              p-4 transition-all duration-300
              sm:min-h-[220px] lg:min-h-[235px]
              ${
                isDragging
                  ? "border-cyan-300 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,0.12)]"
                  : "border-blue-500/60 bg-[#041127]/90 hover:border-cyan-400/80 hover:bg-blue-500/[0.04]"
              }
            `}
          >
            {/* Moving shine */}
            <span
              className="
                upload-shine pointer-events-none absolute
                inset-y-0 left-0 w-1/3
                bg-gradient-to-r from-transparent
                via-cyan-300/[0.06] to-transparent
              "
            />

            {/* Background corner glow */}
            <span
              className="
                pointer-events-none absolute -right-12
                -top-12 h-32 w-32 rounded-full
                bg-blue-500/[0.08] blur-3xl
              "
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="
                relative z-10 flex w-full flex-col
                items-center justify-center rounded-lg
                text-center outline-none
                focus-visible:ring-2 focus-visible:ring-cyan-400
              "
            >
              <div
                className="
                  upload-icon mb-4 flex h-16 w-16
                  items-center justify-center rounded-2xl
                  border border-blue-400/20
                  bg-gradient-to-br from-blue-400/10
                  to-cyan-400/[0.03]
                  shadow-[0_0_25px_rgba(59,130,246,0.08)]
                  sm:h-[72px] sm:w-[72px]
                "
              >
                <svg
                  viewBox="0 0 48 48"
                  className="h-10 w-10 text-sky-400 sm:h-12 sm:w-12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 34H11a8 8 0 0 1-1-16 14 14 0 0 1 27-3 9 9 0 0 1 1 18h-3" />
                  <path d="M24 39V21" />
                  <path d="m17 28 7-7 7 7" />
                </svg>
              </div>

              <span className="text-sm font-semibold text-slate-100 sm:text-base">
                {isDragging
                  ? "Drop your image here"
                  : "Drag & drop your image"}
              </span>

              <span className="mt-2 text-xs font-medium text-cyan-300 sm:text-[13px]">
                or click to browse files
              </span>

              <span
                className="
                  mt-4 rounded-full border border-slate-700/70
                  bg-slate-800/40 px-3 py-1.5
                  text-[11px] text-slate-400 sm:text-xs
                "
              >
                JPG, PNG or WEBP · Max 10 MB
              </span>
            </button>
          </div>
        </div>

        {/* YOUR IMAGE PREVIEW */}
        <div
          className="
            hero-card flex min-w-0 flex-col
            rounded-2xl border border-blue-500/30
            bg-gradient-to-br from-[#091b33]
            to-[#041125] p-4 sm:p-5
            md:col-span-1 xl:col-span-2
          "
          style={{ animationDelay: "100ms" }}
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white sm:text-base">
              Your Image
            </h3>

            {selectedImage && (
              <span
                className="
                  flex items-center gap-1.5 rounded-full
                  border border-emerald-400/20
                  bg-emerald-400/[0.07] px-2 py-1
                  text-[10px] font-semibold text-emerald-300
                "
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Ready
              </span>
            )}
          </div>

          <div
            className="
              relative flex min-h-[180px] flex-1
              items-center justify-center overflow-hidden
              rounded-xl border border-slate-700/40
              bg-[#030d1d] sm:min-h-[200px]
            "
          >
            {selectedImage?.preview ? (
              <>
                <img
                  src={selectedImage.preview}
                  alt="Selected image preview"
                  className="absolute inset-0 h-full w-full object-contain p-1"
                />

                <span
                  className="
                    absolute right-3 top-3 flex
                    h-7 w-7 items-center justify-center
                    rounded-full border border-emerald-300/30
                    bg-emerald-400 text-[#03111f]
                    shadow-[0_0_15px_rgba(52,211,153,0.25)]
                  "
                >
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m4 10 4 4 8-8" />
                  </svg>
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/40">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                </div>

                <p className="text-sm text-slate-400">
                  Your preview will appear here
                </p>
              </div>
            )}
          </div>

          <p
            className="mt-3 truncate text-xs text-slate-400"
            title={selectedImage?.file?.name || ""}
          >
            {selectedImage?.file?.name || "No image selected"}
          </p>
        </div>

        {/* QUICK ACTIONS */}
        <div
          className="
            hero-card flex min-w-0 flex-col
            rounded-2xl border border-blue-500/30
            bg-gradient-to-br from-[#091b33]
            to-[#041125] p-4 sm:p-5
            md:col-span-1 xl:col-span-3
          "
          style={{ animationDelay: "200ms" }}
        >
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-400/[0.07]">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-blue-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 8v4l3 2" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Quick Actions
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Ready when you are
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {/* Open model output-size selector */}
            <button
              type="button"
              onClick={handleRunAll}
              className="
                hero-action group relative flex min-h-[52px]
                w-full items-center justify-center gap-2.5
                overflow-hidden rounded-xl
                bg-gradient-to-r from-indigo-500
                via-blue-500 to-sky-500
                px-4 py-3 text-sm font-bold text-white
                shadow-[0_5px_20px_rgba(59,130,246,0.18)]
                hover:shadow-[0_7px_25px_rgba(59,130,246,0.3)]
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-cyan-300
              "
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              <svg
                viewBox="0 0 24 24"
                className="relative h-5 w-5 shrink-0"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5.5v13l10-6.5z" />
              </svg>

              <span className="relative">
                Choose Output Size
              </span>

              <svg
                viewBox="0 0 24 24"
                className="relative ml-auto h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>

            {/* Clear image */}
            <button
              type="button"
              onClick={handleClear}
              className="
                hero-action group flex min-h-[52px]
                w-full items-center justify-center gap-2.5
                rounded-xl border border-slate-700/70
                bg-slate-800/30 px-4 py-3
                text-sm font-semibold text-slate-300
                hover:border-red-400/40 hover:bg-red-500/[0.07]
                hover:text-red-300
                focus-visible:outline-2
                focus-visible:outline-offset-2
                focus-visible:outline-cyan-300
              "
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:rotate-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 10v6M14 10v6" />
              </svg>

              Clear Image
            </button>
          </div>

          {/* Status messages */}
          {(error || notice) && (
            <p
              role="status"
              className={`mt-4 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
                error
                  ? "border-red-400/20 bg-red-400/[0.05] text-red-300"
                  : "border-cyan-400/20 bg-cyan-400/[0.05] text-cyan-200"
              }`}
            >
              {error || notice}
            </p>
          )}

          {/* Privacy note */}
          <div className="mt-5 flex items-center gap-2 border-t border-slate-700/40 pt-4">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-emerald-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="10" width="14" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              <path d="m10 15 1.5 1.5L14 14" />
            </svg>

            <span className="text-[11px] leading-relaxed text-slate-500">
              AI-powered image processing · Privacy-conscious workflow
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
