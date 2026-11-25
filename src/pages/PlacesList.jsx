import { useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  ExternalLink,
  Trash2,
  ArrowUpDown,
  Upload,
} from 'lucide-react';
import { usePlaces } from '../context/PlacesContext.jsx';

const PAGE_SIZE = 50;

function formatDate(iso) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export default function PlacesList({ onViewOnMap, onGoToImport }) {
  const { places, loading, availableYears, removePlace } = usePlaces();

  const [query, setQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [sortBy, setSortBy] = useState('visits'); // 'visits' | 'recent' | 'oldest' | 'name'
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = places.filter((p) => {
      if (yearFilter !== 'all') {
        if (!(p.years?.[yearFilter] > 0)) return false;
      }
      if (q) {
        const nameMatch = p.name?.toLowerCase().includes(q);
        const addrMatch = p.address?.toLowerCase().includes(q);
        const coordMatch = `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`.includes(q);
        if (!nameMatch && !addrMatch && !coordMatch) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'visits') {
        const diff = (b.visitCount || 0) - (a.visitCount || 0);
        if (diff !== 0) return diff;
        return (b.lastVisit || '').localeCompare(a.lastVisit || '');
      }
      if (sortBy === 'recent') {
        return (b.lastVisit || '').localeCompare(a.lastVisit || '');
      }
      if (sortBy === 'oldest') {
        return (a.firstVisit || '9999').localeCompare(b.firstVisit || '9999');
      }
      const nameA = (a.name || `${a.lat},${a.lng}`).toLowerCase();
      const nameB = (b.name || `${b.lat},${b.lng}`).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return list;
  }, [places, query, yearFilter, sortBy]);

  const visiblePlaces = filtered.slice(0, visibleCount);
  const totalFilteredVisits = useMemo(
    () =>
      filtered.reduce(
        (sum, p) =>
          sum + (yearFilter === 'all' ? p.visitCount || 0 : p.years?.[yearFilter] || 0),
        0
      ),
    [filtered, yearFilter]
  );

  return (
    <main className="atlas-grid-bg min-h-[calc(100vh-3.5rem)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-moss-900/15 pb-4 dark:border-parchment-200/15">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-moss-900 dark:text-parchment-200">
              Visited Places
            </h1>
            {!loading && places.length > 0 && (
              <p className="mt-1 font-mono text-xs text-moss-700/80 dark:text-parchment-300/75">
                {filtered.length.toLocaleString()} places ·{' '}
                {totalFilteredVisits.toLocaleString()} visits
              </p>
            )}
          </div>
        </div>

        {loading && (
          <div className="space-y-2.5" aria-label="Loading places">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-moss-900/15 bg-parchment-100/70 dark:border-parchment-200/15 dark:bg-moss-800/70"
              />
            ))}
          </div>
        )}

        {!loading && places.length === 0 && (
          <div className="rounded-xl border border-moss-900/15 bg-parchment-100/75 p-8 text-center dark:border-parchment-200/15 dark:bg-moss-800/75">
            <p className="font-display text-lg font-semibold text-moss-900 dark:text-parchment-200">
              No places yet
            </p>
            <p className="mt-1 text-sm text-moss-700 dark:text-parchment-200/75">
              Import a Timeline JSON file to populate your visited places list.
            </p>
            <button
              type="button"
              onClick={onGoToImport}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brass-500 px-4 py-2 text-xs font-semibold text-parchment-50 transition hover:bg-brass-600"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Import Timeline
            </button>
          </div>
        )}

        {!loading && places.length > 0 && (
          <>
            {/* Search, Year & Sort controls */}
            <div className="grid gap-2.5 sm:grid-cols-12">
              <div className="relative sm:col-span-6">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-moss-700/60 dark:text-parchment-300/60"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  placeholder="Search place name, address, or coordinates..."
                  aria-label="Search visited places"
                  className="w-full rounded-lg border border-moss-900/20 bg-parchment-100/80 py-2 pl-9 pr-3 text-xs text-moss-900 placeholder:text-moss-700/55 dark:border-parchment-200/20 dark:bg-moss-800 dark:text-parchment-200"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  aria-label="Filter list by year"
                  className="w-full rounded-lg border border-moss-900/20 bg-parchment-100/80 px-3 py-2 text-xs font-medium text-moss-900 dark:border-parchment-200/20 dark:bg-moss-800 dark:text-parchment-200"
                >
                  <option value="all">All years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative sm:col-span-3">
                <ArrowUpDown
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-moss-700/60 dark:text-parchment-300/60"
                  aria-hidden="true"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort visited places"
                  className="w-full rounded-lg border border-moss-900/20 bg-parchment-100/80 py-2 pl-8 pr-3 text-xs font-medium text-moss-900 dark:border-parchment-200/20 dark:bg-moss-800 dark:text-parchment-200"
                >
                  <option value="visits">Most visited</option>
                  <option value="recent">Most recent</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-moss-900/15 bg-parchment-100/70 p-6 text-center text-sm text-moss-700 dark:border-parchment-200/15 dark:bg-moss-800/70 dark:text-parchment-200/80">
                No places match your filter.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-moss-900/15 bg-parchment-100/80 dark:border-parchment-200/15 dark:bg-moss-800/80">
                {/* Desktop table header */}
                <div className="hidden grid-cols-12 gap-3 border-b border-moss-900/15 bg-parchment-200/40 px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-moss-700 dark:border-parchment-200/15 dark:bg-moss-900/60 dark:text-parchment-300/80 md:grid">
                  <div className="col-span-5">Place</div>
                  <div className="col-span-4">When Visited</div>
                  <div className="col-span-1 text-right">Visits</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                <ul className="divide-y divide-moss-900/10 dark:divide-parchment-200/10">
                  {visiblePlaces.map((place) => {
                    const displayVisits =
                      yearFilter === 'all'
                        ? place.visitCount || 0
                        : place.years?.[yearFilter] || 0;
                    const first = formatDate(place.firstVisit);
                    const last = formatDate(place.lastVisit);
                    const dateRange =
                      first === last ? first : `${first} — ${last}`;
                    const yearEntries = Object.entries(place.years || {})
                      .filter(([, count]) => count > 0)
                      .sort((a, b) => Number(b[0]) - Number(a[0]));
                    const coords = `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`;
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

                    return (
                      <li
                        key={place.id}
                        className="grid grid-cols-1 gap-2 px-4 py-3.5 transition hover:bg-parchment-200/30 dark:hover:bg-moss-900/40 md:grid-cols-12 md:items-center md:gap-3"
                      >
                        {/* Place name & coords */}
                        <div className="min-w-0 md:col-span-5">
                          <p className="truncate font-display text-base font-semibold text-moss-900 dark:text-parchment-200">
                            {place.name || coords}
                          </p>
                          {place.name && (
                            <p className="font-mono text-[11px] text-moss-700/75 dark:text-parchment-300/70">
                              {coords}
                            </p>
                          )}
                          {place.address && (
                            <p className="mt-0.5 truncate text-xs text-moss-700/80 dark:text-parchment-200/70">
                              {place.address}
                            </p>
                          )}
                        </div>

                        {/* When visited */}
                        <div className="md:col-span-4">
                          <p className="text-xs font-medium text-moss-900 dark:text-parchment-200">
                            {dateRange}
                          </p>
                          {yearEntries.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {yearEntries.slice(0, 5).map(([yr, cnt]) => (
                                <span
                                  key={yr}
                                  className="rounded bg-moss-900/10 px-1.5 py-0.5 font-mono text-[10px] text-moss-800 dark:bg-moss-900 dark:text-parchment-300"
                                >
                                  {yr}: {cnt}
                                </span>
                              ))}
                              {yearEntries.length > 5 && (
                                <span className="font-mono text-[10px] text-moss-700/70 dark:text-parchment-300/65">
                                  +{yearEntries.length - 5} yrs
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Visit count */}
                        <div className="flex items-center justify-between md:col-span-1 md:justify-end">
                          <span className="inline-flex items-center rounded bg-brass-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-brass-700 dark:text-parchment-200">
                            {displayVisits} {displayVisits === 1 ? 'visit' : 'visits'}
                          </span>

                          {/* Mobile inline actions */}
                          <div className="flex items-center gap-1 md:hidden">
                            <button
                              type="button"
                              onClick={() => onViewOnMap(place)}
                              aria-label="Show on map"
                              className="rounded-md border border-moss-900/15 bg-parchment-50 p-1.5 text-moss-900 dark:border-parchment-200/15 dark:bg-moss-900 dark:text-parchment-200"
                            >
                              <MapPin className="h-3.5 w-3.5 text-brass-600 dark:text-brass-300" aria-hidden="true" />
                            </button>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open in Google Maps"
                              className="rounded-md border border-moss-900/15 bg-parchment-50 p-1.5 text-moss-900 dark:border-parchment-200/15 dark:bg-moss-900 dark:text-parchment-200"
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                            <button
                              type="button"
                              onClick={() => removePlace(place.id)}
                              aria-label="Delete place"
                              className="rounded-md border border-moss-900/15 bg-parchment-50 p-1.5 text-red-700 dark:border-parchment-200/15 dark:bg-moss-900 dark:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {/* Desktop actions */}
                        <div className="hidden items-center justify-end gap-1.5 md:col-span-2 md:flex">
                          <button
                            type="button"
                            onClick={() => onViewOnMap(place)}
                            title="Show on map"
                            aria-label="Show on map"
                            className="rounded-md border border-moss-900/15 bg-parchment-50 p-1.5 text-moss-900 transition hover:border-brass-500 dark:border-parchment-200/15 dark:bg-moss-900 dark:text-parchment-200"
                          >
                            <MapPin className="h-3.5 w-3.5 text-brass-600 dark:text-brass-300" aria-hidden="true" />
                          </button>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Google Maps"
                            aria-label="Open in Google Maps"
                            className="rounded-md border border-moss-900/15 bg-parchment-50 p-1.5 text-moss-900 transition hover:border-brass-500 dark:border-parchment-200/15 dark:bg-moss-900 dark:text-parchment-200"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removePlace(place.id)}
                            title="Delete place"
                            aria-label="Delete place"
                            className="rounded-md border border-moss-900/15 bg-parchment-50 p-1.5 text-red-700 transition hover:bg-red-950/10 dark:border-parchment-200/15 dark:bg-moss-900 dark:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {visibleCount < filtered.length && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="rounded-lg border border-moss-900/20 bg-parchment-100 px-5 py-2 text-xs font-semibold text-moss-900 transition hover:bg-parchment-200/60 dark:border-parchment-200/20 dark:bg-moss-800 dark:text-parchment-200 dark:hover:bg-moss-700"
                >
                  Show more ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
