/**
 * Parses Google Maps Timeline JSON exports into normalized visit records
 * and calculates total distance traveled (in km, with yearly breakdown).
 * Supports:
 * 1. New on-device format: { semanticSegments: [...] }
 * 2. Android on-device array format: [ { visit: ... }, ... ]
 * 3. Google Takeout Semantic Location History: { timelineObjects: [ { placeVisit: ... }, ... ] }
 */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseCoordinates(locationInput) {
  if (!locationInput) return null;

  let lat = NaN;
  let lng = NaN;

  if (typeof locationInput === 'string') {
    const trimmed = locationInput.trim();
    if (trimmed.toLowerCase().startsWith('geo:')) {
      const coordsPart = trimmed.slice(4).split('?')[0];
      const parts = coordsPart.split(',');
      if (parts.length >= 2) {
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      }
    } else {
      const cleaned = trimmed.replace(/°/g, '');
      const parts = cleaned.split(',');
      if (parts.length >= 2) {
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      }
    }
  } else if (typeof locationInput === 'object') {
    if (typeof locationInput.latLng === 'string') {
      return parseCoordinates(locationInput.latLng);
    }
    if (
      typeof locationInput.latitudeE7 === 'number' &&
      typeof locationInput.longitudeE7 === 'number'
    ) {
      lat = locationInput.latitudeE7 / 1e7;
      lng = locationInput.longitudeE7 / 1e7;
    } else if (
      typeof locationInput.lat === 'number' &&
      typeof locationInput.lng === 'number'
    ) {
      lat = locationInput.lat;
      lng = locationInput.lng;
    } else if (
      typeof locationInput.latitude === 'number' &&
      typeof locationInput.longitude === 'number'
    ) {
      lat = locationInput.latitude;
      lng = locationInput.longitude;
    }
  }

  if (!isValidCoordinate(lat, lng)) {
    return null;
  }

  return { lat, lng };
}

export function isValidCoordinate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function normalizeTimestamp(rawTime) {
  if (rawTime === undefined || rawTime === null || rawTime === '') return null;

  let date;
  if (typeof rawTime === 'number') {
    date = new Date(rawTime);
  } else if (typeof rawTime === 'string') {
    const trimmed = rawTime.trim();
    if (/^\d{10,13}$/.test(trimmed)) {
      const num = Number(trimmed);
      date = new Date(trimmed.length === 10 ? num * 1000 : num);
    } else {
      date = new Date(trimmed);
    }
  } else {
    return null;
  }

  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getYearFromIso(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return String(d.getUTCFullYear());
}

/**
 * Detect the Timeline JSON format and extract normalized visit objects plus distance traveled.
 */
export function parseTimelineData(data, options = {}) {
  const { onProgress } = options;

  if (!data || typeof data !== 'object') {
    throw new Error(
      'Invalid JSON structure. Expected an object or array exported from Google Maps Timeline.'
    );
  }

  if (
    !Array.isArray(data) &&
    Array.isArray(data.locations) &&
    !data.semanticSegments &&
    !data.timelineObjects
  ) {
    throw new Error(
      'No visits found. Records.json files only hold raw points. Use Timeline.json or Semantic Location History files.'
    );
  }

  let format = null;
  let items = null;

  if (!Array.isArray(data) && Array.isArray(data.semanticSegments)) {
    format = 'semanticSegments';
    items = data.semanticSegments;
  } else if (Array.isArray(data)) {
    format = 'androidArray';
    items = data;
  } else if (!Array.isArray(data) && Array.isArray(data.timelineObjects)) {
    format = 'takeout';
    items = data.timelineObjects;
  } else {
    throw new Error(
      'Unrecognized Timeline JSON format. Expected a Timeline.json file (semanticSegments or array) or a Semantic Location History file (timelineObjects).'
    );
  }

  const visits = [];
  let activityDistanceMeters = 0;
  const activityDistanceByYearMeters = {};

  const total = items.length;
  const progressStep = Math.max(1, Math.floor(total / 25));

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (onProgress && i % progressStep === 0) {
      onProgress(i / (total || 1));
    }

    if (!item || typeof item !== 'object') continue;

    if (format === 'semanticSegments' || format === 'androidArray') {
      // Accumulate activity distance if present (never store routes)
      if (item.activity && typeof item.activity === 'object') {
        const dist = Number(item.activity.distanceMeters);
        if (Number.isFinite(dist) && dist > 0 && dist < 25_000_000) {
          activityDistanceMeters += dist;
          const yr = getYearFromIso(normalizeTimestamp(item.startTime));
          if (yr) {
            activityDistanceByYearMeters[yr] =
              (activityDistanceByYearMeters[yr] || 0) + dist;
          }
        } else if (item.activity.start && item.activity.end) {
          const s = parseCoordinates(item.activity.start);
          const e = parseCoordinates(item.activity.end);
          if (s && e) {
            const km = haversineKm(s.lat, s.lng, e.lat, e.lng);
            if (Number.isFinite(km) && km > 0 && km < 20000) {
              const meters = km * 1000;
              activityDistanceMeters += meters;
              const yr = getYearFromIso(normalizeTimestamp(item.startTime));
              if (yr) {
                activityDistanceByYearMeters[yr] =
                  (activityDistanceByYearMeters[yr] || 0) + meters;
              }
            }
          }
        }
      }

      if (!item.visit || typeof item.visit !== 'object') continue;

      const candidate = item.visit.topCandidate;
      if (!candidate || typeof candidate !== 'object') continue;

      const coords = parseCoordinates(candidate.placeLocation);
      if (!coords) continue;

      const timestamp = normalizeTimestamp(item.startTime);
      const endTime = normalizeTimestamp(item.endTime);

      visits.push({
        lat: coords.lat,
        lng: coords.lng,
        timestamp,
        endTime,
        name:
          typeof candidate.name === 'string' && candidate.name.trim()
            ? candidate.name.trim()
            : null,
        address:
          typeof candidate.address === 'string' && candidate.address.trim()
            ? candidate.address.trim()
            : null,
      });
    } else if (format === 'takeout') {
      if (item.activitySegment && typeof item.activitySegment === 'object') {
        const seg = item.activitySegment;
        const dist = Number(seg.distance);
        const segTs = normalizeTimestamp(
          seg.duration?.startTimestamp ?? seg.duration?.startTimestampMs
        );
        const yr = getYearFromIso(segTs);

        if (Number.isFinite(dist) && dist > 0 && dist < 25_000_000) {
          activityDistanceMeters += dist;
          if (yr) {
            activityDistanceByYearMeters[yr] =
              (activityDistanceByYearMeters[yr] || 0) + dist;
          }
        } else if (seg.startLocation && seg.endLocation) {
          const s = parseCoordinates(seg.startLocation);
          const e = parseCoordinates(seg.endLocation);
          if (s && e) {
            const km = haversineKm(s.lat, s.lng, e.lat, e.lng);
            if (Number.isFinite(km) && km > 0 && km < 20000) {
              const meters = km * 1000;
              activityDistanceMeters += meters;
              if (yr) {
                activityDistanceByYearMeters[yr] =
                  (activityDistanceByYearMeters[yr] || 0) + meters;
              }
            }
          }
        }
      }

      if (!item.placeVisit || typeof item.placeVisit !== 'object') continue;

      const pv = item.placeVisit;
      const loc = pv.location;
      if (!loc || typeof loc !== 'object') continue;

      const coords = parseCoordinates(loc);
      if (!coords) continue;

      const duration = pv.duration || {};
      const timestamp = normalizeTimestamp(
        duration.startTimestamp ?? duration.startTimestampMs ?? pv.startTimestamp
      );
      const endTime = normalizeTimestamp(
        duration.endTimestamp ?? duration.endTimestampMs ?? pv.endTimestamp
      );

      visits.push({
        lat: coords.lat,
        lng: coords.lng,
        timestamp,
        endTime,
        name:
          typeof loc.name === 'string' && loc.name.trim() ? loc.name.trim() : null,
        address:
          typeof loc.address === 'string' && loc.address.trim()
            ? loc.address.trim()
            : null,
      });
    }
  }

  if (onProgress) onProgress(1);

  if (visits.length === 0) {
    throw new Error(
      'No visits found in this file. Make sure you select a Timeline.json or Semantic Location History JSON file containing place visits.'
    );
  }

  // Fallback: if the export had no activity segments, estimate km between consecutive visits
  let distanceKm = Math.round((activityDistanceMeters / 1000) * 10) / 10;
  const distanceByYearKm = {};

  if (activityDistanceMeters > 0) {
    for (const [yr, m] of Object.entries(activityDistanceByYearMeters)) {
      distanceByYearKm[yr] = Math.round((m / 1000) * 10) / 10;
    }
  } else if (visits.length > 1) {
    const datedVisits = visits
      .filter((v) => v.timestamp)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let estKm = 0;
    for (let i = 1; i < datedVisits.length; i++) {
      const prev = datedVisits[i - 1];
      const curr = datedVisits[i];
      const hop = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
      if (Number.isFinite(hop) && hop > 0.05 && hop < 15000) {
        estKm += hop;
        const yr = getYearFromIso(curr.timestamp);
        if (yr) {
          distanceByYearKm[yr] =
            Math.round(((distanceByYearKm[yr] || 0) + hop) * 10) / 10;
        }
      }
    }
    distanceKm = Math.round(estKm * 10) / 10;
  }

  return {
    format,
    visits,
    totalSegments: total,
    distanceKm,
    distanceByYearKm,
  };
}

export function parseTimelineJson(jsonString, options = {}) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error(
      'Could not parse file as valid JSON. Please check that the file is not corrupted.'
    );
  }
  return parseTimelineData(parsed, options);
}
