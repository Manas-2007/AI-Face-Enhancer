export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-400/20 bg-[#030b1a]/95 shadow-[0_4px_24px_rgba(0,0,0,0.2)] backdrop-blur-xl">

      <style>{`
        @keyframes navbarGlow {
          0%, 100% {
            opacity: .55;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes navbarShine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .navbar-logo {
          transition:
            transform .3s ease,
            filter .3s ease;
        }

        .navbar-brand:hover .navbar-logo {
          transform: scale(1.05);
          filter: drop-shadow(0 0 9px rgba(56,189,248,.65));
        }

        .navbar-control {
          transition:
            background-color .25s ease,
            border-color .25s ease,
            color .25s ease,
            transform .25s ease,
            box-shadow .25s ease;
        }

        .navbar-control:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 16px rgba(56,189,248,.10);
        }

        .navbar-bottom-line {
          animation: navbarGlow 4s ease-in-out infinite;
        }

        .navbar-badge:hover .navbar-badge-shine {
          animation: navbarShine .8s ease forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .navbar-logo,
          .navbar-control,
          .navbar-bottom-line,
          .navbar-badge-shine {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* Main Navbar */}
      <div className="flex min-h-[66px] w-full items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">

        {/* LEFT: LOGO + BRAND */}
        <div className="navbar-brand flex min-w-0 items-center gap-3 sm:gap-3.5">

          {/* Animated Logo */}
          <div className="navbar-logo shrink-0">
            <svg
              viewBox="0 0 44 44"
              className="h-10 w-10 sm:h-11 sm:w-11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="AI Face Enhancer logo"
            >
              <defs>
                <linearGradient
                  id="navbarLogoGradient"
                  x1="2"
                  y1="2"
                  x2="42"
                  y2="42"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="55%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>

              {/* Outer frame */}
              <rect
                x="3"
                y="3"
                width="38"
                height="38"
                rx="11"
                fill="#07182e"
                stroke="url(#navbarLogoGradient)"
                strokeWidth="1.8"
              />

              {/* Inner frame */}
              <rect
                x="8"
                y="8"
                width="28"
                height="28"
                rx="8"
                stroke="#38bdf8"
                strokeWidth="1"
                opacity=".65"
              />

              {/* Face outline */}
              <path
                d="M14 17 Q22 10 30 17 V24 Q22 33 14 24 Z"
                stroke="#67e8f9"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />

              {/* Eyes */}
              <circle cx="18.5" cy="20" r="1.5" fill="#67e8f9" />
              <circle cx="25.5" cy="20" r="1.5" fill="#67e8f9" />

              {/* Smile */}
              <path
                d="M18.5 25 Q22 28 25.5 25"
                stroke="#67e8f9"
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              {/* Corner details */}
              <path
                d="M22 5.5V8 M22 36V38.5 M5.5 22H8 M36 22H38.5"
                stroke="#60a5fa"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Brand Name */}
          <div className="flex min-w-0 flex-col justify-center">

            <h1 className="whitespace-nowrap text-[16px] font-bold leading-tight tracking-[-0.35px] text-slate-100 sm:text-[18px]">
              AI Face Enhancer
            </h1>

            {/* Tagline */}
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-slate-400 sm:gap-2 sm:text-[11px]">

              <span className="cursor-default transition-colors duration-200 hover:text-cyan-300">
                Restore
              </span>

              <span className="text-blue-400/80">·</span>

              <span className="cursor-default transition-colors duration-200 hover:text-cyan-300">
                Enhance
              </span>

              <span className="text-blue-400/80">·</span>

              <span className="cursor-default transition-colors duration-200 hover:text-cyan-300">
                Compare
              </span>

            </div>
          </div>
        </div>

        {/* RIGHT: STATUS + ACTIONS */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">

          {/* Local Processing Badge */}
          <div className="navbar-badge relative flex h-[34px] items-center gap-2 overflow-hidden rounded-full border border-blue-400/25 bg-gradient-to-r from-blue-500/[0.10] to-cyan-400/[0.04] px-2.5 sm:px-3.5">

            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />

              <span className="relative h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            </span>

            <span className="whitespace-nowrap text-[10px] font-medium tracking-wide text-slate-300 sm:text-[11px]">
              <span className="sm:hidden">Local</span>
              <span className="hidden sm:inline">Local Processing</span>
            </span>

            <span className="navbar-badge-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          </div>

          {/* Settings Button */}
          <button
            type="button"
            aria-label="Settings"
            title="Settings"
            className="navbar-control flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full border border-slate-700/70 bg-slate-800/40 text-slate-400 hover:border-cyan-400/50 hover:bg-cyan-400/[0.08] hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:h-[37px] sm:w-[37px]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[17px] w-[17px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />

              <path d="m19.4 15 .05.05a1.8 1.8 0 0 1-2.55 2.55l-.05-.05a1.8 1.8 0 0 0-3.07 1.27v.13a1.8 1.8 0 0 1-3.6 0v-.08a1.8 1.8 0 0 0-3.07-1.27l-.05.05a1.8 1.8 0 1 1-2.55-2.55l.05-.05a1.8 1.8 0 0 0-1.27-3.07H3.2a1.8 1.8 0 0 1 0-3.6h.08a1.8 1.8 0 0 0 1.27-3.07L4.5 5.2A1.8 1.8 0 0 1 7.05 2.65l.05.05a1.8 1.8 0 0 0 3.07-1.27V1.3a1.8 1.8 0 0 1 3.6 0v.08a1.8 1.8 0 0 0 3.07 1.27l.05-.05a1.8 1.8 0 1 1 2.55 2.55l-.05.05a1.8 1.8 0 0 0 1.27 3.07h.13a1.8 1.8 0 0 1 0 3.6h-.08A1.8 1.8 0 0 0 19.4 15Z" transform="translate(0 1.5) scale(.88)" />
            </svg>
          </button>

          {/* Theme Button */}
          <button
            type="button"
            aria-label="Theme settings"
            title="Theme settings"
            className="navbar-control group flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full border border-slate-700/70 bg-slate-800/40 text-slate-400 hover:border-cyan-400/50 hover:bg-cyan-400/[0.08] hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:h-[37px] sm:w-[37px]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[17px] w-[17px] transition-transform duration-500 group-hover:rotate-45"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />

              <path d="M12 2v2.2 M12 19.8V22 M4.93 4.93l1.56 1.56 M17.51 17.51l1.56 1.56 M2 12h2.2 M19.8 12H22 M4.93 19.07l1.56-1.56 M17.51 6.49l1.56-1.56" />
            </svg>
          </button>

        </div>
      </div>

      {/* Subtle animated bottom accent */}
      <div className="relative h-px w-full overflow-hidden bg-blue-500/[0.10]">
        <div className="navbar-bottom-line h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      </div>

    </header>
  );
}