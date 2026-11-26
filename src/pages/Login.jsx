import { MapPin, Sun, Moon, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Login() {
  const { signInWithGoogle, signingIn, authError, isFirebaseConfigured } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="atlas-grid-bg relative min-h-screen bg-parchment-50 text-moss-900 dark:bg-moss-900 dark:text-parchment-200">
      {/* Top editorial bar */}
      <header className="border-b border-moss-900/15 bg-parchment-50/90 backdrop-blur-sm dark:border-parchment-200/15 dark:bg-moss-900/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-brass-500/40 bg-moss-900 text-parchment-200 dark:bg-parchment-200 dark:text-moss-900">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Timeline Pins
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-moss-700/80 dark:text-parchment-300/75 sm:inline">
              Local JSON · Private Atlas
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-moss-900/20 bg-parchment-100 text-moss-900 transition hover:bg-parchment-200/60 dark:border-parchment-200/20 dark:bg-moss-800 dark:text-parchment-200 dark:hover:bg-moss-700"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:items-center lg:py-20">
        {/* Left column: Broadsheet copy & Google auth */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 border-b border-brass-500 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-600 dark:text-brass-300">
            Personal Cartographic Archive
          </div>

          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.06] tracking-tight text-moss-900 dark:text-parchment-200 sm:text-5xl lg:text-[3.4rem]">
            Turn years of Google Timeline exports into a quiet, private map.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-moss-800/85 dark:text-parchment-200/80 sm:text-lg">
            Drop your on-device <code className="font-mono text-sm">Timeline.json</code> or
            Takeout history. See every visited place, distance traveled, and year-by-year
            density — parsed in your browser without exposing raw routes.
          </p>

          {!isFirebaseConfigured && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-brass-500 bg-parchment-200/60 p-4 text-sm text-moss-900 dark:bg-moss-800 dark:text-parchment-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-brass-600 dark:text-brass-300" aria-hidden="true" />
              <div>
                <p className="font-semibold">Firebase configuration needed</p>
                <p className="mt-0.5 text-xs leading-relaxed">
                  Copy <code className="font-mono">.env.example</code> to{' '}
                  <code className="font-mono">.env</code> and add your{' '}
                  <code className="font-mono">VITE_FIREBASE_*</code> project values.
                </p>
              </div>
            </div>
          )}

          {authError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-800/30 bg-red-950/10 px-4 py-3 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200"
            >
              {authError}
            </div>
          )}

          <div className="mt-8 flex flex-col items-start gap-3">
            <button
              type="button"
              disabled={signingIn}
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-3 rounded-lg border border-moss-900 bg-moss-900 px-6 py-3.5 text-sm font-semibold text-parchment-200 shadow-atlas transition hover:bg-moss-800 disabled:opacity-60 dark:border-parchment-200 dark:bg-parchment-200 dark:text-moss-900 dark:hover:bg-parchment-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.94 0 3.51.68 4.74 1.8l3.52-3.52C18.14 1.36 15.32.25 12 .25 7.31.25 3.26 2.94 1.29 6.86l4.11 3.19C6.39 7.12 8.97 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.87 3c2.26-2.09 3.55-5.17 3.55-8.82z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.4 14.95A7.19 7.19 0 0 1 5.02 12c0-1.02.18-2.01.38-2.95L1.29 5.86A11.73 11.73 0 0 0 .25 12c0 2.02.49 3.93 1.35 5.63l3.8-2.68z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.75c3.24 0 5.95-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.03 0-5.61-2.08-6.6-4.96l-3.8 2.68C3.57 21.06 7.46 23.75 12 23.75z"
                />
              </svg>
              {signingIn ? 'Signing in...' : 'Continue with Google'}
            </button>

            <p className="text-xs text-moss-700/80 dark:text-parchment-300/75">
              Sign-in only identifies your account — files parse locally in your browser and raw
              exports are never uploaded.
            </p>
          </div>
        </div>

        {/* Right column: Bespoke Cartographic Plate */}
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-xl border border-moss-900/20 bg-parchment-100 shadow-atlas dark:border-parchment-200/20 dark:bg-moss-800 dark:shadow-atlas-dark">
            {/* Topographic SVG engraving */}
            <div className="relative h-52 overflow-hidden border-b border-moss-900/15 bg-moss-900 p-5 text-parchment-200 dark:border-parchment-200/15 dark:bg-moss-950">
              <svg
                aria-hidden="true"
                viewBox="0 0 400 200"
                className="absolute inset-0 h-full w-full opacity-30"
                fill="none"
              >
                <path
                  d="M-20 160 C 60 110, 140 190, 220 130 C 300 70, 350 130, 420 90"
                  stroke="#9a7e3b"
                  strokeWidth="1.2"
                />
                <path
                  d="M-20 130 C 70 80, 150 150, 230 95 C 310 40, 360 100, 420 60"
                  stroke="#d2cf9a"
                  strokeWidth="0.9"
                />
                <path
                  d="M-20 95 C 80 50, 160 115, 240 65 C 320 15, 370 70, 420 30"
                  stroke="#9a7e3b"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                />
                <circle cx="118" cy="112" r="5" fill="#9a7e3b" stroke="#d2cf9a" strokeWidth="2" />
                <circle cx="242" cy="74" r="7" fill="#d2cf9a" stroke="#9a7e3b" strokeWidth="2" />
                <circle cx="315" cy="96" r="4" fill="#9a7e3b" stroke="#d2cf9a" strokeWidth="1.5" />
                <path d="M118 112 Q 180 75 242 74 T 315 96" stroke="#d2cf9a" strokeWidth="1.2" strokeDasharray="3 3" />
              </svg>

              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-parchment-200/80">
                  <span>Sheet 01 · Meridian Grid</span>
                  <span className="text-brass-300">4-Decimal Dedup</span>
                </div>
                <div>
                  <p className="font-mono text-[11px] text-brass-300">
                    37.7749° N, 122.4194° W
                  </p>
                  <p className="font-display text-xl font-semibold text-parchment-200">
                    Every visit, distilled.
                  </p>
                </div>
              </div>
            </div>

            {/* Plate spec rows */}
            <div className="divide-y divide-moss-900/15 dark:divide-parchment-200/15">
              <div className="flex items-center justify-between px-5 py-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-moss-700 dark:text-parchment-300/75">
                  Supported Exports
                </span>
                <span className="font-mono text-xs font-semibold text-moss-900 dark:text-parchment-200">
                  Timeline.json · Takeout
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-moss-700 dark:text-parchment-300/75">
                  Parsing Engine
                </span>
                <span className="font-mono text-xs font-semibold text-moss-900 dark:text-parchment-200">
                  Web Worker (50 MB+)
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-moss-700 dark:text-parchment-300/75">
                  Saved Telemetry
                </span>
                <span className="font-mono text-xs font-semibold text-brass-600 dark:text-brass-300">
                  Pins · Visits · km
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
