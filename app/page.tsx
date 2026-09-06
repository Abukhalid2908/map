'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Search,
  ArrowUpRight,
  LocateFixed,
  Coffee,
  BedDouble,
  Utensils,
  Landmark,
  HeartPulse,
  Building2,
  ArrowRight,
  Layers,
  X,
  Compass,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  distanceKm,
  filterFacilities,
  navigationUrl,
  validateDataset,
} from '@/lib/data.mjs';
import Link from 'next/link';
import { flushSync } from 'react-dom';
import MapView from '@/components/MapView';
import { categories, demoFacilities, type Facility } from '@/lib/facilities';

export default function Home() {
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('all');
  const [selectedRecord, setSelected] = useState<Facility | null>(null);
  const [rows, setRows] = useState<Facility[]>([]),
    [demo, setDemo] = useState(false),
    [loading, setLoading] = useState(true),
    [dataError, setDataError] = useState(''),
    [retry, setRetry] = useState(0),
    [updated, setUpdated] = useState('');
  const [origin, setOrigin] = useState<{
      latitude: number;
      longitude: number;
      accuracy: number;
    } | null>(null),
    [gpsState, setGpsState] = useState(''),
    [locating, setLocating] = useState(false),
    [info, setInfo] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/facilities.json', { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw Error('Data fasilitas gagal dimuat.');
        const d = (await r.json()) as import('@/lib/data.mjs').Dataset;
        if (validateDataset(d, { publicOnly: true }).errors.length)
          throw Error('Dataset tidak valid. Silakan hubungi pengelola.');
        setRows(d.facilities);
        setUpdated(d.updated_at);
        setDemo(d.facilities.length === 0);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setDataError(e.message);
          setDemo(false);
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [retry]);
  function locate() {
    if (!navigator.geolocation) {
      setGpsState('Browser ini tidak mendukung lokasi perangkat.');
      return;
    }
    setLocating(true);
    setGpsState('Meminta lokasi untuk menghitung jarak langsung…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOrigin({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        });
        setLocating(false);
        setGpsState(
          'Asal: lokasi perangkat · akurasi ±' +
            Math.round(p.coords.accuracy) +
            ' m',
        );
      },
      (e) => {
        setLocating(false);
        setGpsState(
          e.code === 1
            ? 'Izin lokasi ditolak. Aktifkan izin browser lalu coba lagi.'
            : e.code === 3
              ? 'Permintaan lokasi melewati batas waktu. Coba lagi.'
              : 'Lokasi tidak tersedia. Coba lagi di tempat terbuka.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }
  const activeRows = demo ? demoFacilities : rows;
  const icons = [Coffee, BedDouble, Utensils, Landmark, HeartPulse, Building2];
  const filtered = useMemo(
    () => filterFacilities(activeRows, query, category),
    [activeRows, query, category],
  );
  const selected = filtered.find((f) => f.id === selectedRecord?.id) ?? null;
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = {
      name: 'search_facilities',
      description:
        'Cari fasilitas dan terapkan pencarian serta kategori pada peta dan daftar yang terlihat. Hasil demo diberi penanda.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          category: {
            type: 'string',
            enum: ['all', ...categories.map((c) => c.id)],
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input: unknown) => {
        const value = input as { query?: unknown; category?: unknown };
        if (
          !value ||
          typeof value.query !== 'string' ||
          Object.keys(value).some((k) => !['query', 'category'].includes(k)) ||
          (value.category !== undefined &&
            !['all', ...categories.map((c) => c.id)].includes(
              value.category as string,
            ))
        )
          throw Error('Input pencarian tidak valid.');
        if (loading || dataError) throw Error('Data belum tersedia.');
        const q = value.query,
          c = (value.category as string) || 'all';
        flushSync(() => {
          setQuery(q);
          setCategory(c);
          setSelected(null);
        });
        return {
          demo,
          results: filterFacilities(activeRows, q, c).map((f) => ({
            id: f.id,
            name: f.name,
            category: f.category,
          })),
        };
      },
    };
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [activeRows, demo, loading, dataError]);
  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <MapPin size={23} />
          </span>
          <span>
            MM<span className="brand-number">2100</span>
            <small>JELAJAH KAWASAN</small>
          </span>
        </Link>
        <div className="header-location">
          <span className="status-dot" /> Cikarang Barat, Bekasi
        </div>
        <button className="header-note" onClick={() => setInfo(true)}>
          Tentang direktori <ArrowUpRight size={15} />
        </button>
      </header>
      <div className="workspace">
        <aside className="directory">
          <div className="directory-head">
            <div className="eyebrow">DI SEKITAR KAWASAN</div>
            <h1>
              Temukan tempat
              <br />
              yang Anda butuhkan<span>.</span>
            </h1>
            <p>Makan siang, menginap, atau keperluan sehari-hari.</p>
            <label className="search-box">
              <Search size={19} />
              <input
                aria-label="Cari fasilitas"
                placeholder="Cari tempat, fasilitas, atau menu…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  aria-label="Hapus pencarian"
                  onClick={() => setQuery('')}
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <div className="category-chips">
              <button
                className={category === 'all' ? 'active' : ''}
                onClick={() => setCategory('all')}
              >
                <Layers size={14} />
                Semua
              </button>
              {categories.map((c, i) => {
                const Icon = icons[i];
                return (
                  <button
                    key={c.id}
                    className={category === c.id ? 'active' : ''}
                    onClick={() => setCategory(c.id)}
                  >
                    <Icon size={14} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="result-bar">
            <strong>{filtered.length} tempat</strong>
            <button
              className="demo-toggle"
              onClick={() => {
                setDemo(!demo);
                setSelected(null);
              }}
            >
              {demo ? 'Lihat data nyata' : 'Coba demo'}
            </button>
          </div>
          <div className="facility-list" aria-live="polite">
            {loading ? (
              <div className="empty-state">Memuat data fasilitas…</div>
            ) : dataError && !demo ? (
              <div className="empty-state" role="alert">
                <h2>Data belum bisa dimuat</h2>
                <p>{dataError}</p>
                <button
                  onClick={() => {
                    setLoading(true);
                    setDataError('');
                    setRetry((n) => n + 1);
                  }}
                >
                  Coba lagi
                </button>
              </div>
            ) : (
              filtered.map((f) => {
                const ci = categories.findIndex((c) => c.id === f.category),
                  Icon = icons[ci];
                return (
                  <button
                    className="facility-card"
                    key={f.id}
                    onClick={() => setSelected(f)}
                  >
                    <span className={'facility-icon tone-' + f.category}>
                      <Icon size={23} />
                    </span>
                    <span className="facility-copy">
                      <span className="category-label">
                        {categories[ci].label}
                      </span>
                      <strong>{f.name}</strong>
                      <span className="facility-address">{f.address}</span>
                      <span className="facility-tags">
                        {f.tags.slice(0, 2).map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </span>
                    </span>
                    <ArrowRight size={17} className="card-arrow" />
                  </button>
                );
              })
            )}
            {!loading && !dataError && !filtered.length && (
              <div className="empty-state">
                <Search />
                <h2>
                  {!rows.length && !demo
                    ? 'Data terverifikasi belum tersedia'
                    : 'Belum ada hasil'}
                </h2>
                <p>
                  {!rows.length && !demo
                    ? 'Coba mode demo untuk menjelajahi fitur aplikasi.'
                    : 'Coba kata kunci lain atau tampilkan semua kategori.'}
                </p>
                <button
                  onClick={() => {
                    setQuery('');
                    setCategory('all');
                  }}
                >
                  Reset pencarian
                </button>
              </div>
            )}
          </div>
          <footer className="directory-footer">
            <span className="status-dot" />
            {demo
              ? 'Contoh fasilitas · Belum untuk panduan perjalanan'
              : updated
                ? 'Data diperbarui ' +
                  new Date(updated).toLocaleDateString('id-ID')
                : 'Belum ada dataset'}
          </footer>
        </aside>
        <section className="map-area" aria-label="Peta kawasan">
          <MapView
            facilities={filtered}
            selected={selected}
            onSelect={setSelected}
            origin={origin}
          />
          <div className="map-heading">
            <Compass size={18} />
            <span>
              <strong>Jelajahi MM2100</strong>
              <small>Peta fasilitas kawasan</small>
            </span>
          </div>
          <div className="location-control">
            <button onClick={locate} disabled={locating}>
              <LocateFixed size={16} />
              {locating ? 'Mencari lokasi…' : 'Gunakan lokasi saya'}
            </button>
            {origin && (
              <button
                aria-label="Hapus lokasi perangkat"
                onClick={() => {
                  setOrigin(null);
                  setGpsState('Lokasi perangkat dihapus dari sesi.');
                }}
              >
                <X size={15} />
              </button>
            )}
            <small>Lokasi hanya dipakai selama sesi ini.</small>
            {gpsState && <output>{gpsState}</output>}
          </div>
          <div className="demo-notice">
            <span className="notice-dot" />
            {demo ? 'Mode demo' : 'Direktori kawasan'}
            <span>
              {demo
                ? 'Nama dan titik fasilitas adalah contoh.'
                : origin
                  ? 'Jarak langsung dari lokasi perangkat.'
                  : 'Pilih fasilitas untuk melihat detail.'}
            </span>
          </div>
        </section>
      </div>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="detail-sheet">
          {selected && (
            <>
              <div className={'detail-visual tone-' + selected.category}>
                <MapPin size={55} />
                <span>
                  {selected.demo ? 'CONTOH FASILITAS' : 'DIREKTORI KAWASAN'}
                </span>
              </div>
              <div className="detail-body">
                <span className="eyebrow">
                  {categories.find((c) => c.id === selected.category)?.label}
                </span>
                <SheetTitle className="detail-title">
                  {selected.name}
                </SheetTitle>
                <SheetDescription>{selected.address}</SheetDescription>
                {selected.demo && (
                  <div className="detail-note">
                    Data ini merupakan contoh untuk mencoba aplikasi. Lokasi
                    belum diverifikasi; navigasi dinonaktifkan.
                  </div>
                )}
                <h3>Fasilitas & informasi</h3>
                <div className="facility-tags">
                  {selected.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <dl>
                  <dt>Jam buka</dt>
                  <dd>{selected.opening_hours || 'Belum tersedia'}</dd>
                  <dt>Telepon</dt>
                  <dd>{selected.phone || 'Belum tersedia'}</dd>
                  <dt>Website</dt>
                  <dd>
                    {selected.website ? (
                      <a
                        href={selected.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buka website ↗
                      </a>
                    ) : (
                      'Belum tersedia'
                    )}
                  </dd>
                  <dt>Verifikasi</dt>
                  <dd>{selected.verified_at || 'Belum diverifikasi'}</dd>
                  <dt>Sumber</dt>
                  <dd>{selected.source || 'Data demonstrasi'}</dd>
                </dl>
                {origin && (
                  <p className="distance-note">
                    <strong>
                      {distanceKm(origin, selected).toFixed(2)} km
                    </strong>
                    <br />
                    Jarak langsung (garis lurus), bukan jarak perjalanan.
                    <br />
                    Asal: lokasi perangkat{' '}
                    {selected.demo ? '· Tujuan ilustrasi' : ''}
                  </p>
                )}
                {!selected.demo ? (
                  <>
                    <a
                      className="primary-button"
                      href={navigationUrl(selected, origin)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Buka navigasi Google Maps <ArrowUpRight size={16} />
                    </a>
                    <p className="privacy-note">
                      Koordinat tujuan
                      {origin ? ' dan lokasi perangkat Anda' : ''} diteruskan ke
                      Google Maps saat tautan dibuka.
                    </p>
                  </>
                ) : (
                  <button className="primary-button" disabled>
                    Navigasi tidak tersedia untuk demo
                  </button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={info} onOpenChange={setInfo}>
        <DialogContent className="about-dialog">
          <DialogTitle>Tentang direktori MM2100</DialogTitle>
          <DialogDescription>
            Temukan fasilitas di sekitar kawasan melalui peta atau daftar.
          </DialogDescription>
          <p>
            Data fasilitas diperbarui oleh pengelola, bukan secara real-time.
            Periksa tanggal verifikasi pada detail. Mode demo berisi contoh,
            bukan rekomendasi tempat nyata.
          </p>
          <p>
            Lokasi perangkat diminta hanya saat Anda menekan tombol lokasi,
            disimpan di memori sesi, dan tidak masuk dataset. Titik acuan pintu
            tol belum tersedia karena belum diverifikasi.
          </p>
          <p>
            Peta 2D menggunakan OpenStreetMap; peta 3D menggunakan OpenFreeMap
            dengan data OpenStreetMap. Bentuk dan tinggi bangunan mengikuti data
            penyedia dan belum diverifikasi melalui survei. Tidak ada unduhan
            peta offline.
          </p>
          <a
            href="https://www.openstreetmap.org/fixthemap"
            target="_blank"
            rel="noopener noreferrer"
          >
            Laporkan masalah peta ↗
          </a>
        </DialogContent>
      </Dialog>
    </main>
  );
}
