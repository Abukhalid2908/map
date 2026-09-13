export type PlotStatus = 'available' | 'reserved' | 'occupied' | 'utility';
export type Plot = {
  id: string;
  plot_number: string;
  status: PlotStatus;
  area_m2: number;
  zonation: string;
  tenant_name: string | null;
  coordinates: [number, number][];
  demo?: boolean;
};
export const plotStatuses = [
  { id: 'all', label: 'Semua', color: '#52665a' },
  { id: 'available', label: 'Tersedia', color: '#279266' },
  { id: 'reserved', label: 'Dipesan', color: '#d59a20' },
  { id: 'occupied', label: 'Terisi', color: '#c65c51' },
  { id: 'utility', label: 'Utilitas', color: '#397fc0' },
] as const;
// Geometry is explicitly illustrative; it is never presented as surveyed land data.
export const demoPlots: Plot[] = [
  {
    id: 'demo-plot-a',
    plot_number: 'Contoh · Blok A-01',
    status: 'available',
    area_m2: 12400,
    zonation: 'Industri',
    tenant_name: null,
    demo: true,
    coordinates: [
      [107.092, -6.294],
      [107.095, -6.294],
      [107.095, -6.297],
      [107.092, -6.297],
      [107.092, -6.294],
    ],
  },
  {
    id: 'demo-plot-b',
    plot_number: 'Contoh · Blok A-02',
    status: 'reserved',
    area_m2: 9800,
    zonation: 'Pergudangan',
    tenant_name: null,
    demo: true,
    coordinates: [
      [107.0952, -6.294],
      [107.098, -6.294],
      [107.098, -6.297],
      [107.0952, -6.297],
      [107.0952, -6.294],
    ],
  },
  {
    id: 'demo-plot-c',
    plot_number: 'Contoh · Blok B-01',
    status: 'occupied',
    area_m2: 15100,
    zonation: 'Industri',
    tenant_name: 'Tenant ilustrasi',
    demo: true,
    coordinates: [
      [107.092, -6.2972],
      [107.0955, -6.2972],
      [107.0955, -6.3005],
      [107.092, -6.3005],
      [107.092, -6.2972],
    ],
  },
  {
    id: 'demo-plot-d',
    plot_number: 'Contoh · Koridor Utilitas',
    status: 'utility',
    area_m2: 5600,
    zonation: 'Fasilitas kawasan',
    tenant_name: null,
    demo: true,
    coordinates: [
      [107.0957, -6.2972],
      [107.098, -6.2972],
      [107.098, -6.3005],
      [107.0957, -6.3005],
      [107.0957, -6.2972],
    ],
  },
];
