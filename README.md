# Timeline Pins

Timeline Pins lets you import your exported Google Maps Timeline JSON files in the browser and explore every place you have visited on a private, interactive map.

> **Clerk Google Sign-In + On-Device IndexedDB**
> Authentication uses **Clerk** (`Sign in with Google`) with redirect-based OAuth (no popup blockers, no database server that pauses after inactivity). Your parsed places and distance totals are stored privately in your browser's **IndexedDB**, and raw Timeline files are never uploaded.

---

## Setup Instructions

### 1. Create a Clerk Application (free)
1. Go to the [Clerk Dashboard](https://dashboard.clerk.com/) and create an application.
2. Enable **Google** under **User & Authentication → Social Connections** (Clerk provides shared Google OAuth keys in development; for production on your own domain, add your Google OAuth credentials in Clerk).
3. Copy your **Publishable Key** (`pk_test_...` or `pk_live_...`) from **API Keys**.

### 2. Configure `.env` (and Vercel Environment Variables)
Add your key to `.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

When deploying to **Vercel**, add `VITE_CLERK_PUBLISHABLE_KEY` under **Project Settings → Environment Variables** and redeploy. (`vercel.json` is included so `/sso-callback` routes back to the app cleanly.)

### 3. Run Locally

```bash
npm install
npm run dev
```

---

## Features

- **Browser-side Web Worker parser** (`src/workers/parse.worker.js`): Handles large 50 MB+ JSON files without freezing the UI.
- **Supports all 3 Google Timeline export formats**:
  - New on-device `Timeline.json` (`semanticSegments` with `"12.3456°, 78.9012°"` coordinates)
  - Android on-device array format (`[{ visit: { topCandidate: { placeLocation: "geo:..." } } }]`)
  - Google Takeout **Semantic Location History** monthly files (`timelineObjects` with `latitudeE7` / `longitudeE7`)
- **Smart deduplication & distance tracking**: Groups repeat visits within 4 decimal places (~10 m), merges same-named campus/venue pins within 5 km, tracks `visitCount`, `firstVisit`, `lastVisit`, year histograms, and total **kilometers traveled**.
- **Interactive Leaflet map**:
  - Esri World Topo real-world map tiles (no API key required) with light & dark mode
  - Smooth 60fps wheel zoom (`SmoothWheelZoom`) + `+` / `−` / `Fit all` controls
  - Animated marker clusters (`leaflet.markercluster`) and thermal heatmap (`leaflet.heat`)
  - Searchable **Visited Places** directory with date ranges and visit counts
- **Optional reverse geocoding**: Name unnamed spots with OpenStreetMap Nominatim (1 req/sec, most-visited first) or an optional `VITE_GOOGLE_MAPS_API_KEY`.
- **Portable backup**: Export your aggregated places as JSON anytime from **Settings**, or wipe all data with **Delete all my data**.

---

## Testing & Build

Sample files for all supported formats are in `/samples`:

```bash
npm test
npm run build
```
