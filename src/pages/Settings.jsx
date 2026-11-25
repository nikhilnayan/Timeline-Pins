import { useState } from 'react';
import {
  Trash2,
  Shield,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Square,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { usePlaces } from '../context/PlacesContext.jsx';

export default function Settings() {
  const { user, logout } = useAuth();
  const { preference, setThemePreference } = useTheme();
  const {
    places,
    unnamedCount,
    geocoding,
    geocodeError,
    geocodeProgress,
    googleMapsKey,
    updateGoogleMapsKey,
    startGeocoding,
    stopGeocoding,
    clearAllData,
  } = usePlaces();

  const [keyInput, setKeyInput] = useState(googleMapsKey || '');
  const [keySaved, setKeySaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletedBanner, setDeletedBanner] = useState(false);

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await clearAllData();
      setConfirmDelete(false);
      setDeletedBanner(true);
    } finally {
      setDeleting(false);
    }
  };

  const themeOptions = [
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'light', label: 'Parchment', icon: Sun },
    { id: 'dark', label: 'Moss', icon: Moon },
  ];

  return (
    <main className="atlas-grid-bg min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="border-b border-moss-900/15 pb-4 dark:border-parchment-200/15">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-600 dark:text-brass-300">
            Preferences
          </span>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-moss-900 dark:text-parchment-200">
            Settings
          </h1>
        </div>

        {/* Account */}
        <section className="rounded-xl border border-moss-900/15 bg-parchment-100/80 p-5 dark:border-parchment-200/15 dark:bg-moss-800/80">
          <h2 className="font-display text-base font-semibold text-moss-900 dark:text-parchment-200">
            Account
          </h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  className="h-10 w-10 rounded-full border border-moss-900/20 dark:border-parchment-200/25"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-moss-900 dark:text-parchment-200">
                  {user?.displayName || 'Signed-in Google User'}
                </p>
                <p className="font-mono text-xs text-moss-700/80 dark:text-parchment-300/75">
                  {user?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-moss-900/20 bg-parchment-50 px-3.5 py-2 text-xs font-semibold text-moss-900 transition hover:bg-parchment-200/50 dark:border-parchment-200/20 dark:bg-moss-900 dark:text-parchment-200 dark:hover:bg-moss-700"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </section>

        {/* Theme */}
        <section className="rounded-xl border border-moss-900/15 bg-parchment-100/80 p-5 dark:border-parchment-200/15 dark:bg-moss-800/80">
          <h2 className="font-display text-base font-semibold text-moss-900 dark:text-parchment-200">
            Atlas Palette
          </h2>
          <p className="mt-1 text-xs text-moss-700/80 dark:text-parchment-300/75">
            Switch between warm parchment light mode and deep moss dark mode.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {themeOptions.map(({ id, label, icon: Icon }) => {
              const active = preference === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setThemePreference(id)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                    active
                      ? 'border-brass-500 bg-moss-900 text-parchment-200 dark:bg-parchment-200 dark:text-moss-900'
                      : 'border-moss-900/15 bg-parchment-50 text-moss-800 hover:bg-parchment-200/40 dark:border-parchment-200/15 dark:bg-moss-900 dark:text-parchment-200/80 dark:hover:bg-moss-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Reverse Geocoding */}
        <section className="rounded-xl border border-moss-900/15 bg-parchment-100/80 p-5 dark:border-parchment-200/15 dark:bg-moss-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-moss-900 dark:text-parchment-200">
              Place Naming
            </h2>
            <span className="rounded bg-brass-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-brass-700 dark:text-parchment-200">
              {googleMapsKey ? 'Google Maps (Fast)' : 'Nominatim (1 req/s)'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-moss-700/85 dark:text-parchment-300/80">
            Optional Google Maps API key (with <strong>Maps JavaScript API</strong> &amp;{' '}
            <strong>Geocoding API</strong> enabled in Google Cloud) speeds up naming ~25x.
            Without a key, OpenStreetMap Nominatim runs at 1 req/sec starting with your most
            visited places and auto-saves every 15 places.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setKeySaved(false);
              }}
              placeholder="Optional Google Maps API key (AIza...)"
              aria-label="Google Maps API key"
              className="flex-1 rounded-lg border border-moss-900/20 bg-parchment-50 px-3 py-2 font-mono text-xs text-moss-900 placeholder:text-moss-700/50 dark:border-parchment-200/20 dark:bg-moss-900 dark:text-parchment-200"
            />
            <button
              type="button"
              onClick={() => {
                updateGoogleMapsKey(keyInput);
                setKeySaved(true);
              }}
              className="rounded-lg border border-moss-900/20 bg-parchment-50 px-3.5 py-2 text-xs font-semibold text-moss-900 transition hover:bg-parchment-200/50 dark:border-parchment-200/20 dark:bg-moss-900 dark:text-parchment-200"
            >
              {keySaved ? 'Saved' : 'Save key'}
            </button>
          </div>

          {geocodeError && (
            <p className="mt-3 rounded-lg border border-red-800/30 bg-red-950/10 px-3 py-2 text-xs text-red-900 dark:border-red-400/30 dark:text-red-200">
              {geocodeError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {!geocoding ? (
              <>
                <button
                  type="button"
                  onClick={() => startGeocoding()}
                  disabled={unnamedCount === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-brass-500 px-4 py-2 text-xs font-semibold text-parchment-50 transition hover:bg-brass-600 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {unnamedCount > 0
                    ? `Name all places (${unnamedCount})`
                    : 'All places have names'}
                </button>
                {unnamedCount > 50 && !googleMapsKey && (
                  <button
                    type="button"
                    onClick={() => startGeocoding(50)}
                    className="inline-flex items-center gap-2 rounded-lg border border-moss-900/20 bg-parchment-50 px-4 py-2 text-xs font-semibold text-moss-900 transition hover:bg-parchment-200/50 dark:border-parchment-200/20 dark:bg-moss-900 dark:text-parchment-200"
                  >
                    Quick name top 50 (~55s)
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={stopGeocoding}
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-800"
              >
                <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                Stop naming ({geocodeProgress.done}/{geocodeProgress.total})
              </button>
            )}
          </div>
        </section>

        {/* Privacy & Delete all data */}
        <section className="rounded-xl border border-moss-900/15 bg-parchment-100/80 p-5 dark:border-parchment-200/15 dark:bg-moss-800/80">
          <div className="flex items-start gap-2.5">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-brass-600 dark:text-brass-300" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-semibold text-moss-900 dark:text-parchment-200">
                Privacy &amp; Data
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-moss-700/85 dark:text-parchment-300/80">
                Raw Timeline files never leave your browser. Only aggregated place pins (
                {places.length.toLocaleString()} stored) and distance totals are saved under your
                private Firestore user path.
              </p>
            </div>
          </div>

          {deletedBanner && (
            <p className="mt-4 rounded-lg border border-brass-500/40 bg-parchment-200/50 px-3 py-2 text-xs font-medium text-moss-900 dark:bg-moss-900 dark:text-parchment-200">
              All saved places and distance totals have been permanently deleted.
            </p>
          )}

          <div className="mt-5 border-t border-moss-900/15 pt-4 dark:border-parchment-200/15">
            {!confirmDelete ? (
              <button
                type="button"
                disabled={places.length === 0 || deleting}
                onClick={() => {
                  setDeletedBanner(false);
                  setConfirmDelete(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-red-800/30 bg-red-950/10 px-4 py-2 text-xs font-semibold text-red-900 transition hover:bg-red-950/20 disabled:opacity-45 dark:border-red-400/30 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-950/60"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete all my data
              </button>
            ) : (
              <div className="rounded-lg border border-red-800/40 bg-red-950/10 p-3.5 dark:border-red-400/35 dark:bg-red-950/40">
                <div className="flex items-start gap-2 text-xs text-red-900 dark:text-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    This permanently deletes all{' '}
                    <strong>{places.length.toLocaleString()}</strong> saved places from your
                    account.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteAll}
                    className="rounded-md bg-red-700 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete everything'}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md border border-moss-900/20 bg-parchment-50 px-3.5 py-1.5 text-xs font-semibold text-moss-900 dark:border-parchment-200/20 dark:bg-moss-900 dark:text-parchment-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
