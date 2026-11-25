import { useRef, useState } from 'react';
import {
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Loader2,
} from 'lucide-react';
import { usePlaces } from '../context/PlacesContext.jsx';

export default function DropZone({ onGoToMap }) {
  const {
    places,
    importing,
    importProgress,
    importStage,
    importError,
    importResult,
    importTimelineFiles,
  } = usePlaces();

  const [dragActive, setDragActive] = useState(false);
  const [importMode, setImportMode] = useState('merge');
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = async (rawFiles) => {
    setLocalError(null);
    const allFiles = Array.from(rawFiles || []);
    if (!allFiles.length) return;

    const jsonFiles = allFiles.filter(
      (f) => f.name.toLowerCase().endsWith('.json') || f.type === 'application/json'
    );

    if (jsonFiles.length === 0) {
      setLocalError('Please select one or more .json files exported from Google Maps Timeline.');
      return;
    }

    try {
      await importTimelineFiles(jsonFiles, importMode);
    } catch {
      // handled in context
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (importing) return;
    handleFiles(e.dataTransfer?.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!importing) setDragActive(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const errorMessage = localError || importError;

  return (
    <div className="space-y-4">
      {places.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-moss-900/15 bg-parchment-100/80 p-3.5 dark:border-parchment-200/15 dark:bg-moss-800/80">
          <div>
            <p className="text-sm font-semibold text-moss-900 dark:text-parchment-200">
              Re-import behavior
            </p>
            <p className="font-mono text-xs text-moss-700/80 dark:text-parchment-300/75">
              {places.length.toLocaleString()} places currently archived
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Import mode"
            className="inline-flex rounded-lg border border-moss-900/15 bg-parchment-50 p-0.5 dark:border-parchment-200/15 dark:bg-moss-900"
          >
            <button
              type="button"
              role="radio"
              aria-checked={importMode === 'merge'}
              onClick={() => setImportMode('merge')}
              disabled={importing}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                importMode === 'merge'
                  ? 'bg-moss-900 text-parchment-200 dark:bg-parchment-200 dark:text-moss-900'
                  : 'text-moss-700 hover:text-moss-900 dark:text-parchment-200/75'
              }`}
            >
              Merge cleanly
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={importMode === 'replace'}
              onClick={() => setImportMode('replace')}
              disabled={importing}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                importMode === 'replace'
                  ? 'bg-moss-900 text-parchment-200 dark:bg-parchment-200 dark:text-moss-900'
                  : 'text-moss-700 hover:text-moss-900 dark:text-parchment-200/75'
              }`}
            >
              Replace all
            </button>
          </div>
        </div>
      )}

      <div
        role="button"
        tabIndex={importing ? -1 : 0}
        aria-label="Drop Timeline JSON files or click to browse"
        aria-disabled={importing}
        onClick={() => !importing && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (!importing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${
          dragActive
            ? 'border-brass-500 bg-parchment-200/40 dark:bg-moss-800'
            : 'border-moss-900/25 bg-parchment-100/50 hover:border-brass-500 hover:bg-parchment-100 dark:border-parchment-200/25 dark:bg-moss-800/50 dark:hover:border-brass-400 dark:hover:bg-moss-800/80'
        } ${importing ? 'pointer-events-none opacity-85' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json,application/json"
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-brass-500/35 bg-moss-900 text-parchment-200 dark:bg-parchment-200 dark:text-moss-900">
            {importing ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-6 w-6" aria-hidden="true" />
            )}
          </div>

          <h2 className="font-display text-xl font-semibold text-moss-900 dark:text-parchment-200">
            {importing ? 'Reading archive...' : 'Drop .json files or click to browse'}
          </h2>
        </div>
      </div>

      {importing && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-moss-900/15 bg-parchment-100 p-4 dark:border-parchment-200/15 dark:bg-moss-800"
        >
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="truncate text-moss-900 dark:text-parchment-200">
              {importStage || 'Parsing...'}
            </span>
            <span className="ml-2 shrink-0 font-mono text-brass-600 dark:text-brass-300">
              {importProgress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-moss-900/15 dark:bg-moss-950">
            <div
              className="h-full bg-brass-500 transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {errorMessage && !importing && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-800/30 bg-red-950/10 p-4 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Import failed</p>
            <p className="mt-0.5 text-xs leading-relaxed sm:text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {importResult && !importing && !errorMessage && (
        <div className="rounded-xl border border-brass-500/40 bg-parchment-200/50 p-4 dark:bg-moss-800">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-brass-600 dark:text-brass-300"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-moss-900 dark:text-parchment-200">
                  Imported {importResult.totalVisits.toLocaleString()} visits across{' '}
                  {importResult.totalPlaces.toLocaleString()} places
                  {importResult.distanceKm > 0
                    ? ` · ${importResult.distanceKm.toLocaleString()} km`
                    : ''}
                </p>
                <p className="mt-0.5 font-mono text-xs text-moss-700/80 dark:text-parchment-300/75">
                  {importResult.filesProcessed} file(s) •{' '}
                  {importResult.totalStoredPlaces.toLocaleString()} places saved
                </p>
                {importResult.warnings?.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
                    {importResult.warnings.map((w, idx) => (
                      <li key={idx}>Skipped {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {onGoToMap && (
              <button
                type="button"
                onClick={onGoToMap}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-moss-900 px-4 py-2 text-xs font-semibold text-parchment-200 transition hover:bg-moss-800 dark:bg-parchment-200 dark:text-moss-900"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Open Atlas
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
