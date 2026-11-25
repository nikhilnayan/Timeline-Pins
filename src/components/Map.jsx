import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Plus, Minus, Crosshair } from 'lucide-react';
import L from '../lib/leafletSetup.js';

const REAL_MAP_TILES = {
  url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, USGS, FAO, NPS, NRCAN, GeoBase',
};

function formatDate(iso) {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPopupContent(place) {
  const title = place.name
    ? escapeHtml(place.name)
    : `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`;
  const coords = `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  const visitsLabel = `${place.visitCount} visit${place.visitCount === 1 ? '' : 's'}`;

  return `
    <div style="min-width:215px;max-width:265px;font-family:'DM Sans',system-ui,sans-serif;">
      <div style="font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:15px;line-height:1.25;margin-bottom:3px;">${title}</div>
      ${
        place.name
          ? `<div style="font-size:11px;opacity:0.72;font-family:'JetBrains Mono',monospace;margin-bottom:4px;">${coords}</div>`
          : ''
      }
      ${
        place.address
          ? `<div style="font-size:11px;opacity:0.78;line-height:1.35;margin-bottom:6px;">${escapeHtml(
              place.address
            )}</div>`
          : ''
      }
      <div style="display:inline-block;background:rgba(154,126,59,0.2);color:#9a7e3b;font-family:'JetBrains Mono',monospace;font-weight:600;font-size:11px;padding:2px 8px;border-radius:4px;margin-bottom:8px;">
        ${visitsLabel}
      </div>
      <div style="font-size:12px;line-height:1.5;opacity:0.88;margin-bottom:10px;">
        <div><span style="opacity:0.65;">First:</span> ${escapeHtml(formatDate(place.firstVisit))}</div>
        <div><span style="opacity:0.65;">Last:</span> ${escapeHtml(formatDate(place.lastVisit))}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid rgba(154,126,59,0.28);padding-top:8px;">
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
           style="font-size:12px;font-weight:600;color:#9a7e3b;text-decoration:none;">
          Open in Google Maps ↗
        </a>
        <button type="button" data-delete-place="${escapeHtml(place.id)}"
           style="font-size:11px;font-weight:600;color:#b91c1c;background:transparent;border:none;cursor:pointer;padding:2px 4px;">
          Delete
        </button>
      </div>
    </div>
  `;
}

/**
 * 60fps continuous wheel-zoom controller that avoids Leaflet's stepped debounce jumping.
 * Uses GPU-accelerated pinch-style _move during wheeling and settles once on _moveEnd.
 */
function SmoothWheelZoom() {
  const map = useMap();

  useEffect(() => {
    if (!map) return undefined;

    const container = map.getContainer();
    let isWheeling = false;
    let moved = false;
    let goalZoom = map.getZoom();
    let wheelMousePos = null;
    let centerPoint = null;
    let animId = null;
    let settleTimer = null;

    const updateZoom = () => {
      if (!isWheeling) return;

      const currentZoom = map.getZoom();
      const diff = goalZoom - currentZoom;

      if (Math.abs(diff) > 0.002) {
        if (!moved) {
          map._moveStart(true, false);
          moved = true;
        }

        const nextZoom = currentZoom + diff * 0.22;
        const scale = map.getZoomScale(nextZoom, currentZoom);
        const mouseOffset = wheelMousePos.subtract(centerPoint);
        const newCenterPoint = centerPoint.add(mouseOffset.multiplyBy(1 - 1 / scale));
        const nextCenter = map.containerPointToLatLng(newCenterPoint);

        map._move(nextCenter, nextZoom, { pinch: true, round: false });
      }

      animId = requestAnimationFrame(updateZoom);
    };

    const onWheelEnd = () => {
      isWheeling = false;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      if (moved) {
        moved = false;
        map._moveEnd(true);
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isWheeling) {
        isWheeling = true;
        moved = false;
        map._stop();
        if (map._panAnim) map._panAnim.stop();
        goalZoom = map.getZoom();
        centerPoint = map.getSize().divideBy(2);
        animId = requestAnimationFrame(updateZoom);
      }

      let delta = -e.deltaY;
      if (e.deltaMode === 1) delta *= 24;
      else if (e.deltaMode === 2) delta *= 120;

      // Clamp single-tick impulses so fast mouse wheels stay controlled
      delta = Math.max(-240, Math.min(240, delta));

      goalZoom = Math.max(
        map.getMinZoom(),
        Math.min(map.getMaxZoom(), goalZoom + delta * 0.0032)
      );
      wheelMousePos = map.mouseEventToContainerPoint(e);

      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(onWheelEnd, 140);
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
      if (settleTimer) clearTimeout(settleTimer);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [map]);

  return null;
}

function ClusterAndHeatLayer({ places, viewMode, onDeletePlace }) {
  const map = useMap();
  const deleteHandlerRef = useRef(onDeletePlace);
  deleteHandlerRef.current = onDeletePlace;

  useEffect(() => {
    if (!map) return;

    if (viewMode === 'heatmap') {
      if (!places.length) return;
      const maxVisits = Math.max(1, ...places.map((p) => p.visitCount || 1));
      const maxLog = Math.log1p(maxVisits);
      const heatPoints = places.map((p) => {
        const visits = p.visitCount || 1;
        const intensity =
          maxLog > 0 ? Math.max(0.35, Math.min(1, Math.log1p(visits) / maxLog)) : 0.5;
        return [p.lat, p.lng, intensity];
      });

      const heatLayer = L.heatLayer(heatPoints, {
        radius: 24,
        blur: 16,
        minOpacity: 0.52,
        maxZoom: 14,
        max: 1.0,
        gradient: {
          0.15: '#2f6f5e',
          0.4: '#d4a72c',
          0.68: '#e05a2b',
          0.9: '#9e1c1c',
          1.0: '#5c0b0b',
        },
      });

      heatLayer.addTo(map);

      // Keep heatmap aligned smoothly during continuous pinch/wheel zoom
      let baseZoom = map.getZoom();
      let baseCenter = map.getCenter();
      const onMoveEnd = () => {
        baseZoom = map.getZoom();
        baseCenter = map.getCenter();
        if (heatLayer._canvas) {
          L.DomUtil.setTransform(heatLayer._canvas, L.point(0, 0), 1);
        }
      };
      const onZoom = () => {
        if (!heatLayer._canvas) return;
        const currentZoom = map.getZoom();
        const scale = map.getZoomScale(currentZoom, baseZoom);
        const offset = map
          ._getCenterOffset(baseCenter)
          ._multiplyBy(-scale)
          .subtract(map._getMapPanePos());
        L.DomUtil.setTransform(heatLayer._canvas, offset, scale);
      };

      map.on('zoom', onZoom);
      map.on('moveend', onMoveEnd);

      return () => {
        map.off('zoom', onZoom);
        map.off('moveend', onMoveEnd);
        map.removeLayer(heatLayer);
      };
    }

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      animate: true,
      animateAddingMarkers: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let sizeClass = 'cluster-sm';
        let dim = 36;
        if (count >= 100) {
          sizeClass = 'cluster-lg';
          dim = 46;
        } else if (count >= 15) {
          sizeClass = 'cluster-md';
          dim = 40;
        }
        return L.divIcon({
          html: `<div class="timeline-cluster-badge ${sizeClass}">${count}</div>`,
          className: 'timeline-cluster-icon',
          iconSize: L.point(dim, dim),
        });
      },
    });

    const pinIcon = L.divIcon({
      html: '<div class="timeline-pin-dot"></div>',
      className: 'timeline-pin-wrapper',
      iconSize: [15, 15],
      iconAnchor: [7.5, 7.5],
      popupAnchor: [0, -10],
    });

    const markers = places.map((place) => {
      const marker = L.marker([place.lat, place.lng], { icon: pinIcon });
      marker.bindPopup(() => buildPopupContent(place), {
        maxWidth: 280,
      });
      return marker;
    });

    clusterGroup.addLayers(markers);
    map.addLayer(clusterGroup);

    const handlePopupOpen = (e) => {
      const el = e.popup.getElement();
      if (!el) return;
      const btn = el.querySelector('[data-delete-place]');
      if (btn) {
        btn.onclick = () => {
          const id = btn.getAttribute('data-delete-place');
          if (id && deleteHandlerRef.current) {
            map.closePopup();
            deleteHandlerRef.current(id);
          }
        };
      }
    };

    map.on('popupopen', handlePopupOpen);

    return () => {
      map.off('popupopen', handlePopupOpen);
      map.removeLayer(clusterGroup);
    };
  }, [map, places, viewMode]);

  return null;
}

function MapBoundsAndZoomControls({ places, zoomTrigger, focusedPlace }) {
  const map = useMap();
  const hasAutoFittedRef = useRef(false);

  const fitAll = () => {
    if (!places.length) return;
    if (places.length === 1) {
      map.flyTo([places[0].lat, places[0].lng], 13, {
        animate: true,
        duration: 0.55,
      });
      return;
    }
    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [64, 64],
        maxZoom: 15,
        animate: true,
        duration: 0.55,
      });
    }
  };

  useEffect(() => {
    if (places.length > 0 && !hasAutoFittedRef.current && !focusedPlace) {
      hasAutoFittedRef.current = true;
      fitAll();
    }
    if (places.length === 0) {
      hasAutoFittedRef.current = false;
    }
  }, [places, focusedPlace]);

  useEffect(() => {
    if (focusedPlace) {
      hasAutoFittedRef.current = true;
      map.flyTo([focusedPlace.lat, focusedPlace.lng], 16, {
        animate: true,
        duration: 0.65,
      });
    }
  }, [focusedPlace, map]);

  useEffect(() => {
    if (zoomTrigger > 0) {
      fitAll();
    }
  }, [zoomTrigger]);

  return (
    <div className="pointer-events-auto fixed right-3 top-[4.5rem] z-[900] flex flex-col overflow-hidden rounded-lg border border-moss-900/20 bg-parchment-50/95 shadow-atlas backdrop-blur-md dark:border-parchment-200/20 dark:bg-moss-900/95 dark:shadow-atlas-dark sm:right-4">
      <button
        type="button"
        onClick={() => map.zoomIn(1, { animate: true })}
        aria-label="Zoom in"
        title="Zoom in"
        className="flex h-9 w-9 items-center justify-center border-b border-moss-900/15 text-moss-900 transition hover:bg-parchment-200/60 dark:border-parchment-200/15 dark:text-parchment-200 dark:hover:bg-moss-800"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut(1, { animate: true })}
        aria-label="Zoom out"
        title="Zoom out"
        className="flex h-9 w-9 items-center justify-center border-b border-moss-900/15 text-moss-900 transition hover:bg-parchment-200/60 dark:border-parchment-200/15 dark:text-parchment-200 dark:hover:bg-moss-800"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={fitAll}
        disabled={!places.length}
        aria-label="Fit all pins"
        title="Fit all pins"
        className="flex h-9 w-9 items-center justify-center text-brass-600 transition hover:bg-parchment-200/60 disabled:opacity-40 dark:text-brass-400 dark:hover:bg-moss-800"
      >
        <Crosshair className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Map({ places, viewMode, zoomTrigger, focusedPlace, onDeletePlace }) {
  return (
    <MapContainer
      center={[24, 12]}
      zoom={2.5}
      minZoom={2}
      maxZoom={19}
      zoomSnap={0}
      zoomDelta={1}
      scrollWheelZoom={false}
      zoomAnimation={true}
      fadeAnimation={true}
      markerZoomAnimation={true}
      zoomControl={false}
      className="z-0 h-full w-full"
    >
      <TileLayer
        url={REAL_MAP_TILES.url}
        attribution={REAL_MAP_TILES.attribution}
        maxNativeZoom={18}
        maxZoom={19}
        updateWhenIdle={true}
        keepBuffer={2}
      />
      <SmoothWheelZoom />
      <ClusterAndHeatLayer
        places={places}
        viewMode={viewMode}
        onDeletePlace={onDeletePlace}
      />
      <MapBoundsAndZoomControls
        places={places}
        zoomTrigger={zoomTrigger}
        focusedPlace={focusedPlace}
      />
    </MapContainer>
  );
}
