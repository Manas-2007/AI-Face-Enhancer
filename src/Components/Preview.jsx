const models = [

  {

    id: "codeformer",

    name: "CodeFormer",

    color: "#38aaff",

    softColor: "rgba(56, 170, 255, 0.10)",

  },

  {

    id: "restoreformer",

    name: "RestoreFormer++",

    color: "#24ddb0",

    softColor: "rgba(36, 221, 176, 0.10)",

  },

  {

    id: "sparnethd",

    name: "SPARNetHD",

    color: "#ffad42",

    softColor: "rgba(255, 173, 66, 0.10)",

  },

  {

    id: "rgformer",

    name: "RGFormer",

    color: "#ec67e5",

    softColor: "rgba(236, 103, 229, 0.10)",

  },
  {
    id: "fsrnet",
    name: "FSRNet",
    color: "#a78bfa",
    softColor: "rgba(167, 139, 250, 0.10)",
  },

];

function ModelIcon({ color }) {

  return (

    <svg

      viewBox="0 0 24 24"

      className="h-4 w-4"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.8"

      strokeLinecap="round"

      strokeLinejoin="round"

      aria-hidden="true"

      style={{ color }}

    >

      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />

      <circle cx="9" cy="10" r="1" />

      <circle cx="15" cy="10" r="1" />

      <path d="M8.5 15q3.5 3 7 0" />

    </svg>

  );

}

function ImagePlaceholder({ original = false }) {

  return (

    <div className="flex h-full min-h-[190px] w-full flex-col items-center justify-center bg-gradient-to-br from-[#071a31] via-[#041124] to-[#030b18] p-4 text-center sm:min-h-[220px] xl:min-h-0">

      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/[0.06] text-blue-300 shadow-[0_0_25px_rgba(56,170,255,0.08)]">

        <svg

          viewBox="0 0 24 24"

          className="h-7 w-7"

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

      <p className="text-sm font-medium text-slate-300">

        {original ? "Upload your photo" : "No output yet"}

      </p>

      <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-slate-500">

        {original

          ? "Your complete image will appear here."

          : "Generate this model's result to preview it here."}

      </p>

    </div>

  );

}

function ImageViewport({

  src,

  alt,

  original = false,

  processing = false,

  color = "#38aaff",

}) {

  return (

    <div className="relative isolate h-[245px] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#020914] sm:h-[270px] lg:h-[290px] xl:h-[205px] 2xl:h-[235px]">

      {/* Subtle background glow */}

      <div

        className="pointer-events-none absolute inset-0 -z-10 opacity-50"

        style={{

          background: `radial-gradient(ellipse at center, ${color}12, transparent 75%)`,

        }}

      />

      {src ? (

        <img

          src={src}

          alt={alt}

          loading="lazy"

          draggable="false"

          className="block h-full w-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-[1.015]"

        />

      ) : (

        <ImagePlaceholder original={original} />

      )}

      {/* Original image badge */}

      {original && src && (

        <span className="absolute left-2.5 top-2.5 rounded-md border border-white/10 bg-[#030b1a]/80 px-2 py-1 text-[10px] font-medium text-slate-200 backdrop-blur-md">

          ORIGINAL

        </span>

      )}

      {/* Processing overlay */}

      {processing && (

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#030b1a]/80 backdrop-blur-sm">

          <svg

            viewBox="0 0 24 24"

            className="h-8 w-8 animate-spin text-cyan-300"

            fill="none"

            aria-hidden="true"

          >

            <circle

              cx="12"

              cy="12"

              r="9"

              stroke="currentColor"

              strokeWidth="3"

              opacity=".2"

            />

            <path

              d="M21 12a9 9 0 0 0-9-9"

              stroke="currentColor"

              strokeWidth="3"

              strokeLinecap="round"

            />

          </svg>

          <span className="text-sm font-medium text-slate-200">

            Processing image...

          </span>

        </div>

      )}

      {/* Actual output status */}

      {!original && src && !processing && (

        <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-[#031b18]/90 px-2.5 py-1 text-[10px] font-medium text-emerald-300 backdrop-blur-md">

          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

          Output ready

        </span>

      )}

    </div>

  );

}

function DownloadIcon() {

  return (

    <svg

      viewBox="0 0 24 24"

      className="h-4 w-4 shrink-0"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.8"

      strokeLinecap="round"

      strokeLinejoin="round"

      aria-hidden="true"

    >

      <path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4" />

    </svg>

  );

}

function getResultData(result) {

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

function formatTime(time) {

  if (time == null || time === "") return "—";

  if (typeof time === "number") {

    return `${time.toFixed(2)} s`;

  }

  return /s$/i.test(String(time).trim())

    ? String(time)

    : `${time} s`;

}

export default function Preview({

  selectedImage,

  results = {},

  processing = {},

  onDownload,

}) {

  const originalSrc = selectedImage?.preview || null;

 const downloadResult = async (model, src) => {

  if (!src || !selectedImage?.file) return;

  try {

    const image = new Image();

    image.src = src;

    await new Promise((resolve, reject) => {

      image.onload = resolve;

      image.onerror = reject;

    });

    const canvas = document.createElement("canvas");

    canvas.width = image.naturalWidth;

    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");

    if (!context) throw new Error("Could not convert image.");

    context.drawImage(image, 0, 0);

    const jpgBlob = await new Promise((resolve) => {

      canvas.toBlob(resolve, "image/jpeg", 0.95);

    });

    if (!jpgBlob) throw new Error("JPG conversion failed.");

    const downloadUrl = URL.createObjectURL(jpgBlob);

    const link = document.createElement("a");

    const originalName = selectedImage.file.name;

    const baseName =

      originalName.replace(/\.[^.]+$/, "") || "enhanced-image";

    link.href = downloadUrl;

    link.download = selectedImage.file.name;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

  } catch (error) {

    console.error("Image download failed:", error);

  }

};

  return (

    <section className="w-full px-4 pb-8 pt-2 sm:px-5 lg:px-7">

      <div className="overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-br from-[#07182e] via-[#041226] to-[#030b18] p-3 shadow-[0_10px_35px_rgba(0,0,0,0.15)] sm:p-4 lg:p-5">

        {/* SECTION HEADING */}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">

          <div className="flex min-w-0 items-center gap-3">

            {/* Blue-to-white accent line */}

            <span className="h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-cyan-300 via-blue-400 to-white shadow-[0_0_12px_rgba(56,170,255,0.35)]" />

            <div className="min-w-0">

              <h2 className="text-lg font-bold tracking-tight text-slate-100 sm:text-xl">

                Image Preview

              </h2>

              <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-[13px]">

                Compare the original photo with each AI-generated result.

              </p>

            </div>

          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/[0.06] px-3 py-2">

            <span

              className={`h-2 w-2 rounded-full ${

                originalSrc ? "bg-emerald-400" : "bg-slate-500"

              }`}

            />

            <span className="text-[10px] font-medium text-slate-300 sm:text-xs">

              {originalSrc ? "Image Loaded" : "Waiting for Image"}

            </span>

          </div>

        </div>

        {/* IMAGE CARDS */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1.3fr_repeat(5,minmax(0,1fr))]">

          {/* ORIGINAL */}

          <article className="group flex min-w-0 flex-col rounded-xl border border-blue-400/40 bg-gradient-to-b from-[#0a1b33] to-[#030d1c] p-3 transition-all duration-300 hover:border-blue-300/70 hover:shadow-[0_0_22px_rgba(56,170,255,0.08)] sm:p-3.5">

            <div className="mb-3 flex items-center justify-between gap-2">

              <h3 className="text-sm font-semibold text-slate-100">

                Original Image

              </h3>

              <span className="rounded-md border border-blue-400/20 bg-blue-400/[0.07] px-2 py-1 text-[9px] font-medium text-blue-200">

                SOURCE

              </span>

            </div>

            <ImageViewport

              src={originalSrc}

              alt="Original uploaded photo"

              original

              color="#38aaff"

            />

            <p

              className="mt-3 truncate text-xs text-slate-400"

              title={selectedImage?.file?.name || ""}

            >

              {selectedImage?.file?.name || "No image selected"}

            </p>

          </article>

          {/* MODEL OUTPUTS */}

          {models.map((model) => {

            const { src, time } = getResultData(results?.[model.id]);

            const isProcessing = Boolean(processing?.[model.id]);

            return (

              <article

                key={model.id}

                className="group flex min-w-0 flex-col rounded-xl border bg-gradient-to-b from-[#09192d] to-[#030d1c] p-3 transition-all duration-300 hover:-translate-y-0.5 sm:p-3.5"

                style={{

                  borderColor: `${model.color}65`,

                }}

                onMouseEnter={(event) => {

                  event.currentTarget.style.boxShadow =

                    `0 8px 24px ${model.color}12`;

                }}

                onMouseLeave={(event) => {

                  event.currentTarget.style.boxShadow = "none";

                }}

              >

                {/* Model name */}

                <div className="mb-3 flex min-h-6 min-w-0 items-center gap-2">

                  <span

                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"

                    style={{

                      color: model.color,

                      backgroundColor: model.softColor,

                      borderColor: `${model.color}45`,

                    }}

                  >

                    <ModelIcon color={model.color} />

                  </span>

                  <h3

                    className="min-w-0 break-words text-xs font-semibold leading-snug sm:text-[13px]"

                    style={{ color: model.color }}

                  >

                    {model.name}

                  </h3>

                </div>

                {/* Full image, without cropping */}

                <ImageViewport

                  src={src}

                  alt={`${model.name} enhanced photo`}

                  processing={isProcessing}

                  color={model.color}

                />

                {/* Download */}

                <button

                  type="button"

                  disabled={!src || isProcessing}

                  onClick={() => downloadResult(model, src)}

                  className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700/60 disabled:bg-slate-800/50 disabled:text-slate-500"

                  style={

                    src

                      ? {

                          background: `linear-gradient(100deg, ${model.color}, ${model.color}d0)`,

                          borderColor: `${model.color}90`,

                          color: "#04101e",

                        }

                      : undefined

                  }

                >

                  <DownloadIcon />

                  Download Image

                </button>

                {/* Real processing time only */}

                <div className="mt-3 flex items-center gap-2 border-t border-slate-700/50 pt-3">

                  <svg

                    viewBox="0 0 24 24"

                    className="h-4 w-4 shrink-0 text-slate-400"

                    fill="none"

                    stroke="currentColor"

                    strokeWidth="1.6"

                    strokeLinecap="round"

                    strokeLinejoin="round"

                    aria-hidden="true"

                  >

                    <circle cx="12" cy="12" r="9" />

                    <path d="M12 7v5l3 2" />

                  </svg>

                  <div className="min-w-0">

                    <p className="text-[10px] text-slate-500">

                      Processing Time

                    </p>

                    <p className="mt-0.5 text-sm font-semibold text-slate-200">

                      {isProcessing ? "Running..." : formatTime(time)}

                    </p>

                  </div>

                </div>

              </article>

            );

          })}

        </div>

      </div>

    </section>

  );

}
