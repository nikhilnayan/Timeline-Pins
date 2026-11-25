import { useState } from 'react';
import {
  MapPin,
  Flame,
  Maximize2,
  Sparkles,
  Square,
  Compass,
  ChevronUp,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { usePlaces } from '../context/PlacesContext.jsx';
import StatsCards from './StatsCards.jsx';

export default function FilterPanel({ onZoomAll }) {
  const {
    places,
    filteredPlaces,
    viewMode,
    setViewMode,
    selectedYear,
    setSelectedYear,
    minVisits,
    setMinVisits,
    availableYears,
    maxVisitCount,
    unnamedCount,
    geocoding,
    geocodeError,
    geocodeProgress,
    googleMapsKey,
    startGeocoding,
    stopGeocoding,
  } = usePlaces();

  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const controlsBody = (
    <div className="space-y-3.5">
      <StatsCards />

      {/* Pins vs Heatmap segmented control (darker shade for selected option) */}
      <div>
        <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-moss-700 dark:text-parchment-300/80">
          Map View Mode
        </span>
        <div
          role="radiogroup"
          aria-label="Map layer mode"
          className="grid grid-cols-2 gap-1 rounded-lg border border-moss-900/15 bg-parchment-200/55 p-1 dark:border-parchment-200/15 dark:bg-moss-800"
        >
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === 'pins'}
            onClick={() => setViewMode('pins')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
              viewMode === 'pins'
                ? 'bg-moss-950 text-parchment-200 shadow-inner ring-1 ring-moss-900 dark:bg-moss-950 dark:text-parchment-200 dark:ring-brass-500/60'
                : 'text-moss-800/75 hover:bg-moss-900/10 hover:text-moss-900 dark:text-parchment-200/65 dark:hover:bg-moss-900/50 dark:hover:text-parchment-200'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Pins
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === 'heatmap'}
            onClick={() => setViewMode('heatmap')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
              viewMode === 'heatmap'
                ? 'bg-moss-950 text-parchment-200 shadow-inner ring-1 ring-moss-900 dark:bg-moss-950 dark:text-parchment-200 dark:ring-brass-500/60'
                : 'text-moss-800/75 hover:bg-moss-900/10 hover:text-moss-900 dark:text-parchment-200/65 dark:hover:bg-moss-900/50 dark:hover:text-parchment-200'
            }`}
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            Heatmap
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-lg border border-moss-900/15 bg-parchment-100/75 p-3 dark:border-parchment-200/15 dark:bg-moss-800/70">
        <div>
          <label
            htmlFor="year-filter"
            className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-moss-700 dark:text-parchment-300/80"
          >
            Filter Year
          </label>
          <select
            id="year-filter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full rounded-md border border-moss-900/20 bg-parchment-50 px-2.5 py-1.5 text-xs font-medium text-moss-900 dark:border-parchment-200/20 dark:bg-moss-900 dark:text-parchment-200"
          >
            <option value="all">All years ({places.length} places)</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="min-visits-slider"
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-moss-700 dark:text-parchment-300/80"
            >
              Min Visits
            </label>
            <span className="rounded bg-brass-500/20 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brass-700 dark:text-parchment-200">
              {minVisits}+
            </span>
          </div>
          <input
            id="min-visits-slider"
            type="range"
            min={1}
            max={Math.max(1, maxVisitCount)}
            value={Math.min(minVisits, Math.max(1, maxVisitCount))}
            onChange={(e) => setMinVisits(Number(e.target.value))}
            disabled={maxVisitCount <= 1}
            className="w-full accent-brass-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onZoomAll}
          disabled={!filteredPlaces.length}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-moss-900/20 bg-parchment-50 px-3 py-2 text-xs font-semibold text-moss-900 transition hover:bg-parchment-100 disabled:opacity-45 dark:border-parchment-200/20 dark:bg-moss-800 dark:text-parchment-200 dark:hover:bg-moss-700"
        >
          <Maximize2 className="h-3.5 w-3.5 text-brass-600 dark:text-brass-300" aria-hidden="true" />
          Zoom to all pins
        </button>

        {unnamedCount > 0 && !geocoding && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => startGeocoding()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brass-500 px-3 py-2 text-xs font-semibold text-parchment-50 transition hover:bg-brass-600"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Name my places ({unnamedCount})
            </button>
            {unnamedCount > 50 && !googleMapsKey && (
              <button
                type="button"
                onClick={() => startGeocoding(50)}
                className="flex w-full items-center justify-center rounded-lg border border-brass-500/40 bg-parchment-100/80 px-3 py-1.5 font-mono text-[11px] font-semibold text-brass-700 transition hover:bg-parchment-200/60 dark:bg-moss-800 dark:text-parchment-200"
              >
                Quick name top 50 (~55s)
              </button>
            )}
          </div>
        )}

        {geocodeError && !geocoding && (
          <p className="rounded-lg border border-red-800/30 bg-red-950/10 px-2.5 py-2 text-[11px] text-red-900 dark:border-red-400/30 dark:text-red-200">
            {geocodeError}
          </p>
        )}

        {geocoding && (
          <div className="rounded-lg border border-brass-500/40 bg-parchment-100 p-2.5 dark:bg-moss-800">
            <div className="flex items-center justify-between text-xs font-semibold text-moss-900 dark:text-parchment-200">
              <span className="font-mono text-[11px]">
                Naming {geocodeProgress.done}/{geocodeProgress.total}
              </span>
              <button
                type="button"
                onClick={stopGeocoding}
                className="inline-flex items-center gap-1 rounded bg-moss-900 px-2 py-0.5 text-[11px] font-semibold text-parchment-200 dark:bg-parchment-200 dark:text-moss-900"
              >
                <Square className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                Stop
              </button>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-moss-900/15 dark:bg-moss-950">
              <div
                className="h-full bg-brass-500 transition-all duration-300"
                style={{
                  width: `${
                    geocodeProgress.total
                      ? Math.round((geocodeProgress.done / geocodeProgress.total) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-moss-700/80 dark:text-parchment-300/75">
              {googleMapsKey
                ? 'Fast mode via Google Maps · auto-saving'
                : '1 req/sec via Nominatim · top spots first'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop floating Field Ledger */}
      <aside className="pointer-events-none fixed left-4 top-[4.5rem] z-[900] hidden md:block">
        {desktopCollapsed ? (
          <button
            type="button"
            onClick={() => setDesktopCollapsed(false)}
            aria-label="Expand atlas ledger"
            className="atlas-panel pointer-events-auto flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-moss-900 shadow-atlas transition hover:border-brass-500 dark:text-parchment-200 dark:shadow-atlas-dark"
          >
            <PanelLeftOpen className="h-4 w-4 text-brass-500" aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-wider">
              Ledger ({filteredPlaces.length})
            </span>
          </button>
        ) : (
          <div className="atlas-panel pointer-events-auto max-h-[calc(100vh-5.5rem)] w-80 overflow-y-auto rounded-xl p-4 shadow-atlas dark:shadow-atlas-dark">
            <div className="mb-3 flex items-center justify-between border-b border-moss-900/15 pb-2.5 dark:border-parchment-200/15">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-brass-500" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold tracking-tight text-moss-900 dark:text-parchment-200">
                  Field Ledger
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDesktopCollapsed(true)}
                aria-label="Collapse ledger"
                className="rounded p-1 text-moss-700 transition hover:bg-moss-900/10 dark:text-parchment-200/70 dark:hover:bg-parchment-200/10"
              >
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {controlsBody}
          </div>
        )}
      </aside>

      {/* Mobile bottom sheet */}
      <section
        aria-label="Map controls"
        className="atlas-panel fixed inset-x-2 bottom-2 z-[900] rounded-xl shadow-atlas transition-all duration-200 dark:shadow-atlas-dark md:hidden"
      >
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
          <button
            type="button"
            aria-expanded={mobileExpanded}
            onClick={() => setMobileExpanded((prev) => !prev)}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <Compass className="h-4 w-4 shrink-0 text-brass-500" aria-hidden="true" />
            <span className="font-display text-sm font-semibold text-moss-900 dark:text-parchment-200">
              {filteredPlaces.length.toLocaleString()} places
            </span>
            {mobileExpanded ? (
              <ChevronDown className="ml-auto h-4 w-4 text-moss-700 dark:text-parchment-200" aria-hidden="true" />
            ) : (
              <ChevronUp className="ml-auto h-4 w-4 text-moss-700 dark:text-parchment-200" aria-hidden="true" />
            )}
          </button>

          {/* Quick Pins / Heat segmented pill on mobile */}
          <div
            role="radiogroup"
            aria-label="Mobile map layer mode"
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-moss-900/15 bg-parchment-200/55 p-0.5 dark:border-parchment-200/15 dark:bg-moss-800"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'pins'}
              onClick={() => setViewMode('pins')}
              className={`rounded px-2 py-1 text-[11px] font-semibold transition ${
                viewMode === 'pins'
                  ? 'bg-moss-950 text-parchment-200 dark:bg-moss-950 dark:text-parchment-200 dark:ring-1 dark:ring-brass-500/60'
                  : 'text-moss-800/75 dark:text-parchment-200/65'
              }`}
            >
              Pins
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'heatmap'}
              onClick={() => setViewMode('heatmap')}
              className={`rounded px-2 py-1 text-[11px] font-semibold transition ${
                viewMode === 'heatmap'
                  ? 'bg-moss-950 text-parchment-200 dark:bg-moss-950 dark:text-parchment-200 dark:ring-1 dark:ring-brass-500/60'
                  : 'text-moss-800/75 dark:text-parchment-200/65'
              }`}
            >
              Heat
            </button>
          </div>

          <button
            type="button"
            onClick={onZoomAll}
            disabled={!filteredPlaces.length}
            aria-label="Zoom to all pins"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-moss-900/15 bg-parchment-100 text-moss-900 dark:border-parchment-200/15 dark:bg-moss-800 dark:text-parchment-200"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {mobileExpanded && (
          <div className="max-h-[62vh] overflow-y-auto border-t border-moss-900/15 p-3.5 dark:border-parchment-200/15">
            {controlsBody}
          </div>
        )}
      </section>
    </>
  );
}
