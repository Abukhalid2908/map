'use client';
import { Cable, CircleDot, Search, Waypoints } from 'lucide-react';
import type {
  Infrastructure,
  InfrastructureCategory,
} from '@/lib/infrastructure';

export default function InfrastructureDirectory({
  rows,
  categories,
  query,
  setQuery,
  selected,
  onSelect,
}: {
  rows: Infrastructure[];
  categories: InfrastructureCategory[];
  query: string;
  setQuery: (value: string) => void;
  selected: Infrastructure | null;
  onSelect: (item: Infrastructure) => void;
}) {
  return (
    <>
      <div className="directory-head plot-directory-head">
        <span className="eyebrow">INFRASTRUKTUR KAWASAN</span>
        <h1>Jaringan & aset</h1>
        <p>Temukan titik aset dan jalur utilitas yang telah diterbitkan.</p>
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label="Cari infrastruktur"
            placeholder="Cari nama atau jenis aset…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="plot-summary infra-summary">
          <span>
            <strong>
              {rows.filter((item) => item.geometry_type === 'point').length}
            </strong>{' '}
            titik
          </span>
          <span>
            <strong>
              {rows.filter((item) => item.geometry_type === 'line').length}
            </strong>{' '}
            jalur
          </span>
        </div>
      </div>
      <div className="result-bar">
        <strong>{rows.length} aset</strong>
      </div>
      <div className="facility-list infra-public-list" aria-live="polite">
        {rows.length ? (
          rows.map((item) => {
            const category = categories.find(
              (entry) => entry.id === item.category,
            );
            const Icon = item.geometry_type === 'point' ? CircleDot : Waypoints;
            return (
              <button
                key={item.id}
                className="facility-card"
                aria-pressed={selected?.id === item.id}
                onClick={() => onSelect(item)}
              >
                <span
                  className="infra-public-icon"
                  style={{ backgroundColor: category?.color || '#397fc0' }}
                >
                  <Icon size={21} />
                </span>
                <span className="facility-copy">
                  <span className="category-label">
                    {category?.label || item.category}
                  </span>
                  <strong>{item.name}</strong>
                  <span className="facility-address">
                    {item.description ||
                      (item.geometry_type === 'point'
                        ? 'Aset titik'
                        : 'Jalur utilitas')}
                  </span>
                </span>
                <Cable size={17} className="card-arrow" />
              </button>
            );
          })
        ) : (
          <div className="empty-state">
            <Cable />
            <h2>Belum ada infrastruktur</h2>
            <p>Ubah pencarian atau terbitkan data melalui halaman admin.</p>
          </div>
        )}
      </div>
      <footer className="directory-footer">
        <span className="status-dot" /> Data infrastruktur terverifikasi
      </footer>
    </>
  );
}
