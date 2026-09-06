'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
export function useDeviceLocation() {
  const [origin, setOrigin] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [gpsState, setGpsState] = useState(
    'Izin lokasi diperlukan untuk memusatkan peta ke perangkat Anda.',
  );
  const [locating, setLocating] = useState(true);
  const sequence = useRef(0);
  const locate = useCallback(() => {
    const id = ++sequence.current;
    if (!navigator.geolocation) {
      setLocating(false);
      setGpsState('Browser tidak mendukung lokasi. Gunakan peta kawasan.');
      return;
    }
    setLocating(true);
    setGpsState('Meminta izin lokasi perangkat…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (id !== sequence.current) return;
        setOrigin({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        });
        setLocating(false);
        setGpsState(
          'Lokasi perangkat · akurasi ±' + Math.round(p.coords.accuracy) + ' m',
        );
      },
      (e) => {
        if (id !== sequence.current) return;
        setLocating(false);
        setGpsState(
          e.code === 1
            ? 'Izin lokasi ditolak. Anda tetap dapat menjelajahi kawasan.'
            : e.code === 3
              ? 'Lokasi belum ditemukan dalam 10 detik. Coba lagi atau jelajahi kawasan.'
              : 'Lokasi tidak tersedia. Coba lagi atau jelajahi kawasan.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);
  const clear = useCallback(() => {
    sequence.current++;
    setOrigin(null);
    setLocating(false);
    setGpsState('Lokasi perangkat dihapus dari sesi.');
  }, []);
  const cancelRequests = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => locate());
    return () => {
      cancelAnimationFrame(frame);
      cancelRequests();
    };
  }, [locate, cancelRequests]);
  return { origin, gpsState, locating, locate, clear };
}
