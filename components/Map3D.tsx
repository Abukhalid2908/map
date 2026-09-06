'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Plus, Minus, Maximize, Compass, RefreshCw } from 'lucide-react';
import type * as ML from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { MapProps, MapCamera } from './MapView';
type Config = {
  vector_style_url: string;
  center: [number, number];
  zoom: number;
};
export default function Map3D({
  facilities,
  selected,
  onSelect,
  origin,
  camera,
  onFallback,
}: MapProps & { camera: RefObject<MapCamera>; onFallback: () => void }) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<ML.Map | null>(null),
    engine = useRef<typeof ML | null>(null);
  const fallbackRef = useRef(onFallback);
  useEffect(() => {
    fallbackRef.current = onFallback;
  }, [onFallback]);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0),
    [buildingCount, setBuildingCount] = useState<number | null>(null);
  const [buildingTarget, setBuildingTarget] = useState<[number, number] | null>(
    null,
  );
  const reducedMotion = useRef(false);
  useEffect(() => {
    let disposed = false,
      observer: ResizeObserver | undefined,
      timer: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    Promise.all([
      import('maplibre-gl'),
      fetch('/map-config.json', { signal: abort.signal }).then(async (r) => {
        if (!r.ok) throw Error('Konfigurasi peta gagal dimuat.');
        return r.json() as Promise<Config>;
      }),
    ])
      .then(([lib, config]) => {
        if (disposed || !container.current) return;
        if (
          typeof config.vector_style_url !== 'string' ||
          !config.vector_style_url.startsWith('https://')
        )
          throw Error('Sumber peta 3D tidak valid.');
        engine.current = lib;
        lib.setWorkerUrl(workerUrl);
        reducedMotion.current = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        let m: ML.Map;
        try {
          m = new lib.Map({
            container: container.current,
            style: config.vector_style_url,
            center: camera.current.center,
            zoom: Math.max(camera.current.zoom, 15.8),
            pitch: 55,
            bearing: -18,
            maxPitch: 65,
            maxZoom: 19,
            attributionControl: { compact: false },
            canvasContextAttributes: { antialias: false },
          });
        } catch {
          fallbackRef.current();
          return;
        }
        map.current = m;
        m.getCanvas().addEventListener(
          'webglcontextlost',
          () => {
            if (!disposed) fallbackRef.current();
          },
          { signal: abort.signal },
        );
        timer = setTimeout(() => {
          if (!disposed && !m.isStyleLoaded())
            setError('Peta 3D terlalu lama dimuat. Coba lagi atau gunakan 2D.');
        }, 20000);
        m.on('error', () => {
          if (!disposed)
            setError(
              'Sebagian data peta 3D gagal dimuat. Anda dapat mencoba lagi atau beralih ke 2D.',
            );
        });
        m.on('load', () => {
          if (disposed) return;
          clearTimeout(timer);
          const layer = m.getLayer('building-3d');
          if (!layer) {
            setError('Lapisan bangunan belum tersedia dari penyedia.');
          } else {
            m.setFilter('building-3d', ['!=', ['get', 'hide_3d'], true]);
            m.setPaintProperty(
              'building-3d',
              'fill-extrusion-color',
              '#bbc9ad',
            );
            m.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.92);
            m.setPaintProperty('building-3d', 'fill-extrusion-height', [
              'max',
              0,
              ['to-number', ['get', 'render_height'], 0],
            ]);
            m.setPaintProperty('building-3d', 'fill-extrusion-base', [
              'max',
              0,
              ['to-number', ['get', 'render_min_height'], 0],
            ]);
          }
          setReady(true);
        });
        m.on('moveend', () => {
          camera.current = {
            center: m.getCenter().toArray() as [number, number],
            zoom: m.getZoom(),
          };
        });
        m.on('idle', () => {
          if (disposed || !m.getLayer('building-3d')) return;
          const features = m.queryRenderedFeatures({ layers: ['building-3d'] });
          setBuildingCount(features.length);
          const center = m.getCenter();
          const candidates = m
            .querySourceFeatures('openmaptiles', { sourceLayer: 'building' })
            .filter(
              (f) =>
                !f.properties.hide_3d && Number(f.properties.render_height) > 0,
            )
            .map((f) => {
              const values =
                f.geometry.type === 'Polygon'
                  ? f.geometry.coordinates.flat(2)
                  : f.geometry.type === 'MultiPolygon'
                    ? f.geometry.coordinates.flat(3)
                    : [];
              if (values.length < 4) return null;
              const lngs = values.filter((_, i) => i % 2 === 0),
                lats = values.filter((_, i) => i % 2 === 1);
              const point: [number, number] = [
                (Math.min(...lngs) + Math.max(...lngs)) / 2,
                (Math.min(...lats) + Math.max(...lats)) / 2,
              ];
              return point.every(Number.isFinite) ? point : null;
            })
            .filter((p): p is [number, number] => p !== null)
            .sort(
              (a, b) =>
                (a[0] - center.lng) ** 2 +
                (a[1] - center.lat) ** 2 -
                ((b[0] - center.lng) ** 2 + (b[1] - center.lat) ** 2),
            );
          const target = candidates[0] ?? null;
          setBuildingTarget((prev) =>
            prev?.[0] === target?.[0] && prev?.[1] === target?.[1]
              ? prev
              : target,
          );
        });
        observer = new ResizeObserver(() => m.resize());
        observer.observe(container.current);
      })
      .catch((e) => {
        if (!disposed && e.name !== 'AbortError')
          setError(e.message || 'Peta 3D gagal dimuat.');
      });
    return () => {
      disposed = true;
      abort.abort();
      clearTimeout(timer);
      observer?.disconnect();
      if (map.current) {
        camera.current = {
          center: map.current.getCenter().toArray() as [number, number],
          zoom: map.current.getZoom(),
        };
        map.current.remove();
        map.current = null;
      }
    };
  }, [attempt, camera]);
  useEffect(() => {
    if (!ready || !map.current || !engine.current) return;
    const m = map.current,
      lib = engine.current;
    const symbols: Record<string, string> = {
      resto_cafe: 'C',
      hotel: 'H',
      food_court: 'F',
      atm: 'A',
      medical: '+',
      public_facility: 'i',
    };
    const markers = facilities.map((f) => {
      const button = document.createElement('button');
      button.className =
        'gl-pin tone-' +
        f.category +
        (selected?.id === f.id ? ' selected' : '');
      button.title = f.name;
      button.setAttribute('aria-label', 'Lihat ' + f.name);
      const face = document.createElement('span');
      face.textContent = symbols[f.category] || 'i';
      button.appendChild(face);
      button.onclick = () => onSelect(f);
      return new lib.Marker({
        element: button,
        anchor: 'bottom',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport',
      })
        .setLngLat([f.longitude, f.latitude])
        .addTo(m);
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [facilities, onSelect, ready, selected?.id]);
  useEffect(() => {
    if (ready && selected)
      map.current?.easeTo({
        center: [selected.longitude, selected.latitude],
        zoom: Math.max(16, map.current.getZoom()),
        duration: reducedMotion.current ? 0 : 650,
      });
  }, [selected, ready]);
  useEffect(() => {
    if (!ready || !origin || !map.current || !engine.current) return;
    const point = document.createElement('div');
    point.className = 'gps-marker';
    point.title =
      'Lokasi perangkat, akurasi ±' + Math.round(origin.accuracy) + ' m';
    const marker = new engine.current.Marker({ element: point })
      .setLngLat([origin.longitude, origin.latitude])
      .addTo(map.current);
    return () => {
      marker.remove();
    };
  }, [origin, ready]);
  function reset() {
    map.current?.easeTo({
      center: [107.099, -6.297],
      zoom: 15.8,
      pitch: 55,
      bearing: -18,
      duration: reducedMotion.current ? 0 : 600,
    });
  }
  return (
    <>
      <div
        ref={container}
        className="vector-map"
        aria-label="Peta 3D bangunan kawasan"
      />
      <div className="map-controls">
        <button
          aria-label="Perbesar peta"
          disabled={!ready}
          onClick={() => map.current?.zoomIn()}
        >
          <Plus size={19} />
        </button>
        <button
          aria-label="Perkecil peta"
          disabled={!ready}
          onClick={() => map.current?.zoomOut()}
        >
          <Minus size={19} />
        </button>
        <button
          aria-label="Kembali ke kawasan"
          disabled={!ready}
          onClick={reset}
        >
          <Maximize size={18} />
        </button>
        <button
          aria-label="Arah utara di atas"
          disabled={!ready}
          onClick={() =>
            map.current?.easeTo({
              bearing: 0,
              duration: reducedMotion.current ? 0 : 400,
            })
          }
        >
          <Compass size={19} />
        </button>
      </div>
      <output className={'three-status' + (error ? ' is-error' : '')}>
        {error ? (
          <>
            {error}
            <button
              onClick={() => {
                setReady(false);
                setError('');
                setBuildingCount(null);
                setAttempt((n) => n + 1);
              }}
            >
              <RefreshCw size={13} />
              Coba lagi
            </button>
          </>
        ) : !ready ? (
          'Memuat peta 3D…'
        ) : buildingCount === 0 ? (
          'Bangunan belum terlihat. Perbesar peta atau geser ke area lain.'
        ) : (
          'Bangunan dari OpenStreetMap · Tinggi visual belum diverifikasi.'
        )}
        {ready && !error && buildingTarget && (
          <button
            onClick={() =>
              map.current?.easeTo({
                center: buildingTarget,
                zoom: 17,
                pitch: 55,
                duration: reducedMotion.current ? 0 : 650,
              })
            }
          >
            Fokus bangunan tersedia
          </button>
        )}
        {ready && !error && (
          <small>
            Geser dengan dua jari untuk memutar. Sebagian tinggi dapat berupa
            perkiraan.
          </small>
        )}
      </output>
    </>
  );
}
