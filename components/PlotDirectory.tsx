import { Search, ArrowRight, LandPlot } from 'lucide-react';
import { plotStatuses, type Plot, type PlotStatus } from '@/lib/plots';
export default function PlotDirectory({
  plots,
  query,
  setQuery,
  status,
  setStatus,
  onSelect,
  demo,
}: {
  plots: Plot[];
  query: string;
  setQuery: (v: string) => void;
  status: 'all' | PlotStatus;
  setStatus: (v: 'all' | PlotStatus) => void;
  onSelect: (p: Plot) => void;
  demo: boolean;
}) {
  const total = plots.reduce((n, p) => n + p.area_m2, 0);
  return (
    <>
      <div className="directory-head plot-directory-head">
        <span className="eyebrow">BIDANG KAWASAN</span>
        <h1>Temukan bidang dan statusnya.</h1>
        <p>Telusuri kavling berdasarkan nomor blok, tenant, atau peruntukan.</p>
        <label className="search-box">
          <Search size={19} />
          <input
            aria-label="Cari bidang"
            placeholder="Cari blok, tenant, atau zonasi…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="plot-statuses">
          {plotStatuses.map((item) => (
            <button
              key={item.id}
              className={status === item.id ? 'active' : ''}
              onClick={() => setStatus(item.id)}
            >
              <i style={{ background: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="plot-summary">
          <span>
            <strong>{plots.length}</strong> bidang
          </span>
          <span>
            <strong>
              {(total / 10000).toLocaleString('id-ID', {
                maximumFractionDigits: 2,
              })}
            </strong>{' '}
            ha
          </span>
        </div>
      </div>
      <div className="result-bar">
        <strong>{plots.length} hasil</strong>
        <span>{demo ? 'Data ilustrasi' : 'Data bidang'}</span>
      </div>
      <div className="facility-list plot-list" aria-live="polite">
        {plots.length ? (
          plots.map((plot) => (
            <button
              className="facility-card"
              key={plot.id}
              onClick={() => onSelect(plot)}
            >
              <span className={'plot-swatch status-' + plot.status}>
                <LandPlot size={22} />
              </span>
              <span className="facility-copy">
                <span className="category-label">
                  {plotStatuses.find((s) => s.id === plot.status)?.label}
                </span>
                <strong>{plot.plot_number}</strong>
                <span className="facility-address">
                  {plot.zonation} · {plot.area_m2.toLocaleString('id-ID')} m²
                </span>
                {plot.tenant_name && (
                  <span className="facility-address">{plot.tenant_name}</span>
                )}
              </span>
              <ArrowRight size={17} />
            </button>
          ))
        ) : (
          <div className="empty-state">
            <LandPlot />
            <h2>Belum ada bidang</h2>
            <p>Data polygon bidang kawasan belum tersedia untuk filter ini.</p>
          </div>
        )}
      </div>
      <footer className="directory-footer">
        <span className="status-dot" />
        {demo
          ? 'Bentuk dan data bidang hanya ilustrasi'
          : 'Luas peta bersifat informatif; data resmi mengikuti dokumen survei'}
      </footer>
    </>
  );
}
