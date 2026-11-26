/**
 * Local-first IndexedDB persistence layer for Timeline Pins.
 * Stores aggregated places and distance totals per user ID entirely in the browser:
 * zero cost, zero server pausing, and complete data privacy.
 */

const DB_NAME = 'timeline_pins_db';
const DB_VERSION = 1;
const PLACES_STORE = 'places';
const META_STORE = 'meta';
const BATCH_SIZE = 500;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PLACES_STORE)) {
        const store = db.createObjectStore(PLACES_STORE, { keyPath: 'pk' });
        store.createIndex('by_user', 'userId', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'userId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open local database.'));
  });

  return dbPromise;
}

function makePk(userId, placeId) {
  return `${userId}::${placeId}`;
}

export async function loadUserPlaces(uid) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLACES_STORE, 'readonly');
    const index = tx.objectStore(PLACES_STORE).index('by_user');
    const req = index.getAll(IDBKeyRange.only(uid));

    req.onsuccess = () => {
      const rows = (req.result || []).map(({ pk, userId, ...place }) => place);
      resolve(rows);
    };
    req.onerror = () => reject(req.error || new Error('Failed to load saved places.'));
  });
}

export async function loadUserMeta(uid) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const req = tx.objectStore(META_STORE).get(uid);

    req.onsuccess = () => {
      const data = req.result;
      if (!data) {
        resolve({ distanceKm: 0, distanceByYearKm: {} });
        return;
      }
      resolve({
        distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : 0,
        distanceByYearKm:
          data.distanceByYearKm && typeof data.distanceByYearKm === 'object'
            ? data.distanceByYearKm
            : {},
      });
    };
    req.onerror = () => reject(req.error || new Error('Failed to load distance totals.'));
  });
}

export async function saveUserMeta(uid, { distanceKm, distanceByYearKm }) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put({
      userId: uid,
      distanceKm: typeof distanceKm === 'number' ? distanceKm : 0,
      distanceByYearKm: distanceByYearKm || {},
      updatedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to save distance totals.'));
  });
}

export async function savePlacesBatched(uid, places, onProgress) {
  if (!places.length) return;
  const db = await openDb();
  const total = places.length;
  let written = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = places.slice(i, i + BATCH_SIZE);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PLACES_STORE, 'readwrite');
      const store = tx.objectStore(PLACES_STORE);
      const now = new Date().toISOString();

      for (const place of chunk) {
        store.put({
          pk: makePk(uid, place.id),
          userId: uid,
          id: place.id,
          lat: place.lat,
          lng: place.lng,
          visitCount: place.visitCount,
          firstVisit: place.firstVisit || null,
          lastVisit: place.lastVisit || null,
          name: place.name || null,
          address: place.address || null,
          years: place.years || {},
          updatedAt: now,
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to save places batch.'));
    });

    written += chunk.length;
    if (onProgress) {
      onProgress(Math.round((written / total) * 100), written, total);
    }
  }
}

export async function saveGeocodedNamesBatched(uid, updatedPlaces) {
  if (!updatedPlaces.length) return;
  const db = await openDb();

  for (let i = 0; i < updatedPlaces.length; i += BATCH_SIZE) {
    const chunk = updatedPlaces.slice(i, i + BATCH_SIZE);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PLACES_STORE, 'readwrite');
      const store = tx.objectStore(PLACES_STORE);
      const now = new Date().toISOString();

      for (const place of chunk) {
        const pk = makePk(uid, place.id);
        const getReq = store.get(pk);
        getReq.onsuccess = () => {
          const existing = getReq.result || {
            pk,
            userId: uid,
            id: place.id,
            lat: place.lat,
            lng: place.lng,
            visitCount: place.visitCount,
            firstVisit: place.firstVisit || null,
            lastVisit: place.lastVisit || null,
            years: place.years || {},
          };
          store.put({
            ...existing,
            name: place.name || existing.name || null,
            address: place.address || existing.address || null,
            geocodedAt: now,
          });
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to cache place names.'));
    });
  }
}

export async function deleteSinglePlace(uid, placeId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLACES_STORE, 'readwrite');
    tx.objectStore(PLACES_STORE).delete(makePk(uid, placeId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to delete place.'));
  });
}

export async function deleteAllUserData(uid, onProgress) {
  const db = await openDb();

  const keys = await new Promise((resolve, reject) => {
    const tx = db.transaction(PLACES_STORE, 'readonly');
    const index = tx.objectStore(PLACES_STORE).index('by_user');
    const req = index.getAllKeys(IDBKeyRange.only(uid));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error || new Error('Failed to query user data.'));
  });

  const total = keys.length;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = keys.slice(i, i + BATCH_SIZE);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PLACES_STORE, 'readwrite');
      const store = tx.objectStore(PLACES_STORE);
      for (const k of chunk) {
        store.delete(k);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to delete user places.'));
    });
    if (onProgress) {
      onProgress(Math.round(((i + chunk.length) / (total || 1)) * 100));
    }
  }

  await new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).delete(uid);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to delete distance metadata.'));
  });
}
