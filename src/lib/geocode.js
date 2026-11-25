/**
 * Reverse geocoding for unnamed places.
 * - If a Google Maps API key is provided (VITE_GOOGLE_MAPS_API_KEY or saved in Settings),
 *   uses the official Google Maps JavaScript Geocoder SDK (no CORS issues, ~20-30 req/sec).
 * - Otherwise falls back to OpenStreetMap Nominatim strictly rate-limited to 1 req/sec.
 * Places are always processed in descending visitCount order so top places get named first.
 */

const NOMINATIM_INTERVAL_MS = 1100;
const GOOGLE_CONCURRENCY = 8;
const GOOGLE_BATCH_DELAY_MS = 220;
const GOOGLE_KEY_STORAGE = 'timeline_pins_gmaps_key';

let googleScriptPromise = null;
let loadedGoogleKey = null;

export function getSavedGoogleMapsKey() {
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && !String(envKey).startsWith('your-')) {
    return String(envKey).trim();
  }
  try {
    const stored = localStorage.getItem(GOOGLE_KEY_STORAGE);
    return stored ? stored.trim() : '';
  } catch {
    return '';
  }
}

export function setSavedGoogleMapsKey(key) {
  try {
    const cleaned = (key || '').trim();
    if (cleaned) {
      localStorage.setItem(GOOGLE_KEY_STORAGE, cleaned);
    } else {
      localStorage.removeItem(GOOGLE_KEY_STORAGE);
    }
  } catch {
    // ignore storage errors
  }
}

function loadGoogleMapsGeocoder(apiKey) {
  if (window.google?.maps?.Geocoder && loadedGoogleKey === apiKey) {
    return Promise.resolve(new window.google.maps.Geocoder());
  }

  if (googleScriptPromise && loadedGoogleKey === apiKey) {
    return googleScriptPromise;
  }

  loadedGoogleKey = apiKey;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gmaps-geocoder="true"]');
    if (existing) existing.remove();

    const callbackName = `__tpGoogleMapsReady_${Date.now()}`;
    window[callbackName] = () => {
      delete window[callbackName];
      if (window.google?.maps?.Geocoder) {
        resolve(new window.google.maps.Geocoder());
      } else {
        reject(new Error('Google Maps Geocoder failed to initialize.'));
      }
    };

    const script = document.createElement('script');
    script.dataset.gmapsGeocoder = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[callbackName];
      googleScriptPromise = null;
      reject(new Error('Failed to load Google Maps JavaScript API. Check your API key.'));
    };
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Geocoding cancelled', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('Geocoding cancelled', 'AbortError'));
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function extractNominatimName(data) {
  if (!data) return null;

  if (data.name && typeof data.name === 'string' && data.name.trim()) {
    return data.name.trim();
  }

  const addr = data.address || {};
  const primary =
    addr.amenity ||
    addr.shop ||
    addr.tourism ||
    addr.leisure ||
    addr.building ||
    addr.historic ||
    addr.road ||
    addr.pedestrian ||
    addr.neighbourhood ||
    addr.suburb ||
    addr.city ||
    addr.town ||
    addr.village;

  const locality = addr.city || addr.town || addr.village || addr.county || addr.state;

  if (primary && locality && primary !== locality) {
    return `${primary}, ${locality}`;
  }
  if (primary) {
    return primary;
  }

  if (data.display_name && typeof data.display_name === 'string') {
    return data.display_name.split(',').slice(0, 2).join(',').trim();
  }

  return null;
}

function extractGoogleName(results) {
  if (!Array.isArray(results) || results.length === 0) return { name: null, address: null };

  // Prefer POI / establishment / premise / route over broad administrative regions
  const preferred =
    results.find((r) =>
      r.types?.some((t) =>
        ['point_of_interest', 'establishment', 'premise', 'park', 'tourist_attraction'].includes(t)
      )
    ) ||
    results.find((r) => r.types?.includes('street_address') || r.types?.includes('route')) ||
    results[0];

  const comps = preferred.address_components || [];
  const poi = comps.find((c) =>
    c.types?.some((t) => ['point_of_interest', 'establishment', 'premise', 'natural_feature'].includes(t))
  );
  const route = comps.find((c) => c.types?.includes('route'));
  const neighborhood = comps.find(
    (c) => c.types?.includes('neighborhood') || c.types?.includes('sublocality')
  );
  const locality = comps.find((c) => c.types?.includes('locality'));

  const primary = poi?.long_name || route?.short_name || neighborhood?.long_name || locality?.long_name;
  const city = locality?.long_name;

  let name = null;
  if (primary && city && primary !== city) {
    name = `${primary}, ${city}`;
  } else if (primary) {
    name = primary;
  } else if (preferred.formatted_address) {
    name = preferred.formatted_address.split(',').slice(0, 2).join(',').trim();
  }

  return {
    name,
    address: preferred.formatted_address || null,
  };
}

export async function reverseGeocodeNominatim(lat, lng, signal) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Nominatim returned status ${response.status}`);
  }

  const data = await response.json();
  return {
    name: extractNominatimName(data),
    address: data.display_name || null,
  };
}

async function reverseGeocodeGoogle(geocoder, lat, lng, attempt = 0) {
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, async (results, status) => {
      if (status === 'OK') {
        resolve(extractGoogleName(results));
      } else if (status === 'ZERO_RESULTS') {
        resolve({ name: null, address: null });
      } else if (status === 'OVER_QUERY_LIMIT' && attempt < 3) {
        const backoff = 400 * Math.pow(2, attempt);
        setTimeout(() => {
          reverseGeocodeGoogle(geocoder, lat, lng, attempt + 1).then(resolve, reject);
        }, backoff);
      } else {
        reject(new Error(`Google Geocoder error: ${status}`));
      }
    });
  });
}

/**
 * Geocode unnamed places sorted by highest visitCount first.
 * Automatically uses Google Maps JS Geocoder when a Google Maps key is configured,
 * otherwise uses Nominatim at 1 req/sec.
 */
export async function geocodeUnnamedPlaces(places, { signal, onUpdate, googleApiKey } = {}) {
  const unnamed = places
    .filter((p) => !p.name)
    .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));

  const total = unnamed.length;
  if (total === 0) return [];

  const apiKey = googleApiKey ?? getSavedGoogleMapsKey();
  const updated = [];

  if (apiKey) {
    const geocoder = await loadGoogleMapsGeocoder(apiKey);
    let done = 0;

    for (let i = 0; i < total; i += GOOGLE_CONCURRENCY) {
      if (signal?.aborted) break;
      const chunk = unnamed.slice(i, i + GOOGLE_CONCURRENCY);

      const results = await Promise.all(
        chunk.map(async (place) => {
          if (signal?.aborted) return null;
          try {
            const res = await reverseGeocodeGoogle(geocoder, place.lat, place.lng);
            if (res.name) {
              return {
                ...place,
                name: res.name,
                address: place.address || res.address,
              };
            }
          } catch {
            // Skip individual failures and continue batch
          }
          return null;
        })
      );

      for (const namedPlace of results) {
        done += 1;
        if (namedPlace) {
          updated.push(namedPlace);
        }
        if (onUpdate) {
          onUpdate(namedPlace, done, total);
        }
      }

      if (i + GOOGLE_CONCURRENCY < total && !signal?.aborted) {
        await sleep(GOOGLE_BATCH_DELAY_MS, signal);
      }
    }

    return updated;
  }

  // Fallback: Nominatim at 1 request/sec
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break;

    const place = unnamed[i];
    const startedAt = Date.now();

    try {
      const result = await reverseGeocodeNominatim(place.lat, place.lng, signal);
      if (result.name) {
        const namedPlace = {
          ...place,
          name: result.name,
          address: place.address || result.address,
        };
        updated.push(namedPlace);
        if (onUpdate) onUpdate(namedPlace, i + 1, total);
      } else if (onUpdate) {
        onUpdate(null, i + 1, total);
      }
    } catch (err) {
      if (err.name === 'AbortError') break;
      if (onUpdate) onUpdate(null, i + 1, total);
    }

    if (i < total - 1 && !signal?.aborted) {
      const elapsed = Date.now() - startedAt;
      const waitMs = Math.max(0, NOMINATIM_INTERVAL_MS - elapsed);
      if (waitMs > 0) {
        await sleep(waitMs, signal);
      }
    }
  }

  return updated;
}
