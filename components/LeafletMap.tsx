'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Plus, Minus, Maximize, RefreshCw } from 'lucide-react';
import type * as Leaflet from 'leaflet';
import type { MapCamera } from './MapView';
import type { Facility } from '@/lib/facilities';
export default function LeafletMap({
  facilities,
  selected,
  onSelect,
  origin,
  camera,
}: {
  camera: RefObject<MapCamera>;
  facilities: Facility[];
  selected: Facility | null;
  onSelect: (f: Facility) => void;
  origin?: { latitude: number; longitude: number; accuracy: number } | null;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<Leaflet.Map | null>(null),
    layer = useRef<Leaflet.LayerGroup | null>(null),
    leaflet = useRef<typeof Leaflet | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false,
      observer: ResizeObserver | undefined;
    Promise.all([
      import('leaflet'),
      fetch('/map-config.json').then(async (r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<{
          tile_url: string;
          attribution: string;
          center: [number, number];
          zoom: number;
        }>;
      }),
    ])
      .then(([L, config]) => {
        if (disposed || !container.current) return;
        if (
          typeof config.tile_url !== 'string' ||
          !config.tile_url.startsWith('https://') ||
          !Array.isArray(config.center) ||
          config.center.length !== 2 ||
          !config.center.every(Number.isFinite)
        )
          throw Error();
        leaflet.current = L;
        const m = L.map(container.current, { zoomControl: false }).setView(
          [camera.current.center[1], camera.current.center[0]],
          camera.current.zoom,
        );
        map.current = m;
        m.on('moveend', () => {
          camera.current = {
            center: [m.getCenter().lng, m.getCenter().lat],
            zoom: m.getZoom(),
          };
        });
        const tiles = L.tileLayer(config.tile_url, {
          maxZoom: 19,
          attribution: config.attribution,
        }).addTo(m);
        tiles.on('tileerror', () => setError(true));
        layer.current = L.layerGroup().addTo(m);
        setReady(true);
        observer = new ResizeObserver(() => m.invalidateSize());
        observer.observe(container.current);
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      if (map.current) {
        camera.current = {
          center: [map.current.getCenter().lng, map.current.getCenter().lat],
          zoom: map.current.getZoom(),
        };
        map.current.remove();
      }
      map.current = null;
    };
  }, [attempt, camera]);
  useEffect(() => {
    if (!ready || !layer.current || !leaflet.current) return;
    layer.current.clearLayers();
    const L = leaflet.current,
      group = layer.current;
    const symbols: Record<string, string> = {
      resto_cafe: 'C',
      hotel: 'H',
      food_court: 'F',
      atm: 'A',
      medical: '+',
      public_facility: 'i',
    };
    facilities.forEach((f) => {
      const icon = L.divIcon({
        className: 'map-pin tone-' + f.category,
        html: '<span><b>' + symbols[f.category] + '</b></span>',
        iconSize: [38, 44],
        iconAnchor: [19, 44],
      });
      L.marker([f.latitude, f.longitude], { icon, title: f.name, alt: f.name })
        .addTo(group)
        .on('click', () => onSelect(f));
    });
  }, [facilities, ready, onSelect]);
  useEffect(() => {
    if (ready && selected)
      map.current?.panTo([selected.latitude, selected.longitude]);
  }, [selected, ready]);
  useEffect(() => {
    if (!ready || !origin || !map.current || !leaflet.current) return;
    const L = leaflet.current;
    const circle = L.circle([origin.latitude, origin.longitude], {
      radius: origin.accuracy,
      color: '#397fc0',
      fillOpacity: 0.08,
      weight: 1,
    }).addTo(map.current);
    const dot = L.circleMarker([origin.latitude, origin.longitude], {
      radius: 7,
      color: '#fff',
      weight: 3,
      fillColor: '#397fc0',
      fillOpacity: 1,
    }).addTo(map.current);
    return () => {
      circle.remove();
      dot.remove();
    };
  }, [origin, ready]);
  return (
    <>
      <div ref={container} className="leaflet-map" />
      <div className="map-controls">
        <button
          aria-label="Perbesar peta"
          onClick={() => map.current?.zoomIn()}
        >
          <Plus size={19} />
        </button>
        <button
          aria-label="Perkecil peta"
          onClick={() => map.current?.zoomOut()}
        >
          <Minus size={19} />
        </button>
        <button
          aria-label="Kembali ke kawasan"
          onClick={() => map.current?.setView([-6.297, 107.099], 14)}
        >
          <Maximize size={18} />
        </button>
      </div>
      {error && (
        <output className="map-error">
          Sebagian peta gagal dimuat. Daftar tetap bisa digunakan.
          <button
            onClick={() => {
              setError(false);
              setReady(false);
              setAttempt((n) => n + 1);
            }}
          >
            <RefreshCw size={14} />
            Coba lagi
          </button>
        </output>
      )}
    </>
  );
}
