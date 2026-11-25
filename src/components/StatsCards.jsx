import { usePlaces } from '../context/PlacesContext.jsx';

function formatKm(km) {
  if (!km || km <= 0) return '0 km';
  if (km >= 1000) {
    return `${Math.round(km).toLocaleString()} km`;
  }
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
}

export default function StatsCards() {
  const { stats, loading } = usePlaces();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-moss-900/15 bg-moss-900/15 dark:border-parchment-200/15 dark:bg-parchment-200/15" aria-label="Loading statistics">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`animate-pulse bg-parchment-50 p-3 dark:bg-moss-800 ${
              i === 4 ? 'col-span-2' : ''
            }`}
          >
            <div className="h-2.5 w-16 rounded bg-parchment-200 dark:bg-moss-700" />
            <div className="mt-2 h-5 w-14 rounded bg-parchment-200 dark:bg-moss-700" />
          </div>
        ))}
      </div>
    );
  }

  const mostVisitedLabel = stats.mostVisitedPlace
    ? stats.mostVisitedPlace.name ||
      `${stats.mostVisitedPlace.lat.toFixed(3)}, ${stats.mostVisitedPlace.lng.toFixed(3)}`
    : '—';

  return (
    <div className="overflow-hidden rounded-lg border border-moss-900/15 bg-moss-900/15 dark:border-parchment-200/15 dark:bg-parchment-200/15">
      {/* Distance Traveled hero row */}
      <div className="flex items-baseline justify-between bg-parchment-100/90 px-3 py-2.5 dark:bg-moss-800/95">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-moss-700 dark:text-parchment-300">
          Distance Traveled
        </span>
        <span className="font-mono text-base font-semibold tabular-nums text-brass-600 dark:text-parchment-200">
          {formatKm(stats.totalDistanceKm)}
        </span>
      </div>

      <div className="mt-px grid grid-cols-2 gap-px">
        <div className="bg-parchment-50/95 px-3 py-2.5 dark:bg-moss-900/95">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-moss-700/80 dark:text-parchment-300/75">
            Places
          </div>
          <div className="mt-0.5 font-display text-lg font-semibold tabular-nums text-moss-900 dark:text-parchment-200">
            {stats.totalPlaces.toLocaleString()}
          </div>
        </div>

        <div className="bg-parchment-50/95 px-3 py-2.5 dark:bg-moss-900/95">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-moss-700/80 dark:text-parchment-300/75">
            Visits
          </div>
          <div className="mt-0.5 font-display text-lg font-semibold tabular-nums text-moss-900 dark:text-parchment-200">
            {stats.totalVisits.toLocaleString()}
          </div>
        </div>

        <div className="bg-parchment-50/95 px-3 py-2.5 dark:bg-moss-900/95">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-moss-700/80 dark:text-parchment-300/75">
            Years
          </div>
          <div className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-moss-900 dark:text-parchment-200">
            {stats.yearsCovered}
          </div>
        </div>

        <div className="bg-parchment-50/95 px-3 py-2.5 dark:bg-moss-900/95">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-moss-700/80 dark:text-parchment-300/75">
            Top Spot
          </div>
          <div
            title={mostVisitedLabel}
            className="mt-0.5 truncate text-xs font-semibold text-moss-900 dark:text-parchment-200"
          >
            {mostVisitedLabel}
          </div>
          {stats.mostVisitedPlace && (
            <div className="font-mono text-[10px] text-brass-600 dark:text-brass-300">
              {stats.mostVisitedPlace.displayVisits}x
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
