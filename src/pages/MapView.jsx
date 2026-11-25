import { useState } from 'react';
import { Upload, MapPin } from 'lucide-react';
import { usePlaces } from '../context/PlacesContext.jsx';
import Map from '../components/Map.jsx';
import FilterPanel from '../components/FilterPanel.jsx';

export default function MapView({ onGoToImport, focusedPlace }) {
  const { places, filteredPlaces, loading, error, viewMode, removePlace } = usePlaces();
  const [zoomTrigger, setZoomTrigger] = useState(0);

  return (
    <main className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <Map
        places={filteredPlaces}
        viewMode={viewMode}
        zoomTrigger={zoomTrigger}
        focusedPlace={focusedPlace}
        onDeletePlace={removePlace}
      />

      <FilterPanel onZoomAll={() => setZoomTrigger((n) => n + 1)} />

      {loading && (
        <div className="pointer-events-none absolute inset-0 z-[950] flex items-center justify-center bg-moss-950/20 backdrop-blur-[2px]">
          <div className="atlas-panel w-72 space-y-3 rounded-xl p-5 shadow-atlas dark:shadow-atlas-dark">
            <div className="h-4 w-32 animate-pulse rounded bg-parchment-200 dark:bg-moss-700" />
            <div className="h-3 w-48 animate-pulse rounded bg-parchment-200/70 dark:bg-moss-800" />
            <div className="h-2.5 w-full animate-pulse rounded bg-parchment-200/70 dark:bg-moss-800" />
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-[950] flex justify-center">
          <div
            role="alert"
            className="pointer-events-auto rounded-lg border border-red-800/30 bg-parchment-50 px-4 py-2.5 text-xs font-medium text-red-900 shadow-lg dark:border-red-400/30 dark:bg-moss-900 dark:text-red-200"
          >
            {error}
          </div>
        </div>
      )}

      {!loading && !error && places.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[850] flex items-center justify-center p-4">
          <div className="atlas-panel pointer-events-auto max-w-sm rounded-xl p-6 text-center shadow-atlas dark:shadow-atlas-dark">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-brass-500/40 bg-moss-900 text-parchment-200 dark:bg-parchment-200 dark:text-moss-900">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="font-display text-xl font-semibold text-moss-900 dark:text-parchment-200">
              Your atlas is empty
            </h1>
            <p className="mt-1.5 text-sm text-moss-700 dark:text-parchment-200/80">
              Import your exported <code className="font-mono text-xs">Timeline.json</code> or
              Takeout Semantic Location History files to plot your visits.
            </p>
            <button
              type="button"
              onClick={onGoToImport}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brass-500 px-5 py-2.5 text-xs font-semibold text-parchment-50 transition hover:bg-brass-600"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Import Timeline JSON
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
