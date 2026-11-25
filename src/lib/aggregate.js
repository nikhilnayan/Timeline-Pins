/**
 * Aggregates and deduplicates normalized visits into place records.
 * Coordinates are rounded to 4 decimal places (~11 meters precision).
 */

import { haversineKm } from './parseTimeline.js';

export function roundCoord(value) {
  return Math.round(value * 10000) / 10000;
}

export function makePlaceId(lat, lng) {
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  return `${rLat.toFixed(4)}_${rLng.toFixed(4)}`;
}

function getYearKey(isoTimestamp) {
  if (!isoTimestamp) return null;
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return null;
  return String(d.getUTCFullYear());
}

/**
 * Aggregate an array of normalized visits into a map/array of deduplicated places.
 * Each place stores:
 * - id: "lat_lng" rounded to 4 decimals
 * - lat, lng: rounded coordinates
 * - visitCount: number
 * - firstVisit: ISO string or null
 * - lastVisit: ISO string or null
 * - name: string or null
 * - address: string or null
 * - years: { [year: string]: number }
 */
export function aggregateVisits(visits) {
  const map = new Map();

  for (let i = 0; i < visits.length; i++) {
    const v = visits[i];
    const lat = roundCoord(v.lat);
    const lng = roundCoord(v.lng);
    if (lat === 0 && lng === 0) continue;

    const id = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const yearKey = getYearKey(v.timestamp);

    let existing = map.get(id);
    if (!existing) {
      existing = {
        id,
        lat,
        lng,
        visitCount: 0,
        firstVisit: v.timestamp || null,
        lastVisit: v.timestamp || null,
        name: v.name || null,
        address: v.address || null,
        years: {},
      };
      map.set(id, existing);
    }

    existing.visitCount += 1;

    if (v.timestamp) {
      if (!existing.firstVisit || v.timestamp < existing.firstVisit) {
        existing.firstVisit = v.timestamp;
      }
      if (!existing.lastVisit || v.timestamp > existing.lastVisit) {
        existing.lastVisit = v.timestamp;
      }
      if (yearKey) {
        existing.years[yearKey] = (existing.years[yearKey] || 0) + 1;
      }
    }

    if (!existing.name && v.name) {
      existing.name = v.name;
    }
    if (!existing.address && v.address) {
      existing.address = v.address;
    }
  }

  return Array.from(map.values());
}

/**
 * Merge newly aggregated places into an existing list of places without creating duplicates.
 * Preserves existing place names/addresses if incoming lacks them.
 */
export function mergePlaces(existingPlaces, incomingPlaces) {
  const map = new Map();

  for (const p of existingPlaces) {
    map.set(p.id, {
      ...p,
      years: { ...(p.years || {}) },
    });
  }

  for (const inc of incomingPlaces) {
    const current = map.get(inc.id);
    if (!current) {
      map.set(inc.id, {
        ...inc,
        years: { ...(inc.years || {}) },
      });
      continue;
    }

    current.visitCount = (current.visitCount || 0) + (inc.visitCount || 0);

    if (inc.firstVisit && (!current.firstVisit || inc.firstVisit < current.firstVisit)) {
      current.firstVisit = inc.firstVisit;
    }
    if (inc.lastVisit && (!current.lastVisit || inc.lastVisit > current.lastVisit)) {
      current.lastVisit = inc.lastVisit;
    }

    const mergedYears = { ...(current.years || {}) };
    for (const [yr, count] of Object.entries(inc.years || {})) {
      mergedYears[yr] = (mergedYears[yr] || 0) + count;
    }
    current.years = mergedYears;

    if (!current.name && inc.name) {
      current.name = inc.name;
    }
    if (!current.address && inc.address) {
      current.address = inc.address;
    }
  }

  return Array.from(map.values());
}

/**
 * Merge places that share the exact same normalized name within maxDistanceKm
 * (default 5 km, so large campuses/airports/malls collapse into one place while
 * same-named chains in different cities stay separate).
 * Preserves `sourceIds` so deleting a merged place can clean up all underlying docs.
 */
export function mergePlacesByName(places, maxDistanceKm = 5) {
  if (!Array.isArray(places) || places.length === 0) return [];

  const unnamed = [];
  const byName = new Map();

  for (const p of places) {
    const norm = p.name ? p.name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    if (!norm) {
      unnamed.push({
        ...p,
        sourceIds: p.sourceIds || [p.id],
      });
      continue;
    }
    if (!byName.has(norm)) {
      byName.set(norm, []);
    }
    byName.get(norm).push(p);
  }

  const mergedNamed = [];

  for (const group of byName.values()) {
    if (group.length === 1) {
      const only = group[0];
      mergedNamed.push({
        ...only,
        sourceIds: only.sourceIds || [only.id],
      });
      continue;
    }

    // Anchor each cluster on the most-visited entry
    const sorted = [...group].sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    const clusters = [];

    for (const item of sorted) {
      let targetCluster = null;
      for (const cluster of clusters) {
        if (haversineKm(cluster.lat, cluster.lng, item.lat, item.lng) <= maxDistanceKm) {
          targetCluster = cluster;
          break;
        }
      }

      if (!targetCluster) {
        clusters.push({
          ...item,
          years: { ...(item.years || {}) },
          sourceIds: [...(item.sourceIds || [item.id])],
        });
      } else {
        targetCluster.visitCount = (targetCluster.visitCount || 0) + (item.visitCount || 0);
        if (
          item.firstVisit &&
          (!targetCluster.firstVisit || item.firstVisit < targetCluster.firstVisit)
        ) {
          targetCluster.firstVisit = item.firstVisit;
        }
        if (
          item.lastVisit &&
          (!targetCluster.lastVisit || item.lastVisit > targetCluster.lastVisit)
        ) {
          targetCluster.lastVisit = item.lastVisit;
        }
        for (const [yr, cnt] of Object.entries(item.years || {})) {
          targetCluster.years[yr] = (targetCluster.years[yr] || 0) + cnt;
        }
        if (!targetCluster.address && item.address) {
          targetCluster.address = item.address;
        }
        const idsToAdd = item.sourceIds || [item.id];
        for (const sid of idsToAdd) {
          if (!targetCluster.sourceIds.includes(sid)) {
            targetCluster.sourceIds.push(sid);
          }
        }
      }
    }

    mergedNamed.push(...clusters);
  }

  return [...mergedNamed, ...unnamed];
}
