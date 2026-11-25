import L from 'leaflet';

// Ensure Leaflet plugins find global L in Vite ESM bundles
if (typeof window !== 'undefined') {
  window.L = L;
}

import 'leaflet.markercluster';
import 'leaflet.heat';

export default L;
