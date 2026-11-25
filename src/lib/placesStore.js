import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';

const MAX_BATCH_SIZE = 500;

function ensureDb() {
  if (!db) {
    throw new Error('Firebase is not configured. Please check your .env settings.');
  }
}

/**
 * Load all aggregated places for a signed-in user from users/{uid}/places.
 */
export async function loadUserPlaces(uid) {
  ensureDb();
  const placesRef = collection(db, 'users', uid, 'places');
  const snapshot = await getDocs(placesRef);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/**
 * Load aggregated travel distance metadata from users/{uid}.
 */
export async function loadUserMeta(uid) {
  ensureDb();
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) {
    return { distanceKm: 0, distanceByYearKm: {} };
  }
  const data = snap.data() || {};
  return {
    distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : 0,
    distanceByYearKm:
      data.distanceByYearKm && typeof data.distanceByYearKm === 'object'
        ? data.distanceByYearKm
        : {},
  };
}

/**
 * Persist aggregated travel distance metadata on users/{uid}.
 */
export async function saveUserMeta(uid, { distanceKm, distanceByYearKm }) {
  ensureDb();
  await setDoc(
    doc(db, 'users', uid),
    {
      distanceKm: typeof distanceKm === 'number' ? distanceKm : 0,
      distanceByYearKm: distanceByYearKm || {},
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Persist aggregated places under users/{uid}/places using batched writes (max 500 per batch).
 * Deterministic place IDs ensure re-imports never create duplicate documents.
 */
export async function savePlacesBatched(uid, places, onProgress) {
  ensureDb();
  if (!places.length) return;

  const total = places.length;
  let written = 0;

  for (let i = 0; i < total; i += MAX_BATCH_SIZE) {
    const chunk = places.slice(i, i + MAX_BATCH_SIZE);
    const batch = writeBatch(db);

    for (const place of chunk) {
      const ref = doc(db, 'users', uid, 'places', place.id);
      batch.set(ref, {
        lat: place.lat,
        lng: place.lng,
        visitCount: place.visitCount,
        firstVisit: place.firstVisit || null,
        lastVisit: place.lastVisit || null,
        name: place.name || null,
        address: place.address || null,
        years: place.years || {},
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    written += chunk.length;
    if (onProgress) {
      onProgress(Math.round((written / total) * 100), written, total);
    }
  }
}

/**
 * Update names/addresses for a batch of geocoded places (cached in Firestore).
 */
export async function saveGeocodedNamesBatched(uid, updatedPlaces) {
  ensureDb();
  if (!updatedPlaces.length) return;

  for (let i = 0; i < updatedPlaces.length; i += MAX_BATCH_SIZE) {
    const chunk = updatedPlaces.slice(i, i + MAX_BATCH_SIZE);
    const batch = writeBatch(db);

    for (const place of chunk) {
      const ref = doc(db, 'users', uid, 'places', place.id);
      batch.set(
        ref,
        {
          name: place.name || null,
          address: place.address || null,
          geocodedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
  }
}

/**
 * Delete a single place document from users/{uid}/places.
 */
export async function deleteSinglePlace(uid, placeId) {
  ensureDb();
  const ref = doc(db, 'users', uid, 'places', placeId);
  await deleteDoc(ref);
}

/**
 * Delete all places (and user metadata doc) for the signed-in user in batches of max 500.
 */
export async function deleteAllUserData(uid, onProgress) {
  ensureDb();
  const placesRef = collection(db, 'users', uid, 'places');
  const snapshot = await getDocs(placesRef);
  const docs = snapshot.docs;
  const total = docs.length;

  for (let i = 0; i < total; i += MAX_BATCH_SIZE) {
    const chunk = docs.slice(i, i + MAX_BATCH_SIZE);
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    await batch.commit();
    if (onProgress) {
      onProgress(Math.round(((i + chunk.length) / (total || 1)) * 100));
    }
  }

  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch {
    // User root doc may not exist; ignore
  }
}
