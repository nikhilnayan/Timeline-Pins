import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { mergePlaces, mergePlacesByName } from '../lib/aggregate.js';
import {
  deleteAllUserData,
  deleteSinglePlace,
  loadUserMeta,
  loadUserPlaces,
  saveGeocodedNamesBatched,
  savePlacesBatched,
  saveUserMeta,
} from '../lib/placesStore.js';
import { haversineKm } from '../lib/parseTimeline.js';
import {
  geocodeUnnamedPlaces,
  getSavedGoogleMapsKey,
  setSavedGoogleMapsKey,
} from '../lib/geocode.js';

const PlacesContext = createContext(null);

export function PlacesProvider({ children }) {
  const { user } = useAuth();

  const [rawPlaces, setRawPlaces] = useState([]);
  const [distanceMeta, setDistanceMeta] = useState({ distanceKm: 0, distanceByYearKm: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Map & filter state
  const [viewMode, setViewMode] = useState('pins'); // 'pins' | 'heatmap'
  const [selectedYear, setSelectedYear] = useState('all');
  const [minVisits, setMinVisits] = useState(1);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState('');
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Geocoding state
  const [googleMapsKey, setGoogleMapsKey] = useState(getSavedGoogleMapsKey);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0, named: 0 });
  const geocodeAbortRef = useRef(null);

  const updateGoogleMapsKey = useCallback((nextKey) => {
    setSavedGoogleMapsKey(nextKey);
    setGoogleMapsKey(getSavedGoogleMapsKey());
    setGeocodeError(null);
  }, []);

  // Load user's places on login; clear ALL local state immediately on sign out
  useEffect(() => {
    if (!user) {
      if (geocodeAbortRef.current) {
        geocodeAbortRef.current.abort();
        geocodeAbortRef.current = null;
      }
      setRawPlaces([]);
      setDistanceMeta({ distanceKm: 0, distanceByYearKm: {} });
      setLoading(false);
      setError(null);
      setViewMode('pins');
      setSelectedYear('all');
      setMinVisits(1);
      setImporting(false);
      setImportProgress(0);
      setImportStage('');
      setImportError(null);
      setImportResult(null);
      setGeocoding(false);
      setGeocodeProgress({ done: 0, total: 0, named: 0 });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([loadUserPlaces(user.uid), loadUserMeta(user.uid)])
      .then(([loaded, meta]) => {
        if (!cancelled) {
          setRawPlaces(loaded);
          setDistanceMeta(meta);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load your saved places.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const places = useMemo(() => mergePlacesByName(rawPlaces), [rawPlaces]);

  const availableYears = useMemo(() => {
    const yearSet = new Set();
    for (const p of places) {
      if (p.years) {
        for (const yr of Object.keys(p.years)) {
          if (p.years[yr] > 0) yearSet.add(yr);
        }
      }
    }
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [places]);

  const maxVisitCount = useMemo(() => {
    let max = 1;
    for (const p of places) {
      if ((p.visitCount || 1) > max) max = p.visitCount;
    }
    return max;
  }, [places]);

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      if (selectedYear !== 'all') {
        const yearCount = p.years?.[selectedYear] || 0;
        if (yearCount <= 0) return false;
      }
      if ((p.visitCount || 1) < minVisits) return false;
      return true;
    });
  }, [places, selectedYear, minVisits]);

  const stats = useMemo(() => {
    const totalPlaces = filteredPlaces.length;
    let totalVisits = 0;
    let mostVisitedPlace = null;
    const yearsSet = new Set();

    for (const p of filteredPlaces) {
      const visits =
        selectedYear === 'all' ? p.visitCount || 0 : p.years?.[selectedYear] || 0;
      totalVisits += visits;

      if (!mostVisitedPlace || visits > mostVisitedPlace.displayVisits) {
        mostVisitedPlace = { ...p, displayVisits: visits };
      }

      if (p.years) {
        for (const [yr, count] of Object.entries(p.years)) {
          if (count > 0 && (selectedYear === 'all' || yr === selectedYear)) {
            yearsSet.add(yr);
          }
        }
      }
    }

    const sortedYears = Array.from(yearsSet).sort();
    const yearsCovered =
      sortedYears.length === 0
        ? '—'
        : sortedYears.length === 1
        ? sortedYears[0]
        : `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}`;

    // Compute total kilometers traveled (from stored Timeline activity distance or chronological Haversine estimate)
    let totalDistanceKm = 0;
    if (selectedYear === 'all') {
      totalDistanceKm = distanceMeta.distanceKm || 0;
    } else {
      totalDistanceKm = distanceMeta.distanceByYearKm?.[selectedYear] || 0;
    }

    if (totalDistanceKm === 0 && filteredPlaces.length > 1) {
      const chronological = [...filteredPlaces]
        .filter((p) => p.firstVisit)
        .sort((a, b) => a.firstVisit.localeCompare(b.firstVisit));
      let est = 0;
      for (let i = 1; i < chronological.length; i++) {
        const hop = haversineKm(
          chronological[i - 1].lat,
          chronological[i - 1].lng,
          chronological[i].lat,
          chronological[i].lng
        );
        if (Number.isFinite(hop) && hop > 0.05 && hop < 15000) {
          est += hop;
        }
      }
      totalDistanceKm = Math.round(est * 10) / 10;
    }

    return {
      totalPlaces,
      totalVisits,
      totalDistanceKm,
      yearsCovered,
      yearsCount: sortedYears.length,
      mostVisitedPlace,
    };
  }, [filteredPlaces, selectedYear, distanceMeta]);

  const unnamedCount = useMemo(
    () => places.filter((p) => !p.name).length,
    [places]
  );

  const importTimelineFiles = useCallback(
    async (fileList, mode = 'merge') => {
      if (!user) throw new Error('You must be signed in to import Timeline files.');
      const files = Array.from(fileList || []);
      if (!files.length) return;

      setImporting(true);
      setImportProgress(2);
      setImportStage('Starting background parser...');
      setImportError(null);
      setImportResult(null);

      try {
        const parsed = await new Promise((resolve, reject) => {
          const worker = new Worker(
            new URL('../workers/parse.worker.js', import.meta.url),
            { type: 'module' }
          );

          worker.onmessage = (event) => {
            const msg = event.data;
            if (msg.type === 'progress') {
              // Reserve 0-75% for parsing in worker, 75-100% for Firestore save
              setImportProgress(Math.min(75, Math.round(msg.progress * 0.75)));
              setImportStage(msg.stage);
            } else if (msg.type === 'done') {
              worker.terminate();
              resolve(msg);
            } else if (msg.type === 'error') {
              worker.terminate();
              reject(new Error(msg.error));
            }
          };

          worker.onerror = (err) => {
            worker.terminate();
            reject(new Error(err.message || 'Worker failed while parsing files.'));
          };

          worker.postMessage({ files });
        });

        let finalPlaces;
        if (mode === 'replace') {
          setImportStage('Clearing previous places...');
          setImportProgress(78);
          await deleteAllUserData(user.uid);
          finalPlaces = parsed.places;
        } else {
          finalPlaces = mergePlaces(rawPlaces, parsed.places);
        }

        // Only write the newly affected places when merging (or all when replacing)
        const placesToWrite =
          mode === 'replace'
            ? finalPlaces
            : finalPlaces.filter((fp) =>
                parsed.places.some((inc) => inc.id === fp.id)
              );

        setImportStage(`Saving ${placesToWrite.length.toLocaleString()} places to Firestore...`);
        await savePlacesBatched(user.uid, placesToWrite, (pct) => {
          setImportProgress(75 + Math.round(pct * 0.25));
        });

        const incomingKm = parsed.stats.distanceKm || 0;
        const incomingByYear = parsed.stats.distanceByYearKm || {};
        let nextDistanceMeta;
        if (mode === 'replace') {
          nextDistanceMeta = {
            distanceKm: Math.round(incomingKm * 10) / 10,
            distanceByYearKm: incomingByYear,
          };
        } else {
          const mergedByYear = { ...(distanceMeta.distanceByYearKm || {}) };
          for (const [yr, km] of Object.entries(incomingByYear)) {
            mergedByYear[yr] = Math.round(((mergedByYear[yr] || 0) + km) * 10) / 10;
          }
          nextDistanceMeta = {
            distanceKm: Math.round(((distanceMeta.distanceKm || 0) + incomingKm) * 10) / 10,
            distanceByYearKm: mergedByYear,
          };
        }
        await saveUserMeta(user.uid, nextDistanceMeta);
        setDistanceMeta(nextDistanceMeta);

        setRawPlaces(finalPlaces);
        setImportProgress(100);
        setImportStage('Import complete!');
        setImportResult({
          ...parsed.stats,
          warnings: parsed.warnings || [],
          totalStoredPlaces: finalPlaces.length,
        });
      } catch (err) {
        setImportError(err.message || 'Failed to import Timeline files.');
        throw err;
      } finally {
        setImporting(false);
      }
    },
    [user, rawPlaces]
  );

  const removePlace = useCallback(
    async (placeId) => {
      if (!user) return;
      const mergedMatch = places.find(
        (p) => p.id === placeId || p.sourceIds?.includes(placeId)
      );
      const idsToDelete = mergedMatch?.sourceIds?.length
        ? mergedMatch.sourceIds
        : [placeId];

      await Promise.all(idsToDelete.map((id) => deleteSinglePlace(user.uid, id)));
      const deleteSet = new Set(idsToDelete);
      setRawPlaces((prev) => prev.filter((p) => !deleteSet.has(p.id)));
    },
    [user, places]
  );

  const clearAllData = useCallback(async () => {
    if (!user) return;
    if (geocodeAbortRef.current) {
      geocodeAbortRef.current.abort();
      geocodeAbortRef.current = null;
    }
    await deleteAllUserData(user.uid);
    setRawPlaces([]);
    setDistanceMeta({ distanceKm: 0, distanceByYearKm: {} });
    setSelectedYear('all');
    setMinVisits(1);
    setImportResult(null);
  }, [user]);

  const startGeocoding = useCallback(
    async (maxCount = null) => {
      if (!user || geocoding) return;
      const unnamedSorted = rawPlaces
        .filter((p) => !p.name)
        .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
      const targetPlaces =
        typeof maxCount === 'number' && maxCount > 0
          ? unnamedSorted.slice(0, maxCount)
          : unnamedSorted;

      if (targetPlaces.length === 0) return;

      const controller = new AbortController();
      geocodeAbortRef.current = controller;
      setGeocoding(true);
      setGeocodeError(null);
      setGeocodeProgress({ done: 0, total: targetPlaces.length, named: 0 });

      let pendingFlush = [];
      let flushing = Promise.resolve();

      const flushPending = () => {
        if (pendingFlush.length === 0) return flushing;
        const toSave = pendingFlush;
        pendingFlush = [];
        flushing = flushing.then(() => saveGeocodedNamesBatched(user.uid, toSave));
        return flushing;
      };

      try {
        await geocodeUnnamedPlaces(targetPlaces, {
          signal: controller.signal,
          googleApiKey: googleMapsKey,
          onUpdate: (namedPlace, doneCount, total) => {
            setGeocodeProgress((prev) => ({
              done: doneCount,
              total,
              named: namedPlace ? prev.named + 1 : prev.named,
            }));

            if (namedPlace) {
              pendingFlush.push(namedPlace);
              setRawPlaces((prev) =>
                prev.map((p) => (p.id === namedPlace.id ? namedPlace : p))
              );
              if (pendingFlush.length >= 15) {
                flushPending();
              }
            }
          },
        });

        await flushPending();
      } catch (err) {
        setGeocodeError(err?.message || 'Reverse geocoding failed.');
      } finally {
        geocodeAbortRef.current = null;
        setGeocoding(false);
      }
    },
    [user, geocoding, rawPlaces, googleMapsKey]
  );

  const stopGeocoding = useCallback(() => {
    if (geocodeAbortRef.current) {
      geocodeAbortRef.current.abort();
    }
  }, []);

  return (
    <PlacesContext.Provider
      value={{
        places,
        filteredPlaces,
        loading,
        error,
        viewMode,
        setViewMode,
        selectedYear,
        setSelectedYear,
        minVisits,
        setMinVisits,
        availableYears,
        maxVisitCount,
        stats,
        unnamedCount,
        importing,
        importProgress,
        importStage,
        importError,
        importResult,
        importTimelineFiles,
        removePlace,
        clearAllData,
        geocoding,
        geocodeError,
        geocodeProgress,
        googleMapsKey,
        updateGoogleMapsKey,
        startGeocoding,
        stopGeocoding,
      }}
    >
      {children}
    </PlacesContext.Provider>
  );
}

export function usePlaces() {
  const ctx = useContext(PlacesContext);
  if (!ctx) throw new Error('usePlaces must be used inside PlacesProvider');
  return ctx;
}
