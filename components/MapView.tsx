'use client';
import { useRef, useState } from 'react';
import { Box, Map as MapIcon } from 'lucide-react';
import LeafletMap from './LeafletMap';
import Map3D from './Map3D';
import type { Facility } from '@/lib/facilities';
export type MapCamera = { center: [number, number]; zoom: number };
export type MapProps = {
  facilities: Facility[];
  selected: Facility | null;
  onSelect: (f: Facility) => void;
  origin?: { latitude: number; longitude: number; accuracy: number } | null;
};
export default function MapView(props: MapProps) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [fallback, setFallback] = useState('');
  const camera = useRef<MapCamera>({ center: [107.099, -6.297], zoom: 14 });
  return (
    <>
      {mode === '2d' ? (
        <LeafletMap {...props} camera={camera} />
      ) : (
        <Map3D
          {...props}
          camera={camera}
          onFallback={() => {
            setMode('2d');
            setFallback(
              'Mode 3D tidak dapat dijalankan. Peta 2D tetap tersedia.',
            );
          }}
        />
      )}
      <fieldset className="view-mode" aria-label="Mode tampilan peta">
        <button
          aria-pressed={mode === '2d'}
          onClick={() => {
            setMode('2d');
            setFallback('');
          }}
        >
          <MapIcon size={15} />
          2D
        </button>
        <button
          aria-pressed={mode === '3d'}
          onClick={() => {
            setMode('3d');
            setFallback('');
          }}
        >
          <Box size={15} />
          3D
        </button>
      </fieldset>
      {fallback && <output className="three-status">{fallback}</output>}
    </>
  );
}
